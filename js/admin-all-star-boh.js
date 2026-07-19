import * as BohModel from './all-star-boh-model.js';

const CONTROLLERS = new WeakMap();

const TEAM_COUNT = 6;
const ROSTER_SIZE = 12;
const EPIC_LANE_IDS = ['south', 'center', 'north'];
const DEFAULT_EPIC_TIME_OPTIONS = ['+6', '+8', '+10', '+12', '+14', '+16', '+18', '+20'];
const TEAM_NAME_LABELS = Object.freeze({
  'iron-wolves': 'Iron Wolves',
  'storm-ravens': 'Storm Ravens',
  'ember-lions': 'Ember Lions',
  'frost-bears': 'Frost Bears',
  'night-falcons': 'Night Falcons',
  'thunder-bulls': 'Thunder Bulls',
});

const STAGES = [
  ['signups', 'adminBohStageSignups', 'Signup Review'],
  ['scoring', 'adminBohStageScoring', 'Scoring'],
  ['teams', 'adminBohStageTeams', 'Team Builder'],
  ['plans', 'adminBohStagePlans', 'Plans & Roles'],
  ['publish', 'adminBohStagePublish', 'Publish'],
];

const SCORE_COMPONENTS = [
  ['troopPower', 'adminBohScoreTroopPower', 'Troop power', 0.05],
  ['buildingPower', 'adminBohScoreBuildingPower', 'Building power', 0.3],
  ['technologyPower', 'adminBohScoreTechnologyPower', 'Technology power', 0.7],
  ['heroCombatPower', 'adminBohScoreHeroPower', 'Hero combat power', 0.8],
  ['dragonPower', 'adminBohScoreDragonPower', 'Dragon power', 1],
  ['t9TroopType', 'adminBohScoreT9Type', 'Each T10 troop type', 3000],
  ['readySpeedHero', 'adminBohScoreSpeedHero', 'Each ready speed hero', 2500],
  ['level50Hero', 'adminBohScoreLevel50Hero', 'Each level 50 hero', 750],
  ['bohUsefulRating', 'adminBohScoreBohUseful', 'BoH usefulness point', 1000],
];

const DEFAULT_PHASES = [
  { id: 'phase-0-5', label: '0–5 min', startMinute: 0, endMinute: 5, order: 1 },
  { id: 'phase-5-10', label: '5–10 min', startMinute: 5, endMinute: 10, order: 2 },
  { id: 'phase-10-15', label: '10–15 min', startMinute: 10, endMinute: 15, order: 3 },
  { id: 'phase-15-30', label: '15–30 min', startMinute: 15, endMinute: 30, order: 4 },
];

const DEFAULT_LEGIONS = [
  { id: 'legion-1', label: 'Legion 1', order: 1 },
  { id: 'legion-2', label: 'Legion 2', order: 2 },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

function finiteNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(typeof value === 'string' ? value.replaceAll(',', '') : value);
  return Number.isFinite(number) ? number : fallback;
}

function integer(value, fallback = 0) {
  return Math.round(finiteNumber(value, fallback));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, finiteNumber(value, min)));
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueTextList(value) {
  return [...new Set(list(value).map(cleanText).filter(Boolean))];
}

function makeTranslator(translator) {
  return (key, fallback, values = null) => {
    let translated = '';
    try {
      translated = typeof translator === 'function' ? translator(key, values || {}) : '';
    } catch {
      translated = '';
    }
    const base = !translated || translated === key ? fallback : translated;
    if (!values) return String(base ?? '');
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      String(base ?? '')
    );
  };
}

function resolveRoot(container) {
  if (typeof container === 'string') return document.querySelector(container);
  return container || document.getElementById('dashAllStarBohRoot');
}

function playerId(player) {
  return cleanText(player?.playerId || player?.memberId || player?.uid || player?.id);
}

function playerName(player) {
  return cleanText(
    player?.displayName ||
      player?.gameName ||
      player?.playerName ||
      player?.accountName ||
      player?.name
  );
}

function submissionStatus(submission) {
  return cleanText(submission?.reviewStatus || submission?.status || 'pending').toLowerCase();
}

function scoringVersion(snapshot) {
  return (
    snapshot?.scoring?.activeVersion ||
    snapshot?.scoring?.draftVersion ||
    list(snapshot?.scoring?.versions)[0] ||
    null
  );
}

function defaultWeights() {
  return Object.fromEntries(SCORE_COMPONENTS.map(([key, , , value]) => [key, value]));
}

function normalizeSeat(source, teamId, seatNumber) {
  return {
    id: cleanText(source?.id) || `${teamId}-seat-${seatNumber}`,
    seatNumber,
    playerId: cleanText(source?.playerId || source?.memberId),
    displayName: cleanText(source?.displayName || source?.playerName),
    roleGroupId: cleanText(source?.roleGroupId || source?.roleId),
    locked: Boolean(source?.locked),
    note: cleanText(source?.note),
  };
}

function normalizeTeams(sourceTeams) {
  const teams = list(sourceTeams);
  return Array.from({ length: TEAM_COUNT }, (_, index) => {
    const number = index + 1;
    const source =
      teams.find((team) => integer(team?.number || team?.teamNumber) === number) ||
      teams[index] ||
      {};
    const id = cleanText(source.id) || `team-${number}`;
    const sourceSeats = list(source.seats || source.assignments);
    const seats = Array.from({ length: ROSTER_SIZE }, (_unused, seatIndex) => {
      const seatNumber = seatIndex + 1;
      const seat =
        sourceSeats.find(
          (candidate) => integer(candidate?.seatNumber || candidate?.number) === seatNumber
        ) ||
        sourceSeats[seatIndex] ||
        {};
      return normalizeSeat(seat, id, seatNumber);
    });
    return {
      id,
      number,
      name: cleanText(source.name || source.label) || `Team ${number}`,
      generatedName: !cleanText(source.name || source.label),
      color: cleanText(source.color),
      captainId: cleanText(source.captainId),
      notes: cleanText(source.notes),
      seats,
    };
  });
}

function normalizeRoleGroups(snapshot) {
  const roles = list(snapshot?.plan?.roleGroups || snapshot?.roleGroups || snapshot?.roles).map(
    (role, index) => ({
      id: cleanText(role?.id) || `role-${index + 1}`,
      label: cleanText(role?.label || role?.name) || `Role ${index + 1}`,
      generatedLabel: !cleanText(role?.label || role?.name),
      capacity: Math.max(0, integer(role?.capacity)),
      color: cleanText(role?.color) || '#64748b',
      order: integer(role?.order, index + 1),
    })
  );
  return roles.length
    ? roles.sort((a, b) => a.order - b.order)
    : [
        {
          id: 'unassigned',
          label: 'Unassigned',
          generatedLabel: true,
          capacity: ROSTER_SIZE,
          color: '#64748b',
          order: 1,
        },
      ];
}

function normalizePhases(snapshot) {
  const phases = list(snapshot?.plan?.phases || snapshot?.phases).map((phase, index) => ({
    id: cleanText(phase?.id) || `phase-${index + 1}`,
    label: cleanText(phase?.label || phase?.name) || `Phase ${index + 1}`,
    generatedLabel: !cleanText(phase?.label || phase?.name),
    startMinute: Math.max(0, integer(phase?.startMinute ?? phase?.start)),
    endMinute: Math.max(0, integer(phase?.endMinute ?? phase?.end)),
    order: integer(phase?.order, index + 1),
  }));
  return phases.length
    ? phases.sort((a, b) => a.order - b.order)
    : DEFAULT_PHASES.map((phase) => ({ ...phase, generatedLabel: true }));
}

function normalizeLegions(snapshot) {
  const legions = list(snapshot?.plan?.legions || snapshot?.legions).map((legion, index) => ({
    id: cleanText(legion?.id) || `legion-${index + 1}`,
    label: cleanText(legion?.label || legion?.name) || `Legion ${index + 1}`,
    generatedLabel: !cleanText(legion?.label || legion?.name),
    order: integer(legion?.order, index + 1),
  }));
  return legions.length
    ? legions.sort((a, b) => a.order - b.order)
    : DEFAULT_LEGIONS.map((legion) => ({ ...legion, generatedLabel: true }));
}

function normalizeSnapshot(source = {}) {
  const snapshot = source && typeof source === 'object' ? source : {};
  const scoring = snapshot.scoring && typeof snapshot.scoring === 'object' ? snapshot.scoring : {};
  const plan = snapshot.plan && typeof snapshot.plan === 'object' ? snapshot.plan : {};
  return {
    ...snapshot,
    revision: Math.max(0, integer(snapshot.revision)),
    event: {
      teamCount: TEAM_COUNT,
      rosterSize: ROSTER_SIZE,
      ...(snapshot.event || {}),
    },
    submissions: list(snapshot.submissions),
    scores: list(snapshot.scores || snapshot.scoredPlayers),
    scoring: {
      ...scoring,
      versions: list(scoring.versions),
    },
    teams: normalizeTeams(snapshot.teams),
    plan: {
      ...plan,
      roleGroups: normalizeRoleGroups(snapshot),
      phases: normalizePhases(snapshot),
      legions: normalizeLegions(snapshot),
      instructions: list(plan.instructions || snapshot.instructions),
      rotations: list(plan.rotations || snapshot.rotations),
      objectives: list(plan.objectives || snapshot.objectives),
      notes: list(plan.notes || snapshot.notes),
    },
    publications:
      snapshot.publications && typeof snapshot.publications === 'object'
        ? snapshot.publications
        : {},
    validation:
      snapshot.validation && typeof snapshot.validation === 'object' ? snapshot.validation : {},
  };
}

function preferenceRecords(source) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source).map(([uid, preference]) => ({
    ...(preference && typeof preference === 'object' ? preference : {}),
    uid: cleanText(preference?.uid) || uid,
  }));
}

function timePreferenceOrder(value) {
  const numeric = Number(cleanText(value).replace(/^utc\s*/iu, ''));
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
}

export function getAdminPreferredTeammateNames(submission = {}) {
  return uniqueTextList(submission?.preferredTeammates);
}

export function buildAdminEpicShowdownPreferenceSummary(snapshot = {}) {
  const submissions = list(snapshot?.submissions);
  const submissionsByIdentifier = new Map();
  for (const submission of submissions) {
    const identifiers = uniqueTextList([
      playerId(submission),
      submission?.submissionUid,
      submission?.uid,
      submission?.id,
    ]);
    for (const identifier of identifiers) submissionsByIdentifier.set(identifier, submission);
  }

  const playersById = new Map();
  for (const rawPreference of preferenceRecords(snapshot?.epicPreferences)) {
    const identifier = playerId(rawPreference);
    if (!identifier) continue;
    const submission = submissionsByIdentifier.get(identifier) || null;
    const resolvedId = playerId(submission) || identifier;
    const lanes = uniqueTextList(rawPreference?.lanePreferences)
      .map((lane) => lane.toLocaleLowerCase())
      .filter((lane) => EPIC_LANE_IDS.includes(lane));
    const times = uniqueTextList(rawPreference?.timePreferences);
    playersById.set(resolvedId, {
      playerId: resolvedId,
      displayName: playerName(rawPreference) || playerName(submission) || identifier,
      lanes,
      times,
      flexibilityPreference: cleanText(rawPreference?.flexibilityPreference),
    });
  }

  const players = [...playersById.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' })
  );
  const laneCounts = Object.fromEntries(EPIC_LANE_IDS.map((lane) => [lane, 0]));
  const availableTimes = uniqueTextList(snapshot?.epicTimeSlotIds);
  const timeCounts = new Map(
    (availableTimes.length ? availableTimes : DEFAULT_EPIC_TIME_OPTIONS).map((time) => [time, 0])
  );
  for (const preference of players) {
    for (const lane of preference.lanes) laneCounts[lane] += 1;
    for (const time of preference.times) timeCounts.set(time, (timeCounts.get(time) || 0) + 1);
  }

  const times = [...timeCounts]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => {
      const numericDifference = timePreferenceOrder(left.value) - timePreferenceOrder(right.value);
      return Number.isFinite(numericDifference)
        ? numericDifference
        : left.value.localeCompare(right.value, undefined, { numeric: true });
    });

  return {
    players,
    laneCounts,
    times,
    totalPlayers: players.length,
  };
}

function planningMetadataEntries(source, identityKey = 'name') {
  if (typeof source === 'function') {
    try {
      return planningMetadataEntries(source(), identityKey);
    } catch {
      return [];
    }
  }
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source).map(([id, value]) => {
    if (value && typeof value === 'object') return { [identityKey]: id, ...value };
    return { [identityKey]: id, label: cleanText(value) };
  });
}

function planningValueKey(value) {
  return cleanText(value).normalize('NFKC').toLocaleLowerCase('en');
}

function canonicalHeroType(value) {
  const normalized = planningValueKey(value);
  if (['cavalry', 'cav'].includes(normalized)) return 'cavalry';
  if (['archer', 'archers', 'ranged'].includes(normalized)) return 'archers';
  if (['footman', 'footmen', 'infantry'].includes(normalized)) return 'footmen';
  if (['all', 'any', 'universal'].includes(normalized)) return 'all';
  return '';
}

function planningResearchLabels(options = {}) {
  const source =
    options.researchMetadata || options.researchCatalog || options.catalogs?.research || [];
  return new Map(
    planningMetadataEntries(source, 'id')
      .map((item) => {
        const id = cleanText(item?.id || item?.researchTreeId || item?.key);
        const label = cleanText(item?.label || item?.name) || id;
        return id ? [planningValueKey(id), label] : null;
      })
      .filter(Boolean)
  );
}

export function buildAdminSignupPlanningSignals(submission = {}, options = {}) {
  const stats = submission?.confirmedStats || submission?.stats || {};
  const commitment = submission?.commitment || {};
  const heroMetadata = planningMetadataEntries(
    options.heroMetadata || options.heroCatalog || options.catalogs?.heroes || []
  );
  const heroMetadataByName = new Map(
    heroMetadata
      .map((hero) => {
        const name = cleanText(hero?.name || hero?.label || hero?.id);
        return name ? [planningValueKey(name), hero] : null;
      })
      .filter(Boolean)
  );
  const usableHeroNames = uniqueTextList(stats?.usableHeroNames);
  const hasTypedHeroMetadata = usableHeroNames.some((name) => {
    const metadata = heroMetadataByName.get(planningValueKey(name));
    return canonicalHeroType(metadata?.Type || metadata?.type || metadata?.troopType);
  });
  const heroesByGroup = new Map();
  for (const name of usableHeroNames) {
    const metadata = heroMetadataByName.get(planningValueKey(name));
    const type = canonicalHeroType(metadata?.Type || metadata?.type || metadata?.troopType);
    const groupId = type || (hasTypedHeroMetadata ? 'other' : 'ungrouped');
    if (!heroesByGroup.has(groupId)) heroesByGroup.set(groupId, []);
    heroesByGroup.get(groupId).push(name);
  }
  const groupOrder = ['cavalry', 'archers', 'footmen', 'all', 'other', 'ungrouped'];
  const heroGroups = groupOrder
    .filter((groupId) => heroesByGroup.has(groupId))
    .map((groupId) => ({ groupId, names: heroesByGroup.get(groupId) }));

  const researchLabels = planningResearchLabels(options);
  const research = Object.entries(
    stats?.researchProgressPct && typeof stats.researchProgressPct === 'object'
      ? stats.researchProgressPct
      : {}
  )
    .map(([id, rawValue]) => {
      const progress = Number(rawValue);
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) return null;
      return {
        id: cleanText(id),
        label: researchLabels.get(planningValueKey(id)) || cleanText(id),
        progress: Math.round(progress),
      };
    })
    .filter((item) => item?.id);
  const fightingTimeIds = uniqueTextList(commitment?.fightingTimeIds).slice(0, 2);
  const primaryRole = cleanText(commitment?.preferredRole);
  const secondaryRole = cleanText(commitment?.secondaryRole);
  const canHelpLead = commitment?.canHelpLead === true;
  const teamNamePreferences = uniqueTextList(commitment?.teamNamePreferences)
    .filter((id) => TEAM_NAME_LABELS[id])
    .map((id) => TEAM_NAME_LABELS[id]);
  const preferredTeammates = getAdminPreferredTeammateNames(submission);

  return {
    favoriteRole: primaryRole,
    primaryRole,
    secondaryRole,
    canHelpLead,
    teamNamePreferences,
    fightingTimeIds,
    heroGroups,
    preferredTeammates,
    research,
    usableHeroCount: usableHeroNames.length,
    hasSignals: Boolean(
      primaryRole ||
      secondaryRole ||
      canHelpLead ||
      teamNamePreferences.length ||
      fightingTimeIds.length ||
      heroGroups.length ||
      preferredTeammates.length ||
      research.length
    ),
  };
}

const ADAPTER_TEAM_COLORS = ['#7dd3fc', '#a78bfa', '#fb923c', '#34d399', '#f5c451', '#fb7185'];
const ADAPTER_LEGACY_OBJECTIVE_CODES = [
  'CC1',
  'CC2',
  'CC3',
  'CC4',
  'OP1',
  'OP2',
  'OP3',
  'OP4',
  'FH1',
  'FH2',
  'H1',
  'H2',
  'A1',
  'A2',
  'RP1',
  'RP2',
  'T3',
  'T5',
  'T6',
  'T7',
  'T8',
  'T9',
  'RUNE',
];

function adapterClone(value) {
  if (Array.isArray(value)) return value.map(adapterClone);
  if (value instanceof Date) return new Date(value.getTime());
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, adapterClone(item)])
    );
  }
  return value;
}

function adapterRevision(value) {
  return Math.max(0, integer(value));
}

