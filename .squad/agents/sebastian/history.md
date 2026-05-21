# History — Sebastian

## Project Context
- **Project:** Sentinel Onboarding Planner v2
- **Stack:** HTML/CSS/JS, Fluent UI web components, solutions.json data catalog
- **User:** madesous
- **Created:** 2026-05-18

## Learnings

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

### 2026-05-21T12:55:34.261+02:00: Task hierarchy pattern for Windows Security Events
**Data model decision:**
- Kept `planner.setup_tasks` as the backward-compatible top-level array so the current Gantt planner and Excel export still read `setup_tasks[].task` without code changes.
- Added `id`, `phase`, `depends_on`, `rollup_method`, `optional`, and nested `subtasks` to the Windows Security Events planner entry so parent tasks behave like summary phases and child steps carry the detailed sequence.
- Used clean integer effort values only and treated parent `effort_hours` as rollups of the child steps.

**Patterns discovered:**
- The strongest fit for connector deployment work is the Microsoft Project / Smartsheet / Jira-style pattern: summary task plus indented child tasks, collapsible in the UI, with child-level dependencies and rolled-up parent timing.
- Asana is the main outlier because its timeline treats subtasks as a flat list, so it is a poor model for infrastructure deployment phases.
- Two levels are enough for this planner today; deeper nesting would add complexity before the UI can visualize it.

**User preferences and key files:**
- The user wants real AMA deployment sequencing, clean effort values (`0.5`, `1`, `2`, `3` style only), and explicit optional scale-out guidance.
- Key files for this change: `data/solutions.json`, `docs/connectors/ama-setup-guide.md`, `js/gantt-planner.js`, `.squad/decisions/inbox/sebastian-task-hierarchy.md`.

## 2026-05-21T14:04:30.678+02:00: RBAC Data Model — Comparison and Recommendation
**What I assessed:**
- Analyzed the current subtask hierarchy in Windows Security Events (five parent phases: Preparation, Connectivity, Deployment, Validation, Scale) with nested steps and dependencies.
- Reviewed the permissions object structure across all 342 solutions: `azure_roles`, `m365_roles`, `resource_permissions`, `third_party_admin`, `consent_required`, `privilege_level`, `notes`.
- Identified the challenge: when users select 5+ connectors, many share identical RBAC requirements (e.g., "Log Analytics Contributor" for three connectors, "Security Reader" for two). Currently, the planner shows only read-only permissions metadata; no deduplication or visibility in tasks.

**Two approaches designed:**
1. **Approach A — Single Grouped Task** — RBAC appears once in the Gantt as a top-level "Setup" phase task listing all connectors it covers. Cleaner Gantt, less visual noise, but requires new `rbac_tasks` array and UI rendering of `connectors_enabled` lists.
2. **Approach B — Per-Connector Subtask with Shared Indicator** — RBAC becomes a subtask under each connector's existing task hierarchy. Shared RBAC is marked `status: "shared"` with 0h effort and a note like "Already assigned for Connector X." More rows in Gantt, but self-contained per-connector visibility and minimal data model change.

**Scalability validation (5–10 connectors):**
- Approach A: ~8 RBAC rows → manageable, but `connectors_enabled` lists may need truncation UI
- Approach B: ~5–8 "Already done" (0h) rows → visual noise, but mitigated with collapsible sections or filters

**Recommendation: Approach B.**
- Aligns with existing subtask pattern (Windows Security Events proves it works)
- Minimal data model change: extend `setup_tasks[].subtasks[]`, add `permissions.fingerprint` for deduplication
- Clear semantics: RBAC subtask at position 0 of each connector's tree, marked `shared` if fingerprint matches another connector
- Better Excel export: RBAC rows naturally group under each connector
- Backward compatible: existing code unchanged

**Implementation roadmap:**
1. Add `permissions.id` and `permissions.fingerprint` to all 342 solutions in data/solutions.json (hash of sorted `azure_roles + m365_roles`).
2. Refactor connectors with explicit permission requirements to include RBAC subtask at `setup_tasks[].subtasks[0]`.
3. Implement fingerprint matching in js/planning.js at render time: mark duplicate RBAC subtasks as `status: "shared"` with `shared_by_connector` reference.
4. Update effort rollup in export.js to skip 0h shared RBAC subtasks.

**Patterns discovered:**
- Three RBAC patterns emerge across the catalog: Azure-scoped roles (Sentinel Contributor, VM Contributor), M365 tenant-wide roles (Security Admin, Security Reader), and resource-level permissions (access to specific hosts, appliances, or APIs).
- Most overlap occurs in the Azure space: Sentinel Contributor is required by ~60% of connectors. M365 roles cluster around identity/XDR solutions.
- RBAC effort is typically 0.5–1h per unique role assignment, bundled into one planner subtask per connector.

### 2026-05-18 Scribe Update
- Inbox decisions merged into decisions.md
- All agent outcomes consolidated and cross-referenced
- Decisions are now canonical; inbox cleared
- See: decisions.md entries for 2026-05-18 (v2 Data Model, v1 Security, Architecture Gap)

### 2026-05-21T15:10:22.804+02:00: solutions.json QA cleanup
**Architecture decisions:**
- Added record-level `category` and `is_connector` flags to every solution so the UI can filter and reason about entries without depending on top-level bucket position or `connectors` heuristics.
- Added `deprecated` and `ama_only` as explicit planner signals instead of deleting legacy/reference content that still has documentation value.
- Removed the `test-solution` placeholder entirely so recommendation, export, and audit counts stay trustworthy.

**Patterns discovered:**
- Zero-connector catalog entries are mostly workbooks, training packs, compliance content, and playbook-only packages; they belong in the catalog but not in the connector picker.
- Several Microsoft-native entries were misbucketed under `third_party`, so ownership needs to be explicit on each record.
- CEF, Syslog, and Windows event connectors should stay selectable as valid integrations, but their deployment path should bias to AMA rather than legacy agents.

**User preferences and key files:**
- The user wants data fixes applied directly in `data/solutions.json`, validated after editing, and captured in team memory.
- Key files: `data/solutions.json`, `.squad/decisions/inbox/luv-solutions-audit.md`, `.squad/agents/sebastian/history.md`, `.squad/decisions/inbox/sebastian-data-cleanup.md`.
