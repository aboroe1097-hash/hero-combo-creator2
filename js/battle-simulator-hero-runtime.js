import {
  getBattleHeroSkill,
  getBattleHeroSkillCatalogEntry,
} from './battle-simulator-hero-skills.js';
import { BATTLE_EFFECT_RUNTIME_VERSION } from './battle-simulator-effect-runtime.js';

export const BATTLE_HERO_RUNTIME_VERSION = '1.0.0';

const SKILL_PHASES = Object.freeze({
  'pre-battle': 'battle-start',
  combat: 'before-action',
  active: 'before-action',
  'additional-attack': 'after-normal-attack',
  status: 'battle-start',
  leadership: 'battle-start',
});

const STAT_MAP = Object.freeze({
  might: 'attack',
  resistance: 'defense',
  hp: 'hp',
  'combat-speed': 'combatSpeed',
  damage: 'damage',
});

const STATUS_MAP = Object.freeze({
  'armor break': 'armor-break',
  bleeding: 'bleed',
  burning: 'burn',
  confuse: 'confuse',
  confusion: 'confuse',
  'counter-attack': 'counterattack',
  counterattack: 'counterattack',
  disarm: 'disarm',
  disarmed: 'disarm',
  evasion: 'evasion',
  silence: 'silence',
  sober: 'sober',
  suppress: 'suppress',
  suppression: 'suppress',
  taunt: 'taunt',
  vulnerable: 'vulnerable',
});

function diagnostic(code, message, context = {}) {
  return Object.freeze({ code, message, ...context });
}

function effectiveStats(row) {
  const unit = row?.stats?.unit;
  const battle = row?.stats?.battle;
  if (!unit || !battle) return null;
  const values = {
    attack: (Number(unit.attack) * Number(battle.might)) / 100,
    defense: (Number(unit.defense) * Number(battle.resistance)) / 100,
    hp: (Number(unit.hp) * Number(battle.hp)) / 100,
    damage: Number(battle.damage),
    damageMitigation: Number(battle.damageMitigation),
    combatSpeed: Number(battle.combatSpeed),
  };
  return Object.values(values).every(Number.isFinite) ? values : null;
}

function readAssignment(row) {
  const nested = row?.hero && typeof row.hero === 'object' ? row.hero : null;
  const heroName = row?.heroName ?? nested?.name ?? null;
  const hasSkillIds =
    Object.hasOwn(row || {}, 'heroSkillIds') ||
    Object.hasOwn(row || {}, 'skillIds') ||
    (nested ? Object.hasOwn(nested, 'skillIds') : false);
  const skillIds = row?.heroSkillIds ?? row?.skillIds ?? nested?.skillIds;
  return {
    heroName: typeof heroName === 'string' ? heroName.trim() : '',
    hasSkillIds,
    skillIds,
  };
}

function runtimeTarget(skill) {
  const { side, selection, count } = skill.target;
  const range = Math.min(2, Math.max(0, skill.normalizedRange));
  if (selection === 'self') return { type: 'self', count: 1, range: 0 };
  if (selection === 'random') {
    return {
      type: side === 'ally' ? 'random-ally' : 'random-enemy',
      count,
      range,
    };
  }
  return {
    type: side === 'ally' ? 'all-allies' : 'all-enemies',
    count,
    range,
  };
}

function triggerChance(skill, diagnostics, context) {
  const chances = skill.projection.percentages.filter(({ kind }) => kind === 'chance');
  if (chances.length > 1) {
    diagnostics.push(
      diagnostic(
        'ambiguous-trigger-chance',
        'Multiple trigger chances cannot be coupled safely and were not executed.',
        context
      )
    );
    return null;
  }
  return chances.length === 0 ? 1 : Math.min(1, Math.max(0, chances[0].value / 100));
}

function effectDuration(skill) {
  const explicit = skill.projection.durations.find(
    ({ amount }) => Number.isSafeInteger(amount) && amount > 0
  )?.amount;
  if (explicit) return Math.min(100, explicit);
  const window = skill.projection.timing.find(
    ({ kind, value }) => kind === 'turn-window' && Number.isSafeInteger(Number(value))
  );
  return window ? Math.min(100, Number(window.value)) : null;
}

