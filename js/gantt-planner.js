import { initPlannerView } from './modules/planning.js';
import { calculatePriorityScore, getPhase } from './modules/scoring.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOURS_PER_DAY = 8;
const DAYS_PER_WEEK = 5;
const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK;
const DURATION_OVERRIDE_STORAGE_KEY = 'sentinelPlanner.taskDurationOverrides.v1';
const START_WEEK_MIN = 1;
const DURATION_VALUE_PRESETS = [0.5, 1, 2, 3];
const DURATION_UNITS = ['hours', 'days', 'weeks'];
const DETAIL_FIELDS = ['Solution', 'Task type', 'Milestone', 'Goal', 'Owner', 'Resource Type', 'Start week', 'Duration'];
const DETAIL_EXTRA_FIELDS = ['Connector type', 'Difficulty', 'Required permissions', 'Parent task', 'Effort (hours)', 'Optional'];
const MIN_TASK_DURATION_WEEKS = 0.0125;
const SUMMARY_EXPANDED_PREFIX = '▾';
const SUMMARY_COLLAPSED_PREFIX = '▸';
const SUBTASK_INDENT_PREFIX = ' └ ';
const CLEAN_EFFORT_HOURS = [0.5, 1, 2, 3];
const GANTT_TABLE_ROW_FALLBACK_HEIGHT = 50;
const GANTT_TABLE_DESCRIPTION_LIMIT = 84;
const PLANNER_WIDE_LAYOUT_CLASS = 'planner-step-expanded';

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
    'phase-setup':    '#90EE90',
    'phase-1':        '#FFB347',
    'phase-2':        '#FFB6C1',
    'phase-3':        '#FFEB3B',
    'phase-closeout': '#D8B4FE'
};

let currentGanttPlanData = null;
let durationOverrideState = null;
let durationOverridesPersistToStorage = true;

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

