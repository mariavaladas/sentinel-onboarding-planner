# Research: exporting a visual Gantt chart to Excel (.xlsx)

_Date:_ 2026-05-21  
_Context:_ Frappe Gantt v1.2.2 in a pure client-side vanilla JS app

## Executive summary

If the goal is **an .xlsx that still looks like a Gantt chart when opened in Excel**, the best fit for this stack is:

> **Use ExcelJS in the browser and generate a worksheet that is itself the timeline**: fixed task columns on the left, one date column per day/week on the right, and colored filled cells spanning each task duration.

That approach:
- works **purely client-side**
- produces a file that visually reads like a Gantt immediately
- avoids Excel chart limitations
- avoids server-side OpenXML work
- fits arbitrary task colors better than template-only conditional formatting

## Short recommendation

**Recommended:** `ExcelJS` + a **grid-based Gantt sheet** (not a native Excel chart)  
**Optional refinement later:** move the layout into an `.xlsx` template, but keep the bars as filled cells rather than an embedded chart.

## Why this is the recommendation

A true Excel “chart object” Gantt is possible in Excel manually (stacked bar with the first series hidden), but that is **not a good programmatic path in a pure browser app**:
- **ExcelJS does not create chart objects**
- **ExcelJS also does not preserve existing charts when it rewrites a workbook**
- **SheetJS Community Edition is weak for styling and chart preservation**
- Template files with embedded charts are fragile unless you use tooling that preserves chart XML

By contrast, a **worksheet-as-timeline** export is straightforward and reliable:
- every task becomes a row
- every day (or week) becomes a column
- cells within the task date range get a fill color
- frozen panes and narrow columns make it look like a normal Gantt

## Comparison table

| Approach | Pure client-side? | Visual quality | Complexity | Library / size / CDN | Verdict |
|---|---:|---|---|---|---|
| **1. SheetJS (`xlsx`)** | Yes | **Low-Medium** in CE, **Medium** in Pro | Medium | SheetJS CE browser bundles are available from the official CDN; `xlsx.full.min.js` is ~952 KB, `xlsx.mini.min.js` is ~280 KB | **Not recommended** unless you already own **SheetJS Pro** |
| **2. ExcelJS** | Yes | **High** for grid-style Gantt | Medium | Browser bundles exist; `exceljs.min.js` via CDNJS is ~948 KB | **Recommended** |
| **3. Native Excel chart (stacked bar trick)** | Not realistically with normal browser JS libs | **High** when it works | **High-Very High** | No practical chart-writing support in ExcelJS; template chart preservation is fragile | **Not recommended for this stack** |
| **4. Template-based workbook** | Yes | **Medium-High** | Medium upfront, low per-export | Works best when paired with ExcelJS for data injection | **Good second step**, especially for branded layout |
| **5. What SaaS tools do** | n/a | Usually not visual in Excel | n/a | Monday / Smartsheet / Project mostly export data, not a live visual Gantt | Confirms that visual Excel export is a special-case feature |

---

## 1) SheetJS (`xlsx`) library

### Can it run in-browser?
Yes.
- SheetJS ships standalone browser builds from its CDN.
- In-browser export is straightforward.

### Can it create a visual Gantt sheet?
**Partially, but mostly not with Community Edition.**

What you would want technically is:
1. create a worksheet
2. put task metadata in left columns
3. create one date column per day/week
4. fill cells across the task duration to simulate bars

That works well only if the library can reliably write styles / fills / formatting.

### Reality check
- **SheetJS Community Edition** focuses on data handling first.
- The public docs explicitly point advanced features like **styling, images, graphs** to **SheetJS Pro**.
- Community Edition can read/write workbook data, but it is **not the strongest choice for rich visual formatting**.
- If you also wanted to preserve template charts or drawing objects, CE is a poor fit.

### Conditional formatting / colored cells
- **SheetJS CE:** not a strong option for this requirement.
- **SheetJS Pro:** more viable, but that introduces licensing and a commercial dependency.

### Mapping date columns to bars
If you used SheetJS Pro, the mapping would be:
- columns `A:F` = task info (`Task`, `Phase`, `Start`, `End`, `Duration`, `Dependencies`)
- columns `G:...` = one column per day (or week)
- for each task row, fill every timeline cell where `date >= start && date <= end`

### Assessment
- **Client-side:** Yes
- **Visual output:** acceptable only with paid/pro features
- **Complexity:** medium
- **Bundle/CDN:** good CDN story; large full build
- **Verdict:** only worth it if the project already standardizes on **SheetJS Pro**

---

## 2) ExcelJS

### Can it run in-browser?
Yes.
ExcelJS has browser bundles and a browser-capable document workbook mode.
Useful browser-side APIs include:
- workbook / worksheet creation
- cell fills, borders, alignment, merge support
- conditional formatting support for a subset of rule types
- `workbook.xlsx.writeBuffer()` for download

### Can it create a visual Gantt sheet?
**Yes — very well.**

