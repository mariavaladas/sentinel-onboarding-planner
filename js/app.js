import { exportToExcel } from './modules/export.js';
import { initGanttPlanner } from './gantt-planner.js';
import { renderMitreCoverage } from './modules/mitre.js';
import { processNlpInput, handleNlpInput, handleNlpKeydown } from './modules/search.js';
import {
    getSelectedSolutionsData,
    initStep3,
    loadSolutionData,
    selectedVendors,
    setConnectedSolutionIds,
    setConnectedSolutionsFromWorkspace,
    toggleVendor
} from './modules/solutions.js';
import { exportTopologyAsPdf, exportTopologyAsPng, renderTopology } from './modules/topology.js';
import { nextStep, prevStep, setCurrentStep } from './modules/wizard.js';
import { sortByScore } from './modules/scoring.js';

const AZURE_TOKEN_COMMAND = 'az account get-access-token --resource https://management.azure.com --query accessToken -o tsv';
const workspaceConnectionState = {
    accessToken: '',
    subscriptions: [],
    resourceGroups: [],
    workspaces: [],
    selectedWorkspace: null
};

const STORAGE_PREFIX = 'sentinelPlanner.';
const SELECTED_VENDORS_STORAGE_KEY = `${STORAGE_PREFIX}selectedVendors`;
const SERVER_ENVIRONMENT_STORAGE_KEY = `${STORAGE_PREFIX}serverEnvironment`;
const CURRENT_STEP_STORAGE_KEY = `${STORAGE_PREFIX}currentStep`;
const SELECTED_SOLUTIONS_STORAGE_KEY = `${STORAGE_PREFIX}selectedSolutions`;
const CONNECTED_SOLUTIONS_STORAGE_KEY = `${STORAGE_PREFIX}connectedSolutionIds`;
const PLANNER_STORAGE_KEYS = [
    SELECTED_VENDORS_STORAGE_KEY,
    SERVER_ENVIRONMENT_STORAGE_KEY,
    CURRENT_STEP_STORAGE_KEY,
    SELECTED_SOLUTIONS_STORAGE_KEY,
    CONNECTED_SOLUTIONS_STORAGE_KEY
];
const SERVER_ENVIRONMENT_INPUT_IDS = {
    azure: 'azureServerCount',
    onprem: 'onPremServerCount'
};

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

const getPersistedCurrentStep = () => {
    if (!canUseLocalStorage()) {
        return 1;
    }

    const rawValue = window.localStorage.getItem(CURRENT_STEP_STORAGE_KEY);
    const parsedStep = Number.parseInt(rawValue || '', 10);
    return Number.isFinite(parsedStep) ? parsedStep : 1;
};

const getVendorCards = () => Array.from(document.querySelectorAll('[data-vendor]'));

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

const getServerEnvironmentInputs = () => ({
    azure: document.getElementById(SERVER_ENVIRONMENT_INPUT_IDS.azure),
    onprem: document.getElementById(SERVER_ENVIRONMENT_INPUT_IDS.onprem)
});

