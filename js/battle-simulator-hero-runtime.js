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

const SIDE_IDS = Object.freeze(['A', 'B']);
const ROW_IDS = Object.freeze(['front', 'middle', 'back']);

function explicitDiagnostic(diagnostics, code, message, context = {}) {
  diagnostics.push(diagnostic(code, message, { source: 'explicit-options', ...context }));
}

function normalizeExplicitSkillSelections(heroSkills, diagnostics) {
  const selections = new Map();
  if (heroSkills === undefined || heroSkills === null) return selections;

  const add = (heroName, skillId, context) => {
    const name = typeof heroName === 'string' ? heroName.trim() : '';
    const canonicalSkill = name ? getBattleHeroSkill(name, skillId) : null;
    if (!canonicalSkill) {
      explicitDiagnostic(
        diagnostics,
        'unknown-explicit-hero-skill',
        'An explicit hero skill did not match the canonical catalog.',
        context
      );
      return;
    }
    const selected = selections.get(name) ?? new Set();
    selected.add(String(canonicalSkill.skillId));
    selections.set(name, selected);
  };

  if (Array.isArray(heroSkills)) {
    heroSkills.forEach((item, index) => {
      if (typeof item === 'string') {
        const separator = item.lastIndexOf(':');
        add(item.slice(0, separator), item.slice(separator + 1), { skillIndex: index });
        return;
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        explicitDiagnostic(
          diagnostics,
          'invalid-explicit-hero-skill',
          'Explicit hero skills must be canonical IDs or objects.',
          { skillIndex: index }
        );
        return;
      }
      add(item.heroName ?? item.hero ?? item.name, item.skillId ?? item.id, {
        skillIndex: index,
      });
    });
    return selections;
  }

  if (typeof heroSkills === 'object') {
    Object.entries(heroSkills)
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([heroName, heroSelection]) => {
        const skillIds = Array.isArray(heroSelection)
          ? heroSelection
          : heroSelection &&
              typeof heroSelection === 'object' &&
              !Array.isArray(heroSelection) &&
              Array.isArray(heroSelection.skills)
            ? heroSelection.skills
            : null;
        if (!Array.isArray(skillIds)) {
          explicitDiagnostic(
            diagnostics,
            'invalid-explicit-hero-skill',
            'Explicit hero skill maps must contain skill arrays or objects with a skills array.',
            { heroName }
          );
          return;
        }
        skillIds.forEach((skill, skillIndex) => {
          let skillId =
            skill && typeof skill === 'object' && !Array.isArray(skill)
              ? (skill.skillId ?? skill.id)
              : skill;
          if (typeof skillId === 'string' && skillId.startsWith(`${heroName}:`)) {
            skillId = skillId.slice(heroName.length + 1);
          }
          add(heroName, skillId, { heroName, skillIndex });
        });
      });
    return selections;
  }

  explicitDiagnostic(
    diagnostics,
    'invalid-explicit-hero-skills',
    'heroSkills must be an array or hero-name map.'
  );
  return selections;
}

function normalizeExplicitAssignments(heroAssignments, selections, diagnostics, selectionRequired) {
  if (heroAssignments === undefined || heroAssignments === null) return [];
  const records = [];
  const add = (side, rowId, raw, assignmentIndex) => {
    if (!SIDE_IDS.includes(side) || !ROW_IDS.includes(rowId)) {
      explicitDiagnostic(
        diagnostics,
        'invalid-explicit-assignment-slot',
        'Explicit hero assignments require side A/B and front/middle/back.',
        { assignmentIndex, side, rowId }
      );
      return;
    }
    const value = typeof raw === 'string' ? { heroName: raw } : raw;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      explicitDiagnostic(
        diagnostics,
        'invalid-explicit-assignment',
        'An explicit hero assignment must be a hero name or object.',
        { assignmentIndex, side, rowId }
      );
      return;
    }
    const heroValue = value.heroName ?? value.hero ?? value.name;
    const heroName = typeof heroValue === 'string' ? heroValue.trim() : '';
    if (!heroName) {
      explicitDiagnostic(
        diagnostics,
        'invalid-explicit-assignment',
        'An explicit hero assignment requires a hero name.',
        { assignmentIndex, side, rowId }
      );
      return;
    }
    const suppliedSkillIds = value.skillIds ?? value.heroSkillIds;
    const selected = selections.get(heroName);
    let skillIds;
    if (suppliedSkillIds !== undefined) {
      if (!Array.isArray(suppliedSkillIds)) {
        explicitDiagnostic(
          diagnostics,
          'invalid-explicit-assignment-skills',
          'Explicit assignment skill IDs must be an array.',
          { assignmentIndex, side, rowId, heroName }
        );
        return;
      }
      skillIds = suppliedSkillIds.map(String);
      if (selectionRequired) {
        const mismatch = skillIds.find((skillId) => !selected?.has(skillId));
        if (mismatch !== undefined) {
          explicitDiagnostic(
            diagnostics,
            'explicit-skill-assignment-mismatch',
            'An assigned skill was not selected for the assigned hero.',
            { assignmentIndex, side, rowId, heroName, skillId: mismatch }
          );
          return;
        }
      }
    } else {
      skillIds = selected ? [...selected] : [];
    }
    if (skillIds.length === 0) {
      explicitDiagnostic(
        diagnostics,
        'empty-explicit-assignment',
        'An explicit hero assignment requires at least one canonical selected skill.',
        { assignmentIndex, side, rowId, heroName }
      );
      return;
    }
    records.push({ side, rowId, heroName, skillIds });
  };

  if (Array.isArray(heroAssignments)) {
    heroAssignments.forEach((assignment, index) => {
      add(assignment?.side, assignment?.rowId ?? assignment?.row, assignment, index);
    });
    return records;
  }
  if (typeof heroAssignments === 'object') {
    SIDE_IDS.forEach((side) => {
      const assignments = heroAssignments[side] ?? heroAssignments[side.toLowerCase()];
      if (assignments === undefined) return;
      if (!assignments || typeof assignments !== 'object' || Array.isArray(assignments)) {
        explicitDiagnostic(
          diagnostics,
          'invalid-explicit-assignment-side',
          'Each explicit assignment side must be a row map.',
          { side }
        );
        return;
      }
      Object.entries(assignments)
        .sort(([left], [right]) => ROW_IDS.indexOf(left) - ROW_IDS.indexOf(right))
        .forEach(([rowId, assignment], index) => add(side, rowId, assignment, index));
    });
    const validSideKeys = [...SIDE_IDS, ...SIDE_IDS.map((side) => side.toLowerCase())];
    Object.keys(heroAssignments)
      .filter((side) => !validSideKeys.includes(side))
      .sort()
      .forEach((side) =>
        explicitDiagnostic(
          diagnostics,
          'invalid-explicit-assignment-slot',
          'Explicit hero assignments require side A/B.',
          { side }
        )
      );
    return records;
  }

  explicitDiagnostic(
    diagnostics,
    'invalid-explicit-hero-assignments',
    'heroAssignments must be an array or side/row map.'
  );
  return records;
}

