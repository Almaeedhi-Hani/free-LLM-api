/** Stable public API; implementation is organized by publication responsibility. */
export type {AutoPublishReport} from './geo/publication/types';
export {officialCandidateUrls,lowRiskEditorialCopy,verifyHighRiskOfficialClaims,checkOfficialUrlReachable} from './geo/publication/official-evidence';
export type {VerifiedOfficialClaimProof} from './geo/publication/official-evidence';
export {getAutoPublicationStatus,saveAutoPublicationSettings,saveSensitiveAutomaticPermission,rollbackAutoPublication} from './geo/publication/policy-store';
export {optionalResearchCitations} from './geo/publication/citations';
export {runGuardedAutoPublishing} from './geo/publication/runner';
