'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import TechnicalTaskBoard from "@/components/TechnicalTaskBoard";
import {readable} from "@/lib/admin/dashboard/presentation";
type Props=Pick<DashboardViewContracts,"secret"|"content"|"setTab"|"editingOpportunity"|"setEditingOpportunity"|"opportunities"|"saving"|"setSaving"|"setError"|"setNotice"|"marketFetch"|"refreshMarketCollection">;

export default function DashboardOpportunities({secret,content,setTab,editingOpportunity,setEditingOpportunity,opportunities,saving,setSaving,setError,setNotice,marketFetch,refreshMarketCollection}:Props) {
  return <>
              <div className="space-y-6">
                <TechnicalTaskBoard secret={secret} items={content.editorialItems||[]} onOpenDetails={()=>setTab('editorial')} />
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h2 className="text-xl font-bold">الفرص السوقية</h2>
                    <button type="button" className="btn-primary text-xs" onClick={()=>setTab('agent')}>تشغيل المحرك من وكيل GEO</button>
                  </div>
                  {editingOpportunity && <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <h3 className="font-bold mb-2">تعديل الفرصة</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input className="border rounded-lg px-3 py-2" aria-label="عنوان الفرصة المعدل" value={editingOpportunity.title} onChange={e=>setEditingOpportunity({...editingOpportunity,title:e.target.value})}/>
                      <select className="border rounded-lg px-3 py-2" aria-label="أولوية الفرصة المعدلة" value={editingOpportunity.priority} onChange={e=>setEditingOpportunity({...editingOpportunity,priority:e.target.value})}>
                        <option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option>
                      </select>
                    </div>
                    <div className="flex gap-2 mt-3"><button className="btn-primary text-xs" disabled={saving} onClick={async()=>{
                      if(!editingOpportunity.title.trim()){setError('عنوان الفرصة مطلوب.');return;}
                      setSaving(true);setError('');
                      try{await marketFetch('/api/admin/market/opportunities',{method:'PATCH',body:JSON.stringify({...editingOpportunity,title:editingOpportunity.title.trim()})});await refreshMarketCollection('opportunities');setEditingOpportunity(null);setNotice('تم حفظ تعديل الفرصة.');}
                      catch(e:any){setError(e.message||'تعذر حفظ الفرصة.');}finally{setSaving(false);}
                    }}>حفظ التعديل</button><button className="btn-secondary text-xs" disabled={saving} onClick={()=>setEditingOpportunity(null)}>إلغاء</button></div>
                  </section>}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">العنوان</th><th>النوع</th><th>الأولوية</th><th>الدرجة</th><th>الحالة</th><th>إجراء</th></tr></thead>
                      <tbody>
                        {opportunities.map((o: any) => (
                          <tr key={o.id} className="border-b">
                            <td className="py-2">{o.title}</td>
                            <td>{o.type === 'content_gap' ? 'فجوة تنافسية (منافس)' : 'فجوة كلمات (مستنتجة)'}</td>
                            <td>{readable(o.priority)}</td>
                            <td>{o.score}</td>
                            <td>{readable(o.status)}</td>
                            <td><div className="flex flex-wrap gap-2 items-center">
                              <button className="text-xs text-blue-700 underline" disabled={saving} onClick={()=>setEditingOpportunity({id:o.id,title:o.title,priority:o.priority})}>تعديل</button>
                              <select disabled={saving} className="border border-slate-300 rounded text-xs" value={o.status} onChange={async (e) => {
                                setSaving(true);setError('');try { await marketFetch('/api/admin/market/opportunities', { method: 'PATCH', body: JSON.stringify({ id: o.id, status: e.target.value }) }); await refreshMarketCollection('opportunities');setNotice('تم تحديث حالة الفرصة'); }
                                catch (err: any) { setError(err.message); }finally{setSaving(false);}
                              }}>
                                <option value="new">جديد</option><option value="triaged">فرز</option><option value="planned">مخطط</option><option value="done">منجز</option><option value="rejected">مرفوض</option>
                              </select></div>
                            </td>
                          </tr>
                        ))}
                        {opportunities.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400 text-center">لا توجد فرص بعد. شغّل التحليل بعد إضافة منافسين/كلمات.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">الفرص المعروضة تعتمد على البيانات المحفوظة. تحقق من الأدلة قبل اتخاذ أي إجراء.</p>
                </section>
              </div>
  </>;
}
