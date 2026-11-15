"use strict";
const assert=require("node:assert/strict");
const {LANGS,chooseResearchEvidence,selectLocaleEvidence,promptForLocale}=require("./geo-opencode-planner.cjs");
const evidence=[
{id:"a1",type:"keyword_suggestion",source:"google-suggest",language:"ar",name:"خدمات تأسيس الشركات"},
{id:"a2",type:"competitor_candidate",source:"exa",language:"ar",name:"خدمات الأعمال"},
{id:"e1",type:"keyword_suggestion",source:"google-suggest",language:"en",name:"company formation Saudi Arabia"},
{id:"e2",type:"observation",source:"tavily",language:"en",name:"regulatory overview"},
{id:"z1",type:"keyword_suggestion",source:"google-suggest",language:"zh",name:"沙特公司注册"},
{id:"z2",type:"competitor_candidate",source:"parallel",language:"zh",name:"沙特投资"},
];
const gathered=chooseResearchEvidence([...evidence,...evidence],6);
assert.equal(gathered.length,6,"avoid duplicate gathered evidence");
for(const lang of LANGS){
 const batch=selectLocaleEvidence(gathered,lang,4);
 assert.equal(batch[0].language,lang,"prioritize own language research");
 const prompt=promptForLocale(lang,batch);
 for(const key of ["ACTUAL SITE CONTENT TREE","topic_node_id","primary_keyword","h1_suggestion","sections","h2","h3","internal_links","schema_suggestions","human","planned"])assert(prompt.toLowerCase().includes(key.toLowerCase()),key);
 assert(prompt.includes("company-formation"),"must address real live site routes");
}
assert.throws(()=>promptForLocale("fr",evidence),/Unsupported/);
assert.throws(()=>promptForLocale("ar",[]),/Evidence must/);
const worker=require("node:fs").readFileSync("scripts/opencode-geo-analysis.js","utf8");
assert(worker.includes('selectLocaleEvidence('),"each language gets distinct research context");
assert(worker.includes('promptForLocale('),"OpenCode must receive site-tree-informed briefs");
assert(!worker.includes('evidenceItems.slice(0, 8)'),"first eight evidence anti-pattern removed");
console.log("PASS bounded trilingual OpenCode research plus parent-child topic schema and evidence-aware publishing strategy");
