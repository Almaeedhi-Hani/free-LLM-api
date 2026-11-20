#!/usr/bin/env bash
# Disposable localhost PostgreSQL 17 ONLY. No external API or live publication.
set -euo pipefail
test "${PGHOST:-}" = localhost || { echo 'FAIL: localhost-only DB required'; exit 1; }
test "${PGUSER:-}" = postgres || { echo 'FAIL: isolated postgres user required'; exit 1; }
test "${PGDATABASE:-}" = phase1_test || { echo 'FAIL: disposable database sentinel missing'; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

for db in phase1_same phase1_mixed phase1_rollback; do
 createdb "$db"
 PGDATABASE="$db" psql -X -q -v ON_ERROR_STOP=1 -f tests/sql/phase1-publication-concurrency-fixture.sql
done

wait_for_lock_holder() {
 local db="$1" name="$2" n active
 for n in $(seq 1 50); do
  active="$(PGDATABASE="$db" psql -X -qAt -v ON_ERROR_STOP=1 -c \
    "select count(*) from pg_stat_activity where datname=current_database() and application_name='$name' and state='active' and query like '%pg_sleep(2)%';")"
  if [[ "$active" == "1" ]]; then return 0; fi
  sleep 0.05
 done
 echo "FAIL: $name did not hold an overlapping database transaction" >&2
 exit 1
}
start_leader() {
 local db="$1" label="$2" expr="$3"
 PGDATABASE="$db" PGAPPNAME="phase1-leader-$label" psql -X -qAt -v ON_ERROR_STOP=1 >"$tmp/$label.out" 2>"$tmp/$label.err" <<SQL &
SET request.jwt.claim.role = 'service_role';
BEGIN;
SELECT ($expr)->>'status';
SELECT pg_sleep(2);
COMMIT;
SQL
 LEADER_PID=$!
 wait_for_lock_holder "$db" "phase1-leader-$label"
}
run_rpc() {
 local db="$1" label="$2" expr="$3"
 PGDATABASE="$db" psql -X -qAt -v ON_ERROR_STOP=1 >"$tmp/$label.out" 2>"$tmp/$label.err" <<SQL
SET request.jwt.claim.role = 'service_role';
SELECT ($expr)->>'status';
SQL
}
assert_status() {
 local label="$1" expected="$2"
 if ! grep -Fqx "$expected" "$tmp/$label.out"; then
  echo "FAIL: $label did not return $expected" >&2
  cat "$tmp/$label.err" >&2
  cat "$tmp/$label.out" >&2
  exit 1
 fi
}

# Scenario A: W01 holds the real row lock and W03 attempts same item.
start_leader phase1_same same-w01 "public.geo_commit_auto_publication('ed-race-isolated-01','[]'::jsonb)"
run_rpc phase1_same same-w03 "public.geo_commit_auto_publication('ed-race-isolated-01','[]'::jsonb)" &
race_pid=$!
wait "$LEADER_PID"
wait "$race_pid"
assert_status same-w01 published
assert_status same-w03 invalid_state
same_events="$(PGDATABASE=phase1_same psql -X -qAt -v ON_ERROR_STOP=1 -c 'select count(*) from public.geo_publication_events;')"
test "$same_events" = 1 || { echo "FAIL: duplicate publication count=$same_events" >&2; exit 1; }
echo 'PASS phase1 same-item W01/W03 race: one transaction published, other rejected'

# Scenario B: W01/W03 editorial attempts contend against a FAQ publication.
# Shared cap must remain 3 across both source categories in real DB sessions.
start_leader phase1_mixed mixed-faq "public.geo_commit_auto_faq('Which documents are relevant to an isolated test FAQ?')"
pids=()
run_rpc phase1_mixed mixed-w01-a "public.geo_commit_auto_publication('ed-race-isolated-01','[]'::jsonb)" & pids+=("$!")
run_rpc phase1_mixed mixed-w03-b "public.geo_commit_auto_publication('ed-race-isolated-02','[]'::jsonb)" & pids+=("$!")
run_rpc phase1_mixed mixed-w01-c "public.geo_commit_auto_publication('ed-race-isolated-03','[]'::jsonb)" & pids+=("$!")
run_rpc phase1_mixed mixed-w03-d "public.geo_commit_auto_publication('ed-race-isolated-04','[]'::jsonb)" & pids+=("$!")
wait "$LEADER_PID"
for pid in "${pids[@]}"; do wait "$pid"; done
assert_status mixed-faq published

published=0
quota=0
for label in mixed-w01-a mixed-w03-b mixed-w01-c mixed-w03-d; do
 if grep -Fqx published "$tmp/$label.out"; then
  published=$((published+1))
 elif grep -Fqx quota_reached "$tmp/$label.out"; then
  quota=$((quota+1))
 else
  echo "FAIL: unexpected result from $label" >&2
  cat "$tmp/$label.out" >&2
  cat "$tmp/$label.err" >&2
  exit 1
 fi
done
test "$published" -eq 2 && test "$quota" -eq 2 || {
 echo "FAIL: expected 2 published and 2 quota_reached; found $published / $quota" >&2; exit 1;
}

PGDATABASE=phase1_mixed psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
DO $check$
DECLARE e integer; f integer; duplicates integer; approved integer; live_faq integer;
BEGIN
 SELECT count(*) INTO e FROM public.geo_publication_events WHERE status='published';
 SELECT count(*) INTO f FROM public.geo_faq_publication_events WHERE status='published';
 SELECT count(*) INTO duplicates FROM (
  SELECT item_id,content_fingerprint FROM public.geo_publication_events
   GROUP BY item_id,content_fingerprint HAVING count(*)>1
  UNION ALL
  SELECT item_id,content_fingerprint FROM public.geo_faq_publication_events
   GROUP BY item_id,content_fingerprint HAVING count(*)>1
 ) d;
 SELECT count(*) INTO approved FROM public.content_store c,
  jsonb_array_elements(c.content->'editorialItems') item
  WHERE item->>'status'='approved';
 SELECT jsonb_array_length(content->'faqs') INTO live_faq FROM public.content_store WHERE id=1;
 IF e<>2 OR f<>1 OR e+f<>3 OR approved<>2 OR live_faq<>1 OR duplicates<>0 THEN
  RAISE EXCEPTION 'Publisher race: editorial=% FAQ=% approved=% liveFAQ=% duplicates=%',
   e,f,approved,live_faq,duplicates;
 END IF;
 IF (SELECT daily_limit FROM public.geo_publication_settings WHERE id=1)<>3 THEN
  RAISE EXCEPTION 'Shared quota altered'; END IF;
END
$check$;
SQL
echo 'PASS phase1 real simultaneous PostgreSQL editorial/FAQ transactions: shared 3 cap, consistent content, no duplicates'


# Scenario C: real SQL publisher rollback, repeated rollbacks, stale replays,
# and a concurrent human edit conflict. Each call targets disposable DB only.
run_rpc phase1_rollback rollback-ed-first "public.geo_commit_auto_publication('ed-race-isolated-01','[]'::jsonb)"
assert_status rollback-ed-first published
run_rpc phase1_rollback rollback-faq-first "public.geo_commit_auto_faq('Which documents are relevant to an isolated test FAQ?')"
assert_status rollback-faq-first published

run_rpc phase1_rollback rollback-ed-already-live "public.geo_commit_auto_publication('ed-race-isolated-01','[]'::jsonb)"
assert_status rollback-ed-already-live invalid_state
run_rpc phase1_rollback rollback-faq-already-live "public.geo_commit_auto_faq('Which documents are relevant to an isolated test FAQ?')"
assert_status rollback-faq-already-live missing

run_rpc phase1_rollback rollback-ed-first-time "public.geo_rollback_auto_publication((SELECT id FROM public.geo_publication_events WHERE item_id='ed-race-isolated-01'))"
assert_status rollback-ed-first-time rolled_back
run_rpc phase1_rollback rollback-faq-first-time "public.geo_rollback_auto_faq((SELECT id FROM public.geo_faq_publication_events WHERE item_id='Which documents are relevant to an isolated test FAQ?'))"
assert_status rollback-faq-first-time rolled_back

run_rpc phase1_rollback rollback-ed-again "public.geo_rollback_auto_publication((SELECT id FROM public.geo_publication_events WHERE item_id='ed-race-isolated-01'))"
assert_status rollback-ed-again already_rolled_back
run_rpc phase1_rollback rollback-faq-again "public.geo_rollback_auto_faq((SELECT id FROM public.geo_faq_publication_events WHERE item_id='Which documents are relevant to an isolated test FAQ?'))"
assert_status rollback-faq-again already_rolled_back

# Rolled-back events retain their original unique fingerprints and count against
# the rolling quota; a stale replay must not generate a second event.
run_rpc phase1_rollback rollback-ed-replay "public.geo_commit_auto_publication('ed-race-isolated-01','[]'::jsonb)"
assert_status rollback-ed-replay already_processed
run_rpc phase1_rollback rollback-faq-replay "public.geo_commit_auto_faq('Which documents are relevant to an isolated test FAQ?')"
assert_status rollback-faq-replay already_processed

# New approved item, then a human alteration must cause conflict instead of
# silently overwriting their edit during a delayed automatic rollback.
run_rpc phase1_rollback rollback-ed-conflict-publish "public.geo_commit_auto_publication('ed-race-isolated-02','[]'::jsonb)"
assert_status rollback-ed-conflict-publish published
PGDATABASE=phase1_rollback psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
UPDATE public.content_store SET content=pg_catalog.jsonb_set(
 content,'{editorialItems,1,title}','"Manual title written after automatic publication"'::jsonb
) WHERE id=1;
SQL
run_rpc phase1_rollback rollback-ed-conflict "public.geo_rollback_auto_publication((SELECT id FROM public.geo_publication_events WHERE item_id='ed-race-isolated-02'))"
assert_status rollback-ed-conflict conflict

PGDATABASE=phase1_rollback psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
DO $check$
DECLARE e_rolled integer; e_published integer; f_rolled integer;
 ed_pending integer; faq_pending integer; live_faq integer; duplicate_groups integer;
BEGIN
 SELECT count(*) FILTER (WHERE status='rolled_back'),
        count(*) FILTER (WHERE status='published')
 INTO e_rolled,e_published FROM public.geo_publication_events;
 SELECT count(*) INTO f_rolled FROM public.geo_faq_publication_events
  WHERE status='rolled_back';
 SELECT count(*) INTO duplicate_groups FROM (
  SELECT item_id,content_fingerprint FROM public.geo_publication_events
  GROUP BY item_id,content_fingerprint HAVING count(*)>1
  UNION ALL
  SELECT item_id,content_fingerprint FROM public.geo_faq_publication_events
  GROUP BY item_id,content_fingerprint HAVING count(*)>1
 ) d;
 SELECT count(*) INTO ed_pending FROM public.content_store c,
  jsonb_array_elements(c.content->'editorialItems') editorial
  WHERE editorial->>'id'='ed-race-isolated-01' AND editorial->>'status'='pending';
 SELECT count(*) INTO faq_pending FROM public.content_store c,
  jsonb_array_elements(c.content->'drafts') draft
  WHERE draft->>'q'='Which documents are relevant to an isolated test FAQ?'
   AND draft->>'status'='pending';
 SELECT jsonb_array_length(content->'faqs') INTO live_faq FROM public.content_store WHERE id=1;
 IF e_rolled<>1 OR e_published<>1 OR f_rolled<>1 OR ed_pending<>1
    OR faq_pending<>1 OR live_faq<>0 OR duplicate_groups<>0 THEN
  RAISE EXCEPTION 'Rollback/replay mismatch: e_rolled=% e_published=% f_rolled=% ed_pending=% faq_pending=% live_faq=% duplicates=%',
   e_rolled,e_published,f_rolled,ed_pending,faq_pending,live_faq,duplicate_groups;
 END IF;
 IF (SELECT count(*) FROM public.content_store c,
     jsonb_array_elements(c.content->'editorialItems') editorial
     WHERE editorial->>'id'='ed-race-isolated-02'
      AND editorial->>'title'='Manual title written after automatic publication')<>1 THEN
  RAISE EXCEPTION 'Conflicting human edit lost';
 END IF;
 IF (SELECT count(*) FROM public.geo_publication_events)+
    (SELECT count(*) FROM public.geo_faq_publication_events)<>3 OR
    (SELECT daily_limit FROM public.geo_publication_settings WHERE id=1)<>3 THEN
  RAISE EXCEPTION 'Rollback replay added a duplicate publication or changed quota';
 END IF;
END
$check$;
SQL
echo 'PASS phase1 disposable PostgreSQL replay/rollback: exactly one event per fingerprint, idempotent rollback, manual edit conflict preserved'