function consolidateExplicitAssignments(assignments, diagnostics) {
  const bySlot = new Map();
  for (const assignment of assignments) {
    const slot = `${assignment.side}:${assignment.rowId}`;
    const records = bySlot.get(slot) ?? [];
    records.push(assignment);
    bySlot.set(slot, records);
  }

  const consolidated = [];
  for (const slot of [...bySlot.keys()].sort()) {
    const records = bySlot.get(slot);
    const heroNames = [...new Set(records.map(({ heroName }) => heroName))].sort();
    if (heroNames.length > 1) {
      const { side, rowId } = records[0];
      explicitDiagnostic(
        diagnostics,
        'conflicting-explicit-assignment',
        'Conflicting explicit heroes targeted the same side and row; that explicit slot was ignored.',
        { side, rowId, heroNames }
      );
      continue;
    }
    consolidated.push({
      side: records[0].side,
      rowId: records[0].rowId,
      heroName: heroNames[0],
      skillIds: [...new Set(records.flatMap(({ skillIds }) => skillIds.map(String)))].sort(),
    });
  }
  return consolidated;
}

function mergeAssignmentIntoRow(row, assignment, diagnostics) {
  const embedded = readAssignment(row);
  if (embedded.heroName && embedded.heroName !== assignment.heroName) {
    explicitDiagnostic(
      diagnostics,
      'embedded-explicit-hero-conflict',
      'The explicit hero conflicts with the embedded row hero and was ignored.',
      {
        side: assignment.side,
        rowId: assignment.rowId,
        embeddedHeroName: embedded.heroName,
        explicitHeroName: assignment.heroName,
      }
    );
    return row;
  }

  const embeddedSkillIds = Array.isArray(embedded.skillIds) ? embedded.skillIds.map(String) : [];
  return {
    ...row,
    heroName: assignment.heroName,
    heroSkillIds: [...new Set([...embeddedSkillIds, ...assignment.skillIds.map(String)])].sort(),
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

function adaptRowsToEffects({ sideA, sideB }, diagnostics) {
  const definitions = [];
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

  return definitions;
}

export function adaptHeroAssignmentsToEffects({ sideA, sideB, heroSkills, heroAssignments } = {}) {
  const diagnostics = [];
  const selections = normalizeExplicitSkillSelections(heroSkills, diagnostics);
  const explicitAssignments = consolidateExplicitAssignments(
    normalizeExplicitAssignments(
      heroAssignments,
      selections,
      diagnostics,
      heroSkills !== undefined && heroSkills !== null
    ),
    diagnostics
  );
  const effectiveSides = { A: sideA, B: sideB };
  for (const assignment of explicitAssignments) {
    const side = effectiveSides[assignment.side];
    const rowIndex = ROW_IDS.indexOf(assignment.rowId);
    const row = Array.isArray(side?.rows) ? side.rows[rowIndex] : null;
    if (!row) {
      explicitDiagnostic(
        diagnostics,
        'explicit-assignment-row-missing',
        'The explicit assignment references a missing configured row.',
        assignment
      );
      continue;
    }
    const rows = side.rows.map((candidate, index) =>
      index === rowIndex ? mergeAssignmentIntoRow(candidate, assignment, diagnostics) : candidate
    );
    effectiveSides[assignment.side] = {
      ...side,
      rows,
    };
  }

  const definitions = adaptRowsToEffects(
    { sideA: effectiveSides.A, sideB: effectiveSides.B },
    diagnostics
  );

  return Object.freeze({
    version: BATTLE_HERO_RUNTIME_VERSION,
    definitions: Object.freeze(definitions.map(Object.freeze)),
    diagnostics: Object.freeze(diagnostics),
  });
}

export const createHeroEffectDefinitions = adaptHeroAssignmentsToEffects;
