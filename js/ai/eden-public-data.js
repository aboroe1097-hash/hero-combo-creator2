import { importFirestore } from '../firebase-sdk.js';
import {
  buildWeightedContributionRows,
  getWeightedPlayerFamilyKey,
  normalizeEdenX1ContributionRankingMode,
  sanitizePublicR5Adjustments,
} from '../contribution-weighting.js';

const DASHBOARD_PATH = 'vts_admin/dashboard_data';
const CONDUCT_PATH = 'vts_admin/conduct_adjustments/records';
const VOTE_SETTINGS_PATH = 'vts_admin/eden_x1_vote_settings';
const PUBLIC_RESULTS_PATH = 'vts_admin/eden_x1_public_vote_results';
const CACHE_MS = 60_000;

let cached = null;
let inFlight = null;

function integer(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
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
    exGuildContribution: Number(row.contributionExGuild) || 0,
    shieldWalls: integer(row.shieldWalls),
    pathers: integer(row.pathers),
    banners: integer(row.banners),
    conductBonus: Number(row.conductBonus) || 0,
    contributionPoints: Number(row.contributionRewardScore) || 0,
    dutyPoints: Number(row.dutyPoints) || 0,
    conductPoints: Number(row.conductPoints) || 0,
    weightedScore: Number(row.weightedScore) || 0,
    finalRank: integer(row.finalRank) || null,
    baseReward: row.baseReward || 'standard',
    finalReward: row.finalReward || 'standard',
    rewardReason: row.rewardReason || 'rank',
  };
}

async function readConduct(db, firestore, season) {
  const { collection, getDocs, query, where } = firestore;
  const ref = collection(db, CONDUCT_PATH);
  const snapshot = await getDocs(season ? query(ref, where('season', '==', season)) : ref);
  const rows = [];
  snapshot.forEach((item) => rows.push(item.data()));
  return sanitizePublicR5Adjustments(rows, season);
}

async function readManagementVoteResults() {
  try {
    const { loadManagementVotesPayloadWithFallback, summarizeManagementVotePayload } =
      await import('../eden-x1-management-votes.js');
    const payload = await loadManagementVotesPayloadWithFallback({ timeoutMs: 6_000 });
    const summary = summarizeManagementVotePayload(payload);
    return {
      available: true,
      totalBallots: integer(summary.totalBallots),
      totalVotes: integer(summary.totalVotes),
      rankings: (Array.isArray(summary.rankings) ? summary.rankings : [])
        .slice(0, 50)
        .map((row) => ({
          playerName: String(row?.playerName || '')
            .trim()
            .slice(0, 100),
          playerKey: String(row?.playerKey || '')
            .trim()
            .slice(0, 120),
          familyKey: String(getWeightedPlayerFamilyKey(row?.playerKey || '')).slice(0, 120),
          votes: integer(row?.votes),
          voters: Array.isArray(row?.voters) ? row.voters.length : integer(row?.voters),
        }))
        .filter((row) => row.playerName),
    };
  } catch {
    return { available: false, totalBallots: 0, totalVotes: 0, rankings: [] };
  }
}

async function readPublicData() {
  const [{ initFirebase, ensureAnonymousAuth, getDb }, firestore] = await Promise.all([
    import('../firebase.js'),
    importFirestore(),
  ]);
  const setup = initFirebase();
  if (!setup.configured) throw new Error('Firebase is not configured.');
  await ensureAnonymousAuth();
  const db = getDb();
  if (!db) throw new Error('Firebase is not ready.');
  const { doc, getDoc } = firestore;
  const [dashboardSnap, settingsSnap, publicResultsSnap, managementVoteResults] = await Promise.all(
    [
      getDoc(doc(db, DASHBOARD_PATH)),
      getDoc(doc(db, VOTE_SETTINGS_PATH)).catch(() => null),
      getDoc(doc(db, PUBLIC_RESULTS_PATH)).catch(() => null),
      readManagementVoteResults(),
    ]
  );
  if (!dashboardSnap.exists()) throw new Error('No public Eden dashboard data is available.');

  const dashboard = dashboardSnap.data() || {};
  const season = String(dashboard.r5Season || 'X1')
    .trim()
    .slice(0, 40);
  const conduct = await readConduct(db, firestore, season).catch(() => []);
  const model = buildWeightedContributionRows({
    contributionRecords: Array.isArray(dashboard.contributionRecords)
      ? dashboard.contributionRecords
      : [],
    dutyRecords: Array.isArray(dashboard.dutyRecords) ? dashboard.dutyRecords : [],
    exGuildContributions: Array.isArray(dashboard.exGuildContributions)
      ? dashboard.exGuildContributions
      : [],
    r5Adjustments: conduct,
    season,
  });
  const settings = settingsSnap?.exists?.() ? settingsSnap.data() || {} : {};
  const publicVoteResults = normalizePublicVoteResults(
    publicResultsSnap?.exists?.() ? publicResultsSnap.data() : {}
  );

  return {
    season,
    asOf:
      String(dashboard.updatedAt || dashboard.date || '')
        .trim()
        .slice(0, 40) || null,
    attackCount: Array.isArray(dashboard.attacks) ? dashboard.attacks.length : 0,
    weights: model.weights,
    premiumCutoff: model.premiumCutoff,
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
    managementVoteResults,
  };
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
