# History — K

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Frappe Gantt, ExcelJS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## CONSOLIDATED SUMMARY (2026-05-25 through 2026-06-14)

**Core contributions:** Step 3 connector sizing UI, Step 5 Gantt planner, topology visualization engine, Cribl Stream integration.

**Key modules:**
- `js/modules/capacity.js` — Sizing state (pools, WEC, shared AMA) + measured EPS auto-fill
- `js/modules/solutions.js` — Step 3 sizing drawer + live search filtering
- `js/modules/topology.js` — Step 4 visualization (sources → intermediaries → Sentinel), layer boxes, Cribl routing, server indicators, DCR capacity splitting
- `js/gantt-planner.js` — Step 5 Gantt/Table tabs, inline editing, dependency arrows, export
- `css/style.css` — Dark theme, responsive layouts, drawer panels
- `data/solutions.json` — Solution metadata, planner durations, capacity_type annotations

**Architecture patterns established:**
1. **Windows sizing model:** Pool-based shared AMA pools (detachable drafts) + dedicated WEC pools
2. **Topology routing:** Step 2 Cribl selection auto-adds `cribl-stream`; eligible connectors route through Cribl when saved `criblIngestionExplicit: true`
3. **Capacity scaling:** Windows/Linux/Firewall servers → DCR buckets (4000 server cap, 12k req/min cap); EPS-driven VM counts
4. **Planner refresh:** Cross-tab state sync, Gantt rebuild, dependency arrows, business-day scheduling
5. **Search:** Live connector filtering, identity-field-only indexing, defensive `__solutionData` checks
6. **Persistence:** localStorage override records for task changes, status, column widths, sizing, tab state

**Critical bugs fixed:**
- Frappe Gantt `null.classList` errors (header node preservation)
- Barracuda collector VM in topology when no drawer saved (explicit Cribl routing flag)
- Trend Micro CEF solutions missing EPS sizing (explicit `capacity_type: "eps"`)
- Gantt Task Name column width ignored (JS `--gantt-table-columns` override)

**QA status:** All topology and planner UX features validated; workspace discovery integration complete; Cribl integration behavior aligned between Solutions UI and topology.

---

## 2026-06-15 through 2026-06-17 — Current Batch

### 2026-06-17T15:02:21+02:00 — Session: QA fixes & Cribl sizing + planner widths

**Fixes completed:**
- Trend Micro CEF solutions (Deep Security, Tipping Point, Apex One) now show EPS sizing drawer via explicit `capacity_type: "eps"`
- Topology Cribl routing fixed to require explicit `criblIngestionExplicit: true` for activation
- Gantt Task Name column width updated in CSS fallback and JS defaults

**Session outcomes:**
- Orchestration logs written: `2026-06-17T150221-k.md`
- Session log: `2026-06-17T150221-qa-fixes.md`
- Decisions merged from inbox files into `decisions.md`

**Files:** `data/solutions.json`, `js/modules/topology.js`, `js/gantt-planner.js`, `css/style.css`

### 2026-06-16T10:38:59+02:00 — Welcome CTA workspace gate fix

- Workspace CTA gate now distinguishes between expired workspace (with preserved `selectedWorkspace` → gate buttons) vs plain disconnected state (no saved workspace → keep buttons enabled)
- Fresh-start flows no longer blocked; expired workspaces still protected
- Files: `js/app.js`

### 2026-06-15T12:10:52+02:00 — Measured EPS auto-fill + Layer Box Gap Fix

**Measured EPS in sizing drawer:**
- `createDefaultSizingDraft(type, options = {})` now accepts optional `options.measuredEps` parameter
- Visual indicator "📊 Based on workspace measurement (24h avg)" shown when measured value > 0

**Layer Box Gap Fix:**
- `LAYER_GAP: 20 → 45` px to eliminate visual overlap; `topIntermediaryOffsetY: 420 → 460`
- CollectorVm Y offset `+80 → +120` to prevent overlap with collection layer