const normalizeServerCount = (value) => {
    const parsedValue = Number.parseInt(value || '', 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
};

const persistServerEnvironment = () => {
    const { azure, onprem } = getServerEnvironmentInputs();
    writeJsonToStorage(SERVER_ENVIRONMENT_STORAGE_KEY, {
        azure: normalizeServerCount(azure?.value),
        onprem: normalizeServerCount(onprem?.value)
    });
};

const restoreServerEnvironment = () => {
    const storedServerEnvironment = readJsonFromStorage(SERVER_ENVIRONMENT_STORAGE_KEY, {});
    const { azure, onprem } = getServerEnvironmentInputs();
    const azureCount = normalizeServerCount(storedServerEnvironment?.azure);
    const onPremCount = normalizeServerCount(storedServerEnvironment?.onprem);

    if (azure) {
        azure.value = azureCount > 0 ? String(azureCount) : '';
    }

    if (onprem) {
        onprem.value = onPremCount > 0 ? String(onPremCount) : '';
    }
};

const clearPlannerLocalStorage = () => {
    if (!canUseLocalStorage()) {
        return;
    }

    const keysToClear = new Set([
        ...Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
            .filter((storageKey) => storageKey && storageKey.startsWith(STORAGE_PREFIX)),
        ...PLANNER_STORAGE_KEYS
    ]);

    keysToClear.forEach((storageKey) => window.localStorage.removeItem(storageKey));
};

const getSelectedPlanSolutions = () => sortByScore(getSelectedSolutionsData());

const renderTopologyStep = () => {
    renderTopology(getSelectedPlanSolutions(), document.getElementById('architectureDiagram'));
    renderMitreCoverage(getSelectedPlanSolutions());
};

const renderPlannerStep = () => {
    initGanttPlanner(getSelectedPlanSolutions());
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

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${workspaceConnectionState.accessToken}`
        }
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Azure API error (${response.status}): ${details || response.statusText}`);
    }

    return response.json();
};

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
    const tokenInstructions = document.getElementById('tokenInstructions');
    const workspacePicker = document.getElementById('workspacePicker');

    if (!token) {
        setWorkspaceStatus('Please paste an access token first.', 'error');
        return;
    }

    connectButton?.setAttribute('disabled', 'true');
    setWorkspaceStatus('Connecting to Azure and loading subscriptions...');
    resetSelect('subscriptionSelect', 'Loading subscriptions...');
    resetSelect('rgSelect', 'Select subscription first');
    resetSelect('workspaceSelect', 'Select resource group first');

    try {
        workspaceConnectionState.accessToken = token;
        const data = await azureFetch('https://management.azure.com/subscriptions?api-version=2022-12-01');
        workspaceConnectionState.subscriptions = Array.isArray(data.value) ? data.value : [];

        populateSelect(
            'subscriptionSelect',
            workspaceConnectionState.subscriptions,
            '-- Select subscription --',
            (subscription) => subscription.subscriptionId,
            (subscription) => subscription.displayName
        );

        if (tokenInstructions) {
            tokenInstructions.style.display = 'none';
        }
        if (workspacePicker) {
            workspacePicker.style.display = 'grid';
        }

        setWorkspaceStatus(`Connected. Found ${workspaceConnectionState.subscriptions.length} subscription(s).`, 'success');
    } catch (error) {
        console.error('Workspace connection failed:', error);
        workspaceConnectionState.accessToken = '';
        workspaceConnectionState.subscriptions = [];
        workspaceConnectionState.resourceGroups = [];
        workspaceConnectionState.workspaces = [];
        workspaceConnectionState.selectedWorkspace = null;
        setConnectedSolutionIds([]);
        if (workspacePicker) {
            workspacePicker.style.display = 'none';
        }
        if (tokenInstructions) {
            tokenInstructions.style.display = 'flex';
        }
        setWorkspaceStatus('The token could not be validated. Generate a fresh token and try again.', 'error');
    } finally {
        connectButton?.removeAttribute('disabled');
    }
}

async function onSubscriptionChange() {
    const subscriptionId = document.getElementById('subscriptionSelect')?.value;
    resetSelect('rgSelect', 'Loading resource groups...');
    resetSelect('workspaceSelect', 'Select resource group first');

    if (!subscriptionId) {
        workspaceConnectionState.resourceGroups = [];
        workspaceConnectionState.workspaces = [];
        workspaceConnectionState.selectedWorkspace = null;
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
        workspaceConnectionState.resourceGroups = [];
        setWorkspaceStatus('Unable to load resource groups for that subscription.', 'error');
        resetSelect('rgSelect', 'Error loading resource groups');
    }
}

