# Inline Editing QA Report

**Author:** Luv  
**Date:** 2026-05-25T11:45:17.295+02:00  
**Scope:** `js/gantt-planner.js`, `css/style.css`

## Executive summary

I did **not** find a row-specific lock on **Training & Handover**. It is created as a normal standard task and rendered with the same inline status editor as other non-solution-group rows. The strongest code-level root cause is the **generic inline `<select>` editor**: it saves on both `change` and delayed `blur`, which can commit the old value and close the editor before the new option is applied.

## 1) Where inline editing is implemented

### Core inline-editing controller
- `js/gantt-planner.js:3090-3478`
  - Inline editor registry and activation: `inlineCellOpeners`, `inlineFieldOpeners`, `handleInlineCellActivation()`
  - Generic editors:
    - Duration popup: `openInlineDurationEditor()` (`3258-3409`)
    - Select editor used by **Status** and **Impact**: `openInlineSelectEditor()` (`3411-3478`)
    - Name editor: `openInlineNameEditor()` (`3480-3563`)
    - Owner popup: `openInlineOwnerEditor()` (`3566-3677`)
    - Date editor: `openInlineDateEditor()` (`3680-3866`)

### Field-specific renderers / launchers
- `js/gantt-planner.js:3893-4015`
  - Task name display/editor trigger: `renderTaskNameDisplay()` (`3893-3919`)
  - Owner: `renderInlineOwnerDisplay()` (`3922-3938`)
  - Status: `renderInlineStatusDisplay()` (`3940-3962`)
  - Impact: `renderInlineImpactDisplay()` (`3964-3985`)
  - Dates: `renderInlineDateDisplay()` (`3988-4015`)
- `js/gantt-planner.js:4189-4279`
  - Cell launchers wired in `createTaskTable()`
  - Owner/status/impact are enabled for any row where `!row.isSolutionGroup`
  - Start date uses `row.isStartWeekEditable`
  - Due date + duration use `row.isDurationEditable`

## 2) Why Training & Handover is not intentionally locked

### Training & Handover creation
- `js/gantt-planner.js:2816-2849`
  - `task-training-handover` is created in `addStandardTasks()`
  - It is a flat standard row with `taskType: 'Program milestone'`
  - No `readOnly`, `disabled`, or edit-blocking flags are applied here

### Editability defaults
- `js/gantt-planner.js:1854-1998`
  - `createRow()` defaults:
    - `isDurationEditable = !isSummary && !isSolutionGroup` (`1883`)
    - `isStartWeekEditable = !isSummary && !isSolutionGroup` (`1884`)
- Standard rows like Training & Handover are **not** summary rows and **not** solution-group rows, so they stay editable.

### Actual row types that are intentionally restricted
- **Summary rows**: schedule is read-only
  - `js/gantt-planner.js:2371-2384` sets `isDurationEditable: false` and `isStartWeekEditable: false`
- **Solution-group rows**: duration is read-only, start date editable, owner/status/impact disabled
  - `js/gantt-planner.js:2638-2678`
  - `createTaskTable()` also disables owner/status/impact launchers with `isEnabled: !row.isSolutionGroup` (`4191-4208`, `4270-4279`)

### CSS audit
- `css/style.css:2047-2254`
  - Inline editor CSS styles the triggers/popups but does **not** mark status cells as disabled/read-only
  - No CSS rule specific to Training & Handover disables the status editor

## 3) Root cause of the reported status dropdown bug

### BUG-01 — Status dropdown can revert/ignore the newly selected value
**Severity:** High  
**Affected fields:** Status (**confirmed by code path**), Impact (**same implementation / same risk**)  
**Primary file:** `js/gantt-planner.js`

**Root cause**
- The status editor is the generic select editor in `openInlineSelectEditor()` (`3411-3478`).
- It saves on both:
  - `change` (`3456`)
  - delayed `blur` after 300 ms (`3457-3459`)
- That is a fragile pattern for native `<select>` controls. On browsers / interaction paths where the select blurs before the `change` event commits, the blur handler can save the **old** value and close the editor first.
- Training & Handover is not special; it simply uses this same generic status path:
  - `renderInlineStatusDisplay()` (`3940-3962`)
  - launcher wiring in `createTaskTable()` (`4197-4208`)

