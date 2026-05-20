# Data catalog enrichment

## When to use
Use this pattern when a static solution catalog needs to be upgraded into a planning-ready dataset without breaking the legacy UI contract.

## Pattern
1. Read the full source catalog and inventory every existing solution ID before changing schema.
2. Keep the original fields untouched; add new objects as append-only metadata blocks.
3. Define a per-solution profile overlay for scoring inputs (impact, complexity, setup hours, maturity, detection areas, dependencies, cost, integrations).
4. Generate repeated planner content from archetype templates (Azure native, Microsoft native, API SaaS, CEF/syslog, multi-cloud, agent rollout, threat intelligence) so task wording stays consistent.
5. Calculate derived values like `priority_score` and `phased_deployment` in code, never by hand.
6. Validate every record after generation: schema presence, foreign-key integrity for dependency links, and score recalculation.

## Validation checklist
- Every solution contains `value_scoring`, `planner`, and `export_metadata`.
- `priority_score` matches the agreed formula exactly.
- Dependency and integration IDs all point to real solutions in the catalog.
- Planner tasks, validation steps, and common issues are realistic for the connector archetype.
