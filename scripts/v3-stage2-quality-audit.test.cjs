'use strict';
const assert=require('node:assert/strict');
const {CANONICAL,PUBLIC_PATHS,ISSUE_TITLE,domain,competitorUrl,pageLinks,inspectHtml,publicAudit,reconcileIssue,run}=require('./v3-stage2-quality-audit.cjs');
assert.equal(PUBLIC_PATHS.length,24,'three locales x eight current public routes');
assert.equal(domain('https://WWW.jewark.com/competitors'),'jewark.com');
assert.equal(domain('https://jewark.com.evil.test'),'jewark.com.evil.test');
assert.equal(domain('https://user:pass@jewark.com/'),null);
assert.equal(competitorUrl('https://jewark.com/resources',['jewark.com']),true);
assert.equal(competitorUrl('https://files.jewark.com/s',['jewark.com']),true);
assert.equal(competitorUrl('https://jewark.com.evil.test/',['jewark.com']),false);
assert.equal(competitorUrl('https://misa.gov.sa/services',['jewark.com']),false);
assert.equal(competitorUrl('javascript:alert(1)',['jewark.com']),false);
assert.equal(inspectHtml('<a href="https://jewark.com/p">link</a>',['jewark.com']).length,1);
assert.equal(inspectHtml('<script>window.__DATA__={evidence_refs:["https://jewark.com/internal"]}</script><main>Public</main>',['jewark.com']).length,0,'internal evidence must not be falsely reported as visible');
assert.equal(inspectHtml('<script>const item={"cited_sources":["https://jewark.com/a"]}</script>',['jewark.com']).length,1,'explicit public cited_sources must be inspected');
assert.equal(pageLinks('<p>Research URL https://arablawfirm.org/report</p>').length,1);
const urls=PUBLIC_PATHS.map(p=>new URL(p,CANONICAL).href);
const sitemap='<urlset>'+urls.map(u=>'<url><loc>'+u+'</loc></url>').join('')+'</urlset>';
const state={incident:[],issue:null,eval:'failure',missingDb:false,brokenHtml:false};
const response=(data,status=200,isText=false)=>({ok:status>=200&&status<300,status,
  json:async()=>data,text:async()=>isText?data:JSON.stringify(data)});
const visited=[];
async function fetchMock(url,options={}){
 const target=String(url),method=options.method||'GET';visited.push({target,method});
 if(target===CANONICAL+'/sitemap.xml')return response(sitemap,200,true);
 if(target.startsWith(CANONICAL+'/')){
   const path=new URL(target).pathname;
   if(!PUBLIC_PATHS.includes(path))throw Error('unallowlisted path '+path);
   if(state.brokenHtml&&path==='/en/')return response('unavailable',503,true);
   return response(path==='/en/packages'&&state.incident.length===0
     ?'<main><a href="https://jewark.com/pricing">Competitor link</a></main>'
     :'<main><a href="https://misa.gov.sa">Official link</a></main>',200,true);
 }
 if(target.startsWith('https://mock-project.supabase.co/rest/v1/competitors?')){
  if(state.missingDb)return response({},503);
  return response([{domain:'custom-competitor.test',status:'active'},{domain:'deactivated.invalid',status:'disqualified'}]);
 }
 if(target.startsWith('https://api.github.com/repos/o/r')){
  const p=new URL(target).pathname;
  const body=options.body?JSON.parse(options.body):null;
  if(p.endsWith('/issues')&&method==='GET')return response(state.issue?[state.issue]:[]);
  if(p.endsWith('/issues')&&method==='POST'){
   state.issue={number:21,title:body.title,body:body.body};state.incident.push('created');
   return response(state.issue,201);
  }
  if(p.endsWith('/issues/21')&&method==='PATCH'){
   state.incident.push(body.state==='closed'?'resolved':'updated');
   if(body.state==='closed')state.issue=null;
   else state.issue={...state.issue,body:body.body};
   return response({number:21,...body});
  }
  throw Error('unmocked GitHub API '+p+' '+method);
 }
 throw Error('Unexpected network request '+target);
}
const env={SUPABASE_URL:'https://mock-project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'local-test-key',
  GH_TOKEN:'local-github-key',GITHUB_REPOSITORY:'o/r'};
(async()=>{
 const first=await publicAudit(fetchMock,env);
 assert.equal(first.total_pages,24);
 assert.equal(first.verified_pages,24);
 assert.equal(first.complete,true);
 assert.equal(first.competitor_registry,'complete');
 assert.equal(first.violations.length,1);
 assert.equal(first.violations[0].path,'/en/packages');
 assert.deepEqual(first.violations[0].competitor_hosts,['jewark.com']);
 const raised=await reconcileIssue(fetchMock,env,first,'success');
 assert.equal(raised.result,'created');
 assert.equal(raised.issue_number,21);
 assert.equal(state.issue.title,ISSUE_TITLE);
 const twice=await reconcileIssue(fetchMock,env,first,'success');
 assert.equal(twice.result,'updated');
 assert.equal(state.incident.length,2);
 const recovered=await publicAudit(fetchMock,env);
 assert.deepEqual(recovered.violations,[]);
 assert.equal((await reconcileIssue(fetchMock,env,recovered,'failure')).result,'updated','offline Evals failure is independent quality alarm');
 state.brokenHtml=true;
 const partial=await publicAudit(fetchMock,env);
 assert.equal(partial.complete,false);
 assert.deepEqual(partial.unavailable,['/en/']);
 assert.equal((await reconcileIssue(fetchMock,env,partial,'success')).result,'not_resolved_on_partial_evidence','do not close incident on a partial read');
 state.brokenHtml=false;state.missingDb=true;
 const noDb=await publicAudit(fetchMock,env);
 assert.equal(noDb.complete,false);
 assert.equal(noDb.competitor_registry,'partial');
 assert.equal((await reconcileIssue(fetchMock,env,noDb,'success')).result,'not_resolved_on_partial_evidence');
 state.missingDb=false;
 assert.equal((await reconcileIssue(fetchMock,env,recovered,'success')).result,'resolved');
 assert.equal(state.issue,null);
 assert.equal((await reconcileIssue(fetchMock,env,recovered,'success')).result,'no_issue_needed');
 const dry=await run({fetchImpl:fetchMock,env,evalOutcome:'unknown',dryRun:true});
 assert.equal(dry.result,'dry_run');
 assert(visited.every(x=>x.method==='GET'||x.target.startsWith('https://api.github.com/repos/o/r')));
 assert(!JSON.stringify(dry).includes(env.GH_TOKEN));
 assert(!JSON.stringify(dry).includes(env.SUPABASE_SERVICE_ROLE_KEY));
 assert.equal(state.incident.filter(x=>x==='created').length,1,'stable title must deduplicate alerts');
 console.log('PASS stage2 quality: 24 published pages, registry + fallback, public-only links, cited_sources, Evals, dedup and unknown-safe recovery');
})().catch(err=>{console.error(err);process.exitCode=1;});
