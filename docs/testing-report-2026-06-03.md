# QA Testing Report — 2026-06-03

**Prepared by:** Luv (QA Tester)  
**Scope:** Exhaustive quality pass — topology visualization, connector persistence, `gantt-tasks.js` engine, solutions data, solutions module, general app structure, cross-module integration  
**Files reviewed:** `js/modules/topology.js`, `js/modules/gantt-tasks.js`, `js/app.js`, `js/modules/solutions.js`, `js/gantt-planner.js` (imports only), `data/solutions.json`, `index.html`

---

## Executive Summary

**4 bugs confirmed** (1 critical, 3 high/medium). **8 issues** across security, data consistency, and architecture. **5 improvement opportunities**.

The most severe finding is that `gantt-tasks.js` — the newly-built Gantt task engine — is **completely disconnected from the application**. No file imports it. The entire module is dead code.

---

## Bugs

### B-001 🔴 CRITICAL — `gantt-tasks.js` not imported anywhere; entire engine is dead code

**Files:** `js/modules/gantt-tasks.js`, `js/gantt-planner.js`, `js/app.js`

`gantt-planner.js` imports from `capacity.js` and `scoring.js` but does **not** import `gantt-tasks.js`. `app.js` also does not import it. A `grep` across the entire `js/` directory confirms zero files import `gantt-tasks.js` — the module header's JSDoc example comment is the only reference.

All exported functions (`buildGanttPlan`, `calculatePlanDuration`, `formatTaskDuration`, `parseDurationToHours`, `getPackInfraTaskIds`, `getPackJoinTaskId`) are unreachable.

**Impact:** The new task-generation engine never runs. The Gantt planner continues using the old `gantt-planner.js` logic exclusively.

**Fix required:** Import and wire up `gantt-tasks.js` exports in `gantt-planner.js` where the plan is built and rendered.

---

### B-002 🟠 HIGH — `CEF-INFRA-05` has wrong dependency — skips `CEF-INFRA-04`

**File:** `js/modules/gantt-tasks.js` (TASK_CATALOG, ~line 205)

```js
'CEF-INFRA-05': { dependsOn: ['CEF-INFRA-03'], ... }
// Should be:
'CEF-INFRA-05': { dependsOn: ['CEF-INFRA-04'], ... }
```

