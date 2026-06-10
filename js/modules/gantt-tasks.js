/**
 * gantt-tasks.js — Sentinel Onboarding Planner
 * Task generation engine: converts selected connectors into a structured Gantt task plan.
 *
 * USAGE
 *   import { buildGanttPlan, calculatePlanDuration } from './modules/gantt-tasks.js';
 *   const plan = buildGanttPlan(appState.selectedSolutions);
 *
 * STATE INTEGRATION
 *   Duration overrides are read from localStorage key
 *   `sentinelPlanner.taskDurationOverrides.v1` under `ganttTaskOverrides`.
 *   Shape: { [taskId]: { durationHours: number } }
 *
 * FIELD PACKS
 *   The engine uses the explicit `fieldPack` value from solutions.json when present,
 *   then falls back to metadata inference (`server_population_kind`,
 *   `cribl_eligible`, `tags`) for connectors that do not yet carry the field.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOURS_PER_DAY = 8;
const HOURS_PER_WEEK = HOURS_PER_DAY * 5;

/** localStorage key that stores all planner override state */
const DURATION_OVERRIDE_STORAGE_KEY = 'sentinelPlanner.taskDurationOverrides.v1';

/**
 * Canonical field-pack IDs. Used as stable keys throughout the engine.
 * @enum {string}
 */
export const FIELD_PACK = {
    SYSLOG_CEF: 'syslog-cef',
    WINDOWS_AMA: 'windows-ama',
    WEC_WEF: 'wec-wef',
    AMA_CUSTOM_LOGS: 'ama-custom-logs',
    CRIBL: 'cribl-intermediary',
    NATIVE_DIRECT: 'native-direct',
    DIAGNOSTIC_SETTINGS: 'diagnostic-settings',
    API_CCP: 'api-ccp',
    AZURE_FUNCTION: 'azure-function'
};

/**
 * Connector IDs (from solutions.json) that are treated as Cribl Stream itself.
 * Selecting any of these activates Cribl infrastructure and suppresses CEF-INFRA.
 */
const CRIBL_CONNECTOR_IDS = new Set(['cribl-stream']);

/**
 * The last (join-node) infra task per field pack. Per-connector tasks depend on this.
 * When Cribl is selected, syslog-cef connectors depend on CRIBL-INFRA-02 instead.
 */
const PACK_JOIN_TASK = {
    [FIELD_PACK.SYSLOG_CEF]: 'CEF-INFRA-05',
    [FIELD_PACK.WINDOWS_AMA]: 'WIN-INFRA-04',
    [FIELD_PACK.WEC_WEF]: 'WEC-INFRA-05',
    [FIELD_PACK.AMA_CUSTOM_LOGS]: 'CL-INFRA-03',
    [FIELD_PACK.CRIBL]: 'CRIBL-INFRA-02'
};

// ---------------------------------------------------------------------------
// Master task catalog
// ---------------------------------------------------------------------------

/**
 * Complete catalog of infrastructure and bookend tasks.
 * Per-connector tasks (the standard PC-01..04 chain or a minimal PC-01 task) are generated dynamically — see buildPerConnectorTasks().
 *
 * Each entry shape:
 *   id, name, description, phase, category, fieldPack, shared, duration, durationHours,
 *   ownerRole, dependsOn[], subtasks[], configurable, configurableNote,
 *   autoComplete, conditional, conditionNote, ongoing, style
 */
