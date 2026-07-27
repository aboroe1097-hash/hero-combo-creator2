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
      [30, 60],
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
      [30, 60],
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
    /const FULL_CORRECTION_STAT_KEYS = Object\.freeze\(\[[\s\S]*?'level50HeroCount'/u
  );
  assert.match(
    source,
    /export function buildAdminSubmissionCorrectionOverlay\([\s\S]*?submissionCorrection/u
  );
  assert.match(source, /function renderTroopInventory\(state, submission\)/u);
  assert.match(source, /stats\.troopRoster/u);
  assert.match(source, /bohAdminTroopInventoryTitle/u);
  assert.match(source, /\$\{renderTroopInventory\(state, effective\)\}/u);
  assert.match(source, /data-action="delete-submission"/u);
  assert.match(
    source,
    /state\.options\.confirm\?\.\(message\) \?\? (window\.confirm\(message\)|showConfirmDialog\(state, message\))/u
  );
  assert.match(source, /else if \(type === 'deleteSubmission'\)/u);
  assert.match(source, /if \(result === null\) return;[\s\S]*?clearDeletedSubmissionState/u);
  assert.match(
    source,
    /const reviewStatus = cleanText\(submission\?\.reviewStatus\)\.toLocaleLowerCase\(\) \|\| 'pending'/u
  );
  assert.doesNotMatch(source, /const reviewStatus = adapterReviewStatusToUi\(review\.status\)/u);
  assert.match(source, /escapeHtml\(reviewMatchesSubmission \? review\.note \|\| '' : ''\)/u);
  assert.match(
    source,
    /adapterReviewMatchesSubmissionRevision\(submission, review\) \? review\.note : ''/u
  );
  assert.match(source, /name="adminUsefulnessRating"/u);
  assert.match(source, /name="captainId"/u);
  assert.match(source, /name="notes"/u);
  assert.match(source, /closingPlayerId/u);
  assert.match(source, /name="rotationId"/u);
  assert.match(source, /data-action="edit-rotation"/u);
  assert.match(source, /data-action="remove-rotation"/u);
  assert.match(source, /else if \(type === 'removeRotation'\)/u);
});

test('admin scoring workflow exposes filters, batch review, corrections, and balance preview controls', () => {
  const source = readFileSync('js/admin-all-star-boh.js', 'utf8');

  assert.match(source, /aria-sort="\$\{ariaSort\}"/u);
  assert.match(source, /data-action="select-all-visible"/u);
  assert.match(source, /data-action="select-submission-row"/u);
  assert.match(source, /class="boh-admin-selection-checkbox"/u);
  assert.match(source, /checkbox\.indeterminate = selectedCount > 0/u);
  assert.match(source, /data-form="batch-review"/u);
  assert.match(source, /data-action="delete-selected-submissions"/u);
  assert.match(source, /'batchDeleteSubmissions'/u);
  assert.match(source, /'all-star-boh-batch-delete-partial'/u);
  assert.match(source, /data-action="export-signups"/u);
  assert.match(source, /data-action="score-audit-sort"/u);
  assert.match(source, /aria-sort="\$\{ariaSort\}"/u);
  assert.match(source, /player\?\.totalCastlePower \?\? player\?\.stats\?\.totalCastlePower/u);
  assert.match(source, /data-form="commitment-scores"/u);
  assert.match(source, /data-commitment-score-player/u);
  assert.match(source, /min="1" max="10000" step="1" inputmode="numeric"/u);
  assert.match(source, /adminBohCommitmentScoreForPlayer/u);
  assert.match(source, /data-score-diagnostic/u);
  assert.doesNotMatch(source, /data-form="score-override"/u);
  assert.match(source, /data-form="submission-corrections"/u);
  assert.match(source, /name="correction\.gameName"/u);
  assert.match(source, /name="correction\.reason"/u);
  assert.match(source, /data-correction-troop-row/u);
  assert.doesNotMatch(source, /data-form="stat-corrections"/u);
  assert.match(source, /data-form="team-builder-settings"/u);
  assert.match(source, /name="teamCount"/u);
  assert.match(source, /name="balanceMetric"/u);
  assert.match(source, /name="forcedTeam\.\$\{escapeHtml\(player\.playerId\)\}"/u);
  assert.match(source, /data-action="preview-balance-teams"/u);
  assert.match(source, /data-action="apply-balance-preview"/u);
  assert.match(source, /data-action="discard-balance-preview"/u);
  assert.doesNotMatch(source, /data-action="balance-teams"/u);
});

