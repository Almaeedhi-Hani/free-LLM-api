'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";

type Props=Pick<DashboardViewContracts,"content"|"goldenDraft"|"setGoldenDraft"|"saveGolden"|"saving"|"setTab"|"editingFaq"|"setEditingFaq"|"updateFaq"|"deleteFaq"|"newFaq"|"setNewFaq"|"addFaq">;

export default function DashboardContent({content,goldenDraft,setGoldenDraft,saveGolden,saving,setTab,editingFaq,setEditingFaq,updateFaq,deleteFaq,newFaq,setNewFaq,addFaq}:Props) {
  return <>
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-2">الفقرة الذهبية</h2>
                  <textarea className="w-full border border-slate-300 rounded-lg px-4 py-2 min-h-[120px]" value={goldenDraft} onChange={(e) => setGoldenDraft(e.target.value)} />
                  <button onClick={saveGolden} className="btn-primary mt-3" disabled={saving}>حفظ</button>
                </section>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  أصبحت الكلمات البحثية المعتمدة في <button className="text-blue-700 underline" onClick={()=>setTab('keywords')}>السوق والمنافسون ← كلمات البحث السوقية</button>.
                  أُخفيت القائمة القديمة المنفصلة دون حذف بياناتها.
                </div>

                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-4">الأسئلة الشائعة</h2>
                  <ul className="space-y-3">
                    {content.faqs.map((f: any, i: number) => (
                      <li key={i} className="bg-slate-50 rounded-lg p-4">
                        {editingFaq?.index === i ? (
                          <div className="space-y-2">
                            <input className="w-full border border-slate-300 rounded-lg px-4 py-2" value={editingFaq.q} onChange={(e) => setEditingFaq({ ...editingFaq, q: e.target.value })} />
                            <textarea className="w-full border border-slate-300 rounded-lg px-4 py-2" value={editingFaq.a} onChange={(e) => setEditingFaq({ ...editingFaq, a: e.target.value })} />
                            <div className="flex gap-2">
                              <button onClick={updateFaq} className="btn-primary text-xs" disabled={saving}>حفظ</button>
                              <button onClick={() => setEditingFaq(null)} className="btn-secondary text-xs">إلغاء</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">{f.q}</p>
                            <p className="text-slate-600 text-sm mt-1">{f.a}</p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => setEditingFaq({ index: i, q: f.q, a: f.a })} className="text-xs text-emerald-700 hover:underline">تعديل</button>
                              <button onClick={() => deleteFaq(i)} className="text-xs text-red-600 hover:underline">حذف</button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="السؤال" value={newFaq.q} onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })} />
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="الإجابة" value={newFaq.a} onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })} />
                  </div>
                  <button onClick={addFaq} className="btn-primary mt-3" disabled={saving}>إضافة سؤال</button>
                </section>
              </div>
  </>;
}
