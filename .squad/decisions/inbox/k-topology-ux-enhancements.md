# K — topology UX enhancements

**Date:** 2026-06-05T12:03:53.524+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 4 topology is rendered in `js/modules/topology.js` with React Flow and dark-theme styling from `css/style.css`.
- Users want every connector visible inside each source group, even when that makes the source box or zone box taller.
- The topology also needs a lightweight way to compare already-connected vs planned connectors without changing the approved topology architecture.

## Decision
Implement a Step 4 topology toolbar with connector filters and layout reset, persist draggable node positions in workspace-scoped localStorage, and size source-group rows from the full connector count instead of truncating the list.

## Rules
- Keep `All` as the default topology filter whenever Step 4 is freshly rendered from wizard navigation.
- Render the filter/reset toolbar as a sibling above `#architectureDiagram` so exports keep capturing only the topology canvas.
- Save and restore only draggable React Flow node positions; use the current workspace identity when available to scope the layout key.
- Show every connector row in source nodes and let the row-height estimator expand zone uber-boxes to fit the full list.

## Implementation Notes
- `renderTopology()` now owns the filter state, toolbar rendering, empty-state copy, and workspace-scoped layout persistence helpers.
- Standard source rows use a connector-count-based height estimate so Azure/Microsoft/SaaS group boxes stay large enough when lists grow.
- The reset action clears the saved layout key and re-renders the current filtered topology with the default auto layout.

## Files
- `js/modules/topology.js`
- `css/style.css`
