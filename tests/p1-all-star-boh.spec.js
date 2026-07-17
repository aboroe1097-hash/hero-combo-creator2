import { expect, test } from '@playwright/test';

const EXTERNAL_REQUEST =
  /^https:\/\/(?!127\.0\.0\.1(?::\d+)?(?:\/|$)|localhost(?::\d+)?(?:\/|$))/iu;
const PRIVATE_PLAYER_MODULES = [
  '/js/all-star-boh.js',
  '/js/all-star-boh-model.js',
  '/js/all-star-boh-ocr.js',
  '/js/all-star-boh-store.js',
  '/js/i18n/all-star-boh/index.js',
];

const PHASES = [
  { id: 'phase-0-5', label: '0-5 Minutes', startMinute: 0, endMinute: 5, order: 1 },
  { id: 'phase-5-10', label: '5-10 Minutes', startMinute: 5, endMinute: 10, order: 2 },
  { id: 'phase-10-15', label: '10-15 Minutes', startMinute: 10, endMinute: 15, order: 3 },
  { id: 'phase-15-30', label: '15-30 Minutes', startMinute: 15, endMinute: 30, order: 4 },
];

const LEGIONS = [
  { id: 'legion-1', label: 'Legion 1', order: 1 },
  { id: 'legion-2', label: 'Legion 2', order: 2 },
];

const ROLES = [
  { id: 'offensive', label: 'Offensive Team', capacity: 4, color: '#ef4444', order: 1 },
  { id: 'rune', label: 'Rune Team', capacity: 2, color: '#a855f7', order: 2 },
  { id: 'top', label: 'Top Side', capacity: 3, color: '#38bdf8', order: 3 },
  { id: 'bottom', label: 'Bottom Side', capacity: 3, color: '#22c55e', order: 4 },
];

function roleForSeat(seatNumber) {
  if (seatNumber <= 4) return ROLES[0];
  if (seatNumber <= 6) return ROLES[1];
  if (seatNumber <= 9) return ROLES[2];
  return ROLES[3];
}

function createTeam(teamNumber) {
  const id = `team-${teamNumber}`;
  return {
    id,
    teamId: id,
    number: teamNumber,
    name: `All-Star Team ${teamNumber}`,
    captainId: `player-${teamNumber}-1`,
    seats: Array.from({ length: 12 }, (_unused, index) => {
      const seatNumber = index + 1;
      const role = roleForSeat(seatNumber);
      return {
        id: `${id}-seat-${seatNumber}`,
        seatNumber,
        playerId: `player-${teamNumber}-${seatNumber}`,
        displayName: `Player ${teamNumber}-${String(seatNumber).padStart(2, '0')}`,
        roleGroupId: role.id,
        roleLabel: role.label,
        locked: seatNumber === 1,
      };
    }),
  };
}

function createPlayerFixture() {
  const teams = Array.from({ length: 6 }, (_unused, index) => createTeam(index + 1));
  teams[1].name = 'Team 2';
  const objectives = [
    { id: 'spawn', code: 'SPAWN', label: 'South Spawn', x: 8, y: 88 },
    { id: 'tower-3', code: 'T3', label: 'Tower 3', x: 50, y: 50 },
    { id: 'cc1', code: 'CC1', label: 'Command Center 1', x: 88, y: 12 },
    { id: 'rune', code: 'RUNE', label: 'Primary Rune', x: 50, y: 26 },
  ];
  const timeline = LEGIONS.flatMap((legion, legionIndex) =>
    PHASES.map((phase, phaseIndex) => {
      const role = ROLES[(phaseIndex + legionIndex) % ROLES.length];
      return {
        phaseId: phase.id,
        phaseLabel: phase.label,
        legionId: legion.id,
        legionLabel: legion.label,
        startMinute: phase.startMinute,
        endMinute: phase.endMinute,
        roleGroupId: role.id,
        roleLabel: role.label,
        rotated: phaseIndex === 2,
        instruction: {
          action: `${legion.label} phase ${phaseIndex + 1} action`,
          target: phaseIndex === 0 ? 'Command Center 1' : `Phase ${phaseIndex + 1} target`,
          loadout: phaseIndex < 2 ? 'T1s and speed heroes' : 'T9 combat march',
          teleport: phaseIndex === 1 ? 'Teleport to Tower 3' : 'No teleport',
          note: phaseIndex === 2 ? 'Follow the live R5 call if it changes.' : '',
          startObjectiveId: 'spawn',
          viaObjectiveIds: phaseIndex === 3 ? [] : ['tower-3'],
          objectiveId: phaseIndex === 3 ? 'rune' : 'cc1',
        },
      };
    })
  );
  return {
    seasonId: 'season-2026',
    uid: 'player-1-1',
    submission: {
      playerId: 'player-1-1',
      gameName: 'Player 1-01',
      status: 'submitted',
      revision: 2,
      entryMethod: 'manual',
      preferredTeammates: ['Player 2-01', 'Player 3-01'],
      stats: {
        totalCastlePower: 1_000_000_000,
        troopPower: 400_000_000,
        buildingPower: 100_000_000,
        technologyPower: 200_000_000,
        heroCombatPower: 200_000_000,
        dragonPower: 100_000_000,
        level50HeroCount: 8,
        rocLevel: 12,
        t9TroopTypes: ['cavalry', 'archers'],
        readySpeedHeroes: ['lionheart'],
        usableHeroNames: ['Lionheart', 'Cao Cao'],
        researchProgressPct: { d1956263: 0, b2691f74: 100 },
      },
      commitment: {
        availability: 'all',
        fightingTimeIds: ['+8', '+12'],
        preferredRole: 'offensive',
        unavailableTimes: '',
        canTeleport: true,
        canUseVoice: true,
        planCommitment: true,
        notes: 'Ready.',
      },
    },
    epicPreferences: {
      gameName: 'Player 1-01',
      lanePreferences: ['south', 'north'],
      timePreferences: ['+8'],
      revision: 2,
    },
    submissionFeedback: {
      status: 'needs_correction',
      note: 'Please confirm your troop power before teams are locked.',
      submissionRevision: 2,
      reviewRevision: 3,
      revision: 1,
    },
    publication: {
      status: 'live',
      announcementPublished: true,
      planPublished: true,
      revision: 7,
      activePlanRevision: 7,
      eventName: 'All-Star BoH 2026',
      updatedAtMs: 1_787_000_000_000,
      teamIds: teams.map((team) => team.id),
    },
    personalPlan: {
      playerId: 'player-1-1',
      displayName: 'Player 1-01',
      teamId: 'team-1',
      teamNumber: 1,
      teamName: 'All-Star Team 1',
      seatNumber: 1,
      roleGroupId: 'offensive',
      roleLabel: 'Offensive Team',
      updatedAtMs: 1_787_000_000_000,
      plan: { roleGroups: ROLES, phases: PHASES, legions: LEGIONS, objectives },
      timeline,
    },
    teams,
  };
}

