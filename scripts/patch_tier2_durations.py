"""
patch_tier2_durations.py
Sebastian – Data Engineer
2026-06-16

Enriches Tier 2 solutions (41 connectors) with full planner.setup_tasks metadata.
- 38 four-task solutions: adds id, category, phase, owner_role, depends_on,
  description, and duration derived from effort_hours.
- 3 infrastructure solutions (windows-firewall-via-ama, windows-forwarded-events-via-ama,
  sysmon-via-ama): already have ids/phases — adds only duration.
- Does NOT touch the 9 Tier 1 solutions that already have duration data.
"""

import json, copy

SOLUTIONS_PATH = "data/solutions.json"

# ---------------------------------------------------------------------------
# Duration derivation rule
# ---------------------------------------------------------------------------
def derive_duration(effort_hours):
    if effort_hours <= 1.5:
        return 0.5
    elif effort_hours <= 3:
        return 1.0
    elif effort_hours <= 5:
        return 1.5
    elif effort_hours <= 8:
        return 2.0
    else:
        return 3.0

# ---------------------------------------------------------------------------
# Standard phase/category/owner table
# ---------------------------------------------------------------------------
def phase_meta(order, connector_type):
    """
    connector_type: 'm365' or 'azure'
    Returns (category, phase, owner_role, skill_level)
    """
    if order == 1:
        owner = "Identity / RBAC Admin" if connector_type == "m365" else "Azure Platform Admin"
        return ("setup", "Prerequisites", owner, "beginner")
    elif order == 2:
        return ("setup", "Configuration", "Azure Platform Admin", "beginner")
    elif order == 3:
        return ("phase-1", "Operationalization", "SOC Engineer", "intermediate")
    else:  # order == 4
        return ("phase-2", "Validation", "SOC Analyst", "intermediate")


