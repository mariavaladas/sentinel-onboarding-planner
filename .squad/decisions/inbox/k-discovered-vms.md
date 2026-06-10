# Decision: Discovered VM Topology Rendering

**Date:** 2026-06-10T11:18:31+02:00  
**Author:** K (Frontend Dev)  
**Status:** Implemented

## Context

Sebastian is building DCR-association discovery in `app.js` that will produce `window.discoveredInfrastructure` with real customer VM data (names, OS, EPS, role, source devices). The topology step needs to render these VMs as distinct "existing infrastructure" nodes so planners can see what's already deployed before planning new collectors.

## Decisions

### 1. Purely additive, no existing path changes

The new code path (`buildDiscoveredInfrastructureNodes()`) only runs when `window.discoveredInfrastructure?.vms` has entries. If the global is absent, undefined, or an empty array, the function returns `{ nodes: [], edges: [] }` and the topology renders exactly as before. Zero regression risk.

### 2. Green = existing, blue = planned

Existing collector VMs (planned in the planner) use blue (`pc.color` from `PATH_CONFIGS`). Discovered VMs use solid green (`#22c55e`) to clearly signal "this already exists in your tenant." Arc machines get a dashed green border (`.rf-discovered-vm-node--arc`), mirroring the existing planned-collector dashed blue pattern.

### 3. Positioning: reuse planned collector Y, offset X

When a planned collector VM is already placed in `collectorVmPlacementById` for the same band, discovered VMs inherit that Y so they appear side-by-side. The X is offset by `collectorVmWidth + DISC_VM_GAP` to avoid overlap. When no planned collector exists, Y falls back to `getTopLayerY(max(1, topDcrLayerIndex-1))`.

### 4. Role-to-band mapping

| Role | Band |
|------|------|
| `syslog-collector`, `cef-collector`, `hybrid-syslog` | top (syslog_cef rows) |
| `windows-events`, `hybrid-windows` | top (windows_events rows) |

If both syslog and windows groups exist, windows VMs are staggered one `intermediaryLayerGapY` below syslog to avoid vertical overlap.

### 5. Summary node beside Sentinel

A compact `discoveredInfraSummary` node is placed at `sentinelCenterX + sentinelNodeWidth/2 + 48, sentinelY` — right of the Sentinel node. It shows Linux/Windows/Arc counts and total EPS. This gives planners a fast overview without needing to read each individual VM node.

### 6. Source devices are display-only

`vm.sourceDevices` (firewall hostnames) are shown as text inside the VM node (`📡 PA-5260, ...`), but no edges are drawn from those device names to the VM node — the device names are not ReactFlow node IDs and cannot be reliably resolved to existing source nodes. This is intentional; the source→VM routing is implicit from the role.

## Files Changed

- `js/modules/topology.js` — `buildDiscoveredInfrastructureNodes()` function, `DiscoveredVmNode` and `DiscoveredInfraSummaryNode` React components, updated `nt` nodeTypes map
- `css/style.css` — `.rf-discovered-vm-node`, `.rf-discovered-vm-node--arc`, `.rf-discovered-infra-summary` and sub-element classes with dark+light theme support

## Contract with Sebastian

`window.discoveredInfrastructure` must be set before `renderTopology()` is called for the first render, OR Sebastian must call the topology re-render after the async discovery completes. Topology reads the global synchronously at render time — no subscription/listener mechanism needed.
