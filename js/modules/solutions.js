import { clearConnectorCriblIngestion, getConnectorCapacitySnapshot, saveConnectorCapacityValues } from '../gantt-planner.js?v=17';
import {
    createDefaultSizingDraft,
    estimateWecServersForSourceComputers,
    getCollectorVmZoneLabel,
    getSolutionCapacityProfile,
    normalizeCollectorVmZone,
    getSizingBadgeText,
    getSizingBadgeTone,
    getSizingDetailLines,
    getSizingResultMessages,
    WEC_AMA_EPS_LIMIT,
    WEC_ENVIRONMENTAL_CLIENTS_MAX,
    WEC_RECOMMENDED_CLIENTS_PER_SERVER,
    WEC_RECOMMENDED_CPU_COUNT,
    WEC_RECOMMENDED_RAM_GB,
    WEC_TYPICAL_CLIENTS_MAX,
    WEC_TYPICAL_CLIENTS_MIN
} from './capacity.js?v=18';

const INTEGER_FORMATTER = new Intl.NumberFormat('en-US');

function formatInteger(value = 0) {
    return INTEGER_FORMATTER.format(Number(value) || 0);
}

function createWecSizingGuidanceCallout() {
    const callout = document.createElement('div');
    callout.className = 'solution-sizing-guidance';

    const title = document.createElement('strong');
    title.className = 'solution-sizing-guidance__title';
    title.textContent = 'WEC sizing guidance';

    const guidanceList = document.createElement('ul');
    guidanceList.className = 'solution-sizing-guidance__list';
    [
        `Each WEC server can handle ~${formatInteger(WEC_TYPICAL_CLIENTS_MIN)}–${formatInteger(WEC_TYPICAL_CLIENTS_MAX)} source computers (up to ${formatInteger(WEC_ENVIRONMENTAL_CLIENTS_MAX)} depending on environment).`,
        `AMA agent limit: ${formatInteger(WEC_AMA_EPS_LIMIT)} EPS per WEC server.`,
        `Recommended hardware: ${formatInteger(WEC_RECOMMENDED_RAM_GB)} GB RAM, ${formatInteger(WEC_RECOMMENDED_CPU_COUNT)} CPUs per WEC server.`
    ].forEach((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        guidanceList.appendChild(item);
    });

    callout.append(title, guidanceList);
    return callout;
}

const SEARCH_SYNONYMS = new Map([
    ['aws', ['amazon', 'amazon web services']],
    ['amazon', ['aws']],
    ['gcp', ['google cloud', 'google cloud platform']],
    ['google cloud', ['gcp']],
    ['google', ['gcp', 'google cloud platform']],
    ['mde', ['microsoft defender for endpoint', 'defender for endpoint']],
    ['mdi', ['microsoft defender for identity', 'defender for identity']],
    ['mda', ['microsoft defender for cloud apps', 'defender for cloud apps']],
    ['mdo', ['microsoft defender for office', 'defender for office 365']],
    ['xdr', ['microsoft defender xdr', 'defender xdr']],
    ['mdti', ['microsoft defender threat intelligence']],
    ['m365', ['microsoft 365']],
    ['o365', ['microsoft 365', 'office 365']],
    ['aad', ['entra', 'microsoft entra id', 'azure ad']],
    ['azure ad', ['entra', 'microsoft entra id', 'aad']],
    ['entra', ['microsoft entra id', 'aad', 'azure ad']],
    ['sentinel', ['microsoft sentinel']],
    ['crowdstrike', ['crowd strike']],
    ['crowd strike', ['crowdstrike']],
    ['sentinelone', ['sentinel one']],
    ['sentinel one', ['sentinelone']],
    ['paloalto', ['palo alto']],
    ['palo alto', ['paloalto', 'pan', 'panw']],
    ['pan', ['palo alto']],
    ['panw', ['palo alto']],
    ['checkpoint', ['check point']],
    ['check point', ['checkpoint']],
    ['fortigate', ['fortinet forti gate', 'fortinet']],
    ['fortinet', ['fortigate', 'fortinet forti gate']],
    ['vmware', ['v mware']],
    ['v mware', ['vmware']],
    ['mcafee', ['mc afee']],
    ['mc afee', ['mcafee']],
    ['extrahop', ['extra hop']],
    ['extra hop', ['extrahop']],
    ['cyberark', ['cyber ark']],
    ['cyber ark', ['cyberark']],
    ['proofpoint', ['proof point']],
    ['proof point', ['proofpoint']],
    ['zscaler', ['zpa', 'zia']],
    ['zpa', ['zscaler private access']],
    ['zia', ['zscaler internet access']],
    ['edr', ['endpoint', 'endpoint detection']],
    ['dlp', ['data loss prevention']],
    ['waf', ['web application firewall']],
    ['iam', ['identity', 'access management']],
    ['casb', ['cloud access security broker']],
    ['ndr', ['network detection']],
    ['siem', ['sentinel', 'splunk']]
]);

export let solutionsData = null;
export const selectedCategories = new Set();
export const selectedSolutions = new Set();
export const selectedVendors = new Set(['azure', 'microsoft365']);
export const connectedSolutionIds = new Set();
export const deprecatedConnectedSolutionIds = new Map(); // solutionId → { connectorName, reason }
export let workspaceSyntheticSolutions = [];
export let workspaceConnectorSummary = null;
let solutionLastLogMap = new Map(); // solutionId → ISO timestamp of last log received

const SELECTED_SOLUTIONS_STORAGE_KEY = 'sentinelPlanner.selectedSolutions';
const CONNECTED_SOLUTIONS_STORAGE_KEY = 'sentinelPlanner.connectedSolutionIds';
const CRIBL_VENDOR_ID = 'cribl';
const CRIBL_SOLUTION_ID = 'cribl-stream';
const CRIBL_ELIGIBLE_PROFILE_TYPES = new Set(['windows', 'linux', 'firewall']);
const sessionExplicitSolutionSelections = new Set();
let hasNormalizedCriblConnectorSelections = false;
const connectorKindToSolutionIds = {
    azureactivedirectory: ['microsoft-entra-id'],
    microsoftentraid: ['microsoft-entra-id'],
    entraidassets: ['microsoft-entra-id-assets'],
    microsoftentraidassets: ['microsoft-entra-id-assets'],
    azureadidentityprotection: ['microsoft-entra-id-protection'],
    microsoftentraidprotection: ['microsoft-entra-id-protection'],
    office365: ['microsoft-365'],
    m365assets: ['microsoft-365-assets'],
    microsoft365assets: ['microsoft-365-assets'],
    exchangeonline: ['microsoft-exchange-security-exchange-online'],
    microsoftbusinessapplications: ['microsoft-business-applications'],
    powerplatform: ['microsoft-business-applications'],
    microsoftthreatprotection: ['defender-xdr'],
    microsoftdefenderxdr: ['defender-xdr'],
    microsoft365defender: ['defender-xdr'],
    m365defender: ['defender-xdr'],
    microsoftdefenderforendpoint: ['microsoft-defender-for-endpoint'],
    microsoftdefenderadvancedthreatprotection: ['microsoft-defender-for-endpoint'],
    mdatp: ['microsoft-defender-for-endpoint'],
    microsoftdefenderforidentity: ['microsoft-defender-for-identity'],
    azureadvancedthreatprotection: ['microsoft-defender-for-identity'],
    microsoftcloudappsecurity: ['defender-for-cloud-apps'],
    microsoftdefenderforcloudapps: ['defender-for-cloud-apps'],
    azuresecuritycenter: ['defender-for-cloud'],
    microsoftdefenderforcloud: ['defender-for-cloud'],
    microsoftdefenderforoffice365: ['defender-for-office-365'],
    officeatp: ['defender-for-office-365'],
    microsoftcopilot: ['microsoft-copilot'],
    powerbi: ['microsoft-power-bi'],
    microsoftpowerbi: ['microsoft-power-bi'],
    microsoftproject: ['microsoft-project'],
    microsoftpurview: ['microsoft-purview'],
    purviewinformationprotection: ['microsoft-purview-information-protection'],
    microsoftinformationprotection: ['microsoft-purview-information-protection'],
    microsoftpurviewinformationprotection: ['microsoft-purview-information-protection'],
    sysmonforlinux: ['microsoft-sysmon-for-linux'],
    microsoftsysmonforlinux: ['microsoft-sysmon-for-linux'],

    azureactivity: ['azure-activity'],
    azurefirewall: ['azure-firewall'],
    azurekeyvault: ['azure-key-vault'],
    azurekubernetesservice: ['azure-kubernetes-service'],
    azurenetworksecuritygroup: ['azure-network-security-group'],
    azurewaf: ['azure-waf'],
    azuredevopsauditing: ['azure-devops-auditing'],
    azureeventhubs: ['azure-event-hubs'],
    azurelogicapps: ['azure-logic-apps'],
    azurestorage: ['azure-storage'],
    azurestreamanalytics: ['azure-stream-analytics'],
    azureresourcegraph: ['azure-resource-graph'],
    azureservicebus: ['azure-service-bus'],
    azurebatchaccount: ['azure-batch-account'],
    azurecognitivesearch: ['azure-cognitive-search'],
    azureddosprotection: ['azure-ddos-protection'],
    azuresql: ['azure-sql-database-solution-for-sentinel'],
    azuresqldatabase: ['azure-sql-database-solution-for-sentinel'],

    windowsforwardedevents: ['windows-forwarded-events', 'windows-security-events'],
    securityevents: ['windows-security-events'],
    windowssecurityevents: ['windows-security-events'],
    syslog: ['linux-syslog'],
    amazonwebservicesaws: ['aws'],
    awscloudtrail: ['aws'],
    awss3: ['aws'],
    gcpauditlogs: ['google-cloud-platform-audit-logs'],

    crowdstrikefalcon: ['crowdstrike'],
    crowdstrike: ['crowdstrike'],
    crowdstrikefalconendpointprotection: ['crowdstrike'],
    checkpoint: ['checkpoint'],
    fortinet: ['fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel'],
    fortigate: ['fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel'],
    zscaler: ['zscaler'],
    zscalerinternetaccess: ['zscaler'],
    cyberark: ['cyber-ark-privilege-access-manager-pam-events'],
    ciscoasa: ['cisco-asa-2'],
    ciscoumbrella: ['cisco-umbrella'],
    ciscoise: ['cisco-ise'],
    pingone: ['ping-one'],
    pingfederate: ['ping-federate'],
    trendmicrovisionone: ['trend-micro-vision-one'],
    trendmicrodeepsecurity: ['trend-micro-deep-security'],
    threatintelligence: ['threat-intelligence'],
    threatintelligencetaxii: ['threat-intelligence'],
    microsoftthreatintelligence: ['threat-intelligence', 'microsoft-defender-threat-intelligence'],
    microsoftdefenderthreatintelligence: ['threat-intelligence', 'microsoft-defender-threat-intelligence'],
    microsoftdefenderforiot: ['io-tot-threat-monitoringwith-defenderfor-io-t'],
    iotsecurity: ['io-tot-threat-monitoringwith-defenderfor-io-t'],
    dynamics365: ['dynamics-365'],
    oktasso: ['okta-single-sign-on'],
    boxeventsccp: ['box'],
    box: ['box'],

    // DataType-based mappings (from workspace Usage table queries)
    // NOTE: CommonSecurityLog and Syslog are shared/generic tables — they prove "some CEF/syslog data exists"
    // but NOT which specific product is sending it. Only explicit connector resources (ARM entries)
    // should mark specific solutions as connected. These generic tables are used ONLY for lastLog
    // freshness backfill on solutions that are already confirmed connected via other signals.
    azurediagnostics: ['azure-activity'],
    dns: ['windows-dns-events']
};

const solutionDataUrls = [
    new URL('../../data/solutions.json', import.meta.url),
    '../../data/solutions.json',
    '../data/solutions.json',
    'data/solutions.json',
    './data/solutions.json'
];
const GENERAL_SENTINEL_DOC_URL = 'https://learn.microsoft.com/en-us/azure/sentinel/';
const SENTINEL_CONNECTORS_REFERENCE_URL = 'https://learn.microsoft.com/en-us/azure/sentinel/data-connectors-reference';

// Maps solution IDs to the correct documentation URL.
// Values can be:
//   - A full URL (starts with 'https://') — used as-is
//   - A slug string — appended to the /data-connectors/ base path (legacy pattern, redirects to reference page)
//   - null — no specific doc exists, falls back to general Sentinel URL
const CONNECTOR_DOC_SLUG_OVERRIDES = new Map([
    ['windows-security-events',                          'windows-security-events-via-ama'],
    ['windows-firewall-via-ama',                         'windows-firewall-events-via-ama'],
    ['windows-forwarded-events-via-ama',                 null],
    ['sysmon-via-ama',                                   null],
    ['linux-syslog',                                     'syslog-via-ama'],
    ['common-event-format',                              'common-event-format-cef'],
    ['defender-xdr',                                     'microsoft-defender-xdr'],
    ['defender-for-cloud',                               'microsoft-defender-for-cloud'],
    ['defender-for-cloud-apps',                          'microsoft-defender-for-cloud-apps'],
    ['defender-for-office-365',                          'microsoft-defender-for-office-365'],
    ['crowdstrike',                                      `${SENTINEL_CONNECTORS_REFERENCE_URL}#crowdstrike-api-data-connector-via-codeless-connector-framework`],
    ['aws',                                              'amazon-web-services'],
    ['aws-security-hub',                                 null],
    ['aws-vpc-flow-logs',                                null],
    ['aws-eks',                                          null],
    ['aws-elb',                                          null],
    ['aws-cloud-front',                                  null],
    ['aws-access-logs',                                  null],
    ['google-workspace-reports',                         'google-workspace-g-suite'],
    ['google-cloud-platform-audit-logs',                 null],
    ['threat-intelligence',                              'threat-intelligence-taxii'],
    ['threat-intelligence-new',                          'threat-intelligence-upload-api'],
    ['cisco-asa-2',                                      'cisco-asa'],
    ['cisco-meraki-events-via-rest-api',                 `${SENTINEL_CONNECTORS_REFERENCE_URL}#cisco-meraki-using-rest-api`],
    ['cisco-sd-wan',                                     `${SENTINEL_CONNECTORS_REFERENCE_URL}#cisco-software-defined-wan`],
    ['cisco-secure-endpoint',                            `${SENTINEL_CONNECTORS_REFERENCE_URL}#cisco-secure-endpoint-via-codeless-connector-framework`],
    ['cisco-umbrella',                                   `${SENTINEL_CONNECTORS_REFERENCE_URL}#cisco-cloud-security-using-azure-functions`],
    ['cisco-duo-security',                               `${SENTINEL_CONNECTORS_REFERENCE_URL}#cisco-duo-security-using-azure-functions`],
    ['cisco-etd',                                        `${SENTINEL_CONNECTORS_REFERENCE_URL}#cisco-etd-using-azure-functions`],
    ['cisco-firepower-e-streamer',                       null],
    ['palo-alto-cortex-xdr-ccp',                         `${SENTINEL_CONNECTORS_REFERENCE_URL}#palo-alto-cortex-xdr`],
    ['palo-alto-cortex-xpanse-ccf',                      `${SENTINEL_CONNECTORS_REFERENCE_URL}#palo-alto-cortex-xpanse-via-codeless-connector-framework`],
    ['palo-alto-prisma-cloud-2',                         `${SENTINEL_CONNECTORS_REFERENCE_URL}#palo-alto-prisma-cloud-cspm-via-codeless-connector-framework`],
    ['palo-alto-prisma-cloud-cwpp',                      `${SENTINEL_CONNECTORS_REFERENCE_URL}#palo-alto-prisma-cloud-cwpp-using-rest-api`],
    ['azure-cloud-ngfw-by-palo-alto-networks',           `${SENTINEL_CONNECTORS_REFERENCE_URL}#azure-cloudngfw-by-palo-alto-networks`],
    ['barracuda-cloud-gen-firewall',                     `${SENTINEL_CONNECTORS_REFERENCE_URL}#barracuda-cloudgen-firewall`],
    ['barracuda-waf',                                    `${SENTINEL_CONNECTORS_REFERENCE_URL}#barracuda-waf`],
    ['fortinet-forti-ndr-cloud',                         `${SENTINEL_CONNECTORS_REFERENCE_URL}#fortinet-fortindr-cloud`],
    ['fortinet-forti-web-cloud-waf-as-a-service-connector-for-microsoft-sentinel', null],
    ['proofpoint-on-demand-pod-email-security',          `${SENTINEL_CONNECTORS_REFERENCE_URL}#proofpoint-on-demand-email-security-via-codeless-connector-platform`],
    ['okta-sso',                                         `${SENTINEL_CONNECTORS_REFERENCE_URL}#okta-single-sign-on-via-codeless-connector-framework`],
    ['microsoft-exchange-security-exchange-on-premises', null],
    ['microsoft-exchange-security-exchange-online',      null],
    ['microsoft-business-applications',                  null],
    ['microsoft-power-bi',                               null],
    ['microsoft-365-assets',                             null],
    ['microsoft-entra-id-assets',                        null],
    ['microsoft-copilot',                                null],
]);

