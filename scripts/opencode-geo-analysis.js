#!/usr/bin/env node
// OpenCode GEO Analysis — bounded multilingual research + editorial publishing proposals.
// Uses free-tier models only; rate limits and provider conditions may change.
// Results persist to the existing authenticated GEO API; generated output is not published automatically.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {supportedSchemaSuggestions}=require('./geo-opencode-planner.cjs');
const {createIsolatedGeoWorkspace}=require('./geo-opencode-runtime.cjs');

// --- Config ---
const OC_BIN = process.env.OPENCODE_BIN ||
  (process.platform === 'win32'
    ? 'C:\\Users\\hp\\AppData\\Local\\Programs\\ai.opencode.desktop\\resources\\opencode-cli.exe'
    : (process.env.HOME + '/.opencode/bin/opencode'));
const MODEL = process.env.OPENCODE_MODEL || 'opencode/beam-free';
// Explicitly allow only confirmed no-charge model IDs; free model names need not end in "-free".
// Big Pickle is temporary/free and intended for PUBLIC research inputs only (provider may retain training data).
const FREE_MODEL_ALLOWLIST=Object.freeze([
  'opencode/beam-free',
  'opencode/big-pickle',
  'opencode/glm-5.3-flash-free',
  'opencode/deepseek-v4.1-flash-free',
  'opencode/flint-40b-free',
  'openrouter/google/gemma-4-26b-a4b-it:free',
]);
const FALLBACK_MODELS=Array.from(new Set([MODEL,...FREE_MODEL_ALLOWLIST]))
  .filter(m=>FREE_MODEL_ALLOWLIST.includes(m));
const MAX_RETRIES = 2;
// Each weekly run performs three distinct language analyses, with at most 18 free-model
// attempts across those analyses. No paid-tier fallback or unverified token quota is assumed.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- OpenCode runner ---
function runOpenCode(prompt, model) {
  const chosenModel = model || MODEL;
  if (!FREE_MODEL_ALLOWLIST.includes(chosenModel) || !/^[a-z0-9/:.-]+$/i.test(chosenModel))return {error:'Only an explicitly allowlisted free-tier OpenCode model is allowed for this workflow'};
  // Each attempt receives a new workspace, session DB, and short AGENTS.md.
  // No previous OpenCode transcript or session is copied into the prompt.
  const runArgs=['run','--standalone','--archived','--format','json','--model',chosenModel,'--file','prompt.txt','Follow the instructions in the attached file. Output JSON only, no markdown.'];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const {workDir,runtimeEnv,cleanup}=createIsolatedGeoWorkspace(prompt);
    try {
      // Allow only benign process variables. No GitHub, Supabase or provider secrets,
      // user-wide model config overrides, or old session configuration reach the CLI.
      const safeEnv={};
      for(const key of ['PATH','LANG','LC_ALL','LC_CTYPE','CI','GITHUB_ACTIONS','TMPDIR','SSL_CERT_FILE','NODE_EXTRA_CA_CERTS']){
        if(process.env[key])safeEnv[key]=process.env[key];
      }
      Object.assign(safeEnv,runtimeEnv);
      const output = execFileSync(OC_BIN,runArgs, {
        timeout: 120000,
        encoding: 'utf-8',
        maxBuffer: 20 * 1024 * 1024,
        cwd: workDir,
        env: safeEnv,
      });
      // Parse JSON events
      const lines = output.trim().split('\n');
      let textContent = '';
      for (const line of lines) {
        try {
          const evt = JSON.parse(line);
          if (evt.type === 'text' && evt.part && evt.part.text) {
            textContent += evt.part.text;
          }
        } catch (_) {}
      }
      // Extract JSON from text content
      const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try { return { data: JSON.parse(jsonMatch[1]), model: chosenModel, raw: textContent }; }
        catch (e) { /* fall through */ }
      }
      const rawMatch = textContent.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        try { return { data: JSON.parse(rawMatch[0]), model: chosenModel, raw: textContent }; }
        catch (e) { /* fall through */ }
      }
      return { text: textContent, model: chosenModel };
    } catch (e) {
      const stderr = (e.stderr?.toString() || '') + (e.stdout?.toString() || '');
      const is429 = /(?:\b429\b|rate[ -]?limit|quota|resource exhausted)/i.test(stderr);
      const isTimeout = e.code === 'ETIMEDOUT' || /(?:ETIMEDOUT|timed? out|deadline exceeded)/i.test(stderr);
      // Repeating a rate-limited or timed-out request against the SAME free
      // provider wastes the bounded CI window. Move directly to the next
      // allowlisted free model; never silently classify this as success.
      if (is429 || isTimeout) {
        const reason=is429?'rate_limited':'timeout';
        console.warn('[OpenCode] '+chosenModel+' '+reason+'; skipping same-model retry');
        return {error:reason,model:chosenModel,stderr:stderr.substring(0,500)};
      }
      if (attempt === MAX_RETRIES - 1) {
        return { error: e.message, model:chosenModel, stderr: stderr.substring(0, 500) };
      }
    } finally {
      cleanup(); // remove ONLY this attempt's disposable sessions and input files
    }
  }
  return { error: 'Max retries exceeded (rate limited)' };
}

