import {
  getExplicitSkinOwnership,
  readExplicitSkinOwnershipState,
  readSelectedHeroState,
} from './saved-state.js';
import {
  AiToolInputError,
  boolArgument,
  boundedInteger,
  boundedString,
  boundedStringArray,
  createHeroResolver,
  normalizeLookupToken,
  orderedFormation,
  rejectUnknownArguments,
  requirePlainArguments,
} from './tool-utils.js';

function result(data, sourceId, options = {}) {
  return {
    data,
    meta: {
      sourceId,
      filters: options.filters || {},
      truncated: options.truncated === true,
      completeness: options.completeness || 'complete',
      warnings: options.warnings || [],
    },
  };
}

function requireSavedState(state, category, action) {
  if (!state.exists) {
    throw new AiToolInputError('missing_saved_data', `No saved ${category} data is available.`, {
      setupAction: action,
    });
  }
  if (state.malformed) {
    throw new AiToolInputError(
      'malformed_saved_data',
      `The saved ${category} data is malformed. Open the related tool and save it again.`,
      { setupAction: action }
    );
  }
}

async function loadHeroData() {
  const [{ allHeroesData }, { heroesExtendedData }, skins] = await Promise.all([
    import('../heroes-data.js'),
    import('../heroes-info.js'),
    import('../skins-db.js'),
  ]);
  return { allHeroesData, heroesExtendedData, skins };
}

function mapSkill(skill) {
  return {
    id: Number.isFinite(Number(skill?.id)) ? Number(skill.id) : null,
    type: typeof skill?.type === 'string' ? skill.type : null,
    range: Number.isFinite(Number(skill?.range)) ? Number(skill.range) : null,
    target: typeof skill?.target === 'string' ? skill.target : null,
    description: typeof skill?.desc === 'string' ? skill.desc.slice(0, 700) : null,
  };
}

export async function getHeroDetailsAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['names']);
  const names = boundedStringArray(args.names, 'names', {
    minimum: 1,
    maximum: 12,
    item: { maximum: 80 },
  });
  const { allHeroesData, heroesExtendedData, skins } = await loadHeroData();
  const resolveHero = createHeroResolver(allHeroesData);
  const heroByName = new Map(allHeroesData.map((hero) => [hero.name, hero]));
  const resolved = [];
  const missing = [];

  for (const requestedName of names) {
    const canonicalName = resolveHero(requestedName);
    if (!canonicalName) {
      missing.push(requestedName);
      continue;
    }
    const base = heroByName.get(canonicalName);
    const extended = heroesExtendedData[canonicalName] || null;
    const availableSkins = skins.getHeroSkins(canonicalName).map((skin) => ({
      name: skin.name,
      type: skin.type,
      availableInCatalog: true,
    }));
    const skills = Array.isArray(extended?.skills) ? extended.skills.map(mapSkill) : [];
    resolved.push({
      requestedName,
      name: canonicalName,
      season: base.season,
      releaseSeason: base.releaseSeason || base.season,
      troop: base.Type,
      acquisition: base.State,
      placement: extended?.placement || null,
      skills,
      skins: availableSkins,
      completeness: {
        base: 'complete',
        placement: extended?.placement ? 'complete' : 'unknown',
        skills: skills.length ? 'partial' : 'unknown',
        skins: 'complete',
      },
    });
  }

  const warnings = [];
  if (missing.length) warnings.push(`No canonical hero data was found for: ${missing.join(', ')}.`);
  if (resolved.some((hero) => hero.completeness.skills !== 'complete')) {
    warnings.push('Extended hero skill coverage is incomplete; missing skills were not inferred.');
  }
  return result({ heroes: resolved, missingNames: missing }, 'heroes-db', {
    filters: { names },
    completeness: missing.length || warnings.length ? 'partial' : 'complete',
    warnings,
  });
}

