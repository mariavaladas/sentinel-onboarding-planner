# History Summary — Deckard

**Project:** Sentinel Onboarding Planner v2
**Role:** Lead / Architect
**Period Covered:** 2026-05-18 to 2026-05-25

## Key Themes

### 1. Architecture Vision (2026-05-18)
- Transformed v1 (429-line monolith) into v2 modular design (6 ES6 modules)
- Shifted from "planner not deployer" to full Excel export instead of Markdown
- Established data model extensions (value_scoring, planner tasks, export_metadata)
- Proposed value scoring formula (40% business_impact + 20% complexity_inverse + 15% setup_time + 15% detection_coverage + 10% maturity)

### 2. EPS & Infrastructure Research (2026-05-20)
- Established measured-first EPS workflow: existing platform → source-native measurement → estimate fallback
- Locked Microsoft sizing anchors: ~5,000 EPS per Windows/WEF collector, ~10,000 EPS per Linux AMA
- Defined pipeline recommendation trigger: beyond single-forwarder territory or when filtering/buffering/resiliency needed
- Proposed EPS Assessment wizard step as core product evolution

### 3. Environment Sizing Pattern (2026-05-22)
- Designed connector-level infrastructure sizing (Small/Medium/Large categories)
- Established duration scaling model: category maps to task duration spans (2d to 4 weeks for Windows Security Events)
- Implemented conditional task visibility (Arc onboarding skipped for all-Azure Small)
- Created backward-compatible schema extension (optional environment_scaling array per connector)

### 4. Capacity Input UX (2026-05-25)
- Approved expand-in-place pattern on solution cards (not modal, not sub-step)
- Shared Windows sizing for all AMA connectors (one input, all Windows card instances use it)
- Per-site EPS for firewall/CEF (each deployment gets separate EPS form)
- Advisory-only validation, non-blocking (aligns with planner not deployer principle)
- User confirmed 4 open questions: load balancer threshold (≥3 VMs), pipeline trigger (>50k EPS), multi-firewall EPS (per-site), back-nav preservation

## Artifacts Created
- eps-discovery-research.md (decision support doc)
- product-brainstorm.md (3-part roadmap: Readiness → Assessment → Validation)
- spec.md updates (Environment Sizing feature + Connector Task Durations)
- decisions.md entries (6 major decisions, all approved or pending review)
- orchestration-log/20260525T1049Z-deckard.md (session recap)

## Current Status
Capacity UX architecture ready for K implementation and Sebastian data model sync (need capacity_type, sizing_defaults, shares_sizing_group fields in solutions.json).

## Next Priority
1. K's implementation of Step 3 capacity forms and Step 5 Gantt sizing panel
2. Sebastian's data model updates
3. QA validation of shared Windows sizing and per-site EPS patterns