// --- Supabase helper ---
async function sbFetch(path, options) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[Supabase] ${res.status}: ${text.substring(0, 200)}`);
    return null;
  }
  return res.json();
}

// --- Stage implementations ---
const stages = [];
const stageResults = {};
let currentStage = null;

function logStage(name, msg) {
  console.log(`[${name}] ${msg}`);
}

/** Guarded, single-attempt persistence: unverified research is never a Google rank. */
async function saveGeoDiscovery(candidates,suggestions) {
  const base=process.env.GEO_API_URL||process.env.SITE_URL;
  const key=process.env.GEO_API_KEY;
  const confirmed={candidates:0,keywords:0};
  if(!base||!key)return {status:'partial',confirmed,error:'GEO discovery API not configured'};
  // The production endpoint persists every record sequentially, so a single
  // 10-candidate/21-keyword request can exceed its 30s deadline after writing.
  // Partition records into small, sequential, bounded requests; no parallel
  // writes, retries, paid calls, or changed source-of-truth API contracts.
  const KEYWORDS_PER_REQUEST=3;
  const CANDIDATES_PER_REQUEST=2;
  let keywordOffset=0,candidateOffset=0,batches=0;
  const errorResult=(message)=>({status:'partial',confirmed,batches,error:message});
  while(keywordOffset<suggestions.length||candidateOffset<candidates.length){
    const batch={
      suggestions:suggestions.slice(keywordOffset,keywordOffset+KEYWORDS_PER_REQUEST),
      candidates:candidates.slice(candidateOffset,candidateOffset+CANDIDATES_PER_REQUEST)
    };
    batches++;
    try {
      const response=await fetch(base.replace(/\/$/,'')+'/api/geo/discovery',{
        method:'POST',headers:{'Content-Type':'application/json','x-geo-api-key':key},
        body:JSON.stringify(batch),signal:AbortSignal.timeout(30000)
      });
      let payload;
      try {payload=await response.json()}
      catch{return errorResult('Invalid GEO discovery batch response (HTTP '+response.status+', batch '+batches+')')}
      const saved=payload?.confirmed;
      if(!saved||!Number.isInteger(saved.candidates)||!Number.isInteger(saved.keywords)||
         saved.candidates<0||saved.keywords<0||
         saved.candidates>batch.candidates.length||saved.keywords>batch.suggestions.length)
        return errorResult('Invalid GEO discovery confirmation for batch '+batches);
      // Count only explicit server confirmations, including on a partial 502.
      confirmed.candidates+=saved.candidates;
      confirmed.keywords+=saved.keywords;
      if(!response.ok||payload.ok!==true||
         saved.candidates!==batch.candidates.length||
         saved.keywords!==batch.suggestions.length)
        return errorResult('GEO discovery persistence partial (batch '+batches+'): '+
          JSON.stringify(payload?.errors||payload?.error||response.status).slice(0,240));
      keywordOffset+=batch.suggestions.length;
      candidateOffset+=batch.candidates.length;
    }catch(e){
      // A timeout is ambiguous: server-side writes may still complete.
      // Stop without retrying or fabricating a successful acknowledgement.
      return errorResult('GEO discovery batch '+batches+' unavailable: '+
        String(e?.message||e).slice(0,150));
    }
  }
  return {status:'success',confirmed,batches,error:null};
}
async function stageDiscovery() {
  logStage('DISCOVERY', 'Collecting sourced market evidence (Google Suggest + bounded provider search)...');
  const { collect } = require('./geo-discovery-sources.cjs');
  const result = await collect();
  const results = result.competitors;
  const sources = [...new Set(result.diagnostics.filter(d => d.count > 0).map(d => d.source))];
  // Own-site and government portals are research evidence, not competitors.
  // Store at most one page per domain/query/locale; duplicate pages may share a
  // millisecond timestamp and the existing observation key intentionally forbids that.
  const observedDomains=new Set();
  const candidates=results.filter(item=>{
    try {
      const host=new URL(item.url).hostname.toLowerCase().replace(/^www\./,'');
      if(host==='gov.sa'||host.endsWith('.gov.sa')||host==='free-llm-api-1-didl.onrender.com')return false;
      const key=item.language+'|'+item.query+'|'+host;
      if(observedDomains.has(key))return false;
      observedDomains.add(key);
      return true;
    }catch{return false}
  });
  const persistence=(candidates.length||result.suggestions.length)
    ?await saveGeoDiscovery(candidates,result.suggestions)
    :{status:'partial',confirmed:{candidates:0,keywords:0},error:'No discovery candidates to persist'};
  const suggestionsMissing=result.suggestions.length===0;
  const keywordIssue=suggestionsMissing?'No real Google Suggest keywords after bounded short-query fallbacks':null;
  const status=result.status==='blocked'?'blocked':
    result.status==='success'&&candidates.length>0&&persistence.status==='success'&&result.suggestions.length>0?'success':'partial';
  stageResults.discovery = {
    count:results.length,results,sources,suggestions:result.suggestions,
    diagnostics:result.diagnostics,
    persisted_candidates:persistence.confirmed.candidates,
    persisted_keywords:persistence.confirmed.keywords,
    persistence_status:persistence.status,
    persistence_error:persistence.error||null,
    keyword_status:suggestionsMissing?'empty':'collected',
    keyword_issue:keywordIssue,
    note:'Google Suggest provides keyword ideas, not search ranking. Competitor links are candidates, not verified rankings.'
  };
  logStage('DISCOVERY','Market sources and storage: '+JSON.stringify({
    candidates:results.length,eligible_candidates:candidates.length,keywords:result.suggestions.length,
    confirmed:persistence.confirmed,sources,discovery_status:result.status,persistence_status:persistence.status
  }));
  return {records_processed:results.length,status,error:persistence.error||keywordIssue||undefined,
    persisted_candidates:persistence.confirmed.candidates,
    persisted_keywords:persistence.confirmed.keywords};
}

async function stageEvidence() {
  logStage('EVIDENCE', 'Building evidence bundle...');
  // Read from local market-intel or Supabase
  let evidenceItems = [];
  // Try loading from local files
  const files = ['market-intel/competitors.json', 'market-intel/observations.json', 'market-intel/keywords.json'];
  for (const f of files) {
    if (fs.existsSync(f)) {
      try {
        const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
        if (Array.isArray(data)) {
          evidenceItems.push(...data.map((d, i) => ({
            id: `${f.split('/')[1]}_${i}`,
            type: f.includes('competitor') ? 'competitor' : f.includes('observation') ? 'observation' : 'keyword',
            source: 'local',
            ...d,
          })));
        }
      } catch (e) {
        logStage('EVIDENCE', `Failed to read ${f}: ${e.message}`);
      }
    }
  }

  // Fresh, read-only discovery evidence. Suggestions are search ideas, not verified
  // competitors, search-volume statistics, or citations by an AI engine.
  for (const r of (stageResults.discovery?.results || [])) {
    evidenceItems.push({
      id: `disc_${evidenceItems.length}`,
      type: 'competitor_candidate', source: r.source || 'search',
      name: r.title, url: r.url, language: r.language || 'en',
      collected_at: r.collected_at,
    });
  }
  for (const r of (stageResults.discovery?.suggestions || [])) {
    evidenceItems.push({
      id: `suggest_${evidenceItems.length}`,
      type: 'keyword_suggestion', source: r.source,
      name: r.term, language: r.language, collected_at: r.collected_at,
    });
  }
  logStage('EVIDENCE', `Added fresh discovery evidence: ${(stageResults.discovery?.results || []).length} website candidates, ${(stageResults.discovery?.suggestions || []).length} Google suggestions`);
  // Try GEO API (limited-scope, server-side) first
  const GEO_API_URL = process.env.GEO_API_URL || process.env.SITE_URL;
  const GEO_API_KEY = process.env.GEO_API_KEY;
  if (GEO_API_URL && GEO_API_KEY) {
    try {
      const res = await fetch(`${GEO_API_URL}/api/geo/data`, {
        headers: { 'x-geo-api-key': GEO_API_KEY },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.competitors) evidenceItems.push(...data.competitors.map((c, i) => ({ id: `comp_${c.id || i}`, type: 'competitor', source: 'supabase', name: c.name || c.domain, domain: c.domain, language: c.language || 'ar' })));
        if (data.observations) evidenceItems.push(...data.observations.map((o, i) => ({ id: `obs_${o.id || i}`, type: 'observation', source: 'supabase', name: o.title || o.content?.substring(0, 50), language: o.language || 'ar' })));
        if (data.keywords) evidenceItems.push(...data.keywords.map((k, i) => ({ id: `kw_${k.id || i}`, type: 'keyword', source: 'supabase', name: k.keyword || k.term, language: k.language || 'ar' })));
        logStage('EVIDENCE', `Loaded from GEO API: ${data.counts?.competitors || 0} comps, ${data.counts?.observations || 0} obs, ${data.counts?.keywords || 0} kws`);
      }
    } catch (e) {
      logStage('EVIDENCE', `GEO API fetch failed: ${e.message}`);
    }
  }

  // Try direct Supabase (if service key available, local dev only)
  if (SUPABASE_URL && SUPABASE_KEY && evidenceItems.length === 0) {
    try {
      const comps = await sbFetch('competitors?select=*');
      if (comps) evidenceItems.push(...comps.map((c, i) => ({ id: `comp_${c.id || i}`, type: 'competitor', source: 'supabase', name: c.name || c.domain, domain: c.domain, language: c.language || 'ar' })));
      const obs = await sbFetch('competitor_observations?select=*');
      if (obs) evidenceItems.push(...obs.map((o, i) => ({ id: `obs_${o.id || i}`, type: 'observation', source: 'supabase', name: o.title || o.content?.substring(0, 50), language: o.language || 'ar' })));
      const kws = await sbFetch('keywords?select=*');
      if (kws) evidenceItems.push(...kws.map((k, i) => ({ id: `kw_${k.id || i}`, type: 'keyword', source: 'supabase', name: k.keyword || k.term, language: k.language || 'ar' })));
    } catch (e) {
      logStage('EVIDENCE', `Supabase fetch failed: ${e.message}`);
    }
  }
  // Simplify evidence items for LLM prompt
  evidenceItems = evidenceItems.map((e, i) => ({
    id: e.id || `ev_${i}`,
    type: e.type || 'unknown',
    name: e.name || e.title || e.domain || e.keyword || 'unnamed',
    domain: e.domain || '',
    source: e.source || 'unknown',
    language: e.language || 'ar',
    url: e.url || null,
    observed_at: e.collected_at || e.observed_at || null,
  }));
  logStage('EVIDENCE', `Built bundle: ${evidenceItems.length} items`);
  const {chooseResearchEvidence}=require('./geo-opencode-planner.cjs');
  stageResults.evidence = { total: evidenceItems.length, items: chooseResearchEvidence(evidenceItems,60) };
  return { records_processed: evidenceItems.length, status: evidenceItems.length > 0 ? 'success' : 'partial' };
}

async function stageGeoAnalysis() {
  logStage('GEO_ANALYSIS', 'OpenCode: topic architecture, market evidence and editorial improvements in AR/EN/ZH');
  const {LANGS,selectLocaleEvidence,promptForLocale}=require('./geo-opencode-planner.cjs');
  const all=stageResults.evidence?.items||[];
  if(!all.length)return {records_processed:0,status:'partial',error:'No verified research inputs'};
  const result={opportunities:[],goals:[],drafts:[],editorial_actions:[],languages:{},models_used:[],tokens_used:null};
  let failed=0,calls=0;
  for(const lang of LANGS){
    const sample=selectLocaleEvidence(all,lang,8);
    if(!sample.length){result.languages[lang]={status:'missing_evidence'};failed++;continue}
    let response=null;
    const attempts=[];
    // If the first free model cannot complete the full evidence set, use a
    // smaller, still locale-prioritized and source-diverse brief for the next
    // free models. Do not add paid models, retries or a fourth provider call.
    // At most three allowlisted model selections per locale; all failed locales
    // remain visibly partial rather than receiving fabricated output.
    for(const [index,model] of FALLBACK_MODELS.slice(0,3).entries()){
      calls++;
      const evidence=index===0?sample:selectLocaleEvidence(all,lang,4);
      const trial=runOpenCode(promptForLocale(lang,evidence),model);
      if(trial.data){response=trial;break}
      attempts.push({model,reason:String(trial.error||'unparseable JSON').slice(0,70)});
      logStage('GEO_ANALYSIS',lang+' free model unavailable: '+model+' '+String(trial.error||'unparseable JSON').slice(0,110));
    }
    if(!response){result.languages[lang]={status:'model_unavailable',evidence_sampled:sample.length,attempts};failed++;continue}
    const data=response.data||{};
    const fields=['opportunities','goals','drafts','editorial_actions'];
    for(const field of fields){
      if(!Array.isArray(data[field]))continue;
      const filtered=field==='editorial_actions'?data[field].filter(x=>x&&x.lang===lang):data[field];
      result[field].push(...filtered.slice(0,field==='editorial_actions'?5:field==='drafts'?2:3));
    }
    result.models_used.push(response.model);
    result.languages[lang]={status:'analyzed',evidence_sampled:sample.length,model:response.model,
      generated:{opportunities:data.opportunities?.length||0,goals:data.goals?.length||0,drafts:data.drafts?.length||0,editorial_actions:data.editorial_actions?.length||0}};
  }
  // Generated claims must never be confused with independently verified outcomes.
  stageResults.geo_analysis=result;
  logStage('GEO_ANALYSIS','OpenCode calls='+calls+', languages='+JSON.stringify(result.languages)+', editorial proposals='+result.editorial_actions.length);
  const count=result.opportunities.length+result.goals.length+result.drafts.length+result.editorial_actions.length;
  return {records_processed:count,status:failed?'partial':'success',languages_analyzed:LANGS.length-failed,models_used:result.models_used,
    error:failed?(failed+' language analysis segment(s) unavailable') : undefined};
}

async function saveGEOStage(stage, items) {
  if (!items.length) return {status:'success',saved:0};
  const base = process.env.GEO_API_URL || process.env.SITE_URL;
  const key = process.env.GEO_API_KEY;
  if (!base || !key) return {status:'partial',saved:0,error:'GEO remote API not configured'};
  // Opportunities are deduplicated by (title,type); editorial items by stable ID.
  // Other stages are not safe to retry after an ambiguous network failure.
  const replaySafe = stage==='opportunities' || stage==='editorial_actions';
  const maxAttempts = replaySafe ? 3 : 1;
  let lastError='GEO endpoint unavailable';
  for (let attempt=1; attempt<=maxAttempts; attempt++) {
    try {
      const res=await fetch(base.replace(/\/$/,'')+'/api/geo/results',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-geo-api-key':key},
        body:JSON.stringify({[stage]:items}),
        signal:AbortSignal.timeout(30000)
      });
      let payload;
      try {payload=await res.json()}
      catch {return {status:'partial',saved:0,error:'Invalid GEO API response (HTTP '+res.status+')'}}
      const count=payload?.saved?.[stage] ?? 0;
      if (res.ok && payload?.ok && count===items.length) return {status:'success',saved:count};
      // Draft quality validation precedes writes: split only this definitive rejection.
      // Never retry non-deduplicated drafts after ambiguous network/storage failures.
      const draftQualityRejected=stage==='drafts' && res.status===502 && count===0 &&
        Array.isArray(payload?.errors) && payload.errors.some(msg=>
          typeof msg==='string' && msg.startsWith('drafts: GEO draft quality failed:'));
      if(draftQualityRejected && items.length>1){
        let saved=0;
        const failures=[];
        for(const item of items){
          const one=await saveGEOStage(stage,[item]);
          saved+=one.saved;
          if(one.status!=='success')failures.push(String(one.error||'rejected').slice(0,150));
        }
        return {status:saved===items.length?'success':'partial',saved,
          error:failures.length?'Rejected '+failures.length+' low-quality draft(s): '+failures.slice(0,3).join(' | '):undefined};
      }
      // An invalid model proposal should not discard every valid editorial proposal.
      // Keep the stage partial if even one item is rejected; never report a false success.
      if(stage==='editorial_actions' && res.status===422 && items.length>1) {
        let saved=0;
        const failures=[];
        for(const item of items){
          const one=await saveGEOStage(stage,[item]);
          saved+=one.saved;
          if(one.status!=='success')failures.push(String(one.error||'rejected').slice(0,150));
        }
        return {status:saved===items.length?'success':'partial',saved,
          error:failures.length?'Rejected '+failures.length+' invalid proposal(s): '+failures.slice(0,3).join(' | '):undefined};
      }
      return {status:'partial',saved:count,error:'Remote GEO persistence rejected or partially saved: '+JSON.stringify(payload?.errors || payload?.error || res.status).slice(0,300)};
    } catch(e) {
      lastError=e?.message||String(e);
      if(attempt<maxAttempts) {
        console.warn('[GEO_PERSIST] '+stage+' attempt '+attempt+' unavailable; retrying safe request: '+lastError.slice(0,130));
        await new Promise(resolve=>setTimeout(resolve,attempt*1000));
      }
    }
  }
  return {status:'partial',saved:0,error:'GEO API persistence unavailable after '+maxAttempts+' attempt(s): '+lastError};
}
async function updateGEOAgentRun(outcome) {
  const base=process.env.GEO_API_URL || process.env.SITE_URL;
  const key=process.env.GEO_API_KEY;
  if(!base||!key)return false;
  try{
    const status=Object.values(outcome.stages).every(s=>s.status==='success')?'success':'partial';
    const last_result=['discovery','evidence','geo_analysis','opportunities','goals','drafts','editorial_actions'].map(stage=>stage+':'+(outcome.stages[stage]?.status||'not_run')).join(' | ');
    const response=await fetch(base.replace(/\/$/,'')+'/api/geo/results',{
      method:'POST',headers:{'Content-Type':'application/json','x-geo-api-key':key},
      body:JSON.stringify({run_report:{run_at:outcome.pipeline_run,status,last_result}}),
      signal:AbortSignal.timeout(15000)
    });
    const json=await response.json();
    return response.ok && json?.ok===true && json.saved?.run_report===1;
  }catch(e){console.error('[GEO_STATUS] Failed to sync agent dashboard:',e?.message||e);return false}
}

async function stageOpportunities() {
 const generated=stageResults.geo_analysis?.opportunities||[];
 const {valid:items,rejected}=require('./geo-opportunity-contract.cjs').filterOpportunities(generated);
 if(rejected.length)console.warn('[OPPORTUNITIES] Rejected invalid model items:',JSON.stringify(rejected));
 const saved=await saveGEOStage('opportunities',items);
 const status=rejected.length?'partial':saved.status;
 const error=rejected.length?('Rejected '+rejected.length+' invalid opportunities'+(saved.error?'; '+saved.error:'')):(saved.error||null);
 stageResults.opportunities={count:generated.length,items,saved_to_api:status==='success',persisted:saved.saved,error};
 console.log('[OPPORTUNITIES] Generated',generated.length,'valid',items.length,'persisted',saved.saved,status);
 return {records_processed:saved.saved,status,error};
}

async function stageGoals() {
 const items=stageResults.geo_analysis?.goals||[];
 const saved=await saveGEOStage('goals',items);
 stageResults.goals={count:items.length,items,saved_to_api:saved.status==='success',persisted:saved.saved,error:saved.error||null};
 console.log('[GOALS] Generated',items.length,'persisted',saved.saved,saved.status);
 return {records_processed:saved.saved,status:saved.status,error:saved.error};
}

async function stageDrafts() {
 const items=stageResults.geo_analysis?.drafts||[];
 // Resolve LLM-generated evidence IDs ONLY against the actually collected evidence bundle.
 // These are research references, not verified Saudi authority requirements.
 const byId=new Map((stageResults.evidence?.items||[]).map(e=>[e.id,e]));
 for(const d of items){
  if(!['low','medium','high'].includes(d.risk_level))d.risk_level='high';
  const ids=[...new Set(Array.isArray(d.evidence_ids)?d.evidence_ids:[])].filter(id=>typeof id==='string').slice(0,12);
  d.evidence_refs=ids.map(id=>{
   const e=byId.get(id);
   if(!e)return null;
   const url=typeof e.url==='string'&&e.url.startsWith('https://')?e.url:undefined;
   return {id,label:String(e.name||id).slice(0,240),source:String(e.source||'unknown').slice(0,100),kind:String(e.type||'unknown').slice(0,100),...(url?{url}:{}),...(e.observed_at?{observed_at:e.observed_at}:{})};
  }).filter(Boolean);
  d.evidence_ids=d.evidence_refs.map(e=>e.id);
 }
 const saved=await saveGEOStage('drafts',items);
 stageResults.drafts={count:items.length,items,saved_to_api:saved.status==='success',persisted:saved.saved,error:saved.error||null};
 console.log('[DRAFTS] Generated',items.length,'persisted',saved.saved,saved.status);
 return {records_processed:saved.saved,status:saved.status,error:saved.error};
}

async function stageEditorialActions() {
 const items=stageResults.geo_analysis?.editorial_actions||[];
 if(!items.length){
  stageResults.editorial_actions={count:0,persisted:0,reason:'No supported cross-site proposals in this evidence batch'};
  console.log('[EDITORIAL] No evidence-backed cross-site proposals generated');
  return {records_processed:0,status:'partial',error:'No evidence-backed editorial proposals generated; inspect model output'};
 }
 const byId=new Map((stageResults.evidence?.items||[]).map(e=>[e.id,e]));
 const crypto=require('node:crypto');
 const proposed=items.slice(0,15).map((item,i)=>{
  const ids=[...new Set(Array.isArray(item.evidence_ids)?item.evidence_ids:[])].filter(id=>typeof id==='string'&&byId.has(id)).slice(0,12);
  const refs=ids.map(id=>{
   const e=byId.get(id);
   const url=typeof e.url==='string'&&e.url.startsWith('https://')?e.url:undefined;
   return {id,label:String(e.name||id).slice(0,240),source:String(e.source||'unknown').slice(0,100),kind:String(e.type||'unknown').slice(0,100),...(url?{url}:{}),...(e.observed_at?{observed_at:e.observed_at}:{})};
  });
  const id='ed-'+crypto.createHash('sha256').update([item.kind,item.lang,item.target,item.title].join('|')).digest('hex').slice(0,24);
  const schemas=supportedSchemaSuggestions(item.schema_suggestions);
  if(Array.isArray(item.schema_suggestions) && schemas.length!==item.schema_suggestions.length)
    console.warn('[EDITORIAL] Removed unsupported or duplicate schema suggestion for '+item.lang+'/'+item.kind+' (pending human review)');
  return {id,kind:item.kind,lang:item.lang,target:item.target,slug:item.slug,related_service:item.related_service,topic_node_id:item.topic_node_id,primary_keyword:item.primary_keyword,secondary_keywords:item.secondary_keywords,h1_suggestion:item.h1_suggestion,sections:item.sections,internal_links:item.internal_links,schema_suggestions:schemas,title:item.title,summary:item.summary,body:item.body,risk_level:item.risk_level==='low'||item.risk_level==='medium'?'high':item.risk_level,status:'pending',createdAt:new Date().toISOString(),evidence_ids:ids,evidence_refs:refs};
 });
 const saved=await saveGEOStage('editorial_actions',proposed);
 stageResults.editorial_actions={count:proposed.length,persisted:saved.saved,status:saved.status,error:saved.error||null};
 console.log('[EDITORIAL] Generated',proposed.length,'persisted',saved.saved,saved.status);
 return {records_processed:saved.saved,status:saved.status,error:saved.error};
}

// --- Main pipeline ---
async function runFullPipeline() {
  console.log('=== GEO Intelligence Full Pipeline (OpenCode) ===');
  console.log('Model:', MODEL);
  console.log('Supabase:', SUPABASE_URL ? 'configured' : 'not configured (local mode)');
  console.log('Timestamp:', new Date().toISOString());

  const pipelineStart = Date.now();
  const stageOrder = ['discovery', 'evidence', 'geo_analysis', 'opportunities', 'goals', 'drafts', 'editorial_actions'];
  const handlers = {
    discovery: stageDiscovery,
    evidence: stageEvidence,
    geo_analysis: stageGeoAnalysis,
    opportunities: stageOpportunities,
    goals: stageGoals,
    drafts: stageDrafts,
    editorial_actions:stageEditorialActions,
  };

  const results = {};
  for (const stageName of stageOrder) {
    console.log(`\n--- Stage: ${stageName} ---`);
    try {
      const r = await handlers[stageName]();
      results[stageName] = r;
      console.log(`[${stageName}] Result:`, JSON.stringify(r).substring(0, 200));
      if (r.status === 'blocked') {
        console.log(`[${stageName}] BLOCKED: ${r.safe_error_message}`);
        // Continue to next stages? No — break on blocked
        break;
      }
    } catch (e) {
      console.error(`[${stageName}] Exception:`, e.message);
      results[stageName] = { status: 'failed', error: e.message };
      break;
    }
  }

  const elapsed = ((Date.now() - pipelineStart) / 1000).toFixed(1);
  console.log(`\n=== Pipeline Complete (${elapsed}s) ===`);

  // Save results
  const output = {
    pipeline_run: new Date().toISOString(),
    model: MODEL,
    elapsed_seconds: parseFloat(elapsed),
    stages: results,
    summary: {
      discovery: stageResults.discovery?.count || 0,
      evidence: stageResults.evidence?.total || 0,
      opportunities: stageResults.opportunities?.count || 0,
      goals: stageResults.goals?.count || 0,
      drafts: stageResults.drafts?.count || 0,
      editorial_actions:stageResults.editorial_actions?.count || 0,
      high_risk_drafts: stageResults.drafts?.items?.filter(d => d.risk_level === 'high').length || 0,
    },
    stage_results: stageResults,
  };

  const outDir = path.join(process.cwd(), 'market-intel');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'geo-persisted-results.json');
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`Results saved to: ${outFile}`);

  // Cleanup temp files
  try { fs.rmSync(path.join(process.cwd(), '.opencode-work'), { recursive: true, force: true }); } catch (e) {}
  try { fs.unlinkSync(path.join(process.cwd(), 'market-intel', 'geo-prompt.txt')); } catch (e) {}

  output.summary.persisted_discovery_candidates=stageResults.discovery?.persisted_candidates||0;
  output.summary.persisted_discovery_keywords=stageResults.discovery?.persisted_keywords||0;
  output.summary.persisted_opportunities=stageResults.opportunities?.persisted||0;
  output.summary.persisted_goals=stageResults.goals?.persisted||0;
  output.summary.persisted_drafts=stageResults.drafts?.persisted||0;
  output.summary.persisted_editorial_actions=stageResults.editorial_actions?.persisted||0;
  output.pipeline_ok=Object.values(results).length===stageOrder.length && Object.values(results).every(s=>s.status==='success');
  output.dashboard_synced=await updateGEOAgentRun(output);
  if(!output.dashboard_synced)output.pipeline_ok=false;
  // Update the persisted workflow artifact with the verified remote outcome.
  fs.writeFileSync(outFile,JSON.stringify(output,null,2));
  return output;
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.includes('--test')) {
  console.log('=== Isolated OpenCode Smoke Test ===');
  console.log('Model:', MODEL);
  // Exercise the SAME fresh-session, secret-free pathway as production.
  const result = runOpenCode('Return ONLY valid JSON with status="ok" and no extra text.', MODEL);
  if (result?.data?.status === 'ok') console.log('OpenCode isolated smoke test succeeded');
  else {
    console.error('OpenCode isolated smoke test failed: '+String(result.error||'unexpected output').slice(0,180));
    process.exitCode=1;
  }
} else if (args.includes('--full-pipeline')) {
  runFullPipeline().then(r => {
    console.log('\nPipeline summary:', JSON.stringify(r.summary));
    process.exit(r.pipeline_ok ? 0 : 1);
  }).catch(e => {
    console.error('Pipeline failed:', e);
    process.exit(1);
  });
} else {
  console.log('Usage:');
  console.log('  node opencode-geo-analysis.js --test          (test OpenCode)');
  console.log('  node opencode-geo-analysis.js --full-pipeline  (run full pipeline)');
}