# Windows AMA connector pattern

## When to use
Use this pattern when a Windows-family Microsoft Sentinel connector needs a planner-ready catalog record that reflects the AMA deployment path instead of a legacy or bundle-style solution summary.

## Pattern
1. Keep the existing umbrella solution record if the catalog already uses it elsewhere; add a companion AMA-specific connector record instead of replacing it blindly.
2. Source task sequencing from connector research that already captures IDs, durations, dependencies, and owner roles.
3. Store the detailed model in `setup_tasks` with explicit `phase`, `duration`, `dependencies`, `owner_role`, and nested `subtasks` where needed.
4. Mirror the same sequence into `planner.setup_tasks` using the current UI contract (`task`, `effort_hours`, `depends_on`, `phase`, `subtasks`) so planner and export flows keep working.
5. Add `contentCounts` from the official Azure-Sentinel solution folders (`Analytic Rules`, `Workbooks`, `Hunting Queries`) when docs do not publish totals.
6. Map infrastructure prerequisites into both `requiredInfrastructure` and onboarding metadata so the planner can reason about Arc, DCR, DCE, event channels, log files, or ASIM dependencies.

## Validation checklist
- JSON is written with `utf-8-sig` so the BOM is preserved.
- Every new connector has unique `id`, `name`, `vendor`, `category`, `contentCounts`, `requiredInfrastructure`, `setup_tasks`, and mirrored `planner.setup_tasks`.
- Task and subtask dependencies reference valid task IDs in the same connector record.
- The official content counts match the current Azure-Sentinel solution folders, or default to zero when no Microsoft content exists.
- `python -c "import json; json.load(open('data/solutions.json', encoding='utf-8-sig'))"` passes after the update.
