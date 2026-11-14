'use client';

import React, { useState, useEffect } from 'react';

type Tab =
  | 'home'
  | 'contact'
  | 'content'
  | 'agent'
  | 'reviews'
  | 'settings'
  | 'competitors'
  | 'keywords'
  | 'opportunities'
  | 'goals'
  | 'runs'
  | 'evidence';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'نظرة عامة', icon: '📊' },
  { key: 'competitors', label: 'المنافسون', icon: '🏢' },
  { key: 'keywords', label: 'الكلمات المفتاحية', icon: '🔑' },
  { key: 'opportunities', label: 'الفرص', icon: '🎯' },
  { key: 'goals', label: 'الأهداف', icon: '✅' },
  { key: 'agent', label: 'وكيل GEO', icon: '🤖' },
  { key: 'runs', label: 'سجل التحليلات', icon: '📜' },
  { key: 'evidence', label: 'الأدلة والقرارات', icon: '🔍' },
  { key: 'content', label: 'المحتوى', icon: '📝' },
  { key: 'reviews', label: 'المراجعات', icon: '🔍' },
  { key: 'contact', label: 'التواصل', icon: '📞' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ q: '', a: '' });
  const [editingFaq, setEditingFaq] = useState<{ index: number; q: string; a: string } | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [goldenDraft, setGoldenDraft] = useState('');
  const [contactForm, setContactForm] = useState({ phone: '', phoneDisplay: '', whatsapp: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', domain: '', languages: 'ar,en', source: 'manual' });
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [marketLoading,setMarketLoading]=useState(false);
  const [marketSources,setMarketSources]=useState<any[]>([]);
  const [keywordLanguage,setKeywordLanguage]=useState<'ar'|'en'|'zh'>('ar');
  const [notice,setNotice]=useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret');
    if (saved) {
      setSecret(saved);
      setAuthed(true);
    }
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
      if (d.contact) setContactForm(d.contact);
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
  const refreshMarket=async()=>{
    setMarketLoading(true);setError('');
    try{const [a,b,c,d,e]=await Promise.all(['competitors','keywords','opportunities','goals','runs'].map(v=>marketFetch('/api/admin/market/'+v)));
      setCompetitors(a.competitors||[]);setKeywords(b.keywords||[]);setOpportunities(c.opportunities||[]);setGoals(d.goals||[]);setRuns(e.runs||[]);
      setLastUpdated(new Date().toLocaleString('ar-SA'));
    }catch(e:any){setError(e.message||'فشل تحميل بيانات السوق');}finally{setMarketLoading(false);}
  };
  const refreshAll=async()=>{await Promise.all([fetchContent(),refreshMarket()]);};

  const fetchEvidence = async () => {
    setEvidenceLoading(true);
    try {
      const comps = await marketFetch('/api/admin/market/competitors');
      const kws = await marketFetch('/api/admin/market/keywords');
      const opps = await marketFetch('/api/admin/market/opportunities');
      const gls = await marketFetch('/api/admin/market/goals');
      setEvidenceData({ competitors: comps.competitors || [], keywords: kws.keywords || [], opportunities: opps.opportunities || [], goals: gls.goals || [] });
    } catch (e: any) { setError(e.message); }
    finally { setEvidenceLoading(false); }
  };

  useEffect(() => {
    if (!authed || !secret) return;
    if (tab === 'home') refreshMarket();
    else if (tab === 'agent') {fetchRuns();fetchMarketSources();}
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
      if(data.contact)setContactForm(data.contact);setGoldenDraft(data.goldenParagraph||'');
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
    try {
      const r = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
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
      if (d.content?.contact) setContactForm(d.content.contact);
      if (d.content?.goldenParagraph !== undefined) setGoldenDraft(d.content.goldenParagraph);
      setLastUpdated(new Date().toLocaleString('ar-SA'));
      setError('');
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const approveDraft = (idx: number) => {
    if (!content) return;
    const drafts = [...content.drafts];
    const draft = drafts[idx];
    draft.status = 'approved';
    const faqs = [...content.faqs, { q: draft.q, a: draft.a }];
    save({ faqs, drafts });
  };

  const rejectDraft = (idx: number) => {
    if (!content) return;
    const drafts = [...content.drafts];
    drafts[idx].status = 'rejected';
    save({ drafts });
  };

  const addFaq = () => {
    if (!newFaq.q || !newFaq.a) return;
    const faqs = [...(content?.faqs || []), newFaq];
    save({ faqs });
    setNewFaq({ q: '', a: '' });
  };

  const updateFaq = () => {
    if (!editingFaq) return;
    const faqs = [...(content?.faqs || [])];
    faqs[editingFaq.index] = { q: editingFaq.q, a: editingFaq.a };
    save({ faqs });
    setEditingFaq(null);
  };

  const deleteFaq = (idx: number) => {
    const faqs = [...(content?.faqs || [])];
    faqs.splice(idx, 1);
    save({ faqs });
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keywords = [...(content?.keywords || []), newKeyword.trim()];
    save({ keywords });
    setNewKeyword('');
  };

  const deleteKeyword = (idx: number) => {
    const keywords = [...(content?.keywords || [])];
    keywords.splice(idx, 1);
    save({ keywords });
  };

  const saveGolden = () => save({ goldenParagraph: goldenDraft });
  const saveContact = () => save({ contact: contactForm });

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-luxury p-8">
          <h1 className="text-2xl font-bold text-navy-900 mb-2">لوحة التحكم — الوصول مقيّد</h1>
          <p className="text-slate-600 mb-4 text-sm">أدخل المفتاح السري للمتابعة.</p>
          <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="المفتاح السري" className="w-full border border-slate-300 rounded-lg px-4 py-2 mb-4" />
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <button onClick={login} disabled={saving} className="btn-primary w-full">{saving?'جارٍ التحقق...':'فتح'}</button>
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
        <aside className={`fixed inset-y-0 right-0 z-40 w-64 bg-navy-950 text-white transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static`}>
          <div className="p-5 border-b border-navy-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gold-500 shadow-gold-glow" />
              <span className="font-bold text-lg">لوحة التحكم</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">GEO Intelligence</p>
          </div>
          <nav className="p-3 space-y-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${tab === t.key ? 'bg-gold-600 text-white' : 'text-slate-300 hover:bg-navy-800'}`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-navy-800">
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
                <span>آخر تحديث: {lastUpdated || '—'}</span>
                <button onClick={refreshAll} className="btn-secondary text-xs" disabled={marketLoading||saving}>{marketLoading?'جارٍ التحديث...':'تحديث الكل'}</button>
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 max-w-7xl mx-auto">
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
                    { label: 'سجلات التحليل', value: runs.length, color: 'text-slate-700' },
                    { label: 'أسئلة شائعة', value: content.faqs?.length || 0, color: 'text-slate-700' },
                  ].map((c, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-500">{c.label}</p>
                      <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-lg font-bold mb-2">الفقرة الذهبية</h2>
                  <p className="text-slate-700 text-sm line-clamp-4">{content.goldenParagraph}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-2">حالة الوكيل</h2>
                    <p className="text-sm">الحالة: <span className="font-bold text-emerald-700">{content.agent?.status || 'idle'}</span></p>
                    <p className="text-sm">آخر تشغيل: {content.agent?.lastRun || '—'}</p>
                    <p className="text-sm">النتيجة: {content.agent?.lastResult || '—'}</p>
                    <p className="text-xs text-slate-400 mt-2">الجدولة اليومية معطّلة (workflow_dispatch فقط).</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-2">ملخص الأدلة</h2>
                    <p className="text-sm">المنافسون: {competitors.length} (لا توجد بيانات competitor-backed opportunities بدون منافسين).</p>
                    <p className="text-sm">الكلمات: {keywords.length}. فرص مستنتجة من الكلمات: {keywordDerivedOpps}.</p>
                    <p className="text-sm">آخر خطأ: {runs.find((r) => r.status === 'failed')?.error || 'لا يوجد'}</p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'contact' && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4">معلومات التواصل</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="الهاتف" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="عرض الهاتف" value={contactForm.phoneDisplay} onChange={(e) => setContactForm({ ...contactForm, phoneDisplay: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="رابط WhatsApp" value={contactForm.whatsapp} onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })} />
                  <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="البريد الإلكتروني" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <button onClick={saveContact} className="btn-primary mt-4" disabled={saving}>حفظ التواصل</button>
              </section>
            )}

            {tab === 'content' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-2">الفقرة الذهبية</h2>
                  <textarea className="w-full border border-slate-300 rounded-lg px-4 py-2 min-h-[120px]" value={goldenDraft} onChange={(e) => setGoldenDraft(e.target.value)} />
                  <button onClick={saveGolden} className="btn-primary mt-3" disabled={saving}>حفظ</button>
                </section>
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-2">كلمات المحتوى</h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {content.keywords.map((k: string, i: number) => (
                      <span key={i} className="bg-gold-100 text-gold-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-2">
                        {k}
                        <button onClick={() => deleteKeyword(i)} className="text-gold-700 hover:text-red-600" aria-label="حذف">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className="border border-slate-300 rounded-lg px-4 py-2 flex-1" placeholder="كلمة جديدة" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
                    <button onClick={addKeyword} className="btn-primary" disabled={saving}>إضافة</button>
                  </div>
                </section>
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

            {tab === 'agent' && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4">وكيل GEO — حالة النظام</h2>
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
                <p className="text-xs text-slate-400 mt-4">الوكيل يعمل عبر GitHub Actions (يومياً 02:00 UTC) وRender cron. المحتوى عالي الخطورة → مسودات (بانتظار الموافقة).</p>
              </section>
            )}

            {tab === 'reviews' && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4">المسودات المعلقة (عالية الخطورة)</h2>
                {content.drafts.length === 0 && <p className="text-slate-500 text-sm">لا توجد مسودات معلقة.</p>}
                <ul className="space-y-4">
                  {content.drafts.map((d: any, i: number) => (
                    <li key={i} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <p className="font-semibold">{d.q}</p>
                      <p className="text-slate-700 text-sm mt-1">{d.a}</p>
                      <p className="text-xs text-slate-400 mt-1">الحالة: {d.status} — {d.createdAt}</p>
                      {d.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => approveDraft(i)} className="btn-primary text-xs" disabled={saving}>اعتماد ونشر</button>
                          <button onClick={() => rejectDraft(i)} className="btn-secondary text-xs" disabled={saving}>رفض</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {tab === 'settings' && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4">الإعدادات</h2>
                <p className="text-slate-600 text-sm mb-2">الفقرة الذهبية (للقراءة هنا؛ يحدّثها الوكيل):</p>
                <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{content.goldenParagraph}</p>
                <p className="text-xs text-slate-400 mt-4">آخر تحديث: {content.updatedAt}</p>
              </section>
            )}

            {tab === 'competitors' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-4">المنافسون</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="الاسم" value={newCompetitor.name} onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })} />
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="النطاق" value={newCompetitor.domain} onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })} />
                    <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="اللغات (ar,en,zh)" value={newCompetitor.languages} onChange={(e) => setNewCompetitor({ ...newCompetitor, languages: e.target.value })} />
                    <button className="btn-primary" disabled={saving} onClick={async () => {
                      setSaving(true);
                      try {
                        await marketFetch('/api/admin/market/competitors', { method: 'POST', body: JSON.stringify({ name: newCompetitor.name, domain: newCompetitor.domain, languages: newCompetitor.languages.split(',').map((s) => s.trim()).filter(Boolean), source: newCompetitor.source }) });
                        setNewCompetitor({ name: '', domain: '', languages: 'ar,en', source: 'manual' });
                        await fetchCompetitors();
                      } catch (e: any) { setError(e.message); }
                      finally { setSaving(false); }
                    }}>إضافة</button>
                  </div>
                  <div className="mb-4 flex items-center gap-3">
                    <button className="btn-primary" disabled={saving} onClick={async () => {
                      if (!confirm('تشغيل اكتشاف المنافسين (DuckDuckGo) مرة واحدة؟')) return;
                      setSaving(true); setError('');
                      try {
                        const d = await marketFetch('/api/admin/market/discovery', { method: 'POST', body: JSON.stringify({ max_competitors: 10 }) });
                        alert('Discovery: ' + (d.status || 'done') + ' — competitors: ' + (d.summary?.competitors_discovered ?? 0) + ', unique: ' + (d.summary?.unique_domains ?? 0) + ', errors: ' + (d.summary?.errors?.length ?? 0));
                        await fetchCompetitors();
                      } catch (e: any) { setError(e.message); }
                      finally { setSaving(false); }
                    }}>تشغيل اكتشاف المنافسين</button>
                    <span className="text-sm text-slate-500">DuckDuckGo HTML (بدون مفتاح API)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">الاسم</th><th>النطاق</th><th>الحالة</th><th>اللغات</th><th>آخر رصد</th></tr></thead>
                      <tbody>
                        {competitors.map((c: any) => (
                          <tr key={c.id} className="border-b">
                            <td className="py-2">{c.name}</td>
                            <td dir="ltr" className="text-left">{c.domain}</td>
                            <td>{c.status}</td>
                            <td>{(c.languages || []).join(', ')}</td>
                            <td className="text-xs text-slate-400">{c.last_seen_at || '—'}</td>
                          </tr>
                        ))}
                        {competitors.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400 text-center">لا يوجد منافسون بعد. (اكتشاف المنافسين يتطلب DuckDuckGo (بدون مفتاح))</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {tab === 'keywords' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-4">الكلمات المفتاحية</h2>
                  <p className="text-xs text-slate-400 mb-3">الأحجام تُخزّن فقط عند توفر مصدر موثوق. لا يتم اختلاق أي بيانات.</p>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <input className="border border-slate-300 rounded-lg px-4 py-2 flex-1" placeholder="المصطلح" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
                    <select className="border border-slate-300 rounded-lg px-4 py-2" defaultValue="ar" id="kw-lang">
                      <option value="ar">ar</option><option value="en">en</option><option value="zh">zh</option>
                    </select>
                    <button className="btn-primary" disabled={saving} onClick={async () => {
                      if (!newKeyword.trim()) return;
                      setSaving(true);
                      try {
                        const lang = (document.getElementById('kw-lang') as HTMLSelectElement)?.value || 'ar';
                        await marketFetch('/api/admin/market/keywords', { method: 'POST', body: JSON.stringify({ term: newKeyword.trim(), language: lang, source: 'manual' }) });
                        setNewKeyword('');
                        await fetchKeywords();
                      } catch (e: any) { setError(e.message); }
                      finally { setSaving(false); }
                    }}>إضافة</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">المصطلح</th><th>اللغة</th><th>النية</th><th>الحجم</th><th>المصدر</th></tr></thead>
                      <tbody>
                        {keywords.map((k: any) => (
                          <tr key={k.id} className="border-b">
                            <td className="py-2">{k.term}</td>
                            <td>{k.language}</td>
                            <td>{k.intent}</td>
                            <td>{k.search_volume ?? '—'}</td>
                            <td className="text-xs text-slate-400">{k.source} ({k.volume_confidence})</td>
                          </tr>
                        ))}
                        {keywords.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400 text-center">لا توجد كلمات بعد.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {tab === 'opportunities' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h2 className="text-xl font-bold">الفرص</h2>
                    <div className="flex gap-2">
                      <button className="btn-primary text-xs" disabled={saving} onClick={async () => {
                        setSaving(true);
                        try { await marketFetch('/api/admin/market/analyze', { method: 'POST', body: JSON.stringify({ triggered_by: 'admin' }) }); await fetchOpportunities(); await fetchGoals(); await fetchRuns(); }
                        catch (e: any) { setError(e.message); }
                        finally { setSaving(false); }
                      }}>تشغيل التحليل</button>
                      <button className="btn-secondary text-xs" disabled={saving} onClick={async () => {
                        setSaving(true);
                        try { await marketFetch('/api/admin/market/radar', { method: 'POST', body: JSON.stringify({ triggered_by: 'admin' }) }); await fetchOpportunities(); await fetchGoals(); await fetchKeywords(); await fetchCompetitors(); await fetchRuns(); }
                        catch (e: any) { setError(e.message); }
                        finally { setSaving(false); }
                      }}>تشغيل الرادار</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">العنوان</th><th>النوع</th><th>الأولوية</th><th>الدرجة</th><th>الحالة</th><th>إجراء</th></tr></thead>
                      <tbody>
                        {opportunities.map((o: any) => (
                          <tr key={o.id} className="border-b">
                            <td className="py-2">{o.title}</td>
                            <td>{o.type === 'content_gap' ? 'فجوة تنافسية (منافس)' : 'فجوة كلمات (مستنتجة)'}</td>
                            <td>{o.priority}</td>
                            <td>{o.score}</td>
                            <td>{o.status}</td>
                            <td>
                              <select className="border border-slate-300 rounded text-xs" value={o.status} onChange={async (e) => {
                                try { await marketFetch('/api/admin/market/opportunities', { method: 'PATCH', body: JSON.stringify({ id: o.id, status: e.target.value }) }); await fetchOpportunities(); }
                                catch (err: any) { setError(err.message); }
                              }}>
                                <option value="new">جديد</option><option value="triaged">فرز</option><option value="planned">مخطط</option><option value="done">منجز</option><option value="rejected">مرفوض</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {opportunities.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400 text-center">لا توجد فرص بعد. شغّل التحليل بعد إضافة منافسين/كلمات.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">ملاحظة: 27 فرصة حالية مستنتجة من الكلمات (keyword_gap). opportunitie типа content_gap (فجوة تنافسية) تتطلب منافسين (0 حالياً).</p>
                </section>
              </div>
            )}

            {tab === 'goals' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-4">أهداف الوكيل</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">العنوان</th><th>الأولوية</th><th>الحالة</th><th>الثقة</th><th>المؤشرات</th><th>إجراء</th></tr></thead>
                      <tbody>
                        {goals.map((g: any) => (
                          <tr key={g.id} className="border-b">
                            <td className="py-2">{g.title}<div className="text-xs text-slate-400">{g.description}</div></td>
                            <td>{g.priority}</td>
                            <td>{g.status}</td>
                            <td>{g.confidence}</td>
                            <td className="text-xs">{(g.success_metrics || []).map((m: any) => m.metric).join(', ')}</td>
                            <td>
                              <select className="border border-slate-300 rounded text-xs" value={g.status} onChange={async (e) => {
                                try { await marketFetch('/api/admin/market/goals', { method: 'PATCH', body: JSON.stringify({ id: g.id, status: e.target.value }) }); await fetchGoals(); }
                                catch (err: any) { setError(err.message); }
                              }}>
                                <option value="open">مفتوح</option><option value="in_progress">قيد التنفيذ</option><option value="done">منجز</option><option value="cancelled">ملغى</option>
                              </select>
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

            {tab === 'runs' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-4">سجل التحليلات</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-right border-b"><th className="py-2">النوع</th><th>الحالة</th><th>البداية</th><th>النهاية</th><th>المُشغّل</th></tr></thead>
                      <tbody>
                        {runs.map((r: any) => (
                          <tr key={r.id} className="border-b">
                            <td className="py-2">{r.run_type}</td>
                            <td>{r.status}</td>
                            <td className="text-xs text-slate-400">{r.started_at}</td>
                            <td className="text-xs text-slate-400">{r.finished_at || '—'}</td>
                            <td>{r.triggered_by}</td>
                          </tr>
                        ))}
                        {runs.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400 text-center">لا توجد سجلات بعد.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {tab === 'evidence' && (
              <div className="space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">الأدلة والقرارات</h2>
                    <button className="btn-secondary text-xs" disabled={evidenceLoading} onClick={fetchEvidence}>{evidenceLoading ? 'جاري التحميل...' : 'تحديث'}</button>
                  </div>
                  {!evidenceData && !evidenceLoading && <p className="text-slate-400 text-sm">اضغط تحديث لتحميل الأدلة.</p>}
                  {evidenceLoading && <p className="text-slate-400 text-sm">جاري التحميل...</p>}
                  {evidenceData && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">المنافسون</p><p className="text-xl font-bold">{evidenceData.competitors.length}</p></div>
                        <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">الكلمات</p><p className="text-xl font-bold">{evidenceData.keywords.length}</p></div>
                        <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">الفرص</p><p className="text-xl font-bold">{evidenceData.opportunities.length}</p></div>
                        <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">الأهداف</p><p className="text-xl font-bold">{evidenceData.goals.length}</p></div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                        <p className="font-semibold text-amber-800">ملاحظة: 0 منافسين = 0 ملاحظات (competitor observations).</p>
                        <p className="text-amber-700 mt-1">الفرص (27) مستنتجة من الكلمات (keyword_gap)، وليس من تحليل منافسين (content_gap). opportunitie типа content_gap تتطلب منافسين (DuckDuckGo (بدون مفتاح) غير مُفعل).</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="text-right border-b"><th className="py-2">النوع</th><th>العنوان</th><th>المصدر</th><th>الأدلة (evidence_ids)</th></tr></thead>
                          <tbody>
                            {evidenceData.opportunities.map((o: any) => (
                              <tr key={o.id} className="border-b">
                                <td className="py-2">{o.type === 'content_gap' ? 'فجوة تنافسية' : 'فجوة كلمات'}</td>
                                <td>{o.title}</td>
                                <td className="text-xs text-slate-400">{o.type === 'content_gap' ? 'competitor_observation' : 'keyword'}</td>
                                <td className="text-xs">{(o.evidence || []).map((e: any) => e.source || '').join(', ') || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