function normalizeComboFilters(rawFilters) {
  if (rawFilters === undefined) return {};
  const filters = requirePlainArguments(rawFilters);
  rejectUnknownArguments(filters, ['seasons', 'troops', 'heroes', 'states']);
  const resultFilters = {};
  if (filters.seasons !== undefined) {
    resultFilters.seasons = boundedStringArray(filters.seasons, 'filters.seasons', {
      minimum: 1,
      maximum: 8,
      item: { maximum: 4 },
    }).map((season) => season.toUpperCase());
  }
  if (filters.troops !== undefined) {
    const troopAliases = {
      archer: 'Archers',
      archers: 'Archers',
      footmen: 'Footmen',
      cavalry: 'Cavalry',
      all: 'All',
    };
    resultFilters.troops = boundedStringArray(filters.troops, 'filters.troops', {
      minimum: 1,
      maximum: 4,
      item: { maximum: 20 },
    }).map((troop) => {
      const normalized = troopAliases[normalizeLookupToken(troop)];
      if (!normalized) {
        throw new AiToolInputError('malformed_arguments', `Unsupported troop filter: ${troop}.`);
      }
      return normalized;
    });
  }
  if (filters.states !== undefined) {
    resultFilters.states = boundedStringArray(filters.states, 'filters.states', {
      minimum: 1,
      maximum: 2,
      item: { maximum: 10 },
    }).map((state) => {
      const token = normalizeLookupToken(state);
      if (token === 'free') return 'Free';
      if (token === 'paid') return 'Paid';
      throw new AiToolInputError(
        'malformed_arguments',
        `Unsupported acquisition filter: ${state}.`
      );
    });
  }
  if (filters.heroes !== undefined) {
    resultFilters.heroes = boundedStringArray(filters.heroes, 'filters.heroes', {
      minimum: 1,
      maximum: 3,
      item: { maximum: 80 },
    });
  }
  return resultFilters;
}

function comboMatchesFilters(combo, heroByName, filters) {
  const heroes = combo.heroes.map((name) => heroByName.get(name)).filter(Boolean);
  if (heroes.length !== 3) return false;
  if (filters.seasons && heroes.some((hero) => !filters.seasons.includes(hero.season)))
    return false;
  if (filters.troops && heroes.some((hero) => !filters.troops.includes(hero.Type))) return false;
  if (filters.states && heroes.some((hero) => !filters.states.includes(hero.State))) return false;
  if (filters.heroes && filters.heroes.some((name) => !combo.heroes.includes(name))) return false;
  return true;
}

function chooseNonOverlapping(rows, limit) {
  const used = new Set();
  const selected = [];
  for (const row of rows) {
    if (selected.length >= limit) break;
    if (row.combo.heroes.some((name) => used.has(name))) continue;
    selected.push(row);
    row.combo.heroes.forEach((name) => used.add(name));
  }
  return selected;
}

const SPENDING_PLANS = Object.freeze({
  small: Object.freeze({
    targetCombos: 1,
    targetDmSets: 1,
    guidance:
      'Build one excellent main formation and one complete Dragon Master set, then deepen that core before widening the roster.',
  }),
  medium: Object.freeze({
    targetCombos: 1,
    targetDmSets: 1,
    guidance:
      'Prioritize one excellent main formation and one complete Dragon Master set; expand only after the core is reliably advanced.',
  }),
  large: Object.freeze({
    targetCombos: 4,
    targetDmSets: 4,
    guidance:
      'Plan toward four buildable formations and four Dragon Master sets while protecting the quality of the primary formation.',
  }),
  ultra: Object.freeze({
    targetCombos: 5,
    targetDmSets: 5,
    guidance:
      'Plan toward five buildable formations and five Dragon Master sets, with enough depth to avoid spreading upgrades too thinly.',
  }),
});

function normalizeSpendTier(value) {
  if (value === undefined || value === null || value === '') return null;
  const tier = normalizeLookupToken(value);
  if (Object.hasOwn(SPENDING_PLANS, tier)) return tier;
  throw new AiToolInputError(
    'malformed_arguments',
    'spendTier must be small, medium, large, or ultra.'
  );
}

