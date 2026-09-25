// js/hero-name-match.js
//
// Reading hero names the way people type them: "Avalanche" for The Avalanche,
// "Ragnar the Demon Lord" for Ragnar, "Lancelott" for Lancelot. The ROC combo
// importer (scripts/roc-combo-importer.mjs) and the Combos planner's paste import
// share these keys and aliases, so a name one accepts the other accepts too.
// Pure: no DOM, no network, no node imports.

export const DEFAULT_HERO_ALIASES = {
  ARTHUR: 'King Arthur',
  RAMSES: 'Ramses II',
  STEED: 'Bleeding Steed',
  ROZEN: 'Rozen Blade',
  JADEEAGLE: 'Jade Eagle',
  AVALANCHE: 'The Avalanche',
  WARLORD: 'War Lord',
  BRAVE: 'The Brave',
  BEWULF: 'Beowulf',
  BEOWULF: 'Beowulf',
  RAGNAR: 'Ragnar',
  REINFORCEDRAGNAR: 'Reinforced Ragnar',
  REINFORCEDRANGER: 'Reinforced Ragnar',
  RAGNARREINFORCED: 'Reinforced Ragnar',
  RAGNARDEMONLORD: 'Ragnar',
  RAGNARTHEDEMONLORD: 'Ragnar',
  RAGNARTHEDEMONSLORD: 'Ragnar',
  IMMORTALGUARDIAN: 'Immortal Guardian',
  BLACKPRINCE: 'Black Prince',
  SKYBREAKER: 'Sky Breaker',
  WINDBREAKER: 'Wind-Walker',
  WINDWALKER: 'Wind-Walker',
  ALFATIH: 'Al Fatih',
  NORTHRAGE: "North's Rage",
  NORTHSRAGE: "North's Rage",
  HEAVENSJUSTICE: "Heaven's Justice",
  QUEENANNE: 'Queen Anne',
  WILLIAMWALLACE: 'William Wallace',
  WILLIAMTHECONQUEROR: 'William the Conqueror',
  CHARLESTHEGREAT: 'Charles the Great',
  CHARLES: 'Charles the Great',
  EDWARDCONFESSOR: 'Edward the Confessor',
  EDWARDTHECONFESSOR: 'Edward the Confessor',
  CONSTANTINE: 'Constantine the Great',
  CONSTANTINETHEGREAT: 'Constantine the Great',
  DEMONSPEAR: 'Demon Spear',
  PEACEBRINGER: 'Peace Bringer',
  THEHEROINE: 'The Heroine',
  HEROINECOURAGE: 'The Heroine',
  THEBONELESS: 'The Boneless',
  ARMYBREAKER: 'Army Breaker',
  BLEEDINGSTEED: 'Bleeding Steed',
  DESERTSTORM: 'Desert Storm',
  SOARINGHAWK: 'Soaring Hawk',
  DIVINEARROW: 'Divine Arrow',
  SPECTRALREAPER: 'Spectral Reaper',
  RAINFORESTRANGER: 'Rainforest Ranger',
  SCARLETREAVER: 'Scarlet Reaver',
  ASHENVERDICT: 'Ashen Verdict',
  ASHEN: 'Ashen Verdict',
  ISABELLA: 'Isabella I',
  JADERAKSHASA: 'Jade',
  MARY: 'Mary Tudor',
  RAINFOREST: 'Rainforest Ranger',
  ROKU: 'Rokuboshuten',
  SOARING: 'Soaring Hawk',
  WILLIAMCONQUEROR: 'William the Conqueror',
  YUKIMURA: 'Yukimura Sanada',
};

/** Upper-case letters and digits only, accents folded: "Jeanne d'Arc" -> "JEANNEDARC". */
export function normalizeHeroKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'AND')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

/** Levenshtein distance, stopping early once it passes `max`. */
export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (row[j] < best) best = row[j];
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

/** How many typos a key of this length may carry and still count as a match. */
const typoBudget = (key) => (key.length <= 4 ? 0 : key.length <= 7 ? 1 : 2);

/**
 * A resolver for typed hero names. It returns
 *   { name, how: 'exact' | 'alias' | 'prefix' | 'typo' }  when one hero fits, or
 *   { name: null, suggestions: [names] }                  when none (or several) do.
 * Case, spaces, punctuation and a leading "The" are ignored.
 */
export function createHeroMatcher(names, aliases = DEFAULT_HERO_ALIASES) {
  const byKey = new Map();
  const add = (key, name, how) => {
    if (key && !byKey.has(key)) byKey.set(key, { name, how });
  };
  for (const name of names) add(normalizeHeroKey(name), name, 'exact');
  for (const name of names) {
    const key = normalizeHeroKey(name);
    if (key.startsWith('THE') && key.length > 5) add(key.slice(3), name, 'exact');
  }
  const known = new Set(names);
  for (const [alias, name] of Object.entries(aliases))
    if (known.has(name)) add(normalizeHeroKey(alias), name, 'alias');
  const keys = [...byKey.keys()];

  return function match(raw) {
    let key = normalizeHeroKey(raw);
    if (!key) return { name: null, suggestions: [] };
    if (byKey.has(key)) return { ...byKey.get(key) };
    if (key.startsWith('THE') && byKey.has(key.slice(3))) return { ...byKey.get(key.slice(3)) };
    if (key.startsWith('THE') && key.length > 5) key = key.slice(3);
    // A clear abbreviation: the only hero whose key starts with what was typed.
    if (key.length >= 4) {
      const heads = new Set(keys.filter((k) => k.startsWith(key)).map((k) => byKey.get(k).name));
      if (heads.size === 1) return { name: [...heads][0], how: 'prefix' };
    }
    const scored = [];
    for (const k of keys) {
      const distance = editDistance(key, k, 3);
      if (distance <= 3) scored.push({ name: byKey.get(k).name, distance, k });
    }
    scored.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
    const best = scored[0];
    const suggestions = [...new Set(scored.map((s) => s.name))].slice(0, 3);
    if (best && best.distance <= typoBudget(best.k)) {
      const rivals = new Set(
        scored.filter((s) => s.distance === best.distance).map((s) => s.name)
      );
      if (rivals.size === 1) return { name: best.name, how: 'typo' };
    }
    return { name: null, suggestions };
  };
}
