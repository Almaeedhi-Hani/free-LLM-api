'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {
 feedbackKey,effectiveFeedback,isExcluded,containsRejectedKeyword,excludesOpportunity,
 excludesEditorial,excludesFaq,validateFeedback
}=require('../.geo-ingest-test-build/lib/geo-agent-feedback.js');
const a={id:'a',subject_type:'keyword',subject_key:'saudi arabia formation football',
 language:'en',decision:'irrelevant',reason:'Sports, not company formation',
 source:'seed',created_at:'2026-11-19T00:00:00Z'};
let memory=effectiveFeedback([a]);
assert(isExcluded(memory,'keyword',' SAUDI  Arabia Formation Football ','en'));
assert(!isExcluded(memory,'keyword','saudi company formation','en'));
assert(!isExcluded(memory,'keyword','saudi arabia formation football','zh'),
 'language-specific term applies to original language only');
assert(containsRejectedKeyword(memory,['Research: saudi arabia formation football (en)']));
assert(!containsRejectedKeyword(memory,['Football pitches, Saudi investment formation']));
assert(excludesOpportunity(memory,{title:'Target cluster: saudi arabia formation football (en)'}));
assert(excludesEditorial(memory,{title:'Saudi formation football',primary_keyword:'saudi arabia formation football',
  evidence_refs:[]}));
assert(excludesFaq(memory,'What does saudi arabia formation football mean?'));
assert(!excludesFaq(memory,'How to establish a foreign-invested company in Saudi Arabia?'));
const b={...a,id:'b',decision:'valid',reason:'Human reviewer restored this term',
 created_at:'2026-11-19T02:00:00Z'};
memory=effectiveFeedback([a,b]);
assert(!isExcluded(memory,'keyword',a.subject_key,'en'),
 'latest correction must supersede exclusion without deleting old audit');
assert(!containsRejectedKeyword(memory,['saudi arabia formation football']));
const undo={...a,id:'undo',decision:'valid',source:'admin',reason:'[operator-undo] b',created_at:'2026-11-19T02:01:00Z'};
assert.equal(effectiveFeedback([a,b,undo]).size,0,'undo must not resurrect an older correction');
assert(!isExcluded(effectiveFeedback([a,b,undo]),'keyword',a.subject_key,'en'));
const redone={...a,id:'redo',created_at:'2026-11-19T02:02:00Z'};
assert(isExcluded(effectiveFeedback([a,b,undo,redone]),'keyword',a.subject_key,'en'));
assert.throws(()=>validateFeedback({...a,decision:'valid',reason:'[operator-undo] forged'}));

const source={id:'c',subject_type:'competitor',subject_key:'example.com',language:null,
 decision:'irrelevant',reason:'Not a relevant investor service competitor',
 source:'admin',created_at:'2026-11-19T03:00:00Z'};
const published={id:'d',subject_type:'publication',
 subject_key:'/insights/test-article',language:null,decision:'inaccurate',
 reason:'The page is outside intended service scope',source:'admin',
 created_at:'2026-11-19T04:00:00Z'};
memory=effectiveFeedback([source,published]);
assert(isExcluded(memory,'competitor','https://www.example.com/page'));
assert(excludesEditorial(memory,{title:'Example',slug:'test-article',
 evidence_refs:[]},'/insights/test-article'),'a page correction blocks future publishing');
assert(excludesEditorial(memory,{title:'Unrelated page',slug:'good-article',evidence_refs:[
 {url:'https://www.example.com/help',kind:'competitor_candidate'}
]},'/insights/good-article'),'a disqualified competitor evidence source excludes an editorial candidate');
assert(!excludesEditorial(memory,{title:'Well-scoped guide',slug:'safe-article',
 evidence_refs:[]},'/insights/safe-article'));
const langPage={id:'lang-page',subject_type:'publication',subject_key:'/insights/lang-scoped',
 language:'ar',decision:'irrelevant',reason:'Incorrect for Arabic investor audience',
 source:'admin',created_at:'2026-11-19T05:00:00Z'};
const faqAr={id:'lang-faq',subject_type:'faq',subject_key:'ما هي رسوم تأسيس شركة أجنبية؟',
 language:'ar',decision:'inaccurate',reason:'Outdated published fee statement',
 source:'admin',created_at:'2026-11-19T05:01:00Z'};
memory=effectiveFeedback([langPage,faqAr]);
assert(excludesEditorial(memory,{lang:'ar',slug:'lang-scoped'},'/insights/lang-scoped'));
assert(!excludesEditorial(memory,{lang:'en',slug:'lang-scoped'},'/insights/lang-scoped'),
 'language-scoped correction should not hide an unrelated translation');
