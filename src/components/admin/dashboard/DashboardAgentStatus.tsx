'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import {ADMIN_LEGACY_ARCHIVE_ENABLED} from "@/lib/admin-consolidation-flags";
type Props=Pick<DashboardViewContracts,"content"|"marketSources"|"fetchMarketSources"|"saving"|"setSaving"|"setError"|"setNotice"|"marketFetch"|"refreshMarketCollection">;

export default function DashboardAgentStatus({content,marketSources,fetchMarketSources,saving,setSaving,setError,setNotice,marketFetch,refreshMarketCollection}:Props) {
  return <>
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4">وكيل GEO — حالة النظام</h2>
                {!ADMIN_LEGACY_ARCHIVE_ENABLED && <details className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-semibold">خيارات تشغيل الرادار والتحليل القديم (متقدمة)</summary>
                  <p className="my-2 text-xs text-slate-600">الرادار المستقل أصبح مجدولًا كل ساعتين حتى السبت 21 نوفمبر، ثم كل 4 ساعات من الأحد 22 نوفمبر، ويعمل منفصلًا عن محرك GEO الحديث. التشغيل اليدوي هنا يضيف دورة أخرى وقد يستهلك حدود مصادر البحث.</p>
                  <div className="flex gap-2">
                      <button className="btn-primary text-xs" disabled={saving} onClick={async () => {
                        if(!window.confirm('بدء تحليل السوق وحفظ النتائج؟'))return;
                        setSaving(true);
                         setError('');try { await marketFetch('/api/admin/market/analyze', { method: 'POST', body: JSON.stringify({ triggered_by: 'admin' }) }); await refreshMarketCollection('opportunities'); await refreshMarketCollection('goals'); await refreshMarketCollection('runs');setNotice('اكتمل تحليل السوق'); }
                        catch (e: any) { setError(e.message); }
                        finally { setSaving(false); }
                      }}>تشغيل التحليل</button>
                      <button className="btn-secondary text-xs" disabled={saving} onClick={async () => {
                        if(!window.confirm('تشغيل الرادار وجمع بيانات بحث خارجية وحفظها؟'))return;
                        setSaving(true);
                         setError('');try { await marketFetch('/api/admin/market/radar', { method: 'POST', body: JSON.stringify({ triggered_by: 'admin' }) }); await refreshMarketCollection('opportunities'); await refreshMarketCollection('goals'); await refreshMarketCollection('keywords'); await refreshMarketCollection('competitors'); await refreshMarketCollection('runs');setNotice('اكتمل تشغيل الرادار'); }
                        catch (e: any) { setError(e.message); }
                        finally { setSaving(false); }
                      }}>تشغيل الرادار</button>
                    </div>
                </details>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500">الحالة</p>
                    <p className="font-bold text-emerald-700">{content.agent?.status || 'idle'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500">آخر تشغيل</p>
                    <p className="font-bold text-slate-700 text-sm">{content.agent?.lastRun || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500">آخر نتيجة</p>
                    <p className="text-slate-700 text-sm">{content.agent?.lastResult || '—'}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">تُدار أوقات تشغيل الوكيل من GitHub Actions. المحتوى عالي الخطورة يحتاج إلى مراجعة بشرية.</p>
                <div className="mt-5 rounded-xl border border-slate-200 p-4"><h3 className="font-bold mb-3">مصادر البحث في Render</h3><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{marketSources.filter((s:any)=>['exa','tavily','parallel','firecrawl'].includes(s.id)).map((s:any)=><div key={s.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium">{s.id}</p><p className={s.available?'text-emerald-700':'text-amber-700'}>{s.available?'المفتاح موجود':'غير مهيأ'}</p></div>)}</div><p className="text-xs text-slate-500 mt-2">وجود المفتاح لا يضمن نجاح الاتصال؛ راجع اختبارات الاتصال المنفصلة.</p><button className="btn-secondary text-xs mt-3" onClick={fetchMarketSources}>تحديث المصادر</button></div>
              </section>
  </>;
}
