import { currentLanguage } from './state.js';
import { escapeHtml } from './utils.js';

const STORAGE_KEY = 'vts_dm_material_calculator_v1';
const STYLE_ID = 'dm-material-calculator-styles';
const PURPLE_PER_GOLD = 16;
const PURPLE_PER_ORANGE = 4;
const BLUE_PER_PURPLE = 4;
const SD_PER_PURPLE = 4000;
const CRYSTAL_PER_PURPLE = 3200;
const GEMS_PER_PURPLE_CRAFT = 7250;
const GEMS_PER_GOLD_COMBINE = 429600;
const BLUE_PER_GOLD = 64;
const PURPLE_MATERIAL_PER_ORANGE = 4000;
const ORANGE_MATERIAL_PER_GOLD = 80;
const STAT_PER_GOLD = {
  atk: 4816,
  def: 3233,
  hp: 18667,
};
const QUICK_ADD_AMOUNTS = {
  blue: 1000,
  purple: 500,
  orange: 25,
  gold: 1,
};
const TROOP_HERO_HINTS = {
  footmen: 'Arthur',
  archers: 'Sakuya',
  cavalry: 'Lawman',
};
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
  { id: 'footmen', en: 'Footmen', de: 'Fusssoldaten', icon: 'blade' },
  { id: 'archers', en: 'Archers', de: 'Bogenschuetzen', icon: 'arrow' },
  { id: 'cavalry', en: 'Cavalry', de: 'Reiter', icon: 'standard' },
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

const PRESET_KEYS = Object.keys(PRESETS);
const INVENTORY_TIERS = [
  { id: 'blue', textKey: 'inventoryBlue' },
  { id: 'purple', textKey: 'inventoryPurple' },
  { id: 'orange', textKey: 'inventoryOrange' },
  { id: 'gold', textKey: 'inventoryGold' },
];

const TEXT = {
  en: {
    title: 'Dragon Master Material Calculator',
    intro:
      'Plan a gold Dragon Master set from blue, purple, orange, and gold material paths with a live build map.',
    source: 'Reference: Rise of Castles Dragon Master guide',
    troopLabel: 'Target troop',
    presetLabel: 'Target set',
    full: 'Full 6-piece',
    attack: 'Attack 4',
    defense: 'Defense 4',
    clearOwned: 'Clear owned',
    tableSlot: 'Slot',
    tableTarget: 'Gold target',
    tableNeeded: 'Purple needed',
    tableOwned: 'Owned purple',
    tableLoose: 'Loose purple',
    tableRemaining: 'Still needed',
    tableReady: 'Ready',
    summaryMissing: 'Purple shortfall',
    summaryReady: 'Slots ready',
    summaryGems: 'Total gems still needed',
    summarySd: 'Super Dragonite',
    summaryCrystals: 'Crystal shards',
    resourceTitle: 'Remaining resources after stash',
    resourceHint:
      'Resource totals use the slot gaps after assigned gear plus the blue and purple stash from the material map.',
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
    targetPieces: '{n} target purple',
    setupTitle: 'Setup wizard',
    stepOne: '1',
    stepTwo: '2',
    stepThree: '3',
    stepOneTitle: 'Choose troop focus',
    stepTwoTitle: 'Select target set',
    stepThreeTitle: 'Current progress',
    stepOneCaption: 'Pick which Dragon Master troop line this plan belongs to.',
    stepTwoCaption: 'Use a preset, then fine-tune individual gold targets in the table.',
    stepThreeCaption: 'Progress updates live from your owned and loose purple counts.',
    progressTitle: 'Slot progress',
    mapTitle: 'Interactive material map',
    mapSourceTitle: 'Source materials',
    mapConversionTitle: 'Conversion path',
    mapSinkTitle: 'Gold targets',
    inventoryBlue: 'Blue stash',
    inventoryPurple: 'Purple stash',
    inventoryOrange: 'Orange stash',
    inventoryGold: 'Gold stash',
    assignedPurple: 'Assigned purple',
    fromBlue: 'From blue stash',
    fromOrangeGold: 'Orange/gold stash',
    totalCoverage: 'Total coverage',
    slotGap: 'Slot gaps',
    stashAfterGap: 'Stash after gap',
    blueToPurple: '4 blue -> 1 purple',
    resourceToPurple: '4000 SD + 3200 shards -> 1 purple',
    purpleToOrange: '4 purple -> 1 orange',
    purpleToGold: '16 purple -> 1 gold',
    targetGold: 'Target gold',
    targetOrange: 'Orange combines',
    mapShortfall: 'Purple to craft',
    mapReady: 'Covered',
    precisionTitle: 'Precision slot editor',
    emptyTarget: 'No active target',
    inventoryTitle: 'Your materials',
    scanOcr: 'Scan OCR',
    quickAdd: 'Quick Add',
    ocrScan: 'OCR Scan',
    importInventory: 'Import',
    importSuccess: 'Material import updated.',
    importFailed: 'Copy JSON or text with blue, purple, orange, and gold counts first.',
    quickAddSuccess: 'Quick materials added.',
    timelineTitle: 'Crafting timeline',
    weekLabel: 'Week {n}',
    purpleCost: '{n} purple',
    readyTimeline: 'Ready',
    conversionPlannerTitle: 'Conversion calculator',
    purpleMaterials: 'Purple',
    orangeMaterials: 'Orange',
    goldMaterials: 'Gold',
    maxWeapon: 'Max Weapon',
    maxHelmet: 'Max Helmet',
    customTarget: 'Custom Target',
    comparisonTitle: 'Current DM Set vs Target DM Set',
    currentSet: 'Current DM Set',
    targetSet: 'Target DM Set',
    atkStat: 'ATK',
    defStat: 'DEF',
    hpStat: 'HP',
    completeLabel: '{n}% Complete',
    integrationsTitle: 'Integration opportunities',
    researchIntegration: "Research 'Advanced Metallurgy' first - reduces purple cost by 15%",
    heroIntegration: 'This DM set boosts {hero} ({troop}) by +24% ATK',
    edenIntegration: 'Eden rewards this week: 2.4k purple - save for {slot}',
    openResearch: 'Open Research',
    openHeroAtlas: 'Open Hero Atlas',
    openEdenMap: 'Open Eden Map',
  },
  de: {
    title: 'Dragon Master Materialrechner',
    intro:
      'Plane ein goldenes Dragon-Master-Set ueber blaue, lila, orange und goldene Materialpfade mit Live-Build-Map.',
    source: 'Quelle: Rise of Castles Dragon Master Guide',
    troopLabel: 'Zieltruppe',
    presetLabel: 'Zielset',
    full: 'Volles 6er Set',
    attack: 'Angriff 4',
    defense: 'Verteidigung 4',
    clearOwned: 'Besitz leeren',
    tableSlot: 'Slot',
    tableTarget: 'Gold Ziel',
    tableNeeded: 'Lila benoetigt',
    tableOwned: 'Lila Equipment',
    tableLoose: 'Lila Einzelteile',
    tableRemaining: 'Fehlt noch',
    tableReady: 'Fertig',
    summaryMissing: 'Lila Fehlmenge',
    summaryReady: 'Slots fertig',
    summaryGems: 'Gems fehlen noch',
    summarySd: 'Super Dragonite',
    summaryCrystals: 'Kristallsplitter',
    resourceTitle: 'Restliche Ressourcen nach Vorrat',
    resourceHint:
      'Ressourcen nutzen Slot-Luecken nach zugewiesener Ausruestung plus blauen und lila Vorrat aus der Material-Map.',
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
    targetPieces: '{n} Ziel-Lila',
    setupTitle: 'Setup-Assistent',
    stepOne: '1',
    stepTwo: '2',
    stepThree: '3',
    stepOneTitle: 'Truppenfokus waehlen',
    stepTwoTitle: 'Zielset auswaehlen',
    stepThreeTitle: 'Aktueller Fortschritt',
    stepOneCaption: 'Waehle, fuer welche Dragon-Master-Truppenlinie dieser Plan gilt.',
    stepTwoCaption: 'Nutze ein Preset und passe einzelne Goldziele danach in der Tabelle an.',
    stepThreeCaption: 'Der Fortschritt aktualisiert sich live aus Besitz und losen lila Teilen.',
    progressTitle: 'Slot-Fortschritt',
    mapTitle: 'Interaktive Material-Map',
    mapSourceTitle: 'Quellmaterialien',
    mapConversionTitle: 'Umwandlungspfad',
    mapSinkTitle: 'Goldziele',
    inventoryBlue: 'Blauer Vorrat',
    inventoryPurple: 'Lila Vorrat',
    inventoryOrange: 'Oranger Vorrat',
    inventoryGold: 'Goldener Vorrat',
    assignedPurple: 'Zugewiesene Lila',
    fromBlue: 'Aus blauem Vorrat',
    fromOrangeGold: 'Orange/Gold Vorrat',
    totalCoverage: 'Abdeckung gesamt',
    slotGap: 'Slot-Luecken',
    stashAfterGap: 'Vorrat nach Luecke',
    blueToPurple: '4 blau -> 1 lila',
    resourceToPurple: '4000 SD + 3200 Splitter -> 1 lila',
    purpleToOrange: '4 lila -> 1 orange',
    purpleToGold: '16 lila -> 1 gold',
    targetGold: 'Goldziel',
    targetOrange: 'Orange-Kombis',
    mapShortfall: 'Lila zu craften',
    mapReady: 'Abgedeckt',
    precisionTitle: 'Slot-Editor',
    emptyTarget: 'Kein aktives Ziel',
    inventoryTitle: 'Deine Materialien',
    scanOcr: 'OCR scannen',
    quickAdd: 'Schnell addieren',
    ocrScan: 'OCR Scan',
    importInventory: 'Import',
    importSuccess: 'Materialimport aktualisiert.',
    importFailed: 'Kopiere zuerst JSON oder Text mit blue, purple, orange und gold Werten.',
    quickAddSuccess: 'Schnellmaterialien addiert.',
    timelineTitle: 'Crafting-Zeitplan',
    weekLabel: 'Woche {n}',
    purpleCost: '{n} lila',
    readyTimeline: 'Fertig',
    conversionPlannerTitle: 'Umwandlungsrechner',
    purpleMaterials: 'Lila',
    orangeMaterials: 'Orange',
    goldMaterials: 'Gold',
    maxWeapon: 'Max Waffe',
    maxHelmet: 'Max Helm',
    customTarget: 'Eigenes Ziel',
    comparisonTitle: 'Aktuelles DM-Set vs Ziel-DM-Set',
    currentSet: 'Aktuelles DM-Set',
    targetSet: 'Ziel-DM-Set',
    atkStat: 'ATK',
    defStat: 'DEF',
    hpStat: 'HP',
    completeLabel: '{n}% komplett',
    integrationsTitle: 'Integrationsmoeglichkeiten',
    researchIntegration: "Erforsche 'Advanced Metallurgy' zuerst - reduziert lila Kosten um 15%",
    heroIntegration: 'Dieses DM-Set boostet {hero} ({troop}) mit +24% ATK',
    edenIntegration: 'Eden-Belohnungen diese Woche: 2.4k lila - fuer {slot} sparen',
    openResearch: 'Research oeffnen',
    openHeroAtlas: 'Hero Atlas oeffnen',
    openEdenMap: 'Eden Map oeffnen',
  },
};

