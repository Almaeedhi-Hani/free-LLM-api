-- PostgREST v14+ exposes the request's authenticated database role via
-- SET LOCAL ROLE and request.jwt.claims, not the deprecated
-- request.jwt.claim.role GUC. Preserve the service-role-only boundary.
-- Source-count / sensitivity policy is unchanged by this migration.
DO $fix$
DECLARE
  row record;
  definition text;
  legacy text := 'current_setting(''request.jwt.claim.role'',true)';
  modern text := 'current_setting(''role'',true)';
  changed integer := 0;
BEGIN
  FOR row IN
    SELECT p.oid,p.proname,
      pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
    AND p.proname IN (
      'geo_commit_auto_publication','geo_rollback_auto_publication',
      'geo_commit_auto_faq','geo_rollback_auto_faq'
    )
  LOOP
    definition:=pg_catalog.pg_get_functiondef(row.oid);
    IF pg_catalog.strpos(definition,legacy)=0 THEN
      RAISE EXCEPTION 'Unexpected authorization contract for %',row.proname;
    END IF;
    IF pg_catalog.strpos(definition,'SECURITY DEFINER')=0 OR
       pg_catalog.strpos(definition,'SET search_path TO')=0 THEN
      RAISE EXCEPTION 'Unexpected function security flags for %',row.proname;
    END IF;
    EXECUTE pg_catalog.replace(definition,legacy,modern);
    changed:=changed+1;
  END LOOP;
  IF changed<>4 THEN RAISE EXCEPTION 'Expected 4 GEO functions, found %',changed; END IF;
END
$fix$;

-- The functions keep their existing EXECUTE grants: service_role only.
-- SECURITY DEFINER still runs under the function owner; the trusted role
-- GUC retains PostgREST's authenticated SET LOCAL ROLE.
