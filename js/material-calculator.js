import { currentLanguage } from './state.js';
import { escapeHtml } from './utils.js';

const STORAGE_KEY = 'vts_dm_material_calculator_v1';
const STYLE_ID = 'dm-material-calculator-styles';
const PURPLE_PER_GOLD = 16;
const SD_PER_PURPLE = 4000;
const CRYSTAL_PER_PURPLE = 3200;
const GEMS_PER_PURPLE_CRAFT = 7250;
const GEMS_PER_GOLD_COMBINE = 429600;
const BLUE_PER_GOLD = 64;
const TIER_VALUES = {
  blue: 0.25,
  purple: 1,
  orange: 4,
  gold: 16,
};

const TIERS = ['blue', 'purple', 'orange', 'gold'];

const SLOTS = [
  { id: 'weapon', en: 'Weapon', de: 'Waffe' },
  { id: 'helmet', en: 'Helmet', de: 'Helm' },
  { id: 'jewelry', en: 'Jewelry', de: 'Schmuck' },
  { id: 'armor', en: 'Armor', de: 'Ruestung' },
  { id: 'accessory', en: 'Accessory', de: 'Accessoire' },
  { id: 'boots', en: 'Boots', de: 'Schuhe' },
];

const TROOPS = [
  { id: 'footmen', en: 'Footmen', de: 'Fusssoldaten' },
  { id: 'archers', en: 'Archers', de: 'Bogenschuetzen' },
  { id: 'cavalry', en: 'Cavalry', de: 'Reiter' },
];

const PRESETS = {
  full: {
    weapon: 1,
    helmet: 1,
    jewelry: 1,
    armor: 1,
    accessory: 1,
    boots: 1,
  },
  attack: {
    weapon: 1,
    helmet: 0,
    jewelry: 1,
    armor: 1,
    accessory: 1,
    boots: 0,
  },
  defense: {
    weapon: 1,
    helmet: 1,
    jewelry: 1,
    armor: 0,
    accessory: 0,
    boots: 1,
  },
};

