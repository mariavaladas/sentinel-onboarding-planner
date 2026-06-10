# K — topology straight lines

**Date:** 2026-06-02T11:20:47.206+02:00
**By:** K
**Status:** PROPOSED

## Decision
Use hard step-routed topology edges and allow sentinel-aligned source rows (`azure_native`, `direct`) to break out of the main in-zone horizontal packing so their source cards can sit directly under the intermediary box they feed.

## Why
The previous single-row zone packing forced Azure/native source cards off-axis from their downstream boxes, which made otherwise-simple links render with avoidable bends and curves.

## Impact
- Azure and SaaS uber-boxes can grow taller/wider when a straight alignment row is needed.
- `Diagnostic Settings` / native connector paths can now render as straight vertical segments where the geometry allows it.
- Shared-plan routes keep the existing topology structure, but all edges now prefer crisp 90-degree step routing.

## Files
- `js/modules/topology.js`
- `css/style.css`
