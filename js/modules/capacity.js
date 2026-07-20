export const WINDOWS_SHARED_CAPACITY_KEY = '__shared-windows-sizing__';
export const FIREWALL_VM_EPS_CAPACITY = 10000;
export const WINDOWS_SERVERS_PER_VM = 100;
export const DEFAULT_FIREWALL_EPS = 1000;
export const DEFAULT_WINDOWS_SERVERS = 100;
export const DEFAULT_WINDOWS_ONPREM_PERCENT = 50;
export const DEFAULT_LINUX_SERVERS = 50;
export const DEFAULT_LINUX_ONPREM_PERCENT = 50;
export const DEFAULT_LINUX_EPS = 5000;
export const RECOMMENDED_FORWARDER_VM_SIZE = 'Standard_D4s_v3';
export const FIREWALL_SIZING_DOC_URL = 'https://learn.microsoft.com/azure/sentinel/connect-common-event-format';
export const WINDOWS_SIZING_DOC_URL = 'https://learn.microsoft.com/azure/azure-monitor/vm/data-collection-windows-events';
export const WEC_SIZING_DOC_URL = 'https://techcommunity.microsoft.com/blog/coreinfrastructureandsecurityblog/forward-on-premises-windows-security-event-logs-to-microsoft-sentinel/3040784';
export const WEC_RECOMMENDED_CLIENTS_PER_SERVER = 4000;
export const WEC_TYPICAL_CLIENTS_MIN = 2000;
export const WEC_TYPICAL_CLIENTS_MAX = 4000;
export const WEC_ENVIRONMENTAL_CLIENTS_MAX = 10000;
export const WEC_AMA_EPS_LIMIT = 5000;
export const WEC_RECOMMENDED_RAM_GB = 16;
export const WEC_RECOMMENDED_CPU_COUNT = 4;

const WINDOWS_FAMILY_IDS = new Set([
    'windows-security-events',
    'windows-forwarded-events',
    'windows-forwarded-events-via-ama',
    'windows-firewall-via-ama',
    'windows-dns-events-via-ama',
    'sysmon-via-ama'
]);
const LINUX_SERVER_IDS = new Set(['linux-syslog', 'microsoft-sysmon-for-linux']);
const DEFAULT_WINDOWS_SERVER_COUNT_LABEL = 'How many Windows servers?';
const DEFAULT_WEC_SERVER_COUNT_LABEL = 'How many WEC servers?';
const WINDOWS_AMA_SHARED_GROUP = 'windows-ama';
export const DEFAULT_COLLECTOR_VM_ZONE = 'onprem';
const COLLECTOR_VM_ZONE_LABELS = {
    onprem: 'On-Premises',
    azure: 'Azure'
};

export function normalizeCollectorVmZone(value = '') {
    return normalizeId(value) === 'azure' ? 'azure' : DEFAULT_COLLECTOR_VM_ZONE;
}

export function getCollectorVmZoneLabel(value = '') {
    return COLLECTOR_VM_ZONE_LABELS[normalizeCollectorVmZone(value)] || COLLECTOR_VM_ZONE_LABELS[DEFAULT_COLLECTOR_VM_ZONE];
}

function normalizeId(value = '') {
    return String(value || '').trim().toLowerCase();
}

function uniqueIds(values = []) {
    return [...new Set((Array.isArray(values) ? values : [])
        .map((value) => normalizeId(value))
        .filter(Boolean))];
}

function cloneJson(value) {
    return value && typeof value === 'object'
        ? JSON.parse(JSON.stringify(value))
        : value;
}

function getSolutionLookupText(solution = {}) {
    const tags = Array.isArray(solution?.tags) ? solution.tags.join(' ') : '';
    const infra = Array.isArray(solution?.onboarding?.infrastructure_required)
        ? solution.onboarding.infrastructure_required.join(' ')
        : Array.isArray(solution?.requiredInfrastructure)
            ? solution.requiredInfrastructure.join(' ')
            : '';
    return [solution?.id, solution?.name, solution?.description, solution?.onboarding?.notes, tags, infra]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function clampPercent(value = 0) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function sanitizeCount(value = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed));
}

