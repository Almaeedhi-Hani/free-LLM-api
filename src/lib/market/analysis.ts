import type { Language, TriggeredBy, Keyword } from './types';
import { scoreOpportunity, priorityFromScore } from './scoring';
import { clusterKeywords } from './keyword-clustering';
import { listCompetitors, listObservations } from './competitors';
import { listKeywords } from './keywords';
import { createOpportunity, listOpportunities } from './opportunities';
import { createGoal } from './goals';
import { startRun, finishRun } from './runs';
import { getGeoFeedbackIndex, isExcluded, excludesOpportunity } from '../geo-agent-feedback';

const MAX_COMPETITORS_PER_RUN = 50;
const MAX_KEYWORDS_PER_RUN = 200;

export async function runMarketAnalysis(triggeredBy: TriggeredBy = 'manual'): Promise<{
  run_id: string;
  summary: Record<string, unknown>;
}> {
  const run = await startRun('full', triggeredBy);
  try {
    // Triaging must honor the latest explicit reviewer decision, including
    // corrections for records persisted before the feedback feature existed.
    const feedback=await getGeoFeedbackIndex();
    const competitors = (await listCompetitors({ status: 'active' }))
      .filter(c=>!isExcluded(feedback,'competitor',c.domain))
      .slice(0, MAX_COMPETITORS_PER_RUN);
    const keywords = (await listKeywords())
      .filter(k=>!isExcluded(feedback,'keyword',k.term,k.language))
      .slice(0, MAX_KEYWORDS_PER_RUN);

    let opportunitiesCreated = 0;
    let goalsCreated = 0;
    const opportunityTitles:string[]=[];
    const goalTitles:string[]=[];

    for (const c of competitors) {
      const obs = await listObservations(c.id, 20);
      const weaknesses = obs.flatMap((o) => o.weaknesses || []).filter(Boolean);
      if (weaknesses.length === 0) continue;
      const langs = Array.from(new Set(obs.map((o) => o.language))) as Language[];
      const evidence = obs.slice(0, 5).map((o) => ({
        source: 'competitor_observation',
        observed_at: o.observed_at,
        origin: 'competitor' as const,
      }));
      const score = scoreOpportunity({
        evidenceCount: evidence.length,
        languages: langs,
        confidence: 'medium',
        type: 'content_gap',
      });
      const opp = await createOpportunity({
        title: `Address competitor gap: ${c.domain}`,
        type: 'content_gap',
        priority: priorityFromScore(score),
        score,
        evidence,
        languages: langs,
        related_competitors: [c.id],
        confidence: 'medium',
        estimated_impact: 'Improve coverage of topics where competitors show weaknesses',
      });
      opportunitiesCreated += 1;
      opportunityTitles.push(opp.title);
      const goal = await createGoal({
        title: `Close content gap vs ${c.domain}`,
        description: `Produce original, evidence-backed content addressing: ${weaknesses.slice(0, 3).join(', ')}`,
        priority: opp.priority,
        evidence,
        success_metrics: [
          { metric: 'page_published', target: '1', measurement: 'count of published pages covering the gap' },
          { metric: 'version_created', target: '>=1', measurement: 'page_versions rows for the new page' },
        ],
        confidence: 'medium',
        related_opportunity_id: opp.id,
      });
      goalsCreated += 1;
      goalTitles.push(goal.title);
    }

    const MAX_NEW_OPPORTUNITIES = 10;
    const GOAL_SCORE_THRESHOLD = 50;
    const existingOpps = (await listOpportunities()).filter(o=>!excludesOpportunity(feedback,o));
    const txKeywords = keywords.filter((k) => k.intent === 'transactional' || k.intent === 'commercial');
    const clusters = clusterKeywords(txKeywords);
    let newOppsThisRun = 0;
    for (const cluster of clusters) {
      if (newOppsThisRun >= MAX_NEW_OPPORTUNITIES) break;
      const rep = cluster.representative;
      const clusterTitle = `Target cluster: ${cluster.core} (${cluster.language})`;
      const already = existingOpps.some((o) => o.title === clusterTitle);
      if (already) continue;
      const score = scoreOpportunity({
        evidenceCount: cluster.members.length,
        languages: [cluster.language as 'ar' | 'en' | 'zh'],
        confidence: cluster.members.some((m) => (m as Keyword).volume_confidence === 'high') ? 'high' : 'low',
        type: 'keyword_gap',
      });
      const opp = await createOpportunity({
        title: clusterTitle,
        type: 'keyword_gap',
        priority: priorityFromScore(score),
        score,
        evidence: cluster.members.map((m) => ({
          source: (m as Keyword).source,
          observed_at: (m as Keyword).last_seen_at,
          origin: 'keyword',
        })),
        languages: [cluster.language as 'ar' | 'en' | 'zh'],
        related_keywords: cluster.members.map((m) => m.id),
        confidence: cluster.members.some((m) => (m as Keyword).volume_confidence === 'high') ? 'high' : 'low',
        estimated_impact: `Cluster of ${cluster.members.length} related search terms`,
      });
      opportunitiesCreated += 1;
      opportunityTitles.push(opp.title);
      newOppsThisRun += 1;
      // Only auto-create goals for sufficiently strong opportunities.
      if (score >= GOAL_SCORE_THRESHOLD) {
        const goal = await createGoal({
          title: `Build page for cluster: ${cluster.core}`,
          description: `Create an original, source-backed page targeting the cluster: ${cluster.members.map((m) => (m as Keyword).term).join(', ')}.`,
          priority: opp.priority,
          evidence: cluster.members.map((m) => ({
            source: (m as Keyword).source,
            observed_at: (m as Keyword).last_seen_at,
            origin: 'keyword' as const,
          })),
          success_metrics: [
            { metric: 'page_created', target: '1', measurement: 'site_pages row with matching slug' },
            { metric: 'indexed', target: 'true', measurement: 'search engine index status' },
          ],
          confidence: opp.confidence,
          related_opportunity_id: opp.id,
        });
        goalsCreated += 1;
        goalTitles.push(goal.title);
      }
    }

    const summary = {
      competitors_analyzed: competitors.length,
      keywords_analyzed: keywords.length,
      opportunities_created: opportunitiesCreated,
      goals_created: goalsCreated,
      competitor_names_analyzed: competitors.map(c=>c.domain),
      keyword_terms_analyzed: keywords.map(k=>k.term),
      opportunity_titles_created: opportunityTitles,
      goal_titles_created: goalTitles,
      limits: { max_competitors: MAX_COMPETITORS_PER_RUN, max_keywords: MAX_KEYWORDS_PER_RUN },
    };
    await finishRun(run.id, 'success', summary);
    return { run_id: run.id, summary };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishRun(run.id, 'failed', undefined, msg);
    throw e;
  }
}