let rootEl = null;
let state = null;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .dm-material-root{--dm-bg:rgba(2,8,18,.84);--dm-panel:rgba(15,23,42,.72);--dm-panel-strong:rgba(8,13,28,.94);--dm-border:rgba(103,232,249,.18);--dm-border-strong:rgba(45,212,191,.46);--dm-text:#e5f7ff;--dm-heading:#f8fafc;--dm-muted:#a7c7d8;--dm-label:#93c5fd;--dm-gold:#fde68a;--dm-green:#99f6e4;--dm-violet:#c4b5fd;display:grid;gap:1rem;width:min(1180px,100%);margin:0 auto;color:var(--dm-text)}
    .dm-material-root button,.dm-material-root input,.dm-material-root select{font:inherit}.dm-material-header,.dm-wizard-step,.dm-summary-card,.dm-flow-map,.dm-resource-panel,.dm-reference-panel,.dm-precision-section{border:1px solid var(--dm-border);background:var(--dm-bg);box-shadow:0 14px 34px rgba(0,0,0,.24);border-radius:8px}
    .dm-material-header{display:flex;justify-content:space-between;gap:1rem;padding:1rem}.dm-material-header h2,.dm-section-heading,.dm-resource-panel h3,.dm-reference-panel h3{margin:0;color:var(--dm-heading);font-family:"Cinzel",serif;font-weight:900;letter-spacing:0}.dm-material-header h2{font-size:clamp(1.65rem,3vw,2.45rem)}
    .dm-material-header p,.dm-resource-panel p,.dm-material-note,.dm-step-caption{margin:.4rem 0 0;color:var(--dm-muted);line-height:1.5}.dm-source-link,.dm-segment-btn,.dm-clear-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:2.35rem;border:1px solid rgba(148,163,184,.26);border-radius:8px;background:rgba(15,23,42,.72);color:#dbeafe;font-size:.78rem;font-weight:850;text-decoration:none;cursor:pointer}
    .dm-source-link{flex:0 0 auto;padding:.55rem .8rem;color:var(--dm-gold);border-color:rgba(250,204,21,.34)}.dm-wizard{display:grid;gap:.75rem}.dm-wizard-rail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}.dm-step-chip{display:flex;align-items:center;gap:.5rem;min-height:2.3rem;padding:.4rem .65rem;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(15,23,42,.55);color:#bfdbfe;font-size:.74rem;font-weight:900;text-transform:uppercase}.dm-step-number{display:inline-flex;align-items:center;justify-content:center;width:1.45rem;height:1.45rem;border-radius:6px;background:rgba(45,212,191,.18);color:#ccfbf1}.dm-step-chip.is-ready{border-color:rgba(45,212,191,.36);color:#ecfeff}
    .dm-wizard-grid{display:grid;grid-template-columns:1fr 1fr 1.35fr;gap:.85rem}.dm-wizard-step{display:grid;gap:.75rem;align-content:start;padding:1rem}.dm-step-title{display:flex;align-items:center;gap:.55rem}.dm-step-title strong{color:var(--dm-heading);font-size:1rem}.dm-step-title span{display:inline-flex;align-items:center;justify-content:center;width:1.55rem;height:1.55rem;border-radius:6px;background:rgba(59,130,246,.18);color:#bfdbfe;font-size:.78rem;font-weight:900}
    .dm-control-label,.dm-summary-card span,.dm-reference-grid span,.dm-resource-grid span,.dm-flow-label,.dm-progress-meta span,.dm-field-label{color:var(--dm-label);font-size:.72rem;font-weight:900;text-transform:uppercase}.dm-troop-grid,.dm-preset-grid{display:grid;gap:.55rem}.dm-troop-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.dm-preset-grid{grid-template-columns:1fr}.dm-segment-btn{width:100%;padding:.6rem .7rem}.dm-troop-btn{display:grid;gap:.35rem;justify-items:center;min-height:5.8rem}.dm-troop-icon{display:inline-flex;align-items:center;justify-content:center;width:2.15rem;height:2.15rem;border-radius:8px;background:rgba(15,23,42,.92);color:#67e8f9}.dm-troop-icon svg{width:1.25rem;height:1.25rem}.dm-segment-btn.active{border-color:rgba(45,212,191,.75);background:rgba(20,184,166,.28);color:var(--dm-heading)}
    .dm-progress-list{display:grid;gap:.55rem}.dm-progress-row{display:grid;grid-template-columns:minmax(6.2rem,.7fr) minmax(0,1fr) auto;gap:.55rem;align-items:center}.dm-progress-name{color:var(--dm-heading);font-weight:900}.dm-progress-track{height:.58rem;overflow:hidden;border-radius:999px;background:rgba(15,23,42,.92);border:1px solid rgba(148,163,184,.16)}.dm-progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#22d3ee,#34d399,#facc15)}.dm-progress-count{color:#dbeafe;font-size:.78rem;font-weight:900;white-space:nowrap}
    .dm-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}.dm-summary-card{display:grid;gap:.25rem;min-height:6.6rem;padding:1rem}.dm-summary-card strong{color:var(--dm-heading);font-size:clamp(1.55rem,3vw,2.25rem);line-height:1}.dm-summary-card small,.dm-reference-grid small{color:#b6c8d4;font-size:.78rem}
    .dm-inventory-panel,.dm-timeline-panel,.dm-conversion-panel,.dm-comparison-panel,.dm-integrations-panel{display:grid;gap:.85rem;padding:1rem;border:1px solid var(--dm-border);background:var(--dm-bg);box-shadow:0 14px 34px rgba(0,0,0,.24);border-radius:8px}.dm-action-row{display:flex;flex-wrap:wrap;gap:.5rem}.dm-action-btn{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;min-height:2.25rem;padding:.5rem .75rem;border:1px solid rgba(148,163,184,.25);border-radius:8px;background:rgba(15,23,42,.72);color:#dbeafe;font-size:.76rem;font-weight:900;cursor:pointer;text-decoration:none}.dm-action-btn:hover,.dm-action-btn:focus-visible{border-color:rgba(45,212,191,.58);color:#f8fafc}.dm-inventory-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem}.dm-inventory-card{display:grid;gap:.45rem;padding:.75rem;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:var(--dm-panel)}.dm-inventory-card strong{color:var(--dm-heading);font-size:1.05rem}.dm-inventory-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.dm-material-dot{width:.85rem;height:.85rem;border-radius:999px;box-shadow:0 0 0 3px rgba(255,255,255,.07)}.dm-material-dot--blue{background:#38bdf8}.dm-material-dot--purple{background:#a78bfa}.dm-material-dot--orange{background:#fb923c}.dm-material-dot--gold{background:#facc15}.dm-inventory-card .dm-number-input{width:100%}.dm-timeline-scroll{overflow-x:auto;padding-bottom:.15rem}.dm-timeline-axis{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(8.5rem,1fr);gap:.65rem;min-width:min-content;align-items:stretch}.dm-timeline-item{position:relative;display:grid;gap:.45rem;min-height:7.2rem;padding:.75rem;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:var(--dm-panel)}.dm-timeline-week{color:var(--dm-label);font-size:.72rem;font-weight:900;text-transform:uppercase}.dm-timeline-slot{color:var(--dm-heading);font-weight:900}.dm-timeline-cost{color:var(--dm-gold);font-size:.8rem;font-weight:900}.dm-timeline-item::after{content:"";position:absolute;top:2.05rem;right:-.65rem;width:.65rem;height:2px;background:rgba(147,197,253,.42)}.dm-timeline-item:last-child::after{display:none}.dm-conversion-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.85fr);gap:.85rem;align-items:stretch}.dm-conversion-flow{display:grid;gap:.6rem}.dm-slider-row{display:grid;grid-template-columns:minmax(0,1fr) 7rem;gap:.65rem;align-items:center}.dm-range-input{width:100%;accent-color:#22d3ee}.dm-conversion-result{display:grid;gap:.35rem;padding:.75rem;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:var(--dm-panel)}.dm-conversion-result strong{color:var(--dm-heading);font-size:1.35rem}.dm-conversion-arrow{color:var(--dm-label);font-weight:900;text-align:center}.dm-comparison-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.85rem}.dm-stat-column{display:grid;gap:.55rem;padding:.8rem;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:var(--dm-panel)}.dm-stat-column h4{margin:0;color:var(--dm-heading);font-size:1rem}.dm-stat-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;color:#dbeafe;font-weight:850}.dm-comparison-progress{display:grid;gap:.35rem}.dm-integration-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem}.dm-integration-card{display:grid;gap:.65rem;align-content:space-between;padding:.8rem;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:var(--dm-panel)}.dm-integration-card p{margin:0;color:var(--dm-muted);line-height:1.45}.dm-integration-card strong{color:var(--dm-heading)}
    .dm-flow-map{display:grid;gap:.85rem;padding:1rem}.dm-map-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(15rem,.95fr) minmax(0,1fr);gap:.85rem;align-items:stretch}.dm-map-column{display:grid;gap:.6rem;align-content:start}.dm-map-node{display:grid;gap:.45rem;min-height:5.2rem;padding:.75rem;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:var(--dm-panel)}.dm-map-node strong{color:var(--dm-heading);font-size:1.05rem}.dm-map-node small{color:var(--dm-muted);font-size:.78rem;line-height:1.35}.dm-map-node--source{border-color:rgba(96,165,250,.28)}.dm-map-node--convert{border-color:rgba(196,181,253,.28)}.dm-map-node--sink{border-color:rgba(250,204,21,.32)}.dm-flow-line{position:relative;min-height:1.35rem;border-radius:999px;background:linear-gradient(90deg,rgba(96,165,250,.18),rgba(45,212,191,.2),rgba(250,204,21,.18));overflow:hidden}.dm-flow-line::after{content:"";position:absolute;inset:0;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);animation:dm-flow-spark 2.8s ease-in-out infinite}.dm-map-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.dm-map-stat{display:grid;gap:.2rem;padding:.65rem;border-radius:8px;background:rgba(2,6,23,.38);border:1px solid rgba(148,163,184,.12)}
    .dm-precision-section{display:grid;gap:.8rem;padding:1rem}.dm-section-head{display:flex;align-items:end;justify-content:space-between;gap:.85rem}.dm-table-wrap{max-width:100%;overflow-x:auto;border:1px solid rgba(148,163,184,.14);border-radius:8px}.dm-slot-table{width:100%;min-width:760px;border-collapse:collapse}.dm-slot-table th,.dm-slot-table td{padding:.7rem .78rem;border-bottom:1px solid rgba(148,163,184,.14);text-align:left}.dm-slot-table thead th{background:var(--dm-panel-strong);color:var(--dm-label);font-size:.7rem;font-weight:900;text-transform:uppercase}.dm-slot-table tbody th{color:var(--dm-heading);font-weight:900}.dm-slot-table tbody tr.is-ready{background:rgba(20,184,166,.09)}.dm-slot-table tbody tr:last-child th,.dm-slot-table tbody tr:last-child td{border-bottom:0}
    .dm-field-stack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem}.dm-number-input{width:5.4rem;min-height:2.2rem;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:rgba(15,23,42,.86);color:var(--dm-heading);font-weight:850;text-align:center}.dm-needed-pill,.dm-remaining-pill{display:inline-flex;min-height:1.8rem;align-items:center;padding:.28rem .55rem;border:1px solid rgba(148,163,184,.22);border-radius:8px;color:#dbeafe;white-space:nowrap}.dm-remaining-pill{border-color:rgba(250,204,21,.36);color:var(--dm-gold)}.dm-remaining-pill.is-complete{border-color:rgba(45,212,191,.44);color:var(--dm-green)}
    .dm-resource-panel{display:grid;grid-template-columns:.85fr 1.15fr;gap:1rem;padding:1rem}.dm-reference-panel{display:grid;gap:.85rem;padding:1rem}.dm-resource-grid,.dm-reference-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.dm-resource-grid div,.dm-reference-grid div{display:grid;gap:.25rem;padding:.75rem;border:1px solid rgba(148,163,184,.16);border-radius:8px;background:var(--dm-panel)}.dm-resource-grid strong,.dm-reference-grid strong{color:var(--dm-heading);font-size:1.05rem}
    .dm-converter{display:grid;gap:.6rem}.dm-converter-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem;align-items:end}.dm-converter-row label{display:grid;gap:.25rem}.dm-tier-select{min-height:2.2rem;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:rgba(15,23,42,.86);color:var(--dm-heading);font-weight:850}.dm-converter-row strong{color:var(--dm-heading)}.dm-material-note{padding-inline:.15rem;font-size:.84rem}
    [data-theme="light"] .dm-material-root{--dm-bg:rgba(255,255,255,.9);--dm-panel:rgba(248,250,252,.82);--dm-panel-strong:rgba(241,245,249,.96);--dm-border:rgba(15,23,42,.14);--dm-border-strong:rgba(14,116,144,.35);--dm-text:#0f172a;--dm-heading:#0f172a;--dm-muted:#475569;--dm-label:#0369a1;--dm-gold:#92400e;--dm-green:#047857;--dm-violet:#6d28d9}.dm-material-root [hidden]{display:none!important}
    @keyframes dm-flow-spark{0%{transform:translateX(-120%)}55%,100%{transform:translateX(240%)}}
    @media(prefers-reduced-motion:reduce){.dm-flow-line::after{animation:none}}
    @media(max-width:980px){.dm-material-header,.dm-resource-panel,.dm-summary-grid,.dm-resource-grid,.dm-reference-grid,.dm-converter-row,.dm-wizard-grid,.dm-map-grid,.dm-conversion-grid,.dm-comparison-grid,.dm-integration-grid{display:grid;grid-template-columns:1fr}.dm-wizard-rail{grid-template-columns:1fr}.dm-troop-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.dm-inventory-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:560px){.dm-material-root{gap:.8rem}.dm-material-header,.dm-wizard-step,.dm-flow-map,.dm-resource-panel,.dm-reference-panel,.dm-precision-section,.dm-summary-card,.dm-inventory-panel,.dm-timeline-panel,.dm-conversion-panel,.dm-comparison-panel,.dm-integrations-panel{padding:.85rem}.dm-troop-grid,.dm-map-stat-grid,.dm-field-stack,.dm-inventory-grid,.dm-slider-row{grid-template-columns:1fr}.dm-progress-row{grid-template-columns:1fr}.dm-progress-count{white-space:normal}.dm-section-head{display:grid}}
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
    inventory: {
      blue: 0,
      purple: 0,
      orange: 0,
      gold: 0,
    },
    converter: {
      count: 6,
      from: 'gold',
      to: 'purple',
      purpleMaterials: 8200,
    },
  };
}

