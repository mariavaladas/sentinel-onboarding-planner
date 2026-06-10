# QA Report — Gantt & Table Tabs
**Agent:** Luv  
**Date:** 2026-05-29  
**Method:** Deep static code review (`js/gantt-planner.js` 7,593 lines + `css/style.css`)  
**Scope:** Gantt tab and Table tab — rendering, fonts, collapse/expand, sidebar open, text clicks, scrolling, zoom, underlines

---

## Summary

| ID | Severity | Area | Title |
|---|---|---|---|
| BUG-GT-001 | 🔴 Critical | Gantt | Summary task bar labels show dotted underline |
| BUG-GT-002 | 🟡 Medium | Table | Solution group rows use font-weight: 600 (spec says 400) |
| BUG-GT-003 | 🟡 Medium | Gantt | Solution group bar labels use font-weight: 600 (spec says uniform) |
| BUG-GT-004 | 🟡 Medium | Gantt | Clicking summary task text label toggles collapse instead of opening sidebar |
| BUG-GT-005 | 🟢 Low | Both | Escape key only closes detail panel when focus is inside the overlay |
| BUG-GT-006 | 🟢 Low | Gantt | `console.debug` fires on every MutationObserver re-render |

---

## Bug Details

---

### 🔴 BUG-GT-001 — Summary task bar labels show dotted underline (Gantt)

**File:** `css/style.css`, lines 4277–4280  
**Rule:**
```css
.gantt-summary-toggle {
    text-decoration: underline dotted rgba(148, 163, 184, 0.38);
    text-underline-offset: 2px;
}
```

**What happens:**  
In `stabilizeGanttRender`, summary task bar labels get the class `gantt-summary-toggle` applied (line 5751: `label.classList.toggle('gantt-summary-toggle', isSummaryToggle)`). This CSS rule fires on those SVG `<text>` elements, rendering all summary task names in the Gantt with a faint dotted underline.

**Test requirement violated:**  
> "No underlined tasks — Task text should NOT appear underlined (old collapse behavior removed)"

**Reproduction:**  
Open Gantt tab → observe any row with a summary/phase header → its bar label text shows `text-decoration: underline dotted`.

**Fix:**  
Remove the `text-decoration` property from `.gantt-summary-toggle` in `css/style.css`. The collapse affordance is now provided by the toggle SVG icon or the action label, not by underline.

---

### 🟡 BUG-GT-002 — Table solution group rows have font-weight: 600

**File:** `css/style.css`, lines 2321–2323  
```css
.gantt-table-row--solution-group .gantt-table-task-label {
    color: var(--planner-task-label-color-strong);
    font-weight: 600;
}
```

**Base style** (lines 2492–2496):  
```css
.gantt-table-task-label {
    font-weight: 400;
}
```

**What happens:**  
In the Table tab, solution group header rows (e.g., "Microsoft Defender for Endpoint") appear at `font-weight: 600` (semi-bold), while all other rows (summary, subtask, regular task) are `400`. This creates a visual hierarchy emphasis not specified in the QA checklist.

**Test requirement violated:**  
> "Fonts — Uniform 13px/400 weight across all rows (no random bold or size variations)"

**Note:** This may be intentional design hierarchy, but as written it fails the spec. Needs madesous to decide: accept as intentional design exception OR normalize to 400.

---

### 🟡 BUG-GT-003 — Gantt solution group bar labels have font-weight: 600

**File:** `css/style.css`, lines 4085–4087  
```css
.gantt .bar-wrapper.gantt-solution-group .bar-label {
    fill: var(--planner-task-label-color-strong);
    font-weight: 600;
}
```

**Base style** (lines 4065–4075):  
```css
.gantt .bar-label {
    font-weight: 400;
}
```

**What happens:**  
Solution group bars in the Gantt chart have their label text at `font-weight: 600`. All other bar labels (regular tasks, summary tasks, subtasks) are `400`.

**Test requirement violated:**  
> "Font uniformity — All text same size, no random bold"

**Same caveat as BUG-GT-002** — may be intentional for hierarchy. Needs explicit acceptance/rejection from madesous.

---

### 🟡 BUG-GT-004 — Clicking summary task TEXT LABEL in Gantt toggles collapse instead of opening sidebar

**Files:** `js/gantt-planner.js` — `stabilizeGanttRender` (line 5751–5778) + `bindGanttTaskSelection` (lines 5456–5495)

**What happens:**  
Summary task bar labels in the Gantt are assigned `pointer-events: auto` and a `bindPrimaryActivation` listener that calls `toggleSummary(taskId)` with `event.stopPropagation()`. When the user clicks this SVG `<text>` label:
1. `bindPrimaryActivation` fires, runs `toggleSummary`, then calls `event.stopPropagation()`
2. The chart-level `handleClick` on `chartHost` **never fires**
3. Result: summary task's subtask rows collapse/expand — **no sidebar opens**

Clicking the **bar body** (the rect background) still opens the sidebar correctly because the rect has `pointer-events: auto` and the click reaches `chartHost`'s listener.

