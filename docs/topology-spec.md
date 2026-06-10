# Sentinel Onboarding Planner — Topology Specification

> **This is a living document. Any topology change must be validated against these rules.**
>
> Owner: Maria (madesous_microsoft)
> Last reviewed: 2026-06-10
> Source of truth: `js/modules/topology.js`, `css/style.css`, and design decisions captured below.

---

## Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | 2026-06-10 | Copilot / Maria | Initial specification created from code + design review |

---

## 1. Overview

The Topology tab renders a **React Flow** diagram that shows the complete Microsoft Sentinel ingestion pipeline for a given workspace. The diagram is read from left to right (or top to bottom, depending on viewport), tracing data from raw sources through collection infrastructure, transformation rules (DCRs), and ultimately into the Log Analytics workspace.

The topology is generated programmatically from:
- **Planned connectors** selected in the planner (from `window.solutions` / capacity snapshot)
- **Discovered infrastructure** pulled from Azure Resource Graph (`window.discoveredInfrastructure`)
- **Live workspace connectors** from the Sentinel API (`getWorkspaceConnectorSummary`)

The diagram uses React Flow nodes and edges. Node positions are computed by a layout engine inside `topology.js` and can be overridden via drag-and-drop. Positions are persisted to `localStorage` keyed by workspace identity.

---

## 2. Layer Hierarchy

The topology is divided into **strict vertical layers**, each enclosed in a named **layer uber box**. These layers must never be mixed or reordered. Every component in the topology MUST belong to exactly one layer — no floating or orphaned nodes.

```
┌─────────────────────────────────────────────────────────────┐
│  📡 SOURCES                                                  │
│  (Firewalls, Servers, SaaS Apps, Azure Resources)           │  ← Data generators
├─────────────────────────────────────────────────────────────┤
│  📦 COLLECTION INFRASTRUCTURE                                │
│  (Collector VMs, Linux Forwarders, Windows Collectors,      │
│   Cribl Edge / Cribl Cloud)                                 │  ← Agents deployed near source
├─────────────────────────────────────────────────────────────┤
│  🔄 PIPELINE & TRANSFORMATIONS                               │
│  (DCRs, Cribl Stream, Event Hub, Logic Apps, API            │
│   Connectors, DCEs)                                         │  ← Services that process & route
├─────────────────────────────────────────────────────────────┤
│  🎯 WORKSPACE (Microsoft Sentinel / Log Analytics)          │  ← Final destination
└─────────────────────────────────────────────────────────────┘
```

### Layer Uber Boxes

Each layer has a **named uber box** rendered as a visual container in the topology:

| Layer | Name | Contains | Color Hint |
|-------|------|----------|------------|
| 1 | **Sources** | Firewalls, servers, SaaS apps, Azure resources — anything that generates data | `#f59e0b` (amber) |
| 2 | **Collection Infrastructure** | Collector VMs (Linux forwarders, Windows collectors), Cribl Edge / Cribl Cloud — agents and infrastructure deployed at or near the source to gather raw data. | `#22c55e` (green) |
| 3 | **Pipeline & Transformations** | DCRs (Data Collection Rules), Cribl Stream, Event Hub, Logic Apps / Functions, API Connectors (CCP/Native Connector), DCEs — cloud services and middleware that process, route, and shape data streams before they reach the workspace. | `#8b5cf6` (purple) |
| 4 | **Workspace** | Microsoft Sentinel / Log Analytics workspace node | `#0078d4` (blue) |

> **Key insight:** Cribl is split across two layers: **Cribl Edge / Cribl Cloud** (agent-side collection) lives in Collection Infrastructure alongside collector VMs, while **Cribl Stream** (the processing/routing engine) lives in Pipeline & Transformations alongside DCRs. The distinction is "deployed on metal/near source" vs "cloud services that process flows."