function getOwnerModel(solution = {}) {
    const privilegeLevel = solution?.permissions?.privilege_level || '';
    if (privilegeLevel === 'high') {
        return { owner: 'Security Admin', resourceType: 'Microsoft & Customer' };
    }
    if (privilegeLevel === 'medium') {
        return { owner: 'SOC Engineer', resourceType: 'Customer' };
    }
    if (privilegeLevel === 'low') {
        return { owner: 'IT Admin', resourceType: 'Customer' };
    }

    const recommended = solution?.planner?.owner_recommended || '';
    if (/security|global/i.test(recommended)) {
        return { owner: recommended || 'Security Admin', resourceType: 'Microsoft & Customer' };
    }
    if (/soc|analyst/i.test(recommended)) {
        return { owner: recommended || 'SOC Engineer', resourceType: 'Customer' };
    }
    if (/network/i.test(recommended)) {
        return { owner: recommended || 'Network Admin', resourceType: 'Customer' };
    }

    const complexity = Number(solution?.value_scoring?.complexity_level) || 1;
    if (complexity >= 4) return { owner: 'Security Admin', resourceType: 'Microsoft & Customer' };
    if (complexity >= 2) return { owner: 'SOC Engineer', resourceType: 'Customer' };
    return { owner: recommended || 'Cloud Admin', resourceType: 'Customer' };
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

function sanitizeDurationInputValue(value) {
    return Math.max(0.5, roundToHalfStep(value));
}

function sanitizeStartWeekInputValue(value) {
    return Math.max(START_WEEK_MIN, Math.ceil(Number(value) || START_WEEK_MIN));
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

function createDurationPresentation({ businessHours = 0, preferredUnit } = {}) {
    const safeHours = roundDurationHours(Math.max(Number(businessHours) || 0, MIN_TASK_DURATION_WEEKS * HOURS_PER_WEEK));
    const unit = normalizeDurationUnit(preferredUnit || inferDurationUnitFromBusinessHours(safeHours));
    const value = getDurationValueForUnit(safeHours, unit);
    const normalizedHours = durationValueToBusinessHours(value, unit);

    return {
        value,
        unit,
        label: formatDurationLabel(value, unit),
        businessHours: normalizedHours,
        durationWeeks: businessHoursToWeeks(normalizedHours)
    };
}

function createEmptyDurationOverrideState() {
    return {
        version: 2,
        savedAt: '',
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: {}
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
            version: 2,
            overrides: parsed?.overrides && typeof parsed.overrides === 'object'
                ? parsed.overrides
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

    if (isDurationEditable && taskId && durationOverrides?.[taskId]) {
        const overrideEntry = durationOverrides[taskId];
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
        const isSameAsDefault = overrideStartWeek == safeDefaultStartWeek;

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
    const isDefaultStartWeek = normalizedStartWeek === defaultStartWeek;

    if (isDefaultDuration && isDefaultStartWeek) {
        delete overrides[row.id];
    } else {
        const nextEntry = {
            ...existingEntry,
            taskId: row.id,
            connectorId: row.solutionId || 'shared',
            taskLabel: row.step,
            originalDuration: row.defaultDuration.value,
            originalUnit: row.defaultDuration.unit,
            originalStartWeek: defaultStartWeek,
            updatedAt
        };

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

        overrides[row.id] = nextEntry;
    }

    persistDurationOverrideState({
        ...state,
        version: 2,
        savedAt: updatedAt,
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides
    });

    return overrides;
}

function resetTaskDurationOverride(taskId) {
    if (!taskId) return getDurationOverrideEntries();
    const state = getDurationOverrideState();
    const overrides = { ...(state.overrides || {}) };
    delete overrides[taskId];

    persistDurationOverrideState({
        ...state,
        version: 2,
        savedAt: new Date().toISOString(),
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides
    });

    return overrides;
}

function resetAllTaskDurationOverrides() {
    const state = getDurationOverrideState();
    persistDurationOverrideState({
        ...state,
        version: 2,
        savedAt: new Date().toISOString(),
        workingHoursPerDay: HOURS_PER_DAY,
        workingDaysPerWeek: DAYS_PER_WEEK,
        overrides: {}
    });
    return {};
}

function getCustomDurationBadgeLabel(row = {}) {
    if (row?.hasDirectScheduleOverride) return 'Custom';
    if (row?.hasDerivedCustomSchedule) return 'Derived';
    return '';
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
        return `${SUBTASK_INDENT_PREFIX}${row.step}`;
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
    status = 'Not-started',
    step,
    milestone,
    goal,
    owner,
    resourceType,
    task,
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
    solutionName = ''
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

    return {
        id,
        number,
        phaseKey,
        phase: phase.name,
        status,
        step,
        milestone,
        goal,
        owner,
        resourceType,
        task,
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
            Owner: owner,
            'Resource Type': resourceType,
            'Start week': safeStartWeek,
            Duration: resolvedDurationState.effectiveDuration.label,
            ...details,
            'Effort (hours)': safeEffortHours
        }
    };
}

function getNextNumber(counters, phaseKey) {
    const phase = PHASE_BY_KEY[phaseKey];
    const current = (counters.get(phaseKey) || 0) + 1;
    counters.set(phaseKey, current);
    return `${phase.phaseNumber}.${current}`;
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
        owner: 'Project Lead',
        resourceType: 'Microsoft & Customer',
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
        owner: 'Security Admin',
        resourceType: 'Microsoft & Customer',
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
        owner: 'Security Admin',
        resourceType: 'Customer',
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
    const start = new Date(projectStartDate.getTime() + ((row.startWeek - START_WEEK_MIN) * WEEK_MS));
    const end = new Date(projectStartDate.getTime() + ((row.endWeek - START_WEEK_MIN) * WEEK_MS));
    const safeEnd = end > start ? end : new Date(start.getTime() + DAY_MS);

    const className = PHASE_BY_KEY[row.phaseKey].className;
    const baseColor = PHASE_BAR_COLOR[className];

    return {
        id: row.id,
        name: getRowDisplayLabel(row, collapsedSummaryIds),
        start,
        end: safeEnd,
        progress: row.status === 'Completed' ? 100 : 0,
        dependencies: row.dependencies.join(','),
        custom_class: className,
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
    durationOverrides = {}
}) {
    const orderedTasks = sortByOrder(solution?.planner?.setup_tasks || []);
    const ownerModel = getOwnerModel(solution);
    const category = getSolutionGroup(solution);
    const solutionGoal = getGoal(solution);
    const solutionMilestone = getMilestone(solution);
    const difficulty = getDifficultyLabel(solution);
    const requiredPermissions = getPermissionSummary(solution);

    if (orderedTasks.length === 0) {
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
            owner: ownerModel.owner,
            resourceType: ownerModel.resourceType,
            task: getTaskDescription(solution),
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

        return {
            rows: [row],
            terminalRowId: row.id,
            endWeek: row.endWeek
        };
    }

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

        return { ...task, id: originalId, rowId, subtasks };
    });

    const taskDurations = allocateDurations(getDurationWeeks(solution), normalizedTasks, getTaskEffortHours);
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
                    number: `${taskNumber}.${subIndex + 1}`,
                    step: subtask.task || `Subtask ${subIndex + 1}`,
                    milestone: solutionMilestone,
                    goal: task.task || solutionGoal,
                    owner: ownerModel.owner,
                    resourceType: ownerModel.resourceType,
                    task: `Subtask of ${task.task || solution.name}.`,
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
                owner: ownerModel.owner,
                resourceType: ownerModel.resourceType,
                task: `${solution.name} summary row for ${task.task || 'setup work'}.`,
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
            builtRows.push(summaryRow, ...subRows)
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
            owner: ownerModel.owner,
            resourceType: ownerModel.resourceType,
            task: task.task || solutionGoal,
            startWeek: taskStartWeekState.effectiveStartWeek,
            durationWeeks: taskDurationState.effectiveDuration.durationWeeks,
            durationHours: getTaskEffortHours(task),
            durationState: taskDurationState,
            startWeekState: taskStartWeekState,
            dependencies: parentDependencies,
            details: {
                'Solution': solution.name,
                'Task type': 'Main task',
                'Connector type': category,
                'Difficulty': difficulty,
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
                durationOverrides
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
        owner: 'SOC Engineer',
        resourceType: 'Microsoft & Customer',
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
        owner: 'SOC Engineer',
        resourceType: 'Microsoft & Customer',
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
    const tasks = rows.map((row) => createGanttTask(row, projectStartDate));
    const latestEndWeek = rows.reduce((maxEnd, row) => Math.max(maxEnd, row.endWeek), START_WEEK_MIN);
    const totalDurationWeeks = Math.max(0, roundWeekPrecision(latestEndWeek - START_WEEK_MIN));
    const phaseBreakdown = PHASE_SEQUENCE.map((phase) => {
        const phaseRows = rows.filter((row) => row.phaseKey === phase.key);
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

    const exportRows = rows.map((row) => ({
        '#': row.number,
        Phase: row.phase,
        Status: row.status,
        Step: formatExportStepLabel(row),
        Milestone: row.milestone,
        Goal: row.goal,
        Owner: row.owner,
        'Resource Type': row.resourceType,
        Task: row.task,
        'Start week': formatWeekOffset(row.startWeek),
        'Default start week': formatWeekOffset(row.defaultStartWeek),
        Duration: row.durationLabel,
        'Default duration': row.defaultDurationLabel,
        'Custom schedule': row.hasDirectScheduleOverride ? 'Yes' : row.hasDerivedCustomSchedule ? 'Derived' : 'No'
    }));

    const customScheduleCount = rows.filter((row) => row.hasDirectScheduleOverride).length;

    return {
        projectStartDate,
        tasks,
        rows,
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

    ['Day', 'Week', 'Month'].forEach((mode) => {
        const isActive = (ganttInstanceRef.viewMode || 'Week') === mode;
        const button = createElement('button', 'gantt-view-mode-button');
        button.type = 'button';
        button.textContent = mode;
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (isActive) button.classList.add('active');
        button.addEventListener('click', () => {
            toggleGroup.querySelectorAll('.gantt-view-mode-button').forEach((item) => {
                item.classList.remove('active');
                item.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            ganttInstanceRef.viewMode = mode;
            ganttInstanceRef.current?.change_view_mode(mode);
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
    const source = row.isSummary
        ? row.goal || row.task || row.milestone
        : row.task || row.goal || row.milestone;
    return truncateText(source);
}

function createTaskTable(rows, onSelect, { collapsedSummaryIds = new Set(), onToggleSummary, onHoverTask } = {}) {
    const panel = createElement('section', 'gantt-table-panel');
    const header = createElement('div', 'gantt-table-header');
    [
        ['Task Name', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--task'],
        ['Description', 'gantt-table-cell gantt-table-header-cell'],
        ['Start', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--start'],
        ['Duration', 'gantt-table-cell gantt-table-header-cell gantt-table-header-cell--duration'],
        ['Owner', 'gantt-table-cell gantt-table-header-cell']
    ].forEach(([label, className]) => {
        header.appendChild(createText('div', label, className));
    });

    const scroll = createElement('div', 'gantt-table-scroll');
    const surface = createElement('div', 'gantt-table-surface');
    scroll.appendChild(surface);
    panel.append(header, scroll);

    const rowElements = new Map();

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
            const rowElement = createElement('div', 'gantt-table-row');
            if (row.isSummary) rowElement.classList.add('gantt-table-row--summary');
            if (row.parentId) rowElement.classList.add('gantt-table-row--subtask');
            if (row.isCustomSchedule) rowElement.classList.add('has-custom-duration');
            if (row.hasDerivedCustomSchedule) rowElement.classList.add('has-derived-custom-duration');
            rowElement.dataset.taskId = row.id;
            rowElement.style.top = `${top}px`;
            rowElement.style.height = `${height}px`;
            rowElement.style.setProperty('--phase-accent', PHASE_BAR_COLOR[PHASE_BY_KEY[row.phaseKey].className] || '#50E6FF');
            rowElement.setAttribute('role', 'button');
            rowElement.tabIndex = 0;
            rowElement.setAttribute('aria-label', `Open details for ${row.step}`);

            const taskCell = createElement('div', 'gantt-table-cell gantt-table-cell--task');
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
                taskCell.appendChild(toggle);
            } else {
                taskCell.appendChild(createElement('span', 'gantt-table-toggle-spacer'));
            }
            taskCell.appendChild(createText('span', `${row.number} ${row.step}`, 'gantt-table-task-label'));
            const badgeLabel = getCustomDurationBadgeLabel(row);
            if (badgeLabel) {
                taskCell.appendChild(createText('span', badgeLabel, 'gantt-table-badge gantt-table-badge--custom'));
            }

            const descriptionCell = createText('div', getTaskTableDescription(row), 'gantt-table-cell gantt-table-description');
            const startCell = createText('div', `W${formatWeekOffset(row.startWeek)}`, 'gantt-table-cell gantt-table-start');
            const durationCell = createText('div', row.durationLabel, 'gantt-table-cell gantt-table-duration');
            const ownerCell = createText('div', row.owner || 'TBD', 'gantt-table-cell gantt-table-owner');

            rowElement.append(taskCell, descriptionCell, startCell, durationCell, ownerCell);

            const activateRow = () => onSelect(row.id);

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

function stabilizeGanttRender(
    chartHost,
    tasks,
    { collapsedSummaryIds = new Set(), onToggleSummary, onLayoutChange, onHoverTask } = {}
) {
    if (!chartHost) return;

    chartHost.__ganttObserver?.disconnect?.();

    const taskById = new Map(tasks.map((task) => [task.id, task]));
    let frameHandle = 0;

    const inspect = () => {
        frameHandle = 0;

        const container = chartHost.querySelector('.gantt-container');
        const svg = chartHost.querySelector('svg.gantt');
        if (!container || !svg) return;

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
            const label = wrapper.querySelector('.bar-label');

            wrapper.classList.toggle('gantt-summary-task', Boolean(task?.isSummary));
            wrapper.classList.toggle('gantt-subtask', Boolean(task?.isSubtask));
            wrapper.classList.toggle('is-collapsed', Boolean(task?.isSummary && collapsedSummaryIds.has(task.id)));
            wrapper.classList.toggle('has-custom-duration', Boolean(task?.hasCustomSchedule));
            wrapper.classList.toggle('has-derived-custom-duration', Boolean(task?.hasDerivedCustomSchedule));
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
                rect.dataset.baseY = String(baseY);
                rect.dataset.baseHeight = String(baseHeight);

                const nextHeight = task?.isSubtask ? Math.max(20, baseHeight - 8) : baseHeight;
                const nextY = task?.isSubtask ? baseY + ((baseHeight - nextHeight) / 2) : baseY;

                rect.setAttribute('y', String(nextY));
                rect.setAttribute('height', String(nextHeight));
                if (task?.color) rect.style.setProperty('fill', task.color, 'important');
                rect.style.setProperty('opacity', '1', 'important');
                rect.style.setProperty('fill-opacity', '1', 'important');
                rect.style.setProperty('stroke', 'rgba(0, 0, 0, 0.22)', 'important');
                rect.style.setProperty('stroke-width', task?.isSummary ? '1.5' : '1.2');

                if (progressRect) {
                    const progressBaseY = Number(progressRect.dataset.baseY || progressRect.getAttribute('y') || baseY);
                    progressRect.dataset.baseY = String(progressBaseY);
                    progressRect.setAttribute('y', String(nextY));
                    progressRect.setAttribute('height', String(nextHeight));
                }
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
                }
            }

            const bbox = rect && typeof rect.getBBox === 'function' ? rect.getBBox() : null;
            return {
                id,
                className: wrapper.getAttribute('class') || '',
                x: bbox?.x ?? null,
                y: bbox?.y ?? null,
                width: bbox?.width ?? null,
                height: bbox?.height ?? null,
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
    startWeekInput.step = '1';
    startWeekInput.inputMode = 'numeric';
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

function renderDetailPanel(target, row, { onClose, onSaveDuration, onResetDuration } = {}) {
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

    const extra = createElement('div', 'gantt-detail-extra');
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
            createText('span', `${row.phase} · Week ${formatWeekOffset(row.startWeek)} · ${row.durationLabel}`, 'gantt-mobile-item-meta')
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
    const ganttInstanceRef = { current: null, viewMode: 'Week' };

    const shell = createElement('div', 'gantt-planner-shell');
    const summaryHost = createElement('div', 'gantt-summary-host');
    shell.appendChild(summaryHost);

    const controls = createElement('div', 'gantt-toolbar');
    const toolbarCopy = createText(
        'p',
        'Click a task row or bar to edit start week and duration. Untouched tasks keep auto-shifting; custom start weeks stay pinned.',
        'gantt-toolbar-copy'
    );
    const toolbarActions = createElement('div', 'gantt-toolbar-actions');
    const toolbarStatus = createElement('span', 'gantt-toolbar-status');
    const resetAllButton = createElement('button', 'app-button gantt-toolbar-reset');
    resetAllButton.type = 'button';
    resetAllButton.textContent = 'Reset all custom schedule';
    toolbarActions.append(toolbarStatus, resetAllButton, createViewModeToggles(ganttInstanceRef));
    controls.append(toolbarCopy, toolbarActions);
    shell.appendChild(controls);

    const body = createElement('div', 'gantt-layout');
    const tableHost = createElement('div', 'gantt-table-column-host');
    const divider = createElement('div', 'gantt-split-divider');
    divider.setAttribute('aria-hidden', 'true');
    const chartColumn = createElement('div', 'gantt-chart-column');
    const chartScroll = createElement('div', 'gantt-chart-scroll');
    const chartHost = createElement('div', 'gantt-chart-host');
    const mobileListHost = createElement('div', 'gantt-mobile-list-host');
    chartScroll.appendChild(chartHost);
    chartColumn.append(chartScroll, mobileListHost);
    body.append(tableHost, divider, chartColumn);
    shell.appendChild(body);

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
            onResetDuration: handleDurationReset
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

    const handleResetAllDurations = () => {
        if (!(planData.customScheduleCount > 0)) return;
        resetAllTaskDurationOverrides();
        closeDetail();
        clearHoveredTasks();
        rebuildPlanData();
        renderVisiblePlan();
    };

    const toggleSummary = (taskId) => {
        if (collapsedSummaryIds.has(taskId)) {
            collapsedSummaryIds.delete(taskId);
        } else {
            collapsedSummaryIds.add(taskId);
        }

        closeDetail();
        clearHoveredTasks();
        renderVisiblePlan();
    };

    detailBackdrop.addEventListener('click', closeDetail);
    detailOverlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeDetail();
    });
    detailOverlay.append(detailBackdrop, detailHost);
    resetAllButton.addEventListener('click', handleResetAllDurations);

    shell.append(detailOverlay);
    panel.appendChild(shell);

    const renderVisiblePlan = () => {
        const visiblePlan = createVisiblePlanData(planData, collapsedSummaryIds);

        chartHost.__ganttObserver?.disconnect?.();
        chartHost.__ganttScrollSyncCleanup?.();
        tableController?.scroll?.__scrollSyncCleanup?.();
        chartHost.replaceChildren();

        tableController = createTaskTable(visiblePlan.rows, (taskId) => openTaskDetail(taskId), {
            collapsedSummaryIds,
            onToggleSummary: toggleSummary,
            onHoverTask: setHoveredTask
        });
        tableHost.replaceChildren(tableController.panel);

        mobileListController = createMobileList(visiblePlan.rows, (taskId) => openTaskDetail(taskId), {
            collapsedSummaryIds,
            onToggleSummary: toggleSummary
        });
        mobileListHost.replaceChildren(mobileListController.list);
        mobileListController?.setActiveTask(activeTaskId);

        if (typeof window.Gantt === 'function') {
            try {
                ganttInstanceRef.current = new window.Gantt(chartHost, visiblePlan.tasks, {
                    view_mode: ganttInstanceRef.viewMode || 'Week',
                    readonly: true,
                    bar_height: 32,
                    padding: 18,
                    language: 'en',
                    on_click: (task) => openTaskDetail(task.id)
                });
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