function selectedSkills(heroName, hero, assignment, diagnostics, context) {
  if (!assignment.hasSkillIds) return hero.skills;
  if (!Array.isArray(assignment.skillIds)) {
    diagnostics.push(
      diagnostic('invalid-skill-ids', 'Hero skill IDs must be an array when supplied.', context)
    );
    return [];
  }
  const wanted = new Set(assignment.skillIds.map(String));
  const skills = hero.skills.filter((skill) => wanted.has(String(skill.skillId)));
  for (const skillId of wanted) {
    if (!getBattleHeroSkill(heroName, skillId)) {
      diagnostics.push(
        diagnostic('unknown-skill', `Skill "${skillId}" was not found for ${heroName}.`, {
          ...context,
          skillId,
        })
      );
    }
  }
  return skills;
}

function projectSkillEffects({ skill, source, row, phase, target, chance, diagnostics, context }) {
  const definitions = [];
  const base = effectiveStats(row);
  if (!base) {
    diagnostics.push(
      diagnostic('invalid-row-stats', 'Hero effects require complete finite v2 row stats.', context)
    );
    return definitions;
  }
  const semantics = [
    ...skill.projection.damage.map((clause) => ({ kind: 'damage', clause })),
    ...skill.projection.healing.map((clause) => ({ kind: 'heal', clause })),
    ...skill.projection.statModifiers.map((clause) => ({ kind: 'stat-modifier', clause })),
    ...skill.projection.statuses.map((clause) => ({ kind: 'status', clause })),
  ];
  const duration = effectDuration(skill);
  const hasDotStatus = skill.projection.statuses.some((status) =>
    ['burning', 'bleeding'].includes(status)
  );

  if (semantics.length > 1 && chance < 1) {
    diagnostics.push(
      diagnostic(
        'compound-trigger-partially-modeled',
        'Only one independently executable clause can use a probabilistic trigger.',
        context
      )
    );
  }

  for (let index = 0; index < semantics.length; index += 1) {
    const { kind, clause } = semantics[index];
    if (index > 0 && chance < 1) continue;
    const effectId = `${source}:${skill.skillId}:${kind}:${index + 1}`;
    const common = {
      id: effectId,
      version: BATTLE_EFFECT_RUNTIME_VERSION,
      phase,
      source,
      target,
      chance,
      conditions: [],
    };

    if (kind === 'damage') {
      if (
        clause.kind !== 'direct-damage' ||
        clause.conditional ||
        skill.projection.damage.length > 1 ||
        !/\bdeal(?:s|t|ing)?\b/iu.test(clause.context) ||
        /\b(?:lesser|increase[sd]?|take|taken)\b/iu.test(clause.context)
      ) {
        diagnostics.push(
          diagnostic(
            'unsupported-damage-clause',
            'A non-direct, conditional, or compound damage clause was not executed.',
            { ...context, clause: clause.context }
          )
        );
        continue;
      }
      if (hasDotStatus) continue;
      definitions.push({
        ...common,
        type: 'damage',
        amount: Math.max(0, Math.floor((base.attack * clause.ratePct) / 100)),
      });
      continue;
    }

    if (kind === 'heal') {
      definitions.push({
        ...common,
        type: 'heal',
        amount: Math.max(0, Math.floor((Number(row.troops) * clause.ratePct) / 100)),
      });
      continue;
    }

    if (kind === 'stat-modifier') {
      const stat = STAT_MAP[clause.stat];
      if (!stat || duration === null) {
        diagnostics.push(
          diagnostic(
            'unsupported-stat-modifier',
            'A stat modifier without a modeled stat and explicit duration was not executed.',
            { ...context, stat: clause.stat }
          )
        );
        continue;
      }
      const amount =
        clause.amount === undefined ? (base[stat] * clause.amountPct) / 100 : Number(clause.amount);
      definitions.push({
        ...common,
        type: 'stat-modifier',
        stat,
        amount,
        duration,
        stacks: 1,
        maxStacks: skill.projection.stackCaps[0]?.maximum ?? 1,
      });
      continue;
    }

    const status = STATUS_MAP[clause];
    if (!status || duration === null) {
      diagnostics.push(
        diagnostic(
          'unsupported-status',
          'An unknown status or status without an explicit duration was not executed.',
          { ...context, status: clause }
        )
      );
      continue;
    }
    if (status === 'burn' || status === 'bleed') {
      const damage = skill.projection.damage.length === 1 ? skill.projection.damage[0] : null;
      if (!damage) {
        diagnostics.push(
          diagnostic('unsupported-dot', 'A DoT without one modeled damage rate was not executed.', {
            ...context,
            status,
          })
        );
        continue;
      }
      definitions.push({
        ...common,
        type: 'dot',
        status,
        amount: Math.max(0, Math.floor((base.attack * damage.ratePct) / 100)),
        duration,
        stacks: 1,
        maxStacks: skill.projection.stackCaps[0]?.maximum ?? 1,
      });
    } else {
      definitions.push({
        ...common,
        type: 'status',
        status,
        duration,
        stacks: 1,
        maxStacks: skill.projection.stackCaps[0]?.maximum ?? 1,
      });
    }
  }

  if (definitions.length === 0 && semantics.length === 0) {
    diagnostics.push(
      diagnostic(
        'no-runtime-semantics',
        'The selected skill has no executable runtime clause.',
        context
      )
    );
  }
  return definitions;
}

