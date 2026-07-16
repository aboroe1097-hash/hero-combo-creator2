// js/loyalty-calculator.js
import { translations } from './translations.js';
import { resolveIntlLocale, resolveRuntimeLocale } from './locale-format.js';
import { outputCopyText } from './i18n/output-copy.js';

const numberFormatterCache = new Map();
const durationFormatterCache = new Map();
let activePresetId = null;

const upgradeCosts = {
  AC1: [
    700, 2500, 4000, 8000, 14000, 25000, 46000, 83000, 150000, 271000, 325000, 390000, 469000,
    562000, 675000, 810000, 972000, 1167000, 1401000,
  ],
  AC2: [
    2000, 7000, 13000, 23000, 43000, 77000, 139000, 251000, 452000, 814000, 977000, 1173000,
    1407000, 1688000, 2026000, 2431000, 2918000, 3501000, 4201000,
  ],
  AC3: [
    4000, 14000, 26000, 47000, 86000, 155000, 279000, 502000, 904000, 1629000, 1954000, 2345000,
    2814000, 3377000, 4052000, 4863000, 5835000, 7002000, 8403000,
  ],
  AC4: [
    7000, 24000, 44000, 79000, 143000, 258000, 465000, 837000, 1508000, 2714000, 3257000, 3908000,
    4699000, 5628000, 6753000, 8104000, 9725000, 11670000, 14004000,
  ],
};

const loyaltyThresholds = [
  { site: 'T1', loyalty: 0 },
  { site: 'T2', loyalty: 0 },
  { site: 'T3', loyalty: 200 },
  { site: 'T4', loyalty: 200 },
  { site: 'T5', loyalty: 600 },
  { site: 'T6', loyalty: 1000 },
  { site: 'T7', loyalty: 1400 },
  { site: 'T8', loyalty: 1800 },
  { site: 'T9', loyalty: 2700 },
  { site: 'T10', loyalty: 3300 },
  { site: 'T11', loyalty: 3900 },
  { site: 'T12', loyalty: 4800 },
  { site: 'T13', loyalty: 5600 },
  { site: 'T14', loyalty: 6400 },
  { site: 'T15', loyalty: 7200 },
  { site: 'T16', loyalty: 8000 },
].sort((a, b) => a.loyalty - b.loyalty);

const INPUT_IDS = [
  'ac1Level',
  'ac2Level',
  'ac3Level',
  'ac4Level',
  'source1',
  'source2',
  'source3',
  'source4',
  'source5',
  'source6',
  'bonusPoints',
  'savedUnits',
  'totalUnitsPerPatch',
  'processingHours',
  'processingMinutes',
  'processingSeconds',
  'numPatches',
];

const LOYALTY_PRESETS = [
  {
    id: 'balanced',
    labelKey: 'loyaltyPresetBalanced',
    values: {
      ac1Level: 20,
      ac2Level: 16,
      ac3Level: 12,
      ac4Level: 10,
      source1: 1830,
      source2: 64999,
      source3: 78801,
      source4: 4855,
      source5: 1560,
      source6: 1560,
      bonusPoints: 20,
      savedUnits: 2340016,
      totalUnitsPerPatch: 568000,
      processingHours: 8,
      processingMinutes: 2,
      processingSeconds: 48,
      numPatches: 3,
    },
  },
  {
    id: 'maxCamps',
    labelKey: 'loyaltyPresetMaxCamps',
    values: {
      ac1Level: 20,
      ac2Level: 20,
      ac3Level: 20,
      ac4Level: 20,
      bonusPoints: 20,
    },
  },
  {
    id: 'early',
    labelKey: 'loyaltyPresetEarly',
    values: {
      ac1Level: 12,
      ac2Level: 10,
      ac3Level: 8,
      ac4Level: 6,
      bonusPoints: 10,
      savedUnits: 500000,
      numPatches: 2,
    },
  },
  {
    id: 'throughput',
    labelKey: 'loyaltyPresetThroughput',
    values: {
      numPatches: 5,
      totalUnitsPerPatch: 620000,
      processingHours: 7,
      processingMinutes: 30,
      processingSeconds: 0,
    },
  },
];

function currentLanguage() {
  return resolveRuntimeLocale();
}

function t() {
  const lang = currentLanguage();
  return translations[lang] || translations.en;
}

