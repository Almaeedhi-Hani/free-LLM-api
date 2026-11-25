'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import {readable} from "@/lib/admin/dashboard/presentation";
type Props=Pick<DashboardViewContracts,"newGoal"|"setNewGoal"|"editingGoal"|"setEditingGoal"|"goals"|"saving"|"setSaving"|"setError"|"setNotice"|"marketFetch"|"refreshMarketCollection">;

export default function DashboardGoals({newGoal,setNewGoal,editingGoal,setEditingGoal,goals,saving,setSaving,setError,setNotice,marketFetch,refreshMarketCollection}:Props) {
  return <>
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-2">أهداف الوكيل</h2>
                  <p className="text-sm text-slate-500 mb-4">أضف هدفًا قابلاً للمتابعة. يمكن تعديله أو إغلاقه دون حذف سجل القرارات.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    <input className="border rounded-lg px-3 py-2" placeholder="عنوان الهدف" aria-label="عنوان هدف جديد" value={newGoal.title} onChange={e=>setNewGoal({...newGoal,title:e.target.value})}/>
                    <input className="border rounded-lg px-3 py-2" placeholder="وصف الهدف أو النتيجة المطلوبة" aria-label="وصف هدف جديد" value={newGoal.description} onChange={e=>setNewGoal({...newGoal,description:e.target.value})}/>
                    <select className="border rounded-lg px-3 py-2" aria-label="أولوية الهدف الجديد" value={newGoal.priority} onChange={e=>setNewGoal({...newGoal,priority:e.target.value})}>
                      <option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option>
                    </select>
                  </div>
                  <button className="btn-primary mb-4" disabled={saving} onClick={async()=>{
                    if(!newGoal.title.trim()||!newGoal.description.trim()){setError('أدخل عنوان الهدف ووصفه.');return;}
                    setSaving(true);setError('');
                    try{
                      await marketFetch('/api/admin/market/goals',{method:'POST',body:JSON.stringify({title:newGoal.title.trim(),description:newGoal.description.trim(),priority:newGoal.priority,evidence:[],success_metrics:[],confidence:'low'})});
                      await refreshMarketCollection('goals');setNewGoal({title:'',description:'',priority:'medium'});setNotice('أُضيف الهدف بنجاح. أضف مؤشرات قياس قبل التنفيذ.');
                    }catch(e:any){setError(e.message||'تعذرت إضافة الهدف.');}finally{setSaving(false);}
                  }}>إضافة هدف</button>
                  {editingGoal && <section className="mb-4 bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <h3 className="font-bold mb-2">تعديل الهدف</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input className="border rounded-lg px-3 py-2" aria-label="عنوان الهدف المعدل" value={editingGoal.title} onChange={e=>setEditingGoal({...editingGoal,title:e.target.value})}/>
                      <input className="border rounded-lg px-3 py-2" aria-label="وصف الهدف المعدل" value={editingGoal.description} onChange={e=>setEditingGoal({...editingGoal,description:e.target.value})}/>
                      <select className="border rounded-lg px-3 py-2" value={editingGoal.priority} aria-label="أولوية الهدف المعدلة" onChange={e=>setEditingGoal({...editingGoal,priority:e.target.value})}>
                        <option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option>
                      </select>
                    </div>
                    <div className="flex gap-2 mt-3"><button className="btn-primary text-xs" disabled={saving} onClick={async()=>{
                      if(!editingGoal.title.trim()){setError('عنوان الهدف مطلوب.');return;}
                      setSaving(true);setError('');
                      try{await marketFetch('/api/admin/market/goals',{method:'PATCH',body:JSON.stringify({...editingGoal,title:editingGoal.title.trim()})});await refreshMarketCollection('goals');setEditingGoal(null);setNotice('حُفظ تعديل الهدف.');}
                      catch(e:any){setError(e.message||'تعذر حفظ الهدف.');}finally{setSaving(false);}
                    }}>حفظ التعديل</button><button className="btn-secondary text-xs" disabled={saving} onClick={()=>setEditingGoal(null)}>إلغاء</button></div>
                  </section>}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">العنوان</th><th>الأولوية</th><th>الحالة</th><th>الثقة</th><th>المؤشرات</th><th>إجراء</th></tr></thead>
                      <tbody>
                        {goals.map((g: any) => (
                          <tr key={g.id} className="border-b">
                            <td className="py-2">{g.title}<div className="text-xs text-slate-400">{g.description}</div></td>
                            <td>{readable(g.priority)}</td>
                            <td>{readable(g.status)}</td>
                            <td>{g.confidence}</td>
                            <td className="text-xs">{(g.success_metrics || []).map((m: any) => m.metric).join(', ')}</td>
                            <td><div className="flex gap-2 flex-wrap items-center">
                              <button className="text-xs text-blue-700 underline" disabled={saving} onClick={()=>setEditingGoal({id:g.id,title:g.title,description:g.description||'',priority:g.priority})}>تعديل</button>
                              <select disabled={saving} className="border border-slate-300 rounded text-xs" value={g.status} onChange={async (e) => {
                                setSaving(true);setError('');try { await marketFetch('/api/admin/market/goals', { method: 'PATCH', body: JSON.stringify({ id: g.id, status: e.target.value }) }); await refreshMarketCollection('goals');setNotice('تم تحديث حالة الهدف'); }
                                catch (err: any) { setError(err.message); }finally{setSaving(false);}
                              }}>
                                <option value="open">مفتوح</option><option value="in_progress">قيد التنفيذ</option><option value="done">منجز</option><option value="cancelled">ملغى</option>
                              </select></div>
                            </td>
                          </tr>
                        ))}
                        {goals.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400 text-center">لا توجد أهداف بعد.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
  </>;
}