# ---------------------------------------------------------------------------
# Per-solution enrichment catalog
# Keys: abbrev, type ('m365' | 'azure'), descs (list of 4 descriptions)
# ---------------------------------------------------------------------------
CATALOG = {

    # ── M365 Security ──────────────────────────────────────────────────────

    "defender-for-cloud": {
        "abbrev": "dfc",
        "type": "m365",
        "descs": [
            "Confirm the target Azure subscriptions have Defender for Cloud enabled at the Standard/P2 tier, verify Sentinel workspace permissions (Microsoft Sentinel Contributor), and ensure Security Reader is assigned for the connector account.",
            "Enable the Microsoft Defender for Cloud data connector in Sentinel, select all target subscriptions for bi-directional alert sync, and confirm SecurityAlert and SecurityRecommendation tables begin populating.",
            "Enable Defender for Cloud analytics rules targeting SecurityAlert and SecurityRecommendation tables, deploy the Defender for Cloud workbook for subscription-level posture visibility, and activate playbooks for automated response.",
            "Query SecurityAlert and SecurityRecommendation in Log Analytics for recent Defender findings, verify caller-identity and resource fields are populated, and fire at least one enabled analytics rule end-to-end to confirm incident creation.",
        ],
    },

    "defender-for-cloud-apps": {
        "abbrev": "dfca",
        "type": "m365",
        "descs": [
            "Verify the tenant holds a Microsoft Defender for Cloud Apps license, confirm an account with Global Admin or Security Admin is available for connector consent, and validate Sentinel workspace connectivity.",
            "Enable the Microsoft Defender for Cloud Apps connector in Sentinel, configure alert streaming and activity log forwarding, and verify CloudAppEvents and SecurityAlert tables start receiving data.",
            "Deploy MDCA analytics rules covering shadow-IT discovery, OAuth app anomalies, and impossible travel; enable the Cloud Apps workbook for SaaS activity visibility.",
            "Query CloudAppEvents and SecurityAlert for MDCA-sourced events, verify user and app fields are populated, and confirm at least one analytics rule fires correctly on available test data.",
        ],
    },

    "microsoft-defender-for-endpoint": {
        "abbrev": "mde",
        "type": "m365",
        "descs": [
            "Confirm enrolled devices have the Defender for Endpoint sensor active and the M365 Defender tenant holds MDE P2 licensing, and verify the operator holds Security Admin in the M365 Defender portal.",
            "Enable the Microsoft Defender for Endpoint connector in Sentinel, configure alert and incident streaming from M365 Defender, and verify DeviceAlertEvents and SecurityAlert tables populate in the workspace.",
            "Enable MDE analytics rules for lateral movement, process injection, and credential theft; deploy the MDE device telemetry workbook; and review automated device-isolation playbooks.",
            "Query DeviceAlertEvents and DeviceProcessEvents in Sentinel, verify endpoint telemetry from enrolled devices shows correct device and user context, and confirm an alert-to-incident pipeline test succeeds.",
        ],
    },

    "microsoft-defender-for-identity": {
        "abbrev": "mdi",
        "type": "m365",
        "descs": [
            "Confirm domain controllers have the MDI sensor installed and the MDI workspace is associated with the correct tenant; verify Security Admin or Global Admin access and Sentinel workspace permissions.",
            "Enable the Microsoft Defender for Identity connector in Sentinel to stream identity-based alerts and audit events; verify IdentityInfo, IdentityLogonEvents, and SecurityAlert tables are receiving data.",
            "Deploy MDI analytics rules for lateral movement, DCSync attacks, and Kerberoasting patterns; enable the MDI workbook for identity-layer attack-path visualization.",
            "Query IdentityLogonEvents and SecurityAlert for MDI-sourced detections, verify domain controller and user entity fields are populated, and test that a simulated reconnaissance event generates a Sentinel incident.",
        ],
    },

    "defender-for-office-365": {
        "abbrev": "dfo",
        "type": "m365",
        "descs": [
            "Confirm the tenant has Microsoft Defender for Office 365 Plan 1 or Plan 2 licensing, verify the operator holds Security Admin in the Microsoft 365 Security portal, and confirm Sentinel workspace connectivity.",
            "Enable the Defender for Office 365 connector in Sentinel to stream EmailEvents, EmailAttachmentInfo, EmailUrlInfo, and SecurityAlert tables from M365 Defender.",
            "Enable DFO analytics rules for phishing, malicious-attachment, and BEC patterns; deploy the email threat workbook; and configure playbooks for automated email investigation.",
            "Query EmailEvents and EmailAttachmentInfo in Sentinel to verify recent email telemetry, confirm sender and recipient fields are populated, and test an analytics rule against known-bad email indicators.",
        ],
    },

    "microsoft-defender-threat-intelligence": {
        "abbrev": "mdti",
        "type": "m365",
        "descs": [
            "Verify the tenant has a Defender Threat Intelligence license or premium TI access, confirm the operator holds Security Admin or Global Admin, and validate the ThreatIntelligenceIndicator table is enabled in the Sentinel workspace.",
            "Enable the Microsoft Defender Threat Intelligence connector in Sentinel, configure TI indicator ingestion feeding ThreatIntelligenceIndicator, and confirm indicators begin populating within the expected sync interval.",
            "Deploy TI-matching analytics rules for IP, domain, and URL indicators; enable threat intelligence workbooks for IOC coverage overview; and integrate TI with watchlist-based detection patterns.",
            "Query ThreatIntelligenceIndicator and verify active indicators are present with confidence scores and expiry dates; cross-reference against recent network events to confirm TI-matching rules are triggering correctly.",
        ],
    },

    "global-secure-access": {
        "abbrev": "gsa",
        "type": "m365",
        "descs": [
            "Confirm the tenant has Microsoft Entra Internet Access or Private Access licensing, verify Global Administrator or Security Administrator access, and confirm the Sentinel workspace is ready to receive Global Secure Access logs.",
            "Enable the Global Secure Access data connector in Sentinel, configure traffic log streaming for Microsoft traffic and private-access profiles, and verify the NetworkAccessTraffic table begins ingesting.",
            "Deploy GSA analytics rules for unusual access patterns and policy-bypass attempts, and enable the Global Secure Access workbook for per-user and per-destination traffic visibility.",
            "Query NetworkAccessTraffic in Sentinel and verify user, destination, and policy-decision fields are populated; confirm an analytics rule targeting suspicious traffic patterns returns expected results.",
        ],
    },

    "microsoft-entra-id-assets": {
        "abbrev": "eia",
        "type": "m365",
        "descs": [
            "Confirm Microsoft Entra ID P1 or P2 licensing, verify the operator holds Global Admin or Security Admin for connector configuration, and ensure the Sentinel workspace has appropriate RBAC for identity log ingestion.",
            "Enable the Microsoft Entra ID Assets connector in Sentinel to stream AuditLogs, SigninLogs, and asset-related identity events; confirm the expected tables start populating.",
            "Deploy Entra ID analytics rules for asset-change anomalies, privileged account modifications, and app-registration events; enable the Entra ID workbook for asset inventory and access visualization.",
            "Query AuditLogs and SigninLogs in Sentinel to verify user and resource fields are correct, and test that a simulated Entra change event triggers the appropriate analytics rule.",
        ],
    },

    "microsoft-entra-id-protection": {
        "abbrev": "eip",
        "type": "m365",
        "descs": [
            "Confirm Microsoft Entra ID P2 licensing is active for users in scope, verify the operator holds Security Admin or Global Admin, and confirm the Sentinel workspace is connected and healthy.",
            "Enable the Microsoft Entra ID Protection connector in Sentinel to stream AADRiskyUsers, AADUserRiskEvents, and SigninLogs risk-signal tables into the workspace.",
            "Deploy Entra ID Protection analytics rules for high-risk sign-ins and user risk elevations, and enable the Identity Protection workbook for risk trends and remediation status tracking.",
            "Query AADUserRiskEvents and AADRiskyUsers in Sentinel, verify risk level, detection type, and user fields are populated, and confirm a risk event triggers the configured analytics rule.",
        ],
    },

    "agent-365": {
        "abbrev": "a365",
        "type": "m365",
        "descs": [
            "Verify the Microsoft 365 tenant has the required licenses for Agent 365 integration, confirm the operator holds M365 Security Admin or Global Admin, and ensure the Sentinel workspace is configured for M365 data ingestion.",
            "Enable the Agent 365 connector in Sentinel, configure the data-collection scope for M365 activity and agent events, and verify the relevant log tables begin populating.",
            "Deploy analytics rules and workbooks packaged with the Agent 365 solution, and configure playbooks for automated response to detected threats across M365 workloads.",
            "Query Agent 365 log tables in Sentinel to verify event data is ingesting correctly, confirm entity fields (user, resource, action) are populated, and test at least one analytics rule end-to-end.",
        ],
    },

    "microsoft-365-assets": {
        "abbrev": "m365a",
        "type": "m365",
        "descs": [
            "Confirm Microsoft 365 E3 or E5 licensing is in place, verify the operator holds Security Admin or Global Admin, and ensure the Sentinel workspace has the M365 connector prerequisites satisfied.",
            "Enable the Microsoft 365 Assets connector in Sentinel, configure data collection for the M365 asset event tables, and verify Office365 and related asset tables are receiving data.",
            "Enable analytics rules targeting M365 asset-related anomalies (file sharing, DLP events, app access); deploy the M365 Assets workbook; and review associated playbooks.",
            "Query Office365 and M365 asset tables in Sentinel to confirm data is ingesting, verify user and resource fields are populated, and confirm at least one analytics rule runs successfully.",
        ],
    },

    "microsoft-copilot": {
        "abbrev": "mcop",
        "type": "m365",
        "descs": [
            "Verify Microsoft Copilot for Microsoft 365 licensing is enabled, confirm the operator holds Security Admin or Global Admin for audit log access, and ensure the Sentinel workspace is ready for M365 audit log ingestion.",
            "Enable the Microsoft Copilot connector in Sentinel, configure Microsoft 365 audit log streaming for Copilot events, and verify Copilot interaction and activity events appear in the relevant tables.",
            "Deploy analytics rules for Copilot usage anomalies and sensitive-data exposure patterns, and enable the Microsoft Copilot workbook for usage and risk visualization.",
            "Query Microsoft Copilot activity tables in Sentinel and verify user-interaction, prompt, and response-metadata fields are populated; confirm an analytics rule targeting sensitive-data Copilot queries fires correctly.",
        ],
    },

    "microsoft-exchange-security-exchange-on-premises": {
        "abbrev": "exop",
        "type": "m365",
        "descs": [
            "Confirm the on-premises Exchange environment is Exchange 2016 or later, verify the AMA agent is installed on Exchange servers and the operator has rights to configure log collection.",
            "Enable the Microsoft Exchange Security (on-premises) connector in Sentinel, configure AMA-based log collection for Exchange admin audit logs and security events, and verify ExchangeAdminAuditLogs data begins ingesting.",
            "Deploy Exchange Security analytics rules for admin account changes, mailbox permission modifications, and on-premises transport rule anomalies; enable the Exchange Security workbook.",
            "Query ExchangeAdminAuditLogs in Sentinel, verify cmdlet, caller, and object fields are populated for recent Exchange admin activity, and confirm an analytics rule fires on a test admin action.",
        ],
    },

    "microsoft-exchange-security-exchange-online": {
        "abbrev": "exol",
        "type": "m365",
        "descs": [
            "Confirm Exchange Online is active in the M365 tenant, verify the operator holds Exchange Admin or Security Admin, and ensure the Office 365 Management Activity API is accessible for log streaming.",
            "Enable the Microsoft Exchange Security (Online) connector in Sentinel, configure audit log streaming via the Office 365 connector, and verify ExchangeAdminAuditLogs and OfficeActivity (Exchange) data populate.",
            "Deploy Exchange Online analytics rules for unusual email forwarding, inbox rule creation, and administrative permission changes; enable the Exchange Security Online workbook.",
            "Query ExchangeAdminAuditLogs and OfficeActivity for Exchange-type events in Sentinel, verify user, operation, and object fields are populated, and confirm analytics rules fire on available audit log data.",
        ],
    },

    "microsoft-power-bi": {
        "abbrev": "pbi",
        "type": "m365",
        "descs": [
            "Confirm Power BI Premium or Pro licensing is active, verify the tenant has Power BI audit log collection enabled in the admin portal, and confirm the operator holds Power BI Service Admin or Global Admin.",
            "Enable the Microsoft Power BI connector in Sentinel by configuring the Microsoft 365 audit log scope to include Power BI events; verify PowerBIActivity or OfficeActivity (PowerBI) events appear.",
            "Deploy Power BI analytics rules for sensitive-data export anomalies, workspace permission changes, and unusual report access patterns; enable the Power BI workbook for activity and risk visualization.",
            "Query PowerBIActivity or OfficeActivity filtered to the Power BI workload in Sentinel, verify activity type, user, and workspace fields are populated, and confirm an analytics rule triggers on available test data.",
        ],
    },

    "microsoft-project": {
        "abbrev": "proj",
        "type": "m365",
        "descs": [
            "Confirm Microsoft Project licensing and audit log collection are enabled in the M365 tenant, and verify the operator holds M365 Security Admin or Global Admin for log-access configuration.",
            "Enable the Microsoft Project connector in Sentinel, configure M365 audit log streaming for Project-related events, and verify relevant events appear in the OfficeActivity or Project-specific tables.",
            "Deploy analytics rules for Microsoft Project permission anomalies and data-export events, and enable the Project workbook for activity visibility across project workspaces.",
            "Query Project-related events in the OfficeActivity table in Sentinel, verify user, operation, and project fields are populated, and confirm analytics rules run correctly against available audit data.",
        ],
    },

    "microsoft-purview": {
        "abbrev": "purv",
        "type": "m365",
        "descs": [
            "Confirm the tenant has a Microsoft Purview license (Compliance or Information Protection), verify the operator holds Compliance Admin or Global Admin, and ensure audit logging is enabled in the Microsoft Purview compliance portal.",
            "Enable the Microsoft Purview connector in Sentinel, configure audit log streaming for DLP, compliance, and data-governance events, and verify PurviewDataMap or OfficeActivity (Compliance) data begins ingesting.",
            "Deploy Purview analytics rules for DLP policy violations, sensitive label changes, and insider risk signals; enable the Purview workbook for compliance posture visualization.",
            "Query Purview or compliance-related events in OfficeActivity in Sentinel, verify activity type, user, and policy fields are populated, and confirm analytics rules fire on available DLP or compliance events.",
        ],
    },

    "microsoft-purview-information-protection": {
        "abbrev": "pip",
        "type": "m365",
        "descs": [
            "Confirm Microsoft Purview Information Protection labeling is enabled in the tenant, verify the operator holds Compliance Admin or Security Admin, and ensure audit events for label operations are flowing.",
            "Enable the Microsoft Purview Information Protection connector in Sentinel, configure label-operation and DLP event streaming, and verify InformationProtectionLogs_CL or MicrosoftPurviewInformationProtection tables populate.",
            "Deploy analytics rules for sensitive label removal, downgrade events, and DLP overrides that indicate data exfiltration risk; enable the Information Protection workbook for label coverage visualization.",
            "Query InformationProtectionLogs_CL or the Purview IP event tables in Sentinel, verify label, user, and file fields are populated for recent label operations, and confirm a label-downgrade event triggers the appropriate analytics rule.",
        ],
    },

    "teams": {
        "abbrev": "teams",
        "type": "m365",
        "descs": [
            "Verify the operator holds Teams Admin or Global Admin for Microsoft Teams audit log collection, confirm API access is approved, and validate the Sentinel workspace has RBAC for M365 log ingestion.",
            "Enable the Microsoft Teams connector in Sentinel via the Office 365 Management Activity API, configure the Teams event collection scope, and verify TeamsMessages or OfficeActivity (Teams) data begins populating.",
            "Deploy Teams analytics rules for external user invitation anomalies, large message exfiltration, and policy-bypass patterns; enable the Teams workbook for collaboration activity oversight.",
            "Query TeamsMessages or OfficeActivity filtered to the Teams workload in Sentinel, verify user, channel, and message-type fields are populated, and confirm an analytics rule fires on available test collaboration events.",
        ],
    },

    "microsoft-business-applications": {
        "abbrev": "mba",
        "type": "m365",
        "descs": [
            "Confirm Dynamics 365 or Power Platform licensing and audit log collection are enabled in the tenant, and verify the operator holds System Admin or Global Admin for the business applications environment.",
            "Enable the Microsoft Business Applications connector in Sentinel, configure Dataverse audit log and Power Platform activity streaming, and verify Dynamics365Activity or OfficeActivity tables populate.",
            "Deploy analytics rules for Dynamics 365 privilege escalations, bulk data exports, and Power Automate policy violations; enable the Business Applications workbook for activity visibility.",
            "Query Dynamics365Activity or relevant business-applications tables in Sentinel, verify user, operation, and entity fields are populated, and confirm analytics rules fire on available audit data.",
        ],
    },

    # ── Azure Native ───────────────────────────────────────────────────────

    "azure-batch-account": {
        "abbrev": "abatch",
        "type": "azure",
        "descs": [
            "Identify Azure Batch Account resources in scope, confirm Monitoring Contributor and Sentinel Contributor roles are assigned on the target workspace, and verify diagnostic settings can be applied to batch account resources.",
            "Enable diagnostic settings on Azure Batch Account resources to stream the ServiceLog category to the Sentinel workspace, and confirm data flows to the AzureDiagnostics table with the resource type BATCHACCOUNTS.",
            "Deploy Azure Batch Account analytics rules and workbooks (if included in the solution), and review automation content for job-failure and unauthorized-access anomaly detection.",
            "Query AzureDiagnostics filtered to BATCHACCOUNTS in Sentinel, verify job, pool, and caller-identity event records are present, and confirm any enabled analytics rules return expected results.",
        ],
    },

    "azure-cognitive-search": {
        "abbrev": "acsrch",
        "type": "azure",
        "descs": [
            "Identify Azure Cognitive Search service instances in scope, confirm Monitoring Contributor and Sentinel Contributor are assigned, and verify diagnostic settings support for the search service resources.",
            "Enable diagnostic settings on Azure Cognitive Search resources to stream audit and operation logs to the Sentinel workspace, and confirm data appears in the AzureDiagnostics table under the SEARCHSERVICES resource type.",
            "Deploy Cognitive Search analytics rules for unauthorized query attempts, index modification events, and access anomalies; enable any associated workbooks for search service visibility.",
            "Query AzureDiagnostics filtered to Azure Cognitive Search in Sentinel, verify search-operation and identity fields are populated, and confirm analytics rules return expected results on available log data.",
        ],
    },

    "azure-ddos-protection": {
        "abbrev": "ddos",
        "type": "azure",
        "descs": [
            "Confirm Azure DDoS Protection Standard is enabled on target virtual networks, verify Monitoring Contributor and Sentinel Contributor roles, and identify the VNets to include in DDoS log streaming.",
            "Enable diagnostic settings on Azure DDoS Protection to stream mitigation reports and attack events to the Sentinel workspace; confirm DDoSProtectionNotifications or AzureNetworkAnalytics_CL data begins populating.",
            "Deploy DDoS analytics rules for ongoing mitigation events and volumetric attack detections; enable the DDoS Protection workbook for attack-timeline and mitigation-status visualization.",
            "Query DDoS-related tables in Sentinel, verify attack type, mitigated traffic, and target-IP fields are populated, and confirm analytics rules fire on any available DDoS event data.",
        ],
    },

    "azure-devops-auditing": {
        "abbrev": "ado",
        "type": "azure",
        "descs": [
            "Confirm Azure DevOps Organization-level access is available and the operator holds Project Collection Admin, and verify the Azure DevOps Auditing API is enabled for the target organizations.",
            "Enable the Azure DevOps Auditing connector in Sentinel, configure the API connection to stream DevOps audit events, and verify the AzureDevOpsAuditing table begins ingesting data.",
            "Deploy Azure DevOps analytics rules for unauthorized pipeline modifications, repo permission changes, and service-connection anomalies; enable the DevOps Auditing workbook.",
            "Query AzureDevOpsAuditing in Sentinel, verify actor, operation type, and project fields are populated for recent DevOps audit events, and confirm an analytics rule fires on a test pipeline or permission change.",
        ],
    },

    "azure-event-hubs": {
        "abbrev": "aeh",
        "type": "azure",
        "descs": [
            "Identify Azure Event Hubs namespaces in scope, confirm Monitoring Contributor and Sentinel Contributor are assigned, and verify diagnostic settings are supported for the target namespaces.",
            "Enable diagnostic settings on Azure Event Hubs namespaces to stream OperationalLogs to the Sentinel workspace, and confirm AzureDiagnostics data for EVENTHUBS begins populating.",
            "Deploy Event Hubs analytics rules for unauthorized access, throttling events, and namespace management anomalies; enable any associated workbooks for messaging-pipeline visibility.",
            "Query AzureDiagnostics filtered to Event Hubs in Sentinel, verify namespace, entity, and caller fields are present, and confirm analytics rules return expected results on available log data.",
        ],
    },

    "azure-key-vault": {
        "abbrev": "akv",
        "type": "azure",
        "descs": [
            "Identify Azure Key Vault instances in scope, confirm Monitoring Contributor and Sentinel Contributor RBAC, and verify the AuditEvent diagnostic logging category is available on each target vault.",
            "Enable diagnostic settings on Azure Key Vault resources to stream AuditEvent logs to the Sentinel workspace, and verify the KeyVaultData or AzureDiagnostics table is receiving vault-operation events.",
            "Deploy Key Vault analytics rules for secret exfiltration, vault deletion, access-policy modification, and anomalous access patterns; enable the Key Vault workbook for access and operation visibility.",
            "Query KeyVaultData or AzureDiagnostics filtered to Key Vault in Sentinel, verify operation type, caller identity, and vault name fields are populated, and confirm analytics rules fire on available vault audit events.",
        ],
    },

    "azure-kubernetes-service": {
        "abbrev": "aks",
        "type": "azure",
        "descs": [
            "Identify AKS clusters in scope, confirm Monitoring Contributor and Sentinel Contributor RBAC, and verify that Azure Monitor for containers and diagnostic settings are supported on the target clusters.",
            "Enable diagnostic settings on AKS clusters to stream kube-audit, kube-apiserver, and guard logs to the Sentinel workspace; verify AzureDiagnostics data for MANAGEDCLUSTERS begins populating.",
            "Deploy AKS analytics rules for privilege escalation, unauthorized API access, and container-escape detection; enable the AKS workbook for cluster event and activity visualization.",
            "Query AzureDiagnostics filtered to AKS in Sentinel, verify cluster, namespace, and user fields are populated for recent Kubernetes API events, and confirm analytics rules fire on available audit data.",
        ],
    },

    "azure-logic-apps": {
        "abbrev": "ala",
        "type": "azure",
        "descs": [
            "Identify Azure Logic Apps instances in scope, confirm Monitoring Contributor and Sentinel Contributor roles, and verify diagnostic settings can be enabled for the target workflow resources.",
            "Enable diagnostic settings on Azure Logic Apps to stream WorkflowRuntime logs to the Sentinel workspace, and confirm AzureDiagnostics data for WORKFLOWS begins ingesting.",
            "Deploy Logic Apps analytics rules for failed-workflow anomalies, unauthorized trigger access, and sensitive-action detection; enable any associated workbooks for workflow visibility.",
            "Query AzureDiagnostics filtered to Logic Apps in Sentinel, verify workflow name, trigger type, and outcome fields are populated, and confirm analytics rules execute correctly on available workflow log data.",
        ],
    },

    "azure-network-security-group": {
        "abbrev": "nsg",
        "type": "azure",
        "descs": [
            "Identify NSGs in scope and confirm NSG flow logs are enabled (or can be enabled) targeting the Sentinel workspace; verify Network Contributor and Sentinel Contributor roles are assigned.",
            "Enable NSG flow log diagnostic settings to stream allowed and denied traffic events to the Sentinel workspace, and verify AzureNetworkAnalytics_CL or the NSG flow log table begins populating.",
            "Deploy NSG analytics rules for unusual inbound access, port-scanning patterns, and denied-traffic spikes; enable the NSG workbook for traffic-flow visualization and network activity overview.",
            "Query AzureNetworkAnalytics_CL or NSG flow log tables in Sentinel, verify source IP, destination port, and flow-decision fields are populated, and confirm analytics rules return expected results on available traffic data.",
        ],
    },

    "azure-resource-graph": {
        "abbrev": "arg",
        "type": "azure",
        "descs": [
            "Confirm the operator has Reader access across all target subscriptions for Azure Resource Graph queries, and verify the Sentinel workspace is configured to receive resource change events.",
            "Enable the Azure Resource Graph connector in Sentinel, configure subscription-level resource change event streaming, and verify resource-topology data begins populating in the relevant tables.",
            "Deploy Resource Graph analytics rules for resource deletion, unauthorized resource creation, and configuration drift; enable the Resource Graph workbook for subscription inventory visualization.",
            "Query Resource Graph event tables in Sentinel, verify resource type, subscription, and change-detail fields are populated, and confirm analytics rules fire on available resource-change data.",
        ],
    },

    "azure-security-benchmark": {
        "abbrev": "asb",
        "type": "azure",
        "descs": [
            "Confirm Microsoft Defender for Cloud is enabled with the Azure Security Benchmark initiative assigned across target subscriptions; verify Security Reader and Sentinel Contributor roles are in place.",
            "Enable the Azure Security Benchmark connector in Sentinel to stream benchmark assessment findings and recommendations, and verify SecurityRecommendation or AzureSecurityBenchmark tables populate.",
            "Deploy ASB analytics rules for critical control failures, benchmark regression, and compliance drift; enable the Azure Security Benchmark workbook for posture-score tracking and prioritized remediation.",
            "Query SecurityRecommendation tables in Sentinel, verify benchmark control, resource, and severity fields are populated for recent assessments, and confirm analytics rules fire on available benchmark findings.",
        ],
    },

    "azure-service-bus": {
        "abbrev": "asbus",
        "type": "azure",
        "descs": [
            "Identify Azure Service Bus namespaces in scope, confirm Monitoring Contributor and Sentinel Contributor roles, and verify diagnostic settings are available for the target namespaces.",
            "Enable diagnostic settings on Azure Service Bus namespaces to stream OperationalLogs and management logs to the Sentinel workspace, and verify AzureDiagnostics for SERVICEBUS begins ingesting.",
            "Deploy Service Bus analytics rules for unauthorized queue or topic access, dead-letter queue anomalies, and management-plane changes; enable any associated workbooks for messaging visibility.",
            "Query AzureDiagnostics filtered to Service Bus in Sentinel, verify namespace, entity, and caller fields are populated for recent events, and confirm analytics rules return expected results.",
        ],
    },

    "azure-sql-database-solution-for-sentinel": {
        "abbrev": "asql",
        "type": "azure",
        "descs": [
            "Identify Azure SQL Database instances in scope, confirm Monitoring Contributor and Sentinel Contributor roles, and verify SQL Audit and Advanced Threat Protection are enabled on the target databases.",
            "Enable Azure SQL Database diagnostic settings and SQL Audit log streaming to the Sentinel workspace; confirm AzureDiagnostics and SQLSecurityAuditEvents data begins populating.",
            "Deploy Azure SQL analytics rules for SQL injection patterns, brute-force login attempts, and anomalous data exfiltration; enable the Azure SQL workbook for database activity and threat visibility.",
            "Query AzureDiagnostics and SQLSecurityAuditEvents in Sentinel, verify database, caller, and SQL statement fields are present for recent queries, and confirm analytics rules fire on available SQL audit data.",
        ],
    },

    "azure-storage": {
        "abbrev": "astor",
        "type": "azure",
        "descs": [
            "Identify Azure Storage accounts in scope, confirm Monitoring Contributor and Sentinel Contributor roles, and verify diagnostic settings support for the target account types (Blob, Queue, File, Table).",
            "Enable diagnostic settings on Azure Storage accounts to stream read, write, and delete operations to the Sentinel workspace; verify StorageBlobLogs or AzureDiagnostics data for Storage begins ingesting.",
            "Deploy Azure Storage analytics rules for mass deletion, unusual blob access, SAS-token misuse, and public-access anomalies; enable the Azure Storage workbook for data-layer visibility.",
            "Query StorageBlobLogs or AzureDiagnostics filtered to Storage in Sentinel, verify caller, operation, and container fields are populated for recent events, and confirm analytics rules fire correctly.",
        ],
    },

    "azure-stream-analytics": {
        "abbrev": "asa",
        "type": "azure",
        "descs": [
            "Identify Azure Stream Analytics jobs in scope, confirm Monitoring Contributor and Sentinel Contributor roles, and verify diagnostic settings support for Stream Analytics job logs.",
            "Enable diagnostic settings on Azure Stream Analytics jobs to stream execution and authoring logs to the Sentinel workspace, and verify AzureDiagnostics for STREAMINGJOBS begins populating.",
            "Deploy Stream Analytics analytics rules for job-failure anomalies, unauthorized input or output configuration changes, and streaming data-access events.",
            "Query AzureDiagnostics filtered to Stream Analytics in Sentinel, verify job name, operation, and status fields are populated, and confirm analytics rules return expected results on available job log data.",
        ],
    },

    "azure-waf": {
        "abbrev": "waf",
        "type": "azure",
        "descs": [
            "Identify Azure WAF policies and associated Application Gateways or Front Door profiles in scope, confirm Monitoring Contributor and Sentinel Contributor roles, and verify WAF diagnostic logging is supported.",
            "Enable diagnostic settings on Azure WAF resources to stream ApplicationGatewayFirewallLog or FrontDoorWebApplicationFirewallLog to the Sentinel workspace, and confirm WAF log tables begin populating.",
            "Deploy Azure WAF analytics rules for SQL injection, XSS, and RCE detection patterns; enable the WAF workbook for blocked-request trending and attack-source visualization.",
            "Query ApplicationGatewayFirewallLog or FrontDoorWebApplicationFirewallLog in Sentinel, verify rule ID, action, and client-IP fields are populated, and confirm analytics rules fire on available WAF block events.",
        ],
    },

    "microsoft-sysmon-for-linux": {
        "abbrev": "sysml",
        "type": "azure",
        "descs": [
            "Confirm target Linux servers are Azure Arc-onboarded (or have AMA installed), verify Azure Platform Admin rights for DCR configuration, and identify the sysmon-for-linux package availability on target distributions.",
            "Install Sysmon for Linux on target hosts, configure the Sysmon XML profile, and enable data collection via AMA and a DCR targeting the Sentinel workspace Syslog or custom Sysmon table.",
            "Deploy Sysmon for Linux analytics rules for process injection, unusual network connections, and file creation in sensitive paths; enable the Linux Sysmon workbook for host-level telemetry visualization.",
            "Query Syslog or the Sysmon Linux custom table in Sentinel, verify event ID, host, and process fields are populated for recent endpoint events, and confirm analytics rules fire on available test data.",
        ],
    },

    "microsoft-windows-sql-server-database-audit": {
        "abbrev": "wssql",
        "type": "azure",
        "descs": [
            "Identify Windows SQL Server instances in scope, confirm the operator has local admin on SQL hosts and Azure Platform Admin for DCR configuration, and verify AMA is installed or can be deployed to SQL server hosts.",
            "Configure SQL Server audit logging to write to the Windows Security Event log, deploy a DCR to forward SQL-related Windows Security Events to the Sentinel workspace, and verify WindowsEvent or SecurityEvent data flows.",
            "Deploy Windows SQL Server audit analytics rules for login failures, privilege escalation, and sensitive-table access patterns; enable any associated workbooks for SQL audit visualization.",
            "Query WindowsEvent or SecurityEvent in Sentinel filtered to SQL Server audit events, verify database, login, and operation fields are populated, and confirm analytics rules fire on available SQL audit data.",
        ],
    },
}