export const TASK_CATALOG = {

    // -----------------------------------------------------------------------
    // Phase 0 — Project Setup
    // -----------------------------------------------------------------------
    'SETUP-01': {
        id: 'SETUP-01',
        name: 'Validate workspace & permissions',
        phase: 0,
        category: 'SETUP',
        fieldPack: null,
        shared: true,
        duration: '4h',
        durationHours: 4,
        ownerRole: 'SOC Architect',
        dependsOn: [],
        subtasks: [
            'Confirm Log Analytics workspace exists and is linked to Microsoft Sentinel',
            'Assign RBAC roles: Log Analytics Contributor, Sentinel Contributor, VM Contributor',
            'Document workspace ID and resource group for the team'
        ],
        configurable: false,
        configurableNote: null
    },
    'SETUP-02': {
        id: 'SETUP-02',
        name: 'Validate network connectivity',
        phase: 0,
        category: 'SETUP',
        fieldPack: null,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'Operations Team',
        dependsOn: ['SETUP-01'],
        subtasks: [
            'Confirm outbound 443 to AMA endpoints (*.monitoring.azure.com, *.ods.opinsights.azure.com)',
            'Confirm syslog ports (UDP/TCP 514 and TLS 6514) reachable to planned forwarder IPs',
            'Document any firewall rule change requests needed; raise tickets if required'
        ],
        configurable: false,
        configurableNote: null
    },

    // -----------------------------------------------------------------------
    // Phase 1 — Syslog/CEF Pack infrastructure (suppressed when Cribl active)
    // -----------------------------------------------------------------------
    'CEF-INFRA-01': {
        id: 'CEF-INFRA-01',
        name: 'Provision Linux log forwarder(s)',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.SYSLOG_CEF,
        shared: true,
        duration: '1d',
        durationHours: 8,
        ownerRole: 'Operations Team',
        dependsOn: ['SETUP-02'],
        subtasks: [
            'Choose dedicated vs shared forwarder approach based on expected EPS',
            'Provision VM(s): RHEL/CentOS 8+ or Debian 11+, minimum 2 vCPU / 4 GB RAM',
            'Apply OS hardening baseline (CIS or internal standard)'
        ],
        configurable: false,
        configurableNote: null
    },
    'CEF-INFRA-02': {
        id: 'CEF-INFRA-02',
        name: 'Onboard forwarder(s) to Azure Arc',
        description: 'Only required when the Syslog/CEF forwarder is not already running in Azure',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.SYSLOG_CEF,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'Operations Team',
        dependsOn: ['CEF-INFRA-01'],
        subtasks: [
            'Install Azure Connected Machine agent on the Linux forwarder VM',
            'Register the machine in Azure; confirm it appears in Azure Arc portal',
            'Assign managed identity and confirm resource group / subscription placement'
        ],
        configurable: true,
        configurableNote: 'Set to 0 if the forwarder is an Azure VM (Arc not required)',
        conditional: true,
        conditionNote: 'Render this only for non-Azure forwarders; Azure VMs can skip Azure Arc.'
    },
    'CEF-INFRA-03': {
        id: 'CEF-INFRA-03',
        name: 'Install & register AMA on forwarder',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.SYSLOG_CEF,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'Operations Team',
        dependsOn: ['CEF-INFRA-02'],
        subtasks: [
            'Deploy Azure Monitor Agent (AMA) extension via Azure portal or Azure CLI',
            'Confirm AMA heartbeat appears in the Log Analytics workspace',
            'Verify AMA version ≥ 1.10'
        ],
        configurable: false,
        configurableNote: null
    },
    'CEF-INFRA-04': {
        id: 'CEF-INFRA-04',
        name: 'Configure rsyslog/syslog-ng on forwarder',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.SYSLOG_CEF,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'Operations Team',
        dependsOn: ['CEF-INFRA-03'],
        subtasks: [
            'Set syslog daemon listen port (default UDP 514 / TCP 514 / TLS 6514)',
            'Configure AMA syslog source to collect from the daemon socket',
            'Restart daemon; validate no errors in /var/log/syslog or journald'
        ],
        configurable: false,
        configurableNote: null
    },
    'CEF-INFRA-05': {
        id: 'CEF-INFRA-05',
        name: 'Create Syslog/CEF Data Collection Rule (DCR)',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.SYSLOG_CEF,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'SOC Engineers',
        dependsOn: ['CEF-INFRA-04'],
        subtasks: [
            'Create DCR in Azure portal targeting the CommonSecurityLog or Syslog table',
            'Select facility filters appropriate for CEF sources (e.g., daemon, local4)',
            'Associate the Linux forwarder resource; confirm DCE linkage if using private link'
        ],
        configurable: false,
        configurableNote: null
    },

    // -----------------------------------------------------------------------
    // Phase 1 — Windows AMA Pack infrastructure
    // -----------------------------------------------------------------------
    'WIN-INFRA-01': {
        id: 'WIN-INFRA-01',
        name: 'Assess Windows host estate',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WINDOWS_AMA,
        shared: true,
        duration: '4h',
        durationHours: 4,
        ownerRole: 'SOC Architect',
        dependsOn: ['SETUP-01'],
        subtasks: [
            'Inventory target Windows machines — Azure VMs vs on-premises vs Arc candidates',
            'Confirm OS versions: Windows Server 2012 R2+ or Windows 10+ required',
            'Check for legacy MMA (Log Analytics agent); plan migration path if present'
        ],
        configurable: false,
        configurableNote: null
    },
    'WIN-INFRA-02': {
        id: 'WIN-INFRA-02',
        name: 'Onboard non-Azure Windows hosts to Azure Arc',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WINDOWS_AMA,
        shared: true,
        duration: '1w',
        durationHours: 40,
        ownerRole: 'Operations Team',
        dependsOn: ['WIN-INFRA-01'],
        subtasks: [
            'Install Azure Connected Machine agent on on-premises / non-Azure Windows servers',
            'Register agents in Azure portal; confirm resource group assignment',
            'Assign managed identity to each Arc-enrolled machine'
        ],
        configurable: true,
        configurableNote: 'Set to 0 if all targets are Azure VMs (Arc not required). Scale up for large on-premises fleets.'
    },
    'WIN-INFRA-03': {
        id: 'WIN-INFRA-03',
        name: 'Deploy Azure Monitor Agent (AMA) to Windows hosts',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WINDOWS_AMA,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'Operations Team',
        dependsOn: ['WIN-INFRA-02'],
        subtasks: [
            'Deploy AMA via Azure Policy (preferred, at-scale) or manually per VM',
            'Confirm AMA version ≥ 1.10 on all targets',
            'Verify AMA heartbeat visible in Log Analytics workspace'
        ],
        configurable: false,
        configurableNote: null
    },
    'WIN-INFRA-04': {
        id: 'WIN-INFRA-04',
        name: 'Create Windows Security Events DCR',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WINDOWS_AMA,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'SOC Engineers',
        dependsOn: ['WIN-INFRA-03'],
        subtasks: [
            'Create Data Collection Rule in Azure portal for the SecurityEvent table',
            'Select event set: Minimal / Common / All (document customer choice)',
            'Assign target VMs or resource group scope'
        ],
        configurable: false,
        configurableNote: null
    },

    // -----------------------------------------------------------------------
    // Phase 1 — WEC/WEF Pack infrastructure
    // -----------------------------------------------------------------------
    'WEC-INFRA-01': {
        id: 'WEC-INFRA-01',
        name: 'Design WEC/WEF topology',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WEC_WEF,
        shared: true,
        duration: '4h',
        durationHours: 4,
        ownerRole: 'SOC Architect',
        dependsOn: ['SETUP-01'],
        subtasks: [
            'Size collector count based on source machine population',
            'Plan subscription types: source-initiated (push) vs collector-initiated (pull)',
            'Design ForwardedEvents channel capacity; document collector placement per site'
        ],
        configurable: false,
        configurableNote: null
    },
    'WEC-INFRA-02': {
        id: 'WEC-INFRA-02',
        name: 'Deploy & configure WEC server(s)',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WEC_WEF,
        shared: true,
        duration: '1d',
        durationHours: 8,
        ownerRole: 'Operations Team',
        dependsOn: ['WEC-INFRA-01'],
        subtasks: [
            'Install and configure Windows Event Collector role on designated servers',
            'Create WEF subscriptions matching the subscription design from WEC-INFRA-01',
            'Tune ForwardedEvents channel size; validate subscription status shows Active'
        ],
        configurable: false,
        configurableNote: null
    },
    'WEC-INFRA-03': {
        id: 'WEC-INFRA-03',
        name: 'Onboard WEC server(s) to Azure Arc',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WEC_WEF,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'Operations Team',
        dependsOn: ['WEC-INFRA-02'],
        subtasks: [
            'Install Azure Connected Machine agent on each WEC server',
            'Register in Azure portal; assign managed identity'
        ],
        configurable: false,
        configurableNote: null
    },
    'WEC-INFRA-04': {
        id: 'WEC-INFRA-04',
        name: 'Install AMA on WEC server(s)',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WEC_WEF,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'Operations Team',
        dependsOn: ['WEC-INFRA-03'],
        subtasks: [
            'Deploy Azure Monitor Agent on WEC servers',
            'Confirm AMA heartbeat visible in the workspace'
        ],
        configurable: false,
        configurableNote: null
    },
    'WEC-INFRA-05': {
        id: 'WEC-INFRA-05',
        name: 'Create WEF/Forwarded Events DCR',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.WEC_WEF,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'SOC Engineers',
        dependsOn: ['WEC-INFRA-04'],
        subtasks: [
            'Create DCR targeting the WindowsEvent (ForwardedEvents channel) table',
            'Associate WEC server resources; confirm DCR assignment'
        ],
        configurable: false,
        configurableNote: null
    },

    // -----------------------------------------------------------------------
    // Phase 1 — AMA Custom Logs Pack infrastructure
    // -----------------------------------------------------------------------
    'CL-INFRA-01': {
        id: 'CL-INFRA-01',
        name: 'Identify custom log sources',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.AMA_CUSTOM_LOGS,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'SOC Architect',
        dependsOn: ['SETUP-01'],
        subtasks: [
            'Confirm file paths, channels, or event IDs for each custom log source',
            'Document log schema (JSON / plain text / delimited) and field mapping',
            'Confirm log rotation / retention settings on source hosts'
        ],
        configurable: false,
        configurableNote: null
    },
    'CL-INFRA-02': {
        id: 'CL-INFRA-02',
        name: 'Deploy AMA on custom log source hosts',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.AMA_CUSTOM_LOGS,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'Operations Team',
        dependsOn: ['CL-INFRA-01'],
        subtasks: [
            'Install AMA on source VMs via Azure Arc extension (on-premises) or native extension (Azure VMs)',
            'Confirm AMA heartbeat visible in workspace'
        ],
        configurable: false,
        configurableNote: null
    },
    'CL-INFRA-03': {
        id: 'CL-INFRA-03',
        name: 'Create Custom Logs DCR',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.AMA_CUSTOM_LOGS,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'SOC Engineers',
        dependsOn: ['CL-INFRA-02'],
        subtasks: [
            'Define AMA custom log source in DCR: file path or Windows event channel',
            'Configure transformation (KQL ingest-time transform) if schema mapping is needed',
            'Verify log data flows to the target custom table in the workspace'
        ],
        configurable: false,
        configurableNote: null
    },

    // -----------------------------------------------------------------------
    // Phase 1 — Cribl Pack infrastructure (Sentinel-side only; replaces CEF-INFRA when active)
    // -----------------------------------------------------------------------
    'CRIBL-INFRA-01': {
        id: 'CRIBL-INFRA-01',
        name: 'Configure Cribl Stream output for Sentinel (DCE/DCR)',
        description: 'Configure the existing Cribl deployment to send data into Microsoft Sentinel',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.CRIBL,
        shared: true,
        duration: '2h',
        durationHours: 2,
        ownerRole: 'SOC Engineers',
        dependsOn: ['SETUP-02'],
        subtasks: [
            'Create or confirm the Data Collection Endpoint (DCE) in Azure',
            'Configure the Cribl Stream output for Microsoft Sentinel / Logs Ingestion API and the target DCR stream',
            'Confirm workspace, stream, and authentication settings match the Sentinel destination'
        ],
        configurable: false,
        configurableNote: null
    },
    'CRIBL-INFRA-02': {
        id: 'CRIBL-INFRA-02',
        name: 'Validate Cribl Stream data flow to Sentinel',
        description: 'Validate the existing Cribl Stream path is delivering events into the workspace',
        phase: 1,
        category: 'INFRA',
        fieldPack: FIELD_PACK.CRIBL,
        shared: true,
        duration: '30m',
        durationHours: 0.5,
        ownerRole: 'SOC Engineers',
        dependsOn: ['CRIBL-INFRA-01'],
        subtasks: [
            'Send a test event through the Cribl pipeline',
            'Confirm records land in the expected Microsoft Sentinel table / Log Analytics workspace',
            'Validate routed events retain the expected fields and timestamps'
        ],
        configurable: false,
        configurableNote: null
    },

    // -----------------------------------------------------------------------
    // Phase 3 — Content Deployment (shared, generated once)
    // -----------------------------------------------------------------------
    'CONTENT-01': {
        id: 'CONTENT-01',
        name: 'Install Content from Hub',
        description: 'Install analytics rules, workbooks, and playbooks from Content Hub',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '5m',
        durationHours: 5 / 60,
        ownerRole: 'SOC Engineers',
        dependsOn: [],
        subtasks: [
            'Open Content Hub for the selected connector set',
            'Install packaged analytics rules, workbooks, and playbooks',
            'Confirm the installed content appears in the workspace'
        ],
        configurable: false,
        configurableNote: null
    },
    'CONTENT-ANALYTICS-01': {
        id: 'CONTENT-ANALYTICS-01',
        name: 'Deploy and tune analytics rules',
        description: 'Deploy analytics rules to the workspace and tune them for the environment',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '30m',
        durationHours: 0.5,
        ownerRole: 'SOC Engineer',
        dependsOn: ['CONTENT-01'],
        subtasks: [
            'Review each analytics rule for scope, thresholds, and suppression settings',
            'Deploy selected analytics rules to the workspace',
            'Tune rule parameters and entity mappings to match the customer environment'
        ],
        configurable: false,
        configurableNote: null
    },
    'CONTENT-ANALYTICS-02': {
        id: 'CONTENT-ANALYTICS-02',
        name: 'Validate analytics rules',
        description: 'Validate that deployed analytics rules are firing correctly',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '30m',
        durationHours: 0.5,
        ownerRole: 'SOC Analyst',
        dependsOn: ['CONTENT-ANALYTICS-01'],
        subtasks: [
            'Review initial detections for expected alert behaviour',
            'Confirm analytics rules are mapped to the correct tables and time windows',
            'Document false positives and coverage gaps found during the initial review'
        ],
        configurable: false,
        configurableNote: null
    },
    'CONTENT-WORKBOOKS-01': {
        id: 'CONTENT-WORKBOOKS-01',
        name: 'Deploy and tune workbooks',
        description: 'Deploy workbooks from Content Hub and adapt them to the customer data sources',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '30m',
        durationHours: 0.5,
        ownerRole: 'SOC Engineer',
        dependsOn: ['CONTENT-01'],
        subtasks: [
            'Deploy packaged workbooks from Content Hub to the workspace',
            'Review and adapt workbook queries to match the data sources in use',
            'Confirm workbooks load and render data correctly'
        ],
        configurable: false,
        configurableNote: null
    },
    'CONTENT-WORKBOOKS-02': {
        id: 'CONTENT-WORKBOOKS-02',
        name: 'Validate workbooks',
        description: 'Validate that deployed workbooks display data correctly',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '30m',
        durationHours: 0.5,
        ownerRole: 'SOC Analyst',
        dependsOn: ['CONTENT-WORKBOOKS-01'],
        subtasks: [
            'Review each workbook for correct data rendering across all time ranges',
            'Confirm KPI tiles and visualisations reflect the expected datasets',
            'Document any gaps or missing data in the workbook views'
        ],
        configurable: false,
        configurableNote: null
    },
    'CONTENT-PLAYBOOKS-01': {
        id: 'CONTENT-PLAYBOOKS-01',
        name: 'Deploy and tune playbooks',
        description: 'Deploy Logic App playbooks and configure automation for the customer environment',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'SOC Engineer',
        dependsOn: ['CONTENT-01'],
        subtasks: [
            'Deploy Logic App playbooks from Content Hub or create new automation',
            'Configure playbook triggers, connections, and actions for the customer environment',
            'Test playbook execution end-to-end with a test alert'
        ],
        configurable: false,
        configurableNote: null
    },
    'CONTENT-PLAYBOOKS-02': {
        id: 'CONTENT-PLAYBOOKS-02',
        name: 'Validate playbooks',
        description: 'Validate that deployed playbooks execute correctly and are ready for production use',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '30m',
        durationHours: 0.5,
        ownerRole: 'SOC Analyst',
        dependsOn: ['CONTENT-PLAYBOOKS-01'],
        subtasks: [
            'Trigger a test alert to validate playbook execution end-to-end',
            'Confirm automated actions complete successfully and are audit-logged',
            'Review response times and escalation paths with the incident response team'
        ],
        configurable: false,
        configurableNote: null
    },
    // CONTENT-02 kept for backward compatibility — superseded by the CONTENT-*-01 deploy tasks
    'CONTENT-02': {
        id: 'CONTENT-02',
        name: 'Publish & Review Analytics Rules',
        description: 'Review, tune thresholds, and publish each analytics rule',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '30m',
        durationHours: 0.5,
        ownerRole: 'SOC Architect',
        dependsOn: ['CONTENT-01'],
        subtasks: [
            'Review each packaged analytics rule for scope, thresholds, and suppression settings',
            'Tune rule parameters to match the customer environment',
            'Publish the validated analytics rules into production'
        ],
        configurable: false,
        configurableNote: null
    },
    'CONTENT-03': {
        id: 'CONTENT-03',
        name: 'Initial Tuning & Review',
        description: 'First-pass review of detection coverage and alert tuning. This is ongoing — revisit monthly.',
        phase: 3,
        category: 'CONTENT',
        fieldPack: null,
        shared: true,
        duration: '4h',
        durationHours: 4,
        ownerRole: 'SOC Architect',
        dependsOn: [], // dynamically set in buildGanttPlan to join all three validation streams
        subtasks: [
            'Review initial detections for noise, suppression gaps, and coverage blind spots',
            'Record the first-pass tuning decisions and owners for follow-up tuning',
            'Schedule a monthly review cadence to revisit detection quality and alert health'
        ],
        configurable: false,
        configurableNote: null,
        ongoing: true,
        style: 'ongoing'
    },

    // -----------------------------------------------------------------------
    // Phase 4 — Operationalize (shared, generated once)
    // -----------------------------------------------------------------------
    'OPS-01': {
        id: 'OPS-01',
        name: 'Operational readiness review',
        description: 'Confirm the deployed content is ready for analyst use and handoff',
        phase: 4,
        category: 'OPS',
        fieldPack: null,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'SOC Architect',
        dependsOn: [], // dynamically set after content deployment completes
        subtasks: [
            'Review alert ownership, escalation routing, and analyst expectations for the new content',
            'Confirm playbooks and automation are ready for controlled use',
            'Document any immediate post-go-live checks the SOC should perform'
        ],
        configurable: false,
        configurableNote: null
    },
    'OPS-02': {
        id: 'OPS-02',
        name: 'Configure workbooks & dashboards',
        description: 'Organize and review the workspace dashboards after content deployment',
        phase: 4,
        category: 'OPS',
        fieldPack: null,
        shared: true,
        duration: '1h',
        durationHours: 1,
        ownerRole: 'SOC Engineers',
        dependsOn: ['OPS-01'],
        subtasks: [
            'Review Microsoft Sentinel workbooks installed from Content Hub for each selected connector',
            'Pin key visualizations to the Sentinel overview dashboard',
            'Verify data binding: confirm each workbook shows live data'
        ],
        configurable: false,
        configurableNote: null
    },
    'OPS-03': {
        id: 'OPS-03',
        name: 'Document configuration & create runbook',
        description: 'Capture the deployed configuration and handoff steps for ongoing operations',
        phase: 4,
        category: 'OPS',
        fieldPack: null,
        shared: true,
        duration: '4h',
        durationHours: 4,
        ownerRole: 'SOC Architect',
        dependsOn: ['OPS-01'],
        subtasks: [
            'Record DCR settings, content decisions, table targets, and transformation rules',
            'Document forwarder / Cribl topology with architecture diagram',
            'Document host inventory (Windows and Linux machines in scope)',
            'Create runbook for adding new connectors or machines post-go-live'
        ],
        configurable: false,
        configurableNote: null
    }
};

