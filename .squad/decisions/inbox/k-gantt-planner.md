# K — Gantt planner delivery

- **Date:** 2026-05-20T11:37:31.376+02:00
- **Owner:** K
- **Decision:** Step 4 now keeps the existing summary/results cards and adds a tabbed planner container where the new Gantt chart is the primary view and the existing task-card planner stays available as a secondary tab.
- **Why:** This adds the requested project-plan visualization without regressing the detailed task-card workflow already shipped in `planning.js`.
- **Implementation note:** `js/gantt-planner.js` owns the shared plan transformation, and `js/modules/export.js` reuses that same data for the Excel workbook so the UI and export stay aligned.
