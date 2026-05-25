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

### 2026-05-25T13:12:43.036+02:00 — Step 3 sizing drawer pattern
- Replaced inline Step 3 sizing expansion with a persistent right-side drawer in `index.html`, `css/style.css`, and `js/modules/solutions.js`; cards now stay compact and only surface a one-line summary.
- Reused the existing dark detail-drawer visual language from the Gantt planner, but adapted it into a non-blocking Step 3 workspace layout so users can keep clicking connector cards while the panel stays open.
- Shared Windows sizing now opens from any Windows-family connector card and clearly states that edits apply across the shared Windows group.
- User preference captured: Step 3 sizing must avoid cramped inline forms and excessive scrolling; on mobile (`<768px`) the drawer shifts to a bottom-sheet overlay instead of a desktop side panel.
- Key file paths: `index.html` (drawer host), `css/style.css` (workspace + drawer responsive styling), `js/modules/solutions.js` (drawer state, card summaries, sizing editor rendering).

### 2026-05-25T13:26:20.812+02:00 — Gantt columns + detail drawer restoration
- Restored the Step 5 task detail drawer in `js/gantt-planner.js` with editable panel fields for name, description, status, assigned owner, dependencies, and the existing duration editor; row clicks still ignore inline grid controls.
- Added Excel-like column resizing to the Gantt table by driving column widths from session-scoped state (`sentinelPlanner.ganttTableColumnWidths.session.v1`) so widths survive re-renders without persisting beyond the browser session.
- Dependency edits now update the visible dependency list and Gantt arrow relationships; when a task does not have a direct start override, dependency changes can also shift the derived start week inside the current plan session.
- User preference captured: the Name column should start comfortably wide (320px minimum flow, 200px floor) and drawer interactions should reuse the dark desktop panel / mobile bottom-sheet pattern already established elsewhere in the planner.
- Key file paths: `js/gantt-planner.js` (column widths, dependency overrides, detail drawer editing), `css/style.css` (resize handles, drawer form styling, mobile bottom-sheet behavior).

### 2026-05-25T14:37:09.027+02:00 — Gantt scroll stabilization
- Normalized both Gantt resizers in `js/gantt-planner.js` to pointer-captured drag sessions so resize listeners exist only during an active drag and always clean up on pointerup, pointercancel, lost capture, or window blur.
- Reinforced the planner scroll surfaces in `css/style.css` with `min-height: 0` on split-pane containers and explicit `touch-action: pan-x pan-y` on the table/chart scrollers, while keeping `touch-action: none` only on the resize affordances.
- User preference captured: planner scrolling must stay fully native for mouse wheel and trackpad gestures even after adding drawers and resizable columns.
- Key file paths: `js/gantt-planner.js`, `css/style.css`, `.squad/decisions/inbox/k-scroll-fix.md`.

### 2026-05-25T14:38:50.012+02:00 — Planner table + gantt tab split
- Step 5 now uses a shared-state tabbed workspace in `js/gantt-planner.js`: `📋 Table` owns spreadsheet editing, dependencies, and per-group add-task rows; `📊 Gantt` owns the timeline, zoom controls, auto-fit, and the compact left task list.
- User preference captured: planner UX should follow a Monday.com-style split where table editing and timeline navigation never fight over the same scroll container.
- Shared detail drawer, collapse state, and schedule overrides now re-render both views from the same plan model, while the active tab is remembered in session storage.
- Key file paths: `index.html` (shared planner toolbar), `css/style.css` (tab strip, table shell, gantt sidebar), `js/gantt-planner.js` (shared planner controller + tab state), `.squad/decisions/inbox/k-tab-split.md`.

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

---

### 2026-05-25T13:26:20.812+02:00: K-8 Session Complete

**Task:** Add resizable Gantt columns + restore task detail side panel
**Status:** SUCCESS
**Scope:** js/gantt-planner.js, css/style.css

**What:**
- Implemented Excel-style resizable Gantt table columns with session-scoped width persistence
- Restored Step 5 detail drawer with editable task fields (name, description, status, owner, dependencies)
- Reused existing overlay drawer pattern for visual consistency
- Column widths survive re-renders during session but reset on page reload (no localStorage)

**Why:**
- Column resizing improves usability for task visibility in crowded plans
- Detail drawer restores task-detail workflow previously removed
- Session-only persistence matches user request for workflow convenience without long-term preferences

**Decisions Logged:**
- k-gantt-columns-panel.md — Column resizing + drawer architecture
- k-sizing-panel.md — Connector sizing UX refactor to drawer
- luv-capacity-qa.md — QA reject on capacity inputs (classification + numeric handling gaps)

**Next:**
- Address Luv's QA findings in capacity inputs
- Coordinate with Luv on firewall sizing per-instance model

---

### 2026-05-25T14:38:50.012+02:00: K-9 & K-10 Session Complete

**Task:** Fix Gantt scroll glitch + implement Table/Gantt tab split  
**Status:** SUCCESS  
**Scope:** js/gantt-planner.js, css/style.css, index.html  

**K-9 Scroll Fix:**
- Constrained column-resize and split-pane divider to pointer-captured drag sessions
- Listeners exist only during active drag; clean up on pointerup, pointercancel, lost capture, or window blur
- Preserved native scrolling with `touch-action: pan-x pan-y` on scroll containers
- Fixed scroll conflicts that emerged after drawer and resize handler additions

**K-10 Tab Split:**
- Separated planner into two tabs following Monday.com pattern
- `📋 Table` tab: spreadsheet editing, resizable columns, per-group add-task rows
- `📊 Gantt` tab: timeline visualization, zoom, auto-fit, compact task list
- Shared state: detail drawer, collapse state, schedule overrides
- Session-aware tab persistence (remembers user's last active tab)

**Why:**
- Scroll fixes eliminate interaction conflicts and restore native platform feel
- Tab split improves UX by separating editing workflow from schedule analysis
- Both tabs can scroll independently without triggering false state mutations

**Decisions Logged:**
- k-scroll-fix.md — Pointer-captured resize handlers
- k-tab-split.md — Table/Gantt tab architecture
- copilot-directive-tab-split.md — User directive (Monday.com pattern reference)

**Decisions Archived:**
- k-gantt-empty-fix.md (2025-07-14) — moved to decisions-archive.md by Scribe

**Files Modified:**
- index.html: added tab container and navigation
- css/style.css: tab strip styling, resize handle refinements, scroll container fixes
- js/gantt-planner.js: tab state controller, pointer handler updates, scroll context per tab

**Outcome:**
- Both fixes deployed and decision registry updated
- Inbox decisions (3 files) merged and archived
- Ready for next iteration