// ---------------------------------------------------------------------------
// Field-pack inference
// ---------------------------------------------------------------------------

/**
 * Connector IDs that belong to the Windows AMA field pack.
 * All share the same infra tasks; WEC connectors get their own separate pack.
 */
const WINDOWS_AMA_IDS = new Set([
    'windows-security-events',
    'windows-dns-events-via-ama',
    'sysmon-via-ama'
]);

const SYSLOG_CEF_IDS = new Set([
    'linux-syslog',
    'microsoft-sysmon-for-linux'
]);

/** Connector IDs that belong to the WEC/WEF field pack. */
const WEC_WEF_IDS = new Set([
    'windows-forwarded-events',
    'windows-forwarded-events-via-ama'
]);

/** Connector IDs that use the AMA Custom Logs field pack. */
const AMA_CUSTOM_LOG_IDS = new Set([
    'custom-logs-ama',
    'ama-custom-logs'
]);

const MINIMAL_CONNECTOR_PACKS = new Set([
    FIELD_PACK.NATIVE_DIRECT,
    FIELD_PACK.DIAGNOSTIC_SETTINGS,
    FIELD_PACK.API_CCP,
    FIELD_PACK.AZURE_FUNCTION
]);

function normalizeStringArray(values) {
    if (!Array.isArray(values)) return null;
    return values
        .map((value) => String(value || '').toLowerCase().trim())
        .filter(Boolean);
}

