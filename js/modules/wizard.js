let currentStep = 1;
const totalSteps = 5;
const CURRENT_STEP_STORAGE_KEY = 'sentinelPlanner.currentStep';

function setStepState(step, isActive) {
    const element = document.getElementById(`step${step}`);
    if (!element) return;
    element.classList.toggle('active', isActive);
}

function canUseLocalStorage() {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
        return false;
    }
}

function persistCurrentStep() {
    if (!canUseLocalStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(CURRENT_STEP_STORAGE_KEY, String(currentStep));
    } catch (error) {
        console.warn('Unable to persist current wizard step:', error);
    }
}

function clampStep(step) {
    const parsedStep = Number.parseInt(step, 10);
    if (!Number.isFinite(parsedStep)) {
        return 1;
    }

    return Math.min(totalSteps, Math.max(1, parsedStep));
}

function activateStep(nextStepNumber, { persist = true } = {}) {
    const nextStep = clampStep(nextStepNumber);
    setStepState(currentStep, false);
    currentStep = nextStep;
    setStepState(currentStep, true);
    if (persist) {
        persistCurrentStep();
    }
}

export function setCurrentStep(nextStepNumber, options = {}) {
    activateStep(nextStepNumber, options);
    updateProgress();
    return currentStep;
}

export function getCurrentStep() {
    return currentStep;
}

export function nextStep({ canProceed, onStepChange } = {}) {
    if (typeof canProceed === 'function' && canProceed(currentStep) === false) {
        return currentStep;
    }

    if (currentStep >= totalSteps) {
        return currentStep;
    }

    setCurrentStep(currentStep + 1);
    if (typeof onStepChange === 'function') {
        onStepChange(currentStep);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return currentStep;
}

export function prevStep({ onStepChange } = {}) {
    if (currentStep <= 1) {
        return currentStep;
    }

    setCurrentStep(currentStep - 1);
    if (typeof onStepChange === 'function') {
        onStepChange(currentStep);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return currentStep;
}

export function updateProgress() {
    const fill = document.getElementById('progressFill');
    if (fill) {
        fill.style.width = `${(currentStep / totalSteps) * 100}%`;
    }

    document.querySelectorAll('.progress-steps .step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.toggle('active', stepNumber === currentStep);
        step.classList.toggle('completed', stepNumber < currentStep);
    });
}
