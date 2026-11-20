'use strict';
/**
 * V3 Phase 2.4: strictly read-only, evidence-backed public competitor-link
 * and offline regression-Evals alert. Never changes visitor content,
 * runs paid APIs, mutates Supabase or infers a ranking.
 */
const {auditPublicSitemap}=require('./public-sitemap-audit.cjs');
const CANONICAL='https://free-llm-api-1-didl.onrender.com';
const FALLBACK=Object.freeze(['arablawfirm.org','law.shangiti.com','investmentaxis.com.sa','jewark.com']);
const SERVICE_SLUGS=Object.freeze(['misa-license','company-formation','corporate-banking','contract-drafting','premium-residency','investment-funds']);
const PUBLIC_PATHS=Object.freeze(['','/packages',...SERVICE_SLUGS.map(s=>'/services/'+s)]
 .flatMap(path=>['ar','en','zh'].map(lang=>(lang==='ar'?'':'/'+lang)+path||'/')));
const ISSUE_TITLE='[V3 quality] public competitor links or regression-eval failure';
const SAFE_PAGE_LIMIT=150;
function domain(raw) {
 if(typeof raw!=='string'||raw.length>253||!raw.trim())return null;
 try{
  const value=new URL(raw.includes('://')?raw:'https://'+raw);
  if(value.protocol!=='https:'||value.username||value.password||value.port)return null;
  const host=value.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
  return /^[a-z0-9.-]+$/.test(host)&&host.includes('.')&&!host.includes('..')?host:null;
 }catch{return null;}
}
function competitorUrl(raw,domains) {
 let url;
 try{url=new URL(String(raw||''));}
 catch{return false;}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return false;
 const host=url.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
 return domains.some(x=>host===x||host.endsWith('.'+x));
}
function pageLinks(html) {
 // Visible body and actual anchors, not serialized React props containing
 // internal research metadata (which may legitimately mention competitors).
 const visible=String(html||'')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ');
 const urls=new Set();
 for(const match of visible.matchAll(/\b(?:href|src)\s*=\s*(['"])(https?:\/\/[^'"<>\s]{1,900})\1/gi))
   urls.add(match[2].replace(/&amp;/gi,'&'));
 for(const match of visible.matchAll(/https?:\/\/[^\s"'<>\\]{3,850}/gi))
   urls.add(match[0].replace(/[.,;!?]+$/,''));
 // Only a literal public cited_sources array in JSON-like page data, not any
 // generic raw internal evidence_refs/source_urls from React hydration.
 for(const block of String(html||'').matchAll(/["']cited_sources["']\s*:\s*(\[[^\]]{0,3500}\])/g)){
  for(const u of block[1].matchAll(/https?:\/\/[^"'<>,\s\\]{3,850}/g))urls.add(u[0]);
 }
 return [...urls];
}
function inspectHtml(html,domains) {
 const hits=pageLinks(html).filter(url=>competitorUrl(url,domains));
 return [...new Set(hits)].slice(0,12);
}
async function request(fetchImpl,url,options={}) {
 const r=await fetchImpl(url,{...options,redirect:'manual',signal:AbortSignal.timeout(13000)});
 if(!r||!r.ok||r.status!==200)throw Error('http_readback_failed');
 const body=await r.text();
 if(typeof body!=='string'||body.length>1_200_000)throw Error('invalid_or_oversized_response');
 return body;
}
async function competitorRegistry(fetchImpl,env) {
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SERVICE_ROLE_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key) {
   return {complete:false,reason:'database_credentials_unavailable',domains:[...FALLBACK]};
 }
 try{
  const endpoint=url+'/rest/v1/competitors?select=domain,status&limit=300';
  const r=await fetchImpl(endpoint,{headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json'},
    redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(!r||!r.ok||r.status!==200)throw Error('registry_http_unavailable');
  const rows=await r.json();
  if(!Array.isArray(rows)||rows.length>=300)throw Error('registry_unbounded');
  return {complete:true,reason:'current_competitor_registry',
    domains:[...new Set([...FALLBACK,...rows.filter(x=>x&&x.status!=='disqualified')
       .map(x=>domain(x.domain)).filter(Boolean)])]};
 }catch{return {complete:false,reason:'database_readback_failed',domains:[...FALLBACK]};}
}
async function publicAudit(fetchImpl,env) {
 const base=CANONICAL;
 const registry=await competitorRegistry(fetchImpl,env);
 const sitemap=await request(fetchImpl,base+'/sitemap.xml');
 const result=auditPublicSitemap(sitemap,base,PUBLIC_PATHS);
 if(result.total>SAFE_PAGE_LIMIT)throw Error('unexpected_sitemap_size');
 const paths=[...PUBLIC_PATHS,...result.extra.map(x=>x.path)];
 const violations=[],unavailable=[];
 // Fixed bounded parallelism: requests only to verified own-origin public routes.
 for(let i=0;i<paths.length;i+=4){
  await Promise.all(paths.slice(i,i+4).map(async path=>{
    try{
      const parsed=new URL(path,base);
      if(parsed.origin!==base||!paths.includes(parsed.pathname))throw Error('untrusted_sitemap');
      const html=await request(fetchImpl,parsed.href);
      const urls=inspectHtml(html,registry.domains);
      if(urls.length)violations.push({path,competitor_hosts:[...new Set(urls.map(u=>new URL(u).hostname))].slice(0,8)});
    }catch{unavailable.push(path);}
  }));
 }
 return {total_pages:paths.length,verified_pages:paths.length-unavailable.length,
   competitor_registry:registry.complete?'complete':'partial',
   registry_reason:registry.reason,violations:violations.sort((a,b)=>a.path.localeCompare(b.path)),
   unavailable:unavailable.sort(),complete:registry.complete&&unavailable.length===0};
}
function summary(audit,evalOutcome) {
 const lines=['## V3 Stage-2 quality audit (public HTML and offline Evals)',
   'Checked UTC: '+new Date().toISOString(),
   'Public pages verified: '+audit.verified_pages+'/'+audit.total_pages,
   'Competitor registry: '+audit.competitor_registry+' ('+audit.registry_reason+')',
   'Offline Evals: '+evalOutcome,
   'Detected competitor-link pages: '+audit.violations.length,
   ...audit.violations.map(x=>'- '+x.path+' competitor hosts: '+x.competitor_hosts.join(', ')),
   'Unverified paths: '+(audit.unavailable.join(', ')||'none'),
   'No site content, provider quota, publishing risk policy, or database values were changed.',
   'No false claims of organic ranking, AI citations, indexing, or traffic.',
 ];return lines.join('\n').slice(0,12500);
}
async function issueRequest(fetchImpl,env,path,method='GET',payload) {
 const repo=String(env.GITHUB_REPOSITORY||'');
 if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!env.GH_TOKEN)throw Error('github_credentials_unavailable');
 const r=await fetchImpl('https://api.github.com/repos/'+repo+path,{
  method,headers:{Authorization:'Bearer '+env.GH_TOKEN,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',...(payload?{'Content-Type':'application/json'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{})});
 if(!r||!r.ok)throw Error('github_issue_http_'+(r?.status||'unknown'));
 return r.status===204?{}:r.json();
}
async function reconcileIssue(fetchImpl,env,audit,evalOutcome) {
 // Failure/partial evidence cannot silently resolve a real incident.
 const problem=evalOutcome==='failure'||audit.violations.length>0;
 const incomplete=!audit.complete||evalOutcome==='unknown';
 const body=summary(audit,evalOutcome);
 let open=null;
 for(let page=1;page<=5;page++){
  const issues=await issueRequest(fetchImpl,env,'/issues?state=open&per_page=100&page='+page);
  if(!Array.isArray(issues))throw Error('invalid_issue_list');
  open=issues.find(x=>!x.pull_request&&x.title===ISSUE_TITLE)||null;
  if(open||issues.length<100)break;
 }
 if(problem){
  if(open) {await issueRequest(fetchImpl,env,'/issues/'+open.number,'PATCH',{body});
    return {result:'updated',issue_number:open.number,incident:true};}
  // Existing repository failure label; do not mutate labels globally.
  const created=await issueRequest(fetchImpl,env,'/issues','POST',{title:ISSUE_TITLE,body,labels:['failure']});
  return {result:'created',issue_number:created.number,incident:true};
 }
 if(incomplete)return {result:'not_resolved_on_partial_evidence',incident:!!open,complete:false};
 if(open){
  await issueRequest(fetchImpl,env,'/issues/'+open.number,'PATCH',{body:body+'\n\nResolved after complete clean public audit and green offline Evals.',state:'closed'});
  return {result:'resolved',issue_number:open.number,incident:false};}
 return {result:'no_issue_needed',incident:false};
}
async function run({fetchImpl=fetch,env=process.env,evalOutcome='unknown',dryRun=false}={}){
 let audit;
 try{audit=await publicAudit(fetchImpl,env);}
 catch(error){audit={total_pages:0,verified_pages:0,competitor_registry:'partial',
   registry_reason:'public_audit_unavailable',violations:[],unavailable:['public_sitemap_or_route_unavailable'],complete:false};}
 const result=dryRun?{result:'dry_run',incident:false}:await reconcileIssue(fetchImpl,env,audit,evalOutcome);
 return {...result,audit};
}
if(require.main===module){
 (async()=>{
  const mode=process.argv.includes('--dry-run')?'dry-run':'reconcile';
  const evalOutcome=['success','failure'].includes(process.env.V3_EVAL_OUTCOME)?process.env.V3_EVAL_OUTCOME:'unknown';
  const output=await run({evalOutcome,dryRun:mode==='dry-run'});
  console.log('[V3_QUALITY] '+JSON.stringify({action:output.result,verified:output.audit.verified_pages,
   expected:output.audit.total_pages,registry:output.audit.competitor_registry,
   violations:output.audit.violations,unavailable:output.audit.unavailable}));
  if(output.result==='not_resolved_on_partial_evidence')process.exitCode=2;
 })().catch(err=>{console.error('[V3_QUALITY] '+String(err.message).slice(0,120));process.exitCode=1;});
}
module.exports={CANONICAL,PUBLIC_PATHS,ISSUE_TITLE,domain,competitorUrl,pageLinks,inspectHtml,
  competitorRegistry,publicAudit,reconcileIssue,run};
