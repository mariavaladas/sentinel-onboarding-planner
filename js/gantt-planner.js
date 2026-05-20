import { initPlannerView } from './modules/planning.js';
import { calculatePriorityScore, getPhase } from './modules/scoring.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DETAIL_FIELDS = ['Phase', 'Status', 'Milestone', 'Goal', 'Owner', 'Resource Type', 'Start week', 'Duration'];

const PHASE_SEQUENCE = [
    { key: 'readiness', phaseNumber: 1, name: 'Readiness & Planning', className: 'phase-readiness' },
    { key: 'environment', phaseNumber: 2, name: 'Environment Setup', className: 'phase-environment' },
    { key: 'connector', phaseNumber: 3, name: 'Data Connector Configuration', className: 'phase-connector' },
    { key: 'migration', phaseNumber: 4, name: 'Use Case Migration', className: 'phase-migration' },
    { key: 'automation', phaseNumber: 5, name: 'Automation & SOAR', className: 'phase-automation' },
    { key: 'training', phaseNumber: 6, name: 'Training & Handover', className: 'phase-training' },
    { key: 'reporting', phaseNumber: 7, name: 'Reporting and Tracking', className: 'phase-reporting' }
];

const PHASE_BY_KEY = Object.fromEntries(PHASE_SEQUENCE.map((phase) => [phase.key, phase]));
const SOLUTION_PHASE_KEY = { 1: 'connector', 2: 'migration', 3: 'automation' };

function createElement(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
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
    dependencies = [],
    details = {}
}) {
    const phase = PHASE_BY_KEY[phaseKey];
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
        startWeek,
        durationWeeks,
        endWeek: startWeek + durationWeeks,
        dependencies,
        detailFields: {
            Phase: phase.name,
            Status: status,
            Milestone: milestone,
            Goal: goal,
            Owner: owner,
            'Resource Type': resourceType,
            'Start week': startWeek,
            Duration: durationWeeks,
            ...details
        }
    };
}

function getNextNumber(counters, phaseKey) {
    const phase = PHASE_BY_KEY[phaseKey];
    const current = (counters.get(phaseKey) || 0) + 1;
    counters.set(phaseKey, current);
    return `${phase.phaseNumber}.${current}`;
}

function addStandardTasks(rows, counters) {
    rows.push(createRow({
        id: 'task-stakeholder-kickoff',
        phaseKey: 'readiness',
        number: getNextNumber(counters, 'readiness'),
        step: 'Stakeholder Kickoff',
        milestone: 'Success criteria, timeline guardrails, and stakeholders agreed.',
        goal: 'Align delivery expectations before technical work begins.',
        owner: 'Project Lead',
        resourceType: 'Microsoft & Customer',
        task: 'Run the project kickoff, confirm goals, review the selected solutions, and agree weekly cadence.',
        startWeek: 0,
        durationWeeks: 0.5,
        details: {
            'Connector type': 'Program milestone',
            Difficulty: 'easy',
            'Required permissions': 'Project sponsorship and stakeholder availability.'
        }
    }));

    rows.push(createRow({
        id: 'task-define-workspace-topology',
        phaseKey: 'environment',
        number: getNextNumber(counters, 'environment'),
        step: 'Define Workspace Topology',
        milestone: 'Workspace strategy, region choice, and data residency plan approved.',
        goal: 'Set the landing zone for connectors, analytics, and retention.',
        owner: 'Security Admin',
        resourceType: 'Microsoft & Customer',
        task: 'Confirm workspace architecture, region placement, content scope, and the operating model for the onboarding.',
        startWeek: 0,
        durationWeeks: 1,
        details: {
            'Connector type': 'Platform foundation',
            Difficulty: 'moderate',
            'Required permissions': 'Sentinel workspace design authority and Azure subscription context.'
        }
    }));

    rows.push(createRow({
        id: 'task-rbac-security-groups',
        phaseKey: 'environment',
        number: getNextNumber(counters, 'environment'),
        step: 'RBAC & Security Groups',
        milestone: 'Administrative roles, access groups, and approvals are in place.',
        goal: 'Ensure every onboarding task has the right customer-side access path.',
        owner: 'Security Admin',
        resourceType: 'Customer',
        task: 'Create or validate the required RBAC assignments, security groups, and approval workflow for connector onboarding.',
        startWeek: 1,
        durationWeeks: 1,
        details: {
            'Connector type': 'Platform foundation',
            Difficulty: 'moderate',
            'Required permissions': 'Azure RBAC, Microsoft Sentinel Contributor, and tenant approval flow.'
        }
    }));
}

