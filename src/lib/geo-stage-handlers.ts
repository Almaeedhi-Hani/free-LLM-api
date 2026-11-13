// Real GEO Stage Handlers — Replace stubs with actual implementations.
// Each stage calls existing functions and persists results.

import { registerStage } from './geo-job-worker';
import { runDiscovery } from './market-intelligence';
import { buildEvidenceBundle } from './evidence-bundle';
import { analyzeEvidence } from './llm-analysis';
import { scoreOpportunity, priorityFromScore } from './geo-scoring';
import {
  saveOpportunities,
  saveGoals,
  saveDrafts,
  transformEvidenceIds,
  extractRelatedFromEvidence,
} from './geo-result-persistence';
import { getSettings } from './geo-settings';

// Track whether handlers are registered
let handlersRegistered = false;

export function registerRealStageHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;

  // Stage 1: Discovery (real)
  registerStage('discovery', async (ctx: any) => {
    try {
      const result = await runDiscovery({ triggeredBy: ctx.triggerType as any });
      return {
        records_processed: (result as any)?.competitors_discovered || 0,
        checkpoint_data: { discovery_result: result },
        next_stage: null,
        status: (result as any)?.success ? 'success' : 'failed',
        error_code: (result as any)?.success ? undefined : 'DISCOVERY_FAILED',
        safe_error_message: (result as any)?.success ? undefined : 'Discovery failed',
      };
    } catch (e) {
      return {
        records_processed: 0,
        checkpoint_data: {},
        next_stage: null,
        status: 'failed',
        error_code: 'DISCOVERY_EXCEPTION',
        safe_error_message: e instanceof Error ? e.message : String(e),
      };
    }
  });

  // Stage 2: Evidence Update (real — refresh data quality check)
  registerStage('evidence_update', async (ctx: any) => {
    const bundle = await buildEvidenceBundle();
    const items = bundle.items;
    // Quality check: verify evidence has required fields
    const validItems = items.filter((e) => e.id && e.type && e.source);
    const invalidCount = items.length - validItems.length;
    return {
      records_processed: validItems.length,
      checkpoint_data: {
        evidence_bundle: { total: items.length, valid: validItems.length, invalid: invalidCount },
        evidence_items: validItems,
      },
      next_stage: null,
      status: invalidCount > items.length * 0.5 ? 'partial' : 'success',
      safe_error_message: invalidCount > 0 ? `${invalidCount} invalid evidence items` : undefined,
    };
  });

  // Stage 3: GEO Analysis (real — uses FreeLLMAPI)
  registerStage('geo_analysis', async (ctx: any) => {
    const base = process.env.FREELLMAPI_BASE_URL;
    const key = process.env.FREELLMAPI_API_KEY;
    // Re-read job to get latest checkpoint
    const { getJob } = await import('./geo-job-store');
    const freshJob = await getJob(ctx.jobId);
    const checkpoint = freshJob?.checkpoint || ctx.checkpoint;
    ctx.checkpoint = checkpoint;
    console.log('[geo_analysis] base:', base, 'key:', key?.substring(0, 10));
    if (!base || !key) {
      return {
        records_processed: 0,
        checkpoint_data: {},
        next_stage: null,
        status: 'blocked',
        error_code: 'LLM_UNAVAILABLE',
        safe_error_message: 'FREELLMAPI_BASE_URL or FREELLMAPI_API_KEY not configured — LLM analysis blocked',
      };
    }

    // Get evidence from previous stage checkpoint (reuse checkpoint from above)
    let evidenceItems = (checkpoint?.stage_data?.evidence_update as any)?.evidence_items || [];
    if (evidenceItems.length === 0) {
      // Build fresh bundle
      const bundle = await buildEvidenceBundle();
      evidenceItems = bundle.items;
    }

    // Sample to keep prompt manageable (max 5 items)
    console.log('[geo_analysis] Input items:', evidenceItems.length);
    if (evidenceItems.length > 5) {
      const competitors = evidenceItems.filter((e: any) => e.type === 'competitor').slice(0, 2);
      const observations = evidenceItems.filter((e: any) => e.type === 'observation').slice(0, 2);
      const keywords = evidenceItems.filter((e: any) => e.type === 'keyword').slice(0, 1);
      evidenceItems = [...competitors, ...observations, ...keywords];
    }
    console.log('[geo_analysis] Sampled items:', evidenceItems.length);

    if (evidenceItems.length === 0) {
      return {
        records_processed: 0,
        checkpoint_data: {},
        next_stage: null,
        status: 'partial',
        safe_error_message: 'No evidence available for analysis',
      };
    }

    const llmResult = await analyzeEvidence(evidenceItems);
    if (llmResult.error) {
      return {
        records_processed: 0,
        checkpoint_data: { llm_error: llmResult.error },
        next_stage: null,
        status: 'blocked',
        error_code: 'LLM_ERROR',
        safe_error_message: `LLM analysis failed: ${llmResult.error}`,
      };
    }

    return {
      records_processed: (llmResult.opportunities?.length || 0) + (llmResult.goals?.length || 0) + (llmResult.drafts?.length || 0),
      checkpoint_data: {
        llm_result: llmResult,
        opportunities: llmResult.opportunities || [],
        goals: llmResult.goals || [],
        drafts: llmResult.drafts || [],
        tokens_used: llmResult.tokens_used,
        model: llmResult.model,
      },
      next_stage: null,
      status: 'success',
    };
  });

  // Stage 4: Opportunities (real — transform + persist)
  registerStage('opportunities', async (ctx: any) => {
    const { getJob } = await import('./geo-job-store');
    const freshJob = await getJob(ctx.jobId);
    const checkpoint = freshJob?.checkpoint || ctx.checkpoint;
    const geoData = checkpoint?.stage_data?.geo_analysis as any;
    const llmOpportunities = geoData?.opportunities || [];
    const evidenceItems = (checkpoint?.stage_data?.evidence_update as any)?.evidence_items || [];

    // Build evidence map
    const evidenceMap = new Map<string, any>();
    for (const item of evidenceItems) {
      evidenceMap.set(item.id, item);
    }

    // Score each opportunity transparently
    const scoringBreakdowns = new Map<string, Record<string, number>>();
    const dataGapsMap = new Map<string, string[]>();

    for (const opp of llmOpportunities) {
      const langs = Array.from(new Set(opp.evidence_ids.map((id: string) => String(evidenceMap.get(id)?.language || '')).filter(Boolean))) as string[];
      const sources = Array.from(new Set(opp.evidence_ids.map((id: string) => String(evidenceMap.get(id)?.source || '')).filter(Boolean))) as string[];
      const compCount = Array.from(new Set(opp.evidence_ids.map((id: string) => String(evidenceMap.get(id)?.domain || '')).filter(Boolean))).length;

      const breakdown = scoreOpportunity({
        evidence_count: opp.evidence_ids.length,
        evidence_sources: sources,
        language_coverage: langs,
        competitor_coverage: compCount,
        has_search_volume: false, // no volume data
        has_official_sources: sources.includes('official'),
        confidence: opp.score >= 70 ? 'high' : opp.score >= 50 ? 'medium' : 'low',
        type: opp.type,
      });

      scoringBreakdowns.set(opp.title, breakdown as unknown as Record<string, number>);
      dataGapsMap.set(opp.title, breakdown.data_gaps);

      // Override LLM score with transparent score
      opp.score = breakdown.total;
    }

    const sourceRunId = null; // Will be set by job runner
    const saved = saveOpportunities(llmOpportunities, evidenceMap, sourceRunId, scoringBreakdowns, dataGapsMap);

    return {
      records_processed: saved.length,
      checkpoint_data: { opportunities_saved: saved.length, opportunities: saved },
      next_stage: null,
      status: 'success',
    };
  });

  // Stage 5: Goals (real — link to opportunity_id)
  registerStage('goals', async (ctx: any) => {
    const { getJob } = await import('./geo-job-store');
    const freshJob = await getJob(ctx.jobId);
    const checkpoint = freshJob?.checkpoint || ctx.checkpoint;
    const geoData = checkpoint?.stage_data?.geo_analysis as any;
    const llmGoals = geoData?.goals || [];
    const oppsData = (checkpoint?.stage_data?.opportunities as any)?.opportunities || [];

    const evidenceItems = (checkpoint?.stage_data?.evidence_update as any)?.evidence_items || [];
    const evidenceMap = new Map<string, any>();
    for (const item of evidenceItems) {
      evidenceMap.set(item.id, item);
    }

    const saved = saveGoals(llmGoals, oppsData, evidenceMap, null);

    return {
      records_processed: saved.length,
      checkpoint_data: { goals_saved: saved.length, goals: saved },
      next_stage: null,
      status: 'success',
    };
  });

  // Stage 6: Drafts (real — store as pending_review)
  registerStage('drafts', async (ctx: any) => {
    const { getJob } = await import('./geo-job-store');
    const freshJob = await getJob(ctx.jobId);
    const checkpoint = freshJob?.checkpoint || ctx.checkpoint;
    const geoData = checkpoint?.stage_data?.geo_analysis as any;
    const llmDrafts = geoData?.drafts || [];

    const evidenceItems = (checkpoint?.stage_data?.evidence_update as any)?.evidence_items || [];
    const evidenceMap = new Map<string, any>();
    for (const item of evidenceItems) {
      evidenceMap.set(item.id, item);
    }

    // Classify risk for each draft
    const { classifyRisk } = require('./geo-publication');
    for (const draft of llmDrafts) {
      draft.risk_level = classifyRisk(draft.q + ' ' + draft.a, draft.evidence_ids);
    }

    const saved = saveDrafts(llmDrafts, evidenceMap, null);

    return {
      records_processed: saved.length,
      checkpoint_data: { drafts_saved: saved.length, drafts: saved },
      next_stage: null,
      status: 'success',
    };
  });
}
