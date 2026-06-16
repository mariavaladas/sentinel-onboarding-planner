// mitre.js — MITRE ATT&CK coverage visualization
// Fetches analytic rule YAML files from GitHub and maps them to ATT&CK tactics.

const MITRE_TACTICS_ORDER = [
    'Reconnaissance', 'ResourceDevelopment', 'InitialAccess', 'Execution',
    'Persistence', 'PrivilegeEscalation', 'DefenseEvasion', 'CredentialAccess',
    'Discovery', 'LateralMovement', 'Collection', 'CommandAndControl',
    'Exfiltration', 'Impact'
];

const MITRE_TACTIC_LABELS = {
    'Reconnaissance':     'Recon',
    'ResourceDevelopment':'Resource Dev',
    'InitialAccess':      'Initial Access',
    'Execution':          'Execution',
    'Persistence':        'Persistence',
    'PrivilegeEscalation':'Priv Escalation',
    'DefenseEvasion':     'Defense Evasion',
    'CredentialAccess':   'Credential Access',
    'Discovery':          'Discovery',
    'LateralMovement':    'Lateral Movement',
    'Collection':         'Collection',
    'CommandAndControl':  'C2',
    'Exfiltration':       'Exfiltration',
    'Impact':             'Impact'
};

const MAX_PER_SOLUTION = 10;
const SOLUTION_FETCH_BATCH_SIZE = 5;
const mitreCoverageCache = new Map();

let prebakedDataPromise = null;

/** Fetch and cache the pre-baked mitre-coverage.json. */
function loadPrebakedData() {
    if (!prebakedDataPromise) {
        prebakedDataPromise = fetch('./data/mitre-coverage.json')
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);
    }
    return prebakedDataPromise;
}

/**
 * Derive the GitHub folder name for a solution.
 * Uses the tail segment of github_url when available.
 * Returns empty string if no github_url — caller should skip fetch.
 */
function getSolutionFolder(solution) {
    if (solution.github_url) {
        const parts = solution.github_url.split('/');
        const last = parts[parts.length - 1];
        if (last) return decodeURIComponent(last);
    }
    return '';
}

/**
 * Fetch the list of analytic-rule YAML files for a solution via the GitHub Contents API.
 * Returns an array of raw download URLs.
 */
async function fetchAnalyticRuleUrls(solution) {
    const folder = getSolutionFolder(solution);
    if (!folder) return [];
    const apiUrl =
        `https://api.github.com/repos/Azure/Azure-Sentinel/contents/Solutions/` +
        `${encodeURIComponent(folder)}/Analytic%20Rules`;
    try {
        const resp = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github.v3+json' } });
        if (!resp.ok) return [];
        const files = await resp.json();
        if (!Array.isArray(files)) return [];
        return files
            .filter(f => f.type === 'file' && /\.yaml$/i.test(f.name))
            .map(f => f.download_url);
    } catch {
        return [];
    }
}

/** Parse YAML text for ATT&CK tactics and relevant techniques. */
function parseRuleYaml(yaml) {
    const result = { tactics: [], techniques: [] };

    // Multi-line tactics block:  tactics:\n  - Foo\n  - Bar
    const multiMatch = yaml.match(/^tactics:\s*\n((?:[ \t]+-[ \t]+\S+\n?)+)/m);
    if (multiMatch) {
        const hits = multiMatch[1].match(/-[ \t]+(\w+)/g);
        if (hits) result.tactics = hits.map(t => t.replace(/-[ \t]+/, '').trim());
    }
    // Inline tactics:  tactics: [Foo, Bar]
    if (result.tactics.length === 0) {
        const inlineMatch = yaml.match(/^tactics:\s*\[([^\]]+)\]/m);
        if (inlineMatch) {
            result.tactics = inlineMatch[1].split(',').map(t => t.trim()).filter(Boolean);
        }
    }

    // Multi-line techniques block
    const techMulti = yaml.match(/^relevantTechniques:\s*\n((?:[ \t]+-[ \t]+\S+\n?)+)/m);
    if (techMulti) {
        const hits = techMulti[1].match(/-[ \t]+(\S+)/g);
        if (hits) result.techniques = hits.map(t => t.replace(/-[ \t]+/, '').trim());
    }
    // Inline techniques
    if (result.techniques.length === 0) {
        const techInline = yaml.match(/^relevantTechniques:\s*\[([^\]]+)\]/m);
        if (techInline) {
            result.techniques = techInline[1].split(',').map(t => t.trim()).filter(Boolean);
        }
    }

    return result;
}

