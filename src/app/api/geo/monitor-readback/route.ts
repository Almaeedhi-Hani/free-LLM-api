import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/storage-mode";

const runHealth=require("@/lib/geo-run-health.cjs") as {geoReadback:(agent:unknown)=>Readback;radarReadback:(row:unknown)=>Readback};
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = "https://free-llm-api-1-didl.onrender.com";
const STORAGE = {
  W01: { table: "content_store", column: "updated_at", query: "select=content->agent&id=eq.1&limit=1" },
  W02: { table: "analysis_runs", column: "finished_at", query: "select=status,finished_at&run_type=eq.radar&order=started_at.desc&limit=1" },
  W03: { table: "audit_logs", column: "created_at", query: "select=created_at&action=eq.geo_publication_rpc_result&metadata->>source_workflow=eq.W03&order=created_at.desc&limit=1" },
  W04: { table: "gsc_sync_day_outcomes", column: "checked_at", query: "select=checked_at,metric_date,status&order=metric_date.desc,checked_at.desc&limit=1" }
} as const;

type JsonRow = Record<string, unknown>;
type Readback = { status: "observed"; latestTimestamp: string; source: string; metricDate?: string; dayStatus?: string; runOutcome?: string } | { status: "unknown"; note: string };
type GscMeasurement = { status: "observed"; grain: "total"; latestDate: string; impressions: number; clicks: number; observedDays: number } | { status: "unknown"; note: string };
type Unknown = { status: "unknown"; reason: string };
type Feedback = { status: "observed"; sampleSize: number; from: string; counts: Record<string, number> } | Unknown;
type Page = { status: "observed"; date: string; path: string; impressions: number; clicks: number; position: number | null } | Unknown;

