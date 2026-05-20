// STATE FLOW: Wizard selections (selectedSolutions Set in app.js) → initPlannerView(solutions)
// INVALIDATION: If user navigates back and changes selections, planner MUST be re-rendered.
// The wizard module calls initPlannerView() on every Step 4 entry, passing current selections.
// This is a full re-render (no incremental update) — planner state is always derived, never cached.

import { calculatePriorityScore, getEstimatedSetupHours, getPhase, sortByScore } from './scoring.js';

// Phase badge colour tokens — inline style only (no new CSS vars needed)
const PHASE_STYLE = {
    'Phase 1': { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)', color: '#10B981' },
    'Phase 2': { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.4)',  color: '#F59E0B' },
    'Phase 3': { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.4)',  color: '#8B5CF6' },
};

// --- Safe DOM helpers (never use innerHTML with solution data) ---

function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
}

function text(tag, content, className) {
    const node = el(tag, className);
    node.textContent = content;
    return node;
}

// --- Badges ---

function phaseBadge(phase) {
    const s = PHASE_STYLE[phase] || PHASE_STYLE['Phase 3'];
    const badge = text('span', phase, 'planner-badge planner-badge--phase');
    badge.style.cssText = `background:${s.bg};border-color:${s.border};color:${s.color}`;
    return badge;
}

function scoreBadge(score) {
    return text('span', `Score: ${score}`, 'planner-badge planner-badge--score');
}

function effortBadge(hours) {
    return text('span', `~${Math.round(hours)}h`, 'planner-badge planner-badge--effort');
}

// --- Task card (one per solution, collapsible) ---

function createTaskCard(solution) {
    const phase = getPhase(solution);
    const score = calculatePriorityScore(solution);
    const hours = getEstimatedSetupHours(solution);

    const card = el('div', 'planner-task-card');

    // --- Header (always visible, click to expand) ---
    const header = el('div', 'planner-task-card-header');
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');

    const titleArea = el('div', 'planner-task-card-title-area');
    titleArea.appendChild(text('span', solution.name || 'Unknown Solution', 'planner-task-card-name'));

    const badges = el('div', 'planner-task-card-badges');
    badges.append(phaseBadge(phase), scoreBadge(score), effortBadge(hours));

    const toggleIcon = el('span', 'planner-toggle-icon');
    toggleIcon.textContent = '▶';
    toggleIcon.setAttribute('aria-hidden', 'true');

    header.append(titleArea, badges, toggleIcon);

    // --- Body (collapsible detail) ---
    const body = el('div', 'planner-task-card-body');

    if (solution.description) {
        body.appendChild(text('p', solution.description, 'planner-card-desc'));
    }

    // Dependencies from value_scoring.dependencies
    const deps = solution?.value_scoring?.dependencies;
    if (Array.isArray(deps) && deps.length > 0) {
        const section = el('div', 'planner-card-section');
        section.appendChild(text('h4', 'Dependencies', 'planner-card-section-title'));
        const list = el('ul', 'planner-card-list');
        deps.forEach(dep => list.appendChild(text('li', dep)));
        section.appendChild(list);
        body.appendChild(section);
    }

    // Setup tasks from planner.setup_tasks
    const tasks = solution?.planner?.setup_tasks;
    if (Array.isArray(tasks) && tasks.length > 0) {
        const section = el('div', 'planner-card-section');
        section.appendChild(text('h4', 'Setup Tasks', 'planner-card-section-title'));
        const list = el('ol', 'planner-card-list planner-card-list--ordered');
        tasks.forEach(task => {
            const taskLabel = task.task || task.name || '';
            const li = el('li', 'planner-card-task-item');
            li.appendChild(text('span', taskLabel));
            if (task.effort_hours) {
                li.appendChild(text('span', ` (${task.effort_hours}h)`, 'planner-card-task-effort'));
            }
            list.appendChild(li);
        });
        section.appendChild(list);
        body.appendChild(section);
    }

    // Common issues from planner.common_issues
    const issues = solution?.planner?.common_issues;
    if (Array.isArray(issues) && issues.length > 0) {
        const section = el('div', 'planner-card-section');
        section.appendChild(text('h4', '⚠ Common Issues', 'planner-card-section-title planner-card-section-title--warn'));
        const list = el('ul', 'planner-card-list');
        issues.forEach(issue => list.appendChild(text('li', issue)));
        section.appendChild(list);
        body.appendChild(section);
    }

    card.append(header, body);

    // Toggle collapse/expand
    function toggleCard() {
        const expanded = card.classList.toggle('expanded');
        header.setAttribute('aria-expanded', String(expanded));
        toggleIcon.textContent = expanded ? '▼' : '▶';
    }

    header.addEventListener('click', toggleCard);
    header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(); }
    });

    return card;
}

// --- Filter / sort state helpers ---

function applyFilterSort(solutions, sortKey, phaseFilter) {
    const filtered = phaseFilter === 'All'
        ? solutions
        : solutions.filter(s => getPhase(s) === phaseFilter);

    if (sortKey === 'effort') {
        return [...filtered].sort((a, b) => getEstimatedSetupHours(a) - getEstimatedSetupHours(b));
    }
    if (sortKey === 'phase') {
        const order = { 'Phase 1': 1, 'Phase 2': 2, 'Phase 3': 3 };
        return [...filtered].sort((a, b) => order[getPhase(a)] - order[getPhase(b)]);
    }
    // default: priority (highest first)
    return sortByScore(filtered);
}

