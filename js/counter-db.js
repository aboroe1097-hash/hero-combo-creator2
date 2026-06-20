// js/counter-db.js
// Maintains exact 3-hero combo counter matchups.
import { allHeroesData } from './heroes-data.js';

/**
 * Each entry: target combo (3 heroes) -> counter lineups.
 * Counter rows can be a hero array OR { heroes, reason, confidence }.
 */
export const COMBO_COUNTERS = [
  {
    target: ['Alexander', 'Cleopatra VII', 'Theodora'],
    counters: [
      ['King Arthur', 'Theodora', 'Alexander'],
      ['Immortal Guardian', 'Ramses II', 'Beowulf'],
      ['Lawman', 'Lancelot', 'The Avalanche'],
    ],
  },
  {
    target: ['Immortal Guardian', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines', confidence: 'Duel screenshot' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
      ['Defender', 'Tarantula', 'Sakura'],
      ['Lawman', 'Army Breaker', 'The Avalanche'],
      ['Hunk', 'Spectral Reaper', 'Ramses II'],
    ],
  },
  {
    target: ['King Arthur', 'Cleopatra VII', 'Theodora'],
    counters: [
      { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], reason: 'Duel report shows this cavalry line winning into the Arthur/Cleo/Theodora sustain core', confidence: 'Duel screenshot' },
      ['Lawman', 'Defender', 'The Avalanche'],
    ],
  },
  {
    target: ['King Arthur', 'Rozen Blade', 'Theodora'],
    counters: [
      { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], reason: 'Duel report shows Octavius/Rozen/Caesar beating the Arthur/Rozen/Theodora variant', confidence: 'Duel screenshot' },
      ['Immortal Guardian', 'Ramses II', 'Beowulf'],
    ],
  },
  {
    target: ['Ramses II', 'Leonidas', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
      ['Lawman', 'Rozen Blade', 'The Avalanche'],
      ['Immortal Guardian', 'ELK', 'Tarantula'],
    ],
  },
  {
    target: ['Hunk', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
    ],
  },
  {
    target: ['Bleeding Steed', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
    ],
  },
  {
    target: ['Rozen Blade', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
    ],
  },
  {
    target: ['King Arthur', 'Theodora', 'Alexander'],
    counters: [
      { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], reason: 'Octavius + Rozen + Caesar is favored into King Arthur sustain lines' },
    ],
  },
  {
    target: ['King Arthur', 'Cleopatra VII', 'Alexander'],
    counters: [
      { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], reason: 'Octavius + Rozen + Caesar is favored into King Arthur sustain lines' },
    ],
  },
  {
    target: ['Lawman', 'Lancelot', 'The Avalanche'],
    counters: [
      ['Defender', 'Tarantula', 'Sakura'],
      ['Black Prince', 'Lancelot', 'The Avalanche'],
      ['Ramses II', 'Leonidas', 'Jade Eagle'],
    ],
  },
  {
    target: ['Defender', 'Tarantula', 'Sakura'],
    counters: [
      ['Ramses II', 'Leonidas', 'Beowulf'],
      ['Lawman', 'War Lord', 'Jane'],
      ['Immortal Guardian', 'Ramses II', 'Beowulf'],
    ],
  },
  {
    target: ['Octavius', 'Cleopatra VII', 'Caesar'],
    counters: [
      { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'], reason: 'Ramses + Beowulf lineups are favored into Octavius + Caesar cavalry' },
      ['Hunk', 'Ramses II', 'Beowulf'],
      ['Bleeding Steed', 'Ramses II', 'Beowulf'],
      ['Rozen Blade', 'Ramses II', 'Beowulf'],
      ['Ramses II', 'Leonidas', 'Beowulf'],
    ],
  },
  {
    target: ['Octavius', 'Rozen Blade', 'Caesar'],
    counters: [
      { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'], reason: 'Ramses + Beowulf lineups are favored into Octavius + Rozen + Caesar', confidence: 'Duel screenshot' },
      ['Hunk', 'Ramses II', 'Beowulf'],
      ['Bleeding Steed', 'Ramses II', 'Beowulf'],
      ['Rozen Blade', 'Ramses II', 'Beowulf'],
      ['Ramses II', 'Leonidas', 'Beowulf'],
    ],
  },
  {
    target: ['Immortal Guardian', 'ELK', 'Tarantula'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Heavy sustain outlasts their damage output' },
      ['Lawman', 'Rozen Blade', 'The Avalanche'],
      ['Defender', 'Sakura', 'Jade Eagle'],
    ],
  },
  {
    target: ['Black Prince', 'Lancelot', 'The Avalanche'],
    counters: [
      { heroes: ['Ramses II', 'Leonidas', 'Beowulf'], reason: 'Leonidas disrupts their initial burst setup' },
      ['Lawman', 'Defender', 'The Avalanche'],
      ['Defender', 'Tarantula', 'Sakura'],
    ],
  },
  {
    target: ['Hunk', 'Spectral Reaper', 'Ramses II'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Alexander'], reason: 'Cleo cleanses debuffs and outheals the pressure' },
      ['Immortal Guardian', 'Ramses II', 'Beowulf'],
      ['Lawman', 'Lancelot', 'The Avalanche'],
    ],
  }
];

export function comboKey(heroes) {
  return [...heroes].sort().join('|');
}

export function normalizeCounter(raw) {
  if (Array.isArray(raw) && raw.length === 3) {
    return { heroes: [...raw], reason: null, confidence: null };
  }
  if (raw && Array.isArray(raw.heroes) && raw.heroes.length === 3) {
    const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
    const confidence = typeof raw.confidence === 'string' ? raw.confidence.trim() : '';
    return {
      heroes: [...raw.heroes],
      reason: reason || null,
      confidence: confidence || null
    };
  }
  return null;
}

const _lookup = new Map(
  COMBO_COUNTERS.map((entry) => {
    const counters = (entry.counters || [])
      .map(normalizeCounter)
      .filter(Boolean);
    return [comboKey(entry.target), counters];
  }),
);

export function getCountersForCombo(heroes) {
  if (!Array.isArray(heroes) || heroes.length !== 3) return [];
  return (_lookup.get(comboKey(heroes)) || []).map(counter => ({
    ...counter,
    heroes: [...counter.heroes],
  }));
}

export function getAllCounterMatchups() {
  return COMBO_COUNTERS.map(entry => ({
    target: [...entry.target],
    counters: (entry.counters || []).map(normalizeCounter).filter(Boolean),
  }));
}

export function getCombosCounteredByHero(heroName) {
  return getAllCounterMatchups().flatMap(matchup =>
    matchup.counters
      .filter(counter => counter.heroes.includes(heroName))
      .map(counter => ({
        target: [...matchup.target],
        counter: [...counter.heroes],
        reason: counter.reason,
        confidence: counter.confidence,
      }))
  );
}

export function getCountersAgainstHero(heroName) {
  return getAllCounterMatchups()
    .filter(matchup => matchup.target.includes(heroName))
    .flatMap(matchup => matchup.counters.map(counter => ({
      target: [...matchup.target],
      counter: [...counter.heroes],
      reason: counter.reason,
      confidence: counter.confidence,
    })));
}

export function validateCounterDatabase() {
  const heroNames = new Set(allHeroesData.map(hero => hero.name));
  const issues = [];

  COMBO_COUNTERS.forEach((entry, entryIndex) => {
    if (!Array.isArray(entry.target) || entry.target.length !== 3) {
      issues.push(`Entry ${entryIndex + 1} has an invalid target combo.`);
    }
    (entry.target || []).forEach(name => {
      if (!heroNames.has(name)) issues.push(`Unknown target hero "${name}" in entry ${entryIndex + 1}.`);
    });

    (entry.counters || []).forEach((rawCounter, counterIndex) => {
      const counter = normalizeCounter(rawCounter);
      if (!counter) {
        issues.push(`Entry ${entryIndex + 1}, counter ${counterIndex + 1} is invalid.`);
        return;
      }
      counter.heroes.forEach(name => {
        if (!heroNames.has(name)) {
          issues.push(`Unknown counter hero "${name}" in entry ${entryIndex + 1}, counter ${counterIndex + 1}.`);
        }
      });
    });
  });

  return issues;
}

const counterValidationIssues = validateCounterDatabase();
if (counterValidationIssues.length) {
  console.warn('Counter database validation issues:', counterValidationIssues);
}
