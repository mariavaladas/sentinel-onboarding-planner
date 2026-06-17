# History — K

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Frappe Gantt, ExcelJS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Active Development Summary (2026-05-25 through 2026-05-27)

K has implemented the complete Step 3 capacity and Step 5 planner UX stack:
- Connector sizing with shared Windows AMA pools and dedicated WEC pools
- Pool-based relation controls (`Same servers` / `Additional servers`) in both Step 3 (wizard) and Step 5 (planner)
- Sticky sizing drawer for non-destructive navigation during wizard steps
- Radio button layout for pool relation choices
- Gantt view tabs (Table + Gantt) with shared state, resizable columns, detail drawer
- Inline date/status/owner editing with immediate cross-tab refresh
- Solution-group collapse persistence and customizable task CRUD
- Business-day scheduling with dependency chain resolution
- Windows Security Events capacity scaling (Arc onboarding, AMA/DCR deployment, SecurityEvent validation)

### Key Architecture Decisions

**Sizing State Model**
- Stores connector sizing under the existing `sentinelPlanner.taskDurationOverrides.v1` planner override entry
- Pool-based structure: `serverPools[poolId] = { kind, serverCount, onPremPercent, connectorIds[] }`
- Windows AMA connectors can share or use separate pools; Windows Forwarded Events uses dedicated WEC pool
- Detachable AMA pool drafts preserved when rejoining shared pools (toggle-back restores prior values)

### 2026-06-01T13:42 — Cribl Integration Feature (Complete)

K delivered end-to-end Cribl ingestion feature:
- **Environment Step (Step 2):** Cribl vendor card placed after M365. When selected, auto-adds `cribl-stream` solution.
- **Solutions Step (Step 3):** Per-connector `criblIngestion` checkbox for AMA-eligible connectors (Windows, Linux, Syslog/CEF). Checkbox state persisted in capacity draft.
- **Topology Step (Step 4):** Single shared `Cribl Stream` node renders between sources and custom DCR nodes. Routed sources edge directly to Cribl, Cribl edges to Logs Ingestion API DCRs.
- **Capacity Model:** `criblIngestion` flag stored per connector; when true, DCR sizing remains active but collector VM placement is greyed out.
- **Files:** `index.html`, `solutions.js`, `topology.js`, `capacity.js`, `style.css`, `solutions.json`
- **Validation:** TypeScript parse ✅ + headless Edge smoke test ✅

**Related Decisions Merged:** 13 inbox entries including topology Azure/on-prem splits, Linux/CEF path separation, Windows pool grouping, shared DCR logic, server indicators, and sizing rules (Deckard, Luv, K contributions). All merged into `decisions.md`.

**Planner Rendering**
- Frappe Gantt bars rebuilt post-render with phase/status colors applied
- Inline duration/dates/status editable in grid; full task details in side panel
- Zoom control (Weeks/Months/Quarters); auto-fit button
- Timeline scroll stabilization: disabled `infinite_padding`, normalized pointer-captured resizers
- Cross-tab refresh: Table immediately updates; Gantt cache invalidated on next render

**Search & Filtering**
- Step 3 search now filters connector cards live; third-party connectors render as headed sections (not tabs)
- Search indexing restricted to identity fields only (name, tags, export group, category label)
- Defensive hiding of cards missing `__solutionData`; section headings track visible/total counts

### Recent Session Outcomes

**2026-05-27 Windows Sizing Completion**
- Pool-based sizing fully implemented with user approval
- Sticky panel feature added; radio button layouts refined
- WEC separation approved and deployed
- Pre-implementation spec clarity review assigned to Luv

**QA Status**
- Luv's k-20 verification found duplicate Windows Security Events task definitions (BUG-K20-001) — owner K to fix synchronization
- Previous QA findings (Luv May-26 Gantt/Table pass) show critical bugs in start-date inline edit rendering and frappe-gantt `null.classList` errors — K addressed with Gantt header node preservation and Gantt refresh hardening

