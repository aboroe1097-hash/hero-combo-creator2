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
const OCR_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

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
      const standby = legionIndex === 0 && phaseIndex === 2;
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
          ...(standby ? { standby: true } : {}),
          action: `${legion.label} phase ${phaseIndex + 1} action`,
          target: phaseIndex === 0 ? 'Command Center 1' : `Phase ${phaseIndex + 1} target`,
          loadout: phaseIndex < 2 ? 'T1s and speed heroes' : 'T9 combat march',
          teleport: phaseIndex === 1 ? 'Teleport to Tower 3' : 'No teleport',
          note: phaseIndex === 2 ? 'Follow the live R5 call if it changes.' : '',
          ...(legionIndex === 1 && phaseIndex === 1 ? { gatherCrystals: true } : {}),
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
        unitSpecialtyPower: 50_000_000,
        level50HeroCount: 8,
        rocLevel: 12,
        t9TroopTypes: ['cavalry', 'archers'],
        readySpeedHeroes: ['lionheart'],
        usableHeroNames: ['Lionheart', 'Cao Cao'],
        researchProgressPct: { d1956263: 0, b2691f74: 100 },
      },
      commitment: {
        availability: 'all',
        fightingTimeIds: ['+12', '+14'],
        preferredRole: 'offensive',
        secondaryRole: '',
        canHelpLead: false,
        vts1097Member: true,
        contactNumber: '',
        currentState: '',
        joinReason: '',
        teamNamePreferences: ['iron-wolves', 'frost-bears'],
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
      flexibilityPreference: 'change-roles',
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
    eventSchedule: {
      status: 'published',
      eventStartsAt: '2026-08-01T12:00:00.000Z',
      eventEndsAt: '2026-08-01T13:00:00.000Z',
      revision: 2,
      milestones: [
        { id: 'check-in', label: 'Check in', startsAt: '2026-08-01T11:30:00.000Z' },
        { id: 'gates-open', label: 'Gates open', startsAt: '2026-08-01T12:00:00.000Z' },
        { id: 'rune', label: 'Rune fight', startsAt: '2026-08-01T12:15:00.000Z' },
      ],
      teamGameTimes: teams.map((team, index) => ({
        teamId: team.id,
        startsAt: `2026-08-01T${String(12 + Math.floor(index / 3)).padStart(2, '0')}:${String((index % 3) * 10).padStart(2, '0')}:00.000Z`,
      })),
    },
    teams,
  };
}

