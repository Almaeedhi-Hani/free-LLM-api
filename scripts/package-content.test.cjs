"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {packageOffers,packageGroups,packageDisclosure} = require("../.package-test-build/package-offers.js");
const expected = {
  "services-gcc":18000,"services-premium":21000,"services-branch":28000,
  "services-scratch":48000,"trading-ready":38000,"trading-add":58000,
  "trading-scratch":78000,"professional-ready":38000,"professional-add":58000,
  "professional-scratch":88000
};
assert.equal(packageOffers.length,10);
assert.equal(packageGroups.length,3);
assert.deepEqual(Object.keys(expected).sort(),packageOffers.map(o=>o.slug).sort());
for(const o of packageOffers){
  assert.equal(o.price,expected[o.slug],o.slug+" public fee");
  assert.equal(o.previousPrice-o.price,1000,o.slug+" discount");
  assert.equal(o.features.length,3,o.slug+" unique scope");
  for(const lang of ["ar","en","zh"]){
    assert(o.title[lang].length>=7,o.slug+" "+lang+" title");
    assert(o.audience[lang].length>=(lang==='zh'?20:24),o.slug+" "+lang+" audience");
    assert(o.pitch[lang].length>=(lang==='zh'?20:35),o.slug+" "+lang+" editorial narrative");
    assert(o.requirements[lang].length>=(lang==='zh'?15:18),o.slug+" "+lang+" requirements");
    assert(o.exclusions[lang].length>=(lang==='zh'?15:18),o.slug+" "+lang+" exclusions");
    assert(o.features.every(x=>x[lang].length>=(lang==='zh'?8:12)),o.slug+" "+lang+" deliverables");
  }
  const blocked = [["j","c","group","ksa"].join(""),["j","c"," ","group"].join(""),["investinsaudi","-services",".sa"].join("")];
  assert(!blocked.some(term => JSON.stringify(o).toLowerCase().includes(term)));
}
assert.deepEqual(packageGroups.map(g=>packageOffers.filter(o=>o.group===g.id).length),[4,3,3]);
const featureSets=packageOffers.map(o=>o.features.map(x=>x.ar).join("|"));
assert.equal(new Set(featureSets).size,10,"offer inclusions must not be copied across packages");
assert(![["j","c","group","ksa"].join(""),["j","c"," ","group"].join("")].some(term=>JSON.stringify(packageDisclosure).toLowerCase().includes(term)));
for (const lang of ["ar","en","zh"]) {
  assert(/الرسوم الحكومية|رسوم حكومية|government|政府/.test(packageDisclosure[lang]),lang+" public fees disclosed");
  assert(/الضرائب|taxes|税费/.test(packageDisclosure[lang]),lang+" tax costs separate");
}
const markup = fs.readFileSync("src/components/SchemaMarkup.tsx","utf8");
assert(!/1010998877|MISA-2024-LIC-9988|\+966110000000/.test(markup),"no fabricated licensing or telephone defaults");
const llm = fs.readFileSync("src/app/api/llm-version/route.ts","utf8");
assert(llm.includes("government fees, official charges and taxes are never discounted"),"machine readable fee separation");
console.log("PASS ten independently written trilingual packages, SAR 1000 reductions, eligibility, scope and fee disclosure");
