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
const FALLBACK_MODELS = [
  'opencode/beam-free',
  'opencode/deepseek-v4.1-flash-free',
  'opencode/flint-40b-free',
  'opencode/glm-5.3-flash-free',
  'openrouter/google/gemma-4-26b-a4b-it:free',
];
const MAX_RETRIES = 3;
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

  // Fallback: use discovery results as evidence if no DB/local data
  if (evidenceItems.length === 0 && stageResults.discovery?.results?.length > 0) {
    for (const r of stageResults.discovery.results) {
      evidenceItems.push({
        id: `disc_${evidenceItems.length}`,
        type: 'discovery',
        source: r.source || 'search',
        name: r.title,
        url: r.url,
        language: r.language || 'en',
        collected_at: r.collected_at,
      });
    }
    logStage('EVIDENCE', `Using ${evidenceItems.length} discovery results as evidence`);
  }
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
  }));
  logStage('EVIDENCE', `Built bundle: ${evidenceItems.length} items`);
  stageResults.evidence = { total: evidenceItems.length, items: evidenceItems.slice(0, 30) };
  return { records_processed: evidenceItems.length, status: evidenceItems.length > 0 ? 'success' : 'partial' };
}

async function stageGeoAnalysis() {
  logStage('GEO_ANALYSIS', 'Running LLM analysis via OpenCode...');
  const evidenceItems = stageResults.evidence?.items || [];
  if (evidenceItems.length === 0) {
    return { records_processed: 0, status: 'partial', error: 'No evidence available' };
  }

  // Batch: max 8 items per LLM call to keep prompt manageable
  const batch = evidenceItems.slice(0, 8);
  const prompt = `You are a GEO (Generative Engine Optimization) intelligence analyst.

Analyze the following evidence items and return a JSON object with:
{
  "opportunities": [{"title": "...", "type": "gap|content|keyword", "score": 0-100, "evidence_ids": ["..."], "description": "..."}],
  "goals": [{"title": "...", "priority": "high|medium|low", "related_opportunity": "..."}],
  "drafts": [{"q": "question", "a": "answer", "evidence_ids": ["..."], "risk_level": "low|medium|high"}]
}

Evidence items:
${JSON.stringify(batch, null, 2)}

Rules:
- Only use evidence provided. No fabricated claims.
- Support Arabic, English, Chinese.
- Score opportunities 0-100 based on evidence strength.
- Classify draft risk: high for legal/regulatory/financial content.
- Return ONLY valid JSON, no markdown.`;

  // Pass full prompt to runOpenCode (it writes to work dir)
  // Try models in order
  let result = null;
  for (const model of FALLBACK_MODELS) {
    result = runOpenCode(prompt, model);
    if (result.data) break;
    if (result.error && result.error.includes('429')) continue;
    // If other error, try next model
  }

  if (!result || result.error) {
    logStage('GEO_ANALYSIS', `LLM failed: ${result?.error || 'unknown'}`);
    stageResults.geo_analysis = { error: result?.error, blocked: true };
    return { records_processed: 0, status: 'blocked', error_code: 'LLM_ERROR', safe_error_message: result?.error };
  }

  const data = result.data || {};
  logStage('GEO_ANALYSIS', `Analysis complete: ${data.opportunities?.length || 0} opportunities, ${data.goals?.length || 0} goals, ${data.drafts?.length || 0} drafts`);
  stageResults.geo_analysis = {
    opportunities: data.opportunities || [],
    goals: data.goals || [],
    drafts: data.drafts || [],
    model: result.model,
    tokens_used: 0,
  };
  return {
    records_processed: (data.opportunities?.length || 0) + (data.goals?.length || 0) + (data.drafts?.length || 0),
    status: 'success',
  };
}

