const {expect}=require('@playwright/test');
async function login(request,name='admin',password='qa-password') {
    const response=await request.post('/api/auth/login',{data:{email:name+'@qa.invalid',password}});
    expect(response.status(),await response.text()).toBe(200);
    return response.json();
}
const headers=account=>({Authorization:'Bearer '+account.token});
async function session(page,request,name='admin') {
    const account=await login(request,name);
    await page.addInitScript(account=>{
        if(sessionStorage.getItem('__qa_seeded'))return;
        localStorage.setItem('token',account.token);localStorage.setItem('user',JSON.stringify(account.user));sessionStorage.setItem('__qa_seeded','1');
    },account);
    return account;
}
module.exports={login,headers,session};
