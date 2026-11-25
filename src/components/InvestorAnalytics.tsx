"use client";
import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";
import {CONSENT_NAME,parseConsent,publicPage,investorEvents,type InvestorEvent} from "@/lib/investor-events";
function allowed(){const raw=document.cookie.split("; ").find(x=>x.startsWith(CONSENT_NAME+"="))?.slice(CONSENT_NAME.length+1);return parseConsent(raw)}
export default function InvestorAnalytics({locale,enabled}:{locale:"ar"|"en"|"zh";enabled:boolean}){
 const pathname=usePathname();
 const viewed=useRef<string|null>(null);
 const referralSent=useRef(false);
 useEffect(()=>{
  if(!enabled)return;
  const path=window.location.pathname,page=publicPage(path);if(!page)return;
  function send(event:InvestorEvent){if(!allowed())return;void fetch("/api/investor-events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event,page,locale}),keepalive:true,credentials:"same-origin",referrerPolicy:"no-referrer"}).catch(()=>{})}
  function view(){if(!allowed()){viewed.current=null;return}if(viewed.current!==path){viewed.current=path;send("page_view");if(!referralSent.current){referralSent.current=true;try{const host=new URL(document.referrer).hostname.toLowerCase();if(["chatgpt.com","chat.openai.com","claude.ai","perplexity.ai","www.perplexity.ai","gemini.google.com","grok.com","chat.deepseek.com","copilot.microsoft.com"].includes(host))void fetch("/api/investor-events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event:"ai_referral",page,locale}),keepalive:true,credentials:"same-origin",referrerPolicy:"no-referrer"}).catch(()=>{})}catch{}}}}
  function click(event:MouseEvent){
   if(!event.isTrusted||!(event.target instanceof Element))return;
   const target=event.target.closest("a,button");if(!target)return;
   const explicit=target.getAttribute("data-investor-event");
   if(explicit&&investorEvents.includes(explicit as InvestorEvent)&&explicit!=="page_view"&&explicit!=="assessment_complete"){send(explicit as InvestorEvent);return}
   if(target instanceof HTMLAnchorElement){
    if(target.protocol==="tel:")send("call_click");
    else if(target.protocol==="https:"&&target.hostname==="wa.me")send("whatsapp_click");
    else if(target.origin===location.origin&&publicPage(target.pathname)==="packages"&&page!=="packages")send("packages_open");
   }
  }
  function assessment(){send("assessment_complete")}
  view();document.addEventListener("click",click,true);window.addEventListener("site-consent-changed",view);window.addEventListener("investor-assessment-complete",assessment);
  return()=>{document.removeEventListener("click",click,true);window.removeEventListener("site-consent-changed",view);window.removeEventListener("investor-assessment-complete",assessment)}
 },[pathname,locale,enabled]);
 return null;
}
