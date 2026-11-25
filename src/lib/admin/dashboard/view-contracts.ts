import type {Dispatch,SetStateAction} from "react";
import type {Tab} from "./navigation";
import type {CorrectionCandidate} from "@/components/GeoFeedbackMemory";
import type {CompetitorPageEvidenceBrief} from "@/lib/competitor-page-evidence";

export type Setter<T>=Dispatch<SetStateAction<T>>;
export type Language='ar'|'en'|'zh';
export type Collection='competitors'|'keywords'|'opportunities'|'goals'|'runs';
export type FeedbackTarget={kind:'keyword'|'competitor'|'opportunity'|'editorial'|'publication'|'faq';key:string;language?:Language|null}|null;
export type Faq={q:string;a:string};
export type CompetitorDraft={name:string;domain:string;languages:string;source:string};
export type CompetitorEdit={id:string;name:string;domain:string;languages:string}|null;
export type KeywordEdit={id:string;term:string;language:Language;intent:string;cluster:string}|null;
export type GoalDraft={title:string;description:string;priority:string};
export type GoalEdit=({id:string}&GoalDraft)|null;
export type OpportunityEdit={id:string;title:string;priority:string}|null;
// Existing dynamic administrative payloads stay unchanged during migration.
export type MarketActions={saving:boolean;setSaving:Setter<boolean>;setError:Setter<string>;setNotice:Setter<string>;marketFetch:(path:string,init?:RequestInit)=>Promise<any>;refreshMarketCollection:(collection:Collection)=>Promise<void>};
export type DashboardViewContracts={
 content:any;setTab:Setter<Tab>;secret:string;saving:boolean;pendingDrafts:number;
 goldenDraft:string;setGoldenDraft:Setter<string>;saveGolden:()=>void;
 newFaq:Faq;setNewFaq:Setter<Faq>;editingFaq:({index:number}&Faq)|null;setEditingFaq:Setter<({index:number}&Faq)|null>;
 addFaq:()=>void;updateFaq:()=>void;deleteFaq:(index:number)=>void;
 draftReviewEdits:Record<string,string>;setDraftReviewEdits:Setter<Record<string,string>>;approveDraft:(index:number)=>void;rejectDraft:(index:number)=>void;
 marketSources:any[];fetchMarketSources:()=>Promise<void>;marketLoading:boolean;refreshingAll:boolean;refreshAll:()=>Promise<void>;
 competitors:any[];competitorSearch:string;setCompetitorSearch:Setter<string>;competitorFilter:string;setCompetitorFilter:Setter<string>;newCompetitor:CompetitorDraft;setNewCompetitor:Setter<CompetitorDraft>;editingCompetitor:CompetitorEdit;setEditingCompetitor:Setter<CompetitorEdit>;
 keywords:any[];keywordSearch:string;setKeywordSearch:Setter<string>;newMarketKeyword:string;setNewMarketKeyword:Setter<string>;keywordLanguage:Language;setKeywordLanguage:Setter<Language>;editingMarketKeyword:KeywordEdit;setEditingMarketKeyword:Setter<KeywordEdit>;feedbackTarget:FeedbackTarget;setFeedbackTarget:Setter<FeedbackTarget>;uniqueCorrectionCandidates:CorrectionCandidate[];
 opportunities:any[];editingOpportunity:OpportunityEdit;setEditingOpportunity:Setter<OpportunityEdit>;
 goals:any[];newGoal:GoalDraft;setNewGoal:Setter<GoalDraft>;editingGoal:GoalEdit;setEditingGoal:Setter<GoalEdit>;
 evidenceData:any;evidenceLoading:boolean;fetchEvidence:()=>Promise<void>;recordedBriefs:CompetitorPageEvidenceBrief[];
}&MarketActions;