const TEXT = {
  en: {
    title: 'Dragon Master Material Calculator',
    intro:
      'Plan a gold Dragon Master set from purple gear. Enter what you already have and the calculator shows the purple pieces and common resources still missing.',
    source: 'Reference: Rise of Castles Dragon Master guide',
    troopLabel: 'Target troop',
    presetLabel: 'Target',
    full: 'Full 6-piece set',
    attack: 'Attack first 4',
    defense: 'Defense first 4',
    clearOwned: 'Clear owned',
    tableSlot: 'Slot',
    tableTarget: 'Gold target',
    tableNeeded: 'Purple needed',
    tableOwned: 'Owned purple',
    tableLoose: 'Loose purple',
    tableRemaining: 'Still needed',
    tableReady: 'Ready',
    summaryMissing: 'Purple pieces still needed',
    summaryReady: 'Slots ready to combine',
    summaryGems: 'Total gems still needed',
    summarySd: 'Super Dragonite',
    summaryCrystals: 'Crystal shards',
    resourceTitle: 'Remaining resources from scratch',
    resourceHint:
      'Gem total includes missing-purple crafting plus the purple-to-orange combines for each target gold piece.',
    craftGems: 'Craft missing purple',
    combineGems: 'Purple to orange combines',
    totalGems: 'Total gems',
    referenceTitle: 'Quick reference',
    converterTitle: 'Tier converter',
    purpleReference: 'Purple path',
    blueReference: 'Blue path',
    convertCount: 'Count',
    convertFrom: 'From',
    convertTo: 'To',
    convertResult: '{count} {from} = {result} {to}',
    tierBlue: 'Blue',
    tierPurple: 'Purple',
    tierOrange: 'Orange',
    tierGold: 'Gold',
    perGoldPurple: '1 gold item = 16 purple pieces',
    perGoldBlue: '1 gold item = 64 blue pieces',
    fullPurple: 'Full set = 96 purple pieces',
    fullBlue: 'Full set = 384 blue pieces',
    note:
      'Set a slot target to 0 if that gold item is already finished. Loose purple counts as purple-piece equivalents for that slot.',
    surplus: 'Surplus',
    targetPieces: '{n} pieces',
  },
  de: {
    title: 'Dragon Master Materialrechner',
    intro:
      'Plane ein goldenes Dragon-Master-Set aus lila Ausruestung. Trage ein, was du hast, und der Rechner zeigt, wie viele lila Teile und Basisressourcen noch fehlen.',
    source: 'Quelle: Rise of Castles Dragon Master Guide',
    troopLabel: 'Zieltruppe',
    presetLabel: 'Ziel',
    full: 'Volles 6er Set',
    attack: 'Angriff erste 4',
    defense: 'Verteidigung erste 4',
    clearOwned: 'Besitz leeren',
    tableSlot: 'Slot',
    tableTarget: 'Gold Ziel',
    tableNeeded: 'Lila benoetigt',
    tableOwned: 'Lila Equipment',
    tableLoose: 'Lila Einzelteile',
    tableRemaining: 'Fehlt noch',
    tableReady: 'Fertig',
    summaryMissing: 'Lila Teile fehlen noch',
    summaryReady: 'Slots bereit zum Kombinieren',
    summaryGems: 'Gems fehlen noch',
    summarySd: 'Super Dragonite',
    summaryCrystals: 'Kristallsplitter',
    resourceTitle: 'Restliche Ressourcen ab null',
    resourceHint:
      'Gems enthalten das Herstellen fehlender lila Teile plus lila-zu-orange Kombinationen fuer jedes Ziel-Goldteil.',
    craftGems: 'Fehlende lila craften',
    combineGems: 'Lila zu Orange kombinieren',
    totalGems: 'Gems gesamt',
    referenceTitle: 'Kurzreferenz',
    converterTitle: 'Tier-Umrechner',
    purpleReference: 'Lila Weg',
    blueReference: 'Blauer Weg',
    convertCount: 'Anzahl',
    convertFrom: 'Von',
    convertTo: 'Zu',
    convertResult: '{count} {from} = {result} {to}',
    tierBlue: 'Blau',
    tierPurple: 'Lila',
    tierOrange: 'Orange',
    tierGold: 'Gold',
    perGoldPurple: '1 Goldteil = 16 lila Teile',
    perGoldBlue: '1 Goldteil = 64 blaue Teile',
    fullPurple: 'Volles Set = 96 lila Teile',
    fullBlue: 'Volles Set = 384 blaue Teile',
    note:
      'Setze ein Slot-Ziel auf 0, wenn das Goldteil schon fertig ist. Lila Einzelteile zaehlen hier als lila Teil-Aequivalent fuer diesen Slot.',
    surplus: 'Ueberschuss',
    targetPieces: '{n} Teile',
  },
};

