# Routing Rules

## Domain Routing

| Domain | Primary Agent | Backup | Notes |
|--------|--------------|--------|-------|
| Architecture & scope | Deckard | — | All high-level design decisions |
| Value scoring & recommendations | Deckard + Sebastian | — | Joint: Deckard decides criteria, Sebastian implements |
| UI/wizard flow | K | Deckard | All frontend components and interactions |
| Planner view & export | K | Sebastian | Excel export logic may need Sebastian |
| Data model & solutions.json | Sebastian | Deckard | Scoring algorithms, data structures |
| Documentation & guides | Joi | Sebastian | Customer-facing docs, connector guides, references |
| Testing & validation | Luv | — | All QA, edge cases, export validation |
| Code review | Deckard | Luv | Deckard reviews architecture, Luv reviews correctness |
| Security & vulnerabilities | Rachael | Deckard | Secure code, dependency audit, threat modeling |

## Signal-Based Routing

| Signal | Route To |
|--------|----------|
| "recommendation", "scoring", "value", "ranking" | Sebastian (logic) + Deckard (criteria) |
| "wizard", "step", "UI", "component", "button", "form" | K |
| "planner", "tasks", "timeline", "export", "excel" | K (view) + Sebastian (data) |
| "test", "bug", "broken", "edge case" | Luv |
| "architecture", "design", "approach", "should we" | Deckard |
| "data", "solutions.json", "connector", "catalog" | Sebastian |
| "security", "vulnerability", "CVE", "XSS", "CSP", "audit" | Rachael |
| "dependency", "CDN", "supply chain", "hardening" | Rachael |
| "docs", "documentation", "guide", "reference", "README", "markdown" | Joi |
| "connector guide", "setup instructions", "customer docs", "how-to" | Joi + Sebastian (domain) |
