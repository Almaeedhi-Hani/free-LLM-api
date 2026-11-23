import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runRadar } from '@/lib/market-intelligence';

export const dynamic = 'force-dynamic';

/**
 * Supabase pg_cron signs GET + path + UTC epoch seconds with a Vault key.
 * No shared secret is passed to pg_net or stored in its request queue.
 * Keep the original CRON_SECRET bearer path intact for rollback/manual GitHub runs.
 */
function hasSupabaseCronSignature(req: NextRequest): boolean {
  const keyHex = process.env.W02_SUPABASE_HMAC_SECRET;
  const timestamp = req.headers.get('x-w02-cron-ts');
  const supplied = req.headers.get('x-w02-cron-signature');
  if (!keyHex || !/^[a-f0-9]{64}$/i.test(keyHex) ||
      !timestamp || !/^\d{10}$/.test(timestamp) ||
      !supplied || !/^[a-f0-9]{64}$/i.test(supplied)) {
    return false;
  }

  const epochSeconds = Number(timestamp);
  // Allow modest queue/network delay but reject old and future replay attempts.
  if (!Number.isSafeInteger(epochSeconds) ||
      Math.abs(Math.floor(Date.now() / 1000) - epochSeconds) > 300) {
    return false;
  }
  const message = `GET\n/api/cron-market\n${timestamp}`;
  const calculated = createHmac('sha256', Buffer.from(keyHex, 'hex'))
    .update(message, 'utf8').digest();
  return timingSafeEqual(calculated, Buffer.from(supplied, 'hex'));
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  const originalGitHubAuth = Boolean(expected && auth === `Bearer ${expected}`);
  const signedSupabaseAuth = hasSupabaseCronSignature(req);
  if (!originalGitHubAuth && !signedSupabaseAuth) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  try {
    const { run_id, discovery, analysis } = await runRadar({ triggeredBy: 'cron' });
    return NextResponse.json({ status: 'completed', run_id, discovery, analysis,
      scheduler: signedSupabaseAuth ? 'supabase_cron' : 'github_actions' });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
