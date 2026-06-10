# K — workspace connector accuracy

**Date:** 2026-06-05T12:15:22.150+02:00
**Author:** K
**Status:** Implemented

## Context
- Sentinel workspace discovery was under-counting and over-counting connectors because the planner filtered `dataConnector` resources too aggressively and silently dropped anything that did not map cleanly into the local solution catalog.
- Users compare Step 4 directly against the Sentinel Data Connectors blade, so hidden unmatched connectors and fallback-only table inference made the topology feel incorrect.
- The existing Step 4 toolbar, connected/new badges, and dark-theme layout must stay intact.

## Decision
Treat every workspace `dataConnector` resource returned by Sentinel as connected inventory, union it with table-derived connector hints, and surface unmapped connectors as synthetic `Other / Unmatched` topology entries with a visible diagnostic summary.

## Rules
- Keep `filterActiveWorkspaceDataConnectors()` as a confidence-only helper; do not use it to exclude API connector resources from discovery.
- Deduplicate API and table-derived connector signals by connector kind / friendly-name before mapping so the topology does not double-count the same connector.
- Preserve the existing `connectorKindToSolutionIds` table, but whenever a connector cannot be mapped, render it in topology as a synthetic connected item rather than silently dropping it.
- Show the connector breakdown both in console logging and in a topology-header tooltip/badge so users can reconcile workspace totals without opening dev tools.

## Implementation Notes
- `js/app.js` now builds the API + table union, computes discovery diagnostics, and passes the summary into the solutions module for downstream UI use.
- `js/modules/solutions.js` now stores synthetic unmatched connectors plus connector-summary metadata alongside the resolved connected solution IDs.
- `js/modules/topology.js` reads that metadata to render the `Other / Unmatched Connectors` group and the topology header summary badge without changing the existing filter/reset toolbar placement.

## Files
- `js/app.js`
- `js/modules/solutions.js`
- `js/modules/topology.js`
- `css/style.css`
