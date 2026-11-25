'use client';
import {useEffect,useState} from 'react';

export function usePublicationControls(adminSecret:string){
 const [autoStatus,setAutoStatus]=useState<{enabled:boolean;allow_high_risk:boolean;daily_limit:number;available:boolean;events:Array<{
   id:string;item_id:string;target_path:string;risk_level:string;kind:'faq'|'editorial';status:string;published_at:string;rolled_back_at:string|null
 }> }|null>(null);
 const [autoBusy,setAutoBusy]=useState(false);
 const [autoNotice,setAutoNotice]=useState('');
 const [autoLimit,setAutoLimit]=useState(1);
 useEffect(()=>{
  let active=true;
  fetch('/api/admin/geo-publication',{headers:{'x-admin-secret':adminSecret},cache:'no-store'})
   .then(async response=>{const value=await response.json();if(!response.ok)throw Error('Publication settings unavailable');return value})
   .then(data=>{if(active){setAutoStatus(data);setAutoLimit(data.daily_limit)}})
   .catch(()=>{if(active)setAutoNotice('حالة النشر الآلي غير متاحة؛ يُعامل النظام على أنه معطل.')});
  return()=>{active=false};
 },[adminSecret]);
 const autoAction=async(payload:Record<string,unknown>)=>{
  if(autoBusy)return;
  setAutoBusy(true);setAutoNotice('');
  try{
   const response=await fetch('/api/admin/geo-publication',{
    method:'POST',headers:{'x-admin-secret':adminSecret,'Content-Type':'application/json'},
    body:JSON.stringify(payload),cache:'no-store'
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||result.message||result.status||'تعذر تنفيذ طلب النشر');
   const read=await fetch('/api/admin/geo-publication',{headers:{'x-admin-secret':adminSecret},cache:'no-store'});
   if(!read.ok)throw Error('تعذر تأكيد إعدادات النشر بعد التغيير');
   const updated=await read.json();setAutoStatus(updated);setAutoLimit(updated.daily_limit);
   setAutoNotice(payload.action==='dry_run'?
    'المحاكاة: '+(result.message||'لا توجد عناصر مؤهلة للنشر'):
    payload.action==='rollback'?'استُعيدت النسخة السابقة. حدّث قائمة المحتوى لرؤية الحالة.':
    payload.action==='configure_sensitive'?'تم حفظ صلاحية النشر الآلي للمحتوى الحساس.':
    'تم حفظ سياسة النشر الآلي وتأكيدها من الخادم.');
  }catch(e){setAutoNotice(e instanceof Error?e.message:'تعذر حفظ التغيير')}
  finally{setAutoBusy(false)}
 };
 const changeAuto=async(enabled:boolean)=>{
  if(enabled&&!window.confirm('تفعيل النشر التلقائي للأدلة التي تجتاز التحقق مع حد يومي وسجل وتراجع؟ المحتوى الحساس يتطلب إذنًا منفصلًا.'))return;
  if(!enabled&&!window.confirm('إيقاف جميع عمليات النشر الآلي القادمة؟'))return;
  await autoAction({action:'configure',enabled,daily_limit:autoLimit,
   ...(enabled?{confirm:'ENABLE_GUARDED_AUTOMATIC_PUBLICATION'}:{})});
 };

 const changeSensitive=async(allow:boolean)=>{
  if(allow){
   if(!window.confirm('السماح بالنشر التلقائي لمحتوى استثماري أو نظامي حساس قد يؤثر على قرارات العملاء. هل تريد تفعيله؟'))return;
   if(!window.confirm('تأكيد إضافي: سيُنشر المحتوى الحساس آليًا حتى دون مرجع حكومي إلزامي، مع حفظ حالة التوثيق داخليًا وإمكانية التراجع وحد النشر اليومي.'))return;
  }else if(!window.confirm('إيقاف النشر التلقائي للمحتوى الحساس؟ يبقى النشر منخفض المخاطر وفق الإعداد الآخر.'))return;
  await autoAction({action:'configure_sensitive',allow_high_risk:allow,
   ...(allow?{confirm:'ENABLE_AUTONOMOUS_SENSITIVE_CONTENT',
    acknowledge:'UNDERSTAND_SOURCE_VERIFICATION_LIMITS'}:{})});
 };
 return {autoStatus,autoBusy,autoNotice,autoLimit,setAutoLimit,autoAction,changeAuto,changeSensitive};
}
export type PublicationControlsModel=ReturnType<typeof usePublicationControls>;