function normalizeState(raw) {
  const next = defaultState();
  if (!raw || typeof raw !== 'object') return next;
  if (TROOPS.some((troop) => troop.id === raw.troop)) next.troop = raw.troop;
  for (const slot of SLOTS) {
    if (raw.target && typeof raw.target === 'object') {
      next.target[slot.id] = cleanCount(raw.target[slot.id], 9);
    }
    if (raw.owned && typeof raw.owned === 'object') {
      next.owned[slot.id] = cleanCount(raw.owned[slot.id]);
    }
    if (raw.loose && typeof raw.loose === 'object') {
      next.loose[slot.id] = cleanCount(raw.loose[slot.id]);
    }
  }
  if (raw.inventory && typeof raw.inventory === 'object') {
    next.inventory.blue = cleanCount(raw.inventory.blue);
    next.inventory.purple = cleanCount(raw.inventory.purple);
    next.inventory.orange = cleanCount(raw.inventory.orange);
    next.inventory.gold = cleanCount(raw.inventory.gold);
  }
  next.converter.count = cleanCount(raw.converter?.count, 999);
  next.converter.purpleMaterials = cleanCount(raw.converter?.purpleMaterials, 999999);
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
    const assignedPurple = Math.min(requiredPurple, availablePurple);
    const remainingPurple = Math.max(0, requiredPurple - availablePurple);
    const surplusPurple = Math.max(0, availablePurple - requiredPurple);
    const progress = requiredPurple > 0 ? assignedPurple / requiredPurple : 1;
    return {
      slot,
      targetGold,
      requiredPurple,
      availablePurple,
      assignedPurple,
      remainingPurple,
      surplusPurple,
      progress,
      ready: targetGold > 0 && remainingPurple === 0,
    };
  });

  const targetGoldTotal = rows.reduce((sum, row) => sum + row.targetGold, 0);
  const targetOrangeTotal = targetGoldTotal * (PURPLE_PER_GOLD / PURPLE_PER_ORANGE);
  const requiredPurpleTotal = rows.reduce((sum, row) => sum + row.requiredPurple, 0);
  const assignedPurpleTotal = rows.reduce((sum, row) => sum + row.assignedPurple, 0);
  const missingPurpleTotal = rows.reduce((sum, row) => sum + row.remainingPurple, 0);
  const surplusPurpleTotal = rows.reduce((sum, row) => sum + row.surplusPurple, 0);
  const readySlots = rows.filter((row) => row.ready).length;
  const activeSlots = rows.filter((row) => row.targetGold > 0).length;
  const inventoryBlue = cleanCount(state.inventory.blue);
  const inventoryPurple = cleanCount(state.inventory.purple);
  const inventoryOrange = cleanCount(state.inventory.orange);
  const inventoryGold = cleanCount(state.inventory.gold);
  const inventoryPurpleFromBlue = Math.floor(inventoryBlue / BLUE_PER_PURPLE);
  const inventoryPurpleFromOrangeGold = inventoryOrange * PURPLE_PER_ORANGE + inventoryGold * PURPLE_PER_GOLD;
  const inventoryPurpleTotal = inventoryPurple + inventoryPurpleFromBlue + inventoryPurpleFromOrangeGold;
  const plannedPurpleShortfall = Math.max(0, missingPurpleTotal - inventoryPurpleTotal);
  const plannedInventorySurplus = Math.max(0, inventoryPurpleTotal - missingPurpleTotal);
  const coveragePurpleTotal = Math.min(requiredPurpleTotal, assignedPurpleTotal + inventoryPurpleTotal);
  const coverageRatio = requiredPurpleTotal > 0 ? coveragePurpleTotal / requiredPurpleTotal : 1;
  const currentStatRatio = requiredPurpleTotal > 0 ? Math.min(1, assignedPurpleTotal / requiredPurpleTotal) : 1;
  const targetStats = {
    atk: targetGoldTotal * STAT_PER_GOLD.atk,
    def: targetGoldTotal * STAT_PER_GOLD.def,
    hp: targetGoldTotal * STAT_PER_GOLD.hp,
  };
  const currentStats = {
    atk: Math.round(targetStats.atk * currentStatRatio),
    def: Math.round(targetStats.def * currentStatRatio),
    hp: Math.round(targetStats.hp * currentStatRatio),
  };
  const sd = plannedPurpleShortfall * SD_PER_PURPLE;
  const crystals = plannedPurpleShortfall * CRYSTAL_PER_PURPLE;
  const craftGems = plannedPurpleShortfall * GEMS_PER_PURPLE_CRAFT;
  const combineGems = targetGoldTotal * GEMS_PER_GOLD_COMBINE;

  return {
    rows,
    targetGoldTotal,
    targetOrangeTotal,
    requiredPurpleTotal,
    assignedPurpleTotal,
    missingPurpleTotal,
    surplusPurpleTotal,
    readySlots,
    activeSlots,
    inventoryBlue,
    inventoryPurple,
    inventoryOrange,
    inventoryGold,
    inventoryPurpleFromBlue,
    inventoryPurpleFromOrangeGold,
    inventoryPurpleTotal,
    plannedPurpleShortfall,
    plannedInventorySurplus,
    coveragePurpleTotal,
    coverageRatio,
    currentStats,
    targetStats,
    sd,
    crystals,
    craftGems,
    combineGems,
    totalGems: craftGems + combineGems,
  };
}