# ---------------------------------------------------------------------------
# Infrastructure solutions — IDs already exist, just add duration
# ---------------------------------------------------------------------------
INFRA_IDS = {
    "windows-firewall-via-ama",
    "windows-forwarded-events-via-ama",
    "sysmon-via-ama",
}

# ---------------------------------------------------------------------------
# Tier 1 — do NOT touch these
# ---------------------------------------------------------------------------
TIER1_IDS = {
    "azure-activity", "azure-firewall", "defender-xdr", "microsoft-entra-id",
    "microsoft-365", "common-event-format", "windows-forwarded-events",
    "windows-security-events", "windows-dns-events-via-ama",
}


def build_full_tasks(sol_id, existing_tasks, spec):
    """
    Returns a new list of fully-enriched tasks for a 4-task standard solution.
    Preserves existing 'task' text; derives all other fields from spec + existing data.
    """
    abbrev = spec["abbrev"]
    conn_type = spec["type"]
    descs = spec["descs"]

    suffixes = ["prereqs", "configure", "content", "validate"]
    prev_id = None
    new_tasks = []

    for task in existing_tasks:
        order = task["order"]
        effort = task["effort_hours"]
        idx = order - 1  # 0-based index into suffixes/descs

        cat, phase, owner, skill = phase_meta(order, conn_type)
        task_id = f"{abbrev}-{suffixes[idx]}"
        duration = derive_duration(effort)

        enriched = {
            "id": task_id,
            "order": order,
            "task": task["task"],
            "duration": duration,
            "effort_hours": effort,
            "skill_level": skill,
            "category": cat,
            "phase": phase,
            "depends_on": [prev_id] if prev_id else [],
            "owner_role": owner,
            "description": descs[idx],
        }
        new_tasks.append(enriched)
        prev_id = task_id

    return new_tasks


