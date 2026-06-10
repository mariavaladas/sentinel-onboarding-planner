# K — tables are not connectors

**Date:** 2026-06-05T12:35:08.459+02:00
**Author:** K
**Status:** Implemented

## Context
- Workspace discovery was unioning real Sentinel `dataConnector` resources with synthetic connector guesses derived from active workspace tables.
- That caused Step 1 status copy and Step 4 topology to over-count dramatically and filled `Other / Unmatched Connectors` with table names instead of actual connector resources.
- Users expect planner counts to stay close to the Sentinel Data Connectors blade, while keeping unmatched real connectors visible.

## Decision
Use the Sentinel `Microsoft.SecurityInsights/dataConnectors` API as the only normal source of workspace connector inventory. Treat table-derived connector guesses as a heuristic fallback only when the API returns zero connector resources.

## Rules
- Pass only deduplicated API connector resources into workspace solution resolution when the API returns any connectors.
- Keep `Other / Unmatched Connectors` for real API connector resources that do not map to the local solution catalog.
- If the API returns zero connectors, allow a table-derived fallback but label it clearly as an estimate.
- Keep connected/new badges, topology filters, and saved layout/reset behavior unchanged.

## Implementation Notes
- `js/app.js` now selects discovery connectors from the API first, uses table heuristics only on zero-API fallback, and emits short status messages based on connector counts.
- `js/modules/solutions.js` now carries a `usedTableFallback` summary flag alongside connector counts for downstream UI.
- `js/modules/topology.js` now reports workspace connector totals from discovery summary metadata instead of table-inflated topology counts.

## Files
- `js/app.js`
- `js/modules/solutions.js`
- `js/modules/topology.js`
