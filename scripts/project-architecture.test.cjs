'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const {readGlobalStyles}=require('./support/global-styles.cjs');
const read=p=>fs.readFileSync(p,'utf8');
const page=read('src/app/page.tsx');
assert(page.split('\n').length<70,'Route should compose feature components, not contain every section');
for(const name of ["ConversionProof","AuthorityStrip","MarketEntry","EditorialPromise","HomeEditorial","ServicesSection","JourneySection","SourcesSection","ContactSection"]){
  assert(page.includes('import '+name+' from "@/components/home/'+name+'";'),name+' import');
  assert(page.includes('<'+name+' '),name+' mounted');
  assert(fs.existsSync('src/components/home/'+name+'.tsx'),name+' source');
}
assert(page.includes('await loadHomeModel()')&&page.includes('JSON.stringify(schema)'),'server model and structured data');
const rootLayout=read('src/app/layout.tsx');
assert(rootLayout.split('\n').length<80,'Layout must delegate shell rendering');
for(const name of ['SiteHeader','SiteFooter'])assert(rootLayout.includes('<'+name+' '));
const residency=read('src/components/PremiumResidencyPage.tsx');
assert(residency.split('\n').length<40,'Residency route must compose sections');
for(const name of ["ResidencyHero","ResidencyProducts","ResidencyComparison","ResidencyGuidance","ResidencyReferences"])assert(residency.includes('<'+name+' '),name+' mounted');
const manifest=read('src/app/globals.css');
assert(!/\{[^}]*:[^}]*\}/s.test(manifest),'Global entrypoint only imports styles');
const css=readGlobalStyles();
for(const marker of ['@tailwind base;','@tailwind components;','@tailwind utilities;'])assert.equal(css.split(marker).length,2,marker);
const baseline=process.argv[2];
if(baseline){
  assert.equal(css,cp.execFileSync('git',['show',baseline+':src/app/globals.css'],{encoding:'utf8'}),'Refactor must preserve every original CSS byte in cascade order');
  const original=cp.execFileSync('git',['show',baseline+':src/app/page.tsx'],{encoding:'utf8'}).split('\n');
  const sections=[["ConversionProof",67,79],["AuthorityStrip",80,85],["MarketEntry",86,132],["EditorialPromise",133,145],["HomeEditorial",146,153],["ServicesSection",154,184],["JourneySection",185,205],["SourcesSection",206,247],["ContactSection",248,267]];
  for(const [name,start,end] of sections){assert(read('src/components/home/'+name+'.tsx').includes(original.slice(start-1,end).join('\n')),name+' original markup unchanged');}
  const layout=cp.execFileSync('git',['show',baseline+':src/app/layout.tsx'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [['SiteHeader',56,83],['SiteFooter',85,120]])assert(read('src/components/layout/'+name+'.tsx').includes(layout.slice(start-1,end).join('\n')),name+' original markup');
  const residency=cp.execFileSync('git',['show',baseline+':src/components/PremiumResidencyPage.tsx'],{encoding:'utf8'}).split('\n');
  for(const [name,start,end] of [["ResidencyHero",39,47],["ResidencyProducts",50,61],["ResidencyComparison",62,66],["ResidencyGuidance",67,72],["ResidencyReferences",73,74]])assert(read('src/components/residency/'+name+'.tsx').includes(residency.slice(start-1,end).join('\n')),name+' original markup');
  console.log('PASS baseline CSS, homepage, header/footer and residency markup unchanged');
}
console.log('PASS ordered CSS manifest and composed homepage architecture');
