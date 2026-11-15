/**
 * GEO ingestion contract. Persisted and generated counts are deliberately separate.
 * This module has no network or DB dependencies, so failed partial saves can be tested.
 */
export type GeoOpportunity = {title:string;type:"gap"|"content"|"keyword";score:number;evidence_ids?:string[];description?:string};
export type GeoGoal = {title:string;priority:"high"|"medium"|"low";description?:string;related_opportunity?:string};
export type GeoDraft = {q:string;a:string;risk_level:"low"|"medium"|"high";evidence_ids?:string[]};
export type GeoReport = {run_at:string;status:"success"|"partial"|"error";last_result:string};
export type GeoBatch = {opportunities?:GeoOpportunity[];goals?:GeoGoal[];drafts?:GeoDraft[];run_report?:GeoReport};
export interface SaveActions {
 saveOpportunity:(o:GeoOpportunity)=>Promise<void>;
 saveGoal:(g:GeoGoal)=>Promise<void>;
 saveDrafts:(d:GeoDraft[])=>Promise<number>;
 saveReport:(report:GeoReport)=>Promise<void>;
}
export type GeoResult = {ok:boolean;saved:{opportunities:number;goals:number;drafts:number;run_report:number};requested:{opportunities:number;goals:number;drafts:number;run_report:number};errors:string[]};

const textOk=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.length<=max&&!v.includes("\uFFFD");
const validUrlFreeText=(v:unknown)=>v===undefined||textOk(v,2000);
export function normalizeGeoBatch(raw:unknown):GeoBatch{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Expected GEO data object");
 const value=raw as Record<string,unknown>;
 const out:GeoBatch={};
 let hasInput=false;
 for(const key of ["opportunities","goals","drafts"] as const){
   if(value[key]===undefined)continue;
   hasInput=true;
   const items=value[key];
   if(!Array.isArray(items)||items.length>50)throw new Error("Invalid "+key+" array or size");
   if(key==="opportunities"){
     if(!items.every(o=>o&&textOk(o.title,500)&&["gap","content","keyword"].includes(o.type)&&typeof o.score==="number"&&Number.isFinite(o.score)&&o.score>=0&&o.score<=100&&validUrlFreeText(o.description)))throw new Error("Invalid opportunities");
     out.opportunities=items;
   }else if(key==="goals"){
     if(!items.every(g=>g&&textOk(g.title,500)&&["high","medium","low"].includes(g.priority)))throw new Error("Invalid goals");
     out.goals=items;
   }else{
     if(!items.every(d=>d&&textOk(d.q||d.question,1000)&&textOk(d.a||d.answer,5000)&&["high","medium","low"].includes(d.risk_level)))throw new Error("Invalid drafts");
     out.drafts=items.map(d=>({q:d.q||d.question,a:d.a||d.answer,risk_level:d.risk_level,evidence_ids:d.evidence_ids}));
   }
 }
 if(value.run_report!==undefined){
   hasInput=true;
   const r=value.run_report as Record<string,unknown>;
   if(!r||typeof r!=="object"||Array.isArray(r)||!["success","partial","error"].includes(String(r.status))||!textOk(r.run_at,64)||!Number.isFinite(Date.parse(String(r.run_at)))||!textOk(r.last_result,1000))throw new Error("Invalid run_report");
   out.run_report=r as GeoReport;
 }
 if(!hasInput)throw new Error("No GEO records provided");
 return out;
}
export async function persistGeoBatch(batch:GeoBatch,actions:SaveActions):Promise<GeoResult>{
 const result:GeoResult={ok:false,saved:{opportunities:0,goals:0,drafts:0,run_report:0},requested:{opportunities:batch.opportunities?.length||0,goals:batch.goals?.length||0,drafts:batch.drafts?.length||0,run_report:batch.run_report?1:0},errors:[]};
 for(const item of batch.opportunities||[]){
   try{await actions.saveOpportunity(item);result.saved.opportunities++}catch(e){result.errors.push("opportunities: "+(e instanceof Error?e.message:"storage error"))}
 }
 for(const item of batch.goals||[]){
   try{await actions.saveGoal(item);result.saved.goals++}catch(e){result.errors.push("goals: "+(e instanceof Error?e.message:"storage error"))}
 }
 if(batch.drafts?.length){
   try{
     const count=await actions.saveDrafts(batch.drafts);
     result.saved.drafts=count;
     if(count!==batch.drafts.length)result.errors.push("drafts: persisted count did not match requested count");
   }catch(e){result.errors.push("drafts: "+(e instanceof Error?e.message:"storage error"))}
 }
 if(batch.run_report){
   try{await actions.saveReport(batch.run_report);result.saved.run_report=1}
   catch(e){result.errors.push("run_report: "+(e instanceof Error?e.message:"storage error"))}
 }
 result.ok=result.errors.length===0;
 return result;
}
