# Decision: Save/Load Configuration Feature

**By:** K (Frontend Developer)
**Date:** 2026-06-23T09:26:40+02:00
**Status:** IMPLEMENTED

---

## What

Added Save Config / Load Config buttons to the `header-actions` bar in `index.html`, with event handlers in `js/app.js`.

## Key design choices

1. **Key enumeration over hardcoding** — Both save and load iterate `localStorage`/`sessionStorage` at runtime using `startsWith('sentinelPlanner.')`, so any future keys are automatically included without code changes.

2. **Excluded keys** — `sentinelPlanner.sessionToken` (security) and `sentinelPlanner.theme` (personal preference) are excluded from export and import via a `Set` constant, matching Rachael's security requirement.

3. **Storage provenance** — Each exported key records `{ value, storage: 'local' | 'session' }` so the import side restores each key to the correct storage tier.

4. **Safe DOM only** — No `innerHTML` with user-controlled data; file download uses `createElement('a')` + `textContent`-equivalent attributes only. Complies with the v1 security decision.

5. **Validation before import** — Checks for `version` field and at least one `sentinelPlanner.*` key before touching storage; shows `alert` on bad file, `confirm` dialog before overwriting existing state.

6. **File input reset** — `event.target.value = ''` after read so the same file can be reloaded without requiring the user to pick a different file first.

## Files modified

- `index.html` — 3 elements added inside `header-actions` (lines ~62–65)
- `js/app.js` — ~80 lines added after the `resetPlannerState` handler