test('admin signup table keeps the wide desktop split and accessible checkbox contracts', () => {
  const css = readFileSync('css/admin-all-star-boh.css', 'utf8');

  assert.match(
    css,
    /\.boh-admin-review-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 2\.2fr\) minmax\(20rem, 0\.65fr\);[\s\S]*?\}/u
  );
  assert.match(
    css,
    /@media \(max-width: 1120px\)[\s\S]*?\.boh-admin-review-layout,[\s\S]*?grid-template-columns:\s*1fr;/u
  );
  assert.match(css, /\.boh-admin-selection-checkbox\s*\{[\s\S]*?accent-color:/u);
  assert.match(css, /min-height:\s*1\.15rem;/u);
  assert.match(css, /min-width:\s*1\.15rem;/u);
  assert.match(css, /\.boh-admin-selection-checkbox:focus-visible/u);
  assert.match(css, /\.boh-admin-selection-checkbox:disabled/u);
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.boh-admin-selection-checkbox/u);
});

test('manual commitment scoring has compact responsive audit styles', () => {
  const css = readFileSync('css/admin-all-star-boh.css', 'utf8');

  assert.match(css, /\.boh-admin-commitment-score-toolbar\s*\{[\s\S]*?display:\s*grid;/u);
  assert.match(css, /\.boh-admin-score-input \.boh-admin-input\s*\{[\s\S]*?text-align:\s*end;/u);
  assert.match(
    css,
    /\.boh-admin-legacy-override small\s*\{[\s\S]*?color:\s*var\(--(boh|ff)-gold\);/u
  );
  assert.match(css, /\.boh-admin-score-diagnostic\s*\{[\s\S]*?border:\s*1px solid/u);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*?\.boh-admin-commitment-score-toolbar\s*\{[\s\S]*?grid-template-columns:\s*1fr;/u
  );
});

test('guided team builder exposes stateful steps, readiness commands, imports, and advanced tools', () => {
  const source = readFileSync('js/admin-all-star-boh.js', 'utf8');

  assert.match(source, /class="boh-admin-command-deck"/u);
  assert.match(source, /aria-current="step"/u);
  assert.match(source, /data-step-status="\$\{status\}"/u);
  assert.match(source, /adminBohWorkflowImportRoster/u);
  assert.match(source, /adminBohWorkflowShapeTeams/u);
  assert.match(source, /adminBohWorkflowAddPlans/u);
  assert.match(source, /adminBohWorkflowValidatePublish/u);
  assert.match(source, /function renderTeamBuilderReadiness/u);
  assert.match(source, /class="boh-admin-readiness-bar"/u);
  assert.match(source, /data-action="validate-revision"/u);
  assert.match(source, /data-action="stage" data-stage="publish"/u);
  assert.match(
    source,
    /function renderTeamBuilderImportCenter[\s\S]*?renderMapperExactViewImport[\s\S]*?renderMapperRolePlanImport/u
  );
  assert.match(source, /<details class="boh-admin-advanced-tools">/u);
  assert.match(source, /adminBohAdvancedTeamTools/u);
  assert.match(source, /function renderAdvancedTeamActions[\s\S]*?preview-balance-teams/u);
  assert.match(source, /function renderAdvancedTeamActions[\s\S]*?auto-assign-ranked-roles/u);
  assert.match(source, /data-density="\$\{state\.teamBoardDensity\}"/u);
  assert.match(source, /data-columns="\$\{state\.teamBoardColumns\}"/u);
});

test('guided team builder styles keep desktop commands sticky and mobile content in flow', () => {
  const css = readFileSync('css/admin-all-star-boh.css', 'utf8');
  const primary = css.match(/\.boh-admin \.boh-admin-readiness-primary,[\s\S]*?\n\}/u)?.[0];

  assert.match(css, /\.boh-admin-command-deck ol\s*\{[\s\S]*?repeat\(4,/u);
  assert.match(css, /\.boh-admin-readiness-bar\s*\{[\s\S]*?position:\s*sticky;/u);
  assert.ok(primary, 'readiness primary action styles should exist');
  assert.doesNotMatch(primary, /gradient/u);
  assert.match(css, /\.boh-admin-import-center__grid\s*\{[\s\S]*?repeat\(2,/u);
  assert.match(css, /\.boh-admin-team-board\[data-columns='1'\]/u);
  assert.match(css, /\.boh-admin-team-board\[data-columns='2'\]/u);
  assert.match(css, /\.boh-admin-team-board\[data-columns='3'\]/u);
  assert.match(css, /\.boh-admin-team-board\[data-density='compact'\]/u);
  assert.match(css, /\.boh-admin-board-view-controls button:focus-visible/u);
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*?\.boh-admin-readiness-bar\s*\{[\s\S]*?position:\s*static;/u
  );
  assert.match(
    css,
    /@media \(max-width: 760px\)[\s\S]*?\.boh-admin-team-board\[data-columns\][\s\S]*?grid-template-columns:\s*1fr;/u
  );
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.boh-admin-command-deck/u);
});