function isMinimalConnectorPack(fieldPack) {
    return MINIMAL_CONNECTOR_PACKS.has(fieldPack);
}

function inferInfrastructurePack(connector, tags) {
    const infrastructureRequired = normalizeStringArray(connector?.onboarding?.infrastructure_required);
    if (!infrastructureRequired) return null;

    if (infrastructureRequired.length === 0) {
        return tags.includes('azure') ? FIELD_PACK.DIAGNOSTIC_SETTINGS : FIELD_PACK.NATIVE_DIRECT;
    }

    const usesForwarderCollector = infrastructureRequired.includes('linux-forwarder')
        || (infrastructureRequired.includes('vm')
            && infrastructureRequired.includes('agent')
            && infrastructureRequired.includes('dcr'));

    if (usesForwarderCollector) return FIELD_PACK.SYSLOG_CEF;
    if (infrastructureRequired.includes('windows-event-collector')) return FIELD_PACK.WEC_WEF;
    if (infrastructureRequired.includes('azure-function') || infrastructureRequired.includes('logic-app')) {
        return FIELD_PACK.AZURE_FUNCTION;
    }
    if (infrastructureRequired.includes('iam-role') || infrastructureRequired.includes('service-account')) {
        return FIELD_PACK.API_CCP;
    }
    if (infrastructureRequired.includes('event-hub')) return FIELD_PACK.DIAGNOSTIC_SETTINGS;

    return FIELD_PACK.NATIVE_DIRECT;
}

/**
 * Infer the field pack for a connector from solutions.json metadata.
 * Classification priority:
 *   1. Explicit fieldPack override on the solution
 *   2. Known connector IDs / population kinds for the existing infra-backed packs
 *   3. onboarding.infrastructure_required-driven routing for infra, API, and native connectors
 *   4. Tag fallback when infrastructure metadata is unavailable
 *   5. Safe default: native-direct
 *
 * @param {Object} connector - connector/solution object from solutions.json
 * @returns {string} field pack key
 */
export function inferFieldPack(connector) {
    if (connector?.fieldPack) return connector.fieldPack;

    const id = String(connector?.id || '').toLowerCase().trim();

    if (CRIBL_CONNECTOR_IDS.has(id)) return FIELD_PACK.CRIBL;

    const populationKind = String(connector?.server_population_kind || '').toLowerCase();
    if (populationKind === 'wec') return FIELD_PACK.WEC_WEF;

    if (WEC_WEF_IDS.has(id)) return FIELD_PACK.WEC_WEF;

    if (populationKind === 'windows_ama' || WINDOWS_AMA_IDS.has(id)) return FIELD_PACK.WINDOWS_AMA;

    if (AMA_CUSTOM_LOG_IDS.has(id)) return FIELD_PACK.AMA_CUSTOM_LOGS;

    if (SYSLOG_CEF_IDS.has(id)) return FIELD_PACK.SYSLOG_CEF;

    const tags = normalizeStringArray(connector?.tags) || [];
    const infrastructurePack = inferInfrastructurePack(connector, tags);
    if (infrastructurePack) return infrastructurePack;

    if (tags.includes('cef') || tags.includes('syslog')) return FIELD_PACK.SYSLOG_CEF;
    if (tags.includes('azure')) return FIELD_PACK.NATIVE_DIRECT;

    return FIELD_PACK.NATIVE_DIRECT;
}

// ---------------------------------------------------------------------------
// Connector abbreviation generator
// ---------------------------------------------------------------------------

const _abbrevRegistry = new Map();

/**
 * Reset the abbreviation registry (call before each buildGanttPlan invocation).
 */
function resetAbbrevRegistry() {
    _abbrevRegistry.clear();
}

/**
 * Manually-curated abbreviations for well-known connector IDs.
 * Avoids algorithmic collisions for the most common connectors.
 */
const KNOWN_ABBREVS = {
    'windows-security-events': 'WSE',
    'windows-forwarded-events': 'WFE',
    'windows-forwarded-events-via-ama': 'WFEA',
    'windows-dns-events-via-ama': 'WDNS',
    'sysmon-via-ama': 'SYSMON',
    'cisco-asa-2': 'ASA',
    'cisco-firepower': 'FPW',
    'cisco-meraki': 'MERAKI',
    'palo-alto-networks': 'PAN',
    'azure-cloud-ngfw-by-palo-alto-networks': 'PAN-NGFW',
    'palo-alto-prisma-cloud-2': 'PRISMA',
    'fortinet-fortigate': 'FORTI',
    'f5-big-ip': 'F5',
    'checkpoint': 'CHKP',
    'barracuda-waf': 'BWAF',
    'common-event-format': 'CEF',
    'linux-syslog': 'LSYS',
    'microsoft-sysmon-for-linux': 'SYSML',
    'cribl-stream': 'CRIBL'
};

/**
 * Derive a short uppercase abbreviation from a connector ID string.
 * Uses the curated KNOWN_ABBREVS map first, then falls back to algorithmic generation.
 * Guarantees uniqueness by appending a counter on collision.
 *
 * @param {string} connectorId
 * @param {string} connectorName - display name, used as fallback for abbreviation
 * @returns {string} e.g. "ASA", "PAN-NGFW", "CONN-2"
 */
