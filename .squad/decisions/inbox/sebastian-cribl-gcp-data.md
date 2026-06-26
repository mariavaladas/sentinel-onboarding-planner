# sebastian-cribl-gcp-data.md
**From:** Sebastian (Data Engineer)
**To:** Team
**Date:** 2026-06-23T08:31:02+02:00
**Re:** QA Blocker Fixes B2 and B3 — Cribl Stream and GCP connector planner data

---

## Summary

Fixed both QA data-integrity blockers identified in Luv's assessment. All 18 affected solutions now have complete `planner.setup_tasks` in `data/solutions.json`. JSON is valid; 489 total solutions unchanged.

---

## B2 — cribl-stream: Missing planner data (FIXED)

**Root cause:** `cribl-stream` existed in solutions.json with only `value_scoring` and `fieldPack` — no `planner`, `export_metadata`, or `category` keys. It was skipped by every prior batch patch script because those scripts either required an existing `planner` key or excluded solutions without `business_impact: high` set explicitly.

**What was added:**

| Field | Value |
|-------|-------|
| `category` | `"cloud"` |
| `isFeatured` | `true` |
| `export_metadata.group` | `"Integration Platforms"` |
| `export_metadata.priority_score` | `68` |
| `export_metadata.phased_deployment` | `2` |
| `export_metadata.integrates_with` | `["common-event-format", "windows-forwarded-events", "aws", "azure-activity"]` |
| `planner.setup_tasks` | 6 hand-crafted tasks, 6.5d total |
| `planner.validation_steps` | 3 steps |
| `planner.documentation_url` | `https://docs.cribl.io/stream/destinations-sentinel/` |
| `planner.owner_recommended` | `"Cribl Admin"` |
| `planner.common_issues` | 3 issues |

**Cribl Stream task arc (bespoke, Logs Ingestion API pattern):**

| # | ID | Phase | Task | Duration | Owner |
|---|----|-------|------|----------|-------|
| 1 | cs-prereqs | Prerequisites | Plan deployment architecture; create DCE, DCRs, and Entra ID app registration with Monitoring Metrics Publisher role | 1.0d | Azure Platform Admin |
| 2 | cs-infra | Configuration | Deploy/validate Cribl Stream Leader + Worker Group; open outbound HTTPS to DCE endpoint; validate licence | 1.5d | Cribl Admin |
| 3 | cs-sources | Configuration | Configure Sources for all incoming log types (Syslog, HEC, S3, Splunk Forwarder); tag with _sourcetype | 1.5d | Cribl Admin |
| 4 | cs-destination | Configuration | Configure Sentinel HTTP destination (DCE URL + OAuth2 + DCR stream mapping); build normalisation pipelines; create Routes | 1.5d | Cribl Admin |
| 5 | cs-verify | Validation | End-to-end test with sample events; verify records in Sentinel tables; check ingestion volume matches EPS | 0.5d | SOC Engineer |
| 6 | cs-operationalise | Operationalization | Enable Cribl monitoring/alerting; document route-pipeline-table map in SOC runbook; review Sentinel health blade after 24h | 0.5d | SOC Engineer |

**Design decisions:**
- `isFeatured: true` — Cribl is a first-class vendor with a dedicated Step 2 card
- `category: "cloud"` — no "integration" or "data-pipeline" category exists; "cloud" is the most applicable existing category for infrastructure-level tools
- `phased_deployment: 2` — Cribl requires prior Sentinel workspace planning (Phase 1); it's deployed alongside or before the connectors it routes
- `priority_score: 68` — high business impact offset by high complexity (level 3) and no detection content; sits between aws (61) and gcp-iam (65)
- Owner role `Cribl Admin` for all pipeline work (not Azure Platform Admin) — the product-side infrastructure is owned by whoever manages Cribl in the environment

---

## B3 — 17 GCP connectors: Missing setup_tasks (FIXED)

