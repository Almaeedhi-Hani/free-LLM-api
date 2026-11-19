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
| 1 ضمان التشغيل | [ ] | **W02 ثبت نجاحه؛ تم تطبيق RPC GSC v2 لكن إثبات الجدولة والحفظ معلّق؛ W01 جزئي؛ W03/W05/W06 بانتظار schedule** | 2026-11-19 | [PR #167](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/167) مدمج؛ [PR #168](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/168) إصلاح التطبيق لم يُدمج بعد | [سجل الأدلة](phase1-evidence-20261119.md)؛ Supabase migration **20261119194500** طبق بنجاح؛ CI لآخر رأس PR مطلوب؛ لا انتقال للمرحلة 2 |
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

**مؤكد / 2026-11-19:** اعتمد المالك بدء هذه المرحلة بعبارة «التالي» بعد إكمال المرحلة 0 في PR #166. الفرع المستقل `codex/phase1-scheduled-reliability-20261119`، [PR #167](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/167) (Draft). وسم Git **حقيقي** `pre-phase1-20261119` ثبت على `c0ad3444fb04acd08d25e1ce11e6e7e6cf4217b1` وتُحقق منه باستعلام GitHub؛ أُزيل bootstrap المؤقت من الفرع. **لا تنقل للمرحلة 2 حتى تحقق بوابة المرحلة 1**. التفصيل [phase1-evidence-20261119.md](phase1-evidence-20261119.md).

- [x] **مؤكد**: فحص كود W01–W06، أحدث GitHub schedule run IDs، وقراءة D01–D07 باستخدام SQL SELECT فقط. لم تُشغّل مهام، ولم تُستهلك حصص بحث/AI.
- [x] **مؤكد**: إصلاحات مقترحة في PR #167 لبوابات W03/W05/W06: نفس 12 موعد UTC الأصلي لكل منها، وتحويل تحديد الموعد إلى `scheduled-event-slot.cjs` من GitHub `run.created_at` بدل ساعة runner. اختبارات حالات تأخير وموعد التحويل 22 نوفمبر؛ لا يُدّعى نجاحها قبل CI والنشر الفعلي.
- [x] **مؤكد**: سياسة Supabase النشطة `enabled=true`, `daily_limit=3`, `allow_high_risk=true`؛ **بقيت دون تعديل**.
- [x] **مؤكد**: W03 [#44546805433](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44546805433) سجّل GitHub success مع `[CADENCE] SKIP`؛ لم تُنفَّذ خطوة النشر. سبب تخطي هذه الدورة مثبت في اللوج، ويستهدفه الإصلاح.
- [x] **مؤكد**: W05 [#44503133016](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44503133016) وW06 [#44508302894](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44508302894) لديهما `[CADENCE] RUN` وقرار `no_change` مثبت؛ يحتاجان إعادة قبول على النسخة الجديدة.
- [x] **مؤكد**: أنشئ ملف SQL مقترح [security/phase1-hardening-proposal.sql](security/phase1-hardening-proposal.sql) **غير مطبق**؛ لا يُدخل في migrations ولا يفتح RLS. طلب تطبيقه على الإنتاج يبقى قرارًا للمالك.
- [x] **مؤكد / استدراك اختبار FAQ:** نجحت فحوص PR #167 الستة عند SHA `0ef9d880e6720dfde60756516ab3100c7fe0df3b`: [Browser acceptance #44569481884](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44569481884)، [Admin regression #44569481791](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44569481791)، [GSC integration #44569481811](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44569481811)، [Phase2 SQL #44569481839](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44569481839)، [V3 Evals #44569481734](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44569481734)، [Production read-only acceptance #44569481851](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44569481851) **ناجح في إعادة المحاولة** بعد استجابة 502 عارضة من صفحة /services/premium-residency. طوّر اختبار FAQ لانتظار POST يزيل **السؤال المحدد بالضبط** مع فحص حجم المصفوفة، HTTP 200، تأكيد الخادم والقراءة المستقلة. **لا تعديل لمنطق الحذف الإنتاجي**.

- [x] **مؤكد / HTTP من GitHub runner:** [Production acceptance #44564941498](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44564941498) نجح في GET لعدد 24 صفحة أساسية و4 صفحات editorial إضافية عبر sitemap (28 إجمالًا) مع assertion HTTP 200؛ بقيت مطابقة الروابط الأربع إلى أحداث D06 الثلاثة مستحقة قبل إغلاق 1.5.
- [ ] تحقق **جميع** فحوص CI والقبول وV3 Evals مجددًا على رأس PR بعد تحديث هذا السجل؛ ثم يجوز دمج تغييرات الجدولة المنفذة في المرحلة 1، لكن **لا تُعتبر المرحلة مكتملة** حتى دليل schedule والحفظ الفعلي في الإنتاج.
- [x] **مؤكد / 19 نوفمبر 22:16 KSA:** رادار السوق W02 أثبت تشغيلًا مجدولًا وحفظًا حقيقيًا؛ GEO حفظ جزئيًا رغم فشل المحرر؛ GSC فشل بدالة الدور في PostgreSQL. أُعدّ مقترح RPC v2 **إضافي غير مطبق** في `docs/plans/gsc-role-rpc-v2-owner-approval.sql`؛ لا تدمج واجهة v2 قبل تطبيق مخططها بموافقة المالك.
- [x] **مؤكد / متابعة بعد توجيه المالك «التالي»:** أضيف ملف SQL مطابق للمقترح إلى `supabase/migrations/20261119194500_phase1_gsc_rpc_service_role_v2_20261119.sql`، واجتازت الفحوص الستة على SHA `0f949e89ffd1578f987df1ced2607ba62e653ca3` قبل الترحيل. نجح `apply_migration` بإصدار **20261119194500**؛ تحقق SELECT من وجود الدالتين وحصر EXECUTE في `service_role`؛ 0 سجلات day outcomes و5 total metrics ثابتة. الترحيل الأمني (1.6) **لم يطبق**. لا يُستدل من نجاح SQL على نجاح GSC الفعلي.
- [ ] إثبات ست تشغيلات schedule حقيقية على النسخة المدمجة في الإنتاج، مع حفظ فعلي أو no_change مبرر.

- [ ] 1.1 GSC: **مؤكد** فشل 2× قبل الإصلاح بسبب `gsc_sync_commit_day` القديم. طبّقنا في Supabase فقط الترحيل الإضافي `phase1_gsc_rpc_service_role_v2_20261119` رقم **20261119194500**؛ دالتا `_v2` موجودتان بالفعل، `SECURITY INVOKER` وحارس `current_user=service_role`، صلاحية EXECUTE للخدمة فقط، وRLS والجداول بلا تعديل. **لا توجد بعد أي كتابة GSC ناتجة عن V2**: outcomes=0 والصفحات=0. يجب إكمال CI ثم دمج/نشر PR #168 والتحقق من أول `event=schedule` وحفظ الأيام من خلال SELECT.
- [ ] 1.2 GEO: **مؤكد** schedule #44585116258 بعد #156 حفظ 5 فرص و5 أهداف و3 مسودات؛ **فشل** بسبب رفض 3 مقترحات تحريرية. رفض مسجل غير صامت لكن لا دورة ناجحة كاملة.
- [ ] 1.3 Market Radar: **مؤكد** schedule #44595877385 نجح وكتب بيانات فعلية D01–D04 (analysis_runs 2→4، observations 120→135). سبب غياب الأحداث السابقة **غير معروف**؛ لا تستنتج تعطيل الـworkflow أو العلم.
- [ ] 1.4 منع ازدواج النشر: قيدا UNIQUE(item_id,content_fingerprint) موجودان؛ السجلات الثلاثة لا تتكرر، والحد الفعلي 3 ثابت. إثبات المنافسة بين W01/W03 وتوثيق مصدر **كل محاولة** في D06 غير مكتمل.
- [ ] 1.5 الروابط الثلاثة المنشورة محددة في سجل الأدلة؛ فحص GET المباشر من بيئة النموذج تعذر بسبب الوصول/الشبكة. يجب استخدام قبول GitHub للموقع وفحص عدد صفحات D06 أمام روابط المنشور وإثبات HTTP 200.
- [ ] 1.6 مقترح SQL الأمني موجود ضمن docs/plans/security **غير مطبق**؛ إعداد PR أمني مستقل وتطبيقه الإنتاجي مؤجل لموافقة المالك.

### جدول أدلة تشغيل الأنظمة الستة — يملأ عند تحقق المرحلة 1

| Workflow | run ID لـ schedule على الإصدار المطلوب | وقت UTC/KSA | حالة GitHub | دليل حفظ فعلي/قرار no_change | قبول |
| --- | --- | --- | --- | --- | --- |
| W01 GEO | [#44585116258](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44585116258) (b3b14cf) | 2026-11-19 18:11 UTC / 21:11 KSA | **failure بعد تنفيذ جزئي** | السجل يثبت حفظ 5 فرص و5 أهداف و3 مسودات؛ رفض 3 مقترحات تحريرية؛ لم تثبت دورة ناجحة | [ ] |
| W02 Market Radar | [#44595877385](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44595877385) (b3b14cf) | 2026-11-19 19:12 UTC / 22:12 KSA | **success وRUN فعلي** | analysis_runs 2→4 وcompetitor_observations 120→135، ثم 145 في لقطة أحدث؛ حفظ cron مثبت | [x] |
| W03 Auto Publication | #44546805433 (قديم) | 2026-11-19 14:43 UTC / 17:43 KSA | **success GitHub؛ SKIP للبوابة** | log يثبت أن النشر لم يُنفذ. إصلاح PR #167 معلّق، لا يجوز احتساب هذا قبولًا | [ ] |
| W04 GSC | [#44574400340](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44574400340)، [#44593004607](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44593004607) (b3b14cf) | 2026-11-19 17:11 و18:56 UTC / 20:11 و21:56 KSA | **failure / RPC 400** | edge_logs: role=service_role؛ PostgreSQL P0001 في guard القديم؛ gsc_outcomes=0، page_rows=0؛ v2 additive مقترح فقط | [ ] |
| W05 LLM Index | #44503133016 (قديم) | 2026-11-19 10:10 UTC / 13:10 KSA | success GitHub | log يثبت RUN ثم No meaningful machine-index changes; no PR (no_change)؛ يحتاج تحقق جديد | [ ] |
| W06 Maintenance | #44508302894 (قديم) | 2026-11-19 10:43 UTC / 13:43 KSA | success GitHub | log يثبت RUN ثم No additional safe technical work (no_change)؛ يحتاج تحقق جديد | [ ] |

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