function slugifySentinelDocPath(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[()]/g, ' ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function isOfficialSentinelDocUrl(value = '') {
    return /^https:\/\/learn\.microsoft\.com\/[a-z-]+\/azure\/sentinel(?:\/|$)/i.test(String(value || '').trim());
}

function resolveSolutionDocumentationUrl(solution = {}) {
    const configuredUrl = [
        solution?.docUrl,
        solution?.planner?.docUrl,
        solution?.planner?.documentation_url,
        solution?.documentation_url
    ]
        .map((value) => String(value || '').trim())
        .find((value) => isOfficialSentinelDocUrl(value));

    if (configuredUrl) {
        return configuredUrl;
    }

    if (solution?.is_connector || Number(solution?.connectors) > 0) {
        const solutionId = String(solution?.id || '').trim().toLowerCase();

        if (CONNECTOR_DOC_SLUG_OVERRIDES.has(solutionId)) {
            const override = CONNECTOR_DOC_SLUG_OVERRIDES.get(solutionId);
            if (!override) return GENERAL_SENTINEL_DOC_URL;
            if (override.startsWith('https://')) return override;
            return `https://learn.microsoft.com/en-us/azure/sentinel/data-connectors/${override}`;
        }

        const connectorSlug = slugifySentinelDocPath(solutionId || solution?.name);
        if (connectorSlug) {
            return `https://learn.microsoft.com/en-us/azure/sentinel/data-connectors/${connectorSlug}`;
        }
    }

    return GENERAL_SENTINEL_DOC_URL;
}

function applySolutionDocumentationMetadata(solution = {}) {
    if (!solution || typeof solution !== 'object') {
        return solution;
    }

    const docUrl = resolveSolutionDocumentationUrl(solution);
    solution.docUrl = docUrl;
    solution.planner = {
        ...(solution?.planner || {}),
        docUrl,
        documentation_url: docUrl
    };
    return solution;
}

function normalizeSolutionCatalog(catalog = null) {
    if (!catalog || typeof catalog !== 'object') {
        return catalog;
    }

    Object.values(catalog?.categories || {}).forEach((category) => {
        (category?.solutions || []).forEach((solution) => {
            applySolutionDocumentationMetadata(solution);
        });
    });

    return catalog;
}

const vendorToSolutions = {
    aws: ['aws'],
    gcp: ['google-cloud'],
    windows: ['windows-security-events'],
    linux: ['linux-syslog'],
    crowdstrike: ['crowdstrike'],
    paloalto: ['palo-alto-networks', 'palo-alto-prisma-cloud'],
    cisco: ['cisco-asa'],
    checkpoint: ['checkpoint'],
    fortinet: ['fortinet'],
    zscaler: ['zscaler'],
    okta: ['okta'],
    trendmicro: ['trend-micro-vision-one', 'trend-micro-deep-security'],
    cyberark: ['cyberark'],
    pingidentity: ['ping-identity'],
    alibabacloud: [],
    atlassian: [],
    barracuda: [],
    citrix: [],
    cloudflare: [],
    cyfirma: [],
    extrahop: [],
    f5: [],
    forcepoint: [],
    github: [],
    infoblox: [],
    nxlog: [],
    symantec: []
};

const PLATFORM_VENDOR_KEYS = ['azure', 'microsoft365', 'windows', 'linux', 'aws', 'gcp'];
const PLATFORM_VENDOR_KEY_SET = new Set(PLATFORM_VENDOR_KEYS);
const SPECIFIC_VENDOR_KEYS = Object.keys(vendorToSolutions).filter((vendor) => !PLATFORM_VENDOR_KEY_SET.has(vendor));

const INFRASTRUCTURE_LABELS = {
    vm: 'Linux or Windows VM',
    agent: 'Azure Monitor Agent (AMA)',
    dcr: 'Data Collection Rule (DCR)',
    'azure-arc': 'Azure Arc (for non-Azure servers)',
    wec: 'Windows Event Collector (WEC) server',
    syslog: 'Linux VM (Syslog/CEF forwarder)'
};

const REQUIRED_INFRASTRUCTURE = {
    fortinet: ['Linux VM (Syslog/CEF forwarder)'],
    'fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel': ['Linux VM (Syslog/CEF forwarder)'],
    checkpoint: ['Linux VM (Syslog/CEF forwarder)'],
    'cisco-asa': ['Linux VM (Syslog/CEF forwarder)'],
    'cisco-asa-2': ['Linux VM (Syslog/CEF forwarder)'],
    'palo-alto-networks': ['Linux VM (Syslog/CEF forwarder)'],
    'azure-cloud-ngfw-by-palo-alto-networks': ['Linux VM (Syslog/CEF forwarder)'],
    barracuda: ['Linux VM (Syslog/CEF forwarder)'],
    'barracuda-cloud-gen-firewall': ['Linux VM (Syslog/CEF forwarder)'],
    'barracuda-waf': ['Linux VM (Syslog/CEF forwarder)'],
    zscaler: ['Linux VM (Syslog/CEF forwarder)'],
    'f5-networks': ['Linux VM (Syslog/CEF forwarder)'],
    'f5-big-ip': ['Linux VM (Syslog/CEF forwarder)'],
    'windows-forwarded-events': ['Windows Event Collector (WEC) server'],
    'windows-security-events': ['Windows Server (with AMA)', 'Data Collection Rule (DCR)']
};

const THIRD_PARTY_CATEGORY_DEFINITIONS = [
    { id: 'all', label: 'All', icon: '🧩' },
    { id: 'cloud', label: 'Cloud', icon: '☁️' },
    { id: 'firewalls', label: 'Firewalls', icon: '🔥' },
    { id: 'servers', label: 'Servers', icon: '🖥️' },
    { id: 'email-security', label: 'Email Security', icon: '✉️' },
    { id: 'endpoint-security', label: 'Endpoint Security', icon: '🛡️' },
    { id: 'threat-intelligence', label: 'Threat Intelligence', icon: '🔎' },
    { id: 'identity-access', label: 'Identity & Access', icon: '🔐' }
];
const THIRD_PARTY_CATEGORY_LOOKUP = new Map(THIRD_PARTY_CATEGORY_DEFINITIONS.map((entry) => [entry.id, entry]));

const step3ViewState = {
    searchQuery: ''
};

let filterEmptyState = null;

function setCatalogInfo(text) {
    const catalogInfo = document.getElementById('catalogInfo');
    if (catalogInfo) {
        catalogInfo.textContent = text;
    }
}

function getAllSolutions() {
    return Object.values(solutionsData?.categories || {}).flatMap((category) => category.solutions || []);
}

