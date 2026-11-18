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
console.log('PASS LLM feed segmentation, source attribution, price invariants and newline formatting');
