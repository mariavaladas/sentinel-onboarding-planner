# History — K

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Frappe Gantt, ExcelJS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Current Session (2026-05-25)

### 2026-05-25T08:59:01Z — Expand/collapse toggle hardening
- Hardened Gantt expand/collapse activation with shared primary-activation helper responding to click and mouseup
- Made solution-group names clickable toggle targets; widened chevron hit area
- Validation: Node syntax ✓; Headless browser test showed 6→19 row expansion ✓
- Files: js/gantt-planner.js, css/style.css
- Status: COMPLETE

### 2026-05-25T10:11:24Z — Critical QA fixes: Inline select and status persistence
- **Inline select editor bug (BUG-01/02/03):** change event now authoritative, blur dismissal-only. Duration popup saves on outside-click.
- **Manual status persistence:** User status picks (including Planned) now stick as explicit overrides. Contextual collapse defaults: 1–2 solutions expanded, 3+ collapsed.
- Validation: Headless browser test with Windows Security Events verified status changes and collapse behavior
- Files: js/gantt-planner.js
- Status: COMPLETE

## Key Patterns (Active)

- **Persistence:** Override records in localStorage keep task changes, status, and collapse state
- **Rendering:** Frappe Gantt bars rebuilt post-render with phase/status colors applied
- **Editing:** Inline duration/dates/status in grid; full details in side panel
- **Business days:** Task scheduling respects working days only (no weekend gaps)
- **Numbering:** Hierarchical (solution groups consume global counter; setup tasks use dot notation)

## Architecture Decisions

- Versioned localStorage payload (sentinelPlanner.taskDurationOverrides.v1) stores { overrides, customTasks, solutionGroups, taskOrders }
- Solution groups modeled as top-level Gantt rows inside the planner pipeline
- Detail drawer (right-side panel) shows task metadata; row selection opens/closes it
- Toolbar \+ Add task\ falls back to last solution group when no row selected
- Color semantics: Planned = muted slate (phase palette), In Progress = teal, Completed = green, In Review = amber

## Recent Learnings (Last 3 Days)

1. **Inline editor semantics (2026-05-25)** — Native <select> must commit on change event only; blur should dismiss without overwriting
2. **Contextual collapse (2026-05-25)** — Small plans (1–2 solutions) should open expanded; larger plans (3+) start collapsed to reduce visual noise
3. **Detail panel interaction (2026-05-25)** — Separate row selection (opens drawer) from inline edits (grid cells); both coexist in capture phase
4. **Hierarchical numbering (2026-05-25)** — Solution groups consume shared global counter; child setup tasks use relative dot notation; closeout tasks resume after last group

## Next Priority

- Mobile planner fallback (compact list + PDF export)
- Keyboard shortcuts for navigation
- Dynamic category grouping in split-pane view

## Learnings

### 2026-05-25T12:43:02.353+02:00 — Connector capacity inputs
- Stored connector sizing in the existing `sentinelPlanner.taskDurationOverrides.v1` planner payload under `solutionGroups`, with one shared Windows sizing record and per-firewall EPS entries.
- Step 3 capacity UX now lives in `js/modules/solutions.js` with shared sizing math in `js/modules/capacity.js`; Step 5 Gantt badges and side-panel edits live in `js/gantt-planner.js`.
- Manual Gantt task overrides remain intact when sizing changes because connector rows rebuild from the same override-backed plan pipeline instead of resetting task edits.
- Removed the old Step 2 server split prompt from `index.html` and `js/app.js` so sizing is captured only where connector context exists.

---

**See:** history-archive.md for earlier sessions and learnings (2026-05-18 through 2026-05-22).


### 2026-05-25T12:43:02Z — Connector Capacity Inputs Implementation — COMPLETE
- Implemented capacity data store in existing sentinelPlanner.taskDurationOverrides.v1 (no new state added)
- Shared Windows sizing for AMA connectors (Security Events, WEF, DNS, Sysmon) keyed under solutionGroups
- Per-solution EPS sizing entries for firewall/CEF connectors (each site gets separate input)
- Step 3 solution card capacity forms with reactive VM estimation
- Step 5 Gantt detail panel Sizing tab for editing capacity (propagates reactive updates)
- Removed legacy Step 2 server-split prompt to eliminate duplicate inputs
- Validation: non-numeric (red border), 0 servers (warning), >100k EPS (advisory), negatives (clamped), decimals (rounded up)
- Mobile responsive: forms stack vertically <640px; detail panel becomes bottom sheet
- Files: js/modules/capacity.js (new), js/modules/solutions.js, js/gantt-planner.js, css/style.css
- Status: COMPLETE; awaiting Sebastian data model updates (capacity_type, sizing_defaults fields)
