const stringArray = (description, maxItems = 20) => ({
  type: 'array',
  description,
  items: { type: 'string', minLength: 1, maxLength: 80 },
  minItems: 1,
  maxItems,
});

export const TOOL_DECLARATIONS = Object.freeze([
  {
    type: 'function',
    name: 'get_admin_context',
    description:
      'Read a bounded private admin dashboard summary or exact roster lookup. Available only with explicit admin-data consent and a server-verified Firebase admin claim. Never request credentials, raw ballots, voter identities, or unrelated private data.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['summary', 'roster_lookup'] },
        names: stringArray('Exact private roster names to verify.', 12),
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_hero_details',
    description:
      'Read canonical hero placement, troop, season, available skills and catalog skins. Completeness metadata must be respected.',
    parameters: {
      type: 'object',
      properties: { names: stringArray('Canonical or user-entered hero names.') },
      required: ['names'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_vts_player_context',
    description:
      'Read public VTS 1097 leadership/player labels already published by the app. Use for player questions such as Abo or MalakAbo; this is not a private roster or Eden ballot lookup.',
    parameters: {
      type: 'object',
      properties: { names: stringArray('Public player names or known nicknames.', 20) },
      required: ['names'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_vts_guide_context',
    description:
      'Search curated public VTS guide knowledge for reusable strategy, terminology, and policy context. Results distinguish the gameplay phase from a later target season, are dated, and may require current leadership confirmation. Do not use this tool for private chat history, current war orders, raw ballots, or personal records.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 120 },
        season: { type: 'string', minLength: 1, maxLength: 20 },
        limit: { type: 'integer', minimum: 1, maximum: 5 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_combo_recommendations',
    description:
      'Read ranked Front/Middle/Back combo recommendations. For formations containing a named hero such as Mary Tudor, pass that hero in filters.heroes. Use filters.states for Free/Paid acquisition constraints and spendTier for roster-width guidance. Set useSelectedHeroes=true only when the user asks to analyze heroes selected in the Combo Generator. Rank is app-list order, never a win probability.',
    parameters: {
      type: 'object',
      properties: {
        filters: {
          type: 'object',
          properties: {
            seasons: stringArray('Allowed seasons.', 12),
            troops: stringArray('Allowed troop types.', 4),
            heroes: stringArray(
              'Canonical or user-entered heroes that every result must include.',
              3
            ),
            states: stringArray('Allowed acquisition categories: Free or Paid.', 2),
          },
          additionalProperties: false,
        },
        mode: {
          type: 'string',
          enum: ['ranked', 'non_overlap'],
        },
        useSelectedHeroes: { type: 'boolean' },
        useExplicitSkins: { type: 'boolean' },
        spendTier: { type: 'string', enum: ['small', 'medium', 'large', 'ultra'] },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_combo_counters',
    description:
      'Read exact three-hero counter evidence. If there is no exact record, report that before offering general alternatives.',
    parameters: {
      type: 'object',
      properties: {
        targetHeroes: stringArray('Exactly three heroes in Front/Middle/Back order.', 3),
        ownedOnly: { type: 'boolean' },
      },
      required: ['targetHeroes', 'ownedOnly'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_strife_recommendations',
    description: 'Read supported Strife monster skills and lineups. Coverage ends at X2.',
    parameters: {
      type: 'object',
      properties: {
        monster: { type: 'string', minLength: 1, maxLength: 100 },
        season: { type: 'string', minLength: 1, maxLength: 12 },
        tier: { type: 'string', minLength: 1, maxLength: 30 },
        ownedOnly: { type: 'boolean' },
      },
      required: ['monster', 'season', 'tier', 'ownedOnly'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_material_plan_summary',
    description:
      'Read the explicitly allowed saved Dragon Master plan. Returns separate campaign set-grid progress and owned-piece inventory math: an incomplete campaign set is only a row with missing pieces, not a whole set still owed; use inventory remaining pieces, exact resource need, and stockpile shortfall for saved-inventory calculations.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    type: 'function',
    name: 'calculate_dm_materials',
    description:
      'Calculate exact Dragon Master resources and diamond/gem cost from an explicit blue, purple, or gold route. Set normalGearOwned=true when the user already crafted all required normal troop gear of that color. This uses static app data and needs no personal-data permission.',
    parameters: {
      type: 'object',
      properties: {
        route: { type: 'string', enum: ['blue', 'purple', 'gold'] },
        sets: { type: 'integer', minimum: 1, maximum: 5 },
        pieces: { type: 'integer', minimum: 1, maximum: 30 },
        normalGearOwned: { type: 'boolean' },
      },
      required: ['route', 'normalGearOwned'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_research_context',
    description:
      'Read research catalog context and, only when allowed, the user\'s saved app progress. For the user\'s current, saved, completed, or remaining status, call mode="catalog" with includeUserProgress=true; this returns a compact overall percentage, maxed/not-maxed trees, and priority unfinished nodes instead of the full catalog. Missing cost coverage must be reported.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['catalog', 'details', 'priorities'] },
        treeIds: stringArray('Research tree identifiers.', 12),
        troop: { type: 'string', enum: ['footmen', 'cavalry', 'archers', 'mixed'] },
        includeUserProgress: { type: 'boolean' },
      },
      required: ['mode', 'includeUserProgress'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'estimate_research_eta',
    description:
      'Estimate research completion time from explicit daily War Badge and Courage Medal income. Never infer income from progress.',
    parameters: {
      type: 'object',
      properties: {
        dailyWarBadges: { type: 'number', minimum: 0, maximum: 1_000_000_000 },
        dailyCourageMedals: { type: 'number', minimum: 0, maximum: 1_000_000_000 },
      },
      required: ['dailyWarBadges', 'dailyCourageMedals'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'calculate_eden_loyalty',
    description:
      'Calculate Eden loyalty and extraction-site thresholds from four Alliance Center levels. Set includeUpgradePlan=true only when the user also supplied production and processing values.',
    parameters: {
      type: 'object',
      properties: {
        acLevels: {
          type: 'array',
          items: { type: 'integer', minimum: 0, maximum: 20 },
          minItems: 4,
          maxItems: 4,
        },
        bonusPoints: { type: 'number', minimum: 0 },
        savedUnits: { type: 'number', minimum: 0 },
        campHourlyProduction: { type: 'number', minimum: 0 },
        processingTimeHours: { type: 'number', minimum: 0 },
        unitsPerPatch: { type: 'number', minimum: 0 },
        numPatches: { type: 'integer', minimum: 0 },
        includeUpgradePlan: { type: 'boolean' },
      },
      required: ['acLevels'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'calculate_eden_upgrade_materials',
    description:
      'Use exact app tables to return a T1-T16 loyalty requirement, calculate materials for one AC1-AC4 level range, or find the cheapest Alliance Center material path from four current levels to a target tile. This static tool needs no personal-data permission.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['site_requirement', 'site_materials', 'building_materials'],
        },
        targetSite: {
          type: 'string',
          enum: [
            'T1',
            'T2',
            'T3',
            'T4',
            'T5',
            'T6',
            'T7',
            'T8',
            'T9',
            'T10',
            'T11',
            'T12',
            'T13',
            'T14',
            'T15',
            'T16',
          ],
        },
        acLevels: {
          type: 'array',
          items: { type: 'integer', minimum: 0, maximum: 20 },
          minItems: 4,
          maxItems: 4,
        },
        bonusPoints: { type: 'number', minimum: 0 },
        savedUnits: { type: 'number', minimum: 0 },
        building: { type: 'string', enum: ['AC1', 'AC2', 'AC3', 'AC4'] },
        currentLevel: { type: 'integer', minimum: 0, maximum: 20 },
        targetLevel: { type: 'integer', minimum: 0, maximum: 20 },
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_eden_context',
    description:
      'Read public Eden X1 guide, scoring logic, current leaderboard, player breakdown, reward flow, voting state, or published aggregate results. Public player names are allowed; never request raw ballots, voter identities, private notes, or the private roster.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: [
            'overview',
            'guide',
            'scoring_rules',
            'rankings',
            'player',
            'rewards',
            'voting',
            'saved_ballot_status',
            'published_status',
          ],
        },
        season: { type: 'string', enum: ['X1'] },
        playerName: { type: 'string', minLength: 1, maxLength: 100 },
        offset: { type: 'integer', minimum: 0, maximum: 1000 },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      required: ['kind', 'season'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_toolkit_map',
    description:
      'List the VTS 1097 toolkit tabs and standalone pages with what each one does, which questions it answers, and its deep link. Use this to explain the app or to route the user to the right tool when a request is outside chat evidence.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 120 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_whats_new',
    description:
      'Read the recent toolkit release notes and current app version. Use this for "what changed", "what is new", or when a feature was added.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_specialization_context',
    description:
      'Read canonical Specialization Towers data. kind=overview lists all eight columns; kind=column details one column; kind=research details one research including nodes, per-node upgradeCount (base-attribute nodes take 2 upgrades) and milestones; kind=route returns the recommended funding order for a troop (troop=archer|cavalry|footman, routeId=spender for owners of Ramses II/Boudica or f2p otherwise). Unknown medal values stay unknown and must never be estimated.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['overview', 'column', 'research', 'route'] },
        columnId: { type: 'integer', minimum: 1, maximum: 8 },
        researchName: { type: 'string', minLength: 1, maxLength: 80 },
        troop: { type: 'string', enum: ['archer', 'cavalry', 'footman'] },
        routeId: { type: 'string', enum: ['spender', 'f2p'] },
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_skin_tier_details',
    description:
      'Read the three hero-skin tiers (Mythic, Legendary, Everlasting) with Star 1 activation, star-up costs, maximize totals, and acquisition paths including Premium-shop perfect-crystal exchange.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_arcade_leaderboard',
    description:
      'Read the public Arcade leaderboard: kind=overall ranks players by summed personal-best scores across all five mini-games, kind=per_game returns one mini-game ranking. Leaderboard rows are public aggregate data; never claim they show private rosters.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['overall', 'per_game'] },
        gameId: {
          type: 'string',
          enum: ['merge_rush', 'sort_hoard', 'crystal_relay', 'set_assembly', 'hero_rumble'],
        },
        topN: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_all_star_boh_mechanics',
    description:
      'Read the public All-Star BoH mechanics: kind=overview returns team size and count, fighting time slots (+12/+14/+16), entry methods, default role groups, battle phases, legions, and the signup window state; kind=scoring returns the 2025 scoring formula weights. Use for "how does BoH work", "what are the BoH phases", or "how is BoH scored". Never request signup contents, rosters, or access status.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['overview', 'scoring'] },
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_vts_score_mechanics',
    description:
      'Read the public VtsScore scoring mechanics: the power fields used for final score upload, how a score is computed and reviewed, and the tier bands. Use for "how does VtsScore work", "which power fields matter", or "what do the score tiers mean". It never returns any player\'s scores or signup data.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_competition_status',
    description:
      'Read the published Competition #12 (VtsScore pre-season prep) schedule: the phase now, the next deadline, each phase\'s open and close times in game time (UTC-2) and in the viewer\'s local time, and the BoH and Epic Showdown time-slot catalogs. Use for "when does registration/re-upload close", "what phase is Competition #12 in", or which slots exist. If no schedule is published, say so instead of guessing dates.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    type: 'function',
    name: 'get_building_costs',
    description:
      "Read the Buildings planner data from the community Google Sheet: kind=castle returns Castle 26-30 per-level resource costs (orichalcum, gold, food, lumber, charcoal, marble, iron) with prerequisites; kind=building returns one building's 26-30 Orichalcum costs, prerequisites and last-level bonus; kind=list returns every building's Orichalcum total. A null value is an unknown source cell: report it as unknown and never estimate it.",
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['castle', 'building', 'list'] },
        building: { type: 'string', minLength: 1, maxLength: 60 },
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_eden_operations',
    description:
      "Read Eden operations planning data. kind=pathing_rule returns the confirmed pathing rule (40 tiles per pather, one pather per started block, so pathers = ceil(tiles / 40)) and, when tiles is given, the pathers needed. kind=staffing returns the Operations Lab objectives with required attackers and support and the alliance's shared assigned counters; filter with structure (e.g. gate-3, city-2, capital-6, temple-7, stronghold) and banner. When the counters cannot be read, assigned counts are unknown, not zero.",
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['pathing_rule', 'staffing'] },
        tiles: { type: 'integer', minimum: 0, maximum: 100000 },
        structure: { type: 'string', minLength: 1, maxLength: 32 },
        banner: { type: 'boolean' },
      },
      required: ['kind'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_my_competition',
    description:
      "Read the signed-in member's OWN Competition #12 registration, only with personal:my_competition consent: whether they registered, which power fields are filled, ROC level, chosen BoH and Epic active times, public-comparison consent, and their own baseline source and growth once the growth board is published. When signedIn is false, tell them to sign in (unlock VtsScore with their member PIN on that page) to see their registration. Never ask for the PIN and never discuss another member's private values.",
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
]);

export const TOOL_NAMES = Object.freeze(TOOL_DECLARATIONS.map(({ name }) => name));
const TOOL_NAME_SET = new Set(TOOL_NAMES);

export function isKnownToolName(name) {
  return typeof name === 'string' && TOOL_NAME_SET.has(name);
}

export function validateToolPermission(name, args, allowedGroups) {
  const groups = new Set(allowedGroups);
  if (!groups.has('static')) return false;

  if (name === 'get_admin_context') return groups.has('private:admin_dashboard');
  if (name === 'get_my_competition') return groups.has('personal:my_competition');

  if (name === 'get_material_plan_summary') return groups.has('personal:dm_plan');
  if (name === 'get_combo_recommendations') {
    if (args.useSelectedHeroes && !groups.has('personal:selected_heroes')) return false;
    if (args.useExplicitSkins && !groups.has('personal:explicit_skins')) return false;
  }
  if (
    (name === 'get_combo_counters' || name === 'get_strife_recommendations') &&
    args.ownedOnly &&
    !groups.has('personal:selected_heroes')
  ) {
    return false;
  }
  if (
    name === 'get_research_context' &&
    args.includeUserProgress &&
    !groups.has('personal:research_progress')
  ) {
    return false;
  }
  return true;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value, keys) {
  return isRecord(value) && Object.keys(value).every((key) => keys.includes(key));
}

function strings(value, min, max) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 100)
  );
}

export function validateToolArguments(name, args) {
  if (!isKnownToolName(name) || !isRecord(args)) return false;
  if (name === 'get_admin_context') {
    return (
      hasOnlyKeys(args, ['kind', 'names']) &&
      ['summary', 'roster_lookup'].includes(args.kind) &&
      (args.names === undefined || strings(args.names, 1, 12)) &&
      (args.kind !== 'roster_lookup' || strings(args.names, 1, 12))
    );
  }
  if (name === 'get_hero_details') {
    return hasOnlyKeys(args, ['names']) && strings(args.names, 1, 20);
  }
  if (name === 'get_vts_player_context') {
    return hasOnlyKeys(args, ['names']) && strings(args.names, 1, 20);
  }
  if (name === 'get_vts_guide_context') {
    return (
      hasOnlyKeys(args, ['query', 'season', 'limit']) &&
      typeof args.query === 'string' &&
      args.query.length > 0 &&
      args.query.length <= 120 &&
      (args.season === undefined ||
        (typeof args.season === 'string' && args.season.length > 0 && args.season.length <= 20)) &&
      (args.limit === undefined ||
        (Number.isInteger(args.limit) && args.limit >= 1 && args.limit <= 5))
    );
  }
  if (name === 'get_combo_recommendations') {
    if (
      !hasOnlyKeys(args, [
        'filters',
        'mode',
        'useSelectedHeroes',
        'useExplicitSkins',
        'spendTier',
        'limit',
      ]) ||
      (args.mode !== undefined && !['ranked', 'non_overlap'].includes(args.mode)) ||
      (args.useSelectedHeroes !== undefined && typeof args.useSelectedHeroes !== 'boolean') ||
      (args.useExplicitSkins !== undefined && typeof args.useExplicitSkins !== 'boolean') ||
      (args.spendTier !== undefined &&
        !['small', 'medium', 'large', 'ultra'].includes(args.spendTier)) ||
      (args.limit !== undefined &&
        (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 10))
    ) {
      return false;
    }
    if (args.filters === undefined) return true;
    if (!hasOnlyKeys(args.filters, ['seasons', 'troops', 'heroes', 'states'])) return false;
    if (
      args.filters.states !== undefined &&
      (!strings(args.filters.states, 1, 2) ||
        args.filters.states.some((state) => !['Free', 'Paid'].includes(state)))
    ) {
      return false;
    }
    return ['seasons', 'troops', 'heroes'].every(
      (key) =>
        args.filters[key] === undefined ||
        strings(args.filters[key], 1, key === 'troops' ? 4 : key === 'heroes' ? 3 : 12)
    );
  }
  if (name === 'get_combo_counters') {
    return (
      hasOnlyKeys(args, ['targetHeroes', 'ownedOnly']) &&
      strings(args.targetHeroes, 3, 3) &&
      typeof args.ownedOnly === 'boolean'
    );
  }
  if (name === 'get_strife_recommendations') {
    return (
      hasOnlyKeys(args, ['monster', 'season', 'tier', 'ownedOnly']) &&
      typeof args.monster === 'string' &&
      Boolean(args.monster) &&
      typeof args.season === 'string' &&
      Boolean(args.season) &&
      typeof args.tier === 'string' &&
      Boolean(args.tier) &&
      typeof args.ownedOnly === 'boolean'
    );
  }
  if (name === 'get_material_plan_summary') return hasOnlyKeys(args, []);
  if (name === 'calculate_dm_materials') {
    return (
      hasOnlyKeys(args, ['route', 'sets', 'pieces', 'normalGearOwned']) &&
      ['blue', 'purple', 'gold'].includes(args.route) &&
      typeof args.normalGearOwned === 'boolean' &&
      (args.sets === undefined ||
        (Number.isInteger(args.sets) && args.sets >= 1 && args.sets <= 5)) &&
      (args.pieces === undefined ||
        (Number.isInteger(args.pieces) && args.pieces >= 1 && args.pieces <= 30))
    );
  }
  if (name === 'get_research_context') {
    return (
      hasOnlyKeys(args, ['mode', 'treeIds', 'troop', 'includeUserProgress']) &&
      ['catalog', 'details', 'priorities'].includes(args.mode) &&
      (args.treeIds === undefined || strings(args.treeIds, 1, 12)) &&
      (args.troop === undefined ||
        ['footmen', 'cavalry', 'archers', 'mixed'].includes(args.troop)) &&
      typeof args.includeUserProgress === 'boolean'
    );
  }
  if (name === 'estimate_research_eta') {
    return (
      hasOnlyKeys(args, ['dailyWarBadges', 'dailyCourageMedals']) &&
      Number.isFinite(args.dailyWarBadges) &&
      args.dailyWarBadges >= 0 &&
      Number.isFinite(args.dailyCourageMedals) &&
      args.dailyCourageMedals >= 0 &&
      (args.dailyWarBadges > 0 || args.dailyCourageMedals > 0)
    );
  }
  if (name === 'calculate_eden_loyalty') {
    return (
      hasOnlyKeys(args, [
        'acLevels',
        'bonusPoints',
        'savedUnits',
        'campHourlyProduction',
        'processingTimeHours',
        'unitsPerPatch',
        'numPatches',
        'includeUpgradePlan',
      ]) &&
      Array.isArray(args.acLevels) &&
      args.acLevels.length === 4 &&
      args.acLevels.every((level) => Number.isInteger(level) && level >= 0 && level <= 20) &&
      [
        'bonusPoints',
        'savedUnits',
        'campHourlyProduction',
        'processingTimeHours',
        'unitsPerPatch',
      ].every((key) => args[key] === undefined || (Number.isFinite(args[key]) && args[key] >= 0)) &&
      (args.numPatches === undefined ||
        (Number.isInteger(args.numPatches) && args.numPatches >= 0)) &&
      (args.includeUpgradePlan === undefined || typeof args.includeUpgradePlan === 'boolean')
    );
  }
  if (name === 'calculate_eden_upgrade_materials') {
    if (
      !hasOnlyKeys(args, [
        'kind',
        'targetSite',
        'acLevels',
        'bonusPoints',
        'savedUnits',
        'building',
        'currentLevel',
        'targetLevel',
      ]) ||
      !['site_requirement', 'site_materials', 'building_materials'].includes(args.kind)
    ) {
      return false;
    }
    const validSite =
      typeof args.targetSite === 'string' && /^T(?:[1-9]|1[0-6])$/u.test(args.targetSite);
    if (args.kind === 'site_requirement') return validSite;
    if (args.kind === 'building_materials') {
      return (
        ['AC1', 'AC2', 'AC3', 'AC4'].includes(args.building) &&
        Number.isInteger(args.currentLevel) &&
        args.currentLevel >= 0 &&
        args.currentLevel <= 20 &&
        Number.isInteger(args.targetLevel) &&
        args.targetLevel >= args.currentLevel &&
        args.targetLevel <= 20
      );
    }
    return (
      validSite &&
      Array.isArray(args.acLevels) &&
      args.acLevels.length === 4 &&
      args.acLevels.every((level) => Number.isInteger(level) && level >= 0 && level <= 20) &&
      (args.bonusPoints === undefined ||
        (Number.isFinite(args.bonusPoints) && args.bonusPoints >= 0)) &&
      (args.savedUnits === undefined || (Number.isFinite(args.savedUnits) && args.savedUnits >= 0))
    );
  }
  if (name === 'get_eden_context') {
    return (
      hasOnlyKeys(args, ['kind', 'season', 'playerName', 'offset', 'limit']) &&
      [
        'overview',
        'guide',
        'scoring_rules',
        'rankings',
        'player',
        'rewards',
        'voting',
        'saved_ballot_status',
        'published_status',
      ].includes(args.kind) &&
      args.season === 'X1' &&
      (args.playerName === undefined ||
        (typeof args.playerName === 'string' &&
          args.playerName.length > 0 &&
          args.playerName.length <= 100)) &&
      (args.offset === undefined ||
        (Number.isInteger(args.offset) && args.offset >= 0 && args.offset <= 1000)) &&
      (args.limit === undefined ||
        (Number.isInteger(args.limit) && args.limit >= 1 && args.limit <= 25)) &&
      (args.kind !== 'player' || typeof args.playerName === 'string')
    );
  }
  if (name === 'get_toolkit_map') {
    return (
      hasOnlyKeys(args, ['query']) &&
      (args.query === undefined ||
        (typeof args.query === 'string' && args.query.length > 0 && args.query.length <= 120))
    );
  }
  if (name === 'get_whats_new') {
    return (
      hasOnlyKeys(args, ['limit']) &&
      (args.limit === undefined ||
        (Number.isInteger(args.limit) && args.limit >= 1 && args.limit <= 10))
    );
  }
  if (name === 'get_specialization_context') {
    if (
      !hasOnlyKeys(args, ['kind', 'columnId', 'researchName', 'troop', 'routeId']) ||
      !['overview', 'column', 'research', 'route'].includes(args.kind)
    ) {
      return false;
    }
    if (args.kind === 'column') {
      return Number.isInteger(args.columnId) && args.columnId >= 1 && args.columnId <= 8;
    }
    if (args.kind === 'research') {
      return (
        typeof args.researchName === 'string' &&
        args.researchName.length > 0 &&
        args.researchName.length <= 80
      );
    }
    if (args.kind === 'route') {
      return (
        (args.troop === undefined || ['archer', 'cavalry', 'footman'].includes(args.troop)) &&
        (args.routeId === undefined || ['spender', 'f2p'].includes(args.routeId)) &&
        args.columnId === undefined &&
        args.researchName === undefined
      );
    }
    return (
      args.columnId === undefined &&
      args.researchName === undefined &&
      args.troop === undefined &&
      args.routeId === undefined
    );
  }
  if (name === 'get_skin_tier_details') return hasOnlyKeys(args, []);
  if (name === 'get_arcade_leaderboard') {
    if (
      !hasOnlyKeys(args, ['kind', 'gameId', 'topN']) ||
      !['overall', 'per_game'].includes(args.kind)
    ) {
      return false;
    }
    if (args.kind === 'per_game') {
      if (
        !['merge_rush', 'sort_hoard', 'crystal_relay', 'set_assembly', 'hero_rumble'].includes(
          args.gameId
        )
      ) {
        return false;
      }
    } else if (args.gameId !== undefined) {
      return false;
    }
    return (
      args.topN === undefined || (Number.isInteger(args.topN) && args.topN >= 1 && args.topN <= 50)
    );
  }
  if (name === 'get_all_star_boh_mechanics') {
    return hasOnlyKeys(args, ['kind']) && ['overview', 'scoring'].includes(args.kind);
  }
  if (name === 'get_vts_score_mechanics') return hasOnlyKeys(args, []);
  if (name === 'get_competition_status') return hasOnlyKeys(args, []);
  if (name === 'get_my_competition') return hasOnlyKeys(args, []);
  if (name === 'get_building_costs') {
    if (!hasOnlyKeys(args, ['kind', 'building'])) return false;
    if (args.kind === 'building') {
      return (
        typeof args.building === 'string' && args.building.length > 0 && args.building.length <= 60
      );
    }
    return ['castle', 'list'].includes(args.kind) && args.building === undefined;
  }
  if (name === 'get_eden_operations') {
    if (!hasOnlyKeys(args, ['kind', 'tiles', 'structure', 'banner'])) return false;
    if (args.kind === 'pathing_rule') {
      return (
        args.structure === undefined &&
        args.banner === undefined &&
        (args.tiles === undefined ||
          (Number.isInteger(args.tiles) && args.tiles >= 0 && args.tiles <= 100_000))
      );
    }
    return (
      args.kind === 'staffing' &&
      args.tiles === undefined &&
      (args.structure === undefined ||
        (typeof args.structure === 'string' &&
          args.structure.length > 0 &&
          args.structure.length <= 32)) &&
      (args.banner === undefined || typeof args.banner === 'boolean')
    );
  }
  return false;
}
