/* eslint-disable no-console */
/**
 * Phase 1 hardening tests.
 *
 * These tests exercise the REAL storage modules (compiled from src/lib) and
 * never touch production data. Run with: npm run test:storage
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');

const BUILD_DIR = path.join(__dirname, '..', '.geo-test-build');
const geo = require(path.join(BUILD_DIR, 'geo-store.js'));
const content = require(path.join(BUILD_DIR, 'content-store.js'));
const storage = require(path.join(BUILD_DIR, 'storage-mode.js'));

const results = [];
const realFetch = global.fetch;
const realEnv = { ...process.env };

function makeDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function resetGeoEnv(dir) {
  process.env.GEO_STORE_PATH = dir;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PHASE;
  process.env.NODE_ENV = 'test';
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in realEnv)) delete process.env[key];
  }
  Object.assign(process.env, realEnv);
  global.fetch = realFetch;
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ name, pass: false, detail: error.message });
    console.log(`FAIL  ${name}\n      ${error.message}`);
  }
}

async function expectRejects(promise, predicate, label) {
  let thrown = null;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `${label}: expected rejection but call resolved`);
  if (predicate) assert(predicate(thrown), `${label}: unexpected error: ${thrown.name}: ${thrown.message}`);
  return thrown;
}

/**
 * Minimal in-memory imitation of the PostgREST endpoints used by geo-store.
 * This lets us test the real Supabase branch (CAS, unique version, cleanup)
 * without credentials or a network dependency.
 */
function startMockSupabase() {
  const state = {
    pages: [],
    versions: [],
    audits: [],
    bumpBeforePatch: false,
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const table = url.pathname.replace(/^\/rest\/v1\//, '');
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      const send = (status, payload) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(payload === undefined ? '' : JSON.stringify(payload));
      };
      const eq = (key) => {
        const value = url.searchParams.get(key);
        return value && value.startsWith('eq.') ? decodeURIComponent(value.slice(3)) : null;
      };
      const now = new Date().toISOString();

      if (req.method === 'POST' && table === 'site_pages') {
        if (state.pages.some((p) => p.slug === body.slug)) {
          return send(409, { message: 'duplicate key value violates unique constraint' });
        }
        const page = { id: randomUUID(), ...body, created_at: now, updated_at: now };
        state.pages.push(page);
        return send(201, [page]);
      }

      if (req.method === 'GET' && table === 'site_pages') {
        const slug = eq('slug');
        const rows = state.pages.filter((p) => (slug === null ? true : p.slug === slug));
        return send(200, rows);
      }

      if (req.method === 'PATCH' && table === 'site_pages') {
        const id = eq('id');
        const version = Number(eq('version'));
        const page = state.pages.find((p) => p.id === id);
        if (!page) return send(200, []);
        if (state.bumpBeforePatch) {
          state.bumpBeforePatch = false;
          page.version += 1;
          page.updated_at = new Date().toISOString();
          return send(200, []);
        }
        if (page.version !== version) return send(200, []);
        Object.assign(page, body, { updated_at: new Date().toISOString() });
        return send(200, [page]);
      }

      if (req.method === 'POST' && table === 'page_versions') {
        const exists = state.versions.some(
          (v) => v.page_id === body.page_id && v.version === body.version
        );
        if (exists) return send(409, { message: 'duplicate key value violates unique constraint' });
        const row = { id: randomUUID(), created_at: now, ...body };
        state.versions.push(row);
        return send(201, [row]);
      }

      if (req.method === 'DELETE' && table === 'page_versions') {
        const pageId = eq('page_id');
        const version = Number(eq('version'));
        state.versions = state.versions.filter(
          (v) => !(v.page_id === pageId && v.version === version)
        );
        return send(204);
      }

      if (req.method === 'GET' && table === 'page_versions') {
        const pageId = eq('page_id');
        const rows = state.versions
          .filter((v) => v.page_id === pageId)
          .sort((a, b) => b.version - a.version);
        return send(200, rows);
      }

      if (req.method === 'POST' && table === 'audit_logs') {
        state.audits.push(body);
        return send(201, []);
      }

      return send(404, { message: `mock has no route for ${req.method} ${table}` });
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        state,
        url: `http://127.0.0.1:${server.address().port}`,
      });
    });
  });
}

