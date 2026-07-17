import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTroopProfile } from '../../js/battle-simulator-data.js';
import { simulateBattle } from '../../js/battle-simulator-engine.js';
import { buildBattleCalibrationFixture } from '../../js/battle-simulator-export.js';
import {
  buildSetupSnapshot,
  createEmptyCapturedSourceSnapshot,
  createEmptyEquipmentLoadout,
  createEmptyResearchSnapshot,
  setupSnapshotToEngineConfig,
} from '../../js/battle-simulator-setup.js';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIRECTORY = resolve(SCRIPT_DIRECTORY, '../../tests/fixtures/battle-reports');
const FIXED_TIMESTAMP = '2026-07-17T00:00:00.000Z';
const FIXED_REPORT_DATE = '2026-07-17';
const ROW_IDS = Object.freeze(['front', 'middle', 'back']);

const SYNTHETIC_COEFFICIENTS = Object.freeze({
  baseCasualtyRate: 0.12,
  mightScale: 1.25,
  damageScale: 0.85,
  resistanceScale: 1.2,
  hpScale: 1.1,
  mightExponent: 1.15,
  damageExponent: 0.9,
  resistanceExponent: 1.4,
  hpExponent: 1.05,
  casualtyRateCap: 0.95,
});

const ADD_BONUSES = 'add-bonuses';
const FINAL_TOTALS = 'final-totals';

function unit(
  type,
  tier,
  troops,
  [might, resistance, hp, tacticalMight, tacticalResistance, damage, combatSpeed],
  baseAdjustments = {}
) {
  return {
    type,
    tier,
    troops,
    stats: {
      might,
      resistance,
      hp,
      tacticalMight,
      tacticalResistance,
      damage,
      damageMitigation: 0,
      combatSpeed,
    },
    baseAdjustments,
  };
}

