'use strict';
const assert = require('node:assert/strict');
const {generateKeyPairSync, createVerify} = require('node:crypto');
const {mkdtempSync,writeFileSync,rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {getGscServiceAccountToken} = require('../.visibility-test-build/gsc-service-account.js');
(async()=>{
 const dir=mkdtempSync(join(tmpdir(),'gsc-auth-test-'));
 const path=join(dir,'service.json');
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const credential={type:'service_account',client_email:'test@demo.iam.gserviceaccount.com',
  private_key:privateKey.export({type:'pkcs8',format:'pem'}),
  token_uri:'https://oauth2.googleapis.com/token'};
 try {
  writeFileSync(path,JSON.stringify(credential),{mode:0o600});
  let called=0;
  const access=await getGscServiceAccountToken(path,async (url,init)=>{
   called++;
   assert.equal(url,'https://oauth2.googleapis.com/token');
   assert.equal(init.method,'POST');
   assert.equal(init.cache,'no-store');
   const body=new URLSearchParams(init.body);
   assert.equal(body.get('grant_type'),'urn:ietf:params:oauth:grant-type:jwt-bearer');
   const parts=body.get('assertion').split('.');
   assert.equal(parts.length,3);
   const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString());
   assert.equal(payload.scope,'https://www.googleapis.com/auth/webmasters.readonly');
   assert.equal(payload.iss,credential.client_email);
   assert.equal(payload.aud,'https://oauth2.googleapis.com/token');
   assert.equal(payload.exp-payload.iat,3600);
   const verify=createVerify('RSA-SHA256');
   verify.update(parts[0]+'.'+parts[1]);verify.end();
   assert.equal(verify.verify(publicKey,Buffer.from(parts[2],'base64url')),true);
   return new Response(JSON.stringify({access_token:'mock-token'}),{status:200});
  },1700000000);
  assert.equal(access,'mock-token');assert.equal(called,1);
  writeFileSync(path,JSON.stringify({...credential,token_uri:'https://bad.example/token'}));
  await assert.rejects(()=>getGscServiceAccountToken(path,()=>{throw Error('network must not run')}),/gsc_service_account_invalid/);
  writeFileSync(path,JSON.stringify(credential));
  await assert.rejects(()=>getGscServiceAccountToken(path,async()=>new Response('invalid grant',{status:400})),/gsc_service_account_token_400/);
  const {readFileSync}=require('node:fs');
  const route=readFileSync('src/app/api/cron-gsc/route.ts','utf8');
  assert(route.includes("process.env.GSC_AUTH_MODE === 'service_account'"));
  assert(route.includes('getGscServiceAccountToken(process.env.GOOGLE_APPLICATION_CREDENTIALS!)'));
  assert(route.includes("authorization: 'Bearer ' + accessToken"));
  assert(!route.includes("token.access_token, 'content-type'"));
  console.log('PASS GSC service account signed JWT, read-only scope, opt-in, secret-safe failure; no Google/Supabase calls');
 } finally {rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
