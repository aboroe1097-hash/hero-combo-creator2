import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBohCommandView, extractBohMapTargets } from '../../js/all-star-boh-command-view.js';
import {
  BOH_STAGE1_MILESTONES,
  BOH_STAGE1_PHASES,
  bohStage1Timeline,
} from '../../js/all-star-boh-plan.js';
import { bohStage1Objectives, bohStructureCodes } from '../../js/all-star-boh-field.js';

function teamFixture() {
  return {
    id: 'team-1',
    captainId: 'player-1',
    coLeaderIds: ['player-2'],
    seats: Array.from({ length: 12 }, (_, index) => ({
      seatNumber: index + 1,
      playerId: `player-${index + 1}`,
      displayName: `Player ${index + 1}`,
      roleGroupId: index < 3 ? 'offensive' : 'rune',
      side: index < 3 ? 'offensive' : 'rune',
      lane: index === 1 ? 'backup' : 'main',
    })),
  };
}

test('command view preserves mapper lanes, roles, leadership, and explicit backup semantics', () => {
  const view = buildBohCommandView({
    team: teamFixture(),
    playerId: 'player-2',
    phaseId: 'phase-1',
    phases: BOH_STAGE1_PHASES,
    milestones: BOH_STAGE1_MILESTONES,
    timelineBuilder: bohStage1Timeline,
    structureCodes: bohStructureCodes,
    objectives: bohStage1Objectives(),
  });

  assert.equal(view.roster.length, 12);
  assert.equal(view.roster[0].commandRole, 'captain');
  assert.equal(view.roster[1].commandRole, 'co-leader');
  assert.equal(view.roster[1].isBackup, true);
  assert.equal(
    view.assignments[1].orders.every((order) => order.standby),
    true
  );
  assert.equal(view.assignments[10].isBackup, false);
  assert.equal(
    view.assignments[10].orders.some((order) => order.standby),
    false
  );
  assert.equal(
    view.roleLanes.some((lane) => lane.id === 'backup'),
    true
  );
  assert.equal(view.milestone.phaseId, 'phase-1');
});

test('command view fallback and supplied phase lists render every published phase dynamically', () => {
  const fallback = buildBohCommandView({ phaseId: 'phase-5' });
  assert.equal(fallback.phases.length, 5);
  assert.deepEqual(
    fallback.phases.map(({ id, startMinute, endMinute }) => ({ id, startMinute, endMinute })),
    [
      { id: 'phase-1', startMinute: 0, endMinute: 5 },
      { id: 'phase-2', startMinute: 5, endMinute: 10 },
      { id: 'phase-3', startMinute: 10, endMinute: 15 },
      { id: 'phase-4', startMinute: 15, endMinute: 30 },
      { id: 'phase-5', startMinute: 30, endMinute: 60 },
    ]
  );
  assert.equal(fallback.phaseId, 'phase-5');

  const supplied = buildBohCommandView({
    phaseId: 'phase-6',
    phases: [...fallback.phases, { id: 'phase-6', startMinute: 60, endMinute: 90, order: 6 }],
  });
  assert.equal(supplied.phases.length, 6);
  assert.equal(supplied.phaseId, 'phase-6');
  assert.equal(supplied.phase.label, 'Phase 6');
});

test('map target extraction deduplicates each player/code and preserves coordinates', () => {
  const objectives = bohStage1Objectives();
  const targets = extractBohMapTargets(
    [
      {
        playerId: 'player-1',
        displayName: 'Player 1',
        isCurrentPlayer: true,
        orders: [
          { entry: { instruction: { action: 'Capture [CC1]' } } },
          { entry: { instruction: { target: 'Defend [CC1]' } } },
        ],
      },
    ],
    { objectives, structureCodes: bohStructureCodes }
  );

  assert.equal(targets.length, 1);
  assert.equal(targets[0].code, 'CC1');
  assert.equal(targets[0].isCurrentPlayer, true);
  assert.equal(Number.isFinite(targets[0].x), true);
  assert.equal(Number.isFinite(targets[0].y), true);
});
