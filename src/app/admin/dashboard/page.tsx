'use client';

import EditorialReviewPanel from '@/components/EditorialReviewPanel';
import ContentImpactCenter from '@/components/ContentImpactCenter';
import PackageRequestsAdmin from '@/components/PackageRequestsAdmin';
import {DataRoleLegend} from '@/components/AdminDataRoles';
import VisibilityDashboard from '@/components/VisibilityDashboard';
import CookiePolicyAdmin from '@/components/CookiePolicyAdmin';
import SearchIntegrationsAdmin from '@/components/SearchIntegrationsAdmin';
import GeoEngineMonitor from '@/components/GeoEngineMonitor';
import UnifiedRunHistory from '@/components/UnifiedRunHistory';
import GeoFeedbackMemory from '@/components/GeoFeedbackMemory';
import LegacyToolsArchive from '@/components/LegacyToolsArchive';
import PublishedLinksList from '@/components/PublishedLinksList';
import {ADMIN_LEGACY_ARCHIVE_ENABLED,ADMIN_PUBLISHED_LINKS_ENABLED} from '@/lib/admin-consolidation-flags';

import DashboardSidebar from "@/components/admin/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/admin/dashboard/DashboardHeader";
import DashboardOverview from "@/components/admin/dashboard/DashboardOverview";
import DashboardContact from "@/components/admin/dashboard/DashboardContact";

import DashboardContent from "@/components/admin/dashboard/DashboardContent";
import DashboardAgentStatus from "@/components/admin/dashboard/DashboardAgentStatus";
import DashboardReviews from "@/components/admin/dashboard/DashboardReviews";
import DashboardSettings from "@/components/admin/dashboard/DashboardSettings";
import DashboardCompetitors from "@/components/admin/dashboard/DashboardCompetitors";
import DashboardKeywords from "@/components/admin/dashboard/DashboardKeywords";
import DashboardOpportunities from "@/components/admin/dashboard/DashboardOpportunities";
import DashboardGoals from "@/components/admin/dashboard/DashboardGoals";
import DashboardEvidence from "@/components/admin/dashboard/DashboardEvidence";

import {useDashboardController} from "@/components/admin/dashboard/hooks/useDashboardController";
import {deriveDashboardSummary} from "@/lib/admin/dashboard/summary";