function adapterError(code, message, details = {}) {
  const error = new Error(message || code);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function adapterDefaultPlan() {
  return {
    schemaVersion: BohModel.BOH_PLAN_SCHEMA_VERSION,
    id: 'all-star-boh-plan',
    label: 'All-Star BoH Team Plan',
    roleGroups: BohModel.BOH_DEFAULT_ROLE_GROUPS.map((role, index) => ({
      ...role,
      label: role.id === 'bottom' ? 'Bot Side' : role.label,
      color: ADAPTER_TEAM_COLORS[index % ADAPTER_TEAM_COLORS.length],
    })),
    phases: BohModel.BOH_DEFAULT_PHASES.map((phase) => ({ ...phase })),
    legions: BohModel.BOH_DEFAULT_LEGIONS.map((legion) => ({ ...legion })),
    objectives: [],
    roleDefaults: [],
    seatOverrides: [],
    playerOverrides: [],
    instructions: [],
    rotations: [],
    notes: [],
  };
}

function adapterDefaultScoringVersion() {
  const profile = BohModel.BOH_2025_SCORING_PROFILE;
  return {
    id: profile.id,
    version: profile.version,
    label: profile.label,
    note: '',
    powerWeights: { ...profile.powerWeights },
    bonusWeights: { ...profile.bonusWeights },
    powerDivisor: profile.powerDivisor,
    precision: profile.precision,
  };
}

function adapterDefaultTeamIds() {
  return Array.from({ length: TEAM_COUNT }, (_, index) => `team-${index + 1}`);
}

function adapterDefaultDraft() {
  const scoringVersion = adapterDefaultScoringVersion();
  return {
    revision: 0,
    title: 'All-Star BoH 2026',
    note: '',
    activeScoringVersionId: scoringVersion.id,
    scoringVersions: [scoringVersion],
    scoreOverrides: [],
    teamIds: adapterDefaultTeamIds(),
    playerIds: [],
    plan: adapterDefaultPlan(),
    publications: { announcement: false, plan: false },
  };
}

function adapterPlan(draft) {
  const source = draft?.plan && typeof draft.plan === 'object' ? draft.plan : {};
  const defaults = adapterDefaultPlan();
  return {
    ...defaults,
    ...adapterClone(source),
    roleGroups: list(source.roleGroups).length
      ? adapterClone(source.roleGroups)
      : defaults.roleGroups,
    phases: list(source.phases).length ? adapterClone(source.phases) : defaults.phases,
    legions: list(source.legions).length ? adapterClone(source.legions) : defaults.legions,
    objectives: adapterClone(list(source.objectives)),
    roleDefaults: adapterClone(list(source.roleDefaults)),
    seatOverrides: adapterClone(list(source.seatOverrides)),
    playerOverrides: adapterClone(list(source.playerOverrides)),
    instructions: adapterClone(list(source.instructions)),
    rotations: adapterClone(list(source.rotations)),
    notes: adapterClone(list(source.notes)),
  };
}

function adapterTeamIds(draft) {
  const output = [];
  for (const rawId of list(draft?.teamIds)) {
    const id = cleanText(rawId);
    if (id && !output.includes(id)) output.push(id);
    if (output.length === TEAM_COUNT) break;
  }
  for (const fallback of adapterDefaultTeamIds()) {
    if (output.length === TEAM_COUNT) break;
    if (!output.includes(fallback)) output.push(fallback);
  }
  return output;
}

function adapterSeatTemplate(plan) {
  try {
    return BohModel.createBohSeatTemplate(plan.roleGroups, { rosterSize: ROSTER_SIZE });
  } catch {
    return BohModel.createBohSeatTemplate(BohModel.BOH_DEFAULT_ROLE_GROUPS, {
      rosterSize: ROSTER_SIZE,
    });
  }
}

function adapterMaterializeTeam(state, teamId, index) {
  const source = state.teams.get(teamId) || {};
  const plan = adapterPlan(state.draft);
  const template = adapterSeatTemplate(plan);
  const sourceSeats = list(source.seats);
  const seats = template.map((templateSeat) => {
    const stored = sourceSeats.find(
      (seat) => integer(seat?.seatNumber || seat?.number) === templateSeat.seatNumber
    );
    return {
      id: cleanText(stored?.id) || `${teamId}-seat-${templateSeat.seatNumber}`,
      seatNumber: templateSeat.seatNumber,
      playerId: cleanText(stored?.playerId || stored?.uid),
      displayName: cleanText(stored?.displayName || stored?.gameName || stored?.name),
      roleGroupId: templateSeat.roleGroupId,
      roleLabel: templateSeat.roleLabel,
      side: cleanText(stored?.side),
      lane: cleanText(stored?.lane),
      locked: stored?.locked === true,
      score: finiteNumber(stored?.score),
    };
  });
  return {
    ...adapterClone(source),
    id: teamId,
    teamId,
    revision: adapterRevision(source.revision),
    number: integer(source.number, index + 1) || index + 1,
    name: cleanText(source.name || source.label) || `Team ${index + 1}`,
    color: cleanText(source.color) || ADAPTER_TEAM_COLORS[index % ADAPTER_TEAM_COLORS.length],
    captainId: cleanText(source.captainId),
    seats,
    plan: source.plan && typeof source.plan === 'object' ? adapterClone(source.plan) : {},
    scoreTotal: seats.reduce((total, seat) => total + finiteNumber(seat.score), 0),
    notes: cleanText(source.notes),
  };
}

function adapterSubmissionUid(submission) {
  return cleanText(submission?.uid || submission?.playerId || submission?.id);
}

function adapterSubmissionId(submission) {
  return cleanText(submission?.playerId || submission?.uid || submission?.id);
}

function adapterFindSubmission(state, identifier) {
  const id = cleanText(identifier);
  return (
    state.submissions.find(
      (submission) =>
        adapterSubmissionId(submission) === id || adapterSubmissionUid(submission) === id
    ) || null
  );
}

function adapterReviewStatusToUi(status) {
  const map = {
    verified: 'confirmed',
    needs_changes: 'needs_correction',
    rejected: 'excluded',
    pending: 'pending',
  };
  return map[cleanText(status).toLowerCase()] || 'pending';
}

function adapterUiStatusToReview(status) {
  const map = {
    confirmed: 'verified',
    approved: 'verified',
    needs_correction: 'needs_changes',
    excluded: 'rejected',
    pending: 'pending',
  };
  return map[cleanText(status).toLowerCase()] || 'pending';
}

function adapterReviewIsFresh(submission, review) {
  return (
    submission?.status === 'submitted' &&
    review?.status === 'verified' &&
    review?.stale !== true &&
    Number.isInteger(submission?.revision) &&
    Number.isInteger(review?.submissionRevision) &&
    review.submissionRevision === submission.revision
  );
}

function adapterActiveScoringVersion(state) {
  const versions = list(state.draft?.scoringVersions);
  const activeId = cleanText(state.draft?.activeScoringVersionId);
  return (
    versions.find((version) => version.id === activeId) ||
    versions.at(-1) ||
    adapterDefaultScoringVersion()
  );
}

function adapterUiScoringVersion(version) {
  const power = version?.powerWeights || {};
  const bonus = version?.bonusWeights || {};
  return {
    ...adapterClone(version),
    weights: {
      totalCastlePower: finiteNumber(power.totalCastlePower),
      troopPower: finiteNumber(power.troopPower, 0.05),
      buildingPower: finiteNumber(power.buildingPower, 0.3),
      technologyPower: finiteNumber(power.technologyPower, 0.7),
      heroCombatPower: finiteNumber(power.heroCombatPower, 0.8),
      dragonPower: finiteNumber(power.dragonPower, 1),
      t9TroopType: finiteNumber(bonus.t9TroopType, 3000),
      readySpeedHero: finiteNumber(bonus.readySpeedHero, 2500),
      level50Hero: finiteNumber(bonus.level50Hero, 750),
      bohUsefulRating: finiteNumber(bonus.bohUsefulRating, 1000),
    },
  };
}

function adapterScoreRecord(state, submission) {
  const uid = adapterSubmissionUid(submission);
  const id = adapterSubmissionId(submission);
  const review = state.reviews.get(uid) || null;
  const reviewMatchesSubmission =
    review?.stale !== true &&
    Number.isInteger(review?.submissionRevision) &&
    review.submissionRevision === submission?.revision;
  const profile = adapterActiveScoringVersion(state);
  let calculated = review?.score && typeof review.score === 'object' ? review.score : null;
  try {
    calculated = BohModel.scoreBohSignup(
      { ...submission, playerId: id, gameName: playerName(submission) || id },
      profile,
      {
        adminUsefulnessRating: reviewMatchesSubmission
          ? (review?.adjustments?.bohUsefulRating ?? 0)
          : 0,
      }
    );
  } catch {
    calculated ||= { total: 0, breakdown: {} };
  }
  const override = list(state.draft?.scoreOverrides).find((item) => item.playerId === id);
  const calculatedScore = finiteNumber(calculated?.total);
  const finalScore = override ? finiteNumber(override.score) : calculatedScore;
  return {
    playerId: id,
    uid,
    displayName: playerName(submission) || id,
    reviewStatus: adapterReviewIsFresh(submission, review)
      ? adapterReviewStatusToUi(review?.status)
      : 'pending',
    reviewStale:
      Boolean(review) &&
      (review?.stale === true || review?.submissionRevision !== submission?.revision),
    calculatedScore,
    overrideScore: override ? finiteNumber(override.score) : null,
    overrideReason: cleanText(override?.reason),
    finalScore,
    score: { ...adapterClone(calculated), total: finalScore },
    scoreBreakdown: adapterClone(calculated?.breakdown || {}),
  };
}

function adapterDisplayRule(rule, scope) {
  const instruction =
    rule?.instruction && typeof rule.instruction === 'object' ? rule.instruction : {};
  return {
    ...adapterClone(rule),
    scope,
    scopeId:
      scope === 'role'
        ? cleanText(rule.roleGroupId)
        : scope === 'seat'
          ? integer(rule.seatNumber)
          : cleanText(rule.playerId),
    action: cleanText(instruction.action),
    startObjectiveId: cleanText(instruction.startObjectiveId),
    objectiveId: cleanText(instruction.objectiveId),
    objectiveCode: cleanText(instruction.targetLabel),
    viaObjectiveIds: adapterClone(list(instruction.viaObjectiveIds)),
    pathObjectiveIds: adapterClone(list(instruction.pathObjectiveIds)),
    loadout: cleanText(instruction.loadout),
    teleport: instruction.teleport,
    note: cleanText(instruction.note),
    instruction: cleanText(instruction.summary || instruction.note),
  };
}

function adapterUiPlan(state) {
  const plan = adapterPlan(state.draft);
  return {
    ...adapterClone(plan),
    instructions: [
      ...plan.roleDefaults.map((rule) => adapterDisplayRule(rule, 'role')),
      ...plan.seatOverrides.map((rule) => adapterDisplayRule(rule, 'seat')),
      ...plan.playerOverrides.map((rule) => adapterDisplayRule(rule, 'player')),
      ...plan.instructions.map((rule) => adapterDisplayRule(rule, rule.scope || 'global')),
    ],
  };
}

function adapterSnapshot(state) {
  const draft = state.draft || adapterDefaultDraft();
  const submissions = state.submissions.map((submission) => {
    const uid = adapterSubmissionUid(submission);
    const review = state.reviews.get(uid) || null;
    const score = adapterScoreRecord(state, submission);
    return {
      ...adapterClone(submission),
      playerId: adapterSubmissionId(submission),
      submissionUid: uid,
      reviewStatus: adapterReviewIsFresh(submission, review)
        ? adapterReviewStatusToUi(review?.status)
        : 'pending',
      reviewStale:
        Boolean(review) &&
        (review?.stale === true || review?.submissionRevision !== submission?.revision),
      review: adapterClone(review),
      score: score.score,
      finalScore: score.finalScore,
    };
  });
  const scores = state.submissions.map((submission) => adapterScoreRecord(state, submission));
  const versions = list(draft.scoringVersions).map(adapterUiScoringVersion);
  const active = adapterUiScoringVersion(adapterActiveScoringVersion(state));
  const publication = state.publication || {};
  const announcementPublished = publication.announcementPublished === true;
  const planPublished = publication.planPublished === true;
  return {
    revision: state.revision,
    event: { teamCount: TEAM_COUNT, rosterSize: ROSTER_SIZE },
    submissions,
    epicPreferences: adapterClone(state.epicPreferences),
    epicTimeSlotIds: adapterClone(list(state.adminStore?.epicTimeSlotIds)),
    scores,
    eligiblePlayerIds: adapterClone(list(draft.playerIds)),
    scoring: {
      activeVersion: active,
      versions,
    },
    teams: adapterTeamIds(draft).map((teamId, index) =>
      adapterMaterializeTeam(state, teamId, index)
    ),
    plan: adapterUiPlan(state),
    publications: {
      announcement: {
        status: announcementPublished ? 'published' : 'draft',
        revision: announcementPublished ? adapterRevision(publication.revision) : null,
        publishedAt: announcementPublished ? publication.updatedAt || null : null,
      },
      plan: {
        status: planPublished ? 'published' : 'draft',
        revision: planPublished ? adapterRevision(publication.revision) : null,
        publishedAt: planPublished ? publication.updatedAt || null : null,
      },
    },
    validation: adapterClone(state.validation || {}),
    documentRevisions: {
      draft: adapterRevision(draft.revision),
      publication: state.publicationRevision,
      teams: Object.fromEntries(
        adapterTeamIds(draft).map((teamId, index) => [
          teamId,
          adapterMaterializeTeam(state, teamId, index).revision,
        ])
      ),
      reviews: Object.fromEntries(
        [...state.reviews].map(([uid, review]) => [uid, adapterRevision(review?.revision)])
      ),
    },
  };
}

function adapterNotify(state, changed = true) {
  if (changed) {
    state.revision += 1;
    state.validation = {};
  }
  const snapshot = adapterSnapshot(state);
  for (const listener of [...state.listeners]) {
    try {
      listener(snapshot);
    } catch (error) {
      state.options.onError?.(error, { action: 'adapter-subscription' });
    }
  }
  return snapshot;
}

function adapterHandleBackgroundError(state, error, action) {
  if (state.stopped) return;
  state.options.onError?.(error, { action });
}

async function adapterLoadReviews(state) {
  const entries = await Promise.all(
    state.submissions.map(async (submission) => {
      const uid = adapterSubmissionUid(submission);
      if (!uid) return null;
      const review = await state.adminStore.getReview(uid);
      return [uid, review];
    })
  );
  state.reviews = new Map(entries.filter(Boolean));
}

async function adapterLoadTeams(state) {
  const teamIds = adapterTeamIds(state.draft);
  const entries = await Promise.all(
    teamIds.map(async (teamId) => [teamId, await state.adminStore.getDraftTeam(teamId)])
  );
  state.teams = new Map(entries);
}

async function adapterLoadPublication(state) {
  const getter = state.adminStore.getPublication || state.options.publicationStore?.getPublication;
  if (typeof getter !== 'function') return;
  const owner = state.adminStore.getPublication ? state.adminStore : state.options.publicationStore;
  state.publication = (await Promise.resolve(getter.call(owner))) || null;
  state.publicationRevision = adapterRevision(
    state.publication?.revision ?? state.publicationRevision
  );
}

async function adapterLoadEpicPreferences(state) {
  if (typeof state.adminStore.getEpicShowdownPreferencesList !== 'function') {
    state.epicPreferences = [];
    return;
  }
  state.epicPreferences = list(await state.adminStore.getEpicShowdownPreferencesList());
}

async function adapterLoadAll(state, changed = true) {
  const [submissions, draft] = await Promise.all([
    state.adminStore.listSubmissions(),
    state.adminStore.getDraft(),
  ]);
  state.submissions = list(submissions);
  state.draft = draft || adapterDefaultDraft();
  await Promise.all([
    adapterLoadReviews(state),
    adapterLoadTeams(state),
    adapterLoadPublication(state),
    adapterLoadEpicPreferences(state),
  ]);
  return adapterNotify(state, changed);
}

async function adapterReplaceTeamSubscriptions(state) {
  const desired = new Set(adapterTeamIds(state.draft));
  for (const [teamId, unsubscribe] of [...state.teamUnsubscribers]) {
    if (desired.has(teamId)) continue;
    try {
      unsubscribe?.();
    } catch {
      // Listener teardown is best-effort.
    }
    state.teamUnsubscribers.delete(teamId);
    state.teams.delete(teamId);
  }
  for (const teamId of desired) {
    if (state.teamUnsubscribers.has(teamId)) continue;
    const unsubscribe = await state.adminStore.subscribeDraftTeam(
      teamId,
      (team) => {
        if (state.stopped) return;
        state.teams.set(teamId, team);
        adapterNotify(state);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribeDraftTeam')
    );
    state.teamUnsubscribers.set(teamId, unsubscribe);
  }
}

async function adapterStartSubscriptions(state) {
  const submissionsUnsubscribe = await state.adminStore.subscribeSubmissions(
    (submissions) => {
      if (state.stopped) return;
      state.submissions = list(submissions);
      void adapterLoadReviews(state)
        .then(() => adapterNotify(state))
        .catch((error) => adapterHandleBackgroundError(state, error, 'subscribeSubmissions'));
    },
    (error) => adapterHandleBackgroundError(state, error, 'subscribeSubmissions')
  );
  state.unsubscribers.add(submissionsUnsubscribe);

  const draftUnsubscribe = await state.adminStore.subscribeDraft(
    (draft) => {
      if (state.stopped) return;
      state.draft = draft || adapterDefaultDraft();
      void adapterReplaceTeamSubscriptions(state)
        .then(() => adapterNotify(state))
        .catch((error) => adapterHandleBackgroundError(state, error, 'subscribeDraft'));
    },
    (error) => adapterHandleBackgroundError(state, error, 'subscribeDraft')
  );
  state.unsubscribers.add(draftUnsubscribe);
  await adapterReplaceTeamSubscriptions(state);

  const publicationSubscriber =
    state.adminStore.subscribePublication || state.options.publicationStore?.subscribePublication;
  if (typeof publicationSubscriber === 'function') {
    const owner = state.adminStore.subscribePublication
      ? state.adminStore
      : state.options.publicationStore;
    const unsubscribe = await publicationSubscriber.call(
      owner,
      (publication) => {
        if (state.stopped) return;
        state.publication = publication || null;
        state.publicationRevision = adapterRevision(
          publication?.revision ?? state.publicationRevision
        );
        adapterNotify(state);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribePublication')
    );
    state.unsubscribers.add(unsubscribe);
  }

  if (typeof state.adminStore.subscribeEpicShowdownPreferences === 'function') {
    const unsubscribe = await state.adminStore.subscribeEpicShowdownPreferences(
      (preferences) => {
        if (state.stopped) return;
        state.epicPreferences = list(preferences);
        adapterNotify(state, false);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribeEpicShowdownPreferences')
    );
    state.unsubscribers.add(unsubscribe);
  }
}

function adapterAssertRevision(state, payload, command) {
  const expected = adapterRevision(payload?.expectedRevision ?? command?.expectedRevision);
  if (expected !== state.revision) {
    throw adapterError(
      'all-star-boh-ui-conflict',
      `All-Star BoH data changed in another session (expected UI revision ${expected}, found ${state.revision}).`,
      { expectedRevision: expected, actualRevision: state.revision }
    );
  }
}

async function adapterSaveDraft(state, mutate, options = {}) {
  const current = adapterClone(state.draft || adapterDefaultDraft());
  current.teamIds = adapterTeamIds(current);
  current.plan = adapterPlan(current);
  const next = (await Promise.resolve(mutate(current))) || current;
  const saved = await state.adminStore.saveDraft(next, {
    expectedRevision: adapterRevision(state.draft?.revision),
  });
  state.draft = saved || next;
  if (options.notify !== false) adapterNotify(state);
  return state.draft;
}

async function adapterSaveTeam(state, teamId, mutate, options = {}) {
  const teamIds = adapterTeamIds(state.draft);
  const index = Math.max(0, teamIds.indexOf(teamId));
  const current = adapterMaterializeTeam(state, teamId, index);
  const next = (await Promise.resolve(mutate(adapterClone(current)))) || current;
  const saved = await state.adminStore.saveDraftTeam(teamId, next, {
    expectedRevision: adapterRevision(state.teams.get(teamId)?.revision),
  });
  state.teams.set(teamId, saved || next);
  if (options.notify !== false) adapterNotify(state);
  return state.teams.get(teamId);
}

async function adapterSaveTeams(state, teams) {
  const teamEntries = Object.fromEntries(
    teams.map((team) => [cleanText(team.id || team.teamId), adapterClone(team)])
  );
  const expectedTeamRevisions = Object.fromEntries(
    Object.keys(teamEntries).map((teamId) => [
      teamId,
      adapterRevision(state.teams.get(teamId)?.revision),
    ])
  );
  try {
    const saved = await state.adminStore.saveDraftBundle(
      { teams: teamEntries },
      { expectedTeamRevisions }
    );
    for (const [teamId, team] of Object.entries(saved?.teams || teamEntries)) {
      state.teams.set(teamId, team);
    }
  } catch (error) {
    await adapterLoadTeams(state);
    adapterNotify(state);
    throw error;
  }
  adapterNotify(state);
}

async function adapterSaveTeamMetadata(state, payload) {
  const team = adapterFindTeam(state, payload.teamId);
  const captainId = cleanText(payload.captainId);
  if (captainId && !team.seats.some((seat) => seat.playerId === captainId)) {
    throw adapterError(
      'all-star-boh-captain-not-on-team',
      'Choose a captain who is assigned to this team.'
    );
  }
  await adapterSaveTeam(state, team.id, (draftTeam) => {
    draftTeam.name = cleanText(payload.name);
    draftTeam.color = cleanText(payload.color);
    draftTeam.captainId = captainId;
    draftTeam.notes = cleanText(payload.notes);
    return draftTeam;
  });
}

function adapterUniqueId(prefix, state) {
  state.idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${state.idSequence.toString(36)}`;
}

function adapterFindTeam(state, teamId) {
  const ids = adapterTeamIds(state.draft);
  const index = ids.indexOf(cleanText(teamId));
  if (index < 0) {
    throw adapterError('all-star-boh-team-unknown', `Unknown All-Star team: ${teamId}`);
  }
  return adapterMaterializeTeam(state, ids[index], index);
}

function adapterFindSeat(team, seatNumber) {
  const number = integer(seatNumber);
  const seat = list(team?.seats).find((candidate) => candidate.seatNumber === number);
  if (!seat) {
    throw adapterError(
      'all-star-boh-seat-unknown',
      `Unknown seat ${number} in ${team?.name || team?.id}.`
    );
  }
  return seat;
}

function adapterPlayerFields(seat) {
  return {
    playerId: cleanText(seat?.playerId),
    displayName: cleanText(seat?.displayName),
    score: finiteNumber(seat?.score),
  };
}

function adapterAssignPlayer(seat, player) {
  seat.playerId = cleanText(player?.playerId);
  seat.displayName = cleanText(player?.displayName);
  seat.score = finiteNumber(player?.score);
}

function adapterReconcileCaptain(team) {
  if (team.captainId && !team.seats.some((seat) => seat.playerId === team.captainId)) {
    team.captainId = '';
  }
  return team;
}

async function adapterReviewSubmission(state, payload) {
  const submission = adapterFindSubmission(state, payload.playerId);
  if (!submission) {
    throw adapterError('all-star-boh-submission-unknown', 'The selected signup no longer exists.');
  }
  const uid = adapterSubmissionUid(submission);
  const existing = state.reviews.get(uid) || {};
  const existingAdjustments = adapterClone(existing.adjustments || {});
  const reviewStatus = adapterUiStatusToReview(payload.status);
  const feedbackNote = cleanText(payload.note);
  if (['needs_changes', 'rejected'].includes(reviewStatus) && !feedbackNote) {
    throw adapterError(
      'all-star-boh-feedback-required',
      'Player-facing feedback is required for a correction or exclusion.'
    );
  }
  const hasUsefulnessInput = Object.prototype.hasOwnProperty.call(payload, 'adminUsefulnessRating');
  const adminUsefulnessRating = hasUsefulnessInput
    ? payload.adminUsefulnessRating === null
      ? null
      : clamp(payload.adminUsefulnessRating, 0, 100)
    : (existingAdjustments.bohUsefulRating ?? null);
  const adjustments = {
    ...existingAdjustments,
    bohUsefulRating: adminUsefulnessRating,
  };
  let calculated;
  try {
    calculated = BohModel.scoreBohSignup(
      {
        ...submission,
        playerId: adapterSubmissionId(submission),
        gameName: playerName(submission) || adapterSubmissionId(submission),
      },
      adapterActiveScoringVersion(state),
      { adminUsefulnessRating: adminUsefulnessRating ?? 0 }
    );
  } catch {
    calculated = { total: 0, breakdown: {} };
  }
  const input = {
    status: reviewStatus,
    note: feedbackNote,
    internalNote: Object.prototype.hasOwnProperty.call(payload, 'internalNote')
      ? cleanText(payload.internalNote)
      : cleanText(existing.internalNote),
    roleTags: adapterClone(list(existing.roleTags)),
    locked: existing.locked === true,
    score: calculated,
    adjustments,
    statCorrections: Object.prototype.hasOwnProperty.call(payload, 'statCorrections')
      ? adapterClone(payload.statCorrections)
      : adapterClone(existing.statCorrections || {}),
    submissionRevision: adapterRevision(submission.revision),
  };
  const saved = await state.adminStore.saveReview(uid, input, {
    expectedRevision: adapterRevision(existing.revision),
    submissionRevision: adapterRevision(submission.revision),
  });
  state.reviews.set(uid, saved || input);
  adapterNotify(state);
}

async function adapterCreateScoringVersion(state, payload) {
  const current = adapterActiveScoringVersion(state);
  const versions = list(state.draft?.scoringVersions);
  const versionNumber = Math.max(0, ...versions.map((version) => integer(version.version))) + 1;
  const weights = payload.weights || {};
  const version = {
    id: adapterUniqueId(`score-v${versionNumber}`, state),
    version: versionNumber,
    label: cleanText(payload.label),
    note: cleanText(payload.note),
    powerWeights: {
      totalCastlePower: finiteNumber(
        weights.totalCastlePower,
        current.powerWeights?.totalCastlePower
      ),
      troopPower: finiteNumber(weights.troopPower, current.powerWeights?.troopPower),
      buildingPower: finiteNumber(weights.buildingPower, current.powerWeights?.buildingPower),
      technologyPower: finiteNumber(weights.technologyPower, current.powerWeights?.technologyPower),
      heroCombatPower: finiteNumber(weights.heroCombatPower, current.powerWeights?.heroCombatPower),
      dragonPower: finiteNumber(weights.dragonPower, current.powerWeights?.dragonPower),
    },
    bonusWeights: {
      t9TroopType: finiteNumber(weights.t9TroopType, current.bonusWeights?.t9TroopType),
      readySpeedHero: finiteNumber(weights.readySpeedHero, current.bonusWeights?.readySpeedHero),
      level50Hero: finiteNumber(weights.level50Hero, current.bonusWeights?.level50Hero),
      bohUsefulRating: finiteNumber(weights.bohUsefulRating, current.bonusWeights?.bohUsefulRating),
    },
    powerDivisor: finiteNumber(current.powerDivisor, 1000),
    precision: integer(current.precision, 3),
  };
  await adapterSaveDraft(state, (draft) => {
    draft.scoringVersions = [...list(draft.scoringVersions).slice(-29), version];
    draft.activeScoringVersionId = version.id;
    return draft;
  });
}

async function adapterSetScoreOverride(state, payload) {
  const id = cleanText(payload.playerId);
  if (!adapterFindSubmission(state, id)) {
    throw adapterError('all-star-boh-submission-unknown', 'The selected player no longer exists.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.scoreOverrides = [
      ...list(draft.scoreOverrides).filter((override) => override.playerId !== id),
      {
        playerId: id,
        score: Math.max(0, finiteNumber(payload.score)),
        reason: cleanText(payload.reason),
      },
    ];
    return draft;
  });
}

async function adapterRemoveScoreOverride(state, payload) {
  const id = cleanText(payload.playerId);
  await adapterSaveDraft(state, (draft) => {
    draft.scoreOverrides = list(draft.scoreOverrides).filter(
      (override) => override.playerId !== id
    );
    return draft;
  });
}

async function adapterSetSeatLock(state, payload) {
  const team = adapterFindTeam(state, payload.teamId);
  const seat = adapterFindSeat(team, payload.seatNumber);
  seat.locked = payload.locked === true;
  await adapterSaveTeam(state, team.id, () => team);
}

async function adapterMoveOrSwapSeat(state, payload, swap) {
  const sourceTeam = adapterFindTeam(state, payload.source?.teamId);
  const targetTeam =
    cleanText(payload.destination?.teamId) === sourceTeam.id
      ? sourceTeam
      : adapterFindTeam(state, payload.destination?.teamId);
  const sourceSeat = adapterFindSeat(sourceTeam, payload.source?.seatNumber);
  const targetSeat = adapterFindSeat(targetTeam, payload.destination?.seatNumber);
  if (sourceSeat.locked || targetSeat.locked) {
    throw adapterError('all-star-boh-seat-locked', 'Unlock both seats before moving players.');
  }
  if (!sourceSeat.playerId) {
    throw adapterError('all-star-boh-seat-empty', 'The source seat is empty.');
  }
  if (!swap && targetSeat.playerId) {
    throw adapterError('all-star-boh-seat-occupied', 'Use swap for an occupied destination seat.');
  }
  const sourcePlayer = adapterPlayerFields(sourceSeat);
  const targetPlayer = adapterPlayerFields(targetSeat);
  adapterAssignPlayer(targetSeat, sourcePlayer);
  adapterAssignPlayer(sourceSeat, swap ? targetPlayer : null);
  adapterReconcileCaptain(sourceTeam);
  adapterReconcileCaptain(targetTeam);
  if (sourceTeam.id === targetTeam.id) {
    await adapterSaveTeam(state, sourceTeam.id, () => sourceTeam);
    return;
  }
  await adapterSaveTeams(state, [sourceTeam, targetTeam]);
}

function adapterVerifiedPlayers(state) {
  return state.submissions
    .filter((submission) => {
      const review = state.reviews.get(adapterSubmissionUid(submission));
      return adapterReviewIsFresh(submission, review);
    })
    .map((submission) => {
      const score = adapterScoreRecord(state, submission);
      return {
        ...adapterClone(submission),
        playerId: adapterSubmissionId(submission),
        gameName: playerName(submission) || adapterSubmissionId(submission),
        score: score.finalScore,
        scoreBreakdown: score.scoreBreakdown,
      };
    });
}

function adapterSelectedPlayerIds(state, verifiedPlayers = adapterVerifiedPlayers(state)) {
  const verifiedIds = new Set(verifiedPlayers.map((player) => player.playerId));
  const explicit = list(state.draft?.playerIds)
    .map(cleanText)
    .filter((id, index, values) => id && verifiedIds.has(id) && values.indexOf(id) === index);
  if (explicit.length) return explicit;
  if (verifiedPlayers.length === ALL_STAR_BOH_SELECTION_SIZE) {
    return verifiedPlayers.map((player) => player.playerId);
  }
  return [];
}

const ALL_STAR_BOH_SELECTION_SIZE = TEAM_COUNT * ROSTER_SIZE;

function adapterBalancedPlayers(state) {
  const verifiedPlayers = adapterVerifiedPlayers(state);
  const selectedIds = adapterSelectedPlayerIds(state, verifiedPlayers);
  if (selectedIds.length !== ALL_STAR_BOH_SELECTION_SIZE) {
    throw adapterError(
      'all-star-boh-selection-incomplete',
      `Select exactly ${ALL_STAR_BOH_SELECTION_SIZE} verified players before balancing teams.`
    );
  }
  const selected = new Set(selectedIds);
  return verifiedPlayers.filter((player) => selected.has(player.playerId));
}

async function adapterSaveEligiblePool(state, payload) {
  const verified = adapterVerifiedPlayers(state);
  const verifiedIds = new Set(verified.map((player) => player.playerId));
  const playerIds = list(payload.playerIds)
    .map(cleanText)
    .filter((id, index, values) => id && values.indexOf(id) === index);
  if (playerIds.length !== ALL_STAR_BOH_SELECTION_SIZE) {
    throw adapterError(
      'all-star-boh-selection-count',
      `Choose exactly ${ALL_STAR_BOH_SELECTION_SIZE} verified players.`
    );
  }
  const unknown = playerIds.filter((id) => !verifiedIds.has(id));
  if (unknown.length) {
    throw adapterError(
      'all-star-boh-selection-unverified',
      `The selected pool contains unverified players: ${unknown.join(', ')}.`
    );
  }
  const selected = new Set(playerIds);
  const lockedOutsidePool = adapterTeamIds(state.draft)
    .map((teamId, index) => adapterMaterializeTeam(state, teamId, index))
    .flatMap((team) => team.seats)
    .filter((seat) => seat.locked && seat.playerId && !selected.has(seat.playerId));
  if (lockedOutsidePool.length) {
    throw adapterError(
      'all-star-boh-selection-locked-player',
      'Unlock seats before removing their players from the eligible 72.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    draft.playerIds = playerIds;
    return draft;
  });
}

async function adapterAssignSeatPlayer(state, payload) {
  const targetTeam = adapterFindTeam(state, payload.teamId);
  const targetSeat = adapterFindSeat(targetTeam, payload.seatNumber);
  if (targetSeat.locked) {
    throw adapterError('all-star-boh-seat-locked', 'Unlock the destination seat first.');
  }
  const playerIdValue = cleanText(payload.playerId);
  const affected = new Map([[targetTeam.id, targetTeam]]);
  if (!playerIdValue) {
    adapterAssignPlayer(targetSeat, null);
    adapterReconcileCaptain(targetTeam);
    await adapterSaveTeam(state, targetTeam.id, () => targetTeam);
    return;
  }
  const verifiedPlayers = adapterVerifiedPlayers(state);
  const selectedIds = new Set(adapterSelectedPlayerIds(state, verifiedPlayers));
  if (!selectedIds.has(playerIdValue)) {
    throw adapterError(
      'all-star-boh-player-not-selected',
      'Choose a player from the saved eligible 72.'
    );
  }
  const player = verifiedPlayers.find((candidate) => candidate.playerId === playerIdValue);
  if (!player) {
    throw adapterError(
      'all-star-boh-player-unverified',
      'This player no longer has a current review.'
    );
  }
  for (const [index, teamId] of adapterTeamIds(state.draft).entries()) {
    const team =
      teamId === targetTeam.id ? targetTeam : adapterMaterializeTeam(state, teamId, index);
    const existingSeat = team.seats.find((seat) => seat.playerId === playerIdValue);
    if (!existingSeat || existingSeat === targetSeat) continue;
    if (existingSeat.locked) {
      throw adapterError('all-star-boh-seat-locked', 'Unlock the player’s current seat first.');
    }
    adapterAssignPlayer(existingSeat, null);
    adapterReconcileCaptain(team);
    affected.set(team.id, team);
  }
  adapterAssignPlayer(targetSeat, {
    playerId: player.playerId,
    displayName: player.gameName,
    score: player.score,
  });
  adapterReconcileCaptain(targetTeam);
  affected.set(targetTeam.id, targetTeam);
  const teams = [...affected.values()];
  if (teams.length === 1) await adapterSaveTeam(state, targetTeam.id, () => targetTeam);
  else await adapterSaveTeams(state, teams);
}

async function adapterBalanceTeams(state) {
  const plan = adapterPlan(state.draft);
  const currentTeams = adapterTeamIds(state.draft).map((teamId, index) =>
    adapterMaterializeTeam(state, teamId, index)
  );
  const locks = currentTeams.flatMap((team) =>
    team.seats
      .filter((seat) => seat.locked && seat.playerId)
      .map((seat) => ({
        playerId: seat.playerId,
        teamId: team.id,
        seatNumber: seat.seatNumber,
        roleGroupId: seat.roleGroupId,
      }))
  );
  const result = BohModel.balanceBohTeams(adapterBalancedPlayers(state), {
    roleGroups: plan.roleGroups,
    teams: currentTeams.map((team) => ({
      id: team.id,
      number: team.number,
      label: team.name,
    })),
    lockedAssignments: locks,
  });
  const teams = result.teams.map((balanced, index) => {
    const current = currentTeams[index];
    const template = adapterSeatTemplate(plan);
    const nextTeam = {
      ...current,
      number: balanced.number,
      name: balanced.label || current.name,
      seats: template.map((seatTemplate) => {
        const assignment = balanced.players.find(
          (player) => player.seatNumber === seatTemplate.seatNumber
        );
        return {
          id: `${current.id}-seat-${seatTemplate.seatNumber}`,
          seatNumber: seatTemplate.seatNumber,
          playerId: assignment?.playerId || '',
          displayName: assignment?.gameName || '',
          roleGroupId: seatTemplate.roleGroupId,
          roleLabel: seatTemplate.roleLabel,
          side: '',
          lane: '',
          locked: assignment?.locked === true,
          score: finiteNumber(assignment?.score),
        };
      }),
      scoreTotal: finiteNumber(balanced.totalScore),
      scoreAverage: finiteNumber(balanced.averageScore),
    };
    return adapterReconcileCaptain(nextTeam);
  });
  await adapterSaveTeams(state, teams);
}

async function adapterSaveRoleGroups(state, payload) {
  const roleGroups = list(payload.roleGroups).map((role, index) => ({
    id: cleanText(role.id) || adapterUniqueId('role', state),
    label: cleanText(role.label),
    capacity: Math.max(0, integer(role.capacity)),
    color: cleanText(role.color) || '#64748b',
    order: index + 1,
  }));
  BohModel.normalizeBohRoleGroups(roleGroups, { rosterSize: ROSTER_SIZE });
  const nextDraft = adapterClone(state.draft || adapterDefaultDraft());
  nextDraft.plan = adapterPlan(nextDraft);
  nextDraft.plan.roleGroups = roleGroups;
  const plan = adapterPlan(nextDraft);
  const template = adapterSeatTemplate(plan);
  const teams = adapterTeamIds(nextDraft).map((teamId, index) => {
    const team = adapterMaterializeTeam(state, teamId, index);
    team.seats = template.map((seatTemplate) => {
      const existing = team.seats.find((seat) => seat.seatNumber === seatTemplate.seatNumber);
      return {
        ...existing,
        id: existing?.id || `${team.id}-seat-${seatTemplate.seatNumber}`,
        seatNumber: seatTemplate.seatNumber,
        roleGroupId: seatTemplate.roleGroupId,
        roleLabel: seatTemplate.roleLabel,
      };
    });
    return team;
  });
  const teamEntries = Object.fromEntries(teams.map((team) => [team.id, team]));
  const expectedTeamRevisions = Object.fromEntries(
    teams.map((team) => [team.id, adapterRevision(state.teams.get(team.id)?.revision)])
  );
  try {
    const saved = await state.adminStore.saveDraftBundle(
      { draft: nextDraft, teams: teamEntries },
      {
        expectedDraftRevision: adapterRevision(state.draft?.revision),
        expectedTeamRevisions,
      }
    );
    state.draft = saved?.draft || nextDraft;
    for (const [teamId, team] of Object.entries(saved?.teams || teamEntries)) {
      state.teams.set(teamId, team);
    }
  } catch (error) {
    await adapterLoadAll(state, false);
    adapterNotify(state);
    throw error;
  }
  adapterNotify(state);
}

async function adapterSavePhases(state, payload) {
  const phases = list(payload.phases).map((phase, index) => ({
    id: cleanText(phase.id) || adapterUniqueId('phase', state),
    label: cleanText(phase.label),
    startMinute: Math.max(0, finiteNumber(phase.startMinute)),
    endMinute: Math.max(0, finiteNumber(phase.endMinute)),
    order: index + 1,
  }));
  if (phases.length !== 4) {
    throw adapterError('all-star-boh-phase-count', 'The plan must contain exactly four phases.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.phases = phases;
    return draft;
  });
}

function adapterNextPlanOrder(entries) {
  const highest = Math.max(0, ...list(entries).map((entry) => integer(entry?.order)));
  return Math.min(100_000, highest + 1);
}

function adapterInstructionRule(state, payload, order) {
  const scope = cleanText(payload.scope);
  if (!['global', 'role', 'seat', 'player'].includes(scope)) {
    throw adapterError('all-star-boh-scope-invalid', 'Choose a valid instruction scope.');
  }
  const scopeId = cleanText(payload.scopeId);
  if (scope !== 'global' && !scopeId) {
    throw adapterError('all-star-boh-scope-target-required', 'Choose an instruction target.');
  }
  const team = adapterFindTeam(state, payload.teamId);
  if (
    scope === 'role' &&
    !adapterPlan(state.draft).roleGroups.some((role) => role.id === scopeId)
  ) {
    throw adapterError('all-star-boh-role-unknown', 'Choose a role from the current plan.');
  }
  if (scope === 'seat' && !team.seats.some((seat) => seat.seatNumber === integer(scopeId))) {
    throw adapterError('all-star-boh-seat-unknown', 'Choose a seat from the current team.');
  }
  if (scope === 'player' && !team.seats.some((seat) => seat.playerId === scopeId)) {
    throw adapterError('all-star-boh-player-unknown', 'Choose a player assigned to this team.');
  }
  const objectives = adapterPlan(state.draft).objectives;
  const objectiveLookup = new Map(
    objectives.flatMap((objective) =>
      [objective.id, objective.code, objective.label]
        .map(cleanText)
        .filter(Boolean)
        .map((value) => [value.toLocaleLowerCase(), objective.id])
    )
  );
  const canonicalObjectiveId = (value) => {
    const token = cleanText(value);
    if (!token) return '';
    const id = objectiveLookup.get(token.toLocaleLowerCase());
    if (!id) {
      throw adapterError('all-star-boh-objective-unknown', `Unknown route objective: ${token}.`);
    }
    return id;
  };
  const canonicalObjectiveIds = (values) =>
    list(values)
      .map(canonicalObjectiveId)
      .filter((id, index, ids) => id && ids.indexOf(id) === index);
  const startObjectiveId = canonicalObjectiveId(payload.startObjectiveId);
  const objectiveId = canonicalObjectiveId(payload.objectiveId);
  const viaObjectiveIds = canonicalObjectiveIds(payload.viaObjectiveIds);
  const explicitPathObjectiveIds = canonicalObjectiveIds(payload.pathObjectiveIds);
  const pathObjectiveIds = [
    startObjectiveId,
    ...viaObjectiveIds,
    ...explicitPathObjectiveIds,
    objectiveId,
  ].filter((id, index, ids) => id && ids.indexOf(id) === index);
  const instruction = {
    summary: cleanText(payload.instruction),
    action: cleanText(payload.action),
    target: '',
    startObjectiveId,
    objectiveId,
    targetLabel: '',
    loadout: cleanText(payload.loadout),
    teleport: payload.teleport === true ? true : cleanText(payload.teleport) || null,
    note: cleanText(payload.note),
    priority: null,
    viaObjectiveIds,
    pathObjectiveIds,
  };
  return {
    id: adapterUniqueId(scope === 'seat' ? 'seat-rule' : 'role-rule', state),
    teamId: cleanText(payload.teamId) || '*',
    phaseId: cleanText(payload.phaseId) || '*',
    legionId: cleanText(payload.legionId) || '*',
    roleGroupId: scope === 'role' ? cleanText(payload.roleGroupId || payload.scopeId) : '',
    seatNumber: scope === 'seat' ? integer(payload.seatNumber || payload.scopeId) : null,
    playerId: scope === 'player' ? cleanText(payload.playerId || payload.scopeId) : '',
    scope,
    scopeId: scope === 'global' ? '*' : scopeId,
    order,
    instruction,
  };
}

async function adapterSaveInstruction(state, payload) {
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    const existingRules = [
      ...draft.plan.roleDefaults,
      ...draft.plan.seatOverrides,
      ...draft.plan.playerOverrides,
      ...draft.plan.instructions,
    ];
    const rule = adapterInstructionRule(state, payload, adapterNextPlanOrder(existingRules));
    if (rule.scope === 'role') draft.plan.roleDefaults.push(rule);
    else if (rule.scope === 'seat') draft.plan.seatOverrides.push(rule);
    else if (rule.scope === 'player') draft.plan.playerOverrides.push(rule);
    else draft.plan.instructions.push(rule);
    return draft;
  });
}

async function adapterRemoveInstruction(state, payload) {
  const id = cleanText(payload.instructionId);
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'playerOverrides', 'instructions']) {
      draft.plan[key] = list(draft.plan[key]).filter((rule) => rule.id !== id);
    }
    return draft;
  });
}

async function adapterSaveRotation(state, payload) {
  const team = adapterFindTeam(state, payload.teamId);
  const sourceSeat = adapterFindSeat(team, payload.sourceSeatNumber || payload.seatNumber);
  const targetSeat = adapterFindSeat(team, payload.targetSeatNumber);
  if (!sourceSeat.playerId) {
    throw adapterError(
      'all-star-boh-rotation-empty',
      'Assign a player before creating a rotation.'
    );
  }
  if (sourceSeat.seatNumber === targetSeat.seatNumber) {
    throw adapterError(
      'all-star-boh-rotation-same-seat',
      'Choose a different destination seat for the rotation.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    const rotationId = cleanText(payload.rotationId);
    const existing = rotationId
      ? draft.plan.rotations.find((rotation) => rotation.id === rotationId)
      : null;
    const rotation = {
      id: rotationId || adapterUniqueId('rotation', state),
      teamId: team.id,
      phaseId: cleanText(payload.phaseId) || '*',
      legionId: cleanText(payload.legionId) || '*',
      playerId: sourceSeat.playerId,
      seatNumber: targetSeat.seatNumber,
      roleGroupId: targetSeat.roleGroupId,
      note: cleanText(payload.note),
      order: existing?.order ?? adapterNextPlanOrder(draft.plan.rotations),
    };
    draft.plan.rotations = [
      ...draft.plan.rotations.filter((item) => item.id !== rotation.id),
      rotation,
    ];
    return draft;
  });
}

async function adapterRemoveRotation(state, payload) {
  const id = cleanText(payload.rotationId);
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.rotations = draft.plan.rotations.filter((rotation) => rotation.id !== id);
    return draft;
  });
}

async function adapterSaveObjective(state, payload) {
  const id = cleanText(payload.id) || adapterUniqueId('objective', state);
  const objective = {
    id,
    code: cleanText(payload.code),
    label: cleanText(payload.label),
    type: cleanText(payload.type) || 'objective',
    x: clamp(payload.x, 0, 100),
    y: clamp(payload.y, 0, 100),
  };
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.objectives = [...draft.plan.objectives.filter((item) => item.id !== id), objective];
    return draft;
  });
}

async function adapterRemoveObjective(state, payload) {
  const id = cleanText(payload.objectiveId);
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    const referenced = [
      ...draft.plan.roleDefaults,
      ...draft.plan.seatOverrides,
      ...draft.plan.playerOverrides,
      ...draft.plan.instructions,
    ].some(
      (rule) =>
        rule.instruction?.startObjectiveId === id ||
        rule.instruction?.objectiveId === id ||
        list(rule.instruction?.viaObjectiveIds).includes(id) ||
        list(rule.instruction?.pathObjectiveIds).includes(id)
    );
    if (referenced) {
      throw adapterError(
        'all-star-boh-objective-in-use',
        'Remove this objective from plan instructions before deleting it.'
      );
    }
    draft.plan.objectives = draft.plan.objectives.filter((objective) => objective.id !== id);
    return draft;
  });
}

function adapterCopyRules(rules, predicate, transform, state, prefix) {
  return list(rules)
    .filter(predicate)
    .map((rule) => ({
      ...adapterClone(rule),
      ...transform(rule),
      id: adapterUniqueId(prefix, state),
    }));
}

async function adapterCopyPhaseTemplate(state, payload) {
  const source = cleanText(payload.sourcePhaseId);
  const target = cleanText(payload.targetPhaseId);
  if (!source || !target || source === target) {
    throw adapterError('all-star-boh-copy-phase-invalid', 'Choose two different plan phases.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'playerOverrides', 'instructions']) {
      const keep = draft.plan[key].filter(
        (rule) =>
          !(
            rule.phaseId === target &&
            (rule.teamId === payload.teamId || rule.teamId === '*') &&
            (rule.legionId === payload.legionId || rule.legionId === '*')
          )
      );
      const copies = adapterCopyRules(
        draft.plan[key],
        (rule) =>
          rule.phaseId === source &&
          (rule.teamId === payload.teamId || rule.teamId === '*') &&
          (rule.legionId === payload.legionId || rule.legionId === '*'),
        () => ({ phaseId: target }),
        state,
        'phase-rule'
      );
      draft.plan[key] = [...keep, ...copies];
    }
    return draft;
  });
}

async function adapterCopyTeamPlan(state, payload) {
  const source = cleanText(payload.sourceTeamId);
  const target = cleanText(payload.targetTeamId);
  if (!source || !target || source === target) {
    throw adapterError('all-star-boh-copy-team-invalid', 'Choose two different teams.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'instructions']) {
      const keep = draft.plan[key].filter((rule) => rule.teamId !== target);
      const copies = adapterCopyRules(
        draft.plan[key],
        (rule) => rule.teamId === source,
        () => ({ teamId: target }),
        state,
        'team-rule'
      );
      draft.plan[key] = [...keep, ...copies];
    }
    return draft;
  });
}

async function adapterCopyLegionPlan(state, payload) {
  const source = cleanText(payload.sourceLegionId);
  const target = cleanText(payload.targetLegionId);
  if (!source || !target || source === target) {
    throw adapterError('all-star-boh-copy-legion-invalid', 'Choose two different Legions.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'playerOverrides', 'instructions']) {
      const keep = draft.plan[key].filter(
        (rule) => !(rule.legionId === target && rule.teamId === payload.teamId)
      );
      const copies = adapterCopyRules(
        draft.plan[key],
        (rule) => rule.legionId === source && rule.teamId === payload.teamId,
        () => ({ legionId: target }),
        state,
        'legion-rule'
      );
      draft.plan[key] = [...keep, ...copies];
    }
    draft.plan.rotations = [
      ...draft.plan.rotations.filter(
        (rotation) => !(rotation.legionId === target && rotation.teamId === payload.teamId)
      ),
      ...adapterCopyRules(
        draft.plan.rotations,
        (rotation) => rotation.legionId === source && rotation.teamId === payload.teamId,
        () => ({ legionId: target }),
        state,
        'legion-rotation'
      ),
    ];
    return draft;
  });
}

async function adapterApplyRoleDefault(state, payload) {
  const plan = adapterPlan(state.draft);
  const source = plan.roleDefaults
    .filter(
      (rule) =>
        rule.roleGroupId === payload.roleGroupId &&
        (rule.teamId === payload.teamId || rule.teamId === '*') &&
        (rule.phaseId === payload.phaseId || rule.phaseId === '*') &&
        (rule.legionId === payload.legionId || rule.legionId === '*')
    )
    .at(-1);
  if (!source) {
    throw adapterError(
      'all-star-boh-role-default-missing',
      'Create a matching role default before applying it to a seat.'
    );
  }
  const override = {
    ...adapterClone(source),
    id: adapterUniqueId('seat-rule', state),
    scope: 'seat',
    scopeId: String(integer(payload.seatNumber)),
    roleGroupId: '',
    seatNumber: integer(payload.seatNumber),
    teamId: cleanText(payload.teamId),
    phaseId: cleanText(payload.phaseId),
    legionId: cleanText(payload.legionId),
  };
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.seatOverrides = [
      ...draft.plan.seatOverrides.filter(
        (rule) =>
          !(
            rule.teamId === override.teamId &&
            rule.phaseId === override.phaseId &&
            rule.legionId === override.legionId &&
            rule.seatNumber === override.seatNumber
          )
      ),
      override,
    ];
    return draft;
  });
}

function adapterLegacyObjectives() {
  return ADAPTER_LEGACY_OBJECTIVE_CODES.map((code, index) => ({
    id: `legacy-${code.toLowerCase()}`,
    code,
    label: code === 'RUNE' ? 'Rune' : code,
    type: 'legacy-schematic',
    // Neutral review grid only; these are not asserted arena coordinates.
    x: 10 + (index % 5) * 20,
    y: 10 + (Math.floor(index / 5) % 5) * 20,
  }));
}

async function adapterApplyLegacyStructure(state, payload) {
  if (
    integer(payload.sourceSeatCount) !== 15 ||
    integer(payload.targetSeatCount) !== ROSTER_SIZE ||
    payload.copyPhases !== true ||
    payload.copyObjectiveCodes !== true ||
    payload.copyPlayerAssignments !== false ||
    payload.copyPlayerNames !== false ||
    payload.copyRoleCapacities !== false ||
    payload.requireExplicitRoleMapping !== true
  ) {
    throw adapterError(
      'all-star-boh-legacy-unsafe',
      'Legacy import was stopped because it attempted to map 15-seat player or role data into 12 seats.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.phases = BohModel.BOH_DEFAULT_PHASES.map((phase) => ({ ...phase }));
    const existing = new Map(draft.plan.objectives.map((objective) => [objective.id, objective]));
    for (const objective of adapterLegacyObjectives()) {
      if (!existing.has(objective.id)) existing.set(objective.id, objective);
    }
    draft.plan.objectives = [...existing.values()];
    return draft;
  });
}

function adapterModelTeams(state) {
  return adapterTeamIds(state.draft).map((teamId, index) => {
    const team = adapterMaterializeTeam(state, teamId, index);
    return {
      id: team.id,
      number: team.number,
      label: team.name,
      players: team.seats
        .filter((seat) => seat.playerId)
        .map((seat) => ({
          playerId: seat.playerId,
          gameName: seat.displayName || seat.playerId,
          seatNumber: seat.seatNumber,
          roleGroupId: seat.roleGroupId,
          roleLabel: seat.roleLabel,
        })),
    };
  });
}

function adapterValidationErrorText(error) {
  if (typeof error === 'string') return error;
  const code = cleanText(error?.code);
  const details = Object.entries(error || {})
    .filter(([key, value]) => key !== 'code' && value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' · ');
  return details ? `${code} (${details})` : code || 'all-star-boh-validation-error';
}

function adapterTeamMetadataErrors(state) {
  const errors = [];
  const teams = adapterTeamIds(state.draft).map((teamId, index) =>
    adapterMaterializeTeam(state, teamId, index)
  );
  if (teams.length !== TEAM_COUNT) {
    errors.push(`all-star-boh-team-count (expected: ${TEAM_COUNT}, actual: ${teams.length})`);
  }
  for (const team of teams) {
    if (!cleanText(team.name)) errors.push(`all-star-boh-team-name-required (team: ${team.id})`);
    if (!cleanText(team.color)) errors.push(`all-star-boh-team-color-required (team: ${team.id})`);
    if (!cleanText(team.captainId)) {
      errors.push(`all-star-boh-team-captain-required (team: ${team.id})`);
    } else if (!team.seats.some((seat) => seat.playerId === team.captainId)) {
      errors.push(`all-star-boh-team-captain-unassigned (team: ${team.id})`);
    }
  }
  return errors;
}

function adapterValidate(state) {
  const plan = adapterPlan(state.draft);
  const teams = adapterModelTeams(state);
  const teamValidation = BohModel.validateBohTeamAssignments(teams, {
    roleGroups: plan.roleGroups,
    expectedPlayerIds: adapterBalancedPlayers(state).map((player) => player.playerId),
  });
  const planValidation = BohModel.validateBohPlan(plan, {
    teams,
    requireInstructions: true,
  });
  const announcementErrors = [
    ...list(teamValidation.errors).map(adapterValidationErrorText),
    ...adapterTeamMetadataErrors(state),
  ];
  const planErrors = [
    ...announcementErrors,
    ...list(planValidation.errors).map(adapterValidationErrorText),
  ];
  const planWarnings = [];
  if (!plan.objectives.length) planWarnings.push('boh_objective_map_empty');
  state.validation = {
    revision: state.revision,
    valid: planErrors.length === 0,
    errors: planErrors,
    warnings: planWarnings,
    announcement: {
      valid: announcementErrors.length === 0,
      errors: announcementErrors,
      warnings: [],
    },
    plan: {
      valid: planErrors.length === 0,
      errors: planErrors,
      warnings: planWarnings,
    },
  };
  adapterNotify(state, false);
}

function adapterSanitizedPlan(state, includePlan) {
  if (!includePlan) {
    return {
      schemaVersion: 1,
      id: 'all-star-boh-announcement',
      label: 'Team announcement',
      roleGroups: adapterClone(adapterPlan(state.draft).roleGroups),
      phases: [],
      legions: [],
      objectives: [],
      roleDefaults: [],
      seatOverrides: [],
      playerOverrides: [],
      instructions: [],
      rotations: [],
      notes: [],
    };
  }
  return adapterPlan(state.draft);
}

function adapterPublicationBundle(state, kind) {
  const currentPublication = state.publication || {};
  const announcementPublished =
    kind === 'announcement' || currentPublication.announcementPublished === true;
  const planPublished = kind === 'plan' || currentPublication.planPublished === true;
  const includePlan = planPublished;
  const plan = adapterSanitizedPlan(state, includePlan);
  const compactPlan = includePlan
    ? {
        schemaVersion: plan.schemaVersion,
        id: plan.id,
        label: plan.label,
        roleGroups: adapterClone(plan.roleGroups),
        phases: adapterClone(plan.phases),
        legions: adapterClone(plan.legions),
        objectives: adapterClone(plan.objectives),
        roleDefaults: [],
        seatOverrides: [],
        playerOverrides: [],
        instructions: [],
        rotations: [],
        notes: [],
      }
    : null;
  const teams = {};
  const players = {};
  for (const team of adapterTeamIds(state.draft).map((teamId, index) =>
    adapterMaterializeTeam(state, teamId, index)
  )) {
    const publishedTeam = {
      name: team.name,
      number: team.number,
      color: team.color,
      captainId: team.captainId,
      seats: team.seats.map((seat) => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        playerId: seat.playerId,
        displayName: seat.displayName,
        roleGroupId: seat.roleGroupId,
        roleLabel: seat.roleLabel,
        side: seat.side,
        lane: seat.lane,
      })),
    };
    teams[team.id] = publishedTeam;
    const modelTeam = {
      id: team.id,
      number: team.number,
      label: team.name,
      players: team.seats
        .filter((seat) => seat.playerId)
        .map((seat) => ({
          playerId: seat.playerId,
          gameName: seat.displayName || seat.playerId,
          seatNumber: seat.seatNumber,
        })),
    };
    for (const seat of team.seats.filter((item) => item.playerId)) {
      const submission = adapterFindSubmission(state, seat.playerId);
      const projectionUid = submission ? adapterSubmissionUid(submission) : '';
      if (!projectionUid) {
        throw adapterError(
          'all-star-boh-publication-submission-missing',
          `Player ${seat.playerId} has no matching submitted signup.`
        );
      }
      if (players[projectionUid]) {
        throw adapterError(
          'all-star-boh-publication-uid-duplicate',
          `Signup ${projectionUid} is assigned more than once.`
        );
      }
      const projection = {
        playerId: seat.playerId,
        displayName: seat.displayName || seat.playerId,
        teamId: team.id,
        teamName: team.name,
        teamNumber: team.number,
        teamColor: team.color,
        seatNumber: seat.seatNumber,
        roleGroupId: seat.roleGroupId,
        roleLabel: seat.roleLabel,
        announcement: '',
      };
      if (includePlan) {
        projection.plan = compactPlan;
        projection.timeline = BohModel.projectBohPlayerTimeline(plan, modelTeam, seat.playerId).map(
          ({ instructionSources: _sources, ...entry }) => entry
        );
      }
      players[projectionUid] = projection;
    }
  }
  return {
    current: {
      revision: state.publicationRevision,
      status:
        planPublished && announcementPublished ? 'live' : planPublished ? 'plan' : 'announcement',
      eventName: cleanText(state.options.eventName) || cleanText(state.draft?.title),
      title: cleanText(state.options.publicationTitle) || cleanText(state.draft?.title),
      subtitle: cleanText(state.options.publicationSubtitle),
      message: cleanText(state.options.publicationMessage),
      announcementPublished,
      planPublished,
      activePlanRevision: state.revision,
      teamCount: TEAM_COUNT,
      rosterSize: ROSTER_SIZE,
      teamIds: Object.keys(teams),
      phases: includePlan ? adapterClone(plan.phases) : [],
      legions: includePlan ? adapterClone(plan.legions) : [],
    },
    teams,
    players,
    sourceDraftRevision: adapterRevision(state.draft?.revision),
    sourceTeamRevisions: Object.fromEntries(
      adapterTeamIds(state.draft).map((teamId) => [
        teamId,
        adapterRevision(state.teams.get(teamId)?.revision),
      ])
    ),
  };
}

export function validateAdminAllStarBohPublicationBundle(bundle = {}) {
  const current = bundle.current || {};
  if (current.planPublished !== true) return { valid: true, errors: [] };
  const teams = Object.entries(bundle.teams || {}).map(([teamId, team]) => ({
    id: teamId,
    number: team.number,
    label: team.name,
    players: list(team.seats)
      .filter((seat) => seat.playerId)
      .map((seat) => ({
        playerId: seat.playerId,
        gameName: seat.displayName || seat.playerId,
        seatNumber: seat.seatNumber,
      })),
  }));
  const players = Object.values(bundle.players || {});
  const roleGroups = players.find((player) => player?.plan)?.plan?.roleGroups || [];
  const errors = list(
    BohModel.validateBohTeamAssignments(teams, {
      roleGroups,
      expectedPlayerIds: players.map((player) => player.playerId),
    }).errors
  );
  const phaseIds = list(current.phases).map((phase) => phase.id);
  const legionIds = list(current.legions).map((legion) => legion.id);
  const expectedSteps = new Set(
    phaseIds.flatMap((phaseId) => legionIds.map((legionId) => `${phaseId}\u0000${legionId}`))
  );
  for (const player of players) {
    const timeline = list(player.timeline);
    const actualSteps = new Set(
      timeline.map((entry) => `${cleanText(entry.phaseId)}\u0000${cleanText(entry.legionId)}`)
    );
    if (
      timeline.length !== expectedSteps.size ||
      actualSteps.size !== expectedSteps.size ||
      [...expectedSteps].some((key) => !actualSteps.has(key))
    ) {
      errors.push({ code: 'boh_timeline_incomplete', playerId: player.playerId });
    }
    for (const entry of timeline) {
      if (!entry.instruction || !Object.keys(entry.instruction).length) {
        errors.push({
          code: 'boh_instruction_missing',
          playerId: player.playerId,
          phaseId: entry.phaseId,
          legionId: entry.legionId,
        });
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    message: errors.length ? adapterValidationErrorText(errors[0]) : '',
  };
}

async function adapterPublish(state, kind) {
  const readiness = state.validation?.[kind];
  if (readiness?.valid !== true || adapterRevision(state.validation?.revision) !== state.revision) {
    throw adapterError(
      'all-star-boh-publish-not-validated',
      'Validate the current All-Star draft revision before publishing.'
    );
  }
  if (kind === 'plan' && state.publication?.announcementPublished !== true) {
    throw adapterError(
      'all-star-boh-announcement-required',
      'Publish the team announcement before publishing the personal plan.'
    );
  }
  const bundle = adapterPublicationBundle(state, kind);
  let result;
  try {
    result = await state.adminStore.publish(bundle, {
      expectedRevision: state.publicationRevision,
      sourceDraftRevision: bundle.sourceDraftRevision,
      sourceTeamRevisions: bundle.sourceTeamRevisions,
      validate: state.options.validatePublication || validateAdminAllStarBohPublicationBundle,
    });
  } catch (error) {
    if (error?.code === 'all-star-boh-conflict' && Number.isInteger(error.actualRevision)) {
      state.publicationRevision = error.actualRevision;
      adapterNotify(state);
    }
    throw error;
  }
  state.publication = result?.current || bundle.current;
  state.publicationRevision = adapterRevision(state.publication?.revision);
  adapterNotify(state);
}

/**
 * Adapt the revisioned Firestore primitives from createAllStarBohAdminStore()
 * into the aggregate controller contract. This layer owns no Firebase calls.
 */
export function createAdminAllStarBohStoreAdapter(adminStore, options = {}) {
  const required = [
    'listSubmissions',
    'subscribeSubmissions',
    'getReview',
    'saveReview',
    'getDraft',
    'subscribeDraft',
    'saveDraft',
    'getDraftTeam',
    'subscribeDraftTeam',
    'saveDraftTeam',
    'saveDraftBundle',
    'publish',
  ];
  const missing = required.filter((name) => typeof adminStore?.[name] !== 'function');
  if (missing.length) {
    throw new TypeError(`All-Star admin store adapter is missing: ${missing.join(', ')}.`);
  }
  const state = {
    adminStore,
    options,
    submissions: [],
    epicPreferences: [],
    reviews: new Map(),
    draft: adapterDefaultDraft(),
    teams: new Map(),
    publication: null,
    publicationRevision: adapterRevision(options.publicationRevision),
    validation: {},
    revision: 0,
    listeners: new Set(),
    unsubscribers: new Set(),
    teamUnsubscribers: new Map(),
    idSequence: 0,
    started: false,
    startPromise: null,
    stopped: false,
  };

  async function dispatch(command = {}) {
    const type = cleanText(command.type);
    const payload = command.payload && typeof command.payload === 'object' ? command.payload : {};
    adapterAssertRevision(state, payload, command);
    if (type === 'reviewSubmission') await adapterReviewSubmission(state, payload);
    else if (type === 'createScoringVersion') await adapterCreateScoringVersion(state, payload);
    else if (type === 'setScoreOverride') await adapterSetScoreOverride(state, payload);
    else if (type === 'removeScoreOverride') await adapterRemoveScoreOverride(state, payload);
    else if (type === 'setSeatLock') await adapterSetSeatLock(state, payload);
    else if (type === 'moveSeat') await adapterMoveOrSwapSeat(state, payload, false);
    else if (type === 'swapSeats') await adapterMoveOrSwapSeat(state, payload, true);
    else if (type === 'balanceTeams') await adapterBalanceTeams(state, payload);
    else if (type === 'saveEligiblePool') await adapterSaveEligiblePool(state, payload);
    else if (type === 'assignSeatPlayer') await adapterAssignSeatPlayer(state, payload);
    else if (type === 'saveTeamMetadata') await adapterSaveTeamMetadata(state, payload);
    else if (type === 'saveRoleGroups') await adapterSaveRoleGroups(state, payload);
    else if (type === 'savePhases') await adapterSavePhases(state, payload);
    else if (type === 'saveInstruction') await adapterSaveInstruction(state, payload);
    else if (type === 'removeInstruction') await adapterRemoveInstruction(state, payload);
    else if (type === 'saveRotation') await adapterSaveRotation(state, payload);
    else if (type === 'removeRotation') await adapterRemoveRotation(state, payload);
    else if (type === 'saveObjective') await adapterSaveObjective(state, payload);
    else if (type === 'removeObjective') await adapterRemoveObjective(state, payload);
    else if (type === 'copyPhaseTemplate') await adapterCopyPhaseTemplate(state, payload);
    else if (type === 'copyTeamPlan') await adapterCopyTeamPlan(state, payload);
    else if (type === 'copyLegionPlan') await adapterCopyLegionPlan(state, payload);
    else if (type === 'applyRoleDefault') await adapterApplyRoleDefault(state, payload);
    else if (type === 'applyLegacyStructureTemplate') {
      await adapterApplyLegacyStructure(state, payload);
    } else if (type === 'validateRevision') adapterValidate(state);
    else if (type === 'publishAnnouncement') await adapterPublish(state, 'announcement');
    else if (type === 'publishPlan') await adapterPublish(state, 'plan');
    else {
      throw adapterError(
        'all-star-boh-action-unknown',
        `Unknown All-Star admin action: ${type || '(empty)'}.`
      );
    }
    return { snapshot: adapterSnapshot(state) };
  }

  const adapter = {
    async start() {
      if (state.started) return state.startPromise;
      state.started = true;
      state.stopped = false;
      state.startPromise = (async () => {
        await adapterLoadAll(state);
        await adapterStartSubscriptions(state);
        return adapterSnapshot(state);
      })();
      try {
        return await state.startPromise;
      } catch (error) {
        state.started = false;
        state.startPromise = null;
        throw error;
      }
    },
    async refresh() {
      return adapterLoadAll(state);
    },
    getSnapshot() {
      return adapterSnapshot(state);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('All-Star admin adapter subscriptions require a callback.');
      }
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    dispatch,
    stop() {
      if (state.stopped) return;
      state.stopped = true;
      for (const unsubscribe of state.unsubscribers) {
        try {
          unsubscribe?.();
        } catch {
          // Listener teardown is best-effort.
        }
      }
      for (const unsubscribe of state.teamUnsubscribers.values()) {
        try {
          unsubscribe?.();
        } catch {
          // Listener teardown is best-effort.
        }
      }
      state.unsubscribers.clear();
      state.teamUnsubscribers.clear();
      state.listeners.clear();
      if (options.stopAdminStoreOnDestroy !== false) adminStore.stop?.();
      if (
        options.publicationStore &&
        options.publicationStore !== adminStore &&
        options.stopPublicationStoreOnDestroy !== false
      ) {
        options.publicationStore.stop?.();
      }
    },
  };
  return Object.freeze(adapter);
}

function makeInitialState(root, options) {
  const snapshot = normalizeSnapshot(options.initialSnapshot);
  return {
    root,
    options,
    store: options.store || null,
    ownsStore: false,
    tr: makeTranslator(options.t),
    locale: cleanText(options.locale) || document.documentElement.lang || 'en',
    direction: cleanText(options.direction),
    snapshot,
    stage: STAGES.some(([id]) => id === options.initialStage) ? options.initialStage : 'signups',
    signupFilter: 'all',
    signupSearch: '',
    selectedSubmissionId: '',
    selectedSourceSeat: null,
    planTeamId: snapshot.teams[0]?.id || 'team-1',
    planPhaseId: snapshot.plan.phases[0]?.id || DEFAULT_PHASES[0].id,
    planLegionId: snapshot.plan.legions[0]?.id || DEFAULT_LEGIONS[0].id,
    planScope: 'role',
    previewKind: 'announcement',
    selectedPreviewTeamId: snapshot.teams[0]?.id || '',
    selectedPreviewPlayerId: snapshot.teams[0]?.seats.find((seat) => seat.playerId)?.playerId || '',
    roleDrafts: null,
    phaseDrafts: null,
    objectiveDraftId: '',
    rotationDraftId: '',
    status: { message: '', tone: 'neutral' },
    pending: false,
    mounted: false,
    destroyed: false,
    eventsAbort: null,
    unsubscribe: null,
  };
}

function currentPlayers(state) {
  const byId = new Map();
  for (const submission of state.snapshot.submissions) {
    const id = playerId(submission);
    if (!id) continue;
    byId.set(id, { ...submission, playerId: id, displayName: playerName(submission) });
  }
  for (const score of state.snapshot.scores) {
    const id = playerId(score);
    if (!id) continue;
    byId.set(id, {
      ...(byId.get(id) || {}),
      ...score,
      playerId: id,
      displayName: playerName(score) || playerName(byId.get(id)),
    });
  }
  for (const team of state.snapshot.teams) {
    for (const seat of team.seats) {
      if (!seat.playerId || byId.has(seat.playerId)) continue;
      byId.set(seat.playerId, {
        playerId: seat.playerId,
        displayName: seat.displayName || seat.playerId,
      });
    }
  }
  return [...byId.values()];
}

function playerById(state, id) {
  return currentPlayers(state).find((player) => player.playerId === id) || null;
}

function scoreValue(player) {
  return finiteNumber(
    player?.finalScore ??
      player?.score?.total ??
      player?.scoreTotal ??
      player?.totalScore ??
      player?.score
  );
}

function formatNumber(state, value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(state.locale || undefined, { maximumFractionDigits }).format(
    finiteNumber(value)
  );
}

function formatDate(state, value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value?.toMillis?.() ?? value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(state.locale || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function stageLabel(state, stageId) {
  const definition = STAGES.find(([id]) => id === stageId) || STAGES[0];
  return state.tr(definition[1], definition[2]);
}

function teamDisplayName(state, team) {
  if (!team) return '';
  return team.generatedName
    ? state.tr('adminBohTeamNameFallback', 'Team {number}', { number: team.number })
    : team.name;
}

function roleDisplayName(state, role) {
  if (!role) return '';
  if (role.id === 'unassigned' && role.generatedLabel) {
    return state.tr('adminBohRoleUnassigned', 'Role unassigned');
  }
  return role.generatedLabel
    ? state.tr('adminBohRoleNameFallback', 'Role {number}', { number: role.order })
    : role.label;
}

function phaseDisplayName(state, phase) {
  if (!phase) return '';
  const defaults = {
    'phase-0-5': ['adminBohPhase0To5', '0–5 min'],
    'phase-5-10': ['adminBohPhase5To10', '5–10 min'],
    'phase-10-15': ['adminBohPhase10To15', '10–15 min'],
    'phase-15-30': ['adminBohPhase15To30', '15–30 min'],
  };
  const known = defaults[phase.id];
  if (phase.generatedLabel && known) return state.tr(known[0], known[1]);
  return phase.generatedLabel
    ? state.tr('adminBohPhaseNameFallback', 'Phase {number}', { number: phase.order })
    : phase.label;
}

function legionDisplayName(state, legion) {
  if (!legion) return '';
  return legion.generatedLabel
    ? state.tr('adminBohLegionNameFallback', 'Legion {number}', { number: legion.order })
    : legion.label;
}

function statusLabel(state, status) {
  const labels = {
    pending: ['adminBohStatusPending', 'Pending review'],
    confirmed: ['adminBohStatusConfirmed', 'Confirmed'],
    approved: ['adminBohStatusConfirmed', 'Confirmed'],
    needs_correction: ['adminBohStatusCorrection', 'Needs correction'],
    excluded: ['adminBohStatusExcluded', 'Excluded'],
    draft: ['adminBohDraft', 'Draft'],
    published: ['adminBohPublishedStatus', 'Published'],
  };
  const [key, fallback] = labels[status] || ['adminBohStatusUnknown', 'Unknown'];
  return state.tr(key, fallback);
}

function renderStageNavigation(state) {
  const pending = state.snapshot.submissions.filter(
    (submission) => submissionStatus(submission) === 'pending'
  ).length;
  return STAGES.map(([id, key, fallback], index) => {
    const selected = state.stage === id;
    const badge =
      id === 'signups' && pending ? `<span class="boh-admin-nav-count">${pending}</span>` : '';
    return `<button type="button" role="tab" id="bohAdminTab-${id}"
      class="boh-admin-nav-button" data-action="stage" data-stage="${id}"
      aria-selected="${selected}" aria-controls="bohAdminStagePanel"
      tabindex="${selected ? '0' : '-1'}">
      <span class="boh-admin-nav-index" aria-hidden="true">${index + 1}</span>
      <span>${escapeHtml(state.tr(key, fallback))}</span>${badge}
    </button>`;
  }).join('');
}

function renderShell(state) {
  const { root } = state;
  root.classList.add('boh-admin');
  if (state.direction) root.dir = state.direction;
  root.innerHTML = `
    <section class="boh-admin-shell" aria-labelledby="bohAdminTitle">
      <header class="boh-admin-hero">
        <div>
          <p class="boh-admin-kicker">${escapeHtml(
            state.tr('adminBohKicker', 'ALL-STAR BoH · 6 TEAMS · 72 PLAYERS')
          )}</p>
          <h2 id="bohAdminTitle">${escapeHtml(
            state.tr('adminBohTitle', 'All-Star BoH Command Center')
          )}</h2>
          <p>${escapeHtml(
            state.tr(
              'adminBohSubtitle',
              'Review signups, balance six teams, author role plans, and publish player-safe views.'
            )
          )}</p>
        </div>
        <div class="boh-admin-hero-meta">
          <span>${escapeHtml(state.tr('adminBohDraftRevision', 'Draft revision'))}</span>
          <strong>${state.snapshot.revision}</strong>
          <button type="button" class="boh-admin-button boh-admin-button-quiet" data-action="refresh">
            ${escapeHtml(state.tr('adminBohRefresh', 'Refresh'))}
          </button>
        </div>
      </header>

      <div id="bohAdminStatus" class="boh-admin-status" role="status" aria-live="polite"
        data-tone="${escapeHtml(state.status.tone)}" ${state.status.message ? '' : 'hidden'}>
        ${escapeHtml(state.status.message)}
      </div>

      <nav class="boh-admin-nav" role="tablist" aria-label="${escapeHtml(
        state.tr('adminBohWorkflow', 'All-Star administration workflow')
      )}">
        ${renderStageNavigation(state)}
      </nav>

      <div id="bohAdminStagePanel" class="boh-admin-stage" role="tabpanel"
        aria-labelledby="bohAdminTab-${state.stage}" tabindex="0">
        ${renderCurrentStage(state)}
      </div>
    </section>`;
  root.setAttribute('aria-busy', String(state.pending));
}

function renderCurrentStage(state) {
  if (state.stage === 'scoring') return renderScoring(state);
  if (state.stage === 'teams') return renderTeamBuilder(state);
  if (state.stage === 'plans') return renderPlans(state);
  if (state.stage === 'publish') return renderPublish(state);
  return renderSignupReview(state);
}

function summaryCard(value, label, tone = 'neutral') {
  return `<article class="boh-admin-summary-card" data-tone="${tone}">
    <strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span>
  </article>`;
}

function epicLaneLabel(state, lane) {
  const labels = {
    south: ['adminBohEpicLaneSouth', 'South'],
    center: ['adminBohEpicLaneCenter', 'Center'],
    north: ['adminBohEpicLaneNorth', 'North'],
  };
  const [key, fallback] = labels[lane] || ['', lane];
  return key ? state.tr(key, fallback) : fallback;
}

function playerCountLabel(state, count) {
  return state.tr('adminBohPlayersCount', '{count} players', { count });
}

function renderEpicShowdownPreferenceSummary(state) {
  const summary = buildAdminEpicShowdownPreferenceSummary(state.snapshot);
  const laneItems = EPIC_LANE_IDS.map(
    (lane) => `<li>
      <span>${escapeHtml(epicLaneLabel(state, lane))}</span>
      <strong>${escapeHtml(playerCountLabel(state, summary.laneCounts[lane]))}</strong>
    </li>`
  ).join('');
  const timeItems = summary.times
    .map(
      ({ value, count }) => `<li>
        <span>${escapeHtml(value)}</span>
        <strong>${escapeHtml(playerCountLabel(state, count))}</strong>
      </li>`
    )
    .join('');
  const preferenceRows = summary.players
    .map(
      (preference) => `<tr>
        <th scope="row">${escapeHtml(preference.displayName || preference.playerId)}</th>
        <td>${escapeHtml(
          preference.lanes.map((lane) => epicLaneLabel(state, lane)).join(', ') ||
            state.tr('adminBohNotProvided', 'Not provided')
        )}</td>
        <td>${escapeHtml(
          preference.times.join(', ') || state.tr('adminBohNotProvided', 'Not provided')
        )}</td>
        <td>${escapeHtml(
          preference.flexibilityPreference || state.tr('adminBohNotProvided', 'Not provided')
        )}</td>
      </tr>`
    )
    .join('');

  return `<section class="boh-admin-card boh-admin-epic-preferences" aria-labelledby="bohAdminEpicPreferencesTitle">
    <header>
      <div>
        <p class="boh-admin-card-kicker">${escapeHtml(
          state.tr('adminBohPlanningSignal', 'Planning signal only')
        )}</p>
        <h4 id="bohAdminEpicPreferencesTitle">${escapeHtml(
          state.tr('adminBohEpicShowdownPreferences', 'Epic Showdown preferences')
        )}</h4>
        <p>${escapeHtml(
          state.tr(
            'adminBohEpicShowdownPreferencesHelp',
            'Player-selected lanes and game times for planning only. Multiple choices are allowed.'
          )
        )}</p>
      </div>
      <strong class="boh-admin-preference-total">${escapeHtml(
        playerCountLabel(state, summary.totalPlayers)
      )}</strong>
    </header>
    <div class="boh-admin-preference-overview">
      <section>
        <h5>${escapeHtml(state.tr('adminBohEpicLaneSummary', 'Lane interest'))}</h5>
        <ul>${laneItems}</ul>
      </section>
      <section>
        <h5>${escapeHtml(state.tr('adminBohEpicTimeSummary', 'Game-time interest'))}</h5>
        <ul>${timeItems}</ul>
      </section>
    </div>
    <details class="boh-admin-preference-details" open>
      <summary>${escapeHtml(
        state.tr('adminBohEpicPlayerPreferences', 'Player preference details')
      )}</summary>
      ${
        preferenceRows
          ? `<div class="boh-admin-table-wrap" tabindex="0">
              <table class="boh-admin-table">
                <thead><tr>
                  <th scope="col">${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicLane', 'Preferred lanes')
                  )}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicTimes', 'Preferred game times')
                  )}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicFlexibility', 'Flexibility preference')
                  )}</th>
                </tr></thead>
                <tbody>${preferenceRows}</tbody>
              </table>
            </div>`
          : `<p class="boh-admin-preference-empty">${escapeHtml(
              state.tr('adminBohEpicNoPreferences', 'No Epic Showdown preferences submitted yet.')
            )}</p>`
      }
    </details>
  </section>`;
}

function filteredSubmissions(state) {
  const needle = state.signupSearch.toLocaleLowerCase();
  return state.snapshot.submissions.filter((submission) => {
    const status = submissionStatus(submission);
    if (state.signupFilter !== 'all' && status !== state.signupFilter) return false;
    if (!needle) return true;
    return [playerName(submission), submission?.server, submission?.alliance]
      .map((value) => cleanText(value).toLocaleLowerCase())
      .some((value) => value.includes(needle));
  });
}

function renderSignupReview(state) {
  const submissions = state.snapshot.submissions;
  const visible = filteredSubmissions(state);
  const pending = submissions.filter((item) => submissionStatus(item) === 'pending').length;
  const confirmed = submissions.filter((item) =>
    ['confirmed', 'approved'].includes(submissionStatus(item))
  ).length;
  const correction = submissions.filter(
    (item) => submissionStatus(item) === 'needs_correction'
  ).length;
  const selected = submissions.find((item) => playerId(item) === state.selectedSubmissionId);
  return `
    <header class="boh-admin-stage-header">
      <div>
        <p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageOne', 'STAGE 1 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'signups'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohSignupsHelp',
            'Compare player-confirmed values with OCR warnings. Screenshots are not exposed here unless the store explicitly supplies a protected review URL.'
          )
        )}</p>
      </div>
    </header>
    <div class="boh-admin-summary-grid">
      ${summaryCard(submissions.length, state.tr('adminBohTotalSignups', 'Total signups'))}
      ${summaryCard(pending, state.tr('adminBohPendingReview', 'Pending review'), 'warning')}
      ${summaryCard(confirmed, state.tr('adminBohConfirmed', 'Confirmed'), 'success')}
      ${summaryCard(correction, state.tr('adminBohNeedsCorrection', 'Needs correction'), 'danger')}
    </div>
    ${renderEpicShowdownPreferenceSummary(state)}
    <form class="boh-admin-toolbar" data-form="signup-filter">
      <label>
        <span>${escapeHtml(state.tr('adminBohSearchPlayers', 'Search players'))}</span>
        <input class="boh-admin-input" name="search" type="search" value="${escapeHtml(
          state.signupSearch
        )}" autocomplete="off" placeholder="${escapeHtml(
          state.tr('adminBohSearchPlaceholder', 'Game name, server, or alliance')
        )}" />
      </label>
      <label>
        <span>${escapeHtml(state.tr('adminBohReviewStatus', 'Review status'))}</span>
        <select class="boh-admin-select" name="status">
          ${signupStatusOptions(state)}
        </select>
      </label>
      <button class="boh-admin-button" type="submit">${escapeHtml(
        state.tr('adminBohApplyFilters', 'Apply filters')
      )}</button>
    </form>
    <div class="boh-admin-review-layout">
      <div class="boh-admin-table-wrap" tabindex="0">
        <table class="boh-admin-table">
          <caption>${escapeHtml(
            state.tr('adminBohSignupCaption', '{shown} of {total} signups', {
              shown: visible.length,
              total: submissions.length,
            })
          )}</caption>
          <thead><tr>
            <th scope="col">${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</th>
            <th scope="col">${escapeHtml(
              state.tr('adminBohPreferredTeammates', 'Preferred teammates')
            )}</th>
            <th scope="col">${escapeHtml(state.tr('adminBohSource', 'Capture'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminBohReviewStatus', 'Review status'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminBohUpdated', 'Updated'))}</th>
            <th scope="col"><span class="boh-admin-sr">${escapeHtml(
              state.tr('adminBohActions', 'Actions')
            )}</span></th>
          </tr></thead>
          <tbody>${visible.length ? visible.map((item) => renderSignupRow(state, item)).join('') : renderEmptyRow(state, 6, 'adminBohNoSignups', 'No signups match these filters.')}</tbody>
        </table>
      </div>
      ${selected ? renderSignupDetail(state, selected) : renderSignupEmptyDetail(state)}
    </div>`;
}

function signupStatusOptions(state) {
  const options = [
    ['all', 'adminBohAllStatuses', 'All statuses'],
    ['pending', 'adminBohStatusPending', 'Pending review'],
    ['confirmed', 'adminBohStatusConfirmed', 'Confirmed'],
    ['needs_correction', 'adminBohStatusCorrection', 'Needs correction'],
    ['excluded', 'adminBohStatusExcluded', 'Excluded'],
  ];
  return options
    .map(
      ([value, key, fallback]) =>
        `<option value="${value}" ${state.signupFilter === value ? 'selected' : ''}>${escapeHtml(
          state.tr(key, fallback)
        )}</option>`
    )
    .join('');
}

function renderSignupRow(state, submission) {
  const id = playerId(submission);
  const status = submissionStatus(submission);
  const capture =
    submission?.ocr?.used || submission?.captureSource === 'ocr'
      ? state.tr('adminBohCaptureOcrConfirmed', 'OCR + confirmed')
      : state.tr('adminBohCaptureManual', 'Manual');
  const preferredTeammates = getAdminPreferredTeammateNames(submission);
  return `<tr ${state.selectedSubmissionId === id ? 'data-selected="true"' : ''}>
    <th scope="row"><strong>${escapeHtml(playerName(submission) || id || '—')}</strong>
      <small>${escapeHtml(cleanText(submission?.server || submission?.alliance))}</small></th>
    <td class="boh-admin-preferred-teammates-cell">${escapeHtml(
      preferredTeammates.join(', ') || '—'
    )}</td>
    <td>${escapeHtml(capture)}</td>
    <td><span class="boh-admin-status-chip" data-status="${escapeHtml(status)}">${escapeHtml(
      statusLabel(state, status)
    )}</span></td>
    <td>${escapeHtml(formatDate(state, submission?.updatedAt || submission?.submittedAt))}</td>
    <td><button type="button" class="boh-admin-button boh-admin-button-small" data-action="select-submission" data-player-id="${escapeHtml(
      id
    )}">${escapeHtml(state.tr('adminBohReview', 'Review'))}</button></td>
  </tr>`;
}

function renderEmptyRow(state, colspan, key, fallback) {
  return `<tr><td class="boh-admin-empty" colspan="${colspan}">${escapeHtml(
    state.tr(key, fallback)
  )}</td></tr>`;
}

function renderSignupEmptyDetail(state) {
  return `<aside class="boh-admin-detail boh-admin-detail-empty">
    <span aria-hidden="true">◎</span>
    <h4>${escapeHtml(state.tr('adminBohSelectSignup', 'Select a signup'))}</h4>
    <p>${escapeHtml(
      state.tr(
        'adminBohSelectSignupHelp',
        'Open a player to inspect confirmed values and OCR warnings.'
      )
    )}</p>
  </aside>`;
}

function statEntries(state, submission) {
  const source = submission?.confirmedStats || submission?.stats || {};
  return [
    ['totalCastlePower', 'adminBohStatTotalPower', 'Total power'],
    ['troopPower', 'adminBohStatTroopPower', 'Troop power'],
    ['buildingPower', 'adminBohStatBuildingPower', 'Building power'],
    ['technologyPower', 'adminBohStatTechnologyPower', 'Technology power'],
    ['heroCombatPower', 'adminBohStatHeroPower', 'Hero combat power'],
    ['dragonPower', 'adminBohStatDragonPower', 'Dragon power'],
    ['unitSpecialtyPower', 'adminBohStatUnitSpecialtyPower', 'Unit specialty power'],
    ['artifactPower', 'adminBohStatArtifactPower', 'Artifact power'],
    ['royalTechPower', 'adminBohStatRoyalTechPower', 'Royal Tech power'],
    ['rocLevel', 'adminBohStatRocLevel', 'RoC level'],
  ].map(([key, translationKey, fallback]) => ({
    key,
    label: state.tr(translationKey, fallback),
    value:
      key === 'heroCombatPower'
        ? (source.heroCombatPower ?? source.heroPower)
        : key === 'totalCastlePower'
          ? (source.totalCastlePower ?? source.totalPower)
          : source[key],
  }));
}

function adminBooleanLabel(state, value) {
  if (value === true) return state.tr('adminBohYes', 'Yes');
  if (value === false) return state.tr('adminBohNo', 'No');
  return state.tr('adminBohNotProvided', 'Not provided');
}

function adminChoiceLabel(state, value) {
  const normalized = cleanText(value).toLocaleLowerCase();
  const choices = {
    all: ['adminBohChoiceAllAvailability', 'All phases'],
    most: ['adminBohChoiceMostAvailability', 'Most phases'],
    backup: ['adminBohChoiceBackup', 'Backup'],
    unavailable: ['adminBohChoiceUnavailable', 'Unavailable'],
    flexible: ['adminBohChoiceFlexible', 'Flexible'],
    offensive: ['adminBohChoiceOffensive', 'Offensive team'],
    rune: ['adminBohChoiceRune', 'Rune team'],
    top: ['adminBohChoiceTop', 'Top side'],
    bottom: ['adminBohChoiceBottom', 'Bottom side'],
    cavalry: ['adminBohChoiceCavalry', 'Cavalry'],
    archers: ['adminBohChoiceArchers', 'Archers'],
    footmen: ['adminBohChoiceFootmen', 'Footmen'],
    lionheart: ['adminBohChoiceLionheart', 'LionHeart'],
    'cao cao': ['adminBohChoiceCaoCao', 'Cao Cao'],
    'cao-cao': ['adminBohChoiceCaoCao', 'Cao Cao'],
    'al fatih': ['adminBohChoiceAlFatih', 'Al Fatih'],
    'al-fatih': ['adminBohChoiceAlFatih', 'Al Fatih'],
  };
  const choice = choices[normalized];
  return choice ? state.tr(choice[0], choice[1]) : cleanText(value);
}

function submissionDetailEntries(state, submission) {
  const stats = submission?.confirmedStats || submission?.stats || {};
  const commitment = submission?.commitment || {};
  const textOrFallback = (value) =>
    cleanText(value) || state.tr('adminBohNotProvided', 'Not provided');
  const arrayOrFallback = (value) =>
    list(value)
      .map((item) => adminChoiceLabel(state, item))
      .filter(Boolean)
      .join(', ') || state.tr('adminBohNotProvided', 'Not provided');
  return [
    [state.tr('adminBohKnownNames', 'Known names'), arrayOrFallback(submission?.knownNames)],
    [state.tr('adminBohLocale', 'Language / locale'), textOrFallback(submission?.locale)],
    [state.tr('adminBohEntryMethod', 'Entry method'), textOrFallback(submission?.entryMethod)],
    [
      state.tr('adminBohRolePreferences', 'Role preferences'),
      arrayOrFallback(submission?.rolePreferences),
    ],
    [
      state.tr('adminBohEligibleRoles', 'Eligible roles'),
      arrayOrFallback(submission?.eligibleRoleIds),
    ],
    [
      state.tr('adminBohSubmittedAt', 'Submitted at'),
      submission?.submittedAt || submission?.submittedAtMs
        ? formatDate(state, submission.submittedAt || submission.submittedAtMs)
        : state.tr('adminBohNotProvided', 'Not provided'),
    ],
    [
      state.tr('adminBohT9Types', 'T10 troop types'),
      arrayOrFallback(stats.t10TroopTypes?.length ? stats.t10TroopTypes : stats.t9TroopTypes),
    ],
    [
      state.tr('adminBohReadySpeedHeroes', 'Ready speed heroes'),
      arrayOrFallback(stats.readySpeedHeroes),
    ],
    [
      state.tr('adminBohTroopInventory', 'OCR troop inventory'),
      stats.troopRoster?.length
        ? `${stats.troopRoster.length} ${state.tr('adminBohTroopRows', 'reviewed rows')}`
        : state.tr('adminBohNotProvided', 'Not provided'),
    ],
    [state.tr('adminBohTimezone', 'Timezone'), textOrFallback(submission?.timezone)],
    [
      state.tr('adminBohAvailability', 'Availability'),
      commitment.availability
        ? adminChoiceLabel(state, commitment.availability)
        : textOrFallback(''),
    ],
    [state.tr('adminBohPlayerNotes', 'Player notes'), textOrFallback(commitment.notes)],
    [
      state.tr('adminBohVtsMember', 'Plays in VTS 1097'),
      commitment.vts1097Member == null
        ? state.tr('adminBohNotProvided', 'Not provided')
        : commitment.vts1097Member
          ? state.tr('adminBohYes', 'Yes')
          : state.tr('adminBohNo', 'No'),
    ],
    [
      state.tr('adminBohContactNumber', 'Viber / WhatsApp'),
      textOrFallback(commitment.contactNumber),
    ],
    [state.tr('adminBohCurrentState', 'Current state'), textOrFallback(commitment.currentState)],
    [state.tr('adminBohJoinReason', 'Why VTS'), textOrFallback(commitment.joinReason)],
  ];
}

function heroGroupLabel(state, groupId) {
  if (groupId === 'cavalry') return state.tr('adminBohChoiceCavalry', 'Cavalry');
  if (groupId === 'archers') return state.tr('adminBohChoiceArchers', 'Archers');
  if (groupId === 'footmen') return state.tr('adminBohChoiceFootmen', 'Footmen');
  if (groupId === 'all') return state.tr('adminBohHeroGroupAll', 'All troop types');
  if (groupId === 'other') return state.tr('adminBohOtherHeroes', 'Other heroes');
  return '';
}

function renderPlanningChips(values, className = '') {
  return `<ul class="boh-admin-signal-chips ${escapeHtml(className)}">${values
    .map((value) => `<li>${escapeHtml(value)}</li>`)
    .join('')}</ul>`;
}

function renderSignupPlanningSignals(state, submission) {
  const signals = buildAdminSignupPlanningSignals(submission, state.options);
  if (!signals.hasSignals) return '';
  const heroGroups = signals.heroGroups
    .map((group) => {
      const label = heroGroupLabel(state, group.groupId);
      return `<section>
        ${label ? `<h6>${escapeHtml(label)}</h6>` : ''}
        ${renderPlanningChips(group.names, 'boh-admin-hero-chips')}
      </section>`;
    })
    .join('');
  const researchRows = signals.research
    .map((item) => {
      const valueLabel =
        item.progress === 100
          ? state.tr('adminBohMax', 'MAX')
          : `${formatNumber(state, item.progress)}%`;
      return `<li>
        <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(valueLabel)}</strong></div>
        <progress value="${item.progress}" max="100" aria-label="${escapeHtml(
          `${item.label}: ${valueLabel}`
        )}">${item.progress}%</progress>
      </li>`;
    })
    .join('');
  return `<section class="boh-admin-planning-signal" aria-labelledby="bohAdminSignupPlanningTitle">
    <header>
      <h5 id="bohAdminSignupPlanningTitle">${escapeHtml(
        state.tr('adminBohSignupPlanningSignals', 'Signup planning signals')
      )}</h5>
      <span>${escapeHtml(state.tr('adminBohPlanningSignal', 'Planning signal only'))}</span>
    </header>
    <p>${escapeHtml(
      state.tr(
        'adminBohSignupPlanningSignalsHelp',
        'Player-entered preferences for planning only. They do not change scores or lock assignments.'
      )
    )}</p>
    <div class="boh-admin-signal-compact-grid">
      ${
        signals.preferredTeammates.length
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohPreferredTeammates', 'Preferred teammates')
            )}</h6>${renderPlanningChips(signals.preferredTeammates)}</section>`
          : ''
      }
      ${
        signals.primaryRole
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohPrimaryRole', 'Primary role')
            )}</h6>${renderPlanningChips([adminChoiceLabel(state, signals.primaryRole)])}</section>`
          : ''
      }
      ${
        signals.secondaryRole
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohSecondaryRole', 'Secondary role')
            )}</h6>${renderPlanningChips([adminChoiceLabel(state, signals.secondaryRole)])}</section>`
          : ''
      }
      ${
        signals.canHelpLead
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohLeadershipInterest', 'Leadership support')
            )}</h6>${renderPlanningChips([
              state.tr('adminBohLeadershipInterestYes', 'Willing to lead or help manage'),
            ])}</section>`
          : ''
      }
      ${
        signals.fightingTimeIds.length
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohFightingTimes', 'Preferred fighting times')
            )}</h6>${renderPlanningChips(signals.fightingTimeIds)}</section>`
          : ''
      }
      ${
        signals.teamNamePreferences.length
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohTeamNamePreferences', 'Favorite team names')
            )}</h6>${renderPlanningChips(signals.teamNamePreferences)}</section>`
          : ''
      }
    </div>
    ${
      signals.usableHeroCount
        ? `<details class="boh-admin-signal-disclosure" ${
            signals.usableHeroCount <= 12 ? 'open' : ''
          }>
            <summary><span>${escapeHtml(
              state.tr('adminBohUsableHeroes', 'Usable heroes')
            )}</span><strong>${escapeHtml(
              state.tr('adminBohHeroCount', '{count} heroes', {
                count: signals.usableHeroCount,
              })
            )}</strong></summary>
            <div class="boh-admin-hero-groups">${heroGroups}</div>
          </details>`
        : ''
    }
    ${
      researchRows
        ? `<section class="boh-admin-research-progress">
            <h6>${escapeHtml(state.tr('adminBohResearchProgress', 'Research progress'))}</h6>
            <ul>${researchRows}</ul>
          </section>`
        : ''
    }
  </section>`;
}

function renderSignupDetail(state, submission) {
  const id = playerId(submission);
  const warnings = list(submission?.ocr?.warnings || submission?.ocrWarnings);
  const review = submission?.review || {};
  const reviewStatus = adapterReviewStatusToUi(review.status);
  const selected = (value) => (reviewStatus === value ? ' selected' : '');
  const correctionEntries = statEntries(state, submission).filter(({ key }) =>
    [
      'totalCastlePower',
      'troopPower',
      'buildingPower',
      'technologyPower',
      'heroCombatPower',
      'dragonPower',
    ].includes(key)
  );
  const correctionReason =
    correctionEntries
      .map(({ key }) => cleanText(review?.statCorrections?.[key]?.reason))
      .find(Boolean) || '';
  return `<aside class="boh-admin-detail" aria-labelledby="bohSignupDetailTitle">
    <header>
      <div><span>${escapeHtml(state.tr('adminBohAccountSubmission', 'PLAYER SUBMISSION'))}</span>
      <h4 id="bohSignupDetailTitle" tabindex="-1">${escapeHtml(playerName(submission) || id)}</h4></div>
      <button type="button" class="boh-admin-icon-button" data-action="close-submission" aria-label="${escapeHtml(
        state.tr('adminBohCloseReview', 'Close signup review')
      )}">×</button>
    </header>
    <dl class="boh-admin-stat-grid">
      ${statEntries(state, submission)
        .map(
          ({ label, value }) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${
              value === undefined || value === null || value === ''
                ? '—'
                : escapeHtml(formatNumber(state, value))
            }</dd></div>`
        )
        .join('')}
    </dl>
    <section class="boh-admin-card" aria-labelledby="bohAdminCorrectionsTitle">
      <details>
        <summary><h5 id="bohAdminCorrectionsTitle">${escapeHtml(
          state.tr('adminBohAdminCorrections', 'Admin corrections')
        )}</h5></summary>
        <form class="boh-admin-stack" data-form="stat-corrections">
          <input type="hidden" name="playerId" value="${escapeHtml(id)}" />
          <div class="boh-admin-weight-grid">
            ${correctionEntries
              .map(({ key, label, value }) => {
                const corrected = review?.statCorrections?.[key]?.corrected ?? value ?? '';
                const original =
                  value === undefined || value === null || value === ''
                    ? '—'
                    : formatNumber(state, value);
                return `<label><span>${escapeHtml(label)}</span>
                  <output>${escapeHtml(
                    state.tr('adminBohOriginalValue', 'Original: {value}', { value: original })
                  )}</output>
                  <input class="boh-admin-input" type="number" name="statCorrection.${escapeHtml(
                    key
                  )}" min="0" step="1" value="${escapeHtml(corrected)}" />
                </label>`;
              })
              .join('')}
          </div>
          <label><span>${escapeHtml(
            state.tr('adminBohCorrectionReason', 'Correction reason')
          )}</span>
            <textarea class="boh-admin-textarea" name="reason" rows="3" maxlength="500" required>${escapeHtml(
              correctionReason
            )}</textarea>
          </label>
          <button class="boh-admin-button" type="submit">${escapeHtml(
            state.tr('adminBohSaveCorrections', 'Save corrections')
          )}</button>
        </form>
      </details>
    </section>
    <dl class="boh-admin-stat-grid">
      ${submissionDetailEntries(state, submission)
        .map(
          ([label, value]) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
        )
        .join('')}
    </dl>
    ${renderSignupPlanningSignals(state, submission)}
    <section class="boh-admin-warning-box" data-empty="${warnings.length === 0}">
      <h5>${escapeHtml(state.tr('adminBohOcrWarnings', 'OCR review notes'))}</h5>
      ${
        warnings.length
          ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning?.message || warning)}</li>`).join('')}</ul>`
          : `<p>${escapeHtml(state.tr('adminBohNoOcrWarnings', 'No OCR warnings were reported.'))}</p>`
      }
    </section>
    <form class="boh-admin-stack" data-form="review-submission">
      <input type="hidden" name="playerId" value="${escapeHtml(id)}" />
      <label><span>${escapeHtml(state.tr('adminBohDecision', 'Decision'))}</span>
        <select class="boh-admin-select" name="status" required>
          <option value="pending"${selected('pending')}>${escapeHtml(state.tr('adminBohPendingReview', 'Pending review'))}</option>
          <option value="confirmed"${selected('confirmed')}>${escapeHtml(state.tr('adminBohConfirmValues', 'Confirm values'))}</option>
          <option value="needs_correction"${selected('needs_correction')}>${escapeHtml(state.tr('adminBohRequestCorrection', 'Request correction'))}</option>
          <option value="excluded"${selected('excluded')}>${escapeHtml(state.tr('adminBohExcludeSignup', 'Exclude from selection'))}</option>
        </select>
      </label>
      <label><span>${escapeHtml(
        state.tr('adminBohPlayerFeedback', 'Player-facing feedback')
      )}</span>
        <textarea class="boh-admin-textarea" name="note" rows="3" maxlength="500" placeholder="${escapeHtml(
          state.tr(
            'adminBohPlayerFeedbackPlaceholder',
            'Explain any correction or exclusion. The player can read this message.'
          )
        )}">${escapeHtml(review.note || '')}</textarea>
      </label>
      <label><span>${escapeHtml(
        state.tr('adminBohInternalReviewNote', 'Private leadership note')
      )}</span>
        <textarea class="boh-admin-textarea" name="internalNote" rows="3" maxlength="2000" placeholder="${escapeHtml(
          state.tr(
            'adminBohInternalReviewNotePlaceholder',
            'Optional internal context. Players never receive this note.'
          )
        )}">${escapeHtml(review.internalNote || '')}</textarea>
      </label>
      <label><span>${escapeHtml(
        state.tr('adminBohAdminUsefulness', 'Leadership usefulness rating')
      )}</span>
        <input class="boh-admin-input" type="number" name="adminUsefulnessRating" min="0" max="100" step="0.1"
          value="${escapeHtml(review?.adjustments?.bohUsefulRating ?? '')}" />
        <small>${escapeHtml(
          state.tr(
            'adminBohAdminUsefulnessHelp',
            'Admin-only 0–100 judgment. It is audited in this review and never accepted from player signup data.'
          )
        )}</small>
      </label>
      <button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
        state.tr('adminBohSaveReview', 'Save review')
      )}</button>
    </form>
  </aside>`;
}

