# Sentinel Onboarding Planner — Topology Specification

> **This is a living document. Any topology change must be validated against these rules.**
>
> Owner: Maria (madesous_microsoft)
> Last reviewed: 2026-06-12
> Source of truth: `js/modules/topology.js`, `css/style.css`, and design decisions captured below.

---

## Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.3 | 2026-06-12 | Joi / Maria | VM+DCR chain validation for source status: syslog_cef, windows_events, and linux_server sources now verify active/idle/missing VM+DCR chains instead of using table-based detection. New "Existing VMs" and "Calculated VMs" node semantics. Cribl-routed bypass path documented. Full decision tree added (§7). |
| 1.2 | 2026-06-11T12:26:56Z | Joi / Maria | ✅ All topology features completed: per-connector status chips, dynamic heights, infra inheritance, filter exclusions, uber box auto-expand, pathBox de-collision, Cribl band-split (top/bottom nodes), existing infrastructure box, layer box de-collision, duration scaling extended, solution card colors (cyan/green), SRI hashes, MITRE fallback. |
| 1.1 | 2026-06-11 | Joi / Maria | Per-connector status, dynamic heights, infra inheritance, filter exclusions |
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
4. **Layer boxes must NEVER bleed into each other.** A minimum gap (`LAYER_GAP = 20px`) must be enforced between adjacent layer boxes.
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
| `source` | `SourceNode` | `.rf-source-node` | The data-generating device or service (firewall, server, SaaS app). Min-width 260 px, max 320 px. Wide variant (`.rf-source-node--wide`) for Windows pool grids: min 640 px. **Height is dynamic** based on solution count: `sourceNodeChrome(60) + solutionCount * sourceItemHeight(32)`, minimum `sourceNodeHeight(220)`. All solutions are now rendered (no 5-item limit). |
| `pathBox` | `PathBoxNode` | `.rf-path-node` | Inline connector/transport step within a path (e.g., "CCP / API Connector", "Diagnostic Settings"). **Inherits status from its feeding source group**: if source status is 'new', pathBox is 'new'; otherwise 'existing'. Visual indicators: `.rf-path-node.rf-node--new` shows dashed border (bright), `.rf-path-node.rf-node--existing` shows solid border (muted). |
| `cribl` | `CriblNode` | `.rf-cribl-node` | Cribl Stream aggregation node. **Rendered as two separate nodes at workspace Y-level: one per band (`CRIBL_NODE_ID_TOP` for top band, `CRIBL_NODE_ID_BOTTOM` for bottom band).** This band-split design allows Cribl routes from both top and bottom bands to converge independently on the Sentinel workspace node. |
| `server` | `ServerNode` | `.rf-server-node` | Represents a VM or server in the planned topology (Linux Forwarder, Windows Server). Min-width 152 px, max 220 px. **Inherits status from its feeding source group**. |
| `dcr` | `DCRNode` | `.rf-dcr-node` | Data Collection Rule. Dashed border. Min-width 140 px; with sources shown: min 220 px, max 260 px. **Inherits status from its feeding source group**. |
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
| `shared-cribl-node-top` | Cribl Stream node for top band (on-premises / Azure IaaS sources) |
| `shared-cribl-node-bottom` | Cribl Stream node for bottom band (Microsoft 365 / SaaS sources) |
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
- `topIntermediaryOffsetY = 420` — vertical offset from top-band sources to first intermediary layer (increased from 72 to provide more visual breathing room).
- `bottomSentinelGapY = 120` — gap from Sentinel bottom to first bottom-band DCR.
- `bottomSourceGapY = 140` — additional gap from bottom DCR to bottom sources.

### Sentinel Node Position

The Sentinel workspace node is horizontally centered on the **weighted center X** of all zone layouts. The layout engine performs two passes to converge on a stable center before rendering.

### Zone (Uber Box) Positioning

Each zone gets a contiguous horizontal band. Zones in the same vertical band are placed left-to-right. Inner padding: `zoneInnerPaddingX = 24 px`. Internal row gap: `zoneInternalRowGap = 32 px`.

### Source Node Height Calculation (Dynamic)

Source node height is now **dynamic** and depends on the number of solutions in the group:

