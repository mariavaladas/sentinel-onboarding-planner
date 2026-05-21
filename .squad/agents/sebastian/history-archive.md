# History Archive — Sebastian

Entries archived 2026-05-21 to keep main history.md under 15KB threshold.

---

### 2026-05-18: v1→v2 Data Model Analysis
**Problem:** v1 solutions.json contains only content counts (connectors, analytics, workbooks). No data for value scoring, planner tasks, or Excel export.

**Current Schema:** 
- 3 categories (azure_first_party, microsoft_logs, third_party)
- ~40 solutions total
- Fields: id, name, description, logo, github_url, connectors, analytics, workbooks, playbooks, is1P, tags
- **Gaps:** No complexity, setup_hours, business_impact, detection_areas, dependencies, tasks, or cost metadata

**v2 Data Model (Proposed):**
1. **value_scoring object:** complexity_level (1–5), setup_hours, data_volume_risk (low/medium/high), business_impact, maturity, detection_areas, dependencies. Enables priority_score calculation (0–100 rank).
2. **planner object:** setup_tasks (list with id, title, hours, order), validation_steps, documentation_url, common_issues, owner_recommended.
3. **export_metadata object:** group, priority_score (calculated), phased_deployment (1/2/3), integrates_with, estimated_monthly_cost.

**Scoring Engine:** priority_score combines weights: business_impact (40%), complexity_inverse (20%), setup_time_inverse (15%), detection_coverage (15%), maturity (10%). Output: ranked list for recommendations + phased deployment groups.

**Recommendation:** Option C (Balanced Phased) — Phase 1 for quick wins, Phase 2 for high-impact moderate complexity, Phase 3 for deep integrations. Aligns with planner narrative.

**Next:** Deckard to lock scoring criteria; Sebastian to populate value_scoring fields across all solutions.

### 2026-05-18T16:01:48.223+02:00: Full solutions.json enrichment
**Data model decisions:**
- Added `value_scoring`, `planner`, and `export_metadata` to all 35 solutions while preserving the legacy catalog fields.
- Used category-driven export groups and the existing `github_url` as `planner.documentation_url` to avoid introducing a second documentation lookup.
- Applied phase buckets directly from `setup_hours`: Phase 1 `<=25`, Phase 2 `26-50`, Phase 3 `>50`.

**Scoring calculations:**
- Implemented deterministic `priority_score = round(0.40*business_impact + 0.20*complexity_inverse + 0.15*setup_time_inverse + 0.15*detection_coverage + 0.10*maturity)`.
- Mapped `business_impact` to `100/75/50/25`, `maturity` to `100/50/10`, and capped detection coverage at five domains (`100`).
- Validated every stored score against the formula after enrichment so recommendation ordering can be trusted by the scoring engine and Excel export.

**Patterns discovered:**
- Azure first-party solutions are mostly Phase 1 quick wins with low complexity and strong foundational value.
- Microsoft XDR solutions cluster around high-value identity, endpoint, email, and SaaS coverage, with Entra/M365 dependencies driving sequencing.
- Phase 3 effort is concentrated in estate-wide collection connectors such as Linux Syslog and Windows Security Events, while most API-based SaaS integrations stay in Phase 1 or Phase 2.

### 2026-05-20T10:56:54.127+02:00: Onboarding and permissions enrichment
**What I assessed:**
- Added append-only `onboarding` and `permissions` objects to all 35 solutions in `data/solutions.json` without disturbing the existing scoring, planner, or export metadata.
- Classified connector setup effort across five repeatable patterns: Azure diagnostics, Microsoft native click-to-connect, Microsoft workload-dependent integrations, API-based third-party connectors, and infrastructure-backed CEF/agent rollouts.
- Captured privilege expectations separately from effort so recommendation logic can later balance setup friction against business value.

**Patterns discovered:**
- Native Azure diagnostics stay low-friction and low-privilege when the operator already has scoped Contributor access on the emitting resource.
- Microsoft SaaS and XDR connectors are usually easy to turn on in Sentinel, but the privilege bar rises quickly when tenant-wide workload consent or security admin ownership is involved.
- The hardest onboarding paths remain infrastructure-backed collectors (CEF/syslog, AMA, Arc) and cross-cloud exports where design choices outside Sentinel dominate the timeline.

**Schema decision:**
- `onboarding` now stores `difficulty`, `difficulty_score`, `setup_summary`, `estimated_clicks`, `infrastructure_required`, and `notes`.
- `permissions` now stores `azure_roles`, `m365_roles`, `resource_permissions`, `third_party_admin`, `consent_required`, `privilege_level`, and `notes`.

### 2026-05-20T11:08:20.769+02:00: AMA connector reference documentation
**What I created:**
- Added `docs/connectors/ama-setup-guide.md` as the base reference for AMA + DCR + Log Analytics + Sentinel architecture.
- Added `docs/connectors/syslog-forwarding-guide.md` for Linux forwarder patterns, direct-vs-forwarder decisioning, and Syslog / CEF onboarding.
- Added `docs/connectors/azure-monitor-pipeline-guide.md` for high-volume, transformation-heavy, and resilience-focused architectures.

**Architectural patterns documented:**
- The default Sentinel ingestion path is `AMA -> DCR -> Log Analytics workspace -> Sentinel`, with the DCR as the collection control plane.
- Syslog and appliance scenarios should branch to a dedicated Linux forwarder when the source cannot host AMA directly.
- Azure Monitor Pipeline becomes the scale-out option when customers need centralized filtering, buffering, routing, or sustained volume beyond a single forwarder design point.

### 2026-05-20T11:11:08.611+02:00: Full Sentinel connector catalog expansion
**What I expanded:**
- Rebuilt `data/solutions.json` from the Azure-Sentinel content hub metadata so the planner now carries **342 connector-bearing solutions** with complete scoring, planner, onboarding, export, and permissions blocks.
- Restructured the catalog from 3 buckets into 12 planning categories: Azure First Party, Microsoft XDR, Microsoft 365, Identity & Access, Cloud Infrastructure, Network Security, Endpoint Security, SIEM & Logging, SaaS Applications, Threat Intelligence, Compliance & Governance, and Custom & Codeless.
- Preserved the existing seeded IDs for the original 35 solutions, then layered in 307 new catalog entries with deterministic IDs, derived counts, and category-specific onboarding templates.

**Patterns discovered:**
- Connector-bearing content hub coverage is heavily concentrated in partner ecosystems: network security, SaaS/security apps, compliance platforms, and multi-cloud services dominate the long tail beyond Microsoft-native content.
- Most API and codeless integrations remain Phase 1 quick wins, while the small set of Phase 2/3 items are driven by forwarders, agents, or cross-cloud architecture.
- Accurate planning depends on archetype-level metadata: Azure native, Microsoft native, cloud export, API/codeless, forwarder-based CEF/Syslog, and custom ingestion each produce distinct effort, permission, and validation patterns.
