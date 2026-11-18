-- Guarded, auditable automatic GEO publishing. Additive migration; default disabled.
-- Every state mutation is atomic with the published-content row.
create table if not exists public.geo_publication_settings (
  id integer primary key check (id = 1),
  enabled boolean not null default false,
  daily_limit integer not null default 1 check (daily_limit between 1 and 3),
  updated_at timestamptz not null default now()
);
insert into public.geo_publication_settings (id,enabled,daily_limit)
values (1,false,1) on conflict (id) do nothing;

create table if not exists public.geo_publication_events (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  content_fingerprint text not null,
  target_path text not null,
  language text not null check (language in ('ar','en','zh')),
  status text not null default 'published' check (status in ('published','rolled_back')),
  before_item jsonb not null,
  after_item jsonb not null,
  source_urls jsonb not null,
  published_at timestamptz not null default now(),
  rolled_back_at timestamptz,
  unique(item_id,content_fingerprint)
);
create index if not exists geo_publication_events_at_idx on public.geo_publication_events(published_at desc);

alter table public.geo_publication_settings enable row level security;
alter table public.geo_publication_events enable row level security;
revoke all on public.geo_publication_settings from public,anon,authenticated;
revoke all on public.geo_publication_events from public,anon,authenticated;
grant select,insert,update on public.geo_publication_settings to service_role;
grant select,insert,update on public.geo_publication_events to service_role;

