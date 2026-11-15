"use strict";
/**
 * OpenCode editorial planning: bounded, multilingual and grounded in the actual
 * site topology. The helper reads no API secrets and makes no paid calls.
 */
const manifest=require("../src/data/content-tree.json");
const LANGS=["ar","en","zh"];
const SCHEMA_TYPES=Object.freeze(["Article","BreadcrumbList","Service","WebPage","FAQPage","CollectionPage"]);
// Unsupported model suggestions are never converted to a different schema type.
function supportedSchemaSuggestions(values){
 if(values===undefined)return undefined;
 if(!Array.isArray(values))return values; // preserve malformed shapes for server rejection
 return [...new Set(values.filter(type=>SCHEMA_TYPES.includes(type)))].slice(0,5);
}
function chooseResearchEvidence(items,limit=60){
 const selected=[],seen=new Set();
 const add=e=>{
  const key=e.id||e.url||e.name;
  if(!key||seen.has(key)||selected.length>=limit)return;
  selected.push(e);seen.add(key);
 };
 const perLang=Math.max(1,Math.floor(limit/LANGS.length));
 for(const lang of LANGS){
  const candidates=items.filter(e=>e.language===lang||e.language===lang.toUpperCase());
  const types=[...new Set(candidates.map(e=>e.type))];
  let picked=0;
  for(const type of types){if(picked>=perLang)break;const item=candidates.find(e=>e.type===type&&!seen.has(e.id));if(item){add(item);picked++}}
  for(const e of candidates){if(picked>=perLang)break;const n=selected.length;add(e);if(selected.length>n)picked++}
 }
 for(const item of items)add(item);
 return selected;
}
function selectLocaleEvidence(items,lang,max=8){
 const own=items.filter(e=>e.language===lang);
 const shared=items.filter(e=>!e.language||e.language==="multi");
 const cross=items.filter(e=>e.language&&e.language!==lang&&e.language!=="multi");
 const seen=new Set(),result=[];
 for(const pool of [own,shared,cross]){
  // First select distinct evidence kinds; then fill from this same pool.
  for(const e of pool){
   if(result.length>=max)break;
   if(result.some(x=>x.type===e.type&&x.source===e.source))continue;
   if(!seen.has(e.id)){result.push(e);seen.add(e.id)}
  }
  for(const e of pool){if(result.length>=max)break;if(!seen.has(e.id)){result.push(e);seen.add(e.id)}}
 }
 return result;
}
function promptForLocale(lang,evidence){
 if(!LANGS.includes(lang))throw Error("Unsupported analysis language");
 if(!Array.isArray(evidence)||evidence.length===0||evidence.length>8)throw Error("Evidence must contain 1-8 records");
 const topics=manifest.nodes.map(n=>({id:n.id,parent:n.parent_id,status:n.route?"live":"planned",existing_url:n.route,kind:n.kind,intent:n.intent,primary_keyword:n.primary_keyword[lang],question:n.main_question[lang],related_nodes:n.related_nodes,schema_candidates:n.schema_candidates,official_source_candidates:n.official_sources}));
 const rules=[
 "You are OpenCode operating as four expert roles: (1) source researcher (2) multilingual SEO/GEO architect (3) qualified service editor (4) technical SEO and link auditor.",
 "Load the content-architecture skill if available in your isolated OpenCode workspace, then follow its approved content tree and evidence publication constraints.",
 "Perform a sober evidence-based content gap assessment. DO NOT pretend a proposed site plan is a search ranking, traffic statistic, or verified legal requirement.",
 "Locale for this run: "+lang+". Every user-facing question, title, summary, section, keyword and body must be natural, correct "+({ar:"Arabic",en:"English",zh:"Simplified Chinese"}[lang])+". Use internationally accepted acronyms sparingly.",
 "Site content tree is authoritative for EXISTING routes and parent/child links; 'planned' topics have NO page yet and MUST NOT appear as clickable internal links.",
 "Propose content across multiple useful surfaces: existing six service pages, price-explanation content for /packages, homepage decision support, deep investor guides, original comparisons, source-backed trust proof if present, internal links, and actionable technical SEO tasks.",
 "For each action choose a topic_node_id from the tree and relevant page kind. For a service use an actual service slug target; home/trust target /; packages target /packages; a guide/comparison needs an original lowercase hyphen slug as target, plus related_service where there is a real parent service.",
 "Identify one search intent and one evidence-supported primary_keyword per proposed action (if inferred rather than observed, label the uncertainty in summary); suggest at most five secondary_keywords, and a SHORT accurate H1. Existing service H1/visual design MUST remain unchanged unless independently reviewed.",
 "For guides or commercial sections generate meaningful H2 and optional nested H3 headings with substantial body text for EACH heading; do not output headings without prose and do not keyword-stuff. The draft body should be a useful original introduction, not recycled competitor text.",
 "For Simplified Chinese, use concise but meaningful titles and H1s of at least 6 Chinese characters and internal link anchors of at least 3 characters. Write a substantive original draft body of at least 80 Chinese characters, H2 headings with at least 4 ideographs, and at least 20 Chinese characters in EACH H2 and nested H3 body. If evidence cannot support that length, omit the editorial action rather than pad or invent claims.",
 "Propose 1-4 contextual internal_links objects {node_id, anchor} that target only existing live routes from the tree, reflecting parent/child and topical relevance. Do not create links to missing or unpublished pages or claim all guides are related.",
 "Propose schema_suggestions from Article, BreadcrumbList, Service, WebPage, FAQPage, CollectionPage only when the type matches what is visible. Never invent ratings, licenses, organizations, outcomes, contacts, FAQs or hidden structured-data-only content. Nothing changes public JSON-LD automatically.",
 "Each proposed FAQ answer must contain at least 140 characters for Arabic or English, or 110 characters including at least 55 Han ideographs for Simplified Chinese. Provide a direct, useful answer grounded in evidence; never pad with filler or invent official requirements. Omit the FAQ when evidence is insufficient.",
 "Offer official_source_candidates in the tree as references for HUMAN re-verification; competitor URLs and keyword suggestions ARE NOT authority-verified legal evidence. Attach actual evidence_ids for researched claims, never fabricate IDs. No source => source-research task, not regulatory fact.",
 "Financial, corporate formation, licensing, banking and legal drafts stay high risk; require specialist review. Official fees and taxes are separate from our professional service fees. NEVER modify the published service prices or existing three-stage package visual layout.",
 "If evidence is weak propose no article or FAQ; prefer a research goal/technical task. A credible single guide is better than five fabricated ones.",
 "Output compact JSON with arrays and at most 3 opportunities, 3 goals, 2 FAQs, 5 editorial_actions for this locale. Keep every title and paragraph specific to its content purpose.",
 "Proposed output schema follows below, no Markdown fences."
 ];
 const schema={
  opportunities:[{title:"evidence-led gap",type:"gap|content|keyword",score:35,evidence_ids:["ACTUAL_ID"],description:"measured finding or explicit hypothesis"}],
  goals:[{title:"verify a specific source or create an audited topic page",priority:"high|medium|low",related_opportunity:"description"}],
  drafts:[{q:"question in requested language",a:"specific researched answer in requested language",evidence_ids:["ACTUAL_ID"],risk_level:"high"}],
  editorial_actions:[{kind:"home|service|packages|guide|comparison|trust|technical_seo|internal_link",lang,target:"existing service slug OR / OR /packages OR original guide slug",slug:"for guide/comparison only",related_service:"for guide/comparison if relevant",topic_node_id:"tree ID",primary_keyword:"query for target",secondary_keywords:["relevant variation"],h1_suggestion:"single truthful heading",title:"original title",summary:"concise buyer/useful summary",body:"substantial unique source-aware explanatory introduction",sections:[{h2:"clear step or decision heading",body:"substantial explanation",subsections:[{h3:"specific subtopic",body:"specific detail"}]}],internal_links:[{node_id:"existing live tree ID",anchor:"natural anchor label"}],schema_suggestions:["Article","BreadcrumbList"],evidence_ids:["ACTUAL_ID"],risk_level:"high"}]
 };
 return [rules.join("\n"),"\nACTUAL SITE CONTENT TREE:\n"+JSON.stringify(topics),"\nOBSERVED RESEARCH INPUT:\n"+JSON.stringify(evidence),"\nOUTPUT JSON SHAPE (replace examples with real evidence, omit unsupported objects):\n"+JSON.stringify(schema)].join("\n\n");
}
module.exports={LANGS,SCHEMA_TYPES,supportedSchemaSuggestions,chooseResearchEvidence,selectLocaleEvidence,promptForLocale};
