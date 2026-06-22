# Deckard — AWS Log Type Selector: Architecture Recommendation

- **Date:** 2026-06-22T12:14:25+02:00
- **Owner:** Deckard
- **Requested by:** Maria
- **Scope:** `data/solutions.json`, `js/modules/solutions.js`, `js/modules/gantt-tasks.js`, `js/modules/capacity.js`
- **Status:** PROPOSED — pending team review

---

## 1. Proposed UX Pattern

### Decision: Reuse the sizing drawer shell with a new content renderer

The sizing drawer is already a well-tested, accessible side panel used for connector-specific configuration. Rather than inventing a new surface, we add a **log type selection variant** that plugs into the same drawer infrastructure.

The drawer opens when:
- The user selects a connector that carries `log_types` metadata (new field, see §2)
- The trigger fires on add (same as sizing: `openSizingDrawerForSolution` but gated by `hasLogTypes` instead of `requiresSizing`)
- Returning to Step 3 keeps the saved selections and shows the summary badge

**Drawer content for AWS:**

```
╔══════════════════════════════════════╗
║  × [close]                           ║
║  Log source selection                ║
║  Amazon Web Services                 ║
║  Choose which AWS log types to       ║
║  onboard. Each adds infrastructure   ║
║  and changes your task schedule.     ║
╠══════════════════════════════════════╣
║  ☑  CloudTrail                [REC]  ║
║     API activity, IAM, console auth  ║
║     1× S3 bucket + SQS queue         ║
║     ████ High analytics (45 rules)   ║
╠──────────────────────────────────────╣
║  ☑  GuardDuty                 [REC]  ║
║     Threat findings and detections   ║
║     Native API connector             ║
║     ████ High analytics (17 rules)   ║
╠──────────────────────────────────────╣
║  ☐  VPC Flow Logs                    ║
║     Network traffic patterns         ║
║     1× S3 bucket + SQS queue         ║
║     ██░░ Medium analytics (5 rules)  ║
╠──────────────────────────────────────╣
║  ☐  CloudWatch                       ║
║     App and infra log streams        ║
║     CloudWatch connector (API)       ║
║     ░░░░ Ingestion only (0 rules)    ║
╠══════════════════════════════════════╣
║  2 log types selected                ║
║  2× S3 bucket + SQS queue, 1× API   ║
║  Est. additional effort: +6h         ║
║                    [Save selections] ║
╚══════════════════════════════════════╝
```

**After saving**, the AWS card shows a summary badge:
> `CloudTrail · GuardDuty` *(inline below the card title, same pattern as the EPS/Cribl summary)*

**Analytics coverage badge values:**
- `High analytics` — ≥ 15 rules for this log type
- `Medium analytics` — 5–14 rules
- `Low analytics` — 1–4 rules
- `Ingestion only` — 0 rules

**Default selections:** Pre-check log types marked `recommended: true` in the data. For AWS: CloudTrail + GuardDuty. Customer can deselect or add VPC Flow Logs / CloudWatch.

**"Select all" shortcut:** A text link below the list: `Select all log types`. No "I don't know" path needed here — unlike EPS sizing, log type choices are business decisions the customer can make (they know which services they run in AWS).

### What NOT to do

- **Not inline checkboxes on the card** — the card grid is already dense; analytics badges + infrastructure labels won't fit in a card row without making the grid uncomfortably tall. Doesn't scale to GCP with 6+ log types.
- **Not a new wizard sub-step** — log type selection is a per-connector choice, not a wizard-level concern. Embedding it in a step would force customers to think about all cloud connectors at once rather than at the point of selection.
- **Not a separate modal** — modals block interaction with other cards. The drawer keeps the card grid visible for reference.

---

## 2. Data Model Changes (solutions.json)

### New top-level field: `log_types`

Added to any connector that supports sub-type selection. Initially: `aws` and candidate list below (§4).

