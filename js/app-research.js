import { escapeHtml } from './utils.js';
import { ENABLE_RESEARCH_FEATURE, activeTechSeasons, techSearchQuery, db, setActiveTechSeasons, setTechSearchQuery, getSourceCreditText, TechseasonColors, TECH_SEASON_ORDER, researchSection } from './state.js';
// Extracted Research Calculator Module
import { techDatabase } from './tech-db.js';
import { renderTechNodeIconSvg, resolveTechNodeIcon } from './research-node-icons.js';
import { appT } from './utils.js';

const RESEARCH_PROGRESS_KEY = 'vts_research_v1';
let researchProgressCache = null;

function getResearchProgress() {
    if (researchProgressCache) return researchProgressCache;
    try {
        const parsed = JSON.parse(localStorage.getItem(RESEARCH_PROGRESS_KEY) || '{}');
        researchProgressCache = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch {
        researchProgressCache = {};
    }
    return researchProgressCache;
}

function researchProgressId(techId, nodeId) {
    return `${techId}:${nodeId}`;
}

function getStoredNodeLevel(techId, nodeId) {
    const progress = getResearchProgress();
    const stored = Number(progress[researchProgressId(techId, nodeId)]);
    if (Number.isFinite(stored) && stored > 0) return stored;

    const legacyKey = `tech_${techId}_${nodeId}`;
    const legacy = parseInt(localStorage.getItem(legacyKey), 10) || 0;
    if (legacy > 0) setStoredNodeLevel(techId, nodeId, legacy);
    try { localStorage.removeItem(legacyKey); } catch {}
    return legacy;
}

function setStoredNodeLevel(techId, nodeId, level) {
    const progress = getResearchProgress();
    const key = researchProgressId(techId, nodeId);
    const safeLevel = Math.max(0, Number(level) || 0);
    if (safeLevel > 0) progress[key] = safeLevel;
    else delete progress[key];
    try {
        localStorage.setItem(RESEARCH_PROGRESS_KEY, JSON.stringify(progress));
        localStorage.removeItem(`tech_${techId}_${nodeId}`);
    } catch {}
}

function getNodeLevelMedals(node, levelIndex) {
    const genericCost = (node.costs && node.costs[levelIndex]) || 0;
    const wbCost = (node.warBadgeCosts && node.warBadgeCosts[levelIndex])
        || (node.wisdomCosts && node.wisdomCosts[levelIndex])
        || (node.wb_costs && node.wb_costs[levelIndex]) || 0;
    const cmCost = (node.courageCosts && node.courageCosts[levelIndex])
        || (node.cm_costs && node.cm_costs[levelIndex]) || 0;

    let wb = 0;
    let cm = 0;
    if (node.costType === 'Dual') {
        wb = wbCost > 0 ? wbCost : genericCost;
        cm = cmCost;
    } else if (node.costType === 'Courage') {
        cm = genericCost > 0 ? genericCost : cmCost;
    } else if (node.costType === 'Wisdom' || node.costType === 'War Badge' || node.costType === 'War Badges') {
        wb = genericCost > 0 ? genericCost : wbCost;
    }
    return { wb, cm };
}

function getTechMedalTotals(tech) {
    let wbMax = 0;
    let wbCurrent = 0;
    let cmMax = 0;
    let cmCurrent = 0;
    let levelsMax = 0;
    let levelsCurrent = 0;

    tech.nodes.forEach((node) => {
        const savedLevel = getStoredNodeLevel(tech.id, node.id);
        levelsMax += node.maxLevel;
        levelsCurrent += savedLevel;
        for (let i = 0; i < node.maxLevel; i++) {
            const { wb, cm } = getNodeLevelMedals(node, i);
            wbMax += wb;
            cmMax += cm;
            if (i < savedLevel) {
                wbCurrent += wb;
                cmCurrent += cm;
            }
        }
    });

    const medalMax = wbMax + cmMax;
    const medalCurrent = wbCurrent + cmCurrent;
    const pct = medalMax > 0
        ? (medalCurrent / medalMax) * 100
        : (levelsMax > 0 ? (levelsCurrent / levelsMax) * 100 : 0);

    return {
        wbMax, wbCurrent, cmMax, cmCurrent,
        medalMax, medalCurrent,
        pct,
        remainingWb: wbMax - wbCurrent,
        remainingCm: cmMax - cmCurrent,
    };
}

function syncTechSeasonButtons() {
    document.querySelectorAll('.tech-season-btn').forEach((btn) => {
        const season = btn.dataset.season;
        const isActive = activeTechSeasons.has(season);
        btn.classList.toggle('active', isActive);
        if (isActive) {
            btn.style.setProperty('--sc', TechseasonColors[season] || '#38bdf8');
        } else {
            btn.style.removeProperty('--sc');
        }
    });
    syncResearchQuickButtons();
}

function syncResearchQuickButtons() {
    const allBtn = document.getElementById('techSeasonAllBtn');
    const currentBtn = document.getElementById('techSeasonX1Btn');
    const isAll = TECH_SEASON_ORDER.every((s) => activeTechSeasons.has(s));
    const isX1Only = activeTechSeasons.size === 1 && activeTechSeasons.has('X1');
    allBtn?.classList.toggle('active', isAll);
    currentBtn?.classList.toggle('active', isX1Only);
}

function closeTechCalculator() {
    const container = document.getElementById('techCalculatorContainer');
    if (!container || container.classList.contains('hidden')) return;
    container.classList.add('research-calculator--closing');
    window.setTimeout(() => {
        container.classList.add('hidden');
        container.classList.remove('research-calculator--closing');
    }, 200);
}

function updateTechSeasons(seasons) {
    setActiveTechSeasons(new Set(seasons));
    syncTechSeasonButtons();
    renderTechList();
    closeTechCalculator();
}

function getFilteredTechTrees() {
    const q = techSearchQuery.trim().toLowerCase();
    return techDatabase
        .filter((tech) => activeTechSeasons.has(tech.season))
        .filter((tech) => {
            if (!q) return true;
            const hay = `${tech.name} ${tech.season} ${tech.unlockCondition} ${tech.primaryResource}`.toLowerCase();
            return hay.includes(q);
        })
        .sort((a, b) => {
            const si = TECH_SEASON_ORDER.indexOf(a.season) - TECH_SEASON_ORDER.indexOf(b.season);
            if (si !== 0) return si;
            const ar = a.default_pos?.row || 99;
            const br = b.default_pos?.row || 99;
            if (ar !== br) return ar - br;
            return (a.default_pos?.col || 99) - (b.default_pos?.col || 99);
        });
}

function initResearchCalculator() {
    const researchSection = document.getElementById('researchSection');
    if (!researchSection) return;

    if (!ENABLE_RESEARCH_FEATURE) {
        researchSection.innerHTML = `
            <div class="mb-6 text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 shadow-inner">
                <h2 class="text-2xl sm:text-3xl font-black text-amber-400 uppercase tracking-widest mb-2 drop-shadow-md">Under Construction</h2>
            </div>
        `;
        return;
    }

    const seasonBtns = document.querySelectorAll('.tech-season-btn');
    if (!seasonBtns.length) return;

    syncTechSeasonButtons();

    seasonBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const season = btn.dataset.season;
            if (activeTechSeasons.has(season)) {
                if (activeTechSeasons.size > 1) activeTechSeasons.delete(season);
            } else {
                activeTechSeasons.add(season);
            }
            syncTechSeasonButtons();
            renderTechList();
            closeTechCalculator();
        });
    });

    document.getElementById('techSeasonAllBtn')?.addEventListener('click', () => {
        updateTechSeasons(TECH_SEASON_ORDER);
    });

    document.getElementById('techSeasonX1Btn')?.addEventListener('click', () => {
        updateTechSeasons(['X1']);
    });

    const searchInput = document.getElementById('techSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            setTechSearchQuery(e.target.value);
            renderTechList();
        });
    }

    renderTechList();
}

