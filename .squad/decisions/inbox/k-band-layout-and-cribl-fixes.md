# Decision: Band Layout Redesign + Cribl Default + DCR Capacity Fixes

**Date:** 2026-06-23T09:37:05+02:00  
**Author:** K (Frontend Dev)  
**Status:** Proposed

---

## Changes Made

### Fix #2 — Cribl checkbox defaults to FALSE

**File:** `js/modules/solutions.js` (line 2177)

The fallback value in `buildDraft()` when no explicit Cribl preference exists was changed from `true` to `false`. Cribl routing is an opt-in feature; the checkbox must not be pre-checked for users who have never expressed a Cribl preference. This aligns with `criblIngestionExplicit: false` semantics — only explicit user actions enable Cribl routing per connector.

**Rule established:** `resolvedCriblIngestion` defaults to `false` unless the user has saved an explicit preference (`criblIngestionExplicit: true`).

---

### Fix #3 — Cribl DCR nodes now display EPS and capacity info

**File:** `js/modules/topology.js`

The topology previously built three Cribl DCR plans (`criblSyslogDcrPlan`, `criblWindowsDcrPlan`, `criblLinuxDcrPlan`) with correct EPS and server-count-based capacity data, but never surfaced that data on the rendered "Custom DCR (Logs Ingestion API)" nodes. The nodes were displayed with no capacity label.

**Fix:** A `criblDcrCapacity` IIFE is computed before the Cribl ingress rendering block. It aggregates:
- Total EPS from `criblSyslogDcrPlan.totalEps`
- Total req/min from `criblWindowsDcrPlan` and `criblLinuxDcrPlan` DCR buckets
- Combined `dataSources` list from all three plans
- Combined `isNearLimit` flag

The resulting `capacityLabel`, `dataSources`, and `isNearLimit` are passed into both the top-band and bottom-band Cribl DCR node `data` objects so the DCR node component renders capacity metrics correctly.

**Rationale:** Cribl replaces the COLLECTOR layer (VMs, syslog forwarder), not the DCR layer. Logs still flow into a DCR endpoint in Sentinel, so DCR capacity must reflect the EPS and server load of Cribl-routed connectors.

---

### Fix #4 — Topology band layout: onprem + azure in top band, saas in bottom

**File:** `js/modules/topology.js` (around line 1373)

**Old logic:**
- Top band: onprem (if present)
- Bottom band: all other zones with rows (azure + saas)

**New logic:**
- Top band: onprem + azure (if either has rows)
- Bottom band: saas only (if both onprem/azure AND saas sources exist)
- Fallback (saas-only): saas occupies top band, no bottom band

**Rationale:**
- On-prem and Azure VMs share Windows DCRs, Linux DCRs, and AMA agents. Keeping them in the same band eliminates cross-band edges to shared DCR nodes.
- SaaS sources (AWS, GCP, third-party APIs) use completely independent ingestion paths (connector APIs, pub/sub). They never share DCRs with on-prem/Azure. Isolating them in the bottom band makes the data-flow topology clearer.
- Zone ordering within the top band remains `['onprem', 'azure']` (left → right), consistent with the existing `zoneOrder` convention.

**Verified invariants:**
1. `zoneOrder.filter((z) => zoneRows[z].length)` fallback still applies when no onprem/azure rows exist.
2. Layer box and Sentinel centering logic operates on `topBandZones`/`bottomBandZones` arrays and is unaffected by the content change.
3. Existing `cloneZoneLayoutsForRoute` and `buildSharedPlans` use the merged `zoneLayouts` (top + bottom) and remain unaffected.
