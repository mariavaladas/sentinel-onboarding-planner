# K bug fixes — Gantt field-pack integration

**Date:** 2026-06-03T18:16:38+02:00
**Author:** K
**Status:** Implemented

---

## Summary

`gantt-planner.js` now imports and uses `js/modules/gantt-tasks.js` as the task-generation source for connectors that carry explicit `fieldPack` assignments, while connectors without `fieldPack` continue through the legacy per-solution planner path.

---

## Decisions

- Keep the existing Step 5 planner shell intact: kickoff/setup rows, legacy solution-group UX, collapse state, custom task persistence, and closeout tasks still come from `gantt-planner.js`.
- Inject the field-pack engine in two places only:
  1. shared infrastructure rows are materialized once from `buildGanttPlan()` Phase 1 tasks;
  2. per-connector tasks are transformed into `planner.setup_tasks` for each field-pack solution so the existing solution-group renderer keeps working.
- Treat explicit `solution.fieldPack` as authoritative in `inferFieldPack()`, with heuristics retained strictly as fallback for connectors that still lack the new metadata.
- Keep `microsoft-sysmon-for-linux` aligned with the Linux/syslog path in the task engine, matching topology's Linux classification while preserving `solutions.json` as `syslog-cef`.

---

## Impact

- The previously dead `gantt-tasks.js` engine is now exercised by the planner.
- Shared infra chains now render before generated connector tasks without breaking legacy solution planning.
- The CEF dependency chain, Sysmon classification, and WFE abbreviation collision are corrected in the engine source of truth.
