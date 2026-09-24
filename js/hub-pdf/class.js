// js/hub-pdf/class.js
// Class Development Hub document builder. Reads the same class roadmaps the hub
// renders (js/class-development-data.js). Skill names, strengths and targets stay
// in the source's English, as they do on the hub itself.

import { CLASS_DEVELOPMENT_PROFILES } from '../class-development-data.js';
import { interpolate, list, note, numCol, paragraph, table, textCol } from './document.js';

export const CLASS_STAGES = Object.freeze([
  'checkpoints',
  'red',
  'yellow',
  'targets',
  'profile',
  'compare',
]);
export const CLASS_LEVEL_MAX = Math.max(
  ...CLASS_DEVELOPMENT_PROFILES.map((profile) => profile.finalLevel)
);

export function defaultClassChoices() {
  return {
    classId: 'all',
    stages: [...CLASS_STAGES],
    fromLevel: 1,
    toLevel: CLASS_LEVEL_MAX,
  };
}

function clampLevel(value, fallback) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(999, number));
}

export function normalizeClassChoices(raw = {}) {
  const choices = { ...defaultClassChoices(), ...raw };
  let from = clampLevel(choices.fromLevel, 1);
  let to = clampLevel(choices.toLevel, CLASS_LEVEL_MAX);
  if (from > to) [from, to] = [to, from];
  return { ...choices, fromLevel: from, toLevel: to };
}

export function selectedProfiles(choices) {
  return choices.classId === 'all' || !choices.classId
    ? [...CLASS_DEVELOPMENT_PROFILES]
    : CLASS_DEVELOPMENT_PROFILES.filter((profile) => profile.id === choices.classId);
}

/** Checkpoints inside the level range, each with the priority skill set there. */
export function checkpointRows(profile, fromLevel, toLevel) {
  return profile.checkpoints
    .map((level, index) => ({ level, index }))
    .filter(({ level }) => level >= fromLevel && level <= toLevel)
    .map(({ level, index }) => {
      const skills = profile.priorities
        .filter((item) => item.level === level)
        .map((item) => item.skill);
      return [
        index + 1,
        level,
        skills.length ? skills.join(', ') : '—',
        level === profile.finalLevel,
      ];
    });
}

export function priorityRows(profile, fromLevel, toLevel, copy) {
  return profile.priorities
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.level === null ||
        item.level === undefined ||
        (item.level >= fromLevel && item.level <= toLevel)
    )
    .map(({ item, index }) => [index + 1, item.level ?? copy.inSourceOrder, item.skill]);
}

