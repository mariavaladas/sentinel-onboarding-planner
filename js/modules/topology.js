import { getConnectorCapacitySnapshot } from '../gantt-planner.js';
import { getSolutionCapacityProfile, DEFAULT_COLLECTOR_VM_ZONE, DEFAULT_WINDOWS_ONPREM_PERCENT, DEFAULT_LINUX_ONPREM_PERCENT, FIREWALL_VM_EPS_CAPACITY, DEFAULT_FIREWALL_EPS, normalizeCollectorVmZone } from './capacity.js';

// topology.js — SIEM ingestion topology visualization using React Flow

const TOPOLOGY_LOGOS = {
    azure: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/microsoft-azure.svg',
    microsoft365: 'https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/Workbooks/Images/Logos/office365_logo.svg',
    windows: 'https://raw.githubusercontent.com/gilbarbara/logos/main/logos/microsoft-windows-icon.svg',
    linux: 'https://raw.githubusercontent.com/torvalds/linux/master/Documentation/images/logo.svg',
    cribl: 'https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/Logos/Cribl-Logo.svg'
};

const PATH_CONFIGS = {
    syslog_cef: { color: '#f59e0b', sourceLabel: 'On-Premises / IaaS', sourceIcon: '🖥️', logoUrl: TOPOLOGY_LOGOS.linux, pathType: 'server', serverLabel: 'Linux Forwarder', agentLabel: 'AMA Agent', serverOs: 'linux', dcr: 'DCR: Syslog/CEF', protocol: 'Syslog / CEF' },
    linux_server: { color: '#22c55e', sourceLabel: 'Linux Servers', sourceIcon: '🐧', logoUrl: TOPOLOGY_LOGOS.linux, pathType: 'server', serverLabel: 'Linux Server', agentLabel: 'AMA Agent', serverOs: 'linux', dcr: 'Linux DCR', protocol: 'Syslog (via AMA)' },
    api: { color: '#8b5cf6', sourceLabel: 'Cloud / SaaS Vendors', sourceIcon: '☁️', pathType: 'boxes', pathBoxes: [{ icon: '🔌', label: 'CCP / API Connector' }], dcr: 'DCR: Custom Tables', protocol: 'REST API (Polling)' },
    azure_native: { color: '#0078d4', sourceLabel: 'Azure Resources', sourceIcon: '⛅', logoUrl: TOPOLOGY_LOGOS.azure, pathType: 'boxes', pathBoxes: [{ icon: '⚙️', label: 'Diagnostic Settings' }], dcr: null, protocol: 'Azure Resource Manager' },
    direct: { color: '#10b981', sourceLabel: 'Microsoft 365 / Defender', sourceIcon: '🛡️', logoUrl: TOPOLOGY_LOGOS.microsoft365, pathType: 'boxes', pathBoxes: [{ icon: '⚡', label: 'Native Connector' }], dcr: null, protocol: 'Direct Integration' },
    logic_app: { color: '#ec4899', sourceLabel: 'Custom / Third-Party APIs', sourceIcon: '🔗', pathType: 'boxes', pathBoxes: [{ icon: '⚙️', label: 'Logic App / Function' }, { icon: '📡', label: 'Data Collector API' }], dcr: 'DCR: Custom Logs', protocol: 'HTTP (Webhook/Poll)' },
    windows_events: { color: '#06b6d4', sourceLabel: 'Windows Servers', sourceIcon: '🪟', logoUrl: TOPOLOGY_LOGOS.windows, pathType: 'server', serverLabel: 'Windows Server', agentLabel: 'AMA Agent', serverOs: 'windows', dcr: 'Windows DCR', protocol: 'Windows Events (XPath)' },
    event_hub: { color: '#f97316', sourceLabel: 'Event Hub Sources', sourceIcon: '📨', logoUrl: TOPOLOGY_LOGOS.azure, pathType: 'boxes', pathBoxes: [{ icon: '📨', label: 'Event Hub' }, { icon: '⚙️', label: 'Ingestion Pipeline' }], dcr: 'DCR: Event Hub', protocol: 'Event Hub Streaming' },
    cribl: { color: '#5bc4f1', sourceLabel: 'Cribl Stream', sourceIcon: '🔀', logoUrl: TOPOLOGY_LOGOS.cribl, pathType: 'boxes', pathBoxes: [{ icon: '🔀', label: 'Cribl Stream' }], dcr: 'Custom DCR (Logs Ingestion API)', protocol: 'Logs Ingestion API' }
};

const ZONE_CONFIGS = {
    onprem: { label: '🏢 On-Premises', color: '#f59e0b' },
    azure: { label: '⛅ Azure', color: '#0078d4' },
    saas: { label: '☁️ 3rd Party Cloud / SaaS', color: '#8b5cf6' }
};

const TOPOLOGY_COUNT_FORMATTER = new Intl.NumberFormat('en-US');

function formatTopologyCount(value = 0) {
    return TOPOLOGY_COUNT_FORMATTER.format(Number(value) || 0);
}

function formatReqPerMin(rawNumber = 0) {
    const value = Math.max(0, Number(rawNumber) || 0);

    if (value >= 10000) {
        return `~${Math.round(value / 1000)}k`;
    }

    if (value >= 1000) {
        return `~${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }

    return `~${formatTopologyCount(value)}`;
}

function formatEps(rawEps = 0) {
    const value = Math.max(0, Number(rawEps) || 0);

    if (value >= 10000) {
        return `~${Math.round(value / 1000)}k`;
    }

    if (value >= 1000) {
        return `~${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }

    return `~${formatTopologyCount(value)}`;
}

const WINDOWS_DCR_REQUESTS_PER_SERVER = 3;
const WINDOWS_DCR_MAX_REQUESTS_PER_MIN = 12000;
const WINDOWS_DCR_WARNING_THRESHOLD = 0.8;
const DCR_MAX_SERVERS = 4000;

const LINUX_DCR_REQUESTS_PER_SERVER = 3;
const LINUX_DCR_MAX_REQUESTS_PER_MIN = 12000;
const LINUX_DCR_WARNING_THRESHOLD = 0.8;
const LINUX_DCR_MAX_SERVERS = 4000;
const SYSLOG_DCR_MAX_EPS = 65000;
const SYSLOG_DCR_WARNING_THRESHOLD = 0.8;

const LINUX_SERVER_IDS = new Set(['linux-syslog', 'microsoft-sysmon-for-linux']);
const CRIBL_SOLUTION_ID = 'cribl-stream';
const ROUTE_STANDARD = 'standard';
const ROUTE_CRIBL = 'cribl';
const CRIBL_NODE_ID = 'shared-cribl-node';
const FLOW_BAND_ORDER = {
    windows_events: 0,
    syslog_cef: 1,
    linux_server: 2,
    azure_native: 3,
    event_hub: 4,
    direct: 5,
    api: 6,
    logic_app: 7
};
const COLLAPSE_THRESHOLD = 3;

function getTopologySourceId(type = '', zone = '', route = ROUTE_STANDARD) {
    const routeSuffix = route && route !== ROUTE_STANDARD ? `-${route}` : '';
    return `source-${type}${zone ? `-${zone}` : ''}${routeSuffix}`;
}

function getUniqueSolutionNames(solutions = []) {
    return [...new Set((Array.isArray(solutions) ? solutions : [])
        .map((solution) => String(solution?.name || '').trim())
        .filter(Boolean))];
}

function isCriblRoutedSolution(solution = {}, capacitySnapshot = {}) {
    return Boolean(getSolutionCapacityProfile(solution, capacitySnapshot)?.criblIngestion);
}

function buildWindowsSharedDcrPlan(zoneLayouts = []) {
    const windowsRows = (Array.isArray(zoneLayouts) ? zoneLayouts : [])
        .flatMap(({ rows = [] }) => rows.filter((row) => row.type === 'windows_events'));

    if (!windowsRows.length) {
        return null;
    }

    const assignments = windowsRows.flatMap((row, rowIndex) => {
        const sourceId = row.sourceId || getTopologySourceId(row.type, row.zone, row.route);
        const pools = Array.isArray(row.windowsPools) && row.windowsPools.length > 0
            ? row.windowsPools
            : [{
                id: `fallback-${row.zone}-${rowIndex}`,
                indicator: { count: 0 },
                solutions: row.solutions
            }];

        return pools.map((pool, poolIndex) => ({
            id: pool?.id || `pool-${row.zone}-${rowIndex}-${poolIndex}`,
            sourceId,
            solutions: Array.isArray(pool?.solutions) && pool.solutions.length ? pool.solutions : row.solutions,
            serverCount: Math.max(0, Number(pool?.indicator?.count) || 0)
        }));
    });

    const totalServers = assignments.reduce((sum, assignment) => sum + assignment.serverCount, 0);
    const dcrCount = Math.max(1, Math.ceil(totalServers / DCR_MAX_SERVERS));
    const baseTarget = dcrCount > 0 ? Math.floor(totalServers / dcrCount) : 0;
    const targetRemainder = dcrCount > 0 ? totalServers % dcrCount : 0;
    const dcrBuckets = Array.from({ length: dcrCount }, (_, index) => ({
        id: dcrCount === 1 ? 'dcr-windows-shared' : `dcr-windows-shared-${index + 1}`,
        label: dcrCount === 1 ? 'Windows DCR' : `Windows DCR ${index + 1}`,
        assignedServers: 0,
        targetServers: baseTarget + (index < targetRemainder ? 1 : 0),
        dataSources: new Set(),
        sourceIds: new Set()
    }));

    const attachAssignment = (bucket, assignment, assignedServers = 0) => {
        if (!bucket || !assignment) {
            return;
        }

        bucket.assignedServers += assignedServers;
        bucket.sourceIds.add(assignment.sourceId);
        getUniqueSolutionNames(assignment.solutions).forEach((name) => bucket.dataSources.add(name));
    };

    const getLeastLoadedBucket = () => dcrBuckets.reduce((lowest, bucket) => (
        !lowest || bucket.assignedServers < lowest.assignedServers ? bucket : lowest
    ), null);

    if (totalServers > 0) {
        let currentBucketIndex = 0;
        assignments.forEach((assignment) => {
            if (assignment.serverCount <= 0) {
                attachAssignment(getLeastLoadedBucket(), assignment, 0);
                return;
            }

            let remainingServers = assignment.serverCount;
            while (remainingServers > 0) {
                while (
                    currentBucketIndex < dcrBuckets.length - 1
                    && dcrBuckets[currentBucketIndex].assignedServers >= dcrBuckets[currentBucketIndex].targetServers
                ) {
                    currentBucketIndex += 1;
                }

                const bucket = dcrBuckets[currentBucketIndex];
                const remainingTarget = currentBucketIndex === dcrBuckets.length - 1
                    ? remainingServers
                    : Math.max(1, bucket.targetServers - bucket.assignedServers);
                const assignedServers = Math.min(remainingServers, remainingTarget);

                attachAssignment(bucket, assignment, assignedServers);
                remainingServers -= assignedServers;

                if (
                    currentBucketIndex < dcrBuckets.length - 1
                    && bucket.assignedServers >= bucket.targetServers
                ) {
                    currentBucketIndex += 1;
                }
            }
        });
    } else {
        assignments.forEach((assignment) => attachAssignment(dcrBuckets[0], assignment, 0));
    }

    const sharedDataSources = getUniqueSolutionNames(windowsRows.flatMap((row) => row.solutions));
    const sourceToDcrIds = new Map();

    dcrBuckets.forEach((bucket) => {
        if (!bucket.dataSources.size && sharedDataSources.length > 0) {
            sharedDataSources.forEach((name) => bucket.dataSources.add(name));
        }

        bucket.sourceIds.forEach((sourceId) => {
            if (!sourceToDcrIds.has(sourceId)) {
                sourceToDcrIds.set(sourceId, []);
            }
            sourceToDcrIds.get(sourceId).push(bucket.id);
        });
    });

    if (!sourceToDcrIds.size) {
        const primaryBucket = dcrBuckets[0];
        windowsRows.forEach((row) => {
            const sourceId = row.sourceId || getTopologySourceId(row.type, row.zone, row.route);
            primaryBucket.sourceIds.add(sourceId);
            sourceToDcrIds.set(sourceId, [primaryBucket.id]);
        });
    }

    return {
        totalServers,
        dcrCount,
        collapsed: dcrBuckets.length > COLLAPSE_THRESHOLD,
        sourceToDcrIds,
        dcrs: dcrBuckets.map((bucket) => {
            const requestsPerMinute = bucket.assignedServers * WINDOWS_DCR_REQUESTS_PER_SERVER;
            return {
                id: bucket.id,
                label: bucket.label,
                assignedServers: bucket.assignedServers,
                requestsPerMinute,
                maxRequestsPerMinute: WINDOWS_DCR_MAX_REQUESTS_PER_MIN,
                isNearLimit: requestsPerMinute > (WINDOWS_DCR_MAX_REQUESTS_PER_MIN * WINDOWS_DCR_WARNING_THRESHOLD),
                dataSources: Array.from(bucket.dataSources),
                sourceIds: Array.from(bucket.sourceIds)
            };
        })
    };
}

function buildLinuxSharedDcrPlan(zoneLayouts = [], capacitySnapshot = {}) {
    const linuxRows = (Array.isArray(zoneLayouts) ? zoneLayouts : [])
        .flatMap(({ rows = [] }) => rows.filter((row) => row.type === 'linux_server'));

    if (!linuxRows.length) {
        return null;
    }

    const assignments = linuxRows.map((row, rowIndex) => {
        const sourceId = row.sourceId || getTopologySourceId(row.type, row.zone, row.route);
        const serverCount = (Array.isArray(row.solutions) ? row.solutions : []).reduce((sum, sol) => {
            const profile = getSolutionCapacityProfile(sol, capacitySnapshot);
            return sum + getLinuxZoneServerCount(profile, row.zone);
        }, 0);
        return {
            id: `linux-row-${row.zone}-${rowIndex}`,
            sourceId,
            solutions: row.solutions,
            serverCount
        };
    });

    const totalServers = assignments.reduce((sum, assignment) => sum + assignment.serverCount, 0);
    const dcrCount = Math.max(1, Math.ceil(totalServers / LINUX_DCR_MAX_SERVERS));
    const baseTarget = dcrCount > 0 ? Math.floor(totalServers / dcrCount) : 0;
    const targetRemainder = dcrCount > 0 ? totalServers % dcrCount : 0;
    const dcrBuckets = Array.from({ length: dcrCount }, (_, index) => ({
        id: dcrCount === 1 ? 'dcr-linux-shared' : `dcr-linux-shared-${index + 1}`,
        label: dcrCount === 1 ? 'Linux DCR' : `Linux DCR ${index + 1}`,
        assignedServers: 0,
        targetServers: baseTarget + (index < targetRemainder ? 1 : 0),
        dataSources: new Set(),
        sourceIds: new Set()
    }));

    const attachLinuxAssignment = (bucket, assignment, assignedServers = 0) => {
        if (!bucket || !assignment) {
            return;
        }
        bucket.assignedServers += assignedServers;
        bucket.sourceIds.add(assignment.sourceId);
        getUniqueSolutionNames(assignment.solutions).forEach((name) => bucket.dataSources.add(name));
    };

    const getLeastLoadedLinuxBucket = () => dcrBuckets.reduce((lowest, bucket) => (
        !lowest || bucket.assignedServers < lowest.assignedServers ? bucket : lowest
    ), null);

    if (totalServers > 0) {
        let currentBucketIndex = 0;
        assignments.forEach((assignment) => {
            if (assignment.serverCount <= 0) {
                attachLinuxAssignment(getLeastLoadedLinuxBucket(), assignment, 0);
                return;
            }

            let remainingServers = assignment.serverCount;
            while (remainingServers > 0) {
                while (
                    currentBucketIndex < dcrBuckets.length - 1
                    && dcrBuckets[currentBucketIndex].assignedServers >= dcrBuckets[currentBucketIndex].targetServers
                ) {
                    currentBucketIndex += 1;
                }

                const bucket = dcrBuckets[currentBucketIndex];
                const remainingTarget = currentBucketIndex === dcrBuckets.length - 1
                    ? remainingServers
                    : Math.max(1, bucket.targetServers - bucket.assignedServers);
                const assignedServers = Math.min(remainingServers, remainingTarget);

                attachLinuxAssignment(bucket, assignment, assignedServers);
                remainingServers -= assignedServers;

                if (
                    currentBucketIndex < dcrBuckets.length - 1
                    && bucket.assignedServers >= bucket.targetServers
                ) {
                    currentBucketIndex += 1;
                }
            }
        });
    } else {
        assignments.forEach((assignment) => attachLinuxAssignment(dcrBuckets[0], assignment, 0));
    }

    const sharedDataSources = getUniqueSolutionNames(linuxRows.flatMap((row) => row.solutions));
    const sourceToDcrIds = new Map();

    dcrBuckets.forEach((bucket) => {
        if (!bucket.dataSources.size && sharedDataSources.length > 0) {
            sharedDataSources.forEach((name) => bucket.dataSources.add(name));
        }

        bucket.sourceIds.forEach((sourceId) => {
            if (!sourceToDcrIds.has(sourceId)) {
                sourceToDcrIds.set(sourceId, []);
            }
            sourceToDcrIds.get(sourceId).push(bucket.id);
        });
    });

    if (!sourceToDcrIds.size) {
        const primaryBucket = dcrBuckets[0];
        linuxRows.forEach((row) => {
            const sourceId = row.sourceId || getTopologySourceId(row.type, row.zone, row.route);
            primaryBucket.sourceIds.add(sourceId);
            sourceToDcrIds.set(sourceId, [primaryBucket.id]);
        });
    }

    return {
        totalServers,
        dcrCount,
        collapsed: dcrBuckets.length > COLLAPSE_THRESHOLD,
        sourceToDcrIds,
        dcrs: dcrBuckets.map((bucket) => {
            const requestsPerMinute = bucket.assignedServers * LINUX_DCR_REQUESTS_PER_SERVER;
            return {
                id: bucket.id,
                label: bucket.label,
                assignedServers: bucket.assignedServers,
                requestsPerMinute,
                maxRequestsPerMinute: LINUX_DCR_MAX_REQUESTS_PER_MIN,
                isNearLimit: requestsPerMinute > (LINUX_DCR_MAX_REQUESTS_PER_MIN * LINUX_DCR_WARNING_THRESHOLD),
                dataSources: Array.from(bucket.dataSources),
                sourceIds: Array.from(bucket.sourceIds)
            };
        })
    };
}

function buildSyslogCefCollectorPlan(zoneLayouts = [], capacitySnapshot = {}) {
    const syslogRows = (Array.isArray(zoneLayouts) ? zoneLayouts : [])
        .flatMap(({ rows = [] }) => rows.filter((row) => row.type === 'syslog_cef'));

    if (!syslogRows.length) {
        return null;
    }

    const allSolutions = syslogRows.flatMap((row) => row.solutions);
    const dataSources = getUniqueSolutionNames(allSolutions);
    const totalEps = allSolutions.reduce((sum, sol) => {
        const profile = getSolutionCapacityProfile(sol, capacitySnapshot);
        const eps = profile?.result?.eps;
        return sum + (Number.isFinite(Number(eps)) && eps > 0 ? Number(eps) : DEFAULT_FIREWALL_EPS);
    }, 0);

    const vmCount = Math.max(1, Math.ceil(totalEps / FIREWALL_VM_EPS_CAPACITY));
    const dcrCount = Math.max(1, Math.ceil(totalEps / SYSLOG_DCR_MAX_EPS));
    const perDcrEps = dcrCount > 0 ? Math.round(totalEps / dcrCount) : totalEps;

    const sourceIds = [...new Set(syslogRows.map((row) => row.sourceId || getTopologySourceId(row.type, row.zone, row.route)))];
    const dcrs = Array.from({ length: dcrCount }, (_, index) => ({
        id: dcrCount === 1 ? 'dcr-syslog-cef-shared' : `dcr-syslog-cef-shared-${index + 1}`,
        label: dcrCount === 1 ? 'Syslog/CEF DCR' : `Syslog/CEF DCR ${index + 1}`,
        assignedEps: perDcrEps,
        isNearLimit: perDcrEps > (SYSLOG_DCR_MAX_EPS * SYSLOG_DCR_WARNING_THRESHOLD),
        dataSources,
        sourceIds
    }));
    const sourceToDcrIds = new Map(sourceIds.map((sourceId) => [sourceId, dcrs.map((dcr) => dcr.id)]));

    return {
        totalEps,
        vmCount,
        dcrCount,
        collapsed: dcrs.length > COLLAPSE_THRESHOLD,
        dcrs,
        dataSources,
        sourceToDcrIds
    };
}

function clampPercent(value = DEFAULT_WINDOWS_ONPREM_PERCENT) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return DEFAULT_WINDOWS_ONPREM_PERCENT;
    }
    return Math.max(0, Math.min(100, numeric));
}

