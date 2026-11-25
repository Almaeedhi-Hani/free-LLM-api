'use client';
import {assessGeoDraftCopy,splitGeoDraftReviewText} from '@/lib/geo-draft-quality';
import {draftReviewKey} from '@/lib/admin/dashboard/presentation';
import {numberValid,digitsOnly} from '@/lib/admin/dashboard/contact-form';
import {validWhatsAppAdvisorField} from '@/lib/whatsapp-contacts';
import type {DashboardState} from './useDashboardState';
import type {DashboardSession} from './useDashboardSession';

export function useDashboardContentActions({content,saving,draftReviewEdits,setError,newFaq,setNewFaq,editingFaq,setEditingFaq,newKeyword,setNewKeyword,goldenDraft,contactForm}:Pick<DashboardState,"content"|"saving"|"draftReviewEdits"|"setError"|"newFaq"|"setNewFaq"|"editingFaq"|"setEditingFaq"|"newKeyword"|"setNewKeyword"|"goldenDraft"|"contactForm">,save:DashboardSession['save']) {
  const approveDraft = (idx: number) => {
    if (!content || saving) return;
    const existing=content.drafts[idx];
    if (!existing || existing.status!=='pending') return;
    // Publish precisely what the operator saw and could edit in the green preview,
    // never the original model answer hidden behind the review-only red section.
    const proposed=splitGeoDraftReviewText(existing.a);
    const reviewedAnswer=(draftReviewEdits[draftReviewKey(existing)]??proposed.answer).trim();
    const checked=assessGeoDraftCopy(existing.q,reviewedAnswer);
    if (!checked.publishable) {
      setError('لا يمكن نشر النص النهائي المعروض: '+checked.issues.join(' | '));
      return;
    }
    if (splitGeoDraftReviewText(reviewedAnswer).note) {
      setError('أزل عبارة التحقق الإجرائية من نص النشر النهائي أو أعد صياغتها قبل الاعتماد.');
      return;
    }
    if (!window.confirm('اعتماد ونشر النص النهائي المعروض في المربع الأخضر فقط؟ لن تُنشر عبارة التحقق المعروضة باللون الأحمر. تأكد من مراجعة المعلومات من المصادر الرسمية أولًا.')) return;
    const drafts=[...content.drafts];
    const draft={...existing,a:reviewedAnswer,status:'approved'};
    drafts[idx]=draft;
    const faqs=[...content.faqs.filter((f:any)=>f.q!==draft.q),{q:draft.q,a:reviewedAnswer}];
    void save({faqs,drafts});
  };

  const rejectDraft = (idx: number) => {
    if (!content || saving || !window.confirm('هل تريد رفض هذه المسودة؟')) return;
    const drafts = [...content.drafts];
    drafts[idx] = {...drafts[idx],status:'rejected'};
    save({ drafts });
  };

  const addFaq = () => {
    if (saving) return;
    const q = newFaq.q.trim(), a = newFaq.a.trim();
    if (!q || !a) { setError('أدخل السؤال والإجابة أولًا.'); return; }
    if ((content?.faqs || []).some((f: any) => f.q.trim().toLowerCase() === q.toLowerCase())) {setError('السؤال موجود بالفعل. عدّله من القائمة.');return;}
    setError('');
    const faqs = [...(content?.faqs || []), {q,a}];
    void save({ faqs }).then(ok=>{if(ok)setNewFaq({q:'',a:''});});
  };

  const updateFaq = () => {
    if (!editingFaq || saving) return;
    if (!editingFaq.q.trim() || !editingFaq.a.trim()) {setError('السؤال والإجابة مطلوبان.');return;}
    if ((content?.faqs || []).some((f:any,i:number)=>i!==editingFaq.index && f.q.trim().toLowerCase()===editingFaq.q.trim().toLowerCase())) {setError('يوجد سؤال آخر بالنص نفسه.');return;}
    setError('');
    const faqs = [...(content?.faqs || [])];
    faqs[editingFaq.index] = { q: editingFaq.q.trim(), a: editingFaq.a.trim() };
    void save({ faqs }).then(ok=>{if(ok)setEditingFaq(null);});
  };

  const deleteFaq = (idx: number) => {
    if(saving||!window.confirm('هل تريد حذف هذا السؤال؟'))return;
    const faq=content?.faqs?.[idx];
    if(faq)void save({deleteGeoContent:{kind:'faq',question:faq.q}});
  };

  const addKeyword = () => {
    if (!newKeyword.trim()||saving)return;
    if ((content?.keywords || []).some((k:string)=>k.trim().toLowerCase()===newKeyword.trim().toLowerCase())) {setError('هذه الكلمة موجودة بالفعل.');return;}
    setError('');
    const keywords = [...(content?.keywords || []), newKeyword.trim()];
    void save({ keywords }).then(ok=>{if(ok)setNewKeyword('');});
  };

  const deleteKeyword = (idx: number) => {
    if(saving||!window.confirm('حذف هذه الكلمة من محتوى الموقع؟'))return;
    const keywords = [...(content?.keywords || [])];
    keywords.splice(idx, 1);
    save({ keywords });
  };

  const saveGolden = () => {if (!goldenDraft.trim()) {setError('الفقرة الرئيسية لا يمكن أن تكون فارغة.');return;} void save({ goldenParagraph: goldenDraft.trim() });};
  const saveContact = () => {
    if (saving) return;
    if (contactForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email.trim())) {setError('صيغة البريد الإلكتروني غير صحيحة.');return;}
    if (contactForm.whatsapp && !/^https:\/\/wa\.me\/[1-9][0-9]{7,14}(?:\?[^#]*)?$/.test(contactForm.whatsapp.trim())) {setError('رابط واتساب العام يجب أن يكون بصيغة https://wa.me/ مع رمز الدولة.');return;}
    if (![contactForm.whatsappAr,contactForm.whatsappEn,contactForm.whatsappZh].every(numberValid)) {
      setError('أدخل رقم واتساب دوليًا صحيحًا (مثل +9665XXXXXXXX) أو اتركه فارغًا لاستخدام الرقم العام.');return;
    }
    const nameFields=[contactForm.advisorNameAr,contactForm.advisorNameEn,contactForm.advisorNameZh];
    const titleFields=[contactForm.advisorTitleAr,contactForm.advisorTitleEn,contactForm.advisorTitleZh];
    if(!nameFields.every(value=>validWhatsAppAdvisorField(value,80))||
       !titleFields.every(value=>validWhatsAppAdvisorField(value,100))){
      setError('اسم المسؤول أو المنصب طويل جدًا أو يحتوي رموزًا غير مدعومة. الحد 80 حرفًا للاسم و100 حرف للمنصب.');return;
    }
    setError('');
    void save({contact:{
      phone:contactForm.phone.trim(),phoneDisplay:contactForm.phoneDisplay.trim(),
      whatsapp:contactForm.whatsapp.trim(),email:contactForm.email.trim(),
      whatsappNumbers:{
        ar:digitsOnly(contactForm.whatsappAr),
        en:digitsOnly(contactForm.whatsappEn),
        zh:digitsOnly(contactForm.whatsappZh)
      },
      whatsappAdvisors:{
        ar:{name:contactForm.advisorNameAr.trim(),title:contactForm.advisorTitleAr.trim()},
        en:{name:contactForm.advisorNameEn.trim(),title:contactForm.advisorTitleEn.trim()},
        zh:{name:contactForm.advisorNameZh.trim(),title:contactForm.advisorTitleZh.trim()}
      }
    }});
  };
  return {approveDraft,rejectDraft,addFaq,updateFaq,deleteFaq,addKeyword,deleteKeyword,saveGolden,saveContact};
}