### 2026-06-02T14:20:53Z — GitHub-hosted logo rollout
- **Architecture decisions:** Environment cards, Step 3 solution badges, and Step 4 topology source nodes now prefer remote GitHub-hosted logos, but every surface preserves its prior emoji or generic-icon fallback when the image is missing or the request fails.
- **Patterns:** Use safe DOM/React image error handlers instead of inline HTML events, keep fallback markup rendered but hidden by default, and centralize reusable platform logo URLs for topology so dark-theme icon swaps stay consistent across Azure, Microsoft 365, Windows, Linux, Cribl, AWS, and GCP contexts.
- **User preferences:** Prefer authentic vendor/product marks over local assets, keep the dark theme readable with subtle badge surfaces, and treat GitHub/network failures as non-breaking visual degradations instead of hard errors.
- **Key file paths:** `index.html`, `js/app.js`, `js/modules/solutions.js`, `js/modules/topology.js`, `css/style.css`, `data/solutions.json`, `.squad/decisions/inbox/k-logo-implementation.md`.

### 2026-06-03T18:16:38+02:00 — Field-pack Gantt engine integration fixes
- **Architecture decisions:** `js/gantt-planner.js` now imports `js/modules/gantt-tasks.js`, renders shared field-pack infrastructure rows from the generated Phase 1 task set, and converts generated per-connector tasks into `planner.setup_tasks` only for connectors with explicit `fieldPack` metadata so legacy connector plans still use the existing planner path.
- **Patterns:** Treat `solution.fieldPack` as the authoritative classification in `inferFieldPack()`, keep heuristics only as fallback, and map generated connector tasks back through the existing solution-group renderer so collapse state, custom task persistence, and closeout flow stay intact.
- **Bug guards:** Fixed the CEF infra chain to 01→02→03→04→05, moved `microsoft-sysmon-for-linux` onto the syslog/CEF path in the task engine, and split the WFE abbreviations to `WFE` vs `WFEA` to avoid generated task ID collisions.
- **Key file paths:** `js/gantt-planner.js`, `js/modules/gantt-tasks.js`, `.squad/decisions/inbox/k-bug-fixes.md`.

### 2026-06-04T10:16:15.522+02:00 — Workspace-scoped connector state reset
- Step 3 connector "connected" badges must reflect only the currently selected workspace. When tenant, subscription, or resource group selection resets the workspace, `setConnectedSolutionIds([])` must run immediately so stale localStorage-backed connector state never leaks into the unselected workspace state.
- **Key file paths:** `js/app.js`, `.squad/decisions/inbox/k-workspace-connector-state.md`.

### 2026-06-04T11:55:30.000+02:00 — Expired workspace connection UX
- Persist only non-secret workspace connection metadata (`status`, `selectedWorkspace`, `tokenExpiresAt`, validation timestamp) in `js/app.js`; never persist the Azure bearer token itself.
- If cached `connectedSolutionIds` are restored without a live token, or if Azure calls return 401 / unauthorized, treat the workspace connection as expired: clear connected solution IDs immediately, show a top warning banner, and surface a warning status in the welcome card.
- The workspace value-copy on the welcome page lives in `index.html` inside the Step 1 `.workspace-connect-card` paragraph.
- **Key file paths:** `index.html`, `css/style.css`, `js/app.js`, `.squad/decisions/inbox/k-expired-connection-ux.md`.

### 2026-06-05T11:36:58.415+02:00 — Connected connector count filtering
- **Architecture decisions:** Workspace discovery in `js/app.js` should treat `Microsoft.SecurityInsights/dataConnectors` as the source of truth for Step 3 connected-state, and only table-derived synthetic connectors may be used as a fallback when the API reports no active connector resources.
- **Patterns:** Filter data connector resources by explicit active state (`properties.dataTypes[*].state`, `connected` booleans, status/connection-state fields) before mapping to local solution IDs; do not union active-table inference with live connector resources or generic tables like `CommonSecurityLog` can fan out into multiple false-positive solution matches.
- **User preferences:** Keep the workspace-connected badges aligned with what the Sentinel Data Connectors blade shows instead of inflating counts from inferred ingestion tables.
- **Key file paths:** `js/app.js`, `js/modules/solutions.js`, `.squad/decisions/inbox/k-connector-count-fix.md`.

