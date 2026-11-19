# PROGRESS — خطة الأتمتة وتوحيد لوحة التحكم (Invest in Saudi V3)

**المرجع الملزم:** [automation-and-consolidation-plan.md](automation-and-consolidation-plan.md)  
**لقطة الأساس:** [baseline-20261119.md](baseline-20261119.md)  
**التاريخ المرجعي:** 2026-11-19 — Asia/Riyadh  
**نمط التنفيذ الحالي:** **أ** (افتراضي حتى يطلب المالك صراحة النمط ب).  
**التصنيف:** مؤكد = دليل من كود أو CI أو قاعدة أو سجل؛ مستنتج = تفسير مع سببه؛ غير معروف = لا دليل.

## تعليمات الاستئناف بعد انقطاع الجلسة

1. اقرأ الخطة، هذا الملف ولقطة الأساس، ثم root AGENTS.md وdocs/v3-multi-agent-execution.md.
2. تحقّق من SHA الحالي لـ main وحالة الوسم Git وPR المرحلة 0؛ **لا تعتبر وجود فرع أو PR وسمًا**.
3. افحص بوابة خروج آخر مرحلة قبل كتابة أو دمج مرحلة جديدة. وثق التواريخ وأرقام PR وrun IDs ونتائج البيانات الفعلية.
4. لا تتجاوز قرارات المالك، ولا تغير سياسة النشر أو حدّه، ولا تحذف بيانات؛ الترحيلات إضافية.
5. لكل مرحلة فرع وPR منفصل ووسم Git استرجاع قبلها؛ CI + اختبارات قبول + Evals قبل الدمج. تحديث PROGRESS.md جزء من نفس PR.
6. عند توقف البوابة: سجل السبب **المؤكد** وأبق المرحلة التالية معلقة؛ لا تشغّل Workflow ولا مزود بحث خارجي بغرض الاستعجال.

## لوحة الحالات