const responseHeaders = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" };
function authorized(req: NextRequest): boolean {
  const key = process.env.GEO_API_KEY || "";
  const supplied = req.headers.get("x-geo-api-key") || "";
  if (!key || !supplied) return false;
  const a = Buffer.from(key), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function isDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v + "T00:00:00Z"));
}
function count(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
  const scope = req.nextUrl.searchParams.get("scope") || "watchdog";
  if (scope !== "weekly" && scope !== "watchdog")
    return NextResponse.json({ error: "Invalid scope" }, { status: 400, headers: responseHeaders });

  let credentials;
  try { credentials = getSupabaseCredentials(); }
  catch { return NextResponse.json({ error: "Storage unavailable" }, { status: 503, headers: responseHeaders }); }
  if (!credentials) return NextResponse.json({ error: "Storage unavailable" }, { status: 503, headers: responseHeaders });

  const now = Date.now();
  const header = { apikey: credentials.key, Authorization: `Bearer ${credentials.key}`, Accept: "application/json" };
  async function rows(table: string, query: string): Promise<JsonRow[]> {
    const res = await fetch(credentials!.url + "/rest/v1/" + table + "?" + query, {
      headers: header, cache: "no-store", signal: AbortSignal.timeout(11000)
    });
    if (!res.ok) throw new Error("readback_http_" + res.status);
    const value: unknown = await res.json();
    if (!Array.isArray(value)) throw new Error("invalid_readback_shape");
    return value as JsonRow[];
  }

  const storage = {} as Record<keyof typeof STORAGE, Readback>;
  await Promise.all((Object.keys(STORAGE) as Array<keyof typeof STORAGE>).map(async id => {
    const spec = STORAGE[id];
    try {
      const property=process.env.GSC_PROPERTY_URL||ORIGIN+'/';
      const list = await rows(spec.table, spec.query+(id==='W04'?'&property=eq.'+encodeURIComponent(property):''));
      if(id==="W01"||id==="W02"){
        const result=id==="W01"?runHealth.geoReadback(list[0]?.agent):runHealth.radarReadback(list[0]);
        storage[id]=result.status==="observed"&&Date.parse(result.latestTimestamp)>now?{status:"unknown",note:"future_run_timestamp"}:result;
        return;
      }
      const stamp = list[0]?.[spec.column];
      storage[id] = typeof stamp === "string" && Number.isFinite(Date.parse(stamp)) && Date.parse(stamp) <= now ?
        { status: "observed", latestTimestamp: stamp, source: spec.table, ...(id==='W04'&&isDate(list[0]?.metric_date)&&typeof list[0]?.status==='string'?{metricDate:list[0].metric_date,dayStatus:list[0].status}:{}) } :
        { status: "unknown", note: "no_valid_persisted_timestamp" };
    } catch { storage[id] = { status: "unknown", note: "storage_readback_unavailable" }; }
  }));

  const snapshot: {
    source: "supabase"; scope: string; checkedAt: string; storage: typeof storage;
    gsc?: GscMeasurement; weeklyEvidence?: { feedback: Feedback; page: Page };
  } = { source: "supabase", scope, checkedAt: new Date(now).toISOString(), storage };

  if (scope === "weekly") {
    try {
      const list = await rows("gsc_daily_metrics", "select=metric_date,impressions,clicks&dimension=eq.total&order=metric_date.desc&limit=7");
      if (!list.length) throw new Error("total_rows_absent");
      const seen = new Set<string>();
      for (const item of list) {
        const impressions = count(item.impressions), clicks = count(item.clicks);
        if (!isDate(item.metric_date) || seen.has(item.metric_date) || item.metric_date > new Date(now).toISOString().slice(0,10) ||
            impressions === null || clicks === null || clicks > impressions)
          throw new Error("invalid_total_measurements");
        seen.add(item.metric_date);
      }
      const latest = list[0];
      snapshot.gsc = { status: "observed", grain: "total", latestDate: latest.metric_date as string,
        impressions: Number(latest.impressions), clicks: Number(latest.clicks), observedDays: seen.size };
    } catch { snapshot.gsc = { status: "unknown", note: "gsc_total_unavailable" }; }

    const since = new Date(now - 7 * 86400000).toISOString();
    let feedback: Feedback = { status: "unknown", reason: "feedback_unavailable" };
    try {
      const list = await rows("geo_agent_feedback", "select=subject_type,decision,created_at&subject_type=eq.keyword&created_at=gte." +
        encodeURIComponent(since) + "&order=created_at.desc&limit=501");
      if (list.length > 500) throw new Error("feedback_truncated");
      const counts: Record<string, number> = { relevant: 0, irrelevant: 0, approved: 0, rejected: 0, accepted: 0, needs_review: 0, other: 0 };
      for (const item of list) {
        const at = Date.parse(String(item.created_at));
        if (item.subject_type !== "keyword" || typeof item.decision !== "string" || !Number.isFinite(at) ||
            at < Date.parse(since) || at > now) throw new Error("invalid_feedback");
        const label = Object.hasOwn(counts, item.decision) ? item.decision : "other";
        counts[label]++;
      }
      feedback = { status: "observed", sampleSize: list.length, from: since.slice(0,10), counts };
    } catch { feedback = { status: "unknown", reason: "feedback_unavailable" }; }

    let page: Page = { status: "unknown", reason: "page_unavailable" };
    try {
      const sinceDay = since.slice(0,10);
      const list = await rows("gsc_daily_metrics", "select=metric_date,dimension_value,impressions,clicks,position&dimension=eq.page&metric_date=gte." +
        sinceDay + "&order=impressions.desc,metric_date.desc&limit=5");
      for (const item of list) {
        let parsed: URL;
        try { parsed = new URL(String(item.dimension_value)); } catch { continue; }
        const imp = count(item.impressions), clicks = count(item.clicks);
        const position = item.position === null || item.position === undefined ? null : count(item.position);
        if (parsed.origin !== ORIGIN || parsed.search || parsed.hash ||
            !/^\/[a-z0-9/_-]*$/.test(parsed.pathname) || !isDate(item.metric_date) ||
            item.metric_date < sinceDay || item.metric_date > new Date(now).toISOString().slice(0,10) ||
            imp === null || clicks === null || clicks > imp || (item.position !== null && item.position !== undefined && position === null))
          continue;
        page = { status: "observed", date: item.metric_date, path: parsed.pathname,
          impressions: imp, clicks, position };
        break;
      }
    } catch { page = { status: "unknown", reason: "page_unavailable" }; }
    snapshot.weeklyEvidence = { feedback, page };
  }
  return NextResponse.json(snapshot, { headers: responseHeaders });
}
