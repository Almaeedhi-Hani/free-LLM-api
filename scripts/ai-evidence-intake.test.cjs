'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const route=fs.readFileSync('src/app/api/admin/ai-citation-samples/route.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/20261119_v3_ai_citation_reviewed_observations.sql','utf8');
const key=fs.readFileSync('src/lib/ai-citation-radar.ts','utf8');
for(const str of [
  "timingSafeEqual","getCompetitorDomains","analyzeAiCitationPanel",
  "process.env.AI_CITATION_CAPTURE_ENABLED!=='true'",
  "get('x-admin-secret')","evidence_not_reviewed_or_invalid",
  "observed_at=gte.","ai_evidence_sample_ceiling","duplicate_evidence",
  "'reviewed_observations_only'","'evidence_storage_pending'",
])assert(route.includes(str),'missing guarded evidence contract: '+str);
assert(route.indexOf('if(!isAdmin(req))')!==-1);
assert(!route.includes("https://api.openai.com")&&!route.includes("https://api.groq.com"),
 'manual evidence ingestion cannot trigger providers or charge money');
assert(!route.includes('method:"DELETE"')&&!route.includes("method:'DELETE'"),
 'append-only evidence cannot be removed by route');
for(const str of [
 'ai_citation_panel_observations','ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.ai_citation_panel_observations FROM PUBLIC,anon,authenticated',
 'GRANT SELECT,INSERT ON TABLE public.ai_citation_panel_observations TO service_role',
 "measurement_type IN ('model_only','search_grounded','manual_ai_search')",
 'UNIQUE(provider,prompt_id,answer_evidence_url)'
])assert(sql.includes(str),'missing AI evidence storage invariant: '+str);
assert(!/\bDROP\s+TABLE\b/i.test(sql));
assert(!/\bGRANT\s+(?:ALL|UPDATE|DELETE)\b/i.test(sql));
assert(key.includes("const minimumRepetitions = 3"));
assert(key.includes("contributes_search_visibility: measurement_type !== 'model_only'"));
assert(key.includes("evidence_reviewed !== true"));
console.log('PASS AI reviewed evidence: admin auth, opt-in, append-only RLS, no false model-only citations');
