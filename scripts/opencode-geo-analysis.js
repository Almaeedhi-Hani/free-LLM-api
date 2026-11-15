#!/usr/bin/env node
// OpenCode GEO Analysis — Full 6-stage pipeline.
// No FreeLLMAPI. No paid services. 0 cost.
// Results saved to Supabase (if configured) or local file.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- Config ---
const OC_BIN = process.env.OPENCODE_BIN ||
  (process.platform === 'win32'
    ? 'C:\\Users\\hp\\AppData\\Local\\Programs\\ai.opencode.desktop\\resources\\opencode-cli.exe'
    : (process.env.HOME + '/.opencode/bin/opencode'));
const MODEL = process.env.OPENCODE_MODEL || 'opencode/beam-free';
const FALLBACK_MODELS = Array.from(new Set([MODEL,
  'opencode/beam-free',
  'opencode/deepseek-v4.1-flash-free',
  'opencode/flint-40b-free',
  'opencode/glm-5.3-flash-free',
  'openrouter/google/gemma-4-26b-a4b-it:free',
]));
const MAX_RETRIES = 3;
// Each weekly run performs at most three successful locale analyses (one per AR/EN/ZH),
// with bounded free-model fallbacks. OpenCode bills per model policy; no paid tier assumed.
const RETRY_DELAY_MS = 8000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- OpenCode runner ---
function runOpenCode(prompt, model) {
  const chosenModel = model || MODEL;
  // Use a clean temp directory so OpenCode cannot read project files
  const workDir = path.join(process.cwd(), '.opencode-work');
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });
  const tmpFile = path.join(workDir, 'prompt.txt');
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  const cmd = `"${OC_BIN}" run --standalone --archived --format json --model ${chosenModel} --file prompt.txt "Follow the instructions in the attached file. Output JSON only, no markdown."`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Sanitized env: exclude secrets from OpenCode process
      const safeEnv = { ...process.env };
      delete safeEnv.SUPABASE_SERVICE_ROLE_KEY;
      delete safeEnv.SUPABASE_URL;
      delete safeEnv.ADMIN_TOKEN;
      delete safeEnv.CRON_SECRET;
      delete safeEnv.GEO_API_KEY;
      delete safeEnv.EXA_API_KEY;
      delete safeEnv.TAVILY_API_KEY;
      delete safeEnv.PARALLEL_API_KEY;
      delete safeEnv.FIRECRAWL_API_KEY;
      const output = execSync(cmd, {
        timeout: 180000,
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
      const is429 = stderr.includes('429') || stderr.includes('rate limit') || stderr.includes('quota');
      if (is429) {
        console.log(`[OpenCode] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Waiting ${RETRY_DELAY_MS}ms...`);
        const start = Date.now();
        while (Date.now() - start < RETRY_DELAY_MS) {}
        continue;
      }
      // Try next fallback model
      if (attempt === MAX_RETRIES - 1) {
        return { error: e.message, stderr: stderr.substring(0, 500) };
      }
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

async function stageDiscovery() {
  logStage('DISCOVERY', 'Collecting sourced market evidence (Google Suggest + RSS)...');
  const { collect } = require('./geo-discovery-sources.cjs');
  const result = await collect();
  const results = result.competitors;
  const sources = [...new Set(result.diagnostics.filter(d => d.count > 0).map(d => d.source))];
  stageResults.discovery = {
    count: results.length, results, sources,
    suggestions: result.suggestions,
    diagnostics: result.diagnostics,
    note: 'Google Suggest provides keyword ideas, not search ranking. Competitor links are candidates, not verified rankings.'
  };
  logStage('DISCOVERY', 'Market sources: ' + JSON.stringify({
    candidates: results.length, keywords: result.suggestions.length,
    sources, status: result.status
  }));
  return { records_processed: results.length, status: result.status };
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
    const prompt=promptForLocale(lang,sample);
    let response=null;
    // Use configured free model first. The fallback list contains free-tier models only.
    for(const model of FALLBACK_MODELS){
      calls++;
      const trial=runOpenCode(prompt,model);
      if(trial.data){response=trial;break}
      logStage('GEO_ANALYSIS',lang+' free model unavailable: '+model+' '+String(trial.error||'unparseable JSON').slice(0,110));
    }
    if(!response){result.languages[lang]={status:'model_unavailable',evidence_sampled:sample.length};failed++;continue}
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
  try {
    const res=await fetch(base.replace(/\/$/,'')+'/api/geo/results',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-geo-api-key':key},
      body:JSON.stringify({[stage]:items}),
      signal:AbortSignal.timeout(15000)
    });
    const payload=await res.json();
    const count=payload?.saved?.[stage] ?? 0;
    if(!res.ok || !payload?.ok || count!==items.length){
      return {status:'partial',saved:count,error:'Remote GEO persistence rejected or partially saved: '+JSON.stringify(payload?.errors || payload?.error || res.status).slice(0,300)};
    }
    return {status:'success',saved:count};
  }catch(e){return {status:'partial',saved:0,error:'GEO API persistence unavailable: '+(e?.message||String(e))}}
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
 const items=stageResults.geo_analysis?.opportunities||[];
 const saved=await saveGEOStage('opportunities',items);
 stageResults.opportunities={count:items.length,items,saved_to_api:saved.status==='success',persisted:saved.saved,error:saved.error||null};
 console.log('[OPPORTUNITIES] Generated',items.length,'persisted',saved.saved,saved.status);
 return {records_processed:saved.saved,status:saved.status,error:saved.error};
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
  return {records_processed:0,status:'success',note:'No editorial proposals generated'};
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
  return {id,kind:item.kind,lang:item.lang,target:item.target,slug:item.slug,related_service:item.related_service,topic_node_id:item.topic_node_id,primary_keyword:item.primary_keyword,secondary_keywords:item.secondary_keywords,h1_suggestion:item.h1_suggestion,sections:item.sections,internal_links:item.internal_links,schema_suggestions:item.schema_suggestions,title:item.title,summary:item.summary,body:item.body,risk_level:item.risk_level==='low'||item.risk_level==='medium'?'high':item.risk_level,status:'pending',createdAt:new Date().toISOString(),evidence_ids:ids,evidence_refs:refs};
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
  console.log('=== OpenCode Standalone Test ===');
  console.log('Model:', MODEL);
  console.log('Binary:', OC_BIN);
  const result = runOpenCode('Read the attached file and respond with JSON only.', null);
  // Actually test with a simple prompt via file
  const tmpFile = path.join(process.cwd(), '.opencode-test.txt');
  fs.writeFileSync(tmpFile, 'Return JSON: {"status":"ok","model":"test","standalone":true}', 'utf-8');
  const cmd = `"${OC_BIN}" run --standalone --archived --format json --model ${MODEL} --file ${tmpFile} "Respond with JSON only."`;
  try {
    const output = execSync(cmd, { timeout: 120000, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    console.log('Raw output length:', output.length);
    const lines = output.trim().split('\n');
    let text = '';
    for (const l of lines) { try { const e = JSON.parse(l); if (e.type === 'text') text += e.part.text; } catch {} }
    console.log('Extracted text:', text.substring(0, 200));
    console.log('✅ OpenCode standalone works');
  } catch (e) {
    console.error('❌ Test failed:', e.message);
    process.exit(1);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (e) {}
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