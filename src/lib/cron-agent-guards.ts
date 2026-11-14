/** Pure guards for the legacy, review-only cron endpoint. */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  return Boolean(secret && header === `Bearer ${secret}`);
}

/** The scheduler must call between 02:00 and 02:09 Saudi time (UTC+03). */
export function isCronRunWindow(now: Date): boolean {
  const saudiMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 180) % 1440;
  return saudiMinutes >= 120 && saudiMinutes < 130;
}

/** Do not requeue rejected or approved content without explicit human action. */
export function hasExistingDraft(drafts: ReadonlyArray<{ q: string; status: string }>, question: string): boolean {
  return drafts.some(d => d.q === question);
}