function createAdminFixture() {
  const teams = Array.from({ length: 6 }, (_unused, index) => createTeam(index + 1));
  const submissions = teams.flatMap((team) =>
    team.seats.map((seat, index) => ({
      playerId: seat.playerId,
      displayName: seat.displayName,
      gameName: seat.displayName,
      alliance: index % 2 ? 'VTS' : 'V3S',
      server: '1097',
      reviewStatus: index % 5 === 0 ? 'pending' : 'confirmed',
      stats: {
        totalCastlePower: 300_000_000 + team.number * 10_000_000 + seat.seatNumber * 100_000,
        troopPower: 120_000_000,
        buildingPower: 45_000_000,
        technologyPower: 55_000_000,
        heroCombatPower: 70_000_000,
        dragonPower: 20_000_000,
        ...(seat.playerId === 'player-1-1'
          ? {
              usableHeroNames: ['Lionheart', 'Al Fatih'],
              researchProgressPct: { d1956263: 0, b2691f74: 100 },
            }
          : {}),
      },
      commitment: {
        availability: 'all',
        preferredRole: seat.playerId === 'player-1-1' ? 'top' : seat.roleGroupId,
        ...(seat.playerId === 'player-1-1' ? { fightingTimeIds: ['+8', '+20'] } : {}),
      },
    }))
  );
  const scores = submissions.map((submission, index) => ({
    playerId: submission.playerId,
    displayName: submission.displayName,
    finalScore: 1_000_000 - index * 1_000,
    breakdown: { totalCastlePower: 500_000 - index * 100 },
  }));
  return {
    revision: 11,
    event: { teamCount: 6, rosterSize: 12, seasonId: 'season-2026' },
    submissions,
    scores,
    scoring: {
      activeVersion: {
        id: 'score-v1',
        label: 'Balanced value v1',
        weights: {
          totalCastlePower: 0,
          troopPower: 0.05,
          buildingPower: 0.3,
          technologyPower: 0.7,
          heroCombatPower: 0.8,
          dragonPower: 1,
        },
      },
      versions: [],
    },
    teams,
    plan: {
      roleGroups: ROLES,
      phases: PHASES,
      legions: LEGIONS,
      objectives: [
        { id: 'cc1', code: 'CC1', label: 'Command Center 1', x: 80, y: 20 },
        { id: 't3', code: 'T3', label: 'Tower 3', x: 50, y: 50 },
      ],
      instructions: [
        {
          id: 'instruction-1',
          teamId: 'team-1',
          phaseId: 'phase-0-5',
          legionId: 'legion-1',
          scope: 'role',
          scopeId: 'offensive',
          roleGroupId: 'offensive',
          action: 'Capture and defend CC1',
          objectiveId: 'cc1',
          objectiveCode: 'CC1',
          loadout: 'T9s and speed heroes',
          teleport: 'No teleport',
          instruction: 'Move as one group.',
          note: 'R5 live call wins.',
        },
      ],
      rotations: [],
      notes: [],
    },
    publications: {
      announcement: { status: 'draft', revision: 11 },
      plan: { status: 'draft', revision: 11 },
    },
    validation: { valid: true, errors: [], warnings: [] },
  };
}

async function blockExternalServices(page) {
  await page.route(EXTERNAL_REQUEST, (route) => route.abort());
}