**Rules:**
1. Sources always appear farthest from the workspace (top or bottom of each band).
2. Collection Infrastructure sits between sources and Pipeline & Transformations — collector VMs must not appear at the same Y-level as sources or DCRs.
3. Pipeline & Transformations (DCRs, Cribl Stream, Event Hub, Logic Apps, connectors) is the last intermediary before the workspace.
4. The workspace (Sentinel node) is always the visual center anchor of the diagram, between the top and bottom Pipeline & Transformations layers. It occupies its own dedicated vertical space.
5. **Every node must belong to exactly one layer.** No component may float outside a layer uber box.
6. There MUST be a minimum **70 px** vertical gap between major layer boundaries (`DISC_VM_LAYER_GAP = 70`).
7. Intermediary layer gap is **152 px** (`intermediaryLayerGapY = 152`).
8. Top-band source offset from workspace: **96 px** (`topSentinelGapY = 96`).
9. Bottom-band source offset from workspace: **120 px** + **140 px** (`bottomSentinelGapY = 120`, `bottomSourceGapY = 140`).

### Layer Box Visual Rendering Constraints

Layer boxes are rendered as dashed-border visual containers (decorative overlays) computed **after** node positions are finalized. They must obey the following rules:

**Width matching:**
1. **All layer boxes within the same band must match the width of the Sources layer box in that band.** Collection, Transformation, and Workspace boxes inherit the horizontal extent of their corresponding Sources box. This ensures a uniform column appearance per band.
2. The Sources layer box width is determined by the actual extent of all source nodes within it (including uber boxes), plus padding.
3. The top-band layers (Sources, Collection, Transformation) all share the top-band width reference. The bottom-band layers (Sources-bottom, Collection-bottom, Transformation-bottom) all share the bottom-band width reference.

**Vertical stacking and gap enforcement:**
4. **Layer boxes must NEVER bleed into each other.** A minimum gap (`LAYER_GAP = 12px`) must be enforced between adjacent layer boxes.
5. **Stacking order (top band, top to bottom):** Sources → Collection → Transformation → (gap) → Workspace.
6. **Stacking order (bottom band, bottom to top):** Sources-bottom → Collection-bottom → Transformation-bottom → (gap) → Workspace.
7. Each layer box's vertical position is enforced sequentially: its top edge must be at least `LAYER_GAP` pixels below the previous layer's bottom edge (top band), or its bottom edge must be at least `LAYER_GAP` pixels above the previous layer's top edge (bottom band).

**Workspace isolation:**
8. The Workspace layer box sits in the center, between the top-band Transformation and bottom-band Transformation. It must not bleed into either.
9. Workspace top edge: at least `LAYER_GAP` below top-Transformation bottom edge.
10. Workspace bottom edge: at least `LAYER_GAP` above bottom-Transformation top edge.

**Height sufficiency:**
11. **Each layer box must be tall enough to fully contain all nodes classified into that layer.** The box extends from `minNodeY - 35px` (top padding) to `maxNodeY + nodeHeight + 45px` (bottom padding). A layer box that clips or cuts through its contained nodes is a regression.
12. The Transformation layer must be tall enough to contain all DCR nodes — it must not appear as a thin strip.

**Symmetry:**
13. The topology is mirrored: what applies to the top band also applies to the bottom band. Both bands must follow the same width-matching, gap-enforcement, and height-sufficiency rules independently.

### Band System

The layout engine uses two **bands** — `top` and `bottom` — that radiate outward from the central workspace node:

| Band | Zones |
|------|-------|
| `top` | `onprem` (On-Premises), `azure` (Azure IaaS) |
| `bottom` | `microsoft` (M365 / Defender), `saas` (3rd-Party Cloud / SaaS) |

Zones within the same band are arranged side by side. Bands on both sides connect to the same Sentinel workspace node in the center.

---

## 3. Node Types

All node types registered with React Flow:

