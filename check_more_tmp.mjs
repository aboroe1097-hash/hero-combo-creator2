import { allHeroesData } from './js/heroes-data.js';
import { heroesExtendedData } from './js/heroes-info.js';
import { rankedCombos } from './js/combos-db.js';

const heroNames = allHeroesData.map(h => h.name);
const infoNames = Object.keys(heroesExtendedData);
const infoSet = new Set(infoNames);

// Check for duplicate combos
const comboSignatures = rankedCombos.map(c => [...c.heroes].sort().join('|'));
const seen = new Map();
const dups = [];
comboSignatures.forEach((sig, idx) => {
  if (seen.has(sig)) dups.push({ index: idx + 1, heroes: rankedCombos[idx].heroes, firstIndex: seen.get(sig) + 1 });
  else seen.set(sig, idx);
});
console.log('Duplicate combo entries:', dups.length);
dups.forEach(d => console.log(`  Rank ${d.index} duplicates rank ${d.firstIndex}:`, d.heroes));

// Combos referencing heroes missing from heroes-info
const combosMissingInfo = rankedCombos.filter(c => c.heroes.some(h => !infoSet.has(h)));
console.log('Combos with heroes missing from heroes-info:', combosMissingInfo.length);
combosMissingInfo.slice(0, 10).forEach(c => console.log('  ', c.heroes, 'missing:', c.heroes.filter(h => !infoSet.has(h))));

// Troop type coverage in combos
const typeCounts = {};
allHeroesData.forEach(h => { typeCounts[h.Type] = (typeCounts[h.Type] || 0) + 1; });
console.log('Troop type counts:', typeCounts);

// Season counts
const seasonCounts = {};
allHeroesData.forEach(h => { seasonCounts[h.season] = (seasonCounts[h.season] || 0) + 1; });
console.log('Season counts:', seasonCounts);

// External image URLs
const externalUrls = allHeroesData.map(h => h.imageUrl).filter(u => /^https?:\/\//i.test(u));
console.log('External hero image URLs:', externalUrls.length);
const hosts = {};
externalUrls.forEach(u => {
  const host = new URL(u).hostname;
  hosts[host] = (hosts[host] || 0) + 1;
});
console.log('  by host:', hosts);
