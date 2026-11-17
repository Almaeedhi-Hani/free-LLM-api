'use client';

import { useState } from 'react';
import { topicNodes } from '@/lib/content-tree';
import { recommendLinksForReviewedEvidence, prioritizeEvidenceLinkRecommendations } from '@/lib/evidence-link-recommendations';
import { evidenceFreshness } from '@/lib/competitor-page-evidence';
import type { CompetitorPageEvidenceBrief } from '@/lib/competitor-page-evidence';

const liveTopics = topicNodes.filter(node => Boolean(node.route));
type Locale = 'ar' | 'en' | 'zh';

/** Manual, ephemeral review workspace. It does not read or write market observations. */
export default function EvidencePriorityReviewPanel({ recordedBriefs = [] }: { recordedBriefs?: CompetitorPageEvidenceBrief[] }) {
  const [language, setLanguage] = useState<Locale>('ar');
  const [topicId, setTopicId] = useState('');
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [items, setItems] = useState<ReturnType<typeof recommendLinksForReviewedEvidence>[]>([]);
  const [filter, setFilter] = useState<'all' | Locale>('all');
  const [band, setBand] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [error, setError] = useState('');
  const [selectedBrief, setSelectedBrief] = useState('');
  const selectedRecorded = selectedBrief === '' ? undefined : recordedBriefs[Number(selectedBrief)];
  const results = prioritizeEvidenceLinkRecommendations(items.filter((item): item is NonNullable<typeof item> => item !== null))
    .filter(item => (filter === 'all' || item.recommendation.language === filter) && (band === 'all' || item.priority_band === band));

  function addRecordedForReview() {
    setError('');
    const brief = selectedRecorded;
    if (!brief || !topicId) { setError('اختر دليلًا مسجلًا وصفحة منشورة للمراجعة.'); return; }
    if (evidenceFreshness(brief.observed_at) === 'invalid') { setError('تاريخ رصد الدليل غير صالح؛ لا يمكن إنشاء توصية منه.'); return; }
    const item = recommendLinksForReviewedEvidence(brief, topicId);
    if (!item) { setError('تعذر إنشاء التوصية من الدليل المختار.'); return; }
    setItems(current => [...current, item]);
  }

  function addForReview() {
    setError('');
    let parsed: URL;
    try { parsed = new URL(url); } catch { setError('أدخل رابط صفحة منافس صالحًا.'); return; }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      setError('يجب أن يكون الرابط HTTP أو HTTPS دون بيانات تسجيل دخول.'); return;
    }
    const brief: CompetitorPageEvidenceBrief = {
      competitor_id: 'manual-review', language, query: query.trim(), url: parsed.href,
      title: null, observed_at: new Date().toISOString(), verified_rank: null,
      evidence_status: 'provider_candidate', strengths: [],
      weaknesses: weaknesses.split('\n').map(x => x.trim()).filter(Boolean), review_required: true,
    };
    const item = recommendLinksForReviewedEvidence(brief, topicId);
    if (!item) { setError('اختر صفحة منشورة وأدخل استعلام بحث صالحًا.'); return; }
    setItems(current => [...current, item]);
    setUrl(''); setWeaknesses('');
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="مراجعة أولويات الروابط الداخلية">
      <div>
        <h3 className="text-lg font-bold text-navy-900">مراجعة أولويات الروابط الداخلية</h3>
        <p className="text-sm text-slate-600">مساحة مراجعة يدوية مؤقتة. لا تُستورد ملاحظات المنافسين تلقائيًا هنا، ولا تُحفظ المدخلات أو تُنشر. كل الروابط المقترحة تحتاج اعتمادًا بشريًا.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm font-semibold">أدلة المنافسين المسجلة — قراءة فقط</p>
        <p className="text-xs text-slate-600">المصدر: سجلات رصد المنافسين. لا يعني ظهور دليل أنه نتيجة Google موثقة؛ تحقق من حالة الدليل وتاريخ الرصد.</p>
        <label className="mt-2 block text-sm">اختر دليلًا مسجلًا
          <select className="mt-1 w-full rounded-lg border p-2" value={selectedBrief} onChange={e => { const index = e.target.value; setSelectedBrief(index); const brief = recordedBriefs[Number(index)]; if (brief) setLanguage(brief.language); }}>
            <option value="">اختر الدليل</option>
            {recordedBriefs.map((brief, index) => <option key={brief.competitor_id + brief.url + brief.query + index} value={String(index)}>{brief.language} · {brief.query} · {brief.evidence_status === 'verified_serp' ? 'SERP متحقق' : 'مرشح غير متحقق'} · {brief.observed_at.slice(0,10)}</option>)}
          </select>
        </label>
        {selectedRecorded && <div className="mt-2 space-y-1 text-xs text-slate-700">
          <p>الرابط: {recordedBriefs[Number(selectedBrief)].url}</p>
          <p>تاريخ الرصد: {selectedRecorded.observed_at}</p>
          <p className={evidenceFreshness(selectedRecorded.observed_at) === 'recent' ? 'text-green-700' : 'text-amber-800'}>حداثة الدليل: {evidenceFreshness(selectedRecorded.observed_at) === 'recent' ? 'خلال 30 يومًا' : evidenceFreshness(selectedRecorded.observed_at) === 'stale' ? 'أقدم من 30 يومًا — راجعه قبل الاعتماد' : 'تاريخ غير صالح'}</p>
          <p>الترتيب المتحقق: {recordedBriefs[Number(selectedBrief)].verified_rank ?? 'غير متوفر'}</p>
          <p>نقاط الضعف المسجلة: {recordedBriefs[Number(selectedBrief)].weaknesses.join('، ') || 'لا توجد'}</p>
        </div>}
        <button type="button" className="btn-secondary mt-2" onClick={addRecordedForReview}>إنشاء توصية من الدليل المسجل والصفحة المختارة</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold">اللغة
          <select aria-label="لغة الدليل" className="mt-1 w-full rounded-lg border p-2" value={language} onChange={e => setLanguage(e.target.value as Locale)}>
            <option value="ar">العربية</option><option value="en">English</option><option value="zh">中文</option>
          </select>
        </label>
        <label className="text-sm font-semibold">الصفحة المستهدفة المنشورة
          <select aria-label="الصفحة المستهدفة" className="mt-1 w-full rounded-lg border p-2" value={topicId} onChange={e => setTopicId(e.target.value)}>
            <option value="">اختر صفحة بنفسك</option>
            {liveTopics.map(node => <option key={node.id} value={node.id}>{node.primary_keyword[language]} — {node.route}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">استعلام البحث
          <input className="mt-1 w-full rounded-lg border p-2" value={query} onChange={e => setQuery(e.target.value)} placeholder="استعلام مرتبط بالدليل" />
        </label>
        <label className="text-sm font-semibold">رابط صفحة المنافس
          <input className="mt-1 w-full rounded-lg border p-2" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/page" />
        </label>
        <label className="text-sm font-semibold md:col-span-2">نقاط ضعف موثقة يدويًا (سطر لكل نقطة)
          <textarea className="mt-1 w-full rounded-lg border p-2" rows={2} value={weaknesses} onChange={e => setWeaknesses(e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-amber-800">الإدخال اليدوي لا يثبت ترتيب Google؛ جميع هذه المدخلات تُعامل كمرشحات غير متحقق من ترتيبها.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="button" className="btn-secondary" onClick={addForReview}>إضافة إلى قائمة المراجعة المؤقتة</button>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">تصفية اللغة <select className="ml-2 rounded border p-1" value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="all">الكل</option><option value="ar">العربية</option><option value="en">English</option><option value="zh">中文</option></select></label>
        <label className="text-sm">الأولوية <select className="ml-2 rounded border p-1" value={band} onChange={e => setBand(e.target.value as typeof band)}><option value="all">الكل</option><option value="high">مرتفعة</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select></label>
        <button type="button" className="text-sm underline" onClick={() => setItems([])}>مسح القائمة المؤقتة</button>
      </div>
      {results.length === 0 && <p className="text-sm text-slate-600">لا توجد توصيات مطابقة للعرض.</p>}
      <div className="space-y-3">
        {results.map((entry, index) => <article key={index} className="rounded-lg border bg-white p-3">
          <p className="font-semibold">درجة المراجعة: {entry.priority_score}/100 — {entry.priority_band === 'high' ? 'مرتفعة' : entry.priority_band === 'medium' ? 'متوسطة' : 'منخفضة'}</p>
          <p className="text-sm break-all">{entry.recommendation.target_route} · {entry.recommendation.language}</p>
          <p className="text-xs text-amber-800">{entry.recommendation.evidence_status === 'verified_serp' ? 'الدليل: ترتيب SERP متحقق وفق السجل' : 'الدليل: مرشح غير متحقق من ترتيب Google'} · يلزم مراجعة بشرية</p>
          <p className="text-sm">الأسباب: {entry.reasons.join('، ')}</p>
          <p className="text-sm break-all">رابط المنافس: {entry.recommendation.competitor_url}</p>
          <ul className="mt-2 list-disc ps-5 text-sm">{entry.recommendation.suggested_links.map(link => <li key={link.route}>{link.anchor} — {link.route}</li>)}</ul>
        </article>)}
      </div>
    </section>
  );
}