-- One lock governs both the daily quota and content-state transition.
-- All checks are repeated in SQL; a malformed or stale worker cannot bypass them.
create or replace function public.geo_commit_auto_publication(p_item_id text,p_verified_urls jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_enabled boolean; v_limit integer; v_content jsonb; v_array jsonb; v_item jsonb;
  v_new jsonb; v_index integer; v_count integer; v_now timestamptz := now();
  v_url jsonb; v_valid boolean; v_fingerprint text; v_target text; v_event uuid;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
    raise exception 'Forbidden';
  end if;
  select enabled,daily_limit into v_enabled,v_limit
    from public.geo_publication_settings where id=1 for update;
  if not found or not v_enabled then return jsonb_build_object('status','disabled'); end if;
  if v_limit not between 1 and 3 then raise exception 'Invalid publication limit'; end if;
  if p_item_id is null or length(p_item_id) not between 8 and 128 then raise exception 'Bad item id'; end if;
  if jsonb_typeof(p_verified_urls) is distinct from 'array'
    or jsonb_array_length(p_verified_urls) not between 1 and 5 then raise exception 'Official URLs required'; end if;

  select content into v_content from public.content_store where id=1 for update;
  if not found then raise exception 'Content storage unavailable'; end if;
  v_array:=v_content->'editorialItems';
  if jsonb_typeof(v_array) is distinct from 'array' then raise exception 'Editorial content missing'; end if;
  select a.value,(a.ordinality::integer-1) into v_item,v_index
    from jsonb_array_elements(v_array) with ordinality as a(value,ordinality)
    where a.value->>'id'=p_item_id limit 1;
  if not found then return jsonb_build_object('status','missing'); end if;
  if v_item->>'status'<>'pending' or v_item->>'risk_level'<>'low'
    or v_item->>'kind' not in ('guide','comparison') then
    return jsonb_build_object('status','review_required');
  end if;
  if v_item->>'lang' not in ('ar','en','zh')
    or v_item->>'slug' is null
    or v_item->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or v_item->>'target' is distinct from v_item->>'slug'
    or length(v_item->>'slug')>90 then raise exception 'Invalid guarded publication route'; end if;
  if coalesce(length(v_item->>'body'),0)<100 or coalesce(length(v_item->>'title'),0)<6
    or jsonb_typeof(v_item->'evidence_ids') is distinct from 'array'
    or jsonb_array_length(v_item->'evidence_ids')=0 then
    return jsonb_build_object('status','insufficient_evidence');
  end if;
  -- The reference must already exist in saved evidence, be explicitly an
  -- official-candidate reference and be hosted on a government domain.
  for v_url in select value from jsonb_array_elements(p_verified_urls) loop
    if jsonb_typeof(v_url) is distinct from 'string'
      or length(v_url #>> '{}')>1000
      or (v_url #>> '{}') !~* '^https://([a-z0-9-]+\.)*gov\.sa(/|$)' then
        raise exception 'Invalid official reference';
    end if;
    select exists(select 1 from jsonb_array_elements(
      case when jsonb_typeof(v_item->'evidence_refs')='array'
           then v_item->'evidence_refs' else '[]'::jsonb end) x
      where x->>'url'=(v_url #>> '{}')
        and x->>'kind' in ('official_candidate','official-manual'))
      into v_valid;
    if not v_valid then raise exception 'Reference not in recorded official research'; end if;
  end loop;
  if (select count(distinct value) from jsonb_array_elements_text(p_verified_urls))<>
     jsonb_array_length(p_verified_urls) then raise exception 'Duplicate official sources'; end if;
  select count(*) into v_count from public.geo_publication_events
   where published_at > v_now - interval '24 hours';
  if v_count >= v_limit then return jsonb_build_object('status','quota_reached'); end if;
  -- Do not silently override another published revision of the same route.
  if exists(select 1 from jsonb_array_elements(v_array) other
    where other->>'id'<>p_item_id and other->>'status'='approved'
      and other->>'lang'=v_item->>'lang'
      and other->>'kind' in ('guide','comparison')
      and other->>'slug'=v_item->>'slug') then
    return jsonb_build_object('status','route_conflict');
  end if;
  v_fingerprint:=pg_catalog.md5(v_item::text);
  if exists(select 1 from public.geo_publication_events
    where item_id=p_item_id and content_fingerprint=v_fingerprint) then
    return jsonb_build_object('status','already_processed');
  end if;
  v_target:=case when v_item->>'lang'='ar' then '' else '/'||(v_item->>'lang') end
    ||'/insights/'||(v_item->>'slug');
  v_new:=v_item||jsonb_build_object('status','approved','reviewedAt',v_now::text,
    'updatedAt',v_now::text,'verified_sources',p_verified_urls,
    'auto_published',true,'auto_published_at',v_now::text);
  update public.content_store set content=pg_catalog.jsonb_set(
    v_content,array['editorialItems',v_index::text],v_new),updated_at=v_now where id=1;
  insert into public.geo_publication_events
    (item_id,content_fingerprint,target_path,language,before_item,after_item,source_urls)
  values (p_item_id,v_fingerprint,v_target,v_item->>'lang',v_item,v_new,p_verified_urls)
  returning id into v_event;
  return jsonb_build_object('status','published','event_id',v_event,'target_path',v_target);
end $$;

-- One-step rollback only if the exact automatic version is still live.
create or replace function public.geo_rollback_auto_publication(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_event public.geo_publication_events%rowtype;
  v_content jsonb;v_array jsonb;v_index integer;v_current jsonb;
begin
  if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
    raise exception 'Forbidden';
  end if;
  select * into v_event from public.geo_publication_events
    where id=p_event_id for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if v_event.status<>'published' then return jsonb_build_object('status','already_rolled_back'); end if;
  select content into v_content from public.content_store where id=1 for update;
  v_array:=v_content->'editorialItems';
  select a.value,(a.ordinality::integer-1) into v_current,v_index
    from jsonb_array_elements(v_array) with ordinality a(value,ordinality)
    where a.value->>'id'=v_event.item_id limit 1;
  if not found or v_current is distinct from v_event.after_item then
    return jsonb_build_object('status','conflict','message','Published version has changed; manual review required');
  end if;
  update public.content_store set content=pg_catalog.jsonb_set(
    v_content,array['editorialItems',v_index::text],v_event.before_item),
    updated_at=now() where id=1;
  update public.geo_publication_events set status='rolled_back',rolled_back_at=now()
    where id=p_event_id;
  return jsonb_build_object('status','rolled_back','event_id',p_event_id,
    'target_path',v_event.target_path);
end $$;

revoke all on function public.geo_commit_auto_publication(text,jsonb) from public,anon,authenticated;
revoke all on function public.geo_rollback_auto_publication(uuid) from public,anon,authenticated;
grant execute on function public.geo_commit_auto_publication(text,jsonb) to service_role;
grant execute on function public.geo_rollback_auto_publication(uuid) to service_role;