function normalizeWorkspaceSyntheticIdPart(value = '') {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getWorkspaceConnectorDisplayName(connector = {}) {
    return connector?.raw?.properties?.friendlyName
        || connector?.properties?.friendlyName
        || connector?.raw?.name
        || connector?.name
        || connector?.raw?.kind
        || connector?.kind
        || 'Unmatched connector';
}

function buildWorkspaceSyntheticSolution(connector = {}, index = 0) {
    const idSeed = [
        connector?.kind,
        connector?.raw?.kind,
        connector?.name,
        connector?.raw?.name,
        getWorkspaceConnectorDisplayName(connector),
        index + 1
    ]
        .map(normalizeWorkspaceSyntheticIdPart)
        .filter(Boolean)
        .join('-');

    return {
        id: `unmatched-${idSeed || `connector-${index + 1}`}`,
        name: getWorkspaceConnectorDisplayName(connector),
        category: 'other',
        tags: ['workspace-unmatched', 'other'],
        export_metadata: { group: 'Other' },
        infrastructure: ['workspace-connector'],
        is1P: false,
        _unmatched: true,
        _workspaceConnectorStatus: 'connected',
        _workspaceConnector: connector?.raw || connector
    };
}

function cloneWorkspaceConnectorSummary(summary = null) {
    return summary && typeof summary === 'object'
        ? { ...summary }
        : null;
}

function applyWorkspaceDiscoveryMetadata({ syntheticSolutions = [], summary = null } = {}) {
    workspaceSyntheticSolutions = Array.isArray(syntheticSolutions) ? syntheticSolutions.slice() : [];
    workspaceConnectorSummary = cloneWorkspaceConnectorSummary(summary);

    if (typeof window !== 'undefined') {
        window.workspaceSyntheticSolutions = workspaceSyntheticSolutions.slice();
        window.workspaceConnectorSummary = cloneWorkspaceConnectorSummary(workspaceConnectorSummary);
    }
}

function getThirdPartyCategoryId(solution = {}) {
    const categoryId = String(solution?.category || '').trim().toLowerCase();
    return THIRD_PARTY_CATEGORY_LOOKUP.has(categoryId) && categoryId !== 'all' ? categoryId : 'cloud';
}

function getThirdPartyCategoryMeta(categoryId = '') {
    return THIRD_PARTY_CATEGORY_LOOKUP.get(categoryId) || THIRD_PARTY_CATEGORY_LOOKUP.get('cloud');
}

function getSolutionSearchTerms(query = '') {
    return String(query || '')
        .toLowerCase()
        .split(/[\s,;]+/)
        .map((term) => term.trim())
        .filter(Boolean);
}

function formatSolutionCountText(visibleCount, totalCount) {
    if (!Number.isFinite(totalCount) || totalCount <= 0) {
        return '(0)';
    }

    return visibleCount === totalCount
        ? `(${totalCount})`
        : `(${visibleCount}/${totalCount})`;
}

function getSolutionSearchableText(solution = {}) {
    const thirdPartyCategoryLabel = THIRD_PARTY_CATEGORY_LOOKUP.has(String(solution?.category || '').toLowerCase())
        ? getThirdPartyCategoryMeta(getThirdPartyCategoryId(solution))?.label
        : '';

    return [
        solution?.name,
        ...(solution?.tags || []),
        solution?.export_metadata?.group,
        thirdPartyCategoryLabel
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function expandSearchTermWithSynonyms(term) {
    const normalizedTerm = String(term || '').trim().toLowerCase();
    if (!normalizedTerm) {
        return [];
    }

    const expansions = new Set([normalizedTerm]);
    const directSynonyms = SEARCH_SYNONYMS.get(normalizedTerm) || [];
    directSynonyms.forEach((synonym) => expansions.add(synonym));

    for (const [key, values] of SEARCH_SYNONYMS) {
        const relatedTerms = [key, ...values];
        const matchesRelatedPhrase = relatedTerms.some((relatedTerm) => (
            relatedTerm.includes(normalizedTerm) || normalizedTerm.includes(relatedTerm)
        ));

        if (!matchesRelatedPhrase) {
            continue;
        }

        expansions.add(key);
        values.forEach((value) => expansions.add(value));
    }

    return [...expansions];
}

function solutionMatchesSearch(solution, searchTerms = []) {
    if (searchTerms.length === 0) {
        return true;
    }

    const searchableText = getSolutionSearchableText(solution);

    return searchTerms.every((term) => {
        const expandedTerms = expandSearchTermWithSynonyms(term);
        return expandedTerms.some((candidate) => searchableText.includes(candidate));
    });
}

export function findSolutionsBySearchQuery(query = '') {
    const searchTerms = getSolutionSearchTerms(query);
    if (searchTerms.length === 0) {
        return [];
    }

    return getAllSolutions().filter((solution) => solutionMatchesSearch(solution, searchTerms));
}

function createLogoBadge(src, altText, fallbackText) {
    const badge = document.createElement('div');
    badge.className = 'solution-item-logo';
    badge.title = altText;

    const fallback = document.createElement('span');
    fallback.className = 'solution-item-logo-fallback';
    fallback.textContent = fallbackText;
    fallback.hidden = true;

    let image = null;
    const showFallback = () => {
        badge.classList.add('solution-item-logo--fallback');
        if (image) {
            image.hidden = true;
        }
        fallback.hidden = false;
    };
    const showImage = () => {
        badge.classList.remove('solution-item-logo--fallback');
        if (image) {
            image.hidden = false;
        }
        fallback.hidden = true;
    };

    if (src) {
        image = document.createElement('img');
        image.src = src;
        image.alt = '';
        image.setAttribute('aria-hidden', 'true');
        image.loading = 'lazy';
        image.decoding = 'async';
        image.addEventListener('load', showImage);
        image.addEventListener('error', showFallback);
        badge.appendChild(image);
    }

    badge.appendChild(fallback);

    if (!src) {
        showFallback();
    } else if (image.complete) {
        if (image.naturalWidth > 0) {
            showImage();
        } else {
            showFallback();
        }
    }

    return badge;
}

const solutionVersionCache = new Map();

function getSolutionFolderName(solution) {
    const githubUrl = solution?.github_url || '';
    const match = githubUrl.match(/\/Solutions\/([^/?#]+)/i);

    if (match?.[1]) {
        return decodeURIComponent(match[1]);
    }

    // Without an explicit github_url, don't guess — return empty to skip fetch
    return '';
}

function formatReleaseDate(rawDate) {
    const [day, month, year] = rawDate.split('-');
    const parsed = new Date(`${year}-${month}-${day}`);

    if (Number.isNaN(parsed.getTime())) {
        return rawDate;
    }

    return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

async function fetchSolutionVersion(solution) {
    const folderName = getSolutionFolderName(solution);
    if (!folderName) {
        return { version: null, date: null };
    }

    const cached = solutionVersionCache.get(folderName);
    if (cached) {
        return cached instanceof Promise ? cached : Promise.resolve(cached);
    }

    const pending = (async () => {
        try {
            const releaseNotesUrl = `https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/Solutions/${encodeURIComponent(folderName)}/ReleaseNotes.md`;
            const response = await fetch(releaseNotesUrl);
            if (!response.ok) {
                return { version: null, date: null };
            }

            const text = await response.text();
            for (const line of text.split(/\r?\n/)) {
                if (line.includes('**Version**') || /^\|[\s\-|]+\|?$/.test(line)) {
                    continue;
                }

                const match = line.match(/\|\s*([0-9]+(?:\.[0-9]+)+)\s*\|\s*([0-9]{2}-[0-9]{2}-[0-9]{4})\s*\|/);
                if (match) {
                    return {
                        version: match[1],
                        date: formatReleaseDate(match[2])
                    };
                }
            }
        } catch (error) {
            console.warn('Failed to load solution version', folderName, error);
        }

        return { version: null, date: null };
    })();

    solutionVersionCache.set(folderName, pending);
    const resolved = await pending;
    solutionVersionCache.set(folderName, resolved);
    return resolved;
}

function setVersionBadgeText(solutionId, versionInfo) {
    const badgeText = versionInfo?.version ? `v${versionInfo.version} · ${versionInfo.date}` : '';
    const selectorId = solutionId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const badges = document.querySelectorAll(`.version-badge[data-solution="${selectorId}"]`);

    badges.forEach((badge) => {
        badge.textContent = badgeText;
        badge.classList.toggle('loaded', Boolean(badgeText));
    });
}

async function fetchAndDisplayVersions(solutions) {
    const batchSize = 5;

    for (let index = 0; index < solutions.length; index += batchSize) {
        const batch = solutions.slice(index, index + batchSize);
        await Promise.all(batch.map(async (solution) => {
            const versionInfo = await fetchSolutionVersion(solution);
            setVersionBadgeText(solution.id, versionInfo);
        }));
    }
}

function matchesVendorSignature(vendor, solution) {
    const name = (solution.name || '').toLowerCase();
    const solutionId = String(solution?.id || '').toLowerCase();
    const tags = (solution.tags || []).map((tag) => String(tag).toLowerCase());
    const fieldPack = String(solution?.fieldPack || '').trim().toLowerCase();

    switch (vendor) {
        case 'azure':
            return solution?.category === 'azure' || tags.includes('azure') || name.includes('azure');
        case 'microsoft365':
            return solution?.category === 'microsoft_365_security'
                || tags.includes('microsoft 365')
                || tags.includes('m365')
                || name.includes('microsoft 365')
                || name.includes('exchange')
                || name.includes('sharepoint')
                || name.includes('teams')
                || name.includes('office')
                || name.includes('defender for office');
        case 'windows':
            return tags.includes('windows') || name.includes('windows');
        case 'linux':
            // BUG-SOL-001: Also match on fieldPack and syslog tag — the Syslog connector is named
            // "Syslog" (not "Linux Syslog"), so name/tag text matching alone misses it.
            return solutionId === 'linux-syslog'
                || fieldPack === 'syslog-cef'
                || tags.includes('linux')
                || tags.includes('syslog')
                || name.includes('linux');
        case 'aws':
            return tags.includes('aws') || name.includes('aws') || name.includes('amazon');
        case 'gcp': {
            // BUG-SOL-002: Match only genuine GCP solutions; explicitly exclude Google Workspace
            // content (ids/tags containing 'workspace' or 'gsuite') to avoid false recommendations.
            const isGcp = solutionId.startsWith('google-cloud-platform-')
                || solutionId === 'google-kubernetes-engine'
                || solutionId === 'google-apigee'
                || tags.includes('gcp')
                || tags.includes('google-cloud')
                || tags.includes('google cloud platform')
                || name.includes('google cloud platform')
                || name.includes('google kubernetes engine');
            const isWorkspace = solutionId.includes('workspace')
                || solutionId.includes('gsuite')
                || tags.includes('workspace');
            return isGcp && !isWorkspace;
        }
        case 'crowdstrike':
            return name.includes('crowdstrike') || name.includes('crowd strike') || tags.some((tag) => tag.includes('crowdstrike'));
        case 'paloalto':
            return name.includes('palo alto') || name.includes('paloalto') || tags.some((tag) => tag.includes('palo'));
        case 'cisco':
            return name.includes('cisco') || tags.some((tag) => tag.includes('cisco'));
        case 'checkpoint':
            return name.includes('check point') || name.includes('checkpoint') || tags.some((tag) => tag.includes('checkpoint'));
        case 'fortinet':
            return name.includes('fortinet') || tags.some((tag) => tag.includes('fortinet'));
        case 'zscaler':
            return name.includes('zscaler') || tags.some((tag) => tag.includes('zscaler'));
        case 'okta':
            return name.includes('okta') || tags.some((tag) => tag.includes('okta'));
        case 'pingidentity':
            return name.includes('ping') || tags.some((tag) => tag.includes('ping'));
        case 'alibabacloud':
            return name.includes('alibaba');
        case 'atlassian':
            return name.includes('atlassian') || tags.some((tag) => tag.includes('atlassian'));
        case 'barracuda':
            return name.includes('barracuda') || tags.some((tag) => tag.includes('barracuda'));
        case 'citrix':
            return name.includes('citrix') || tags.some((tag) => tag.includes('citrix'));
        case 'cloudflare':
            return name.includes('cloudflare') || tags.some((tag) => tag.includes('cloudflare'));
        case 'cyfirma':
            return name.includes('cyfirma') || tags.some((tag) => tag.includes('cyfirma'));
        case 'extrahop':
            return name.includes('extrahop') || name.includes('extra hop') || tags.some((tag) => tag.includes('extrahop'));
        case 'f5':
            return name.includes('f5') || name.includes('f5 networks') || tags.some((tag) => tag.includes('f5'));
        case 'forcepoint':
            return name.includes('forcepoint') || tags.some((tag) => tag.includes('forcepoint'));
        case 'github':
            return name.includes('github') || tags.some((tag) => tag.includes('github'));
        case 'infoblox':
            return name.includes('infoblox') || tags.some((tag) => tag.includes('infoblox'));
        case 'nxlog':
            return name.includes('nxlog') || tags.some((tag) => tag.includes('nxlog'));
        case 'symantec':
            return name.includes('symantec') || tags.some((tag) => tag.includes('symantec'));
        case 'cyberark':
            return name.includes('cyberark') || name.includes('cyber ark') || tags.some((tag) => tag.includes('cyberark'));
        case 'trendmicro':
            return name.includes('trend') || tags.some((tag) => tag.includes('trend'));
        default:
            return false;
    }
}

function getSolutionVendorMatches(solution) {
    const specificMatches = SPECIFIC_VENDOR_KEYS.filter((vendor) => matchesVendorSignature(vendor, solution));
    if (specificMatches.length > 0) {
        return new Set(specificMatches);
    }

    const platformMatches = PLATFORM_VENDOR_KEYS.filter((vendor) => matchesVendorSignature(vendor, solution));
    return new Set(platformMatches);
}

function isVendorRelevantToSolution(vendor, solution) {
    return getSolutionVendorMatches(solution).has(vendor);
}

function getSolutionContentCount(solution, keys = []) {
    for (const key of keys) {
        const value = solution?.[key];
        if (value === undefined || value === null || value === '') {
            continue;
        }

        const numericValue = Number(value);
        if (!Number.isNaN(numericValue)) {
            return numericValue;
        }
    }

    return 0;
}

function getConnectorCount(solution) {
    return getSolutionContentCount(solution, ['connectors', 'connectorCount']);
}

function getAnalyticRuleCount(solution) {
    return getSolutionContentCount(solution, ['analytics', 'analyticRules', 'analyticRuleCount']);
}

function getWorkbookCount(solution) {
    return getSolutionContentCount(solution, ['workbooks', 'workbookCount']);
}

function getPlaybookCount(solution) {
    return getSolutionContentCount(solution, ['playbooks', 'playbookCount']);
}

function hasMinimumContent(solution) {
    const connectors = getConnectorCount(solution);
    const analytics = getAnalyticRuleCount(solution);
    const workbooks = getWorkbookCount(solution);
    const playbooks = getPlaybookCount(solution);
    return connectors >= 1 && (analytics >= 1 || workbooks >= 1 || playbooks >= 2);
}

function hasValuableContent(solution) {
    const connectors = getConnectorCount(solution);
    const analytics = getAnalyticRuleCount(solution);
    return connectors >= 1 && analytics >= 1;
}

function getPreselectedSolutionIds() {
    const preSelectedIds = new Set();
    const selectedVendorsList = Array.from(selectedVendors);

    // Mandatory solutions are always pre-selected regardless of vendor selection
    Object.values(solutionsData?.categories || {}).forEach((category) => {
        (category?.solutions || []).forEach((solution) => {
            if (solution?.mandatory === true) {
                preSelectedIds.add(solution.id);
            }
        });
    });

    if (selectedVendorsList.length === 0) {
        return preSelectedIds;
    }

    Object.values(solutionsData?.categories || {}).forEach((category) => {
        (category?.solutions || []).forEach((solution) => {
            if (solution?.id === CRIBL_SOLUTION_ID && isCriblEnvironmentSelected()) {
                preSelectedIds.add(solution.id);
                return;
            }

            const matchingVendors = selectedVendorsList.filter((vendor) => {
                return isVendorRelevantToSolution(vendor, solution);
            });

            if (matchingVendors.length === 0) {
                return;
            }

            // Fix: SOL-003 — don't content-gate explicit vendor connectors when their parent vendor was selected.
            const shouldBypassContentGate = matchingVendors.some((vendor) => !PLATFORM_VENDOR_KEY_SET.has(vendor));
            if (!shouldBypassContentGate && !hasMinimumContent(solution)) {
                return;
            }

            preSelectedIds.add(solution.id);
        });
    });

    return preSelectedIds;
}

const SETUP_HOURS_QUICK_THRESHOLD = 4;
const SETUP_PHASE_CATEGORIES = new Set(['setup', 'phase-1', 'phase-2']);

function computeSolutionValueScore(solution = {}) {
    const analytics = getAnalyticRuleCount(solution);
    const workbooks = getWorkbookCount(solution);
    const playbooks = getPlaybookCount(solution);
    return analytics + (workbooks * 2) + (playbooks * 3);
}

function computeSolutionSortScore(solution = {}) {
    const value = computeSolutionValueScore(solution);
    const setupHours = computeConnectorSetupHours(solution);
    if (setupHours <= SETUP_HOURS_QUICK_THRESHOLD) {
        return value;
    }
    return value * (SETUP_HOURS_QUICK_THRESHOLD / setupHours);
}

function sortSolutionsForDisplay(solutions = [], recommendedIds = new Set()) {
    return solutions
        .map((solution, index) => ({ solution, index }))
        .sort((leftEntry, rightEntry) => {
            const left = leftEntry.solution;
            const right = rightEntry.solution;
            const leftRecommended = recommendedIds.has(left.id);
            const rightRecommended = recommendedIds.has(right.id);

            if (leftRecommended !== rightRecommended) {
                return leftRecommended ? -1 : 1;
            }

            const leftFeatured = left.isFeatured === true;
            const rightFeatured = right.isFeatured === true;
            if (leftFeatured !== rightFeatured) {
                return leftFeatured ? -1 : 1;
            }

            const leftScore = computeSolutionSortScore(left);
            const rightScore = computeSolutionSortScore(right);
            if (leftScore !== rightScore) {
                return rightScore - leftScore;
            }

            return leftEntry.index - rightEntry.index;
        })
        .map((entry) => entry.solution);
}

function normalizeLookupValue(value = '') {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const DEPRECATED_PATTERNS = [/\[deprecated\]/i, /legacy\s*agent/i, /via\s*legacy/i];

function isConnectorDeprecated(connector = {}) {
    const friendlyName = connector?.properties?.friendlyName || '';
    const connectorName = connector?.name || '';
    const title = connector?.properties?.connectorUiConfig?.title || '';
    const candidates = [friendlyName, connectorName, title];

    for (const text of candidates) {
        if (DEPRECATED_PATTERNS.some((pattern) => pattern.test(text))) {
            return text;
        }
    }
    return '';
}

function getDeprecationReason(connectorDisplayName = '') {
    if (/legacy\s*agent/i.test(connectorDisplayName)) {
        return 'Uses legacy agent — migrate to AMA-based connector';
    }
    if (/azure\s*functions?/i.test(connectorDisplayName)) {
        return 'Uses Azure Functions (legacy HTTP API) — migrate to CCF-based connector';
    }
    return 'Deprecated — check for a modern replacement connector';
}

function getConnectorLookupValues(connector = {}) {
    const properties = connector?.properties || {};
    const uiConfig = properties?.connectorUiConfig || {};
    const dataTypes = properties?.dataTypes ? Object.keys(properties.dataTypes) : [];
    const dataTypesToConnect = Array.isArray(properties?.dataTypesToConnect)
        ? properties.dataTypesToConnect.map((dt) => dt?.name).filter(Boolean)
        : [];

    return [
        connector?.kind,
        connector?.name,
        connector?.type?.split('/')?.pop(),
        properties?.friendlyName,
        properties?.connectorName,
        properties?.connectorDefinitionName,
        properties?.dataConnectorDefinitionName,
        uiConfig?.title,
        uiConfig?.id,
        ...dataTypes,
        ...dataTypesToConnect
    ].filter(Boolean);
}

function canUseLocalStorage() {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
        return false;
    }
}

function persistSolutionIds(storageKey, solutionIds, label) {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(solutionIds)));
    } catch (error) {
        console.warn(`Unable to persist ${label}:`, error);
    }
}

function restoreSolutionIds(storageKey, targetSet, label) {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        const rawValue = window.localStorage.getItem(storageKey);
        if (!rawValue) {
            return;
        }

        const storedSolutionIds = JSON.parse(rawValue);
        if (!Array.isArray(storedSolutionIds)) {
            return;
        }

        targetSet.clear();
        storedSolutionIds
            .filter((solutionId) => typeof solutionId === 'string' && solutionId)
            .forEach((solutionId) => targetSet.add(solutionId));
    } catch (error) {
        console.warn(`Unable to restore ${label}:`, error);
    }
}

function persistSelectedSolutions() {
    persistSolutionIds(SELECTED_SOLUTIONS_STORAGE_KEY, selectedSolutions, 'selected solutions');
}

function persistConnectedSolutionIds() {
    persistSolutionIds(CONNECTED_SOLUTIONS_STORAGE_KEY, connectedSolutionIds, 'connected solutions');
}

function isCriblEnvironmentSelected() {
    return selectedVendors.has(CRIBL_VENDOR_ID);
}

function isCriblEligibleForSolution(solution = {}, profile = {}) {
    return isCriblEnvironmentSelected()
        && solution?.cribl_eligible === true
        && CRIBL_ELIGIBLE_PROFILE_TYPES.has(profile?.type);
}

function clearRestoredCriblConnectorSelections() {
    const criblEligibleSolutionIds = new Set(
        getAllSolutions()
            .filter((solution) => solution?.cribl_eligible === true && solution?.id !== CRIBL_SOLUTION_ID)
            .map((solution) => solution.id)
    );

    if (criblEligibleSolutionIds.size === 0) {
        return false;
    }

    const snapshot = getConnectorCapacitySnapshot(getSelectedSolutionsData());

    let selectionChanged = false;
    Array.from(selectedSolutions).forEach((solutionId) => {
        if (!criblEligibleSolutionIds.has(solutionId) || sessionExplicitSolutionSelections.has(solutionId)) {
            return;
        }
        if (snapshot?.solutionGroupEntries?.[solutionId]?.sizing) {
            return;
        }

        if (selectedSolutions.delete(solutionId)) {
            if (activeSizingSolutionId === solutionId) {
                activeSizingSolutionId = '';
            }
            selectionChanged = true;
        }
    });

    return selectionChanged;
}

export function syncCriblEnvironmentSelection({ persist = true, clearCapacity = false } = {}) {
    let selectionChanged = false;

    if (isCriblEnvironmentSelected()) {
        if (!hasNormalizedCriblConnectorSelections && solutionsData) {
            hasNormalizedCriblConnectorSelections = true;
        }

        if (!selectedSolutions.has(CRIBL_SOLUTION_ID)) {
            selectedSolutions.add(CRIBL_SOLUTION_ID);
            selectionChanged = true;
        }
    } else {
        hasNormalizedCriblConnectorSelections = false;
        if (selectedSolutions.delete(CRIBL_SOLUTION_ID)) {
            selectionChanged = true;
        }
        if (clearCapacity) {
            clearConnectorCriblIngestion();
        }
    }

    if (selectionChanged && persist) {
        persistSelectedSolutions();
    }

    return selectionChanged;
}

restoreSolutionIds(SELECTED_SOLUTIONS_STORAGE_KEY, selectedSolutions, 'selected solutions');

// BUG-ENV-002: Prevent stale connected-solution badges from showing when no workspace is active.
// setConnectedSolutionsFromWorkspace sets sessionStorage.sentinelPlanner.activeWorkspace when a live
// workspace connection is made. If that flag is absent on module load (fresh tab / new session),
// wipe the persisted connected-solution list so app.js cannot re-hydrate ghost green badges.
if (canUseLocalStorage() && typeof window !== 'undefined') {
    if (!window.sessionStorage?.getItem('sentinelPlanner.activeWorkspace')) {
        window.localStorage.removeItem(CONNECTED_SOLUTIONS_STORAGE_KEY);
    }
}

function getMostRecentIsoTimestamp(candidates = []) {
    let freshestIso = '';
    let freshestTime = Number.NEGATIVE_INFINITY;

    (Array.isArray(candidates) ? candidates : [candidates]).forEach((candidate) => {
        const normalizedCandidate = String(candidate || '').trim();
        if (!normalizedCandidate) {
            return;
        }
        const candidateTime = new Date(normalizedCandidate).getTime();
        if (!Number.isFinite(candidateTime) || candidateTime <= freshestTime) {
            return;
        }
        freshestTime = candidateTime;
        freshestIso = normalizedCandidate;
    });

    return freshestIso || null;
}

function getConnectorLastLogTimestamp(connector = {}) {
    if (!connector || typeof connector !== 'object') {
        return null;
    }

    const properties = connector?.properties || {};
    const nestedDataTypeTimestamps = properties?.lastDataReceivedDataTypes && typeof properties.lastDataReceivedDataTypes === 'object'
        ? Object.values(properties.lastDataReceivedDataTypes).map((value) => {
            if (typeof value === 'string') {
                return value;
            }
            if (!value || typeof value !== 'object') {
                return null;
            }
            return value.lastDataReceived
                || value.lastDataReceivedTime
                || value.lastLog
                || value.timeGenerated
                || value.timestamp
                || null;
        })
        : [];

    return getMostRecentIsoTimestamp([
        connector?._lastLog,
        connector?.lastDataReceived,
        connector?.lastDataReceivedTime,
        connector?.lastLog,
        properties?.lastDataReceived,
        properties?.lastDataReceivedTime,
        properties?.lastLog,
        properties?.timeGenerated,
        properties?.timestamp,
        properties?.metadata?.lastDataReceived,
        properties?.metadata?.lastLog,
        properties?.status?.lastDataReceived,
        properties?.status?.lastLog,
        ...nestedDataTypeTimestamps
    ]);
}

function applyFreshestSolutionLastLog(targetMap = new Map(), solutionId = '', lastLog = '') {
    const normalizedSolutionId = String(solutionId || '').trim();
    const normalizedLastLog = String(lastLog || '').trim();
    const nextLastLogTime = normalizedLastLog ? new Date(normalizedLastLog).getTime() : Number.NaN;
    if (!normalizedSolutionId || !Number.isFinite(nextLastLogTime)) {
        return;
    }

    const existingLastLog = targetMap.get(normalizedSolutionId);
    const existingLastLogTime = existingLastLog ? new Date(existingLastLog).getTime() : Number.NEGATIVE_INFINITY;
    if (nextLastLogTime <= existingLastLogTime) {
        return;
    }

    targetMap.set(normalizedSolutionId, normalizedLastLog);
}

function getMatchedSolutionIdsForLookupValues(lookupValues = [], allSolutions = [], availableIds = new Set(), allowedSolutionIds = null) {
    const matchedSolutionIds = new Set();

    (Array.isArray(lookupValues) ? lookupValues : []).forEach((lookupValue) => {
        (connectorKindToSolutionIds[lookupValue] || []).forEach((solutionId) => {
            if (!availableIds.has(solutionId)) {
                return;
            }
            if (allowedSolutionIds instanceof Set && !allowedSolutionIds.has(solutionId)) {
                return;
            }
            matchedSolutionIds.add(solutionId);
        });

        allSolutions.forEach((solution) => {
            const normalizedId = normalizeLookupValue(solution.id);
            const normalizedName = normalizeLookupValue(solution.name);
            const normalizedTags = (solution.tags || []).map(normalizeLookupValue);

            if (lookupValue !== normalizedId && lookupValue !== normalizedName && !normalizedTags.includes(lookupValue)) {
                return;
            }
            if (allowedSolutionIds instanceof Set && !allowedSolutionIds.has(solution.id)) {
                return;
            }
            matchedSolutionIds.add(solution.id);
        });
    });

    return matchedSolutionIds;
}

function solutionMatchesGenericTableBackfill(solution = {}, tableKind = '') {
    const normalizedTableKind = normalizeLookupValue(tableKind);
    if (!normalizedTableKind) {
        return false;
    }

    const solutionId = String(solution?.id || '').trim().toLowerCase();
    const fieldPack = String(solution?.fieldPack || '').trim().toLowerCase();
    const tags = (solution?.tags || []).map((tag) => String(tag || '').toLowerCase());
    const infra = [
        solution?.onboarding?.infrastructure,
        solution?.onboarding?.infrastructure_required,
        solution?.requiredInfrastructure
    ].flatMap((value) => Array.isArray(value) ? value : [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
    const lookupText = [solution?.name, solution?.description, tags.join(' '), infra.join(' ')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    const usesCollectorPath = solutionId === 'linux-syslog'
        || fieldPack === 'syslog-cef'
        || infra.includes('linux-forwarder')
        || /\bsyslog\b|\bcef\b|common event format/.test(lookupText);

    if (!usesCollectorPath) {
        return false;
    }

    if (normalizedTableKind === 'syslog') {
        return solutionId === 'linux-syslog'
            || /\bsyslog\b/.test(lookupText)
            || fieldPack === 'syslog-cef'
            || infra.includes('linux-forwarder');
    }

    if (normalizedTableKind === 'commonsecuritylog') {
        return fieldPack === 'syslog-cef'
            || /\bcef\b|common event format/.test(lookupText)
            || infra.includes('linux-forwarder');
    }

    return false;
}

function applyTableConnectorLastLogBackfill(localSolutionLastLogMap = new Map(), discoveryMeta = {}, allowedSolutionIds = new Set()) {
    const tableConnectorLastLogs = Array.isArray(discoveryMeta?.tableConnectorLastLogs)
        ? discoveryMeta.tableConnectorLastLogs
        : [];
    if (!tableConnectorLastLogs.length || !(allowedSolutionIds instanceof Set) || allowedSolutionIds.size === 0) {
        return;
    }

    const allSolutions = getAllSolutions();
    const availableIds = new Set(allSolutions.map((solution) => solution.id));
    tableConnectorLastLogs.forEach((entry) => {
        const lookupValues = [entry?.kind, entry?.name]
            .map(normalizeLookupValue)
            .filter(Boolean);
        if (!lookupValues.length) {
            return;
        }

        const matchedSolutionIds = getMatchedSolutionIdsForLookupValues(
            lookupValues,
            allSolutions,
            availableIds,
            allowedSolutionIds
        );
        const genericTableKind = lookupValues.find((value) => value === 'syslog' || value === 'commonsecuritylog') || '';
        if (genericTableKind) {
            allSolutions.forEach((solution) => {
                if (!availableIds.has(solution.id)) {
                    return;
                }
                if (allowedSolutionIds instanceof Set && !allowedSolutionIds.has(solution.id)) {
                    return;
                }
                if (!solutionMatchesGenericTableBackfill(solution, genericTableKind)) {
                    return;
                }
                matchedSolutionIds.add(solution.id);
            });
        }

        matchedSolutionIds.forEach((solutionId) => {
            applyFreshestSolutionLastLog(localSolutionLastLogMap, solutionId, entry?.lastLog);
        });
    });
}

function resolveConnectedSolutionIds(connectors = []) {
    const allSolutions = getAllSolutions();
    const availableIds = new Set(allSolutions.map((solution) => solution.id));
    const resolvedIds = new Set();
    const unmatchedConnectors = [];
    const deprecatedMatches = new Map(); // solutionId → { connectorName, reason }
    const localSolutionLastLogMap = new Map(); // solutionId → ISO timestamp
    let matchedConnectorCount = 0;

    connectors.forEach((connector) => {
        const lookupValues = getConnectorLookupValues(connector).map(normalizeLookupValue).filter(Boolean);
        const deprecatedLabel = isConnectorDeprecated(connector);
        const matchedSolutionIds = getMatchedSolutionIdsForLookupValues(lookupValues, allSolutions, availableIds);
        const matched = matchedSolutionIds.size > 0;
        const connectorLastLog = getConnectorLastLogTimestamp(connector);

        matchedSolutionIds.forEach((solutionId) => resolvedIds.add(solutionId));

        if (matched) {
            matchedConnectorCount += 1;
            // Propagate the freshest connector timestamp from normalized metadata or raw connector payloads.
            matchedSolutionIds.forEach((solutionId) => {
                applyFreshestSolutionLastLog(localSolutionLastLogMap, solutionId, connectorLastLog);
            });
        }

        if (deprecatedLabel && matched) {
            const reason = getDeprecationReason(deprecatedLabel);
            matchedSolutionIds.forEach((solutionId) => {
                if (!deprecatedMatches.has(solutionId)) {
                    deprecatedMatches.set(solutionId, { connectorName: deprecatedLabel, reason });
                }
            });
        }

        if (!matched) {
            unmatchedConnectors.push({
                kind: connector?.kind,
                name: connector?.name,
                lookupValues,
                raw: { kind: connector?.kind, name: connector?.name, type: connector?.type, properties: { friendlyName: connector?.properties?.friendlyName, connectorDefinitionName: connector?.properties?.connectorDefinitionName } }
            });
        }
    });

    const syntheticSolutions = unmatchedConnectors.map((connector, index) => buildWorkspaceSyntheticSolution(connector, index));

    if (unmatchedConnectors.length > 0) {
        console.warn('[Sentinel Planner] Unmatched connectors from workspace (could not map to local solutions):', unmatchedConnectors);
    }
    if (deprecatedMatches.size > 0) {
        console.warn(`[Sentinel Planner] ${deprecatedMatches.size} connected solution(s) via deprecated/legacy connectors:`, Object.fromEntries(deprecatedMatches));
    }
    console.info(`[Sentinel Planner] Resolved ${matchedConnectorCount} connector(s) to ${resolvedIds.size} solution(s) from ${connectors.length} workspace connector(s).`, Array.from(resolvedIds));

    // Update the module-level deprecated tracking
    deprecatedConnectedSolutionIds.clear();
    deprecatedMatches.forEach((info, solutionId) => deprecatedConnectedSolutionIds.set(solutionId, info));

    return {
        resolvedIds,
        unmatchedConnectors,
        syntheticSolutions,
        deprecatedMatches,
        matchedConnectorCount,
        solutionLastLogMap: localSolutionLastLogMap
    };
}

export function getConnectedSolutionIds() {
    return new Set(connectedSolutionIds);
}

export function getWorkspaceSyntheticSolutions() {
    return workspaceSyntheticSolutions.slice();
}

export function getWorkspaceConnectorSummary() {
    return cloneWorkspaceConnectorSummary(workspaceConnectorSummary);
}

export function getSolutionLastLog(solutionId = '') {
    return solutionLastLogMap.get(String(solutionId).trim()) || null;
}

export function hasLastLogData() {
    return solutionLastLogMap.size > 0;
}

export function setConnectedSolutionIds(solutionIds = [], options = {}) {
    connectedSolutionIds.clear();
    solutionIds.filter(Boolean).forEach((solutionId) => connectedSolutionIds.add(solutionId));

    if (!options?.preserveWorkspaceDiscovery) {
        deprecatedConnectedSolutionIds.clear();
        solutionLastLogMap = new Map();
        if (typeof window !== 'undefined') window.connectorLastSeenMap = {};
        applyWorkspaceDiscoveryMetadata();
    }

    persistConnectedSolutionIds();
    updateStep3Button();

    if (document.getElementById('step3')?.classList.contains('active')) {
        initStep3();
    }

    return getConnectedSolutionIds();
}

export function setConnectedSolutionsFromWorkspace(connectors = [], discoveryMeta = {}) {
    // Mark this session as having a live workspace connection so the stale-data guard
    // (BUG-ENV-002) allows future localStorage persistence to be re-hydrated on reload.
    if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem('sentinelPlanner.activeWorkspace', '1');
    }

    const resolution = resolveConnectedSolutionIds(connectors);
    const connectedIds = setConnectedSolutionIds(Array.from(resolution.resolvedIds), { preserveWorkspaceDiscovery: true });

    // Store the lastLog map and expose it globally for the topology view.
    // Backfill from table-derived last-log metadata so API-backed connectors still show
    // Activity/Stale badges even when the ARM connector resource omits per-table timestamps.
    solutionLastLogMap = resolution.solutionLastLogMap || new Map();
    applyTableConnectorLastLogBackfill(solutionLastLogMap, discoveryMeta, resolution.resolvedIds);
    if (typeof window !== 'undefined') {
        window.connectorLastSeenMap = Object.fromEntries(solutionLastLogMap);
    }

    const summary = {
        apiConnectorCount: Math.max(0, Number(discoveryMeta.apiConnectorCount) || 0),
        uniqueApiConnectorCount: Math.max(0, Number(discoveryMeta.uniqueApiConnectorCount) || 0),
        activeApiConnectorCount: Math.max(0, Number(discoveryMeta.activeApiConnectorCount) || 0),
        tableConnectorCount: Math.max(0, Number(discoveryMeta.tableConnectorCount) || 0),
        additionalTableConnectorCount: Math.max(0, Number(discoveryMeta.additionalTableConnectorCount) || 0),
        discoveryConnectorCount: Math.max(0, Number(discoveryMeta.discoveryConnectorCount ?? connectors.length) || 0),
        mappedConnectorCount: resolution.matchedConnectorCount,
        mappedSolutionIdCount: resolution.resolvedIds.size,
        unmatchedConnectorCount: resolution.unmatchedConnectors.length,
        totalShownInTopology: resolution.resolvedIds.size + resolution.syntheticSolutions.length,
        usageQueryFailed: Boolean(discoveryMeta.usageQueryFailed),
        usedTableFallback: Boolean(discoveryMeta.usedTableFallback),
        dataTypeDiscoverySource: typeof discoveryMeta.dataTypeDiscoverySource === 'string'
            ? discoveryMeta.dataTypeDiscoverySource
            : '',
        tableAnalysisAvailable: Boolean(discoveryMeta.tableAnalysisAvailable),
        tableFallbackTableCount: Math.max(0, Number(discoveryMeta.tableFallbackTableCount) || 0)
    };

    applyWorkspaceDiscoveryMetadata({
        syntheticSolutions: resolution.syntheticSolutions,
        summary
    });

    return {
        ...resolution,
        connectedIds,
        summary
    };
}

// Connected solution state is restored during app startup and refreshed from workspace discovery when available.

function normalizeRequirementList(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }

    return [];
}

function titleCaseRequirement(value) {
    return value
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatInfrastructureRequirement(value) {
    const normalizedValue = String(value || '').trim();

    if (!normalizedValue) {
        return '';
    }

    const mappedLabel = INFRASTRUCTURE_LABELS[normalizedValue.toLowerCase()];
    if (mappedLabel) {
        return mappedLabel;
    }

    if (/^[a-z0-9_-]+$/.test(normalizedValue)) {
        return titleCaseRequirement(normalizedValue);
    }

    return normalizedValue;
}

function createRequirementSection(labelText, sectionClassName, listClassName, chipClassName, values) {
    if (values.length === 0) {
        return null;
    }

    const section = document.createElement('div');
    section.className = sectionClassName;

    const label = document.createElement('span');
    label.className = `${sectionClassName}-label`;
    label.textContent = labelText;

    const list = document.createElement('div');
    list.className = listClassName;

    values.forEach((value) => {
        const chip = document.createElement('span');
        chip.className = chipClassName;
        chip.textContent = value;
        list.appendChild(chip);
    });

    section.append(label, list);
    return section;
}

function getRequiredRoles(solution) {
    return [...new Set([
        ...(solution?.permissions?.azure_roles || []),
        ...(solution?.permissions?.m365_roles || [])
    ].filter(Boolean))];
}

function createRolesSection(solution) {
    return createRequirementSection(
        'Required roles',
        'solution-item-roles',
        'solution-item-role-list',
        'solution-role-chip',
        getRequiredRoles(solution)
    );
}

function getRequiredInfrastructure(solution) {
    const explicitInfrastructure = normalizeRequirementList(solution?.onboarding?.infrastructure_required)
        .map(formatInfrastructureRequirement)
        .filter(Boolean);
    const solutionId = String(solution?.id || '').toLowerCase();
    const solutionName = String(solution?.name || '').toLowerCase();
    const lookupText = `${solutionId} ${solutionName}`;
    const mappedInfrastructure = Object.entries(REQUIRED_INFRASTRUCTURE)
        .filter(([key]) => lookupText.includes(key))
        .flatMap(([, requirements]) => requirements);
    const inferredInfrastructure = [];

    if (/(fortinet|check\s*point|checkpoint|palo\s*alto|cisco\s*asa|barracuda|f5|zscaler)/.test(lookupText)) {
        inferredInfrastructure.push('Linux VM (Syslog/CEF forwarder)');
    }

    return [...new Set([
        ...explicitInfrastructure,
        ...mappedInfrastructure,
        ...inferredInfrastructure
    ])];
}

function createInfrastructureSection(solution) {
    return createRequirementSection(
        'Required infrastructure',
        'solution-item-infrastructure',
        'solution-item-infrastructure-list',
        'solution-infrastructure-chip',
        getRequiredInfrastructure(solution)
    );
}

function normalizeDifficultyLabel(label) {
    const normalizedLabel = String(label || '').trim().toLowerCase();

    if (normalizedLabel === 'hard') {
        return 'Extended';
    }

    if (!normalizedLabel) {
        return '';
    }

    return normalizedLabel.charAt(0).toUpperCase() + normalizedLabel.slice(1);
}

function computeConnectorSetupHours(solution = {}) {
    const tasks = solution?.planner?.setup_tasks;
    if (!Array.isArray(tasks) || tasks.length === 0) {
        return Number(solution?.value_scoring?.setup_hours) || 0;
    }
    let total = 0;
    for (const task of tasks) {
        const category = String(task?.category || '').trim().toLowerCase();
        if (!category || SETUP_PHASE_CATEGORIES.has(category)) {
            const hours = Number(task?.effort_hours) || 0;
            if (!task?.optional) total += hours;
        }
    }
    return total > 0 ? total : (Number(solution?.value_scoring?.setup_hours) || 0);
}

let solutionsWorkspace = null;
let sizingDrawerShell = null;
let sizingDrawerBackdrop = null;
let sizingDrawerPanel = null;
let activeSizingSolutionId = '';
let isSizingDrawerOpen = false;
let sizingDrawerAttentionResetHandle = 0;
let sizingDrawerLockMessageToast = null;
let sizingDrawerLockMessageResetHandle = 0;
const SIZING_DRAWER_LOCK_MESSAGE = 'Please save your connector sizing before continuing';

function isSizingDrawerLockActive() {
    return Boolean(isSizingDrawerOpen && activeSizingSolutionId);
}

function isSizingDrawerBlockingSolutionInteraction(solutionId = '') {
    return Boolean(isSizingDrawerLockActive() && solutionId && activeSizingSolutionId !== solutionId);
}

function ensureSizingDrawerLockMessageToast() {
    if (sizingDrawerLockMessageToast instanceof HTMLElement) {
        return sizingDrawerLockMessageToast;
    }

    if (!(document.body instanceof HTMLElement)) {
        return null;
    }

    const toast = document.createElement('div');
    toast.className = 'solution-sizing-lock-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.hidden = true;
    document.body.appendChild(toast);
    sizingDrawerLockMessageToast = toast;
    return toast;
}

function hideSizingDrawerLockMessage() {
    window.clearTimeout(sizingDrawerLockMessageResetHandle);

    if (!(sizingDrawerLockMessageToast instanceof HTMLElement)) {
        return;
    }

    sizingDrawerLockMessageToast.classList.remove('is-visible');
    sizingDrawerLockMessageToast.hidden = true;
    sizingDrawerLockMessageToast.textContent = '';
}

function showSizingDrawerLockMessage(message = SIZING_DRAWER_LOCK_MESSAGE) {
    const toast = ensureSizingDrawerLockMessageToast();
    if (!(toast instanceof HTMLElement)) {
        return;
    }

    window.clearTimeout(sizingDrawerLockMessageResetHandle);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove('is-visible');
    void toast.offsetWidth;
    toast.classList.add('is-visible');

    sizingDrawerLockMessageResetHandle = window.setTimeout(() => {
        hideSizingDrawerLockMessage();
    }, 3200);
}

function notifySizingDrawerLock({ focusPanel = true } = {}) {
    showSizingDrawerLockMessage();
    drawAttentionToSizingDrawer({ focusPanel });
}

function focusSizingDrawerPanel() {
    if (!(sizingDrawerPanel instanceof HTMLElement)) {
        return;
    }

    try {
        sizingDrawerPanel.focus({ preventScroll: true });
    } catch {
        sizingDrawerPanel.focus();
    }
}

function drawAttentionToSizingDrawer({ focusPanel = true } = {}) {
    if (!(sizingDrawerPanel instanceof HTMLElement)) {
        return;
    }

    window.clearTimeout(sizingDrawerAttentionResetHandle);
    sizingDrawerPanel.classList.remove('needs-attention');
    void sizingDrawerPanel.offsetWidth;
    sizingDrawerPanel.classList.add('needs-attention');

    if (focusPanel) {
        focusSizingDrawerPanel();
    }

    sizingDrawerAttentionResetHandle = window.setTimeout(() => {
        if (sizingDrawerPanel instanceof HTMLElement) {
            sizingDrawerPanel.classList.remove('needs-attention');
        }
    }, 450);
}

function blockSolutionInteractionWhileSizing(solutionId = '', event = null) {
    if (!isSizingDrawerBlockingSolutionInteraction(solutionId)) {
        return false;
    }

    event?.preventDefault();
    event?.stopPropagation();
    notifySizingDrawerLock();
    return true;
}

export function blockTopologyNavigationWhileSizing(event = null) {
    if (!isSizingDrawerLockActive()) {
        return false;
    }

    event?.preventDefault();
    event?.stopPropagation();
    notifySizingDrawerLock({ focusPanel: true });
    return true;
}

function getSolutionById(solutionId = '') {
    return getAllSolutions().find((solution) => solution.id === solutionId) || null;
}

function isSolutionIncluded(solutionId = '') {
    return selectedSolutions.has(solutionId) || connectedSolutionIds.has(solutionId);
}

function getCurrentCapacitySnapshot() {
    return getConnectorCapacitySnapshot(getSelectedSolutionsData());
}

function setSizingDrawerState(isOpen, { focusPanel = false } = {}) {
    isSizingDrawerOpen = Boolean(isOpen);

    if (solutionsWorkspace instanceof HTMLElement) {
        solutionsWorkspace.classList.toggle('has-sizing-panel', isSizingDrawerOpen);
    }

    if (sizingDrawerShell instanceof HTMLElement) {
        sizingDrawerShell.hidden = !isSizingDrawerOpen;
        sizingDrawerShell.classList.toggle('is-open', isSizingDrawerOpen);
        sizingDrawerShell.setAttribute('aria-hidden', isSizingDrawerOpen ? 'false' : 'true');
    }

    if (!isSizingDrawerOpen) {
        window.clearTimeout(sizingDrawerAttentionResetHandle);
        if (sizingDrawerPanel instanceof HTMLElement) {
            sizingDrawerPanel.classList.remove('needs-attention');
        }
        hideSizingDrawerLockMessage();
    }

    if (isSizingDrawerOpen && focusPanel && sizingDrawerPanel instanceof HTMLElement) {
        window.requestAnimationFrame(() => focusSizingDrawerPanel());
    }
}

function syncSizingDrawerSelection() {
    document.querySelectorAll('.solution-item[data-id]').forEach((card) => {
        const isActiveCard = isSizingDrawerOpen && card.dataset.id === activeSizingSolutionId;
        const isBlockedCard = isSizingDrawerBlockingSolutionInteraction(card.dataset.id || '');
        card.classList.toggle('is-sizing-panel-active', isActiveCard);
        card.classList.toggle('is-sizing-panel-blocked', isBlockedCard);
    });
}

function closeSizingDrawer() {
    activeSizingSolutionId = '';
    if (sizingDrawerPanel instanceof HTMLElement) {
        sizingDrawerPanel.replaceChildren();
    }
    setSizingDrawerState(false);
    syncSizingDrawerSelection();
}

function getSelectedWindowsConnectorNames(snapshot = {}) {
    return (snapshot.selectedSolutions || [])
        .filter((candidate) => snapshot?.metadataById?.[candidate.id]?.sharedPopulationGroup === 'windows-ama')
        .map((candidate) => candidate.name)
        .filter(Boolean);
}

function createSizingDrawerCloseButton() {
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'solution-sizing-drawer-close';
    closeButton.setAttribute('aria-label', 'Close connector sizing panel');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', closeSizingDrawer);
    return closeButton;
}

function createSizingDrawerHeader({ eyebrow = 'Connector sizing', title = '', description = '' } = {}) {
    const header = document.createElement('div');
    header.className = 'solution-sizing-drawer-header';

    const eyebrowNode = document.createElement('span');
    eyebrowNode.className = 'solution-sizing-drawer-eyebrow';
    eyebrowNode.textContent = eyebrow;

    const titleNode = document.createElement('h3');
    titleNode.className = 'solution-sizing-drawer-title';
    titleNode.textContent = title;

    header.append(eyebrowNode, titleNode);

    if (description) {
        const descriptionNode = document.createElement('p');
        descriptionNode.className = 'solution-sizing-drawer-description';
        descriptionNode.textContent = description;
        header.appendChild(descriptionNode);
    }

    return header;
}

function createCollectorVmPlacementControls(profile = {}, { onChange = () => {} } = {}) {
    let collectorVmZone = normalizeCollectorVmZone(profile.collectorVmZone);
    let showEditor = !profile.hasCollectorVmZonePreference;
    let disabled = false;

    const wrapper = document.createElement('div');
    wrapper.className = 'solution-sizing-collector';

    const summary = document.createElement('div');
    summary.className = 'solution-sizing-collector__summary';

    const summaryLabel = document.createElement('span');
    summaryLabel.className = 'solution-sizing-collector__summary-label';
    summaryLabel.textContent = 'Collector VMs:';

    const summaryValue = document.createElement('strong');
    summaryValue.className = 'solution-sizing-collector__summary-value';

    const changeButton = document.createElement('button');
    changeButton.type = 'button';
    changeButton.className = 'solution-sizing-link';
    changeButton.textContent = 'Change';
    changeButton.addEventListener('click', () => {
        showEditor = true;
        render();
    });

    summary.append(summaryLabel, summaryValue, changeButton);

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'solution-sizing-relation solution-sizing-collector__fieldset';

    const legend = document.createElement('legend');
    legend.className = 'solution-sizing-relation__legend';
    legend.textContent = 'Collector VM placement';

    const question = document.createElement('div');
    question.className = 'solution-sizing-collector__question';
    question.textContent = 'Where will your log collector VMs be deployed?';

    const helper = document.createElement('p');
    helper.className = 'solution-sizing-collector__helper';
    helper.textContent = 'This is a shared choice for all Syslog / CEF collector VMs.';

    const choices = document.createElement('div');
    choices.className = 'solution-sizing-relation__choices';
    const inputs = new Map();

    const createChoice = (value, title, description) => {
        const label = document.createElement('label');
        label.className = 'solution-sizing-relation__option';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'collector-vm-zone';
        input.value = value;

        const copy = document.createElement('span');
        copy.className = 'solution-sizing-relation__copy';

        const titleNode = document.createElement('span');
        titleNode.className = 'solution-sizing-relation__title';
        titleNode.textContent = title;

        const descriptionNode = document.createElement('span');
        descriptionNode.className = 'solution-sizing-relation__description';
        descriptionNode.textContent = description;

        copy.append(titleNode, descriptionNode);
        label.append(input, copy);
        choices.appendChild(label);
        inputs.set(value, input);

        input.addEventListener('change', () => {
            if (!input.checked) {
                return;
            }
            collectorVmZone = normalizeCollectorVmZone(value);
            render();
            onChange(collectorVmZone);
        });
    };

    createChoice('onprem', 'On-Premises', 'Deploy the shared Linux collector VMs in your on-premises environment.');
    createChoice('azure', 'Azure', 'Deploy the shared Linux collector VMs in Azure for all Syslog / CEF connectors.');

    fieldset.append(legend, question, helper, choices);
    wrapper.append(summary, fieldset);

    function render() {
        summaryValue.textContent = getCollectorVmZoneLabel(collectorVmZone);
        summary.hidden = !profile.hasCollectorVmZonePreference;
        summary.classList.toggle('solution-sizing-collector--disabled', disabled);
        summary.querySelectorAll('button').forEach((button) => {
            button.disabled = disabled;
        });
        fieldset.hidden = !showEditor;
        fieldset.disabled = disabled;
        wrapper.classList.toggle('solution-sizing-collector--disabled', disabled);
        inputs.forEach((input, value) => {
            input.checked = collectorVmZone === value;
            input.disabled = disabled;
        });
    }

    render();

    return {
        element: wrapper,
        getValue: () => collectorVmZone,
        setDisabled: (nextDisabled) => {
            disabled = Boolean(nextDisabled);
            render();
        }
    };
}

function createSizingEditor(solution, profile, snapshot = {}) {
    // Log-type selector for solutions with log_types[] (e.g. AWS)
    if (profile.type === 'log_selector') {
        const form = document.createElement('div');
        form.className = 'solution-sizing-form solution-sizing-drawer-form';

        const intro = document.createElement('p');
        intro.className = 'solution-sizing-intro';
        intro.textContent = 'Select which log sources to include in the onboarding plan. Each selected source gets its own S3/SQS setup and validation task. Changes auto-save immediately.';
        form.appendChild(intro);

        const logTypes = Array.isArray(profile.logTypes) ? profile.logTypes : [];
        const savedTypes = profile.values?.selectedLogTypes;
        const currentSelected = new Set(
            Array.isArray(savedTypes)
                ? savedTypes
                : logTypes.filter((lt) => lt.default_selected !== false).map((lt) => lt.id)
        );

        const list = document.createElement('div');
        list.className = 'log-type-selector';

        const warning = document.createElement('div');
        warning.className = 'log-type-selector__warning';
        warning.hidden = true;
        const warnText = document.createElement('span');
        warning.append('\u26A0 ', warnText);

        const checkboxes = new Map();

        const updateWarning = () => {
            const rawSelected = logTypes.filter((lt) => checkboxes.get(lt.id)?.checked && !lt.has_content);
            if (rawSelected.length > 0) {
                const names = rawSelected.map((lt) => lt.label).join(', ');
                const verb = rawSelected.length === 1 ? 'has' : 'have';
                warnText.textContent = `${names} ${verb} no built-in analytics. Value comes from hunting and investigations.`;
                warning.hidden = false;
            } else {
                warning.hidden = true;
            }
        };

        const autoSave = () => {
            const selectedLogTypes = logTypes
                .filter((lt) => checkboxes.get(lt.id)?.checked)
                .map((lt) => lt.id);

            saveConnectorCapacityValues(solution, { selectedLogTypes, isDefault: false }, {
                selectedSolutions: getSelectedSolutionsData()
            });

            // Refresh the solution card badge without re-rendering the drawer
            const snap = getCurrentCapacitySnapshot();
            const card = document.querySelector(`.solution-item[data-id="${solution.id}"]`);
            if (card instanceof Element) {
                syncSolutionCardState(card, solution.id, { capacitySnapshot: snap });
            }
            syncSizingDrawerSelection();
            updateWarning();
        };

        logTypes.forEach((lt) => {
            const item = document.createElement('label');
            item.className = 'log-type-selector__item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = currentSelected.has(lt.id);
            checkboxes.set(lt.id, checkbox);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'log-type-selector__name';
            nameSpan.textContent = lt.label;

            const badge = document.createElement('span');
            const hasContent = Boolean(lt.has_content);
            badge.className = `log-type-selector__badge${hasContent ? '' : ' is-raw'}`;
            badge.textContent = lt.analytics_count > 0
                ? `${lt.analytics_count} rule${lt.analytics_count === 1 ? '' : 's'}`
                : 'raw only';

            const infra = document.createElement('span');
            infra.className = 'log-type-selector__infra';
            infra.textContent = lt.infra_label || 'S3 + SQS';

            item.append(checkbox, nameSpan, badge, infra);
            list.appendChild(item);

            checkbox.addEventListener('change', autoSave);
        });

        form.appendChild(list);
        form.appendChild(warning);

        const note = document.createElement('div');
        note.className = 'solution-sizing-drawer-note';
        note.textContent = 'Log type selections update the Gantt task plan — each source gets infrastructure setup and validation tasks. Content deployment is only added when at least one selected source has built-in analytics rules.';
        form.appendChild(note);

        // Show initial warning for any defaults that are raw-only
        updateWarning();

        return form;
    }

    const form = document.createElement('div');
    form.className = 'solution-sizing-form solution-sizing-drawer-form';

    const note = document.createElement('div');
    note.className = 'solution-sizing-drawer-note';
    form.appendChild(note);

    const intro = document.createElement('p');
    intro.className = 'solution-sizing-intro';
    intro.textContent = profile.type === 'windows'
        ? profile.populationKind === 'wec'
            ? 'Enter the WEC server count plus the on-prem split. Windows Forwarded Events always stays separate from the AMA host estate.'
            : 'Enter the Windows server count plus the on-prem split. The planner will size collection VMs and show the math transparently.'
        : profile.type === 'linux'
            ? 'Enter the Linux server count plus the on-prem split. The planner will use that mix when sizing shared Linux DCR capacity.'
            : 'Enter expected EPS for this connector. The planner will size CEF forwarder VMs and flag when a load balancer or pipeline-first design should be considered.';
    form.appendChild(intro);

    if (profile.type === 'windows' && profile.populationKind === 'wec') {
        form.appendChild(createWecSizingGuidanceCallout());
    }

    const relationOptions = profile.type === 'windows' && profile.hasRelationChoice
        ? profile.availableSharedPools || []
        : [];
    const criblEligible = isCriblEligibleForSolution(solution, profile);
    const buildDraft = (seed = null) => {
        const measuredEps = window.discoveredInfrastructure?.summary?.totalEPS;
        const nextDraft = {
            ...createDefaultSizingDraft(profile.type, { measuredEps }),
            ...(seed && typeof seed === 'object' ? seed : {})
        };
        const hasExplicitCriblIngestionPreference = Boolean(seed && typeof seed === 'object' && seed.criblIngestionExplicit);
        const hasSavedCriblIngestionPreference = Boolean(profile.values?.criblIngestionExplicit);
        const resolvedCriblIngestion = hasExplicitCriblIngestionPreference
            ? Boolean(nextDraft.criblIngestion)
            : hasSavedCriblIngestionPreference
                ? Boolean(profile.values?.criblIngestion)
                : true;

        nextDraft.criblIngestion = criblEligible ? resolvedCriblIngestion : false;
        nextDraft.criblIngestionExplicit = criblEligible && (hasExplicitCriblIngestionPreference || hasSavedCriblIngestionPreference);

        if (profile.type === 'firewall') {
            nextDraft.collectorVmZone = normalizeCollectorVmZone(nextDraft.collectorVmZone || profile.collectorVmZone);
        }

        return nextDraft;
    };
    const draft = buildDraft(profile.values);
    const hasSavedWecSizingValues = Boolean(
        profile.populationKind === 'wec'
        && profile.values
        && typeof profile.values === 'object'
        && (
            Object.prototype.hasOwnProperty.call(profile.values, 'servers')
            || Object.prototype.hasOwnProperty.call(profile.values, 'onPremPercent')
        )
    );
    if (profile.populationKind === 'wec' && draft.isDefault && !hasSavedWecSizingValues) {
        draft.servers = '';
        draft.onPremPercent = '';
    }
    let activeRelationMode = profile.hasRelationChoice
        ? (profile.relation === 'additional' ? 'additional' : 'same')
        : profile.relation || 'standalone';
    let selectedSharedPoolId = profile.selectedSharedPoolId || relationOptions[0]?.poolId || '';
    const sharedPoolDrafts = new Map(relationOptions.map((option) => [option.poolId, buildDraft(option.values)]));
    if (profile.poolId && activeRelationMode === 'same' && draft && Object.keys(draft).length > 0) {
        sharedPoolDrafts.set(profile.poolId, { ...draft });
    }
    let additionalDraft = buildDraft(profile.additionalPoolDraft?.values || draft);

    const grid = document.createElement('div');
    grid.className = 'solution-sizing-grid';
    const messages = document.createElement('div');
    messages.className = 'solution-sizing-messages';
    const preview = document.createElement('div');
    preview.className = 'solution-sizing-preview';
    const docLink = document.createElement('a');
    docLink.className = 'solution-sizing-doc-link';
    docLink.target = '_blank';
    docLink.rel = 'noopener noreferrer';

    const fieldRefs = {};
    let collectorPlacementControls = null;
    let relationFieldsetRef = null;
    let criblToggleNote = null;
    const getSelectedCollectorVmZone = () => collectorPlacementControls?.getValue?.() || normalizeCollectorVmZone(profile.collectorVmZone);
    const getSelectedCriblIngestion = () => Boolean(fieldRefs.criblIngestion instanceof HTMLInputElement && fieldRefs.criblIngestion.checked);
    const createField = (labelText, input, helperText = '') => {
        const field = document.createElement('label');
        field.className = 'solution-sizing-field';
        const label = document.createElement('span');
        label.textContent = labelText;
        const helper = document.createElement('small');
        helper.className = 'solution-sizing-helper';
        helper.textContent = helperText;
        field.append(label, input, helper);
        return { field, helper };
    };

    if (criblEligible) {
        const criblField = document.createElement('div');
        criblField.className = 'solution-sizing-cribl';

        const criblLabel = document.createElement('label');
        criblLabel.className = 'solution-sizing-cribl__option';
        const criblInput = document.createElement('input');
        criblInput.type = 'checkbox';
        criblInput.checked = Boolean(draft.criblIngestion);
        const criblCopy = document.createElement('span');
        criblCopy.textContent = 'Cribl will handle ingestion from this source';
        criblLabel.append(criblInput, criblCopy);

        criblToggleNote = document.createElement('small');
        criblToggleNote.className = 'solution-sizing-cribl__note';
        criblToggleNote.textContent = 'Cribl handles log collection — no collector VMs needed';
        criblField.append(criblLabel, criblToggleNote);
        fieldRefs.criblIngestion = criblInput;
        form.appendChild(criblField);
    }

    const collectDraft = () => profile.type === 'windows'
        ? {
            servers: fieldRefs.servers?.value,
            onPremPercent: fieldRefs.onPremPercent?.value,
            criblIngestion: getSelectedCriblIngestion(),
            criblIngestionExplicit: criblEligible,
            isDefault: false
        }
        : profile.type === 'linux'
            ? {
                servers: fieldRefs.servers?.value,
                onPremPercent: fieldRefs.onPremPercent?.value,
                criblIngestion: getSelectedCriblIngestion(),
                criblIngestionExplicit: criblEligible,
                isDefault: false
            }
            : {
                eps: fieldRefs.eps?.value,
                collectorVmZone: getSelectedCollectorVmZone(),
                criblIngestion: getSelectedCriblIngestion(),
                criblIngestionExplicit: criblEligible,
                isDefault: false
            };

    const writeDraftToFields = (nextDraft = {}) => {
        if (fieldRefs.criblIngestion instanceof HTMLInputElement) {
            fieldRefs.criblIngestion.checked = Boolean(nextDraft?.criblIngestion);
        }
        if (profile.type === 'windows') {
            if (fieldRefs.servers instanceof HTMLInputElement) {
                fieldRefs.servers.value = String(nextDraft?.servers ?? '');
            }
            if (fieldRefs.onPremPercent instanceof HTMLInputElement) {
                fieldRefs.onPremPercent.value = String(nextDraft?.onPremPercent ?? '');
            }
            return;
        }
        if (profile.type === 'linux') {
            if (fieldRefs.servers instanceof HTMLInputElement) {
                fieldRefs.servers.value = String(nextDraft?.servers ?? '');
            }
            if (fieldRefs.onPremPercent instanceof HTMLInputElement) {
                fieldRefs.onPremPercent.value = String(nextDraft?.onPremPercent ?? '');
            }
            return;
        }
        if (fieldRefs.eps instanceof HTMLInputElement) {
            fieldRefs.eps.value = String(nextDraft?.eps ?? '');
        }
    };

    const getSelectedSharedOption = () => relationOptions.find((option) => option.poolId === selectedSharedPoolId) || relationOptions[0] || null;
    const updateNoteText = () => {
        let noteText = '';

        if (profile.type === 'linux') {
            noteText = 'This sizing is specific to this Linux connector instance. Shared Linux DCR planning uses the on-prem vs. Azure split you set here.';
        } else if (profile.type !== 'windows') {
            noteText = getSelectedCriblIngestion()
                ? 'This sizing is specific to this firewall / CEF connector instance. EPS is still used for Sentinel DCR sizing, but Cribl handles log collection.'
                : `This sizing is specific to this firewall / CEF connector instance. The collector VM deployment zone (${getCollectorVmZoneLabel(getSelectedCollectorVmZone())}) is shared across all Syslog / CEF connectors that do not use Cribl.`;
        } else if (profile.populationKind === 'wec') {
            noteText = 'Windows Forwarded Events always sizes WEC servers separately from Windows AMA connector pools.';
        } else if (!profile.hasRelationChoice) {
            noteText = 'Only one AMA connector is selected, so this connector currently owns its Windows server pool.';
        } else if (activeRelationMode === 'same') {
            const sharedOption = getSelectedSharedOption();
            const memberNames = sharedOption?.memberNames || profile.sharedWithNames || [];
            noteText = memberNames.length > 0
                ? `This connector reuses the same AMA server pool as ${memberNames.join(', ')}. Saving here updates every connector on that pool.`
                : 'This connector will reuse an existing Windows AMA server pool.';
        } else {
            noteText = 'This connector keeps an additional AMA server pool. Switching back to Same servers later restores the shared pool without discarding this separate draft.';
        }

        if (criblEligible && getSelectedCriblIngestion() && !/Cribl handles log collection/i.test(noteText)) {
            noteText = `${noteText} Cribl handles log collection — no collector VMs are required.`;
        }

        note.textContent = noteText.trim();
    };

    const applyCriblUiState = (nextDraft = {}) => {
        const criblIngestion = criblEligible && Boolean(nextDraft?.criblIngestion);
        if (criblToggleNote instanceof HTMLElement) {
            criblToggleNote.hidden = !criblIngestion;
        }
        collectorPlacementControls?.setDisabled?.(criblIngestion);
        if (profile.type === 'windows' || profile.type === 'linux') {
            if (fieldRefs.splitFieldEl instanceof HTMLElement) {
                fieldRefs.splitFieldEl.classList.toggle('solution-sizing-collector--disabled', criblIngestion);
            }
            if (relationFieldsetRef instanceof HTMLElement) {
                relationFieldsetRef.classList.toggle('solution-sizing-collector--disabled', criblIngestion);
            }
            // When Cribl handles ingestion, hide server count / split / VM estimation
            grid.hidden = criblIngestion;
            messages.hidden = criblIngestion;
            preview.hidden = criblIngestion;
            docLink.hidden = criblIngestion;
            intro.textContent = criblIngestion
                ? 'Cribl handles log collection for this source — no collection VMs are needed. Save to confirm.'
                : profile.type === 'linux'
                    ? 'Enter the Linux server count plus the on-prem split. The planner will use that mix when sizing shared Linux DCR capacity.'
                    : profile.populationKind === 'wec'
                        ? 'Enter the WEC server count plus the on-prem split. Windows Forwarded Events always stays separate from the AMA host estate.'
                        : 'Enter the Windows server count plus the on-prem split. The planner will size collection VMs and show the math transparently.';
        }
    };

    let renderDraftState = () => ({ isValid: false, result: null, fieldErrors: {}, warnings: [], advisories: [] });

    if (profile.type === 'windows') {
        if (profile.hasRelationChoice) {
            const relationFieldset = document.createElement('fieldset');
            relationFieldset.className = 'solution-sizing-relation';
            relationFieldsetRef = relationFieldset;
            const legend = document.createElement('legend');
            legend.className = 'solution-sizing-relation__legend';
            legend.textContent = relationOptions.length > 1 ? 'AMA server relationship' : 'Server relationship';
            relationFieldset.appendChild(legend);

            const relationChoices = document.createElement('div');
            relationChoices.className = 'solution-sizing-relation__choices';
            const sameLabelText = 'Same servers';
            const additionalLabelText = 'Additional servers';

            const createRelationChoice = (value, title, description) => {
                const label = document.createElement('label');
                label.className = 'solution-sizing-relation__option';
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `solution-sizing-relation-${solution.id}`;
                input.value = value;
                input.checked = activeRelationMode === value;

                const copy = document.createElement('span');
                copy.className = 'solution-sizing-relation__copy';

                const titleNode = document.createElement('span');
                titleNode.className = 'solution-sizing-relation__title';
                titleNode.textContent = title;
                copy.appendChild(titleNode);

                if (description) {
                    const descriptionNode = document.createElement('span');
                    descriptionNode.className = 'solution-sizing-relation__description';
                    descriptionNode.textContent = description;
                    copy.appendChild(descriptionNode);
                }

                label.append(input, copy);
                relationChoices.appendChild(label);
                return input;
            };

            const sameInput = createRelationChoice('same', sameLabelText, 'Reuse the same Windows AMA host estate.');
            const additionalInput = createRelationChoice('additional', additionalLabelText, 'Track a separate host estate for this connector.');
            relationFieldset.appendChild(relationChoices);

            let sharedPoolField = null;
            let sharedPoolSelect = null;
            if (relationOptions.length > 1) {
                sharedPoolSelect = document.createElement('select');
                sharedPoolSelect.className = 'solution-sizing-select';
                relationOptions.forEach((option) => {
                    const optionNode = document.createElement('option');
                    optionNode.value = option.poolId;
                    optionNode.textContent = option.label;
                    sharedPoolSelect.appendChild(optionNode);
                });
                sharedPoolSelect.value = selectedSharedPoolId;
                const sharedPoolFieldParts = createField('Which AMA pool?', sharedPoolSelect, 'Choose the existing host pool this connector should share.');
                sharedPoolField = sharedPoolFieldParts.field;
                sharedPoolField.classList.add('solution-sizing-field--wide');
                relationFieldset.appendChild(sharedPoolField);
            }

            const switchRelationMode = (nextMode) => {
                if (nextMode === activeRelationMode) {
                    updateNoteText();
                    return;
                }
                const currentDraft = collectDraft();
                if (activeRelationMode === 'same') {
                    const currentPoolId = selectedSharedPoolId || getSelectedSharedOption()?.poolId;
                    if (currentPoolId) {
                        sharedPoolDrafts.set(currentPoolId, currentDraft);
                    }
                } else {
                    additionalDraft = currentDraft;
                }

                activeRelationMode = nextMode;
                if (activeRelationMode === 'same') {
                    const sharedOption = getSelectedSharedOption();
                    if (sharedOption?.poolId) {
                        selectedSharedPoolId = sharedOption.poolId;
                    }
                    writeDraftToFields(buildDraft(sharedPoolDrafts.get(selectedSharedPoolId) || sharedOption?.values || draft));
                } else {
                    writeDraftToFields(buildDraft(additionalDraft || draft));
                }
                if (sharedPoolField instanceof HTMLElement) {
                    sharedPoolField.hidden = activeRelationMode !== 'same';
                }
                if (sharedPoolSelect instanceof HTMLSelectElement) {
                    sharedPoolSelect.value = selectedSharedPoolId;
                }
                updateNoteText();
                renderDraftState(collectDraft());
            };

            sameInput.addEventListener('change', () => {
                if (sameInput.checked) {
                    switchRelationMode('same');
                }
            });
            additionalInput.addEventListener('change', () => {
                if (additionalInput.checked) {
                    switchRelationMode('additional');
                }
            });
            if (sharedPoolSelect instanceof HTMLSelectElement) {
                sharedPoolSelect.addEventListener('change', () => {
                    if (activeRelationMode === 'same') {
                        const previousPoolId = selectedSharedPoolId;
                        if (previousPoolId) {
                            sharedPoolDrafts.set(previousPoolId, collectDraft());
                        }
                    }
                    selectedSharedPoolId = sharedPoolSelect.value;
                    const sharedOption = getSelectedSharedOption();
                    writeDraftToFields(buildDraft(sharedPoolDrafts.get(selectedSharedPoolId) || sharedOption?.values || draft));
                    updateNoteText();
                    renderDraftState(collectDraft());
                });
                sharedPoolField.hidden = activeRelationMode !== 'same';
            }

            form.appendChild(relationFieldset);
        }

        const serversInput = document.createElement('input');
        serversInput.type = 'number';
        serversInput.min = '0';
        serversInput.step = '1';
        serversInput.inputMode = 'numeric';
        serversInput.value = String(draft.servers ?? '');

        const splitInput = document.createElement('input');
        splitInput.type = 'number';
        splitInput.min = '0';
        splitInput.max = '100';
        splitInput.step = '1';
        splitInput.inputMode = 'numeric';
        splitInput.value = String(draft.onPremPercent ?? '');

        const serversField = createField(profile.serverCountLabel || 'How many Windows servers?', serversInput);
        const splitField = createField('What split — on-prem vs. Azure?', splitInput, `Azure: ${Math.max(0, 100 - (Number(draft.onPremPercent) || 0))}%`);
        fieldRefs.servers = serversInput;
        fieldRefs.onPremPercent = splitInput;
        fieldRefs.azureHelper = splitField.helper;
        fieldRefs.splitFieldEl = splitField.field;
        grid.append(serversField.field, splitField.field);

        if (profile.populationKind === 'wec') {
            const sourceComputersInput = document.createElement('input');
            sourceComputersInput.type = 'number';
            sourceComputersInput.min = '0';
            sourceComputersInput.step = '1';
            sourceComputersInput.inputMode = 'numeric';
            const sourceComputersField = createField(
                'How many source computers will forward events?',
                sourceComputersInput,
                `Optional helper — uses ~${formatInteger(WEC_RECOMMENDED_CLIENTS_PER_SERVER)} source computers per WEC server.`
            );
            sourceComputersField.field.classList.add('solution-sizing-field--wide');

            const setSourceComputersHelper = (text, { isRecommendation = false } = {}) => {
                sourceComputersField.helper.classList.toggle('solution-sizing-helper--recommendation', isRecommendation);
                if (isRecommendation) {
                    sourceComputersField.helper.innerHTML = `<strong>${text}</strong>`;
                    return;
                }
                sourceComputersField.helper.textContent = text;
            };

            const updateSourceComputerEstimate = () => {
                const rawValue = String(sourceComputersInput.value ?? '').trim();
                if (!rawValue) {
                    setSourceComputersHelper(`Optional helper — uses ~${formatInteger(WEC_RECOMMENDED_CLIENTS_PER_SERVER)} source computers per WEC server.`);
                    return;
                }

                const sourceComputers = Number(rawValue);
                if (!Number.isFinite(sourceComputers) || sourceComputers < 0) {
                    setSourceComputersHelper('Enter 0 or more source computers to estimate the recommended WEC count.');
                    return;
                }

                const estimatedWecServers = estimateWecServersForSourceComputers(sourceComputers);
                setSourceComputersHelper(
                    `Estimated: ${formatInteger(estimatedWecServers)} WEC server${estimatedWecServers === 1 ? '' : 's'} needed (at ~${formatInteger(WEC_RECOMMENDED_CLIENTS_PER_SERVER)} clients per server).`,
                    { isRecommendation: true }
                );
            };

            sourceComputersInput.addEventListener('input', updateSourceComputerEstimate);
            sourceComputersInput.addEventListener('change', updateSourceComputerEstimate);
            updateSourceComputerEstimate();
            grid.appendChild(sourceComputersField.field);
        }
    } else if (profile.type === 'linux') {
        const serversInput = document.createElement('input');
        serversInput.type = 'number';
        serversInput.min = '0';
        serversInput.step = '1';
        serversInput.inputMode = 'numeric';
        serversInput.value = String(draft.servers ?? '');

        const splitInput = document.createElement('input');
        splitInput.type = 'number';
        splitInput.min = '0';
        splitInput.max = '100';
        splitInput.step = '1';
        splitInput.inputMode = 'numeric';
        splitInput.value = String(draft.onPremPercent ?? '');

        const serversField = createField(profile.serverCountLabel || 'How many Linux servers?', serversInput);
        const splitField = createField('What split — on-prem vs. Azure?', splitInput, `Azure: ${Math.max(0, 100 - (Number(draft.onPremPercent) || 0))}%`);
        serversField.field.classList.add('solution-sizing-field--prominent');
        splitField.field.classList.add('solution-sizing-field--prominent');
        fieldRefs.servers = serversInput;
        fieldRefs.onPremPercent = splitInput;
        fieldRefs.azureHelper = splitField.helper;
        fieldRefs.splitFieldEl = splitField.field;
        grid.append(serversField.field, splitField.field);
    } else {
        const epsInput = document.createElement('input');
        epsInput.type = 'number';
        epsInput.min = '0';
        epsInput.step = '100';
        epsInput.inputMode = 'numeric';
        epsInput.value = String(draft.eps ?? '');
        const epsField = createField('What is the expected EPS for this firewall?', epsInput, 'Per site / connector instance');
        epsField.field.classList.add('solution-sizing-field--prominent');
        fieldRefs.eps = epsInput;
        grid.appendChild(epsField.field);

        const measuredEpsValue = window.discoveredInfrastructure?.summary?.totalEPS;
        if (typeof measuredEpsValue === 'number' && measuredEpsValue > 0) {
            const epsNote = document.createElement('p');
            epsNote.className = 'solution-sizing-measurement-note';
            epsNote.textContent = '📊 Based on workspace measurement (24h avg)';
            grid.appendChild(epsNote);
        }

        collectorPlacementControls = createCollectorVmPlacementControls(profile, {
            onChange: () => {
                updateNoteText();
                renderDraftState(collectDraft());
            }
        });
    }

    form.append(grid, ...(collectorPlacementControls ? [collectorPlacementControls.element] : []), messages, preview, docLink);

    const actions = document.createElement('div');
    actions.className = 'solution-sizing-actions';
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'app-button app-button--accent';
    saveButton.textContent = 'Save sizing';
    const defaultsButton = document.createElement('button');
    defaultsButton.type = 'button';
    defaultsButton.className = 'app-button app-button--subtle';
    defaultsButton.textContent = "I don't know — use defaults";
    actions.append(saveButton, defaultsButton);
    form.appendChild(actions);

    let debounceHandle = 0;

    renderDraftState = (nextDraft) => {
        applyCriblUiState(nextDraft);
        updateNoteText();
        const sizingMessages = getSizingResultMessages(profile.type, nextDraft, { populationKind: profile.populationKind });
        messages.replaceChildren();
        preview.replaceChildren();

        Object.entries(fieldRefs).forEach(([fieldKey, field]) => {
            if (!(field instanceof HTMLInputElement)) {
                return;
            }
            const isValid = !sizingMessages.fieldErrors[fieldKey];
            field.classList.toggle('is-invalid', !isValid);
            field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
        });

        if (fieldRefs.azureHelper) {
            const onPremPercent = Number(nextDraft.onPremPercent) || 0;
            fieldRefs.azureHelper.textContent = `Azure: ${Math.max(0, 100 - onPremPercent)}%`;
        }

        Object.values(sizingMessages.fieldErrors).forEach((message) => {
            const error = document.createElement('p');
            error.className = 'solution-sizing-message is-error';
            error.textContent = message;
            messages.appendChild(error);
        });
        sizingMessages.warnings.forEach((message) => {
            const warning = document.createElement('p');
            warning.className = 'solution-sizing-message is-warning';
            warning.textContent = message;
            messages.appendChild(warning);
        });
        sizingMessages.advisories.forEach((message) => {
            const advisory = document.createElement('p');
            advisory.className = 'solution-sizing-message is-advisory';
            advisory.textContent = message;
            messages.appendChild(advisory);
        });

        if (sizingMessages.result) {
            getSizingDetailLines({
                ...profile,
                collectorVmZone: getSelectedCollectorVmZone(),
                collectorVmZoneLabel: getCollectorVmZoneLabel(getSelectedCollectorVmZone()),
                criblIngestion: criblEligible && Boolean(nextDraft?.criblIngestion),
                result: sizingMessages.result
            }).forEach((line, index) => {
                const lineNode = document.createElement(index === 0 ? 'strong' : 'p');
                lineNode.className = index === 0 ? 'solution-sizing-result' : 'solution-sizing-line';
                lineNode.textContent = line;
                preview.appendChild(lineNode);
            });
            docLink.href = sizingMessages.result.docUrl || '#';
            docLink.textContent = sizingMessages.result.docLabel || 'Sizing guidance';
            docLink.hidden = !sizingMessages.result.docUrl;
        } else {
            docLink.hidden = true;
        }

        return sizingMessages;
    };

    const saveDraft = (nextDraft) => {
        const sizingMessages = renderDraftState(nextDraft);
        if (!sizingMessages.isValid || !sizingMessages.result) {
            return;
        }
        const draftToSave = criblEligible
            ? { ...nextDraft, criblIngestionExplicit: true }
            : { ...nextDraft, criblIngestionExplicit: false };
        saveConnectorCapacityValues(solution, draftToSave, {
            selectedSolutions: getSelectedSolutionsData(),
            relation: profile.hasRelationChoice
                ? (activeRelationMode === 'additional' ? 'additional' : 'same')
                : profile.relation,
            targetPoolId: profile.hasRelationChoice && activeRelationMode === 'same'
                ? selectedSharedPoolId
                : ''
        });
        closeSizingDrawer();
        refreshVisibleSolutionCards();
    };

    const schedulePreviewRefresh = () => {
        window.clearTimeout(debounceHandle);
        debounceHandle = window.setTimeout(() => renderDraftState(collectDraft()), 300);
    };

    Object.values(fieldRefs).forEach((field) => {
        if (!(field instanceof HTMLInputElement)) {
            return;
        }
        field.addEventListener('input', schedulePreviewRefresh);
        field.addEventListener('change', schedulePreviewRefresh);
        field.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveDraft(collectDraft());
            }
        });
    });

    saveButton.addEventListener('click', (event) => {
        event.preventDefault();
        saveDraft(collectDraft());
    });
    defaultsButton.addEventListener('click', (event) => {
        event.preventDefault();
        const measuredEps = window.discoveredInfrastructure?.summary?.totalEPS;
        const defaultDraft = buildDraft(profile.type === 'firewall'
            ? {
                ...createDefaultSizingDraft(profile.type, { measuredEps }),
                collectorVmZone: getSelectedCollectorVmZone()
            }
            : createDefaultSizingDraft(profile.type, { measuredEps }));
        writeDraftToFields(defaultDraft);
        saveDraft(defaultDraft);
    });

    updateNoteText();
    renderDraftState(draft);
    return form;
}

function createSizingDrawerOverview(snapshot = {}) {
    const card = document.createElement('section');
    card.className = 'solution-sizing-drawer-card';
    card.appendChild(createSizingDrawerCloseButton());
    card.appendChild(createSizingDrawerHeader({
        title: 'Connector sizing',
        description: 'Select a connector card to size it here. Saved inputs stay on the cards as compact summaries.'
    }));

    const entries = (snapshot.selectedSolutions || []).map((solution) => {
        const profile = getSolutionCapacityProfile(solution, snapshot);
        if (!profile.requiresSizing) {
            return null;
        }

        const subtitle = profile.type === 'windows'
            ? profile.populationKind === 'wec'
                ? 'Dedicated WEC server pool'
                : profile.relation === 'same'
                    ? `Same servers as ${profile.sharedWithNames.join(', ')}`
                    : profile.hasRelationChoice
                        ? 'Additional AMA server pool'
                        : 'Windows AMA server pool'
            : profile.type === 'linux'
                ? 'Linux server population'
                : profile.type === 'log_selector'
                    ? 'Log source selection'
                    : 'Per-site firewall sizing';

        return {
            solutionId: solution.id,
            title: solution.name,
            subtitle,
            summary: profile.hasSavedSizing ? profile.summary : (profile.relation === 'same' ? 'Shared sizing needed' : 'Sizing needed'),
            tag: profile.summaryTag || (profile.isDefault ? 'Default' : ''),
            tone: profile.hasSavedSizing ? (profile.isDefault ? 'default' : 'saved') : 'pending'
        };
    }).filter(Boolean);

    if (entries.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'solution-sizing-drawer-empty';
        emptyState.textContent = 'No sizing connectors are selected yet. Add a Windows, Linux, or firewall connector to size it here.';
        card.appendChild(emptyState);
        return card;
    }

    const list = document.createElement('div');
    list.className = 'solution-sizing-overview-list';
    entries.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = ['solution-sizing-overview-item', entry.tone ? `is-${entry.tone}` : ''].filter(Boolean).join(' ');

        const headingRow = document.createElement('div');
        headingRow.className = 'solution-sizing-overview-item-heading';
        const title = document.createElement('strong');
        title.textContent = entry.title;
        headingRow.appendChild(title);
        if (entry.tag) {
            const tag = document.createElement('span');
            tag.className = 'solution-sizing-summary-tag';
            tag.textContent = entry.tag;
            headingRow.appendChild(tag);
        }

        const subtitle = document.createElement('p');
        subtitle.className = 'solution-sizing-overview-item-subtitle';
        subtitle.textContent = entry.subtitle;

        const summary = document.createElement('p');
        summary.className = 'solution-sizing-overview-item-summary';
        summary.textContent = entry.summary;

        button.append(headingRow, subtitle, summary);
        button.addEventListener('click', () => openSizingDrawerForSolution(entry.solutionId, { focusPanel: true }));
        list.appendChild(button);
    });

    card.appendChild(list);
    return card;
}

