# Decision: Cribl Default Routing for Eligible Connectors

**Date:** 2026-06-15T12:10:52+02:00  
**Author:** K  
**Status:** Implemented  
**File:** `js/modules/topology.js`

---

## Context

When a user selects Cribl Stream (Step 2) and then adds a `cribl_eligible` connector (e.g. Barracuda) without opening its sizing drawer, the topology was incorrectly placing a collector VM on that connector path instead of routing it through Cribl Stream.

The Solutions UI (`solutions.js`) already defaults `criblIngestion: true` for eligible connectors when no sizing has been saved — but `isCriblRoutedSolution` in `topology.js` only read the persisted `criblIngestion` flag, which is absent until the sizing drawer is opened and saved. This created a state-presence asymmetry between the two layers.

---

## Decision

`isCriblRoutedSolution` was extended to accept a third parameter `criblActive: boolean` and now applies a three-priority resolution:

1. **Explicit user preference (`criblIngestionExplicit: true`)** — return the saved `criblIngestion` value in either direction (opt-in or opt-out both respected).
2. **Saved sizing with `criblIngestion: true`** (no explicit flag) — return `true`.
3. **Default fallback** — return `criblActive && solution.cribl_eligible === true`.

Priority 3 makes topology behavior match the Solutions UI default: eligible connectors route through Cribl when the environment is active, even with no sizing data saved.

---

## Callsite Details

- `hasStandaloneCriblSelection` (line 812, render scope) is already a boolean that is `true` when `cribl-stream` is among selected solutions.
- `splitSolutionsByRoute` is a closure inside the same render scope and reads `hasStandaloneCriblSelection` via closure — no argument threading required.
- The two filter calls (lines 1219-1220 after fix) now pass `hasStandaloneCriblSelection` as the third argument.
- Line 1578 (`criblRoutedRows`) filters `row.route` which is set at layout-build time and was not a call site — no change needed there.

---

## Test Scenario

1. Select Cribl in Step 2.
2. Select Barracuda (syslog/CEF, `cribl_eligible: true`) in Step 3.
3. Navigate directly to topology (Step 4) without opening Barracuda's sizing drawer.
4. **Expected:** Barracuda routes Source → Cribl Stream → Custom DCR → Sentinel (no collector VM).
5. **Before fix:** Barracuda appeared with a collector VM in the collection layer.

---

## Files Changed

- `js/modules/topology.js` — `isCriblRoutedSolution` (line 108), filter calls (lines 1219-1220)
