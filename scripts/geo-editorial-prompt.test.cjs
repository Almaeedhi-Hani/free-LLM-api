"use strict";
const assert=require("node:assert/strict");
const {promptForLocale}=require("./geo-opencode-planner.cjs");
for(const lang of ["ar","en","zh"]){
 const prompt=promptForLocale(lang,[{id:"observed-1",type:"keyword_suggestion",source:"search",language:lang,name:"Saudi investor services"}]);
 assert.match(prompt,/sections is an array of \{h2,body,subsections\}/);
 assert.match(prompt,/each subsection is \{h3,body\}/);
 assert.match(prompt,/OMIT that action rather than invent text/);
 assert.match(prompt,/Never return bare heading strings/);
}
console.log("PASS multilingual GEO prompt H2-H3 integrity and evidence restraint");
