# Luv — v1.0 QA Assessment: Blocker Report

**Date:** 2026-06-23T08:31:02+02:00  
**Agent:** Luv (Tester / QA)  
**Requested by:** Maria (madesous)  
**Verdict:** ⛔ **CONDITIONAL NO-GO** — 3 blockers must be resolved before v1.0 publish

---

## BLOCKERS — Must Fix Before v1.0

### B1 · selectedVendors default breaks recommendation semantics

**Severity:** High — functional correctness  
**Files:** `js/modules/solutions.js` L106, `js/app.js` L548–550

Every new user (no saved state) sees Azure and Microsoft 365 auto-selected in Step 2, causing hundreds of false-positive "Recommended" badges in Step 3. The K decision from 2026-05-22 explicitly requires removing these defaults.

**Code evidence:**
```js
// solutions.js L106
export const selectedVendors = new Set(['azure', 'microsoft365']);

// app.js L548-550 — restoreSelectedVendors() fallback
const vendorsToApply = markupSelections.length > 0
    ? markupSelections
    : ['azure', 'microsoft365'];   // ← always fires on fresh load
```

**Decision violated:** "Remove Azure and Microsoft 365 as default-selected vendors in Step 2 so Step 3 'Recommended' labels only reflect explicit customer selections." (2026-05-22, K)

**Fix required:**
1. `solutions.js` L106: change to `new Set()`
2. `app.js` L550: change fallback to `[]`

---

### B2 · `cribl-stream` solution has no planner or export data

**Severity:** High — data integrity / first-class feature  
**File:** `data/solutions.json`

Cribl is surfaced as a first-class vendor in Step 2 (dedicated vendor card). When selected, it auto-adds `cribl-stream` to Step 3. However, `cribl-stream` is the only solution missing **all three** of the mandatory enriched fields:

| Field | Status |
|---|---|
| `planner.setup_tasks` | ❌ missing |
| `export_metadata` | ❌ missing |
| `category` | ❌ missing |

**Impact:** When a user selects Cribl, the Gantt planner (Step 5) produces zero tasks for the Cribl solution group, and the Excel export row is incomplete/malformed.

**Fix required:** Sebastian to populate `cribl-stream` with setup tasks, export metadata, and category — same schema as other third-party solutions.

---

### B3 · 18 GCP connectors missing `planner.setup_tasks`

**Severity:** High — data integrity  
**File:** `data/solutions.json`

All 18 Google Cloud Platform connectors have no `planner.setup_tasks`, causing the Gantt planner to render empty solution groups if a user selects any GCP data source.

**Affected IDs:**
`google-cloud-platform-audit-logs`, `google-cloud-platform-big-query`, `google-cloud-platform-cdn`, `google-cloud-platform-cloud-monitoring`, `google-cloud-platform-cloud-run`, `google-cloud-platform-compute-engine`, `google-cloud-platform-dns`, `google-cloud-platform-firewall-logs`, `google-cloud-platform-iam`, `google-cloud-platform-ids`, `google-cloud-platform-load-balancer-logs`, `google-cloud-platform-nat`, `google-cloud-platform-resource-manager`, `google-cloud-platform-security-command-center`, `google-cloud-platform-sql`, `google-cloud-platform-vpc-flow-logs`, `google-kubernetes-engine`

**Fix required:** Sebastian to add GCP setup tasks. If GCP coverage is explicitly out of scope for v1.0, these solutions must either be hidden from the Step 3 catalog or show a clear "Planning data not yet available" message in the planner.

---

## WARNINGS — Should Fix Before v1.0

### W1 · React/ReactFlow contradicts documented architecture condition

**Severity:** Medium — architecture governance  
**Files:** `index.html` L7–10, `js/modules/topology.js` L848–849

Deckard's approved architecture condition (2026-05-19) states: **"No React Flow — Confirm no React/external framework in planner view; stay vanilla JS + DOM."** The topology module actively uses React, ReactDOM, and ReactFlow. While this may have been an implicit team decision for the topology step specifically, no formal reversal is documented in `decisions.md`.

Three CDN scripts (React 18, ReactDOM 18, ReactFlow 11) are loaded for every page view (~400 KB). All have SRI hashes, so supply-chain risk is mitigated.

**Action:** Document the decision to use ReactFlow for topology in `decisions.md` to close the governance gap.

---

### W2 · Topology layer box misclassification still present (known issue)

**Severity:** Medium — visual correctness  
**File:** `js/modules/topology.js` L2310

`createLayerBoxNodes()` classifies `cribl` and `pathBox` node types under the `transformation` layer box. Per the June 10 topology QA audit, this misclassification causes the Cribl node (rendered at its spatial position) to appear outside the transformation box, breaking the layer box visual accuracy.

```js
// L2310 — cribl and pathBox in transformation, should be collection
{ name: 'transformation', label: '🔄 PIPELINE & TRANSFORMATIONS',
  color: '#8b5cf6', types: new Set(['dcr', 'cribl', 'pathBox']), band: 'top' },
```

**Fix:** Move `cribl` and `pathBox` to the `collection`/`collection-bottom` layerConfig entries to match their spatial position in the rendered diagram.

---

### W3 · Inline HTML event handlers violate CSP-friendly requirement

**Severity:** Medium — security architecture  
**Files:** `index.html` L112, L115, L122, L128, L134

Five inline handlers (`onclick`, `onchange`) remain in the HTML markup for the workspace connection section. Rachael's v1 security requirement (2026-05-18) requires: *"no inline scripts, no `javascript:` URLs, no unsafe event handlers."* No CSP meta tag is defined at all.