| Node Type | React Component | CSS Class | Description |
|-----------|----------------|-----------|-------------|
| `source` | `SourceNode` | `.rf-source-node` | The data-generating device or service (firewall, server, SaaS app). Min-width 260 px, max 320 px. Wide variant (`.rf-source-node--wide`) for Windows pool grids: min 640 px. |
| `pathBox` | `PathBoxNode` | `.rf-path-node` | Inline connector/transport step within a path (e.g., "CCP / API Connector", "Diagnostic Settings"). |
| `cribl` | `CriblNode` | `.rf-cribl-node` | Cribl Stream aggregation node. Currently rendered as a standalone node at workspace Y-level. **Pending refactor — see §11.** |
| `server` | `ServerNode` | `.rf-server-node` | Represents a VM or server in the planned topology (Linux Forwarder, Windows Server). Min-width 152 px, max 220 px. |
| `dcr` | `DCRNode` | `.rf-dcr-node` | Data Collection Rule. Dashed border. Min-width 140 px; with sources shown: min 220 px, max 260 px. |
| `sentinel` | `SentinelNode` | `.rf-sentinel-node` | The Microsoft Sentinel / Log Analytics workspace. Always centered. Min-width 200 px. Blue gradient border (`#0078d4`). |
| `uberBox` | `UberBoxNode` | `.rf-uberbox-node` | A zone/band grouping box (non-interactive background rectangle). Contains sources + connectors for one zone. `pointer-events: none`, `z-index: -1`. |
| `collectorVm` | `CollectorVmNode` | `.rf-collector-vm-node` | A planned collector VM node overlaid on or beside the server node. |
| `discoveredVm` | `DiscoveredVmNode` | `.rf-discovered-vm-node` | An active discovered VM (EPS > 0) from Azure Resource Graph. Green solid border (`#22c55e`). Arc-connected variant uses dashed border (`.rf-discovered-vm-node--arc`). |
| `discoveredInfraSummary` | `DiscoveredInfraSummaryNode` | `.rf-discovered-infra-summary` | Summary panel beside the Sentinel node showing total discovered VMs, EPS, etc. |
| `discoveredIdleGroup` | `DiscoveredIdleGroupNode` | `.rf-discovered-idle-group` | Compact group box for all idle VMs (EPS = 0 or null). Dashed green border (`#86efac`). |

### Node ID Conventions

| Pattern | Description |
|---------|-------------|
| `source-{type}-{zone}[-{route}]` | Source node (e.g., `source-syslog_cef-onprem`) |
| `uberbox-{zone}` | Zone grouping box |
| `dcr-windows-collapsed` / `dcr-linux-collapsed` / `dcr-syslog_cef-collapsed` | Collapsed shared DCR nodes |
| `dcr-cribl-windows-collapsed` etc. | Cribl-routed DCR variants |
| `shared-cribl-node` (`CRIBL_NODE_ID`) | The singleton Cribl Stream node |
| `sentinel` | The workspace node (always this exact ID) |
| `discovered-vm-{vmName}` | Individual active discovered VM |
| `discovered-idle-group` | The idle VM group node |
| `discovered-infra-summary` | The infra summary sidebar node |

---

## 4. PATH_CONFIGS Reference

Each ingestion path type has a canonical configuration. These define color, labels, icons, and whether a DCR is required.

