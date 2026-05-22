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



## 2026-05-22T11:05 — K's Table UX Fixes
- Agent K completed table numbering reform (flat sequential with nested subtasks)
- Inline editing enabled for all task fields
- Cascade updates implemented for timing changes
- Frontend: js/gantt-planner.js, css/style.css modified
- Status: Ready for QA

---

## 2026-05-22T16:20:26Z — Luv-2 Completion Summary

**Agent Luv-2** completed Windows connector research across 4 families:

**Research deliverable:**
- `.squad/agents/luv/connector-research-windows-family.md` — Complete breakdown of:
  1. **Forwarded Events** (CEF via AMA)
  2. **Windows Firewall** (Advanced Security events via AMA)
  3. **DNS Query Events** (via AMA + DCR)
  4. **Sysmon** (via AMA + custom DCR)

**Content per connector:**
- Setup complexity assessment
- RBAC and permissions requirements
- Infrastructure prerequisites
- AMA/DCR configuration patterns
- Schema and event data details

**Impact:** Research provides data foundation for Sebastian's Windows connector integration task (K-20 upcoming). All connector requirements and setup steps documented for downstream planning.
