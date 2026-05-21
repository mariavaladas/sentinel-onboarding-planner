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

## Scribe Update (2026-05-21 14:25:39 UTC)
- Decisions merged: 30 items from inbox
- Session log created