function getActivePreset() {
  return PRESET_KEYS.find((preset) =>
    SLOTS.every((slot) => cleanCount(state.target[slot.id], 9) === PRESETS[preset][slot.id])
  );
}

function renderTroopIcon(icon) {
  if (icon === 'arrow') {
    return '<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4 20 20 4m0 0h-7m7 0v7M5 14l5 5"/></svg>';
  }
  if (icon === 'standard') {
    return '<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 21V4m0 0h11l-2 4 2 4H6m5 9v-5"/></svg>';
  }
  return '<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.5 4.5 19.5 9.5 8 21l-5-5L14.5 4.5Zm-3 3 5 5M4.5 17.5 6.5 19.5"/></svg>';
}

function renderTroopButtons() {
  const t = getText();
  return `
    <div class="dm-troop-grid" role="group" aria-label="${escapeHtml(t.troopLabel)}">
      ${TROOPS.map(
        (troop) => `
          <button type="button" class="dm-segment-btn dm-troop-btn${state.troop === troop.id ? ' active' : ''}" data-dm-troop="${troop.id}" aria-pressed="${state.troop === troop.id ? 'true' : 'false'}">
            <span class="dm-troop-icon">${renderTroopIcon(troop.icon)}</span>
            <span>${escapeHtml(troopName(troop))}</span>
          </button>`
      ).join('')}
    </div>`;
}

