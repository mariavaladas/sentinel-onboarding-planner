import {
    applySolutionSearch,
    findSolutionsBySearchQuery,
    selectedSolutions,
    toggleSolution,
    updateStep3Button
} from './solutions.js?v=21';

function createMessage(text) {
    const message = document.createElement('p');
    message.className = 'helper-text';
    message.textContent = text;
    return message;
}

const MAX_SUGGESTIONS = 24;

export function findMatchingSolutions(input) {
    return findSolutionsBySearchQuery(input);
}

function getCurrentSearchQuery() {
    return `${document.getElementById('nlpInput')?.value || ''}`.trim();
}

function createSuggestionTag(solution) {
    const tag = document.createElement('span');
    tag.className = 'nlp-suggestion-tag';
    tag.textContent = selectedSolutions.has(solution.id) ? `✓ ${solution.name}` : `+ ${solution.name}`;

    tag.addEventListener('click', () => {
        const item = document.querySelector(`.solution-item[data-id="${solution.id}"]`);
        if (!selectedSolutions.has(solution.id) && item) {
            toggleSolution(item, solution.id);
        }
        tag.textContent = `✓ ${solution.name}`;
        tag.classList.add('selected');
        updateStep3Button();
    });

    return tag;
}

function renderSuggestions(userText = '') {
    const suggestionsContainer = document.getElementById('nlpSuggestions');
    if (!suggestionsContainer) {
        return;
    }

    suggestionsContainer.replaceChildren();

    if (!userText) {
        return;
    }

    const matches = findMatchingSolutions(userText);

    if (matches.length === 0) {
        suggestionsContainer.appendChild(createMessage('No matching connectors found. Try different keywords or browse the list below.'));
        return;
    }

    matches.slice(0, MAX_SUGGESTIONS).forEach((solution) => {
        suggestionsContainer.appendChild(createSuggestionTag(solution));
    });

    if (matches.length > MAX_SUGGESTIONS) {
        suggestionsContainer.appendChild(createMessage(`Showing the first ${MAX_SUGGESTIONS} quick-add matches. The cards below are fully filtered.`));
    }
}

function syncSearchUi() {
    const userText = getCurrentSearchQuery();
    applySolutionSearch(userText);
    renderSuggestions(userText);
}

export function handleNlpInput() {
    syncSearchUi();
}

export function processNlpInput() {
    syncSearchUi();
}

export function handleNlpKeydown(event) {
    if (event.key === 'Enter' && event.target?.id === 'nlpInput') {
        event.preventDefault();
        processNlpInput();
    }
}
