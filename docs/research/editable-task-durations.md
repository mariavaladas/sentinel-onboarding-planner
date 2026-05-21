# Editable Task Durations Research

- **Prepared by:** K
- **Prepared:** 2026-05-21T13:01:13.140+02:00
- **Scope:** How customers should redefine task durations in the Sentinel onboarding Gantt planner, and what implementation path fits the current static HTML/CSS/JS + Frappe Gantt setup.

## Executive summary

The best fit for this planner is **explicit duration editing in the existing task detail panel**, with **instant Gantt recalculation and downstream auto-shift**.

That recommendation is stronger than drag-only editing because:

- this planner is currently **client-side only**, so edits should feel deterministic and reversible,
- many durations are **small and precise** (`0.5h`, `1h`, `2h`, `3h`), which is awkward to edit by dragging alone,
- some tasks can become **much longer because of waiting time** (for example approvals), so users need a way to enter a larger value directly,
- the current Gantt is initialized as **readonly**, and the current plan model is **solution-level / week-level**, not yet true per-setup-step scheduling.

### Recommended product direction

1. **Primary UX:** click a task/bar → edit duration in the detail side panel.
2. **Units:** allow **hours, days, or weeks** in the editor; store a normalized internal value and remember the chosen display unit.
3. **Cascade:** duration changes should **auto-shift downstream tasks by default** so the plan stays coherent.
4. **Persistence:** store overrides in **localStorage** with in-memory fallback.
5. **Visual indicator:** show **Custom** vs **Default** clearly, with a one-click **Reset to default**.
6. **Implementation note:** if the goal is true task-level editing for connector setup steps, the planner should first move from **solution rows** to **atomic setup-task rows**.

## Current app reality

Today, the planner is close to the right foundation, but not yet at the right granularity for editable setup-step durations:

- The Gantt chart is built in `js/gantt-planner.js`.
- Frappe Gantt is loaded from CDN at **v1.2.2**.
- The chart is currently initialized with `readonly: true`.
- The planner data model uses `startWeek`, `durationWeeks`, and `endWeek`.
- Individual `planner.setup_tasks[].effort_hours` values are shown in task cards, but they are **not** currently rendered as separate Gantt bars.
- Existing duration logic is mostly **derived from solution difficulty / setup hours**, not direct per-task customer overrides.

### Important implication

If the real product requirement is:

> “Let customers redefine the duration of each connector setup task such as Set up VM / Install ARC / Configure permissions / Install AMA / Deploy DCR”

then the planner should treat those setup steps as **first-class Gantt tasks**.

A stopgap can let users override the current solution-level row duration, but the more correct long-term shape is **task-level rows + task-level overrides**.

## 1. What leading tools do

| Product | Where users edit duration | Units | Cascade behavior |
| --- | --- | --- | --- |
| **Monday.com** | Inline date-range cell, item side panel, drag/resize bars | Mainly date-based; effectively days, with timeline zoom levels | Supports different dependency behaviors, including auto-shift |
| **Asana** | Task detail pane, date chips, drag/resize bars in timeline | Mostly date-based / day-oriented | Emphasizes dependency visibility and conflict resolution more than hard auto-cascade |
| **Microsoft Planner / Project** | Inline duration column, task detail pane, drag/resize bars | Planner web is simpler; classic Project supports rich duration units | Full scheduling-engine recalculation |
| **Smartsheet** | Inline duration cell in grid, drag/resize bars | Strongest unit support: hours, days, weeks, etc. | Automatic dependency-driven shifting |

### Monday.com

**Editing pattern**
- Edit the task’s date range inline in the board/grid.
- Open the item side panel for fuller editing.
- Drag or resize bars in timeline/Gantt views.

**Units**
- Monday is mainly **date-range based**, not “typed duration” first.
- It behaves more like **start/end dates** than a dedicated numeric duration field.

**Cascading**
- Monday’s dependency model is useful because it recognizes that teams want different levels of automation.
- Its dependency behavior is effectively a spectrum:
  - **Auto-adjust / strict** style behavior
  - **Notify / flexible** style behavior
  - **No action**

**Takeaway for us**
- The most valuable lesson is not the exact UI; it is the idea that **cascading can be opinionated, but still explainable**.

### Asana

**Editing pattern**
- Edit dates in the task side pane.
- Drag/resize bars in Timeline/Gantt-style views.
- Due dates are easy to change from list/card surfaces.

**Units**
- Asana is primarily **date-based** and oriented around day-level scheduling.
- It does not present itself like a rich typed duration tool.

**Cascading**
- Public Asana material emphasizes:
  - showing blockers,
  - visualizing dependency chains,
  - manual schedule adjustment by dragging.
