#!/usr/bin/env bash
# Disposable localhost PostgreSQL 17 ONLY. No external API or live publication.
set -euo pipefail
test "${PGHOST:-}" = localhost || { echo 'FAIL: localhost-only DB required'; exit 1; }
test "${PGUSER:-}" = postgres || { echo 'FAIL: isolated postgres user required'; exit 1; }
test "${PGDATABASE:-}" = phase1_test || { echo 'FAIL: disposable database sentinel missing'; exit 1; }
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

for db in phase1_same phase1_mixed; do
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
