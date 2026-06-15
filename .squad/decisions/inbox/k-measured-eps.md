# Decision: Wire measured EPS into syslog/CEF sizing drawer default

**Author:** K  
**Date:** 2026-06-15T12:10:52+02:00  
**Status:** Implemented

## Context

The workspace discovery KQL query (app.js lines 1016–1040) already measures actual EPS from Syslog + CommonSecurityLog + SecurityEvent tables over the last 24 h. The result lands at `window.discoveredInfrastructure.summary.totalEPS`. Until now, the syslog/CEF sizing drawer always defaulted to `DEFAULT_FIREWALL_EPS = 1000` regardless of what had been measured.

## Decision

### capacity.js — pure module, accept options

`createDefaultSizingDraft(type, options = {})` gains an optional second parameter. When `type === 'firewall'` and `options.measuredEps` is a positive number, it uses that value as the default EPS; otherwise it falls back to `DEFAULT_FIREWALL_EPS`. No `window` access. Backward-compatible.

### solutions.js and gantt-planner.js — read at callsite, pass as options

Both files already operate in browser context. They read `window.discoveredInfrastructure?.summary?.totalEPS` at the moment the drawer opens and pass it via `{ measuredEps }` to `createDefaultSizingDraft`. This keeps the capacity module pure while surfacing real data in the UI.

The "Reset to defaults" / "Defaults" button handlers in both files also pass the same `measuredEps` option, so a reset lands on the workspace-measured value rather than the hardcoded constant.

### Visual indicator

When `measuredEpsValue > 0` a note "📊 Based on workspace measurement (24h avg)" is shown immediately below the EPS input field in both drawers. It uses `grid-column: 1 / -1` so it spans the full grid row. No indicator is shown when no measurement is available (workspace discovery hasn't run, or returned zero).

## Rationale

- Measured data is always more accurate than a generic default. Pre-filling with actual workspace EPS reduces sizing errors for customers with unusually high or low log volumes.
- Showing the indicator tells users where the value came from so they can make an informed decision to keep or override it.
- The field is fully editable — users are never locked into the measured value.

## Files changed

- `js/modules/capacity.js` — `createDefaultSizingDraft` signature
- `js/modules/solutions.js` — `buildDraft`, defaults button, EPS field visual indicator
- `js/gantt-planner.js` — draft init, defaults button, EPS field visual indicator
- `css/style.css` — `.solution-sizing-measurement-note`, `.gantt-detail-sizing__measurement-note`
