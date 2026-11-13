// Batch GEO Analysis — Process all evidence in manageable batches.
// Supports Arabic, English, Chinese independently.
// Records data gaps. No fabricated claims.

import { buildEvidenceBundle } from './evidence-bundle';
import { analyzeEvidence } from './llm-analysis';
import { scoreOpportunity } from './geo-scoring';
import { saveOpportunities, saveGoals, saveDrafts } from './geo-result-persistence';

export interface BatchAnalysisResult {
  batches_processed: number;
  total_evidence: number;
  languages_covered: string[];
  coverage_gaps: string[];
  opportunities: number;
  goals: number;
  drafts: number;
  errors: string[];
}

const BATCH_SIZE = 25; // Max evidence items per LLM call
const LANGUAGES = ['ar', 'en', 'zh'];

export async function runBatchAnalysis(sourceRunId: string | null): Promise<BatchAnalysisResult> {
  const result: BatchAnalysisResult = {
    batches_processed: 0,
    total_evidence: 0,
    languages_covered: [],
    coverage_gaps: [],
    opportunities: 0,
    goals: 0,
    drafts: 0,
    errors: [],
  };

  // Build full evidence bundle
  const bundle = await buildEvidenceBundle();
  const allItems = bundle.items;
  result.total_evidence = allItems.length;

  // Group by language
  const byLanguage: Record<string, any[]> = { ar: [], en: [], zh: [] };
  for (const item of allItems) {
    const lang = item.language?.split(',')[0]?.trim() || 'unknown';
    if (byLanguage[lang]) byLanguage[lang].push(item);
  }

  // Check coverage gaps
  for (const lang of LANGUAGES) {
    if (byLanguage[lang].length === 0) {
      result.coverage_gaps.push(`no_${lang}_evidence`);
    } else {
      result.languages_covered.push(lang);
    }
  }

  // Process each language independently
  const allOpportunities: any[] = [];
  const allGoals: any[] = [];
  const allDrafts: any[] = [];
  const evidenceMap = new Map<string, any>();
  for (const item of allItems) evidenceMap.set(item.id, item);

  for (const lang of LANGUAGES) {
    const langItems = byLanguage[lang];
    if (langItems.length === 0) continue;

    // Process in batches
    for (let i = 0; i < langItems.length; i += BATCH_SIZE) {
      const batch = langItems.slice(i, i + BATCH_SIZE);
      try {
        const llmResult = await analyzeEvidence(batch);
        if (llmResult.error) {
          result.errors.push(`${lang} batch ${i}: ${llmResult.error}`);
          continue;
        }

        // Tag opportunities with language
        for (const opp of (llmResult.opportunities || [])) {
          (opp as any)._language = lang;
          allOpportunities.push(opp);
        }
        for (const goal of (llmResult.goals || [])) {
          (goal as any)._language = lang;
          allGoals.push(goal);
        }
        for (const draft of (llmResult.drafts || [])) {
          (draft as any)._language = lang;
          allDrafts.push(draft);
        }

        result.batches_processed++;
      } catch (e) {
        result.errors.push(`${lang} batch ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Save results
  const scoringBreakdowns = new Map<string, Record<string, number>>();
  const dataGapsMap = new Map<string, string[]>();

  for (const opp of allOpportunities) {
    const langs: string[] = [String(opp._language || 'ar')];
    const sources: string[] = Array.from(new Set(opp.evidence_ids.map((id: string) => String(evidenceMap.get(id)?.source || '')).filter(Boolean)));
    const compCount = Array.from(new Set(opp.evidence_ids.map((id: string) => String(evidenceMap.get(id)?.domain || '')).filter(Boolean))).length;

    const breakdown = scoreOpportunity({
      evidence_count: opp.evidence_ids.length,
      evidence_sources: sources,
      language_coverage: langs,
      competitor_coverage: compCount,
      has_search_volume: false,
      has_official_sources: sources.includes('official'),
      confidence: opp.score >= 70 ? 'high' : opp.score >= 50 ? 'medium' : 'low',
      type: opp.type,
    });

    scoringBreakdowns.set(opp.title, breakdown as unknown as Record<string, number>);
    dataGapsMap.set(opp.title, breakdown.data_gaps);
    opp.score = breakdown.total;
  }

  const savedOpps = saveOpportunities(allOpportunities, evidenceMap, sourceRunId, scoringBreakdowns, dataGapsMap);
  const savedGoals = saveGoals(allGoals, savedOpps, evidenceMap, sourceRunId);
  const savedDrafts = saveDrafts(allDrafts, evidenceMap, sourceRunId);

  result.opportunities = savedOpps.length;
  result.goals = savedGoals.length;
  result.drafts = savedDrafts.length;

  return result;
}