- In practice, Asana feels closer to **warn-and-resolve** than to a strict auto-scheduling engine.

**Takeaway for us**
- Asana is a good benchmark for a **lightweight, approachable interaction model**.
- If our users are not professional PMs, this “simple, visible, low-drama” behavior is attractive.

### Microsoft Planner / Project

**Editing pattern**
- Inline **Duration** field in the grid.
- Task detail pane.
- Drag task bars in timeline view.

**Units**
- Microsoft is the clearest example of typed duration entry.
- The classic Project model supports rich units such as **minutes, hours, days, weeks, months, years**.

**Cascading**
- This is the strongest benchmark for automatic recalculation.
- Dependencies are part of a scheduling engine; downstream dates move when predecessor timing changes.

**Takeaway for us**
- If the planner is meant to be a **schedule calculator**, not just a picture, Microsoft’s model is the right conceptual anchor: **edit duration → schedule recalculates immediately**.

### Smartsheet

**Editing pattern**
- Best benchmark for our use case.
- Edit duration directly in a **grid cell**.
- Drag the bar center to move the task.
- Drag either edge to change start/end and therefore duration.

**Units**
- Smartsheet has the richest practical duration input model of the four:
  - `2w`
  - `4d`
  - `3.5d`
  - `7h`
  - `60m`
  - combinations like `4h 30m`

**Cascading**
- Very strong automatic behavior.
- When dependencies are enabled, changing duration or predecessor timing updates dependent dates automatically.
- Any two of **start / end / duration** determine the third.

**Takeaway for us**
- Smartsheet is the best direct UX benchmark for **editable duration + dependency-based cascading**.
- The main thing worth copying is: **typed duration input plus immediate schedule recomputation**.

## 2. Best UX pattern for our planner

### Recommendation

Use a **detail-panel duration editor** as the primary interaction, with **optional drag-to-resize later**.

### Why this is the best fit

#### 1) It matches the UI you already have
The planner already opens a detail overlay/panel when a task is selected. That means the cleanest change is:

- click task bar,
- open task details,
- edit duration there,
- recalculate schedule immediately.

This is much lower risk than inventing a new inline editing grid from scratch.

#### 2) It is precise for small values
Your current estimates are small, clean values like `0.5`, `1`, `2`, `3` hours.

That makes **typed or stepped input** better than drag-resize as the primary control. A user can reliably set:

- `0.5h`
- `1h`
- `2h`
- `1d`
- `2w`

They cannot reliably hit those exact values by dragging a bar unless the chart is already zoomed to a very fine timescale.

#### 3) It handles “waiting time” better
Some tasks are short in active effort but long in elapsed time because of approvals or internal process delays.

A direct editor lets the customer say:

- default = `2h`
- override = `2w`

That is much clearer than dragging until the bar “looks longer enough”.

### Recommended control design

Inside the detail panel, show:

- **Duration** label
- **Numeric stepper or text input**
- **Unit switch**: `Hours | Days | Weeks`
- **Quick presets**: `0.5h`, `1h`, `2h`, `4h`, `1d`, `2d`, `1w`, `2w`
- **Reset to default** action

### Recommended display pattern

For each task, show both the current value and whether it is default or custom.

Example:

- `Duration: 2w`
- badge: **Custom**
- helper text: `Default: 2h`
- action: `Reset`

### Recommended visual indicator in the chart

Use one or both of these:

- a **Custom** badge in the detail panel and list row,
- a subtle **custom bar treatment** in the Gantt itself, such as:
  - dotted outline,
  - small corner marker,
  - slightly different border color.

In dark mode, the change should be visible but not noisy.

### What not to use as the primary pattern

#### Drag-to-resize only
Not recommended as MVP primary UX.

Reason:
- low precision,
- poor discoverability for non-PM users,
- current chart is readonly,
- current chart is week-oriented, which is too coarse for hour-scale tasks.

#### Modal dialog
Possible, but weaker than the existing side/detail panel.

Reason:
- interrupts the user more,
- duplicates a panel pattern you already have,
- makes repeated edits slower.

## 3. How duration changes should cascade

### Recommendation

**Yes — downstream tasks should auto-shift by default.**

If a task like **Permissions** gets longer, the planner should immediately move later dependent tasks so the Gantt remains trustworthy.

### Why auto-shift is the right default here

This planner is not a freeform whiteboard. It is a **planning tool**. If task A takes longer and task B depends on task A, then a non-shifted plan is misleading.

For this use case, coherence matters more than manual date freedom.

### Suggested MVP rule

