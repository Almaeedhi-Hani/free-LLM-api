const LABELS: Record<string, string> = {
  idle:'بانتظار التشغيل',running:'قيد التشغيل',success:'نجح',completed:'مكتمل',failed:'فشل',
  pending:'بانتظار المراجعة',approved:'معتمد',rejected:'مرفوض',active:'نشط',
  inactive:'غير نشط',disqualified:'مستبعد',new:'جديدة',triaged:'تم فرزها',
  planned:'مخطط لها',done:'منجزة',open:'مفتوح',in_progress:'قيد التنفيذ',
  cancelled:'ملغى',high:'عالية',medium:'متوسطة',low:'منخفضة',
  ar:'العربية',en:'الإنجليزية',zh:'الصينية',manual:'إدخال يدوي',unknown:'غير معروف',
  admin:'مدير النظام',cron:'تشغيل مجدول'
};
export const readable = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'غير متوفر';
  const key = String(value);
  return LABELS[key] || key.replace(/_/g,' ');
};
export const formatDate = (value: unknown) => {
  if (!value) return 'غير متوفر';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ar-SA');
};
// Each operator's edit belongs to one draft, not to the latest list position.
export const draftReviewKey=(d:{q?:string;createdAt?:string})=>JSON.stringify([d.q||'',d.createdAt||'']);
// These are explanatory UI labels for suggestions, never claims of verified market facts.
export const opportunityKind=(kind:string)=>({
  content_gap:'محتوى يحتاج تطويرًا',keyword_gap:'موضوعات بحث غير مغطاة',
  faq_gap:'أسئلة متكررة تحتاج إجابات',service_gap:'تغطية الخدمات',
  authority_gap:'تعزيز الثقة والمصداقية'
} as Record<string,string>)[kind]||'فرصة مقترحة';
export const opportunityMeaning=(item:{title?:string;type?:string})=>{
 const title=String(item.title||'');
 if(title.includes('دلائل مخططة بدون صفحات منشورة'))
   return 'يقترح النظام مراجعة أدلة موجودة في خطة المحتوى ولم تتحول إلى صفحات منشورة؛ لا تعني هذه الملاحظة أن هناك دليلًا على صفحة منافسة.';
 if(item.type==='keyword_gap')return 'اقترح النظام موضوع بحث يستحق الدراسة لتحديد ما إذا كانت صفحات الموقع تغطيه.';
 if(item.type==='faq_gap')return 'يقترح النظام إضافة أو تحسين إجابة عن سؤال قد يهم المستثمر.';
 if(item.type==='service_gap')return 'يقترح النظام مراجعة شرح الخدمة وما إذا كان يغطي أسئلة الزائر.';
 if(item.type==='authority_gap')return 'يقترح النظام تحسين عناصر الثقة والإسناد بالمصادر الأصلية.';
 return 'يقترح النظام تطوير محتوى متعلق بهذا الموضوع. قوة المقترح تعتمد على الأدلة المسجلة أدناه.';
};
export const opportunityConfidence=(v:string)=>({high:'عالية',medium:'متوسطة',low:'منخفضة'} as Record<string,string>)[v]||'غير محددة';
export const opportunityPriority=(v:string)=>({critical:'حرجة',high:'عالية',medium:'متوسطة',low:'منخفضة'} as Record<string,string>)[v]||'غير محددة';
export const observationType=(v:string)=>({competitor:'رصد صفحة منافسة',keyword:'اقتراح من بحث الكلمات',manual:'أضيف يدويًا'} as Record<string,string>)[v]||'لم يحدد نوع المصدر';
