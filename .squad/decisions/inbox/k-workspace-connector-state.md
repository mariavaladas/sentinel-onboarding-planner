# K — Workspace connector state

## Context
- Step 3 solution cards can show a green connected state based on `connectedSolutionIds`.
- Those IDs are restored from localStorage on page load for reload continuity.
- Reconnecting to Azure or changing subscription/resource group resets workspace selection before any new workspace connector data is loaded.

## Decision
Treat connector connected-state as strictly workspace-scoped UI state.

## Rule
- If no workspace is currently selected, no solution card may render as already connected.
- `connectWithToken()` success must clear `connectedSolutionIds` after subscriptions load.
- `onSubscriptionChange()` must clear `connectedSolutionIds` when it invalidates the current workspace.
- `onRgChange()` must clear `connectedSolutionIds` when it invalidates the current workspace.
- Restoring `connectedSolutionIds` on page load remains acceptable only for reload continuity until the user changes tenant/workspace selection.

## Implementation note
This keeps the convenience of reload persistence without letting stale connector badges survive across tenant/workspace resets.
