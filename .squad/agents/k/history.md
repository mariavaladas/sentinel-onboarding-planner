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

### 2026-05-21T16:23:07.324+02:00 — Start week editing for the planner

**Architecture decisions:**
- Extended the existing Step 5 schedule editor so each editable task now stores both a proposed start week and a duration in one persisted override record.
- Switched the planner’s default proposal from parallel category lanes to a single sequential flow inside each phase, which better matches the DEX project-plan template while still allowing manual overlap when a customer pins a custom start week.

**Patterns used:**
- Default start weeks are recalculated from task order and dependency end dates, then rounded up to the next whole project week before Frappe Gantt dates are derived.
- Downstream rows only auto-shift when their own start week is still default; once a row has a direct start-week override, later upstream changes no longer move it.

**User preferences:**
- madesous wants the planner to propose a sensible schedule first, then let customers tune both when work starts and how long it lasts without fighting the chart.

**Key file paths:**
- `js/gantt-planner.js` — merged start-week overrides with duration overrides, updated default scheduling, detail-panel editing, task-table start column, and Gantt date shaping.
- `css/style.css` — widened the split-pane grid for the new Start column and updated the schedule editor control layout.
- `README.md` — Step 5 summary now reflects editable start weeks as well as durations.

## Cross-Agent Context (2026-05-21)

### Sebastian — RBAC Fingerprints and Windows Security Events Task Split COMPLETE
Sebastian added RBAC `permissions.fingerprint` to all 484 connectors and flattened Windows Security Events into 6 concrete AMA onboarding tasks. The changes:
- Fingerprint key: alphabetically sorted combined `azure_roles` and `m365_roles`, joined with `|`
- Empty role sets emit `fingerprint: null` for planner deduplication skipping
- Windows Security Events tasks now expose real AMA + DCR onboarding steps instead of summary rollups
- All 484 connector permission blocks now have deterministic fingerprints for client-side deduplication

**Impact on this session:** The sequential Start Week flow and localStorage persistence patterns now enable the planner UI to automatically detect and hide shared RBAC subtasks marked `status: "shared"`. Sebastian's flattened task structure integrates seamlessly with K's Gantt rendering.

## Learnings

### 2026-05-21T18:19:29.109+02:00 — Gantt reference-layout refresh
- **Architecture decisions:** Step 5 keeps the dark-shell experience, but the Gantt itself now behaves like a project-management grid with a numbered left table, fixed status/date/impact columns, a day-based timeline header (`W xx` + weekday initials), and a keyboard-accessible resizable split pane.
- **Patterns used:** Derive display-only planner fields after scheduling (`status`, `impact`, `startDate`, `dueDate`) so exports, detail panels, the left grid, and the SVG bars all read from the same enriched row model; use a custom Frappe view mode with 1-day columns to get week headers, daily grid lines, and the today marker without replacing the library.
- **User preferences:** madesous wanted the Gantt to stay dark-themed while matching the denser PM-tool structure from the reference screenshot instead of switching Step 5 to a light island.
- **Key file paths:** `js/gantt-planner.js` — row enrichment, custom timeline mode, split-pane resize, and left-grid rebuild; `css/style.css` — dark PM-grid restyle for the table, divider, timeline header, bars, and indicators.

### 2026-05-21T18:38:14.725+02:00 — Solutions card cleanup and permission normalization
- **Architecture decisions:** Step 3 solution cards no longer render descriptive highlight bullets; they now surface actual required-role chips derived directly from `permissions.azure_roles` and `permissions.m365_roles`, while the planner fallback avoids the old `Cloud Admin` label.
- **Patterns used:** Normalize connector RBAC by onboarding pattern in `data/solutions.json` (for example Azure-native connectors → `Reader` + `Microsoft Sentinel Contributor`, forwarder/agent connectors → `Log Analytics Contributor` + `Virtual Machine Contributor` + `Microsoft Sentinel Contributor`), and keep `permissions.fingerprint` in sync after every role rewrite.
- **User preferences:** madesous wants the solutions step to stay concise and to show real, recognizable permission names instead of vague owner labels or duplicate descriptive bullets.
- **Key file paths:** `js/modules/solutions.js` — removed highlight rendering and added required-role chips; `css/style.css` — replaced highlight styling with role-chip styling; `data/solutions.json` — cleared per-solution setup summaries from the card dataset, normalized role sets, and replaced `Cloud Admin` owner labels; `js/gantt-planner.js` — swapped the fallback owner wording to `Azure Platform Admin` / `IT Admin`.

### 2026-05-21T18:48:33.616+02:00 — Gantt bar visibility and left-grid cleanup
- **Architecture decisions:** Keep the split-pane Gantt anchored to the first real task bar on initial render so the timeline opens on actual work instead of a blank pre-start gap; collapse row meta/description into a tooltip-only secondary detail so the PM-style table stays single-line and readable.
- **Patterns used:** Use SVG bar attribute fallbacks when `getBBox()` reports zero-sized bars during early render cycles, then apply one-time horizontal scroll positioning from the first visible task bar rather than hardcoding a week offset.
- **User preferences:** madesous liked the denser left table and wanted the redesign preserved, but without hidden bars or overlapping ghost copy behind task names.
- **Key file paths:** `js/gantt-planner.js` — fixed bar diagnostics/initial timeline scroll and removed duplicate row secondary text rendering; `css/style.css` — tightened the title row layout so single-line task names remain crisp in the compact grid.

