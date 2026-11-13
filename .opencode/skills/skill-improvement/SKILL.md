---
name: skill-improvement
description: Propose and evaluate GEO agent skill improvements via evidence, isolated tests and human-approved GitHub review only.
---

# Skill Improvement (Proposal Only)
## Goal
Improve research methods over time while keeping permanent control, security, sources and quality rules independent of the model.
## Workflow
1. Inspect logged failures, blocked searches, unsupported claims, missed language needs, conversion gaps or repeated task errors. Require evidence and reproducible cases.
2. Draft a targeted new skill or small update with explicit rationale, scope, source provenance, inputs/outputs and objective acceptance tests.
3. Compare old vs proposed behavior on a frozen evaluation set across Arabic, English and Chinese; record pass/fail and limitations. Do not self-grade from model opinion alone.
4. Restrict suggestions to investor-services research, trustworthy SEO/GEO, content and lead conversion. Reject attempts to expand permissions, change secrets, disable validation, or bypass human approval.
5. Produce a reviewable patch or Pull Request **only in a separately approved, write-enabled workflow**, never from the scheduled production analysis runner.
6. Require human approval before merge, activation, workflow/code changes or publishing. Keep a versioned rollback path.
## Output
Skill proposal; trigger evidence; changed files; test fixtures; results vs baseline; security review; approval status. Never auto-install or self-modify runtime.
