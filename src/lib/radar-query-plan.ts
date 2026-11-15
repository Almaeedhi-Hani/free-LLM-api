/** Diverse investor-intent queries. Each angle is a distinct information need, not a paraphrase. */
export type RadarLanguage = 'ar' | 'en' | 'zh';
export type RadarAngle = 'setup' | 'cost' | 'requirements' | 'timeline' | 'comparison' | 'renewal' | 'problems' | 'audience';
export interface RadarQuery { language: RadarLanguage; angle: RadarAngle; query: string }
export const RADAR_QUERIES: Record<RadarLanguage, ReadonlyArray<{angle: RadarAngle; query: string}>> = {
  ar: [
    {angle:'setup',query:'خطوات تأسيس شركة في السعودية'},
    {angle:'cost',query:'تكلفة تأسيس شركة أجنبية في السعودية'},
    {angle:'requirements',query:'شروط ترخيص المستثمر الأجنبي في السعودية'},
    {angle:'timeline',query:'مدة إصدار السجل التجاري وترخيص الاستثمار'},
    {angle:'comparison',query:'الفرق بين الشركة ذات المسؤولية المحدودة والفرع الأجنبي'},
    {angle:'renewal',query:'تجديد ترخيص الاستثمار في السعودية'},
    {angle:'problems',query:'أسباب رفض طلب ترخيص الاستثمار'},
    {angle:'audience',query:'تأسيس شركة لمستثمر صيني في السعودية'},
  ],
  en: [
    {angle:'setup',query:'how to register a company in Saudi Arabia'},
    {angle:'cost',query:'foreign company setup cost Saudi Arabia'},
    {angle:'requirements',query:'MISA foreign investor license requirements'},
    {angle:'timeline',query:'Saudi business registration processing time'},
    {angle:'comparison',query:'Saudi subsidiary vs foreign branch comparison'},
    {angle:'renewal',query:'MISA investment license renewal process'},
    {angle:'problems',query:'Saudi investment license application rejection reasons'},
    {angle:'audience',query:'Saudi company formation for Chinese investors'},
  ],
  zh: [
    {angle:'setup',query:'沙特阿拉伯公司注册流程'},
    {angle:'cost',query:'沙特外资公司注册费用'},
    {angle:'requirements',query:'沙特外国投资许可证申请条件'},
    {angle:'timeline',query:'沙特公司注册需要多长时间'},
    {angle:'comparison',query:'沙特子公司与外国公司分公司区别'},
    {angle:'renewal',query:'沙特投资许可证续期流程'},
    {angle:'problems',query:'沙特投资许可证申请被拒原因'},
    {angle:'audience',query:'中国投资者在沙特设立公司'},
  ],
};
/** Deterministic UTC-day rotation, independent of runtime locale. */
export function selectRadarQuery(language: RadarLanguage, now: Date, offset = 0): RadarQuery {
  const entries = RADAR_QUERIES[language];
  const day = Math.floor(now.getTime() / 86400000);
  const index = ((day + offset) % entries.length + entries.length) % entries.length;
  return { language, ...entries[index] };
}
export function radarQueryCoverage(): {languages: number; anglesPerLanguage: number; total: number} {
  return {languages:3,anglesPerLanguage:RADAR_QUERIES.ar.length,total:Object.values(RADAR_QUERIES).reduce((n,items)=>n+items.length,0)};
}