### 2026-05-22T08:49:22.034+02:00 — Gantt labels restored and inline duration editing
- **Architecture decisions:** Keep full schedule editing in the existing detail panel, but move duration tweaks into the left split-pane table so the primary planner workflow stays in-context while start-week edits still use the richer task dialog.
- **Patterns used:** Re-apply phase classes directly onto rendered Frappe bar wrappers during post-render stabilization so bar colouring survives library class drift, and treat the duration cell as a lightweight inline editor that saves on Enter/blur without opening the detail panel.
- **User preferences:** madesous wants task names visible inside the bars again and prefers quick duration adjustments from the grid instead of drilling into a modal for every small timing change.
- **Key file paths:** `js/gantt-planner.js` — restored task-label sync on bars, enforced phase classes, added inline duration cell editing, and updated planner guidance copy; `css/style.css` — made SVG bar labels visible again, added duration-column/editor styling, and widened the grid for the new editable column; `README.md` — Step 5 interaction copy now reflects inline duration editing.

### 2026-05-22T08:49:22.034+02:00 — Dead-code audit hotspots
- **Architecture decisions:** Current planner runtime flows through `js/app.js` → `js/gantt-planner.js` → `js/modules/planning.js`; older Step 4 summary/results rendering in `js/modules/solutions.js` is no longer on the active path.
- **Patterns used:** High-confidence dead code now clusters in three places: orphaned Step 4 result helpers in `js/modules/solutions.js`, pre-Gantt placeholder/result CSS in `css/style.css`, and unused export payload fields inside `js/gantt-planner.js`.
- **User preferences:** madesous wants reporting first, no deletions, and especially wants Gantt/planner remnants called out before cleanup.
- **Key file paths:** `js/modules/solutions.js` — `hydrateConnectedSolutionIds`, `renderSummaryStats`, `renderResultsGrid`; `js/gantt-planner.js` — unused `exportRows` payload and related metadata fields; `css/style.css` — old `.summary-stats` / `.results-grid` / `.planner-view-*` / `.btn-*` blocks; `index.html` — orphaned IDs such as `step2Next`, `workspaceSection`, and `workspaceCard`.

### 2026-05-22T08:58:52.187+02:00 — Dead-code cleanup completed
- **Architecture decisions:** The active wizard relies on `[data-next]` navigation and workspace card classes, so legacy `step2Next`, `workspaceSection`, and `workspaceCard` IDs can be removed without affecting behavior; shared `.stat-card` styling stays because `planning.js` still uses it.
- **Patterns used:** Before deleting dead UI code, verify runtime reachability with repo-wide reference searches, then preserve any shared sub-blocks (like shared stat-card styles) while removing only the orphaned selectors and helpers.
- **User preferences:** madesous wants rollback safety first, so cleanup work should start with a pre-change git tag and stay tightly scoped to verified dead paths.
- **Key file paths:** `js/modules/solutions.js` — removed unused Step 4 render/export helpers and stale connected-state hydrator; `css/style.css` — removed obsolete results/planner-placeholder/button selectors while preserving shared stat-card rules; `index.html` — dropped unreferenced IDs and kept class/data-hook navigation intact.

## 2026-05-22T07:58:20Z: Cross-agent sync — Gantt subtasks and Environment Sizing

**From Sebastian:**
- Windows Security Events task structure expanded to 6 tasks + 5 subtasks with setup_hours = 60 (clean values)
- Your subtask rendering is now consuming the full hierarchy in Step 5
- RBAC fingerprinting ready; await Deckard's environment sizing schema before multi-connector dedup

**From Deckard:**
- Environment Sizing Step finalizes duration scaling logic by infrastructure category
- Task visibility rules: Arc tasks skip for all-Azure; conditional task inclusion available in \solutions.json\
- Schema extension backward-compatible; your planner reads \nvironment_scaling\ if available

**QA failures** (luv-qa-pass2, REJECT verdict — blocking):
1. **Start-week-only edits collapse duration to 0.5h** (HIGH)
   - Root: \uildDurationState()\ sanitizes missing overrideDuration to 0.5h
   - Fix needed: Distinguish between start-week-only and full override records in localStorage
   - Files: \js/gantt-planner.js\ (persistence, override logic)

2. **Planner includes non-connectors** (HIGH)
   - Root: No \is_connector\ filtering in planner input
   - Fix needed: Pre-filter solutions where \is_connector === true\ before Gantt rendering
   - Files: \js/gantt-planner.js\ (input validation)

3. **RBAC fingerprint deduplication not implemented** (MEDIUM-HIGH)
   - Root: Planner never reads \permissions.fingerprint\ or shared state
   - Fix needed: Consume fingerprint in planner, mark shared RBAC work, output shared state
   - Files: \js/gantt-planner.js\ (dedup logic), \js/modules/solutions.js\ (selection handling)

**Approved visual work** ✓:
- Monday.com-style indent guides working
- Parent row collapse/expand functional
- Fade/slide transitions smooth
- Dark PM-grid layout confirmed

**Next steps:**
- Fix three QA blockers before merge
- Test with multiselectSolutions including multi-connector bundles
