import { FLAGS, BUDGET } from './feature-flags';
import { analyzeEvidence } from './llm-analysis';
import { runDiscovery, runMarketAnalysis } from './market-intelligence';
import { buildEvidenceBundle } from './evidence-bundle';

export interface OrchestratorResult {
  status: 'disabled' | 'completed' | 'error';
  discovery?: any;
  analysis?: any;
  llm?: any;
  verification?: { accepted: number; rejected: number; reasons: string[] };
  error?: string;
}

export async function runUnifiedOrchestrator(params: {
  seeds?: { ar: string[]; en: string[]; zh: string[] };
  triggeredBy: string;
}): Promise<OrchestratorResult> {
  if (!FLAGS.ENABLE_UNIFIED_ORCHESTRATOR) {
    return { status: 'disabled', error: 'ENABLE_UNIFIED_ORCHESTRATOR is false' };
  }

  const reasons: string[] = [];
  let discovery: any = null;
  let analysis: any = null;
  let llmResult: any = null;

  try {
    // Stage 1: Discovery (existing, fail-safe)
    if (params.seeds) {
      discovery = await runDiscovery({ seeds: params.seeds, triggeredBy: params.triggeredBy as any });
    }

    // Stage 2: Market analysis (rule-based, existing)
    analysis = await runMarketAnalysis(params.triggeredBy as any);

    // Stage 3: LLM Analysis (if enabled + budget)
    if (FLAGS.ENABLE_LLM_ANALYSIS) {
      const bundle = await buildEvidenceBundle();
      const evidence = bundle.items;
      if (evidence.length === 0) {
        reasons.push('llm: no evidence available');
      } else {
        llmResult = await analyzeEvidence(evidence);
        if (llmResult.error) reasons.push(`llm: ${llmResult.error}`);
      }
    } else {
      reasons.push('llm: disabled (ENABLE_LLM_ANALYSIS=false)');
    }

    return {
      status: 'completed',
      discovery,
      analysis,
      llm: llmResult,
      verification: { accepted: llmResult?.opportunities?.length || 0, rejected: 0, reasons },
    };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : String(e), verification: { accepted: 0, rejected: 0, reasons } };
  }
}


