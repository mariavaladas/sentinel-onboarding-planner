import { calculatePriorityScore, getPhase } from './scoring.js';

export let solutionsData = null;
export const selectedCategories = new Set();
export const selectedSolutions = new Set();
export const selectedVendors = new Set(['azure', 'microsoft365']);
export const connectedSolutionIds = new Set();

const CONNECTED_SOLUTIONS_STORAGE_KEY = 'sentinelPlanner.connectedSolutionIds';
const connectorKindToSolutionIds = {
    azureactivedirectory: ['microsoft-entra-id'],
    office365: ['microsoft-365'],
    microsoftthreatprotection: ['defender-xdr'],
    microsoftdefenderxdr: ['defender-xdr'],
    microsoftdefenderforendpoint: ['microsoft-defender-for-endpoint'],
    microsoftdefenderforidentity: ['microsoft-defender-for-identity'],
    microsoftcloudappsecurity: ['defender-for-cloud-apps'],
    microsoftdefenderforcloudapps: ['defender-for-cloud-apps'],
    microsoftdefenderforoffice365: ['defender-for-office-365'],
    windowsforwardedevents: ['windows-forwarded-events', 'windows-security-events'],
    securityevents: ['windows-security-events'],
    syslog: ['linux-syslog'],
    amazonwebservicesaws: ['aws'],
    awscloudtrail: ['aws'],
    gcpauditlogs: ['google-cloud-platform-audit-logs'],
    crowdstrikefalcon: ['crowdstrike'],
    crowdstrike: ['crowdstrike'],
    checkpoint: ['checkpoint'],
    fortinet: ['fortinet-forti-gate-next-generation-firewall-connector-for-microsoft-sentinel'],
    okta: ['okta'],
    zscaler: ['zscaler'],
    cyberark: ['cyberark'],
    ciscoasa: ['cisco-asa-2'],
    ciscoumbrella: ['cisco-umbrella'],
    ciscoise: ['cisco-ise'],
    pingone: ['ping-one'],
    pingfederate: ['ping-federate'],
    trendmicrovisionone: ['trend-micro-vision-one'],
    trendmicrodeepsecurity: ['trend-micro-deep-security']
};

const solutionDataUrls = [
    new URL('../../data/solutions.json', import.meta.url),
    '../../data/solutions.json',
    '../data/solutions.json',
    'data/solutions.json',
    './data/solutions.json'
];

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

function setCatalogInfo(text) {
    const catalogInfo = document.getElementById('catalogInfo');
    if (catalogInfo) {
        catalogInfo.textContent = text;
    }
}

function getAllSolutions() {
    return Object.values(solutionsData?.categories || {}).flatMap((category) => category.solutions || []);
}

function createLogoBadge(src, altText, fallbackText) {
    const badge = document.createElement('div');
    badge.className = 'solution-item-logo';

    const image = document.createElement('img');
    image.src = src;
    image.alt = altText;
    image.addEventListener('error', () => {
        if (badge.contains(image)) {
            badge.removeChild(image);
        }
        badge.textContent = fallbackText;
    });

    badge.appendChild(image);
    return badge;
}

function createResultLogo(src, altText, fallbackText) {
    const badge = document.createElement('div');
    badge.className = 'result-card-logo';

    const image = document.createElement('img');
    image.src = src;
    image.alt = altText;
    image.addEventListener('error', () => {
        if (badge.contains(image)) {
            badge.removeChild(image);
        }
        badge.textContent = fallbackText;
    });

    badge.appendChild(image);
    return badge;
}

const solutionVersionCache = new Map();

