# Decision: High-Value Non-Featured Task Rewrite — Batch A

**Date:** 2026-06-16T13:51:05+02:00
**Author:** Sebastian (Data Engineer)
**Requested by:** Maria (madesous)
**Status:** Implemented

---

## Context

After rewriting tasks for 11 featured solutions, the next tier is the 25 highest-impact non-featured solutions. These are major enterprise security products with significant customer penetration (cx=2–4) and rich existing content (analytics rules, workbooks, playbooks). Their Tier 3 batch-enriched tasks (4 generic tasks each, description = task text verbatim) are inadequate for products like Zscaler, BloodHound Enterprise, and Vectra XDR where onboarding complexity warrants product-specific guidance.

azure-firewall was on the original list but is already Tier 1 quality — skipped.

---

## Decision

Replace `planner.setup_tasks` for 24 high-value non-featured solutions with bespoke, product-specific tasks written directly as Python data structures in `scripts/patch_highvalue_tasks.py`.

---

## Implementation

**Script:** `scripts/patch_highvalue_tasks.py`  
**Data file modified:** `data/solutions.json`

### Solutions patched

| Group | Solution | Old Tasks | New Tasks | Key Tables / Product Mechanics |
|-------|----------|-----------|-----------|-------------------------------|
| 1st-party | microsoft-business-applications | 4 (generic) | 5 | PowerPlatformAdminActivity, 8 playbooks |
| 1st-party | microsoft-defender-for-endpoint | 4 (generic) | 5 | DeviceEvents, MDE API isolation |
| 3rd-party | blood-hound-enterprise | 4 (generic) | 6 | BloodHoundEnterprise_CL, AD collectors, 102 rules phased |
| 3rd-party | zscaler | 4 (generic) | 6 | ZscalerNSSLogs_CL, ZPAAppLogs_CL, NSS + API |
| 3rd-party | vectra-xdr | 4 (generic) | 5 | VectraAI_CL, 20 playbooks |
| 3rd-party | rubrik-security-cloud | 4 (generic) | 5 | Rubrik_CL, GraphQL API playbooks |
| 3rd-party | corelight | 4 (generic) | 4 | Corelight_CL, Zeek log types |
| 3rd-party | cisco-umbrella | 4 (generic) | 5 | Cisco_Umbrella_dns_CL, cisco_Umbrella_proxy_CL |
| 3rd-party | sap-btp | 4 (generic) | 4 | SAPAuditLog_CL, OAuth2 Audit Log Retrieval API |
| 3rd-party | palo-alto-prisma-cloud-2 | 4 (generic) | 5 | PrismaCloud_CL, CSPM alert status playbooks |
| 3rd-party | sentinelone | 4 (generic) | 4 | SentinelOne_CL, threat classification mapping |
| 3rd-party | cisco-secure-endpoint | 4 (generic) | 4 | CiscoSecureEndpoint_CL, regional AMP cloud |
| 3rd-party | cloudflare | 4 (generic) | 4 | Cloudflare_CL, Logpush to Azure Blob |
| 3rd-party | imperva-cloud-waf | 4 (generic) | 4 | ImpervaWAF_CL, attackType field |
| 3rd-party | google-cloud-platform-dns | 4 (generic) | 4 | GCP_DNSLogs_CL, Pub/Sub log sink |
| 3rd-party | google-workspace-reports | 4 (generic) | 4 | GWorkspaceActivityReports_CL, domain delegation |
| 3rd-party | tanium | 4 (generic) | 5 | Tanium_CL, Connect module, API playbooks |
| 3rd-party | theom | 4 (generic) | 4 | Theom_CL, data classification |
| content-only | falcon-friday | 4 (generic) | 4 | CrowdStrikeFalconEventStream, phased 30 rules |
| content-only | web-session-essentials | 4 (generic) | 4 | imWebSession() ASIM parser |
| content-only | endpoint-threat-protection-essentials | 4 (generic) | 3 | imProcessCreate() ASIM parser |
| content-only | censys | 4 (generic) | 4 | ASM API enrichment playbooks, no connector |
| content-only | global-secure-access | 4 (generic) | 4 | NetworkAccessTraffic, Entra GSA enable |
| content-only | microsoft-defender-threat-intelligence | 4 (generic) | 4 | ThreatIntelligenceIndicator, MDTI API |
| **TOTAL** | **24** | **96** | **106** | |

