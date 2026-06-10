# K Decision: Four-Bug Fix (2026-06-10)

**By:** K (Frontend Dev)  
**Date:** 2026-06-10T10:20:00+02:00  
**Requested by:** madesous

## Summary

Four bugs fixed across `topology.js` and `solutions.js`. All fixes are surgical and do not change any unrelated logic.

---

## Bug 1 — `classifySolution` must check `fieldPack` (topology.js)

**Decision:** `fieldPack === 'syslog-cef'` is added as the _first_ condition in the syslog_cef branch of `classifySolution`, before the existing infra/tag checks. This mirrors the identical check already present in `solutionUsesCollectorVm` at line 1555 and ensures firewall solutions (Zscaler, CheckPoint, FortiGate, Barracuda CloudGen) that carry `fieldPack: "syslog-cef"` but lack `linux-forwarder` in infra are correctly classified as `syslog_cef`, routed into the syslog_cef entry group, and connected to the Linux VM collector node.

---

## Bug 2 — Stale localStorage connected-solution state (BUG-ENV-002)

**Decision:** A two-part session guard is used rather than switching to `sessionStorage` for the whole key (which would break reload continuity for active sessions).  
1. `setConnectedSolutionsFromWorkspace` sets `sessionStorage.sentinelPlanner.activeWorkspace = '1'` on every live workspace sync.  
2. At module-level init in `solutions.js`, if the sessionStorage flag is absent, `localStorage.removeItem(CONNECTED_SOLUTIONS_STORAGE_KEY)` is called before `app.js` can read it.  
This clears ghost badges in fresh tabs/sessions while preserving the expected reload-continuity behaviour for users actively connected to a workspace.

---

## Bug 3 — Linux environment never recommends Syslog (BUG-SOL-001)

**Decision:** `matchesVendorSignature` now extracts `fieldPack` from the solution object (same pattern used in capacity/topology helpers) and the `linux` case adds `fieldPack === 'syslog-cef'` and `tags.includes('syslog')` alongside the existing `solutionId === 'linux-syslog'` check. This ensures the "Syslog" connector (id `linux-syslog`, fieldPack `syslog-cef`, tag `syslog`) is recommended for Linux environments regardless of its display name.

---

## Bug 4 — GCP incorrectly recommends Google Workspace (BUG-SOL-002)

**Decision:** The `gcp` case is refactored to a block statement with an explicit `isWorkspace` negative filter. Solutions whose id contains `workspace` or `gsuite`, or whose tags include `workspace`, are excluded even if they also match a GCP signal. The positive `isGcp` check is extended with `tags.includes('google-cloud')` and `tags.includes('google cloud platform')` for broader GCP tag coverage.

---

## Cache Bust

`index.html` updated from `?v=9` → `?v=10` for `css/style.css` and `js/app.js`.
