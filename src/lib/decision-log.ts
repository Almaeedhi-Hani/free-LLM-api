// Decision log helper (storage-agnostic; uses Supabase if configured, else no-op).
import { getSupabaseCredentials } from './storage-mode';

export interface DecisionEntry {
  run_id?: string;
  stage: string;
  model?: string;
  evidence_ids: string[];
  decision: string;
  rationale?: string;
  risk_level?: string;
  cost_usd?: number;
  review_status?: 'pending' | 'approved' | 'rejected';
}

export async function logDecision(entry: DecisionEntry): Promise<void> {
  const cfg = getSupabaseCredentials();
  if (!cfg) return; // no-op in dev/file mode
  try {
    await fetch(`${cfg.url}/rest/v1/decision_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(entry),
    });
  } catch {
    // fail silently; decisions are best-effort
  }
}