```json
{
  "id": "aws",
  "name": "Amazon Web Services",
  ...existing fields...,
  "log_types": [
    {
      "id": "cloudtrail",
      "name": "CloudTrail",
      "description": "AWS API activity, IAM changes, and console sign-ins across accounts and regions.",
      "analytics_rules": 45,
      "analytics_tier": "high",
      "infrastructure": ["s3-bucket", "sqs-queue"],
      "infrastructure_label": "1× S3 bucket + SQS queue",
      "effort_hours_delta": 4,
      "recommended": true,
      "table": "AWSCloudTrail",
      "connector_id_hint": "aws-s3"
    },
    {
      "id": "guardduty",
      "name": "GuardDuty",
      "description": "AWS threat findings and security detections across in-scope regions.",
      "analytics_rules": 17,
      "analytics_tier": "high",
      "infrastructure": [],
      "infrastructure_label": "Native API connector",
      "effort_hours_delta": 2,
      "recommended": true,
      "table": "AWSGuardDuty",
      "connector_id_hint": "amazon-guardduty"
    },
    {
      "id": "vpc-flow-logs",
      "name": "VPC Flow Logs",
      "description": "Network traffic flow records for VPCs across selected regions.",
      "analytics_rules": 5,
      "analytics_tier": "medium",
      "infrastructure": ["s3-bucket", "sqs-queue"],
      "infrastructure_label": "1× S3 bucket + SQS queue",
      "effort_hours_delta": 3,
      "recommended": false,
      "table": "AWSVPCFlow",
      "connector_id_hint": "aws-vpc-flow-logs"
    },
    {
      "id": "cloudwatch",
      "name": "CloudWatch",
      "description": "Application and infrastructure log streams from CloudWatch Log Groups.",
      "analytics_rules": 0,
      "analytics_tier": "none",
      "infrastructure": [],
      "infrastructure_label": "CloudWatch connector (API)",
      "effort_hours_delta": 2,
      "recommended": false,
      "table": "AWSCloudWatch",
      "connector_id_hint": "amazon-cloudwatch"
    }
  ]
}
```

**Field definitions:**

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Stable key for planner state; kebab-case |
| `name` | string | Display name in the drawer |
| `description` | string | One-line context shown below the name |
| `analytics_rules` | number | Rule count for this log type (drives badge + analytics duration scaling) |
| `analytics_tier` | `"high"` \| `"medium"` \| `"low"` \| `"none"` | Derived display tier (for badge color) |
| `infrastructure` | string[] | Infra items needed (for summary and task generation) |
| `infrastructure_label` | string | Human-readable infra summary |
| `effort_hours_delta` | number | Additive hours to connector setup when this type is selected |
| `recommended` | boolean | Pre-checked in drawer; shown as `[REC]` badge |
| `table` | string | Target Log Analytics table (for validation task subtask copy) |
| `connector_id_hint` | string | Loose reference to the standalone connector if one exists (informational only; not used for dedup logic) |

### State storage

Log type selections are persisted alongside existing planner state:

```
localStorage key: sentinelPlanner.taskDurationOverrides.v1
Shape extension:
{
  "ganttTaskOverrides": { ... },   // existing
  "logTypeSelections": {           // NEW
    "aws": ["cloudtrail", "guardduty"],
    "gcp": ["audit-logs", "security-command-center"]
  }
}
```

This keeps all planner customization in one key and avoids a new localStorage root. The `logTypeSelections` map is keyed by connector `id` and contains an array of selected log type `id`s.

**Default behavior (no selection saved):** Fall back to all `recommended: true` log types. This means the first Gantt plan generated before the user opens the AWS drawer will already reflect a sensible default (CloudTrail + GuardDuty), not an empty plan.

---

## 3. Task Generation Changes (gantt-tasks.js)

### 3a. New PER_CONNECTOR_OVERRIDES entry for `aws`

The AWS connector currently routes to `API_CCP` (minimal pack, generates only a `PC-01 — Enable connector in Sentinel` task). This is correct for the field pack classification but the task content needs to be substantially richer for AWS.

**Change:** Add `aws` to `PER_CONNECTOR_OVERRIDES` with a dynamic subtask builder rather than a static list. This is the one place in the engine where log type awareness is introduced.

```js
// In PER_CONNECTOR_OVERRIDES — illustrative, not final code:
'aws': {
    // sourceCfgSubtasks and duration are computed at build time
    // from the selectedLogTypes list (passed via capacitySnapshot)
}
```

### 3b. Log-type-aware task generation