export function adaptHeroAssignmentsToEffects({ sideA, sideB } = {}) {
  const definitions = [];
  const diagnostics = [];
  for (const [sideId, side] of [
    ['A', sideA],
    ['B', sideB],
  ]) {
    const rows = Array.isArray(side?.rows) ? side.rows : [];
    rows.forEach((row, index) => {
      const rowId = ['front', 'middle', 'back'][index];
      const assignment = readAssignment(row);
      if (!assignment.heroName) return;
      const context = { side: sideId, rowId, heroName: assignment.heroName };
      const hero = getBattleHeroSkillCatalogEntry(assignment.heroName);
      if (!hero) {
        diagnostics.push(
          diagnostic('unknown-hero', `Hero "${assignment.heroName}" was not found.`, context)
        );
        return;
      }
      if (!hero.placement.known || !hero.placement.rows.includes(rowId)) {
        diagnostics.push(
          diagnostic(
            'hero-placement-mismatch',
            `${assignment.heroName} is not verified for the ${rowId} row.`,
            context
          )
        );
        return;
      }
      if (
        !hero.troopType.known ||
        (hero.troopType.value !== 'all' && hero.troopType.value !== row?.type)
      ) {
        diagnostics.push(
          diagnostic(
            'hero-troop-type-mismatch',
            `${assignment.heroName} is not verified for this troop type.`,
            context
          )
        );
        return;
      }
      if (!Number.isSafeInteger(Number(row?.troops)) || Number(row.troops) <= 0) {
        diagnostics.push(
          diagnostic('inactive-hero-row', 'A hero on an empty or invalid row cannot act.', context)
        );
        return;
      }

      for (const skill of selectedSkills(
        assignment.heroName,
        hero,
        assignment,
        diagnostics,
        context
      )) {
        const skillContext = { ...context, skillId: skill.skillId };
        const phase = SKILL_PHASES[skill.type.value];
        if (
          skill.classification !== 'modeled' ||
          !skill.type.known ||
          !skill.target.known ||
          !Number.isFinite(skill.normalizedRange) ||
          !phase
        ) {
          diagnostics.push(
            diagnostic(
              'skill-not-executable',
              'A partial, excluded, or structurally unknown skill was not executed.',
              { ...skillContext, classification: skill.classification }
            )
          );
          for (const item of skill.diagnostics) {
            diagnostics.push(
              diagnostic(
                item.code || 'skill-diagnostic',
                item.message || 'The catalog retained an unsupported skill clause.',
                { ...skillContext, catalogDiagnostic: item }
              )
            );
          }
          continue;
        }
        const chance = triggerChance(skill, diagnostics, skillContext);
        if (chance === null) continue;
        definitions.push(
          ...projectSkillEffects({
            skill,
            source: `${sideId}:${rowId}`,
            row,
            phase,
            target: runtimeTarget(skill),
            chance,
            diagnostics,
            context: skillContext,
          })
        );
      }
    });
  }

  return Object.freeze({
    version: BATTLE_HERO_RUNTIME_VERSION,
    definitions: Object.freeze(definitions.map(Object.freeze)),
    diagnostics: Object.freeze(diagnostics),
  });
}

export const createHeroEffectDefinitions = adaptHeroAssignmentsToEffects;
