# Cribl Routing QA Assessment
**Reviewer:** Luv (Tester / QA)
**Date:** 2026-06-26
**Requested by:** Maria
**Scope:** Cribl routing logic across topology.js, gantt-planner.js, solutions.js, capacity.js

---

## EXECUTIVE SUMMARY

The core Cribl routing logic from the current fix is **structurally correct**. The original bugs (Windows showing AMA Agent when Cribl-routed; Barracuda forced through Cribl when AMA selected) are resolved. However, two new issues were found — one **high-severity architectural bug** (split module state due to mismatched import version numbers) and two medium/minor cosmetic gaps.

**Verdict: CONDITIONAL GO** — the routing logic is correct and safe to ship, but the import version mismatch must be addressed as a follow-up, as it is likely already causing intermittent stale-state bugs beyond just Cribl.

---

## SECTION 1 — SCENARIO TEST RESULTS

| # | Scenario | Verdict | Notes |
|---|----------|---------|-------|
| 1 | Cribl vendor selected, cribl_eligible solution, first-time sizing drawer | **PASS** | `buildDraft(null)` sets `criblIngestion: false`, `criblIngestionExplicit: false`. Checkbox renders unchecked. |
| 2 | User saves WITH Cribl checked | **PASS** | `collectDraft` saves `criblIngestion: true, criblIngestionExplicit: true`. `isCriblRoutedSolution` returns `true`. Topology routes to Cribl node. Source shows "🔀 Cribl Stream". |
| 3 | User saves WITHOUT Cribl checked | **PASS** | `collectDraft` saves `criblIngestion: false, criblIngestionExplicit: true`. `isCriblRoutedSolution` returns `false` (AND condition fails). Topology routes to standard path. Source shows "📡 AMA Agent". |
| 4 | Cribl vendor NOT selected, cribl_eligible solution | **PASS** | `isCriblEligibleForSolution` returns `false` (vendor check fails). No checkbox shown. `isCriblRoutedSolution` returns `false` (criblActive guard). |
| 5 | Cribl vendor selected then deselected | **PASS** | `syncCriblEnvironmentSelection({ clearCapacity: true })` calls `clearConnectorCriblIngestion()` which deletes `criblIngestion` AND `criblIngestionExplicit` from both `solutionGroupEntries` (firewall/linux path) and `connectorSizing` assignments (windows path). Both code paths are covered. |
| 6 | Windows via Cribl | **PASS** | Source node pool section renders `"🔀 Cribl Stream"` (not `"📡 AMA Agent"`). Arc Agent row is suppressed by `showArcAgent && !isCriblRoute` guard. Source-to-Cribl edge is pushed; early `return` prevents server node creation. |
| 7 | Syslog/CEF via Cribl | **PASS (routing)**; **FAIL (label)** | Edge routes correctly to Cribl node via early return. However, the source node box shows no route label at all — no "🔀 Cribl Stream" text visible inside the syslog source box. See Bug #1. |
| 8 | Linux server via Cribl | **PASS (routing)**; **FAIL (label)** | Same label gap as scenario 7. Edge routing is correct; source box is silent about the route. See Bug #1. |
| 9 | Event Hub path | **PASS** | `PATH_CONFIGS.event_hub.pathBoxes` is `[{ icon: '📨', label: 'Event Hub' }]` — exactly one box, no "Ingestion Pipeline" entry. ✓ |
| 10 | Barracuda Cloud Gen (connectors:0, cribl_eligible:true, fieldPack:"syslog-cef") | **PASS** | Topology filter: `connectors:0` fails `>0` check, but `fieldPack:"syslog-cef"` is truthy — Barracuda passes through. `classifySolution` maps it to `syslog_cef` via `syslog/cef` tag check. Gantt planner: `isGeneratedPlanCriblRoutedSolution` gates on `fieldPack === 'syslog-cef'` — correct. Without explicit Cribl save, routes standard. With Cribl save, gets `CRIBL-INFRA-02` join dependency. |
| 11 | Mixed: some solutions Cribl, some AMA | **PASS** | `splitSolutionsByRoute` correctly partitions into `ROUTE_STANDARD` and `ROUTE_CRIBL` entries. Both rows are added to `zoneRows`, both bands are populated. `buildSharedPlans` uses `cloneZoneLayoutsForRoute` to build separate DCR plans. Both paths render simultaneously. |
| 12 | Cribl DCR capacity | **PASS** | `criblDcrCapacity` aggregates from `criblSyslogDcrPlan.totalEps`, `criblWindowsDcrPlan` req/min, and `criblLinuxDcrPlan` req/min. DCR node shows combined capacity label. |

---

## SECTION 2 — CONSISTENCY CHECK