function renderSizingDrawer() {
    if (!(sizingDrawerPanel instanceof HTMLElement)) {
        return;
    }

    const snapshot = getCurrentCapacitySnapshot();
    const activeSolution = activeSizingSolutionId ? getSolutionById(activeSizingSolutionId) : null;
    const activeProfile = activeSolution ? getSolutionCapacityProfile(activeSolution, snapshot) : null;
    const canRenderActiveSolution = Boolean(activeSolution && isSolutionIncluded(activeSolution.id) && activeProfile?.requiresSizing);

    sizingDrawerPanel.replaceChildren();

    if (!canRenderActiveSolution) {
        activeSizingSolutionId = '';
        sizingDrawerPanel.appendChild(createSizingDrawerOverview(snapshot));
        syncSizingDrawerSelection();
        return;
    }

    const card = document.createElement('section');
    card.className = 'solution-sizing-drawer-card';
    card.appendChild(createSizingDrawerCloseButton());
    card.appendChild(createSizingDrawerHeader({
        title: activeSolution.name,
        description: activeProfile.hasSavedSizing ? activeProfile.summary : 'Sizing needed'
    }));
    card.appendChild(createSizingEditor(activeSolution, activeProfile, snapshot));
    sizingDrawerPanel.appendChild(card);
    syncSizingDrawerSelection();
}