async function stageOpportunities() {
  logStage('OPPORTUNITIES', 'Persisting opportunities...');
  const opps = stageResults.geo_analysis?.opportunities || [];
  logStage('OPPORTUNITIES', `Saving ${opps.length} opportunities`);
  stageResults.opportunities = { count: opps.length, items: opps };
  // Save via GEO API (limited-scope) if configured
  const GEO_API_URL2 = process.env.GEO_API_URL || process.env.SITE_URL;
  const GEO_API_KEY2 = process.env.GEO_API_KEY;
  if (GEO_API_URL2 && GEO_API_KEY2 && opps.length > 0) {
    try {
      const res = await fetch(`${GEO_API_URL2}/api/geo/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-geo-api-key': GEO_API_KEY2 },
        body: JSON.stringify({ opportunities: opps, goals: [], drafts: [] }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        logStage('OPPORTUNITIES', `Saved via GEO API: ${JSON.stringify(data.saved?.opportunities?.length || 0)} opportunities`);
      } else {
        logStage('OPPORTUNITIES', `GEO API save failed: ${res.status} (will save locally)`);
      }
    } catch (e) {
      logStage('OPPORTUNITIES', `GEO API save failed: ${e.message} (will save locally)`);
    }
  }
  // Always save to local artifact for verification
  stageResults.opportunities = { count: opps.length, items: opps, saved_to_api: false };
  return { records_processed: opps.length, status: 'success' };
}

async function stageGoals() {
  logStage('GOALS', 'Persisting goals...');
  const goals = stageResults.geo_analysis?.goals || [];
  logStage('GOALS', `Saving ${goals.length} goals`);
  stageResults.goals = { count: goals.length, items: goals };
  const GEO_API_URL3 = process.env.GEO_API_URL || process.env.SITE_URL;
  const GEO_API_KEY3 = process.env.GEO_API_KEY;
  if (GEO_API_URL3 && GEO_API_KEY3 && goals.length > 0) {
    try {
      const res = await fetch(`${GEO_API_URL3}/api/geo/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-geo-api-key': GEO_API_KEY3 },
        body: JSON.stringify({ opportunities: [], goals: goals, drafts: [] }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) logStage('GOALS', `Saved via GEO API`);
      else logStage('GOALS', `GEO API save failed: ${res.status} (will save locally)`);
    } catch (e) {
      logStage('GOALS', `GEO API save failed: ${e.message} (will save locally)`);
    }
  }
  stageResults.goals = { count: goals.length, items: goals, saved_to_api: false };
  return { records_processed: goals.length, status: 'success' };
}

async function stageDrafts() {
  logStage('DRAFTS', 'Persisting drafts (pending_review)...');
  const drafts = stageResults.geo_analysis?.drafts || [];
  // Classify risk
  for (const d of drafts) {
    if (!d.risk_level) {
      const text = (d.q + ' ' + d.a).toLowerCase();
      if (text.includes('legal') || text.includes('regulatory') || text.includes('financial') || text.includes('MISA') || text.includes('cost')) {
        d.risk_level = 'high';
      } else if (text.includes('pricing') || text.includes('fee')) {
        d.risk_level = 'medium';
      } else {
        d.risk_level = 'low';
      }
    }
  }
  logStage('DRAFTS', `Saving ${drafts.length} drafts (${drafts.filter(d => d.risk_level === 'high').length} high risk)`);
  stageResults.drafts = { count: drafts.length, items: drafts };
  const GEO_API_URL4 = process.env.GEO_API_URL || process.env.SITE_URL;
  const GEO_API_KEY4 = process.env.GEO_API_KEY;
  if (GEO_API_URL4 && GEO_API_KEY4 && drafts.length > 0) {
    try {
      const res = await fetch(`${GEO_API_URL4}/api/geo/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-geo-api-key': GEO_API_KEY4 },
        body: JSON.stringify({ opportunities: [], goals: [], drafts: drafts }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) logStage('DRAFTS', `Saved via GEO API`);
      else logStage('DRAFTS', `GEO API save failed: ${res.status} (will save locally)`);
    } catch (e) {
      logStage('DRAFTS', `GEO API save failed: ${e.message} (will save locally)`);
    }
  }
  stageResults.drafts = { count: drafts.length, items: drafts, saved_to_api: false };
  return { records_processed: drafts.length, status: 'success' };
}

// --- Main pipeline ---
async function runFullPipeline() {
  console.log('=== GEO Intelligence Full Pipeline (OpenCode) ===');
  console.log('Model:', MODEL);
  console.log('Supabase:', SUPABASE_URL ? 'configured' : 'not configured (local mode)');
  console.log('Timestamp:', new Date().toISOString());

  const pipelineStart = Date.now();
  const stageOrder = ['discovery', 'evidence', 'geo_analysis', 'opportunities', 'goals', 'drafts'];
  const handlers = {
    discovery: stageDiscovery,
    evidence: stageEvidence,
    geo_analysis: stageGeoAnalysis,
    opportunities: stageOpportunities,
    goals: stageGoals,
    drafts: stageDrafts,
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
    process.exit(0);
  }).catch(e => {
    console.error('Pipeline failed:', e);
    process.exit(1);
  });
} else {
  console.log('Usage:');
  console.log('  node opencode-geo-analysis.js --test          (test OpenCode)');
  console.log('  node opencode-geo-analysis.js --full-pipeline  (run full pipeline)');
}