import { exportToExcel } from './modules/export.js?v=16';
import { initGanttPlanner } from './gantt-planner.js?v=27';
import { renderMitreCoverage } from './modules/mitre.js?v=16';
import { handleNlpInput, handleNlpKeydown } from './modules/search.js?v=17';
import {
    blockTopologyNavigationWhileSizing,
    getSelectedSolutionsData,
    getConnectedSolutionIds,
    initStep3,
    loadSolutionData,
    selectedVendors,
    syncCriblEnvironmentSelection,
    setConnectedSolutionIds,
    setConnectedSolutionsFromWorkspace,
    toggleVendor
} from './modules/solutions.js?v=21';
import { exportTopologyAsPdf, exportTopologyAsPng, renderTopology } from './modules/topology.js?v=26';
import { getCurrentStep, nextStep, prevStep, setCurrentStep } from './modules/wizard.js?v=16';
import { sortByScore } from './modules/scoring.js?v=16';

const AZURE_TOKEN_COMMAND = 'az account get-access-token --resource https://management.azure.com --query accessToken -o tsv';
const workspaceConnectionState = {
    accessToken: '',
    tokenExpiresAt: '',
    subscriptions: [],
    resourceGroups: [],
    workspaces: [],
    selectedWorkspace: null,
    status: 'disconnected',
    warningMessage: '',
    lastValidatedAt: '',
    bannerDismissed: false,
    workspaceValidationPending: false,
    workspaceValidationRequestId: 0
};

const STORAGE_PREFIX = 'sentinelPlanner.';
const SELECTED_VENDORS_STORAGE_KEY = `${STORAGE_PREFIX}selectedVendors`;
const CURRENT_STEP_STORAGE_KEY = `${STORAGE_PREFIX}currentStep`;
const SELECTED_SOLUTIONS_STORAGE_KEY = `${STORAGE_PREFIX}selectedSolutions`;
const CONNECTED_SOLUTIONS_STORAGE_KEY = `${STORAGE_PREFIX}connectedSolutionIds`;
const WORKSPACE_CONNECTION_STATE_STORAGE_KEY = `${STORAGE_PREFIX}workspaceConnectionState`;
const SESSION_TOKEN_STORAGE_KEY = `${STORAGE_PREFIX}sessionToken`;
const THEME_STORAGE_KEY = `${STORAGE_PREFIX}theme`;
const THEME_MEDIA_QUERY = '(prefers-color-scheme: light)';
const WORKSPACE_CONNECTION_EXPIRED_MESSAGE = 'Your workspace connection has expired. Reconnect to refresh your environment data.';
const PLANNER_STORAGE_KEYS = [
    SELECTED_VENDORS_STORAGE_KEY,
    CURRENT_STEP_STORAGE_KEY,
    SELECTED_SOLUTIONS_STORAGE_KEY,
    CONNECTED_SOLUTIONS_STORAGE_KEY,
    WORKSPACE_CONNECTION_STATE_STORAGE_KEY
];
const STEP_LABELS = ['Welcome', 'Environment', 'Solutions', 'Topology', 'Planner'];
const WORKSPACE_USAGE_SUMMARY_QUERY = 'Usage | where TimeGenerated > ago(14d) | summarize TotalMB=sum(Quantity), LastLog=max(TimeGenerated) by DataType | where TotalMB > 0 | project DataType, LastLog';

const canUseLocalStorage = () => {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
        return false;
    }
};

const readJsonFromStorage = (storageKey, fallbackValue = null) => {
    if (!canUseLocalStorage()) {
        return fallbackValue;
    }

    try {
        const rawValue = window.localStorage.getItem(storageKey);
        return rawValue ? JSON.parse(rawValue) : fallbackValue;
    } catch (error) {
        console.warn(`Unable to read ${storageKey}:`, error);
        return fallbackValue;
    }
};

const writeJsonToStorage = (storageKey, value) => {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
        console.warn(`Unable to write ${storageKey}:`, error);
    }
};

const isThemeValue = (value) => value === 'light' || value === 'dark';

const getStoredTheme = () => {
    if (!canUseLocalStorage()) {
        return null;
    }

    try {
        const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
        return isThemeValue(theme) ? theme : null;
    } catch (error) {
        console.warn('Unable to read theme preference:', error);
        return null;
    }
};

const getSystemPreferredTheme = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'dark';
    }

    return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'light' : 'dark';
};

const resolvePreferredTheme = () => getStoredTheme() || getSystemPreferredTheme();

const applyTheme = (theme) => {
    const resolvedTheme = isThemeValue(theme) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    return resolvedTheme;
};

const updateThemeToggleUi = (theme) => {
    const toggleButton = document.getElementById('themeToggle');
    const toggleLabel = document.getElementById('themeToggleLabel');
    const toggleIcon = document.getElementById('themeToggleIcon');
    const isLightTheme = theme === 'light';
    const nextThemeLabel = isLightTheme ? 'Dark mode' : 'Light mode';

    toggleButton?.setAttribute('aria-pressed', isLightTheme ? 'true' : 'false');
    toggleButton?.setAttribute('aria-label', `Switch to ${nextThemeLabel.toLowerCase()}`);
    if (toggleLabel) {
        toggleLabel.textContent = nextThemeLabel;
    }
    if (toggleIcon) {
        toggleIcon.textContent = isLightTheme ? '🌙' : '☀️';
    }
};

const persistThemePreference = (theme) => {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        console.warn('Unable to persist theme preference:', error);
    }
};

const initThemeToggle = () => {
    const toggleButton = document.getElementById('themeToggle');
    if (!toggleButton) {
        return;
    }

    let activeTheme = applyTheme(resolvePreferredTheme());
    updateThemeToggleUi(activeTheme);

    toggleButton.addEventListener('click', () => {
        activeTheme = activeTheme === 'light' ? 'dark' : 'light';
        activeTheme = applyTheme(activeTheme);
        persistThemePreference(activeTheme);
        updateThemeToggleUi(activeTheme);
    });

    if (typeof window.matchMedia === 'function') {
        const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
        const handleSystemThemeChange = (event) => {
            if (getStoredTheme()) {
                return;
            }

            activeTheme = applyTheme(event.matches ? 'light' : 'dark');
            updateThemeToggleUi(activeTheme);
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(handleSystemThemeChange);
        }
    }
};

const getDefaultPersistedWorkspaceConnection = () => ({
    status: 'disconnected',
    tokenExpiresAt: '',
    selectedWorkspace: null,
    warningMessage: '',
    lastValidatedAt: ''
});

const decodeBase64Url = (value = '') => {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return window.atob(padded);
};

const getTokenExpiryFromJwt = (token = '') => {
    try {
        const [, payload = ''] = String(token).split('.');
        if (!payload) {
            return '';
        }

        const parsedPayload = JSON.parse(decodeBase64Url(payload));
        return Number.isFinite(parsedPayload?.exp)
            ? new Date(parsedPayload.exp * 1000).toISOString()
            : '';
    } catch (error) {
        console.warn('Unable to decode Azure token expiry:', error);
        return '';
    }
};

const isTimestampExpired = (timestamp = '') => {
    if (!timestamp) {
        return false;
    }

    const parsedTime = Date.parse(timestamp);
    return Number.isFinite(parsedTime) && parsedTime <= Date.now();
};

const persistSessionToken = (token = '') => {
    try {
        if (token) {
            window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
        } else {
            window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
        }
    } catch { /* sessionStorage unavailable */ }
};

const restoreSessionToken = () => {
    try {
        return window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY) || '';
    } catch {
        return '';
    }
};

const persistWorkspaceConnectionState = () => {
    writeJsonToStorage(WORKSPACE_CONNECTION_STATE_STORAGE_KEY, {
        status: workspaceConnectionState.status,
        tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
        selectedWorkspace: workspaceConnectionState.selectedWorkspace,
        warningMessage: workspaceConnectionState.warningMessage,
        lastValidatedAt: workspaceConnectionState.lastValidatedAt
    });
};

const hydrateWorkspaceConnectionState = (persistedState = null) => {
    const nextState = {
        ...getDefaultPersistedWorkspaceConnection(),
        ...(persistedState && typeof persistedState === 'object' ? persistedState : {})
    };

    workspaceConnectionState.status = nextState.status;
    workspaceConnectionState.tokenExpiresAt = typeof nextState.tokenExpiresAt === 'string' ? nextState.tokenExpiresAt : '';
    workspaceConnectionState.selectedWorkspace = nextState.selectedWorkspace && typeof nextState.selectedWorkspace === 'object'
        ? nextState.selectedWorkspace
        : null;
    workspaceConnectionState.warningMessage = typeof nextState.warningMessage === 'string' ? nextState.warningMessage : '';
    workspaceConnectionState.lastValidatedAt = typeof nextState.lastValidatedAt === 'string' ? nextState.lastValidatedAt : '';
};

function renderWorkspaceConnectionBanner() {
    const banner = document.getElementById('workspaceConnectionWarning');
    if (!banner) {
        return;
    }

    const message = workspaceConnectionState.warningMessage || WORKSPACE_CONNECTION_EXPIRED_MESSAGE;
    const messageEl = banner.querySelector('[data-workspace-warning-message]');
    if (messageEl) {
        messageEl.textContent = message;
    }

    const shouldShow = workspaceConnectionState.status === 'expired' && !workspaceConnectionState.bannerDismissed;
    banner.hidden = !shouldShow;
    banner.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
}

const updatePersistedWorkspaceConnection = ({
    status = workspaceConnectionState.status,
    tokenExpiresAt = workspaceConnectionState.tokenExpiresAt,
    selectedWorkspace = workspaceConnectionState.selectedWorkspace,
    warningMessage = workspaceConnectionState.warningMessage,
    lastValidatedAt = workspaceConnectionState.lastValidatedAt
} = {}) => {
    workspaceConnectionState.status = status;
    workspaceConnectionState.tokenExpiresAt = tokenExpiresAt || '';
    workspaceConnectionState.selectedWorkspace = selectedWorkspace && typeof selectedWorkspace === 'object'
        ? selectedWorkspace
        : null;
    workspaceConnectionState.warningMessage = warningMessage || '';
    workspaceConnectionState.lastValidatedAt = lastValidatedAt || '';

    if (status === 'expired') {
        workspaceConnectionState.bannerDismissed = false;
    }

    persistWorkspaceConnectionState();
    renderWorkspaceConnectionBanner();
};

function syncWorkspaceConnectUi({ showPicker = false } = {}) {
    const tokenInstructions = document.getElementById('tokenInstructions');
    const workspacePicker = document.getElementById('workspacePicker');

    if (tokenInstructions) {
        tokenInstructions.style.display = showPicker ? 'none' : 'flex';
    }

    if (workspacePicker) {
        workspacePicker.style.display = showPicker ? 'grid' : 'none';
    }
}

function markWorkspaceConnectionExpired({ message = WORKSPACE_CONNECTION_EXPIRED_MESSAGE } = {}) {
    const preservedWorkspace = workspaceConnectionState.selectedWorkspace;

    workspaceConnectionState.accessToken = '';
    workspaceConnectionState.subscriptions = [];
    workspaceConnectionState.resourceGroups = [];
    workspaceConnectionState.workspaces = [];
    if (isTimestampExpired(workspaceConnectionState.tokenExpiresAt)) {
        persistSessionToken('');
    }

    window.connectedWorkspace = null;
    window.connectedSolutions = [];

    resetWorkspaceValidationState();
    setConnectedSolutionIds([]);
    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) {
        tokenInput.value = '';
    }
    resetSelect('subscriptionSelect', 'Reconnect to load subscriptions');
    resetSelect('rgSelect', 'Reconnect to load resource groups');
    resetSelect('workspaceSelect', 'Reconnect to load workspaces');
    syncWorkspaceConnectUi({ showPicker: false });

    updatePersistedWorkspaceConnection({
        status: 'expired',
        tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
        selectedWorkspace: preservedWorkspace,
        warningMessage: message,
        lastValidatedAt: workspaceConnectionState.lastValidatedAt || new Date().toISOString()
    });

    setWorkspaceStatus(message, 'warning');
}

function dismissWorkspaceConnectionWarning() {
    workspaceConnectionState.bannerDismissed = true;
    renderWorkspaceConnectionBanner();
}