**Why this matches the user symptom**
- The user reports: changing **Training & Handover** from **In Review** to something else "doesn't work".
- Code-wise, there is no row lock on that task.
- The generic select editor is the only place where a valid row can still behave as if the dropdown is "rejecting" the new value.

**Repro path from code**
1. Open the Gantt table.
2. Click the Status cell for any non-solution-group row (for example, **Training & Handover**).
3. Pick a different value from the native dropdown.
4. If blur fires before change commits, `saveEditor()` runs with the stale value and the editor closes without persisting the intended change.

**Line references**
- Editor logic: `3411-3459`
- Status renderer: `3940-3962`
- Status launcher: `4197-4208`
- Training row creation: `2816-2849`

## 4) Other editing issues found

### BUG-02 — Impact dropdown shares the same failure mode as Status
**Severity:** Medium  
**Affected field:** Impact  
**Primary file:** `js/gantt-planner.js`

**Root cause**
- Impact uses the **same** `openInlineSelectEditor()` implementation as Status.
- Same blur/change race applies.

**Line references**
- Generic select editor: `3411-3459`
- Impact renderer: `3964-3985`
- Impact launcher: `4268-4279`

### BUG-03 — Duration popup drops typed values if the user clicks outside instead of pressing Apply/Enter
**Severity:** Medium  
**Affected field:** Duration  
**Primary file:** `js/gantt-planner.js`

**Root cause**
- The duration popup's outside-click handler closes the editor without applying the typed value:
  - `cleanupOutside = createOutsidePointerHandler(editorShell, () => closeEditor());` (`3373`)
- In contrast, owner/date editors attempt to save on outside interaction.
- Result: custom duration edits can be silently discarded if the user types a new number and clicks elsewhere.

**Repro path from code**
1. Open a duration editor.
2. Type a new custom value.
3. Click outside the popup.
4. Editor closes and the typed value is lost.

**Line references**
- Duration editor setup: `3258-3409`
- Outside-click close without save: `3373`

### BUG-04 — Task-name editing is not cell-wide like the other inline editors
**Severity:** Low  
**Affected field:** Task name  
**Primary file:** `js/gantt-planner.js`

**Root cause**
- Name editing is opened only via the label button created in `renderTaskNameDisplay()` (`3911-3919`).
- There is no `attachInlineCellLauncher()` for the task-name cell, unlike owner/status/date/duration/impact.
- Clicking blank space in the task cell selects the row instead of opening the editor.

**Impact**
- Not a data-loss bug, but it is inconsistent with the rest of the spreadsheet-like inline-editing model.

**Line references**
- Name trigger only: `3911-3919`
- Task cell assembly (no cell-wide launcher attached): `4128-4188`

## 5) Editable-field audit

| Field | Editable rows by code | Code path | QA verdict |
|---|---|---|---|
| Status | All rows except solution-group rows | `3940-3962`, `4197-4208` | **Buggy** — select blur/change race can reject changes |
| Owner | All rows except solution-group rows | `3566-3677`, `3922-3938`, `4189-4195` | Looks correct from code analysis |
| Duration | Non-summary, non-solution-group rows | `1883-1884`, `3258-3409`, `4261-4266` | Mostly correct, but outside click drops typed edits |
| Start date | Normal task rows + solution-group rows; summary rows locked | `1884`, `2677-2678`, `3680-3866`, `4210-4229` | Looks correct from code analysis |
| Task name | All rows except solution-group rows | `3480-3563`, `3893-3919` | Save path looks correct, but opening is inconsistent (label-only) |
| Impact | All rows except solution-group rows | `3964-3985`, `4268-4279` | **Buggy** — same select race as Status |

## 6) Bottom line

- **Training & Handover is not locked by row type.** It is a standard editable row created in `addStandardTasks()`.
- The reported status problem is best explained by the **generic select-editor implementation**, not by special handling of standard tasks.
- The same root cause likely affects **Impact** as well.
- Owner and start-date editing paths look materially safer than Status/Impact from code review.
