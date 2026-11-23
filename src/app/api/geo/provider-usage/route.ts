import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/storage-mode";
import { logAudit } from "@/lib/geo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS = new Set(["exa","tavily","parallel","firecrawl","groq","gemini","nvidia","openrouter"]);
const HEADERS = { "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff" };
type Observation = {
 provider:string; http_status:number; observed_at:string; requests:number;
 tokens_used:number|null;daily_request_limit:number|null;daily_requests_remaining:number|null;
 daily_reset_seconds:number|null;other_rate_limit:number|null;other_rate_remaining:number|null;
 retry_after_seconds:number|null;rate_window:"day";other_rate_window:"unspecified";
};
type Recorded = {entity_id:string;created_at:string;metadata:Record<string,unknown>|null};
const limit = (v:unknown,max=1_000_000_000):v is number =>
 typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=max;
const optional = (v:unknown,max=1_000_000_000)=>v===null||limit(v,max);
function authorized(req:NextRequest){
 const key=process.env.GEO_API_KEY||"";
 const supplied=req.headers.get("x-geo-api-key")||"";
 const a=Buffer.from(key),b=Buffer.from(supplied);
 return Boolean(key)&&a.length===b.length&&timingSafeEqual(a,b);
}
function valid(value:unknown):value is Observation {
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const x=value as Partial<Observation>;
 return typeof x.provider==="string"&&PROVIDERS.has(x.provider)&&
  limit(x.http_status,599)&&limit(x.requests,1)&&x.requests===1&&
  typeof x.observed_at==="string"&&Number.isFinite(Date.parse(x.observed_at))&&
  Math.abs(Date.now()-Date.parse(x.observed_at))<=24*3600000&&
  optional(x.tokens_used)&&optional(x.daily_request_limit)&&
  optional(x.daily_requests_remaining)&&optional(x.daily_reset_seconds,604800)&&
  optional(x.other_rate_limit)&&optional(x.other_rate_remaining)&&
  optional(x.retry_after_seconds,604800)&&
  x.rate_window==="day"&&x.other_rate_window==="unspecified"&&
  (x.daily_request_limit===null||x.daily_request_limit>0)&&
  (x.daily_requests_remaining===null||x.daily_request_limit!==null&&x.daily_requests_remaining<=x.daily_request_limit);
}
export async function POST(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized"},{status:401,headers:HEADERS});
 if(Number(req.headers.get("content-length")||0)>4096)
  return NextResponse.json({error:"Payload too large"},{status:413,headers:HEADERS});
 let credentials;
 try{credentials=getSupabaseCredentials()}catch{}
 if(!credentials)return NextResponse.json({error:"Storage unavailable"},{status:503,headers:HEADERS});
 let body:any;
 try{
  const text=await req.text();
  if(text.length>4096)throw Error("too_large");
  body=JSON.parse(text);
 }catch{return NextResponse.json({error:"Invalid payload"},{status:422,headers:HEADERS})}
 const observation=body?.observation;
 const runId=body?.run_id;
 if(!valid(observation)||!(runId===null||typeof runId==="string"&&/^\d{1,18}$/.test(runId)))
  return NextResponse.json({error:"Invalid observation"},{status:422,headers:HEADERS});
 // Explicit projection prevents client-supplied prompts, account IDs, keys or
 // arbitrary metadata from ever entering audit_logs.
 const metadata={
  run_id:runId,observed_at:observation.observed_at,
  http_status:observation.http_status,requests:1,tokens_used:observation.tokens_used,
  daily_request_limit:observation.daily_request_limit,
  daily_requests_remaining:observation.daily_requests_remaining,
  daily_reset_seconds:observation.daily_reset_seconds,
  other_rate_limit:observation.other_rate_limit,
  other_rate_remaining:observation.other_rate_remaining,
  retry_after_seconds:observation.retry_after_seconds,
  rate_window:"day",other_rate_window:"unspecified"
 };
 const saved=await logAudit("provider_usage_response","external_provider",observation.provider,
   "stage2_adaptive_observer",metadata);
 return NextResponse.json(saved?{ok:true}:{error:"Observation not persisted"},{
  status:saved?200:503,headers:HEADERS
 });
}
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized"},{status:401,headers:HEADERS});
 const provider=req.nextUrl.searchParams.get("provider");
 if(provider&&!PROVIDERS.has(provider))
  return NextResponse.json({error:"Unknown provider"},{status:400,headers:HEADERS});
 let cfg;
 try{cfg=getSupabaseCredentials()}catch{}
 if(!cfg)return NextResponse.json({error:"Storage unavailable"},{status:503,headers:HEADERS});
 try{
  const since=new Date(Date.now()-7*86400000).toISOString();
  const params=new URLSearchParams({
   select:"entity_id,metadata,created_at",
   action:"eq.provider_usage_response",entity_type:"eq.external_provider",
   created_at:"gte."+since,order:"created_at.desc",limit:"1000"
  });
  if(provider)params.set("entity_id","eq."+provider);
  const res=await fetch(cfg.url+"/rest/v1/audit_logs?"+params,{
   method:"GET",cache:"no-store",signal:AbortSignal.timeout(9000),
   headers:{apikey:cfg.key,Authorization:"Bearer "+cfg.key,Accept:"application/json"}
  });
  if(!res.ok)throw Error("readback_failed");
  const records:unknown=await res.json();
  if(!Array.isArray(records))throw Error("invalid_rows");
  const now=Date.now();
  const summarize=(id:string)=>{
   const entries=(records as Recorded[]).filter(x=>x.entity_id===id&&x.metadata&&
     Number.isFinite(Date.parse(x.created_at))&&Date.parse(x.created_at)<=now);
   const latest=entries[0]?.metadata||{};
   const lastBlocked=entries.find(x=>x.metadata?.http_status===429||x.metadata?.http_status===402);
   const lastAfterBlock=Boolean(lastBlocked&&entries[0]&&Date.parse(entries[0].created_at)>Date.parse(lastBlocked.created_at)&&
     entries[0].metadata?.http_status===200);
   let holdUntil=0,reason="none";
   if(lastBlocked&&!lastAfterBlock){
    const stamp=Date.parse(lastBlocked.created_at);
    const retry=lastBlocked.metadata?.retry_after_seconds;
    const backoff=limit(retry,604800)?retry:(lastBlocked.metadata?.http_status===402?86400:900);
    holdUntil=stamp+backoff*1000;
    if(holdUntil>now)reason=lastBlocked.metadata?.http_status===402?"provider_quota_error":"rate_limit_backoff";
   }
   // Daily ceiling is known ONLY when the provider identifies it explicitly.
   // Groq's request headers are documented as RPD; generic rate-limit
   // headers are an unknown minute/hour/day window and NEVER used as a day cap.
   const knownDay=entries.find(x=>limit(x.metadata?.daily_request_limit)&&
     limit(x.metadata?.daily_requests_remaining)&&
     new Date(x.created_at).toISOString().slice(0,10)===new Date(now).toISOString().slice(0,10));
   const ceiling=knownDay?.metadata?.daily_request_limit;
   const remaining=knownDay?.metadata?.daily_requests_remaining;
   if(limit(ceiling)&&ceiling>0&&limit(remaining)&&remaining<=Math.floor(ceiling*.20)){
    const reset=knownDay?.metadata?.daily_reset_seconds;
    const until=Date.parse(knownDay!.created_at)+(limit(reset,604800)?reset*1000:86400000);
    if(until>now){holdUntil=Math.max(holdUntil,until);reason="verified_daily_header_80_percent";}
   }
   const today=new Date(now).toISOString().slice(0,10);
   const sample=entries.filter(x=>x.created_at.slice(0,10)===today);
   return {
    provider:id,blocked:holdUntil>now,reason:holdUntil>now?reason:"none",
    blocked_until:holdUntil>now?new Date(holdUntil).toISOString():null,
    confirmed_daily_limit:limit(ceiling)?ceiling:null,
    confirmed_daily_remaining:limit(remaining)?remaining:null,
    day_limit_evidence:limit(ceiling)?"explicit_provider_response_header":"unknown",
    sampled_requests_today:sample.length,
    sampled_tokens_today:sample.reduce((n,x)=>n+(limit(x.metadata?.tokens_used)?x.metadata.tokens_used as number:0),0),
    sampled_429_today:sample.filter(x=>x.metadata?.http_status===429).length,
    sampled_days:7,history_may_be_truncated:records.length>=1000,
    last_http_status:limit(latest.http_status,599)?latest.http_status:null
   };
  };
  const summaries=provider?summarize(provider):Array.from(PROVIDERS).map(summarize);
  const content=provider?summaries:summaries;
  return NextResponse.json(content,{headers:HEADERS});
 }catch{return NextResponse.json({error:"Readback unavailable"},{status:503,headers:HEADERS})}
}