function activeWeight(version, key) {
  const value =
    key === 'heroCombatPower'
      ? (version?.weights?.heroCombatPower ?? version?.weights?.heroPower)
      : version?.weights?.[key];
  return finiteNumber(value, defaultWeights()[key]);
}

function renderScoring(state) {
  const version = scoringVersion(state.snapshot);
  const players = currentPlayers(state).filter((player) =>
    ['confirmed', 'approved'].includes(submissionStatus(player))
  );
  const versions = state.snapshot.scoring.versions;
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageTwo', 'STAGE 2 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'scoring'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohScoringHelp',
            'Every formula change creates a new auditable version. Player overrides require a reason.'
          )
        )}</p></div>
      <div class="boh-admin-version-badge"><span>${escapeHtml(
        state.tr('adminBohActiveVersion', 'Active version')
      )}</span><strong>${escapeHtml(
        cleanText(version?.label || version?.id) || state.tr('adminBohDraft', 'Draft')
      )}</strong></div>
    </header>
    <div class="boh-admin-two-column">
      <form class="boh-admin-card boh-admin-stack" data-form="scoring-version">
        <header><div><p class="boh-admin-card-kicker">${escapeHtml(
          state.tr('adminBohFormulaBuilder', 'FORMULA BUILDER')
        )}</p><h4>${escapeHtml(state.tr('adminBohNewWeightVersion', 'Create scoring version'))}</h4></div></header>
        <div class="boh-admin-weight-grid">
          ${SCORE_COMPONENTS.map(
            ([key, translationKey, fallback]) => `<label>
              <span>${escapeHtml(state.tr(translationKey, fallback))}</span>
              <input class="boh-admin-input" type="number" name="weight.${key}" step="any"
                value="${escapeHtml(activeWeight(version, key))}" required />
            </label>`
          ).join('')}
        </div>
        <label><span>${escapeHtml(state.tr('adminBohVersionLabel', 'Version label'))}</span>
          <input class="boh-admin-input" name="label" maxlength="80" required placeholder="${escapeHtml(
            state.tr('adminBohVersionLabelPlaceholder', 'Example: 2026 selection v2')
          )}" />
        </label>
        <label><span>${escapeHtml(state.tr('adminBohChangeNote', 'Change note'))}</span>
          <textarea class="boh-admin-textarea" name="note" rows="3" maxlength="500" required></textarea>
        </label>
        <button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
          state.tr('adminBohSaveNewVersion', 'Save as new version')
        )}</button>
      </form>
      <section class="boh-admin-card" aria-labelledby="bohScoreOverrideTitle">
        <header><div><p class="boh-admin-card-kicker">${escapeHtml(
          state.tr('adminBohManualJudgment', 'MANUAL JUDGMENT')
        )}</p><h4 id="bohScoreOverrideTitle">${escapeHtml(
          state.tr('adminBohScoreOverride', 'Player score override')
        )}</h4></div></header>
        <form class="boh-admin-stack" data-form="score-override">
          <label><span>${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</span>
            <select class="boh-admin-select" name="playerId" data-action="score-override-player" required>
              <option value="">${escapeHtml(state.tr('adminBohSelectPlayer', 'Select player'))}</option>
              ${players
                .map(
                  (player) =>
                    `<option value="${escapeHtml(player.playerId)}">${escapeHtml(
                      player.displayName || player.playerId
                    )}</option>`
                )
                .join('')}
            </select>
          </label>
          <label><span>${escapeHtml(state.tr('adminBohOverrideScore', 'Override score'))}</span>
            <input class="boh-admin-input" type="number" name="score" min="0" step="1" required />
          </label>
          <label><span>${escapeHtml(state.tr('adminBohOverrideReason', 'Override reason'))}</span>
            <textarea class="boh-admin-textarea" name="reason" rows="4" maxlength="500" required></textarea>
          </label>
          <button class="boh-admin-button" type="submit">${escapeHtml(
            state.tr('adminBohSaveOverride', 'Save override')
          )}</button>
          <button class="boh-admin-button boh-admin-button-danger" type="button" data-action="remove-score-override" data-player-id="" hidden>${escapeHtml(
            state.tr('adminBohRemoveOverride', 'Remove override')
          )}</button>
        </form>
        <div class="boh-admin-version-list">
          <h5>${escapeHtml(state.tr('adminBohVersionHistory', 'Version history'))}</h5>
          ${
            versions.length
              ? `<ol>${versions
                  .map(
                    (
                      item
                    ) => `<li><strong>${escapeHtml(cleanText(item?.label || item?.id))}</strong>
                      <span>${escapeHtml(formatDate(state, item?.createdAt))}</span></li>`
                  )
                  .join('')}</ol>`
              : `<p class="boh-admin-muted">${escapeHtml(
                  state.tr('adminBohNoVersions', 'No saved scoring versions yet.')
                )}</p>`
          }
        </div>
      </section>
    </div>
    ${renderScoreBreakdown(state, players, version)}`;
}

function playerBreakdown(state, player) {
  const breakdown = player?.scoreBreakdown || player?.score?.breakdown || player?.breakdown || {};
  return SCORE_COMPONENTS.map(([key, translationKey, fallback]) => {
    const value =
      key === 'heroCombatPower'
        ? (breakdown.heroCombatPower ?? breakdown.heroPower)
        : key === 't9TroopType'
          ? (breakdown.t9TroopType ?? breakdown.t9Type)
          : key === 'readySpeedHero'
            ? (breakdown.readySpeedHero ?? breakdown.speedHero)
            : key === 'bohUsefulRating'
              ? (breakdown.bohUsefulRating ?? breakdown.bohUseful)
              : breakdown[key];
    return {
      key,
      label: state.tr(translationKey, fallback),
      value: finiteNumber(value?.points ?? value),
    };
  });
}

function renderScoreBreakdown(state, players, version) {
  return `<section class="boh-admin-card boh-admin-score-table" aria-labelledby="bohScoreBreakdownTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohScoreAudit', 'SCORE AUDIT')
    )}</p><h4 id="bohScoreBreakdownTitle">${escapeHtml(
      state.tr('adminBohPlayerBreakdown', 'Player scoring breakdown')
    )}</h4></div><span>${escapeHtml(
      cleanText(version?.label || version?.id) || state.tr('adminBohDraft', 'Draft')
    )}</span></header>
    <div class="boh-admin-table-wrap" tabindex="0"><table class="boh-admin-table">
      <thead><tr><th scope="col">${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</th>
        <th scope="col">${escapeHtml(state.tr('adminBohCalculated', 'Calculated'))}</th>
        <th scope="col">${escapeHtml(state.tr('adminBohOverride', 'Override'))}</th>
        <th scope="col">${escapeHtml(state.tr('adminBohFinalScore', 'Final score'))}</th>
        <th scope="col">${escapeHtml(state.tr('adminBohBreakdown', 'Breakdown'))}</th></tr></thead>
      <tbody>${
        players.length
          ? players
              .map((player) => {
                const breakdown = playerBreakdown(state, player)
                  .filter((item) => item.value)
                  .map((item) => `${item.label}: ${formatNumber(state, item.value)}`)
                  .join(' · ');
                return `<tr><th scope="row">${escapeHtml(player.displayName || player.playerId)}</th>
                  <td>${escapeHtml(formatNumber(state, player?.calculatedScore ?? scoreValue(player)))}</td>
                  <td>${
                    player?.overrideScore === undefined || player?.overrideScore === null
                      ? '—'
                      : escapeHtml(formatNumber(state, player.overrideScore))
                  }</td>
                  <td><strong>${escapeHtml(formatNumber(state, scoreValue(player)))}</strong></td>
                  <td class="boh-admin-breakdown-cell">${escapeHtml(breakdown || '—')}</td></tr>`;
              })
              .join('')
          : renderEmptyRow(
              state,
              5,
              'adminBohNoConfirmedScores',
              'Confirm signup records to calculate scores.'
            )
      }</tbody>
    </table></div>
  </section>`;
}

function teamScore(state, team) {
  return team.seats.reduce(
    (total, seat) => total + scoreValue(playerById(state, seat.playerId)),
    0
  );
}

function teamBalance(state) {
  const totals = state.snapshot.teams.map((team) => teamScore(state, team));
  const assigned = state.snapshot.teams
    .flatMap((team) => team.seats)
    .filter((seat) => seat.playerId).length;
  const average = totals.reduce((sum, score) => sum + score, 0) / Math.max(1, totals.length);
  return {
    totals,
    assigned,
    average,
    spread: Math.max(...totals, 0) - Math.min(...totals, 0),
  };
}

function teamBuilderCandidates(state) {
  return currentPlayers(state)
    .filter((player) => ['confirmed', 'approved'].includes(submissionStatus(player)))
    .sort(
      (left, right) =>
        scoreValue(right) - scoreValue(left) || playerName(left).localeCompare(playerName(right))
    );
}

function selectedTeamBuilderIds(state, candidates) {
  const candidateIds = new Set(candidates.map((player) => player.playerId));
  const explicit = list(state.snapshot.eligiblePlayerIds).filter((id) => candidateIds.has(id));
  if (explicit.length) return explicit;
  return candidates.slice(0, ALL_STAR_BOH_SELECTION_SIZE).map((player) => player.playerId);
}

function renderEligiblePoolPlanningHints(state, player) {
  const signals = buildAdminSignupPlanningSignals(player, state.options);
  const hints = [];
  if (signals.primaryRole) {
    hints.push(
      `${state.tr('adminBohPrimaryRole', 'Primary role')}: ${adminChoiceLabel(
        state,
        signals.primaryRole
      )}`
    );
  }
  if (signals.secondaryRole) {
    hints.push(
      `${state.tr('adminBohSecondaryRole', 'Secondary role')}: ${adminChoiceLabel(
        state,
        signals.secondaryRole
      )}`
    );
  }
  if (signals.canHelpLead) {
    hints.push(state.tr('adminBohLeadershipInterestYes', 'Willing to lead or help manage'));
  }
  if (signals.fightingTimeIds.length) hints.push(signals.fightingTimeIds.join(' / '));
  if (signals.usableHeroCount) {
    hints.push(state.tr('adminBohHeroCount', '{count} heroes', { count: signals.usableHeroCount }));
  }
  if (!hints.length) return '';
  return `<small class="boh-admin-eligible-hints">${hints
    .map((hint) => `<span>${escapeHtml(hint)}</span>`)
    .join('')}</small>`;
}

function renderEligiblePool(state, candidates, selectedIds) {
  const selected = new Set(selectedIds);
  return `<details class="boh-admin-card" open>
    <summary><strong>${escapeHtml(
      state.tr('adminBohEligiblePool', 'Eligible 72-player pool')
    )}</strong> <span>${selected.size} / ${ALL_STAR_BOH_SELECTION_SIZE}</span></summary>
    <p>${escapeHtml(
      state.tr(
        'adminBohEligiblePoolHelp',
        'Choose exactly 72 current, verified signups. Only this saved pool is used by balancing and direct seat assignment.'
      )
    )}</p>
    <form class="boh-admin-stack" data-form="eligible-pool">
      <div class="boh-admin-repeat-list">
        ${candidates
          .map(
            (player) => `<label class="boh-admin-confirm">
              <input type="checkbox" name="playerId" value="${escapeHtml(player.playerId)}" ${
                selected.has(player.playerId) ? 'checked' : ''
              } />
              <span class="boh-admin-eligible-player">
                <span>${escapeHtml(playerName(player) || player.playerId)} · ${escapeHtml(
                  formatNumber(state, scoreValue(player))
                )}</span>
                ${renderEligiblePoolPlanningHints(state, player)}
              </span>
            </label>`
          )
          .join('')}
      </div>
      <button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
        state.tr('adminBohSaveEligiblePool', 'Save eligible 72')
      )}</button>
    </form>
  </details>`;
}

function renderDirectAssignment(state, candidates, selectedIds) {
  const selected = new Set(selectedIds);
  const selectedCandidates = candidates.filter((player) => selected.has(player.playerId));
  return `<form class="boh-admin-card boh-admin-stack" data-form="direct-assignment">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohDirectAssignment', 'DIRECT ASSIGNMENT')
    )}</p><h4>${escapeHtml(
      state.tr('adminBohAssignReplaceRemove', 'Assign, replace, or remove a seat')
    )}</h4></div></header>
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohDestinationSeat', 'Destination seat'))}</span>
        <select class="boh-admin-select" name="targetSeat" required>
          <option value="">${escapeHtml(state.tr('adminBohSelectSeat', 'Select seat'))}</option>
          ${state.snapshot.teams
            .flatMap((team) =>
              team.seats.map(
                (seat) =>
                  `<option value="${escapeHtml(`${team.id}|${seat.seatNumber}`)}" ${
                    seat.locked ? 'disabled' : ''
                  }>${escapeHtml(teamDisplayName(state, team))} · ${escapeHtml(
                    state.tr('adminBohSeatNumber', 'Seat {number}', { number: seat.seatNumber })
                  )} · ${escapeHtml(seat.displayName || state.tr('adminBohEmptySeat', 'Empty'))}</option>`
              )
            )
            .join('')}
        </select>
      </label>
      <label><span>${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</span>
        <select class="boh-admin-select" name="playerId">
          <option value="">${escapeHtml(state.tr('adminBohRemoveFromSeat', 'Remove from seat'))}</option>
          ${selectedCandidates
            .map(
              (player) =>
                `<option value="${escapeHtml(player.playerId)}">${escapeHtml(
                  playerName(player) || player.playerId
                )}</option>`
            )
            .join('')}
        </select>
      </label>
    </div>
    <button class="boh-admin-button" type="submit">${escapeHtml(
      state.tr('adminBohApplyAssignment', 'Apply seat change')
    )}</button>
  </form>`;
}

function renderTeamBuilder(state) {
  const balance = teamBalance(state);
  const candidates = teamBuilderCandidates(state);
  const selectedIds = selectedTeamBuilderIds(state, candidates);
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageThree', 'STAGE 3 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'teams'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohTeamsHelp',
            'Build six teams of 12. Locked seats survive rebalance; choose a seat, then move into an empty seat or swap with an occupied seat.'
          )
        )}</p></div>
      <div class="boh-admin-stage-actions">
        <button type="button" class="boh-admin-button" data-action="clear-seat-selection" ${
          state.selectedSourceSeat ? '' : 'disabled'
        }>${escapeHtml(state.tr('adminBohCancelMove', 'Cancel move'))}</button>
        <button type="button" class="boh-admin-button boh-admin-button-primary" data-action="balance-teams">${escapeHtml(
          state.tr('adminBohBalanceTeams', 'Build balanced teams')
        )}</button>
      </div>
    </header>
    <div class="boh-admin-summary-grid">
      ${summaryCard(`${balance.assigned} / ${TEAM_COUNT * ROSTER_SIZE}`, state.tr('adminBohAssignedSeats', 'Assigned seats'))}
      ${summaryCard(formatNumber(state, balance.average), state.tr('adminBohAverageTeamScore', 'Average team score'))}
      ${summaryCard(formatNumber(state, balance.spread), state.tr('adminBohTeamSpread', 'Highest-to-lowest spread'), balance.spread ? 'warning' : 'success')}
      ${summaryCard(state.snapshot.teams.flatMap((team) => team.seats).filter((seat) => seat.locked).length, state.tr('adminBohLockedSeats', 'Locked seats'))}
    </div>
    ${renderEligiblePool(state, candidates, selectedIds)}
    ${renderDirectAssignment(state, candidates, selectedIds)}
    ${renderSeatMoveNotice(state)}
    <div class="boh-admin-team-board" aria-label="${escapeHtml(
      state.tr('adminBohSixTeamBoard', 'Six-team assignment board')
    )}">
      ${state.snapshot.teams.map((team, index) => renderTeamColumn(state, team, balance, index)).join('')}
    </div>`;
}