function getSolutionFolderName(solution) {
    const githubUrl = solution?.github_url || '';
    const match = githubUrl.match(/\/Solutions\/([^/?#]+)/i);

    if (match?.[1]) {
        return decodeURIComponent(match[1]);
    }

    return solution?.name || '';
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

function isVendorRelevantToSolution(vendor, solution) {
    const name = (solution.name || '').toLowerCase();
    const tags = (solution.tags || []).map(t => t.toLowerCase());

    switch (vendor) {
        case 'azure':
            return (tags.includes('azure') && (name.includes('azure') || tags.some(t => ['activity', 'ad', 'firewall', 'storage', 'virtual', 'devops', 'databricks'].some(keyword => t.includes(keyword)))))
                || (name.includes('azure') && !name.includes('sentinel'));
        case 'microsoft365':
            return tags.includes('microsoft 365') || tags.includes('m365')
                || name.includes('exchange') || name.includes('sharepoint') || name.includes('teams')
                || name.includes('office') || name.includes('defender for office');
        case 'windows':
            return tags.includes('windows') || name.toLowerCase().includes('windows');
        case 'linux':
            return tags.includes('linux') || name.toLowerCase().includes('linux');
        case 'aws':
            return tags.includes('aws') || name.toLowerCase().includes('aws');
        case 'gcp':
            return tags.includes('gcp') || tags.includes('google') || name.toLowerCase().includes('google');
        case 'crowdstrike':
            return name.toLowerCase().includes('crowdstrike') || tags.some(t => t.includes('crowdstrike'));
        case 'paloalto':
            return name.toLowerCase().includes('palo alto') || name.toLowerCase().includes('paloalto') || tags.some(t => t.toLowerCase().includes('palo'));
        case 'cisco':
            return name.toLowerCase().includes('cisco') || tags.some(t => t.toLowerCase().includes('cisco'));
        case 'checkpoint':
            return name.toLowerCase().includes('check point') || name.toLowerCase().includes('checkpoint') || tags.some(t => t.toLowerCase().includes('checkpoint'));
        case 'fortinet':
            return name.toLowerCase().includes('fortinet') || tags.some(t => t.toLowerCase().includes('fortinet'));
        case 'zscaler':
            return name.toLowerCase().includes('zscaler') || tags.some(t => t.toLowerCase().includes('zscaler'));
        case 'okta':
            return name.toLowerCase().includes('okta') || tags.some(t => t.toLowerCase().includes('okta'));
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
            return name.includes('extrahop') || tags.some((tag) => tag.includes('extrahop'));
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
            return name.includes('cyberark') || tags.some((tag) => tag.includes('cyberark'));
        case 'trendmicro':
            return name.includes('trend') || tags.some((tag) => tag.includes('trend'));
        default:
            return false;
    }
}

function hasMinimumContent(solution) {
    const connectors = Number(solution.connectors) || 0;
    const analytics = Number(solution.analytics) || 0;
    const workbooks = Number(solution.workbooks) || 0;
    const playbooks = Number(solution.playbooks) || 0;
    return connectors >= 1 && (analytics >= 1 || workbooks >= 1 || playbooks >= 2);
}

function getPreselectedSolutionIds() {
    const preSelectedIds = new Set();
    const selectedVendorsList = Array.from(selectedVendors);

    if (selectedVendorsList.length === 0) {
        return preSelectedIds;
    }

    Object.values(solutionsData?.categories || {}).forEach((category) => {
        (category?.solutions || []).forEach((solution) => {
            if (!hasMinimumContent(solution)) {
                return;
            }

            const matchesVendor = selectedVendorsList.some((vendor) => {
                return isVendorRelevantToSolution(vendor, solution);
            });

            if (matchesVendor) {
                preSelectedIds.add(solution.id);
            }
        });
    });

    return preSelectedIds;
}

function normalizeLookupValue(value = '') {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getConnectorLookupValues(connector = {}) {
    const properties = connector?.properties || {};
    const uiConfig = properties?.connectorUiConfig || {};
    const dataTypes = properties?.dataTypes ? Object.keys(properties.dataTypes) : [];

    return [
        connector?.kind,
        connector?.name,
        properties?.friendlyName,
        properties?.connectorName,
        uiConfig?.title,
        uiConfig?.id,
        ...dataTypes
    ].filter(Boolean);
}

function canUseLocalStorage() {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
        return false;
    }
}

function persistConnectedSolutionIds() {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(CONNECTED_SOLUTIONS_STORAGE_KEY, JSON.stringify(Array.from(connectedSolutionIds)));
    } catch (error) {
        console.warn('Unable to persist connected solutions:', error);
    }
}

function hydrateConnectedSolutionIds() {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        const storedValue = window.localStorage.getItem(CONNECTED_SOLUTIONS_STORAGE_KEY);
        const parsedIds = storedValue ? JSON.parse(storedValue) : [];
        if (!Array.isArray(parsedIds)) {
            return;
        }

        parsedIds.filter(Boolean).forEach((solutionId) => connectedSolutionIds.add(solutionId));
    } catch (error) {
        console.warn('Unable to restore connected solutions:', error);
    }
}

function resolveConnectedSolutionIds(connectors = []) {
    const allSolutions = getAllSolutions();
    const availableIds = new Set(allSolutions.map((solution) => solution.id));
    const resolvedIds = new Set();

    connectors.forEach((connector) => {
        const lookupValues = getConnectorLookupValues(connector).map(normalizeLookupValue).filter(Boolean);

        lookupValues.forEach((lookupValue) => {
            (connectorKindToSolutionIds[lookupValue] || []).forEach((solutionId) => {
                if (availableIds.has(solutionId)) {
                    resolvedIds.add(solutionId);
                }
            });

            allSolutions.forEach((solution) => {
                const normalizedId = normalizeLookupValue(solution.id);
                const normalizedName = normalizeLookupValue(solution.name);
                const normalizedTags = (solution.tags || []).map(normalizeLookupValue);

                if (lookupValue === normalizedId || lookupValue === normalizedName || normalizedTags.includes(lookupValue)) {
                    resolvedIds.add(solution.id);
                }
            });
        });
    });

    return resolvedIds;
}

export function getConnectedSolutionIds() {
    return new Set(connectedSolutionIds);
}

export function setConnectedSolutionIds(solutionIds = []) {
    connectedSolutionIds.clear();
    solutionIds.filter(Boolean).forEach((solutionId) => connectedSolutionIds.add(solutionId));
    persistConnectedSolutionIds();
    updateStep3Button();

    if (document.getElementById('step3')?.classList.contains('active')) {
        initStep3();
    }

    return getConnectedSolutionIds();
}

export function setConnectedSolutionsFromWorkspace(connectors = []) {
    return setConnectedSolutionIds(Array.from(resolveConnectedSolutionIds(connectors)));
}

// Don't hydrate stale connected state from localStorage on startup.
// Connected state should only come from an actual workspace connection in the current session.

function createMetric(value, label) {
    const metric = document.createElement('div');
    metric.className = 'metric';

    const metricValue = document.createElement('div');
    metricValue.className = 'metric-value';
    metricValue.textContent = `${value}`;

    const metricLabel = document.createElement('div');
    metricLabel.className = 'metric-label';
    metricLabel.textContent = label;

    metric.append(metricValue, metricLabel);
    return metric;
}

function createStatCard(value, label) {
    const card = document.createElement('div');
    card.className = 'stat-card';

    const number = document.createElement('div');
    number.className = 'stat-number';
    number.textContent = `${value}`;

    const text = document.createElement('div');
    text.className = 'stat-label';
    text.textContent = label;

    card.append(number, text);
    return card;
}

function createEmptyState(message) {
    const state = document.createElement('div');
    state.className = 'planner-view';

    const text = document.createElement('p');
    text.className = 'helper-text';
    text.textContent = message;

    state.appendChild(text);
    return state;
}

function formatSolutionLabel(value = '') {
    return String(value)
        .split(/[-_]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getSolutionHighlights(solution) {
    const highlights = [];

    if (solution?.onboarding?.setup_summary) {
        highlights.push(solution.onboarding.setup_summary);
    }

    const detectionAreas = solution?.value_scoring?.detection_areas || [];
    if (detectionAreas.length > 0) {
        highlights.push(`Coverage focus: ${detectionAreas.slice(0, 3).map(formatSolutionLabel).join(', ')}`);
    } else if (solution?.export_metadata?.integrates_with?.length) {
        highlights.push(`Integrates with ${solution.export_metadata.integrates_with.slice(0, 3).map(formatSolutionLabel).join(', ')}`);
    } else if (solution?.description) {
        highlights.push(solution.description);
    }

    return highlights.slice(0, 2);
}

function createHighlightsSection(solution) {
    const highlights = getSolutionHighlights(solution);
    if (highlights.length === 0) {
        return null;
    }

    const section = document.createElement('div');
    section.className = 'solution-item-highlights';

    highlights.forEach((highlight) => {
        const line = document.createElement('p');
        line.className = 'solution-item-highlight';
        line.textContent = highlight;
        section.appendChild(line);
    });

    return section;
}

function syncSolutionCardState(solutionCard, solutionId) {
    if (!(solutionCard instanceof Element)) {
        return;
    }

    const isSelected = selectedSolutions.has(solutionId);
    const isConnected = connectedSolutionIds.has(solutionId);
    const isIncluded = isSelected || isConnected;
    const checkbox = solutionCard.querySelector('.solution-item-check');
    const solutionName = solutionCard.dataset.name || 'solution';

    solutionCard.classList.toggle('selected', isSelected);
    solutionCard.classList.toggle('already-connected', isConnected);

    if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = isIncluded;
        checkbox.disabled = isConnected;
        checkbox.setAttribute('aria-label', `${isIncluded ? 'Included' : 'Include'} ${solutionName} in the onboarding plan`);
        checkbox.title = isConnected ? `${solutionName} is already connected in the workspace` : '';
    }
}

function createSolutionItem(solution, recommendedIds = new Set()) {
    const item = document.createElement('article');
    item.className = 'solution-item';
    item.dataset.id = solution.id;
    item.dataset.name = solution.name;

    const isRecommended = recommendedIds.has(solution.id);
    if (isRecommended) {
        item.classList.add('recommended');

        const recommendedStar = document.createElement('span');
        recommendedStar.className = 'solution-item-corner-star';
        recommendedStar.setAttribute('aria-hidden', 'true');
        recommendedStar.textContent = '★';
        item.appendChild(recommendedStar);
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

    if (isRecommended) {
        const recommendedText = document.createElement('span');
        recommendedText.className = 'solution-item-recommended-inline';
        recommendedText.textContent = '— Recommended';
        name.appendChild(recommendedText);
    }

    if (connectedSolutionIds.has(solution.id)) {
        const connBadge = document.createElement('span');
        connBadge.className = 'existing-connector-badge';
        connBadge.textContent = '✓ Connected';
        name.appendChild(connBadge);
    }

    const meta = document.createElement('div');
    meta.className = 'solution-item-meta';
    meta.textContent = `${solution.connectors || 0} connectors · ${solution.analytics} rules · ${solution.workbooks} workbooks · ${solution.playbooks} playbooks`;

    const tags = document.createElement('div');
    tags.className = 'solution-tags';

    if (solution.is1P) {
        const featuredTag = document.createElement('span');
        featuredTag.className = 'solution-tag solution-tag-featured';
        featuredTag.textContent = '★ FEATURED';
        tags.appendChild(featuredTag);
    }

    const versionBadge = document.createElement('div');
    versionBadge.className = 'version-badge';
    versionBadge.dataset.solution = solution.id;

    const complexity = Number(solution?.value_scoring?.complexity_level) || 0;
    const diffLabel = solution?.onboarding?.difficulty
        || (complexity <= 1 ? 'Easy' : complexity <= 2 ? 'Moderate' : 'Hard');
    const diffClass = diffLabel.toLowerCase();
    const hours = Number(solution?.value_scoring?.setup_hours) || 0;
    const hoursText = hours > 0 ? ` · ~${hours}h` : '';

    const badges = document.createElement('div');
    badges.className = 'solution-item-badges solution-item-footer';

    if (complexity > 0 || solution?.onboarding?.difficulty) {
        const diffBadge = document.createElement('span');
        diffBadge.className = `solution-difficulty-badge difficulty-${diffClass}`;
        diffBadge.textContent = `${diffLabel}${hoursText}`;
        badges.appendChild(diffBadge);
    }

    const ownerRec = solution?.planner?.owner_recommended;
    if (ownerRec) {
        const ownerBadge = document.createElement('span');
        ownerBadge.className = 'solution-owner-badge';
        ownerBadge.textContent = ownerRec;
        badges.appendChild(ownerBadge);
    }

    const highlights = createHighlightsSection(solution);

    header.appendChild(name);
    info.append(header, meta);

    if (tags.childElementCount > 0) {
        info.appendChild(tags);
    }

    info.appendChild(versionBadge);

    if (highlights) {
        info.appendChild(highlights);
    }

    if (badges.childElementCount > 0) {
        info.appendChild(badges);
    }

    main.append(createLogoBadge(solution.logo, solution.name, '🔹'), info);

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'solution-item-check';
    check.addEventListener('click', (event) => event.stopPropagation());
    check.addEventListener('change', () => toggleSolution(item, solution.id));

    item.addEventListener('click', (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('.solution-item-check')) {
            return;
        }

        toggleSolution(item, solution.id);
    });

    item.append(main, check);
    syncSolutionCardState(item, solution.id);
    return item;
}

function createSolutionPanel(category, recommendedIds) {
    const panel = document.createElement('div');
    panel.className = 'solution-panel';

    const header = document.createElement('div');
    header.className = 'solution-panel-header';

    const icon = document.createElement('span');
    icon.className = 'solution-panel-icon';
    icon.textContent = category.icon;

    const title = document.createElement('h3');
    title.textContent = category.label;

    const count = document.createElement('span');
    count.className = 'solution-count';
    count.textContent = `(${(category.solutions || []).length})`;
    title.append(' ', count);

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '▼';

    header.append(icon, title, chevron);
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'true');

    const list = document.createElement('div');
    list.className = 'solution-list';

    const sortedSolutions = [...(category.solutions || [])].sort((left, right) => {
        const leftSelected = recommendedIds.has(left.id) ? 0 : 1;
        const rightSelected = recommendedIds.has(right.id) ? 0 : 1;
        if (leftSelected !== rightSelected) {
            return leftSelected - rightSelected;
        }
        return left.name.localeCompare(right.name);
    });

    sortedSolutions.forEach((solution) => {
        list.appendChild(createSolutionItem(solution, recommendedIds));
    });

    function toggleCollapse() {
        const isCollapsed = panel.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', String(!isCollapsed));
    }

    header.addEventListener('click', toggleCollapse);
    header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapse();
        }
    });

    panel.append(header, list);
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

            solutionsData = await response.json();
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
}

