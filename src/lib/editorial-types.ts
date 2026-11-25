export type EditorialKind = 'home'|'service'|'packages'|'guide'|'comparison'|'trust'|'technical_seo'|'internal_link';
export type EditorialLocale = 'ar'|'en'|'zh';
export type EditorialStatus = 'pending'|'approved'|'rejected';
export type EditorialRef={id:string;label:string;source:string;kind:string;url?:string;observed_at?:string};
/** Claim must appear in the candidate; quote must occur verbatim on live official page. */
export type ReviewPreflight={status:'ready'|'blocked';digest:string;checked_at:string;matched:number;total:number;reason:string};
export type EditorialClaimEvidence={claim:string;quote:string;url:string};
export type EditorialItem={
 id:string;kind:EditorialKind;lang:EditorialLocale;target:string;slug?:string;related_service?:string;
 topic_node_id?:string;primary_keyword?:string;secondary_keywords?:string[];h1_suggestion?:string;
 sections?:Array<{h2:string;body:string;subsections?:Array<{h3:string;body:string}>}>;
 internal_links?:Array<{node_id:string;anchor:string}>;schema_suggestions?:string[];
 title:string;summary:string;body:string;risk_level:'low'|'medium'|'high';
 status:EditorialStatus;createdAt:string;reviewedAt?:string;updatedAt?:string;
 evidence_ids:string[];evidence_refs:EditorialRef[];verified_sources?:string[];
 review_preflight?:ReviewPreflight;
 claim_evidence?:EditorialClaimEvidence[];approval_method?:'human'|'automated';
 auto_published?:boolean;auto_published_at?:string;
 cited_sources?:string[];source_verification?:'not_independently_checked'|'independently_checked';
};
