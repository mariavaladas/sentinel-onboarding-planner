"""
patch_featured_tasks.py
Sebastian – Data Engineer
2026-06-16

Replaces planner.setup_tasks for the 11 featured solutions that have generic
templated tasks with high-quality, product-specific hand-crafted tasks.

Solutions patched (third_party category only):
  Group A (multi-cloud connectors): aws, google-cloud-platform-iam, threat-intelligence-new
  Group B (domain/content-only):   dns-essentials, network-session-essentials,
                                   apache-log4j-vulnerability-detection,
                                   security-threat-essential-solution
  Group C (playbook solutions):    virus-total, sentinel-soa-ressentials
  Group D (workbook solutions):    soc-handbook, ueba-essentials

Protected (NOT modified):
  azure-activity, defender-for-cloud, defender-xdr, microsoft-entra-id
"""

import json

SOLUTIONS_PATH = "data/solutions.json"

# ---------------------------------------------------------------------------
# Hand-crafted task definitions
# ---------------------------------------------------------------------------

FEATURED_TASKS = {

    # =========================================================================
    # GROUP A — Multi-cloud connectors
    # =========================================================================

    "aws": [
        {
            "id": "aws-prereqs",
            "order": 1,
            "task": "Set up AWS IAM permissions and enable CloudTrail logging across target accounts.",
            "duration": 1.0,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "AWS Cloud Admin",
            "description": (
                "Create a dedicated IAM role in each AWS account with policies granting "
                "s3:GetObject, s3:ListBucket, sqs:ReceiveMessage, sqs:DeleteMessage, and "
                "cloudtrail:GetTrailStatus permissions. Enable AWS CloudTrail with multi-region "
                "scope and ensure management events and S3 data events are captured so that the "
                "AWSCloudTrail table in Sentinel receives complete API call history."
            ),
        },
        {
            "id": "aws-s3-setup",
            "order": 2,
            "task": "Create and configure the S3 bucket and SQS queue that funnel CloudTrail logs to Sentinel.",
            "duration": 1.5,
            "effort_hours": 6,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": ["aws-prereqs"],
            "owner_role": "AWS Cloud Admin",
            "description": (
                "Create or designate an S3 bucket as the CloudTrail log destination and configure "
                "bucket event notifications (s3:ObjectCreated:*) to publish to a dedicated SQS "
                "queue. Set up the SQS queue with an appropriate retention window (minimum 14 days) "
                "and grant the Sentinel connector's IAM role receive/delete access so the S3-based "
                "connector can poll new log objects as they arrive."
            ),
        },
        {
            "id": "aws-connector",
            "order": 3,
            "task": "Configure the Microsoft Sentinel AWS connector using the S3 or CloudTrail connector type.",
            "duration": 1.0,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Configuration",
            "depends_on": ["aws-s3-setup"],
            "owner_role": "AWS Cloud Admin",
            "description": (
                "In Microsoft Sentinel, open the Amazon Web Services S3 connector and add a new "
                "data stream by providing the SQS queue URL and the IAM role ARN. Verify the "
                "connector status shows Connected and confirm that AWSCloudTrail records begin "
                "appearing in the Log Analytics workspace within 15–30 minutes. Optionally add "
                "the Amazon Web Services (CloudTrail) connector or the Amazon GuardDuty connector "
                "for additional threat-detection telemetry."
            ),
        },
        {
            "id": "aws-content",
            "order": 4,
            "task": "Deploy AWS analytics rules and workbooks from the solution content pack.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["aws-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 62 packaged AWS analytics rules covering IAM abuse, S3 bucket "
                "exfiltration, CloudTrail disablement, and privilege escalation patterns. "
                "Deploy the AWS workbooks for account-level activity visualization. "
                "Review each rule's entity mappings (AccountName, IPAddress, ResourceId) "
                "to confirm they align with your AWS account naming conventions."
            ),
        },
        {
            "id": "aws-validate",
            "order": 5,
            "task": "Validate end-to-end ingestion from AWS CloudTrail to Sentinel and confirm rule firing.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["aws-content"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query AWSCloudTrail in Log Analytics for recent API calls from at least two "
                "target AWS accounts and verify that UserIdentityArn, EventName, and "
                "SourceIPAddress fields are populated. Trigger a known-benign activity (e.g., "
                "list-buckets API call) and confirm it appears in Sentinel within the expected "
                "latency window. Validate that at least one high-confidence analytics rule "
                "produces an incident."
            ),
        },
        {
            "id": "aws-tune",
            "order": 6,
            "task": "Tune AWS analytics rules to reduce noise for your account topology and tag coverage.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["aws-validate"],
            "owner_role": "SOC Analyst",
            "description": (
                "Review incident volume from the first 48 hours of live data and identify rules "
                "generating false positives due to legitimate automation or service accounts. "
                "Add account-specific exclusions using watchlists or rule entity filters. "
                "Confirm GuardDuty findings (AWSGuardDuty table) are correlated with CloudTrail "
                "incidents where applicable to enrich alert fidelity."
            ),
        },
    ],

    "google-cloud-platform-iam": [
        {
            "id": "gcpi-prereqs",
            "order": 1,
            "task": "Create GCP service account, assign IAM roles, and enable the required GCP APIs.",
            "duration": 1.0,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "GCP Cloud Admin",
            "description": (
                "In Google Cloud Console, create a dedicated service account for Sentinel "
                "integration and grant it the roles/pubsub.subscriber and "
                "roles/logging.configWriter IAM roles. Enable the Cloud Pub/Sub API and "
                "Cloud Logging API on the target GCP project. Download a JSON key for the "
                "service account — this credential will be used by the Sentinel GCP connector "
                "to authenticate to your Pub/Sub subscription."
            ),
        },
        {
            "id": "gcpi-pubsub",
            "order": 2,
            "task": "Create the Pub/Sub topic, subscription, and log sink that routes GCP audit logs to Sentinel.",
            "duration": 1.5,
            "effort_hours": 5,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": ["gcpi-prereqs"],
            "owner_role": "GCP Cloud Admin",
            "description": (
                "Create a Pub/Sub topic (e.g., sentinel-gcp-logs) and a pull subscription with "
                "a 7-day message retention policy. Create a Log Sink using Cloud Logging export "
                "with the filter 'logName:(activity OR data_access OR system_event)' and set the "
                "sink destination to your Pub/Sub topic. This pipeline ensures GCP Admin Activity "
                "and Data Access audit logs flow into Sentinel's GCPAuditLogs table."
            ),
        },
        {
            "id": "gcpi-connector",
            "order": 3,
            "task": "Configure the Google Cloud Platform IAM connector in Microsoft Sentinel.",
            "duration": 1.0,
            "effort_hours": 3,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Configuration",
            "depends_on": ["gcpi-pubsub"],
            "owner_role": "GCP Cloud Admin",
            "description": (
                "In Microsoft Sentinel, open the Google Cloud Platform IAM connector and enter "
                "the GCP project ID, Pub/Sub subscription name, and the service account JSON key. "
                "Save the connector and verify within 10–20 minutes that the GCPAuditLogs table "
                "receives records and that the connector status shows Connected."
            ),
        },
        {
            "id": "gcpi-content",
            "order": 4,
            "task": "Deploy GCP analytics rules, workbook, and playbooks from the solution content pack.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["gcpi-connector"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 10 GCP IAM analytics rules covering privilege escalation, service "
                "account key creation, IAM policy changes, and log sink modification. Deploy the "
                "GCP workbook for IAM activity dashboards. Deploy the 4 packaged playbooks for "
                "automated response to high-severity GCP IAM incidents, configuring the Logic App "
                "managed identity or API connections during deployment."
            ),
        },
        {
            "id": "gcpi-playbooks",
            "order": 5,
            "task": "Configure Logic App API connections for the 4 GCP response playbooks.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["gcpi-content"],
            "owner_role": "SOC Engineer",
            "description": (
                "Open each deployed GCP playbook in the Logic Apps designer and authorize the "
                "Microsoft Sentinel and Microsoft Teams (or email) API connections. Attach the "
                "playbooks to Sentinel automation rules so they fire when GCP IAM analytics "
                "rules generate incidents. Test each connection by triggering a manual playbook "
                "run from a test incident."
            ),
        },
        {
            "id": "gcpi-validate",
            "order": 6,
            "task": "Validate GCP audit log ingestion and confirm analytics rules fire on expected events.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["gcpi-playbooks"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query GCPAuditLogs in Log Analytics and verify that principalEmail, "
                "methodName, and resourceName fields are populated for recent IAM events. "
                "Perform a benign IAM change (e.g., view a service account) and confirm it "
                "appears in Sentinel within the expected latency. Validate that at least one "
                "analytics rule produces an incident and that the attached playbook fires "
                "correctly."
            ),
        },
    ],

    "threat-intelligence-new": [
        {
            "id": "ti-strategy",
            "order": 1,
            "task": "Identify TI feed sources and plan connector configuration for your threat intelligence strategy.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Engineer",
            "description": (
                "Review the six available TI connectors (TAXII, Microsoft Defender Threat "
                "Intelligence, STIX/TAXII feeds, file import, and platform API connectors) and "
                "decide which feeds match your organization's threat model. Map each feed to the "
                "ThreatIntelligenceIndicator table schema — confirm the indicator types (IP, "
                "domain, URL, file hash) your SOC will operationalize and define a stale-indicator "
                "retention policy before enabling bulk imports."
            ),
        },
        {
            "id": "ti-connectors",
            "order": 2,
            "task": "Configure each selected TI connector and verify indicators populate the ThreatIntelligenceIndicator table.",
            "duration": 1.0,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Configuration",
            "depends_on": ["ti-strategy"],
            "owner_role": "SOC Engineer",
            "description": (
                "For TAXII feeds: enter the TAXII server URL, collection name, and credentials "
                "in the Threat Intelligence – TAXII connector. For Microsoft Defender TI: connect "
                "using the Defender TI connector and authorize the API connection. For STIX feeds "
                "or file imports: follow the same connector-specific steps. After each connector "
                "activates, query ThreatIntelligenceIndicator and confirm IndicatorType, "
                "NetworkIP/DomainName/Url, and ExpirationDateTime are populated."
            ),
        },
        {
            "id": "ti-analytics",
            "order": 3,
            "task": "Enable TI matching analytics rules to correlate live log sources against imported indicators.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["ti-connectors"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable the 52 packaged analytics rules that join ThreatIntelligenceIndicator "
                "against log sources such as CommonSecurityLog, DnsEvents, AzureActivity, "
                "OfficeActivity, and SigninLogs. Deploy the TI workbook for indicator coverage "
                "visualization. Review each rule's lookback window and query schedule to balance "
                "detection latency against workspace cost for high-volume indicator sets."
            ),
        },
        {
            "id": "ti-validate",
            "order": 4,
            "task": "Validate that TI indicators are ingesting correctly and matching rules are generating incidents.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["ti-analytics"],
            "owner_role": "SOC Analyst",
            "description": (
                "Query ThreatIntelligenceIndicator to confirm expected indicator counts per feed "
                "source (use the SourceSystem field to differentiate). Run a test lookup against "
                "a known-malicious IP or domain against your network logs to confirm the TI "
                "matching analytics rules trigger. Verify incident enrichment shows the full "
                "indicator record including confidence score and feed attribution."
            ),
        },
        {
            "id": "ti-tune",
            "order": 5,
            "task": "Tune indicator retention, feed priorities, and suppress low-confidence false positives.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["ti-validate"],
            "owner_role": "SOC Analyst",
            "description": (
                "Review incident volume per feed and identify low-confidence feeds generating "
                "noise. Adjust ConfidenceScore thresholds in analytics rules to filter below "
                "your SOC's acceptable confidence floor. Set expiration-based cleanup Logic Apps "
                "or scheduled queries to purge stale ThreatIntelligenceIndicator records older "
                "than your retention window to keep indicator match performance consistent."
            ),
        },
    ],

    # =========================================================================
    # GROUP B — Domain / content-only solutions
    # =========================================================================

    "dns-essentials": [
        {
            "id": "dnse-verify-data",
            "order": 1,
            "task": "Verify DNS log data is flowing into Sentinel from an underlying DNS connector before deploying content.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Analyst",
            "description": (
                "This is a domain solution — it requires an existing DNS data connector such as "
                "Windows DNS via AMA, Cisco Umbrella, or another DNS provider. Query the "
                "CommonSecurityLog or provider-specific table to confirm DNS records are arriving. "
                "Identify which ASIM DNS parser covers your deployed connector, as the "
                "DNS Essentials analytics rules query via the imDns ASIM parser function."
            ),
        },
        {
            "id": "dnse-deploy-content",
            "order": 2,
            "task": "Install ASIM DNS parsers and deploy the 9 DNS Essentials analytics rules.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["dnse-verify-data"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the ASIM DNS parser (imDns) that normalizes your DNS log source into the "
                "Advanced Security Information Model schema. Enable all 9 packaged analytics rules "
                "covering DNS tunneling, DGA (domain generation algorithm) patterns, DNS "
                "amplification, and base-64 encoded queries. Deploy the DNS Essentials playbook "
                "for automated block/notify response."
            ),
        },
        {
            "id": "dnse-configure-wb",
            "order": 3,
            "task": "Configure the DNS Essentials workbook and set workspace and time-range parameters.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["dnse-deploy-content"],
            "owner_role": "SOC Engineer",
            "description": (
                "Open the deployed DNS Essentials workbook and set the workspace and subscription "
                "parameters. Confirm the workbook visualizes DNS query volume, top queried domains, "
                "and anomalous query patterns from the imDns normalized view. Pin the workbook to "
                "the Sentinel dashboard for daily SOC visibility into DNS activity."
            ),
        },
        {
            "id": "dnse-validate",
            "order": 4,
            "task": "Validate DNS analytics rules fire on expected query patterns and confirm ASIM parser coverage.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["dnse-configure-wb"],
            "owner_role": "SOC Analyst",
            "description": (
                "Run imDns() in Log Analytics and confirm DnsQuery, SrcIpAddr, DnsResponseCode, "
                "and TimeGenerated fields are populated from your DNS source. Simulate a known "
                "DGA-like domain query pattern and verify the relevant analytics rule triggers "
                "within the configured rule frequency. Review any false positives from legitimate "
                "CDN or cloud service domains and add them to the rule exclusion list."
            ),
        },
    ],

    "network-session-essentials": [
        {
            "id": "nse-verify-data",
            "order": 1,
            "task": "Verify network session log data is flowing into Sentinel from an underlying network connector.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Analyst",
            "description": (
                "This is a domain solution — it requires an existing network data connector such "
                "as Palo Alto Firewall, Check Point, Cisco ASA, or Azure Firewall. Query "
                "CommonSecurityLog or the provider-specific table to confirm network session "
                "records are arriving. Identify which ASIM Network Session parser (imNetworkSession) "
                "covers your deployed connector, as all 9 analytics rules and both workbooks "
                "consume data through the ASIM normalized view."
            ),
        },
        {
            "id": "nse-deploy-content",
            "order": 2,
            "task": "Install ASIM Network Session parsers and deploy the 9 analytics rules.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["nse-verify-data"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the ASIM Network Session parser (imNetworkSession) that normalizes your "
                "firewall or network log source into the Advanced Security Information Model. "
                "Enable all 9 analytics rules covering port scanning, beaconing behavior, "
                "high-volume outbound transfers, and protocol anomalies. Deploy the Network "
                "Session Essentials playbook for automated response. All rules target "
                "imNetworkSession() so normalization must be confirmed before enabling."
            ),
        },
        {
            "id": "nse-configure-wb",
            "order": 3,
            "task": "Configure the Network Session Essentials workbooks with workspace and filter parameters.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["nse-deploy-content"],
            "owner_role": "SOC Engineer",
            "description": (
                "Open the two deployed Network Session workbooks (overview and anomaly views) and "
                "configure the workspace, subscription, and time-range parameters. Confirm the "
                "workbooks render session volume, top talkers, geographic distribution, and "
                "protocol breakdown from the imNetworkSession normalized table. Pin both workbooks "
                "to the Sentinel dashboard for daily network visibility."
            ),
        },
        {
            "id": "nse-validate",
            "order": 4,
            "task": "Validate ASIM parser coverage and confirm network session analytics rules fire correctly.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["nse-configure-wb"],
            "owner_role": "SOC Analyst",
            "description": (
                "Run imNetworkSession() in Log Analytics and verify that SrcIpAddr, DstIpAddr, "
                "DstPort, NetworkProtocol, and NetworkBytes fields are populated from your "
                "network source. Generate test traffic (e.g., port scan simulation in a lab "
                "environment) and confirm the relevant analytics rule triggers an incident. "
                "Review false positive volume from internal scanners or monitoring agents and "
                "add known safe IPs to rule exclusions."
            ),
        },
    ],

    "apache-log4j-vulnerability-detection": [
        {
            "id": "log4j-verify-data",
            "order": 1,
            "task": "Confirm required log sources are flowing into Sentinel to support Log4j vulnerability detection.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Analyst",
            "description": (
                "This is a detection-only solution requiring existing log sources. Verify that at "
                "least one of the following tables is populated: CommonSecurityLog (firewall/IDS "
                "syslog), Syslog (Linux application logs), SecurityEvent (Windows event logs), "
                "or AzureDiagnostics (WAF/Application Gateway logs). The 4 analytics rules and "
                "2 workbooks target these tables to detect CVE-2021-44228 exploitation attempts "
                "and post-exploitation behavior — coverage gaps will leave detections blind."
            ),
        },
        {
            "id": "log4j-content",
            "order": 2,
            "task": "Deploy Log4j analytics rules and workbooks to detect exploitation attempts and post-exploitation activity.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["log4j-verify-data"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable all 4 Log4j analytics rules targeting JNDI lookup pattern detection in "
                "firewall logs, web access logs, and Linux syslog. Deploy both workbooks: the "
                "exploitation detection dashboard (inbound JNDI attempts) and the post-exploitation "
                "workbook (outbound callback traffic, suspicious process spawning via SecurityEvent "
                "4688 events). Ensure rule lookback windows cover back-dated exploitation attempts "
                "if the solution is deployed after initial exposure."
            ),
        },
        {
            "id": "log4j-playbook",
            "order": 3,
            "task": "Configure the Log4j response playbook for automated containment and notification.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["log4j-content"],
            "owner_role": "SOC Engineer",
            "description": (
                "Open the deployed Log4j playbook in the Logic Apps designer and authorize the "
                "Microsoft Sentinel and notification (Teams or email) API connections. Configure "
                "the playbook automation rule to trigger on incidents from Log4j analytics rules "
                "with High severity. Test the playbook by manually triggering it against a test "
                "incident to confirm the notification and optional block actions fire correctly."
            ),
        },
        {
            "id": "log4j-validate",
            "order": 4,
            "task": "Validate Log4j detection coverage and run a simulated JNDI exploitation pattern.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["log4j-playbook"],
            "owner_role": "SOC Analyst",
            "description": (
                "In a controlled lab environment, send a web request containing a JNDI lookup "
                "string (e.g., ${jndi:ldap://test.example.com/a}) to a monitored target and "
                "confirm it appears in the relevant log source (CommonSecurityLog or Syslog). "
                "Verify that the matching analytics rule fires and generates an incident within "
                "the rule frequency window. Review the workbooks to confirm the event is "
                "visualized correctly and that the playbook notification was sent."
            ),
        },
    ],

    "security-threat-essential-solution": [
        {
            "id": "stes-verify-data",
            "order": 1,
            "task": "Verify that the data sources required by Security Threat Essentials analytics rules are available.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Analyst",
            "description": (
                "Review the 7 analytics rules in this solution and identify their source tables: "
                "SecurityEvent, CommonSecurityLog, Syslog, AzureActivity, and SigninLogs. Confirm "
                "each referenced table has data flowing in the workspace. Rules with missing "
                "source data will return zero results and never fire — document any coverage gaps "
                "before enabling to avoid false confidence in detection completeness."
            ),
        },
        {
            "id": "stes-deploy-rules",
            "order": 2,
            "task": "Enable all 7 Security Threat Essentials analytics rules targeting cross-platform attack patterns.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["stes-verify-data"],
            "owner_role": "SOC Engineer",
            "description": (
                "Enable all 7 out-of-box threat detection rules covering lateral movement, "
                "credential access, persistence mechanisms, and cross-platform attack patterns. "
                "Review entity mappings for each rule (Account, Host, IP) to ensure they align "
                "with your log schema and that incidents will be properly enriched with entity "
                "context for analyst triage."
            ),
        },
        {
            "id": "stes-tune",
            "order": 3,
            "task": "Tune detection thresholds and add environment-specific exclusions to reduce false positives.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "advanced",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["stes-deploy-rules"],
            "owner_role": "SOC Analyst",
            "description": (
                "Monitor incident volume for the first 48 hours after enabling rules. For rules "
                "with excessive false positives (e.g., from known admin tools, monitoring agents, "
                "or scheduled tasks), add watchlist-based exclusions referencing AccountCustomEntity "
                "or HostCustomEntity fields. Adjust threshold parameters where rules expose "
                "configurable count or time-window fields to fit your environment's baseline."
            ),
        },
        {
            "id": "stes-validate",
            "order": 4,
            "task": "Validate end-to-end detection by confirming incidents are generated and correctly classified.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["stes-tune"],
            "owner_role": "SOC Analyst",
            "description": (
                "Run each enabled analytics rule query manually in Log Analytics to confirm it "
                "returns results against live data. Trigger a known-safe test event that matches "
                "at least one rule pattern (e.g., a failed login burst for a test account) and "
                "confirm an incident is generated with correct severity, title, and entity mapping. "
                "Review the MITRE ATT&CK technique tags on each rule to ensure your coverage "
                "map is complete for the techniques this solution targets."
            ),
        },
    ],

    # =========================================================================
    # GROUP C — Playbook solutions
    # =========================================================================

    "virus-total": [
        {
            "id": "vt-api-key",
            "order": 1,
            "task": "Obtain a VirusTotal API key and confirm API quota tier matches expected enrichment volume.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Engineer",
            "description": (
                "Register for a VirusTotal account and generate an API key. Confirm whether the "
                "Public (free) or Premium tier is appropriate — the 9 enrichment playbooks call "
                "the VirusTotal v3 API for file hash, IP, URL, and domain lookups. Public tier "
                "is rate-limited to 4 requests/minute; Premium removes this limit. Store the "
                "API key in Azure Key Vault and reference it from the Logic Apps API connection."
            ),
        },
        {
            "id": "vt-deploy-playbooks",
            "order": 2,
            "task": "Deploy the 9 VirusTotal playbooks and configure the VirusTotal Logic App API connection.",
            "duration": 1.0,
            "effort_hours": 3,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Configuration",
            "depends_on": ["vt-api-key"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy all 9 playbooks from the VirusTotal solution content pack. Open the "
                "VirusTotal Logic App API connection in each playbook and authorize it using "
                "the API key from Key Vault. The playbooks cover file hash enrichment, IP "
                "reputation lookup, URL scan, and domain reputation — each adds VirusTotal "
                "results as comments to the Sentinel incident entity."
            ),
        },
        {
            "id": "vt-attach-rules",
            "order": 3,
            "task": "Attach VirusTotal playbooks to Sentinel automation rules for automatic enrichment on new incidents.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["vt-deploy-playbooks"],
            "owner_role": "SOC Engineer",
            "description": (
                "Create Sentinel automation rules that trigger the appropriate VirusTotal playbook "
                "based on incident entity type: use the IP enrichment playbook for incidents with "
                "IP entities, the file hash playbook for FileHash entities, and the URL/domain "
                "playbooks accordingly. Set rule conditions to limit scope to High/Medium severity "
                "incidents to manage API quota consumption."
            ),
        },
        {
            "id": "vt-validate",
            "order": 4,
            "task": "Validate VirusTotal enrichment by triggering a test incident and confirming the playbook adds enrichment comments.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["vt-attach-rules"],
            "owner_role": "SOC Analyst",
            "description": (
                "Create a test incident manually in Sentinel with a known-malicious IP or file "
                "hash entity (e.g., a public IOC from a threat feed). Confirm the automation "
                "rule triggers the VirusTotal IP or hash enrichment playbook. Open the incident "
                "and verify a comment has been added with the VirusTotal detection ratio, "
                "malicious vote count, and permalink to the full VirusTotal report."
            ),
        },
    ],

    "sentinel-soa-ressentials": [
        {
            "id": "soar-review",
            "order": 1,
            "task": "Review the SOAR Essentials playbook catalog and select playbooks matching your SOC automation priorities.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Engineer",
            "description": (
                "The solution contains 23 playbooks spanning incident notification (Teams, email, "
                "ServiceNow ticketing), entity enrichment, and response actions. Review the "
                "playbook list and prioritize which to deploy first based on your SOC's current "
                "automation gaps. Map each playbook to the Sentinel analytics rules or incident "
                "types it will respond to, and confirm the required API connections (Teams, "
                "M365, ServiceNow, etc.) are available in your tenant."
            ),
        },
        {
            "id": "soar-connections",
            "order": 2,
            "task": "Configure Logic App API connections for Teams, M365, and other services used by the playbooks.",
            "duration": 1.0,
            "effort_hours": 4,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Configuration",
            "depends_on": ["soar-review"],
            "owner_role": "SOC Engineer",
            "description": (
                "Create and authorize the Logic App API connections required by your selected "
                "playbooks: Microsoft Teams connector (for SOC channel notifications), Office 365 "
                "connector (for email alerting), and Microsoft Sentinel connector (for incident "
                "update actions). Use a service account or managed identity with the minimum "
                "permissions required — Microsoft Sentinel Responder for incident actions and "
                "Teams channel membership for notification playbooks."
            ),
        },
        {
            "id": "soar-deploy",
            "order": 3,
            "task": "Deploy the selected SOAR Essentials playbooks and verify Logic App resources are healthy.",
            "duration": 1.0,
            "effort_hours": 3,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["soar-connections"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the prioritized subset of the 23 playbooks from the Sentinel SOAR "
                "Essentials content pack. After deployment, open each Logic App in the Azure "
                "portal and verify the run history shows no authorization errors. Confirm that "
                "the Microsoft Sentinel API connection in each playbook uses the correct workspace "
                "and that the playbook has the Sentinel Contributor or Responder role on the "
                "workspace resource."
            ),
        },
        {
            "id": "soar-automate",
            "order": 4,
            "task": "Attach deployed playbooks to Sentinel automation rules to trigger on matching incidents.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["soar-deploy"],
            "owner_role": "SOC Engineer",
            "description": (
                "Create automation rules in Microsoft Sentinel that call the deployed playbooks "
                "based on incident conditions: severity, analytics rule name, or entity type. "
                "For notification playbooks, set conditions to trigger on New incident status "
                "for High severity. For response/enrichment playbooks, scope to specific "
                "analytics rule names to avoid over-triggering. Order automation rules to run "
                "enrichment before notification so alert comments are populated before Teams "
                "messages are sent."
            ),
        },
        {
            "id": "soar-validate",
            "order": 5,
            "task": "Validate end-to-end SOAR automation by triggering test incidents and confirming playbook execution.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["soar-automate"],
            "owner_role": "SOC Analyst",
            "description": (
                "Create test incidents in Sentinel that match the conditions of each automation "
                "rule. For notification playbooks: confirm the Teams or email message arrives "
                "with the correct incident details (title, severity, assigned analyst). For "
                "response playbooks: confirm the Logic App run history shows a Succeeded status "
                "and that the incident is updated with the expected comment or status change. "
                "Review Logic App run logs for any throttling errors if high-volume incident "
                "rates are expected."
            ),
        },
    ],

    # =========================================================================
    # GROUP D — Workbook / visibility solutions
    # =========================================================================

    "soc-handbook": [
        {
            "id": "soch-verify-data",
            "order": 1,
            "task": "Confirm that the data sources required by the SOC Handbook workbooks are populated in Sentinel.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Analyst",
            "description": (
                "The SOC Handbook contains 13 operational workbooks covering incident management, "
                "alert triage, analyst performance, and coverage metrics. Review each workbook's "
                "data dependencies — most consume SecurityIncident, SecurityAlert, "
                "ThreatIntelligenceIndicator, and workspace-level Log Analytics metadata. "
                "Confirm these tables have sufficient data volume (at least 30 days recommended) "
                "before deploying so workbook visualizations are meaningful rather than empty."
            ),
        },
        {
            "id": "soch-deploy-wb",
            "order": 2,
            "task": "Deploy all 13 SOC Handbook workbooks from the solution content pack.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["soch-verify-data"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the SOC Handbook solution from the Microsoft Sentinel Content Hub. All "
                "13 workbooks will be installed to your workspace. Confirm each workbook appears "
                "in the Sentinel Workbooks gallery under the 'My workbooks' tab. Workbooks cover "
                "areas including SOC efficiency, MITRE ATT&CK coverage heatmaps, incident SLA "
                "tracking, analyst workload, and detection health monitoring."
            ),
        },
        {
            "id": "soch-configure",
            "order": 3,
            "task": "Configure workbook parameters including workspace, subscription, and time-range filters.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["soch-deploy-wb"],
            "owner_role": "SOC Engineer",
            "description": (
                "Open each deployed SOC Handbook workbook and set the workspace and subscription "
                "parameters to point at your production Sentinel workspace. For workbooks with "
                "analyst-selection filters, configure the default team or shift scope. Save "
                "customized versions of the most-used workbooks (e.g., incident SLA dashboard) "
                "to preserve parameter settings between sessions."
            ),
        },
        {
            "id": "soch-validate",
            "order": 4,
            "task": "Validate that all 13 workbooks render correctly and surface meaningful SOC metrics.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["soch-configure"],
            "owner_role": "SOC Analyst",
            "description": (
                "Open each of the 13 workbooks and confirm charts and tables render without "
                "'No data found' states for the selected time range. Spot-check SecurityIncident "
                "counts displayed in the incident dashboard against a direct KQL query to verify "
                "accuracy. Identify any workbooks with persistent empty views and trace the "
                "missing table dependency so remediation can be planned."
            ),
        },
    ],

    "ueba-essentials": [
        {
            "id": "ueba-enable",
            "order": 1,
            "task": "Enable Microsoft Sentinel UEBA and configure entity data sources for behavioral baselining.",
            "duration": 1.0,
            "effort_hours": 3,
            "skill_level": "intermediate",
            "category": "setup",
            "phase": "Prerequisites",
            "depends_on": [],
            "owner_role": "SOC Analyst",
            "description": (
                "In Microsoft Sentinel Settings > Entity behavior, enable UEBA and select the "
                "data sources to synchronize: Azure Active Directory (sign-in and audit logs), "
                "Microsoft 365 (activity logs), and Azure Activity. UEBA requires at least 7 "
                "days of baseline data before anomaly scores become meaningful. Confirm that the "
                "BehaviorAnalytics and IdentityInfo tables begin populating in Log Analytics "
                "after UEBA is enabled."
            ),
        },
        {
            "id": "ueba-deploy-wb",
            "order": 2,
            "task": "Deploy the UEBA Essentials workbook from the solution content pack.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "beginner",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["ueba-enable"],
            "owner_role": "SOC Engineer",
            "description": (
                "Deploy the UEBA Essentials solution from the Microsoft Sentinel Content Hub to "
                "install the UEBA workbook. The workbook visualizes entity risk scores, anomaly "
                "timelines, and top risky users/hosts from the BehaviorAnalytics table. Confirm "
                "the workbook appears in the Sentinel Workbooks gallery and opens without errors."
            ),
        },
        {
            "id": "ueba-configure",
            "order": 3,
            "task": "Configure the UEBA workbook entity scope and validate anomaly scores are visible.",
            "duration": 0.5,
            "effort_hours": 2,
            "skill_level": "intermediate",
            "category": "phase-1",
            "phase": "Operationalization",
            "depends_on": ["ueba-deploy-wb"],
            "owner_role": "SOC Analyst",
            "description": (
                "Open the UEBA Essentials workbook and set the workspace, time range, and entity "
                "type filters (Users, Hosts, or IP addresses). Verify that entity risk scores "
                "are visible in the BehaviorAnalytics table by running a direct KQL query: "
                "BehaviorAnalytics | summarize max(ActivityInsights) by UserName | top 10 by max_ActivityInsights. "
                "Navigate to individual entity pages in Sentinel to confirm the UEBA timeline "
                "view shows behavioral anomalies."
            ),
        },
        {
            "id": "ueba-validate",
            "order": 4,
            "task": "Validate UEBA entity pages and anomaly detection after the initial 7-day baselining window.",
            "duration": 0.5,
            "effort_hours": 1,
            "skill_level": "intermediate",
            "category": "phase-2",
            "phase": "Validation",
            "depends_on": ["ueba-configure"],
            "owner_role": "SOC Analyst",
            "description": (
                "After UEBA has been running for at least 7 days, open the Entity Behavior page "
                "for a known user and confirm that anomaly insights (unusual sign-in time, "
                "impossible travel, new resource access) are surfaced in the timeline. Verify "
                "that the UEBA workbook's risk score distribution chart shows a non-trivial set "
                "of entities with elevated scores. Confirm that UEBA insights are appearing in "
                "Sentinel incident entity panels for correlated alerts."
            ),
        },
    ],
}

