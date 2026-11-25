import type {EditorialItem} from '../../editorial-types';
import {isDisplayable} from '../../source-policy';

/** HTTPS research links are recorded transparently as unverified citations;
 * no minimum number, specific host, provider or official domain is required. */
export function optionalResearchCitations(item:EditorialItem,competitorDomains:string[]=[]):string[]{
 const urls:string[]=[];
 for(const ref of item.evidence_refs||[]){
  if(typeof ref?.url!=='string'||!isDisplayable(ref.url,competitorDomains,ref.kind))continue;
  try{
   const u=new URL(ref.url);
   if(u.protocol!=='https:'||u.username||u.password||u.port||
      u.hash||u.hostname.length>250||!/^[-a-z0-9.]+$/i.test(u.hostname))continue;
   if(!urls.includes(ref.url))urls.push(ref.url);
  }catch{}
 }
 return urls.slice(0,12);
}
