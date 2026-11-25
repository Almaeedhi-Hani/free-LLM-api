'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import {readable} from "@/lib/admin/dashboard/presentation";
type Props=Pick<DashboardViewContracts,"competitorSearch"|"setCompetitorSearch"|"competitorFilter"|"setCompetitorFilter"|"newCompetitor"|"setNewCompetitor"|"editingCompetitor"|"setEditingCompetitor"|"competitors"|"saving"|"setSaving"|"setError"|"setNotice"|"marketFetch"|"refreshMarketCollection">;

export default function DashboardCompetitors({competitorSearch,setCompetitorSearch,competitorFilter,setCompetitorFilter,newCompetitor,setNewCompetitor,editingCompetitor,setEditingCompetitor,competitors,saving,setSaving,setError,setNotice,marketFetch,refreshMarketCollection}:Props) {
  return <>
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-2">دليل المنافسين</h2><p className="text-sm text-slate-500 mb-4">يمكن إضافة المنافسين وتعديلهم أو استبعادهم. يبقى سجل الأدلة محفوظًا عند الاستبعاد.</p>
                  <div className="flex flex-wrap items-center gap-2 mb-4"><input className="border border-slate-300 rounded-lg px-3 py-2 flex-1 min-w-[170px]" value={competitorSearch} onChange={e=>setCompetitorSearch(e.target.value)} placeholder="بحث بالاسم أو النطاق" aria-label="بحث المنافسين"/><select value={competitorFilter} onChange={e=>setCompetitorFilter(e.target.value)} aria-label="حالة المنافس" className="border border-slate-300 rounded-lg px-3 py-2"><option value="all">كل الحالات</option><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="disqualified">مستبعد</option></select></div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="اسم المنافس" aria-label="اسم المنافس" value={newCompetitor.name} onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })} />
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="النطاق مثل example.com" aria-label="نطاق المنافس" value={newCompetitor.domain} onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })} />
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="اللغات: ar,en,zh" aria-label="لغات المنافس" value={newCompetitor.languages} onChange={(e) => setNewCompetitor({ ...newCompetitor, languages: e.target.value })} />
                    <button className="btn-primary" disabled={saving} onClick={async () => {
                      if(!newCompetitor.name.trim()||!newCompetitor.domain.trim()){setError('أدخل اسم المنافس والنطاق');return;}
                      setSaving(true);
                      try {
                        await marketFetch('/api/admin/market/competitors', { method: 'POST', body: JSON.stringify({ name: newCompetitor.name, domain: newCompetitor.domain, languages: newCompetitor.languages.split(',').map((s) => s.trim()).filter(Boolean), source: newCompetitor.source }) });
                        setNewCompetitor({ name: '', domain: '', languages: 'ar,en', source: 'manual' });
                        await refreshMarketCollection('competitors');setNotice('اكتمل تحديث المنافسين');
                      } catch (e: any) { setError(e.message); }
                      finally { setSaving(false); }
                    }}>إضافة</button>
                  </div>
                  {editingCompetitor && <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <h3 className="font-bold mb-3">تعديل بيانات المنافس</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input aria-label="اسم المنافس المعدل" className="border rounded-lg px-3 py-2" value={editingCompetitor.name} onChange={e=>setEditingCompetitor({...editingCompetitor,name:e.target.value})}/>
                      <input aria-label="نطاق المنافس المعدل" className="border rounded-lg px-3 py-2" value={editingCompetitor.domain} onChange={e=>setEditingCompetitor({...editingCompetitor,domain:e.target.value})}/>
                      <input aria-label="لغات المنافس المعدلة" className="border rounded-lg px-3 py-2" value={editingCompetitor.languages} onChange={e=>setEditingCompetitor({...editingCompetitor,languages:e.target.value})}/>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="btn-primary text-xs" disabled={saving} onClick={async()=>{
                        if(!editingCompetitor.name.trim()||!editingCompetitor.domain.trim()){setError('اسم المنافس والنطاق مطلوبان.');return;}
                        setSaving(true);setError('');
                        try {
                          await marketFetch('/api/admin/market/competitors',{method:'PATCH',body:JSON.stringify({id:editingCompetitor.id,name:editingCompetitor.name.trim(),domain:editingCompetitor.domain.trim(),languages:editingCompetitor.languages.split(',').map(v=>v.trim()).filter(Boolean)})});
                          await refreshMarketCollection('competitors');setEditingCompetitor(null);setNotice('تم حفظ بيانات المنافس.');
                        } catch(err:any){setError(err.message||'فشل تعديل المنافس.');} finally{setSaving(false);}
                      }}>حفظ التعديل</button>
                      <button className="btn-secondary text-xs" disabled={saving} onClick={()=>setEditingCompetitor(null)}>إلغاء</button>
                    </div>
                  </section>}
                  <div className="mb-4 flex items-center gap-3">
                    <button className="btn-primary" disabled={saving} onClick={async () => {
                      if (!confirm('بدء بحث محدود عبر مزودي البحث المهيئين وحفظ النتائج في قاعدة البيانات؟')) return;
                      setSaving(true); setError('');
                      try {
                        const d = await marketFetch('/api/admin/market/discovery', { method: 'POST', body: JSON.stringify({ max_competitors: 10 }) });
                        setNotice('اكتمل الاكتشاف: ' + (d.summary?.competitors_discovered ?? 0) + ' منافسين، ' + (d.summary?.keywords_upserted ?? 0) + ' كلمات، ' + (d.summary?.errors?.length ?? 0) + ' أخطاء.');
                        await refreshMarketCollection('competitors');
                      } catch (e: any) { setError(e.message); }
                      finally { setSaving(false); }
                    }}>تشغيل اكتشاف المنافسين</button>
                    <span className="text-sm text-slate-500">Exa وTavily وParallel وFirecrawl، ضمن حدود الاستهلاك.</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">الاسم</th><th>النطاق</th><th>الحالة</th><th>اللغات</th><th>آخر رصد</th><th>إجراء</th></tr></thead>
                      <tbody>
                        {competitors.filter((c:any)=>(competitorFilter==='all'||c.status===competitorFilter)&&(!competitorSearch.trim()||((c.name||'')+' '+(c.domain||'')).toLowerCase().includes(competitorSearch.trim().toLowerCase()))).map((c:any) => (
                          <tr key={c.id} className="border-b">
                            <td className="py-2">{c.name}</td>
                            <td dir="ltr" className="text-left">{c.domain}</td>
                            <td>{readable(c.status)}</td>
                            <td>{(c.languages || []).map(readable).join('، ')}</td>
                            <td className="text-xs text-slate-400">{c.last_seen_at ? new Date(c.last_seen_at).toLocaleDateString('ar-SA') : '—'}</td>
                            <td><div className="flex flex-wrap gap-2 items-center"><button className="text-blue-700 text-xs underline" disabled={saving} onClick={()=>setEditingCompetitor({id:c.id,name:c.name,domain:c.domain,languages:(c.languages||[]).join(',')})}>تعديل البيانات</button><select aria-label={'حالة '+c.name} className="border border-slate-300 rounded px-2 py-1 text-xs" disabled={saving} value={c.status} onChange={async(e)=>{
                              const status=e.target.value;if(status==='disqualified'&&!window.confirm('هل تريد استبعاد هذا المنافس؟'))return;
                              setSaving(true);setError('');try{await marketFetch('/api/admin/market/competitors',{method:'PATCH',body:JSON.stringify({id:c.id,status})});await refreshMarketCollection('competitors');setNotice('تم تحديث حالة المنافس');}
                              catch(err:any){setError(err.message);}finally{setSaving(false);}
                            }}><option value="active">نشط</option><option value="inactive">غير نشط</option><option value="disqualified">مستبعد</option></select></div></td>
                          </tr>
                        ))}
                        {competitors.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400 text-center">لا يوجد منافسون بعد. شغّل الاكتشاف لجلب مرشحين فعليين.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
  </>;
}
