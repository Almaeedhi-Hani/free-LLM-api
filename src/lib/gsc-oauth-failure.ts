/**
 * Stable, non-secret diagnostics for the production Google Search Console sync.
 * Does not parse Google's OAuth error descriptions or log client credentials.
 * An HTTP 400/401 from Google's TOKEN endpoint cannot be fixed by rerunning CI.
 */
export function classifyGscSyncFailure(error: unknown): {
 error: string;
 retryable: boolean;
 operator_action?: 'reauthorize_google_oauth';
} {
 const message = error instanceof Error ? error.message : 'unknown_error';
 if (/^google_token_(400|401)$/.test(message) || message === 'google_token_missing') {
  return {error:message,retryable:false,operator_action:'reauthorize_google_oauth'};
 }
 const allowed = /^(google_search_\d{3}|google_quota_reached|google_search_invalid_rows|supabase_write_\d{3}|gsc_[a-z0-9_]+)$/;
 return {error:allowed.test(message)?message:'gsc_unexpected_failure',retryable:false};
}
