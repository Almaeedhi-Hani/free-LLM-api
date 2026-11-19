-- V3 AI citation evidence: append-only operator-reviewed observations.
-- Proposed schema only. Not applied to live Supabase without separate approval.
-- This does NOT measure or call any AI search provider by itself.
CREATE TABLE IF NOT EXISTS public.ai_citation_panel_observations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 80),
 prompt_id text NOT NULL CHECK (length(prompt_id) BETWEEN 1 AND 80),
 measurement_type text NOT NULL CHECK (
   measurement_type IN ('model_only','search_grounded','manual_ai_search')
 ),
 observed_at timestamptz NOT NULL,
 answer_evidence_url text NOT NULL CHECK (
   length(answer_evidence_url) BETWEEN 12 AND 2000
   AND answer_evidence_url LIKE 'https://%'
 ),
 observation jsonb NOT NULL CHECK (jsonb_typeof(observation)='object'),
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,prompt_id,answer_evidence_url)
);
CREATE INDEX IF NOT EXISTS ai_citation_panel_observations_recent
 ON public.ai_citation_panel_observations(observed_at DESC,measurement_type);
ALTER TABLE public.ai_citation_panel_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_citation_panel_observations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.ai_citation_panel_observations TO service_role;
-- No UPDATE/DELETE: preserve reviewer-confirmed evidence history.
