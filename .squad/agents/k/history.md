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

## Archive

Previous detailed sessions archived to **history-archive.md**:
- 2026-05-21 six sessions (editable durations, subtask hierarchy, ExcelJS export, split-pane, start-week editing, Gantt reference-layout refresh, solutions cleanup, bar visibility, labels/inline-editing, dead-code audit, cleanup completed)
- 2026-05-22 earlier (labels restored, dead-code cleanup)
