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
  console.log('PASS baseline CSS and nine original section markup blocks unchanged');
}
console.log('PASS ordered CSS manifest and composed homepage architecture');
