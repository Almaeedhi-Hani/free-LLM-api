'use client';

import EditorialReviewPanel from '@/components/EditorialReviewPanel';
import ContentImpactCenter from '@/components/ContentImpactCenter';
import type { CompetitorPageEvidenceBrief } from '@/lib/competitor-page-evidence';
import PackageRequestsAdmin from '@/components/PackageRequestsAdmin';
import {DataRoleLegend} from '@/components/AdminDataRoles';
import { assessGeoDraftCopy, splitGeoDraftReviewText } from "@/lib/geo-draft-quality";
import React, { useState, useEffect } from 'react';
import VisibilityDashboard from '@/components/VisibilityDashboard';
import CookiePolicyAdmin from '@/components/CookiePolicyAdmin';
import SearchIntegrationsAdmin from '@/components/SearchIntegrationsAdmin';
import GeoEngineMonitor from '@/components/GeoEngineMonitor';
import UnifiedRunHistory from '@/components/UnifiedRunHistory';
import GeoFeedbackMemory, {type CorrectionCandidate} from '@/components/GeoFeedbackMemory';
import {buildPublishedLinks} from '@/lib/published-links';
import LegacyToolsArchive from '@/components/LegacyToolsArchive';
import PublishedLinksList from '@/components/PublishedLinksList';
import {ADMIN_LEGACY_ARCHIVE_ENABLED,ADMIN_PUBLISHED_LINKS_ENABLED} from '@/lib/admin-consolidation-flags';
import {validWhatsAppAdvisorField} from '@/lib/whatsapp-contacts';