- Support **Finish-to-Start** dependencies first.
- When duration changes:
  - keep the edited task’s **start** fixed,
  - recompute its **end**,
  - shift all downstream tasks forward/backward based on dependency order.

### UX feedback to show

After a duration edit, show a lightweight message such as:

- `Permissions updated from 2h to 2w`
- `4 downstream tasks shifted by +9 business days`

That gives users confidence that the planner reacted correctly.

### Should the bars update in real time?

**Yes.**

The Gantt chart should visually update immediately after the edit is applied. The planner should also update:

- total duration summary,
- phase duration chips,
- mobile list metadata,
- export rows.

### Frappe Gantt answer

**Yes, Frappe Gantt can be refreshed after task data changes.**

For this app, the safest pattern is:

1. Update override state.
2. Rebuild the derived task plan.
3. Refresh/re-render the Gantt with the new task array.

Because a duration change can affect **many** bars, a **whole-plan refresh** is safer than trying to patch only one bar.

### Important Frappe-specific note

Frappe Gantt already supports the ingredients needed later for drag editing:

- `readonly: false` / `readonly_dates: false`
- `on_date_change`
- `move_dependencies: true`
- `refresh(tasks)`
- `update_task(id, new_details)`

So if you later want drag-to-resize, the library is not the blocker.

The bigger blocker is the planner’s current **week-based aggregate data model**.

## 4. Data model for overrides

### Recommendation

Use:

- **in-memory state** for the live session,
- **localStorage** for persistence across refreshes.

### Why localStorage is the right MVP choice

- no backend required,
- instant save,
- works well for a single-user planning tool,
- easy to reset,
- consistent with the existing app’s local storage patterns.

### Recommended storage key

`sentinelPlanner.taskDurationOverrides.v1`

### Recommended schema

```json
{
  "version": 1,
  "savedAt": "2026-05-21T13:01:13.140+02:00",
  "workingHoursPerDay": 8,
  "workingDaysPerWeek": 5,
  "overrides": {
    "azure-activity::setup-02": {
      "taskId": "azure-activity::setup-02",
      "connectorId": "azure-activity",
      "taskLabel": "Configure permissions",
      "originalDuration": 2,
      "overrideDuration": 2,
      "unit": "weeks",
      "normalizedBusinessHours": 80,
      "updatedAt": "2026-05-21T13:01:13.140+02:00"
    }
  }
}
```

### Why this shape works

- `taskId`: stable lookup key
- `connectorId`: useful for grouping/export
- `originalDuration`: default estimate for reset/reference
- `overrideDuration` + `unit`: preserves what the customer actually entered
- `normalizedBusinessHours`: easy internal scheduling math
- `updatedAt`: useful for future auditing/export

### Recommended task ID strategy

Use stable IDs such as:

- `standard::rbac-security-groups`
- `azure-activity::setup-01`
- `azure-activity::setup-02`

Do not key by array index alone unless the order is guaranteed forever.

### Reset behavior

Support both:

- **Reset this task**
- **Reset all custom durations**

When reset is clicked, remove the override entry entirely rather than storing a duplicate default value.

### Fallback behavior

If localStorage is unavailable:

- keep edits in memory for the session,
- show a quiet note such as `Custom durations will reset when the page reloads.`

## 5. RECOMMENDED APPROACH

### Product recommendation

Implement **explicit editable durations in the task detail panel**, backed by **task-level overrides**, with **automatic downstream rescheduling**.

### Recommended scope decision

There are two possible implementation scopes:

#### Option A — Stopgap
Allow overriding the current **solution-level row duration**.

- lower engineering cost,
- faster to ship,
- but not fully aligned to the “connector setup step” requirement.

#### Option B — Recommended
Refactor the planner so **individual setup steps** become actual Gantt rows, then add duration editing on those rows.

- best UX fit,
- best data fit,
- best long-term product shape.

**Recommendation: Option B.**

If customers are meant to redefine the duration of specific onboarding steps, the Gantt should actually show those steps.

## 6. Implementation sketch

### 6.1 Data/model changes

Refactor `buildGanttPlanData()` so it can accept override state:

```js
buildGanttPlanData(selectedSolutions, { durationOverrides })
```

Instead of only generating one row per solution, generate atomic rows from:

- standard project tasks,
- `planner.setup_tasks` for each selected solution,
- closeout tasks.

Each row should carry:

- `id`
- `connectorId`
- `step`
- `defaultDuration`
- `effectiveDuration`
- `durationUnit`
- `isCustomDuration`
- `dependencies`

### 6.2 Duration normalization

Add a small utility that converts user-entered duration into a normalized scheduling value.

