# Gantt Parallel Rendering Fix — Review Findings

**Date:** 2026-06-08T12:06:13.373+02:00  
**Author:** Luv  
**Type:** QA finding — code review  
**Affects:** `js/gantt-planner.js` lines 3835–3862 (`buildGanttPlanData`)

---

## Verdict: ACCEPT with one caveat (state migration risk — existing saved plans only)

---

## What was reviewed

The fix in `[1, 2, 3].forEach` connector scheduling loop that:
- Replaced advancing `baselineCursor` with fixed `parallelStartWeek` for all connectors in the same phase bucket
- Set `previousPhaseBaselineEnd = Math.max(...)` across all connector estimated end times

---

## What looks good ✅

### 1. `usesGeneratedTasks=true` — joinRowId delay still correct
The `joinRowId` appears in `defaultDependencies` for generated-tasks connectors. The downstream `applyRowDisplayOverrides` pass (line 2285) iterates rows in array order. Generated-infra rows are always pushed to `rows` before connector rows (`addGeneratedInfrastructureRows` at line 3806 runs before the connector forEach). By the time `applyRowDisplayOverrides` processes a connector row, the join row is already in `appliedRowsById` with its resolved `endWeek`. `getDependencyEndWeek` correctly returns `max(previousPhaseTerminals, joinRow.endWeek)`, delaying the connector as needed.

### 2. Single-connector phase — no regression
With 1 connector: `latestPhaseEndWeek = parallelStartWeek + singleEstimatedDuration`. `previousPhaseBaselineEnd` is identical to what the old cursor would have produced. Zero functional change.

### 3. `latestSolutionEndWeek` for Training/Go-Live — correct
`latestSolutionEndWeek = Math.max(..., terminalRow.endWeek)` accumulates across all phases correctly. The `Math.max` is already inside the parallel placements loop at line 3916, so it catches all connectors. Training's `defaultStartWeek` may slightly underestimate for generated-tasks connectors delayed by `joinRowId`, but Training also has `dependencies: allSolutionTerminalIds`, so `applyRowDisplayOverrides` re-resolves its start from actual dependency end weeks. Training placement is correct after the dependency pass.

### 4. `estimateSolutionPlanDuration` with shared `parallelStartWeek`
The function returns `endWeek - phaseStartWeek` — a relative duration. Since all connectors now share the same `parallelStartWeek`, they all receive a correctly-relative estimate. No behavioural difference from using different cursor values (connector durations are not absolute-week-dependent in the current task model).

### 5. `applySolutionGroupShift` with `shiftWeeks=0`
Line 3517: `if (Math.abs(safeShiftWeeks) < 0.0001) return rows;` — pure no-op. All connectors sharing the same `baselineStartWeek` with no user override produce `shiftWeeks=0`, which passes through without modification. Correct.

### 6. `applyRowDisplayOverrides` dependency pass handles parallel case correctly
Connectors sharing the same `parallelStartWeek` and the same `previousPhaseTerminalIds` dependency list both resolve to the same `dependencyDrivenStartWeek`. They start in parallel. The pass does NOT skip solution-group child rows (they have `hasDirectStartWeekOverride=false`), so their final start weeks are correctly driven by dependencies. ✅

### 7. Cross-phase sequencing still enforced
`previousPhaseTerminalIds` is collected from actual `terminalRow.id` values (line 3914), not from the estimated cursor. Phase N+1 connectors depend on all Phase N terminal rows. The `applyRowDisplayOverrides` pass resolves Phase N+1 starts from the actual Phase N final end weeks. Correct.

---

## Risk remaining ⚠️

### State migration: stored solutionGroup startWeek overrides from old sequential plans

`readSolutionGroupState` determines whether a stored `startWeek` is a user override by comparing it against `defaultStartWeek` (= `baselineStartWeek` = `parallelStartWeek`):

```js
const hasDirectStartWeekOverride = hasStoredStartWeek &&
    Math.abs(overrideStartWeek - safeDefaultStartWeek) >= 0.0001;
```

**Before the fix:** For a second connector in a phase, `baselineStartWeek` was `cursor_after_first_connector`. The stored `startWeek` (if not user-edited) equalled the cursor → `hasDirectStartWeekOverride = false` → clean baseline.

**After the fix:** All connectors share `parallelStartWeek = previousPhaseBaselineEnd` (earlier). The stored `startWeek` from the old sequential position (e.g. week 8) now differs from the new baseline (e.g. week 6) → `hasDirectStartWeekOverride = true` → connector appears "custom scheduled" even though the user never touched it.

**Impact:**  
- Purely a display/UX issue for existing saved plans — "custom schedule" badge appears incorrectly  
- Scheduling still ends up correct after the dependency pass  
- New plans and reset plans are completely unaffected  
- Plans where the user DID manually set start weeks: unaffected (their overrides are still valid)

**Recommendation:**  
Acceptable for now — this is a cosmetic artifact only for users with pre-fix saved state. No action required unless users report unexpected "custom schedule" badges. If it does surface, a one-time migration that clears `solutionGroup.startWeek` entries that now equal or precede `parallelStartWeek` would resolve it.

---

## Manual test scenarios recommended

1. **Two connectors same phase (e.g. AWS + Windows Security Events):** Confirm both bars start at the same week on the Gantt timeline.
2. **One generated-tasks connector + one standard connector same phase:** Confirm the generated-tasks connector is correctly delayed past the infra join row; standard connector starts at phase baseline.
3. **Fresh plan, no saved state:** Verify no unexpected "custom schedule" indicators appear on connector group rows.
4. **Existing saved plan (pre-fix, multi-connector phase):** Check whether connector group rows incorrectly show "custom schedule" badge. Expected: may appear; scheduling is still correct.
5. **User override on one connector, parallel connector untouched:** Confirm only the overridden connector shows custom badge; the other resolves cleanly.
6. **Training & Go-Live start weeks:** With a generated-tasks connector delayed by infra join task, confirm Training starts after the delayed connector finishes (not at the pre-delay estimated time).