function formatNumber(value = 0) {
    return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

export function estimateWecServersForSourceComputers(sourceComputers = 0) {
    const sourceCount = Number(sourceComputers);
    if (!Number.isFinite(sourceCount) || sourceCount <= 0) {
        return 0;
    }
    return Math.ceil(sourceCount / WEC_RECOMMENDED_CLIENTS_PER_SERVER);
}

function getWindowsPopulationDescriptor(populationKind = 'windows') {
    if (normalizeId(populationKind) === 'wec') {
        return {
            summarySingular: 'WEC server',
            summaryPlural: 'WEC servers',
            detailSingular: 'WEC server',
            detailPlural: 'WEC servers'
        };
    }

    return {
        summarySingular: 'server',
        summaryPlural: 'servers',
        detailSingular: 'Windows server',
        detailPlural: 'Windows servers'
    };
}

function getServerCountLabel(solution = {}, populationKind = '') {
    const explicitLabel = String(solution?.server_count_label || '').trim();
    if (explicitLabel) return explicitLabel;
    return normalizeId(populationKind) === 'wec'
        ? DEFAULT_WEC_SERVER_COUNT_LABEL
        : DEFAULT_WINDOWS_SERVER_COUNT_LABEL;
}

function normalizePoolKind(kind = '') {
    const normalized = normalizeId(kind);
    if (normalized === 'wec') return 'wec';
    if (normalized === 'windows-ama' || normalized === 'windows_ama') return 'windows_ama';
    return normalized || 'windows';
}

function inferWindowsPopulationKind(solution = {}) {
    const solutionId = normalizeId(solution?.id);
    if (solutionId === 'windows-forwarded-events' || solutionId === 'windows-forwarded-events-via-ama') {
        return 'wec';
    }
    if (WINDOWS_FAMILY_IDS.has(solutionId)) {
        return 'windows_ama';
    }
    return 'windows';
}

function getConnectorCapacityMetadata(solution = {}) {
    // Content packs (0 connectors) never need sizing — unless they have explicit
    // sizing signals (fieldPack, capacity_type, or cribl_eligible) indicating they
    // rely on a dependent solution's connector but still need infrastructure sizing.
    if (Number(solution?.connectors) <= 0
        && !solution?.capacity_type
        && !solution?.fieldPack
        && solution?.cribl_eligible !== true) {
        return {
            type: 'none',
            populationKind: '',
            sharedPopulationGroup: '',
            serverCountLabel: ''
        };
    }

    const solutionId = normalizeId(solution?.id);
    const lookupText = getSolutionLookupText(solution);
    const capacityType = normalizeId(solution?.capacity_type);
    const explicitPopulationKind = normalizePoolKind(solution?.server_population_kind);
    const explicitSharedGroup = normalizeId(solution?.shared_population_group);

    if (capacityType === 'server_count') {
        if (explicitPopulationKind === 'linux' || LINUX_SERVER_IDS.has(solutionId)) {
            return {
                type: 'linux',
                populationKind: 'linux',
                sharedPopulationGroup: '',
                serverCountLabel: `How many Linux servers will run ${solution?.name || 'this connector'}?`
            };
        }

        const populationKind = explicitPopulationKind || inferWindowsPopulationKind(solution);
        return {
            type: 'windows',
            populationKind,
            sharedPopulationGroup: explicitSharedGroup,
            serverCountLabel: getServerCountLabel(solution, populationKind)
        };
    }

    if (capacityType === 'eps') {
        return {
            type: 'firewall',
            populationKind: '',
            sharedPopulationGroup: '',
            serverCountLabel: ''
        };
    }

    if (WINDOWS_FAMILY_IDS.has(solutionId)) {
        const populationKind = inferWindowsPopulationKind(solution);
        return {
            type: 'windows',
            populationKind,
            sharedPopulationGroup: '',
            serverCountLabel: getServerCountLabel(solution, populationKind)
        };
    }

    const isWindowsFamily = /windows/.test(lookupText)
        && /(ama|forwarded events|dns|sysmon|security events|windows firewall)/.test(lookupText)
        && !/linux/.test(solutionId);
    if (isWindowsFamily) {
        const populationKind = inferWindowsPopulationKind(solution);
        return {
            type: 'windows',
            populationKind,
            sharedPopulationGroup: '',
            serverCountLabel: getServerCountLabel(solution, populationKind)
        };
    }

    // Hard signal: explicit syslog-cef field pack always means a genuine CEF/Syslog forwarder pipeline.
    // This catches connectors whose text doesn't carry the keyword (e.g. zscaler, fortinet-forti-web-cloud-waf)
    // and is also the primary signal for imperva-waf-gateway after its data was enriched.
    if (solution?.fieldPack === 'syslog-cef') {
        return {
            type: 'firewall',
            populationKind: '',
            sharedPopulationGroup: '',
            serverCountLabel: ''
        };
    }

    // Text heuristic: only match genuine CEF/Syslog keywords — NOT "forwarder", which appears as
    // boilerplate in API/Codeless connector notes and causes false-positive firewall classification
    // for connectors like Cortex XDR CCP, Xpanse CCF, and Imperva Cloud WAF.
    const hasCefOrSyslogPath = /(cef|syslog|common event format)/.test(lookupText);
    const isFirewallFamily = /(check\s*point|checkpoint|fortinet|forti gate|fortigate|palo\s*alto|ngfw|firewall|cdl)/.test(lookupText);
    if (hasCefOrSyslogPath && isFirewallFamily) {
        return {
            type: 'firewall',
            populationKind: '',
            sharedPopulationGroup: '',
            serverCountLabel: ''
        };
    }

    if (LINUX_SERVER_IDS.has(solutionId)) {
        return {
            type: 'linux',
            populationKind: 'linux',
            sharedPopulationGroup: '',
            serverCountLabel: `How many Linux servers will run ${solution?.name || 'this connector'}?`
        };
    }

    // Any cribl_eligible solution needs EPS-based sizing for Cribl/forwarder capacity planning
    if (solution?.cribl_eligible === true) {
        return {
            type: 'firewall',
            populationKind: '',
            sharedPopulationGroup: '',
            serverCountLabel: ''
        };
    }

    // Solutions with log_types[] (e.g. AWS) get a log-source selector instead of EPS/server sizing
    if (Array.isArray(solution?.log_types) && solution.log_types.length > 0) {
        return {
            type: 'log_selector',
            populationKind: '',
            sharedPopulationGroup: '',
            serverCountLabel: ''
        };
    }

    return {
        type: 'none',
        populationKind: '',
        sharedPopulationGroup: '',
        serverCountLabel: ''
    };
}

function isWindowsSizingPayload(value = {}) {
    return Boolean(value && typeof value === 'object' && (
        Object.prototype.hasOwnProperty.call(value, 'servers')
        || Object.prototype.hasOwnProperty.call(value, 'serverCount')
        || Object.prototype.hasOwnProperty.call(value, 'onPremPercent')
    ));
}

function isPoolStatePayload(value = {}) {
    return Boolean(value && typeof value === 'object' && (
        value?.serverPools && typeof value.serverPools === 'object'
        || value?.connectorSizing && typeof value.connectorSizing === 'object'
        || Object.prototype.hasOwnProperty.call(value, 'collectorVmZone')
    ));
}

function createEmptyPoolState() {
    return {
        serverPools: {},
        connectorSizing: {},
        nextPoolSequence: 1,
        collectorVmZone: DEFAULT_COLLECTOR_VM_ZONE,
        hasCollectorVmZonePreference: false
    };
}

function createServerPool(poolId = '', {
    kind = 'windows',
    serverCount = DEFAULT_WINDOWS_SERVERS,
    onPremPercent = DEFAULT_WINDOWS_ONPREM_PERCENT,
    connectorIds = [],
    isDefault = true
} = {}) {
    return {
        id: poolId,
        kind: normalizePoolKind(kind),
        serverCount: sanitizeCount(serverCount),
        onPremPercent: clampPercent(onPremPercent),
        connectorIds: uniqueIds(connectorIds),
        isDefault: Boolean(isDefault)
    };
}

function normalizeConnectorAssignment(solutionId = '', value = {}) {
    return {
        solutionId,
        poolId: String(value?.poolId || '').trim(),
        relation: normalizeId(value?.relation),
        draftPoolId: String(value?.draftPoolId || '').trim(),
        criblIngestion: Boolean(value?.criblIngestion),
        criblIngestionExplicit: Boolean(value?.criblIngestionExplicit)
    };
}

function rebuildPoolMembership(state = createEmptyPoolState()) {
    Object.values(state.serverPools || {}).forEach((pool) => {
        pool.connectorIds = [];
    });

    Object.entries(state.connectorSizing || {}).forEach(([solutionId, assignment]) => {
        const poolId = String(assignment?.poolId || '').trim();
        const pool = state.serverPools?.[poolId];
        if (!pool) return;
        if (!Array.isArray(pool.connectorIds)) {
            pool.connectorIds = [];
        }
        if (!pool.connectorIds.includes(solutionId)) {
            pool.connectorIds.push(solutionId);
        }
    });

    Object.values(state.serverPools || {}).forEach((pool) => {
        pool.connectorIds = uniqueIds(pool.connectorIds);
    });

    return state;
}

function pruneUnusedPools(state = createEmptyPoolState()) {
    const referencedPoolIds = new Set();

    Object.values(state.connectorSizing || {}).forEach((assignment) => {
        const poolId = String(assignment?.poolId || '').trim();
        const draftPoolId = String(assignment?.draftPoolId || '').trim();
        if (poolId) referencedPoolIds.add(poolId);
        if (draftPoolId) referencedPoolIds.add(draftPoolId);
    });

    Object.keys(state.serverPools || {}).forEach((poolId) => {
        if (!referencedPoolIds.has(poolId)) {
            delete state.serverPools[poolId];
        }
    });

    return state;
}

function getInitialWindowsPoolValues(solutionGroupEntries = {}, solutionId = '') {
    const entry = solutionGroupEntries?.[solutionId];
    if (isWindowsSizingPayload(entry?.sizing)) {
        return normalizeSizingValues('windows', entry.sizing);
    }
    return createDefaultSizingDraft('windows');
}

function allocatePoolId(state = createEmptyPoolState(), kind = 'windows') {
    const safeKind = normalizePoolKind(kind).replace(/_/g, '-');
    let nextSequence = Math.max(1, sanitizeCount(state?.nextPoolSequence) || 1);
    let poolId = `pool-${safeKind}-${nextSequence}`;
    while (state.serverPools?.[poolId]) {
        nextSequence += 1;
        poolId = `pool-${safeKind}-${nextSequence}`;
    }
    state.nextPoolSequence = nextSequence + 1;
    return poolId;
}

function readPersistedPoolState(solutionGroupEntries = {}) {
    const sharedEntry = solutionGroupEntries?.[WINDOWS_SHARED_CAPACITY_KEY] || {};
    const sizing = sharedEntry?.sizing;
    const state = createEmptyPoolState();

    if (isPoolStatePayload(sizing)) {
        state.serverPools = Object.fromEntries(Object.entries(sizing?.serverPools || {}).map(([poolId, pool]) => [
            poolId,
            createServerPool(poolId, {
                kind: pool?.kind,
                serverCount: pool?.serverCount,
                onPremPercent: pool?.onPremPercent,
                connectorIds: pool?.connectorIds,
                isDefault: pool?.isDefault
            })
        ]));
        state.connectorSizing = Object.fromEntries(Object.entries(sizing?.connectorSizing || {}).map(([solutionId, assignment]) => [
            solutionId,
            normalizeConnectorAssignment(solutionId, assignment)
        ]));
        state.nextPoolSequence = Math.max(1, sanitizeCount(sizing?.nextPoolSequence) || 1);
    }

    if (sizing && typeof sizing === 'object' && Object.prototype.hasOwnProperty.call(sizing, 'collectorVmZone')) {
        state.collectorVmZone = normalizeCollectorVmZone(sizing.collectorVmZone);
        state.hasCollectorVmZonePreference = true;
    }

    rebuildPoolMembership(state);
    pruneUnusedPools(state);

    return {
        sharedEntry,
        state,
        legacyAmaValues: isWindowsSizingPayload(sizing)
            ? normalizeSizingValues('windows', sizing)
            : null
    };
}

function ensureWindowsConnectorAssignments(selectedSolutions = [], solutionGroupEntries = {}, baseState = createEmptyPoolState(), legacyAmaValues = null) {
    const state = cloneJson(baseState) || createEmptyPoolState();
    const selectedWindows = (Array.isArray(selectedSolutions) ? selectedSolutions : []).map((solution) => ({
        solution,
        metadata: getConnectorCapacityMetadata(solution)
    })).filter(({ metadata }) => metadata.type === 'windows');

    if (legacyAmaValues && Object.keys(state.serverPools || {}).length === 0 && Object.keys(state.connectorSizing || {}).length === 0) {
        const amaConnectors = selectedWindows.filter(({ metadata }) => metadata.sharedPopulationGroup === WINDOWS_AMA_SHARED_GROUP);
        if (amaConnectors.length > 0) {
            const sharedPoolId = allocatePoolId(state, 'windows_ama');
            state.serverPools[sharedPoolId] = createServerPool(sharedPoolId, {
                kind: 'windows_ama',
                serverCount: legacyAmaValues.servers,
                onPremPercent: legacyAmaValues.onPremPercent,
                isDefault: Boolean(legacyAmaValues.isDefault)
            });
            amaConnectors.forEach(({ solution }, index) => {
                state.connectorSizing[solution.id] = normalizeConnectorAssignment(solution.id, {
                    poolId: sharedPoolId,
                    relation: index === 0 ? 'standalone' : 'same'
                });
            });
        }
    }

    selectedWindows.forEach(({ solution, metadata }) => {
        const existingAssignment = normalizeConnectorAssignment(solution.id, state.connectorSizing?.[solution.id] || {});
        const desiredKind = normalizePoolKind(metadata.populationKind || 'windows');

        if (metadata.sharedPopulationGroup === WINDOWS_AMA_SHARED_GROUP) {
            let poolId = existingAssignment.poolId;
            const currentPool = poolId ? state.serverPools?.[poolId] : null;
            const hasValidCurrentPool = Boolean(currentPool && normalizePoolKind(currentPool.kind) === desiredKind);

            if (!hasValidCurrentPool && existingAssignment.relation === 'additional' && existingAssignment.draftPoolId) {
                const draftPool = state.serverPools?.[existingAssignment.draftPoolId];
                if (draftPool && normalizePoolKind(draftPool.kind) === desiredKind) {
                    poolId = existingAssignment.draftPoolId;
                }
            }

            if (!poolId || !state.serverPools?.[poolId] || normalizePoolKind(state.serverPools[poolId].kind) !== desiredKind) {
                const otherPoolIds = uniqueIds(selectedWindows
                    .filter((candidate) => candidate.solution.id !== solution.id && candidate.metadata.sharedPopulationGroup === metadata.sharedPopulationGroup)
                    .map((candidate) => state.connectorSizing?.[candidate.solution.id]?.poolId)
                    .filter((candidatePoolId) => candidatePoolId && state.serverPools?.[candidatePoolId] && normalizePoolKind(state.serverPools[candidatePoolId].kind) === desiredKind));

                if (otherPoolIds.length > 0) {
                    poolId = otherPoolIds[0];
                } else {
                    const initialValues = getInitialWindowsPoolValues(solutionGroupEntries, solution.id);
                    poolId = allocatePoolId(state, desiredKind);
                    state.serverPools[poolId] = createServerPool(poolId, {
                        kind: desiredKind,
                        serverCount: initialValues.servers,
                        onPremPercent: initialValues.onPremPercent,
                        isDefault: Boolean(initialValues.isDefault)
                    });
                }
            }

            state.connectorSizing[solution.id] = normalizeConnectorAssignment(solution.id, {
                poolId,
                relation: existingAssignment.relation || '',
                draftPoolId: existingAssignment.draftPoolId || '',
                criblIngestion: existingAssignment.criblIngestion,
                criblIngestionExplicit: existingAssignment.criblIngestionExplicit
            });
            return;
        }

        let poolId = existingAssignment.poolId;
        const currentPool = poolId ? state.serverPools?.[poolId] : null;
        if (!currentPool || normalizePoolKind(currentPool.kind) !== desiredKind) {
            const initialValues = getInitialWindowsPoolValues(solutionGroupEntries, solution.id);
            poolId = allocatePoolId(state, desiredKind);
            state.serverPools[poolId] = createServerPool(poolId, {
                kind: desiredKind,
                serverCount: initialValues.servers,
                onPremPercent: initialValues.onPremPercent,
                isDefault: Boolean(initialValues.isDefault)
            });
        }

        state.connectorSizing[solution.id] = normalizeConnectorAssignment(solution.id, {
            poolId,
            relation: metadata.populationKind === 'wec' ? 'dedicated' : 'standalone',
            draftPoolId: existingAssignment.draftPoolId || '',
            criblIngestion: existingAssignment.criblIngestion,
            criblIngestionExplicit: existingAssignment.criblIngestionExplicit
        });
    });

    rebuildPoolMembership(state);
    pruneUnusedPools(state);
    return state;
}

function buildActivePoolView(selectedSolutions = [], poolState = createEmptyPoolState()) {
    const selectedIds = new Set((Array.isArray(selectedSolutions) ? selectedSolutions : []).map((solution) => normalizeId(solution?.id)).filter(Boolean));
    const connectorSizing = {};

    selectedIds.forEach((solutionId) => {
        if (poolState?.connectorSizing?.[solutionId]) {
            connectorSizing[solutionId] = normalizeConnectorAssignment(solutionId, poolState.connectorSizing[solutionId]);
        }
    });

    const activePoolIds = uniqueIds(Object.values(connectorSizing).map((assignment) => assignment.poolId));
    const serverPools = Object.fromEntries(activePoolIds.flatMap((poolId) => {
        const sourcePool = poolState?.serverPools?.[poolId];
        if (!sourcePool) return [];
        return [[poolId, {
            ...sourcePool,
            connectorIds: uniqueIds(sourcePool.connectorIds).filter((connectorId) => selectedIds.has(connectorId))
        }]];
    }));

    return {
        connectorSizing,
        serverPools
    };
}

function buildPopulationGroups(selectedSolutions = [], connectorSizing = {}, serverPools = {}) {
    const groups = {};
    (Array.isArray(selectedSolutions) ? selectedSolutions : []).forEach((solution) => {
        const metadata = getConnectorCapacityMetadata(solution);
        if (!metadata.sharedPopulationGroup) return;
        const groupId = metadata.sharedPopulationGroup;
        if (!groups[groupId]) {
            groups[groupId] = {
                connectorIds: [],
                poolIds: []
            };
        }
        groups[groupId].connectorIds.push(solution.id);
        const poolId = connectorSizing?.[solution.id]?.poolId;
        if (poolId && serverPools?.[poolId]) {
            groups[groupId].poolIds.push(poolId);
        }
    });

    Object.values(groups).forEach((group) => {
        group.connectorIds = uniqueIds(group.connectorIds);
        group.poolIds = uniqueIds(group.poolIds);
    });

    return groups;
}

export function classifyConnectorCapacity(solution = {}) {
    return getConnectorCapacityMetadata(solution).type;
}

export function createDefaultSizingDraft(type = 'none', options = {}) {
    if (type === 'windows') {
        return {
            servers: DEFAULT_WINDOWS_SERVERS,
            onPremPercent: DEFAULT_WINDOWS_ONPREM_PERCENT,
            criblIngestion: false,
            criblIngestionExplicit: false,
            isDefault: true
        };
    }

    if (type === 'linux') {
        return {
            eps: DEFAULT_LINUX_EPS,
            servers: DEFAULT_LINUX_SERVERS,
            onPremPercent: DEFAULT_LINUX_ONPREM_PERCENT,
            criblIngestion: false,
            criblIngestionExplicit: false,
            isDefault: true
        };
    }

    if (type === 'firewall') {
        const measuredEps = options.measuredEps;
        const eps = (typeof measuredEps === 'number' && measuredEps > 0)
            ? measuredEps
            : DEFAULT_FIREWALL_EPS;
        return {
            eps,
            criblIngestion: false,
            criblIngestionExplicit: false,
            isDefault: true
        };
    }

    if (type === 'log_selector') {
        const logTypes = Array.isArray(options?.logTypes) ? options.logTypes : [];
        return {
            selectedLogTypes: logTypes.filter((lt) => lt.default_selected !== false).map((lt) => lt.id),
            isDefault: true
        };
    }

    return {};
}

export function normalizeSizingValues(type = 'none', values = {}) {
    if (type === 'windows') {
        return {
            servers: sanitizeCount(values?.servers ?? values?.serverCount),
            onPremPercent: clampPercent(values?.onPremPercent),
            criblIngestion: Boolean(values?.criblIngestion),
            criblIngestionExplicit: Boolean(values?.criblIngestionExplicit),
            isDefault: Boolean(values?.isDefault)
        };
    }

    if (type === 'linux') {
        return {
            eps: sanitizeCount(values?.eps),
            servers: sanitizeCount(values?.servers ?? values?.serverCount),
            onPremPercent: clampPercent(values?.onPremPercent ?? DEFAULT_LINUX_ONPREM_PERCENT),
            criblIngestion: Boolean(values?.criblIngestion),
            criblIngestionExplicit: Boolean(values?.criblIngestionExplicit),
            isDefault: Boolean(values?.isDefault)
        };
    }

    if (type === 'firewall') {
        return {
            eps: sanitizeCount(values?.eps),
            criblIngestion: Boolean(values?.criblIngestion),
            criblIngestionExplicit: Boolean(values?.criblIngestionExplicit),
            isDefault: Boolean(values?.isDefault)
        };
    }

    if (type === 'log_selector') {
        return {
            selectedLogTypes: Array.isArray(values?.selectedLogTypes) ? [...values.selectedLogTypes] : [],
            isDefault: Boolean(values?.isDefault)
        };
    }

    return {};
}

export function validateSizingDraft(type = 'none', values = {}) {
    const fieldErrors = {};
    const advisories = [];
    const warnings = [];

    if (type === 'windows') {
        if (values?.criblIngestion) {
            // Cribl handles collection — server count / split are not required
        } else {
            const serversRaw = String(values?.servers ?? values?.serverCount ?? '').trim();
            const onPremRaw = String(values?.onPremPercent ?? '').trim();
            const serversValue = Number(serversRaw);
            const onPremValue = Number(onPremRaw);

            if (!serversRaw || !Number.isFinite(serversValue) || serversValue < 0) {
                fieldErrors.servers = 'Enter a valid server count.';
            }

            if (!onPremRaw || !Number.isFinite(onPremValue) || onPremValue < 0 || onPremValue > 100) {
                fieldErrors.onPremPercent = 'Use a percentage from 0 to 100.';
            }

            if (!fieldErrors.servers && sanitizeCount(serversValue) === 0) {
                warnings.push('0 will produce 0 VMs — intentional?');
            }
        }
    }

    if (type === 'linux') {
        // EPS always required — drives DCR throughput regardless of collection method
        const epsRaw = String(values?.eps ?? '').trim();
        const epsValue = Number(epsRaw);
        if (!epsRaw || !Number.isFinite(epsValue) || epsValue < 0) {
            fieldErrors.eps = 'Enter a valid EPS value.';
        }
        if (!fieldErrors.eps && sanitizeCount(epsValue) === 0) {
            warnings.push('0 EPS will produce no DCR throughput — intentional?');
        }

        if (!values?.criblIngestion) {
            // Server count and split required when Cribl is not handling collection
            const serversRaw = String(values?.servers ?? values?.serverCount ?? '').trim();
            const onPremRaw = String(values?.onPremPercent ?? '').trim();
            const serversValue = Number(serversRaw);
            const onPremValue = Number(onPremRaw);

            if (!serversRaw || !Number.isFinite(serversValue) || serversValue < 0) {
                fieldErrors.servers = 'Enter a valid server count.';
            }

            if (!onPremRaw || !Number.isFinite(onPremValue) || onPremValue < 0 || onPremValue > 100) {
                fieldErrors.onPremPercent = 'Use a percentage from 0 to 100.';
            }

            if (!fieldErrors.servers && sanitizeCount(serversValue) === 0) {
                warnings.push('0 will produce 0 Linux servers — intentional?');
            }
        }
    }

    if (type === 'firewall') {
        const epsRaw = String(values?.eps ?? '').trim();
        const epsValue = Number(epsRaw);

        if (!epsRaw || !Number.isFinite(epsValue) || epsValue < 0) {
            fieldErrors.eps = 'Enter a valid EPS value.';
        }

        if (!fieldErrors.eps) {
            const normalizedEps = sanitizeCount(epsValue);
            if (normalizedEps === 0) {
                warnings.push('0 will produce 0 VMs — intentional?');
            }
            if (normalizedEps > 50000) {
                advisories.push('Above 50k EPS, consider Azure Monitor Pipeline instead of standalone AMA forwarders.');
            }
            if (normalizedEps > 100000) {
                advisories.push('EPS above 100,000 usually needs a pipeline-first architecture review.');
            }
        }
    }

    if (type === 'log_selector') {
        // Any selection (including empty) is valid — user may intentionally select zero sources
        return { fieldErrors: {}, warnings: [], advisories: [], isValid: true };
    }

    return {
        fieldErrors,
        warnings,
        advisories,
        isValid: Object.keys(fieldErrors).length === 0
    };
}

export function computeSizingResult(type = 'none', values = {}, options = {}) {
    const normalized = normalizeSizingValues(type, values);

    if (type === 'windows') {
        const populationKind = normalizePoolKind(options?.populationKind || 'windows');
        const descriptor = getWindowsPopulationDescriptor(populationKind);
        const isWec = populationKind === 'wec';
        const servers = normalized.servers;
        const onPremPercent = normalized.onPremPercent;
        const onPremServers = Math.round((servers * onPremPercent) / 100);
        const azureServers = Math.max(0, servers - onPremServers);
        const vmCount = servers <= 0 ? 0 : Math.ceil(servers / WINDOWS_SERVERS_PER_VM);
        const collectionVmLabel = isWec ? 'WEC collection VM' : 'Windows collection VM';
        const reasoning = `${formatNumber(servers)} ${servers === 1 ? descriptor.summarySingular : descriptor.summaryPlural} ÷ ${formatNumber(WINDOWS_SERVERS_PER_VM)} ${descriptor.summaryPlural}/VM = ${vmCount}, rounded up`;
        const serverSummaryLabel = `${formatNumber(servers)} ${servers === 1 ? descriptor.summarySingular : descriptor.summaryPlural}`;
        const serverDisplayLabel = `${formatNumber(servers)} ${servers === 1 ? descriptor.detailSingular : descriptor.detailPlural}`;
        const summary = `~${vmCount} VMs · ${serverSummaryLabel} · ${onPremPercent}% on-prem`;

        return {
            type,
            populationKind,
            vmCount,
            servers,
            onPremPercent,
            onPremServers,
            azureServers,
            reasoning,
            summary,
            serverSummaryLabel,
            serverDisplayLabel,
            badge: normalized.isDefault ? `~${vmCount} VMs (est.)` : `~${vmCount} VMs`,
            label: `${vmCount} ${collectionVmLabel}${vmCount === 1 ? '' : 's'}`,
            docUrl: isWec ? WEC_SIZING_DOC_URL : WINDOWS_SIZING_DOC_URL,
            docLabel: isWec ? 'WEC sizing guidance' : 'Windows AMA sizing guidance',
            recommendedVmSize: RECOMMENDED_FORWARDER_VM_SIZE,
            isDefault: normalized.isDefault
        };
    }

    if (type === 'linux') {
        const eps = normalized.eps;
        const servers = normalized.servers;
        const onPremPercent = normalized.onPremPercent;
        const onPremServers = Math.round((servers * onPremPercent) / 100);
        const azureServers = Math.max(0, servers - onPremServers);
        const requestsPerMinute = servers * 3;
        const serverSummaryLabel = `${formatNumber(servers)} Linux server${servers === 1 ? '' : 's'}`;
        const criblIngestion = normalized.criblIngestion;

        const summary = criblIngestion
            ? `${formatNumber(eps)} EPS · Cribl ingestion`
            : `${serverSummaryLabel} · ${formatNumber(eps)} EPS · ${onPremPercent}% on-prem`;

        const reasoning = criblIngestion
            ? `${formatNumber(eps)} EPS via Cribl — no AMA collector VMs required`
            : `${serverSummaryLabel} · ${formatNumber(eps)} EPS · ${formatNumber(onPremServers)} on-prem · ${formatNumber(azureServers)} Azure for shared Linux DCR sizing`;

        return {
            type,
            eps,
            servers,
            onPremPercent,
            onPremServers,
            azureServers,
            requestsPerMinute,
            reasoning,
            summary,
            serverSummaryLabel,
            serverDisplayLabel: serverSummaryLabel,
            badge: normalized.isDefault
                ? (criblIngestion ? `${formatNumber(eps)} EPS (est.)` : `${serverSummaryLabel} (est.)`)
                : (criblIngestion ? `${formatNumber(eps)} EPS` : serverSummaryLabel),
            label: criblIngestion ? `${formatNumber(eps)} EPS via Cribl` : serverSummaryLabel,
            docUrl: '',
            docLabel: '',
            isDefault: normalized.isDefault
        };
    }

    if (type === 'firewall') {
        const eps = normalized.eps;
        const vmCount = eps <= 0 ? 0 : Math.ceil(eps / FIREWALL_VM_EPS_CAPACITY);
        const reasoning = `${formatNumber(eps)} EPS ÷ ${formatNumber(FIREWALL_VM_EPS_CAPACITY)} EPS/VM = ${vmCount}, rounded up`;
        const summary = `~${vmCount} VMs · ${formatNumber(eps)} EPS`;

        return {
            type,
            vmCount,
            eps,
            reasoning,
            summary,
            badge: normalized.isDefault ? `~${vmCount} VMs (est.)` : `~${vmCount} VMs`,
            label: `${vmCount} CEF forwarder VM${vmCount === 1 ? '' : 's'}`,
            docUrl: FIREWALL_SIZING_DOC_URL,
            docLabel: 'CEF via AMA sizing guidance',
            recommendedVmSize: RECOMMENDED_FORWARDER_VM_SIZE,
            loadBalancerRecommended: vmCount >= 3,
            isDefault: normalized.isDefault
        };
    }

    if (type === 'log_selector') {
        const normalized = normalizeSizingValues('log_selector', values);
        const count = normalized.selectedLogTypes.length;
        const summary = count === 0
            ? 'No log types selected'
            : `${count} log type${count === 1 ? '' : 's'} selected`;
        return {
            type,
            selectedLogTypes: normalized.selectedLogTypes,
            summary,
            badge: summary,
            label: summary,
            docUrl: '',
            docLabel: '',
            isDefault: normalized.isDefault
        };
    }

    return null;
}

function buildSharedPoolOption(poolId = '', pool = {}, snapshot = {}) {
    const values = normalizeSizingValues('windows', {
        servers: pool?.serverCount,
        onPremPercent: pool?.onPremPercent,
        isDefault: pool?.isDefault
    });
    const result = computeSizingResult('windows', values, { populationKind: pool?.kind || 'windows_ama' });
    const memberNames = uniqueIds(pool?.connectorIds).map((connectorId) => snapshot?.solutionNameById?.[connectorId] || connectorId);
    const optionSummary = result
        ? `${result.serverSummaryLabel} · ${result.onPremPercent}% on-prem`
        : 'Sizing needed';

    return {
        poolId,
        values,
        result,
        memberNames,
        summary: optionSummary,
        label: [memberNames.join(', '), optionSummary].filter(Boolean).join(' · ')
    };
}

export function buildCapacitySnapshot(selectedSolutions = [], solutionGroupEntries = {}) {
    const selected = Array.isArray(selectedSolutions) ? selectedSolutions : [];
    const solutionNameById = Object.fromEntries(selected.map((solution) => [solution.id, solution?.name || solution?.id || 'Connector']));
    const metadataById = Object.fromEntries(selected.map((solution) => [solution.id, getConnectorCapacityMetadata(solution)]));
    const persisted = readPersistedPoolState(solutionGroupEntries);
    const persistedState = ensureWindowsConnectorAssignments(selected, solutionGroupEntries, persisted.state, persisted.legacyAmaValues);
    const activeView = buildActivePoolView(selected, persistedState);
    const populationGroups = buildPopulationGroups(selected, activeView.connectorSizing, activeView.serverPools);

    return {
        selectedSolutions: selected,
        solutionGroupEntries,
        solutionNameById,
        metadataById,
        serverPools: activeView.serverPools,
        connectorSizing: activeView.connectorSizing,
        populationGroups,
        persistedState,
        collectorVmZone: normalizeCollectorVmZone(persistedState.collectorVmZone),
        hasCollectorVmZonePreference: Boolean(persistedState.hasCollectorVmZonePreference)
    };
}

export function getSolutionCapacityProfile(solution = {}, snapshot = {}) {
    const metadata = snapshot?.metadataById?.[solution?.id] || getConnectorCapacityMetadata(solution);
    const type = metadata.type;
    if (type === 'none') {
        return {
            type,
            requiresSizing: false,
            hasSavedSizing: false,
            result: null,
            summary: ''
        };
    }

    if (type === 'windows') {
        const assignment = snapshot?.connectorSizing?.[solution.id] || normalizeConnectorAssignment(solution.id, {});
        const pool = assignment?.poolId ? snapshot?.serverPools?.[assignment.poolId] : null;
        const values = pool ? normalizeSizingValues('windows', {
            servers: pool?.serverCount,
            onPremPercent: pool?.onPremPercent,
            isDefault: pool?.isDefault
        }) : null;
        const result = values ? computeSizingResult(type, values, { populationKind: pool?.kind || metadata.populationKind }) : null;
        const poolConnectorIds = uniqueIds(pool?.connectorIds || []);
        const criblIngestion = Boolean(assignment?.criblIngestion);
        const criblIngestionExplicit = Boolean(assignment?.criblIngestionExplicit);
        const sharedWithNames = poolConnectorIds
            .filter((connectorId) => connectorId !== solution.id)
            .map((connectorId) => snapshot?.solutionNameById?.[connectorId] || connectorId);
        const activeGroup = metadata.sharedPopulationGroup
            ? snapshot?.populationGroups?.[metadata.sharedPopulationGroup]
            : null;
        const hasRelationChoice = Boolean(metadata.sharedPopulationGroup && (activeGroup?.connectorIds?.length || 0) > 1);
        const availableSharedPools = hasRelationChoice
            ? (activeGroup?.poolIds || [])
                .map((poolId) => buildSharedPoolOption(poolId, snapshot?.serverPools?.[poolId], snapshot))
                .filter((option) => option.poolId && option.memberNames.some((name) => name !== (solution?.name || solution?.id || '')))
            : [];
        const selectedSharedPoolId = assignment?.poolId && availableSharedPools.some((option) => option.poolId === assignment.poolId)
            ? assignment.poolId
            : availableSharedPools[0]?.poolId || '';
        const draftPool = assignment?.draftPoolId
            ? snapshot?.persistedState?.serverPools?.[assignment.draftPoolId]
            : null;
        const additionalPoolDraft = draftPool ? {
            poolId: assignment.draftPoolId,
            values: normalizeSizingValues('windows', {
                servers: draftPool?.serverCount,
                onPremPercent: draftPool?.onPremPercent,
                isDefault: draftPool?.isDefault
            })
        } : null;
        const relation = metadata.populationKind === 'wec'
            ? 'dedicated'
            : hasRelationChoice
                ? (sharedWithNames.length > 0 ? 'same' : 'additional')
                : 'standalone';
        const ownerSolutionId = poolConnectorIds[0] || solution.id;
        const summary = !result
            ? relation === 'same'
                ? 'Shared sizing needed'
                : 'Sizing needed'
            : relation === 'same' && sharedWithNames.length > 0
                ? `Shared with ${sharedWithNames.join(', ')} · ${result.serverSummaryLabel} · ${result.onPremPercent}% on-prem`
                : result.summary;

        return {
            type,
            requiresSizing: true,
            populationKind: metadata.populationKind,
            sharedPopulationGroup: metadata.sharedPopulationGroup,
            serverCountLabel: metadata.serverCountLabel,
            isShared: sharedWithNames.length > 0,
            isPrimarySharedCard: ownerSolutionId === solution.id,
            sharedOwnerSolutionId: ownerSolutionId,
            sharedOwnerName: snapshot?.solutionNameById?.[ownerSolutionId] || solution?.name || 'Windows sizing',
            hasSavedSizing: Boolean(values && result),
            values: values ? { ...values, criblIngestion, criblIngestionExplicit } : null,
            result,
            criblIngestion,
            summary,
            badgeLabel: result?.badge || '',
            isDefault: Boolean(result?.isDefault),
            poolId: assignment?.poolId || '',
            poolConnectorIds,
            poolConnectorNames: poolConnectorIds.map((connectorId) => snapshot?.solutionNameById?.[connectorId] || connectorId),
            sharedWithNames,
            relation,
            hasRelationChoice,
            availableSharedPools,
            selectedSharedPoolId,
            additionalPoolDraft,
            summaryTag: metadata.populationKind === 'wec'
                ? 'WEC'
                : relation === 'same'
                    ? 'Same servers'
                    : hasRelationChoice
                        ? 'Additional servers'
                        : ''
        };
    }

    const solutionEntry = snapshot?.solutionGroupEntries?.[solution.id] || {};
    const values = solutionEntry?.sizing && typeof solutionEntry.sizing === 'object'
        ? normalizeSizingValues(type, solutionEntry.sizing)
        : null;
    const result = values ? computeSizingResult(type, values) : null;
    const collectorVmZone = normalizeCollectorVmZone(snapshot?.collectorVmZone);
    const criblIngestion = Boolean(values?.criblIngestion);
    return {
        type,
        requiresSizing: true,
        isShared: false,
        isPrimarySharedCard: true,
        hasSavedSizing: Boolean(values && result),
        values,
        result,
        criblIngestion,
        summary: result?.summary || '',
        badgeLabel: result?.badge || '',
        isDefault: Boolean(result?.isDefault),
        relation: 'standalone',
        hasRelationChoice: false,
        populationKind: metadata.populationKind,
        sharedPopulationGroup: metadata.sharedPopulationGroup,
        serverCountLabel: metadata.serverCountLabel,
        collectorVmZone,
        collectorVmZoneLabel: getCollectorVmZoneLabel(collectorVmZone),
        hasCollectorVmZonePreference: Boolean(snapshot?.hasCollectorVmZonePreference),
        ...(type === 'log_selector' ? { logTypes: Array.isArray(solution?.log_types) ? solution.log_types : [] } : {})
    };
}

export function getSizingBadgeText(profile = {}) {
    if (!profile?.requiresSizing) return '';
    if (!profile.hasSavedSizing) {
        return profile.relation === 'same' ? 'Shared sizing' : 'Sizing needed';
    }
    if (profile.relation === 'same') {
        return 'Shared sizing';
    }
    return profile.isDefault ? 'Default sizing' : 'Sizing saved';
}

export function getSizingBadgeTone(profile = {}) {
    if (!profile?.requiresSizing) return '';
    if (!profile.hasSavedSizing) return 'pending';
    if (profile.isDefault) return 'default';
    return 'saved';
}

export function getSizingResultMessages(type = 'none', values = {}, options = {}) {
    const validation = validateSizingDraft(type, values);
    const result = validation.isValid ? computeSizingResult(type, values, options) : null;
    return {
        ...validation,
        result
    };
}

export function getSizingDetailLines(profile = {}) {
    if (!profile?.result) return [];

    if (profile.type === 'windows') {
        if (profile.criblIngestion) {
            return [
                `Scope: ${profile.result.serverDisplayLabel}`,
                `Mix: ${formatNumber(profile.result.onPremServers)} on-prem · ${formatNumber(profile.result.azureServers)} Azure`,
                'Cribl handles log collection — no collector VMs needed'
            ];
        }
        return [
            `Estimated: ${profile.result.label}`,
            `(${profile.result.reasoning})`,
            `Scope: ${profile.result.serverDisplayLabel}`,
            `Mix: ${formatNumber(profile.result.onPremServers)} on-prem · ${formatNumber(profile.result.azureServers)} Azure`,
            `VM size: ${profile.result.recommendedVmSize} recommended`
        ];
    }

    if (profile.type === 'linux') {
        if (profile.criblIngestion) {
            return [
                `EPS: ${formatNumber(profile.result.eps)} — Cribl handles log collection`,
                'No AMA collector VMs needed'
            ];
        }
        return [
            `Scope: ${profile.result.serverDisplayLabel}`,
            `EPS: ${formatNumber(profile.result.eps)}`,
            `Mix: ${formatNumber(profile.result.onPremServers)} on-prem · ${formatNumber(profile.result.azureServers)} Azure`,
            `Estimated DCR load: ${formatNumber(profile.result.requestsPerMinute)} req/min`
        ];
    }

    if (profile.type === 'firewall') {
        const lines = [
            `Estimated: ${profile.result.label}`,
            `(${profile.result.reasoning})`
        ];
        if (profile.criblIngestion) {
            lines.push('Cribl handles log collection — no collector VMs needed');
        } else {
            lines.push(`Collector VMs: ${profile.collectorVmZoneLabel || getCollectorVmZoneLabel(profile.collectorVmZone)}`);
            lines.push(`VM size: ${profile.result.recommendedVmSize} recommended`);
        }
        if (profile.result.loadBalancerRecommended) {
            lines.push('Recommend a load balancer when 3 or more forwarder VMs are required.');
        }
        return lines;
    }

    return [];
}


function upsertSharedCapacityEntry(solutionGroupEntries = {}, state = createEmptyPoolState()) {
    const nextEntries = {
        ...(solutionGroupEntries || {})
    };
    const hasWindowsState = Object.keys(state?.serverPools || {}).length > 0 || Object.keys(state?.connectorSizing || {}).length > 0;
    const hasCollectorVmZonePreference = Boolean(state?.hasCollectorVmZonePreference);

    if (!hasWindowsState && !hasCollectorVmZonePreference) {
        delete nextEntries[WINDOWS_SHARED_CAPACITY_KEY];
        return nextEntries;
    }

    const existingEntry = nextEntries?.[WINDOWS_SHARED_CAPACITY_KEY] && typeof nextEntries[WINDOWS_SHARED_CAPACITY_KEY] === 'object'
        ? nextEntries[WINDOWS_SHARED_CAPACITY_KEY]
        : {};
    nextEntries[WINDOWS_SHARED_CAPACITY_KEY] = {
        ...existingEntry,
        solutionId: WINDOWS_SHARED_CAPACITY_KEY,
        solutionName: 'Windows server pools',
        sizing: {
            serverPools: Object.fromEntries(Object.entries(state?.serverPools || {}).map(([poolId, pool]) => [
                poolId,
                {
                    kind: normalizePoolKind(pool?.kind),
                    serverCount: sanitizeCount(pool?.serverCount),
                    onPremPercent: clampPercent(pool?.onPremPercent),
                    connectorIds: uniqueIds(pool?.connectorIds),
                    isDefault: Boolean(pool?.isDefault)
                }
            ])),
            connectorSizing: Object.fromEntries(Object.entries(state?.connectorSizing || {}).map(([solutionId, assignment]) => [
                solutionId,
                {
                    poolId: String(assignment?.poolId || '').trim(),
                    relation: normalizeId(assignment?.relation),
                    draftPoolId: String(assignment?.draftPoolId || '').trim(),
                    criblIngestion: Boolean(assignment?.criblIngestion),
                    criblIngestionExplicit: Boolean(assignment?.criblIngestionExplicit)
                }
            ])),
            nextPoolSequence: Math.max(1, sanitizeCount(state?.nextPoolSequence) || 1),
            ...(hasCollectorVmZonePreference
                ? { collectorVmZone: normalizeCollectorVmZone(state?.collectorVmZone) }
                : {})
        }
    };
    return nextEntries;
}

export function clearCriblIngestionEntries(solutionGroupEntries = {}) {
    const nextEntries = cloneJson(solutionGroupEntries) || {};
    let changed = false;

    Object.values(nextEntries).forEach((entry) => {
        if (entry?.sizing && typeof entry.sizing === 'object') {
            if (Object.prototype.hasOwnProperty.call(entry.sizing, 'criblIngestion')) {
                delete entry.sizing.criblIngestion;
                changed = true;
            }
            if (Object.prototype.hasOwnProperty.call(entry.sizing, 'criblIngestionExplicit')) {
                delete entry.sizing.criblIngestionExplicit;
                changed = true;
            }
        }
    });

    const sharedState = readPersistedPoolState(nextEntries).state;
    Object.values(sharedState?.connectorSizing || {}).forEach((assignment) => {
        if (assignment && Object.prototype.hasOwnProperty.call(assignment, 'criblIngestion')) {
            delete assignment.criblIngestion;
            changed = true;
        }
        if (assignment && Object.prototype.hasOwnProperty.call(assignment, 'criblIngestionExplicit')) {
            delete assignment.criblIngestionExplicit;
            changed = true;
        }
    });

    return changed ? upsertSharedCapacityEntry(nextEntries, sharedState) : nextEntries;
}

export function updateConnectorCapacityEntries(solutionGroupEntries = {}, solution = {}, values = {}, {
    selectedSolutions = [],
    relation = '',
    targetPoolId = ''
} = {}) {
    const metadata = getConnectorCapacityMetadata(solution);
    const nextEntries = {
        ...(solutionGroupEntries || {})
    };

    if (!solution?.id || metadata.type === 'none') {
        return nextEntries;
    }

    const sizingMessages = getSizingResultMessages(metadata.type, values, { populationKind: metadata.populationKind });
    if (!sizingMessages.isValid || !sizingMessages.result) {
        return nextEntries;
    }

    if (metadata.type === 'firewall' || metadata.type === 'linux' || metadata.type === 'log_selector') {
        const existingEntry = nextEntries?.[solution.id] && typeof nextEntries[solution.id] === 'object'
            ? nextEntries[solution.id]
            : {};
        nextEntries[solution.id] = {
            ...existingEntry,
            solutionId: solution.id,
            solutionName: solution.name || solution.id,
            sizing: metadata.type === 'linux'
                ? {
                    servers: sizingMessages.result.servers,
                    onPremPercent: sizingMessages.result.onPremPercent,
                    criblIngestion: Boolean(values?.criblIngestion),
                    criblIngestionExplicit: Boolean(values?.criblIngestionExplicit),
                    isDefault: Boolean(values?.isDefault)
                }
                : metadata.type === 'log_selector'
                    ? {
                        selectedLogTypes: Array.isArray(values?.selectedLogTypes) ? [...values.selectedLogTypes] : [],
                        isDefault: Boolean(values?.isDefault)
                    }
                    : {
                        eps: sizingMessages.result.eps,
                        criblIngestion: Boolean(values?.criblIngestion),
                        criblIngestionExplicit: Boolean(values?.criblIngestionExplicit),
                        isDefault: Boolean(values?.isDefault)
                    }
        };

        const sharedState = cloneJson(readPersistedPoolState(nextEntries).state) || createEmptyPoolState();
        if (metadata.type === 'firewall' && Object.prototype.hasOwnProperty.call(values || {}, 'collectorVmZone')) {
            sharedState.collectorVmZone = normalizeCollectorVmZone(values?.collectorVmZone);
            sharedState.hasCollectorVmZonePreference = true;
        }
        return upsertSharedCapacityEntry(nextEntries, sharedState);
    }

    const snapshot = buildCapacitySnapshot(selectedSolutions, solutionGroupEntries);
    const profile = getSolutionCapacityProfile(solution, snapshot);
    const state = cloneJson(snapshot?.persistedState) || createEmptyPoolState();
    const normalizedValues = normalizeSizingValues('windows', values);
    const desiredKind = normalizePoolKind(metadata.populationKind || profile.populationKind || 'windows');
    const currentAssignment = normalizeConnectorAssignment(solution.id, state?.connectorSizing?.[solution.id] || {});
    const currentPoolIsDedicated = Array.isArray(profile?.poolConnectorIds)
        && profile.poolConnectorIds.length === 1
        && profile.poolConnectorIds[0] === solution.id;
    const wantsSharedPool = desiredKind === 'windows_ama' && profile?.hasRelationChoice && normalizeId(relation) !== 'additional';

    if (wantsSharedPool) {
        const allowedPoolIds = uniqueIds((profile?.availableSharedPools || []).map((option) => option.poolId));
        let resolvedPoolId = allowedPoolIds.includes(String(targetPoolId || '').trim())
            ? String(targetPoolId || '').trim()
            : profile?.selectedSharedPoolId || allowedPoolIds[0] || currentAssignment.poolId;

        if (!resolvedPoolId || !state?.serverPools?.[resolvedPoolId]) {
            resolvedPoolId = allocatePoolId(state, desiredKind);
        }

        state.serverPools[resolvedPoolId] = createServerPool(resolvedPoolId, {
            ...(state?.serverPools?.[resolvedPoolId] || {}),
            kind: desiredKind,
            serverCount: normalizedValues.servers,
            onPremPercent: normalizedValues.onPremPercent,
            isDefault: Boolean(normalizedValues.isDefault)
        });
        state.connectorSizing[solution.id] = normalizeConnectorAssignment(solution.id, {
            poolId: resolvedPoolId,
            relation: 'same',
            draftPoolId: currentPoolIsDedicated && currentAssignment.poolId && currentAssignment.poolId !== resolvedPoolId
                ? currentAssignment.poolId
                : (currentAssignment.draftPoolId && currentAssignment.draftPoolId !== resolvedPoolId
                    ? currentAssignment.draftPoolId
                    : ''),
            criblIngestion: Boolean(values?.criblIngestion),
            criblIngestionExplicit: Boolean(values?.criblIngestionExplicit)
        });
    } else {
        let resolvedPoolId = currentPoolIsDedicated && currentAssignment.poolId
            ? currentAssignment.poolId
            : '';
        if (!resolvedPoolId && currentAssignment.draftPoolId && state?.serverPools?.[currentAssignment.draftPoolId]) {
            resolvedPoolId = currentAssignment.draftPoolId;
        }
        if (!resolvedPoolId || !state?.serverPools?.[resolvedPoolId]) {
            resolvedPoolId = allocatePoolId(state, desiredKind);
        }

        state.serverPools[resolvedPoolId] = createServerPool(resolvedPoolId, {
            ...(state?.serverPools?.[resolvedPoolId] || {}),
            kind: desiredKind,
            serverCount: normalizedValues.servers,
            onPremPercent: normalizedValues.onPremPercent,
            isDefault: Boolean(normalizedValues.isDefault)
        });
        state.connectorSizing[solution.id] = normalizeConnectorAssignment(solution.id, {
            poolId: resolvedPoolId,
            relation: profile?.hasRelationChoice && desiredKind === 'windows_ama'
                ? 'additional'
                : metadata.populationKind === 'wec'
                    ? 'dedicated'
                    : 'standalone',
            draftPoolId: '',
            criblIngestion: Boolean(values?.criblIngestion),
            criblIngestionExplicit: Boolean(values?.criblIngestionExplicit)
        });
    }

    rebuildPoolMembership(state);
    pruneUnusedPools(state);
    return upsertSharedCapacityEntry(nextEntries, state);
}

export function applySizingToTaskContent({ taskName = '', description = '', solution = {}, profile = null } = {}) {
    if (!profile?.hasSavedSizing || !profile.result) {
        return {
            taskName,
            description
        };
    }

    const name = String(taskName || '').trim();
    const detail = String(description || '').trim();
    const next = {
        taskName: name,
        description: detail
    };

    if (profile.type === 'windows') {
        const populationKind = normalizePoolKind(profile.populationKind || profile.result?.populationKind || 'windows');
        const serverLabel = populationKind === 'wec'
            ? `${formatNumber(profile.result.servers)} WEC server${profile.result.servers === 1 ? '' : 's'}`
            : `${formatNumber(profile.result.servers)} Windows server${profile.result.servers === 1 ? '' : 's'}`;
        const onPremLabel = `${formatNumber(profile.result.onPremServers)} on-prem`;
        const summary = `${serverLabel} (${profile.result.onPremPercent}% on-prem)`;

        if (populationKind === 'wec') {
            if (/WEC servers?/i.test(next.taskName)) {
                next.taskName = next.taskName.replace(/WEC servers?/i, serverLabel);
            }
        } else if (/target Windows hosts/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/target Windows hosts/i, `${serverLabel}`);
        } else if (/in-scope Windows hosts/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/in-scope Windows hosts/i, `${serverLabel}`);
        } else if (/DNS server scope/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/DNS server scope/i, `${serverLabel} scope`);
        } else if (/assign servers/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/assign servers/i, `assign ${formatNumber(profile.result.servers)} servers`);
        } else if (/non-Azure Windows hosts/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/non-Azure Windows hosts/i, `${onPremLabel} Windows hosts`);
        } else if (/non-Azure hosts/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/non-Azure hosts/i, `${onPremLabel} hosts`);
        } else if (/Windows hosts/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/Windows hosts/i, serverLabel);
        }

        const sizingNote = profile.criblIngestion
            ? `Sizing assumption: ${summary}. Cribl handles ingestion, so no collector VMs are required.`
            : (() => {
                const collectionVmLabel = populationKind === 'wec' ? 'WEC collection VM' : 'Windows collection VM';
                return `Sizing assumption: ${summary}. Estimated ${profile.result.vmCount} ${collectionVmLabel}${profile.result.vmCount === 1 ? '' : 's'}.`;
            })();
        if (!next.description) {
            next.description = sizingNote;
        } else if (!/Sizing assumption:/i.test(next.description)) {
            next.description = `${next.description} ${sizingNote}`;
        }

        return next;
    }

    if (profile.type === 'linux') {
        const serverLabel = `${formatNumber(profile.result.servers)} Linux server${profile.result.servers === 1 ? '' : 's'}`;
        const splitLabel = `${formatNumber(profile.result.onPremServers)} on-prem · ${formatNumber(profile.result.azureServers)} Azure`;
        if (!next.description) {
            next.description = `Sizing assumption: ${serverLabel} (${splitLabel}) in scope for shared Linux DCR planning.`;
        } else if (!/Sizing assumption:/i.test(next.description)) {
            next.description = `${next.description} Sizing assumption: ${serverLabel} (${splitLabel}) in scope for shared Linux DCR planning.`;
        }

        return next;
    }

    if (profile.type === 'firewall') {
        const epsLabel = `${formatNumber(profile.result.eps)} EPS`;
        const vmLabel = `${profile.result.vmCount} forwarder VM${profile.result.vmCount === 1 ? '' : 's'}`;
        if (!profile.criblIngestion && /forwarder/i.test(next.taskName)) {
            next.taskName = next.taskName.replace(/the forwarder/i, `${vmLabel}`).replace(/forwarder/i, vmLabel);
        }

        const sizingNote = profile.criblIngestion
            ? `Sizing assumption: ${epsLabel}. Cribl handles ingestion, so no collector VMs are required.`
            : `Sizing assumption: ${epsLabel}. Estimated ${vmLabel} (${profile.result.recommendedVmSize}).`;
        if (!next.description) {
            next.description = sizingNote;
        } else if (!/Sizing assumption:/i.test(next.description)) {
            next.description = `${next.description} ${sizingNote}`;
        }

        return next;
    }

    return next;
}
