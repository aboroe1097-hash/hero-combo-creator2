import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createAdminAllStarBohStoreAdapter } from '../../js/admin-all-star-boh.js';
import { BOH_STAGE1_LEGIONS, BOH_STAGE1_PHASES } from '../../js/all-star-boh-plan.js';

const adminPage = readFileSync('admin.html', 'utf8');
const adminTab = readFileSync('tabs/admin.html', 'utf8');
const adminModule = readFileSync('js/admin-all-star-boh.js', 'utf8');
const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

const roleGroups = [
  { id: 'offensive', label: 'Offensive', capacity: 3, order: 1 },
  { id: 'top', label: 'Top Side', capacity: 3, order: 2 },
  { id: 'bottom', label: 'Bot Side', capacity: 3, order: 3 },
  { id: 'rune', label: 'Rune', capacity: 3, order: 4 },
];

function createRuntimeStore({ authoredTeamPlan = null } = {}) {
  const players = Array.from({ length: 24 }, (_, index) => {
    const id = `player-${index + 1}`;
    return {
      id,
      uid: `uid-${index + 1}`,
      playerId: id,
      gameName: `Signup ${index + 1}`,
      status: 'submitted',
      revision: 1,
    };
  });
  const team = (teamIndex) => {
    const offset = teamIndex * 12;
    return {
      id: `team-${teamIndex + 1}`,
      revision: 1,
      number: teamIndex + 1,
      name: `Team ${teamIndex + 1}`,
      color: '#123456',
      captainId: `player-${offset + 1}`,
      coLeaderIds: [],
      ...(teamIndex === 1 && authoredTeamPlan ? { plan: authoredTeamPlan } : {}),
      seats: Array.from({ length: 12 }, (_, index) => ({
        seatNumber: index + 1,
        playerId: `player-${offset + index + 1}`,
        displayName: `Seat ${offset + index + 1}`,
        lane: teamIndex === 0 && index === 1 ? 'backup' : 'main',
      })),
    };
  };
  const draft = {
    revision: 7,
    teamCount: 2,
    teamIds: ['team-1', 'team-2'],
    playerIds: players.map((player) => player.playerId),
    plan: {
      roleGroups,
      phases: BOH_STAGE1_PHASES.map((phase) => ({ ...phase })),
      legions: BOH_STAGE1_LEGIONS.map((legion) => ({ ...legion })),
      objectives: [],
      roleDefaults: [],
      seatOverrides: [],
      playerOverrides: [],
      instructions: [],
      rotations: [],
      notes: [],
    },
  };
  const store = {
    published: [],
    async listSubmissions() {
      return players;
    },
    async getReview() {
      return { status: 'verified', stale: false, submissionRevision: 1 };
    },
    async saveReview() {},
    async getDraft() {
      return draft;
    },
    async saveDraft() {},
    async getDraftTeam(teamId) {
      return team(teamId === 'team-2' ? 1 : 0);
    },
    async saveDraftTeam() {},
    async saveDraftBundle() {},
    async getPublication() {
      return { revision: 3, announcementPublished: true, planPublished: false };
    },
    async publish(bundle) {
      store.published.push(bundle);
      return { current: { ...bundle.current, revision: 4 } };
    },
    async subscribeSubmissions() {
      return () => {};
    },
    async subscribeDraft() {
      return () => {};
    },
    async subscribeDraftTeam() {
      return () => {};
    },
  };
  return store;
}

test('Admin VTS places the lazy All-Star BoH tab between Alliance View and Eden votes', () => {
  const allianceTab = adminTab.indexOf('data-subtab="allianceView"');
  const allStarTab = adminTab.indexOf('data-subtab="allStarBoh"');
  const edenVotesTab = adminTab.indexOf('data-subtab="edenVotes"');

  assert.ok(allianceTab >= 0, 'Alliance View tab should exist');
  assert.ok(allStarTab > allianceTab, 'All-Star BoH should follow Alliance View');
  assert.ok(edenVotesTab > allStarTab, 'All-Star BoH should precede Eden X1 Votes');
  assert.match(adminTab, /id="dashSubtabAllStarBoh"[\s\S]*?id="dashAllStarBohRoot"/);
  assert.match(adminTab, /data-i18n="adminBohTab">All-Star BoH</);
  assert.doesNotMatch(adminPage, /href="css\/admin-all-star-boh\.css(?:\?[^"\s]+)?"/);
  assert.match(dashboard, /import\('\.\.\/css\/admin-all-star-boh\.css'\)/);
});

