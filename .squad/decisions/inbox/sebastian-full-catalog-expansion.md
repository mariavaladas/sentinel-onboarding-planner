# Sebastian — Full catalog expansion

- **Date:** 2026-05-20T11:11:08.611+02:00
- **By:** Sebastian
- **Requested by:** Maria (madesous)

## Decision
Adopt a 12-category Sentinel content hub taxonomy in `data/solutions.json` and treat connector-bearing Azure-Sentinel solution metadata as the source of truth for catalog expansion.

## Category structure
1. `azure_first_party`
2. `microsoft_xdr`
3. `microsoft_365`
4. `identity_and_access`
5. `cloud_infrastructure`
6. `network_security`
7. `endpoint_security`
8. `siem_and_logging`
9. `saas_applications`
10. `threat_intelligence`
11. `compliance_and_governance`
12. `custom_and_codeless`

## Why
- The previous 3-bucket model (`azure_first_party`, `microsoft_logs`, `third_party`) was too coarse for a 300+ solution catalog.
- The planner needs category-aware scoring, onboarding, permission guidance, and export grouping that match real deployment patterns.
- Separating Microsoft-native, identity, cloud, network, endpoint, SaaS, threat intel, compliance, and custom ingestion content makes the recommendation engine and UI materially easier to reason about.

## Implementation notes
- Preserve the original seeded IDs for the existing 35 solutions.
- Derive content counts from Azure-Sentinel `Data/Solution_*.json` metadata for connector-bearing solutions.
- Keep `priority_score` formula and phase thresholds deterministic:
  - `priority_score = round(0.40*business_impact + 0.20*complexity_inverse + 0.15*setup_time_inverse + 0.15*detection_coverage + 0.10*maturity)`
  - Phase 1 `<=25h`, Phase 2 `26-50h`, Phase 3 `>50h`
- Reuse archetype templates for planner/onboarding/permissions so large-scale expansion stays consistent.