function refreshCards(cardsContainer, solutions, state) {
    cardsContainer.replaceChildren();
    const visible = applyFilterSort(solutions, state.sort, state.filter);
    if (visible.length === 0) {
        const empty = el('div', 'planner-empty-cards');
        const msg = state.filter === 'All'
            ? 'No solutions match the current filters.'
            : `No solutions in ${state.filter}.`;
        empty.appendChild(text('p', msg, 'helper-text'));
        cardsContainer.appendChild(empty);
    } else {
        visible.forEach(s => cardsContainer.appendChild(createTaskCard(s)));
    }
}

// --- Filter / sort controls ---

function createFilterControls(state, cardsContainer, solutions) {
    const controls = el('div', 'planner-controls');

    // Sort dropdown
    const sortGroup = el('div', 'planner-control-group');
    const sortLabel = text('label', 'Sort by', 'planner-control-label');
    const sortId = 'planner-sort-select';
    sortLabel.setAttribute('for', sortId);
    const sortSelect = el('select', 'planner-sort-select');
    sortSelect.id = sortId;
    [
        { value: 'priority', label: 'Priority Score' },
        { value: 'effort',   label: 'Effort (low → high)' },
        { value: 'phase',    label: 'Phase' },
    ].forEach(({ value, label: optLabel }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = optLabel;
        if (value === state.sort) opt.selected = true;
        sortSelect.appendChild(opt);
    });
    sortSelect.addEventListener('change', () => {
        state.sort = sortSelect.value;
        refreshCards(cardsContainer, solutions, state);
    });
    sortGroup.append(sortLabel, sortSelect);
    controls.appendChild(sortGroup);

    // Phase filter buttons
    const filterGroup = el('div', 'planner-control-group');
    filterGroup.appendChild(text('span', 'Filter by Phase', 'planner-control-label'));
    const btnGroup = el('div', 'planner-filter-btns');
    ['All', 'Phase 1', 'Phase 2', 'Phase 3'].forEach(phase => {
        const btn = text('button', phase, 'planner-filter-btn');
        if (phase === state.filter) btn.classList.add('active');
        btn.addEventListener('click', () => {
            state.filter = phase;
            btnGroup.querySelectorAll('.planner-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            refreshCards(cardsContainer, solutions, state);
        });
        btnGroup.appendChild(btn);
    });
    filterGroup.appendChild(btnGroup);
    controls.appendChild(filterGroup);

    return controls;
}

// --- Summary stats bar ---

function createSummaryBar(solutions) {
    const bar = el('div', 'planner-summary-bar');
    const totalHours = solutions.reduce((sum, s) => sum + getEstimatedSetupHours(s), 0);
    const phaseCounts = { 'Phase 1': 0, 'Phase 2': 0, 'Phase 3': 0 };
    solutions.forEach(s => { const p = getPhase(s); phaseCounts[p] = (phaseCounts[p] || 0) + 1; });

    [
        { num: solutions.length,              label: 'Solutions' },
        { num: `${Math.round(totalHours)}h`,  label: 'Total Effort' },
        { num: phaseCounts['Phase 1'],         label: 'Phase 1' },
        { num: phaseCounts['Phase 2'],         label: 'Phase 2' },
        { num: phaseCounts['Phase 3'],         label: 'Phase 3' },
    ].forEach(({ num, label }) => {
        const card = el('div', 'stat-card');
        card.append(text('div', String(num), 'stat-number'), text('div', label, 'stat-label'));
        bar.appendChild(card);
    });

    return bar;
}

// --- Empty state (no solutions selected at all) ---

function createEmptyState() {
    const empty = el('div', 'planner-empty-state');
    empty.append(
        text('div', '📋', 'planner-empty-icon'),
        text('h3', 'No solutions selected'),
        text('p', 'Go back and select solutions to generate your project plan.', 'helper-text'),
    );
    return empty;
}

// --- Public exports ---

export function calculateTotalEffort(solutions = []) {
    return solutions.reduce((total, s) => total + getEstimatedSetupHours(s), 0);
}

export function initPlannerView(solutions = [], options = {}) {
    const container = options.container instanceof Element
        ? options.container
        : document.getElementById('plannerView');
    if (!container) return;

    container.replaceChildren();

    if (solutions.length === 0) {
        container.appendChild(createEmptyState());
        return;
    }

    // Summary stats bar (reuses .stat-card pattern)
    container.appendChild(createSummaryBar(solutions));

    // Cards grid — rendered inside this div, refreshed on filter/sort change
    const cardsContainer = el('div', 'planner-cards-grid');

    // Shared mutable state for filter/sort controls
    const state = { sort: 'priority', filter: 'All' };

    container.appendChild(createFilterControls(state, cardsContainer, solutions));

    refreshCards(cardsContainer, solutions, state);
    container.appendChild(cardsContainer);
}