function renderSeatMoveNotice(state) {
  if (!state.selectedSourceSeat) return '';
  const team = state.snapshot.teams.find((item) => item.id === state.selectedSourceSeat.teamId);
  const seat = team?.seats.find((item) => item.seatNumber === state.selectedSourceSeat.seatNumber);
  return `<div class="boh-admin-move-notice" role="status">
    <strong>${escapeHtml(state.tr('adminBohMoveSelected', 'Move selected'))}:</strong>
    <span>${escapeHtml(teamDisplayName(state, team))} · ${escapeHtml(
      state.tr('adminBohSeatNumber', 'Seat {number}', { number: seat?.seatNumber || '' })
    )} · ${escapeHtml(seat?.displayName || playerName(playerById(state, seat?.playerId)) || '—')}</span>
    <span>${escapeHtml(
      state.tr('adminBohChooseDestination', 'Choose another unlocked seat to move or swap.')
    )}</span>
  </div>`;
}

function renderTeamColumn(state, team, balance, index) {
  const score = balance.totals[index];
  const difference = score - balance.average;
  const assigned = team.seats.filter((seat) => seat.playerId).length;
  return `<section class="boh-admin-team" aria-labelledby="bohTeamTitle-${team.number}">
    <header style="--boh-team-color:${escapeHtml(team.color || '#7dd3fc')}">
      <div><span>${escapeHtml(state.tr('adminBohTeamNumber', 'TEAM {number}', { number: team.number }))}</span>
        <h4 id="bohTeamTitle-${team.number}">${escapeHtml(teamDisplayName(state, team))}</h4></div>
      <div class="boh-admin-team-score"><strong>${escapeHtml(formatNumber(state, score))}</strong>
        <span>${difference >= 0 ? '+' : ''}${escapeHtml(formatNumber(state, difference))} ${escapeHtml(
          state.tr('adminBohVsAverage', 'vs avg')
        )}</span></div>
    </header>
    <form class="boh-admin-stack" data-form="team-metadata">
      <input type="hidden" name="teamId" value="${escapeHtml(team.id)}" />
      <div class="boh-admin-field-pair">
        <label><span>${escapeHtml(state.tr('adminBohTeamName', 'Team name'))}</span>
          <input class="boh-admin-input" name="name" maxlength="160" value="${escapeHtml(
            team.name
          )}" required /></label>
        <label><span>${escapeHtml(state.tr('adminBohTeamColor', 'Team color'))}</span>
          <input class="boh-admin-input" type="color" name="color" value="${escapeHtml(
            /^#[0-9a-f]{6}$/i.test(team.color) ? team.color : '#7dd3fc'
          )}" required /></label>
      </div>
      <label><span>${escapeHtml(state.tr('adminBohCaptain', 'Captain'))}</span>
        <select class="boh-admin-select" name="captainId">
          <option value="">${escapeHtml(state.tr('adminBohSelectCaptain', 'Select captain'))}</option>
          ${team.seats
            .filter((seat) => seat.playerId)
            .map(
              (seat) =>
                `<option value="${escapeHtml(seat.playerId)}" ${
                  seat.playerId === team.captainId ? 'selected' : ''
                }>${escapeHtml(seat.displayName || playerName(playerById(state, seat.playerId)))}</option>`
            )
            .join('')}
        </select>
      </label>
      <label><span>${escapeHtml(state.tr('adminBohTeamNotes', 'Admin team notes'))}</span>
        <textarea class="boh-admin-textarea" name="notes" rows="2" maxlength="2000">${escapeHtml(
          team.notes || ''
        )}</textarea>
      </label>
      <button class="boh-admin-button boh-admin-button-small" type="submit">${escapeHtml(
        state.tr('adminBohSaveTeamMetadata', 'Save team details')
      )}</button>
    </form>
    <div class="boh-admin-team-meter" aria-label="${escapeHtml(
      state.tr('adminBohTeamSeatsFilled', '{assigned} of 12 seats filled', { assigned })
    )}"><span style="width:${clamp((assigned / ROSTER_SIZE) * 100, 0, 100)}%"></span></div>
    <ol class="boh-admin-seat-list">
      ${team.seats.map((seat) => renderSeat(state, team, seat)).join('')}
    </ol>
  </section>`;
}

