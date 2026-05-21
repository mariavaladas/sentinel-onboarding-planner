# Gantt split-pane sync

## When to use
Use this pattern when a vanilla HTML/CSS/JS planner needs a Monday.com or MS Project-style left task grid and right SVG timeline without replacing the existing Gantt library.

## Pattern
1. Normalize the visible plan rows once and render both the left task grid and the right timeline from that same row array.
2. After the SVG timeline renders, read each `.grid-row` position and height from the chart DOM and use those metrics to position the left-side rows instead of hardcoding a row height.
3. Keep vertical scrolling on the left grid body and the right `.gantt-container` synchronized with paired scroll listeners.
4. Mirror hover and active states across the left grid rows and the right-side `.bar-wrapper` nodes so the split pane feels like one control.
5. Hide the split pane on smaller screens and fall back to a compact stacked list instead of forcing a cramped desktop table.

## Validation checklist
- Left rows stay aligned after changing the Gantt view mode.
- Summary collapse or expand rebuilds both panes from the same visible rows.
- Sticky headers remain visible while the task rows scroll.
- Dark-theme text stays readable and phase accents remain subtle.
