# History — K

## Project Context
- **Project:** Sentinel Value Pack Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

### 2026-05-20T11:37:31.376+02:00 — Gantt planner view and Excel export

**Architecture decisions:**
- Added a dedicated `js/gantt-planner.js` module to own all Gantt-specific data shaping and rendering, while keeping `js/modules/planning.js` as the reusable task-card view.
- Kept Step 4 as a combined planner surface: existing summary/result cards remain, and `#plannerView` now hosts tabs for the new Gantt chart and the existing task-card planner.
- Reused the same transformation source for both the chart and Excel export by having `js/modules/export.js` consume `buildGanttPlanData()`.

**Patterns used:**
- Phase scheduling is deterministic: fixed overhead tasks first, then phase waves, then category lanes run in parallel while same-category tasks stay sequential.
- Owner and resource type are derived from `permissions.privilege_level`; task duration is derived from `onboarding.difficulty`; phase assignment prefers `export_metadata.phased_deployment`.
- All new planner UI is built with safe DOM APIs (`createElement`, `textContent`) and dark-theme CSS overrides for third-party components.

**User preferences:**
- Maria wants the planner output to mirror the DEX project-plan spreadsheet structure, not just show connector cards.
- The planner must stay static-site friendly: CDN libraries only, no build step, responsive fallback list on smaller screens.

**Key file paths:**
- `index.html` — pinned CDN dependencies and updated planner copy.
- `js/gantt-planner.js` — Gantt task generation, chart rendering, detail panel, and planner tabs.
- `js/modules/export.js` — Excel workbook generation using the shared Gantt plan rows.
- `css/style.css` — Gantt dark-theme overrides, responsive list view, and planner tab styling.

### 2026-05-19 — Real Planner View (planning.js full replacement)

**What was built:**
- Replaced the planner stub entirely with a production-quality planner view in `js/modules/planning.js`.
- **Summary stats bar** — total solutions, total effort hours, and per-phase counts rendered using the existing `.stat-card` pattern.
- **Filter/sort controls** — sort dropdown (Priority Score default, Effort low→high, Phase) and phase filter buttons (All / Phase 1 / Phase 2 / Phase 3). Both are stateful and refresh the cards grid without re-rendering the full view.
- **Task cards** — one per selected solution, collapsible. Header shows solution name, colour-coded phase badge (green/yellow/purple), priority score badge, and effort badge. Expanding reveals: description, setup tasks (ordered list with per-task hours), dependencies from `value_scoring.dependencies`, and common issues from `planner.common_issues`.
- **Empty state** — shown when `solutions.length === 0` (user hasn't selected anything).
- **Empty cards state** — shown when phase filter yields no results.
- CSS appended to `style.css`: `.planner-summary-bar`, `.planner-controls`, `.planner-filter-btn`, `.planner-badge`, `.planner-task-card`, `.planner-task-card-body` (collapsible via `max-height` transition), responsive overrides.

**Patterns used:**
- `document.createElement` + `textContent` throughout — no `innerHTML` with solution data (satisfies Rachael's security audit decision).
- Shared mutable `state` object `{ sort, filter }` passed by reference to filter/sort handlers for clean re-render without full view teardown.
- `max-height: 0 → 2000px` CSS transition for smooth collapse/expand on task cards.
- Phase badge colours applied via inline `style.cssText` (not new CSS vars) to keep one source of truth for the three phase colours.
- Responsive grid: `repeat(auto-fill, minmax(320px, 1fr))` as specified by Deckard's architecture.

**Key decisions made:**
- Removed `renderTimeline` export (stub-specific, no longer needed). `calculateTotalEffort` retained as public export for use by `export.js`.
- `value_scoring.dependencies` used as the dependency source (actual JSON field). `planner.setup_tasks[].depends_on` not present in current data schema — used `task.task` string instead.
- Summary stats bar reuses existing `.stat-card` / `.stat-number` / `.stat-label` classes instead of introducing a new pattern.
- State invalidation documented as comment block at top of file per Deckard's architecture requirement.

## 2026-05-18 Scribe Update
- Inbox decisions merged into decisions.md
- All agent outcomes consolidated and cross-referenced
- Decisions are now canonical; inbox cleared
- See: decisions.md entries for 2026-05-18 (v2 Data Model, v1 Security, Architecture Gap)

## 2026-05-19 Scribe Cross-Agent Update
- **Deckard Review Complete:** Approved planning.js with 4 conditions (state invalidation doc, SheetJS pin, scoring.js stub, no React Flow).
- **All conditions verified satisfied in K's implementation.**
- **Next:** K proceeds with export.js (SheetJS Excel export); Deckard defines scoring weights; Luv removes test stubs referencing `renderTimeline`.
