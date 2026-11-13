// Transparent GEO Scoring — No LLM-assigned final scores.
// Each dimension scored independently, then combined with weights.

export interface ScoringInput {
  evidence_count: number;
  evidence_sources: string[]; // unique sources
  language_coverage: string[]; // languages with evidence
  competitor_coverage: number; // number of direct competitors referenced
  has_search_volume: boolean;
  has_official_sources: boolean;
  confidence: 'high' | 'medium' | 'low';
  type: 'content_gap' | 'keyword_gap';
}

export interface ScoringBreakdown {
  evidence_strength: number; // 0-30
  source_quality: number; // 0-20
  competitor_coverage: number; // 0-15
  language_coverage: number; // 0-15
  data_completeness: number; // 0-10
  confidence_bonus: number; // 0-10
  total: number; // 0-100
  data_gaps: string[];
}

export function scoreOpportunity(input: ScoringInput): ScoringBreakdown {
  const dataGaps: string[] = [];

  // 1. Evidence strength (0-30): based on count + diversity
  let evidenceStrength = Math.min(input.evidence_count * 3, 20);
  if (input.evidence_sources.length >= 3) evidenceStrength += 5;
  if (input.evidence_sources.length >= 5) evidenceStrength += 5;
  evidenceStrength = Math.min(evidenceStrength, 30);

  // 2. Source quality (0-20): official sources > search sources
  let sourceQuality = 0;
  if (input.has_official_sources) sourceQuality += 15;
  if (input.evidence_sources.includes('competitor_observation')) sourceQuality += 3;
  if (input.evidence_sources.includes('search')) sourceQuality += 2;
  sourceQuality = Math.min(sourceQuality, 20);
  if (!input.has_official_sources) dataGaps.push('no_official_sources');

  // 3. Competitor coverage (0-15)
  let compCoverage = Math.min(input.competitor_coverage * 3, 15);
  if (input.competitor_coverage === 0) dataGaps.push('no_competitor_evidence');

  // 4. Language coverage (0-15): ar=5, en=5, zh=5
  let langCoverage = 0;
  if (input.language_coverage.includes('ar')) langCoverage += 5;
  if (input.language_coverage.includes('en')) langCoverage += 5;
  if (input.language_coverage.includes('zh')) langCoverage += 5;
  if (!input.language_coverage.includes('zh')) dataGaps.push('no_chinese_coverage');

  // 5. Data completeness (0-10)
  let dataCompleteness = 0;
  if (input.has_search_volume) {
    dataCompleteness += 5;
  } else {
    dataGaps.push('no_search_volume_data');
  }
  if (input.evidence_count >= 5) dataCompleteness += 3;
  if (input.evidence_sources.length >= 2) dataCompleteness += 2;
  dataCompleteness = Math.min(dataCompleteness, 10);

  // 6. Confidence bonus (0-10)
  const confidenceBonus = input.confidence === 'high' ? 10 : input.confidence === 'medium' ? 5 : 0;

  const total = Math.min(
    evidenceStrength + sourceQuality + compCoverage + langCoverage + dataCompleteness + confidenceBonus,
    100
  );

  return {
    evidence_strength: evidenceStrength,
    source_quality: sourceQuality,
    competitor_coverage: compCoverage,
    language_coverage: langCoverage,
    data_completeness: dataCompleteness,
    confidence_bonus: confidenceBonus,
    total,
    data_gaps: dataGaps,
  };
}

export function priorityFromScore(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
