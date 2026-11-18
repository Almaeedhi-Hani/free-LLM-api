'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {compareRevisionImpact,compareRevisionLeads,rankObservedRevisions}=
 require('../.impact-test-build/lib/geo-impact-experiments.js');
const property='https://example.test/';
const event={id:'pub-001',item_id:'ed-001',target_path:'/en/insights/saudi-investment-guide',
 published_at:'2026-10-20T05:43:00Z',status:'published',language:'en'};
const asOf=new Date('2026-11-10T10:00:00Z');
const start=Date.UTC(2026,9,20);
const DAY=86400000;
const rows=[];
for(let offset=-7;offset<=7;offset++){
 if(!offset)continue;
 const date=new Date(start+offset*DAY).toISOString().slice(0,10);
 rows.push({property,metric_date:date,dimension:'page',
  dimension_value:property+'en/insights/saudi-investment-guide',
  clicks:offset<0?1:3,impressions:offset<0?10:20,position:offset<0?8:4,
  captured_at:'2026-11-01T00:00:00Z'});
}
const measured=compareRevisionImpact(event,rows,7,property,asOf);
assert.equal(measured.status,'measured');
assert.equal(measured.before.clicks,7);
assert.equal(measured.after.clicks,21);
assert.equal(measured.before.impressions,70);
assert.equal(measured.after.impressions,140);
assert.equal(measured.change.clicks,14);
assert.equal(measured.change.impressions,70);
assert.equal(measured.change.position,-4,'decreasing average Google position is improvement');
assert.equal(measured.score,14,'ranking based only on observed click change');
const notComplete=compareRevisionImpact(event,rows.slice(1),7,property,asOf);
assert.equal(notComplete.status,'insufficient_data');
assert.equal(notComplete.change,null,'missing GSC days must not become fake zero');
assert.equal(compareRevisionImpact(event,rows,7,property,new Date('2026-10-25')).status,'awaiting_post_window');
assert.equal(compareRevisionImpact(event,rows,7,'sc-domain:example.test',asOf).status,'insufficient_data');
assert.equal(compareRevisionImpact({...event,target_path:'https://elsewhere.test/'},rows,7,property,asOf).status,'invalid_revision');
const sorted=rankObservedRevisions([notComplete,measured]);
assert.equal(sorted[0].status,'measured');
assert.equal(sorted[1].status,'insufficient_data');
const leads=[
 {source_path:event.target_path,attribution:'client_reported',occurred_at:'2026-10-14T10:00:00Z',locale:'en'},
 {source_path:event.target_path,attribution:'client_reported',occurred_at:'2026-10-22T10:00:00Z',locale:'en'},
 {source_path:event.target_path,attribution:'client_reported',occurred_at:'2026-10-24T10:00:00Z',locale:'en'},
 {source_path:event.target_path,attribution:'form_page',occurred_at:'2026-10-24T10:00:00Z',locale:'en'}
];
const confirmed=compareRevisionLeads(event,leads,7,'2026-10-01T00:00:00Z',asOf);
assert.equal(confirmed.status,'measured');
assert.deepEqual([confirmed.before,confirmed.after,confirmed.change],[1,2,1]);
assert.equal(compareRevisionLeads(event,leads,7,'2026-10-14T00:00:00Z',asOf).status,'unavailable',
 'no historical baseline before instrumentation');
assert.equal(compareRevisionLeads(event,leads,7,null,asOf).status,'unavailable');
const sql=fs.readFileSync('supabase/migrations/20261118_impact_ai_evidence.sql','utf8');
for(const clause of ['impact_ai_observations','manual_documented','ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON public.impact_ai_observations FROM PUBLIC,anon,authenticated',
 'impact_measurement_epochs','lead_tracking_started_at'])
 assert(sql.includes(clause),'Missing evidence provenance or RLS: '+clause);
const experiments=fs.readFileSync('src/app/api/admin/impact-experiments/route.ts','utf8');
assert(experiments.includes('geo_publication_events?')&&experiments.includes('gsc_daily_metrics?'));
assert(experiments.includes('impact_lead_events?')&&experiments.includes('impact_measurement_epochs?'));
assert(experiments.includes('if(!authorized(req))'));
assert(!experiments.includes('select:name,email,phone'),'no client PII in experiment reporting');
const ai=fs.readFileSync('src/app/api/admin/impact-ai/route.ts','utf8');
assert(ai.includes('manual_documented')&&ai.includes('if(!authorized(req))'));
assert(ai.includes('evidence_url')&&!ai.includes('independently_verified'));
const center=fs.readFileSync('src/components/ContentImpactCenter.tsx','utf8');
assert(center.includes('<GeoImpactExperiments adminSecret={adminSecret} days={days}/>'));
const page=fs.readFileSync('src/components/GeoImpactExperiments.tsx','utf8');
assert(page.includes('لا يمكن ترتيب هذا التحسين')&&page.includes('رابط العينة'));
console.log('PASS GEO impact: real page pre/post windows, no fabricated missing days, truthful lead baseline, ranking and AI evidence RLS');