The intended linear chain is `01 → 02 → 03 → 04 → 05`. With the current config, `CEF-INFRA-04` and `CEF-INFRA-05` are parallel children of `CEF-INFRA-03`. `CEF-INFRA-05` can start before `CEF-INFRA-04` finishes — which is functionally wrong (e.g., if 04 is "Deploy CEF agent" and 05 is "Validate CEF agent", you can't validate before deploying).

**Impact:** Incorrect critical path; task scheduling is out of order for CEF/Syslog field pack. Would produce wrong Gantt timeline once the engine is connected.

**Fix:** Change `CEF-INFRA-05.dependsOn` from `['CEF-INFRA-03']` to `['CEF-INFRA-04']`.

---

### B-003 🟠 HIGH — `microsoft-sysmon-for-linux` has a 3-way classification conflict

**Files:** `js/modules/topology.js`, `js/modules/gantt-tasks.js`, `data/solutions.json`

| Source | Classification |
|--------|---------------|
| `topology.js` `LINUX_SERVER_IDS` | `linux_server` flow (shows as Linux in topology) |
| `gantt-tasks.js` `WINDOWS_AMA_IDS` | Windows AMA field pack (gets Windows AMA infra tasks) |
| `solutions.json` `fieldPack` | `syslog-cef` |

All three disagree. The connector is *Microsoft Sysmon for Linux*, a Linux-side AMA-based connector. It should be `linux_server` in topology and either `windows-ama` or `syslog-cef` for task planning — but not all three different values simultaneously.

**Impact:** Topology shows the connector in the Linux Server flow, but once `gantt-tasks.js` is wired up, it would generate Windows AMA infra tasks for it. The `fieldPack` in `solutions.json` (`syslog-cef`) would be ignored entirely since `gantt-tasks.js` ignores the explicit `fieldPack` field.

**Fix:** Align all three. For a Linux-only AMA connector, correct classification is probably `linux_server` (topology) and `windows-ama` or a new `linux-ama` pack (tasks). Remove from `WINDOWS_AMA_IDS`, keep in `LINUX_SERVER_IDS`, update `solutions.json` fieldPack accordingly.

---

### B-004 🟡 MEDIUM — `WFE` abbreviation collision in `KNOWN_ABBREVS`

**File:** `js/modules/gantt-tasks.js` (KNOWN_ABBREVS, ~line 683)

```js
'windows-forwarded-events':         'WFE',
'windows-forwarded-events-via-ama': 'WFE',  // collision
```

Both connectors share the abbreviation `WFE`. The runtime deduplication counter will rename one to `WFE-2`, but which one gets the suffix is non-deterministic (depends on iteration order). Both connectors can legitimately appear in the same plan (they're separate connectors).

**Fix:** Assign distinct abbreviations, e.g. `'WFE'` and `'WFE-AMA'`.

---

## Issues

### I-001 🟠 HIGH (Security) — React, ReactDOM, and ReactFlow CDN URLs lack SRI hashes

**File:** `index.html` (lines 7–10)

```html
<!-- No integrity= attribute: -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/reactflow@11/dist/umd/index.js" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://unpkg.com/reactflow@11/dist/style.css">
```

frappe-gantt and exceljs already have correct SRI hashes. The React/ReactFlow scripts don't. Per `decisions.md`, all CDN URLs must be pinned with SRI hashes. Without SRI, a compromised CDN could serve malicious JavaScript that runs as a first-party script.

**Fix:** Generate and add `integrity="sha384-..."` for each unpkg.com resource, or pin to exact content-addressed URLs (e.g. `unpkg.com/react@18.3.1/...`).

---

### I-002 🟡 MEDIUM — `gantt-tasks.js` ignores the explicit `fieldPack` field from `solutions.json`

**Files:** `js/modules/gantt-tasks.js` (`inferFieldPack()`), `data/solutions.json`

`solutions.json` has an explicit `fieldPack` property on 43 solutions (e.g., `linux-syslog: 'syslog-cef'`, `windows-security-events: 'windows-ama'`). The `inferFieldPack()` function in `gantt-tasks.js` re-derives the field pack from `server_population_kind`, `cribl_eligible`, and `tags` — it does **not** read `solution.fieldPack`.

The explicit `fieldPack` field in `solutions.json` is therefore orphaned: defined but never consumed.

**Impact (when engine is wired):** The 43 explicitly-tagged solutions may get different field packs at runtime than what `solutions.json` specifies, since `inferFieldPack()` uses different logic. Only 9% of solutions have an explicit `fieldPack`; the other 91% are inferred at runtime anyway.

**Fix:** In `inferFieldPack()`, check `solution.fieldPack` first and return it if present, falling through to inference only if absent. This makes the explicit field authoritative.

---

### I-003 🟡 MEDIUM — Duration override storage key excluded from reset

**Files:** `js/app.js` (PLANNER_STORAGE_KEYS), `js/gantt-planner.js` (DURATION_OVERRIDE_STORAGE_KEY)

`gantt-planner.js` defines `DURATION_OVERRIDE_STORAGE_KEY = 'sentinelPlanner.taskDurationOverrides.v1'`. The `clearPlannerLocalStorage()` function in `app.js` clears all keys in `PLANNER_STORAGE_KEYS`, but this key is not in that list.

**Impact:** Custom task durations survive a "Reset saved progress" action. Users who click Reset expecting a clean slate will retain their duration overrides.

**Fix:** Add `'sentinelPlanner.taskDurationOverrides.v1'` to `PLANNER_STORAGE_KEYS` in `app.js`. Note: the two files should ideally share a constant rather than hardcode the key string in two places.

---

### I-004 🟡 MEDIUM — Connected solutions persist to localStorage despite session-only intent

**Files:** `js/modules/solutions.js` (`setConnectedSolutionIds`, `persistConnectedSolutionIds`), `js/app.js` (DOMContentLoaded restore)

`setConnectedSolutionIds()` calls `persistConnectedSolutionIds()` which writes to `localStorage`. On startup, `app.js` reads `CONNECTED_SOLUTIONS_STORAGE_KEY` back and restores it. This means workspace-connected solutions survive a page reload.

Per prior QA history, the intent was for connected solutions to be session-only (only valid while the user has an active workspace connection). Restoring stale connector state from a previous session can show connectors as "already deployed" when that workspace is no longer connected.

**Fix (if spec requires session-only):** Use `sessionStorage` for `CONNECTED_SOLUTIONS_STORAGE_KEY` instead of `localStorage`, or clear the key on page load before restoring. Do not call `persistConnectedSolutionIds()` unless the workspace connection is active.

---

### I-005 🟡 MEDIUM — `inferFieldPack()` fallback silently misclassifies API/cloud connectors

**File:** `js/modules/gantt-tasks.js` (`inferFieldPack()`)

The fallback case in `inferFieldPack()` returns `FIELD_PACK.SYSLOG_CEF` for any connector that doesn't match Azure native, Cribl, Windows, WEC, or custom-logs patterns. This means API/cloud connectors (e.g., CrowdStrike, Okta, Zscaler cloud API) that lack Azure tags get assigned Syslog/CEF infra tasks (Linux forwarder VM, Rsyslog config, etc.).

**Impact (when engine is wired):** Cloud-native API connectors would trigger unnecessary Syslog infrastructure tasks.

**Fix:** Add a specific `direct` or `api` case for connectors with no on-premises infrastructure requirement. Cloud connectors with `azure_native` topology type should return a `null` or `FIELD_PACK.NONE` pack (infra-free).

---

### I-006 🟡 MEDIUM — No Content Security Policy

**File:** `index.html`

No `<meta http-equiv="Content-Security-Policy">` tag is present. Given that the app loads from 4 external CDN domains (unpkg.com, jsdelivr.net, cdnjs.cloudflare.com, raw.githubusercontent.com) and uses ES module scripts, a CSP would provide defense-in-depth against XSS.

**Fix:** Add a CSP meta tag permitting only the known CDN origins for scripts and styles, and restricting inline scripts if possible.

---

### I-007 🔵 LOW — `getSourceHandleForBand` and `getFlowSourceHandleForBand` are identical — one is dead code

**File:** `js/modules/topology.js` (lines 966–967)

```js
const getSourceHandleForBand = (band = 'top') => (band === 'bottom' ? HANDLE_IDS.sourceTop : HANDLE_IDS.sourceBottom);
const getFlowSourceHandleForBand = (band = 'top') => (band === 'bottom' ? HANDLE_IDS.sourceTop : HANDLE_IDS.sourceBottom);
```

Identical implementation. `getSourceHandleForBand` is used at line 983 (`buildSourceToMiddleEdge`). `getFlowSourceHandleForBand` is used at line 974. One should call the other, or they should be merged.

**Fix:** Delete `getFlowSourceHandleForBand` and update its call site to use `getSourceHandleForBand`.

---

### I-008 🔵 LOW — `cribl` not in `FLOW_BAND_ORDER`; gets implicit sort-last fallback

**File:** `js/modules/topology.js` (FLOW_BAND_ORDER, ~line 83)

`FLOW_BAND_ORDER` has 8 entries but no `cribl` key. Cribl-routed rows get `?? 99` at sort time (line 1155), placing them last in the zone. This may be intentional (Cribl rows below standard rows) but the intent is implicit.

**Fix:** Either add `cribl: 8` explicitly, or add a comment on the `?? 99` fallback documenting that Cribl rows intentionally sort last.

---

## Improvement Suggestions

### P-001 — `solutions.json` fieldPack coverage is only 9% (43 of 489 solutions)

Only 43 solutions have an explicit `fieldPack` value. The remaining 446 rely on runtime inference. Once `gantt-tasks.js` is wired up, most connectors will be inference-classified. Expanding explicit `fieldPack` coverage to all connectors with known infrastructure requirements would make classification auditable in the data layer and reduce reliance on `inferFieldPack()` heuristics.

---

### P-002 — `fetchSolutionVersion` has no timeout and no cache invalidation strategy

**File:** `js/modules/solutions.js` (`fetchSolutionVersion`)

Each call fetches `ReleaseNotes.md` from `raw.githubusercontent.com` per solution. There's a per-session memory cache but no `max-age` or stale-while-revalidate. Slow network or a GitHub outage could leave version badges in a perpetual loading state with no user feedback.

**Suggestion:** Add an `AbortController` with a 5–10 second timeout. On network error, show a subtle "version unavailable" state rather than silently leaving the badge blank.

---

### P-003 — Three layout passes in `renderTopology` could be reduced to two

**File:** `js/modules/topology.js` (lines 1367, 1457, 1462)

The topology layout engine runs `buildAllBandLayouts` up to 3 times:  
1. First pass with `startY + 900` (hardcoded provisional bottom-band Y)  
2. Second pass with corrected `finalBottomBandStartY`  
3. Third pass if `alignedSentinelCenterX` differs from `provisionalSentinelCenterX` by > 1px  

The third pass triggers when the center X changes after the second layout. A better initial estimate for bottom-band start Y (based on actual source node heights from the first pass) might eliminate the need for 3 passes. Not a correctness bug, but worth revisiting for performance when many connectors are selected.

---

### P-004 — `window.connectedWorkspace` / `window.connectedSolutions` global pollution

**File:** `js/app.js` (lines 444–445)

```js
window.connectedWorkspace = workspaceConnectionState.selectedWorkspace;
window.connectedSolutions = Array.from(connectedIds);
```

These globals are set during workspace connection but not consumed by any other module (they appear to be debugging aids or legacy). They pollute the global namespace.

**Suggestion:** Remove these assignments, or if external consumers exist, export a getter function instead.

---

### P-005 — `calculatePlanDuration` and `computeCriticalPath` duplicate topological traversal

**File:** `js/modules/gantt-tasks.js`

Both `calculatePlanDuration` and `computeCriticalPath` independently implement `getFinishTime` (a memoized topological traversal). If the traversal logic ever diverges between the two copies, they'll produce inconsistent results.

**Suggestion:** Extract `buildFinishTimeMap(tasks)` as a shared helper, and have both functions call it.

---

## Data Validation Notes (`data/solutions.json`)

| Check | Result |
|-------|--------|
| Total solutions | 489 |
| Solutions with explicit `fieldPack` | 43 (9%) |
| Solutions with `ganttTaskOverrides` | 7 |
| `windows-security-events` duplicate `setup_tasks` block | ✅ Not present (prior bug fixed) |
| `fieldPack` distribution | syslog-cef: 31, windows-ama: 4, wec-wef: 2, ama-custom-logs: 5, cribl-intermediary: 1 |
| `microsoft-sysmon-for-linux` fieldPack | `syslog-cef` (conflicts with gantt-tasks.js WINDOWS_AMA_IDS) |

---

## Cross-Module Integration Matrix

| Connector | topology.js | gantt-tasks.js | solutions.json fieldPack | Status |
|-----------|-------------|----------------|--------------------------|--------|
| `microsoft-sysmon-for-linux` | `linux_server` | `WINDOWS_AMA` | `syslog-cef` | ❌ 3-way conflict (B-003) |
| `windows-forwarded-events` | `windows_events` | `WEC_WEF` | `wec-wef` | ✅ Consistent |
| `windows-forwarded-events-via-ama` | `windows_events` | `WEC_WEF` (`WFE` abbrev collision) | `wec-wef` | ⚠️ Abbreviation bug (B-004) |
| `linux-syslog` | `syslog_cef` | `SYSLOG_CEF` | `syslog-cef` | ✅ Consistent |
| `windows-security-events` | `windows_events` | `WINDOWS_AMA` | `windows-ama` | ✅ Consistent |
| `cribl-stream` | `cribl` (special) | `CRIBL` | `cribl-intermediary` | ✅ Consistent |
| API connectors (CrowdStrike, Okta, etc.) | `api` / `direct` | `SYSLOG_CEF` (fallback) | `(none)` | ⚠️ Misclassified (I-005) |

---

## Summary Table

| ID | Severity | Type | Title |
|----|----------|------|-------|
| B-001 | 🔴 Critical | Bug | `gantt-tasks.js` not imported — entire engine is dead code |
| B-002 | 🟠 High | Bug | CEF-INFRA-05 depends on CEF-INFRA-03, skips CEF-INFRA-04 |
| B-003 | 🟠 High | Bug | `microsoft-sysmon-for-linux` 3-way classification conflict |
| B-004 | 🟡 Medium | Bug | `WFE` abbreviation collision for two distinct connectors |
| I-001 | 🟠 High | Security | React/ReactFlow CDN URLs missing SRI integrity hashes |
| I-002 | 🟡 Medium | Data | `inferFieldPack()` ignores explicit `fieldPack` from solutions.json |
| I-003 | 🟡 Medium | UX | Duration override key excluded from reset storage clear |
| I-004 | 🟡 Medium | Spec | Connected solutions persist to localStorage (session-only intent) |
| I-005 | 🟡 Medium | Logic | `inferFieldPack()` fallback misclassifies API/cloud connectors as syslog-cef |
| I-006 | 🟡 Medium | Security | No Content Security Policy in index.html |
| I-007 | 🔵 Low | Code | Duplicate `getSourceHandleForBand` / `getFlowSourceHandleForBand` functions |
| I-008 | 🔵 Low | Code | `cribl` missing from `FLOW_BAND_ORDER` (implicit sort-last) |
| P-001 | — | Improvement | Expand `fieldPack` coverage from 9% to all infra-requiring solutions |
| P-002 | — | Improvement | Add timeout/error handling to `fetchSolutionVersion` |
| P-003 | — | Improvement | Reduce topology layout from 3 passes to 2 |
| P-004 | — | Improvement | Remove `window.connectedWorkspace` / `window.connectedSolutions` globals |
| P-005 | — | Improvement | Extract shared `buildFinishTimeMap()` to avoid duplicated traversal |