let rootEl = null;
let state = null;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dm-material-root{display:grid;gap:1rem;width:min(1180px,100%);margin:0 auto;color:#e5f7ff}
    .dm-material-header,.dm-control-panel,.dm-resource-panel,.dm-reference-panel,.dm-table-wrap,.dm-summary-card{border:1px solid rgba(103,232,249,.18);background:rgba(2,8,18,.78);box-shadow:0 14px 34px rgba(0,0,0,.24)}
    .dm-material-header{display:flex;justify-content:space-between;gap:1rem;padding:1rem}.dm-material-header h2,.dm-resource-panel h3,.dm-reference-panel h3{margin:0;color:#f8fafc;font-family:"Cinzel",serif;font-weight:900;letter-spacing:0}.dm-material-header h2{font-size:clamp(1.65rem,3vw,2.45rem)}
    .dm-material-header p,.dm-resource-panel p,.dm-material-note{margin:.4rem 0 0;color:#a7c7d8;line-height:1.5}.dm-source-link,.dm-segment-btn,.dm-clear-btn{display:inline-flex;align-items:center;justify-content:center;min-height:2.35rem;border:1px solid rgba(148,163,184,.26);background:rgba(15,23,42,.72);color:#dbeafe;font-size:.78rem;font-weight:850;text-decoration:none;cursor:pointer}
    .dm-source-link{flex:0 0 auto;padding:.55rem .8rem;color:#fde68a;border-color:rgba(250,204,21,.34)}.dm-control-panel{display:grid;grid-template-columns:1fr 1fr auto;gap:.85rem;align-items:end;padding:1rem}.dm-control-group{display:grid;gap:.45rem;min-width:0}
    .dm-control-label,.dm-summary-card span,.dm-reference-grid span,.dm-resource-grid span{color:#93c5fd;font-size:.72rem;font-weight:900;text-transform:uppercase}.dm-segment-row{display:flex;flex-wrap:wrap;gap:.45rem}.dm-segment-btn{padding:.55rem .78rem}.dm-clear-btn{padding:.55rem .9rem;color:#fecaca;border-color:rgba(248,113,113,.32)}.dm-segment-btn.active{border-color:rgba(45,212,191,.75);background:rgba(20,184,166,.28);color:#f8fafc}
    .dm-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}.dm-summary-card{display:grid;gap:.25rem;min-height:6.6rem;padding:1rem}.dm-summary-card strong{color:#f8fafc;font-size:clamp(1.55rem,3vw,2.25rem);line-height:1}.dm-summary-card small,.dm-reference-grid small{color:#b6c8d4;font-size:.78rem}
    .dm-table-wrap{max-width:100%;overflow-x:auto}.dm-slot-table{width:100%;min-width:760px;border-collapse:collapse}.dm-slot-table th,.dm-slot-table td{padding:.7rem .78rem;border-bottom:1px solid rgba(148,163,184,.14);text-align:left}.dm-slot-table thead th{background:rgba(8,13,28,.96);color:#93c5fd;font-size:.7rem;font-weight:900;text-transform:uppercase}.dm-slot-table tbody th{color:#f8fafc;font-weight:900}.dm-slot-table tbody tr.is-ready{background:rgba(20,184,166,.09)}
    .dm-number-input{width:5.4rem;min-height:2.2rem;border:1px solid rgba(148,163,184,.28);background:rgba(15,23,42,.86);color:#f8fafc;font-weight:850;text-align:center}.dm-needed-pill,.dm-remaining-pill{display:inline-flex;min-height:1.8rem;align-items:center;padding:.28rem .55rem;border:1px solid rgba(148,163,184,.22);color:#dbeafe;white-space:nowrap}.dm-remaining-pill{border-color:rgba(250,204,21,.36);color:#fde68a}.dm-remaining-pill.is-complete{border-color:rgba(45,212,191,.44);color:#99f6e4}
    .dm-resource-panel{display:grid;grid-template-columns:.85fr 1.15fr;gap:1rem;padding:1rem}.dm-reference-panel{display:grid;gap:.85rem;padding:1rem}.dm-resource-grid,.dm-reference-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.dm-resource-grid div,.dm-reference-grid div{display:grid;gap:.25rem;padding:.75rem;border:1px solid rgba(148,163,184,.16);background:rgba(15,23,42,.64)}.dm-resource-grid strong,.dm-reference-grid strong{color:#f8fafc;font-size:1.05rem}
    .dm-converter{display:grid;gap:.6rem}.dm-converter-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem;align-items:end}.dm-converter-row label{display:grid;gap:.25rem;color:#93c5fd;font-size:.72rem;font-weight:900;text-transform:uppercase}.dm-tier-select{min-height:2.2rem;border:1px solid rgba(148,163,184,.28);background:rgba(15,23,42,.86);color:#f8fafc;font-weight:850}.dm-converter-row strong{color:#f8fafc}.dm-material-note{padding-inline:.15rem;font-size:.84rem}
    [data-theme="light"] .dm-material-root,[data-theme="light"] .dm-material-header,[data-theme="light"] .dm-control-panel,[data-theme="light"] .dm-resource-panel,[data-theme="light"] .dm-reference-panel,[data-theme="light"] .dm-table-wrap,[data-theme="light"] .dm-summary-card{color:#0f172a;background:rgba(255,255,255,.86)}
    @media(max-width:920px){.dm-material-header,.dm-control-panel,.dm-resource-panel,.dm-summary-grid,.dm-resource-grid,.dm-reference-grid,.dm-converter-row{display:grid;grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function getText() {
  return TEXT[currentLanguage] || TEXT.en;
}

function slotName(slot) {
  return currentLanguage === 'de' ? slot.de : slot.en;
}

function troopName(troop) {
  return currentLanguage === 'de' ? troop.de : troop.en;
}

function formatNumber(value) {
  return Math.round(value).toLocaleString(currentLanguage === 'de' ? 'de-DE' : 'en-US');
}

function cleanCount(value, max = 999) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(max, Math.max(0, Math.floor(numeric)));
}

function createDefaultSlotCounts(value = 0) {
  return SLOTS.reduce((acc, slot) => {
    acc[slot.id] = value;
    return acc;
  }, {});
}

function defaultState() {
  return {
    troop: 'footmen',
    target: { ...PRESETS.full },
    owned: createDefaultSlotCounts(0),
    loose: createDefaultSlotCounts(0),
    converter: {
      count: 6,
      from: 'gold',
      to: 'purple',
    },
  };
}

function normalizeState(raw) {
  const next = defaultState();
  if (!raw || typeof raw !== 'object') return next;
  if (TROOPS.some((troop) => troop.id === raw.troop)) next.troop = raw.troop;
  for (const slot of SLOTS) {
    next.target[slot.id] = cleanCount(raw.target?.[slot.id], 9);
    next.owned[slot.id] = cleanCount(raw.owned?.[slot.id]);
    next.loose[slot.id] = cleanCount(raw.loose?.[slot.id]);
  }
  next.converter.count = cleanCount(raw.converter?.count, 999);
  if (TIERS.includes(raw.converter?.from)) next.converter.from = raw.converter.from;
  if (TIERS.includes(raw.converter?.to)) next.converter.to = raw.converter.to;
  return next;
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return normalizeState(raw);
  } catch {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local storage can be disabled; the calculator still works for the session.
  }
}

function calculate() {
  const rows = SLOTS.map((slot) => {
    const targetGold = cleanCount(state.target[slot.id], 9);
    const requiredPurple = targetGold * PURPLE_PER_GOLD;
    const availablePurple = cleanCount(state.owned[slot.id]) + cleanCount(state.loose[slot.id]);
    const remainingPurple = Math.max(0, requiredPurple - availablePurple);
    const surplusPurple = Math.max(0, availablePurple - requiredPurple);
    return {
      slot,
      targetGold,
      requiredPurple,
      availablePurple,
      remainingPurple,
      surplusPurple,
      ready: targetGold > 0 && remainingPurple === 0,
    };
  });

  const targetGoldTotal = rows.reduce((sum, row) => sum + row.targetGold, 0);
  const missingPurpleTotal = rows.reduce((sum, row) => sum + row.remainingPurple, 0);
  const readySlots = rows.filter((row) => row.ready).length;
  const activeSlots = rows.filter((row) => row.targetGold > 0).length;
  const sd = missingPurpleTotal * SD_PER_PURPLE;
  const crystals = missingPurpleTotal * CRYSTAL_PER_PURPLE;
  const craftGems = missingPurpleTotal * GEMS_PER_PURPLE_CRAFT;
  const combineGems = targetGoldTotal * GEMS_PER_GOLD_COMBINE;

  return {
    rows,
    targetGoldTotal,
    missingPurpleTotal,
    readySlots,
    activeSlots,
    sd,
    crystals,
    craftGems,
    combineGems,
    totalGems: craftGems + combineGems,
  };
}

function renderTroopButtons() {
  const t = getText();
  return `
    <div class="dm-control-group">
      <span class="dm-control-label">${escapeHtml(t.troopLabel)}</span>
      <div class="dm-segment-row" role="group" aria-label="${escapeHtml(t.troopLabel)}">
        ${TROOPS.map(
          (troop) => `
            <button type="button" class="dm-segment-btn${state.troop === troop.id ? ' active' : ''}" data-dm-troop="${troop.id}" aria-pressed="${state.troop === troop.id ? 'true' : 'false'}">
              ${escapeHtml(troopName(troop))}
            </button>`
        ).join('')}
      </div>
    </div>`;
}

function renderPresetButtons() {
  const t = getText();
  return `
    <div class="dm-control-group">
      <span class="dm-control-label">${escapeHtml(t.presetLabel)}</span>
      <div class="dm-segment-row" role="group" aria-label="${escapeHtml(t.presetLabel)}">
        ${Object.keys(PRESETS)
          .map(
            (preset) => `
              <button type="button" class="dm-segment-btn" data-dm-preset="${preset}">
                ${escapeHtml(t[preset])}
              </button>`
          )
          .join('')}
      </div>
    </div>`;
}

function renderSummary(calc) {
  const t = getText();
  const targetLabel = t.targetPieces.replace('{n}', formatNumber(calc.targetGoldTotal * PURPLE_PER_GOLD));
  return `
    <div class="dm-summary-grid" aria-live="polite">
      <article class="dm-summary-card dm-summary-card--purple">
        <span>${escapeHtml(t.summaryMissing)}</span>
        <strong>${formatNumber(calc.missingPurpleTotal)}</strong>
        <small>${escapeHtml(targetLabel)}</small>
      </article>
      <article class="dm-summary-card dm-summary-card--ready">
        <span>${escapeHtml(t.summaryReady)}</span>
        <strong>${formatNumber(calc.readySlots)} / ${formatNumber(calc.activeSlots)}</strong>
        <small>${escapeHtml(troopName(TROOPS.find((troop) => troop.id === state.troop) || TROOPS[0]))}</small>
      </article>
      <article class="dm-summary-card dm-summary-card--gems">
        <span>${escapeHtml(t.summaryGems)}</span>
        <strong>${formatNumber(calc.totalGems)}</strong>
        <small>${escapeHtml(t.totalGems)}</small>
      </article>
    </div>`;
}

function renderSlotRows(calc) {
  const t = getText();
  return calc.rows
    .map((row) => {
      const remainingText =
        row.remainingPurple > 0
          ? formatNumber(row.remainingPurple)
          : row.surplusPurple > 0
            ? `${escapeHtml(t.surplus)} +${formatNumber(row.surplusPurple)}`
            : escapeHtml(t.tableReady);
      return `
        <tr class="${row.ready ? 'is-ready' : ''}">
          <th scope="row">${escapeHtml(slotName(row.slot))}</th>
          <td>
            <input class="dm-number-input" type="number" min="0" max="9" inputmode="numeric" value="${row.targetGold}" data-dm-field="target" data-dm-slot="${row.slot.id}" aria-label="${escapeHtml(t.tableTarget)} ${escapeHtml(slotName(row.slot))}">
          </td>
          <td><span class="dm-needed-pill">${formatNumber(row.requiredPurple)}</span></td>
          <td>
            <input class="dm-number-input" type="number" min="0" max="999" inputmode="numeric" value="${cleanCount(state.owned[row.slot.id])}" data-dm-field="owned" data-dm-slot="${row.slot.id}" aria-label="${escapeHtml(t.tableOwned)} ${escapeHtml(slotName(row.slot))}">
          </td>
          <td>
            <input class="dm-number-input" type="number" min="0" max="999" inputmode="numeric" value="${cleanCount(state.loose[row.slot.id])}" data-dm-field="loose" data-dm-slot="${row.slot.id}" aria-label="${escapeHtml(t.tableLoose)} ${escapeHtml(slotName(row.slot))}">
          </td>
          <td><span class="dm-remaining-pill${row.remainingPurple === 0 ? ' is-complete' : ''}">${remainingText}</span></td>
        </tr>`;
    })
    .join('');
}

function renderResources(calc) {
  const t = getText();
  return `
    <section class="dm-resource-panel" aria-labelledby="dmResourceTitle">
      <div>
        <h3 id="dmResourceTitle">${escapeHtml(t.resourceTitle)}</h3>
        <p>${escapeHtml(t.resourceHint)}</p>
      </div>
      <div class="dm-resource-grid">
        <div><span>${escapeHtml(t.summarySd)}</span><strong>${formatNumber(calc.sd)}</strong></div>
        <div><span>${escapeHtml(t.summaryCrystals)}</span><strong>${formatNumber(calc.crystals)}</strong></div>
        <div><span>${escapeHtml(t.craftGems)}</span><strong>${formatNumber(calc.craftGems)}</strong></div>
        <div><span>${escapeHtml(t.combineGems)}</span><strong>${formatNumber(calc.combineGems)}</strong></div>
      </div>
    </section>`;
}

function renderReference() {
  const t = getText();
  const fullSetPurple = PURPLE_PER_GOLD * SLOTS.length;
  const fullSetBlue = BLUE_PER_GOLD * SLOTS.length;
  const converterCount = cleanCount(state.converter.count, 999);
  const converted = convertTier(converterCount, state.converter.from, state.converter.to);
  return `
    <section class="dm-reference-panel" aria-labelledby="dmReferenceTitle">
      <h3 id="dmReferenceTitle">${escapeHtml(t.referenceTitle)}</h3>
      <div class="dm-reference-grid">
        <div>
          <span>${escapeHtml(t.purpleReference)}</span>
          <strong>${escapeHtml(t.perGoldPurple)}</strong>
          <small>${escapeHtml(t.fullPurple.replace('96', formatNumber(fullSetPurple)))}</small>
        </div>
        <div>
          <span>${escapeHtml(t.blueReference)}</span>
          <strong>${escapeHtml(t.perGoldBlue)}</strong>
          <small>${escapeHtml(t.fullBlue.replace('384', formatNumber(fullSetBlue)))}</small>
        </div>
      </div>
      <div class="dm-converter" aria-label="${escapeHtml(t.converterTitle)}">
        <h3>${escapeHtml(t.converterTitle)}</h3>
        <div class="dm-converter-row">
          <label><span>${escapeHtml(t.convertCount)}</span><input class="dm-number-input" type="number" min="0" max="999" inputmode="numeric" value="${converterCount}" data-dm-converter="count"></label>
          <label><span>${escapeHtml(t.convertFrom)}</span>${renderTierSelect('from')}</label>
          <label><span>${escapeHtml(t.convertTo)}</span>${renderTierSelect('to')}</label>
          <strong>${escapeHtml(formatConverterResult(t, converterCount, converted))}</strong>
        </div>
      </div>
    </section>`;
}

function tierLabel(tier) {
  const t = getText();
  const key = `tier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
  return t[key] || tier;
}

function renderTierSelect(field) {
  return `
    <select class="dm-tier-select" data-dm-converter="${field}">
      ${TIERS.map(
        (tier) =>
          `<option value="${tier}"${state.converter[field] === tier ? ' selected' : ''}>${escapeHtml(tierLabel(tier))}</option>`
      ).join('')}
    </select>`;
}

function convertTier(count, fromTier, toTier) {
  const from = TIER_VALUES[fromTier] || 1;
  const to = TIER_VALUES[toTier] || 1;
  return count * (from / to);
}

function formatConvertedNumber(value) {
  return Number.isInteger(value)
    ? formatNumber(value)
    : value.toLocaleString(currentLanguage === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 2,
      });
}

function formatConverterResult(t, count, converted) {
  return t.convertResult
    .replace('{count}', formatNumber(count))
    .replace('{from}', tierLabel(state.converter.from))
    .replace('{result}', formatConvertedNumber(converted))
    .replace('{to}', tierLabel(state.converter.to));
}

function render() {
  if (!rootEl) return;
  const t = getText();
  const calc = calculate();
  rootEl.innerHTML = `
    <div class="dm-material-root">
      <header class="dm-material-header">
        <div>
          <h2>${escapeHtml(t.title)}</h2>
          <p>${escapeHtml(t.intro)}</p>
        </div>
        <a class="dm-source-link" href="https://www.riseofcastles.net/en/dragonmaster" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(t.source)}
        </a>
      </header>

      <section class="dm-control-panel" aria-label="${escapeHtml(t.presetLabel)}">
        ${renderTroopButtons()}
        ${renderPresetButtons()}
        <button type="button" class="dm-clear-btn" data-dm-clear-owned>${escapeHtml(t.clearOwned)}</button>
      </section>

      ${renderSummary(calc)}

      <div class="dm-table-wrap">
        <table class="dm-slot-table">
          <thead>
            <tr>
              <th scope="col">${escapeHtml(t.tableSlot)}</th>
              <th scope="col">${escapeHtml(t.tableTarget)}</th>
              <th scope="col">${escapeHtml(t.tableNeeded)}</th>
              <th scope="col">${escapeHtml(t.tableOwned)}</th>
              <th scope="col">${escapeHtml(t.tableLoose)}</th>
              <th scope="col">${escapeHtml(t.tableRemaining)}</th>
            </tr>
          </thead>
          <tbody>${renderSlotRows(calc)}</tbody>
        </table>
      </div>

      ${renderResources(calc)}
      ${renderReference()}

      <p class="dm-material-note">${escapeHtml(t.note)}</p>
    </div>`;
}

function applyPreset(preset) {
  const targets = PRESETS[preset];
  if (!targets) return;
  state.target = { ...targets };
  saveState();
  render();
}

function handleInput(event) {
  const input = event.target.closest?.('[data-dm-field][data-dm-slot]');
  if (!input) {
    const converterInput = event.target.closest?.('[data-dm-converter="count"]');
    if (converterInput) {
      state.converter.count = cleanCount(converterInput.value, 999);
      saveState();
      render();
      rootEl.querySelector('[data-dm-converter="count"]')?.focus({ preventScroll: true });
    }
    return;
  }
  const field = input.dataset.dmField;
  const slot = input.dataset.dmSlot;
  if (!state[field] || !(slot in state[field])) return;
  state[field][slot] = cleanCount(input.value, field === 'target' ? 9 : 999);
  saveState();
  render();
  rootEl
    .querySelector(`[data-dm-field="${field}"][data-dm-slot="${slot}"]`)
    ?.focus({ preventScroll: true });
}

function handleClick(event) {
  const troopBtn = event.target.closest?.('[data-dm-troop]');
  if (troopBtn) {
    state.troop = troopBtn.dataset.dmTroop;
    saveState();
    render();
    return;
  }

  const presetBtn = event.target.closest?.('[data-dm-preset]');
  if (presetBtn) {
    applyPreset(presetBtn.dataset.dmPreset);
    return;
  }

  if (event.target.closest?.('[data-dm-clear-owned]')) {
    state.owned = createDefaultSlotCounts(0);
    state.loose = createDefaultSlotCounts(0);
    saveState();
    render();
  }
}

function handleChange(event) {
  const select = event.target.closest?.('select[data-dm-converter]');
  if (!select) return;
  const field = select.dataset.dmConverter;
  if ((field === 'from' || field === 'to') && TIERS.includes(select.value)) {
    state.converter[field] = select.value;
    saveState();
    render();
  }
}

export function initMaterialCalculator() {
  rootEl = document.getElementById('materialCalculatorRoot');
  if (!rootEl) return;
  ensureStyles();
  if (rootEl.dataset.dmMaterialWired === '1') {
    render();
    return;
  }
  rootEl.dataset.dmMaterialWired = '1';
  state = loadState();
  rootEl.addEventListener('input', handleInput);
  rootEl.addEventListener('change', handleChange);
  rootEl.addEventListener('click', handleClick);
  window.addEventListener('edenLanguageUpdate', render);
  render();
}
