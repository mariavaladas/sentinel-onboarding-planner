# Gantt planner export

## When to use
Use this pattern when a static HTML/CSS/JS planner needs to generate a project-style Gantt view and an Excel export from the same source data without adding a build step.

## Pattern
1. Normalize the source records into a single plan-row shape first (`phase`, `step`, `owner`, `resourceType`, `startWeek`, `durationWeeks`, `dependencies`).
2. Add fixed overhead tasks before and after the solution-driven rows so the plan always has kickoff, environment setup, and handover milestones.
3. Schedule sequential work per category lane and let different categories in the same phase run in parallel.
4. Render the chart from the normalized rows, then reuse those exact rows for Excel export instead of rebuilding the spreadsheet mapping separately.
5. Pair the chart with a safe DOM details panel and a mobile list fallback so task details stay accessible when the SVG timeline is hidden.
6. For Frappe Gantt `custom_class`, emit a single CSS token per task (for example the phase class) unless the library version explicitly supports space-delimited class lists.

## Validation checklist
- The chart and Excel sheet show the same task count and phase ordering.
- Owner/resource-type rules come from one mapping function only.
- Responsive fallback still exposes step, phase, start week, and duration.
- Third-party chart styling is overridden to match the app theme without editing library files.
- Frappe Gantt `custom_class` values are single tokens; multi-class strings are normalized before render.
