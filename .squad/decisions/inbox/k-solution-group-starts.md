# K — Collapsible solution groups with persisted start offsets

- **Date:** 2026-05-22T17:22:50.5966240+02:00
- **Scope:** `js/gantt-planner.js`, `css/style.css`

## Decision
Model each selected solution as a top-level Gantt "solution group" row inside the existing Step 5 planner pipeline instead of adding a separate grouping layer or new browser store.

- Persist group UI state in the existing `sentinelPlanner.taskDurationOverrides.v1` payload under `solutionGroups`.
- Keep solution groups collapsed by default; only persist `collapsed: false` when a user expands a group.
- Make the solution-group row the only place where a connector-wide start date is edited; child task start overrides remain relative to that group offset.
- Reserve row/bar clicks for selection and toolbar enablement, while chevrons and Gantt labels handle collapse/expand toggles.

## Why
- The planner already rebuilds table rows, Gantt bars, mobile list, and export output from one normalized row model, so grouping belongs in that same pipeline.
- Storing group offsets beside task overrides keeps reset, reload, and derived scheduling behavior deterministic.
- Separating toggle affordances from selection fixes the disabled `+ Add task` flow on solution summary rows without losing collapse controls.

## Notes
- Timeline controls now use a Weeks / Months / Quarters dropdown.
- Custom timeline headers are rebuilt per zoom mode so labels stay readable without forking Frappe Gantt.
