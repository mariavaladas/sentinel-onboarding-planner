# Topology QA Report — Layer Box Positioning Audit

**Author:** Luv (Tester/QA)
**Date:** 2026-06-10T14:30:17.276+02:00
**File audited:** `js/modules/topology.js`
**Spec reference:** `docs/topology-spec.md`

---

## Executive Summary

| Area | Status | Severity |
|------|--------|----------|
| A — Node Position Conflicts | ⚠️ PARTIAL FAIL | HIGH: 1 overlap (bottom band), 1 classification mismatch |
| B — Layer Box Computation | ❌ FAIL | HIGH: transformation-bottom box cannot contain its DCR nodes |
| C — Spacing Constants | ⚠️ PARTIAL FAIL | MEDIUM: 1 wrong formula, 1 spec divergence |
| D — Classification Correctness | ❌ FAIL | HIGH: Cribl and pathBox in wrong layers |

---

## Area A — Node Position Conflicts

### A1: Top-band CollectorVm vs DCR — ✅ PASS

Maria's concern was based on `topIntermediaryOffsetY = 160`. The **actual value in code is 280** (line 1033).

**Math:**
```
bandBottomY          ← bottom edge of top sources zone (e.g. startY + 36 + 220 + 36 = startY + 292)

collectorVm.y        = bandBottomY + 80        (line 1795)
collectorVm.height   = 120px                   (getNodeHeight: case 'collectorVm')
collectorVm.bottom   = bandBottomY + 200

getTopLayerY(1)      = bandBottomY + topIntermediaryOffsetY + (1-1)*intermediaryLayerGapY
                     = bandBottomY + 280

GAP = 280 - 200 = 80px  ✓  No overlap.
```

**Verdict:** The `topIntermediaryOffsetY = 280` value was evidently increased to fix this overlap. The fix is in place. Maria's concern is **no longer valid** for top-band. PASS.

---

### A2: Cribl vs Sentinel Y — ✅ REPOSITIONED, BUT MISCLASSIFIED

**Math (with 1 top DCR layer as the common case):**
```
provisionalTopChainBottomY = bandBottomY + 280 + 0 + 120 = bandBottomY + 400
sentinelY                  = bandBottomY + 400 + 160     = bandBottomY + 560

cribl.y                    = bandBottomY + 80             (line 1655)
cribl.height               = sentinelNodeHeight = 132px
cribl.bottom               = bandBottomY + 212

Distance: sentinelY - cribl.bottom = (bandBottomY + 560) - (bandBottomY + 212) = 348px  ✓
```

Cribl is **not** at Sentinel Y-level — separation is 348px. Issue 3 (Cribl "next to Sentinel") is resolved for the Y position. However, this repositioning exposed a different bug covered in Area D.

---

### A3: Bottom-band CollectorVm vs DCR — ❌ FAIL — 20px OVERLAP

**Math:**
```
getBottomLayerY(1)  = sentinelY + sentinelNodeHeight + bottomSentinelGapY + (1-1)*intermediaryLayerGapY
                    = sentinelY + 132 + 160 + 0
                    = sentinelY + 292

collectorVm.y (bottom band)   = getBottomLayerY(1) - intermediaryLayerGapY * 0.5   (line 1794)
                              = (sentinelY + 292) - 100
                              = sentinelY + 192

collectorVm.height = 120px
collectorVm.bottom = sentinelY + 312

DCR layer 1 starts at:   sentinelY + 292
CollectorVm ends at:     sentinelY + 312

OVERLAP = 312 - 292 = 20px  ✗
```

**Root cause:** The formula `getBottomLayerY(1) - intermediaryLayerGapY * 0.5` was intended to place the collectorVm "halfway between Sentinel and DCR" (i.e., ABOVE the DCR, closer to Sentinel). But in the bottom band, the flow goes `Source → CollectorVm → DCR → Sentinel`. The collectorVm must sit **between sources and DCR** (i.e., BELOW the DCR in canvas coordinates, at a larger Y). The formula places it above the DCR (smaller Y) — exactly backwards.

**Visual consequence:** CollectorVm appears between Sentinel and DCR, causing a non-monotonic edge routing (Source goes up, then back down to DCR, then up to Sentinel), and a 20px physical node overlap.

---

### A4: Workspace Isolation — ✅ PASS