### isCriblRoutedSolution (topology) vs isGeneratedPlanCriblRoutedSolution (gantt)

Both functions use the identical predicate:
```
Boolean(profile?.values?.criblIngestionExplicit) && Boolean(profile?.criblIngestion)
```

**Consistent.** ✓

The gantt function additionally gates on `fieldPack === 'syslog-cef'`. This is intentional — it only affects generated-task infrastructure dependencies. Windows and Linux solutions don't use fieldPack-based generated tasks in the planner, so the restriction does not cause missing dependencies for those types.

### criblIngestionExplicit storage round-trip

| Profile type | Save path | Read path | Consistent? |
|---|---|---|---|
| `firewall` (syslog-cef) | `updateConnectorCapacityEntries` → `sizing.criblIngestionExplicit` | `normalizeSizingValues('firewall')` → `profile.values.criblIngestionExplicit` | ✓ |
| `linux` | Same path | `normalizeSizingValues('linux')` → `profile.values.criblIngestionExplicit` | ✓ |
| `windows` | `connectorSizing[id].criblIngestionExplicit` (assignment, not pool) | Profile builds `values: { ...pool_values, criblIngestion, criblIngestionExplicit }` explicitly at line 1002 | ✓ |

All three types correctly round-trip both fields.

### collectDraft → criblIngestionExplicit

`collectDraft` sets `criblIngestionExplicit: criblEligible` for all three profile types. `criblEligible` is true whenever the drawer renders the Cribl checkbox (vendor selected + cribl_eligible + profile type in `CRIBL_ELIGIBLE_PROFILE_TYPES`). This means "I explicitly decided about Cribl" is recorded on every save, even if the checkbox was left unchecked. This is the correct sentinel value that enables reliable opt-in/opt-out behaviour.

### Vendor deselection clears Cribl

`syncCriblEnvironmentSelection` is called with `clearCapacity: !isCriblEnvironmentSelected()` at:
- `app.js:530` (after vendor toggle)
- `solutions.js:3554` and `solutions.js:3569` (vendor UI handlers)

`clearConnectorCriblIngestion` removes both fields from `solutionGroupEntries` (firewall/linux) and `connectorSizing` assignments (windows). **Consistent and complete.** ✓

---

## SECTION 3 — BUGS FOUND

---

### 🔴 BUG-1 (HIGH) — Import version mismatch splits module state

**Location:** All top-level imports across the codebase

**Description:**
Each ES module import URL is the browser's cache key. Files currently import `gantt-planner.js` at three different version numbers:

| File | Version imported |
|---|---|
| `app.js` | `gantt-planner.js?v=29` |
| `topology.js` | `gantt-planner.js?v=18` |
| `solutions.js` | `gantt-planner.js?v=17` |
| `export.js` | `gantt-planner.js?v=17` |

And `solutions.js`:

| File | Version imported |
|---|---|
| `app.js` | `solutions.js?v=21` |
| `topology.js` | `solutions.js?v=19` |
| `search.js` | `solutions.js?v=19` |

**Effect:** Each distinct `?v=X` import URL results in a **separate module instance** in the browser. Each instance has its own in-memory `durationOverrideState` cache. When `solutions.js` saves Cribl sizing (via `gantt-planner.js?v=17`) or clears it (via `clearConnectorCriblIngestion`), it updates `?v=17`'s in-memory state AND writes to `localStorage`. When topology re-renders (via `gantt-planner.js?v=18`), if `?v=18`'s `durationOverrideState` is already cached from a previous render, it returns **stale pre-save data** — never seeing the Cribl change.

**Concrete failure mode:** User on Step 4 (Topology), navigates back to Step 2, saves Cribl sizing for a Windows connector, returns to Step 4. The `capacity-changed` event fires → `renderTopologyStep` → `getConnectorCapacitySnapshot` from `?v=18` — returns stale state, Windows still shows AMA Agent.

**Fix:** All files must import the same `?v=N` for the same module. When gantt-planner.js is updated to `?v=29` in `app.js`, update `topology.js`, `solutions.js`, and `export.js` to match. Same for `solutions.js` across all importers.

**Assigned to:** Developer who owns the fix for the Cribl routing changes (these version numbers may have diverged during the three rounds of fixes).

---

### 🟡 BUG-2 (MEDIUM) — Syslog/CEF and Linux source nodes have no Cribl route label

**Location:** `SourceNode` component, `topology.js` ~line 2583–2633

**Description:**
For `windows_events` type, the source node renders inside each pool section:
```
!isCriblRoute ? "📡 AMA Agent" : "🔀 Cribl Stream"
```
This correctly labels the route for Windows.

