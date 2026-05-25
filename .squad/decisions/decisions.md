# Decisions

## 2026-05-25

# K — Wizard-first resume and responsive planner

- **Date:** 2026-05-25T10:29:47.633+02:00
- **Owner:** K
- **Scope:** `index.html`, `css/style.css`, `js/app.js`, `js/modules/wizard.js`, `js/gantt-planner.js`

## Decision
1. The app should always land on the Welcome step on page load, even when a later wizard step is saved in local storage.
2. Saved progress should remain resumable through an explicit CTA on the Welcome step instead of auto-opening the planner.
3. Native select controls must opt into the dark theme with explicit option styling.
4. Planner task rows must keep custom schedule badges inline, and the mobile planner layout should take over at narrower viewport widths.

## Why
- Auto-restoring directly into Step 5 hides the wizard and makes the navigation feel broken.
- Explicit resume keeps saved work available without surprising the user.
- Chromium native dropdowns otherwise fall back to light option styling in the dark UI.
- Absolute-positioned table rows cannot safely stack multi-line badge content on compact screens.

## Impact
- Users start in the full wizard flow and can intentionally jump back to saved progress.
- Timeline zoom and related native selects read correctly in the dark theme.
- Smaller screens move to the mobile planner earlier, while desktop task rows stay contained.

