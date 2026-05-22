# Gantt solution groups and start offsets

## When to use
Use this pattern when a vanilla HTML/CSS/JS planner needs per-solution grouping, collapsible connector sections, and editable connector start dates without introducing a backend or replacing the existing Gantt component.

## Pattern
1. Add one top-level "solution group" row per selected solution in the same row-building pipeline that already produces task rows, Gantt bars, detail data, and export rows.
2. Persist group UI state in the existing versioned localStorage payload instead of creating a second store; keep `startWeek` and `collapsed` under a `solutionGroups` object keyed by `solutionId`.
3. Treat groups as collapsed by default and only persist `collapsed: false` when the user expands a group; omit the flag for the default collapsed state.
4. Apply connector-wide shifts to child rows during plan generation, and save child task start overrides relative to the active group offset so task edits survive future group moves.
5. Use explicit chevrons or Gantt label toggles for collapse/expand, and reserve row/bar clicks for selection so toolbar actions (like `+ Add task`) stay reliable.
6. Rebuild custom timeline headers per zoom mode so Weeks, Months, and Quarters remain readable after each rerender.

## Validation checklist
- Reload preserves expanded groups and custom connector start dates.
- Editing a solution-group start date shifts only that connector's child tasks.
- Adding a task to a collapsed connector expands the group before reopening inline name editing.
- Row and bar clicks select tasks consistently, while collapse only happens from the dedicated chevron/label affordance.
- Dependency arrows continue to point to visible rows when a connector group is collapsed.
