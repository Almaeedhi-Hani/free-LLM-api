'use client';
import {TABS,type Tab} from "@/lib/admin/dashboard/navigation";
import DashboardReportExport from "@/components/DashboardReportExport";
type Props={tab:Tab;setSidebarOpen:(value:boolean)=>void;refreshAll:()=>void|Promise<void>;marketLoading:boolean;refreshingAll:boolean;saving:boolean;secret:string;lastUpdated:string};

export default function DashboardHeader({tab,setSidebarOpen,refreshAll,marketLoading,refreshingAll,saving,secret,lastUpdated}:Props) {
  return <>
          <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
            <div className="px-2.5 sm:px-6 py-2.5">
              <div className="flex items-center justify-between gap-1.5 sm:gap-3" data-testid="dashboard-header-row">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
                  <button className="lg:hidden shrink-0 text-navy-900 p-1" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة">☰</button>
                  <h1 className="truncate text-base sm:text-xl font-bold text-navy-900">{TABS.find((t) => t.key === tab)?.label}</h1>
                </div>
                <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
                  <button onClick={refreshAll} className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm font-medium text-navy-900 whitespace-nowrap disabled:opacity-50" disabled={marketLoading||refreshingAll||saving}>{refreshingAll||marketLoading?'جارٍ التحديث...':'تحديث البيانات'}</button>
                  {tab==='home'&&<DashboardReportExport secret={secret} disabled={saving||refreshingAll}/>}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-right text-xs text-slate-500" data-testid="dashboard-header-sync">
                <span>آخر مزامنة: {lastUpdated || 'غير متوفر'}</span>
                {saving && <span className="text-gold-600">جاري الحفظ...</span>}
              </div>
            </div>
          </header>
  </>;
}
