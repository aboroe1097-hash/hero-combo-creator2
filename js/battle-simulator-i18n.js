export const BATTLE_SIMULATOR_LOCALES = Object.freeze([
  'en',
  'ar',
  'de',
  'es',
  'fr',
  'id',
  'it',
  'kr',
  'pt',
  'ru',
  'tr',
  'zh',
]);

export const BATTLE_SIMULATOR_LANGUAGE_OPTIONS = Object.freeze([
  Object.freeze({ id: 'en', label: 'English', short: 'EN' }),
  Object.freeze({ id: 'ar', label: 'العربية', short: 'AR' }),
  Object.freeze({ id: 'de', label: 'Deutsch', short: 'DE' }),
  Object.freeze({ id: 'es', label: 'Español', short: 'ES' }),
  Object.freeze({ id: 'fr', label: 'Français', short: 'FR' }),
  Object.freeze({ id: 'id', label: 'Bahasa Indonesia', short: 'ID' }),
  Object.freeze({ id: 'it', label: 'Italiano', short: 'IT' }),
  Object.freeze({ id: 'kr', label: '한국어', short: 'KO' }),
  Object.freeze({ id: 'pt', label: 'Português', short: 'PT' }),
  Object.freeze({ id: 'ru', label: 'Русский', short: 'RU' }),
  Object.freeze({ id: 'tr', label: 'Türkçe', short: 'TR' }),
  Object.freeze({ id: 'zh', label: '中文', short: 'ZH' }),
]);

export const BATTLE_SIMULATOR_LANGUAGE_STORAGE_KEY = 'vts_hero_lang';