| Path Key | Color | Source Label | Path Type | Connector / Intermediary | DCR Required | Protocol |
|----------|-------|-------------|-----------|--------------------------|-------------|----------|
| `syslog_cef` | `#f59e0b` (amber) | On-Premises / IaaS | `server` | Linux Forwarder + AMA Agent | Yes — "DCR: Syslog/CEF" | Syslog / CEF |
| `linux_server` | `#22c55e` (green) | Linux Servers | `server` | Linux Server + AMA Agent | Yes — "Linux DCR" | Syslog (via AMA) |
| `api` | `#8b5cf6` (purple) | Cloud / SaaS Vendors | `boxes` | CCP / API Connector | Yes — "DCR: Custom Tables" | REST API (Polling) |
| `azure_native` | `#0078d4` (blue) | Azure Resources | `boxes` | Diagnostic Settings | No | Azure Resource Manager |
| `direct` | `#10b981` (emerald) | Microsoft 365 / Defender | `boxes` | Built-in API Connector | No | Service-to-Service API |
| `logic_app` | `#ec4899` (pink) | Custom / Third-Party APIs | `boxes` | Logic App / Function → Data Collector API | Yes — "DCR: Custom Logs" | HTTP (Webhook/Poll) |
| `windows_events` | `#06b6d4` (cyan) | Windows Servers | `server` | Windows Server + AMA Agent | Yes — "Windows DCR" | Windows Events (XPath) |
| `event_hub` | `#f97316` (orange) | Event Hub Sources | `boxes` | Event Hub | Yes — "DCR: Event Hub" | Event Hub Streaming |
| `unmatched` | `#94a3b8` (slate) | Other / Unmatched Connectors | `boxes` | Workspace connector | No | Workspace connector (not yet mapped) |
| `cribl` | `#5bc4f1` (light blue) | Cribl Stream | `boxes` | Cribl Stream | Yes — "Custom DCR (Logs Ingestion API)" | Logs Ingestion API |

### Path Classification Logic (`classifySolution`)

The function `classifySolution()` maps a solution to a path key using this priority order:

1. `_unmatched` flag → `unmatched`
2. `server_population_kind === 'windows_ama'` or `'wec'` → `windows_events`
3. Solution ID in `LINUX_SERVER_IDS` or `populationKind === 'linux'` → `linux_server`
4. `fieldPack === 'syslog-cef'`, `linux-forwarder` infra, or syslog/CEF tags → `syslog_cef`
5. `event-hub` infra → `event_hub`
6. `logic-app` or `azure-function` infra → `logic_app`
7. First-party + Microsoft/Defender category/tags → `direct`
8. First-party + Azure tags → `azure_native`
9. VM/agent infra or Windows tags → `windows_events`
10. First-party (fallback) → `azure_native`
11. Default → `api`

### Band/Zone Assignment (`FLOW_BAND_ORDER`)

Paths are assigned a canonical band order for rendering:

```
windows_events: 0   syslog_cef: 1   linux_server: 2   azure_native: 3
event_hub:      4   direct:     5   api:           6   logic_app:    7
unmatched:      8   (cribl: rendered separately at Sentinel Y-level)
```

Zones map to display labels and colors via `ZONE_CONFIGS`:

| Zone | Label | Color |
|------|-------|-------|
| `onprem` | 🏢 On-Premises | `#f59e0b` |
| `azure` | ⛅ Azure | `#0078d4` |
| `microsoft` | 🛡️ Microsoft 365 / Defender | `#10b981` |
| `saas` | ☁️ 3rd Party Cloud / SaaS | `#8b5cf6` |

---

## 5. Positioning & Layout Rules

### Coordinate System

- All positions are in React Flow canvas units (pixels at zoom = 1).
- `startY = 30` — top of the diagram canvas.
- `sentinelNodeWidth = 220`, `sentinelNodeHeight = 132`.
- `intermediaryNodeHeight = 120` — height of DCR / path-box nodes.
- `intermediaryLayerGapY = 152` — vertical gap between intermediary layers.
- `topSentinelGapY = 96` — gap from top-band bottom to Sentinel.
- `topIntermediaryOffsetY = 72` — additional offset for the first intermediary layer above Sentinel.
- `bottomSentinelGapY = 120` — gap from Sentinel bottom to first bottom-band DCR.
- `bottomSourceGapY = 140` — additional gap from bottom DCR to bottom sources.

### Sentinel Node Position

The Sentinel workspace node is horizontally centered on the **weighted center X** of all zone layouts. The layout engine performs two passes to converge on a stable center before rendering.

