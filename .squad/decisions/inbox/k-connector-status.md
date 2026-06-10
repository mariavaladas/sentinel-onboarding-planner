# Decision: Active/Stale/New Connector Status with Last-Log Timestamps

**Date:** 2026-06-09T15:36:29+02:00  
**Author:** K  
**Status:** Implemented

## Context

Users were confused by "Connected" badges in the topology — a connector marked Connected only means the DCR/connector resource *exists* in the workspace. It says nothing about whether logs are actually flowing. The app had no way to distinguish a correctly ingesting connector from one that was configured months ago and has gone silent.

## Decision

Introduce a tri-state connector status system tied to real log timestamps from the workspace Usage table:

| State | Badge | Condition |
|-------|-------|-----------|
| **Active** | `✅ Active · Xh ago` | `max(TimeGenerated)` within last 24 h |
| **Stale** | `⚠️ Stale · Xd ago` | DCR exists + logs received, but NOT within 24 h |
| **New** | `✨ New` | Planned, not yet deployed (no DCR) |

The existing `✓ Connected` badge is kept as a safe fallback when the Usage query fails.

## Implementation

### KQL query change (app.js)
The Usage query now projects two columns instead of one:
```kql
Usage | where TimeGenerated > ago(14d)
| summarize TotalMB=sum(Quantity), LastLog=max(TimeGenerated) by DataType
| where TotalMB > 0 | project DataType, LastLog
```
`queryWorkspace` was extended with a `returnRows: true` option (default `false` for backward compat) returning `{ columns, rows }` — no change to callers that use the single-column path.

### Data pipeline (app.js → solutions.js → topology.js)
1. Call sites parse `rows` into `dataTypeList` (strings) + `lastLogMap` (`Map<DataType, ISO>`)
2. `buildConnectorsFromDataTypes(dataTypes, lastLogMap)` attaches `._lastLog` to each connector object
3. `selectWorkspaceDiscoveryConnectors` passes `lastLogMap` through
4. `resolveConnectedSolutionIds` — when resolving connector → solutionIds, for any connector carrying `._lastLog`, that timestamp is copied to `localSolutionLastLogMap` for each matched solutionId
5. `setConnectedSolutionsFromWorkspace` stores the result as module-level `solutionLastLogMap` and exposes it as `window.connectorLastSeenMap` (plain object keyed by solutionId)

### Topology badge rendering (topology.js)
`getConnectorStatusMeta(solution)`:
- If not connected → `new`
- If connected but no entry in `window.connectorLastSeenMap` → `connected` (legacy safe fallback)
- If entry exists and diff ≤ 24 h → `active` with relative time
- If entry exists and diff > 24 h → `stale` with relative time

`formatLastSeen(isoDate)` is a pure utility returning `"Xm ago"` / `"Xh ago"` / `"Xd ago"`.

### CSS colors (dark theme)
- Active: green `#4caf50` background tint + badge
- Stale: amber `#ff9800` background tint + badge
- Light theme overrides included for both states

### Graceful degradation
If the KQL query fails (and Tables ARM API fallback fires), `lastLogMap` stays `null`, connectors get `._lastLog = null`, resolution produces an empty `solutionLastLogMap`, and topology shows `✓ Connected` with no timestamp — exactly the same UX as before this change.

### Cache-busting
`index.html` bumped from `?v=3` to `?v=4` for both `style.css` and `app.js`.

## Alternatives Considered

- **Query a separate `table | summarize max(TimeGenerated)`** — rejected because that requires an additional per-table KQL call; the Usage summarize already gives us max ingestion time per DataType in a single query.
- **Store lastLog on `window.connectorLastSeenMap` keyed by DataType** — rejected because topology works with solutionIds, not DataTypes; bridging would require topology to know the solutions.json `tables` array, which doesn't exist in the current data model.
- **Import `getSolutionLastLog` into topology.js** — possible but the `window.connectorLastSeenMap` plain-object approach avoids a new ES module import dependency and keeps topology.js self-contained.
