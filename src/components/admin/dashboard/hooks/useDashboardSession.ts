'use client';
import {useEffect} from 'react';
import {contactToForm} from '@/lib/admin/dashboard/contact-form';
import type {DashboardState} from './useDashboardState';

export function useDashboardSession({secret,setSecret,authed,setAuthed,content,setContent,setError,setContactForm,setGoldenDraft,setLastUpdated,setRestoringSession,setSaving,setNotice}:Pick<DashboardState,"secret"|"setSecret"|"authed"|"setAuthed"|"content"|"setContent"|"setError"|"setContactForm"|"setGoldenDraft"|"setLastUpdated"|"setRestoringSession"|"setSaving"|"setNotice">) {
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
  return {fetchContent,login,save};
}
export type DashboardSession=ReturnType<typeof useDashboardSession>;
