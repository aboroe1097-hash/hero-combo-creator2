export const COMBO_TOOL_ENGLISH = Object.freeze({
  'builder.heroSkin': 'Hero skin',
  'builder.skin': 'Skin',
  'builder.originalRelease': 'Original release {season}',
  'builder.restoredHero': '{hero} restored to combo slot {slot}.',
  'builder.restoredEmpty': 'Combo slot {slot} restored to empty.',
  'builder.alreadyInCombo': '{hero} is already in this combo.',
  'builder.slotLabel': 'Combo slot {slot}',
  'builder.slotChanged': 'Combo slot {slot} changed.',
  'builder.placedHero': '{hero} placed in combo slot {slot}.',
  'builder.filledSlotAria': 'Combo slot {slot}: {hero}. Press Delete to clear.',
  'builder.emptySlotAria':
    'Combo slot {slot}: empty. Select a hero, then press Enter here to place.',
  'builder.comboScoreRank': 'Combo score {score}, rank {rank}.',
  'builder.slotCleared': 'Combo slot {slot} cleared.',
  'builder.selectHeroFirst': 'Select a hero card first, then focus this slot to place it.',
  'state.change': 'Change',
  'state.paidHero': 'Paid Hero',
  'state.paid': 'PAID',
  'undo.removed': '{label} removed.',
  'undo.action': 'Undo',
  'undo.done': 'Undone.',
  'undo.failed': 'Undo failed.',
  'generator.selected': '{n} selected',
  'generator.generating': 'Generating…',
  'generator.skinAvailableOne': '{n} skin available',
  'generator.skinAvailableMany': '{n} skins available',
  'generator.turnOffSkin': 'Turn off skin icon for {hero}',
  'generator.turnOnSkin': 'Turn on skin icon for {hero}',
  'generator.usingSkin': 'Using skin icon for this hero',
  'generator.usingBase': 'Using base icon for this hero',
  'generator.skin': 'Skin',
  'generator.base': 'Base',
  'generator.showCounterDetails': 'Show counter details',
  'generator.countersKnownOne': '{n} counter known',
  'generator.countersKnownMany': '{n} counters known',
  'generator.noKnownCounters': 'No known counters',
  'app.counterHeroesAdded': 'Counter heroes added to Generator selection.',
  'counter.toggle': 'Counters ({n})',
  'counter.title': 'Counters',
  'counter.score': 'Score',
  'counter.hide': 'Hide counters',
  'counter.none': 'No known counters',
  'counter.use': 'Use this counter',
  'counter.why': 'Why',
  'counter.rank': 'Rank #{rank}',
  'counter.unranked': 'Unranked',
  'counter.number': 'Counter {n}',
  'counter.lineup': 'Counter lineup',
  'counter.pathOne': '{n} known counter path',
  'counter.pathMany': '{n} known counter paths',
  'counter.pickHelp': 'Pick a listed lineup to replace the current generator selection.',
  'counter.favoredHelp': 'These lineups are favored into the current combo.',
  'counter.targetCombo': 'Target combo',
  'counter.counter': 'Counter',
  'counter.beats': 'beats',
  'counter.target': 'Target',
  'counter.reason.arthurVsRamses':
    'Arthur sustain and pressure are favored into Ramses + Beowulf lines',
  'counter.reason.duelArthurCleoTheodora':
    'Duel report shows this cavalry line winning into the Arthur/Cleo/Theodora sustain core',
  'counter.reason.vtsBeowulfArthurCleoBleeding':
    'VTS testing favors Beowulf + Ramses + Theodora sustain into this Arthur/Cleo/Bleeding lane',
  'counter.reason.vtsOctaviusArthurCleoBleeding':
    'Octavius + Rozen + Caesar pressure is favored into Arthur/Cleo/Bleeding',
  'counter.reason.duelOctaviusArthurRozenTheodora':
    'Duel report shows Octavius/Rozen/Caesar beating the Arthur/Rozen/Theodora variant',
  'counter.reason.octaviusVsArthurSustain':
    'Octavius + Rozen + Caesar is favored into King Arthur sustain lines',
  'counter.reason.ramsesVsOctaviusCaesar':
    'Ramses + Beowulf lineups are favored into Octavius + Caesar cavalry',
  'counter.reason.vtsBeowulfVsOctaviusRozenCaesar':
    'Current VTS testing favors Beowulf front-row sustain with Theodora healing into Octavius/Rozen/Caesar',
  'counter.reason.ramsesVsOctaviusRozenCaesar':
    'Ramses + Beowulf lineups are favored into Octavius + Rozen + Caesar',
  'counter.reason.softHunkBoudicaSakura':
    'Soft counter option: Hunk/Boudica/Sakura can pressure this line but is not as reliable as the top sustain counters',
  'counter.reason.heavySustainOutlasts': 'Heavy sustain outlasts their damage output',
  'counter.reason.leonidasDisrupts': 'Leonidas disrupts their initial burst setup',
  'counter.reason.cleoCleanses': 'Cleo cleanses debuffs and outheals the pressure',
  'counter.confidence.duelScreenshot': 'Duel screenshot',
  'counter.confidence.vtsTesting': 'VTS testing',
  'counter.confidence.softCounter': 'Soft counter',
  'builder.savedCombo': 'Saved combo',
  'app.noVisibleHeroes': 'No visible heroes match the current filters.',
  'skinType.mythic': 'Mythic',
  'skinType.legendary': 'Legendary',
  'skinType.everlasting': 'Everlasting',
});

export const COMBO_TOOL_MESSAGE_IDS = Object.freeze(Object.keys(COMBO_TOOL_ENGLISH));

function placeholders(value) {
  return [...String(value || '').matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

export function defineComboToolsPack(values) {
  const source = Array.isArray(values)
    ? Object.fromEntries(COMBO_TOOL_MESSAGE_IDS.map((id, index) => [id, values[index]]))
    : { ...(values || {}) };
  return Object.freeze(source);
}

export function auditComboToolsPack(pack, locale = 'unknown') {
  const missing = [];
  const placeholderMismatches = [];
  for (const id of COMBO_TOOL_MESSAGE_IDS) {
    const value = pack?.[id];
    if (typeof value !== 'string' || !value.trim()) {
      missing.push(id);
      continue;
    }
    const expected = placeholders(COMBO_TOOL_ENGLISH[id]).join('|');
    const actual = placeholders(value).join('|');
    if (expected !== actual) placeholderMismatches.push(id);
  }
  return Object.freeze({
    locale,
    complete: missing.length === 0 && placeholderMismatches.length === 0,
    missing: Object.freeze(missing),
    placeholderMismatches: Object.freeze(placeholderMismatches),
  });
}
