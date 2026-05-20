import { exportToExcel } from './modules/export.js';
import { calculateTotalEffort, initPlannerView } from './modules/planning.js';
import { sortByScore } from './modules/scoring.js';
import { processNlpInput, handleNlpKeydown } from './modules/search.js';
import {
    getSelectedSolutionsData,
    initStep3,
    loadSolutionData,
    renderResultsGrid,
    renderSummaryStats,
    selectedSolutions,
    toggleVendor
} from './modules/solutions.js';
import { nextStep, prevStep, updateProgress } from './modules/wizard.js';

const renderPlannerStep = () => {
    const selected = sortByScore(getSelectedSolutionsData());
    renderSummaryStats(selected);
    renderResultsGrid(selected);
    initPlannerView(selected);
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadSolutionData();
    updateProgress();

    document.querySelectorAll('[data-next]').forEach((button) => {
        button.addEventListener('click', () => nextStep({
            canProceed: (step) => step !== 3 || selectedSolutions.size > 0,
            onStepChange: (step) => {
                if (step === 3) initStep3();
                if (step === 4) renderPlannerStep();
            }
        }));
    });

    document.querySelectorAll('[data-prev]').forEach((button) => button.addEventListener('click', () => prevStep()));
    document.querySelectorAll('[data-vendor]').forEach((card) => card.addEventListener('click', () => toggleVendor(card)));
    document.getElementById('nlpSearchButton')?.addEventListener('click', processNlpInput);
    document.addEventListener('keydown', handleNlpKeydown);
    document.getElementById('exportExcelButton')?.addEventListener('click', () => {
        const selected = sortByScore(getSelectedSolutionsData());
        exportToExcel({ solutions: selected, totalEffortHours: calculateTotalEffort(selected) });
    });
});
