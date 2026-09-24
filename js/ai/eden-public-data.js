import { edenWorkspaceFirestorePath, isPublishedEdenProjection } from '../eden-workspaces.js';
import {
  buildWeightedContributionRows,
  getWeightedPlayerFamilyKey,
  normalizeEdenX1ContributionRankingMode,
  sanitizePublicR5Adjustments,
} from '../contribution-weighting.js';

const PUBLIC_PROJECTION_PATH = edenWorkspaceFirestorePath('eden-x2', 'publicProjection');
const CACHE_MS = 60_000;

let cached = null;
let inFlight = null;

function integer(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function numberOrNull(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePublicVoteResults(value = {}) {
  const rankings = Array.isArray(value.rankings) ? value.rankings : [];
  return {
    season: String(value.season || '').trim(),
    published: value.published === true,
    totalBallots: integer(value.totalBallots),
    asOf:
      String(value.asOf || value.updatedAt || '')
        .trim()
        .slice(0, 40) || null,
    rankings: rankings
      .map((row) => ({
        playerName: String(row?.playerName || '')
          .trim()
          .slice(0, 100),
        playerKey: String(row?.playerKey || '')
          .trim()
          .slice(0, 120),
        familyKey: String(row?.familyKey || getWeightedPlayerFamilyKey(row?.playerKey || ''))
          .trim()
          .slice(0, 120),
        votes: integer(row?.votes),
        voters: integer(row?.voters),
      }))
      .filter((row) => row.playerName),
  };
}

function publicWeightedRow(row) {
  return {
    playerName: String(row.playerName || '').slice(0, 100),
    playerKey: String(row.playerKey || '').slice(0, 120),
    familyKey: String(getWeightedPlayerFamilyKey(row.playerKey || '')).slice(0, 120),
    currentRank: integer(row.currentRank) || null,
    currentReward: row.currentReward || 'standard',
    contribution: Number(row.contributionScore) || 0,
    demolition: Number(row.totalDemolition) || 0,
    exGuildContribution: Number(row.contributionExGuild) || 0,
    shieldWalls: integer(row.shieldWalls),
    pathers: integer(row.pathers),
    banners: integer(row.banners),
    conductBonus: Number(row.conductBonus) || 0,
    contributionPoints: Number(row.contributionRewardScore) || 0,
    demolitionPoints: Number(row.demolitionPoints) || 0,
    dutyPoints: Number(row.dutyPoints) || 0,
    conductPoints: Number(row.conductPoints) || 0,
    weightedScore: Number(row.weightedScore) || 0,
    finalRank: integer(row.finalRank) || null,
    baseReward: row.baseReward || 'standard',
    finalReward: row.finalReward || 'standard',
    rewardReason: row.rewardReason || 'rank',
  };
}

export function buildEdenPublicDataFromProjection(projection) {
  if (!isPublishedEdenProjection(projection) || projection.workspace !== 'eden-x2') return null;

  const dashboard =
    projection.dashboard && typeof projection.dashboard === 'object' ? projection.dashboard : {};
  const settings =
    projection.voteSettings && typeof projection.voteSettings === 'object'
      ? projection.voteSettings
      : {};
  const scoring =
    projection.scoring && typeof projection.scoring === 'object' ? projection.scoring : {};
  const season = String(dashboard.r5Season || projection.season || 'X2').trim().slice(0, 40);
  const adjustments = sanitizePublicR5Adjustments(
    Array.isArray(dashboard.publicConductAdjustments) ? dashboard.publicConductAdjustments : [],
    season
  );
  const model = buildWeightedContributionRows({
    contributionRecords: Array.isArray(dashboard.contributionRecords)
      ? dashboard.contributionRecords
      : [],
    dutyRecords: Array.isArray(dashboard.dutyRecords) ? dashboard.dutyRecords : [],
    exGuildContributions: Array.isArray(dashboard.exGuildContributions)
      ? dashboard.exGuildContributions
      : [],
    r5Adjustments: adjustments,
    season,
    includeSupportOnly: true,
    dutyPointWeights: scoring.dutyPointWeights,
    contributionWeight: scoring.contributionWeight,
    formPointWeight: scoring.formPointWeight,
    demolitionRecords:
      scoring.includeDemolitionPoints === true && Array.isArray(dashboard.attacks)
        ? dashboard.attacks
        : undefined,
    includeDemolitionPoints: scoring.includeDemolitionPoints === true,
  });
  const publicVoteResults = normalizePublicVoteResults(
    settings.showMemberResults === true ? projection.publicVoteResults || {} : {}
  );

  return {
    workspace: 'eden-x2',
    season,
    seasonLabel: 'X2',
    sourceRevision: integer(projection.revision) || null,
    asOf:
      String(dashboard.last_updated || dashboard.date || dashboard.updatedAtMs || '')
        .trim()
        .slice(0, 40) || null,
    attackCount: Array.isArray(dashboard.attacks) ? dashboard.attacks.length : 0,
    weights: model.weights,
    premiumCutoff: model.premiumCutoff,
    scoring: {
      dutyPointWeights: scoring.dutyPointWeights || null,
      includeDemolitionPoints: scoring.includeDemolitionPoints === true,
      contributionWeight: numberOrNull(scoring.contributionWeight),
      formPointWeight: numberOrNull(scoring.formPointWeight),
    },
    rewardSettings:
      projection.rewardSettings && typeof projection.rewardSettings === 'object'
        ? projection.rewardSettings
        : null,
    rows: model.rows.map(publicWeightedRow),
    voting: {
      contributionRankingMode: normalizeEdenX1ContributionRankingMode(
        settings.contributionRankingMode
      ),
      votingOpen: settings.votingOpen !== false,
      allowEditing: settings.allowEditing !== false,
      closesAt:
        String(settings.closesAt || '')
          .trim()
          .slice(0, 40) || null,
      showPublicResults: settings.showPublicResults === true,
    },
    publicVoteResults,
    // X2 management results are not part of the public projection. Never reuse
    // old X1 spreadsheet results as a fallback for the current season.
    managementVoteResults: { available: false, totalBallots: 0, totalVotes: 0, rankings: [] },
  };
}

async function readPublicData() {
  const [{ initFirebase, ensureAnonymousAuth }, { importFirestoreLite }] = await Promise.all([
    import('../firebase-eden.js'),
    import('../firebase-sdk.js'),
  ]);
  const setup = initFirebase();
  if (!setup.configured || !setup.app) throw new Error('Firebase is not configured.');
  await ensureAnonymousAuth();
  const firestore = await importFirestoreLite();
  const { getFirestore, doc, getDoc } = firestore;
  const snapshot = await getDoc(doc(getFirestore(setup.app), PUBLIC_PROJECTION_PATH));
  const projection = snapshot.exists() ? snapshot.data() : null;
  const publicData = buildEdenPublicDataFromProjection(projection);
  if (!publicData) throw new Error('No published Eden X2 projection is available.');
  return publicData;
}
export async function loadEdenPublicData({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cached && now - cached.loadedAt < CACHE_MS) return cached.value;
  if (inFlight) return inFlight;
  inFlight = readPublicData()
    .then((value) => {
      cached = { loadedAt: Date.now(), value };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function clearEdenPublicDataCacheForTests() {
  cached = null;
  inFlight = null;
}