import { NAV_HUBS, type Tab, type AdminHub } from "@/lib/admin/dashboard/navigation";
import { contactToForm, numberValid, digitsOnly, type ContactForm } from "@/lib/admin/dashboard/contact-form";
import { draftReviewKey } from "@/lib/admin/dashboard/presentation";
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

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [openHub,setOpenHub]=useState<AdminHub>('overview');
  useEffect(()=>{
    const hub=NAV_HUBS.find(group=>group.tabs.includes(tab));
    if(hub)setOpenHub(hub.key);
  },[tab]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ q: '', a: '' });
  const [editingFaq, setEditingFaq] = useState<{ index: number; q: string; a: string } | null>(null);
  const [draftReviewEdits,setDraftReviewEdits]=useState<Record<string,string>>({});
  const [newKeyword, setNewKeyword] = useState('');
  const [newMarketKeyword,setNewMarketKeyword]=useState('');
  const [competitorSearch,setCompetitorSearch]=useState('');
  const [keywordSearch,setKeywordSearch]=useState('');
  const [feedbackTarget,setFeedbackTarget]=useState<{kind:'keyword'|'competitor'|'opportunity'|'editorial'|'publication'|'faq';key:string;language?:'ar'|'en'|'zh'|null}|null>(null);
  const [competitorFilter,setCompetitorFilter]=useState('all');
  const [goldenDraft, setGoldenDraft] = useState('');
  const [contactForm, setContactForm] = useState<ContactForm>(()=>contactToForm());
  const [saving, setSaving] = useState(false);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [editingCompetitor, setEditingCompetitor] = useState<{ id: string; name: string; domain: string; languages: string } | null>(null);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', domain: '', languages: 'ar,en', source: 'manual' });
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [recordedBriefs, setRecordedBriefs] = useState<CompetitorPageEvidenceBrief[]>([]);
  const [marketLoading,setMarketLoading]=useState(false);
  const [marketSources,setMarketSources]=useState<any[]>([]);
  const [editingMarketKeyword,setEditingMarketKeyword] = useState<{id:string;term:string;language:'ar'|'en'|'zh';intent:string;cluster:string}|null>(null);
  const [newGoal,setNewGoal] = useState({title:'',description:'',priority:'medium'});
  const [editingGoal,setEditingGoal] = useState<{id:string;title:string;description:string;priority:string}|null>(null);
  const [editingOpportunity,setEditingOpportunity] = useState<{id:string;title:string;priority:string}|null>(null);
  const [keywordLanguage,setKeywordLanguage]=useState<'ar'|'en'|'zh'>('ar');
  const [notice,setNotice]=useState('');
  const [refreshingAll,setRefreshingAll]=useState(false);
  const [visibilityRefreshKey,setVisibilityRefreshKey]=useState(0);
  const [restoringSession, setRestoringSession] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gsc') === 'connected') {
      setTab('visibility');
      setNotice('تم استلام تفويض Google. افتح الكلمات والاستعلامات للتحقق من البيانات الفعلية.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const saved = sessionStorage.getItem('admin_secret');
      if (!saved) { if (active) setRestoringSession(false); return; }
      try {
        const response = await fetch('/api/admin/content', {
          headers: { 'x-admin-secret': saved },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Session expired');
        const data = await response.json();
        if (!active) return;
        setSecret(saved);
        setContent(data);
        if (data.contact) setContactForm(contactToForm(data.contact));
        setGoldenDraft(data.goldenParagraph || '');
        setAuthed(true);
      } catch {
        sessionStorage.removeItem('admin_secret');
        if (active) { setAuthed(false); setSecret(''); }
      } finally {
        if (active) setRestoringSession(false);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  const fetchContent = async () => {
    if (!authed || !secret) return;
    try {
      const r = await fetch('/api/admin/content', { headers: { 'x-admin-secret': secret } });
      let d: any = {};
      try { d = await r.json(); } catch { d = {}; }
      if (r.status === 401) {
        setAuthed(false);
        sessionStorage.removeItem('admin_secret');
        throw new Error('غير مصرح');
      }
      if (!r.ok) throw new Error(d.message || `فشل التحميل (${r.status})`);
      setContent(d);
      if (d.contact) setContactForm(contactToForm(d.contact));
      setGoldenDraft(d.goldenParagraph || '');
      setLastUpdated(new Date().toLocaleString('ar-SA'));
      setError('');
    } catch (e: any) {
      setError(e.message || 'فشل التحميل');
    }
  };

  useEffect(() => {
    fetchContent();
  }, [authed, secret]);

  const marketFetch = async (path: string, init?: RequestInit) => {
    const r = await fetch(path, { ...init, headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json', ...(init?.headers || {}) } });
    let d: any = {};
    try { d = await r.json(); } catch { d = {}; }
    if (r.status === 401) { setAuthed(false); sessionStorage.removeItem('admin_secret'); throw new Error('غير مصرح'); }
    if (!r.ok) throw new Error(d.message || `فشل الطلب (${r.status})`);
    return d;
  };

  const fetchCompetitors = async () => { try { const d = await marketFetch('/api/admin/market/competitors'); setCompetitors(d.competitors || []); } catch (e: any) { setError(e.message); } };
  const fetchKeywords = async () => { try { const d = await marketFetch('/api/admin/market/keywords'); setKeywords(d.keywords || []); } catch (e: any) { setError(e.message); } };
  const fetchOpportunities = async () => { try { const d = await marketFetch('/api/admin/market/opportunities'); setOpportunities(d.opportunities || []); } catch (e: any) { setError(e.message); } };
  const fetchGoals = async () => { try { const d = await marketFetch('/api/admin/market/goals'); setGoals(d.goals || []); } catch (e: any) { setError(e.message); } };
  const fetchRuns = async () => { try { const d = await marketFetch('/api/admin/market/runs'); setRuns(d.runs || []); } catch (e: any) { setError(e.message); } };
  const fetchMarketSources=async()=>{try{const d=await marketFetch('/api/admin/market/discovery');setMarketSources(d.sources||[]);}catch(e:any){setError(e.message);}};
  // Mutation flows must not report success if the subsequent read fails.
  const refreshMarketCollection = async (collection: 'competitors'|'keywords'|'opportunities'|'goals'|'runs') => {
    const data = await marketFetch('/api/admin/market/' + collection);
    if (collection === 'competitors') setCompetitors(data.competitors || []);
    else if (collection === 'keywords') setKeywords(data.keywords || []);
    else if (collection === 'opportunities') setOpportunities(data.opportunities || []);
    else if (collection === 'goals') setGoals(data.goals || []);
    else setRuns(data.runs || []);
  };
  const refreshMarket=async()=>{
    setMarketLoading(true);setError('');
    try{const [a,b,c,d,e]=await Promise.all(['competitors','keywords','opportunities','goals','runs'].map(v=>marketFetch('/api/admin/market/'+v)));
      setCompetitors(a.competitors||[]);setKeywords(b.keywords||[]);setOpportunities(c.opportunities||[]);setGoals(d.goals||[]);setRuns(e.runs||[]);
      setLastUpdated(new Date().toLocaleString('ar-SA'));
    }catch(e:any){setError(e.message||'فشل تحميل بيانات السوق');}finally{setMarketLoading(false);}
  };
  const refreshAll=async()=>{
    if (refreshingAll || saving) return;
    setRefreshingAll(true);
    setError('');
    setNotice('');
    try {
      await Promise.all([fetchContent(), refreshMarket(), ...(tab === 'evidence' ? [fetchEvidence()] : []), ...(tab === 'agent' || tab === 'competitors' ? [fetchMarketSources()] : [])]);
      if (tab === 'visibility') setVisibilityRefreshKey(key => key + 1);
    } finally {
      setRefreshingAll(false);
    }
  };

  const fetchEvidence = async () => {
    setEvidenceLoading(true);
    try {
      const comps = await marketFetch('/api/admin/market/competitors');
      const kws = await marketFetch('/api/admin/market/keywords');
      const opps = await marketFetch('/api/admin/market/opportunities');
      const gls = await marketFetch('/api/admin/market/goals');
      const recorded = await marketFetch('/api/admin/market/evidence-briefs');
      setRecordedBriefs(Array.isArray(recorded.briefs) ? recorded.briefs : []);
      setEvidenceData({ competitors: comps.competitors || [], keywords: kws.keywords || [], opportunities: opps.opportunities || [], goals: gls.goals || [] });
    } catch (e: any) { setError(e.message); }
    finally { setEvidenceLoading(false); }
  };

  useEffect(() => {
    if (!authed || !secret) return;
    if (tab === 'home') refreshMarket();
    else if (tab === 'agent') {void Promise.all([refreshMarket(),fetchMarketSources()]);}
    else if (tab === 'competitors') {fetchCompetitors();fetchMarketSources();}
    else if (tab === 'keywords') fetchKeywords();
    else if (tab === 'opportunities') fetchOpportunities();
    else if (tab === 'goals') fetchGoals();
    else if (tab === 'runs') fetchRuns();
    else if (tab === 'evidence') fetchEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed, secret]);

  const login=async()=>{
    const key=secret.trim();if(!key){setError('المفتاح السري مطلوب');return;}
    setSaving(true);setError('');
    try{const response=await fetch('/api/admin/content',{headers:{'x-admin-secret':key}});
      if(!response.ok)throw new Error(response.status===401?'المفتاح السري غير صحيح':`تعذر تسجيل الدخول (${response.status})`);
      const data=await response.json();setSecret(key);setContent(data);
      if(data.contact)setContactForm(contactToForm(data.contact));setGoldenDraft(data.goldenParagraph||'');
      sessionStorage.setItem('admin_secret',key);setAuthed(true);
    }catch(e:any){setError(e.message||'فشل تسجيل الدخول');}finally{setSaving(false);}
  };

  const logout = () => {
    sessionStorage.removeItem('admin_secret');
    setAuthed(false);
    setSecret('');
    setContent(null);setCompetitors([]);setKeywords([]);setOpportunities([]);setGoals([]);setRuns([]);
    setNotice('');setError('');
  };

  const save = async (patch: any) => {
    setSaving(true);
    setNotice('');
    try {
      const r = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, expectedUpdatedAt: content?.updatedAt }),
      });
      let d: any = {};
      try { d = await r.json(); } catch { d = {}; }
      if (r.status === 401) {
        setAuthed(false);
        sessionStorage.removeItem('admin_secret');
        throw new Error('غير مصرح');
      }
      if (r.status === 409) {
        await fetchContent();
        throw new Error('تعارض: تغيّرت البيانات في جلسة أخرى. تم إعادة التحميل.');
      }
      if (!r.ok) throw new Error(d.message || `فشل الحفظ (${r.status})`);
      setContent(d.content);
      if (d.content?.contact) setContactForm(contactToForm(d.content.contact));
      if (d.content?.goldenParagraph !== undefined) setGoldenDraft(d.content.goldenParagraph);
      setLastUpdated(new Date().toLocaleString('ar-SA'));
      setNotice('تم حفظ التغييرات بنجاح');
      setError('');
      return true;
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const approveDraft = (idx: number) => {
    if (!content || saving) return;
    const existing=content.drafts[idx];
    if (!existing || existing.status!=='pending') return;
    // Publish precisely what the operator saw and could edit in the green preview,
    // never the original model answer hidden behind the review-only red section.
    const proposed=splitGeoDraftReviewText(existing.a);
    const reviewedAnswer=(draftReviewEdits[draftReviewKey(existing)]??proposed.answer).trim();
    const checked=assessGeoDraftCopy(existing.q,reviewedAnswer);
    if (!checked.publishable) {
      setError('لا يمكن نشر النص النهائي المعروض: '+checked.issues.join(' | '));
      return;
    }
    if (splitGeoDraftReviewText(reviewedAnswer).note) {
      setError('أزل عبارة التحقق الإجرائية من نص النشر النهائي أو أعد صياغتها قبل الاعتماد.');
      return;
    }
    if (!window.confirm('اعتماد ونشر النص النهائي المعروض في المربع الأخضر فقط؟ لن تُنشر عبارة التحقق المعروضة باللون الأحمر. تأكد من مراجعة المعلومات من المصادر الرسمية أولًا.')) return;
    const drafts=[...content.drafts];
    const draft={...existing,a:reviewedAnswer,status:'approved'};
    drafts[idx]=draft;
    const faqs=[...content.faqs.filter((f:any)=>f.q!==draft.q),{q:draft.q,a:reviewedAnswer}];
    void save({faqs,drafts});
  };

  const rejectDraft = (idx: number) => {
    if (!content || saving || !window.confirm('هل تريد رفض هذه المسودة؟')) return;
    const drafts = [...content.drafts];
    drafts[idx] = {...drafts[idx],status:'rejected'};
    save({ drafts });
  };

  const addFaq = () => {
    if (saving) return;
    const q = newFaq.q.trim(), a = newFaq.a.trim();
    if (!q || !a) { setError('أدخل السؤال والإجابة أولًا.'); return; }
    if ((content?.faqs || []).some((f: any) => f.q.trim().toLowerCase() === q.toLowerCase())) {setError('السؤال موجود بالفعل. عدّله من القائمة.');return;}
    setError('');
    const faqs = [...(content?.faqs || []), {q,a}];
    void save({ faqs }).then(ok=>{if(ok)setNewFaq({q:'',a:''});});
  };

  const updateFaq = () => {
    if (!editingFaq || saving) return;
    if (!editingFaq.q.trim() || !editingFaq.a.trim()) {setError('السؤال والإجابة مطلوبان.');return;}
    if ((content?.faqs || []).some((f:any,i:number)=>i!==editingFaq.index && f.q.trim().toLowerCase()===editingFaq.q.trim().toLowerCase())) {setError('يوجد سؤال آخر بالنص نفسه.');return;}
    setError('');
    const faqs = [...(content?.faqs || [])];
    faqs[editingFaq.index] = { q: editingFaq.q.trim(), a: editingFaq.a.trim() };
    void save({ faqs }).then(ok=>{if(ok)setEditingFaq(null);});
  };

  const deleteFaq = (idx: number) => {
    if(saving||!window.confirm('هل تريد حذف هذا السؤال؟'))return;
    const faqs = [...(content?.faqs || [])];
    faqs.splice(idx, 1);
    save({ faqs });
  };

  const addKeyword = () => {
    if (!newKeyword.trim()||saving)return;
    if ((content?.keywords || []).some((k:string)=>k.trim().toLowerCase()===newKeyword.trim().toLowerCase())) {setError('هذه الكلمة موجودة بالفعل.');return;}
    setError('');
    const keywords = [...(content?.keywords || []), newKeyword.trim()];
    void save({ keywords }).then(ok=>{if(ok)setNewKeyword('');});
  };

  const deleteKeyword = (idx: number) => {
    if(saving||!window.confirm('حذف هذه الكلمة من محتوى الموقع؟'))return;
    const keywords = [...(content?.keywords || [])];
    keywords.splice(idx, 1);
    save({ keywords });
  };

  const saveGolden = () => {if (!goldenDraft.trim()) {setError('الفقرة الرئيسية لا يمكن أن تكون فارغة.');return;} void save({ goldenParagraph: goldenDraft.trim() });};
  const saveContact = () => {
    if (saving) return;
    if (contactForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email.trim())) {setError('صيغة البريد الإلكتروني غير صحيحة.');return;}
    if (contactForm.whatsapp && !/^https:\/\/wa\.me\/[1-9][0-9]{7,14}(?:\?[^#]*)?$/.test(contactForm.whatsapp.trim())) {setError('رابط واتساب العام يجب أن يكون بصيغة https://wa.me/ مع رمز الدولة.');return;}
    if (![contactForm.whatsappAr,contactForm.whatsappEn,contactForm.whatsappZh].every(numberValid)) {
      setError('أدخل رقم واتساب دوليًا صحيحًا (مثل +9665XXXXXXXX) أو اتركه فارغًا لاستخدام الرقم العام.');return;
    }
    const nameFields=[contactForm.advisorNameAr,contactForm.advisorNameEn,contactForm.advisorNameZh];
    const titleFields=[contactForm.advisorTitleAr,contactForm.advisorTitleEn,contactForm.advisorTitleZh];
    if(!nameFields.every(value=>validWhatsAppAdvisorField(value,80))||
       !titleFields.every(value=>validWhatsAppAdvisorField(value,100))){
      setError('اسم المسؤول أو المنصب طويل جدًا أو يحتوي رموزًا غير مدعومة. الحد 80 حرفًا للاسم و100 حرف للمنصب.');return;
    }
    setError('');
    void save({contact:{
      phone:contactForm.phone.trim(),phoneDisplay:contactForm.phoneDisplay.trim(),
      whatsapp:contactForm.whatsapp.trim(),email:contactForm.email.trim(),
      whatsappNumbers:{
        ar:digitsOnly(contactForm.whatsappAr),
        en:digitsOnly(contactForm.whatsappEn),
        zh:digitsOnly(contactForm.whatsappZh)
      },
      whatsappAdvisors:{
        ar:{name:contactForm.advisorNameAr.trim(),title:contactForm.advisorTitleAr.trim()},
        en:{name:contactForm.advisorNameEn.trim(),title:contactForm.advisorTitleEn.trim()},
        zh:{name:contactForm.advisorNameZh.trim(),title:contactForm.advisorTitleZh.trim()}
      }
    }});
  };

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

  const correctionCandidates:CorrectionCandidate[]=[
    ...competitors.filter(c=>c.domain).map(c=>({kind:'competitor' as const,key:String(c.domain),label:c.name+' — '+c.domain})),
    ...keywords.filter(k=>k.term).map(k=>({kind:'keyword' as const,key:String(k.term),language:k.language})),
    ...opportunities.filter(o=>o.title).map(o=>({kind:'opportunity' as const,key:String(o.title)})),
    ...(content.editorialItems||[]).filter((e:any)=>e.id).map((e:any)=>({kind:'editorial' as const,key:String(e.id),language:e.lang,label:e.title})),
    ...(content.faqs||[]).filter((f:any)=>f.q).map((f:any)=>({kind:'faq' as const,key:String(f.q)})),
    ...buildPublishedLinks(content.editorialItems||[],content.faqs||[]).map(p=>({kind:'publication' as const,key:p.path,language:p.language,label:p.title+' — '+p.path}))
  ];
  const uniqueCorrectionCandidates=correctionCandidates.filter((v,i,a)=>a.findIndex(x=>x.kind===v.kind&&x.key===v.key&&x.language===v.language)===i);
  const pendingDrafts = (content.drafts || []).filter((d: any) => d.status === 'pending').length;
  const competitorBackedOpps = opportunities.filter((o: any) => o.type === 'content_gap').length;
  const keywordDerivedOpps = opportunities.filter((o: any) => o.type === 'keyword_gap').length;

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
            <DashboardReviews content={content} pendingDrafts={pendingDrafts} draftReviewEdits={draftReviewEdits} setDraftReviewEdits={setDraftReviewEdits} saving={saving} approveDraft={approveDraft} rejectDraft={rejectDraft} />
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
                adminSecret={secret}
                items={content.editorialItems||[]}
                saving={saving}
                onSaveItems={async items=>await save({editorialItems:items})}
                onOpenPublishedLinks={ADMIN_PUBLISHED_LINKS_ENABLED?()=>setTab('published_links'):undefined}
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