const CASES = Object.freeze([
  {
    modes: [ADD_BONUSES, FINAL_TOTALS],
    A: [
      unit('footmen', 10, 36_000, [320, 280, 120, 32, 28, 75, 640]),
      unit('cavalry', 9, 28_000, [390, 190, 90, 45, 20, 100, 760]),
      unit('archers', 10, 33_000, [430, 170, 70, 55, 18, 135, 560]),
    ],
    B: [
      unit('footmen', 9, 40_000, [290, 310, 150, 25, 35, 55, 620]),
      unit('archers', 9, 30_000, [410, 180, 80, 48, 22, 125, 590]),
      unit('cavalry', 10, 25_000, [370, 215, 95, 42, 24, 90, 735]),
    ],
  },
  {
    modes: [FINAL_TOTALS, ADD_BONUSES],
    A: [
      unit('archers', 10, 24_000, [470, 145, 62, 60, 14, 155, 610]),
      unit('footmen', 9, 45_000, [245, 345, 170, 18, 40, 42, 575]),
      unit('cavalry', 9, 22_000, [355, 205, 92, 38, 24, 88, 790]),
    ],
    B: [
      unit('cavalry', 10, 34_000, [405, 225, 105, 46, 26, 105, 810]),
      unit('footmen', 10, 39_000, [275, 330, 165, 22, 44, 50, 600]),
      unit('archers', 9, 32_000, [435, 175, 76, 54, 20, 142, 585]),
    ],
  },
  {
    modes: [ADD_BONUSES, ADD_BONUSES],
    A: [
      unit('footmen', 9, 58_000, [250, 300, 155, 20, 38, 45, 520]),
      unit('cavalry', 9, 52_000, [335, 190, 88, 36, 22, 82, 730]),
      unit('archers', 9, 55_000, [385, 155, 68, 44, 17, 118, 540]),
    ],
    B: [
      unit('footmen', 10, 35_000, [335, 390, 185, 30, 48, 68, 610]),
      unit('cavalry', 10, 34_000, [445, 245, 112, 49, 29, 120, 835]),
      unit('archers', 10, 36_000, [505, 205, 84, 62, 23, 172, 635]),
    ],
  },
  {
    modes: [FINAL_TOTALS, FINAL_TOTALS],
    A: [
      unit('cavalry', 10, 31_000, [465, 235, 108, 52, 28, 125, 850]),
      unit('archers', 10, 29_000, [520, 190, 78, 65, 20, 180, 650]),
      unit('footmen', 10, 33_000, [315, 370, 178, 27, 46, 62, 625]),
    ],
    B: [
      unit('cavalry', 9, 51_000, [315, 185, 86, 33, 21, 76, 745]),
      unit('archers', 9, 49_000, [365, 150, 65, 41, 16, 110, 535]),
      unit('footmen', 9, 54_000, [235, 285, 148, 17, 35, 40, 510]),
    ],
  },
  {
    modes: [ADD_BONUSES, FINAL_TOTALS],
    A: [
      unit('archers', 10, 30_000, [560, 135, 58, 72, 12, 210, 665]),
      unit('cavalry', 10, 27_000, [505, 165, 72, 61, 16, 175, 865]),
      unit('archers', 9, 29_000, [530, 128, 55, 68, 11, 198, 645]),
    ],
    B: [
      unit('footmen', 10, 42_000, [260, 470, 215, 19, 58, 35, 560]),
      unit('footmen', 9, 41_000, [245, 445, 205, 18, 55, 32, 545]),
      unit('cavalry', 9, 37_000, [325, 350, 165, 31, 43, 66, 720]),
    ],
  },
  {
    modes: [FINAL_TOTALS, ADD_BONUSES],
    A: [
      unit('footmen', 10, 44_000, [275, 455, 210, 21, 57, 38, 585]),
      unit('cavalry', 9, 39_000, [340, 335, 158, 34, 42, 70, 750]),
      unit('footmen', 9, 43_000, [255, 430, 200, 19, 53, 34, 555]),
    ],
    B: [
      unit('archers', 10, 28_000, [545, 140, 60, 70, 13, 205, 660]),
      unit('cavalry', 10, 29_000, [510, 170, 75, 63, 17, 180, 870]),
      unit('archers', 9, 27_000, [515, 130, 56, 66, 12, 190, 640]),
    ],
  },
  {
    modes: [ADD_BONUSES, FINAL_TOTALS],
    A: [
      unit('cavalry', 9, 38_000, [300, 225, 105, 29, 27, 205, 815]),
      unit('archers', 10, 35_000, [335, 185, 82, 36, 21, 230, 605]),
      unit('footmen', 9, 41_000, [245, 340, 168, 18, 43, 155, 570]),
    ],
    B: [
      unit('cavalry', 10, 43_200, [520, 230, 108, 58, 28, 35, 830]),
      unit('archers', 9, 44_400, [575, 182, 80, 69, 20, 40, 600]),
      unit('footmen', 10, 46_800, [405, 350, 172, 35, 45, 28, 590]),
    ],
  },
  {
    modes: [FINAL_TOTALS, ADD_BONUSES],
    A: [
      unit('footmen', 10, 39_000, [325, 245, 265, 28, 31, 72, 600]),
      unit('cavalry', 9, 35_000, [410, 180, 195, 44, 23, 98, 790]),
      unit('archers', 10, 34_000, [455, 155, 160, 53, 18, 130, 615]),
    ],
    B: [
      unit('footmen', 9, 48_000, [320, 520, 85, 27, 65, 70, 595]),
      unit('cavalry', 10, 40_800, [415, 405, 78, 45, 50, 102, 800]),
      unit('archers', 9, 42_000, [450, 365, 62, 52, 44, 128, 610]),
    ],
  },
  {
    modes: [ADD_BONUSES, ADD_BONUSES],
    A: [
      unit('footmen', 9, 18_000, [285, 325, 160, 22, 40, 58, 555]),
      unit('cavalry', 10, 26_000, [425, 220, 105, 48, 26, 115, 840]),
      unit('archers', 10, 68_000, [475, 178, 74, 58, 20, 150, 620]),
    ],
    B: [
      unit('footmen', 10, 52_000, [310, 380, 182, 26, 48, 62, 590]),
      unit('archers', 9, 31_000, [420, 175, 76, 50, 21, 132, 585]),
      unit('cavalry', 9, 24_000, [365, 215, 98, 39, 25, 94, 770]),
    ],
  },
  {
    modes: [FINAL_TOTALS, FINAL_TOTALS],
    A: [
      unit('cavalry', 10, 62_000, [435, 240, 112, 49, 29, 118, 845]),
      unit('footmen', 9, 23_000, [270, 355, 174, 21, 45, 52, 565]),
      unit('archers', 9, 21_000, [410, 170, 72, 48, 19, 128, 580]),
    ],
    B: [
      unit('footmen', 10, 37_000, [315, 395, 190, 28, 50, 66, 605]),
      unit('cavalry', 9, 36_000, [375, 230, 108, 41, 28, 96, 775]),
      unit('archers', 10, 38_000, [465, 185, 78, 57, 22, 148, 625]),
    ],
  },
  {
    modes: [ADD_BONUSES, FINAL_TOTALS],
    A: [
      unit('archers', 9, 33_000, [385, 195, 92, 43, 24, 105, 575], {
        might: 8,
        resistance: 5,
        hp: 2,
      }),
      unit('footmen', 10, 34_000, [305, 365, 180, 25, 47, 60, 595]),
      unit('cavalry', 10, 32_000, [405, 225, 105, 46, 27, 104, 820]),
    ],
    B: [
      unit('cavalry', 9, 32_500, [398, 218, 102, 44, 26, 101, 825]),
      unit('archers', 10, 33_500, [392, 190, 89, 45, 23, 108, 580]),
      unit('footmen', 9, 34_500, [298, 358, 176, 24, 46, 57, 590]),
    ],
  },
  {
    modes: [FINAL_TOTALS, ADD_BONUSES],
    A: [
      unit('footmen', 10, 31_250, [342, 402, 192, 31, 51, 74, 618]),
      unit('archers', 9, 30_750, [448, 188, 81, 55, 22, 139, 604]),
      unit('cavalry', 10, 31_500, [421, 236, 111, 48, 29, 112, 842]),
    ],
    B: [
      unit('footmen', 9, 31_500, [336, 396, 188, 30, 50, 71, 615], {
        might: 5,
        resistance: 7,
        hp: 1,
      }),
      unit('archers', 10, 31_000, [454, 184, 79, 56, 21, 143, 607]),
      unit('cavalry', 9, 31_250, [416, 232, 108, 47, 28, 109, 839]),
    ],
  },
]);

