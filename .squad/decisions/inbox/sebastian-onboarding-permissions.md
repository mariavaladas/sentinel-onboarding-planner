# Sebastian — onboarding and permissions schema

- **Date:** 2026-05-20T10:56:54.127+02:00
- **By:** Sebastian (Data Engineer)
- **Status:** Proposed for merge

## What changed
Added two append-only top-level metadata blocks to every solution in `data/solutions.json`:

1. **`onboarding`**
   - `difficulty`
   - `difficulty_score`
   - `setup_summary`
   - `estimated_clicks`
   - `infrastructure_required`
   - `notes`
2. **`permissions`**
   - `azure_roles`
   - `m365_roles`
   - `resource_permissions`
   - `third_party_admin`
   - `consent_required`
   - `privilege_level`
   - `notes`

## Why
The planner needed a realistic way to separate connector value from connector friction. These fields make onboarding effort and permission blast radius explicit without changing the existing scoring, planner, or export contracts.

## Implementation notes
- Schema is append-only and backward compatible.
- Difficulty uses the approved 1-3 scale (`easy`, `moderate`, `hard`).
- Permission modeling separates Azure RBAC, M365 roles, resource-scoped rights, third-party admin dependency, and consent burden so future scoring can weight them independently.
- Validation expectation: every solution must carry both objects after enrichment.
