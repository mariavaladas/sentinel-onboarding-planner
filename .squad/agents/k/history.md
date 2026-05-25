# History — K

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Frappe Gantt, ExcelJS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Current Focus (2026-05-22)

### 2026-05-22T10:38:16Z — Gantt UX fixes: Inline editing and business-day flow
- **Fixes applied:**
  1. Subtask bar labels — External text labels when bars too narrow
  2. Numbering convention — Letter suffixes (A, B, C) on parent task numbers
  3. Weekend gaps — Business-day scheduling for dependency chains
  4. Inline editing — Quick table cell edits for duration/dates/status
- **Validation:** Git tag v-pre-inline-edit-ux; Node --check passed
- **Files:** js/gantt-planner.js, css/style.css
- **Decision merged:** "K — Inline table editing and business-day gantt flow" (2026-05-22)

## Key Patterns (Active)

- **Persistence:** Override records distinguish start-week-only from full duration edits
- **Rendering:** Phase classes enforced on Frappe bars during post-render stabilization
- **Editing:** Inline duration in grid; full schedule edits in detail panel
- **RBAC:** Fingerprints enable client-side deduplication (Sebastian completed)
- **Business days:** Task dates map to business-day scheduling (no weekend gaps)
- **Subtask labels:** Parent number + letter suffixes; text outside narrow bars

## Learnings

### 2026-05-22T11:03:38.974+02:00 — Flat numbering and cell-first editing
- Top-level Gantt task numbers need one flat counter across setup, phase, and closeout rows; only subtasks should inherit the parent number with a letter suffix.
- Inline table editing needs a clear cell-level affordance in addition to nested triggers so users can click anywhere in the value cell and immediately edit.
- Duration parsing should accept shorthand entries (`4h`, `1d`, `1w`, `2.5d`), and date edits should accept `DD/MM/YYYY` text while still snapping to business days.

### 2026-05-22T11:15:33.921+02:00 — Gantt inline editor activation
- Gantt table inline editing is more reliable when cell activation is delegated from the table surface in capture phase instead of relying only on per-cell click listeners.
- Editable date and duration cells also need their own hover highlight so users can see the click target even when rows are rebuilt during layout updates.

### 2026-05-22T11:26:46.145+02:00 — Solutions step recommendation semantics
- Step 2 vendor defaults must stay empty when recommendations are meant to reflect explicit customer choices; visual defaults in the vendor grid create false "Recommended" badges downstream.
- The solutions card star now needs its own meaning separate from recommendation status so users can distinguish content-rich solutions from vendor-matched ones at a glance.
- Infrastructure prerequisites are best surfaced inline on the solution card beside required roles so planning assumptions are visible before export.

### 2026-05-22T14:58:07.474+02:00 — Deferred layout refresh and wizard restore
- Deferred Gantt table `updateLayout()` work while an inline editor is active, then replayed the most recent pending layout after `closeInlineEditor()` finishes so Frappe stabilization no longer destroys the active field.
- Preserved the dual `mouseup` + `click` trigger activation and the 300ms blur delay, while removing the temporary global click diagnostic and stray debug logging.
- Added Step 2 persistence for vendor picks, optional Azure/on-prem server counts, current wizard step, and a reset control that clears the planner's `sentinelPlanner.*` saved state.

### 2026-05-22T15:16:35.155+02:00 — Gantt picker UX and US date standard
- Inline Gantt date editing works better as a small anchored popup with a text field plus calendar grid; saving on day-pick and validating manual `MM/DD/YYYY` entry keeps spreadsheet speed without losing a picker.
- Duration editing is clearer when the table shows human-readable labels (`2 weeks`, `3 days`) while the picker itself uses compact quick-pick chips (`2w`, `3d`) and a number+unit custom control.
- The Frappe timeline header is easiest to restyle by rebuilding the HTML header rows after render, which allows true month-span bands and custom day-number labels without forking the library.

### 2026-05-22T16:42:32.7641933+02:00 — Task CRUD on top of planner overrides
- A versioned localStorage payload works best when custom task records and per-task overrides live together; upgrading the state shape (`overrides` + `customTasks`) avoids introducing a second browser store.
- Treating catalog-backed tasks as immutable defaults and persisting rename/status/description changes as overlays keeps rebuild, export, and reset flows deterministic.
- User-added rows need hard delete plus override cleanup, while template rows should be skipped with a status override so numbering, dependencies, and export visibility stay intact.
- Full Gantt/table rerenders are compatible with CRUD if the controller can reopen the intended inline field by `{ taskId, fieldKey }` immediately after a new task is injected.

