// Real Publication Engine — Executes actual content publication with versioning.
// Uses geo-content-store for atomic writes + rollback.

import { getSettings, isPublishAllowed, canPublishRiskLevel } from './geo-settings';
import { publishContent, rollbackContent, listVersions, getContent } from './geo-content-store';
import { makePublicationDecision, classifyRisk } from './geo-publication';

export interface RealPublishCandidate {
  id: string;
  type: 'draft' | 'opportunity' | 'goal';
  title: string;
  content: string;
  risk_level: 'low' | 'medium' | 'high';
  evidence_ids: string[];
  source_run_id: string | null;
  target_path: string;
  source_draft_id: string | null;
}

export interface RealPublicationResult {
  published: { path: string; version: number; versionId: string }[];
  pending_review: string[];
  rejected: string[];
  skipped: string[];
  rolled_back: string[];
  errors: string[];
  audit_log: Array<{ action: string; path: string; timestamp: string; reason: string }>;
}

export async function executeRealPublication(
  candidates: RealPublishCandidate[],
  publishedBy: string = 'system'
): Promise<RealPublicationResult> {
  const settings = getSettings();
  const result: RealPublicationResult = {
    published: [],
    pending_review: [],
    rejected: [],
    skipped: [],
    rolled_back: [],
    errors: [],
    audit_log: [],
  };

  // Emergency stop check
  if (settings.emergency_stop_publication) {
    for (const c of candidates) {
      result.skipped.push(c.id);
      result.audit_log.push({ action: 'skip', path: c.target_path, timestamp: new Date().toISOString(), reason: 'Emergency stop active' });
    }
    return result;
  }

  // Pause check
  if (settings.pause_all_jobs) {
    for (const c of candidates) {
      result.skipped.push(c.id);
      result.audit_log.push({ action: 'skip', path: c.target_path, timestamp: new Date().toISOString(), reason: 'All jobs paused' });
    }
    return result;
  }

  let publishedCount = 0;
  const maxPerRun = settings.max_publications_per_run;

  for (const candidate of candidates) {
    // Mode check
    if (settings.operating_mode !== 'automatic') {
      result.pending_review.push(candidate.id);
      result.audit_log.push({ action: 'pending_review', path: candidate.target_path, timestamp: new Date().toISOString(), reason: 'Manual mode — requires approval' });
      continue;
    }

    // Auto-publish enabled check
    if (!settings.auto_publish_low_risk) {
      result.pending_review.push(candidate.id);
      result.audit_log.push({ action: 'pending_review', path: candidate.target_path, timestamp: new Date().toISOString(), reason: 'Auto-publish disabled' });
      continue;
    }

    // Risk level check
    if (!canPublishRiskLevel(candidate.risk_level)) {
      result.pending_review.push(candidate.id);
      result.audit_log.push({ action: 'pending_review', path: candidate.target_path, timestamp: new Date().toISOString(), reason: `Risk level ${candidate.risk_level} requires review` });
      continue;
    }

    // Path scope check
    const { isPathAutoPublishable } = await import('./geo-publication');
    if (!isPathAutoPublishable(candidate.target_path)) {
      result.pending_review.push(candidate.id);
      result.audit_log.push({ action: 'pending_review', path: candidate.target_path, timestamp: new Date().toISOString(), reason: `Path ${candidate.target_path} not in auto-publish scope` });
      continue;
    }

    // Evidence check
    if (candidate.evidence_ids.length === 0) {
      result.rejected.push(candidate.id);
      result.audit_log.push({ action: 'reject', path: candidate.target_path, timestamp: new Date().toISOString(), reason: 'No evidence IDs' });
      continue;
    }

    // Max publications check
    if (publishedCount >= maxPerRun) {
      result.skipped.push(candidate.id);
      result.audit_log.push({ action: 'skip', path: candidate.target_path, timestamp: new Date().toISOString(), reason: `Max publications per run reached (${maxPerRun})` });
      continue;
    }

    // Re-check emergency stop (race condition protection)
    const currentSettings = getSettings();
    if (currentSettings.emergency_stop_publication) {
      result.skipped.push(candidate.id);
      result.audit_log.push({ action: 'skip', path: candidate.target_path, timestamp: new Date().toISOString(), reason: 'Emergency stop activated during run' });
      continue;
    }

    // Publish
    try {
      const { version, entry } = publishContent({
        path: candidate.target_path,
        type: candidate.type,
        content: candidate.content,
        publishedBy,
        sourceDraftId: candidate.source_draft_id,
        sourceRunId: candidate.source_run_id,
      });

      result.published.push({ path: candidate.target_path, version: version.version_number, versionId: version.id });
      publishedCount++;
      result.audit_log.push({ action: 'publish', path: candidate.target_path, timestamp: new Date().toISOString(), reason: `Published v${version.version_number}` });
    } catch (e) {
      result.errors.push(`Failed to publish ${candidate.target_path}: ${e instanceof Error ? e.message : String(e)}`);
      result.audit_log.push({ action: 'reject', path: candidate.target_path, timestamp: new Date().toISOString(), reason: `Publish failed: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  return result;
}

export async function executeRollback(params: {
  path: string;
  versionId: string;
  rolledBackBy: string;
}): Promise<{ success: boolean; message: string }> {
  return rollbackContent(params);
}