function getSolutionsCacheKey(solutions) {
    return solutions
        .map(sol => getSolutionFolder(sol) || sol.name)
        .sort((a, b) => a.localeCompare(b))
        .join('||');
}

async function processInBatches(items, batchSize, worker) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        results.push(...await Promise.all(batch.map(worker)));
    }
    return results;
}

function createTacticCounts() {
    const counts = {};
    MITRE_TACTICS_ORDER.forEach(t => { counts[t] = 0; });
    return counts;
}

function createTechniqueSets() {
    const sets = {};
    MITRE_TACTICS_ORDER.forEach(t => { sets[t] = new Set(); });
    return sets;
}

async function getMitreCoverageData(solutions) {
    const cacheKey = getSolutionsCacheKey(solutions);
    if (mitreCoverageCache.has(cacheKey)) {
        return mitreCoverageCache.get(cacheKey);
    }

    const coveragePromise = (async () => {
        const tacticCounts = createTacticCounts();
        const techniqueSets = createTechniqueSets();
        const perConnector = [];
        let totalRulesParsed = 0;

        const allUrlResults = await processInBatches(
            solutions,
            SOLUTION_FETCH_BATCH_SIZE,
            async sol => ({ sol, urls: await fetchAnalyticRuleUrls(sol) })
        );

        const allRuleResults = await processInBatches(
            allUrlResults,
            SOLUTION_FETCH_BATCH_SIZE,
            async ({ sol, urls }) => {
                const sampledUrls = urls.slice(0, MAX_PER_SOLUTION);
                const fetches = sampledUrls.map(async url => {
                    try {
                        const resp = await fetch(url);
                        if (!resp.ok) return null;
                        return await resp.text();
                    } catch {
                        return null;
                    }
                });
                const results = await Promise.all(fetches);
                return { sol, urls, results };
            }
        );

        for (const { sol, urls, results } of allRuleResults) {
            const connTactics = createTacticCounts();
            const connTechniques = createTechniqueSets();
            let connRules = 0;

            results.forEach(yaml => {
                if (!yaml) return;
                totalRulesParsed++;
                connRules++;
                const parsed = parseRuleYaml(yaml);

                parsed.tactics.forEach(tactic => {
                    if (tacticCounts[tactic] !== undefined) {
                        tacticCounts[tactic]++;
                        connTactics[tactic]++;
                    }
                });

                parsed.techniques.forEach(tech => {
                    parsed.tactics.forEach(tactic => {
                        if (techniqueSets[tactic]) techniqueSets[tactic].add(tech);
                        if (connTechniques[tactic]) connTechniques[tactic].add(tech);
                    });
                });
            });

            if (urls.slice(0, MAX_PER_SOLUTION).length > 0) {
                perConnector.push({
                    name: sol.name,
                    rulesParsed: connRules,
                    totalRules: urls.length,
                    tactics: connTactics,
                    techniques: connTechniques
                });
            }
        }

        // If every live fetch failed (rate-limited or network error), fall back to pre-baked data
        if (totalRulesParsed === 0) {
            const prebaked = await loadPrebakedData();
            if (prebaked && prebaked.solutions) {
                return buildFromPrebaked(solutions, prebaked);
            }
        }

        return { tacticCounts, techniqueSets, perConnector, totalRulesParsed, usingFallback: false };
    })();

    mitreCoverageCache.set(cacheKey, coveragePromise);

    try {
        return await coveragePromise;
    } catch (error) {
        mitreCoverageCache.delete(cacheKey);
        throw error;
    }
}

/** Build coverage result from pre-baked JSON, filtered to the selected solutions. */
function buildFromPrebaked(solutions, prebaked) {
    const tacticCounts  = createTacticCounts();
    const techniqueSets = createTechniqueSets();
    const perConnector  = [];
    let totalRulesParsed = 0;

    for (const sol of solutions) {
        const folder = getSolutionFolder(sol);
        const data   = prebaked.solutions[folder];
        if (!data || data.rulesParsed === 0) continue;

        const connTactics    = createTacticCounts();
        const connTechniques = createTechniqueSets();

        for (const [tactic, count] of Object.entries(data.tactics || {})) {
            if (tacticCounts[tactic] !== undefined) {
                tacticCounts[tactic] += count;
                connTactics[tactic]   = count;
            }
        }

        for (const [tactic, techs] of Object.entries(data.techniques || {})) {
            if (techniqueSets[tactic]) {
                techs.forEach(t => {
                    techniqueSets[tactic].add(t);
                    connTechniques[tactic].add(t);
                });
            }
        }

        totalRulesParsed += data.rulesParsed;
        perConnector.push({
            name:        sol.name,
            rulesParsed: data.rulesParsed,
            totalRules:  data.totalRules,
            tactics:     connTactics,
            techniques:  connTechniques
        });
    }

    return { tacticCounts, techniqueSets, perConnector, totalRulesParsed, usingFallback: true };
}