export function makeConnectorAbbrev(connectorId, connectorName = '') {
    const id = String(connectorId || '').toLowerCase().trim();

    if (KNOWN_ABBREVS[id]) {
        const base = KNOWN_ABBREVS[id];
        if (!_abbrevRegistry.has(base)) {
            _abbrevRegistry.set(base, connectorId);
            return base;
        }
        if (_abbrevRegistry.get(base) === connectorId) return base;
        // Collision: same abbreviation, different connector — append counter
        let counter = 2;
        while (_abbrevRegistry.has(`${base}-${counter}`)) counter++;
        const unique = `${base}-${counter}`;
        _abbrevRegistry.set(unique, connectorId);
        return unique;
    }

    // Algorithmic fallback: take significant words from the ID and uppercase initials
    const parts = id
        .replace(/[^a-z0-9\s-]/g, '')
        .split(/[-\s]+/)
        .filter((p) => p.length > 1 && !['via', 'by', 'for', 'the', 'and', 'of'].includes(p));

    let base;
    if (parts.length === 1) {
        base = parts[0].slice(0, 5).toUpperCase();
    } else if (parts.length === 2) {
        base = parts.map((p) => p.slice(0, 3).toUpperCase()).join('-');
    } else {
        // Take first letter of first 3 significant parts
        base = parts.slice(0, 3).map((p) => p[0].toUpperCase()).join('');
    }

    if (!base) base = 'CONN';

    let candidate = base;
    let counter = 2;
    while (_abbrevRegistry.has(candidate)) {
        candidate = `${base}-${counter++}`;
    }
    _abbrevRegistry.set(candidate, connectorId);
    return candidate;
}

// ---------------------------------------------------------------------------
// Per-connector task builder
// ---------------------------------------------------------------------------

/**
 * Per-connector task overrides: connector-specific source-configuration subtasks.
 * Keyed by connector ID.
 * Each entry can override: subtasks[], durationHours for PC-02.
 */
const PER_CONNECTOR_OVERRIDES = {
    'cisco-asa-2': {
        sourceCfgName: 'Configure Cisco ASA syslog output to forwarder',
        sourceCfgSubtasks: [
            'Configure ASA: logging host <Forwarder-IP> 6514 format emblem',
            'Set logging level: informational or above',
            'Test: logging list SENTINEL level informational class ip'
        ],
        sourceCfgHours: 1.5
    },
    'palo-alto-networks': {
        sourceCfgName: 'Configure PAN-OS syslog profile',
        sourceCfgSubtasks: [
            'Create syslog server profile in PAN-OS (Panorama or device-level)',
            'Select log types: Traffic, Threat, URL Filtering, WildFire',
            'Assign profile to security policy; set format to CEF or LEEF',
            'Test syslog connectivity from PAN-OS device manager'
        ],
        sourceCfgHours: 1.5
    },
    'azure-cloud-ngfw-by-palo-alto-networks': {
        sourceCfgName: 'Configure PAN NGFW (Azure-native) syslog output',
        sourceCfgSubtasks: [
            'Configure Azure Cloud NGFW to forward logs to Cribl or forwarder',
            'Set CEF format and log types',
            'Validate connectivity from Azure NGFW diagnostic settings'
        ],
        sourceCfgHours: 1
    },
    'windows-security-events': {
        sourceCfgName: 'Configure Windows Security Audit Policy',
        sourceCfgSubtasks: [
            'Configure Group Policy or local policy for Security Audit',
            'Select specific Event IDs to collect (e.g. 4624, 4625, 4648, 4672, 4688)',
            'Confirm policy has been applied to all target machines via gpresult'
        ],
        sourceCfgHours: 2
    },
    'windows-forwarded-events-via-ama': {
        sourceCfgName: 'Design and configure WEF subscription scope',
        sourceCfgSubtasks: [
            'Design WEF subscription scope: source-initiated (push) vs collector-initiated (pull)',
            'Configure subscription FQDNs; set delivery optimisation mode',
            'Validate subscription status shows Active on all source machines'
        ],
        sourceCfgHours: 3
    },
    'windows-forwarded-events': {
        sourceCfgName: 'Design and configure WEF subscription scope',
        sourceCfgSubtasks: [
            'Design WEF subscription scope: source-initiated vs collector-initiated',
            'Configure subscription FQDNs; validate subscription health',
            'Confirm ForwardedEvents channel is populated'
        ],
        sourceCfgHours: 3
    },
    'windows-dns-events-via-ama': {
        sourceCfgName: 'Enable DNS Analytical logging on DNS servers',
        sourceCfgSubtasks: [
            'Enable DNS Analytical logging via PowerShell or DNS Manager',
            'Configure DNS debug log path; confirm ETW provider is active',
            'Validate DNS events appear in Event Viewer Analytic channel'
        ],
        sourceCfgHours: 2
    },
    'sysmon-via-ama': {
        sourceCfgName: 'Deploy Sysmon with configuration XML',
        sourceCfgSubtasks: [
            'Deploy Sysmon on Windows targets with approved config XML (e.g. SwiftOnSecurity or custom)',
            'Deploy sysmon-for-linux on Linux targets if applicable',
            'Validate: System Monitor events appear under Microsoft-Windows-Sysmon/Operational'
        ],
        sourceCfgHours: 3
    },
    'cribl-stream': {
        sourceCfgName: 'Configure Cribl as ingestion intermediary',
        sourceCfgSubtasks: [
            'Map source connectors to Cribl pipeline routes',
            'Validate routing table: each connector type flows to correct Sentinel destination',
            'Test end-to-end: send synthetic events through each configured pipeline'
        ],
        sourceCfgHours: 3
    }
};

function mergeDependencies(...dependencyGroups) {
    return [...new Set(dependencyGroups.flat().filter(Boolean))];
}

function buildPermissionTasks(connector, abbrev) {
    const id = String(connector?.id || '').toLowerCase().trim();
    const name = connector?.name || id;
    const fieldPack = inferFieldPack(connector);
    const verifyId = `${abbrev}-PERM-01`;
    const assignId = `${abbrev}-PERM-02`;

    const base = {
        phase: 2,
        fieldPack,
        shared: false,
        connectorId: connector.id,
        connectorName: name,
        configurable: false,
        configurableNote: null
    };

    return {
        gateTaskId: assignId,
        tasks: [
            {
                ...base,
                id: verifyId,
                name: `${name} — Verify Permissions`,
                description: 'Verify required RBAC permissions for this connector',
                category: 'PERM',
                duration: '5m',
                durationHours: 5 / 60,
                ownerRole: 'SOC Engineers',
                dependsOn: ['SETUP-01'],
                subtasks: [
                    'Review the connector permission requirements from the solution metadata or Microsoft documentation',
                    'Confirm the deploying identity already has the required Sentinel / Azure / source-system roles',
                    'Mark the task complete automatically when the required roles are detected'
                ],
                autoComplete: true,
                conditional: false
            },
            {
                ...base,
                id: assignId,
                name: `${name} — Assign Permissions`,
                description: 'Assign required roles if missing (Sentinel Contributor, etc.)',
                category: 'PERM',
                duration: '15m',
                durationHours: 0.25,
                ownerRole: 'SOC Engineers',
                dependsOn: [verifyId],
                subtasks: [
                    'Assign any missing RBAC roles or delegated permissions required by the connector',
                    'Re-check access to the Sentinel workspace and any upstream source platform',
                    'Mark the task complete automatically once the missing permissions are resolved'
                ],
                autoComplete: true,
                conditional: true,
                conditionNote: 'Only needed when Verify Permissions detects missing roles.'
            }
        ]
    };
}

function getAnalyticsRuleReviewHours(connectors) {
    if (!Array.isArray(connectors) || connectors.length === 0) return 0.5;

    const totalRules = connectors.reduce((sum, connector) => {
        const analyticsCount = Number(connector?.analytics);
        if (Number.isFinite(analyticsCount) && analyticsCount >= 0) {
            return sum + analyticsCount;
        }
        return sum + 6;
    }, 0);

    return totalRules > 0 ? totalRules * (5 / 60) : 0.5;
}

