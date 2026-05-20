# Deckard — product roadmap proposal for onboarding accelerator

- **Date:** 2026-05-20T11:40:21.320+02:00
- **By:** Deckard (Lead)
- **Status:** Proposed for merge

## Recommendation

The planner should evolve into a **Sentinel onboarding accelerator** while staying within the approved scope of **planner, not deployer**.

If the team only ships three additional features beyond current work, the recommended order is:

1. **Onboarding Readiness Advisor**
2. **EPS + Cost Assessment**
3. **Validation & Cutover Pack**

## Why these three

### 1) Onboarding Readiness Advisor
This solves the earliest and most common blocker: customers do not know whether to use direct AMA, WEF/WEC, Syslog forwarder, or Azure Monitor Pipeline, and they usually discover permission dependencies too late.

### 2) EPS + Cost Assessment
This addresses the most important architecture objection in enterprise onboarding: sizing, forwarder count, burst handling, and ingestion cost uncertainty.

### 3) Validation & Cutover Pack
This closes the trust gap between “connector enabled” and “connector operational.” It gives customers concrete KQL checks, expected tables, and sign-off criteria.

## Product principle

The near-term product should remain **static-first and evidence-driven**:

- prefer local metadata, rules, import/export, and downloadable artifacts,
- avoid live Azure dependencies in MVP,
- allow optional future Azure-aware modes only after separate security and architecture review.

## Codebase implications

- Add new modules for readiness guidance, EPS/cost modeling, and validation artifact generation.
- Extend `data/solutions.json` with collection-pattern hints, stronger prerequisite metadata, and validation query metadata.
- Expand Excel export to include readiness, sizing/cost, and validation sheets.

## Bottom line

These three features create a coherent journey:

- **pick the right path,**
- **size it safely,**
- **prove it works.**

That is the highest-impact way to help Sentinel customers onboard better without turning the product into an automation platform.