function reconnectWorkspaceConnection() {
    const nextStep = setCurrentStep(1);
    handleStepChange(nextStep);

    const connectSection = document.querySelector('.workspace-connect-section');
    connectSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    window.requestAnimationFrame(() => {
        document.getElementById('tokenInput')?.focus();
    });
}

const getPersistedCurrentStep = () => {
    if (!canUseLocalStorage()) {
        return 1;
    }

    const rawValue = window.localStorage.getItem(CURRENT_STEP_STORAGE_KEY);
    const parsedStep = Number.parseInt(rawValue || '', 10);
    return Number.isFinite(parsedStep) ? parsedStep : 1;
};

const clampStepNumber = (step) => {
    const parsedStep = Number.parseInt(step || '', 10);
    if (!Number.isFinite(parsedStep)) {
        return 1;
    }
    return Math.min(STEP_LABELS.length, Math.max(1, parsedStep));
};

const getStepLabel = (step) => STEP_LABELS[clampStepNumber(step) - 1] || 'Welcome';

const setupResumeProgressButton = (step = 1) => {
    const resumeButton = document.getElementById('resumeProgressButton');
    if (!resumeButton) {
        return;
    }

    const nextStep = clampStepNumber(step);
    if (nextStep <= 1) {
        resumeButton.hidden = true;
        resumeButton.textContent = 'Resume saved progress';
        resumeButton.onclick = null;
        return;
    }

    resumeButton.hidden = false;
    resumeButton.textContent = `Resume at ${getStepLabel(nextStep)} →`;
    resumeButton.onclick = () => {
        const resumedStep = setCurrentStep(nextStep);
        handleStepChange(resumedStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
};

const getWelcomeCtaButtons = () => ([
    document.querySelector('#step1 [data-next]'),
    document.getElementById('resumeProgressButton')
].filter(Boolean));

const syncWorkspaceValidationButtons = () => {
    const isPending = workspaceConnectionState.workspaceValidationPending === true;
    const isDisconnected = !workspaceConnectionState.accessToken
        || workspaceConnectionState.status === 'expired';
    const shouldDisable = isPending || isDisconnected;

    getWelcomeCtaButtons().forEach((button) => {
        button.toggleAttribute('disabled', shouldDisable);
        button.classList.toggle('is-loading', isPending);
        button.setAttribute('aria-busy', isPending ? 'true' : 'false');
        if (isPending) {
            button.setAttribute('title', 'Confirming workspace connection…');
        } else if (isDisconnected) {
            button.setAttribute('title', 'Connect a workspace first');
        } else {
            button.removeAttribute('title');
        }
    });
};

const resetWorkspaceValidationState = () => {
    workspaceConnectionState.workspaceValidationRequestId += 1;
    workspaceConnectionState.workspaceValidationPending = false;
    syncWorkspaceValidationButtons();
};

const beginWorkspaceValidation = () => {
    workspaceConnectionState.workspaceValidationRequestId += 1;
    workspaceConnectionState.workspaceValidationPending = true;
    syncWorkspaceValidationButtons();
    return workspaceConnectionState.workspaceValidationRequestId;
};

const completeWorkspaceValidation = (requestId) => {
    if (requestId !== workspaceConnectionState.workspaceValidationRequestId) {
        return false;
    }

    workspaceConnectionState.workspaceValidationPending = false;
    syncWorkspaceValidationButtons();
    return true;
};

const getVendorCards = () => Array.from(document.querySelectorAll('[data-vendor]'));

const bindRemoteLogoFallbacks = (root = document) => {
    root.querySelectorAll('[data-remote-logo]').forEach((image) => {
        if (image.dataset.logoBound === 'true') {
            return;
        }

        image.dataset.logoBound = 'true';
        const wrapper = image.closest('[data-logo-wrapper]');
        const fallback = wrapper?.querySelector('[data-logo-fallback]');

        const showFallback = () => {
            wrapper?.classList.add('logo-is-fallback');
            image.hidden = true;
            if (fallback) {
                fallback.hidden = false;
            }
        };

        const showImage = () => {
            wrapper?.classList.remove('logo-is-fallback');
            image.hidden = false;
            if (fallback) {
                fallback.hidden = true;
            }
        };

        image.addEventListener('load', showImage);
        image.addEventListener('error', showFallback);

        if (!image.getAttribute('src')) {
            showFallback();
            return;
        }

        if (image.complete) {
            if (image.naturalWidth > 0) {
                showImage();
            } else {
                showFallback();
            }
        }
    });
};

const applySelectedVendors = (vendorIds = []) => {
    const nextVendors = new Set(Array.isArray(vendorIds) ? vendorIds.filter(Boolean) : []);
    selectedVendors.clear();

    getVendorCards().forEach((card) => {
        const vendorId = card.dataset.vendor;
        const isSelected = Boolean(vendorId) && nextVendors.has(vendorId);
        card.classList.toggle('selected', isSelected);
        if (isSelected) {
            selectedVendors.add(vendorId);
        }
    });

    syncCriblEnvironmentSelection({ clearCapacity: !selectedVendors.has('cribl'), persist: false });
};

const persistSelectedVendors = () => {
    writeJsonToStorage(SELECTED_VENDORS_STORAGE_KEY, Array.from(selectedVendors));
};

const restoreSelectedVendors = () => {
    const storedVendors = readJsonFromStorage(SELECTED_VENDORS_STORAGE_KEY, null);
    if (Array.isArray(storedVendors)) {
        applySelectedVendors(storedVendors);
        return;
    }

    const markupSelections = getVendorCards()
        .filter((card) => card.classList.contains('selected'))
        .map((card) => card.dataset.vendor)
        .filter(Boolean);
    const vendorsToApply = markupSelections.length > 0
        ? markupSelections
        : ['azure', 'microsoft365'];
    applySelectedVendors(vendorsToApply);
    persistSelectedVendors();
};

const clearPlannerLocalStorage = () => {
    if (!canUseLocalStorage()) {
        return;
    }

    const keysToClear = new Set([
        ...Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
            .filter((storageKey) => storageKey && storageKey.startsWith(STORAGE_PREFIX) && storageKey !== THEME_STORAGE_KEY),
        ...PLANNER_STORAGE_KEYS
    ]);

    keysToClear.forEach((storageKey) => window.localStorage.removeItem(storageKey));
};

const getSelectedPlanSolutions = () => sortByScore(getSelectedSolutionsData());

const renderTopologyStep = async () => {
    const container = document.getElementById('architectureDiagram');
    if (!container) return;
    // If infrastructure discovery is in progress, show loading and wait
    if (window._infraDiscoveryPromise) {
        container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">⏳ Loading existing infrastructure…</div>';
        try {
            await window._infraDiscoveryPromise;
        } catch (_) { /* discovery failure is non-fatal */ }
    }
    try {
        renderTopology(getSelectedPlanSolutions(), container);
    } catch (err) {
        console.error('[renderTopologyStep] renderTopology failed:', err);
    }
    try {
        renderMitreCoverage(getSelectedPlanSolutions());
    } catch (err) {
        console.error('[renderTopologyStep] renderMitreCoverage failed:', err);
    }
};

const renderPlannerStep = () => {
    // Exclude connected solutions from planner — they don't need setup tasks
    const connectedIds = getConnectedSolutionIds();
    const planSolutions = getSelectedPlanSolutions().filter(s => !connectedIds.has(s.id));
    initGanttPlanner(planSolutions);
};

const handleStepChange = (step) => {
    if (step === 3) initStep3();
    if (step === 4) renderTopologyStep();
    if (step === 5) renderPlannerStep();
};

const setWorkspaceStatus = (message = '', tone = '') => {
    const statusEl = document.getElementById('workspaceStatus');
    if (!statusEl) {
        return;
    }

    statusEl.className = tone ? `workspace-status ${tone}` : 'workspace-status';
    statusEl.textContent = message;
};

const setWorkspaceStatusHtml = (html = '', tone = '') => {
    const statusEl = document.getElementById('workspaceStatus');
    if (!statusEl) {
        return;
    }

    statusEl.className = tone ? `workspace-status ${tone}` : 'workspace-status';
    statusEl.innerHTML = html;
};

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCountLabel = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

const resetSelect = (selectId, placeholder) => {
    const select = document.getElementById(selectId);
    if (!select) {
        return;
    }

    select.replaceChildren(new Option(placeholder, ''));
    select.disabled = true;
};

const populateSelect = (selectId, items, placeholder, valueSelector, labelSelector) => {
    const select = document.getElementById(selectId);
    if (!select) {
        return;
    }

    const options = [new Option(placeholder, '')];
    items.forEach((item) => options.push(new Option(labelSelector(item), valueSelector(item))));
    select.replaceChildren(...options);
    select.disabled = items.length === 0;
};

const azureFetch = async (url) => {
    if (!workspaceConnectionState.accessToken) {
        throw new Error('Missing Azure access token.');
    }

    if (isTimestampExpired(workspaceConnectionState.tokenExpiresAt)) {
        markWorkspaceConnectionExpired();
        throw new Error(WORKSPACE_CONNECTION_EXPIRED_MESSAGE);
    }

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${workspaceConnectionState.accessToken}`
        }
    });

    if (!response.ok) {
        const details = await response.text();
        const isUnauthorized = response.status === 401
            || /unauthorized|expiredauthenticationtoken|invalidauthenticationtoken/i.test(`${response.statusText} ${details}`);

        if (isUnauthorized) {
            markWorkspaceConnectionExpired();
            throw new Error(WORKSPACE_CONNECTION_EXPIRED_MESSAGE);
        }

        throw Object.assign(new Error(`Azure API error (${response.status}): ${details || response.statusText}`), { status: response.status });
    }

    return response.json();
};

// Fetches all pages from a paginated Azure API response
const azureFetchAll = async (url) => {
    const allItems = [];
    let nextUrl = url;
    while (nextUrl) {
        const data = await azureFetch(nextUrl);
        const items = Array.isArray(data.value) ? data.value : [];
        allItems.push(...items);
        nextUrl = data.nextLink || null;
    }
    return allItems;
};

const isAzureAuthFailure = (status, statusText = '', details = '') => status === 401
    || /unauthorized|expiredauthenticationtoken|invalidauthenticationtoken/i.test(`${statusText} ${details}`);

const buildWorkspaceQueryError = (message, {
    status = null,
    endpoint = 'arm',
    details = '',
    isAuth = false
} = {}) => Object.assign(new Error(message), {
    status,
    endpoint,
    details,
    isAuth
});

const fetchWorkspaceQueryResult = async (url, kql, {
    returnRows = false,
    endpoint = 'arm',
    markConnectionExpiredOnAuth = false
} = {}) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${workspaceConnectionState.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: kql })
    });

    if (!response.ok) {
        const details = await response.text();
        const isAuth = isAzureAuthFailure(response.status, response.statusText, details);
        if (isAuth && markConnectionExpiredOnAuth) {
            markWorkspaceConnectionExpired();
            throw new Error(WORKSPACE_CONNECTION_EXPIRED_MESSAGE);
        }

        throw buildWorkspaceQueryError(
            `Workspace query via ${endpoint} failed (${response.status}): ${details}`,
            { status: response.status, endpoint, details, isAuth }
        );
    }

    const result = await response.json();
    if (returnRows) {
        const table = result?.tables?.[0];
        return {
            columns: (table?.columns || []).map(c => c.name || c),
            rows: table?.rows || [],
            source: endpoint
        };
    }

    return result?.tables?.[0]?.rows?.map(row => row[0]) || [];
};

const getWorkspaceCustomerId = async (subscriptionId, resourceGroupName, workspaceName) => {
    const cachedWorkspace = workspaceConnectionState.workspaces.find((workspace) => workspace?.name === workspaceName);
    const cachedCustomerId = cachedWorkspace?.properties?.customerId;
    if (cachedCustomerId) {
        return cachedCustomerId;
    }

    const workspace = await azureFetch(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}?api-version=2022-10-01`);
    return workspace?.properties?.customerId || '';
};

// POST to Azure Resource Graph — returns result rows or throws on error
const resourceGraphQuery = async (subscriptionId, query) => {
    const url = 'https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${workspaceConnectionState.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscriptions: [subscriptionId], query })
    });
    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Resource Graph error (${response.status}): ${details}`);
    }
    const result = await response.json();
    return result.data || [];
};

// Query the workspace via ARM-proxied Log Analytics query API, then fall back to the direct
// Log Analytics endpoint when the ARM query fails for non-auth reasons.
const queryWorkspace = async (subscriptionId, resourceGroupName, workspaceName, kql, { retries = 1, returnRows = false } = {}) => {
    if (!workspaceConnectionState.accessToken) {
        throw new Error('Missing Azure access token.');
    }
    if (isTimestampExpired(workspaceConnectionState.tokenExpiresAt)) {
        markWorkspaceConnectionExpired();
        throw new Error(WORKSPACE_CONNECTION_EXPIRED_MESSAGE);
    }
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}/query?api-version=2022-10-01`;

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
            console.info(`[Sentinel Planner] Retrying workspace query (attempt ${attempt + 1})...`);
        }
        try {
            return await fetchWorkspaceQueryResult(url, kql, {
                returnRows,
                endpoint: 'usage-arm',
                markConnectionExpiredOnAuth: true
            });
        } catch (err) {
            if (err.message === WORKSPACE_CONNECTION_EXPIRED_MESSAGE) throw err;
            lastError = err;
        }
    }

    let fallbackError = null;
    try {
        const customerId = await getWorkspaceCustomerId(subscriptionId, resourceGroupName, workspaceName);
        if (!customerId) {
            throw new Error('Workspace customer ID is unavailable.');
        }

        console.warn('[Sentinel Planner] ARM Usage query failed, trying Log Analytics API fallback.');
        return await fetchWorkspaceQueryResult(`https://api.loganalytics.io/v1/workspaces/${customerId}/query`, kql, {
            returnRows,
            endpoint: 'usage-loganalytics'
        });
    } catch (err) {
        if (err.message === WORKSPACE_CONNECTION_EXPIRED_MESSAGE) throw err;
        fallbackError = err;
        console.warn('[Sentinel Planner] Log Analytics API fallback failed:', err.message);
    }

    if (fallbackError && !fallbackError.isAuth) {
        throw buildWorkspaceQueryError(
            `${lastError?.message || 'Workspace query failed.'} Log Analytics API fallback also failed: ${fallbackError.message}`,
            {
                status: lastError?.status || fallbackError.status,
                endpoint: `${lastError?.endpoint || 'usage-arm'}+${fallbackError.endpoint || 'usage-loganalytics'}`,
                details: `${lastError?.details || ''} ${fallbackError.details || fallbackError.message}`.trim(),
                isAuth: false
            }
        );
    }

    throw lastError || fallbackError || new Error('Workspace query failed.');
};