/**
 * Build per-connector tasks for a single connector.
 * Universal permission tasks are generated separately and passed in as the connector gate.
 *
 * @param {Object} connector - connector/solution object
 * @param {string} abbrev - short abbreviation (e.g. "ASA")
 * @param {string} dependencyTaskId - ID of the upstream setup or infra task this set depends on
 * @param {string} permissionTaskId - ID of the universal connector permission gate task
 * @returns {Array<Object>} array of task objects for the connector
 */
function buildPerConnectorTasks(connector, abbrev, dependencyTaskId, permissionTaskId) {
    const id = String(connector?.id || '').toLowerCase().trim();
    const name = connector?.name || id;
    const overrides = PER_CONNECTOR_OVERRIDES[id] || {};
    const fieldPack = inferFieldPack(connector);

    const pc01Id = `${abbrev}-01`;
    const pc02Id = `${abbrev}-02`;
    const pc03Id = `${abbrev}-03`;
    const pc04Id = `${abbrev}-04`;
    const entryDependsOn = mergeDependencies([dependencyTaskId], [permissionTaskId]);

    const base = {
        phase: 2,
        fieldPack,
        shared: false,
        connectorId: connector.id,
        connectorName: name,
        configurable: false,
        configurableNote: null
    };

    if (fieldPack === FIELD_PACK.NATIVE_DIRECT) {
        return [
            {
                ...base,
                id: pc01Id,
                name: `${name} — Enable Connector`,
                description: 'Enable the connector in Microsoft Sentinel',
                category: 'SENT-CFG',
                duration: '5m',
                durationHours: 5 / 60,
                ownerRole: 'SOC Engineers',
                dependsOn: entryDependsOn,
                subtasks: [
                    `Open Microsoft Sentinel → Data Connectors → ${name}`,
                    'Enable the connector in Microsoft Sentinel',
                    'Confirm the connector reports as connected and ready for validation'
                ]
            },
            {
                ...base,
                id: pc02Id,
                name: `${name} — Validate Data Flow`,
                description: 'Verify data is flowing into the workspace',
                category: 'VALID',
                duration: '15m',
                durationHours: 0.25,
                ownerRole: 'SOC Engineers',
                dependsOn: [pc01Id],
                subtasks: [
                    'Run a quick validation query in the target table',
                    'Confirm recent records are arriving in the workspace',
                    'Spot-check the expected entities / timestamps for the connector'
                ]
            }
        ];
    }

    if (isMinimalConnectorPack(fieldPack)) {
        return [
            {
                ...base,
                id: pc01Id,
                name: `${name} — Enable connector in Sentinel`,
                description: 'Complete the connector onboarding flow in Microsoft Sentinel',
                category: 'SENT-CFG',
                duration: '30m',
                durationHours: 0.5,
                ownerRole: 'SOC Engineers',
                dependsOn: entryDependsOn,
                subtasks: [
                    `Open Microsoft Sentinel → Data Connectors → ${name}`,
                    'Complete the native/API onboarding steps in the connector blade',
                    'Verify connector shows as Connected and ready for downstream content'
                ]
            }
        ];
    }

    const enableDurationHours = fieldPack === FIELD_PACK.SYSLOG_CEF ? (5 / 60) : 0.5;

    return [
        {
            ...base,
            id: pc01Id,
            name: `${name} — Enable connector in Sentinel`,
            description: 'Enable the connector and confirm the Sentinel-side configuration is ready',
            category: 'SENT-CFG',
            duration: formatTaskDuration(enableDurationHours),
            durationHours: enableDurationHours,
            ownerRole: 'SOC Engineers',
            dependsOn: entryDependsOn,
            subtasks: [
                `Open Microsoft Sentinel → Data Connectors → ${name}`,
                'Confirm DCR association from the infra phase',
                'Verify connector shows as Connected'
            ]
        },
        {
            ...base,
            id: pc02Id,
            name: overrides.sourceCfgName || `${name} — Configure source device/service`,
            description: 'Configure the source platform or device to deliver data to the Sentinel ingestion path',
            category: 'SRC-CFG',
            duration: overrides.sourceCfgHours ? formatTaskDuration(overrides.sourceCfgHours) : '1h',
            durationHours: overrides.sourceCfgHours || 1,
            ownerRole: 'Operations Team',
            dependsOn: [pc01Id],
            subtasks: overrides.sourceCfgSubtasks || [
                `Configure ${name} to send logs to the forwarder or Cribl listener`,
                'Set log format (CEF / Syslog), facility, severity level',
                'Test connectivity: verify log flow from source to forwarder'
            ]
        },
        {
            ...base,
            id: pc03Id,
            name: `${name} — Validate data ingestion`,
            description: 'Validate the connector data lands in the expected Microsoft Sentinel table',
            category: 'VALID',
            duration: '1h',
            durationHours: 1,
            ownerRole: 'SOC Engineers',
            dependsOn: [pc02Id],
            subtasks: [
                `Run KQL query against the target table to confirm ${name} events`,
                'Check event count, timestamp recency, and DeviceVendor/DeviceProduct fields',
                'Verify at least one complete, parseable event is present'
            ]
        },
        {
            ...base,
            id: pc04Id,
            name: `${name} — Tune collection`,
            description: 'Refine the collected signal set after initial validation',
            category: 'VALID',
            duration: '1h',
            durationHours: 1,
            ownerRole: 'SOC Engineers',
            dependsOn: [pc03Id],
            subtasks: [
                'Refine DCR filters: event IDs, facilities, or severity levels for cost/coverage balance',
                'Remove or add event sources based on initial data review',
                'Document final filter configuration for the runbook'
            ]
        }
    ];
}

// ---------------------------------------------------------------------------
// Duration override support
// ---------------------------------------------------------------------------

/**
 * Load task-level duration overrides from localStorage.
 * Returns an object: { [taskId]: { durationHours: number } }
 *
 * @returns {Object}
 */
function loadDurationOverrides() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return {};
        const raw = window.localStorage.getItem(DURATION_OVERRIDE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed?.ganttTaskOverrides && typeof parsed.ganttTaskOverrides === 'object'
            ? parsed.ganttTaskOverrides
            : {};
    } catch {
        return {};
    }
}

/**
 * Apply duration overrides to a task object (mutates a copy).
 *
 * @param {Object} task
 * @param {Object} overrides
 * @returns {Object} task with durationHours replaced if an override exists
 */