function getNumberFormatter(language = currentLanguage(), options = {}) {
  const locale = resolveIntlLocale(language);
  const key = `${locale}:${JSON.stringify(options)}`;
  if (!numberFormatterCache.has(key)) {
    numberFormatterCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return numberFormatterCache.get(key);
}

function formatNumber(value, language = currentLanguage(), options = {}) {
  return getNumberFormatter(language, options).format(Number(value) || 0);
}

function formatDurationPart(value, unit, minimumIntegerDigits, language) {
  const locale = resolveIntlLocale(language);
  const key = `${locale}:${unit}:${minimumIntegerDigits}`;
  if (!durationFormatterCache.has(key)) {
    durationFormatterCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'unit',
        unit,
        unitDisplay: 'narrow',
        minimumIntegerDigits,
        maximumFractionDigits: 0,
        useGrouping: false,
      })
    );
  }
  return durationFormatterCache.get(key).format(value);
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

function announceResult(message) {
  const status = document.getElementById('loyaltyResultStatus');
  if (status) status.textContent = message;
}

function localizeLoyaltyImageAlternatives() {
  const tr = t();
  document.querySelectorAll('#loyaltySection [data-i18n-alt]').forEach((image) => {
    const key = image.dataset.i18nAlt;
    if (tr[key]) image.alt = tr[key];
  });
}

function localizeLoyaltyTimeUnits() {
  const language = currentLanguage();
  document.querySelectorAll('#loyaltySection [data-output-copy]').forEach((unit) => {
    unit.textContent = outputCopyText(language, unit.dataset.outputCopy);
    const ariaKey = unit.dataset.outputCopyAria;
    if (ariaKey) unit.setAttribute('aria-label', outputCopyText(language, ariaKey));
  });
}

export function getExtractionSite(loyalty) {
  for (let i = loyaltyThresholds.length - 1; i >= 0; i--) {
    if (loyalty >= loyaltyThresholds[i].loyalty) return loyaltyThresholds[i].site;
  }
  return 'T1';
}

export function getLoyaltyRequirementForSite(site) {
  const normalized = String(site || '')
    .trim()
    .toUpperCase();
  const requirement = loyaltyThresholds.find((entry) => entry.site === normalized);
  return requirement ? { ...requirement } : null;
}

function allianceCenterUpgradeCost(building, currentLevel) {
  return currentLevel === 0 ? 0 : upgradeCosts[building][currentLevel - 1];
}

export function calculateAllianceCenterUpgradeMaterials(building, currentLevel, targetLevel) {
  const normalizedBuilding = String(building || '')
    .trim()
    .toUpperCase();
  const fromLevel = Number(currentLevel);
  const toLevel = Number(targetLevel);
  if (!(normalizedBuilding in upgradeCosts)) throw new RangeError('Unknown Alliance Center.');
  if (!Number.isInteger(fromLevel) || fromLevel < 0 || fromLevel > 20) {
    throw new RangeError('Current Alliance Center level must be from 0 to 20.');
  }
  if (!Number.isInteger(toLevel) || toLevel < fromLevel || toLevel > 20) {
    throw new RangeError('Target Alliance Center level must be from the current level to 20.');
  }

  const steps = [];
  let totalMaterialUnits = 0;
  for (let level = fromLevel; level < toLevel; level++) {
    const cost = allianceCenterUpgradeCost(normalizedBuilding, level);
    totalMaterialUnits += cost;
    steps.push({ fromLevel: level, toLevel: level + 1, materialUnits: cost });
  }
  return {
    building: normalizedBuilding,
    currentLevel: fromLevel,
    targetLevel: toLevel,
    totalMaterialUnits,
    steps,
  };
}

