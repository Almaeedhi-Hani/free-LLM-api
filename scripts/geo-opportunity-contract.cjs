'use strict';
const TYPES=new Set(['gap','content','keyword']);
function filterOpportunities(items){
 const valid=[],rejected=[];
 for(let i=0;i<items.length;i++){
  const o=items[i],errors=[];
  if(!o||typeof o!=='object'||Array.isArray(o)){rejected.push({index:i,reason:'not_object'});continue}
  if(typeof o.title!=='string'||!o.title.trim()||o.title.length>500||o.title.includes('\uFFFD'))errors.push('title');
  if(!TYPES.has(o.type))errors.push('type');
  if(typeof o.score!=='number'||!Number.isFinite(o.score)||o.score<0||o.score>100)errors.push('score');
  if(o.description!==undefined&&(typeof o.description!=='string'||!o.description.trim()||o.description.length>2000||o.description.includes('\uFFFD')))errors.push('description');
  if(errors.length)rejected.push({index:i,reason:errors.join(',')});
  else valid.push(o);
 }
 return {valid,rejected};
}
module.exports={filterOpportunities};
