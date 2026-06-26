# Decision: Add EPS to Linux/Syslog Sizing — Hide VM Count When Cribl Selected

**Date:** 2026-06-23T10:18:56+02:00
**By:** K (Frontend Dev)
**Requested by:** Maria (madesous)

---

## What

Added `eps` (Events Per Second) as a required field to the Linux/Syslog sizing drawer (`type: 'linux'`). EPS is now the **primary** sizing input for Linux connectors — it drives DCR throughput planning regardless of collection method.

When **Cribl is selected**, the server count and on-prem % fields are hidden (Cribl handles collection, so no AMA collector VMs are needed). EPS remains always visible and always required.

When **Cribl is not selected**, all three fields are shown: EPS, server count, and on-prem %.

---

## Changes

### `js/modules/capacity.js`

- **New constant:** `DEFAULT_LINUX_EPS = 5000` — default EPS for linux sizing drafts.
- **`createDefaultSizingDraft`:** Linux draft now includes `eps: DEFAULT_LINUX_EPS`.
- **`normalizeSizingValues`:** Linux normalization now includes `eps: sanitizeCount(values?.eps)`.
- **`validateSizingDraft`:** EPS always validated (whether or not Cribl is selected). Server count + on-prem % only validated when Cribl is NOT selected.
- **`computeSizingResult`:** Linux result now includes `eps`. Summary and reasoning are Cribl-aware:
  - Cribl selected: `"5,000 EPS · Cribl ingestion"` / `"5,000 EPS via Cribl — no AMA collector VMs required"`
  - Cribl not selected: `"50 Linux servers · 5,000 EPS · 80% on-prem"`
- **`getSizingDetailLines`:** Linux detail lines include EPS, Cribl-aware:
  - Cribl selected: shows EPS + "No AMA collector VMs needed"
  - Cribl not selected: shows scope, EPS, on-prem/Azure mix, estimated DCR load

### `js/modules/solutions.js`

- **Linux sizing drawer UI:** EPS input added above server count fields, spanning full grid width (`solution-sizing-field--wide`).
- **Server fields container:** Server count + on-prem % fields wrapped in `.solution-sizing-server-fields` div, hidden when Cribl is checked.
- **`collectDraft`:** Linux branch now includes `eps: fieldRefs.eps?.value`.
- **`writeDraftToFields`:** Linux branch now writes `eps` field on draft changes.
- **`applyCriblUiState`:** Separated Linux and Windows Cribl UI logic. For Linux: only `serverFieldsContainer.hidden` toggles (grid/messages/preview stay visible). For Windows: full grid hide behaviour unchanged.
- **`updateNoteText`:** Linux note is now Cribl-aware.
- **Intro text:** Updated to mention EPS for Linux.

### `css/style.css`

- **`.solution-sizing-server-fields`:** New class — `grid-column: 1 / -1`, 2-column inner grid — so the server + split fields inside the container maintain their side-by-side layout within the parent sizing grid.

---

## Why

EPS is critical for DCR throughput sizing on every Linux/Syslog connector. Previously, linux sizing only captured server count + on-prem %, which was sufficient for AMA VM planning but left DCR capacity unquantified. Adding EPS fills that gap.

The show/hide logic on server fields when Cribl is selected keeps the form clean — when Cribl handles collection, server count is irrelevant, but EPS still matters for Sentinel ingestion planning.

---

## Preserved Behaviours

- Firewall type EPS behaviour unchanged.
- Linux type server count validation unchanged when Cribl is NOT selected.
- `collectorVmZone` logic for firewalls unchanged.
- Topology DCR sizing that reads linux server data reads unchanged fields (`servers`, `onPremPercent`).
- Windows Cribl UI state (full grid hide) unchanged.
