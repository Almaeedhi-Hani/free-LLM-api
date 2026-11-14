"use client";
import React,{useEffect,useState} from "react";
type Locale="ar"|"en"|"zh";
type Consent={necessary:true;analytics:boolean;marketing:boolean;version:1;updatedAt:string};
const NAME="site-cookie-consent";
const labels={
 ar:{title:"إعدادات الخصوصية وملفات تعريف الارتباط",description:"نستخدم ملفات ضرورية لتشغيل الموقع وتذكر اللغة. التحليلات والتسويق اختياريان، ولا يتم تشغيل أدواتهما إلا بعد موافقتك وعند ربطها فعليًا.",necessary:"ضرورية",necessaryDesc:"تشغيل الموقع وحفظ اختيار اللغة",analytics:"التحليلات",analyticsDesc:"قياس الزيارات والتفاعل بعد ربط أداة تحليلات",marketing:"التسويق",marketingDesc:"قياس الحملات عند إضافة أدوات تسويقية",accept:"قبول الكل",reject:"رفض الاختيارية",save:"حفظ اختياري",settings:"إعدادات الكوكيز",close:"إغلاق",saved:"تم حفظ تفضيلاتك"},
 en:{title:"Privacy and cookie preferences",description:"Essential cookies keep the site working and remember your language. Analytics and marketing are optional; their tools run only with your consent and once configured.",necessary:"Essential",necessaryDesc:"Site operation and language preference",analytics:"Analytics",analyticsDesc:"Traffic and engagement measurement when connected",marketing:"Marketing",marketingDesc:"Campaign measurement when tools are connected",accept:"Accept all",reject:"Reject optional",save:"Save preferences",settings:"Cookie settings",close:"Close",saved:"Preferences saved"},
 zh:{title:"隐私与 Cookie 偏好",description:"必要 Cookie 用于网站运行及记住语言。分析和营销 Cookie 可选，仅在您同意且工具实际接入后启用。",necessary:"必要",necessaryDesc:"网站运行和语言偏好",analytics:"分析",analyticsDesc:"接入分析工具后衡量访问与互动",marketing:"营销",marketingDesc:"接入营销工具后衡量活动效果",accept:"全部接受",reject:"拒绝可选项",save:"保存偏好",settings:"Cookie 设置",close:"关闭",saved:"偏好已保存"}
};
function readConsent():Consent|null{
 try{
  const value=document.cookie.split("; ").find(x=>x.startsWith(NAME+"="))?.split("=")[1];
  if(!value)return null;
  const data=JSON.parse(decodeURIComponent(value));
  if(data.version!==1||data.necessary!==true||typeof data.analytics!=="boolean"||typeof data.marketing!=="boolean")return null;
  return data as Consent;
 }catch{return null}
}
function writeConsent(analytics:boolean,marketing:boolean,days:number){
 const value:Consent={necessary:true,analytics,marketing,version:1,updatedAt:new Date().toISOString()};
 document.cookie=`${NAME}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${Math.max(1,Math.min(365,days))*86400}; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;
 window.dispatchEvent(new CustomEvent("site-consent-changed",{detail:value}));
}
export function CookieConsent({locale="ar",policy={analyticsAvailable:true,marketingAvailable:true,consentDays:180}}:{locale?:Locale;policy?:{analyticsAvailable:boolean;marketingAvailable:boolean;consentDays:number}}){
 const [ready,setReady]=useState(false),[open,setOpen]=useState(false),[expanded,setExpanded]=useState(false);
 const [analytics,setAnalytics]=useState(false),[marketing,setMarketing]=useState(false),[notice,setNotice]=useState(false);
 const t=labels[locale];
 useEffect(()=>{const existing=readConsent();if(existing){setAnalytics(existing.analytics);setMarketing(existing.marketing)}else setOpen(true);setReady(true)},[]);
 function save(a:boolean,m:boolean){writeConsent(policy.analyticsAvailable&&a,policy.marketingAvailable&&m,policy.consentDays);setAnalytics(policy.analyticsAvailable&&a);setMarketing(policy.marketingAvailable&&m);setOpen(false);setExpanded(false);setNotice(true)}
 if(!ready)return null;
 return <>
  {!open&&<button type="button" onClick={()=>{setNotice(false);setOpen(true);setExpanded(true)}} className="fixed bottom-4 left-4 z-40 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">{t.settings}</button>}
  {open&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center" role="presentation">
   <section role="dialog" aria-modal="true" aria-labelledby="cookie-title" dir={locale==="ar"?"rtl":"ltr"} className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-7 text-slate-900 shadow-2xl">
    <h2 id="cookie-title" className="text-xl font-bold">{t.title}</h2>
    <p className="mt-3 text-sm leading-7 text-slate-600">{t.description}</p>
    <div className="mt-4 flex flex-wrap gap-2">
     <button type="button" onClick={()=>save(policy.analyticsAvailable,policy.marketingAvailable)} className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white">{t.accept}</button>
     <button type="button" onClick={()=>save(false,false)} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold">{t.reject}</button>
     <button type="button" onClick={()=>setExpanded(v=>!v)} className="rounded-full border border-slate-300 px-5 py-3 text-sm">{t.settings}</button>
    </div>
    {expanded&&<div className="mt-5 space-y-4 border-t pt-4">
     <div className="flex justify-between gap-4"><div><strong>{t.necessary}</strong><p className="text-xs text-slate-500">{t.necessaryDesc}</p></div><input type="checkbox" checked disabled aria-label={t.necessary}/></div>
     {policy.analyticsAvailable&&<label className="flex justify-between gap-4"><span><strong>{t.analytics}</strong><span className="block text-xs text-slate-500">{t.analyticsDesc}</span></span><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)}/></label>}
     {policy.marketingAvailable&&<label className="flex justify-between gap-4"><span><strong>{t.marketing}</strong><span className="block text-xs text-slate-500">{t.marketingDesc}</span></span><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/></label>}
     <button type="button" onClick={()=>save(analytics,marketing)} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{t.save}</button>
    </div>}
    {readConsent()&&<button type="button" onClick={()=>setOpen(false)} className="mt-4 block text-xs underline">{t.close}</button>}
   </section>
  </div>}
  {notice&&<span role="status" className="sr-only">{t.saved}</span>}
 </>;
}