# ---------------------------------------------------------------------------
# Protected solutions — DO NOT MODIFY
# ---------------------------------------------------------------------------
PROTECTED = {"azure-activity", "defender-for-cloud", "defender-xdr", "microsoft-entra-id"}


def patch():
    with open(SOLUTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    patched = []
    skipped = []

    for cat_name, cat in data["categories"].items():
        for sol in cat.get("solutions", []):
            sol_id = sol["id"]
            if sol_id in PROTECTED:
                skipped.append(sol_id)
                continue
            if sol_id not in FEATURED_TASKS:
                continue

            new_tasks = FEATURED_TASKS[sol_id]
            sol["planner"]["setup_tasks"] = new_tasks
            total_dur = sum(t["duration"] for t in new_tasks)
            patched.append((sol_id, len(new_tasks), total_dur))

    with open(SOLUTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("=" * 60)
    print("patch_featured_tasks.py — Summary")
    print("=" * 60)
    print(f"{'Solution ID':<45} {'Tasks':>5}  {'Total Days':>10}")
    print("-" * 60)
    for sol_id, count, dur in patched:
        print(f"{sol_id:<45} {count:>5}  {dur:>9.1f}d")
    print("-" * 60)
    print(f"{'TOTAL patched:':<45} {len(patched):>5}  {sum(d for _, _, d in patched):>9.1f}d")
    print(f"\nProtected (not touched): {', '.join(skipped)}")
    print("\nJSON written successfully.")


if __name__ == "__main__":
    patch()
