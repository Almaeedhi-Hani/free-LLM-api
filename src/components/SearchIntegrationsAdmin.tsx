"use client";
import React,{useEffect,useState} from "react";
type Settings={googleVerification:string;ga4MeasurementId:string;gscPropertyUrl:string};
const defaults:Settings={googleVerification:"",ga4MeasurementId:"",gscPropertyUrl:""};
const providers=[
 ["Google Search Console","التحقق من الملكية وخريطة الموقع","إعدادات أساسية"],
 ["Google Analytics 4","معرّف القياس؛ تحميل التتبع يتطلب موافقة منفصلة","لم يُربط API"],
 ["Google Keyword Planner","حساب Google Ads وصلاحيات API مطلوبة","غير متصل"],
 ["Ahrefs","يتطلب اشتراكًا يدعم API ومفتاحًا آمنًا بالخادم","غير متصل"],
 ["Ubersuggest","استيراد تقارير CSV عند توفرها","غير متصل"],
 ["Bing Webmaster","ربط واجهة Bing عند إعداد الاعتماد","غير متصل"]
];
export default function SearchIntegrationsAdmin({settings,onSave,saving}:{settings?:Partial<Settings>;onSave:(settings:Settings)=>Promise<unknown>;saving:boolean}){
 const [draft,setDraft]=useState<Settings>({...defaults,...settings});
 const [check,setCheck]=useState("");
 useEffect(()=>setDraft({...defaults,...settings}),[settings?.googleVerification,settings?.ga4MeasurementId,settings?.gscPropertyUrl]);
 const sitemap=typeof window==="undefined"?"/sitemap.xml":window.location.origin+"/sitemap.xml";
 const robots=typeof window==="undefined"?"/robots.txt":window.location.origin+"/robots.txt";
 const token=draft.googleVerification.trim().match(/content\s*=\s*["']([^"']+)["']/i)?.[1]||draft.googleVerification.trim();
 const valid=/^[a-zA-Z0-9_-]{0,256}$/.test(token)&&/^(|G-[A-Z0-9]{5,20})$/.test(draft.ga4MeasurementId.trim())&&(!draft.gscPropertyUrl||/^https:\/\/[^\s]+\/$/.test(draft.gscPropertyUrl)||/^sc-domain:[a-zA-Z0-9.-]+$/.test(draft.gscPropertyUrl));
 async function inspect(){setCheck("جارٍ فحص خريطة الموقع…");try{const res=await fetch(sitemap,{cache:"no-store"});const body=await res.text();setCheck(res.ok&&body.includes("<urlset")?"خريطة الموقع متاحة وتحتوي على XML. هذا لا يعني إرسالها إلى Google.":"تعذر تأكيد سلامة الخريطة: HTTP "+res.status)}catch{setCheck("فشل الاتصال بخريطة الموقع")}}
 return <section dir="rtl" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
  <h2 className="text-xl font-bold">مركز SEO والتكاملات</h2>
  <p className="text-sm text-slate-600">احفظ الإعدادات العامة هنا. لا تدخل مفاتيح API السرية في هذه الخانات؛ التكاملات التي تتطلب OAuth أو مفاتيح خادم تظهر غير متصلة حتى إتمام الربط الفعلي.</p>
  <label className="block space-y-2"><span className="font-semibold">رمز التحقق من ملكية Google</span><textarea className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm" rows={2} value={draft.googleVerification} onChange={e=>setDraft(p=>({...p,googleVerification:e.target.value}))} placeholder={'<meta name="google-site-verification" content="..." /> أو الرمز فقط'}/></label>
  <label className="block space-y-2"><span className="font-semibold">رابط موقع Search Console (Property)</span><input className="w-full rounded-lg border border-slate-300 p-3 text-sm" dir="ltr" value={draft.gscPropertyUrl} onChange={e=>setDraft(p=>({...p,gscPropertyUrl:e.target.value}))} placeholder="https://example.com/"/></label>
  <label className="block space-y-2"><span className="font-semibold">معرّف GA4 الاختياري</span><input className="w-full rounded-lg border border-slate-300 p-3 text-sm" dir="ltr" value={draft.ga4MeasurementId} onChange={e=>setDraft(p=>({...p,ga4MeasurementId:e.target.value}))} placeholder="G-XXXXXXXXXX"/><span className="block text-xs text-slate-500">حفظ المعرف لا يشغّل التتبع، ويجب احترام موافقة الزائر قبل إضافة سكربت التحليلات.</span></label>
  {!valid&&<p role="alert" className="text-sm text-red-700">تحقق من صحة رمز Google ومعرّف GA4 ورابط Property.</p>}
  <button disabled={saving||!valid} className="btn-primary" onClick={()=>void onSave({...draft,googleVerification:token,ga4MeasurementId:draft.ga4MeasurementId.trim(),gscPropertyUrl:draft.gscPropertyUrl.trim()})}>{saving?"جارٍ الحفظ…":"حفظ الإعدادات"}</button>
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
   <h3 className="font-bold">فحص خريطة الموقع</h3>
   <a className="block break-all text-sm underline" href={sitemap} target="_blank" rel="noreferrer">{sitemap}</a>
   <a className="block break-all text-sm underline" href={robots} target="_blank" rel="noreferrer">{robots}</a>
   <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" onClick={()=>void inspect()}>فحص الخريطة الآن</button>
   {check&&<p role="status" className="text-sm">{check}</p>}
   <p className="text-xs text-slate-600">الخريطة ديناميكية بالفعل. إرسالها إلى Google يتطلب تفويض Search Console API، ولا يعني الفحص إعادة فهرسة الصفحات.</p>
  </div>
  <h3 className="font-bold">المزودون المخطط ربطهم</h3>
  <div className="grid gap-3 md:grid-cols-2">{providers.map(([name,desc,status])=><div key={name} className="rounded-xl border border-slate-200 p-4"><strong>{name}</strong><p className="mt-1 text-sm text-slate-600">{desc}</p><span className="mt-2 inline-block text-xs text-slate-500">{status}</span></div>)}</div>
 </section>;
}
