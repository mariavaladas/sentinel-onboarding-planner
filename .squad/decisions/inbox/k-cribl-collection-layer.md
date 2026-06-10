# K — Cribl collection-layer rendering

- **Date:** 2026-06-10T13:15:00+02:00
- **Owner:** K
- **Scope:** Step 4 topology rendering for Cribl-routed connectors

## Decision
- Remove the standalone Cribl-only topology fallback. If `cribl-stream` is selected without any routed source, Step 4 shows a notice state instead of fabricating a source path.
- Render Cribl as a shared collection-layer intermediary, not a Sentinel sidecar. Use explicit band-scoped node IDs (`shared-cribl-node-top`, `shared-cribl-node-bottom`) so routed sources map to the correct shared Cribl node.
- Treat Cribl-routed shared rows as DCR-bearing paths and render the existing Cribl shared DCR plans, producing the visual flow `Source → Cribl → Custom DCR (Logs Ingestion API) → Sentinel`.

## Why
- The topology spec’s transport-layer model requires Cribl to live in the Collection Layer, not as a top-level source or workspace-adjacent sidecar.
- Band-scoped IDs remove the dangling-edge risk Sebastian flagged if routed sources ever span multiple bands.
- Reusing the existing `criblWindowsDcrPlan`, `criblLinuxDcrPlan`, and `criblSyslogDcrPlan` preserves the current route-aware data model instead of introducing a parallel Cribl-only renderer.

## Impact
- Cribl no longer creates its own uber box or standalone topology path.
- Sentinel no longer needs a special right-side sidecar handle for Cribl traffic.
- Cribl-routed firewall and AMA paths now visibly satisfy the intermediary-hop requirement before reaching DCRs.