### 2026-05-22T17:22:50.5966240+02:00 — Solution-group start offsets and selection-safe toggles
- Per-solution group state fits best inside the planner's existing versioned localStorage payload; keeping `solutionGroups` beside task overrides makes reload and reset behavior predictable.
- Connector groups should stay collapsed by default and only persist `collapsed: false` when expanded, which avoids noisy state while keeping the default UX stable for newly selected solutions.
- Gantt/table row clicks need to stay selection-only for toolbar reliability; collapse/expand should live on dedicated chevrons or bar labels so `+ Add task` enables consistently from solution summary rows.
- Custom timeline headers can branch cleanly by zoom mode (Weeks / Months / Quarters) after Frappe renders, which keeps the dropdown swap low-risk in a static frontend.

### 2026-05-25T10:29:47.633+02:00 — Wizard-first resume and responsive planner containment
- Default entry should stay on **Welcome** even when `sentinelPlanner.currentStep` points to a later step; saved progress is safer as an explicit resume CTA than an automatic jump into Step 5.
- Native `<select>` controls in this project need explicit dark-theme treatment (`color-scheme: dark` plus dark option colours) because browser defaults can break the planner toolbar and workspace picker styling.
- The Gantt task table is sensitive to stacked content inside absolute-positioned rows; keep custom schedule badges inline with the title row and hand smaller viewports over to the mobile planner layout sooner.
- User preference: smaller screens should prioritize a readable wizard-first flow over aggressive state restoration.
- Key file paths: `index.html`, `css/style.css`, `js/app.js`, `js/modules/wizard.js`, `js/gantt-planner.js`.

### 2026-05-25T11:45:17.295+02:00 — Hierarchical planner numbering
- Solution-group rows in `js/gantt-planner.js` must consume the shared global task counter so connector parents like `Windows Security Events` render as top-level items (`4`, `5`, ...).
- Solution setup rows should derive their numbers from the parent solution number (`4.1`, `4.2`, ...), while summary subtasks use the same dot notation recursively (`4.6.1`, `4.6.2`, ...).
- Closeout standard tasks still depend on the untouched global counter, so their numbering resumes after the last solution group rather than after every child task.
- User preference: hierarchical numbering should mirror the visible parent/child structure instead of using flat continuation or letter suffixes.
- Key file path: `js/gantt-planner.js`.

### 2026-05-25T11:45:17.295+02:00 — Detail drawer restoration, scoped reordering, and toolbar task insertion
- Planner row selection is now row-first again: clicking a task row or task name should open the right-side detail drawer, while quick schedule/status edits remain inline and task-name edits are handled from the drawer or the new-task inline focus flow.
- Custom task ordering persists best as scoped `taskOrders` state in the planner localStorage payload, with separate scopes for phase-root rows, per-solution top-level rows, and per-parent subtasks so hierarchy-safe reordering survives rerenders.
- The toolbar `+ Add task` action should still work without a selected row by falling back to the last visible solution group; this keeps new connector work inserted before closeout rows when possible.
- Key file paths: `js/gantt-planner.js`, `css/style.css`, `index.html`, `.squad/agents/k/history.md`, `.squad/decisions/inbox/k-detail-panel-addtask-reorder.md`.

### 2026-05-25T12:01:41.627+02:00 — Inline editor commit semantics
- Native `<select>` editors in `js/gantt-planner.js` should commit only from the `change` event; blur should merely dismiss after the browser finishes focus changes so status and impact selections do not revert.
- Duration popup outside-click handling should mirror the date and owner editors by attempting to apply the current typed duration before closing, which preserves spreadsheet-style edits without forcing the Apply button.
- Key file paths: `js/gantt-planner.js`, `.squad/agents/k/history.md`, `.squad/decisions/inbox/k-inline-editor-fixes.md`.

## Archive

Previous detailed sessions archived to **history-archive.md**:
- 2026-05-21 six sessions (editable durations, subtask hierarchy, ExcelJS export, split-pane, start-week editing, Gantt reference-layout refresh, solutions cleanup, bar visibility, labels/inline-editing, dead-code audit, cleanup completed)
- 2026-05-22 earlier (labels restored, dead-code cleanup)