export const BATTLE_SIMULATOR_ENGLISH = Object.freeze({
  'document.title': 'Battle Simulator Beta | VTS 1097',
  'language.label': 'Language',
  'nav.skip': 'Skip to simulator',
  'nav.brand': 'VTS 1097 tool hub',
  'nav.labVersion': 'Battle Lab · v{version}',
  'nav.back': 'Back to tools',
  'theme.toLight': 'Switch to light theme',
  'theme.toDark': 'Switch to dark theme',
  'hero.eyebrow': 'Battle engine · Source-aware model',
  'hero.title': 'Battle Simulator',
  'hero.beta': 'BETA',
  'hero.copy':
    'Compare two independent three-row formations with separate unit points, battle multipliers, saved Research, and whole-legion equipment.',
  'hero.chipTroops': '31,000 default per row',
  'hero.chipSeed': 'Seeded batch runs',
  'hero.chipSources': 'Source breakdowns',
  'notice.title': 'Calibration model — verified inputs only',
  'notice.copy':
    'Known Research and equipment values are applied automatically. Missing values stay excluded and are named in the setup and exports.',
  'model.summary': 'How this beta resolves a round',
  'model.version': 'Model {version}',
  'model.rule1': 'Every living row attacks the enemy’s first living row.',
  'model.rule2':
    'Combat Speed selects only the opening hit in Round 1; exact-speed ties open simultaneously.',
  'model.rule3':
    'After the opener, remaining rows exchange simultaneously; later rounds are simultaneous exchanges.',
  'model.rule4':
    'Unit Attack, Defense, and HP are points. Battle Might, Resistance, and HP are percentage multipliers.',
  'model.rule5':
    'Known automatic sources apply only when their troop, row, and battle-mode rules match.',
  'model.rule6':
    'Casualty rate is capped at 95%; casualties are floored and never exceed the target row.',
  'model.rule7': 'A battle unresolved after {rounds} rounds ends as a round-limit stalemate.',
  'model.rule8': 'Batch runs use a visible seed and optional per-hit variance.',
  'coverage.title': 'Assumptions & Coverage',
  'coverage.skills':
    '{total} hero skill descriptions: {modeled} modeled, {partial} partial, {excluded} excluded.',
  'coverage.skillValues': 'Skill descriptions use the listed maximum/latest values.',
  'coverage.partialClauses': 'Partial clauses remain visible but are ignored by the engine.',
  'coverage.missingHeroes': '{count} heroes have no extended placement or skill data.',
  'coverage.research': 'Research coverage maps 316 known contributions.',
  'coverage.specialization':
    'Specialization contributions apply only when the selected scenario context matches.',
  'coverage.equipment':
    'Equipment combat stats are unavailable; provisional overrides must be user-observed.',
  'coverage.tactical':
    'Tactical stats remain inactive while the battle engine does not consume them.',
  'coverage.acknowledge': 'I understand these assumptions and coverage limits.',
  'scenario.kicker': 'Scenario context',
  'scenario.title': 'Choose where this battle occurs',
  'scenario.copy': 'Conditional specialization sources use these exact context values.',
  'scenario.battleMode': 'Battle mode',
  'scenario.engagement': 'Engagement',
  'scenario.event': 'Event',
  'scenario.formation': 'Formation',
  'scenario.battleMode.pvp-field': 'PvP field',
  'scenario.engagement.field': 'Field',
  'scenario.engagement.siege-attack': 'Siege attack',
  'scenario.engagement.siege-defense': 'Siege defense',
  'scenario.event.*': 'Any event',
  'scenario.event.eden': 'Eden',
  'scenario.event.boh': 'Battle of Honor',
  'scenario.formation.*': 'Any formation',
  'scenario.formation.rally-lead': 'Rally lead',
  'scenario.formation.rally-join': 'Rally join',
  'scenario.formation.reinforce': 'Reinforce',
  'run.kicker': 'Simulation control',
  'run.title': 'Run one battle or a reproducible batch',
  'run.copy':
    'Batch averages use seeded ±5% strike variance by default. Set variance to 0% for repeated exact runs.',
  'run.simulations': 'Simulations',
  'run.exact': 'Exact',
  'run.runs': 'runs',
  'run.seed': 'Seed',
  'run.seedHint': 'Reuse this seed to reproduce a batch.',
  'run.variance': 'Strike variance',
  'run.varianceHint': 'Applied per hit only in batch mode.',
  'run.resolving': 'Resolving the exact scenario…',
  'run.running': 'Running {count} seeded simulations without blocking this page…',
  'run.button.one': 'Run {count} simulation',
  'run.button.other': 'Run {count} simulations',
  'setup.kicker': 'Setup',
  'setup.title': 'Move and reuse complete battle setups',
  'setup.copy':
    'Setup files and presets retain source modes, Research captures, equipment loadouts, row overrides, and run controls.',
  'setup.copySide': 'Copy Side A to Side B',
  'setup.swap': 'Swap sides',
  'setup.export': 'Export setup',
  'setup.import': 'Import setup',
  'setup.fileActions': 'Setup file actions',
  'setup.presetName': 'Preset name',
  'setup.presetPlaceholder': 'Example: Field test 1…',
  'setup.savePreset': 'Save preset',
  'setup.savedPresets': 'Saved presets',
  'setup.choosePreset': 'Choose a preset',
  'setup.load': 'Load',
  'setup.delete': 'Delete',
  'setup.presetHint':
    'Presets stay in this browser. Save up to {count}; export a setup to move it to another device.',
  'setup.paste': 'Paste setup JSON',
  'setup.json': 'Setup JSON',
  'setup.jsonPlaceholder': 'Paste a Battle Simulator setup snapshot here…',
  'setup.importPasted': 'Import pasted JSON',
  'profile.kicker': 'Saved profile readiness',
  'profile.title': 'Import your saved battle profile',
  'profile.copy':
    'Complete all three sources, then import them into one side without replacing troops, heroes, or opponent settings.',
  'profile.complete': 'Ready to import',
  'profile.incomplete': 'Setup incomplete',
  'profile.ready': 'Ready',
  'profile.missing': 'Missing',
  'profile.research': 'Research',
  'profile.researchReady': '{count} saved Research effects found.',
  'profile.researchMissing': 'Save at least one Research upgrade before importing.',
  'profile.openResearch': 'Open Research tool',
  'profile.equipment': 'Equipment',
  'profile.equipmentReady': 'Equipment profile saved {date}.',
  'profile.equipmentMissing': 'Choose equipment on either side, then save it as your profile.',
  'profile.saveEquipmentA': 'Save from Side A',
  'profile.saveEquipmentB': 'Save from Side B',
  'profile.towers': 'Specialization Towers',
  'profile.towersReady': '{count} saved Tower effects found.',
  'profile.towersMissing': 'Save at least one Specialization Tower upgrade before importing.',
  'profile.openTowers': 'Open Towers tool',
  'profile.importHint':
    'Import updates only the selected side?s automatic Research, Equipment, and Tower sources.',
  'profile.refresh': 'Refresh checklist',
  'profile.baseReadiness': 'Saved base readiness',
  'profile.label': 'Draft label',
  'profile.sources': 'Sources changed by Apply',
  'profile.sourceHint':
    'Choose which sources this Apply changes; unselected sources on the side stay untouched.',
  'profile.editSide': 'Edit Side {side}',
  'profile.source.research': 'Research',
  'profile.source.equipment': 'Equipment',
  'profile.source.towers': 'Towers',
  'profile.researchEditorHint': 'Effect amounts can only be lowered from the saved value.',
  'profile.researchAmount': '{name} effect amount',
  'profile.researchRestore': 'Restore saved values',
  'profile.researchZero': 'Set all to 0',
  'profile.equipmentEditorHint': 'This equipment draft is independent for this side.',
  'profile.towersEditorHint': 'Edit this side-local tower draft without changing saved Towers.',
  'profile.towerProgress': 'Research progress',
  'profile.towerProgressControls': 'Research progress controls',
  'profile.decrease': 'Decrease progress',
  'profile.increase': 'Increase progress',
  'profile.max': 'MAX',
  'profile.unmax': 'UNMAX',
  'profile.towerMax': 'Tower MAX',
  'profile.towerUnmax': 'Tower UNMAX',
  'profile.attributeNodes': 'Verified attribute nodes',
  'profile.attributeNode': 'Attribute node {number}',
  'profile.troop.footman': 'Footmen',
  'profile.troop.archer': 'Archers',
  'profile.troop.cavalry': 'Cavalry',
  'profile.towerInspectorAria': 'Selected tower research editor',
  'profile.towerTabsAria': 'Specialization troop towers',
  'profile.towerTabAria': '{troop} tower, {percent}% complete',
  'profile.towerGraphAria': '{troop} specialization tower columns',
  'profile.towerResearchAria': '{name}, {percent}% complete',
  'profile.applySummary': 'Apply {sources} to Side {side}.',
  'profile.noneSelected': 'no sources',
  'profile.preserveSummary':
    'Troops, heroes, opponent settings, and every unselected source stay untouched.',
  'profile.applySide': 'Apply to Side {side}',
  'profile.same': 'same as base',
  'profile.changed': 'changed',
  'profile.diffSummary':
    'Draft vs saved base: {research} Research effects changed; Equipment {equipment}; {towers} Tower learnings changed.',
  'toast.profileDraftIncomplete':
    'Side {side} needs at least one selected, available source before Apply.',
  'toast.profileApplied': 'Saved-profile draft applied to Side {side}.',
  'profile.importA': 'Import to Side A',
  'profile.importB': 'Import to Side B',
  'profile.storageError':
    'Saved equipment could not be read from this browser. Check storage access and try again.',
  'toast.profileEquipmentMissing': 'Choose equipment or add a validated equipment effect first.',
  'toast.profileEquipmentSaved': 'Side {side} equipment saved to your battle profile.',
  'toast.profileSaveFailed': 'The equipment profile could not be saved in this browser.',
  'toast.profileIncomplete': 'Complete Research, Equipment, and Towers before importing.',
  'toast.profileImported': 'Saved profile imported to Side {side}.',
  'side.formation': 'Side {side} formation',
  'side.kicker': 'Side {side}',
  'side.nameA': 'Ice Formation',
  'side.nameB': 'Fire Formation',
  'side.calculatedMode': 'Calculated sources',
  'side.finalMode': 'Final-total override',
  'side.independent': 'Independent row stats · {mode}',
  'side.modeLegend': 'Stat entry for Side {side}',
  'side.addSources': 'Calculate from sources',
  'side.finalTotals': 'Enter final totals',
  'sources.title': 'Legion sources',
  'sources.wholeLegion': 'Applies across this side’s whole legion where eligible.',
  'research.title': 'Saved Research',
  'research.synced': 'Captured from saved progress',
  'research.none': 'No saved Research progress found',
  'research.enabled': 'Use saved Research',
  'research.disabled': 'Saved Research is off for this side',
  'research.refresh': 'Refresh Research',
  'research.refreshAria': 'Refresh saved Research for Side {side}',
  'research.known.one': '{count} verified effect',
  'research.known.other': '{count} verified effects',
  'research.excluded.one': '{count} Research value excluded',
  'research.excluded.other': '{count} Research values excluded',
  'research.excludedFinal': 'Automatic Research is listed but excluded in final-total mode.',
  'research.emptyHint': 'Save progress in the Research tool, then refresh this side.',
  'equipment.title': 'Equipment',
  'equipment.wholeLegion': 'Whole legion',
  'equipment.none': 'None',
  'equipment.normal': 'Normal troop gear',
  'equipment.dm': 'Dragon Master',
  'equipment.ranger': 'Ranger',
  'equipment.dreadnaught': 'Dreadnaught',
  'equipment.steelCavalry': 'Steel Cavalry',
  'equipment.identityOnly': 'Identity only',
  'equipment.partial': 'Partial',
  'equipment.complete': 'Complete',
  'equipment.unresolved': 'Unresolved',
  'equipment.knownPieces': '{known} of {total} pieces have verified values',
  'equipment.identityWarning':
    'This loadout is saved by identity. Numeric equipment effects are not available yet and are not added.',
  'equipment.partialWarning':
    'Only verified equipment values are applied. Missing piece values and skills remain excluded.',
  'equipment.noneHint': 'No equipment effects are applied.',
  'equipment.setSkillPending': 'Set skill pending data',
  'equipment.select': 'Equipment loadout for Side {side}',
  'equipment.set': 'Equipment set',
  'equipment.grade': 'Grade',
  'equipment.enhancement': 'Enhancement',
  'equipment.grade.blue': 'Blue',
  'equipment.grade.purple': 'Purple',
  'equipment.grade.orange': 'Orange',
  'equipment.grade.gold': 'Gold',
  'equipment.overrides': 'Provisional equipment effects',
  'equipment.overrideJson': 'Equipment effect override JSON',
  'equipment.overrideHint':
    'Only schema-valid, user-observed values matching this loadout are applied.',
  'equipment.applyOverrides': 'Apply equipment effects',
  'equipment.overrideInvalid': 'The equipment effect JSON is invalid.',
  'equipment.overrideApplied': 'Equipment effects applied.',
  'heroSkills.title': 'Hero skills',
  'heroSkills.hero': 'Hero',
  'heroSkills.none': 'No hero selected',
  'heroSkills.skills': 'Listed skills',
  'heroSkills.modeled': 'Modeled',
  'heroSkills.partial': 'Partial',
  'heroSkills.excluded': 'Excluded',
  'heroSkills.missingData': 'Missing data',
  'heroSkills.missingDescription':
    'Placement and skill descriptions are unavailable for this hero.',
  'heroSkills.placementWarning': 'This hero is not listed for the {row} row.',
  'rowDefaults.title': 'Row defaults',
  'rowDefaults.summary': '{profile} · {troops} troops · {summary}',
  'rowDefaults.copy': 'Copy these values into all three rows.',
  'rowDefaults.warning': 'Apply to all rows overwrites customized rows.',
  'rowDefaults.apply': 'Apply to all rows',
  'row.customized': 'Customized',
  'row.reset': 'Reset to row defaults',
  'row.front': 'Front',
  'row.middle': 'Middle',
  'row.back': 'Back',
  'field.troopType': 'Troop type',
  'field.tier': 'Tier',
  'field.troops': 'Troops',
  'troop.cavalry': 'Cavalry',
  'troop.archers': 'Archers',
  'troop.footmen': 'Footmen',
  'stat.attack': 'Attack',
  'stat.defense': 'Defense',
  'stat.hp': 'HP',
  'stat.might': 'Battle Might',
  'stat.resistance': 'Battle Resistance',
  'stat.battleHp': 'Battle HP',
  'stat.tacticalMight': 'Tactical Might',
  'stat.tacticalResistance': 'Tactical Resistance',
  'stat.damage': 'Damage',
  'stat.damageMitigation': 'Damage Mitigation',
  'stat.combatSpeed': 'Combat Speed',
  'stat.future': 'Future',
  'stat.coreGroup': 'Unit points × battle multipliers',
  'stat.secondaryGroup': 'Secondary battle stats',
  'stat.total': 'Total',
  'stat.points': 'points',
  'stat.baseUnit': 'Base unit {stat}',
  'stat.battleTotal': '{stat} total',
  'stat.effective': 'Effective {stat}',
  'stat.sources': '{stat} source breakdown',
  'stat.baseline': 'Baseline',
  'stat.research': 'Saved Research',
  'stat.equipment': 'Equipment',
  'stat.manual': 'Manual',
  'stat.override': 'Final override',
  'stat.noContribution': 'No contribution',
  'stat.excluded': 'Excluded',
  'stat.automatic': 'Applies automatically',
  'stat.knownOnly': 'Known values only',
  'stat.manualHint': 'Manual input for this row',
  'stat.overrideHint': 'Automatic sources are not applied',
  'stat.equationAria': '{base} points multiplied by {percent} percent equals {effective}',
  'stat.secondarySummary': '{value}{unit} total',
  'stat.inactiveHint': 'Saved for future phases and not active in troop basic attacks.',
  'status.partial': 'Partial model',
  'status.partialCopy': 'Some Research or equipment values are unknown and excluded.',
  'status.valid': 'Setup valid',
  'status.noIssues': 'No blocking issues',
  'status.troopTotal': 'Side {side}: {troops} troops',
  'status.runCount.one': '{count} run',
  'status.runCount.other': '{count} runs',
  'status.research': 'Research',
  'status.equipment': 'Equipment',
  'validation.attention.one': '{groups} · {count} field needs attention',
  'validation.attention.other': '{groups} · {count} fields need attention',
  'validation.focus': 'Focus the first highlighted field',
  'validation.check': 'Check the highlighted value.',
  'validation.range': 'Every field must stay within its allowed range.',
  'results.kicker': 'Battle output',
  'results.complete.one': '{count} simulation complete',
  'results.complete.other': '{count} simulations complete',
  'results.sideWins': 'Side {side} wins',
  'results.draw': 'Draw',
  'results.stalemate': 'Round-limit stalemate',
  'results.winsRounds': 'Side {side} wins in {rounds} rounds',
  'results.cap': 'Stalemate ({rounds} round cap)',
  'results.noWinner': 'No clear winner across {count} runs',
  'results.drawRuns': 'Draw in {wins} of {count} runs ({rate}%)',
  'results.stalemateRuns': 'Stalemate in {wins} of {count} runs ({rate}%)',
  'results.sideWinsRuns': 'Side {side} wins {wins} of {count} runs ({rate}%)',
  'results.rate': 'Side {side} win rate: {rate}%',
  'results.draws': 'Draws: {count}',
  'results.stalemates': 'Stalemates: {count}',
  'results.averageRounds': 'Average rounds',
  'results.median': 'Median {value}',
  'results.roundRange': 'Round range',
  'results.shortLong': 'Shortest to longest',
  'results.sideLeft': 'Side {side} left',
  'results.avgSideLeft': 'Avg. Side {side} left',
  'results.casualties': '{count} casualties',
  'results.outcome': 'Outcome',
  'results.rounds': 'Rounds',
  'results.maximum': 'Maximum {count}',
  'results.initiative': 'Opening initiative',
  'results.speedTie': 'Speed tie',
  'results.combatSpeed': 'Combat Speed {value}',
  'results.survival': 'Side {side} survival',
  'results.deployed': '{count} deployed',
  'results.model': 'Model',
  'results.foundation': 'Source-aware troop model',
  'results.averageSurvivors': 'Average surviving troops',
  'results.survivors': 'Surviving troops',
  'results.averageShort': 'Avg.',
  'results.exportGroup': 'Export results',
  'results.fullJson': 'Full JSON',
  'results.summaryCsv': 'Summary CSV',
  'results.logCsv': 'Selected log CSV',
  'results.copyDebug': 'Copy debug',
  'results.calibration': 'Calibration fixture',
  'results.log': 'Round-by-round event log',
  'results.noLog': 'No event log is available for this result.',
  'results.logRegion': 'Battle strikes in action order',
  'results.partialNotice':
    'Partial model: unknown Research or equipment values were excluded from this result.',
  'action.reset': 'Reset setup',
  'toast.copySide': 'Side A copied to Side B.',
  'toast.swap': 'Sides A and B swapped.',
  'toast.researchRefresh': 'Saved Research refreshed for Side {side}.',
  'toast.modeSources': 'Side {side}: calculated sources restored.',
  'toast.modeFinal': 'Side {side}: final-total overrides restored.',
  'toast.defaults': 'Side {side} defaults applied to all rows.',
  'toast.rowReset': 'Side {side} {row} reset to row defaults.',
  'toast.reset': 'Setup reset to troop presets.',
  'toast.setupImported': 'Setup imported.',
  'toast.presetSaved': 'Preset “{name}” saved.',
  'toast.presetLoaded': 'Preset “{name}” loaded.',
  'toast.presetDeleted': 'Preset “{name}” deleted.',
  'footer.version': 'VTS 1097 · Battle Simulator Beta · v{version}',
  'footer.disclaimer': 'Free fan-made community tool · Not affiliated with Camel Games',
  'gate.kicker': 'BATTLE SIMULATOR · BETA',
  'gate.title': 'Beta Testers Only',
  'gate.prompt':
    'Only Beta Testers can access the Battle Simulator. Enter the beta tester PIN to continue.',
  'gate.label': 'Beta tester PIN',
  'gate.error': 'Incorrect PIN. Access is limited to Beta Testers.',
  'gate.cancel': 'Back to tools',
  'gate.unlock': 'Enter beta',
  'gate.unconfigured':
    'The Beta Tester PIN is not configured for this deployment. Return to the tool hub and contact the site owner.',
  'boot.title': 'Battle Simulator could not start',
  'boot.copy': 'An updated simulator file failed to load. Refresh once, or return to the tool hub.',
  'boot.refresh': 'Refresh',
  'noscript.title': 'Battle Simulator requires JavaScript',
  'noscript.copy': 'Enable JavaScript, then return to the PIN-protected beta.',
});