`buildGanttPlan` already receives `capacitySnapshot`. Extend it to also read `logTypeSelections` from the snapshot.

For AWS (and future multi-log-type connectors), `buildPerConnectorTasks` should:

1. **Read selected log types** from `capacitySnapshot.logTypeSelections[connector.id]`, defaulting to `recommended` types if absent.

2. **Generate 4 tasks** (preserving the existing PC-01..04 structure):
   - `AWS-01` — **IAM & prerequisites** — subtasks enumerate each selected log type's IAM requirements
   - `AWS-02` — **Infrastructure setup** — subtasks are one per S3-requiring log type (CloudTrail S3+SQS, VPC Flow Logs S3+SQS); skip if only GuardDuty/CloudWatch selected
   - `AWS-03` — **Enable connectors in Sentinel** — subtasks enumerate each selected log type's connector
   - `AWS-04` — **Validate ingestion** — subtasks enumerate each selected log type's KQL validation

3. **Duration scales with log type count:**
   - Base: 4h (IAM/prereqs, always)
   - +`effort_hours_delta` per selected log type
   - Minimum total: 6h (CloudTrail + GuardDuty only)
   - Maximum total: 15h (all four types)

4. **Analytics rule count for content phase scales with selected log types:**
   The existing `getAnalyticsRuleReviewHours()` sums `connector.analytics`. For connectors with `log_types`, replace the raw `analytics` count with the sum of `analytics_rules` across only selected log types. This naturally reduces the Content Deployment phase duration when a customer skips VPC Flow Logs and CloudWatch.

**Example: CloudTrail + GuardDuty only (62 total rules → 62 attributed in current data; should be recalculated as 45+17=62 for these two; VPC=5, CW=0)**

Note: The current `aws.analytics = 62` likely already reflects CloudTrail + GuardDuty rules. Sebastian should verify and update the rule breakdown per log type when populating the `log_types` data.

### 3c. No new field pack required

AWS uses `API_CCP` (via `infrastructure_required` → `iam-role`). The log type selector doesn't change the infrastructure category — it only changes per-connector task content and duration. No new pack entry in `FIELD_PACK` or `PACK_JOIN_TASK` is needed.

### 3d. Minimal pack override for AWS

`API_CCP` is currently in `MINIMAL_CONNECTOR_PACKS`, which means AWS generates only one task (`PC-01`). AWS is not truly minimal — it needs IAM setup, S3/SQS provisioning, connector configuration, and validation. 

**Change:** Remove `API_CCP` from the minimal set (or introduce a sub-classification). Instead, connectors with `log_types` defined always get the full PC-01..04 treatment, routing through a new `buildAWSStylePerConnectorTasks` that wraps `buildPerConnectorTasks` with log-type awareness.

This is the most invasive change in the engine but it's scoped to connectors that explicitly declare `log_types`.

---

## 4. Other Connectors This Pattern Applies To

### Immediate candidates (v1 scope with AWS)

| Connector | Log types | Notes |
|---|---|---|
| `aws` | CloudTrail, GuardDuty, VPC Flow Logs, CloudWatch | Primary driver of this decision |
| `google-cloud-platform` (GCP Audit) | Admin Activity, Data Access, System Events, Policy Denied, VPC Flow, Security Command Center | GCP already has a dedicated VPC Flow solution; the unified GCP entry has similar sub-type complexity |

### Deferred candidates (v2)

| Connector | Sub-types | Notes |
|---|---|---|
| `office-365` | Exchange, SharePoint, Teams, General, DLP | Already has sub-type notion in O365 Management API; could surface as log type selections |
| `azure-activity` | Administrative, Security, Service Health, Alert, Recommendation | Controlled by DCR category filters in the connector blade; could pre-configure scope |
| `microsoft-defender-for-endpoint` | DeviceEvents, DeviceNetworkEvents, DeviceFileEvents, etc. | Advanced Hunting schema tables; complex enough to warrant its own design |

**Do not implement for v1:** Azure native connectors (Entra ID, Defender XDR, Microsoft 365 Defender). Their sub-types are managed inside the connector blade itself and don't have separable infrastructure requirements.

---

## 5. Tradeoffs Considered

### T1: Reuse sizing drawer vs. new dedicated drawer

