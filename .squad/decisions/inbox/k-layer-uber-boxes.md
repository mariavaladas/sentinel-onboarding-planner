# K — Phase 0 layer uber boxes

**Date:** 2026-06-10  
**Status:** Implemented for review

## Decision

Render the new topology layer uber boxes as **full-width background bands per occupied segment** (`top`, `bottom`, `center`) rather than as one continuous rectangle per conceptual layer.

## Why

The current Step 4 topology is intentionally symmetric around the Sentinel workspace: top sources/collectors/DCRs sit above Sentinel, while bottom sources/collectors/DCRs sit below it. Phase 0 explicitly forbids moving nodes, so a single global "Sources" or "Transformation" rectangle would overlap unrelated layers and make the diagram harder to read.

Segmented bands preserve the current geometry while still making the four conceptual layers visible:

- **Sources** wraps source nodes plus the existing zone uber boxes
- **Collection** wraps collectors, server/path nodes, Cribl, and discovered VM cards
- **Transformation** wraps DCR nodes
- **Workspace** wraps Sentinel plus the discovered infra summary

Each band spans the current diagram width, stays non-interactive (`pointer-events: none`), and renders behind the zone boxes (`z-index: -2` vs `-1`).

## Follow-up

When P1-P4 move nodes into their final topology-spec positions, the segmented implementation can collapse into one rectangle per conceptual layer if the geometry becomes strictly ordered top-to-bottom.
