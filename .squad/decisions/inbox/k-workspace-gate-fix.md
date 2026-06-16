# Decision: Welcome CTA workspace gate only applies to expired linked workspaces

**Date:** 2026-06-16T10:38:59.953+02:00  
**Author:** K  
**Status:** Implemented  
**File:** `js/app.js`

---

## Context

The welcome CTA gate was disabling both **Start planning** and **Resume saved progress** whenever no workspace token was present, including immediately after a full reset. Reset clears `sentinelPlanner.workspaceConnectionState`, so a fresh reload should behave like an optional workspace connection, not a forced reconnect flow.

---

## Decision

`syncWorkspaceValidationButtons()` now distinguishes between:

1. **Expired workspace with preserved `selectedWorkspace`** → gate the CTA buttons and prompt a reconnect.
2. **Plain disconnected state with no saved workspace** → keep CTA buttons enabled.

The reconnect gate is therefore driven by an expired linked workspace state, not by the absence of a token alone.

---

## Outcome

- Reset/fresh-start flows are no longer blocked on workspace connection.
- Saved progress that never used a workspace remains resumable without a reconnect prompt.
- Expired linked workspace sessions still protect the user from continuing with stale workspace-bound state.
