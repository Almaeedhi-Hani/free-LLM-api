'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import EvidencePriorityReviewPanel from "@/components/EvidencePriorityReviewPanel";
import {DataRolePanel,DataRoleTag} from "@/components/AdminDataRoles";
import {opportunityKind,opportunityPriority,opportunityConfidence,opportunityMeaning,observationType} from "@/lib/admin/dashboard/presentation";
type Props=Pick<DashboardViewContracts,"evidenceData"|"evidenceLoading"|"fetchEvidence"|"recordedBriefs">;

export default function DashboardEvidence({evidenceData,evidenceLoading,fetchEvidence,recordedBriefs}:Props) {
  return <>
              <div className="min-w-0 space-y-6">
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-navy-900">الأدلة ومصادر فرص السوق</h2>
                      <p className="mt-1 text-xs text-slate-600">تفاصيل الرصد وتصنيفات النظام؛ لا تمثل بيانات المنافسين مراجع رسمية للتحقق من المحتوى.</p>
                    </div>
                    <button className="btn-secondary text-xs" disabled={evidenceLoading} onClick={fetchEvidence}>{evidenceLoading?'جاري التحميل...':'تحديث'}</button>
                  </div>
                  {!evidenceData&&!evidenceLoading&&<p className="text-sm text-slate-500">اضغط تحديث لتحميل الأدلة.</p>}
                  {evidenceLoading&&<p className="text-sm text-slate-500">جاري التحميل...</p>}
                  <EvidencePriorityReviewPanel recordedBriefs={recordedBriefs} />
                  {evidenceData&&<div className="min-w-0 space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-semibold text-blue-900">منافسون مرصودون</p><p className="text-xl font-bold text-blue-950">{evidenceData.competitors.length}</p></div>
                      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-900">كلمات بحث</p><p className="text-xl font-bold text-violet-950">{evidenceData.keywords.length}</p></div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">فرص مقترحة</p><p className="text-xl font-bold text-emerald-950">{evidenceData.opportunities.length}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-900">أهداف النظام</p><p className="text-xl font-bold text-slate-950">{evidenceData.goals.length}</p></div>
                    </div>
                    <DataRolePanel tone="verification" title="تنبيه التحقق من أدلة السوق" description="العناوين الظاهرة أدناه فرص بحث أو تحليل، وليست معلومات حكومية موثّقة ولا نتائج تصنيف مؤكدة.">
                      <p className="text-xs text-amber-950">الفرص: {evidenceData.opportunities.length}، الكلمات: {evidenceData.keywords.length}، المنافسون: {evidenceData.competitors.length}. يجب مراجعة المصادر قبل استخدام هذه البيانات في أي محتوى منشور.</p>
                    </DataRolePanel>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2"><DataRoleTag tone="research">الرصد من مصادر خارجية</DataRoleTag><DataRoleTag tone="system">تصنيف وبيانات النظام</DataRoleTag></div>
                      <p className="mt-2 text-xs font-medium text-blue-950">اسحب الجدول يمينًا ويسارًا لرؤية جميع الأعمدة، ومرره لأعلى وأسفل لقراءة الصفوف. مساحة العناوين واسعة حتى لا تنضغط الكلمات على الجوال.</p>
                    </div>
                    <div role="region" aria-label="جدول أدلة السوق قابل للتمرير أفقيًا وعموديًا" tabIndex={0} className="max-h-[72vh] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <table className="w-[1120px] min-w-[1120px] table-fixed border-collapse text-sm">
                        <colgroup><col style={{width:'175px'}}/><col style={{width:'430px'}}/><col style={{width:'215px'}}/><col style={{width:'300px'}}/></colgroup>
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-900 shadow-sm">
                          <tr className="border-b border-slate-300 text-right">
                            <th scope="col" className="px-4 py-3 font-bold">نوع الفرصة وتقييمها</th>
                            <th scope="col" className="px-4 py-3 font-bold">ما المقصود بهذه الفرصة؟</th>
                            <th scope="col" className="px-4 py-3 font-bold">من أين جاءت الفكرة؟</th>
                            <th scope="col" className="px-4 py-3 font-bold">روابط ومعلومات البحث المسجلة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evidenceData.opportunities.map((o:any)=>(
                            <tr key={o.id} className="align-top odd:bg-white even:bg-slate-50/80 border-b border-slate-200">
                              <td className="px-4 py-4 whitespace-normal break-words">
                                <DataRoleTag tone="technical">{opportunityKind(o.type)}</DataRoleTag>
                                <p className="mt-3 text-xs text-slate-700">الأولوية المقترحة: <strong>{opportunityPriority(o.priority)}</strong></p>
                                <p className="mt-1 text-xs text-slate-700">درجة الثقة: <strong className={o.confidence==='low'?'text-amber-800':'text-slate-800'}>{opportunityConfidence(o.confidence)}</strong></p>
                              </td>
                              <td className="px-4 py-4 whitespace-normal break-words leading-7 text-slate-900">
                                <span className="block font-semibold">{String(o.title||'').includes('دلائل مخططة بدون صفحات منشورة')?'أدلة مخططة لم تُنشر بعد':o.title}</span>
                                <span className="mt-2 block text-sm text-slate-700">{opportunityMeaning(o)}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-normal break-words">
                                {Array.isArray(o.evidence)&&o.evidence.length>0?
                                  <p className="text-sm text-blue-900">بيانات رصد مسجلة. نوعها مذكور لكل نتيجة في العمود التالي.</p>:
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                                    تحليل مقترح من النظام، دون روابط بحث مرتبطة بهذه الفرصة. لا يُنسب إلى منافس محدد.
                                  </div>}
                              </td>
                              <td className="px-4 py-4 whitespace-normal break-words text-xs">
                                {Array.isArray(o.evidence)&&o.evidence.length>0?<ul className="space-y-2">
                                  {o.evidence.map((e:any,j:number)=><li key={j} className="rounded-lg border border-blue-100 bg-blue-50 p-2 leading-6">
                                    <DataRoleTag tone="research">{observationType(e.origin)}</DataRoleTag>
                                    {e.source&&<span className="mt-1 block text-blue-900">سجل البحث: {e.source}</span>}
                                    {typeof e.url==='string'&&e.url.startsWith('https://')&&<a className="mt-1 block break-all text-blue-800 underline" href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a>}
                                    {e.quote&&<span className="mt-1 block text-blue-950">{e.quote}</span>}
                                    {!e.url&&!e.quote&&<span className="mt-1 block text-slate-600">لا يوجد رابط أو مقتطف محفوظ لهذا الرصد.</span>}
                                  </li>)}
                                </ul>:<span className="text-amber-800">لم تُسجّل مصادر بحث لهذه الفرصة. هي فكرة تحتاج إلى أدلة قبل اعتمادها.</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {evidenceData.opportunities.length===0&&<p className="text-sm text-slate-500">لا توجد فرص محفوظة لعرضها في الجدول.</p>}
                  </div>}
                </section>
              </div>
  </>;
}