function createGanttTask(row, projectStartDate) {
    const start = new Date(projectStartDate.getTime() + (row.startWeek * WEEK_MS));
    const end = new Date(projectStartDate.getTime() + (row.endWeek * WEEK_MS));
    const safeEnd = end > start ? end : new Date(start.getTime() + DAY_MS);

    return {
        id: row.id,
        name: `${row.number} ${row.step}`,
        start,
        end: safeEnd,
        progress: row.status === 'Completed' ? 100 : 0,
        dependencies: row.dependencies.join(','),
        custom_class: `${PHASE_BY_KEY[row.phaseKey].className} status-${row.status.toLowerCase()}`
    };
}

export function buildGanttPlanData(selectedSolutions = []) {
    const solutions = [...selectedSolutions];
    const rows = [];
    const counters = new Map();

    addStandardTasks(rows, counters);

    let previousPhaseEnd = 2;
    let previousPhaseTerminalIds = ['task-rbac-security-groups'];

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

        const groupedByCategory = phaseSolutions.reduce((groups, solution) => {
            const category = getSolutionGroup(solution);
            if (!groups.has(category)) {
                groups.set(category, []);
            }
            groups.get(category).push(solution);
            return groups;
        }, new Map());

        const laneEnds = new Map();
        const categoryTerminalIds = [];
        let phaseEnd = previousPhaseEnd;

        [...groupedByCategory.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .forEach(([category, categorySolutions]) => {
                laneEnds.set(category, previousPhaseEnd);
                let previousTaskId = null;

                categorySolutions.forEach((solution) => {
                    const durationWeeks = getDurationWeeks(solution);
                    const startWeek = laneEnds.get(category) || previousPhaseEnd;
                    const ownerModel = getOwnerModel(solution);
                    const row = createRow({
                        id: `task-${solution.id}`,
                        phaseKey,
                        number: getNextNumber(counters, phaseKey),
                        step: solution.name,
                        milestone: getMilestone(solution),
                        goal: getGoal(solution),
                        owner: ownerModel.owner,
                        resourceType: ownerModel.resourceType,
                        task: getTaskDescription(solution),
                        startWeek,
                        durationWeeks,
                        dependencies: previousTaskId
                            ? [previousTaskId]
                            : [...previousPhaseTerminalIds],
                        details: {
                            'Connector type': category,
                            Difficulty: getDifficultyLabel(solution),
                            'Required permissions': getPermissionSummary(solution)
                        }
                    });

                    rows.push(row);
                    previousTaskId = row.id;
                    laneEnds.set(category, row.endWeek);
                    phaseEnd = Math.max(phaseEnd, row.endWeek);
                });

                if (previousTaskId) {
                    categoryTerminalIds.push(previousTaskId);
                }
            });

        previousPhaseEnd = phaseEnd;
        previousPhaseTerminalIds = categoryTerminalIds.length > 0 ? categoryTerminalIds : previousPhaseTerminalIds;
    });

    const trainingRow = createRow({
        id: 'task-training-handover',
        phaseKey: 'training',
        number: getNextNumber(counters, 'training'),
        step: 'Training & Handover',
        milestone: 'SOC users trained, admin runbook reviewed, and ownership transferred.',
        goal: 'Prepare the customer team to operate the new onboarding outcomes independently.',
        owner: 'SOC Engineer',
        resourceType: 'Microsoft & Customer',
        task: 'Deliver enablement sessions, hand over the runbook, and confirm support pathways for the onboarded solutions.',
        startWeek: previousPhaseEnd,
        durationWeeks: 2,
        dependencies: [...previousPhaseTerminalIds],
        details: {
            'Connector type': 'Enablement',
            Difficulty: 'moderate',
            'Required permissions': 'Customer operators available for walkthroughs and validation signoff.'
        }
    });
    rows.push(trainingRow);

    const goLiveRow = createRow({
        id: 'task-go-live-monitoring',
        phaseKey: 'reporting',
        number: getNextNumber(counters, 'reporting'),
        step: 'Go-Live & Monitoring',
        milestone: 'Operational dashboards, monitoring checks, and escalation paths confirmed.',
        goal: 'Stabilize the onboarding and confirm post-deployment visibility.',
        owner: 'SOC Engineer',
        resourceType: 'Microsoft & Customer',
        task: 'Run go-live validation, review monitoring dashboards, and agree the first improvement backlog after onboarding.',
        startWeek: trainingRow.endWeek,
        durationWeeks: 1,
        dependencies: [trainingRow.id],
        details: {
            'Connector type': 'Operations',
            Difficulty: 'easy',
            'Required permissions': 'Workspace access for dashboards, incidents, and monitoring queries.'
        }
    });
    rows.push(goLiveRow);

    const projectStartDate = getProjectStartDate();
    const tasks = rows.map((row) => createGanttTask(row, projectStartDate));
    const totalDurationWeeks = rows.reduce((maxEnd, row) => Math.max(maxEnd, row.endWeek), 0);
    const phaseBreakdown = PHASE_SEQUENCE.map((phase) => {
        const phaseRows = rows.filter((row) => row.phaseKey === phase.key);
        const phaseEnd = phaseRows.reduce((maxEnd, row) => Math.max(maxEnd, row.endWeek), 0);
        const phaseStart = phaseRows.length > 0
            ? phaseRows.reduce((minStart, row) => Math.min(minStart, row.startWeek), phaseRows[0].startWeek)
            : 0;

        return {
            key: phase.key,
            name: phase.name,
            count: phaseRows.length,
            durationWeeks: phaseRows.length > 0 ? phaseEnd - phaseStart : 0
        };
    }).filter((phase) => phase.count > 0);

    const exportRows = rows.map((row) => ({
        '#': row.number,
        Phase: row.phase,
        Status: row.status,
        Step: row.step,
        Milestone: row.milestone,
        Goal: row.goal,
        Owner: row.owner,
        'Resource Type': row.resourceType,
        Task: row.task,
        'Start week': row.startWeek,
        Duration: row.durationWeeks
    }));

    return {
        projectStartDate,
        tasks,
        rows,
        exportRows,
        totalDurationWeeks,
        totalTasks: rows.length,
        phaseBreakdown,
        selectedSolutionCount: solutions.length
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

    ['Day', 'Week', 'Month'].forEach((mode, index) => {
        const button = createElement('button', 'gantt-view-mode-button');
        button.type = 'button';
        button.textContent = mode;
        button.setAttribute('aria-pressed', index === 1 ? 'true' : 'false');
        if (index === 1) button.classList.add('active');
        button.addEventListener('click', () => {
            toggleGroup.querySelectorAll('.gantt-view-mode-button').forEach((item) => {
                item.classList.remove('active');
                item.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            ganttInstanceRef.current?.change_view_mode(mode);
        });
        toggleGroup.appendChild(button);
    });

    return toggleGroup;
}

function renderDetailPanel(target, row) {
    target.replaceChildren();

    const card = createElement('aside', 'gantt-detail-card');
    card.append(
        createText('h3', `${row.number} ${row.step}`, 'gantt-detail-title'),
        createText('p', row.task, 'gantt-detail-description')
    );

    const list = createElement('dl', 'gantt-detail-grid');
    DETAIL_FIELDS.forEach((field) => {
        const dt = createText('dt', field, 'gantt-detail-label');
        const rawValue = row.detailFields[field];
        const formattedValue = field === 'Duration'
            ? formatWeeks(rawValue)
            : field === 'Start week'
                ? `Week ${rawValue}`
                : rawValue;
        const dd = createText('dd', String(formattedValue), 'gantt-detail-value');
        list.append(dt, dd);
    });

    card.appendChild(list);

    const extra = createElement('div', 'gantt-detail-extra');
    ['Connector type', 'Difficulty', 'Required permissions'].forEach((field) => {
        const section = createElement('div', 'gantt-detail-extra-section');
        section.append(
            createText('h4', field, 'gantt-detail-extra-title'),
            createText('p', String(row.detailFields[field] || 'n/a'), 'gantt-detail-extra-copy')
        );
        extra.appendChild(section);
    });

    card.appendChild(extra);
    target.appendChild(card);
}

function createMobileList(planData, onSelect) {
    const list = createElement('div', 'gantt-mobile-list');

    planData.rows.forEach((row, index) => {
        const button = createElement('button', 'gantt-mobile-item');
        button.type = 'button';
        button.dataset.taskId = row.id;
        if (index === 0) button.classList.add('active');
        button.append(
            createText('span', `${row.number} ${row.step}`, 'gantt-mobile-item-title'),
            createText('span', `${row.phase} · Week ${row.startWeek} · ${formatWeeks(row.durationWeeks)}`, 'gantt-mobile-item-meta')
        );
        button.addEventListener('click', () => {
            list.querySelectorAll('.gantt-mobile-item').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            onSelect(row.id);
        });
        list.appendChild(button);
    });

    return list;
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
    const planData = buildGanttPlanData(solutions);
    const taskMap = new Map(planData.rows.map((row) => [row.id, row]));
    const ganttInstanceRef = { current: null };

    const shell = createElement('div', 'gantt-planner-shell');
    shell.appendChild(createSummaryHeader(planData));

    const controls = createElement('div', 'gantt-toolbar');
    controls.append(
        createText('p', 'Switch between time scales, scroll horizontally on larger screens, or use the compact list on mobile.', 'gantt-toolbar-copy'),
        createViewModeToggles(ganttInstanceRef)
    );
    shell.appendChild(controls);

    const body = createElement('div', 'gantt-layout');
    const chartColumn = createElement('div', 'gantt-chart-column');
    const chartScroll = createElement('div', 'gantt-chart-scroll');
    const chartHost = createElement('div', 'gantt-chart-host');
    chartScroll.appendChild(chartHost);
    chartColumn.appendChild(chartScroll);

    const detailColumn = createElement('div', 'gantt-detail-column');
    const detailHost = createElement('div', 'gantt-detail-host');
    const handleTaskSelection = (taskId) => {
        const row = taskMap.get(taskId);
        if (row) renderDetailPanel(detailHost, row);
    };

    detailColumn.append(
        createText('h3', 'Task details', 'gantt-side-heading'),
        createText('p', 'Select any task to review the milestone, goal, owner, and permissions needed for that step.', 'gantt-side-copy'),
        detailHost,
        createText('h3', 'Compact plan', 'gantt-side-heading gantt-side-heading--mobile'),
        createMobileList(planData, handleTaskSelection)
    );

    body.append(chartColumn, detailColumn);
    shell.appendChild(body);
    panel.appendChild(shell);

    renderDetailPanel(detailHost, planData.rows[0]);

    if (typeof window.Gantt === 'function') {
        ganttInstanceRef.current = new window.Gantt(chartHost, planData.tasks, {
            view_mode: 'Week',
            readonly: true,
            bar_height: 28,
            padding: 18,
            language: 'en',
            on_click: (task) => handleTaskSelection(task.id)
        });
    } else {
        chartHost.appendChild(createText('p', 'The Gantt library did not load. Use the compact plan list for the same project details.', 'helper-text'));
    }

    return planData;
}

export function initGanttPlanner(solutions = []) {
    const container = document.getElementById('plannerView');
    if (!container) return null;

    container.replaceChildren();

    if (solutions.length === 0) {
        const empty = createElement('div', 'planner-empty-state');
        empty.append(
            createText('div', '📋', 'planner-empty-icon'),
            createText('h3', 'No solutions selected'),
            createText('p', 'Go back and select at least one solution to generate the Gantt plan.', 'helper-text')
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

    const planData = renderGanttTab(ganttPanel, solutions);

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

        if (target === 'cards' && !cardsRendered) {
            initPlannerView(solutions, { container: cardPanel });
            cardsRendered = true;
        }
    };

    ganttTabButton.addEventListener('click', () => activateTab('gantt'));
    cardTabButton.addEventListener('click', () => activateTab('cards'));

    tabShell.append(tabList, ganttPanel, cardPanel);
    container.appendChild(tabShell);

    return planData;
}