```
dynamicHeight = sourceNodeChrome(60) + solutionCount × sourceItemHeight(32)
finalHeight = max(sourceNodeHeight(220), dynamicHeight)
```

**Example calculations:**
- 1 solution: 60 + 1×32 = 92 → clamped to minimum 220 px
- 5 solutions: 60 + 5×32 = 220 px
- 10 solutions: 60 + 10×32 = 380 px
- 13 solutions: 60 + 13×32 = 476 px

The `estimateRowHeight()` function in the layout engine computes per-node height during the band layout pass. Uber boxes auto-expand vertically since `zoneEndY = maxRowBottom + zoneBottomPadding`, which naturally accommodates taller source nodes.

**All solutions are now rendered** — the previous 5-item limit with "+X more" indicator has been removed. This increases source node height variability but ensures complete visibility of all planned connectors.

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

## 6. Infrastructure Status Inheritance

Collection Infrastructure and Pipeline nodes (PathBox, DCR, server) inherit their status from their feeding source group. This ensures visual consistency across the entire ingestion path.

### Status Inheritance Rules

| Source Status | Inherited Status | Visual Indicator |
|---------------|------------------|-----------------|
| `new` | `new` | Dashed border (bright color), indicates new path not yet connected |
| `existing` | `existing` | Solid border (muted color), indicates established path |
| `connected-idle` | `existing` | Solid border (muted color), treated as existing even if idle |
| `partial` | `existing` | Solid border (muted color), treated as existing (mixed active/idle) |

### Status Calculation

The `getSourceStatus()` function determines a source group's overall status. The logic differs between **VM-dependent** and **non-VM source types**.

**Non-VM source types** (`azure_native`, `direct`, `event_hub`, `api`, `logic_app`) use standard table-based detection:
- If all solutions are 'new' → group status = `new`
- If all solutions are 'connected' or 'connected-idle' → group status = `existing` (or `connected-idle` if any are idle)
- If mixed → group status = `partial` (treated as `existing` for CSS purposes)

**VM-dependent source types** (`syslog_cef`, `windows_events`, `linux_server`) use **VM+DCR chain validation** — see §7 for the full rules.

Downstream nodes (PathBox, DCR, server) that feed from this source then apply:
```
infraStatus = sourceStatus === 'new' ? 'new' : 'existing'
```

### CSS Implementation

- `.rf-node--new`: Dashed border, bright accent color (typically the path color)
- `.rf-node--existing`: Solid border, muted accent color (path color with reduced opacity)

Affected node types: `PathBoxNode`, `ServerNode`, `DCRNode`, `DiscoveredVmNode`, `CriblNode`.

---

## 7. Source Status Verification (VM+DCR Chain)

This section defines how source status is determined for the three VM-dependent source types: **syslog_cef**, **windows_events**, and **linux_server**. These types no longer rely solely on table detection. Instead, status is derived by validating the entire chain: Source → VM (with a matching DCR configured for that source type) → active data flow.

### 7.1 DCR Type Mapping

Each VM-dependent source type maps to specific DCR types for chain matching:

| Source Type | Matching DCR Types |
|-------------|-------------------|
| `syslog_cef` | `cef`, `syslog` |
| `windows_events` | `windows` |
| `linux_server` | `syslog` |

A VM is considered **relevant** for a source only if it has at least one DCR of the matching type associated with it. VMs without a matching DCR are not considered part of the chain for that source type.

### 7.2 VM Staleness

VMs older than the staleness threshold (or with last-heartbeat beyond the cutoff) are classified as **stale** and excluded from all chain validation. Stale VMs do not influence source status and are not rendered in the topology.

### 7.3 Source Status Decision Rules

For each VM-dependent source type, the resolved status is:

| Condition | Source Status | Badge |
|-----------|--------------|-------|
| Any active VMs (EPS > 0) exist with a matching DCR | `CONNECTED` | Green CONNECTED |
| No active VMs, but idle VMs (heartbeat, EPS = 0) exist with a matching DCR | `IDLE` | Yellow IDLE |
| No VMs with a matching DCR exist (regardless of table detection) | `NEW` | *(no badge)* |

