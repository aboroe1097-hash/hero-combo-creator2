import { allHeroesData } from './heroes-data.js';
import { heroesExtendedData } from './heroes-info.js';

export const BATTLE_HERO_SKILL_ASSUMPTIONS = Object.freeze({
  sourceOfTruth: Object.freeze(['heroes-data.js', 'heroes-info.js']),
  failClosed: true,
  descriptionPolicy:
    'Descriptions are preserved verbatim. Only explicitly stated clauses are projected.',
  targetingPolicy:
    'Unknown targets stay unknown; a skill target is never inferred from its description.',
  activationPolicy:
    'Combat and active skill effects remain triggered effects and are never promoted to static buffs.',
  percentagePolicy:
    'Every percentage token is retained as a clause, including timing, chance, and conditions.',
});

export const MISSING_EXTENDED_HEROES = Object.freeze([
  'The Boneless',
  'Demon Spear',
  'Kublai',
  'The Heroine',
  'Queen Anne',
  "North's Rage",
  'William Wallace',
  'Yukimura Sanada',
  "Heaven's Justice",
  'William the Conqueror',
  'Healer',
  'Hellfire',
  'Belisarius',
  'Pepin',
  'El Cid',
  'Arslan',
  'Farah',
  'Poison Master',
  'Lilith',
]);

const PLACEMENT_ALIASES = Object.freeze({
  'front row': ['front'],
  'middle row': ['middle'],
  'mid row': ['middle'],
  'back row': ['back'],
  'front row / middle row': ['front', 'middle'],
  'middle row / back row': ['middle', 'back'],
  'mid / back row': ['middle', 'back'],
  'any row': ['front', 'middle', 'back'],
  any: ['front', 'middle', 'back'],
});

const SKILL_TYPE_ALIASES = Object.freeze({
  'additional attack': 'additional-attack',
  'status skill': 'status',
  'combat skill': 'combat',
  'pre-battle skills': 'pre-battle',
  'leadership skill': 'leadership',
  'active skill': 'active',
});

const STATUS_NAMES = Object.freeze([
  'armor break',
  'bleeding',
  'burning',
  'clarity',
  'confuse',
  'confusion',
  'counter-attack',
  'counterattack',
  'disarm',
  'disarmed',
  'dodging',
  'evasion',
  'fatal blow',
  'first-aid',
  'flammable',
  'immune',
  'silence',
  'sober',
  'suppress',
  'suppression',
  'taunt',
  'vulnerable',
]);

const STAT_PATTERNS = Object.freeze([
  ['might', /\bmight\b/iu],
  ['resistance', /\bresistance\b/iu],
  ['hp', /\b(?:hp|health|troop power)\b/iu],
  ['combat-speed', /\bcombat speed\b/iu],
  ['skill-damage', /\bskill damage\b/iu],
  ['normal-attack-damage', /\b(?:normal|basic) attack damage\b/iu],
  ['damage', /\bdamage\b/iu],
]);

function freezeArray(values) {
  return Object.freeze(values.map((value) => Object.freeze(value)));
}

export function createHeroSkillId(heroName, skillId) {
  return `${String(heroName).trim()}:${String(skillId).trim()}`;
}

export function normalizeHeroPlacement(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const rows = PLACEMENT_ALIASES[raw.toLowerCase()] || [];
  return Object.freeze({
    raw: value ?? null,
    rows: Object.freeze([...rows]),
    known: rows.length > 0,
  });
}

export function normalizeHeroTroopType(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const normalized = {
    cavalry: 'cavalry',
    footmen: 'footmen',
    archers: 'archers',
    all: 'all',
  }[raw.toLowerCase()];
  return Object.freeze({
    raw: value ?? null,
    value: normalized || null,
    known: Boolean(normalized),
  });
}

export function normalizeHeroSkillType(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const normalized = SKILL_TYPE_ALIASES[raw.toLowerCase()];
  return Object.freeze({
    raw: value ?? null,
    value: normalized || null,
    known: Boolean(normalized),
  });
}