function renderSeat(state, team, seat) {
  const player = playerById(state, seat.playerId);
  const occupied = Boolean(seat.playerId);
  const selected =
    state.selectedSourceSeat?.teamId === team.id &&
    state.selectedSourceSeat?.seatNumber === seat.seatNumber;
  const sourceSelected = Boolean(state.selectedSourceSeat);
  const destinationDisabled = selected || seat.locked;
  const role = state.snapshot.plan.roleGroups.find((item) => item.id === seat.roleGroupId);
  return `<li class="boh-admin-seat" data-occupied="${occupied}" data-locked="${seat.locked}" data-selected="${selected}">
    <span class="boh-admin-seat-number">${seat.seatNumber}</span>
    <button type="button" class="boh-admin-seat-main" data-action="${
      sourceSelected ? 'move-seat-here' : 'select-seat'
    }" data-team-id="${escapeHtml(team.id)}" data-seat-number="${seat.seatNumber}"
      ${sourceSelected && destinationDisabled ? 'disabled' : ''}
      aria-pressed="${selected}" aria-label="${escapeHtml(
        sourceSelected
          ? state.tr(
              occupied ? 'adminBohSwapHereLabel' : 'adminBohMoveHereLabel',
              occupied ? 'Swap with {player}' : 'Move to empty seat {seat}',
              {
                player: seat.displayName || playerName(player) || '',
                seat: seat.seatNumber,
              }
            )
          : state.tr('adminBohSelectSeatLabel', 'Select seat {seat}: {player}', {
              seat: seat.seatNumber,
              player:
                seat.displayName || playerName(player) || state.tr('adminBohEmptySeat', 'Empty'),
            })
      )}">
      <strong>${escapeHtml(seat.displayName || playerName(player) || state.tr('adminBohEmptySeat', 'Empty seat'))}</strong>
      <small>${escapeHtml(
        roleDisplayName(state, role) || state.tr('adminBohRoleUnassigned', 'Role unassigned')
      )}</small>
    </button>
    <button type="button" class="boh-admin-lock-button" data-action="toggle-seat-lock"
      data-team-id="${escapeHtml(team.id)}" data-seat-number="${seat.seatNumber}"
      aria-pressed="${seat.locked}" aria-label="${escapeHtml(
        state.tr(
          seat.locked ? 'adminBohUnlockSeat' : 'adminBohLockSeat',
          seat.locked ? 'Unlock seat {seat}' : 'Lock seat {seat}',
          {
            seat: seat.seatNumber,
          }
        )
      )}">${seat.locked ? '🔒' : '○'}</button>
  </li>`;
}