export function initStep3() {
    const panelsContainer = document.getElementById('solutionPanels');
    if (!solutionsData || !panelsContainer) {
        return;
    }

    panelsContainer.replaceChildren();
    selectedCategories.clear();
    Object.keys(solutionsData?.categories || {}).forEach((category) => selectedCategories.add(category));

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
        if (category) {
            panelsContainer.appendChild(createSolutionPanel(category, recommendedIds));
            visibleSolutions.push(...(category.solutions || []));
        }
    });

    void fetchAndDisplayVersions(visibleSolutions);
    updateStep3Button();
}

export function toggleSolution(element, solutionId) {
    const solutionCard = element instanceof Element
        ? element
        : document.querySelector(`.solution-item[data-id="${solutionId}"]`);

    if (connectedSolutionIds.has(solutionId)) {
        syncSolutionCardState(solutionCard, solutionId);
        updateStep3Button();
        return;
    }

    if (selectedSolutions.has(solutionId)) {
        selectedSolutions.delete(solutionId);
    } else {
        selectedSolutions.add(solutionId);
    }

    syncSolutionCardState(solutionCard, solutionId);
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

export function renderSummaryStats(solutions = []) {
    const statsContainer = document.getElementById('summaryStats');
    if (!statsContainer) {
        return;
    }

    statsContainer.replaceChildren();

    const totals = solutions.reduce((stats, solution) => {
        stats.connectors += Number(solution.connectors) || 0;
        stats.analytics += Number(solution.analytics) || 0;
        stats.workbooks += Number(solution.workbooks) || 0;
        stats.playbooks += Number(solution.playbooks) || 0;
        return stats;
    }, { connectors: 0, analytics: 0, workbooks: 0, playbooks: 0 });

    [
        [solutions.length, 'Solutions'],
        [totals.connectors, 'Connectors'],
        [totals.analytics, 'Analytics Rules'],
        [totals.workbooks, 'Workbooks'],
        [totals.playbooks, 'Playbooks']
    ].forEach(([value, label]) => {
        statsContainer.appendChild(createStatCard(value, label));
    });
}

export function renderResultsGrid(solutions = []) {
    const resultsContainer = document.getElementById('resultsGrid');
    if (!resultsContainer) {
        return;
    }

    resultsContainer.replaceChildren();

    if (solutions.length === 0) {
        resultsContainer.appendChild(createEmptyState('No solutions are selected yet.'));
        return;
    }

    solutions.forEach((solution) => {
        const card = document.createElement('article');
        card.className = 'result-card';

        const header = document.createElement('div');
        header.className = 'result-card-header';

        const titleGroup = document.createElement('div');

        const title = document.createElement('div');
        title.className = 'result-card-title';
        title.textContent = solution.name;

        const meta = document.createElement('p');
        meta.className = 'result-card-meta';
        meta.textContent = `Priority ${calculatePriorityScore(solution)} · ${getPhase(solution)}`;

        titleGroup.append(title, meta);
        header.append(createResultLogo(solution.logo, solution.name, '🔹'), titleGroup);

        const description = document.createElement('p');
        description.className = 'result-card-desc';
        description.textContent = solution.description;

        const metrics = document.createElement('div');
        metrics.className = 'result-card-metrics';
        metrics.append(
            createMetric(solution.connectors, 'Connectors'),
            createMetric(solution.analytics, 'Analytics'),
            createMetric(solution.workbooks, 'Workbooks'),
            createMetric(solution.playbooks, 'Playbooks')
        );

        const link = document.createElement('a');
        link.className = 'result-card-link';
        link.href = solution.github_url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'View solution details';

        card.append(header, description, metrics, link);
        resultsContainer.appendChild(card);
    });
}
