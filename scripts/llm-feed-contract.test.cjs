'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('src/app/api/llm-version/route.ts','utf8');
for(const required of [
 'Independent Saudi investor services',
 'languages.flatMap((lang,index)',
 '"### Packages"',
 '"### Investor services and official reference URLs"',
 'new Set([s.source,...guides[s.slug].references.map(ref=>ref.url)])',
 'e.approval_method==="automated"',
 'Citation URLs (not independently verified by this feed)',
 'Editor-verified source URLs:',
 'content.contact.phoneDisplay',
 'Concise AI-agent discovery index (quality-checked before index updates)',
 'offer.price',
 'offer.previousPrice',
]){
 assert(source.includes(required),'Missing trusted machine-readable feed contract: '+required);
}
const directory=fs.readFileSync('public/llms.txt','utf8');
assert(directory.includes('## Arabic / العربية (ar)')&&directory.includes('## English (en)')&&directory.includes('## Simplified Chinese / 简体中文 (zh)'),'All locale indexes must be published');
assert(directory.includes('https://free-llm-api-1-didl.onrender.com/api/llm-version'),'Directory links back to canonical feed');
assert(!source.includes('Human-reviewed editorial improvements'));
assert(!source.includes('our previous published professional service fee'));
assert(!source.includes('].join("\\\\n")'),'literal slash-n separator must not be rendered');
const packages=fs.readFileSync('src/lib/package-offers.ts','utf8');
assert(packages.includes('"price": 27000')&&packages.includes('"price": 77000'),'original fee source must be preserved');
const workflow=fs.readFileSync('.github/workflows/llm-feed-optimization.yml','utf8');
assert(workflow.includes('gh pr list --state open --head "$branch" --base main'),'Existing bot branch must be checked for an open PR');
assert(workflow.includes('Index update already awaits CI/review'),'Open index PR must be a pending state, not a failure');
assert(workflow.includes('Orphan index branch exists without an open PR'),'Unowned bot branch must fail closed');
assert(!workflow.includes('Existing index PR branch must be resolved first; no duplicate PR.'),'Old unconditional failure must be removed');
console.log('PASS LLM feed segmentation, source attribution, price invariants and newline formatting');
