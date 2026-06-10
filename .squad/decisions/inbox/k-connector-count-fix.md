# K — Connector count fix

**Date:** 2026-06-05T11:36:58.415+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 1 workspace discovery feeds Step 3 `connectedSolutionIds` so the planner can mark already-connected data sources.
- The code already calls the Sentinel `Microsoft.SecurityInsights/dataConnectors` endpoint, but it was unioning every returned connector resource with synthetic connector guesses built from active workspace tables.
- Generic active tables such as `CommonSecurityLog` can map to multiple local solutions, which inflates the connected count far beyond what the Sentinel Data Connectors blade shows.

## Decision
Use active Sentinel data connector resources as the primary source of truth for workspace-connected solution state.

## Rules
- Treat a connector resource as active only when it exposes an explicit connected/enabled signal (`properties.connected`, enabled data-type states, status/connection-state fields, or last-received-data markers).
- Only map filtered active connector resources into `connectedSolutionIds` when the workspace returns any active connector resources.
- Use table-derived synthetic connectors only as a fallback when the workspace reports no active connector resources at all.
- Keep logging both raw connector-resource counts and filtered active-resource counts so future debugging can compare API payloads against UI totals.

## Implementation Notes
- `js/app.js` owns the new active-connector filtering helpers and the revised workspace discovery / auto-reconnect merge strategy.
- `js/modules/solutions.js` remains the mapper from connector lookup values to planner solution IDs; the fix reduces bad inputs before that mapper runs.
