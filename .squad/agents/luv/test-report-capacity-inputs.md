# Luv QA Audit — Connector Capacity Inputs

**Date:** 2026-05-25T12:49:09.330+02:00  
**Reviewer:** Luv  
**Requested by:** madesous  
**Verdict:** **REJECT**

## Scope reviewed
- `js/modules/capacity.js`
- `js/modules/solutions.js`
- `js/gantt-planner.js`
- `css/style.css`
- `index.html`

## Summary
The feature is partially delivered: shared Windows sizing, Step 3 expand-in-place UI, Step 5 sizing editor, persistence, responsive stacking at 640px, default badges, and the planner VM badge all exist.

However, I found multiple correctness gaps that break the approved scope:
1. firewall sizing is stored **per solution**, not **per firewall instance / site**
2. API/cloud connectors are being misclassified as firewall-sized connectors
3. decimal sizing rounds incorrectly and can under-estimate VM count
4. negative inputs are blocked instead of being clamped to 0
5. validation is not purely advisory; invalid inputs hard-stop Save

## What passed
- **Shared Windows sizing exists** and persists through the shared `solutionGroups` state.
- **Second+ Windows card is read-only in Step 3** and points back to the owner card.
- **"I don't know" defaults exist** for Windows (`100 servers / 50% on-prem`) and firewall (`1000 EPS`).
- **Step 3 auto-collapses after save** into a one-line summary.
- **Continue button is not gated by sizing completion**; Step 3 is still only gated by having at least one selected/connected solution.
- **Inline VM math is shown** in both Step 3 and Step 5.
- **Load balancer threshold is correct** at `>= 3 VMs`.
- **Pipeline advisory threshold is correct** at `> 50k EPS`.
- **Responsive rules exist at `max-width: 640px`** for form stacking and VM-badge icon collapse.
- **Manual task overrides remain layered on top of regenerated sizing text** because row display overrides are applied after sizing-based task text generation.

## Findings

### 1) BLOCKER — No per-site / multi-instance firewall sizing
**Owner:** K  
**Severity:** Blocker

**Requirement:** Multi-site firewalls need separate EPS input per firewall instance / site.

**What I found:**
- selected solutions are stored in a `Set`, so a connector can only be selected once
- firewall sizing is saved under `solution.id`, which gives exactly one EPS payload per solution
- Step 3 and Step 5 both render only one EPS form per connector row/card

**Why this fails:**
A customer with the same firewall product in multiple sites cannot enter different EPS values per site. The implementation supports only one EPS value per connector type.

**Evidence:**
- `js/modules/solutions.js:14`
- `js/modules/solutions.js:1337`
- `js/gantt-planner.js:1798`
- `.squad/decisions.md:580`
- `.squad/decisions.md:616`

**Repro:**
1. Select a firewall connector such as Check Point or Fortinet.
2. Try to model two sites with different EPS values.
3. Only one sizing slot exists for that solution; a second site cannot be represented.

---

### 2) HIGH — API/cloud connectors can incorrectly show firewall sizing forms
**Owner:** K  
**Severity:** High

**Requirement:** API-based cloud connectors should not show capacity sizing forms.

**What I found:**
Connector type detection is heuristic text-matching. It classifies some API/cloud connectors as `firewall` if their text includes Palo Alto / Fortinet / Check Point markers plus catalog text that mentions CEF/syslog/forwarder.

**Concrete examples currently classified as `firewall`:**
- `cortex-xdr`
- `palo-alto-cortex-xdr-ccp`
- `palo-alto-cdl`
- `fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel`

**Why this fails:**
Those connectors are not classic per-site firewall forwarder scenarios, but the UI will still surface EPS sizing.

**Evidence:**
- `js/modules/capacity.js:37-58`
- `data/solutions.json:9129-9199`
- `data/solutions.json:13775-13849`
- `data/solutions.json:24237-24305`