This is the strongest option for a browser-only app because you can directly build the sheet as a timeline grid and color the cells yourself.

### Best way to use it
Use **static fills** for the actual bars, not native Excel charts.

Why static fills are better here:
- your tasks already have a **color** field
- Excel conditional formatting cannot easily say “read this hex code from another cell and use it as the fill color”
- if every task can have its own arbitrary color, conditional formatting gets messy fast
- direct fills are simpler and match the web Gantt more faithfully

### Two ExcelJS variants

#### Option A — recommended: direct cell fills
For each task row:
- write task metadata
- find the start/end date columns
- fill the cells across that date span using the task color

This gives the cleanest result for arbitrary bar colors.

#### Option B — conditional formatting
Possible, but better only when you have a **small fixed color palette** (for example, one rule per phase/category).

### Native Excel chart support?
No.
- ExcelJS **does not create chart objects**.
- If you load a workbook containing charts and save it again, charts are commonly lost because chart XML is not preserved.

So ExcelJS is excellent for **sheet-based Gantt rendering**, but **not** for generating a true Excel chart-based Gantt.

### Assessment
- **Client-side:** Yes
- **Visual output:** high
- **Complexity:** medium
- **Bundle/CDN:** good enough; similar size to SheetJS full build
- **Verdict:** **best overall choice**

---

## 3) Excel native chart (stacked bar trick)

### Can Excel represent a Gantt this way?
Yes, manually.
Microsoft’s own guidance is the classic approach:
- data table with `Task`, `Start Date`, `Duration`
- insert a **stacked bar chart**
- make the first series (“Start Date offset”) invisible
- keep the duration series visible

That can look good inside Excel.

### Can you generate that programmatically from a browser app?
**Not cleanly with the usual JS XLSX libraries.**

Problems:
- ExcelJS does **not** create charts
- ExcelJS does **not** safely preserve charts when rewriting a workbook
- SheetJS CE does not preserve chart objects either
- raw OOXML chart generation is possible in theory, but it is **too low-level and brittle** for this project

### Bottom line
- **As a concept:** valid
- **As an implementation choice in this stack:** poor

### Assessment
- **Client-side:** not with a practical maintainable implementation
- **Visual output:** high, if somehow produced
- **Complexity:** very high
- **Verdict:** avoid

---

## 4) Template-based approach

This is the most interesting “second-best” option.

### Template type A — recommended template style
Create an `.xlsx` template with:
- frozen panes
- branded headers
- task columns on the left
- pre-sized date columns on the right
- legend / print layout / page setup
- maybe conditional formatting if colors are phase-based

Then, from the browser:
1. fetch the template as an `ArrayBuffer`
2. load it with ExcelJS
3. inject tasks and dates
4. apply fills or copy formatting ranges
5. save with `writeBuffer()`

This works well.

### Template type B — embedded Excel chart template
This is **not recommended** with ExcelJS or SheetJS CE.

Reason:
- chart objects are the part most likely to be dropped when the workbook is re-saved

### When template-based is worth it
Use a template if you want:
- stable branding
- nicer print/export layout
- fewer style lines in JavaScript
- a fixed planning horizon (for example 52 weeks or 365 days)

### Important limitation
Template + conditional formatting is best when colors come from a **small known palette**.
If each task bar can have an arbitrary color, **direct fills are still easier** than trying to encode many Excel rules.

### Assessment
- **Client-side:** yes
- **Visual output:** good to very good
- **Complexity:** medium upfront
- **Verdict:** good follow-up improvement, especially after a first ExcelJS implementation exists

---

## 5) What tools like Monday.com, Smartsheet, and MS Project do

### Monday.com
Typical pattern:
- **Excel export = board/task data**
- **visual Gantt export = PDF**, not `.xlsx`

### Smartsheet
Official behavior is explicit:
- export to **Microsoft Excel** gives you the sheet/task data
- **Gantt charts are not preserved in Excel** because Excel does not have a native Smartsheet Gantt format
- Smartsheet separately offers **Export Gantt to Image (PNG)**

### Microsoft Project / Project for the web
Official export to Excel creates a workbook with a **project tasks** tab / task table.
That is useful data export, but it is **not the same thing as exporting the live Gantt visual**.

### Practical takeaway
The major vendors mostly treat this as two separate exports:
1. **Excel = data export**
2. **PDF / PNG / image = visual Gantt export**

That is a strong signal that **visual Gantt-in-Excel is not “free”** — it has to be deliberately synthesized.

---

## Recommended approach for this project

## Recommendation
Use **ExcelJS**, generate the workbook entirely in the browser, and render the Gantt as a **timeline grid with filled cells**.

### Why this is the best fit
- no backend required
- works with vanilla JS
- visually convincing in Excel
- supports your existing task fields directly
- handles **per-task colors** well
- avoids unsupported Excel chart APIs

### Suggested worksheet structure

#### Left-side metadata columns
- `A` Task
- `B` Phase / Category
- `C` Start
- `D` End
- `E` Duration
- `F` Dependencies

