# K — Inline editor fixes

- **By:** K (Frontend Developer)
- **Date:** 2026-05-25T12:01:41.627+02:00
- **Scope:** `js/gantt-planner.js`
- **Status:** COMPLETE

## Decision
- Inline status and impact `<select>` editors now commit only from the native `change` event. Blur is dismissal-only so it cannot overwrite a fresh selection with the previous value.
- The duration popup now attempts to apply the current typed value when the user clicks outside the editor, matching the commit-on-dismiss behavior already used by the date and owner editors.

## Why
- Native select focus transitions can fire blur before the browser finalizes the newly chosen option, which caused reverted status and impact values on affected rows.
- Planner users expect popup edits to persist when they click away; dropping typed duration values made the grid feel inconsistent next to the owner and date editors.

## Impact
- Status and impact edits should stick on any editable row, including later-phase rows such as Training & Handover.
- Duration edits now save on outside click as long as the typed value is valid; invalid input remains in the editor for correction instead of silently disappearing.