**Repro:**
1. Load a connector like Cortex XDR.
2. Include it in Step 3.
3. The feature logic can classify it as firewall sizing even though its description is API-driven.

---

### 3) HIGH — Decimal inputs do not round up; VM sizing can be understated
**Owner:** K  
**Severity:** High

**Requirement:** Decimals should round up for VM calculation.

**What I found:**
Counts are normalized with `Math.round`, not upward rounding. That means borderline decimal inputs can size too low.

**Verified example:**
- `5000.1 EPS` currently becomes `5000 EPS` and returns **1 VM**
- expected behavior is upward rounding before VM sizing, which would require **2 VMs**

**Why this fails:**
This can understate infrastructure needs right at the threshold.

**Evidence:**
- `js/modules/capacity.js:84-87`
- `js/modules/capacity.js:167-216`

**Repro:**
1. Enter `5000.1` in a firewall EPS field.
2. Observe the preview/result resolves to `5,000 EPS` and `~1 VMs`.
3. Expected result should round upward, not to nearest.

---

### 4) MEDIUM — Negative values are rejected instead of clamped to 0
**Owner:** K  
**Severity:** Medium

**Requirement:** Negative values should clamp to 0.

**What I found:**
Validation treats negatives as invalid field errors, so Save is blocked instead of normalizing them to 0 with the existing warning path.

**Evidence:**
- `js/modules/capacity.js:120-125`
- `js/modules/capacity.js:137-139`
- `.squad/decisions.md:620`

**Repro:**
1. Enter `-5` EPS or `-2` Windows servers.
2. The field goes invalid and cannot be saved.
3. Expected behavior per decision is clamp-to-0 handling.

---

### 5) MEDIUM — Validation is not purely advisory; invalid fields hard-block Save
**Owner:** K  
**Severity:** Medium

**Requirement:** Validation should be advisory-only / non-blocking.

**What I found:**
Both Step 3 and Step 5 call `render...()` and then return early when `!isValid || !result`, which hard-blocks Save for invalid values.

**Why this matters:**
This is stricter than the approved UX language. Navigation is non-blocking, but the sizing save path itself is hard-blocked.

**Evidence:**
- `js/modules/solutions.js:939-949`
- `js/gantt-planner.js:5703-5710`
- `.squad/decisions.md:618-620`

**Repro:**
1. Enter a non-numeric or negative value.
2. The UI shows the advisory/error styling.
3. Save does nothing because the handler returns before persisting.

## Requirement audit matrix
| Requirement | Status | Notes |
|---|---|---|
| Windows-family cards expand with shared server sizing | PASS | Shared owner model implemented |
| Firewall/CEF cards ask for EPS | PASS (single instance only) | Missing per-site multi-instance support |
| API cloud connectors show no sizing form | FAIL | Heuristic misclassification causes false positives |
| Shared Windows sizing with second+ read-only pill | PASS | Step 3 behavior matches |
| "I don't know" defaults | PASS | Defaults apply and show estimate styling |
| Auto-collapse after save | PASS | Step 3 collapses to summary |
| Continue never gated on sizing | PASS | Only gated on any selection existing |
| Inline VM calculation shown | PASS | Shown in Step 3 and Step 5 |
| Load balancer at >=3 VMs | PASS | Correct |
| Pipeline advisory above 50k EPS | PASS | Correct |
| Validation advisory-only | FAIL | Save path hard-blocks invalid draft |
| Detail-panel editing updates planner/reactive text | PASS with caveat | Rebuild happens on save, not on raw keystroke |
| Preserve manual task overrides | PASS | Override layering order is correct |
| Form stacks under 640px | PASS | CSS rule present |
| VM badge collapses to icon on small screens | PASS | CSS rule present |

## Final verdict
**REJECT**

The feature is close, but it is not release-ready. The per-site firewall requirement is not implemented, API connectors can be pulled into the sizing flow incorrectly, and the rounding/negative-input behavior diverges from the approved rules. I recommend K fixes the blockers above before this is accepted.
