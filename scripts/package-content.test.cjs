"use strict";
const assert = require("node:assert/strict");
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
    assert(o.audience[lang].length>=24,o.slug+" "+lang+" audience");
    assert(o.pitch[lang].length>=35,o.slug+" "+lang+" editorial narrative");
    assert(o.requirements[lang].length>=18,o.slug+" "+lang+" requirements");
    assert(o.exclusions[lang].length>=18,o.slug+" "+lang+" exclusions");
    assert(o.features.every(x=>x[lang].length>=12),o.slug+" "+lang+" deliverables");
  }
  assert(!/JC\s*Group|jcgroupksa|investinsaudi-services\.sa/i.test(JSON.stringify(o)));
}
assert.deepEqual(packageGroups.map(g=>packageOffers.filter(o=>o.group===g.id).length),[4,3,3]);
const featureSets=packageOffers.map(o=>o.features.map(x=>x.ar).join("|"));
assert.equal(new Set(featureSets).size,10,"offer inclusions must not be copied across packages");
assert(!/JC\s*Group|jcgroupksa/i.test(JSON.stringify(packageDisclosure)));
console.log("PASS ten independently written trilingual packages, SAR 1000 reductions, eligibility, scope and fee disclosure");