function renderPresetButtons() {
  const t = getText();
  const activePreset = getActivePreset();
  return `
    <div class="dm-preset-grid" role="group" aria-label="${escapeHtml(t.presetLabel)}">
      ${PRESET_KEYS.map(
        (preset) => `
          <button type="button" class="dm-segment-btn${activePreset === preset ? ' active' : ''}" data-dm-preset="${preset}" aria-pressed="${activePreset === preset ? 'true' : 'false'}">
            ${escapeHtml(t[preset])}
          </button>`
      ).join('')}
    </div>`;
}

function renderProgressList(calc) {
  const t = getText();
  const rows = calc.rows
    .map((row) => {
      const percent = Math.round(row.progress * 100);
      const countText =
        row.requiredPurple > 0
          ? `${formatNumber(row.assignedPurple)} / ${formatNumber(row.requiredPurple)}`
          : escapeHtml(t.emptyTarget);
      return `
        <div class="dm-progress-row">
          <span class="dm-progress-name">${escapeHtml(slotName(row.slot))}</span>
          <div class="dm-progress-track" aria-hidden="true">
            <div class="dm-progress-fill" style="width:${percent}%"></div>
          </div>
          <span class="dm-progress-count">${countText}</span>
        </div>`;
    })
    .join('');
  return `<div class="dm-progress-list" aria-label="${escapeHtml(t.progressTitle)}">${rows}</div>`;
}

function renderSetupWizard(calc) {
  const t = getText();
  return `
    <section class="dm-wizard" aria-labelledby="dmSetupTitle">
      <div class="dm-section-head">
        <h3 id="dmSetupTitle" class="dm-section-heading">${escapeHtml(t.setupTitle)}</h3>
        <button type="button" class="dm-clear-btn" data-dm-clear-owned>${escapeHtml(t.clearOwned)}</button>
      </div>
      <div class="dm-wizard-rail" aria-hidden="true">
        <span class="dm-step-chip is-ready"><span class="dm-step-number">${escapeHtml(t.stepOne)}</span>${escapeHtml(t.stepOneTitle)}</span>
        <span class="dm-step-chip is-ready"><span class="dm-step-number">${escapeHtml(t.stepTwo)}</span>${escapeHtml(t.stepTwoTitle)}</span>
        <span class="dm-step-chip is-ready"><span class="dm-step-number">${escapeHtml(t.stepThree)}</span>${escapeHtml(t.stepThreeTitle)}</span>
      </div>
      <div class="dm-wizard-grid">
        <article class="dm-wizard-step">
          <div class="dm-step-title"><span>${escapeHtml(t.stepOne)}</span><strong>${escapeHtml(t.stepOneTitle)}</strong></div>
          <p class="dm-step-caption">${escapeHtml(t.stepOneCaption)}</p>
          ${renderTroopButtons()}
        </article>
        <article class="dm-wizard-step">
          <div class="dm-step-title"><span>${escapeHtml(t.stepTwo)}</span><strong>${escapeHtml(t.stepTwoTitle)}</strong></div>
          <p class="dm-step-caption">${escapeHtml(t.stepTwoCaption)}</p>
          ${renderPresetButtons()}
        </article>
        <article class="dm-wizard-step">
          <div class="dm-step-title"><span>${escapeHtml(t.stepThree)}</span><strong>${escapeHtml(t.stepThreeTitle)}</strong></div>
          <p class="dm-step-caption">${escapeHtml(t.stepThreeCaption)}</p>
          ${renderProgressList(calc)}
        </article>
      </div>
    </section>`;
}