async function onRgChange() {
    const subscriptionId = document.getElementById('subscriptionSelect')?.value;
    const resourceGroupName = document.getElementById('rgSelect')?.value;
    resetSelect('workspaceSelect', 'Loading workspaces...');

    if (!subscriptionId || !resourceGroupName) {
        workspaceConnectionState.workspaces = [];
        workspaceConnectionState.selectedWorkspace = null;
        setWorkspaceStatus('Choose a resource group to load workspaces.');
        return;
    }

    try {
        const data = await azureFetch(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces?api-version=2022-10-01`);
        workspaceConnectionState.workspaces = Array.isArray(data.value) ? data.value : [];

        populateSelect(
            'workspaceSelect',
            workspaceConnectionState.workspaces,
            '-- Select workspace --',
            (workspace) => workspace.name,
            (workspace) => workspace.name
        );

        setWorkspaceStatus(`Loaded ${workspaceConnectionState.workspaces.length} workspace(s).`);
    } catch (error) {
        console.error('Failed to load workspaces:', error);
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
        workspaceConnectionState.selectedWorkspace = null;
        setConnectedSolutionIds([]);
        setWorkspaceStatus('Choose a workspace to load existing connectors.');
        return;
    }

    setWorkspaceStatus(`Loading existing connectors from ${workspaceName}...`);

    try {
        const data = await azureFetch(`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}/providers/Microsoft.SecurityInsights/dataConnectors?api-version=2023-11-01`);
        const connectors = Array.isArray(data.value) ? data.value : [];
        const connectedIds = setConnectedSolutionsFromWorkspace(connectors);

        workspaceConnectionState.selectedWorkspace = {
            subscriptionId,
            resourceGroupName,
            workspaceName
        };
        window.connectedWorkspace = workspaceConnectionState.selectedWorkspace;
        window.connectedSolutions = Array.from(connectedIds);

        if (connectedIds.size > 0) {
            setWorkspaceStatus(`Connected to ${workspaceName}. Found ${connectors.length} connector(s) and mapped ${connectedIds.size} existing solution(s).`, 'success');
        } else {
            setWorkspaceStatus(`Connected to ${workspaceName}. Found ${connectors.length} connector(s), but none mapped to local solution IDs yet.`, 'success');
        }
    } catch (error) {
        console.error('Failed to load existing connectors:', error);
        workspaceConnectionState.selectedWorkspace = null;
        setConnectedSolutionIds([]);
        setWorkspaceStatus('Connected to Azure, but connector discovery failed for that workspace.', 'error');
    }
}

window.copyTokenCmd = copyTokenCmd;
window.connectWithToken = connectWithToken;
window.onSubscriptionChange = onSubscriptionChange;
window.onRgChange = onRgChange;
window.onWorkspaceChange = onWorkspaceChange;

document.addEventListener('DOMContentLoaded', async () => {
    await loadSolutionData();

    restoreSelectedVendors();
    restoreServerEnvironment();

    document.querySelectorAll('[data-next]').forEach((button) => {
        button.addEventListener('click', () => nextStep({
            canProceed: (step) => step !== 3 || getSelectedSolutionsData().length > 0,
            onStepChange: handleStepChange
        }));
    });

    document.querySelectorAll('[data-prev]').forEach((button) => {
        button.addEventListener('click', () => prevStep({ onStepChange: handleStepChange }));
    });

    document.querySelectorAll('[data-vendor]').forEach((card) => card.addEventListener('click', () => {
        toggleVendor(card);
        persistSelectedVendors();
    }));

    Object.values(getServerEnvironmentInputs()).forEach((input) => {
        input?.addEventListener('input', persistServerEnvironment);
        input?.addEventListener('change', persistServerEnvironment);
    });

    document.getElementById('resetPlannerState')?.addEventListener('click', () => {
        if (!window.confirm('Clear all saved Sentinel Planner progress and start over?')) {
            return;
        }

        clearPlannerLocalStorage();
        window.location.reload();
    });

    document.getElementById('nlpSearchButton')?.addEventListener('click', processNlpInput);
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

    // If restoring to a step that requires solutions but none are persisted, fall back to step 1
    if (restoredStep >= 4 && getSelectedSolutionsData().length === 0) {
        restoredStep = 1;
        if (canUseLocalStorage()) {
            window.localStorage.removeItem(CURRENT_STEP_STORAGE_KEY);
        }
    }

    restoredStep = setCurrentStep(restoredStep);
    if (restoredStep > 1) {
        handleStepChange(restoredStep);
    }
});
