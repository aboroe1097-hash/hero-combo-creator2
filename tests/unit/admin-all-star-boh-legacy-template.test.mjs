import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createAdminAllStarBohStoreAdapter } from '../../js/admin-all-star-boh.js';

const LEGACY_PLAYER_NAMES = [
  'GoodnessGraycious',
  'Dizz.',
  '#MAKAY#',
  'Roman',
  'MalakaKiji',
  'Rohannis',
  'Maximus',
  'kassey',
  'RAKI',
  'Whitefyre',
  'Tazz',
  'Jasper99',
  'BiG BOIIE',
  'Neutrino10',
  'BabyKiji',
  'MalakAbo',
  'Sarafino',
  'Kratosk',
  'Adamant',
  'Dragon Master',
  'Peaceful Warrior',
  'Lord HtwoO',
  'RuCCaK',
  'DE OLIDOR',
  'Cold Heart',
  'MalikaZena',
  'Salazar',
  'Lord IKR',
  'Ligmaballs',
  '*Fernando*',
];

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function createPrimitiveStoreFixture() {
  let draft = null;
  const teams = new Map();
  const reviews = new Map();

  function revisionedSave(current, input, expectedRevision) {
    const actualRevision = Number(current?.revision || 0);
    assert.equal(expectedRevision, actualRevision);
    return { ...clone(input), revision: actualRevision + 1 };
  }

  return {
    get draft() {
      return draft;
    },
    get teams() {
      return teams;
    },
    async listSubmissions() {
      return [];
    },
    subscribeSubmissions() {
      return () => {};
    },
    async getReview(uid) {
      return clone(reviews.get(uid) || null);
    },
    async saveReview(uid, input, options) {
      const saved = revisionedSave(reviews.get(uid), input, options.expectedRevision);
      reviews.set(uid, saved);
      return clone(saved);
    },
    async getDraft() {
      return clone(draft);
    },
    subscribeDraft() {
      return () => {};
    },
    async saveDraft(input, options) {
      draft = revisionedSave(draft, input, options.expectedRevision);
      return clone(draft);
    },
    async getDraftTeam(teamId) {
      return clone(teams.get(teamId) || null);
    },
    subscribeDraftTeam() {
      return () => {};
    },
    async saveDraftTeam(teamId, input, options) {
      const saved = revisionedSave(teams.get(teamId), input, options.expectedRevision);
      teams.set(teamId, saved);
      return clone(saved);
    },
    async saveDraftBundle(bundle, options) {
      const savedTeams = {};
      for (const [teamId, input] of Object.entries(bundle.teams || {})) {
        savedTeams[teamId] = revisionedSave(
          teams.get(teamId),
          input,
          options.expectedTeamRevisions[teamId]
        );
      }
      const savedDraft = bundle.draft
        ? revisionedSave(draft, bundle.draft, options.expectedDraftRevision)
        : null;
      for (const [teamId, team] of Object.entries(savedTeams)) teams.set(teamId, team);
      if (savedDraft) draft = savedDraft;
      return { draft: clone(savedDraft), teams: clone(savedTeams) };
    },
    async publish(bundle) {
      return { current: { ...clone(bundle.current), revision: 1 } };
    },
    stop() {},
  };
}

test('safe legacy template matches the supplied structure without importing any legacy name', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  assert.deepEqual(
    snapshot.plan.roleGroups.map(({ label, capacity }) => [label, capacity]),
    [
      ['Offensive Team', 4],
      ['Rune Team', 2],
      ['Top Side', 3],
      ['Bot Side', 3],
    ]
  );
  assert.deepEqual(
    snapshot.plan.phases.map(({ startMinute, endMinute }) => [startMinute, endMinute]),
    [
      [0, 5],
      [5, 10],
      [10, 15],
      [15, 30],
    ]
  );
  assert.deepEqual(
    snapshot.plan.legions.map(({ label }) => label),
    ['Legion 1', 'Legion 2']
  );

  const imported = await adapter.dispatch({
    type: 'applyLegacyStructureTemplate',
    expectedRevision: snapshot.revision,
    payload: {
      sourceSeatCount: 15,
      targetSeatCount: 12,
      copyPhases: true,
      copyObjectiveCodes: true,
      copyRoleCapacities: false,
      copyPlayerAssignments: false,
      copyPlayerNames: false,
      requireExplicitRoleMapping: true,
      legacyPlayerNames: LEGACY_PLAYER_NAMES,
    },
  });
  snapshot = imported.snapshot;

  assert.equal(snapshot.teams.length, 6);
  assert.equal(snapshot.teams.flatMap((team) => team.seats).length, 72);
  assert.deepEqual(
    snapshot.plan.phases.map(({ startMinute, endMinute }) => [startMinute, endMinute]),
    [
      [0, 5],
      [5, 10],
      [10, 15],
      [15, 30],
    ]
  );
  const persistedStructure = JSON.stringify({
    draft: primitiveStore.draft,
    teams: [...primitiveStore.teams.values()],
  });
  for (const legacyName of LEGACY_PLAYER_NAMES) {
    assert.equal(
      persistedStructure.includes(legacyName),
      false,
      `legacy name must not be copied: ${legacyName}`
    );
  }

  const instructionResult = await adapter.dispatch({
    type: 'saveInstruction',
    expectedRevision: snapshot.revision,
    payload: {
      scope: 'seat',
      scopeId: '9',
      seatNumber: 9,
      teamId: 'team-1',
      phaseId: 'phase-5-10',
      legionId: 'legion-2',
      action: 'Build towers',
      loadout: 'T1s and speed heroes',
      teleport: 'Teleport to Tower 3 [T3]',
      instruction: 'Stay on the side opposing the top map.',
      note: 'No teleport until the phase begins.',
    },
  });
  snapshot = instructionResult.snapshot;
  const seatRule = primitiveStore.draft.plan.seatOverrides.at(-1);
  assert.equal(seatRule.teamId, 'team-1');
  assert.equal(seatRule.phaseId, 'phase-5-10');
  assert.equal(seatRule.legionId, 'legion-2');
  assert.equal(seatRule.seatNumber, 9);
  assert.equal(seatRule.instruction.teleport, 'Teleport to Tower 3 [T3]');
  assert.equal(seatRule.instruction.note, 'No teleport until the phase begins.');
  assert.equal(snapshot.plan.instructions.at(-1).note, 'No teleport until the phase begins.');

  await assert.rejects(
    adapter.dispatch({
      type: 'applyLegacyStructureTemplate',
      expectedRevision: snapshot.revision,
      payload: {
        sourceSeatCount: 15,
        targetSeatCount: 12,
        copyPhases: true,
        copyObjectiveCodes: true,
        copyRoleCapacities: true,
        copyPlayerAssignments: false,
        copyPlayerNames: false,
        requireExplicitRoleMapping: true,
      },
    }),
    (error) => error?.code === 'all-star-boh-legacy-unsafe'
  );

  adapter.stop();
});

