# Decisions Archive — Retired Entries

Last Updated: 2026-05-25T12:38:50Z

Entries archived from `decisions.md` due to age threshold (>7 days before 2026-05-25).

---

## k-gantt-empty-fix

# Decision: Fix Invisible Gantt Bars (K — Frontend Dev)

**Date:** 2025-07-14  
**Author:** K (Frontend Dev)  
**Files changed:** `css/style.css`, `js/gantt-planner.js`

---

## Problem

After recent CSS colour changes the Gantt chart rendered a timeline header (dates visible) but **no bars appeared** in the chart body. The dark grid background (`rgba(9,14,30,0.98)`) was introduced, but bar fill rules failed to apply, leaving SVG elements at their default `fill: black` — invisible against a near-black background.

---

## Root Cause (two layers)

### Layer 1 — Overly broad CSS selector

The rule `.gantt .bar { … }` matched **two** different elements in frappe-gantt's SVG:

1. `<g class="bar">` — the **layer group** that contains all bar-wrappers (created by `setup_layers()`)  
2. `<rect class="bar">` — each individual bar **rectangle** inside `bar-group > bar-wrapper`

Applying `filter: drop-shadow(…)` to the layer group (`<g class="bar">`) creates a GPU compositing layer for all bars simultaneously. Combined with the `.gantt-container { isolation: isolate }` rule in frappe-gantt's own stylesheet this can cause the bars to composite incorrectly and appear invisible in Chromium-based browsers.

### Layer 2 — Phase-specific fill rules never applied

Even when the layer compositing issue did not occur, the phase-fill rules (`.gantt .bar-wrapper.phase-setup .bar { fill: #90EE90 !important }`) are at specificity (0,3,1). The old base rule `.gantt .bar { … }` was at (0,1,1) — it matched the layer group, not the rect — so the SVG `<rect>` never received any explicit fill from CSS and rendered at the SVG default `fill: black`.

---

## Fix

### `css/style.css`

Changed `.gantt .bar { … }` → `.gantt .bar-wrapper .bar { … }`.

- The new selector only matches `<rect class="bar">` **inside** a `bar-wrapper` group, never the layer `<g class="bar">`.
- Added an explicit `fill: #38bdf8` fallback so bars are visible even if the phase-specific rules are not present or have not yet loaded.
- Reduced the `drop-shadow` radius slightly (8px → 4px/10px) to avoid visual artefacts at the individual-bar level.

### `js/gantt-planner.js`

Added a `PHASE_BAR_COLOR` constant and wired `color: PHASE_BAR_COLOR[className]` into each task object returned by `createGanttTask()`.

Frappe-gantt sets `this.$bar.style.fill = this.task.color` directly in `draw_bar()`, bypassing the CSS cascade entirely. This belt-and-suspenders approach ensures bars are coloured even if the CSS selector fails for any reason (CDN delay, browser quirk, specificity conflict).

---

## Why the committed codebase also had no bars

The **committed** JS used space-delimited `custom_class`:
```js
custom_class: `${phase.className} status-${row.status.toLowerCase()}`
// e.g.  "phase-readiness status-not-started"
```

In frappe-gantt 1.2.2 the `refresh()` method calls `this.group.classList.add(custom_class)`.  
`classList.add()` requires a **single token** (no HTML whitespace); the space-delimited string threw a `DOMException: The token provided must not contain HTML space characters`.  
This exception propagated out of `refresh()` before `draw()` was called — so `<rect class="bar">` was never appended to the DOM at all, regardless of CSS.

The working-tree JS already uses single-token class names (`phase-setup`, `phase-1`, etc.), so that crash was already fixed before this task was assigned.

---

## Alternatives considered

| Option | Rejected because |
|--------|-----------------|
| Keep `.gantt .bar` selector, add `> .bar-wrapper` child combinator | Does not help — layer `<g>` is a direct child of `.gantt` SVG just as `bar-wrapper` is; ambiguity remains |
| Use `task.color` inline style only, remove CSS fill rules | CSS rules are also used on the legend chips (`.gantt-phase-chip`) — removing them would break the legend |
| Add `!important` to the base `.gantt .bar-wrapper .bar` fill | Unnecessary; phase rules already use `!important` and outrank the base rule at (0,3,1) vs (0,2,1) |

