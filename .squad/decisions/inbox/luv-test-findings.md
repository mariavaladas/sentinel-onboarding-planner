# Luv test findings — Environment / Solutions / Topology

- **Date:** 2026-06-02T11:20:47.206+02:00
- **Status:** REJECT
- **Scope:** Step 2 Environment, Step 3 Solutions, Step 4 Topology
- **Primary report:** `test-results/test-report-env-sol-topo.md`

## Critical findings
1. **Environment intent is polluted before the user acts.** Step 2 still defaults Azure/Microsoft 365, and stale workspace-connected solutions are restored from localStorage on startup.
2. **Recommendation accuracy is not release-safe.** Linux misses its main Syslog connector, GCP incorrectly recommends Google Workspace Reports, and several vendor-primary connectors are not highlighted because recommendation logic is gated by packaged-content richness.
3. **Topology correctness has release blockers.** Cribl-only selection produces a false empty state, shared Syslog/CEF collector nodes are duplicated, and Azure collector placement wires collector-to-DCR edges with the wrong band/handles.

## Reassignment
- **K:** Fix Step 2 state seeding, Step 3 recommendation logic, and Step 4 topology rendering/edge handling.
- **Sebastian:** Only needed if K decides the recommendation engine requires explicit vendor metadata additions in `data/solutions.json`.

## QA call
Do not accept this slice until the issues above are fixed and re-tested.
