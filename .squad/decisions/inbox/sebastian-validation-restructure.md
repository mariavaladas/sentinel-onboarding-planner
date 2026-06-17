# Decision: Validation task reorder and AWS multi-service task correction

**Date:** 2026-06-17T15:05:06+02:00
**Author:** Sebastian (Data Engineer)
**Requested by:** Maria (madesous)
**Status:** Implemented

---

## Context

Two catalog issues needed correction in `data/solutions.json`:

1. The Amazon Web Services featured solution described support for CloudTrail, VPC Flow Logs, GuardDuty, and CloudWatch, but its planner tasks only mentioned CloudTrail.
2. Many solutions placed validation after analytics or workbook deployment and combined ingestion checks with "confirm rule firing" language, which Maria explicitly rejected. Validation should only confirm data arrival and should happen immediately after connector or infrastructure setup.

Because this pattern exists at scale across the catalog, the change was implemented with a reproducible script rather than hand-editing individual solutions.

---

## Decision

Implement a scripted validation restructure pass for standard onboarding flows and patch the AWS solution with explicit multi-service task language.

---

## Implementation

**Script:** `scripts/restructure_validation_order.py`  
**Data file modified:** `data/solutions.json`

### What the script does

1. Loads every solution from `data/solutions.json`.
2. Identifies the primary validation task as the first non-tuning task with `phase == "Validation"`.
3. Classifies the leading setup block using task semantics, not just task IDs:
   - prerequisites
   - connector configuration
   - forwarder / AMA / DCR work
   - source-device export configuration
4. Moves the validation task to immediately follow that setup block.
5. Rewrites the validation task to:
   - focus only on ingestion and table arrival
   - set `owner_role = "SOC Analyst"`
   - set `duration = 0.5`
   - set `effort_hours = 2.0`
6. Rewrites `planner.validation_steps` to remove incident / rule-firing language.
7. Rebuilds the full linear `depends_on` chain and renumbers `order`.
8. Applies a bespoke AWS override with explicit CloudTrail, VPC Flow Logs, GuardDuty, and CloudWatch coverage.

### AWS-specific correction

The AWS planner now follows this sequence:

1. `aws-prereqs` — IAM + CloudTrail / GuardDuty / CloudWatch / VPC Flow Log prerequisites
2. `aws-s3-setup` — S3 + SQS path for CloudTrail and S3-routed VPC Flow Logs
3. `aws-connector` — configure AWS S3, GuardDuty, and CloudWatch connectors
4. `aws-validate` — verify `AWSCloudTrail`, `AWSGuardDuty`, and `AWSCloudWatch` ingestion
5. `aws-content` — deploy 62 analytics rules and 2 workbooks
6. `aws-tune` — tune cross-source correlation and noise handling

---

## Verification

Post-change verification confirmed:

- **489 total solutions** still parse successfully as JSON
- **473 solutions changed** relative to `HEAD`
- **436 solutions** had the validation task moved to a new order position
- **0 processed solutions** failed the validation-order audit
- **0 processed solutions** retained rule-firing / incident-confirmation language in the validation task
- **0 processed solutions** had a validation owner other than `SOC Analyst`
- **0 processed solutions** had a validation duration other than `0.5d`
- **0 processed solutions** had a tuning task that was not last

### Preserved bespoke flows

Three solutions were intentionally left structurally unchanged because they contain custom late-setup arcs that do not fit the generic reorder safely:

- `apache-log4j-vulnerability-detection`
- `common-event-format`
- `sysmon-via-ama`

These were preserved to honor the "don't break bespoke flows" constraint.

---

## Impact

The planner now reflects the correct operational sequence for standard connector onboarding: set up the source and connector path first, confirm telemetry is actually arriving, then enable analytics, workbooks, and playbooks. The AWS featured solution also now matches its documented service coverage, so customers no longer get a CloudTrail-only task plan for a multi-service onboarding package.
