# Decision: Featured Solution Task Rewrite

**Date:** 2026-06-16T13:45:48+02:00
**Author:** Sebastian (Data Engineer)
**Requested by:** Maria (madesous)
**Status:** Implemented

---

## Context

15 solutions are flagged `isFeatured: true`. Of these, 4 already had hand-crafted tasks (azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id). The remaining 11 had been enriched by the Tier 3 batch script with generic templated tasks (prereqs/configure/content/validate with description = task text verbatim). These are the most visible solutions in the app, so low-quality tasks were a UX and credibility problem.

---

## Decision

Replace `planner.setup_tasks` for all 11 remaining featured solutions with product-specific, hand-crafted tasks written directly as Python data structures in `scripts/patch_featured_tasks.py`.

---

## Implementation

**Script:** `scripts/patch_featured_tasks.py`
**Data file modified:** `data/solutions.json`

### Solutions patched

| Group | Solution | Old Tasks | New Tasks | Total Days |
|-------|----------|-----------|-----------|------------|
| A — Multi-cloud | aws | 4 (generic) | 6 | 5.0d |
| A — Multi-cloud | google-cloud-platform-iam | 4 (generic) | 6 | 5.0d |
| A — Multi-cloud | threat-intelligence-new | 4 (generic) | 5 | 3.0d |
| B — Domain/content | dns-essentials | 4 (generic) | 4 | 2.0d |
| B — Domain/content | network-session-essentials | 4 (generic) | 4 | 2.0d |
| B — Domain/content | apache-log4j-vulnerability-detection | 4 (generic) | 4 | 2.0d |
| B — Domain/content | security-threat-essential-solution | 4 (generic) | 4 | 2.0d |
| C — Playbooks | virus-total | 4 (generic) | 4 | 2.5d |
| C — Playbooks | sentinel-soa-ressentials | 4 (generic) | 5 | 3.5d |
| D — Workbooks | soc-handbook | 4 (generic) | 4 | 2.0d |
| D — Workbooks | ueba-essentials | 4 (generic) | 4 | 2.5d |
| **TOTAL** | **11** | **44** | **55** | **31.5d** |

### Protected solutions (confirmed untouched)
- azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id

---

## Key Design Choices

### 1. Group-specific task arcs
Generic connectors only need prereqs/configure/content/validate. Featured solutions don't all follow this pattern:
- **Multi-cloud connectors** (aws, gcp): Need an explicit infrastructure-setup task for cloud-side components (S3/SQS for AWS, Pub/Sub + log sink for GCP) that has no Azure-native equivalent.
- **Domain solutions** (dns-essentials, network-session-essentials): Task 1 is a prerequisite *verification* step ("confirm your underlying connector is already deployed") — NOT a deployment step. The generic template's "configure" task incorrectly implied deploying a connector, which this solution deliberately doesn't include.
- **Vulnerability detection packs** (apache-log4j): Task 1 explicitly names source tables (CommonSecurityLog, Syslog, SecurityEvent, AzureDiagnostics) so engineers know what's required before enabling rules.
- **Playbook-only solutions** (virus-total, sentinel-soa-ressentials): No connector or analytics steps. Starts at API key/catalog review.
- **Workbook-only solutions** (soc-handbook, ueba-essentials): UEBA has a critical non-obvious prerequisite: UEBA must be *enabled in Sentinel settings* (separate from deploying the workbook) and requires 7 days of baseline data.

### 2. Owner role discipline
Cross-cloud solutions correctly assign infrastructure tasks to **AWS Cloud Admin** or **GCP Cloud Admin** — not Azure Platform Admin. The generic template assigned everything to Azure Platform Admin, which was incorrect and confusing to customers evaluating cross-cloud onboarding effort.

Canonical role split:
- Cloud infrastructure (S3/SQS, Pub/Sub) → **AWS Cloud Admin** / **GCP Cloud Admin**
- Connector configuration (cross-cloud) → **AWS Cloud Admin** (the cross-cloud party configures both sides)
- Content deployment (analytics rules, workbooks, playbooks) → **SOC Engineer**
- Tuning, validation, investigation → **SOC Analyst**

### 3. ASIM parser as first-class task
DNS Essentials and Network Session Essentials both require ASIM parsers (imDns, imNetworkSession) to be deployed before their analytics rules can function. The generic template had no step for this — rules would appear to be enabled but would return zero results. This is now the second task (after verify-data) in both solutions.

### 4. Realistic durations
- Multi-cloud infrastructure tasks: 1.0–1.5d (cross-cloud IAM, S3/SQS, Pub/Sub are genuinely complex)
- Content deployment (analytics rules, workbooks): 0.5d
- Playbook API connection configuration: 0.5–1.0d
- Validation and tuning: 0.5d each
- Planning/strategy (TI source selection, SOAR catalog review): 0.5d

---

## Validation

```
python scripts/patch_featured_tasks.py
→ 11 solutions patched, 55 tasks, 31.5 total days
→ Protected: azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id
→ JSON valid, 489 total solutions in file
```

AWS spot-check: tasks `[aws-prereqs, aws-s3-setup, aws-connector, aws-content, aws-validate, aws-tune]` with owner roles `[AWS Cloud Admin × 3, SOC Engineer, SOC Analyst × 2]` ✓

---

## Impact

The 11 most visible solutions in the planner app now show accurate, actionable onboarding task descriptions. Engineers following the planner will no longer be misled by generic descriptions that omit critical infrastructure steps (S3/SQS, Pub/Sub, ASIM parsers, UEBA baseline window, API quota tiers).
