// GEO Publication Engine — Server-side publication decision and execution.
// Reads operating mode, checks safety, publishes or queues for review.
// No auto-publish for high-risk content. Emergency stop overrides everything.

import { getSettings, isPublishAllowed, canPublishRiskLevel } from './geo-settings';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface PublishCandidate {
  id: string;
  type: 'opportunity' | 'goal' | 'draft' | 'content';
  title: string;
  content: string;
  risk_level: RiskLevel;
  evidence_ids: string[];
  source_run_id: string | null;
  target_path: string; // where to publish (e.g., /faq, /blog)
}

export interface PublicationDecision {
  candidate_id: string;
  action: 'publish' | 'pending_review' | 'reject' | 'skip';
  reason: string;
  risk_level: RiskLevel;
  mode: string;
  timestamp: string;
}

export interface PublicationResult {
  published: number;
  pending_review: number;
  rejected: number;
  skipped: number;
  decisions: PublicationDecision[];
  errors: string[];
}

// Content scope — only these paths can be auto-published
const AUTO_PUBLISH_SCOPES = [
  '/faq',
  '/blog',
  '/guides',
  '/resources',
];

// Protected paths — never auto-publish
const PROTECTED_SCOPES = [
  '/admin',
  '/api',
  '/settings',
  '/pricing',
  '/legal',
  '/contact',
  '/about',
];

export function isPathAutoPublishable(path: string): boolean {
  if (PROTECTED_SCOPES.some((p) => path.startsWith(p))) return false;
  return AUTO_PUBLISH_SCOPES.some((p) => path.startsWith(p));
}

export function classifyRisk(content: string, evidenceIds: string[]): RiskLevel {
  const LEGAL_PATTERN = /MISA|SAMA|CMA|KYC|residency|license|fees?|cost|price|ownership|SAGIA|tax|visa|permit/i;
  const FINANCIAL_PATTERN = /price|cost|fee|payment|invoice|billing|subscription/i;
  const REGULATORY_PATTERN = /license|permit|registration|MISA|SAMA|CMA|compliance|regulation/i;

  if (LEGAL_PATTERN.test(content) || REGULATORY_PATTERN.test(content)) return 'high';
  if (FINANCIAL_PATTERN.test(content)) return 'medium';
  return 'low';
}

export function checkPublicationSafety(candidate: PublishCandidate): {
  safe: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const settings = getSettings();

  // 1. Emergency stop
  if (settings.emergency_stop_publication) {
    reasons.push('Emergency stop is active');
  }

  // 2. Pause all jobs
  if (settings.pause_all_jobs) {
    reasons.push('All jobs are paused');
  }

  // 3. Mode check
  if (settings.operating_mode !== 'automatic') {
    reasons.push(`Operating mode is ${settings.operating_mode} — manual approval required`);
  }

  // 4. Auto-publish enabled
  if (!settings.auto_publish_low_risk) {
    reasons.push('Auto-publish is disabled');
  }

  // 5. Risk level check
  if (!canPublishRiskLevel(candidate.risk_level)) {
    reasons.push(`Risk level ${candidate.risk_level} requires review`);
  }

  // 6. Path scope check
  if (!isPathAutoPublishable(candidate.target_path)) {
    reasons.push(`Path ${candidate.target_path} is not in auto-publish scope`);
  }

  // 7. Evidence check
  if (candidate.evidence_ids.length === 0) {
    reasons.push('No evidence IDs — cannot publish without provenance');
  }

  // 8. Content length check
  if (candidate.content.length < 50) {
    reasons.push('Content too short (< 50 chars)');
  }

  return { safe: reasons.length === 0, reasons };
}

export function makePublicationDecision(candidate: PublishCandidate): PublicationDecision {
  const settings = getSettings();
  const safety = checkPublicationSafety(candidate);

  if (safety.safe) {
    return {
      candidate_id: candidate.id,
      action: 'publish',
      reason: 'All safety checks passed',
      risk_level: candidate.risk_level,
      mode: settings.operating_mode,
      timestamp: new Date().toISOString(),
    };
  }

  // Determine if pending_review or reject
  const isHighRisk = candidate.risk_level === 'high';
  const isManualMode = settings.operating_mode === 'manual';

  if (isHighRisk || isManualMode) {
    return {
      candidate_id: candidate.id,
      action: 'pending_review',
      reason: safety.reasons.join('; '),
      risk_level: candidate.risk_level,
      mode: settings.operating_mode,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    candidate_id: candidate.id,
    action: 'skip',
    reason: safety.reasons.join('; '),
    risk_level: candidate.risk_level,
    mode: settings.operating_mode,
    timestamp: new Date().toISOString(),
  };
}

export async function executePublication(
  candidates: PublishCandidate[],
  maxPerRun: number
): Promise<PublicationResult> {
  const settings = getSettings();
  const decisions: PublicationDecision[] = [];
  const errors: string[] = [];
  let published = 0;
  let pendingReview = 0;
  let rejected = 0;
  let skipped = 0;

  // Emergency stop check
  if (settings.emergency_stop_publication) {
    for (const c of candidates) {
      decisions.push({
        candidate_id: c.id,
        action: 'skip',
        reason: 'Emergency stop is active',
        risk_level: c.risk_level,
        mode: settings.operating_mode,
        timestamp: new Date().toISOString(),
      });
      skipped++;
    }
    return { published, pending_review: pendingReview, rejected, skipped, decisions, errors };
  }

  for (const candidate of candidates) {
    if (published >= maxPerRun) {
      decisions.push({
        candidate_id: candidate.id,
        action: 'skip',
        reason: `Max publications per run reached (${maxPerRun})`,
        risk_level: candidate.risk_level,
        mode: settings.operating_mode,
        timestamp: new Date().toISOString(),
      });
      skipped++;
      continue;
    }

    const decision = makePublicationDecision(candidate);
    decisions.push(decision);

    if (decision.action === 'publish') {
      // In production: actually publish to site (update content, revalidate)
      // For now: log the decision (no actual publish in local mode)
      published++;
    } else if (decision.action === 'pending_review') {
      pendingReview++;
    } else if (decision.action === 'reject') {
      rejected++;
    } else {
      skipped++;
    }
  }

  return { published, pending_review: pendingReview, rejected, skipped, decisions, errors };
}
