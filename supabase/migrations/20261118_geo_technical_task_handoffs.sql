-- Controlled handoff of editorial technical-SEO and internal-link proposals
-- to GitHub Issues, where a coding agent can create a tested PR. It is NOT
-- evidence that code is already changed or that a production deploy succeeded.
CREATE TABLE IF NOT EXISTS public.geo_technical_task_handoffs (
  item_id text PRIMARY KEY CHECK (length(item_id) BETWEEN 8 AND 128),
  kind text NOT NULL CHECK (kind IN ('technical_seo','internal_link')),
  title text NOT NULL CHECK (length(title) BETWEEN 5 AND 300),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','issue_open','blocked')),
  github_issue_number integer UNIQUE,
  github_issue_url text,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (github_issue_number IS NULL OR github_issue_number > 0),
  CHECK (github_issue_url IS NULL OR github_issue_url ~
    '^https://github[.]com/Almaeedhi-Hani/free-LLM-api/issues/[0-9]+$'),
  CHECK ((status='issue_open')=(github_issue_number IS NOT NULL AND github_issue_url IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS geo_technical_task_handoffs_updated_at_idx
  ON public.geo_technical_task_handoffs(updated_at DESC);
ALTER TABLE public.geo_technical_task_handoffs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.geo_technical_task_handoffs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.geo_technical_task_handoffs TO service_role;
