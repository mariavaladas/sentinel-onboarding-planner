import { selectedSolutions, solutionsData, toggleSolution, updateStep3Button } from './solutions.js';

function createMessage(text) {
    const message = document.createElement('p');
    message.className = 'helper-text';
    message.textContent = text;
    return message;
}

function getTerms(input) {
    return input
        .toLowerCase()
        .split(/[,;]+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 0);
}

export function findMatchingSolutions(input) {
    const allSolutions = Object.values(solutionsData?.categories || {})
        .flatMap((category) => category?.solutions || []);
    const terms = getTerms(input);
    const matches = [];

    terms.forEach((term) => {
        allSolutions.forEach((solution) => {
            const searchableText = [
                solution.name,
                solution.description,
                ...(solution.tags || [])
            ].join(' ').toLowerCase();

            if (searchableText.includes(term) && !matches.some((match) => match.id === solution.id)) {
                matches.push(solution);
            }
        });
    });

    return matches;
}

function createSuggestionTag(solution) {
    const tag = document.createElement('span');
    tag.className = 'nlp-suggestion-tag';
    tag.textContent = selectedSolutions.has(solution.id) ? `✓ ${solution.name}` : `+ ${solution.name}`;

    tag.addEventListener('click', () => {
        const item = document.querySelector(`.solution-item[data-id="${solution.id}"]`);
        if (!selectedSolutions.has(solution.id)) {
            toggleSolution(item, solution.id);
        }
        tag.textContent = `✓ ${solution.name}`;
        tag.classList.add('selected');
        updateStep3Button();
    });

    return tag;
}

function renderSuggestions() {
    const input = document.getElementById('nlpInput');
    const suggestionsContainer = document.getElementById('nlpSuggestions');
    if (!input || !suggestionsContainer) {
        return;
    }

    const userText = `${input.value || ''}`.trim();
    suggestionsContainer.replaceChildren();

    if (!userText) {
        return;
    }

    const matches = findMatchingSolutions(userText);

    if (matches.length === 0) {
        suggestionsContainer.appendChild(createMessage('No matching connectors found. Try different keywords or browse the list below.'));
    } else {
        matches.forEach((solution) => {
            suggestionsContainer.appendChild(createSuggestionTag(solution));
        });
    }
}

export function handleNlpInput() {
    renderSuggestions();
}

export function processNlpInput() {
    renderSuggestions();
}

export function handleNlpKeydown(event) {
    if (event.key === 'Enter' && event.target?.id === 'nlpInput') {
        event.preventDefault();
        processNlpInput();
    }
}
