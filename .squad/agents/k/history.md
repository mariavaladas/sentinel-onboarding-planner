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
