import { buildGanttPlanData } from '../gantt-planner.js';
import { calculatePriorityScore, getPhase } from './scoring.js';

const PLAN_COLUMNS = ['#', 'Phase', 'Status', 'Step', 'Milestone', 'Goal', 'Owner', 'Resource Type', 'Task', 'Start week', 'Duration'];
const SOLUTION_COLUMNS = ['Solution', 'Priority Score', 'Phase', 'Difficulty', 'Owner', 'Resource Type', 'Setup Summary', 'Required Permissions', 'Dependencies'];

function deriveOwnerModel(solution = {}) {
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

    const complexity = Number(solution?.value_scoring?.complexity_level) || 1;
    if (complexity >= 4) return { owner: 'Security Admin', resourceType: 'Microsoft & Customer' };
    if (complexity >= 2) return { owner: 'SOC Engineer', resourceType: 'Customer' };
    return { owner: recommended || 'Cloud Admin', resourceType: 'Customer' };
}

function getPermissionSummary(solution = {}) {
    const buckets = [
        ...(solution?.permissions?.azure_roles || []),
        ...(solution?.permissions?.m365_roles || []),
        ...(solution?.permissions?.resource_permissions || [])
    ].filter(Boolean);

    return buckets.length > 0
        ? buckets.join('; ')
        : solution?.permissions?.notes || 'Scoped access required during onboarding.';
}

function fitColumns(headers, rows, minimumWidth = 14) {
    return headers.map((header) => {
        const longestCell = rows.reduce((maxWidth, row) => {
            const cell = row?.[header];
            return Math.max(maxWidth, String(cell ?? '').length);
        }, header.length);
        return { wch: Math.max(minimumWidth, Math.min(longestCell + 2, 60)) };
    });
}

function createSummarySheet(xlsx, solutions, ganttData, totalEffortHours) {
    const summaryRows = [
        ['Metric', 'Value'],
        ['Selected solutions', solutions.length],
        ['Total effort hours', totalEffortHours],
        ['Project duration (weeks)', ganttData.totalDurationWeeks],
        ['Plan tasks', ganttData.totalTasks],
        [],
        ['Phase', 'Tasks'],
        ...ganttData.phaseBreakdown.map((phase) => [phase.name, phase.count])
    ];

    const sheet = xlsx.utils.aoa_to_sheet(summaryRows);
    sheet['!cols'] = [{ wch: 28 }, { wch: 20 }];
    return sheet;
}

function createSolutionSheet(xlsx, solutions) {
    const rows = solutions.map((solution) => {
        const ownerModel = deriveOwnerModel(solution);
        return {
            Solution: solution.name,
            'Priority Score': calculatePriorityScore(solution),
            Phase: getPhase(solution),
            Difficulty: solution?.onboarding?.difficulty || (['easy','moderate','hard'][(Math.min(Number(solution?.value_scoring?.complexity_level)||1, 3))-1] || 'moderate'),
            Owner: ownerModel.owner,
            'Resource Type': ownerModel.resourceType,
            'Setup Summary': solution?.onboarding?.setup_summary || solution?.planner?.setup_tasks?.[0]?.task || solution?.description || '',
            'Required Permissions': getPermissionSummary(solution),
            Dependencies: (solution?.value_scoring?.dependencies || []).join(', ')
        };
    });

    const sheet = xlsx.utils.json_to_sheet(rows, { header: SOLUTION_COLUMNS });
    sheet['!cols'] = fitColumns(SOLUTION_COLUMNS, rows);
    return sheet;
}

function createNotesSheet(xlsx) {
    const sheet = xlsx.utils.aoa_to_sheet([
        ['Notes'],
        ['Use this sheet for customer-specific assumptions, blockers, or owner updates after export.'],
        [''],
        ['- Confirm any phase timing adjustments based on change windows.'],
        ['- Replace default status values as onboarding starts.'],
        ['- Add named owners where the delivery plan already has customer contacts.']
    ]);
    sheet['!cols'] = [{ wch: 100 }];
    return sheet;
}

export function exportToExcel(planData = {}) {
    const solutions = Array.isArray(planData?.solutions) ? planData.solutions : [];
    if (solutions.length === 0 || !window.XLSX) {
        return;
    }

    const xlsx = window.XLSX;
    const ganttData = buildGanttPlanData(solutions);
    const workbook = xlsx.utils.book_new();

    const planSheet = xlsx.utils.json_to_sheet(ganttData.exportRows, { header: PLAN_COLUMNS });
    planSheet['!cols'] = fitColumns(PLAN_COLUMNS, ganttData.exportRows, 16);

    xlsx.utils.book_append_sheet(workbook, planSheet, 'Project Plan');
    xlsx.utils.book_append_sheet(workbook, createSummarySheet(xlsx, solutions, ganttData, planData.totalEffortHours || 0), 'Summary');
    xlsx.utils.book_append_sheet(workbook, createSolutionSheet(xlsx, solutions), 'Solutions');
    xlsx.utils.book_append_sheet(workbook, createNotesSheet(xlsx), 'Notes');

    const fileDate = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(workbook, `sentinel-value-pack-plan-${fileDate}.xlsx`);
}
