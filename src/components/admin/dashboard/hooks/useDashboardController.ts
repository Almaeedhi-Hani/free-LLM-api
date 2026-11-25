'use client';
import {useDashboardState} from './useDashboardState';
import {useDashboardSession} from './useDashboardSession';
import {useDashboardMarket} from './useDashboardMarket';
import {useDashboardContentActions} from './useDashboardContentActions';

export function useDashboardController() {
  const state=useDashboardState();
  const {refreshingAll,saving,setRefreshingAll,setError,setNotice,tab,setVisibilityRefreshKey,setAuthed,setSecret,setContent,setCompetitors,setKeywords,setOpportunities,setGoals,setRuns}=state;
  const session=useDashboardSession(state);
  const {fetchContent}=session;
  const market=useDashboardMarket(state);
  const {refreshMarket,fetchEvidence,fetchMarketSources}=market;
  const actions=useDashboardContentActions(state,session.save);
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

  const logout = () => {
    sessionStorage.removeItem('admin_secret');
    setAuthed(false);
    setSecret('');
    setContent(null);setCompetitors([]);setKeywords([]);setOpportunities([]);setGoals([]);setRuns([]);
    setNotice('');setError('');
  };
  return {...state,...session,...market,...actions,refreshAll,logout};
}
