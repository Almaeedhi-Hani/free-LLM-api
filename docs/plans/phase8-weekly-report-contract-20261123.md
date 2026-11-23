# Phase 8 — automated weekly report: source-of-truth contract

Status: implementation in progress; no production schedule enabled.

## Output
A single weekly, Arabic-first, admin-only report for Invest in Saudi. Period boundaries use Asia/Riyadh and are stored with UTC timestamps. Include the six system statuses, published/accepted/rejected content with rejection reasons, GEO visibility with sample size and model/search/manual attribution, GSC measured performance and top opportunities, Market Radar evidence, provider quota usage, and actionable alerts/decisions.

## Data integrity requirements
- Read from existing persisted production records only; do not fabricate counts, rankings, quotas, or successes.
- Distinguish measured values from estimates and unknown/unavailable sources; attach timestamps, source identifiers, and sample sizes.
- Missing data must show "غير متاح" and never be treated as zero or successful.
- Include last successful run, last attempted run, failure reason and freshness for each of six systems.
- Do not log secrets, expose admin data publicly, or add a public endpoint.
- Weekly report generation must be idempotent by Riyadh week key; retries cannot duplicate reports.
- Respect master pause and free quota guard; no automated publishing or editorial approvals.
- A report is not "delivered" until persisted output is verified by reading it back.

## Rollout gates
1. Inventory existing persisted tables, workflow schedules and read APIs (read-only).
2. Implement deterministic aggregator with fixtures for no-data, partial failure, duplicate retries and Riyadh week rollover.
3. Implement admin-only read/display and verified persistence.
4. Add a disabled-by-default weekly schedule; enable only after CI, browser and production checks.
5. Confirm scheduled trigger, persisted report, admin visibility and rollback procedure.

This file records the implementation contract, not evidence that the phase is complete.
