// Homologacao: PostgreSQL/Redis reais isolados; fronteiras externas controladas.
const path = require('path');
const fs = require('fs');
const Module = require('module');
if (process.env.QA_ISOLATED !== '1' || process.env.PG_DATABASE !== 'nexomed_qa' || process.env.PG_HOST !== 'nexomed-qa-db') throw new Error('Ambiente QA isolado obrigatorio');
const root = process.cwd();
const sql = require('mssql');
const erp = { request() { const params={}; return { input(name,...args) { params[name]=args.at(-1); return this; }, async query(query) {
    if (!/^\s*(SELECT|WITH)\b/i.test(query)) throw new Error('Escrita ERP bloqueada na homologacao');
    if (/bi_cadastro_clientes/i.test(query)) return {recordset:[{codigo:123,razaoSocial:'Hospital QA',nomeFantasia:'Hospital QA',cidade:'Sao Paulo',uf:'SP',cnpj:'00000000000100',email:'hospital@qa.invalid'}]};
    return {recordset:[]};
} }; } };
const original=Module._load;
Module._load=function(request,parent){
    if(request==='express') {
        const express=original.apply(this,arguments);
        const factory=(...args)=>{
            const app=express(...args);
            app.get('/__qa/identity',(_req,res)=>res.json({isolated:true,database:'nexomed_qa',externalWrites:false}));
            return app;
        };
        return Object.assign(factory,express);
    }
    if(request==='node-cron') return {schedule(){return {stop(){},destroy(){}}}};
    let resolved; try{resolved=Module._resolveFilename(request,parent)}catch(_){}
    if(resolved===path.join(root,'app/db/connection.js')) return {sql,getPool:async()=>erp,getPoolSGC2:async()=>erp};
    return original.apply(this,arguments);
};
const mailer=require('nodemailer');
const create=mailer.createTransport;
mailer.createTransport=()=>{
    const transport=create({streamTransport:true,buffer:true,newline:'unix'});
    const send=transport.sendMail.bind(transport);
    transport.sendMail=async options=>{
        const result=await send(options);
        fs.appendFileSync('/tmp/qa-outbox.jsonl',JSON.stringify({to:options.to,subject:options.subject,html:options.html,message:result.message.toString()})+'\n');
        return result;
    };
    return transport;
};
