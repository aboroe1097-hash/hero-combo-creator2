import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCompetitionComparisonHtml,
  createCompetitionGrowthSection,
} from '../../js/vts-score-admin-view.js';
import { DEAD_TROOP_COUNT_KEYS } from '../../js/dead-troops.js';

const DEAD_TROOP_COUNTS = Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));

test('the admin comparison is read-only and previews an automatic unique name match', async () => {
  const section = createCompetitionGrowthSection({
    t: (key) => key,
    num: String,
    signed: String,
    load: async () => ({
      season: 'competition-12',
      submissions: [
        {
          submissionUid: 'new',
          status: 'submitted',
          gameName: 'MalakAbo',
          stats: { totalCastlePower: 1000 },
          commitment: { publicComparisonConsent: true },
        },
      ],
      raceScores: [
        {
          submissionUid: 'new',
          schemaVersion: 2,
          powerValues: { totalCastlePower: 1200 },
          deadTroopCounts: DEAD_TROOP_COUNTS,
          updatedAt: 2000,
        },
      ],
      baselineRaceScores: [
        {
          submissionUid: 'old',
          gameName: 'MalakAbo',
          schemaVersion: 2,
          powerValues: { totalCastlePower: 800 },
          deadTroopCounts: DEAD_TROOP_COUNTS,
        },
      ],
      schedule: { reuploadOpensAt: 1000, reuploadClosesAt: 3000 },
    }),
  });
  const element = { innerHTML: '', querySelectorAll: () => [] };
  section.mount(element);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(element.innerHTML, /MalakAbo/);
  assert.match(element.innerHTML, /c12SourceVtsScore/);
  assert.match(element.innerHTML, /data-compare="left"/);
  assert.doesNotMatch(element.innerHTML, /data-comp12-(publish|save|server|candidate)/);
});

test('the compare panel marks the higher current value for any two players', () => {
  const field = (baseline, final) => ({
    baseline,
    final,
    abs: final === null ? null : final - baseline,
    pct: final === null ? null : ((final - baseline) / baseline) * 100,
  });
  const rows = [
    {
      gameName: 'Alpha',
      fields: {
        totalCastlePower: field(1000, 1200),
        troopPower: field(800, 1500),
        buildingPower: field(100, null),
      },
    },
    {
      gameName: 'Bravo',
      fields: {
        totalCastlePower: field(2000, 2100),
        troopPower: field(500, 950),
        buildingPower: field(100, null),
      },
    },
  ];
  const html = buildCompetitionComparisonHtml(rows, {
    left: 'Alpha',
    right: 'Bravo',
    t: (key) => key,
    label: (name) => name,
    num: (value) => String(value),
    signed: (value) => `+${value}`,
  });
  assert.match(html, /data-compare="left"/);
  assert.match(html, /data-compare="right"/);
  // Bravo leads on total power, Alpha leads on troops; a pending category with
  // no re-upload marks neither and renders a dash.
  assert.equal((html.match(/data-leads="true"/g) || []).length, 2);
  assert.match(html, /buildingPower[\s\S]*?—[\s\S]*?—/);
  // The pickers list every player and honour the current selection.
  assert.match(html, /<option value="Alpha" selected>/);
  assert.match(html, /<option value="Bravo" selected>/);
});