async function openInjectedPlayerHub(page) {
  await blockExternalServices(page);
  await page.goto('/tabs/all-star-boh.html', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ url: '/css/_tokens.css' });
  await page.addStyleTag({ url: '/css/app.css' });
  await page.addStyleTag({ url: '/css/all-star-boh.css' });
  await page.evaluate(async (fixture) => {
    const [bootstrap, controller, model, ocr, i18n, heroData, researchData, researchI18n] =
      await Promise.all([
        import('/js/all-star-boh-bootstrap.js'),
        import('/js/all-star-boh.js'),
        import('/js/all-star-boh-model.js'),
        import('/js/all-star-boh-ocr.js'),
        import('/js/i18n/all-star-boh/index.js'),
        import('/js/heroes-data.js'),
        import('/js/tech-db.js'),
        import('/js/i18n/research/index.js'),
      ]);
    const teams = new Map(fixture.teams.map((team) => [team.id, team]));
    let submission = { ...fixture.submission };
    let epicPreferences = { ...fixture.epicPreferences };
    const subscribers = new Set();
    const store = {
      accessGranted: true,
      seasonId: fixture.seasonId,
      uid: fixture.uid,
      epicTimeSlotIds: Object.freeze(['+8', '+10', '+12']),
      subscribeSubmission(next) {
        queueMicrotask(() => next(submission));
        window.__BOH_PUSH_SUBMISSION__ = (value) => {
          submission = value;
          next(value);
        };
        subscribers.add(next);
        return () => subscribers.delete(next);
      },
      subscribeSubmissionFeedback(next) {
        next(fixture.submissionFeedback);
        window.__BOH_PUSH_SUBMISSION_FEEDBACK__ = next;
        subscribers.add(next);
        return () => subscribers.delete(next);
      },
      subscribeEpicShowdownPreferences(next) {
        next(epicPreferences);
        window.__BOH_PUSH_EPIC_PREFERENCES__ = (value) => {
          epicPreferences = value;
          next(value);
        };
        subscribers.add(next);
        return () => subscribers.delete(next);
      },
      subscribePublication(next) {
        next(fixture.publication);
        subscribers.add(next);
        return () => subscribers.delete(next);
      },
      subscribePersonalPlan(next) {
        next(fixture.personalPlan);
        subscribers.add(next);
        return () => subscribers.delete(next);
      },
      subscribePublishedTeam(teamId, next) {
        next(teams.get(teamId) || null);
        subscribers.add(next);
        return () => subscribers.delete(next);
      },
      async getSubmission() {
        return submission;
      },
      async getSubmissionFeedback() {
        return fixture.submissionFeedback;
      },
      async getEpicShowdownPreferences() {
        return epicPreferences;
      },
      async getPublication() {
        return fixture.publication;
      },
      async getPersonalPlan() {
        return fixture.personalPlan;
      },
      async getPublishedTeam(teamId) {
        return teams.get(teamId) || null;
      },
      async saveSubmission(payload, options) {
        window.__BOH_SAVED_SUBMISSION__ = { payload, options };
        if (options.expectedRevision !== submission.revision) {
          const error = new Error('Signup revision conflict.');
          error.name = 'AllStarBohConflictError';
          error.actualRevision = submission.revision;
          throw error;
        }
        submission = { ...payload, status: 'submitted', revision: submission.revision + 1 };
        return submission;
      },
      async saveEpicShowdownPreferences(payload, options) {
        window.__BOH_SAVED_EPIC_PREFERENCES__ = { payload, options };
        if (options.expectedRevision !== epicPreferences.revision) {
          const error = new Error('Epic preference revision conflict.');
          error.name = 'AllStarBohConflictError';
          error.actualRevision = epicPreferences.revision;
          throw error;
        }
        epicPreferences = { ...payload, revision: epicPreferences.revision + 1 };
        return epicPreferences;
      },
      stop() {
        window.__BOH_PLAYER_STORE_STOPPED__ = true;
      },
    };
    const accessClient = {
      async getAccessGrant() {
        return null;
      },
      async unlock(pin) {
        if (pin !== 'local-member-pin') {
          const error = new Error('Access denied');
          error.code = 'access_denied';
          throw error;
        }
        return {
          seasonId: fixture.seasonId,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        };
      },
      async processOcr() {
        return {
          result: {
            schemaVersion: 1,
            requestId: 'rendered-ocr-request',
            extracted: {
              gameName: 'Player 1-01',
              totalCastlePower: 1_000_000_000,
              troopPower: 400_000_000,
              buildingPower: 100_000_000,
              technologyPower: null,
              heroCombatPower: 200_000_000,
              dragonPower: 100_000_000,
            },
            confidence: {
              gameName: 0.98,
              totalCastlePower: 0.99,
              troopPower: 0.42,
              buildingPower: 0.95,
              technologyPower: 0.9,
              heroCombatPower: 0.97,
              dragonPower: 0.96,
            },
            warnings: ['Technology power was cropped in the screenshot.'],
          },
        };
      },
      destroy() {},
    };
    const root = document.querySelector('[data-role="boh-root"]');
    window.__BOH_PLAYER_LIFECYCLE__ = await bootstrap.bootAllStarBohTab({
      root,
      locale: 'en',
      accessClient,
      firebase: {
        async initFirebase() {
          return { configured: true, db: { local: true } };
        },
        async ensureAnonymousAuth() {
          return { uid: fixture.uid };
        },
        async getFirebaseAppCheckToken() {
          return 'local-app-check-token';
        },
      },
      loadStylesheet: async () => {},
      loadDomain: async () => ({
        controller,
        model,
        ocr: {
          ...ocr,
          // Image decode/re-encoding has dedicated unit coverage. Keep this
          // rendered test focused on the OCR review and correction workflow.
          async prepareBohStatsScreenshot() {
            return {
              imageData: 'data:image/jpeg;base64,/9j/2Q==',
              width: 1,
              height: 1,
            };
          },
        },
        i18n,
        heroData,
        researchData,
        researchI18n,
        firestore: {},
        store: { createAllStarBohPlayerStore: () => store },
      }),
      setTimeout: () => 1,
      clearTimeout: () => {},
    });
  }, createPlayerFixture());

  const gate = page.locator('[data-role="boh-access-gate"]');
  await expect(gate).toBeVisible();
  await expect(gate.locator('[data-role="boh-access-pin"]')).toBeFocused();
  await gate.locator('[data-role="boh-access-pin"]').fill('local-member-pin');
  await gate.locator('[data-role="boh-access-submit"]').click();
  await expect(gate).toBeHidden();
  await expect(page.locator('[data-role="boh-root"]')).toBeVisible();
}