function openSizingDrawerForSolution(solutionId = '', { focusPanel = false } = {}) {
    if (isSizingDrawerBlockingSolutionInteraction(solutionId)) {
        notifySizingDrawerLock({ focusPanel: true });
        return false;
    }

    const solution = getSolutionById(solutionId);
    if (!solution) {
        return false;
    }

    const profile = getSolutionCapacityProfile(solution, getCurrentCapacitySnapshot());
    if (!profile?.requiresSizing) {
        return false;
    }

    activeSizingSolutionId = solution.id;
    setSizingDrawerState(true, { focusPanel });
    renderSizingDrawer();
    return true;
}

function initSizingDrawer() {
    solutionsWorkspace = document.getElementById('solutionsWorkspace');
    sizingDrawerShell = document.getElementById('solutionSizingDrawerShell');
    sizingDrawerBackdrop = document.getElementById('solutionSizingDrawerBackdrop');
    sizingDrawerPanel = document.getElementById('solutionSizingDrawerPanel');

    if (!(sizingDrawerShell instanceof HTMLElement) || !(sizingDrawerPanel instanceof HTMLElement)) {
        return;
    }

    if (!sizingDrawerShell.dataset.bound) {
        sizingDrawerBackdrop?.addEventListener('click', closeSizingDrawer);
        sizingDrawerShell.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeSizingDrawer();
            }
        });
        sizingDrawerShell.dataset.bound = 'true';
    }

    sizingDrawerPanel.tabIndex = -1;
    setSizingDrawerState(isSizingDrawerOpen);

    if (isSizingDrawerOpen) {
        renderSizingDrawer();
    } else {
        syncSizingDrawerSelection();
    }
}

