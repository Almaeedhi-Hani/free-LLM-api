'use client';
import type {DashboardViewContracts} from "@/lib/admin/dashboard/view-contracts";
import {ADMIN_LEGACY_ARCHIVE_ENABLED} from "@/lib/admin-consolidation-flags";
type Props=Pick<DashboardViewContracts,"content"|"setTab"|"marketLoading"|"refreshingAll"|"saving"|"refreshAll">;

export default function DashboardSettings({content,setTab,marketLoading,refreshingAll,saving,refreshAll}:Props) {
  return <>
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-2">إعدادات وإدارة النظام</h2><p className="text-sm text-slate-500 mb-4">إعدادات عامة وروابط الإدارة. تُحفظ الأسرار في Render ولا تُعرض هنا.</p>
                <p className="text-slate-600 text-sm mb-2">الفقرة الذهبية (للقراءة هنا؛ يحدّثها الوكيل):</p>
                <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{content.goldenParagraph}</p>
                <p className="text-xs text-slate-500 mt-4">آخر تحديث: {content.updatedAt ? new Date(content.updatedAt).toLocaleString('ar-SA') : '—'}</p>
                {!ADMIN_LEGACY_ARCHIVE_ENABLED && <div className="mt-6 border-t border-slate-200 pt-4"><h3 className="font-bold mb-3">إدارة النظام</h3><p className="text-sm text-slate-600 mb-3">تُحدّث إعدادات مفاتيح API من Render، وتُدار جدولة الوكيل من GitHub Actions. لا تُعرض القيم السرية في اللوحة.</p><div className="flex flex-wrap gap-2"><button className="btn-secondary text-xs" onClick={()=>setTab('agent')}>مصادر البحث والوكيل</button><button className="btn-secondary text-xs" onClick={()=>setTab('contact')}>معلومات التواصل</button><button className="btn-secondary text-xs" onClick={()=>setTab('reviews')}>مسودات الموافقة</button><button className="btn-secondary text-xs" disabled={marketLoading||refreshingAll||saving} onClick={refreshAll}>تحديث جميع البيانات</button></div></div>}
              </section>
  </>;
}