> **Key rule:** A source can be `NEW` even if its target table has rows, if no VMs with matching DCRs are found. Table detection alone is **not sufficient** for VM-dependent types.

### 7.4 Cribl-Routed Sources

Any `syslog_cef` source where the user has toggled **Cribl** in the sizing drawer bypasses the VM+DCR chain entirely. The ingestion path for a Cribl-routed source is:

```
Source → Cribl Stream → Sentinel
```

No collector VM appears in the path. The source status for Cribl-routed connectors follows standard Cribl connector status rules (not VM+DCR chain validation).

### 7.5 Full Decision Tree (syslog_cef / CEF Sources)

```
Is this source Cribl-routed?
├── YES → Source → Cribl Stream → Sentinel
│         (Source status: per Cribl connector rules)
│
└── NO → Do active VMs (EPS > 0) with matching DCRs exist?
         ├── YES → Source (CONNECTED) → Existing VM (CONNECTED) → DCR → Sentinel
         │
         └── NO → Do idle VMs (EPS = 0, heartbeat) with matching DCRs exist?
                  ├── YES → Source (IDLE) → Existing VM (IDLE) → DCR → Sentinel
                  │
                  └── NO → Source (NEW) → Calculated VM (NEW) → DCR → Sentinel
```

The same tree applies to `windows_events` and `linux_server` (without the Cribl branch — those types are never Cribl-routed).

### 7.6 Existing VMs Node

The **Existing VMs** node is rendered in the Collection Infrastructure layer **only** when active or idle VMs with matching DCRs are found for the source type. It is **not** rendered for NEW sources.

| Property | Rule |
|----------|------|
| Rendered when | Active or idle VMs with matching DCRs exist (stale VMs excluded) |
| Not rendered when | Source is NEW (no matching VMs) |
| Badge | CONNECTED if any active VMs present; IDLE if only idle VMs |
| Connects to | Only sources verified as CONNECTED or IDLE (not NEW sources) |

### 7.7 Calculated VMs Node

The **Calculated VMs** node is rendered **only** when the source is verified as NEW (no existing infrastructure path for that source type).

| Property | Rule |
|----------|------|
| Rendered when | Source status is NEW |
| Not rendered when | Existing VMs with matching DCRs are present |
| Badge | Always NEW |
| Represents | Recommended infrastructure to deploy (sizing-derived VM count) |

---

## 8. Discovered Infrastructure

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

## 9. Edge / Connection Rules

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

## 10. Visual Design

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

Per-connector status is now displayed as an **inline badge** next to each solution name within a source node. This replaced the previous group-level footer chip.

| Status | Badge Text | CSS Class | Style |
|--------|-----------|-----------|-------|
| `connected` | CONNECTED | `.rf-sol-inline-status--connected` | Green background |
| `connected-idle` | IDLE | `.rf-sol-inline-status--connected-idle` | Yellow/amber background |
| `new` | *(hidden)* | *(not shown)* | Connectors marked 'new' do not display an inline badge |

Each solution item (`.rf-source-item`) within a `.rf-source-node` renders its status via the `.rf-sol-inline-status` class if the solution has a live status ('connected' or 'connected-idle'). The status is derived from `getSolutionStatus()`, which checks `connectedSolutionIds` and last-log timestamp to determine if a connector is active or idle (>7 days without data).

### Topology Toolbar

The toolbar (`.topology-view-toolbar`) sits above the React Flow canvas. It contains:
- Filter buttons (All / Connected / New)
- Summary metadata
- Export / Reset Layout button

**Status Messages:**
- **Reconnect message** (success tone, green): Displays when the workspace reconnects successfully to the Log Analytics workspace.
- **Warning message** removed: The "⚠ Active table analysis unavailable" diagnostic warning is no longer shown. Reconnect messages are now green-toned (success indicator) only.

---

## 11. Interaction Rules

### Filters

Three filter modes exist (`TOPOLOGY_FILTERS`):

| Filter | Value | Effect |
|--------|-------|--------|
| All | `'all'` | Show all planned paths regardless of live connector status |
| Connected | `'connected'` | Show only connectors that are already connected in the workspace |
| New | `'new'` | Show only connectors not yet connected |

Filter state is held in `topologyViewState.filter` (in-memory, reset on re-render). The layout-save/restore is only available in `'all'` mode.