function roundStat(value) {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

function buildEditableFields(specification) {
  const profile = getTroopProfile(specification.type, specification.tier);
  const unitValues = {
    attack: roundStat(profile.unitStats.attack + (specification.baseAdjustments.might ?? 0)),
    defense: roundStat(profile.unitStats.defense + (specification.baseAdjustments.resistance ?? 0)),
    hp: roundStat(profile.unitStats.hp + (specification.baseAdjustments.hp ?? 0)),
  };
  const baselines = { might: 100, resistance: 100, hp: 100 };
  const bonuses = Object.fromEntries(
    Object.entries(specification.stats).map(([key, value]) => [
      key,
      roundStat(Math.max(0, value - (baselines[key] ?? 0))),
    ])
  );

  return {
    type: specification.type,
    tier: specification.tier,
    troops: specification.troops,
    unitValues,
    bonuses,
    finals: { ...specification.stats },
  };
}

function buildSide(mode, specifications) {
  const rows = specifications.map((specification, index) => ({
    id: ROW_IDS[index],
    ...buildEditableFields(specification),
    open: index === 0,
    customized: index !== 0,
  }));
  const { id: _id, open: _open, customized: _customized, ...sideDefaults } = rows[0];
  return {
    mode,
    researchEnabled: false,
    researchSnapshot: createEmptyResearchSnapshot(),
    equipmentLoadout: createEmptyEquipmentLoadout(),
    capturedSourceSnapshot: createEmptyCapturedSourceSnapshot(),
    sideDefaults,
    rows,
  };
}

function buildSyntheticSetup(caseDefinition, seed) {
  const setup = buildSetupSnapshot({
    battleMode: 'pvp-field',
    sides: {
      A: buildSide(caseDefinition.modes[0], caseDefinition.A),
      B: buildSide(caseDefinition.modes[1], caseDefinition.B),
    },
    iterations: 1,
    seed,
    strikeVariancePct: 0,
  });
  setup.savedAt = FIXED_TIMESTAMP;
  return setup;
}

function copyObservedOutcome(simulated) {
  return {
    winner: simulated.winner,
    rounds: simulated.rounds,
    perRowCasualties: {
      A: [...simulated.perRowCasualties.A],
      B: [...simulated.perRowCasualties.B],
    },
    notes: '',
  };
}

function makeFixture(caseDefinition, index) {
  const seed = index + 1;
  const setup = buildSyntheticSetup(caseDefinition, seed);
  const config = setupSnapshotToEngineConfig(setup);
  const result = simulateBattle(config, {
    seed,
    strikeVariancePct: 0,
    includeEventLog: false,
    coefficients: SYNTHETIC_COEFFICIENTS,
  });
  if (result.winner === 'stalemate') {
    throw new Error(`Synthetic fixture ${seed} reached the 200-round cap.`);
  }

  const fixture = JSON.parse(
    buildBattleCalibrationFixture({
      setup,
      config,
      result,
      seed,
      variance: 0,
      generatedAt: FIXED_TIMESTAMP,
    })
  );
  fixture.observed = copyObservedOutcome(fixture.simulated);
  fixture.provenance = {
    submitter: 'synthetic-v2',
    reportDate: FIXED_REPORT_DATE,
    evidenceKind: 'synthetic-regression',
  };
  return fixture;
}

async function removeStaleSyntheticFixtures(expectedNames) {
  const entries = await readdir(FIXTURE_DIRECTORY, { withFileTypes: true });
  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /^v2-synthetic-\d+\.json$/u.test(entry.name) &&
          !expectedNames.has(entry.name)
      )
      .map((entry) => unlink(resolve(FIXTURE_DIRECTORY, entry.name)))
  );
}

async function main() {
  await mkdir(FIXTURE_DIRECTORY, { recursive: true });
  const fixtureNames = CASES.map(
    (_caseDefinition, index) => `v2-synthetic-${String(index + 1).padStart(2, '0')}.json`
  );
  await removeStaleSyntheticFixtures(new Set(fixtureNames));

  for (const [index, caseDefinition] of CASES.entries()) {
    const fixture = makeFixture(caseDefinition, index);
    const output = `${JSON.stringify(fixture, null, 2)}\n`;
    await writeFile(resolve(FIXTURE_DIRECTORY, fixtureNames[index]), output, 'utf8');
  }

  console.log(
    `Wrote ${CASES.length} deterministic v2 synthetic battle fixtures; legacy phase-1 files were preserved.`
  );
}

await main();