function refreshVisibleSolutionCards() {
    const capacitySnapshot = getCurrentCapacitySnapshot();
    document.querySelectorAll('.solution-item[data-id]').forEach((card) => {
        const solution = card.__solutionData;
        if (!solution?.id) {
            return;
        }
        syncSolutionCardState(card, solution.id, { capacitySnapshot });
    });
    syncSizingDrawerSelection();
    if (isSizingDrawerOpen) {
        renderSizingDrawer();
    }
}

function syncSizingStateBadge(solutionCard, profile, isIncluded) {
    const badgeHost = solutionCard.__sizingBadgeHost;
    if (!(badgeHost instanceof HTMLElement)) {
        return;
    }

    badgeHost.replaceChildren();
    solutionCard.classList.toggle('has-sizing-state', Boolean(isIncluded && profile?.requiresSizing));
    if (!isIncluded || !profile?.requiresSizing) {
        return;
    }

    const badge = document.createElement('span');
    const tone = getSizingBadgeTone(profile);
    badge.className = ['solution-sizing-state-badge', tone ? `is-${tone}` : ''].filter(Boolean).join(' ');
    badge.textContent = getSizingBadgeText(profile);
    badgeHost.appendChild(badge);
}

function renderSolutionSizingSection(solutionCard, solution, { capacitySnapshot = null } = {}) {
    const sizingHost = solutionCard.__sizingHost;
    if (!(sizingHost instanceof HTMLElement)) {
        return;
    }

    const isIncluded = isSolutionIncluded(solution.id);
    const profile = getSolutionCapacityProfile(solution, capacitySnapshot || getCurrentCapacitySnapshot());
    syncSizingStateBadge(solutionCard, profile, isIncluded);
    sizingHost.replaceChildren();
    solutionCard.classList.toggle('has-capacity-input', Boolean(isIncluded && profile?.requiresSizing));

    if (!isIncluded || !profile?.requiresSizing) {
        return;
    }

    const summaryButton = document.createElement('button');
    summaryButton.type = 'button';
    summaryButton.className = 'solution-sizing-summary';
    summaryButton.setAttribute('aria-label', `Open sizing panel for ${solution.name}`);

    const summaryCopy = document.createElement('span');
    summaryCopy.className = 'solution-sizing-summary-copy';
    summaryCopy.textContent = profile.hasSavedSizing
        ? profile.summary
        : profile.relation === 'same'
            ? 'Shared sizing needed'
            : 'Sizing needed';
    summaryButton.appendChild(summaryCopy);

    const tagText = profile.summaryTag || (profile.isDefault ? 'Default sizing' : '');
    if (tagText) {
        const tag = document.createElement('span');
        tag.className = 'solution-sizing-summary-tag';
        tag.textContent = tagText;
        summaryButton.appendChild(tag);
    }

    summaryButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openSizingDrawerForSolution(solution.id, { focusPanel: true });
    });

    sizingHost.appendChild(summaryButton);
}function syncSolutionCardState(solutionCard, solutionId, { capacitySnapshot = null } = {}) {
    if (!(solutionCard instanceof Element)) {
        return;
    }

    const isSelected = selectedSolutions.has(solutionId);
    const isConnected = connectedSolutionIds.has(solutionId);
    const isDeprecatedConnected = deprecatedConnectedSolutionIds.has(solutionId);
    const isIncluded = isSelected || isConnected;
    const checkbox = solutionCard.querySelector('.solution-item-check');
    const solutionName = solutionCard.dataset.name || 'solution';
    const solution = solutionCard.__solutionData;

    solutionCard.classList.toggle('selected', isSelected);
    solutionCard.classList.toggle('already-connected', isConnected && !isDeprecatedConnected);
    solutionCard.classList.toggle('legacy-connected', isDeprecatedConnected);
    solutionCard.classList.toggle('is-sizing-panel-active', isSizingDrawerOpen && activeSizingSolutionId === solutionId);

    if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = isIncluded;
        checkbox.disabled = isConnected;
        checkbox.setAttribute('aria-label', `${isIncluded ? 'Included' : 'Include'} ${solutionName} in the onboarding plan`);
        checkbox.title = isDeprecatedConnected
            ? `${solutionName} is connected via a deprecated connector — consider migrating`
            : isConnected ? `${solutionName} is already connected in the workspace` : '';
    }

    if (solution) {
        renderSolutionSizingSection(solutionCard, solution, { capacitySnapshot });
    }
}