function applyDurationOverride(task, overrides) {
    const override = overrides?.[task.id];
    if (!override || typeof override.durationHours !== 'number') return task;
    return { ...task, durationHours: override.durationHours };
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * Given a list of selected connectors from app state, generate a complete Gantt task plan.
 *
 * The returned `tasks` array is ordered:
 *   Phase 0 (SETUP-01, SETUP-02)
 *   → universal permission tasks per connector
 *   → Phase 1 infra blocks (one per field pack, alphabetical pack order)
 *   → remaining Phase 2 per-connector tasks (grouped by connector, in selection order)
 *   → Phase 3 content deployment (CONTENT-01 → CONTENT-ANALYTICS-01/02, CONTENT-WORKBOOKS-01/02, CONTENT-PLAYBOOKS-01/02 → CONTENT-03)
 *   → Phase 4 (OPS-01, OPS-02, OPS-03)
 *
 * @param {Array<Object>} selectedConnectors - connector/solution objects from solutions.json
 * @returns {{
 *   tasks: Array<Object>,
 *   phases: Array<{phase: number, name: string, taskIds: string[]}>,
 *   criticalPath: string[],
 *   summary: {
 *     totalConnectors: number,
 *     fieldPacks: string[],
 *     criblActive: boolean,
 *     totalTaskCount: number,
 *     sharedTaskCount: number,
 *     perConnectorTaskCount: number
 *   }
 * }}
 */
export function buildGanttPlan(selectedConnectors) {
    resetAbbrevRegistry();

    const connectors = Array.isArray(selectedConnectors) ? selectedConnectors : [];
    const overrides = loadDurationOverrides();

    // 1. Detect Cribl
    const criblActive = connectors.some((c) => CRIBL_CONNECTOR_IDS.has(String(c?.id || '').toLowerCase()));

    // 2. Collect connectors that actually need task generation
    //    (exclude Cribl Stream itself from per-connector tasks — it's infra, not a data source)
    const taskableConnectors = connectors.filter(
        (c) => !CRIBL_CONNECTOR_IDS.has(String(c?.id || '').toLowerCase())
    );

    // 3. Identify unique field packs needed
    const packsNeeded = new Set();
    const connectorPackMap = new Map(); // connectorId → fieldPack metadata

    for (const connector of taskableConnectors) {
        const pack = inferFieldPack(connector);
        if (pack) {
            // If Cribl is active, syslog-cef connectors use the Cribl pack for infra.
            const effectivePack = (criblActive && pack === FIELD_PACK.SYSLOG_CEF)
                ? FIELD_PACK.CRIBL
                : pack;
            packsNeeded.add(effectivePack);
            connectorPackMap.set(connector.id, {
                sourcePack: pack,
                infraPack: effectivePack,
                minimalPack: isMinimalConnectorPack(pack)
            });
        }
    }

    // If Cribl is active and Cribl pack is not yet queued (possible if only Cribl Stream itself
    // was selected with no CEF connectors), still add it so the infra block generates.
    if (criblActive) packsNeeded.add(FIELD_PACK.CRIBL);

    // 4. Precompute abbreviations + universal permission tasks per connector.
    const connectorTaskMeta = taskableConnectors.map((connector) => {
        const abbrev = makeConnectorAbbrev(connector.id, connector.name);
        const permissionPlan = buildPermissionTasks(connector, abbrev);
        return {
            connector,
            abbrev,
            permissionTaskId: permissionPlan.gateTaskId,
            permissionTasks: permissionPlan.tasks
        };
    });

    // 5. Build task list
    const tasks = [];

    // Phase 0 — always generated once
    for (const taskId of ['SETUP-01', 'SETUP-02']) {
        tasks.push(applyDurationOverride(TASK_CATALOG[taskId], overrides));
    }

    // Universal permission tasks are surfaced before infra so they are first in each connector chain.
    for (const { permissionTasks } of connectorTaskMeta) {
        for (const task of permissionTasks) {
            tasks.push(applyDurationOverride(task, overrides));
        }
    }

    // Phase 1 — one infra block per required field pack
    const PACK_ORDER = [
        FIELD_PACK.WINDOWS_AMA,
        FIELD_PACK.WEC_WEF,
        FIELD_PACK.SYSLOG_CEF,
        FIELD_PACK.AMA_CUSTOM_LOGS,
        FIELD_PACK.CRIBL
    ];

    for (const pack of PACK_ORDER) {
        if (!packsNeeded.has(pack)) continue;

        // If Cribl is active, skip CEF-INFRA entirely
        if (criblActive && pack === FIELD_PACK.SYSLOG_CEF) continue;

        const packPermissionTaskIds = connectorTaskMeta
            .filter(({ connector }) => {
                const packInfo = connectorPackMap.get(connector.id);
                return packInfo && !packInfo.minimalPack && packInfo.infraPack === pack;
            })
            .map(({ permissionTaskId }) => permissionTaskId);

        const packInfraTasks = Object.values(TASK_CATALOG)
            .filter((t) => t.fieldPack === pack && t.phase === 1)
            .sort((a, b) => a.id.localeCompare(b.id));

        packInfraTasks.forEach((task, index) => {
            const effectiveTask = index === 0
                ? { ...task, dependsOn: mergeDependencies(task.dependsOn, packPermissionTaskIds) }
                : task;
            tasks.push(applyDurationOverride(effectiveTask, overrides));
        });
    }

    // Phase 2 — per-connector tasks (in selection order)
    const connectorCompletionTaskIds = [];

    for (const { connector, abbrev, permissionTaskId } of connectorTaskMeta) {
        const packInfo = connectorPackMap.get(connector.id);
        if (!packInfo) continue;

        const joinTaskId = packInfo.minimalPack
            ? 'SETUP-02'
            : (criblActive && packInfo.sourcePack === FIELD_PACK.SYSLOG_CEF
                ? PACK_JOIN_TASK[FIELD_PACK.CRIBL]
                : PACK_JOIN_TASK[packInfo.infraPack]);

        if (!joinTaskId) continue;

        const pcTasks = buildPerConnectorTasks(connector, abbrev, joinTaskId, permissionTaskId);

        for (const task of pcTasks) {
            tasks.push(applyDurationOverride(task, overrides));
        }

        const completionTaskId = pcTasks.at(-1)?.id || permissionTaskId;
        if (completionTaskId) connectorCompletionTaskIds.push(completionTaskId);
    }

    // Phase 3 — always generated once, content deployment waits for connector completion.
    const contentEntryDependencies = connectorCompletionTaskIds.length > 0
        ? connectorCompletionTaskIds
        : ['SETUP-02'];
    const analyticsReviewHours = getAnalyticsRuleReviewHours(taskableConnectors);
    const content01 = {
        ...TASK_CATALOG['CONTENT-01'],
        dependsOn: contentEntryDependencies
    };
    // Analytics deploy duration scales with rule count; workbooks and playbooks use catalog defaults.
    const contentAnalytics01 = {
        ...TASK_CATALOG['CONTENT-ANALYTICS-01'],
        durationHours: analyticsReviewHours,
        duration: formatTaskDuration(analyticsReviewHours)
    };
    // CONTENT-03 joins all three validation streams before the ongoing tuning step.
    const content03 = {
        ...TASK_CATALOG['CONTENT-03'],
        dependsOn: ['CONTENT-ANALYTICS-02', 'CONTENT-WORKBOOKS-02', 'CONTENT-PLAYBOOKS-02']
    };
    tasks.push(applyDurationOverride(content01, overrides));
    tasks.push(applyDurationOverride(contentAnalytics01, overrides));
    tasks.push(applyDurationOverride(TASK_CATALOG['CONTENT-ANALYTICS-02'], overrides));
    tasks.push(applyDurationOverride(TASK_CATALOG['CONTENT-WORKBOOKS-01'], overrides));
    tasks.push(applyDurationOverride(TASK_CATALOG['CONTENT-WORKBOOKS-02'], overrides));
    tasks.push(applyDurationOverride(TASK_CATALOG['CONTENT-PLAYBOOKS-01'], overrides));
    tasks.push(applyDurationOverride(TASK_CATALOG['CONTENT-PLAYBOOKS-02'], overrides));
    tasks.push(applyDurationOverride(content03, overrides));

    // Phase 4 — always generated once, operationalize waits for content deployment.
    const ops01 = {
        ...TASK_CATALOG['OPS-01'],
        dependsOn: ['CONTENT-03']
    };
    tasks.push(applyDurationOverride(ops01, overrides));
    tasks.push(applyDurationOverride(TASK_CATALOG['OPS-02'], overrides));
    tasks.push(applyDurationOverride(TASK_CATALOG['OPS-03'], overrides));

    // 6. Build phase summary
    const phaseDefs = [
        { phase: 0, name: 'Project Setup' },
        { phase: 1, name: 'Infrastructure' },
        { phase: 2, name: 'Per-Connector Configuration' },
        { phase: 3, name: 'Content Deployment' },
        { phase: 4, name: 'Operationalize' }
    ];
    const phases = phaseDefs.map(({ phase, name }) => ({
        phase,
        name,
        taskIds: tasks.filter((t) => t.phase === phase).map((t) => t.id)
    }));

    // 7. Critical path (longest sequential chain — simplified topological walk)
    const criticalPath = computeCriticalPath(tasks);

    const sharedTasks = tasks.filter((t) => t.shared);
    const perConnectorTasks = tasks.filter((t) => !t.shared);

    return {
        tasks,
        phases,
        criticalPath,
        summary: {
            totalConnectors: taskableConnectors.length,
            fieldPacks: [...packsNeeded],
            criblActive,
            totalTaskCount: tasks.length,
            sharedTaskCount: sharedTasks.length,
            perConnectorTaskCount: perConnectorTasks.length
        }
    };
}

// ---------------------------------------------------------------------------
// Duration calculator
// ---------------------------------------------------------------------------

/**
 * Calculate total plan duration considering parallelism between field-pack infra
 * blocks and per-connector tasks.
 *
 * Returns:
 *   totalDays           — wall-clock business days from start to finish (critical path)
 *   criticalPathDays    — same as totalDays (alias for clarity)
 *   phases              — per-phase duration breakdown
 *   totalHours          — sum of all task hours (ignores parallelism)
 *
 * @param {Array<Object>} tasks - output of buildGanttPlan().tasks
 * @returns {{totalDays: number, criticalPathDays: number, totalHours: number, phases: Array}}
 */
export function calculatePlanDuration(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
        return { totalDays: 0, criticalPathDays: 0, totalHours: 0, phases: [] };
    }

    // Build a map: taskId → task
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // Compute earliest finish time (in hours) for each task via topological sort
    const finishTime = new Map();

    function getFinishTime(taskId) {
        if (finishTime.has(taskId)) return finishTime.get(taskId);

        const task = taskMap.get(taskId);
        if (!task) return 0;

        const depsFinish = (task.dependsOn || [])
            .map((depId) => getFinishTime(depId))
            .reduce((max, t) => Math.max(max, t), 0);

        const duration = Math.max(0, Number(task.durationHours) || 0);
        const finish = depsFinish + duration;
        finishTime.set(taskId, finish);
        return finish;
    }

    for (const task of tasks) {
        getFinishTime(task.id);
    }

    const maxFinishHours = Math.max(...finishTime.values(), 0);
    const totalHours = tasks.reduce((sum, t) => sum + (Number(t.durationHours) || 0), 0);
    const criticalPathDays = Math.ceil(maxFinishHours / HOURS_PER_DAY);

    // Per-phase breakdown (sequential within each phase group, parallel across pack-level groups)
    const phaseDefs = [0, 1, 2, 3, 4];
    const phases = phaseDefs.map((phase) => {
        const phaseTasks = tasks.filter((t) => t.phase === phase);
        const phaseFinish = phaseTasks.length > 0
            ? Math.max(...phaseTasks.map((t) => finishTime.get(t.id) || 0))
            : 0;
        const phaseStart = phaseTasks.length > 0
            ? Math.min(...phaseTasks.map((t) => {
                const task = taskMap.get(t.id);
                const depsFinish = (task?.dependsOn || [])
                    .map((id) => finishTime.get(id) || 0)
                    .reduce((m, v) => Math.max(m, v), 0);
                return depsFinish;
            }))
            : 0;
        return {
            phase,
            name: ['Project Setup', 'Infrastructure', 'Per-Connector Configuration', 'Content Deployment', 'Operationalize'][phase],
            durationHours: phaseFinish - phaseStart,
            durationDays: Math.ceil((phaseFinish - phaseStart) / HOURS_PER_DAY)
        };
    });

    return {
        totalDays: criticalPathDays,
        criticalPathDays,
        totalHours,
        phases
    };
}