| | Sizing drawer reuse | New dedicated drawer |
|---|---|---|
| **Code** | ~60 new lines (new content renderer + trigger condition) | ~200+ new lines (new shell, animations, state) |
| **Consistency** | Same UX as sizing | Different pattern in the same step |
| **Risk** | Low — proven infrastructure | Higher — untested |
| **Verdict** | ✅ Preferred | ❌ Rejected |

The sizing drawer is already accessible (Esc to close, focus trap, attention animation). Reusing it means log type selection inherits all that for free.

### T2: Pre-check recommended vs. pre-check all

Pre-checking all 4 log types would mean every AWS customer starts with the maximum plan (longest duration, most tasks). For customers who genuinely only want CloudTrail + GuardDuty, this front-loads unnecessary work estimation. Pre-checking `recommended` types means the plan is immediately useful without the drawer interaction, and customers who want VPC / CloudWatch explicitly opt in.

**Verdict: Pre-check `recommended: true` log types.**

### T3: Task count — per-log-type rows vs. grouped subtasks

| Option | Gantt rows | Benefit | Cost |
|---|---|---|---|
| One row per log type per task | 4 log types × 4 tasks = 16 rows | Maximum granularity; independent scheduling | Gantt becomes very wide for AWS; task IDs proliferate |
| Grouped with subtasks (current PC-01..04 structure) | 4 rows, 4–12 subtasks each | Clean Gantt; existing detail drawer exposes subtask checklist | Can't schedule CloudTrail and VPC Flow Log setup independently |

For onboarding planning (not project management), customers don't need independent scheduling per log type. They're following a sequential setup guide. Grouped subtasks is the right fidelity.

**Verdict: Keep PC-01..04 structure; make subtasks log-type-aware.**

### T4: Analytics count attribution

If a customer selects only CloudTrail + GuardDuty, the Content Deployment phase should scale to 62 rules (45+17), not the full 62 + VPC 5 = 67. The current `aws.analytics = 62` already reflects this if VPC and CloudWatch rules are included in separate solutions. Sebastian should audit and adjust the rule split in the `log_types` data so the analytics duration scaling is accurate.

**Verdict: Drive Content phase analytics duration from selected log type rule counts, not the connector-level `analytics` field.**

### T5: Interaction with the lock mechanism

The sizing drawer has a "lock" that prevents switching connectors mid-edit. The log type drawer should use the same mechanism since saving log type selections affects task generation (same severity as saving EPS). The existing `isSizingDrawerLockActive()` / `notifySizingDrawerLock()` functions can be reused without change — the drawer shell is the same, so the lock already applies.

**Verdict: No changes to lock mechanism required.**

---

## Implementation Sequencing

1. **Sebastian (data):** Populate `log_types[]` for `aws` in solutions.json. Audit rule counts per log type. Update `aws.planner.setup_tasks` subtask descriptions to reference specific log types by name.

2. **K (UI):** Add `hasLogTypes(solution)` predicate to `solutions.js`. Add log type drawer content renderer (`createLogTypeEditor`). Extend `getCurrentCapacitySnapshot()` to include `logTypeSelections`. Wire drawer trigger for log-type connectors.

3. **K (engine):** Add `logTypeSelections` reader to `buildGanttPlan`. Extend `buildPerConnectorTasks` with log-type-aware subtask generation for `aws`. Adjust analytics rule count for content phase when log types are defined.

4. **Luv (QA):** Test all four log type permutations (all, none, just CloudTrail, just GuardDuty + VPC). Verify drawer lock, card summary badge, Gantt task count, analytics duration scaling, and localStorage round-trip.

---

## Open Questions

1. **GCP scope for v1?** GCP has a dedicated VPC Flow Logs solution entry already. Should the unified GCP connector also get a log type selector, or defer to v2? Recommended: defer GCP to v2 and ship AWS only.

2. **"None selected" guard?** If a user deselects all log types, should the Save button be disabled, or should deselecting all remove the connector from the plan? Recommended: disable Save when no types are selected; show inline error "Select at least one log type to continue."

3. **Excel export?** Should the export header row or the "Infrastructure & Sizing" section show which log types are selected? Recommended: add a "Log types" row to the sizing summary export block.