assert(excludesFaq(memory,'ما هي رسوم تأسيس شركة أجنبية؟'));
const clean=validateFeedback({
 subject_type:'keyword',subject_key:'   Saudi Arabia  formation FOOTBALL  ',
 language:'en',decision:'irrelevant',reason:'  irrelevant sports term  '
});
assert.equal(clean.subject_key,'saudi arabia formation football');
assert.equal(clean.reason,'irrelevant sports term');
for(const bad of [
 {subject_type:'keyword',subject_key:'x',decision:'irrelevant',reason:'valid reason'},
 {subject_type:'keyword',subject_key:'good keyword',decision:'maybe',reason:'valid reason'},
 {subject_type:'keyword',subject_key:'good keyword',decision:'irrelevant',reason:'bad'},
 {subject_type:'hacker',subject_key:'good keyword',decision:'valid',reason:'valid reason'}
])assert.throws(()=>validateFeedback(bad));
const sql=fs.readFileSync('supabase/migrations/20261119_geo_agent_feedback_memory.sql','utf8');
assert(sql.includes('enable row level security')&&sql.includes('revoke all')&&
 sql.includes('service_role')&&sql.includes('saudi arabia formation football'));
assert(!/delete\s+from\s+(?:public\.)?(?:keywords|geo_publication_events|opportunities)/i.test(sql));
const paths={
 discovery:fs.readFileSync('src/app/api/geo/discovery/route.ts','utf8'),
 results:fs.readFileSync('src/app/api/geo/results/route.ts','utf8'),
 publisher:['runner','policy-store','citations','official-evidence','types'].map(name=>fs.readFileSync('src/lib/geo/publication/'+name+'.ts','utf8')).join('\n'),
 market:['src/lib/market/analysis.ts','src/lib/market/discovery.ts'].map(p=>fs.readFileSync(p,'utf8')).join('\n'),
 admin:fs.readFileSync('src/app/api/admin/geo-feedback/route.ts','utf8'),
 ui:require('./support/admin-dashboard-source.cjs').readAdminDashboardSource()
};
assert(paths.discovery.includes('reviewer_excluded:excluded')&&paths.discovery.includes('getGeoFeedbackIndex()'));
assert(paths.results.includes('reviewer_excluded:excluded')&&paths.results.includes('excludesFaq(memory,d.q)'));
assert(paths.publisher.includes('excludesEditorial(feedback,candidate,path)')&&paths.publisher.includes('excludesFaq(feedback,draft.q)'));
assert(paths.market.includes('isExcluded(feedback,\'keyword\',term,lang)')&&
 paths.market.includes('excludesOpportunity(feedback,o)'));
assert(paths.admin.includes('timingSafeEqual')&&paths.admin.includes('appendGeoFeedback'));
assert(paths.ui.includes('GeoFeedbackMemory')&&paths.ui.includes('تعليم الوكيل'));
console.log('PASS feedback memory: exact match, undo, domain block, opportunity triage, publication gates, audit RLS and UI wiring');

const titleMemory=effectiveFeedback([{...a,subject_type:'editorial',subject_key:'title:deleted example',language:'en'}]);
assert(excludesEditorial(titleMemory,{id:'new-id',title:'Deleted Example',lang:'en'},'/en/services/company-formation'));
assert(!excludesEditorial(titleMemory,{id:'another',title:'Different example',lang:'en'},'/en/services/company-formation'));
assert(!excludesEditorial(titleMemory,{id:'new-id',title:'Deleted Example',lang:'ar'},'/services/company-formation'));

(async()=>{
 const {rememberGeoDeletion}=require('../.geo-ingest-test-build/lib/geo-agent-feedback.js');
 const orig=global.fetch, oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const snapshot={title:'Deleted fixture',body:'Exact fixture text'};
 const records=[],events=[];
 process.env.SUPABASE_URL='https://fixture.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-not-secret';
 try{
  global.fetch=async(url,init={})=>{
   const body=init.body?JSON.parse(init.body):null;
   if(String(url).includes('/audit_logs?')){
    events.push('snapshot');assert.deepEqual(body.metadata.snapshot,snapshot);
    return new Response(JSON.stringify([{id:'fixture-audit'}]),{status:201});
   }
   if(String(url).includes('/geo_agent_feedback')){
    if(init.method==='POST'){events.push('feedback');const row={...body,id:'feedback-'+records.length,created_at:new Date().toISOString()};records.push(row);return new Response(JSON.stringify([row]),{status:201});}
    events.push('readback');return new Response(JSON.stringify(String(url).includes('offset=0')?records:[]),{status:200});
   }
   throw Error('Unexpected mocked request');
  };
  const id=await rememberGeoDeletion('editorial','fixture-id','en',snapshot,[{subject_type:'editorial',subject_key:'title:Deleted fixture'}]);
  assert.equal(id,'fixture-audit');
  assert.equal(events[0],'snapshot');assert(events.indexOf('feedback')>events.indexOf('snapshot'));assert.equal(events.at(-1),'readback');
  assert(excludesEditorial(effectiveFeedback(records),{id:'new-id',title:'Deleted fixture',lang:'en'},'/en/packages'));
  global.fetch=async()=>new Response('{}',{status:503});
  await assert.rejects(()=>rememberGeoDeletion('editorial','fixture-id','en',snapshot,[]),/snapshot was not saved/);
 }finally{
  global.fetch=orig;
  if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;
  if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;
 }
 console.log('PASS deletion snapshot, exclusion write and confirmation before removal; unavailable audit fails closed (mocked)');
})().catch(e=>{console.error(e);process.exitCode=1});