// Fallback: use the Tables ARM API (GET) to discover table names when the KQL Usage query fails.
// This doesn't require query permissions — just standard ARM read on the workspace.
const getWorkspaceTablesViaArm = async (subscriptionId, resourceGroupName, workspaceName) => {
    const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}/tables?api-version=2022-10-01`;
    const data = await azureFetch(url);
    const tables = Array.isArray(data.value) ? data.value : [];
    // Return table names that have the Analytics plan (actively used for querying/ingestion)
    return tables
        .filter(t => t?.properties?.plan === 'Analytics' || t?.properties?.plan === 'Basic')
        .map(t => t.name)
        .filter(Boolean);
};

const loadWorkspaceActiveDataTypes = async (subscriptionId, resourceGroupName, workspaceName) => {
    try {
        return await queryWorkspace(
            subscriptionId,
            resourceGroupName,
            workspaceName,
            WORKSPACE_USAGE_SUMMARY_QUERY,
            { retries: 2, returnRows: true }
        );
    } catch (err) {
        if (err.message === WORKSPACE_CONNECTION_EXPIRED_MESSAGE) throw err;
        console.warn('[Sentinel Planner] Usage query failed, trying Tables API fallback:', err.message);
        try {
            const tables = await getWorkspaceTablesViaArm(subscriptionId, resourceGroupName, workspaceName);
            console.info(`[Sentinel Planner] Tables API fallback returned ${tables.length} tables`);
            return {
                data: tables,
                source: 'tables-arm',
                tableAnalysisAvailable: false,
                usedTablesApiFallback: true,
                failed: false,
                reason: err.message
            };
        } catch (fallbackErr) {
            console.warn('[Sentinel Planner] Tables API fallback also failed:', fallbackErr.message);
            return {
                data: [],
                source: 'unavailable',
                tableAnalysisAvailable: false,
                usedTablesApiFallback: false,
                failed: true,
                reason: err.message,
                fallbackReason: fallbackErr.message
            };
        }
    }
};

function normalizeWorkspaceActiveDataTypes(activeDataTypes) {
    const usageQueryFailed = activeDataTypes?.failed === true;
    const source = activeDataTypes?.source
        || (activeDataTypes?.rows ? 'usage-arm' : Array.isArray(activeDataTypes) ? 'legacy' : 'unknown');
    const tableAnalysisAvailable = source === 'usage-arm' || source === 'usage-loganalytics';
    const fallbackTableCount = Array.isArray(activeDataTypes?.data)
        ? activeDataTypes.data.length
        : Array.isArray(activeDataTypes)
            ? activeDataTypes.length
            : 0;

    let dataTypeList = [];
    let lastLogMap = null;
    if (usageQueryFailed) {
        dataTypeList = [];
    } else if (activeDataTypes?.rows) {
        dataTypeList = activeDataTypes.rows.map(r => r[0]).filter(Boolean);
        lastLogMap = new Map(activeDataTypes.rows.filter(r => r[0] && r[1]).map(r => [r[0], r[1]]));
    } else if (Array.isArray(activeDataTypes?.data)) {
        dataTypeList = activeDataTypes.data;
    } else if (Array.isArray(activeDataTypes)) {
        dataTypeList = activeDataTypes;
    }

    return {
        usageQueryFailed,
        dataTypeList,
        lastLogMap,
        dataTypeDiscoverySource: source,
        tableAnalysisAvailable,
        tableFallbackTableCount: fallbackTableCount
    };
}

// Discovers existing VMs connected to this workspace via DCR associations.
// Runs non-blocking after connector discovery and stores results on window.discoveredInfrastructure.
const discoverExistingInfrastructure = async (subscriptionId, resourceGroupName, workspaceName) => {
    const status = { partial: false };

    // Helper: safely run a query and return [] on failure (marks partial)
    const safeGraph = async (query) => {
        try {
            return await resourceGraphQuery(subscriptionId, query);
        } catch (err) {
            console.warn('[Sentinel Planner] Resource Graph query failed (partial):', err.message);
            status.partial = true;
            return [];
        }
    };
    const safeKql = async (kql) => {
        try {
            return await queryWorkspace(subscriptionId, resourceGroupName, workspaceName, kql, { returnRows: true });
        } catch (err) {
            console.warn('[Sentinel Planner] KQL query failed (partial):', err.message);
            status.partial = true;
            return { columns: [], rows: [] };
        }
    };

    // 1. DCRs targeting this workspace
    const dcrQuery = `resources | where type == 'microsoft.insights/datacollectionrules' | extend destinations = properties.destinations | extend logAnalyticsDests = destinations.logAnalytics | mv-expand logAnalyticsDests | where tostring(logAnalyticsDests.workspaceResourceId) contains '${workspaceName}' | extend dataFlows = properties.dataFlows | project name, id, dataFlows, location, resourceGroup`;
    const dcrRows = await safeGraph(dcrQuery);

    // Build lookup: dcrId (lower) → { name, streams[] }
    const dcrById = {};
    for (const dcr of dcrRows) {
        const id = (dcr.id || '').toLowerCase();
        const streams = [];
        const dataFlows = dcr.dataFlows;
        if (Array.isArray(dataFlows)) {
            for (const flow of dataFlows) {
                if (Array.isArray(flow.streams)) streams.push(...flow.streams);
            }
        }
        dcrById[id] = { name: dcr.name, streams };
    }
    const workspaceDcrIds = new Set(Object.keys(dcrById));

    // 2. DCR associations + VM details
    const assocQuery = `insightsresources | where type == 'microsoft.insights/datacollectionruleassociations' | extend dcrId = tostring(properties.dataCollectionRuleId) | where isnotempty(dcrId) | extend vmResourceId = tostring(split(id, '/providers/Microsoft.Insights/dataCollectionRuleAssociations')[0]) | extend vmName = tostring(split(vmResourceId, '/')[-1]) | extend vmType = tostring(split(vmResourceId, '/')[-2]) | extend dcrName = tostring(split(dcrId, '/')[-1]) | project vmName, vmType, dcrName, dcrId, vmResourceId`;
    const assocRows = await safeGraph(assocQuery);

    // Filter to only associations whose DCR targets this workspace
    const relevantAssocs = assocRows.filter(a => workspaceDcrIds.has((a.dcrId || '').toLowerCase()));

    // Group by VM resource ID
    const vmMap = {};
    for (const assoc of relevantAssocs) {
        const rid = (assoc.vmResourceId || '').toLowerCase();
        if (!rid) continue;
        if (!vmMap[rid]) {
            vmMap[rid] = {
                name: assoc.vmName,
                rawType: (assoc.vmType || '').toLowerCase(),
                resourceId: assoc.vmResourceId,
                dcrs: []
            };
        }
        const dcrKey = (assoc.dcrId || '').toLowerCase();
        const dcrInfo = dcrById[dcrKey] || { name: assoc.dcrName, streams: [] };
        vmMap[rid].dcrs.push({ name: dcrInfo.name, streams: dcrInfo.streams, dcrId: assoc.dcrId });
    }

    const vmNames = Object.values(vmMap).map(v => v.name).filter(Boolean);

    // 3. VM details (size, OS) — only if we have VMs
    let vmDetailMap = {};
    if (vmNames.length > 0) {
        const nameList = vmNames.map(n => `'${n}'`).join(', ');
        const vmDetailQuery = `resources | where type in ('microsoft.compute/virtualmachines', 'microsoft.hybridcompute/machines') | where name in~ (${nameList}) | extend vmSize = tostring(properties.hardwareProfile.vmSize) | extend osType = tostring(properties.storageProfile.osDisk.osType) | extend arcOsType = tostring(properties.osType) | project name, type, location, resourceGroup, vmSize, osType, arcOsType`;
        const vmDetailRows = await safeGraph(vmDetailQuery);
        for (const v of vmDetailRows) {
            vmDetailMap[(v.name || '').toLowerCase()] = v;
        }
    }

    // 4. EPS per computer (KQL)
    const epsKql = `union Syslog, CommonSecurityLog, SecurityEvent
| where TimeGenerated > ago(24h)
| summarize EventCount = count() by Computer, Type, bin(TimeGenerated, 1h)
| summarize AvgEventsPerHour = avg(EventCount), MaxEventsPerHour = max(EventCount), TotalEvents = sum(EventCount) by Computer, Type
| extend AvgEPS = round(AvgEventsPerHour / 3600.0, 2), MaxEPS = round(MaxEventsPerHour / 3600.0, 2)
| where TotalEvents > 10
| project Computer, Type, AvgEPS, MaxEPS, TotalEvents`;
    const epsResult = await safeKql(epsKql);
    // Build EPS map: computer name (lower) → aggregated stats
    const epsMap = {};
    const epsColIdx = {};
    (epsResult.columns || []).forEach((c, i) => { epsColIdx[c] = i; });
    for (const row of (epsResult.rows || [])) {
        const computer = (row[epsColIdx['Computer']] || '').toLowerCase();
        if (!computer) continue;
        const avgEps = parseFloat(row[epsColIdx['AvgEPS']]) || 0;
        const maxEps = parseFloat(row[epsColIdx['MaxEPS']]) || 0;
        const total = parseInt(row[epsColIdx['TotalEvents']], 10) || 0;
        if (!epsMap[computer]) {
            epsMap[computer] = { avg: 0, max: 0, total: 0 };
        }
        epsMap[computer].avg = Math.round((epsMap[computer].avg + avgEps) * 100) / 100;
        epsMap[computer].max = Math.max(epsMap[computer].max, maxEps);
        epsMap[computer].total += total;
    }

    // 4b. Heartbeat (agent liveness) per computer
    const heartbeatKql = `Heartbeat
