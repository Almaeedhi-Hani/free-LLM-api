# Market-Aware GEO Intelligence Agent — Specification

Version: 1.0
Status: Approved for phased implementation
Project: Saudi company formation & foreign investment services
Current stack: Next.js + Supabase + Render + GitHub + Admin Dashboard

(See full specification in conversation. This file is a placeholder; full text to be merged.)

## Core principles
1. Operational autonomy with human oversight for sensitive changes.
2. Original content; no copying competitors.
3. Accurate, direct answers backed by official sources.
4. SEO/GEO optimization with measurable evidence.
5. Quality over quantity.
6. Versioning & rollback for every change.
7. No fabricated metrics.
8. Respect access limits, ToS, and cost.

## Phases
1. Foundation & Memory (DB schema, versioning, audit, rollback)
2. Market & Competitor Intelligence (discovery, profiles, gaps, goals)
3. Autonomous Intelligent Production (knowledge base, page creation, answer lab, guarded publishing)
4. Analytics & Optimization (visits, WhatsApp clicks, GEO lab, prioritization)

## Required entities (design only, subject to review)
competitors, competitor_observations, keywords, opportunities, agent_goals,
knowledge_sources, verified_claims, site_pages, page_versions, agent_jobs,
agent_runs, answer_tests, analytics_events, approval_requests, audit_logs

## System principles (fixed)
1. No information without a source.
2. No high-risk publish without review.
3. No change without a measurable reason.

## Acceptance
Agent must run on schedule, discover competitors/opportunities, create indexable pages,
update pages without losing versions, verify sensitive info, auto-publish low-risk changes,
show diffs/approvals/rollback, measure visits & WhatsApp clicks, and persist across restarts.