# History — K

## Project Context
- **Project:** Sentinel Value Pack Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

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