| where TimeGenerated > ago(24h)
| where Category == "Azure Monitor Agent" or Category == "Direct Agent"
| summarize LastHeartbeat = max(TimeGenerated), HeartbeatCount = count() by Computer
| project Computer, LastHeartbeat, HeartbeatCount`;
    const heartbeatResult = await safeKql(heartbeatKql);
    const heartbeatMap = {};
    const hbColIdx = {};
    (heartbeatResult.columns || []).forEach((c, i) => { hbColIdx[c] = i; });
    for (const row of (heartbeatResult.rows || [])) {
        const computer = (row[hbColIdx['Computer']] || '').toLowerCase();
        if (!computer) continue;
        heartbeatMap[computer] = {
            lastHeartbeat: row[hbColIdx['LastHeartbeat']] || null,
            count: parseInt(row[hbColIdx['HeartbeatCount']], 10) || 0
        };
    }

    // 5. Source devices (CEF) per collector computer
    const cefKql = `CommonSecurityLog
| where TimeGenerated > ago(24h)
| summarize EventCount = count() by DeviceName = coalesce(DeviceName, DeviceVendor), Computer
| where EventCount > 5
| project DeviceName, Computer, EventCount`;
    const cefResult = await safeKql(cefKql);
    const cefColIdx = {};
    (cefResult.columns || []).forEach((c, i) => { cefColIdx[c] = i; });
    const sourceDeviceMap = {};
    for (const row of (cefResult.rows || [])) {
        const computer = (row[cefColIdx['Computer']] || '').toLowerCase();
        const device = row[cefColIdx['DeviceName']] || '';
        if (!computer || !device) continue;
        if (!sourceDeviceMap[computer]) sourceDeviceMap[computer] = new Set();
        sourceDeviceMap[computer].add(device);
    }

    // Role classification helper
    const classifyRole = (dcrs, isArc, osType) => {
        const allStreams = dcrs.flatMap(d => d.streams || []).map(s => s.toLowerCase());
        const hasSyslog = allStreams.some(s => s.includes('syslog'));
        const hasCef = allStreams.some(s => s.includes('ciscoasa') || s.includes('commonsecuritylog') || s.includes('cef'));
        const hasWindows = allStreams.some(s => s.includes('securityevent') || s.includes('windowsevent'));
        const isLinux = (osType || '').toLowerCase() === 'linux';
        const isWindows = (osType || '').toLowerCase() === 'windows';

        if (isArc) {
            if (hasSyslog || hasCef) return 'hybrid-syslog';
            if (hasWindows) return 'hybrid-windows';
        }
        if (hasCef) return 'cef-collector';
        if (hasSyslog && isLinux) return 'syslog-collector';
        if (hasWindows && isWindows) return 'windows-events';
        if (hasSyslog) return 'syslog-collector';
        if (hasWindows) return 'windows-events';
        return 'syslog-collector'; // fallback
    };

    // Assemble final VM list
    const vms = [];
    for (const entry of Object.values(vmMap)) {
        const nameLower = (entry.name || '').toLowerCase();
        const detail = vmDetailMap[nameLower] || {};
        const isArc = (detail.type || entry.rawType || '').includes('hybridcompute');
        const osType = detail.osType || detail.arcOsType || '';
        const eps = epsMap[nameLower] || null;
        const srcDevices = sourceDeviceMap[nameLower] ? Array.from(sourceDeviceMap[nameLower]) : [];

        const dcrs = entry.dcrs.map(d => {
            const streams = d.streams || [];
            let type = 'unknown';
            const sl = streams.map(s => s.toLowerCase());
            if (sl.some(s => s.includes('ciscoasa') || s.includes('commonsecuritylog') || s.includes('cef'))) type = 'cef';
            else if (sl.some(s => s.includes('syslog'))) type = 'syslog';
            else if (sl.some(s => s.includes('securityevent') || s.includes('windowsevent'))) type = 'windows';
            return { name: d.name, streams, type };
        });

        const role = classifyRole(dcrs, isArc, osType);

        // Determine VM status: active | idle | stale
        const hasHeartbeat = Boolean(heartbeatMap[nameLower]?.count > 0);
        const hasData = Boolean(eps && eps.total > 0);
        let vmStatus;
        if (hasData) vmStatus = 'active';
        else if (hasHeartbeat) vmStatus = 'idle';
        else vmStatus = 'stale';

        vms.push({
            name: entry.name,
            type: isArc ? 'machines' : 'virtualmachines',
            size: detail.vmSize || null,
            os: osType || null,
            location: detail.location || null,
            resourceGroup: detail.resourceGroup || null,
            resourceId: entry.resourceId,
            dcrs,
            eps: eps ? { avg: eps.avg, max: eps.max, total: eps.total } : null,
            sourceDevices: srcDevices,
            role,
            status: vmStatus,
            heartbeat: heartbeatMap[nameLower] || null
        });
    }

    // Build summary
    const summary = {
        totalVMs: vms.length,
        activeVMs: vms.filter(v => v.status === 'active').length,
        idleVMs: vms.filter(v => v.status === 'idle').length,
        staleVMs: vms.filter(v => v.status === 'stale').length,
        syslogCollectors: vms.filter(v => v.role === 'syslog-collector' || v.role === 'hybrid-syslog').length,
        cefCollectors: vms.filter(v => v.role === 'cef-collector').length,
        windowsSources: vms.filter(v => v.role === 'windows-events' || v.role === 'hybrid-windows').length,
        arcMachines: vms.filter(v => v.type === 'machines').length,
        totalEPS: Math.round(vms.reduce((acc, v) => acc + (v.eps?.avg || 0), 0) * 100) / 100
    };

    window.discoveredInfrastructure = {
        vms,
        summary,
        discoveredAt: new Date().toISOString(),
        status: status.partial ? 'partial' : 'complete'
    };
};

// Map Log Analytics DataType names to connector kinds used by the mapping engine.
// This allows us to identify connected solutions from active data ingestion.
const DATA_TYPE_TO_CONNECTOR_KIND = {
    // Azure Activity
    'AzureActivity': 'AzureActivity',

    // Windows Security Events
    'SecurityEvent': 'SecurityEvents',
    'WindowsEvent': 'SecurityEvents',
    'Event': 'SecurityEvents',

    // Linux / CEF / Syslog
    'Syslog': 'Syslog',
    'CommonSecurityLog': 'CommonSecurityLog',

    // Microsoft Entra ID (Azure AD)
    'SigninLogs': 'AzureActiveDirectory',
    'AuditLogs': 'AzureActiveDirectory',
    'AADNonInteractiveUserSignInLogs': 'AzureActiveDirectory',
    'AADServicePrincipalSignInLogs': 'AzureActiveDirectory',
    'AADManagedIdentitySignInLogs': 'AzureActiveDirectory',
    'AADProvisioningLogs': 'AzureActiveDirectory',
    'AADRiskyUsers': 'AzureActiveDirectory',
    'AADUserRiskEvents': 'AzureActiveDirectory',
    'AADRiskyServicePrincipals': 'AzureActiveDirectory',
    'IdentityInfo': 'AzureActiveDirectory',

    // Office 365
    'OfficeActivity': 'Office365',

    // Defender for Endpoint (MDE)
    'DeviceEvents': 'MicrosoftDefenderForEndpoint',
    'DeviceLogonEvents': 'MicrosoftDefenderForEndpoint',
    'DeviceFileEvents': 'MicrosoftDefenderForEndpoint',
    'DeviceNetworkEvents': 'MicrosoftDefenderForEndpoint',
    'DeviceProcessEvents': 'MicrosoftDefenderForEndpoint',
    'DeviceRegistryEvents': 'MicrosoftDefenderForEndpoint',
    'DeviceImageLoadEvents': 'MicrosoftDefenderForEndpoint',
    'DeviceFileCertificateInfo': 'MicrosoftDefenderForEndpoint',
    'DeviceInfo': 'MicrosoftDefenderForEndpoint',
    'DeviceTvmSoftwareInventory': 'MicrosoftDefenderForEndpoint',
    'DeviceTvmSoftwareVulnerabilities': 'MicrosoftDefenderForEndpoint',

    // Defender XDR (M365 Defender / Threat Protection)
    'AlertEvidence': 'MicrosoftThreatProtection',
    'AlertInfo': 'MicrosoftThreatProtection',
    'EmailEvents': 'MicrosoftThreatProtection',
    'EmailAttachmentInfo': 'MicrosoftThreatProtection',
    'EmailUrlInfo': 'MicrosoftThreatProtection',
    'EmailPostDeliveryEvents': 'MicrosoftThreatProtection',
    'UrlClickEvents': 'MicrosoftThreatProtection',
    'CloudAppEvents': 'MicrosoftThreatProtection',

    // Defender for Identity (MDI)
    'IdentityDirectoryEvents': 'MicrosoftDefenderForIdentity',
    'IdentityLogonEvents': 'MicrosoftDefenderForIdentity',
    'IdentityQueryEvents': 'MicrosoftDefenderForIdentity',

    // Defender for Cloud
    'SecurityAlert': 'MicrosoftDefenderForCloud',
    'SecurityRecommendation': 'MicrosoftDefenderForCloud',
    'SecurityRegulatoryCompliance': 'MicrosoftDefenderForCloud',

    // Defender for Cloud Apps (MCAS)
    'McasShadowItReporting': 'MicrosoftCloudAppSecurity',

    // Defender for Office 365
    'EmailPostDeliveryActions': 'MicrosoftDefenderForOffice365',

    // Threat Intelligence
    'ThreatIntelligenceIndicator': 'ThreatIntelligence',

    // Microsoft Purview / Information Protection
    'InformationProtectionLogs_CL': 'MicrosoftPurview',
    'MicrosoftPurviewInformationProtection': 'MicrosoftPurview',

    // AWS
    'AWSCloudTrail': 'AmazonWebServicesAWS',
    'AWSGuardDuty': 'AmazonWebServicesAWS',
    'AWSVPCFlow': 'AWSS3',

    // GCP
    'GCPAuditLogs': 'GCPAuditLogs',

    // Azure Diagnostics (many Azure services)
    'AzureDiagnostics': 'AzureDiagnostics',

    // Azure Kubernetes
    'ContainerLog': 'AzureKubernetesService',
    'ContainerLogV2': 'AzureKubernetesService',
    'KubeEvents': 'AzureKubernetesService',
    'KubePodInventory': 'AzureKubernetesService',

    // Azure Network / Firewall
    'AzureNetworkAnalytics_CL': 'AzureNetworkSecurityGroup',
    'AZFWApplicationRule': 'AzureFirewall',
    'AZFWNetworkRule': 'AzureFirewall',
    'AZFWNatRule': 'AzureFirewall',
    'AZFWThreatIntel': 'AzureFirewall',

    // DNS
    'DnsEvents': 'DNS',
    'DnsInventory': 'DNS',

    // Azure Key Vault
    'AzureKeyVaultDiagnostics': 'AzureKeyVault',
    'KeyVaultDiagnostics': 'AzureKeyVault',

    // Dynamics 365
    'Dynamics365Activity': 'Dynamics365',

    // Microsoft Defender for IoT
    'SecurityIoTRawEvent': 'MicrosoftDefenderForIoT',
    'IoTRawEvent': 'MicrosoftDefenderForIoT',
    'iotsecurityresources': 'MicrosoftDefenderForIoT',

    // Defender for Office 365 (MDO)
    'EmailEvents_CL': 'MicrosoftDefenderForOffice365',

    // Microsoft Defender Threat Intelligence
    'ThreatIntelIndicators': 'MicrosoftDefenderThreatIntelligence',

    // Microsoft 365 Insider Risk Management
    'InsiderRiskManagement': 'Microsoft365InsiderRiskManagement',

    // Microsoft Power Apps / Power BI
    'PowerAppsActivity': 'MicrosoftPowerApps',
    'PowerBIActivity': 'MicrosoftPowerBI',

    // Okta Single Sign-On
    'Okta_CL': 'OktaSSO',
    'OktaSSO_CL': 'OktaSSO',
    'OktaV2_CL': 'OktaSSO',

    // Azure Storage Account
    'StorageBlobLogs': 'AzureStorageAccount',
    'StorageQueueLogs': 'AzureStorageAccount',
    'StorageTableLogs': 'AzureStorageAccount',
    'StorageFileLogs': 'AzureStorageAccount',

    // Box Events (CCP)
    'BoxEvents_CL': 'BoxEventsCCP',

    // A365 Observability
    'A365Audit_CL': 'A365Observability',

    // Palo Alto Networks (Firewall) via AMA
    'PaloAltoNetworksCL': 'PaloAltoNetworksAMA',
    'panw_traffic_CL': 'PaloAltoNetworksAMA',
    'panw_threat_CL': 'PaloAltoNetworksAMA',

    // Windows Firewall (on-premises, NOT Azure Firewall)
    'WindowsFirewall': 'WindowsFirewall',

    // Windows Forwarded Events (separate from Security Events)
    'WindowsForwardedEvents': 'WindowsForwardedEvents',

    // Windows Security Events via AMA (separate kind from legacy)
    'SecurityEvents_CL': 'WindowsSecurityEventsAMA',

    // Windows DNS via AMA / Legacy
    'DnsEvents_CL': 'WindowsDNSEventsAMA',

    // Microsoft 365 Defender raw tables (additional)
    'DeviceNetworkInfo': 'MicrosoftDefenderForEndpoint',
    'BehaviorEntities': 'MicrosoftThreatProtection',
    'BehaviorInfo': 'MicrosoftThreatProtection',

    // Sentinel internal / UEBA / analytics (useful connectors)
    'BehaviorAnalytics': '_sentinel_analytics',
    'UserAccessAnalytics': '_sentinel_analytics',
    'UserPeerAnalytics': '_sentinel_analytics',
    'SecurityIncident': '_sentinel_internal',
    'Anomalies': '_sentinel_internal',
    'Watchlist': '_sentinel_internal',

    // System tables (filtered out in buildConnectorsFromDataTypes)
    'Heartbeat': '_system_heartbeat',
    'Usage': '_system_usage',
    'AzureMetrics': '_system_metrics',
    'W3CIISLog': '_system_iis',
    'Perf': '_system_perf',
    'InsightsMetrics': '_system_insights',
    'LAQueryLogs': '_system_querylog',
    'Operation': '_system_operation',
    'Update': '_system_update',
    'UpdateSummary': '_system_update',
    'ConfigurationData': '_system_config',
    'ConfigurationChange': '_system_config',
    'VMProcess': '_system_vm',
    'VMConnection': '_system_vm',
    'VMComputer': '_system_vm'
};

// Build heuristic connector objects from active DataType names.
// Only includes data types that map to known connectors — unmapped tables are NOT connectors.
function buildConnectorsFromDataTypes(dataTypes, lastLogMap = null) {
    const seen = new Set();
    const connectors = [];
    const unmapped = [];
    for (const dt of dataTypes) {
        const kind = DATA_TYPE_TO_CONNECTOR_KIND[dt];
        // Skip data types not in our connector mapping — they're just tables, not connectors
        if (!kind) {
            unmapped.push(dt);
            continue;
        }
        // Skip system/internal/sentinel-analytics tables and deduplicate by kind
        if (kind.startsWith('_system_') || kind.startsWith('_sentinel_') || seen.has(kind)) continue;
        seen.add(kind);
        connectors.push({
            kind,
            name: dt,
            _lastLog: lastLogMap?.get(dt) || null,
            properties: {
                friendlyName: dt,
                dataTypes: { [dt]: {} }
            }
        });
    }
    if (unmapped.length > 0) {
        console.info(`[Sentinel Planner] ${unmapped.length} active table(s) skipped (not mapped to any connector):`, unmapped);
    }
    return connectors;
}

const ACTIVE_DATA_CONNECTOR_STATES = new Set(['enabled', 'connected', 'active', 'available', 'success', 'succeeded']);
const ACTIVE_DATA_CONNECTOR_BOOLEAN_FIELDS = ['connected', 'isConnected', 'enabled', 'isEnabled'];

function normalizeDataConnectorState(value = '') {
    return String(value || '').trim().toLowerCase();
}

function isEnabledDataConnectorState(value = '') {
    return ACTIVE_DATA_CONNECTOR_STATES.has(normalizeDataConnectorState(value));
}

function hasConnectedDataTypeState(entries = []) {
    return entries.some((entry) => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }

        return isEnabledDataConnectorState(entry?.state)
            || isEnabledDataConnectorState(entry?.status)
            || isEnabledDataConnectorState(entry?.connectionState)
            || isEnabledDataConnectorState(entry?.connectivityState)
            || isEnabledDataConnectorState(entry?.ingestionState);
    });
}

function isWorkspaceDataConnectorActive(connector = {}) {
    const properties = connector?.properties || {};

    if (ACTIVE_DATA_CONNECTOR_BOOLEAN_FIELDS.some((field) => properties?.[field] === true)) {
        return true;
    }

    if (hasConnectedDataTypeState(Object.values(properties?.dataTypes || {}))) {
        return true;
    }

    if (hasConnectedDataTypeState(Array.isArray(properties?.dataTypesToConnect) ? properties.dataTypesToConnect : [])) {
        return true;
    }

    if (hasConnectedDataTypeState(Object.values(properties?.connectedDataTypes || {}))) {
        return true;
    }

    if (properties?.lastDataReceivedDataTypes && Object.keys(properties.lastDataReceivedDataTypes).length > 0) {
        return true;
    }

    return isEnabledDataConnectorState(properties?.status?.code)
        || isEnabledDataConnectorState(properties?.status)
        || isEnabledDataConnectorState(properties?.connectionState)
        || isEnabledDataConnectorState(properties?.connectivityState);
}

function filterActiveWorkspaceDataConnectors(connectors = []) {
    return (Array.isArray(connectors) ? connectors : []).filter((connector) => isWorkspaceDataConnectorActive(connector));
}

function normalizeWorkspaceConnectorKey(value = '') {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getWorkspaceConnectorIdentityKeys(connector = {}) {
    const keys = new Set();
    [
        connector?.kind,
        connector?.properties?.connectorDefinitionName,
        connector?.properties?.friendlyName,
        connector?.name
    ].forEach((value) => {
        const normalizedValue = normalizeWorkspaceConnectorKey(value);
        if (normalizedValue) {
            keys.add(normalizedValue);
        }
    });
    return Array.from(keys);
}

function deduplicateConnectors(...connectorGroups) {
    const merged = [];
    const seenKeys = new Set();

    connectorGroups.flat().forEach((connector) => {
        if (!connector || typeof connector !== 'object') {
            return;
        }

        const identityKeys = getWorkspaceConnectorIdentityKeys(connector);
        if (identityKeys.some((key) => seenKeys.has(key))) {
            return;
        }

        const fallbackKey = identityKeys.length === 0 ? `connector-${merged.length + 1}` : null;
        [...identityKeys, ...(fallbackKey ? [fallbackKey] : [])].forEach((key) => seenKeys.add(key));
        merged.push(connector);
    });

    return merged;
}

// Map of API connector kinds to the equivalent table-derived kinds they cover.
// When an API resource has kind X, any table-derived connector with a covered kind
// should NOT be double-counted.
const API_KIND_COVERS_TABLE_KIND = {
    'azuresecuritycenter': ['microsoftdefenderforcloud'],
    'microsoftthreatintelligence': ['microsoftdefenderthreatintelligence', 'threatintelligence'],
    'threatintelligence': ['microsoftdefenderthreatintelligence'],
    'microsoftdefenderadvancedthreatprotection': ['microsoftdefenderforcloud'],
    'azureadvancedthreatprotection': ['microsoftdefenderforidentity'],
    'iotsecurity': ['microsoftdefenderforiot'],
    'iot': ['microsoftdefenderforiot']
};

function getMostRecentIsoTimestamp(candidates = []) {
    let bestIso = '';
    let bestTime = Number.NEGATIVE_INFINITY;

    (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
        if (!candidate) {
            return;
        }
        const iso = String(candidate).trim();
        if (!iso) {
            return;
        }
        const parsedTime = new Date(iso).getTime();
        if (!Number.isFinite(parsedTime) || parsedTime <= bestTime) {
            return;
        }
        bestIso = iso;
        bestTime = parsedTime;
    });

    return bestIso || null;
}

function getConnectorUsageLastLog(connector = {}, lastLogMap = null) {
    if (!(lastLogMap instanceof Map) || lastLogMap.size === 0) {
        return null;
    }

    const properties = connector?.properties || {};
    const dataTypeNames = [
        ...Object.keys(properties?.dataTypes || {}),
        ...(Array.isArray(properties?.dataTypesToConnect)
            ? properties.dataTypesToConnect.map((entry) => entry?.name).filter(Boolean)
            : [])
    ];

    return getMostRecentIsoTimestamp(dataTypeNames.map((dataTypeName) => lastLogMap.get(dataTypeName) || null));
}

function getConnectorReportedLastLog(connector = {}) {
    const properties = connector?.properties || {};
    const directReportedLastLog = getMostRecentIsoTimestamp([
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
        properties?.status?.lastLog
    ]);
    const lastDataReceivedDataTypes = properties?.lastDataReceivedDataTypes;
    if (!lastDataReceivedDataTypes || typeof lastDataReceivedDataTypes !== 'object') {
        return directReportedLastLog;
    }

    return getMostRecentIsoTimestamp([
        directReportedLastLog,
        ...Object.values(lastDataReceivedDataTypes).map((value) => {
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
    ]);
}

function attachConnectorLastLogMetadata(connector = {}, lastLogMap = null) {
    if (!connector || typeof connector !== 'object') {
        return connector;
    }

    const lastLog = getMostRecentIsoTimestamp([
        connector?._lastLog,
        getConnectorUsageLastLog(connector, lastLogMap),
        getConnectorReportedLastLog(connector)
    ]);

    return lastLog ? { ...connector, _lastLog: lastLog } : connector;
}

function selectWorkspaceDiscoveryConnectors(apiConnectors = [], dataTypes = [], lastLogMap = null) {
    // Step 1: Deduplicate API connectors by unique resource ID only.
    // Each API resource represents a distinct configured connector product,
    // even if multiple products share the same generic kind (e.g., RestApiPoller, GenericUI).
    const seenResourceIds = new Set();
    const uniqueApiConnectors = [];
    for (const c of apiConnectors) {
        if (!c || typeof c !== 'object') continue;
        // Use the full ARM resource id (or name if id is absent) as the dedup key
        const resourceId = normalizeWorkspaceConnectorKey(c.id || c.name || '');
        if (!resourceId || seenResourceIds.has(resourceId)) continue;
        seenResourceIds.add(resourceId);
        uniqueApiConnectors.push(attachConnectorLastLogMetadata(c, lastLogMap));
    }

    const tableConnectors = buildConnectorsFromDataTypes(dataTypes, lastLogMap);
    const usedTableFallback = uniqueApiConnectors.length === 0 && tableConnectors.length > 0;

    if (usedTableFallback) {
        return { uniqueApiConnectors, tableConnectors, discoveryConnectors: tableConnectors, usedTableFallback };
    }

    // Step 2: Build a set of table-derived kinds that are already covered by API resources.
    // Uses both the API resource kind and connectorDefinitionName to catch overlaps.
    const apiCoveredTableKinds = new Set();
    for (const c of uniqueApiConnectors) {
        const kind = normalizeWorkspaceConnectorKey(c.kind);
        const defName = normalizeWorkspaceConnectorKey(c.properties?.connectorDefinitionName);

        // The API kind itself might directly match a table-derived kind
        if (kind) apiCoveredTableKinds.add(kind);
        // connectorDefinitionName often matches the table-derived kind exactly
        if (defName) apiCoveredTableKinds.add(defName);

        // Also add any equivalent table kinds this API kind covers
        const equivalents = API_KIND_COVERS_TABLE_KIND[kind] || [];
        equivalents.forEach(eq => apiCoveredTableKinds.add(eq));
    }

    // Step 3: Only supplement with table connectors whose kind is NOT already
    // represented by an API resource. This prevents double-counting products.
    const supplementalConnectors = tableConnectors.filter(tc => {
        const kind = normalizeWorkspaceConnectorKey(tc.kind);
        return kind && !apiCoveredTableKinds.has(kind);
    });

    const discoveryConnectors = [...uniqueApiConnectors, ...supplementalConnectors];

    return {
        uniqueApiConnectors,
        tableConnectors,
        discoveryConnectors,
        usedTableFallback
    };
}

function logWorkspaceConnectorSummary(summary = {}) {
    if (!summary || typeof summary !== 'object') {
        return;
    }

    const connectorCount = summary.discoveryConnectorCount || 0;
    const usageSourceLabel = summary.dataTypeDiscoverySource ? `\n  - Table analysis source: ${summary.dataTypeDiscoverySource}` : '';
    const summaryLines = summary.usedTableFallback
        ? [
            `[Sentinel Planner] Connector Summary:\n  - API returned: ${summary.apiConnectorCount || 0} connector resource(s)\n  - Using heuristic fallback from active tables: ${connectorCount} estimated connector(s)\n  - Mapped to solutions: ${summary.mappedConnectorCount || 0} connector(s) (covering ${summary.mappedSolutionIdCount || 0} solution ID(s))\n  - Unmatched (shown as "Other"): ${summary.unmatchedConnectorCount || 0}\n  - Total shown in topology: ${summary.totalShownInTopology || 0}${usageSourceLabel}`
        ]
        : [
            `[Sentinel Planner] Connector Summary:\n  - API returned: ${summary.apiConnectorCount || 0} connector resource(s) (${summary.uniqueApiConnectorCount || 0} unique)\n  - Mapped to solutions: ${summary.mappedConnectorCount || 0} connector(s) (covering ${summary.mappedSolutionIdCount || 0} solution ID(s))\n  - Unmatched (shown as "Other"): ${summary.unmatchedConnectorCount || 0}\n  - Total shown in topology: ${summary.totalShownInTopology || 0}\n  - Active confidence signals: ${summary.activeApiConnectorCount || 0}${usageSourceLabel}`
        ];

    console.info(summaryLines[0]);
}

function buildWorkspaceConnectorStatusMessage(workspaceName, discoveryResult = {}, { reconnected = false } = {}) {
    const resolvedCount = discoveryResult?.connectedIds?.size
        ?? (Number(discoveryResult?.summary?.mappedSolutionIdCount) || 0);
    return `${reconnected ? 'Reconnected' : 'Connected'} — ${formatCountLabel(resolvedCount, 'data source')} detected in ${workspaceName}.`;
}

function buildWorkspaceDiscoveryDiagnosticMessage(summary = {}, unmatchedCount = 0) {
    const discoveryCount = Number(summary?.discoveryConnectorCount) || 0;
    const apiCount = Number(summary?.uniqueApiConnectorCount) || 0;
    const additionalTableCount = Number(summary?.additionalTableConnectorCount) || 0;
    const tableFallbackTableCount = Number(summary?.tableFallbackTableCount) || 0;
    const tableSourceSuffix = summary?.dataTypeDiscoverySource === 'usage-loganalytics'
        ? ' via Log Analytics fallback'
        : '';

    let diagnostic;
    if (summary?.tableAnalysisAvailable) {
        diagnostic = `✓ ${formatCountLabel(discoveryCount, 'active data source')} detected (${formatCountLabel(apiCount, 'ARM connector')} + ${additionalTableCount} from table analysis${tableSourceSuffix})`;
    } else if (tableFallbackTableCount > 0) {
        diagnostic = `⚠ Active table analysis unavailable — using ${formatCountLabel(tableFallbackTableCount, 'workspace table')} as a fallback estimate`;
    } else {
        diagnostic = `⚠ Table analysis unavailable — showing only ${formatCountLabel(apiCount, 'ARM-discovered connector')}`;
    }

    if (unmatchedCount > 0) {
        diagnostic += ` · ${formatCountLabel(unmatchedCount, 'unmatched connector')} shown as Other`;
    }

    return diagnostic;
}

function updateWorkspaceDiscoveryStatus(workspaceName, discoveryResult = {}, { reconnected = false } = {}) {
    const summary = discoveryResult?.summary || {};
    const primaryMessage = buildWorkspaceConnectorStatusMessage(workspaceName, discoveryResult, { reconnected });

    setWorkspaceStatusHtml(
        `<span class="workspace-status__primary">${escapeHtml(primaryMessage)}</span>`,
        'success'
    );
}

async function restorePreviousWorkspaceSelection(savedWorkspace) {
    if (!savedWorkspace || typeof savedWorkspace !== 'object') {
        return { restored: false, reason: 'missing-workspace' };
    }

    const {
        subscriptionId = '',
        resourceGroupName = '',
        workspaceName = ''
    } = savedWorkspace;

    if (!subscriptionId || !resourceGroupName || !workspaceName) {
        return { restored: false, reason: 'incomplete-workspace' };
    }

    const subscriptionExists = workspaceConnectionState.subscriptions.some(
        (subscription) => subscription?.subscriptionId === subscriptionId
    );
    if (!subscriptionExists) {
        return { restored: false, reason: 'subscription-missing' };
    }

    const subscriptionSelect = document.getElementById('subscriptionSelect');
    if (subscriptionSelect) {
        subscriptionSelect.value = subscriptionId;
    }
    await onSubscriptionChange();

    const resourceGroupExists = workspaceConnectionState.resourceGroups.some(
        (resourceGroup) => resourceGroup?.name === resourceGroupName
    );
    if (!resourceGroupExists) {
        return { restored: false, reason: 'resource-group-missing' };
    }

    const resourceGroupSelect = document.getElementById('rgSelect');
    if (resourceGroupSelect) {
        resourceGroupSelect.value = resourceGroupName;
    }
    await onRgChange();

    const workspaceExists = workspaceConnectionState.workspaces.some(
        (workspace) => workspace?.name === workspaceName
    );
    if (!workspaceExists) {
        return { restored: false, reason: 'workspace-missing' };
    }

    const workspaceSelect = document.getElementById('workspaceSelect');
    if (workspaceSelect) {
        workspaceSelect.value = workspaceName;
    }
    await onWorkspaceChange();

    return workspaceConnectionState.selectedWorkspace?.workspaceName === workspaceName
        ? { restored: true, reason: 'restored' }
        : { restored: false, reason: 'workspace-validation-failed' };
}

async function copyTokenCmd() {
    try {
        await navigator.clipboard.writeText(AZURE_TOKEN_COMMAND);
        setWorkspaceStatus('Token command copied to your clipboard.', 'success');
    } catch (error) {
        console.warn('Clipboard copy failed:', error);
        window.prompt('Copy this command:', AZURE_TOKEN_COMMAND);
    }
}

async function connectWithToken() {
    const token = document.getElementById('tokenInput')?.value.trim();
    const connectButton = document.getElementById('connectBtn');
    const previousWorkspace = workspaceConnectionState.selectedWorkspace && typeof workspaceConnectionState.selectedWorkspace === 'object'
        ? { ...workspaceConnectionState.selectedWorkspace }
        : null;

    if (!token) {
        setWorkspaceStatus('Please paste an access token first.', 'error');
        return;
    }

    connectButton?.setAttribute('disabled', 'true');
    resetWorkspaceValidationState();

    // Early check: reject already-expired tokens with a clear message
    const tokenExpiry = getTokenExpiryFromJwt(token);
    if (tokenExpiry && isTimestampExpired(tokenExpiry)) {
        connectButton?.removeAttribute('disabled');
        setWorkspaceStatus('This token is already expired. Run the command above to generate a fresh token and paste it here.', 'error');
        return;
    }

    setWorkspaceStatus('Connecting to Azure and loading subscriptions...');
    resetSelect('subscriptionSelect', 'Loading subscriptions...');
    resetSelect('rgSelect', 'Select subscription first');
    resetSelect('workspaceSelect', 'Select resource group first');

    try {
        workspaceConnectionState.accessToken = token;
        workspaceConnectionState.tokenExpiresAt = tokenExpiry;
        persistSessionToken(token);

        const data = await azureFetch('https://management.azure.com/subscriptions?api-version=2022-12-01');
        workspaceConnectionState.subscriptions = Array.isArray(data.value) ? data.value : [];

        populateSelect(
            'subscriptionSelect',
            workspaceConnectionState.subscriptions,
            '-- Select subscription --',
            (subscription) => subscription.subscriptionId,
            (subscription) => subscription.displayName
        );

        syncWorkspaceConnectUi({ showPicker: true });
        setConnectedSolutionIds([]);
        window.connectedWorkspace = null;
        window.connectedSolutions = [];

        updatePersistedWorkspaceConnection({
            status: 'connected',
            tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
            selectedWorkspace: null,
            warningMessage: '',
            lastValidatedAt: new Date().toISOString()
        });

        if (!previousWorkspace) {
            setWorkspaceStatus(`Connected. Found ${workspaceConnectionState.subscriptions.length} subscription(s).`, 'success');
            return;
        }

        setWorkspaceStatus('Connected. Restoring your previous workspace selection...');
        const restoreResult = await restorePreviousWorkspaceSelection(previousWorkspace);
        if (restoreResult.restored) {
            return;
        }

        const fallbackMessages = {
            'subscription-missing': 'Connected, but your previous subscription is no longer available. Choose a subscription to continue.',
            'resource-group-missing': 'Connected and restored the subscription, but your previous resource group is unavailable. Choose a resource group to continue.',
            'workspace-missing': 'Connected and restored the resource group, but your previous workspace is unavailable. Choose a workspace to continue.'
        };

        if (fallbackMessages[restoreResult.reason]) {
            setWorkspaceStatus(fallbackMessages[restoreResult.reason], 'warning');
        }
    } catch (error) {
        console.error('Workspace connection failed:', error);

        // During initial connect, always reset and show an appropriate error —
        // even if azureFetch internally marked the connection as "expired" (401).
        workspaceConnectionState.accessToken = '';
        workspaceConnectionState.tokenExpiresAt = '';
        workspaceConnectionState.subscriptions = [];
        workspaceConnectionState.resourceGroups = [];
        workspaceConnectionState.workspaces = [];
        workspaceConnectionState.selectedWorkspace = previousWorkspace;
        setConnectedSolutionIds([]);
        window.connectedWorkspace = null;
        window.connectedSolutions = [];
        syncWorkspaceConnectUi({ showPicker: false });
        updatePersistedWorkspaceConnection({
            status: 'disconnected',
            tokenExpiresAt: '',
            selectedWorkspace: previousWorkspace,
            warningMessage: '',
            lastValidatedAt: ''
        });
        setWorkspaceStatus('This token was rejected by Azure. Generate a fresh token using the command above and paste it here.', 'error');
    } finally {
        connectButton?.removeAttribute('disabled');
    }
}

async function onSubscriptionChange() {
    const subscriptionId = document.getElementById('subscriptionSelect')?.value;
    resetWorkspaceValidationState();
    resetSelect('rgSelect', 'Loading resource groups...');
    resetSelect('workspaceSelect', 'Select resource group first');
    workspaceConnectionState.workspaces = [];
    workspaceConnectionState.selectedWorkspace = null;
    setConnectedSolutionIds([]);
    window.connectedWorkspace = null;
    window.connectedSolutions = [];

    updatePersistedWorkspaceConnection({
        status: 'connected',
        tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
        selectedWorkspace: null,
        warningMessage: '',
        lastValidatedAt: workspaceConnectionState.lastValidatedAt
    });

    if (!subscriptionId) {
        workspaceConnectionState.resourceGroups = [];
        setWorkspaceStatus('Choose a subscription to continue.');
        return;
    }

    try {
        const data = await azureFetch(`https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2022-12-01`);
        workspaceConnectionState.resourceGroups = Array.isArray(data.value) ? data.value : [];

        populateSelect(
            'rgSelect',
            workspaceConnectionState.resourceGroups,
            '-- Select resource group --',
            (resourceGroup) => resourceGroup.name,
            (resourceGroup) => resourceGroup.name
        );

        setWorkspaceStatus(`Loaded ${workspaceConnectionState.resourceGroups.length} resource group(s).`);
    } catch (error) {
        console.error('Failed to load resource groups:', error);
        if (workspaceConnectionState.status === 'expired') {
            return;
        }

        workspaceConnectionState.resourceGroups = [];
        setWorkspaceStatus('Unable to load resource groups for that subscription.', 'error');
        resetSelect('rgSelect', 'Error loading resource groups');
    }
}

async function onRgChange() {
    const subscriptionId = document.getElementById('subscriptionSelect')?.value;
    const resourceGroupName = document.getElementById('rgSelect')?.value;
    resetWorkspaceValidationState();
    resetSelect('workspaceSelect', 'Checking for Sentinel workspaces...');
    workspaceConnectionState.selectedWorkspace = null;
    setConnectedSolutionIds([]);
    window.connectedWorkspace = null;
    window.connectedSolutions = [];

    updatePersistedWorkspaceConnection({
        status: 'connected',
        tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
        selectedWorkspace: null,
        warningMessage: '',
        lastValidatedAt: workspaceConnectionState.lastValidatedAt
    });

    if (!subscriptionId || !resourceGroupName) {
        workspaceConnectionState.workspaces = [];
        setWorkspaceStatus('Choose a resource group to load workspaces.');
        return;
    }

    try {
        const data = await azureFetch(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces?api-version=2022-10-01`);
        const allWorkspaces = Array.isArray(data.value) ? data.value : [];

        // Filter to only workspaces with Microsoft Sentinel enabled
        const sentinelChecks = allWorkspaces.map(async (ws) => {
            try {
                const solUrl = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationsManagement/solutions/SecurityInsights(${ws.name})?api-version=2015-11-01-preview`;
                await azureFetch(solUrl);
                return ws; // Sentinel solution exists
            } catch {
                return null; // No Sentinel on this workspace
            }
        });

        const results = await Promise.all(sentinelChecks);
        workspaceConnectionState.workspaces = results.filter(ws => ws !== null);

        populateSelect(
            'workspaceSelect',
            workspaceConnectionState.workspaces,
            '-- Select workspace --',
            (workspace) => workspace.name,
            (workspace) => workspace.name
        );

        if (workspaceConnectionState.workspaces.length === 0 && allWorkspaces.length > 0) {
            setWorkspaceStatus(`Found ${allWorkspaces.length} Log Analytics workspace(s), but none have Microsoft Sentinel enabled.`, 'warning');
        } else if (workspaceConnectionState.workspaces.length === 0) {
            setWorkspaceStatus('No workspaces found in this resource group.', 'warning');
        } else {
            setWorkspaceStatus(`Loaded ${workspaceConnectionState.workspaces.length} Sentinel workspace(s).`);
        }
    } catch (error) {
        console.error('Failed to load workspaces:', error);
        if (workspaceConnectionState.status === 'expired') {
            return;
        }

        workspaceConnectionState.workspaces = [];
        setWorkspaceStatus('Unable to load Sentinel workspaces for that resource group.', 'error');
        resetSelect('workspaceSelect', 'Error loading workspaces');
    }
}

async function onWorkspaceChange() {
    const subscriptionId = document.getElementById('subscriptionSelect')?.value;
    const resourceGroupName = document.getElementById('rgSelect')?.value;
    const workspaceName = document.getElementById('workspaceSelect')?.value;

    if (!subscriptionId || !resourceGroupName || !workspaceName) {
        resetWorkspaceValidationState();
        workspaceConnectionState.selectedWorkspace = null;
        setConnectedSolutionIds([]);
        window.connectedWorkspace = null;
        window.connectedSolutions = [];
        updatePersistedWorkspaceConnection({
            status: 'connected',
            tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
            selectedWorkspace: null,
            warningMessage: '',
            lastValidatedAt: workspaceConnectionState.lastValidatedAt
        });
        setWorkspaceStatus('Choose a workspace to load existing connectors.');
        return;
    }

    workspaceConnectionState.selectedWorkspace = null;
    setConnectedSolutionIds([]);
    window.connectedWorkspace = null;
    window.connectedSolutions = [];
    updatePersistedWorkspaceConnection({
        status: 'connected',
        tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
        selectedWorkspace: null,
        warningMessage: '',
        lastValidatedAt: workspaceConnectionState.lastValidatedAt
    });

    const validationRequestId = beginWorkspaceValidation();
    setWorkspaceStatus(`Loading connected data sources from ${workspaceName}...`);

    try {
        // Strategy: trust Sentinel dataConnector resources first, then supplement with active-table
        // discovery for integrations that do not create ARM connector resources.
        // 1. dataConnectors API (2024-09-01) — configured workspace connectors
        // 2. Workspace query — active table scan to supplement missing first-party connectors
        // 3. Fallback: Tables ARM API (GET) — lists provisioned tables when the query APIs fail
        const [connectors, activeDataTypes] = await Promise.all([
            azureFetchAll(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}/providers/Microsoft.SecurityInsights/dataConnectors?api-version=2024-09-01`),
            loadWorkspaceActiveDataTypes(subscriptionId, resourceGroupName, workspaceName)
        ]);

        const {
            usageQueryFailed,
            dataTypeList,
            lastLogMap,
            dataTypeDiscoverySource,
            tableAnalysisAvailable,
            tableFallbackTableCount
        } = normalizeWorkspaceActiveDataTypes(activeDataTypes);
        const allApiConnectors = Array.isArray(connectors) ? connectors : [];
        const activeConnectorResources = filterActiveWorkspaceDataConnectors(allApiConnectors);
        const {
            uniqueApiConnectors,
            tableConnectors,
            discoveryConnectors,
            usedTableFallback
        } = selectWorkspaceDiscoveryConnectors(allApiConnectors, dataTypeList, lastLogMap);
        const additionalTableConnectorCount = Math.max(0, discoveryConnectors.length - uniqueApiConnectors.length);

        if (usedTableFallback) {
            console.warn(`[Sentinel Planner] Workspace discovery: dataConnectors API returned 0 connector resources, so ${tableConnectors.length} active-table heuristic connector(s) will be used as estimates.`);
        } else {
            console.info(`[Sentinel Planner] Workspace discovery: ${uniqueApiConnectors.length} connector resource(s) from API + ${additionalTableConnectorCount} additional connector(s) from active tables = ${discoveryConnectors.length} total. Active confidence signals: ${activeConnectorResources.length}.`);
        }

        // Log the full list of detected connectors for comparison with portal
        console.info(`[Sentinel Planner] Detected connectors (${discoveryConnectors.length}):\n` +
            discoveryConnectors.map((c, i) => `  ${i + 1}. ${c.properties?.displayName || c.name || c.kind || 'Unknown'} (kind: ${c.kind || 'N/A'})`).join('\n'));

        if (validationRequestId !== workspaceConnectionState.workspaceValidationRequestId) {
            return;
        }

        const discoveryResult = setConnectedSolutionsFromWorkspace(discoveryConnectors, {
            apiConnectorCount: allApiConnectors.length,
            uniqueApiConnectorCount: uniqueApiConnectors.length,
            activeApiConnectorCount: activeConnectorResources.length,
            tableConnectorCount: tableConnectors.length,
            additionalTableConnectorCount,
            discoveryConnectorCount: discoveryConnectors.length,
            tableConnectorLastLogs: tableConnectors
                .filter((connector) => connector?._lastLog)
                .map((connector) => ({
                    kind: connector.kind,
                    name: connector.name,
                    lastLog: connector._lastLog
                })),
            usageQueryFailed,
            usedTableFallback,
            dataTypeDiscoverySource,
            tableAnalysisAvailable,
            tableFallbackTableCount
        });
        const connectedIds = discoveryResult.connectedIds;
        logWorkspaceConnectorSummary(discoveryResult.summary);
        updateWorkspaceDiscoveryStatus(workspaceName, discoveryResult);

        workspaceConnectionState.selectedWorkspace = {
            subscriptionId,
            resourceGroupName,
            workspaceName
        };
        window.connectedWorkspace = workspaceConnectionState.selectedWorkspace;
        window.connectedSolutions = Array.from(connectedIds);

        // Fire discovery — renderTopologyStep will await this promise
        window._infraDiscoveryPromise = discoverExistingInfrastructure(subscriptionId, resourceGroupName, workspaceName)
            .then(() => {
                console.info('[Sentinel Planner] Infrastructure discovery complete:', window.discoveredInfrastructure?.summary);
            })
            .catch((err) => {
                console.warn('[Sentinel Planner] Infrastructure discovery failed (non-fatal):', err.message);
                window.discoveredInfrastructure = { vms: [], summary: { totalVMs: 0 }, status: 'failed' };
            })
            .finally(() => { window._infraDiscoveryPromise = null; });

        if (getCurrentStep() === 4) {
            renderTopologyStep();
        }

        updatePersistedWorkspaceConnection({
            status: 'connected',
            tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
            selectedWorkspace: workspaceConnectionState.selectedWorkspace,
            warningMessage: '',
            lastValidatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Failed to load existing connectors:', error);
        if (validationRequestId !== workspaceConnectionState.workspaceValidationRequestId || workspaceConnectionState.status === 'expired') {
            return;
        }

        workspaceConnectionState.selectedWorkspace = null;
        window.connectedWorkspace = null;
        window.connectedSolutions = [];
        setConnectedSolutionIds([]);
        updatePersistedWorkspaceConnection({
            status: 'connected',
            tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
            selectedWorkspace: null,
            warningMessage: '',
            lastValidatedAt: workspaceConnectionState.lastValidatedAt
        });

        // Provide a more helpful error based on the status code
        const status = error?.status || error?.response?.status;
        if (status === 403 || status === 401) {
            setWorkspaceStatus('Connected to Azure, but you don\'t have permission to read connectors in that workspace. Check your role assignments (needs Microsoft Sentinel Reader or higher).', 'error');
        } else if (status === 404) {
            setWorkspaceStatus('Connected to Azure, but Microsoft Sentinel does not appear to be enabled on that workspace.', 'error');
        } else {
            setWorkspaceStatus('Connected to Azure, but connector discovery failed for that workspace. This may be a permissions issue or Sentinel may not be deployed there.', 'error');
        }
    } finally {
        completeWorkspaceValidation(validationRequestId);
    }
}

