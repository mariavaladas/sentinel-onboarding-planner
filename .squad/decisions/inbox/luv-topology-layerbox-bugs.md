# Topology Layer Box Bugs — QA Audit Findings

**By:** Luv (QA)
**Date:** 2026-06-10T14:30:17.276+02:00
**Relates to:** `js/modules/topology.js` — `createLayerBoxNodes()` and collectorVm placement
**Full report:** `.squad/agents/luv/topology-qa-report.md`

---

## Decision 1: Reclassify `cribl` and `pathBox` into Collection layer

**What:** In `createLayerBoxNodes()` (line 1988–1996), change `layerConfigs` so that:
- `collection` and `collection-bottom` types include `'cribl'` and `'pathBox'`
- `transformation` and `transformation-bottom` types contain only `'dcr'`

**Why:** Cribl is rendered at `bandBottomY + 80` (collection Y range) but is currently classified in `transformation`. This causes the transformation box to include Cribl's Y as `minY`, so after gap enforcement the transformation box is pushed 177px below Cribl — Cribl ends up completely outside its own layer box. The spec explicitly states Cribl belongs in Collection. `pathBox` nodes (Native Connector, Diagnostic Settings, Logic App, API Connector) are all collection-layer intermediaries per the spec; none of them are transformation steps.

**Impact:** Fixes the transformation box clipping/thinness issue. Fixes spec compliance for Cribl and pathBox classification. Cascades to correct workspace isolation and layer separation.

**Owner to implement:** K

---

## Decision 2: Fix bottom-band collectorVm Y formula

**What:** At line 1794, change:
```javascript
// BEFORE — wrong direction (places collectorVm ABOVE DCR, towards Sentinel)
? getBottomLayerY(1) - intermediaryLayerGapY * 0.5

// AFTER — places collectorVm BELOW DCR, between DCR and sources
? getBottomLayerY(bottomDcrLayerIndex || 1) + intermediaryNodeHeight + 60
```

Also increase `bottomSourceGapY` from `140` to `260` (line 1037) so sources are pushed far enough down to accommodate the collectorVm.

**Why:** In the bottom band, sources are at LARGE Y and Sentinel is at SMALL Y. The collectorVm must sit between sources (large Y) and the DCR (medium Y), i.e., at a LARGER Y than the DCR. The current formula uses minus, placing it at `sentinelY + 192` — above the DCR at `sentinelY + 292` — causing a 20px physical overlap and visually backward edge routing (data flows source → up → back down → up). With `bottomSourceGapY = 140`, there isn't even enough vertical space to fit a 120px collectorVm plus gaps between DCR and sources; 260px resolves this.

**Impact:** Fixes 20px bottom-band DCR/collectorVm overlap. Fixes transformation-bottom box being an 80px stub that doesn't contain its DCR nodes (cascade from wrong collectorVm placement). Correct bottom-band edge routing.

**Owner to implement:** K

---

## Decision 3: Update topology-spec.md constants to match current code

**What:** Update `docs/topology-spec.md` §5 to reflect actual code values:
- `topIntermediaryOffsetY`: 72 → **280**
- `intermediaryLayerGapY`: 152 → **200**
- `topSentinelGapY`: 96 → **160**
- `bottomSentinelGapY`: 120 → **160**
- Update §11 Cribl note from "pending refactor" to current architecture (Cribl at `bandBottomY + 80`, belongs in Collection layer)

**Why:** The spec is a living reference document and currently gives incorrect constants that could mislead future development.

**Owner to implement:** Whoever picks up the next topology pass (Sebastian or K)