**Filter Dimming Behavior:**
When a filter is active (Existing or New), individual connector items (`.rf-source-item`) are dimmed (`opacity: 0.2`) or brightened (`opacity: 1`) to indicate match status. **However, two node types are exempt from dimming:**
- **Uber boxes** (`.rf-uberbox-node`) — always remain fully opaque
- **Layer boxes** (`.rf-layer-box`) — always remain fully opaque

This ensures that zone groupings and layer containers remain visually intact and readable even when filtering hides or dims many individual connectors within them.

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

## 12. Constraints & Invariants

These are hard rules. Violating any of these is a regression.

### MUST NOT happen:

1. **No dangling nodes.** Every node must have an edge tracing it to `sentinel`. Nodes with no path to the workspace must not be rendered.

2. **No layer mixing.** Sources must not appear at the same Y-coordinate as DCR nodes. Collectors must sit between sources and DCRs, never beside or below DCRs.

3. **No VM overlap.** Discovered VMs must never overlap each other. The grid-wrap layout (`DISC_VMS_PER_ROW = 4`) must always be respected. When VMs from two groups share the same anchor X, the second group is stacked below the first (not side-by-side).

4. **No Cribl as a top-level source.** Cribl must not appear in the source layer or as an uber-box path type. It is a transport/delivery layer. ✅ Enforced — Cribl nodes render only at workspace Y-level, split per band (`CRIBL_NODE_ID_TOP` and `CRIBL_NODE_ID_BOTTOM`).

5. **No uber box for Cribl.** Cribl does not get its own band/uber-box. Cribl appears at workspace Y-level as a sidecar node (per band: `CRIBL_NODE_ID_TOP` and `CRIBL_NODE_ID_BOTTOM`), with sources connecting *through* it. ✅ Enforced.

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

16. **VM-dependent source status must use VM+DCR chain validation, not table detection alone.** For `syslog_cef`, `windows_events`, and `linux_server` source types, status MUST be derived from the VM+DCR chain (§7). A source may not be marked CONNECTED solely because its target table has rows if no VMs with matching DCRs exist.

17. **Existing VMs node must not render for NEW sources.** An Existing VMs node must only appear when at least one active or idle (non-stale) VM with a matching DCR is found for the source type. Rendering it for NEW sources is a bug.

18. **Calculated VMs node must not render when Existing VMs are present.** Calculated VMs represent recommended-but-undeployed infrastructure. If Existing VMs (active or idle) are found for a source type, the Calculated VMs node must be suppressed.

19. **Cribl-routed sources must bypass the VM layer entirely.** A syslog_cef source marked as Cribl-routed must connect Source → Cribl Stream → Sentinel. No collector VM node may appear in its ingestion path.

---

## 13. Completed Features (v1.3)

### ✅ VM+DCR Chain Validation for Source Status (COMPLETED)
**Status:** Implemented. Source status for `syslog_cef`, `windows_events`, and `linux_server` is now derived from full VM+DCR chain validation rather than table detection. A source is CONNECTED only if active VMs with matching DCRs exist; IDLE if only idle VMs match; NEW if no matching VMs exist. See §7 for the full specification.

### ✅ DCR Type Matching per Source Type (COMPLETED)
**Status:** Implemented. Each VM-dependent source type maps to specific DCR types: `syslog_cef` → `cef`/`syslog`; `windows_events` → `windows`; `linux_server` → `syslog`. A VM must have a DCR of the matching type to count as part of the chain.

### ✅ Existing VMs Node — Conditional Rendering (COMPLETED)
**Status:** Implemented. The Existing VMs node renders in the Collection Infrastructure layer only when active or idle (non-stale) VMs with matching DCRs are found. Badge reflects actual VM health: CONNECTED if any active VM present, IDLE if only idle VMs. Not rendered for NEW sources.

### ✅ Calculated VMs Node — NEW Sources Only (COMPLETED)
**Status:** Implemented. The Calculated VMs node renders only when source status is NEW (no existing VM+DCR chain found). Always shows NEW badge. Represents sizing-recommended infrastructure to deploy. Suppressed whenever Existing VMs are present.