| المرحلة | القائمة | الحالة الحالية | التاريخ (KSA) | PR | بوابة الخروج / الدليل |
| --- | --- | --- | --- | --- | --- |
| 0 التحضير والسلامة | [x] | **مكتملة ومندمجة؛ بوابة الخروج ناجحة** | 2026-11-19 | [PR #165](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/165) — merged `4b2b64f` | [baseline-20261119.md](baseline-20261119.md) محفوظة على main؛ Git tag مثبت؛ CI/Browser/Evals **6/6 ناجحة** على SHA `a4a38a4` |
| 1 ضمان التشغيل | [ ] | لم تبدأ | — | — | W01–W06: schedule ناجح + حفظ حقيقي مؤرخ |
| 2 شبكة الأمان | [ ] | لم تبدأ | — | — | محاكاة آمنة لكل إنذار + تقرير أسبوعي منتج |
| 3 بوابات آلية | [ ] | لم تبدأ | — | — | Evals وقبول ودورة تقبل/ترفض وفحص الروابط العامة |
| 4 أرشيف موحد | [ ] | لم تبدأ | — | — | كل أداة مرة واحدة، جرد APIs/DB ثابت، قبول |
| 5 روابط المحتوى | [ ] | لم تبدأ | — | — | مقارنة عددية مع المنشور، HTTP 200، اختبار واجهة |
| 6 دمج التبويبات | [ ] | لم تبدأ | — | — | تكافؤ وظيفي وقبول ودورة بلا أخطاء لكل مجال |
| 7 إخفاء الأزرار | [ ] | لم تبدأ | — | — | أعلام قابلة للتراجع ومراقبة دورة كاملة |
| 8 أرشفة الشيفرة | [ ] | ممنوعة قبل 30 يومًا وبعد تحقق الخروج | — | — | 30 يومًا بلا طلبات في Render؛ لا imports/workflows قديمة، CI وإعادة تحقق |

## المرحلة 0 — قائمة التدقيق

- [x] **مؤكد**: قراءة root AGENTS.md وعقد V3 وضبط النمط أ الافتراضي.
- [x] **مؤكد**: تثبيت SHA الأساس main: 9606113b48a29801961cfdeab662974fdc6ecb7e.
- [x] **مؤكد**: توثيق الخطة في docs/plans/automation-and-consolidation-plan.md في فرع مرحلة 0.
- [x] **مؤكد**: حفظ لقطة أساس V01–V18 و25 admin API و5 GEO API و22 workflow و25 public table في baseline-20261119.md في الفرع.
- [x] **مؤكد**: CI على main عند SHA الأساس: Admin regression [#44515753293](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44515753293) = success؛ Production read-only acceptance [#44515753188](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44515753188) = success.
- [x] **مؤكد**: قراءة الوسم pre-consolidation-20261119 عبر GitHub = HTTP 404؛ غير موجود.
- [x] **مؤكد**: أُنشئ Git tag الحقيقي `pre-consolidation-20261119` على SHA الأساس `9606113b48a29801961cfdeab662974fdc6ecb7e` بواسطة مهمة GitHub مؤقتة محدودة [#44544172119](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544172119)، وتحقق GitHub GET من `refs/tags/pre-consolidation-20261119` أن النوع `commit` والـ SHA مطابق. **أزيل ملف المهمة المؤقتة من فرع PR، ولن يُدمج في main**.
- [x] **مؤكد عند SHA 9f5f8f434f8ddc585c7d0ce19b158c6c124dc5d3**: نجاح فحوص PR الأربعة: Admin regression [#44534114291](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44534114291)، GSC integration [#44534118966](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44534118966)، Production read-only acceptance [#44534114257](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44534114257)، Phase2 SQL security [#44534114546](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44534114546).
- [x] **مؤكد**: عُدّل فلتر **اختبارات PR فقط** لـ V3 Evals وAdmin seven-hub browser ليشمل `docs/plans/**`، بدون تعديل أي `schedule` إنتاجي. نجحت V3 Evals على SHA `ac18e41` في [#44544172446](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544172446).
- [x] **مؤكد**: اختبار المتصفح الشامل نجح على SHA `3d890a49`: [#44544612521](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544612521)، وأتم خطوات 7 مجموعات، 18 شاشة مع اختبارات الكتابة/القراءة المعزولة محليًا، تنقل الهاتف، تسجيل الخروج، وعرض WhatsApp. لم تُكتب بيانات إنتاجية.
- [x] **مؤكد**: اجتاز SHA `3d890a49` جميع فحوص PR الستة: [Admin regression #44544612626](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544612626)، [GSC integration #44544612594](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544612594)، [Phase2 SQL #44544612850](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544612850)، [Production read-only #44544612708](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544612708)، [V3 regression Evals #44544612666](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544612666)، [Admin browser acceptance #44544612521](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544612521).
- [x] **مؤكد**: اجتاز رأس PR النهائي `a4a38a43425c0cccd9fd5a64881a7efa3ad9f9d0` الفحوص الستة: [Admin regression #44554715774](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715774)، [GSC integration #44554715748](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715748)، [Phase 2 SQL #44554715778](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715778)، [Production read-only #44554715860](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715860)، [V3 Evals #44554715753](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715753)، [Admin seven-hub browser #44554715964](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715964).
- [ ] تحقق من إعادة نجاح **كل** الفحوص المطلوبة على رأس PR بعد هذا التحديث (CI وV3 Evals وBrowser)؛ سجّل روابط الرأس النهائي في PR عند اكتمالها.
- [x] **مؤكد**: دُمج [PR #165](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/165) باستخدام squash، معرّف الدمج `4b2b64f3bd73c7248a4f8f37b59dba1cc0fb2d30`؛ موجود على main. الوسم يظل على baseline السابق `9606113`.
- [x] **مؤكد**: أُرسل تقرير نقطة التفتيش للمالك بعد الدمج. **النمط أ: لا تبدأ المرحلة 1 قبل موافقة جديدة بعد هذه النقطة.**

### بوابة خروج المرحلة 0

| الشرط | الحالة | الدليل |
| --- | --- | --- |
| وجود pre-consolidation-20261119 على SHA البداية | **نجاح مؤكد** | GitHub GET مطابق SHA؛ [run #44544172119](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44544172119) |
| حفظ الخطة ولقطة الأساس وPROGRESS | **منفذ في الفرع؛ لم يُدمج** | الملفات الثلاثة في فرع codex/phase0-plan-baseline-20261119 |
| CI أخضر على main | **ناجح** | #44515753293 و#44515753188 |
| CI/قبول على PR | **6/6 نجاح نهائي** | SHA `a4a38a4`، run IDs: #44554715774، #44554715748، #44554715778، #44554715860، #44554715753، #44554715964 |
| V3 Evals وBrowser acceptance | **نجحا على SHA النهائي** | Evals [#44554715753](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715753)؛ Browser [#44554715964](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44554715964) |

**الحكم بتاريخ 2026-11-19:** **بوابة خروج المرحلة 0 مجتازة.** وسم الاسترجاع على SHA البداية مثبت، لقطة الأساس محفوظة على main، CI/قبول/Evals على SHA PR النهائي 6/6 ناجحة، وPR #165 مدمج في `4b2b64f`. **المرحلة 1 لم تبدأ** وفق النمط أ؛ تتطلب موافقة المالك عند نقطة التفتيش. تحديث هذا السجل لاحقًا في PR توثيقي مستقل من المرحلة نفسها لا يغيّر حكم الاختبارات على كود PR #165.

## المرحلة 1 — الأدلة المطلوبة (لا تدّعِ أنها مكتملة)

- [ ] 1.1 GSC: كشف الأيام المفقودة وتسجيل success_with_data/success_no_data/failed، إعادة فحص النجاح بلا بيانات في 3–7 أيام، وقيم D07 الفعلية.
- [ ] 1.2 GEO: event=schedule بعد إصلاح #156 وحفظ FAQ وeditorial؛ تسجيل رفض البيانات.
- [ ] 1.3 Market Radar: سبب انقطاع/غياب schedule مثبت، وحدوث حفظ D01–D04 من دورة schedule.
- [ ] 1.4 منع ازدواج النشر بين W01 وW03 مع حد 3 والسجل D06 ومصدر المحاولة.
- [ ] 1.5 كل صفحة منشورة مسترجعة HTTP 200 مع عدد/قائمة نتائج.
- [ ] 1.6 PR ترحيل أمني منفصل غير مطبق إنتاجيًا، حتى اعتماد المالك.

### جدول أدلة تشغيل الأنظمة الستة — يملأ عند تحقق المرحلة 1

| Workflow | run ID لـ schedule على الإصدار المطلوب | وقت UTC/KSA | حالة GitHub | دليل حفظ فعلي/قرار no_change | قبول |
| --- | --- | --- | --- | --- | --- |
| W01 GEO | غير مثبت | — | آخر schedule المفحوص فشل | لا دليل حديث على حفظ جميع المراحل | [ ] |
| W02 Market Radar | غير مثبت في قائمة schedule الحالية | — | غير معروف | D01–D04 فيها بيانات؛ ربطها بـ event=schedule غير مثبت | [ ] |
| W03 Auto Publication | #44459351010 على إصدار أقدم | 2026-11-19 04:35 UTC / 07:35 KSA | success GitHub | سجل D06 موجود؛ مطابقة الحد والكتابة لهذه الدورة مطلوبة | [ ] |
| W04 GSC | #44460349477 على إصدار أقدم | 2026-11-19 04:44 UTC / 07:44 KSA | success GitHub | gsc_daily_metrics=5؛ gsc_sync_day_outcomes=0 | [ ] |
| W05 LLM Index | #44503133016 | 2026-11-19 10:10 UTC / 13:10 KSA | success GitHub | يلزم إثبات التحديث أو no_change في نتيجة التشغيل | [ ] |
| W06 Maintenance | #44508302894 | 2026-11-19 10:43 UTC / 13:43 KSA | success GitHub | يلزم إثبات change/no_change وصحة النطاق | [ ] |

## المرحلة 2 — شبكة الأمان

- [ ] Watchdog كل 6 ساعات مع Issue dedup وحفظ حقيقي.
- [ ] if: failure() في الإنتاج يرسل Issue مرة واحدة لكل عطل.
- [ ] weekly-report مع أرقام مثبتة وفصل sample types.
- [ ] إنذار الروابط المنافسة وفشل Evals.
- [ ] Master Pause واحد بمسار آمن ودون توسيع GitHub token scopes.
- [ ] quota_reached عند 80% فقط من الحصة المجانية المثبتة.
- [ ] محاكاة آمنة لكل الإنذارات وتقرير أسبوعي واحد.

## المرحلة 3 — بوابات آلية

- [ ] تنازع منافس/مرجع رسمي (راجع #142).
- [ ] تصنيف الكلمات AR/EN/ZH، out_of_scope_review وwould_remove.
- [ ] مراجعة FAQ/editorial بالـ Evals وبسياسة النشر الحالية.
- [ ] قواعد فرص وأهداف مسجلة قابلة للتراجع.
- [ ] حدود المهام التقنية وإزالة ازدواج GitHub Issues.
- [ ] اقتراح قواعد تصحيح واعتماد مالك قبل التفعيل.
- [ ] فصل AI measurement_type.
- [ ] عينة أسبوعية — **قرار المالك معلق**.
- [ ] دورة قبول/رفض حقيقية واختبارات وعدم روابط منافسين.

## المرحلة 4 — الأرشيف

- [ ] الأرشيف الوحيد، مطوي افتراضيًا.
- [ ] B15، V04، B08/D08، تشغيل V07 السابق، روابط V18، وأي واجهة Legacy بعد إثباتها.
- [ ] منطق/APIs/جداول سليمة، feature flags قابلة للتراجع.
- [ ] لقطة تنقل وقبول وAdapter واحد.

## المرحلة 5 — شاشة الروابط

- [ ] حصر روابط V09/V10/V11/V12/V08/D06 بالسطر.
- [ ] استخراج المكوّن الحالي الأكمل إلى PublishedLinksList.
- [ ] بيانات المنشور المؤكد فقط؛ معاينات غير المنشور مطوية منفصلة.
- [ ] عدد الروابط = عدد المنشور في المصدر، لا تكرار، HTTP 200.
- [ ] اختبار واجهة وجوال وتنقل مستقل.

## المرحلة 6 — توحيد اللوحة

- [ ] المحتوى.
- [ ] AI/GSC وB09/B14.
- [ ] السوق.
- [ ] إعدادات الموقع.
- [ ] كل مجال: نقل/اختبار/علم/مراقبة دورة؛ تكافؤ وظائف ونحو 11 تبويبًا.

## المرحلة 7 — إخفاء الأزرار

- [ ] أزرار التلقائي أصبحت متقدمة، مع بقاء المسار اليدوي الطارئ.
- [ ] الأزرار القديمة مخفية خلف أعلام قابلة للتراجع.
- [ ] مراقبة دورة كاملة بلا خسارة وظيفة.

## المرحلة 8 — أرشفة الكود

- [ ] **حظر البداية**: 30 يومًا بعد إكمال السابق.
- [ ] Render logs بلا طلبات إلى cron-agent/cron-unified/غيرهما طوال المدة.
- [ ] عدم وجود workflow أو imports تستدعي المرشحات.
- [ ] وسم Git/PR/CI/قبول/Evals؛ الجداول D12 وبيانات JSON لا تمس.

## القرارات المعلقة عند المالك

- [ ] سياسة النشر الحالية وحدها 3 وأي حماية إضافية للمحتوى القانوني — **لا تغيير بدون موافقة**.
- [ ] نطاقات الجهات الرسمية الموثوقة.
- [ ] قائمة الرفض الصينية بمراجعة ناطق.
- [ ] **تطبيق** الترحيل الأمني لاحقًا (التحضير مسموح).
- [ ] تفعيل عينة الأسبوع للمحتوى المنشور.
- [ ] موعد المرحلة 8 مع شرط 30 يومًا.
- [ ] تعارض **محتمل** بين أتمتة اعتماد المحتوى القانوني في المرحلة 3 وبين قاعدة المراجعة البشرية المؤهلة في root AGENTS.md؛ أولوية السياسة القائمة ولا تغيير صامت.
- [ ] تغيير النمط أ إلى ب — يتطلب رسالة تشغيل واضحة من المالك.

## سجل التغيير المرحلي

| التاريخ | المرحلة | نوع العمل | PR | النتيجة |
| --- | --- | --- | --- | --- |
| 2026-11-19 | 0 | توثيق الخطة ولقطة الأساس، تثبيت Git tag، Evals وBrowser ناجحان، إزالة bootstrap المؤقت، دمج المرحلة | [#165](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/165) | **مكتملة**؛ merge `4b2b64f`، 6/6 فحوص على `a4a38a4`؛ لا تغيير إنتاجي |