### 2026-06-05T11:48:00.721+02:00 — Workspace validation CTA gate
- **Architecture decisions:** Step 1 welcome CTAs now key off an explicit transient workspace-validation state in `js/app.js`, so a workspace is only considered usable after connector discovery confirms it and stale async responses cannot overwrite a newer selection.
- **Patterns:** Clear `selectedWorkspace` and connected-solution state immediately when the workspace dropdown changes, disable Start Planning / Resume at Topology while validation is pending, and pair async workspace validation with a monotonically increasing request id before re-enabling those buttons.
- **User preferences:** Preserve the existing wait-and-continue flow for users who do nothing, but make premature clicks impossible and show a visible loading spinner instead of surfacing a misleading no-workspace warning.
- **Key file paths:** `js/app.js`, `css/style.css`, `.squad/decisions/inbox/k-race-condition-fix.md`.

### 2026-06-05T12:03:53.524+02:00 — Topology filters and persisted layout
- **Architecture decisions:** Step 4 topology now renders from a filtered connector subset (`All` / `Connected` / `New`), restores draggable React Flow node positions from workspace-scoped localStorage before mount, and clears that saved layout with a dedicated reset action.
- **Patterns:** Standard source nodes must render every connector row with no `+N more` truncation, and their row-height estimator must scale from the full connector count so the zone uber-boxes expand instead of clipping content.
- **User preferences:** Keep `All` as the default view, place the new controls in the topology header without affecting exports, and prefer taller dark-theme source/group boxes over hiding connectors.
- **Key file paths:** `js/modules/topology.js`, `css/style.css`, `.squad/decisions/inbox/k-topology-ux-enhancements.md`.

### 2026-06-05T12:15:22.150+02:00 — Workspace connector accuracy + unmatched topology coverage
- **Architecture decisions:** Workspace discovery in `js/app.js` now treats every Sentinel `dataConnector` resource returned for the selected workspace as connected inventory, unions that API inventory with table-derived connector hints, and passes a connector-summary payload into `js/modules/solutions.js` so topology can show both mapped solutions and synthetic unmatched connectors.
- **Patterns:** Keep `filterActiveWorkspaceDataConnectors()` only as a confidence signal, deduplicate workspace connectors by kind / friendly-name before unioning table-derived hints, and surface unmatched connectors as synthetic topology-only solution objects instead of silently dropping them.
- **User preferences:** Match the Sentinel Data Connectors blade first, keep the connected/new topology badges and filters intact, and show a small header-level diagnostic badge with the workspace connector breakdown instead of hiding count mismatches in the console only.
- **Key file paths:** `js/app.js`, `js/modules/solutions.js`, `js/modules/topology.js`, `css/style.css`, `.squad/decisions/inbox/k-connector-accuracy.md`.

