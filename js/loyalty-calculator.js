// js/loyalty-calculator.js
import { translations } from './translations.js';

const upgradeCosts = {
    AC1: [700, 2500, 4000, 8000, 14000, 25000, 46000, 83000, 150000, 271000, 325000, 390000, 469000, 562000, 675000, 810000, 972000, 1167000, 1401000],
    AC2: [2000, 7000, 13000, 23000, 43000, 77000, 139000, 251000, 452000, 814000, 977000, 1173000, 1407000, 1688000, 2026000, 2431000, 2918000, 3501000, 4201000],
    AC3: [4000, 14000, 26000, 47000, 86000, 155000, 279000, 502000, 904000, 1629000, 1954000, 2345000, 2814000, 3377000, 4052000, 4863000, 5835000, 7002000, 8403000],
    AC4: [7000, 24000, 44000, 79000, 143000, 258000, 465000, 837000, 1508000, 2714000, 3257000, 3908000, 4699000, 5628000, 6753000, 8104000, 9725000, 11670000, 14004000]
};

const loyaltyThresholds = [
    { site: 'T1', loyalty: 0 }, { site: 'T2', loyalty: 0 }, { site: 'T3', loyalty: 200 },
    { site: 'T4', loyalty: 200 }, { site: 'T5', loyalty: 600 }, { site: 'T6', loyalty: 1000 },
    { site: 'T7', loyalty: 1400 }, { site: 'T8', loyalty: 1800 }, { site: 'T9', loyalty: 2700 },
    { site: 'T10', loyalty: 3300 }, { site: 'T11', loyalty: 3900 }, { site: 'T12', loyalty: 4800 },
    { site: 'T13', loyalty: 5600 }, { site: 'T14', loyalty: 6400 }, { site: 'T15', loyalty: 7200 },
    { site: 'T16', loyalty: 8000 }
].sort((a, b) => a.loyalty - b.loyalty);

const INPUT_IDS = [
    'ac1Level', 'ac2Level', 'ac3Level', 'ac4Level',
    'source1', 'source2', 'source3', 'source4', 'source5', 'source6',
    'bonusPoints', 'savedUnits', 'totalUnitsPerPatch',
    'processingHours', 'processingMinutes', 'processingSeconds', 'numPatches'
];

const LOYALTY_PRESETS = [
    {
        id: 'balanced',
        labelKey: 'loyaltyPresetBalanced',
        values: {
            ac1Level: 20, ac2Level: 16, ac3Level: 12, ac4Level: 10,
            source1: 1830, source2: 64999, source3: 78801, source4: 4855, source5: 1560, source6: 1560,
            bonusPoints: 20, savedUnits: 2340016, totalUnitsPerPatch: 568000,
            processingHours: 8, processingMinutes: 2, processingSeconds: 48, numPatches: 3
        }
    },
    {
        id: 'maxCamps',
        labelKey: 'loyaltyPresetMaxCamps',
        values: {
            ac1Level: 20, ac2Level: 20, ac3Level: 20, ac4Level: 20, bonusPoints: 20
        }
    },
    {
        id: 'early',
        labelKey: 'loyaltyPresetEarly',
        values: {
            ac1Level: 12, ac2Level: 10, ac3Level: 8, ac4Level: 6,
            bonusPoints: 10, savedUnits: 500000, numPatches: 2
        }
    },
    {
        id: 'throughput',
        labelKey: 'loyaltyPresetThroughput',
        values: {
            numPatches: 5, totalUnitsPerPatch: 620000,
            processingHours: 7, processingMinutes: 30, processingSeconds: 0
        }
    }
];

function t() {
    const lang = localStorage.getItem('vts_hero_lang') || 'en';
    return translations[lang] || translations.en;
}

export function getExtractionSite(loyalty) {
    for (let i = loyaltyThresholds.length - 1; i >= 0; i--) {
        if (loyalty >= loyaltyThresholds[i].loyalty) return loyaltyThresholds[i].site;
    }
    return 'T1';
}