Suggested internal rule:

- normalize to **business hours**,
- then derive dates from business hours.

That supports:

- `0.5h`
- `2h`
- `1d`
- `2w`

while still preserving the original unit for display.

### 6.3 Persistence layer

Add a small module, for example:

- `js/modules/task-duration-overrides.js`

with helpers such as:

- `loadDurationOverrides()`
- `saveDurationOverrides()`
- `setDurationOverride(taskId, value, unit)`
- `resetDurationOverride(taskId)`
- `resetAllDurationOverrides()`

### 6.4 UI interaction

Enhance the existing detail panel to show an editable duration control.

Suggested interaction:

1. User clicks a task bar or mobile list item.
2. Detail panel opens.
3. User changes duration via stepper or preset.
4. App saves override to in-memory state + localStorage.
5. App rebuilds plan data.
6. Gantt and summary surfaces refresh immediately.

### 6.5 Recalculation flow

Recommended scheduling flow:

1. Start from ordered task rows.
2. Resolve each row’s **effective duration** from default + override.
3. Walk tasks in dependency order.
4. Recompute:
   - start
   - end
   - lane placement if needed
5. Recompute summary stats and export rows.

For MVP, keep dependency logic simple:

- **Finish-to-Start only**
- no lag/lead yet
- no manual exceptions yet

### 6.6 Gantt refresh

After recalculation:

```js
const nextPlan = buildGanttPlanData(selectedSolutions, { durationOverrides });
ganttInstance.refresh(nextPlan.tasks);
```

Also refresh any dependent UI state:

- summary header,
- phase chips,
- detail panel values,
- mobile list,
- export payload.

If keeping the current architecture is simpler, a full planner rerender is also acceptable because the data set is not large.

### 6.7 View-mode recommendation

If you move to true task-level durations, the chart should no longer default to only week-scale thinking.

Recommended defaults:

- **Day** view as default
- keep **Week** and **Month**
- optionally add **Half Day** or **Hour** for short onboarding tasks

Reason:
- `0.5h` to `3h` tasks are too small to edit meaningfully on a week-first timeline.

### 6.8 Phase 2 enhancement: drag-to-resize

After the explicit editor ships and proves the model works, consider enabling direct manipulation:

- set `readonly: false`
- keep `readonly_progress: true` if progress should remain locked
- add `on_date_change` callback
- keep `move_dependencies: true`

But this should be a **phase 2 enhancement**, not the MVP.

## 7. Practical UX spec

### MVP behavior

- Customer clicks task
- Customer edits duration in side panel
- App updates schedule immediately
- Downstream tasks auto-shift
- Task shows **Custom** badge
- User can reset to default
- Overrides survive refresh via localStorage

### Nice touches

- Show `Default: 2h` under a custom value
- Show a toast/banner describing downstream impact
- Export current plan with custom durations included
- Add a top-level `Reset custom durations` action

## Final recommendation

**Ship explicit duration editing in the existing detail panel, not drag-first editing.**

Back it with **localStorage overrides** and **automatic downstream rescheduling**.

If the product goal is true per-step customer scheduling, first refactor the Gantt to show **atomic setup tasks** instead of only solution-level rows.

That path is the most consistent with the benchmark tools, the existing app architecture, and the reality that onboarding tasks can vary from **half an hour** to **multiple weeks**.

## Sources

### Product benchmarks

- Monday.com — Task dependencies: https://monday.com/blog/project-management/task-dependencies/
- Monday.com — Gantt chart guide: https://monday.com/blog/project-management/gantt-chart/
- Asana — Timeline / project views: https://asana.com/product/timeline
- Asana — Project dependencies: https://asana.com/resources/project-dependencies
- Asana — Gantt chart basics: https://asana.com/resources/gantt-chart-basics
- Microsoft — Build a project in grid and timeline views: https://support.microsoft.com/en-us/office/build-a-project-in-grid-and-timeline-views-b01443f4-0e85-4952-b1f2-f4b55e4a90be
- Microsoft — Advanced capabilities with premium plans in Planner: https://support.microsoft.com/en-us/office/advanced-capabilities-with-premium-plans-in-planner-6cdba2aa-da06-4e08-be4c-baaa4fda17ba
- Smartsheet — Work with Gantt chart: https://help.smartsheet.com/articles/765675-work-with-gantt-chart
- Smartsheet — Working with Gantt charts / dependencies and duration: https://help.smartsheet.com/articles/765727-working-with-gantt-charts

### Frappe Gantt

- Frappe Gantt overview: https://frappe.io/gantt
- Frappe Gantt repository: https://github.com/frappe/gantt