#### Right-side timeline columns
- `G...` one column per **day** for short/medium plans
- or one column per **week** for large plans

### Styling suggestions
- freeze panes at `G2`
- narrow timeline columns (`width ~ 3 to 4`)
- format date headers with rotated text or short labels
- use row height around `18-22`
- fill task span cells with task color
- optionally use darker left/right border on first and last filled cells so the bar feels continuous
- add weekend shading in the header/background if using daily columns
- keep dependencies as a text column rather than trying to draw arrows in Excel

### Why not dependency arrows?
Because drawing dependency connectors between cells/shapes in generated Excel files is much harder than the value it adds. Export the dependency data, but do not try to reproduce the web arrows in v1.

---

## Rough implementation outline

```js
import ExcelJS from 'exceljs';

async function exportGanttToExcel(tasks) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Gantt');

  // 1) Normalize dates
  const normalized = tasks.map(t => ({
    ...t,
    start: new Date(t.start),
    end: new Date(t.end),
  }));

  const minDate = startOfDay(min(normalized.map(t => t.start)));
  const maxDate = endOfDay(max(normalized.map(t => t.end)));
  const timeline = enumerateDays(minDate, maxDate); // or weeks

  // 2) Define columns
  sheet.columns = [
    { header: 'Task', key: 'name', width: 28 },
    { header: 'Phase', key: 'phase', width: 16 },
    { header: 'Start', key: 'start', width: 12 },
    { header: 'End', key: 'end', width: 12 },
    { header: 'Duration', key: 'duration', width: 10 },
    { header: 'Dependencies', key: 'deps', width: 18 },
    ...timeline.map(d => ({ header: d, key: iso(d), width: 3.5 }))
  ];

  // 3) Header / freeze panes
  sheet.views = [{ state: 'frozen', xSplit: 6, ySplit: 1 }];

  // 4) Write task rows
  normalized.forEach(task => {
    const row = sheet.addRow({
      name: task.name,
      phase: task.phase,
      start: task.start,
      end: task.end,
      duration: diffInDays(task.start, task.end) + 1,
      deps: (task.dependencies || []).join(', ')
    });

    timeline.forEach((day, i) => {
      if (day >= startOfDay(task.start) && day <= startOfDay(task.end)) {
        const cell = row.getCell(7 + i);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: toExcelARGB(task.color || phaseColor(task.phase)) }
        };
      }
    });
  });

  // 5) Format dates / headers / weekends / borders as needed

  // 6) Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([
    buffer
  ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gantt-export.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Implementation notes specific to Frappe Gantt data

Your current task model already has nearly everything needed:
- `name`
- `start`
- `end`
- `phase/category`
- `color`
- `dependencies`

### Recommended mapping
- Frappe `task.name` -> Excel `Task`
- Frappe `task.start` -> Excel `Start`
- Frappe `task.end` -> Excel `End`
- Frappe `task.custom_class` / phase info -> Excel `Phase`
- Frappe color config -> cell fill color
- Frappe dependencies -> comma-separated predecessor IDs/names

### Granularity rule of thumb
- **<= 6 months:** daily columns are fine
- **6-18 months:** weekly columns are usually better
- **> 18 months:** monthly or grouped weekly export is more practical

### Performance note
A workbook with, for example:
- 200 tasks
- 180 day columns

creates about **36,000 timeline cells**, which is reasonable for browser-side ExcelJS export.

---

## Final recommendation

If the feature needs to ship soon and work reliably:

1. **Choose ExcelJS**
2. Build a **sheet-based timeline export**
3. Use **direct cell fills** for bars
4. Keep dependencies as exported data, not drawn arrows
5. Consider a template later for polish, but **do not depend on native Excel charts**

That gives the user what they actually asked for: an `.xlsx` file that **opens looking like a Gantt chart**, not just a flat task list.

---

## Source notes

Key references used for this research:
- SheetJS standalone browser install docs: https://docs.sheetjs.com/docs/getting-started/installation/standalone/
- SheetJS parse options / Pro feature note: https://docs.sheetjs.com/docs/api/parse-options/
- SheetJS cell model: https://docs.sheetjs.com/docs/csf/cell
- ExcelJS README (browser bundles, styles, conditional formatting, writeBuffer): https://raw.githubusercontent.com/exceljs/exceljs/master/README.md
- Microsoft support: Gantt chart in Excel (stacked bar concept): https://support.microsoft.com/en-us/office/present-your-data-in-a-gantt-chart-in-excel-f8910ab4-ceda-4521-8207-f0fb34d9e2b6
- Microsoft Project export to Excel: https://support.microsoft.com/en-us/project/export-your-project-to-excel
- Smartsheet export behavior: https://help.smartsheet.com/articles/770623-exporting-sheets-reports-from-smartsheet
- Monday export behavior: https://support.monday.com/hc/en-us/articles/26989749858578-Export-from-monday-to-Excel