**Test requirement violated:**  
> "Text click → sidebar — Clicking the text label next to a bar should also open the sidebar"

**Affected rows:** Only summary tasks (e.g., Phase 1, Phase 2). Solution group labels and regular task labels both pass clicks through to the bar body (they have `pointer-events: none`), so those work correctly.

**Fix approach:** Replace the `stopPropagation` in the summary toggle handler with a data attribute or flag-based guard, letting the click continue to `handleClick` where both `toggleSummary` AND `openTaskDetail` are called. Or: make summary labels trigger sidebar, and surface the collapse toggle exclusively via the toggle icon/chevron.

---

### 🟢 BUG-GT-005 — Escape key closes detail panel only when focus is inside overlay

**File:** `js/gantt-planner.js`, lines 7492–7495  
```js
detailBackdrop.addEventListener('click', closeDetail);
detailOverlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDetail();
});
```

**What happens:**  
The `keydown` event listener is attached to `detailOverlay` (the panel container element). `keydown` bubbles from focused elements, but only events originating from within `detailOverlay`'s subtree will bubble to it. If the user presses Escape while focus is on something outside the panel (e.g., they clicked a Gantt bar to open the panel, and keyboard focus is still on the chart), the event does NOT bubble through `detailOverlay` and the panel stays open.

**Confirmed working:** Backdrop click (`detailBackdrop.addEventListener('click', closeDetail)` ✅) and pointer-outside close (lines 7497–7506 ✅) and X button ✅ all work. This is a narrow UX gap.

**Fix:** Move the `keydown` listener to `document` with a guard:
```js
document.addEventListener('keydown', (event) => {
    if (!detailOverlay.hidden && event.key === 'Escape') closeDetail();
});
```

---

### 🟢 BUG-GT-006 — `console.debug` fires on every Gantt MutationObserver re-render

**File:** `js/gantt-planner.js`, line 5863  
```js
console.debug('Gantt render summary', { taskCount, barCount, outsideCount, summaryCount });
```

**What happens:**  
This fires inside `stabilizeGanttRender`'s MutationObserver callback. Every time Frappe Gantt modifies the SVG DOM (which happens frequently — on zoom, scroll, and any re-render), this debug log fires. On large plans (50+ tasks), this is very noisy in production DevTools.

**Fix:** Remove or gate behind a `DEV_MODE` flag.

---

## Confirmed Working (no bugs)

| Feature | Status | Notes |
|---|---|---|
| TABLE row click → sidebar | ✅ | `activateRow` calls `onSelect(row.id)` correctly |
| TABLE task name click → sidebar | ✅ | `nameTrigger` calls `onSelect` directly via its own handler |
| TABLE hover underline (name trigger) | ✅ | Intentional — hover/focus-visible only; CSS lines 2522–2528 |
| TABLE collapse/expand action label text | ✅ | `(collapse)` / `(expand)` from `getSolutionGroupActionLabel` |
| TABLE inline editing commit guard | ✅ | `hasCommitted` flag in select editor prevents blur/change race |
| GANTT bar click → sidebar | ✅ | `bindGanttTaskSelection` correctly finds `.bar-wrapper[data-id]` |
| GANTT solution group label click → sidebar | ✅ | `pointer-events: none` passes click to bar rect → sidebar opens |
| GANTT solution group action label click | ✅ | Toggles collapse; `stopPropagation` prevents double-fire |
| Detail panel — backdrop click close | ✅ | Line 7492 |
| Detail panel — pointer outside close | ✅ | Lines 7497–7506 |
| Detail panel — X button close | ✅ | Wired via `renderDetailPanel` close button → `onClose` |
| Detail panel — Escape when panel focused | ✅ | Line 7493 (focus-within only — see BUG-GT-005) |
| Collapse/expand state persisted on re-render | ✅ | `collapsedSolutionGroupIds` pre-populated from `row.isGroupCollapsed` |
| TABLE header scroll sync | ✅ | `transform: translateX` approach is correct for separate header div |
| Gantt zoom dropdown (Weeks/Months/Quarters) | ✅ | `createViewModeToggles` wired correctly |
| Summary task toggle animation | ✅ | `is-subtask-transition-in/out` + double-rAF pattern is solid |

---

## Architecture Notes

- **Gantt tab is timeline-only** — `sidebarHost` is created but never appended to `ganttBody`; `sidebarController` is always `null` in Gantt view. Task details exclusively via `detailOverlay`.
- **`bindPrimaryActivation`** attaches both `click` and `mouseup` listeners. Deduplication via `activatedRecently` (200ms) prevents double-activation on normal click. Functionally correct.
- **`moveUpButton` pre-add at line 5087** is an extraneous `appendChild` before the canonical `rowActions.append(moveUpButton, moveDownButton)` at line 5100. DOM result is correct; code smell only.
- **`syncSplitPaneScroll(sidebarController?.scroll, ...)` calls** are no-ops in Gantt-only view (null guards work). Dead code path only.