function renderPlans(state) {
  const phases = state.snapshot.plan.phases;
  const legions = state.snapshot.plan.legions;
  const selectedTeam =
    state.snapshot.teams.find((team) => team.id === state.planTeamId) || state.snapshot.teams[0];
  const selectedPhase = phases.find((phase) => phase.id === state.planPhaseId) || phases[0];
  const selectedLegion = legions.find((legion) => legion.id === state.planLegionId) || legions[0];
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageFour', 'STAGE 4 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'plans'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohPlansHelp',
            'Set role capacity, four timed phases, Legion-specific defaults, seat overrides, rotations, and schematic objectives.'
          )
        )}</p></div>
    </header>
    <div class="boh-admin-plan-config">
      ${renderRoleConfiguration(state)}
      ${renderPhaseConfiguration(state)}
    </div>
    ${renderPlanTemplateTools(state, selectedTeam, selectedPhase, selectedLegion)}
    <section class="boh-admin-card boh-admin-plan-editor" aria-labelledby="bohPlanEditorTitle">
      <header><div><p class="boh-admin-card-kicker">${escapeHtml(
        state.tr('adminBohInstructionAuthoring', 'INSTRUCTION AUTHORING')
      )}</p><h4 id="bohPlanEditorTitle">${escapeHtml(
        state.tr('adminBohPlanMatrix', 'Team plan matrix')
      )}</h4></div></header>
      <div class="boh-admin-plan-context">
        <label><span>${escapeHtml(state.tr('adminBohTeam', 'Team'))}</span>
          <select class="boh-admin-select" data-plan-filter="team">${state.snapshot.teams
            .map(
              (team) =>
                `<option value="${escapeHtml(team.id)}" ${team.id === selectedTeam?.id ? 'selected' : ''}>${escapeHtml(
                  teamDisplayName(state, team)
                )}</option>`
            )
            .join('')}</select></label>
        <label><span>${escapeHtml(state.tr('adminBohPhase', 'Phase'))}</span>
          <select class="boh-admin-select" data-plan-filter="phase">${phases
            .map(
              (phase) =>
                `<option value="${escapeHtml(phase.id)}" ${phase.id === selectedPhase?.id ? 'selected' : ''}>${escapeHtml(
                  phaseDisplayName(state, phase)
                )}</option>`
            )
            .join('')}</select></label>
        <label><span>${escapeHtml(state.tr('adminBohLegion', 'Legion'))}</span>
          <select class="boh-admin-select" data-plan-filter="legion">${legions
            .map(
              (legion) =>
                `<option value="${escapeHtml(legion.id)}" ${legion.id === selectedLegion?.id ? 'selected' : ''}>${escapeHtml(
                  legionDisplayName(state, legion)
                )}</option>`
            )
            .join('')}</select></label>
        <fieldset class="boh-admin-segmented"><legend>${escapeHtml(
          state.tr('adminBohInstructionScope', 'Instruction scope')
        )}</legend>
          <button type="button" data-action="plan-scope" data-scope="global" aria-pressed="${state.planScope === 'global'}">${escapeHtml(
            state.tr('adminBohGlobal', 'Global')
          )}</button>
          <button type="button" data-action="plan-scope" data-scope="role" aria-pressed="${state.planScope === 'role'}">${escapeHtml(
            state.tr('adminBohGroupDefault', 'Role default')
          )}</button>
          <button type="button" data-action="plan-scope" data-scope="seat" aria-pressed="${state.planScope === 'seat'}">${escapeHtml(
            state.tr('adminBohSeatOverride', 'Seat override')
          )}</button>
          <button type="button" data-action="plan-scope" data-scope="player" aria-pressed="${state.planScope === 'player'}">${escapeHtml(
            state.tr('adminBohPlayer', 'Player')
          )}</button>
        </fieldset>
      </div>
      <div class="boh-admin-plan-workspace">
        ${renderInstructionForm(state, selectedTeam, selectedPhase, selectedLegion)}
        ${renderInstructionSummary(state, selectedTeam, selectedPhase, selectedLegion)}
      </div>
      ${renderRotationEditor(state, selectedTeam, selectedPhase, selectedLegion)}
    </section>
    ${renderMapEditor(state, selectedPhase, selectedLegion)}`;
}

function renderPlanTemplateTools(state, selectedTeam, selectedPhase, selectedLegion) {
  const targetTeams = state.snapshot.teams.filter((team) => team.id !== selectedTeam?.id);
  const targetPhases = state.snapshot.plan.phases.filter((phase) => phase.id !== selectedPhase?.id);
  const targetLegions = state.snapshot.plan.legions.filter(
    (legion) => legion.id !== selectedLegion?.id
  );
  return `<section class="boh-admin-card boh-admin-template-tools" aria-labelledby="bohTemplateToolsTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohSafeTemplates', 'SAFE TEMPLATE TOOLS')
    )}</p><h4 id="bohTemplateToolsTitle">${escapeHtml(
      state.tr('adminBohReusePlanStructure', 'Reuse plan structure without copying players')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohTemplatePrivacy',
        'Template actions copy instructions or structure only. Team assignments, legacy player names, signup data, and scores never move with them.'
      )
    )}</p></div>
      <button type="button" class="boh-admin-button" data-action="start-legacy-structure">${escapeHtml(
        state.tr('adminBohStartLegacyStructure', 'Start from last-year structure')
      )}</button>
    </header>
    <div class="boh-admin-template-grid">
      <form data-form="copy-phase-template">
        <strong>${escapeHtml(state.tr('adminBohCopyPhaseTemplate', 'Copy phase template'))}</strong>
        <span>${escapeHtml(phaseDisplayName(state, selectedPhase))}</span>
        <label><span>${escapeHtml(state.tr('adminBohCopyTo', 'Copy to'))}</span>
          <select class="boh-admin-select" name="targetPhaseId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectPhase', 'Select phase'))}</option>
            ${targetPhases
              .map(
                (phase) =>
                  `<option value="${escapeHtml(phase.id)}">${escapeHtml(
                    phaseDisplayName(state, phase)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button" type="submit" ${targetPhases.length ? '' : 'disabled'}>${escapeHtml(
          state.tr('adminBohCopyPhase', 'Copy phase')
        )}</button>
      </form>
      <form data-form="copy-team-plan">
        <strong>${escapeHtml(state.tr('adminBohCopyTeamPlan', 'Copy team plan'))}</strong>
        <span>${escapeHtml(teamDisplayName(state, selectedTeam))}</span>
        <label><span>${escapeHtml(state.tr('adminBohCopyTo', 'Copy to'))}</span>
          <select class="boh-admin-select" name="targetTeamId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectTeam', 'Select team'))}</option>
            ${targetTeams
              .map(
                (team) =>
                  `<option value="${escapeHtml(team.id)}">${escapeHtml(
                    teamDisplayName(state, team)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button" type="submit" ${targetTeams.length ? '' : 'disabled'}>${escapeHtml(
          state.tr('adminBohCopyTeam', 'Copy team')
        )}</button>
      </form>
      <form data-form="copy-legion-plan">
        <strong>${escapeHtml(state.tr('adminBohCopyLegionPlan', 'Copy Legion plan'))}</strong>
        <span>${escapeHtml(legionDisplayName(state, selectedLegion))}</span>
        <label><span>${escapeHtml(state.tr('adminBohCopyTo', 'Copy to'))}</span>
          <select class="boh-admin-select" name="targetLegionId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectLegion', 'Select Legion'))}</option>
            ${targetLegions
              .map(
                (legion) =>
                  `<option value="${escapeHtml(legion.id)}">${escapeHtml(
                    legionDisplayName(state, legion)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button" type="submit" ${targetLegions.length ? '' : 'disabled'}>${escapeHtml(
          state.tr('adminBohCopyLegion', 'Copy Legion')
        )}</button>
      </form>
      <form data-form="apply-role-default">
        <strong>${escapeHtml(state.tr('adminBohApplyRoleDefault', 'Apply role default'))}</strong>
        <label><span>${escapeHtml(state.tr('adminBohRoleGroup', 'Role group'))}</span>
          <select class="boh-admin-select" name="roleGroupId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectRole', 'Select role'))}</option>
            ${state.snapshot.plan.roleGroups
              .map(
                (role) =>
                  `<option value="${escapeHtml(role.id)}">${escapeHtml(
                    roleDisplayName(state, role)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <label><span>${escapeHtml(state.tr('adminBohSeat', 'Seat'))}</span>
          <select class="boh-admin-select" name="seatNumber" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectSeat', 'Select seat'))}</option>
            ${selectedTeam?.seats
              .map(
                (seat) =>
                  `<option value="${seat.seatNumber}">${escapeHtml(
                    state.tr('adminBohSeatPlayer', 'Seat {seat} · {player}', {
                      seat: seat.seatNumber,
                      player:
                        seat.displayName ||
                        playerName(playerById(state, seat.playerId)) ||
                        state.tr('adminBohEmptySeat', 'Empty'),
                    })
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button" type="submit">${escapeHtml(
          state.tr('adminBohApplyDefault', 'Apply default')
        )}</button>
      </form>
    </div>
    <p class="boh-admin-template-warning"><strong>${escapeHtml(
      state.tr('adminBohLegacyIs15Seats', 'Legacy plan warning:')
    )}</strong> ${escapeHtml(
      state.tr(
        'adminBohLegacySafeCopy',
        'Last year used 15 seats. This action copies only the four phase timings and objective codes. It will not import role capacities or player assignments into the 12-seat format.'
      )
    )}</p>
  </section>`;
}

function roleDrafts(state) {
  if (!state.roleDrafts)
    state.roleDrafts = state.snapshot.plan.roleGroups.map((role) => ({ ...role }));
  return state.roleDrafts;
}

function phaseDrafts(state) {
  if (!state.phaseDrafts)
    state.phaseDrafts = state.snapshot.plan.phases.map((phase) => ({ ...phase }));
  return state.phaseDrafts;
}

function renderRoleConfiguration(state) {
  const roles = roleDrafts(state);
  const capacity = roles.reduce((total, role) => total + Math.max(0, integer(role.capacity)), 0);
  return `<form class="boh-admin-card boh-admin-config-card" data-form="role-groups">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohRoleStructure', 'ROLE STRUCTURE')
    )}</p><h4>${escapeHtml(state.tr('adminBohRoleCapacity', 'Role groups and capacity'))}</h4></div>
      <span class="boh-admin-capacity" data-valid="${capacity === ROSTER_SIZE}">${escapeHtml(
        state.tr('adminBohCapacityCount', '{count} / 12 seats', { count: capacity })
      )}</span></header>
    <div class="boh-admin-repeat-list">
      ${roles
        .map(
          (role, index) => `<div class="boh-admin-repeat-row">
            <input type="hidden" name="roleId" value="${escapeHtml(role.id)}" />
            <label><span>${escapeHtml(state.tr('adminBohRoleName', 'Role name'))}</span>
              <input class="boh-admin-input" name="roleLabel" value="${escapeHtml(
                roleDisplayName(state, role)
              )}" maxlength="60" required /></label>
            <label><span>${escapeHtml(state.tr('adminBohCapacity', 'Capacity'))}</span>
              <input class="boh-admin-input" name="roleCapacity" value="${role.capacity}" type="number" min="0" max="12" required /></label>
            <label><span>${escapeHtml(state.tr('adminBohColor', 'Color'))}</span>
              <input class="boh-admin-color" name="roleColor" value="${escapeHtml(role.color)}" type="color" /></label>
            <button type="button" class="boh-admin-icon-button" data-action="remove-role" data-role-index="${index}" aria-label="${escapeHtml(
              state.tr('adminBohRemoveRole', 'Remove {role}', {
                role: roleDisplayName(state, role),
              })
            )}" ${roles.length === 1 ? 'disabled' : ''}>×</button>
          </div>`
        )
        .join('')}
    </div>
    <footer><button type="button" class="boh-admin-button" data-action="add-role">${escapeHtml(
      state.tr('adminBohAddRole', 'Add role')
    )}</button><button type="submit" class="boh-admin-button boh-admin-button-primary" ${
      capacity === ROSTER_SIZE ? '' : 'disabled'
    }>${escapeHtml(state.tr('adminBohSaveRoles', 'Save role structure'))}</button></footer>
  </form>`;
}

function renderPhaseConfiguration(state) {
  const phases = phaseDrafts(state);
  return `<form class="boh-admin-card boh-admin-config-card" data-form="phases">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohTimeline', 'MATCH TIMELINE')
    )}</p><h4>${escapeHtml(state.tr('adminBohFourPhases', 'Four timed phases'))}</h4></div>
      <span class="boh-admin-capacity" data-valid="${phases.length === 4}">${escapeHtml(
        state.tr('adminBohPhaseCount', '{count} / 4 phases', { count: phases.length })
      )}</span></header>
    <div class="boh-admin-phase-grid">
      ${phases
        .map(
          (phase) => `<fieldset><legend>${escapeHtml(phaseDisplayName(state, phase))}</legend>
            <input type="hidden" name="phaseId" value="${escapeHtml(phase.id)}" />
            <label><span>${escapeHtml(state.tr('adminBohPhaseLabel', 'Label'))}</span>
              <input class="boh-admin-input" name="phaseLabel" value="${escapeHtml(
                phaseDisplayName(state, phase)
              )}" maxlength="40" required /></label>
            <div><label><span>${escapeHtml(state.tr('adminBohStartMinute', 'Start'))}</span>
              <input class="boh-admin-input" name="phaseStart" type="number" min="0" max="120" value="${phase.startMinute}" required /></label>
            <label><span>${escapeHtml(state.tr('adminBohEndMinute', 'End'))}</span>
              <input class="boh-admin-input" name="phaseEnd" type="number" min="0" max="120" value="${phase.endMinute}" required /></label></div>
          </fieldset>`
        )
        .join('')}
    </div>
    <footer><span>${escapeHtml(
      state.tr('adminBohPhaseRule', 'Phases must be ordered and non-overlapping.')
    )}</span><button type="submit" class="boh-admin-button boh-admin-button-primary">${escapeHtml(
      state.tr('adminBohSaveTimeline', 'Save timeline')
    )}</button></footer>
  </form>`;
}

function renderInstructionForm(state, team, phase, legion) {
  const roles = state.snapshot.plan.roleGroups;
  const objectives = state.snapshot.plan.objectives;
  const scope = ['global', 'role', 'seat', 'player'].includes(state.planScope)
    ? state.planScope
    : 'role';
  const objectiveOptions = objectives
    .map(
      (objective) =>
        `<option value="${escapeHtml(objective.id)}">${escapeHtml(
          cleanText(objective.code || objective.label || objective.id)
        )}</option>`
    )
    .join('');
  return `<form class="boh-admin-stack boh-admin-instruction-form" data-form="instruction">
    <input type="hidden" name="teamId" value="${escapeHtml(team?.id)}" />
    <input type="hidden" name="phaseId" value="${escapeHtml(phase?.id)}" />
    <input type="hidden" name="legionId" value="${escapeHtml(legion?.id)}" />
    <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
    ${
      scope === 'global'
        ? `<input type="hidden" name="scopeId" value="*" />`
        : `<label><span>${escapeHtml(
            scope === 'role'
              ? state.tr('adminBohRoleGroup', 'Role group')
              : scope === 'seat'
                ? state.tr('adminBohSeat', 'Seat')
                : state.tr('adminBohPlayer', 'Player')
          )}</span>
            <select class="boh-admin-select" name="scopeId" required>
              <option value="">${escapeHtml(
                scope === 'role'
                  ? state.tr('adminBohSelectRole', 'Select role')
                  : scope === 'seat'
                    ? state.tr('adminBohSelectSeat', 'Select seat')
                    : state.tr('adminBohSelectPlayer', 'Select player')
              )}</option>
              ${
                scope === 'role'
                  ? roles
                      .map(
                        (role) =>
                          `<option value="${escapeHtml(role.id)}">${escapeHtml(
                            roleDisplayName(state, role)
                          )}</option>`
                      )
                      .join('')
                  : scope === 'seat'
                    ? list(team?.seats)
                        .map(
                          (seat) =>
                            `<option value="${seat.seatNumber}">${escapeHtml(
                              state.tr('adminBohSeatPlayer', 'Seat {seat} · {player}', {
                                seat: seat.seatNumber,
                                player:
                                  seat.displayName ||
                                  playerName(playerById(state, seat.playerId)) ||
                                  state.tr('adminBohEmptySeat', 'Empty'),
                              })
                            )}</option>`
                        )
                        .join('')
                    : list(team?.seats)
                        .filter((seat) => seat.playerId)
                        .map(
                          (seat) =>
                            `<option value="${escapeHtml(seat.playerId)}">${escapeHtml(
                              seat.displayName ||
                                playerName(playerById(state, seat.playerId)) ||
                                seat.playerId
                            )}</option>`
                        )
                        .join('')
              }
            </select>
          </label>`
    }
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohAction', 'Action'))}</span>
        <input class="boh-admin-input" name="action" maxlength="100" required placeholder="${escapeHtml(
          state.tr('adminBohActionPlaceholder', 'Build, capture, defend, attack…')
        )}" /></label>
      <label><span>${escapeHtml(state.tr('adminBohTargetObjective', 'Target objective'))}</span>
        <select class="boh-admin-select" name="objectiveId"><option value="">${escapeHtml(
          state.tr('adminBohNoObjective', 'No mapped objective')
        )}</option>${objectiveOptions}</select></label>
    </div>
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohStartObjective', 'Start objective'))}</span>
        <select class="boh-admin-select" name="startObjectiveId"><option value="">${escapeHtml(
          state.tr('adminBohNoObjective', 'No mapped objective')
        )}</option>${objectiveOptions}</select></label>
      <label><span>${escapeHtml(state.tr('adminBohViaObjectives', 'Via objectives'))}</span>
        <select class="boh-admin-select" name="viaObjectiveIds" multiple size="${Math.min(
          4,
          Math.max(2, objectives.length)
        )}">${objectiveOptions}</select></label>
    </div>
    <label><span>${escapeHtml(state.tr('adminBohRoutePath', 'Ordered route path IDs'))}</span>
      <input class="boh-admin-input" name="pathObjectiveIds" maxlength="800" placeholder="${escapeHtml(
        state.tr('adminBohRoutePathPlaceholder', 'Example: CC2, T3, FH1')
      )}" />
      <small>${escapeHtml(
        state.tr(
          'adminBohRoutePathHelp',
          'Codes or IDs are resolved to map anchors and merged in this order: Start, Via, ordered path, Target.'
        )
      )}</small>
    </label>
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohLoadout', 'Troops / heroes'))}</span>
        <input class="boh-admin-input" name="loadout" maxlength="100" placeholder="${escapeHtml(
          state.tr('adminBohLoadoutPlaceholder', 'T1s, T9s, speed heroes…')
        )}" /></label>
      <label><span>${escapeHtml(state.tr('adminBohTeleport', 'Teleport instruction'))}</span>
        <input class="boh-admin-input" name="teleport" maxlength="120" placeholder="${escapeHtml(
          state.tr('adminBohTeleportPlaceholder', 'No teleport or destination')
        )}" /></label>
    </div>
    <label><span>${escapeHtml(state.tr('adminBohPlayerInstruction', 'Player-facing instruction'))}</span>
      <textarea class="boh-admin-textarea" name="instruction" rows="4" maxlength="800" required></textarea></label>
    <label><span>${escapeHtml(state.tr('adminBohChangeNote', 'Plan note'))}</span>
      <textarea class="boh-admin-textarea" name="note" rows="2" maxlength="800"></textarea></label>
    <button type="submit" class="boh-admin-button boh-admin-button-primary">${escapeHtml(
      state.tr('adminBohSaveInstruction', 'Save instruction')
    )}</button>
  </form>`;
}

function matchingInstructions(state, team, phase, legion) {
  return state.snapshot.plan.instructions.filter(
    (item) =>
      (!item.teamId || item.teamId === '*' || item.teamId === team?.id) &&
      (!item.phaseId || item.phaseId === '*' || item.phaseId === phase?.id) &&
      (!item.legionId || item.legionId === '*' || item.legionId === legion?.id)
  );
}

function renderInstructionSummary(state, team, phase, legion) {
  const instructions = matchingInstructions(state, team, phase, legion);
  return `<section class="boh-admin-instruction-summary" aria-labelledby="bohInstructionSummaryTitle">
    <header><h5 id="bohInstructionSummaryTitle">${escapeHtml(
      state.tr('adminBohCurrentInstructions', 'Current instructions')
    )}</h5><span>${escapeHtml(phaseDisplayName(state, phase))} · ${escapeHtml(
      legionDisplayName(state, legion)
    )}</span></header>
    ${
      instructions.length
        ? `<ol>${instructions
            .map((item) => {
              const role = state.snapshot.plan.roleGroups.find(
                (candidate) => candidate.id === (item.roleGroupId || item.scopeId)
              );
              const scope =
                item.scope === 'seat' || item.seatNumber
                  ? state.tr('adminBohSeatNumber', 'Seat {number}', {
                      number: item.seatNumber || item.scopeId,
                    })
                  : item.scope === 'player' || item.playerId
                    ? playerName(playerById(state, item.playerId || item.scopeId)) ||
                      item.playerId ||
                      item.scopeId
                    : roleDisplayName(state, role) ||
                      (item.scope === 'global' || item.scopeId === '*'
                        ? state.tr('adminBohGlobal', 'Global')
                        : item.scopeId);
              return `<li><div><strong>${escapeHtml(scope)}</strong><span>${escapeHtml(
                cleanText(item.action || item.instruction)
              )}</span><small>${escapeHtml(
                [
                  item.startObjectiveId,
                  ...list(item.viaObjectiveIds),
                  ...list(item.pathObjectiveIds),
                  item.objectiveCode || item.objectiveId,
                  item.loadout,
                  item.teleport,
                  item.note,
                ]
                  .filter(Boolean)
                  .join(' · ')
              )}</small></div><button type="button" class="boh-admin-icon-button" data-action="remove-instruction" data-instruction-id="${escapeHtml(
                item.id
              )}" aria-label="${escapeHtml(state.tr('adminBohRemoveInstruction', 'Remove instruction'))}">×</button></li>`;
            })
            .join('')}</ol>`
        : `<p class="boh-admin-empty-panel">${escapeHtml(
            state.tr(
              'adminBohNoInstructions',
              'No instructions exist for this phase and Legion yet.'
            )
          )}</p>`
    }
  </section>`;
}

function renderRotationEditor(state, team, phase, legion) {
  const rotations = state.snapshot.plan.rotations.filter(
    (rotation) =>
      rotation.teamId === team?.id &&
      rotation.phaseId === phase?.id &&
      rotation.legionId === legion?.id
  );
  const draft = rotations.find((rotation) => rotation.id === state.rotationDraftId) || null;
  const sourceSeatNumber =
    team?.seats.find((seat) => seat.playerId && seat.playerId === draft?.playerId)?.seatNumber ||
    '';
  return `<form class="boh-admin-rotation" data-form="rotation">
    <div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohRoleRotation', 'ROLE ROTATION')
    )}</p><h5>${escapeHtml(state.tr('adminBohRotateAtPhase', 'Change a seat’s role at this phase'))}</h5></div>
    <input type="hidden" name="teamId" value="${escapeHtml(team?.id)}" />
    <input type="hidden" name="phaseId" value="${escapeHtml(phase?.id)}" />
    <input type="hidden" name="legionId" value="${escapeHtml(legion?.id)}" />
    <input type="hidden" name="rotationId" value="${escapeHtml(draft?.id || '')}" />
    <label><span>${escapeHtml(state.tr('adminBohRotationPlayerSeat', 'Player’s current seat'))}</span><select class="boh-admin-select" name="sourceSeatNumber" required>
      ${team?.seats.map((seat) => `<option value="${seat.seatNumber}" ${sourceSeatNumber === seat.seatNumber ? 'selected' : ''} ${seat.playerId ? '' : 'disabled'}>${seat.seatNumber} · ${escapeHtml(seat.displayName || playerName(playerById(state, seat.playerId)) || state.tr('adminBohEmptySeat', 'Empty'))}</option>`).join('')}
    </select></label>
    <label><span>${escapeHtml(state.tr('adminBohRotationDestination', 'Destination seat / role'))}</span><select class="boh-admin-select" name="targetSeatNumber" required>
      ${team?.seats
        .map((seat) => {
          const role = state.snapshot.plan.roleGroups.find(
            (candidate) => candidate.id === seat.roleGroupId
          );
          return `<option value="${seat.seatNumber}" ${draft?.seatNumber === seat.seatNumber ? 'selected' : ''}>${seat.seatNumber} · ${escapeHtml(
            roleDisplayName(state, role) || state.tr('adminBohRoleUnassigned', 'Role unassigned')
          )}</option>`;
        })
        .join('')}
    </select></label>
    <label><span>${escapeHtml(state.tr('adminBohChangeNote', 'Plan note'))}</span>
      <textarea class="boh-admin-textarea" name="note" rows="2" maxlength="800">${escapeHtml(draft?.note || '')}</textarea></label>
    ${
      rotations.length
        ? `<ol class="boh-admin-rotation-list">${rotations
            .map((rotation) => {
              const player = playerById(state, rotation.playerId);
              const target = team?.seats.find((seat) => seat.seatNumber === rotation.seatNumber);
              const targetRole = state.snapshot.plan.roleGroups.find(
                (role) => role.id === target?.roleGroupId
              );
              return `<li><span>${escapeHtml(playerName(player) || rotation.playerId)} → ${escapeHtml(
                roleDisplayName(state, targetRole) || String(rotation.seatNumber)
              )}</span><span><button type="button" class="boh-admin-button boh-admin-button-small" data-action="edit-rotation" data-rotation-id="${escapeHtml(
                rotation.id
              )}">${escapeHtml(state.tr('adminBohRoleRotation', 'Edit rotation'))}</button><button type="button" class="boh-admin-icon-button" data-action="remove-rotation" data-rotation-id="${escapeHtml(
                rotation.id
              )}" aria-label="${escapeHtml(
                state.tr('adminBohRemoveInstruction', 'Remove rotation')
              )}">×</button></span></li>`;
            })
            .join('')}</ol>`
        : ''
    }
    ${
      draft
        ? `<button class="boh-admin-button" type="button" data-action="cancel-rotation">${escapeHtml(
            state.tr('adminBohCancelMove', 'Cancel')
          )}</button>`
        : ''
    }
    <button class="boh-admin-button" type="submit">${escapeHtml(
      state.tr('adminBohSaveRotation', 'Save rotation')
    )}</button>
  </form>`;
}

function objectiveDraft(state) {
  return (
    state.snapshot.plan.objectives.find((objective) => objective.id === state.objectiveDraftId) || {
      id: '',
      code: '',
      label: '',
      x: 50,
      y: 50,
      type: 'objective',
    }
  );
}

function renderMapEditor(state, phase, legion) {
  const objectives = state.snapshot.plan.objectives;
  const draft = objectiveDraft(state);
  return `<section class="boh-admin-card boh-admin-map-card" aria-labelledby="bohMapEditorTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohSchematicMap', 'SCHEMATIC MAP')
    )}</p><h4 id="bohMapEditorTitle">${escapeHtml(
      state.tr('adminBohObjectiveEditor', 'Objective and route anchors')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohMapHelp',
        'Place labeled anchors on a neutral schematic. A future arena image can sit beneath the same coordinates without changing plan data.'
      )
    )}</p></div><span>${escapeHtml(phaseDisplayName(state, phase))} · ${escapeHtml(
      legionDisplayName(state, legion)
    )}</span></header>
    <div class="boh-admin-map-layout">
      <div class="boh-admin-map" role="img" aria-label="${escapeHtml(
        state.tr('adminBohMapAria', 'Editable schematic objective map')
      )}">
        <span class="boh-admin-map-axis" data-axis="x" aria-hidden="true"></span>
        <span class="boh-admin-map-axis" data-axis="y" aria-hidden="true"></span>
        ${objectives
          .map(
            (objective) =>
              `<button type="button" class="boh-admin-map-node" data-action="edit-objective" data-objective-id="${escapeHtml(
                objective.id
              )}" style="--boh-x:${clamp(objective.x, 0, 100)}%;--boh-y:${clamp(objective.y, 0, 100)}%" aria-label="${escapeHtml(
                state.tr('adminBohEditObjectiveLabel', 'Edit objective {objective}', {
                  objective: cleanText(objective.code || objective.label || objective.id),
                })
              )}"><strong>${escapeHtml(cleanText(objective.code || objective.label || '?'))}</strong><span>${escapeHtml(
                cleanText(objective.label)
              )}</span></button>`
          )
          .join('')}
        ${
          objectives.length
            ? ''
            : `<p class="boh-admin-map-empty">${escapeHtml(
                state.tr('adminBohNoObjectives', 'Add objective anchors to start the schematic.')
              )}</p>`
        }
      </div>
      <form class="boh-admin-stack boh-admin-objective-form" data-form="objective">
        <input type="hidden" name="id" value="${escapeHtml(draft.id)}" />
        <div class="boh-admin-field-pair"><label><span>${escapeHtml(
          state.tr('adminBohObjectiveCode', 'Code')
        )}</span><input class="boh-admin-input" name="code" value="${escapeHtml(draft.code)}" maxlength="20" required placeholder="CC1" /></label>
        <label><span>${escapeHtml(state.tr('adminBohObjectiveLabel', 'Label'))}</span><input class="boh-admin-input" name="label" value="${escapeHtml(
          draft.label
        )}" maxlength="80" required /></label></div>
        <div class="boh-admin-field-pair"><label><span>${escapeHtml(
          state.tr('adminBohHorizontalPosition', 'Horizontal %')
        )}</span><input class="boh-admin-input" name="x" type="number" min="0" max="100" value="${clamp(
          draft.x,
          0,
          100
        )}" required /></label><label><span>${escapeHtml(
          state.tr('adminBohVerticalPosition', 'Vertical %')
        )}</span><input class="boh-admin-input" name="y" type="number" min="0" max="100" value="${clamp(
          draft.y,
          0,
          100
        )}" required /></label></div>
        <div class="boh-admin-form-actions"><button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
          state.tr(
            draft.id ? 'adminBohUpdateObjective' : 'adminBohAddObjective',
            draft.id ? 'Update objective' : 'Add objective'
          )
        )}</button>${
          draft.id
            ? `<button class="boh-admin-button boh-admin-button-danger" type="button" data-action="remove-objective" data-objective-id="${escapeHtml(
                draft.id
              )}">${escapeHtml(state.tr('adminBohDeleteObjective', 'Delete objective'))}</button>`
            : ''
        }</div>
      </form>
    </div>
  </section>`;
}

function deriveValidation(state, kind) {
  const seats = state.snapshot.teams.flatMap((team) =>
    team.seats.map((seat) => ({ ...seat, teamId: team.id }))
  );
  const assigned = seats.filter((seat) => seat.playerId);
  const ids = assigned.map((seat) => seat.playerId);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const roleCapacity = state.snapshot.plan.roleGroups.reduce(
    (total, role) => total + Math.max(0, integer(role.capacity)),
    0
  );
  const errors = [];
  const warnings = [];
  if (assigned.length !== TEAM_COUNT * ROSTER_SIZE) {
    errors.push(
      state.tr('adminBohValidationSeats', '{assigned} of 72 seats are assigned.', {
        assigned: assigned.length,
      })
    );
  }
  if (duplicates.length) {
    errors.push(
      state.tr('adminBohValidationDuplicates', '{count} players occupy more than one seat.', {
        count: duplicates.length,
      })
    );
  }
  if (roleCapacity !== ROSTER_SIZE) {
    errors.push(
      state.tr('adminBohValidationCapacity', 'Role capacity is {count}; it must equal 12.', {
        count: roleCapacity,
      })
    );
  }
  for (const team of state.snapshot.teams) {
    if (!cleanText(team.name) || !cleanText(team.color)) {
      errors.push(
        state.tr('adminBohValidationTeamMetadata', '{team} needs a name and color.', {
          team: teamDisplayName(state, team),
        })
      );
    }
    if (!team.captainId || !team.seats.some((seat) => seat.playerId === team.captainId)) {
      errors.push(
        state.tr('adminBohValidationCaptain', '{team} needs an assigned captain.', {
          team: teamDisplayName(state, team),
        })
      );
    }
  }
  if (kind === 'plan' && state.snapshot.plan.phases.length !== 4) {
    errors.push(state.tr('adminBohValidationPhases', 'The plan must contain exactly four phases.'));
  }
  if (kind === 'plan' && state.snapshot.plan.legions.length !== 2) {
    errors.push(
      state.tr('adminBohValidationLegions', 'The plan must contain Legion 1 and Legion 2.')
    );
  }
  if (kind === 'plan' && !state.snapshot.plan.instructions.length) {
    errors.push(
      state.tr('adminBohValidationInstructions', 'No player instructions have been authored.')
    );
  }
  if (kind === 'plan' && !state.snapshot.plan.objectives.length) {
    warnings.push(state.tr('adminBohValidationMap', 'No schematic objectives have been placed.'));
  }
  return { errors, warnings };
}

function revisionValidation(state, kind) {
  const validation = state.snapshot.validation;
  const readiness = validation?.[kind] || validation;
  const validatedRevision = integer(validation?.revision ?? validation?.validatedRevision, -1);
  return {
    validatedRevision,
    valid:
      validatedRevision === state.snapshot.revision &&
      readiness?.valid === true &&
      list(readiness?.errors).length === 0,
  };
}

function renderPublish(state) {
  const readiness = Object.fromEntries(
    ['announcement', 'plan'].map((kind) => {
      const local = deriveValidation(state, kind);
      const revision = revisionValidation(state, kind);
      const external = state.snapshot.validation?.[kind] || {};
      const errors = [
        ...local.errors,
        ...list(external.errors).map((item) => cleanText(item?.message || item)),
      ];
      const warnings = [
        ...local.warnings,
        ...list(external.warnings).map((item) => cleanText(item?.message || item)),
      ];
      return [kind, { errors, warnings, revision, ready: errors.length === 0 && revision.valid }];
    })
  );
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageFive', 'STAGE 5 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'publish'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohPublishHelp',
            'Validate the exact draft revision, inspect the player-safe preview, then publish announcements and plans independently.'
          )
        )}</p></div>
      <button type="button" class="boh-admin-button boh-admin-button-primary" data-action="validate-revision">${escapeHtml(
        state.tr('adminBohValidateRevision', 'Validate revision {revision}', {
          revision: state.snapshot.revision,
        })
      )}</button>
    </header>
    <div class="boh-admin-publish-grid">
      ${renderValidationCard(state, 'announcement', readiness.announcement)}
      ${renderPublicationCard(state, 'announcement', readiness.announcement.ready)}
      ${renderValidationCard(state, 'plan', readiness.plan)}
      ${renderPublicationCard(state, 'plan', readiness.plan.ready)}
    </div>
    <section class="boh-admin-card boh-admin-preview" aria-labelledby="bohPublishPreviewTitle">
      <header><div><p class="boh-admin-card-kicker">${escapeHtml(
        state.tr('adminBohSanitizedPreview', 'SANITIZED PLAYER PREVIEW')
      )}</p><h4 id="bohPublishPreviewTitle">${escapeHtml(
        state.tr('adminBohExactlyWhatPlayersSee', 'Exactly what players will see')
      )}</h4><p>${escapeHtml(
        state.tr(
          'adminBohPreviewPrivacy',
          'Private signup values, OCR notes, score overrides, and admin audit fields are excluded.'
        )
      )}</p></div>
      <fieldset class="boh-admin-segmented"><legend>${escapeHtml(
        state.tr('adminBohPreviewType', 'Preview type')
      )}</legend>
        <button type="button" data-action="preview-kind" data-kind="announcement" aria-pressed="${
          state.previewKind === 'announcement'
        }">${escapeHtml(state.tr('adminBohAnnouncement', 'Announcement'))}</button>
        <button type="button" data-action="preview-kind" data-kind="plan" aria-pressed="${
          state.previewKind === 'plan'
        }">${escapeHtml(state.tr('adminBohTeamPlan', 'Team plan'))}</button>
      </fieldset></header>
      ${state.previewKind === 'plan' ? renderPlanPreview(state) : renderAnnouncementPreview(state)}
    </section>`;
}

