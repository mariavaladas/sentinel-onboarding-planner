# K — Gantt task CRUD via override-backed custom tasks

- **Date:** 2026-05-22T16:42:32.7641933+02:00
- **Scope:** `js/gantt-planner.js`, `css/style.css`

## Decision
Store Step 5 task CRUD in the existing browser persistence surface instead of introducing a new store: the `sentinelPlanner.taskDurationOverrides.v1` payload now carries a versioned `{ overrides, customTasks }` shape.

- Built-in/template planner rows stay immutable and are changed through field overrides (`step`, `description`, `owner`, `status`, `impact`, schedule fields).
- User-created tasks and subtasks are stored as `customTasks` entries keyed by ID, attached by `solutionId` and optional `parentRowId`.
- Template tasks are never deleted; they can be marked `Skipped` via status override.
- User-added rows can be hard-deleted, and their related override entries are removed at the same time.

## Why
- The planner already depends on one localStorage-backed override model, so extending that state keeps persistence predictable and easy to reset.
- Rebuilding table rows, Gantt bars, detail panel, and export rows from one normalized plan pipeline prevents CRUD-only drift between surfaces.
- Skipping template rows preserves numbering, dependency chains, and exported plan visibility better than physically removing catalog tasks.

## Notes
- New tasks reopen directly into inline name editing after the plan rerenders.
- Side-panel descriptions are editable and persist through the same override path.
- `Skipped` is now a first-class task status with matching table/bar styling.
