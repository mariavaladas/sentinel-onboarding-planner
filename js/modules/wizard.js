let currentStep = 1;
const totalSteps = 4;

function setStepState(step, isActive) {
    const element = document.getElementById(`step${step}`);
    if (!element) return;
    element.classList.toggle('active', isActive);
}

function activateStep(nextStepNumber) {
    setStepState(currentStep, false);
    currentStep = nextStepNumber;
    setStepState(currentStep, true);
}

export function nextStep({ canProceed, onStepChange } = {}) {
    if (typeof canProceed === 'function' && canProceed(currentStep) === false) {
        return currentStep;
    }

    if (currentStep >= totalSteps) {
        return currentStep;
    }

    activateStep(currentStep + 1);
    updateProgress();
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

    activateStep(currentStep - 1);
    updateProgress();
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