export function normalizeHeroSkillTarget(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const lower = raw.toLowerCase();
  const countMatch = lower.match(/^(\d+)\b/u);
  const heroSelf = /^hero(?:'s)? (?:squad|legion)$/iu.test(raw);
  const hasEnemy = /\benem(?:y|ies)\b/iu.test(raw);
  const hasAlly = /\bally\b|\bfriendly\b/iu.test(raw) || heroSelf;
  const side = hasEnemy && hasAlly ? 'mixed' : hasEnemy ? 'enemy' : hasAlly ? 'ally' : null;
  const count = countMatch ? Number(countMatch[1]) : heroSelf ? 1 : null;
  const selection = heroSelf ? 'self' : /\brandom\b/iu.test(raw) ? 'random' : null;
  return Object.freeze({
    raw: value ?? null,
    count,
    side,
    selection,
    known: side !== null && count !== null,
  });
}

function splitClauses(description) {
  return description
    .split(/(?<=[.;])\s+|;\s*/u)
    .map((text) => text.trim())
    .filter(Boolean);
}

function activationFor(skillType) {
  if (skillType === 'combat' || skillType === 'active') return 'triggered';
  if (skillType === 'pre-battle') return 'pre-battle';
  if (skillType === 'additional-attack') return 'conditional';
  return 'passive';
}

function classifyPercentage(text, start, end) {
  const before = text.slice(Math.max(0, start - 55), start).toLowerCase();
  const after = text.slice(end, Math.min(text.length, end + 55)).toLowerCase();
  const context = `${before} ${after}`;
  if (/^\s*(?:more\s+)?chance\b/u.test(after) || /\bchance(?:\s+of)?\s*$/u.test(before)) {
    return 'chance';
  }
  if (
    /\b(?:recovery rate|heal(?:ing)? rate)\s*:?\s*$/u.test(before) ||
    /^\s*(?:of\s+the\s+damage\s+will\s+be\s+used\s+to\s+)?(?:recover|restore|heal)\b/u.test(after)
  ) {
    return 'healing';
  }
  if (
    /\b(?:might|resistance|hp|health|combat speed|evasion|defen[cs]e)(?:\s+and\s+(?:might|resistance|hp|health|combat speed|evasion|defen[cs]e))*\s+(?:by\s+)?$/u.test(
      before
    ) ||
    /^\s*(?:increased\s+)?(?:might|resistance|hp|health|combat speed|evasion|defen[cs]e)\b/u.test(
      after
    )
  ) {
    return 'stat';
  }
  if (
    /\b(?:damage rate\s*:|deal(?:s|t)?|damage(?:\s+rate)?(?:\s+by)?)\s*$/u.test(before) ||
    /^\s*(?:more\s+|additional\s+|physical\s+|burning\s+|skill\s+)?damage\b/u.test(after)
  ) {
    return 'damage';
  }
  if (/\b(?:recovery|restore|heal)\b/u.test(context)) return 'healing';
  return 'unclassified';
}

function extractPercentages(description) {
  const percentages = [];
  const matcher = /([+-]?\d+(?:\.\d+)?)\s*%/gu;
  for (const match of description.matchAll(matcher)) {
    const start = match.index;
    const end = start + match[0].length;
    percentages.push({
      value: Number(match[1]),
      token: match[0],
      offset: start,
      kind: classifyPercentage(description, start, end),
      context: description.slice(Math.max(0, start - 45), Math.min(description.length, end + 65)),
    });
  }
  return percentages;
}

function extractTiming(description) {
  const timing = [];
  const patterns = [
    ['start-round', /\bstarting (?:from )?round\s+(\d+)/giu],
    ['on-round', /\b(?:on|in) (?:the )?round\s+([\d/,\sand]+)/giu],
    ['turn-window', /\b(?:first|on the first)\s+(\d+)\s+(?:turns|rounds)\b/giu],
    ['preparation', /\b(\d+)\s+(?:round|roun|turn)s?\s+of prep/giu],
    ['each-round', /\b(?:each|every) round\b/giu],
    ['after-normal-attack', /\bafter (?:a |every )?(?:normal|basic) attacks?\b/giu],
    ['after-combat-skill', /\bafter (?:a |each |every )?combat skill(?: is cast)?\b/giu],
  ];
  for (const [kind, pattern] of patterns) {
    for (const match of description.matchAll(pattern)) {
      timing.push({ kind, value: match[1] ?? true, text: match[0], offset: match.index });
    }
  }
  return timing.sort((left, right) => left.offset - right.offset);
}

function extractDamage(description, percentages) {
  return percentages
    .filter((percentage) => percentage.kind === 'damage')
    .map((percentage) => {
      const before = description.slice(Math.max(0, percentage.offset - 70), percentage.offset);
      const after = description.slice(
        percentage.offset + percentage.token.length,
        percentage.offset + percentage.token.length + 70
      );
      const context = `${before}${percentage.token}${after}`;
      const clauseStart = Math.max(
        description.lastIndexOf(';', percentage.offset),
        description.lastIndexOf('.', percentage.offset)
      );
      const nextSemicolon = description.indexOf(';', percentage.offset);
      const nextPeriod = description.indexOf('.', percentage.offset);
      const clauseEndCandidates = [nextSemicolon, nextPeriod].filter((index) => index >= 0);
      const clauseEnd =
        clauseEndCandidates.length > 0 ? Math.min(...clauseEndCandidates) : description.length;
      const localClause = description.slice(clauseStart + 1, clauseEnd);
      const conditional =
        /\b(?:if|when|while|against|lower than)\b/iu.test(localClause) ||
        /^\s*more damage\b/iu.test(after);
      return {
        kind: conditional ? 'conditional-damage' : 'direct-damage',
        ratePct: Math.abs(percentage.value),
        conditional,
        context,
      };
    });
}

function extractStatModifiers(description, percentages) {
  const modifiers = [];
  for (const percentage of percentages) {
    if (percentage.kind !== 'stat') continue;
    const context = description.slice(
      Math.max(0, percentage.offset - 65),
      Math.min(description.length, percentage.offset + percentage.token.length + 65)
    );
    const matchedStats = STAT_PATTERNS.filter(([, pattern]) => pattern.test(context)).map(
      ([stat]) => stat
    );
    for (const stat of matchedStats.length > 0 ? matchedStats : ['unknown']) {
      modifiers.push({
        stat,
        amountPct: percentage.value,
        operation: 'add',
        context,
      });
    }
  }
  const sharedStatPattern =
    /\b((?:might|resistance|hp|health|damage|combat speed)(?:\s+and\s+(?:might|resistance|hp|health|damage|combat speed))?)(?:\s+of\b[^.;%]{0,60})?\s+by\s+([+-]?\d+(?:\.\d+)?)\s*%/giu;
  for (const match of description.matchAll(sharedStatPattern)) {
    const amountPct = Number(match[2]);
    const matchedStats = STAT_PATTERNS.filter(([, pattern]) => pattern.test(match[1])).map(
      ([stat]) => stat
    );
    for (const stat of matchedStats) {
      if (
        modifiers.some((modifier) => modifier.stat === stat && modifier.amountPct === amountPct)
      ) {
        continue;
      }
      modifiers.push({
        stat,
        amountPct,
        operation: 'add',
        context: match[0],
      });
    }
  }
  const flatCombatSpeed = description.match(
    /(?:increase[sd]?|have|gains?)\s+(?:by\s+)?([+-]?\d+)\s+(?:increased\s+)?combat speed/iu
  );
  if (flatCombatSpeed && !/%/u.test(flatCombatSpeed[0])) {
    modifiers.push({
      stat: 'combat-speed',
      amount: Number(flatCombatSpeed[1]),
      operation: 'add',
      context: flatCombatSpeed[0],
    });
  }
  return modifiers;
}

function extractHealing(description, percentages) {
  if (!/\b(?:heal|healing|recover|recovery|restore|restores)\b/iu.test(description)) return [];
  const rates = percentages.filter(
    (percentage) =>
      percentage.kind === 'healing' ||
      /\b(?:recovery rate|restore|heal)\b/iu.test(percentage.context)
  );
  return rates.map((percentage) => ({
    kind: 'heal',
    ratePct: Math.abs(percentage.value),
    context: percentage.context,
  }));
}

function extractDurations(description) {
  const durations = [];
  const pattern =
    /\b(?:last(?:s|ing)?|for)\s+(?:(?:the )?(battle ends|end of the battle|next move)|(\d+)\s+(turns?|rounds?))/giu;
  for (const match of description.matchAll(pattern)) {
    durations.push({
      amount: match[2] ? Number(match[2]) : null,
      unit: match[3]?.toLowerCase().replace(/s$/u, '') || 'battle',
      text: match[0],
    });
  }
  return durations;
}

function extractStackCaps(description) {
  const caps = [];
  const pattern =
    /\bstack(?:able|ed|ing)?(?:\s+\w+){0,4}?\s+(?:up to|for up to)\s+(\d+)\s+(?:times|layers?|rounds?)/giu;
  for (const match of description.matchAll(pattern)) {
    caps.push({ maximum: Number(match[1]), text: match[0] });
  }
  return caps;
}

function extractStatuses(description) {
  const lower = description.toLowerCase();
  return [...new Set(STATUS_NAMES.filter((status) => lower.includes(status)))];
}

export function projectHeroSkillDescription(description, { skillType = null } = {}) {
  const raw = typeof description === 'string' ? description : '';
  const percentages = extractPercentages(raw);
  const timing = extractTiming(raw);
  const damage = extractDamage(raw, percentages);
  const statModifiers = extractStatModifiers(raw, percentages);
  const healing = extractHealing(raw, percentages);
  const durations = extractDurations(raw);
  const stackCaps = extractStackCaps(raw);
  const statuses = extractStatuses(raw);
  const recognizedCount =
    timing.length +
    damage.length +
    statModifiers.length +
    healing.length +
    durations.length +
    stackCaps.length +
    statuses.length;
  const diagnostics = [];
  const unclassifiedPercentages = percentages.filter(
    (percentage) => percentage.kind === 'unclassified'
  );
  if (unclassifiedPercentages.length > 0) {
    diagnostics.push({
      code: 'unclassified-percentage',
      count: unclassifiedPercentages.length,
      message: 'Percentage clauses were retained but not assigned simulator semantics.',
    });
  }
  if (recognizedCount === 0) {
    diagnostics.push({
      code: 'no-modeled-clause',
      message: 'No safely projectable simulator clause was found.',
    });
  }
  const clauses = splitClauses(raw);
  const hasComplexSemantics =
    clauses.length > 1 ||
    unclassifiedPercentages.length > 0 ||
    /\b(?:after|before|each|every|if|immune|lasting|stack|status|when|whenever|while)\b/iu.test(
      raw
    );
  if (recognizedCount > 0 && hasComplexSemantics) {
    diagnostics.push({
      code: 'free-text-semantics-retained',
      message: 'Raw clauses remain authoritative for semantics not represented by this projection.',
    });
  }
  const classification =
    recognizedCount === 0
      ? 'excluded'
      : diagnostics.some((diagnostic) => diagnostic.code === 'free-text-semantics-retained')
        ? 'partial'
        : 'modeled';
  return Object.freeze({
    activation: activationFor(skillType),
    classification,
    confidence:
      classification === 'modeled' ? 'high' : classification === 'partial' ? 'medium' : 'low',
    clauses: Object.freeze(clauses),
    percentages: freezeArray(percentages),
    timing: freezeArray(timing),
    damage: freezeArray(damage),
    statModifiers: freezeArray(statModifiers),
    healing: freezeArray(healing),
    durations: freezeArray(durations),
    stackCaps: freezeArray(stackCaps),
    statuses: Object.freeze(statuses),
    diagnostics: freezeArray(diagnostics),
  });
}

function projectSkill(heroName, skill) {
  const type = normalizeHeroSkillType(skill.type);
  const target = normalizeHeroSkillTarget(skill.target);
  const diagnostics = [];
  if (!type.known) diagnostics.push({ code: 'unknown-skill-type', value: skill.type ?? null });
  if (!target.known) diagnostics.push({ code: 'unknown-target', value: skill.target ?? null });
  if (!Number.isFinite(Number(skill.range))) {
    diagnostics.push({ code: 'unknown-range', value: skill.range ?? null });
  }
  const projection = projectHeroSkillDescription(skill.desc, { skillType: type.value });
  return Object.freeze({
    id: createHeroSkillId(heroName, skill.id),
    heroName,
    skillId: skill.id,
    type,
    range: skill.range ?? null,
    normalizedRange: Number.isFinite(Number(skill.range)) ? Number(skill.range) : null,
    target,
    description: skill.desc,
    projection,
    classification: diagnostics.length > 0 ? 'partial' : projection.classification,
    confidence: diagnostics.length > 0 ? 'low' : projection.confidence,
    diagnostics: freezeArray([...diagnostics, ...projection.diagnostics]),
  });
}

function buildCatalog() {
  return allHeroesData.map((hero) => {
    const extended = heroesExtendedData[hero.name] || null;
    const placement = normalizeHeroPlacement(extended?.placement);
    const troopType = normalizeHeroTroopType(hero.Type);
    const diagnostics = [];
    if (!extended) {
      diagnostics.push({
        code: 'missing-extended-data',
        message: 'No placement or skill descriptions exist in heroes-info.js.',
      });
    }
    if (extended && !placement.known) {
      diagnostics.push({ code: 'unknown-placement', value: extended.placement ?? null });
    }
    if (!troopType.known)
      diagnostics.push({ code: 'unknown-troop-type', value: hero.Type ?? null });
    const skills = extended?.skills?.map((skill) => projectSkill(hero.name, skill)) || [];
    return Object.freeze({
      id: hero.name,
      name: hero.name,
      season: hero.season,
      releaseSeason: hero.releaseSeason ?? hero.season,
      troopType,
      placement,
      minCopies: extended?.minCopies ?? null,
      maxCopies: extended?.maxCopies ?? null,
      skills: Object.freeze(skills),
      completeness: extended ? 'extended' : 'missing-extended',
      diagnostics: freezeArray(diagnostics),
    });
  });
}

export const battleHeroSkillCatalog = Object.freeze(buildCatalog());
export const battleHeroSkills = Object.freeze(
  battleHeroSkillCatalog.flatMap((hero) => hero.skills)
);

const classificationCounts = battleHeroSkills.reduce(
  (counts, skill) => {
    counts[skill.classification] += 1;
    return counts;
  },
  { modeled: 0, partial: 0, excluded: 0 }
);

export const BATTLE_HERO_SKILL_COVERAGE = Object.freeze({
  rosterHeroes: battleHeroSkillCatalog.length,
  extendedHeroes: battleHeroSkillCatalog.filter((hero) => hero.completeness === 'extended').length,
  missingExtendedHeroes: MISSING_EXTENDED_HEROES,
  descriptions: battleHeroSkills.length,
  classifications: Object.freeze(classificationCounts),
});

export function getBattleHeroSkill(heroName, skillId) {
  const compositeId = createHeroSkillId(heroName, skillId);
  return battleHeroSkills.find((skill) => skill.id === compositeId) || null;
}

export function getBattleHeroSkillCatalogEntry(heroName) {
  return battleHeroSkillCatalog.find((hero) => hero.name === heroName) || null;
}