### ✅ Cribl-Routed Source Bypass (COMPLETED)
**Status:** Implemented. `syslog_cef` sources toggled as Cribl-routed bypass VM+DCR chain validation entirely. Path: Source → Cribl Stream → Sentinel. No collector VM in the path. Status follows standard Cribl connector rules.

### ✅ Per-Connector Status Chips (COMPLETED)
**Status:** Implemented and tested. Per-connector inline badges now display within each source node for every solution with live workspace status. Status logic: `connected` (green CONNECTED badge), `connected-idle` (yellow IDLE badge), `new` (no badge shown).

### ✅ Cribl Band-Split (COMPLETED)
**Status:** Implemented as `CRIBL_NODE_ID_TOP` and `CRIBL_NODE_ID_BOTTOM`. Cribl Stream nodes now render separately per band, allowing independent Cribl routing flows from top-band sources (on-premises/Azure IaaS) and bottom-band sources (Microsoft 365/SaaS) to converge at the Sentinel workspace node. This replaces the previous singleton `shared-cribl-node` design.

### ✅ Infrastructure Boxes Auto-Expand (COMPLETED)
**Status:** Collection Infrastructure and Pipeline & Transformations layer boxes now automatically expand vertically to accommodate taller source nodes. The layout engine calculates the maximum node height per band and extends the layer box boundaries accordingly. No clipping or truncation occurs.

### ✅ Dynamic Source Node Height (COMPLETED)
**Status:** Source node heights are now fully dynamic: `dynamicHeight = sourceNodeChrome(60) + solutionCount × sourceItemHeight(32)`, clamped to a minimum of 220 px. All solutions render without a 5-item limit or "+X more" indicator. Complete solution visibility is maintained.

### ✅ All Connectors Visible (COMPLETED)
**Status:** The 5-item slice limit has been removed. All planned solutions now render in full within their source nodes, ensuring complete transparency of the ingestion topology.

### ✅ Filter Dimming Excludes Uber/Layer Boxes (COMPLETED)
**Status:** When filters are active (Existing or New), individual connector items (`.rf-source-item`) are dimmed, but **uber boxes** (`.rf-uberbox-node`) and **layer boxes** (`.rf-layer-box`) remain fully opaque. This maintains visual coherence of zone groupings and layer containers even when filtering hides many individual solutions.

### ✅ Duration Scaling Extended to All Field Packs (COMPLETED)
**Status:** Duration scaling in the Gantt planner is now applied to all field pack types, not just infrastructure connectors. Task durations reflect capacity and complexity across all solution categories.

### ✅ PathBox De-Collision (COMPLETED)
**Status:** Y-bucket grouping and X-nudge logic prevent pathBox nodes from overlapping. Boxes within the same Y-band are grouped and nudged horizontally to avoid collision.

### ✅ Layer Box De-Collision (COMPLETED)
**Status:** Layer boxes (Sources, Collection, Transformation, Workspace) no longer overlap. The layout engine enforces minimum `LAYER_GAP` (20 px) between adjacent boxes. Workspace box sits centrally without bleeding into top- or bottom-band transformation layers.

### ✅ Existing Linux VMs Box in Collection Infrastructure (COMPLETED)
**Status:** Discovered infrastructure now includes a visual summary box showing total active and idle Linux VMs discovered from Azure Resource Graph. This box renders in the Collection Infrastructure layer, providing visibility into real deployed agents.

### ✅ SRI Integrity Hashes on CDN Scripts (COMPLETED)
**Status:** All React, ReactDOM, ReactFlow, frappe-gantt, and exceljs scripts in `index.html` now include `integrity=` attributes with SHA-384 hashes. This prevents supply-chain attacks via CDN compromise. See `decisions.md` for CDN security policy.

### ✅ MITRE Fallback to Pre-Baked Data (COMPLETED)
**Status:** MITRE ATT&CK coverage analysis now falls back gracefully to `data/mitre-coverage.json` when GitHub API is unavailable. The pre-baked dataset ensures offline availability and reduces API quota dependency.

