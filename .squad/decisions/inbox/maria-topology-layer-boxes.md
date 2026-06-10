### 2026-06-10T12:17: Topology Layer Boxes
**By:** Maria (via Copilot)
**What:** Each logical layer in the topology should have its own uber box:
1. **Sources** (top) — data-generating devices (firewalls, servers, SaaS)
2. **Collection Layer** — intermediaries that receive/aggregate data (Cribl, collector VMs, Linux forwarders)
3. **Transformation Layer** — DCRs/DCEs that define transformation and routing rules
4. **Workspace** (bottom) — Microsoft Sentinel

This means Cribl and collector VMs share the Collection Layer box. DCRs get their own Transformation Layer box. Every component must belong to exactly one layer box — no floating/orphaned nodes.
**Why:** Structural clarity — every node has a named home, reinforces the strict vertical hierarchy.