### Zone (Uber Box) Positioning

Each zone gets a contiguous horizontal band. Zones in the same vertical band are placed left-to-right. Inner padding: `zoneInnerPaddingX = 24 px`. Internal row gap: `zoneInternalRowGap = 32 px`.

### Collector VM Positioning

- Offset from source node: `collectorVmOffsetX = 56 px`, `collectorVmOffsetY = 48 px`.
- Collector VMs may be placed in the `onprem` or `azure` zone (configurable via `collectorVmZone`).

### DCR Spread

- DCR nodes are spread horizontally with gap `dcrSpreadGapX = dcrNodeWidth + 36 px`.

### Windows Pool Grid

When a `windows_events` source has more than 2 pools (`COLLAPSE_THRESHOLD = 3` — note: threshold is `> 2`), the pools render in a 2-column grid layout (`.rf-pool-grid`) instead of a vertical stack.

### Node Clamping

All X positions are clamped to `[diagramLeftX, diagramRightX - nodeWidth]` via `clampNodeX()`. This prevents nodes from being pushed off-screen.

---

## 6. Discovered Infrastructure

### Data Source

Discovered VMs are read from `window.discoveredInfrastructure.vms` (populated by Azure Resource Graph queries run at workspace connection time).

### VM Roles

| Role Values | Assigned Band |
|-------------|--------------|
| `syslog-collector`, `cef-collector`, `hybrid-syslog` | Syslog band (anchored to `syslog_cef` source column) |
| `windows-events`, `hybrid-windows` | Windows band (anchored to `windows_events` source column) |

### Active vs. Idle Classification

- **Active**: `vm.eps.avg > 0` — VM is sending data.
- **Idle**: `vm.eps.avg === 0` or `null` — VM has a DCR association but no data flowing.

### Active VM Layout

| Constant | Value | Meaning |
|----------|-------|---------|
| `DISC_VM_WIDTH` | 240 px | Width of each active VM card |
| `DISC_VM_HEIGHT` | 80 px | Approximate rendered height |
| `DISC_VM_GAP` | 16 px | Horizontal gap between VM cards |
| `DISC_VMS_PER_ROW` | 4 | Maximum VMs per row before wrapping |
| `DISC_VM_LAYER_GAP` | 70 px | Vertical breathing room between layout layers and the VM band |
| `DISC_VM_COLOR` | `#22c55e` | Edge color for discovered VM → Sentinel edges |

Active VMs from both syslog and windows groups are placed in a **grid-wrap layout**:
- Up to 4 VMs per row.
- Rows wrap downward.
- Syslog VMs anchor to the center-X of `syslog_cef` source rows.
- Windows VMs anchor to the center-X of `windows_events` source rows.
- If both groups share the same X column, Windows VMs are stacked **below** the Syslog grid.

### Idle VM Group

All idle VMs (from both syslog and windows roles) are collapsed into a single `discoveredIdleGroup` node:
- Width: 220 px.
- Placed to the **right of all active VM cards** at the same Y-level. Falls back to center if no active VMs exist.
- Displays: `⏸ Idle VMs × N` title, OS breakdown (e.g., `🐧 3 | 🪟 2`), and a truncated VM name list.

### Infra Summary Node

