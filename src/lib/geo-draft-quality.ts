/**
 * Minimum editorial safeguards for machine-generated GEO draft FAQ copy.
 * This is a quality heuristic, NOT fact verification or authorization to publish.
 * Legal/financial/licensing drafts still require human review of official sources.
 */
export type GeoDraftLocale = 'ar' | 'en' | 'zh';
export type DraftCopyAssessment = {locale:GeoDraftLocale;publishable:boolean;issues:string[]};

const AR=/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g;
const HAN=/[\u3400-\u9FFF]/g;
const LAT=/[A-Za-z]/g;
const count=(s:string,re:RegExp)=>(s.match(re)||[]).length;
function ratios(s:string){
 const ar=count(s,AR),zh=count(s,HAN),en=count(s,LAT),total=ar+zh+en;
 return {ar,zh,en,total,arRatio:total?ar/total:0,zhRatio:total?zh/total:0,enRatio:total?en/total:0};
}
export function detectGeoDraftLocale(q:string):GeoDraftLocale {
 const x=ratios(q);
 if(x.zh>=2)return 'zh';
 if(x.ar>=2)return 'ar';
 return 'en';
}
const GENERIC=[
 /observed competitor guides/i,
 /observed competitor pages/i,
 /competitors observed/i,
 /this is commercial advisory information/i,
 /commercial advisory information, not a government service/i,
 /تشير صفحات\s+competitors/i,
 /requirements, approvals, fees and timelines are determined by official/i
];
export function assessGeoDraftCopy(q:string,a:string):DraftCopyAssessment {
 const question=String(q||'').trim(), answer=String(a||'').trim();
 const locale=detectGeoDraftLocale(question), issues:string[]=[];
 const ques=ratios(question),res=ratios(answer);
 if(question.length<15||ques.total<8)issues.push('Question is too short or lacks readable language.');
 if(answer.length<90||res.total<55)issues.push('Answer is too short to be a useful verified FAQ.');
 if(question.includes('\uFFFD')||answer.includes('\uFFFD'))issues.push('Invalid replacement characters in copy.');
 if(locale==='ar'){
  if(ques.arRatio<0.65)issues.push('Arabic question contains excessive unrelated Latin text.');
  if(res.ar<45||res.arRatio<0.72)issues.push('Arabic answer is mostly translated/mixed foreign-language text.');
 }else if(locale==='zh'){
  if(ques.zhRatio<0.55)issues.push('Chinese question contains excessive unrelated Latin text.');
  if(res.zh<35||res.zhRatio<0.48)issues.push('Chinese answer is not substantially Simplified Chinese.');
 }else{
  if(ques.enRatio<0.85)issues.push('English question mixes another writing system.');
  if(res.en<50||res.enRatio<0.85)issues.push('English answer mixes another writing system.');
 }
 if(GENERIC.some(p=>p.test(answer)))issues.push('Generic competitor-observation filler is not a service answer.');
 if(/(?:guaranteed approval|\b100%\s+(?:approval|license)|مضمون\s+100%)/i.test(answer))
   issues.push('Unverified guarantee of official outcome.');
 return {locale,publishable:issues.length===0,issues};
}
/**
 * A narrowly matched, trailing verification instruction can be visually separated
 * from a proposed answer. This does NOT change stored data or verify legal claims.
 * Only the exact text edited/reviewed by the operator may be published.
 *
 * Never split a phrase in the middle of an answer: the remaining copy might be
 * meaningful and must stay visible for review.
 */
const TRAILING_VERIFICATION_NOTE=/(?:يجب|ينبغي)\s+التحقق\s+من\s+المصادر\s+الرسمية(?:\s+قبل\s+(?:submission|التقديم|الاعتماد|النشر))?[\s.!؟،؛]*$/i;
export function splitGeoDraftReviewText(value:unknown):{answer:string;note:string}{
 const original=String(value??'').trim();
 const match=TRAILING_VERIFICATION_NOTE.exec(original);
 if(!match||match.index===0)return {answer:original,note:''};
 const answer=original.slice(0,match.index).replace(/[\s،؛:]+$/,'').trim();
 if(!answer)return {answer:original,note:''};
 return {answer,note:original.slice(match.index).trim()};
}

export function validateGeoDrafts(drafts:readonly {q:string;a:string;lang?:GeoDraftLocale}[]):void{
 const errors=drafts.flatMap((d,i)=>[...assessGeoDraftCopy(d.q,d.a).issues,...(faqLocale(d)?[]:['Question and answer must match the intended locale.'])].map(issue=>'draft '+(i+1)+': '+issue));
 // Also detect recycled identical answers across differently localized questions.
 const normalized=new Map<string,number>();
 for(let i=0;i<drafts.length;i++){
  const text=drafts[i].a.trim().toLocaleLowerCase().replace(/\s+/g,' ');
  if(normalized.has(text))errors.push('draft '+(i+1)+': duplicate answer of draft '+(normalized.get(text)!+1));
  else normalized.set(text,i);
 }
 if(errors.length)throw new Error('GEO draft quality failed: '+errors.join(' | ').slice(0,920));
}

/** Public route language check; explicit destinations never override mismatching text. */
export function faqLocale(f:{q:string;a:string;lang?:GeoDraftLocale}):GeoDraftLocale|null{
 if(!f||typeof f.q!=='string'||typeof f.a!=='string'||!f.q.trim()||!f.a.trim()||/^STORAGE_TEST_/i.test(f.q))return null;
 const lang=f.lang||detectGeoDraftLocale(f.q);
 const fits=(v:ReturnType<typeof ratios>)=>v.total>0&&(lang==='ar'?v.arRatio>=.65:lang==='zh'?v.zhRatio>=.48:lang==='en'?v.enRatio>=.85:false);
 return fits(ratios(f.q))&&fits(ratios(f.a))?lang:null;
}
export function faqsForLocale<T extends {q:string;a:string;lang?:GeoDraftLocale}>(items:readonly T[],lang:GeoDraftLocale):T[]{
 return items.filter(f=>faqLocale(f)===lang);
}