async function openInjectedAdmin(page) {
  await blockExternalServices(page);
  await page.addInitScript(() => {
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
    localStorage.setItem('vts_maintenance_bypass', '1');
  });
  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('vts_admin_local_test_auth')))
    .toBe('1');
  await page.addStyleTag({ url: '/css/admin-all-star-boh.css' });
  await page.evaluate(async (snapshot) => {
    const panel = document.getElementById('dashSubtabAllStarBoh');
    document.querySelectorAll('.dash-subtab-panel').forEach((candidate) => {
      candidate.classList.toggle('hidden', candidate !== panel);
    });
    panel?.classList.remove('hidden');
    const module = await import('/js/admin-all-star-boh.js');
    window.__BOH_ADMIN_ACTIONS__ = [];
    const store = {
      async start() {
        return snapshot;
      },
      async refresh() {
        return snapshot;
      },
      getSnapshot() {
        return snapshot;
      },
      subscribe() {
        return () => {};
      },
      async dispatch(command) {
        window.__BOH_ADMIN_ACTIONS__.push(command);
        return { snapshot };
      },
      stop() {},
    };
    window.__BOH_ADMIN_CONTROLLER__ = await module.initializeAdminAllStarBoh(
      document.getElementById('dashAllStarBohRoot'),
      {
        store,
        initialSnapshot: snapshot,
        locale: 'en',
        direction: 'ltr',
        heroMetadata: [
          { name: 'Lionheart', Type: 'Cavalry' },
          { name: 'Al Fatih', Type: 'Archers' },
        ],
        researchMetadata: {
          d1956263: 'Rapid Production',
          b2691f74: 'Town Development',
        },
        confirm: () => true,
      }
    );
  }, createAdminFixture());
  await expect(page.locator('#dashAllStarBohRoot .boh-admin-shell')).toBeVisible();
}