function bindSolutionCardData(card, solution, { thirdPartyCategory = '' } = {}) {
    if (!(card instanceof HTMLElement) || !solution) {
        return;
    }

    card.dataset.id = solution.id;
    card.dataset.name = solution.name;

    const resolvedThirdPartyCategory = thirdPartyCategory
        || (THIRD_PARTY_CATEGORY_LOOKUP.has(String(solution?.category || '').toLowerCase())
            ? getThirdPartyCategoryId(solution)
            : '');

    if (resolvedThirdPartyCategory) {
        card.dataset.thirdPartyCategory = resolvedThirdPartyCategory;
    } else {
        delete card.dataset.thirdPartyCategory;
    }

    card.__solutionData = solution;
}

function createSolutionItem(solution, recommendedIds = new Set()) {
    const item = document.createElement('article');
    item.className = 'solution-item';
    bindSolutionCardData(item, solution);

    const isRecommended = recommendedIds.has(solution.id);
    const isValuable = hasValuableContent(solution);
    const isFeatured = solution.isFeatured === true;

    if (isRecommended) {
        item.classList.add('recommended');
    }

    if (isValuable || isFeatured) {
        const valuableStar = document.createElement('span');
        valuableStar.className = 'solution-item-corner-star';
        valuableStar.setAttribute('aria-hidden', 'true');
        valuableStar.textContent = '★';
        item.appendChild(valuableStar);
    }

    const main = document.createElement('div');
    main.className = 'solution-item-main';

    const info = document.createElement('div');
    info.className = 'solution-item-info';

    const header = document.createElement('div');
    header.className = 'solution-item-header';

    const name = document.createElement('div');
    name.className = 'solution-item-name';

    const titleText = document.createElement('strong');
    titleText.className = 'solution-item-title-text';
    titleText.textContent = solution.name;
    name.appendChild(titleText);

    const sizingBadgeHost = document.createElement('span');
    sizingBadgeHost.className = 'solution-sizing-state-host';
    name.appendChild(sizingBadgeHost);

    if (isRecommended) {
        const recommendedText = document.createElement('span');
        recommendedText.className = 'solution-item-recommended-inline';
        recommendedText.textContent = '— Based on your environment selection';
        name.appendChild(recommendedText);
    }

    if (solution.mandatory === true) {
        const mandatoryBadge = document.createElement('span');
        mandatoryBadge.className = 'existing-connector-badge';
        mandatoryBadge.style.background = 'var(--accent-primary, #4fc3f7)';
        mandatoryBadge.style.color = '#000';
        mandatoryBadge.textContent = '⚡ USX Required';
        mandatoryBadge.title = 'Mandatory for all new customers as part of the Unified SecOps (USX) motion';
        name.appendChild(mandatoryBadge);
    }

    if (connectedSolutionIds.has(solution.id)) {
        const deprecatedInfo = deprecatedConnectedSolutionIds.get(solution.id);
        if (deprecatedInfo) {
            const legacyBadge = document.createElement('span');
            legacyBadge.className = 'existing-connector-badge existing-connector-badge--legacy';
            legacyBadge.textContent = '⚠ Legacy';
            legacyBadge.title = deprecatedInfo.reason;
            name.appendChild(legacyBadge);

            const migrateHint = document.createElement('span');
            migrateHint.className = 'solution-item-migrate-hint';
            migrateHint.textContent = deprecatedInfo.reason;
            name.appendChild(migrateHint);
        } else {
            const connBadge = document.createElement('span');
            connBadge.className = 'existing-connector-badge';
            connBadge.textContent = '✓ Connected';
            name.appendChild(connBadge);
        }
    }

    const connectorCount = getConnectorCount(solution);
    const analyticRuleCount = getAnalyticRuleCount(solution);
    const workbookCount = getWorkbookCount(solution);
    const playbookCount = getPlaybookCount(solution);

    const meta = document.createElement('div');
    meta.className = 'solution-item-meta';
    if (connectorCount <= 0) {
        meta.textContent = `Content Pack · ${analyticRuleCount} rules · ${workbookCount} workbooks · ${playbookCount} playbooks`;
    } else {
        meta.textContent = `${connectorCount} connectors · ${analyticRuleCount} rules · ${workbookCount} workbooks · ${playbookCount} playbooks`;
    }

    const tags = document.createElement('div');
    tags.className = 'solution-tags';

    if (isFeatured) {
        const featuredTag = document.createElement('span');
        featuredTag.className = 'solution-tag solution-tag-featured';
        featuredTag.textContent = '★ FEATURED';
        tags.appendChild(featuredTag);
    }

    const thirdPartyCategoryMeta = THIRD_PARTY_CATEGORY_LOOKUP.get(String(solution?.category || '').toLowerCase());
    if (thirdPartyCategoryMeta && thirdPartyCategoryMeta.id !== 'all') {
        const categoryTag = document.createElement('span');
        categoryTag.className = 'solution-tag solution-tag-category';
        categoryTag.textContent = thirdPartyCategoryMeta.label;
        tags.appendChild(categoryTag);
    }

    const versionBadge = document.createElement('div');
    versionBadge.className = 'version-badge';
    versionBadge.dataset.solution = solution.id;

    const complexity = Number(solution?.value_scoring?.complexity_level) || 0;
    const rawDifficulty = solution?.onboarding?.difficulty
        || (complexity <= 1 ? 'Easy' : complexity <= 2 ? 'Moderate' : 'Extended');
    const diffLabel = normalizeDifficultyLabel(rawDifficulty);
    const diffClass = diffLabel.toLowerCase() === 'extended' ? 'hard' : diffLabel.toLowerCase();
    const hours = computeConnectorSetupHours(solution);
    const hoursText = hours > 0 ? ` · ~${Math.round(hours)}h` : '';

    const badges = document.createElement('div');
    badges.className = 'solution-item-badges solution-item-footer';

    if (complexity > 0 || solution?.onboarding?.difficulty) {
        const diffBadge = document.createElement('span');
        diffBadge.className = `solution-difficulty-badge difficulty-${diffClass}`;
        diffBadge.textContent = `${diffLabel}${hoursText}`;
        badges.appendChild(diffBadge);
    }

    const rolesSection = createRolesSection(solution);
    const infrastructureSection = createInfrastructureSection(solution);

    header.appendChild(name);
    info.append(header, meta);

    if (tags.childElementCount > 0) {
        info.appendChild(tags);
    }

    info.appendChild(versionBadge);

    if (rolesSection) {
        info.appendChild(rolesSection);
    }

    if (infrastructureSection) {
        info.appendChild(infrastructureSection);
    }

    const sizingHost = document.createElement('div');
    sizingHost.className = 'solution-sizing-host';
    info.appendChild(sizingHost);

    if (badges.childElementCount > 0) {
        info.appendChild(badges);
    }

    main.append(createLogoBadge(solution.logo, solution.name, '🔹'), info);

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'solution-item-check';
    check.addEventListener('click', (event) => {
        if (blockSolutionInteractionWhileSizing(solution.id, event)) {
            return;
        }
        event.stopPropagation();
    });
    check.addEventListener('change', () => {
        if (isSizingDrawerBlockingSolutionInteraction(solution.id)) {
            notifySizingDrawerLock();
            refreshVisibleSolutionCards();
            return;
        }
        toggleSolution(item, solution.id);
    });

    item.addEventListener('click', (event) => {
        if (blockSolutionInteractionWhileSizing(solution.id, event)) {
            return;
        }

        if (event.target instanceof HTMLElement && event.target.closest('.solution-item-check, .solution-sizing-host')) {
            return;
        }

        if (isSolutionIncluded(solution.id) && openSizingDrawerForSolution(solution.id)) {
            return;
        }

        toggleSolution(item, solution.id);
    });

    item.append(main, check);
    bindSolutionCardData(item, solution);
    item.__sizingHost = sizingHost;
    item.__sizingBadgeHost = sizingBadgeHost;
    syncSolutionCardState(item, solution.id, {
        capacitySnapshot: getCurrentCapacitySnapshot()
    });
    return item;
}

