# History — Deckard

## Project Context
- **Project:** Sentinel Value Pack Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

### 2026-05-18: Architecture Gap Analysis — v1 vs v2

**Key Findings:**
- V1 is a clean, modular-by-intention codebase: 429 lines in app.js, 4-step wizard, vendor-based pre-selection, NLP search.
- **Keep:** Wizard navigation, vendor pre-selection, connector selection UI, NLP search, solutions catalog structure.
- **Remove:** Markdown export (exportPlan function), deployment automation wording, ARM/Bicep future roadmap items.
- **Add:** Value scoring system, planning view (timeline + effort), Excel export, UI badges for value/complexity.

**Architecture Decisions:**
- Modularize app.js → separate concerns into `modules/` (wizard.js, solutions.js, scoring.js, planning.js, export.js, search.js).
- Extend solutions.json schema: add `coverage`, `detection_quality`, `setup_ease`, `effort_estimate_hours`, `complexity`, `risk_level`, `dependencies`, `phase`.
- Stay with vanilla HTML/CSS/JS (no build step for MVP); use SheetJS (CDN) for Excel export, not ExcelJS.
- Redesign Step 4 (results) into planning view with timeline swimlanes, effort aggregation, risk indicators.

**Data Schema Additions (solutions.json):**
- `coverage` (0–100): % of typical scenarios this solution covers.
- `detection_quality` (1–5): Expert security assessment.
- `setup_ease` (1–5): Inverse of complexity; how quickly a new user can configure.
- `effort_estimate_hours` (number): Baseline setup time for typical org.
- `complexity` (1–5): Required expertise level (1=anyone, 5=expert engineer).
- `risk_level` ("low" | "medium" | "high"): Deployment risk.
- `dependencies` (array of IDs): Solutions that should be deployed first.
- `phase` (string, optional): Default timeline phase (e.g., "week1", "week2–3").

**Value Scoring Formula (Proposal):**
```
value_score = (coverage * 0.4) + (detection_quality * 25) + (setup_ease * 20)
// Result: 1–100, where 100 is "essential + easy"
```

**Files Impacted:**
- High priority: index.html, app.js, js/modules/* (new), data/solutions.json, css/style.css
- Medium priority: README.md

**Open Questions for Team:**
1. Value scoring weights: Is the 0.4 / 25 / 20 split correct, or should coverage weight higher?
2. Planning view phases: Are "week1", "week2–3", "week4+" the right buckets, or custom phases?
3. Complexity/effort scales: Are 1–5 scales intuitive, or prefer T-shirt sizing (S/M/L/XL)?
4. Gantt visualization: In MVP scope, or defer to Phase 2?

**Key Paths:**
- Architecture gap analysis: `.squad/decisions/inbox/deckard-v2-architecture.md`
- Solutions catalog: `data/solutions.json` (524KB; ~200+ solutions)
- App entry: `index.html` (~5KB), `js/app.js` (~15KB)
- CSS theme: `css/style.css` (~4KB, dark theme, Fluent UI inspired)

**Blockers/Notes:**
- None at architecture design phase; ready for implementation review by K/Sebastian.

## 2026-05-18 Scribe Update
- Inbox decisions merged into decisions.md
- All agent outcomes consolidated and cross-referenced
- Decisions are now canonical; inbox cleared
- See: decisions.md entries for 2026-05-18 (v2 Data Model, v1 Security, Architecture Gap)