async function autoReconnectFromSession() {
    const savedWorkspace = workspaceConnectionState.selectedWorkspace;
    if (!workspaceConnectionState.accessToken || !savedWorkspace) {
        return false;
    }

    const { subscriptionId, resourceGroupName, workspaceName } = savedWorkspace;
    if (!subscriptionId || !resourceGroupName || !workspaceName) {
        return false;
    }

    const validationRequestId = beginWorkspaceValidation();
    console.log('[Sentinel Planner] Auto-reconnecting from session...');
    setWorkspaceStatus('Restoring your previous connection...', 'success');

    try {
        // Fetch subscriptions
        const subData = await azureFetch('https://management.azure.com/subscriptions?api-version=2022-12-01');
        workspaceConnectionState.subscriptions = Array.isArray(subData.value) ? subData.value : [];
        populateSelect('subscriptionSelect', workspaceConnectionState.subscriptions, '-- Select subscription --',
            (s) => s.subscriptionId, (s) => s.displayName);

        // Fetch resource groups
        const rgData = await azureFetch(`https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2022-12-01`);
        workspaceConnectionState.resourceGroups = Array.isArray(rgData.value) ? rgData.value : [];
        populateSelect('rgSelect', workspaceConnectionState.resourceGroups, '-- Select resource group --',
            (rg) => rg.name, (rg) => rg.name);

        // Fetch workspaces
        const wsData = await azureFetch(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces?api-version=2022-10-01`);
        workspaceConnectionState.workspaces = Array.isArray(wsData.value) ? wsData.value : [];
        populateSelect('workspaceSelect', workspaceConnectionState.workspaces, '-- Select workspace --',
            (ws) => ws.name, (ws) => ws.name);

        // Show picker BEFORE setting values (some browsers don't visually update hidden selects)
        syncWorkspaceConnectUi({ showPicker: true });

        // Now set the remembered selections (picker is visible)
        const subSelect = document.getElementById('subscriptionSelect');
        if (subSelect) { subSelect.value = subscriptionId; }
        const rgSelect = document.getElementById('rgSelect');
        if (rgSelect) { rgSelect.value = resourceGroupName; }
        const wsSelect = document.getElementById('workspaceSelect');
        if (wsSelect) { wsSelect.value = workspaceName; }

        // Fetch connectors + active data tables (same strategy as onWorkspaceChange)
        const [connectors, activeDataTypes] = await Promise.all([
            azureFetchAll(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}/providers/Microsoft.SecurityInsights/dataConnectors?api-version=2024-09-01`),
            loadWorkspaceActiveDataTypes(subscriptionId, resourceGroupName, workspaceName)
        ]);

        const {
            usageQueryFailed,
            dataTypeList,
            lastLogMap,
            dataTypeDiscoverySource,
            tableAnalysisAvailable,
            tableFallbackTableCount
        } = normalizeWorkspaceActiveDataTypes(activeDataTypes);
        const allApiConnectors = Array.isArray(connectors) ? connectors : [];
        const activeConnectorResources = filterActiveWorkspaceDataConnectors(allApiConnectors);
        const {
            uniqueApiConnectors,
            tableConnectors,
            discoveryConnectors,
            usedTableFallback
        } = selectWorkspaceDiscoveryConnectors(allApiConnectors, dataTypeList, lastLogMap);
        const additionalTableConnectorCount = Math.max(0, discoveryConnectors.length - uniqueApiConnectors.length);

        if (usedTableFallback) {
            console.warn(`[Sentinel Planner] Auto-reconnect: dataConnectors API returned 0 connector resources, so ${tableConnectors.length} active-table heuristic connector(s) will be used as estimates.`);
        } else {
            console.info(`[Sentinel Planner] Auto-reconnect: ${uniqueApiConnectors.length} connector resource(s) from API + ${additionalTableConnectorCount} additional connector(s) from active tables = ${discoveryConnectors.length} total. Active confidence signals: ${activeConnectorResources.length}.`);
        }

        // Log the full list of detected connectors for comparison with portal
        console.info(`[Sentinel Planner] Detected connectors (${discoveryConnectors.length}):\n` +
            discoveryConnectors.map((c, i) => `  ${i + 1}. ${c.properties?.displayName || c.name || c.kind || 'Unknown'} (kind: ${c.kind || 'N/A'})`).join('\n'));

        const discoveryResult = setConnectedSolutionsFromWorkspace(discoveryConnectors, {
            apiConnectorCount: allApiConnectors.length,
            uniqueApiConnectorCount: uniqueApiConnectors.length,
            activeApiConnectorCount: activeConnectorResources.length,
            tableConnectorCount: tableConnectors.length,
            additionalTableConnectorCount,
            discoveryConnectorCount: discoveryConnectors.length,
            tableConnectorLastLogs: tableConnectors
                .filter((connector) => connector?._lastLog)
                .map((connector) => ({
                    kind: connector.kind,
                    name: connector.name,
                    lastLog: connector._lastLog
                })),
            usageQueryFailed,
            usedTableFallback,
            dataTypeDiscoverySource,
            tableAnalysisAvailable,
            tableFallbackTableCount
        });
        const connectedIds = discoveryResult.connectedIds;
        logWorkspaceConnectorSummary(discoveryResult.summary);
        updateWorkspaceDiscoveryStatus(workspaceName, discoveryResult, { reconnected: true });

        workspaceConnectionState.selectedWorkspace = savedWorkspace;
        window.connectedWorkspace = savedWorkspace;
        window.connectedSolutions = Array.from(connectedIds);

        // Fire discovery — renderTopologyStep will await this promise
        window._infraDiscoveryPromise = discoverExistingInfrastructure(subscriptionId, resourceGroupName, workspaceName)
            .then(() => {
                console.info('[Sentinel Planner] Infrastructure discovery complete:', window.discoveredInfrastructure?.summary);
            })
            .catch((err) => {
                console.warn('[Sentinel Planner] Infrastructure discovery failed (non-fatal):', err.message);
                window.discoveredInfrastructure = { vms: [], summary: { totalVMs: 0 }, status: 'failed' };
            })
            .finally(() => { window._infraDiscoveryPromise = null; });

        if (getCurrentStep() === 4) {
            renderTopologyStep();
        }

        updatePersistedWorkspaceConnection({
            status: 'connected',
            tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
            selectedWorkspace: savedWorkspace,
            warningMessage: '',
            lastValidatedAt: new Date().toISOString()
        });

        console.log('[Sentinel Planner] Auto-reconnect successful.');
        return true;
    } catch (error) {
        console.warn('[Sentinel Planner] Auto-reconnect failed:', error.message);
        // Check if this was an auth/expired issue vs a transient network error
        if (error.message === WORKSPACE_CONNECTION_EXPIRED_MESSAGE || error?.status === 401) {
            markWorkspaceConnectionExpired({ message: 'Your session token has expired. Please paste a new token to reconnect.' });
            renderWorkspaceConnectionBanner();
        }
        return false;
    } finally {
        completeWorkspaceValidation(validationRequestId);
    }
}

