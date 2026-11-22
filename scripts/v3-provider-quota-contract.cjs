'use strict';
/**
 * Phase 2.6 accounting contract, NOT live reservation.
 * The production caller must use a single atomic authorized DB reservation
 * BEFORE the external API call. These functions must never be treated as an
 * in-memory replacement for transactional distributed accounting.
 */
const PROVIDERS=Object.freeze(['exa','tavily','parallel','firecrawl','groq','gemini','nvidia','openrouter']);
const METRICS=Object.freeze(['requests','tokens']);
function sanePositive(value){return Number.isSafeInteger(value)&&value>0;}
function checkedProvider(provider,metric) {
 return PROVIDERS.includes(provider)&&METRICS.includes(metric);
}
function permittedUnits(limit){return sanePositive(limit)?Math.floor(limit*0.8):null;}
function quotaDecision({provider,metric='requests',limit,used,amount=1,verified=false}) {
 if(!checkedProvider(provider,metric))return {status:'unconfigured',reason:'unapproved_provider_or_metric',granted:false};
 if(!sanePositive(limit)||verified!==true)
   return {status:'unconfigured',reason:'account_specific_daily_limit_unverified',granted:false};
 if(!Number.isSafeInteger(used)||used<0||!sanePositive(amount))
   return {status:'unconfigured',reason:'invalid_usage_or_request_count',granted:false};
 const cap=permittedUnits(limit);
 // The ceiling is intentionally rounded DOWN: a request that would cross
 // 80% is denied and recorded as quota_reached, not rounded up to 100%.
 if(amount>cap-used)
   return {status:'quota_reached',reason:'daily_80_percent_threshold',granted:false,
     limit,cap,used,amount,remaining:Math.max(0,cap-used)};
 return {status:'reservation_eligible',reason:'requires_atomic_db_reservation',granted:false,
   limit,cap,used,amount,remaining:cap-used-amount};
}
function usageDateUtc(now) {
 const date=new Date(now);
 if(!Number.isFinite(date.getTime()))throw Error('invalid_timestamp');
 return date.toISOString().slice(0,10);
}
function reservationKey({githubRunId,stage,provider,sequence}) {
 // Idempotency is per real provider attempt, NEVER per entire workflow run.
 const id=String(githubRunId||'');
 const s=String(stage||'');
 if(!/^\d{1,18}$/.test(id)||!/^[a-z0-9_-]{1,50}$/.test(s)||
   !PROVIDERS.includes(provider)||!Number.isInteger(sequence)||sequence<1||sequence>500)
   return null;
 return [id,s,provider,sequence].join(':');
}
module.exports={PROVIDERS,METRICS,permittedUnits,quotaDecision,usageDateUtc,reservationKey};