async function main() {
  // -------------------------------------------------------------------------
  await test('create + read page (file mode)', async () => {
    const dir = makeDir('geo-page-');
    resetGeoEnv(dir);
    const page = await geo.createPage('alpha', 'Alpha', { body: 'v1' }, 'tester');
    assert.strictEqual(page.version, 1);
    assert.strictEqual(page.status, 'draft');

    const read = await geo.getPage('alpha');
    assert(read, 'page should exist');
    assert.strictEqual(read.id, page.id);
    assert.deepStrictEqual(read.content, { body: 'v1' });

    const versions = await geo.listVersions('alpha');
    assert.strictEqual(versions.length, 1);
    assert.strictEqual(versions[0].version, 1);
  });

  // -------------------------------------------------------------------------
  await test('update advances version and preserves history', async () => {
    const updated = await geo.updatePage('alpha', { body: 'v2' }, 'tester', { expectedVersion: 1 });
    assert(updated);
    assert.strictEqual(updated.version, 2);

    const versions = await geo.listVersions('alpha');
    assert.deepStrictEqual(versions.map((v) => v.version), [2, 1]);
    assert.deepStrictEqual((await geo.getPage('alpha')).content, { body: 'v2' });
  });

  // -------------------------------------------------------------------------
  await test('stale update is rejected with no data loss', async () => {
    const before = await geo.getPage('alpha');
    const beforeVersions = await geo.listVersions('alpha');

    const error = await expectRejects(
      geo.updatePage('alpha', { body: 'stale-write' }, 'tester', { expectedVersion: 1 }),
      (e) => e instanceof geo.VersionConflictError,
      'stale update'
    );
    assert.strictEqual(error.expectedVersion, 1);
    assert.strictEqual(error.currentVersion, 2);

    const after = await geo.getPage('alpha');
    const afterVersions = await geo.listVersions('alpha');
    assert.deepStrictEqual(after.content, before.content, 'content must not be overwritten');
    assert.strictEqual(after.version, before.version);
    assert.strictEqual(afterVersions.length, beforeVersions.length, 'no partial version row');
  });

  // -------------------------------------------------------------------------
  await test('concurrent writers: exactly one wins, others conflict', async () => {
    const page = await geo.createPage('race', 'Race', { body: 'base' }, 'tester');
    assert.strictEqual(page.version, 1);

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        geo.updatePage('race', { body: `writer-${i}` }, 'tester', { expectedVersion: 1 })
      )
    );

    const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
    const rejected = attempts.filter((a) => a.status === 'rejected');
    assert.strictEqual(fulfilled.length, 1, 'exactly one write should succeed');
    assert.strictEqual(rejected.length, 7, 'all other writes should conflict');
    for (const r of rejected) {
      assert(r.reason instanceof geo.VersionConflictError, `unexpected rejection: ${r.reason}`);
    }

    const finalPage = await geo.getPage('race');
    assert.strictEqual(finalPage.version, 2);
    assert.deepStrictEqual(finalPage.content, fulfilled[0].value.content);
    assert.strictEqual((await geo.listVersions('race')).length, 2);
  });

  // -------------------------------------------------------------------------
  await test('rollback restores content as a new version', async () => {
    const page = await geo.createPage('roll', 'Roll', { body: 'original' }, 'tester');
    await geo.updatePage('roll', { body: 'changed' }, 'tester', { expectedVersion: page.version });

    const rolled = await geo.rollbackPage('roll', 1, 'tester', 2);
    assert(rolled);
    assert.strictEqual(rolled.version, 3);
    assert.deepStrictEqual(rolled.content, { body: 'original' });
    assert.deepStrictEqual((await geo.getPage('roll')).content, { body: 'original' });

    const versions = await geo.listVersions('roll');
    assert.deepStrictEqual(versions.map((v) => v.version), [3, 2, 1]);

    await expectRejects(
      geo.rollbackPage('roll', 2, 'tester', 2),
      (e) => e instanceof geo.VersionConflictError,
      'stale rollback'
    );
  });

  // -------------------------------------------------------------------------
  await test('duplicate slug is rejected', async () => {
    await expectRejects(
      geo.createPage('alpha', 'Alpha duplicate', {}, 'tester'),
      (e) => e instanceof geo.PageAlreadyExistsError,
      'duplicate slug'
    );
  });

  // -------------------------------------------------------------------------
  await test('update without expectedVersion still advances', async () => {
    const before = await geo.getPage('alpha');
    const updated = await geo.updatePage('alpha', { body: 'v3' }, 'tester');
    assert(updated);
    assert.strictEqual(updated.version, before.version + 1);
  });

  // -------------------------------------------------------------------------
  await test('Supabase network failure throws and does not touch files', async () => {
    const dir = makeDir('geo-sb-down-');
    resetGeoEnv(dir);
    process.env.SUPABASE_URL = 'https://supabase.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    global.fetch = async () => {
      throw new Error('simulated network outage');
    };

    await expectRejects(geo.getPage('anything'), (e) => e instanceof storage.StorageUnavailableError, 'getPage');
    await expectRejects(
      geo.createPage('anything', 'Anything', {}, 'tester'),
      (e) => e instanceof storage.StorageUnavailableError,
      'createPage'
    );
    assert.strictEqual(fs.existsSync(path.join(dir, 'pages.json')), false, 'must not fall back to JSON');
  });

  // -------------------------------------------------------------------------
  await test('Supabase HTTP error throws and does not touch files', async () => {
    const dir = makeDir('geo-sb-500-');
    resetGeoEnv(dir);
    process.env.SUPABASE_URL = 'https://supabase.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    global.fetch = async () => new Response('{"message":"boom"}', { status: 500 });

    await expectRejects(geo.getPage('anything'), (e) => e instanceof storage.StorageUnavailableError, 'getPage');
    assert.strictEqual(fs.existsSync(path.join(dir, 'pages.json')), false, 'must not fall back to JSON');
    global.fetch = realFetch;
  });

  // -------------------------------------------------------------------------
  await test('production runtime without Supabase fails closed', async () => {
    const dir = makeDir('geo-prod-');
    resetGeoEnv(dir);
    process.env.NODE_ENV = 'production';

    await expectRejects(geo.getPage('anything'), (e) => e instanceof storage.StorageUnavailableError, 'getPage');
    await expectRejects(
      geo.createPage('anything', 'Anything', {}, 'tester'),
      (e) => e instanceof storage.StorageUnavailableError,
      'createPage'
    );
    assert.strictEqual(fs.existsSync(path.join(dir, 'pages.json')), false, 'must not write in production');

    // Static generation during next build is allowed to use the snapshot.
    process.env.NEXT_PHASE = 'phase-production-build';
    const page = await geo.getPage('anything');
    assert.strictEqual(page, null);
    delete process.env.NEXT_PHASE;
  });

  // -------------------------------------------------------------------------
  await test('partial Supabase configuration is rejected', async () => {
    const dir = makeDir('geo-partial-');
    resetGeoEnv(dir);
    process.env.SUPABASE_URL = 'https://supabase.invalid';

    const error = await expectRejects(
      geo.getPage('anything'),
      (e) => e instanceof storage.StorageUnavailableError,
      'getPage'
    );
    assert(error.message.includes('incomplete'), `expected incomplete-config message, got: ${error.message}`);
  });

  // -------------------------------------------------------------------------
  await test('jobs, runs, approvals and audit persist correctly', async () => {
    const dir = makeDir('geo-ops-');
    resetGeoEnv(dir);

    const job = await geo.createJob('refresh-content', { scope: 'faq' });
    assert.strictEqual(job.status, 'pending');
    await geo.updateJob(job.id, 'completed');

    const run = await geo.createRun(job.id);
    assert.strictEqual(run.status, 'running');
    await geo.finishRun(run.id, 'success', { updated: 2 });

    const approval = await geo.createApproval('site_page', 'alpha', { body: 'proposed' });
    assert.strictEqual(approval.status, 'pending');
    await geo.reviewApproval(approval.id, 'approved', 'reviewer');
    await expectRejects(
      geo.reviewApproval(approval.id, 'rejected', 'reviewer'),
      (e) => e instanceof geo.InvalidStateError,
      'double approval review'
    );

    const jobs = JSON.parse(fs.readFileSync(path.join(dir, 'agent_jobs.json'), 'utf-8'));
    assert.strictEqual(jobs.find((j) => j.id === job.id).status, 'completed');

    const runs = JSON.parse(fs.readFileSync(path.join(dir, 'agent_runs.json'), 'utf-8'));
    const savedRun = runs.find((r) => r.id === run.id);
    assert.strictEqual(savedRun.status, 'success');
    assert.deepStrictEqual(savedRun.result, { updated: 2 });

    const approvals = JSON.parse(fs.readFileSync(path.join(dir, 'approval_requests.json'), 'utf-8'));
    assert.strictEqual(approvals.find((a) => a.id === approval.id).status, 'approved');

    const audit = JSON.parse(fs.readFileSync(path.join(dir, 'audit_logs.json'), 'utf-8'));
    const actions = audit.map((a) => a.action);
    assert(actions.includes('create_job'), 'audit should contain create_job');
    assert(actions.includes('create_approval'), 'audit should contain create_approval');
    assert(actions.includes('review_approval'), 'audit should contain review_approval');
  });

  // -------------------------------------------------------------------------
  await test('Supabase path: create/update/list/rollback (mock PostgREST)', async () => {
    const dir = makeDir('geo-mock-ok-');
    const mock = await startMockSupabase();
    try {
      resetGeoEnv(dir);
      process.env.SUPABASE_URL = mock.url;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

      const page = await geo.createPage('sb-page', 'Supabase Page', { body: 'v1' }, 'tester');
      assert.strictEqual(page.version, 1);
      assert.strictEqual(page.slug, 'sb-page');
      assert.strictEqual(mock.state.versions.length, 1, 'initial snapshot must exist');

      const updated = await geo.updatePage('sb-page', { body: 'v2' }, 'tester', { expectedVersion: 1 });
      assert(updated);
      assert.strictEqual(updated.version, 2);
      assert.strictEqual(mock.state.versions.length, 2, 'snapshot must exist before publish');

      const versions = await geo.listVersions('sb-page');
      assert.deepStrictEqual(versions.map((v) => v.version), [2, 1]);

      const rolled = await geo.rollbackPage('sb-page', 1, 'tester', 2);
      assert(rolled);
      assert.strictEqual(rolled.version, 3);
      assert.deepStrictEqual(rolled.content, { body: 'v1' });

      await expectRejects(
        geo.createPage('sb-page', 'Duplicate', {}, 'tester'),
        (e) => e instanceof geo.PageAlreadyExistsError,
        'duplicate slug'
      );

      assert.strictEqual(fs.existsSync(path.join(dir, 'pages.json')), false, 'no file fallback');
      assert(mock.state.audits.some((a) => a.action === 'create_page'), 'audit written');
      assert(mock.state.audits.some((a) => a.action === 'update_page'), 'update audited');
    } finally {
      await new Promise((resolve) => mock.server.close(resolve));
    }
  });

  // -------------------------------------------------------------------------
  await test('Supabase path: CAS conflict removes the orphan snapshot', async () => {
    const dir = makeDir('geo-mock-cas-');
    const mock = await startMockSupabase();
    try {
      resetGeoEnv(dir);
      process.env.SUPABASE_URL = mock.url;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

      const page = await geo.createPage('cas-page', 'CAS Page', { body: 'v1' }, 'tester');
      assert.strictEqual(mock.state.versions.length, 1);

      // Force the page to move between our read and our compare-and-swap.
      mock.state.bumpBeforePatch = true;

      const error = await expectRejects(
        geo.updatePage('cas-page', { body: 'lost-write' }, 'tester', { expectedVersion: 1 }),
        (e) => e instanceof geo.VersionConflictError,
        'CAS conflict'
      );
      assert.strictEqual(error.expectedVersion, 1);

      const snapshots = mock.state.versions.filter((v) => v.page_id === page.id);
      assert.strictEqual(snapshots.length, 1, 'orphan snapshot must be deleted');
      assert.deepStrictEqual(snapshots[0].content, { body: 'v1' });

      const finalPage = await geo.getPage('cas-page');
      assert.deepStrictEqual(finalPage.content, { body: 'v1' }, 'content must not be overwritten');
    } finally {
      await new Promise((resolve) => mock.server.close(resolve));
    }
  });

  // -------------------------------------------------------------------------
  await test('content store: concurrent saves do not lose data', async () => {
    const dir = makeDir('content-race-');
    process.env.CONTENT_STORE_PATH = path.join(dir, 'content.json');
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NODE_ENV = 'test';

    await Promise.all(
      Array.from({ length: 10 }, (_, i) => content.setContent({ keywords: [`K${i}`] }))
    );
    const afterKeywords = await content.getContent();
    for (let i = 0; i < 10; i++) {
      assert(afterKeywords.keywords.includes(`K${i}`), `lost keyword K${i}`);
    }

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        content.setContent({ faqs: [{ q: `Q${i}`, a: `A${i}` }] })
      )
    );
    const afterFaqs = await content.getContent();
    assert.strictEqual(afterFaqs.faqs.length, 11, 'default FAQ + 10 concurrent FAQs');
    for (let i = 0; i < 10; i++) {
      assert(afterFaqs.faqs.some((f) => f.q === `Q${i}`), `lost FAQ Q${i}`);
    }
  });

  // -------------------------------------------------------------------------
  await test('content store: contact save and retrieve', async () => {
    const saved = await content.setContent({
      contact: {
        phone: '+966500000000',
        phoneDisplay: '+966 50 000 0000',
        whatsapp: 'https://wa.me/966500000000',
        email: 'test@example.test',
      },
    });
    assert.strictEqual(saved.contact.email, 'test@example.test');

    const read = await content.getContent();
    assert.strictEqual(read.contact.phone, '+966500000000');
    assert.strictEqual(read.contact.whatsapp, 'https://wa.me/966500000000');
  });

  // -------------------------------------------------------------------------
  await test('content store: production without Supabase fails closed', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PHASE;
    process.env.NODE_ENV = 'production';

    await expectRejects(
      content.getContent(),
      (e) => e instanceof storage.StorageUnavailableError,
      'getContent'
    );
    await expectRejects(
      content.setContent({ goldenParagraph: 'x' }),
      (e) => e instanceof storage.StorageUnavailableError,
      'setContent'
    );
  });
}

main()
  .catch((error) => {
    results.push({ name: 'unexpected test-runner error', pass: false, detail: error.message });
    console.error(error);
  })
  .finally(() => {
    restoreEnv();
    const passed = results.filter((r) => r.pass).length;
    const failed = results.length - passed;
    console.log('\n' + JSON.stringify({ status: failed === 0 ? 'PASS' : 'FAIL', passed, failed, results }, null, 2));
    process.exit(failed === 0 ? 0 : 1);
  });