function renderSummary(calc) {
  const t = getText();
  const targetLabel = t.targetPieces.replace('{n}', formatNumber(calc.requiredPurpleTotal));
  return `
    <div class="dm-summary-grid" aria-live="polite">
      <article class="dm-summary-card dm-summary-card--purple">
        <span>${escapeHtml(t.summaryMissing)}</span>
        <strong>${formatNumber(calc.plannedPurpleShortfall)}</strong>
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

function inventoryLabel(tier) {
  const t = getText();
  const config = INVENTORY_TIERS.find((item) => item.id === tier);
  return config ? t[config.textKey] : tier;
}

function renderInventoryCard(tier, value) {
  const label = inventoryLabel(tier);
  return `
    <label class="dm-inventory-card">
      <span class="dm-inventory-top">
        <span class="dm-material-dot dm-material-dot--${tier}" aria-hidden="true"></span>
        <span class="dm-field-label">${escapeHtml(label)}</span>
      </span>
      <strong>${formatNumber(value)}</strong>
      <input class="dm-number-input" type="number" min="0" max="999999" inputmode="numeric" value="${value}" data-dm-inventory="${tier}" data-dm-control-id="inventory-${tier}" aria-label="${escapeHtml(label)}">
    </label>`;
}

function renderInventoryGrid(calc) {
  const t = getText();
  return `
    <section class="dm-inventory-panel" aria-labelledby="dmInventoryTitle">
      <div class="dm-section-head">
        <h3 id="dmInventoryTitle" class="dm-section-heading">${escapeHtml(t.inventoryTitle)}</h3>
        <div class="dm-action-row">
          <button type="button" class="dm-action-btn" data-dm-open-tab="admin">${escapeHtml(t.scanOcr)}</button>
          <button type="button" class="dm-action-btn" data-dm-quick-add>${escapeHtml(t.quickAdd)}</button>
          <button type="button" class="dm-action-btn" data-dm-open-tab="admin">${escapeHtml(t.ocrScan)}</button>
          <button type="button" class="dm-action-btn" data-dm-import-inventory>${escapeHtml(t.importInventory)}</button>
        </div>
      </div>
      <div class="dm-inventory-grid">
        ${renderInventoryCard('blue', calc.inventoryBlue)}
        ${renderInventoryCard('purple', calc.inventoryPurple)}
        ${renderInventoryCard('orange', calc.inventoryOrange)}
        ${renderInventoryCard('gold', calc.inventoryGold)}
      </div>
    </section>`;
}

function renderMapStat(label, value, detail = '') {
  return `
    <div class="dm-map-stat">
      <span class="dm-flow-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
    </div>`;
}

function renderMaterialMap(calc) {
  const t = getText();
  const coveragePercent = `${Math.round(calc.coverageRatio * 100)}%`;
  const shortfallLabel =
    calc.plannedPurpleShortfall > 0
      ? `${formatNumber(calc.plannedPurpleShortfall)} ${t.tierPurple}`
      : t.mapReady;
  return `
    <section class="dm-flow-map" aria-labelledby="dmMaterialMapTitle">
      <div class="dm-section-head">
        <h3 id="dmMaterialMapTitle" class="dm-section-heading">${escapeHtml(t.mapTitle)}</h3>
        <span class="dm-progress-count">${escapeHtml(coveragePercent)} ${escapeHtml(t.totalCoverage)}</span>
      </div>
      <div class="dm-map-grid">
        <div class="dm-map-column">
          <span class="dm-control-label">${escapeHtml(t.mapSourceTitle)}</span>
          <div class="dm-map-node dm-map-node--source">
            <strong>${formatNumber(calc.inventoryPurpleTotal)} ${escapeHtml(t.tierPurple)}</strong>
            <small>${escapeHtml(t.totalCoverage)}</small>
            <div class="dm-flow-line" aria-hidden="true"></div>
          </div>
          <div class="dm-map-stat-grid">
            ${renderMapStat(t.assignedPurple, formatNumber(calc.assignedPurpleTotal), `${formatNumber(calc.missingPurpleTotal)} ${t.slotGap}`)}
            ${renderMapStat(t.fromBlue, formatNumber(calc.inventoryPurpleFromBlue), t.blueToPurple)}
            ${renderMapStat(t.fromOrangeGold, formatNumber(calc.inventoryPurpleFromOrangeGold), `${t.purpleToOrange}; ${t.purpleToGold}`)}
          </div>
        </div>

        <div class="dm-map-column">
          <span class="dm-control-label">${escapeHtml(t.mapConversionTitle)}</span>
          <div class="dm-map-node dm-map-node--convert">
            <strong>${escapeHtml(t.resourceToPurple)}</strong>
            <div class="dm-flow-line" aria-hidden="true"></div>
            <small>${escapeHtml(t.blueToPurple)}</small>
          </div>
          <div class="dm-map-node dm-map-node--convert">
            <strong>${escapeHtml(t.purpleToOrange)}</strong>
            <div class="dm-flow-line" aria-hidden="true"></div>
            <small>${escapeHtml(t.purpleToGold)}</small>
          </div>
        </div>

        <div class="dm-map-column">
          <span class="dm-control-label">${escapeHtml(t.mapSinkTitle)}</span>
          <div class="dm-map-node dm-map-node--sink">
            <strong>${formatNumber(calc.targetGoldTotal)} ${escapeHtml(t.targetGold)}</strong>
            <small>${formatNumber(calc.targetOrangeTotal)} ${escapeHtml(t.targetOrange)}</small>
          </div>
          <div class="dm-map-stat-grid">
            ${renderMapStat(t.mapShortfall, shortfallLabel)}
            ${renderMapStat(t.stashAfterGap, formatNumber(calc.plannedInventorySurplus), `${formatNumber(calc.surplusPurpleTotal)} ${t.surplus}`)}
          </div>
        </div>
      </div>
    </section>`;
}

function renderCraftingTimeline(calc) {
  const t = getText();
  const activeRows = calc.rows.filter((row) => row.targetGold > 0);
  const rows = activeRows.length ? activeRows : calc.rows.slice(0, 1);
  return `
    <section class="dm-timeline-panel" aria-labelledby="dmTimelineTitle">
      <div class="dm-section-head">
        <h3 id="dmTimelineTitle" class="dm-section-heading">${escapeHtml(t.timelineTitle)}</h3>
        <span class="dm-progress-count">${formatNumber(calc.plannedPurpleShortfall)} ${escapeHtml(t.summaryMissing)}</span>
      </div>
      <div class="dm-timeline-scroll">
        <div class="dm-timeline-axis">
          ${rows
            .map((row, index) => {
              const percent = Math.round(row.progress * 100);
              const week = t.weekLabel.replace('{n}', formatNumber(index + 1));
              const cost =
                row.remainingPurple > 0
                  ? t.purpleCost.replace('{n}', formatNumber(row.remainingPurple))
                  : t.readyTimeline;
              return `
                <article class="dm-timeline-item">
                  <span class="dm-timeline-week">${escapeHtml(week)}</span>
                  <strong class="dm-timeline-slot">${escapeHtml(slotName(row.slot))}</strong>
                  <div class="dm-progress-track" aria-hidden="true"><div class="dm-progress-fill" style="width:${percent}%"></div></div>
                  <span class="dm-timeline-cost">${escapeHtml(cost)}</span>
                </article>`;
            })
            .join('')}
        </div>
      </div>
    </section>`;
}

function renderConversionPlanner() {
  const t = getText();
  const purpleMaterials = cleanCount(state.converter.purpleMaterials, 999999);
  const orangeMaterials = purpleMaterials / PURPLE_MATERIAL_PER_ORANGE;
  const goldMaterials = orangeMaterials / ORANGE_MATERIAL_PER_GOLD;
  return `
    <section class="dm-conversion-panel" aria-labelledby="dmConversionPlannerTitle">
      <div class="dm-section-head">
        <h3 id="dmConversionPlannerTitle" class="dm-section-heading">${escapeHtml(t.conversionPlannerTitle)}</h3>
        <div class="dm-action-row">
          <button type="button" class="dm-action-btn" data-dm-max-slot="weapon">${escapeHtml(t.maxWeapon)}</button>
          <button type="button" class="dm-action-btn" data-dm-max-slot="helmet">${escapeHtml(t.maxHelmet)}</button>
          <button type="button" class="dm-action-btn" data-dm-custom-target>${escapeHtml(t.customTarget)}</button>
        </div>
      </div>
      <div class="dm-conversion-grid">
        <div class="dm-conversion-flow">
          <label class="dm-slider-row">
            <span class="dm-field-label">${escapeHtml(t.purpleMaterials)}</span>
            <input class="dm-number-input" type="number" min="0" max="999999" inputmode="numeric" value="${purpleMaterials}" data-dm-converter="purpleMaterials" data-dm-control-id="converter-purple-materials">
          </label>
          <input class="dm-range-input" type="range" min="0" max="320000" step="100" value="${Math.min(320000, purpleMaterials)}" data-dm-converter="purpleMaterials" data-dm-control-id="converter-purple-range" aria-label="${escapeHtml(t.purpleMaterials)}">
          <div class="dm-conversion-arrow">${escapeHtml(t.purpleMaterials)} / ${formatNumber(PURPLE_MATERIAL_PER_ORANGE)}</div>
          <div class="dm-conversion-result">
            <span class="dm-field-label">${escapeHtml(t.orangeMaterials)}</span>
            <strong>${formatConvertedNumber(orangeMaterials)}</strong>
          </div>
          <div class="dm-conversion-arrow">${escapeHtml(t.orangeMaterials)} / ${formatNumber(ORANGE_MATERIAL_PER_GOLD)}</div>
          <div class="dm-conversion-result">
            <span class="dm-field-label">${escapeHtml(t.goldMaterials)}</span>
            <strong>${formatConvertedNumber(goldMaterials)}</strong>
          </div>
        </div>
        <div class="dm-map-node dm-map-node--convert">
          <strong>${escapeHtml(t.resourceToPurple)}</strong>
          <small>${escapeHtml(t.purpleToGold)}</small>
          <div class="dm-flow-line" aria-hidden="true"></div>
          <small>${escapeHtml(t.resourceHint)}</small>
        </div>
      </div>
    </section>`;
}

function renderStatRows(stats, t) {
  return `
    <div class="dm-stat-row"><span>${escapeHtml(t.atkStat)}</span><strong>${formatNumber(stats.atk)}</strong></div>
    <div class="dm-stat-row"><span>${escapeHtml(t.defStat)}</span><strong>${formatNumber(stats.def)}</strong></div>
    <div class="dm-stat-row"><span>${escapeHtml(t.hpStat)}</span><strong>${formatNumber(stats.hp)}</strong></div>`;
}

function renderComparisonView(calc) {
  const t = getText();
  const percent = Math.round(calc.coverageRatio * 100);
  return `
    <section class="dm-comparison-panel" aria-labelledby="dmComparisonTitle">
      <h3 id="dmComparisonTitle" class="dm-section-heading">${escapeHtml(t.comparisonTitle)}</h3>
      <div class="dm-comparison-grid">
        <article class="dm-stat-column">
          <h4>${escapeHtml(t.currentSet)}</h4>
          ${renderStatRows(calc.currentStats, t)}
        </article>
        <article class="dm-stat-column">
          <h4>${escapeHtml(t.targetSet)}</h4>
          ${renderStatRows(calc.targetStats, t)}
        </article>
      </div>
      <div class="dm-comparison-progress">
        <div class="dm-progress-track" aria-hidden="true"><div class="dm-progress-fill" style="width:${percent}%"></div></div>
        <span class="dm-progress-count">${escapeHtml(t.completeLabel.replace('{n}', formatNumber(percent)))}</span>
      </div>
    </section>`;
}

function firstMissingSlot(calc) {
  return calc.rows.find((row) => row.remainingPurple > 0)?.slot || calc.rows.find((row) => row.targetGold > 0)?.slot || SLOTS[0];
}

function renderIntegrations(calc) {
  const t = getText();
  const troop = TROOPS.find((item) => item.id === state.troop) || TROOPS[0];
  const hero = TROOP_HERO_HINTS[troop.id] || TROOP_HERO_HINTS.footmen;
  const slot = firstMissingSlot(calc);
  const heroCopy = t.heroIntegration
    .replace('{hero}', hero)
    .replace('{troop}', troopName(troop));
  const edenCopy = t.edenIntegration.replace('{slot}', slotName(slot));
  return `
    <section class="dm-integrations-panel" aria-labelledby="dmIntegrationsTitle">
      <h3 id="dmIntegrationsTitle" class="dm-section-heading">${escapeHtml(t.integrationsTitle)}</h3>
      <div class="dm-integration-grid">
        <article class="dm-integration-card">
          <strong>Research</strong>
          <p>${escapeHtml(t.researchIntegration)}</p>
          <button type="button" class="dm-action-btn" data-dm-open-tab="research">${escapeHtml(t.openResearch)}</button>
        </article>
        <article class="dm-integration-card">
          <strong>Hero Atlas</strong>
          <p>${escapeHtml(heroCopy)}</p>
          <button type="button" class="dm-action-btn" data-dm-open-tab="heroes">${escapeHtml(t.openHeroAtlas)}</button>
        </article>
        <article class="dm-integration-card">
          <strong>Eden Map</strong>
          <p>${escapeHtml(edenCopy)}</p>
          <button type="button" class="dm-action-btn" data-dm-open-tab="edenMap">${escapeHtml(t.openEdenMap)}</button>
        </article>
      </div>
    </section>`;
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
            <input class="dm-number-input" type="number" min="0" max="9" inputmode="numeric" value="${row.targetGold}" data-dm-field="target" data-dm-slot="${row.slot.id}" data-dm-control-id="table-target-${row.slot.id}" aria-label="${escapeHtml(t.tableTarget)} ${escapeHtml(slotName(row.slot))}">
          </td>
          <td><span class="dm-needed-pill">${formatNumber(row.requiredPurple)}</span></td>
          <td>
            <input class="dm-number-input" type="number" min="0" max="999" inputmode="numeric" value="${cleanCount(state.owned[row.slot.id])}" data-dm-field="owned" data-dm-slot="${row.slot.id}" data-dm-control-id="table-owned-${row.slot.id}" aria-label="${escapeHtml(t.tableOwned)} ${escapeHtml(slotName(row.slot))}">
          </td>
          <td>
            <input class="dm-number-input" type="number" min="0" max="999" inputmode="numeric" value="${cleanCount(state.loose[row.slot.id])}" data-dm-field="loose" data-dm-slot="${row.slot.id}" data-dm-control-id="table-loose-${row.slot.id}" aria-label="${escapeHtml(t.tableLoose)} ${escapeHtml(slotName(row.slot))}">
          </td>
          <td><span class="dm-remaining-pill${row.remainingPurple === 0 ? ' is-complete' : ''}">${remainingText}</span></td>
        </tr>`;
    })
    .join('');
}