### Files in Active Use
- `js/modules/capacity.js` — Sizing state engine and pool calculations
- `js/modules/solutions.js` — Step 3 connector cards, sizing drawer, search filtering
- `js/gantt-planner.js` — Step 5 planner controller, Gantt/Table tabs, inline editing, capacity scaling
- `css/style.css` — Dark theme, drawer panels, tab strips, resize handles, responsive layouts
- `data/solutions.json` — Solution metadata, planner durations, sizing capacity_type annotations

## Key Patterns (Active)

- **Persistence:** Override records in localStorage keep task changes, status, collapse state, column widths, sizing, and tab selection
- **Rendering:** Frappe Gantt bars rebuilt post-render with phase/status colors applied
- **Editing:** Inline duration/dates/status in grid; full details in side panel
- **Business days:** Task scheduling respects working days only
- **Numbering:** Hierarchical (solution groups consume global counter; setup tasks use dot notation)
- **Sizing:** Pool-based state stores shared AMA vs separate pools; WEC handled separately
- **Search:** Live card filtering + defensive `__solutionData` checks

## Next Priority

- Fix BUG-K20-001: Synchronize duplicate Windows Security Events task definitions in `data/solutions.json`
- Luv pre-implementation spec clarity review for Windows sizing
- Mobile planner fallback (compact list + PDF export)
- Keyboard shortcuts for navigation

## See Also

- **history-archive.md** — Earlier sessions and learnings (2026-05-18 through 2026-05-22)
- **decisions.md** — Team decisions including Windows sizing spec, capacity model, Step 3 search, Gantt hardening

## Learnings

### 2026-06-15T12:10:52+02:00 — Measured EPS auto-fill in Syslog/CEF sizing drawer

- **What was implemented:** `createDefaultSizingDraft` in `capacity.js` now accepts an optional `options = {}` second parameter. When `options.measuredEps` is a positive number and `type === 'firewall'`, it uses that instead of `DEFAULT_FIREWALL_EPS = 1000`. All other types are unaffected; callers without the second arg continue to work exactly as before.
- **Callsites updated:** `buildDraft()` in `solutions.js` reads `window.discoveredInfrastructure?.summary?.totalEPS` at call-time and passes it as `{ measuredEps }`. The "Reset to defaults" handler in `solutions.js` does the same. In `gantt-planner.js`, the initial draft construction and the "Defaults" button handler both pass `{ measuredEps: window.discoveredInfrastructure?.summary?.totalEPS }`.
- **Architecture constraint respected:** `capacity.js` remains a pure module — the `window` read happens only in `solutions.js` and `gantt-planner.js`, which already access the DOM. `capacity.js` never touches globals.
- **Visual indicator:** A `<p class="solution-sizing-measurement-note">` / `<p class="gantt-detail-sizing__measurement-note">` "📊 Based on workspace measurement (24h avg)" is rendered immediately after the EPS field in the grid when `measuredEpsValue > 0`. CSS added to `style.css` with `grid-column: 1 / -1` so it spans the full grid row.
- **Key file paths:** `js/modules/capacity.js` (line ~556), `js/modules/solutions.js` (lines ~2065, ~2508, ~2645), `js/gantt-planner.js` (lines ~7521, ~7747, ~7843), `css/style.css`.

### 2026-06-11T12:38:35Z — FS Dependency Arrows in Gantt Timeline

