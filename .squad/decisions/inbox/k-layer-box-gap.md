# Decision: Layer Box Gap Increase — topology.js

**Date:** 2026-06-15  
**Author:** K (Frontend Dev)  
**Status:** Applied

## Problem

The "PIPELINE & TRANSFORMATIONS" layer box visually overlapped the "COLLECTION INFRASTRUCTURE" layer box in the top band of the topology diagram. Root cause: `LAYER_GAP = 20` in `createLayerBoxNodes` provided only 20 px between box borders — visually indistinguishable from overlap given 2 px dashed borders and labels.

## Changes Applied

| File | Line | Change | Reason |
|---|---|---|---|
| `js/modules/topology.js` | 1129 | `topIntermediaryOffsetY` 420 → **460** | Extra separation between source band bottom and first intermediary layer (server/DCR nodes) |
| `js/modules/topology.js` | 1837 | collectorVm Y offset `+80` → **`+120`** | Without this, collectorVm nodes protrude ABOVE the collection layer box when LAYER_GAP=45. `topIntermediaryOffsetY` does NOT control collectorVm positioning. |
| `js/modules/topology.js` | 2005 | Same collectorVm offset for syslog path | Same reason as above |
| `js/modules/topology.js` | 2338 | `LAYER_GAP` 20 → **45** | Primary fix — enforces 45 px minimum between layer box borders |

## Why collectorVm needed its own fix

`topIntermediaryOffsetY` controls node Y via `getTopLayerY(layerIndex) = bandBottomY + topIntermediaryOffsetY + ...`. CollectorVm nodes bypass this formula and use a hardcoded `bandBottomY + 80`. With `LAYER_GAP=45` and sources box bottom at `bandBottomY + ~55`, the collection box top gets pushed to `bandBottomY + 100`, which is above the `+80` collectorVm position. Increasing the offset to `+120` gives 20 px padding inside the box.

## Known Limitation

In `server + DCR` layouts, `LAYER_GAP=45` exceeds the structural maximum (`intermediaryLayerGapY=200 < server_height(120) + 3×45 = 255`), causing ~10 px visual protrusion of DCR nodes above the transformation box. If this is reported, the fix is to raise `intermediaryLayerGapY` from 200 to at least 256 (line 1130). No functional impact — these are decorative boxes (`zIndex: -2`, `pointerEvents: none`).

## Rule reinforced

Do NOT fix layer overlap by shrinking box heights (FAILURE 5). The fix direction is always to ADD SPACE between nodes or increase gap constants.
