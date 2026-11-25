import { startRun, finishRun } from './runs';
import { runMarketAnalysis } from './analysis';
import { runDiscovery } from './discovery';
import type { DiscoveryConfig, DiscoverySummary } from './discovery';
import { availableSources } from '../market-sources';

export async function runRadar(config?: Partial<DiscoveryConfig>): Promise<{
  run_id: string;
  discovery: DiscoverySummary;
  analysis: { run_id: string; summary: Record<string, unknown> };
}> {
  const run = await startRun('radar', config?.triggeredBy || 'manual');
  let discovery: DiscoverySummary | undefined;
  try {
    discovery = await runDiscovery(config);
    const analysis = await runMarketAnalysis(config?.triggeredBy || 'manual');
    const summary = { discovery, analysis: analysis.summary };
    await finishRun(run.id, discovery.success ? 'success' : 'partial', summary);
    return { run_id: run.id, discovery, analysis };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishRun(run.id, 'failed', discovery ? { discovery } : undefined, msg);
    throw e;
  }
}

export function listAvailableSources() {
  return availableSources();
}
