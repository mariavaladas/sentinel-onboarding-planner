function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function normalizeFivePointValue(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    if (numericValue > 5) {
        return clamp(numericValue, 0, 100);
    }

    return clamp((numericValue / 5) * 100, 0, 100);
}

export function getEstimatedSetupHours(solution = {}) {
    const directHours = Number(solution?.value_scoring?.setup_hours);
    if (Number.isFinite(directHours) && directHours >= 0) {
        return directHours;
    }

    const taskHours = Array.isArray(solution?.planner?.setup_tasks)
        ? solution.planner.setup_tasks.reduce((total, task) => total + (Number(task?.effort_hours) || 0), 0)
        : 0;
    if (taskHours > 0) {
        return taskHours;
    }

    const estimatedHours =
        (Number(solution?.connectors) || 0) * 6 +
        (Number(solution?.playbooks) || 0) * 2 +
        (Number(solution?.workbooks) || 0) +
        (Number(solution?.analytics) || 0) * 0.5;

    return estimatedHours > 0 ? estimatedHours : 0;
}

function getBusinessImpact(solution) {
    const configuredValue = solution?.value_scoring?.business_impact;
    if (configuredValue !== undefined) {
        return normalizeFivePointValue(configuredValue);
    }

    return clamp(((Number(solution?.analytics) || 0) * 4) + ((Number(solution?.connectors) || 0) * 15), 0, 100);
}

function getComplexityInverse(solution) {
    const configuredValue = solution?.value_scoring?.complexity_level;
    if (configuredValue !== undefined) {
        return 100 - normalizeFivePointValue(configuredValue);
    }

    const estimatedComplexity = clamp(((Number(solution?.connectors) || 0) * 10) + ((Number(solution?.playbooks) || 0) * 5), 0, 100);
    return 100 - estimatedComplexity;
}

function getSetupTimeInverse(solution) {
    const estimatedHours = getEstimatedSetupHours(solution);
    if (estimatedHours <= 0) {
        return 50;
    }

    return clamp(100 - (Math.min(estimatedHours, 60) / 60) * 100, 0, 100);
}

function getDetectionCoverage(solution) {
    const configuredValue = solution?.value_scoring?.detection_coverage ?? solution?.value_scoring?.detection_areas;
    if (Array.isArray(configuredValue)) {
        return clamp(configuredValue.length * 20, 0, 100);
    }
    if (configuredValue !== undefined) {
        return normalizeFivePointValue(configuredValue);
    }

    return clamp(((Number(solution?.analytics) || 0) * 5) + ((Number(solution?.workbooks) || 0) * 2), 0, 100);
}

function getMaturity(solution) {
    const configuredValue = solution?.value_scoring?.maturity;
    if (configuredValue !== undefined) {
        return normalizeFivePointValue(configuredValue);
    }

    return solution?.is1P ? 80 : 60;
}

export function calculatePriorityScore(solution = {}) {
    const weightedScore =
        (getBusinessImpact(solution) * 0.4) +
        (getComplexityInverse(solution) * 0.2) +
        (getSetupTimeInverse(solution) * 0.15) +
        (getDetectionCoverage(solution) * 0.15) +
        (getMaturity(solution) * 0.1);

    return Math.round(clamp(weightedScore, 0, 100));
}

export function sortByScore(solutions = []) {
    return [...solutions].sort((left, right) => calculatePriorityScore(right) - calculatePriorityScore(left));
}

export function getPhase(solution = {}) {
    const estimatedHours = getEstimatedSetupHours(solution);

    if (estimatedHours <= 25) {
        return 'Phase 1';
    }
    if (estimatedHours <= 50) {
        return 'Phase 2';
    }
    return 'Phase 3';
}