export async function getComboRecommendationsAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, [
    'filters',
    'mode',
    'useSelectedHeroes',
    'useExplicitSkins',
    'limit',
    'spendTier',
  ]);
  const filters = normalizeComboFilters(args.filters);
  const mode =
    args.mode === undefined ? 'ranked' : boundedString(args.mode, 'mode', { maximum: 24 });
  if (mode !== 'ranked' && mode !== 'non_overlap') {
    throw new AiToolInputError('malformed_arguments', 'mode must be ranked or non_overlap.');
  }
  const useSelectedHeroes = boolArgument(args.useSelectedHeroes, false);
  const useExplicitSkins = boolArgument(args.useExplicitSkins, false);
  const spendTier = normalizeSpendTier(args.spendTier);
  const limit =
    args.limit === undefined ? 5 : boundedInteger(args.limit, 'limit', { minimum: 1, maximum: 10 });

  const [{ rankedCombos, filterCombosForSkinMode, getComboSkinRequirements }, { allHeroesData }] =
    await Promise.all([import('../combos-db.js'), import('../heroes-data.js')]);
  const heroNames = new Set(allHeroesData.map((hero) => hero.name));
  const heroByName = new Map(allHeroesData.map((hero) => [hero.name, hero]));
  const resolveHero = createHeroResolver(allHeroesData);
  const requestedHeroFilters = filters.heroes || [];
  const resolvedHeroFilters = requestedHeroFilters.map((name) => ({
    requested: name,
    canonical: resolveHero(name),
  }));
  const unresolvedHeroFilters = resolvedHeroFilters
    .filter(({ canonical }) => !canonical)
    .map(({ requested }) => requested);
  if (requestedHeroFilters.length) {
    filters.heroes = [
      ...new Set(resolvedHeroFilters.map(({ canonical }) => canonical).filter(Boolean)),
    ];
  }
  let selectedState = null;
  let skinState = null;

  if (useSelectedHeroes) {
    selectedState = readSelectedHeroState({
      storage: context.storage,
      runtimeState: context.runtimeState,
      validHeroNames: heroNames,
    });
    requireSavedState(selectedState, 'selected heroes', {
      id: 'open_generator',
      hash: '#generator',
    });
  }
  if (useExplicitSkins) {
    skinState = readExplicitSkinOwnershipState({
      storage: context.storage,
      validHeroNames: heroNames,
    });
    requireSavedState(skinState, 'skin ownership', { id: 'open_generator', hash: '#generator' });
  }

  const ownsSkin = (heroName) => getExplicitSkinOwnership(skinState, heroName) === 'owned';
  const selectedHeroes = new Set(selectedState?.heroes || []);
  const filteredForSkinMode = filterCombosForSkinMode(
    rankedCombos,
    useExplicitSkins,
    useExplicitSkins ? ownsSkin : undefined
  );
  const warnings = [];
  if (unresolvedHeroFilters.length) {
    warnings.push(
      `No canonical hero data was found for: ${unresolvedHeroFilters.join(', ')}; no formations were inferred.`
    );
  }
  const seen = new Set();
  let rows = filteredForSkinMode
    .map((combo) => ({ combo, originalRank: rankedCombos.indexOf(combo) + 1 }))
    .filter(({ combo }) => {
      if (unresolvedHeroFilters.length) return false;
      if (!Array.isArray(combo.heroes) || combo.heroes.length !== 3) return false;
      const key = combo.heroes.join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return comboMatchesFilters(combo, heroByName, filters);
    })
    .filter(
      ({ combo }) => !useSelectedHeroes || combo.heroes.every((name) => selectedHeroes.has(name))
    );

  if (mode === 'non_overlap') rows = chooseNonOverlapping(rows, limit);
  else rows = rows.slice(0, limit);

  const combos = rows.map(({ combo, originalRank }) => {
    const skinRequirements = getComboSkinRequirements(combo).map((requirement) => ({
      ...requirement,
      ownership: useExplicitSkins
        ? getExplicitSkinOwnership(skinState, requirement.hero)
        : 'not_shared',
    }));
    if (
      useExplicitSkins &&
      skinRequirements.some(
        (requirement) =>
          requirement.requirement !== 'optional' && requirement.ownership === 'unknown'
      )
    ) {
      warnings.push(
        'Some skin ownership is unknown; catalog availability was not treated as ownership.'
      );
    }
    const formation = orderedFormation(combo.heroes);
    return {
      ...formation,
      rank: originalRank,
      rankMeaning: 'app_list_position',
      note: typeof combo.note === 'string' ? combo.note.slice(0, 360) : null,
      skinRequirements,
      buildability: {
        selectedHeroes: useSelectedHeroes ? 'buildable' : 'not_checked',
        explicitSkins: useExplicitSkins ? 'buildable' : 'not_checked',
        missingHeroes: useSelectedHeroes
          ? combo.heroes.filter((name) => !selectedHeroes.has(name))
          : [],
      },
    };
  });

  if (useSelectedHeroes && !combos.length) {
    warnings.push('No ranked formation matches all explicitly selected heroes and filters.');
  }
  return result(
    {
      mode,
      combos,
      matchCount: rows.length,
      selectedHeroCount: useSelectedHeroes ? selectedHeroes.size : null,
      acquisitionConstraint:
        filters.states?.length === 1
          ? filters.states[0]
          : filters.states?.length
            ? 'mixed'
            : 'none',
      spendingPlan: spendTier ? { tier: spendTier, ...SPENDING_PLANS[spendTier] } : null,
      rankDisclaimer: 'Rank is the lineup position in the app list, not a win probability.',
    },
    'combos-db',
    {
      filters: { ...filters, mode, useSelectedHeroes, useExplicitSkins, spendTier, limit },
      completeness: warnings.length ? 'partial' : 'complete',
      warnings: [...new Set(warnings)],
    }
  );
}

