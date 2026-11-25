'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import {DataRolePanel,DataRoleTag} from "@/components/AdminDataRoles";
import {assessGeoDraftCopy,splitGeoDraftReviewText} from "@/lib/geo-draft-quality";
import {draftReviewKey,readable,formatDate} from "@/lib/admin/dashboard/presentation";
type Props=Pick<DashboardViewContracts,"content"|"pendingDrafts"|"draftReviewEdits"|"setDraftReviewEdits"|"saving"|"approveDraft"|"rejectDraft">;

export default function DashboardReviews({content,pendingDrafts,draftReviewEdits,setDraftReviewEdits,saving,approveDraft,rejectDraft}:Props) {
  return <>
              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-2 text-xl font-bold">مراجعة المسودات قبل النشر</h2>
                <p className="mb-4 text-sm text-slate-600">اعتماد المسودة ينشر السؤال والإجابة؛ ألوان الأقسام تفصل النص المولّد عن بيانات النظام وروابط المنافسين والتنبيهات.</p>
                {pendingDrafts===0&&<p className="text-sm text-slate-600">لا توجد مسودات معلقة.</p>}
                <ul className="space-y-5">
                  {content.drafts.map((d: any,i: number)=>{
                    const parts=splitGeoDraftReviewText(d.a);
                    const reviewKey=draftReviewKey(d);
                    const finalAnswer=d.status==='pending'?(draftReviewEdits[reviewKey]??parts.answer):d.a;
                    const finalAssessment=assessGeoDraftCopy(d.q,finalAnswer);
                    return <li key={i} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                      <DataRolePanel tone="content" title="السؤال والإجابة المقترحة للاستخدام" description="الجزء الأخضر هو المحتوى الذي أنشأه النموذج، وليس توثيقًا رسميًا.">
                        <h3 className="mb-3 text-base font-bold text-emerald-950 break-words">{d.q}</h3>
                        {d.status==='pending'?<div className="space-y-2">
                          <label htmlFor={`faq-publish-${i}`} className="block text-xs font-bold text-emerald-950">النص النهائي الذي سيُنشر — قابل للتعديل</label>
                          <textarea id={`faq-publish-${i}`} aria-label={`النص النهائي للنشر: ${d.q}`}
                            className="w-full rounded-lg border border-emerald-300 bg-white p-3 text-sm leading-7 text-slate-900"
                            rows={5} value={finalAnswer}
                            onChange={e=>setDraftReviewEdits(prev=>({...prev,[reviewKey]:e.target.value}))}/>
                          <p className="text-xs text-emerald-900">هذا هو النص الذي سيُحفظ في المسودة المعتمدة ويُنشر في الأسئلة الشائعة بعد موافقتك.</p>
                        </div>:<p className="whitespace-pre-line break-words text-sm text-slate-900">{d.a}</p>}
                      </DataRolePanel>
                      {d.status==='pending'&&parts.note&&<DataRolePanel tone="warning" title="عبارة تحقق وردت ضمن النص المولّد" description="هذه العبارة مستخرجة من نهاية الإجابة الأصلية للتوضيح. استُبعدت من معاينة النشر المقترحة، ولن تُنشر إلا إذا كتبتها بنفسك في النص النهائي.">
                        <p className="text-rose-900 font-semibold">{parts.note}</p>
                      </DataRolePanel>}
                      <DataRolePanel tone="system" title="بيانات المسودة من النظام" description="الحالة والتاريخ ومستوى المراجعة معلومات إدارية وليست جزءًا من الإجابة.">
                        <div className="flex flex-wrap items-center gap-2">
                          <DataRoleTag tone="system">الحالة: {readable(d.status)}</DataRoleTag>
                          <span className="text-xs text-slate-600">تاريخ الإنشاء: {formatDate(d.createdAt)}</span>
                        </div>
                      </DataRolePanel>
                      {!finalAssessment.publishable&&<DataRolePanel tone="warning" title="تنبيه جودة آلي — ليس جزءًا من الإجابة">
                        <p className="text-rose-900" role="alert">النص النهائي غير صالح للنشر بعد: راجع اللغة وطول الإجابة وجودتها، ثم صححه في مربع النص الأخضر. يمكن رفض المسودة عند الحاجة.</p>
                      </DataRolePanel>}
                      {d.risk_level==='high'&&<DataRolePanel tone="warning" title="تحذير من النظام — محتوى عالي المخاطر">
                        <p className="text-rose-900">لا تعتمد دون مراجعة مختص والتحقق من المصدر الرسمي. هذا التنبيه ليس جزءًا من الإجابة.</p>
                      </DataRolePanel>}
                      <DataRolePanel tone="research" title="مصادر الرصد المستخدمة — صفحات منافسة ونتائج بحث مرتبطة بالموضوع" description="روابط اكتشفها البحث لمقارنة التغطية والموضوعات؛ لا تثبت صحة الإجابة ولا تعني أن النموذج نقل النص من هذه المواقع.">
                        {Array.isArray(d.evidence_refs)&&d.evidence_refs.length>0?<ul className="space-y-2">{d.evidence_refs.map((ref:any,j:number)=><li key={String(ref.id)+'-'+j} className="rounded-lg border border-blue-100 bg-white/80 p-2 break-words text-xs">
                          {ref.url?.startsWith('https://')?<a href={ref.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-800 underline underline-offset-2">{ref.label}</a>:<span>{ref.label}</span>}
                          <p className="mt-1 text-blue-700">نوع الرصد: {ref.kind||'غير معروف'} · مزوّد البحث: {ref.source||'غير معروف'}</p>
                        </li>)}</ul>:<p className="text-xs text-blue-900">لا توجد روابط رصد مسجلة لهذه المسودة.</p>}
                      </DataRolePanel>
                      <DataRolePanel tone="verification" title="المصادر الرسمية والتحقق قبل النشر" description="مصادر المنافسين ليست مصدرًا رسميًا. تحقّق من صحة المعلومات من الجهات المختصة قبل الاعتماد.">
                        <p className="text-xs text-amber-950">ستُنشر فقط الإجابة النهائية الظاهرة في مربع التحرير الأخضر بعد اعتمادك. أما عبارة التحقق الحمراء فلا تدخل ضمن الإجابة النهائية المقترحة.</p>
                      </DataRolePanel>
                      {d.status==='pending'&&<div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                        <button onClick={()=>approveDraft(i)} className="btn-primary text-xs" disabled={saving || !finalAssessment.publishable || Boolean(splitGeoDraftReviewText(finalAnswer).note)}>اعتماد ونشر</button>
                        <button onClick={()=>rejectDraft(i)} className="btn-secondary text-xs" disabled={saving}>رفض</button>
                      </div>}
                    </li>
                  })}
                </ul>
              </section>
  </>;
}