A `discoveredInfraSummary` node is always placed beside the Sentinel node (48 px to the right of Sentinel's right edge) at the same Y. It shows aggregate counts (Linux collectors, Windows servers, Arc machines, total EPS).

### Discovered VM Position Formula

```
discoveredVmY = max(row.y + row.rowHeight for all rows in band) + DISC_VM_LAYER_GAP
```

If no planned rows exist in the band, the VM layer falls back to just before the DCR layer.

---

## 7. Edge / Connection Rules

### Required Connections

Every node **must** trace a path to the Sentinel workspace node. No dangling nodes are permitted.

| From → To | Color | Notes |
|-----------|-------|-------|
| Source → DCR (shared) | Path color | Via shared DCR intermediary |
| Source → Sentinel (direct) | Path color | When path has no DCR (`azure_native`, `direct`) |
| Source → Cribl → Sentinel | Cribl color (`#5bc4f1`) | When solution uses Cribl delivery |
| DCR → Sentinel | Path color | All DCR-bearing paths |
| DiscoveredVM → Sentinel | `#22c55e` | Step edge, sourceBottom → targetTop |
| DiscoveredIdleGroup → Sentinel | `#22c55e` | Step edge, sourceBottom → targetTop |

### Edge Types

- Standard edges use React Flow `step` type for cleaner routing.
- Cribl → Sentinel uses a special `buildCriblToSentinelEdge` helper.

### Handle IDs

Nodes use named handles (`HANDLE_IDS`) for connection points. Top-band nodes connect via their **bottom** handle; bottom-band nodes connect via their **top** handle.

---

## 8. Visual Design

### Theme Support

The topology supports both `[data-theme="dark"]` (default) and `[data-theme="light"]` themes. Light-mode overrides exist for discovered VM nodes and idle group nodes.

### Key CSS Classes and Colors

| Class | Role | Notes |
|-------|------|-------|
| `.rf-source-node` | Source card | Background: `var(--bg-card)`, border: `var(--border-color)` |
| `.rf-server-node` | Server/VM card | Min 152 px, max 220 px |
| `.rf-dcr-node` | DCR node | `background: var(--bg-secondary)`, dashed border |
| `.rf-sentinel-node` | Workspace node | Blue gradient, `border: 2px solid #0078d4`, label color: `#50E6FF` |
| `.rf-uberbox-node` | Zone grouping | Transparent fill, colored border per zone, `pointer-events: none` |
| `.rf-uberbox-label` | Zone label | 11 px uppercase, `opacity: 0.75`, top-left of uber box |
| `.rf-cribl-node` | Cribl node | Gradient: `rgba(91,196,241,0.2)` → `rgba(15,23,42,0.94)`, border `#5bc4f1` |
| `.rf-discovered-vm-node` | Active discovered VM | Green gradient (`#f0fdf4` → `#dcfce7`), `border: 2px solid #22c55e` |
| `.rf-discovered-vm-node--arc` | Arc-connected VM | Dashed border, `border-color: #16a34a` |
| `.rf-discovered-idle-group` | Idle VM group | Muted gradient, `border: 2px dashed #86efac`, `opacity: 0.85` |
| `.rf-discovered-infra-summary` | Infra summary sidebar | Same green gradient as active VM cards |

### Connector Status Badges

Source items within a source node use a colored left-border rail and badge to indicate connector status:

| Status | Badge Text | Rail Color |
|--------|-----------|-----------|
| `active` | ✅ Active | `#4caf50` |
| `stale` | ⚠️ Stale | `#ff9800` |
| `connected` | ✓ Connected | `#10b981` |
| `new` | ✨ New | `#06b6d4` |

CSS modifier classes: `.rf-source-item--active`, `--connected`, `--stale`, `--new` and `.rf-connector-badge--active` etc.

### Topology Toolbar

The toolbar (`.topology-view-toolbar`) sits above the React Flow canvas. It contains:
- Filter buttons (All / Connected / New)
- Summary metadata
- Export / Reset Layout button

---

## 9. Interaction Rules

### Filters

Three filter modes exist (`TOPOLOGY_FILTERS`):

| Filter | Value | Effect |
|--------|-------|--------|
| All | `'all'` | Show all planned paths regardless of live connector status |
| Connected | `'connected'` | Show only connectors that are already connected in the workspace |
| New | `'new'` | Show only connectors not yet connected |

Filter state is held in `topologyViewState.filter` (in-memory, reset on re-render). The layout-save/restore is only available in `'all'` mode.

### Drag-and-Drop Layout

- All nodes are draggable by default except `uberBox` (which is fixed, `draggable: false`).
- Dragged positions are persisted to `localStorage` under `sentinelPlanner.topologyLayout.{subscriptionId}__{resourceGroup}__{workspaceName}`.
- The "Reset Layout" button clears `localStorage` for the current workspace and re-renders with the computed default layout.
- The Reset button is disabled when no saved layout exists.

### Zoom / Pan

Standard React Flow zoom and pan. No custom constraints applied.

### Selection

Nodes are selectable by default (React Flow default behavior). `uberBox` nodes have `selectable: false`.

### Export

`exportTopologyAsPdf()` uses `html2canvas` (v1.4.1) at 2× scale with CORS enabled. Background: `#1a1a2e`.

---

## 10. Constraints & Invariants

These are hard rules. Violating any of these is a regression.

### MUST NOT happen:

1. **No dangling nodes.** Every node must have an edge tracing it to `sentinel`. Nodes with no path to the workspace must not be rendered.

2. **No layer mixing.** Sources must not appear at the same Y-coordinate as DCR nodes. Collectors must sit between sources and DCRs, never beside or below DCRs.

3. **No VM overlap.** Discovered VMs must never overlap each other. The grid-wrap layout (`DISC_VMS_PER_ROW = 4`) must always be respected. When VMs from two groups share the same anchor X, the second group is stacked below the first (not side-by-side).

4. **No Cribl as a top-level source.** Cribl must not appear in the source layer or as an uber-box path type. It is a transport/delivery layer. *(Enforcement of this rule is pending — see §11.)*

5. **No uber box for Cribl.** Cribl does not get its own band/uber-box. Cribl appears at workspace Y-level as a sidecar node, with sources connecting *through* it.

6. **No firewall source connecting directly to DCR.** Firewall/network appliance sources (Zscaler, Barracuda, Cisco ASA, Palo Alto, and any `syslog_cef` path type) must always route through a Linux Forwarder VM. There must be a visible edge from source → Linux Forwarder → DCR → Sentinel.

7. **Idle VMs must never render as individual cards.** All VMs with `eps.avg === 0 || null` are collapsed into the `discoveredIdleGroup` node. Rendering idle VMs as individual `discoveredVm` nodes is a bug.

8. **Uber boxes must not overlap each other** (within the same band). Zones in the same band are packed horizontally without overlap. Layer boxes must not bleed into each other — see §2 "Layer Box Visual Rendering Constraints" for enforced gap and width rules.

9. **Layout must remain stable across content-pack filter changes.** Toggling filters must not cause unexpected node position jumps or DCR/source misalignments.

10. **The Sentinel node must always be centered.** The workspace node X must equal the weighted center of all zone layouts. Off-center Sentinel node positions indicate a layout engine regression.

11. **Minimum 70 px gap between VM layer and adjacent layers.** `DISC_VM_LAYER_GAP = 70` must not be reduced below 70.

12. **DCR nodes with `null` dcr value must not be rendered.** Paths with `dcr: null` in `PATH_CONFIGS` (`azure_native`, `direct`, `unmatched`) must connect directly Source → Sentinel without a DCR node.

13. **Every node must belong to a named layer uber box.** The four layers are: Sources, Collection Infrastructure, Pipeline & Transformations, Workspace. No component may float outside its layer container. Orphaned nodes are a regression.

14. **Layer boxes within the same band must all share the same width** (determined by the Sources layer in that band). A Collection Infrastructure or Pipeline & Transformations box that is narrower than its Sources box is a visual regression.

15. **The Workspace layer occupies its own vertical space in the center.** It sits between the top-band Pipeline & Transformations and bottom-band Pipeline & Transformations, with gaps enforced on both sides. The Workspace must never be absorbed into or overlap with any Pipeline box.

---

## 11. Pending Changes

### bug-cribl-001 — Cribl as Transport Layer (pending implementation)

**Status:** Not yet implemented. Cribl currently renders as a standalone node at Sentinel Y-level.

**Desired behavior:**
- Cribl is a **transport/delivery layer**, not a source and not a standalone connector.
- When a user selects a source (e.g., Barracuda) with "Cribl" as the delivery method, Cribl should appear **under** or **within** the Barracuda source context — not as its own top-level node beside Sentinel.
- Cribl should have no uber box of its own.
- The edge path should be: `Source → Cribl (transport) → DCR → Sentinel`.
- The current `ROUTE_CRIBL` flag on source rows is the foundation for this; the rendering layer needs to be updated to embed Cribl visually beneath the source instead of beside the workspace.

**Risk:** High. This touches the node-placement logic for all Cribl-routed solutions. Validate against: no dangling sources, no Cribl uber box, correct DCR assignment, correct edge routing.

---

### bug-topo-004 — Grid-Wrap for Discovered VMs (in progress)

**Status:** `DISC_VMS_PER_ROW = 4` is implemented in the layout engine, but rendering validation is needed for edge cases:
- When `activeWindowsVms` and `activeSyslogVms` share the same anchor X (close columns), the stacking logic (`windowsY = syslogY + syslogGridHeight + DISC_VM_GAP`) must be verified.
- When total VMs exceed 8 (two full rows), a third row should wrap cleanly without exceeding canvas width.
- Idle group placement to the right of all active cards must still hold when the active grid wraps to 2+ rows (the `rightmostActiveX` calculation uses only `p.x + DISC_VM_WIDTH`, which is the last card's right edge regardless of row — this is correct but should be verified).

**Risk:** Medium. Layout-only change. No data correctness concern, only visual overlap prevention.

---

## Appendix A: Key Constants Reference

| Constant | Value | File Location |
|----------|-------|--------------|
| `startY` | 30 | topology.js:1442 |
| `intermediaryNodeHeight` | 120 | topology.js:1463 |
| `intermediaryLayerGapY` | 152 | topology.js:1468 |
| `topSentinelGapY` | 96 | topology.js:1469 |
| `bottomSentinelGapY` | 120 | topology.js:1470 |
| `bottomSourceGapY` | 140 | topology.js:1471 |
| `zoneInnerPaddingX` | 24 | topology.js:1473 |
| `zoneInternalRowGap` | 32 | topology.js:1474 |
| `sentinelNodeWidth` | 220 | topology.js:1464 |
| `sentinelNodeHeight` | 132 | topology.js:1465 |
| `DISC_VM_WIDTH` | 240 | topology.js:2026 |
| `DISC_VM_GAP` | 16 | topology.js:2027 |
| `DISC_VM_LAYER_GAP` | 70 | topology.js:2028 |
| `DISC_VMS_PER_ROW` | 4 | topology.js:2029 |
| `DISC_VM_HEIGHT` | 80 | topology.js:2061 |
| `DISC_VM_IDLE_WIDTH` | 220 | topology.js:2138 |
| `DISC_VM_COLOR` | `#22c55e` | topology.js:2025 |
| `COLLAPSE_THRESHOLD` | 3 | topology.js:305 |
| `DCR_MAX_SERVERS` | 4000 | topology.js:280 |
| `WINDOWS_DCR_MAX_REQUESTS_PER_MIN` | 12000 | topology.js:278 |
| `SYSLOG_DCR_MAX_EPS` | 65000 | topology.js:286 |
| `CRIBL_NODE_ID` | `'shared-cribl-node'` | topology.js:293 |

---

## Appendix B: localStorage Keys

| Key | Purpose |
|-----|---------|
| `sentinelPlanner.topologyLayout.{sub}__{rg}__{ws}` | Persisted node positions for drag-and-drop layout |
| `sentinelPlanner.workspaceConnectionState` | Last selected workspace (used to derive layout key) |