def patch_infra_task(task):
    """Adds duration to an infra task that already has all other fields."""
    t = dict(task)
    t["duration"] = derive_duration(t["effort_hours"])
    return t


def main():
    with open(SOLUTIONS_PATH, encoding="utf-8") as f:
        data = json.load(f)

    enriched_solutions = []
    skipped_tier1 = []
    skipped_already_done = []

    for cat_key, cat_data in data["categories"].items():
        for sol in cat_data["solutions"]:
            sol_id = sol["id"]
            setup_tasks = sol.get("planner", {}).get("setup_tasks", [])

            # Tier 1 — skip entirely
            if sol_id in TIER1_IDS:
                skipped_tier1.append(sol_id)
                continue

            # Already fully enriched (shouldn't happen for Tier 2, but guard)
            if setup_tasks and all("duration" in t for t in setup_tasks):
                skipped_already_done.append(sol_id)
                continue

            # Infrastructure: only add duration
            if sol_id in INFRA_IDS:
                new_tasks = [patch_infra_task(t) for t in setup_tasks]
                sol["planner"]["setup_tasks"] = new_tasks
                total_dur = sum(t["duration"] for t in new_tasks)
                enriched_solutions.append((sol_id, len(new_tasks), total_dur, "infra"))
                continue

            # 4-task standard solution
            if sol_id in CATALOG:
                spec = CATALOG[sol_id]
                new_tasks = build_full_tasks(sol_id, setup_tasks, spec)
                sol["planner"]["setup_tasks"] = new_tasks
                total_dur = sum(t["duration"] for t in new_tasks)
                enriched_solutions.append((sol_id, len(new_tasks), total_dur, spec["type"]))
            else:
                print(f"  [WARN] No catalog entry for: {sol_id} — skipping")

    # Write back
    with open(SOLUTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # ── Summary ─────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print(f"  patch_tier2_durations.py — Enrichment Summary")
    print("=" * 70)
    print(f"  Tier 1 solutions preserved (not touched): {len(skipped_tier1)}")
    print(f"  Already complete (skipped):               {len(skipped_already_done)}")
    print(f"  Tier 2 solutions enriched:                {len(enriched_solutions)}")
    print()
    print(f"  {'Solution ID':<52} {'Tasks':>5}  {'Total Days':>10}  Type")
    print(f"  {'-'*52}  {'-'*5}  {'-'*10}  ----")

    m365_count = azure_count = infra_count = 0
    for sol_id, n_tasks, total_dur, sol_type in sorted(enriched_solutions, key=lambda x: x[0]):
        print(f"  {sol_id:<52} {n_tasks:>5}  {total_dur:>10.1f}  {sol_type}")
        if sol_type == "m365":
            m365_count += 1
        elif sol_type == "azure":
            azure_count += 1
        elif sol_type == "infra":
            infra_count += 1

    print()
    print(f"  Breakdown: M365={m365_count}  Azure={azure_count}  Infra={infra_count}")
    print()

    # Validation: count total solutions with full duration data
    total_with_dur = 0
    for cat_data in data["categories"].values():
        for sol in cat_data["solutions"]:
            tasks = sol.get("planner", {}).get("setup_tasks", [])
            if tasks and all("duration" in t for t in tasks):
                total_with_dur += 1

    print(f"  [OK] Total solutions with full duration data: {total_with_dur}")
    print(f"    (expected: {len(TIER1_IDS)} Tier 1 + {len(CATALOG) + len(INFRA_IDS)} Tier 2 = "
          f"{len(TIER1_IDS) + len(CATALOG) + len(INFRA_IDS)})")
    print("=" * 70)


if __name__ == "__main__":
    main()
