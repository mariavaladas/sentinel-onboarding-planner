# v1 → v2 Data Model Quick Reference

## Current v1 Schema (per solution)
```
id, name, description, logo, github_url,
connectors, analytics, workbooks, playbooks,
is1P, tags
```

## Proposed v2 Additions

### value_scoring
```json
{
  "complexity_level": 2,              // 1=trivial, 5=expert-only
  "setup_hours": 4,                   // Estimated hours to configure
  "data_volume_risk": "medium",       // low|medium|high
  "business_impact": "high",          // low|medium|high
  "maturity": "stable",               // stable|beta|preview
  "detection_areas": ["endpoint"],    // Domain tags
  "dependencies": []                  // Prerequisite solution IDs
}
```

### planner
```json
{
  "setup_tasks": [
    {"id": "task-01", "title": "...", "hours": 1, "order": 1}
  ],
  "validation_steps": ["Step 1", "Step 2"],
  "documentation_url": "https://...",
  "owner_recommended": "Team Name",
  "common_issues": [
    {"problem": "...", "resolution": "..."}
  ]
}
```

### export_metadata
```json
{
  "group": "foundation",              // foundation|network|endpoint|identity|cloud
  "priority_score": 95,               // 0–100 (calculated by scoring engine)
  "phased_deployment": 1,             // 1|2|3
  "integrates_with": ["id1", "id2"],  // Complementary connectors
  "estimated_monthly_cost": "low"     // low|medium|high
}
```

## Scoring Weights (TBD by Deckard)
- **business_impact:** 40% 
- **complexity_inverse:** 20% 
- **setup_time_inverse:** 15%
- **detection_coverage:** 15%
- **maturity:** 10%

## Output: 3-Phase Rollout
- **Phase 1 (0–25 hrs):** Quick wins, low complexity
- **Phase 2 (25–50 hrs):** High-value, moderate complexity  
- **Phase 3 (50+ hrs):** Deep integrations, expert setup

## Who Does What
| Task | Owner | Status |
|------|-------|--------|
| Lock scoring criteria | Deckard | Pending |
| Populate value_scoring | Sebastian | Pending |
| Populate planner.setup_tasks (top 20) | Sebastian | Pending |
| UI priority badges + sorting | K | Pending |
| Excel export template | K | Pending |
| Scoring engine tests | Luv | Pending |