export async function getComboCountersAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['targetHeroes', 'ownedOnly']);
  const targetHeroes = boundedStringArray(args.targetHeroes, 'targetHeroes', {
    minimum: 3,
    maximum: 3,
    item: { maximum: 80 },
  });
  const ownedOnly = boolArgument(args.ownedOnly, false);
  const [{ allHeroesData }, { getCountersForCombo }] = await Promise.all([
    import('../heroes-data.js'),
    import('../counter-db.js'),
  ]);
  const resolveHero = createHeroResolver(allHeroesData);
  const canonicalTarget = targetHeroes.map(resolveHero);
  if (canonicalTarget.some((name) => !name) || new Set(canonicalTarget).size !== 3) {
    throw new AiToolInputError(
      'malformed_arguments',
      'targetHeroes must resolve to three distinct canonical heroes.'
    );
  }

  const exactCounters = getCountersForCombo(canonicalTarget);
  let selectedState = null;
  let selectedHeroes = null;
  if (ownedOnly) {
    const validHeroNames = new Set(allHeroesData.map((hero) => hero.name));
    selectedState = readSelectedHeroState({
      storage: context.storage,
      runtimeState: context.runtimeState,
      validHeroNames,
    });
    requireSavedState(selectedState, 'selected heroes', {
      id: 'open_generator',
      hash: '#generator',
    });
    selectedHeroes = new Set(selectedState.heroes);
  }
  const counters = exactCounters
    .filter((counter) => !ownedOnly || counter.heroes.every((name) => selectedHeroes.has(name)))
    .map((counter) => ({
      ...orderedFormation(counter.heroes),
      reason: counter.reason,
      confidence: counter.confidence,
    }));
  const warnings = [];
  if (!exactCounters.length) {
    warnings.push('No exact three-hero counter evidence is recorded for this target.');
  } else if (ownedOnly && !counters.length) {
    warnings.push('Exact counter evidence exists, but none uses only the selected heroes.');
  }
  return result(
    {
      target: orderedFormation(canonicalTarget),
      exactMatchFound: exactCounters.length > 0,
      counters,
      generalAlternativesIncluded: false,
    },
    'counter-db',
    {
      filters: { targetHeroes: canonicalTarget, ownedOnly },
      completeness: exactCounters.length ? 'complete' : 'unknown',
      warnings,
    }
  );
}

const STRIFE_RELEASE_ORDER = Object.freeze(['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2']);

function releaseIndex(value) {
  return STRIFE_RELEASE_ORDER.indexOf(String(value || '').toUpperCase());
}

function heroAvailableAtStage(hero, stage) {
  const heroIndex = releaseIndex(hero?.releaseSeason || hero?.season);
  return heroIndex >= 0 && heroIndex <= releaseIndex(stage);
}

function manualStrifeRows(rows, stage, tier, heroByName) {
  const stageIndex = releaseIndex(stage);
  return rows.filter((entry) => {
    if (!Array.isArray(entry?.heroes) || entry.heroes.length !== 3) return false;
    if (String(entry.tier || 'f2p').toLowerCase() !== tier) return false;
    const start = releaseIndex(entry.stage || 'S0');
    const end = entry.maxStage ? releaseIndex(entry.maxStage) : STRIFE_RELEASE_ORDER.length - 1;
    if (start < 0 || start > stageIndex || stageIndex > end) return false;
    return entry.heroes.every((name) => heroAvailableAtStage(heroByName.get(name), stage));
  });
}

function paidFormation(heroes, heroByName) {
  return heroes.some((name) => heroByName.get(name)?.State === 'Paid');
}

