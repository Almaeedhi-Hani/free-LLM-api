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
| 1 ضمان التشغيل | [x] | **مكتملة تشغيليًا: W01–W06 event=schedule ناجح مع دليل حفظ/no_change؛ حارس دمج W05 CI أصلح ودُمج ونُشر** | 2026-11-20 16:07 KSA | [#177](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/177)، [#178](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/178)، [#179](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/179)، [#183](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/183)، [#185](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/185)، [#186](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/186) | [W01 #44724904649](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724904649)، W02 #44720788156، W03 #44641523397، W04 #44643584048، [W05 #44738293680](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44738293680)، W06 #44718852351. [#186](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/186) 7/7 CI; Render LIVE `fddb9978`; [postmerge production GET #44741285728](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44741285728) success. **تحفظ موثق:** البوت دمج #185 قبل فحوص PR؛ فشلت 4 runs بلا jobs؛ منع التكرار بكود #186؛ لم يختبر الحارس عبر PR bot حي جديد بعد الإصلاح. الترحيل الأمني جاهز وغير مطبق بانتظار موافقة المالك؛ المرحلة 2 تنتظر نقطة التفتيش. |
| 2 شبكة الأمان | [ ] | **قيد التنفيذ، غير مغلقة**: Watchdog/weekly/failure #189، Master Pause #194، quality #197، اصلاح الصلاحيات #201، قراءة W03/GSC #202؛ التشغيل المجدول والموافقات لم تكتمل | 2026-11-20 18:45 KSA | [#189](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/189)، [#194](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/194)، [#197](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/197)، [#201](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/201)، [#202](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/202)، [#199](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/199) Draft | `main=b1db7e40` Render LIVE، post-merge Admin+GET ناجحة. **لا** شاهد natural watchdog schedule، التقرير الأسبوعي Issue، أو أول quality schedule؛ اختبار workflow_run alert موجود لا يثبت وقوع حادث حقيقي. زر لوحة الإيقاف والحارس الذري 80% ما زالا غير مكتملين؛ وسم pre-phase2 غير ظاهر. |
| 3 بوابات آلية | [ ] | **تطوير استشاري تجريبي فقط**: لغات AR/EN/ZH والمنافسين والمسودات/مصادر AI ومقترحات التقنية؛ لم يدمج أو يفعّل | 2026-11-20 | [#198](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/198) Draft | فحوص `6/6` ناجحة على `ed081e72`، لكن دمج المرحلة 3 محظور حتى إغلاق 2، واختبار قبول/رفض حي ومراجعة المحتوى التنظيمي والقرارات البشرية متبقية. |
| 4 أرشيف موحد | [ ] | **إنجاز تطوير في فرع مستقل بحسب المالك؛ غير مدمج أو منشور** | 2026-11-20 | [#190](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/190) Draft | فحوص 7/7 ناجحة؛ يلزم تكامل بعد 2–3 ووسم وعملية إصدار منفصلة. |
| 5 روابط المحتوى | [ ] | **إنجاز تطوير في فرع مستقل بحسب المالك؛ غير مدمج أو منشور** | 2026-11-20 | [#195](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/195) Draft | مبني على فرع #190؛ يحتاج دمج 4 أولًا وفحوص تكامل كاملة وإثبات روابط 200 وعدد العناصر المنشورة. |
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
- [x] **مؤكد — نقطة نشر 2026-11-19 22:56 KSA:** PR #168 مدمج، migration #20261119194500 مدرج في سجل Supabase، Render Live على `08fd957`، 6/6 CI على رأس PR. حُفظت القراءة قبل تشغيل schedule: day outcomes=0. لا تكرر تطبيق migration، ولا تشغّل Google/API خارجي للاختبار، ولا تعتبر نجاح النشر نجاح GSC.
- [x] **مؤكد — 19 نوفمبر 23:02 KSA:** GSC W04 **أول schedule على `08fd957`** نجح وكتب يومي 15 و16 نوفمبر وأثبت readback. بيانات Google صفر في المقاييس الفعلية؛ لا تُحوّل إلى زيارات. W01/W03/W05/W06 لا تزال بواباتها مفتوحة.
- [x] **مؤكد — 20 نوفمبر 03:19 KSA:** W03 أول تشغيل schedule فعلي بعد إصلاح التأخير نجح ونشر عنصرين، وسجلات `audit_logs` تربط محاولة W03 بالأحداث ونتيجة الحصة. W01 سبق وأثبت دورة ناجحة؛ W02 الرادار مقبول؛ W04 ظهر في 17 نوفمبر 3 انطباعات حقيقية مع 0 نقرات. **الأنظمة المقبولة تشغيليًا 4/6**؛ W05/W06 لا تزال بلا schedule جديد، و1.4 ما زالت مفتوحة بينما 1.5 اجتازت فحص الإنتاج بعد النشر.
- [ ] **مؤكد — 20 نوفمبر 13:02 KSA (SELECT read-only):** Latest main/Render LIVE = `2685e58` (#176). W06 now meets scheduled no_change gate (#44696818140); W05 newly scheduled but 5 runs fail on public locale homepage validator (#44715043426 latest). W01 last schedule #44700969265 failed after 5 opportunities/6 goals/2 of 3 drafts and 3 editorial actions due to `draft_quality_invalid (HTTP 502)`; do not treat partial writes as full success. W03 #44708762984 RUN, `published=0`, documented `quota_reached` and 4 visitor-copy exclusions. W04 #44713621167 RUN with `attempted=0,remaining=0`, legitimate no due day. W02 #44698280217 RUN and database analysis `radar/full` success (same operation). DB `daily_limit=3`, editorial published in previous 24h=3, FAQ=0, D06 total=6, duplicate item/fingerprint groups=0. `audit_logs` source=W03 count 34, W01 count 0; true concurrent DB transactions remain untested. **Phase 1 remains OPEN; no phase 2.**
- [ ] إثبات ست تشغيلات schedule حقيقية على النسخة المدمجة في الإنتاج، مع حفظ فعلي أو no_change مبرر.

- [x] 1.1 GSC: **مؤكد**: بعد ترحيل **20261119194500** ونشر PR #168، [أول schedule حقيقي #44604512378](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44604512378) على `08fd957` الساعة **23:02 KSA** أكمل جمعًا وحفظًا ذريًا وقراءة مستقلة؛ `gsc_sync_day_outcomes=2` بتاريخ 15 و16 نوفمبر، `success_with_data`، `attempts=1`، صف `total` واحد لكل يوم. **لكن** clicks=0 وimpressions=0 لكل يوم، وأبعاد query/page/page_query=0؛ هذا **نجاح تقني للحفظ وليس إثبات زيارات/ظهور**. يحتاج مراقبة بيانات حقيقية مستقبلية دون توليد قياسات.
- [x] 1.2 GEO: **مؤكد / 20 نوفمبر 02:27 KSA:** بعد PR #174، نجحت دورة [#44637825373](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44637825373) من نوع `event=schedule` على SHA `1f7d27e`: `persisted_editorial_actions=3` و`persisted_drafts=3` و3 فرص و3 أهداف؛ ثم نفّذ مسار النشر المشترك وأتم بنجاح مع **عنصر منشور واحد** في `/zh/`، وأبلغ `quota_reached` لباقي العناصر مع احترام حد 3 خلال 24 ساعة. تحققت SELECT من ارتفاع `editorialItems` إلى 43، `drafts` إلى 25، وD06 إلى 4 أحداث (آخرها عند 23:28:30 UTC). هذه **دورة ناجحة كاملة مع حفظ فعلي**؛ W01 مقبول. لا تعتبر هذا إثباتًا لتتبع مصدر كل محاولة (PR #175 لم يكن منشورًا حينها).
- [x] 1.3 Market Radar: **مؤكد** تشغيل `event=schedule` [#44720788156](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44720788156) على الإصدار الجديد، `success`، وسجلا `analysis_runs` المرتبطان `radar/full` عند 10:37Z؛ لا تعني سجلات العمل المزدوجة دورتين مختلفتين. سبب غياب بعض دورات GitHub القديمة **غير معروف** ولا يُخترع.
- [x] 1.4 منع ازدواج النشر: **مؤكد** [PR #179](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/179) اختبر معاملات PostgreSQL 17 المعزولة الفعلية: عنصر واحد لا يُنشر مرتين وتشارك FAQ/editorial حد 3، [PR #183](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/183) أثبت rollback/replay بنفس SQL الإنتاجي في قاعدة معزولة، و[W01 schedule #44724904649](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724904649) أثبت 6 صفوف `audit_logs` ذات `source_workflow=W01` ورقم تشغيل/event ونهاية `quota_reached`. تدقيق W03 D06 سابق مثبت؛ صفر بصمات مكررة؛ لا اختبار نشر حي اصطناعي.
- [x] 1.5 **مؤكد بتشغيل GitHub CI بعد النشر الجديد:** [Production read-only acceptance #44645801766](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44645801766) نفّذ `scripts/check-public-seo.cjs` فعليًا مع `SEO_TEST_BASE_URL` و`SITE_URL` يشيران لإنتاج Render، في 20 نوفمبر **03:26 KSA**، ونجح فحص GET/HTTP 200 لكل **24 صفحة مترجمة أساسية** ومنها `/zh/` و`/zh/packages` و`/zh/services/company-formation`، بالإضافة إلى 4 روابط تحريرية ضمن sitemap (3 `/insights/*` الأصلية وصفحة فهرس الأدلة)، بمجموع 28 مسارًا. تحقّق كذلك من H1 والمحتوى الأساسي وcanonical/JSON-LD. أُنجز هذا الفحص **بعد** أحداث النشر الصينية عند 02:28 و02:54 KSA؛ لا يثبت وحده فهرسة Google أو حفظ محتوى محدد دون فحص عناصر الصفحة.
- [x] 1.6 **التحضير فقط مكتمل، التطبيق الإنتاجي غير مصرح به:** المقترح `docs/plans/security/phase1-hardening-proposal.sql` موجود ولم يطبّق. فحص Supabase SELECT يوم 20 نوفمبر 13:07Z أظهر أن `public.rls_auto_enable()` ما زال `SECURITY DEFINER` مع `EXECUTE` لـanon وauthenticated، و`public.geo_set_updated_at()` دون `search_path` مقيّد. هذا **قرار أمني معلّق على موافقة المالك** وليس آمنًا أن يفترض أنه معالج.

### جدول أدلة تشغيل الأنظمة الستة — يملأ عند تحقق المرحلة 1

| Workflow | run ID لـ schedule على الإصدار المطلوب | وقت UTC/KSA | حالة GitHub | دليل حفظ فعلي/قرار no_change | قبول |
| --- | --- | --- | --- | --- | --- |
| W01 GEO | [#44637825373](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44637825373) (`1f7d27e`) | 2026-11-19 23:27 UTC / **20 نوفمبر 02:27 KSA** | **success / schedule + حفظ + نشر حقيقي** | 3 editorial actions + 3 FAQ drafts + 3 فرص + 3 أهداف، صفحة صينية `/zh/` منشورة؛ `geo_publication_events` 3→4، `quota_reached` للبقية وفق حد 3 | [x] |
| W02 Market Radar | [#44614779373](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44614779373) (`0b6a386`) | 2026-11-19 21:02 UTC / **20 نوفمبر 00:02 KSA** | **success، ثاني schedule مثبت** | رادار مستقل حفظ 5 ملاحظات؛ أحدث إجمالي observations=160 يتضمن كتابات من GEO أيضًا؛ لا تنسبها جميعًا للرادار | [x] |
| W03 Auto Publication | [#44641523397](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44641523397) (`e8893a7`) | 2026-11-19 23:54 UTC / **20 نوفمبر 02:54 KSA** | **success؛ EVENT_CADENCE RUN وخطوة HTTP نُفّذت** | endpoint `published=2`، وربط `audit_logs` السجلين `published` بأحداث D06، وبمحاولة ثالثة `quota_reached` دون نشر. 4 تقييمات مستبعدة؛ `source_workflow=W03` وrun_id صحيحان. | [x] |
| W04 GSC | [#44643584048](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44643584048) (`e8893a7`) | 2026-11-20 00:09 UTC / **20 نوفمبر 03:09 KSA** | **success schedule + حفظ يوم إضافي** | 17 نوفمبر: 4 صفوف (`total`, `page`, `country`, `device`)، `impressions=3`, `clicks=0`; أيام 15–16 total=0؛ مجموع outcomes=3؛ لا تجمع الأبعاد الأربعة كمشاهدات مستقلة | [x] |
| W05 LLM Index | [#44738293680](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44738293680) (`f0140cba`) | 20 Nov 12:44–12:45 UTC / **15:44–15:45 KSA** | **success / event=schedule / EVENT_CADENCE RUN / verified=true changed=true** | تحديث حقيقي لـ`public/llms.txt` بثلاثة روابط صينية، [PR #185](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/185) مدمج SHA `9fcb5785`، Render LIVE 12:46:53Z، [production read-only #44738435894](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44738435894) success؛ ملاحظة مستقلة: فحوص PR بدأت/فشلت دون jobs بعد الدمج السريع | [x] |
| W06 Maintenance | [#44696818140](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44696818140) (`2685e58`) | 20 Nov 07:41 UTC / 10:41 KSA | **success / schedule / EVENT_CADENCE RUN** | `PASS bounded auto-dev`; `TASK_CHANGED=false`; `No additional safe technical work. No empty PR.` — legitimate `no_change` without editing source, qualifies as bounded maintenance. | [x] |

### 2026-11-20 — متابعة W05 بعد #177 وتحضير إصلاح W01 دون تجاوز البوابة

- [x] **مؤكد:** دُمج PR [#177](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/177) على commit `0ce5a294c901c3b56e57e2fd0de5511c739b95fe` بعد اجتياز 6/6 فحوص، وأصبح Render LIVE بإصدار `dep-dc01r10u01pc73b9ufpg` عند `2026-11-20T10:15:44Z`.
- [ ] **W05 غير مغلق:** لم يظهر بعد تشغيل `event=schedule` جديد على `0ce5a294` بعد النشر. التشغيلات السابقة التي فشلت ليست دليلًا على نجاح الإصلاح؛ لا تستبدل schedule بـ workflow_dispatch.
- [ ] **W01 إصلاح مقترح فقط:** محاولات `schedule` الحديثة أخفقت جزئيًا بسبب مسودات رفضها `validateGeoDrafts` مع `draft_quality_invalid (HTTP 502)` وبعض `invalid_guide_slug`. الفحص المحلي القديم `screenDrafts` كان يقبل نصًا يرفضه `src/lib/geo-draft-quality.ts`، مما يفوّت فرصة إصلاح الصياغة الواحدة المعتمدة قبل الحفظ. الإصلاح الجاري يطابق عتبات الخادم في الفحص المحلي، يرفض الحشو والضمانات والتكرار ولا يكرر كتابة غير مؤكدة؛ مع اختبارات لغات ثلاث وتعليمات توليد ضمن نفس حصة النموذج. **لا يعتبر نجاحًا قبل CI ونشر ثم schedule/readback**.
- [ ] **1.4 باقية:** سجل W01 بعد PR #175 واختبار تزامن معاملات حيّ في بيئة معزولة غير مثبتين. لا تغيّر الحد 3 أو مخطط الإنتاج أو سياسة النشر.
- [ ] **بوابة خروج المرحلة 1 غير محققة؛ المرحلة 2 محظورة**.

### المرحلة 1.4 — اختبار تزامن المعاملات المعزول (دليل مشروط)

- [x] **مؤكد / اختبار PostgreSQL 17 الحقيقي اجتاز البوابة 20 نوفمبر 13:30 KSA:** [GitHub Actions #44719794267](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44719794267) `event=pull_request`, `success`, على SHA `32d8973`، مع PostgreSQL مؤقت من خدمة GitHub Actions وملفي دوال النشر الحقيقية. PASS الاختبار الأول: W01 وW03 يتنافسان على `item_id` نفسه، حدث منشور واحد مع استجابة `invalid_state` للمنافس. PASS الاختبار الثاني: FAQ واحد و4 محاولات تحريرية متزامنة، **حدثان تحريريان فقط + FAQ واحد = 3**؛ ومحاولتان `quota_reached`، و0 بصمات أحداث مكررة، وتطابق 2 عناصر تحريرية معتمدة + FAQ واحد في `content_store`. الحد 3 داخل الاختبار مطابق للإنتاج ولم يُغيّر في الإنتاج. **دليل CI لا يشمل W01 provenance الحي**.
- [ ] **المتبقي من 1.4:** إثبات `audit_logs` لطلب W01 حقيقي بعد PR #175 من `event=schedule`، مع `source_workflow=W01` ورقم التشغيل ونتيجة المحاولة. اختبار التزامن الفعلي المعزول أعلاه **نجح** لكنه لا يثبت مسار رؤوس API أو هوية W01 في الإنتاج. لا تُغلق المرحلة حتى يجتاز هذا الشرط مع W01/W05.
- [ ] W01 وW05 يحتاجان تشغيل `event=schedule` حقيقيًا مع قراءة الحفظ/القرار بعد دمج إصلاحاتهما؛ لا انتقال إلى المرحلة 2.

### 2026-11-20 14:08 KSA — نقطة تفتيش بمنسق واحد دون جلسات

- [x] **مؤكد:** دمج PR #177 (إصلاح W05، SHA `0ce5a294`) وPR #178 (إصلاح W01، SHA `b93bd434`) بعد اجتياز جميع الاختبارات، ونشرهما على Render.
- [x] **مؤكد:** دمج [PR #179](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/179) بعد اجتياز **7/7** فحوص، ومنها [اختبار PostgreSQL الفعلي #44720105512](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44720105512). `main=876565aa28c238472aa696c33044f97382dc0a41` وRender `dep-dc02ifc9v7es73cfq00g` **LIVE** عند 11:05:39 UTC / 14:05:39 KSA. اجتاز فحص الإنتاج غير المعدل [#44724540037](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724540037). هذا لا يثبت مصدر محاولة W01 الحية.
- [x] **مؤكد/Supabase SELECT 11:05–11:07 UTC:** النشر `enabled=true` و`allow_high_risk=true` و`daily_limit=3` دون تعديل؛ 3 أحداث editorial آخر 24 ساعة و0 FAQ؛ الإجمالي 6 editorial و0 FAQ. مجموعات التكرار `item_id+content_fingerprint` = صفر. `content_store`: 35 مسودة و55 اقتراح تحرير. `audit_logs`: 34 صفًا خاصًا بالنشر، جميعها W03 (7 started، 2 published، 5 quota_reached، 20 requires_finished_visitor_copy) و**صفر W01**.
- [x] **مؤكد/W02:** [schedule #44720788156](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44720788156) success عند 10:37Z على `b93bd434`، مع سجلي `analysis_runs` مرتبطين radar/full؛ لا تعدّهما دورتين مستقلتين.
- [x] **مؤكد/W04:** GSC 15–16 نوفمبر total=0؛ 17 نوفمبر total=3 impressions و0 clicks، وله 3 أبعاد أخرى لا تجمعها كمشاهدات جديدة.
- [x] **W01 مكتملة بعد الإصلاح:** [schedule #44724904649](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724904649) success، SHA `876565aa`، التشغيل الفعلي `2026-11-20 11:07–11:08Z`، وكان nominal event slot `2026-11-20 03:00Z` (تأخير GitHub دون تزوير نوع الحدث). GitHub سجل معالجة/حفظ 4 فرص، 4 أهداف، 2 مسودات FAQ و1 editorial، بدون رفض أو إعادة إصلاح؛ تحقق Supabase SELECT أن **2 فرص و2 أهداف جديدة** أنشئت خلال الدقيقة، و2 مسودات و1 editorial لها `createdAt` أثناء التشغيل (العداد الإجمالي تداخل مع إعادة الاستخدام/الدمج). نُفّذت خطوة النشر بعد GEO ونتيجتها `published=0` لانتهاء الحصة، و4 `requires_finished_visitor_copy`. **دليل المصدر مكتمل:** 6 صفوف `audit_logs` ذات `source_workflow=W01`, `github_run_id=44724904649`, `event_type=schedule`, attempt=1: 4 تقييمات، و`rpc_started` واحدة و`rpc_result=quota_reached` واحدة. هذه نتيجة نشر مشروعة بلا تجاوز الحد.
- [ ] **W05 باقية:** آخر schedule مفحوص [#44715043426](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44715043426) فشل على SHA قديم `2685e58` قبل PR #177؛ نحتاج post-fix schedule وتحقق changed/no_change الحقيقي.
- [x] **تغيير نمط التنفيذ:** طلب المالك المتابعة في المحادثة الحالية دون جلسات منفصلة؛ أُغلق PR #181 الخاص بفتح الجلسات **دون دمج**. يبقى [Issue #180](https://github.com/Almaeedhi-Hani/free-LLM-api/issues/180) سجلًا مركزيًا للأدلة فقط، لا وكيلًا نشطًا.
- [ ] **بوابة خروج المرحلة 1 لا تزال مفتوحة بسبب W05 فقط** بعد إثبات W01 وW02/W03/W04/W06، ومزامنة دليل النشر ذات المصدر. المرحلة 2 ممنوعة حتى تحقق schedule W05 بعد PR #177 وتحديث التقرير النهائي. لا يطبق الترحيل الأمني على الإنتاج دون موافقة صريحة.

### 2026-11-20 14:13 KSA — قبول W01 الموثق و1.4 مصدر النشر

- [x] **مؤكد:** W01 post-PR178 schedule [#44724904649](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724904649) success على `876565aa`. أربع مراحل GEO كلها ناجحة، وفرص/أهداف/FAQ/editorial محفوظة، وأُجريت خطوة W01 publisher دون نشر جديد بموجب limit=3.
- [x] **مؤكد/1.4:** Supabase `audit_logs` يحفظ 6 صفوف W01 جديدة مرتبطة بنفس رقم التشغيل و`event_type=schedule`، منها محاولة RPC فعلية بنتيجة `quota_reached`. مع نجاح اختبار معاملات PostgreSQL #44720105512 وغياب البصمات المكررة يبقى التزامن والمصدر مثبتين دون نشر اختباري.
- [ ] **فقط W05:** ينتظر دليل تشغيل schedule لاحق لإصلاح #177 (تغيير صحيح أو no_change مشروع). لا تتجاوز هذه البوابة إلى المرحلة 2.

### 2026-11-20 14:15 KSA — قبول W01 بعد الدورة المجدولة الحقيقية

- [x] **W01 مؤكد على الإصدار الإنتاجي:** [run #44724904649](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724904649)، `event=schedule`، `head_sha=876565aa28c238472aa696c33044f97382dc0a41`، `conclusion=success`؛ حدث `EVENT_CADENCE RUN kind=geo reason=scheduled_slot`، ثم نجحت خطوات التحليل والحفظ والنشر. بدأ التشغيل الفعلي عند 11:07Z (14:07 KSA) رغم أن حدث cron الاسمي 03:00Z؛ لا تخلط بين وقت الحدث وبدء المهمة المتأخر.
- [x] **مؤكد — نتائج حفظ W01:** السجل `persisted_opportunities=4`, `persisted_goals=4`, `persisted_drafts=2`, `persisted_editorial_actions=1`، و`persisted_discovery_candidates=10` و14 كلمة بحثية **موجودة مسبقًا** (`inserted=0,existing=14`). فحص Supabase SELECT عند 11:13–11:14Z وجد فرصتين جديدتين وهدفين جديدين خلال نافذة الدورة، ومسودتين لهما `createdAt` في نافذة الدورة ومقترحًا تحريريًا واحدًا؛ قد تشمل العدادات الأخرى تحديث/إعادة استخدام عناصر سابقة، فلا تعتبر كل عدد محفوظ سجلًا جديدًا.
- [x] **مؤكد — مصدر النشر W01:** `audit_logs` يحوي ستة صفوف موثقة برأس `source_workflow=W01`, `github_run_id=44724904649`, `github_run_attempt=1`, `event_type=schedule`: أربع حالات `requires_finished_visitor_copy`، سجل `rpc_started` واحد، وسجل `rpc_result=quota_reached` واحد (11:07:52–11:07:54Z). `published=0` لأن الحصة ممتلئة، وهو قرار سياسة صحيح وليس فشل المهمة. يثبت هذا هوية محاولة W01 في الإنتاج بعد إثبات تزامن SQL الفعلي داخل PostgreSQL المعزول عبر #179.
- [x] **مؤكد:** لم تُغيّر سياسة النشر: `enabled=true`, `allow_high_risk=true`, `daily_limit=3`؛ بصمات الأحداث المكررة = صفر، وآخر `content_store.updated_at=2026-11-20T11:07:48.979Z`.
- [ ] **المتبقي لإغلاق المرحلة 1:** W05 وحده ما زال يفتقر إلى تشغيل `event=schedule` ناجحًا بعد نشر #177 مع دليل `no_change` أو تحديث فهرس موثق. التأخير عن الجدولة لا يثبت سبب فشل جديد؛ لا تشغيل وهمي، ولا بدء المرحلة 2 حتى قبول W05 وتوثيق بوابة الخروج.

### 2026-11-20 — حماية إضافية للتراجع وإعادة النشر، W05 البوابة الوحيدة

- [x] **مؤكد:** [PR #183](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/183) دُمج في `main` commit `c0c277f455331e447986e667d53950c1b056e465`. [تشغيل PostgreSQL 17 المعزول #44727145381](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44727145381) `event=pull_request` و`success`: PASS التزامن والحد المشترك 3؛ PASS إعادة الطلب قبل وبعد التراجع عن editorial/FAQ دون حدث مكرر؛ PASS التراجع مرة واحدة، والتراجع المعاد `already_rolled_back`؛ PASS اكتشاف تعارض تعديل يدوي لاحق ومنع طمسه. التغييرات محصورة باختبارات SQL ضمن GitHub Actions، دون تعديل دوال النشر أو قاعدة الإنتاج أو سياسة المخاطر.
- [x] **مؤكد:** W01 [#44724904649](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724904649) نجح بعد الإصلاح وأثبت الحفظ الفعلي ومصدر W01 في `audit_logs` (`quota_reached` مشروع)، وW02/W03/W04/W06 لها دليل سابق مفصل. بوابة 1.4 محققة بالاختبارات والأثر الإنتاجي دون نشر اختباري.
- [ ] **المتبقي وحده من بوابة التشغيل 1:** W05 بعد إصلاح [#177](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/177) يحتاج `event=schedule` حقيقيًا على نسخة منشورة حديثة، مع `EVENT_CADENCE RUN` و`[LLM_INDEX] verified=true changed=false` أو تغيير فهرس `public/llms.txt` وPR/CI/نشر مثبت. لا يحتسب نجاح اختبارات PR أو GET وحدهما دليلًا على `schedule`. حتى قبوله تبقى المرحلة 1 مفتوحة والمرحلة 2 محظورة.

### 2026-11-20 15:51 KSA — W05 success and automatic PR CI race identified

- [x] **مؤكد/W05 schedule الفعلي:** [#44738293680](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44738293680)، `event=schedule`، `conclusion=success`، SHA `f0140cba6a1c5ac8f44603471c4b13038ae5df05`، بدأ 12:44 UTC / 15:44 KSA (nominal slot=04:10 UTC). سجّل `EVENT_CADENCE RUN`، ثم `[LLM_INDEX] verified=true changed=true sha256=890a0d359552849ecc2e76a4463421d20aed17f1b4426d70e7b5a6d8e97335ec services=18 languages=3`.
- [x] **مؤكد/W05 حفظ ونتيجة:** اجتاز الاختبارات المحلية والبناء، وأنشأ [PR #185](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/185) الذي دمج فقط `public/llms.txt` (+3 روابط منشورة: `/zh/`, `/zh/packages`, `/zh/services/company-formation`) في SHA `9fcb57853e62b38480166d37292ed7066451b219`. Render deploy `dep-dc041ogu01pc73bcusjg` LIVE في 12:46:53Z، وفحص الإنتاج [#44738435894](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44738435894) `workflow_dispatch` success على الإصدار الجديد. لا تخلط فحص الإنتاج المدفوع يدويًا مع دليل W05 الطبيعي `schedule`.
- [ ] **ثغرة CI مرتبطة بسرعة دمج PR #185:** 4 تشغيلات `event=pull_request` (#44738423840 و#44738423803 و#44738423719 و#44738423713) سجلت `failure` وبـ **0 jobs/check runs**، بينما دمج workflow البوت PR بعد ثوانٍ ودون انتظارها. السبب التقني الدقيق لفشل تخصيص المهام **غير مثبت**؛ سباق دمج/حذف الفرع سريعًا احتمال قوي وليس حقيقة جازمة. لا تُعتبر اختبارات البوت المحلية بدلًا عن CI المستقل.
- [ ] **الإصلاح قيد PR منفصل في المرحلة 1:** اشتراط فحوص PR الحقيقية (Build and regression tests + postgres-security + فحصَي verify منفصلين) قبل الدمج الآلي؛ فشل أو غياب فحص/انتهاء مهلة يترك PR مفتوحًا للتشخيص. يتضمن اختبارات محلية لحالات pending/failure/success، ولا يغيّر cron أو الحد 3 أو سياسة النشر أو DB. لا تعتمد بوابة خروج المرحلة كاملة قبل اجتياز CI ودمج الحارس وتوثيقه، رغم اجتياز W05 وظيفيًا.

### 2026-11-20 16:07 KSA — نقطة تفتيش إغلاق المرحلة الأولى (النمط أ)

- [x] **W01 GEO**: [event=schedule #44724904649](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44724904649) success على الإصدار المصحح؛ 4 فرص، 4 أهداف، 2 FAQ drafts، 1 editorial حفظ/تحديث بحسب السجلات؛ قراءة قاعدة البيانات أكدت إنشاء صفين جديدين لكل من الفرص والأهداف و2 FAQ و1 editorial ضمن النافذة، و6 سجلات مصدر W01 منها `quota_reached` مشروع دون نشر.
- [x] **W02 Market Radar**: [event=schedule #44720788156](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44720788156) success، مع `analysis_runs` radar/full المرتبطين بالدورة نفسها.
- [x] **W03 guarded publication**: [event=schedule #44641523397](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44641523397) success، نشر عنصرين وبيّنت `audit_logs` هوية W03 وروابط D06، مع `quota_reached` الثالث وفق الحد المشترك.
- [x] **W04 GSC**: [event=schedule #44643584048](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44643584048) success، بيانات 17 نوفمبر 4 أبعاد، `total` 3 impressions و0 clicks، وعدم مضاعفة العد عبر الأبعاد.
- [x] **W05 machine-readable index**: [event=schedule #44738293680](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44738293680) success، `verified=true changed=true`، [PR #185](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/185) حدّث فقط `public/llms.txt` بثلاثة روابط صينية، Render LIVE، وفحص الإنتاج success.
- [x] **W06 bounded maintenance**: [event=schedule #44718852351](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44718852351) success مع القرار الطبيعي `no_change`؛ لم تجرِ تغييرات شيفرة لا داعي لها.
- [x] **السلامة والاختبارات**: PR #179 سباق نشر حقيقي داخل PostgreSQL مع حد مشترك 3، PR #183 rollback/replay، عدم تكرار البصمات، تتبع W01/W03 الحقيقي. [PR #186](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/186) عالج عيب بوابة PR bot CI بعد #185: `7/7` فحوص خضراء قبل الدمج، ثم `main=fddb9978fac777e41e2c24ceab449a0bd214ae24`، Render `dep-dc04b959el5s73eq5930` **LIVE** 20 Nov 13:06:49Z، فحوص push (W05 audit `event=push`، Admin، Production GET) جميعها success. `event=push` ليس بديلًا عن دليل W05 schedule أعلاه. الحارس الجديد صُمم لترك PR مفتوحًا إن لم تنجح فحوصه؛ تحققنا من الحالات المصطنعة في اختبارات CI، لكن **لم تحدث بعد دورة إنشاء PR bot جديدة حقيقية لاختبار الانتظار من البداية للنهاية**.
- [x] **وسم ما قبل المرحلة**: `pre-phase1-20261119` على `c0ad3444fb04acd08d25e1ce11e6e7e6cf4217b1` موجود في GitHub؛ وسم البداية محفوظ.
- [ ] **قرار المالك معلّق**: الترحيل الأمني لا يطبّق دون الموافقة الصريحة؛ راجع ملاحظة صلاحية تنفيذ `rls_auto_enable()` أعلاه.
- [ ] **الانتقال للمرحلة 2 معلّق**: النمط المعتمد **أ** يوجب تقرير نقطة التفتيش وموافقة مالك المشروع بعد إغلاق المرحلة 1. لا تبدأ المرحلة 2 قبل ذلك حتى لو أصبحت الأدلة التشغيلية مكتملة.

**نتيجة نقطة التفتيش:** `PASS` لبوابة خروج المرحلة 1 التشغيلية وفق شرط W01–W06؛ مع فصل الاستثناء التاريخي PR #185 (فحوص PR لم تنفذ) عن الحارس المصحح في #186، وترك موافقة تنفيذ الأمن والمرحلة 2 معلقة.

## المرحلة 2 — شبكة الأمان

### 2026-11-20 18:45 KSA — حقيقة الإصدار وأدلة البوابات (دون جلسات إضافية)

- [x] **مؤكد — آخر إصدار:** #201 (أعلام إيقاف GitHub Actions من سياق vars) و#202 (دقة W03/GSC)، كلاهما مدمج مع 6/6 اختبارات، والفرع `main=b1db7e4021b6ea0d5d1e15fe0fa4d94a2176ff2d` مطابق Render LIVE؛ فحوص Admin وProduction GET على الإصدار نفسه ناجحة.
- [x] **مؤكد — استلام حدث حقيقي:** مراقب Stage-2 اشتغل بنمط `workflow_run` بعد W06 [#44765896904](https://github.com/Almaeedhi-Hani/free-LLM-api/actions/runs/44765896904) ونجح، لكن لا يثبت إنشاء تنبيه عند فشل حقيقي.
- [ ] **معلق — دورة المجدول الطبيعي:** أول Watchdog بعد لحظة الفحص `18:17 UTC` يوم 20 نوفمبر، والتقرير الأسبوعي الأحد 22 نوفمبر `06:00 UTC`، وفحص الجودة مجدول `02:23 UTC`؛ لا تختلق schedule أو weekly Issue قبل ظهوره. غياب عينات هذه التشغيلات يمنع الاعتماد النهائي.
- [ ] **معلق — إيقاف و80%:** Master Pause آمن عبر GitHub Variable ولا زر داخل الواجهة؛ [#199](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/199) عقد offline اختبارات 7/7 بلا ledger إنتاجي أو حدود حسابات مثبتة، ويتطلب موافقة مستقلة على schema/RLS وبيانات الحصص. وسم pre-phase2 لم يظهر؛ لا تدّعِ نجاحه.
- [ ] **معلق — المراحل 3/4/5:** #198 Draft 6/6 CI؛ #190 Draft 7/7؛ #195 Draft تابعة لـ#190. تأكيد المالك إنجاز 4 و5 يعني اكتمال التطوير في فروعهما، لا دمجًا/نشرًا لم يحدث. لا يبدأ دمج 3 قبل اكتمال البوابة 2، و4 ثم 5 بعد القبول.
- [ ] **السياسات المحمية:** لا تغيير `daily_limit=3`، أو high-risk/source policy أو CRON أو أدوات AI، لا schema/security migration إنتاجي بدون إذن منفصل. احتفظ بالمراجعة البشرية المؤهلة للمحتوى القانوني والمالي والاستثماري.

### 2026-11-20 — متابعة تنفيذ المرحلتين 2/3 بالتوازي المقيّد

- [x] **2.1–2.3 بنية المراقبة:** [PR #189](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/189) مدمج؛ GitHub `v3-phase2-safety-monitor.yml` يفحص فقط ستة workflows مجدولة، يعد تقارير أسبوعية ويحدّث Issues بلا تكرار، مع اختبارات اصطناعية لموعد التحول 22 نوفمبر. **لا تعنِ الاختبارات وحدها وصول Issue مجدول حقيقي**.
- [x] **2.5 حماية الإيقاف من المصدر:** [PR #194](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/194) مدمج؛ كل W01–W06 يحترم `vars.V3_MASTER_PAUSED='true'` مع الحفاظ على أعلام الإيقاف القديمة. لم يُفعّل العلم ولم يُختبر إيقاف إنتاجي حقيقي؛ تحكم مالك المشروع الآمن عبر متغير GitHub موجود، ولا زر UI بعد لتجنب توسيع GitHub PAT.
- [x] **2.4 فحوص الجودة الأساسية:** [PR #197](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/197) مدمج SHA `3c839d8e4d243ab825fd8b24bd70679d1a342eab`، 7/7 فحوص PR ناجحة؛ تنبيه يومي مجدول في `.github/workflows/v3-stage2-quality-watch.yml` يفحص 24 صفحة عامة وروابط insights الموجودة وEvals محليًا، بالاستناد إلى قائمة المنافسين من GEO API المحمي وfallback. لا تغيّر بيانات؛ محاكاة الفشل/تكرار Issue/نقص دليل الاسترجاع ناجحة، **انتظار أول schedule حقيقي**.
- [ ] **2.5 زر الواجهة** لم ينفذ لعدم توسيع أذونات GitHub من Render ولأن ملفات لوحة الإدارة مملوكة مؤقتًا للمحادثة الثانية (المراحل 4/5). البديل الآمن الحالي: GitHub Actions Repository Variable، ويتطلب قرار المالك إن كان رابط الإعدادات داخل اللوحة يكفي بدل تغيير مباشر.
- [ ] **2.6 حد 80% اليومي:** SELECT Supabase لم يجد جداول عدادات quota/provider usage ولا أحداث provider metering؛ [Draft PR #199](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/199) يجهز عقد الرياضيات/التكرار ومقترح حجز ذري، **لا يفعّل ولا يندمج كحارس** قبل تصريح المالك بترحيل إضافي وتوثيق حدود حساب كل مزود. حدود الطلبات لكل تشغيل ليست دليلًا على حدود اليوم.
- [ ] **بوابة خروج المرحلة 2 مفتوحة:** تحتاج إثبات Issue مراقبة وإبلاغ فشل آمن وتقرير أسبوعي حقيقي، إثبات صحة أول فحص جودة schedule، الربط الآمن للإيقاف/الاستئناف، وحساب يومي ذري بحسب خطة المرحلة. لا تدّعِ أن النظام جاهز كاملًا لمجرد نجاح CI.
- [ ] **المرحلة 3 قيد التحضير فقط:** [Draft PR #198](https://github.com/Almaeedhi-Hani/free-LLM-api/pull/198) يحتفظ بالبوابات الاستشارية الموجودة ويضيف معاينة Issue تقنية بحد يومي 3 ومراجعة قواعد feedback مشروطة بموافقة المالك واجتياز Evals. لا دمج قبل اجتياز 2 ولا تغيير سياسة النشر أو مراجعة المحتوى القانوني.



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
