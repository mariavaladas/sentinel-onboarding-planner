### 2026-06-10T12:47Z: Topology fix prioritization
**By:** Maria (via Squad)
**What:** Prioritized topology spec compliance fixes in dependency order:
- P0: Add 4-layer uber boxes (foundational — Sources/Collection/Transformation/Workspace)
- P1: Refactor Cribl into Collection Layer (bug-cribl-001, high risk)
- P2: Sentinel weighted centering (constraint #10, isolated)
- P3: Stabilize layout across filter changes (constraint #9)
- P4: Fix discovered VM banding (minor, follows P0)
**Why:** Audit revealed structural non-compliance with topology-spec.md. P0 is foundational — all other fixes depend on the layer model existing.
