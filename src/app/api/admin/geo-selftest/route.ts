import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  createPage,
  getPage,
  listVersions,
  logAudit,
  rollbackPage,
  updatePage,
} from '@/lib/geo-store';
import { getSupabaseCredentials } from '@/lib/storage-mode';

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY Phase 1 verification harness.
 *
 * Exercises the real geo-store module against the configured Supabase project
 * using a reserved test slug only. It is protected by the existing server-side
 * admin secret and is removed immediately after the verification run.
 *
 * Phases:
 *   setup   -> clean leftovers, create v1, update to v2, roll back to v1 (v3),
 *              verify versions + audit trail. Leaves v3 in place.
 *   verify  -> re-read the page after a Render restart and verify persistence.
 *   cleanup -> delete only the reserved test page, its versions and audit rows.
 */

const TEST_SLUG = '__phase1_selftest__';
const TEST_ACTOR = 'phase1-selftest';

type Step = { name: string; pass: boolean; detail?: unknown };

function authorized(req: NextRequest): boolean {
  const provided = (req.headers.get('x-admin-secret') || '').trim();
  if (!provided) return false;
  const candidates = [
    process.env.ADMIN_SECRET,
    process.env.CRON_SECRET,
    process.env.REVALIDATION_SECRET,
  ]
    .map((v) => (v || '').trim())
    .filter(Boolean);

  const b = Buffer.from(provided);
  return candidates.some((expected) => {
    const a = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

function sbHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

async function deleteWhere(pathname: string): Promise<number> {
  const cfg = getSupabaseCredentials();
  if (!cfg) throw new Error('Supabase is not configured');
  const res = await fetch(`${cfg.url}/rest/v1/${pathname}`, {
    method: 'DELETE',
    headers: { ...sbHeaders(cfg.key), Prefer: 'return=representation' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`delete ${pathname} failed: HTTP ${res.status}`);
  const rows = (await res.json()) as unknown[];
  return Array.isArray(rows) ? rows.length : 0;
}

async function purgeTestData(pageId?: string): Promise<void> {
  await deleteWhere(`audit_logs?actor=eq.${encodeURIComponent(TEST_ACTOR)}`);
  if (pageId) {
    await deleteWhere(`page_versions?page_id=eq.${encodeURIComponent(pageId)}`);
    await deleteWhere(`site_pages?id=eq.${encodeURIComponent(pageId)}`);
  }
  await deleteWhere(`site_pages?slug=eq.${encodeURIComponent(TEST_SLUG)}`);
}

async function readAudit(pageId: string): Promise<Array<{ action: string; created_at: string }>> {
  const cfg = getSupabaseCredentials();
  if (!cfg) throw new Error('Supabase is not configured');
  const res = await fetch(
    `${cfg.url}/rest/v1/audit_logs?entity_id=eq.${encodeURIComponent(pageId)}` +
      '&select=action,created_at&order=created_at.asc',
    { headers: sbHeaders(cfg.key), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`audit read failed: HTTP ${res.status}`);
  return (await res.json()) as Array<{ action: string; created_at: string }>;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const phase = req.nextUrl.searchParams.get('phase') || 'setup';
  const steps: Step[] = [];

  try {
    if (phase === 'setup') {
      // Remove any leftovers from a previous attempt before starting.
      const stale = await getPage(TEST_SLUG);
      if (stale) await purgeTestData(stale.id);
      await purgeTestData();

      const created = await createPage(
        TEST_SLUG,
        'Phase 1 Self Test',
        { marker: 'created', run: 'phase1' },
        TEST_ACTOR
      );
      steps.push({
        name: 'createPage returns version 1',
        pass: created.version === 1 && created.slug === TEST_SLUG,
        detail: { version: created.version, status: created.status },
      });

      const read = await getPage(TEST_SLUG);
      steps.push({
        name: 'getPage reads the created page',
        pass: !!read && read.id === created.id && (read.content as { marker?: string }).marker === 'created',
        detail: { found: !!read, version: read?.version },
      });

      const updated = await updatePage(
        TEST_SLUG,
        { marker: 'updated', run: 'phase1' },
        TEST_ACTOR,
        { expectedVersion: 1, title: 'Phase 1 Self Test v2' }
      );
      steps.push({
        name: 'updatePage advances to version 2',
        pass: updated?.version === 2 && (updated?.content as { marker?: string }).marker === 'updated',
        detail: { version: updated?.version, title: updated?.title },
      });

      let conflictRejected = false;
      try {
        await updatePage(TEST_SLUG, { marker: 'stale' }, TEST_ACTOR, { expectedVersion: 1 });
      } catch (e) {
        conflictRejected = (e as { code?: string }).code === 'VERSION_CONFLICT';
      }
      steps.push({
        name: 'stale expectedVersion is rejected',
        pass: conflictRejected,
      });

      const restored = await rollbackPage(TEST_SLUG, 1, TEST_ACTOR, 2);
      steps.push({
        name: 'rollbackPage restores v1 content as version 3',
        pass:
          restored?.version === 3 &&
          (restored?.content as { marker?: string }).marker === 'created',
        detail: { version: restored?.version },
      });

      const versions = await listVersions(TEST_SLUG);
      steps.push({
        name: 'version history is [3,2,1] with matching content',
        pass:
          versions.map((v) => v.version).join(',') === '3,2,1' &&
          (versions[0].content as { marker?: string }).marker === 'created' &&
          (versions[1].content as { marker?: string }).marker === 'updated',
        detail: versions.map((v) => ({ version: v.version, created_by: v.created_by })),
      });

      const audit = await readAudit(created.id);
      const actions = audit.map((a) => a.action);
      steps.push({
        name: 'audit trail records create + two updates',
        pass:
          actions.filter((a) => a === 'create_page').length === 1 &&
          actions.filter((a) => a === 'update_page').length === 2,
        detail: actions,
      });

      const ok = steps.every((s) => s.pass);
      return NextResponse.json({ phase, ok, steps, pageId: created.id, slug: TEST_SLUG }, {
        status: ok ? 200 : 500,
      });
    }

    if (phase === 'verify') {
      const page = await getPage(TEST_SLUG);
      const versions = page ? await listVersions(TEST_SLUG) : [];
      const audit = page ? await readAudit(page.id) : [];
      const actions = audit.map((a) => a.action);
      steps.push({
        name: 'test page survived restart',
        pass: !!page && page.version === 3,
        detail: { found: !!page, version: page?.version },
      });
      steps.push({
        name: 'restored content survived restart',
        pass: !!page && (page.content as { marker?: string }).marker === 'created',
        detail: { content: page?.content },
      });
      steps.push({
        name: 'version history survived restart',
        pass: versions.map((v) => v.version).join(',') === '3,2,1',
        detail: versions.map((v) => v.version),
      });
      steps.push({
        name: 'audit trail survived restart',
        pass:
          actions.filter((a) => a === 'create_page').length === 1 &&
          actions.filter((a) => a === 'update_page').length === 2,
        detail: actions,
      });
      const ok = steps.every((s) => s.pass);
      return NextResponse.json({ phase, ok, steps, pageId: page?.id, slug: TEST_SLUG }, {
        status: ok ? 200 : 500,
      });
    }

    if (phase === 'cleanup') {
      const page = await getPage(TEST_SLUG);
      await purgeTestData(page?.id);
      const after = await getPage(TEST_SLUG);
      const versionsAfter = after ? await listVersions(TEST_SLUG) : [];
      const auditAfter = page ? await readAudit(page.id) : [];
      steps.push({
        name: 'test page removed',
        pass: after === null,
      });
      steps.push({
        name: 'test versions removed',
        pass: versionsAfter.length === 0,
      });
      steps.push({
        name: 'test audit rows removed',
        pass: auditAfter.length === 0,
        detail: { remaining: auditAfter.length },
      });
      const ok = steps.every((s) => s.pass);
      return NextResponse.json({ phase, ok, steps, slug: TEST_SLUG }, {
        status: ok ? 200 : 500,
      });
    }

    return NextResponse.json({ status: 'unknown phase' }, { status: 400 });
  } catch (e) {
    await logAudit('selftest_error', 'site_page', undefined, TEST_ACTOR, {
      message: e instanceof Error ? e.message : String(e),
      phase,
    });
    return NextResponse.json(
      {
        phase,
        ok: false,
        steps,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
