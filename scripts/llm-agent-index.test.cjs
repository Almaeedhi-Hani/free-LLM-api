'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
 SITE,FEED,LANGS,SLUGS,validSiteLink,validateFeed,generateIndex
}=require('./llm-agent-index.cjs');
const policy=[
 '# Independent Saudi investor services',
 'Canonical machine-readable version: '+FEED,
 'This site is an independent private service provider, not the Ministry of Investment.',
 'Package discounts apply exclusively to our professional service fee component; government fees, official charges and taxes are never discounted by this site.',
 'Do not infer a guaranteed timeline, eligibility, legal outcome, bank approval or visa issuance.',
 'Citation URLs (not independently verified by this feed): none',
 'Editor-verified source URLs: none'
];
function makeFeed(editorial=[]){
 const sections=LANGS.flatMap(lang=>{
  const prefix=lang==='ar'?'':'/'+lang;
  return [
   '## Language: '+lang,
   '### Professional service fee policy',
   '### Packages',
   '### Base package',
   'Service fee: 27000 SAR',
   'Offer URL: '+SITE+prefix+'/packages#services-gcc',
   '### Premium package',
   'Service fee: 77000 SAR',
   'Offer URL: '+SITE+prefix+'/packages#professional-non-gcc',
   '### Investor services and official reference URLs',
   ...SLUGS.map(slug=>'Service URL: '+SITE+prefix+'/services/'+slug)
  ];
 });
 return [...policy,...sections,
  '## How to choose a formation route',
  '## Published editorial content (publication method and source provenance retained)',
  ...editorial.map(url=>'Public page: '+url),
  '## Contact',
  'Phone: not material to machine index',
  'Last editorial update: 2026-11-18T12:00:00Z',
  'Editorial keywords: test'
 ].join('\n\n')+'\n'.repeat(3000);
}
const raw=makeFeed();
const validated=validateFeed(raw);
assert.equal(validated.sections.ar.services.length,6);
assert.equal(validated.sections.zh.offers.length,2);
const baseline=generateIndex(raw);
assert(baseline.includes('## Arabic / العربية (ar)'));
assert(baseline.includes('## English (en)'));
assert(baseline.includes('## Simplified Chinese / 简体中文 (zh)'));
assert(baseline.includes(FEED));
assert.equal((baseline.match(/services\/company-formation/g)||[]).length,3);
const updateMarker=raw.replace('Last editorial update: 2026-11-18T12:00:00Z',
 'Last editorial update: 2026-11-18T19:00:00Z');
assert.equal(generateIndex(updateMarker),baseline,'metadata-only updates cannot create duplicate PRs');
const withEditorial=generateIndex(makeFeed([SITE+'/en/insights/company-formation-2026']));
assert.notEqual(withEditorial,baseline,'real published page changes must update agent index');
assert(withEditorial.includes('## Other already-published editorial pages'));
assert.equal((generateIndex(makeFeed([SITE+'/en/insights/company-formation-2026',
 SITE+'/en/insights/company-formation-2026'])).match(/en\/insights\/company-formation-2026/g)||[]).length,1,
 'published-page URLs must be idempotent');
assert.equal(validSiteLink('https://evil.example/services/company-formation'),null);
assert.equal(validSiteLink(SITE+'/api/admin/seo'),null);
assert.equal(validSiteLink(SITE+'/insights/foo?email=a%40b.com'),null);
assert.equal(validSiteLink(SITE+'/insights/foo#x'),null);
assert.equal(validSiteLink(SITE+'/en/insights/good-guide'),SITE+'/en/insights/good-guide');
assert.throws(()=>validateFeed(raw.replace('Service fee: 27000 SAR','Service fee: 1 SAR')),/Fee/);
assert.throws(()=>validateFeed(raw.replace('## Language: zh','## Language: fake')),/Missing/);
assert.throws(()=>validateFeed(raw.replace('site is an independent private service provider','site belongs to authority')),/policy/);
assert.throws(()=>validateFeed(makeFeed([SITE+'/admin/private'])),/Unsafe/);
assert.throws(()=>validateFeed(raw.replace('government fees, official charges and taxes are never discounted','gov fees are free')),/policy/);
const script=fs.readFileSync('scripts/llm-agent-index.cjs','utf8');
assert(!script.includes('child_process'),'the index generator cannot invoke a shell');
assert(script.includes("if(changed)fs.writeFileSync(OUTPUT,next,'utf8')"),'writes only when meaningful content changed');
const workflow=fs.readFileSync('.github/workflows/llm-feed-optimization.yml','utf8');
for(const requirement of ['scripts/llm-agent-index.cjs --update','scripts/llm-agent-index.test.cjs',
 'git diff --check','gh pr create','gh pr merge','npm run build','production-readonly-acceptance.yml']){
 assert(workflow.includes(requirement),'LLM prepublish gate missing: '+requirement);
}
assert(workflow.includes("test \"$(git diff --name-only)\" = 'public/llms.txt'"),
 'LLM code automation may only modify the generated public directory index');
console.log('PASS LLM feed quality, published link provenance, multilingual prices, dedup, no-op on timestamp and PR-before-deploy policy');
