'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import GeoFeedbackMemory from "@/components/GeoFeedbackMemory";
import {readable} from "@/lib/admin/dashboard/presentation";
type Props=Pick<DashboardViewContracts,"secret"|"feedbackTarget"|"uniqueCorrectionCandidates"|"keywordSearch"|"setKeywordSearch"|"newMarketKeyword"|"setNewMarketKeyword"|"keywordLanguage"|"setKeywordLanguage"|"keywords"|"editingMarketKeyword"|"setEditingMarketKeyword"|"setFeedbackTarget"|"saving"|"setSaving"|"setError"|"setNotice"|"marketFetch"|"refreshMarketCollection">;

export default function DashboardKeywords({secret,feedbackTarget,uniqueCorrectionCandidates,keywordSearch,setKeywordSearch,newMarketKeyword,setNewMarketKeyword,keywordLanguage,setKeywordLanguage,keywords,editingMarketKeyword,setEditingMarketKeyword,setFeedbackTarget,saving,setSaving,setError,setNotice,marketFetch,refreshMarketCollection}:Props) {
  return <>
              <div className="space-y-6">
                <GeoFeedbackMemory adminSecret={secret} initial={feedbackTarget} candidates={uniqueCorrectionCandidates} />
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-2">كلمات البحث السوقية</h2><p className="text-sm text-slate-500 mb-4">تُستخدم لمراقبة السوق ولا تُنشر تلقائيًا في الموقع.</p>
                  <input className="border border-slate-300 rounded-lg px-3 py-2 w-full mb-3" value={keywordSearch} onChange={e=>setKeywordSearch(e.target.value)} placeholder="تصفية الكلمات أو اللغات" aria-label="تصفية الكلمات المفتاحية"/>
                  <p className="text-xs text-slate-400 mb-3">الأحجام تُخزّن فقط عند توفر مصدر موثوق. لا يتم اختلاق أي بيانات.</p>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <input className="border border-slate-300 rounded-lg px-4 py-2 flex-1" placeholder="المصطلح" value={newMarketKeyword} onChange={(e) => setNewMarketKeyword(e.target.value)} />
                    <select className="border border-slate-300 rounded-lg px-4 py-2" value={keywordLanguage} onChange={e=>setKeywordLanguage(e.target.value as 'ar'|'en'|'zh')} aria-label="لغة الكلمة المفتاحية">
                      <option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="zh">الصينية</option>
                    </select>
                    <button className="btn-primary" disabled={saving} onClick={async () => {
                      if (!newMarketKeyword.trim()) {setError('أدخل كلمة مفتاحية');return;}
                      if(keywords.some((k:any)=>k.language===keywordLanguage&&k.term.trim().toLowerCase()===newMarketKeyword.trim().toLowerCase())){setError('الكلمة موجودة بالفعل لهذه اللغة.');return;}
                      setSaving(true);setError('');
                      try {
                        const lang=keywordLanguage;
                        await marketFetch('/api/admin/market/keywords', { method: 'POST', body: JSON.stringify({ term: newMarketKeyword.trim(), language: lang, source: 'manual' }) });
                        await refreshMarketCollection('keywords');
                        setNewMarketKeyword('');setNotice('أُضيفت الكلمة المفتاحية');
                      } catch (e: any) { setError(e.message); }
                      finally { setSaving(false); }
                    }}>إضافة</button>
                  </div>
                  {editingMarketKeyword && <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <h3 className="font-bold mb-3">تعديل كلمة البحث</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input className="border rounded-lg px-3 py-2" aria-label="تعديل مصطلح البحث" value={editingMarketKeyword.term} onChange={e=>setEditingMarketKeyword({...editingMarketKeyword,term:e.target.value})}/>
                      <select className="border rounded-lg px-3 py-2" aria-label="تعديل لغة البحث" value={editingMarketKeyword.language} onChange={e=>setEditingMarketKeyword({...editingMarketKeyword,language:e.target.value as 'ar'|'en'|'zh'})}>
                        <option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="zh">الصينية</option>
                      </select>
                      <input className="border rounded-lg px-3 py-2" aria-label="مجموعة البحث" placeholder="المجموعة (اختياري)" value={editingMarketKeyword.cluster} onChange={e=>setEditingMarketKeyword({...editingMarketKeyword,cluster:e.target.value})}/>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="btn-primary text-xs" disabled={saving} onClick={async()=>{
                        if(!editingMarketKeyword.term.trim()){setError('مصطلح البحث مطلوب.');return;}
                        setSaving(true);setError('');
                        try{await marketFetch('/api/admin/market/keywords',{method:'PATCH',body:JSON.stringify(editingMarketKeyword)});await refreshMarketCollection('keywords');setEditingMarketKeyword(null);setNotice('تم حفظ تعديل كلمة البحث.');}
                        catch(e:any){setError(e.message||'فشل تعديل الكلمة.');}finally{setSaving(false);}
                      }}>حفظ التعديل</button>
                      <button className="btn-secondary text-xs" onClick={()=>setEditingMarketKeyword(null)} disabled={saving}>إلغاء</button>
                    </div>
                  </section>}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">المصطلح</th><th>اللغة</th><th>النية</th><th>الحجم</th><th>المصدر</th><th>الإجراء</th></tr></thead>
                      <tbody>
                        {keywords.filter((k:any)=>!keywordSearch.trim()||((k.term||'')+' '+(k.language||'')).toLowerCase().includes(keywordSearch.trim().toLowerCase())).map((k:any) => (
                          <tr key={k.id} className="border-b">
                            <td className="py-2">{k.term}</td>
                            <td>{readable(k.language)}</td>
                            <td>{readable(k.intent)}</td>
                            <td>{k.search_volume ?? '—'}</td>
                            <td className="text-xs text-slate-400">{k.source} ({k.volume_confidence})</td>
                            <td><div className="flex items-center gap-3">
                              <button className="text-blue-700 text-xs underline disabled:opacity-50" disabled={saving} onClick={()=>setEditingMarketKeyword({id:k.id,term:k.term,language:k.language,intent:k.intent,cluster:k.cluster||''})}>تعديل</button>
                              <button className="text-amber-800 text-xs underline" onClick={()=>setFeedbackTarget({kind:'keyword',key:k.term,language:k.language})}>تعليم الوكيل</button>
                              <button className="text-red-700 text-xs hover:underline disabled:opacity-50" disabled={saving} onClick={async()=>{
                              if(!window.confirm('حذف الكلمة المفتاحية: '+k.term+'؟'))return;
                              setSaving(true);setError('');try{await marketFetch('/api/admin/market/keywords',{method:'DELETE',body:JSON.stringify({id:k.id})});await refreshMarketCollection('keywords');setNotice('حُذفت الكلمة المفتاحية');}
                              catch(err:any){setError(err.message);}finally{setSaving(false);}
                            }}>حذف</button></div></td>
                          </tr>
                        ))}
                        {keywords.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400 text-center">لا توجد كلمات بعد.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
  </>;
}
