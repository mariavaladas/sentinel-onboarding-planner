import { calculatePriorityScore, getPhase } from './scoring.js';

export let solutionsData = null;
export const selectedCategories = new Set();
export const selectedSolutions = new Set();
export const selectedVendors = new Set(['azure', 'microsoft365']);

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
    pingidentity: ['ping-identity']
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

function getPreselectedSolutionIds() {
    const preSelectedIds = new Set();

    Object.values(solutionsData?.categories || {}).forEach((category) => {
        (category?.solutions || []).forEach((solution) => {
            if (solution.is1P) {
                preSelectedIds.add(solution.id);
            }
        });
    });

    selectedVendors.forEach((vendor) => {
        (vendorToSolutions[vendor] || []).forEach((solutionId) => {
            preSelectedIds.add(solutionId);
        });
    });

    return preSelectedIds;
}

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

function createSolutionItem(solution) {
    const item = document.createElement('div');
    item.className = 'solution-item';
    item.dataset.id = solution.id;
    item.tabIndex = 0;

    if (selectedSolutions.has(solution.id)) {
        item.classList.add('selected');
    }

    item.addEventListener('click', () => toggleSolution(item, solution.id));
    item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleSolution(item, solution.id);
        }
    });

    const info = document.createElement('div');
    info.className = 'solution-item-info';

    const name = document.createElement('div');
    name.className = 'solution-item-name';
    name.textContent = solution.name;

    const meta = document.createElement('div');
    meta.className = 'solution-item-meta';

    const complexity = Number(solution?.value_scoring?.complexity_level) || 0;
    const diffLabel = solution?.onboarding?.difficulty
        || (complexity <= 1 ? 'Easy' : complexity <= 2 ? 'Moderate' : 'Hard');
    const diffClass = diffLabel.toLowerCase();
    const hours = Number(solution?.value_scoring?.setup_hours) || 0;
    const hoursText = hours > 0 ? ` · ~${hours}h` : '';

    meta.textContent = `${solution.analytics} rules · ${solution.workbooks} workbooks · ${solution.playbooks} playbooks`;

    const badges = document.createElement('div');
    badges.className = 'solution-item-badges';

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

    info.append(name, meta, badges);

    const check = document.createElement('div');
    check.className = 'solution-item-check';
    check.textContent = '✓';

    item.append(createLogoBadge(solution.logo, solution.name, '🔹'), info, check);
    return item;
}

function createSolutionPanel(category, preSelectedIds) {
    const panel = document.createElement('div');
    panel.className = 'solution-panel';

    const header = document.createElement('div');
    header.className = 'solution-panel-header';

    const icon = document.createElement('span');
    icon.className = 'solution-panel-icon';
    icon.textContent = category.icon;

    const title = document.createElement('h3');
    title.textContent = category.label;

    header.append(icon, title);

    const list = document.createElement('div');
    list.className = 'solution-list';

    const sortedSolutions = [...(category.solutions || [])].sort((left, right) => {
        const leftSelected = preSelectedIds.has(left.id) ? 0 : 1;
        const rightSelected = preSelectedIds.has(right.id) ? 0 : 1;
        if (leftSelected !== rightSelected) {
            return leftSelected - rightSelected;
        }
        return left.name.localeCompare(right.name);
    });

    sortedSolutions.forEach((solution) => {
        list.appendChild(createSolutionItem(solution));
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

    const preSelectedIds = getPreselectedSolutionIds();
    preSelectedIds.forEach((solutionId) => selectedSolutions.add(solutionId));

    const banner = document.getElementById('preselectionBanner');
    if (banner) {
        banner.hidden = preSelectedIds.size === 0;
    }

    const nlpSection = document.getElementById('nlpSection');
    if (nlpSection) {
        nlpSection.hidden = false;
    }

    selectedCategories.forEach((categoryKey) => {
        const category = solutionsData.categories[categoryKey];
        if (category) {
            panelsContainer.appendChild(createSolutionPanel(category, preSelectedIds));
        }
    });

    updateStep3Button();
}

export function toggleSolution(element, solutionId) {
    const solutionCard = element instanceof Element
        ? element
        : document.querySelector(`.solution-item[data-id="${solutionId}"]`);

    if (selectedSolutions.has(solutionId)) {
        selectedSolutions.delete(solutionId);
        solutionCard?.classList.remove('selected');
    } else {
        selectedSolutions.add(solutionId);
        solutionCard?.classList.add('selected');
    }

    updateStep3Button();
}

export function updateStep3Button() {
    const nextButton = document.getElementById('step3Next');
    if (nextButton) {
        nextButton.disabled = selectedSolutions.size === 0;
    }
}

export function getSelectedSolutionsData() {
    const selectedIds = new Set(selectedSolutions);
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
