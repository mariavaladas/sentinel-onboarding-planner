# Joi Connector Documentation Standards Proposal

- **Date:** 2026-05-20T11:15:54.563+02:00
- **Author:** Joi
- **Scope:** Customer-facing connector and onboarding guides under `docs/`

## Proposed reusable pattern

1. Start every connector guide with a **Quick Reference** table that answers permissions, time, difficulty, and the best-fit scenario.
2. Add a short **When to Use This** section followed by a lightweight **Decision Tree** so customers can self-select the right pattern.
3. Keep the body practical and implementation-first: prerequisites, portal path, real commands, validation queries, troubleshooting, and cost notes.
4. Add explicit **Validation Steps**, **Common Pitfalls**, and **Further Reading** sections to every guide.
5. Cross-link related guides bidirectionally so customers can move from direct AMA -> Syslog forwarder -> Pipeline without losing context.
6. Prefer Microsoft Learn synthesis over copied text, and surface specific numbers only when the source publishes them clearly.

## Why this is worth reusing

This pattern makes connector docs easier for IT admins and SOC engineers to scan, compare, and operationalize. It also reduces drift between guides by giving every author the same customer-facing structure.

## WEF follow-up

- **Date:** 2026-05-20T11:27:22.544+02:00
- For topology-heavy connector guides, include an explicit **Architecture Overview** diagram and a **comparison table** against adjacent patterns so customers can tell when the design is a first-class fit versus a workaround.
- When a guide mentions Azure Monitor Pipeline, state clearly whether Pipeline is a native ingestion path for that exact data type or only an adjacent design option.