export function formatDuration(hours) {
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

export function calculatePoisonPercentage(currentLoyalty) {
    let nextTier = null;
    let afterNextTier = null;

    for (let i = 0; i < loyaltyThresholds.length; i++) {
        if (currentLoyalty < loyaltyThresholds[i].loyalty) {
            if (!nextTier) nextTier = loyaltyThresholds[i];
            else if (!afterNextTier) { afterNextTier = loyaltyThresholds[i]; break; }
        } else if (currentLoyalty >= loyaltyThresholds[loyaltyThresholds.length - 1].loyalty) {
            return { next: '0.0', afterNext: '0.0' };
        }
    }

    const percentages = {};
    if (nextTier) {
        const loyaltyDifferenceNext = nextTier.loyalty - currentLoyalty;
        percentages.next = Math.min(100, (loyaltyDifferenceNext / 100) * 6.52).toFixed(1);
    } else percentages.next = '0.0';

    if (afterNextTier && nextTier) {
        const loyaltyDifferenceAfterNext = afterNextTier.loyalty - currentLoyalty;
        percentages.afterNext = Math.min(100, (loyaltyDifferenceAfterNext / 100) * 6.52).toFixed(1);
    } else percentages.afterNext = '0.0';

    return percentages;
}

function readInputs() {
    const get = (id) => document.getElementById(id);
    const ac1Level = parseInt(get('ac1Level')?.value, 10) || 0;
    const ac2Level = parseInt(get('ac2Level')?.value, 10) || 0;
    const ac3Level = parseInt(get('ac3Level')?.value, 10) || 0;
    const ac4Level = parseInt(get('ac4Level')?.value, 10) || 0;
    const bonusLoyalty = (parseInt(get('bonusPoints')?.value, 10) || 0) * 60;
    const savedUnits = parseInt(get('savedUnits')?.value, 10) || 0;
    const source1 = parseFloat(get('source1')?.value) || 0;
    const source2 = parseFloat(get('source2')?.value) || 0;
    const source3 = parseFloat(get('source3')?.value) || 0;
    const source6 = parseFloat(get('source6')?.value) || 0;
    const p_hours = parseFloat(get('processingHours')?.value) || 0;
    const p_mins = parseFloat(get('processingMinutes')?.value) || 0;
    const p_secs = parseFloat(get('processingSeconds')?.value) || 0;
    const processingTime = p_hours + (p_mins / 60) + (p_secs / 3600);
    const unitsPerPatch = parseFloat(get('totalUnitsPerPatch')?.value) || 0;
    const numPatches = parseInt(get('numPatches')?.value, 10) || 0;

    const campHourlyProduction = source1 + source2 + source3 + source6;
    const campDailyProduction = campHourlyProduction * 24;
    const hourlyRatePerPatch = processingTime > 0 ? unitsPerPatch / processingTime : 0;
    const possibleProcessingDaily = hourlyRatePerPatch * numPatches * 24;
    const maxProcessingPerHour = hourlyRatePerPatch * numPatches;
    const actualEffectiveHourlyRate = Math.min(maxProcessingPerHour, campHourlyProduction);
    const safeHourlyRate = actualEffectiveHourlyRate > 0 ? actualEffectiveHourlyRate : maxProcessingPerHour;
    const currentLoyalty = (ac1Level + ac2Level + ac3Level + ac4Level) * 100 + bonusLoyalty;
    const extractionSite = getExtractionSite(currentLoyalty);
    const isSurplus = campDailyProduction >= possibleProcessingDaily;
    const balanceDiff = Math.abs(campDailyProduction - possibleProcessingDaily);

    return {
        ac1Level, ac2Level, ac3Level, ac4Level,
        bonusLoyalty, savedUnits,
        campHourlyProduction, campDailyProduction,
        processingTime, unitsPerPatch, numPatches,
        hourlyRatePerPatch, possibleProcessingDaily, safeHourlyRate,
        currentLoyalty, extractionSite, isSurplus, balanceDiff
    };
}

export function buildUpgradeSequence(data) {
    const tr = t();
    const levels = { AC1: data.ac1Level, AC2: data.ac2Level, AC3: data.ac3Level, AC4: data.ac4Level };
    let currentLoyalty = data.currentLoyalty;
    let savedUnits = data.savedUnits;
    const upgradeSequence = [];
    let cumulativeTime = 0;

    if ([data.ac1Level, data.ac2Level, data.ac3Level, data.ac4Level].some(l => l < 0 || l > 20)) {
        return { error: tr.errAcLevels || 'Please enter valid AC levels (0-20).' };
    }
    if (data.processingTime <= 0) {
        return { error: tr.errProcTime || 'Processing time must be > 0.' };
    }
    if (data.possibleProcessingDaily <= 0) {
        return { error: tr.errProcRate || 'Processing rate is zero. Check patch values.' };
    }

    while (Object.values(levels).some(l => l < 20)) {
        let minCost = Infinity;
        let nextUpgrade = null;

        for (const building in levels) {
            const lvl = levels[building];
            if (lvl < 20) {
                const cost = lvl === 0 ? 0 : upgradeCosts[building][lvl - 1];
                if (cost < minCost) {
                    minCost = cost;
                    nextUpgrade = { building, level: lvl + 1, cost };
                }
            }
        }

        if (!nextUpgrade) break;

        const effectiveCost = Math.max(0, nextUpgrade.cost - savedUnits);
        savedUnits = Math.max(0, savedUnits - nextUpgrade.cost);
        const hoursNeeded = effectiveCost / data.safeHourlyRate;
        cumulativeTime += hoursNeeded;
        const newLoyalty = currentLoyalty + 100;
        const poison = calculatePoisonPercentage(currentLoyalty);

        upgradeSequence.push({
            ...nextUpgrade,
            hours: hoursNeeded,
            cumulativeTime,
            currentLoyalty,
            newLoyalty,
            extractionSite: getExtractionSite(newLoyalty),
            poisonNext: poison.next,
            poisonAfterNext: poison.afterNext
        });

        levels[nextUpgrade.building]++;
        currentLoyalty = newLoyalty;
    }

    return { upgradeSequence, cumulativeTime };
}

function renderStickySummary() {
    const el = document.getElementById('loyaltyStickySummary');
    if (!el) return;
    const tr = t();
    const data = readInputs();
    const balanceClass = data.isSurplus ? 'loyalty-stat-surplus' : 'loyalty-stat-deficit';
    const balanceLabel = data.isSurplus ? (tr.resSurplus || 'Surplus') : (tr.resDeficit || 'Deficit');

    el.innerHTML = `
        <h3 class="loyalty-sticky-title" data-i18n="loyaltySummaryTitle">${tr.loyaltySummaryTitle || 'Live summary'}</h3>
        <div class="loyalty-sticky-stats">
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="loyaltySummaryCurrent">${tr.loyaltySummaryCurrent || 'Current loyalty'}</span>
                <span class="loyalty-stat-value loyalty-stat-amber">${data.currentLoyalty.toLocaleString()}</span>
                <span class="loyalty-stat-sub">${data.extractionSite}</span>
            </div>
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="resTotalDaily">${tr.resTotalDaily || 'Total Daily Prod:'}</span>
                <span class="loyalty-stat-value">${Math.round(data.campDailyProduction).toLocaleString()}</span>
            </div>
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="resMaxProcessing">${tr.resMaxProcessing || 'Max Processing (Daily)'}</span>
                <span class="loyalty-stat-value loyalty-stat-blue">${Math.round(data.possibleProcessingDaily).toLocaleString()}</span>
            </div>
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="resProdVsProc">${tr.resProdVsProc || 'Production vs Processing'}</span>
                <span class="loyalty-stat-value ${balanceClass}">${balanceLabel} ${Math.round(data.balanceDiff).toLocaleString()}</span>
            </div>
        </div>
        <button type="button" id="calcLoyaltyBtn" class="loyalty-calc-btn" data-i18n="calcUpgradesBtn">${tr.calcUpgradesBtn || 'CALCULATE UPGRADES'}</button>`;

    el.querySelector('#calcLoyaltyBtn')?.addEventListener('click', runCalculation);
}

function renderPresets() {
    const wrap = document.getElementById('loyaltyPresets');
    if (!wrap) return;
    const tr = t();
    wrap.innerHTML = `
        <span class="loyalty-presets-label" data-i18n="loyaltyPresetsLabel">${tr.loyaltyPresetsLabel || 'Presets'}</span>
        ${LOYALTY_PRESETS.map((p) => `<button type="button" class="loyalty-preset-btn" data-preset="${p.id}" data-i18n="${p.labelKey}">${tr[p.labelKey] || p.id}</button>`).join('')}`;
}

function applyPreset(presetId) {
    const preset = LOYALTY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    Object.entries(preset.values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value;
        localStorage.setItem(`vts_loyalty_${id}`, String(value));
    });
    renderStickySummary();
    document.querySelectorAll('.loyalty-preset-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.preset === presetId);
    });
    if (typeof window.showToast === 'function') {
        const tr = t();
        window.showToast(tr.loyaltyPresetApplied || 'Preset applied', 'info', 2000);
    }
}

