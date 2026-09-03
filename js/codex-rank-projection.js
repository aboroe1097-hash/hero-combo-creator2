// js/codex-rank-projection.js
// Pure, read-only projection of the skin-mode rank override block in
// js/combos-db.js. Never re-ranks rankedCombos; missing skin metadata behaves
// like '111', so a combo present in both lists at the same rank yields 0.

export function projectSkinModeRankDeltas(baseCombos, skinCombos, heroNames) {
  const rankIndex = (list) => {
    const map = new Map();
    (list || []).forEach((combo, index) => {
      if (!combo?.heroes?.length) return;
      const key = combo.heroes.join('|');
      if (!map.has(key)) map.set(key, index + 1);
    });
    return map;
  };
  const baseIndex = rankIndex(baseCombos);
  const skinIndex = rankIndex(skinCombos);
  const best = new Map(heroNames.map((name) => [name, 0]));
  for (const [key, skinRank] of skinIndex) {
    const baseRank = baseIndex.get(key);
    if (!baseRank) continue;
    const delta = baseRank - skinRank;
    if (delta <= 0) continue;
    for (const heroName of key.split('|')) {
      if (best.has(heroName)) best.set(heroName, Math.max(best.get(heroName), delta));
    }
  }
  return best;
}