function createPanelHeader(panel, category) {
    const header = document.createElement('div');
    header.className = 'solution-panel-header';

    const icon = document.createElement('span');
    icon.className = 'solution-panel-icon';
    icon.textContent = category.icon;

    const title = document.createElement('h3');
    title.textContent = category.label;

    const count = document.createElement('span');
    const totalSolutions = (category.solutions || []).length;
    count.className = 'solution-count';
    count.dataset.total = String(totalSolutions);
    count.textContent = formatSolutionCountText(totalSolutions, totalSolutions);
    title.append(' ', count);

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '▼';

    header.append(icon, title, chevron);
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'true');

    const toggleCollapse = () => {
        const isCollapsed = panel.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', String(!isCollapsed));
    };

    header.addEventListener('click', toggleCollapse);
    header.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleCollapse();
        }
    });

    return header;
}

function createSolutionPanel(category, recommendedIds) {
    const panel = document.createElement('div');
    panel.className = 'solution-panel';

    const header = createPanelHeader(panel, category);
    const list = document.createElement('div');
    list.className = 'solution-list';

    const sortedSolutions = sortSolutionsForDisplay(category.solutions || [], recommendedIds);

    sortedSolutions.forEach((solution) => {
        list.appendChild(createSolutionItem(solution, recommendedIds));
    });

    panel.append(header, list);
    return panel;
}

function updateSolutionFilterEmptyState(visibleCount) {
    if (!(filterEmptyState instanceof HTMLElement)) {
        return;
    }

    if (visibleCount > 0) {
        filterEmptyState.hidden = true;
        filterEmptyState.textContent = '';
        return;
    }

    filterEmptyState.hidden = false;
    filterEmptyState.textContent = step3ViewState.searchQuery
        ? `No connectors match “${step3ViewState.searchQuery}”. Try a different keyword or clear the search.`
        : 'No connectors are available to display.';
}

function updateVisibleSolutionCounts() {
    document.querySelectorAll('.solution-category-section').forEach((section) => {
        const totalCards = section.querySelectorAll('.solution-item[data-id]').length;
        const visibleCards = section.querySelectorAll('.solution-item[data-id]:not([hidden])').length;
        const count = section.querySelector('.solution-category-heading .solution-count');
        if (count) {
            count.textContent = formatSolutionCountText(visibleCards, totalCards);
        }
        section.hidden = visibleCards === 0;
    });

    document.querySelectorAll('.solution-panel').forEach((panel) => {
        const totalCards = panel.querySelectorAll('.solution-item[data-id]').length;
        const visibleCards = panel.querySelectorAll('.solution-item[data-id]:not([hidden])').length;
        const count = panel.querySelector('.solution-panel-header .solution-count');
        if (count) {
            count.textContent = formatSolutionCountText(visibleCards, totalCards);
        }

        const categorySections = panel.querySelectorAll('.solution-category-section');
        if (categorySections.length > 0) {
            const visibleSections = panel.querySelectorAll('.solution-category-section:not([hidden])').length;
            panel.hidden = visibleSections === 0;
            return;
        }

        panel.hidden = visibleCards === 0;
    });
}

function applyStep3Filters() {
    const searchTerms = getSolutionSearchTerms(step3ViewState.searchQuery);
    let visibleCount = 0;

    document.querySelectorAll('.solution-item[data-id]').forEach((card) => {
        const solution = card.__solutionData || getSolutionById(card.dataset.id || '');
        if (!solution) {
            card.hidden = true;
            return;
        }

        if (card.__solutionData !== solution) {
            card.__solutionData = solution;
        }

        const matchesSearch = solutionMatchesSearch(solution, searchTerms);
        card.hidden = !matchesSearch;
        if (matchesSearch) {
            visibleCount += 1;
        }
    });

    updateVisibleSolutionCounts();
    updateSolutionFilterEmptyState(visibleCount);
}

export function applySolutionSearch(query = '') {
    step3ViewState.searchQuery = String(query || '').trim();
    applyStep3Filters();
}

function createThirdPartySolutionPanel(category, recommendedIds) {
    const panel = document.createElement('div');
    panel.className = 'solution-panel';
    panel.dataset.panelType = 'third-party';

    const header = createPanelHeader(panel, category);
    const sectionsHost = document.createElement('div');
    sectionsHost.className = 'third-party-solution-sections';

    const categoryBuckets = THIRD_PARTY_CATEGORY_DEFINITIONS
        .filter((entry) => entry.id !== 'all')
        .reduce((lookup, entry) => {
            lookup.set(entry.id, []);
            return lookup;
        }, new Map());

    (category.solutions || []).forEach((solution) => {
        const categoryId = getThirdPartyCategoryId(solution);
        if (!categoryBuckets.has(categoryId)) {
            categoryBuckets.set(categoryId, []);
        }
        categoryBuckets.get(categoryId).push(solution);
    });

    categoryBuckets.forEach((solutions, categoryId) => {
        if (solutions.length === 0) {
            return;
        }

        const categoryMeta = getThirdPartyCategoryMeta(categoryId);
        const section = document.createElement('section');
        section.className = 'solution-category-section';
        section.dataset.category = categoryId;

        const heading = document.createElement('h3');
        heading.className = 'solution-category-heading';

        const headingLabel = document.createElement('span');
        headingLabel.textContent = `${categoryMeta.icon} ${categoryMeta.label}`;

        const headingCount = document.createElement('span');
        headingCount.className = 'solution-count';
        headingCount.dataset.total = String(solutions.length);
        headingCount.textContent = formatSolutionCountText(solutions.length, solutions.length);

        heading.append(headingLabel, ' ', headingCount);

        const list = document.createElement('div');
        list.className = 'solution-list third-party-solution-list';

        const sortedSolutions = sortSolutionsForDisplay(solutions, recommendedIds);

        sortedSolutions.forEach((solution) => {
            const card = createSolutionItem(solution, recommendedIds);
            bindSolutionCardData(card, solution, { thirdPartyCategory: categoryId });
            list.appendChild(card);
        });

        section.append(heading, list);
        sectionsHost.appendChild(section);
    });

    panel.append(header, sectionsHost);
    return panel;
}

function updateCatalogSummary() {
    const categories = Object.values(solutionsData?.categories || {});
    const solutionCount = categories.reduce((total, category) => total + (category.solutions || []).length, 0);
    setCatalogInfo(`${solutionCount} solutions across ${categories.length} categories loaded from the local catalog.`);
}

export async function loadSolutionData() {
    for (const url of solutionDataUrls) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                continue;
            }

            solutionsData = normalizeSolutionCatalog(await response.json());
            updateCatalogSummary();
            return solutionsData;
        } catch (error) {
            console.error('Failed to load solutions data from', url, error);
        }
    }

    setCatalogInfo('Unable to load the local solution catalog.');
    return null;
}

export function toggleVendor(card) {
    const vendor = card?.dataset?.vendor;
    if (!vendor) {
        return;
    }

    if (selectedVendors.has(vendor)) {
        selectedVendors.delete(vendor);
        card.classList.remove('selected');
    } else {
        selectedVendors.add(vendor);
        card.classList.add('selected');
    }

    syncCriblEnvironmentSelection({ clearCapacity: !isCriblEnvironmentSelected() });
    refreshVisibleSolutionCards();
    updateStep3Button();
}

export function initStep3() {
    const panelsContainer = document.getElementById('solutionPanels');
    if (!solutionsData || !panelsContainer) {
        return;
    }

    panelsContainer.replaceChildren();
    filterEmptyState = null;
    selectedCategories.clear();
    Object.keys(solutionsData?.categories || {}).forEach((category) => selectedCategories.add(category));
    syncCriblEnvironmentSelection({ clearCapacity: !isCriblEnvironmentSelected() });

    const recommendedIds = getPreselectedSolutionIds();

    const banner = document.getElementById('preselectionBanner');
    if (banner) {
        banner.hidden = recommendedIds.size === 0;
    }

    const nlpSection = document.getElementById('nlpSection');
    if (nlpSection) {
        nlpSection.hidden = false;
    }

    const visibleSolutions = [];

    selectedCategories.forEach((categoryKey) => {
        const category = solutionsData.categories[categoryKey];
        if (!category) {
            return;
        }

        const panel = categoryKey === 'third_party'
            ? createThirdPartySolutionPanel(category, recommendedIds)
            : createSolutionPanel(category, recommendedIds);
        panelsContainer.appendChild(panel);
        visibleSolutions.push(...(category.solutions || []));
    });

    filterEmptyState = document.createElement('p');
    filterEmptyState.className = 'helper-text solution-filter-empty';
    filterEmptyState.hidden = true;
    panelsContainer.appendChild(filterEmptyState);

    initSizingDrawer();
    applySolutionSearch(document.getElementById('nlpInput')?.value || '');
    void fetchAndDisplayVersions(visibleSolutions);
    updateStep3Button();
}

export function toggleSolution(element, solutionId) {
    void element;

    if (isSizingDrawerBlockingSolutionInteraction(solutionId)) {
        notifySizingDrawerLock();
        refreshVisibleSolutionCards();
        updateStep3Button();
        return;
    }

    if (connectedSolutionIds.has(solutionId)) {
        if (!openSizingDrawerForSolution(solutionId)) {
            refreshVisibleSolutionCards();
        }
        updateStep3Button();
        return;
    }

    const wasSelected = selectedSolutions.has(solutionId);
    if (wasSelected) {
        selectedSolutions.delete(solutionId);
        sessionExplicitSolutionSelections.delete(solutionId);
        if (activeSizingSolutionId === solutionId) {
            activeSizingSolutionId = '';
        }
    } else {
        selectedSolutions.add(solutionId);
        sessionExplicitSolutionSelections.add(solutionId);
    }

    persistSelectedSolutions();
    refreshVisibleSolutionCards();

    if (!wasSelected) {
        openSizingDrawerForSolution(solutionId);
    }

    updateStep3Button();
}

export function updateStep3Button() {
    const nextButton = document.getElementById('step3Next');
    if (nextButton) {
        nextButton.disabled = selectedSolutions.size === 0 && connectedSolutionIds.size === 0;
    }
}

export function getSelectedSolutionsData() {
    const selectedIds = new Set([...selectedSolutions, ...connectedSolutionIds]);
    return getAllSolutions().filter((solution) => selectedIds.has(solution.id));
}