window.quickMaxTech = function(e, techId) {
    e.stopPropagation();
    const tech = techDatabase.find(t => t.id === techId);
    if (!tech) return;

    tech.nodes.forEach(n => {
        setStoredNodeLevel(tech.id, n.id, n.maxLevel);
    });

    updateGlobalSummary();
    renderTechList();

    const btn = e.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="w-3 h-3 inline pb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> MAXED`;
    btn.classList.replace('text-blue-300', 'text-emerald-300');
    btn.classList.replace('border-blue-500/50', 'border-emerald-500/50');
    btn.classList.replace('bg-blue-900/80', 'bg-emerald-900/80');

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.replace('text-emerald-300', 'text-blue-300');
        btn.classList.replace('border-emerald-500/50', 'border-blue-500/50');
        btn.classList.replace('bg-emerald-900/80', 'bg-blue-900/80');
    }, 1000);

    const calcContainer = document.getElementById('techCalculatorContainer');
    if (calcContainer && !calcContainer.classList.contains('hidden')) {
        renderCalculator(tech);
    }
};

function renderTechList() {
    const container = document.getElementById('techListContainer');
    if (!container) return;

    container.classList.add('research-list--updating');

    if (!document.getElementById('dynamic-tech-grid-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-tech-grid-styles';
        style.innerHTML = `
            @media (min-width: 1024px) {
                .tech-card-pos { grid-row: var(--desk-row); grid-column: var(--desk-col); }
            }
        `;
        document.head.appendChild(style);
    }

    const filteredTechs = getFilteredTechTrees();
    updateGlobalSummary(filteredTechs);

    const countEl = document.getElementById('techTreeCount');
    if (countEl) {
        countEl.textContent = appT('researchTreeCount', { n: filteredTechs.length });
    }

    container.innerHTML = '<div class="research-grid" id="techGridWrapper"></div>';
    const wrapper = document.getElementById('techGridWrapper');

    if (filteredTechs.length === 0) {
        const emptyMsg = techSearchQuery.trim()
            ? appT('researchNoResults')
            : appT('researchNoData');
        wrapper.innerHTML = `<p class="research-empty">${emptyMsg}</p>`;
        requestAnimationFrame(() => container.classList.remove('research-list--updating'));
        return;
    }

    let lastSeason = null;
    const showSeasonHeaders = activeTechSeasons.size > 1;
    let cardIndex = 0;

    filteredTechs.forEach((tech) => {
        if (showSeasonHeaders && tech.season !== lastSeason) {
            lastSeason = tech.season;
            const header = document.createElement('div');
            header.className = 'research-season-header';
            header.style.setProperty('--season-color', TechseasonColors[tech.season] || '#3b82f6');
            header.innerHTML = `<span class="research-season-chip">${tech.season}</span><span class="research-season-line"></span>`;
            wrapper.appendChild(header);
        }

        const sColor = TechseasonColors[tech.season] || '#3b82f6';
        const totals = getTechMedalTotals(tech);
        const r = tech.default_pos?.row || 'auto';
        const c = tech.default_pos?.col || 'auto';

        const card = document.createElement('div');
        card.className = 'tech-card-pos tech-card-hover research-tech-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.style.cssText = `
            --desk-row: ${r};
            --desk-col: ${c};
            --season-color: ${sColor};
            --hover-color: ${sColor}40;
            --border-color: ${sColor};
            --card-delay: ${Math.min(cardIndex * 35, 280)}ms;
        `;
        cardIndex += 1;

        const resourceLabel = tech.primaryResource || '—';
        const progressPct = Math.min(100, Math.max(0, totals.pct));

        card.innerHTML = `
            <button type="button" class="research-card-max" onclick="quickMaxTech(event, '${tech.id}')">MAX</button>
            <div class="research-card-head">
                <h3 class="research-card-title">${tech.name}</h3>
                <span class="research-card-season">${tech.season}</span>
            </div>
            <p class="research-card-unlock">${appT('researchUnlock')}: ${tech.unlockCondition}</p>
            <p class="research-card-resource">${resourceLabel}</p>
            <div class="research-card-progress">
                <div class="research-card-progress-bar" style="width:${progressPct.toFixed(1)}%"></div>
            </div>
            <span class="research-card-pct">${appT('researchProgress', { pct: progressPct.toFixed(0) })}</span>
            <span class="research-card-cta">${appT('researchOpenCalc')}</span>
        `;

        const openCalc = () => renderCalculator(tech);
        card.addEventListener('click', openCalc);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCalc(); }
        });
        wrapper.appendChild(card);
    });

    let sourceNote = document.getElementById('researchSourceNote');
    if (!sourceNote) {
        sourceNote = document.createElement('p');
        sourceNote.id = 'researchSourceNote';
        sourceNote.className = 'research-source-note';
        container.appendChild(sourceNote);
    }
    sourceNote.textContent = getSourceCreditText();
    requestAnimationFrame(() => container.classList.remove('research-list--updating'));
}

function updateGlobalSummary(filteredTechs = null) {
    if (!filteredTechs) filteredTechs = getFilteredTechTrees();

    let totalWbMax = 0;
    let totalWbCurrent = 0;
    let totalCmMax = 0;
    let totalCmCurrent = 0;

    filteredTechs.forEach((tech) => {
        const t = getTechMedalTotals(tech);
        totalWbMax += t.wbMax;
        totalWbCurrent += t.wbCurrent;
        totalCmMax += t.cmMax;
        totalCmCurrent += t.cmCurrent;
    });

    const remainingWb = totalWbMax - totalWbCurrent;
    const remainingCm = totalCmMax - totalCmCurrent;
    const totalMedalsMax = totalWbMax + totalCmMax;
    const totalMedalsCurrent = totalWbCurrent + totalCmCurrent;
    const progressPercent = totalMedalsMax > 0 ? (totalMedalsCurrent / totalMedalsMax) * 100 : 0;

    const summaryEl = document.getElementById('globalTechSummary');
    if (!summaryEl) return;

    if (totalMedalsMax === 0 && filteredTechs.length === 0) {
        summaryEl.innerHTML = '';
        return;
    }

    const iconCM = '<img src="images/CM.png" class="research-medal-icon" alt="CM">';
    const iconWB = '<img src="images/WB.png" class="research-medal-icon" alt="WB">';

    summaryEl.innerHTML = `
        <div class="research-summary-card">
            <h3 class="research-summary-title">${appT('researchGlobalSummary')}</h3>
            <div class="research-summary-progress-wrap">
                <div class="research-summary-progress-labels">
                    <span>${appT('researchCombinedCompletion')}</span>
                    <span class="research-summary-pct">${progressPercent.toFixed(1)}%</span>
                </div>
                <div class="research-summary-progress-track">
                    <div class="research-summary-progress-fill" style="width:${progressPercent}%"></div>
                </div>
            </div>
            <div class="research-summary-stats">
                ${totalWbMax > 0 ? `
                <div class="research-summary-stat research-summary-stat-wb">
                    <span class="research-summary-stat-label">${appT('researchRemainingWb')}</span>
                    <span class="research-summary-stat-value">${iconWB} ${remainingWb.toLocaleString()}</span>
                    <span class="research-summary-stat-total">${appT('researchOfTotal', { n: totalWbMax.toLocaleString() })}</span>
                </div>` : ''}
                ${totalCmMax > 0 ? `
                <div class="research-summary-stat research-summary-stat-cm">
                    <span class="research-summary-stat-label">${appT('researchRemainingCm')}</span>
                    <span class="research-summary-stat-value">${iconCM} ${remainingCm.toLocaleString()}</span>
                    <span class="research-summary-stat-total">${appT('researchOfTotal', { n: totalCmMax.toLocaleString() })}</span>
                </div>` : ''}
            </div>
        </div>
    `;
}

function applyAutoGridToGroup(groupNodes) {
    let r = 1;
    let lastType = '';
    let colsInRow = new Set();

    groupNodes.forEach((node, i) => {
        if (node.row && node.col) {
            r = node.row;
            colsInRow.add(node.col);
            return;
        }

        let t = node.troop ? node.troop.toLowerCase() : '';
        let type = (t === 'all' || t.includes('lofty') || !t) ? 'ALL' : 'SPECIFIC';
        
        let c = 2; 
        if (t.includes('footm')) c = 1; 
        if (t.includes('arch')) c = 3;  

        if (type !== lastType && colsInRow.size > 0) {
            r++;
            colsInRow.clear();
        }

        if (colsInRow.has(c)) {
            if (type === 'ALL') {
                if (!colsInRow.has(1)) c = 1;
                else if (!colsInRow.has(3)) c = 3;
                else { r++; colsInRow.clear(); c = 2; }
            } else {
                r++;
                colsInRow.clear();
            }
        }

        if (type === 'ALL' && colsInRow.size === 0) {
            let next = groupNodes[i + 1];
            let nextIsAll = next && (!next.troop || next.troop.toLowerCase() === 'all' || next.troop.toLowerCase().includes('lofty'));
            let nextNext = groupNodes[i + 2];
            let nextNextIsAll = nextNext && (!nextNext.troop || nextNext.troop.toLowerCase() === 'all');
            
            if (nextIsAll && (!nextNext || !nextNextIsAll)) c = 1; 
        } else if (type === 'ALL' && colsInRow.has(1) && !colsInRow.has(2)) {
             c = 3; 
        }

        node.row = r;
        node.col = c;
        colsInRow.add(c);
        lastType = type;
    });
}

function usesGameTreeLayout(tech) {
    if (tech.layoutMode === 'branch') return false;
    if (tech.layoutMode === 'game') return true;
    const hasTroopBranches = tech.nodes.some(
        (n) => n.b == 1 || n.b == 2 || n.b == 3 || n.b === '1' || n.b === '2' || n.b === '3'
    );
    if (hasTroopBranches) return false;
    return tech.nodes.every((n) => n.row && n.col);
}

function getGameTroopClass(troop) {
    const t = (troop || '').toLowerCase();
    if (t.includes('arch')) return 'archer';
    if (t.includes('cav')) return 'cavalry';
    if (t === 'all' || !t) return 'all';
    return 'footmen';
}

function formatGameNodeLevel(node, level) {
    if (level >= node.maxLevel) return 'MAX';
    return `${level}/${node.maxLevel}`;
}

function syncGameNodeVisual(node, level, wrapEl) {
    const wraps = wrapEl
        ? [wrapEl]
        : Array.from(document.querySelectorAll(`.game-tech-node-wrap[data-node-id="${node.id}"]`));
    wraps.forEach((wrap) => {
        const pct = node.maxLevel > 0 ? (level / node.maxLevel) * 100 : 0;
        wrap.style.setProperty('--node-pct', `${pct}%`);
        wrap.style.setProperty('--node-deg', String((pct / 100) * 360));
        const tap = wrap.querySelector('.game-tech-tap');
        const lvlEl = wrap.querySelector('.game-tech-level-badge');
        const input = wrap.querySelector('.tech-node-input');
        const maxBtn = wrap.querySelector('.game-tech-step--max');
        if (lvlEl) lvlEl.textContent = formatGameNodeLevel(node, level);
        if (input) input.value = level;
        if (tap) {
            tap.setAttribute('aria-label', `${node.name}: level ${level} of ${node.maxLevel}`);
            tap.classList.toggle('game-tech-tap--maxed', level >= node.maxLevel);
            tap.classList.toggle('game-tech-tap--progress', level > 0 && level < node.maxLevel);
        }
        if (maxBtn) {
            const isMaxed = level >= node.maxLevel;
            maxBtn.textContent = isMaxed ? '↩' : 'MAX';
            maxBtn.dataset.step = isMaxed ? '0' : 'max';
            maxBtn.classList.toggle('game-tech-step--undo', isMaxed);
        }
    });
}

function syncGameNodeButton(node, level) {
    syncGameNodeVisual(node, level);
}

function pulseGameNodeWrap(wrapEl) {
    if (!wrapEl) return;
    wrapEl.classList.remove('game-tech-node-wrap--pulse');
    void wrapEl.offsetWidth;
    wrapEl.classList.add('game-tech-node-wrap--pulse');
    window.setTimeout(() => wrapEl.classList.remove('game-tech-node-wrap--pulse'), 320);
}

function buildGameTreeTierHtml(nodesInRow) {
    const slots = [null, null, null];
    nodesInRow.forEach((node) => {
        const col = Math.min(3, Math.max(1, node.col || 2)) - 1;
        slots[col] = node;
    });
    const wideConnector = nodesInRow.length >= 3 ? ' game-tree-connector--wide' : '';
    let html = '<div class="game-tree-tier">';
    slots.forEach((node, idx) => {
        if (node) {
            const level = getStoredNodeLevel(node._techId || node.techId, node.id);
            const troopClass = getGameTroopClass(node.troop);
            const shortName = node.name.replace(/\s+(I|II|III|IV)$/i, '').trim();
            const pct = node.maxLevel > 0 ? (level / node.maxLevel) * 100 : 0;
            const tapState = level >= node.maxLevel
                ? ' game-tech-tap--maxed'
                : level > 0 ? ' game-tech-tap--progress' : '';
            const maxLabel = level >= node.maxLevel ? '↩' : 'MAX';
            const maxStep = level >= node.maxLevel ? '0' : 'max';
            const maxUndo = level >= node.maxLevel ? ' game-tech-step--undo' : '';
            const iconMeta = resolveTechNodeIcon(node);
            html += `
              <div class="tech-node-container game-tech-node-wrap game-tech-node-wrap--${troopClass}"
                style="--node-col:${node.col || idx + 1}; --node-pct:${pct}%; --node-deg:${(pct / 100) * 360}; --node-icon-tint:${iconMeta.tint}"
                data-node-id="${node.id}" data-icon-id="${iconMeta.id}">
                <button type="button" class="game-tech-tap game-tech-tap--${troopClass}${tapState}"
                  aria-label="${escapeHtml(node.name)}: level ${level} of ${node.maxLevel}">
                  <span class="game-tech-medallion" aria-hidden="true">
                    <span class="game-tech-ring"></span>
                    <span class="game-tech-core">
                      <span class="game-tech-icon">${renderTechNodeIconSvg(node)}</span>
                    </span>
                    <span class="game-tech-level-badge">${formatGameNodeLevel(node, level)}</span>
                  </span>
                </button>
                <div class="game-tech-stepper" role="group" aria-label="${escapeHtml(node.name)} level controls">
                  <button type="button" class="game-tech-step" data-step="-1" aria-label="Decrease level">−</button>
                  <button type="button" class="game-tech-step game-tech-step--max${maxUndo}" data-step="${maxStep}">${maxLabel}</button>
                  <button type="button" class="game-tech-step" data-step="1" aria-label="Increase level">+</button>
                </div>
                <div class="node-cost-display game-tech-cost-pill" aria-live="polite"></div>
                <span class="game-tech-name" title="${escapeHtml(node.name)}">${escapeHtml(shortName)}</span>
                <input type="number" class="tech-node-input" min="0" max="${node.maxLevel}" value="${level}" tabindex="-1" aria-hidden="true" hidden>
              </div>`;
        } else {
            html += '<span class="game-tree-slot" aria-hidden="true"></span>';
        }
    });
    html += `</div><div class="game-tree-connector${wideConnector}" aria-hidden="true"></div>`;
    return html;
}

function renderGameTreePageHtml(tech, pageNodes) {
    const rowMap = {};
    pageNodes.forEach((node) => {
        const row = node.row || 1;
        if (!rowMap[row]) rowMap[row] = [];
        rowMap[row].push({ ...node, _techId: tech.id });
    });
    const rowKeys = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
    let html = '<div class="research-game-tree">';
    rowKeys.forEach((rk, i) => {
        rowMap[rk].sort((a, b) => (a.col || 0) - (b.col || 0));
        html += buildGameTreeTierHtml(rowMap[rk]);
        if (i === rowKeys.length - 1) {
            html = html.replace(/<div class="game-tree-connector[^"]*"[^>]*><\/div>$/, '');
        }
    });
    html += '</div>';
    return html;
}

function bindGameNodePress(el, { onTap, onLong, longMs = 480 } = {}) {
    let timer = null;
    let longFired = false;
    const clear = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };
    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        longFired = false;
        clear();
        if (onLong) {
            timer = window.setTimeout(() => {
                longFired = true;
                onLong();
            }, longMs);
        }
    });
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('click', (e) => {
        e.preventDefault();
        if (longFired) {
            longFired = false;
            return;
        }
        onTap?.(e);
    });
}

function wireGameTechNodeContainers(rootEl, tech) {
    const updateFns = [];
    rootEl.querySelectorAll('.game-tech-node-wrap').forEach((wrap) => {
        const input = wrap.querySelector('.tech-node-input');
        const tap = wrap.querySelector('.game-tech-tap');
        const nodeId = wrap.dataset.nodeId;
        const node = tech.nodes.find((n) => n.id === nodeId);
        if (!input || !node) return;

        const max = parseInt(input.max, 10);
        let current = parseInt(input.value, 10) || 0;

        const updateLevel = (val, { pulse = true } = {}) => {
            let v = typeof val === 'string' && val === 'max' ? max : parseInt(val, 10);
            if (isNaN(v) || v < 0) v = 0;
            if (v > max) v = max;
            const changed = v !== current;
            current = v;
            input.value = v;
            setStoredNodeLevel(tech.id, nodeId, v);
            syncGameNodeVisual(node, v, wrap);
            if (changed && pulse) pulseGameNodeWrap(wrap);
            calculateTechTotals(tech);
        };

        const bump = (delta) => {
            if (delta > 0 && current >= max) {
                pulseGameNodeWrap(wrap);
                return;
            }
            updateLevel(current + delta);
        };

        updateFns.push({ nodeId, updateLevel, max });

        if (tap) {
            bindGameNodePress(tap, {
                onTap: () => bump(1),
                onLong: () => updateLevel(max),
            });
        }

        wrap.querySelectorAll('.game-tech-step').forEach((btn) => {
            const step = btn.dataset.step;
            if (step === '-1') {
                bindGameNodePress(btn, {
                    onTap: () => bump(-1),
                    onLong: () => updateLevel(0),
                    longMs: 520,
                });
                return;
            }
            bindGameNodePress(btn, {
                onTap: () => {
                    if (step === 'max') updateLevel(max);
                    else if (step === '0') updateLevel(0);
                    else bump(parseInt(step, 10) || 0);
                },
            });
        });
    });
    return updateFns;
}

function renderGameCalculator(tech, container) {
    const pages = tech.treePages || null;
    const pageGroups = {};
    tech.nodes.forEach((node) => {
        const p = node.page || 1;
        if (!pageGroups[p]) pageGroups[p] = [];
        pageGroups[p].push(node);
    });
    const pageIds = Object.keys(pageGroups).map(Number).sort((a, b) => a - b);

    const pageTabsHtml = pages && pageIds.length > 1
        ? `<div class="research-page-tabs" role="tablist">${pageIds.map((pid, i) =>
            `<button type="button" class="research-page-tab${i === 0 ? ' active' : ''}" role="tab" data-game-page="${pid}" aria-selected="${i === 0}">${escapeHtml(pages[pid - 1] || `Page ${pid}`)}</button>`
          ).join('')}</div>`
        : '';

    const pagesHtml = pageIds.map((pid, i) =>
        `<div class="research-game-page${i === 0 ? ' active' : ''}" data-game-page-panel="${pid}" role="tabpanel">${renderGameTreePageHtml(tech, pageGroups[pid])}</div>`
    ).join('');

    container.innerHTML = `
      <div class="research-calc-top">
        <div class="research-calc-header">
          <div>
            <h3 class="research-calc-title">${escapeHtml(tech.name)} <span class="research-calc-season">(${tech.season})</span></h3>
            <p class="research-calc-sub">Primary Cost: <span class="text-white">${escapeHtml(tech.primaryResource)}</span></p>
          </div>
          <button type="button" id="closeCalcBtn" class="research-calc-close" aria-label="Close calculator">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="research-calc-actions">
          <button type="button" id="resetAllTechBtn" class="research-calc-btn research-calc-btn--reset">Reset All</button>
          <button type="button" id="maxAllTechBtn" class="research-calc-btn research-calc-btn--max">Max All</button>
        </div>
      </div>
      <div class="research-game-shell">
        <div class="research-game-titlebar"><span class="research-game-title">${escapeHtml(tech.name)}</span></div>
        ${pageTabsHtml}
        <div class="research-game-tree-viewport">${pagesHtml}</div>
        <p class="research-game-footer">${appT('researchGameHint')}</p>
      </div>
      <div class="research-calc-total">
        <div class="flex flex-col">
          <span class="text-[11px] sm:text-sm text-amber-500 font-bold uppercase tracking-widest mb-0.5 sm:mb-1">Tree Total</span>
          <span class="text-[10px] sm:text-sm text-slate-400">Total remaining for this specific tree</span>
        </div>
        <div id="totalTechCost" class="flex flex-col items-start sm:items-end gap-1.5 sm:gap-2 tabular-nums"></div>
      </div>`;

    requestAnimationFrame(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    document.getElementById('closeCalcBtn').onclick = closeTechCalculator;

    const updateFns = wireGameTechNodeContainers(container, tech);

    container.querySelectorAll('.research-page-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const pid = tab.dataset.gamePage;
            container.querySelectorAll('.research-page-tab').forEach((t) => {
                t.classList.toggle('active', t === tab);
                t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            });
            container.querySelectorAll('.research-game-page').forEach((p) => {
                p.classList.toggle('active', p.dataset.gamePagePanel === pid);
            });
        });
    });

    document.getElementById('resetAllTechBtn')?.addEventListener('click', () => updateFns.forEach((o) => o.updateLevel(0)));
    document.getElementById('maxAllTechBtn')?.addEventListener('click', () => updateFns.forEach((o) => o.updateLevel(o.max)));
    calculateTechTotals(tech);
}

function renderCalculator(tech) {
    const container = document.getElementById('techCalculatorContainer');
    container.classList.remove('hidden', 'research-calculator--closing');

    // 1. Cleanly normalize the manual Row/Col/Branch tags from the DB. 
    // ZERO auto-guessing logic here.
    tech.nodes.forEach((node) => {
        if (node.Row !== undefined) node.row = node.Row;
        if (node.column !== undefined) node.col = node.column;
        if (node.branch !== undefined) node.b = node.branch;
    });

    if (usesGameTreeLayout(tech)) {
        renderGameCalculator(tech, container);
        return;
    }

    const trunkNodes = tech.nodes.filter(n => !n.b);
    const b1Nodes = tech.nodes.filter(n => n.b == 1 || n.b === '1');
    const b2Nodes = tech.nodes.filter(n => n.b == 2 || n.b === '2');
    const b3Nodes = tech.nodes.filter(n => n.b == 3 || n.b === '3');

    [trunkNodes, b1Nodes, b2Nodes, b3Nodes].forEach(group => {
        if (group.length) applyAutoGridToGroup(group);
    });

    const buildNodeHtml = (node) => {
        const savedLevel = getStoredNodeLevel(tech.id, node.id);
        const isMaxed = savedLevel === node.maxLevel;
        
        // Dynamic classes based on max status
        const maxedContainerStyle = isMaxed ? 'opacity-50 saturate-0 border-slate-800 shadow-none' : 'border-slate-700 hover:border-slate-500 shadow-xl';
        
        let quickButtonsHtml = `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="0">0</button>`;
        if (node.maxLevel >= 5) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="5">5</button>`;
        if (node.maxLevel >= 10) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="10">10</button>`;
        if (node.maxLevel >= 15) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="15">15</button>`;
        if (node.maxLevel >= 20) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="20">20</button>`;
        
        // Smart Toggle Button
        let toggleText = isMaxed ? 'UNDO' : 'MAX';
        let toggleVal = isMaxed ? 0 : node.maxLevel;
        let toggleColor = isMaxed ? 'bg-slate-700 border-slate-500 hover:bg-slate-600 text-white' : 'bg-blue-900/50 border-blue-500/50 hover:bg-blue-800/70 text-blue-300';
        
        quickButtonsHtml += `<button class="quick-set-btn max-toggle-btn px-1.5 sm:px-2 py-0.5 sm:py-1 ${toggleColor} border rounded text-[9px] sm:text-[10px] font-black transition-colors" data-val="${toggleVal}">${toggleText}</button>`;

        let colClass = node.col ? `sm:col-start-${node.col}` : '';

        return `
            <div class="${colClass} flex justify-center w-full relative z-10">
                <div class="tech-node-container flex flex-col bg-slate-800/95 w-full sm:w-[310px] max-w-[340px] shrink-0 p-3 sm:p-5 rounded-xl sm:rounded-2xl border relative transition-all ${maxedContainerStyle}" data-node-id="${node.id}">
                    <div class="flex justify-between items-start mb-2 sm:mb-3">
                        <div class="pr-2 flex-1 min-w-0">
                            <span class="text-[13px] sm:text-base font-black text-white block leading-tight drop-shadow-sm break-words whitespace-normal">${node.name}</span>
                            <span class="text-[9px] sm:text-[11px] text-sky-400 font-semibold uppercase tracking-wider mt-0.5 sm:mt-1 block break-words whitespace-normal">${node.buff}</span>
                        </div>
                        <div class="flex flex-col items-end text-right shrink-0 min-w-[70px] sm:min-w-[90px]">
                            <span class="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Remaining</span>
                            <div class="node-cost-display flex flex-col w-full gap-1 sm:gap-1.5 tabular-nums text-right text-[10px] sm:text-xs">
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-col gap-1.5 sm:gap-2 mt-auto">
                        <div class="flex items-center gap-2 sm:gap-4 bg-slate-900/80 p-1.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-700/50 shadow-inner">
                            <div class="flex flex-col items-center justify-center min-w-[40px] sm:min-w-[50px]">
                                <span class="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lvl</span>
                                <input type="number" min="0" max="${node.maxLevel}" value="${savedLevel}" class="tech-node-input w-10 sm:w-14 bg-slate-800 border border-slate-600 rounded text-center text-white font-black py-0.5 sm:py-1 text-[10px] sm:text-sm outline-none focus:border-blue-500 focus:bg-slate-700 transition-colors">
                            </div>
                            <input type="range" min="0" max="${node.maxLevel}" value="${savedLevel}" class="tech-node-slider flex-1 h-1.5 sm:h-2 bg-slate-700 rounded-full appearance-none cursor-pointer outline-none" style="accent-color: #3b82f6;">
                            <div class="flex flex-col items-center justify-center min-w-[25px] sm:min-w-[35px] px-1">
                                <span class="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Max</span>
                                <span class="text-[10px] sm:text-sm font-black text-slate-400">${node.maxLevel}</span>
                            </div>
                        </div>
                        <div class="flex justify-between gap-1 w-full mt-0.5 sm:mt-1">
                            ${quickButtonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const renderNodeGroup = (nodes) => {
        let rowGroups = {};
        nodes.forEach(node => {
            if (!rowGroups[node.row]) rowGroups[node.row] = [];
            rowGroups[node.row].push(node);
        });
        const rKeys = Object.keys(rowGroups).map(Number).sort((a,b)=>a-b);
        
        let gHtml = '<div class="flex flex-col items-center w-full px-2">';
        rKeys.forEach((rk, i) => {
            const rNodes = rowGroups[rk];
            rNodes.sort((a,b) => a.col - b.col);
            
            gHtml += `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 relative z-10 w-full max-w-[1000px] mb-3 sm:mb-4">`;
            rNodes.forEach(n => gHtml += buildNodeHtml(n));
            gHtml += `</div>`;
            
            if (i < rKeys.length - 1) {
                gHtml += `
                    <div class="flex flex-col items-center w-full relative z-0 -my-4 sm:-my-6 pointer-events-none opacity-70">
                        <div class="w-[2px] sm:w-[3px] h-6 sm:h-10 bg-gradient-to-b from-sky-500/60 via-sky-500/30 to-transparent shadow-[0_0_8px_rgba(14,165,233,0.5)] rounded-full"></div>
                    </div>`;
            }
        });
        gHtml += '</div>';
        return gHtml;
    };

    let html = `
        <div class="research-calc-top">
            <div class="research-calc-header">
                <div>
                    <h3 class="research-calc-title">${tech.name} <span class="research-calc-season">(${tech.season})</span></h3>
                    <p class="research-calc-sub">Primary Cost: <span class="text-white">${tech.primaryResource}</span></p>
                </div>
                <button type="button" id="closeCalcBtn" class="research-calc-close" aria-label="Close calculator">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="research-calc-actions">
                <button type="button" id="resetAllTechBtn" class="research-calc-btn research-calc-btn--reset">Reset All</button>
                <button type="button" id="maxAllTechBtn" class="research-calc-btn research-calc-btn--max">Max All</button>
            </div>
        </div>
        
        <div class="overflow-x-hidden overflow-y-auto max-h-[60vh] custom-scrollbar bg-slate-950/40 rounded-xl sm:rounded-2xl border border-slate-800 shadow-inner relative mb-3 sm:mb-4">
    `;

    let treeHtml = `<div class="flex flex-col items-center py-4 sm:py-6 w-full relative">`;
    
    if (trunkNodes.length) {
        treeHtml += renderNodeGroup(trunkNodes);
    }
    
    const hasBranches = b1Nodes.length || b2Nodes.length || b3Nodes.length;
    if (hasBranches) {
        if (trunkNodes.length) {
            treeHtml += `
                <div class="flex flex-col items-center w-full relative z-0 -my-2 sm:-my-4 pointer-events-none opacity-70">
                    <div class="w-[2px] sm:w-[3px] h-6 sm:h-10 bg-gradient-to-b from-sky-500/60 via-sky-500/30 to-transparent shadow-[0_0_8px_rgba(14,165,233,0.5)] rounded-full"></div>
                </div>
            `;
        }

        treeHtml += `
            <div class="research-branch-segment relative z-10 px-2">
                <button type="button" class="research-branch-btn branch-tab-btn active" data-target="branch_1">
                    <span>+</span><span>Footmen</span>
                </button>
                <button type="button" class="research-branch-btn branch-tab-btn" data-target="branch_2">
                    <span>+</span><span>Cavalry</span>
                </button>
                <button type="button" class="research-branch-btn branch-tab-btn" data-target="branch_3">
                    <span>+</span><span>Archer</span>
                </button>
            </div>
        `;

        treeHtml += `
            <div id="branch_1" class="branch-content w-full flex flex-col items-center animate-fade-in">
                ${b1Nodes.length ? renderNodeGroup(b1Nodes) : '<p class="text-slate-500 italic">No nodes in this branch</p>'}
            </div>
            <div id="branch_2" class="branch-content w-full flex flex-col items-center hidden">
                ${b2Nodes.length ? renderNodeGroup(b2Nodes) : '<p class="text-slate-500 italic">No nodes in this branch</p>'}
            </div>
            <div id="branch_3" class="branch-content w-full flex flex-col items-center hidden">
                ${b3Nodes.length ? renderNodeGroup(b3Nodes) : '<p class="text-slate-500 italic">No nodes in this branch</p>'}
            </div>
        `;
    }
    
    treeHtml += `</div></div>`; 

    html += treeHtml;

    html += `
        <div class="research-calc-total">
            <div class="flex flex-col">
                <span class="text-[11px] sm:text-sm text-amber-500 font-bold uppercase tracking-widest mb-0.5 sm:mb-1">Tree Total</span>
                <span class="text-[10px] sm:text-sm text-slate-400">Total remaining for this specific tree</span>
            </div>
            <div id="totalTechCost" class="flex flex-col items-start sm:items-end gap-1.5 sm:gap-2 tabular-nums"></div>
        </div>
    `;

    container.innerHTML = html;
    requestAnimationFrame(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('closeCalcBtn').onclick = closeTechCalculator;

    const branchTabs = container.querySelectorAll('.branch-tab-btn');
    const branchContents = container.querySelectorAll('.branch-content');

    branchTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            branchTabs.forEach(t => t.classList.remove('active'));
            branchContents.forEach(c => c.classList.add('hidden'));
            tab.classList.add('active');
            container.querySelector('#' + tab.dataset.target)?.classList.remove('hidden');
        });
    });

    const containers = container.querySelectorAll('.tech-node-container');
    const updateFns = []; 

    containers.forEach(cont => {
        const slider = cont.querySelector('.tech-node-slider');
        const input = cont.querySelector('.tech-node-input');
        const maxBtn = cont.querySelector('.max-toggle-btn');
        const nodeId = cont.dataset.nodeId;

        const updateLevel = (val) => {
            let v = parseInt(val);
            const max = parseInt(input.max);
            if (isNaN(v) || v < 0) v = 0;
            if (v > max) v = max;
            
            slider.value = v;
            input.value = v;
            setStoredNodeLevel(tech.id, nodeId, v);

            // Dynamic Gray-out & Button Swap
            if (v === max) {
                cont.classList.remove('border-slate-700', 'hover:border-slate-500', 'shadow-xl');
                cont.classList.add('opacity-50', 'saturate-0', 'border-slate-800', 'shadow-none');
                if (maxBtn) {
                    maxBtn.dataset.val = 0;
                    maxBtn.innerHTML = 'UNDO';
                    maxBtn.className = 'quick-set-btn max-toggle-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 border border-slate-500 hover:bg-slate-600 text-white rounded text-[9px] sm:text-[10px] font-black transition-colors';
                }
            } else {
                cont.classList.add('border-slate-700', 'hover:border-slate-500', 'shadow-xl');
                cont.classList.remove('opacity-50', 'saturate-0', 'border-slate-800', 'shadow-none');
                if (maxBtn) {
                    maxBtn.dataset.val = max;
                    maxBtn.innerHTML = 'MAX';
                    maxBtn.className = 'quick-set-btn max-toggle-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-900/50 border border-blue-500/50 hover:bg-blue-800/70 text-blue-300 rounded text-[9px] sm:text-[10px] font-black transition-colors';
                }
            }

            calculateTechTotals(tech);
        };
        
        updateFns.push({ nodeId, updateLevel, max: parseInt(input.max) });

        slider.addEventListener('input', (e) => updateLevel(e.target.value));
        input.addEventListener('input', (e) => updateLevel(e.target.value));
        
        cont.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-set-btn');
            if (btn) updateLevel(btn.dataset.val);
        });
    });

    document.getElementById('resetAllTechBtn').addEventListener('click', () => {
        updateFns.forEach(obj => obj.updateLevel(0));
    });

    document.getElementById('maxAllTechBtn').addEventListener('click', () => {
        updateFns.forEach(obj => obj.updateLevel(obj.max));
    });

    calculateTechTotals(tech);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function calculateTechTotals(tech) {
    let grandTotalCourage = 0;
    let grandTotalWisdom = 0;
    let grandTotalOther = 0;
    
    const iconCM = `<img src="images/CM.png" class="w-3 h-3 sm:w-5 sm:h-5 inline-block object-contain shrink-0" alt="CM">`;
    const iconWB = `<img src="images/WB.png" class="w-3 h-3 sm:w-5 sm:h-5 inline-block object-contain shrink-0" alt="WB">`;
    const iconRes = `<svg class="w-3 h-3 sm:w-5 sm:h-5 text-amber-400 inline-block shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>`;

    tech.nodes.forEach(node => {
        const container = document.querySelector(`.tech-node-container[data-node-id="${node.id}"]`);
        const input = container?.querySelector('.tech-node-input');
        const display = container?.querySelector('.node-cost-display');
        const currentLevel = input
            ? (parseInt(input.value, 10) || 0)
            : getStoredNodeLevel(tech.id, node.id);

        let nodeWisdom = 0;
        let nodeCourage = 0;
        let nodeOther = 0;

        for (let i = currentLevel; i < node.maxLevel; i++) {
            let genericCost = (node.costs && node.costs[i]) || 0;
            let wbCost = (node.warBadgeCosts && node.warBadgeCosts[i]) || (node.wisdomCosts && node.wisdomCosts[i]) || (node.wb_costs && node.wb_costs[i]) || 0;
            let cmCost = (node.courageCosts && node.courageCosts[i]) || (node.cm_costs && node.cm_costs[i]) || 0;

            if (node.costType === "Dual") {
                nodeWisdom += wbCost > 0 ? wbCost : genericCost;
                nodeCourage += cmCost;
            } else if (node.costType === "Courage") {
                nodeCourage += genericCost > 0 ? genericCost : cmCost;
            } else if (node.costType === "Wisdom" || node.costType === "War Badge" || node.costType === "War Badges") {
                nodeWisdom += genericCost > 0 ? genericCost : wbCost;
            } else {
                nodeOther += genericCost;
            }
        }

        if (display) {
            const isGamePill = display.classList.contains('game-tech-cost-pill');
            const remainingTotal = nodeWisdom + nodeCourage + nodeOther;
            if (isGamePill && remainingTotal === 0) {
                display.innerHTML = '';
            } else if (node.costType === "Dual") {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--wb">${iconWB}<span>${nodeWisdom.toLocaleString()}</span></span><span class="game-tech-pill game-tech-pill--cm">${iconCM}<span>${nodeCourage.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-purple-300 font-bold bg-purple-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-purple-500/30">${iconWB} <span>${nodeWisdom.toLocaleString()}</span></span><span class="flex items-center justify-between w-full text-blue-300 font-bold bg-blue-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30 mt-1">${iconCM} <span>${nodeCourage.toLocaleString()}</span></span>`;
            } else if (node.costType === "Courage") {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--cm">${iconCM}<span>${nodeCourage.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-blue-300 font-bold bg-blue-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30">${iconCM} <span>${nodeCourage.toLocaleString()}</span></span>`;
            } else if (node.costType === "Wisdom" || node.costType === "War Badge" || node.costType === "War Badges") {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--wb">${iconWB}<span>${nodeWisdom.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-purple-300 font-bold bg-purple-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-purple-500/30">${iconWB} <span>${nodeWisdom.toLocaleString()}</span></span>`;
            } else {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--res">${iconRes}<span>${nodeOther.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-amber-400 font-bold bg-amber-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-amber-500/30">${iconRes} <span>${nodeOther.toLocaleString()}</span></span>`;
            }
        }

        syncGameNodeButton(node, currentLevel);

        grandTotalWisdom += nodeWisdom;
        grandTotalCourage += nodeCourage;
        grandTotalOther += nodeOther;
    });

    const totalContainer = document.getElementById('totalTechCost');
    let hasBoth = (grandTotalCourage > 0 && grandTotalWisdom > 0);
    let isDualString = tech.primaryResource.includes("Dual");

    if (isDualString || hasBoth) {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-purple-300 bg-purple-900/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-purple-500/50 shadow-inner">
                <span class="flex items-center">${iconWB} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest hidden sm:inline">War Badges</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest sm:hidden">WB</span></span> 
                <span>${grandTotalWisdom.toLocaleString()}</span>
            </span>
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-blue-300 bg-blue-900/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-blue-500/50 shadow-inner mt-2 sm:mt-0">
                <span class="flex items-center">${iconCM} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest hidden sm:inline">Courage Medals</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest sm:hidden">CM</span></span> 
                <span>${grandTotalCourage.toLocaleString()}</span>
            </span>
        `;
    } else if (grandTotalWisdom > 0 || tech.primaryResource.includes("Wisdom") || tech.primaryResource.includes("War Badge")) {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-purple-300 bg-purple-900/40 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-purple-500/50 shadow-inner">
                <span class="flex items-center">${iconWB} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest hidden sm:inline">War Badges</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest sm:hidden">WB</span></span> 
                <span>${grandTotalWisdom.toLocaleString()}</span>
            </span>
        `;
    } else if (grandTotalCourage > 0 || tech.primaryResource.includes("Courage")) {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-blue-300 bg-blue-900/40 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-blue-500/50 shadow-inner">
                <span class="flex items-center">${iconCM} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest hidden sm:inline">Courage Medals</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest sm:hidden">CM</span></span> 
                <span>${grandTotalCourage.toLocaleString()}</span>
            </span>
        `;
    } else {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-amber-400 bg-amber-900/40 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-500/50 shadow-inner">
                <span class="flex items-center">${iconRes} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-amber-500 uppercase tracking-widest hidden sm:inline">Resources</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-amber-500 uppercase tracking-widest sm:hidden">Res</span></span> 
                <span>${grandTotalOther.toLocaleString()}</span>
            </span>
        `;
    }
    
    updateGlobalSummary();
}

window.closeTechCalculator = closeTechCalculator;
window.syncTechSeasonButtons = syncTechSeasonButtons;
window.syncResearchQuickButtons = syncResearchQuickButtons;

export { initResearchCalculator, renderTechList, updateGlobalSummary, renderCalculator };
