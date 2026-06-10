# Decision: DCR/VM Infrastructure Discovery Layer

**Author:** Sebastian (Data Engineer)
**Date:** 2026-06-10T11:13:38+02:00
**Status:** Implemented

---

## Context

Step 4 (Topology) needs to show which VMs and Arc machines are already sending data to the workspace, what DCRs govern them, and at what EPS. Without this layer, the topology view can only show connector types, not the actual machines behind them.

---

## Decision: Two-Phase Resource Graph + KQL Discovery

Discovery runs in five queries after connector discovery completes:

1. **Resource Graph — Workspace DCRs**: Get all DCRs whose `destinations.logAnalytics.workspaceResourceId` contains the workspace name. This seeds the `dcrById` map with stream information.
2. **Resource Graph — DCR Associations**: Get all `microsoft.insights/datacollectionruleassociations` across the subscription. Filter to only those referencing a workspace-targeting DCR. Group by VM resource ID.
3. **Resource Graph — VM Details**: For the discovered VM names, fetch `hardwareProfile.vmSize`, `storageProfile.osDisk.osType`, `location`, `resourceGroup` from both `microsoft.compute/virtualmachines` and `microsoft.hybridcompute/machines`.
4. **KQL — EPS**: `union Syslog, CommonSecurityLog, SecurityEvent` over last 24h — `AvgEPS`, `MaxEPS`, `TotalEvents` per computer.
5. **KQL — CEF Source Devices**: `CommonSecurityLog` over last 24h — deduplicated source device names per collector computer.

All five are individually fault-tolerant (`safeGraph`/`safeKql`). The overall function is non-blocking (fire-and-forget at the call site).

---

## Alternatives Considered

**Single joined Resource Graph query:** Resource Graph supports `join kind=inner` across `resources` and `insightsresources`, but the association table often returns 100k+ rows in large subscriptions and the join hits the 3MB response cap. Two-pass filtering is safer.

**Polling approach (setInterval until data arrives):** Rejected — adds timing complexity and risks rendering stale data. A simple `.then(() => renderTopologyStep())` is cleaner and sufficient.

---

## Output Shape

```
window.discoveredInfrastructure = {
    vms: [{ name, type, size, os, location, resourceGroup, resourceId, dcrs[], eps, sourceDevices[], role }],
    summary: { totalVMs, syslogCollectors, cefCollectors, windowsSources, arcMachines, totalEPS },
    discoveredAt: ISO string,
    status: 'complete' | 'partial' | 'failed'
}
```

Role classification priority (Linux): cef-collector > syslog-collector  
Role classification priority (Windows): windows-events  
Arc machines: hybrid-syslog or hybrid-windows

---

## Impact

- `js/app.js`: ~190 lines added (`resourceGraphQuery` helper + `discoverExistingInfrastructure` function + two fire-and-forget insertion points)
- `index.html`: cache-bust v=11 → v=12
- No existing behavior changed; discovery is additive and non-blocking

---

## For Agent K (Topology)

`window.discoveredInfrastructure` is available after the `.then()` resolves. Check `status !== 'failed'` and `vms.length > 0` before rendering. If `getCurrentStep() === 4` when discovery completes, `renderTopologyStep()` is called automatically. The `role` field maps directly to topology node types: `syslog-collector`, `cef-collector`, `windows-events`, `hybrid-syslog`, `hybrid-windows`.
