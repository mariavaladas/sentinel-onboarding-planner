// ============================
// Sentinel Value Pack Setup
// Main Application Logic
// ============================

let currentStep = 1;
const totalSteps = 4;
let solutionsData = null;
let selectedCategories = new Set();
let selectedSolutions = new Set();
let selectedVendors = new Set();

// Mapping of vendor selections to solution IDs that should be pre-selected
const vendorToSolutions = {
    'aws': ['aws'],
    'gcp': ['google-cloud'],
    'crowdstrike': ['crowdstrike'],
    'paloalto': ['palo-alto-networks', 'palo-alto-prisma-cloud'],
    'cisco': ['cisco-asa'],
    'okta': ['okta'],
    'trendmicro': ['trend-micro-vision-one', 'trend-micro-deep-security'],
    'fortinet': ['fortinet'],
    'pingidentity': ['ping-identity'],
    'cyberark': ['cyberark']
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadSolutionData();
    updateProgress();
});

// Load solution catalog from JSON
async function loadSolutionData() {
    try {
        const response = await fetch('data/solutions.json');
        solutionsData = await response.json();
    } catch (error) {
        console.error('Failed to load solutions data:', error);
        // Fallback: try relative path variations
        try {
            const response = await fetch('./data/solutions.json');
            solutionsData = await response.json();
        } catch (e) {
            console.error('Could not load solutions data from any path');
        }
    }
}

// Navigation
function nextStep() {
    if (currentStep === 3 && selectedSolutions.size === 0) return;
    
    if (currentStep < totalSteps) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep++;
        document.getElementById(`step${currentStep}`).classList.add('active');
        
        // Run step-specific initialization
        if (currentStep === 3) initStep3();
        if (currentStep === 4) initStep4();
        
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep--;
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateProgress() {
    const fill = document.getElementById('progressFill');
    fill.style.width = `${(currentStep / totalSteps) * 100}%`;
    
    document.querySelectorAll('.progress-steps .step').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        if (i + 1 === currentStep) el.classList.add('active');
        if (i + 1 < currentStep) el.classList.add('completed');
    });
}

// Step 2: Vendor selection
function toggleVendor(el) {
    const vendor = el.dataset.vendor;
    
    if (selectedVendors.has(vendor)) {
        selectedVendors.delete(vendor);
        el.classList.remove('selected');
    } else {
        selectedVendors.add(vendor);
        el.classList.add('selected');
    }
}

// Legacy category toggle (kept for compatibility)
function toggleCategory(el) {
    const category = el.dataset.category;
    
    if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
        el.classList.remove('selected');
    } else {
        selectedCategories.add(category);
        el.classList.add('selected');
    }
    
    // Enable/disable next button
    document.getElementById('step2Next').disabled = selectedCategories.size === 0;
}