// ---------------------------------------------------------------------------
// Critical path helper
// ---------------------------------------------------------------------------

/**
 * Compute the critical path as an ordered list of task IDs (longest dependency chain).
 * Uses backward pass from the task with the latest finish time.
 *
 * @param {Array<Object>} tasks
 * @returns {string[]} ordered task IDs on the critical path
 */
function computeCriticalPath(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) return [];

    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const finishTime = new Map();

    function getFinishTime(taskId) {
        if (finishTime.has(taskId)) return finishTime.get(taskId);
        const task = taskMap.get(taskId);
        if (!task) return 0;
        const depsFinish = (task.dependsOn || [])
            .map(getFinishTime)
            .reduce((max, t) => Math.max(max, t), 0);
        const finish = depsFinish + Math.max(0, Number(task.durationHours) || 0);
        finishTime.set(taskId, finish);
        return finish;
    }

    for (const task of tasks) getFinishTime(task.id);

    // Find task with latest finish
    let latestFinish = 0;
    let latestTaskId = null;
    for (const [id, finish] of finishTime) {
        if (finish > latestFinish) {
            latestFinish = finish;
            latestTaskId = id;
        }
    }

    if (!latestTaskId) return [];

    // Backward trace: at each task, follow the dependency with the highest finish time
    const path = [];
    let current = latestTaskId;

    while (current) {
        path.unshift(current);
        const task = taskMap.get(current);
        if (!task || !task.dependsOn?.length) break;

        let nextId = null;
        let nextFinish = -1;
        for (const depId of task.dependsOn) {
            const depFinish = finishTime.get(depId) || 0;
            if (depFinish > nextFinish) {
                nextFinish = depFinish;
                nextId = depId;
            }
        }
        current = nextId;
    }

    return path;
}

// ---------------------------------------------------------------------------
// Utility exports (consumed by planning/Gantt rendering layer)
// ---------------------------------------------------------------------------

/**
 * Convert a durationHours value to the canonical display string used in the planner.
 * Examples: 0.5 → "30m", 1 → "1h", 8 → "1d", 40 → "1w"
 *
 * @param {number} hours
 * @returns {string}
 */
export function formatTaskDuration(hours) {
    const h = Math.max(0, Number(hours) || 0);
    if (h === 0) return '0h';
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < HOURS_PER_DAY) return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
    const days = h / HOURS_PER_DAY;
    if (days < 5) return `${days % 1 === 0 ? days : days.toFixed(1)}d`;
    const weeks = days / 5;
    return `${weeks % 1 === 0 ? weeks : weeks.toFixed(1)}w`;
}

/**
 * Convert a duration string ("30m", "1h", "2d", "1w") to business hours.
 *
 * @param {string} durationStr
 * @returns {number} hours
 */
export function parseDurationToHours(durationStr) {
    const s = String(durationStr || '').trim().toLowerCase();
    const match = s.match(/^(\d+(?:\.\d+)?)\s*(m|h|d|w)$/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    switch (match[2]) {
        case 'm': return value / 60;
        case 'h': return value;
        case 'd': return value * HOURS_PER_DAY;
        case 'w': return value * HOURS_PER_WEEK;
        default:  return 0;
    }
}

/**
 * Return all infra task IDs for a given field pack (ordered, phase 1 only).
 *
 * @param {string} fieldPack
 * @returns {string[]}
 */
export function getPackInfraTaskIds(fieldPack) {
    return Object.values(TASK_CATALOG)
        .filter((t) => t.fieldPack === fieldPack && t.phase === 1)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((t) => t.id);
}

/**
 * Return the join-node task ID for a field pack (the last infra task that
 * per-connector tasks depend on).
 *
 * @param {string} fieldPack
 * @param {boolean} [criblActive=false]
 * @returns {string|null}
 */
export function getPackJoinTaskId(fieldPack, criblActive = false) {
    if (criblActive && fieldPack === FIELD_PACK.SYSLOG_CEF) {
        return PACK_JOIN_TASK[FIELD_PACK.CRIBL];
    }
    return PACK_JOIN_TASK[fieldPack] || null;
}