export function calculateLoyaltyTargetMaterials(values = {}) {
  const levels = {
    AC1: Number(values.acLevels?.[0]),
    AC2: Number(values.acLevels?.[1]),
    AC3: Number(values.acLevels?.[2]),
    AC4: Number(values.acLevels?.[3]),
  };
  if (Object.values(levels).some((level) => !Number.isInteger(level) || level < 0 || level > 20)) {
    throw new RangeError('Alliance Center levels must contain four integers from 0 to 20.');
  }
  const requirement = getLoyaltyRequirementForSite(values.targetSite);
  if (!requirement) throw new RangeError('Target extraction site must be T1 through T16.');

  const bonusPoints = Number(values.bonusPoints) || 0;
  const savedUnits = Math.max(0, Number(values.savedUnits) || 0);
  const startingLoyalty =
    Object.values(levels).reduce((sum, level) => sum + level * 100, 0) + bonusPoints * 60;
  let finalLoyalty = startingLoyalty;
  let totalMaterialUnits = 0;
  const steps = [];

  while (finalLoyalty < requirement.loyalty && Object.values(levels).some((level) => level < 20)) {
    let nextUpgrade = null;
    for (const [building, currentLevel] of Object.entries(levels)) {
      if (currentLevel >= 20) continue;
      const materialUnits = allianceCenterUpgradeCost(building, currentLevel);
      if (!nextUpgrade || materialUnits < nextUpgrade.materialUnits) {
        nextUpgrade = {
          building,
          fromLevel: currentLevel,
          toLevel: currentLevel + 1,
          materialUnits,
        };
      }
    }
    if (!nextUpgrade) break;
    levels[nextUpgrade.building] = nextUpgrade.toLevel;
    finalLoyalty += 100;
    totalMaterialUnits += nextUpgrade.materialUnits;
    steps.push({ ...nextUpgrade, resultingLoyalty: finalLoyalty });
  }

  const savedUnitsApplied = Math.min(savedUnits, totalMaterialUnits);
  return {
    targetSite: requirement.site,
    targetLoyalty: requirement.loyalty,
    startingLoyalty,
    additionalLoyaltyNeeded: Math.max(0, requirement.loyalty - startingLoyalty),
    reached: finalLoyalty >= requirement.loyalty,
    finalLoyalty,
    finalAcLevels: [levels.AC1, levels.AC2, levels.AC3, levels.AC4],
    totalMaterialUnits,
    savedUnitsApplied,
    remainingMaterialUnits: totalMaterialUnits - savedUnitsApplied,
    steps,
  };
}

export function formatDuration(hours, language = currentLanguage()) {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    formatDurationPart(h, 'hour', 1, language),
    formatDurationPart(m, 'minute', 2, language),
    formatDurationPart(s, 'second', 2, language),
  ].join(' ');
}

