# Luv test findings — Exhaustive QA pass: gantt-tasks.js, topology, solutions, cross-module

- **Date:** 2026-06-03
- **Status:** REJECT
- **Scope:** All modules — topology visualization, connector persistence, `gantt-tasks.js` engine, solutions data, app structure, cross-module integration
- **Primary report:** `docs/testing-report-2026-06-03.md`

## Critical findings

### B-001 🔴 — `gantt-tasks.js` is completely unimported; the entire new Gantt engine is dead code

`gantt-tasks.js` exports `buildGanttPlan`, `calculatePlanDuration`, and all task catalogs but **zero other files in the project import it**. `gantt-planner.js` imports only from `capacity.js` and `scoring.js`. `app.js` only imports `initGanttPlanner`. No integration path exists.

**Impact:** The new Gantt task engine (TASK_CATALOG, field packs, critical path, duration calculation) has never run in production. The app still uses `gantt-planner.js` exclusively, which does not know about the new task infrastructure.

**Required action:** K needs to wire `gantt-tasks.js` exports into `gantt-planner.js` where plans are built and rendered.

## High-priority findings

- **B-002:** `CEF-INFRA-05.dependsOn` references `CEF-INFRA-03` instead of `CEF-INFRA-04`, making tasks 04 and 05 run in parallel. Fix: change `dependsOn` to `['CEF-INFRA-04']` in gantt-tasks.js TASK_CATALOG.
- **B-003:** `microsoft-sysmon-for-linux` has conflicting classification in all three data sources (topology: linux_server, gantt-tasks: WINDOWS_AMA, solutions.json fieldPack: syslog-cef). Needs a single authoritative classification.
- **I-001 (Security):** React, ReactDOM, and ReactFlow CDN scripts in `index.html` lines 7–10 are missing SRI `integrity=` hashes. frappe-gantt and exceljs already have SRI. Violates decisions.md policy. Fix: add sha384 integrity hashes for all 4 unpkg.com resources.

## Medium-priority findings

- **B-004:** `WFE` abbreviation collision in `KNOWN_ABBREVS` — two distinct connectors map to the same abbreviation, causing non-deterministic renaming to `WFE-2`.
- **I-002:** `inferFieldPack()` ignores the explicit `fieldPack` field in solutions.json. 43 solutions have this field defined; it is never read.
- **I-003:** `sentinelPlanner.taskDurationOverrides.v1` is not in `PLANNER_STORAGE_KEYS`, so duration overrides survive "Reset saved progress".
- **I-004:** Connected solutions persist to localStorage (same issue as 2026-06-02 session; still not fixed). Intent was session-only.
- **I-005:** `inferFieldPack()` fallback assigns `syslog-cef` (Linux forwarder infra) to API/cloud connectors that have no on-premises infrastructure requirement.
- **I-006:** No Content Security Policy in `index.html`.

## Reassignment

- **K:** B-001 (wire gantt-tasks.js), B-002 (CEF-INFRA-05 dep), B-003 (sysmon classification), B-004 (WFE collision), I-001 (SRI hashes), I-002 (inferFieldPack read fieldPack first), I-003 (add duration key to PLANNER_STORAGE_KEYS reset), I-005 (api connector fallback).
- **Sebastian (if needed):** I-004 (connected solutions persistence — requires spec call: is this intentional or session-only?), B-003 data side (update solutions.json fieldPack for microsoft-sysmon-for-linux).

## QA call

Do not accept the `gantt-tasks.js` engine integration as complete until B-001 is fixed and verified with a live build. Do not ship the current security posture until I-001 (missing SRI) is addressed.