test.describe('All-Star BoH secure player hub', () => {
  test('direct hash fails closed and does not fetch private feature chunks before a grant', async ({
    page,
  }) => {
    const requestedPaths = [];
    page.on('request', (request) => requestedPaths.push(new URL(request.url()).pathname));
    await blockExternalServices(page);
    await page.addInitScript(() => {
      localStorage.setItem('vts_maintenance_bypass', '1');
      localStorage.setItem('vts_intro_v1_seen', '1');
    });
    await page.goto('/#allStarBoh', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30_000 });
    await expect(page.locator('#allStarBohSection')).toBeVisible();

    const gate = page.locator('[data-role="boh-access-gate"]');
    const root = page.locator('#allStarBohSection [data-role="boh-root"]');
    await expect(gate).toBeVisible({ timeout: 20_000 });
    await expect(gate).toHaveAccessibleName(/Unlock the All-Star BoH hub/i);
    await expect(gate.locator('[data-role="boh-access-pin"]')).toBeEnabled({ timeout: 20_000 });
    await expect(gate.locator('[data-role="boh-access-pin"]')).toBeFocused();
    await expect(root).toBeHidden();
    await expect(root).toHaveAttribute('aria-hidden', 'true');
    await expect(root).toHaveAttribute('inert', '');

    for (const path of PRIVATE_PLAYER_MODULES) {
      expect(requestedPaths, `${path} must stay lazy before the member grant`).not.toContain(path);
    }
  });

  test('signup edits keep their opening revision and reload the latest saved form on conflict', async ({
    page,
  }) => {
    await openInjectedPlayerHub(page);
    const root = page.locator('[data-role="boh-root"]');
    const teammateNames = root.locator('[name="preferredTeammates"]');
    const fixture = createPlayerFixture();
    const cleanUpdate = {
      ...fixture.submission,
      preferredTeammates: ['Fresh server teammate'],
      revision: 3,
    };
    await page.evaluate((submission) => window.__BOH_PUSH_SUBMISSION__(submission), cleanUpdate);
    await expect(teammateNames).toHaveValue('Fresh server teammate');

    await teammateNames.fill('Unsaved local teammate');
    const conflictingUpdate = {
      ...cleanUpdate,
      preferredTeammates: ['Newest server teammate'],
      revision: 4,
    };
    await page.evaluate(
      (submission) => window.__BOH_PUSH_SUBMISSION__(submission),
      conflictingUpdate
    );
    await expect(teammateNames).toHaveValue('Unsaved local teammate');

    await root.locator('[data-role="signup-submit"]').click();
    await expect
      .poll(() => page.evaluate(() => window.__BOH_SAVED_SUBMISSION__?.options))
      .toEqual({ expectedRevision: 3 });
    await expect(root.locator('[data-role="page-feedback"]')).toContainText(
      'changed in another session'
    );
    await expect(teammateNames).toHaveValue('Newest server teammate');
  });

  test('signup planning controls capture fieldable heroes, research, two fight times, and an optional role', async ({
    page,
  }) => {
    await openInjectedPlayerHub(page);
    const root = page.locator('[data-role="boh-root"]');

    const heroSelector = root.locator('[data-role="hero-selector"]');
    await heroSelector.locator('summary').click();
    await expect(root.locator('[data-role="hero-selected-count"]')).toHaveText('2 selected');
    await root.locator('[data-role="hero-search"]').fill('Al Fatih');
    await expect(root.locator('[data-role="hero-results"]')).toHaveText('1 hero shown');
    const alFatih = root.locator('[name="usableHeroNames"][value="Al Fatih"]');
    await expect(alFatih).toBeVisible();
    await alFatih.check();
    await expect(root.locator('[data-role="hero-selected-count"]')).toHaveText('3 selected');

    await root.locator('[data-role="hero-search"]').fill('');
    await root.locator('[data-role="hero-troop-filter"]').selectOption('Archers');
    await root.locator('[data-role="hero-season-filter"]').selectOption('S1');
    const visibleHeroRows = root.locator('[data-role="hero-option"]:visible');
    await expect.poll(() => visibleHeroRows.count()).toBeGreaterThan(0);
    expect(
      await visibleHeroRows.evaluateAll((rows) =>
        rows.every((row) => row.dataset.troopType === 'Archers' && row.dataset.season === 'S1')
      )
    ).toBe(true);
    await root.locator('[data-role="hero-troop-filter"]').selectOption('');
    await root.locator('[data-role="hero-season-filter"]').selectOption('');

    const researchSelector = root.locator('[data-role="research-selector"]');
    await researchSelector.locator('summary').click();
    const rapidProduction = root.locator('[data-tree-id="d1956263"]');
    const townDevelopment = root.locator('[data-tree-id="b2691f74"]');
    const thirdResearch = root.locator('[data-tree-id="375d1626"]');
    const rapidProductionInput = rapidProduction.locator('[data-role="research-progress-input"]');
    await expect(rapidProductionInput).toHaveValue('0');
    await expect(townDevelopment.locator('[data-role="research-progress-input"]')).toHaveValue(
      '100'
    );
    await expect(thirdResearch.locator('[data-role="research-progress-input"]')).toHaveValue('');
    await expect(root.locator('[data-role="research-entered-count"]')).toContainText(
      '2 of 29 trees entered'
    );
    await rapidProduction
      .locator('[data-role="research-progress-action"][data-value="100"]')
      .click();
    await expect(rapidProductionInput).toHaveValue('100');
    await rapidProduction.locator('[data-role="research-progress-action"][data-value=""]').click();
    await expect(rapidProductionInput).toHaveValue('');
    await expect(root.locator('[data-role="research-entered-count"]')).toContainText(
      '1 of 29 trees entered'
    );
    await rapidProductionInput.fill('0');
    await expect(root.locator('[data-role="research-entered-count"]')).toContainText(
      '2 of 29 trees entered'
    );

    const fightingTimes = root.locator('[name="fightingTimeIds"]');
    await expect(fightingTimes).toHaveCount(4);
    await expect(root.locator('[name="fightingTimeIds"][value="+8"]')).toBeChecked();
    await expect(root.locator('[name="fightingTimeIds"][value="+12"]')).toBeChecked();
    await root.locator('[name="fightingTimeIds"][value="+12"]').uncheck();
    await expect(root.locator('[data-role="fighting-times-count"]')).toHaveText('1 / 2 selected');
    await root.locator('[data-role="signup-submit"]').click();
    await expect(root.locator('[data-role="fighting-times-error"]')).toContainText(
      'Choose exactly two All-Star fighting times.'
    );
    expect(await page.evaluate(() => window.__BOH_SAVED_SUBMISSION__ ?? null)).toBeNull();

    await root.locator('[name="fightingTimeIds"][value="+14"]').check();
    await root.locator('[name="fightingTimeIds"][value="+20"]').click();
    await expect(root.locator('[name="fightingTimeIds"][value="+20"]')).not.toBeChecked();
    await expect(root.locator('[data-role="fighting-times-error"]')).toContainText(
      'Only two fighting times can be selected.'
    );
    await root.locator('[name="fightingTimeIds"][value="+14"]').uncheck();
    await root.locator('[name="fightingTimeIds"][value="+20"]').check();
    await expect(root.locator('[data-role="fighting-times-count"]')).toHaveText('2 / 2 selected');

    const favoriteRole = root.locator('[name="preferredRole"]');
    await favoriteRole.selectOption('');
    await expect(favoriteRole).toHaveValue('');
    await favoriteRole.selectOption('flexible');
    await expect(favoriteRole).toHaveValue('flexible');
    await favoriteRole.selectOption('');

    await root.locator('[data-role="signup-submit"]').click();
    await expect.poll(() => page.evaluate(() => window.__BOH_SAVED_SUBMISSION__)).toBeTruthy();
    const saved = await page.evaluate(() => window.__BOH_SAVED_SUBMISSION__);
    expect(saved.options).toEqual({ expectedRevision: 2 });
    expect(saved.payload.stats.usableHeroNames).toEqual(
      expect.arrayContaining(['Lionheart', 'Cao Cao', 'Al Fatih'])
    );
    expect(saved.payload.stats.researchProgressPct).toEqual({ d1956263: 0, b2691f74: 100 });
    expect(saved.payload.commitment.fightingTimeIds).toEqual(['+8', '+20']);
    expect(saved.payload.commitment.preferredRole).toBe('');
    expect(saved.payload.rolePreferences).toEqual([]);
  });

  test('mocked grant renders four sections, six 12-player teams, and both planning tools', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openInjectedPlayerHub(page);
    const root = page.locator('[data-role="boh-root"]');
    const sectionTabs = root.locator('[data-role="section-tab"]');
    await expect(sectionTabs).toHaveCount(4);
    await expect(root.locator('[name="preferredTeammates"]')).toHaveValue(
      'Player 2-01\nPlayer 3-01'
    );
    await expect(root.locator('[data-role="submission-feedback"]')).toBeVisible();
    await expect(root.locator('[data-role="submission-feedback-title"]')).toHaveText(
      'Leadership requested a correction'
    );
    await expect(root.locator('[data-role="submission-feedback-note"]')).toContainText(
      'confirm your troop power'
    );
    await page.evaluate(() => {
      window.__BOH_PUSH_SUBMISSION_FEEDBACK__({
        status: 'confirmed',
        note: 'Confirmed by leadership.',
        submissionRevision: 2,
        reviewRevision: 4,
      });
    });
    await expect(root.locator('[data-role="submission-feedback-title"]')).toHaveText(
      'Leadership confirmed your signup'
    );
    await page.evaluate(() => {
      window.__BOH_PUSH_SUBMISSION_FEEDBACK__({
        status: 'excluded',
        note: 'Unavailable for this event window.',
        submissionRevision: 2,
        reviewRevision: 5,
      });
    });
    await expect(root.locator('[data-role="submission-feedback-title"]')).toHaveText(
      'This signup is not in the current pool'
    );
    await expect(root.locator('[data-role="submission-feedback-note"]')).toContainText(
      'Unavailable for this event window.'
    );
    await page.evaluate(() => {
      window.__BOH_PUSH_SUBMISSION__({
        playerId: 'player-1-1',
        gameName: 'Player 1-01',
        status: 'submitted',
        revision: 3,
        entryMethod: 'manual',
        stats: {},
        commitment: {},
      });
    });
    await expect(root.locator('[data-role="submission-feedback-title"]')).toHaveText(
      'Signup updated — review pending'
    );
    await expect(root.locator('[data-role="submission-feedback-note"]')).toBeHidden();

    await sectionTabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(sectionTabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(root.locator('[data-role="announcement-state-assigned"]')).toBeVisible();
    await expect(root.locator('[data-role="my-team-roster"] > li')).toHaveCount(12);

    const teamButtons = root.locator('[data-role="team-overview"] .boh-team-summary');
    await expect(teamButtons).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await teamButtons.nth(index).click();
      await expect(teamButtons.nth(index)).toHaveAttribute('aria-expanded', 'true');
      await expect(teamButtons.nth(index)).toHaveAttribute(
        'aria-controls',
        'bohTeamOverviewDetail'
      );
      await expect(
        root.locator('[data-role="team-overview-detail"] .boh-roster-grid > li')
      ).toHaveCount(12);
    }

    await sectionTabs.nth(2).click();
    await expect(root.locator('[data-role="plan-state-published"]')).toBeVisible();
    await expect(root.locator('[name="bohLegion"]')).toHaveCount(2);
    await expect(root.locator('[data-role="phase-tabs"] [role="tab"]:not([hidden])')).toHaveCount(
      4
    );
    await expect(root.locator('[data-role="current-instruction"]')).toContainText('NOW');
    await expect(root.locator('[data-role="next-instruction"]')).toContainText('NEXT');
    await expect(root.locator('[data-role="current-action"]')).toHaveText(
      'Legion 1 phase 1 action'
    );
    await expect(root.locator('[data-role="personal-route-text"]')).toContainText('South Spawn');
    await expect(root.locator('[data-role="personal-route-text"]')).toContainText('Tower 3');
    await expect(root.locator('[data-role="personal-route-text"]')).toContainText(
      'Command Center 1'
    );
    await expect(root.locator('[data-role="map-objectives"] > g')).toHaveCount(4);
    await expect(root.locator('[data-objective-id="spawn"]')).toHaveAttribute(
      'transform',
      'translate(85 359)'
    );
    await expect(root.locator('[data-objective-id="cc1"]')).toHaveClass(/is-target/);
    await expect(root.locator('[data-role="map-route"]')).toHaveAttribute(
      'd',
      'M 85 359 L 320 215 L 533 71'
    );

    await sectionTabs.nth(3).click();
    const lanePreferences = root.locator('[name="epicLanePreferences"]');
    const timePreferences = root.locator('[name="epicTimePreferences"]');
    await expect(lanePreferences).toHaveCount(3);
    await expect(timePreferences).toHaveCount(3);
    await expect(root.locator('[name="epicGameName"]')).toHaveValue('Player 1-01');
    await expect(root.locator('[name="epicLanePreferences"][value="south"]')).toBeChecked();
    await expect(root.locator('[name="epicLanePreferences"][value="north"]')).toBeChecked();
    await expect(root.locator('[name="epicTimePreferences"][value="+8"]')).toBeChecked();
    await root.locator('[name="epicLanePreferences"][value="center"]').check();
    await root.locator('[name="epicTimePreferences"][value="+10"]').check();
    await root.locator('[name="epicTimePreferences"][value="+12"]').check();
    await expect(root.locator('[data-role="showdown-summary"]')).toContainText(
      '3 positions · 3 game times selected'
    );
    await root.locator('[data-role="showdown-submit"]').click();
    await expect(root.locator('[data-role="showdown-save-state"]')).toContainText('revision 3');
    await expect
      .poll(() => page.evaluate(() => window.__BOH_SAVED_EPIC_PREFERENCES__))
      .toEqual({
        payload: {
          gameName: 'Player 1-01',
          lanePreferences: ['south', 'center', 'north'],
          timePreferences: ['+8', '+10', '+12'],
        },
        options: { expectedRevision: 2 },
      });

    await root.locator('[name="epicLanePreferences"][value="south"]').uncheck();
    await page.evaluate(() => {
      window.__BOH_PUSH_EPIC_PREFERENCES__({
        gameName: 'Player 1-01',
        lanePreferences: ['south'],
        timePreferences: ['+8'],
        revision: 4,
      });
    });
    await expect(root.locator('[name="epicLanePreferences"][value="center"]')).toBeChecked();
    await expect(root.locator('[name="epicLanePreferences"][value="north"]')).toBeChecked();
    await expect(root.locator('[name="epicTimePreferences"][value="+12"]')).toBeChecked();
    await root.locator('[data-role="showdown-submit"]').click();
    await expect(root.locator('[data-role="page-feedback"]')).toContainText(
      'Latest saved choices loaded'
    );
    await expect
      .poll(() => page.evaluate(() => window.__BOH_SAVED_EPIC_PREFERENCES__.options))
      .toEqual({ expectedRevision: 3 });
    await expect(root.locator('[name="epicLanePreferences"][value="south"]')).toBeChecked();
    await expect(root.locator('[name="epicLanePreferences"][value="center"]')).not.toBeChecked();
    await expect(root.locator('[name="epicLanePreferences"][value="north"]')).not.toBeChecked();
    await expect(root.locator('[name="epicTimePreferences"][value="+8"]')).toBeChecked();
    await expect(root.locator('[name="epicTimePreferences"][value="+12"]')).not.toBeChecked();

    await sectionTabs.nth(2).click();

    await root.locator('#bohLegion2').check();
    await expect(root.locator('[data-role="current-action"]')).toHaveText(
      'Legion 2 phase 1 action'
    );
    const phaseTabs = root.locator('[data-role="phase-tabs"] [role="tab"]:not([hidden])');
    await phaseTabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(phaseTabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(root.locator('[data-role="current-action"]')).toHaveText(
      'Legion 2 phase 2 action'
    );
    await expect(root.locator('[data-role="next-action"]')).toHaveText('Legion 2 phase 3 action');

    const englishSignup = await sectionTabs.first().textContent();
    const englishRole = await root.locator('[data-role="plan-role"]').textContent();
    const englishPhase = await phaseTabs.first().locator('small').textContent();
    const englishLegion = await root.locator('label[for="bohLegion2"]').textContent();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.evaluate(() => {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';
      window.dispatchEvent(new CustomEvent('vts:language-change', { detail: { lang: 'ar' } }));
    });
    await expect.poll(() => sectionTabs.first().textContent()).not.toBe(englishSignup);
    await expect
      .poll(() =>
        sectionTabs
          .first()
          .evaluate((element) => /\p{Script=Arabic}/u.test(element.textContent || ''))
      )
      .toBe(true);
    await expect(root.locator('[data-role="plan-role"]')).not.toHaveText(englishRole);
    await expect(phaseTabs.first().locator('small')).not.toHaveText(englishPhase);
    await expect(root.locator('label[for="bohLegion2"]')).not.toHaveText(englishLegion);
    await expect(teamButtons.nth(1).locator('strong')).toHaveText(/\p{Script=Arabic}/u);
    await expect(teamButtons.first().locator('strong')).toHaveText('All-Star Team 1');
    expect(await root.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
  });

  test('OCR review exposes warnings, ties issues to fields, and blocks consent until complete', async ({
    page,
  }) => {
    await openInjectedPlayerHub(page);
    const root = page.locator('[data-role="boh-root"]');
    await root.locator('[data-role="entry-method"][value="ocr"]').check();
    await root.locator('[data-role="ocr-file-input"]').setInputFiles({
      name: 'stats.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    });
    await root.locator('[data-role="ocr-consent"]').check();
    await root.locator('[data-role="ocr-process"]').click();

    const review = root.locator('[data-role="ocr-review-alert"]');
    const technology = root.locator('[name="technologyPower"]');
    const confirmation = root.locator('[data-role="ocr-values-confirmed"]');
    await expect(review).toBeVisible();
    await expect(review).toContainText('OCR missed 1 required field');
    await expect(review).toContainText('Technology power was cropped');
    await expect(technology).toHaveAttribute('aria-invalid', 'true');
    await expect(technology).toHaveAttribute('aria-describedby', /bohOcrIssue-technologyPower/u);
    await expect(root.locator('#bohOcrIssue-technologyPower')).toContainText('Missing');
    await expect(root.locator('#bohOcrIssue-troopPower')).toContainText('Low OCR confidence');
    await expect(confirmation).toBeDisabled();

    await technology.fill('300000000');
    await expect(technology).not.toHaveAttribute('aria-invalid', 'true');
    await expect(root.locator('#bohOcrIssue-technologyPower')).toContainText('Corrected manually');
    await expect(confirmation).toBeEnabled();
  });
});

test.describe('All-Star BoH Admin VTS command center', () => {
  test('local test auth renders five stages, 72 seats, plan controls, and safe legacy reuse', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    const stageTabs = root.locator('[data-action="stage"]');
    await expect(stageTabs).toHaveCount(5);

    await root.locator('[data-stage="signups"]').click();
    await root.locator('[data-action="select-submission"][data-player-id="player-1-1"]').click();
    const planningSignals = root.locator('.boh-admin-planning-signal');
    await expect(planningSignals).toBeVisible();
    await expect(planningSignals).toContainText('Planning signal only');
    await expect(planningSignals).toContainText('Top side');
    await expect(planningSignals).toContainText('+8');
    await expect(planningSignals).toContainText('+20');
    await expect(planningSignals).toContainText('Lionheart');
    await expect(planningSignals).toContainText('Al Fatih');
    await expect(
      planningSignals.getByRole('progressbar', { name: 'Rapid Production: 0%' })
    ).toBeVisible();
    await expect(
      planningSignals.getByRole('progressbar', { name: 'Town Development: MAX' })
    ).toBeVisible();

    await stageTabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(root.locator('[data-stage="scoring"]')).toHaveAttribute('aria-selected', 'true');

    for (const stage of ['signups', 'scoring', 'teams', 'plans', 'publish']) {
      await root.locator(`[data-stage="${stage}"]`).click();
      await expect(root.locator(`[data-stage="${stage}"]`)).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(root.locator('#bohAdminStagePanel')).toBeVisible();
    }

    await root.locator('[data-stage="teams"]').click();
    await expect(root.locator('.boh-admin-team')).toHaveCount(6);
    await expect(root.locator('.boh-admin-seat')).toHaveCount(72);

    await root.locator('[data-stage="plans"]').click();
    await expect(root.locator('[data-form="role-groups"] input[name="roleLabel"]')).toHaveCount(4);
    await expect(root.locator('[data-form="phases"] input[name="phaseId"]')).toHaveCount(4);
    await expect(root.locator('[data-plan-filter="phase"] option')).toHaveCount(4);
    await expect(root.locator('[data-plan-filter="legion"] option')).toHaveCount(2);
    const scopeButtons = root.locator('[data-action="plan-scope"]');
    await expect(scopeButtons).toHaveCount(4);
    await expect
      .poll(() =>
        scopeButtons.evaluateAll((buttons) => buttons.map((button) => button.dataset.scope))
      )
      .toEqual(['global', 'role', 'seat', 'player']);
    await expect(root.locator('[data-form="instruction"] input[name="action"]')).toBeVisible();
    await expect(root.locator('[data-form="instruction"] input[name="teleport"]')).toBeVisible();
    await expect(
      root.locator('[data-form="instruction"] textarea[name="instruction"]')
    ).toBeVisible();
    await expect(root.locator('[data-action="start-legacy-structure"]')).toBeVisible();

    await root.locator('[data-action="start-legacy-structure"]').click();
    await expect.poll(() => page.evaluate(() => window.__BOH_ADMIN_ACTIONS__.length)).toBe(1);
    const command = await page.evaluate(() => window.__BOH_ADMIN_ACTIONS__[0]);
    expect(command.type).toBe('applyLegacyStructureTemplate');
    expect(command.payload).toMatchObject({
      sourceSeatCount: 15,
      targetSeatCount: 12,
      copyPhases: true,
      copyObjectiveCodes: true,
      copyRoleCapacities: false,
      copyPlayerAssignments: false,
      copyPlayerNames: false,
      requireExplicitRoleMapping: true,
    });
    expect(JSON.stringify(command.payload)).not.toContain('Player 1-01');
  });
});
