'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState('');
  const [newFaq, setNewFaq] = useState({ q: '', a: '' });

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_secret');
    if (saved) {
      setSecret(saved);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed || !secret) return;
    fetch('/api/admin/content', { headers: { 'x-admin-secret': secret } })
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      })
      .then(setContent)
      .catch((e) => {
        setError(e.message);
        setAuthed(false);
        sessionStorage.removeItem('admin_secret');
      });
  }, [authed, secret]);

  const login = () => {
    if (!secret.trim()) {
      setError('Secret required');
      return;
    }
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

  const approveDraft = (idx: number) => {
    if (!content) return;
    const drafts = [...content.drafts];
    const draft = drafts[idx];
    draft.status = 'approved';
    const faqs = [...content.faqs, { q: draft.q, a: draft.a }];
    const updated = { ...content, faqs, drafts };
    fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
      .then((r) => r.json())
      .then((d) => setContent(d.content))
      .catch((e) => setError(e.message));
  };

  const rejectDraft = (idx: number) => {
    if (!content) return;
    const drafts = [...content.drafts];
    drafts[idx].status = 'rejected';
    fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...content, drafts }),
    })
      .then((r) => r.json())
      .then((d) => setContent(d.content))
      .catch((e) => setError(e.message));
  };

  const addFaq = () => {
    if (!newFaq.q || !newFaq.a) return;
    const faqs = [...(content?.faqs || []), newFaq];
    fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'x-admin-secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ faqs }),
    })
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content);
        setNewFaq({ q: '', a: '' });
      })
      .catch((e) => setError(e.message));
  };

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-luxury">
        <h1 className="text-2xl font-bold text-navy-900 mb-4">Admin Dashboard — Access Denied</h1>
        <p className="text-slate-600 mb-4 text-sm">Enter admin secret to continue. Access is denied if no secret is configured.</p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="w-full border border-slate-300 rounded-lg px-4 py-2 mb-4"
        />
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button onClick={login} className="btn-primary w-full">Unlock</button>
      </div>
    );
  }

  if (!content) {
    return <div className="max-w-4xl mx-auto mt-20 p-8 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-navy-900">Admin Dashboard</h1>
        <button onClick={logout} className="btn-secondary">Logout</button>
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-xl font-bold mb-2">Golden Paragraph</h2>
        <p className="text-slate-700">{content.goldenParagraph}</p>
        <p className="text-xs text-slate-400 mt-2">Updated: {content.updatedAt}</p>
      </section>

      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-xl font-bold mb-2">Keywords</h2>
        <div className="flex flex-wrap gap-2">
          {content.keywords.map((k: string, i: number) => (
            <span key={i} className="bg-gold-100 text-gold-800 text-xs font-semibold px-3 py-1 rounded-full">{k}</span>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
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
          <input
            className="border border-slate-300 rounded-lg px-4 py-2"
            placeholder="Question"
            value={newFaq.q}
            onChange={(e) => setNewFaq({ ...newFaq, q: e.target.value })}
          />
          <input
            className="border border-slate-300 rounded-lg px-4 py-2"
            placeholder="Answer"
            value={newFaq.a}
            onChange={(e) => setNewFaq({ ...newFaq, a: e.target.value })}
          />
        </div>
        <button onClick={addFaq} className="btn-primary mt-3">Add FAQ</button>
      </section>

      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6">
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
                  <button onClick={() => approveDraft(i)} className="btn-primary text-xs">Approve & Publish</button>
                  <button onClick={() => rejectDraft(i)} className="btn-secondary text-xs">Reject</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
