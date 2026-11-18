'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const insight=fs.readFileSync('src/app/insights/[slug]/page.tsx','utf8');
const home=fs.readFileSync('src/app/page.tsx','utf8');
for(const [name,source] of [['insight',insight],['home FAQ',home]]){
 for(const note of [
  'قد لا تكون مصادره متحققة استقلاليًا',
  'قد لا تكون مصادرها متحققة استقلاليًا',
  'غير متحققة استقلاليًا',
  'not independently verified',
  'may not have been independently verified',
  '未经独立核验','未经独立核实',
 ]){
  assert(!source.toLowerCase().includes(note.toLowerCase()),
   'Visitor-facing '+name+' must not render removed source notice: '+note);
 }
}
assert(!home.includes("f.approval_method === 'automated' && ("),'no conditional FAQ source disclaimer');
assert(!insight.includes("page.approval_method===\"automated\"&&<p className=\"text-sm\">"),'no conditional article disclaimer');
assert(insight.includes('page.cited_sources||[]'),'existing optional research links preserved');
assert(insight.includes('lang==="ar"?"المراجع"'),'source heading is neutral, not verified');
assert(insight.includes('service-decision-disclaimer'),'general investment guidance remains');
assert(home.includes('<p>{f.a}</p>'),'FAQ answer remains unchanged');
const admin=fs.readFileSync('src/components/ContentImpactCenter.tsx','utf8');
assert(admin.includes('autoStatus'),'admin publication data stays visible to administrators');
console.log('PASS public source notes removed for articles and FAQs, neutral references and internal provenance retained');
