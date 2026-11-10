'use client';

import React, { useState, useEffect } from 'react';

type Tab = 'home' | 'contact' | 'content' | 'agent' | 'reviews' | 'settings' | 'competitors' | 'keywords' | 'opportunities' | 'goals' | 'runs';

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('home');
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
        throw new Error('Unauthorized');
      }
      if (!r.ok) throw new Error(d.message || `Load failed (${r.status})`);
      setContent(d);
      if (d.contact) setContactForm(d.contact);
      setGoldenDraft(d.goldenParagraph || '');
      setError('');
    } catch (e: any) {
      setError(e.message || 'Load failed');
    }
  };

  useEffect(() => {
    fetchContent();
  }, [authed, secret]);

  const marketFetch = async (path: string, init?: RequestInit) => {
    const r = await fetch(path, { ...init, headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json', ...(init?.headers || {}) } });
    let d: any = {};
    try { d = await r.json(); } catch { d = {}; }
    if (r.status === 401) { setAuthed(false); sessionStorage.removeItem('admin_secret'); throw new Error('Unauthorized'); }
    if (!r.ok) throw new Error(d.message || `Request failed (${r.status})`);
    return d;
  };

  const fetchCompetitors = async () => { try { const d = await marketFetch('/api/admin/market/competitors'); setCompetitors(d.competitors || []); } catch (e: any) { setError(e.message); } };
  const fetchKeywords = async () => { try { const d = await marketFetch('/api/admin/market/keywords'); setKeywords(d.keywords || []); } catch (e: any) { setError(e.message); } };
  const fetchOpportunities = async () => { try { const d = await marketFetch('/api/admin/market/opportunities'); setOpportunities(d.opportunities || []); } catch (e: any) { setError(e.message); } };
  const fetchGoals = async () => { try { const d = await marketFetch('/api/admin/market/goals'); setGoals(d.goals || []); } catch (e: any) { setError(e.message); } };
  const fetchRuns = async () => { try { const d = await marketFetch('/api/admin/market/runs'); setRuns(d.runs || []); } catch (e: any) { setError(e.message); } };

  useEffect(() => {
    if (!authed || !secret) return;
    if (tab === 'competitors') fetchCompetitors();
    else if (tab === 'keywords') fetchKeywords();
    else if (tab === 'opportunities') fetchOpportunities();
    else if (tab === 'goals') fetchGoals();
    else if (tab === 'runs') fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authed, secret]);

  const login = () => {
    if (!secret.trim()) { setError('Secret required'); return; }
    sessionStorage.setItem('admin_secret', secret.trim());
    setAuthed(true);
    setError('');
  };

  const logout = () => {
    sessionStorage.removeItem('admin_secret');
    setAuthed(false);
    setSecret('');
    setContent(null);
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
        throw new Error('Unauthorized');
      }
      if (r.status === 409) {
        await fetchContent();
        throw new Error('Conflict: data changed in another session. Reloaded; please retry.');
      }
      if (!r.ok) throw new Error(d.message || `Save failed (${r.status})`);
      setContent(d.content);
      if (d.content?.contact) setContactForm(d.content.contact);
      if (d.content?.goldenParagraph !== undefined) setGoldenDraft(d.content.goldenParagraph);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Save failed');
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

  const saveGolden = () => {
    save({ goldenParagraph: goldenDraft });
  };

  const saveContact = () => save({ contact: contactForm });

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-luxury">
        <h1 className="text-2xl font-bold text-navy-900 mb-4">Admin Dashboard â€” Access Denied</h1>
        <p className="text-slate-600 mb-4 text-sm">Enter admin secret to continue. Access is denied if no secret is configured.</p>
        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Admin secret" className="w-full border border-slate-300 rounded-lg px-4 py-2 mb-4" />
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button onClick={login} className="btn-primary w-full">Unlock</button>
      </div>
    );
  }

  if (!content) {
    return <div className="max-w-4xl mx-auto mt-20 p-8 text-center">Loading...</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'home', label: 'Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©' },
    { key: 'contact', label: 'Ø§Ù„ØªÙˆØ§ØµÙ„' },
    { key: 'content', label: 'Ø§Ù„Ù…Ø­ØªÙˆÙ‰' },
    { key: 'agent', label: 'ÙˆÙƒÙŠÙ„ GEO' },
    { key: 'reviews', label: 'Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø§Øª' },
    { key: 'settings', label: 'Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª' },
    { key: 'competitors', label: 'Competitors' },
    { key: 'keywords', label: 'Keywords' },
    { key: 'opportunities', label: 'Opportunities' },
    { key: 'goals', label: 'Goals' },
    { key: 'runs', label: 'Analysis Runs' },
  ];

  return (
    <div className="max-w-6xl mx-auto mt-10 p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy-900">Admin Dashboard</h1>
        <button onClick={logout} className="btn-secondary">Logout</button>
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === t.key ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {saving && <p className="text-gold-600 text-sm mb-4">Saving...</p>}

      {/* Home / Overview */}
      {tab === 'home' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-2">Golden Paragraph</h2>
            <p className="text-slate-700 text-sm line-clamp-4">{content.goldenParagraph}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-2">FAQs</h2>
            <p className="text-3xl font-extrabold text-emerald-700">{content.faqs.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-2">Drafts</h2>
            <p className="text-3xl font-extrabold text-gold-600">{content.drafts.length}</p>
            <p className="text-xs text-slate-400 mt-1">Updated: {content.updatedAt}</p>
          </div>
        </div>
      )}

      {/* Contact */}
      {tab === 'contact' && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙˆØ§ØµÙ„</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
            <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Phone Display" value={contactForm.phoneDisplay} onChange={(e) => setContactForm({ ...contactForm, phoneDisplay: e.target.value })} />
            <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="WhatsApp URL" value={contactForm.whatsapp} onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })} />
            <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          </div>
          <button onClick={saveContact} className="btn-primary mt-4" disabled={saving}>Save Contact</button>
        </section>
      )}

      {/* Content */}
      {tab === 'content' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-2">Golden Paragraph</h2>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-4 py-2 min-h-[120px]"
              value={goldenDraft}
              onChange={(e) => setGoldenDraft(e.target.value)}
            />
            <button onClick={saveGolden} className="btn-primary mt-3" disabled={saving}>Save Golden Paragraph</button>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-2">Keywords</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {content.keywords.map((k: string, i: number) => (
                <span key={i} className="bg-gold-100 text-gold-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-2">
                  {k}
                  <button onClick={() => deleteKeyword(i)} className="text-gold-700 hover:text-red-600" aria-label="delete keyword">Ã—</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="border border-slate-300 rounded-lg px-4 py-2 flex-1" placeholder="New keyword" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
              <button onClick={addKeyword} className="btn-primary" disabled={saving}>Add</button>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">FAQs</h2>
            <ul className="space-y-3">
              {content.faqs.map((f: any, i: number) => (
                <li key={i} className="bg-slate-50 rounded-lg p-4">
                  {editingFaq?.index === i ? (
                    <div className="space-y-2">
                      <input className="w-full border border-slate-300 rounded-lg px-4 py-2" value={editingFaq.q} onChange={(e) => setEditingFaq({ ...editingFaq, q: e.target.value })} />
                      <textarea className="w-full border border-slate-300 rounded-lg px-4 py-2" value={editingFaq.a} onChange={(e) => setEditingFaq({ ...editingFaq, a: e.target.value })} />
                      <div className="flex gap-2">
                        <button onClick={updateFaq} className="btn-primary text-xs" disabled={saving}>Save</button>
                        <button onClick={() => setEditingFaq(null)} className="btn-secondary text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold">{f.q}</p>
                      <p className="text-slate-600 text-sm mt-1">{f.a}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setEditingFaq({ index: i, q: f.q, a: f.a })} className="text-xs text-emerald-700 hover:underline">Edit</button>
                        <button onClick={() => deleteFaq(i)} className="text-xs text-red-600 hover:underline">Delete</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Question" value={newFaq.q} onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })} />
              <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Answer" value={newFaq.a} onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })} />
            </div>
            <button onClick={addFaq} className="btn-primary mt-3" disabled={saving}>Add FAQ</button>
          </section>
        </div>
      )}

      {/* Agent */}
      {tab === 'agent' && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">ÙˆÙƒÙŠÙ„ GEO â€” Ø§Ù„Ø­Ø§Ù„Ø©</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-bold text-emerald-700">{content.agent?.status || 'idle'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">Last Run</p>
              <p className="font-bold text-slate-700 text-sm">{content.agent?.lastRun || 'â€”'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">Last Result</p>
              <p className="text-slate-700 text-sm">{content.agent?.lastResult || 'â€”'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Agent runs via GitHub Actions (daily 02:00 UTC) and Render cron. High-risk content â†’ drafts (pending approval).</p>
        </section>
      )}

      {/* Reviews / Drafts */}
      {tab === 'reviews' && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Pending Drafts (High-Risk)</h2>
          {content.drafts.length === 0 && <p className="text-slate-500 text-sm">No pending drafts.</p>}
          <ul className="space-y-4">
            {content.drafts.map((d: any, i: number) => (
              <li key={i} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="font-semibold">{d.q}</p>
                <p className="text-slate-700 text-sm mt-1">{d.a}</p>
                <p className="text-xs text-slate-400 mt-1">Status: {d.status} Â· {d.createdAt}</p>
                {d.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => approveDraft(i)} className="btn-primary text-xs" disabled={saving}>Approve & Publish</button>
                    <button onClick={() => rejectDraft(i)} className="btn-secondary text-xs" disabled={saving}>Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª</h2>
          <p className="text-slate-600 text-sm mb-2">Golden Paragraph (read-only here; updated by agent):</p>
          <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{content.goldenParagraph}</p>
          <p className="text-xs text-slate-400 mt-4">Updated: {content.updatedAt}</p>
        </section>
      )}
      {/* Competitors */}
      {tab === 'competitors' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Competitors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Name" value={newCompetitor.name} onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })} />
              <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Domain" value={newCompetitor.domain} onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })} />
              <input className="border border-slate-300 rounded-lg px-4 py-2" placeholder="Languages (ar,en,zh)" value={newCompetitor.languages} onChange={(e) => setNewCompetitor({ ...newCompetitor, languages: e.target.value })} />
              <button className="btn-primary" disabled={saving} onClick={async () => {
                setSaving(true);
                try {
                  await marketFetch('/api/admin/market/competitors', { method: 'POST', body: JSON.stringify({ name: newCompetitor.name, domain: newCompetitor.domain, languages: newCompetitor.languages.split(',').map((s) => s.trim()).filter(Boolean), source: newCompetitor.source }) });
                  setNewCompetitor({ name: '', domain: '', languages: 'ar,en', source: 'manual' });
                  await fetchCompetitors();
                } catch (e: any) { setError(e.message); }
                finally { setSaving(false); }
              }}>Add</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Name</th><th>Domain</th><th>Status</th><th>Languages</th><th>Seen</th></tr></thead>
              <tbody>
                {competitors.map((c: any) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-2">{c.name}</td>
                    <td>{c.domain}</td>
                    <td>{c.status}</td>
                    <td>{(c.languages || []).join(', ')}</td>
                    <td className="text-xs text-slate-400">{c.last_seen_at}</td>
                  </tr>
                ))}
                {competitors.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400 text-center">No competitors yet.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Keywords */}
      {tab === 'keywords' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Keywords</h2>
            <p className="text-xs text-slate-400 mb-3">Volumes are only stored when a named source is provided. Never fabricated.</p>
            <div className="flex gap-2 mb-4">
              <input className="border border-slate-300 rounded-lg px-4 py-2 flex-1" placeholder="Term" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
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
              }}>Add</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Term</th><th>Lang</th><th>Intent</th><th>Volume</th><th>Source</th></tr></thead>
              <tbody>
                {keywords.map((k: any) => (
                  <tr key={k.id} className="border-b">
                    <td className="py-2">{k.term}</td>
                    <td>{k.language}</td>
                    <td>{k.intent}</td>
                    <td>{k.search_volume ?? 'â€”'}</td>
                    <td className="text-xs text-slate-400">{k.source} ({k.volume_confidence})</td>
                  </tr>
                ))}
                {keywords.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400 text-center">No keywords yet.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Opportunities */}
      {tab === 'opportunities' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Opportunities</h2>
              <button className="btn-primary text-xs" disabled={saving} onClick={async () => {
                setSaving(true);
                try { await marketFetch('/api/admin/market/analyze', { method: 'POST', body: JSON.stringify({ triggered_by: 'admin' }) }); await fetchOpportunities(); await fetchGoals(); await fetchRuns(); }
                catch (e: any) { setError(e.message); }
                finally { setSaving(false); }
              }}>Run Analysis</button>
              <button className="btn-secondary text-xs ml-2" disabled={saving} onClick={async () => {
                setSaving(true);
                try { await marketFetch('/api/admin/market/radar', { method: 'POST', body: JSON.stringify({ triggered_by: 'admin' }) }); await fetchOpportunities(); await fetchGoals(); await fetchKeywords(); await fetchCompetitors(); await fetchRuns(); }
                catch (e: any) { setError(e.message); }
                finally { setSaving(false); }
              }}>Run Radar (collect new data)</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Title</th><th>Type</th><th>Priority</th><th>Score</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {opportunities.map((o: any) => (
                  <tr key={o.id} className="border-b">
                    <td className="py-2">{o.title}</td>
                    <td>{o.type}</td>
                    <td>{o.priority}</td>
                    <td>{o.score}</td>
                    <td>{o.status}</td>
                    <td>
                      <select className="border border-slate-300 rounded text-xs" value={o.status} onChange={async (e) => {
                        try { await marketFetch('/api/admin/market/opportunities', { method: 'PATCH', body: JSON.stringify({ id: o.id, status: e.target.value }) }); await fetchOpportunities(); }
                        catch (err: any) { setError(err.message); }
                      }}>
                        <option value="new">new</option><option value="triaged">triaged</option><option value="planned">planned</option><option value="done">done</option><option value="rejected">rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {opportunities.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400 text-center">No opportunities yet. Run analysis after adding competitors/keywords.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Goals */}
      {tab === 'goals' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Agent Goals</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Title</th><th>Priority</th><th>Status</th><th>Confidence</th><th>Metrics</th><th>Action</th></tr></thead>
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
                        <option value="open">open</option><option value="in_progress">in_progress</option><option value="done">done</option><option value="cancelled">cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {goals.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-400 text-center">No goals yet.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Runs */}
      {tab === 'runs' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Analysis Runs</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2">Type</th><th>Status</th><th>Started</th><th>Finished</th><th>Triggered By</th></tr></thead>
              <tbody>
                {runs.map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2">{r.run_type}</td>
                    <td>{r.status}</td>
                    <td className="text-xs text-slate-400">{r.started_at}</td>
                    <td className="text-xs text-slate-400">{r.finished_at || 'â€”'}</td>
                    <td>{r.triggered_by}</td>
                  </tr>
                ))}
                {runs.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400 text-center">No runs yet.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
