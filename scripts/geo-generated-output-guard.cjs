'use strict';
/**
 * Narrow boundary between LLM proposals and the existing GEO persistence API.
 * Do not manufacture a title, evidence, activity, official source, route or copy.
 * Unspecified goal priority is conservatively marked medium (queue default),
 * never claimed to have been assigned by the model.
 * Unsupported editorial page kinds/targets must be rejected, not guessed.
 */
const tree=require('../src/data/content-tree.json');
const knownNodes=new Map(tree.nodes.map(n=>[n.id,n]));
const validKinds=new Set(['home','service','packages','guide','comparison','trust','technical_seo','internal_link']);
const validPriority=new Set(['high','medium','low']);
const safeText=(v,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max&&!/[<>]/.test(v);
function prepareGoals(items){
 const accepted=[],rejected=[];
 let defaulted=0;
 for(const [index,g] of (Array.isArray(items)?items:[]).entries()){
  if(!g||typeof g!=='object'||Array.isArray(g)||!safeText(g.title,3,500)){
   rejected.push({index,reason:'invalid_title'});continue;
  }
  const priority=validPriority.has(g.priority)?g.priority:'medium';
  if(priority!==g.priority)defaulted++;
  const item={title:g.title.trim(),priority};
  if(safeText(g.description,1,1000))item.description=g.description.trim();
  if(safeText(g.related_opportunity,1,500))item.related_opportunity=g.related_opportunity.trim();
  accepted.push(item);
 }
 return {accepted,rejected,defaulted};
}
function eligibleEditorial(item){
 if(!item||typeof item!=='object'||Array.isArray(item))return 'invalid_item';
 if(!validKinds.has(item.kind))return 'unknown_kind';
 if(!['ar','en','zh'].includes(item.lang))return 'invalid_language';
 const node=item.topic_node_id?knownNodes.get(item.topic_node_id):null;
 if(item.topic_node_id&&!node)return 'unknown_topic_node';
 const target=item.target;
 if(typeof target!=='string')return 'missing_target';
 if(item.kind==='home'||item.kind==='trust'){
  if(target!=='/'||node&&node.id!=='investor-hub')return 'wrong_home_target';
 }else if(item.kind==='packages'){
  if(target!=='/packages'||node&&node.id!=='packages')return 'wrong_package_target';
 }else if(item.kind==='service'){
  const slug=target.replace(/^\/services\//,'');
  if(!tree.nodes.some(n=>n.route==='/services/'+slug))return 'unknown_service_target';
  if(node&&node.route!=='/services/'+slug)return 'wrong_service_node';
 }else if(item.kind==='guide'||item.kind==='comparison'){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target)||target!==item.slug||target.length>90)
   return 'invalid_guide_slug';
 }else if(!/^\/(?:$|packages$|services\/(?:company-formation|misa-license|corporate-banking|contract-drafting|premium-residency|investment-funds)$|insights(?:\/[a-z0-9-]+)?$)/.test(target)){
  return 'invalid_technical_target';
 }
 if(!safeText(item.title,item.lang==='zh'?6:12,170)||!safeText(item.summary,30,360)||
    !safeText(item.body,item.lang==='zh'?80:100,10000))return 'insufficient_text';
 return null;
}
function screenEditorial(items){
 const accepted=[],rejected=[];
 for(const [index,item] of (Array.isArray(items)?items:[]).entries()){
  const reason=eligibleEditorial(item);
  if(reason){rejected.push({index,reason});continue}
  // Conservative risk metadata; no lower-risk default, no automatic approval.
  accepted.push({...item,risk_level:['low','medium','high'].includes(item.risk_level)?item.risk_level:'high'});
 }
 return {accepted,rejected};
}
module.exports={prepareGoals,screenEditorial,eligibleEditorial};