function normalizePopulationKind(value = '') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'windows-ama') return 'windows_ama';
    if (normalized === 'wec') return 'wec';
    return normalized;
}

function hexToRgba(hex = '', alpha = 1) {
    const normalized = String(hex || '').trim().replace('#', '');
    if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(normalized)) {
        return `rgba(255, 255, 255, ${alpha})`;
    }

    const expanded = normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized;

    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));

    return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
}

function getWindowsEnvironmentPresence(capacitySnapshot = {}) {
    const selectedSolutions = Array.isArray(capacitySnapshot?.selectedSolutions) ? capacitySnapshot.selectedSolutions : [];
    return selectedSolutions.reduce((state, solution) => {
        if (classifySolution(solution) !== 'windows_events') {
            return state;
        }

        const profile = getSolutionCapacityProfile(solution, capacitySnapshot);
        const populationKind = normalizePopulationKind(
            profile?.populationKind || profile?.result?.populationKind || solution?.server_population_kind
        );

        if (populationKind === 'wec') {
            state.hasWec = true;
            return state;
        }

        const onPremPercent = clampPercent(profile?.result?.onPremPercent ?? DEFAULT_WINDOWS_ONPREM_PERCENT);
        state.hasAma = true;
        if (onPremPercent > 0) {
            state.hasOnPremAma = true;
        }
        if (onPremPercent < 100) {
            state.hasAzureAma = true;
        }
        return state;
    }, {
        hasAma: false,
        hasWec: false,
        hasOnPremAma: false,
        hasAzureAma: false
    });
}

function getLinuxZoneServerCount(profile = {}, zone = '') {
    const totalServers = Number(profile?.result?.servers) || 0;
    const onPremPercent = clampPercent(profile?.result?.onPremPercent ?? DEFAULT_LINUX_ONPREM_PERCENT);
    const azureServers = Math.round(totalServers * (1 - (onPremPercent / 100)));
    const onPremServers = Math.max(0, totalServers - azureServers);

    if (zone === 'azure') {
        return azureServers;
    }

    if (zone === 'onprem') {
        return onPremServers;
    }

    return totalServers;
}

function getLinuxEnvironmentPresence(capacitySnapshot = {}) {
    const selectedSolutions = Array.isArray(capacitySnapshot?.selectedSolutions) ? capacitySnapshot.selectedSolutions : [];
    return selectedSolutions.reduce((state, solution) => {
        if (classifySolution(solution) !== 'linux_server') {
            return state;
        }

        const profile = getSolutionCapacityProfile(solution, capacitySnapshot);
        const onPremServers = getLinuxZoneServerCount(profile, 'onprem');
        const azureServers = getLinuxZoneServerCount(profile, 'azure');

        if (onPremServers > 0) {
            state.hasOnPrem = true;
        }
        if (azureServers > 0) {
            state.hasAzure = true;
        }
        return state;
    }, {
        hasOnPrem: false,
        hasAzure: false
    });
}

function getZonesForType(type, capacitySnapshot = {}) {
    if (type === 'syslog_cef') return [normalizeCollectorVmZone(capacitySnapshot?.collectorVmZone || DEFAULT_COLLECTOR_VM_ZONE)];
    if (type === 'linux_server') {
        const linuxState = getLinuxEnvironmentPresence(capacitySnapshot);
        const zones = [];
        if (linuxState.hasOnPrem) {
            zones.push('onprem');
        }
        if (linuxState.hasAzure) {
            zones.push('azure');
        }
        if (zones.length > 0) {
            return zones;
        }

        const fallbackOnPremPercent = clampPercent(DEFAULT_LINUX_ONPREM_PERCENT);
        return [
            ...(fallbackOnPremPercent > 0 ? ['onprem'] : []),
            ...(fallbackOnPremPercent < 100 ? ['azure'] : [])
        ];
    }
    if (type === 'azure_native' || type === 'event_hub') return ['azure'];
    if (type === 'direct' || type === 'api' || type === 'logic_app') return ['saas'];
    if (type === 'windows_events') {
        const windowsState = getWindowsEnvironmentPresence(capacitySnapshot);
        const zones = [];
        if (windowsState.hasWec || windowsState.hasOnPremAma) {
            zones.push('onprem');
        }
        if (windowsState.hasAzureAma) {
            zones.push('azure');
        }
        if (zones.length > 0) {
            return zones;
        }

        const fallbackOnPremPercent = clampPercent(DEFAULT_WINDOWS_ONPREM_PERCENT);
        return [
            ...(fallbackOnPremPercent > 0 ? ['onprem'] : []),
            ...(fallbackOnPremPercent < 100 ? ['azure'] : [])
        ];
    }
    return ['saas'];
}