const packs = new Map([['en', BATTLE_SIMULATOR_ENGLISH]]);
const inFlight = new Map();
let activeLocale = 'en';
let activationGeneration = 0;
const formatterCache = new Map();

export function normalizeBattleSimulatorLocale(locale) {
  const primary = String(locale || 'en')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return BATTLE_SIMULATOR_LOCALES.includes(normalized) ? normalized : 'en';
}

export function resolveBattleSimulatorIntlLocale(locale = activeLocale) {
  const normalized = normalizeBattleSimulatorLocale(locale);
  if (normalized === 'kr') return 'ko-KR';
  if (normalized === 'zh') return 'zh-CN';
  if (normalized === 'pt') return 'pt-BR';
  return normalized;
}

function mergePack(pack) {
  return Object.freeze({ ...BATTLE_SIMULATOR_ENGLISH, ...(pack || {}) });
}

export async function loadBattleSimulatorLocale(locale = 'en') {
  const normalized = normalizeBattleSimulatorLocale(locale);
  const requestId = ++activationGeneration;
  if (!packs.has(normalized) && normalized !== 'en') {
    if (!inFlight.has(normalized)) {
      inFlight.set(
        normalized,
        import('./battle-simulator-i18n-packs.js')
          .then((module) => {
            const pack = module.BATTLE_SIMULATOR_LOCALE_PACKS?.[normalized];
            if (!pack) throw new Error(`Missing Battle Simulator locale pack: ${normalized}`);
            const merged = mergePack(pack);
            packs.set(normalized, merged);
            return merged;
          })
          .catch((error) => {
            console.warn(
              `[battle-simulator-i18n] Failed to load ${normalized}; using English.`,
              error
            );
            return BATTLE_SIMULATOR_ENGLISH;
          })
          .finally(() => inFlight.delete(normalized))
      );
    }
    await inFlight.get(normalized);
  }
  if (requestId === activationGeneration) activeLocale = packs.has(normalized) ? normalized : 'en';
  return packs.get(normalized) || BATTLE_SIMULATOR_ENGLISH;
}

