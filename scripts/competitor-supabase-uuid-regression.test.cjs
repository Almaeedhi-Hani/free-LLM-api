'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
process.env.NODE_ENV='test';
const seen=[];let competitor=null;
global.fetch=async(url,opts={})=>{
 const u=new URL(url);seen.push({method:opts.method||'GET',path:u.pathname,search:u.search});
 if(u.searchParams.has('id') && !/^[0-9a-f]{8}-/.test(u.searchParams.get('id')||'')){
  return{ok:false,status:400,text:async()=>JSON.stringify({code:'22P02',message:'invalid uuid'})};
 }
 if(opts.method==='POST'&&u.pathname.endsWith('/competitors')){
  competitor={id:'123e4567-e89b-42d3-a456-426614174000',...JSON.parse(opts.body)};
  return{ok:true,status:201,json:async()=>[competitor],text:async()=>JSON.stringify([competitor])};
 }
 if(u.pathname.endsWith('/competitors')){
  const domain=u.searchParams.get('domain')?.replace(/^eq\./,'');
  const id=u.searchParams.get('id')?.replace(/^eq\./,'');
  const results=competitor&&(domain===competitor.domain||id===competitor.id)?[competitor]:[];
  return{ok:true,status:200,json:async()=>results,text:async()=>JSON.stringify(results)};
 }
 throw Error('unhandled fetch '+u.pathname);
};
(async()=>{
 const mi=require(path.join(process.cwd(),'.market-test-build/market-intelligence.js'));
 const created=await mi.upsertCompetitor({name:'Real sourced candidate',domain:'arabianhorizon.com.sa',languages:['en'],source:'search'});
 assert.equal(created.domain,'arabianhorizon.com.sa');
 assert.ok(seen.every(x=>!x.search.includes('id=eq.arabianhorizon')));
 console.log('PASS competitor insert through Supabase adapter without passing domain to UUID field');
 const found=await mi.getCompetitor('arabianhorizon.com.sa');assert.equal(found.id,created.id);
 const byId=await mi.getCompetitor(created.id);assert.equal(byId.domain,created.domain);
 assert.equal(seen.filter(x=>x.method==='POST').length,1);
 console.log('PASS read by both hostname and UUID, no duplicate writes');
})().catch(e=>{console.error(e);process.exitCode=1});
