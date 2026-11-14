'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const p = require('./geo-schedule-policy.cjs');
const at = '2026-11-15T00:15:00.000Z'; // Sunday 03:15 in Saudi Arabia
function item(url='https://example.com/one', title='New service') {
 return {url,query:'Saudi investment license',language:'en',title,snippet:'Verified text',page_type:'service'};
}
test('collection cron aligns with KSA 03:15 every 2h',()=> {
  assert.equal(p.CRON.collection,'15 */2 * * *');
  assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:p.TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at)),'03:15');
});
test('daily analysis at 08:00 and publication at 10:00 KSA',()=> {
  assert.equal(p.CRON.analysis,'0 5 * * *');
  assert.equal(p.CRON.publish,'0 7 * * *');
  assert.equal(p.saudiDay('2026-11-14T22:59:59Z'),'11/15/2026'.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$1-$2'));
});
test('new items accepted, duplicate observations removed',()=> {
  const r=p.planCollection({incoming:[item(),item()],requestCount:2});
  assert.equal(r.accepted,1);assert.equal(r.skipped,1);
});
test('identical prior evidence does not trigger collection changes',()=> {
  const i=item();const prior={[p.stableKey(i)]:p.fingerprint(i)};
  assert.equal(p.planCollection({incoming:[i],prior,requestCount:1}).accepted,0);
});
test('changed page content recognized once',()=> {
  const i=item();const prior={[p.stableKey(i)]:p.fingerprint(i)};
  const r=p.planCollection({incoming:[item(undefined,'Updated')],prior,requestCount:1});
  assert.equal(r.changedItems.length,1);assert.equal(r.newItems.length,0);
});
test('invalid records and excessive requests safely rejected',()=> {
  assert.equal(p.planCollection({incoming:[{title:'bogus'}],requestCount:1}).accepted,0);
  assert.equal(p.planCollection({incoming:[item()],requestCount:4}).status,'blocked');
});
test('incoming collection is bounded to 30 observations',()=>{
  const many=Array.from({length:40},(_,i)=>item('https://example.com/'+i));
  const r=p.planCollection({incoming:many,requestCount:1});
  assert.equal(r.accepted,30);assert.equal(r.truncated,10);
});
test('analysis requires evidence changes and respects daily attempt limit',()=> {
  assert.equal(p.shouldAnalyze({now:at,evidenceChanges:0}).run,false);
  assert.equal(p.shouldAnalyze({now:at,evidenceChanges:1,providerAvailable:false}).run,false);
  assert.equal(p.shouldAnalyze({now:at,evidenceChanges:1,lastAttemptAt:'2026-11-14T23:30:00Z'}).reason,'daily_limit_reached');
  assert.equal(p.shouldAnalyze({now:at,evidenceChanges:1}).run,true);
});
test('publishing is blocked without explicit approval, passed tests or evidence',()=> {
  const draft={status:'approved',risk_level:'low'};
  assert.equal(p.publicationDecision({now:at,draft}).publish,false);
  assert.equal(p.publicationDecision({now:at,draft,reviewApproved:true,testsPassed:false,sourcesVerified:true,atomicDailySlotClaimed:true}).publish,false);
  assert.equal(p.publicationDecision({now:at,draft,reviewApproved:true,testsPassed:true,sourcesVerified:true,atomicDailySlotClaimed:false}).publish,false);
});
test('high and medium risk content never auto publishes',()=>{
  for(const risk_level of ['medium','high']) {
    const r=p.publicationDecision({now:at,draft:{status:'approved',risk_level},reviewApproved:true,testsPassed:true,sourcesVerified:true,atomicDailySlotClaimed:true});
    assert.equal(r.publish,false);
  }
});
test('approved low-risk publication requires atomic daily slot and 1 per day',()=>{
  const d={status:'approved',risk_level:'low'};
  const x={now:at,draft:d,reviewApproved:true,testsPassed:true,sourcesVerified:true,atomicDailySlotClaimed:true};
  assert.equal(p.publicationDecision(x).publish,true);
  assert.equal(p.publicationDecision({...x,lastPublishedAt:'2026-11-14T23:00:00Z'}).publish,false);
});
test('persistence rejects unverified and count-mismatched successful responses',()=>{
  assert.equal(p.verifySaveResponse({requested:5,response:{savedIds:[]}}).ok,false);
  assert.equal(p.verifySaveResponse({requested:2,response:{savedIds:['x','x']}}).ok,false);
  assert.equal(p.verifySaveResponse({requested:2,response:{error:400}}).ok,false);
  assert.equal(p.verifySaveResponse({requested:2,response:{savedIds:['x','y']}}).ok,true);
});
test('production workflow remains weekly; proposed crons are not enabled on main',()=>{
  const manifest=fs.readFileSync('.github/workflows/geo-analysis.yml','utf8');
  assert.match(manifest,/cron:\s*'0 2 \* \* 0'/);
  const proposed=fs.readFileSync('docs/geo-schedule-rollout.md','utf8');
  assert.match(proposed,/15 \*\/2 \* \* \*/);
  assert.match(proposed,/0 5 \* \* \*/);
  assert.match(proposed,/0 7 \* \* \*/);
});