**Math:**
```
sentinel.y      = bandBottomY + 560   (1 top DCR layer example)
sentinelMidY    = bandBottomY + 626

No non-sentinel nodes are positioned within [sentinelY, sentinelY + sentinelNodeHeight].
Cribl is at bandBottomY + 80 — 480px above sentinelY. ✓
```

Issue 4 (workspace not isolated) is **resolved**. The sentinel layer box correctly contains only the Sentinel node.

---

## Area B — Layer Box Computation

### B1: Two-pass bounds algorithm — ✅ PASS

The algorithm is structurally correct: Pass 1 computes raw bounds per layer, Pass 2 enforces sequential gap constraints. The logic at lines 2073–2146 is sound.

### B2: Top-band sequential stacking — ❌ FAIL (Cribl containment)

**Math with concrete values** (using `startY = 30`, `bandBottomY = 322`):

```
cribl.y  = 322 + 80  = 402    (height 132, bottom = 534)
dcr.y    = 322 + 280 = 602    (height 100, bottom = 702)

--- Pass 1: layer raw bounds ---
sources:        minY=66,  maxY=286       (source zone y + height)
collection:     minY=402, maxY=522       (collectorVm at 402, bottom 522)
transformation: minY=402, maxY=702       (cribl at 402 is the minY!)

--- Pass 2: sources box ---
boxTop    = 66 - 35  = 31
boxBottom = 286 + 45 = 331

--- Pass 2: collection box ---
prevBottom = sources boxBottom = 331
boxTop    = max(402 - 35, 331 + 12) = max(367, 343) = 367
boxBottom = max(522 + 45, 367 + 80) = max(567, 447) = 567

--- Pass 2: transformation box ---
prevBottom = collection boxBottom = 567
RAW boxTop = 402 - 35 = 367
GAP-ENFORCED boxTop = max(367, 567 + 12) = 579

Cribl.y = 402   ←  ABOVE transformation boxTop = 579  by 177px  ✗

boxBottom = max(702 + 45, 579 + 80) = max(747, 659) = 747
Transformation box: [579, 747]   — Cribl at [402, 534] is ENTIRELY OUTSIDE this box.
```

**Root cause:** Cribl is classified in the `transformation` layer (line 1991: `types: new Set(['dcr', 'cribl', 'pathBox'])`), but rendered at `bandBottomY + 80` — the same Y as the collection-layer collectorVm. Gap enforcement correctly pushes the transformation box below collection, but then Cribl's physical position is 177px above the box it was classified into. The box cannot contain Cribl.

### B3: Bottom-band sequential stacking — ❌ FAIL (DCR outside box)

**Math** (continuing with `sentinelY = 882`):

```
--- Bottom band actual node positions ---
bottom DCR:         y = sentinelY + 292 = 1174   (bottom = 1274)
bottom collectorVm: y = sentinelY + 192 = 1074   (bottom = 1194)  ← BUG A3
bottom sources:     y = sentinelY + 552 = 1434   (bottom ≈ 1654)

--- Pass 1 bounds ---
transformation-bottom: minY=1174, maxY=1274
collection-bottom:     minY=1074, maxY=1194
sources-bottom:        minY=1434, maxY=1654

--- Pass 2: sources-bottom box (anchor) ---
boxTop    = 1434 - 35 = 1399
boxBottom = 1654 + 45 = 1699

--- Pass 2: collection-bottom box ---
prevTopEdge = sources_boxTop = 1399
boxBottom = min(1194 + 45, 1399 - 12) = min(1239, 1387) = 1239
boxTop    = min(1074 - 35, 1239 - 80) = min(1039, 1159) = 1039

--- Pass 2: transformation-bottom box ---
prevTopEdge = collection_boxTop = 1039
boxBottom = min(1274 + 45, 1039 - 12) = min(1319, 1027) = 1027
boxTop    = min(1174 - 35, 1027 - 80) = min(1139, 947) = 947

transformation-bottom box: [947, 1027] — an 80px strip
Actual DCR at: [1174, 1274]  — ENTIRELY BELOW the box, 147px gap  ✗
```

**Root cause:** Because the collectorVm is misplaced above the DCR (BUG A3), the collection-bottom layer box extends from Y=1039 to Y=1239 — encompassing the region where the DCR actually lives. Then the transformation-bottom box is forced above collection-bottom, making it an 80px minimum-height stub at [947, 1027] while the DCR it should contain sits at [1174, 1274]. The DCR is 147px below its own layer box.

