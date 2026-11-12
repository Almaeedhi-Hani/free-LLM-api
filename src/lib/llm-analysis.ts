import { FLAGS, BUDGET } from './feature-flags';

export interface EvidenceItem {
  id: string;
  type: 'competitor' | 'keyword' | 'observation';
  source: string;
  domain?: string;
  term?: string;
  language?: string;
  observed_at?: string;
}

export interface LlmOpportunity {
  title: string;
  type: 'content_gap' | 'keyword_gap';
  evidence_ids: string[];
  score: number;
  rationale: string;
}

export interface LlmGoal {
  title: string;
  opportunity_index: number;
  success_metrics: { metric: string; target: string; measurement: string }[];
  confidence: 'high' | 'medium' | 'low';
}

export interface LlmDraft {
  q: string;
  a: string;
  risk_level: 'low' | 'high';
  evidence_ids: string[];
}

export interface LlmAnalysisResult {
  opportunities: LlmOpportunity[];
  goals: LlmGoal[];
  drafts: LlmDraft[];
  tokens_used: number;
  model: string;
  raw?: string;
  error?: string;
}

const LEGAL_PATTERN = /MISA|SAMA|CMA|KYC|residency|license|fees?|cost|price|ownership|SAGIA/i;

export function isHighRisk(text: string): boolean {
  return LEGAL_PATTERN.test(text);
}

function buildPrompt(evidence: EvidenceItem[]): string {
  const bundle = JSON.stringify(evidence, null, 2);
  return `You are a GEO (Generative Engine Optimization) analyst. You are given a bundle of EVIDENCE (competitors, keywords, observations). 

STRICT RULES:
1. You may ONLY reference competitors/domains/keywords that appear in the evidence bundle.
2. Every opportunity, goal, and draft MUST include evidence_ids citing real evidence items.
3. Do NOT fabricate search volumes, ranks, prices, legal claims, or competitor data.
4. Do NOT invent competitors not present in the evidence.
5. Legal/regulatory/pricing content must be marked risk_level="high".
6. Output ONLY valid JSON matching this schema:
{
  "opportunities": [{"title":"","type":"content_gap|keyword_gap","evidence_ids":[],"score":0-100,"rationale":""}],
  "goals": [{"title":"","opportunity_index":0,"success_metrics":[{"metric":"","target":"","measurement":""}],"confidence":"high|medium|low"}],
  "drafts": [{"q":"","a":"","risk_level":"low|high","evidence_ids":[]}]
}

EVIDENCE BUNDLE:
${bundle}`;
}

async function callOpenAI(prompt: string): Promise<{ text: string; tokens: number } | { error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: 'OPENAI_API_KEY not configured' };
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return { error: `OpenAI HTTP ${res.status}` };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const tokens = data?.usage?.total_tokens || 0;
    return { text, tokens };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function analyzeEvidence(evidence: EvidenceItem[]): Promise<LlmAnalysisResult> {
  if (!FLAGS.ENABLE_LLM_ANALYSIS) {
    return { opportunities: [], goals: [], drafts: [], tokens_used: 0, model: 'disabled', error: 'ENABLE_LLM_ANALYSIS is false' };
  }
  if (evidence.length === 0) {
    return { opportunities: [], goals: [], drafts: [], tokens_used: 0, model: 'none', error: 'empty evidence' };
  }

  const prompt = buildPrompt(evidence);
  let call: { text: string; tokens: number } | { error: string };
  // Fail-closed: never auto-fallback to paid OpenAI. Only FreeLLMAPI when enabled.
  if (process.env.FREELLMAPI_ENABLED === 'true') {
    const { freellmChat } = await import('./freellmapi-adapter');
    const r = await freellmChat([{ role: 'user', content: prompt }]);
    if ('error' in r) call = { error: r.error };
    else call = { text: r.text, tokens: r.tokens };
  } else {
    call = { error: 'No free LLM provider enabled (FREELLMAPI_ENABLED=false). Paid providers disabled by default.' };
  }
  if ('error' in call) {
    return { opportunities: [], goals: [], drafts: [], tokens_used: 0, model: 'gpt-4o', error: call.error };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(call.text);
  } catch {
    return { opportunities: [], goals: [], drafts: [], tokens_used: call.tokens, model: 'gpt-4o', raw: call.text, error: 'invalid JSON from LLM' };
  }

  // Verification layer
  const evidenceIds = new Set(evidence.map((e) => e.id));
  const allowedDomains = new Set(evidence.map((e) => e.domain).filter(Boolean));
  const domainRegex = /([a-z0-9-]+\.[a-z]{2,})/gi;
  const verifiedOpps: LlmOpportunity[] = [];
  for (const o of (parsed.opportunities || [])) {
    if (!Array.isArray(o.evidence_ids) || o.evidence_ids.length === 0) continue;
    if (!o.evidence_ids.every((id: string) => evidenceIds.has(id))) continue; // reject orphan claims
    if (typeof o.title !== 'string' || !o.title.trim()) continue;
    // claim consistency: no domain mentions outside evidence
    const text = `${o.title} ${o.rationale || ''}`;
    const mentioned = text.match(domainRegex) || [];
    if (mentioned.some((d) => !allowedDomains.has(d.toLowerCase()))) continue;
    verifiedOpps.push({
      title: o.title.trim(),
      type: o.type === 'content_gap' ? 'content_gap' : 'keyword_gap',
      evidence_ids: o.evidence_ids,
      score: Math.max(0, Math.min(100, Number(o.score) || 0)),
      rationale: String(o.rationale || ''),
    });
  }

  const verifiedGoals: LlmGoal[] = [];
  for (const g of (parsed.goals || [])) {
    const idx = Number(g.opportunity_index);
    if (idx < 0 || idx >= verifiedOpps.length) continue;
    if (typeof g.title !== 'string' || !g.title.trim()) continue;
    verifiedGoals.push({
      title: g.title.trim(),
      opportunity_index: idx,
      success_metrics: Array.isArray(g.success_metrics) ? g.success_metrics : [],
      confidence: ['high', 'medium', 'low'].includes(g.confidence) ? g.confidence : 'low',
    });
  }

  const verifiedDrafts: LlmDraft[] = [];
  for (const d of (parsed.drafts || [])) {
    if (!Array.isArray(d.evidence_ids) || d.evidence_ids.length === 0) continue;
    if (!d.evidence_ids.every((id: string) => evidenceIds.has(id))) continue;
    if (typeof d.q !== 'string' || typeof d.a !== 'string') continue;
    verifiedDrafts.push({
      q: d.q,
      a: d.a,
      risk_level: d.risk_level === 'high' || isHighRisk(d.q + ' ' + d.a) ? 'high' : 'low',
      evidence_ids: d.evidence_ids,
    });
  }

  // Anti-fabrication: ensure any domain mentioned in titles/rationale exists in evidence
  // Claim consistency check: reject opportunities whose title/rationale mention
  // a domain not present in the evidence bundle (anti-fabrication).

  return {
    opportunities: verifiedOpps,
    goals: verifiedGoals,
    drafts: verifiedDrafts,
    tokens_used: call.tokens,
    model: 'gpt-4o',
    raw: call.text,
  };
}
