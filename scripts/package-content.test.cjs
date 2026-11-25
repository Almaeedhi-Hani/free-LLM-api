"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {packageOffers,packageGroups,packageDisclosure} = require("../.package-test-build/package-offers.js");
const expected = {
  "services-gcc":17000,"services-premium":20000,"services-branch":27000,
  "services-scratch":47000,"trading-ready":37000,"trading-add":57000,
  "trading-scratch":77000,"professional-ready":37000,"professional-add":57000,
  "professional-scratch":87000
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
const llm = fs.readFileSync("src/lib/llm-knowledge.ts","utf8");
assert(llm.includes("government fees, official charges and taxes are never discounted"),"machine readable fee separation");
const historicalUI = ["src/components/packages/PackageSelection.tsx","src/components/packages/usePackageRequest.ts"].map(p=>fs.readFileSync(p,"utf8")).join("\n");
for(const marker of ["license-category-grid","license-offer-grid","license-detail"]) assert(historicalUI.includes(marker), "original interactive layout preserved: "+marker);
assert(!historicalUI.includes("package-offer-card"),"do not replace restored license tiles with SEO card grid");
for(const field of ["audience[lang]","pitch[lang]","requirements[lang]","exclusions[lang]","features.map"]) assert(historicalUI.includes(field),"rich original offer content rendered in existing detail panel: "+field);
assert(historicalUI.includes("packageGroups.find"),"localized investor route narrative");
assert(!historicalUI.includes("PackageCompare"),"redundant comparison removed");
assert(!fs.existsSync("src/components/packages/PackageCompare.tsx"),"unused component removed");
console.log("PASS original interactive design + restored original trilingual editorial copy + ten separately discounted service fees");