The functions themselves are correctly exposed via `window.*` assignments in `app.js` (L2324–2328), so the feature works. But the inline handler pattern blocks any future CSP deployment.

**Fix:** Replace the five inline handlers with `addEventListener` calls in `app.js`; add a `<meta http-equiv="Content-Security-Policy">` tag.

---

### W4 · Production `console.log` / `console.info` in topology.js leaks connection state

**Severity:** Low-Medium — information disclosure  
**File:** `js/modules/topology.js` L807–818

Two production log calls fire on every topology render:
```js
console.log('[Topology] renderTopology state:', {
    connectedSolutionIds: Array.from(connectedSolutionIds), ...
});
console.info('[Topology] Input solutions:', ..., Array.from(connectedSolutionIds).slice(0, 10));
```

These dump workspace connection state (connected solution IDs) to the browser console on every Step 4 load. Not a critical leak (IDs are non-secret catalog strings), but violates production cleanliness.

**Fix:** Remove both calls. The `console.warn` at L2217 (de-collision diagnostic) and `gantt-planner.js` L7303 (invisible bars guard) are conditional/diagnostic and can remain.

---

### W5 · ExcelJS used instead of approved SheetJS — undocumented team decision

**Severity:** Low  
**Files:** `index.html` L12, `js/modules/export.js`

Deckard's architecture spec (2026-05-18) approved SheetJS as the export library. The implementation uses ExcelJS 4.4.0. ExcelJS is more capable and has an SRI hash. No formal team decision reversal is documented.

**Action:** Add a short decisions.md entry confirming ExcelJS as the team's intentional choice.

---

## NOTES — Minor Observations

**N1 · mitre.js injects catalog names and GitHub data into innerHTML without escaping**  
`conn.name` (solution names, L395) and MITRE technique IDs `te` (from GitHub YAML, L380) are template-interpolated into `innerHTML`. Practical risk is low — solution names come from the controlled catalog and technique IDs are standard `T1234.001` strings — but no escaping is applied. No `escapeHtml` wrapper used (unlike `app.js`). Consider applying `escapeHtml` for defense-in-depth.

**N2 · No Content Security Policy defined**  
No `<meta http-equiv="Content-Security-Policy">` tag. Related to W3 above. Without a CSP, no defense-in-depth for XSS exists. SRI hashes on CDN scripts provide supply-chain protection but not injection protection.

**N3 · GANTT_TABLE_COLUMN_WIDTHS key name misleading**  
Key is `sentinelPlanner.ganttTableColumnWidths.session.v1` but stored in `localStorage`, not `sessionStorage`. Despite the "session" label, widths persist across browser restarts. This is probably the intended behavior (per K decision on column widths), but the key name creates confusion.

**N4 · `resumeButton.onclick` uses deprecated property assignment**  
`app.js` L407, L413: uses `.onclick = ...` instead of `addEventListener`. Functionally identical but inconsistent with the rest of the codebase.

**N5 · workspaceConnectionState stale data**  
`CONNECTED_SOLUTIONS_STORAGE_KEY` is written on workspace connection (persist path) but NOT read back on startup (`restoreSolutionIds` is only called for `SELECTED_SOLUTIONS_STORAGE_KEY`). The June 2 audit bug (unintentional rehydration) appears **fixed**. Confirmed.

---

## Publish Readiness Checklist

| Area | Status | Finding |
|---|---|---|
| Wizard navigation (Steps 1–5) | ✅ | Flow logic intact |
| Step 3 recommendation logic | ❌ | B1: false-positive defaults |
| Step 3 search/filter | ✅ | No blocking issues found |
| Step 4 topology rendering | ⚠️ | W2: layer box overlap, W4: debug logs |
| Step 5 Gantt task rendering | ⚠️ | B2/B3: empty groups for Cribl/GCP |
| Step 5 inline editing | ✅ | Business-day logic, persistence intact |
| Step 5 dependency arrows | ✅ | No blocking issues found |
| Excel export | ⚠️ | B2/B3: empty/malformed rows for Cribl/GCP |
| solutions.json integrity | ❌ | B2, B3: missing fields (19 solutions) |
| SRI hashes on CDN | ✅ | All 6 CDN resources have valid hashes |
| Security (innerHTML) | ⚠️ | N1: mitre.js unescaped, low practical risk |
| Security (inline handlers) | ⚠️ | W3: 5 inline handlers remain |
| No CSP header | ⚠️ | W3/N2: not defined |
| Console cleanup | ⚠️ | W4: debug logs in topology.js |
| Architecture conformance | ⚠️ | W1: ReactFlow undocumented, W5: ExcelJS undocumented |
| Dark theme consistency | ✅ | CSS variable system present and consistent |
| Accessibility | ✅ | aria-label, aria-live, role attributes in place |
| localStorage reset | ✅ | Clears all sentinelPlanner.* keys correctly |
| Session token handling | ✅ | sessionStorage-scoped, cleared on tab close |
| External links | ✅ | rel="noopener noreferrer" applied |

---

## Recommended Path to v1.0 GO

1. **Fix B1** (30 min, K): Remove azure/microsoft365 vendor defaults — two-line change.
2. **Fix B2** (2–4h, Sebastian): Populate cribl-stream with setup_tasks, export_metadata, category.
3. **Fix or scope B3** (2–8h, Sebastian): Either add GCP setup tasks, OR hide GCP connectors from Step 3 with a "coming soon" state.
4. **Fix W4** (15 min, K): Remove 2 console.log/info calls from topology.js L807–818.
5. **Document W1, W5** (15 min, Deckard/K): Add decisions.md entries for ReactFlow topology adoption and ExcelJS.

W2 (layer box overlap) and W3 (inline handlers) are quality improvements but do not block initial publication to internal users.