export async function getStrifeRecommendationsAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['monster', 'season', 'tier', 'ownedOnly']);
  const monsterInput = boundedString(args.monster, 'monster', { maximum: 80 });
  const season = boundedString(args.season, 'season', { maximum: 4 }).toUpperCase();
  if (!STRIFE_RELEASE_ORDER.includes(season)) {
    throw new AiToolInputError(
      'unsupported_data',
      'Strife recommendations are supported only from S0 through X2.'
    );
  }
  const tier = args.tier === undefined ? 'all' : normalizeLookupToken(args.tier);
  if (!['all', 'f2p', 'p2w'].includes(tier)) {
    throw new AiToolInputError('malformed_arguments', 'tier must be all, f2p, or p2w.');
  }
  const ownedOnly = boolArgument(args.ownedOnly, false);
  const [{ STRIFE_MONSTERS, STRIFE_MONSTER_COMBOS }, { allHeroesData }, combosModule] =
    await Promise.all([
      import('../strife-db.js'),
      import('../heroes-data.js'),
      import('../combos-db.js'),
    ]);
  const monster = STRIFE_MONSTERS.find(
    (entry) =>
      normalizeLookupToken(entry.id) === normalizeLookupToken(monsterInput) ||
      normalizeLookupToken(entry.name) === normalizeLookupToken(monsterInput)
  );
  if (!monster) throw new AiToolInputError('malformed_arguments', 'Unknown Strife monster.');
  const heroByName = new Map(allHeroesData.map((hero) => [hero.name, hero]));
  let selectedHeroes = null;
  if (ownedOnly) {
    const selectedState = readSelectedHeroState({
      storage: context.storage,
      runtimeState: context.runtimeState,
      validHeroNames: new Set(heroByName.keys()),
    });
    requireSavedState(selectedState, 'selected heroes', {
      id: 'open_generator',
      hash: '#generator',
    });
    selectedHeroes = new Set(selectedState.heroes);
  }

  const wantedTiers = tier === 'all' ? ['f2p', 'p2w'] : [tier];
  const sourceRows = STRIFE_MONSTER_COMBOS[monster.id] || [];
  const formations = [];
  for (const wantedTier of wantedTiers) {
    const manual = manualStrifeRows(sourceRows, season, wantedTier, heroByName);
    const candidates = manual.length
      ? manual.map((entry, index) => ({
          heroes: entry.heroes,
          note: entry.note || null,
          rank: index + 1,
          source: 'verified_strife_row',
        }))
      : combosModule.baseRankedCombos
          .filter((combo) =>
            combo.heroes.every((name) => heroAvailableAtStage(heroByName.get(name), season))
          )
          .filter((combo) =>
            wantedTier === 'p2w'
              ? paidFormation(combo.heroes, heroByName)
              : !paidFormation(combo.heroes, heroByName)
          )
          .slice(0, 6)
          .map((combo) => ({
            heroes: combo.heroes,
            note: null,
            rank: combosModule.baseRankedCombos.indexOf(combo) + 1,
            source: 'general_ranked_fallback',
          }));
    candidates
      .filter(
        (entry) => !ownedOnly || entry.heroes.every((heroName) => selectedHeroes.has(heroName))
      )
      .slice(0, 6)
      .forEach((entry) => {
        formations.push({
          ...orderedFormation(entry.heroes),
          tier: wantedTier,
          source: entry.source,
          rank: entry.rank,
          rankMeaning:
            entry.source === 'verified_strife_row' ? 'strife_row_position' : 'app_list_position',
          note: entry.note,
        });
      });
  }

  const warnings = [];
  if (formations.some((formation) => formation.source === 'general_ranked_fallback')) {
    warnings.push(
      'Some formations are general ranked fallbacks because no verified monster row matched the selected tier.'
    );
  }
  if (ownedOnly && !formations.length) {
    warnings.push('No supported Strife formation uses only the selected heroes.');
  }
  return result(
    {
      monster: {
        id: monster.id,
        name: monster.name,
        skills: (monster.skills || []).map((skill) => ({
          name: skill.name,
          timing: skill.timing,
          target: skill.target,
          effect: skill.effect,
          answer: skill.answer,
          tags: Array.isArray(skill.tags) ? skill.tags.slice(0, 6) : [],
        })),
        guideNotes: Array.isArray(monster.guideNotes) ? monster.guideNotes.slice(0, 6) : [],
      },
      season,
      supportedThrough: 'X2',
      formations,
    },
    'strife-db',
    {
      filters: { monster: monster.id, season, tier, ownedOnly },
      completeness: warnings.length ? 'partial' : 'complete',
      warnings,
    }
  );
}
