# History — K

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Frappe Gantt, ExcelJS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Recent Focus (2026-05-21)

### 2026-05-21T14:07:44.312+02:00 — Editable task durations with persisted overrides
- Duration editing in Step 5 detail panel; localStorage persistence keyed by row ID
- Summary rows read-only; child edits recalculate parent spans
- Normalized hours/days/weeks via business-hour conversions; dependency-driven downstream tasks shift coherently
- **Files:** `js/gantt-planner.js` (storage, recalculation, editor, indicators), `css/style.css` (badges, styling)

### 2026-05-21T13:25:43.387+02:00 — Gantt subtask hierarchy rendering
- Flattened `planner.setup_tasks[].subtasks[]` into Frappe Gantt task array as parent summary bars + subtasks
- Collapse/expand via filtered re-render from `buildGanttPlanData()` (not internal mutation)
- Subtasks: indented labels, lighter phase fills, reduced bar height for dark-theme readability
- **Files:** `js/gantt-planner.js` (hierarchy, scheduling, collapse), `css/style.css` (bar styling)

### 2026-05-21T12:00:42.157+02:00 — ExcelJS Gantt export & dark-mode refresh
- Replaced planner export with ExcelJS single-sheet timeline (visual Gantt, not flat list)
- Freezes A:F (metadata), renders timeline columns G+ with daily→weekly auto-switch for 6+ month plans
- Gantt dark-mode: CSS overrides for `.grid-header`, `.current-highlight`, `.popup-wrapper` against Frappe defaults
- **Files:** `js/modules/export.js` (workbook generation), `js/gantt-planner.js` (state capture), `css/style.css` (theme)

### 2026-05-21T14:01:17.964+02:00 — Split-pane Gantt task grid
- Left task grid + right Frappe Gantt timeline from same visible row set
- Rows aligned via SVG `.grid-row` metrics (not hardcoded height) for accurate sync
- Table controller syncs scroll, hover, active state with chart `.gantt-container` + `.bar-wrapper`
- **Files:** `js/gantt-planner.js` (split-pane shell, table, alignment), `css/style.css` (layout, sticky header)

## Prior Learnings
- Gantt render recovery (single phase token for Frappe v1.2.2 classList.add behavior)
- Wizard button affordance fix (native buttons + shared `.app-button` classes)
- Real Planner View (planning.js card + stats + sort/filter)
- Step 3 solution card reference refresh (featured tag, checkbox, v1 visual language)
- *See: `history-archive.md` for full log (archived 2026-05-21)*

## Cross-Agent Context
- **Deckard:** Approved planning.js (state invalidation doc, SheetJS pin, scoring.js stub, no React Flow)
- **Luv:** Rejected solutions.json; sebastian-2 fixed data (removed test-solution, added is_connector/category, marked deprecated)
- **Sebastian:** Full catalog expansion, connector docs, RBAC model, task hierarchy
