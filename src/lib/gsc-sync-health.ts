/** Observation-only status: no claim that the scheduler ran or Google was queried. */
export function assessGscSyncHealth(capturedAt: string | null | undefined, now: number = Date.now()) {
  if (!capturedAt) return {status:'no_snapshot' as const,age_hours:null};
  const timestamp=Date.parse(capturedAt);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now) || timestamp>now+5*60_000)
    return {status:'invalid_timestamp' as const,age_hours:null};
  const age=(now-timestamp)/3_600_000;
  return {status:age>48?'stale' as const:'recent' as const,age_hours:Math.max(0,Math.round(age*10)/10)};
}
