"use client";
import React,{useEffect,useState} from "react";
import {usePathname} from 'next/navigation';
import {CONSENT_NAME,CONSENT_VERSION} from "@/lib/investor-events";
type Locale="ar"|"en"|"zh";
type Consent={necessary:true;analytics:boolean;marketing:boolean;version:typeof CONSENT_VERSION;updatedAt:string};
const NAME=CONSENT_NAME;
const labels={
 ar:{title:"خصوصيتك تهمنا",description:"نستخدم ملفات ضرورية لتشغيل الموقع. بموافقتك الاختيارية نقيس تفاعل الصفحات ونقرات التواصل دون إرسال تفاصيل النماذج أو معرفات الزوار إلى التحليلات.",necessary:"ضرورية",necessaryDesc:"تشغيل الموقع وحفظ اختيار اللغة",analytics:"التحليلات",analyticsDesc:"قياس التفاعل والنقرات داخل الموقع",marketing:"التسويق",marketingDesc:"قياس الحملات عند إضافة أدوات تسويقية",accept:"قبول الكل",reject:"رفض الاختيارية",save:"حفظ اختياري",settings:"إعدادات الكوكيز",close:"إغلاق",saved:"تم حفظ تفضيلاتك"},
 en:{title:"Your privacy matters",description:"Essential cookies operate the site. With optional consent, we measure page engagement and contact clicks without sending form details or visitor identifiers to analytics.",necessary:"Essential",necessaryDesc:"Site operation and language preference",analytics:"Analytics",analyticsDesc:"First-party page and click measurement",marketing:"Marketing",marketingDesc:"Campaign measurement when tools are connected",accept:"Accept all",reject:"Reject optional",save:"Save preferences",settings:"Cookie settings",close:"Close",saved:"Preferences saved"},
 zh:{title:"您的隐私很重要",description:"我们使用必要 Cookie 运行网站。经您自愿同意后，我们衡量页面互动及联系点击，不向分析系统发送表单内容或访客标识。",necessary:"必要",necessaryDesc:"网站运行和语言偏好",analytics:"分析",analyticsDesc:"站内页面及点击衡量",marketing:"营销",marketingDesc:"接入营销工具后衡量活动效果",accept:"全部接受",reject:"拒绝可选项",save:"保存偏好",settings:"Cookie 设置",close:"关闭",saved:"偏好已保存"}
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
function writeConsent(analytics:boolean,marketing:boolean,days:number){
 const value:Consent={necessary:true,analytics,marketing,version:CONSENT_VERSION,updatedAt:new Date().toISOString()};
 document.cookie=`${NAME}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${Math.max(1,Math.min(365,days))*86400}; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;
 window.dispatchEvent(new CustomEvent("site-consent-changed",{detail:value}));
}
export function CookieConsent({locale="ar",policy={analyticsAvailable:true,marketingAvailable:true,consentDays:180}}:{locale?:Locale;policy?:{analyticsAvailable:boolean;marketingAvailable:boolean;consentDays:number}}){
 const pathname=usePathname();
 const [ready,setReady]=useState(false),[open,setOpen]=useState(false);
 const [notice,setNotice]=useState(false);
 const [analytics,setAnalytics]=useState(false),[marketing,setMarketing]=useState(false);
 const t=labels[locale];
 useEffect(()=>{
  if(pathname?.startsWith('/admin')){setOpen(false);setReady(true);return;}
  const existing=readConsent();if(!existing)setOpen(true);setAnalytics(existing?.analytics===true);setMarketing(existing?.marketing===true);setReady(true);
 },[pathname]);
 useEffect(()=>{const reopen=()=>{if(pathname?.startsWith('/admin'))return;const existing=readConsent();setAnalytics(existing?.analytics===true);setMarketing(existing?.marketing===true);setOpen(true)};window.addEventListener("site-cookie-settings",reopen);return()=>window.removeEventListener("site-cookie-settings",reopen)},[pathname]);
 function save(a:boolean,m:boolean){writeConsent(policy.analyticsAvailable&&a,policy.marketingAvailable&&m,policy.consentDays);setOpen(false);setNotice(true)}
 if(!ready||pathname?.startsWith('/admin'))return null;
 return <>
  {open&&<div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5" role="presentation">
   <section role="dialog" aria-modal="false" aria-labelledby="cookie-title" dir={locale==="ar"?"rtl":"ltr"} className="w-full max-w-3xl max-h-[70dvh] overflow-y-auto rounded-2xl border border-[#d1d5db] bg-white p-4 sm:p-5 text-[#111827] shadow-xl">
    <h2 id="cookie-title" className="text-base sm:text-lg font-bold">{t.title}</h2>
    <p className="mt-1.5 text-xs sm:text-sm leading-6 text-[#4b5563]">{t.description}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
     <button type="button" onClick={()=>save(policy.analyticsAvailable,policy.marketingAvailable)} className="rounded-[20px] bg-[#202a36] px-4 py-2 text-xs sm:text-sm font-semibold text-white">{t.accept}</button>
     <button type="button" onClick={()=>save(false,false)} className="rounded-[20px] border border-[#d1d5db] px-4 py-2 text-xs sm:text-sm font-semibold">{t.reject}</button>
    </div>
    <div className="mt-3 flex items-center gap-2 border-t border-[#d1d5db] pt-2 text-xs text-[#4b5563]">
     <input type="checkbox" checked disabled aria-label={t.necessary} className="h-4 w-4 accent-emerald-700"/>
     <span><strong className="text-[#1f2937]">{t.necessary}</strong> — {t.necessaryDesc}</span>
    </div>
    {policy.analyticsAvailable&&<label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)}/><span>{t.analytics} — {t.analyticsDesc}</span></label>}
    {policy.marketingAvailable&&<label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/><span>{t.marketing} — {t.marketingDesc}</span></label>}
    <button type="button" className="mt-3 rounded-[20px] border border-[#d1d5db] px-4 py-2 text-xs font-semibold" onClick={()=>save(analytics,marketing)}>{t.save}</button>
    {readConsent()&&<button type="button" onClick={()=>setOpen(false)} className="mt-4 block text-xs underline">{t.close}</button>}
   </section>
  </div>}
  {notice&&<span role="status" className="sr-only">{t.saved}</span>}
 </>;
}
