# History — Luv

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

(Session learnings will be appended here)

- **2026-05-21T14:28:20.714+02:00 — solutions.json audit learnings**
  - Audited **485** catalog records across `azure` (18), `microsoft_365_security` (20), and `third_party` (447).
  - Found a schema-wide blocker: **all 485 records are missing the required per-record `category` field**.
  - Found **157 zero-connector entries** mixed into a supposed connector catalog, including obvious non-connector content (`kql-training`, `soc-handbook`, `watchlists-utilities`) and a placeholder record (`test-solution`).
  - Found deprecated/superseded content still present, including `forescout-legacy`, `threat-intelligence`, `azure-devops-auditing`, and AMA migration edge cases like `common-event-format`, `linux-syslog`, and `windows-security-events`.
  - Pattern noticed: taxonomy is overloaded — `third_party` includes Microsoft/generic platform solutions such as `teams`, `common-event-format`, `linux-syslog`, and `windows-security-events`.
  - RBAC labels looked valid, but several M365-dependent entries still have empty `m365_roles`, so permissions metadata is incomplete even when role names are real.
- **2026-05-21T17:00:59.261+02:00 — planner QA pass 2 learnings**
  - `data/solutions.json` now validates cleanly for this scope: **484** records, no duplicate IDs, `test-solution` removed, `is_connector` and `category` present everywhere, and RBAC fingerprints match the sorted Azure+M365 role sets with `null` reserved for empty role lists.
  - `windows-security-events` now exposes **6** flat planner tasks totaling **6.0h**, which the current Gantt builder consumes directly as six Phase 1 rows.
  - `js/gantt-planner.js` syntax parses successfully and the split-pane/full-width plumbing is present, but the planner still does **not** read `is_connector` or `permissions.fingerprint`, so non-connectors can still be planned and RBAC deduplication is not implemented.
  - Critical schedule bug: a persisted entry that changes only `startWeek` is later interpreted as a **0.5h duration override**, shrinking the task and downstream plan unexpectedly.
  - Latent rollup bug: summary rows with child tasks anchor to the **first** child start instead of the earliest child start when custom child schedules reorder the work.

## Scribe Update (2026-05-21 14:25:39 UTC)
- Decisions merged: 30 items from inbox
- Session log created

