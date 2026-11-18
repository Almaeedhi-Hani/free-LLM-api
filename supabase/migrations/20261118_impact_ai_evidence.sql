-- Admin-only, evidence-linked observations of AI answer visibility.
-- Links are submitted by an authorized reviewer, not autonomously verified.
-- No user questions/chat content, client identities or secrets are retained.
CREATE TABLE IF NOT EXISTS public.impact_ai_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 observed_at timestamptz NOT NULL DEFAULT now(),
 provider text NOT NULL CHECK(provider IN ('ChatGPT','Gemini','Perplexity','Google AI Overview','Other')),
 page_path text NOT NULL CHECK(length(page_path)<=180 AND
  page_path ~ '^/(en/|zh/)?(insights/[a-z0-9]+(-[a-z0-9]+)*|services/(company-formation|misa-license|corporate-banking|contract-drafting|premium-residency|investment-funds)|packages)?/?$'),
 search_question text NOT NULL CHECK(length(search_question) BETWEEN 5 AND 240),
 result text NOT NULL CHECK(result IN ('cited','mentioned','not_observed')),
 evidence_url text NOT NULL CHECK(length(evidence_url) BETWEEN 12 AND 1500 AND
   evidence_url ~* '^https://[a-z0-9][-a-z0-9.]+[a-z0-9](/|$)' AND evidence_url !~ '[@#]'),
 verification_status text NOT NULL DEFAULT 'manual_documented'
   CHECK(verification_status='manual_documented'),
 UNIQUE(provider,page_path,search_question,result,evidence_url)
);
CREATE INDEX IF NOT EXISTS impact_ai_observations_date
 ON public.impact_ai_observations(observed_at DESC);
ALTER TABLE public.impact_ai_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.impact_ai_observations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.impact_ai_observations TO service_role;

-- Conservative origin of reliable per-page lead tracking; no historical
-- events are backfilled as if their conversion attribution were known.
CREATE TABLE IF NOT EXISTS public.impact_measurement_epochs(
 id integer PRIMARY KEY CHECK(id=1),
 lead_tracking_started_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.impact_measurement_epochs(id) VALUES(1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.impact_measurement_epochs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.impact_measurement_epochs FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.impact_measurement_epochs TO service_role;