function renderResults(upgradeSequence, cumulativeTime, data) {
    const resultContainer = document.getElementById('loyaltyResult');
    if (!resultContainer) return;
    const tr = t();
    const lang = localStorage.getItem('vts_hero_lang') || 'en';
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const isSurplus = data.isSurplus;

    const summaryHtml = `
        <div class="loyalty-result-summary" dir="${dir}">
            <div class="loyalty-result-card">
                <p class="loyalty-result-label">${tr.resMaxProcessing || 'Max Processing (Daily)'}</p>
                <p class="loyalty-result-value loyalty-result-blue">${Math.round(data.possibleProcessingDaily).toLocaleString()} <span>${tr.resUnits || 'units'}</span></p>
                <p class="loyalty-result-hint">${Math.round(data.hourlyRatePerPatch).toLocaleString()} ${tr.resHrPerPatch || '/hr per patch'}</p>
            </div>
            <div class="loyalty-result-card">
                <p class="loyalty-result-label">${tr.resProdVsProc || 'Production vs Processing'}</p>
                <p class="loyalty-result-value ${isSurplus ? 'loyalty-result-green' : 'loyalty-result-red'}">
                    ${isSurplus ? (tr.resSurplus || 'Surplus') : (tr.resDeficit || 'Deficit')} : ${Math.round(data.balanceDiff).toLocaleString()}
                </p>
                <p class="loyalty-result-hint">${tr.resTotalDaily || 'Total Daily Prod'} (S1, S2, S3, S6): ${Math.round(data.campDailyProduction).toLocaleString()}</p>
            </div>
            <div class="loyalty-result-card loyalty-result-card-highlight">
                <p class="loyalty-result-label">${tr.resTimeMax || 'Time to Max Loyalty (8000)'}</p>
                <p class="loyalty-result-value loyalty-result-amber">${formatDuration(cumulativeTime)}</p>
            </div>
        </div>`;

    const tableRows = upgradeSequence.map((up, idx) => `
        <tr class="loyalty-table-row">
            <td class="loyalty-td-step">${idx + 1}</td>
            <td><span class="loyalty-td-building">${up.building}</span> <span class="loyalty-td-muted">${tr.lvl || 'Lvl'} ${up.level}</span></td>
            <td class="loyalty-td-cost">${up.cost.toLocaleString()}</td>
            <td class="loyalty-td-time">${formatDuration(up.hours)}</td>
            <td class="loyalty-td-cumul">${formatDuration(up.cumulativeTime)}</td>
            <td><span class="loyalty-td-muted">${up.currentLoyalty}</span> → <span class="loyalty-td-loyalty">${up.newLoyalty}</span></td>
            <td class="loyalty-td-poison">${tr.next || 'Next'}: ${up.poisonNext}%<br>${tr.after || 'After'}: ${up.poisonAfterNext}%</td>
            <td class="loyalty-td-site">${up.extractionSite}</td>
        </tr>`).join('');

    const tableHtml = `
        <div class="loyalty-results-table-wrap" dir="${dir}">
            <table class="loyalty-results-table">
                <thead>
                    <tr>
                        <th>${tr.step || 'Step'}</th>
                        <th>${tr.upgrade || 'Upgrade'}</th>
                        <th>${tr.cost || 'Cost'}</th>
                        <th>${tr.timeNeeded || 'Time Needed'}</th>
                        <th>${tr.cumulTime || 'Cumul. Time'}</th>
                        <th>${tr.loyaltyShift || 'Loyalty Shift'}</th>
                        <th>${tr.poisonPct || 'Poison %'}</th>
                        <th>${tr.siteUnlock || 'Site Unlock'}</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;

    const cardsHtml = `
        <div class="loyalty-results-cards" dir="${dir}">
            ${upgradeSequence.map((up, idx) => `
                <article class="loyalty-step-card">
                    <header class="loyalty-step-card-head">
                        <span class="loyalty-step-card-num">${idx + 1}</span>
                        <div>
                            <strong>${up.building}</strong> ${tr.lvl || 'Lvl'} ${up.level}
                            <span class="loyalty-step-card-site">${up.extractionSite}</span>
                        </div>
                    </header>
                    <dl class="loyalty-step-card-grid">
                        <div><dt>${tr.cost || 'Cost'}</dt><dd class="loyalty-td-cost">${up.cost.toLocaleString()}</dd></div>
                        <div><dt>${tr.timeNeeded || 'Time'}</dt><dd>${formatDuration(up.hours)}</dd></div>
                        <div><dt>${tr.loyaltyShift || 'Loyalty'}</dt><dd>${up.currentLoyalty} → <strong>${up.newLoyalty}</strong></dd></div>
                        <div><dt>${tr.poisonPct || 'Poison'}</dt><dd>${up.poisonNext}% / ${up.poisonAfterNext}%</dd></div>
                        <div class="loyalty-step-card-wide"><dt>${tr.cumulTime || 'Cumul.'}</dt><dd class="loyalty-td-cumul">${formatDuration(up.cumulativeTime)}</dd></div>
                    </dl>
                </article>`).join('')}
        </div>`;

    resultContainer.innerHTML = summaryHtml + tableHtml + cardsHtml;
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function runCalculation() {
    const resultContainer = document.getElementById('loyaltyResult');
    const data = readInputs();
    const result = buildUpgradeSequence(data);
    if (result.error) {
        resultContainer.innerHTML = `<p class="loyalty-error">${result.error}</p>`;
        return;
    }
    renderResults(result.upgradeSequence, result.cumulativeTime, data);
}

function initLoyaltyCrossLinks() {
    document.getElementById('loyaltyOpenEdenBtn')?.addEventListener('click', () => {
        document.getElementById('tabEdenMap')?.click();
        if (typeof window.showToast === 'function') {
            const tr = t();
            window.showToast(tr.loyaltyOpenEdenToast || 'Opened Eden Map planner', 'info', 2500);
        }
    });
}

export function openLoyaltyFromEden(context) {
    document.getElementById('tabLoyalty')?.click();
    const tr = t();
    if (typeof window.showToast === 'function') {
        const msg = context?.zone
            ? (tr.edenOpenLoyaltyToast || 'Loyalty planner — plan upgrades for {zone}')
                .replace('{zone}', context.zone)
                .replace('{name}', context.name || '')
            : (tr.edenOpenLoyaltyToastGeneric || 'Opened Loyalty planner');
        window.showToast(msg, 'info', 4000);
    }
    document.getElementById('loyaltySection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function initLoyaltyCalculator() {
    INPUT_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const savedVal = localStorage.getItem(`vts_loyalty_${id}`);
        if (savedVal !== null) el.value = savedVal;
        el.addEventListener('input', () => {
            localStorage.setItem(`vts_loyalty_${id}`, el.value);
            renderStickySummary();
            document.querySelectorAll('.loyalty-preset-btn').forEach((btn) => btn.classList.remove('active'));
        });
    });

    renderPresets();
    renderStickySummary();
    initLoyaltyCrossLinks();

    document.getElementById('loyaltyPresets')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset]');
        if (!btn) return;
        applyPreset(btn.dataset.preset);
    });

    window.addEventListener('edenLanguageUpdate', () => {
        renderPresets();
        renderStickySummary();
    });
}