**Root cause:** All 17 connectors had a partial `planner` key (validation_steps, common_issues, documentation_url) but no `setup_tasks`. The Batch B patch script's `is_generic` guard returned False when any `planner` key was present, so these were silently skipped. The missing `setup_tasks` key was never detected.

**Pattern applied:** GCP Pub/Sub-based ingestion — same underlying infrastructure pattern for all 17 connectors, personalised per connector with product-specific log filters, resource types, and table names.

**Task structure (base, 4 tasks, 3.0d):**

| # | Suffix | Phase | Owner | Duration | What it covers |
|---|--------|-------|-------|----------|----------------|
| 1 | -prereqs | Prerequisites | GCP Cloud Admin | 1.0d | Service account creation, IAM role grants (pubsub.subscriber + logging.admin), Sentinel workspace RBAC |
| 2 | -pubsub | Configuration | GCP Cloud Admin | 1.0d | Pub/Sub topic + subscription, Cloud Logging sink with product-specific log filter, sink verification |
| 3 | -connector | Configuration | Azure Platform Admin | 0.5d | Sentinel connector config (project ID, subscription, service account JSON), enable + Connected status |
| 4 | -verify | Validation | SOC Analyst | 0.5d | KQL query to target Sentinel table, generate test GCP event, confirm latency |

**Extended for connectors with analytics/workbooks/playbooks (+1 task, 3.5d):**
- Task 5 `-content` (Operationalization, SOC Engineer, 0.5–1.0d): deploy solution content from Content Hub, configure Logic App connections, review entity mappings

**Extended for high-content connectors (analytics ≥ 10 or total ≥ 14) (+2 tasks, 4.5d):**
- Task 6 `-validate` (Validation, SOC Analyst, 0.5d): allow-list GCP service accounts + CI/CD principals, adjust thresholds, confirm rule triggers with synthetic event

**All 17 connectors:**

| Connector | Tasks | Duration | Content |
|-----------|-------|----------|---------|
| google-cloud-platform-audit-logs | 5 | 3.5d | 7 analytics |
| google-cloud-platform-big-query | 5 | 3.5d | 4 playbooks |
| google-cloud-platform-cdn | 4 | 3.0d | — |
| google-cloud-platform-cloud-monitoring | 4 | 3.0d | — |
| google-cloud-platform-cloud-run | 4 | 3.0d | — |
| google-cloud-platform-compute-engine | 4 | 3.0d | — |
| google-cloud-platform-dns | 6 | 4.5d | 11 analytics |
| google-cloud-platform-firewall-logs | 4 | 3.0d | — |
| google-cloud-platform-iam | 6 | 4.5d | 10 analytics + 1 wb + 4 pb |
| google-cloud-platform-ids | 4 | 3.0d | — |
| google-cloud-platform-load-balancer-logs | 4 | 3.0d | — |
| google-cloud-platform-nat | 4 | 3.0d | — |
| google-cloud-platform-resource-manager | 4 | 3.0d | — |
| google-cloud-platform-security-command-center | 5 | 3.5d | 5 analytics |
| google-cloud-platform-sql | 4 | 3.0d | — |
| google-cloud-platform-vpc-flow-logs | 4 | 3.0d | — |
| google-kubernetes-engine | 4 | 3.0d | — |

---

## Validation Results

- JSON valid, 489 total solutions confirmed
- All 489 solutions: non-empty `setup_tasks` ✓
- All new task durations: within [0.5, 3.0]d ✓
- All new task descriptions: ≥ 80 chars (actual range 398–807) ✓
- Pre-existing `defender-xdr` 0.25d violation: unchanged (pre-existing issue, out of scope)

## Files Changed

- `data/solutions.json` — 18 solutions patched
- `scripts/patch_gcp_cribl_tasks.py` — new idempotent patch script

## Recommendation for Luv

B2 and B3 are resolved. Suggest re-running the QA completeness check on these 18 solutions to confirm the setup_tasks, export_metadata, and category fields all pass your validation suite.