### B4: Workspace gap enforcement — ✅ PASS

```
topTransBottom  = transformation boxBottom = 747
workspace boxTop = max(sentinelY - 35, 747 + 12) = max(847, 759) = 847
sentinel occupies [882, 1014], fully inside [847, ...] ✓
```

---

## Area C — Spacing Constants

### C1: `topIntermediaryOffsetY = 280` — ✅ PASS (but spec says 72)

The 280 value gives adequate collectorVm→DCR separation (80px gap). The spec at line 72 says 72, which would cause a 40px overlap (`collectorVm ends at bandBottomY+200`, DCR would start at `bandBottomY+152`). The code value (280) is better than the spec value. **Spec is outdated.**

### C2: `intermediaryLayerGapY = 200` — ✅ PASS (spec says 152)

200px between DCR layers is generous and correct. Spec is outdated.

### C3: `topSentinelGapY = 160` — ✅ PASS (spec says 96)

### C4: `bottomSentinelGapY = 160` — ✅ PASS

### C5: `bottomSourceGapY = 140` — ⚠️ INSUFFICIENT for collectorVm

**Math:**
```
Available space between last DCR bottom and sources top:
    = bottomSourceGapY = 140px

Required for collectorVm with gaps:
    collectorVm height      = 120px
    gap below DCR (min 12)  =  12px
    gap above sources (min 12) = 12px
    TOTAL MINIMUM            = 144px

140 < 144  ✗  CollectorVm cannot fit without overlapping.
```

**Verdict:** `bottomSourceGapY = 140` is 4px too small to cleanly accommodate a collectorVm between the last bottom DCR and the bottom sources zone. In practice, with a comfortable gap, 220–240px would be needed. This is a contributing factor to the bottom-band placement bug.

### C6: Bottom collectorVm formula `getBottomLayerY(1) - intermediaryLayerGapY * 0.5` — ❌ WRONG DIRECTION

As proved in A3: this places collectorVm 100px *above* DCR (towards Sentinel) instead of *below* DCR (towards sources). The formula must be changed.

---

## Area D — Classification Correctness

### D1: DCR nodes in transformation — ✅ PASS

`transformation` types include `'dcr'`. All DCR nodes (type: `'dcr'`) are correct here.

### D2: `pathBox` in transformation — ❌ FAIL (spec violation)

**Current code (line 1991):**
```javascript
{ name: 'transformation', types: new Set(['dcr', 'cribl', 'pathBox']), ... }
{ name: 'transformation-bottom', types: new Set(['dcr', 'cribl', 'pathBox']), ... }
```

**Problem:** `pathBox` nodes include:
- `azure_native` → "Diagnostic Settings" — no DCR, routes directly to Sentinel
- `direct` → "Native Connector" (M365/Defender) — no DCR, routes directly to Sentinel
- `api` → "CCP / API Connector" — HAS a DCR, but the pathBox itself is a collection step
- `event_hub` → "Event Hub" + "Ingestion Pipeline" — HAS a DCR, but Event Hub is a collection step
- `logic_app` → "Logic App" + "Data Collector API" — HAS a DCR, but both pathBoxes are collection steps

**Per spec (§2, §4):** "Collection Layer: CCP/API Connectors, Event Hub, Logic Apps." All `pathBox` nodes are collection-layer intermediaries. The DCR that follows them is the transformation step. No `pathBox` belongs in transformation.

The "Native Connector" (`direct` type, no DCR) is especially wrong here — it directly connects to Sentinel with no transformation step and placing it in `transformation` is incorrect.

### D3: `cribl` in transformation — ❌ FAIL (spec violation)

**Current code (line 1991):** `transformation` includes `'cribl'`.

**Per spec (§2, key insight box):** "Cribl lives in the Collection Layer alongside collector VMs — it is a transport/collection mechanism, NOT a source or standalone connector."

Cribl must be in `collection` (top band) and `collection-bottom` (bottom band).

### D4: `collectorVm` in collection — ✅ PASS

`collection` types include `'collectorVm'`. Correct.

### D5: `server` in collection — ✅ PASS (conditional)

`collection` types include `'server'`. Correct when server nodes exist.
Note: `server`-type nodes are only created when `usesSharedDcr` is false AND `pathType === 'server'`. In current code with all three server-path types (`syslog_cef`, `linux_server`, `windows_events`) using `usesSharedDcr`, server nodes are only created as a fallback when a shared plan has no DCRs. Classification is correct when they appear.