function renderPrecisionTable(calc) {
  const t = getText();
  return `
    <section class="dm-precision-section" aria-labelledby="dmPrecisionTitle">
      <div class="dm-section-head">
        <h3 id="dmPrecisionTitle" class="dm-section-heading">${escapeHtml(t.precisionTitle)}</h3>
        <span class="dm-progress-count">${formatNumber(calc.coveragePurpleTotal)} / ${formatNumber(calc.requiredPurpleTotal)} ${escapeHtml(t.tierPurple)}</span>
      </div>
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
    </section>`;
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
          <label><span class="dm-field-label">${escapeHtml(t.convertCount)}</span><input class="dm-number-input" type="number" min="0" max="999" inputmode="numeric" value="${converterCount}" data-dm-converter="count" data-dm-control-id="converter-count"></label>
          <label><span class="dm-field-label">${escapeHtml(t.convertFrom)}</span>${renderTierSelect('from')}</label>
          <label><span class="dm-field-label">${escapeHtml(t.convertTo)}</span>${renderTierSelect('to')}</label>
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
    <select class="dm-tier-select" data-dm-converter="${field}" data-dm-control-id="converter-${field}">
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
  if (!rootEl || !state) return;
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

      ${renderSetupWizard(calc)}
      ${renderInventoryGrid(calc)}
      ${renderSummary(calc)}
      ${renderMaterialMap(calc)}
      ${renderCraftingTimeline(calc)}
      ${renderConversionPlanner(calc)}
      ${renderComparisonView(calc)}
      ${renderPrecisionTable(calc)}
      ${renderResources(calc)}
      ${renderIntegrations(calc)}
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

function restoreFocus(controlId, fallbackSelector) {
  const selector = controlId
    ? `[data-dm-control-id="${CSS.escape(controlId)}"]`
    : fallbackSelector;
  rootEl?.querySelector(selector)?.focus({ preventScroll: true });
}

function showMaterialToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type, 3200);
  }
}

