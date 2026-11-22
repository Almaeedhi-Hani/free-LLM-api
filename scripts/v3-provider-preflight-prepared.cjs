'use strict';
/**
 * PREPARED OFFLINE INTERFACE ONLY. NOT WIRED INTO LIVE PROVIDER CALL SITES.
 * When the owner approves and a trusted atomic server reservation is wired,
 * pass this wrapper as fetchFn to the existing search/model adapters.
 * No live reserve callback or account caps are configured in this repository.
 */
const {createHash}=require('node:crypto');
const search=require('../src/lib/provider-search.cjs');
const direct=require('./geo-direct-model-providers.cjs');

const SEARCH_URLS=Object.freeze(Object.fromEntries(search.ORDER.map(provider=>[
  search.providerRequest(provider,'CI-ONLY-FAKE','ci-check',1).url,provider
])));
const MODEL_URLS=Object.freeze(Object.fromEntries(direct.PROVIDERS.map(p=>[p.endpoint,p.id])));
const PROVIDERS=Object.freeze([...search.ORDER,...direct.PROVIDERS.map(p=>p.id)]);

class QuotaPreflightError extends Error {
  constructor(reason){
    super('provider_quota_preflight_'+reason);
    this.name='QuotaPreflightError';
    this.code=reason;
  }
}
function stableAttempt({runId,stage,provider,body}){
  const id=String(runId||'');
  if(!/^\d{1,18}$/.test(id)||typeof stage!=='string'||!/^[a-z0-9_-]{1,45}$/.test(stage)||
     !PROVIDERS.includes(provider)||typeof body!=='string'||body.length<2||body.length>1000000)
    return null;
  const digest=createHash('sha256').update(body,'utf8').digest('hex').slice(0,24);
  // Stable across an ambiguous network retry/restart, not based on sequence.
  // No provider prompt/query, API key or request content is saved to the ledger.
  return [id,stage,provider,digest].join(':');
}
function createPreparedQuotaFetch({runId,stage,reserve,fetchFn,maxModelTokensByProvider={}}={}){
  if(typeof fetchFn!=='function')throw new QuotaPreflightError('network_callback_missing');
  if(typeof reserve!=='function')throw new QuotaPreflightError('atomic_reservation_unavailable');
  return async function preparedFetch(url,options={}){
    const provider=SEARCH_URLS[url]||MODEL_URLS[url];
    if(!provider||options.method!=='POST'||typeof options.body!=='string'||
       !options.body.startsWith('{'))
      throw new QuotaPreflightError('unrecognized_request');
    const attemptKey=stableAttempt({runId,stage,provider,body:options.body});
    if(!attemptKey)throw new QuotaPreflightError('stable_attempt_missing');
    let tokenUnits=0;
    if(Object.prototype.hasOwnProperty.call(MODEL_URLS,url)){
      // Requires separately verified conservative max INPUT+OUTPUT tokens.
      // Output-only max_tokens is NOT enough for model budget accounting.
      const budget=maxModelTokensByProvider[provider];
      const request=JSON.parse(options.body);
      const outputMax=provider==='gemini'
        ?request?.generationConfig?.maxOutputTokens
        :request?.max_completion_tokens??request?.max_tokens;
      if(!Number.isSafeInteger(budget)||budget<=0||
         !Number.isSafeInteger(outputMax)||outputMax<=0||budget<=outputMax)
        throw new QuotaPreflightError('verified_model_token_budget_missing');
      tokenUnits=budget;
    }
    let result;
    try{result=await reserve({provider,attemptKey,requestUnits:1,tokenUnits});}
    catch{throw new QuotaPreflightError('reservation_unavailable');}
    if(result?.status!=='reserved'){
      const code=['quota_reached','unconfigured','duplicate_reservation'].includes(result?.status)
        ?result.status:'reservation_unverified';
      throw new QuotaPreflightError(code);
    }
    // This is the ONLY network path; never call after missing/failed/duplicate reserve.
    return fetchFn(url,options);
  };
}
module.exports={createPreparedQuotaFetch,stableAttempt,QuotaPreflightError,PROVIDERS};