export function calculatePoisonPercentage(currentLoyalty) {
  let nextTier = null;
  let afterNextTier = null;

  for (let i = 0; i < loyaltyThresholds.length; i++) {
    if (currentLoyalty < loyaltyThresholds[i].loyalty) {
      if (!nextTier) nextTier = loyaltyThresholds[i];
      else if (!afterNextTier) {
        afterNextTier = loyaltyThresholds[i];
        break;
      }
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

export function calculateLoyaltyInputs(values = {}) {
  const ac1Level = Number(values.ac1Level) || 0;
  const ac2Level = Number(values.ac2Level) || 0;
  const ac3Level = Number(values.ac3Level) || 0;
  const ac4Level = Number(values.ac4Level) || 0;
  const bonusLoyalty = (Number(values.bonusPoints) || 0) * 60;
  const savedUnits = Number(values.savedUnits) || 0;
  const campHourlyProduction = Number(values.campHourlyProduction) || 0;
  const processingTime = Number(values.processingTimeHours) || 0;
  const unitsPerPatch = Number(values.unitsPerPatch) || 0;
  const numPatches = Number(values.numPatches) || 0;
  const campDailyProduction = campHourlyProduction * 24;
  const hourlyRatePerPatch = processingTime > 0 ? unitsPerPatch / processingTime : 0;
  const possibleProcessingDaily = hourlyRatePerPatch * numPatches * 24;
  const maxProcessingPerHour = hourlyRatePerPatch * numPatches;
  const actualEffectiveHourlyRate = Math.min(maxProcessingPerHour, campHourlyProduction);
  const safeHourlyRate =
    actualEffectiveHourlyRate > 0 ? actualEffectiveHourlyRate : maxProcessingPerHour;
  const currentLoyalty = (ac1Level + ac2Level + ac3Level + ac4Level) * 100 + bonusLoyalty;
  const extractionSite = getExtractionSite(currentLoyalty);
  const isSurplus = campDailyProduction >= possibleProcessingDaily;
  const balanceDiff = Math.abs(campDailyProduction - possibleProcessingDaily);

  return {
    ac1Level,
    ac2Level,
    ac3Level,
    ac4Level,
    bonusLoyalty,
    savedUnits,
    campHourlyProduction,
    campDailyProduction,
    processingTime,
    unitsPerPatch,
    numPatches,
    hourlyRatePerPatch,
    possibleProcessingDaily,
    safeHourlyRate,
    currentLoyalty,
    extractionSite,
    isSurplus,
    balanceDiff,
  };
}

function readInputs() {
  const get = (id) => document.getElementById(id);
  const ac1Level = parseInt(get('ac1Level')?.value, 10) || 0;
  const ac2Level = parseInt(get('ac2Level')?.value, 10) || 0;
  const ac3Level = parseInt(get('ac3Level')?.value, 10) || 0;
  const ac4Level = parseInt(get('ac4Level')?.value, 10) || 0;
  const bonusPoints = parseInt(get('bonusPoints')?.value, 10) || 0;
  const savedUnits = parseInt(get('savedUnits')?.value, 10) || 0;
  const source1 = parseFloat(get('source1')?.value) || 0;
  const source2 = parseFloat(get('source2')?.value) || 0;
  const source3 = parseFloat(get('source3')?.value) || 0;
  const source6 = parseFloat(get('source6')?.value) || 0;
  const p_hours = parseFloat(get('processingHours')?.value) || 0;
  const p_mins = parseFloat(get('processingMinutes')?.value) || 0;
  const p_secs = parseFloat(get('processingSeconds')?.value) || 0;
  const processingTime = p_hours + p_mins / 60 + p_secs / 3600;
  const unitsPerPatch = parseFloat(get('totalUnitsPerPatch')?.value) || 0;
  const numPatches = parseInt(get('numPatches')?.value, 10) || 0;

  return calculateLoyaltyInputs({
    ac1Level,
    ac2Level,
    ac3Level,
    ac4Level,
    bonusPoints,
    savedUnits,
    campHourlyProduction: source1 + source2 + source3 + source6,
    processingTimeHours: processingTime,
    unitsPerPatch,
    numPatches,
  });
}

export function buildUpgradeSequence(data) {
  const tr = t();
  const levels = { AC1: data.ac1Level, AC2: data.ac2Level, AC3: data.ac3Level, AC4: data.ac4Level };
  let currentLoyalty = data.currentLoyalty;
  let savedUnits = data.savedUnits;
  const upgradeSequence = [];
  let cumulativeTime = 0;

  if ([data.ac1Level, data.ac2Level, data.ac3Level, data.ac4Level].some((l) => l < 0 || l > 20)) {
    return { error: tr.errAcLevels || 'Please enter valid AC levels (0-20).' };
  }
  if (data.processingTime <= 0) {
    return { error: tr.errProcTime || 'Processing time must be > 0.' };
  }
  if (data.possibleProcessingDaily <= 0) {
    return { error: tr.errProcRate || 'Processing rate is zero. Check patch values.' };
  }

  while (Object.values(levels).some((l) => l < 20)) {
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
      poisonAfterNext: poison.afterNext,
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
  const lang = currentLanguage();
  const data = readInputs();
  const balanceClass = data.isSurplus ? 'loyalty-stat-surplus' : 'loyalty-stat-deficit';
  const balanceLabel = data.isSurplus ? tr.resSurplus || 'Surplus' : tr.resDeficit || 'Deficit';

  el.innerHTML = `
        <h3 class="loyalty-sticky-title" data-i18n="loyaltySummaryTitle">${tr.loyaltySummaryTitle || 'Live summary'}</h3>
        <div class="loyalty-sticky-stats">
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="loyaltySummaryCurrent">${tr.loyaltySummaryCurrent || 'Current loyalty'}</span>
                <span class="loyalty-stat-value loyalty-stat-amber">${formatNumber(data.currentLoyalty, lang)}</span>
                <span class="loyalty-stat-sub">${data.extractionSite}</span>
            </div>
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="resTotalDaily">${tr.resTotalDaily || 'Total Daily Prod:'}</span>
                <span class="loyalty-stat-value">${formatNumber(Math.round(data.campDailyProduction), lang)}</span>
            </div>
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="resMaxProcessing">${tr.resMaxProcessing || 'Max Processing (Daily)'}</span>
                <span class="loyalty-stat-value loyalty-stat-blue">${formatNumber(Math.round(data.possibleProcessingDaily), lang)}</span>
            </div>
            <div class="loyalty-stat">
                <span class="loyalty-stat-label" data-i18n="resProdVsProc">${tr.resProdVsProc || 'Production vs Processing'}</span>
                <span class="loyalty-stat-value ${balanceClass}">${balanceLabel} ${formatNumber(Math.round(data.balanceDiff), lang)}</span>
            </div>
        </div>
        <button type="button" id="calcLoyaltyBtn" class="loyalty-calc-btn" data-i18n="calcUpgradesBtn">${tr.calcUpgradesBtn || 'CALCULATE UPGRADES'}</button>`;

  el.querySelector('#calcLoyaltyBtn')?.addEventListener('click', () => runCalculation());
}

function renderPresets() {
  const wrap = document.getElementById('loyaltyPresets');
  if (!wrap) return;
  const tr = t();
  wrap.innerHTML = `
        <span id="loyaltyPresetsLabel" class="loyalty-presets-label" data-i18n="loyaltyPresetsLabel">${tr.loyaltyPresetsLabel || 'Presets'}</span>
        ${LOYALTY_PRESETS.map((p) => `<button type="button" class="loyalty-preset-btn${activePresetId === p.id ? ' active' : ''}" data-preset="${p.id}" data-i18n="${p.labelKey}" aria-pressed="${activePresetId === p.id ? 'true' : 'false'}">${tr[p.labelKey] || p.id}</button>`).join('')}`;
}

function applyPreset(presetId) {
  const preset = LOYALTY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  activePresetId = presetId;
  Object.entries(preset.values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    localStorage.setItem(`vts_loyalty_${id}`, String(value));
  });
  renderStickySummary();
  document.querySelectorAll('.loyalty-preset-btn').forEach((btn) => {
    const isActive = btn.dataset.preset === presetId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
  if (typeof window.showToast === 'function') {
    const tr = t();
    window.showToast(tr.loyaltyPresetApplied || 'Preset applied', 'info', 2000);
  }
}

function renderResults(upgradeSequence, cumulativeTime, data, options = {}) {
  const resultContainer = document.getElementById('loyaltyResult');
  if (!resultContainer) return;
  const tr = t();
  const lang = currentLanguage();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isSurplus = data.isSurplus;
  const totalDuration = formatDuration(cumulativeTime, lang);

  const summaryHtml = `
        <div class="loyalty-result-summary" dir="${dir}">
            <div class="loyalty-result-card">
                <p class="loyalty-result-label">${tr.resMaxProcessing || 'Max Processing (Daily)'}</p>
                <p class="loyalty-result-value loyalty-result-blue">${formatNumber(Math.round(data.possibleProcessingDaily), lang)} <span>${tr.resUnits || 'units'}</span></p>
                <p class="loyalty-result-hint">${formatNumber(Math.round(data.hourlyRatePerPatch), lang)} ${tr.resHrPerPatch || '/hr per patch'}</p>
            </div>
            <div class="loyalty-result-card">
                <p class="loyalty-result-label">${tr.resProdVsProc || 'Production vs Processing'}</p>
                <p class="loyalty-result-value ${isSurplus ? 'loyalty-result-green' : 'loyalty-result-red'}">
                    ${isSurplus ? tr.resSurplus || 'Surplus' : tr.resDeficit || 'Deficit'} : ${formatNumber(Math.round(data.balanceDiff), lang)}
                </p>
                <p class="loyalty-result-hint">${tr.resTotalDaily || 'Total Daily Prod'} (S1, S2, S3, S6): ${formatNumber(Math.round(data.campDailyProduction), lang)}</p>
            </div>
            <div class="loyalty-result-card loyalty-result-card-highlight">
                <p class="loyalty-result-label">${tr.resTimeMax || 'Time to Max Loyalty (8000)'}</p>
                <p class="loyalty-result-value loyalty-result-amber">${totalDuration}</p>
            </div>
        </div>`;

  const tableRows = upgradeSequence
    .map(
      (up, idx) => `
        <tr class="loyalty-table-row">
            <td class="loyalty-td-step">${formatNumber(idx + 1, lang)}</td>
            <td><span class="loyalty-td-building">${up.building}</span> <span class="loyalty-td-muted">${tr.lvl || 'Lvl'} ${formatNumber(up.level, lang)}</span></td>
            <td class="loyalty-td-cost">${formatNumber(up.cost, lang)}</td>
            <td class="loyalty-td-time">${formatDuration(up.hours, lang)}</td>
            <td class="loyalty-td-cumul">${formatDuration(up.cumulativeTime, lang)}</td>
            <td><span class="loyalty-td-muted">${formatNumber(up.currentLoyalty, lang)}</span> → <span class="loyalty-td-loyalty">${formatNumber(up.newLoyalty, lang)}</span></td>
            <td class="loyalty-td-poison">${tr.next || 'Next'}: ${formatNumber(up.poisonNext, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%<br>${tr.after || 'After'}: ${formatNumber(up.poisonAfterNext, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</td>
            <td class="loyalty-td-site">${up.extractionSite}</td>
        </tr>`
    )
    .join('');

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
            ${upgradeSequence
              .map(
                (up, idx) => `
                <article class="loyalty-step-card">
                    <header class="loyalty-step-card-head">
                        <span class="loyalty-step-card-num">${formatNumber(idx + 1, lang)}</span>
                        <div>
                            <strong>${up.building}</strong> ${tr.lvl || 'Lvl'} ${formatNumber(up.level, lang)}
                            <span class="loyalty-step-card-site">${up.extractionSite}</span>
                        </div>
                    </header>
                    <dl class="loyalty-step-card-grid">
                        <div><dt>${tr.cost || 'Cost'}</dt><dd class="loyalty-td-cost">${formatNumber(up.cost, lang)}</dd></div>
                        <div><dt>${tr.timeNeeded || 'Time'}</dt><dd>${formatDuration(up.hours, lang)}</dd></div>
                        <div><dt>${tr.loyaltyShift || 'Loyalty'}</dt><dd>${formatNumber(up.currentLoyalty, lang)} → <strong>${formatNumber(up.newLoyalty, lang)}</strong></dd></div>
                        <div><dt>${tr.poisonPct || 'Poison'}</dt><dd>${formatNumber(up.poisonNext, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% / ${formatNumber(up.poisonAfterNext, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</dd></div>
                        <div class="loyalty-step-card-wide"><dt>${tr.cumulTime || 'Cumul.'}</dt><dd class="loyalty-td-cumul">${formatDuration(up.cumulativeTime, lang)}</dd></div>
                    </dl>
                </article>`
              )
              .join('')}
        </div>`;

  resultContainer.innerHTML = summaryHtml + tableHtml + cardsHtml;
  if (options.announce !== false) {
    announceResult(`${tr.resTimeMax || 'Time to Max Loyalty (8000)'}: ${totalDuration}`);
  }
  if (options.focus !== false) resultContainer.focus({ preventScroll: true });
  if (options.scroll !== false) {
    resultContainer.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }
}

function runCalculation(options = {}) {
  const resultContainer = document.getElementById('loyaltyResult');
  const data = readInputs();
  const result = buildUpgradeSequence(data);
  if (result.error) {
    resultContainer.innerHTML = `<p class="loyalty-error" role="alert">${result.error}</p>`;
    if (options.focus !== false) resultContainer.focus({ preventScroll: true });
    if (options.scroll !== false) {
      resultContainer.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    }
    return;
  }
  renderResults(result.upgradeSequence, result.cumulativeTime, data, options);
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
      : tr.edenOpenLoyaltyToastGeneric || 'Opened Loyalty planner';
    window.showToast(msg, 'info', 4000);
  }
  document
    .getElementById('loyaltySection')
    ?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
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
      activePresetId = null;
      document.querySelectorAll('.loyalty-preset-btn').forEach((btn) => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
    });
  });

  localizeLoyaltyImageAlternatives();
  localizeLoyaltyTimeUnits();
  renderPresets();
  renderStickySummary();
  initLoyaltyCrossLinks();

  document.getElementById('loyaltyPresets')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preset]');
    if (!btn) return;
    applyPreset(btn.dataset.preset);
  });

  window.addEventListener('edenLanguageUpdate', () => {
    const hasResults = Boolean(document.getElementById('loyaltyResult')?.childElementCount);
    localizeLoyaltyImageAlternatives();
    localizeLoyaltyTimeUnits();
    renderPresets();
    renderStickySummary();
    if (hasResults) runCalculation({ announce: false, focus: false, scroll: false });
  });
}