### ✅ Solution Card Colors: Cyan (Newly Selected) / Green (Already Connected) (COMPLETED)
**Status:** In the planner view, solution cards display visual cues: cyan highlighting for newly selected solutions, green highlighting for solutions already connected in the workspace. The FEATURED badge color was changed from yellow to cyan to match the newly-selected-solution visual language.

---

## 14. Pending Changes

### None — All Features Complete
As of v1.3 (2026-06-12), all planned topology features including VM+DCR chain validation are implemented and validated against the topology.js codebase. The specification is now a reliable reference for the current implementation state.

## Appendix A: Key Constants Reference

| Constant | Value | File Location | Notes |
|----------|-------|--------------|-------|
| `startY` | 30 | topology.js:1442 | Top of diagram canvas |
| `sourceNodeChrome` | 60 | topology.js:1218 | Header height of source node (title + handles) |
| `sourceItemHeight` | 32 | topology.js:1217 | Height of each solution item within a source node |
| `sourceNodeHeight` | 220 | topology.js:1435 | Minimum height for source node |
| `intermediaryNodeHeight` | 120 | topology.js:1463 | Height of DCR / path-box nodes |
| `intermediaryLayerGapY` | 152 | topology.js:1468 | Vertical gap between intermediary layers |
| `topSentinelGapY` | 96 | topology.js:1469 | Gap from top-band sources to Sentinel |
| `topIntermediaryOffsetY` | 420 | topology.js:1466 | Offset from top sources to first intermediary layer (updated from 72) |
| `bottomSentinelGapY` | 120 | topology.js:1470 | Gap from Sentinel to bottom-band DCR |
| `bottomSourceGapY` | 140 | topology.js:1471 | Gap from bottom DCR to bottom sources |
| `zoneInnerPaddingX` | 24 | topology.js:1473 | Horizontal padding within zone |
| `zoneInternalRowGap` | 32 | topology.js:1474 | Vertical gap between rows within zone |
| `sentinelNodeWidth` | 220 | topology.js:1464 | Sentinel workspace node width |
| `sentinelNodeHeight` | 132 | topology.js:1465 | Sentinel workspace node height |
| `LAYER_GAP` | 20 | topology.js (createLayerBoxNodes) | Gap between adjacent layer boxes (updated from 12) |
| `DISC_VM_WIDTH` | 240 | topology.js:2026 | Width of each discovered VM card |
| `DISC_VM_GAP` | 16 | topology.js:2027 | Horizontal gap between VM cards |
| `DISC_VM_LAYER_GAP` | 70 | topology.js:2028 | Vertical gap between VM layer and adjacent layers |
| `DISC_VMS_PER_ROW` | 4 | topology.js:2029 | Maximum VMs per row before wrapping |
| `DISC_VM_HEIGHT` | 80 | topology.js:2061 | Height of discovered VM card |
| `DISC_VM_IDLE_WIDTH` | 220 | topology.js:2138 | Width of idle VM group node |
| `DISC_VM_COLOR` | `#22c55e` | topology.js:2025 | Color for discovered VM edges |
| `COLLAPSE_THRESHOLD` | 3 | topology.js:305 | Threshold for Windows pool grid layout (>2 pools) |
| `IDLE_THRESHOLD_MS` | 604800000 (7 days) | topology.js:845 | Duration threshold for marking connector as idle |
| `DCR_MAX_SERVERS` | 4000 | topology.js:280 | Maximum servers per DCR |
| `WINDOWS_DCR_MAX_REQUESTS_PER_MIN` | 12000 | topology.js:278 | Windows DCR request limit |
| `SYSLOG_DCR_MAX_EPS` | 65000 | topology.js:286 | Syslog DCR EPS limit |
| `CRIBL_NODE_ID_TOP` | `'shared-cribl-node-top'` | topology.js:83 | ID for Cribl Stream node (top band) |
| `CRIBL_NODE_ID_BOTTOM` | `'shared-cribl-node-bottom'` | topology.js:84 | ID for Cribl Stream node (bottom band) |

---

## Appendix B: localStorage Keys

| Key | Purpose |
|-----|---------|
| `sentinelPlanner.topologyLayout.{sub}__{rg}__{ws}` | Persisted node positions for drag-and-drop layout |
| `sentinelPlanner.workspaceConnectionState` | Last selected workspace (used to derive layout key) |
