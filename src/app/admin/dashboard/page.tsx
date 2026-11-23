'use client';

import EditorialReviewPanel from '@/components/EditorialReviewPanel';
import ContentImpactCenter from '@/components/ContentImpactCenter';
import EvidencePriorityReviewPanel from '@/components/EvidencePriorityReviewPanel';
import type { CompetitorPageEvidenceBrief } from '@/lib/competitor-page-evidence';
import PackageRequestsAdmin from '@/components/PackageRequestsAdmin';
import {DataRoleLegend,DataRolePanel,DataRoleTag} from '@/components/AdminDataRoles';
import { assessGeoDraftCopy, splitGeoDraftReviewText } from "@/lib/geo-draft-quality";
import React, { useState, useEffect } from 'react';
import VisibilityDashboard from '@/components/VisibilityDashboard';
import CookiePolicyAdmin from '@/components/CookiePolicyAdmin';
import SearchIntegrationsAdmin from '@/components/SearchIntegrationsAdmin';
import GeoEngineMonitor from '@/components/GeoEngineMonitor';
import UnifiedRunHistory from '@/components/UnifiedRunHistory';
import TechnicalTaskBoard from '@/components/TechnicalTaskBoard';
import GeoFeedbackMemory from '@/components/GeoFeedbackMemory';
import LegacyToolsArchive from '@/components/LegacyToolsArchive';
import PublishedLinksList from '@/components/PublishedLinksList';
import {ADMIN_LEGACY_ARCHIVE_ENABLED,ADMIN_PUBLISHED_LINKS_ENABLED} from '@/lib/admin-consolidation-flags';
import {validWhatsAppAdvisorField} from '@/lib/whatsapp-contacts';

type Tab =
  | 'home'
  | 'contact'
  | 'package_requests'
  | 'content'
  | 'agent'
  | 'reviews'
  | 'editorial'
  | 'impact'
  | 'published_links'
  | 'settings'
  | 'competitors'
  | 'keywords'
  | 'opportunities'
  | 'goals'
  | 'runs'
  | 'evidence'
  | 'visibility'
  | 'cookies'
  | 'integrations';

type ContactForm={phone:string;phoneDisplay:string;whatsapp:string;email:string;whatsappAr:string;whatsappEn:string;whatsappZh:string;
 advisorNameAr:string;advisorTitleAr:string;advisorNameEn:string;advisorTitleEn:string;advisorNameZh:string;advisorTitleZh:string};
const contactToForm=(raw?:{
 phone?:string;phoneDisplay?:string;whatsapp?:string;email?:string;
 whatsappNumbers?:{ar?:string;en?:string;zh?:string};
 whatsappAdvisors?:Partial<Record<'ar'|'en'|'zh',{name:string;title:string}>>
}):ContactForm=>({
 phone:raw?.phone||'',phoneDisplay:raw?.phoneDisplay||'',
 whatsapp:raw?.whatsapp||'',email:raw?.email||'',
 whatsappAr:raw?.whatsappNumbers?.ar||'',
 whatsappEn:raw?.whatsappNumbers?.en||'',
 whatsappZh:raw?.whatsappNumbers?.zh||'',
 advisorNameAr:raw?.whatsappAdvisors?.ar?.name||'',advisorTitleAr:raw?.whatsappAdvisors?.ar?.title||'',
 advisorNameEn:raw?.whatsappAdvisors?.en?.name||'',advisorTitleEn:raw?.whatsappAdvisors?.en?.title||'',
 advisorNameZh:raw?.whatsappAdvisors?.zh?.name||'',advisorTitleZh:raw?.whatsappAdvisors?.zh?.title||''
});
const numberValid=(raw:string)=>!raw.trim()||/^\+?[0-9()\s-]+$/.test(raw.trim())&&
 /^[1-9][0-9]{7,14}$/.test(raw.trim().replace(/[\s()+-]/g,''));
const digitsOnly=(raw:string)=>raw.trim().replace(/[\s()+-]/g,'');

