# Luv QA Pass 2

**Date:** 2026-05-21T17:00:59.261+02:00
**Verdict:** REJECT

## ✅ PASS
- `js/gantt-planner.js` parses successfully in Node module validation; no syntax errors found.
- Split-pane planner shell is wired correctly: task table + divider + Gantt chart are created, and vertical scroll sync is implemented.
- Full-width planner styling is present: Step 5 applies `planner-step-expanded`, removes the 1200px cap, and keeps the planner shell at `width: 100%`.
- Duration/start-week overrides share one persisted schema in localStorage and both reset paths exist (`resetTaskDurationOverride`, `resetAllTaskDurationOverrides`).
- `data/solutions.json` spot checks passed: 484 records, no duplicate IDs, `test-solution` removed, `windows-security-events` has 6 planner tasks totaling 6.0h, `is_connector` and `category` are present on all records, deprecated/AMA-only flags match the requested 4+4 IDs, and RBAC fingerprints are deterministic with `null` for empty role sets.

## ⚠️ WARNINGS
- Invalid schedule inputs are silently clamped: start week `<= 0` becomes week `1`, and duration `0` becomes `0.5h`. That is safe, but the UI gives no validation message.
- Summary-task rollups are fragile for future nested-task data: if child tasks are manually reordered by custom start weeks, the parent summary start anchors to the first child instead of the earliest child.

## ❌ FAIL

### 1) Start-week-only edits collapse duration to 0.5h
**Severity:** High  
**Owner:** K

**Repro:**
1. Open Step 5 and select a normal planner task.
2. In the detail panel, change only **Start Week**.
3. Leave **Duration** at its default value and save.
4. Reload/rebuild the plan.

**Expected:** Start week changes, duration stays unchanged.

**Actual:** The task is rebuilt as `0.5h` (`0.0125` weeks), which also compresses downstream scheduling.

**Evidence:** The persisted override record can contain `startWeek` without `overrideDuration`, but `buildDurationState()` still treats that entry as a duration override and sanitizes the missing duration to `0.5`.

### 2) Planner still includes non-connectors
**Severity:** High  
**Owner:** K

**Repro:**
1. Pass any `is_connector: false` record into the planner flow (example validated: `azure-security-benchmark`).
2. Build the Gantt plan.

**Expected:** Non-connectors should be filtered out by planner logic.

**Actual:** The planner generates task rows for the non-connector (validated result: 4 rows for `azure-security-benchmark`).

**Evidence:** `js/gantt-planner.js` does not read `is_connector` anywhere.

### 3) RBAC fingerprint deduplication is not implemented
**Severity:** Medium-High  
**Owner:** K

**Repro:**
1. Select two connectors with the same RBAC fingerprint (for example `azure-activity` and `azure-batch-account`).
2. Open Step 5 and inspect planner output.

**Expected:** Planner should consume `permissions.fingerprint` and deduplicate or mark shared RBAC work per the approved data contract.

**Actual:** No fingerprint-based logic runs; the planner never reads `permissions.fingerprint`, and no shared/deduped RBAC state is produced.

**Evidence:** `js/gantt-planner.js` contains no `fingerprint`, `shared`, or equivalent dedup handling.

## Final verdict
**REJECT**

### Fix assignment
- **K:** Fix the start-week persistence bug, add `is_connector` filtering in planner input handling, and implement/restore RBAC fingerprint dedup behavior in Step 5.
- **Sebastian:** No data fix required from this pass; the requested `solutions.json` changes validated successfully.
