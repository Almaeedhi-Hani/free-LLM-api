'use strict';
const MAX_RESPONSE_CHARS=180000;
const REQUIRED=['opportunities','goals','drafts','editorial_actions'];
function freeOpenRouterModels(catalog,limit=3){
 if(!Array.isArray(catalog))return [];
 const models=catalog.filter(m=>
  typeof m.id==='string'&&m.id.endsWith(':free')&&
  m.pricing&&m.pricing.prompt!==undefined&&m.pricing.completion!==undefined&&
  String(m.pricing.prompt).trim()!==''&&String(m.pricing.completion).trim()!==''&&
  Number(m.pricing.prompt)===0&&Number(m.pricing.completion)===0&&
  m.architecture?.input_modalities?.includes('text')&&
  m.architecture?.output_modalities?.includes('text')&&
  (!m.expiration_date||Number(m.expiration_date)*1000>Date.now())&&
  Number(m.context_length)>=10000);
 const score=m=>(
  (m.supported_parameters?.includes('response_format')?100:0)+
  (m.supported_parameters?.includes('structured_outputs')?100:0)+
  (/qwen|nemotron|deepseek|glm|mistral|gpt-oss/i.test(m.id)?20:0)+
  Math.min(20,Math.floor(Number(m.context_length)/16000)));
 return models.sort((a,b)=>score(b)-score(a)).slice(0,limit).map(m=>m.id);
}
function parseAnswer(text){
 if(typeof text!=='string'||text.length>MAX_RESPONSE_CHARS)return null;
 const cleaned=text.trim().replace(/^\x60{3}(?:json)?\s*/i,'').replace(/\s*\x60{3}$/,'');
 let parsed;
 try{parsed=JSON.parse(cleaned);}
 catch{
  const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
  if(start<0||end<=start)return null;
  try{parsed=JSON.parse(cleaned.slice(start,end+1))}catch{return null}
 }
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
 if(!REQUIRED.every(k=>Array.isArray(parsed[k])))return null;
 for(const k of REQUIRED)if(parsed[k].length>30)return null;
 return Object.fromEntries(REQUIRED.map(k=>[k,parsed[k]]));
}
module.exports={freeOpenRouterModels,parseAnswer};
