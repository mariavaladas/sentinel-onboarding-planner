# K — Gantt progress shading

**Date:** 2026-06-09T15:43:54.258+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 5 renders planner bars as SVG rectangles in `js/gantt-planner.js`.
- Group and summary rows need a meaningful partial-progress signal instead of the old binary 0/100 overlay.

## Decision
Treat solution-group progress as completion across leaf tasks inside the group, not the summary placeholder rows, so grouped subtasks are counted once and the shaded portion reflects real completed work.

## Implementation Notes
- Summary rows compute progress from their direct `parentId` children.
- Individual tasks keep the simple 100 / 50 / 0 mapping for Completed, In Progress/In Review, and Planned/Skipped.
- Partial bars use a lighter base fill plus a darker left-side overlay for the completed portion.

## Files
- `js/gantt-planner.js`
- `css/style.css`
- `js/app.js`
