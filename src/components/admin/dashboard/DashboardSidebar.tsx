'use client';
import {NAV_HUBS,TABS,type Tab,type AdminHub} from "@/lib/admin/dashboard/navigation";
import {ADMIN_PUBLISHED_LINKS_ENABLED} from "@/lib/admin-consolidation-flags";
type Props={tab:Tab;openHub:AdminHub;sidebarOpen:boolean;setOpenHub:(value:AdminHub)=>void;setTab:(value:Tab)=>void;setSidebarOpen:(value:boolean)=>void;logout:()=>void};

export default function DashboardSidebar({tab,openHub,sidebarOpen,setOpenHub,setTab,setSidebarOpen,logout}:Props) {
  return <>
        <aside className={`fixed inset-y-0 right-0 z-40 w-64 h-screen flex flex-col bg-navy-950 text-white transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static`}>
          <div className="p-5 border-b border-navy-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gold-500 shadow-gold-glow" />
              <span className="font-bold text-lg">لوحة التحكم</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">GEO Intelligence</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="أقسام لوحة التحكم">
            {NAV_HUBS.map(hub=>{
              const active=hub.tabs.includes(tab);
              const expanded=openHub===hub.key;
              return <div key={hub.key} className="space-y-1">
                <button type="button" aria-expanded={hub.tabs.length>1?expanded:undefined} aria-controls={hub.tabs.length>1?'admin-hub-'+hub.key:undefined} aria-current={hub.tabs.length===1&&active?'page':undefined}
                  onClick={()=>{
                    setOpenHub(hub.key);
                    if(!active)setTab(hub.landing);
                    if(hub.tabs.length===1)setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${active?'bg-gold-600 text-white':'text-slate-200 hover:bg-navy-800'}`}>
                  <span className="flex items-center gap-2"><span aria-hidden="true">{hub.icon}</span>{hub.label}</span>
                  {hub.tabs.length>1&&<span aria-hidden="true" className="text-xs">{expanded?'▾':'◂'}</span>}
                </button>
                {expanded&&hub.tabs.length>1&&<div id={'admin-hub-'+hub.key} className="mr-4 space-y-1 border-r border-slate-600/50 pr-2">
                  {hub.tabs.filter(key=>ADMIN_PUBLISHED_LINKS_ENABLED||key!=='published_links').map(key=>{
                    const item=TABS.find(t=>t.key===key)!;
                    return <button type="button" key={key}
                      onClick={()=>{setTab(key);setSidebarOpen(false)}}
                      aria-current={tab===key?'page':undefined}
                      className={`w-full rounded-lg px-3 py-2 text-right text-xs transition ${tab===key?'bg-navy-700 text-gold-300 font-bold':'text-slate-300 hover:bg-navy-800 hover:text-white'}`}>
                      {item.icon} {item.label}
                    </button>;
                  })}
                </div>}
              </div>;
            })}
          </nav>
          <div className="shrink-0 p-4 border-t border-navy-800">
            <button onClick={logout} className="w-full text-sm text-slate-300 hover:text-white">تسجيل الخروج</button>
          </div>
        </aside>

        {sidebarOpen && <button type="button" aria-label="إغلاق قائمة التنقل" className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
  </>;
}
