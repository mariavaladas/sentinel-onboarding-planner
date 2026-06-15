// Gantt Planner v5 — Timeline dropdown, collapsible groups, per-solution start dates
import {
    buildCapacitySnapshot,
    classifyConnectorCapacity,
    createDefaultSizingDraft,
    getSizingDetailLines,
    getSizingResultMessages,
    getSolutionCapacityProfile,
    updateConnectorCapacityEntries,
    applySizingToTaskContent,
    clearCriblIngestionEntries
} from './modules/capacity.js?v=18';
import {
    buildGanttPlan as buildGeneratedGanttPlan,
    formatTaskDuration as formatGeneratedTaskDuration,
    parseDurationToHours as parseGeneratedTaskDurationToHours,
    getPackJoinTaskId
} from './modules/gantt-tasks.js?v=17';
import { calculatePriorityScore, getPhase } from './modules/scoring.js?v=16';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK;
const BUSINESS_DAY_START_HOUR = 9;
const BUSINESS_DAY_END_HOUR = BUSINESS_DAY_START_HOUR + HOURS_PER_DAY;
const GENERAL_SENTINEL_DOC_URL = 'https://learn.microsoft.com/en-us/azure/sentinel/';
const DURATION_OVERRIDE_STORAGE_KEY = 'sentinelPlanner.taskDurationOverrides.v1';
const DURATION_OVERRIDE_STATE_VERSION = 7;
const DATE_FORMAT_STORAGE_KEY = 'sentinelPlanner.dateFormat.v1';
const TABLE_DATE_FORMAT = 'MM/DD/YYYY';
const START_WEEK_MIN = 1;
const GANTT_TABLE_COLUMN_WIDTHS_STORAGE_KEY = 'sentinelPlanner.ganttTableColumnWidths.session.v1';
const PLANNER_ACTIVE_TAB_STORAGE_KEY = 'sentinelPlanner.plannerActiveTab.session.v1';
const GANTT_TABLE_COLUMNS = [
    {
        key: 'number',
        label: '#',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--number',
        width: 72,
        minWidth: 60
    },
    {
        key: 'name',
        label: 'Task name',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--task',
        width: 360,
        minWidth: 220
    },
    {
        key: 'status',
        label: 'Status',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--status',
        width: 138,
        minWidth: 124
    },
    {
        key: 'owner',
        label: 'Owner',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--owner',
        width: 156,
        minWidth: 120
    },
    {
        key: 'duration',
        label: 'Duration',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--duration',
        width: 124,
        minWidth: 108
    },
    {
        key: 'startDate',
        label: 'Start date',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--date',
        width: 128,
        minWidth: 112
    },
    {
        key: 'dependencies',
        label: 'Dependencies',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--dependencies',
        width: 224,
        minWidth: 156
    },
    {
        key: 'impact',
        label: 'Priority',
        headerClassName: 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--impact',
        width: 118,
        minWidth: 96
    }
];
const DURATION_VALUE_PRESETS = [0.5, 1, 2, 3];
const DURATION_UNITS = ['hours', 'days', 'weeks'];
const DURATION_PICKER_UNITS = ['hours', 'days', 'weeks'];
const INLINE_DURATION_QUICK_PICKS = [
    { label: '4h', value: 4, unit: 'hours' },
    { label: '1d', value: 1, unit: 'days' },
    { label: '2d', value: 2, unit: 'days' },
    { label: '3d', value: 3, unit: 'days' },
    { label: '5d', value: 5, unit: 'days' },
    { label: '1w', value: 1, unit: 'weeks' },
    { label: '1.5w', value: 1.5, unit: 'weeks' },
    { label: '2w', value: 2, unit: 'weeks' },
    { label: '3w', value: 3, unit: 'weeks' },
    { label: '1mo', value: 4, unit: 'weeks' }
];
const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Complete', 'Blocked', 'Skipped'];
const IMPACT_OPTIONS = ['Low', 'Medium', 'High'];
const OWNER_OPTIONS = ['SOC Architect', 'SOC Lead', 'SOC Engineers', 'Operations Team', 'Identity/Entra Admin', 'Security Admin'];
const DEFAULT_NEW_TASK_NAME = 'New Task';
const DEFAULT_NEW_TASK_DURATION_VALUE = 1;
const DEFAULT_NEW_TASK_DURATION_UNIT = 'days';
const DEFAULT_NEW_TASK_DESCRIPTION = '';
const DEFAULT_NEW_TASK_SUMMARY = 'Capture the onboarding step, owner, and notes for this task.';
const DETAIL_FIELDS = ['Solution', 'Task type', 'Owner', 'Status', 'Phase', 'Priority', 'Start week', 'Start date', 'Due date', 'Duration', 'Milestone'];
const DETAIL_EXTRA_FIELDS = ['Connector type', 'Difficulty', 'Required permissions', 'Dependencies', 'Parent task', 'Effort (hours)', 'Optional'];
const MIN_TASK_DURATION_WEEKS = 0.0125;
const SUMMARY_EXPANDED_PREFIX = '▾';
const SUMMARY_COLLAPSED_PREFIX = '▸';
const SOLUTION_GROUP_EXPANDED_PREFIX = '▼';
const SOLUTION_GROUP_COLLAPSED_PREFIX = '▶';
const SUBTASK_INDENT_PREFIX = ' └ ';

function getSolutionGroupActionVerb(isCollapsed = false) {
    return isCollapsed ? 'expand' : 'collapse';
}

function getSolutionGroupActionLabel(isCollapsed = false) {
    return `(${getSolutionGroupActionVerb(isCollapsed)})`;
}
const CLEAN_EFFORT_HOURS = [0.5, 1, 2, 3];
const GANTT_TABLE_ROW_FALLBACK_HEIGHT = 44;
const GANTT_TABLE_DESCRIPTION_LIMIT = 84;
const SUBTASK_TOGGLE_TRANSITION_MS = 180;
const GANTT_BAR_LABEL_PADDING = 8;
const GANTT_BAR_LABEL_MIN_TEXT_WIDTH = 18;
const GANTT_BAR_LABEL_MIN_PRIMARY_CHARS = 4;
const PLANNER_WIDE_LAYOUT_CLASS = 'planner-step-expanded';
const DATE_PICKER_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_COLOR_CLASS_MAP = {
    'Not Started': 'is-not-started',
    'In Progress': 'is-in-progress',
    Complete: 'is-complete',
    Blocked: 'is-blocked',
    Skipped: 'is-skipped'
};
const IMPACT_COLOR_CLASS_MAP = {
    'Low': 'is-low',
    'Medium': 'is-medium',
    'High': 'is-high'
};
const OWNER_COLOR_CLASS_MAP = {
    'SOC Architect': 'is-soc-architect',
    'SOC Lead': 'is-soc-lead',
    'SOC Engineers': 'is-soc-engineers',
    'Operations Team': 'is-operations-team',
    'Identity/Entra Admin': 'is-identity-admin',
    'Security Admin': 'is-security-admin'
};
const GANTT_VIEW_MODES = [
    {
        name: 'Weeks',
        padding: '21d',
        step: '7d',
        column_width: 76,
        date_format: 'YYYY-MM-DD',
        lower_text: (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        upper_text: (date, previousDate) => {
            if (!previousDate || date.getMonth() !== previousDate.getMonth() || date.getFullYear() !== previousDate.getFullYear()) {
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
            return '';
        },
        thick_line: (date) => date.getDate() <= 7,
        snap_at: '7d'
    },
    {
        name: 'Months',
        padding: '2m',
        step: '1m',
        column_width: 120,
        date_format: 'YYYY-MM',
        lower_text: (date) => date.toLocaleDateString('en-US', { month: 'short' }),
        upper_text: (date, previousDate) => !previousDate || date.getFullYear() !== previousDate.getFullYear()
            ? String(date.getFullYear())
            : '',
        thick_line: (date) => date.getMonth() === 0,
        snap_at: '7d'
    },
    {
        name: 'Quarters',
        padding: '6m',
        step: '3m',
        column_width: 180,
        date_format: 'YYYY-MM',
        lower_text: (date) => `Q${Math.floor(date.getMonth() / 3) + 1}`,
        upper_text: (date, previousDate) => !previousDate || date.getFullYear() !== previousDate.getFullYear()
            ? String(date.getFullYear())
            : '',
        thick_line: () => true,
        snap_at: '14d'
    }
];

let plannerWideLayoutObserver = null;

const PHASE_SEQUENCE = [
    { key: 'setup', phaseNumber: 0, name: 'Setup & Readiness', className: 'phase-setup' },
    { key: 'phase1', phaseNumber: 1, name: 'Phase 1 – Quick Wins', className: 'phase-1' },
    { key: 'phase2', phaseNumber: 2, name: 'Phase 2 – Moderate Effort', className: 'phase-2' },
    { key: 'phase3', phaseNumber: 3, name: 'Phase 3 – Complex Integrations', className: 'phase-3' },
    { key: 'closeout', phaseNumber: 4, name: 'Training & Go-Live', className: 'phase-closeout' }
];

const PHASE_BY_KEY = Object.fromEntries(PHASE_SEQUENCE.map((phase) => [phase.key, phase]));
const SOLUTION_PHASE_KEY = { 1: 'phase1', 2: 'phase2', 3: 'phase3' };

/** Direct bar fill colours — also set as task.color so Frappe's draw_bar() applies
 *  them via inline style.fill as a belt-and-suspenders fallback alongside CSS. */
export const PHASE_BAR_COLOR = {
    'phase-setup': '#6f8096',
    'phase-1': '#77899d',
    'phase-2': '#7f91a4',
    'phase-3': '#8799ab',
    'phase-closeout': '#8fa2b2'
};

export const STATUS_BAR_COLOR = {
    'Not Started': null,
    'In Progress': '#14b8a6',
    Complete: '#22c55e',
    Blocked: '#ef4444',
    Skipped: '#64748b'
};

const CONNECTOR_COLOR_PALETTE = Object.freeze([
    '#4A90D9',
    '#4FA869',
    '#D8892E',
    '#8C5CCB',
    '#169B92',
    '#D65A4F',
    '#B88A12'
]);

const CONNECTOR_COLOR_PALETTE_LIGHT_TEXT = Object.freeze([
    '#2D6CB5',
    '#357A4A',
    '#A5681F',
    '#6B3FA8',
    '#0F7068',
    '#B0422F',
    '#8A670E'
]);

const CONNECTOR_COLOR_PALETTE_DARK_TEXT = Object.freeze([
    '#6AAEF5',
    '#6FCF8A',
    '#F0A84A',
    '#B08AE8',
    '#2ECBC1',
    '#F07A6A',
    '#D4AC1E'
]);

const STATUS_BAR_VISUALS = Object.freeze({
    default: { opacity: 0.5, fillOpacity: 0.62, strokeDasharray: '1.5 4', strokeWidth: 2 },
    active: { opacity: 0.75, fillOpacity: 0.82, strokeDasharray: '6 4', strokeWidth: 2 },
    complete: { opacity: 1, fillOpacity: 0.96, strokeDasharray: 'none', strokeWidth: 2 },
    blocked: { opacity: 0.95, fillOpacity: 0.9, strokeDasharray: '3 3', strokeWidth: 2.2 },
    group: { opacity: 1, fillOpacity: 1, strokeDasharray: 'none', strokeWidth: 2 }
});

let currentGanttPlanData = null;
let durationOverrideState = null;
let storedDateFormatPreference = null;
let durationOverridesPersistToStorage = true;
let ganttResizeCleanup = null;
let ganttTableColumnWidths = null;

export function getCurrentGanttPlanData() {
    return currentGanttPlanData;
}

function createElement(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
}

function syncPlannerWideLayout() {
    if (typeof document === 'undefined') return;

    const appContainer = document.querySelector('.app-container');
    const plannerStep = document.getElementById('step5');
    if (!appContainer || !plannerStep) return;

    appContainer.classList.toggle(PLANNER_WIDE_LAYOUT_CLASS, plannerStep.classList.contains('active'));
}

function ensurePlannerWideLayoutObserver() {
    if (typeof MutationObserver === 'undefined') {
        syncPlannerWideLayout();
        return;
    }

    const plannerStep = document.getElementById('step5');
    if (!plannerStep) return;

    if (!plannerWideLayoutObserver) {
        plannerWideLayoutObserver = new MutationObserver(() => {
            syncPlannerWideLayout();
        });
        plannerWideLayoutObserver.observe(plannerStep, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    syncPlannerWideLayout();
}

function createText(tag, text, className) {
    const node = createElement(tag, className);
    node.textContent = text;
    return node;
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createSvgElement(tag, className) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (className) node.setAttribute('class', className);
    return node;
}

function escapeAttributeSelectorValue(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function bindPrimaryActivation(node, onActivate, { dedupeMs = 200 } = {}) {
    if (!node || typeof onActivate !== 'function') return;

    let activatedRecently = false;
    const resetActivation = () => {
        activatedRecently = false;
    };
    const activate = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (activatedRecently) return;
        activatedRecently = true;
        setTimeout(resetActivation, dedupeMs);
        onActivate(event);
    };

    node.addEventListener('click', activate);
    node.addEventListener('mouseup', (event) => {
        if (event.button === 0) activate(event);
    });
    node.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            activate(event);
        }
    });
}

function startPointerDragSession(event, handle, { onMove, onEnd, bodyClassName = 'is-resizing-gantt' } = {}) {
    if (!(event instanceof PointerEvent) || !handle || typeof onMove !== 'function') {
        return null;
    }
    if (!event.isPrimary || event.button !== 0) {
        return null;
    }

    const pointerId = event.pointerId;
    let isActive = true;

    if (bodyClassName) {
        document.body.classList.add(bodyClassName);
    }

    const cleanup = ({ cancelled = false } = {}) => {
        if (!isActive) {
            return;
        }
        isActive = false;

        handle.removeEventListener('pointermove', handlePointerMove);
        handle.removeEventListener('pointerup', handlePointerUp);
        handle.removeEventListener('pointercancel', handlePointerCancel);
        handle.removeEventListener('lostpointercapture', handleLostPointerCapture);
        window.removeEventListener('blur', handleBlur);

        if (bodyClassName) {
            document.body.classList.remove(bodyClassName);
        }

        if (typeof handle.releasePointerCapture === 'function' && handle.hasPointerCapture?.(pointerId)) {
            try {
                handle.releasePointerCapture(pointerId);
            } catch {
                // Ignore browsers that drop capture before cleanup runs.
            }
        }

        onEnd?.({ cancelled });
    };

    const handlePointerMove = (pointerEvent) => {
        if (!isActive || pointerEvent.pointerId !== pointerId) {
            return;
        }
        if (pointerEvent.pointerType !== 'touch' && pointerEvent.buttons === 0) {
            cleanup({ cancelled: true });
            return;
        }
        onMove(pointerEvent);
    };

    const handlePointerUp = (pointerEvent) => {
        if (pointerEvent.pointerId !== pointerId) {
            return;
        }
        cleanup();
    };

    const handlePointerCancel = (pointerEvent) => {
        if (pointerEvent.pointerId !== pointerId) {
            return;
        }
        cleanup({ cancelled: true });
    };

    const handleLostPointerCapture = () => {
        cleanup({ cancelled: true });
    };

    const handleBlur = () => {
        cleanup({ cancelled: true });
    };

    handle.addEventListener('pointermove', handlePointerMove);
    handle.addEventListener('pointerup', handlePointerUp);
    handle.addEventListener('pointercancel', handlePointerCancel);
    handle.addEventListener('lostpointercapture', handleLostPointerCapture);
    window.addEventListener('blur', handleBlur);

    if (typeof handle.setPointerCapture === 'function') {
        try {
            handle.setPointerCapture(pointerId);
        } catch {
            cleanup({ cancelled: true });
            return null;
        }
    }

    return { cleanup };
}

function formatWeeks(value) {
    const safeValue = Number(value) || 0;
    const displayValue = Number.isInteger(safeValue) ? safeValue.toString() : safeValue.toFixed(1).replace(/\.0$/, '');
    return `${displayValue} week${safeValue === 1 ? '' : 's'}`;
}

function getProjectStartDate() {
    const start = new Date();
    const day = start.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + offset);
    start.setHours(9, 0, 0, 0);
    return start;
}

function getDurationWeeks(solution = {}) {
    const difficulty = solution?.onboarding?.difficulty || '';
    const mapped = {
        easy: 0.5,
        moderate: 1,
        hard: 2
    }[difficulty.toLowerCase()];
    if (mapped) return mapped;

    const complexityLevel = Number(solution?.value_scoring?.complexity_level);
    if (complexityLevel >= 1 && complexityLevel <= 5) {
        if (complexityLevel <= 1) return 0.5;
        if (complexityLevel <= 2) return 1;
        if (complexityLevel <= 3) return 1.5;
        return 2;
    }

    const setupHours = Number(solution?.value_scoring?.setup_hours);
    if (setupHours > 0) {
        if (setupHours <= 2) return 0.5;
        if (setupHours <= 8) return 1;
        if (setupHours <= 16) return 1.5;
        return 2;
    }

    return 1;
}

function normalizeStatusLabel(status = '') {
    const normalized = String(status || '').trim().toLowerCase();
    switch (normalized) {
        case 'complete':
        case 'completed':
            return 'Complete';
        case 'in progress':
        case 'in-progress':
        case 'active':
        case 'in review':
        case 'in-review':
        case 'review':
            return 'In Progress';
        case 'blocked':
        case 'block':
            return 'Blocked';
        case 'skipped':
        case 'skip':
        case 'removed':
            return 'Skipped';
        case 'planned':
        case 'not-started':
        case 'not started':
        case 'todo':
        default:
            return 'Not Started';
    }
}

function getStatusIndicatorDisplay(status = '') {
    const normalizedStatus = normalizeStatusLabel(status);
    switch (normalizedStatus) {
        case 'Complete':
            return {
                normalizedStatus,
                label: 'Complete',
                colorClassName: STATUS_COLOR_CLASS_MAP.Complete
            };
        case 'In Progress':
            return {
                normalizedStatus,
                label: 'In Progress',
                colorClassName: STATUS_COLOR_CLASS_MAP['In Progress']
            };
        case 'Blocked':
            return {
                normalizedStatus,
                label: 'Blocked',
                colorClassName: STATUS_COLOR_CLASS_MAP.Blocked
            };
        case 'Skipped':
            return {
                normalizedStatus,
                label: 'Skipped',
                colorClassName: STATUS_COLOR_CLASS_MAP.Skipped
            };
        case 'Not Started':
        default:
            return {
                normalizedStatus: 'Not Started',
                label: 'Not Started',
                colorClassName: STATUS_COLOR_CLASS_MAP['Not Started']
            };
    }
}

function getSolutionGroupAggregateStatus(groupRow = {}, rows = []) {
    if (!groupRow?.isSolutionGroup) {
        return normalizeStatusLabel(groupRow?.status);
    }

    const groupStatuses = (Array.isArray(rows) ? rows : [])
        .filter((candidate) => candidate && !candidate.isSolutionGroup && candidate.solutionGroupId === groupRow.id)
        .map((candidate) => normalizeStatusLabel(candidate.status));

    if (groupStatuses.length === 0) {
        return normalizeStatusLabel(groupRow?.status);
    }

    if (groupStatuses.some((status) => status === 'Blocked')) {
        return 'Blocked';
    }

    if (groupStatuses.some((status) => status === 'In Progress')) {
        return 'In Progress';
    }

    if (groupStatuses.every((status) => status === 'Complete')) {
        return 'Complete';
    }

    if (groupStatuses.every((status) => status === 'Skipped')) {
        return 'Skipped';
    }

    return 'Not Started';
}

function getTaskProgressFromStatus(status = '') {
    const normalizedStatus = normalizeStatusLabel(status);
    switch (normalizedStatus) {
        case 'Complete':
            return 100;
        case 'In Progress':
            return 50;
        case 'Blocked':
            return 20;
        default:
            return 0;
    }
}

function calculateCompletedChildProgress(rows = []) {
    const childRows = (Array.isArray(rows) ? rows : []).filter(Boolean);
    if (childRows.length === 0) {
        return 0;
    }

    const completedCount = childRows.reduce((count, candidate) => (
        normalizeStatusLabel(candidate.status) === 'Complete' ? count + 1 : count
    ), 0);
    return Math.round((completedCount / childRows.length) * 100);
}

function getTaskProgress(row = {}, rows = []) {
    const safeRows = Array.isArray(rows) ? rows : [];

    if (row?.isSolutionGroup) {
        const leafChildRows = safeRows.filter((candidate) => candidate
            && candidate.id !== row.id
            && !candidate.isSolutionGroup
            && !candidate.isSummary
            && candidate.solutionGroupId === row.id);
        const directChildRows = safeRows.filter((candidate) => candidate
            && candidate.id !== row.id
            && !candidate.isSolutionGroup
            && candidate.solutionGroupId === row.id
            && !candidate.parentId);
        const progressRows = leafChildRows.length > 0 ? leafChildRows : directChildRows;
        return progressRows.length > 0
            ? calculateCompletedChildProgress(progressRows)
            : getTaskProgressFromStatus(row?.status);
    }

    if (row?.isSummary) {
        const childRows = safeRows.filter((candidate) => candidate && candidate.parentId === row.id);
        return childRows.length > 0
            ? calculateCompletedChildProgress(childRows)
            : getTaskProgressFromStatus(row?.status);
    }

    return getTaskProgressFromStatus(row?.status);
}

function getConnectorPaletteColor(index = 0) {
    const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
    return CONNECTOR_COLOR_PALETTE[((safeIndex % CONNECTOR_COLOR_PALETTE.length) + CONNECTOR_COLOR_PALETTE.length) % CONNECTOR_COLOR_PALETTE.length];
}

function buildSolutionPresentationMap(selectedSolutions = []) {
    return (Array.isArray(selectedSolutions) ? selectedSolutions : []).reduce((map, solution, index) => {
        const solutionId = String(solution?.id || '').trim();
        if (!solutionId) return map;
 
        const displayNumber = String(index + 1);
        const label = solution?.name || solutionId;
        map.set(solutionId, {
            solutionId,
            displayNumber,
            label,
            color: getConnectorPaletteColor(index)
        });
        return map;
    }, new Map());
}

const FIELD_PACK_DISPLAY_NAMES = Object.freeze({
    'windows-security-events': 'Windows Security Events',
    'windows-ama': 'Windows Security Events',
    'custom-logs': 'Custom Logs',
    'ama-custom-logs': 'Custom Logs',
    'wec-wef': 'Windows Forwarded Events',
    'syslog-cef': 'Syslog / CEF',
    'cribl-intermediary': 'Cribl Stream'
});

function formatFieldPackDisplayName(fieldPack = '') {
    const normalizedFieldPack = String(fieldPack || '').trim().toLowerCase();
    if (FIELD_PACK_DISPLAY_NAMES[normalizedFieldPack]) {
        return FIELD_PACK_DISPLAY_NAMES[normalizedFieldPack];
    }

    return normalizedFieldPack
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeSolutionLookupValue(value = '') {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function findSelectedSolutionForFieldPack(fieldPack = '', selectedSolutions = []) {
    const normalizedFieldPack = String(fieldPack || '').trim().toLowerCase();
    if (!normalizedFieldPack) return null;

    const expectedDisplayName = normalizeSolutionLookupValue(formatFieldPackDisplayName(normalizedFieldPack));
    return (Array.isArray(selectedSolutions) ? selectedSolutions : []).find((solution) => {
        const solutionId = String(solution?.id || '').trim().toLowerCase();
        if (!solutionId || solutionId.startsWith('synthetic-infra-')) {
            return false;
        }

        const solutionFieldPack = String(solution?.fieldPack || '').trim().toLowerCase();
        const solutionName = normalizeSolutionLookupValue(solution?.name);
        return solutionFieldPack === normalizedFieldPack || (expectedDisplayName && solutionName === expectedDisplayName);
    }) || null;
}

function buildSyntheticInfrastructureSolution(fieldPack = '') {
    const normalizedFieldPack = String(fieldPack || '').trim() || 'shared-infrastructure';
    const solutionName = formatFieldPackDisplayName(normalizedFieldPack) || 'Shared Infrastructure';
    return {
        id: `synthetic-infra-${normalizedFieldPack}`,
        name: solutionName,
        fieldPack: normalizedFieldPack,
        description: `Coordinate the shared ${solutionName} prerequisites that unblock dependent connector onboarding.`,
        export_metadata: {
            group: 'Shared infrastructure'
        },
        onboarding: {
            difficulty: 'moderate',
            setup_summary: `Complete the shared ${solutionName} prerequisites before connector onboarding begins.`
        },
        permissions: {
            privilege_level: 'high',
            notes: 'Shared platform and connector administration access.'
        },
        docUrl: GENERAL_SENTINEL_DOC_URL,
        planner: {
            owner_recommended: 'Operations Team',
            validation_steps: [`${solutionName} prerequisites are completed and ready for dependent connectors.`],
            docUrl: GENERAL_SENTINEL_DOC_URL
        }
    };
}

function getRowPrimaryLabel(row = {}) {
    if (row.isSolutionGroup) {
        return row.solutionDisplayLabel || row.solutionName || row.step;
    }
    return row.step;
}

function getTaskStatusVisualStyle(task = {}) {
    if (task?.isSolutionGroup) {
        return STATUS_BAR_VISUALS.group;
    }

    const normalizedStatus = normalizeStatusLabel(task?.status);
    switch (normalizedStatus) {
        case 'Complete':
            return STATUS_BAR_VISUALS.complete;
        case 'In Progress':
            return STATUS_BAR_VISUALS.active;
        case 'Blocked':
            return STATUS_BAR_VISUALS.blocked;
        case 'Skipped':
        case 'Not Started':
        default:
            return STATUS_BAR_VISUALS.default;
    }
}

function normalizeImpactLabel(impact = '') {
    const normalized = String(impact || '').trim().toLowerCase();
    switch (normalized) {
        case 'high':
        case 'critical':
            return 'High';
        case 'medium':
        case 'moderate':
            return 'Medium';
        case 'low':
        default:
            return 'Low';
    }
}

function mapImpactScoreToLabel(score = 0) {
    const safeScore = Number(score) || 0;
    if (safeScore >= 4) return 'High';
    if (safeScore >= 2) return 'Medium';
    return 'Low';
}

function getSolutionImpactLabel(solution = {}) {
    const businessImpact = Number(solution?.value_scoring?.business_impact);
    if (businessImpact > 0) return mapImpactScoreToLabel(businessImpact);

    const priorityScore = Number(calculatePriorityScore(solution)) || 0;
    if (priorityScore >= 70) return 'High';
    if (priorityScore >= 45) return 'Medium';
    return 'Low';
}

function getRowCalendarStartDateTime(row, projectStartDate) {
    return getBusinessDateTimeForWeek(row?.startWeek, projectStartDate);
}

function getRowCalendarStartDate(row, projectStartDate) {
    return startOfDay(getRowCalendarStartDateTime(row, projectStartDate));
}

function getRowCalendarEndDateTime(row, projectStartDate) {
    const startDateTime = getRowCalendarStartDateTime(row, projectStartDate);
    const businessHours = Math.max(
        MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK,
        Number(row?.durationBusinessHours) || durationWeeksToBusinessHours(row?.durationWeeks)
    );
    return addBusinessHours(startDateTime, businessHours);
}

function getRowCalendarDueDate(row, projectStartDate) {
    const endDateTime = getRowCalendarEndDateTime(row, projectStartDate);
    return startOfDay(endDateTime.getTime() - (60 * 1000));
}

function resolveRowStatus(row, projectStartDate) {
    if (row?.hasDirectStatusOverride || row?.statusWasManuallySet) {
        return normalizeStatusLabel(row?.status);
    }

    const normalizedStatus = normalizeStatusLabel(row?.status);
    if (normalizedStatus !== 'Not Started') {
        return normalizedStatus;
    }

    const today = startOfDay(new Date());
    const startDate = getRowCalendarStartDate(row, projectStartDate);
    const dueDate = getRowCalendarDueDate(row, projectStartDate);

    if (dueDate < today) return 'Complete';
    if (startDate <= today && dueDate >= today) {
        return 'In Progress';
    }
    return 'Not Started';
}

function enrichRowsForDisplay(rows = [], projectStartDate) {
    const enrichedRows = rows.map((row) => {
        const startDate = getRowCalendarStartDate(row, projectStartDate);
        const dueDate = getRowCalendarDueDate(row, projectStartDate);
        const status = resolveRowStatus(row, projectStartDate);
        const impact = normalizeImpactLabel(row?.impact);

        return {
            ...row,
            status,
            impact,
            startDate,
            dueDate,
            startDateLabel: formatDateForTable(startDate),
            dueDateLabel: formatDateForTable(dueDate),
            detailFields: {
                ...row.detailFields,
                Status: status,
                Priority: impact,
                'Start date': formatDateForTable(startDate),
                'Due date': formatDateForTable(dueDate)
            }
        };
    });

    return enrichedRows.map((row) => {
        if (!row?.isSolutionGroup) {
            return row;
        }

        const aggregateStatus = getSolutionGroupAggregateStatus(row, enrichedRows);
        return {
            ...row,
            status: aggregateStatus,
            detailFields: {
                ...row.detailFields,
                Status: aggregateStatus
            }
        };
    });
}

function getSolutionPhaseBucket(solution = {}) {
    const phasedDeployment = Number(solution?.export_metadata?.phased_deployment);
    if ([1, 2, 3].includes(phasedDeployment)) {
        return phasedDeployment;
    }

    const phaseLabel = getPhase(solution);
    const matched = /Phase\s+(\d+)/i.exec(phaseLabel);
    const fallback = Number(matched?.[1]);
    return [1, 2, 3].includes(fallback) ? fallback : 3;
}

function normalizeOwnerLabel(owner = '', { allowEmpty = false, preserveCustom = true } = {}) {
    const trimmedOwner = String(owner || '').replace(/\s+/g, ' ').trim();
    if (!trimmedOwner) return allowEmpty ? '' : '—';

    if (/^(?:—|-|unassigned|n\/a)$/i.test(trimmedOwner)) {
        return allowEmpty ? '' : '—';
    }
    if (/^(?:soc architect|security architect)$/i.test(trimmedOwner)) {
        return 'SOC Architect';
    }
    if (/^(?:soc lead|project lead|team lead)$/i.test(trimmedOwner)) {
        return 'SOC Lead';
    }
    if (/^(?:soc engineer|soc engineers|soc analyst|soc analysts)$/i.test(trimmedOwner)) {
        return 'SOC Engineers';
    }
    if (/^(?:identity admin|identity\/entra admin|entra admin|azure ad admin|directory admin)$/i.test(trimmedOwner)) {
        return 'Identity/Entra Admin';
    }
    if (/^(?:security admin|global admin)$/i.test(trimmedOwner)) {
        return 'Security Admin';
    }
    if (/^(?:operations team|ops team|network admin|it admin|platform admin|azure platform admin|cloud admin|network operations)$/i.test(trimmedOwner)) {
        return 'Operations Team';
    }

    return preserveCustom ? trimmedOwner : (allowEmpty ? '' : '—');
}

function inferOwnerFromText(value = '') {
    const hint = String(value || '').toLowerCase();
    if (!hint) return '';
    if (/(rbac|role assignment|security group|consent|entra|identity|azure ad|directory|app registration|oauth|sso|conditional access)/.test(hint)) {
        return 'Identity/Entra Admin';
    }
    if (/(workspace topology|architecture|architect|landing zone|operating model|blueprint|success criteria)/.test(hint)) {
        return 'SOC Architect';
    }
    if (/(kickoff|stakeholder|handover|training|enablement|ownership transferred|weekly cadence|runbook review)/.test(hint)) {
        return 'SOC Lead';
    }
    if (/(syslog|cef|ama|agent|dcr|diagnostic setting|forwarder|server|linux|windows|vm\b|network prerequisite|firewall|proxy|appliance|collector|infrastructure)/.test(hint)) {
        return 'Operations Team';
    }
    if (/(analytic|detection|dashboard|workbook|parser|kql|query|content|rule|alert|deploy)/.test(hint)) {
        return 'SOC Engineers';
    }
    if (/(validate|validation|tune|tuning|entities|tables|investigation|monitoring|go-live|telemetry|verify|verification)/.test(hint)) {
        return 'SOC Analysts';
    }
    return '';
}

function resolveTaskOwner(task = {}, solution = {}, ownerModel = {}, fallbacks = []) {
    const explicitOwner = normalizeOwnerLabel(
        task?.owner ?? task?.owner_role ?? task?.team ?? task?.ownerRecommended ?? '',
        { allowEmpty: true }
    );
    if (explicitOwner) return explicitOwner;

    const ownerHint = [
        task?.task,
        task?.description,
        ...(Array.isArray(task?.required_roles) ? task.required_roles : []),
        ...(Array.isArray(task?.requiredRoles) ? task.requiredRoles : []),
        ...(Array.isArray(fallbacks) ? fallbacks : [fallbacks]),
        solution?.planner?.owner_recommended,
        solution?.export_metadata?.group,
        solution?.category,
        ...(Array.isArray(solution?.tags) ? solution.tags : []),
        ...(Array.isArray(solution?.onboarding?.infrastructure_required) ? solution.onboarding.infrastructure_required : []),
        ...(Array.isArray(solution?.onboarding?.infrastructure) ? solution.onboarding.infrastructure : []),
        solution?.onboarding?.notes
    ].filter(Boolean).join(' ');

    return inferOwnerFromText(ownerHint) || normalizeOwnerLabel(ownerModel?.owner, { preserveCustom: true });
}

function getOwnerModel(solution = {}) {
    const privilegeLevel = String(solution?.permissions?.privilege_level || '').toLowerCase();
    const ownerHint = [
        solution?.planner?.owner_recommended,
        solution?.category,
        solution?.export_metadata?.group,
        ...(Array.isArray(solution?.tags) ? solution.tags : []),
        ...(Array.isArray(solution?.onboarding?.infrastructure_required) ? solution.onboarding.infrastructure_required : []),
        solution?.description,
        solution?.onboarding?.notes
    ].filter(Boolean).join(' ');

    let owner = normalizeOwnerLabel(solution?.planner?.owner_recommended, { allowEmpty: true })
        || inferOwnerFromText(ownerHint);

    if (!owner) {
        if (privilegeLevel === 'high') owner = 'Security Admin';
        else if (privilegeLevel === 'medium') owner = 'SOC Engineers';
        else if (privilegeLevel === 'low') owner = 'Operations Team';
    }

    if (!owner) {
        const complexity = Number(solution?.value_scoring?.complexity_level) || 1;
        if (complexity >= 4) owner = 'SOC Architect';
        else if (complexity >= 2) owner = 'SOC Engineers';
    }

    return {
        owner: normalizeOwnerLabel(owner, { preserveCustom: true }),
        resourceType: privilegeLevel === 'high' ? 'Microsoft & Customer' : 'Customer'
    };
}

function getSolutionGroup(solution = {}) {
    return solution?.export_metadata?.group || (solution?.is1P ? 'Microsoft' : 'Third Party');
}

function getSolutionPermissionRoles(solution = {}) {
    return [...new Set([
        ...(solution?.permissions?.azure_roles || []),
        ...(solution?.permissions?.m365_roles || []),
        ...(solution?.permissions?.resource_permissions || [])
    ].map((role) => String(role || '').trim()).filter(Boolean))];
}

function getPermissionSummary(solution = {}) {
    const perms = solution?.permissions || {};
    const azureRoles = (perms.azure_roles || []).filter(Boolean);
    const m365Roles = (perms.m365_roles || []).filter(Boolean);

    if (azureRoles.length === 0 && m365Roles.length === 0) {
        return perms.notes || 'Scoped access to configure and validate this integration.';
    }

    const SENTINEL_ROLES = ['Microsoft Sentinel Contributor', 'Microsoft Sentinel Reader', 'Log Analytics Contributor', 'Log Analytics Reader'];
    const sentinelRoles = azureRoles.filter((r) => SENTINEL_ROLES.includes(r));
    const resourceRoles = azureRoles.filter((r) => !SENTINEL_ROLES.includes(r));

    const groups = [];
    if (sentinelRoles.length) groups.push(`Sentinel workspace: ${sentinelRoles.join(', ')}`);
    if (resourceRoles.length) groups.push(`Resource scope: ${resourceRoles.join(', ')}`);
    if (m365Roles.length) groups.push(`Microsoft 365: ${m365Roles.join(', ')}`);

    return groups.join(' · ');
}

function taskMentionsPermissionWork(task = {}) {
    const permissionHint = [
        task?.task,
        task?.description,
        ...(Array.isArray(task?.required_roles) ? task.required_roles : []),
        ...(Array.isArray(task?.requiredRoles) ? task.requiredRoles : [])
    ].filter(Boolean).join(' ');

    return /(rbac|permission|permissions|role\b|roles\b|delegated|consent|licensing|license|service-account scope)/i.test(permissionHint);
}

function prependSolutionPermissionTask(tasks = [], solution = {}) {
    if (!Array.isArray(tasks) || tasks.length === 0 || tasks.some((task) => taskMentionsPermissionWork(task))) {
        return Array.isArray(tasks) ? tasks : [];
    }

    const permissionRoles = getSolutionPermissionRoles(solution);
    const permissionSummary = getPermissionSummary(solution);
    const solutionName = solution?.name || 'this solution';
    const isGeneralPermissionTask = permissionRoles.length === 0;

    return [{
        id: 'permission-gate',
        order: -1,
        task: isGeneralPermissionTask
            ? `${solutionName} — General RBAC review`
            : `Configure ${solutionName} RBAC & permissions`,
        description: isGeneralPermissionTask
            ? `Confirm the general customer-side access path required to configure and validate ${solutionName}.`
            : `Confirm the customer-side RBAC roles, delegated permissions, and approvals required before onboarding ${solutionName}.`,
        effort_hours: isGeneralPermissionTask ? 0.5 : 1,
        owner: 'Identity/Entra Admin',
        owner_role: 'Identity/Entra Admin',
        required_roles: permissionRoles.length > 0 ? permissionRoles : [permissionSummary],
        optional: false
    }, ...tasks];
}

function getDifficultyLabel(solution = {}) {
    if (solution?.onboarding?.difficulty) return solution.onboarding.difficulty;
    const complexity = Number(solution?.value_scoring?.complexity_level) || 2;
    if (complexity <= 1) return 'easy';
    if (complexity <= 2) return 'moderate';
    return 'hard';
}

function getMilestone(solution = {}) {
    return solution?.planner?.validation_steps?.[0]
        || `${solution?.name || 'Solution'} data is validated in Microsoft Sentinel and packaged content is enabled.`;
}

function getGoal(solution = {}) {
    if (solution?.onboarding?.setup_summary) return solution.onboarding.setup_summary;
    const firstTask = solution?.planner?.setup_tasks?.[0]?.task;
    if (firstTask) return firstTask;
    return `Bring ${solution?.name || 'the selected solution'} telemetry into Microsoft Sentinel and enable value-pack content.`;
}

function getTaskDescription(solution = {}) {
    const setupTasks = Array.isArray(solution?.planner?.setup_tasks)
        ? solution.planner.setup_tasks.map((task) => task?.task).filter(Boolean)
        : [];

    if (setupTasks.length > 0) {
        return setupTasks.slice(0, 3).join(' ');
    }

    return solution?.description || getGoal(solution);
}

function getTaskDetailDescription(task = {}, solution = {}, fallbacks = []) {
    const candidates = [
        task?.description,
        ...(Array.isArray(fallbacks) ? fallbacks : [fallbacks]),
        solution?.onboarding?.notes,
        solution?.description
    ];

    return candidates
        .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
        .find(Boolean) || '';
}

function getTaskRequiredRoles(task = {}, fallbacks = []) {
    const roleCandidates = [
        ...(Array.isArray(task?.required_roles) ? task.required_roles : []),
        ...(Array.isArray(task?.requiredRoles) ? task.requiredRoles : []),
        ...(Array.isArray(fallbacks) ? fallbacks : [fallbacks])
    ];

    return [...new Set(roleCandidates
        .map((role) => String(role || '').trim())
        .filter(Boolean))];
}

function resolveSizedTaskContent(taskName = '', description = '', solution = {}, capacityProfile = null) {
    return applySizingToTaskContent({
        taskName,
        description,
        solution,
        profile: capacityProfile
    });
}

function sortByOrder(items = []) {
    return [...items].sort((left, right) => {
        const leftOrder = Number(left?.order);
        const rightOrder = Number(right?.order);
        const leftHasOrder = Number.isFinite(leftOrder);
        const rightHasOrder = Number.isFinite(rightOrder);

        if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
        }

        if (leftHasOrder !== rightHasOrder) {
            return leftHasOrder ? -1 : 1;
        }

        return String(left?.task || left?.name || '').localeCompare(String(right?.task || right?.name || ''));
    });
}

function roundToHalfStep(value) {
    return Math.round(((Number(value) || 0) + Number.EPSILON) * 2) / 2;
}

function roundWeekPrecision(value) {
    return Math.round(((Number(value) || 0) + Number.EPSILON) * 10000) / 10000;
}

function roundToTenth(value) {
    return Math.round(((Number(value) || 0) + Number.EPSILON) * 10) / 10;
}

function roundDurationHours(value) {
    return Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
}

function formatCompactNumber(value) {
    const safeValue = Number(value) || 0;
    return Number.isInteger(safeValue)
        ? safeValue.toString()
        : safeValue.toFixed(1).replace(/\.0$/, '');
}

function formatWeekOffset(value) {
    const rounded = Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
    return formatCompactNumber(rounded);
}

function getIsoWeekNumber(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - yearStart) / DAY_MS) + 1) / 7);
}

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function setBusinessDayTime(value, hour = BUSINESS_DAY_START_HOUR) {
    const date = startOfDay(value);
    date.setHours(hour, 0, 0, 0);
    return date;
}

function isWeekendDay(value) {
    const day = new Date(value).getDay();
    return day === 0 || day === 6;
}

function moveToNextBusinessDayStart(value) {
    const date = setBusinessDayTime(value, BUSINESS_DAY_START_HOUR);
    do {
        date.setDate(date.getDate() + 1);
    } while (isWeekendDay(date));
    date.setHours(BUSINESS_DAY_START_HOUR, 0, 0, 0);
    return date;
}

function alignToBusinessDateTime(value) {
    let date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return setBusinessDayTime(new Date(), BUSINESS_DAY_START_HOUR);
    }

    while (isWeekendDay(date)) {
        date.setDate(date.getDate() + 1);
        date.setHours(BUSINESS_DAY_START_HOUR, 0, 0, 0);
    }

    const businessStart = setBusinessDayTime(date, BUSINESS_DAY_START_HOUR);
    const businessEnd = setBusinessDayTime(date, BUSINESS_DAY_END_HOUR);
    if (date < businessStart) return businessStart;
    if (date >= businessEnd) return moveToNextBusinessDayStart(date);
    return date;
}

function addBusinessHours(value, businessHours = 0) {
    let current = alignToBusinessDateTime(value);
    let remainingHours = Math.max(0, roundDurationHours(businessHours));

    if (remainingHours <= 0) {
        return current;
    }

    while (remainingHours > 0.0001) {
        current = alignToBusinessDateTime(current);
        const endOfDay = setBusinessDayTime(current, BUSINESS_DAY_END_HOUR);
        const availableHours = Math.max(0, (endOfDay.getTime() - current.getTime()) / (60 * 60 * 1000));

        if (remainingHours <= availableHours + 0.0001) {
            return new Date(current.getTime() + (remainingHours * 60 * 60 * 1000));
        }

        remainingHours = roundDurationHours(remainingHours - availableHours);
        current = moveToNextBusinessDayStart(current);
    }

    return current;
}

function getBusinessDateTimeForWeek(weekValue, projectStartDate) {
    const safeWeek = sanitizeStartWeekInputValue(weekValue);
    return addBusinessHours(projectStartDate, (safeWeek - START_WEEK_MIN) * HOURS_PER_WEEK);
}

function getPreferredDateFormat() {
    if (storedDateFormatPreference) {
        return storedDateFormatPreference;
    }

    if (!canUseLocalStorage()) {
        storedDateFormatPreference = TABLE_DATE_FORMAT;
        return storedDateFormatPreference;
    }

    try {
        const rawValue = window.localStorage.getItem(DATE_FORMAT_STORAGE_KEY);
        storedDateFormatPreference = rawValue === TABLE_DATE_FORMAT ? rawValue : TABLE_DATE_FORMAT;
        if (rawValue !== TABLE_DATE_FORMAT) {
            window.localStorage.setItem(DATE_FORMAT_STORAGE_KEY, TABLE_DATE_FORMAT);
        }
        return storedDateFormatPreference;
    } catch (_) {
        storedDateFormatPreference = TABLE_DATE_FORMAT;
        return storedDateFormatPreference;
    }
}

function formatDateForTable(value) {
    getPreferredDateFormat();
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

function formatDateForInput(value) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInputValue(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    }

    const rawValue = String(value || '').trim();
    if (!rawValue) return null;

    let year = 0;
    let month = 0;
    let day = 0;

    let match = rawValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
    } else {
        match = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) return null;
        month = Number(match[1]);
        day = Number(match[2]);
        year = Number(match[3]);
    }

    if (!year || !month || !day) {
        return null;
    }

    const date = new Date(year, month - 1, day, BUSINESS_DAY_START_HOUR, 0, 0, 0);
    if (
        Number.isNaN(date.getTime())
        || date.getFullYear() !== year
        || date.getMonth() !== month - 1
        || date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function coerceToBusinessDay(value) {
    const parsedDate = parseDateInputValue(value);
    if (!parsedDate) return null;

    const businessDate = setBusinessDayTime(parsedDate, BUSINESS_DAY_START_HOUR);
    while (isWeekendDay(businessDate)) {
        businessDate.setDate(businessDate.getDate() + 1);
    }
    return businessDate;
}

function countBusinessDaysBetween(startValue, endValue) {
    const startDate = startOfDay(startValue);
    const endDate = startOfDay(endValue);
    if (endDate <= startDate) return 0;

    const cursor = new Date(startDate.getTime());
    let businessDays = 0;
    while (cursor < endDate) {
        cursor.setDate(cursor.getDate() + 1);
        if (!isWeekendDay(cursor)) {
            businessDays += 1;
        }
    }

    return businessDays;
}

function addBusinessDays(value, businessDays = 0) {
    const nextDate = coerceToBusinessDay(value) || setBusinessDayTime(new Date(), BUSINESS_DAY_START_HOUR);
    let remainingDays = Math.max(0, Math.round(Number(businessDays) || 0));

    while (remainingDays > 0) {
        nextDate.setDate(nextDate.getDate() + 1);
        if (!isWeekendDay(nextDate)) {
            remainingDays -= 1;
        }
    }

    return nextDate;
}

function getInclusiveBusinessDaysBetween(startValue, endValue) {
    const startDate = coerceToBusinessDay(startValue);
    const endDate = coerceToBusinessDay(endValue);
    if (!startDate || !endDate) return 1;
    if (endDate < startDate) return 1;
    return countBusinessDaysBetween(startDate, endDate) + 1;
}

function getStartWeekFromDate(value, projectStartDate) {
    const businessDate = coerceToBusinessDay(value);
    if (!businessDate) return START_WEEK_MIN;

    const dayOffset = countBusinessDaysBetween(projectStartDate, businessDate);
    return roundWeekPrecision(START_WEEK_MIN + (dayOffset / DAYS_PER_WEEK));
}

function getInclusiveBusinessDaySpan(startValue, endValue) {
    const startDate = coerceToBusinessDay(startValue);
    const endDate = coerceToBusinessDay(endValue);
    if (!startDate || !endDate || endDate < startDate) {
        return 1;
    }

    return countBusinessDaysBetween(startDate, endDate) + 1;
}

function getTaskEffortHours(task = {}) {
    const explicitEffort = Number(task?.effort_hours);
    const subtasks = sortByOrder(task?.subtasks || []);

    if (subtasks.length > 0 && task?.rollup_method === 'sum_subtasks') {
        const summedEffort = subtasks.reduce((total, item) => total + getTaskEffortHours(item), 0);
        if (summedEffort > 0) return summedEffort;
    }

    if (explicitEffort > 0) return explicitEffort;

    if (subtasks.length > 0) {
        return subtasks.reduce((total, item) => total + getTaskEffortHours(item), 0) || subtasks.length;
    }

    return 1;
}

function durationDaysToWeeks(durationDays = 0) {
    const safeDurationDays = Number(durationDays);
    if (!Number.isFinite(safeDurationDays) || safeDurationDays <= 0) {
        return null;
    }
    return roundWeekPrecision(safeDurationDays / DAYS_PER_WEEK);
}

function getTaskBaseDurationDays(task = {}) {
    const explicitDurationDays = Number(task?.duration_days ?? task?.duration);
    return Number.isFinite(explicitDurationDays) && explicitDurationDays > 0
        ? explicitDurationDays
        : null;
}

function getScaledDurationStepCount(itemCount = 0, threshold = 0, stepSize = 1) {
    const safeItemCount = Math.max(0, Number(itemCount) || 0);
    if (safeItemCount <= threshold) {
        return 0;
    }
    return Math.ceil((safeItemCount - threshold) / Math.max(1, stepSize));
}

function scaleTaskDurationDays(task = {}, solution = {}, capacityProfile = null, baseDurationDays = null) {
    const safeBaseDurationDays = Number(baseDurationDays);
    if (!Number.isFinite(safeBaseDurationDays) || safeBaseDurationDays <= 0) {
        return null;
    }

    if (!capacityProfile?.hasSavedSizing || !capacityProfile?.result) {
        return safeBaseDurationDays;
    }

    const solutionFieldPack = String(solution?.fieldPack || '').trim().toLowerCase();
    const taskId = String(task?.id || '').trim().toLowerCase();
    const taskLabel = String(task?.task || task?.name || '').trim().toLowerCase();
    const matchesTask = (...candidates) => candidates.some((candidate) => taskId === candidate || taskLabel.includes(candidate));

    // Windows AMA field pack — generalized from windows-security-events to all solutions
    // using the windows capacity type (non-WEC). Covers Windows Security Events, Windows DNS,
    // Windows Firewall via AMA, Sysmon via AMA, and any future windows-ama connector.
    if (capacityProfile.type === 'windows' && capacityProfile.result.populationKind !== 'wec') {
        if (matchesTask('wse-arc-onboarding', 'onboard non-azure windows hosts to azure arc')) {
            const stepCount = getScaledDurationStepCount(capacityProfile.result.onPremServers, 15, 10);
            return safeBaseDurationDays + stepCount;
        }

        // Match both the WSE-specific task ID and any task containing 'deploy ama' in its label,
        // so other windows-ama connectors with generic task names also benefit from scaling.
        if (matchesTask('wse-deploy-dcr', 'deploy ama and configure the windows security events dcr', 'deploy ama')) {
            const stepCount = getScaledDurationStepCount(capacityProfile.result.servers, 15, 10);
            return safeBaseDurationDays + (stepCount * 0.5);
        }

        if (matchesTask('wse-validate-securityevent', 'validate securityevent ingestion')) {
            const stepCount = getScaledDurationStepCount(capacityProfile.result.servers, 20, 20);
            return safeBaseDurationDays + (stepCount * 0.5);
        }
    }

    // Syslog/CEF field pack — scale per-connector source-device configuration tasks.
    // Shared infra tasks (CEF-INFRA-01, CEF-INFRA-04) are handled separately in
    // scaleGeneratedInfraDurationHours() because they bypass this function.
    // NOTE: A dedicated 'device_count' or 'source_count' field on the solution would allow
    // direct per-device scaling for PC-02. Until available, forwarder VM count (derived from
    // EPS in the capacity profile) is used as a proxy for syslog/CEF source volume.
    // Threshold 5 VMs, step 5, +0.5 days per step.
    // Skip VM-based scaling when Cribl is the ingestion path (no VMs involved).
    if (capacityProfile.type === 'firewall' && solutionFieldPack === 'syslog-cef' && !capacityProfile.criblIngestion) {
        if (matchesTask('configure source device')) {
            const stepCount = getScaledDurationStepCount(capacityProfile.result.vmCount, 5, 5);
            return safeBaseDurationDays + (stepCount * 0.5);
        }
    }

    return safeBaseDurationDays;
}

function getTaskDurationPreferredUnit(task = {}, fallbackUnit) {
    return getTaskBaseDurationDays(task) != null ? 'days' : fallbackUnit;
}

function getTaskPlannedDurationWeeks(task = {}, solution = {}, capacityProfile = null) {
    const baseDurationDays = getTaskBaseDurationDays(task);
    if (baseDurationDays == null) {
        return null;
    }

    const scaledDurationDays = scaleTaskDurationDays(task, solution, capacityProfile, baseDurationDays);
    return durationDaysToWeeks(scaledDurationDays);
}

function resolvePlannedTaskDurations(items = [], totalDurationWeeks, getWeight, getExplicitDurationWeeks) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const explicitDurations = items.map((item) => {
        const explicitDuration = Number(getExplicitDurationWeeks?.(item));
        return Number.isFinite(explicitDuration) && explicitDuration > 0 ? explicitDuration : null;
    });

    if (!explicitDurations.some((duration) => duration != null)) {
        return allocateDurations(totalDurationWeeks, items, getWeight);
    }

    if (explicitDurations.every((duration) => duration != null)) {
        return explicitDurations.map((duration) => roundWeekPrecision(duration));
    }

    const missingItems = items.filter((_, index) => explicitDurations[index] == null);
    const explicitTotalDuration = explicitDurations.reduce((total, duration) => total + (duration || 0), 0);
    const remainingDurationWeeks = Math.max(
        (Number(totalDurationWeeks) || 0) - explicitTotalDuration,
        missingItems.length * MIN_TASK_DURATION_WEEKS
    );
    const allocatedMissingDurations = allocateDurations(remainingDurationWeeks, missingItems, getWeight);
    let missingIndex = 0;

    return explicitDurations.map((duration) => {
        if (duration != null) {
            return roundWeekPrecision(duration);
        }
        const allocatedDuration = allocatedMissingDurations[missingIndex] ?? MIN_TASK_DURATION_WEEKS;
        missingIndex += 1;
        return roundWeekPrecision(allocatedDuration);
    });
}

function allocateDurations(totalDurationWeeks, items, getWeight) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const safeTotalDuration = Math.max(Number(totalDurationWeeks) || 0, items.length * MIN_TASK_DURATION_WEEKS);
    const weights = items.map((item) => Math.max(Number(getWeight(item)) || 0, 1));
    const totalWeight = weights.reduce((total, weight) => total + weight, 0) || items.length;

    let remainingDuration = safeTotalDuration;

    return items.map((item, index) => {
        if (index === items.length - 1) {
            return Math.max(MIN_TASK_DURATION_WEEKS, roundToTenth(remainingDuration));
        }

        const remainingItems = items.length - index - 1;
        const minRemainingDuration = remainingItems * MIN_TASK_DURATION_WEEKS;
        const proportionalDuration = safeTotalDuration * (weights[index] / totalWeight);
        const duration = Math.min(
            Math.max(MIN_TASK_DURATION_WEEKS, remainingDuration - minRemainingDuration),
            Math.max(MIN_TASK_DURATION_WEEKS, roundToTenth(proportionalDuration))
        );

        remainingDuration = Math.max(0, remainingDuration - duration);
        return duration;
    });
}

function getResolvedDependencies(dependsOn = [], idMap = new Map()) {
    return [...new Set((Array.isArray(dependsOn) ? dependsOn : [])
        .map((dependencyId) => idMap.get(dependencyId))
        .filter(Boolean))];
}

function getDependencyEndWeek(dependencyIds = [], rowById = new Map(), fallbackWeek = 0) {
    return dependencyIds.reduce((maxEndWeek, dependencyId) => {
        return Math.max(maxEndWeek, rowById.get(dependencyId)?.endWeek ?? fallbackWeek);
    }, fallbackWeek);
}

function normalizeDurationUnit(unit = 'hours') {
    return DURATION_UNITS.includes(unit) ? unit : 'hours';
}

function parseDurationInputValue(value, fallbackUnit = 'hours') {
    const rawValue = String(value ?? '').trim().toLowerCase();
    if (!rawValue) return null;

    const match = rawValue.replace(/\s+/g, '').match(/^(\d+(?:[\.,]\d+)?)(h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks)?$/i);
    if (!match) return null;

    const numericValue = sanitizeDurationInputValue(match[1].replace(',', '.'));
    const unitToken = String(match[2] || '').toLowerCase();
    const normalizedUnit = unitToken
        ? {
            h: 'hours',
            hr: 'hours',
            hrs: 'hours',
            hour: 'hours',
            hours: 'hours',
            d: 'days',
            day: 'days',
            days: 'days',
            w: 'weeks',
            wk: 'weeks',
            wks: 'weeks',
            week: 'weeks',
            weeks: 'weeks'
        }[unitToken]
        : normalizeDurationUnit(fallbackUnit);

    if (!normalizedUnit) return null;

    return createDurationPresentation({
        businessHours: durationValueToBusinessHours(numericValue, normalizedUnit),
        preferredUnit: normalizedUnit
    });
}

function sanitizeDurationInputValue(value) {
    return Math.max(0.5, roundToHalfStep(value));
}

function sanitizeStartWeekInputValue(value) {
    return Math.max(START_WEEK_MIN, roundWeekPrecision(Number(value) || START_WEEK_MIN));
}

function durationValueToBusinessHours(value, unit = 'hours') {
    const safeValue = sanitizeDurationInputValue(value);
    switch (normalizeDurationUnit(unit)) {
        case 'days':
            return roundDurationHours(safeValue * HOURS_PER_DAY);
        case 'weeks':
            return roundDurationHours(safeValue * HOURS_PER_WEEK);
        default:
            return roundDurationHours(safeValue);
    }
}

function durationWeeksToBusinessHours(weeks = 0) {
    return roundDurationHours(Math.max(Number(weeks) || 0, MIN_TASK_DURATION_WEEKS) * HOURS_PER_WEEK);
}

function businessHoursToWeeks(hours = 0) {
    return roundWeekPrecision(Math.max(Number(hours) || 0, MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK) / HOURS_PER_WEEK);
}

function inferDurationUnitFromBusinessHours(hours = 0) {
    const safeHours = Math.max(Number(hours) || 0, MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK);
    if (safeHours >= HOURS_PER_WEEK) return 'weeks';
    if (safeHours >= HOURS_PER_DAY) return 'days';
    return 'hours';
}

function getDurationValueForUnit(businessHours = 0, unit = 'hours') {
    const safeUnit = normalizeDurationUnit(unit);
    const safeHours = Math.max(Number(businessHours) || 0, MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK);
    if (safeUnit === 'days') return sanitizeDurationInputValue(safeHours / HOURS_PER_DAY);
    if (safeUnit === 'weeks') return sanitizeDurationInputValue(safeHours / HOURS_PER_WEEK);
    return sanitizeDurationInputValue(safeHours);
}

function formatDurationLabel(value, unit = 'hours') {
    const suffix = {
        hours: 'h',
        days: 'd',
        weeks: 'w'
    }[normalizeDurationUnit(unit)];
    return `${formatCompactNumber(value)}${suffix}`;
}

function formatDurationDisplayLabel(value, unit = 'hours') {
    const safeUnit = normalizeDurationUnit(unit);
    const singularLabel = {
        hours: 'hour',
        days: 'day',
        weeks: 'week'
    }[safeUnit] || 'hour';
    const pluralLabel = `${singularLabel}s`;
    const safeValue = Number(value) || 0;
    return `${formatCompactNumber(safeValue)} ${safeValue === 1 ? singularLabel : pluralLabel}`;
}

function createDurationPresentation({ businessHours = 0, preferredUnit } = {}) {
    const safeHours = roundDurationHours(Math.max(Number(businessHours) || 0, MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK));
    const unit = normalizeDurationUnit(preferredUnit || inferDurationUnitFromBusinessHours(safeHours));
    const value = getDurationValueForUnit(safeHours, unit);
    const normalizedHours = durationValueToBusinessHours(value, unit);

    return {
        value,
        unit,
        label: formatDurationDisplayLabel(value, unit),
        shortLabel: formatDurationLabel(value, unit),
        businessHours: normalizedHours,
        durationWeeks: businessHoursToWeeks(normalizedHours)
    };
}

function createEmptyDurationOverrideState() {
    return {
        version: DURATION_OVERRIDE_STATE_VERSION,
        savedAt: '',
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: {},
        customTasks: {},
        solutionGroups: {},
        taskOrders: {}
    };
}

function canUseLocalStorage() {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch (_) {
        return false;
    }
}

function canUseSessionStorage() {
    try {
        return typeof window !== 'undefined' && !!window.sessionStorage;
    } catch (_) {
        return false;
    }
}

function normalizeGanttTableColumnWidths(rawWidths = {}) {
    return Object.fromEntries(GANTT_TABLE_COLUMNS.map((column) => {
        const parsedWidth = Number(rawWidths?.[column.key]);
        const nextWidth = Number.isFinite(parsedWidth)
            ? Math.max(column.minWidth, Math.round(parsedWidth))
            : column.width;
        return [column.key, nextWidth];
    }));
}

function getGanttTableColumnWidths() {
    if (ganttTableColumnWidths) {
        return { ...ganttTableColumnWidths };
    }

    const defaultWidths = normalizeGanttTableColumnWidths();
    if (!canUseSessionStorage()) {
        ganttTableColumnWidths = defaultWidths;
        return { ...ganttTableColumnWidths };
    }

    try {
        const rawValue = window.sessionStorage.getItem(GANTT_TABLE_COLUMN_WIDTHS_STORAGE_KEY);
        if (!rawValue) {
            ganttTableColumnWidths = defaultWidths;
            return { ...ganttTableColumnWidths };
        }

        ganttTableColumnWidths = normalizeGanttTableColumnWidths(JSON.parse(rawValue));
        return { ...ganttTableColumnWidths };
    } catch (_) {
        ganttTableColumnWidths = defaultWidths;
        return { ...ganttTableColumnWidths };
    }
}

function persistGanttTableColumnWidths(nextWidths = {}) {
    ganttTableColumnWidths = normalizeGanttTableColumnWidths(nextWidths);
    if (!canUseSessionStorage()) {
        return { ...ganttTableColumnWidths };
    }

    try {
        window.sessionStorage.setItem(GANTT_TABLE_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(ganttTableColumnWidths));
    } catch (_) {
        // Session persistence is best-effort only.
    }

    return { ...ganttTableColumnWidths };
}

function getStoredPlannerActiveTab() {
    if (!canUseSessionStorage()) {
        return 'table';
    }

    try {
        return window.sessionStorage.getItem(PLANNER_ACTIVE_TAB_STORAGE_KEY) === 'gantt' ? 'gantt' : 'table';
    } catch (_) {
        return 'table';
    }
}

function persistPlannerActiveTab(tabId = 'table') {
    const normalizedTabId = tabId === 'gantt' ? 'gantt' : 'table';
    if (!canUseSessionStorage()) {
        return normalizedTabId;
    }

    try {
        window.sessionStorage.setItem(PLANNER_ACTIVE_TAB_STORAGE_KEY, normalizedTabId);
    } catch (_) {
        // Session persistence is best-effort only.
    }

    return normalizedTabId;
}

function getPlannerAutoFitViewMode(totalDurationWeeks = 0) {
    const durationWeeks = Math.max(0, Number(totalDurationWeeks) || 0);
    if (durationWeeks <= 20) return 'Weeks';
    if (durationWeeks <= 78) return 'Months';
    return 'Quarters';
}

function scrollGanttToLeadingEdge(chartHost) {
    const ganttContainer = chartHost?.querySelector?.('.gantt-container');
    if (ganttContainer) {
        ganttContainer.scrollLeft = 0;
    }
}

function getGanttTableColumnTemplate(columnWidths = {}) {
    return GANTT_TABLE_COLUMNS.map((column) => `${Math.max(column.minWidth, Number(columnWidths?.[column.key]) || column.width)}px`).join(' ');
}

function getGanttTableColumnPixelWidth(columnWidths = {}) {
    return GANTT_TABLE_COLUMNS.reduce(
        (totalWidth, column) => totalWidth + Math.max(column.minWidth, Number(columnWidths?.[column.key]) || column.width),
        0
    );
}

function getDurationOverrideState() {
    if (durationOverrideState) {
        return durationOverrideState;
    }

    const emptyState = createEmptyDurationOverrideState();
    if (!canUseLocalStorage()) {
        durationOverridesPersistToStorage = false;
        durationOverrideState = emptyState;
        return durationOverrideState;
    }

    try {
        const rawValue = window.localStorage.getItem(DURATION_OVERRIDE_STORAGE_KEY);
        if (!rawValue) {
            durationOverrideState = emptyState;
            durationOverridesPersistToStorage = true;
            return durationOverrideState;
        }

        const parsed = JSON.parse(rawValue);
        durationOverrideState = {
            ...emptyState,
            ...(parsed && typeof parsed === 'object' ? parsed : {}),
            version: DURATION_OVERRIDE_STATE_VERSION,
            overrides: parsed?.overrides && typeof parsed.overrides === 'object'
                ? parsed.overrides
                : {},
            customTasks: parsed?.customTasks && typeof parsed.customTasks === 'object'
                ? parsed.customTasks
                : {},
            solutionGroups: parsed?.solutionGroups && typeof parsed.solutionGroups === 'object'
                ? parsed.solutionGroups
                : {},
            taskOrders: parsed?.taskOrders && typeof parsed.taskOrders === 'object'
                ? parsed.taskOrders
                : {}
        };
        durationOverridesPersistToStorage = true;
        return durationOverrideState;
    } catch (_) {
        durationOverrideState = emptyState;
        durationOverridesPersistToStorage = false;
        return durationOverrideState;
    }
}

function persistDurationOverrideState(nextState) {
    durationOverrideState = nextState;
    if (!canUseLocalStorage()) {
        durationOverridesPersistToStorage = false;
        return false;
    }

    try {
        window.localStorage.setItem(DURATION_OVERRIDE_STORAGE_KEY, JSON.stringify(nextState));
        durationOverridesPersistToStorage = true;
        return true;
    } catch (_) {
        durationOverridesPersistToStorage = false;
        return false;
    }
}

function getDurationOverrideEntries() {
    return { ...(getDurationOverrideState().overrides || {}) };
}

function getCustomTaskEntries() {
    return { ...(getDurationOverrideState().customTasks || {}) };
}

function getTaskOrderEntries() {
    return { ...(getDurationOverrideState().taskOrders || {}) };
}

function buildDurationState({
    taskId,
    defaultDurationWeeks,
    defaultDurationPreferredUnit,
    durationOverrides = {},
    isDurationEditable = true,
    isCustomInherited = false
} = {}) {
    const defaultDuration = createDurationPresentation({
        businessHours: durationWeeksToBusinessHours(defaultDurationWeeks),
        preferredUnit: defaultDurationPreferredUnit
    });
    let effectiveDuration = defaultDuration;
    let hasDirectDurationOverride = false;

    const overrideEntry = durationOverrides?.[taskId];
    const hasStoredDuration = Boolean(overrideEntry) && (
        Object.prototype.hasOwnProperty.call(overrideEntry, 'overrideDuration')
        || Object.prototype.hasOwnProperty.call(overrideEntry, 'value')
    );

    if (isDurationEditable && taskId && hasStoredDuration) {
        const overrideUnit = normalizeDurationUnit(overrideEntry?.unit);
        const overrideValue = sanitizeDurationInputValue(overrideEntry?.overrideDuration ?? overrideEntry?.value);
        const overrideDuration = createDurationPresentation({
            businessHours: durationValueToBusinessHours(overrideValue, overrideUnit),
            preferredUnit: overrideUnit
        });
        const isSameAsDefault = Math.abs(overrideDuration.businessHours - defaultDuration.businessHours) < 0.01;

        if (!isSameAsDefault) {
            effectiveDuration = overrideDuration;
            hasDirectDurationOverride = true;
        }
    }

    return {
        defaultDuration,
        effectiveDuration,
        hasDirectDurationOverride,
        hasDerivedCustomDuration: Boolean(isCustomInherited),
        isCustomDuration: Boolean(hasDirectDurationOverride || isCustomInherited),
        isDurationEditable
    };
}

function buildStartWeekState({
    taskId,
    defaultStartWeek,
    durationOverrides = {},
    isStartWeekEditable = true,
    isCustomInherited = false
} = {}) {
    const safeDefaultStartWeek = sanitizeStartWeekInputValue(defaultStartWeek);
    let effectiveStartWeek = safeDefaultStartWeek;
    let hasDirectStartWeekOverride = false;

    if (isStartWeekEditable && taskId && durationOverrides?.[taskId]) {
        const overrideEntry = durationOverrides[taskId];
        const hasStoredStartWeek = overrideEntry && Object.prototype.hasOwnProperty.call(overrideEntry, 'startWeek');
        const overrideStartWeek = sanitizeStartWeekInputValue(overrideEntry?.startWeek);
        const isSameAsDefault = Math.abs(overrideStartWeek - safeDefaultStartWeek) < 0.0001;

        if (hasStoredStartWeek && !isSameAsDefault) {
            effectiveStartWeek = overrideStartWeek;
            hasDirectStartWeekOverride = true;
        }
    }

    return {
        defaultStartWeek: safeDefaultStartWeek,
        effectiveStartWeek,
        hasDirectStartWeekOverride,
        hasDerivedCustomStartWeek: Boolean(isCustomInherited),
        isCustomStartWeek: Boolean(hasDirectStartWeekOverride || isCustomInherited),
        isStartWeekEditable
    };
}

function createTaskOverrideEntry(row, existingEntry = {}, updatedAt = '', defaultStartWeek = START_WEEK_MIN) {
    return {
        ...existingEntry,
        taskId: row.id,
        connectorId: row.solutionId || 'shared',
        taskLabel: row.step,
        originalDuration: row.defaultDuration.value,
        originalUnit: row.defaultDuration.unit,
        originalStartWeek: defaultStartWeek,
        updatedAt
    };
}

function hasTaskOverridePayload(entry = {}) {
    return Boolean(entry && typeof entry === 'object' && (
        Object.prototype.hasOwnProperty.call(entry, 'overrideDuration')
        || Object.prototype.hasOwnProperty.call(entry, 'startWeek')
        || Object.prototype.hasOwnProperty.call(entry, 'status')
        || Object.prototype.hasOwnProperty.call(entry, 'impact')
        || Object.prototype.hasOwnProperty.call(entry, 'owner')
        || Object.prototype.hasOwnProperty.call(entry, 'step')
        || Object.prototype.hasOwnProperty.call(entry, 'description')
        || Object.prototype.hasOwnProperty.call(entry, 'dependencies')
    ));
}

function persistTaskOverrideEntries(state, overrides, savedAt = new Date().toISOString()) {
    persistDurationOverrideState({
        ...state,
        version: DURATION_OVERRIDE_STATE_VERSION,
        savedAt,
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides,
        customTasks: state?.customTasks && typeof state.customTasks === 'object'
            ? state.customTasks
            : {},
        solutionGroups: state?.solutionGroups && typeof state.solutionGroups === 'object'
            ? state.solutionGroups
            : {},
        taskOrders: state?.taskOrders && typeof state.taskOrders === 'object'
            ? state.taskOrders
            : {}
    });
    return overrides;
}

function saveTaskDurationOverride(row, nextSchedule = {}) {
    if (!row?.id) return getDurationOverrideEntries();

    const state = getDurationOverrideState();
    const overrides = { ...(state.overrides || {}) };
    const existingEntry = overrides[row.id] && typeof overrides[row.id] === 'object'
        ? { ...overrides[row.id] }
        : {};
    const durationValue = nextSchedule?.value ?? row.durationValue;
    const durationUnit = nextSchedule?.unit ?? row.durationUnit;
    const startWeekValue = nextSchedule?.startWeek ?? row.startWeek;
    const solutionGroupShiftWeeks = Number(row?.solutionGroupShiftWeeks) || 0;
    const normalizedDuration = createDurationPresentation({
        businessHours: durationValueToBusinessHours(durationValue, durationUnit),
        preferredUnit: durationUnit
    });
    const normalizedStartWeek = sanitizeStartWeekInputValue(startWeekValue - solutionGroupShiftWeeks);
    const updatedAt = new Date().toISOString();
    const defaultStartWeek = sanitizeStartWeekInputValue(row.defaultStartWeek);
    const isDefaultDuration = Math.abs(normalizedDuration.businessHours - row.defaultDuration.businessHours) < 0.01;
    const isDefaultStartWeek = Math.abs(normalizedStartWeek - defaultStartWeek) < 0.0001;
    const nextEntry = createTaskOverrideEntry(row, existingEntry, updatedAt, defaultStartWeek);

    if (isDefaultDuration) {
        delete nextEntry.overrideDuration;
        delete nextEntry.unit;
        delete nextEntry.normalizedBusinessHours;
    } else {
        nextEntry.overrideDuration = normalizedDuration.value;
        nextEntry.unit = normalizedDuration.unit;
        nextEntry.normalizedBusinessHours = normalizedDuration.businessHours;
    }

    if (isDefaultStartWeek) {
        delete nextEntry.startWeek;
    } else {
        nextEntry.startWeek = normalizedStartWeek;
    }

    if (hasTaskOverridePayload(nextEntry)) {
        overrides[row.id] = nextEntry;
    } else {
        delete overrides[row.id];
    }

    return persistTaskOverrideEntries(state, overrides, updatedAt);
}

function saveTaskFieldOverride(row, nextFields = {}) {
    if (!row?.id) return getDurationOverrideEntries();

    const state = getDurationOverrideState();
    const overrides = { ...(state.overrides || {}) };
    const existingEntry = overrides[row.id] && typeof overrides[row.id] === 'object'
        ? { ...overrides[row.id] }
        : {};
    const updatedAt = new Date().toISOString();
    const defaultStartWeek = sanitizeStartWeekInputValue(row.defaultStartWeek);
    const nextEntry = createTaskOverrideEntry(row, existingEntry, updatedAt, defaultStartWeek);

    if (Object.prototype.hasOwnProperty.call(nextFields, 'status')) {
        nextEntry.status = normalizeStatusLabel(nextFields.status);
    }

    if (Object.prototype.hasOwnProperty.call(nextFields, 'impact')) {
        const nextImpact = normalizeImpactLabel(nextFields.impact);
        if (nextImpact === normalizeImpactLabel(row.defaultImpact || 'Medium')) {
            delete nextEntry.impact;
        } else {
            nextEntry.impact = nextImpact;
        }
    }

    if (Object.prototype.hasOwnProperty.call(nextFields, 'owner')) {
        const nextOwner = normalizeOwnerLabel(nextFields.owner, { allowEmpty: true, preserveCustom: true });
        const defaultOwner = normalizeOwnerLabel(row.defaultOwner, { allowEmpty: true, preserveCustom: true });
        if (nextOwner === defaultOwner) {
            delete nextEntry.owner;
        } else {
            nextEntry.owner = nextOwner;
        }
    }

    if (Object.prototype.hasOwnProperty.call(nextFields, 'step')) {
        const nextStep = String(nextFields.step || '').replace(/\s+/g, ' ').trim() || DEFAULT_NEW_TASK_NAME;
        const defaultStep = String(row.defaultStep || row.step || '').replace(/\s+/g, ' ').trim() || DEFAULT_NEW_TASK_NAME;
        if (nextStep === defaultStep) {
            delete nextEntry.step;
        } else {
            nextEntry.step = nextStep;
        }
    }

    if (Object.prototype.hasOwnProperty.call(nextFields, 'description')) {
        const nextDescription = String(nextFields.description || '').replace(/\s+/g, ' ').trim();
        const defaultDescription = String(row.defaultDescription || '').replace(/\s+/g, ' ').trim();
        if (nextDescription === defaultDescription) {
            delete nextEntry.description;
        } else {
            nextEntry.description = nextDescription;
        }
    }

    if (Object.prototype.hasOwnProperty.call(nextFields, 'dependencies')) {
        const nextDependencies = [...new Set((Array.isArray(nextFields.dependencies) ? nextFields.dependencies : [])
            .map((dependencyId) => String(dependencyId || '').trim())
            .filter((dependencyId) => dependencyId && dependencyId !== row.id))];
        const defaultDependencies = [...new Set((Array.isArray(row.defaultDependencies) ? row.defaultDependencies : [])
            .map((dependencyId) => String(dependencyId || '').trim())
            .filter(Boolean))];
        const isDefaultDependencies = nextDependencies.length === defaultDependencies.length
            && nextDependencies.every((dependencyId, index) => dependencyId === defaultDependencies[index]);
        if (isDefaultDependencies) {
            delete nextEntry.dependencies;
        } else {
            nextEntry.dependencies = nextDependencies;
        }
    }

    if (hasTaskOverridePayload(nextEntry)) {
        overrides[row.id] = nextEntry;
    } else {
        delete overrides[row.id];
    }

    return persistTaskOverrideEntries(state, overrides, updatedAt);
}

function resetTaskDurationOverride(taskId) {
    if (!taskId) return getDurationOverrideEntries();
    const state = getDurationOverrideState();
    const overrides = { ...(state.overrides || {}) };
    const existingEntry = overrides[taskId] && typeof overrides[taskId] === 'object'
        ? { ...overrides[taskId] }
        : null;

    if (!existingEntry) {
        return overrides;
    }

    delete existingEntry.overrideDuration;
    delete existingEntry.unit;
    delete existingEntry.normalizedBusinessHours;
    delete existingEntry.startWeek;

    if (hasTaskOverridePayload(existingEntry)) {
        overrides[taskId] = existingEntry;
    } else {
        delete overrides[taskId];
    }

    return persistTaskOverrideEntries(state, overrides);
}

function resetAllTaskDurationOverrides() {
    const state = getDurationOverrideState();
    const overrides = Object.fromEntries(Object.entries(state.overrides || {}).flatMap(([taskId, entry]) => {
        if (!entry || typeof entry !== 'object') return [];

        const nextEntry = { ...entry };
        delete nextEntry.overrideDuration;
        delete nextEntry.unit;
        delete nextEntry.normalizedBusinessHours;
        delete nextEntry.startWeek;

        return hasTaskOverridePayload(nextEntry) ? [[taskId, nextEntry]] : [];
    }));
    const solutionGroups = Object.fromEntries(Object.entries(state.solutionGroups || {}).flatMap(([solutionId, entry]) => {
        if (!entry || typeof entry !== 'object') return [];

        const nextEntry = { ...entry };
        delete nextEntry.startWeek;
        return hasSolutionGroupPayload(nextEntry) ? [[solutionId, nextEntry]] : [];
    }));

    persistDurationOverrideState({
        ...state,
        version: DURATION_OVERRIDE_STATE_VERSION,
        savedAt: new Date().toISOString(),
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides,
        customTasks: state?.customTasks && typeof state.customTasks === 'object'
            ? state.customTasks
            : {},
        solutionGroups,
        taskOrders: state?.taskOrders && typeof state.taskOrders === 'object'
            ? state.taskOrders
            : {}
    });
    return overrides;
}

function getCustomDurationBadgeLabel(row = {}) {
    if (row?.hasDirectScheduleOverride) return 'Custom';
    if (row?.hasDerivedCustomSchedule) return 'Derived';
    return '';
}

function sortCustomTaskEntries(customTasks = {}) {
    return Object.values(customTasks || {})
        .filter((entry) => entry && typeof entry === 'object' && entry.id)
        .sort((left, right) => {
            const leftCreated = String(left.createdAt || '');
            const rightCreated = String(right.createdAt || '');
            return leftCreated.localeCompare(rightCreated) || String(left.id).localeCompare(String(right.id));
        });
}

function getPhaseRootOrderScope(phaseKey = '') {
    return `phase-root:${String(phaseKey || 'shared').trim() || 'shared'}`;
}

function getSolutionTaskOrderScope(solutionId = '') {
    return `solution:${String(solutionId || 'shared').trim() || 'shared'}:top-level`;
}

function getSubtaskOrderScope(parentRowId = '') {
    return `parent:${String(parentRowId || 'shared').trim() || 'shared'}:subtasks`;
}

function getTaskOrderScopeKeyForRow(row = {}) {
    if (!row?.id) return '';
    if (row.parentId) return getSubtaskOrderScope(row.parentId);
    if (row.solutionId && !row.isSolutionGroup) return getSolutionTaskOrderScope(row.solutionId);
    return getPhaseRootOrderScope(row.phaseKey);
}

function normalizeTaskOrderEntries(taskOrders = {}) {
    return Object.fromEntries(Object.entries(taskOrders || {}).flatMap(([scopeKey, ids]) => {
        if (!scopeKey || !Array.isArray(ids)) return [];
        const normalizedIds = [...new Set(ids
            .map((id) => String(id || '').trim())
            .filter(Boolean))];
        return normalizedIds.length > 0 ? [[scopeKey, normalizedIds]] : [];
    }));
}

function applyScopedIdOrder(items = [], scopeKey = '', taskOrders = {}) {
    const orderIds = Array.isArray(taskOrders?.[scopeKey]) ? taskOrders[scopeKey] : [];
    if (!orderIds.length || !Array.isArray(items) || items.length <= 1) {
        return [...items];
    }

    const orderIndexById = new Map(orderIds.map((id, index) => [String(id), index]));
    return [...items]
        .map((item, index) => ({
            item,
            index,
            orderIndex: orderIndexById.has(String(item?.id)) ? orderIndexById.get(String(item.id)) : Number.POSITIVE_INFINITY
        }))
        .sort((left, right) => {
            if (left.orderIndex !== right.orderIndex) {
                return left.orderIndex - right.orderIndex;
            }
            return left.index - right.index;
        })
        .map(({ item }) => item);
}

function getOrderedScopeIds(scopeKey = '', fallbackIds = [], taskOrders = {}) {
    return applyScopedIdOrder(
        (Array.isArray(fallbackIds) ? fallbackIds : []).map((id) => ({ id })),
        scopeKey,
        taskOrders
    ).map((item) => item.id);
}

function persistTaskOrderEntries(state, taskOrders, savedAt = new Date().toISOString()) {
    const normalizedTaskOrders = normalizeTaskOrderEntries(taskOrders);
    persistDurationOverrideState({
        ...state,
        version: DURATION_OVERRIDE_STATE_VERSION,
        savedAt,
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: state?.overrides && typeof state.overrides === 'object'
            ? state.overrides
            : {},
        customTasks: state?.customTasks && typeof state.customTasks === 'object'
            ? state.customTasks
            : {},
        solutionGroups: state?.solutionGroups && typeof state.solutionGroups === 'object'
            ? state.solutionGroups
            : {},
        taskOrders: normalizedTaskOrders
    });
    return normalizedTaskOrders;
}

function saveTaskOrderScope(scopeKey = '', orderedIds = []) {
    if (!scopeKey) return getTaskOrderEntries();
    const state = getDurationOverrideState();
    const taskOrders = { ...(state.taskOrders || {}) };
    const normalizedIds = [...new Set((Array.isArray(orderedIds) ? orderedIds : [])
        .map((id) => String(id || '').trim())
        .filter(Boolean))];

    if (normalizedIds.length > 1) {
        taskOrders[scopeKey] = normalizedIds;
    } else {
        delete taskOrders[scopeKey];
    }

    return persistTaskOrderEntries(state, taskOrders);
}

function appendTaskToOrderScope(scopeKey = '', taskId = '') {
    const safeTaskId = String(taskId || '').trim();
    if (!scopeKey || !safeTaskId) return getTaskOrderEntries();

    const state = getDurationOverrideState();
    const currentIds = Array.isArray(state.taskOrders?.[scopeKey]) ? state.taskOrders[scopeKey] : null;
    if (!currentIds || currentIds.includes(safeTaskId)) {
        return state.taskOrders || {};
    }

    return saveTaskOrderScope(scopeKey, [...currentIds, safeTaskId]);
}

function removeTaskIdsFromTaskOrders(taskIds = []) {
    const idsToRemove = new Set((Array.isArray(taskIds) ? taskIds : [taskIds])
        .map((taskId) => String(taskId || '').trim())
        .filter(Boolean));
    if (idsToRemove.size === 0) return getTaskOrderEntries();

    const state = getDurationOverrideState();
    const taskOrders = Object.fromEntries(Object.entries(state.taskOrders || {}).flatMap(([scopeKey, ids]) => {
        if (!Array.isArray(ids)) return [];
        const remainingIds = ids.filter((id) => !idsToRemove.has(String(id || '').trim()));
        return remainingIds.length > 1 ? [[scopeKey, remainingIds]] : [];
    }));

    return persistTaskOrderEntries(state, taskOrders);
}

function generateCustomTaskId(solutionId = 'shared') {
    const safePrefix = String(solutionId || 'shared').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'shared';
    return `task-custom-${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistCustomTaskEntries(state, customTasks, savedAt = new Date().toISOString()) {
    persistDurationOverrideState({
        ...state,
        version: DURATION_OVERRIDE_STATE_VERSION,
        savedAt,
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: state?.overrides && typeof state.overrides === 'object'
            ? state.overrides
            : {},
        customTasks,
        solutionGroups: state?.solutionGroups && typeof state.solutionGroups === 'object'
            ? state.solutionGroups
            : {},
        taskOrders: state?.taskOrders && typeof state.taskOrders === 'object'
            ? state.taskOrders
            : {}
    });
    return customTasks;
}

function getSolutionGroupEntries() {
    return { ...(getDurationOverrideState().solutionGroups || {}) };
}

function createSolutionGroupEntry(solutionId, solutionName, existingEntry = {}, updatedAt = '', defaultStartWeek = START_WEEK_MIN) {
    return {
        ...existingEntry,
        solutionId,
        solutionName,
        originalStartWeek: sanitizeStartWeekInputValue(defaultStartWeek),
        updatedAt
    };
}

function hasSolutionGroupPayload(entry = {}) {
    return Boolean(entry && typeof entry === 'object' && (
        Object.prototype.hasOwnProperty.call(entry, 'startWeek')
        || Object.prototype.hasOwnProperty.call(entry, 'collapsed')
        || Object.prototype.hasOwnProperty.call(entry, 'sizing')
    ));
}

function persistSolutionGroupEntries(state, solutionGroups, savedAt = new Date().toISOString()) {
    persistDurationOverrideState({
        ...state,
        version: DURATION_OVERRIDE_STATE_VERSION,
        savedAt,
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: state?.overrides && typeof state.overrides === 'object'
            ? state.overrides
            : {},
        customTasks: state?.customTasks && typeof state.customTasks === 'object'
            ? state.customTasks
            : {},
        solutionGroups,
        taskOrders: state?.taskOrders && typeof state.taskOrders === 'object'
            ? state.taskOrders
            : {}
    });
    return solutionGroups;
}

function readSolutionGroupState(solutionId = '', defaultStartWeek = START_WEEK_MIN, solutionName = '', defaultCollapsed = true) {
    const safeDefaultStartWeek = sanitizeStartWeekInputValue(defaultStartWeek);
    const entry = getDurationOverrideState().solutionGroups?.[solutionId];
    const hasStoredStartWeek = Boolean(entry) && Object.prototype.hasOwnProperty.call(entry, 'startWeek');
    const overrideStartWeek = sanitizeStartWeekInputValue(entry?.startWeek);
    const hasDirectStartWeekOverride = hasStoredStartWeek && Math.abs(overrideStartWeek - safeDefaultStartWeek) >= 0.0001;
    const safeDefaultCollapsed = Boolean(defaultCollapsed);

    return {
        solutionId,
        solutionName: String(entry?.solutionName || solutionName || '').trim(),
        defaultStartWeek: safeDefaultStartWeek,
        effectiveStartWeek: hasDirectStartWeekOverride ? overrideStartWeek : safeDefaultStartWeek,
        hasDirectStartWeekOverride,
        defaultCollapsed: safeDefaultCollapsed,
        collapsed: entry && Object.prototype.hasOwnProperty.call(entry, 'collapsed')
            ? Boolean(entry.collapsed)
            : safeDefaultCollapsed
    };
}

function saveSolutionGroupState(solutionId = '', {
    solutionName = '',
    defaultStartWeek = START_WEEK_MIN,
    defaultCollapsed = true,
    startWeek,
    collapsed,
    sizing,
    ownerSolutionId = ''
} = {}) {
    if (!solutionId) return getSolutionGroupEntries();

    const state = getDurationOverrideState();
    const solutionGroups = { ...(state.solutionGroups || {}) };
    const existingEntry = solutionGroups[solutionId] && typeof solutionGroups[solutionId] === 'object'
        ? { ...solutionGroups[solutionId] }
        : {};
    const updatedAt = new Date().toISOString();
    const safeDefaultStartWeek = sanitizeStartWeekInputValue(defaultStartWeek);
    const nextEntry = createSolutionGroupEntry(solutionId, solutionName, existingEntry, updatedAt, safeDefaultStartWeek);

    if (Object.prototype.hasOwnProperty.call(arguments[1] || {}, 'startWeek')) {
        const normalizedStartWeek = sanitizeStartWeekInputValue(startWeek);
        if (Math.abs(normalizedStartWeek - safeDefaultStartWeek) < 0.0001) {
            delete nextEntry.startWeek;
        } else {
            nextEntry.startWeek = normalizedStartWeek;
        }
    }

    if (Object.prototype.hasOwnProperty.call(arguments[1] || {}, 'collapsed')) {
        const safeDefaultCollapsed = Boolean(defaultCollapsed);
        const nextCollapsed = Boolean(collapsed);
        if (nextCollapsed === safeDefaultCollapsed) {
            delete nextEntry.collapsed;
        } else {
            nextEntry.collapsed = nextCollapsed;
        }
    }

    if (Object.prototype.hasOwnProperty.call(arguments[1] || {}, 'sizing')) {
        if (sizing && typeof sizing === 'object') {
            nextEntry.sizing = { ...sizing };
            if (ownerSolutionId) {
                nextEntry.ownerSolutionId = ownerSolutionId;
            } else {
                delete nextEntry.ownerSolutionId;
            }
        } else {
            delete nextEntry.sizing;
            delete nextEntry.ownerSolutionId;
        }
    }

    if (!Object.prototype.hasOwnProperty.call(nextEntry, 'sizing')) {
        delete nextEntry.ownerSolutionId;
    }

    if (hasSolutionGroupPayload(nextEntry)) {
        solutionGroups[solutionId] = nextEntry;
    } else {
        delete solutionGroups[solutionId];
    }

    return persistSolutionGroupEntries(state, solutionGroups, updatedAt);
}

function getCapacitySnapshot(selectedSolutions = []) {
    return buildCapacitySnapshot(selectedSolutions, getSolutionGroupEntries());
}

export function getConnectorCapacitySnapshot(selectedSolutions = []) {
    return getCapacitySnapshot(selectedSolutions);
}

export function clearConnectorCriblIngestion() {
    const nextSolutionGroups = clearCriblIngestionEntries(getSolutionGroupEntries());
    persistSolutionGroupEntries(getDurationOverrideState(), nextSolutionGroups);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sentinelPlanner:capacity-changed', {
            detail: {
                solutionId: 'cribl-stream',
                cleared: true
            }
        }));
    }
    return nextSolutionGroups;
}

export function saveConnectorCapacityValues(solution = {}, values = {}, { selectedSolutions = [], relation = '', targetPoolId = '' } = {}) {
    const solutionGroups = updateConnectorCapacityEntries(getSolutionGroupEntries(), solution, values, {
        selectedSolutions,
        relation,
        targetPoolId
    });
    const persistedGroups = persistSolutionGroupEntries(getDurationOverrideState(), solutionGroups);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sentinelPlanner:capacity-changed', {
            detail: {
                solutionId: solution?.id || '',
                relation,
                targetPoolId
            }
        }));
    }
    return persistedGroups;
}

function getSolutionGroupRowId(solutionId = '') {
    return `solution-group-${String(solutionId || '').trim() || 'shared'}`;
}

function createCustomTaskEntry(row, { kind = 'top-level' } = {}) {
    const normalizedOwner = normalizeOwnerLabel(row?.owner, { allowEmpty: true, preserveCustom: true });
    return {
        id: generateCustomTaskId(row?.solutionId || 'shared'),
        solutionId: row?.solutionId || '',
        solutionName: row?.solutionName || row?.detailFields?.Solution || 'Shared onboarding plan',
        parentRowId: kind === 'subtask' ? row.id : '',
        createdAt: new Date().toISOString(),
        step: DEFAULT_NEW_TASK_NAME,
        description: DEFAULT_NEW_TASK_DESCRIPTION,
        summary: DEFAULT_NEW_TASK_SUMMARY,
        owner: normalizedOwner,
        resourceType: row?.resourceType || 'Customer',
        status: 'Not Started',
        impact: 'Medium',
        durationValue: DEFAULT_NEW_TASK_DURATION_VALUE,
        durationUnit: DEFAULT_NEW_TASK_DURATION_UNIT,
        connectorType: row?.detailFields?.['Connector type'] || '',
        difficulty: row?.detailFields?.Difficulty || '',
        requiredPermissions: row?.detailFields?.['Required permissions'] || '',
        goal: row?.goal || row?.detailFields?.Goal || '',
        milestone: row?.milestone || row?.detailFields?.Milestone || '',
        optional: false
    };
}

function addCustomTask(row, options = {}) {
    if (!row?.solutionId) return '';
    const state = getDurationOverrideState();
    const customTasks = { ...(state.customTasks || {}) };
    const entry = createCustomTaskEntry(row, options);
    customTasks[entry.id] = entry;
    persistCustomTaskEntries(state, customTasks, entry.createdAt);
    const scopeKey = entry.parentRowId
        ? getSubtaskOrderScope(entry.parentRowId)
        : getSolutionTaskOrderScope(entry.solutionId);
    appendTaskToOrderScope(scopeKey, entry.id);
    return entry.id;
}

function removeTaskOverrideEntries(taskIds = []) {
    const state = getDurationOverrideState();
    const overrides = { ...(state.overrides || {}) };
    let mutated = false;
    (Array.isArray(taskIds) ? taskIds : [taskIds]).forEach((taskId) => {
        if (taskId && Object.prototype.hasOwnProperty.call(overrides, taskId)) {
            delete overrides[taskId];
            mutated = true;
        }
    });
    if (!mutated) return overrides;
    return persistTaskOverrideEntries({ ...state, overrides }, overrides);
}

function deleteCustomTask(taskId) {
    if (!taskId) return getCustomTaskEntries();
    const state = getDurationOverrideState();
    const customTasks = { ...(state.customTasks || {}) };
    if (!customTasks[taskId]) return customTasks;

    const taskIdsToRemove = [taskId, ...sortCustomTaskEntries(customTasks)
        .filter((entry) => entry.parentRowId === taskId)
        .map((entry) => entry.id)];

    taskIdsToRemove.forEach((id) => delete customTasks[id]);
    removeTaskOverrideEntries(taskIdsToRemove);
    removeTaskIdsFromTaskOrders(taskIdsToRemove);
    return persistCustomTaskEntries(getDurationOverrideState(), customTasks);
}

function applyRowDisplayOverrides(rows = [], durationOverrides = {}) {
    const appliedRows = [];
    const appliedRowsById = new Map();

    rows.forEach((row) => {
        const overrideEntry = durationOverrides?.[row.id];
        const hasStatusOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'status');
        const hasImpactOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'impact');
        const hasOwnerOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'owner');
        const hasStepOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'step');
        const hasDescriptionOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'description');
        const hasDependencyOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'dependencies');

        const nextStatus = hasStatusOverride ? normalizeStatusLabel(overrideEntry.status) : row.status;
        const nextImpact = hasImpactOverride ? normalizeImpactLabel(overrideEntry.impact) : row.impact;
        const nextOwner = hasOwnerOverride
            ? normalizeOwnerLabel(overrideEntry.owner, { preserveCustom: true })
            : row.owner;
        const nextStep = hasStepOverride
            ? String(overrideEntry.step || '').replace(/\s+/g, ' ').trim() || DEFAULT_NEW_TASK_NAME
            : row.step;
        const nextDescription = hasDescriptionOverride
            ? String(overrideEntry.description || '').replace(/\s+/g, ' ').trim()
            : row.description;
        const nextDependencies = hasDependencyOverride
            ? [...new Set((Array.isArray(overrideEntry?.dependencies) ? overrideEntry.dependencies : [])
                .map((dependencyId) => String(dependencyId || '').trim())
                .filter((dependencyId) => dependencyId && dependencyId !== row.id))]
            : [...(Array.isArray(row.dependencies) ? row.dependencies : [])];

        const nextRow = {
            ...row,
            status: nextStatus,
            impact: nextImpact,
            owner: nextOwner,
            step: nextStep,
            description: nextDescription,
            dependencies: nextDependencies,
            hasDirectStatusOverride: hasStatusOverride,
            statusWasManuallySet: hasStatusOverride,
            hasDirectImpactOverride: hasImpactOverride,
            hasDirectOwnerOverride: hasOwnerOverride,
            hasDirectStepOverride: hasStepOverride,
            hasDirectDescriptionOverride: hasDescriptionOverride,
            hasDirectDependencyOverride: hasDependencyOverride,
            detailFields: {
                ...row.detailFields,
                Status: nextStatus,
                Owner: nextOwner,
                Priority: nextImpact,
                Goal: row.detailFields?.Goal || row.goal,
                Description: nextDescription
            }
        };

        if (!nextRow.isSolutionGroup && !nextRow.hasDirectStartWeekOverride && nextDependencies.length > 0) {
            const dependencyDrivenStartWeek = sanitizeStartWeekInputValue(
                getDependencyEndWeek(nextDependencies, appliedRowsById, nextRow.defaultStartWeek)
            );
            const hasDerivedDependencyShift = Math.abs(dependencyDrivenStartWeek - nextRow.defaultStartWeek) >= 0.0001;
            nextRow.startWeek = dependencyDrivenStartWeek;
            nextRow.endWeek = roundWeekPrecision(dependencyDrivenStartWeek + nextRow.durationWeeks);
            nextRow.hasDerivedCustomStartWeek = Boolean(nextRow.hasDerivedCustomStartWeek || hasDerivedDependencyShift);
            nextRow.isCustomStartWeek = Boolean(nextRow.hasDirectStartWeekOverride || nextRow.hasDerivedCustomStartWeek);
            nextRow.hasDerivedCustomSchedule = Boolean(nextRow.hasDerivedCustomDuration || nextRow.hasDerivedCustomStartWeek);
            nextRow.isCustomSchedule = Boolean(nextRow.hasDirectScheduleOverride || nextRow.hasDerivedCustomSchedule);
        }

        appliedRows.push(nextRow);
        appliedRowsById.set(nextRow.id, nextRow);
    });

    return appliedRows;
}

function getDurationHelperText(row = {}) {
    if (!row?.isScheduleEditable) {
        return row?.hasDerivedCustomSchedule
            ? 'This summary row rolls up custom child timing. Edit the child tasks to change the proposed schedule.'
            : 'This summary row is calculated from child tasks. Edit the child tasks to change the proposed schedule.';
    }

    return durationOverridesPersistToStorage
        ? 'Adjust start week or duration. Tasks without a custom start keep auto-shifting, and your changes are saved to this browser.'
        : 'Adjust start week or duration. Tasks without a custom start keep auto-shifting for this session only.';
}

function getBarLabelCandidates(task = {}) {
    const normalizedTaskLabel = String(task?.labelText || task?.name || '').replace(/\s+/g, ' ').trim();
    const normalizedDurationLabel = String(task?.durationLabel || '').replace(/\s+/g, ' ').trim();
    return [...new Set([normalizedTaskLabel, normalizedDurationLabel].filter(Boolean))];
}

function fitSvgLabelText(label, text, maxWidth) {
    const normalizedText = String(text || '').replace(/\s+/g, ' ').trim();
    if (!label || !normalizedText || !(maxWidth > 0)) return '';

    label.textContent = normalizedText;
    const fullWidth = typeof label.getComputedTextLength === 'function' ? label.getComputedTextLength() : 0;
    if (!fullWidth || fullWidth <= maxWidth) {
        return normalizedText;
    }

    let low = 1;
    let high = normalizedText.length;
    let bestFit = '';

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = `${normalizedText.slice(0, Math.max(1, mid - 1)).trimEnd()}…`;
        label.textContent = candidate;
        const candidateWidth = typeof label.getComputedTextLength === 'function' ? label.getComputedTextLength() : 0;
        if (!candidateWidth || candidateWidth <= maxWidth) {
            bestFit = candidate;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    label.textContent = bestFit || '';
    return bestFit;
}

function resolveBarLabelText(label, task = {}, maxWidth = 0) {
    const [taskLabel = '', durationLabel = ''] = getBarLabelCandidates(task);
    const fittedTaskLabel = fitSvgLabelText(label, taskLabel, maxWidth);
    const visibleTaskCharacters = fittedTaskLabel.replace(/…/g, '').trim().length;
    if (fittedTaskLabel && visibleTaskCharacters >= GANTT_BAR_LABEL_MIN_PRIMARY_CHARS) {
        return fittedTaskLabel;
    }

    const fittedDurationLabel = fitSvgLabelText(label, durationLabel, maxWidth);
    if (fittedDurationLabel) {
        return fittedDurationLabel;
    }

    return fittedTaskLabel;
}

function syncTaskBarLabel(wrapper, rect, task = {}) {
    if (!wrapper || !rect) return null;

    const barGroup = wrapper.querySelector('.bar-group') || wrapper;
    const label = wrapper.querySelector('.bar-label') || createSvgElement('text', 'bar-label');
    if (!label.isConnected) {
        barGroup.appendChild(label);
    }

    const needsActionLabel = Boolean(task?.isSolutionGroup || task?.isSummary);
    const actionLabelText = needsActionLabel ? getSolutionGroupActionLabel(Boolean(task?.isCollapsed)) : '';
    const actionLabel = needsActionLabel
        ? (wrapper.querySelector('.gantt-solution-group-action-label') || createSvgElement('text', 'gantt-solution-group-action-label'))
        : wrapper.querySelector('.gantt-solution-group-action-label');
    if (needsActionLabel && actionLabel && !actionLabel.isConnected) {
        barGroup.appendChild(actionLabel);
    }

    if (actionLabel) {
        if (!needsActionLabel) {
            actionLabel.remove();
        } else {
            actionLabel.textContent = actionLabelText;
            actionLabel.style.display = 'block';
            actionLabel.setAttribute('text-anchor', 'start');
            actionLabel.setAttribute('dominant-baseline', 'central');
        }
    }

    const actionLabelWidth = actionLabelText && actionLabel && typeof actionLabel.getComputedTextLength === 'function'
        ? actionLabel.getComputedTextLength()
        : actionLabelText
            ? 58
            : 0;
    const actionLabelGap = actionLabelText ? 8 : 0;

    const x = Number(rect.getAttribute('x')) || 0;
    const y = Number(rect.getAttribute('y')) || 0;
    const width = Number(rect.getAttribute('width')) || 0;
    const height = Number(rect.getAttribute('height')) || 0;
    const padding = Math.max(6, Math.min(GANTT_BAR_LABEL_PADDING, Math.max(width / 5, 6)));
    const maxWidth = Math.max(0, width - (padding * 2) - actionLabelWidth - actionLabelGap);
    const taskLabel = String(task?.labelText || task?.name || '').replace(/\s+/g, ' ').trim();
    const insideTaskLabel = fitSvgLabelText(label, taskLabel, maxWidth);
    const insideVisibleTaskCharacters = insideTaskLabel.replace(/…/g, '').trim().length;
    const preferOutsideLabel = Boolean(task?.isSolutionGroup || task?.isSummary);

    let nextLabelText = resolveBarLabelText(label, task, maxWidth);
    let labelX = x + padding;
    let activeMaxWidth = maxWidth;
    let isOutside = false;

    if (taskLabel && (preferOutsideLabel || !insideTaskLabel || insideVisibleTaskCharacters < GANTT_BAR_LABEL_MIN_PRIMARY_CHARS)) {
        const svg = wrapper.closest('svg.gantt') || wrapper.ownerSVGElement;
        const svgWidth = Number(svg?.getAttribute('width')) || svg?.getBoundingClientRect().width || 0;
        const outsideX = x + width + 8;
        const outsideMaxWidth = Math.max(0, svgWidth - outsideX - 8 - actionLabelWidth - actionLabelGap);
        const outsideTaskLabel = fitSvgLabelText(label, taskLabel, outsideMaxWidth);

        if (outsideTaskLabel) {
            nextLabelText = outsideTaskLabel;
            labelX = outsideX;
            activeMaxWidth = outsideMaxWidth;
            isOutside = true;
        }
    }

    label.classList.remove('big');
    label.classList.toggle('is-outside', isOutside);
    label.style.display = 'block';
    label.setAttribute('x', String(labelX));
    label.setAttribute('y', String(y + (height / 2)));
    label.setAttribute('text-anchor', 'start');
    label.setAttribute('dominant-baseline', 'central');
    label.dataset.fullLabel = taskLabel;

    const tooltip = wrapper.querySelector('title') || createSvgElement('title');
    if (!tooltip.isConnected) {
        wrapper.insertBefore(tooltip, wrapper.firstChild);
    }
    tooltip.textContent = [
        taskLabel,
        task?.startDateLabel ? `Start: ${task.startDateLabel}` : '',
        task?.dueDateLabel ? `End: ${task.dueDateLabel}` : '',
        task?.durationLabel ? `Duration: ${task.durationLabel}` : '',
        task?.status ? `Status: ${task.status}` : ''
    ].filter(Boolean).join('\n');

    const shouldHideLabel = !nextLabelText || activeMaxWidth < GANTT_BAR_LABEL_MIN_TEXT_WIDTH;
    label.textContent = shouldHideLabel ? '' : nextLabelText;
    label.style.display = shouldHideLabel ? 'none' : 'block';
    label.setAttribute(
        'aria-label',
        [taskLabel, task?.durationLabel || ''].filter(Boolean).join(' — ')
    );

    if (needsActionLabel && actionLabel) {
        const visibleLabelWidth = !shouldHideLabel && typeof label.getComputedTextLength === 'function'
            ? label.getComputedTextLength()
            : 0;
        const canShowActionLabel = Boolean(actionLabelText)
            && ((isOutside && activeMaxWidth >= Math.max(12, actionLabelWidth))
                || (!isOutside && width >= actionLabelWidth + actionLabelGap + 24));
        actionLabel.textContent = canShowActionLabel ? actionLabelText : '';
        actionLabel.style.display = canShowActionLabel ? 'block' : 'none';
        actionLabel.setAttribute('x', String(labelX + visibleLabelWidth + actionLabelGap));
        actionLabel.setAttribute('y', String(y + (height / 2)));
        actionLabel.dataset.toggleType = task?.isSolutionGroup ? 'solution-group' : 'summary';
        actionLabel.dataset.toggleId = task.id || '';
    }

    return label;
}

function normalizeHexColor(hexColor = '') {
    const safeHex = String(hexColor || '').replace('#', '');
    return /^[0-9a-fA-F]{6}$/.test(safeHex) ? safeHex.toUpperCase() : '';
}

function hexToRgba(hexColor, alpha = 1) {
    const normalizedHex = normalizeHexColor(hexColor);
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    if (!normalizedHex) return `rgba(148, 163, 184, ${safeAlpha})`;

    const channels = [0, 2, 4].map((index) => parseInt(normalizedHex.slice(index, index + 2), 16));
    return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${safeAlpha})`;
}

function darkenHexColor(hexColor, amount = 0.18) {
    const safeHex = normalizeHexColor(hexColor);
    if (!safeHex) return hexColor;

    const safeAmount = Math.max(0, Math.min(1, Number(amount) || 0));
    const darkened = [0, 2, 4]
        .map((index) => parseInt(safeHex.slice(index, index + 2), 16))
        .map((channel) => Math.max(0, Math.round(channel * (1 - safeAmount))))
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('');

    return `#${darkened.toUpperCase()}`;
}

function lightenHexColor(hexColor, amount = 0.22) {
    const safeHex = normalizeHexColor(hexColor);
    if (!safeHex) return hexColor;

    const safeAmount = Math.max(0, Math.min(1, Number(amount) || 0));
    const lightened = [0, 2, 4]
        .map((index) => parseInt(safeHex.slice(index, index + 2), 16))
        .map((channel) => Math.round(channel + ((255 - channel) * safeAmount)))
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('');

    return `#${lightened.toUpperCase()}`;
}

function isLightThemeActive() {
    if (typeof document === 'undefined') return false;
    return document.documentElement?.getAttribute('data-theme') === 'light';
}

function getConnectorTextAccentColor(color = '') {
    const normalizedColor = normalizeHexColor(color);
    if (!normalizedColor) return color;

    const paletteIndex = CONNECTOR_COLOR_PALETTE.findIndex((entry) => normalizeHexColor(entry) === normalizedColor);
    if (paletteIndex >= 0) {
        const palette = isLightThemeActive()
            ? CONNECTOR_COLOR_PALETTE_LIGHT_TEXT
            : CONNECTOR_COLOR_PALETTE_DARK_TEXT;
        return palette[paletteIndex] || color;
    }

    return isLightThemeActive()
        ? darkenHexColor(`#${normalizedColor}`, 0.3)
        : lightenHexColor(`#${normalizedColor}`, 0.28);
}

function applyConnectorAccentLabel(element, color = '') {
    if (!element || !color) return;
    element.style.color = getConnectorTextAccentColor(color);
    element.style.fontWeight = '600';
}

function applyConnectorAccentSurface(element, color = '') {
    if (!element || !color) return;
    element.style.boxShadow = `inset 3px 0 0 ${color}`;
    element.style.background = `linear-gradient(90deg, ${hexToRgba(color, 0.16)} 0%, ${hexToRgba(color, 0.06)} 34%, transparent 72%)`;
}

function getRowDisplayLabel(row, collapsedSummaryIds = new Set(), collapsedSolutionGroupIds = new Set()) {
    if (row.isSolutionGroup) {
        return getRowPrimaryLabel(row);
    }

    if (row.isSummary) {
        const prefix = collapsedSummaryIds.has(row.id) ? SUMMARY_COLLAPSED_PREFIX : SUMMARY_EXPANDED_PREFIX;
        return `${prefix} ${row.step}`;
    }

    if (row.parentId) {
        return `${SUBTASK_INDENT_PREFIX}${row.step}`;
    }

    return row.step || '';
}

function formatExportStepLabel(row) {
    if (row.isSolutionGroup) return getRowPrimaryLabel(row);
    return row.parentId ? `${SUBTASK_INDENT_PREFIX}${row.step}` : (row.step || '');
}

function createRow({
    id,
    phaseKey,
    number,
    status = 'Not Started',
    impact = 'Medium',
    step,
    milestone,
    goal,
    owner,
    resourceType,
    task,
    description = '',
    requiredRoles = [],
    startWeek,
    durationWeeks,
    durationHours,
    durationState,
    startWeekState,
    dependencies = [],
    details = {},
    parentId = '',
    isSummary = false,
    isSolutionGroup = false,
    taskType = 'Task',
    solutionId = '',
    solutionName = '',
    solutionGroupId = '',
    solutionGroupShiftWeeks = 0,
    capacityProfile = null,
    isDurationEditable = !isSummary && !isSolutionGroup,
    isStartWeekEditable = !isSummary && !isSolutionGroup,
    isUserAdded = false
}) {
    const phase = PHASE_BY_KEY[phaseKey];
    const resolvedTaskType = isSolutionGroup ? 'Solution group' : isSummary ? 'Summary task' : taskType;
    const resolvedDurationState = durationState || buildDurationState({
        taskId: id,
        defaultDurationWeeks: durationWeeks,
        isDurationEditable
    });
    const resolvedStartWeekState = startWeekState || buildStartWeekState({
        taskId: id,
        defaultStartWeek: startWeek,
        isStartWeekEditable
    });
    const safeStartWeek = sanitizeStartWeekInputValue(resolvedStartWeekState.effectiveStartWeek);
    const safeDefaultStartWeek = sanitizeStartWeekInputValue(resolvedStartWeekState.defaultStartWeek);
    const safeDurationWeeks = Math.max(
        MIN_TASK_DURATION_WEEKS,
        roundWeekPrecision(resolvedDurationState.effectiveDuration.durationWeeks)
    );
    const safeEndWeek = roundWeekPrecision(safeStartWeek + safeDurationWeeks);
    const fallbackDurationHours = safeDurationWeeks <= 0.5
        ? 0.5
        : safeDurationWeeks <= 1
            ? 1
            : safeDurationWeeks <= 2
                ? 2
                : 3;
    const rawDurationHours = Number(durationHours);
    const safeEffortHours = CLEAN_EFFORT_HOURS.reduce((closest, candidate) => {
        const sourceValue = rawDurationHours > 0 ? rawDurationHours : fallbackDurationHours;
        return Math.abs(candidate - sourceValue) < Math.abs(closest - sourceValue) ? candidate : closest;
    }, CLEAN_EFFORT_HOURS[0]);
    const hasDirectScheduleOverride = Boolean(
        resolvedDurationState.hasDirectDurationOverride || resolvedStartWeekState.hasDirectStartWeekOverride
    );
    const hasDerivedCustomSchedule = Boolean(
        resolvedDurationState.hasDerivedCustomDuration || resolvedStartWeekState.hasDerivedCustomStartWeek
    );
    const normalizedDescription = String(description || '').replace(/\s+/g, ' ').trim();
    const normalizedRequiredRoles = [...new Set((Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles])
        .map((role) => String(role || '').trim())
        .filter(Boolean))];
    const normalizedOwner = normalizeOwnerLabel(owner, { preserveCustom: true });

    return {
        id,
        number,
        phaseKey,
        phase: phase.name,
        status,
        defaultStatus: normalizeStatusLabel(status),
        statusWasManuallySet: false,
        impact: normalizeImpactLabel(impact),
        defaultImpact: normalizeImpactLabel(impact),
        step,
        defaultStep: step,
        milestone,
        goal,
        owner: normalizedOwner,
        defaultOwner: normalizedOwner,
        resourceType,
        task,
        description: normalizedDescription,
        defaultDescription: normalizedDescription,
        requiredRoles: normalizedRequiredRoles,
        startWeek: safeStartWeek,
        defaultStartWeek: safeDefaultStartWeek,
        durationWeeks: safeDurationWeeks,
        durationValue: resolvedDurationState.effectiveDuration.value,
        durationUnit: resolvedDurationState.effectiveDuration.unit,
        durationLabel: resolvedDurationState.effectiveDuration.label,
        durationBusinessHours: resolvedDurationState.effectiveDuration.businessHours,
        defaultDuration: { ...resolvedDurationState.defaultDuration },
        defaultDurationWeeks: roundWeekPrecision(resolvedDurationState.defaultDuration.durationWeeks),
        defaultDurationLabel: resolvedDurationState.defaultDuration.label,
        defaultDurationBusinessHours: resolvedDurationState.defaultDuration.businessHours,
        effortHours: safeEffortHours,
        durationHours: safeEffortHours,
        endWeek: safeEndWeek,
        dependencies,
        defaultDependencies: [...dependencies],
        parentId,
        isSummary,
        isSolutionGroup,
        isSubtask: Boolean(parentId),
        isUserAdded: Boolean(isUserAdded),
        taskType: resolvedTaskType,
        solutionId,
        solutionName,
        solutionGroupId: solutionGroupId || (isSolutionGroup ? id : ''),
        solutionGroupShiftWeeks: Number(solutionGroupShiftWeeks) || 0,
        capacityProfile,
        isDurationEditable: resolvedDurationState.isDurationEditable,
        isStartWeekEditable: resolvedStartWeekState.isStartWeekEditable,
        isScheduleEditable: Boolean(resolvedDurationState.isDurationEditable || resolvedStartWeekState.isStartWeekEditable),
        hasDirectDurationOverride: resolvedDurationState.hasDirectDurationOverride,
        hasDerivedCustomDuration: resolvedDurationState.hasDerivedCustomDuration,
        isCustomDuration: resolvedDurationState.isCustomDuration,
        hasDirectStartWeekOverride: resolvedStartWeekState.hasDirectStartWeekOverride,
        hasDerivedCustomStartWeek: resolvedStartWeekState.hasDerivedCustomStartWeek,
        isCustomStartWeek: resolvedStartWeekState.isCustomStartWeek,
        hasDirectScheduleOverride,
        hasDerivedCustomSchedule,
        isCustomSchedule: Boolean(hasDirectScheduleOverride || hasDerivedCustomSchedule),
        detailFields: {
            Phase: phase.name,
            Status: status,
            Solution: solutionName || 'Shared onboarding plan',
            'Task type': resolvedTaskType,
            Milestone: milestone,
            Goal: goal,
            Owner: normalizedOwner,
            Priority: normalizeImpactLabel(impact),
            'Start week': safeStartWeek,
            Duration: resolvedDurationState.effectiveDuration.label,
            ...details,
            'Effort (hours)': safeEffortHours
        }
    };
}

function getNextNumber(counters) {
    const current = (counters.get('global') || 0) + 1;
    counters.set('global', current);
    return String(current);
}

function getSubtaskNumber(parentNumber, index = 0) {
    return `${parentNumber}.${index + 1}`;
}

function getCustomTaskDefaultDurationWeeks(customTask = {}) {
    const durationValue = sanitizeDurationInputValue(customTask.durationValue || DEFAULT_NEW_TASK_DURATION_VALUE);
    const durationUnit = normalizeDurationUnit(customTask.durationUnit || DEFAULT_NEW_TASK_DURATION_UNIT);
    return createDurationPresentation({
        businessHours: durationValueToBusinessHours(durationValue, durationUnit),
        preferredUnit: durationUnit
    }).durationWeeks;
}

function hasGeneratedFieldPack(solution = {}) {
    return Boolean(String(solution?.fieldPack || '').trim());
}

function getGeneratedTaskDurationHours(task = {}) {
    const explicitHours = roundDurationHours(Number(task?.durationHours));
    if (Number.isFinite(explicitHours) && explicitHours > 0) {
        return explicitHours;
    }

    const parsedHours = roundDurationHours(parseGeneratedTaskDurationToHours(task?.duration));
    return parsedHours > 0 ? parsedHours : 1;
}

function buildGeneratedTaskDescription(task = {}) {
    const subtasks = Array.isArray(task?.subtasks)
        ? task.subtasks
            .map((subtask) => String(subtask || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        : [];
    const configurableNote = String(task?.configurableNote || '').replace(/\s+/g, ' ').trim();
    const durationLabel = formatGeneratedTaskDuration(getGeneratedTaskDurationHours(task));

    return [
        subtasks.length > 0 ? subtasks.join(' ') : '',
        configurableNote ? `Note: ${configurableNote}` : '',
        `Estimated duration: ${durationLabel}.`
    ].filter(Boolean).join(' ');
}

function createEngineBackedSolution(solution = {}, connectorTasks = []) {
    if (!Array.isArray(connectorTasks) || connectorTasks.length === 0) {
        return solution;
    }

    const connectorTaskIds = new Set(connectorTasks.map((task) => task.id));
    const setupTasks = connectorTasks.map((task, index) => {
        const durationHours = getGeneratedTaskDurationHours(task);
        const generatedDependencies = (Array.isArray(task?.dependsOn) ? task.dependsOn : []).filter(Boolean);
        const localDependencies = generatedDependencies.filter((dependencyId) => connectorTaskIds.has(dependencyId));
        const inheritsDefaultDependencies = generatedDependencies.some((dependencyId) => !connectorTaskIds.has(dependencyId));
        return {
            id: task.id,
            order: index + 1,
            task: task.name,
            description: buildGeneratedTaskDescription(task),
            effort_hours: durationHours,
            duration_days: roundDurationHours(durationHours / HOURS_PER_DAY),
            owner: task.ownerRole,
            owner_role: task.ownerRole,
            required_roles: [],
            optional: false,
            depends_on: localDependencies,
            inherits_default_dependencies: inheritsDefaultDependencies
        };
    });

    return {
        ...solution,
        planner: {
            ...(solution?.planner || {}),
            setup_tasks: setupTasks
        }
    };
}

/**
 * Apply capacity-aware scaling to shared infrastructure task duration hours.
 *
 * Handles WEC-INFRA and CEF-INFRA tasks which go through addGeneratedInfrastructureRows()
 * and therefore bypass scaleTaskDurationDays(). Scaling rules:
 *
 * WEC/WEF (windows capacity, populationKind 'wec'):
 *   WEC-INFRA-01 (design topology)    — threshold 10 servers, step 10, +4h per step
 *   WEC-INFRA-02 (deploy WEC servers) — threshold 10 servers, step 10, +8h (1 day) per step
 *   WEC-INFRA-03 (Arc onboarding)     — threshold 10 servers, step 10, +8h (1 day) per step
 *
 * Syslog/CEF (firewall capacity):
 *   CEF-INFRA-01 (provision forwarders) — threshold 2 VMs, step 2, +4h per step
 *   CEF-INFRA-04 (configure rsyslog)    — threshold 2 VMs, step 2, +1h per step
 *
 * NOTE: CEF scaling is based on forwarder VM count (derived from EPS) as a proxy for
 * overall syslog source volume. A dedicated 'device_count' aggregate field on the capacity
 * snapshot would allow more precise source-device-based scaling in a future iteration.
 */
function scaleGeneratedInfraDurationHours(task = {}, capacityProfile = null) {
    const baseHours = getGeneratedTaskDurationHours(task);
    if (!capacityProfile?.hasSavedSizing || !capacityProfile?.result) {
        return baseHours;
    }

    const taskId = String(task?.id || '').trim().toUpperCase();

    // Cribl infra tasks don't scale with capacity — they're fixed-duration
    if (taskId.startsWith('CRIBL-')) {
        return baseHours;
    }

    // WEC/WEF infra tasks — scale with WEC server count
    if (capacityProfile.type === 'windows' && capacityProfile.result.populationKind === 'wec') {
        const wecServers = capacityProfile.result.servers;
        if (taskId === 'WEC-INFRA-01') {
            return baseHours + getScaledDurationStepCount(wecServers, 10, 10) * 4;
        }
        if (taskId === 'WEC-INFRA-02') {
            return baseHours + getScaledDurationStepCount(wecServers, 10, 10) * 8;
        }
        if (taskId === 'WEC-INFRA-03') {
            return baseHours + getScaledDurationStepCount(wecServers, 10, 10) * 8;
        }
    }

    // Syslog/CEF infra tasks — scale with forwarder VM count from the representative solution
    if (capacityProfile.type === 'firewall') {
        const vmCount = capacityProfile.result.vmCount;
        if (taskId === 'CEF-INFRA-01') {
            return baseHours + getScaledDurationStepCount(vmCount, 2, 2) * 4;
        }
        if (taskId === 'CEF-INFRA-04') {
            return baseHours + getScaledDurationStepCount(vmCount, 2, 2) * 1;
        }
    }

    return baseHours;
}

function addGeneratedInfrastructureRows({
    rows = [],
    counters = new Map(),
    durationOverrides = {},
    phaseStartWeek = START_WEEK_MIN,
    defaultDependencies = [],
    generatedPlan = null,
    generatedGroupSolutions = [],
    selectedSolutions = [],
    defaultSolutionGroupCollapsed = true,
    capacitySnapshot = null
} = {}) {
    const generatedTasks = Array.isArray(generatedPlan?.tasks) ? generatedPlan.tasks : [];
    const sharedInfraTasks = generatedTasks.filter((task) => task?.shared && task.phase === 1);
    const taskRowIdMap = new Map();

    if (sharedInfraTasks.length === 0) {
        return {
            endWeek: phaseStartWeek,
            terminalRowIds: [...defaultDependencies],
            taskRowIdMap,
            syntheticSolutions: []
        };
    }

    const groupSolutionByFieldPack = new Map();
    (Array.isArray(generatedGroupSolutions) ? generatedGroupSolutions : []).forEach((solution) => {
        const fieldPack = String(solution?.fieldPack || '').trim();
        if (fieldPack && !groupSolutionByFieldPack.has(fieldPack)) {
            groupSolutionByFieldPack.set(fieldPack, solution);
        }
    });

    const sharedTasksByFieldPack = sharedInfraTasks.reduce((map, task) => {
        const fieldPack = String(task?.fieldPack || 'shared').trim() || 'shared';
        const existing = map.get(fieldPack) || [];
        existing.push(task);
        map.set(fieldPack, existing);
        return map;
    }, new Map());

    sharedInfraTasks.forEach((task) => {
        taskRowIdMap.set(task.id, `task-shared-${String(task.id || '').toLowerCase()}`);
    });

    const rowById = new Map((Array.isArray(rows) ? rows : []).map((row) => [row.id, row]));
    const terminalRowIds = [];
    const syntheticSolutions = [];
    let latestEndWeek = phaseStartWeek;

    [...sharedTasksByFieldPack.keys()].forEach((fieldPack) => {
        const packTasks = sharedTasksByFieldPack.get(fieldPack) || [];
        if (packTasks.length === 0) return;

        const solution = groupSolutionByFieldPack.get(fieldPack) || null;
        const selectedSolution = findSelectedSolutionForFieldPack(fieldPack, selectedSolutions);
        const realSolution = solution || selectedSolution || null;
        const resolvedSolution = realSolution || buildSyntheticInfrastructureSolution(fieldPack);
        const groupRowId = getSolutionGroupRowId(resolvedSolution.id);
        const localRowById = new Map(rowById);
        const packRows = [];
        const packCapacityProfile = realSolution && capacitySnapshot
            ? getSolutionCapacityProfile(realSolution, capacitySnapshot)
            : null;

        packTasks.forEach((task) => {
            const rowId = taskRowIdMap.get(task.id);
            const durationHours = scaleGeneratedInfraDurationHours(task, packCapacityProfile);
            const dependencyIds = [...new Set((Array.isArray(task?.dependsOn) ? task.dependsOn : []).flatMap((dependencyId) => (
                taskRowIdMap.has(dependencyId) ? [taskRowIdMap.get(dependencyId)] : defaultDependencies
            )))];
            const taskDependencies = dependencyIds.length > 0 ? dependencyIds : [...defaultDependencies];
            const defaultStartWeek = sanitizeStartWeekInputValue(
                getDependencyEndWeek(taskDependencies, localRowById, phaseStartWeek)
            );
            const durationState = buildDurationState({
                taskId: rowId,
                defaultDurationWeeks: businessHoursToWeeks(durationHours),
                defaultDurationPreferredUnit: inferDurationUnitFromBusinessHours(durationHours),
                durationOverrides
            });
            const startWeekState = buildStartWeekState({
                taskId: rowId,
                defaultStartWeek,
                durationOverrides
            });
            const description = buildGeneratedTaskDescription(task);
            const row = createRow({
                id: rowId,
                phaseKey: 'phase1',
                number: getNextNumber(counters),
                step: task.name,
                milestone: task.name,
                goal: `Complete the shared ${String(task.fieldPack || 'connector').replace(/-/g, ' ')} prerequisites before connector onboarding begins.`,
                owner: task.ownerRole || 'Operations Team',
                resourceType: 'Microsoft & Customer',
                impact: 'Medium',
                task: description || task.name,
                description,
                startWeek: startWeekState.effectiveStartWeek,
                durationWeeks: durationState.effectiveDuration.durationWeeks,
                durationHours,
                durationState,
                startWeekState,
                dependencies: taskDependencies,
                details: {
                    Solution: resolvedSolution.name,
                    'Task type': 'Shared infrastructure',
                    'Connector type': formatFieldPackDisplayName(task.fieldPack || 'Infrastructure'),
                    Difficulty: task.configurable ? 'moderate' : 'hard',
                    'Required permissions': task.configurableNote || 'Shared platform and connector administration access.'
                },
                taskType: 'Shared infrastructure',
                solutionId: resolvedSolution.id,
                solutionName: resolvedSolution.name,
                solutionGroupId: groupRowId
            });

            packRows.push(row);
            localRowById.set(row.id, row);
        });

        const packTerminalRow = packRows[packRows.length - 1] || null;
        if (packRows.length > 0) {
            const baselineStartWeek = packRows[0].startWeek;
            const groupState = readSolutionGroupState(
                resolvedSolution.id,
                baselineStartWeek,
                resolvedSolution.name,
                defaultSolutionGroupCollapsed
            );
            const shiftWeeks = roundWeekPrecision(groupState.effectiveStartWeek - baselineStartWeek);
            const shiftedRows = applySolutionGroupShift(packRows, shiftWeeks).map((row) => ({
                ...row,
                solutionId: resolvedSolution.id,
                solutionName: resolvedSolution.name,
                solutionGroupId: groupRowId,
                goal: row.goal || `Complete the shared ${resolvedSolution.name} prerequisites before connector onboarding begins.`,
                detailFields: {
                    ...row.detailFields,
                    Solution: resolvedSolution.name,
                    'Connector type': row.detailFields?.['Connector type'] || formatFieldPackDisplayName(fieldPack)
                }
            }));
            const shiftedTerminalRow = shiftedRows.find((row) => row.id === packTerminalRow?.id) || shiftedRows[shiftedRows.length - 1] || null;
            const groupDurationWeeks = shiftedTerminalRow
                ? Math.max(MIN_TASK_DURATION_WEEKS, roundWeekPrecision(shiftedTerminalRow.endWeek - groupState.effectiveStartWeek))
                : MIN_TASK_DURATION_WEEKS;
            const solutionGroupRow = buildSolutionGroupRow({
                solution: resolvedSolution,
                phaseKey: 'phase1',
                counters,
                startWeekState: {
                    defaultStartWeek: baselineStartWeek,
                    effectiveStartWeek: groupState.effectiveStartWeek,
                    hasDirectStartWeekOverride: groupState.hasDirectStartWeekOverride,
                    hasDerivedCustomStartWeek: false,
                    isCustomStartWeek: groupState.hasDirectStartWeekOverride,
                    isStartWeekEditable: true
                },
                durationWeeks: groupDurationWeeks,
                dependencies: [...defaultDependencies],
                hasDerivedCustomSchedule: shiftedRows.some((row) => row.isCustomSchedule),
                capacityProfile: realSolution
                    ? getSolutionCapacityProfile(realSolution, capacitySnapshot || getCapacitySnapshot([realSolution]))
                    : null
            });
            solutionGroupRow.solutionGroupId = solutionGroupRow.id;
            solutionGroupRow.defaultGroupCollapsed = groupState.defaultCollapsed;
            solutionGroupRow.isGroupCollapsed = groupState.collapsed;
            solutionGroupRow._isInfrastructure = true;

            rows.push(solutionGroupRow, ...shiftedRows);
            rowById.set(solutionGroupRow.id, solutionGroupRow);
            shiftedRows.forEach((row) => rowById.set(row.id, row));
            if (!realSolution) {
                syntheticSolutions.push(resolvedSolution);
            }
            latestEndWeek = Math.max(latestEndWeek, shiftedTerminalRow?.endWeek || phaseStartWeek);
        }

        const joinRowId = taskRowIdMap.get(getPackJoinTaskId(fieldPack, generatedPlan?.summary?.criblActive));
        if (joinRowId) {
            terminalRowIds.push(joinRowId);
        }
    });

    return {
        endWeek: latestEndWeek,
        terminalRowIds: terminalRowIds.length > 0 ? [...new Set(terminalRowIds)] : [...defaultDependencies],
        taskRowIdMap,
        syntheticSolutions
    };
}

function addStandardTasks(rows, counters, durationOverrides = {}) {
    const kickoffDurationState = buildDurationState({
        taskId: 'task-stakeholder-kickoff',
        defaultDurationWeeks: 0.5,
        durationOverrides
    });
    const kickoffStartWeekState = buildStartWeekState({
        taskId: 'task-stakeholder-kickoff',
        defaultStartWeek: START_WEEK_MIN,
        durationOverrides
    });
    const kickoffRow = createRow({
        id: 'task-stakeholder-kickoff',
        phaseKey: 'setup',
        number: getNextNumber(counters, 'setup'),
        step: 'Stakeholder Kickoff',
        milestone: 'Success criteria, timeline guardrails, and stakeholders agreed.',
        goal: 'Align delivery expectations before technical work begins.',
        owner: 'SOC Lead',
        resourceType: 'Microsoft & Customer',
        impact: 'Low',
        task: 'Run the project kickoff, confirm goals, review the selected solutions, and agree weekly cadence.',
        startWeek: kickoffStartWeekState.effectiveStartWeek,
        durationWeeks: kickoffDurationState.effectiveDuration.durationWeeks,
        durationHours: 1,
        durationState: kickoffDurationState,
        startWeekState: kickoffStartWeekState,
        details: {
            'Connector type': 'Program milestone',
            Difficulty: 'easy',
            'Required permissions': 'Project sponsorship and stakeholder availability.'
        }
    });
    rows.push(kickoffRow);

    const topologyDurationState = buildDurationState({
        taskId: 'task-define-workspace-topology',
        defaultDurationWeeks: 1,
        durationOverrides
    });
    const topologyStartWeekState = buildStartWeekState({
        taskId: 'task-define-workspace-topology',
        defaultStartWeek: sanitizeStartWeekInputValue(kickoffRow.endWeek),
        durationOverrides
    });
    const topologyRow = createRow({
        id: 'task-define-workspace-topology',
        phaseKey: 'setup',
        number: getNextNumber(counters, 'setup'),
        step: 'Define Workspace Topology',
        milestone: 'Workspace strategy, region choice, and data residency plan approved.',
        goal: 'Set the landing zone for connectors, analytics, and retention.',
        owner: 'SOC Architect',
        resourceType: 'Microsoft & Customer',
        impact: 'Medium',
        task: 'Confirm workspace architecture, region placement, content scope, and the operating model for the onboarding.',
        startWeek: topologyStartWeekState.effectiveStartWeek,
        durationWeeks: topologyDurationState.effectiveDuration.durationWeeks,
        durationHours: 2,
        durationState: topologyDurationState,
        startWeekState: topologyStartWeekState,
        dependencies: [kickoffRow.id],
        details: {
            'Connector type': 'Platform foundation',
            Difficulty: 'moderate',
            'Required permissions': 'Sentinel workspace design authority and Azure subscription context.'
        }
    });
    rows.push(topologyRow);

    return {
        endWeek: topologyRow.endWeek,
        terminalRowIds: [topologyRow.id]
    };
}

function createGanttTask(
    row,
    projectStartDate,
    rows = [],
    collapsedSummaryIds = new Set(),
    collapsedSolutionGroupIds = new Set()
) {
    const start = getRowCalendarStartDateTime(row, projectStartDate);
    const end = getRowCalendarEndDateTime(row, projectStartDate);
    const safeEnd = end > start ? end : addBusinessHours(start, HOURS_PER_DAY / 2);

    const className = PHASE_BY_KEY[row.phaseKey].className;
    const normalizedStatus = normalizeStatusLabel(row.status);
    const phaseColor = PHASE_BAR_COLOR[className];
    const connectorColor = row.connectorColor || '';
    const statusColor = !row.isSolutionGroup ? (STATUS_BAR_COLOR[normalizedStatus] || null) : null;
    const baseColor = statusColor || connectorColor || phaseColor;
    const barColor = row.isSolutionGroup && connectorColor
        ? darkenHexColor(connectorColor, 0.06)
        : row.isSubtask
            ? lightenHexColor(baseColor)
            : baseColor;
    const progress = getTaskProgress(row, rows);
    const hasPartialProgress = progress > 0 && progress < 100;
    const statusVisual = row?.isSummary && progress > 0
        ? progress >= 100
            ? STATUS_BAR_VISUALS.complete
            : STATUS_BAR_VISUALS.active
        : getTaskStatusVisualStyle(row);

    return {
        id: row.id,
        name: getRowPrimaryLabel(row),
        labelText: getRowPrimaryLabel(row),
        durationLabel: row.durationLabel,
        status: normalizedStatus,
        startDateLabel: row.startDateLabel,
        dueDateLabel: row.dueDateLabel,
        start,
        end: safeEnd,
        progress,
        dependencies: row.dependencies.join(','),
        custom_class: className,
        phaseClassName: className,
        color: barColor,
        connectorColor: connectorColor || barColor,
        barOpacity: statusVisual.opacity,
        barFillOpacity: hasPartialProgress
            ? Math.min(statusVisual.fillOpacity, row.isSolutionGroup ? 0.6 : 0.52)
            : statusVisual.fillOpacity,
        barStrokeWidth: statusVisual.strokeWidth,
        barStrokeDasharray: statusVisual.strokeDasharray,
        barStrokeColor: darkenHexColor(barColor, row.isSolutionGroup ? 0.28 : 0.34),
        progressColor: darkenHexColor(barColor, row.isSolutionGroup ? 0.18 : 0.2),
        progressFillOpacity: hasPartialProgress ? 1 : 0,
        progressIsPartial: hasPartialProgress,
        isSummary: row.isSummary,
        isSolutionGroup: row.isSolutionGroup,
        isSubtask: row.isSubtask,
        isCollapsed: row.isSolutionGroup
            ? collapsedSolutionGroupIds.has(row.id)
            : collapsedSummaryIds.has(row.id),
        parentId: row.parentId || '',
        solutionGroupId: row.solutionGroupId || '',
        hasCustomSchedule: row.isCustomSchedule,
        hasDerivedCustomSchedule: row.hasDerivedCustomSchedule,
        hasCustomDuration: row.isCustomSchedule,
        hasDirectDurationOverride: row.hasDirectDurationOverride,
        hasDirectStartWeekOverride: row.hasDirectStartWeekOverride,
        hasDerivedCustomDuration: row.hasDerivedCustomSchedule
    };
}

function createSolutionPlanRows({
    solution,
    phaseKey,
    counters,
    solutionNumber = '',
    phaseStartWeek,
    defaultDependencies = [],
    durationOverrides = {},
    customTaskEntries = {},
    capacitySnapshot = null
}) {
    const orderedTasks = prependSolutionPermissionTask(
        sortByOrder(solution?.planner?.setup_tasks || []),
        solution
    );
    const ownerModel = getOwnerModel(solution);
    const category = getSolutionGroup(solution);
    const capacityProfile = getSolutionCapacityProfile(solution, capacitySnapshot || getCapacitySnapshot([solution]));
    const solutionGoal = getGoal(solution);
    const solutionMilestone = getMilestone(solution);
    const difficulty = getDifficultyLabel(solution);
    const requiredPermissions = getPermissionSummary(solution);
    const solutionImpact = getSolutionImpactLabel(solution);
    const solutionCustomTasks = sortCustomTaskEntries(customTaskEntries).filter((entry) => entry.solutionId === solution.id);
    const customTopLevelTasks = solutionCustomTasks.filter((entry) => !entry.parentRowId);
    const customSubtasksByParentId = solutionCustomTasks.reduce((map, entry) => {
        if (!entry.parentRowId) return map;
        const existing = map.get(entry.parentRowId) || [];
        existing.push(entry);
        map.set(entry.parentRowId, existing);
        return map;
    }, new Map());
    const baseSolutionNumber = String(solutionNumber || getNextNumber(counters));

    const idMap = new Map();
    const normalizedTasks = orderedTasks.map((task, index) => {
        const originalId = String(task?.id || `setup-task-${index + 1}`);
        const rowId = `task-${solution.id}-${originalId}`;
        idMap.set(originalId, rowId);

        const subtasks = sortByOrder(task?.subtasks || []).map((subtask, subIndex) => {
            const subtaskId = String(subtask?.id || `${originalId}-subtask-${subIndex + 1}`);
            const subtaskRowId = `task-${solution.id}-${originalId}-${subtaskId}`;
            idMap.set(subtaskId, subtaskRowId);
            return { ...subtask, id: subtaskId, rowId: subtaskRowId };
        });

        return {
            ...task,
            id: originalId,
            rowId,
            subtasks,
            customSubtasks: customSubtasksByParentId.get(rowId) || []
        };
    });

    const taskDurations = normalizedTasks.length > 0
        ? resolvePlannedTaskDurations(
            normalizedTasks,
            getDurationWeeks(solution),
            getTaskEffortHours,
            (task) => getTaskPlannedDurationWeeks(task, solution, capacityProfile)
        )
        : [];
    const builtRows = [];
    const rowById = new Map();
    let previousMainRowId = null;

    normalizedTasks.forEach((task, taskIndex) => {
        const taskNumber = `${baseSolutionNumber}.${taskIndex + 1}`;
        const explicitParentDependencies = getResolvedDependencies(task?.depends_on, idMap);
        const parentDependencies = explicitParentDependencies.length > 0
            ? [...new Set([
                ...(task?.inherits_default_dependencies ? defaultDependencies : []),
                ...explicitParentDependencies
            ])]
            : previousMainRowId
                ? [previousMainRowId]
                : [];
        const defaultParentStartWeek = sanitizeStartWeekInputValue(
            getDependencyEndWeek(parentDependencies, rowById, phaseStartWeek)
        );
        const defaultTaskDuration = taskDurations[taskIndex];
        const taskPreferredDurationUnit = getTaskDurationPreferredUnit(task);
        const customSubtasks = task.customSubtasks || [];

        if (task.subtasks.length > 0) {
            const subtaskDurations = resolvePlannedTaskDurations(
                task.subtasks,
                defaultTaskDuration,
                getTaskEffortHours,
                (subtask) => getTaskPlannedDurationWeeks(subtask, solution, capacityProfile)
            );
            const subRows = [];
            let previousSubtaskRowId = null;

            task.subtasks.forEach((subtask, subIndex) => {
                const explicitSubtaskDependencies = getResolvedDependencies(subtask?.depends_on, idMap);
                const subtaskDependencies = explicitSubtaskDependencies.length > 0
                    ? explicitSubtaskDependencies
                    : previousSubtaskRowId
                        ? [previousSubtaskRowId]
                        : [];
                const defaultSubtaskStartWeek = sanitizeStartWeekInputValue(
                    getDependencyEndWeek(subtaskDependencies, rowById, defaultParentStartWeek)
                );
                const subtaskDurationState = buildDurationState({
                    taskId: subtask.rowId,
                    defaultDurationWeeks: subtaskDurations[subIndex],
                    defaultDurationPreferredUnit: getTaskDurationPreferredUnit(subtask, taskPreferredDurationUnit),
                    durationOverrides
                });
                const subtaskStartWeekState = buildStartWeekState({
                    taskId: subtask.rowId,
                    defaultStartWeek: defaultSubtaskStartWeek,
                    durationOverrides
                });
                const subtaskDescription = getTaskDetailDescription(subtask, solution, [task?.description]);
                const subtaskContent = resolveSizedTaskContent(
                    subtask.task || `Subtask ${subIndex + 1}`,
                    subtaskDescription,
                    solution,
                    capacityProfile
                );

                const subRow = createRow({
                    id: subtask.rowId,
                    phaseKey,
                    number: getSubtaskNumber(taskNumber, subIndex),
                    step: subtaskContent.taskName || subtask.task || `Subtask ${subIndex + 1}`,
                    milestone: solutionMilestone,
                    goal: task.task || solutionGoal,
                    owner: resolveTaskOwner(subtask, solution, ownerModel, [task?.task, task?.description]),
                    resourceType: ownerModel.resourceType,
                    impact: solutionImpact,
                    task: subtaskContent.description || subtaskContent.taskName || `Subtask of ${task.task || solution.name}.`,
                    description: subtaskContent.description || subtaskDescription,
                    requiredRoles: getTaskRequiredRoles(subtask, getTaskRequiredRoles(task)),
                    startWeek: subtaskStartWeekState.effectiveStartWeek,
                    durationWeeks: subtaskDurationState.effectiveDuration.durationWeeks,
                    durationHours: getTaskEffortHours(subtask),
                    durationState: subtaskDurationState,
                    startWeekState: subtaskStartWeekState,
                    dependencies: subtaskDependencies,
                    details: {
                        Solution: solution.name,
                        'Task type': 'Subtask',
                        'Parent task': task.task || solution.name,
                        'Connector type': category,
                        Difficulty: difficulty,
                        'Required permissions': requiredPermissions,
                        'Effort (hours)': getTaskEffortHours(subtask),
                        Optional: subtask?.optional || task?.optional ? 'Yes' : 'No'
                    },
                    parentId: task.rowId,
                    solutionId: solution.id,
                    solutionName: solution.name,
                    capacityProfile,
                    taskType: 'Subtask'
                });

                rowById.set(subRow.id, subRow);
                subRows.push(subRow);
                previousSubtaskRowId = subRow.id;
            });

            customSubtasks.forEach((customTask, customIndex) => {
                const customDependencies = previousSubtaskRowId ? [previousSubtaskRowId] : [];
                const defaultCustomStartWeek = sanitizeStartWeekInputValue(
                    getDependencyEndWeek(customDependencies, rowById, defaultParentStartWeek)
                );
                const customDurationState = buildDurationState({
                    taskId: customTask.id,
                    defaultDurationWeeks: getCustomTaskDefaultDurationWeeks(customTask),
                    durationOverrides
                });
                const customStartWeekState = buildStartWeekState({
                    taskId: customTask.id,
                    defaultStartWeek: defaultCustomStartWeek,
                    durationOverrides
                });
                const customRow = createRow({
                    id: customTask.id,
                    phaseKey,
                    number: getSubtaskNumber(taskNumber, task.subtasks.length + customIndex),
                    status: customTask.status || 'Not Started',
                    impact: customTask.impact || 'Medium',
                    step: customTask.step || DEFAULT_NEW_TASK_NAME,
                    milestone: customTask.milestone || solutionMilestone,
                    goal: customTask.goal || task.task || solutionGoal,
                    owner: normalizeOwnerLabel(customTask.owner, { allowEmpty: true, preserveCustom: true })
                        || resolveTaskOwner(task, solution, ownerModel, [task?.task, task?.description]),
                    resourceType: customTask.resourceType || ownerModel.resourceType,
                    task: customTask.summary || DEFAULT_NEW_TASK_SUMMARY,
                    description: customTask.description || DEFAULT_NEW_TASK_DESCRIPTION,
                    startWeek: customStartWeekState.effectiveStartWeek,
                    durationWeeks: customDurationState.effectiveDuration.durationWeeks,
                    durationHours: 1,
                    durationState: customDurationState,
                    startWeekState: customStartWeekState,
                    dependencies: customDependencies,
                    details: {
                        Solution: solution.name,
                        'Task type': 'Subtask',
                        'Parent task': task.task || solution.name,
                        'Connector type': customTask.connectorType || category,
                        Difficulty: customTask.difficulty || difficulty,
                        'Required permissions': customTask.requiredPermissions || requiredPermissions,
                        Optional: customTask.optional ? 'Yes' : 'No'
                    },
                    parentId: task.rowId,
                    solutionId: solution.id,
                    solutionName: solution.name,
                    taskType: 'Subtask',
                    isUserAdded: true
                });

                rowById.set(customRow.id, customRow);
                subRows.push(customRow);
                previousSubtaskRowId = customRow.id;
            });

            const summaryStartWeek = subRows[0]?.startWeek ?? defaultParentStartWeek;
            const summaryEndWeek = subRows.reduce((maxEnd, row) => Math.max(maxEnd, row.endWeek), summaryStartWeek + defaultTaskDuration);
            const hasInheritedCustomSchedule = subRows.some((row) => row.isCustomSchedule);
            const summaryDurationState = buildDurationState({
                taskId: task.rowId,
                defaultDurationWeeks: Math.max(MIN_TASK_DURATION_WEEKS, roundWeekPrecision(summaryEndWeek - summaryStartWeek)),
                defaultDurationPreferredUnit: taskPreferredDurationUnit,
                durationOverrides,
                isDurationEditable: false,
                isCustomInherited: hasInheritedCustomSchedule
            });
            const summaryStartWeekState = buildStartWeekState({
                taskId: task.rowId,
                defaultStartWeek: summaryStartWeek,
                durationOverrides,
                isStartWeekEditable: false,
                isCustomInherited: hasInheritedCustomSchedule
            });
            const summaryDescription = getTaskDetailDescription(task, solution);
            const summaryContent = resolveSizedTaskContent(
                task.task || solution.name,
                summaryDescription,
                solution,
                capacityProfile
            );
            const summaryRow = createRow({
                id: task.rowId,
                phaseKey,
                number: taskNumber,
                step: summaryContent.taskName || task.task || solution.name,
                milestone: solutionMilestone,
                goal: solutionGoal,
                owner: resolveTaskOwner(task, solution, ownerModel),
                resourceType: ownerModel.resourceType,
                impact: solutionImpact,
                task: summaryContent.description || `${solution.name} summary row for ${task.task || 'setup work'}.`,
                description: summaryContent.description || summaryDescription,
                requiredRoles: getTaskRequiredRoles(task),
                startWeek: summaryStartWeek,
                durationWeeks: summaryDurationState.effectiveDuration.durationWeeks,
                durationHours: getTaskEffortHours(task),
                durationState: summaryDurationState,
                startWeekState: summaryStartWeekState,
                dependencies: parentDependencies,
                details: {
                    Solution: solution.name,
                    'Task type': 'Summary task',
                    'Connector type': category,
                    Difficulty: difficulty,
                    'Required permissions': requiredPermissions,
                    'Effort (hours)': getTaskEffortHours(task),
                    Optional: task?.optional ? 'Yes' : 'No'
                },
                isSummary: true,
                solutionId: solution.id,
                solutionName: solution.name,
                capacityProfile,
                taskType: 'Summary task'
            });

            rowById.set(summaryRow.id, summaryRow);
            builtRows.push(summaryRow, ...subRows);
            previousMainRowId = summaryRow.id;
            return;
        }

        const taskDurationState = buildDurationState({
            taskId: task.rowId,
            defaultDurationWeeks: defaultTaskDuration,
            defaultDurationPreferredUnit: taskPreferredDurationUnit,
            durationOverrides
        });
        const taskStartWeekState = buildStartWeekState({
            taskId: task.rowId,
            defaultStartWeek: defaultParentStartWeek,
            durationOverrides
        });
        const taskDescription = getTaskDetailDescription(task, solution);
        const taskContent = resolveSizedTaskContent(
            task.task || solution.name,
            taskDescription,
            solution,
            capacityProfile
        );
        const row = createRow({
            id: task.rowId,
            phaseKey,
            number: taskNumber,
            step: taskContent.taskName || task.task || solution.name,
            milestone: solutionMilestone,
            goal: solutionGoal,
            owner: resolveTaskOwner(task, solution, ownerModel),
            resourceType: ownerModel.resourceType,
            impact: solutionImpact,
            task: taskContent.description || taskContent.taskName || solutionGoal,
            description: taskContent.description || taskDescription,
            requiredRoles: getTaskRequiredRoles(task),
            startWeek: taskStartWeekState.effectiveStartWeek,
            durationWeeks: taskDurationState.effectiveDuration.durationWeeks,
            durationHours: getTaskEffortHours(task),
            durationState: taskDurationState,
            startWeekState: taskStartWeekState,
            dependencies: parentDependencies,
            details: {
                Solution: solution.name,
                'Task type': 'Main task',
                'Connector type': category,
                Difficulty: difficulty,
                'Required permissions': requiredPermissions,
                'Effort (hours)': getTaskEffortHours(task),
                Optional: task?.optional ? 'Yes' : 'No'
            },
            solutionId: solution.id,
            solutionName: solution.name,
            capacityProfile,
            taskType: 'Main task'
        });

        rowById.set(row.id, row);
        builtRows.push(row);
        previousMainRowId = row.id;
    });

    customTopLevelTasks.forEach((customTask) => {
        const taskNumber = getNextNumber(counters, phaseKey);
        const parentDependencies = previousMainRowId ? [previousMainRowId] : [...defaultDependencies];
        const defaultTaskStartWeek = sanitizeStartWeekInputValue(
            getDependencyEndWeek(parentDependencies, rowById, phaseStartWeek)
        );
        const customDurationState = buildDurationState({
            taskId: customTask.id,
            defaultDurationWeeks: getCustomTaskDefaultDurationWeeks(customTask),
            durationOverrides
        });
        const customStartWeekState = buildStartWeekState({
            taskId: customTask.id,
            defaultStartWeek: defaultTaskStartWeek,
            durationOverrides
        });
        const row = createRow({
            id: customTask.id,
            phaseKey,
            number: taskNumber,
            status: customTask.status || 'Not Started',
            impact: customTask.impact || 'Medium',
            step: customTask.step || DEFAULT_NEW_TASK_NAME,
            milestone: customTask.milestone || solutionMilestone,
            goal: customTask.goal || solutionGoal,
            owner: normalizeOwnerLabel(customTask.owner, { allowEmpty: true, preserveCustom: true })
                || resolveTaskOwner({}, solution, ownerModel),
            resourceType: customTask.resourceType || ownerModel.resourceType,
            task: customTask.summary || DEFAULT_NEW_TASK_SUMMARY,
            description: customTask.description || DEFAULT_NEW_TASK_DESCRIPTION,
            startWeek: customStartWeekState.effectiveStartWeek,
            durationWeeks: customDurationState.effectiveDuration.durationWeeks,
            durationHours: 1,
            durationState: customDurationState,
            startWeekState: customStartWeekState,
            dependencies: parentDependencies,
            details: {
                Solution: solution.name,
                'Task type': 'Main task',
                'Connector type': customTask.connectorType || category,
                Difficulty: customTask.difficulty || difficulty,
                'Required permissions': customTask.requiredPermissions || requiredPermissions,
                Optional: customTask.optional ? 'Yes' : 'No'
            },
            solutionId: solution.id,
            solutionName: solution.name,
            capacityProfile,
            taskType: 'Main task',
            isUserAdded: true
        });

        rowById.set(row.id, row);
        builtRows.push(row);
        previousMainRowId = row.id;
    });

    if (builtRows.length === 0) {
        const rowId = `task-${solution.id}`;
        const durationState = buildDurationState({
            taskId: rowId,
            defaultDurationWeeks: getDurationWeeks(solution),
            durationOverrides
        });
        const startWeekState = buildStartWeekState({
            taskId: rowId,
            defaultStartWeek: phaseStartWeek,
            durationOverrides
        });
        const defaultTaskDescription = getTaskDetailDescription({}, solution);
        const defaultTaskContent = resolveSizedTaskContent(
            solution.name,
            defaultTaskDescription,
            solution,
            capacityProfile
        );
        const row = createRow({
            id: rowId,
            phaseKey,
            number: `${baseSolutionNumber}.1`,
            step: defaultTaskContent.taskName || solution.name,
            milestone: solutionMilestone,
            goal: solutionGoal,
            owner: resolveTaskOwner({}, solution, ownerModel),
            resourceType: ownerModel.resourceType,
            impact: solutionImpact,
            task: defaultTaskContent.description || getTaskDescription(solution),
            description: defaultTaskContent.description || defaultTaskDescription,
            startWeek: startWeekState.effectiveStartWeek,
            durationWeeks: durationState.effectiveDuration.durationWeeks,
            durationHours: getTaskEffortHours(solution?.planner?.setup_tasks?.[0]),
            durationState,
            startWeekState,
            dependencies: [...defaultDependencies],
            details: {
                Solution: solution.name,
                'Task type': 'Main task',
                'Connector type': category,
                Difficulty: difficulty,
                'Required permissions': requiredPermissions
            },
            solutionId: solution.id,
            solutionName: solution.name,
            capacityProfile,
            taskType: 'Main task'
        });

        rowById.set(row.id, row);
        builtRows.push(row);
        previousMainRowId = row.id;
    }

    const terminalRow = previousMainRowId ? rowById.get(previousMainRowId) : null;
    return {
        rows: builtRows,
        terminalRowId: terminalRow?.id || '',
        endWeek: terminalRow?.endWeek ?? phaseStartWeek
    };
}

function applySolutionGroupShift(rows = [], shiftWeeks = 0) {
    const safeShiftWeeks = Number.isFinite(Number(shiftWeeks)) ? roundWeekPrecision(Number(shiftWeeks)) : 0;
    if (Math.abs(safeShiftWeeks) < 0.0001) return rows;

    return rows.map((row) => {
        const nextStartWeek = sanitizeStartWeekInputValue(row.startWeek + safeShiftWeeks);
        const nextEndWeek = roundWeekPrecision(nextStartWeek + row.durationWeeks);
        return {
            ...row,
            startWeek: nextStartWeek,
            endWeek: nextEndWeek,
            solutionGroupShiftWeeks: safeShiftWeeks,
            hasDerivedCustomStartWeek: true,
            hasDerivedCustomSchedule: true,
            isCustomStartWeek: true,
            isCustomSchedule: true,
            detailFields: {
                ...row.detailFields,
                'Start week': nextStartWeek
            }
        };
    });
}

function estimateSolutionPlanDuration(solution, phaseKey, phaseStartWeek, customTaskEntries = {}, capacitySnapshot = null) {
    const estimate = createSolutionPlanRows({
        solution,
        phaseKey,
        counters: new Map(),
        phaseStartWeek,
        defaultDependencies: [],
        durationOverrides: {},
        customTaskEntries,
        capacitySnapshot
    });

    return Math.max(MIN_TASK_DURATION_WEEKS, roundWeekPrecision((estimate.endWeek || phaseStartWeek) - phaseStartWeek));
}

function buildSolutionGroupRow({
    solution,
    phaseKey,
    counters,
    number = '',
    startWeekState,
    durationWeeks,
    dependencies = [],
    hasDerivedCustomSchedule = false,
    capacityProfile = null
}) {
    const ownerModel = getOwnerModel(solution);
    const category = getSolutionGroup(solution);
    const solutionGoal = getGoal(solution);
    const solutionMilestone = getMilestone(solution);
    const difficulty = getDifficultyLabel(solution);
    const requiredPermissions = getPermissionSummary(solution);
    const solutionImpact = getSolutionImpactLabel(solution);
    const rowId = getSolutionGroupRowId(solution.id);
    const durationState = buildDurationState({
        taskId: rowId,
        defaultDurationWeeks: durationWeeks,
        isDurationEditable: false,
        isCustomInherited: hasDerivedCustomSchedule
    });
    const groupDescription = getTaskDetailDescription({}, solution);
    const groupTaskContent = resolveSizedTaskContent(
        solution.name,
        groupDescription,
        solution,
        capacityProfile
    );

    return createRow({
        id: rowId,
        phaseKey,
        number: String(number || getNextNumber(counters)),
        status: 'Not Started',
        impact: solutionImpact,
        step: solution.name,
        milestone: solutionMilestone,
        goal: solutionGoal,
        owner: resolveTaskOwner({}, solution, ownerModel),
        resourceType: ownerModel.resourceType,
        task: groupTaskContent.description || getTaskDescription(solution),
        description: groupTaskContent.description || groupDescription,
        requiredRoles: [],
        startWeek: startWeekState.effectiveStartWeek,
        durationWeeks: durationState.effectiveDuration.durationWeeks,
        durationHours: getTaskEffortHours(solution?.planner?.setup_tasks?.[0]),
        durationState,
        startWeekState,
        dependencies,
        details: {
            Solution: solution.name,
            'Task type': 'Solution group',
            'Connector type': category,
            Difficulty: difficulty,
            'Required permissions': requiredPermissions
        },
        isSolutionGroup: true,
        taskType: 'Solution group',
        solutionId: solution.id,
        solutionName: solution.name,
        solutionGroupId: rowId,
        capacityProfile,
        isDurationEditable: false,
        isStartWeekEditable: true
    });
}

function applyTaskOrdersToRows(rows = [], taskOrders = {}) {
    if (!Array.isArray(rows) || rows.length <= 1) {
        return [...rows];
    }

    const rootBlocksByPhase = new Map(PHASE_SEQUENCE.map((phase) => [phase.key, []]));
    let index = 0;

    while (index < rows.length) {
        const row = rows[index];
        if (!row || row.parentId) {
            index += 1;
            continue;
        }

        if (row.isSolutionGroup) {
            const solutionRows = [row];
            index += 1;
            while (index < rows.length) {
                const candidate = rows[index];
                if (!candidate || candidate.isSolutionGroup || candidate.solutionGroupId !== row.id) {
                    break;
                }
                solutionRows.push(candidate);
                index += 1;
            }

            const taskBlocks = [];
            let childIndex = 1;
            while (childIndex < solutionRows.length) {
                const childRow = solutionRows[childIndex];
                if (!childRow || childRow.parentId) {
                    childIndex += 1;
                    continue;
                }

                const blockRows = [childRow];
                childIndex += 1;
                if (childRow.isSummary) {
                    while (childIndex < solutionRows.length && solutionRows[childIndex]?.parentId === childRow.id) {
                        blockRows.push(solutionRows[childIndex]);
                        childIndex += 1;
                    }
                }

                if (blockRows.length > 1) {
                    const [summaryRow, ...subtaskRows] = blockRows;
                    const orderedSubtaskRows = applyScopedIdOrder(
                        subtaskRows.map((subtaskRow) => ({ id: subtaskRow.id, row: subtaskRow })),
                        getSubtaskOrderScope(summaryRow.id),
                        taskOrders
                    ).map(({ row: subtaskRow }) => subtaskRow);
                    taskBlocks.push({ id: childRow.id, rows: [summaryRow, ...orderedSubtaskRows] });
                } else {
                    taskBlocks.push({ id: childRow.id, rows: blockRows });
                }
            }

            const orderedTaskBlocks = applyScopedIdOrder(taskBlocks, getSolutionTaskOrderScope(row.solutionId), taskOrders);
            rootBlocksByPhase.get(row.phaseKey)?.push({
                id: row.id,
                rows: [row, ...orderedTaskBlocks.flatMap((block) => block.rows)]
            });
            continue;
        }

        rootBlocksByPhase.get(row.phaseKey)?.push({ id: row.id, rows: [row] });
        index += 1;
    }

    const orderedRows = [];
    PHASE_SEQUENCE.forEach((phase) => {
        const phaseBlocks = rootBlocksByPhase.get(phase.key) || [];
        const orderedPhaseBlocks = applyScopedIdOrder(phaseBlocks, getPhaseRootOrderScope(phase.key), taskOrders);
        // Enforce order: infrastructure (Cribl Stream) → Cribl-dependent → others
        orderedPhaseBlocks.sort((a, b) => {
            const aPriority = a.rows[0]?._isInfrastructure ? 0 : a.rows[0]?._criblDependent ? 1 : 2;
            const bPriority = b.rows[0]?._isInfrastructure ? 0 : b.rows[0]?._criblDependent ? 1 : 2;
            return aPriority - bPriority;
        });
        orderedPhaseBlocks.forEach((block) => orderedRows.push(...block.rows));
    });

    return orderedRows;
}

function renumberOrderedRows(rows = []) {
    let rootCounter = 0;
    const numberById = new Map();
    const solutionGroupNumbers = new Map();
    const solutionGroupChildCounters = new Map();
    const parentCounters = new Map();

    return rows.map((row) => {
        let nextNumber = row.number;

        if (row.parentId) {
            const parentNumber = numberById.get(row.parentId) || row.number;
            const nextIndex = (parentCounters.get(row.parentId) || 0) + 1;
            parentCounters.set(row.parentId, nextIndex);
            nextNumber = `${parentNumber}.${nextIndex}`;
        } else if (row.solutionId && !row.isSolutionGroup) {
            const solutionGroupId = row.solutionGroupId || getSolutionGroupRowId(row.solutionId);
            const parentNumber = solutionGroupNumbers.get(solutionGroupId) || row.number;
            const nextIndex = (solutionGroupChildCounters.get(solutionGroupId) || 0) + 1;
            solutionGroupChildCounters.set(solutionGroupId, nextIndex);
            nextNumber = `${parentNumber}.${nextIndex}`;
        } else {
            rootCounter += 1;
            nextNumber = String(rootCounter);
            if (row.isSolutionGroup) {
                solutionGroupNumbers.set(row.id, nextNumber);
                solutionGroupChildCounters.set(row.id, 0);
            }
        }

        numberById.set(row.id, nextNumber);
        return { ...row, number: nextNumber };
    });
}

function createVisiblePlanData(planData, collapsedSummaryIds = new Set(), collapsedSolutionGroupIds = new Set()) {
    const rowById = new Map(planData.rows.map((row) => [row.id, row]));
    const visibleRows = planData.rows.filter((row) => {
        if (row.parentId && collapsedSummaryIds.has(row.parentId)) return false;
        if (!row.isSolutionGroup && row.solutionGroupId && collapsedSolutionGroupIds.has(row.solutionGroupId)) return false;
        return true;
    });
    const visibleRowIds = new Set(visibleRows.map((row) => row.id));

    const tasks = visibleRows.map((row) => {
        const visibleDependencies = [...new Set((row.dependencies || []).map((dependencyId) => {
            if (visibleRowIds.has(dependencyId)) return dependencyId;

            const dependencyRow = rowById.get(dependencyId);
            if (dependencyRow?.parentId
                && collapsedSummaryIds.has(dependencyRow.parentId)
                && visibleRowIds.has(dependencyRow.parentId)) {
                return dependencyRow.parentId;
            }

            if (dependencyRow?.solutionGroupId
                && collapsedSolutionGroupIds.has(dependencyRow.solutionGroupId)
                && visibleRowIds.has(dependencyRow.solutionGroupId)) {
                return dependencyRow.solutionGroupId;
            }

            return null;
        }).filter(Boolean))];

        return createGanttTask(
            { ...row, dependencies: visibleDependencies },
            planData.projectStartDate,
            planData.rows,
            collapsedSummaryIds,
            collapsedSolutionGroupIds
        );
    });

    const milestones = (planData.milestones || [])
        .map((milestone) => {
            let anchorTaskId = milestone.anchorTaskId;
            if (visibleRowIds.has(anchorTaskId)) {
                return milestone;
            }

            const anchorRow = rowById.get(anchorTaskId);
            if (
                anchorRow?.parentId
                && collapsedSummaryIds.has(anchorRow.parentId)
                && visibleRowIds.has(anchorRow.parentId)
            ) {
                anchorTaskId = anchorRow.parentId;
            } else if (
                anchorRow?.solutionGroupId
                && collapsedSolutionGroupIds.has(anchorRow.solutionGroupId)
                && visibleRowIds.has(anchorRow.solutionGroupId)
            ) {
                anchorTaskId = anchorRow.solutionGroupId;
            }

            return visibleRowIds.has(anchorTaskId)
                ? { ...milestone, anchorTaskId }
                : null;
        })
        .filter(Boolean);

    return { rows: visibleRows, tasks, milestones };
}

function pickMilestoneAnchor(rows = [], predicate = () => true, { preferLatest = true } = {}) {
    const matchingRows = (Array.isArray(rows) ? rows : []).filter((row) => row && predicate(row));
    if (matchingRows.length === 0) {
        return null;
    }

    return [...matchingRows].sort((left, right) => {
        const endDelta = (left.endWeek || 0) - (right.endWeek || 0);
        if (endDelta !== 0) {
            return preferLatest ? endDelta : -endDelta;
        }
        return String(left.number || '').localeCompare(String(right.number || ''));
    })[matchingRows.length - 1];
}

function buildPlanMilestones(rows = [], projectStartDate) {
    const taskRows = (Array.isArray(rows) ? rows : []).filter((row) => row && !row.isSolutionGroup);
    const connectorRows = taskRows.filter((row) => row.solutionId);
    const analyticsPattern = /(analytic|analytics|rule|rules|workbook|content)/i;
    const connectorEnablePattern = /(enable|ingest|validate|data collection|connector)/i;

    const workspaceAnchor = pickMilestoneAnchor(taskRows, (row) => row.phaseKey === 'setup');
    const firstIngestAnchor = pickMilestoneAnchor(
        connectorRows,
        (row) => connectorEnablePattern.test(`${row.step || ''} ${row.description || ''} ${row.task || ''}`),
        { preferLatest: false }
    ) || pickMilestoneAnchor(connectorRows, () => true, { preferLatest: false });
    const coverageAnchor = pickMilestoneAnchor(connectorRows, () => true) || workspaceAnchor;
    const analyticsAnchor = pickMilestoneAnchor(
        connectorRows,
        (row) => analyticsPattern.test(`${row.step || ''} ${row.description || ''} ${row.task || ''}`)
    ) || coverageAnchor;
    const handoffAnchor = pickMilestoneAnchor(taskRows, () => true) || workspaceAnchor;

    return [
        { id: 'milestone-workspace-connected', name: 'Workspace Connected', anchorTaskId: workspaceAnchor?.id || '', date: workspaceAnchor ? getRowCalendarEndDateTime(workspaceAnchor, projectStartDate) : null },
        { id: 'milestone-first-data-ingested', name: 'First Data Ingested', anchorTaskId: firstIngestAnchor?.id || '', date: firstIngestAnchor ? getRowCalendarEndDateTime(firstIngestAnchor, projectStartDate) : null },
        { id: 'milestone-core-coverage', name: 'Core Coverage Achieved', anchorTaskId: coverageAnchor?.id || '', date: coverageAnchor ? getRowCalendarEndDateTime(coverageAnchor, projectStartDate) : null },
        { id: 'milestone-analytics-rules', name: 'Analytics Rules Enabled', anchorTaskId: analyticsAnchor?.id || '', date: analyticsAnchor ? getRowCalendarEndDateTime(analyticsAnchor, projectStartDate) : null },
        { id: 'milestone-handoff', name: 'Handoff to SOC', anchorTaskId: handoffAnchor?.id || '', date: handoffAnchor ? getRowCalendarEndDateTime(handoffAnchor, projectStartDate) : null }
    ].filter((milestone) => milestone.anchorTaskId && milestone.date instanceof Date && !Number.isNaN(milestone.date.getTime()));
}

export function buildGanttPlanData(selectedSolutions = [], options = {}) {
    const solutions = [...selectedSolutions];
    const defaultSolutionGroupCollapsed = solutions.length > 2;
    const durationOverrides = options?.durationOverrides || getDurationOverrideEntries();
    const customTaskEntries = options?.customTaskEntries || getCustomTaskEntries();
    const capacitySnapshot = options?.capacitySnapshot || getCapacitySnapshot(solutions);
    const rows = [];
    const counters = new Map();
    const generatedFieldPackSolutions = solutions.filter((solution) => hasGeneratedFieldPack(solution));
    const generatedPlan = generatedFieldPackSolutions.length > 0
        ? buildGeneratedGanttPlan(generatedFieldPackSolutions)
        : null;
    const generatedConnectorTasksBySolutionId = (generatedPlan?.tasks || []).reduce((map, task) => {
        if (task?.shared || task?.phase !== 2 || !task?.connectorId) {
            return map;
        }
        const existing = map.get(task.connectorId) || [];
        existing.push(task);
        map.set(task.connectorId, existing);
        return map;
    }, new Map());
    const generatedInfraOnlySolutionIds = new Set(generatedFieldPackSolutions
        .filter((solution) => hasGeneratedFieldPack(solution) && !(generatedConnectorTasksBySolutionId.get(solution.id)?.length))
        .map((solution) => solution.id));

    const standardPlan = addStandardTasks(rows, counters, durationOverrides);
    const generatedInfraPlan = addGeneratedInfrastructureRows({
        rows,
        counters,
        durationOverrides,
        phaseStartWeek: standardPlan.endWeek,
        defaultDependencies: [...standardPlan.terminalRowIds],
        generatedPlan,
        generatedGroupSolutions: generatedFieldPackSolutions.filter((solution) => generatedInfraOnlySolutionIds.has(solution.id)),
        selectedSolutions: solutions,
        defaultSolutionGroupCollapsed,
        capacitySnapshot
    });
    const displaySolutions = [...solutions, ...(generatedInfraPlan.syntheticSolutions || [])];

    let previousPhaseBaselineEnd = generatedInfraPlan.taskRowIdMap.size > 0 ? generatedInfraPlan.endWeek : standardPlan.endWeek;
    let previousPhaseTerminalIds = [...standardPlan.terminalRowIds];
    const allSolutionTerminalIds = [];
    let latestSolutionEndWeek = Math.max(standardPlan.endWeek, generatedInfraPlan.endWeek || standardPlan.endWeek);

    [1, 2, 3].forEach((bucket) => {
        const phaseKey = SOLUTION_PHASE_KEY[bucket];
        const phaseSolutions = solutions
            .filter((solution) => getSolutionPhaseBucket(solution) === bucket && !generatedInfraOnlySolutionIds.has(solution.id))
            .sort((left, right) => {
                // Cribl-dependent solutions sort first (immediately below Cribl Stream infra)
                const criblActive = generatedPlan?.summary?.criblActive || false;
                const leftJoin = hasGeneratedFieldPack(left) ? getPackJoinTaskId(left.fieldPack, criblActive) : null;
                const rightJoin = hasGeneratedFieldPack(right) ? getPackJoinTaskId(right.fieldPack, criblActive) : null;
                const CRIBL_JOIN = 'CRIBL-INFRA-02';
                const leftCribl = leftJoin === CRIBL_JOIN ? 1 : 0;
                const rightCribl = rightJoin === CRIBL_JOIN ? 1 : 0;
                if (leftCribl !== rightCribl) return rightCribl - leftCribl;
                const scoreDelta = calculatePriorityScore(right) - calculatePriorityScore(left);
                return scoreDelta !== 0 ? scoreDelta : left.name.localeCompare(right.name);
            });

        if (phaseSolutions.length === 0) {
            return;
        }

        const placements = [];
        const parallelStartWeek = sanitizeStartWeekInputValue(previousPhaseBaselineEnd);
        let latestPhaseEndWeek = parallelStartWeek;
        phaseSolutions.forEach((solution) => {
            const generatedConnectorTasks = generatedConnectorTasksBySolutionId.get(solution.id) || [];
            const usesGeneratedTasks = hasGeneratedFieldPack(solution) && generatedConnectorTasks.length > 0;
            const plannedSolution = usesGeneratedTasks
                ? createEngineBackedSolution(solution, generatedConnectorTasks)
                : solution;
            const joinTaskId = usesGeneratedTasks
                ? getPackJoinTaskId(solution.fieldPack, generatedPlan?.summary?.criblActive)
                : '';
            const joinRowId = joinTaskId ? generatedInfraPlan.taskRowIdMap.get(joinTaskId) : '';
            const defaultDependencies = usesGeneratedTasks && joinRowId
                ? [...new Set([...previousPhaseTerminalIds, joinRowId])]
                : [...previousPhaseTerminalIds];
            // Group-level visible dependencies: only show arrows for infrastructure
            // dependencies (e.g. Cribl Stream). Standard-phase arrows are noise since
            // sequencing is already communicated by start-week positioning.
            const groupVisibleDependencies = joinRowId ? [joinRowId] : [];
            const estimatedDurationWeeks = estimateSolutionPlanDuration(plannedSolution, phaseKey, parallelStartWeek, customTaskEntries, capacitySnapshot);
            placements.push({
                solution,
                plannedSolution,
                defaultDependencies,
                groupVisibleDependencies,
                baselineStartWeek: parallelStartWeek,
                baselineDurationWeeks: estimatedDurationWeeks
            });
            latestPhaseEndWeek = Math.max(latestPhaseEndWeek, sanitizeStartWeekInputValue(parallelStartWeek + estimatedDurationWeeks));
        });

        previousPhaseBaselineEnd = latestPhaseEndWeek;

        const phaseTerminalIds = [];
        placements.forEach(({ solution, plannedSolution, defaultDependencies, groupVisibleDependencies, baselineStartWeek }) => {
            const groupRowId = getSolutionGroupRowId(solution.id);
            const existingGroupRowIndex = rows.findIndex((row) => row.id === groupRowId);
            const existingGroupRow = existingGroupRowIndex >= 0 ? rows[existingGroupRowIndex] : null;
            const groupState = readSolutionGroupState(solution.id, baselineStartWeek, solution.name, defaultSolutionGroupCollapsed);
            const solutionNumber = existingGroupRow?.number || getNextNumber(counters);
            const solutionPlan = createSolutionPlanRows({
                solution: plannedSolution,
                phaseKey,
                counters,
                solutionNumber,
                phaseStartWeek: baselineStartWeek,
                defaultDependencies,
                durationOverrides,
                customTaskEntries,
                capacitySnapshot
            });
            const shiftWeeks = existingGroupRow
                ? roundWeekPrecision(existingGroupRow.startWeek - existingGroupRow.defaultStartWeek)
                : roundWeekPrecision(groupState.effectiveStartWeek - baselineStartWeek);
            const shiftedRows = applySolutionGroupShift(solutionPlan.rows, shiftWeeks).map((row) => ({
                ...row,
                solutionGroupId: groupRowId
            }));
            const terminalRow = shiftedRows.find((row) => row.id === solutionPlan.terminalRowId) || shiftedRows[shiftedRows.length - 1];
            const groupDurationWeeks = terminalRow
                ? Math.max(MIN_TASK_DURATION_WEEKS, roundWeekPrecision(terminalRow.endWeek - groupState.effectiveStartWeek))
                : Math.max(MIN_TASK_DURATION_WEEKS, estimateSolutionPlanDuration(plannedSolution, phaseKey, groupState.effectiveStartWeek, customTaskEntries, capacitySnapshot));

            if (existingGroupRow) {
                const existingGroupRows = [];
                let insertIndex = existingGroupRowIndex + 1;
                while (insertIndex < rows.length) {
                    const candidate = rows[insertIndex];
                    if (!candidate || candidate.isSolutionGroup || candidate.solutionGroupId !== groupRowId) {
                        break;
                    }
                    existingGroupRows.push(candidate);
                    insertIndex += 1;
                }

                const groupEndWeek = [...existingGroupRows, ...shiftedRows].reduce(
                    (maxEndWeek, row) => Math.max(maxEndWeek, row?.endWeek || existingGroupRow.endWeek),
                    existingGroupRow.endWeek
                );
                const mergedGroupRow = buildSolutionGroupRow({
                    solution: plannedSolution,
                    phaseKey: existingGroupRow.phaseKey || phaseKey,
                    counters,
                    number: solutionNumber,
                    startWeekState: {
                        defaultStartWeek: existingGroupRow.defaultStartWeek,
                        effectiveStartWeek: existingGroupRow.startWeek,
                        hasDirectStartWeekOverride: existingGroupRow.hasDirectStartWeekOverride,
                        hasDerivedCustomStartWeek: false,
                        isCustomStartWeek: existingGroupRow.isCustomStartWeek,
                        isStartWeekEditable: true
                    },
                    durationWeeks: Math.max(MIN_TASK_DURATION_WEEKS, roundWeekPrecision(groupEndWeek - existingGroupRow.startWeek)),
                    dependencies: [...existingGroupRow.dependencies],
                    hasDerivedCustomSchedule: Boolean(existingGroupRow.hasDerivedCustomSchedule || shiftedRows.some((row) => row.isCustomSchedule)),
                    capacityProfile: getSolutionCapacityProfile(plannedSolution, capacitySnapshot)
                });
                mergedGroupRow.solutionGroupId = mergedGroupRow.id;
                mergedGroupRow.defaultGroupCollapsed = existingGroupRow.defaultGroupCollapsed;
                mergedGroupRow.isGroupCollapsed = existingGroupRow.isGroupCollapsed;
                mergedGroupRow._criblDependent = Boolean(groupVisibleDependencies.length > 0);

                // Remove old group + children from their original position, then append
                // in sorted order so Cribl-dependent solutions stay below Cribl Stream.
                const removeCount = 1 + existingGroupRows.length;
                rows.splice(existingGroupRowIndex, removeCount);
                rows.push(mergedGroupRow, ...shiftedRows);
            } else {
                const solutionGroupRow = buildSolutionGroupRow({
                    solution: plannedSolution,
                    phaseKey,
                    counters,
                    number: solutionNumber,
                    startWeekState: {
                        defaultStartWeek: baselineStartWeek,
                        effectiveStartWeek: groupState.effectiveStartWeek,
                        hasDirectStartWeekOverride: groupState.hasDirectStartWeekOverride,
                        hasDerivedCustomStartWeek: false,
                        isCustomStartWeek: groupState.hasDirectStartWeekOverride,
                        isStartWeekEditable: true
                    },
                    durationWeeks: groupDurationWeeks,
                    dependencies: [...defaultDependencies],
                    hasDerivedCustomSchedule: shiftedRows.some((row) => row.isCustomSchedule),
                    capacityProfile: getSolutionCapacityProfile(plannedSolution, capacitySnapshot)
                });
                solutionGroupRow.solutionGroupId = solutionGroupRow.id;
                solutionGroupRow.defaultGroupCollapsed = groupState.defaultCollapsed;
                solutionGroupRow.isGroupCollapsed = groupState.collapsed;
                solutionGroupRow._criblDependent = Boolean(groupVisibleDependencies.length > 0);

                rows.push(solutionGroupRow, ...shiftedRows);
            }

            if (terminalRow?.id) {
                phaseTerminalIds.push(terminalRow.id);
                allSolutionTerminalIds.push(terminalRow.id);
                latestSolutionEndWeek = Math.max(latestSolutionEndWeek, terminalRow.endWeek);
            }
        });

        previousPhaseTerminalIds = phaseTerminalIds.length > 0 ? [...phaseTerminalIds] : previousPhaseTerminalIds;
    });

    const trainingDurationState = buildDurationState({
        taskId: 'task-training-handover',
        defaultDurationWeeks: 2,
        durationOverrides
    });
    const trainingStartWeekState = buildStartWeekState({
        taskId: 'task-training-handover',
        defaultStartWeek: sanitizeStartWeekInputValue(latestSolutionEndWeek),
        durationOverrides
    });
    const trainingRow = createRow({
        id: 'task-training-handover',
        phaseKey: 'closeout',
        number: getNextNumber(counters, 'closeout'),
        step: 'Training & Handover',
        milestone: 'SOC users trained, admin runbook reviewed, and ownership transferred.',
        goal: 'Prepare the customer team to operate the new onboarding outcomes independently.',
        owner: 'SOC Lead',
        resourceType: 'Microsoft & Customer',
        impact: 'Medium',
        task: 'Deliver enablement sessions, hand over the runbook, and confirm support pathways for the onboarded solutions.',
        startWeek: trainingStartWeekState.effectiveStartWeek,
        durationWeeks: trainingDurationState.effectiveDuration.durationWeeks,
        durationHours: 2,
        durationState: trainingDurationState,
        startWeekState: trainingStartWeekState,
        dependencies: allSolutionTerminalIds.length > 0 ? [...allSolutionTerminalIds] : [...previousPhaseTerminalIds],
        details: {
            'Connector type': 'Enablement',
            Difficulty: 'moderate',
            'Required permissions': 'Customer operators available for walkthroughs and validation signoff.'
        },
        taskType: 'Program milestone'
    });
    rows.push(trainingRow);

    const goLiveDurationState = buildDurationState({
        taskId: 'task-go-live-monitoring',
        defaultDurationWeeks: 1,
        durationOverrides
    });
    const goLiveStartWeekState = buildStartWeekState({
        taskId: 'task-go-live-monitoring',
        defaultStartWeek: sanitizeStartWeekInputValue(trainingRow.endWeek),
        durationOverrides
    });
    const goLiveRow = createRow({
        id: 'task-go-live-monitoring',
        phaseKey: 'closeout',
        number: getNextNumber(counters, 'closeout'),
        step: 'Go-Live & Monitoring',
        milestone: 'Operational dashboards, monitoring checks, and escalation paths confirmed.',
        goal: 'Stabilize the onboarding and confirm post-deployment visibility.',
        owner: 'SOC Engineers',
        resourceType: 'Microsoft & Customer',
        impact: 'Medium',
        task: 'Run go-live validation, review monitoring dashboards, and agree the first improvement backlog after onboarding.',
        startWeek: goLiveStartWeekState.effectiveStartWeek,
        durationWeeks: goLiveDurationState.effectiveDuration.durationWeeks,
        durationHours: 1,
        durationState: goLiveDurationState,
        startWeekState: goLiveStartWeekState,
        dependencies: [trainingRow.id],
        details: {
            'Connector type': 'Operations',
            Difficulty: 'easy',
            'Required permissions': 'Workspace access for dashboards, incidents, and monitoring queries.'
        },
        taskType: 'Program milestone'
    });
    rows.push(goLiveRow);

    const projectStartDate = getProjectStartDate();
    const taskOrders = getTaskOrderEntries();
    const orderedRows = renumberOrderedRows(applyTaskOrdersToRows(
        enrichRowsForDisplay(applyRowDisplayOverrides(rows, durationOverrides), projectStartDate),
        taskOrders
    ));
    const solutionPresentationMap = buildSolutionPresentationMap(displaySolutions);
    const usedSolutionIds = new Set();
    const decoratedRows = orderedRows.map((row) => {
        const presentation = row.solutionId ? solutionPresentationMap.get(row.solutionId) : null;
        if (!presentation) return row;
        usedSolutionIds.add(row.solutionId);
        return {
            ...row,
            connectorColor: presentation.color,
            connectorDisplayNumber: presentation.displayNumber,
            solutionDisplayLabel: row.isSolutionGroup ? presentation.label : row.solutionDisplayLabel || ''
        };
    });
    const connectorLegend = displaySolutions
        .map((solution) => {
            const presentation = solutionPresentationMap.get(solution.id);
            if (!presentation || !usedSolutionIds.has(solution.id)) return null;
            return {
                solutionId: solution.id,
                label: presentation.label,
                color: presentation.color
            };
        })
        .filter(Boolean);
    const solutionDocUrlMap = new Map(displaySolutions.map((solution) => [
        solution.id,
        solution?.docUrl || solution?.planner?.docUrl || GENERAL_SENTINEL_DOC_URL
    ]));
    const documentedRows = decoratedRows.map((row) => ({
        ...row,
        docUrl: row.docUrl || solutionDocUrlMap.get(row.solutionId) || GENERAL_SENTINEL_DOC_URL
    }));
    const milestones = buildPlanMilestones(documentedRows, projectStartDate);
    const tasks = documentedRows.map((row) => createGanttTask(row, projectStartDate, documentedRows));
    const latestEndWeek = documentedRows.reduce((maxEnd, row) => Math.max(maxEnd, row.endWeek), START_WEEK_MIN);
    const totalDurationWeeks = Math.max(0, roundWeekPrecision(latestEndWeek - START_WEEK_MIN));
    const phaseBreakdown = PHASE_SEQUENCE.map((phase) => {
        const phaseRows = documentedRows.filter((row) => row.phaseKey === phase.key && !row.isSolutionGroup);
        const phaseEnd = phaseRows.reduce((maxEnd, row) => Math.max(maxEnd, row.endWeek), START_WEEK_MIN);
        const phaseStart = phaseRows.length > 0
            ? phaseRows.reduce((minStart, row) => Math.min(minStart, row.startWeek), phaseRows[0].startWeek)
            : START_WEEK_MIN;

        return {
            key: phase.key,
            name: phase.name,
            count: phaseRows.length,
            durationWeeks: phaseRows.length > 0 ? roundWeekPrecision(phaseEnd - phaseStart) : 0
        };
    }).filter((phase) => phase.count > 0);

    const exportRows = documentedRows.map((row) => ({
        '#': row.number,
        Phase: row.phase,
        Status: row.status,
        Step: formatExportStepLabel(row),
        Milestone: row.milestone,
        Goal: row.goal,
        Owner: row.owner,
        Priority: row.impact,
        Task: row.task,
        'Start week': formatWeekOffset(row.startWeek),
        'Default start week': formatWeekOffset(row.defaultStartWeek),
        'Start date': row.startDateLabel,
        'Due date': row.dueDateLabel,
        Duration: row.durationLabel,
        'Default duration': row.defaultDurationLabel,
        'Custom schedule': row.hasDirectScheduleOverride ? 'Yes' : row.hasDerivedCustomSchedule ? 'Derived' : 'No'
    }));

    const customScheduleCount = documentedRows.filter((row) => row.hasDirectScheduleOverride).length;

    return {
        projectStartDate,
        tasks,
        rows: documentedRows,
        milestones,
        exportRows,
        connectorLegend,
        totalDurationWeeks,
        totalTasks: rows.filter((row) => !row.isSolutionGroup).length,
        phaseBreakdown,
        selectedSolutionCount: solutions.length,
        customScheduleCount,
        customDurationCount: customScheduleCount,
        persistsScheduleOverrides: durationOverridesPersistToStorage,
        persistsDurationOverrides: durationOverridesPersistToStorage
    };
}

function createSummaryHeader(planData) {
    const header = createElement('section', 'gantt-summary-header');
    const statRow = createElement('div', 'gantt-summary-stats');

    [
        { value: formatWeeks(planData.totalDurationWeeks), label: 'Total duration' },
        { value: planData.totalTasks, label: 'Total tasks' },
        { value: planData.selectedSolutionCount, label: 'Selected solutions' }
    ].forEach((stat) => {
        const card = createElement('div', 'gantt-summary-stat');
        card.append(
            createText('span', stat.value, 'gantt-summary-stat-value'),
            createText('span', stat.label, 'gantt-summary-stat-label')
        );
        statRow.appendChild(card);
    });

    const breakdown = createElement('div', 'gantt-phase-breakdown');
    planData.phaseBreakdown.forEach((phase) => {
        const chip = createElement('div', `gantt-phase-chip ${PHASE_BY_KEY[phase.key].className}`);
        chip.append(
            createText('strong', phase.name),
            createText('span', `${phase.count} task${phase.count === 1 ? '' : 's'} · ${formatWeeks(phase.durationWeeks)}`)
        );
        breakdown.appendChild(chip);
    });

    header.append(statRow, breakdown);
    return header;
}

function createConnectorColorLegend(connectorLegend = []) {
    if (!Array.isArray(connectorLegend) || connectorLegend.length === 0) {
        return null;
    }

    const legend = createElement('section', 'gantt-connector-legend');
    legend.setAttribute('aria-label', 'Connector color legend');
    legend.style.display = 'flex';
    legend.style.flexDirection = 'column';
    legend.style.gap = '10px';
    legend.style.margin = '0 0 16px';
    legend.style.padding = '12px 14px';
    legend.style.border = '1px solid var(--border-color)';
    legend.style.borderRadius = '12px';
    legend.style.background = 'var(--bg-secondary)';
    legend.style.boxShadow = 'var(--shadow)';

    const title = createText('strong', 'Connector colours & milestones', 'gantt-connector-legend-title');
    title.style.color = 'var(--text-primary)';
    title.style.fontSize = '0.9rem';

    const items = createElement('div', 'gantt-connector-legend-items');
    items.style.display = 'flex';
    items.style.flexWrap = 'wrap';
    items.style.gap = '8px 10px';

    const appendLegendItem = ({ labelText, color, isMilestone = false }) => {
        const item = createElement('div', 'gantt-connector-legend-item');
        item.style.display = 'inline-flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.padding = '6px 10px';
        item.style.border = `1px solid ${hexToRgba(color, 0.28)}`;
        item.style.borderRadius = '999px';
        item.style.background = `linear-gradient(90deg, ${hexToRgba(color, 0.14)}, ${hexToRgba(color, 0.04)} 72%)`;
        item.style.color = 'var(--text-secondary)';

        const swatch = createElement('span', 'gantt-connector-legend-swatch');
        swatch.setAttribute('aria-hidden', 'true');
        swatch.style.width = '12px';
        swatch.style.height = '12px';
        swatch.style.borderRadius = isMilestone ? '2px' : '999px';
        swatch.style.flex = '0 0 auto';
        swatch.style.background = color;
        swatch.style.boxShadow = `0 0 0 1px ${hexToRgba(darkenHexColor(color, 0.34), 0.66)} inset`;
        if (isMilestone) {
            swatch.style.transform = 'rotate(45deg)';
        }

        const label = createText('span', labelText, 'gantt-connector-legend-label');
        label.style.whiteSpace = 'nowrap';

        item.append(swatch, label);
        items.appendChild(item);
    };

    connectorLegend.forEach((entry) => appendLegendItem({
        labelText: entry.label,
        color: entry.color
    }));
    appendLegendItem({
        labelText: 'Milestone marker',
        color: '#f59e0b',
        isMilestone: true
    });

    legend.append(title, items);
    return legend;
}

function createViewModeToggles(ganttInstanceRef) {
    const field = createElement('label', 'gantt-view-mode-field');
    const label = createText('span', 'Timeline zoom', 'gantt-view-mode-label');
    const select = createElement('select', 'gantt-view-mode-select');
    select.setAttribute('aria-label', 'Timeline zoom');

    GANTT_VIEW_MODES.forEach((viewMode) => {
        const option = document.createElement('option');
        option.value = viewMode.name;
        option.textContent = viewMode.name;
        select.appendChild(option);
    });

    const controls = {
        field,
        select,
        setValue(nextValue) {
            if (!nextValue) return;
            select.value = nextValue;
            ganttInstanceRef.viewMode = nextValue;
            ganttInstanceRef.current?.change_view_mode(nextValue);
        }
    };

    select.value = ganttInstanceRef.viewMode || GANTT_VIEW_MODES[0].name;
    select.addEventListener('change', () => {
        controls.setValue(select.value);
    });

    field.append(label, select);
    return controls;
}

function truncateText(value, limit = GANTT_TABLE_DESCRIPTION_LIMIT) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '—';
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function getTaskTableDescription(row = {}) {
    const source = row.description || (row.isSummary
        ? row.goal || row.task || row.milestone
        : row.task || row.goal || row.milestone);
    return truncateText(source);
}

function getTaskTableMeta(row = {}) {
    const capacitySummary = row.isSolutionGroup && row.capacityProfile?.hasSavedSizing
        ? row.capacityProfile.summary
        : '';
    return [row.phase, row.isSolutionGroup ? 'Connector group' : '', capacitySummary].filter(Boolean).join(' • ');
}

function getRowCapacityBadgeLabel(row = {}) {
    if (!row?.isSolutionGroup || !row?.capacityProfile?.hasSavedSizing) {
        return '';
    }
    // Cribl-routed connectors don't use VMs — show Cribl badge instead
    if (row.capacityProfile.criblIngestion) {
        return 'Cribl Stream';
    }
    return row.capacityProfile.result?.badge || '';
}

function getRowCapacityBadgeClassName(row = {}) {
    const classNames = ['gantt-table-badge', 'gantt-table-badge--sizing'];
    if (row?.capacityProfile?.isDefault) {
        classNames.push('is-estimate');
    }
    return classNames.join(' ');
}

function createStatusIndicator(status = 'Not Started') {
    const { label, colorClassName } = getStatusIndicatorDisplay(status);
    const indicator = createElement('span', 'gantt-status-indicator');
    if (colorClassName) {
        indicator.classList.add(colorClassName);
    }
    indicator.append(
        createElement('span', 'gantt-status-indicator__swatch'),
        createText('span', label, 'gantt-status-indicator__label')
    );
    return indicator;
}

function createImpactIndicator(impact = 'Low') {
    const normalizedImpact = normalizeImpactLabel(impact);
    const indicator = createElement('span', 'gantt-impact-indicator');
    indicator.classList.add(IMPACT_COLOR_CLASS_MAP[normalizedImpact] || IMPACT_COLOR_CLASS_MAP.Low);
    indicator.append(
        createElement('span', 'gantt-impact-indicator__dot'),
        createText('span', normalizedImpact, 'gantt-impact-indicator__label')
    );
    return indicator;
}

function createOwnerIndicator(owner = '') {
    const normalizedOwner = normalizeOwnerLabel(owner, { preserveCustom: true });
    const indicator = createElement('span', 'gantt-owner-indicator');
    indicator.classList.add(
        OWNER_COLOR_CLASS_MAP[normalizedOwner]
            || (normalizedOwner === '—' ? 'is-unassigned' : 'is-custom')
    );
    indicator.appendChild(createText('span', normalizedOwner, 'gantt-owner-indicator__label'));
    return indicator;
}

function createTaskTable(
    rows,
    onSelect,
    {
        collapsedSummaryIds = new Set(),
        collapsedSolutionGroupIds = new Set(),
        onToggleSummary,
        onToggleSolutionGroup,
        onHoverTask,
        onInlineScheduleSave,
        onInlineSolutionGroupStartSave,
        onInlineFieldSave,
        onAddTopLevelTask,
        onAddSubtask,
        onDeleteTask,
        onMoveTask,
        projectStartDate
    } = {}
) {
    const panel = createElement('section', 'gantt-table-panel planner-table-panel');
    const header = createElement('div', 'gantt-table-header');
    const scroll = createElement('div', 'gantt-table-scroll');
    const surface = createElement('div', 'gantt-table-surface');
    let columnWidths = getGanttTableColumnWidths();

    const applyColumnLayout = () => {
        const template = getGanttTableColumnTemplate(columnWidths);
        const totalWidth = getGanttTableColumnPixelWidth(columnWidths);
        panel.style.setProperty('--gantt-table-columns', template);
        panel.style.setProperty('--gantt-table-width', `${totalWidth}px`);
    };

    const syncHeaderScroll = () => {
        header.style.transform = `translateX(${-scroll.scrollLeft}px)`;
    };

    const startColumnResize = (event, column) => {
        if (!column || window.matchMedia('(max-width: 1024px)').matches) return;
        if (!event.isPrimary || event.button !== 0) return;

        const resizeHandle = event.currentTarget instanceof Element ? event.currentTarget : null;
        if (!resizeHandle) return;

        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startWidth = Math.max(column.minWidth, Number(columnWidths?.[column.key]) || column.width);

        startPointerDragSession(event, resizeHandle, {
            onMove(pointerEvent) {
                const delta = pointerEvent.clientX - startX;
                const nextWidth = Math.max(column.minWidth, Math.round(startWidth + delta));
                if (nextWidth === (Number(columnWidths?.[column.key]) || column.width)) {
                    return;
                }
                columnWidths = {
                    ...columnWidths,
                    [column.key]: nextWidth
                };
                applyColumnLayout();
                syncHeaderScroll();
            },
            onEnd() {
                persistGanttTableColumnWidths(columnWidths);
            }
        });
    };

    GANTT_TABLE_COLUMNS.forEach((column) => {
        const headerCell = createText('div', column.label, column.headerClassName);
        headerCell.dataset.columnKey = column.key;
        headerCell.setAttribute('role', 'columnheader');

        const resizeHandle = createElement('button', 'gantt-table-column-resize-handle');
        resizeHandle.type = 'button';
        resizeHandle.tabIndex = -1;
        resizeHandle.title = `Resize ${column.label} column`;
        resizeHandle.setAttribute('aria-hidden', 'true');
        resizeHandle.addEventListener('pointerdown', (resizeEvent) => startColumnResize(resizeEvent, column));
        headerCell.appendChild(resizeHandle);
        header.appendChild(headerCell);
    });

    applyColumnLayout();
    scroll.addEventListener('scroll', syncHeaderScroll, { passive: true });
    scroll.appendChild(surface);
    panel.append(header, scroll);

    const rowElements = new Map();
    const allRowsById = new Map(rows.map((row) => [row.id, row]));
    const inlineCellOpeners = new WeakMap();
    const inlineFieldOpeners = new Map();
    const orderScopeRows = new Map();
    const orderScopeIndexByRowId = new Map();
    rows.forEach((row) => {
        const scopeKey = getTaskOrderScopeKeyForRow(row);
        if (!scopeKey) return;
        const existing = orderScopeRows.get(scopeKey) || [];
        existing.push(row.id);
        orderScopeRows.set(scopeKey, existing);
        orderScopeIndexByRowId.set(row.id, {
            scopeKey,
            index: existing.length - 1,
            count: existing.length
        });
    });
    orderScopeRows.forEach((ids, scopeKey) => {
        ids.forEach((rowId, index) => {
            orderScopeIndexByRowId.set(rowId, {
                scopeKey,
                index,
                count: ids.length
            });
        });
    });
    let activeInlineEditor = null;
    let pendingLayoutUpdate = null;

    const stopRowActivation = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const getEventElementTarget = (event) => {
        if (event?.target instanceof Element) {
            return event.target;
        }
        return event?.target?.parentElement || null;
    };

    const flushPendingLayoutUpdate = () => {
        if (activeInlineEditor || !pendingLayoutUpdate) {
            return;
        }

        pendingLayoutUpdate = null;
        updateLayout();
    };

    const closeInlineEditor = ({ restoreDisplay = true, flushPendingLayout = true } = {}) => {
        activeInlineEditor?.close?.({ restoreDisplay, flushPendingLayout });
        activeInlineEditor = null;

        if (!flushPendingLayout) {
            return;
        }

        flushPendingLayoutUpdate();
    };

    const bindEditorSurface = (nodes = []) => {
        nodes.filter(Boolean).forEach((node) => {
            node.addEventListener('click', (event) => event.stopPropagation());
            node.addEventListener('keydown', (event) => event.stopPropagation());
        });
    };

    const handleInlineCellActivation = (event) => {
        const targetElement = getEventElementTarget(event);
        if (!targetElement) return;

        // If click is on or inside a trigger button, let the button handle it
        if (targetElement.closest('.gantt-table-inline-trigger')) return;

        const interactiveCell = targetElement.closest('.gantt-table-cell--inline-editable');
        if (!interactiveCell || !surface.contains(interactiveCell) || interactiveCell.classList.contains('is-editing')) {
            return;
        }

        if (targetElement.closest('input, select, option')) return;

        const onOpen = inlineCellOpeners.get(interactiveCell);
        if (typeof onOpen !== 'function') return;

        stopRowActivation(event);
        onOpen();
    };

    surface.addEventListener('click', handleInlineCellActivation, true);
    surface.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        handleInlineCellActivation(event);
    }, true);

    const createInlineTrigger = ({ className, title, ariaLabel, onOpen, content }) => {
        const trigger = createElement('button', className);
        trigger.type = 'button';
        trigger.title = title;
        trigger.setAttribute('aria-label', ariaLabel || title);
        if (Array.isArray(content)) {
            trigger.append(...content);
        } else if (content) {
            trigger.appendChild(content);
        }
        bindPrimaryActivation(trigger, () => onOpen());
        return trigger;
    };

    const attachInlineCellLauncher = (cell, { onOpen, title, isEnabled = true } = {}) => {
        cell.classList.toggle('gantt-table-cell--inline-editable', Boolean(isEnabled));
        inlineCellOpeners.delete(cell);

        if (!isEnabled || typeof onOpen !== 'function') {
            cell.removeAttribute('title');
            return;
        }

        if (title) {
            cell.title = title;
        }

        inlineCellOpeners.set(cell, onOpen);
    };

    const renderReadonlyCellValue = (cell, text, className, title) => {
        cell.replaceChildren();
        cell.classList.remove('is-editing');
        const value = createText('span', text, className);
        if (title) value.title = title;
        cell.appendChild(value);
    };

    const setInlineEditingState = (cell, isEditing) => {
        const rowElement = cell?.closest('.gantt-table-row');
        if (rowElement) {
            rowElement.classList.toggle('has-inline-editor-open', Boolean(isEditing));
        }
        if (cell) {
            cell.classList.toggle('is-editing', Boolean(isEditing));
        }
        return rowElement;
    };

    const setInlineFieldValidity = (field, isValid, message = 'Invalid value') => {
        if (!field) return;
        field.classList.toggle('is-invalid', !isValid);
        field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
        if (isValid) {
            field.removeAttribute('title');
            return;
        }
        field.title = message;
    };

    const createOutsidePointerHandler = (editorRoot, onOutside) => {
        const handlePointerDown = (event) => {
            const target = getEventElementTarget(event);
            if (target && editorRoot.contains(target)) {
                return;
            }
            onOutside?.();
        };

        document.addEventListener('pointerdown', handlePointerDown, true);
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);
    };

    const positionInlinePopup = (cell, popup) => {
        if (!cell || !popup) return;

        const alignPopup = () => {
            const cellRect = cell.getBoundingClientRect();
            const popupRect = popup.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const openAbove = cellRect.bottom + popupRect.height + 16 > viewportHeight
                && cellRect.top - popupRect.height - 16 > 0;
            const alignRight = cellRect.left + popupRect.width > viewportWidth - 16
                && cellRect.right - popupRect.width > 16;

            popup.classList.toggle('is-open-above', openAbove);
            popup.classList.toggle('is-align-right', alignRight);
        };

        window.requestAnimationFrame(() => {
            alignPopup();
            window.requestAnimationFrame(alignPopup);
        });
    };

    const openInlineDurationEditor = (row, cell) => {
        if (!row.isDurationEditable || !cell) return;
        if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) return;
        closeInlineEditor({ flushPendingLayout: false });

        setInlineEditingState(cell, true);
        cell.replaceChildren();

        const editorShell = createElement('div', 'gantt-inline-editor-shell');
        const anchor = createElement('button', 'gantt-table-inline-trigger gantt-table-inline-trigger--duration is-open');
        anchor.type = 'button';
        anchor.setAttribute('aria-label', `Duration picker for ${row.step}`);
        anchor.appendChild(createText('span', row.durationLabel, 'gantt-table-inline-value gantt-table-inline-value--duration'));
        anchor.addEventListener('click', stopRowActivation);
        editorShell.appendChild(anchor);

        const popup = createElement('div', 'gantt-inline-popup gantt-duration-picker');
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', `Duration picker for ${row.step}`);

        const customTitle = createText('div', 'Custom duration', 'gantt-inline-popup__section-title');
        const customControls = createElement('div', 'gantt-duration-picker__custom');
        const numberInput = createElement('input', 'gantt-duration-picker__number gantt-inline-field');
        numberInput.type = 'number';
        numberInput.min = '0.5';
        numberInput.step = '0.5';
        numberInput.inputMode = 'decimal';
        numberInput.value = formatCompactNumber(row.durationValue);
        numberInput.setAttribute('aria-label', `Duration value for ${row.step}`);

        const unitSelect = createElement('select', 'gantt-duration-picker__unit');
        unitSelect.setAttribute('aria-label', `Duration unit for ${row.step}`);
        DURATION_PICKER_UNITS.forEach((unit) => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);
            option.selected = unit === normalizeDurationUnit(row.durationUnit);
            unitSelect.appendChild(option);
        });

        const applyButton = createElement('button', 'gantt-duration-picker__apply');
        applyButton.type = 'button';
        applyButton.textContent = 'Apply';

        customControls.append(numberInput, unitSelect, applyButton);

        const quickTitle = createText('div', 'Quick picks', 'gantt-inline-popup__section-title');
        const quickGrid = createElement('div', 'gantt-duration-picker__quick-grid');
        INLINE_DURATION_QUICK_PICKS.forEach((preset) => {
            const chip = createElement('button', 'gantt-duration-picker__chip');
            chip.type = 'button';
            chip.textContent = preset.label;
            chip.addEventListener('click', (event) => {
                stopRowActivation(event);
                applyDurationValue(preset.value, preset.unit);
            });
            quickGrid.appendChild(chip);
        });

        popup.append(customTitle, customControls, quickTitle, quickGrid);
        editorShell.append(anchor, popup);
        bindEditorSurface([cell, editorShell, anchor, popup, numberInput, unitSelect, applyButton, quickGrid]);
        cell.appendChild(editorShell);

        let isClosed = false;
        let cleanupOutside = () => {};

        const closeEditor = ({ restoreDisplay = true, flushPendingLayout = true } = {}) => {
            if (isClosed) return;
            isClosed = true;
            cleanupOutside();
            setInlineEditingState(cell, false);
            if (restoreDisplay && cell.isConnected) {
                renderInlineDurationDisplay(row, cell);
            }
            if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) {
                activeInlineEditor = null;
            }
            if (flushPendingLayout) {
                flushPendingLayoutUpdate();
            }
        };

        const applyDurationValue = (nextValue, nextUnit) => {
            if (isClosed) return false;
            const nextDuration = createDurationPresentation({
                businessHours: durationValueToBusinessHours(nextValue, nextUnit),
                preferredUnit: nextUnit
            });
            const durationChanged = Math.abs(nextDuration.businessHours - row.durationBusinessHours) >= 0.001;
            closeEditor({ restoreDisplay: !durationChanged });
            if (durationChanged) {
                onInlineScheduleSave?.(row.id, {
                    value: nextDuration.value,
                    unit: nextDuration.unit
                });
            }
            return true;
        };

        const applyCustomDuration = () => {
            const nextValue = Number.parseFloat(numberInput.value);
            if (!Number.isFinite(nextValue) || nextValue <= 0) {
                setInlineFieldValidity(numberInput, false, 'Enter a duration');
                numberInput.focus();
                numberInput.select();
                return false;
            }

            const sanitizedValue = sanitizeDurationInputValue(nextValue);
            numberInput.value = formatCompactNumber(sanitizedValue);
            setInlineFieldValidity(numberInput, true);
            return applyDurationValue(sanitizedValue, unitSelect.value);
        };

        cleanupOutside = createOutsidePointerHandler(editorShell, () => {
            const hasTypedValue = String(numberInput.value || '').trim().length > 0;
            if (!hasTypedValue) {
                closeEditor();
                return;
            }
            applyCustomDuration();
        });

        numberInput.addEventListener('input', () => setInlineFieldValidity(numberInput, true));
        numberInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyCustomDuration();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeEditor();
            }
        });
        unitSelect.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyCustomDuration();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeEditor();
            }
        });
        applyButton.addEventListener('click', applyCustomDuration);

        activeInlineEditor = {
            taskId: row.id,
            cell,
            close: closeEditor
        };

        window.requestAnimationFrame(() => {
            positionInlinePopup(cell, popup);
            numberInput.focus();
            numberInput.select();
        });
    };

    const openInlineSelectEditor = (row, cell, { currentValue, options, renderDisplay, onSave, ariaLabel }) => {
        if (!cell) return;
        if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) return;
        closeInlineEditor({ flushPendingLayout: false });

        cell.classList.add('is-editing');
        cell.replaceChildren();

        const select = createElement('select', 'gantt-table-inline-select');
        select.setAttribute('aria-label', ariaLabel);
        options.forEach((optionLabel) => {
            const option = document.createElement('option');
            option.value = optionLabel;
            option.textContent = optionLabel;
            option.selected = optionLabel === currentValue;
            select.appendChild(option);
        });
        bindEditorSurface([cell, select]);
        cell.appendChild(select);

        let isClosed = false;
        const closeEditor = ({ restoreDisplay = true, flushPendingLayout = true } = {}) => {
            if (isClosed) return;
            isClosed = true;
            if (restoreDisplay && cell.isConnected) {
                renderDisplay(row, cell);
            }
            if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) {
                activeInlineEditor = null;
            }
            if (flushPendingLayout) {
                flushPendingLayoutUpdate();
            }
        };

        const saveEditor = () => {
            if (isClosed) return;
            const nextValue = select.value;
            const valueChanged = nextValue !== currentValue;
            closeEditor({ restoreDisplay: !valueChanged });
            if (valueChanged) {
                onSave?.(nextValue);
            }
        };

        let hasCommitted = false;
        select.addEventListener('change', () => {
            hasCommitted = true;
            saveEditor();
        });
        select.addEventListener('blur', () => {
            window.setTimeout(() => {
                if (isClosed || hasCommitted) return;
                if (document.activeElement === select) return;
                closeEditor();
            }, 0);
        });
        select.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveEditor();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeEditor();
            }
        });

        activeInlineEditor = {
            taskId: row.id,
            cell,
            close: closeEditor
        };

        window.requestAnimationFrame(() => select.focus());
    };

    const openInlineNameEditor = (row, cell, labelHost, renderDisplay) => {
        if (!cell || !labelHost) return;
        if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell && activeInlineEditor?.field === 'name') return;
        closeInlineEditor({ flushPendingLayout: false });

        setInlineEditingState(cell, true);
        labelHost.replaceChildren();

        const input = createElement('input', 'gantt-table-inline-name-input gantt-inline-field');
        input.type = 'text';
        input.maxLength = '120';
        input.value = row.step;
        input.setAttribute('aria-label', `Task name for ${row.step}`);
        bindEditorSurface([cell, labelHost, input]);
        labelHost.appendChild(input);

        let isClosed = false;
        const closeEditor = ({ restoreDisplay = true, flushPendingLayout = true } = {}) => {
            if (isClosed) return;
            isClosed = true;
            setInlineEditingState(cell, false);
            if (restoreDisplay && labelHost.isConnected) {
                renderDisplay(row, cell, labelHost);
            }
            if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) {
                activeInlineEditor = null;
            }
            if (flushPendingLayout) {
                flushPendingLayoutUpdate();
            }
        };

        const saveEditor = () => {
            if (isClosed) return false;
            const nextValue = String(input.value || '').replace(/\s+/g, ' ').trim();
            if (!nextValue) {
                setInlineFieldValidity(input, false, 'Enter a task name');
                input.focus();
                input.select();
                return false;
            }
            setInlineFieldValidity(input, true);
            const valueChanged = nextValue !== row.step;
            closeEditor({ restoreDisplay: !valueChanged });
            if (valueChanged) {
                onInlineFieldSave?.(row.id, { step: nextValue });
            }
            return true;
        };

        input.addEventListener('input', () => setInlineFieldValidity(input, true));
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveEditor();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeEditor();
            }
        });
        input.addEventListener('blur', () => {
            window.setTimeout(() => {
                if (labelHost.contains(document.activeElement)) return;
                const hasTypedValue = String(input.value || '').trim().length > 0;
                if (!hasTypedValue) {
                    closeEditor();
                    return;
                }
                saveEditor();
            }, 0);
        });

        activeInlineEditor = {
            taskId: row.id,
            cell,
            field: 'name',
            close: closeEditor
        };

        window.requestAnimationFrame(() => {
            input.focus();
            input.select();
        });
    };

    const openInlineOwnerEditor = (row, cell) => {
        if (!cell) return;
        if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) return;
        closeInlineEditor({ flushPendingLayout: false });

        setInlineEditingState(cell, true);
        cell.replaceChildren();

        const currentValue = row.owner === '—' ? '' : row.owner;
        const editorShell = createElement('div', 'gantt-inline-editor-shell');
        const anchor = createElement('button', 'gantt-table-inline-trigger gantt-table-inline-trigger--owner is-open');
        anchor.type = 'button';
        anchor.setAttribute('aria-label', `Owner picker for ${row.step}`);
        anchor.appendChild(createOwnerIndicator(row.owner));
        anchor.addEventListener('click', stopRowActivation);
        editorShell.appendChild(anchor);

        const popup = createElement('div', 'gantt-inline-popup gantt-owner-picker');
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', `Owner picker for ${row.step}`);

        const title = createText('div', 'Owner', 'gantt-inline-popup__section-title');
        const input = createElement('input', 'gantt-table-inline-owner-input gantt-inline-field');
        input.type = 'text';
        input.setAttribute('aria-label', `Owner for ${row.step}`);
        input.placeholder = 'Owner';
        input.value = currentValue;

        const optionList = createElement('div', 'gantt-owner-picker__options');
        const ownerChoices = [
            ...OWNER_OPTIONS.map((label) => ({ value: label, label })),
            { value: '', label: 'Unassigned' }
        ];

        popup.append(title, input, optionList);
        editorShell.append(anchor, popup);
        bindEditorSurface([cell, editorShell, anchor, popup, input, optionList]);
        cell.appendChild(editorShell);

        let isClosed = false;
        let cleanupOutside = () => {};

        const closeEditor = ({ restoreDisplay = true, flushPendingLayout = true } = {}) => {
            if (isClosed) return;
            isClosed = true;
            cleanupOutside();
            setInlineEditingState(cell, false);
            if (restoreDisplay && cell.isConnected) {
                renderInlineOwnerDisplay(row, cell);
            }
            if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) {
                activeInlineEditor = null;
            }
            if (flushPendingLayout) {
                flushPendingLayoutUpdate();
            }
        };

        const saveEditor = (rawValue = input.value) => {
            if (isClosed) return false;
            const nextValue = normalizeOwnerLabel(rawValue, { allowEmpty: true, preserveCustom: true });
            const valueChanged = nextValue !== currentValue;
            closeEditor({ restoreDisplay: !valueChanged });
            if (valueChanged) {
                onInlineFieldSave?.(row.id, { owner: nextValue });
            }
            return true;
        };

        ownerChoices.forEach(({ value, label }) => {
            const optionButton = createElement('button', 'gantt-owner-picker__option');
            optionButton.type = 'button';
            optionButton.textContent = label;
            optionButton.classList.toggle('is-selected', value === currentValue);
            optionButton.addEventListener('click', (event) => {
                stopRowActivation(event);
                saveEditor(value);
            });
            optionList.appendChild(optionButton);
        });

        cleanupOutside = createOutsidePointerHandler(editorShell, () => saveEditor());

        input.addEventListener('input', () => setInlineFieldValidity(input, true));
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveEditor();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeEditor();
            }
        });
        input.addEventListener('blur', () => {
            window.setTimeout(() => {
                if (editorShell.contains(document.activeElement)) return;
                saveEditor();
            }, 0);
        });

        activeInlineEditor = {
            taskId: row.id,
            cell,
            close: closeEditor
        };

        window.requestAnimationFrame(() => {
            positionInlinePopup(cell, popup);
            input.focus();
            input.select();
        });
    };

    const openInlineDateEditor = (row, cell, { fieldKey, currentDate, renderDisplay, onSave }) => {
        if (!row.isScheduleEditable || !cell) return;
        if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) return;
        closeInlineEditor({ flushPendingLayout: false });

        setInlineEditingState(cell, true);
        cell.replaceChildren();

        const editorShell = createElement('div', 'gantt-inline-editor-shell');
        const input = createElement('input', 'gantt-table-inline-date-input gantt-inline-field');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.placeholder = TABLE_DATE_FORMAT;
        input.value = formatDateForTable(currentDate);
        input.setAttribute('aria-label', `${fieldKey === 'start' ? 'Start' : 'Due'} date for ${row.step}`);

        const popup = createElement('div', 'gantt-inline-popup gantt-date-picker');
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-label', `${fieldKey === 'start' ? 'Start' : 'Due'} date picker for ${row.step}`);

        const nav = createElement('div', 'gantt-date-picker__nav');
        const prevButton = createElement('button', 'gantt-date-picker__nav-button');
        prevButton.type = 'button';
        prevButton.setAttribute('aria-label', 'Previous month');
        prevButton.textContent = '‹';
        const monthLabel = createText('div', '', 'gantt-date-picker__month-label');
        const nextButton = createElement('button', 'gantt-date-picker__nav-button');
        nextButton.type = 'button';
        nextButton.setAttribute('aria-label', 'Next month');
        nextButton.textContent = '›';
        nav.append(prevButton, monthLabel, nextButton);

        const weekdayRow = createElement('div', 'gantt-date-picker__weekdays');
        DATE_PICKER_WEEKDAY_LABELS.forEach((label) => {
            weekdayRow.appendChild(createText('span', label, 'gantt-date-picker__weekday'));
        });

        const daysGrid = createElement('div', 'gantt-date-picker__days');
        popup.append(nav, weekdayRow, daysGrid);
        editorShell.append(input, popup);
        bindEditorSurface([cell, editorShell, input, popup, prevButton, nextButton, daysGrid]);
        cell.appendChild(editorShell);

        let isClosed = false;
        let cleanupOutside = () => {};
        const currentValue = formatDateForInput(currentDate);
        let selectedDate = startOfDay(currentDate);
        let visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const todayKey = formatDateForInput(new Date());

        const closeEditor = ({ restoreDisplay = true, flushPendingLayout = true } = {}) => {
            if (isClosed) return;
            isClosed = true;
            cleanupOutside();
            setInlineEditingState(cell, false);
            if (restoreDisplay && cell.isConnected) {
                renderDisplay(row, cell, fieldKey);
            }
            if (activeInlineEditor?.taskId === row.id && activeInlineEditor?.cell === cell) {
                activeInlineEditor = null;
            }
            if (flushPendingLayout) {
                flushPendingLayoutUpdate();
            }
        };

        const commitManualDate = () => {
            if (isClosed) return false;
            const parsedDate = parseDateInputValue(input.value);
            if (!parsedDate) {
                setInlineFieldValidity(input, false, 'Invalid date');
                return false;
            }

            setInlineFieldValidity(input, true);
            const nextBusinessDate = coerceToBusinessDay(parsedDate);
            if (!nextBusinessDate) {
                setInlineFieldValidity(input, false, 'Invalid date');
                return false;
            }

            const nextValue = formatDateForInput(nextBusinessDate);
            const valueChanged = nextValue !== currentValue;
            closeEditor({ restoreDisplay: !valueChanged });
            if (valueChanged) {
                onSave?.(nextValue);
            }
            return true;
        };

        const renderCalendar = () => {
            monthLabel.textContent = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            daysGrid.replaceChildren();

            const firstVisibleDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1 - visibleMonth.getDay());
            for (let index = 0; index < 42; index += 1) {
                const dayDate = new Date(firstVisibleDay.getFullYear(), firstVisibleDay.getMonth(), firstVisibleDay.getDate() + index);
                const button = createElement('button', 'gantt-date-picker__day');
                const dayKey = formatDateForInput(dayDate);
                button.type = 'button';
                button.textContent = String(dayDate.getDate());
                button.setAttribute('aria-label', formatDateForTable(dayDate));
                button.classList.toggle('is-outside-month', dayDate.getMonth() !== visibleMonth.getMonth());
                button.classList.toggle('is-selected', dayKey === formatDateForInput(selectedDate));
                button.classList.toggle('is-today', dayKey === todayKey);
                button.addEventListener('click', (event) => {
                    stopRowActivation(event);
                    selectedDate = startOfDay(dayDate);
                    input.value = formatDateForTable(dayDate);
                    setInlineFieldValidity(input, true);
                    const nextBusinessDate = coerceToBusinessDay(dayDate);
                    const nextValue = formatDateForInput(nextBusinessDate);
                    const valueChanged = nextValue !== currentValue;
                    closeEditor({ restoreDisplay: !valueChanged });
                    if (valueChanged) {
                        onSave?.(nextValue);
                    }
                });
                daysGrid.appendChild(button);
            }

            positionInlinePopup(cell, popup);
        };

        prevButton.addEventListener('click', (event) => {
            stopRowActivation(event);
            visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
            renderCalendar();
        });
        nextButton.addEventListener('click', (event) => {
            stopRowActivation(event);
            visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
            renderCalendar();
        });

        input.addEventListener('input', () => {
            setInlineFieldValidity(input, true);
            const parsedDate = parseDateInputValue(input.value);
            if (!parsedDate) return;
            selectedDate = startOfDay(parsedDate);
            visibleMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            renderCalendar();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commitManualDate();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeEditor();
            }
        });
        input.addEventListener('blur', () => {
            window.setTimeout(() => {
                if (editorShell.contains(document.activeElement)) return;
                const hasTypedValue = String(input.value || '').trim().length > 0;
                if (!hasTypedValue) {
                    closeEditor();
                    return;
                }
                commitManualDate();
            }, 0);
        });

        cleanupOutside = createOutsidePointerHandler(editorShell, () => {
            const hasTypedValue = String(input.value || '').trim().length > 0;
            if (!hasTypedValue) {
                closeEditor();
                return;
            }
            commitManualDate();
        });

        activeInlineEditor = {
            taskId: row.id,
            cell,
            close: closeEditor
        };

        renderCalendar();
        window.requestAnimationFrame(() => {
            positionInlinePopup(cell, popup);
            input.focus();
            input.select();
        });
    };

    const renderInlineDurationDisplay = (row, cell) => {
        cell.replaceChildren();
        cell.classList.remove('is-editing');
        if (!row.isDurationEditable) {
            renderReadonlyCellValue(
                cell,
                row.durationLabel,
                'gantt-table-duration-readonly',
                row.isSummary
                    ? 'Summary duration is calculated from child tasks.'
                    : `Duration: ${row.durationLabel}`
            );
            return;
        }

        const trigger = createInlineTrigger({
            className: 'gantt-table-inline-trigger gantt-table-inline-trigger--duration',
            title: `Edit duration for ${row.step}`,
            ariaLabel: `Edit duration for ${row.step}`,
            onOpen: () => openInlineDurationEditor(row, cell),
            content: createText('span', row.durationLabel, 'gantt-table-inline-value gantt-table-inline-value--duration')
        });
        cell.appendChild(trigger);
    };

    const renderTaskNameDisplay = (row, cell, labelHost) => {
        if (!labelHost) return;
        labelHost.replaceChildren();

        if (row.isSolutionGroup) {
            const groupLabel = getRowPrimaryLabel(row);
            const solutionGroupLabel = createElement('span', 'gantt-solution-group-title-inline');
            const label = createText('span', groupLabel, 'gantt-table-task-label');
            applyConnectorAccentLabel(label, row.connectorColor);
            solutionGroupLabel.appendChild(label);

            const actionButton = createElement('button', 'gantt-solution-group-action-button');
            actionButton.type = 'button';
            actionButton.textContent = getSolutionGroupActionLabel(collapsedSolutionGroupIds.has(row.id));
            actionButton.title = `${collapsedSolutionGroupIds.has(row.id) ? 'Expand' : 'Collapse'} ${groupLabel}`;
            actionButton.setAttribute('aria-label', `${collapsedSolutionGroupIds.has(row.id) ? 'Expand' : 'Collapse'} ${groupLabel}`);
            actionButton.setAttribute('aria-expanded', collapsedSolutionGroupIds.has(row.id) ? 'false' : 'true');
            if (row.connectorColor) {
                actionButton.style.color = getConnectorTextAccentColor(row.connectorColor);
            }
            bindPrimaryActivation(actionButton, () => onToggleSolutionGroup?.(row.id));
            solutionGroupLabel.appendChild(actionButton);

            labelHost.appendChild(solutionGroupLabel);
            inlineFieldOpeners.delete(`${row.id}:name`);
            return;
        }

        const nameTrigger = createElement('button', 'gantt-table-task-name-trigger');
        nameTrigger.type = 'button';
        nameTrigger.title = `Open details for ${row.step}`;
        nameTrigger.setAttribute('aria-label', `Open details for ${row.step}`);
        nameTrigger.appendChild(createText('span', row.step, 'gantt-table-task-label'));
        nameTrigger.addEventListener('click', (event) => {
            stopRowActivation(event);
            onSelect?.(row.id);
        });
        labelHost.appendChild(nameTrigger);
        inlineFieldOpeners.set(`${row.id}:name`, () => openInlineNameEditor(row, cell, labelHost, renderTaskNameDisplay));
    };

    const renderInlineOwnerDisplay = (row, cell) => {
        cell.replaceChildren();
        cell.classList.remove('is-editing');
        const currentValue = normalizeOwnerLabel(row.owner, { preserveCustom: true });
        if (row.isSolutionGroup) {
            cell.appendChild(createOwnerIndicator(currentValue));
            return;
        }
        const trigger = createInlineTrigger({
            className: 'gantt-table-inline-trigger gantt-table-inline-trigger--owner',
            title: `Edit owner for ${row.step}`,
            ariaLabel: `Edit owner for ${row.step}`,
            onOpen: () => openInlineOwnerEditor(row, cell),
            content: createOwnerIndicator(currentValue)
        });
        cell.appendChild(trigger);
    };

    const renderInlineStatusDisplay = (row, cell) => {
        cell.replaceChildren();
        cell.classList.remove('is-editing');
        const currentValue = normalizeStatusLabel(row.status);
        if (row.isSolutionGroup) {
            cell.appendChild(createStatusIndicator(currentValue));
            return;
        }
        const trigger = createInlineTrigger({
            className: 'gantt-table-inline-trigger gantt-table-inline-trigger--select',
            title: `Edit status for ${row.step}`,
            ariaLabel: `Edit status for ${row.step}`,
            onOpen: () => openInlineSelectEditor(row, cell, {
                currentValue,
                options: STATUS_OPTIONS,
                renderDisplay: renderInlineStatusDisplay,
                onSave: (nextValue) => onInlineFieldSave?.(row.id, { status: nextValue }),
                ariaLabel: `Status for ${row.step}`
            }),
            content: createStatusIndicator(currentValue)
        });
        cell.appendChild(trigger);
    };

    const renderInlineImpactDisplay = (row, cell) => {
        cell.replaceChildren();
        cell.classList.remove('is-editing');
        const currentValue = normalizeImpactLabel(row.impact);
        if (row.isSolutionGroup) {
            cell.appendChild(createImpactIndicator(currentValue));
            return;
        }
        const trigger = createInlineTrigger({
            className: 'gantt-table-inline-trigger gantt-table-inline-trigger--select',
            title: `Edit priority for ${row.step}`,
            ariaLabel: `Edit priority for ${row.step}`,
            onOpen: () => openInlineSelectEditor(row, cell, {
                currentValue,
                options: IMPACT_OPTIONS,
                renderDisplay: renderInlineImpactDisplay,
                onSave: (nextValue) => onInlineFieldSave?.(row.id, { impact: nextValue }),
                ariaLabel: `Priority for ${row.step}`
            }),
            content: createImpactIndicator(currentValue)
        });
        cell.appendChild(trigger);
    };

    const renderInlineDateDisplay = (row, cell, fieldKey) => {
        cell.replaceChildren();
        cell.classList.remove('is-editing');

        const currentDate = fieldKey === 'start'
            ? row.startDate || getRowCalendarStartDate(row, projectStartDate)
            : row.dueDate || getRowCalendarDueDate(row, projectStartDate);
        const displayLabel = fieldKey === 'start'
            ? row.startDateLabel || formatDateForTable(currentDate)
            : row.dueDateLabel || formatDateForTable(currentDate);

        const isDateEditable = fieldKey === 'start' ? row.isStartWeekEditable : row.isDurationEditable;
        if (!isDateEditable) {
            renderReadonlyCellValue(
                cell,
                displayLabel,
                'gantt-table-inline-value gantt-table-inline-value--readonly',
                `${fieldKey === 'start' ? 'Start' : 'Due'} date: ${displayLabel}`
            );
            return;
        }

        const trigger = createInlineTrigger({
            className: 'gantt-table-inline-trigger gantt-table-inline-trigger--date',
            title: `Edit ${fieldKey === 'start' ? 'start' : 'due'} date for ${row.step}`,
            ariaLabel: `Edit ${fieldKey === 'start' ? 'start' : 'due'} date for ${row.step}`,
            onOpen: () => openInlineDateEditor(row, cell, {
                fieldKey,
                currentDate,
                renderDisplay: renderInlineDateDisplay,
                onSave: (nextValue) => {
                    const nextBusinessDate = coerceToBusinessDay(nextValue);
                    if (!nextBusinessDate) return;

                    if (fieldKey === 'start') {
                        onInlineScheduleSave?.(row.id, {
                            startWeek: getStartWeekFromDate(nextBusinessDate, projectStartDate)
                        });
                        return;
                    }

                    const currentStartDate = row.startDate || getRowCalendarStartDate(row, projectStartDate);
                    const safeDueDate = nextBusinessDate < currentStartDate ? currentStartDate : nextBusinessDate;
                    const sameDayAsStart = formatDateForInput(safeDueDate) === formatDateForInput(currentStartDate);
                    const nextBusinessHours = sameDayAsStart
                        ? Math.min(Math.max(Number(row.durationBusinessHours) || HOURS_PER_DAY, MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK), HOURS_PER_DAY)
                        : getInclusiveBusinessDaySpan(currentStartDate, safeDueDate) * HOURS_PER_DAY;
                    const nextDuration = createDurationPresentation({
                        businessHours: nextBusinessHours,
                        preferredUnit: row.durationUnit
                    });
                    onInlineScheduleSave?.(row.id, {
                        value: nextDuration.value,
                        unit: nextDuration.unit
                    });
                }
            }),
            content: createText('span', displayLabel, 'gantt-table-inline-value gantt-table-inline-value--date')
        });
        cell.appendChild(trigger);
    };

    const updateLayout = () => {
        if (activeInlineEditor) {
            pendingLayoutUpdate = true;
            return;
        }

        pendingLayoutUpdate = null;
        surface.style.height = 'auto';
        surface.replaceChildren();
        rowElements.clear();
        inlineFieldOpeners.clear();

        rows.forEach((row, index) => {
            const previousRow = rows[index - 1];
            const nextRow = rows[index + 1];
            const isFirstSubtask = Boolean(row.parentId && previousRow?.parentId !== row.parentId);
            const isLastSubtask = Boolean(row.parentId && nextRow?.parentId !== row.parentId);
            const rowElement = createElement('div', 'gantt-table-row');
            if (row.isSummary) rowElement.classList.add('gantt-table-row--summary');
            if (row.isSolutionGroup) rowElement.classList.add('gantt-table-row--solution-group');
            if (row.parentId) {
                rowElement.classList.add('gantt-table-row--subtask');
                rowElement.dataset.parentId = row.parentId;
                if (isFirstSubtask) rowElement.classList.add('gantt-table-row--subtask-first');
                if (isLastSubtask) rowElement.classList.add('gantt-table-row--subtask-last');
                if (!isFirstSubtask && !isLastSubtask) rowElement.classList.add('gantt-table-row--subtask-middle');
            }
            if ((row.isSummary && collapsedSummaryIds.has(row.id)) || (row.isSolutionGroup && collapsedSolutionGroupIds.has(row.id))) rowElement.classList.add('is-collapsed');
            if (row.isCustomSchedule) rowElement.classList.add('has-custom-duration');
            if (row.hasDerivedCustomSchedule) rowElement.classList.add('has-derived-custom-duration');
            if (row.isUserAdded) rowElement.classList.add('is-user-added');
            rowElement.dataset.taskId = row.id;
            rowElement.style.removeProperty('top');
            rowElement.style.removeProperty('height');
            rowElement.style.minHeight = `${row.isSolutionGroup ? 56 : row.isSummary ? 52 : 48}px`;
            rowElement.setAttribute('role', 'button');
            rowElement.tabIndex = 0;
            rowElement.setAttribute(
                'aria-label',
                row.isSolutionGroup
                    ? `Open details for connector group ${getRowPrimaryLabel(row)}`
                    : `Open details for ${row.step}`
            );
            if (row.isSummary) {
                rowElement.setAttribute('aria-expanded', collapsedSummaryIds.has(row.id) ? 'false' : 'true');
            }
            if (row.isSolutionGroup) {
                rowElement.setAttribute('aria-expanded', collapsedSolutionGroupIds.has(row.id) ? 'false' : 'true');
                applyConnectorAccentSurface(rowElement, row.connectorColor);
            }

            const rowNumberCell = createText(
                'div',
                row.number,
                'gantt-table-cell gantt-table-cell--row-number'
            );
            const taskCell = createElement('div', 'gantt-table-cell gantt-table-cell--task');
            const taskContent = createElement('div', 'gantt-table-task-content');
            if (row.parentId) taskContent.classList.add('gantt-table-task-content--subtask');
            taskContent.style.setProperty('--task-indent', row.parentId ? '18px' : '0px');

            const titleRow = createElement('div', 'gantt-table-task-title-row');
            if (row.isSolutionGroup) {
                titleRow.appendChild(createElement('span', 'gantt-table-toggle-spacer'));
            } else if (row.isSummary) {
                const toggle = createElement('button', 'gantt-table-toggle');
                toggle.type = 'button';
                toggle.textContent = collapsedSummaryIds.has(row.id) ? SUMMARY_COLLAPSED_PREFIX : SUMMARY_EXPANDED_PREFIX;
                toggle.setAttribute('aria-label', `${collapsedSummaryIds.has(row.id) ? 'Expand' : 'Collapse'} ${row.step}`);
                toggle.setAttribute('aria-expanded', collapsedSummaryIds.has(row.id) ? 'false' : 'true');
                bindPrimaryActivation(toggle, () => onToggleSummary?.(row.id));
                titleRow.appendChild(toggle);
            } else {
                titleRow.appendChild(createElement('span', 'gantt-table-toggle-spacer'));
            }

            const titleStack = createElement('div', 'gantt-table-task-title-stack');
            const nameHost = createElement('div', 'gantt-table-task-name-host');
            renderTaskNameDisplay(row, taskCell, nameHost);
            titleStack.appendChild(nameHost);

            const meta = getTaskTableMeta(row);
            const description = getTaskTableDescription(row);
            const secondaryDetails = [
                meta !== '—' ? meta : '',
                description !== '—' && description !== row.step ? description : ''
            ].filter(Boolean).join(' • ');
            if (secondaryDetails) {
                titleStack.title = secondaryDetails;
            }

            const rowActions = createElement('div', 'gantt-table-row-actions');
            const orderState = orderScopeIndexByRowId.get(row.id);
            if (orderState) {
                const moveUpButton = createElement('button', 'gantt-table-row-action gantt-table-row-action--move');
                moveUpButton.type = 'button';
                moveUpButton.textContent = '↑';
                moveUpButton.setAttribute('aria-label', `Move ${row.step} up`);
                moveUpButton.title = `Move ${row.step} up`;
                moveUpButton.disabled = orderState.index === 0;
                moveUpButton.addEventListener('click', (event) => {
                    stopRowActivation(event);
                    if (moveUpButton.disabled) return;
                    onMoveTask?.(row.id, -1);
                });
                rowActions.appendChild(moveUpButton);

                const moveDownButton = createElement('button', 'gantt-table-row-action gantt-table-row-action--move');
                moveDownButton.type = 'button';
                moveDownButton.textContent = '↓';
                moveDownButton.setAttribute('aria-label', `Move ${row.step} down`);
                moveDownButton.title = `Move ${row.step} down`;
                moveDownButton.disabled = orderState.index >= orderState.count - 1;
                moveDownButton.addEventListener('click', (event) => {
                    stopRowActivation(event);
                    if (moveDownButton.disabled) return;
                    onMoveTask?.(row.id, 1);
                });
                rowActions.append(moveUpButton, moveDownButton);
            }
            if (row.isSummary && row.solutionId) {
                const addSubtaskButton = createElement('button', 'gantt-table-row-action gantt-table-row-action--add');
                addSubtaskButton.type = 'button';
                addSubtaskButton.textContent = '+';
                addSubtaskButton.setAttribute('aria-label', `Add a subtask to ${row.step}`);
                addSubtaskButton.title = `Add a subtask to ${row.step}`;
                addSubtaskButton.addEventListener('click', (event) => {
                    stopRowActivation(event);
                    onAddSubtask?.(row.id);
                });
                rowActions.appendChild(addSubtaskButton);
            }
            if (row.isUserAdded) {
                const deleteButton = createElement('button', 'gantt-table-row-action gantt-table-row-action--delete');
                deleteButton.type = 'button';
                deleteButton.textContent = '🗑';
                deleteButton.setAttribute('aria-label', `Delete ${row.step}`);
                deleteButton.title = `Delete ${row.step}`;
                deleteButton.addEventListener('click', (event) => {
                    stopRowActivation(event);
                    onDeleteTask?.(row.id);
                });
                rowActions.appendChild(deleteButton);
            }
            const badgeLabel = getCustomDurationBadgeLabel(row);
            const customBadge = badgeLabel
                ? createText('span', badgeLabel, 'gantt-table-badge gantt-table-badge--custom')
                : null;
            const capacityBadgeLabel = getRowCapacityBadgeLabel(row);
            const capacityBadge = capacityBadgeLabel
                ? createText('span', capacityBadgeLabel, getRowCapacityBadgeClassName(row))
                : null;
            const titleExtras = [capacityBadge, customBadge].filter(Boolean);
            if (rowActions.childElementCount > 0) {
                if (titleExtras.length > 0) {
                    titleRow.append(titleStack, ...titleExtras, rowActions);
                } else {
                    titleRow.append(titleStack, rowActions);
                }
            } else if (titleExtras.length > 0) {
                titleRow.append(titleStack, ...titleExtras);
            } else {
                titleRow.appendChild(titleStack);
            }
            taskContent.appendChild(titleRow);
            taskCell.appendChild(taskContent);

            const ownerCell = createElement('div', 'gantt-table-cell gantt-table-cell--owner');
            renderInlineOwnerDisplay(row, ownerCell);
            attachInlineCellLauncher(ownerCell, {
                title: `Edit owner for ${row.step}`,
                isEnabled: !row.isSolutionGroup,
                onOpen: () => openInlineOwnerEditor(row, ownerCell)
            });

            const statusCell = createElement('div', 'gantt-table-cell gantt-table-cell--status');
            renderInlineStatusDisplay(row, statusCell);
            attachInlineCellLauncher(statusCell, {
                title: `Edit status for ${row.step}`,
                isEnabled: !row.isSolutionGroup,
                onOpen: () => openInlineSelectEditor(row, statusCell, {
                    currentValue: normalizeStatusLabel(row.status),
                    options: STATUS_OPTIONS,
                    renderDisplay: renderInlineStatusDisplay,
                    onSave: (nextValue) => onInlineFieldSave?.(row.id, { status: nextValue }),
                    ariaLabel: `Status for ${row.step}`
                })
            });

            const durationCell = createElement('div', 'gantt-table-cell gantt-table-cell--duration');
            renderInlineDurationDisplay(row, durationCell);
            attachInlineCellLauncher(durationCell, {
                title: `Edit duration for ${row.step}`,
                isEnabled: row.isDurationEditable,
                onOpen: () => openInlineDurationEditor(row, durationCell)
            });

            const startCell = createElement('div', 'gantt-table-cell gantt-table-date');
            renderInlineDateDisplay(row, startCell, 'start');
            attachInlineCellLauncher(startCell, {
                title: `Edit start date for ${row.step}`,
                isEnabled: row.isStartWeekEditable,
                onOpen: () => openInlineDateEditor(row, startCell, {
                    fieldKey: 'start',
                    currentDate: row.startDate || getRowCalendarStartDate(row, projectStartDate),
                    renderDisplay: renderInlineDateDisplay,
                    onSave: (nextValue) => {
                        const nextStartWeek = getStartWeekFromDate(nextValue, projectStartDate);
                        if (row.isSolutionGroup) {
                            onInlineSolutionGroupStartSave?.(row.id, nextStartWeek);
                            return;
                        }
                        onInlineScheduleSave?.(row.id, {
                            startWeek: nextStartWeek
                        });
                    }
                })
            });

            const dependencyCell = createElement('div', 'gantt-table-cell gantt-table-cell--dependencies');
            const dependencyLabel = row.isSolutionGroup ? '—' : formatDetailDependencyLabel(row, allRowsById);
            renderReadonlyCellValue(
                dependencyCell,
                dependencyLabel === 'None' ? '—' : dependencyLabel,
                'gantt-table-inline-value gantt-table-inline-value--readonly',
                dependencyLabel === 'None' ? 'No dependencies' : dependencyLabel
            );

            const impactCell = createElement('div', 'gantt-table-cell gantt-table-cell--impact');
            renderInlineImpactDisplay(row, impactCell);
            attachInlineCellLauncher(impactCell, {
                title: `Edit priority for ${row.step}`,
                isEnabled: !row.isSolutionGroup,
                onOpen: () => openInlineSelectEditor(row, impactCell, {
                    currentValue: normalizeImpactLabel(row.impact),
                    options: IMPACT_OPTIONS,
                    renderDisplay: renderInlineImpactDisplay,
                    onSave: (nextValue) => onInlineFieldSave?.(row.id, { impact: nextValue }),
                    ariaLabel: `Priority for ${row.step}`
                })
            });

            rowElement.append(rowNumberCell, taskCell, statusCell, ownerCell, durationCell, startCell, dependencyCell, impactCell);

            const activateRow = (event) => {
                const targetElement = getEventElementTarget(event);
                const activeEditorCell = activeInlineEditor?.cell;
                if (targetElement?.closest?.('.gantt-table-inline-trigger, .gantt-table-task-name-trigger, .gantt-table-task-toggle-label, .gantt-solution-group-action-button, .gantt-table-row-action, .gantt-table-toggle, .gantt-table-add-button')) return;
                if (targetElement?.closest?.('.gantt-table-cell.is-editing')) return;
                if (activeEditorCell && targetElement && activeEditorCell.contains(targetElement)) return;

                onSelect(row.id);
            };

            rowElement.addEventListener('click', activateRow);
            rowElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activateRow();
                }
            });
            rowElement.addEventListener('mouseenter', () => onHoverTask?.(row.id, true));
            rowElement.addEventListener('mouseleave', () => onHoverTask?.(row.id, false));
            rowElement.addEventListener('focus', () => onHoverTask?.(row.id, true));
            rowElement.addEventListener('blur', () => onHoverTask?.(row.id, false));

            rowElements.set(row.id, rowElement);
            surface.appendChild(rowElement);
        });
    };

    updateLayout();

    return {
        panel,
        scroll,
        updateLayout,
        openInlineField(taskId = '', fieldKey = 'name') {
            const openField = inlineFieldOpeners.get(`${taskId}:${fieldKey}`);
            if (typeof openField === 'function') {
                openField();
                return true;
            }
            return false;
        },
        setActiveTask(taskId = '') {
            rowElements.forEach((rowElement, rowId) => {
                rowElement.classList.toggle('is-active', taskId === rowId);
            });
        },
        setHoveredTask(taskId = '', isHovered = false) {
            const rowElement = rowElements.get(taskId);
            if (rowElement) {
                rowElement.classList.toggle('is-hovered', Boolean(isHovered));
            }
        }
    };
}

function enableSplitPaneResize(layout, divider, options = {}) {
    if (!layout || !divider) return;

    ganttResizeCleanup?.();

    const {
        min = 420,
        maxOffset = 360,
        max = null,
        preferredRatio = 0.42,
        ariaLabel = 'Resize task table and timeline'
    } = options;

    divider.tabIndex = 0;
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-label', ariaLabel);
    divider.setAttribute('aria-orientation', 'vertical');

    const getBounds = () => {
        const width = layout.getBoundingClientRect().width;
        return {
            min,
            max: Math.min(Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER, Math.max(min + 80, width - maxOffset))
        };
    };

    const applyWidth = (nextWidth) => {
        const { min: minWidth, max: maxWidth } = getBounds();
        const clampedWidth = Math.min(maxWidth, Math.max(minWidth, nextWidth));
        layout.style.gridTemplateColumns = `${clampedWidth}px 12px minmax(0, 1fr)`;
        divider.setAttribute('aria-valuemin', String(minWidth));
        divider.setAttribute('aria-valuemax', String(maxWidth));
        divider.setAttribute('aria-valuenow', String(Math.round(clampedWidth)));
    };

    window.requestAnimationFrame(() => {
        const measuredWidth = Math.round(layout.getBoundingClientRect().width * preferredRatio) || min;
        applyWidth(measuredWidth);
    });

    let activeResizeSession = null;

    const handlePointerMove = (event) => {
        const bounds = layout.getBoundingClientRect();
        applyWidth(event.clientX - bounds.left);
    };

    divider.addEventListener('pointerdown', (event) => {
        if (window.matchMedia('(max-width: 900px)').matches) return;
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        activeResizeSession?.cleanup({ cancelled: true });
        activeResizeSession = startPointerDragSession(event, divider, {
            onMove: handlePointerMove,
            onEnd() {
                activeResizeSession = null;
            }
        });
    });

    divider.addEventListener('keydown', (event) => {
        const currentWidth = tableHostWidth(layout);
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            applyWidth(currentWidth - 24);
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            applyWidth(currentWidth + 24);
        }
    });

    const handleResize = () => {
        const currentWidth = tableHostWidth(layout);
        applyWidth(currentWidth);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    ganttResizeCleanup = () => {
        document.body.classList.remove('is-resizing-gantt');
        activeResizeSession?.cleanup({ cancelled: true });
        activeResizeSession = null;
        window.removeEventListener('resize', handleResize);
    };
}

function tableHostWidth(layout) {
    const computed = window.getComputedStyle(layout).gridTemplateColumns.split(' ');
    return Number.parseFloat(computed[0]) || layout.getBoundingClientRect().width * 0.42;
}

function syncSplitPaneScroll(tableScroll, chartHost) {
    if (!tableScroll || !chartHost) return;

    tableScroll.__scrollSyncCleanup?.();
    chartHost.__ganttScrollSyncCleanup?.();

    const ganttContainer = chartHost.querySelector('.gantt-container');
    if (!ganttContainer) return;

    let syncingFromTable = false;
    let syncingFromGantt = false;

    const handleTableScroll = () => {
        if (syncingFromGantt) return;
        syncingFromTable = true;
        ganttContainer.scrollTop = tableScroll.scrollTop;
        syncingFromTable = false;
    };

    const handleGanttScroll = () => {
        if (syncingFromTable) return;
        syncingFromGantt = true;
        tableScroll.scrollTop = ganttContainer.scrollTop;
        syncingFromGantt = false;
    };

    tableScroll.addEventListener('scroll', handleTableScroll, { passive: true });
    ganttContainer.addEventListener('scroll', handleGanttScroll, { passive: true });

    const cleanup = () => {
        tableScroll.removeEventListener('scroll', handleTableScroll);
        ganttContainer.removeEventListener('scroll', handleGanttScroll);
    };

    tableScroll.__scrollSyncCleanup = cleanup;
    chartHost.__ganttScrollSyncCleanup = cleanup;
    tableScroll.scrollTop = ganttContainer.scrollTop;
}

function bindGanttScrollGestureState(chartHost, { onScrollStart } = {}) {
    if (!chartHost) return;

    chartHost.__ganttScrollGestureCleanup?.();
    chartHost.classList.remove('is-scroll-gesturing');

    const ganttContainer = chartHost.querySelector('.gantt-container');
    if (!ganttContainer) return;

    let scrollGestureTimer = 0;
    const clearScrollGestureState = () => {
        if (scrollGestureTimer) {
            window.clearTimeout(scrollGestureTimer);
            scrollGestureTimer = 0;
        }
        chartHost.classList.remove('is-scroll-gesturing');
    };

    const handleScroll = () => {
        if (!chartHost.classList.contains('is-scroll-gesturing')) {
            onScrollStart?.();
        }
        chartHost.classList.add('is-scroll-gesturing');
        if (scrollGestureTimer) {
            window.clearTimeout(scrollGestureTimer);
        }
        scrollGestureTimer = window.setTimeout(() => {
            scrollGestureTimer = 0;
            chartHost.classList.remove('is-scroll-gesturing');
        }, 140);
    };

    ganttContainer.addEventListener('scroll', handleScroll, { passive: true });
    chartHost.__ganttScrollGestureCleanup = () => {
        ganttContainer.removeEventListener('scroll', handleScroll);
        clearScrollGestureState();
    };
}

function bindGanttTaskSelection(chartHost, { onSelectTask } = {}) {
    if (!chartHost) return;

    chartHost.__ganttTaskSelectionCleanup?.();
    if (typeof onSelectTask !== 'function') return;

    let lastActivatedTaskId = '';
    let activationTimer = 0;
    const resetActivation = () => {
        lastActivatedTaskId = '';
        activationTimer = 0;
    };

    const handleClick = (event) => {
        if (chartHost.classList.contains('is-scroll-gesturing')) return;
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        if (target.closest('.gantt-solution-group-action-label')) return;

        const wrapper = target.closest('.bar-wrapper');
        const taskId = wrapper?.getAttribute('data-id') || '';
        if (!taskId || taskId === lastActivatedTaskId) return;

        lastActivatedTaskId = taskId;
        if (activationTimer) {
            window.clearTimeout(activationTimer);
        }
        activationTimer = window.setTimeout(resetActivation, 180);
        onSelectTask(taskId);
    };

    chartHost.addEventListener('click', handleClick);
    chartHost.__ganttTaskSelectionCleanup = () => {
        chartHost.removeEventListener('click', handleClick);
        if (activationTimer) {
            window.clearTimeout(activationTimer);
        }
        resetActivation();
    };
}

function getTimelineQuarterLabel(date) {
    return `Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function getTimelineLowerLabel(viewModeName, date) {
    if (viewModeName === 'Months') {
        return date.toLocaleDateString('en-US', { month: 'short' });
    }
    if (viewModeName === 'Quarters') {
        return getTimelineQuarterLabel(date);
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTimelineGroupKey(viewModeName, date) {
    if (viewModeName === 'Months' || viewModeName === 'Quarters') {
        return String(date.getFullYear());
    }
    return `${date.getFullYear()}-${date.getMonth()}`;
}

function getTimelineGroupLabel(viewModeName, date) {
    if (viewModeName === 'Months' || viewModeName === 'Quarters') {
        return String(date.getFullYear());
    }
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function isCurrentTimelineCell(viewModeName, date, nextDate, today) {
    if (viewModeName === 'Months') {
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }
    if (viewModeName === 'Quarters') {
        return Math.floor(date.getMonth() / 3) === Math.floor(today.getMonth() / 3)
            && date.getFullYear() === today.getFullYear();
    }
    const safeNextDate = nextDate || new Date(date.getTime() + (7 * DAY_MS));
    return today >= date && today < safeNextDate;
}

function getTimelineCellTitle(viewModeName, date) {
    if (viewModeName === 'Months') {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (viewModeName === 'Quarters') {
        return `${getTimelineQuarterLabel(date)} ${date.getFullYear()}`;
    }
    return `Week of ${formatDateForTable(date)}`;
}

function syncGanttTimelineHeader(chartHost) {
    const gantt = chartHost?.__ganttInstance;
    if (!gantt || typeof gantt.get_dates_to_draw !== 'function') return;

    const header = gantt.$header;
    const upperHeader = gantt.$upper_header;
    const lowerHeader = gantt.$lower_header;
    if (!header || !upperHeader || !lowerHeader) return;

    const rangeHighlights = [...lowerHeader.querySelectorAll('.date-range-highlight')];
    const dateInfo = gantt.get_dates_to_draw();
    if (!Array.isArray(dateInfo) || dateInfo.length === 0) return;

    const viewModeName = gantt.config.view_mode?.name || GANTT_VIEW_MODES[0].name;
    const firstDate = dateInfo[0];
    const lastDate = dateInfo[dateInfo.length - 1];
    const signature = [
        viewModeName,
        dateInfo.length,
        firstDate?.formatted_date || '',
        lastDate?.formatted_date || '',
        gantt.config.column_width
    ].join('|');

    if (header.dataset.timelineHeaderSig === signature) {
        return;
    }

    header.dataset.timelineHeaderSig = signature;
    header.dataset.viewMode = viewModeName.toLowerCase();
    upperHeader.replaceChildren();
    lowerHeader.replaceChildren(...rangeHighlights);
    upperHeader.classList.add('gantt-custom-timeline-row', 'gantt-custom-timeline-row--upper');
    lowerHeader.classList.add('gantt-custom-timeline-row', 'gantt-custom-timeline-row--lower');

    const today = startOfDay(new Date());
    dateInfo.forEach((entry, index) => {
        const nextEntry = dateInfo[index + 1];
        const lowerCell = createElement('div', 'gantt-timeline-header-cell gantt-timeline-header-cell--lower');
        lowerCell.style.left = `${entry.x}px`;
        lowerCell.style.width = `${Math.max(1, entry.column_width)}px`;
        lowerCell.textContent = getTimelineLowerLabel(viewModeName, entry.date);
        lowerCell.title = getTimelineCellTitle(viewModeName, entry.date);
        lowerCell.classList.toggle('is-today', isCurrentTimelineCell(viewModeName, entry.date, nextEntry?.date, today));
        lowerHeader.appendChild(lowerCell);
    });

    let groupStart = 0;
    let groupIndex = 0;
    while (groupStart < dateInfo.length) {
        const firstEntry = dateInfo[groupStart];
        const groupKey = getTimelineGroupKey(viewModeName, firstEntry.date);
        let width = 0;
        let groupEnd = groupStart;
        while (groupEnd < dateInfo.length) {
            const currentEntry = dateInfo[groupEnd];
            if (getTimelineGroupKey(viewModeName, currentEntry.date) !== groupKey) {
                break;
            }
            width += Math.max(1, currentEntry.column_width);
            groupEnd += 1;
        }

        const upperCell = createElement(
            'div',
            `gantt-timeline-header-cell gantt-timeline-header-cell--upper${groupIndex % 2 === 1 ? ' is-alt' : ''}`
        );
        upperCell.style.left = `${firstEntry.x}px`;
        upperCell.style.width = `${Math.max(1, width)}px`;
        upperCell.textContent = getTimelineGroupLabel(viewModeName, firstEntry.date);
        upperHeader.appendChild(upperCell);

        groupIndex += 1;
        groupStart = groupEnd;
    }
}

function syncGanttMilestoneMarkers(svg, milestones = [], diagnostics = [], ganttInstance = null) {
    if (!svg) {
        return;
    }

    const layer = svg.querySelector('.gantt-milestone-layer') || createSvgElement('g', 'gantt-milestone-layer');
    if (!layer.isConnected) {
        svg.appendChild(layer);
    }

    const diagnosticsById = new Map((Array.isArray(diagnostics) ? diagnostics : []).map((entry) => [entry.id, entry]));
    layer.replaceChildren();

    (Array.isArray(milestones) ? milestones : []).forEach((milestone) => {
        const anchor = diagnosticsById.get(milestone.anchorTaskId);
        if (!anchor) {
            return;
        }

        const fallbackX = ganttInstance && typeof ganttInstance.get_x_from_date === 'function'
            ? Number(ganttInstance.get_x_from_date(milestone.date)) || 0
            : 0;
        const x = Number.isFinite(anchor.x) && Number.isFinite(anchor.width)
            ? anchor.x + anchor.width
            : fallbackX;
        const y = Number.isFinite(anchor.y) && Number.isFinite(anchor.height)
            ? anchor.y + (anchor.height / 2)
            : 0;
        const group = createSvgElement('g', 'gantt-milestone-marker');
        group.setAttribute('transform', `translate(${x}, ${y})`);
        group.setAttribute('data-milestone-id', milestone.id || '');

        const diamond = createSvgElement('rect', 'gantt-milestone-marker__diamond');
        diamond.setAttribute('x', '-6');
        diamond.setAttribute('y', '-6');
        diamond.setAttribute('width', '12');
        diamond.setAttribute('height', '12');
        diamond.setAttribute('rx', '1.5');
        diamond.setAttribute('ry', '1.5');
        diamond.setAttribute('transform', 'rotate(45)');

        const tooltip = createSvgElement('title');
        tooltip.textContent = milestone.name || 'Milestone';

        group.append(diamond, tooltip);
        layer.appendChild(group);
    });
}

/**
 * Draw Finish-to-Start dependency arrows in the Gantt SVG.
 * Inserts a g.gantt-dependency-layer before the bar-wrappers group so arrows
 * render behind task bars. Clears and redraws on each inspect cycle.
 *
 * @param {SVGElement} svg - The Frappe Gantt <svg class="gantt"> element.
 * @param {Map<string, object>} taskById - Map of taskId → task (from stabilizeGanttRender closure).
 */
function syncGanttDependencyArrows(svg, taskById) {
    if (!svg) return;

    // Ensure <defs> + arrowhead marker exist (created once, reused every cycle)
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = createSvgElement('defs');
        svg.insertBefore(defs, svg.firstElementChild);
    }
    const MARKER_ID = 'gantt-dep-arrowhead';
    if (!defs.querySelector(`#${MARKER_ID}`)) {
        const marker = createSvgElement('marker');
        marker.setAttribute('id', MARKER_ID);
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto');
        const arrowTip = createSvgElement('path');
        arrowTip.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        arrowTip.setAttribute('class', 'gantt-dep-arrowhead-path');
        marker.appendChild(arrowTip);
        defs.appendChild(marker);
    }

    // Get or create the dependency layer, positioned before the bar-wrappers group
    let layer = svg.querySelector('.gantt-dependency-layer');
    if (!layer) {
        layer = createSvgElement('g', 'gantt-dependency-layer');
        const firstBarWrapper = svg.querySelector('.bar-wrapper');
        const barsParent = firstBarWrapper?.parentElement;
        if (barsParent && barsParent !== svg) {
            svg.insertBefore(layer, barsParent);
        } else if (firstBarWrapper) {
            svg.insertBefore(layer, firstBarWrapper);
        } else {
            const gridBackground = svg.querySelector('.grid-background');
            if (gridBackground?.nextSibling) {
                svg.insertBefore(layer, gridBackground.nextSibling);
            } else {
                svg.appendChild(layer);
            }
        }
    }
    layer.replaceChildren();

    // Draw one elbow-style path per (predecessor → successor) dependency pair
    const ELBOW_OFFSET = 8;
    taskById.forEach((task, taskId) => {
        if (!Array.isArray(task.dependencies) || task.dependencies.length === 0) return;

        const escapedSuccId = escapeAttributeSelectorValue(taskId);
        const succWrapper = svg.querySelector(`.bar-wrapper[data-id="${escapedSuccId}"]`);
        const succRect = succWrapper?.querySelector('rect.bar');
        if (!succWrapper || !succRect) return;

        const endX = Number(succRect.getAttribute('x'));
        const succY = Number(succRect.getAttribute('y'));
        const succH = Number(succRect.getAttribute('height'));
        if (!Number.isFinite(endX) || !Number.isFinite(succY) || !Number.isFinite(succH)) return;
        const endY = succY + succH / 2;

        task.dependencies.forEach((predId) => {
            if (predId === taskId) return; // guard: no self-arrows

            const escapedPredId = escapeAttributeSelectorValue(predId);
            const predWrapper = svg.querySelector(`.bar-wrapper[data-id="${escapedPredId}"]`);
            const predRect = predWrapper?.querySelector('rect.bar');
            if (!predWrapper || !predRect) return;

            const predX = Number(predRect.getAttribute('x'));
            const predY = Number(predRect.getAttribute('y'));
            const predW = Number(predRect.getAttribute('width'));
            const predH = Number(predRect.getAttribute('height'));
            if (!Number.isFinite(predX) || !Number.isFinite(predY) || !Number.isFinite(predW) || !Number.isFinite(predH)) return;

            const startX = predX + predW;
            const startY = predY + predH / 2;
            const elbowX = startX + ELBOW_OFFSET;

            // Elbow route: right from pred end → vertical to succ row → left to succ start
            const arrowPath = createSvgElement('path');
            arrowPath.setAttribute('class', 'gantt-dep-arrow');
            arrowPath.setAttribute('d', `M ${startX} ${startY} H ${elbowX} V ${endY} H ${endX}`);
            arrowPath.setAttribute('data-pred-id', predId);
            arrowPath.setAttribute('data-succ-id', taskId);
            arrowPath.setAttribute('marker-end', `url(#${MARKER_ID})`);
            layer.appendChild(arrowPath);
        });
    });

    // Bind hover-highlight on each bar-wrapper once (handlers close over `layer`)
    svg.querySelectorAll('.bar-wrapper').forEach((wrapper) => {
        if (wrapper.dataset.depArrowHoverBound === 'true') return;
        const wId = wrapper.getAttribute('data-id') || '';
        wrapper.addEventListener('mouseenter', () => {
            const eid = escapeAttributeSelectorValue(wId);
            layer.querySelectorAll(`.gantt-dep-arrow[data-pred-id="${eid}"], .gantt-dep-arrow[data-succ-id="${eid}"]`).forEach((p) => {
                p.classList.add('gantt-dep-arrow--highlighted');
            });
        });
        wrapper.addEventListener('mouseleave', () => {
            layer.querySelectorAll('.gantt-dep-arrow--highlighted').forEach((p) => {
                p.classList.remove('gantt-dep-arrow--highlighted');
            });
        });
        wrapper.dataset.depArrowHoverBound = 'true';
    });
}

function stabilizeGanttRender(
    chartHost,
    tasks,
    {
        milestones = [],
        collapsedSummaryIds = new Set(),
        collapsedSolutionGroupIds = new Set(),
        onToggleSummary,
        onToggleSolutionGroup,
        onLayoutChange,
        onHoverTask
    } = {}
) {
    if (!chartHost) return;

    chartHost.__ganttObserver?.disconnect?.();

    const taskById = new Map(tasks.map((task) => [task.id, task]));
    let frameHandle = 0;
    let initialHorizontalScrollApplied = false;

    const inspect = () => {
        frameHandle = 0;

        const container = chartHost.querySelector('.gantt-container');
        const svg = chartHost.querySelector('svg.gantt');
        if (!container || !svg) return;

        syncGanttTimelineHeader(chartHost);

        const gridBackground = svg.querySelector('.grid-background');
        if (gridBackground && svg.firstElementChild !== gridBackground) {
            svg.insertBefore(gridBackground, svg.firstElementChild);
        }

        const wrappers = [...chartHost.querySelectorAll('.bar-wrapper')];
        const wrappersById = new Map(wrappers.map((wrapper) => [wrapper.getAttribute('data-id') || '', wrapper]));
        const diagnostics = wrappers.map((wrapper) => {
            const id = wrapper.getAttribute('data-id') || '';
            const task = taskById.get(id);
            const rect = wrapper.querySelector('rect.bar');
            const progressRect = wrapper.querySelector('rect.bar-progress');
            let label = wrapper.querySelector('.bar-label');

            wrapper.classList.toggle('gantt-summary-task', Boolean(task?.isSummary));
            wrapper.classList.toggle('gantt-solution-group', Boolean(task?.isSolutionGroup));
            wrapper.classList.toggle('gantt-subtask', Boolean(task?.isSubtask));
            wrapper.classList.toggle(
                'is-collapsed',
                Boolean(
                    (task?.isSummary && collapsedSummaryIds.has(task.id))
                    || (task?.isSolutionGroup && collapsedSolutionGroupIds.has(task.id))
                )
            );
            wrapper.classList.toggle('has-custom-duration', Boolean(task?.hasCustomSchedule));
            wrapper.classList.toggle('has-derived-custom-duration', Boolean(task?.hasDerivedCustomSchedule));
            PHASE_SEQUENCE.forEach((phase) => {
                wrapper.classList.toggle(phase.className, task?.phaseClassName === phase.className);
            });
            if (task?.phaseClassName) {
                wrapper.dataset.phaseClass = task.phaseClassName;
            } else {
                delete wrapper.dataset.phaseClass;
            }
            if (task?.parentId) {
                wrapper.setAttribute('data-parent-id', task.parentId);
            } else {
                wrapper.removeAttribute('data-parent-id');
            }

            if (typeof onHoverTask === 'function' && wrapper.dataset.hoverSyncBound !== 'true') {
                wrapper.addEventListener('mouseenter', () => onHoverTask(id, true));
                wrapper.addEventListener('mouseleave', () => onHoverTask(id, false));
                wrapper.dataset.hoverSyncBound = 'true';
            }

            if (rect) {
                const baseY = Number(rect.dataset.baseY || rect.getAttribute('y') || 0);
                const baseHeight = Number(rect.dataset.baseHeight || rect.getAttribute('height') || 32);
                const isCollapsedSummary = Boolean(task?.isSummary && collapsedSummaryIds.has(task.id));
                const isCollapsedSolutionGroup = Boolean(task?.isSolutionGroup && collapsedSolutionGroupIds.has(task.id));
                rect.dataset.baseY = String(baseY);
                rect.dataset.baseHeight = String(baseHeight);

                const nextHeight = task?.isSubtask
                    ? Math.max(12, baseHeight - 4)
                    : task?.isSolutionGroup
                        ? Math.max(18, baseHeight + (isCollapsedSolutionGroup ? 0 : 2))
                        : isCollapsedSummary
                            ? Math.max(16, baseHeight)
                            : task?.isSummary
                                ? Math.max(14, baseHeight - 2)
                                : baseHeight;
                const nextY = baseY + ((baseHeight - nextHeight) / 2);

                rect.setAttribute('y', String(nextY));
                rect.setAttribute('height', String(nextHeight));
                if (task?.color) rect.style.setProperty('fill', task.color, 'important');
                rect.style.setProperty('opacity', String(task?.barOpacity ?? 1), 'important');
                rect.style.setProperty('fill-opacity', String(task?.barFillOpacity ?? 0.96), 'important');
                rect.style.setProperty('stroke', task?.barStrokeColor || darkenHexColor(task?.color || '#64748B', 0.34), 'important');
                rect.style.setProperty(
                    'stroke-width',
                    String(
                        isCollapsedSummary || isCollapsedSolutionGroup
                            ? Math.max(1.8, Number(task?.barStrokeWidth) || 2)
                            : Number(task?.barStrokeWidth) || (task?.isSolutionGroup ? 2 : task?.isSummary ? 1.6 : 1.4)
                    ),
                    'important'
                );
                rect.style.setProperty('stroke-dasharray', task?.barStrokeDasharray && task.barStrokeDasharray !== 'none' ? task.barStrokeDasharray : 'none', 'important');
                rect.style.setProperty('stroke-linecap', 'round', 'important');

                if (progressRect) {
                    const progressBaseY = Number(progressRect.dataset.baseY || progressRect.getAttribute('y') || baseY);
                    const barX = Number(rect.getAttribute('x') || 0);
                    const barWidth = Math.max(0, Number(rect.getAttribute('width') || 0));
                    const normalizedProgress = Math.max(0, Math.min(100, Number(task?.progress) || 0));
                    const progressWidth = Math.max(0, Math.min(barWidth, (barWidth * normalizedProgress) / 100));
                    const showPartialProgress = Boolean(task?.progressIsPartial) && progressWidth > 0;
                    const rectRadiusX = rect.getAttribute('rx') || String(Math.max(4, Math.min(8, nextHeight / 2)));
                    const rectRadiusY = rect.getAttribute('ry') || rectRadiusX;
                    progressRect.dataset.baseY = String(progressBaseY);
                    progressRect.setAttribute('x', String(barX));
                    progressRect.setAttribute('y', String(nextY));
                    progressRect.setAttribute('width', showPartialProgress ? String(progressWidth) : '0');
                    progressRect.setAttribute('height', String(nextHeight));
                    progressRect.setAttribute('rx', rectRadiusX);
                    progressRect.setAttribute('ry', rectRadiusY);
                    progressRect.style.setProperty('display', showPartialProgress ? 'inline' : 'none', 'important');
                    progressRect.style.setProperty('pointer-events', 'none', 'important');
                    progressRect.style.setProperty('stroke', 'none', 'important');
                    progressRect.style.setProperty('opacity', showPartialProgress ? '1' : '0', 'important');
                    progressRect.style.setProperty('fill-opacity', showPartialProgress ? String(task?.progressFillOpacity ?? 1) : '0', 'important');
                    progressRect.style.setProperty('fill', task?.progressColor || darkenHexColor(task?.color || '#64748B', 0.2), 'important');
                }

                label = syncTaskBarLabel(wrapper, rect, task) || label;
            }

            if (label) {
                // Main bar label always opens sidebar — never acts as a collapse toggle
                label.classList.remove('gantt-summary-toggle');
                label.classList.remove('gantt-solution-group-toggle');
                label.classList.toggle('gantt-subtask-label', Boolean(task?.isSubtask));

                label.removeAttribute('role');
                label.removeAttribute('tabindex');
                label.removeAttribute('aria-expanded');
                delete label.dataset.toggleType;
                delete label.dataset.toggleId;
                // Enable pointer-events so outside-right labels can bubble clicks to chartHost
                label.style.cursor = label.textContent ? 'pointer' : 'default';
                label.style.pointerEvents = 'auto';
                if (task?.isSolutionGroup && task?.connectorColor) {
                    label.style.setProperty('fill', getConnectorTextAccentColor(task.connectorColor), 'important');
                    label.style.fontWeight = '600';
                } else {
                    label.style.removeProperty('fill');
                    label.style.fontWeight = '400';
                }

                // Action label handles collapse for both solution groups and summary tasks
                const taskActionLabel = (task?.isSolutionGroup || task?.isSummary)
                    ? wrapper.querySelector('.gantt-solution-group-action-label')
                    : null;

                if (taskActionLabel) {
                    const isCollapsed = task?.isSolutionGroup
                        ? collapsedSolutionGroupIds.has(task.id)
                        : collapsedSummaryIds.has(task.id);
                    taskActionLabel.setAttribute('role', 'button');
                    taskActionLabel.setAttribute('tabindex', '0');
                    taskActionLabel.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
                    taskActionLabel.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${task?.name || task?.labelText || ''}`);
                    if (task?.isSolutionGroup && task?.connectorColor) {
                        taskActionLabel.style.setProperty('fill', getConnectorTextAccentColor(task.connectorColor), 'important');
                        taskActionLabel.style.fontWeight = '600';
                    } else {
                        taskActionLabel.style.removeProperty('fill');
                        taskActionLabel.style.fontWeight = '400';
                    }
                    taskActionLabel.style.cursor = 'pointer';
                    taskActionLabel.style.pointerEvents = 'auto';
                    taskActionLabel.dataset.toggleType = task?.isSolutionGroup ? 'solution-group' : 'summary';
                    taskActionLabel.dataset.toggleId = task.id;

                    if (taskActionLabel.dataset.ganttToggleBound !== 'true') {
                        bindPrimaryActivation(taskActionLabel, () => {
                            if (taskActionLabel.dataset.toggleType === 'solution-group') {
                                onToggleSolutionGroup?.(taskActionLabel.dataset.toggleId || '');
                            } else {
                                onToggleSummary?.(taskActionLabel.dataset.toggleId || '');
                            }
                        });
                        taskActionLabel.dataset.ganttToggleBound = 'true';
                    }
                }
            }

            const bbox = rect && typeof rect.getBBox === 'function' ? rect.getBBox() : null;
            const attrX = Number(rect?.getAttribute('x'));
            const attrY = Number(rect?.getAttribute('y'));
            const attrWidth = Number(rect?.getAttribute('width'));
            const attrHeight = Number(rect?.getAttribute('height'));
            const hasMeasuredBox = Boolean(bbox) && (bbox.width || 0) > 0 && (bbox.height || 0) > 0;
            return {
                id,
                className: wrapper.getAttribute('class') || '',
                x: hasMeasuredBox ? bbox.x : (Number.isFinite(attrX) ? attrX : null),
                y: hasMeasuredBox ? bbox.y : (Number.isFinite(attrY) ? attrY : null),
                width: hasMeasuredBox ? bbox.width : (Number.isFinite(attrWidth) ? attrWidth : null),
                height: hasMeasuredBox ? bbox.height : (Number.isFinite(attrHeight) ? attrHeight : null),
                fill: rect?.style.fill || rect?.getAttribute('fill') || null,
                opacity: rect ? window.getComputedStyle(rect).opacity : null,
                visibility: rect ? window.getComputedStyle(rect).visibility : null
            };
        });

        syncGanttMilestoneMarkers(svg, milestones, diagnostics, chartHost.__ganttInstance || null);
        syncGanttDependencyArrows(svg, taskById);

        const svgHeight = Math.ceil(Math.max(
            Number(svg.getAttribute('height')) || 0,
            svg.getBoundingClientRect().height || 0,
            container.scrollHeight || 0,
            180
        ));

        const gridRows = [...svg.querySelectorAll('.grid-row')];
        const rowMetrics = tasks.map((task, index) => {
            const gridRow = gridRows[index];
            const fallbackTop = index * GANTT_TABLE_ROW_FALLBACK_HEIGHT;
            const top = Number(gridRow?.getAttribute('y'));
            const height = Number(gridRow?.getAttribute('height'));
            const wrapper = wrappersById.get(task.id);
            const rect = wrapper?.querySelector('rect.bar');
            const baseY = Number(rect?.getAttribute('y'));
            return {
                id: task.id,
                top: Number.isFinite(top) ? top : Number.isFinite(baseY) ? Math.max(0, baseY - 9) : fallbackTop,
                height: Math.max(38, Number.isFinite(height) ? height : GANTT_TABLE_ROW_FALLBACK_HEIGHT)
            };
        });

        chartHost.style.minHeight = `${svgHeight}px`;
        container.style.minHeight = `${svgHeight}px`;

        if (!initialHorizontalScrollApplied) {
            const firstBar = diagnostics.find((entry) => Number.isFinite(entry.x) && (entry.width || 0) > 0);
            if (firstBar) {
                const targetScrollLeft = Math.max(0, (firstBar.x || 0) - 48);
                if (targetScrollLeft > 32) {
                    container.scrollLeft = targetScrollLeft;
                }
                initialHorizontalScrollApplied = true;
            }
        }

        onLayoutChange?.({
            rowMetrics,
            svgHeight,
            scrollTop: container.scrollTop,
            viewportHeight: container.clientHeight
        });

        const visibleBars = diagnostics.filter((entry) => (entry.width || 0) > 0 && (entry.height || 0) > 0).length;

        if (wrappers.length > 0 && visibleBars === 0) {
            console.warn('Gantt bars rendered but remain invisible', {
                svg: {
                    width: svg.getAttribute('width'),
                    height: svg.getAttribute('height'),
                    viewBox: svg.getAttribute('viewBox')
                },
                container: {
                    width: container.getBoundingClientRect().width,
                    height: container.getBoundingClientRect().height,
                    scrollWidth: container.scrollWidth,
                    scrollHeight: container.scrollHeight,
                    overflowX: window.getComputedStyle(container).overflowX,
                    overflowY: window.getComputedStyle(container).overflowY
                },
                bars: diagnostics
            });
        }
    };

    const scheduleInspect = () => {
        if (frameHandle) return;
        frameHandle = window.requestAnimationFrame(() => {
            frameHandle = window.requestAnimationFrame(inspect);
        });
    };

    const observer = new MutationObserver(() => scheduleInspect());
    observer.observe(chartHost, { childList: true, subtree: true });
    chartHost.__ganttObserver = observer;

    scheduleInspect();
    window.setTimeout(scheduleInspect, 120);
    window.setTimeout(scheduleInspect, 400);
}

function createDurationEditor(row, { projectStartDate, onSaveDuration, onResetDuration } = {}) {
    const timelineProjectStartDate = projectStartDate || getProjectStartDate();
    const currentStartDate = getRowCalendarStartDate(row, timelineProjectStartDate);
    const currentEndDate = getRowCalendarDueDate(row, timelineProjectStartDate);
    const defaultStartDate = startOfDay(getBusinessDateTimeForWeek(row.defaultStartWeek, timelineProjectStartDate));
    const defaultEndDate = startOfDay(
        addBusinessHours(defaultStartDate, row.defaultDurationBusinessHours || durationWeeksToBusinessHours(row.defaultDurationWeeks)).getTime() - (60 * 1000)
    );
    const initialDurationDays = Math.max(1, Math.round((row.durationBusinessHours || HOURS_PER_DAY) / HOURS_PER_DAY));
    const defaultDurationDays = Math.max(1, Math.round((row.defaultDurationBusinessHours || HOURS_PER_DAY) / HOURS_PER_DAY));
    const section = createElement('section', 'gantt-duration-editor');
    section.append(
        createText('h4', 'Task schedule', 'gantt-duration-editor-title'),
        createText('p', getDurationHelperText(row), 'gantt-duration-note')
    );

    const summary = createElement('div', 'gantt-duration-summary');
    const currentStartSummary = createText('span', `Current start: ${formatDateForTable(currentStartDate)}`, 'gantt-duration-summary-value');
    const defaultStartSummary = createText('span', `Default start: ${formatDateForTable(defaultStartDate)}`, 'gantt-duration-summary-default');
    const currentEndSummary = createText('span', `Current end: ${formatDateForTable(currentEndDate)}`, 'gantt-duration-summary-value');
    const defaultEndSummary = createText('span', `Default end: ${formatDateForTable(defaultEndDate)}`, 'gantt-duration-summary-default');
    const currentDurationSummary = createText('span', `Current duration: ${formatDurationLabel(initialDurationDays, 'days')}`, 'gantt-duration-summary-value');
    const defaultDurationSummary = createText('span', `Default duration: ${formatDurationLabel(defaultDurationDays, 'days')}`, 'gantt-duration-summary-default');
    summary.append(
        currentStartSummary,
        defaultStartSummary,
        currentEndSummary,
        defaultEndSummary,
        currentDurationSummary,
        defaultDurationSummary
    );
    section.appendChild(summary);

    if (!row.isScheduleEditable) {
        return section;
    }

    const controls = createElement('div', 'gantt-duration-controls');

    const startField = createElement('label', 'gantt-duration-field-control');
    startField.appendChild(createText('span', 'Start date', 'gantt-detail-label'));
    const startDateInput = createElement('input', 'gantt-duration-input gantt-detail-text-input');
    startDateInput.type = 'date';
    startDateInput.value = formatDateForInput(currentStartDate);
    startField.appendChild(startDateInput);

    const endField = createElement('label', 'gantt-duration-field-control');
    endField.appendChild(createText('span', 'End date', 'gantt-detail-label'));
    const endDateInput = createElement('input', 'gantt-duration-input gantt-detail-text-input');
    endDateInput.type = 'date';
    endDateInput.value = formatDateForInput(currentEndDate);
    endField.appendChild(endDateInput);

    const durationField = createElement('label', 'gantt-duration-field-control');
    durationField.appendChild(createText('span', 'Duration (days)', 'gantt-detail-label'));
    const durationDaysInput = createElement('input', 'gantt-duration-input gantt-detail-text-input');
    durationDaysInput.type = 'number';
    durationDaysInput.min = '1';
    durationDaysInput.step = '1';
    durationDaysInput.inputMode = 'numeric';
    durationDaysInput.value = String(initialDurationDays);
    durationField.appendChild(durationDaysInput);

    controls.append(startField, endField, durationField);
    section.appendChild(controls);
    section.appendChild(createText('p', 'Date, owner, status, and duration changes sync straight into the planner.', 'gantt-duration-note gantt-duration-note--sync'));

    const readCurrentSchedule = (source = 'duration') => {
        const fallbackStartDate = coerceToBusinessDay(startDateInput.value) || currentStartDate;
        let nextStartDate = new Date(fallbackStartDate.getTime());
        let nextDurationDays = Math.max(1, Math.round(Number(durationDaysInput.value) || initialDurationDays));
        let nextEndDate = coerceToBusinessDay(endDateInput.value) || addBusinessDays(nextStartDate, Math.max(0, nextDurationDays - 1));

        if (source === 'end') {
            if (nextEndDate < nextStartDate) {
                nextEndDate = new Date(nextStartDate.getTime());
            }
            nextDurationDays = getInclusiveBusinessDaysBetween(nextStartDate, nextEndDate);
            durationDaysInput.value = String(nextDurationDays);
        } else {
            nextEndDate = addBusinessDays(nextStartDate, Math.max(0, nextDurationDays - 1));
            endDateInput.value = formatDateForInput(nextEndDate);
        }

        startDateInput.value = formatDateForInput(nextStartDate);
        currentStartSummary.textContent = `Current start: ${formatDateForTable(nextStartDate)}`;
        currentEndSummary.textContent = `Current end: ${formatDateForTable(nextEndDate)}`;
        currentDurationSummary.textContent = `Current duration: ${formatDurationLabel(nextDurationDays, 'days')}`;

        return {
            startWeek: getStartWeekFromDate(nextStartDate, timelineProjectStartDate),
            value: nextDurationDays,
            unit: 'days'
        };
    };

    const syncSchedule = (source = 'duration') => {
        const nextSchedule = readCurrentSchedule(source);
        resetButton.disabled = false;
        onSaveDuration?.(row.id, nextSchedule, { refreshDetail: false });
    };

    startDateInput.addEventListener('change', () => syncSchedule('start'));
    endDateInput.addEventListener('change', () => syncSchedule('end'));
    durationDaysInput.addEventListener('change', () => syncSchedule('duration'));
    durationDaysInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            syncSchedule('duration');
        }
    });

    const actions = createElement('div', 'gantt-duration-actions');
    const resetButton = createElement('button', 'app-button');
    resetButton.type = 'button';
    resetButton.textContent = 'Reset custom schedule';
    resetButton.disabled = !row.hasDirectScheduleOverride;
    resetButton.addEventListener('click', () => onResetDuration?.(row.id));
    actions.appendChild(resetButton);
    section.appendChild(actions);
    return section;
}

function formatDetailDependencyLabel(row = {}, allRowsById = new Map()) {
    const dependencyIds = Array.isArray(row?.dependencies) ? row.dependencies : [];
    if (!dependencyIds.length) return 'None';
    return dependencyIds.map((dependencyId) => {
        const dependencyRow = allRowsById.get(dependencyId);
        if (!dependencyRow) return String(dependencyId);
        return [dependencyRow.number, dependencyRow.step].filter(Boolean).join(' ');
    }).join(', ');
}

function buildDetailFieldEntries(row = {}, allRowsById = new Map()) {
    const baseEntries = new Map([
        ['Solution', row.detailFields?.Solution || row.solutionName || 'Shared onboarding plan'],
        ['Task type', row.detailFields?.['Task type'] || row.taskType || 'Task'],
        ['Owner', row.detailFields?.Owner || row.owner || '—'],
        ['Status', row.status || row.detailFields?.Status || 'Not Started'],
        ['Phase', row.phase || row.detailFields?.Phase || '—'],
        ['Priority', row.impact || row.detailFields?.Priority || '—'],
        ['Start week', row.startWeek],
        ['Start date', row.detailFields?.['Start date'] || row.startDateLabel || '—'],
        ['Due date', row.detailFields?.['Due date'] || row.dueDateLabel || '—'],
        ['Duration', row.detailFields?.Duration || row.durationLabel || '—'],
        ['Milestone', row.detailFields?.Milestone || row.milestone || '—'],
        ['Connector type', row.detailFields?.['Connector type'] || '—'],
        ['Difficulty', row.detailFields?.Difficulty || '—'],
        ['Dependencies', formatDetailDependencyLabel(row, allRowsById)],
        ['Required permissions', row.detailFields?.['Required permissions'] || 'None'],
        ['Parent task', row.detailFields?.['Parent task'] || (row.parentId ? (allRowsById.get(row.parentId)?.step || row.parentId) : '—')],
        ['Effort (hours)', row.detailFields?.['Effort (hours)'] ?? row.effortHours ?? '—'],
        ['Optional', row.detailFields?.Optional || 'No']
    ]);

    Object.entries(row.detailFields || {}).forEach(([field, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (!baseEntries.has(field)) {
            baseEntries.set(field, value);
        }
    });

    return DETAIL_FIELDS.concat(DETAIL_EXTRA_FIELDS)
        .concat([...baseEntries.keys()].filter((field) => !DETAIL_FIELDS.includes(field) && !DETAIL_EXTRA_FIELDS.includes(field)))
        .filter((field, index, array) => array.indexOf(field) === index)
        .map((field) => [field, baseEntries.get(field)])
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([field, value]) => ({
            field,
            value: field === 'Start week'
                ? `Week ${formatWeekOffset(value)}`
                : String(value)
        }));
}

function getDetailChildRows(row = {}, allRowsById = new Map()) {
    return [...allRowsById.values()]
        .filter((candidate) => {
            if (!candidate?.id || candidate.id === row.id) return false;
            if (candidate.parentId === row.id) return true;
            if (row.isSolutionGroup) {
                return candidate.solutionGroupId === row.id && !candidate.parentId;
            }
            return false;
        })
        .sort((left, right) => {
            const startDelta = (left.startWeek || 0) - (right.startWeek || 0);
            if (startDelta !== 0) return startDelta;
            return String(left.number || '').localeCompare(String(right.number || ''))
                || String(left.step || '').localeCompare(String(right.step || ''));
        });
}

function createSizingEditor(row, { onSaveSizing } = {}) {
    const profile = row?.capacityProfile;
    if (!row?.isSolutionGroup || !profile?.requiresSizing) {
        return null;
    }

    const section = document.createElement('details');
    section.className = 'gantt-detail-collapsible gantt-detail-sizing';
    section.open = !profile.hasSavedSizing;

    const summary = createElement('summary', 'gantt-detail-collapsible__summary');
    summary.append(
        createText('span', 'Sizing', 'gantt-detail-collapsible__title'),
        createText(
            'span',
            profile.hasSavedSizing ? (profile.criblIngestion ? 'Cribl Stream' : (profile.result?.badge || profile.summary)) : 'Sizing needed',
            profile.isDefault
                ? 'gantt-detail-collapsible__badge is-estimate'
                : 'gantt-detail-collapsible__badge'
        )
    );
    section.appendChild(summary);

    const body = createElement('div', 'gantt-detail-collapsible__body');
    const intro = createText(
        'p',
        profile.type === 'windows'
            ? profile.populationKind === 'wec'
                ? 'Windows Forwarded Events always uses a dedicated WEC server pool.'
                : 'Update the Windows server pool here to refresh related plan rows immediately.'
            : 'Per-site firewall sizing. Update EPS here to refresh VM recommendations and task text.',
        'gantt-detail-sizing__intro'
    );
    body.appendChild(intro);

    const note = createText('p', '', 'gantt-detail-sizing__note');
    body.appendChild(note);

    const relationOptions = profile.type === 'windows' && profile.hasRelationChoice
        ? profile.availableSharedPools || []
        : [];
    const draft = profile.values
        ? { ...profile.values }
        : createDefaultSizingDraft(profile.type, { measuredEps: window.discoveredInfrastructure?.summary?.totalEPS });
    let activeRelationMode = profile.hasRelationChoice
        ? (profile.relation === 'additional' ? 'additional' : 'same')
        : profile.relation || 'standalone';
    let selectedSharedPoolId = profile.selectedSharedPoolId || relationOptions[0]?.poolId || '';
    const sharedPoolDrafts = new Map(relationOptions.map((option) => [option.poolId, { ...option.values }]));
    if (profile.poolId && activeRelationMode === 'same' && draft && Object.keys(draft).length > 0) {
        sharedPoolDrafts.set(profile.poolId, { ...draft });
    }
    let additionalDraft = profile.additionalPoolDraft?.values
        ? { ...profile.additionalPoolDraft.values }
        : { ...draft };

    const grid = createElement('div', 'gantt-detail-sizing__grid');
    const messages = createElement('div', 'gantt-detail-sizing__messages');
    const preview = createElement('div', 'gantt-detail-sizing__preview');
    const docLink = document.createElement('a');
    docLink.className = 'gantt-detail-sizing__doc-link';
    docLink.target = '_blank';
    docLink.rel = 'noopener noreferrer';

    const fieldRefs = {};
    const buildField = (labelText, input, helperText = '') => {
        const field = createElement('label', 'gantt-detail-sizing__field');
        field.appendChild(createText('span', labelText, 'gantt-detail-label'));
        field.appendChild(input);
        const helper = createText('span', helperText, 'gantt-detail-sizing__helper');
        field.appendChild(helper);
        return { field, helper };
    };

    const collectDraft = () => profile.type === 'windows'
        ? {
            servers: fieldRefs.servers?.value,
            onPremPercent: fieldRefs.onPremPercent?.value,
            isDefault: false
        }
        : {
            eps: fieldRefs.eps?.value,
            isDefault: false
        };

    const writeDraftToFields = (nextDraft = {}) => {
        if (profile.type === 'windows') {
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
        if (profile.type !== 'windows') {
            note.textContent = 'This sizing is specific to this firewall connector instance.';
            return;
        }
        if (profile.populationKind === 'wec') {
            note.textContent = 'WEC sizing never merges with Windows AMA host counts.';
            return;
        }
        if (!profile.hasRelationChoice) {
            note.textContent = 'Only one AMA connector is selected, so this connector owns its current server pool.';
            return;
        }
        if (activeRelationMode === 'same') {
            const sharedOption = getSelectedSharedOption();
            const memberNames = sharedOption?.memberNames || profile.sharedWithNames || [];
            note.textContent = memberNames.length > 0
                ? `This connector shares the same AMA server pool as ${memberNames.join(', ')}.`
                : 'This connector will reuse an existing AMA server pool.';
            return;
        }
        note.textContent = 'This connector uses an additional AMA server pool. Switching back later keeps this separate draft available.';
    };

    let renderMessages = () => ({ isValid: false, result: null, fieldErrors: {}, warnings: [], advisories: [] });

    if (profile.type === 'windows') {
        if (profile.hasRelationChoice) {
            const relationFieldset = document.createElement('fieldset');
            relationFieldset.className = 'gantt-detail-sizing__relation';
            const legend = createText('legend', relationOptions.length > 1 ? 'AMA server relationship' : 'Server relationship', 'gantt-detail-label');
            relationFieldset.appendChild(legend);

            const relationChoices = createElement('div', 'gantt-detail-sizing__relation-choices');
            const sameLabelText = relationOptions.length > 1 ? 'Use existing AMA pool' : 'Same servers';
            const additionalLabelText = 'Additional servers';

            const createRelationChoice = (value, title, description) => {
                const label = createElement('label', 'gantt-detail-sizing__relation-option');
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `gantt-sizing-relation-${row.id}`;
                input.value = value;
                input.checked = activeRelationMode === value;
                const copy = createElement('span', 'gantt-detail-sizing__relation-copy');
                copy.append(
                    createText('strong', title),
                    createText('small', description)
                );
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
                sharedPoolSelect = createElement('select', 'gantt-detail-text-input gantt-detail-sizing__select');
                relationOptions.forEach((option) => {
                    const optionNode = document.createElement('option');
                    optionNode.value = option.poolId;
                    optionNode.textContent = option.label;
                    sharedPoolSelect.appendChild(optionNode);
                });
                sharedPoolSelect.value = selectedSharedPoolId;
                const sharedPoolFieldParts = buildField('Which AMA pool?', sharedPoolSelect, 'Choose the existing host pool this connector should share.');
                sharedPoolField = sharedPoolFieldParts.field;
                sharedPoolField.classList.add('gantt-detail-sizing__field--wide');
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
                    writeDraftToFields(sharedPoolDrafts.get(selectedSharedPoolId) || sharedOption?.values || draft);
                } else {
                    writeDraftToFields(additionalDraft || draft);
                }
                if (sharedPoolField instanceof HTMLElement) {
                    sharedPoolField.hidden = activeRelationMode !== 'same';
                }
                if (sharedPoolSelect instanceof HTMLSelectElement) {
                    sharedPoolSelect.value = selectedSharedPoolId;
                }
                updateNoteText();
                renderMessages(collectDraft());
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
                    writeDraftToFields(sharedPoolDrafts.get(selectedSharedPoolId) || sharedOption?.values || draft);
                    updateNoteText();
                    renderMessages(collectDraft());
                });
                sharedPoolField.hidden = activeRelationMode !== 'same';
            }

            body.appendChild(relationFieldset);
        }

        const serversInput = createElement('input', 'gantt-detail-text-input gantt-detail-sizing__input');
        serversInput.type = 'number';
        serversInput.min = '0';
        serversInput.step = '1';
        serversInput.inputMode = 'numeric';
        serversInput.value = String(draft.servers ?? '');
        const splitInput = createElement('input', 'gantt-detail-text-input gantt-detail-sizing__input');
        splitInput.type = 'number';
        splitInput.min = '0';
        splitInput.max = '100';
        splitInput.step = '1';
        splitInput.inputMode = 'numeric';
        splitInput.value = String(draft.onPremPercent ?? '');
        const serversField = buildField(profile.serverCountLabel || 'How many Windows servers?', serversInput);
        const splitField = buildField('What split — on-prem vs. Azure?', splitInput, `Azure: ${Math.max(0, 100 - (Number(draft.onPremPercent) || 0))}%`);
        fieldRefs.servers = serversInput;
        fieldRefs.onPremPercent = splitInput;
        fieldRefs.onPremHelper = splitField.helper;
        grid.append(serversField.field, splitField.field);
    } else {
        const epsInput = createElement('input', 'gantt-detail-text-input gantt-detail-sizing__input');
        epsInput.type = 'number';
        epsInput.min = '0';
        epsInput.step = '100';
        epsInput.inputMode = 'numeric';
        epsInput.value = String(draft.eps ?? '');
        const epsField = buildField('What is the expected EPS for this firewall?', epsInput, 'Per site / connector instance');
        fieldRefs.eps = epsInput;
        grid.appendChild(epsField.field);

        const measuredEpsValue = window.discoveredInfrastructure?.summary?.totalEPS;
        if (typeof measuredEpsValue === 'number' && measuredEpsValue > 0) {
            const epsNote = createText('p', '📊 Based on workspace measurement (24h avg)', 'gantt-detail-sizing__measurement-note');
            grid.appendChild(epsNote);
        }
    }

    body.append(grid, messages, preview, docLink);

    const actions = createElement('div', 'gantt-detail-editor-actions');
    const saveButton = createElement('button', 'app-button app-button--accent gantt-detail-action-button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save sizing';
    const defaultsButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
    defaultsButton.type = 'button';
    defaultsButton.textContent = "I don't know — use defaults";
    actions.append(saveButton, defaultsButton);
    body.appendChild(actions);
    section.appendChild(body);

    let debounceHandle = 0;
    renderMessages = (nextDraft) => {
        const sizingMessages = getSizingResultMessages(profile.type, nextDraft, { populationKind: profile.populationKind });
        messages.replaceChildren();
        preview.replaceChildren();

        Object.entries(fieldRefs).forEach(([fieldKey, field]) => {
            if (!(field instanceof HTMLInputElement)) return;
            const isFieldValid = !sizingMessages.fieldErrors[fieldKey];
            field.classList.toggle('is-invalid', !isFieldValid);
            field.setAttribute('aria-invalid', isFieldValid ? 'false' : 'true');
        });

        if (fieldRefs.onPremHelper) {
            const onPremPercent = Number(nextDraft.onPremPercent) || 0;
            fieldRefs.onPremHelper.textContent = `Azure: ${Math.max(0, 100 - onPremPercent)}%`;
        }

        if (Object.keys(sizingMessages.fieldErrors).length > 0) {
            Object.values(sizingMessages.fieldErrors).forEach((message) => {
                messages.appendChild(createText('p', message, 'gantt-detail-sizing__message is-error'));
            });
            docLink.hidden = true;
            return sizingMessages;
        }

        sizingMessages.warnings.forEach((message) => {
            messages.appendChild(createText('p', message, 'gantt-detail-sizing__message is-warning'));
        });
        sizingMessages.advisories.forEach((message) => {
            messages.appendChild(createText('p', message, 'gantt-detail-sizing__message is-advisory'));
        });

        const detailLines = getSizingDetailLines({ ...profile, result: sizingMessages.result });
        detailLines.forEach((line, index) => {
            preview.appendChild(createText(index === 0 ? 'strong' : 'p', line, index === 0 ? 'gantt-detail-sizing__result' : 'gantt-detail-sizing__line'));
        });

        docLink.href = sizingMessages.result?.docUrl || '#';
        docLink.textContent = sizingMessages.result?.docLabel || 'Sizing guidance';
        docLink.hidden = !sizingMessages.result?.docUrl;
        return sizingMessages;
    };

    const schedulePreviewRefresh = () => {
        window.clearTimeout(debounceHandle);
        debounceHandle = window.setTimeout(() => {
            renderMessages(collectDraft());
        }, 300);
    };

    const submitDraft = (nextDraft) => {
        const sizingMessages = renderMessages(nextDraft);
        if (!sizingMessages.isValid || !sizingMessages.result) {
            return;
        }
        onSaveSizing?.(row, profile.type, nextDraft, {
            relation: profile.hasRelationChoice
                ? (activeRelationMode === 'additional' ? 'additional' : 'same')
                : profile.relation,
            targetPoolId: profile.hasRelationChoice && activeRelationMode === 'same'
                ? selectedSharedPoolId
                : ''
        });
    };

    Object.values(fieldRefs).forEach((field) => {
        if (!(field instanceof HTMLInputElement)) return;
        field.addEventListener('input', schedulePreviewRefresh);
        field.addEventListener('change', schedulePreviewRefresh);
        field.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitDraft(collectDraft());
            }
        });
    });

    saveButton.addEventListener('click', () => submitDraft(collectDraft()));
    defaultsButton.addEventListener('click', () => {
        const defaultDraft = createDefaultSizingDraft(profile.type, { measuredEps: window.discoveredInfrastructure?.summary?.totalEPS });
        writeDraftToFields(defaultDraft);
        submitDraft(defaultDraft);
    });

    updateNoteText();
    renderMessages(draft);
    return section;
}

function renderDetailPanel(
    target,
    row,
    {
        allRowsById = new Map(),
        projectStartDate,
        onClose,
        onSaveDuration,
        onResetDuration,
        onSaveField,
        onSaveSizing,
        onAddTopLevelTask,
        onAddSubtask,
        onDeleteTask,
        onSkipTask
    } = {}
) {
    target.replaceChildren();

    const card = createElement('aside', 'gantt-detail-card');
    const closeButton = createElement('button', 'gantt-detail-close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close task details');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', onClose);

    const meta = createElement('div', 'gantt-detail-meta');
    meta.append(
        createText('span', row.phase, 'gantt-detail-pill'),
        createText('span', row.status.replace(/-/g, ' '), 'gantt-detail-pill gantt-detail-pill--status')
    );

    const customDurationLabel = getCustomDurationBadgeLabel(row);
    meta.appendChild(createText(
        'span',
        customDurationLabel || 'Default',
        customDurationLabel
            ? 'gantt-detail-pill gantt-detail-pill--custom'
            : 'gantt-detail-pill gantt-detail-pill--default'
    ));
    if (row.capacityProfile?.hasSavedSizing) {
        const badgeText = row.capacityProfile.criblIngestion
            ? 'Cribl Stream'
            : (row.capacityProfile.result?.badge || row.capacityProfile.summary);
        meta.appendChild(createText(
            'span',
            badgeText,
            row.capacityProfile.isDefault
                ? 'gantt-detail-pill gantt-detail-pill--default gantt-detail-pill--italic'
                : 'gantt-detail-pill'
        ));
    }

    const header = createElement('div', 'gantt-detail-header');
    header.append(
        meta,
        createText('h3', row.isSolutionGroup ? getRowPrimaryLabel(row) : (row.step || ''), 'gantt-detail-title'),
        createText('p', [row.goal, row.description || row.task].filter(Boolean).join(' — '), 'gantt-detail-description')
    );

    const detailFieldEntries = buildDetailFieldEntries(row, allRowsById);
    const fieldGrid = createElement('div', 'gantt-detail-fields');
    detailFieldEntries.forEach(({ field, value }) => {
        const fieldCard = createElement(
            'div',
            ['Milestone', 'Required permissions', 'Dependencies'].includes(field)
                ? 'gantt-detail-field gantt-detail-field--wide'
                : 'gantt-detail-field'
        );
        fieldCard.append(
            createText('span', field, 'gantt-detail-label'),
            createText('span', String(value), 'gantt-detail-value')
        );
        fieldGrid.appendChild(fieldCard);
    });

    const actionBar = createElement('div', 'gantt-detail-actions');
    if (row.solutionId) {
        const addTaskButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
        addTaskButton.type = 'button';
        addTaskButton.textContent = '+ Add task';
        addTaskButton.addEventListener('click', () => onAddTopLevelTask?.(row.id));
        actionBar.appendChild(addTaskButton);
    }
    if (row.isSummary && row.solutionId) {
        const addSubtaskButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
        addSubtaskButton.type = 'button';
        addSubtaskButton.textContent = '+ Add subtask';
        addSubtaskButton.addEventListener('click', () => onAddSubtask?.(row.id));
        actionBar.appendChild(addSubtaskButton);
    }
    if (row.isUserAdded) {
        const deleteButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button gantt-detail-action-button--danger');
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete task';
        deleteButton.addEventListener('click', () => onDeleteTask?.(row.id));
        actionBar.appendChild(deleteButton);
    } else if (row.solutionId) {
        const skipButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
        skipButton.type = 'button';
        skipButton.textContent = row.status === 'Skipped' ? 'Skipped' : 'Mark skipped';
        skipButton.disabled = row.status === 'Skipped';
        skipButton.addEventListener('click', () => onSkipTask?.(row.id));
        actionBar.appendChild(skipButton);
    }

    const isTaskFieldEditingEnabled = !row.isSolutionGroup;
    const dependencyOptions = [...allRowsById.values()]
        .filter((candidate) => candidate?.id && candidate.id !== row.id && !candidate.isSolutionGroup)
        .sort((left, right) => {
            const startDelta = (left.startWeek || 0) - (right.startWeek || 0);
            if (startDelta !== 0) return startDelta;
            return String(left.number || '').localeCompare(String(right.number || ''))
                || String(left.step || '').localeCompare(String(right.step || ''));
        });
    const selectedDependencyIds = new Set(Array.isArray(row.dependencies) ? row.dependencies : []);
    const childRows = getDetailChildRows(row, allRowsById);

    const fieldEditor = createElement('section', 'gantt-detail-editor gantt-detail-editor--form');
    fieldEditor.appendChild(createText('h4', isTaskFieldEditingEnabled ? 'Edit task' : 'Edit details', 'gantt-detail-extra-title'));

    const formGrid = createElement('div', 'gantt-detail-form-grid');

    const nameGroup = createElement('label', 'gantt-detail-form-field gantt-detail-form-field--wide');
    nameGroup.appendChild(createText('span', 'Name', 'gantt-detail-label'));
    const nameField = createElement('input', 'gantt-detail-text-input');
    nameField.type = 'text';
    nameField.maxLength = '120';
    nameField.value = row.step || '';
    nameField.placeholder = 'Task name';
    nameField.setAttribute('aria-label', `Task name for ${row.step}`);
    nameGroup.appendChild(nameField);
    formGrid.appendChild(nameGroup);

    const ownerGroup = createElement('label', 'gantt-detail-form-field');
    ownerGroup.appendChild(createText('span', 'Assigned to', 'gantt-detail-label'));
    const ownerField = createElement('input', 'gantt-detail-text-input');
    ownerField.type = 'text';
    ownerField.value = normalizeOwnerLabel(row.owner, { allowEmpty: true, preserveCustom: true });
    ownerField.placeholder = 'Assigned owner';
    ownerField.disabled = !isTaskFieldEditingEnabled;
    ownerField.setAttribute('aria-label', `Assigned owner for ${row.step}`);
    const ownerListId = `gantt-detail-owner-options-${String(row.id || 'task').replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    ownerField.setAttribute('list', ownerListId);
    ownerGroup.appendChild(ownerField);
    const ownerDatalist = document.createElement('datalist');
    ownerDatalist.id = ownerListId;
    OWNER_OPTIONS.forEach((ownerOption) => {
        const option = document.createElement('option');
        option.value = ownerOption;
        ownerDatalist.appendChild(option);
    });
    ownerGroup.appendChild(ownerDatalist);
    formGrid.appendChild(ownerGroup);

    const statusGroup = createElement('label', 'gantt-detail-form-field');
    statusGroup.appendChild(createText('span', 'Status', 'gantt-detail-label'));
    const statusField = createElement('select', 'gantt-detail-text-input gantt-detail-select');
    statusField.disabled = !isTaskFieldEditingEnabled;
    statusField.setAttribute('aria-label', `Status for ${row.step}`);
    STATUS_OPTIONS.forEach((statusOption) => {
        const option = document.createElement('option');
        option.value = statusOption;
        option.textContent = statusOption;
        option.selected = normalizeStatusLabel(row.status) === statusOption;
        statusField.appendChild(option);
    });
    statusGroup.appendChild(statusField);
    formGrid.appendChild(statusGroup);

    const syncSidebarFieldChange = (nextFields = {}) => {
        onSaveField?.(row.id, nextFields, { refreshDetail: false });
    };
    ownerField.addEventListener('change', () => syncSidebarFieldChange({ owner: ownerField.value }));
    statusField.addEventListener('change', () => syncSidebarFieldChange({ status: statusField.value }));

    const dependencyGroup = createElement('div', 'gantt-detail-form-field gantt-detail-form-field--wide');
    dependencyGroup.appendChild(createText('span', 'Dependencies', 'gantt-detail-label'));
    const dependencyHint = createText(
        'p',
        isTaskFieldEditingEnabled
            ? (dependencyOptions.length > 0
                ? 'Select predecessor tasks. Update dates separately if you want to move the schedule.'
                : 'No other task rows are available to use as dependencies yet.')
            : 'Dependencies can be edited on task rows.',
        'gantt-detail-input-hint'
    );
    dependencyGroup.appendChild(dependencyHint);
    const dependencyList = createElement('div', 'gantt-detail-checkbox-list');
    if (dependencyOptions.length > 0) {
        dependencyOptions.forEach((dependencyRow) => {
            const dependencyLabel = createElement('label', 'gantt-detail-checkbox');
            const dependencyInput = document.createElement('input');
            dependencyInput.type = 'checkbox';
            dependencyInput.value = dependencyRow.id;
            dependencyInput.checked = selectedDependencyIds.has(dependencyRow.id);
            dependencyInput.disabled = !isTaskFieldEditingEnabled;
            dependencyInput.setAttribute('aria-label', `Dependency ${dependencyRow.step}`);
            dependencyLabel.append(
                dependencyInput,
                createText('span', [dependencyRow.number, dependencyRow.step].filter(Boolean).join(' '), 'gantt-detail-checkbox-label')
            );
            dependencyList.appendChild(dependencyLabel);
        });
    }
    dependencyGroup.appendChild(dependencyList);
    formGrid.appendChild(dependencyGroup);

    const descriptionGroup = createElement('label', 'gantt-detail-form-field gantt-detail-form-field--wide');
    descriptionGroup.appendChild(createText('span', 'Description', 'gantt-detail-label'));
    const descriptionField = createElement('textarea', 'gantt-detail-textarea');
    descriptionField.rows = 5;
    descriptionField.placeholder = 'Add implementation notes, context, or customer-specific details.';
    descriptionField.value = row.description || '';
    descriptionField.setAttribute('aria-label', `Description for ${row.step}`);
    descriptionGroup.appendChild(descriptionField);
    formGrid.appendChild(descriptionGroup);

    fieldEditor.appendChild(formGrid);

    const collectFieldPayload = ({ resetToDefaults = false } = {}) => {
        const payload = {
            step: resetToDefaults ? (row.defaultStep || row.step || '') : nameField.value,
            description: resetToDefaults ? (row.defaultDescription || '') : descriptionField.value
        };

        if (isTaskFieldEditingEnabled) {
            payload.owner = resetToDefaults
                ? normalizeOwnerLabel(row.defaultOwner, { allowEmpty: true, preserveCustom: true })
                : ownerField.value;
            payload.status = resetToDefaults
                ? normalizeStatusLabel(row.defaultStatus || 'Not Started')
                : statusField.value;
            payload.dependencies = resetToDefaults
                ? [...(Array.isArray(row.defaultDependencies) ? row.defaultDependencies : [])]
                : [...dependencyList.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
        }

        return payload;
    };

    const fieldActions = createElement('div', 'gantt-detail-editor-actions');
    const saveFieldButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
    saveFieldButton.type = 'button';
    saveFieldButton.textContent = 'Save changes';
    saveFieldButton.addEventListener('click', () => onSaveField?.(row.id, collectFieldPayload()));
    const resetFieldButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
    resetFieldButton.type = 'button';
    resetFieldButton.textContent = 'Reset fields';
    resetFieldButton.addEventListener('click', () => {
        nameField.value = row.defaultStep || row.step || '';
        descriptionField.value = row.defaultDescription || '';
        if (isTaskFieldEditingEnabled) {
            ownerField.value = normalizeOwnerLabel(row.defaultOwner, { allowEmpty: true, preserveCustom: true });
            statusField.value = normalizeStatusLabel(row.defaultStatus || 'Not Started');
            const defaultDependencyIds = new Set(Array.isArray(row.defaultDependencies) ? row.defaultDependencies : []);
            dependencyList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
                input.checked = defaultDependencyIds.has(input.value);
            });
        }
        onSaveField?.(row.id, collectFieldPayload({ resetToDefaults: true }));
    });
    fieldActions.append(saveFieldButton, resetFieldButton);
    fieldEditor.appendChild(fieldActions);

    const extra = createElement('div', 'gantt-detail-extra');
    if (row.description || row.task || row.goal || row.docUrl) {
        const instructionsSection = createElement('div', 'gantt-detail-extra-section');
        instructionsSection.appendChild(createText('h4', 'Setup instructions', 'gantt-detail-extra-title'));
        const instructionText = [row.goal, row.description || row.task].filter(Boolean).join(' — ')
            || 'Review the linked Microsoft Sentinel guidance for this onboarding step.';
        const instructionCopy = createText('p', instructionText, 'gantt-detail-extra-copy');
        instructionsSection.appendChild(instructionCopy);
        if (row.docUrl) {
            const docLink = createElement('a', 'gantt-detail-doc-link');
            docLink.href = row.docUrl;
            docLink.target = '_blank';
            docLink.rel = 'noopener noreferrer';
            docLink.textContent = '📄 Documentation';
            instructionsSection.appendChild(docLink);
        }
        extra.appendChild(instructionsSection);
    }
    if (actionBar.childElementCount > 0) {
        extra.appendChild(actionBar);
    }
    if (childRows.length) {
        const childSection = createElement('div', 'gantt-detail-extra-section');
        childSection.appendChild(createText('h4', row.isSolutionGroup ? 'Tasks in this solution' : 'Subtasks', 'gantt-detail-extra-title'));
        const childList = createElement('div', 'gantt-detail-subtask-list');
        childRows.forEach((childRow) => {
            const item = createElement('div', 'gantt-detail-subtask-item');
            item.append(
                createText('strong', [childRow.number, childRow.step].filter(Boolean).join(' '), 'gantt-detail-subtask-title'),
                createText('span', `${childRow.startDateLabel} → ${childRow.dueDateLabel} · ${childRow.status}`, 'gantt-detail-subtask-meta')
            );
            childList.appendChild(item);
        });
        childSection.appendChild(childList);
        extra.appendChild(childSection);
    }
    const sizingEditor = createSizingEditor(row, { onSaveSizing });
    if (sizingEditor) {
        extra.appendChild(sizingEditor);
    }
    extra.appendChild(fieldEditor);
    if (row.requiredRoles?.length) {
        const rolesSection = createElement('div', 'gantt-detail-extra-section');
        const rolesList = createElement('ul', 'gantt-detail-role-list');
        row.requiredRoles.forEach((role) => {
            rolesList.appendChild(createText('li', role, 'gantt-detail-role-item'));
        });
        rolesSection.append(
            createText('h4', 'Required Roles', 'gantt-detail-extra-title'),
            rolesList
        );
        extra.appendChild(rolesSection);
    }
    Object.entries(row.detailFields || {})
        .filter(([field, value]) => value !== undefined && value !== null && value !== '' && !DETAIL_FIELDS.includes(field) && !DETAIL_EXTRA_FIELDS.includes(field))
        .forEach(([field, value]) => {
            const section = createElement('div', 'gantt-detail-extra-section');
            section.append(
                createText('h4', field, 'gantt-detail-extra-title'),
                createText('p', String(value), 'gantt-detail-extra-copy')
            );
            extra.appendChild(section);
        });

    card.append(
        closeButton,
        header,
        fieldGrid,
        ...(row.isSolutionGroup ? [] : [createDurationEditor(row, { projectStartDate, onSaveDuration, onResetDuration })]),
        extra
    );
    target.appendChild(card);
}

function setDetailOverlayState(overlay, isOpen) {
    overlay.hidden = !isOpen;
    overlay.classList.toggle('is-open', isOpen);
    overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function createMobileList(rows, onSelect, { collapsedSummaryIds = new Set(), collapsedSolutionGroupIds = new Set(), onToggleSummary, onToggleSolutionGroup } = {}) {
    const list = createElement('div', 'gantt-mobile-list');
    const setActiveTask = (taskId = '') => {
        list.querySelectorAll('.gantt-mobile-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.taskId === taskId);
        });
    };

    rows.forEach((row) => {
        const classNames = ['gantt-mobile-item'];
        if (row.isSummary) classNames.push('gantt-mobile-item--summary');
        if (row.parentId) classNames.push('gantt-mobile-item--subtask');
        if (row.isCustomSchedule) classNames.push('has-custom-duration');

        const button = createElement('button', classNames.join(' '));
        if (row.isSolutionGroup) {
            applyConnectorAccentSurface(button, row.connectorColor);
        }
        button.type = 'button';
        button.dataset.taskId = row.id;
        if (row.isSummary) {
            button.setAttribute('aria-expanded', collapsedSummaryIds.has(row.id) ? 'false' : 'true');
        }

        const titleRow = createElement('span', 'gantt-mobile-item-title-row');
        if (row.isSolutionGroup) {
            const groupLabel = getRowPrimaryLabel(row);
            const solutionGroupLabel = createElement('span', 'gantt-solution-group-title-inline');
            const label = createText('span', getRowDisplayLabel(row, collapsedSummaryIds, collapsedSolutionGroupIds), 'gantt-mobile-item-title');
            applyConnectorAccentLabel(label, row.connectorColor);
            solutionGroupLabel.appendChild(label);

            const actionButton = createElement('button', 'gantt-solution-group-action-button gantt-solution-group-action-button--mobile');
            actionButton.type = 'button';
            actionButton.textContent = getSolutionGroupActionLabel(collapsedSolutionGroupIds.has(row.id));
            actionButton.title = `${collapsedSolutionGroupIds.has(row.id) ? 'Expand' : 'Collapse'} ${groupLabel}`;
            actionButton.setAttribute('aria-label', `${collapsedSolutionGroupIds.has(row.id) ? 'Expand' : 'Collapse'} ${groupLabel}`);
            actionButton.setAttribute('aria-expanded', collapsedSolutionGroupIds.has(row.id) ? 'false' : 'true');
            if (row.connectorColor) {
                actionButton.style.color = getConnectorTextAccentColor(row.connectorColor);
            }
            bindPrimaryActivation(actionButton, () => {
                setActiveTask('');
                onToggleSolutionGroup?.(row.id);
            });
            solutionGroupLabel.appendChild(actionButton);
            titleRow.appendChild(solutionGroupLabel);
        } else {
            titleRow.appendChild(createText('span', getRowDisplayLabel(row, collapsedSummaryIds, collapsedSolutionGroupIds), 'gantt-mobile-item-title'));
        }
        const capacityBadgeLabel = getRowCapacityBadgeLabel(row);
        if (capacityBadgeLabel) {
            titleRow.appendChild(createText('span', capacityBadgeLabel, getRowCapacityBadgeClassName(row).replace('gantt-table-badge', 'gantt-mobile-custom-badge')));
        }
        const badgeLabel = getCustomDurationBadgeLabel(row);
        if (badgeLabel) {
            titleRow.appendChild(createText('span', badgeLabel, 'gantt-mobile-custom-badge'));
        }

        button.append(
            titleRow,
            createText('span', `${row.status} · ${row.startDateLabel} → ${row.dueDateLabel} · ${row.impact}`, 'gantt-mobile-item-meta')
        );

        button.addEventListener('click', () => {
            if (row.isSummary && typeof onToggleSummary === 'function') {
                setActiveTask('');
                onToggleSummary(row.id);
                return;
            }

            setActiveTask(row.id);
            onSelect(row.id);
        });
        list.appendChild(button);
    });

    return { list, setActiveTask };
}

function createGanttSidebar(
    rows,
    onSelect,
    {
        collapsedSummaryIds = new Set(),
        collapsedSolutionGroupIds = new Set(),
        onToggleSummary,
        onToggleSolutionGroup,
        onHoverTask
    } = {}
) {
    const panel = createElement('section', 'gantt-sidebar-panel');
    const header = createElement('div', 'gantt-sidebar-header');
    header.append(
        createText('div', 'Task', 'gantt-sidebar-cell gantt-sidebar-header-cell gantt-sidebar-header-cell--task'),
        createText('div', 'Status', 'gantt-sidebar-cell gantt-sidebar-header-cell gantt-sidebar-header-cell--status')
    );
    const scroll = createElement('div', 'gantt-sidebar-scroll');
    const surface = createElement('div', 'gantt-sidebar-surface');
    scroll.appendChild(surface);
    panel.append(header, scroll);

    const rowElements = new Map();
    const getEventElementTarget = (event) => {
        if (event?.target instanceof Element) {
            return event.target;
        }
        return event?.target?.parentElement || null;
    };

    const updateLayout = (layoutMetrics = [], chartHeight = 0) => {
        const metricsById = new Map((layoutMetrics || []).map((metric) => [metric.id, metric]));
        const surfaceHeight = Math.max(Number(chartHeight) || 0, rows.length * GANTT_TABLE_ROW_FALLBACK_HEIGHT, 180);
        surface.style.height = `${surfaceHeight}px`;
        surface.replaceChildren();
        rowElements.clear();

        rows.forEach((row, index) => {
            const metric = metricsById.get(row.id);
            const top = Number.isFinite(metric?.top) ? metric.top : index * GANTT_TABLE_ROW_FALLBACK_HEIGHT;
            const height = Math.max(38, Number.isFinite(metric?.height) ? metric.height : GANTT_TABLE_ROW_FALLBACK_HEIGHT);
            const previousRow = rows[index - 1];
            const nextRow = rows[index + 1];
            const isFirstSubtask = Boolean(row.parentId && previousRow?.parentId !== row.parentId);
            const isLastSubtask = Boolean(row.parentId && nextRow?.parentId !== row.parentId);

            const rowElement = createElement('div', 'gantt-sidebar-row');
            if (row.isSummary) rowElement.classList.add('gantt-sidebar-row--summary');
            if (row.isSolutionGroup) rowElement.classList.add('gantt-sidebar-row--solution-group');
            if (row.parentId) {
                rowElement.classList.add('gantt-sidebar-row--subtask');
                rowElement.dataset.parentId = row.parentId;
                if (isFirstSubtask) rowElement.classList.add('gantt-sidebar-row--subtask-first');
                if (isLastSubtask) rowElement.classList.add('gantt-sidebar-row--subtask-last');
            }
            if ((row.isSummary && collapsedSummaryIds.has(row.id)) || (row.isSolutionGroup && collapsedSolutionGroupIds.has(row.id))) {
                rowElement.classList.add('is-collapsed');
            }
            if (row.isSolutionGroup) {
                applyConnectorAccentSurface(rowElement, row.connectorColor);
            }
            rowElement.dataset.taskId = row.id;
            rowElement.style.top = `${top}px`;
            rowElement.style.height = `${height}px`;
            rowElement.tabIndex = 0;
            rowElement.setAttribute('role', 'button');
            rowElement.setAttribute('aria-label', `Open details for ${row.isSolutionGroup ? getRowPrimaryLabel(row) : row.step}`);

            const taskCell = createElement('div', 'gantt-sidebar-cell gantt-sidebar-cell--task');
            const titleRow = createElement('div', 'gantt-sidebar-title-row');
            if (row.isSolutionGroup) {
                const toggle = createElement('button', 'gantt-sidebar-toggle gantt-sidebar-toggle--group');
                toggle.type = 'button';
                toggle.textContent = collapsedSolutionGroupIds.has(row.id) ? SOLUTION_GROUP_COLLAPSED_PREFIX : SOLUTION_GROUP_EXPANDED_PREFIX;
                toggle.setAttribute('aria-label', `${collapsedSolutionGroupIds.has(row.id) ? 'Expand' : 'Collapse'} ${getRowPrimaryLabel(row)}`);
                if (row.connectorColor) {
                    toggle.style.color = getConnectorTextAccentColor(row.connectorColor);
                }
                bindPrimaryActivation(toggle, () => onToggleSolutionGroup?.(row.id));
                titleRow.appendChild(toggle);
            } else if (row.isSummary) {
                const toggle = createElement('button', 'gantt-sidebar-toggle');
                toggle.type = 'button';
                toggle.textContent = collapsedSummaryIds.has(row.id) ? SUMMARY_COLLAPSED_PREFIX : SUMMARY_EXPANDED_PREFIX;
                toggle.setAttribute('aria-label', `${collapsedSummaryIds.has(row.id) ? 'Expand' : 'Collapse'} ${row.step}`);
                bindPrimaryActivation(toggle, () => onToggleSummary?.(row.id));
                titleRow.appendChild(toggle);
            } else {
                titleRow.appendChild(createElement('span', 'gantt-sidebar-toggle-spacer'));
            }

            const titleStack = createElement('div', 'gantt-sidebar-title-stack');
            const sidebarNumber = createText('span', row.number, 'gantt-sidebar-row-number');
            const sidebarLabel = createText('span', row.isSolutionGroup ? (row.solutionName || row.step) : row.step, 'gantt-sidebar-task-label');
            if (row.isSolutionGroup) {
                applyConnectorAccentLabel(sidebarLabel, row.connectorColor);
            }
            titleStack.append(sidebarNumber, sidebarLabel);
            titleRow.appendChild(titleStack);
            taskCell.appendChild(titleRow);

            const statusCell = createElement('div', 'gantt-sidebar-cell gantt-sidebar-cell--status');
            statusCell.appendChild(createStatusIndicator(row.status));

            rowElement.append(taskCell, statusCell);

            const activateRow = (event) => {
                const targetElement = getEventElementTarget(event);
                if (targetElement?.closest?.('.gantt-sidebar-toggle')) {
                    return;
                }
                onSelect?.(row.id);
            };

            rowElement.addEventListener('click', activateRow);
            rowElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activateRow(event);
                }
            });
            rowElement.addEventListener('mouseenter', () => onHoverTask?.(row.id, true));
            rowElement.addEventListener('mouseleave', () => onHoverTask?.(row.id, false));
            rowElement.addEventListener('focus', () => onHoverTask?.(row.id, true));
            rowElement.addEventListener('blur', () => onHoverTask?.(row.id, false));

            rowElements.set(row.id, rowElement);
            surface.appendChild(rowElement);
        });
    };

    updateLayout();

    return {
        panel,
        scroll,
        updateLayout,
        setActiveTask(taskId = '') {
            rowElements.forEach((rowElement, rowId) => {
                rowElement.classList.toggle('is-active', rowId === taskId);
            });
        },
        setHoveredTask(taskId = '', isHovered = false) {
            const rowElement = rowElements.get(taskId);
            if (rowElement) {
                rowElement.classList.toggle('is-hovered', Boolean(isHovered));
            }
        }
    };
}

function createTabButton(id, label, isActive) {
    const button = createElement('button', 'planner-tab-button');
    button.id = `${id}-tab`;
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', id);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) button.classList.add('active');
    button.textContent = label;
    return button;
}

function createTabPanel(id, isActive) {
    const panel = createElement('section', 'planner-tab-panel');
    panel.id = id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${id}-tab`);
    panel.hidden = !isActive;
    if (isActive) panel.classList.add('active');
    return panel;
}

function renderPlannerWorkspace(container, solutions = [], toolbarRefs = {}) {
    let planData = buildGanttPlanData(solutions);
    let taskMap = new Map(planData.rows.map((row) => [row.id, row]));
    currentGanttPlanData = planData;

    const collapsedSummaryIds = new Set();
    const collapsedSolutionGroupIds = new Set(
        planData.rows
            .filter((row) => row.isSolutionGroup && row.isGroupCollapsed)
            .map((row) => row.id)
    );
    const ganttInstanceRef = { current: null, viewMode: GANTT_VIEW_MODES[0].name };
    let activeTaskId = '';
    let activeTab = getStoredPlannerActiveTab();
    const viewsReady = { table: false, gantt: false };
    const viewDirty = { table: true, gantt: true };
    let activeOwnerFilter = '';
    const ownerFilterSelectRefs = [];

    const applyOwnerFilter = (value) => {
        activeOwnerFilter = value;
        ownerFilterSelectRefs.forEach((sel) => {
            if (sel.value !== value) sel.value = value;
        });
        viewDirty.table = true;
        viewDirty.gantt = true;
        renderActiveView();
    };

    const createOwnerFilterControl = () => {
        const field = createElement('label', 'owner-filter-field');
        const label = createText('span', 'Owner', 'gantt-view-mode-label');
        const select = createElement('select', 'owner-filter-select');
        select.setAttribute('aria-label', 'Filter by owner role');
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All roles';
        select.appendChild(allOption);
        OWNER_OPTIONS.forEach((role) => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            select.appendChild(option);
        });
        select.value = activeOwnerFilter;
        ownerFilterSelectRefs.push(select);
        select.addEventListener('change', () => applyOwnerFilter(select.value));
        field.append(label, select);
        return { field, select };
    };

    const tabShell = createElement('div', 'planner-tabs');
    const tabList = createElement('div', 'planner-tab-list');
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Planner views');

    const tableTabButton = createTabButton('planner-table-panel', '📋 Table', activeTab === 'table');
    const ganttTabButton = createTabButton('planner-gantt-panel', '📊 Gantt', activeTab === 'gantt');
    tabList.append(tableTabButton, ganttTabButton);

    const tablePanel = createTabPanel('planner-table-panel', activeTab === 'table');
    const ganttPanel = createTabPanel('planner-gantt-panel', activeTab === 'gantt');

    const tableShell = createElement('div', 'planner-table-shell');
    const tableSummaryHost = createElement('div', 'gantt-summary-host');
    const tableToolbar = createElement('div', 'gantt-toolbar');
    const tableHelper = createText('p', 'Spreadsheet view for quick edits. Click any task row to open the detail panel, edit owners and status inline, or use the toolbar + Add task action to add connector-level work.', 'gantt-toolbar-copy');
    const tableToolbarActions = createElement('div', 'gantt-toolbar-actions');
    const tableOwnerFilter = createOwnerFilterControl();
    tableToolbarActions.appendChild(tableOwnerFilter.field);
    tableToolbar.append(tableHelper, tableToolbarActions);
    const tableHost = createElement('div', 'planner-table-host');
    tableShell.append(tableSummaryHost, tableToolbar, tableHost);
    tablePanel.appendChild(tableShell);

    const ganttShell = createElement('div', 'gantt-planner-shell gantt-planner-shell--timeline');
    const ganttSummaryHost = createElement('div', 'gantt-summary-host');
    const ganttControls = createElement('div', 'gantt-toolbar');
    const ganttToolbarCopy = createText('p', 'Timeline-only view with dependency arrows and headers. Click any bar to open the task detail panel on the right.', 'gantt-toolbar-copy');
    const ganttToolbarActions = createElement('div', 'gantt-toolbar-actions');
    const zoomControls = createViewModeToggles(ganttInstanceRef);
    const ganttOwnerFilter = createOwnerFilterControl();
    const autoFitButton = createElement('button', 'app-button app-button--subtle gantt-toolbar-fit');
    autoFitButton.type = 'button';
    autoFitButton.textContent = 'Auto-fit';
    ganttToolbarActions.append(zoomControls.field, ganttOwnerFilter.field, autoFitButton);
    ganttControls.append(ganttToolbarCopy, ganttToolbarActions);

    const ganttLegendHost = createElement('div', 'gantt-connector-legend-host');
    const ganttBody = createElement('div', 'gantt-layout');
    const sidebarHost = createElement('div', 'gantt-sidebar-column');
    const splitDivider = createElement('div', 'gantt-split-divider');
    const chartColumn = createElement('div', 'gantt-chart-column');
    const chartScroll = createElement('div', 'gantt-chart-scroll');
    const chartHost = createElement('div', 'gantt-chart-host');
    const mobileListHost = createElement('div', 'gantt-mobile-list-host');
    chartScroll.appendChild(chartHost);
    chartColumn.append(chartScroll, mobileListHost);
    ganttBody.append(sidebarHost, splitDivider, chartColumn);
    ganttShell.append(ganttSummaryHost, ganttControls, ganttLegendHost, ganttBody);
    ganttPanel.appendChild(ganttShell);

    const detailOverlay = createElement('div', 'gantt-detail-overlay');
    detailOverlay.hidden = true;
    detailOverlay.setAttribute('aria-hidden', 'true');

    const detailBackdrop = createElement('button', 'gantt-detail-backdrop');
    detailBackdrop.type = 'button';
    detailBackdrop.setAttribute('aria-label', 'Close task details');

    const detailHost = createElement('div', 'gantt-detail-panel');
    detailHost.setAttribute('role', 'dialog');
    detailHost.setAttribute('aria-modal', 'true');
    detailHost.setAttribute('aria-label', 'Task details');
    detailHost.tabIndex = -1;
    detailOverlay.append(detailBackdrop, detailHost);

    tabShell.append(tabList, tablePanel, ganttPanel, detailOverlay);
    container.appendChild(tabShell);

    let tableController = null;
    let sidebarController = null;
    let mobileListController = null;

    const syncCollapsedSolutionGroups = () => {
        collapsedSolutionGroupIds.clear();
        planData.rows
            .filter((row) => row.isSolutionGroup && row.isGroupCollapsed)
            .forEach((row) => collapsedSolutionGroupIds.add(row.id));
    };

    const resolveAddTaskTarget = (preferredTaskId = activeTaskId) => {
        const preferredRow = taskMap.get(preferredTaskId);
        if (preferredRow?.solutionId) {
            return preferredRow;
        }
        return [...taskMap.values()].reverse().find((row) => row.isSolutionGroup && row.solutionId) || null;
    };

    const syncToolbarState = () => {
        const targetRow = resolveAddTaskTarget();
        if (toolbarRefs.addTaskButton) {
            toolbarRefs.addTaskButton.disabled = !targetRow;
            toolbarRefs.addTaskButton.title = targetRow
                ? `Add a top-level task to ${targetRow.solutionName || targetRow.step}`
                : 'Select at least one solution to add a task';
        }
        if (toolbarRefs.resetButton) {
            toolbarRefs.resetButton.disabled = !(planData.customScheduleCount > 0);
        }
        if (toolbarRefs.statusLabel) {
            const customCount = planData.customScheduleCount || 0;
            const persistenceLabel = durationOverridesPersistToStorage ? 'saved in this browser' : 'saved only for this session';
            toolbarRefs.statusLabel.textContent = customCount > 0
                ? `${customCount} custom schedule${customCount === 1 ? '' : 's'} ${persistenceLabel}`
                : 'Using the default onboarding schedule';
        }
    };

    const refreshSummaryHeaders = () => {
        tableSummaryHost.replaceChildren(createSummaryHeader(planData));
        ganttSummaryHost.replaceChildren(createSummaryHeader(planData));
        ganttLegendHost.replaceChildren();
        syncToolbarState();
    };

    const rebuildPlanData = () => {
        planData = buildGanttPlanData(solutions);
        taskMap = new Map(planData.rows.map((row) => [row.id, row]));
        currentGanttPlanData = planData;
        syncCollapsedSolutionGroups();
        syncExportButtonState(Boolean(planData?.rows?.length));
        viewDirty.table = true;
        viewDirty.gantt = true;
        refreshSummaryHeaders();
    };

    const syncActiveTaskState = () => {
        tableController?.setActiveTask(activeTaskId);
        sidebarController?.setActiveTask(activeTaskId);
        mobileListController?.setActiveTask(activeTaskId);
        chartHost.querySelectorAll('.bar-wrapper').forEach((wrapper) => {
            wrapper.classList.toggle('is-active', wrapper.getAttribute('data-id') === activeTaskId);
        });
        syncToolbarState();
    };

    const setHoveredTask = (taskId, isHovered) => {
        if (!taskId) return;
        tableController?.setHoveredTask(taskId, isHovered);
        sidebarController?.setHoveredTask(taskId, isHovered);
        chartHost.querySelectorAll('.bar-wrapper').forEach((wrapper) => {
            if (wrapper.getAttribute('data-id') === taskId) {
                wrapper.classList.toggle('is-hovered', Boolean(isHovered));
            }
        });
    };

    const clearHoveredTasks = () => {
        tableHost.querySelectorAll('.gantt-table-row.is-hovered').forEach((rowElement) => rowElement.classList.remove('is-hovered'));
        sidebarHost.querySelectorAll('.gantt-sidebar-row.is-hovered').forEach((rowElement) => rowElement.classList.remove('is-hovered'));
        chartHost.querySelectorAll('.bar-wrapper.is-hovered').forEach((wrapper) => wrapper.classList.remove('is-hovered'));
    };

    const closeDetail = () => {
        activeTaskId = '';
        syncActiveTaskState();
        setDetailOverlayState(detailOverlay, false);
    };

    const openTaskDetail = (taskId, { focusPanel = true } = {}) => {
        const row = taskMap.get(taskId);
        if (!row) return;
        activeTaskId = taskId;
        syncActiveTaskState();
        renderDetailPanel(detailHost, row, {
            allRowsById: taskMap,
            projectStartDate: planData.projectStartDate,
            onClose: closeDetail,
            onSaveDuration: handleDurationSave,
            onResetDuration: handleDurationReset,
            onSaveField: handleDetailFieldSave,
            onSaveSizing: handleSizingSave,
            onAddTopLevelTask: handleAddTopLevelTask,
            onAddSubtask: handleAddSubtask,
            onDeleteTask: handleDeleteTask,
            onSkipTask: handleSkipTask
        });
        setDetailOverlayState(detailOverlay, true);
        if (focusPanel) {
            detailHost.focus();
        }
    };

    const buildVisiblePlan = () => {
        const visiblePlan = createVisiblePlanData(planData, collapsedSummaryIds, collapsedSolutionGroupIds);
        if (!activeOwnerFilter) return visiblePlan;

        const matchedOwnerRowIds = new Set(
            visiblePlan.rows
                .filter((r) => !r.isSolutionGroup && !r.isSummary && r.owner === activeOwnerFilter)
                .map((r) => r.id)
        );
        const matchedParentIds = new Set(
            visiblePlan.rows
                .filter((r) => matchedOwnerRowIds.has(r.id) && r.parentId)
                .map((r) => r.parentId)
        );
        const matchedGroupIds = new Set(
            visiblePlan.rows
                .filter((r) => matchedOwnerRowIds.has(r.id) || matchedParentIds.has(r.id))
                .map((r) => r.solutionGroupId)
                .filter(Boolean)
        );

        const filteredRows = visiblePlan.rows.filter((r) => {
            if (r.isSolutionGroup) return matchedGroupIds.has(r.id);
            if (r.isSummary) return matchedParentIds.has(r.id);
            return matchedOwnerRowIds.has(r.id);
        });

        const filteredRowIds = new Set(filteredRows.map((r) => r.id));
        const filteredTasks = visiblePlan.tasks.filter((t) => filteredRowIds.has(t.id));
        const filteredMilestones = visiblePlan.milestones.filter((m) => filteredRowIds.has(m.anchorTaskId));

        return { rows: filteredRows, tasks: filteredTasks, milestones: filteredMilestones };
    };

    const renderTableView = ({ focusInlineField } = {}) => {
        const visiblePlan = buildVisiblePlan();
        tableController = createTaskTable(visiblePlan.rows, (taskId) => openTaskDetail(taskId), {
            collapsedSummaryIds,
            collapsedSolutionGroupIds,
            onToggleSummary: toggleSummary,
            onToggleSolutionGroup: toggleSolutionGroup,
            onHoverTask: setHoveredTask,
            onInlineScheduleSave: handleInlineScheduleSave,
            onInlineSolutionGroupStartSave: handleSolutionGroupStartSave,
            onInlineFieldSave: handleInlineFieldSave,
            onAddTopLevelTask: handleAddTopLevelTask,
            onAddSubtask: handleAddSubtask,
            onDeleteTask: handleDeleteTask,
            onMoveTask: handleMoveTask,
            projectStartDate: planData.projectStartDate
        });
        tableHost.replaceChildren(tableController.panel);
        viewDirty.table = false;
        viewsReady.table = true;
        syncActiveTaskState();
        if (focusInlineField?.taskId) {
            window.requestAnimationFrame(() => {
                tableController?.openInlineField(focusInlineField.taskId, focusInlineField.fieldKey || 'name');
            });
        }
    };

    const clearRenderedGanttView = () => {
        chartHost.__ganttObserver?.disconnect?.();
        chartHost.__ganttScrollSyncCleanup?.();
        chartHost.__ganttScrollGestureCleanup?.();
        chartHost.__ganttTaskSelectionCleanup?.();
        sidebarController?.scroll?.__scrollSyncCleanup?.();
        ganttInstanceRef.current = null;
        chartHost.__ganttInstance = null;
        delete chartHost.dataset.timelineHeaderSig;
        chartHost.replaceChildren();
        sidebarController = null;
        sidebarHost.replaceChildren();
        mobileListController = null;
        mobileListHost.replaceChildren();
        viewsReady.gantt = false;
    };

    const renderGanttView = () => {
        const visiblePlan = buildVisiblePlan();
        clearRenderedGanttView();

        sidebarController = createGanttSidebar(visiblePlan.rows, (taskId) => openTaskDetail(taskId), {
            collapsedSummaryIds,
            collapsedSolutionGroupIds,
            onToggleSummary: toggleSummary,
            onToggleSolutionGroup: toggleSolutionGroup,
            onHoverTask: setHoveredTask
        });
        sidebarHost.replaceChildren(sidebarController.panel);
        sidebarController.setActiveTask(activeTaskId);

        mobileListController = createMobileList(visiblePlan.rows, (taskId) => openTaskDetail(taskId), {
            collapsedSummaryIds,
            collapsedSolutionGroupIds,
            onToggleSummary: toggleSummary,
            onToggleSolutionGroup: toggleSolutionGroup
        });
        mobileListHost.replaceChildren(mobileListController.list);
        mobileListController.setActiveTask(activeTaskId);

        zoomControls.select.value = ganttInstanceRef.viewMode || GANTT_VIEW_MODES[0].name;

        if (typeof window.Gantt === 'function') {
            try {
                const visibleRowMap = new Map(visiblePlan.rows.map((row) => [row.id, row]));
                ganttInstanceRef.current = new window.Gantt(chartHost, visiblePlan.tasks, {
                    view_mode: ganttInstanceRef.viewMode || GANTT_VIEW_MODES[0].name,
                    view_modes: GANTT_VIEW_MODES,
                    readonly: true,
                    today_button: false,
                    upper_header_height: 28,
                    lower_header_height: 28,
                    bar_height: 18,
                    padding: 14,
                    language: 'en',
                    // Keep timeline scrolling fully native on touchpads; Frappe's infinite padding adds a wheel listener that re-renders mid-gesture.
                    infinite_padding: false,
                    auto_move_label: false,
                    popup: (ctx) => {
                        if (chartHost.classList.contains('is-scroll-gesturing')) {
                            return false;
                        }

                        const row = visibleRowMap.get(ctx.task.id);
                        if (!row) return false;

                        ctx.set_title(escapeHtml(getRowPrimaryLabel(row)));
                        ctx.set_subtitle(escapeHtml(`${row.phase} · ${row.status}`));
                        ctx.set_details([
                            `Start: ${row.startDateLabel}`,
                            `Due: ${row.dueDateLabel}`,
                            `Duration: ${row.durationLabel}`,
                            `Owner: ${row.owner}`,
                            `Priority: ${row.impact}`
                        ].map((line) => escapeHtml(line)).join('<br/>'));
                    }
                });
                chartHost.__ganttInstance = ganttInstanceRef.current;
                bindGanttScrollGestureState(chartHost, {
                    onScrollStart: clearHoveredTasks
                });
                bindGanttTaskSelection(chartHost, {
                    onSelectTask: (taskId) => openTaskDetail(taskId)
                });
                stabilizeGanttRender(chartHost, visiblePlan.tasks, {
                    milestones: visiblePlan.milestones,
                    collapsedSummaryIds,
                    collapsedSolutionGroupIds,
                    onToggleSummary: toggleSummary,
                    onToggleSolutionGroup: toggleSolutionGroup,
                    onHoverTask: setHoveredTask,
                    onLayoutChange: ({ rowMetrics, svgHeight, scrollTop }) => {
                        sidebarController?.updateLayout(rowMetrics, svgHeight);
                        syncSplitPaneScroll(sidebarController?.scroll, chartHost);
                        if (sidebarController?.scroll) {
                            sidebarController.scroll.scrollTop = scrollTop;
                        }
                        syncActiveTaskState();
                    }
                });
                viewDirty.gantt = false;
                viewsReady.gantt = true;
                syncActiveTaskState();
                return;
            } catch (error) {
                console.error('Failed to initialize Gantt chart:', error);
            }
        }

        mobileListController.list.classList.add('is-fallback-visible');
        chartHost.appendChild(createText('p', 'The Gantt chart could not be rendered. Use the compact plan list below for the same project details.', 'helper-text'));
        viewDirty.gantt = false;
        viewsReady.gantt = true;
    };

    const renderActiveView = ({ focusInlineField } = {}) => {
        const visiblePlan = buildVisiblePlan();
        if (activeTaskId && !visiblePlan.rows.some((row) => row.id === activeTaskId)) {
            activeTaskId = '';
            setDetailOverlayState(detailOverlay, false);
        }

        if (activeTab === 'table') {
            renderTableView({ focusInlineField });
            return;
        }

        renderGanttView();
    };

    const refreshPlannerViewsAfterDataChange = ({ focusInlineField } = {}) => {
        renderTableView({ focusInlineField });
        if (activeTab === 'gantt') {
            renderGanttView();
            return;
        }
        clearRenderedGanttView();
    };

    const ensureViewRendered = (viewName, options = {}) => {
        if (viewName === 'table') {
            if (viewDirty.table || !viewsReady.table || options.force) {
                renderTableView(options);
            }
            return;
        }
        if (viewDirty.gantt || !viewsReady.gantt || options.force) {
            renderGanttView();
        } else {
            window.requestAnimationFrame(() => {
                syncSplitPaneScroll(sidebarController?.scroll, chartHost);
                syncActiveTaskState();
            });
        }
    };

    const activateTab = (target) => {
        activeTab = persistPlannerActiveTab(target);
        [
            [tableTabButton, tablePanel, activeTab === 'table'],
            [ganttTabButton, ganttPanel, activeTab === 'gantt']
        ].forEach(([button, panel, isActive]) => {
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            panel.hidden = !isActive;
            panel.classList.toggle('active', isActive);
        });

        ensureViewRendered(activeTab);
    };

    const handleDurationSave = (taskId, nextSchedule, { refreshDetail = true } = {}) => {
        const row = taskMap.get(taskId);
        if (!row?.isScheduleEditable) return;
        saveTaskDurationOverride(row, nextSchedule);
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        if (refreshDetail) {
            openTaskDetail(taskId, { focusPanel: false });
        }
    };

    const handleDurationReset = (taskId) => {
        resetTaskDurationOverride(taskId);
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        openTaskDetail(taskId, { focusPanel: false });
    };

    const handleInlineScheduleSave = (taskId, nextSchedule) => {
        const row = taskMap.get(taskId);
        if (!row?.isScheduleEditable) return;
        saveTaskDurationOverride(row, nextSchedule);
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        if (activeTaskId === taskId) {
            openTaskDetail(taskId, { focusPanel: false });
        }
    };

    const handleSolutionGroupStartSave = (groupRowId, nextStartWeek) => {
        const row = taskMap.get(groupRowId);
        if (!row?.isSolutionGroup) return;
        saveSolutionGroupState(row.solutionId, {
            solutionName: row.solutionName || row.step,
            defaultStartWeek: row.defaultStartWeek,
            defaultCollapsed: row.defaultGroupCollapsed,
            startWeek: nextStartWeek,
            collapsed: collapsedSolutionGroupIds.has(groupRowId)
        });
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        if (activeTaskId === groupRowId) {
            openTaskDetail(groupRowId, { focusPanel: false });
        }
    };

    const handleSizingSave = (row, connectorType, nextValues, { relation = '', targetPoolId = '' } = {}) => {
        const solutionId = row?.solutionId;
        const solution = solutions.find((candidate) => candidate.id === solutionId);
        if (!solution || connectorType === 'none') return;
        saveConnectorCapacityValues(solution, nextValues, {
            selectedSolutions: solutions,
            relation,
            targetPoolId
        });
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        if (row?.id) {
            openTaskDetail(row.id, { focusPanel: false });
        }
    };

    const handleInlineFieldSave = (taskId, nextFields) => {
        const row = taskMap.get(taskId);
        if (!row) return;
        saveTaskFieldOverride(row, nextFields);
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        if (activeTaskId === taskId) {
            openTaskDetail(taskId, { focusPanel: false });
        }
    };

    const handleDetailFieldSave = (taskId, nextFields, { refreshDetail = true } = {}) => {
        const row = taskMap.get(taskId);
        if (!row) return;
        saveTaskFieldOverride(row, nextFields);
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        if (refreshDetail) {
            openTaskDetail(taskId, { focusPanel: false });
        }
    };

    const handleAddTopLevelTask = (taskId = activeTaskId) => {
        const row = resolveAddTaskTarget(taskId);
        if (!row?.solutionId) return;

        const solutionGroupId = row.isSolutionGroup ? row.id : row.solutionGroupId;
        const solutionGroupRow = solutionGroupId ? taskMap.get(solutionGroupId) : null;
        if (solutionGroupRow?.isSolutionGroup) {
            saveSolutionGroupState(solutionGroupRow.solutionId, {
                solutionName: solutionGroupRow.solutionName || solutionGroupRow.step,
                defaultStartWeek: solutionGroupRow.defaultStartWeek,
                defaultCollapsed: solutionGroupRow.defaultGroupCollapsed,
                collapsed: false
            });
        }

        const newTaskId = addCustomTask(row, { kind: 'top-level' });
        closeDetail();
        clearHoveredTasks();
        rebuildPlanData();
        if (activeTab !== 'table') {
            activateTab('table');
        }
        renderTableView({ focusInlineField: { taskId: newTaskId, fieldKey: 'name' } });
    };

    const handleAddSubtask = (taskId) => {
        const row = taskMap.get(taskId);
        if (!row?.solutionId || !row.isSummary) return;
        collapsedSummaryIds.delete(row.id);
        const newTaskId = addCustomTask(row, { kind: 'subtask' });
        closeDetail();
        clearHoveredTasks();
        rebuildPlanData();
        if (activeTab !== 'table') {
            activateTab('table');
        }
        renderTableView({ focusInlineField: { taskId: newTaskId, fieldKey: 'name' } });
    };

    const handleMoveTask = (taskId, direction = 0) => {
        const row = taskMap.get(taskId);
        if (!row) return;

        const scopeKey = getTaskOrderScopeKeyForRow(row);
        const scopeRows = planData.rows.filter((candidate) => getTaskOrderScopeKeyForRow(candidate) === scopeKey);
        if (scopeRows.length <= 1) return;

        const orderedIds = getOrderedScopeIds(scopeKey, scopeRows.map((candidate) => candidate.id), getTaskOrderEntries());
        const currentIndex = orderedIds.indexOf(taskId);
        const targetIndex = currentIndex + Number(direction || 0);
        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedIds.length) return;

        const nextOrderedIds = [...orderedIds];
        [nextOrderedIds[currentIndex], nextOrderedIds[targetIndex]] = [nextOrderedIds[targetIndex], nextOrderedIds[currentIndex]];
        saveTaskOrderScope(scopeKey, nextOrderedIds);
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        if (activeTaskId === taskId) {
            openTaskDetail(taskId, { focusPanel: false });
        }
    };

    const handleDeleteTask = (taskId) => {
        const row = taskMap.get(taskId);
        if (!row?.isUserAdded) return;
        const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm(`Delete "${row.step}"?`)
            : true;
        if (!confirmed) return;
        if (activeTaskId === taskId) {
            closeDetail();
        }
        clearHoveredTasks();
        deleteCustomTask(taskId);
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
    };

    const handleSkipTask = (taskId) => {
        const row = taskMap.get(taskId);
        if (!row || row.isUserAdded) return;
        const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm(`Mark "${row.step}" as skipped?`)
            : true;
        if (!confirmed) return;
        saveTaskFieldOverride(row, { status: 'Skipped' });
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
        openTaskDetail(taskId, { focusPanel: false });
    };

    const handleResetAllDurations = () => {
        if (!(planData.customScheduleCount > 0)) return;
        resetAllTaskDurationOverrides();
        closeDetail();
        clearHoveredTasks();
        rebuildPlanData();
        refreshPlannerViewsAfterDataChange();
    };

    let subtaskToggleTimer = 0;
    let subtaskToggleFrame = 0;
    let isSubtaskToggleAnimating = false;

    const collectSubtaskTransitionElements = (taskId) => {
        const selectorValue = escapeAttributeSelectorValue(taskId);
        return [
            ...tableHost.querySelectorAll(`.gantt-table-row[data-parent-id="${selectorValue}"]`),
            ...sidebarHost.querySelectorAll(`.gantt-sidebar-row[data-parent-id="${selectorValue}"]`),
            ...chartHost.querySelectorAll(`.bar-wrapper[data-parent-id="${selectorValue}"]`)
        ];
    };

    const releaseSubtaskToggleLock = (delay = SUBTASK_TOGGLE_TRANSITION_MS) => {
        window.clearTimeout(subtaskToggleTimer);
        subtaskToggleTimer = window.setTimeout(() => {
            isSubtaskToggleAnimating = false;
        }, Math.max(0, delay));
    };

    const revealExpandedSubtasks = (taskId) => {
        const transitionElements = collectSubtaskTransitionElements(taskId);
        if (transitionElements.length === 0) {
            releaseSubtaskToggleLock(0);
            return;
        }

        transitionElements.forEach((element) => element.classList.add('is-subtask-transition-in'));
        window.cancelAnimationFrame(subtaskToggleFrame);
        subtaskToggleFrame = window.requestAnimationFrame(() => {
            subtaskToggleFrame = window.requestAnimationFrame(() => {
                transitionElements.forEach((element) => element.classList.remove('is-subtask-transition-in'));
                releaseSubtaskToggleLock();
            });
        });
    };

    const applySummaryToggle = (taskId) => {
        if (collapsedSummaryIds.has(taskId)) {
            collapsedSummaryIds.delete(taskId);
        } else {
            collapsedSummaryIds.add(taskId);
        }

        viewDirty.table = true;
        viewDirty.gantt = true;
        renderActiveView();
        if (collapsedSummaryIds.has(taskId)) {
            releaseSubtaskToggleLock(0);
            return;
        }

        revealExpandedSubtasks(taskId);
    };

    const toggleSummary = (taskId) => {
        if (isSubtaskToggleAnimating) return;
        isSubtaskToggleAnimating = true;

        closeDetail();
        clearHoveredTasks();

        const isCollapsing = !collapsedSummaryIds.has(taskId);
        const transitionElements = isCollapsing ? collectSubtaskTransitionElements(taskId) : [];

        if (isCollapsing && transitionElements.length > 0) {
            transitionElements.forEach((element) => element.classList.add('is-subtask-transition-out'));
            window.clearTimeout(subtaskToggleTimer);
            subtaskToggleTimer = window.setTimeout(() => {
                applySummaryToggle(taskId);
            }, SUBTASK_TOGGLE_TRANSITION_MS);
            return;
        }

        applySummaryToggle(taskId);
    };

    const toggleSolutionGroup = (groupRowId) => {
        const row = taskMap.get(groupRowId);
        if (!row?.isSolutionGroup) return;

        const nextCollapsed = !collapsedSolutionGroupIds.has(groupRowId);
        const activeRow = taskMap.get(activeTaskId);
        if (nextCollapsed && activeTaskId && (activeTaskId === groupRowId || activeRow?.solutionGroupId === groupRowId)) {
            closeDetail();
        }
        clearHoveredTasks();
        saveSolutionGroupState(row.solutionId, {
            solutionName: row.solutionName || row.step,
            defaultStartWeek: row.defaultStartWeek,
            defaultCollapsed: row.defaultGroupCollapsed,
            collapsed: nextCollapsed
        });
        rebuildPlanData();
        renderActiveView();
    };

    detailBackdrop.addEventListener('click', closeDetail);

    container.__plannerDetailKeydownCleanup?.();
    const handleDetailEscapeKey = (event) => {
        if (event.key !== 'Escape' || detailOverlay.hidden) return;
        closeDetail();
    };
    document.addEventListener('keydown', handleDetailEscapeKey, true);
    container.__plannerDetailKeydownCleanup = () => {
        document.removeEventListener('keydown', handleDetailEscapeKey, true);
    };

    container.__plannerDetailPointerCleanup?.();
    const handleDetailPointerDown = (event) => {
        if (detailOverlay.hidden) return;
        if (!(event.target instanceof Node)) return;
        if (detailHost.contains(event.target)) return;
        closeDetail();
    };
    document.addEventListener('pointerdown', handleDetailPointerDown, true);
    container.__plannerDetailPointerCleanup = () => {
        document.removeEventListener('pointerdown', handleDetailPointerDown, true);
    };

    if (toolbarRefs.addTaskButton) {
        toolbarRefs.addTaskButton.onclick = () => handleAddTopLevelTask();
    }
    if (toolbarRefs.resetButton) {
        toolbarRefs.resetButton.onclick = handleResetAllDurations;
    }

    autoFitButton.addEventListener('click', () => {
        const fitMode = getPlannerAutoFitViewMode(planData.totalDurationWeeks);
        zoomControls.setValue(fitMode);
        window.requestAnimationFrame(() => scrollGanttToLeadingEdge(chartHost));
    });

    tableTabButton.addEventListener('click', () => activateTab('table'));
    ganttTabButton.addEventListener('click', () => activateTab('gantt'));

    refreshSummaryHeaders();
    syncToolbarState();
    ensureViewRendered(activeTab);
    return planData;
}

function resetPlannerToolbar(toolbarRefs = {}) {
    if (toolbarRefs.addTaskButton) {
        toolbarRefs.addTaskButton.disabled = true;
        toolbarRefs.addTaskButton.onclick = null;
    }
    if (toolbarRefs.resetButton) {
        toolbarRefs.resetButton.disabled = true;
        toolbarRefs.resetButton.onclick = null;
    }
    if (toolbarRefs.statusLabel) {
        toolbarRefs.statusLabel.textContent = '';
    }
}

function syncExportButtonState(isEnabled) {
    const exportButton = document.getElementById('exportExcelButton');
    if (!exportButton) {
        return;
    }

    exportButton.disabled = !isEnabled;
}

export function initGanttPlanner(solutions = []) {
    getPreferredDateFormat();
    const container = document.getElementById('plannerView');
    const toolbarRefs = {
        addTaskButton: document.getElementById('plannerAddTaskButton'),
        resetButton: document.getElementById('plannerResetButton'),
        statusLabel: document.getElementById('plannerToolbarStatus')
    };
    currentGanttPlanData = null;
    syncExportButtonState(false);
    ensurePlannerWideLayoutObserver();
    if (!container) return null;

    container.__plannerDetailKeydownCleanup?.();
    container.__plannerDetailPointerCleanup?.();
    container.replaceChildren();
    resetPlannerToolbar(toolbarRefs);

    if (solutions.length === 0) {
        const empty = createElement('div', 'planner-empty-state');
        empty.append(
            createText('div', '📋', 'planner-empty-icon'),
            createText('h3', 'No solutions selected'),
            createText('p', 'Select solutions in Step 3 to generate the project plan.', 'helper-text')
        );
        container.appendChild(empty);
        return null;
    }

    const planData = renderPlannerWorkspace(container, solutions, toolbarRefs);
    currentGanttPlanData = planData;
    syncExportButtonState(Boolean(planData?.rows?.length));
    return planData;
}