## 2026-05-22T11:05 — K's Table UX Fixes
- Agent K completed table numbering reform (flat sequential with nested subtasks)
- Inline editing enabled for all task fields
- Cascade updates implemented for timing changes
- Frontend: js/gantt-planner.js, css/style.css modified
- Status: Ready for QA

### 2026-05-22T11:26:46.145+02:00 — Coordinator direct click handler fix
- Inline editing event delegation issue resolved by Coordinator with belt-and-suspenders approach.
- Each editable cell now has individual stopPropagation click handler.
- Row-level handler checks event.target to skip clicks from editable cells.
- Both K's cell openers and Coordinator's direct handlers ensure reliable cell editing without row interference.


---

## 2026-05-22T13:09:00Z — Session gantt-fixes-and-solutions

**Team Update:** Both K and Sebastian completed assigned work. Decisions merged and logged.

---

## 2026-05-22T16:20:26Z — K-19 Completion Summary

**Agent K-19** completed Gantt owner dropdown overflow and status color alignment:

1. **Owner popup layering** — Replaced native datalist editor with anchored popup pattern, proper z-index handling
2. **Status color alignment** — Unified colors across table badges and Gantt bars:
   - Planned = muted slate (phase palette preserved)
   - In Progress = teal
   - Completed = green
   - In Review = amber
3. **Related fixes:**
   - Date/duration inline picker UX with MM/DD/YYYY format
   - Owner column fallback mapping (task → solution → role heuristic)
   - Detail panel descriptions from task or solution metadata
   - Deferred layout refresh to prevent inline editor closure during Frappe stabilization

**Decisions logged:**
- `k-color-overflow-fix.md`
- `k-status-bar-colors.md`
- `k-gantt-inline-picker-ux.md`
- `k-owner-column.md`
- `k-side-panel-descriptions.md`

**Impact:** Gantt planner is now stable for production use with consistent color semantics and reliable inline editing.

## 2026-05-22T15:12Z — Cross-agent alignment (UX batch)
- K-21 completed: collapsible groups, per-solution start dates, timeline dropdown, add-task fix
- Upstream: Luv flagged RBAC metadata gaps; Sebastian queued Windows AMA companion records
- Next: await QA acceptance on inline editing flicker fix and group UI state persistence

## 2026-05-25 — Spawned for UI Bug Fixes

**Status:** In Progress  
**Tasks:**
1. Navigation should default to Welcome (wizard-first)
2. Timeline zoom dropdown styling for dark theme
3. Task row bleed fix on small screens (inline badges)

### 2026-05-25T08:59:01Z — Expand/collapse toggle hardening (COMPLETE)
- **What:** Hardened Gantt expand/collapse activation with shared primary-activation helper responding to `click` and left-button `mouseup` (plus keyboard). Made solution-group names clickable toggle targets. Widened chevron hit area in CSS.
- **Why:** Collapse control had become fragile after recent responsive/layout changes. Tiny chevron with plain `click` handler too easy to miss.
- **Validation:** Node syntax check ✓; Headless browser test with "Windows Security Events" showed 6→19 row expansion on both `click()` and `mouseup` paths ✓
- **Files:** js/gantt-planner.js, css/style.css
- **Decision:** "K — Expand/collapse toggle hardening" (2026-05-25T08:59:01Z)
- **Status:** ✓ COMPLETE — expand/collapse toggle working as intended. Group labels are now reliable expand targets.

## 2026-05-25T10:01:41Z — Hierarchical numbering and interactive planner features

**Agent K** completed two major features:

1. **Hierarchical task numbering** (decision: k-hierarchical-numbering)
   - Solution-group rows consume the shared global task counter (4, 5, ...)
   - Solution setup tasks use dot notation relative to parent (4.1, 4.2, ...)
   - Subtasks use recursive dots (4.6.1, 4.6.2, ...)
   - Closeout tasks resume global counter after last solution group
   - Files: js/gantt-planner.js
   - Validation: Tested with Windows Security Events plan

2. **Detail drawer restoration + Add Task + scoped reorder** (decision: k-detail-panel-addtask-reorder)
   - Row click opens right-side detail drawer with task metadata
   - Inline schedule/status edits remain in grid; task-name edits via drawer
   - Manual row ordering persists per scope: phase-root, per-solution, per-parent-subtask
   - Toolbar \+ Add task\ works without selection by falling back to last solution group
   - Files: \js/gantt-planner.js\, \css/style.css\

**Status:** ✓ COMPLETE — both features integrated and verified in headless browser testing.
