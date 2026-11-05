module.exports=async()=>{
    const response=await fetch(process.env.QA_BASE_URL+'/__qa/identity',{signal:AbortSignal.timeout(5000)});
    const identity=await response.json();
    if(!response.ok||identity.isolated!==true||identity.database!=='nexomed_qa'||identity.externalWrites!==false)
        throw new Error('Testes de escrita bloqueados: o servidor nao comprovou ser o ambiente isolado de QA.');
};