function renderValidationCard(state, kind, readiness) {
  const { errors, warnings, revision } = readiness;
  const title = state.tr(
    kind === 'announcement' ? 'adminBohAnnouncementReadiness' : 'adminBohPlanReadiness',
    kind === 'announcement' ? 'Announcement readiness' : 'Plan readiness'
  );
  return `<section class="boh-admin-card boh-admin-validation" data-ready="${errors.length === 0 && revision.valid}">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohReleaseGate', 'RELEASE GATE')
    )}</p><h4>${escapeHtml(title)}</h4></div>
      <span class="boh-admin-status-chip" data-status="${revision.valid ? 'confirmed' : 'pending'}">${escapeHtml(
        revision.valid
          ? state.tr('adminBohValidated', 'Validated')
          : state.tr('adminBohNotValidated', 'Not validated')
      )}</span></header>
    <dl><div><dt>${escapeHtml(state.tr('adminBohCurrentRevision', 'Current draft'))}</dt><dd>${state.snapshot.revision}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohValidatedRevision', 'Validated revision'))}</dt><dd>${
        revision.validatedRevision >= 0 ? revision.validatedRevision : '—'
      }</dd></div></dl>
    ${
      errors.length
        ? `<div class="boh-admin-validation-list" data-tone="error"><strong>${escapeHtml(
            state.tr('adminBohBlockingIssues', 'Blocking issues')
          )}</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>`
        : `<p class="boh-admin-check-line">✓ ${escapeHtml(
            state.tr('adminBohLocalChecksPassed', 'Local structure checks passed.')
          )}</p>`
    }
    ${
      warnings.length
        ? `<div class="boh-admin-validation-list" data-tone="warning"><strong>${escapeHtml(
            state.tr('adminBohWarnings', 'Warnings')
          )}</strong><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>`
        : ''
    }
  </section>`;
}

function publicationRecord(state, kind) {
  return state.snapshot.publications?.[kind] || {};
}

function renderPublicationCard(state, kind, ready) {
  const isAnnouncement = kind === 'announcement';
  const record = publicationRecord(state, kind);
  const title = state.tr(
    isAnnouncement ? 'adminBohTeamAnnouncement' : 'adminBohTeamPlans',
    isAnnouncement ? 'Team Announcement' : 'Team Plans'
  );
  return `<form class="boh-admin-card boh-admin-publication" data-form="publish" data-kind="${kind}">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr(
        isAnnouncement ? 'adminBohPublishAssignments' : 'adminBohPublishInstructions',
        isAnnouncement ? 'ASSIGNMENTS' : 'INSTRUCTIONS'
      )
    )}</p><h4>${escapeHtml(title)}</h4></div>
      <span class="boh-admin-status-chip" data-status="${escapeHtml(record.status || 'draft')}">${escapeHtml(
        statusLabel(state, cleanText(record.status) || 'draft')
      )}</span></header>
    <p>${escapeHtml(
      state.tr(
        isAnnouncement ? 'adminBohAnnouncementPublishHelp' : 'adminBohPlanPublishHelp',
        isAnnouncement
          ? 'Reveal team, seat, and role assignments without exposing player stats.'
          : 'Reveal the timed Legion plan and personal instructions after assignments are ready.'
      )
    )}</p>
    <dl><div><dt>${escapeHtml(state.tr('adminBohPublishedRevision', 'Published revision'))}</dt><dd>${escapeHtml(
      record.revision ?? '—'
    )}</dd></div><div><dt>${escapeHtml(state.tr('adminBohPublishedAt', 'Published at'))}</dt><dd>${escapeHtml(
      formatDate(state, record.publishedAt)
    )}</dd></div></dl>
    <label class="boh-admin-confirm"><input type="checkbox" name="confirmed" required />
      <span>${escapeHtml(
        state.tr(
          'adminBohPublishConfirmation',
          'I reviewed the sanitized preview for revision {revision}.',
          {
            revision: state.snapshot.revision,
          }
        )
      )}</span></label>
    <button type="submit" class="boh-admin-button boh-admin-button-primary" ${ready ? '' : 'disabled'}>${escapeHtml(
      state.tr('adminBohPublishNow', 'Publish {title}', { title })
    )}</button>
  </form>`;
}

function renderAnnouncementPreview(state) {
  return `<div class="boh-admin-announcement-preview">
    ${state.snapshot.teams
      .map(
        (team) =>
          `<section><h5>${escapeHtml(teamDisplayName(state, team))}</h5><ol>${team.seats
            .map((seat) => {
              const role = state.snapshot.plan.roleGroups.find(
                (item) => item.id === seat.roleGroupId
              );
              return `<li><span>${seat.seatNumber}</span><strong>${escapeHtml(
                seat.displayName ||
                  playerName(playerById(state, seat.playerId)) ||
                  state.tr('adminBohUnassigned', 'Unassigned')
              )}</strong><small>${escapeHtml(roleDisplayName(state, role))}</small></li>`;
            })
            .join('')}</ol></section>`
      )
      .join('')}
  </div>`;
}

function renderPlanPreview(state) {
  const teams = state.snapshot.teams;
  const team =
    teams.find((candidate) => candidate.id === state.selectedPreviewTeamId) || teams[0] || null;
  const assignedSeats = list(team?.seats).filter((seat) => seat.playerId);
  const seat =
    assignedSeats.find((candidate) => candidate.playerId === state.selectedPreviewPlayerId) ||
    assignedSeats[0] ||
    null;
  state.selectedPreviewTeamId = team?.id || '';
  state.selectedPreviewPlayerId = seat?.playerId || '';
  const phases = state.snapshot.plan.phases;
  const legions = state.snapshot.plan.legions;
  const role = state.snapshot.plan.roleGroups.find((item) => item.id === seat?.roleGroupId);
  const captainSeat = team?.seats.find((item) => item.playerId === team.captainId);
  const previewRuleSources = [
    ...state.snapshot.plan.instructions,
    ...list(state.snapshot.plan.roleDefaults),
    ...list(state.snapshot.plan.seatOverrides),
    ...list(state.snapshot.plan.playerOverrides),
  ];
  const uniquePreviewRules = new Map(
    previewRuleSources.map((item, index) => [cleanText(item.id) || `preview-rule-${index}`, item])
  );
  const previewRules = [...uniquePreviewRules.values()].map((item) => ({
    ...item,
    instruction:
      item.instruction && typeof item.instruction === 'object'
        ? item.instruction
        : {
            summary: cleanText(item.instruction),
            action: cleanText(item.action),
            startObjectiveId: cleanText(item.startObjectiveId),
            objectiveId: cleanText(item.objectiveId),
            targetLabel: cleanText(item.objectiveCode),
            viaObjectiveIds: list(item.viaObjectiveIds),
            pathObjectiveIds: list(item.pathObjectiveIds),
            loadout: cleanText(item.loadout),
            teleport: item.teleport,
            note: cleanText(item.note),
          },
  }));
  const previewPlan = {
    ...state.snapshot.plan,
    instructions: previewRules.filter((item) => item.scope === 'global' || item.scopeId === '*'),
    roleDefaults: previewRules.filter((item) => item.scope === 'role'),
    seatOverrides: previewRules.filter((item) => item.scope === 'seat'),
    playerOverrides: previewRules.filter((item) => item.scope === 'player'),
  };
  const timeline = phases.map((phase) => ({
    phase,
    legions: legions.map((legion) => {
      let instruction = {};
      if (team && seat) {
        try {
          instruction = BohModel.resolveBohInstruction(previewPlan, {
            teamId: team.id,
            phaseId: phase.id,
            legionId: legion.id,
            roleGroupId: seat.roleGroupId,
            seatNumber: seat.seatNumber,
            playerId: seat.playerId,
          }).instruction;
        } catch {
          instruction = {};
        }
      }
      return { legion, instruction };
    }),
  }));
  const referencedObjectiveIds = new Set(
    timeline.flatMap(({ legions: phaseLegions }) =>
      phaseLegions.flatMap(({ instruction }) => [
        instruction.startObjectiveId,
        ...list(instruction.viaObjectiveIds),
        ...list(instruction.pathObjectiveIds),
        instruction.objectiveId,
      ])
    )
  );
  const objectives = state.snapshot.plan.objectives.filter((objective) =>
    referencedObjectiveIds.has(objective.id)
  );
  const instructionText = (instruction) =>
    [
      instruction.action,
      instruction.summary,
      instruction.note,
      instruction.loadout,
      instruction.teleport,
    ]
      .map(cleanText)
      .filter(Boolean)
      .join(' · ');
  return `<div class="boh-admin-player-preview">
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohTeam', 'Team'))}</span>
        <select class="boh-admin-select" data-action="preview-team">
          ${teams
            .map(
              (candidate) =>
                `<option value="${escapeHtml(candidate.id)}" ${candidate.id === team?.id ? 'selected' : ''}>${escapeHtml(
                  teamDisplayName(state, candidate)
                )}</option>`
            )
            .join('')}
        </select>
      </label>
      <label><span>${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</span>
        <select class="boh-admin-select" data-action="preview-player" ${assignedSeats.length ? '' : 'disabled'}>
          ${
            assignedSeats.length
              ? assignedSeats
                  .map(
                    (candidate) =>
                      `<option value="${escapeHtml(candidate.playerId)}" ${candidate.playerId === seat?.playerId ? 'selected' : ''}>${escapeHtml(
                        candidate.displayName ||
                          playerName(playerById(state, candidate.playerId)) ||
                          candidate.playerId
                      )}</option>`
                  )
                  .join('')
              : `<option value="">${escapeHtml(
                  state.tr('adminBohNoAssignedPlayers', 'No assigned players')
                )}</option>`
          }
        </select>
      </label>
    </div>
    <header><span>${escapeHtml(state.tr('adminBohPreviewExample', 'PLAYER VIEW EXAMPLE'))}</span>
      <h5>${escapeHtml(
        seat?.displayName ||
          playerName(playerById(state, seat?.playerId)) ||
          state.tr('adminBohTeamPlan', 'Team plan')
      )}</h5>
      <p>${escapeHtml(
        state.tr(
          'adminBohPreviewInstruction',
          'Players see a phase timeline and only the instructions relevant to their assignment.'
        )
      )}</p></header>
    <dl class="boh-admin-stat-grid">
      <div><dt>${escapeHtml(state.tr('adminBohTeam', 'Team'))}</dt><dd>${escapeHtml(
        teamDisplayName(state, team)
      )}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohSeat', 'Seat'))}</dt><dd>${escapeHtml(
        seat?.seatNumber || '—'
      )}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohRoleGroup', 'Role'))}</dt><dd>${escapeHtml(
        roleDisplayName(state, role) || state.tr('adminBohRoleUnassigned', 'Role unassigned')
      )}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohCaptain', 'Captain'))}</dt><dd>${escapeHtml(
        captainSeat?.displayName ||
          playerName(playerById(state, captainSeat?.playerId)) ||
          state.tr('adminBohNotAssigned', 'Not assigned')
      )}</dd></div>
    </dl>
    <ol class="boh-admin-preview-timeline">${timeline
      .map(
        ({ phase, legions: phaseLegions }) =>
          `<li><strong>${escapeHtml(phaseDisplayName(state, phase))}</strong>
            <div class="boh-admin-preview-legions">${phaseLegions
              .map(({ legion, instruction }) => {
                const text = instructionText(instruction);
                return `<span><strong>${escapeHtml(
                  legionDisplayName(state, legion)
                )}</strong><small>${escapeHtml(
                  text || state.tr('adminBohNoInstructions', 'No instructions')
                )}</small></span>`;
              })
              .join('')}</div>
          </li>`
      )
      .join('')}</ol>
    <section class="boh-admin-warning-box" data-empty="${objectives.length === 0}">
      <h5>${escapeHtml(state.tr('adminBohMapObjectives', 'Map objectives'))}</h5>
      ${
        objectives.length
          ? `<ul>${objectives
              .map(
                (objective) =>
                  `<li><strong>${escapeHtml(
                    cleanText(objective.code || objective.id)
                  )}</strong> ${escapeHtml(cleanText(objective.label))}</li>`
              )
              .join('')}</ul>`
          : `<p>${escapeHtml(
              state.tr('adminBohNoObjectivesForPlayer', 'No mapped objectives for this player.')
            )}</p>`
      }
    </section>
  </div>`;
}

function setStatus(state, message, tone = 'neutral') {
  state.status = { message: cleanText(message), tone };
  const element = state.root.querySelector('#bohAdminStatus');
  if (!element) return;
  element.textContent = state.status.message;
  element.dataset.tone = tone;
  element.hidden = !state.status.message;
}

function formValues(form) {
  return new FormData(form);
}

function arrayValues(formData, key) {
  return formData.getAll(key).map(cleanText);
}

