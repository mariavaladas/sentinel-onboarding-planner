# Luv QA decision — connector ownership and RBAC metadata

- **Date:** 2026-05-22T16:20:26.073+02:00
- **Agent:** Luv
- **Scope:** `data/solutions.json` connector planning metadata

## Decision
Connector planning metadata should distinguish **platform deployment ownership** from **source-system ownership**, and AMA-based families must explicitly model the Azure roles needed for **DCR/agent deployment** (not just workspace access).

## Why
The QA review found repeated planning errors when a connector spans two control planes:
- source system / vendor admin work (for example AWS IAM, SaaS API credentials, WEC/WEF, device forwarding)
- Azure deployment work (for example AMA, DCR, Function App, Sentinel connector configuration)

A single `owner_recommended` value and simplified permissions block under-state that split for many connectors.

## Impact
- Sebastian can normalize connector families with more accurate role metadata.
- K can later surface primary + secondary owners instead of implying one team can finish every connector alone.
- Future QA should treat Arc, DCR, and source-platform admin prerequisites as first-class planning dependencies.