For `syslog_cef` and `linux_server` types, `isWindows = false`, so `sourceContent = standardContent = [...items]` — just solution name badges. No route label is ever shown. A user looking at a Syslog/CEF source box that routes through Cribl sees the same box as one routing via AMA — indistinguishable except for the edge direction.

**Expected:** Source node for Cribl-routed syslog/CEF and Linux types should display "🔀 Cribl Stream" (analogous to Windows).

**Severity:** Medium — confusing UX; routing is functionally correct.

**Not a regression** from the current fix, but newly noticed during this review.

---

### 🟡 BUG-3 (MINOR) — Windows Cribl route shows "×0 Windows Servers" in pool section

**Location:** `buildWindowsSourcePools`, `buildServerIndicatorsForGroup`, `topology.js`

**Description:**
When Windows sizing is saved with Cribl enabled, the server count fields are hidden and nothing is entered. The pool is created with `serverCount: 0`. When the topology renders the Windows source node, the pool indicator shows `×0 Windows Servers`.

This is confusing: "0 servers" implies nothing is scoped, but the Cribl label below it says "🔀 Cribl Stream." A user might wonder if any servers are actually being routed.

**Expected:** When `isCriblRoute` is true for a Windows pool, either suppress the server count badge (show nothing or "—") or replace with "EPS via Cribl" if EPS data is available.

**Severity:** Minor cosmetic.

---

## SECTION 4 — EDGE CASES FLAGGED

1. **Cribl vendor selected but no cribl_eligible solution selected:** `hasStandaloneCriblSelection = true` but `topologySolutions = []` after filtering. The standalone Cribl node code at line 819–825 handles this correctly by rendering a minimal Cribl-only topology. ✓

2. **All solutions switch from standard to Cribl mid-session:** `splitSolutionsByRoute` returns only a `ROUTE_CRIBL` entry; `standardSolutions.length === 0` → no standard path row. Standard DCR plan is null. No orphaned DCR nodes. ✓

3. **Cribl Windows solution with no saved sizing yet (first open):** `profile.values = null`, `criblIngestion = false`. `isCriblRoutedSolution` returns `false`. Solution goes to standard path. No Cribl edge. This is correct — no implicit routing before the user has decided. ✓

4. **`validateSizingDraft` for Windows with criblIngestion: true:** Server count and onPremPercent are skipped. `isValid = true`. `computeSizingResult` yields `vmCount: 0`. This is consistent with "Cribl handles collection — no VMs needed." ✓

5. **Mixed Windows pool sharing + Cribl:** If solution A uses pool P1 and solution B uses pool P1 too (shared pool), but only A has `criblIngestion: true` on its assignment — `isCriblRoutedSolution` checks the assignment, not the pool. Only A gets Cribl-routed. B stays standard. They would appear in different source rows (different `route`). The pool ownership stays intact but the two solutions diverge in routing. This is a valid but potentially confusing scenario that the UI should warn about. Not blocked, but worth noting.

6. **Barracuda with `connectors:0, fieldPack:"syslog-cef"` and Cribl NOT selected:** Filter passes via `fieldPack`. `isCriblRoutedSolution` returns `false` (criblActive = false). Standard syslog path. Correct. ✓

---

## SECTION 5 — VERDICT

| Item | Status |
|---|---|
| Core routing logic (opt-in only, no implicit Cribl) | ✅ CORRECT |
| Windows source node label (AMA vs Cribl) | ✅ FIXED |
| Arc Agent hidden for Windows Cribl | ✅ FIXED |
| Event Hub — no "Ingestion Pipeline" box | ✅ FIXED |
| Syslog/CEF and Linux edge routing | ✅ CORRECT |
| Barracuda appears in topology + tasks | ✅ CORRECT |
| Cribl DCR capacity aggregation | ✅ CORRECT |
| Vendor deselect clears Cribl state | ✅ CORRECT |
| Import version mismatch (module state split) | 🔴 BUG — follow-up required |
| Syslog/CEF and Linux source label gap | 🟡 NOT BLOCKED — cosmetic |
| Windows ×0 server count with Cribl | 🟡 NOT BLOCKED — cosmetic |

### FINAL VERDICT: **CONDITIONAL GO**

The Cribl routing logic is correct and the original bugs (AMA label when Cribl, Barracuda forced Cribl) are fixed. The current code is safe to use.

The import version mismatch (Bug #1) is a pre-existing architectural issue that has likely been causing intermittent stale-data renders throughout the app, not just for Cribl. It must be fixed but is not new to this round of changes. It should be addressed as a targeted follow-up: align all `?v=N` import params for `gantt-planner.js` and `solutions.js` to a single consistent number across all importing files.

---

*Report filed by Luv — Tester / QA*
