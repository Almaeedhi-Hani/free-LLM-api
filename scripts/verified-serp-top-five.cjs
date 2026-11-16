'use strict';
// Normalize externally evidenced organic SERP positions. Never infer a rank
// from array order, provider discovery order, or autocomplete suggestions.
const LANGUAGES=new Set(['ar','en','zh']);
function verifiedTopFive({query,language,source,observed_at,results}={}){
 if(typeof query!=='string'||!query.trim()||!LANGUAGES.has(language))return [];
 if(typeof source!=='string'||!source.trim()||['google-suggest','bing-rss','exa','tavily','parallel','firecrawl'].includes(source.toLowerCase()))return [];
 if(typeof observed_at!=='string'||!Number.isFinite(Date.parse(observed_at)))return [];
 const seenRanks=new Set(),seenUrls=new Set(),out=[];
 for(const result of Array.isArray(results)?results:[]){
  const rank=result?.rank;
  if(!Number.isInteger(rank)||rank<1||rank>5||result?.rank_verified!==true)continue;
  let url;
  try{const parsed=new URL(result.url);if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)continue;parsed.hash='';url=parsed.toString()}catch{continue}
  if(seenRanks.has(rank)||seenUrls.has(url))continue;
  seenRanks.add(rank);seenUrls.add(url);
  out.push({query:query.trim(),language,source,observed_at,url,rank,rank_status:'verified_serp',title:String(result.title||'').slice(0,250)});
 }
 return out.sort((a,b)=>a.rank-b.rank);
}
module.exports={verifiedTopFive};