export function getActiveBattleSimulatorLocale() {
  return activeLocale;
}

export function getBattleSimulatorPack(locale = activeLocale) {
  return packs.get(normalizeBattleSimulatorLocale(locale)) || BATTLE_SIMULATOR_ENGLISH;
}

function interpolate(template, values = {}) {
  return String(template || '').replace(/\{([A-Za-z0-9_]+)\}/gu, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match
  );
}

export function battleSimulatorText(id, values = {}, locale = activeLocale) {
  const pack = getBattleSimulatorPack(locale);
  return interpolate(pack[id] || BATTLE_SIMULATOR_ENGLISH[id] || id, values);
}

export function battleSimulatorPlural(id, count, values = {}, locale = activeLocale) {
  const normalized = normalizeBattleSimulatorLocale(locale);
  const category = new Intl.PluralRules(resolveBattleSimulatorIntlLocale(normalized)).select(
    Number(count)
  );
  const pack = getBattleSimulatorPack(normalized);
  const key = Object.hasOwn(pack, `${id}.${category}`) ? `${id}.${category}` : `${id}.other`;
  return battleSimulatorText(key, { ...values, count }, normalized);
}

function getFormatter(locale, options) {
  const normalized = normalizeBattleSimulatorLocale(locale);
  const key = `${normalized}:${JSON.stringify(options)}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(resolveBattleSimulatorIntlLocale(normalized), options)
    );
  }
  return formatterCache.get(key);
}

export function formatBattleSimulatorNumber(value, options = {}, locale = activeLocale) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return getFormatter(locale, options).format(numeric);
}

export function formatBattleSimulatorDate(value, options = {}, locale = activeLocale) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(resolveBattleSimulatorIntlLocale(locale), options).format(date);
}

export function readPreferredBattleSimulatorLocale(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(BATTLE_SIMULATOR_LANGUAGE_STORAGE_KEY);
    if (stored) return normalizeBattleSimulatorLocale(stored);
  } catch {
    /* use browser preference */
  }
  return normalizeBattleSimulatorLocale(globalThis.navigator?.language || 'en');
}

export function writePreferredBattleSimulatorLocale(locale, storage = globalThis.localStorage) {
  const normalized = normalizeBattleSimulatorLocale(locale);
  try {
    storage?.setItem(BATTLE_SIMULATOR_LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    /* language still applies for this session */
  }
  return normalized;
}

export function applyBattleSimulatorDocumentLocale(documentRef, locale = activeLocale) {
  if (!documentRef) return normalizeBattleSimulatorLocale(locale);
  const normalized = normalizeBattleSimulatorLocale(locale);
  documentRef.documentElement.lang = normalized === 'kr' ? 'ko' : normalized;
  documentRef.documentElement.dir = normalized === 'ar' ? 'rtl' : 'ltr';
  documentRef.title = battleSimulatorText('document.title', {}, normalized);
  return normalized;
}

export function createBattleSimulatorTranslator(locale = activeLocale) {
  const normalized = normalizeBattleSimulatorLocale(locale);
  return Object.freeze({
    locale: normalized,
    dir: normalized === 'ar' ? 'rtl' : 'ltr',
    t: (id, values = {}) => battleSimulatorText(id, values, normalized),
    plural: (id, count, values = {}) => battleSimulatorPlural(id, count, values, normalized),
    number: (value, options = {}) => formatBattleSimulatorNumber(value, options, normalized),
    date: (value, options = {}) => formatBattleSimulatorDate(value, options, normalized),
  });
}
