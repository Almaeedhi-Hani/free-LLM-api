"use strict";
/**
 * OpenCode editorial planning: bounded, multilingual and grounded in the actual
 * site topology. The helper reads no API secrets and makes no paid calls.
 */
const manifest=require("../src/data/content-tree.json");
const LANGS=["ar","en","zh"];
const SCHEMA_TYPES=Object.freeze(["Article","BreadcrumbList","Service","WebPage","FAQPage","CollectionPage"]);
const {EDITORIAL_KINDS,EDITORIAL_TEXT_MINIMA,isValidTechnicalTarget}=require('./geo-generated-output-guard.cjs');
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
 "For each action choose a topic_node_id from the tree and relevant page kind. For a service use an actual service slug target; home/trust target /; packages target /packages; a guide/comparison MUST have BOTH target and slug set to the SAME original URL-safe slug (example: target=\"saudi-investor-guide\", slug=\"saudi-investor-guide\"); use only lowercase ASCII a-z, digits 0-9, and single internal hyphens, maximum 90 characters; NEVER use /insights/, leading slash, Chinese/Arabic characters, spaces, underscores, or a full URL in either field. If no valid slug can be produced, omit that editorial action rather than inventing a route; plus related_service where there is a real parent service.",
 "Identify one search intent and one evidence-supported primary_keyword per proposed action (if inferred rather than observed, label the uncertainty in summary); suggest at most five secondary_keywords, and a SHORT accurate H1. Existing service H1/visual design MUST remain unchanged unless independently reviewed.",
 "For guides or commercial sections generate meaningful H2 and optional nested H3 headings with substantial body text for EACH heading; do not output headings without prose and do not keyword-stuff. The draft body should be a useful original introduction, not recycled competitor text.",
  "For visitor-facing home, service, packages, guide, comparison and trust actions, write FINAL publication-ready copy directly addressing the investor in the requested language. Title, summary, headings, body and link anchors must contain only visitor-facing information, never editorial proposals, instructions to edit the website, layout or H1 preservation notes, internal policies, or review-before-publication notes. Keep research and implementation instructions outside public copy. Verify regulated claims against official evidence; if unsupported, omit the claim or the entire action. Apply this rule to Arabic, English and Simplified Chinese and to every repair. Do not invent sources.",
 "Editorial sections must be valid structured JSON: sections is an array of {h2,body,subsections}; h2 is a nonempty descriptive heading, body is a nonempty substantive paragraph, subsections is an array (use [] if none), and each subsection is {h3,body} with both fields nonempty. Never return bare heading strings, null sections, empty placeholder sections, or H3 without its own body.",
 "Before returning JSON, self-check every editorial action for complete H2/H3 section structure and meaningful original body text. If one action fails, repair it in the response before submission; if evidence is insufficient, OMIT that action rather than invent text. Keep omitted counts visible via the final stage report; do not claim all actions were saved.",
 "For Simplified Chinese, use concise but meaningful titles and H1s of at least 6 Chinese characters and internal link anchors of at least 3 characters. Write a substantive original draft body of at least 80 Chinese characters, H2 headings with at least 4 ideographs, and at least 20 Chinese characters in EACH H2 and nested H3 body. If evidence cannot support that length, omit the editorial action rather than pad or invent claims.",
 "Propose 1-4 contextual internal_links objects {node_id, anchor} that target only existing live routes from the tree, reflecting parent/child and topical relevance. Do not create links to missing or unpublished pages or claim all guides are related.",
 "Propose schema_suggestions from Article, BreadcrumbList, Service, WebPage, FAQPage, CollectionPage only when the type matches what is visible. Never invent ratings, licenses, organizations, outcomes, contacts, FAQs or hidden structured-data-only content. Nothing changes public JSON-LD automatically.",
 "Each proposed FAQ answer must contain at least 140 characters for Arabic or English, or 110 characters including at least 55 Han ideographs for Simplified Chinese. Provide a direct, useful answer grounded in evidence; never pad with filler or invent official requirements. Omit the FAQ when evidence is insufficient.",
 "Offer official_source_candidates in the tree as references for HUMAN re-verification; competitor URLs and keyword suggestions ARE NOT authority-verified legal evidence. Attach actual evidence_ids for researched claims, never fabricate IDs. No source => source-research task, not regulatory fact.",
 "Financial, corporate formation, licensing, banking and legal drafts stay high risk; require specialist review. Official fees and taxes are separate from our professional service fees. NEVER modify the published service prices or existing three-stage package visual layout.",
 "If evidence is weak propose no article or FAQ; prefer a research goal/technical task. A credible single guide is better than five fabricated ones.",
 "Every opportunity MUST have a nonempty title of at most 500 characters, type exactly gap or content or keyword, and score as a JSON NUMBER from 0 to 100 (not a quoted number, percentage string, null, or object). Optional description, when present, must be nonempty text at most 2000 characters. Omit an opportunity rather than invent a score or evidence.",
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
/**
 * Quota-conscious prompt for direct free-tier HTTP inference.
 * Preserve the real evidence IDs, source origins, live routes, locale and
 * original/legal/financial claims policy while using far fewer tokens.
 * The full OpenCode legacy prompt remains unchanged for its own tests.
 */