const LABELS: Record<string, string> = {
  idle:'بانتظار التشغيل',running:'قيد التشغيل',success:'نجح',completed:'مكتمل',failed:'فشل',
  pending:'بانتظار المراجعة',approved:'معتمد',rejected:'مرفوض',active:'نشط',
  inactive:'غير نشط',disqualified:'مستبعد',new:'جديدة',triaged:'تم فرزها',
  planned:'مخطط لها',done:'منجزة',open:'مفتوح',in_progress:'قيد التنفيذ',
  cancelled:'ملغى',high:'عالية',medium:'متوسطة',low:'منخفضة',
  ar:'العربية',en:'الإنجليزية',zh:'الصينية',manual:'إدخال يدوي',unknown:'غير معروف',
  admin:'مدير النظام',cron:'تشغيل مجدول'
};
const readable = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'غير متوفر';
  const key = String(value);
  return LABELS[key] || key.replace(/_/g,' ');
};
const formatDate = (value: unknown) => {
  if (!value) return 'غير متوفر';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ar-SA');
};
// Each operator's edit belongs to one draft, not to the latest list position.
const draftReviewKey=(d:{q?:string;createdAt?:string})=>JSON.stringify([d.q||'',d.createdAt||'']);
// These are explanatory UI labels for suggestions, never claims of verified market facts.
const opportunityKind=(kind:string)=>({
  content_gap:'محتوى يحتاج تطويرًا',keyword_gap:'موضوعات بحث غير مغطاة',
  faq_gap:'أسئلة متكررة تحتاج إجابات',service_gap:'تغطية الخدمات',
  authority_gap:'تعزيز الثقة والمصداقية'
} as Record<string,string>)[kind]||'فرصة مقترحة';
const opportunityMeaning=(item:{title?:string;type?:string})=>{
 const title=String(item.title||'');
 if(title.includes('دلائل مخططة بدون صفحات منشورة'))
   return 'يقترح النظام مراجعة أدلة موجودة في خطة المحتوى ولم تتحول إلى صفحات منشورة؛ لا تعني هذه الملاحظة أن هناك دليلًا على صفحة منافسة.';
 if(item.type==='keyword_gap')return 'اقترح النظام موضوع بحث يستحق الدراسة لتحديد ما إذا كانت صفحات الموقع تغطيه.';
 if(item.type==='faq_gap')return 'يقترح النظام إضافة أو تحسين إجابة عن سؤال قد يهم المستثمر.';
 if(item.type==='service_gap')return 'يقترح النظام مراجعة شرح الخدمة وما إذا كان يغطي أسئلة الزائر.';
 if(item.type==='authority_gap')return 'يقترح النظام تحسين عناصر الثقة والإسناد بالمصادر الأصلية.';
 return 'يقترح النظام تطوير محتوى متعلق بهذا الموضوع. قوة المقترح تعتمد على الأدلة المسجلة أدناه.';
};
const opportunityConfidence=(v:string)=>({high:'عالية',medium:'متوسطة',low:'منخفضة'} as Record<string,string>)[v]||'غير محددة';
const opportunityPriority=(v:string)=>({critical:'حرجة',high:'عالية',medium:'متوسطة',low:'منخفضة'} as Record<string,string>)[v]||'غير محددة';
const observationType=(v:string)=>({competitor:'رصد صفحة منافسة',keyword:'اقتراح من بحث الكلمات',manual:'أضيف يدويًا'} as Record<string,string>)[v]||'لم يحدد نوع المصدر';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'الرئيسية', icon: '📊' },
  { key: 'competitors', label: 'المنافسون', icon: '🏢' },
  { key: 'keywords', label: 'كلمات البحث السوقية', icon: '🔑' },
  { key: 'opportunities', label: 'الفرص', icon: '🎯' },
  { key: 'goals', label: 'الأهداف', icon: '✅' },
  { key: 'agent', label: 'وكيل GEO', icon: '🤖' },

  { key: 'runs', label: 'سجل التشغيل', icon: '📜' },
  { key: 'evidence', label: 'الأدلة ومصادر النتائج', icon: '🔍' },
  { key: 'content', label: 'محتوى الموقع', icon: '📝' },
  { key: 'reviews', label: 'اعتماد المسودات', icon: '🔍' },
  { key: 'editorial', label: 'تطوير جميع صفحات الموقع', icon: '📚' },
  { key: 'impact', label: 'مركز المحتوى والأثر', icon: '📊' },
  { key: 'published_links', label: 'المحتوى المنشور: الروابط', icon: '🔗' },
  { key: 'contact', label: 'التواصل', icon: '📞' },
  { key: 'package_requests', label: 'طلبات الباقات', icon: '📥' },
  { key: 'visibility', label: 'SEO وظهور الذكاء الاصطناعي', icon: '📈' },
  { key: 'cookies', label: 'إدارة الكوكيز', icon: '🍪' },
  { key: 'integrations', label: 'SEO والتكاملات', icon: '🔗' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

type AdminHub='overview'|'market'|'strategy'|'contentHub'|'measurement'|'customers'|'operations';
/** Seven visible top-level destinations, preserving every existing editable
 * screen as a subordinate tab. No records or API endpoints are deleted. */
const NAV_HUBS:{key:AdminHub;label:string;icon:string;landing:Tab;tabs:Tab[]}[]=[
  {key:'overview',label:'الرئيسية',icon:'📊',landing:'home',tabs:['home']},
  {key:'market',label:'السوق والمنافسون',icon:'🏢',landing:'competitors',tabs:['competitors','keywords','evidence']},
  {key:'strategy',label:'الفرص وخطة العمل',icon:'🎯',landing:'opportunities',tabs:['opportunities','goals']},
  {key:'contentHub',label:'المحتوى والنشر',icon:'📝',landing:'impact',tabs:['impact','editorial','reviews','content','published_links']},
  {key:'measurement',label:'القياس والظهور',icon:'📈',landing:'visibility',tabs:['visibility']},
  {key:'customers',label:'طلبات العملاء',icon:'👥',landing:'package_requests',tabs:['package_requests']},
  {key:'operations',label:'التشغيل والإعدادات',icon:'⚙️',landing:'agent',tabs:['agent','runs','settings','contact','cookies','integrations']}
];

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

  const pendingDrafts = (content.drafts || []).filter((d: any) => d.status === 'pending').length;
  const competitorBackedOpps = opportunities.filter((o: any) => o.type === 'content_gap').length;
  const keywordDerivedOpps = opportunities.filter((o: any) => o.type === 'keyword_gap').length;

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="flex">
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
                <button type="button" aria-expanded={expanded} aria-controls={'admin-hub-'+hub.key}
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

        {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-6 h-16 gap-3">
              <div className="flex items-center gap-3">
                <button className="lg:hidden text-navy-900" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة">☰</button>
                <h1 className="text-lg sm:text-xl font-bold text-navy-900">{TABS.find((t) => t.key === tab)?.label}</h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {saving && <span className="text-gold-600">جاري الحفظ...</span>}
                <span>آخر مزامنة: {lastUpdated || 'غير متوفر'}</span>
                <button onClick={refreshAll} className="btn-secondary text-xs" disabled={marketLoading||refreshingAll||saving}>{refreshingAll||marketLoading?'جارٍ التحديث...':'تحديث البيانات'}</button>
              </div>
            </div>
          </header>

          <main className="min-w-0 p-4 sm:p-6 max-w-7xl mx-auto">
            <div className="mb-4"><DataRoleLegend /></div>
            {error && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 mb-4 text-sm">{error}</div>}
            {notice && <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 mb-4 text-sm flex justify-between gap-3"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="إغلاق التنبيه">✕</button></div>}

            {tab === 'home' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'المنافسون', value: competitors.length, color: 'text-navy-900' },
                    { label: 'الكلمات المفتاحية', value: keywords.length, color: 'text-navy-900' },
                    { label: 'الفرص (كلمات)', value: keywordDerivedOpps, color: 'text-emerald-700' },
                    { label: 'الفرص (منافسون)', value: competitorBackedOpps, color: 'text-emerald-700' },
                    { label: 'الأهداف', value: goals.length, color: 'text-gold-600' },
                    { label: 'المسودات المعلقة', value: pendingDrafts, color: 'text-amber-600' },
                    { label: 'سجلات التحليل القديم', value: runs.length, color: 'text-slate-700' },
                    { label: 'أسئلة شائعة', value: content.faqs?.length || 0, color: 'text-slate-700' },
                  ].map((c, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-500">{c.label}</p>
                      <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-wrap justify-between gap-2 items-center mb-2"><h2 className="text-lg font-bold">الفقرة التعريفية الرئيسية</h2><button className="text-sm text-blue-700 underline" onClick={()=>setTab('content')}>تعديل المحتوى</button></div>
                  <p className="text-slate-700 text-sm line-clamp-4">{content.goldenParagraph}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex justify-between gap-2 items-center mb-2"><h2 className="text-lg font-bold">حالة وكيل GEO</h2><button onClick={()=>setTab('agent')} className="text-sm text-blue-700 underline">عرض التفاصيل</button></div>
                    <p className="text-sm">الحالة: <span className="font-bold text-emerald-700">{readable(content.agent?.status || 'idle')}</span></p>
                    <p className="text-sm">آخر تشغيل: {content.agent?.lastRun || '—'}</p>
                    <p className="text-sm">النتيجة: {content.agent?.lastResult || '—'}</p>
                    <p className="text-xs text-slate-400 mt-2">تُدار الجدولة من GitHub Actions. حالة هذه البطاقة لا تؤكد التشغيل التلقائي.</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-2">ملخص بيانات السوق</h2>
                    <p className="text-sm">المنافسون: {competitors.length} (لا توجد بيانات competitor-backed opportunities بدون منافسين).</p>
                    <p className="text-sm">الكلمات: {keywords.length}. فرص مستنتجة من الكلمات: {keywordDerivedOpps}.</p>
                    <p className="text-sm">آخر خطأ مسجل: {runs.find((r) => r.status === 'failed')?.error || 'لا توجد أخطاء مسجلة'}</p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'package_requests' && <PackageRequestsAdmin secret={secret} />}
            {tab === 'contact' && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-2">بيانات التواصل للزوار</h2><p className="text-sm text-slate-500 mb-4">تُطبّق التغييرات على معلومات التواصل المعروضة في الموقع بعد الحفظ.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="الهاتف" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="رقم الهاتف المعروض للزوار" aria-label="الهاتف المعروض" value={contactForm.phoneDisplay} onChange={(e) => setContactForm({ ...contactForm, phoneDisplay: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="https://wa.me/9665XXXXXXXX" aria-label="رابط واتساب" value={contactForm.whatsapp} onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="name@example.com" aria-label="البريد الإلكتروني" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div className="mt-5 rounded-2xl border border-[#d7d5c4] bg-[#fafaf5] p-4 sm:p-5">
                  <h3 className="text-lg font-bold text-[#193e37]">المستشارون والمتحدثون باللغات</h3>
                  <p className="mt-1 text-sm leading-7 text-slate-600">أدخل اسم المسؤول، منصبه، ورقم واتساب الخاص به لكل لغة. ستظهر البيانات في بطاقة مستقلة بالقائمة العائمة. يمكن ترك الاسم أو المنصب فارغًا حتى إدخال البيانات الحقيقية. رقم اللغة الفارغ يستخدم الرقم العام.</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {([
                      {lang:'العربية',nameKey:'advisorNameAr',titleKey:'advisorTitleAr',numberKey:'whatsappAr',accent:'AR'},
                      {lang:'English',nameKey:'advisorNameEn',titleKey:'advisorTitleEn',numberKey:'whatsappEn',accent:'EN'},
                      {lang:'中文',nameKey:'advisorNameZh',titleKey:'advisorTitleZh',numberKey:'whatsappZh',accent:'ZH'}
                    ] as const).map(({lang,nameKey,titleKey,numberKey,accent})=>
                      <div key={accent} className="rounded-xl border border-[#d7dfd6] bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-lg bg-[#173f38] px-2 py-1 text-xs font-bold text-white">{accent}</span>
                          <strong className="text-sm text-[#173f38]">متحدث باللغة {lang}</strong>
                        </div>
                        <label className="block text-xs font-semibold text-[#426056]">
                          اسم المسؤول
                          <input type="text" maxLength={80} aria-label={'اسم المسؤول - '+lang}
                            placeholder="اسم المستشار" value={contactForm[nameKey]}
                            onChange={e=>setContactForm({...contactForm,[nameKey]:e.target.value})}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900" />
                        </label>
                        <label className="mt-3 block text-xs font-semibold text-[#426056]">
                          المنصب / المسمى الوظيفي
                          <input type="text" maxLength={100} aria-label={'منصب المسؤول - '+lang}
                            placeholder="مثال: مستشار خدمات المستثمرين" value={contactForm[titleKey]}
                            onChange={e=>setContactForm({...contactForm,[titleKey]:e.target.value})}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900" />
                        </label>
                        <label className="mt-3 block text-xs font-semibold text-[#426056]">
                          رقم واتساب الدولي
                          <input type="tel" dir="ltr" inputMode="tel" autoComplete="off"
                            aria-label={'رقم واتساب '+lang} placeholder="+9665XXXXXXXX"
                            value={contactForm[numberKey]}
                            onChange={e=>setContactForm({...contactForm,[numberKey]:e.target.value})}
                            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-left text-sm text-slate-900" />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={saveContact} className="btn-primary mt-4" disabled={saving}>حفظ التواصل</button>
                <p className="text-xs text-slate-500 mt-2">أدخل رابط WhatsApp كاملاً بصيغة https://wa.me/966... حتى يعمل زر التواصل في الموقع.</p>
              </section>
            )}

            {tab === 'content' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-2">الفقرة الذهبية</h2>
                  <textarea className="w-full border border-slate-300 rounded-lg px-4 py-2 min-h-[120px]" value={goldenDraft} onChange={(e) => setGoldenDraft(e.target.value)} />
                  <button onClick={saveGolden} className="btn-primary mt-3" disabled={saving}>حفظ</button>
                </section>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  أصبحت الكلمات البحثية المعتمدة في <button className="text-blue-700 underline" onClick={()=>setTab('keywords')}>السوق والمنافسون ← كلمات البحث السوقية</button>.
                  أُخفيت القائمة القديمة المنفصلة دون حذف بياناتها.
                </div>

                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-4">الأسئلة الشائعة</h2>
                  <ul className="space-y-3">
                    {content.faqs.map((f: any, i: number) => (
                      <li key={i} className="bg-slate-50 rounded-lg p-4">
                        {editingFaq?.index === i ? (
                          <div className="space-y-2">
                            <input className="w-full border border-slate-300 rounded-lg px-4 py-2" value={editingFaq.q} onChange={(e) => setEditingFaq({ ...editingFaq, q: e.target.value })} />
                            <textarea className="w-full border border-slate-300 rounded-lg px-4 py-2" value={editingFaq.a} onChange={(e) => setEditingFaq({ ...editingFaq, a: e.target.value })} />
                            <div className="flex gap-2">
                              <button onClick={updateFaq} className="btn-primary text-xs" disabled={saving}>حفظ</button>
                              <button onClick={() => setEditingFaq(null)} className="btn-secondary text-xs">إلغاء</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">{f.q}</p>
                            <p className="text-slate-600 text-sm mt-1">{f.a}</p>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => setEditingFaq({ index: i, q: f.q, a: f.a })} className="text-xs text-emerald-700 hover:underline">تعديل</button>
                              <button onClick={() => deleteFaq(i)} className="text-xs text-red-600 hover:underline">حذف</button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="السؤال" value={newFaq.q} onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })} />
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="الإجابة" value={newFaq.a} onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })} />
                  </div>
                  <button onClick={addFaq} className="btn-primary mt-3" disabled={saving}>إضافة سؤال</button>
                </section>
              </div>
            )}

            {tab === 'agent' && <GeoEngineMonitor secret={secret} runs={runs} competitors={competitors} keywords={keywords} opportunities={opportunities} goals={goals} sources={marketSources} loading={marketLoading} refresh={() => { void refreshMarket(); void fetchMarketSources(); }} />}
            {tab === 'agent' && <GeoFeedbackMemory adminSecret={secret} initial={feedbackTarget} />}

            {tab === 'agent' && (
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
            )}

            {tab === 'reviews' && (
              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-2 text-xl font-bold">مراجعة المسودات قبل النشر</h2>
                <p className="mb-4 text-sm text-slate-600">اعتماد المسودة ينشر السؤال والإجابة؛ ألوان الأقسام تفصل النص المولّد عن بيانات النظام وروابط المنافسين والتنبيهات.</p>
                {pendingDrafts===0&&<p className="text-sm text-slate-600">لا توجد مسودات معلقة.</p>}
                <ul className="space-y-5">
                  {content.drafts.map((d: any,i: number)=>{
                    const parts=splitGeoDraftReviewText(d.a);
                    const reviewKey=draftReviewKey(d);
                    const finalAnswer=d.status==='pending'?(draftReviewEdits[reviewKey]??parts.answer):d.a;
                    const finalAssessment=assessGeoDraftCopy(d.q,finalAnswer);
                    return <li key={i} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                      <DataRolePanel tone="content" title="السؤال والإجابة المقترحة للاستخدام" description="الجزء الأخضر هو المحتوى الذي أنشأه النموذج، وليس توثيقًا رسميًا.">
                        <h3 className="mb-3 text-base font-bold text-emerald-950 break-words">{d.q}</h3>
                        {d.status==='pending'?<div className="space-y-2">
                          <label htmlFor={`faq-publish-${i}`} className="block text-xs font-bold text-emerald-950">النص النهائي الذي سيُنشر — قابل للتعديل</label>
                          <textarea id={`faq-publish-${i}`} aria-label={`النص النهائي للنشر: ${d.q}`}
                            className="w-full rounded-lg border border-emerald-300 bg-white p-3 text-sm leading-7 text-slate-900"
                            rows={5} value={finalAnswer}
                            onChange={e=>setDraftReviewEdits(prev=>({...prev,[reviewKey]:e.target.value}))}/>
                          <p className="text-xs text-emerald-900">هذا هو النص الذي سيُحفظ في المسودة المعتمدة ويُنشر في الأسئلة الشائعة بعد موافقتك.</p>
                        </div>:<p className="whitespace-pre-line break-words text-sm text-slate-900">{d.a}</p>}
                      </DataRolePanel>
                      {d.status==='pending'&&parts.note&&<DataRolePanel tone="warning" title="عبارة تحقق وردت ضمن النص المولّد" description="هذه العبارة مستخرجة من نهاية الإجابة الأصلية للتوضيح. استُبعدت من معاينة النشر المقترحة، ولن تُنشر إلا إذا كتبتها بنفسك في النص النهائي.">
                        <p className="text-rose-900 font-semibold">{parts.note}</p>
                      </DataRolePanel>}
                      <DataRolePanel tone="system" title="بيانات المسودة من النظام" description="الحالة والتاريخ ومستوى المراجعة معلومات إدارية وليست جزءًا من الإجابة.">
                        <div className="flex flex-wrap items-center gap-2">
                          <DataRoleTag tone="system">الحالة: {readable(d.status)}</DataRoleTag>
                          <span className="text-xs text-slate-600">تاريخ الإنشاء: {formatDate(d.createdAt)}</span>
                        </div>
                      </DataRolePanel>
                      {!finalAssessment.publishable&&<DataRolePanel tone="warning" title="تنبيه جودة آلي — ليس جزءًا من الإجابة">
                        <p className="text-rose-900" role="alert">النص النهائي غير صالح للنشر بعد: راجع اللغة وطول الإجابة وجودتها، ثم صححه في مربع النص الأخضر. يمكن رفض المسودة عند الحاجة.</p>
                      </DataRolePanel>}
                      {d.risk_level==='high'&&<DataRolePanel tone="warning" title="تحذير من النظام — محتوى عالي المخاطر">
                        <p className="text-rose-900">لا تعتمد دون مراجعة مختص والتحقق من المصدر الرسمي. هذا التنبيه ليس جزءًا من الإجابة.</p>
                      </DataRolePanel>}
                      <DataRolePanel tone="research" title="مصادر الرصد المستخدمة — صفحات منافسة ونتائج بحث مرتبطة بالموضوع" description="روابط اكتشفها البحث لمقارنة التغطية والموضوعات؛ لا تثبت صحة الإجابة ولا تعني أن النموذج نقل النص من هذه المواقع.">
                        {Array.isArray(d.evidence_refs)&&d.evidence_refs.length>0?<ul className="space-y-2">{d.evidence_refs.map((ref:any,j:number)=><li key={String(ref.id)+'-'+j} className="rounded-lg border border-blue-100 bg-white/80 p-2 break-words text-xs">
                          {ref.url?.startsWith('https://')?<a href={ref.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-800 underline underline-offset-2">{ref.label}</a>:<span>{ref.label}</span>}
                          <p className="mt-1 text-blue-700">نوع الرصد: {ref.kind||'غير معروف'} · مزوّد البحث: {ref.source||'غير معروف'}</p>
                        </li>)}</ul>:<p className="text-xs text-blue-900">لا توجد روابط رصد مسجلة لهذه المسودة.</p>}
                      </DataRolePanel>
                      <DataRolePanel tone="verification" title="المصادر الرسمية والتحقق قبل النشر" description="مصادر المنافسين ليست مصدرًا رسميًا. تحقّق من صحة المعلومات من الجهات المختصة قبل الاعتماد.">
                        <p className="text-xs text-amber-950">ستُنشر فقط الإجابة النهائية الظاهرة في مربع التحرير الأخضر بعد اعتمادك. أما عبارة التحقق الحمراء فلا تدخل ضمن الإجابة النهائية المقترحة.</p>
                      </DataRolePanel>
                      {d.status==='pending'&&<div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                        <button onClick={()=>approveDraft(i)} className="btn-primary text-xs" disabled={saving || !finalAssessment.publishable || Boolean(splitGeoDraftReviewText(finalAnswer).note)}>اعتماد ونشر</button>
                        <button onClick={()=>rejectDraft(i)} className="btn-secondary text-xs" disabled={saving}>رفض</button>
                      </div>}
                    </li>
                  })}
                </ul>
              </section>
            )}

            {tab === 'published_links' && ADMIN_PUBLISHED_LINKS_ENABLED && <PublishedLinksList editorialItems={content.editorialItems||[]} faqs={content.faqs||[]} drafts={content.drafts||[]} adminSecret={secret} />}

            {tab === 'impact' && <GeoFeedbackMemory adminSecret={secret} initial={feedbackTarget} />}
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
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-2">إعدادات وإدارة النظام</h2><p className="text-sm text-slate-500 mb-4">إعدادات عامة وروابط الإدارة. تُحفظ الأسرار في Render ولا تُعرض هنا.</p>
                <p className="text-slate-600 text-sm mb-2">الفقرة الذهبية (للقراءة هنا؛ يحدّثها الوكيل):</p>
                <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{content.goldenParagraph}</p>
                <p className="text-xs text-slate-500 mt-4">آخر تحديث: {content.updatedAt ? new Date(content.updatedAt).toLocaleString('ar-SA') : '—'}</p>
                {!ADMIN_LEGACY_ARCHIVE_ENABLED && <div className="mt-6 border-t border-slate-200 pt-4"><h3 className="font-bold mb-3">إدارة النظام</h3><p className="text-sm text-slate-600 mb-3">تُحدّث إعدادات مفاتيح API من Render، وتُدار جدولة الوكيل من GitHub Actions. لا تُعرض القيم السرية في اللوحة.</p><div className="flex flex-wrap gap-2"><button className="btn-secondary text-xs" onClick={()=>setTab('agent')}>مصادر البحث والوكيل</button><button className="btn-secondary text-xs" onClick={()=>setTab('contact')}>معلومات التواصل</button><button className="btn-secondary text-xs" onClick={()=>setTab('reviews')}>مسودات الموافقة</button><button className="btn-secondary text-xs" disabled={marketLoading||refreshingAll||saving} onClick={refreshAll}>تحديث جميع البيانات</button></div></div>}
              </section>
            )}

            {tab === 'settings' && ADMIN_LEGACY_ARCHIVE_ENABLED && <LegacyToolsArchive onNavigate={setTab} />}

            {tab === 'competitors' && (
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
            )}

            {tab === 'keywords' && (
              <div className="space-y-6">
                <GeoFeedbackMemory adminSecret={secret} initial={feedbackTarget} />
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
            )}

            {tab === 'opportunities' && (
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
            )}

            {tab === 'goals' && (
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
            )}

            {tab === 'visibility' && <VisibilityDashboard key={visibilityRefreshKey} secret={secret} onOpenImpact={()=>setTab('impact')} />}
            {tab === 'cookies' && <CookiePolicyAdmin policy={content?.cookiePolicy} saving={saving} onSave={async cookiePolicy => save({cookiePolicy})} />}
            {tab === 'integrations' && <SearchIntegrationsAdmin settings={content?.searchIntegrations} saving={saving} onSave={async searchIntegrations => save({searchIntegrations})} />}

            {tab === 'runs' && <UnifiedRunHistory secret={secret} legacyRuns={runs} />}

            {tab === 'evidence' && (
              <div className="min-w-0 space-y-6">
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-navy-900">الأدلة ومصادر فرص السوق</h2>
                      <p className="mt-1 text-xs text-slate-600">تفاصيل الرصد وتصنيفات النظام؛ لا تمثل بيانات المنافسين مراجع رسمية للتحقق من المحتوى.</p>
                    </div>
                    <button className="btn-secondary text-xs" disabled={evidenceLoading} onClick={fetchEvidence}>{evidenceLoading?'جاري التحميل...':'تحديث'}</button>
                  </div>
                  {!evidenceData&&!evidenceLoading&&<p className="text-sm text-slate-500">اضغط تحديث لتحميل الأدلة.</p>}
                  {evidenceLoading&&<p className="text-sm text-slate-500">جاري التحميل...</p>}
                  <EvidencePriorityReviewPanel recordedBriefs={recordedBriefs} />
                  {evidenceData&&<div className="min-w-0 space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-semibold text-blue-900">منافسون مرصودون</p><p className="text-xl font-bold text-blue-950">{evidenceData.competitors.length}</p></div>
                      <div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-900">كلمات بحث</p><p className="text-xl font-bold text-violet-950">{evidenceData.keywords.length}</p></div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">فرص مقترحة</p><p className="text-xl font-bold text-emerald-950">{evidenceData.opportunities.length}</p></div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-900">أهداف النظام</p><p className="text-xl font-bold text-slate-950">{evidenceData.goals.length}</p></div>
                    </div>
                    <DataRolePanel tone="verification" title="تنبيه التحقق من أدلة السوق" description="العناوين الظاهرة أدناه فرص بحث أو تحليل، وليست معلومات حكومية موثّقة ولا نتائج تصنيف مؤكدة.">
                      <p className="text-xs text-amber-950">الفرص: {evidenceData.opportunities.length}، الكلمات: {evidenceData.keywords.length}، المنافسون: {evidenceData.competitors.length}. يجب مراجعة المصادر قبل استخدام هذه البيانات في أي محتوى منشور.</p>
                    </DataRolePanel>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2"><DataRoleTag tone="research">الرصد من مصادر خارجية</DataRoleTag><DataRoleTag tone="system">تصنيف وبيانات النظام</DataRoleTag></div>
                      <p className="mt-2 text-xs font-medium text-blue-950">اسحب الجدول يمينًا ويسارًا لرؤية جميع الأعمدة، ومرره لأعلى وأسفل لقراءة الصفوف. مساحة العناوين واسعة حتى لا تنضغط الكلمات على الجوال.</p>
                    </div>
                    <div role="region" aria-label="جدول أدلة السوق قابل للتمرير أفقيًا وعموديًا" tabIndex={0} className="max-h-[72vh] w-full min-w-0 overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <table className="w-[1120px] min-w-[1120px] table-fixed border-collapse text-sm">
                        <colgroup><col style={{width:'175px'}}/><col style={{width:'430px'}}/><col style={{width:'215px'}}/><col style={{width:'300px'}}/></colgroup>
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-900 shadow-sm">
                          <tr className="border-b border-slate-300 text-right">
                            <th scope="col" className="px-4 py-3 font-bold">نوع الفرصة وتقييمها</th>
                            <th scope="col" className="px-4 py-3 font-bold">ما المقصود بهذه الفرصة؟</th>
                            <th scope="col" className="px-4 py-3 font-bold">من أين جاءت الفكرة؟</th>
                            <th scope="col" className="px-4 py-3 font-bold">روابط ومعلومات البحث المسجلة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evidenceData.opportunities.map((o:any)=>(
                            <tr key={o.id} className="align-top odd:bg-white even:bg-slate-50/80 border-b border-slate-200">
                              <td className="px-4 py-4 whitespace-normal break-words">
                                <DataRoleTag tone="technical">{opportunityKind(o.type)}</DataRoleTag>
                                <p className="mt-3 text-xs text-slate-700">الأولوية المقترحة: <strong>{opportunityPriority(o.priority)}</strong></p>
                                <p className="mt-1 text-xs text-slate-700">درجة الثقة: <strong className={o.confidence==='low'?'text-amber-800':'text-slate-800'}>{opportunityConfidence(o.confidence)}</strong></p>
                              </td>
                              <td className="px-4 py-4 whitespace-normal break-words leading-7 text-slate-900">
                                <span className="block font-semibold">{String(o.title||'').includes('دلائل مخططة بدون صفحات منشورة')?'أدلة مخططة لم تُنشر بعد':o.title}</span>
                                <span className="mt-2 block text-sm text-slate-700">{opportunityMeaning(o)}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-normal break-words">
                                {Array.isArray(o.evidence)&&o.evidence.length>0?
                                  <p className="text-sm text-blue-900">بيانات رصد مسجلة. نوعها مذكور لكل نتيجة في العمود التالي.</p>:
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                                    تحليل مقترح من النظام، دون روابط بحث مرتبطة بهذه الفرصة. لا يُنسب إلى منافس محدد.
                                  </div>}
                              </td>
                              <td className="px-4 py-4 whitespace-normal break-words text-xs">
                                {Array.isArray(o.evidence)&&o.evidence.length>0?<ul className="space-y-2">
                                  {o.evidence.map((e:any,j:number)=><li key={j} className="rounded-lg border border-blue-100 bg-blue-50 p-2 leading-6">
                                    <DataRoleTag tone="research">{observationType(e.origin)}</DataRoleTag>
                                    {e.source&&<span className="mt-1 block text-blue-900">سجل البحث: {e.source}</span>}
                                    {typeof e.url==='string'&&e.url.startsWith('https://')&&<a className="mt-1 block break-all text-blue-800 underline" href={e.url} target="_blank" rel="noopener noreferrer">{e.url}</a>}
                                    {e.quote&&<span className="mt-1 block text-blue-950">{e.quote}</span>}
                                    {!e.url&&!e.quote&&<span className="mt-1 block text-slate-600">لا يوجد رابط أو مقتطف محفوظ لهذا الرصد.</span>}
                                  </li>)}
                                </ul>:<span className="text-amber-800">لم تُسجّل مصادر بحث لهذه الفرصة. هي فكرة تحتاج إلى أدلة قبل اعتمادها.</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {evidenceData.opportunities.length===0&&<p className="text-sm text-slate-500">لا توجد فرص محفوظة لعرضها في الجدول.</p>}
                  </div>}
                </section>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}

