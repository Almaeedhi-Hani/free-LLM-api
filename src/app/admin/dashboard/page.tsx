'use client';

import React, { useState, useEffect } from 'react';

type Tab = 'home' | 'contact' | 'content' | 'agent' | 'reviews' | 'settings';

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const [newFaq, setNewFaq] = useState({ q: '', a: '' });
  const [contactForm, setContactForm] = useState({ phone: '', phoneDisplay: '', whatsapp: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret');
    if (saved) {
      setSecret(saved);
      setAuthed(true);
    }
  }, []);

  const fetchContent = () => {
    if (!authed || !secret) return;
    fetch('/api/admin/content', { headers: { 'x-admin-secret': secret } })
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then((d) => {
        setContent(d);
        if (d.contact) setContactForm(d.contact);
        setError('');
      })
      .catch((e) => {
        setError(e.message);
        setAuthed(false);
        sessionStorage.removeItem('admin_secret');
      });
  };

  useEffect(() => {
    fetchContent();
  }, [authed, secret]);

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

  const save = (patch: any) => {
    setSaving(true);
    fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
      .then((r) => r.json())
      .then((d) => { setContent(d.content); if (d.content?.contact) setContactForm(d.content.contact); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
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

  const saveContact = () => save({ contact: contactForm });

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-luxury">
        <h1 className="text-2xl font-bold text-navy-900 mb-4">Admin Dashboard — Access Denied</h1>
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
    { key: 'home', label: 'الرئيسية' },
    { key: 'contact', label: 'التواصل' },
    { key: 'content', label: 'المحتوى' },
    { key: 'agent', label: 'وكيل GEO' },
    { key: 'reviews', label: 'المراجعات' },
    { key: 'settings', label: 'الإعدادات' },
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
          <h2 className="text-xl font-bold mb-4">معلومات التواصل</h2>
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
            <h2 className="text-xl font-bold mb-2">Keywords</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {content.keywords.map((k: string, i: number) => (
                <span key={i} className="bg-gold-100 text-gold-800 text-xs font-semibold px-3 py-1 rounded-full">{k}</span>
              ))}
            </div>
          </section>
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">FAQs</h2>
            <ul className="space-y-3">
              {content.faqs.map((f: any, i: number) => (
                <li key={i} className="bg-slate-50 rounded-lg p-4">
                  <p className="font-semibold">{f.q}</p>
                  <p className="text-slate-600 text-sm mt-1">{f.a}</p>
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
          <h2 className="text-xl font-bold mb-4">وكيل GEO — الحالة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-bold text-emerald-700">{content.agent?.status || 'idle'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">Last Run</p>
              <p className="font-bold text-slate-700 text-sm">{content.agent?.lastRun || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500">Last Result</p>
              <p className="text-slate-700 text-sm">{content.agent?.lastResult || '—'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Agent runs via GitHub Actions (daily 02:00 UTC) and Render cron. High-risk content → drafts (pending approval).</p>
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
                <p className="text-xs text-slate-400 mt-1">Status: {d.status} · {d.createdAt}</p>
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
          <h2 className="text-xl font-bold mb-4">الإعدادات</h2>
          <p className="text-slate-600 text-sm mb-2">Golden Paragraph (read-only here; updated by agent):</p>
          <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{content.goldenParagraph}</p>
          <p className="text-xs text-slate-400 mt-4">Updated: {content.updatedAt}</p>
        </section>
      )}
    </div>
  );
}