function promptForDirectLocale(lang,evidence,repair){
 if(!LANGS.includes(lang))throw Error('Unsupported analysis language');
 if(!Array.isArray(evidence)||!evidence.length||evidence.length>8)
  throw Error('Evidence must contain 1-8 records');
 const asText=(v,n=160)=>String(v==null?'':v).slice(0,n);
 const liveRoutes=manifest.nodes.filter(n=>n.route).slice(0,14).map(n=>({
  node_id:n.id,url:n.route,kind:n.kind,
  keyword:asText(n.primary_keyword?.[lang],70),
  question:asText(n.main_question?.[lang],100)
 }));
 const technicalTargets=liveRoutes.map(n=>n.url).filter(isValidTechnicalTarget);
 const rules=[
  'You are a conservative Saudi investor GEO researcher/editor. Use only SOURCE EVIDENCE below; never invent data.',
  'All user-facing text must be natural '+({ar:'Arabic',en:'English',zh:'Simplified Chinese'}[lang])+'.',
  'The independent private site is NOT a Saudi government agency. Legal, immigration, banking and official costs require verification.',
  'Competitor search results are unverified candidate pages, not evidence of rankings, actual search traffic or legal rules.',
  'Government taxes, official fees and third-party charges are separate from our professional services. No price or outcome guarantees.',
  'Cite actual evidence_ids only. If inadequate sources, provide a research goal rather than fabricated FAQ or legal content.',
  'Use only existing live pages for internal links; do not invent pages, sources or URLs.',
  'Output JSON ONLY with arrays opportunities, goals, drafts, editorial_actions; use empty arrays if not justified.',
  'At most 2 opportunities, 2 goals, 1 draft FAQ, 1 editorial action. Each opportunity MUST have title, type one of gap|content|keyword, numerical score 0..100 and actual evidence_ids.',
  'Each goal MUST have title and priority EXACTLY one of high|medium|low. Use medium for an unranked research goal. It may also include a grounded description or related_opportunity. Never omit priority.',
  'FAQ drafts MUST use q (question text), a (answer text), risk_level high and actual evidence_ids. Use at least 15 characters in the question and 110 characters in the answer, with substantial text in the requested language. For Chinese use at least 55 Han ideographs in the answer. Omit unjustified drafts.',
  'FAQ QUALITY PREFLIGHT: Question must contain at least 8 readable letters and at least 15 characters. Answer needs at least 110 characters and 55 readable letters; for English at least 50 Latin letters and >=85% Latin among letters; for Arabic at least 45 Arabic letters and >=72% Arabic; for Chinese at least 55 Han ideographs and >=48% Han. The question itself must predominantly match the requested language. No generic competitor-observation filler, unverified guarantees, repeated answers or invalid replacement characters. If exact facts or length cannot be supported by evidence, OMIT the draft, not fabricated padding.',
  ...(lang==='zh'?['ZH FAQ QUESTION FINAL CHECK: The q field (question itself, not the answer) must be a natural Simplified Chinese question with at least 15 Han ideographs before punctuation; count q separately from the answer. Short Chinese questions fail the existing server guard even when the answer is valid. If the evidence cannot support a substantive question of this length, return drafts:[] and a research goal instead. Do not repeat filler or invent official requirements to reach this length.']:[]),
  'Editorial kind MUST be one of home|service|packages|guide|comparison|trust|technical_seo|internal_link. NEVER use page or article.',
  'FINAL ENUM VALIDATION: editorial_actions[*].kind MUST be exactly a single string in editorial_kind_contract.allowed_values. Never output page, article, blog, faq, a translated kind, a pipe-separated list, or an invented kind. If unsure, OMIT that optional action and return editorial_actions:[]; do not guess a type or invent copy, routes or evidence.',
  'Editorial target MUST be an existing service slug for service, / for home/trust, /packages for packages, OR a NEW valid lowercase English hyphenated slug identical to slug for guide/comparison. Technical targets must be an existing live / route. Never use Arabic words, investor-hub IDs, page labels, or arbitrary evidence IDs as targets.',
  'GUIDE/COMPARISON SLUG FINAL CHECK (invalid_guide_slug): for kind guide or comparison, target and slug are BOTH required, must be exactly equal strings, length 1..90, and match ^[a-z0-9]+(?:-[a-z0-9]+)*$ (ASCII lowercase English letters, digits and single hyphens only). No /insights/ prefix, spaces, underscores, Arabic/Chinese characters, uppercase letters, URLs or trailing hyphens. If unable to provide an evidence-grounded valid pair, OMIT the optional editorial action entirely; never invent a target to satisfy the validator.',
  'topic_node_id, when supplied, MUST be an actual node_id from live_site_routes. Never use a research evidence ID as topic_node_id. If unsure about target, kind, route or content, return editorial_actions:[] instead of a guessed proposal.',
  'Each proposed editorial action must include lang, allowed kind, valid target, title, original complete summary (30-360 chars), full body (at least 100 chars, zh at least 80), risk_level high, and evidence_ids from actual research_evidence. Use plain text without HTML tags or internal writing instructions.',
  "For visitor-facing home, service, packages, guide, comparison and trust actions, write FINAL publication-ready copy directly addressing the investor in the requested language. Title, summary, headings, body and link anchors must contain only visitor-facing information, never editorial proposals, instructions to edit the website, layout or H1 preservation notes, internal policies, or review-before-publication notes. Keep research and implementation instructions outside public copy. Verify regulated claims against official evidence; if unsupported, omit the claim or the entire action. Apply this rule to Arabic, English and Simplified Chinese and to every repair. Do not invent sources.",
  'FINAL TEXT VALIDATION: each editorial_actions item must obey editorial_text_contract measured after trim: title >= title_min, summary between summary_min and summary_max, body between body_min and body_max. Never use short notes, filler, padding, or invented claims. If the provided evidence cannot support a complete factual action, omit it.',
  'FINAL TECHNICAL ROUTE VALIDATION: technical_seo and internal_link actions must choose an exact target from technical_target_contract.allowed_values (existing live routes accepted by the guard). If no target applies, omit the optional action rather than invent a path.',
  'Any sections must contain substantive h2/body and complete h3/body text rather than plans or placeholders. Omit the optional editorial action entirely when content cannot be made valid and factual.'
 ];
 const sources=evidence.map(e=>({
  id:asText(e.id,100),language:asText(e.language,12),kind:asText(e.type,40),
  source:asText(e.source,60),title:asText(e.title||e.name||e.query,160),
  url:asText(e.url,330),summary:asText(e.snippet||e.description||e.content||e.text,290)
 }));
 if(repair)rules.push('This is a single validation repair. Output replacements only for the listed rejected FAQ/editorial slots, in listed order. Leave opportunities, goals and unrelated arrays empty. Do not repeat accepted work or invent copy, routes or sources. If a replacement is not justified by the same evidence, omit it.');
 const encode=n=>JSON.stringify({language:lang,instructions:rules,
  editorial_kind_contract:{allowed_values:EDITORIAL_KINDS,optional:true,on_invalid:'omit_action_not_relabel'},
  editorial_text_contract:{title_min:EDITORIAL_TEXT_MINIMA.title[lang],title_max:170,summary_min:EDITORIAL_TEXT_MINIMA.summary,summary_max:360,body_min:EDITORIAL_TEXT_MINIMA.body[lang],body_max:10000,on_invalid:'omit_action_without_padding'},
  technical_target_contract:{allowed_values:technicalTargets,on_invalid:'omit_action_not_infer_route'},
  live_site_routes:liveRoutes,
  ...(repair?{validation_errors:repair}:{}),
  research_evidence:sources.slice(0,n),
  output_shape:{opportunities:[],goals:[],drafts:[],editorial_actions:[]}});
 for(let n=sources.length;n>=1;n--){
  const prompt=encode(n);
  if(prompt.length<=15500)return prompt;
 }
 throw Error('Evidence metadata exceeds quota-conscious prompt budget');
}
module.exports={LANGS,SCHEMA_TYPES,supportedSchemaSuggestions,chooseResearchEvidence,selectLocaleEvidence,promptForLocale,promptForDirectLocale};