function buildServerIndicatorsForGroup(type = '', solutions = [], capacitySnapshot = {}, environment = null) {
    const indicators = [];
    const seenPoolIds = new Set();
    const amaIndicator = {
        key: `pool-windows-ama${environment ? `-${environment}` : ''}`,
        os: 'windows',
        role: 'Windows Servers',
        count: 0,
        isDefault: false,
        sortOrder: 0
    };

    (Array.isArray(solutions) ? solutions : []).forEach((solution) => {
        const profile = getSolutionCapacityProfile(solution, capacitySnapshot);
        if (!profile?.hasSavedSizing || !profile?.result) {
            return;
        }

        if (type === 'windows_events') {
            const populationKind = normalizePopulationKind(profile.populationKind || profile.result?.populationKind);
            const poolId = String(profile.poolId || '').trim();
            if (!poolId || seenPoolIds.has(poolId)) {
                return;
            }
            if (populationKind !== 'windows_ama' && populationKind !== 'wec') {
                return;
            }

            seenPoolIds.add(poolId);
            if (populationKind === 'windows_ama') {
                const totalCount = Number(profile.result.servers) || 0;
                const onPremPercent = clampPercent(profile.result.onPremPercent ?? DEFAULT_WINDOWS_ONPREM_PERCENT);
                const azureCount = Math.round(totalCount * (1 - (onPremPercent / 100)));
                const onPremCount = totalCount - azureCount;
                const scopedCount = environment === 'azure'
                    ? azureCount
                    : environment === 'onprem'
                        ? onPremCount
                        : totalCount;

                if (scopedCount > 0) {
                    amaIndicator.count += scopedCount;
                    amaIndicator.isDefault = amaIndicator.isDefault || Boolean(profile.isDefault);
                }
                return;
            }

            if (environment === 'azure') {
                return;
            }

            const wecCount = Number(profile.result.servers) || 0;
            if (wecCount > 0) {
                indicators.push({
                    key: `pool-${poolId}${environment ? `-${environment}` : ''}`,
                    os: 'windows',
                    role: 'WEC Servers',
                    count: wecCount,
                    isDefault: Boolean(profile.isDefault),
                    sortOrder: 2
                });
            }
            return;
        }

        if (type === 'syslog_cef' && profile.type === 'firewall') {
            const vmCount = Number(profile.result.vmCount) || 0;
            if (vmCount > 0) {
                indicators.push({
                    key: `cef-${solution.id}${environment ? `-${environment}` : ''}`,
                    os: 'linux',
                    role: 'CEF',
                    count: vmCount,
                    isDefault: Boolean(profile.isDefault),
                    sortOrder: 3
                });
            }
        }
    });

    if (type === 'windows_events' && amaIndicator.count > 0) {
        indicators.push(amaIndicator);
    }

    return indicators.sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
}

function buildWindowsSourcePools(solutions = [], capacitySnapshot = {}, zone = 'onprem') {
    const pools = new Map();

    (Array.isArray(solutions) ? solutions : []).forEach((solution, solutionIndex) => {
        const profile = getSolutionCapacityProfile(solution, capacitySnapshot);
        const populationKind = normalizePopulationKind(
            profile?.populationKind || profile?.result?.populationKind || solution?.server_population_kind
        );

        if (populationKind !== 'windows_ama' && populationKind !== 'wec') {
            return;
        }

        if (populationKind === 'wec' && zone === 'azure') {
            return;
        }

        const fallbackPoolId = `${populationKind}-${solution?.id || solutionIndex}`;
        const poolId = String(profile?.poolId || fallbackPoolId).trim();

        if (!pools.has(poolId)) {
            pools.set(poolId, {
                id: poolId,
                populationKind,
                solutions: [],
                sortOrder: populationKind === 'windows_ama' ? 0 : 1,
                firstIndex: solutionIndex
            });
        }

        pools.get(poolId).solutions.push(solution);
    });

    return Array.from(pools.values())
        .sort((left, right) => {
            if (left.sortOrder !== right.sortOrder) {
                return left.sortOrder - right.sortOrder;
            }
            return left.firstIndex - right.firstIndex;
        })
        .map((pool, index) => {
            const indicators = buildServerIndicatorsForGroup('windows_events', pool.solutions, capacitySnapshot, zone);
            const indicator = indicators[0] || {
                key: `pool-${pool.id}-${zone}`,
                os: 'windows',
                role: pool.populationKind === 'wec' ? 'WEC Servers' : 'Windows Servers',
                count: 0,
                isDefault: true
            };

            return {
                id: pool.id,
                label: `Pool ${index + 1}`,
                indicator,
                solutions: pool.solutions
            };
        });
}

function getTopologyInfrastructure(solution = {}) {
    return [
        solution?.onboarding?.infrastructure,
        solution?.onboarding?.infrastructure_required,
        solution?.requiredInfrastructure
    ].flatMap((value) => Array.isArray(value) ? value : [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
}

function classifySolution(solution) {
    const infra = getTopologyInfrastructure(solution);
    const category = solution?.export_metadata?.group || '';
    const is1P = solution?.is1P;
    const tags = (solution?.tags || []).map((tag) => String(tag || '').toLowerCase());
    const populationKind = String(solution?.server_population_kind || '').trim().toLowerCase();

    if (populationKind === 'windows_ama' || populationKind === 'wec') return 'windows_events';
    const solutionId = String(solution?.id || '').trim().toLowerCase();
    if (LINUX_SERVER_IDS.has(solutionId) || populationKind === 'linux') return 'linux_server';
    if (infra.includes('linux-forwarder') || tags.some((tag) => tag.includes('syslog') || tag.includes('cef'))) return 'syslog_cef';
    if (infra.includes('event-hub')) return 'event_hub';
    if (infra.includes('logic-app') || infra.includes('azure-function')) return 'logic_app';
    if (is1P && (category === 'Microsoft' || tags.some((tag) => tag.includes('defender') || tag.includes('m365')))) return 'direct';
    if (is1P && tags.some((tag) => tag.includes('azure'))) return 'azure_native';
    if (infra.includes('vm') || infra.includes('agent') || tags.some((tag) => tag.includes('windows'))) return 'windows_events';
    if (is1P) return 'azure_native';
    return 'api';
}

async function renderTopologyCanvas(containerEl) {
    const module = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
    const html2canvas = module.default;
    return html2canvas(containerEl, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true
    });
}

export async function exportTopologyAsPdf(containerEl) {
    if (!containerEl) return;

    const [{ jsPDF }, canvas] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'),
        renderTopologyCanvas(containerEl)
    ]);
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 20));
    pdf.save('sentinel-ingestion-topology.pdf');
}

