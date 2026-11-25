'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {readGlobalStyles}=require('./support/global-styles.cjs');
const allowed=new Set(["202a36","1a2229","111827","374151","4b5563","6b7280","d1d5db","f9fafb","ffffff","1f2937"]);
const accent=fs.readFileSync('src/styles/components/conversion-actions.css','utf8');
const all=readGlobalStyles();
assert(all.includes(accent),'scoped conversion stylesheet imported');
const discovery=fs.readFileSync('src/styles/components/discovery-cards.css','utf8');
assert(all.includes(discovery),'shared discovery styles imported');
const css=all.replace(accent,'').replace(discovery,'')+fs.readFileSync('src/components/PremiumResidencyPage.module.css','utf8');
for(const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)){let c=m[0].slice(1).toLowerCase();if(c.length===3||c.length===4)c=c.split('').map(x=>x+x).join('');assert(allowed.has(c.slice(0,6)),'Non-reference color '+m[0]);}
for(const path of ['src/components/WhatsAppFloat.tsx','src/components/CookieConsent.tsx'])for(const m of fs.readFileSync(path,'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g))assert(allowed.has(m[0].slice(1).toLowerCase()),path+' '+m[0]);
assert(css.includes('.cinematic-headline {color:var(--reference-subtle);}')&&css.includes('--reference-subtle: #6b7280;'));
assert(css.includes('.cinematic-primary {background:var(--reference-ink);')&&css.includes('.cinematic-primary:hover {background:var(--reference-hover);'));
const approvedGold=new Set(['b8860b']);
for(const m of accent.matchAll(/#[0-9a-fA-F]{6}\b/g))assert(approvedGold.has(m[0].slice(1).toLowerCase()),'unexpected accent color');
for(const m of accent.matchAll(/(?:^|\n)(body[^{}]+)\{/g))assert(m[1].startsWith('body:not(:has(.admin-route))'),'admin isolation');
assert(!/\.(?:site-footer|cinematic-headline|cinematic-accent|cinematic-secondary|cinematic-scrim)\b/.test(accent),'neutral visual identity preserved');
const l=hex=>{const a=hex.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2]};
for(const color of ['b8860b'])assert((l(color)+.05)/(l('111827')+.05)>=4.5,'CTA contrast AA');
assert(accent.includes('--conversion-gold: #b8860b;')&&accent.includes('.desktop-nav a[aria-current]')&&accent.includes('.mobile-floating-menu-link.is-active')&&accent.includes('.step-number')&&discovery.includes('.discovery-number'),'approved metal gold on navigation, cards and numbers');
assert((l('ffffff')+.05)/(l('b8860b')+.05)>=3,'large gold number contrast');
assert(accent.includes('.mobile-floating-menu-link.is-active:hover {\n  background:var(--reference-ink);\n  color:var(--reference-white);'));
assert(accent.includes('.mobile-floating-menu-link.is-active::after {\n  background:var(--conversion-gold);'));
for(const name of ['PackageSelection','PackageContactStep','PackageInvestmentStep','PackageReviewStep','PackageSuccessStep']){
  const source=fs.readFileSync('src/components/packages/'+name+'.tsx','utf8');
  assert(source.includes('PackageArrow direction="back"'),name+' uses reusable back arrow');
  assert(!/[↩↪🔙]/u.test(source),name+' contains emoji arrow');
}
const bannerCss=fs.readFileSync('src/components/home/FormationPackagesBanner.module.css','utf8');
assert(bannerCss.includes('var(--conversion-gold)')&&bannerCss.includes('radial-gradient'),'approved gold mesh');
assert(!/#[0-9a-f]{3,8}\b/i.test(bannerCss),'banner uses existing palette tokens, not new hex colors');
for(const m of bannerCss.matchAll(/rgba\((\d+),(\d+),(\d+),([.\d]+)\)/g)){
  assert(['184,134,11','32,42,54','255,255,255'].includes(m.slice(1,4).join(',')),'only approved palette RGB');
  if(m.slice(1,4).join(',')==='184,134,11')assert(Number(m[4])<=.30,'subtle gold mesh only');
}
assert(!/#[0-9a-f]{3,8}\b/i.test(discovery.replace(/\/\*[\s\S]*?\*\//g,'')),'use palette tokens only');
for(const m of discovery.matchAll(/rgba\((\d+),(\d+),(\d+),([.\d]+)\)/g)){
  assert(['184,134,11','32,42,54'].includes(m.slice(1,4).join(',')),'discovery uses approved colors');
  assert(Number(m[4])<=.12,'subtle discovery mesh only');
}
for(const p of ['src/components/packages/PackageSelection.tsx','src/components/home/ServicesSection.tsx','src/components/home/MarketEntry.tsx','src/components/services/ServiceRelated.tsx','src/app/insights/page.tsx'])assert(fs.readFileSync(p,'utf8').includes('DiscoveryContent'),p+' shared discovery markup');
for(const p of ['src/components/EditorialBlock.tsx','src/app/insights/[slug]/page.tsx','src/components/home/HomeEditorial.tsx','src/components/services/ServiceNextStep.tsx'])assert(fs.readFileSync(p,'utf8').includes('DiscoveryLink'),p+' compact discovery link');
console.log('PASS exact approved gold and shared quiet discovery design');
