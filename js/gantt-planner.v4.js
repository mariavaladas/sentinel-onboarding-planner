// Gantt Planner v4 — task CRUD, date picker, duration picker, calendar header
import { initPlannerView } from './modules/planning.js';
import { calculatePriorityScore, getPhase } from './modules/scoring.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK;
const BUSINESS_DAY_START_HOUR = 9;
const BUSINESS_DAY_END_HOUR = BUSINESS_DAY_START_HOUR + HOURS_PER_DAY;
const DURATION_OVERRIDE_STORAGE_KEY = 'sentinelPlanner.taskDurationOverrides.v1';
const DATE_FORMAT_STORAGE_KEY = 'sentinelPlanner.dateFormat.v1';
const TABLE_DATE_FORMAT = 'MM/DD/YYYY';
const START_WEEK_MIN = 1;
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
const STATUS_OPTIONS = ['Planned', 'In Progress', 'Completed', 'In Review', 'Skipped'];
const IMPACT_OPTIONS = ['Low', 'Medium', 'High'];
const OWNER_OPTIONS = ['SOC Architect', 'SOC Lead', 'SOC Engineers', 'Operations Team', 'Identity/Entra Admin', 'Security Admin'];
const DEFAULT_NEW_TASK_NAME = 'New Task';
const DEFAULT_NEW_TASK_DURATION_VALUE = 1;
const DEFAULT_NEW_TASK_DURATION_UNIT = 'days';
const DEFAULT_NEW_TASK_DESCRIPTION = '';
const DEFAULT_NEW_TASK_SUMMARY = 'Capture the onboarding step, owner, and notes for this task.';
const DETAIL_FIELDS = ['Solution', 'Task type', 'Milestone', 'Goal', 'Owner', 'Resource Type', 'Impact', 'Start week', 'Start date', 'Due date', 'Duration'];
const DETAIL_EXTRA_FIELDS = ['Connector type', 'Difficulty', 'Required permissions', 'Parent task', 'Effort (hours)', 'Optional'];
const MIN_TASK_DURATION_WEEKS = 0.0125;
const SUMMARY_EXPANDED_PREFIX = '▾';
const SUMMARY_COLLAPSED_PREFIX = '▸';
const SUBTASK_INDENT_PREFIX = ' └ ';
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
    'Planned': 'is-planned',
    'In Progress': 'is-in-progress',
    'Completed': 'is-completed',
    'In Review': 'is-in-review',
    'Skipped': 'is-skipped'
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
        name: 'Timeline',
        padding: '14d',
        step: '1d',
        column_width: 34,
        date_format: 'YYYY-MM-DD',
        lower_text: (date) => String(date.getDate()),
        upper_text: (date, previousDate) => {
            if (!previousDate || date.getMonth() !== previousDate.getMonth() || date.getFullYear() !== previousDate.getFullYear()) {
                return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
            return '';
        },
        thick_line: (date) => date.getDay() === 1 || date.getDate() === 1,
        upper_text_frequency: 31,
        snap_at: '1d'
    },
    {
        name: 'Month',
        padding: '2m',
        step: '1m',
        column_width: 120,
        date_format: 'YYYY-MM',
        lower_text: 'MMMM',
        upper_text: (date, previousDate) => !previousDate || date.getFullYear() !== previousDate.getFullYear()
            ? String(date.getFullYear())
            : '',
        thick_line: (date) => date.getMonth() % 3 === 0,
        snap_at: '7d'
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
    Planned: null, // Planned bars keep the muted phase palette instead of a shared override.
    'In Progress': '#14b8a6',
    Completed: '#22c55e',
    'In Review': '#f59e0b',
    Skipped: '#64748b'
};

let currentGanttPlanData = null;
let durationOverrideState = null;
let storedDateFormatPreference = null;
let durationOverridesPersistToStorage = true;
let ganttResizeCleanup = null;

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
        case 'completed':
        case 'complete':
            return 'Completed';
        case 'in progress':
        case 'in-progress':
        case 'active':
            return 'In Progress';
        case 'in review':
        case 'in-review':
        case 'review':
            return 'In Review';
        case 'skipped':
        case 'skip':
        case 'removed':
            return 'Skipped';
        case 'planned':
        case 'not-started':
        case 'not started':
        case 'todo':
        default:
            return 'Planned';
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
    if (row?.hasDirectStatusOverride) {
        return normalizeStatusLabel(row?.status);
    }

    const normalizedStatus = normalizeStatusLabel(row?.status);
    if (normalizedStatus !== 'Planned') {
        return normalizedStatus;
    }

    const today = startOfDay(new Date());
    const startDate = getRowCalendarStartDate(row, projectStartDate);
    const dueDate = getRowCalendarDueDate(row, projectStartDate);

    if (dueDate < today) return 'Completed';
    if (startDate <= today && dueDate >= today) {
        return row?.phaseKey === 'closeout' ? 'In Review' : 'In Progress';
    }
    if (row?.phaseKey === 'closeout') return 'In Review';
    return 'Planned';
}