### Protected / skipped solutions (confirmed untouched)
- azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id (existing Tier 1)
- azure-firewall (already Tier 1 quality, explicitly skipped per brief)

---

## Key Design Choices

### 1. Phased analytics deployment for high-rule-count solutions
BloodHound Enterprise (102 rules) and Falcon Friday (30 rules) both use Phase 1 / Phase 2 analytics deployment tasks. Deploying all rules in a single task creates an unmanageable false positive storm in the first week. Phase 1 focuses on highest-severity, lowest-noise rules; Phase 2 adds the remainder after initial tuning.

### 2. NSS/log-streaming topology as a dedicated prerequisite task
Zscaler NSS (Nanolog Streaming Service) requires architectural decisions — which ZIA log feeds, which transport (Syslog/CEF vs. API), which collector VM — before any connector configuration begins. This is represented as a 2.0-day task assigned to Zscaler Admin, matching the real-world effort of NSS deployment and validation. Collapsing this into the connector task (as the generic template does) sets wrong expectations.

### 3. AD collector agents separate from BloodHound connector
The most common BloodHound Enterprise onboarding failure is attempting to configure the Sentinel connector before AD data collection is functioning. The 6-task arc makes this explicit: prereqs → AD collectors (SharpHound) → verify BHE portal data → connector → analytics phase 1 → analytics phase 2 → validate.

### 4. ASIM parser test as task acceptance criterion
Content-only ASIM domain solutions (web-session-essentials, endpoint-threat-protection-essentials) include the exact KQL parser call as their acceptance criterion: `imWebSession | take 10`, `imProcessCreate | take 10`. This makes the prerequisite task verifiable and executable rather than aspirational.

### 5. Owner role discipline for third-party products
Every solution assigns product-side prerequisites to the appropriate product admin role:
- BloodHound Admin (AD data collectors)
- Zscaler Admin (NSS topology, log streaming config)
- Vectra Admin (API token, sensor deployment verification)
- Rubrik Admin (RSC API credentials, audit log enablement)
- SentinelOne Admin, Cisco Secure Endpoint Admin, etc.

Azure Platform Admin is reserved for Azure/Entra-native setup tasks only. This models the correct multi-team onboarding reality for customers.

### 6. Table name specificity in every solution
Every solution references its actual Sentinel log table (e.g., `ZscalerNSSLogs_CL`, `BloodHoundEnterprise_CL`, `VectraAI_CL`, `GWorkspaceActivityReports_CL`) in at least one task description. Generic language like "custom log table" is avoided entirely.

---

## Validation

```
python scripts/patch_highvalue_tasks.py
→ 24 solutions patched, 106 tasks total
→ Protected: azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id, azure-firewall
→ JSON valid, 489 total solutions in file
```

Spot-check — Zscaler:
`[zscaler-prereqs (Zscaler Admin, 1.0d), zscaler-nss (Zscaler Admin, 2.0d), zscaler-connectors (SOC Engineer, 1.5d), zscaler-workbooks (SOC Engineer, 1.0d), zscaler-playbooks (SOC Engineer, 1.5d), zscaler-validate (SOC Analyst, 1.0d)]` — 6 tasks, 8.0d total. Correct.

Spot-check — BloodHound:
`[bhe-prereqs, bhe-collector, bhe-connector, bhe-analytics-phase1, bhe-analytics-phase2, bhe-validate]` — 6 tasks, phased analytics split at 50/52 rules. Correct.

---

## Impact

The 24 highest-value non-featured solutions in the planner now show accurate, actionable onboarding task descriptions. The 3 most complex third-party solutions (Zscaler, BloodHound Enterprise, Vectra XDR) have task arcs specifically designed around their unique onboarding requirements, replacing generic templates that would have misled SOC teams about the real effort and skill mix required.
