const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const {products,benefits,documents,steps,faqs,labels,sources}=require('../.residency-test-build/premium-residency-content.js');
const localized=x=>{for(const lang of ['ar','en','zh'])assert.ok(typeof x[lang]==='string'&&x[lang].trim(),lang);assert.match(x.ar,/[\u0600-\u06ff]/);assert.match(x.zh,/[\u3400-\u9fff]/);};
test('seven distinct official products, consistent fees and translated conditions',()=>{
 assert.deepEqual(products.map(x=>x.id),['unlimited','limited','investor','entrepreneur','property','exceptional','gifted']);
 assert.deepEqual(products.map(x=>x.fee),[800000,100000,4000,4000,4000,4000,4000]);
 assert.deepEqual(products.filter(x=>x.annual).map(x=>x.id),['limited']);
 for(const p of products){localized(p.name);localized(p.period);localized(p.eligibility);assert.equal(new URL(p.source).origin,'https://pr.gov.sa');}
 for(const p of sources){localized(p.title);assert.equal(new URL(p.url).origin,'https://pr.gov.sa');}
 for(const x of [...benefits,...documents,...steps,...Object.values(labels)])localized(x);
 for(const f of faqs){localized(f.q);localized(f.a);}
 assert.equal(faqs.length,6);
 assert.match(products.find(p=>p.id==='property').eligibility.en,/off-plan/);
 assert.match(labels.feeNote.en,/professional fees are separate/);
 assert.match(labels.feeNote.ar,/بعد الموافقة على الطلب/);
 assert.match(labels.feeNote.ar,/4,000 ريال ليس تكلفة/);
 assert.match(labels.feeNote.zh,/并非获得居留的全部成本/);
 assert.match(labels.fee.ar,/الحكومي/);
 assert.equal(labels.apply,undefined);
 assert.ok(sources.every(s=>!s.url.includes('Select-products')));
});
test('page keeps public FAQs consistent with schema and avoids editorial proposals',()=>{
 const c=fs.readFileSync('src/components/PremiumResidencyPage.tsx','utf8');
 assert.match(c,/mainEntity:faqs\.map/);assert.match(c,/<details key=\{i\}/);
 assert.match(c,/whatsAppUrlForLanguage\(contact,lang\)/);
 assert.doesNotMatch(c,/EditorialBlock|approvedEditorial|Select-products|l\.apply\[lang\]/);
 assert.match(c,/<span className=\{styles\.duration\}>\{l\.fee\[lang\]\}<\/span><strong/);
 const route=fs.readFileSync('src/app/services/premium-residency/page.tsx','utf8');
 assert.match(route,/<PremiumResidencyPage\/>/);assert.match(route,/pageMetadata\("premium-residency"\)/);
});
