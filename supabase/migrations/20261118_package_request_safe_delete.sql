-- Fix regression: a saved package request emits a privacy-minimized
-- conversion event, and a request's permanent deletion must NOT be blocked
-- by that event's original FK. Preserve aggregated event counts while
-- irreversibly unlinking deleted customer contact records.
-- Additive metadata column and constraint migration; no rows are deleted.
ALTER TABLE public.impact_lead_events
  ADD COLUMN IF NOT EXISTS event_id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.impact_lead_events
  DROP CONSTRAINT IF EXISTS impact_lead_events_request_id_fkey;
ALTER TABLE public.impact_lead_events
  DROP CONSTRAINT IF EXISTS impact_lead_events_pkey;
ALTER TABLE public.impact_lead_events
  ALTER COLUMN request_id DROP NOT NULL;

ALTER TABLE public.impact_lead_events
  ADD CONSTRAINT impact_lead_events_pkey PRIMARY KEY (event_id);
ALTER TABLE public.impact_lead_events
  ADD CONSTRAINT impact_lead_events_request_id_unique UNIQUE (request_id);
ALTER TABLE public.impact_lead_events
  ADD CONSTRAINT impact_lead_events_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES public.package_requests(id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.impact_lead_events.request_id IS
  'Nullable link to a package request. On personal-data deletion the event persists anonymously for aggregate reporting.';
-- RLS unchanged. service_role retains read/write privileges.