export async function exportTopologyAsPng(containerEl) {
    if (!containerEl) return;

    const canvas = await renderTopologyCanvas(containerEl);
    const link = document.createElement('a');
    link.download = 'sentinel-ingestion-topology.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export function renderTopology(selectedSolutions, containerEl) {
    if (!containerEl) return;

    if (!window.React || !window.ReactDOM || !window.ReactFlow) {
        containerEl.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
                <p>Topology dependencies did not load. Refresh the page to try again.</p>
            </div>`;
        return;
    }

    const allSelectedSolutions = Array.isArray(selectedSolutions) ? selectedSolutions : [];
    const hasStandaloneCriblSelection = allSelectedSolutions.some((solution) => String(solution?.id || '').trim().toLowerCase() === CRIBL_SOLUTION_ID);
    const topologySolutions = allSelectedSolutions.filter((solution) => String(solution?.id || '').trim().toLowerCase() !== CRIBL_SOLUTION_ID);
    const groups = {};
    topologySolutions.forEach((sol) => {
        const type = classifySolution(sol);
        if (!groups[type]) groups[type] = [];
        groups[type].push(sol);
    });

    if (Object.keys(groups).length === 0 && hasStandaloneCriblSelection) {
        const criblSolution = allSelectedSolutions.find((solution) => String(solution?.id || '').trim().toLowerCase() === CRIBL_SOLUTION_ID);
        if (criblSolution) {
            // Fix: TOPO-001 — render a standalone Cribl flow when Cribl is the only selected environment item.
            groups.cribl = [criblSolution];
        }
    }

    if (Object.keys(groups).length === 0) {
        containerEl.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                <div style="font-size:3rem;margin-bottom:16px;">🔍</div>
                <p>No solutions selected yet. Go back to select data sources to see your ingestion topology.</p>
            </div>`;
        return;
    }

    const { createElement: h } = React;
    const { ReactFlow: RF, ReactFlowProvider, Controls, Background, Handle, Position } = window.ReactFlow;
    const capacitySnapshot = getConnectorCapacitySnapshot(selectedSolutions);

    const renderServerOsIcon = (os = 'windows', className = 'rf-inline-os-icon') => {
        if (os === 'linux') {
            return h('svg', {
                viewBox: '0 0 16 16',
                className,
                'aria-hidden': 'true',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 1.2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
            },
            h('circle', { cx: 8, cy: 4.3, r: 2.1 }),
            h('circle', { cx: 7.2, cy: 4.1, r: 0.25, fill: 'currentColor', stroke: 'none' }),
            h('circle', { cx: 8.8, cy: 4.1, r: 0.25, fill: 'currentColor', stroke: 'none' }),
            h('path', { d: 'M8 5.5l0.7 0.8H7.3Z', fill: 'currentColor', stroke: 'none' }),
            h('path', { d: 'M5 8.2C3.9 9 3.2 10.4 3.2 12c0 1.9 1.2 3.2 2.8 3.2 0.8 0 1.5-0.3 2-0.9 0.5 0.6 1.2 0.9 2 0.9 1.6 0 2.8-1.3 2.8-3.2 0-1.6-0.7-3-1.8-3.8' }),
            h('path', { d: 'M6.2 14.2l-1 1' }),
            h('path', { d: 'M9.8 14.2l1 1' })
            );
        }

        return h('svg', {
            viewBox: '0 0 16 16',
            className,
            'aria-hidden': 'true',
            fill: 'currentColor'
        },
        h('rect', { x: 1, y: 1.5, width: 5.5, height: 5.25, rx: 0.5 }),
        h('rect', { x: 9, y: 1, width: 6, height: 5.75, rx: 0.5 }),
        h('rect', { x: 1, y: 9, width: 5.5, height: 5.5, rx: 0.5 }),
        h('rect', { x: 9, y: 8.5, width: 6, height: 6.5, rx: 0.5 })
        );
    };

    function RemoteLogo({ src = '', fallback = '', className = '', imgClassName = '', fallbackClassName = '' }) {
        return h('span', { className },
            src
                ? h('img', {
                    src,
                    alt: '',
                    'aria-hidden': 'true',
                    className: imgClassName,
                    onLoad: (event) => {
                        const fallbackEl = event.currentTarget.nextSibling;
                        event.currentTarget.hidden = false;
                        if (fallbackEl) {
                            fallbackEl.hidden = true;
                        }
                    },
                    onError: (event) => {
                        const fallbackEl = event.currentTarget.nextSibling;
                        event.currentTarget.hidden = true;
                        if (fallbackEl) {
                            fallbackEl.hidden = false;
                        }
                    }
                })
                : null,
            h('span', { className: fallbackClassName, hidden: Boolean(src) }, fallback)
        );
    }

    const getServerChipStyle = (color = '', isDefault = false) => ({
        borderColor: hexToRgba(color, isDefault ? 0.18 : 0.28),
        background: hexToRgba(color, isDefault ? 0.08 : 0.12)
    });

    const HANDLE_IDS = {
        sourceTop: 'source-top',
        sourceBottom: 'source-bottom',
        sourceLeft: 'source-left',
        sourceRight: 'source-right',
        targetTop: 'target-top',
        targetBottom: 'target-bottom',
        targetLeft: 'target-left',
        targetRight: 'target-right'
    };
    const MULTI_PORT_HANDLE_CAP = 5;
    const MULTI_PORT_SIDE_INSET_PERCENT = 16;
    const MULTI_PORT_NODE_TYPES = new Set(['dcr', 'sentinel', 'cribl', 'collectorVm']);
    const HANDLE_SIDE_BY_ID = {
        [HANDLE_IDS.sourceTop]: 'top',
        [HANDLE_IDS.sourceBottom]: 'bottom',
        [HANDLE_IDS.targetTop]: 'top',
        [HANDLE_IDS.targetBottom]: 'bottom'
    };

    const getHandleStyle = (color, size = 6, dimmed = false) => ({
        background: color,
        width: size,
        height: size,
        opacity: dimmed ? 0.35 : 1
    });

    const getMultiPortHandleId = (kind = 'source', side = 'top', index = 0) => `${kind}-${side}-${index}`;
    const createPortLayout = (layout = {}) => ({
        source: {
            top: Math.max(1, Number(layout?.source?.top) || 1),
            bottom: Math.max(1, Number(layout?.source?.bottom) || 1)
        },
        target: {
            top: Math.max(1, Number(layout?.target?.top) || 1),
            bottom: Math.max(1, Number(layout?.target?.bottom) || 1)
        }
    });
    const getPortHandleCount = (data = {}, kind = 'source', side = 'top') => Math.max(1, Number(data?.portLayout?.[kind]?.[side]) || 1);
    const setPortHandleCount = (layout = {}, kind = 'source', side = 'top', count = 1) => {
        if (!layout[kind]) {
            layout[kind] = { top: 1, bottom: 1 };
        }
        layout[kind][side] = Math.max(1, Number(count) || 1);
        return layout[kind][side];
    };
    const getDistributedHandleStyle = (color, side = 'top', index = 0, count = 1, size = 6, dimmed = false) => {
        const safeCount = Math.max(1, Number(count) || 1);
        const leftPercent = safeCount === 1
            ? 50
            : MULTI_PORT_SIDE_INSET_PERCENT + (((100 - (MULTI_PORT_SIDE_INSET_PERCENT * 2)) * index) / Math.max(1, safeCount - 1));
        return {
            ...getHandleStyle(color, size, dimmed),
            left: `${leftPercent}%`,
            transform: 'translate(-50%, -50%)'
        };
    };

    const buildEdge = (source, target, color, options = {}) => ({
        id: options.id || `e-${source}--${target}`,
        source,
        target,
        type: options.type || 'step',
        sourceHandle: options.sourceHandle,
        targetHandle: options.targetHandle,
        animated: true,
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color }
    });

    const getSourceHandleForBand = (band = 'top') => (band === 'bottom' ? HANDLE_IDS.sourceTop : HANDLE_IDS.sourceBottom);
  const getFlowSourceHandleForBand = (band = 'top') => (band === 'bottom' ? HANDLE_IDS.sourceTop : HANDLE_IDS.sourceBottom);
  const getFlowTargetHandleForBand = (band = 'top') => (band === 'bottom' ? HANDLE_IDS.targetBottom : HANDLE_IDS.targetTop);

  const buildVerticalFlowEdge = (source, target, color, band = 'top', options = {}) =>
    buildEdge(source, target, color, {
      ...options,
      type: 'step',
      sourceHandle: getFlowSourceHandleForBand(band),
      targetHandle: getFlowTargetHandleForBand(band)
    });

  const buildSourceToMiddleEdge = (source, target, color, band = 'top', options = {}) =>
    buildEdge(source, target, color, {
      ...options,
      type: 'step',
      sourceHandle: getSourceHandleForBand(band),
      targetHandle: getFlowTargetHandleForBand(band)
    });

  const buildMiddleEdge = (source, target, color, band = 'top', options = {}) =>
    buildVerticalFlowEdge(source, target, color, band, {
      ...options,
      type: 'step'
    });

  const buildSourceToCollectorEdge = (source, target, color) =>
    buildEdge(source, target, color, {
      type: 'step',
      sourceHandle: HANDLE_IDS.sourceRight,
      targetHandle: HANDLE_IDS.targetLeft
    });

  const buildCriblToSentinelEdge = (source, target, color, options = {}) =>
    buildEdge(source, target, color, {
      ...options,
      type: 'step',
      sourceHandle: HANDLE_IDS.sourceLeft,
      targetHandle: HANDLE_IDS.targetRight
    });

  const nodes = [];
  const edges = [];
  const groupEntries = Object.entries(groups);
  const zoneOrder = ['onprem', 'azure', 'saas'];
  const zoneRows = { onprem: [], azure: [], saas: [] };
  const sourceStartX = 0;
  const startX = sourceStartX;
  const startY = 30;
  const sourceGapX = 60;
  const sourceNodeWidth = 320;
  const wideSourceNodeWidth = 700;
  const sourceNodeHeight = 220;
  const collectorVmWidth = 220;
  const pathNodeWidth = 220;
  const serverNodeWidth = 220;
  const dcrNodeWidth = 240;
  const zoneHorizontalGap = 120;
  const zoneTopPadding = 36;
  const zoneBottomPadding = 36;
  const collectorVmOffsetX = 56;
  const collectorVmOffsetY = 48;
  const collectorPlacementZone = normalizeCollectorVmZone(capacitySnapshot?.collectorVmZone || DEFAULT_COLLECTOR_VM_ZONE);
  const intermediaryNodeHeight = 120;
  const sentinelNodeWidth = 220;
  const sentinelNodeHeight = 132;
  const criblSentinelGapX = 88;
  const topIntermediaryOffsetY = 72;
  const intermediaryLayerGapY = 152;
  const topSentinelGapY = 96;
  const bottomSentinelGapY = 96;
  const bottomSourceGapY = 88;
  const dcrSpreadGapX = dcrNodeWidth + 36;
  const zoneInnerPaddingX = 24;
  const zoneInternalRowGap = 32;
  const windowsCollapsedId = 'dcr-windows-collapsed';
  const linuxCollapsedId = 'dcr-linux-collapsed';
  const syslogCollapsedId = 'dcr-syslog_cef-collapsed';
  const criblWindowsCollapsedId = 'dcr-cribl-windows-collapsed';
  const criblLinuxCollapsedId = 'dcr-cribl-linux-collapsed';
  const criblSyslogCollapsedId = 'dcr-cribl-syslog-collapsed';
  const windowsPoolLayout = {
      nodeChrome: 56,
      poolGap: 10,
      sectionBase: 104,
      solutionBox: 33,
      solutionGap: 6,
      arcAgentExtra: 28,
      bottomSlack: 18
  };

  const usesWindowsPoolGrid = (pools = []) => Array.isArray(pools) && pools.length > 2;

  const estimateWindowsPoolHeight = (pool = {}, zone = 'onprem') => {
      const solutionCount = Array.isArray(pool?.solutions) ? pool.solutions.length : 0;
      const role = String(pool?.indicator?.role || '').trim().toLowerCase();
      const showsArcAgent = zone === 'onprem' && role !== 'wec servers';

      return windowsPoolLayout.sectionBase
          + (showsArcAgent ? windowsPoolLayout.arcAgentExtra : 0)
          + (solutionCount * windowsPoolLayout.solutionBox)
          + (Math.max(0, solutionCount - 1) * windowsPoolLayout.solutionGap);
  };

  const estimateWindowsPoolStackHeight = (entry = {}) => {
      const pools = Array.isArray(entry.windowsPools) ? entry.windowsPools : [];

      if (!pools.length) {
          return 0;
      }

      if (usesWindowsPoolGrid(pools)) {
          const rowHeights = [];
          for (let index = 0; index < pools.length; index += 2) {
              rowHeights.push(Math.max(
                  estimateWindowsPoolHeight(pools[index], entry.zone),
                  estimateWindowsPoolHeight(pools[index + 1], entry.zone)
              ));
          }
          return rowHeights.reduce((sum, height, index) => (
              sum + height + (index > 0 ? windowsPoolLayout.poolGap : 0)
          ), 0);
      }

      return pools.reduce((sum, pool, index) => (
          sum
          + estimateWindowsPoolHeight(pool, entry.zone)
          + (index > 0 ? windowsPoolLayout.poolGap : 0)
      ), 0);
  };

  const estimateSourceNodeWidth = (entry = {}) => {
      if (entry.type === 'windows_events' && usesWindowsPoolGrid(entry.windowsPools)) {
          return wideSourceNodeWidth;
      }
      return sourceNodeWidth;
  };

  const shouldPlaceCollectorInZone = (entry = {}) => entry.type === 'syslog_cef'
      && (entry.route || ROUTE_STANDARD) !== ROUTE_CRIBL
      && entry.zone === collectorPlacementZone;
  const splitSolutionsByRoute = (type, solutions = []) => {
      const allSolutions = Array.isArray(solutions) ? solutions : [];
      if (!['windows_events', 'linux_server', 'syslog_cef'].includes(type)) {
          return [{ route: ROUTE_STANDARD, solutions: allSolutions, zones: getZonesForType(type, capacitySnapshot) }];
      }

      const criblSolutions = allSolutions.filter((solution) => isCriblRoutedSolution(solution, capacitySnapshot));
      const standardSolutions = allSolutions.filter((solution) => !isCriblRoutedSolution(solution, capacitySnapshot));
      const routeEntries = [];

      if (standardSolutions.length > 0) {
          routeEntries.push({
              route: ROUTE_STANDARD,
              solutions: standardSolutions,
              zones: getZonesForType(type, capacitySnapshot)
          });
      }
      if (criblSolutions.length > 0) {
          routeEntries.push({
              route: ROUTE_CRIBL,
              solutions: criblSolutions,
              zones: type === 'syslog_cef' ? ['onprem'] : getZonesForType(type, capacitySnapshot)
          });
      }

      return routeEntries;
  };

  groupEntries.forEach(([type, solutions]) => {
      splitSolutionsByRoute(type, solutions).forEach((routeEntry) => {
          (routeEntry.zones || []).forEach((zone) => {
              const windowsPools = type === 'windows_events'
                  ? buildWindowsSourcePools(routeEntry.solutions, capacitySnapshot, zone)
                  : null;
              zoneRows[zone].push({
                  type,
                  route: routeEntry.route,
                  solutions: routeEntry.solutions,
                  zone,
                  windowsPools,
                  sourceId: getTopologySourceId(type, zone, routeEntry.route)
              });
          });
      });
  });

  Object.values(zoneRows).forEach((rows) => {
      rows.sort((a, b) => {
          const typeOrder = (FLOW_BAND_ORDER[a.type] ?? 99) - (FLOW_BAND_ORDER[b.type] ?? 99);
          if (typeOrder !== 0) {
              return typeOrder;
          }
          return (a.route === ROUTE_CRIBL ? 1 : 0) - (b.route === ROUTE_CRIBL ? 1 : 0);
      });
  });

  function estimateRowHeight(entry) {
      if (entry.type === 'windows_events' && Array.isArray(entry.windowsPools) && entry.windowsPools.length > 0) {
          const estimatedNodeHeight = windowsPoolLayout.nodeChrome + estimateWindowsPoolStackHeight(entry);
          return Math.max(sourceNodeHeight, estimatedNodeHeight + windowsPoolLayout.bottomSlack);
      }
      return sourceNodeHeight;
  }

  const shouldUseSentinelAlignedRowSlot = (entry = {}) => entry.type === 'azure_native' || entry.type === 'direct';

  function buildBandLayouts(zones = [], band = 'top', bandStartY = startY, preferredSentinelCenterX = null) {
      let currentX = sourceStartX;
      const layouts = [];
      let bandBottomY = bandStartY + zoneTopPadding + sourceNodeHeight + zoneBottomPadding;
      let bandRightX = sourceStartX;

      zones.forEach((zone) => {
          const rows = zoneRows[zone];
          if (!rows.length) {
              return;
          }

          const zoneStartY = bandStartY;
          const sourceY = zoneStartY + zoneTopPadding;
          const primaryRows = rows.filter((entry) => !shouldUseSentinelAlignedRowSlot(entry));
          const sentinelAlignedRows = rows.filter((entry) => shouldUseSentinelAlignedRowSlot(entry));
          const positionedRows = [];
          let rowCursorX = zoneInnerPaddingX;
          let nextStackedRowY = sourceY;

          const positionEntry = (entry, x, y) => {
              const width = estimateSourceNodeWidth(entry);
              const rowHeight = estimateRowHeight(entry);
              const collectorVm = shouldPlaceCollectorInZone(entry)
                  ? {
                      x: x + width + collectorVmOffsetX,
                      y: y + collectorVmOffsetY
                  }
                  : null;
              const occupiedWidth = width + (collectorVm ? collectorVmOffsetX + collectorVmWidth : 0);
              const positionedRow = {
                  ...entry,
                  band,
                  x,
                  y,
                  rowHeight,
                  width,
                  occupiedWidth,
                  collectorVm,
                  sourceId: entry.sourceId || getTopologySourceId(entry.type, entry.zone, entry.route)
              };
              positionedRows.push(positionedRow);
              return positionedRow;
          };

          primaryRows.forEach((entry) => {
              const positionedRow = positionEntry(entry, currentX + rowCursorX, sourceY);
              rowCursorX += positionedRow.occupiedWidth + sourceGapX;
              nextStackedRowY = Math.max(nextStackedRowY, positionedRow.y + positionedRow.rowHeight);
          });

          sentinelAlignedRows.forEach((entry, index) => {
              const width = estimateSourceNodeWidth(entry);
              const desiredX = Number.isFinite(preferredSentinelCenterX)
                  ? preferredSentinelCenterX - (width / 2)
                  : currentX + zoneInnerPaddingX;
              const x = Math.max(currentX + zoneInnerPaddingX, desiredX);
              const y = primaryRows.length === 0 && index === 0
                  ? sourceY
                  : nextStackedRowY + zoneInternalRowGap;
              const positionedRow = positionEntry(entry, x, y);
              nextStackedRowY = positionedRow.y + positionedRow.rowHeight;
          });

          const maxOccupiedRight = positionedRows.length
              ? Math.max(...positionedRows.map((row) => (row.x - currentX) + row.occupiedWidth))
              : sourceNodeWidth + zoneInnerPaddingX;
          const maxRowBottom = positionedRows.length
              ? Math.max(...positionedRows.map((row) => row.y + row.rowHeight))
              : sourceY + sourceNodeHeight;
          const zoneWidth = Math.max(
              sourceNodeWidth + (zoneInnerPaddingX * 2),
              maxOccupiedRight + zoneInnerPaddingX
          );
          const zoneEndY = maxRowBottom + zoneBottomPadding;

          layouts.push({
              zone,
              band,
              x: currentX,
              y: zoneStartY,
              zoneStartX: currentX,
              zoneEndX: currentX + zoneWidth,
              zoneStartY,
              zoneEndY,
              width: zoneWidth,
              rows: positionedRows
          });

          bandBottomY = Math.max(bandBottomY, zoneEndY);
          bandRightX = Math.max(bandRightX, currentX + zoneWidth);
          currentX += zoneWidth + zoneHorizontalGap;
      });

      return { zoneLayouts: layouts, bandBottomY, bandRightX };
  }

  const hasOnPremSources = zoneRows.onprem.length > 0;
  const topBandZones = hasOnPremSources
      ? ['onprem']
      : zoneOrder.filter((zone) => zoneRows[zone].length);
  const bottomBandZones = hasOnPremSources
      ? zoneOrder.filter((zone) => zone !== 'onprem' && zoneRows[zone].length)
      : [];

  const cloneZoneLayoutsForRoute = (layouts = [], route = ROUTE_STANDARD) => (Array.isArray(layouts) ? layouts : [])
      .map((layout) => ({
          ...layout,
          rows: (layout.rows || []).filter((row) => (row.route || ROUTE_STANDARD) === route)
      }))
      .filter((layout) => layout.rows.length > 0);
  const renameSharedPlan = (plan, { idPrefix = 'dcr-shared', labelBase = 'Shared DCR' } = {}) => {
      if (!plan?.dcrs?.length) {
          return null;
      }

      const idMap = new Map();
      const renamedDcrs = plan.dcrs.map((dcr, index) => {
          const nextId = plan.dcrs.length === 1 ? idPrefix : `${idPrefix}-${index + 1}`;
          idMap.set(dcr.id, nextId);
          return {
              ...dcr,
              id: nextId,
              label: plan.dcrs.length === 1 ? labelBase : `${labelBase} ${index + 1}`
          };
      });
      const sourceToDcrIds = new Map();
      (plan.sourceToDcrIds instanceof Map ? plan.sourceToDcrIds : new Map()).forEach((ids, sourceId) => {
          sourceToDcrIds.set(sourceId, (ids || []).map((id) => idMap.get(id) || id));
      });

      return {
          ...plan,
          sourceToDcrIds,
          dcrs: renamedDcrs
      };
  };

  const buildSharedPlans = (layouts) => {
      const standardLayouts = cloneZoneLayoutsForRoute(layouts, ROUTE_STANDARD);
      const criblLayouts = cloneZoneLayoutsForRoute(layouts, ROUTE_CRIBL);
      return {
          windowsSharedDcrPlan: buildWindowsSharedDcrPlan(standardLayouts),
          linuxSharedDcrPlan: buildLinuxSharedDcrPlan(standardLayouts, capacitySnapshot),
          syslogCefCollectorPlan: buildSyslogCefCollectorPlan(standardLayouts, capacitySnapshot),
          criblWindowsDcrPlan: renameSharedPlan(buildWindowsSharedDcrPlan(criblLayouts), {
              idPrefix: 'dcr-cribl-windows-shared',
              labelBase: PATH_CONFIGS.cribl.dcr
          }),
          criblLinuxDcrPlan: renameSharedPlan(buildLinuxSharedDcrPlan(criblLayouts, capacitySnapshot), {
              idPrefix: 'dcr-cribl-linux-shared',
              labelBase: PATH_CONFIGS.cribl.dcr
          }),
          criblSyslogDcrPlan: renameSharedPlan(buildSyslogCefCollectorPlan(criblLayouts, capacitySnapshot), {
              idPrefix: 'dcr-cribl-syslog-shared',
              labelBase: PATH_CONFIGS.cribl.dcr
          })
      };
  };

  let topBandLayout;
  let bottomBandLayout;
  let zoneLayouts;
  let windowsSharedDcrPlan;
  let linuxSharedDcrPlan;
  let syslogCefCollectorPlan;
  let criblWindowsDcrPlan;
  let criblLinuxDcrPlan;
  let criblSyslogDcrPlan;

  const getLayoutCenterX = ({ topBandLayout: top = {}, bottomBandLayout: bottom = {}, zoneLayouts: layouts = [] } = {}) => {
      const leftX = Array.isArray(layouts) && layouts.length
          ? Math.min(...layouts.map((layout) => layout.zoneStartX))
          : sourceStartX;
      const rightX = Math.max(top?.bandRightX || sourceStartX, bottom?.bandRightX || sourceStartX);
      return (leftX + rightX) / 2;
  };

  const buildAllBandLayouts = (bottomBandStartY = startY, preferredSentinelCenterX = null) => {
      const top = buildBandLayouts(topBandZones, 'top', startY, preferredSentinelCenterX);
      const bottom = bottomBandZones.length
          ? buildBandLayouts(bottomBandZones, 'bottom', bottomBandStartY, preferredSentinelCenterX)
          : {
              zoneLayouts: [],
              bandRightX: top.bandRightX,
              bandBottomY: top.bandBottomY
          };
      return {
          topBandLayout: top,
          bottomBandLayout: bottom,
          zoneLayouts: [...top.zoneLayouts, ...bottom.zoneLayouts]
      };
  };

  ({ topBandLayout, bottomBandLayout, zoneLayouts } = buildAllBandLayouts(startY + 900));
  ({ windowsSharedDcrPlan, linuxSharedDcrPlan, syslogCefCollectorPlan, criblWindowsDcrPlan, criblLinuxDcrPlan, criblSyslogDcrPlan } = buildSharedPlans(zoneLayouts));

  const getSharedPlanForRow = (row = {}) => {
      const route = row.route || ROUTE_STANDARD;
      if (row.type === 'windows_events') {
          return route === ROUTE_CRIBL ? criblWindowsDcrPlan : windowsSharedDcrPlan;
      }
      if (row.type === 'linux_server') {
          return route === ROUTE_CRIBL ? criblLinuxDcrPlan : linuxSharedDcrPlan;
      }
      if (row.type === 'syslog_cef') {
          return route === ROUTE_CRIBL ? criblSyslogDcrPlan : syslogCefCollectorPlan;
      }
      return null;
  };

  const getPlanTargetIds = (plan, sourceId) => {
      if (!plan?.sourceToDcrIds) {
          return [];
      }
      if (plan.sourceToDcrIds instanceof Map) {
          return plan.sourceToDcrIds.get(sourceId) || [];
      }
      return plan.sourceToDcrIds[sourceId] || [];
  };

  const usesSharedDcr = (type) => type === 'windows_events' || type === 'linux_server' || type === 'syslog_cef';

  const getPreDcrCountForRow = (row) => {
      const pc = PATH_CONFIGS[row.type] || PATH_CONFIGS.api;
      if (usesSharedDcr(row.type)) {
          return row.route === ROUTE_CRIBL ? 1 : 0;
      }
      if (pc.pathType === 'server') {
          return 1;
      }
      return Array.isArray(pc.pathBoxes) ? pc.pathBoxes.length : 0;
  };

  const rowHasDcr = (row) => {
      if (usesSharedDcr(row.type)) {
          if ((row.route || ROUTE_STANDARD) === ROUTE_CRIBL) {
              return false;
          }
          return (getSharedPlanForRow(row)?.dcrs?.length || 0) > 0;
      }
      return Boolean((PATH_CONFIGS[row.type] || PATH_CONFIGS.api).dcr);
  };

  const getIntermediaryCountForRow = (row) => {
      const preDcrCount = getPreDcrCountForRow(row);
      return rowHasDcr(row) ? preDcrCount + 1 : preDcrCount;
  };

  const getBandMetrics = (rows = []) => rows.reduce((metrics, row) => {
      const preDcrCount = getPreDcrCountForRow(row);
      if (rowHasDcr(row)) {
          metrics.hasDcr = true;
          metrics.maxPreDcrCount = Math.max(metrics.maxPreDcrCount, preDcrCount);
      } else {
          metrics.maxDirectCount = Math.max(metrics.maxDirectCount, getIntermediaryCountForRow(row));
      }
      return metrics;
  }, {
      hasDcr: false,
      maxPreDcrCount: 0,
      maxDirectCount: 0
  });

  const provisionalTopRows = topBandLayout.zoneLayouts.flatMap((layout) => layout.rows);
  const provisionalBottomRows = bottomBandLayout.zoneLayouts.flatMap((layout) => layout.rows);
  const provisionalTopMetrics = getBandMetrics(provisionalTopRows);
  const provisionalBottomMetrics = getBandMetrics(provisionalBottomRows);
  const provisionalTopDcrLayerIndex = provisionalTopMetrics.hasDcr ? provisionalTopMetrics.maxPreDcrCount + 1 : 0;
  const provisionalTopLayersToSentinel = Math.max(provisionalTopDcrLayerIndex, provisionalTopMetrics.maxDirectCount);
  const provisionalTopChainBottomY = provisionalTopLayersToSentinel > 0
      ? topBandLayout.bandBottomY + topIntermediaryOffsetY + ((provisionalTopLayersToSentinel - 1) * intermediaryLayerGapY) + intermediaryNodeHeight
      : topBandLayout.bandBottomY;
  const sentinelY = provisionalTopChainBottomY + topSentinelGapY;
  const provisionalBottomLayersToSource = Math.max(
      provisionalBottomMetrics.hasDcr ? provisionalBottomMetrics.maxPreDcrCount + 1 : 0,
      provisionalBottomMetrics.maxDirectCount
  );
  const provisionalBottomSourceY = provisionalBottomLayersToSource > 0
      ? sentinelY + sentinelNodeHeight + bottomSentinelGapY + ((provisionalBottomLayersToSource - 1) * intermediaryLayerGapY) + intermediaryNodeHeight + bottomSourceGapY
      : sentinelY + sentinelNodeHeight + bottomSentinelGapY + bottomSourceGapY;
  const finalBottomBandStartY = provisionalBottomSourceY - zoneTopPadding;
  const provisionalSentinelCenterX = getLayoutCenterX({ topBandLayout, bottomBandLayout, zoneLayouts });

  ({ topBandLayout, bottomBandLayout, zoneLayouts } = buildAllBandLayouts(finalBottomBandStartY, provisionalSentinelCenterX));
  ({ windowsSharedDcrPlan, linuxSharedDcrPlan, syslogCefCollectorPlan, criblWindowsDcrPlan, criblLinuxDcrPlan, criblSyslogDcrPlan } = buildSharedPlans(zoneLayouts));

  const alignedSentinelCenterX = getLayoutCenterX({ topBandLayout, bottomBandLayout, zoneLayouts });
  if (Math.abs(alignedSentinelCenterX - provisionalSentinelCenterX) > 1) {
      ({ topBandLayout, bottomBandLayout, zoneLayouts } = buildAllBandLayouts(finalBottomBandStartY, alignedSentinelCenterX));
      ({ windowsSharedDcrPlan, linuxSharedDcrPlan, syslogCefCollectorPlan, criblWindowsDcrPlan, criblLinuxDcrPlan, criblSyslogDcrPlan } = buildSharedPlans(zoneLayouts));
  }

  const topRows = topBandLayout.zoneLayouts.flatMap((layout) => layout.rows);
  const bottomRows = bottomBandLayout.zoneLayouts.flatMap((layout) => layout.rows);
  const allRows = [...topRows, ...bottomRows];
  const rowBySourceId = new Map(allRows.map((row) => [row.sourceId, row]));

  const topMetrics = getBandMetrics(topRows);
  const bottomMetrics = getBandMetrics(bottomRows);
  const topDcrLayerIndex = topMetrics.hasDcr ? topMetrics.maxPreDcrCount + 1 : 0;
  const bottomDcrLayerIndex = bottomMetrics.hasDcr ? 1 : 0;
  const getTopLayerY = (layerIndex) => topBandLayout.bandBottomY + topIntermediaryOffsetY + ((layerIndex - 1) * intermediaryLayerGapY);
  const getBottomLayerY = (layerIndex) => sentinelY + sentinelNodeHeight + bottomSentinelGapY + ((layerIndex - 1) * intermediaryLayerGapY);
  const criblRoutedRows = allRows.filter((row) => usesSharedDcr(row.type) && (row.route || ROUTE_STANDARD) === ROUTE_CRIBL);
  const criblSourceIds = [...new Set(criblRoutedRows.map((row) => row.sourceId).filter(Boolean))];
  const criblIngress = {
      top: criblRoutedRows.some((row) => row.band === 'top'),
      bottom: criblRoutedRows.some((row) => row.band === 'bottom')
  };
  const layoutSentinelCenterX = getLayoutCenterX({ topBandLayout, bottomBandLayout, zoneLayouts });
  const sentinelX = layoutSentinelCenterX - (sentinelNodeWidth / 2);
  const sentinelCenterX = sentinelX + (sentinelNodeWidth / 2);
  const criblX = sentinelX + sentinelNodeWidth + criblSentinelGapX;

  const diagramLeftX = zoneLayouts.length
      ? Math.min(...zoneLayouts.map((layout) => layout.zoneStartX))
      : sourceStartX;
  const diagramRightX = Math.max(
      topBandLayout.bandRightX,
      bottomBandLayout.bandRightX,
      criblSourceIds.length ? criblX + pathNodeWidth : sourceStartX
  );
  const clampNodeX = (x, width) => Math.max(diagramLeftX, Math.min(diagramRightX - width, x));
  const getRowCenterX = (row) => row.x + (row.width / 2);
  const getAlignedNodeX = (row, width) => clampNodeX(getRowCenterX(row) - (width / 2), width);
  const getIntermediaryPosition = (row, width, layerIndex) => ({
      x: getAlignedNodeX(row, width),
      y: row.band === 'bottom' ? getBottomLayerY(layerIndex) : getTopLayerY(layerIndex)
  });
  const average = (values = []) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  const dedupe = (values = []) => [...new Set((values || []).filter(Boolean))];

  const resolveSharedDcrAnchor = (sourceIds = []) => {
      const uniqueSourceIds = dedupe(sourceIds);
      const rows = uniqueSourceIds
          .map((sourceId) => rowBySourceId.get(sourceId))
          .filter(Boolean);
      const groupedRows = {
          top: rows.filter((row) => row.band === 'top'),
          bottom: rows.filter((row) => row.band === 'bottom')
      };
      const band = groupedRows.bottom.length > groupedRows.top.length
          ? 'bottom'
          : (groupedRows.top.length ? 'top' : (groupedRows.bottom.length ? 'bottom' : 'top'));
      const bandRows = groupedRows[band].length ? groupedRows[band] : rows;
      const centerX = bandRows.length
          ? average(bandRows.map((row) => getRowCenterX(row)))
          : ((diagramLeftX + diagramRightX) / 2);
      const sourceKey = bandRows.length
          ? bandRows.map((row) => row.sourceId).sort().join('|')
          : uniqueSourceIds.sort().join('|');
      return {
          band,
          centerX,
          sourceKey: sourceKey || 'shared'
      };
  };

  const sharedDcrEntries = [];
  const addSharedDcrEntries = (plan, options) => {
      if (!plan?.dcrs?.length) {
          return;
      }

      const sourceIds = dedupe(plan.dcrs.flatMap((dcr) => dcr.sourceIds || []));
      const dataSources = dedupe(plan.dcrs.flatMap((dcr) => dcr.dataSources || []));

      if (plan.collapsed) {
          const totalRequestsPerMinute = plan.dcrs.reduce((sum, dcr) => sum + (Number(dcr.requestsPerMinute) || 0), 0);
          const totalAssignedEps = plan.dcrs.reduce((sum, dcr) => sum + (Number(dcr.assignedEps) || 0), 0);
          const capacityLabel = options.metricMode === 'eps'
              ? `${formatEps(totalAssignedEps)} EPS [max: ~${formatTopologyCount(SYSLOG_DCR_MAX_EPS * plan.dcrs.length)} EPS]`
              : `${formatReqPerMin(totalRequestsPerMinute)} req/min [max: ${formatTopologyCount(options.maxRequestsPerMinute * plan.dcrs.length)}/min]`;

          sharedDcrEntries.push({
              id: options.collapsedId,
              label: `${options.baseLabel} x${plan.dcrs.length}`,
              color: options.color,
              sourceIds,
              data: {
                  label: `${options.baseLabel} x${plan.dcrs.length}`,
                  count: plan.dcrs.length,
                  dataSources,
                  isNearLimit: plan.dcrs.some((dcr) => dcr.isNearLimit),
                  capacityLabel
              }
          });
          return;
      }

      plan.dcrs.forEach((dcr) => {
          const metricData = options.metricMode === 'eps'
              ? { assignedEps: dcr.assignedEps }
              : {
                  requestsPerMinute: dcr.requestsPerMinute,
                  maxRequestsPerMinute: dcr.maxRequestsPerMinute || options.maxRequestsPerMinute
              };

          sharedDcrEntries.push({
              id: dcr.id,
              label: dcr.label,
              color: options.color,
              sourceIds: dcr.sourceIds || [],
              data: {
                  label: dcr.label,
                  dataSources: Array.isArray(dcr.dataSources) ? dcr.dataSources : dataSources,
                  isNearLimit: Boolean(dcr.isNearLimit),
                  ...metricData
              }
          });
      });
  };

  addSharedDcrEntries(windowsSharedDcrPlan, {
      baseLabel: 'Windows DCR',
      color: PATH_CONFIGS.windows_events.color,
      collapsedId: windowsCollapsedId,
      metricMode: 'requests',
      maxRequestsPerMinute: WINDOWS_DCR_MAX_REQUESTS_PER_MIN
  });
  addSharedDcrEntries(linuxSharedDcrPlan, {
      baseLabel: 'Linux DCR',
      color: PATH_CONFIGS.linux_server.color,
      collapsedId: linuxCollapsedId,
      metricMode: 'requests',
      maxRequestsPerMinute: LINUX_DCR_MAX_REQUESTS_PER_MIN
  });
  addSharedDcrEntries(syslogCefCollectorPlan, {
      baseLabel: 'Syslog / CEF DCR',
      color: PATH_CONFIGS.syslog_cef.color,
      collapsedId: syslogCollapsedId,
      metricMode: 'eps'
  });

  const sharedDcrPositionMap = new Map();
  const getSharedDcrConnectionCenterX = (entry = {}, fallbackX = (diagramLeftX + diagramRightX) / 2) => {
      const connectedRows = dedupe(entry.sourceIds || [])
          .map((sourceId) => rowBySourceId.get(sourceId))
          .filter(Boolean);
      return connectedRows.length
          ? average(connectedRows.map((row) => getRowCenterX(row)))
          : fallbackX;
  };

  const sharedDcrGroups = new Map();
  sharedDcrEntries.forEach((entry) => {
      const anchor = resolveSharedDcrAnchor(entry.sourceIds);
      const groupKey = `${anchor.band}:${anchor.sourceKey}`;
      if (!sharedDcrGroups.has(groupKey)) {
          sharedDcrGroups.set(groupKey, { anchor, entries: [] });
      }
      sharedDcrGroups.get(groupKey).entries.push(entry);
  });
  sharedDcrGroups.forEach(({ anchor, entries }) => {
      const rowY = anchor.band === 'bottom'
          ? getBottomLayerY(bottomDcrLayerIndex || 1)
          : getTopLayerY(topDcrLayerIndex || 1);
      const sortedEntries = entries.slice().sort((left, right) => {
          const centerDelta = getSharedDcrConnectionCenterX(left, anchor.centerX) - getSharedDcrConnectionCenterX(right, anchor.centerX);
          if (Math.abs(centerDelta) > 1) {
              return centerDelta;
          }
          return left.label.localeCompare(right.label);
      });
      const centerOffset = ((sortedEntries.length - 1) * dcrSpreadGapX) / 2;
      sortedEntries.forEach((entry, index) => {
          const rawX = anchor.centerX - (dcrNodeWidth / 2) + (index * dcrSpreadGapX) - centerOffset;
          sharedDcrPositionMap.set(entry.id, {
              x: clampNodeX(rawX, dcrNodeWidth),
              y: rowY,
              band: anchor.band
          });
      });
  });

  if (criblSourceIds.length > 0) {
      nodes.push({
          id: CRIBL_NODE_ID,
          type: 'cribl',
          position: {
              x: clampNodeX(criblX, pathNodeWidth),
              y: sentinelY
          },
          data: {
              color: PATH_CONFIGS.cribl.color,
              icon: PATH_CONFIGS.cribl.sourceIcon,
              logoUrl: PATH_CONFIGS.cribl.logoUrl,
              label: 'Cribl Stream',
              acceptsTop: criblIngress.top,
              acceptsBottom: criblIngress.bottom
          },
          style: {
              width: pathNodeWidth,
              height: sentinelNodeHeight
          }
      });

      edges.push(buildCriblToSentinelEdge(CRIBL_NODE_ID, 'sentinel', PATH_CONFIGS.cribl.color, {
          id: `e-${CRIBL_NODE_ID}--sentinel`
      }));
  }

  zoneLayouts.forEach((layout) => {
      const zoneConfig = ZONE_CONFIGS[layout.zone] || ZONE_CONFIGS.saas;
      nodes.push({
          id: `uberbox-${layout.zone}`,
          type: 'uberBox',
          position: { x: layout.zoneStartX, y: layout.zoneStartY - 15 },
          data: {
              zone: layout.zone,
              label: zoneConfig.label,
              color: zoneConfig.color
          },
          style: {
              width: layout.zoneEndX - layout.zoneStartX,
              height: (layout.zoneEndY - layout.zoneStartY) + 25,
              zIndex: -1,
              pointerEvents: 'none'
          },
          draggable: false,
          selectable: false
      });
  });

  nodes.push({
      id: 'sentinel',
      type: 'sentinel',
      position: { x: sentinelX, y: sentinelY },
      data: {
          workspace: 'Log Analytics Workspace',
          hasSidecarTarget: criblSourceIds.length > 0
      },
      style: { width: sentinelNodeWidth },
      draggable: true
  });

  sharedDcrEntries.forEach((entry) => {
      const position = sharedDcrPositionMap.get(entry.id);
      if (!position) {
          return;
      }
      nodes.push({
          id: entry.id,
          type: 'dcr',
          position: { x: position.x, y: position.y },
          data: {
              ...entry.data,
              color: entry.color,
              band: position.band
          },
          style: { width: dcrNodeWidth },
          draggable: true
      });
      edges.push(buildMiddleEdge(entry.id, 'sentinel', entry.color, position.band));
  });

  const renderedCollectorVmIds = new Set();
  const renderedCollectorTargetEdgeIds = new Set();

  zoneLayouts.forEach((layout) => {
      layout.rows.forEach((entry) => {
          const pc = PATH_CONFIGS[entry.type] || PATH_CONFIGS.api;
          const sourceId = entry.sourceId;
          const sourceBand = entry.band;
          const sourceWidth = entry.width;
          const sourceNode = {
              id: sourceId,
              type: 'source',
              data: {
                  solutions: entry.solutions,
                  pc,
                  type: entry.type,
                  zone: entry.zone,
                  band: sourceBand,
                  windowsPools: entry.windowsPools,
                  color: pc.color,
                  useRightHandle: Boolean(entry.collectorVm),
                  usePoolGrid: entry.type === 'windows_events' && usesWindowsPoolGrid(entry.windowsPools)
              },
              position: { x: entry.x, y: entry.y },
              style: { width: sourceWidth }
          };
          nodes.push(sourceNode);
          const sourceToSentinelEdge = (options = {}) => buildSourceToMiddleEdge(sourceId, 'sentinel', pc.color, sourceBand, options);

          if (usesSharedDcr(entry.type) && entry.route === ROUTE_CRIBL) {
              edges.push(buildSourceToMiddleEdge(sourceId, CRIBL_NODE_ID, PATH_CONFIGS.cribl.color, sourceBand));
              return;
          }

          if (usesSharedDcr(entry.type)) {
              const sharedPlan = getSharedPlanForRow(entry);
              if (sharedPlan?.dcrs?.length) {
                  const collapsedId = entry.type === 'windows_events'
                      ? windowsCollapsedId
                      : entry.type === 'linux_server'
                          ? linuxCollapsedId
                          : syslogCollapsedId;
                  const targetIds = sharedPlan.collapsed
                      ? [collapsedId]
                      : getPlanTargetIds(sharedPlan, sourceId);

                  if (entry.type === 'syslog_cef') {
                      // Fix: TOPO-002 / TOPO-003 — share collector VMs across syslog rows and keep their wiring in the correct band.
                      const collectorVmId = `collector-${entry.route || ROUTE_STANDARD}-${entry.zone}`;
                      if (!renderedCollectorVmIds.has(collectorVmId)) {
                          nodes.push({
                              id: collectorVmId,
                              type: 'collectorVm',
                              data: {
                                  color: PATH_CONFIGS.syslog_cef.color,
                                  band: sourceBand,
                                  vmCount: sharedPlan?.vmCount || 0,
                                  capacityLabel: sharedPlan
                                      ? `${formatEps(sharedPlan.totalEps)} EPS [max: ${formatTopologyCount(FIREWALL_VM_EPS_CAPACITY)} EPS/VM]`
                                      : ''
                              },
                              position: entry.collectorVm || {
                                  x: entry.x + sourceWidth + collectorVmOffsetX,
                                  y: entry.y + collectorVmOffsetY
                              },
                              style: { width: collectorVmWidth }
                          });
                          renderedCollectorVmIds.add(collectorVmId);
                      }
                      edges.push(buildSourceToCollectorEdge(sourceId, collectorVmId, PATH_CONFIGS.syslog_cef.color));
                      targetIds.forEach((targetId) => {
                          const collectorTargetEdgeId = `e-${collectorVmId}--${targetId}`;
                          if (renderedCollectorTargetEdgeIds.has(collectorTargetEdgeId)) {
                              return;
                          }
                          edges.push(buildMiddleEdge(collectorVmId, targetId, PATH_CONFIGS.syslog_cef.color, sourceBand, {
                              id: collectorTargetEdgeId
                          }));
                          renderedCollectorTargetEdgeIds.add(collectorTargetEdgeId);
                      });
                      return;
                  }

                  targetIds.forEach((targetId) => {
                      edges.push(buildSourceToMiddleEdge(sourceId, targetId, pc.color, sourceBand));
                  });
                  return;
              }
          }

          const pathBoxes = Array.isArray(pc.pathBoxes) ? pc.pathBoxes : [];
          const dcrLayerIndex = sourceBand === 'bottom' ? (bottomDcrLayerIndex || 1) : (topDcrLayerIndex || 1);
          const dcrId = pc.dcr ? `${sourceId}-dcr` : null;
          const dcrPosition = pc.dcr ? getIntermediaryPosition(entry, dcrNodeWidth, dcrLayerIndex) : null;
          if (pc.dcr && dcrPosition) {
              nodes.push({
                  id: dcrId,
                  type: 'dcr',
                  position: dcrPosition,
                  data: {
                      label: typeof pc.dcr === 'string' ? pc.dcr : (pc.dcr.label || 'DCR'),
                      color: pc.color,
                      band: sourceBand
                  },
                  style: { width: dcrNodeWidth },
                  draggable: true
              });
          }

          if (pc.pathType === 'server') {
              const serverId = `${sourceId}-server`;
              const serverLayerIndex = sourceBand === 'bottom'
                  ? (pc.dcr ? dcrLayerIndex + 1 : 1)
                  : (pc.dcr ? Math.max(1, dcrLayerIndex - 1) : 1);
              nodes.push({
                  id: serverId,
                  type: 'server',
                  data: {
                      color: pc.color,
                      serverLabel: pc.serverLabel,
                      agentLabel: pc.agentLabel,
                      serverOs: pc.serverOs,
                      topologyType: entry.type,
                      environment: entry.zone,
                      band: sourceBand,
                      serverIndicators: buildServerIndicatorsForGroup(entry.type, entry.solutions, capacitySnapshot, entry.zone)
                  },
                  position: getIntermediaryPosition(entry, serverNodeWidth, serverLayerIndex),
                  style: { width: serverNodeWidth }
              });
              edges.push(buildSourceToMiddleEdge(sourceId, serverId, pc.color, sourceBand));
              if (pc.dcr && dcrId) {
                  edges.push(buildMiddleEdge(serverId, dcrId, pc.color, sourceBand));
                  edges.push(buildMiddleEdge(dcrId, 'sentinel', pc.color, sourceBand));
              } else {
                  edges.push(buildMiddleEdge(serverId, 'sentinel', pc.color, sourceBand));
              }
              return;
          }

          let previousNodeId = sourceId;
          const firstBoxLayerIndex = sourceBand === 'bottom'
              ? (pc.dcr ? dcrLayerIndex + 1 : 1)
              : (pc.dcr ? Math.max(1, dcrLayerIndex - pathBoxes.length) : 1);
          pathBoxes.forEach((box, index) => {
              const boxId = `${sourceId}-box-${index}`;
              const boxLabel = typeof box === 'string' ? box : (box.label || '');
              const boxIcon = typeof box === 'object' ? box.icon : undefined;
              nodes.push({
                  id: boxId,
                  type: 'pathBox',
                  data: {
                      label: boxLabel,
                      color: pc.color,
                      icon: boxIcon,
                      band: sourceBand
                  },
                  position: (!pc.dcr && index === pathBoxes.length - 1)
                      ? { x: clampNodeX(sentinelCenterX - (pathNodeWidth / 2), pathNodeWidth), y: (entry.band === 'bottom' ? getBottomLayerY(firstBoxLayerIndex + index) : getTopLayerY(firstBoxLayerIndex + index)) }
                      : getIntermediaryPosition(entry, pathNodeWidth, firstBoxLayerIndex + index),
                  style: { width: pathNodeWidth }
              });
              edges.push(previousNodeId === sourceId
                  ? buildSourceToMiddleEdge(sourceId, boxId, pc.color, sourceBand)
                  : buildMiddleEdge(previousNodeId, boxId, pc.color, sourceBand));
              previousNodeId = boxId;
          });

          if (pc.dcr && dcrId) {
              edges.push(previousNodeId === sourceId
                  ? buildSourceToMiddleEdge(sourceId, dcrId, pc.color, sourceBand)
                  : buildMiddleEdge(previousNodeId, dcrId, pc.color, sourceBand));
              edges.push(buildMiddleEdge(dcrId, 'sentinel', pc.color, sourceBand));
              return;
          }

          edges.push(previousNodeId === sourceId
              ? sourceToSentinelEdge()
              : buildMiddleEdge(previousNodeId, 'sentinel', pc.color, sourceBand));
      });
  });

  const getNodeWidthForPortLayout = (node = {}) => Number(node?.style?.width)
      || (node?.type === 'sentinel' ? sentinelNodeWidth
          : node?.type === 'dcr' ? dcrNodeWidth
              : node?.type === 'collectorVm' ? collectorVmWidth
                  : node?.type === 'cribl' ? pathNodeWidth
                      : node?.type === 'server' ? serverNodeWidth
                          : sourceNodeWidth);
  const getNodeCenterXForPortLayout = (node = {}) => (Number(node?.position?.x) || 0) + (getNodeWidthForPortLayout(node) / 2);
  const applyDistributedHandlePorts = () => {
      const nodeById = new Map(nodes.map((node) => [node.id, node]));
      const portGroups = new Map();
      const registerPortGroup = (nodeId, edge, endpoint = 'source', side = 'top') => {
          if (!['top', 'bottom'].includes(side)) {
              return;
          }
          const node = nodeById.get(nodeId);
          if (!node || !MULTI_PORT_NODE_TYPES.has(node.type)) {
              return;
          }
          const otherNode = nodeById.get(endpoint === 'source' ? edge.target : edge.source);
          const groupKey = `${nodeId}|${endpoint}|${side}`;
          if (!portGroups.has(groupKey)) {
              portGroups.set(groupKey, []);
          }
          portGroups.get(groupKey).push({
              edge,
              otherNodeId: endpoint === 'source' ? edge.target : edge.source,
              otherCenterX: getNodeCenterXForPortLayout(otherNode)
          });
      };

      edges.forEach((edge) => {
          registerPortGroup(edge.source, edge, 'source', HANDLE_SIDE_BY_ID[edge.sourceHandle]);
          registerPortGroup(edge.target, edge, 'target', HANDLE_SIDE_BY_ID[edge.targetHandle]);
      });

      portGroups.forEach((assignments, groupKey) => {
          const [nodeId, endpoint, side] = groupKey.split('|');
          const node = nodeById.get(nodeId);
          if (!node) {
              return;
          }

          node.data = node.data || {};
          node.data.portLayout = createPortLayout(node.data.portLayout);
          const sortedAssignments = assignments.slice().sort((left, right) => {
              if (left.otherCenterX !== right.otherCenterX) {
                  return left.otherCenterX - right.otherCenterX;
              }
              const nodeIdDelta = String(left.otherNodeId || '').localeCompare(String(right.otherNodeId || ''));
              if (nodeIdDelta !== 0) {
                  return nodeIdDelta;
              }
              return String(left.edge.id || '').localeCompare(String(right.edge.id || ''));
          });
          const portCount = Math.max(1, Math.min(MULTI_PORT_HANDLE_CAP, sortedAssignments.length));
          setPortHandleCount(node.data.portLayout, endpoint, side, portCount);

          sortedAssignments.forEach((assignment, index) => {
              const portIndex = portCount === 1
                  ? 0
                  : Math.round((index * (portCount - 1)) / Math.max(1, sortedAssignments.length - 1));
              if (endpoint === 'source') {
                  assignment.edge.sourceHandle = getMultiPortHandleId('source', side, portIndex);
              } else {
                  assignment.edge.targetHandle = getMultiPortHandleId('target', side, portIndex);
              }
          });
      });
  };

  applyDistributedHandlePorts();

  const legendSeeds = [
        ...groupEntries.map(([type]) => {
            const pc = PATH_CONFIGS[type] || PATH_CONFIGS.api;
            return { color: pc.color, label: pc.protocol };
        }),
        ...(criblSourceIds.length > 0 ? [{ color: PATH_CONFIGS.cribl.color, label: PATH_CONFIGS.cribl.protocol }] : [])
    ];
  const legendItems = [...new Map(legendSeeds.map((entry) => [entry.label, entry])).values()];

    containerEl.innerHTML = `
        <div class="topo-container">
            <div id="reactflow-topology" class="topo-flow-wrapper"></div>
            <div class="topo-legend">
                <div class="topo-legend-title">Legend — Ingestion Methods</div>
                ${legendItems.map((l) => `<div class="topo-legend-item"><div class="topo-legend-swatch" style="background:${l.color}"></div>${l.label}</div>`).join('')}
            </div>
            <div class="topo-info-cards">
                <div class="topo-info-card">
                    <h4>🏗 Workspace</h4>
                    <p><strong>Log Analytics Workspace</strong></p>
                </div>
                <div class="topo-info-card">
                    <h4>📈 Connectors</h4>
                    <p><strong>${topologySolutions.length}</strong> data connectors across <strong>${Object.keys(groups).length + (criblSourceIds.length > 0 ? 1 : 0)}</strong> ingestion methods</p>
                </div>
            </div>
        </div>`;

    const renderDistributedHandles = (kind = 'source', side = 'top', color = '#0078d4', count = 1, size = 6, dimmed = false) => {
        const safeCount = Math.max(1, Number(count) || 1);
        return Array.from({ length: safeCount }, (_, index) => h(Handle, {
            key: `${kind}-${side}-${index}`,
            id: getMultiPortHandleId(kind, side, index),
            type: kind,
            position: side === 'bottom' ? Position.Bottom : Position.Top,
            style: getDistributedHandleStyle(color, side, index, safeCount, size, dimmed)
        }));
    };

    function SourceNode({ data }) {
        const { solutions, pc, type, zone, band = 'top', windowsPools, color, useRightHandle = false, usePoolGrid = false } = data;
        const isWindows = type === 'windows_events';
        const nodeColor = color || pc.color;
        const items = solutions.slice(0, 5).map((s, i) =>
            h('div', { key: i, className: 'rf-source-item', style: { borderLeftColor: pc.color } },
                h('div', { className: 'rf-source-name' }, s.name)
            )
        );
        const moreCount = solutions.length - 5;
        const showArcAgent = isWindows && zone === 'onprem';
        const pools = isWindows && Array.isArray(windowsPools) ? windowsPools : [];
        const standardContent = [
            ...items,
            moreCount > 0 ? h('div', { className: 'rf-source-item', style: { borderLeftColor: pc.color, color: 'var(--text-muted)' } }, `+${moreCount} more`) : null
        ];
        const sourceContent = isWindows && pools.length > 0
            ? [
                h('div', { className: `rf-source-windows-extras${usePoolGrid ? ' rf-pool-grid' : ''}`, key: 'windows-pools' },
                    ...pools.map((pool, index) => {
                        const indicator = pool?.indicator || {};
                        const count = Number(indicator.count) || 0;
                        return h('div', {
                            key: pool.id || index,
                            className: 'rf-pool-section',
                            style: {
                                borderColor: hexToRgba(nodeColor, 0.22),
                                borderLeftColor: nodeColor,
                                background: hexToRgba(nodeColor, 0.08)
                            }
                        },
                        h('div', {
                            style: {
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                color: 'var(--text-muted)'
                            }
                        }, pool.label || `Pool ${index + 1}`),
                        h('div', { className: 'rf-pool-header' },
                            h('span', { className: 'server-chip__icon', style: { color: nodeColor } }, renderServerOsIcon(indicator.os || 'windows', 'rf-inline-os-icon')),
                            h('span', { className: 'rf-source-name' }, indicator.role || 'Windows Servers'),
                            count > 0 ? h('span', { className: 'server-chip__count' }, `×${formatTopologyCount(count)}`) : null,
                            indicator.isDefault ? h('span', { className: 'server-chip__est' }, 'est.') : null
                        ),
                        showArcAgent ? h('div', { className: 'rf-server-agent rf-server-agent--arc' }, '📡 Arc Agent (Azure Connected)') : null,
                        h('div', { className: 'rf-server-agent rf-server-agent--ama' }, '📡 AMA Agent'),
                        h('div', { className: 'rf-pool-solutions' },
                            ...(Array.isArray(pool.solutions) ? pool.solutions : []).map((solution, solutionIndex) => h('div', {
                                key: solution?.id || `${pool.id || index}-${solutionIndex}`,
                                className: 'rf-pool-solution-box',
                                style: {
                                    borderLeftColor: nodeColor,
                                    background: hexToRgba(nodeColor, 0.12)
                                }
                            }, solution?.name || 'Unnamed solution'))
                        )
                        );
                    })
                )
            ]
            : standardContent;
        const activeVerticalHandle = band === 'bottom' ? HANDLE_IDS.sourceTop : HANDLE_IDS.sourceBottom;

        return h('div', { className: `rf-source-node${usePoolGrid ? ' rf-source-node--wide' : ''}` },
            h(Handle, { id: HANDLE_IDS.sourceTop, type: 'source', position: Position.Top, style: getHandleStyle(pc.color, 8, useRightHandle || activeVerticalHandle !== HANDLE_IDS.sourceTop) }),
            h(Handle, { id: HANDLE_IDS.sourceRight, type: 'source', position: Position.Right, style: getHandleStyle(pc.color, 8, !useRightHandle) }),
            h('div', { className: 'rf-source-node-title' },
                h(RemoteLogo, {
                    src: pc.logoUrl,
                    fallback: pc.sourceIcon,
                    className: 'rf-source-node-title-icon',
                    imgClassName: 'rf-source-node-title-icon-img',
                    fallbackClassName: 'rf-source-node-title-icon-fallback'
                }),
                h('span', { className: 'rf-source-node-title-text' }, pc.sourceLabel)
            ),
            ...sourceContent,
            h(Handle, { id: HANDLE_IDS.sourceBottom, type: 'source', position: Position.Bottom, style: getHandleStyle(pc.color, 8, useRightHandle || activeVerticalHandle !== HANDLE_IDS.sourceBottom) })
        );
    }

    function PathBoxNode({ data }) {
        const band = data.band || 'top';
        return h('div', { className: 'rf-path-node', style: { borderColor: data.color } },
            h(Handle, { id: HANDLE_IDS.targetTop, type: 'target', position: Position.Top, style: getHandleStyle(data.color, 6, band === 'bottom') }),
            h(Handle, { id: HANDLE_IDS.targetBottom, type: 'target', position: Position.Bottom, style: getHandleStyle(data.color, 6, band !== 'bottom') }),
            h(Handle, { id: HANDLE_IDS.targetLeft, type: 'target', position: Position.Left, style: getHandleStyle(data.color, 6, true) }),
            h('span', { className: 'rf-path-icon' }, data.icon),
            data.label,
            h(Handle, { id: HANDLE_IDS.sourceTop, type: 'source', position: Position.Top, style: getHandleStyle(data.color, 6, band !== 'bottom') }),
            h(Handle, { id: HANDLE_IDS.sourceBottom, type: 'source', position: Position.Bottom, style: getHandleStyle(data.color, 6, band === 'bottom') }),
            h(Handle, { id: HANDLE_IDS.sourceRight, type: 'source', position: Position.Right, style: getHandleStyle(data.color, 6, true) })
        );
    }

    function CriblNode({ data }) {
        const acceptsTop = Boolean(data?.acceptsTop);
        const acceptsBottom = Boolean(data?.acceptsBottom);
        return h('div', { className: 'rf-cribl-node', style: { height: '100%' } },
            h(Handle, { id: HANDLE_IDS.sourceLeft, type: 'source', position: Position.Left, style: getHandleStyle(data.color, 6, false) }),
            ...renderDistributedHandles('target', 'top', data.color, getPortHandleCount(data, 'target', 'top'), 6, !acceptsTop),
            ...renderDistributedHandles('target', 'bottom', data.color, getPortHandleCount(data, 'target', 'bottom'), 6, !acceptsBottom),
            h(RemoteLogo, {
                src: data.logoUrl,
                fallback: data.icon || '🔀',
                className: 'rf-path-logo',
                imgClassName: 'rf-path-logo-img',
                fallbackClassName: 'rf-path-logo-fallback'
            }),
            h('span', null, data.label || 'Cribl Stream'),
            ...renderDistributedHandles('source', 'top', data.color, getPortHandleCount(data, 'source', 'top'), 6, true),
            ...renderDistributedHandles('source', 'bottom', data.color, getPortHandleCount(data, 'source', 'bottom'), 6, true)
        );
    }

    function ServerNode({ data }) {
        const indicators = Array.isArray(data?.serverIndicators) ? data.serverIndicators : [];
        const visibleIndicators = indicators.slice(0, 3);
        const hiddenCount = Math.max(0, indicators.length - visibleIndicators.length);
        const showArcAgent = data.environment === 'onprem'
            && (data.topologyType === 'windows_events' || data.topologyType === 'syslog_cef');
        const band = data.band || 'top';

        return h('div', { className: 'rf-server-node', style: { borderColor: data.color } },
            h(Handle, { id: HANDLE_IDS.targetTop, type: 'target', position: Position.Top, style: getHandleStyle(data.color, 6, band === 'bottom') }),
            h(Handle, { id: HANDLE_IDS.targetBottom, type: 'target', position: Position.Bottom, style: getHandleStyle(data.color, 6, band !== 'bottom') }),
            h(Handle, { id: HANDLE_IDS.targetLeft, type: 'target', position: Position.Left, style: getHandleStyle(data.color, 6, true) }),
            h('div', { className: 'rf-server-icon', style: { color: data.color } }, renderServerOsIcon(data.serverOs || 'windows', 'rf-inline-os-icon rf-inline-os-icon--large')),
            h('div', { className: 'rf-server-label' }, data.serverLabel),
            showArcAgent ? h('div', { className: 'rf-server-agent rf-server-agent--arc' }, '📡 Arc Agent (Azure Connected)') : null,
            h('div', { className: `rf-server-agent${data.agentLabel === 'AMA Agent' ? ' rf-server-agent--ama' : ''}` }, '📡 ', data.agentLabel),
            visibleIndicators.length > 0
                ? h('div', { className: 'rf-server-chip-strip' },
                    ...visibleIndicators.map((indicator) => h('span', {
                        key: indicator.key,
                        className: `server-chip${indicator.isDefault ? ' server-chip--estimated' : ''}`,
                        style: getServerChipStyle(data.color, indicator.isDefault)
                    },
                    h('span', { className: 'server-chip__icon', style: { color: data.color } }, renderServerOsIcon(indicator.os, 'rf-inline-os-icon')),
                    h('span', { className: 'server-chip__text' }, indicator.role),
                    h('span', { className: 'server-chip__count' }, `×${formatTopologyCount(indicator.count)}`),
                    indicator.isDefault ? h('span', { className: 'server-chip__est' }, 'est.') : null
                    )),
                    hiddenCount > 0
                        ? h('span', {
                            className: 'server-chip server-chip--overflow',
                            style: getServerChipStyle(data.color, true)
                        }, `+${hiddenCount} more`)
                        : null
                )
                : null,
            h(Handle, { id: HANDLE_IDS.sourceTop, type: 'source', position: Position.Top, style: getHandleStyle(data.color, 6, band !== 'bottom') }),
            h(Handle, { id: HANDLE_IDS.sourceBottom, type: 'source', position: Position.Bottom, style: getHandleStyle(data.color, 6, band === 'bottom') }),
            h(Handle, { id: HANDLE_IDS.sourceRight, type: 'source', position: Position.Right, style: getHandleStyle(data.color, 6, true) })
        );
    }

    function UberBoxNode({ data }) {
        const color = data?.color || '#8b5cf6';
        return h('div', {
            className: 'rf-uberbox-node',
            style: {
                borderColor: hexToRgba(color, 0.40),
                background: hexToRgba(color, 0.10)
            }
        },
        h('div', { className: 'rf-uberbox-label', style: { color } }, data?.label || ''));
    }

    function DCRNode({ data }) {
        const dataSources = Array.isArray(data?.dataSources) ? data.dataSources.filter(Boolean) : [];
        const requestsPerMinute = Number(data?.requestsPerMinute);
        const maxRequestsPerMinute = Number(data?.maxRequestsPerMinute);
        const assignedEps = data?.assignedEps != null ? Number(data.assignedEps) : null;
        const hasEps = assignedEps !== null && Number.isFinite(assignedEps);
        const hasRequests = !hasEps && Number.isFinite(requestsPerMinute);
        const hasMaxRequests = Number.isFinite(maxRequestsPerMinute);
        const hasDetails = dataSources.length > 0 || hasRequests || hasEps || Boolean(data?.capacityLabel);
        const metricLabel = data?.capacityLabel
            || (hasEps
                ? `${formatEps(assignedEps)} EPS [max: ~65k EPS]`
                : hasRequests
                    ? `${formatReqPerMin(requestsPerMinute)} req/min${hasMaxRequests ? ` [max: ${formatTopologyCount(maxRequestsPerMinute)}/min]` : ''}`
                    : '');
        const warningTitle = hasEps
            ? 'Approaching EPS limit'
            : `Approaching ${formatTopologyCount(maxRequestsPerMinute || WINDOWS_DCR_MAX_REQUESTS_PER_MIN)} req/min limit`;
        const band = data.band || 'top';
        const targetActiveSide = band === 'bottom' ? 'bottom' : 'top';
        const sourceActiveSide = band === 'bottom' ? 'top' : 'bottom';

        return h('div', { className: `rf-dcr-node${hasDetails ? ' rf-dcr-node--with-sources' : ''}`, style: { borderColor: data.color, color: data.color } },
            ...renderDistributedHandles('target', 'top', data.color, getPortHandleCount(data, 'target', 'top'), 5, targetActiveSide !== 'top'),
            ...renderDistributedHandles('target', 'bottom', data.color, getPortHandleCount(data, 'target', 'bottom'), 5, targetActiveSide !== 'bottom'),
            h(Handle, { id: HANDLE_IDS.targetLeft, type: 'target', position: Position.Left, style: getHandleStyle(data.color, 5, true) }),
            h('div', { className: 'rf-dcr-header' },
                h('div', { className: 'rf-dcr-label' }, data.label),
                data?.isNearLimit
                    ? h('div', {
                        className: 'rf-dcr-warning',
                        title: warningTitle
                    }, '⚠ Near limit')
                    : null
            ),
            typeof data?.count === 'number'
                ? h('div', { className: 'rf-dcr-detail' }, `Includes ${data.count} DCRs`)
                : null,
            dataSources.length > 0
                ? h('div', { className: 'rf-dcr-detail' }, `Data sources: ${dataSources.join(', ')}`)
                : null,
            metricLabel
                ? h('div', { className: 'rf-dcr-detail rf-dcr-detail--metric' }, metricLabel)
                : null,
            ...renderDistributedHandles('source', 'top', data.color, getPortHandleCount(data, 'source', 'top'), 5, sourceActiveSide !== 'top'),
            ...renderDistributedHandles('source', 'bottom', data.color, getPortHandleCount(data, 'source', 'bottom'), 5, sourceActiveSide !== 'bottom'),
            h(Handle, { id: HANDLE_IDS.sourceRight, type: 'source', position: Position.Right, style: getHandleStyle(data.color, 5, true) })
        );
    }

    function CollectorVmNode({ data }) {
        const band = data.band || 'top';
        const sourceActiveSide = band === 'bottom' ? 'top' : 'bottom';
        return h('div', { className: 'rf-server-node', style: { borderColor: data.color } },
            h(Handle, { id: HANDLE_IDS.targetTop, type: 'target', position: Position.Top, style: getHandleStyle(data.color, 6, true) }),
            h(Handle, { id: HANDLE_IDS.targetBottom, type: 'target', position: Position.Bottom, style: getHandleStyle(data.color, 6, true) }),
            h(Handle, { id: HANDLE_IDS.targetLeft, type: 'target', position: Position.Left, style: getHandleStyle(data.color, 6) }),
            h('div', { className: 'rf-server-icon', style: { color: data.color } }, renderServerOsIcon('linux', 'rf-inline-os-icon rf-inline-os-icon--large')),
            h('div', { className: 'rf-server-label' }, 'Linux VM (collector)'),
            h('div', { className: 'rf-server-agent rf-server-agent--ama' }, '📡 AMA Agent'),
            data.vmCount > 1
                ? h('div', { className: 'rf-server-chip-strip' },
                    h('span', {
                        className: 'server-chip',
                        style: { borderColor: hexToRgba(data.color, 0.28), background: hexToRgba(data.color, 0.12) }
                    },
                    h('span', { className: 'server-chip__count' }, `×${formatTopologyCount(data.vmCount)} VMs`))
                )
                : null,
            data.capacityLabel
                ? h('div', { className: 'rf-dcr-detail rf-dcr-detail--metric' }, data.capacityLabel)
                : null,
            ...renderDistributedHandles('source', 'top', data.color, getPortHandleCount(data, 'source', 'top'), 6, sourceActiveSide !== 'top'),
            ...renderDistributedHandles('source', 'bottom', data.color, getPortHandleCount(data, 'source', 'bottom'), 6, sourceActiveSide !== 'bottom'),
            h(Handle, { id: HANDLE_IDS.sourceRight, type: 'source', position: Position.Right, style: getHandleStyle(data.color, 6, true) })
        );
    }

    function SentinelNode({ data }) {
        return h('div', { className: 'rf-sentinel-node' },
            ...renderDistributedHandles('target', 'top', '#0078d4', getPortHandleCount(data, 'target', 'top'), 10),
            ...renderDistributedHandles('target', 'bottom', '#0078d4', getPortHandleCount(data, 'target', 'bottom'), 10),
            h(Handle, { id: HANDLE_IDS.targetRight, type: 'target', position: Position.Right, style: getHandleStyle('#0078d4', 10, !data?.hasSidecarTarget) }),
            h('div', { className: 'rf-sentinel-icon' }, '🛡️'),
            h('div', { className: 'rf-sentinel-label' }, 'Microsoft Sentinel'),
            h('div', { className: 'rf-sentinel-sub' }, data.workspace),
            h('div', { className: 'rf-sentinel-portal' }, '🌐 Unified Defender XDR Portal', h('br'), h('code', null, 'security.microsoft.com'))
        );
    }

    function FlowWrapper() {
        const nt = React.useMemo(() => ({ source: SourceNode, pathBox: PathBoxNode, cribl: CriblNode, server: ServerNode, dcr: DCRNode, sentinel: SentinelNode, uberBox: UberBoxNode, collectorVm: CollectorVmNode }), []);
        return h(RF, {
            defaultNodes: nodes,
            defaultEdges: edges,
            nodeTypes: nt,
            fitView: true,
            fitViewOptions: { padding: 0.2 },
            proOptions: { hideAttribution: true },
            defaultEdgeOptions: { type: 'step', animated: true },
            minZoom: 0.3,
            maxZoom: 2,
            nodesDraggable: true,
            style: { background: 'transparent' }
        },
            h(Controls, { showInteractive: false }),
            h(Background, { variant: 'dots', gap: 20, size: 1, color: 'rgba(255,255,255,0.05)' })
        );
    }

    const app = h(ReactFlowProvider, null, h(FlowWrapper));
    const topoContainer = document.getElementById('reactflow-topology');
    const root = ReactDOM.createRoot(topoContainer);
    root.render(app);
}
