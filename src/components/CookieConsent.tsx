"use client";
import React,{useEffect,useState} from "react";
import {usePathname} from 'next/navigation';
import {CONSENT_NAME,CONSENT_VERSION} from "@/lib/investor-events";
type Locale="ar"|"en"|"zh";
type Consent={necessary:true;analytics:boolean;marketing:boolean;preferences?:boolean;version:typeof CONSENT_VERSION;updatedAt:string};
const NAME=CONSENT_NAME;
const labels={
 ar:{title:"خصوصيتك تهمنا",description:"نستخدم ملفات ضرورية لتشغيل الموقع، وملفات اختيارية للتحليلات والتسويق وحفظ تفضيلات اللغة. يمكنك قبولها أو رفضها.",accept:"قبول الكل",reject:"رفض الاختيارية",saved:"تم حفظ تفضيلاتك"},
 en:{title:"Your privacy matters",description:"We use essential cookies to operate the site and optional cookies for analytics, marketing and language preferences. You can accept or reject optional cookies.",accept:"Accept all",reject:"Reject optional",saved:"Preferences saved"},
 zh:{title:"您的隐私很重要",description:"我们使用必要 Cookie 运行网站，可选 Cookie 用于分析、营销及保存语言偏好。您可以接受或拒绝可选 Cookie。",accept:"全部接受",reject:"拒绝可选项",saved:"偏好已保存"}
};
function readConsent():Consent|null{
 try{
  const value=document.cookie.split("; ").find(x=>x.startsWith(NAME+"="))?.split("=")[1];
  if(!value)return null;
  const data=JSON.parse(decodeURIComponent(value));
  if(data.version!==CONSENT_VERSION||data.necessary!==true||typeof data.analytics!=="boolean"||typeof data.marketing!=="boolean")return null;
  return data as Consent;
 }catch{return null}
}
function writeConsent(analytics:boolean,marketing:boolean,preferences:boolean,days:number){
 const value:Consent={necessary:true,analytics,marketing,preferences,version:CONSENT_VERSION,updatedAt:new Date().toISOString()};
 document.cookie=`${NAME}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${Math.max(1,Math.min(365,days))*86400}; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;
 if(!preferences)document.cookie="site-language=; Path=/; Max-Age=0; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
 window.dispatchEvent(new CustomEvent("site-consent-changed",{detail:value}));
}
export function CookieConsent({locale="ar",policy={analyticsAvailable:true,marketingAvailable:true,consentDays:180}}:{locale?:Locale;policy?:{analyticsAvailable:boolean;marketingAvailable:boolean;consentDays:number}}){
 const pathname=usePathname();
 const [ready,setReady]=useState(false),[open,setOpen]=useState(false);
 const [notice,setNotice]=useState(false);
 const t=labels[locale];
 useEffect(()=>{
  if(pathname?.startsWith('/admin')){setOpen(false);setReady(true);return;}
  const existing=readConsent();setOpen(!existing);setReady(true);
 },[pathname]);
 useEffect(()=>{const reopen=()=>{if(pathname?.startsWith('/admin'))return;setOpen(true)};window.addEventListener("site-cookie-settings",reopen);return()=>window.removeEventListener("site-cookie-settings",reopen)},[pathname]);
 function save(accept:boolean){writeConsent(policy.analyticsAvailable&&accept,policy.marketingAvailable&&accept,accept,policy.consentDays);setOpen(false);setNotice(true)}
 if(!ready||pathname?.startsWith('/admin'))return null;
 return <>
  {open&&<div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5" role="presentation">
   <section role="dialog" aria-modal="false" aria-labelledby="cookie-title" dir={locale==="ar"?"rtl":"ltr"} className="w-full max-w-xl max-h-[50dvh] overflow-y-auto rounded-2xl border border-[#d1d5db] bg-white p-4 sm:p-5 text-[#111827] shadow-xl">
    <h2 id="cookie-title" className="text-base sm:text-lg font-bold">{t.title}</h2>
    <p className="mt-1.5 text-xs sm:text-sm leading-6 text-[#4b5563]">{t.description}</p>
    <div className="mt-3 grid grid-cols-2 gap-2">
     <button type="button" onClick={()=>save(true)} className="rounded-[20px] bg-[#202a36] px-3 py-3 text-xs sm:text-sm font-semibold text-white">{t.accept}</button>
     <button type="button" onClick={()=>save(false)} className="rounded-[20px] border border-[#9ca3af] px-3 py-3 text-xs sm:text-sm font-semibold">{t.reject}</button>
    </div>
   </section>
  </div>}
  {notice&&<span role="status" className="sr-only">{t.saved}</span>}
 </>;
}