export function buildClassDocument(rawChoices, copy) {
  const choices = normalizeClassChoices(rawChoices);
  const stages = new Set(choices.stages || []);
  const profiles = selectedProfiles(choices);
  const { fromLevel, toLevel } = choices;
  const cardLabels = {
    income: copy.cardIncome,
    class: copy.cardClass,
    alliance: copy.cardAlliance,
    general: copy.cardGeneral,
  };

  const sections = profiles.map((profile) => {
    const subsections = [];
    if (stages.has('profile')) {
      subsections.push({
        title: copy.classProfile,
        blocks: [
          {
            type: 'definitions',
            items: [
              { label: copy.colFocus, value: profile.role },
              { label: copy.colFinal, value: profile.finalLevel },
            ],
          },
          paragraph(copy.strengths),
          list(profile.strengths),
          paragraph(copy.watchOuts),
          list(profile.tradeoffs),
        ],
      });
    }
    if (stages.has('checkpoints')) {
      subsections.push({
        title: copy.classCheckpoints,
        blocks: [
          table(
            [
              numCol(copy.colReset),
              numCol(copy.colLevel),
              textCol(copy.colPrioritySkill),
              textCol(copy.colFinalReset),
            ],
            checkpointRows(profile, fromLevel, toLevel).map(([reset, level, skill, final]) => [
              reset,
              level,
              skill,
              final ? copy.yes : '',
            ])
          ),
        ],
      });
    }
    if (stages.has('red')) {
      subsections.push({
        title: copy.classRed,
        blocks: [
          paragraph(copy.classRedHelp),
          table(
            [numCol('#'), numCol(copy.colLevel), textCol(copy.colSkill)],
            priorityRows(profile, fromLevel, toLevel, copy)
          ),
        ],
      });
    }
    if (stages.has('yellow')) {
      subsections.push({
        title: copy.classYellow,
        blocks: [paragraph(copy.classYellowHelp), list(profile.followUps)],
      });
    }
    if (stages.has('targets')) {
      subsections.push({
        title: copy.classTargets,
        blocks: [
          list(profile.targets),
          table(
            [textCol(copy.colCategory), numCol(copy.colCardSlots)],
            Object.entries(profile.cardMix).map(([key, value]) => [cardLabels[key] || key, value]),
            {
              footer: [
                copy.docTotal,
                Object.values(profile.cardMix).reduce((sum, value) => sum + value, 0),
              ],
            }
          ),
        ],
      });
    }
    return {
      title: `${profile.name}${profile.alias ? ` (${profile.alias})` : ''}`,
      blocks: [note(interpolate(copy.classSourceLine, { url: profile.sourceUrl }))],
      subsections,
    };
  });

  if (stages.has('compare')) {
    sections.push({
      title: copy.classCompare,
      blocks: [
        table(
          [
            textCol(copy.classChoose),
            textCol(copy.colFocus),
            numCol(copy.colCheckpointCount),
            numCol(copy.colFinal),
          ],
          CLASS_DEVELOPMENT_PROFILES.map((profile) => [
            profile.name,
            profile.role,
            profile.checkpoints.length,
            profile.finalLevel,
          ])
        ),
      ],
    });
  }

  const stageLabels = {
    checkpoints: copy.classCheckpoints,
    red: copy.classRed,
    yellow: copy.classYellow,
    targets: copy.classTargets,
    profile: copy.classProfile,
    compare: copy.classCompare,
  };

  return {
    title: copy.classDocTitle,
    fileTitle: `roc-class-development-${choices.classId}`,
    subtitle: copy.classCaution,
    choices: [
      {
        label: copy.classChoose,
        value:
          choices.classId === 'all'
            ? copy.classAll
            : profiles.map((profile) => profile.name).join(', ') || null,
      },
      {
        label: copy.classLevelRange,
        value: interpolate(copy.levelRange, { from: fromLevel, to: toLevel }),
      },
      {
        label: copy.classStages,
        value:
          CLASS_STAGES.filter((stage) => stages.has(stage))
            .map((stage) => stageLabels[stage])
            .join(', ') || copy.docNone,
      },
    ],
    sections,
    sources: profiles.map((profile) => ({
      label: `${profile.name} — Don Pablone / S96 (L96)`,
      url: profile.sourceUrl,
    })),
  };
}

/** Form controls for the Class Development PDFs tab. */
export function classForm(copy) {
  return [
    {
      type: 'select',
      name: 'classId',
      label: copy.classChoose,
      options: [
        { value: 'all', label: copy.classAll },
        ...CLASS_DEVELOPMENT_PROFILES.map((profile) => ({
          value: profile.id,
          label: profile.name,
        })),
      ],
    },
    {
      type: 'checks',
      name: 'stages',
      label: copy.classStages,
      bulk: true,
      options: [
        { value: 'profile', label: copy.classProfile },
        { value: 'checkpoints', label: copy.classCheckpoints },
        { value: 'red', label: copy.classRed },
        { value: 'yellow', label: copy.classYellow },
        { value: 'targets', label: copy.classTargets },
        { value: 'compare', label: copy.classCompare },
      ],
    },
    {
      type: 'range',
      label: copy.classLevelRange,
      fromName: 'fromLevel',
      toName: 'toLevel',
      min: 1,
      max: CLASS_LEVEL_MAX,
    },
  ];
}

export const classPdf = Object.freeze({
  defaults: defaultClassChoices,
  form: classForm,
  build: (choices, copy) => buildClassDocument(choices, copy),
  quick: [],
});
