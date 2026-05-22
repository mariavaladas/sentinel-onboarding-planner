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