function parseHumanCount(value) {
  if (typeof value === 'number') return cleanCount(value, 999999);
  const raw = String(value || '').trim().toLowerCase().replace(/,/g, '');
  const match = raw.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;
  const multiplier = match[2] === 'm' ? 1000000 : match[2] === 'k' ? 1000 : 1;
  return cleanCount(Number(match[1]) * multiplier, 999999);
}

function extractInventoryCounts(text) {
  const counts = {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      for (const tier of INVENTORY_TIERS) {
        const value = parseHumanCount(parsed[tier.id]);
        if (value !== null) counts[tier.id] = value;
      }
    }
  } catch {}

  for (const tier of INVENTORY_TIERS) {
    if (counts[tier.id] !== undefined) continue;
    const pattern = new RegExp(`${tier.id}\\D{0,24}(\\d+(?:[\\.,]\\d+)?\\s*[km]?)`, 'i');
    const match = text.match(pattern);
    if (match) {
      const value = parseHumanCount(match[1].replace(/\s+/g, ''));
      if (value !== null) counts[tier.id] = value;
    }
  }
  return counts;
}

async function importInventoryFromClipboard() {
  const t = getText();
  try {
    const text = await navigator.clipboard?.readText?.();
    if (!text) throw new Error('empty clipboard');
    const counts = extractInventoryCounts(text);
    if (!Object.keys(counts).length) throw new Error('no material counts');
    state.inventory = {
      ...state.inventory,
      ...counts,
    };
    saveState();
    render();
    showMaterialToast(t.importSuccess, 'success');
  } catch {
    showMaterialToast(t.importFailed, 'warning');
  }
}

function setConverterFromSlot(slotId) {
  const slot = SLOTS.find((item) => item.id === slotId);
  if (!slot) return;
  const requiredPurple = cleanCount(state.target[slot.id], 9) * PURPLE_PER_GOLD;
  const availablePurple = cleanCount(state.owned[slot.id]) + cleanCount(state.loose[slot.id]);
  const remainingPurple = Math.max(0, requiredPurple - availablePurple);
  state.converter.purpleMaterials = Math.max(PURPLE_MATERIAL_PER_ORANGE, remainingPurple * PURPLE_MATERIAL_PER_ORANGE);
  saveState();
  render();
  restoreFocus('converter-purple-materials');
}

function openMaterialIntegration(target) {
  if (target === 'admin') {
    window.location.href = 'admin.html';
    return;
  }
  if (typeof window.vtsSwitchTab === 'function') {
    window.vtsSwitchTab(target, true, { scrollToSection: true });
    return;
  }
  window.location.hash = `#${target}`;
}

function handleInput(event) {
  const inventoryInput = event.target.closest?.('[data-dm-inventory]');
  if (inventoryInput) {
    const field = inventoryInput.dataset.dmInventory;
    if (INVENTORY_TIERS.some((tier) => tier.id === field)) {
      state.inventory[field] = cleanCount(inventoryInput.value, 999999);
      saveState();
      render();
      restoreFocus(inventoryInput.dataset.dmControlId);
    }
    return;
  }

  const input = event.target.closest?.('[data-dm-field][data-dm-slot]');
  if (!input) {
    const converterInput = event.target.closest?.('[data-dm-converter="count"]');
    if (converterInput) {
      state.converter.count = cleanCount(converterInput.value, 999);
      saveState();
      render();
      restoreFocus(converterInput.dataset.dmControlId, '[data-dm-converter="count"]');
      return;
    }
    const materialInput = event.target.closest?.('[data-dm-converter="purpleMaterials"]');
    if (materialInput) {
      state.converter.purpleMaterials = cleanCount(materialInput.value, 999999);
      saveState();
      render();
      restoreFocus(materialInput.dataset.dmControlId, '[data-dm-converter="purpleMaterials"]');
    }
    return;
  }
  const field = input.dataset.dmField;
  const slot = input.dataset.dmSlot;
  if (!state[field] || !(slot in state[field])) return;
  state[field][slot] = cleanCount(input.value, field === 'target' ? 9 : 999);
  saveState();
  render();
  restoreFocus(
    input.dataset.dmControlId,
    `[data-dm-field="${field}"][data-dm-slot="${slot}"]`
  );
}

async function handleClick(event) {
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
    state.inventory = { blue: 0, purple: 0, orange: 0, gold: 0 };
    saveState();
    render();
    return;
  }

  if (event.target.closest?.('[data-dm-quick-add]')) {
    for (const [tier, amount] of Object.entries(QUICK_ADD_AMOUNTS)) {
      state.inventory[tier] = cleanCount((state.inventory[tier] || 0) + amount, 999999);
    }
    saveState();
    render();
    showMaterialToast(getText().quickAddSuccess, 'success');
    return;
  }

  if (event.target.closest?.('[data-dm-import-inventory]')) {
    await importInventoryFromClipboard();
    return;
  }

  const maxSlotBtn = event.target.closest?.('[data-dm-max-slot]');
  if (maxSlotBtn) {
    setConverterFromSlot(maxSlotBtn.dataset.dmMaxSlot);
    return;
  }

  if (event.target.closest?.('[data-dm-custom-target]')) {
    restoreFocus('converter-purple-materials');
    return;
  }

  const openTabBtn = event.target.closest?.('[data-dm-open-tab]');
  if (openTabBtn) {
    openMaterialIntegration(openTabBtn.dataset.dmOpenTab);
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
    restoreFocus(select.dataset.dmControlId);
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
