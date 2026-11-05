// Opera apenas os tres containers descartaveis nomeados neste arquivo.
const {execFileSync}=require('child_process');
const fs=require('fs');
const assert=require('node:assert/strict');
const base=process.env.QA_BASE_URL;
if(base!=='http://127.0.0.1:3118')throw new Error('URL exclusiva do QA obrigatoria');
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results=[];
let auth;
async function http(path,options={}){return fetch(base+path,{headers:auth,...options,signal:AbortSignal.timeout(5000)})}
async function ready(){for(let i=0;i<25;i++){try{if((await http('/__qa/identity')).ok)return}catch(_){}await pause(300)}throw new Error('QA nao iniciou')}
async function run(name,fn){await fn();results.push({name,passed:true});console.log('PASS:',name)}
(async()=>{
    const identity=await (await http('/__qa/identity')).json();assert.equal(identity.isolated,true);assert.equal(identity.database,'nexomed_qa');
    const login=await (await http('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@qa.invalid',password:'qa-password'})})).json();auth={Authorization:'Bearer '+login.token};
    await run('Redis indisponivel: leitura usa PostgreSQL',async()=>{
        docker('stop','-t','2','nexomed-qa-redis');await pause(500);assert.equal((await http('/api/titulos')).status,200);
        docker('start','nexomed-qa-redis');
    });
    await run('PostgreSQL indisponivel: erro controlado no Hub e Swagger continua acessivel',async()=>{
        docker('stop','-t','2','nexomed-qa-db');await pause(300);
        assert.equal((await http('/api/agenda_licitacoes')).status,500);assert.equal((await http('/docs')).status,200);
        docker('start','nexomed-qa-db');
    });
    await run('PostgreSQL recuperado: Hub e FastAPI retomam consultas',async()=>{
        for(let i=0;i<20;i++){if((await http('/api/agenda_licitacoes')).ok)break;await pause(300)}
        assert.equal((await http('/api/agenda_licitacoes')).status,200);
        assert.equal((await http('/api/vba/agenda_licitacoes',{headers:{'x-api-key':'test-key'}})).status,200);
    });
    await run('Queda da FastAPI encerra supervisor e Node sem deixar Hub parcial',async()=>{
        docker('exec','nexomed-qa-app','/app/.venv/bin/python','-c',"import pathlib,os,signal; pids=[int(p.name) for p in pathlib.Path('/proc').iterdir() if p.name.isdigit() and (p/'cmdline').exists() and b'uvicorn' in (p/'cmdline').read_bytes().split(b'\\0')]; [os.kill(pid,signal.SIGTERM) for pid in pids]");
        for(let i=0;i<25;i++){if(docker('inspect','nexomed-qa-app','--format','{{.State.Running}}')==='false')break;await pause(200)}
        assert.equal(docker('inspect','nexomed-qa-app','--format','{{.State.Running}}'),'false');
        assert.equal(docker('inspect','nexomed-qa-app','--format','{{.State.ExitCode}}'),'1');
        docker('start','nexomed-qa-app');await ready();
    });
    await run('SIGTERM no supervisor: encerramento com codigo zero e reinicio dos dois servicos',async()=>{
        docker('exec','nexomed-qa-app','/app/.venv/bin/python','-c',"import pathlib,os,signal; pids=[int(p.name) for p in pathlib.Path('/proc').iterdir() if p.name.isdigit() and (p/'cmdline').exists() and b'scripts/start_hub.js' in (p/'cmdline').read_bytes().split(b'\\0')]; [os.kill(pid,signal.SIGTERM) for pid in pids]");
        for(let i=0;i<25;i++){if(docker('inspect','nexomed-qa-app','--format','{{.State.Running}}')==='false')break;await pause(200)}
        assert.equal(docker('inspect','nexomed-qa-app','--format','{{.State.Running}}'),'false');
        assert.equal(docker('inspect','nexomed-qa-app','--format','{{.State.ExitCode}}'),'0');
        docker('start','nexomed-qa-app');await ready();assert.equal((await http('/api/titulos')).status,200);assert.equal((await http('/docs')).status,200);
    });
})().catch(error=>{results.push({passed:false,error:error.message});console.error(error.message);process.exitCode=1}).finally(()=>{
    for(const name of ['nexomed-qa-db','nexomed-qa-redis','nexomed-qa-app']){try{docker('start',name)}catch(_){}}
    fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/resilience-results.json',JSON.stringify(results,null,2));
});