test('Admin VTS loads the All-Star modules only when their tab renders', () => {
  assert.doesNotMatch(
    dashboard,
    /^import\s+[\s\S]*?from\s+['"]\.\/(?:admin-)?all-star-boh[^'"]*['"]/m
  );
  assert.match(dashboard, /let allStarBohModulePromise = null;/);
  assert.match(dashboard, /let allStarBohMountPromise = null;/);
  assert.match(dashboard, /let allStarBohController = null;/);
  assert.match(
    dashboard,
    /if \(name === 'allStarBoh'\) void ensureAllStarBohMountedOrUpdated\(\);/
  );
  assert.match(
    dashboard,
    /Promise\.all\(\[[\s\S]*?import\('\.\/admin-all-star-boh\.js'\)[\s\S]*?import\('\.\/all-star-boh-store\.js'\)[\s\S]*?import\('\.\/i18n\/admin-all-star-boh\/index\.js'\)[\s\S]*?import\('\.\.\/css\/admin-all-star-boh\.css'\)[\s\S]*?\]\)/
  );
  assert.match(dashboard, /adminModule\.initializeAdminAllStarBoh\(/);
});

test('Admin All-Star mount injects the verified admin context and authoritative BoH season', () => {
  assert.match(dashboard, /await window\.getVtsAdminFirestoreContext\(\)/);
  assert.match(dashboard, /const uid = String\(context\?\.user\?\.uid \|\| ''\)\.trim\(\);/);
  assert.match(dashboard, /tokenResult\?\.claims\?\.admin === true/);
  assert.match(
    dashboard,
    /storeModule\.getAllStarBohActiveConfig\(\{[\s\S]*?db: context\.db,[\s\S]*?firestore: context\.firestore,[\s\S]*?\}\)/
  );
  assert.match(dashboard, /seasonId: config\.activeSeason/);
  const optionsLoader = dashboard.match(
    /async function getAllStarBohAdminStoreOptions[\s\S]*?\n\}/
  )?.[0];
  assert.ok(optionsLoader, 'All-Star admin store options loader should exist');
  assert.doesNotMatch(optionsLoader, /currentEdenVoteSeason/);
  assert.match(
    dashboard,
    /storeModule\.createAllStarBohAdminStore\(\{\s*\.\.\.\(await getAllStarBohAdminStoreOptions\(storeModule\)\),[\s\S]*?heroNames:[\s\S]*?researchTreeIds:[\s\S]*?\}\)/
  );
  assert.match(dashboard, /heroMetadata:\s*heroModule\.allHeroesData \|\| \[\]/);
  assert.match(
    dashboard,
    /researchMetadata:\s*\(\) =>[\s\S]*?researchI18nModule\.researchTreeText/
  );
  assert.match(
    dashboard,
    /adminModule\.createAdminAllStarBohStoreAdapter\(adminStore,[\s\S]*?ALL-STAR BOH ADMIN LIVE REFRESH ERROR/
  );
  assert.match(
    dashboard,
    /validatePublication:\s*adminModule\.validateAdminAllStarBohPublicationBundle/
  );
  assert.match(
    dashboard,
    /paidUsableHeroNames:\s*\(heroModule\.allHeroesData \|\| \[\]\)[\s\S]*?\.filter\(\(hero\) => hero\.State === 'Paid'\)[\s\S]*?\.map\(\(hero\) => hero\.name\)/
  );
});

test('Admin scoring builder registers every new component with a zero default', () => {
  const rows = [
    ['unitSpecialtyPower', 'adminBohScoreUnitSpecialtyPower', 'Unit specialty power'],
    ['rocLevel', 'adminBohScoreRocLevel', 'RoC level'],
    ['paidUsableHero', 'adminBohScorePaidUsableHero', 'Each paid usable hero'],
    [
      'loftyTroopMillion',
      'adminBohScoreLoftyTroopMillion',
      'S (Lofty) troops — points per 1 million',
    ],
    [
      'enhancedT10TroopMillion',
      'adminBohScoreEnhancedT10TroopMillion',
      'Enhanced T10 troops — points per 1 million',
    ],
  ];
  for (const [key, translationKey, label] of rows) {
    const tuple = new RegExp(
      `'${key}',\\s*'${translationKey}',\\s*'${label.replace(/[()]/g, '\\$&')}',\\s*0`,
      'u'
    );
    assert.match(adminModule, tuple);
  }
  assert.match(adminModule, /SCORE_COMPONENTS\.map\([\s\S]*?name="weight\.\$\{key\}"/u);
});

test('Admin All-Star lifecycle refreshes live state and language, then destroys on sign-out', () => {
  assert.match(
    dashboard,
    /if \(allStarBohController\) \{[\s\S]*?await allStarBohController\.refresh\?\.\(\);[\s\S]*?return allStarBohController;/
  );
  assert.match(
    dashboard,
    /allStarBohController\?\.refreshLanguage\?\.\(allStarBohAdminT, getDashboardLang\(\)\)/
  );
  assert.match(
    dashboard,
    /state\._signingOut = true;[\s\S]*?allStarBohController\?\.destroy\?\.\(\);[\s\S]*?allStarBohController = null;/
  );
  assert.match(
    dashboard,
    /window\.VTS_ALL_STAR_BOH_TRANSLATE \|\| window\.allStarBohText[\s\S]*?return dashT\(key, vars\);/
  );
});

test('Admin All-Star publish stage owns the event schedule editor hooks', () => {
  assert.match(adminModule, /function renderEventScheduleEditor\(state\)/);
  assert.match(adminModule, /data-form="event-schedule"/);
  assert.match(adminModule, /data-action="add-schedule-milestone"/);
  assert.match(adminModule, /data-action="move-schedule-milestone"/);
  assert.match(adminModule, /data-action="remove-schedule-milestone"/);
  assert.match(adminModule, /'saveEventSchedule'/);
  assert.match(adminModule, /adminStore\.saveEventSchedule\(schedule, \{\s*expectedRevision,/);
  assert.doesNotMatch(adminTab, /event-schedule|bohScheduleTitle/);
});

test('hidden event schedules can save without native or adapter time requirements', () => {
  assert.match(adminModule, /if \(schedule\.status !== 'published'\) return errors;/);
  assert.match(
    adminModule,
    /const requiredWhenPublished = schedule\.status === 'published' \? 'required' : '';/
  );
  assert.doesNotMatch(adminModule, /name="eventStartsAt"[\s\S]{0,140}required \/><\/label>/);
  assert.match(adminModule, /name="eventStartsAt"[\s\S]{0,180}\$\{requiredWhenPublished\}/);
  assert.match(adminModule, /name="milestoneStartsAt"[\s\S]{0,220}\$\{requiredWhenPublished\}/);
});

test('runtime Stage-1 team plans use occupied seats without overwriting authored team plans', async () => {
  const authoredTeamPlan = {
    id: 'authored-team-plan',
    label: 'Authored Team 2 Plan',
    roleGroups,
    phases: BOH_STAGE1_PHASES.map((phase) => ({ ...phase })),
    legions: BOH_STAGE1_LEGIONS.map((legion) => ({ ...legion })),
    objectives: [],
    roleDefaults: [],
    seatOverrides: [],
    playerOverrides: [
      {
        id: 'authored-player-13',
        teamId: 'team-2',
        phaseId: 'phase-1',
        legionId: 'legion-1',
        playerId: 'player-13',
        order: 1,
        instruction: { action: 'Authored instruction wins' },
      },
    ],
    instructions: [],
    rotations: [],
    notes: [],
  };
  const adapter = createAdminAllStarBohStoreAdapter(createRuntimeStore({ authoredTeamPlan }));
  const snapshot = await adapter.start();
  const [generatedTeam, authoredTeam] = snapshot.teams;

  assert.notEqual(generatedTeam.plan, authoredTeam.plan, 'teams receive distinct plan objects');
  assert.equal(generatedTeam.plan.generated, true);
  assert.deepEqual(authoredTeam.plan, authoredTeamPlan);
  assert.equal(
    snapshot.plan.playerOverrides.some((rule) => rule.playerId === 'player-1'),
    true
  );
  assert.equal(
    snapshot.plan.playerOverrides.some((rule) => rule.playerId === 'player-13'),
    false
  );
  assert.match(
    snapshot.plan.instructions.find((rule) => rule.playerId === 'player-1')?.action || '',
    /Stronghold|Watch Post|Command Center|Rally|Crystal/u
  );
});

test('runtime Stage-1 defaults reach player publication projections', async () => {
  const store = createRuntimeStore();
  const adapter = createAdminAllStarBohStoreAdapter(store);
  const snapshot = await adapter.start();

  await adapter.dispatch({
    type: 'validateRevision',
    payload: { expectedRevision: snapshot.revision },
  });
  await adapter.dispatch({ type: 'publishPlan', payload: { expectedRevision: snapshot.revision } });

  const published = store.published.at(-1);
  const player = published.players['uid-1'];
  assert.equal(player.playerId, 'player-1');
  assert.equal(player.timeline[0].gameName, 'Signup 1');
  assert.equal(player.timeline[0].instruction.action.length > 0, true);
  assert.equal(player.timeline[0].instructionSources, undefined);
  assert.equal(player.plan.phases[0].id, 'phase-1');
  assert.equal(published.players['uid-2'].timeline[0].instruction.standby, true);
  assert.equal(
    published.players['uid-11'].timeline.some((entry) => entry.instruction.standby),
    false
  );
});