// Step 3: Solution selection with pre-selection based on vendor choices
function initStep3() {
    if (!solutionsData) return;
    
    const panelsContainer = document.getElementById('solutionPanels');
    panelsContainer.innerHTML = '';
    
    // Always include all categories (Azure First Party + Microsoft + Third Party)
    selectedCategories = new Set(['azure_first_party', 'microsoft_logs', 'third_party']);
    
    // Determine which solutions should be pre-selected based on vendor choices
    const preSelectedIds = new Set();
    
    // Always pre-select all Azure First Party solutions
    if (solutionsData.categories.azure_first_party) {
        solutionsData.categories.azure_first_party.solutions.forEach(sol => {
            preSelectedIds.add(sol.id);
        });
    }
    
    // Always pre-select Microsoft Defender XDR and related
    if (solutionsData.categories.microsoft_logs) {
        solutionsData.categories.microsoft_logs.solutions.forEach(sol => {
            preSelectedIds.add(sol.id);
        });
    }
    
    // Pre-select third party solutions based on vendor selections
    selectedVendors.forEach(vendor => {
        const solutionIds = vendorToSolutions[vendor] || [];
        solutionIds.forEach(id => preSelectedIds.add(id));
    });
    
    // Add pre-selected solutions to selectedSolutions
    preSelectedIds.forEach(id => selectedSolutions.add(id));
    
    // Show the pre-selection banner
    const banner = document.getElementById('preselectionBanner');
    if (banner) banner.style.display = 'flex';
    
    // Show NLP input for searching additional connectors
    const nlpSection = document.getElementById('nlpSection');
    nlpSection.style.display = 'block';
    
    // Render panels for each category
    selectedCategories.forEach(categoryKey => {
        const category = solutionsData.categories[categoryKey];
        if (!category) return;
        
        // Sort solutions: pre-selected first, then the rest
        const sortedSolutions = [...category.solutions].sort((a, b) => {
            const aSelected = preSelectedIds.has(a.id) ? 0 : 1;
            const bSelected = preSelectedIds.has(b.id) ? 0 : 1;
            return aSelected - bSelected;
        });
        
        const panel = document.createElement('div');
        panel.className = 'solution-panel';
        panel.innerHTML = `
            <div class="solution-panel-header">
                <span class="solution-panel-icon">${category.icon}</span>
                <h3>${category.label}</h3>
            </div>
            <div class="solution-list">
                ${sortedSolutions.map(sol => `
                    <div class="solution-item ${selectedSolutions.has(sol.id) ? 'selected' : ''}" 
                         data-id="${sol.id}" 
                         onclick="toggleSolution(this, '${sol.id}')">
                        <div class="solution-item-logo">
                            <img src="${sol.logo}" alt="${sol.name}" onerror="this.parentElement.innerHTML='🔹'">
                        </div>
                        <div class="solution-item-info">
                            <div class="solution-item-name">${sol.name}</div>
                            <div class="solution-item-meta">${sol.analytics} rules · ${sol.workbooks} workbooks · ${sol.playbooks} playbooks</div>
                        </div>
                        <div class="solution-item-check">✓</div>
                    </div>
                `).join('')}
            </div>
        `;
        panelsContainer.appendChild(panel);
    });
    
    updateStep3Button();
}

function toggleSolution(el, solutionId) {
    if (selectedSolutions.has(solutionId)) {
        selectedSolutions.delete(solutionId);
        el.classList.remove('selected');
    } else {
        selectedSolutions.add(solutionId);
        el.classList.add('selected');
    }
    updateStep3Button();
}

function updateStep3Button() {
    document.getElementById('step3Next').disabled = selectedSolutions.size === 0;
}

// NLP Input Processing
function processNlpInput() {
    const input = document.getElementById('nlpInput').value.trim().toLowerCase();
    if (!input) return;
    
    const suggestionsContainer = document.getElementById('nlpSuggestions');
    suggestionsContainer.innerHTML = '';
    
    // Search through all third-party solutions by tags and name
    const thirdParty = solutionsData.categories.third_party.solutions;
    const matches = [];
    
    // Split input into terms
    const terms = input.split(/[,;]+/).map(t => t.trim()).filter(t => t.length > 0);
    
    terms.forEach(term => {
        thirdParty.forEach(sol => {
            const searchableText = [
                sol.name.toLowerCase(),
                sol.description.toLowerCase(),
                ...sol.tags
            ].join(' ');
            
            if (searchableText.includes(term) && !matches.find(m => m.id === sol.id)) {
                matches.push(sol);
            }
        });
    });
    
    if (matches.length > 0) {
        matches.forEach(sol => {
            const tag = document.createElement('span');
            tag.className = 'nlp-suggestion-tag';
            tag.textContent = `+ ${sol.name}`;
            tag.onclick = () => {
                // Auto-select this solution
                selectedSolutions.add(sol.id);
                // Update UI
                const item = document.querySelector(`.solution-item[data-id="${sol.id}"]`);
                if (item) item.classList.add('selected');
                tag.style.background = 'rgba(16, 185, 129, 0.2)';
                tag.style.borderColor = 'var(--success)';
                tag.style.color = 'var(--success)';
                tag.textContent = `✓ ${sol.name}`;
                updateStep3Button();
            };
            suggestionsContainer.appendChild(tag);
        });
    } else {
        suggestionsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">No matching connectors found. Try different keywords or browse the list below.</span>';
    }
    
    // Clear input
    document.getElementById('nlpInput').value = '';
}