- **What was implemented:** Added `syncGanttDependencyArrows(svg, taskById)` in `js/gantt-planner.js` (inserted after `syncGanttMilestoneMarkers`). Called from `inspect()` inside `stabilizeGanttRender()` right after the milestone markers call. Added CSS rules to `css/style.css`.
- **Layer positioning:** The `g.gantt-dependency-layer` is inserted before the Frappe bar-wrappers parent group (`barsParent`) so arrows render behind task bars. Fallback chain: bars parent → first bar-wrapper → after grid-background → svg.appendChild.
- **Arrowhead marker:** A single `<marker id="gantt-dep-arrowhead">` in SVG `<defs>` is created once and reused every clear-and-redraw cycle. `orient="auto"` keeps the head pointing in the direction of travel.
- **Elbow routing:** `M startX startY H (startX+8) V endY H endX` — moves right 8px from the predecessor bar's right edge, drops/rises vertically to the successor's row midpoint, then runs horizontally to the successor bar's left edge.
- **Positions:** Read from `rect.bar` `x`/`y`/`width`/`height` attributes (already set by inspect's styling pass). startX = predX + predW, startY = predY + predH/2, endX = succX, endY = succY + succH/2.
- **Collapsed/invisible bars:** Guarded naturally — `svg.querySelector('.bar-wrapper[data-id="..."]')` returns null for collapsed tasks; the function skips them silently.
- **Hover highlighting:** One-time `mouseenter`/`mouseleave` listeners bound on each bar-wrapper (guarded by `data-dep-arrow-hover-bound`). On enter, queries layer for paths with matching `data-pred-id` or `data-succ-id` and adds `.gantt-dep-arrow--highlighted`. Layer paths are recreated each cycle but the layer element itself persists, so the closure remains valid.
- **CSS:** `.gantt-dependency-layer` has `pointer-events: none` to avoid blocking bar interactions. Arrow base: stroke `var(--gantt-dep-arrow-color, #475569)`, width 1.5, opacity 0.7. Highlighted: opacity 1, width 2.5, stroke `var(--gantt-dep-arrow-color-highlight, #94a3b8)`.
- **Key file paths:** `js/gantt-planner.js` (lines ~6823–6932, call at ~7154), `css/style.css` (end of file).

### 2026-05-28T15:15:39.331+02:00 — Topology server indicator chips
- **Architecture decisions:** Step 4 topology now reads persisted sizing through `getConnectorCapacitySnapshot()` and resolves per-solution capacity profiles before building React Flow nodes, so server chips stay aligned with the same shared-pool model used by Step 3 and Step 5.
- **Patterns:** Windows AMA indicators must dedupe by `poolId`; WEC always stays on its own chip; firewall/CEF indicators come from `result.vmCount`; server nodes cap visible chips at three and collapse overflow into `+N more`.
- **User preferences:** Keep the existing topology layout untouched, use export-safe inline SVG instead of emoji for OS/server icons, and keep chip density compact on the dark theme with subdued `est.` styling for default sizing.
- **Key file paths:** `js/modules/topology.js`, `css/style.css`, `.squad/decisions/inbox/deckard-topology-servers-spec.md`.

### 2026-05-28T16:38:41.527+02:00 — Windows source pool grouping
- **Architecture decisions:** `windows_events` source nodes now build pool sections from `poolId`-grouped AMA/WEC populations while the DCR node carries the full Windows data source list as explicit `dataSources` metadata.
- **Patterns:** Reuse `buildServerIndicatorsForGroup()` per grouped pool instead of changing its aggregation logic; filter WEC pools out of Azure rows; keep Arc Agent conditional on `zone === 'onprem'`; use accent-tinted pool shells plus bordered solution boxes inside the source node.
- **User preferences:** Preserve the existing topology geometry and straight edge routing while making Windows rows more legible with per-pool grouping and richer DCR summaries on the dark theme.
- **Key file paths:** `js/modules/topology.js`, `css/style.css`, `.squad/decisions/inbox/k-pool-grouped-source-nodes.md`.

### 2026-05-29T11:02:34.500+02:00 — Shared Windows DCR capacity split
- **Architecture decisions:** Step 4 now computes shared Windows DCR buckets across all on-prem and Azure `windows_events` pools using `DCR_MAX_SERVERS = 4000`, then renders those DCR nodes in a neutral middle column outside the zone uber-boxes before fan-in to Sentinel.
- **Patterns:** Keep Windows source nodes inside their zone boxes, route straight edges from each Windows source node to every assigned shared DCR, and split oversized pool/server load across DCR buckets so the UI can show `~serverCount × 3 req/min` with >80% warning badges.
- **User preferences:** Preserve the existing topology feel, leave non-Windows paths untouched, and make Windows DCR cards self-describing with data source summaries plus throughput hints on the dark theme.
- **Key file paths:** `js/modules/topology.js`, `css/style.css`, `.squad/decisions/inbox/k-shared-dcr-logic.md`.

### 2026-05-29T11:31:49.342+02:00 — Windows topology population inference
- **Architecture decisions:** `inferWindowsPopulationKind()` now treats `WINDOWS_FAMILY_IDS` as the source of truth for AMA-based Windows connectors, with only WEC IDs returning `wec` explicitly.
- **Patterns:** When topology pool filters only accept `windows_ama` and `wec`, connector-family inference must key off the shared family set instead of brittle ID lists so new AMA connectors inherit the right pool behavior automatically.
- **Key file paths:** `js/modules/capacity.js`, `js/modules/topology.js`, `.squad/decisions/inbox/k-sysmon-topology-fix.md`.

### 2026-05-29T11:42:54.949+02:00 — Topology summary volume removal
- **UI changes:** Removed the Step 4 `Estimated Volume` summary card from the topology footer, leaving only the Workspace and Connectors cards.
- **Why:** The topology cannot produce a reliable ingestion-volume estimate, so the card was misleading and should not be shown.
- **Key file paths:** `js/modules/topology.js`, `.squad/agents/k/history.md`, `.squad/decisions/inbox/k-remove-estimated-volume.md`.

### 2026-05-29T11:55:19.375+02:00 — Linux topology split: separate DCRs for Linux servers and firewalls
- **Architecture decisions:** Split `syslog_cef` into two distinct topology paths — `linux_server` (AMA directly on Linux hosts, shared Linux DCR like Windows) and `syslog_cef` (firewalls → shared collector VM → Syslog/CEF DCR). `LINUX_SERVER_IDS = Set(['linux-syslog', 'microsoft-sysmon-for-linux'])` is the detection source of truth. Classification check for `linux_server` MUST come before `syslog_cef` because Linux server connectors also carry syslog tags.
- **Patterns:** `buildLinuxSharedDcrPlan(zoneLayouts, capacitySnapshot)` mirrors Windows DCR plan — same bucket algorithm, constants `LINUX_DCR_MAX_SERVERS=4000`, `LINUX_DCR_REQUESTS_PER_SERVER=3`, `LINUX_DCR_MAX_REQUESTS_PER_MIN=12000`. `buildSyslogCefCollectorPlan(zoneLayouts, capacitySnapshot)` computes total EPS from firewall capacity profiles (defaulting to `DEFAULT_FIREWALL_EPS=1000` when no sizing saved), derives `vmCount = ceil(totalEps / FIREWALL_VM_EPS_CAPACITY)` and `dcrCount = ceil(totalEps / SYSLOG_DCR_MAX_EPS=65000)`. Collector VM is a single shared `collectorVm` node type (not per-row); Syslog/CEF DCR is shared. All firewall source nodes edge → collector VM; Linux server source nodes edge directly to shared Linux DCR.
- **User preferences:** `linux_server` defaults to `onprem` zone (no Azure split yet — no Linux capacity questions in Step 3). `formatEps()` helper matches `formatReqPerMin()` pattern for consistent k-notation display. `DCRNode` now handles both `requestsPerMinute` and `assignedEps` capacities; `CollectorVmNode` reuses server-node CSS with Linux OS icon.
- **Key file paths:** `js/modules/topology.js`, `.squad/decisions/inbox/k-linux-topology-separate-dcrs.md`.

### 2026-06-01T12:28:42.119+02:00 — Shared collector VM placement
- **Architecture decisions:** Firewall/syslog sizing now persists a shared `collectorVmZone` inside the capacity snapshot so every Syslog / CEF connector reads one collector placement choice while keeping the default fallback at `onprem` for older saved states.
- **Patterns:** Step 3 firewall drawers use a one-time placement prompt plus a compact `Collector VMs: … / Change` summary on later opens; `saveConnectorCapacityValues()` now broadcasts capacity updates so Step 4 can rerender when shared sizing changes.
- **User preferences:** Keep the placement control visually aligned with the existing dark-theme sizing drawer and make the shared scope explicit in helper copy instead of repeating the question on every firewall card.
- **Key file paths:** `js/modules/capacity.js`, `js/modules/solutions.js`, `js/modules/topology.js`, `js/gantt-planner.js`, `js/app.js`, `css/style.css`, `.squad/decisions/inbox/k-collector-placement.md`.

### 2026-06-01T12:40:54.441+02:00 — Linux zone split and prominent sizing questions
- **Architecture decisions:** Linux connector sizing now stores `onPremPercent` alongside server count so the same saved draft drives Step 3, planner summaries, and topology zone placement instead of assuming every Linux server is on-prem.
- **Patterns:** Reuse the Windows-style split input (`What split — on-prem vs. Azure?`) for Linux drawers, persist the normalized split in `capacity.js`, and let topology derive per-zone Linux server counts from the saved percentage when building shared DCR rows.
- **User preferences:** Show EPS before collector VM placement in firewall drawers, and render key sizing questions with the same bold heading treatment as the collector placement prompt for clearer dark-theme scanning.
- **Key file paths:** `js/modules/solutions.js`, `js/modules/capacity.js`, `js/modules/topology.js`, `css/style.css`, `.squad/decisions/inbox/k-linux-zone-and-label-styling.md`.

### 2026-06-01T13:42:53.548+02:00 — Cribl integration pathing
- **Architecture decisions:** Cribl is modeled as an environment-driven add-on: selecting the Step 2 vendor auto-selects `cribl-stream`, AMA-eligible connectors persist a per-connector `criblIngestion` flag, and Step 4 renders one shared Cribl node that fans into Custom DCRs while standard AMA paths stay unchanged.
- **Patterns:** Keep the Cribl checkbox defaulted on only when the environment vendor is selected, clear saved `criblIngestion` flags when the vendor is removed, and let topology split shared Windows/Linux/Syslog rows by route (`standard` vs `cribl`) so the same capacity snapshot can drive both UI state and shared DCR placement.
- **User preferences:** Preserve the existing dark-theme drawer layout, grey out collector VM placement instead of hiding it when Cribl handles ingestion, and keep Cribl resource sizing out of scope while still showing Sentinel-facing DCR demand.
- **Key file paths:** `index.html`, `js/modules/solutions.js`, `js/modules/capacity.js`, `js/modules/topology.js`, `js/gantt-planner.js`, `css/style.css`, `data/solutions.json`, `.squad/decisions/inbox/k-cribl-integration.md`.

### 2026-06-02T11:20:47.206+02:00 — Topology straight-line routing
- **Architecture decisions:** Step 4 topology now treats `azure_native` and `direct` source rows as sentinel-aligned rows, giving their uber-boxes extra internal height/width so those source cards can sit directly under the Sentinel-aligned intermediary node instead of being forced into the main horizontal pack.
- **Patterns:** React Flow edges should use `step` routing for topology connections, while shared/source intermediaries continue to align from row center via `getLayoutCenterX()` and the second-pass band layout rebuild.
- **User preferences:** Favor visibly straight vertical/horizontal connectors over curved diagonals, and accept larger zone containers when that keeps Azure resource / native connector lines cleaner.
- **Key file paths:** `js/modules/topology.js`, `css/style.css`, `.squad/decisions/inbox/k-topology-straight-lines.md`.

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
