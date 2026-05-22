### 2026-05-22T16:29:31Z: Feature scope — Firewall connectors with EPS-based VM sizing
**By:** madesous (via Copilot)
**What:** Firewall connectors (Palo Alto, Fortinet, Check Point, etc.) should be added as solutions. Two categories:
1. **VM-based (CEF/Syslog)** — require a log forwarder VM. For these, the wizard asks the user how many EPS (events per second) they expect, then suggests a number of VMs based on documented maximum EPS for CEF and Syslog AMA collectors.
2. **Cloud API connectors** — some firewalls have direct API-to-cloud ingestion (no VM needed).
Requires thorough research into Microsoft's documented EPS limits per VM size for CEF/Syslog data collection.
**Why:** Realistic infrastructure planning — VM sizing is the #1 question SOC teams have for firewall log ingestion. Automating this makes the planner highly valuable.