async function invokeAction(state, name, payload, successMessage) {
  if (state.pending) return null;
  const store = state.store;
  const optionAction = state.options.actions?.[name];
  const storeAction = store?.[name];
  const handler =
    typeof optionAction === 'function'
      ? optionAction
      : typeof storeAction === 'function'
        ? storeAction
        : null;
  if (!handler && typeof store?.dispatch !== 'function') {
    const error = new Error(
      state.tr('adminBohActionUnavailable', 'This admin action is not connected yet: {action}', {
        action: name,
      })
    );
    setStatus(state, error.message, 'error');
    state.options.onError?.(error, { action: name, payload });
    return null;
  }
  state.pending = true;
  state.root.setAttribute('aria-busy', 'true');
  setStatus(state, state.tr('adminBohSaving', 'Saving…'), 'loading');
  try {
    const command = { ...payload, expectedRevision: state.snapshot.revision };
    const result = handler
      ? await Promise.resolve(handler.call(store || state.options.actions, command, state.snapshot))
      : await Promise.resolve(
          store.dispatch({
            type: name,
            payload: command,
            expectedRevision: state.snapshot.revision,
          })
        );
    if (result?.snapshot) state.snapshot = normalizeSnapshot(result.snapshot);
    else await refreshState(state);
    state.roleDrafts = null;
    state.phaseDrafts = null;
    setStatus(state, successMessage || state.tr('adminBohSaved', 'Saved.'), 'success');
    state.options.onActionComplete?.({ action: name, payload: command, result });
    renderShell(state);
    return result;
  } catch (error) {
    setStatus(state, error?.message || String(error), 'error');
    state.options.onError?.(error, { action: name, payload });
    return null;
  } finally {
    state.pending = false;
    state.root.setAttribute('aria-busy', 'false');
  }
}

async function refreshState(state, suppliedSnapshot) {
  let snapshot = suppliedSnapshot;
  if (!snapshot && typeof state.store?.refresh === 'function') {
    snapshot = await Promise.resolve(state.store.refresh());
  }
  if (!snapshot && typeof state.store?.getSnapshot === 'function') {
    snapshot = await Promise.resolve(state.store.getSnapshot());
  }
  if (!snapshot && typeof state.options.getSnapshot === 'function') {
    snapshot = await Promise.resolve(state.options.getSnapshot());
  }
  if (snapshot) state.snapshot = normalizeSnapshot(snapshot);
  return state.snapshot;
}

function findSeat(state, teamId, seatNumber) {
  const team = state.snapshot.teams.find((item) => item.id === teamId);
  const seat = team?.seats.find((item) => item.seatNumber === integer(seatNumber));
  return team && seat ? { team, seat } : null;
}

async function handleClick(state, event) {
  const button = event.target.closest('button');
  if (!button || !state.root.contains(button) || button.disabled) return;
  const action = button.dataset.action;
  if (!action) return;
  if (action === 'stage') {
    state.stage = button.dataset.stage;
    state.selectedSourceSeat = null;
    renderShell(state);
    state.root.querySelector(`[data-stage="${state.stage}"]`)?.focus();
    return;
  }
  if (action === 'refresh') {
    await refreshState(state);
    setStatus(state, state.tr('adminBohRefreshed', 'All-Star data refreshed.'), 'success');
    renderShell(state);
    return;
  }
  if (action === 'select-submission') {
    state.selectedSubmissionId = cleanText(button.dataset.playerId);
    renderShell(state);
    state.root.querySelector('#bohSignupDetailTitle')?.focus?.();
    return;
  }
  if (action === 'close-submission') {
    const closingPlayerId = state.selectedSubmissionId;
    state.selectedSubmissionId = '';
    renderShell(state);
    [...state.root.querySelectorAll('[data-action="select-submission"]')]
      .find((candidate) => cleanText(candidate.dataset.playerId) === closingPlayerId)
      ?.focus();
    return;
  }
  if (action === 'select-seat') {
    const found = findSeat(state, button.dataset.teamId, button.dataset.seatNumber);
    if (!found || !found.seat.playerId || found.seat.locked) return;
    state.selectedSourceSeat = {
      teamId: found.team.id,
      seatNumber: found.seat.seatNumber,
    };
    renderShell(state);
    return;
  }
  if (action === 'clear-seat-selection') {
    state.selectedSourceSeat = null;
    renderShell(state);
    return;
  }
  if (action === 'move-seat-here') {
    const source = state.selectedSourceSeat;
    const destination = findSeat(state, button.dataset.teamId, button.dataset.seatNumber);
    const sourceEntry = source ? findSeat(state, source.teamId, source.seatNumber) : null;
    if (!sourceEntry || !destination || destination.seat.locked || sourceEntry.seat.locked) return;
    await invokeAction(
      state,
      destination.seat.playerId ? 'swapSeats' : 'moveSeat',
      {
        source: { teamId: sourceEntry.team.id, seatNumber: sourceEntry.seat.seatNumber },
        destination: { teamId: destination.team.id, seatNumber: destination.seat.seatNumber },
      },
      state.tr(
        destination.seat.playerId ? 'adminBohSeatsSwapped' : 'adminBohPlayerMoved',
        destination.seat.playerId ? 'Seats swapped.' : 'Player moved.'
      )
    );
    state.selectedSourceSeat = null;
    return;
  }
  if (action === 'toggle-seat-lock') {
    const found = findSeat(state, button.dataset.teamId, button.dataset.seatNumber);
    if (!found) return;
    await invokeAction(
      state,
      'setSeatLock',
      { teamId: found.team.id, seatNumber: found.seat.seatNumber, locked: !found.seat.locked },
      state.tr(
        found.seat.locked ? 'adminBohSeatUnlocked' : 'adminBohSeatLocked',
        found.seat.locked ? 'Seat unlocked.' : 'Seat locked.'
      )
    );
    return;
  }
  if (action === 'balance-teams') {
    const confirmed = await Promise.resolve(
      state.options.confirm?.(
        state.tr(
          'adminBohBalanceConfirm',
          'Rebuild all unlocked seats using the active score version? Locked seats stay in place.'
        )
      ) ??
        window.confirm(
          state.tr(
            'adminBohBalanceConfirm',
            'Rebuild all unlocked seats using the active score version? Locked seats stay in place.'
          )
        )
    );
    if (!confirmed) return;
    await invokeAction(
      state,
      'balanceTeams',
      {
        teamCount: TEAM_COUNT,
        rosterSize: ROSTER_SIZE,
        scoringVersionId: scoringVersion(state.snapshot)?.id || '',
      },
      state.tr('adminBohTeamsBalanced', 'Balanced team draft created.')
    );
    return;
  }
  if (action === 'start-legacy-structure') {
    const message = state.tr(
      'adminBohLegacyConfirm',
      'Copy last year’s four phase timings and objective codes? The 15-seat roles and every legacy player name will be excluded.'
    );
    const confirmed = await Promise.resolve(
      state.options.confirm?.(message) ?? window.confirm(message)
    );
    if (!confirmed) return;
    await invokeAction(
      state,
      'applyLegacyStructureTemplate',
      {
        templateId: 'boh-legacy-2025-structure',
        sourceSeatCount: 15,
        targetSeatCount: ROSTER_SIZE,
        copyPhases: true,
        copyObjectiveCodes: true,
        copyRoleCapacities: false,
        copyPlayerAssignments: false,
        copyPlayerNames: false,
        requireExplicitRoleMapping: true,
      },
      state.tr('adminBohLegacyStructureApplied', 'Last-year structure copied safely.')
    );
    return;
  }
  if (action === 'add-role') {
    roleDrafts(state).push({
      id: `draft-role-${Date.now()}`,
      label: state.tr('adminBohNewRole', 'New role'),
      capacity: 0,
      color: '#7dd3fc',
      order: roleDrafts(state).length + 1,
    });
    renderShell(state);
    return;
  }
  if (action === 'remove-role') {
    roleDrafts(state).splice(integer(button.dataset.roleIndex), 1);
    renderShell(state);
    return;
  }
  if (action === 'plan-scope') {
    const scope = cleanText(button.dataset.scope);
    state.planScope = ['global', 'role', 'seat', 'player'].includes(scope) ? scope : 'role';
    renderShell(state);
    return;
  }
  if (action === 'remove-instruction') {
    await invokeAction(
      state,
      'removeInstruction',
      { instructionId: cleanText(button.dataset.instructionId) },
      state.tr('adminBohInstructionRemoved', 'Instruction removed.')
    );
    return;
  }
  if (action === 'edit-rotation') {
    state.rotationDraftId = cleanText(button.dataset.rotationId);
    renderShell(state);
    state.root.querySelector('.boh-admin-rotation select[name="sourceSeatNumber"]')?.focus();
    return;
  }
  if (action === 'cancel-rotation') {
    state.rotationDraftId = '';
    renderShell(state);
    return;
  }
  if (action === 'remove-rotation') {
    await invokeAction(
      state,
      'removeRotation',
      { rotationId: cleanText(button.dataset.rotationId) },
      state.tr('adminBohInstructionRemoved', 'Rotation removed.')
    );
    state.rotationDraftId = '';
    return;
  }
  if (action === 'edit-objective') {
    state.objectiveDraftId = cleanText(button.dataset.objectiveId);
    renderShell(state);
    state.root.querySelector('.boh-admin-objective-form input[name="code"]')?.focus();
    return;
  }
  if (action === 'remove-objective') {
    await invokeAction(
      state,
      'removeObjective',
      { objectiveId: cleanText(button.dataset.objectiveId) },
      state.tr('adminBohObjectiveRemoved', 'Objective removed.')
    );
    state.objectiveDraftId = '';
    return;
  }
  if (action === 'remove-score-override') {
    const playerIdValue = cleanText(button.dataset.playerId);
    if (!playerIdValue) return;
    await invokeAction(
      state,
      'removeScoreOverride',
      { playerId: playerIdValue },
      state.tr('adminBohOverrideRemoved', 'Score override removed.')
    );
    return;
  }
  if (action === 'validate-revision') {
    await invokeAction(
      state,
      'validateRevision',
      { revision: state.snapshot.revision },
      state.tr('adminBohRevisionValidated', 'Draft revision validated.')
    );
    return;
  }
  if (action === 'preview-kind') {
    state.previewKind = button.dataset.kind === 'plan' ? 'plan' : 'announcement';
    renderShell(state);
  }
}

function handleChange(state, event) {
  const action = cleanText(event.target.dataset.action);
  if (action === 'score-override-player') {
    const form = event.target.closest('form[data-form="score-override"]');
    const button = form?.querySelector('[data-action="remove-score-override"]');
    const selectedScore = state.snapshot.scores.find(
      (score) => playerId(score) === cleanText(event.target.value)
    );
    const hasOverride =
      selectedScore?.overrideScore !== null && selectedScore?.overrideScore !== undefined;
    if (button) {
      button.dataset.playerId = cleanText(event.target.value);
      button.hidden = !hasOverride;
    }
    return;
  }
  if (action === 'preview-team') {
    state.selectedPreviewTeamId = cleanText(event.target.value);
    const team = state.snapshot.teams.find(
      (candidate) => candidate.id === state.selectedPreviewTeamId
    );
    state.selectedPreviewPlayerId = team?.seats.find((seat) => seat.playerId)?.playerId || '';
    renderShell(state);
    return;
  }
  if (action === 'preview-player') {
    state.selectedPreviewPlayerId = cleanText(event.target.value);
    renderShell(state);
    return;
  }
  const control = event.target.closest('[data-plan-filter]');
  if (!control) return;
  state.rotationDraftId = '';
  if (control.dataset.planFilter === 'team') state.planTeamId = control.value;
  if (control.dataset.planFilter === 'phase') state.planPhaseId = control.value;
  if (control.dataset.planFilter === 'legion') state.planLegionId = control.value;
  renderShell(state);
}

function parseRolePayload(formData) {
  const ids = arrayValues(formData, 'roleId');
  const labels = arrayValues(formData, 'roleLabel');
  const capacities = arrayValues(formData, 'roleCapacity');
  const colors = arrayValues(formData, 'roleColor');
  return ids.map((id, index) => ({
    id,
    label: labels[index],
    capacity: Math.max(0, integer(capacities[index])),
    color: colors[index] || '#64748b',
    order: index + 1,
  }));
}

function parsePhasePayload(formData) {
  const ids = arrayValues(formData, 'phaseId');
  const labels = arrayValues(formData, 'phaseLabel');
  const starts = arrayValues(formData, 'phaseStart');
  const ends = arrayValues(formData, 'phaseEnd');
  return ids.map((id, index) => ({
    id,
    label: labels[index],
    startMinute: Math.max(0, integer(starts[index])),
    endMinute: Math.max(0, integer(ends[index])),
    order: index + 1,
  }));
}

async function handleSubmit(state, event) {
  const form = event.target.closest('form[data-form]');
  if (!form || !state.root.contains(form)) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = formValues(form);
  const kind = form.dataset.form;
  if (kind === 'signup-filter') {
    state.signupSearch = cleanText(data.get('search'));
    state.signupFilter = cleanText(data.get('status')) || 'all';
    renderShell(state);
    return;
  }
  if (kind === 'copy-phase-template') {
    await invokeAction(
      state,
      'copyPhaseTemplate',
      {
        teamId: state.planTeamId,
        legionId: state.planLegionId,
        sourcePhaseId: state.planPhaseId,
        targetPhaseId: cleanText(data.get('targetPhaseId')),
        copyPlayerAssignments: false,
      },
      state.tr('adminBohPhaseCopied', 'Phase template copied.')
    );
    return;
  }
  if (kind === 'copy-team-plan') {
    await invokeAction(
      state,
      'copyTeamPlan',
      {
        sourceTeamId: state.planTeamId,
        targetTeamId: cleanText(data.get('targetTeamId')),
        copyInstructions: true,
        copyRotations: true,
        copyPlayerAssignments: false,
        copyPlayerNames: false,
      },
      state.tr('adminBohTeamPlanCopied', 'Team plan copied without player assignments.')
    );
    return;
  }
  if (kind === 'copy-legion-plan') {
    await invokeAction(
      state,
      'copyLegionPlan',
      {
        teamId: state.planTeamId,
        sourceLegionId: state.planLegionId,
        targetLegionId: cleanText(data.get('targetLegionId')),
        copyPlayerAssignments: false,
      },
      state.tr('adminBohLegionPlanCopied', 'Legion plan copied.')
    );
    return;
  }
  if (kind === 'apply-role-default') {
    await invokeAction(
      state,
      'applyRoleDefault',
      {
        teamId: state.planTeamId,
        phaseId: state.planPhaseId,
        legionId: state.planLegionId,
        roleGroupId: cleanText(data.get('roleGroupId')),
        seatNumber: integer(data.get('seatNumber')),
      },
      state.tr('adminBohRoleDefaultApplied', 'Role default applied to the seat.')
    );
    return;
  }
  if (kind === 'review-submission') {
    const usefulnessInput = cleanText(data.get('adminUsefulnessRating'));
    await invokeAction(
      state,
      'reviewSubmission',
      {
        playerId: cleanText(data.get('playerId')),
        status: cleanText(data.get('status')),
        note: cleanText(data.get('note')),
        internalNote: cleanText(data.get('internalNote')),
        adminUsefulnessRating: usefulnessInput === '' ? null : clamp(usefulnessInput, 0, 100),
      },
      state.tr('adminBohReviewSaved', 'Signup review saved.')
    );
    return;
  }
  if (kind === 'stat-corrections') {
    const submission = state.snapshot.submissions.find(
      (item) => playerId(item) === cleanText(data.get('playerId'))
    );
    const review = submission?.review || {};
    const reason = cleanText(data.get('reason'));
    const statCorrections = Object.fromEntries(
      [
        'totalCastlePower',
        'troopPower',
        'buildingPower',
        'technologyPower',
        'heroCombatPower',
        'dragonPower',
      ]
        .map((key) => [key, cleanText(data.get(`statCorrection.${key}`))])
        .filter(([, corrected]) => corrected !== '')
        .map(([key, corrected]) => [key, { corrected: finiteNumber(corrected), reason }])
    );
    await invokeAction(
      state,
      'reviewSubmission',
      {
        playerId: cleanText(data.get('playerId')),
        status: adapterReviewStatusToUi(review.status),
        note: cleanText(review.note),
        internalNote: cleanText(review.internalNote),
        adminUsefulnessRating: review?.adjustments?.bohUsefulRating ?? null,
        statCorrections,
      },
      state.tr('adminBohCorrectionsSaved', 'Admin corrections saved.')
    );
    return;
  }
  if (kind === 'scoring-version') {
    const weights = Object.fromEntries(
      SCORE_COMPONENTS.map(([key]) => [key, finiteNumber(data.get(`weight.${key}`))])
    );
    await invokeAction(
      state,
      'createScoringVersion',
      { label: cleanText(data.get('label')), note: cleanText(data.get('note')), weights },
      state.tr('adminBohScoringVersionSaved', 'New scoring version saved.')
    );
    return;
  }
  if (kind === 'score-override') {
    await invokeAction(
      state,
      'setScoreOverride',
      {
        playerId: cleanText(data.get('playerId')),
        score: Math.max(0, integer(data.get('score'))),
        reason: cleanText(data.get('reason')),
      },
      state.tr('adminBohOverrideSaved', 'Score override saved.')
    );
    return;
  }
  if (kind === 'eligible-pool') {
    await invokeAction(
      state,
      'saveEligiblePool',
      { playerIds: data.getAll('playerId').map(cleanText).filter(Boolean) },
      state.tr('adminBohEligiblePoolSaved', 'Eligible 72-player pool saved.')
    );
    return;
  }
  if (kind === 'direct-assignment') {
    const [teamId, seatNumber] = cleanText(data.get('targetSeat')).split('|');
    await invokeAction(
      state,
      'assignSeatPlayer',
      {
        teamId: cleanText(teamId),
        seatNumber: integer(seatNumber),
        playerId: cleanText(data.get('playerId')),
      },
      state.tr('adminBohAssignmentApplied', 'Seat assignment updated.')
    );
    return;
  }
  if (kind === 'team-metadata') {
    await invokeAction(
      state,
      'saveTeamMetadata',
      {
        teamId: cleanText(data.get('teamId')),
        name: cleanText(data.get('name')),
        color: cleanText(data.get('color')),
        captainId: cleanText(data.get('captainId')),
        notes: cleanText(data.get('notes')),
      },
      state.tr('adminBohTeamMetadataSaved', 'Team details saved.')
    );
    return;
  }
  if (kind === 'role-groups') {
    const roleGroups = parseRolePayload(data);
    await invokeAction(
      state,
      'saveRoleGroups',
      { roleGroups },
      state.tr('adminBohRolesSaved', 'Role structure saved.')
    );
    return;
  }
  if (kind === 'phases') {
    const phases = parsePhasePayload(data);
    const invalid = phases.some((phase, index) => {
      if (phase.endMinute <= phase.startMinute) return true;
      return index > 0 && phase.startMinute < phases[index - 1].endMinute;
    });
    if (invalid || phases.length !== 4) {
      setStatus(
        state,
        state.tr('adminBohInvalidTimeline', 'Use exactly four ordered, non-overlapping phases.'),
        'error'
      );
      return;
    }
    await invokeAction(
      state,
      'savePhases',
      { phases },
      state.tr('adminBohTimelineSaved', 'Match timeline saved.')
    );
    return;
  }
  if (kind === 'instruction') {
    const scope = cleanText(data.get('scope'));
    const scopeId = cleanText(data.get('scopeId'));
    const pathObjectiveIds = cleanText(data.get('pathObjectiveIds'))
      .split(/[\s,>→]+/u)
      .map(cleanText)
      .filter(Boolean);
    await invokeAction(
      state,
      'saveInstruction',
      {
        teamId: cleanText(data.get('teamId')),
        phaseId: cleanText(data.get('phaseId')),
        legionId: cleanText(data.get('legionId')),
        scope,
        scopeId,
        roleGroupId: scope === 'role' ? scopeId : '',
        seatNumber: scope === 'seat' ? integer(scopeId) : null,
        playerId: scope === 'player' ? scopeId : '',
        action: cleanText(data.get('action')),
        startObjectiveId: cleanText(data.get('startObjectiveId')),
        viaObjectiveIds: data.getAll('viaObjectiveIds').map(cleanText).filter(Boolean),
        pathObjectiveIds,
        objectiveId: cleanText(data.get('objectiveId')),
        loadout: cleanText(data.get('loadout')),
        teleport: cleanText(data.get('teleport')),
        instruction: cleanText(data.get('instruction')),
        note: cleanText(data.get('note')),
      },
      state.tr('adminBohInstructionSaved', 'Plan instruction saved.')
    );
    return;
  }
  if (kind === 'rotation') {
    await invokeAction(
      state,
      'saveRotation',
      {
        rotationId: cleanText(data.get('rotationId')),
        teamId: cleanText(data.get('teamId')),
        phaseId: cleanText(data.get('phaseId')),
        legionId: cleanText(data.get('legionId')),
        sourceSeatNumber: integer(data.get('sourceSeatNumber')),
        targetSeatNumber: integer(data.get('targetSeatNumber')),
        note: cleanText(data.get('note')),
      },
      state.tr('adminBohRotationSaved', 'Role rotation saved.')
    );
    state.rotationDraftId = '';
    return;
  }
  if (kind === 'objective') {
    await invokeAction(
      state,
      'saveObjective',
      {
        id: cleanText(data.get('id')),
        code: cleanText(data.get('code')),
        label: cleanText(data.get('label')),
        x: clamp(data.get('x'), 0, 100),
        y: clamp(data.get('y'), 0, 100),
        type: 'objective',
      },
      state.tr('adminBohObjectiveSaved', 'Map objective saved.')
    );
    state.objectiveDraftId = '';
    return;
  }
  if (kind === 'publish') {
    const publicationKind = form.dataset.kind === 'plan' ? 'plan' : 'announcement';
    await invokeAction(
      state,
      publicationKind === 'plan' ? 'publishPlan' : 'publishAnnouncement',
      {
        revision: state.snapshot.revision,
        sanitizedPreviewConfirmed: data.get('confirmed') === 'on',
      },
      state.tr('adminBohPublished', '{title} published.', {
        title: state.tr(
          publicationKind === 'plan' ? 'adminBohTeamPlans' : 'adminBohTeamAnnouncement',
          publicationKind === 'plan' ? 'Team Plans' : 'Team Announcement'
        ),
      })
    );
  }
}

function handleStageKeys(state, event) {
  const tab = event.target.closest('[data-action="stage"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const current = STAGES.findIndex(([id]) => id === tab.dataset.stage);
  const direction = getComputedStyle(state.root).direction === 'rtl' ? -1 : 1;
  let next = current;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = STAGES.length - 1;
  if (event.key === 'ArrowRight') next = (current + direction + STAGES.length) % STAGES.length;
  if (event.key === 'ArrowLeft') next = (current - direction + STAGES.length) % STAGES.length;
  state.stage = STAGES[next][0];
  renderShell(state);
  state.root.querySelector(`[data-stage="${state.stage}"]`)?.focus();
}

function bindEvents(state) {
  state.eventsAbort?.abort();
  state.eventsAbort = new AbortController();
  const { signal } = state.eventsAbort;
  state.root.addEventListener(
    'click',
    (event) => {
      void handleClick(state, event).catch((error) => {
        setStatus(state, error?.message || String(error), 'error');
        state.options.onError?.(error, { action: 'click' });
      });
    },
    { signal }
  );
  state.root.addEventListener('change', (event) => handleChange(state, event), { signal });
  state.root.addEventListener(
    'submit',
    (event) => {
      void handleSubmit(state, event).catch((error) => {
        setStatus(state, error?.message || String(error), 'error');
        state.options.onError?.(error, { action: 'submit' });
      });
    },
    { signal }
  );
  state.root.addEventListener('keydown', (event) => handleStageKeys(state, event), { signal });
}

async function startController(state) {
  if (state.mounted || state.destroyed) return;
  state.mounted = true;
  state.pending = true;
  renderShell(state);
  setStatus(state, state.tr('adminBohLoading', 'Loading All-Star administration…'), 'loading');
  try {
    if (!state.store && state.options.adminStore) {
      state.store = createAdminAllStarBohStoreAdapter(state.options.adminStore, {
        ...(state.options.adminStoreAdapterOptions || {}),
        onError: state.options.adminStoreAdapterOptions?.onError || state.options.onError,
      });
      state.ownsStore = true;
    }
    if (!state.store && typeof state.options.createStore === 'function') {
      state.store = await Promise.resolve(state.options.createStore());
      state.ownsStore = true;
    }
    if (
      state.store &&
      typeof state.store.getSnapshot !== 'function' &&
      typeof state.store.listSubmissions === 'function'
    ) {
      state.store = createAdminAllStarBohStoreAdapter(state.store, {
        ...(state.options.adminStoreAdapterOptions || {}),
        onError: state.options.adminStoreAdapterOptions?.onError || state.options.onError,
      });
      state.ownsStore = true;
    }
    const startedSnapshot =
      typeof state.store?.start === 'function' ? await Promise.resolve(state.store.start()) : null;
    await refreshState(state, startedSnapshot);
    if (typeof state.store?.subscribe === 'function') {
      state.unsubscribe = state.store.subscribe((change) => {
        if (state.destroyed) return;
        state.snapshot = normalizeSnapshot(change?.snapshot || change);
        state.roleDrafts = null;
        state.phaseDrafts = null;
        renderShell(state);
        state.options.onSnapshot?.(state.snapshot);
      });
    }
    setStatus(state, state.tr('adminBohReady', 'All-Star administration is live.'), 'success');
  } catch (error) {
    state.mounted = false;
    setStatus(state, error?.message || String(error), 'error');
    state.options.onError?.(error, { action: 'mount' });
    throw error;
  } finally {
    state.pending = false;
    renderShell(state);
  }
}

export function createAdminAllStarBohController(options = {}) {
  const root = resolveRoot(options.container || options.root);
  if (!root) throw new Error('All-Star BoH admin root was not found.');
  const existing = CONTROLLERS.get(root);
  if (existing) return existing;
  const state = makeInitialState(root, options);
  bindEvents(state);
  renderShell(state);

  const controller = {
    async mount() {
      await startController(state);
      return controller;
    },
    async refresh(snapshot) {
      await refreshState(state, snapshot);
      state.roleDrafts = null;
      state.phaseDrafts = null;
      renderShell(state);
      return controller.getState();
    },
    setLanguage(translatorOrOptions, locale) {
      if (typeof translatorOrOptions === 'function') {
        state.tr = makeTranslator(translatorOrOptions);
        if (locale) state.locale = cleanText(locale);
      } else if (translatorOrOptions && typeof translatorOrOptions === 'object') {
        if (typeof translatorOrOptions.t === 'function') {
          state.tr = makeTranslator(translatorOrOptions.t);
        }
        if (translatorOrOptions.locale) state.locale = cleanText(translatorOrOptions.locale);
        if (translatorOrOptions.direction) {
          state.direction = cleanText(translatorOrOptions.direction);
          state.root.dir = state.direction;
        }
      }
      renderShell(state);
    },
    refreshLanguage(translator, locale) {
      controller.setLanguage(translator, locale);
    },
    setStage(stage) {
      if (!STAGES.some(([id]) => id === stage)) return false;
      state.stage = stage;
      renderShell(state);
      return true;
    },
    getState() {
      return {
        stage: state.stage,
        revision: state.snapshot.revision,
        snapshot: state.snapshot,
        pending: state.pending,
        mounted: state.mounted,
      };
    },
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      state.eventsAbort?.abort();
      if (typeof state.unsubscribe === 'function') state.unsubscribe();
      else state.unsubscribe?.unsubscribe?.();
      if (state.ownsStore && typeof state.store?.stop === 'function') state.store.stop();
      CONTROLLERS.delete(root);
      root.classList.remove('boh-admin');
      root.removeAttribute('aria-busy');
      root.replaceChildren();
    },
  };

  CONTROLLERS.set(root, controller);
  return controller;
}

export async function mountAdminAllStarBoh(container, options = {}) {
  const controller = createAdminAllStarBohController({ ...options, container });
  await controller.mount();
  return controller;
}

export const initializeAdminAllStarBoh = mountAdminAllStarBoh;
