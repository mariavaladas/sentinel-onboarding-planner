# Gantt task CRUD overrides

## When to use
Use this pattern when a vanilla HTML/CSS/JS planner needs browser-persistent task CRUD without adding a backend or mutating the source solution catalog.

## Pattern
1. Keep one versioned localStorage state object for planner edits, and extend its shape instead of creating parallel browser stores.
2. Treat catalog/template rows as immutable defaults; persist edits as per-task override records keyed by `taskId`.
3. Store user-created tasks separately as normalized `customTasks` entries with `solutionId`, optional `parentRowId`, and lightweight task metadata.
4. Merge `customTasks` into the same row-building pipeline that produces the table, Gantt bars, detail panel data, and export rows.
5. Rebuild all planner surfaces after each mutation, then reopen the intended inline field by `{ taskId, fieldKey }` so add/edit flows survive rerenders.
6. Hard-delete only user-added rows; represent skipped template work as a persisted `status: Skipped` override.

## Validation checklist
- Reload keeps added tasks, subtasks, renamed steps, and edited descriptions.
- User-added deletes also remove orphaned override entries.
- Skipped template tasks remain visible in the table, chart, and export output.
- Newly added tasks can immediately enter inline name editing after rerender.
- Export uses the same normalized row model and includes custom rows in the right order.