// Allow Enter key in NLP input
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'nlpInput') {
        processNlpInput();
    }
});

// Step 4: Results
function initStep4() {
    if (!solutionsData) return;
    
    const selectedData = getSelectedSolutionsData();
    renderSummaryStats(selectedData);
    renderResultsGrid(selectedData);
}

function getSelectedSolutionsData() {
    const results = [];
    Object.values(solutionsData.categories).forEach(category => {
        category.solutions.forEach(sol => {
            if (selectedSolutions.has(sol.id)) {
                results.push(sol);
            }
        });
    });
    return results;
}

function renderSummaryStats(solutions) {
    const stats = {
        connectors: 0,
        analytics: 0,
        workbooks: 0,
        playbooks: 0
    };
    
    solutions.forEach(sol => {
        stats.connectors += sol.connectors;
        stats.analytics += sol.analytics;
        stats.workbooks += sol.workbooks;
        stats.playbooks += sol.playbooks;
    });
    
    const container = document.getElementById('summaryStats');
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${solutions.length}</div>
            <div class="stat-label">Solutions</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.connectors}</div>
            <div class="stat-label">Connectors</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.analytics}</div>
            <div class="stat-label">Analytics Rules</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.workbooks}</div>
            <div class="stat-label">Workbooks</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.playbooks}</div>
            <div class="stat-label">Playbooks</div>
        </div>
    `;
}

function renderResultsGrid(solutions) {
    const container = document.getElementById('resultsGrid');
    container.innerHTML = solutions.map(sol => `
        <div class="result-card">
            <div class="result-card-header">
                <div class="result-card-logo">
                    <img src="${sol.logo}" alt="${sol.name}" onerror="this.parentElement.innerHTML='🔹'">
                </div>
                <div class="result-card-title">${sol.name}</div>
            </div>
            <div class="result-card-desc">${sol.description}</div>
            <div class="result-card-metrics">
                <div class="metric">
                    <div class="metric-value">${sol.connectors}</div>
                    <div class="metric-label">Connectors</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${sol.analytics}</div>
                    <div class="metric-label">Analytics</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${sol.workbooks}</div>
                    <div class="metric-label">Workbooks</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${sol.playbooks}</div>
                    <div class="metric-label">Playbooks</div>
                </div>
            </div>
            <a class="result-card-link" href="${sol.github_url}" target="_blank">
                View on GitHub →
            </a>
        </div>
    `).join('');
}

// Export
function exportPlan() {
    const selectedData = getSelectedSolutionsData();
    
    let markdown = `# Sentinel Value Pack - Deployment Plan\n\n`;
    markdown += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    markdown += `## Summary\n\n`;
    
    const stats = { connectors: 0, analytics: 0, workbooks: 0, playbooks: 0 };
    selectedData.forEach(sol => {
        stats.connectors += sol.connectors;
        stats.analytics += sol.analytics;
        stats.workbooks += sol.workbooks;
        stats.playbooks += sol.playbooks;
    });
    
    markdown += `| Metric | Count |\n|--------|-------|\n`;
    markdown += `| Solutions | ${selectedData.length} |\n`;
    markdown += `| Connectors | ${stats.connectors} |\n`;
    markdown += `| Analytics Rules | ${stats.analytics} |\n`;
    markdown += `| Workbooks | ${stats.workbooks} |\n`;
    markdown += `| Playbooks | ${stats.playbooks} |\n\n`;
    
    markdown += `## Selected Solutions\n\n`;
    selectedData.forEach(sol => {
        markdown += `### ${sol.name}\n`;
        markdown += `- **Description:** ${sol.description}\n`;
        markdown += `- **Connectors:** ${sol.connectors} | **Analytics:** ${sol.analytics} | **Workbooks:** ${sol.workbooks} | **Playbooks:** ${sol.playbooks}\n`;
        markdown += `- **GitHub:** ${sol.github_url}\n\n`;
    });
    
    // Create and download file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sentinel-value-pack-plan.md';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Deployment plan exported!');
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
