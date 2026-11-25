'use client';
import {useEffect} from 'react';
import type {DashboardState} from './useDashboardState';

export function useDashboardMarket({secret,authed,setAuthed,tab,setError,setCompetitors,setKeywords,setOpportunities,setGoals,setRuns,setMarketSources,setMarketLoading,setLastUpdated,setEvidenceLoading,setRecordedBriefs,setEvidenceData}:Pick<DashboardState,"secret"|"authed"|"setAuthed"|"tab"|"setError"|"setCompetitors"|"setKeywords"|"setOpportunities"|"setGoals"|"setRuns"|"setMarketSources"|"setMarketLoading"|"setLastUpdated"|"setEvidenceLoading"|"setRecordedBriefs"|"setEvidenceData">) {
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
  return {marketFetch,refreshMarketCollection,refreshMarket,fetchMarketSources,fetchEvidence};
}
