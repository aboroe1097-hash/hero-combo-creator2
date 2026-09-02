/* Public leadership labels and stable player aliases already rendered by the VTS app.
 * This deliberately excludes private rosters, authenticated management data, and Eden ballots. */

function profile(name, rank, aliases = []) {
  return Object.freeze({
    name,
    alliance: 'VTS 1097',
    rank,
    aliases: Object.freeze(aliases),
  });
}

export const PUBLIC_VTS_PLAYER_PROFILES = Object.freeze([
  profile('MalakAbo', 'R5', ['Abo']),
  profile('Goodness', 'R4', ['Goodnes Graycious']),
  profile('Sarafino', 'R4'),
  profile('Big Boiie', 'R4'),
  profile('Bil', 'R4'),
  profile('BoneSmoker', 'R4', ['BoneSmoker 1097']),
  profile('Zubbs', null, ['Lady Zubbs', 'Dr Zubbs']),
  profile('Loony', 'R4'),
  profile('Dr Thunder', 'R4', ['Dr Thunder 293', 'Dr Thunder VTS R4']),
  profile('Jasper', 'R4'),
  profile('Juli', 'R4', ['Juli Rae']),
  profile('Lisaveta', 'R4', ['Lisavetka']),
  profile('MasterVj', 'R4', ['MasterVj 1097']),
  profile('Moldo', 'R4'),
  profile('Peter', 'R4'),
  profile('Redbull', 'R4', ['Redbulls']),
  profile('Roha', 'R4'),
  profile('Ruccak', 'R4'),
  profile('Tazz', 'R4', ['Tazz Boy']),
  profile('Uzumaki', 'R4'),
  profile('Kika', 'R4', ['Kika Alt', 'Kika Banner', 'Kika Banner 2', 'Victoria Kika']),
  profile('Angel', 'R4', [
    'Angel Banner',
    'Angel V2',
    'Angel 1097',
    'ΛNGΞL 1097',
    'ΛNGƎL',
    'ΛNGEL',
    'ANGƎL',
  ]),
  profile('Wicked Russian', 'R4', ['Vicked Russian', 'Wicked Russian NM5 1111']),
  profile('ZenaXeya', 'R4'),
  profile('Irop', 'R4', ['Irop Peaceful Warrior']),
]);

export function normalizePublicPlayerName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

const PROFILE_BY_ALIAS = new Map();
for (const entry of PUBLIC_VTS_PLAYER_PROFILES) {
  for (const candidate of [entry.name, ...entry.aliases]) {
    PROFILE_BY_ALIAS.set(normalizePublicPlayerName(candidate), entry);
  }
}

export function getPublicVtsPlayerProfile(value) {
  const entry = PROFILE_BY_ALIAS.get(normalizePublicPlayerName(value));
  if (!entry) return null;
  return Object.freeze({ name: entry.name, alliance: entry.alliance, rank: entry.rank });
}