---

## Root Cause Hierarchy

```
PRIMARY CAUSE
  └─ BUG-D3/D1: layerConfigs misclassifies 'cribl' and 'pathBox' into transformation
       ├─ EFFECT: transformation layer's minY = bandBottomY+80 (Cribl Y) instead of bandBottomY+280 (DCR Y)
       ├─ EFFECT: gap enforcement pushes transformation box START to bandBottomY+579
       └─ EFFECT: Cribl at bandBottomY+402 is 177px above its own layer box → BUG B2

INDEPENDENT CAUSE
  └─ BUG-C6/A3: bottom collectorVm Y formula uses wrong direction (above DCR instead of below)
       ├─ EFFECT: physical 20px overlap between collectorVm and DCR in bottom band → BUG A3
       ├─ EFFECT: collection-bottom box consumes the Y range where DCR actually lives
       ├─ EFFECT: transformation-bottom box is forced into an 80px stub [947,1027]
       └─ EFFECT: actual DCR [1174,1274] is 147px below transformation-bottom box → BUG B3

CONTRIBUTING CAUSE
  └─ bottomSourceGapY = 140 (4px too tight to safely fit collectorVm+gaps)
       └─ EFFECT: even with correct formula, bottom-band placement is very cramped
```

---

## Recommended Fixes — Priority Order

### FIX 1 — HIGHEST PRIORITY: Reclassify Cribl and pathBox in `layerConfigs` (1 code change)

**What:** Move `'cribl'` and `'pathBox'` from transformation to collection in both bands.

**Code change in `createLayerBoxNodes()` (lines 1989–1995):**

```javascript
// BEFORE
{ name: 'collection',            ..., types: new Set(['server', 'collectorVm']),          band: 'top' },
{ name: 'transformation',        ..., types: new Set(['dcr', 'cribl', 'pathBox']),          band: 'top' },
{ name: 'transformation-bottom', ..., types: new Set(['dcr', 'cribl', 'pathBox']),          band: 'bottom' },
{ name: 'collection-bottom',     ..., types: new Set(['server', 'collectorVm']),          band: 'bottom' },

// AFTER
{ name: 'collection',            ..., types: new Set(['server', 'collectorVm', 'cribl', 'pathBox']), band: 'top' },
{ name: 'transformation',        ..., types: new Set(['dcr']),                              band: 'top' },
{ name: 'transformation-bottom', ..., types: new Set(['dcr']),                              band: 'bottom' },
{ name: 'collection-bottom',     ..., types: new Set(['server', 'collectorVm', 'cribl', 'pathBox']), band: 'bottom' },
```

**Why this resolves the most issues:**
- Transformation box `minY` becomes DCR Y (`bandBottomY + 280`) instead of Cribl Y (`bandBottomY + 80`) → transformation box can now correctly start at `bandBottomY + 245` and contain DCRs ✓
- Cribl joins collection: collection `minY = bandBottomY + 80` (Cribl/collectorVm same Y) → collection box contains both Cribl and collectorVm ✓
- pathBox intermediaries (Native Connector, Diagnostic Settings, Logic App, API Connector) move to collection where they spec-belong ✓
- Resolves: BUG-B2, BUG-D3, BUG-D2, plus spec compliance

**Post-fix transformation box calculation:**
```
transformation minY = DCR Y = bandBottomY + 280   (no Cribl any more)
prevBottom = collection boxBottom ≈ bandBottomY + 212 + 45 = bandBottomY + 257  (Cribl/collectorVm bottom + pad)
boxTop = max(280 - 35, 257 + 12) = max(245, 269) = 269  ← 11px above DCR at 280 ✓
boxBottom = max(280 + 100 + 45, 269 + 80) = max(425, 349) = 425 ✓
Transformation spans [bandBottomY + 269, bandBottomY + 425] — fully contains DCR at [280, 380] ✓
```

---

### FIX 2 — HIGH PRIORITY: Fix bottom-band collectorVm Y formula (line 1794)

**Current code (line 1794):**
```javascript
y: sourceBand === 'bottom'
    ? getBottomLayerY(1) - intermediaryLayerGapY * 0.5   // ← WRONG: puts collectorVm ABOVE DCR
    : topBandLayout.bandBottomY + 80
```

