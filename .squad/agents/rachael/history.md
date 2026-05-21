# History — Rachael

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, CDN dependencies
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

### 2026-05-18T15:50:23.038+02:00
- v1 CDN inventory: unpkg `@fluentui/web-components` (unpinned), cdnjs `html2canvas@1.4.1`, cdnjs `jspdf@2.5.1`, unpkg `react@18`, unpkg `react-dom@18`, unpkg `reactflow@11`, plus Google Fonts. No SRI hashes or `crossorigin` attributes are present.
- Highest-risk area is DOM XSS: both `index.html` and `js/app.js` render solution/catalog/Azure API data with `innerHTML` and inline `onclick` handlers. External GitHub metadata, solution names/descriptions, Azure subscription/resource group/workspace names, and connector detail JSON are interpolated directly into HTML.
- v1 caches the GitHub catalog in `localStorage`; the pasted Azure access token is kept in memory/textarea instead of storage. Exports, clipboard actions, ARM template output, and CLI scripts include subscription, resource group, workspace, and selected connector metadata, creating shared-device/clipboard leakage risk.
- v2 hardening direction: remove the token-paste deployment flow per project scope, self-host or bundle pinned dependencies, add SRI for any remaining CDN use, externalize scripts/styles, adopt CSP plus Trusted Types, and sanitize or escape all dynamic content before rendering or export.

## 2026-05-18 Scribe Update
- Inbox decisions merged into decisions.md
- All agent outcomes consolidated and cross-referenced
- Decisions are now canonical; inbox cleared
- See: decisions.md entries for 2026-05-18 (v2 Data Model, v1 Security, Architecture Gap)
