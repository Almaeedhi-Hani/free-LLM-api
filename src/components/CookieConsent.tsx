"use client";
import React,{useEffect,useState} from "react";
type Locale="ar"|"en"|"zh";
type Consent={necessary:true;analytics:boolean;marketing:boolean;version:1;updatedAt:string};
const NAME="site-cookie-consent";
const labels={
 ar:{title:"خصوصيتك تهمنا",description:"نستخدم ملفات ضرورية لتشغيل الموقع، وملفات اختيارية للتحليلات والتسويق بموافقتك فقط.",necessary:"ضرورية",necessaryDesc:"تشغيل الموقع وحفظ اختيار اللغة",analytics:"التحليلات",analyticsDesc:"قياس الزيارات والتفاعل بعد ربط أداة تحليلات",marketing:"التسويق",marketingDesc:"قياس الحملات عند إضافة أدوات تسويقية",accept:"قبول الكل",reject:"رفض الاختيارية",save:"حفظ اختياري",settings:"إعدادات الكوكيز",close:"إغلاق",saved:"تم حفظ تفضيلاتك"},
 en:{title:"Your privacy matters",description:"We use essential cookies to run the site and optional analytics and marketing cookies only with your consent.",necessary:"Essential",necessaryDesc:"Site operation and language preference",analytics:"Analytics",analyticsDesc:"Traffic and engagement measurement when connected",marketing:"Marketing",marketingDesc:"Campaign measurement when tools are connected",accept:"Accept all",reject:"Reject optional",save:"Save preferences",settings:"Cookie settings",close:"Close",saved:"Preferences saved"},
 zh:{title:"您的隐私很重要",description:"我们使用必要 Cookie 运行网站；分析和营销 Cookie 仅在您同意后启用。",necessary:"必要",necessaryDesc:"网站运行和语言偏好",analytics:"分析",analyticsDesc:"接入分析工具后衡量访问与互动",marketing:"营销",marketingDesc:"接入营销工具后衡量活动效果",accept:"全部接受",reject:"拒绝可选项",save:"保存偏好",settings:"Cookie 设置",close:"关闭",saved:"偏好已保存"}
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
 const [ready,setReady]=useState(false),[open,setOpen]=useState(false);
 const [notice,setNotice]=useState(false);
 const t=labels[locale];
 useEffect(()=>{const existing=readConsent();if(!existing)setOpen(true);setReady(true)},[]);
 function save(a:boolean,m:boolean){writeConsent(policy.analyticsAvailable&&a,policy.marketingAvailable&&m,policy.consentDays);setOpen(false);setNotice(true)}
 if(!ready)return null;
 return <>
  {open&&<div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5" role="presentation">
   <section role="dialog" aria-modal="false" aria-labelledby="cookie-title" dir={locale==="ar"?"rtl":"ltr"} className="w-full max-w-3xl max-h-[70dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-slate-900 shadow-xl">
    <h2 id="cookie-title" className="text-base sm:text-lg font-bold">{t.title}</h2>
    <p className="mt-1.5 text-xs sm:text-sm leading-6 text-slate-600">{t.description}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
     <button type="button" onClick={()=>save(policy.analyticsAvailable,policy.marketingAvailable)} className="rounded-full bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white">{t.accept}</button>
     <button type="button" onClick={()=>save(false,false)} className="rounded-full border border-slate-300 px-4 py-2 text-xs sm:text-sm font-semibold">{t.reject}</button>
    </div>
    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
     <input type="checkbox" checked disabled aria-label={t.necessary} className="h-4 w-4 accent-emerald-700"/>
     <span><strong className="text-slate-800">{t.necessary}</strong> — {t.necessaryDesc}</span>
    </div>
    {readConsent()&&<button type="button" onClick={()=>setOpen(false)} className="mt-4 block text-xs underline">{t.close}</button>}
   </section>
  </div>}
  {notice&&<span role="status" className="sr-only">{t.saved}</span>}
 </>;
}