test('admin plan editor exposes every scope, route, Legion, teleport, and note control', () => {
  const source = readFileSync('js/admin-all-star-boh.js', 'utf8');
  const instructionForm = source.match(
    /<form class="boh-admin-stack boh-admin-instruction-form"[\s\S]*?<\/form>/u
  )?.[0];

  assert.ok(instructionForm, 'instruction form should render');
  assert.match(instructionForm, /name="legionId"/u);
  assert.match(source, /data-scope="global"/u);
  assert.match(source, /data-scope="role"/u);
  assert.match(source, /data-scope="seat"/u);
  assert.match(source, /data-scope="player"/u);
  assert.match(instructionForm, /name="startObjectiveId"/u);
  assert.match(instructionForm, /name="viaObjectiveIds"/u);
  assert.match(instructionForm, /name="pathObjectiveIds"/u);
  assert.match(instructionForm, /name="objectiveId"/u);
  assert.match(instructionForm, /name="teleport"/u);
  assert.match(instructionForm, /name="note"/u);
});

test('admin review and rotation editors preserve canonical editable fields', () => {
  const source = readFileSync('js/admin-all-star-boh.js', 'utf8');
  assert.match(source, /\['totalCastlePower', 'adminBohStatTotalPower'/u);
  assert.match(source, /\['unitSpecialtyPower', 'adminBohStatUnitSpecialtyPower'/u);
  assert.match(source, /\['artifactPower', 'adminBohStatArtifactPower'/u);
  assert.match(source, /\['royalTechPower', 'adminBohStatRoyalTechPower'/u);
  assert.match(
    source,
    /const CORRECTABLE_STAT_KEYS = Object\.freeze\(\[[\s\S]*?'unitSpecialtyPower'[\s\S]*?'artifactPower'[\s\S]*?'royalTechPower'/u
  );
  assert.match(
    source,
    /const correctionEntries = statEntries\(state, submission\)\.filter\(\(\{ key \}\) =>[\s\S]*?CORRECTABLE_STAT_KEYS\.includes\(key\)/u
  );
  assert.match(
    source,
    /const statCorrections = Object\.fromEntries\([\s\S]*?CORRECTABLE_STAT_KEYS/u
  );
  assert.match(source, /function renderTroopInventory\(state, submission\)/u);
  assert.match(source, /stats\.troopRoster/u);
  assert.match(source, /bohAdminTroopInventoryTitle/u);
  assert.match(source, /\$\{renderTroopInventory\(state, submission\)\}/u);
  assert.match(source, /data-action="delete-submission"/u);
  assert.match(source, /state\.options\.confirm\?\.\(message\) \?\? window\.confirm\(message\)/u);
  assert.match(source, /else if \(type === 'deleteSubmission'\)/u);
  assert.match(source, /const reviewStatus = adapterReviewStatusToUi\(review\.status\)/u);
  assert.match(source, /escapeHtml\(review\.note \|\| ''\)/u);
  assert.match(source, /name="adminUsefulnessRating"/u);
  assert.match(source, /name="captainId"/u);
  assert.match(source, /name="notes"/u);
  assert.match(source, /closingPlayerId/u);
  assert.match(source, /name="rotationId"/u);
  assert.match(source, /data-action="edit-rotation"/u);
  assert.match(source, /data-action="remove-rotation"/u);
  assert.match(source, /else if \(type === 'removeRotation'\)/u);
});
