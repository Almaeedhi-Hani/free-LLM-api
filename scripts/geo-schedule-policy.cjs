// Proposed GEO schedule policy. Pure, offline and side-effect free: NOT wired to production.
// It tests the safety gates required BEFORE periodic discovery/analysis/publication can be enabled.
'use strict';
const { createHash } = require('node:crypto');
const TZ = 'Asia/Riyadh';
const CRON = Object.freeze({
  collection: '15 */2 * * *',  // UTC 00:15,02:15...22:15 => KSA 03:15,05:15...01:15
  analysis: '0 5 * * *',      // UTC 05:00 => KSA 08:00
  publish: '0 7 * * *',       // UTC 07:00 => KSA 10:00
});
const MAX = Object.freeze({ discoveryRequestsPerRun: 3, discoveryItemsPerRun: 30,
  analysisPerSaudiDay: 1, publicationPerSaudiDay: 1 });
function saudiDay(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) throw new Error('Invalid timestamp');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d);
}
function normalized(x) { return String(x ?? '').trim().toLowerCase(); }
function stableKey(item) {
  if (!item || typeof item !== 'object') throw new Error('Invalid observation');
  const url = normalized(item.url).replace(/#.*$/, '').replace(/\/$/, '');
  const query = normalized(item.query);
  const lang = normalized(item.language);
  if (!url || !/^https?:\/\//.test(url) || !query || !['ar','en','zh'].includes(lang)) return null;
  return [url,lang,query].join('|');
}
function fingerprint(item) {
  const body = [normalized(item.title),normalized(item.snippet),normalized(item.page_type)].join('|');
  return createHash('sha256').update(body).digest('hex');
}
// Prior fingerprints MUST be loaded from durable DB store in production (GitHub runner files are ephemeral).
function planCollection({ incoming, prior = {}, requestCount = 0 }) {
  if (!Number.isInteger(requestCount) || requestCount < 0) throw new Error('Invalid request count');
  if (requestCount > MAX.discoveryRequestsPerRun) return {
    status:'blocked', reason:'request_budget_exceeded', newItems:[], changedItems:[],
    skipped:0, accepted:0
  };
  if (!Array.isArray(incoming)) throw new Error('Invalid discovery result');
  const newItems = [], changedItems = [];
  const seenInBatch = new Set();
  let skipped = 0;
  for (const item of incoming.slice(0, MAX.discoveryItemsPerRun)) {
    const key = stableKey(item);
    if (!key || seenInBatch.has(key)) { skipped++; continue; }
    seenInBatch.add(key);
    const hash = fingerprint(item);
    if (!(key in prior)) newItems.push({ key, hash, item });
    else if (prior[key] !== hash) changedItems.push({ key, hash, item });
    else skipped++;
  }
  return { status:'success', newItems, changedItems, skipped,
    accepted:newItems.length + changedItems.length,
    truncated:Math.max(0,incoming.length - MAX.discoveryItemsPerRun) };
}
function shouldAnalyze({ now, lastAttemptAt = null, evidenceChanges = 0,
  providerAvailable = true, dailyBudgetAvailable = true }) {
  if (lastAttemptAt && saudiDay(now) === saudiDay(lastAttemptAt))
    return { run:false, reason:'daily_limit_reached' };
  if (!Number.isInteger(evidenceChanges) || evidenceChanges < 0)
    return { run:false, reason:'invalid_evidence_change_count' };
  if (evidenceChanges === 0) return { run:false, reason:'no_new_evidence' };
  if (!providerAvailable || !dailyBudgetAvailable)
    return { run:false, reason:'provider_or_budget_unavailable' };
  return { run:true, reason:'new_evidence_within_daily_budget' };
}
// A publishing window is NOT permission to publish. Low-risk content needs explicit human approval,
// passed tests, provenance and atomic claim of its one-per-day publication slot.
function publicationDecision({ now, lastPublishedAt = null, draft = null,
  reviewApproved = false, testsPassed = false, sourcesVerified = false,
  atomicDailySlotClaimed = false }) {
  if (lastPublishedAt && saudiDay(now) === saudiDay(lastPublishedAt))
    return { publish:false, reason:'daily_limit_reached' };
  if (!draft || draft.status !== 'approved' || !reviewApproved)
    return { publish:false, reason:'not_approved' };
  if (draft.risk_level !== 'low')
    return { publish:false, reason:'specialist_review_required_no_auto_publish' };
  if (!testsPassed || !sourcesVerified)
    return { publish:false, reason:'quality_or_evidence_gate_failed' };
  if (!atomicDailySlotClaimed)
    return { publish:false, reason:'atomic_slot_not_claimed' };
  return { publish:true, reason:'approved_low_risk_one_daily_slot' };
}
// A 2xx HTTP status is NOT proof that the database accepted each record.
function verifySaveResponse({ requested, response }) {
  if (!Number.isInteger(requested) || requested < 0) return { ok:false, reason:'invalid_requested' };
  if (!response || typeof response !== 'object') return { ok:false, reason:'invalid_response' };
  if (response.error || !Array.isArray(response.savedIds))
    return { ok:false, reason:'unverified_persistence' };
  if (response.savedIds.length !== requested ||
      response.savedIds.some(x => typeof x !== 'string' || !x))
    return { ok:false, reason:'count_or_id_mismatch' };
  if (new Set(response.savedIds).size !== requested)
    return { ok:false, reason:'duplicate_saved_ids' };
  return { ok:true, reason:'verified_ids', saved:requested };
}
module.exports = { TZ, CRON, MAX, saudiDay, stableKey, fingerprint,
  planCollection, shouldAnalyze, publicationDecision, verifySaveResponse };