function createAdminFixture() {
  const teams = Array.from({ length: 6 }, (_unused, index) => createTeam(index + 1));
  const submissions = teams.flatMap((team) =>
    team.seats.map((seat, index) => {
      const reviewStatus = index % 5 === 0 ? 'pending' : 'confirmed';
      return {
        playerId: seat.playerId,
        displayName: seat.displayName,
        gameName: seat.displayName,
        alliance: index % 2 ? 'VTS' : 'V3S',
        server: '1097',
        revision: 1,
        reviewStatus,
        review: {
          status: reviewStatus === 'confirmed' ? 'verified' : 'pending',
          submissionRevision: 1,
          revision: 1,
        },
        stats: {
          totalCastlePower: 300_000_000 + team.number * 10_000_000 + seat.seatNumber * 100_000,
          troopPower: 120_000_000,
          buildingPower: 45_000_000,
          technologyPower: 55_000_000,
          heroCombatPower: 70_000_000,
          dragonPower: 20_000_000,
          unitSpecialtyPower: 10_000_000,
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
          ...(seat.playerId === 'player-1-1' ? { fightingTimeIds: ['+12', '+16'] } : {}),
        },
      };
    })
  );
  Object.assign(
    submissions.find((item) => item.playerId === 'player-1-2'),
    {
      displayName: '=Formula Pilot',
      gameName: '=Formula Pilot',
      updatedAtMs: 1_787_000_002_000,
      stats: {
        ...submissions.find((item) => item.playerId === 'player-1-2').stats,
        totalCastlePower: 900_000_000,
        unitSpecialtyPower: 22_000_000,
        t9TroopTypes: ['cavalry'],
      },
      commitment: {
        availability: 'all',
        fightingTimeIds: ['+14'],
        preferredRole: 'flexible',
        vts1097Member: true,
      },
    }
  );
  Object.assign(
    submissions.find((item) => item.playerId === 'player-1-3'),
    {
      displayName: 'Alpha Pilot',
      gameName: 'Alpha Pilot',
      updatedAtMs: 1_787_000_001_000,
      stats: {
        ...submissions.find((item) => item.playerId === 'player-1-3').stats,
        totalCastlePower: 800_000_000,
        t9TroopTypes: ['cavalry'],
      },
      commitment: {
        availability: 'all',
        fightingTimeIds: ['+14'],
        preferredRole: 'offensive',
        vts1097Member: true,
      },
    }
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

async function openInjectedPlayerHub(page, { ocrTransport = {} } = {}) {
  await blockExternalServices(page);
  await page.goto('/tabs/all-star-boh.html', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ url: '/css/_tokens.css' });
  await page.addStyleTag({ url: '/css/app.css' });
  await page.addStyleTag({ url: '/css/all-star-boh.css' });
  await page.evaluate(
    async ({ fixture, ocrTransport: transportOptions }) => {
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
      window.__BOH_OCR_CALL_COUNT__ = 0;
      const store = {
        accessGranted: true,
        seasonId: fixture.seasonId,
        uid: fixture.uid,
        epicTimeSlotIds: Object.freeze(['+6', '+8', '+10', '+12', '+14', '+16', '+18', '+20']),
        subscribeSubmission(next, error) {
          queueMicrotask(() => next(submission));
          window.__BOH_PUSH_SUBMISSION__ = (value) => {
            submission = value;
            next(value);
          };
          window.__BOH_PUSH_SUBMISSION_ERROR__ = () =>
            error?.(new Error('Missing or insufficient permissions.'));
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
        subscribeEventSchedule(next) {
          next(fixture.eventSchedule);
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
        async getEventSchedule() {
          return fixture.eventSchedule;
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
          window.__BOH_OCR_CALL_COUNT__ += 1;
          const callNumber = window.__BOH_OCR_CALL_COUNT__;
          if (transportOptions.deferred) {
            await new Promise((resolve) => {
              window.__BOH_RESOLVE_OCR__ = () => {
                delete window.__BOH_RESOLVE_OCR__;
                resolve();
              };
            });
          }
          if (transportOptions.failOnce && callNumber === 1) {
            throw new Error('Injected OCR transport failed once.');
          }
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
        registrationClosed: false,
        accessClient,
        firebase: {
          async initFirebase() {
            return { configured: true, db: { local: true } };
          },
          async ensureAnonymousAuth() {
            return { uid: fixture.uid, isAnonymous: true };
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
        onError(error, context) {
          window.__BOH_BACKGROUND_ERRORS__ ||= [];
          window.__BOH_BACKGROUND_ERRORS__.push({ message: error?.message, context });
        },
      });
    },
    { fixture: createPlayerFixture(), ocrTransport }
  );

  const gate = page.locator('[data-role="boh-access-gate"]');
  await expect(gate).toBeVisible();
  await expect(gate.locator('[data-role="boh-access-pin"]')).toBeFocused();
  await gate.locator('[data-role="boh-access-pin"]').fill('local-member-pin');
  await gate.locator('[data-role="boh-access-submit"]').click();
  await expect(gate).toBeHidden();
  await expect(page.locator('[data-role="boh-root"]')).toBeVisible();
}

async function prepareInjectedOcr(page) {
  const root = page.locator('[data-role="boh-root"]');
  await root.locator('[data-role="entry-method"][value="ocr"]').check();
  await root.locator('[data-role="ocr-file-input"]').setInputFiles({
    name: 'stats.png',
    mimeType: 'image/png',
    buffer: OCR_PIXEL_PNG,
  });
  await root.locator('[data-role="ocr-consent"]').check();
  return root;
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
    window.__BOH_ADMIN_CONFIRMS__ = [];
    window.__BOH_ADMIN_DOWNLOADS__ = [];
    window.__BOH_ADMIN_DELETE_FAILURE_IDS__ = [];
    window.__BOH_ADMIN_SNAPSHOT__ = snapshot;
    const clone = (value) => structuredClone(value);
    const submissionById = (playerId) =>
      snapshot.submissions.find((submission) => submission.playerId === playerId);
    const buildBalancePreview = () => {
      const fieldSize = snapshot.event.teamCount * 12;
      const confirmedIds = snapshot.submissions
        .filter((submission) => ['confirmed', 'approved'].includes(submission.reviewStatus))
        .map((submission) => submission.playerId);
      const selectedIds = (
        snapshot.eligiblePlayerIds?.length ? snapshot.eligiblePlayerIds : confirmedIds
      ).slice(0, fieldSize);
      const forced = new Map(
        (snapshot.forcedTeamAssignments || []).map((assignment) => [
          assignment.playerId,
          assignment.teamId,
        ])
      );
      const buckets = new Map(snapshot.teams.map((team) => [team.id, []]));
      for (const playerId of selectedIds) {
        const teamId = forced.get(playerId);
        if (teamId && buckets.has(teamId)) buckets.get(teamId).push(playerId);
      }
      let nextTeam = 0;
      for (const playerId of selectedIds) {
        if (forced.has(playerId)) continue;
        while (snapshot.teams.length && buckets.get(snapshot.teams[nextTeam].id).length >= 12) {
          nextTeam = (nextTeam + 1) % snapshot.teams.length;
        }
        buckets.get(snapshot.teams[nextTeam].id).push(playerId);
        nextTeam = (nextTeam + 1) % snapshot.teams.length;
      }
      const scoreById = new Map(snapshot.scores.map((score) => [score.playerId, score.finalScore]));
      const previewTeams = snapshot.teams.map((team) => {
        const playerIds = buckets.get(team.id);
        const seats = team.seats.map((seat, index) => {
          const playerId = playerIds[index] || '';
          const submission = submissionById(playerId);
          return {
            ...seat,
            playerId,
            displayName: submission?.displayName || submission?.gameName || '',
            locked: false,
          };
        });
        return {
          ...team,
          seats,
          scoreTotal: playerIds.reduce(
            (total, playerId) => total + (scoreById.get(playerId) || 0),
            0
          ),
          totalCastlePower: playerIds.reduce(
            (total, playerId) => total + (submissionById(playerId)?.stats?.totalCastlePower || 0),
            0
          ),
        };
      });
      const scores = previewTeams.map((team) => team.scoreTotal);
      const powers = previewTeams.map((team) => team.totalCastlePower);
      const scoreSpread = Math.max(...scores) - Math.min(...scores);
      const powerSpread = Math.max(...powers) - Math.min(...powers);
      snapshot.balancePreview = {
        teams: previewTeams,
        scoreSpread,
        powerSpread,
        balanceSpread: snapshot.event.balanceMetric === 'totalPower' ? powerSpread : scoreSpread,
        balanceMetric: snapshot.event.balanceMetric,
      };
    };
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
        window.__BOH_ADMIN_ACTIONS__.push(clone(command));
        const payload = command.payload || {};
        if (command.type === 'saveTeamBuilderSettings') {
          snapshot.event = {
            ...snapshot.event,
            teamCount: payload.teamCount,
            fieldSize: payload.teamCount * 12,
            balanceMetric: payload.balanceMetric,
          };
          snapshot.teams = snapshot.teams.slice(0, payload.teamCount);
          snapshot.forcedTeamAssignments = clone(payload.forcedTeamAssignments || []);
          snapshot.balancePreview = null;
        } else if (command.type === 'saveEligiblePool') {
          snapshot.eligiblePlayerIds = [...payload.playerIds];
          snapshot.balancePreview = null;
        } else if (command.type === 'previewBalanceTeams') {
          buildBalancePreview();
        } else if (command.type === 'discardBalancePreview') {
          snapshot.balancePreview = null;
        } else if (command.type === 'applyBalancePreview' && snapshot.balancePreview) {
          snapshot.teams = clone(snapshot.balancePreview.teams);
          snapshot.balancePreview = null;
        } else if (command.type === 'autoAssignRankedRoles') {
          const pattern = [
            'offensive',
            'offensive',
            'bottom',
            'top',
            'offensive',
            'offensive',
            'bottom',
            'top',
            'rune',
            'rune',
            'bottom',
            'top',
          ];
          for (const team of snapshot.teams) {
            const rankedSeats = team.seats
              .filter((seat) => seat.playerId)
              .sort((left, right) => {
                const leftScore =
                  snapshot.scores.find((score) => score.playerId === left.playerId)?.finalScore ||
                  0;
                const rightScore =
                  snapshot.scores.find((score) => score.playerId === right.playerId)?.finalScore ||
                  0;
                return rightScore - leftScore || left.seatNumber - right.seatNumber;
              });
            rankedSeats.forEach((seat, index) => {
              seat.roleGroupId = pattern[index];
              seat.roleLabel = ROLES.find((role) => role.id === pattern[index])?.label || '';
            });
          }
        } else if (command.type === 'saveTeamMetadata') {
          const team = snapshot.teams.find((item) => item.id === payload.teamId);
          if (team) {
            team.name = payload.name;
            team.color = payload.color;
            team.captainId = payload.captainId;
            team.coLeaderIds = [...(payload.coLeaderIds || [])].filter(Boolean).slice(0, 2);
            team.notes = payload.notes;
          }
        } else if (command.type === 'reviewSubmission') {
          const submission = submissionById(payload.playerId);
          if (submission) {
            submission.originalGameName ||= submission.gameName || submission.displayName;
            submission.originalStats ||= clone(submission.stats || {});
            submission.reviewStatus = payload.status;
            submission.review = {
              ...(submission.review || {}),
              status: payload.status,
              note: payload.note,
              internalNote: payload.internalNote,
              submissionRevision: submission.revision,
              statCorrections: clone(payload.statCorrections || {}),
              gameNameCorrection: clone(payload.gameNameCorrection || {}),
              submissionCorrection: clone(payload.submissionCorrection || null),
            };
            for (const [key, correction] of Object.entries(payload.statCorrections || {})) {
              submission.stats[key] = correction.corrected;
            }
            if (payload.gameNameCorrection?.corrected) {
              submission.displayName = payload.gameNameCorrection.corrected;
              submission.gameName = payload.gameNameCorrection.corrected;
            }
            const correctedValues = payload.submissionCorrection?.values || {};
            if (Object.prototype.hasOwnProperty.call(correctedValues, 'gameName')) {
              submission.displayName = correctedValues.gameName;
              submission.gameName = correctedValues.gameName;
            }
            Object.assign(submission.stats, clone(correctedValues.stats || {}));
          }
        } else if (command.type === 'saveCommitmentScores') {
          const reason = payload.reason || 'Commitment/usefulness assessment';
          for (const adjustment of payload.adjustments || []) {
            const score = snapshot.scores.find((entry) => entry.playerId === adjustment.playerId);
            if (!score) continue;
            const calculatedScore =
              score.calculatedScore ?? score.finalScore - (score.commitmentScore || 0);
            const commitmentScore =
              adjustment.score === null || adjustment.score === ''
                ? null
                : Number(adjustment.score);
            Object.assign(score, {
              calculatedScore,
              commitmentScore,
              commitmentScoreReason: commitmentScore === null ? '' : reason,
              finalScore: calculatedScore + (commitmentScore || 0),
            });
            const submission = submissionById(adjustment.playerId);
            if (submission) {
              Object.assign(submission, {
                calculatedScore,
                commitmentScore,
                commitmentScoreReason: commitmentScore === null ? '' : reason,
                finalScore: score.finalScore,
              });
            }
          }
        } else if (command.type === 'batchReviewSubmissions') {
          for (const playerId of payload.playerIds || []) {
            const submission = submissionById(playerId);
            if (!submission) continue;
            submission.reviewStatus = 'confirmed';
            submission.review = {
              ...(submission.review || {}),
              status: 'confirmed',
              note: payload.note || '',
              submissionRevision: submission.revision,
            };
          }
        } else if (command.type === 'deleteSubmission') {
          if (window.__BOH_ADMIN_DELETE_FAILURE_IDS__.includes(payload.playerId)) {
            throw new Error(`Fixture could not delete ${payload.playerId}.`);
          }
          snapshot.submissions = snapshot.submissions.filter(
            (submission) => submission.playerId !== payload.playerId
          );
          snapshot.scores = snapshot.scores.filter((score) => score.playerId !== payload.playerId);
        } else if (command.type === 'batchDeleteSubmissions') {
          const successfulPlayerIds = [];
          const failedPlayerIds = [];
          const failedPlayers = [];
          for (const playerId of payload.playerIds || []) {
            const submission = submissionById(playerId);
            if (window.__BOH_ADMIN_DELETE_FAILURE_IDS__.includes(playerId)) {
              failedPlayerIds.push(playerId);
              failedPlayers.push(submission?.displayName || submission?.gameName || playerId);
              continue;
            }
            successfulPlayerIds.push(playerId);
            snapshot.submissions = snapshot.submissions.filter(
              (candidate) => candidate.playerId !== playerId
            );
            snapshot.scores = snapshot.scores.filter((score) => score.playerId !== playerId);
          }
          if (failedPlayerIds.length) {
            const error = new Error(`Could not delete: ${failedPlayers.join(', ')}.`);
            error.code = 'all-star-boh-batch-delete-partial';
            error.successfulPlayerIds = successfulPlayerIds;
            error.failedPlayerIds = failedPlayerIds;
            error.failedPlayers = failedPlayers;
            throw error;
          }
        }
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
        confirm(message) {
          window.__BOH_ADMIN_CONFIRMS__.push(message);
          return true;
        },
        downloadSignupReviewCsv(csv, records) {
          window.__BOH_ADMIN_DOWNLOADS__.push({
            csv,
            playerIds: records.map((record) => record.playerId),
          });
        },
      }
    );
  }, createAdminFixture());
  await expect(page.locator('#dashAllStarBohRoot .boh-admin-shell')).toBeVisible();
}

test.describe('All-Star BoH secure player hub', () => {
  test('leadership identity conflict renders the private-window instruction', async ({ page }) => {
    await blockExternalServices(page);
    await page.goto('/tabs/all-star-boh.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const { createAllStarBohAccessGate } = await import('/js/all-star-boh-bootstrap.js');
      const root = document.querySelector('[data-role="boh-root"]');
      const gate = createAllStarBohAccessGate({ root, locale: 'en' });
      gate.showError({ code: 'member_identity_conflict' });
    });

    await expect(page.locator('[data-role="boh-access-feedback"]')).toHaveText(
      /signed into the leadership dashboard.*open this link in a private window/iu
    );
  });

  test('PIN visibility resets after submit and regional errors expose only Retry', async ({
    page,
  }) => {
    await blockExternalServices(page);
    await page.goto('/tabs/all-star-boh.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const { createAllStarBohAccessGate } = await import('/js/all-star-boh-bootstrap.js');
      const root = document.querySelector('[data-role="boh-root"]');
      const gate = createAllStarBohAccessGate({ root, locale: 'en' });
      gate.setHandlers({
        unlock() {
          gate.showError({ code: 'access_denied' });
        },
        retry() {
          gate.showLocked();
        },
      });
      gate.showLocked();
      window.__BOH_RENDERED_GATE__ = gate;
    });

    const gate = page.locator('[data-role="boh-access-gate"]');
    const pin = gate.locator('[data-role="boh-access-pin"]');
    const toggle = gate.locator('[data-role="boh-access-pin-toggle"]');
    const unlock = gate.locator('[data-role="boh-access-submit"]');
    const retry = gate.getByRole('button', { name: 'Retry', exact: true });

    await expect(pin).toHaveAttribute('type', 'password');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveAccessibleName('Show PIN');
    await pin.fill('wrong-pin');
    await toggle.click();
    await expect(pin).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveAccessibleName('Hide PIN');

    await unlock.click();
    await expect(gate.locator('[data-role="boh-access-feedback"]')).toHaveText(
      'That PIN did not match. Check it and try again.'
    );
    await expect(pin).toHaveValue('');
    await expect(pin).toHaveAttribute('type', 'password');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveAccessibleName('Show PIN');
    await expect(retry).toBeHidden();

    await page.evaluate(() => {
      window.__BOH_RENDERED_GATE__.showError({ code: 'secure_service_unreachable' });
    });
    await expect(gate.locator('[data-role="boh-access-feedback"]')).toHaveText(
      'The secure Google service required for signup cannot be reached from this network or region. Try a VPN or a different network, then press Retry. Your PIN has not been rejected.'
    );
    await expect(retry).toHaveCount(1);
    await expect(retry).toBeVisible();
    await expect(retry).toBeEnabled();
    await expect(pin).toBeHidden();
    await expect(pin).toBeDisabled();
    await expect(unlock).toBeHidden();
    await expect(unlock).toBeDisabled();

    await retry.click();
    await expect(pin).toBeVisible();
    await expect(pin).toBeEnabled();
    await expect(pin).toHaveAttribute('type', 'password');
    await expect(unlock).toBeVisible();
    await expect(unlock).toBeEnabled();
    await expect(retry).toBeHidden();
  });

  test('mixed-case direct hash paints its loader before the delayed gate module mounts', async ({
    page,
  }) => {
    await blockExternalServices(page);
    await page.addInitScript(() => {
      localStorage.setItem('vts_maintenance_bypass', '1');
      localStorage.setItem('vts_intro_v1_seen', '1');
    });
    let releaseBootstrap;
    let markBootstrapRequested;
    const bootstrapHold = new Promise((resolve) => {
      releaseBootstrap = resolve;
    });
    const bootstrapRequested = new Promise((resolve) => {
      markBootstrapRequested = resolve;
    });
    await page.route('**/js/all-star-boh-bootstrap.js*', async (route) => {
      markBootstrapRequested();
      await bootstrapHold;
      await route.continue();
    });

    await page.goto('/#aLlStArBoH', { waitUntil: 'domcontentloaded' });
    await bootstrapRequested;
    const section = page.locator('#allStarBohSection');
    const loader = section.locator(':scope > .tab-loading');
    const root = section.locator('[data-role="boh-root"]');
    await expect(section).toBeVisible();
    await expect(loader).toBeVisible();
    await expect(section.locator('[data-role="boh-access-gate"]')).toHaveCount(0);
    await expect(root).toBeHidden();
    await expect(root).toHaveAttribute('aria-hidden', 'true');
    await expect(root).toHaveAttribute('inert', '');

    releaseBootstrap();
    await expect(section.locator('[data-role="boh-access-gate"]')).toBeVisible({ timeout: 20_000 });
    await expect(loader).toHaveCount(0);
    await expect(root).toBeHidden();
    await expect(root).toHaveAttribute('aria-hidden', 'true');
    await expect(root).toHaveAttribute('inert', '');
  });

  test('direct hash shows closed registration without fetching private feature chunks', async ({
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
    await expect(gate).toHaveAccessibleName(/Teams are full/i);
    await expect(gate.locator('[data-role="boh-access-feedback"]')).toHaveText(
      'Team matching will be announced soon.',
      { timeout: 20_000 }
    );
    await expect(gate.locator('[data-role="boh-access-pin"]')).toBeHidden();
    await expect(gate.locator('[data-role="boh-access-pin"]')).toBeDisabled();
    await expect(gate.locator('.boh-form-actions')).toBeHidden();
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

  test('successful signup confirmation survives a delayed subscription permission error', async ({
    page,
  }) => {
    await openInjectedPlayerHub(page);
    const root = page.locator('[data-role="boh-root"]');
    const feedback = root.locator('[data-role="page-feedback"]');

    await root.locator('[data-role="signup-submit"]').click();
    await expect(feedback).toHaveText('Your stats were submitted successfully.');
    await expect(feedback).toHaveAttribute('data-tone', 'success');
    const confirmation = root.locator('[data-role="submission-confirmation"]');
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toHaveAccessibleName('Edits accepted');
    await expect(confirmation.locator('[data-role="submission-confirmation-revision"]')).toHaveText(
      'Submission revision 3'
    );

    await page.evaluate(() => window.__BOH_PUSH_SUBMISSION_ERROR__());

    await expect(feedback).toHaveText('Your stats were submitted successfully.');
    await expect(feedback).toHaveAttribute('data-tone', 'success');
    await expect
      .poll(() => page.evaluate(() => window.__BOH_BACKGROUND_ERRORS__?.at(-1)))
      .toEqual({
        message: 'Missing or insufficient permissions.',
        context: { action: 'subscribe', source: 'submission' },
      });
    await confirmation.locator('[data-role="submission-confirmation-close"]').click();
    await expect(confirmation).toBeHidden();
    await expect(root.locator('[data-role="signup-submit"]')).toBeFocused();
  });

  test('signup planning controls capture fieldable heroes, research, two fight times, and role choices', async ({
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
        rows.every(
          (row) => row.dataset.troopType === 'Archers' && ['S0', 'S1'].includes(row.dataset.season)
        )
      )
    ).toBe(true);
    await root.locator('[data-role="hero-troop-filter"]').selectOption('');
    await root.locator('[data-role="hero-season-filter"]').selectOption('X8');

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
    await expect(fightingTimes).toHaveCount(3);
    await expect(root.locator('[name="fightingTimeIds"][value="+12"]')).toBeChecked();
    await expect(root.locator('[name="fightingTimeIds"][value="+14"]')).toBeChecked();
    await root.locator('[name="fightingTimeIds"][value="+14"]').uncheck();
    await expect(root.locator('[data-role="fighting-times-count"]')).toHaveText('1 / 2 selected');
    await root.locator('[data-role="signup-submit"]').click();
    await expect(root.locator('[data-role="fighting-times-error"]')).toContainText(
      'Choose exactly two All-Star fighting times.'
    );
    expect(await page.evaluate(() => window.__BOH_SAVED_SUBMISSION__ ?? null)).toBeNull();

    await root.locator('[name="fightingTimeIds"][value="+16"]').check();
    await root.locator('[name="fightingTimeIds"][value="+14"]').click();
    await expect(root.locator('[name="fightingTimeIds"][value="+14"]')).not.toBeChecked();
    await expect(root.locator('[data-role="fighting-times-error"]')).toContainText(
      'Only two fighting times can be selected.'
    );
    await root.locator('[name="fightingTimeIds"][value="+16"]').uncheck();
    await root.locator('[name="fightingTimeIds"][value="+14"]').check();
    await expect(root.locator('[data-role="fighting-times-count"]')).toHaveText('2 / 2 selected');

    const favoriteRole = root.locator('[name="preferredRole"]');
    await favoriteRole.selectOption('');
    await expect(favoriteRole).toHaveValue('');
    await favoriteRole.selectOption('flexible');
    await expect(favoriteRole).toHaveValue('flexible');
    const secondaryRole = root.locator('[name="secondaryRole"]');
    await secondaryRole.selectOption('rune');
    await expect(secondaryRole).toHaveValue('rune');
    await root.locator('[name="leadershipInterest"][value="yes"]').check();

    await root.locator('[data-role="signup-submit"]').click();
    await expect.poll(() => page.evaluate(() => window.__BOH_SAVED_SUBMISSION__)).toBeTruthy();
    const saved = await page.evaluate(() => window.__BOH_SAVED_SUBMISSION__);
    expect(saved.options).toEqual({ expectedRevision: 2 });
    expect(saved.payload.stats.usableHeroNames).toEqual(
      expect.arrayContaining(['Lionheart', 'Cao Cao', 'Al Fatih'])
    );
    expect(saved.payload.stats.researchProgressPct).toEqual({ d1956263: 0, b2691f74: 100 });
    expect(saved.payload.commitment.fightingTimeIds).toEqual(['+12', '+14']);
    expect(saved.payload.commitment.preferredRole).toBe('flexible');
    expect(saved.payload.commitment.secondaryRole).toBe('rune');
    expect(saved.payload.commitment.canHelpLead).toBe(true);
    expect(saved.payload.rolePreferences).toEqual(['rune']);
  });

  test('mocked grant renders three sections, six 12-player teams, and both planning tools', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openInjectedPlayerHub(page);
    const root = page.locator('[data-role="boh-root"]');
    const sectionTabs = root.locator('[data-role="section-tab"]');
    await expect(sectionTabs).toHaveCount(3);
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
    const refreshedSubmission = { ...createPlayerFixture().submission, revision: 3 };
    await page.evaluate(
      (submission) => window.__BOH_PUSH_SUBMISSION__(submission),
      refreshedSubmission
    );
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
    await expect(root.locator('[data-role="event-schedule"]')).toBeVisible();
    await expect(
      root.locator('[data-role="schedule-rail"] [data-role="schedule-milestone"]')
    ).toHaveCount(3);
    await expect(root.locator('[data-role="schedule-team-times"] > li')).toHaveCount(6);
    await expect(root.locator('[data-role="schedule-team-times"] > li.is-mine')).toContainText(
      'All-Star Team 1'
    );
    await expect(root.locator('[data-role="personal-route-text"]')).toContainText('South Spawn');
    await expect(root.locator('[data-role="personal-route-text"]')).toContainText('Tower 3');
    await expect(root.locator('[data-role="personal-route-text"]')).toContainText(
      'Command Center 1'
    );
    await expect(root.locator('[data-role="map-objectives"] > g')).toHaveCount(27);
    await expect(root.locator('[data-objective-id="spawn"]')).toHaveAttribute(
      'transform',
      'translate(78 446)'
    );
    await expect(root.locator('[data-objective-id="cc1"]')).toHaveClass(/is-target/);
    await expect(root.locator('[data-role="map-objective"][role="button"]')).toHaveCount(27);
    await expect(root.locator('[data-role="map-objective"] .boh-map__flag-cloth')).toHaveCount(27);
    await expect(root.locator('[data-role="map-objective"] circle')).toHaveCount(0);
    await expect(
      root.locator('[data-role="map-objective"] .boh-map__objective-hit').first()
    ).toHaveAttribute('width', '72');
    await expect(root.locator('[data-role="map-route"]')).toHaveAttribute(
      'd',
      'M 78 446 L 486 254 L 855 61'
    );
    await expect(root.locator('[data-role="map-network"] .boh-map__network-path')).toHaveCount(3);
    await expect(root.locator('[data-role="map-network"] [data-network-route="main"]')).toHaveCount(
      1
    );
    await expect(root.locator('[data-role="map-network"] .is-branch')).toHaveCount(2);
    await expect(root.locator('[data-role="map-network"] .boh-map__territory-square')).toHaveCount(
      8
    );

    await root.locator('[data-objective-id="cc1"]').click();
    await expect(root.locator('[data-role="map-objective-detail"]')).toContainText(
      'CC1 · Command Center · 635:635'
    );
    await expect(root.locator('[data-role="map-objective-detail"]')).toContainText('Player 1-01');
    await root.locator('[data-objective-id="objective-h1"]').click();
    await expect(root.locator('[data-role="map-objective-detail"]')).toContainText(
      'H1 · Hospital · 575:620'
    );
    await expect(root.locator('[data-role="map-objective-detail"]')).toContainText(
      'No personal assignment at this structure in your current plan.'
    );
    await expect(root.locator('[data-role="map-objective-detail"]')).not.toContainText(
      'Player 1-01'
    );

    await sectionTabs.nth(0).click();
    const lanePreferences = root.locator('[name="epicLanePreferences"]');
    const timePreferences = root.locator('[name="epicTimePreferences"]');
    await expect(lanePreferences).toHaveCount(3);
    await expect(timePreferences).toHaveCount(8);
    await expect(root.locator('[name="epicGameName"]')).toHaveValue('Player 1-01');
    await expect(root.locator('[name="epicLanePreferences"][value="south"]')).toBeChecked();
    await expect(root.locator('[name="epicLanePreferences"][value="north"]')).toBeChecked();
    await expect(root.locator('[name="epicTimePreferences"][value="+8"]')).toBeChecked();
    await root.locator('[name="epicLanePreferences"][value="center"]').check();
    await root.locator('[name="epicTimePreferences"][value="+10"]').check();
    await root.locator('[name="epicTimePreferences"][value="+12"]').check();
    await root.locator('[name="epicFlexibilityPreference"][value="change-times"]').check();
    await expect(root.locator('[data-role="showdown-summary"]')).toContainText(
      '3 positions · 3 game times selected'
    );
    await root.locator('[data-role="signup-submit"]').click();
    await expect(root.locator('[data-role="showdown-save-state"]')).toContainText('revision 3');
    await expect
      .poll(() => page.evaluate(() => window.__BOH_SAVED_EPIC_PREFERENCES__))
      .toEqual({
        payload: {
          gameName: 'Player 1-01',
          lanePreferences: ['south', 'center', 'north'],
          timePreferences: ['+8', '+10', '+12'],
          flexibilityPreference: 'change-times',
        },
        options: { expectedRevision: 2 },
      });

    await root.locator('[data-role="submission-confirmation-close"]').click();

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
    await root.locator('[data-role="signup-submit"]').click();
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

    await root.locator('[data-role="submission-confirmation-close"]').click();
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
    await expect(root.locator('.boh-action-card--crystal')).toContainText('Gather crystals');
    await expect(root.locator('.boh-action-card--teleport')).toContainText('Teleport to Tower 3');
    await expect(root.locator('[data-role="next-action"]')).toHaveText('Legion 2 phase 3 action');
    await root.locator('label[for="bohLegion1"]').click();
    await phaseTabs.nth(2).click();
    await expect(root.locator('[data-role="current-action"]')).toHaveText('Standby assignment');
    await expect(root.locator('[data-role="current-teleport"]')).toBeHidden();
    await expect(root.locator('.boh-phase-summary .is-standby')).toHaveCount(1);

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

  test('OCR fills power fields directly and highlights any missing values for editing', async ({
    page,
  }) => {
    await openInjectedPlayerHub(page);
    const root = await prepareInjectedOcr(page);
    await root.locator('[data-role="ocr-process"]').click();

    const review = root.locator('[data-role="ocr-review-alert"]');
    const technology = root.locator('[name="technologyPower"]');
    const specialty = root.locator('[name="unitSpecialtyPower"]');
    await expect(review).toBeVisible();
    await expect(review).toContainText('OCR missed 2 required field');
    await expect(review).toContainText('Technology power was cropped');
    await expect(technology).toHaveAttribute('aria-invalid', 'true');
    await expect(technology).toHaveAttribute('aria-describedby', /bohOcrIssue-technologyPower/u);
    await expect(root.locator('#bohOcrIssue-technologyPower')).toContainText('Missing');
    await expect(root.locator('#bohOcrIssue-unitSpecialtyPower')).toContainText('Missing');
    await expect(root.locator('#bohOcrIssue-troopPower')).toContainText('Low OCR confidence');
    await expect(root.locator('[name="totalCastlePower"]')).toHaveValue('1000000000');
    await expect(root.locator('[name="troopPower"]')).toHaveValue('400000000');
    await expect(root.locator('[data-role="ocr-values-confirmed"]')).toHaveCount(0);

    await technology.fill('300000000');
    await specialty.fill('50000000');
    await expect(technology).not.toHaveAttribute('aria-invalid', 'true');
    await expect(root.locator('#bohOcrIssue-technologyPower')).toContainText('Corrected manually');
  });

  test('two rapid bubbling OCR activations share one in-flight transport request', async ({
    page,
  }) => {
    await openInjectedPlayerHub(page, { ocrTransport: { deferred: true } });
    const root = await prepareInjectedOcr(page);
    const process = root.locator('[data-role="ocr-process"]');
    const progress = root.locator('[data-role="ocr-progress"]');
    const status = root.locator('[data-role="ocr-status"]');

    await process.evaluate((button) => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    await expect.poll(() => page.evaluate(() => window.__BOH_OCR_CALL_COUNT__)).toBe(1);
    await expect(process).toBeDisabled();
    await expect(progress).toBeVisible();
    await expect(status).toHaveText(
      'Reading screenshot—keep this page open. You may continue filling the form.'
    );

    await page.evaluate(() => window.__BOH_RESOLVE_OCR__());
    await expect.poll(() => page.evaluate(() => window.__BOH_OCR_CALL_COUNT__)).toBe(1);
    await expect(progress).toBeHidden();
    await expect(process).toBeEnabled();
    await expect(status).toHaveText('Power values filled automatically. Review the fields below.');
  });

  test('OCR failure clears progress and permits one deliberate successful retry', async ({
    page,
  }) => {
    await openInjectedPlayerHub(page, { ocrTransport: { failOnce: true } });
    const root = await prepareInjectedOcr(page);
    const process = root.locator('[data-role="ocr-process"]');
    const progress = root.locator('[data-role="ocr-progress"]');
    const status = root.locator('[data-role="ocr-status"]');

    await process.click();
    await expect.poll(() => page.evaluate(() => window.__BOH_OCR_CALL_COUNT__)).toBe(1);
    await expect(progress).toBeHidden();
    await expect(status).toHaveText(
      'Screenshot reading failed. Retry, or enter or correct the values manually—you can still save your update.'
    );
    await expect(process).toBeEnabled();

    await process.click();
    await expect.poll(() => page.evaluate(() => window.__BOH_OCR_CALL_COUNT__)).toBe(2);
    await expect(progress).toBeHidden();
    await expect(process).toBeEnabled();
    await expect(status).toHaveText('Power values filled automatically. Review the fields below.');
  });
});

test.describe('All-Star BoH Admin VTS command center', () => {
  test('configures a 24-player balanced two-team field, forces an exact team, and previews before apply', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="teams"]').click();
    const teamBoard = root.locator('.boh-admin-team-board');
    await expect(root.locator('.boh-admin-team')).toHaveCount(6);
    await expect
      .poll(() =>
        teamBoard.evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns.split(/\s+/u).length
        )
      )
      .toBe(3);
    await page.setViewportSize({ width: 1000, height: 1000 });
    await expect
      .poll(() =>
        teamBoard.evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns.split(/\s+/u).length
        )
      )
      .toBe(2);
    await page.setViewportSize({ width: 700, height: 1000 });
    await expect
      .poll(() =>
        teamBoard.evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns.split(/\s+/u).length
        )
      )
      .toBe(1);
    await page.setViewportSize({ width: 1440, height: 1000 });

    const settings = root.locator('[data-form="team-builder-settings"]');
    const settingsDetails = settings.locator('xpath=ancestor::details[1]');
    await expect(settingsDetails).not.toHaveAttribute('open', '');
    await settingsDetails.locator('summary').click();
    await expect(settings).toBeVisible();
    await settings.locator('[name="teamCount"]').selectOption('2');
    await settings.locator('[name="balanceMetric"]').selectOption('balanced');
    await settings.locator('[name="forcedTeam.player-1-2"]').selectOption('team-2');
    await settings.getByRole('button', { name: 'Save balance configuration' }).click();

    await expect(root.locator('.boh-admin-team')).toHaveCount(2);
    await expect(root.locator('.boh-admin-seat')).toHaveCount(24);
    const eligiblePool = root.locator('[data-form="eligible-pool"]');
    const eligibleSummary = eligiblePool.locator('xpath=ancestor::details[1]/summary');
    await expect(eligibleSummary).toContainText('24 / 24');
    await expect(
      root.locator('[data-form="eligible-pool"] input[name="playerId"]:checked')
    ).toHaveCount(24);
    await eligibleSummary.click();
    await expect(eligiblePool.getByLabel('Search eligible players')).toBeVisible();
    const firstEligibleLabel = await eligiblePool
      .locator('[data-eligible-pool-row] .boh-admin-eligible-player > span')
      .first()
      .textContent();
    await eligiblePool
      .getByLabel('Search eligible players')
      .fill(firstEligibleLabel?.split(' Â· ')[0] || 'player');
    await expect(eligiblePool.locator('[data-eligible-pool-search-count]')).toContainText(
      /matches/u
    );
    await eligiblePool.getByLabel('Search eligible players').fill('');
    const firstEligibleCheckbox = eligiblePool.locator('input[name="playerId"]').first();
    await firstEligibleCheckbox.uncheck();
    await expect(eligibleSummary).toContainText('23 / 24');
    await expect(
      eligiblePool.getByRole('button', { name: 'Save eligible field (23 / 24)' })
    ).toBeVisible();
    await eligiblePool.getByRole('button', { name: 'Select highest 24' }).click();
    await expect(eligibleSummary).toContainText('24 / 24');
    await expect
      .poll(() => page.evaluate(() => window.__BOH_ADMIN_ACTIONS__.map((action) => action.type)))
      .toEqual(['saveTeamBuilderSettings']);
    await expect(
      eligiblePool.getByRole('button', { name: 'Save eligible field (24 / 24)' })
    ).toBeVisible();
    await root
      .locator('[data-form="eligible-pool"]')
      .getByRole('button', { name: 'Save eligible field (24 / 24)' })
      .click();

    await root.locator('[data-action="preview-balance-teams"]').click();
    await expect(root.locator('#bohBalancePreviewTitle')).toContainText(
      'Active metric: Balanced score + power'
    );
    await expect(
      root.locator('#bohBalancePreviewTitle').locator('xpath=ancestor::section[1]')
    ).toContainText('=Formula Pilot');
    const previewSection = root
      .locator('#bohBalancePreviewTitle')
      .locator('xpath=ancestor::section[1]');
    await expect(previewSection).toContainText('Score spread');
    await expect(previewSection).toContainText('Power spread');
    await expect(previewSection).not.toContainText('Active metric spread');
    await expect(root.locator('[data-action="apply-balance-preview"]')).toBeEnabled();
    await root.locator('[data-action="apply-balance-preview"]').click();
    const balancedTeamScoreTexts = await root.locator('.boh-admin-team-score').allTextContents();
    expect(balancedTeamScoreTexts).toHaveLength(2);
    await expect(root.locator('.boh-admin-team-score [data-balance-primary-total]')).toHaveCount(0);
    for (const text of balancedTeamScoreTexts) {
      expect(text).toContain('Balanced score + power');
      expect(text).toContain('Scoring points');
      expect(text).toContain('Total in-game power');
      expect(text).not.toContain('vs avg');
    }
    await expect(root.getByRole('button', { name: 'Roles PNG' })).toBeVisible();
    await expect(root.getByRole('button', { name: 'Scores PNG' })).toBeVisible();
    await expect(root.getByText('Co-leader 1').first()).toBeVisible();
    await root.getByRole('button', { name: 'Auto roles by rank' }).click();
    await expect
      .poll(() => page.evaluate(() => window.__BOH_ADMIN_ACTIONS__.map((action) => action.type)))
      .toContain('autoAssignRankedRoles');

    const result = await page.evaluate(() => ({
      actions: window.__BOH_ADMIN_ACTIONS__,
      confirms: window.__BOH_ADMIN_CONFIRMS__,
      forcedSeat: window.__BOH_ADMIN_SNAPSHOT__.teams
        .find((team) => team.id === 'team-2')
        .seats.find((seat) => seat.playerId === 'player-1-2'),
    }));
    expect(result.actions.map((action) => action.type)).toEqual([
      'saveTeamBuilderSettings',
      'saveEligiblePool',
      'previewBalanceTeams',
      'applyBalancePreview',
      'autoAssignRankedRoles',
    ]);
    expect(result.actions[0].payload).toMatchObject({
      teamCount: 2,
      balanceMetric: 'balanced',
      forcedTeamAssignments: [{ playerId: 'player-1-2', teamId: 'team-2' }],
    });
    expect(result.actions[1].payload.playerIds).toHaveLength(24);
    expect(result.confirms.at(-1)).toMatch(/apply this exact balance preview/iu);
    expect(result.forcedSeat).toMatchObject({
      playerId: 'player-1-2',
      displayName: '=Formula Pilot',
      locked: false,
    });
  });

  test('edits the reviewed player name and an individual confirmed stat with audit reasons', async ({
    page,
  }) => {
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="signups"]').click();
    await root.locator('[data-action="select-submission"][data-player-id="player-1-2"]').click();

    const corrections = root.locator('[data-form="submission-corrections"]');
    await expect(corrections.locator('[name="correction.stats.unitSpecialtyPower"]')).toHaveValue(
      '22000000'
    );
    await corrections.locator('[name="correction.gameName"]').fill('Formula Pilot Renamed');
    await corrections.locator('[name="correction.stats.unitSpecialtyPower"]').fill('25000000');
    await corrections
      .locator('[name="correction.reason"]')
      .fill('Confirmed from the submitted screenshot.');
    await corrections.getByRole('button', { name: 'Save corrections' }).click();

    await expect(root.locator('#bohSignupDetailTitle')).toHaveText('Formula Pilot Renamed');
    const result = await page.evaluate(() => ({
      action: window.__BOH_ADMIN_ACTIONS__.at(-1),
      submission: window.__BOH_ADMIN_SNAPSHOT__.submissions.find(
        (item) => item.playerId === 'player-1-2'
      ),
    }));
    expect(result.action.type).toBe('reviewSubmission');
    expect(result.action.payload).toMatchObject({
      playerId: 'player-1-2',
      status: 'confirmed',
      submissionCorrection: {
        schemaVersion: 1,
        reason: 'Confirmed from the submitted screenshot.',
        values: {
          gameName: 'Formula Pilot Renamed',
          stats: { unitSpecialtyPower: 25_000_000 },
        },
      },
    });
    expect(result.submission).toMatchObject({
      originalGameName: '=Formula Pilot',
      displayName: 'Formula Pilot Renamed',
      stats: { unitSpecialtyPower: 25_000_000 },
    });
  });

  test('filters and sorts signups, safely exports visible rows, then batch-confirms that selection', async ({
    page,
  }) => {
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="signups"]').click();
    const filters = root.locator('[data-form="signup-filter"]');
    await filters.locator('[name="search"]').fill('Pilot');
    await filters.locator('[name="status"]').selectOption('confirmed');
    await filters.locator('[name="fightingTime"]').selectOption('+14');
    await filters.locator('[name="role"]').selectOption('offensive');
    await filters.locator('[name="troopType"]').selectOption('cavalry');
    await filters.locator('[name="vtsMember"]').selectOption('true');
    await filters.locator('[name="minTotalPower"]').fill('700000000');
    await filters.locator('[name="maxTotalPower"]').fill('950000000');
    await filters.getByRole('button', { name: 'Apply filters' }).click();

    const table = root.locator('.boh-admin-review-layout table');
    await expect(table.locator('caption')).toHaveText('2 of 72 signups');
    await expect(table.locator('tbody tr')).toHaveCount(2);
    const powerSort = table.locator('[data-action="signup-sort"][data-sort-key="power"]');
    await powerSort.click();
    await expect(powerSort.locator('xpath=ancestor::th[1]')).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    await expect(table.locator('tbody tr th strong')).toHaveText(['Alpha Pilot', '=Formula Pilot']);
    await powerSort.click();
    await expect(table.locator('tbody tr th strong')).toHaveText(['=Formula Pilot', 'Alpha Pilot']);

    await root.locator('[data-action="export-signups"]').click();
    const download = await page.evaluate(() => window.__BOH_ADMIN_DOWNLOADS__.at(-1));
    expect(download.playerIds).toEqual(['player-1-2', 'player-1-3']);
    expect(download.csv.startsWith('\uFEFF')).toBe(true);
    expect(download.csv).toContain('\r\n');
    expect(download.csv).toContain(
      '"Calculated Score","Legacy Final Override","Commitment Adjustment","Final Score","Score Diagnostic"'
    );
    expect(download.csv).toContain(
      '"Canonical Troop Roster","Lofty Count","Enhanced T10 Count","Regular T10 Count","T9 Count"'
    );
    expect(download.csv).toContain('"\'=Formula Pilot"');
    expect(download.csv).not.toContain('Player 2-01');

    const selectAll = root.locator('[data-action="select-all-visible"]');
    const rowCheckboxes = table.locator('[data-action="select-submission-row"]');
    await rowCheckboxes.first().check();
    await expect(selectAll).not.toBeChecked();
    expect(await selectAll.evaluate((checkbox) => checkbox.indeterminate)).toBe(true);
    await rowCheckboxes.first().uncheck();
    expect(await selectAll.evaluate((checkbox) => checkbox.indeterminate)).toBe(false);
    await selectAll.check();
    await expect(table.locator('[data-action="select-submission-row"]:checked')).toHaveCount(2);
    const batch = root.locator('[data-form="batch-review"]');
    await batch.locator('[name="note"]').fill('Confirmed together after final review.');
    await batch.getByRole('button', { name: 'Confirm selected (2)' }).click();

    const batchResult = await page.evaluate(() => ({
      action: window.__BOH_ADMIN_ACTIONS__.at(-1),
      confirms: window.__BOH_ADMIN_CONFIRMS__,
    }));
    expect(batchResult.confirms.at(-1)).toMatch(/confirm 2 visible selected signups/iu);
    expect(batchResult.action).toMatchObject({
      type: 'batchReviewSubmissions',
      payload: {
        playerIds: ['player-1-2', 'player-1-3'],
        status: 'confirmed',
        note: 'Confirmed together after final review.',
      },
    });
    await expect(batch.getByRole('button', { name: 'Confirm selected (0)' })).toBeDisabled();

    await root.locator('[data-action="select-all-visible"]').check();
    const deleteSelected = batch.getByRole('button', { name: 'Delete selected (2)' });
    await expect(deleteSelected).toBeEnabled();
    await deleteSelected.click();
    const deleteResult = await page.evaluate(() => ({
      action: window.__BOH_ADMIN_ACTIONS__.at(-1),
      confirms: window.__BOH_ADMIN_CONFIRMS__,
    }));
    expect(deleteResult.action).toMatchObject({
      type: 'batchDeleteSubmissions',
      payload: { playerIds: ['player-1-2', 'player-1-3'] },
    });
    expect(deleteResult.confirms.at(-1)).toMatch(
      /cannot be undone.*signups.*reviews.*player feedback.*preferences will be kept/iu
    );
    await expect(table.locator('caption')).toHaveText('0 of 70 signups');
    await expect(batch.getByRole('button', { name: 'Delete selected (0)' })).toBeDisabled();
  });

  test('batch deletion keeps failed rows selected and closes detail only for a successful deletion', async ({
    page,
  }) => {
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="signups"]').click();
    await page.evaluate(() => {
      window.__BOH_ADMIN_DELETE_FAILURE_IDS__ = ['player-1-3'];
    });
    const successfulRow = root.locator(
      '[data-action="select-submission-row"][data-player-id="player-1-2"]'
    );
    const failedRow = root.locator(
      '[data-action="select-submission-row"][data-player-id="player-1-3"]'
    );
    await successfulRow.check();
    await failedRow.check();
    await root.locator('[data-action="select-submission"][data-player-id="player-1-2"]').click();
    await root.getByRole('button', { name: 'Delete selected (2)' }).click();

    await expect(successfulRow).toHaveCount(0);
    await expect(failedRow).toBeChecked();
    await expect(root.locator('#bohSignupDetailTitle')).toHaveCount(0);

    await root.locator('[data-action="select-submission"][data-player-id="player-1-3"]').click();
    const failedTitle = await root.locator('#bohSignupDetailTitle').textContent();
    await root.getByRole('button', { name: 'Delete selected (1)' }).click();
    await expect(failedRow).toBeChecked();
    await expect(root.locator('#bohSignupDetailTitle')).toHaveText(failedTitle);
  });

  test('single deletion preserves retry state on failure and clears it only after success', async ({
    page,
  }) => {
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="signups"]').click();
    await page.evaluate(() => {
      window.__BOH_ADMIN_DELETE_FAILURE_IDS__ = ['player-1-2'];
    });
    const rowCheckbox = root.locator(
      '[data-action="select-submission-row"][data-player-id="player-1-2"]'
    );
    await rowCheckbox.check();
    await root.locator('[data-action="select-submission"][data-player-id="player-1-2"]').click();
    const detailTitle = await root.locator('#bohSignupDetailTitle').textContent();
    await root.getByRole('button', { name: 'Delete this signup' }).click();
    await expect(rowCheckbox).toBeChecked();
    await expect(root.locator('#bohSignupDetailTitle')).toHaveText(detailTitle);

    await page.evaluate(() => {
      window.__BOH_ADMIN_DELETE_FAILURE_IDS__ = [];
    });
    await root.getByRole('button', { name: 'Delete this signup' }).click();
    await expect(rowCheckbox).toHaveCount(0);
    await expect(root.locator('#bohSignupDetailTitle')).toHaveCount(0);
  });

  test('390px viewport has no horizontal overflow on the signup stage', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="signups"]').click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(0);
  });

  test('persistent live region survives renderShell cycles without losing DOM identity', async ({
    page,
  }) => {
    await openInjectedAdmin(page);
    const element = page.locator('#bohAdminStatus');
    await expect(element).toBeAttached();
    await element.evaluate((el) => el.setAttribute('data-mark', 'persist'));
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="scoring"]').click();
    await root.locator('[data-stage="signups"]').click();
    await expect(element).toHaveAttribute('data-mark', 'persist');
  });

  test('focus returns to review button after closing detail panel', async ({ page }) => {
    await openInjectedAdmin(page);
    const root = page.locator('#dashAllStarBohRoot');
    await root.locator('[data-stage="signups"]').click();
    const reviewBtn = root.locator(
      '[data-action="select-submission"][data-player-id="player-1-1"]'
    );
    await reviewBtn.click();
    await expect(root.locator('#bohSignupDetailTitle')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(reviewBtn).toBeFocused();
  });

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
    await expect(planningSignals).toContainText('+12');
    await expect(planningSignals).toContainText('+16');
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
    await expect(root).toContainText(
      'Commitment adjustments are a separate subjective input and may double-count judgment'
    );
    const scoreAudit = root.locator('.boh-admin-score-table');
    const totalPowerSort = scoreAudit.getByRole('button', { name: 'Total power' });
    const totalPowerHeader = totalPowerSort.locator('xpath=ancestor::th[1]');
    await expect(scoreAudit.locator('thead th')).toHaveCount(7);
    await totalPowerSort.focus();
    await page.keyboard.press('Enter');
    await expect(totalPowerHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(totalPowerSort.locator('.boh-admin-sort-indicator')).toHaveText('↑');
    await totalPowerSort.focus();
    await page.keyboard.press('Enter');
    await expect(totalPowerHeader).toHaveAttribute('aria-sort', 'descending');
    await root.locator('[data-stage="signups"]').click();
    await root.locator('[data-stage="scoring"]').click();
    await expect(totalPowerHeader).toHaveAttribute('aria-sort', 'descending');
    const commitmentForm = root.locator('[data-form="commitment-scores"]');
    const formulaPilotScore = commitmentForm.locator('[data-commitment-score-player="player-1-2"]');
    const alphaPilotScore = commitmentForm.locator('[data-commitment-score-player="player-1-3"]');
    await expect(formulaPilotScore).toHaveAttribute(
      'aria-label',
      'Commitment score for =Formula Pilot'
    );
    await expect(formulaPilotScore).toHaveAttribute('min', '1');
    await expect(formulaPilotScore).toHaveAttribute('max', '10000');
    await formulaPilotScore.fill('125');
    await alphaPilotScore.fill('250');
    await commitmentForm.locator('[name="reason"]').fill('Rendered leadership audit');
    await commitmentForm.getByRole('button', { name: 'Save manual scores' }).click();
    await expect(formulaPilotScore).toHaveValue('125');
    await expect(alphaPilotScore).toHaveValue('250');
    const commitmentActions = await page.evaluate(() =>
      window.__BOH_ADMIN_ACTIONS__.filter((action) => action.type === 'saveCommitmentScores')
    );
    expect(commitmentActions).toHaveLength(1);
    expect(commitmentActions[0].payload).toMatchObject({
      reason: 'Rendered leadership audit',
      adjustments: expect.arrayContaining([
        { playerId: 'player-1-2', score: '125' },
        { playerId: 'player-1-3', score: '250' },
      ]),
    });

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

    await root.locator('[data-stage="publish"]').click();
    const schedule = root.locator('[data-form="event-schedule"]');
    const scheduleStatus = schedule.locator('[data-action="schedule-status"]');
    await expect(scheduleStatus).toHaveValue('hidden');
    await expect(schedule.locator('[name="eventStartsAt"]')).not.toHaveAttribute('required', '');
    await scheduleStatus.selectOption('published');
    await expect(schedule.locator('[name="eventStartsAt"]')).toHaveAttribute('required', '');
    await expect(schedule.getByRole('button', { name: 'Save schedule' })).toBeDisabled();
    await schedule.locator('[data-action="schedule-status"]').selectOption('hidden');
    await expect(schedule.locator('[name="eventStartsAt"]')).not.toHaveAttribute('required', '');
    await schedule.getByRole('button', { name: 'Save schedule' }).click();
    await expect
      .poll(() => page.evaluate(() => window.__BOH_ADMIN_ACTIONS__.at(-1)?.type))
      .toBe('saveEventSchedule');
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
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__BOH_ADMIN_ACTIONS__.filter(
              (action) => action.type === 'applyLegacyStructureTemplate'
            ).length
        )
      )
      .toBe(1);
    const command = await page.evaluate(() =>
      window.__BOH_ADMIN_ACTIONS__.find((action) => action.type === 'applyLegacyStructureTemplate')
    );
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
