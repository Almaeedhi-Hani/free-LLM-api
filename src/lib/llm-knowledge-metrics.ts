/** Bounded in-process aggregate measurements; no IP, raw UA, referrer,
 * query, cookie or visitor ID is stored. Not proof of a real bot identity. */
type Counter={requests:number;botRequests:number;bytes:number;ms:number;notModified:number;errors:number};
type State={since:number;hours:Map<number,Map<string,Counter>>;referrals:Map<number,number>;logMinute:number;logs:number};
const G=globalThis as typeof globalThis&{__aiKnowledgeMetricsV1?:State};
const state=():State=>G.__aiKnowledgeMetricsV1??=( {since:Date.now(),hours:new Map<number,Map<string,Counter>>(),referrals:new Map<number,number>(),logMinute:-1,logs:0} );
export function botFamily(ua:string){
 const families=[['OpenAI',/\b(?:GPTBot|OAI-SearchBot|ChatGPT-User)\b/i],['Anthropic',/\b(?:ClaudeBot|Claude-Web|Claude-User|Claude-SearchBot|Anthropic-AI)\b/i],['Perplexity',/\b(?:PerplexityBot|Perplexity-User)\b/i],['Google',/\b(?:Googlebot|Google-Extended)\b/i],['Bing',/\bbingbot\b/i],['Other AI',/\b(?:Bytespider|CCBot|Meta-ExternalAgent|Applebot-Extended|Cohere-AI|GrokBot|DeepSeekBot)\b/i]] as const;
 return families.find(([,rx])=>rx.test(ua))?.[0]||null;
}
const keyOf=(path:string)=>path.startsWith('/llms/')&&path.endsWith('.md')?'/llms/page.md':path;
function prune(s:State,hour:number){for(const k of Array.from(s.hours.keys()))if(k<hour-23)s.hours.delete(k);for(const k of Array.from(s.referrals.keys()))if(k<hour-23)s.referrals.delete(k)}
export function recordFeed(path:string,ua:string,status:number,bytes:number,ms:number){
 const s=state(),now=Date.now(),hour=Math.floor(now/3600000);prune(s,hour);
 const family=botFamily(ua),key=keyOf(path);
 const bucket:Map<string,Counter>=s.hours.get(hour)||new Map<string,Counter>();s.hours.set(hour,bucket);
 const old=bucket.get(key)||{requests:0,botRequests:0,bytes:0,ms:0,notModified:0,errors:0};
 old.requests++;old.botRequests+=Number(!!family);old.bytes+=bytes;old.ms+=ms;old.notModified+=Number(status===304);old.errors+=Number(status>=400);bucket.set(key,old);
 const minute=Math.floor(now/60000);if(s.logMinute!==minute){s.logMinute=minute;s.logs=0}
 if(family&&s.logs<120){s.logs++;process.stdout.write(JSON.stringify({event:'ai_knowledge_feed_request',feed:key,bot_claim:family,status,body_bytes:bytes,server_ms:ms})+'\n')}
}
export function recordAiReferral(){const s=state(),h=Math.floor(Date.now()/3600000);prune(s,h);s.referrals.set(h,(s.referrals.get(h)||0)+1)}
export function knowledgeMetrics(){
 const s=state(),h=Math.floor(Date.now()/3600000);prune(s,h);
 const rows:Record<string,Counter>={};
 for(const bucket of Array.from(s.hours.values()))for(const [key,r] of Array.from(bucket.entries())){const a=rows[key]||={requests:0,botRequests:0,bytes:0,ms:0,notModified:0,errors:0};for(const k of Object.keys(a) as (keyof Counter)[])a[k]+=r[k]}
 const byFeed=Object.entries(rows).map(([path,r])=>({path,...r,averageServerMs:r.requests?Math.round(r.ms/r.requests):null})).sort((a,b)=>b.botRequests-a.botRequests||b.requests-a.requests);
 return {scope:'current_process_last_24_hour_buckets',since:new Date(Math.max(s.since,(h-23)*3600000)).toISOString(),byFeed,requests:byFeed.reduce((n,r)=>n+r.requests,0),botRequests:byFeed.reduce((n,r)=>n+r.botRequests,0),bodyBytes:byFeed.reduce((n,r)=>n+r.bytes,0),averageServerMs:byFeed.length?Math.round(byFeed.reduce((n,r)=>n+r.ms,0)/byFeed.reduce((n,r)=>n+r.requests,0)):null,aiReferrals:Array.from(s.referrals.values()).reduce((a,b)=>a+b,0)};
}