**Fix:**
```javascript
y: sourceBand === 'bottom'
    ? getBottomLayerY(bottomDcrLayerIndex || 1) + intermediaryNodeHeight + 60   // between DCR and sources
    : topBandLayout.bandBottomY + 80
```

**Why:** The formula `getBottomLayerY(1) - 100` places collectorVm at `sentinelY + 192` (above DCR at `sentinelY + 292`). In the bottom band, sources are at LARGE Y and Sentinel is at SMALL Y, so collectorVm must be at a LARGER Y than DCR (between DCR and sources). `getBottomLayerY(1) + 120 + 60 = sentinelY + 472` places it correctly.

**Post-fix position check (example, 1 bottom DCR layer):**
```
DCR:         sentinelY + 292  (bottom = sentinelY + 392)
CollectorVm: sentinelY + 472  (bottom = sentinelY + 592)
Sources:     sentinelY + 552  ← WAIT: overlap with collectorVm [472, 592]!
```

This requires FIX 2b: increase `bottomSourceGapY` so sources are pushed further down.

---

### FIX 2b — HIGH PRIORITY: Increase `bottomSourceGapY` (line 1037)

**Current:** `const bottomSourceGapY = 140;`

**Fix:** `const bottomSourceGapY = 260;`

**Why:** With the collectorVm now placed at `DCR_bottom + 60 = sentinelY + 452`, it needs 120px height, ending at `sentinelY + 572`. Sources must start below that. 
```
New provisionalBottomSourceY = sentinelY + 132 + 160 + 0 + 120 + 260 = sentinelY + 672
Sources zone Y               = sentinelY + 672 - 36 + 36 = sentinelY + 672
CollectorVm bottom = sentinelY + 592. Gap to sources = 80px ✓ (mirrors top-band's 80px gap)
```

---

### FIX 3 — MEDIUM PRIORITY: Update topology-spec.md to reflect actual constants

These constants in the spec are outdated:

| Constant | Spec says | Code has |
|----------|-----------|----------|
| `topIntermediaryOffsetY` | 72 | **280** |
| `intermediaryLayerGapY` | 152 | **200** |
| `topSentinelGapY` | 96 | **160** |
| `bottomSentinelGapY` | 120 | **160** |

Also update the spec's §11 note on Cribl ("pending refactor") to reflect that Cribl is now at `bandBottomY + 80` and must be classified in Collection layer.

---

## Fix Impact Matrix

| Fix | Resolves | Validates Maria's Issues |
|-----|----------|--------------------------|
| Fix 1 (reclassify layerConfigs) | BUG-B2, BUG-D2, BUG-D3 | Issue 1 (transformation box thin), Issue 2 (boxes overlapping top) |
| Fix 2 + 2b (bottom collectorVm Y + gap) | BUG-A3, BUG-B3, BUG-C6 | Issue 2 (boxes overlapping bottom), bottom-band visual correctness |
| Fix 3 (spec update) | Spec drift | Documentation accuracy |

**Priority ordering for maximum impact with minimum code:**
1. **Fix 1** — single array change, fixes top-band transformation box, spec compliance (3 of 4 issues)
2. **Fix 2 + 2b** — two constant changes, fixes bottom-band completely (independent of Fix 1)
3. **Fix 3** — documentation only, zero runtime impact

---

## Validation Checklist (for K to use after implementing fixes)

- [ ] Cribl node (`bandBottomY + 80`) is visually inside the COLLECTION box, not floating above TRANSFORMATION
- [ ] TRANSFORMATION box (top) spans from ~`bandBottomY + 269` to ~`bandBottomY + 425` and contains all DCR nodes
- [ ] TRANSFORMATION box height > 100px (not paper-thin)
- [ ] Bottom-band collectorVm is at a Y **larger** than bottom DCR Y (further from Sentinel, closer to sources)
- [ ] No physical overlap between bottom collectorVm and bottom DCR nodes
- [ ] TRANSFORMATION-BOTTOM box top edge is above (smaller Y than) the actual bottom DCR Y
- [ ] Workspace box fully contains Sentinel and nothing else
- [ ] All LAYER_GAP (12px) rules between adjacent boxes are satisfied
- [ ] "Native Connector" (direct/azure_native pathBox) appears inside COLLECTION, not TRANSFORMATION