window.copyTokenCmd = copyTokenCmd;
window.connectWithToken = connectWithToken;
window.onSubscriptionChange = onSubscriptionChange;
window.onRgChange = onRgChange;
window.onWorkspaceChange = onWorkspaceChange;

document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    bindRemoteLogoFallbacks();
    hydrateWorkspaceConnectionState(readJsonFromStorage(WORKSPACE_CONNECTION_STATE_STORAGE_KEY, null));

    // Restore token from sessionStorage if still valid (survives page refresh within same tab)
    const restoredToken = restoreSessionToken();
    if (restoredToken && !isTimestampExpired(workspaceConnectionState.tokenExpiresAt)) {
        workspaceConnectionState.accessToken = restoredToken;
        const tokenInput = document.getElementById('tokenInput');
        if (tokenInput) {
            tokenInput.value = restoredToken;
        }
    } else if (restoredToken) {
        persistSessionToken('');
    }

    syncWorkspaceConnectUi({ showPicker: false });
    renderWorkspaceConnectionBanner();

    document.getElementById('workspaceConnectionReconnect')?.addEventListener('click', reconnectWorkspaceConnection);
    document.getElementById('workspaceConnectionDismiss')?.addEventListener('click', dismissWorkspaceConnectionWarning);

    await loadSolutionData();

    restoreSelectedVendors();
    window.connectedWorkspace = null;
    window.connectedSolutions = [];

    // If we have a valid session token, try to auto-reconnect silently
    if (restoredToken && !isTimestampExpired(workspaceConnectionState.tokenExpiresAt)) {
        workspaceConnectionState.accessToken = restoredToken;
        const autoConnected = await autoReconnectFromSession();
        if (autoConnected) {
            // Successfully reconnected — skip the expired/disconnected path
            renderWorkspaceConnectionBanner();
        } else {
            // Auto-reconnect failed but token is valid — show status and enable manual reconnect
            setConnectedSolutionIds([]);
            syncWorkspaceConnectUi({ showPicker: false });
            setWorkspaceStatus('Auto-reconnect failed. Your token is still valid — click "Connect with Token" to retry.', 'warning');
        }
    } else {
        const restoredConnectedSolutionIds = readJsonFromStorage(CONNECTED_SOLUTIONS_STORAGE_KEY, null);
        if (Array.isArray(restoredConnectedSolutionIds) && restoredConnectedSolutionIds.length > 0) {
            markWorkspaceConnectionExpired();
            setConnectedSolutionIds(restoredConnectedSolutionIds);
        } else {
            setConnectedSolutionIds([]);

            if (workspaceConnectionState.status === 'expired' || isTimestampExpired(workspaceConnectionState.tokenExpiresAt)) {
                updatePersistedWorkspaceConnection({
                    status: 'expired',
                    tokenExpiresAt: workspaceConnectionState.tokenExpiresAt,
                    selectedWorkspace: workspaceConnectionState.selectedWorkspace,
                    warningMessage: workspaceConnectionState.warningMessage || WORKSPACE_CONNECTION_EXPIRED_MESSAGE,
                    lastValidatedAt: workspaceConnectionState.lastValidatedAt || new Date().toISOString()
                });
                setWorkspaceStatus(workspaceConnectionState.warningMessage || WORKSPACE_CONNECTION_EXPIRED_MESSAGE, 'warning');
            } else {
                updatePersistedWorkspaceConnection({
                    status: 'disconnected',
                    tokenExpiresAt: '',
                    selectedWorkspace: null,
                    warningMessage: '',
                    lastValidatedAt: workspaceConnectionState.lastValidatedAt
                });
            }
        }
    }

    document.querySelectorAll('[data-next]').forEach((button) => {
        button.addEventListener('click', (event) => {
            if (getCurrentStep() === 3 && blockTopologyNavigationWhileSizing(event)) {
                return;
            }

            if (getCurrentStep() === 1 && workspaceConnectionState.workspaceValidationPending) {
                setWorkspaceStatus('Still confirming your workspace connection. Please wait a moment.');
                return;
            }

            if (getCurrentStep() === 1
                && workspaceConnectionState.status === 'connected'
                && !workspaceConnectionState.selectedWorkspace) {
                if (!workspaceConnectionState._noWorkspaceAcknowledged) {
                    setWorkspaceStatusHtml(
                        'You have successfully connected to your tenant, but you haven\'t selected a workspace. '
                        + 'Please select a workspace before continuing. '
                        + '<button type="button" class="workspace-status__continue-link" id="continueWithoutWorkspace">'
                        + 'Continue without workspace →</button>',
                        'warning'
                    );
                    document.getElementById('continueWithoutWorkspace')?.addEventListener('click', () => {
                        workspaceConnectionState._noWorkspaceAcknowledged = true;
                        nextStep({
                            canProceed: (step) => step !== 3 || getSelectedSolutionsData().length > 0,
                            onStepChange: handleStepChange
                        });
                    });
                    return;
                }
            }

            nextStep({
                canProceed: (step) => step !== 3 || getSelectedSolutionsData().length > 0,
                onStepChange: handleStepChange
            });
        });
    });

    document.querySelectorAll('[data-prev]').forEach((button) => {
        button.addEventListener('click', () => prevStep({ onStepChange: handleStepChange }));
    });

    document.querySelectorAll('[data-vendor]').forEach((card) => card.addEventListener('click', () => {
        toggleVendor(card);
        persistSelectedVendors();
    }));

    document.getElementById('resetPlannerState')?.addEventListener('click', () => {
        if (!window.confirm('Clear all saved Sentinel Planner progress and start over?')) {
            return;
        }

        clearPlannerLocalStorage();
        window.location.reload();
    });

    window.addEventListener('sentinelPlanner:capacity-changed', () => {
        if (getCurrentStep() === 4) {
            renderTopologyStep();
        }
    });

    document.addEventListener('keydown', handleNlpKeydown);

    let nlpDebounceTimer = null;
    document.getElementById('nlpInput')?.addEventListener('input', () => {
        clearTimeout(nlpDebounceTimer);
        nlpDebounceTimer = setTimeout(handleNlpInput, 200);
    });
    document.getElementById('exportTopoPDF')?.addEventListener('click', async () => {
        try {
            await exportTopologyAsPdf(document.getElementById('architectureDiagram'));
        } catch (error) {
            console.error('PDF export failed:', error);
            window.alert('PDF export failed. Try the PNG option instead.');
        }
    });
    document.getElementById('exportTopoPNG')?.addEventListener('click', async () => {
        try {
            await exportTopologyAsPng(document.getElementById('architectureDiagram'));
        } catch (error) {
            console.error('PNG export failed:', error);
            window.alert('PNG export failed.');
        }
    });
    document.getElementById('exportExcelButton')?.addEventListener('click', async () => {
        try {
            await exportToExcel();
        } catch (error) {
            console.error('Excel export failed:', error);
            window.alert('Excel export failed. Try again.');
        }
    });

    let restoredStep = getPersistedCurrentStep();

    // If the saved step requires planned solutions but the saved shortlist is gone, start clean.
    if (restoredStep >= 4 && getSelectedSolutionsData().length === 0) {
        restoredStep = 1;
        if (canUseLocalStorage()) {
            window.localStorage.removeItem(CURRENT_STEP_STORAGE_KEY);
        }
    }

    setupResumeProgressButton(restoredStep);
    syncWorkspaceValidationButtons();
    setCurrentStep(1, { persist: false });
});