### 2026-06-09T15:36:29+02:00 — Active/Stale/New connector status with last-log timestamps
- **Architecture decisions:** The Usage KQL query now projects `DataType, LastLog` (max TimeGenerated) so the planner knows when each table last received data, not just that it exists. `queryWorkspace` was extended with a `returnRows` option returning `{columns, rows}` so callers can parse multi-column results without changing the function's default behavior. `solutionLastLogMap` (solutionId → ISO timestamp) is built inside `resolveConnectedSolutionIds` by tagging table-derived connector objects with `._lastLog` during `buildConnectorsFromDataTypes`, then resolving those per-connector timestamps to solution IDs during the standard connector-to-solution lookup loop. The map is exposed as `window.connectorLastSeenMap` (plain object) immediately after `setConnectedSolutionsFromWorkspace` runs so topology.js can read it without a new import.
- **Patterns:** Tri-state status: **Active** (✅ green, log within 24h), **Stale** (⚠️ amber, log older than 24h), **New** (✨ cyan, no DCR). Status badges are composed in `getConnectorStatusMeta` using `formatLastSeen()` — a pure relative-time formatter (Xm/Xh/Xd ago). Graceful degradation: if the Usage query fails and the Tables API fallback is used, `lastLogMap` stays `null`, connector objects get `._lastLog = null`, and topology shows the legacy `✓ Connected` badge with no timestamp. Badge text is produced dynamically (`base.badgeText + ' · ' + relTime`) so there is no hard-coded format in the status config.
- **User preferences:** "Connected" just means the DCR resource exists — users were confused. Active/Stale gives them a clear live-data vs stale-config distinction. Dark-theme green (#4caf50) for Active, amber (#ff9800) for Stale. Light-theme overrides included.
- **Key file paths:** `js/app.js` (queryWorkspace, buildConnectorsFromDataTypes, selectWorkspaceDiscoveryConnectors, both call sites), `js/modules/solutions.js` (resolveConnectedSolutionIds, setConnectedSolutionsFromWorkspace, setConnectedSolutionIds, new getSolutionLastLog export), `js/modules/topology.js` (CONNECTOR_STATUS_CONFIG, formatLastSeen, getConnectorStatusMeta), `css/style.css` (active/stale badge + item + light-theme rules), `index.html` (cache-bust v=4).

### 2026-06-10T11:18:31+02:00 — Discovered infrastructure VM rendering in topology

- **Architecture decisions:** Added `buildDiscoveredInfrastructureNodes()` as a pure function inside the topology rendering scope that reads `window.discoveredInfrastructure?.vms` and produces ReactFlow nodes + edges without touching any existing path. Two new custom node types: `discoveredVm` (individual VM card) and `discoveredInfraSummary` (aggregate count/EPS badge next to the Sentinel node). Both registered in the `nt` nodeTypes map and guarded by an early return when the global is absent or empty.
- **Positioning logic:** Syslog/CEF VMs (`syslog-collector`, `cef-collector`, `hybrid-syslog` roles) anchor to the center-X of `syslog_cef` rows; Windows VMs anchor to `windows_events` rows. Y-position reuses the first matching planned collector VM placement from `collectorVmPlacementById` (same Y = side-by-side layout). When no planned collector exists the fallback is `getTopLayerY(max(1, topDcrLayerIndex-1))`. If syslog and windows VMs coexist they are staggered one `intermediaryLayerGapY` apart to prevent overlap.
- **Edge convention:** Discovered VM → Sentinel edges are solid green (`#22c55e`, 2px, step routing). Arc machines receive a dashed green border (`rf-discovered-vm-node--arc`). Planned collector VM edges remain unchanged (dashed blue).
- **CSS:** New dark-theme-safe `.rf-discovered-vm-node`, `.rf-discovered-infra-summary` block with green gradient background, plus light-theme overrides added immediately after the sentinel CSS block in `css/style.css`.
- **Data contract dependency:** Sebastian (app.js) populates `window.discoveredInfrastructure`; topology is purely additive and zero-risk when the global is absent.
- **Key file paths:** `js/modules/topology.js`, `css/style.css`.



- **BUG 1 (topology.js `classifySolution`):** `fieldPack` was not checked in `classifySolution`. Firewall solutions with `fieldPack: "syslog-cef"` (Zscaler, CheckPoint, FortiGate, Barracuda) were classified as `api` instead of `syslog_cef`, so no source-to-collector edges were drawn. Fix: extract `fieldPack` after `solutionId` and add `fieldPack === 'syslog-cef'` as first condition in the syslog_cef branch (mirrors the check already in `solutionUsesCollectorVm`).
- **BUG 2 (solutions.js BUG-ENV-002 — stale localStorage):** `CONNECTED_SOLUTIONS_STORAGE_KEY` in `solutions.js` is written on every workspace sync and read back by `app.js` on startup, causing stale green "connected" badges in fresh sessions. Fix: at module-level init, if `sessionStorage.sentinelPlanner.activeWorkspace` is not set, wipe the localStorage key before `app.js` can read it. `setConnectedSolutionsFromWorkspace` sets the sessionStorage flag so reloads within the same session still see the data.
- **BUG 3 (solutions.js BUG-SOL-001 — Linux never recommends Syslog):** `matchesVendorSignature` for the `linux` case only matched on name/solutionId text. The Syslog connector has `fieldPack: "syslog-cef"` and tag `syslog` but its name is just "Syslog" — not "Linux Syslog". Fix: extract `fieldPack` in `matchesVendorSignature` and add `fieldPack === 'syslog-cef'` and `tags.includes('syslog')` to the `linux` case.
- **BUG 4 (solutions.js BUG-SOL-002 — GCP incorrectly recommends Google Workspace):** `matchesVendorSignature` for `gcp` was refined in a prior pass but still lacked a negative filter. Fix: refactored to a block statement computing `isGcp` (specific GCP tags/ids including `google-cloud` tag) and `isWorkspace` (id/tags containing `workspace`/`gsuite`), returning `isGcp && !isWorkspace`.
- **Pattern:** `fieldPack` is the canonical signal for syslog/CEF classification — always check it alongside infrastructure and tags.
- **Key file paths:** `js/modules/topology.js` (classifySolution ~line 979), `js/modules/solutions.js` (matchesVendorSignature ~line 683, module-level init ~line 1086, setConnectedSolutionsFromWorkspace ~line 1381), `index.html` (cache-bust bumped to v=10).

### 2026-06-10T12:48:29+02:00 — Layer uber box foundation
- **Architecture decisions:** Step 4 topology now reuses `uberBox` with a `variant: 'layer'` payload to render named layer background bands for Sources, Collection, Transformation, and Workspace behind the existing zone boxes. Because Phase 0 must preserve the current top/bottom topology geometry, the renderer creates one full-width band per occupied segment (`top`, `bottom`, `center`) instead of forcing a single continuous rectangle that would swallow unrelated nodes.
- **Patterns:** Layer membership is derived from node type after layout (`source` + zone `uberBox` → Sources; `server` / `collectorVm` / `pathBox` / `cribl` / discovered VM cards → Collection; `dcr` → Transformation; `sentinel` + infra summary → Workspace). Build the layer boxes after saved node positions are applied so background bands stay aligned to the current diagram state, and keep them export-safe/non-interactive with `pointerEvents: 'none'`, `zIndex: -2`, plus light/dark theme CSS variants.
- **Key file paths:** `js/modules/topology.js`, `css/style.css`, `js/app.js`, `index.html`, `.squad/decisions/inbox/k-layer-uber-boxes.md`.

### 2026-06-10T13:15:00+02:00 — Cribl collection-layer routing refactor
- **Architecture decisions:** Step 4 no longer fabricates a standalone Cribl topology when `cribl-stream` is selected without any routed source. Cribl now renders as a band-scoped shared collection-layer node (`shared-cribl-node-top` / `shared-cribl-node-bottom`) that sits between routed sources and route-specific shared DCRs.
- **Patterns:** Shared Cribl routes must reserve a DCR layer (`rowHasDcr()` stays true for `ROUTE_CRIBL` rows), render the precomputed `cribl*DcrPlan` entries, and connect `Source → Cribl → Custom DCR (Logs Ingestion API) → Sentinel` without relying on a Sentinel right-side sidecar handle. Treat Cribl as collision-managed in the intermediary layer and keep source-to-Cribl mapping explicit per band/source ID to avoid dangling edges.
- **Key file paths:** `js/modules/topology.js`, `index.html`, `js/app.js`, `js/gantt-planner.js`, `js/modules/export.js`, `js/modules/search.js`, `js/modules/solutions.js`, `.squad/decisions/inbox/k-cribl-collection-layer.md`.

### 2026-06-15 — Layer Box Gap Fix

**Key file:** `js/modules/topology.js`

**Architecture decisions:**
- `createLayerBoxNodes` (line 2252) generates decorative layer box nodes (`zIndex: -2`, `pointerEvents: none`). Purely visual.
- `LAYER_GAP` (line 2338, now **45**) = minimum px gap between consecutive top-band layer box borders.
- `topIntermediaryOffsetY` (line 1129, now **460**) = Y-offset of server/DCR/cribl nodes below `bandBottomY` via `getTopLayerY`.
- CollectorVm nodes use a **hardcoded** Y offset from `bandBottomY` (lines 1837, 2005) — NOT `topIntermediaryOffsetY`. Changed from `+80` to `+120`.
- Bottom band layer boxes use a different stacking strategy (no `LAYER_GAP`) — unaffected by this change.

**Critical constraint (structural):**
- `LAYER_GAP=45` can cause 10 px protrusion of DCR nodes in `server+DCR` layouts because `intermediaryLayerGapY=200 < 255`. If reported, fix is to raise `intermediaryLayerGapY` to ≥256.
- **FAILURE pattern (FAILURE 5):** Never fix overlap by shrinking box heights. Always add space.

### 2026-06-15T12:10:52+02:00 — Cribl default routing for eligible connectors (no sizing saved)

- **Bug fixed:** Barracuda (and any `cribl_eligible` connector) showed a collector VM in topology when the user selected Cribl in Step 2 but never opened the Barracuda sizing drawer. `isCriblRoutedSolution` only checked persisted `criblIngestion: true`, which is never set unless the sizing drawer is opened and saved.
- **Root cause:** Disconnect between Solutions UI (which defaults `criblIngestion: true` for eligible connectors in a Cribl environment) and topology (which required the flag to be explicitly persisted).
- **Fix:** `isCriblRoutedSolution` now accepts a third param `criblActive: boolean`. Priority order: (1) `criblIngestionExplicit: true` in saved profile → return persisted `criblIngestion` (explicit user preference, either direction). (2) `criblIngestion: true` in saved profile (no explicit flag) → return true. (3) Fallback: return `criblActive && solution.cribl_eligible === true`.
- **Callsite pattern:** `hasStandaloneCriblSelection` is computed at render scope (line 812) as a boolean that is true when `cribl-stream` is among selected solutions. `splitSolutionsByRoute` is a closure inside that render scope, so it reads `hasStandaloneCriblSelection` directly — no prop threading needed. Both filter calls at lines 1219-1220 now pass it as the third argument.
- **No other callsites changed:** `isCriblRoutedSolution` had exactly two call sites (lines 1219-1220); line 1578 filters `row.route` (already resolved) and was not a call site.
- **Key file paths:** `js/modules/topology.js` (lines 108-120, 1219-1220).

### 2026-06-17T15:05:05+02:00 — Trend Micro Cribl sizing + planner column width fixes

- **Architecture decisions:** For syslog/CEF content packs whose names do not match the firewall heuristic, use explicit data metadata (`capacity_type: "eps"`) so `getConnectorCapacityMetadata()` resolves a `firewall` sizing profile without relying on vendor-name regexes.
- **Patterns:** Step 4 Cribl routing must only honor explicit drawer saves (`criblIngestionExplicit === true`); selecting the Cribl environment alone is not enough to route a solution through Cribl. The Gantt table's Task Name default width must be updated in both `css/style.css` and `js/gantt-planner.js` because JS writes `--gantt-table-columns` at runtime.
- **User preferences:** Keep these fixes surgical and preserve the existing drawer/topology behavior for connectors that already expose explicit Cribl sizing choices.
- **Key file paths:** `data/solutions.json`, `js/modules/topology.js`, `js/gantt-planner.js`, `css/style.css`, `.squad/decisions/inbox/k-cribl-sizing-fix.md`.

### 2026-06-17T15:02:21+02:00 — Session: QA fixes & cross-agent coordination

**Status:** Completed  
**Session type:** Parallel background agent run with Scribe orchestration  

**Work completed:**
- Fixed Cribl sizing drawer for Trend Micro CEF solutions (Trend Micro Deep Security, Tipping Point, Apex One) by adding explicit `capacity_type: "eps"` metadata
- Fixed topology Cribl routing to require explicit opt-in (`criblIngestionExplicit: true`) instead of fallback routing that contradicted user intent
- Widened Task Name column in Gantt planner (CSS fallback + JS defaults) because runtime `--gantt-table-columns` overwrites static CSS

**Key file changes:**
- `data/solutions.json` — 3 solutions: added `capacity_type: "eps"` to Trend Micro solutions
- `js/modules/topology.js` — Cribl routing logic: explicit preference check first, then fallback behavior guarded
- `js/gantt-planner.js` — Column width defaults updated
- `css/style.css` — Task Name column fallback width increased

**Decisions recorded:** `decisions.md` (2026-06-17 K — Cribl sizing signal and explicit routing)