/**
 * Main export — render the MITRE ATT&CK coverage section.
 * @param {Array} solutions - array of solution objects from getSelectedSolutionsData()
 */
export async function renderMitreCoverage(solutions) {
    const container = document.getElementById('mitreCoverage');
    if (!container) return;

    if (!solutions || solutions.length === 0) {
        container.innerHTML = `
            <h3>🎯 MITRE ATT&amp;CK Coverage</h3>
            <p style="color:var(--text-muted);font-size:0.85rem;">No solutions selected. Select solutions to see MITRE coverage.</p>`;
        return;
    }

    container.innerHTML = `
        <h3>🎯 MITRE ATT&amp;CK Coverage</h3>
        <p class="mitre-subtitle">Analyzing analytic rules to determine your detection coverage across MITRE ATT&amp;CK tactics…</p>
        <div class="mitre-loading">⏳ Fetching analytic rules from GitHub… (sampling up to ${MAX_PER_SOLUTION} rules per solution)</div>`;

    let coverageData;
    try {
        coverageData = await getMitreCoverageData(solutions);
    } catch (err) {
        container.innerHTML = `
            <h3>🎯 MITRE ATT&amp;CK Coverage</h3>
            <p style="color:var(--warning);font-size:0.85rem;">⚠️ MITRE: Failed to fetch coverage data. Check your network connection and try again.</p>`;
        console.error('[renderMitreCoverage] getMitreCoverageData failed:', err);
        return;
    }
    const tacticCounts = coverageData.tacticCounts;
    const techniqueSets = coverageData.techniqueSets;
    const perConnector = coverageData.perConnector.slice();
    const totalRulesParsed = coverageData.totalRulesParsed;
    const usingFallback = coverageData.usingFallback === true;

    if (totalRulesParsed === 0) {
        container.innerHTML = `
            <h3>🎯 MITRE ATT&amp;CK Coverage</h3>
            <p style="color:var(--text-muted);font-size:0.85rem;">No analytic rules could be fetched for the selected solutions. MITRE coverage cannot be determined.</p>`;
        return;
    }

    // Build global tactic matrix
    const coveredTactics = MITRE_TACTICS_ORDER.filter(t => tacticCounts[t] > 0).length;
    const totalTechniques = Object.values(techniqueSets).reduce((s, set) => s + set.size, 0);

    let matrixHtml = '';
    MITRE_TACTICS_ORDER.forEach(tactic => {
        const count = tacticCounts[tactic];
        const techniques = techniqueSets[tactic];
        const isCovered = count > 0;

        let techBadges = '';
        if (techniques.size > 0) {
            const techArray = [...techniques].slice(0, 5);
            techBadges = `<div class="mitre-techniques-list">${
                techArray.map(t => `<span class="mitre-technique-badge">${t}</span>`).join('')
            }${techniques.size > 5 ? `<span class="mitre-technique-badge">+${techniques.size - 5}</span>` : ''}</div>`;
        }

        matrixHtml += `
            <div class="mitre-tactic ${isCovered ? 'mitre-covered' : ''}">
                <div class="mitre-tactic-name">${MITRE_TACTIC_LABELS[tactic]}</div>
                <div class="mitre-tactic-count">${count}</div>
                <div class="mitre-tactic-label">rule${count !== 1 ? 's' : ''}</div>
                ${techBadges}
            </div>`;
    });

    // Sort: most tactics covered first
    perConnector.sort((a, b) => {
        const aCov = MITRE_TACTICS_ORDER.filter(t => a.tactics[t] > 0).length;
        const bCov = MITRE_TACTICS_ORDER.filter(t => b.tactics[t] > 0).length;
        return bCov - aCov;
    });

    let connectorHtml = '';
    perConnector.forEach((conn, idx) => {
        const covCount = MITRE_TACTICS_ORDER.filter(t => conn.tactics[t] > 0).length;
        const starBadge = covCount >= 3
            ? ' <span style="color:#facc15;font-size:1rem;" title="High coverage: 3+ tactics">★</span>'
            : '';

        const pills = MITRE_TACTICS_ORDER.map(t => {
            const covered = conn.tactics[t] > 0;
            return `<span class="mitre-pill ${covered ? 'mitre-pill-covered' : 'mitre-pill-none'}"
                title="${MITRE_TACTIC_LABELS[t]}: ${conn.tactics[t]} rules">${MITRE_TACTIC_LABELS[t]}</span>`;
        }).join('');

        const miniMatrix = MITRE_TACTICS_ORDER.map(t => {
            const count = conn.tactics[t];
            const techs = conn.techniques[t];
            const covered = count > 0;
            let techList = '';
            if (techs.size > 0) {
                techList = `<div class="mitre-techniques-list" style="margin-top:4px">${
                    [...techs].slice(0, 3).map(te => `<span class="mitre-technique-badge">${te}</span>`).join('')
                }${techs.size > 3 ? `<span class="mitre-technique-badge">+${techs.size - 3}</span>` : ''}</div>`;
            }
            return `<div class="mitre-mini-tactic ${covered ? 'mini-covered' : ''}">
                <div class="mitre-mini-name">${MITRE_TACTIC_LABELS[t]}</div>
                <div class="mitre-mini-count">${count}</div>
                ${techList}
            </div>`;
        }).join('');

        connectorHtml += `
            <div class="mitre-connector-row" id="mitreConn${idx}">
                <div class="mitre-connector-header"
                     onclick="document.getElementById('mitreConn${idx}').classList.toggle('expanded')">
                    <div>
                        <div class="mitre-connector-name">${conn.name}${starBadge}</div>
                        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">
                            ${covCount}/${MITRE_TACTICS_ORDER.length} tactics · ${conn.rulesParsed} rules sampled${
                                conn.totalRules > conn.rulesParsed ? ` of ${conn.totalRules}` : ''
                            }
                        </div>
                    </div>
                    <div>
                        <div class="mitre-connector-pills">${pills}</div>
                        <span class="mitre-expand-icon">▼</span>
                    </div>
                </div>
                <div class="mitre-connector-detail">
                    <div class="mitre-connector-stats">
                        <div>Tactics covered: <span>${covCount}</span></div>
                        <div>Rules analyzed: <span>${conn.rulesParsed}</span></div>
                        <div>Coverage: <span>${Math.round((covCount / MITRE_TACTICS_ORDER.length) * 100)}%</span></div>
                    </div>
                    <div class="mitre-mini-matrix">${miniMatrix}</div>
                </div>
            </div>`;
    });

    container.innerHTML = `
        <h3>🎯 MITRE ATT&amp;CK Coverage</h3>
        ${usingFallback ? `<p class="mitre-fallback-note">ℹ️ Using cached coverage data (live API unavailable)</p>` : ''}
        <p class="mitre-subtitle">Based on ${totalRulesParsed} analytic rules sampled from your selected solutions.</p>
        <div class="mitre-summary-bar">
            <div class="mitre-summary-stat">
                <span class="mitre-summary-num">${coveredTactics}/${MITRE_TACTICS_ORDER.length}</span>
                <span class="mitre-summary-label">Tactics Covered</span>
            </div>
            <div class="mitre-summary-stat">
                <span class="mitre-summary-num">${totalTechniques}</span>
                <span class="mitre-summary-label">Techniques Detected</span>
            </div>
            <div class="mitre-summary-stat">
                <span class="mitre-summary-num">${totalRulesParsed}</span>
                <span class="mitre-summary-label">Rules Analyzed</span>
            </div>
            <div class="mitre-summary-stat">
                <span class="mitre-summary-num">${Math.round((coveredTactics / MITRE_TACTICS_ORDER.length) * 100)}%</span>
                <span class="mitre-summary-label">Tactic Coverage</span>
            </div>
        </div>
        <div class="mitre-matrix">${matrixHtml}</div>
        <div class="mitre-per-connector">
            <h4>📋 Coverage per Solution</h4>
            <p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:12px">
                Click a solution to see its individual MITRE tactic breakdown.
            </p>
            ${connectorHtml}
        </div>`;
}
