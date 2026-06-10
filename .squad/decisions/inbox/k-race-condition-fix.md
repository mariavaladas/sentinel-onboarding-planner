# K — Workspace validation CTA gate

**Date:** 2026-06-05T11:48:00.721+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 1 lets users pick a Sentinel workspace before they continue into planning or resume directly at Topology.
- Workspace selection kicks off async connector discovery, but the welcome CTAs stayed clickable before that validation completed.
- That timing window could show the "you haven't selected a workspace" warning even though the user had already picked one and the validation call was still running.

## Decision
Treat workspace selection as a pending validation state that blocks welcome-page progression until the active workspace validation request settles.

## Rules
- The moment the workspace selection changes, clear the previously confirmed workspace and connected-solution state.
- While workspace validation is pending, disable both `Start planning` and `Resume at Topology` and show a loading spinner on the buttons.
- Only re-enable those CTAs after the active validation request completes successfully or fails.
- Guard workspace validation with a monotonically increasing request id so stale async responses cannot re-enable the buttons or restore an older workspace selection.

## Implementation Notes
- `js/app.js` owns the validation-pending state, request-id guard, and welcome CTA enablement.
- `css/style.css` owns the button loading state styling.
