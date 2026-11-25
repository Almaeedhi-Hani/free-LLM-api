'use client';
import {useState,useEffect} from 'react';
import type {CompetitorPageEvidenceBrief} from '@/lib/competitor-page-evidence';
import {NAV_HUBS,type Tab,type AdminHub} from '@/lib/admin/dashboard/navigation';
import {contactToForm,type ContactForm} from '@/lib/admin/dashboard/contact-form';

export function useDashboardState() {
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
  return {secret,setSecret,authed,setAuthed,content,setContent,error,setError,tab,setTab,openHub,setOpenHub,sidebarOpen,setSidebarOpen,newFaq,setNewFaq,editingFaq,setEditingFaq,draftReviewEdits,setDraftReviewEdits,newKeyword,setNewKeyword,newMarketKeyword,setNewMarketKeyword,competitorSearch,setCompetitorSearch,keywordSearch,setKeywordSearch,feedbackTarget,setFeedbackTarget,competitorFilter,setCompetitorFilter,goldenDraft,setGoldenDraft,contactForm,setContactForm,saving,setSaving,competitors,setCompetitors,keywords,setKeywords,opportunities,setOpportunities,goals,setGoals,runs,setRuns,editingCompetitor,setEditingCompetitor,newCompetitor,setNewCompetitor,lastUpdated,setLastUpdated,evidenceData,setEvidenceData,evidenceLoading,setEvidenceLoading,recordedBriefs,setRecordedBriefs,marketLoading,setMarketLoading,marketSources,setMarketSources,editingMarketKeyword,setEditingMarketKeyword,newGoal,setNewGoal,editingGoal,setEditingGoal,editingOpportunity,setEditingOpportunity,keywordLanguage,setKeywordLanguage,notice,setNotice,refreshingAll,setRefreshingAll,visibilityRefreshKey,setVisibilityRefreshKey,restoringSession,setRestoringSession};
}
export type DashboardState=ReturnType<typeof useDashboardState>;