export default function AdminDashboard() {
  const {secret,setSecret,authed,content,error,setError,tab,setTab,openHub,setOpenHub,sidebarOpen,setSidebarOpen,newFaq,setNewFaq,editingFaq,setEditingFaq,draftReviewEdits,setDraftReviewEdits,newMarketKeyword,setNewMarketKeyword,competitorSearch,setCompetitorSearch,keywordSearch,setKeywordSearch,feedbackTarget,setFeedbackTarget,competitorFilter,setCompetitorFilter,goldenDraft,setGoldenDraft,contactForm,setContactForm,saving,setSaving,competitors,keywords,opportunities,goals,runs,editingCompetitor,setEditingCompetitor,newCompetitor,setNewCompetitor,lastUpdated,evidenceData,evidenceLoading,recordedBriefs,marketLoading,marketSources,editingMarketKeyword,setEditingMarketKeyword,newGoal,setNewGoal,editingGoal,setEditingGoal,editingOpportunity,setEditingOpportunity,keywordLanguage,setKeywordLanguage,notice,setNotice,refreshingAll,visibilityRefreshKey,restoringSession,fetchContent,login,save,marketFetch,refreshMarketCollection,refreshMarket,fetchMarketSources,fetchEvidence,approveDraft,rejectDraft,addFaq,updateFaq,deleteFaq,saveGolden,saveContact,refreshAll,logout}=useDashboardController();
  if (restoringSession) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600" dir="rtl" role="status">جارٍ التحقق من جلسة الإدارة...</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-luxury p-8">
          <h1 className="text-2xl font-bold text-navy-900 mb-2">لوحة التحكم — الوصول مقيّد</h1>
          <p className="text-slate-600 mb-4 text-sm">أدخل المفتاح السري للمتابعة.</p>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="المفتاح السري" className="w-full border border-slate-300 rounded-lg px-4 py-2 mb-4" />
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <button onClick={login} disabled={saving} className="btn-primary w-full">{saving?'جارٍ التحقق...':'دخول لوحة التحكم'}</button>
        </div>
      </div>
    );
  }

  if (!content) {
    return <div className="min-h-screen flex flex-col gap-3 items-center justify-center text-slate-600" dir="rtl"><p>{error||'جاري التحميل...'}</p><button className="btn-secondary" onClick={fetchContent}>إعادة المحاولة</button><button className="text-sm underline" onClick={logout}>تسجيل الخروج</button></div>;
  }

  const {uniqueCorrectionCandidates,pendingDrafts,competitorBackedOpps,keywordDerivedOpps}=deriveDashboardSummary(content,competitors,keywords,opportunities);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="flex">
            <DashboardSidebar tab={tab} openHub={openHub} sidebarOpen={sidebarOpen} setOpenHub={setOpenHub} setTab={setTab} setSidebarOpen={setSidebarOpen} logout={logout} />

        <div className="flex-1 min-w-0">
            <DashboardHeader tab={tab} setSidebarOpen={setSidebarOpen} refreshAll={refreshAll} marketLoading={marketLoading} refreshingAll={refreshingAll} saving={saving} secret={secret} lastUpdated={lastUpdated} />

          <main className="min-w-0 p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="mb-4"><DataRoleLegend /></div>
            {error && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 mb-4 text-sm">{error}</div>}
            {notice && <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 mb-4 text-sm flex justify-between gap-3"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="إغلاق التنبيه">✕</button></div>}

            {tab === 'home' && (
            <DashboardOverview competitors={competitors} keywords={keywords} keywordDerivedOpps={keywordDerivedOpps} competitorBackedOpps={competitorBackedOpps} goals={goals} pendingDrafts={pendingDrafts} runs={runs} content={content} setTab={setTab} />
            )}

            {tab === 'package_requests' && <PackageRequestsAdmin secret={secret} />}
            {tab === 'contact' && (
            <DashboardContact contactForm={contactForm} setContactForm={setContactForm} saveContact={saveContact} saving={saving} />
            )}

            {tab === 'content' && (
            <DashboardContent content={content} goldenDraft={goldenDraft} setGoldenDraft={setGoldenDraft} saveGolden={saveGolden} saving={saving} setTab={setTab} editingFaq={editingFaq} setEditingFaq={setEditingFaq} updateFaq={updateFaq} deleteFaq={deleteFaq} newFaq={newFaq} setNewFaq={setNewFaq} addFaq={addFaq} />
            )}

            {tab === 'agent' && <GeoEngineMonitor secret={secret} runs={runs} competitors={competitors} keywords={keywords} opportunities={opportunities} goals={goals} sources={marketSources} loading={marketLoading} refresh={() => { void refreshMarket(); void fetchMarketSources(); }} />}
            {tab === 'agent' && <GeoFeedbackMemory adminSecret={secret} initial={feedbackTarget} candidates={uniqueCorrectionCandidates} />}

            {tab === 'agent' && (
            <DashboardAgentStatus content={content} marketSources={marketSources} fetchMarketSources={fetchMarketSources} saving={saving} setSaving={setSaving} setError={setError} setNotice={setNotice} marketFetch={marketFetch} refreshMarketCollection={refreshMarketCollection} />
            )}

            {tab === 'reviews' && (
            <DashboardReviews content={content} saving={saving} onDeleteFaq={q=>save({deleteGeoContent:{kind:'faq',question:q}})} />
            )}

            {tab === 'published_links' && ADMIN_PUBLISHED_LINKS_ENABLED && <PublishedLinksList editorialItems={content.editorialItems||[]} faqs={content.faqs||[]} drafts={content.drafts||[]} adminSecret={secret} />}

            {tab === 'impact' && <GeoFeedbackMemory adminSecret={secret} initial={feedbackTarget} candidates={uniqueCorrectionCandidates} />}
            {tab === 'impact' && (
              <ContentImpactCenter
                editorialItems={content.editorialItems||[]}
                faqs={content.faqs||[]}
                drafts={content.drafts||[]}
                adminSecret={secret}
                saving={saving}
                onSaveItems={async items=>await save({editorialItems:items})}
                onSaveDrafts={async drafts=>await save({drafts})}
                onNavigate={section=>setTab(section)}
                publishedLinksEnabled={ADMIN_PUBLISHED_LINKS_ENABLED}
              />
            )}

            {tab === 'editorial' && (
              <EditorialReviewPanel
                items={content.editorialItems||[]}
                saving={saving}
                onDeleteItem={id=>save({deleteGeoContent:{kind:'editorial',id}})}
              />
            )}

            {tab === 'settings' && (
            <DashboardSettings content={content} setTab={setTab} marketLoading={marketLoading} refreshingAll={refreshingAll} saving={saving} refreshAll={refreshAll} />
            )}

            {tab === 'settings' && ADMIN_LEGACY_ARCHIVE_ENABLED && <LegacyToolsArchive onNavigate={setTab} />}

            {tab === 'competitors' && (
            <DashboardCompetitors competitorSearch={competitorSearch} setCompetitorSearch={setCompetitorSearch} competitorFilter={competitorFilter} setCompetitorFilter={setCompetitorFilter} newCompetitor={newCompetitor} setNewCompetitor={setNewCompetitor} editingCompetitor={editingCompetitor} setEditingCompetitor={setEditingCompetitor} competitors={competitors} saving={saving} setSaving={setSaving} setError={setError} setNotice={setNotice} marketFetch={marketFetch} refreshMarketCollection={refreshMarketCollection} />
            )}

            {tab === 'keywords' && (
            <DashboardKeywords secret={secret} feedbackTarget={feedbackTarget} uniqueCorrectionCandidates={uniqueCorrectionCandidates} keywordSearch={keywordSearch} setKeywordSearch={setKeywordSearch} newMarketKeyword={newMarketKeyword} setNewMarketKeyword={setNewMarketKeyword} keywordLanguage={keywordLanguage} setKeywordLanguage={setKeywordLanguage} keywords={keywords} editingMarketKeyword={editingMarketKeyword} setEditingMarketKeyword={setEditingMarketKeyword} setFeedbackTarget={setFeedbackTarget} saving={saving} setSaving={setSaving} setError={setError} setNotice={setNotice} marketFetch={marketFetch} refreshMarketCollection={refreshMarketCollection} />
            )}

            {tab === 'opportunities' && (
            <DashboardOpportunities secret={secret} content={content} setTab={setTab} editingOpportunity={editingOpportunity} setEditingOpportunity={setEditingOpportunity} opportunities={opportunities} saving={saving} setSaving={setSaving} setError={setError} setNotice={setNotice} marketFetch={marketFetch} refreshMarketCollection={refreshMarketCollection} />
            )}

            {tab === 'goals' && (
            <DashboardGoals newGoal={newGoal} setNewGoal={setNewGoal} editingGoal={editingGoal} setEditingGoal={setEditingGoal} goals={goals} saving={saving} setSaving={setSaving} setError={setError} setNotice={setNotice} marketFetch={marketFetch} refreshMarketCollection={refreshMarketCollection} />
            )}

            {tab === 'visibility' && <VisibilityDashboard key={visibilityRefreshKey} secret={secret} onOpenImpact={()=>setTab('impact')} />}
            {tab === 'cookies' && <CookiePolicyAdmin policy={content?.cookiePolicy} saving={saving} onSave={async cookiePolicy => save({cookiePolicy})} />}
            {tab === 'integrations' && <SearchIntegrationsAdmin settings={content?.searchIntegrations} saving={saving} onSave={async searchIntegrations => save({searchIntegrations})} />}

            {tab === 'runs' && <UnifiedRunHistory secret={secret} legacyRuns={runs} />}

            {tab === 'evidence' && (
            <DashboardEvidence evidenceData={evidenceData} evidenceLoading={evidenceLoading} fetchEvidence={fetchEvidence} recordedBriefs={recordedBriefs} />
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
