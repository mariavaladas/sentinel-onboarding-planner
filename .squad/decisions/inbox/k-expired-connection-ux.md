# K — Expired workspace connection UX

**Date:** 2026-06-04T11:55:30.000+02:00
**Author:** K
**Status:** Implemented

## Context
- Step 1 lets users connect an Azure workspace and Step 3 reuses mapped `connectedSolutionIds` to render green connected badges.
- The app persists connector mappings in localStorage, but the Azure access token is in-memory only.
- That mismatch can leave cached green ticks visible after reload or token expiry, even though there is no active workspace connection.

## Decision
Treat cached connector mappings as invalid the moment the workspace connection is stale or expired.

## Rules
- Persist only non-secret workspace connection metadata needed for stale-state detection (`status`, `selectedWorkspace`, `tokenExpiresAt`, `lastValidatedAt`, warning message).
- Never persist the Azure bearer token.
- If cached connected-solution IDs are restored without an active token, immediately mark the connection expired, clear the connected IDs, and show a global warning banner.
- If any Azure workspace discovery call returns 401 / unauthorized, use the same expired-state path: clear connected IDs, reset the picker UI, and require reconnect.
- The expired-state banner is dismissible for the current page view only; it must reappear after reload while the expired state persists.

## UX Pattern
- Show a sticky warning bar above the app shell with amber styling, an alert icon, reconnect CTA, and dismiss control.
- Mirror the same state in the welcome card status text so the reconnect path is visible where the user entered the token.
- Remove stale green connector badges by clearing `connectedSolutionIds` rather than leaving environment data looking current.

## Implementation Notes
- `index.html` owns the welcome-page workspace copy and the banner host markup.
- `css/style.css` owns the warning banner and reconnect button styling.
- `js/app.js` owns token expiry decoding, unauthorized response handling, banner state, and stale cached-connection invalidation.