function enrichRowsForDisplay(rows = [], projectStartDate) {
    return rows.map((row) => {
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
                Impact: impact,
                'Start date': formatDateForTable(startDate),
                'Due date': formatDateForTable(dueDate)
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
    if (/(analytic|detection|dashboard|workbook|parser|kql|query|validate|validation|tune|entities|tables|investigation|monitoring|go-live|content|rule|alert|telemetry)/.test(hint)) {
        return 'SOC Engineers';
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

function getPermissionSummary(solution = {}) {
    const permissionBuckets = [
        ...(solution?.permissions?.azure_roles || []),
        ...(solution?.permissions?.m365_roles || []),
        ...(solution?.permissions?.resource_permissions || [])
    ].filter(Boolean);

    return permissionBuckets.length > 0
        ? permissionBuckets.join('; ')
        : solution?.permissions?.notes || 'Scoped access to configure and validate this integration.';
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
        version: 3,
        savedAt: '',
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: {},
        customTasks: {}
    };
}

function canUseLocalStorage() {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch (_) {
        return false;
    }
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
            version: 3,
            overrides: parsed?.overrides && typeof parsed.overrides === 'object'
                ? parsed.overrides
                : {},
            customTasks: parsed?.customTasks && typeof parsed.customTasks === 'object'
                ? parsed.customTasks
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

function buildDurationState({
    taskId,
    defaultDurationWeeks,
    durationOverrides = {},
    isDurationEditable = true,
    isCustomInherited = false
} = {}) {
    const defaultDuration = createDurationPresentation({
        businessHours: durationWeeksToBusinessHours(defaultDurationWeeks)
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
    ));
}

function persistTaskOverrideEntries(state, overrides, savedAt = new Date().toISOString()) {
    persistDurationOverrideState({
        ...state,
        version: 3,
        savedAt,
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides,
        customTasks: state?.customTasks && typeof state.customTasks === 'object'
            ? state.customTasks
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
    const normalizedDuration = createDurationPresentation({
        businessHours: durationValueToBusinessHours(durationValue, durationUnit),
        preferredUnit: durationUnit
    });
    const normalizedStartWeek = sanitizeStartWeekInputValue(startWeekValue);
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
        const nextStatus = normalizeStatusLabel(nextFields.status);
        if (nextStatus === normalizeStatusLabel(row.defaultStatus || 'Planned')) {
            delete nextEntry.status;
        } else {
            nextEntry.status = nextStatus;
        }
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

    return persistTaskOverrideEntries(state, overrides);
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

function generateCustomTaskId(solutionId = 'shared') {
    const safePrefix = String(solutionId || 'shared').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'shared';
    return `task-custom-${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistCustomTaskEntries(state, customTasks, savedAt = new Date().toISOString()) {
    persistDurationOverrideState({
        ...state,
        version: 3,
        savedAt,
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: state?.overrides && typeof state.overrides === 'object'
            ? state.overrides
            : {},
        customTasks
    });
    return customTasks;
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
        status: 'Planned',
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
    return persistCustomTaskEntries(getDurationOverrideState(), customTasks);
}

function applyRowDisplayOverrides(rows = [], durationOverrides = {}) {
    return rows.map((row) => {
        const overrideEntry = durationOverrides?.[row.id];
        const hasStatusOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'status');
        const hasImpactOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'impact');
        const hasOwnerOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'owner');
        const hasStepOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'step');
        const hasDescriptionOverride = Boolean(overrideEntry) && Object.prototype.hasOwnProperty.call(overrideEntry, 'description');

        if (!hasStatusOverride && !hasImpactOverride && !hasOwnerOverride && !hasStepOverride && !hasDescriptionOverride) {
            return row;
        }

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

        return {
            ...row,
            status: nextStatus,
            impact: nextImpact,
            owner: nextOwner,
            step: nextStep,
            description: nextDescription,
            hasDirectStatusOverride: hasStatusOverride,
            hasDirectImpactOverride: hasImpactOverride,
            hasDirectOwnerOverride: hasOwnerOverride,
            hasDirectStepOverride: hasStepOverride,
            hasDirectDescriptionOverride: hasDescriptionOverride,
            detailFields: {
                ...row.detailFields,
                Status: nextStatus,
                Owner: nextOwner,
                Impact: nextImpact,
                Goal: row.detailFields?.Goal || row.goal,
                Description: nextDescription
            }
        };
    });
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

    const x = Number(rect.getAttribute('x')) || 0;
    const y = Number(rect.getAttribute('y')) || 0;
    const width = Number(rect.getAttribute('width')) || 0;
    const height = Number(rect.getAttribute('height')) || 0;
    const padding = Math.max(6, Math.min(GANTT_BAR_LABEL_PADDING, Math.max(width / 5, 6)));
    const maxWidth = Math.max(0, width - (padding * 2));
    const taskLabel = String(task?.labelText || task?.name || '').replace(/\s+/g, ' ').trim();
    const insideTaskLabel = fitSvgLabelText(label, taskLabel, maxWidth);
    const insideVisibleTaskCharacters = insideTaskLabel.replace(/…/g, '').trim().length;

    let nextLabelText = resolveBarLabelText(label, task, maxWidth);
    let labelX = x + padding;
    let activeMaxWidth = maxWidth;
    let isOutside = false;

    if (taskLabel && (!insideTaskLabel || insideVisibleTaskCharacters < GANTT_BAR_LABEL_MIN_PRIMARY_CHARS)) {
        const svg = wrapper.closest('svg.gantt') || wrapper.ownerSVGElement;
        const svgWidth = Number(svg?.getAttribute('width')) || svg?.getBoundingClientRect().width || 0;
        const outsideX = x + width + 8;
        const outsideMaxWidth = Math.max(0, svgWidth - outsideX - 8);
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

    const shouldHideLabel = !nextLabelText || activeMaxWidth < GANTT_BAR_LABEL_MIN_TEXT_WIDTH;
    label.textContent = shouldHideLabel ? '' : nextLabelText;
    label.style.display = shouldHideLabel ? 'none' : 'block';
    label.setAttribute(
        'aria-label',
        [taskLabel, task?.durationLabel || ''].filter(Boolean).join(' — ')
    );
    return label;
}

function lightenHexColor(hexColor, amount = 0.22) {
    const safeHex = String(hexColor || '').replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(safeHex)) return hexColor;

    const channels = [0, 2, 4].map((index) => parseInt(safeHex.slice(index, index + 2), 16));
    const lightened = channels
        .map((channel) => Math.round(channel + ((255 - channel) * amount)))
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('');

    return `#${lightened.toUpperCase()}`;
}

function getRowDisplayLabel(row, collapsedSummaryIds = new Set()) {
    if (row.isSummary) {
        const prefix = collapsedSummaryIds.has(row.id) ? SUMMARY_COLLAPSED_PREFIX : SUMMARY_EXPANDED_PREFIX;
        return `${prefix} ${row.number} ${row.step}`;
    }

    if (row.parentId) {
        return `${SUBTASK_INDENT_PREFIX}${row.number} ${row.step}`;
    }

    return `${row.number} ${row.step}`;
}

function formatExportStepLabel(row) {
    return row.parentId ? `${SUBTASK_INDENT_PREFIX}${row.step}` : `${row.number} ${row.step}`;
}

function createRow({
    id,
    phaseKey,
    number,
    status = 'Planned',
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
    taskType = 'Task',
    solutionId = '',
    solutionName = '',
    isUserAdded = false
}) {
    const phase = PHASE_BY_KEY[phaseKey];
    const resolvedTaskType = isSummary ? 'Summary task' : taskType;
    const resolvedDurationState = durationState || buildDurationState({
        taskId: id,
        defaultDurationWeeks: durationWeeks,
        isDurationEditable: !isSummary
    });
    const resolvedStartWeekState = startWeekState || buildStartWeekState({
        taskId: id,
        defaultStartWeek: startWeek,
        isStartWeekEditable: !isSummary
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
        parentId,
        isSummary,
        isSubtask: Boolean(parentId),
        isUserAdded: Boolean(isUserAdded),
        taskType: resolvedTaskType,
        solutionId,
        solutionName,
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
            'Resource Type': resourceType,
            Impact: normalizeImpactLabel(impact),
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
    return `${parentNumber}${String.fromCharCode(97 + index)}`;
}

function getCustomTaskDefaultDurationWeeks(customTask = {}) {
    const durationValue = sanitizeDurationInputValue(customTask.durationValue || DEFAULT_NEW_TASK_DURATION_VALUE);
    const durationUnit = normalizeDurationUnit(customTask.durationUnit || DEFAULT_NEW_TASK_DURATION_UNIT);
    return createDurationPresentation({
        businessHours: durationValueToBusinessHours(durationValue, durationUnit),
        preferredUnit: durationUnit
    }).durationWeeks;
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

    const rbacDurationState = buildDurationState({
        taskId: 'task-rbac-security-groups',
        defaultDurationWeeks: 1,
        durationOverrides
    });
    const rbacStartWeekState = buildStartWeekState({
        taskId: 'task-rbac-security-groups',
        defaultStartWeek: sanitizeStartWeekInputValue(topologyRow.endWeek),
        durationOverrides
    });
    const rbacRow = createRow({
        id: 'task-rbac-security-groups',
        phaseKey: 'setup',
        number: getNextNumber(counters, 'setup'),
        step: 'RBAC & Security Groups',
        milestone: 'Administrative roles, access groups, and approvals are in place.',
        goal: 'Ensure every onboarding task has the right customer-side access path.',
        owner: 'Identity/Entra Admin',
        resourceType: 'Customer',
        impact: 'Medium',
        task: 'Create or validate the required RBAC assignments, security groups, and approval workflow for connector onboarding.',
        startWeek: rbacStartWeekState.effectiveStartWeek,
        durationWeeks: rbacDurationState.effectiveDuration.durationWeeks,
        durationHours: 2,
        durationState: rbacDurationState,
        startWeekState: rbacStartWeekState,
        dependencies: [topologyRow.id],
        details: {
            'Connector type': 'Platform foundation',
            Difficulty: 'moderate',
            'Required permissions': 'Azure RBAC, Microsoft Sentinel Contributor, and tenant approval flow.'
        }
    });
    rows.push(rbacRow);

    return {
        endWeek: rbacRow.endWeek,
        terminalRowIds: [rbacRow.id]
    };
}

function createGanttTask(row, projectStartDate, collapsedSummaryIds = new Set()) {
    const start = getRowCalendarStartDateTime(row, projectStartDate);
    const end = getRowCalendarEndDateTime(row, projectStartDate);
    const safeEnd = end > start ? end : addBusinessHours(start, HOURS_PER_DAY / 2);

    const className = PHASE_BY_KEY[row.phaseKey].className;
    const normalizedStatus = normalizeStatusLabel(row.status);
    const phaseColor = PHASE_BAR_COLOR[className];
    const baseColor = normalizedStatus === 'Planned'
        ? phaseColor
        : STATUS_BAR_COLOR[normalizedStatus] || phaseColor;

    return {
        id: row.id,
        name: row.step,
        labelText: row.step,
        durationLabel: row.durationLabel,
        start,
        end: safeEnd,
        progress: normalizedStatus === 'Completed' ? 100 : 0,
        dependencies: row.dependencies.join(','),
        custom_class: className,
        phaseClassName: className,
        color: row.isSubtask ? lightenHexColor(baseColor) : baseColor,
        isSummary: row.isSummary,
        isSubtask: row.isSubtask,
        parentId: row.parentId || '',
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
    phaseStartWeek,
    defaultDependencies = [],
    durationOverrides = {},
    customTaskEntries = {}
}) {
    const orderedTasks = sortByOrder(solution?.planner?.setup_tasks || []);
    const ownerModel = getOwnerModel(solution);
    const category = getSolutionGroup(solution);
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
        ? allocateDurations(getDurationWeeks(solution), normalizedTasks, getTaskEffortHours)
        : [];
    const builtRows = [];
    const rowById = new Map();
    let previousMainRowId = null;

    normalizedTasks.forEach((task, taskIndex) => {
        const taskNumber = getNextNumber(counters, phaseKey);
        const explicitParentDependencies = getResolvedDependencies(task?.depends_on, idMap);
        const parentDependencies = explicitParentDependencies.length > 0
            ? explicitParentDependencies
            : previousMainRowId
                ? [previousMainRowId]
                : [...defaultDependencies];
        const defaultParentStartWeek = sanitizeStartWeekInputValue(
            getDependencyEndWeek(parentDependencies, rowById, phaseStartWeek)
        );
        const defaultTaskDuration = taskDurations[taskIndex];
        const customSubtasks = task.customSubtasks || [];

        if (task.subtasks.length > 0) {
            const subtaskDurations = allocateDurations(defaultTaskDuration, task.subtasks, getTaskEffortHours);
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
                    durationOverrides
                });
                const subtaskStartWeekState = buildStartWeekState({
                    taskId: subtask.rowId,
                    defaultStartWeek: defaultSubtaskStartWeek,
                    durationOverrides
                });

                const subRow = createRow({
                    id: subtask.rowId,
                    phaseKey,
                    number: getSubtaskNumber(taskNumber, subIndex),
                    step: subtask.task || `Subtask ${subIndex + 1}`,
                    milestone: solutionMilestone,
                    goal: task.task || solutionGoal,
                    owner: resolveTaskOwner(subtask, solution, ownerModel, [task?.task, task?.description]),
                    resourceType: ownerModel.resourceType,
                    impact: solutionImpact,
                    task: `Subtask of ${task.task || solution.name}.`,
                    description: getTaskDetailDescription(subtask, solution, [task?.description]),
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
                    status: customTask.status || 'Planned',
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
            const summaryRow = createRow({
                id: task.rowId,
                phaseKey,
                number: taskNumber,
                step: task.task || solution.name,
                milestone: solutionMilestone,
                goal: solutionGoal,
                owner: resolveTaskOwner(task, solution, ownerModel),
                resourceType: ownerModel.resourceType,
                impact: solutionImpact,
                task: `${solution.name} summary row for ${task.task || 'setup work'}.`,
                description: getTaskDetailDescription(task, solution),
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
            durationOverrides
        });
        const taskStartWeekState = buildStartWeekState({
            taskId: task.rowId,
            defaultStartWeek: defaultParentStartWeek,
            durationOverrides
        });
        const row = createRow({
            id: task.rowId,
            phaseKey,
            number: taskNumber,
            step: task.task || solution.name,
            milestone: solutionMilestone,
            goal: solutionGoal,
            owner: resolveTaskOwner(task, solution, ownerModel),
            resourceType: ownerModel.resourceType,
            impact: solutionImpact,
            task: task.task || solutionGoal,
            description: getTaskDetailDescription(task, solution),
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
            status: customTask.status || 'Planned',
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
        const row = createRow({
            id: rowId,
            phaseKey,
            number: getNextNumber(counters, phaseKey),
            step: solution.name,
            milestone: solutionMilestone,
            goal: solutionGoal,
            owner: resolveTaskOwner({}, solution, ownerModel),
            resourceType: ownerModel.resourceType,
            impact: solutionImpact,
            task: getTaskDescription(solution),
            description: getTaskDetailDescription({}, solution),
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

function createVisiblePlanData(planData, collapsedSummaryIds = new Set()) {
    const rowById = new Map(planData.rows.map((row) => [row.id, row]));
    const visibleRows = planData.rows.filter((row) => !(row.parentId && collapsedSummaryIds.has(row.parentId)));
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

            return null;
        }).filter(Boolean))];

        return createGanttTask({ ...row, dependencies: visibleDependencies }, planData.projectStartDate, collapsedSummaryIds);
    });

    return { rows: visibleRows, tasks };
}

export function buildGanttPlanData(selectedSolutions = [], options = {}) {
    const solutions = [...selectedSolutions];
    const durationOverrides = options?.durationOverrides || getDurationOverrideEntries();
    const customTaskEntries = options?.customTaskEntries || getCustomTaskEntries();
    const rows = [];
    const counters = new Map();

    const standardPlan = addStandardTasks(rows, counters, durationOverrides);

    let previousPhaseEnd = standardPlan.endWeek;
    let previousPhaseTerminalIds = [...standardPlan.terminalRowIds];

    [1, 2, 3].forEach((bucket) => {
        const phaseKey = SOLUTION_PHASE_KEY[bucket];
        const phaseSolutions = solutions
            .filter((solution) => getSolutionPhaseBucket(solution) === bucket)
            .sort((left, right) => {
                const scoreDelta = calculatePriorityScore(right) - calculatePriorityScore(left);
                return scoreDelta !== 0 ? scoreDelta : left.name.localeCompare(right.name);
            });

        if (phaseSolutions.length === 0) {
            return;
        }

        let phaseEnd = previousPhaseEnd;
        let previousTaskId = null;
        let currentPhaseStartWeek = sanitizeStartWeekInputValue(previousPhaseEnd);
        const phaseTerminalIds = [];

        phaseSolutions.forEach((solution) => {
            const solutionPlan = createSolutionPlanRows({
                solution,
                phaseKey,
                counters,
                phaseStartWeek: currentPhaseStartWeek,
                defaultDependencies: previousTaskId
                    ? [previousTaskId]
                    : [...previousPhaseTerminalIds],
                durationOverrides,
                customTaskEntries
            });

            rows.push(...solutionPlan.rows);

            if (solutionPlan.terminalRowId) {
                previousTaskId = solutionPlan.terminalRowId;
                phaseTerminalIds.push(solutionPlan.terminalRowId);
                phaseEnd = Math.max(phaseEnd, solutionPlan.endWeek);
                currentPhaseStartWeek = sanitizeStartWeekInputValue(solutionPlan.endWeek);
            }
        });

        previousPhaseEnd = phaseEnd;
        previousPhaseTerminalIds = phaseTerminalIds.length > 0
            ? [phaseTerminalIds[phaseTerminalIds.length - 1]]
            : previousPhaseTerminalIds;
    });

    const trainingDurationState = buildDurationState({
        taskId: 'task-training-handover',
        defaultDurationWeeks: 2,
        durationOverrides
    });
    const trainingStartWeekState = buildStartWeekState({
        taskId: 'task-training-handover',
        defaultStartWeek: sanitizeStartWeekInputValue(previousPhaseEnd),
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
        dependencies: [...previousPhaseTerminalIds],
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
    const displayRows = enrichRowsForDisplay(applyRowDisplayOverrides(rows, durationOverrides), projectStartDate);
    const tasks = displayRows.map((row) => createGanttTask(row, projectStartDate));
    const latestEndWeek = displayRows.reduce((maxEnd, row) => Math.max(maxEnd, row.endWeek), START_WEEK_MIN);
    const totalDurationWeeks = Math.max(0, roundWeekPrecision(latestEndWeek - START_WEEK_MIN));
    const phaseBreakdown = PHASE_SEQUENCE.map((phase) => {
        const phaseRows = displayRows.filter((row) => row.phaseKey === phase.key);
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

    const exportRows = displayRows.map((row) => ({
        '#': row.number,
        Phase: row.phase,
        Status: row.status,
        Step: formatExportStepLabel(row),
        Milestone: row.milestone,
        Goal: row.goal,
        Owner: row.owner,
        'Resource Type': row.resourceType,
        Impact: row.impact,
        Task: row.task,
        'Start week': formatWeekOffset(row.startWeek),
        'Default start week': formatWeekOffset(row.defaultStartWeek),
        'Start date': row.startDateLabel,
        'Due date': row.dueDateLabel,
        Duration: row.durationLabel,
        'Default duration': row.defaultDurationLabel,
        'Custom schedule': row.hasDirectScheduleOverride ? 'Yes' : row.hasDerivedCustomSchedule ? 'Derived' : 'No'
    }));

    const customScheduleCount = displayRows.filter((row) => row.hasDirectScheduleOverride).length;

    return {
        projectStartDate,
        tasks,
        rows: displayRows,
        exportRows,
        totalDurationWeeks,
        totalTasks: rows.length,
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

function createViewModeToggles(ganttInstanceRef) {
    const toggleGroup = createElement('div', 'gantt-view-modes');
    toggleGroup.setAttribute('role', 'group');
    toggleGroup.setAttribute('aria-label', 'Gantt view mode');

    GANTT_VIEW_MODES.forEach((viewMode) => {
        const modeName = viewMode.name;
        const isActive = (ganttInstanceRef.viewMode || GANTT_VIEW_MODES[0].name) === modeName;
        const button = createElement('button', 'gantt-view-mode-button');
        button.type = 'button';
        button.textContent = modeName;
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (isActive) button.classList.add('active');
        button.addEventListener('click', () => {
            toggleGroup.querySelectorAll('.gantt-view-mode-button').forEach((item) => {
                item.classList.remove('active');
                item.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            ganttInstanceRef.viewMode = modeName;
            ganttInstanceRef.current?.change_view_mode(modeName);
        });
        toggleGroup.appendChild(button);
    });

    return toggleGroup;
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
    return [row.phase].filter(Boolean).join(' • ');
}

function createStatusIndicator(status = 'Planned') {
    const normalizedStatus = normalizeStatusLabel(status);
    const indicator = createElement('span', 'gantt-status-indicator');
    indicator.classList.add(STATUS_COLOR_CLASS_MAP[normalizedStatus] || STATUS_COLOR_CLASS_MAP.Planned);
    indicator.append(
        createElement('span', 'gantt-status-indicator__swatch'),
        createText('span', normalizedStatus, 'gantt-status-indicator__label')
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
        onToggleSummary,
        onHoverTask,
        onInlineScheduleSave,
        onInlineFieldSave,
        onAddTopLevelTask,
        onAddSubtask,
        onDeleteTask,
        projectStartDate
    } = {}
) {
    const panel = createElement('section', 'gantt-table-panel');
    const header = createElement('div', 'gantt-table-header');
    [
        ['#', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--number'],
        ['Name', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--task'],
        ['Owner', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--owner'],
        ['Status', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--status'],
        ['Start date', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--date'],
        ['Due date', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--date'],
        ['Duration', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--duration'],
        ['Impact', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--impact']
    ].forEach(([label, className]) => {
        header.appendChild(createText('div', label, className));
    });

    const scroll = createElement('div', 'gantt-table-scroll');
    const surface = createElement('div', 'gantt-table-surface');
    scroll.appendChild(surface);
    panel.append(header, scroll);

    const rowElements = new Map();
    const inlineCellOpeners = new WeakMap();
    const inlineFieldOpeners = new Map();
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

        const deferredLayoutUpdate = pendingLayoutUpdate;
        pendingLayoutUpdate = null;
        updateLayout(deferredLayoutUpdate.layoutMetrics, deferredLayoutUpdate.chartHeight);
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
        let activatedRecently = false;
        const handleActivation = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (activatedRecently) return;
            activatedRecently = true;
            setTimeout(() => { activatedRecently = false; }, 200);
            onOpen();
        };
        trigger.addEventListener('click', handleActivation);
        trigger.addEventListener('mouseup', (event) => {
            if (event.button === 0) handleActivation(event);
        });
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                stopRowActivation(event);
                onOpen();
            }
        });
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

        cleanupOutside = createOutsidePointerHandler(editorShell, () => closeEditor());

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

        select.addEventListener('change', saveEditor);
        let blurEnabled = false;
        setTimeout(() => { blurEnabled = true; }, 300);
        select.addEventListener('blur', () => { if (blurEnabled) saveEditor(); });
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
        const nameTrigger = createInlineTrigger({
            className: 'gantt-table-task-name-trigger',
            title: `Edit name for ${row.step}`,
            ariaLabel: `Edit name for ${row.step}`,
            onOpen: () => openInlineNameEditor(row, cell, labelHost, renderTaskNameDisplay),
            content: createText('span', row.step, 'gantt-table-task-label')
        });
        labelHost.appendChild(nameTrigger);
        inlineFieldOpeners.set(`${row.id}:name`, () => openInlineNameEditor(row, cell, labelHost, renderTaskNameDisplay));
    };

    const renderInlineOwnerDisplay = (row, cell) => {
        cell.replaceChildren();
        cell.classList.remove('is-editing');
        const currentValue = normalizeOwnerLabel(row.owner, { preserveCustom: true });
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
        const trigger = createInlineTrigger({
            className: 'gantt-table-inline-trigger gantt-table-inline-trigger--select',
            title: `Edit impact for ${row.step}`,
            ariaLabel: `Edit impact for ${row.step}`,
            onOpen: () => openInlineSelectEditor(row, cell, {
                currentValue,
                options: IMPACT_OPTIONS,
                renderDisplay: renderInlineImpactDisplay,
                onSave: (nextValue) => onInlineFieldSave?.(row.id, { impact: nextValue }),
                ariaLabel: `Impact for ${row.step}`
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

        if (!row.isScheduleEditable) {
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

    const updateLayout = (layoutMetrics = [], chartHeight = 0) => {
        if (activeInlineEditor) {
            pendingLayoutUpdate = { layoutMetrics, chartHeight };
            return;
        }

        pendingLayoutUpdate = null;
        const metricsById = new Map((layoutMetrics || []).map((metric) => [metric.id, metric]));
        const surfaceHeight = Math.max(Number(chartHeight) || 0, rows.length * GANTT_TABLE_ROW_FALLBACK_HEIGHT, 180);
        surface.style.height = `${surfaceHeight}px`;
        surface.replaceChildren();
        rowElements.clear();
        inlineFieldOpeners.clear();

        rows.forEach((row, index) => {
            const metric = metricsById.get(row.id);
            const top = Number.isFinite(metric?.top) ? metric.top : index * GANTT_TABLE_ROW_FALLBACK_HEIGHT;
            const height = Math.max(38, Number.isFinite(metric?.height) ? metric.height : GANTT_TABLE_ROW_FALLBACK_HEIGHT);
            const previousRow = rows[index - 1];
            const nextRow = rows[index + 1];
            const isFirstSubtask = Boolean(row.parentId && previousRow?.parentId !== row.parentId);
            const isLastSubtask = Boolean(row.parentId && nextRow?.parentId !== row.parentId);
            const rowElement = createElement('div', 'gantt-table-row');
            if (row.isSummary) rowElement.classList.add('gantt-table-row--summary');
            if (row.parentId) {
                rowElement.classList.add('gantt-table-row--subtask');
                rowElement.dataset.parentId = row.parentId;
                if (isFirstSubtask) rowElement.classList.add('gantt-table-row--subtask-first');
                if (isLastSubtask) rowElement.classList.add('gantt-table-row--subtask-last');
                if (!isFirstSubtask && !isLastSubtask) rowElement.classList.add('gantt-table-row--subtask-middle');
            }
            if (row.isSummary && collapsedSummaryIds.has(row.id)) rowElement.classList.add('is-collapsed');
            if (row.isCustomSchedule) rowElement.classList.add('has-custom-duration');
            if (row.hasDerivedCustomSchedule) rowElement.classList.add('has-derived-custom-duration');
            if (row.isUserAdded) rowElement.classList.add('is-user-added');
            rowElement.dataset.taskId = row.id;
            rowElement.style.top = `${top}px`;
            rowElement.style.height = `${height}px`;
            rowElement.setAttribute('role', 'button');
            rowElement.tabIndex = 0;
            rowElement.setAttribute(
                'aria-label',
                row.isSummary
                    ? `${collapsedSummaryIds.has(row.id) ? 'Expand' : 'Collapse'} subtasks for ${row.step}`
                    : `Open details for ${row.step}`
            );
            if (row.isSummary) {
                rowElement.setAttribute('aria-expanded', collapsedSummaryIds.has(row.id) ? 'false' : 'true');
            }

            const rowNumberCell = createText('div', row.number, 'gantt-table-cell gantt-table-cell--row-number');
            const taskCell = createElement('div', 'gantt-table-cell gantt-table-cell--task');
            const taskContent = createElement('div', 'gantt-table-task-content');
            if (row.parentId) taskContent.classList.add('gantt-table-task-content--subtask');
            taskContent.style.setProperty('--task-indent', row.parentId ? '18px' : '0px');

            const titleRow = createElement('div', 'gantt-table-task-title-row');
            if (row.isSummary) {
                const toggle = createElement('button', 'gantt-table-toggle');
                toggle.type = 'button';
                toggle.textContent = collapsedSummaryIds.has(row.id) ? SUMMARY_COLLAPSED_PREFIX : SUMMARY_EXPANDED_PREFIX;
                toggle.setAttribute('aria-label', `${collapsedSummaryIds.has(row.id) ? 'Expand' : 'Collapse'} ${row.step}`);
                toggle.setAttribute('aria-expanded', collapsedSummaryIds.has(row.id) ? 'false' : 'true');
                toggle.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleSummary?.(row.id);
                });
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
            if (rowActions.childElementCount > 0) {
                titleRow.append(titleStack, rowActions);
            } else {
                titleRow.appendChild(titleStack);
            }
            taskContent.appendChild(titleRow);

            const badgeLabel = getCustomDurationBadgeLabel(row);
            if (badgeLabel) {
                taskContent.appendChild(createText('span', badgeLabel, 'gantt-table-badge gantt-table-badge--custom'));
            }
            taskCell.appendChild(taskContent);

            const ownerCell = createElement('div', 'gantt-table-cell gantt-table-cell--owner');
            renderInlineOwnerDisplay(row, ownerCell);
            attachInlineCellLauncher(ownerCell, {
                title: `Edit owner for ${row.step}`,
                onOpen: () => openInlineOwnerEditor(row, ownerCell)
            });

            const statusCell = createElement('div', 'gantt-table-cell gantt-table-cell--status');
            renderInlineStatusDisplay(row, statusCell);
            attachInlineCellLauncher(statusCell, {
                title: `Edit status for ${row.step}`,
                onOpen: () => openInlineSelectEditor(row, statusCell, {
                    currentValue: normalizeStatusLabel(row.status),
                    options: STATUS_OPTIONS,
                    renderDisplay: renderInlineStatusDisplay,
                    onSave: (nextValue) => onInlineFieldSave?.(row.id, { status: nextValue }),
                    ariaLabel: `Status for ${row.step}`
                })
            });
            const startCell = createElement('div', 'gantt-table-cell gantt-table-date');
            renderInlineDateDisplay(row, startCell, 'start');
            attachInlineCellLauncher(startCell, {
                title: `Edit start date for ${row.step}`,
                isEnabled: row.isScheduleEditable,
                onOpen: () => openInlineDateEditor(row, startCell, {
                    fieldKey: 'start',
                    currentDate: row.startDate || getRowCalendarStartDate(row, projectStartDate),
                    renderDisplay: renderInlineDateDisplay,
                    onSave: (nextValue) => onInlineScheduleSave?.(row.id, {
                        startWeek: getStartWeekFromDate(nextValue, projectStartDate)
                    })
                })
            });
            const dueCell = createElement('div', 'gantt-table-cell gantt-table-date');
            renderInlineDateDisplay(row, dueCell, 'due');
            attachInlineCellLauncher(dueCell, {
                title: `Edit due date for ${row.step}`,
                isEnabled: row.isScheduleEditable,
                onOpen: () => openInlineDateEditor(row, dueCell, {
                    fieldKey: 'due',
                    currentDate: row.dueDate || getRowCalendarDueDate(row, projectStartDate),
                    renderDisplay: renderInlineDateDisplay,
                    onSave: (nextValue) => {
                        const nextBusinessDate = coerceToBusinessDay(nextValue);
                        if (!nextBusinessDate) return;

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
                })
            });
            const durationCell = createElement('div', 'gantt-table-cell gantt-table-cell--duration');
            renderInlineDurationDisplay(row, durationCell);
            attachInlineCellLauncher(durationCell, {
                title: `Edit duration for ${row.step}`,
                isEnabled: row.isDurationEditable,
                onOpen: () => openInlineDurationEditor(row, durationCell)
            });
            const impactCell = createElement('div', 'gantt-table-cell gantt-table-cell--impact');
            renderInlineImpactDisplay(row, impactCell);
            attachInlineCellLauncher(impactCell, {
                title: `Edit impact for ${row.step}`,
                onOpen: () => openInlineSelectEditor(row, impactCell, {
                    currentValue: normalizeImpactLabel(row.impact),
                    options: IMPACT_OPTIONS,
                    renderDisplay: renderInlineImpactDisplay,
                    onSave: (nextValue) => onInlineFieldSave?.(row.id, { impact: nextValue }),
                    ariaLabel: `Impact for ${row.step}`
                })
            });

            rowElement.append(rowNumberCell, taskCell, ownerCell, statusCell, startCell, dueCell, durationCell, impactCell);

            const activateRow = (event) => {
                const targetElement = getEventElementTarget(event);
                const activeEditorCell = activeInlineEditor?.cell;
                if (targetElement?.closest?.('.gantt-table-inline-trigger, .gantt-table-task-name-trigger, .gantt-table-row-action, .gantt-table-toggle')) return;
                if (targetElement?.closest?.('.gantt-table-cell.is-editing')) return;
                if (activeEditorCell && targetElement && activeEditorCell.contains(targetElement)) return;

                if (row.isSummary) {
                    closeInlineEditor({ restoreDisplay: true });
                    onToggleSummary?.(row.id);
                    return;
                }

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

function enableSplitPaneResize(layout, divider) {
    if (!layout || !divider) return;

    ganttResizeCleanup?.();

    divider.tabIndex = 0;
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-label', 'Resize task table and timeline');
    divider.setAttribute('aria-orientation', 'vertical');

    const getBounds = () => {
        const width = layout.getBoundingClientRect().width;
        return {
            min: 420,
            max: Math.min(920, Math.max(560, width - 360))
        };
    };

    const applyWidth = (nextWidth) => {
        const { min, max } = getBounds();
        const clampedWidth = Math.min(max, Math.max(min, nextWidth));
        layout.style.gridTemplateColumns = `${clampedWidth}px 12px minmax(0, 1fr)`;
        divider.setAttribute('aria-valuemin', String(min));
        divider.setAttribute('aria-valuemax', String(max));
        divider.setAttribute('aria-valuenow', String(Math.round(clampedWidth)));
    };

    window.requestAnimationFrame(() => {
        const measuredWidth = Math.round(layout.getBoundingClientRect().width * 0.42) || 540;
        applyWidth(measuredWidth);
    });

    const stopDrag = () => {
        document.body.classList.remove('is-resizing-gantt');
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopDrag);
    };

    const handlePointerMove = (event) => {
        const bounds = layout.getBoundingClientRect();
        applyWidth(event.clientX - bounds.left);
    };

    divider.addEventListener('pointerdown', (event) => {
        if (window.matchMedia('(max-width: 900px)').matches) return;
        event.preventDefault();
        document.body.classList.add('is-resizing-gantt');
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopDrag, { once: true });
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
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopDrag);
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

function syncGanttTimelineHeader(chartHost) {
    const gantt = chartHost?.__ganttInstance;
    if (!gantt || typeof gantt.get_dates_to_draw !== 'function') return;

    const header = gantt.$header;
    const upperHeader = gantt.$upper_header;
    const lowerHeader = gantt.$lower_header;
    if (!header || !upperHeader || !lowerHeader) return;

    const dateInfo = gantt.get_dates_to_draw();
    if (!Array.isArray(dateInfo) || dateInfo.length === 0) return;

    const firstDate = dateInfo[0];
    const lastDate = dateInfo[dateInfo.length - 1];
    const signature = [
        gantt.config.view_mode?.name || '',
        dateInfo.length,
        firstDate?.formatted_date || '',
        lastDate?.formatted_date || '',
        gantt.config.column_width
    ].join('|');

    if (header.dataset.timelineHeaderSig === signature) {
        return;
    }

    header.dataset.timelineHeaderSig = signature;
    upperHeader.replaceChildren();
    lowerHeader.replaceChildren();
    upperHeader.classList.add('gantt-custom-timeline-row', 'gantt-custom-timeline-row--upper');
    lowerHeader.classList.add('gantt-custom-timeline-row', 'gantt-custom-timeline-row--lower');

    const todayKey = formatDateForInput(new Date());
    dateInfo.forEach((entry) => {
        const lowerCell = createElement('div', 'gantt-timeline-header-cell gantt-timeline-header-cell--lower');
        lowerCell.style.left = `${entry.x}px`;
        lowerCell.style.width = `${Math.max(1, entry.column_width)}px`;
        lowerCell.textContent = String(entry.date.getDate());
        lowerCell.title = formatDateForTable(entry.date);
        lowerCell.classList.toggle('is-today', formatDateForInput(entry.date) === todayKey);
        lowerHeader.appendChild(lowerCell);
    });

    let groupStart = 0;
    let monthIndex = 0;
    while (groupStart < dateInfo.length) {
        const firstEntry = dateInfo[groupStart];
        const month = firstEntry.date.getMonth();
        const year = firstEntry.date.getFullYear();
        let width = 0;
        let groupEnd = groupStart;
        while (groupEnd < dateInfo.length) {
            const currentEntry = dateInfo[groupEnd];
            if (currentEntry.date.getMonth() !== month || currentEntry.date.getFullYear() !== year) {
                break;
            }
            width += Math.max(1, currentEntry.column_width);
            groupEnd += 1;
        }

        const upperCell = createElement(
            'div',
            `gantt-timeline-header-cell gantt-timeline-header-cell--upper${monthIndex % 2 === 1 ? ' is-alt' : ''}`
        );
        upperCell.style.left = `${firstEntry.x}px`;
        upperCell.style.width = `${Math.max(1, width)}px`;
        upperCell.textContent = firstEntry.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        upperHeader.appendChild(upperCell);

        monthIndex += 1;
        groupStart = groupEnd;
    }
}

function stabilizeGanttRender(
    chartHost,
    tasks,
    { collapsedSummaryIds = new Set(), onToggleSummary, onLayoutChange, onHoverTask } = {}
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
            wrapper.classList.toggle('gantt-subtask', Boolean(task?.isSubtask));
            wrapper.classList.toggle('is-collapsed', Boolean(task?.isSummary && collapsedSummaryIds.has(task.id)));
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
                rect.dataset.baseY = String(baseY);
                rect.dataset.baseHeight = String(baseHeight);

                const nextHeight = task?.isSubtask
                    ? Math.max(12, baseHeight - 4)
                    : isCollapsedSummary
                        ? Math.max(16, baseHeight)
                        : task?.isSummary
                            ? Math.max(14, baseHeight - 2)
                            : baseHeight;
                const nextY = baseY + ((baseHeight - nextHeight) / 2);

                rect.setAttribute('y', String(nextY));
                rect.setAttribute('height', String(nextHeight));
                if (task?.color) rect.style.setProperty('fill', task.color, 'important');
                rect.style.setProperty('opacity', '1', 'important');
                rect.style.setProperty('fill-opacity', '1', 'important');
                rect.style.setProperty('stroke', 'rgba(15, 23, 42, 0.28)', 'important');
                rect.style.setProperty('stroke-width', isCollapsedSummary ? '1.5' : task?.isSummary ? '1.3' : '1');

                if (progressRect) {
                    const progressBaseY = Number(progressRect.dataset.baseY || progressRect.getAttribute('y') || baseY);
                    progressRect.dataset.baseY = String(progressBaseY);
                    progressRect.setAttribute('y', String(nextY));
                    progressRect.setAttribute('height', String(nextHeight));
                    if (task?.color) progressRect.style.setProperty('fill', task.color, 'important');
                }

                label = syncTaskBarLabel(wrapper, rect, task) || label;
            }

            if (label) {
                label.classList.toggle('gantt-summary-toggle', Boolean(task?.isSummary));
                label.classList.toggle('gantt-subtask-label', Boolean(task?.isSubtask));

                if (task?.isSummary && typeof onToggleSummary === 'function') {
                    label.setAttribute('role', 'button');
                    label.setAttribute('tabindex', '0');
                    label.setAttribute('aria-expanded', collapsedSummaryIds.has(task.id) ? 'false' : 'true');
                    label.style.cursor = 'pointer';
                    label.style.pointerEvents = 'auto';

                    if (label.dataset.summaryToggleBound !== 'true') {
                        const toggleSummary = (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggleSummary(task.id);
                        };

                        label.addEventListener('click', toggleSummary);
                        label.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                toggleSummary(event);
                            }
                        });
                        label.dataset.summaryToggleBound = 'true';
                    }
                } else {
                    label.removeAttribute('role');
                    label.removeAttribute('tabindex');
                    label.removeAttribute('aria-expanded');
                    label.style.cursor = 'default';
                    label.style.pointerEvents = 'none';
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
        console.debug('Gantt render summary', {
            wrapperCount: wrappers.length,
            visibleBars,
            svgHeight,
            containerHeight: container.getBoundingClientRect().height,
            scrollHeight: container.scrollHeight
        });

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

function createDurationEditor(row, { onSaveDuration, onResetDuration } = {}) {
    const section = createElement('section', 'gantt-duration-editor');
    section.append(
        createText('h4', 'Task schedule', 'gantt-duration-editor-title'),
        createText('p', getDurationHelperText(row), 'gantt-duration-note')
    );

    const summary = createElement('div', 'gantt-duration-summary');
    summary.append(
        createText('span', `Current start: Week ${formatWeekOffset(row.startWeek)}`, 'gantt-duration-summary-value'),
        createText('span', `Default start: Week ${formatWeekOffset(row.defaultStartWeek)}`, 'gantt-duration-summary-default'),
        createText('span', `Current duration: ${row.durationLabel}`, 'gantt-duration-summary-value'),
        createText('span', `Default duration: ${row.defaultDurationLabel}`, 'gantt-duration-summary-default')
    );
    section.appendChild(summary);

    if (!row.isScheduleEditable) {
        return section;
    }

    const controls = createElement('div', 'gantt-duration-controls');

    const startField = createElement('label', 'gantt-duration-field-control');
    startField.appendChild(createText('span', 'Start Week', 'gantt-detail-label'));
    const startWeekInput = createElement('input', 'gantt-duration-input');
    startWeekInput.type = 'number';
    startWeekInput.min = String(START_WEEK_MIN);
    startWeekInput.step = '0.1';
    startWeekInput.inputMode = 'decimal';
    startWeekInput.value = String(sanitizeStartWeekInputValue(row.startWeek));
    startField.appendChild(startWeekInput);

    const valueField = createElement('label', 'gantt-duration-field-control');
    valueField.appendChild(createText('span', 'Duration', 'gantt-detail-label'));
    const durationInput = createElement('input', 'gantt-duration-input');
    durationInput.type = 'number';
    durationInput.min = '0.5';
    durationInput.step = '0.5';
    durationInput.inputMode = 'decimal';
    durationInput.value = formatCompactNumber(row.durationValue);
    valueField.appendChild(durationInput);

    const unitField = createElement('label', 'gantt-duration-field-control');
    unitField.appendChild(createText('span', 'Unit', 'gantt-detail-label'));
    const unitSelect = createElement('select', 'gantt-duration-select');
    [
        ['hours', 'Hours'],
        ['days', 'Days'],
        ['weeks', 'Weeks']
    ].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        option.selected = row.durationUnit === value;
        unitSelect.appendChild(option);
    });
    unitField.appendChild(unitSelect);

    controls.append(startField, valueField, unitField);
    section.appendChild(controls);

    const presets = createElement('div', 'gantt-duration-presets');
    const presetButtons = DURATION_VALUE_PRESETS.map((presetValue) => {
        const button = createElement('button', 'gantt-duration-preset');
        button.type = 'button';
        button.dataset.durationPreset = String(presetValue);
        button.addEventListener('click', () => {
            durationInput.value = formatCompactNumber(presetValue);
        });
        presets.appendChild(button);
        return button;
    });

    const syncPresetLabels = () => {
        const unit = normalizeDurationUnit(unitSelect.value);
        presetButtons.forEach((button) => {
            const presetValue = Number(button.dataset.durationPreset);
            button.textContent = formatDurationLabel(presetValue, unit);
        });
    };
    syncPresetLabels();
    unitSelect.addEventListener('change', syncPresetLabels);
    section.appendChild(presets);

    const actions = createElement('div', 'gantt-duration-actions');
    const saveButton = createElement('button', 'app-button app-button--accent');
    saveButton.type = 'button';
    saveButton.textContent = 'Update schedule';

    const resetButton = createElement('button', 'app-button');
    resetButton.type = 'button';
    resetButton.textContent = 'Reset custom schedule';
    resetButton.disabled = !row.hasDirectScheduleOverride;

    const applyScheduleChange = () => {
        const nextStartWeek = sanitizeStartWeekInputValue(startWeekInput.value);
        const nextDurationValue = sanitizeDurationInputValue(durationInput.value);
        startWeekInput.value = String(nextStartWeek);
        durationInput.value = formatCompactNumber(nextDurationValue);
        onSaveDuration?.(row.id, {
            startWeek: nextStartWeek,
            value: nextDurationValue,
            unit: unitSelect.value
        });
    };

    [startWeekInput, durationInput].forEach((input) => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applyScheduleChange();
            }
        });
    });
    saveButton.addEventListener('click', applyScheduleChange);
    resetButton.addEventListener('click', () => onResetDuration?.(row.id));

    actions.append(saveButton, resetButton);
    section.appendChild(actions);
    return section;
}

function renderDetailPanel(
    target,
    row,
    {
        onClose,
        onSaveDuration,
        onResetDuration,
        onSaveField,
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

    const header = createElement('div', 'gantt-detail-header');
    header.append(
        meta,
        createText('h3', `${row.number} ${row.step}`, 'gantt-detail-title'),
        createText('p', row.task, 'gantt-detail-description')
    );

    const fieldGrid = createElement('div', 'gantt-detail-fields');
    DETAIL_FIELDS.forEach((field) => {
        const rawValue = row.detailFields[field];
        const formattedValue = field === 'Duration'
            ? String(rawValue)
            : field === 'Start week'
                ? `Week ${formatWeekOffset(rawValue)}`
                : rawValue;
        const fieldCard = createElement(
            'div',
            ['Milestone', 'Goal'].includes(field)
                ? 'gantt-detail-field gantt-detail-field--wide'
                : 'gantt-detail-field'
        );
        fieldCard.append(
            createText('span', field, 'gantt-detail-label'),
            createText('span', String(formattedValue), 'gantt-detail-value')
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

    const descriptionEditor = createElement('section', 'gantt-detail-editor');
    descriptionEditor.appendChild(createText('h4', 'Description', 'gantt-detail-extra-title'));
    const descriptionField = createElement('textarea', 'gantt-detail-textarea');
    descriptionField.rows = 5;
    descriptionField.placeholder = 'Add implementation notes, context, or customer-specific details.';
    descriptionField.value = row.description || '';
    descriptionField.setAttribute('aria-label', `Description for ${row.step}`);
    descriptionEditor.appendChild(descriptionField);

    const descriptionActions = createElement('div', 'gantt-detail-editor-actions');
    const saveDescriptionButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
    saveDescriptionButton.type = 'button';
    saveDescriptionButton.textContent = 'Save description';
    saveDescriptionButton.addEventListener('click', () => {
        onSaveField?.(row.id, { description: descriptionField.value });
    });
    const resetDescriptionButton = createElement('button', 'app-button app-button--subtle gantt-detail-action-button');
    resetDescriptionButton.type = 'button';
    resetDescriptionButton.textContent = 'Reset description';
    resetDescriptionButton.addEventListener('click', () => {
        descriptionField.value = row.defaultDescription || '';
        onSaveField?.(row.id, { description: row.defaultDescription || '' });
    });
    descriptionActions.append(saveDescriptionButton, resetDescriptionButton);
    descriptionEditor.appendChild(descriptionActions);

    const extra = createElement('div', 'gantt-detail-extra');
    if (actionBar.childElementCount > 0) {
        extra.appendChild(actionBar);
    }
    extra.appendChild(descriptionEditor);
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
    DETAIL_EXTRA_FIELDS
        .filter((field) => row.detailFields[field] !== undefined && row.detailFields[field] !== '')
        .forEach((field) => {
            const section = createElement('div', 'gantt-detail-extra-section');
            section.append(
                createText('h4', field, 'gantt-detail-extra-title'),
                createText('p', String(row.detailFields[field]), 'gantt-detail-extra-copy')
            );
            extra.appendChild(section);
        });

    card.append(
        closeButton,
        header,
        fieldGrid,
        createDurationEditor(row, { onSaveDuration, onResetDuration }),
        extra
    );
    target.appendChild(card);
}

function setDetailOverlayState(overlay, isOpen) {
    overlay.hidden = !isOpen;
    overlay.classList.toggle('is-open', isOpen);
    overlay.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function createMobileList(rows, onSelect, { collapsedSummaryIds = new Set(), onToggleSummary } = {}) {
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
        button.type = 'button';
        button.dataset.taskId = row.id;
        if (row.isSummary) {
            button.setAttribute('aria-expanded', collapsedSummaryIds.has(row.id) ? 'false' : 'true');
        }

        const titleRow = createElement('span', 'gantt-mobile-item-title-row');
        titleRow.appendChild(createText('span', getRowDisplayLabel(row, collapsedSummaryIds), 'gantt-mobile-item-title'));
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

function renderGanttTab(panel, solutions) {
    let planData = buildGanttPlanData(solutions);
    let taskMap = new Map(planData.rows.map((row) => [row.id, row]));
    currentGanttPlanData = planData;
    const collapsedSummaryIds = new Set();
    const ganttInstanceRef = { current: null, viewMode: GANTT_VIEW_MODES[0].name };

    const shell = createElement('div', 'gantt-planner-shell');
    const summaryHost = createElement('div', 'gantt-summary-host');
    shell.appendChild(summaryHost);

    const controls = createElement('div', 'gantt-toolbar');
    const toolbarCopy = createText(
        'p',
        'Click any task name, owner, duration, status, date, or impact value to edit it inline. Use + Add task for connector-level work, the row + action for subtasks, and the detail panel to update descriptions.',
        'gantt-toolbar-copy'
    );
    const toolbarActions = createElement('div', 'gantt-toolbar-actions');
    const addTaskButton = createElement('button', 'app-button app-button--subtle gantt-toolbar-add');
    addTaskButton.type = 'button';
    addTaskButton.textContent = '+ Add task';
    const toolbarStatus = createElement('span', 'gantt-toolbar-status');
    const resetAllButton = createElement('button', 'app-button gantt-toolbar-reset');
    resetAllButton.type = 'button';
    resetAllButton.textContent = 'Reset all custom schedule';
    toolbarActions.append(addTaskButton, toolbarStatus, resetAllButton, createViewModeToggles(ganttInstanceRef));
    controls.append(toolbarCopy, toolbarActions);
    shell.appendChild(controls);

    const body = createElement('div', 'gantt-layout');
    const tableHost = createElement('div', 'gantt-table-column-host');
    const divider = createElement('div', 'gantt-split-divider');
    const chartColumn = createElement('div', 'gantt-chart-column');
    const chartScroll = createElement('div', 'gantt-chart-scroll');
    const chartHost = createElement('div', 'gantt-chart-host');
    const mobileListHost = createElement('div', 'gantt-mobile-list-host');
    chartScroll.appendChild(chartHost);
    chartColumn.append(chartScroll, mobileListHost);
    body.append(tableHost, divider, chartColumn);
    shell.appendChild(body);
    enableSplitPaneResize(body, divider);

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

    let activeTaskId = '';
    let tableController;
    let mobileListController;

    const getActiveSolutionTask = () => {
        const activeRow = taskMap.get(activeTaskId);
        return activeRow?.solutionId ? activeRow : null;
    };

    const syncToolbarActions = () => {
        const activeRow = getActiveSolutionTask();
        addTaskButton.disabled = !activeRow;
        addTaskButton.title = activeRow
            ? `Add a top-level task to ${activeRow.solutionName || activeRow.step}`
            : 'Open a connector task to add a new task';
    };

    const refreshPlanChrome = () => {
        summaryHost.replaceChildren(createSummaryHeader(planData));
        const customCount = planData.customScheduleCount || 0;
        const persistenceLabel = durationOverridesPersistToStorage ? 'saved to this browser' : 'saved only for this session';
        toolbarStatus.textContent = customCount > 0
            ? `${customCount} custom schedule${customCount === 1 ? '' : 's'} ${persistenceLabel}`
            : durationOverridesPersistToStorage
                ? 'Using default schedule proposal'
                : 'Using default schedule proposal (session only)';
        resetAllButton.disabled = customCount === 0;
        syncToolbarActions();
    };

    const rebuildPlanData = () => {
        planData = buildGanttPlanData(solutions);
        taskMap = new Map(planData.rows.map((row) => [row.id, row]));
        currentGanttPlanData = planData;
        syncExportButtonState(Boolean(planData?.rows?.length));
        refreshPlanChrome();
    };

    const syncActiveTaskState = () => {
        tableController?.setActiveTask(activeTaskId);
        chartHost.querySelectorAll('.bar-wrapper').forEach((wrapper) => {
            wrapper.classList.toggle('is-active', wrapper.getAttribute('data-id') === activeTaskId);
        });
        syncToolbarActions();
    };

    const setHoveredTask = (taskId, isHovered) => {
        if (!taskId) return;
        tableController?.setHoveredTask(taskId, isHovered);
        chartHost.querySelectorAll('.bar-wrapper').forEach((wrapper) => {
            if (wrapper.getAttribute('data-id') === taskId) {
                wrapper.classList.toggle('is-hovered', Boolean(isHovered));
            }
        });
    };

    const clearHoveredTasks = () => {
        tableHost.querySelectorAll('.gantt-table-row.is-hovered').forEach((rowElement) => rowElement.classList.remove('is-hovered'));
        chartHost.querySelectorAll('.bar-wrapper.is-hovered').forEach((wrapper) => wrapper.classList.remove('is-hovered'));
    };

    const closeDetail = () => {
        activeTaskId = '';
        syncActiveTaskState();
        setDetailOverlayState(detailOverlay, false);
        mobileListController?.setActiveTask('');
    };

    const openTaskDetail = (taskId, { focusPanel = true } = {}) => {
        const row = taskMap.get(taskId);
        if (!row) return;
        activeTaskId = taskId;
        syncActiveTaskState();
        mobileListController?.setActiveTask(taskId);
        renderDetailPanel(detailHost, row, {
            onClose: closeDetail,
            onSaveDuration: handleDurationSave,
            onResetDuration: handleDurationReset,
            onSaveField: handleDetailFieldSave,
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

    const handleDurationSave = (taskId, nextSchedule) => {
        const row = taskMap.get(taskId);
        if (!row?.isScheduleEditable) return;
        saveTaskDurationOverride(row, nextSchedule);
        rebuildPlanData();
        renderVisiblePlan();
        openTaskDetail(taskId, { focusPanel: false });
    };

    const handleDurationReset = (taskId) => {
        resetTaskDurationOverride(taskId);
        rebuildPlanData();
        renderVisiblePlan();
        openTaskDetail(taskId, { focusPanel: false });
    };

    const handleInlineScheduleSave = (taskId, nextSchedule) => {
        const row = taskMap.get(taskId);
        if (!row?.isScheduleEditable) return;
        saveTaskDurationOverride(row, nextSchedule);
        rebuildPlanData();
        renderVisiblePlan();
        if (activeTaskId === taskId) {
            openTaskDetail(taskId, { focusPanel: false });
        }
    };

    const handleInlineFieldSave = (taskId, nextFields) => {
        const row = taskMap.get(taskId);
        if (!row) return;
        saveTaskFieldOverride(row, nextFields);
        rebuildPlanData();
        renderVisiblePlan();
        if (activeTaskId === taskId) {
            openTaskDetail(taskId, { focusPanel: false });
        }
    };

    const handleDetailFieldSave = (taskId, nextFields) => {
        const row = taskMap.get(taskId);
        if (!row) return;
        saveTaskFieldOverride(row, nextFields);
        rebuildPlanData();
        renderVisiblePlan();
        openTaskDetail(taskId, { focusPanel: false });
    };

    const handleAddTopLevelTask = (taskId = activeTaskId) => {
        const row = taskMap.get(taskId);
        if (!row?.solutionId) return;
        const newTaskId = addCustomTask(row, { kind: 'top-level' });
        closeDetail();
        clearHoveredTasks();
        rebuildPlanData();
        renderVisiblePlan({ focusInlineField: { taskId: newTaskId, fieldKey: 'name' } });
    };

    const handleAddSubtask = (taskId) => {
        const row = taskMap.get(taskId);
        if (!row?.solutionId || !row.isSummary) return;
        collapsedSummaryIds.delete(row.id);
        const newTaskId = addCustomTask(row, { kind: 'subtask' });
        closeDetail();
        clearHoveredTasks();
        rebuildPlanData();
        renderVisiblePlan({ focusInlineField: { taskId: newTaskId, fieldKey: 'name' } });
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
        renderVisiblePlan();
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
        renderVisiblePlan();
        openTaskDetail(taskId, { focusPanel: false });
    };

    const handleResetAllDurations = () => {
        if (!(planData.customScheduleCount > 0)) return;
        resetAllTaskDurationOverrides();
        closeDetail();
        clearHoveredTasks();
        rebuildPlanData();
        renderVisiblePlan();
    };

    let subtaskToggleTimer = 0;
    let subtaskToggleFrame = 0;
    let isSubtaskToggleAnimating = false;

    const collectSubtaskTransitionElements = (taskId) => {
        const selectorValue = escapeAttributeSelectorValue(taskId);
        return [
            ...tableHost.querySelectorAll(`.gantt-table-row[data-parent-id="${selectorValue}"]`),
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

        renderVisiblePlan();
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

    detailBackdrop.addEventListener('click', closeDetail);
    detailOverlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeDetail();
    });
    detailOverlay.append(detailBackdrop, detailHost);
    addTaskButton.addEventListener('click', () => handleAddTopLevelTask());
    resetAllButton.addEventListener('click', handleResetAllDurations);

    shell.append(detailOverlay);
    panel.appendChild(shell);

    const renderVisiblePlan = ({ focusInlineField } = {}) => {
        const visiblePlan = createVisiblePlanData(planData, collapsedSummaryIds);

        chartHost.__ganttObserver?.disconnect?.();
        chartHost.__ganttScrollSyncCleanup?.();
        tableController?.scroll?.__scrollSyncCleanup?.();
        chartHost.__ganttInstance = null;
        delete chartHost.dataset.timelineHeaderSig;
        chartHost.replaceChildren();

        tableController = createTaskTable(visiblePlan.rows, (taskId) => openTaskDetail(taskId), {
            collapsedSummaryIds,
            onToggleSummary: toggleSummary,
            onHoverTask: setHoveredTask,
            onInlineScheduleSave: handleInlineScheduleSave,
            onInlineFieldSave: handleInlineFieldSave,
            onAddSubtask: handleAddSubtask,
            onDeleteTask: handleDeleteTask,
            projectStartDate: planData.projectStartDate
        });
        tableHost.replaceChildren(tableController.panel);
        if (focusInlineField?.taskId) {
            window.requestAnimationFrame(() => {
                tableController?.openInlineField(focusInlineField.taskId, focusInlineField.fieldKey || 'name');
            });
        }

        mobileListController = createMobileList(visiblePlan.rows, (taskId) => openTaskDetail(taskId), {
            collapsedSummaryIds,
            onToggleSummary: toggleSummary
        });
        mobileListHost.replaceChildren(mobileListController.list);
        mobileListController?.setActiveTask(activeTaskId);

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
                    popup: (ctx) => {
                        const row = visibleRowMap.get(ctx.task.id);
                        if (!row) return false;

                        ctx.set_title(escapeHtml(row.step));
                        ctx.set_subtitle(escapeHtml(`${row.phase} · ${row.status}`));
                        ctx.set_details([
                            `Start: ${row.startDateLabel}`,
                            `Due: ${row.dueDateLabel}`,
                            `Duration: ${row.durationLabel}`,
                            `Owner: ${row.owner}`,
                            `Impact: ${row.impact}`
                        ].map((line) => escapeHtml(line)).join('<br/>'));
                    },
                    on_click: (task) => {
                        if (task?.isSummary) {
                            toggleSummary(task.id);
                            return;
                        }

                        openTaskDetail(task.id);
                    }
                });
                chartHost.__ganttInstance = ganttInstanceRef.current;
                stabilizeGanttRender(chartHost, visiblePlan.tasks, {
                    collapsedSummaryIds,
                    onToggleSummary: toggleSummary,
                    onHoverTask: setHoveredTask,
                    onLayoutChange: ({ rowMetrics, svgHeight, scrollTop }) => {
                        tableController?.updateLayout(rowMetrics, svgHeight);
                        syncSplitPaneScroll(tableController?.scroll, chartHost);
                        if (tableController?.scroll) {
                            tableController.scroll.scrollTop = scrollTop;
                        }
                        syncActiveTaskState();
                    }
                });
            } catch (error) {
                console.error('Failed to initialize Gantt chart:', error);
                mobileListController.list.classList.add('is-fallback-visible');
                chartHost.appendChild(createText('p', 'The Gantt chart could not be rendered. Use the compact plan list below.', 'helper-text'));
            }
            return;
        }

        mobileListController.list.classList.add('is-fallback-visible');
        chartHost.appendChild(createText('p', 'The Gantt library did not load. Use the compact plan list below for the same project details.', 'helper-text'));
    };

    refreshPlanChrome();
    syncToolbarActions();
    renderVisiblePlan();
    return planData;
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
    currentGanttPlanData = null;
    syncExportButtonState(false);
    ensurePlannerWideLayoutObserver();
    if (!container) return null;

    container.replaceChildren();

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

    const tabShell = createElement('div', 'planner-tabs');
    const tabList = createElement('div', 'planner-tab-list');
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Planner views');

    const ganttTabButton = createTabButton('planner-gantt-panel', 'Gantt Chart', true);
    const cardTabButton = createTabButton('planner-cards-panel', 'Task Cards', false);
    tabList.append(ganttTabButton, cardTabButton);

    const ganttPanel = createTabPanel('planner-gantt-panel', true);
    const cardPanel = createTabPanel('planner-cards-panel', false);

    tabShell.append(tabList, ganttPanel, cardPanel);
    container.appendChild(tabShell);

    const planData = renderGanttTab(ganttPanel, solutions);
    currentGanttPlanData = planData;
    syncExportButtonState(Boolean(planData?.rows?.length));

    let cardsRendered = false;
    const activateTab = (target) => {
        [
            [ganttTabButton, ganttPanel, target === 'gantt'],
            [cardTabButton, cardPanel, target === 'cards']
        ].forEach(([button, panel, isActive]) => {
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            panel.hidden = !isActive;
            panel.classList.toggle('active', isActive);
        });

        if (target !== 'gantt') {
            const detailOverlay = ganttPanel.querySelector('.gantt-detail-overlay');
            if (detailOverlay) {
                detailOverlay.hidden = true;
                detailOverlay.classList.remove('is-open');
                detailOverlay.setAttribute('aria-hidden', 'true');
            }
            ganttPanel.querySelectorAll('.gantt-mobile-item.active').forEach((item) => item.classList.remove('active'));
        }

        if (target === 'cards' && !cardsRendered) {
            initPlannerView(solutions, { container: cardPanel });
            cardsRendered = true;
        }
    };

    ganttTabButton.addEventListener('click', () => activateTab('gantt'));
    cardTabButton.addEventListener('click', () => activateTab('cards'));

    return planData;
}

