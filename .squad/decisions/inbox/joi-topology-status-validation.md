# Decision: VM+DCR Chain Validation for Source Status

**Date:** 2026-06-12  
**Author:** Joi (documentation)  
**Requested by:** Maria  
**Status:** Implemented  

---

## Context

Prior to v1.3, source status for all connector types (including `syslog_cef`, `windows_events`, and `linux_server`) was determined via table-based detection: if the connector's target table had recent rows, it was marked CONNECTED. This led to false-positive CONNECTED status when data arrived via legacy paths (e.g., direct syslog write) without the modern VM+AMA+DCR chain being deployed.

## Decision

Source status for VM-dependent types (`syslog_cef`, `windows_events`, `linux_server`) is now determined by **VM+DCR chain validation** instead of table detection alone.

**Chain:** Source → VM (with a matching DCR for that source type) → active data flow

### DCR Type Mapping

| Source Type | Matching DCR Types |
|-------------|-------------------|
| `syslog_cef` | `cef`, `syslog` |
| `windows_events` | `windows` |
| `linux_server` | `syslog` |

### Status Rules

| Condition | Resolved Status |
|-----------|----------------|
| Active VMs (EPS > 0) with matching DCR exist | CONNECTED |
| Idle VMs (EPS = 0, heartbeat) with matching DCR exist | IDLE |
| No VMs with matching DCR exist | NEW |

Stale VMs are excluded from all chain validation and not rendered.

### Node Rendering Consequences

- **Existing VMs node**: Renders only when active/idle VMs with matching DCRs exist. Badge = CONNECTED or IDLE based on health.
- **Calculated VMs node**: Renders only when source is NEW. Always shows NEW badge. Suppressed when Existing VMs exist.
- **Cribl-routed sources**: Bypass VM+DCR chain entirely. Path: Source → Cribl Stream → Sentinel.

### Non-VM source types unaffected

`azure_native`, `direct`, `event_hub`, `api`, `logic_app` continue to use table-based detection for status. No change to their behavior.

## Rationale

- A connected-looking status when the underlying modern infrastructure isn't deployed is misleading. Customers might skip VM provisioning thinking they're already ingesting correctly.
- The VM+DCR chain is the authoritative signal for whether the *recommended* AMA-based collection path is actually in place.
- Keeping non-VM sources on table detection is correct — those paths have no VM component to validate.

## Impact

- `getSourceStatus()` in `topology.js` updated.
- Existing VMs node rendering logic updated.
- Calculated VMs node rendering logic updated.
- Documentation: `docs/topology-spec.md` updated (v1.3), new §7 added.
