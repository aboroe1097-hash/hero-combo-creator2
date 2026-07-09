import {
  buildWeightedContributionRows,
  getWeightedPlayerFamilyKey,
  normalizeWeightedR5Adjustments,
  sanitizePublicR5Adjustments,
} from './contribution-weighting.js';
import {
  translations,
  loadTranslationsForLanguage,
  applyLanguageDirection,
} from './translations.js?v=20260709_191406';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import {
  formatDatasetStructureLabel,
  getDatasetStructureTarget,
  normalizeStructureTarget,
} from './ocr-shared.js';
import { parseGameTimeDateMs } from './ocr-time-filter.js';
import { compareConsistencyScores, scoreConsistencyValues } from './consistency-score.js';
import {
  compactPlayerIdentity,
  resolveCanonicalPlayerName,
  stripGuildTagsFromPlayerName,
} from './ocr-name-normalizer.js';
import { renderSpecialPlayerTag } from './player-tags.js';
import {
  loadManagementVotesPayloadWithFallback,
  managementVoteCandidateVariants,
  summarizeManagementVotePayload,
} from './eden-x1-management-votes.js';

const APP_VERSION = '13.1.6';
const FS_PATH = 'vts_admin/dashboard_data';
const FS_ROSTER_PATH = 'vts_admin/roster_data';
const R5_COLLECTION_PATH = 'vts_admin/conduct_adjustments/records';
const EDEN_X1_VOTES_COLLECTION_PATH = 'vts_admin/eden_x1_votes/records';
const EDEN_X1_VOTE_HISTORY_COLLECTION_PATH = 'vts_admin/eden_x1_vote_history/records';
const EDEN_X1_VOTE_SETTINGS_DOC_PATH = 'vts_admin/eden_x1_vote_settings';
const EDEN_X1_TEAM_VOTE_CATEGORY = 'team_players';
const EDEN_X1_VOTE_LOCAL_PREFIX = 'vts_eden_x1_vote';
const EDEN_X1_VOTE_CANDIDATE_INPUT_IDS = [
  'edenX1CandidateName',
  'edenX1CandidateName2',
  'edenX1CandidateName3',
  'edenX1CandidateName4',
];
const EDEN_X1_VOTE_CANDIDATE_LIMIT = 4;
const EDEN_X1_VOTE_HELPER_MOBILE_VISIBLE_LIMIT = 3;
const EDEN_X1_VOTE_HELPER_VISIBLE_LIMIT = 5;
const EDEN_X1_VOTE_HELPER_FULL_LIMIT = 10;
const EDEN_X1_MANAGEMENT_VOTE_WINNER_LIMIT = 3;
const EDEN_X1_MANAGEMENT_VOTE_STATUS = 'Voted By Management';
const EDEN_X1_ATTACK_WINDOW_DAYS = new Set([0, 2, 4]);
const EDEN_X1_ATTACK_WINDOW_EPOCH_DOW = 4;
const MS_PER_DAY = 86_400_000;
const THEME_STORAGE_KEY = 'vts_theme';
const WEIGHTED_CONTRIBUTION_COMPACT_KEY = 'vts_weighted_contribution_compact';
const EDEN_X1_TEST_MODE = Boolean(globalThis.VTS_EDEN_X1_TEST_MODE);

let currentLang = 'en';
let currentRows = [];
let currentForfeitedRewardIdentities = createRewardPriorityIdentitySet();
let currentRecordLabel = '';
let currentSeason = '';
let currentMemberOptions = [];
let currentRewardView = 'team';
let currentTableSearch = '';
let currentTableSort = null;
let rewardTableRenderToken = 0;
let rewardFlowReady = false;
let weightedContributionCompactOverride = null;
let weightedPopoverDismissalBound = false;
let weightedPopoverOpenedAt = 0;
let publicDashboardData = null;
let publicAttackRows = [];
let publicPlayerRows = [];
let publicStructureRows = [];
let localizedRenderToken = 0;
let currentPublicTableSearch = '';
let currentPublicTableSort = { col: 'finalRank', dir: 'asc' };
let currentPublicStatsSearch = '';
let edenVoteWriteContext = null;
let edenVoteSettings = { votingOpen: true, allowEditing: true };
let edenVotePointerSubmitUntil = 0;
let pendingPartialEdenVoteSignature = '';
let edenVoteInfoDismissalBound = false;
let currentManagementVoteResults = {
  status: 'idle',
  totalBallots: 0,
  totalVotes: 0,
  winners: [],
  rankings: [],
  error: '',
};
let managementVoteLoadToken = 0;

function $(id) {
  return document.getElementById(id);
}

function esc(str) {
  if (!str) return '';
  const el = document.createElement('div');
  el.textContent = String(str);
  return el.innerHTML;
}

function t(key, vars = {}) {
  const dict = translations[currentLang] || translations.en || {};
  let value = dict[key] || translations.en?.[key] || key;
  Object.entries({ version: APP_VERSION, ...vars }).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });
  return value;
}

function valueOf(input) {
  const n = Number(input || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatSignedNumber(n) {
  if (n > 0) return `+${n}`;
  return String(n);
}

function formatScore(value) {
  return valueOf(value).toLocaleString();
}

function compactValue(value) {
  const n = valueOf(value);
  const abs = Math.abs(n);
  if (abs >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (abs >= 1000000) return `${(n / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}M`;
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString();
}

function formatWeightedScore(value) {
  return valueOf(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function conductBonusValue(row) {
  const explicit = Number(row?.conductBonus);
  if (Number.isFinite(explicit)) return explicit;
  const points = Number(row?.conductPoints);
  return Number.isFinite(points) ? points / 10000 : 0;
}

function defaultEdenSeason() {
  return `season-${new Date().getUTCFullYear()}`;
}

function edenVoteSeason() {
  return String(currentSeason || publicDashboardData?.r5Season || defaultEdenSeason()).trim();
}

function edenVoteLocalKey(season = edenVoteSeason()) {
  return `${EDEN_X1_VOTE_LOCAL_PREFIX}_${season}_${EDEN_X1_TEAM_VOTE_CATEGORY}`;
}

function edenVoteDocId(season, voterKey) {
  return `${String(season || '').trim()}__${EDEN_X1_TEAM_VOTE_CATEGORY}__${String(voterKey || '').trim()}`
    .replace(/\//g, '_')
    .slice(0, 180);
}

function readLocalEdenVote() {
  try {
    return JSON.parse(localStorage.getItem(edenVoteLocalKey()) || 'null');
  } catch {
    return null;
  }
}

function writeLocalEdenVote(vote) {
  try {
    localStorage.setItem(edenVoteLocalKey(vote.season), JSON.stringify(vote));
  } catch {
    // Local recall is a convenience only; the cloud write is the source record.
  }
}

function rosterMemberName(member) {
  if (!member) return '';
  if (typeof member === 'string') return stripGuildTagsFromPlayerName(member);
  return stripGuildTagsFromPlayerName(member.name || member.playerName || '');
}

function addMemberOption(map, name, key = '') {
  const playerName = String(name || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!playerName) return;
  const playerKey = String(key || compactPlayerIdentity(playerName)).trim();
  if (!playerKey || map.has(playerKey)) return;
  map.set(playerKey, { playerKey, playerName });
}

function collectEdenMemberOptions(data = {}, modelRows = []) {
  const options = new Map();
  const snapshots = Array.isArray(data.rosterSnapshots) ? data.rosterSnapshots : [];
  const latestRoster = snapshots.length ? snapshots[snapshots.length - 1]?.members || [] : [];
  latestRoster.forEach((member) => addMemberOption(options, rosterMemberName(member)));

  const registryPlayers = Array.isArray(data.playerRegistry?.players)
    ? data.playerRegistry.players
    : [];
  registryPlayers.forEach((player) => addMemberOption(options, player.canonical || player.name));

  modelRows.forEach((row) =>
    addMemberOption(options, row.playerName || row.sourceName, row.playerKey)
  );

  (Array.isArray(data.contributionRecords) ? data.contributionRecords : []).forEach((record) => {
    (Array.isArray(record.entries) ? record.entries : []).forEach((entry) => {
      addMemberOption(options, entry.name || entry.playerName);
    });
  });

  (Array.isArray(data.attacks) ? data.attacks : []).forEach((attack) => {
    (Array.isArray(attack.players) ? attack.players : []).forEach((player) => {
      addMemberOption(options, player.name || player.playerName);
    });
  });

  (Array.isArray(data.dutyRecords) ? data.dutyRecords : []).forEach((record) => {
    (Array.isArray(record.entries) ? record.entries : []).forEach((entry) => {
      addMemberOption(options, entry.confirmed || entry.name || entry.original);
    });
  });

  return Array.from(options.values()).sort((a, b) =>
    a.playerName.localeCompare(b.playerName, currentLang || 'en', { sensitivity: 'base' })
  );
}

function edenMemberEditDistance(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  let prev = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = next;
  }
  return prev[right.length];
}

function scoreEdenMemberOption(value, option) {
  const raw = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  const playerName = String(option?.playerName || '');
  if (!raw || !playerName) return 0;
  const rawLower = raw.toLowerCase();
  const nameLower = playerName.toLowerCase();
  const compact = compactPlayerIdentity(raw);
  const playerKey = String(option.playerKey || compactPlayerIdentity(playerName));
  if (!compact) return 0;
  if (playerName === raw) return 120;
  if (nameLower === rawLower) return 118;
  if (playerKey === compact) return 116;
  if (nameLower.startsWith(rawLower)) return 104;
  if (playerKey.startsWith(compact)) return 102;
  if (nameLower.includes(rawLower)) return 94;
  if (playerKey.includes(compact)) return 92;
  if (compact.length >= 4 && playerKey.length >= 4) {
    const distance = edenMemberEditDistance(compact, playerKey);
    const maxDistance = compact.length >= 8 ? 2 : 1;
    if (distance <= maxDistance) return 90 - distance * 4;
  }
  return 0;
}

function getEdenMemberMatches(value, limit = 5) {
  const scored = currentMemberOptions
    .map((option) => ({
      ...option,
      score: scoreEdenMemberOption(value, option),
    }))
    .filter((option) => option.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.playerName.localeCompare(b.playerName, currentLang || 'en', { sensitivity: 'base' })
    );
  return scored.slice(0, limit);
}

function getPublicStatsMatches(value, limit = 6) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  const merged = new Map();
  const addOption = (option, source = '') => {
    const playerName = String(option?.playerName || option?.name || '').trim();
    const playerKey = String(
      option?.playerKey || option?.key || compactPlayerIdentity(playerName)
    ).trim();
    if (!playerName || !playerKey || merged.has(playerKey)) return;
    const score = scoreEdenMemberOption(raw, { playerKey, playerName });
    if (score <= 0) return;
    merged.set(playerKey, {
      playerKey,
      playerName,
      source,
      score,
    });
  };
  currentMemberOptions.forEach((option) => addOption(option, 'member'));
  publicPlayerRows.forEach((row) =>
    addOption(
      {
        playerKey: row.key,
        playerName: row.name,
      },
      'activity'
    )
  );
  return Array.from(merged.values())
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.playerName.localeCompare(b.playerName, currentLang || 'en', { sensitivity: 'base' })
    )
    .slice(0, limit);
}

function findEdenMemberOption(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const compact = compactPlayerIdentity(raw);
  const exact =
    currentMemberOptions.find((row) => row.playerName === raw) ||
    currentMemberOptions.find((row) => row.playerKey === compact) ||
    currentMemberOptions.find((row) => row.playerName.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const matches = getEdenMemberMatches(raw, 2);
  const [best, second] = matches;
  if (!best || best.score < 86) return null;
  if (second && best.score - second.score < 6) return null;
  return best;
}

function resolveEdenManagementVoteCandidate(rawName) {
  const candidateVariants = managementVoteCandidateVariants(rawName);
  for (const candidateName of candidateVariants) {
    const option = findEdenMemberOption(candidateName);
    if (!option) continue;
    return {
      playerKey: option.playerKey,
      playerName: option.playerName,
      rawName,
      matched: true,
    };
  }

  const fallbackName =
    candidateVariants[0] === '\ua9c1\u0f3a Kika \u0f3b\ua9c2'
      ? '\ua9c1\u0f3a Kika \u0f3b\ua9c2'
      : candidateVariants.at(-1) || String(rawName || '');
  const fallbackKey =
    fallbackName === '\ua9c1\u0f3a Kika \u0f3b\ua9c2'
      ? 'kikaalt'
      : compactPlayerIdentity(fallbackName);
  if (!fallbackKey) return null;
  return {
    playerKey: fallbackKey,
    playerName: fallbackName,
    rawName,
    matched: false,
  };
}

function summarizeEdenManagementVotes(payloadOrRows) {
  return summarizeManagementVotePayload(payloadOrRows, {
    limit: EDEN_X1_MANAGEMENT_VOTE_WINNER_LIMIT,
    resolveCandidate: resolveEdenManagementVoteCandidate,
  });
}

function applyEdenManagementVoteResults(nextResults, status = 'loaded') {
  currentManagementVoteResults = {
    status,
    totalBallots: valueOf(nextResults?.totalBallots),
    totalVotes: valueOf(nextResults?.totalVotes),
    winners: Array.isArray(nextResults?.winners) ? nextResults.winners : [],
    rankings: Array.isArray(nextResults?.rankings) ? nextResults.rankings : [],
    error: nextResults?.error || '',
  };
  if (rewardFlowReady && currentRewardView === 'management') {
    renderCurrentTable({ fromSchedule: true });
  }
}

async function loadEdenManagementVoteResults() {
  const token = (managementVoteLoadToken += 1);
  applyEdenManagementVoteResults({ winners: [], rankings: [] }, 'loading');
  try {
    const payload = await loadManagementVotesPayloadWithFallback();
    if (token !== managementVoteLoadToken) return;
    applyEdenManagementVoteResults(summarizeEdenManagementVotes(payload), 'loaded');
  } catch (err) {
    if (token !== managementVoteLoadToken) return;
    console.warn('Eden X1 management vote Sheet failed:', err);
    applyEdenManagementVoteResults(
      {
        winners: [],
        rankings: [],
        error: err?.message || String(err || 'unknown error'),
      },
      'error'
    );
  }
}

function renderEdenMemberSuggestionList(value, targetId) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const exact = findEdenMemberOption(raw);
  const matches = getEdenMemberMatches(raw, 5);
  const shown = exact
    ? [exact, ...matches.filter((row) => row.playerKey !== exact.playerKey)].slice(0, 5)
    : matches;
  if (!shown.length)
    return `<span class="eden-x1-vote-suggestion-empty">${esc(t('edenX1VoteNoSimilarMember'))}</span>`;
  return shown
    .map((row, index) => {
      const isResolved = exact?.playerKey === row.playerKey;
      const label =
        isResolved && index === 0 ? t('edenX1VoteMatchBest') : t('edenX1VoteMatchSimilar');
      return `<button class="eden-x1-vote-suggestion" type="button" data-eden-vote-suggest="${esc(row.playerName)}" data-eden-vote-target="${esc(targetId)}">
        <span>${renderTaggedPlayerName(row)}</span>
        <em>${esc(label)}</em>
      </button>`;
    })
    .join('');
}

function updateEdenVoteInputSuggestions(host, inputId) {
  const input = host?.querySelector(`#${inputId}`);
  const box = host?.querySelector(`[data-eden-vote-suggestions-for="${inputId}"]`);
  if (!input || !box) return;
  box.innerHTML = renderEdenMemberSuggestionList(input.value, inputId);
}

function clearEdenVoteInputSuggestions(host, inputId) {
  const box = host?.querySelector(`[data-eden-vote-suggestions-for="${inputId}"]`);
  if (box) box.innerHTML = '';
}

function updateEdenVoteInputConfirmation(host, inputId, option = null) {
  const chip = host?.querySelector(`[data-eden-vote-confirm-for="${inputId}"]`);
  if (!chip) return;
  const resolved = option || findEdenMemberOption(host?.querySelector(`#${inputId}`)?.value);
  if (!resolved) {
    chip.innerHTML = '';
    if (inputId === 'edenX1VoterName') updateEdenVoteSelfPickButton(host, null);
    return;
  }
  const clearButton = EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.includes(inputId)
    ? `<button class="eden-x1-vote-confirm-clear" type="button" data-eden-vote-clear="${esc(inputId)}" aria-label="${esc(t('edenX1VoteClearPicked', { player: resolved.playerName }))}">x</button>`
    : '';
  chip.innerHTML = `<span class="eden-x1-vote-confirm-chip">${esc(t('edenX1VoteSelfConfirmed', { player: resolved.playerName }))}${clearButton}</span>`;
  if (inputId === 'edenX1VoterName') updateEdenVoteSelfPickButton(host, resolved);
}

function resetEdenVoteInputState(host, inputId) {
  const input = host?.querySelector(`#${inputId}`);
  if (!input) return;
  input.classList.remove('is-invalid', 'is-invalid-nudge');
  input.removeAttribute('aria-invalid');
  input.closest('.eden-x1-vote-field')?.classList.remove('is-invalid');
  updateEdenVoteInputConfirmation(host, inputId);
}

function markEdenVoteInputInvalid(host, inputId, options = {}) {
  const input = host?.querySelector(`#${inputId}`);
  if (!input) return;
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  input.closest('.eden-x1-vote-field')?.classList.add('is-invalid');
  updateEdenVoteInputConfirmation(host, inputId, null);
  if (!options.nudge) return;
  input.classList.remove('is-invalid-nudge');
  void input.offsetWidth;
  input.classList.add('is-invalid-nudge');
}

function applyEdenVoteInputResolved(host, inputId, option) {
  const input = host?.querySelector(`#${inputId}`);
  if (!input || !option) return;
  input.value = option.playerName;
  input.classList.remove('is-invalid', 'is-invalid-nudge');
  input.removeAttribute('aria-invalid');
  input.closest('.eden-x1-vote-field')?.classList.remove('is-invalid');
  updateEdenVoteInputConfirmation(host, inputId, option);
}

function clearEdenVotePickedInput(host, inputId) {
  pendingPartialEdenVoteSignature = '';
  const input = host?.querySelector(`#${inputId}`);
  if (!input) return;
  input.value = '';
  clearEdenVoteInputSuggestions(host, inputId);
  resetEdenVoteInputState(host, inputId);
  if (EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.includes(inputId)) {
    const detail = host.querySelector('#edenX1VoteCandidateDetail');
    if (detail && host.dataset.edenVoteInspectInputId === inputId) detail.dataset.open = '0';
    updateEdenVoteCandidateDetail(host);
  }
  input.focus();
}

function resolveEdenVoteInput(host, inputId, options = {}) {
  const input = host?.querySelector(`#${inputId}`);
  if (!input) return null;
  const option = findEdenMemberOption(input.value);
  if (option) applyEdenVoteInputResolved(host, inputId, option);
  else if (options.markInvalid && input.value.trim())
    markEdenVoteInputInvalid(host, inputId, { nudge: options.nudgeInvalid });
  else resetEdenVoteInputState(host, inputId);
  if (options.closeSuggestions) clearEdenVoteInputSuggestions(host, inputId);
  else updateEdenVoteInputSuggestions(host, inputId);
  return option;
}

function edenVoteCandidateSignature(voter, candidateKeys) {
  return [voter?.playerKey || '', ...candidateKeys].join('|');
}

function currentEdenPartialVoteSignature(host) {
  const voter = findEdenMemberOption(host?.querySelector('#edenX1VoterName')?.value);
  if (!voter) return '';
  const candidateKeys = EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.map(
    (id) => findEdenMemberOption(host?.querySelector(`#${id}`)?.value)?.playerKey
  ).filter(Boolean);
  if (!candidateKeys.length || candidateKeys.length >= EDEN_X1_VOTE_CANDIDATE_LIMIT) return '';
  return edenVoteCandidateSignature(voter, candidateKeys);
}

function resetPendingPartialEdenVoteSignatureIfChanged(host) {
  if (
    pendingPartialEdenVoteSignature &&
    pendingPartialEdenVoteSignature === currentEdenPartialVoteSignature(host)
  ) {
    return;
  }
  pendingPartialEdenVoteSignature = '';
}

function applyEdenVoteSelfPick(host, source = null) {
  pendingPartialEdenVoteSignature = '';
  const sourceKey = source?.getAttribute?.('data-eden-vote-self-key');
  const sourceName = source?.getAttribute?.('data-eden-vote-self-name');
  const voter =
    findEdenMemberOptionByKey(sourceKey) ||
    findEdenMemberOption(sourceName) ||
    findEdenMemberOption(host?.querySelector('#edenX1VoterName')?.value);
  const inputs = getEdenVoteCandidateInputs(host);
  const existingInput = inputs.find(
    (candidateInput) => findEdenMemberOption(candidateInput.value)?.playerKey === voter?.playerKey
  );
  const input = existingInput || inputs.find((candidateInput) => !candidateInput.value.trim());
  if (!voter || !input) return;
  input.value = voter.playerName;
  applyEdenVoteInputResolved(host, input.id, voter);
  host.dataset.edenVoteInspectInputId = input.id;
  clearEdenVoteInputSuggestions(host, input.id);
  const detail = host.querySelector('#edenX1VoteCandidateDetail');
  if (detail) detail.dataset.open = '1';
  updateEdenVoteCandidateDetail(host);
  input.focus();
}

function bindEdenVoteSelfPickButton(host, button) {
  if (!button || button.dataset.edenVoteSelfPickBound) return;
  button.dataset.edenVoteSelfPickBound = '1';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyEdenVoteSelfPick(host, button);
  });
}

function updateEdenVoteSelfPickButton(host, option) {
  const button = host?.querySelector('#edenX1VoteSelfPickBtn');
  if (!button) return;
  if (!option) {
    button.hidden = true;
    button.disabled = true;
    button.removeAttribute('data-eden-vote-self-key');
    button.removeAttribute('data-eden-vote-self-name');
    return;
  }
  button.hidden = false;
  button.disabled = false;
  button.setAttribute('data-eden-vote-self-key', option.playerKey);
  button.setAttribute('data-eden-vote-self-name', option.playerName);
  bindEdenVoteSelfPickButton(host, button);
}

function readSavedEdenVoteCandidateNames(vote) {
  return getEdenVoteSavedSummary(vote).candidateNames;
}

function findEdenMemberOptionByKey(key) {
  const normalized = String(key || '').trim();
  if (!normalized) return null;
  return currentMemberOptions.find((row) => row.playerKey === normalized) || null;
}

function edenSavedVoteName(name, key) {
  const clean = String(name || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean) return clean;
  return findEdenMemberOptionByKey(key)?.playerName || '';
}

function getEdenVoteSavedSummary(vote) {
  const names = Array.isArray(vote?.candidateNames)
    ? vote.candidateNames
    : [vote?.candidateName, vote?.candidateName2, vote?.candidateName3, vote?.candidateName4];
  const keys = Array.isArray(vote?.candidateKeys)
    ? vote.candidateKeys
    : [vote?.candidateKey, vote?.candidateKey2, vote?.candidateKey3, vote?.candidateKey4];
  const candidateNames = names
    .map((name, index) => edenSavedVoteName(name, keys[index]))
    .filter(Boolean)
    .slice(0, EDEN_X1_VOTE_CANDIDATE_LIMIT);
  return {
    voterName: edenSavedVoteName(vote?.voterName, vote?.voterKey),
    candidateNames,
  };
}

function edenVoteSavedStatusText(vote) {
  const summary = getEdenVoteSavedSummary(vote);
  if (!summary.voterName || !summary.candidateNames.length) return '';
  return `${t('edenX1VoteSavedDevice', {
    voter: summary.voterName,
    candidates: summary.candidateNames.join(', '),
  })} ${t('edenX1VoteResultsNote')}`;
}

function getEdenVoteCandidateInputs(host) {
  return EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.map((id) => host?.querySelector(`#${id}`)).filter(
    Boolean
  );
}

function applyEdenVotePickToForm(host, pick) {
  if (!host || !pick) return false;
  const input =
    getEdenVoteCandidateInputs(host).find((candidateInput) => !candidateInput.value.trim()) ||
    host.querySelector('#edenX1CandidateName');
  if (!input) return false;
  pendingPartialEdenVoteSignature = '';
  const selectedName = pick.getAttribute('data-eden-vote-pick') || '';
  const option = findEdenMemberOption(selectedName);
  input.value = selectedName;
  if (option) applyEdenVoteInputResolved(host, input.id, option);
  host.dataset.edenVoteInspectInputId = input.id;
  clearEdenVoteInputSuggestions(host, input.id);
  const detail = host.querySelector('#edenX1VoteCandidateDetail');
  if (detail) detail.dataset.open = '1';
  updateEdenVoteCandidateDetail(host);
  input.focus();
  return true;
}

function normalizeEdenVoteSettings(settings = {}) {
  return {
    votingOpen: settings.votingOpen !== false,
    allowEditing: settings.allowEditing !== false,
    showPublicResults: settings.showPublicResults === true,
    showVoterNames: settings.showVoterNames === true,
  };
}

function hasLocalEdenVoteForCurrentSeason() {
  const saved = readLocalEdenVote();
  return Boolean(
    saved &&
    saved.season === edenVoteSeason() &&
    getEdenVoteSavedSummary(saved).candidateNames.length
  );
}

function getEdenVoteDetailInput(host) {
  const preferredId = host?.dataset?.edenVoteInspectInputId;
  const preferred = preferredId ? host.querySelector(`#${preferredId}`) : null;
  if (preferred && findEdenMemberOption(preferred.value)) return preferred;
  return (
    getEdenVoteCandidateInputs(host).find((input) => findEdenMemberOption(input.value)) || null
  );
}

function getEdenWeightedRowForPlayer(playerKey) {
  const key = String(playerKey || '').trim();
  if (!key) return null;
  return (
    currentRows.find((row) => row.playerKey === key) ||
    currentRows.find((row) => compactPlayerIdentity(row.playerName) === key) ||
    null
  );
}

function getEdenPublicPlayerForKey(playerKey, playerName = '') {
  const displayName = String(playerName || '').trim();
  const keys = [
    String(playerKey || '').trim(),
    displayName ? publicPlayerKey(displayName) : '',
    displayName ? compactPlayerIdentity(displayName) : '',
  ].filter(Boolean);
  for (const key of [...new Set(keys)]) {
    const match = publicPlayerRows.find((row) => row.key === key);
    if (match) return match;
  }
  return null;
}

function rankedEdenBannerPathRows(limit = EDEN_X1_VOTE_HELPER_FULL_LIMIT) {
  return currentRows
    .map((row) => {
      const banners = valueOf(row.banners);
      const pathers = valueOf(row.pathers);
      return {
        ...row,
        banners,
        pathers,
        supportTotal: banners + pathers,
      };
    })
    .filter((row) => row.supportTotal > 0)
    .sort(
      (a, b) =>
        valueOf(b.supportTotal) - valueOf(a.supportTotal) ||
        valueOf(b.banners) - valueOf(a.banners) ||
        valueOf(b.pathers) - valueOf(a.pathers) ||
        valueOf(b.weightedScore) - valueOf(a.weightedScore) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    )
    .slice(0, limit)
    .map((row) => ({
      key: row.playerKey || compactPlayerIdentity(row.playerName),
      name: row.playerName,
      value: t('edenX1VoteBannerPathValue', {
        banners: row.banners.toLocaleString(),
        pathers: row.pathers.toLocaleString(),
      }),
    }));
}

function rankedEdenR5BonusRows(limit = EDEN_X1_VOTE_HELPER_FULL_LIMIT) {
  return currentRows
    .map((row) => ({
      ...row,
      r5Bonus: conductBonusValue(row),
    }))
    .filter((row) => row.r5Bonus > 0)
    .sort(
      (a, b) =>
        valueOf(b.r5Bonus) - valueOf(a.r5Bonus) ||
        valueOf(b.weightedScore) - valueOf(a.weightedScore) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    )
    .slice(0, limit)
    .map((row) => ({
      key: row.playerKey || compactPlayerIdentity(row.playerName),
      name: row.playerName,
      value: t('edenX1VoteR5BonusValue', { points: formatSignedNumber(row.r5Bonus) }),
    }));
}

function rankedEdenStructureHelpRows(limit = EDEN_X1_VOTE_HELPER_FULL_LIMIT) {
  return publicPlayerRows
    .filter((row) => valueOf(row.participation_count) > 0)
    .slice()
    .sort(
      (a, b) =>
        valueOf(b.participation_count) - valueOf(a.participation_count) ||
        valueOf(b.unique_structures_count) - valueOf(a.unique_structures_count) ||
        valueOf(b.total_demolition) - valueOf(a.total_demolition) ||
        String(a.name || '').localeCompare(String(b.name || ''))
    )
    .slice(0, limit)
    .map((row) => ({
      key: row.key,
      name: row.name,
      value: `${valueOf(row.participation_count).toLocaleString()} hits`,
    }));
}

function rankedEdenBuildingMvpRows(limit = EDEN_X1_VOTE_HELPER_FULL_LIMIT) {
  const mvpMap = new Map();
  (Array.isArray(publicAttackRows) ? publicAttackRows : []).forEach((attack) => {
    const players = publicAttackPlayers(attack);
    const perPlayer = new Map();
    players.forEach((entry) => {
      const name = publicPlayerName(entry, players);
      const key = publicPlayerKey(name);
      const demo = valueOf(entry?.value ?? entry?.val ?? entry?.demolition ?? entry?.total);
      if (demo <= 0) return;
      if (!perPlayer.has(key)) {
        perPlayer.set(key, { key, name, total: 0 });
      }
      perPlayer.get(key).total += demo;
    });
    const entries = [...perPlayer.values()];
    if (!entries.length) return;
    const topDemo = Math.max(...entries.map((entry) => entry.total));
    entries
      .filter((entry) => entry.total === topDemo)
      .forEach((winner) => {
        if (!mvpMap.has(winner.key)) {
          mvpMap.set(winner.key, {
            key: winner.key,
            name: winner.name,
            wins: 0,
            total: 0,
            structures: new Set(),
          });
        }
        const row = mvpMap.get(winner.key);
        row.wins += 1;
        row.total += winner.total;
        row.structures.add(publicStructureKey(attack));
      });
  });
  return [...mvpMap.values()]
    .sort(
      (a, b) =>
        valueOf(b.wins) - valueOf(a.wins) ||
        valueOf(b.total) - valueOf(a.total) ||
        valueOf(b.structures.size) - valueOf(a.structures.size) ||
        String(a.name || '').localeCompare(String(b.name || ''))
    )
    .slice(0, limit)
    .map((row) => ({
      key: row.key,
      name: row.name,
      value: t('edenX1VoteBuildingMvpValue', { count: row.wins.toLocaleString() }),
    }));
}

function buildEdenCurrentStreakRows(attacks, players) {
  const ordered = sortPublicAttacks(attacks).slice().reverse();
  if (!ordered.length) return [];
  const attackSets = ordered.map((attack) => {
    const entries = publicAttackPlayers(attack);
    return new Set(
      entries.map((player) => publicPlayerKey(publicPlayerName(player, entries))).filter(Boolean)
    );
  });
  return (Array.isArray(players) ? players : []).map((player) => {
    let streak = 0;
    for (let index = attackSets.length - 1; index >= 0; index -= 1) {
      if (!attackSets[index].has(player.key)) break;
      streak += 1;
    }
    const missedLatest =
      attackSets.length > 1 &&
      !attackSets[attackSets.length - 1].has(player.key) &&
      attackSets.slice(0, -1).some((set) => set.has(player.key));
    return { ...player, streak, missedLatest };
  });
}

function sortEdenStreakRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row.streak > 0)
    .sort(
      (a, b) =>
        valueOf(b.streak) - valueOf(a.streak) ||
        valueOf(b.participation_count) - valueOf(a.participation_count) ||
        valueOf(b.total_demolition) - valueOf(a.total_demolition) ||
        String(a.name || '').localeCompare(String(b.name || ''))
    );
}

function rankedEdenStreakRows(limit = EDEN_X1_VOTE_HELPER_FULL_LIMIT) {
  return sortEdenStreakRows(buildEdenCurrentStreakRows(publicAttackRows, publicPlayerRows))
    .slice(0, limit)
    .map((row) => ({
      key: row.key,
      name: row.name,
      value: t('edenX1StreakCount', { count: row.streak }),
    }));
}

function shortEdenVoteHelperName(row) {
  const rawName = readPlayerDisplayName(row);
  const key = String(row?.key || row?.playerKey || compactPlayerIdentity(rawName)).toLowerCase();
  return key.startsWith('kika') ? 'Kika' : rawName;
}

function edenVoteHelperDisplayRow(row) {
  const shortName = shortEdenVoteHelperName(row);
  return {
    ...row,
    playerKey: row?.playerKey || row?.key,
    playerName: shortName,
    name: shortName,
    displayName: shortName,
    sourceName: row?.name,
  };
}

function isEdenVoteHelperMobileViewport() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 680px)').matches
  );
}

function edenVoteHelperInitialLimit() {
  return isEdenVoteHelperMobileViewport()
    ? EDEN_X1_VOTE_HELPER_MOBILE_VISIBLE_LIMIT
    : EDEN_X1_VOTE_HELPER_VISIBLE_LIMIT;
}

function edenVoteHelperNextLimit(currentLimit, totalRows) {
  const total = Math.min(Number(totalRows || 0), EDEN_X1_VOTE_HELPER_FULL_LIMIT);
  const base = Math.min(edenVoteHelperInitialLimit(), total);
  const mid = Math.min(EDEN_X1_VOTE_HELPER_VISIBLE_LIMIT, total);
  const full = Math.min(EDEN_X1_VOTE_HELPER_FULL_LIMIT, total);
  const current = Math.max(base, Math.min(Number(currentLimit || base), full));
  if (isEdenVoteHelperMobileViewport()) {
    if (current < mid) return mid;
    if (current < full) return full;
    return base;
  }
  return current < full ? full : base;
}

function edenVoteHelperToggleLabel(currentLimit, totalRows) {
  const nextLimit = edenVoteHelperNextLimit(currentLimit, totalRows);
  if (nextLimit >= Math.min(EDEN_X1_VOTE_HELPER_FULL_LIMIT, Number(totalRows || 0))) {
    return t('edenX1VoteShowTop10');
  }
  if (nextLimit >= EDEN_X1_VOTE_HELPER_VISIBLE_LIMIT) return t('edenX1VoteShowTop5');
  return t('edenX1VoteShowTop3');
}

function edenVoteHelperToggleAttrs(currentLimit, totalRows) {
  const base = Math.min(edenVoteHelperInitialLimit(), Number(totalRows || 0));
  const label = esc(edenVoteHelperToggleLabel(currentLimit, totalRows));
  const expanded = Number(currentLimit || base) > base;
  return `aria-expanded="${expanded ? 'true' : 'false'}" aria-label="${label}" title="${label}" data-eden-vote-helper-limit="${Number(currentLimit || base)}"`;
}

function setEdenVoteHelperToggleState(button, currentLimit, totalRows) {
  if (!button) return;
  const base = Math.min(edenVoteHelperInitialLimit(), Number(totalRows || 0));
  const full = Math.min(EDEN_X1_VOTE_HELPER_FULL_LIMIT, Number(totalRows || 0));
  const limit = Number(currentLimit || base);
  const label = edenVoteHelperToggleLabel(limit, totalRows);
  button.setAttribute('aria-expanded', limit > base ? 'true' : 'false');
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.setAttribute('data-eden-vote-helper-limit', String(limit));
  button.classList.toggle('is-expanded', limit >= full && full > base);
}

function toggleEdenVoteHelperRows(helperToggle) {
  if (!helperToggle) return;
  const card = helperToggle.closest('.eden-x1-vote-helper-card');
  if (!card) return;
  const rows = Array.from(card.querySelectorAll('.eden-x1-vote-helper-row'));
  const currentLimit = Number(
    card.dataset.helperVisibleLimit || helperToggle.dataset.edenVoteHelperLimit
  );
  const nextLimit = edenVoteHelperNextLimit(currentLimit, rows.length);
  card.dataset.helperVisibleLimit = String(nextLimit);
  rows.forEach((row, index) => {
    row.hidden = index >= nextLimit;
  });
  setEdenVoteHelperToggleState(helperToggle, nextLimit, rows.length);
}

function renderEdenVotePickList(title, hint, rows) {
  const initialLimit = Math.min(edenVoteHelperInitialLimit(), EDEN_X1_VOTE_HELPER_FULL_LIMIT);
  const limitedRows = rows.slice(0, EDEN_X1_VOTE_HELPER_FULL_LIMIT);
  const hasMore = limitedRows.length > initialLimit;
  const body = rows.length
    ? limitedRows
        .map(
          (
            row,
            index
          ) => `<button class="eden-x1-vote-helper-row" type="button" data-eden-vote-pick="${esc(row.name)}" data-eden-vote-player-key="${esc(row.key || row.playerKey || publicPlayerKey(row.name))}"${index >= initialLimit ? ' hidden' : ''}>
            <span class="eden-x1-vote-helper-name"><b>#${index + 1}</b><span class="eden-x1-vote-helper-player">${renderTaggedPlayerName(edenVoteHelperDisplayRow(row))}</span></span>
            <em>${esc(row.value)}</em>
          </button>`
        )
        .join('')
    : `<span class="eden-x1-vote-helper-empty">${esc(t('edenX1VoteHelperEmpty'))}</span>`;
  return `<div class="eden-x1-vote-helper-card" data-helper-visible-limit="${initialLimit}">
    <strong>${esc(title)}</strong>
    ${hint ? `<span class="eden-x1-vote-helper-hint">${esc(hint)}</span>` : ''}
    <div>${body}</div>
    ${
      hasMore
        ? `<button class="eden-x1-vote-helper-toggle" type="button" data-eden-vote-helper-toggle ${edenVoteHelperToggleAttrs(initialLimit, limitedRows.length)}></button>`
        : ''
    }
  </div>`;
}

function renderEdenVoteGuidance(options = {}) {
  const guidanceId = options.id || 'edenX1VoteGuidance';
  const extraClass = options.className ? ` ${options.className}` : '';
  const groups = [
    [t('edenX1VoteTopBannerPath'), t('edenX1VoteTopBannerPathHint'), rankedEdenBannerPathRows()],
    [t('edenX1VoteTopStructure'), t('edenX1VoteTopStructureHint'), rankedEdenStructureHelpRows()],
    [t('edenX1VoteTopBuildingMvp'), t('edenX1VoteTopBuildingMvpHint'), rankedEdenBuildingMvpRows()],
    [t('edenX1VoteTopR5Bonus'), t('edenX1VoteTopR5BonusHint'), rankedEdenR5BonusRows()],
    [t('adminAnalyticsStreaks'), t('edenX1StreaksCardHint'), rankedEdenStreakRows()],
  ];
  return `<div id="${esc(guidanceId)}" class="eden-x1-vote-guidance${extraClass}" tabindex="-1">
    <div class="eden-x1-vote-guidance-head">
      <strong>${esc(t('edenX1VoteGuidanceTitle'))}</strong>
      <span>${esc(t('edenX1VoteGuidanceCopy'))}</span>
    </div>
    <div class="eden-x1-vote-helper-grid">
      ${groups.map(([title, hint, rows]) => renderEdenVotePickList(title, hint, rows)).join('')}
    </div>
  </div>`;
}

function renderEdenTopNamesOverview(options = {}) {
  return renderEdenVoteGuidance({
    id: options.id || 'edenX1TopNamesOverview',
    className: ['eden-x1-vote-guidance--dashboard', options.className].filter(Boolean).join(' '),
  });
}

function renderEdenVoteMemberOptions() {
  return `<datalist id="edenX1VoteMemberOptions">${currentMemberOptions
    .map((row) => `<option value="${esc(row.playerName)}"></option>`)
    .join('')}</datalist>`;
}

function setEdenVoteStatus(message, type = 'info') {
  const status = $('edenX1VoteStatus');
  if (!status) return;
  status.textContent = message || '';
  status.dataset.status = type;
}

function renderEdenVoteBreakdownRows(rows) {
  return rows
    .map(([label, value, note]) => {
      const noteHtml = note ? `<small>${esc(note)}</small>` : '';
      return `<span><span>${esc(label)}${noteHtml}</span><b>${esc(value)}</b></span>`;
    })
    .join('');
}

function closeEdenVoteInfoPopovers(except = null) {
  document.querySelectorAll('.eden-x1-vote-info.is-open').forEach((button) => {
    if (button === except) return;
    button.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    resetEdenVoteInfoPopover(button);
  });
}

function bindEdenVoteInfoDismissal() {
  if (edenVoteInfoDismissalBound) return;
  edenVoteInfoDismissalBound = true;
  document.addEventListener('click', (event) => {
    if (event.target.closest('.eden-x1-vote-info')) return;
    closeEdenVoteInfoPopovers();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeEdenVoteInfoPopovers();
  });
}

function isEdenVoteInfoSheetViewport() {
  return globalThis.matchMedia?.('(max-width: 720px)').matches;
}

function resetEdenVoteInfoPopover(infoButton) {
  const popover = infoButton?.querySelector('.eden-x1-vote-info-popover');
  if (!popover) return;
  popover.removeAttribute('style');
}

function positionEdenVoteInfoPopover(infoButton) {
  const popover = infoButton?.querySelector('.eden-x1-vote-info-popover');
  if (!popover) return;
  if (isEdenVoteInfoSheetViewport()) {
    resetEdenVoteInfoPopover(infoButton);
    return;
  }
  const margin = 10;
  const prevVisibility = popover.style.visibility;
  const prevOpacity = popover.style.opacity;
  popover.style.display = 'block';
  popover.style.position = 'fixed';
  popover.style.visibility = 'hidden';
  popover.style.opacity = '0';
  popover.style.maxHeight = 'min(42vh, 260px)';
  popover.style.overflowY = 'auto';

  const buttonRect = infoButton.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const width = Math.min(
    Math.max(popoverRect.width || 260, 210),
    Math.max(210, globalThis.innerWidth - margin * 2)
  );
  const height = Math.min(
    Math.max(popoverRect.height || 96, 48),
    Math.max(48, globalThis.innerHeight - margin * 2)
  );
  const center = Math.min(
    Math.max(buttonRect.left + buttonRect.width / 2, margin + width / 2),
    globalThis.innerWidth - margin - width / 2
  );
  const above = buttonRect.top - height - 10;
  const below = buttonRect.bottom + 10;
  const top = above >= margin ? above : Math.min(below, globalThis.innerHeight - margin - height);

  popover.style.width = `${Math.round(width)}px`;
  popover.style.left = `${Math.round(center)}px`;
  popover.style.top = `${Math.round(Math.max(margin, top))}px`;
  popover.style.right = 'auto';
  popover.style.bottom = 'auto';
  popover.style.transform = 'translateX(-50%)';
  popover.style.visibility = prevVisibility;
  popover.style.opacity = prevOpacity;
}

function toggleEdenVoteInfoPopover(infoButton) {
  if (!infoButton) return;
  const shouldOpen = !infoButton.classList.contains('is-open');
  closeEdenVoteInfoPopovers(infoButton);
  if (shouldOpen) positionEdenVoteInfoPopover(infoButton);
  infoButton.classList.toggle('is-open', shouldOpen);
  infoButton.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  if (!shouldOpen) resetEdenVoteInfoPopover(infoButton);
}

function renderEdenVoteInfoBadge(info) {
  if (!info) return '';
  const label = `${t('edenX1InfoButtonLabel')}: ${info}`;
  return `<span class="eden-x1-vote-info" role="button" tabindex="0" aria-expanded="false" aria-label="${esc(label)}">
    <span aria-hidden="true">i</span>
    <span class="eden-x1-vote-info-popover" role="tooltip">${esc(info)}</span>
  </span>`;
}

function renderEdenVoteStatLabel(label, info = '') {
  return `<span class="eden-x1-vote-stat-label"><span>${esc(label)}</span>${renderEdenVoteInfoBadge(info)}</span>`;
}

function renderEdenVoteStatTile(label, value, tone = '', info = '') {
  const toneClass = tone ? ` ${tone}` : '';
  return `<div class="dash-modal-stat eden-x1-vote-stat-tile"><div>${renderEdenVoteStatLabel(label, info)}</div><div class="dash-modal-stat-value${toneClass}">${esc(value)}</div></div>`;
}

function renderEdenVoteBreakdownTile(label, value, rows, tone = '', info = '') {
  const toneClass = tone ? ` ${tone}` : '';
  return `<details class="dash-modal-stat eden-x1-vote-breakdown-tile${toneClass}">
    <summary>${renderEdenVoteStatLabel(label, info)}<b>${esc(value)}</b></summary>
    <div>${renderEdenVoteBreakdownRows(rows)}</div>
  </details>`;
}

function renderEdenVoteWeightedBreakdown(weighted) {
  if (!weighted)
    return renderEdenVoteStatTile(
      t('edenX1ThWeightedScore'),
      '--',
      'dash-modal-stat-value--blue',
      t('edenX1InfoWeightedScore')
    );
  const dutyCount =
    valueOf(weighted.banners) + valueOf(weighted.pathers) + valueOf(weighted.shieldWalls);
  const conductBonus = conductBonusValue(weighted);
  const conductPoints = Number.isFinite(Number(weighted.conductPoints))
    ? Number(weighted.conductPoints)
    : conductBonus * 10000;
  return renderEdenVoteBreakdownTile(
    t('edenX1ThWeightedScore'),
    formatWeightedScore(weighted.weightedScore),
    [
      [t('edenX1BreakdownContribution'), formatScore(weighted.contributionScore)],
      [t('edenX1BreakdownExGuild'), formatScore(weighted.contributionExGuild || 0)],
      [
        t('edenX1BreakdownDuty'),
        formatScore(weighted.dutyPoints || dutyCount * 10000),
        t('edenX1DutyFormula', {
          banners: weighted.banners,
          pathers: weighted.pathers,
          shieldWalls: weighted.shieldWalls,
          count: dutyCount,
        }),
      ],
      [
        t('edenX1BreakdownConductPoints'),
        formatSignedNumber(conductPoints),
        t('edenX1ConductPrivateNotice'),
      ],
      [t('edenX1BreakdownTotal'), formatWeightedScore(weighted.weightedScore)],
    ],
    'eden-x1-vote-breakdown-tile--blue',
    t('edenX1InfoWeightedScore')
  );
}

function renderEdenVoteContributionBreakdown(weighted) {
  if (!weighted)
    return renderEdenVoteStatTile(
      t('edenX1BreakdownContribution'),
      '--',
      'dash-modal-stat-value--amber',
      t('edenX1InfoContribution')
    );
  const contribution = valueOf(weighted.contributionScore);
  return renderEdenVoteBreakdownTile(
    t('edenX1BreakdownContribution'),
    formatScore(contribution),
    [
      [t('edenX1BreakdownContribution'), formatScore(contribution)],
      [t('edenX1BreakdownTotal'), formatScore(contribution)],
    ],
    'eden-x1-vote-breakdown-tile--amber',
    t('edenX1InfoContribution')
  );
}

function renderEdenVoteExGuildBreakdown(weighted) {
  if (!weighted)
    return renderEdenVoteStatTile(
      t('edenX1BreakdownExGuild'),
      '--',
      'dash-modal-stat-value--purple',
      t('edenX1InfoExGuild')
    );
  const total = valueOf(weighted.contributionExGuild);
  const breakdown = Array.isArray(weighted.contributionExGuildBreakdown)
    ? weighted.contributionExGuildBreakdown.filter((row) => valueOf(row?.contribution) > 0)
    : [];
  if (breakdown.length <= 1) {
    return renderEdenVoteStatTile(
      t('edenX1BreakdownExGuild'),
      formatScore(total),
      'dash-modal-stat-value--purple',
      t('edenX1InfoExGuild')
    );
  }
  return renderEdenVoteBreakdownTile(
    t('edenX1BreakdownExGuild'),
    formatScore(total),
    [
      ...breakdown.map((row) => [
        [row.guild, row.sourceName].filter(Boolean).join(' - ') || t('edenX1BreakdownExGuild'),
        formatScore(row.contribution),
      ]),
      [t('edenX1BreakdownTotal'), formatScore(total)],
    ],
    'eden-x1-vote-breakdown-tile--purple',
    t('edenX1InfoExGuild')
  );
}

function renderEdenVoteSupportBreakdown(weighted) {
  if (!weighted) {
    return [
      renderEdenVoteStatTile(
        t('edenX1VoteConductBonus'),
        '--',
        'dash-modal-stat-value--purple',
        t('edenX1InfoR5Bonus')
      ),
      renderEdenVoteStatTile(
        t('edenX1VoteSupportTotal'),
        '--',
        'dash-modal-stat-value--teal',
        t('edenX1InfoSupportTotal')
      ),
    ].join('');
  }
  const conductBonus = conductBonusValue(weighted);
  const total = rowBonusTotal(weighted);
  return [
    renderEdenVoteStatTile(
      t('edenX1VoteConductBonus'),
      formatSignedNumber(conductBonus),
      conductBonus >= 0 ? 'dash-modal-stat-value--purple' : 'dash-modal-stat-value--amber',
      t('edenX1InfoR5Bonus')
    ),
    renderEdenVoteBreakdownTile(
      t('edenX1VoteSupportTotal'),
      total.toLocaleString(),
      [
        [t('edenX1ThBanners'), formatScore(weighted.banners)],
        [t('edenX1ThPathers'), formatScore(weighted.pathers)],
        [t('edenX1ThShieldWalls'), formatScore(weighted.shieldWalls)],
        [t('edenX1VoteConductBonus'), formatSignedNumber(conductBonus)],
        [t('edenX1BreakdownTotal'), total.toLocaleString()],
      ],
      'eden-x1-vote-breakdown-tile--teal',
      t('edenX1InfoSupportTotal')
    ),
  ].join('');
}

function renderEdenVoteStructureBreakdown(player, values) {
  if (!player) {
    return renderEdenVoteStatTile(
      t('edenX1VoteStructureConsistency'),
      '--',
      'dash-modal-stat-value--blue',
      t('edenX1InfoStructureConsistency')
    );
  }
  const consistency = scoreConsistencyValues(values);
  const half = Math.floor(values.length / 2);
  const span = Math.min(5, half || 1);
  const first = publicAverage(values.slice(0, span));
  const last = publicAverage(values.slice(-span));
  const delta = values.length > 1 ? last - first : 0;
  const steady = consistency ? t('edenX1SteadyPercent', { percent: consistency.percent }) : '--';
  const movement = values.length > 1 ? `${delta >= 0 ? '+' : ''}${compactValue(delta)}` : '--';
  return renderEdenVoteBreakdownTile(
    t('edenX1VoteStructureConsistency'),
    steady,
    [
      [t('edenX1RankMovement'), movement],
      [t('edenX1ModalHits'), formatScore(player.participation_count)],
      [t('edenX1ModalAverageHit'), formatScore(player.average_demolition)],
      [t('edenX1ModalBestHit'), formatScore(player.best_hit)],
    ],
    'eden-x1-vote-breakdown-tile--structure',
    t('edenX1InfoStructureConsistency')
  );
}

function formatEdenTrendAxisTime(row) {
  const parsed = parsePublicGameTime(row?.time);
  if (parsed) {
    const dateLabel = new Intl.DateTimeFormat(currentLang || undefined, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(parsed.date);
    const timeLabel = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC',
    }).format(parsed.date);
    return `${dateLabel} · ${timeLabel} GT`;
  }
  const fallback = String(row?.time || row?.structure || t('edenX1ModalTime')).trim();
  return fallback.length > 28 ? `${fallback.slice(0, 25)}...` : fallback;
}

function countAllowedEdenAttackWindowsBeforeDay(dayIndex) {
  if (!Number.isFinite(dayIndex)) return 0;
  const wholeWeeks = Math.floor(dayIndex / 7);
  const remainder = dayIndex - wholeWeeks * 7;
  let count = wholeWeeks * EDEN_X1_ATTACK_WINDOW_DAYS.size;
  for (let offset = 0; offset < remainder; offset += 1) {
    const dow = (EDEN_X1_ATTACK_WINDOW_EPOCH_DOW + offset) % 7;
    if (EDEN_X1_ATTACK_WINDOW_DAYS.has(dow)) count += 1;
  }
  return count;
}

function edenAttackWindowCoordinate(row, fallbackIndex) {
  const ms = publicAttackMs(row?.attack || row);
  if (!Number.isFinite(ms) || ms <= 0) return fallbackIndex;
  const dayIndex = Math.floor(ms / MS_PER_DAY);
  const dow = new Date(ms).getUTCDay();
  const dayFraction = (ms - dayIndex * MS_PER_DAY) / MS_PER_DAY;
  const base = countAllowedEdenAttackWindowsBeforeDay(dayIndex);
  if (EDEN_X1_ATTACK_WINDOW_DAYS.has(dow)) return base + dayFraction;
  return base;
}

function edenTrendXCoordinates(rows) {
  const coords = rows.map((row, index) => edenAttackWindowCoordinate(row, index));
  const finite = coords.every((coord) => Number.isFinite(coord));
  if (!finite) return rows.map((_, index) => index);
  const first = coords[0] ?? 0;
  const allSame = coords.every((coord) => Math.abs(coord - first) < 0.0001);
  return allSame ? rows.map((_, index) => index) : coords;
}

function formatEdenTrendTickDate(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  return new Intl.DateTimeFormat(currentLang || undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(ms));
}

function niceEdenTrendStep(maxValue) {
  const target = Math.max(1, Number(maxValue || 0) / 4);
  const power = 10 ** Math.floor(Math.log10(target));
  const normalized = target / power;
  const multiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return multiplier * power;
}

function niceEdenTrendMax(maxValue) {
  const step = niceEdenTrendStep(maxValue);
  return Math.max(step, Math.ceil(Math.max(1, maxValue) / step) * step);
}

function edenTrendDemoTicks(topValue) {
  const step = niceEdenTrendStep(topValue);
  const top = Math.max(step, Math.ceil(topValue / step) * step);
  const ticks = [];
  for (let value = 0; value <= top + step * 0.1; value += step) ticks.push(value);
  return ticks;
}

function edenSharedTrendTimeDomain(rows) {
  const rowTimes = rows.map((row) => publicAttackMs(row.attack || row)).filter((ms) => ms > 0);
  const allTimes = (Array.isArray(publicAttackRows) ? publicAttackRows : [])
    .map(publicAttackMs)
    .filter((ms) => ms > 0);
  const domainTimes = allTimes.length ? allTimes : rowTimes;
  if (!domainTimes.length) return { start: 0, end: Math.max(1, rows.length - 1), isTime: false };
  const start = Math.min(...domainTimes);
  const observedEnd = Math.max(...domainTimes);
  const now = Date.now();
  const end = Number.isFinite(now) && now > observedEnd ? now : observedEnd;
  return {
    start,
    end: Math.max(start + 1, end),
    isTime: true,
  };
}

function edenSharedTrendDemoMax(values) {
  const playerMax = Math.max(...values, 1);
  const globalMax = Math.max(
    playerMax,
    ...(Array.isArray(publicPlayerRows) ? publicPlayerRows : []).map((row) => valueOf(row.best_hit))
  );
  return niceEdenTrendMax(globalMax);
}

function renderEdenTrendYAxis(ticks, yFor, padX, width) {
  return ticks
    .slice()
    .reverse()
    .map((tick) => {
      const y = yFor(tick);
      return `<g class="eden-x1-trend-y-tick">
        <line class="eden-x1-trend-grid-line" x1="${padX}" y1="${y.toFixed(1)}" x2="${width - padX}" y2="${y.toFixed(1)}"></line>
        <text class="eden-x1-trend-axis-label" x="${padX - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${esc(compactValue(tick))}</text>
      </g>`;
    })
    .join('');
}

function renderEdenTrendXAxis(ticks, xForTime, padX, plotWidth, domain) {
  if (!ticks.length || !domain?.isTime) return '';
  return `<div class="eden-x1-structure-x-axis" aria-hidden="true">
    ${ticks
      .map((tick, index) => {
        const position = Math.min(100, Math.max(0, ((xForTime(tick) - padX) / plotWidth) * 100));
        let align = 'center';
        if (index === 0) align = 'start';
        if (index === ticks.length - 1) align = 'end';
        const extraClass =
          index > 0 && index < ticks.length - 1 && index % 2 === 0
            ? ' eden-x1-structure-x-tick--extra'
            : '';
        return `<span class="eden-x1-structure-x-tick eden-x1-structure-x-tick--${align}${extraClass}" style="--tick-x:${position.toFixed(2)}%" title="${esc(formatEdenTrendTickDate(tick))}">
          <b>${esc(formatEdenTrendTickDate(tick))}</b>
        </span>`;
      })
      .join('')}
  </div>`;
}

function edenTrendTimeTicks(domain, count = 6) {
  if (!domain?.isTime) return [];
  const total = Math.max(1, count - 1);
  return Array.from(
    { length: count },
    (_, index) => domain.start + ((domain.end - domain.start) * index) / total
  );
}

function edenTrendPointLabel(value, point, tone, anchor = 'middle', offsetY = -12) {
  const y = Math.max(14, point.y + offsetY);
  return `<text class="eden-x1-trend-point-label eden-x1-trend-point-label--${tone}" x="${point.x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}">${esc(compactValue(value))}</text>`;
}

function shortenEdenTrendTooltip(value) {
  const text = String(value || '').trim();
  return text.length > 24 ? `${text.slice(0, 21)}...` : text;
}

function edenTrendTooltipMetric(value) {
  const label = t('adminModalThDemolition');
  return `${compactValue(value)} ${label}`;
}

function renderEdenTrendHitTargets(rows, values, xFor, yFor, bestIndex, latestIndex, width) {
  return values
    .map((value, index) => {
      const row = rows[index];
      const x = xFor(index);
      const y = yFor(value);
      const tooltipWidth = 128;
      const tooltipHeight = row.structure ? 50 : 36;
      const tooltipY = y > 74 ? y - tooltipHeight - 10 : y + 16;
      const tooltipAnchor = x > width - 150 ? 'end' : x < 132 ? 'start' : 'middle';
      const tooltipX = tooltipAnchor === 'end' ? x - 8 : tooltipAnchor === 'start' ? x + 8 : x;
      const tooltipLeft =
        tooltipAnchor === 'end'
          ? -tooltipWidth
          : tooltipAnchor === 'middle'
            ? -tooltipWidth / 2
            : 0;
      const tooltipTextX = tooltipLeft + 10;
      const label = [
        formatEdenTrendAxisTime(row),
        row.structure || '',
        `${formatScore(value)} ${t('adminModalThDemolition')}`,
      ]
        .filter(Boolean)
        .join(' - ');
      return `<g class="eden-x1-trend-hit" tabindex="0" role="button" aria-label="${esc(label)}">
        <line class="eden-x1-trend-crosshair" x1="${x.toFixed(1)}" y1="20" x2="${x.toFixed(1)}" y2="${yFor(0).toFixed(1)}"></line>
        <circle class="eden-x1-trend-hit-target" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10"></circle>
        ${index !== bestIndex && index !== latestIndex ? `<circle class="eden-x1-trend-point eden-x1-trend-point--hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.8"></circle>` : ''}
        <g class="eden-x1-trend-tooltip" transform="translate(${tooltipX.toFixed(1)} ${tooltipY.toFixed(1)})">
          <rect x="${tooltipLeft}" y="0" width="${tooltipWidth}" height="${tooltipHeight}" rx="6"></rect>
          <text x="${tooltipTextX}" y="14">${esc(formatEdenTrendAxisTime(row))}</text>
          <text x="${tooltipTextX}" y="28">${esc(edenTrendTooltipMetric(value))}</text>
          ${row.structure ? `<text x="${tooltipTextX}" y="42">${esc(shortenEdenTrendTooltip(row.structure))}</text>` : ''}
        </g>
      </g>`;
    })
    .join('');
}

function renderEdenVoteStructureTrend(attacks) {
  const rows = (Array.isArray(attacks) ? attacks : [])
    .map((attack) => ({ ...attack, demo: valueOf(attack.demo) }))
    .filter((attack) => attack.demo > 0);
  if (!rows.length) return `<div class="dash-empty">${esc(t('edenX1VoteNoTrend'))}</div>`;

  const values = rows.map((row) => row.demo);
  const max = Math.max(...values, 1);
  const yMax = edenSharedTrendDemoMax(values);
  const min = 0;
  const span = Math.max(1, yMax - min);
  const total = values.reduce((sum, value) => sum + value, 0);
  const avg = Math.round(total / values.length);
  const first = values[0] || 0;
  const latest = values[values.length - 1] || 0;
  const delta = latest - first;
  const structureKeys = rows.map((row) => row.structureKey || row.structure).filter(Boolean);
  const structureCount = new Set(structureKeys).size;
  const bestIndex = values.indexOf(max);
  const latestIndex = values.length - 1;
  const width = 760;
  const height = 156;
  const padX = 42;
  const padTop = 18;
  const padBottom = 32;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;
  const bottom = height - padBottom;
  const domain = edenSharedTrendTimeDomain(rows);
  const rowTimes = rows.map(
    (row, index) => publicAttackMs(row.attack || row) || domain.start + index
  );
  const xForTime = (ms) =>
    domain.isTime
      ? padX + ((ms - domain.start) / (domain.end - domain.start)) * plotWidth
      : width / 2;
  const xFor = (index) => (domain.isTime ? xForTime(rowTimes[index]) : width / 2);
  const yFor = (value) => bottom - ((value - min) / span) * plotHeight;
  const points = values.map(
    (value, index) => `${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`
  );
  const firstX = xFor(0).toFixed(1);
  const lastX = xFor(latestIndex).toFixed(1);
  const areaPath = `M ${firstX} ${bottom} L ${points.join(' L ')} L ${lastX} ${bottom} Z`;
  const yTicks = edenTrendDemoTicks(yMax);
  const gridLines = renderEdenTrendYAxis(yTicks, yFor, padX, width);
  const avgY = yFor(avg);
  const avgLine = `<g class="eden-x1-trend-average">
    <line x1="${padX}" y1="${avgY.toFixed(1)}" x2="${width - padX}" y2="${avgY.toFixed(1)}"></line>
  </g>`;
  const latestPoint = { x: xFor(latestIndex), y: yFor(latest) };
  const bestPoint = { x: xFor(bestIndex), y: yFor(max) };
  const deltaClass = delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
  const deltaText = values.length > 1 ? `${delta >= 0 ? '+' : ''}${compactValue(delta)}` : '--';
  const xAxis = renderEdenTrendXAxis(edenTrendTimeTicks(domain), xForTime, padX, plotWidth, domain);
  const closeHeroLabels =
    bestIndex !== latestIndex &&
    Math.abs(bestPoint.x - latestPoint.x) < 92 &&
    Math.abs(bestPoint.y - latestPoint.y) < 34;
  const bestAnchor = bestPoint.x > width - 98 ? 'end' : bestPoint.x < 98 ? 'start' : 'middle';
  const latestAnchor = latestPoint.x > width - 98 ? 'end' : latestPoint.x < 98 ? 'start' : 'middle';
  const pointLabels = [
    bestIndex !== latestIndex
      ? edenTrendPointLabel(max, bestPoint, 'best', bestAnchor, closeHeroLabels ? -20 : -12)
      : '',
    edenTrendPointLabel(latest, latestPoint, 'latest', latestAnchor, closeHeroLabels ? 20 : -12),
  ].join('');
  const hitTargets = renderEdenTrendHitTargets(
    rows,
    values,
    xFor,
    yFor,
    bestIndex,
    latestIndex,
    width
  );

  return `<div class="eden-x1-structure-trend-card" role="img" aria-label="${esc(`${t('edenX1VoteTrendLabel')}: ${values.length} ${t('edenX1ModalHits')}, ${formatScore(total)} ${t('edenX1ModalTotalDemo')}`)}">
    <div class="eden-x1-structure-trend-head">
      <div>
        <strong>${esc(t('edenX1VoteTrendLabel'))}</strong>
        <span>${esc(t('edenX1HitsAverageMeta', { hits: values.length, avg: formatScore(avg) }))}</span>
      </div>
      <div class="eden-x1-structure-trend-pills">
        <span class="eden-x1-structure-trend-average-pill">
          <small>${esc(t('edenX1ModalAverageHit'))}</small>
          <b>${formatScore(avg)}</b>
        </span>
        <em class="${deltaClass}">${deltaText}</em>
      </div>
    </div>
    <div class="eden-x1-structure-trend-stats">
      <span><b>${formatScore(values.length)}</b><small>${esc(t('edenX1ModalHits'))}</small></span>
      <span><b>${formatScore(avg)}</b><small>${esc(t('edenX1ModalAverageHit'))}</small></span>
      <span><b>${formatScore(max)}</b><small>${esc(t('edenX1ModalBestHit'))}</small></span>
      <span><b>${formatScore(structureCount)}</b><small>${esc(t('edenX1ModalTargets'))}</small></span>
    </div>
    <div class="eden-x1-structure-chart">
      <div class="eden-x1-structure-axis-title">${esc(t('adminModalThDemolition'))}</div>
      <svg class="eden-x1-structure-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="edenX1StructureTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.22"></stop>
            <stop offset="100%" stop-color="#34d399" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <g>${gridLines}</g>
        ${avgLine}
        <path class="eden-x1-trend-area" d="${areaPath}" fill="url(#edenX1StructureTrendFill)"></path>
        <polyline class="eden-x1-trend-line" points="${points.join(' ')}"></polyline>
        ${bestIndex !== latestIndex ? `<circle class="eden-x1-trend-point eden-x1-trend-point--best" cx="${bestPoint.x.toFixed(1)}" cy="${bestPoint.y.toFixed(1)}" r="5"></circle>` : ''}
        <circle class="eden-x1-trend-point eden-x1-trend-point--latest" cx="${latestPoint.x.toFixed(1)}" cy="${latestPoint.y.toFixed(1)}" r="6"></circle>
        ${pointLabels}
        ${hitTargets}
      </svg>
      ${xAxis}
    </div>
  </div>`;
}

function renderEdenVoteCandidateDetail(option) {
  if (!option) return '';
  const weighted = getEdenWeightedRowForPlayer(option.playerKey);
  const player = getEdenPublicPlayerForKey(option.playerKey, option.playerName);
  const attacks = player?.attacks
    ? player.attacks.slice().sort((a, b) => publicAttackMs(a.attack) - publicAttackMs(b.attack))
    : [];
  const values = attacks.map((attack) => valueOf(attack.demo));
  const trend = renderEdenVoteStructureTrend(attacks);
  const fullDetailButton = player
    ? `<button class="dash-btn dash-btn-xs" type="button" data-eden-vote-open-player="${esc(player.key)}">${esc(t('edenX1VoteOpenDetail'))}</button>`
    : '';
  return `<div class="eden-x1-vote-player-detail-card">
    <div class="eden-x1-vote-player-detail-head">
      <div>
        <strong>${esc(option.playerName)}</strong>
        <span>${esc(t('edenX1VoteDetailSubtitle'))}</span>
      </div>
      ${fullDetailButton}
    </div>
    <div class="dash-modal-grid eden-x1-vote-stat-grid">
      ${renderEdenVoteWeightedBreakdown(weighted)}
      ${renderEdenVoteStatTile(t('adminContributionFinalRank'), weighted?.finalRank ? `#${weighted.finalRank}` : '--', 'dash-modal-stat-value--teal', t('edenX1InfoFinalRank'))}
      ${renderEdenVoteContributionBreakdown(weighted)}
      ${renderEdenVoteExGuildBreakdown(weighted)}
      ${renderEdenVoteSupportBreakdown(weighted)}
      ${renderEdenVoteStatTile(t('edenX1VoteBannerPathShield'), weighted ? `${weighted.banners} / ${weighted.pathers} / ${weighted.shieldWalls}` : '--', 'dash-modal-stat-value--blue', t('edenX1InfoBannerPathShield'))}
      ${renderEdenVoteStatTile(t('edenX1KpiStructureHits'), player ? formatScore(player.participation_count) : '--', 'dash-modal-stat-value--amber', t('edenX1InfoStructureHits'))}
      ${renderEdenVoteStatTile(t('edenX1KpiTotalDemo'), player ? formatScore(player.total_demolition) : '--', 'dash-modal-stat-value--purple', t('edenX1InfoTotalDemolition'))}
      ${renderEdenVoteStructureBreakdown(player, values)}
    </div>
    <div class="eden-x1-vote-trend">
      ${trend}
    </div>
  </div>`;
}

function updateEdenVoteCandidateDetail(host) {
  const input = getEdenVoteDetailInput(host);
  const toggle = host?.querySelector('#edenX1VoteCandidateInspectBtn');
  const clearStats = host?.querySelector('#edenX1VoteClearStatsBtn');
  const detail = host?.querySelector('#edenX1VoteCandidateDetail');
  if (!toggle || !detail) return;
  const resetClearStats = () => {
    if (!clearStats) return;
    clearStats.hidden = true;
    clearStats.disabled = true;
    clearStats.removeAttribute('data-eden-vote-clear-stats');
  };
  if (!input) {
    toggle.disabled = true;
    toggle.textContent = t('edenX1VoteInspectEmpty');
    toggle.classList.remove('is-ready', 'is-open');
    toggle.dataset.state = 'empty';
    toggle.setAttribute('aria-expanded', 'false');
    resetClearStats();
    detail.hidden = true;
    detail.dataset.open = '0';
    detail.innerHTML = '';
    return;
  }
  const option = findEdenMemberOption(input.value);
  if (!option) {
    toggle.disabled = true;
    toggle.textContent = t('edenX1VoteInspectEmpty');
    toggle.classList.remove('is-ready', 'is-open');
    toggle.dataset.state = 'empty';
    toggle.setAttribute('aria-expanded', 'false');
    resetClearStats();
    detail.hidden = true;
    detail.dataset.open = '0';
    detail.innerHTML = '';
    return;
  }
  toggle.disabled = false;
  toggle.textContent = t('edenX1VoteInspectNamed', { player: option.playerName });
  if (detail.dataset.open === '1') {
    toggle.classList.remove('is-ready');
    toggle.classList.add('is-open');
    toggle.dataset.state = 'open';
    detail.hidden = false;
    detail.innerHTML = renderEdenVoteCandidateDetail(option);
    toggle.setAttribute('aria-expanded', 'true');
    if (clearStats) {
      clearStats.hidden = false;
      clearStats.disabled = false;
      clearStats.textContent = t('edenX1VoteClearStats', { player: option.playerName });
      clearStats.setAttribute(
        'aria-label',
        t('edenX1VoteClearStats', { player: option.playerName })
      );
      clearStats.setAttribute('data-eden-vote-clear-stats', option.playerKey);
    }
  } else {
    toggle.classList.add('is-ready');
    toggle.classList.remove('is-open');
    toggle.dataset.state = 'ready';
    detail.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    resetClearStats();
  }
}

async function submitEdenTeamVoteForm(form) {
  if (!form) return;
  const submit = form.querySelector('button[type="submit"]');
  if (edenVoteSettings.votingOpen === false) {
    setEdenVoteStatus(t('edenX1VoteClosed'), 'error');
    return;
  }
  if (edenVoteSettings.allowEditing === false && hasLocalEdenVoteForCurrentSeason()) {
    setEdenVoteStatus(t('edenX1VoteEditingClosed'), 'error');
    return;
  }
  const voter = resolveEdenVoteInput(form, 'edenX1VoterName', {
    closeSuggestions: true,
    markInvalid: true,
    nudgeInvalid: true,
  });
  const candidates = [];
  let hasInvalidCandidate = false;
  EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.forEach((id) => {
    const input = form.querySelector(`#${id}`);
    if (!input?.value.trim()) {
      resetEdenVoteInputState(form, id);
      clearEdenVoteInputSuggestions(form, id);
      return;
    }
    const candidate = resolveEdenVoteInput(form, id, {
      closeSuggestions: true,
      markInvalid: true,
      nudgeInvalid: true,
    });
    if (candidate) candidates.push(candidate);
    else hasInvalidCandidate = true;
  });
  if (!voter) {
    pendingPartialEdenVoteSignature = '';
    setEdenVoteStatus(t('edenX1VoteErrUnknownSelf'), 'error');
    markEdenVoteInputInvalid(form, 'edenX1VoterName', { nudge: true });
    return;
  }
  if (hasInvalidCandidate) {
    pendingPartialEdenVoteSignature = '';
    setEdenVoteStatus(t('edenX1VoteErrUnknownCandidate'), 'error');
    EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.forEach((id) => {
      const input = form.querySelector(`#${id}`);
      if (input?.value.trim() && !findEdenMemberOption(input.value)) {
        markEdenVoteInputInvalid(form, id, { nudge: true });
      }
    });
    return;
  }
  if (!candidates.length) {
    pendingPartialEdenVoteSignature = '';
    setEdenVoteStatus(t('edenX1VoteErrPickAtLeastOne'), 'error');
    return;
  }
  const candidateKeys = candidates.map((candidate) => candidate.playerKey);
  if (new Set(candidateKeys).size !== candidates.length) {
    pendingPartialEdenVoteSignature = '';
    setEdenVoteStatus(t('edenX1VoteErrDuplicate'), 'error');
    return;
  }
  const candidateNames = candidates.map((candidate) => candidate.playerName);
  if (candidateKeys.length < EDEN_X1_VOTE_CANDIDATE_LIMIT) {
    const signature = edenVoteCandidateSignature(voter, candidateKeys);
    if (pendingPartialEdenVoteSignature !== signature) {
      pendingPartialEdenVoteSignature = signature;
      setEdenVoteStatus(
        t('edenX1VotePartialConfirm', {
          count: EDEN_X1_VOTE_CANDIDATE_LIMIT - candidateKeys.length,
        }),
        'warning'
      );
      return;
    }
  }
  pendingPartialEdenVoteSignature = '';

  const season = edenVoteSeason();
  const voterAuthUid = edenVoteWriteContext?.user?.uid || 'local-test';
  const id = edenVoteDocId(season, voter.playerKey);
  const localVote = {
    id,
    season,
    category: EDEN_X1_TEAM_VOTE_CATEGORY,
    voterKey: voter.playerKey,
    voterName: voter.playerName,
    candidateKey: candidateKeys[0],
    candidateName: candidateNames[0],
    candidateKeys,
    candidateNames,
    voterAuthUid,
    updatedAt: new Date().toISOString(),
  };

  if (!edenVoteWriteContext && !EDEN_X1_TEST_MODE) {
    setEdenVoteStatus(t('edenX1VoteErrCloud'), 'error');
    return;
  }

  try {
    if (submit) {
      submit.disabled = true;
      submit.textContent = t('edenX1VoteSavingShort');
    }
    setEdenVoteStatus(t('edenX1VoteStatusSaving'), 'info');
    if (edenVoteWriteContext) {
      const { db, firestore, user } = edenVoteWriteContext;
      const { collection, doc, getDoc, serverTimestamp, writeBatch } = firestore;
      const voteRef = doc(db, EDEN_X1_VOTES_COLLECTION_PATH, id);
      let previousVote = null;
      let previousVoteKnown = true;
      try {
        const existingSnap = await getDoc(voteRef);
        previousVote = existingSnap?.exists?.() ? existingSnap.data() || {} : null;
      } catch (err) {
        previousVoteKnown = false;
        console.warn(
          'Eden X1 vote pre-read failed; saving vote with create-only history fallback.',
          err
        );
      }
      const previousCandidateNames = Array.isArray(previousVote?.candidateNames)
        ? previousVote.candidateNames.map((name) => String(name || '').trim()).filter(Boolean)
        : [previousVote?.candidateName].map((name) => String(name || '').trim()).filter(Boolean);
      const previousCandidateKeys = Array.isArray(previousVote?.candidateKeys)
        ? previousVote.candidateKeys.map((key) => String(key || '').trim()).filter(Boolean)
        : [previousVote?.candidateKey].map((key) => String(key || '').trim()).filter(Boolean);
      const changed =
        !previousVoteKnown ||
        !previousVote ||
        String(previousVote.voterKey || '') !== voter.playerKey ||
        previousCandidateKeys.join('|') !== candidateKeys.join('|');
      const batch = writeBatch(db);
      batch.set(voteRef, {
        ...localVote,
        voterAuthUid: user.uid,
        updatedAt: serverTimestamp(),
      });
      if (changed) {
        const historyRef = doc(collection(db, EDEN_X1_VOTE_HISTORY_COLLECTION_PATH));
        batch.set(historyRef, {
          id: historyRef.id,
          voteId: id,
          season,
          category: EDEN_X1_TEAM_VOTE_CATEGORY,
          voterKey: voter.playerKey,
          voterName: voter.playerName,
          previousCandidateKeys,
          previousCandidateNames,
          candidateKeys,
          candidateNames,
          voterAuthUid: user.uid,
          action: previousVote ? 'updated' : 'created',
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      localVote.voterAuthUid = user.uid;
    }
    writeLocalEdenVote(localVote);
    setEdenVoteStatus(
      edenVoteSavedStatusText(localVote) || `${t('edenX1VoteSaved')} ${t('edenX1VoteResultsNote')}`,
      'success'
    );
  } catch (err) {
    console.error('Eden X1 vote save failed:', err);
    setEdenVoteStatus(
      t('edenX1VoteSyncFailed', { error: err?.message || err || 'unknown error' }),
      'error'
    );
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = t('edenX1VoteCast');
    }
  }
}

async function submitEdenTeamVote(event) {
  event.preventDefault();
  if (Date.now() < edenVotePointerSubmitUntil) return;
  await submitEdenTeamVoteForm(event.currentTarget);
}

function submitEdenTeamVoteFromPointer(event) {
  if (typeof event.button === 'number' && event.button !== 0) return;
  const form = event.currentTarget?.closest?.('#edenX1TeamVoteForm');
  if (!form) return;
  event.preventDefault();
  edenVotePointerSubmitUntil = Date.now() + 750;
  submitEdenTeamVoteForm(form);
}

function bindEdenVoteControls(host) {
  if (!host) return;
  bindEdenVoteInfoDismissal();
  const form = host.querySelector('#edenX1TeamVoteForm');
  if (form && !form.dataset.edenVoteSubmitBound) {
    form.dataset.edenVoteSubmitBound = '1';
    form.addEventListener('submit', submitEdenTeamVote);
  }
  const submit = form?.querySelector('button[type="submit"]');
  if (submit && !submit.dataset.edenVotePointerSubmitBound) {
    submit.dataset.edenVotePointerSubmitBound = '1';
    submit.addEventListener('pointerdown', submitEdenTeamVoteFromPointer);
  }
  if (!host.dataset.edenVoteControlsBound) {
    host.dataset.edenVoteControlsBound = '1';
    const voteInputSelector = [
      '#edenX1VoterName',
      ...EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.map((id) => `#${id}`),
    ].join(', ');
    host.addEventListener('input', (event) => {
      const input = event.target.closest(voteInputSelector);
      if (!input) return;
      pendingPartialEdenVoteSignature = '';
      updateEdenVoteInputSuggestions(host, input.id);
      resetEdenVoteInputState(host, input.id);
      if (EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.includes(input.id)) {
        host.dataset.edenVoteInspectInputId = input.id;
        const detail = host.querySelector('#edenX1VoteCandidateDetail');
        if (detail) detail.dataset.open = '0';
        updateEdenVoteCandidateDetail(host);
      }
    });
    host.addEventListener('change', (event) => {
      const input = event.target.closest(voteInputSelector);
      if (!input) return;
      resolveEdenVoteInput(host, input.id, { closeSuggestions: true, markInvalid: true });
      if (EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.includes(input.id)) {
        host.dataset.edenVoteInspectInputId = input.id;
        updateEdenVoteCandidateDetail(host);
      }
      resetPendingPartialEdenVoteSignatureIfChanged(host);
    });
    host.addEventListener('pointerdown', (event) => {
      if (event.target.closest('[data-eden-vote-suggest]')) event.preventDefault();
    });
    host.addEventListener('pointerover', (event) => {
      const infoButton = event.target.closest('.eden-x1-vote-info');
      if (infoButton) positionEdenVoteInfoPopover(infoButton);
    });
    host.addEventListener('pointerout', (event) => {
      const infoButton = event.target.closest('.eden-x1-vote-info');
      if (
        !infoButton ||
        infoButton.contains(event.relatedTarget) ||
        infoButton.classList.contains('is-open')
      ) {
        return;
      }
      resetEdenVoteInfoPopover(infoButton);
    });
    host.addEventListener('focusin', (event) => {
      const infoButton = event.target.closest('.eden-x1-vote-info');
      if (infoButton) {
        positionEdenVoteInfoPopover(infoButton);
        return;
      }
      const input = event.target.closest(voteInputSelector);
      if (input) updateEdenVoteInputSuggestions(host, input.id);
    });
    host.addEventListener('focusout', (event) => {
      const infoButton = event.target.closest('.eden-x1-vote-info');
      if (
        !infoButton ||
        infoButton.contains(event.relatedTarget) ||
        infoButton.classList.contains('is-open')
      ) {
        return;
      }
      resetEdenVoteInfoPopover(infoButton);
    });
    host.addEventListener('click', (event) => {
      const infoButton = event.target.closest('.eden-x1-vote-info');
      if (infoButton) {
        event.preventDefault();
        event.stopPropagation();
        toggleEdenVoteInfoPopover(infoButton);
        return;
      }
      const clear = event.target.closest('[data-eden-vote-clear]');
      if (clear) {
        event.preventDefault();
        event.stopPropagation();
        clearEdenVotePickedInput(host, clear.getAttribute('data-eden-vote-clear') || '');
        return;
      }
      const selfPick = event.target.closest('[data-eden-vote-self-pick]');
      if (selfPick) {
        event.preventDefault();
        applyEdenVoteSelfPick(host, selfPick);
        return;
      }
      const helperToggle = event.target.closest('[data-eden-vote-helper-toggle]');
      if (helperToggle) {
        event.preventDefault();
        toggleEdenVoteHelperRows(helperToggle);
        return;
      }
      const helpLink = event.target.closest('[data-eden-vote-help-link]');
      if (helpLink) {
        event.preventDefault();
        const href = helpLink.getAttribute('href') || '';
        const targetId = href.startsWith('#') ? href.slice(1) : '';
        const guidance =
          document.getElementById('edenX1TopNamesOverview') ||
          (targetId ? document.getElementById(targetId) : null) ||
          host.querySelector('#edenX1VoteGuidance');
        if (guidance) {
          scrollEdenTargetIntoView(guidance, { focusTarget: true });
        }
        return;
      }
      const suggestion = event.target.closest('[data-eden-vote-suggest]');
      if (suggestion) {
        event.preventDefault();
        pendingPartialEdenVoteSignature = '';
        const targetId = suggestion.getAttribute('data-eden-vote-target') || '';
        const input = targetId ? host.querySelector(`#${targetId}`) : null;
        if (input) {
          const selectedName = suggestion.getAttribute('data-eden-vote-suggest') || '';
          const option = findEdenMemberOption(selectedName);
          input.value = selectedName;
          if (option) applyEdenVoteInputResolved(host, targetId, option);
          clearEdenVoteInputSuggestions(host, targetId);
          if (EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.includes(targetId)) {
            host.dataset.edenVoteInspectInputId = targetId;
            const detail = host.querySelector('#edenX1VoteCandidateDetail');
            if (detail) detail.dataset.open = '1';
            updateEdenVoteCandidateDetail(host);
          }
          input.focus();
        }
        return;
      }
      const pick = event.target.closest('[data-eden-vote-pick]');
      if (pick) {
        event.preventDefault();
        if (!applyEdenVotePickToForm(host, pick)) showEdenVoteHelperPlayerDetail(pick);
        return;
      }
      const inspect = event.target.closest('#edenX1VoteCandidateInspectBtn');
      if (inspect) {
        const detail = host.querySelector('#edenX1VoteCandidateDetail');
        if (!detail) return;
        detail.dataset.open = detail.dataset.open === '1' ? '0' : '1';
        updateEdenVoteCandidateDetail(host);
        return;
      }
      const clearStats = event.target.closest('[data-eden-vote-clear-stats]');
      if (clearStats) {
        event.preventDefault();
        const detail = host.querySelector('#edenX1VoteCandidateDetail');
        if (detail) {
          detail.dataset.open = '0';
          detail.hidden = true;
          detail.innerHTML = '';
        }
        updateEdenVoteCandidateDetail(host);
        host.querySelector('#edenX1VoteCandidateInspectBtn')?.focus();
        return;
      }
      const openPlayer = event.target.closest('[data-eden-vote-open-player]');
      if (openPlayer) {
        showPublicDetail('player', openPlayer.getAttribute('data-eden-vote-open-player'));
      }
    });
    host.addEventListener('keydown', (event) => {
      const infoButton = event.target.closest('.eden-x1-vote-info');
      if (!infoButton || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      event.stopPropagation();
      toggleEdenVoteInfoPopover(infoButton);
    });
  }
  clearEdenVoteInputSuggestions(host, 'edenX1VoterName');
  updateEdenVoteInputConfirmation(host, 'edenX1VoterName');
  EDEN_X1_VOTE_CANDIDATE_INPUT_IDS.forEach((id) => {
    clearEdenVoteInputSuggestions(host, id);
    updateEdenVoteInputConfirmation(host, id);
  });
  updateEdenVoteCandidateDetail(host);
}

function renderEdenTeamVotePanel() {
  const saved = readLocalEdenVote();
  const savedSummary = getEdenVoteSavedSummary(saved);
  const savedCandidateNames = savedSummary.candidateNames;
  const savedStatusText = edenVoteSavedStatusText(saved);
  const savedStatus = savedStatusText
    ? `<div class="eden-x1-vote-saved">${esc(savedStatusText)}</div>`
    : '';
  return `<section id="edenX1TeamVotePanel" class="dash-card eden-x1-vote-panel">
    <div class="dash-card-hdr dash-card-hdr-wrap">
      <div>
        <h2 class="dash-card-title"><span>${esc(t('edenX1VoteTitle'))}</span></h2>
        <p class="dash-card-subtitle">${esc(t('edenX1VoteSubtitle'))}</p>
        <a class="eden-x1-vote-help-link" href="#edenX1TopNamesOverview" data-eden-vote-help-link>${esc(t('edenX1VoteHelpJump'))}</a>
      </div>
    </div>
    <form id="edenX1TeamVoteForm" class="eden-x1-vote-form">
      ${renderEdenVoteMemberOptions()}
      <div class="eden-x1-vote-name-stack">
        <label class="eden-x1-vote-field" for="edenX1VoterName">
          <span>${esc(t('edenX1VoteYourName'))}</span>
          <input id="edenX1VoterName" class="dash-input" type="text" value="${esc(savedSummary.voterName || '')}" placeholder="${esc(t('edenX1VotePhSelf'))}" autocomplete="off" aria-describedby="edenX1VoterNameConfirm" required />
          <div class="eden-x1-vote-suggestions" data-eden-vote-suggestions-for="edenX1VoterName"></div>
          <div id="edenX1VoterNameConfirm" class="eden-x1-vote-confirm" data-eden-vote-confirm-for="edenX1VoterName" aria-live="polite"></div>
        </label>
        <button id="edenX1VoteSelfPickBtn" class="eden-x1-vote-self-pick" type="button" data-eden-vote-self-pick hidden disabled>${esc(t('edenX1VoteSelfPick'))}</button>
      </div>
      <label class="eden-x1-vote-field" for="edenX1CandidateName">
        <span>${esc(t('edenX1VoteYourVote'))}</span>
        <input id="edenX1CandidateName" class="dash-input" type="text" value="${esc(savedCandidateNames[0] || '')}" placeholder="${esc(t('edenX1VotePhTeammate'))}" autocomplete="off" aria-describedby="edenX1CandidateNameConfirm" />
        <div class="eden-x1-vote-suggestions" data-eden-vote-suggestions-for="edenX1CandidateName"></div>
        <div id="edenX1CandidateNameConfirm" class="eden-x1-vote-confirm" data-eden-vote-confirm-for="edenX1CandidateName" aria-live="polite"></div>
      </label>
      <label class="eden-x1-vote-field" for="edenX1CandidateName2">
        <span>${esc(t('edenX1VoteYourVoteSecond'))}</span>
        <input id="edenX1CandidateName2" class="dash-input" type="text" value="${esc(savedCandidateNames[1] || '')}" placeholder="${esc(t('edenX1VotePhTeammateSecond'))}" autocomplete="off" aria-describedby="edenX1CandidateName2Confirm" />
        <div class="eden-x1-vote-suggestions" data-eden-vote-suggestions-for="edenX1CandidateName2"></div>
        <div id="edenX1CandidateName2Confirm" class="eden-x1-vote-confirm" data-eden-vote-confirm-for="edenX1CandidateName2" aria-live="polite"></div>
      </label>
      <label class="eden-x1-vote-field" for="edenX1CandidateName3">
        <span>${esc(t('edenX1VoteYourVoteThird'))}</span>
        <input id="edenX1CandidateName3" class="dash-input" type="text" value="${esc(savedCandidateNames[2] || '')}" placeholder="${esc(t('edenX1VotePhTeammateThird'))}" autocomplete="off" aria-describedby="edenX1CandidateName3Confirm" />
        <div class="eden-x1-vote-suggestions" data-eden-vote-suggestions-for="edenX1CandidateName3"></div>
        <div id="edenX1CandidateName3Confirm" class="eden-x1-vote-confirm" data-eden-vote-confirm-for="edenX1CandidateName3" aria-live="polite"></div>
      </label>
      <label class="eden-x1-vote-field" for="edenX1CandidateName4">
        <span>${esc(t('edenX1VoteYourVoteFourth'))}</span>
        <input id="edenX1CandidateName4" class="dash-input" type="text" value="${esc(savedCandidateNames[3] || '')}" placeholder="${esc(t('edenX1VotePhTeammateFourth'))}" autocomplete="off" aria-describedby="edenX1CandidateName4Confirm" />
        <div class="eden-x1-vote-suggestions" data-eden-vote-suggestions-for="edenX1CandidateName4"></div>
        <div id="edenX1CandidateName4Confirm" class="eden-x1-vote-confirm" data-eden-vote-confirm-for="edenX1CandidateName4" aria-live="polite"></div>
      </label>
      <div class="eden-x1-vote-actions">
        <button class="dash-btn dash-btn-primary" type="submit">${esc(t('edenX1VoteCast'))}</button>
        <button id="edenX1VoteCandidateInspectBtn" class="dash-btn eden-x1-vote-inspect-btn" type="button" aria-expanded="false" data-state="empty">${esc(t('edenX1VoteInspectEmpty'))}</button>
        <button id="edenX1VoteClearStatsBtn" class="dash-btn eden-x1-vote-clear-stats" type="button" hidden disabled>${esc(t('edenX1VoteClearStats', { player: '' }))}</button>
      </div>
      <div id="edenX1VoteStatus" class="eden-x1-vote-status" role="status">${savedStatus}</div>
      <div id="edenX1VoteCandidateDetail" class="eden-x1-vote-candidate-detail" hidden></div>
    </form>
  </section>`;
}

function isWeightedContributionMobileViewport() {
  return Boolean(globalThis.matchMedia?.('(max-width: 1024px)').matches);
}

function isWeightedContributionCompactView() {
  if (weightedContributionCompactOverride !== null) {
    return weightedContributionCompactOverride;
  }
  try {
    if (isWeightedContributionMobileViewport()) return true;
    return localStorage.getItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY) === '1';
  } catch {
    return isWeightedContributionMobileViewport();
  }
}

function setWeightedContributionCompactView(enabled) {
  weightedContributionCompactOverride = Boolean(enabled);
  try {
    localStorage.setItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY, enabled ? '1' : '0');
  } catch {
    // Keep the toggle functional even in storage-restricted browsers.
  }
  document
    .querySelectorAll('#dashWeightedContributionPanel .dash-contribution-weighted-card')
    .forEach((card) => {
      card.classList.toggle('dash-weighted-compact', enabled);
      card.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
        button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        button.textContent = enabled ? t('edenX1FullView') : t('edenX1CompactView');
      });
    });
}

function renderWeightedContributionViewToggle(compact) {
  return `<button class="dash-btn dash-btn-xs dash-weighted-view-toggle" type="button" data-weighted-compact-toggle aria-pressed="${compact ? 'true' : 'false'}">${esc(compact ? t('edenX1FullView') : t('edenX1CompactView'))}</button>`;
}

function weightedTableWrapStyle(rowCount) {
  if (isWeightedContributionMobileViewport()) {
    return '';
  }
  const rows = Math.max(1, Number(rowCount) || 0);
  const maxHeight = Math.min(620, Math.max(170, rows * 48 + 104));
  return `max-height:${maxHeight}px;overflow:auto`;
}

function bindWeightedContributionViewToggle(host) {
  host.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      setWeightedContributionCompactView(!isWeightedContributionCompactView());
    });
  });
}

function rewardViewTitleKey(view) {
  return (
    {
      contribution: 'edenX1RewardLeaderboardTitle',
      support: 'edenX1RewardSupportTitle',
      management: 'edenX1RewardManagementTitle',
      team: 'edenX1RewardTeamTitle',
    }[view] || 'edenX1WeightedTitle'
  );
}

function rewardViewMetaKey(view) {
  return (
    {
      contribution: 'edenX1RewardContributionMeta',
      support: 'edenX1RewardSupportMeta',
      management: 'edenX1RewardManagementMeta',
      team: 'edenX1RewardTeamMeta',
    }[view] || ''
  );
}

function rewardViewAccentClass(view) {
  const safeView =
    {
      contribution: 'contribution',
      support: 'support',
      management: 'management',
      team: 'team',
    }[view] || '';
  return safeView ? ` eden-x1-reward-table--${safeView}` : '';
}

function updateRewardFlowControls() {
  document.querySelectorAll('[data-reward-view]').forEach((button) => {
    const view = button.dataset.rewardView || '';
    const active = view === currentRewardView;
    const titleKey = button.dataset.rewardTitleKey || rewardViewTitleKey(view);
    const disabled = !rewardFlowReady;
    button.disabled = disabled;
    button.classList.toggle('is-loading', disabled);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-label', t('edenX1RewardViewAria', { title: t(titleKey) }));
  });
}

function setRewardFlowReady(ready) {
  rewardFlowReady = Boolean(ready);
  updateRewardFlowControls();
}

function setEdenPanelLoading(loading) {
  const isLoading = Boolean(loading);
  $('ocrDashboardSection')?.classList.toggle('eden-x1-panel--loading', isLoading);
  document.body?.classList.toggle('eden-x1-loading', isLoading);
  const nav = document.querySelector('.eden-x1-quicknav');
  if (nav) {
    nav.hidden = isLoading;
    nav.setAttribute('aria-hidden', String(isLoading));
  }
}

function shouldScrollRewardTableOnClick() {
  return window.matchMedia?.('(max-width: 768px)').matches === true;
}

function scrollRewardTableIntoView() {
  const target = $('dashWeightedContributionPanel')?.querySelector('.eden-x1-weighted-card');
  if (!target) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 12);
  window.scrollTo({
    top,
    behavior: reducedMotion ? 'auto' : 'smooth',
  });
}

function queueRewardTableScroll() {
  requestAnimationFrame(() => {
    scrollRewardTableIntoView();
    window.setTimeout(scrollRewardTableIntoView, 120);
  });
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function scrollEdenTargetIntoView(target, options = {}) {
  if (!target) return;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: options.block || 'start',
  });
  if (options.focusSelector) {
    const focusTarget =
      target.querySelector?.(options.focusSelector) ||
      document.querySelector(options.focusSelector);
    if (focusTarget && typeof focusTarget.focus === 'function') {
      window.setTimeout(() => {
        focusTarget.focus({ preventScroll: true });
        if (typeof focusTarget.setSelectionRange === 'function') {
          const end = String(focusTarget.value || '').length;
          focusTarget.setSelectionRange(end, end);
        }
      }, 180);
    }
  } else if (options.focusTarget && typeof target.focus === 'function') {
    window.setTimeout(() => target.focus({ preventScroll: true }), 180);
  }
}

function queryEdenQuickNavTarget(selector) {
  return String(selector || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => document.querySelector(part))
    .find(Boolean);
}

function queueEdenQuickNavScroll(selector, options = {}) {
  const scroll = () => scrollEdenTargetIntoView(queryEdenQuickNavTarget(selector), options);
  requestAnimationFrame(() => {
    scroll();
    window.setTimeout(scroll, 160);
  });
}

function activateEdenRewardView(view) {
  if (!rewardFlowReady || !view) return false;
  if (currentRewardView === view) {
    updateRewardFlowControls();
    return false;
  }
  currentTableSort = null;
  currentRewardView = view;
  scheduleCurrentTableRender({ scrollIntoView: false });
  return true;
}

function bindEdenQuickNav() {
  const nav = document.querySelector('.eden-x1-quicknav');
  if (!nav || nav.dataset.quickNavBound) return;
  nav.dataset.quickNavBound = '1';
  nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quicknav]');
    if (!button) return;
    event.preventDefault();
    const target = button.getAttribute('data-quicknav') || '';
    if (target === 'rewards') {
      queueEdenQuickNavScroll('#edenX1RewardFlowPanel, #edenX1RewardFlowTitle', {
        focusTarget: true,
      });
      return;
    }
    if (target === 'vote') {
      activateEdenRewardView('team');
      queueEdenQuickNavScroll(
        '#edenX1TeamVotePanel, #dashWeightedContributionPanel .eden-x1-vote-panel'
      );
      return;
    }
    if (target === 'my-stats') {
      queueEdenQuickNavScroll('#edenX1MyStatsCard, #edenX1TeamVotePanel', {
        focusSelector: '#edenX1MyStatsSearch, #edenX1VoterName',
      });
      return;
    }
    if (target === 'guild-contribution') {
      queueEdenQuickNavScroll(
        '#edenX1PublicWeightedCard, #dashWeightedContributionPanel .eden-x1-weighted-card',
        {
          focusSelector: '#edenX1PublicWeightedSearch, #edenX1TableSearch',
        }
      );
      return;
    }
    if (target === 'team') {
      queueEdenQuickNavScroll(
        '#edenX1TopNamesOverview, #edenX1RewardTopNamesOverview, #edenX1VoteGuidance',
        {
          focusTarget: true,
        }
      );
      return;
    }
    if (target === 'public') {
      queueEdenQuickNavScroll('#edenX1TopPerformersCard, #edenX1PublicDashboard', {
        focusTarget: true,
      });
    }
  });
}

function renderRewardTablePending() {
  return `<div id="ocrDashboardRoot" class="eden-x1-table-loading" aria-busy="true" role="status">
    <div class="dash-connecting eden-x1-table-loading-card" style="min-height:260px;border-radius:16px">
      <div class="dash-connecting-grid" aria-hidden="true"></div>
      <div class="dash-connecting-stage">
        <span class="dash-connecting-kicker">${esc(t('edenX1LoadingKicker'))}</span>
        <h2 class="dash-connecting-title">${esc(t('edenX1Loading'))}</h2>
        <div class="dash-connecting-bar-wrap">
          <span class="dash-connecting-bar"><span class="dash-connecting-bar-fill" style="width:58%"></span></span>
          <span class="dash-connecting-bar-pct">...</span>
        </div>
        <p class="dash-connecting-status">${esc(t('edenX1LoadingStatus'))}</p>
      </div>
    </div>
  </div>`;
}

function showRewardTablePending() {
  const panel = $('dashWeightedContributionPanel');
  if (!panel) return;
  panel.innerHTML = renderRewardTablePending();
  updateRewardFlowControls();
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => window.setTimeout(resolve, 0));
  });
}

function afterNextPaint(callback) {
  requestAnimationFrame(() => {
    window.setTimeout(callback, 0);
  });
}

function scheduleCurrentTableRender(renderOptions = {}) {
  const token = ++rewardTableRenderToken;
  showRewardTablePending();
  afterNextPaint(() => {
    if (token !== rewardTableRenderToken) return;
    renderCurrentTable({ ...renderOptions, fromSchedule: true });
  });
}

function bindRewardFlowControls() {
  document.querySelectorAll('[data-reward-view]').forEach((button) => {
    if (button.dataset.rewardBound) return;
    button.dataset.rewardBound = '1';
    button.addEventListener('click', () => {
      if (!rewardFlowReady) return;
      const view = button.dataset.rewardView || 'all';
      if (view === currentRewardView) return;
      currentTableSort = null;
      currentRewardView = view;
      scheduleCurrentTableRender({ scrollIntoView: shouldScrollRewardTableOnClick() });
    });
  });
  updateRewardFlowControls();
}

function getContributionRewardRows() {
  const supportPlayerKeys = new Set(getSupportRewardRows().map((row) => row.playerKey));
  const sorted = currentRows
    .filter((row) => Number(row.currentRank) > 0 && !supportPlayerKeys.has(row.playerKey))
    .slice()
    .sort(
      (a, b) =>
        valueOf(b.weightedScore) - valueOf(a.weightedScore) ||
        valueOf(a.finalRank || 999999) - valueOf(b.finalRank || 999999) ||
        Number(a.currentRank) - Number(b.currentRank) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    );
  const rows = [];
  let rewardSlot = 0;
  for (const row of sorted) {
    const isForfeited = row.rewardReason === 'forfeit_premium';
    if (isForfeited) {
      if (rewardSlot < 10) {
        rows.push({
          ...row,
          edenX1RewardSlot: null,
          edenX1RewardSkipped: true,
        });
      }
      continue;
    }
    if (rewardSlot >= 10) break;
    rewardSlot += 1;
    rows.push({
      ...row,
      edenX1RewardSlot: rewardSlot,
      edenX1RewardSkipped: false,
    });
  }
  return rows;
}

function getSupportRewardRows() {
  return currentRows
    .filter((row) => rowBonusTotal(row) > 0)
    .slice()
    .sort(
      (a, b) =>
        valueOf(b.weightedScore) - valueOf(a.weightedScore) ||
        rowBonusTotal(b) - rowBonusTotal(a) ||
        valueOf(a.finalRank || 999999) - valueOf(b.finalRank || 999999) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    )
    .slice(0, 4)
    .map((row, index) => ({
      ...row,
      edenX1RewardSlot: index + 1,
      edenX1SupportReward: index === 0 ? 'guild_master' : 'core',
    }));
}

function contributionRewardContextForRow(row, numberValue) {
  if (row.edenX1RewardSkipped) {
    return {
      rank: row.finalRank,
      rankLabel: t('adminContributionFinalRank'),
      baseReward: row.baseReward || 'core',
      finalReward: 'none',
      finalRewardLabel: t('edenX1RewardSkippedPremium'),
      reason: t('edenX1RewardSkippedPremiumReason', { rank: row.finalRank }),
    };
  }
  const reward = row.rewardReason === 'grant_premium' ? row.finalReward || 'core' : 'core';
  const finalReward = row.rewardReason === 'forfeit_premium' ? row.finalReward : reward;
  const label = contributionRewardLabel(finalReward);
  return {
    rank: numberValue,
    rankLabel: t('edenX1RewardLeaderboardTitle'),
    baseReward: reward,
    finalReward,
    reason: `${t('edenX1RewardLeaderboardTitle')} #${numberValue}. ${t('adminContributionFinalReward')}: ${label}.`,
  };
}

function supportRewardContextForRow(row, numberValue) {
  const reward = row.edenX1SupportReward || 'core';
  const label = contributionRewardLabel(reward);
  return {
    rank: numberValue,
    rankLabel: t('edenX1RewardSupportTitle'),
    baseReward: reward,
    finalReward: reward,
    reason: `${t('edenX1RewardSupportTitle')} #${numberValue}. ${t('adminContributionFinalReward')}: ${label}.`,
  };
}

function plannedRewardContextKey(row) {
  return row?.playerKey || publicPlayerKey(row?.playerName || row?.sourceName || '');
}

function createPlannedRewardContextMap() {
  const contexts = new Map();
  getSupportRewardRows().forEach((row, index) => {
    contexts.set(plannedRewardContextKey(row), supportRewardContextForRow(row, index + 1));
  });
  getContributionRewardRows().forEach((row, index) => {
    const key = plannedRewardContextKey(row);
    if (!contexts.has(key)) {
      contexts.set(key, contributionRewardContextForRow(row, index + 1));
    }
  });
  return contexts;
}

function rowContributionRewardScore(row) {
  return valueOf(row.weightedScore);
}

function rowBonusTotal(row) {
  return (
    valueOf(row.shieldWalls) + valueOf(row.pathers) + valueOf(row.banners) + conductBonusValue(row)
  );
}

function rowNumberValue(row, numberMode, index = 0) {
  if (numberMode === 'current') return row.currentRank || 999999;
  if (numberMode === 'index') return index + 1;
  return row.finalRank || 999999;
}

function filterWeightedRows(rows) {
  const query = currentTableSearch.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => {
    const haystack = [
      row.playerName,
      row.sourceName,
      row.playerKey,
      formatScore(row.contributionExGuild || 0),
      contributionRewardLabel(row.currentReward),
      contributionRewardLabel(row.finalReward),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

function sortWeightedRowsBy(rows, sort, numberMode, options = {}) {
  if (!sort || !sort.col) return rows;
  const rewardContextForRow =
    typeof options.rewardContextForRow === 'function' ? options.rewardContextForRow : () => ({});
  const finalRewardLabelForRow = (row, index) => {
    const context = rewardContextForRow(row, index) || {};
    return (
      context.finalRewardLabel || contributionRewardLabel(context.finalReward || row.finalReward)
    );
  };
  const accessors = {
    number: (row) => rowNumberValue(row, numberMode),
    player: (row) => row.playerName,
    currentRank: (row) => row.currentRank || 999999,
    reward: (row) => contributionRewardLabel(row.currentReward),
    contribution: (row) => valueOf(row.contributionScore),
    exGuild: (row) => valueOf(row.contributionExGuild),
    shieldWalls: (row) => valueOf(row.shieldWalls),
    pathers: (row) => valueOf(row.pathers),
    banners: (row) => valueOf(row.banners),
    conduct: conductBonusValue,
    total: rowBonusTotal,
    weighted: (row) => valueOf(row.weightedScore),
    finalRank: (row) => row.finalRank || 999999,
    finalReward: finalRewardLabelForRow,
  };
  const get = accessors[sort.col];
  if (!get) return rows;
  const indexedRows = rows.map((row, index) => ({ row, index }));
  const sorted = indexedRows.sort((a, b) => {
    const av = get(a.row, a.index);
    const bv = get(b.row, b.index);
    if (typeof av === 'string' || typeof bv === 'string') {
      return String(av).localeCompare(String(bv));
    }
    return av - bv;
  });
  const ordered = sort.dir === 'asc' ? sorted : sorted.reverse();
  return ordered.map((entry) => entry.row);
}

function sortedWeightedRows(rows, numberMode) {
  return sortWeightedRowsBy(rows, currentTableSort, numberMode);
}

function defaultWeightedSortDir(col) {
  return ['number', 'player', 'reward', 'currentRank', 'finalRank', 'finalReward'].includes(col)
    ? 'asc'
    : 'desc';
}

function setWeightedSort(col, options = {}) {
  if (!col) {
    currentTableSort = null;
    renderCurrentTable();
    return;
  }
  if (options.forceDefault) {
    currentTableSort = { col, dir: defaultWeightedSortDir(col) };
    renderCurrentTable();
    return;
  }
  const cur = currentTableSort || {};
  if (cur.col === col) {
    currentTableSort = { col, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  } else {
    currentTableSort = { col, dir: defaultWeightedSortDir(col) };
  }
  renderCurrentTable();
}

function mobileSortRankKey(numberMode) {
  return numberMode === 'current' ? 'currentRank' : 'finalRank';
}

function renderWeightedMobileSortSelect(numberMode) {
  const rankKey = mobileSortRankKey(numberMode);
  const fallbackCol = numberMode === 'current' ? 'currentRank' : 'weighted';
  const activeCol = currentTableSort?.col || fallbackCol;
  const options = [
    ['weighted', t('edenX1ThWeightedScore')],
    ['player', t('adminContributionMember')],
    ['contribution', t('edenX1ThContribution')],
    ['exGuild', t('edenX1ThExGuild')],
    [rankKey, t(numberMode === 'current' ? 'adminContributionRank' : 'adminContributionFinalRank')],
  ];
  return `<label class="dash-weighted-mobile-sort" for="edenX1MobileSort">
    <span class="sr-only">Sort weighted contribution table</span>
    <select id="edenX1MobileSort" class="dash-select-sm" aria-label="Sort weighted contribution table">
      ${options
        .map(
          ([value, label]) =>
            `<option value="${esc(value)}"${activeCol === value ? ' selected' : ''}>${esc(label)}</option>`
        )
        .join('')}
    </select>
  </label>`;
}

function renderSortableHeader(key, label, options = {}) {
  const active = currentTableSort?.col === key;
  const ariaSort = active
    ? ` aria-sort="${currentTableSort.dir === 'asc' ? 'ascending' : 'descending'}"`
    : '';
  const className = options.className ? ` class="${options.className}"` : '';
  const style = options.style ? ` style="${options.style}"` : '';
  const glyph = active
    ? `<span class="dash-sort-glyph">${currentTableSort.dir === 'asc' ? ' ^' : ' v'}</span>`
    : '';
  return `<th${className}${style} data-weighted-sort="${esc(key)}"${ariaSort} tabindex="0">${esc(label)}${glyph}</th>`;
}

function renderPublicSortableHeader(key, label, options = {}) {
  const active = currentPublicTableSort?.col === key;
  const ariaSort = active
    ? ` aria-sort="${currentPublicTableSort.dir === 'asc' ? 'ascending' : 'descending'}"`
    : '';
  const className = options.className ? ` class="${options.className}"` : '';
  const style = options.style ? ` style="${options.style}"` : '';
  const glyph = active
    ? `<span class="dash-sort-glyph">${currentPublicTableSort.dir === 'asc' ? ' ^' : ' v'}</span>`
    : '';
  return `<th${className}${style} data-public-weighted-sort="${esc(key)}"${ariaSort} tabindex="0">${esc(label)}${glyph}</th>`;
}

function rerenderPublicWeightedContributionCard(host, options = {}) {
  const card = host?.querySelector('.eden-x1-public-weighted-card');
  if (!card) return;
  card.outerHTML = renderPublicWeightedContributionTable();
  bindWeightedPopovers(host);
  if (!options.focusSearch) return;
  const nextInput = host.querySelector('#edenX1PublicWeightedSearch');
  if (!nextInput) return;
  const cursor = options.selectionStart ?? nextInput.value.length;
  nextInput.focus();
  nextInput.setSelectionRange(cursor, cursor);
}

function resolvePublicStatsOption(value = currentPublicStatsSearch) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const matchedMember = findEdenMemberOption(raw);
  if (matchedMember) return matchedMember;
  const compact = compactPlayerIdentity(raw);
  const publicPlayer =
    (compact ? publicPlayerRows.find((row) => row.key === compact) : null) ||
    publicPlayerRows.find((row) => String(row.name || '').toLowerCase() === raw.toLowerCase()) ||
    (compact
      ? publicPlayerRows.find((row) => row.key.includes(compact) || compact.includes(row.key))
      : null);
  if (!publicPlayer) return null;
  return {
    playerKey: publicPlayer.key,
    playerName: publicPlayer.name,
  };
}

function renderPublicMyStatsCard() {
  const option = resolvePublicStatsOption();
  const query = currentPublicStatsSearch.trim();
  const compactQuery = compactPlayerIdentity(query);
  const hasExactSelection =
    Boolean(option && query) &&
    (option.playerName === query ||
      option.playerName.toLowerCase() === query.toLowerCase() ||
      option.playerKey === compactQuery);
  const suggestions = query && !hasExactSelection ? getPublicStatsMatches(query, 6) : [];
  const detail = option
    ? renderEdenVoteCandidateDetail(option)
    : `<div class="dash-empty eden-x1-my-stats-empty">${esc(
        query ? t('edenX1MyStatsNoMatch') : t('edenX1MyStatsEmpty')
      )}</div>`;
  const suggestionList = suggestions.length
    ? suggestions
        .map(
          (
            row,
            index
          ) => `<button class="eden-x1-vote-suggestion eden-x1-my-stats-suggestion" type="button" data-eden-my-stats-pick="${esc(row.playerName)}" data-eden-my-stats-key="${esc(row.playerKey)}">
            <span>${renderTaggedPlayerName(row)}</span>
            <em>${esc(index === 0 ? t('edenX1VoteMatchBest') : t('edenX1VoteMatchSimilar'))}</em>
          </button>`
        )
        .join('')
    : query
      ? hasExactSelection
        ? ''
        : `<span class="eden-x1-vote-suggestion-empty">${esc(t('edenX1MyStatsNoMatch'))}</span>`
      : '';
  const body = `<div class="eden-x1-my-stats-shell">
    <label class="dash-search-wrap dash-weighted-search eden-x1-my-stats-search" for="edenX1MyStatsSearch">
      <svg class="dash-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input id="edenX1MyStatsSearch" class="dash-search-input" type="search" value="${esc(currentPublicStatsSearch)}" placeholder="${esc(t('edenX1MyStatsPlaceholder'))}" autocomplete="off" aria-label="${esc(t('edenX1MyStatsPlaceholder'))}" />
    </label>
    <p class="eden-x1-my-stats-helper">${esc(t('edenX1MyStatsHint'))}</p>
    <div class="eden-x1-vote-suggestions eden-x1-my-stats-suggestions" aria-label="${esc(t('edenX1MyStatsTitle'))}">
      ${suggestionList}
    </div>
    <div id="edenX1MyStatsDetail" class="eden-x1-my-stats-detail" aria-live="polite">
      ${detail}
    </div>
  </div>`;
  return renderPublicCard(
    t('edenX1MyStatsTitle'),
    '',
    body,
    'eden-x1-public-wide eden-x1-my-stats-card',
    'id="edenX1MyStatsCard" tabindex="-1"'
  );
}

function rerenderPublicMyStatsCard(host, options = {}) {
  const card = host?.querySelector('.eden-x1-my-stats-card');
  if (!card) return;
  card.outerHTML = renderPublicMyStatsCard();
  bindWeightedPopovers(host);
  bindEdenVoteInfoDismissal();
  if (!options.focusSearch) return;
  const nextInput = host.querySelector('#edenX1MyStatsSearch');
  if (!nextInput) return;
  const cursor = options.selectionStart ?? nextInput.value.length;
  nextInput.focus();
  nextInput.setSelectionRange(cursor, cursor);
}

function setPublicWeightedSort(col, host) {
  if (!col) return;
  const cur = currentPublicTableSort || {};
  if (cur.col === col) {
    currentPublicTableSort = { col, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  } else {
    currentPublicTableSort = { col, dir: defaultWeightedSortDir(col) };
  }
  rerenderPublicWeightedContributionCard(host);
}

function bindWeightedTableControls(host) {
  bindWeightedContributionViewToggle(host);
  const search = $('edenX1TableSearch');
  if (search && !search.dataset.bound) {
    search.dataset.bound = '1';
    search.addEventListener('input', (event) => {
      currentTableSearch = event.target.value || '';
      renderCurrentTable({ focusSearch: true });
    });
  }
  const mobileSort = $('edenX1MobileSort');
  if (mobileSort && !mobileSort.dataset.bound) {
    mobileSort.dataset.bound = '1';
    mobileSort.addEventListener('change', (event) => {
      setWeightedSort(event.target.value, { forceDefault: true });
    });
  }
  host.querySelectorAll('th[data-weighted-sort]').forEach((th) => {
    if (th.dataset.bound) return;
    th.dataset.bound = '1';
    const activate = () => setWeightedSort(th.dataset.weightedSort);
    th.addEventListener('click', activate);
    th.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate();
    });
  });
  bindWeightedPopovers(host);
}

function closeWeightedPopovers(except = null) {
  document.querySelectorAll('.eden-x1-popover-trigger.is-open').forEach((button) => {
    if (button === except) return;
    button.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    hideWeightedPopover(button);
  });
}

function bindWeightedPopoverDismissal() {
  if (weightedPopoverDismissalBound) return;
  weightedPopoverDismissalBound = true;
  document.addEventListener('click', (event) => {
    if (event.target.closest('.eden-x1-popover-trigger')) return;
    closeWeightedPopovers();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeWeightedPopovers();
  });
  globalThis.addEventListener(
    'scroll',
    (event) => {
      if (Date.now() - weightedPopoverOpenedAt < 180) return;
      if (event.target?.closest?.('.dash-weighted-score-popover')) return;
      closeWeightedPopovers();
    },
    {
      capture: true,
      passive: true,
    }
  );
}

function positionWeightedPopover(button) {
  const popover = button?.querySelector('.dash-weighted-score-popover');
  if (!popover) return;
  if (isWeightedContributionMobileViewport()) {
    popover.style.display = '';
    return;
  }

  const margin = 12;
  const previousVisibility = popover.style.visibility;
  const previousOpacity = popover.style.opacity;
  popover.style.display = 'block';
  popover.style.visibility = 'hidden';
  popover.style.opacity = '0';

  const buttonRect = button.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const popoverWidth = Math.min(
    Math.max(popoverRect.width || 310, 220),
    Math.max(220, globalThis.innerWidth - margin * 2)
  );
  const popoverHeight = Math.min(
    Math.max(popoverRect.height || 220, 140),
    Math.max(140, globalThis.innerHeight - margin * 2)
  );
  const idealLeft = buttonRect.left + buttonRect.width / 2;
  const left = Math.min(
    Math.max(idealLeft, margin + popoverWidth / 2),
    globalThis.innerWidth - margin - popoverWidth / 2
  );
  const belowTop = buttonRect.bottom + 10;
  const aboveTop = buttonRect.top - popoverHeight - 10;
  const hasMoreRoomAbove =
    globalThis.innerHeight - belowTop < Math.min(popoverHeight, 180) && aboveTop >= margin;
  const top = hasMoreRoomAbove
    ? Math.max(margin, aboveTop)
    : Math.min(belowTop, globalThis.innerHeight - margin - popoverHeight);

  popover.style.position = 'fixed';
  popover.style.top = `${Math.round(Math.max(margin, top))}px`;
  popover.style.right = 'auto';
  popover.style.left = `${Math.round(left)}px`;
  popover.style.maxHeight = 'min(72vh, 420px)';
  popover.style.overflowY = 'auto';
  popover.style.transform = 'translateX(-50%)';
  popover.style.visibility = previousVisibility;
  popover.style.opacity = previousOpacity;
}

function hideWeightedPopover(button) {
  const popover = button?.querySelector('.dash-weighted-score-popover');
  if (!popover || isWeightedContributionMobileViewport()) return;
  popover.style.display = 'none';
}

function bindWeightedPopovers(host) {
  bindWeightedPopoverDismissal();
  host.querySelectorAll('.eden-x1-popover-trigger').forEach((button) => {
    if (button.dataset.popoverBound) return;
    button.dataset.popoverBound = '1';
    button.setAttribute('aria-expanded', 'false');
    hideWeightedPopover(button);
    button.addEventListener('pointerenter', () => positionWeightedPopover(button));
    button.addEventListener('pointerleave', () => {
      if (button.classList.contains('is-open') || button.contains(document.activeElement)) return;
      hideWeightedPopover(button);
    });
    button.addEventListener('focusin', () => positionWeightedPopover(button));
    button.addEventListener('focusout', () => {
      setTimeout(() => {
        if (button.classList.contains('is-open') || button.contains(document.activeElement)) return;
        hideWeightedPopover(button);
      }, 0);
    });
    button.addEventListener('click', (event) => {
      if (event.target.closest('.dash-weighted-score-popover')) return;
      event.preventDefault();
      event.stopPropagation();
      const shouldOpen = !button.classList.contains('is-open');
      closeWeightedPopovers(button);
      if (shouldOpen) positionWeightedPopover(button);
      if (shouldOpen) weightedPopoverOpenedAt = Date.now();
      button.classList.toggle('is-open', shouldOpen);
      button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      if (!shouldOpen) hideWeightedPopover(button);
    });
  });
}

function managementVoteWinnerReason(winner) {
  const ballotCount = valueOf(currentManagementVoteResults.totalBallots);
  const rawNames = Array.isArray(winner?.rawNames) ? winner.rawNames.filter(Boolean) : [];
  const ballotLabel = ballotCount === 1 ? 'ballot' : 'ballots';
  const sourceNames = rawNames.length ? rawNames.join(', ') : winner?.playerName || '';
  return [
    'X management form votes',
    ballotCount ? `from ${ballotCount.toLocaleString()} ${ballotLabel}` : '',
    sourceNames ? `Source name(s): ${sourceNames}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function createRewardPriorityIdentitySet() {
  return { keys: new Set(), familyKeys: new Set() };
}

function addRewardPriorityIdentity(reserved, playerKey) {
  const key = String(playerKey || '').trim();
  if (!key) return;
  reserved.keys.add(key);
  const familyKey = getWeightedPlayerFamilyKey(key);
  if (familyKey) reserved.familyKeys.add(familyKey);
}

function mergeRewardPriorityIdentities(target, source) {
  if (!target || !source) return;
  source.keys?.forEach((key) => addRewardPriorityIdentity(target, key));
  source.familyKeys?.forEach((familyKey) => {
    if (familyKey) target.familyKeys.add(familyKey);
  });
}

function getForfeitedRewardPriorityIdentities(adjustments, season) {
  const reserved = createRewardPriorityIdentitySet();
  normalizeWeightedR5Adjustments(adjustments, season).forEach((adjustment) => {
    if (adjustment?.category !== 'forfeit_premium') return;
    addRewardPriorityIdentity(reserved, adjustment.playerKey);
  });
  return reserved;
}

function managementVoteCandidateIsReserved(winner, reserved) {
  const key = String(winner?.playerKey || '').trim();
  if (!key) return false;
  if (reserved.keys.has(key)) return true;
  const familyKey = getWeightedPlayerFamilyKey(key);
  return Boolean(familyKey && reserved.familyKeys.has(familyKey));
}

function getReservedRewardPriorityIdentities() {
  const reserved = createRewardPriorityIdentitySet();
  getSupportRewardRows().forEach((row) => addRewardPriorityIdentity(reserved, row.playerKey));
  getContributionRewardRows()
    .filter((row) => !row.edenX1RewardSkipped)
    .forEach((row) => addRewardPriorityIdentity(reserved, row.playerKey));
  currentRows
    .filter((row) => row.rewardReason === 'forfeit_premium')
    .forEach((row) => addRewardPriorityIdentity(reserved, row.playerKey));
  mergeRewardPriorityIdentities(reserved, currentForfeitedRewardIdentities);
  return reserved;
}

function getEligibleManagementVoteWinners() {
  const rankings = Array.isArray(currentManagementVoteResults.rankings)
    ? currentManagementVoteResults.rankings
    : [];
  const reserved = getReservedRewardPriorityIdentities();
  return rankings
    .filter((winner) => !managementVoteCandidateIsReserved(winner, reserved))
    .slice(0, EDEN_X1_MANAGEMENT_VOTE_WINNER_LIMIT);
}

function rewardSlotRows(view) {
  if (view === 'management') {
    const winners = getEligibleManagementVoteWinners();
    return Array.from({ length: 3 }, (_, index) => ({
      slot: index + 1,
      ...(winners[index]
        ? {
            playerName: winners[index].playerName,
            playerKey: winners[index].playerKey,
          }
        : { playerName: t('edenX1Tba') }),
      group: t('edenX1RewardManagementTitle'),
      status: winners[index]
        ? EDEN_X1_MANAGEMENT_VOTE_STATUS
        : t('edenX1RewardManagementVotePending'),
      statusReason: winners[index] ? managementVoteWinnerReason(winners[index]) : '',
    }));
  }
  if (view === 'team') {
    return Array.from({ length: 3 }, (_, index) => ({
      slot: index + 1,
      player: t('edenX1Tba'),
      group: t('edenX1RewardTeamTitle'),
      status: t('edenX1RewardVotePending'),
    }));
  }
  return [];
}

function renderRewardSlotStatus(row, view) {
  if (!row.statusReason) return esc(row.status);
  const tooltipId = `edenX1SlotStatusTip-${view}-${row.slot}`;
  return `<button class="eden-x1-slot-status-trigger eden-x1-popover-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(row.statusReason)}">
    <span class="eden-x1-slot-status-label">${esc(row.status)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover eden-x1-slot-status-popover" role="tooltip">
      <strong>${esc(t('edenX1RewardAssignedReasonTitle'))}</strong>
      <small>${esc(row.statusReason)}</small>
    </span>
  </button>`;
}

function renderWeightedScorePopover(row, index) {
  const tooltipId = `edenX1WeightedScoreTip-${index}`;
  const dutyCount = row.banners + row.pathers + row.shieldWalls;
  const conductBonus = conductBonusValue(row);
  const conductPoints = Number.isFinite(Number(row.conductPoints))
    ? Number(row.conductPoints)
    : conductBonus * 10000;
  const dutyNote = t('edenX1DutyFormula', {
    banners: row.banners,
    pathers: row.pathers,
    shieldWalls: row.shieldWalls,
    count: dutyCount,
  });
  const conductNote = t('edenX1ConductPrivateNotice');
  return `<button class="dash-weighted-score-trigger eden-x1-popover-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1WeightedBreakdownAria', { player: row.playerName }))}">
    <span class="dash-weighted-score-value">${formatWeightedScore(row.weightedScore)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1WeightedBreakdownTitle'))}</strong>
      <span><span>${esc(t('edenX1BreakdownContribution'))}</span><b>${formatScore(row.contributionScore)}</b></span>
      <span><span>${esc(t('edenX1BreakdownExGuild'))}</span><b>${formatScore(row.contributionExGuild || 0)}</b></span>
      <span><span>${esc(t('edenX1BreakdownDuty'))}<small>${esc(dutyNote)}</small></span><b>${formatScore(row.dutyPoints || 0)}</b></span>
      <span><span>${esc(t('edenX1BreakdownConductPoints'))}<small>${esc(conductNote)}</small></span><b>${formatSignedNumber(conductPoints)}</b></span>
      <span class="dash-weighted-score-popover-total"><span>${esc(t('edenX1BreakdownTotal'))}</span><b>${formatWeightedScore(row.weightedScore)}</b></span>
    </span>
  </button>`;
}

function renderConductScorePopover(row, index) {
  const tooltipId = `edenX1ConductTip-${index}`;
  const conductBonus = conductBonusValue(row);
  return `<button class="dash-weighted-score-trigger dash-weighted-conduct-trigger eden-x1-popover-trigger ${conductBonus >= 0 ? 'dash-positive' : 'dash-negative'}" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1ConductAria', { player: row.playerName }))}">
    <span class="dash-weighted-score-value">${formatSignedNumber(conductBonus)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover dash-weighted-conduct-popover" role="tooltip">
      <small class="dash-weighted-conduct-note">${esc(t('edenX1ConductPrivateNotice'))}</small>
    </span>
  </button>`;
}

function renderFinalRankPopover(row, index) {
  const tooltipId = `edenX1FinalRankTip-${index}`;
  const cur = Number(row.currentRank);
  const hasCur = Number.isFinite(cur) && cur > 0;
  const delta = hasCur ? cur - row.finalRank : 0;
  const rankScore = rowContributionRewardScore(row);
  const movement = !hasCur
    ? '--'
    : delta > 0
      ? t('edenX1RankUp', { count: delta })
      : delta < 0
        ? t('edenX1RankDown', { count: Math.abs(delta) })
        : t('edenX1RankSame');
  return `<button class="dash-weighted-rank-trigger eden-x1-popover-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1RankReasonAria', { player: row.playerName }))}">
    <span class="dash-weighted-score-value">#${row.finalRank}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1RankReasonTitle'))}</strong>
      <span><span>${esc(t('edenX1RankedBy'))}</span><b>${esc(t('edenX1RewardLeaderboardTitle'))}</b></span>
      <span><span>${esc(t('edenX1RewardLeaderboardTitle'))}</span><b>${formatScore(rankScore)}</b></span>
      <span><span>${esc(t('adminContributionRank'))}</span><b>${hasCur ? `#${cur}` : '--'}</b></span>
      <span><span>${esc(t('edenX1RankMovement'))}</span><b>${esc(movement)}</b></span>
      <span class="dash-weighted-score-popover-total"><span>${esc(t('adminContributionFinalRank'))}</span><b>#${row.finalRank}</b></span>
    </span>
  </button>`;
}

function renderFinalRewardPopover(row, index, context = {}) {
  const tooltipId = `edenX1FinalRewardTip-${index}`;
  const rewardClass = rewardThemeClass(context.finalReward || row.finalReward);
  const baseReward = contributionRewardLabel(context.baseReward || row.baseReward);
  const finalReward =
    context.finalRewardLabel || contributionRewardLabel(context.finalReward || row.finalReward);
  const rankLabel = context.rankLabel || t('adminContributionFinalRank');
  const rankValue = context.rank || row.finalRank;
  const rankScore = rowContributionRewardScore(row);
  const hasPrivateR5Decision =
    row.rewardReason === 'grant_premium' || row.rewardReason === 'forfeit_premium';
  const reason = context.reason
    ? context.reason
    : hasPrivateR5Decision
      ? t('edenX1ConductPrivateNotice')
      : t('edenX1RewardReasonRank', { rank: row.finalRank, reward: baseReward });
  return `<button class="dash-weighted-reward-trigger eden-x1-popover-trigger ${rewardClass}" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1RewardReasonAria', { player: row.playerName, reward: finalReward }))}">
    <span class="dash-weighted-reward-value">${esc(finalReward)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1RewardReasonTitle'))}</strong>
      <span><span>${esc(t('edenX1RankedBy'))}</span><b>${esc(t('edenX1RewardLeaderboardTitle'))}</b></span>
      <span><span>${esc(t('edenX1RewardLeaderboardTitle'))}</span><b>${formatScore(rankScore)}</b></span>
      <span><span>${esc(rankLabel)}</span><b>#${rankValue}</b></span>
      <span><span>${esc(t('adminContributionReward'))}</span><b>${esc(baseReward)}</b></span>
      <span><span>${esc(t('adminContributionFinalReward'))}</span><b>${esc(finalReward)}</b></span>
      <small>${esc(reason)}</small>
    </span>
  </button>`;
}

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#060b13');

  const btn = $('themeToggle');
  const darkIcon = btn?.querySelector('.theme-icon-dark');
  const lightIcon = btn?.querySelector('.theme-icon-light');
  if (darkIcon && lightIcon) {
    darkIcon.classList.toggle('hidden', theme === 'light');
    lightIcon.classList.toggle('hidden', theme !== 'light');
  }
}

function initTheme() {
  applyTheme(getPreferredTheme());
  if (!localStorage.getItem(THEME_STORAGE_KEY) && localStorage.getItem('theme')) {
    localStorage.setItem(THEME_STORAGE_KEY, localStorage.getItem('theme'));
    localStorage.removeItem('theme');
  }
  const btn = $('themeToggle');
  if (!btn || btn.dataset.themeWired) return;
  btn.dataset.themeWired = '1';
  btn.addEventListener('click', () => {
    const current =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    localStorage.removeItem('theme');
    applyTheme(next);
  });
}

function getLanguage() {
  try {
    return localStorage.getItem('vts_hero_lang') || 'en';
  } catch {
    return 'en';
  }
}

function contributionRewardLabel(reward) {
  if (!reward) return '--';
  const labels = {
    guild_master: t('adminContributionRewardGuildMaster'),
    core: t('adminContributionRewardCore'),
    power_house: t('adminContributionRewardPowerHouse'),
    members: t('adminContributionRewardMembers'),
    standard: t('adminContributionRewardStandard'),
    premium: t('adminContributionRewardPremium'),
    review: t('adminContributionRewardReview'),
    none: t('adminContributionRewardNone'),
  };
  return labels[reward] || reward;
}

function rewardThemeClass(reward) {
  const themes = {
    guild_master: 'guild-master',
    core: 'core',
    power_house: 'power-house',
    members: 'members',
    premium: 'premium',
    standard: 'standard',
    review: 'review',
    none: 'none',
  };
  return `eden-x1-reward-theme-${themes[reward] || 'default'}`;
}

function publicAttackPlayers(attack) {
  return Array.isArray(attack?.players) ? attack.players : [];
}

function publicGameTimeLabel(value) {
  const text = String(value || '').trim();
  return text || t('edenX1UnknownTime');
}

function publicAttackMs(attack) {
  const parsed = parseGameTimeDateMs(attack?.game_time || attack?.time || attack?.date || '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function sortPublicAttacks(attacks) {
  return (Array.isArray(attacks) ? attacks : [])
    .filter((attack) => attack && typeof attack === 'object')
    .slice()
    .sort(
      (a, b) =>
        publicAttackMs(b) - publicAttackMs(a) ||
        String(b?.game_time || '').localeCompare(String(a?.game_time || ''))
    );
}

function publicStructureLabel(attack) {
  return formatDatasetStructureLabel(attack) || t('edenX1UnknownStructure');
}

function publicStructureKey(attack) {
  const source = getDatasetStructureTarget(attack || {});
  const target = normalizeStructureTarget(source.structure_name, source.structure_level);
  return [target.structure_name || 'Unknown Structure', target.structure_level || '']
    .map((part) =>
      String(part)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    )
    .join('|');
}

function publicPlayerName(player, attackPlayers = []) {
  try {
    return resolveCanonicalPlayerName(player, { attackPlayers }) || t('edenX1UnknownPlayer');
  } catch {
    const name = stripGuildTagsFromPlayerName(player?.name || player?.player || player || '');
    return String(name || t('edenX1UnknownPlayer')).trim();
  }
}

function publicPlayerKey(name) {
  return compactPlayerIdentity(stripGuildTagsFromPlayerName(name || '')) || 'unknown_player';
}

function publicPlayerKeyFromName(name) {
  return publicPlayerKey(name);
}

function readPlayerDisplayName(player) {
  if (typeof player === 'string') return player;
  return player?.playerName || player?.name || player?.displayName || player?.player || '';
}

function renderTaggedPlayerName(player, nameHtml = '') {
  const labelHtml = nameHtml || esc(readPlayerDisplayName(player));
  const tagHtml = renderSpecialPlayerTag(player, esc);
  if (!tagHtml) return labelHtml;
  return `<span class="dash-player-rank-name"><span class="dash-player-rank-label">${labelHtml}</span>${tagHtml}</span>`;
}

function publicPlayerButton(name, key = publicPlayerKeyFromName(name), className = '') {
  const label = name || t('edenX1UnknownPlayer');
  const classes = ['eden-x1-clickable-name', className].filter(Boolean).join(' ');
  const button = `<button type="button" class="${esc(classes)}" style="appearance:none;border:0;background:transparent;color:inherit;font:inherit;font-weight:inherit;line-height:inherit;padding:0;text-align:inherit;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(103,232,249,.42);text-underline-offset:3px" data-public-player="${esc(key)}" aria-label="${esc(t('edenX1OpenPlayerAria', { player: label }))}">${esc(label)}</button>`;
  return renderTaggedPlayerName({ playerName: label, playerKey: key }, button);
}

function publicStructureButton(label, key, className = '') {
  const text = label || t('edenX1UnknownStructure');
  const classes = ['eden-x1-clickable-name', className].filter(Boolean).join(' ');
  return `<button type="button" class="${esc(classes)}" style="appearance:none;border:0;background:transparent;color:inherit;font:inherit;font-weight:inherit;line-height:inherit;padding:0;text-align:inherit;cursor:pointer;text-decoration:underline;text-decoration-color:rgba(103,232,249,.42);text-underline-offset:3px" data-public-structure="${esc(key)}" aria-label="${esc(t('edenX1OpenStructureAria', { structure: text }))}">${esc(text)}</button>`;
}

function parsePublicGameTime(value) {
  const text = publicGameTimeLabel(value);
  const match = text.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*([^,]+),)?[^0-9]*(\d{1,2}):(\d{2})/
  );
  if (!match) return null;
  const [, dd, mm, yyyy, dayName, hh, min] = match;
  const date = new Date(
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min))
  );
  if (Number.isNaN(date.getTime())) return null;
  return { date, dayName: String(dayName || '').trim(), hour: Number(hh), raw: text };
}

function publicAttackDayLabel(attack) {
  const parsed = parsePublicGameTime(attack?.game_time || attack?.time);
  if (parsed) {
    const dd = String(parsed.date.getUTCDate()).padStart(2, '0');
    const mm = String(parsed.date.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = parsed.date.getUTCFullYear();
    return parsed.dayName ? `${dd}/${mm}/${yyyy}, ${parsed.dayName}` : `${dd}/${mm}/${yyyy}`;
  }
  return (
    publicGameTimeLabel(attack?.game_time || attack?.time).split(',')[0] || t('edenX1UnknownTime')
  );
}

function publicAttackHour(attack) {
  const parsed = parsePublicGameTime(attack?.game_time || attack?.time);
  return parsed ? parsed.hour : 0;
}

function publicAverage(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function publicPlayerValueForAttack(attack, playerKey) {
  const players = publicAttackPlayers(attack);
  return players.reduce((sum, entry) => {
    const name = publicPlayerName(entry, players);
    if (publicPlayerKey(name) !== playerKey) return sum;
    return sum + valueOf(entry?.value ?? entry?.val ?? entry?.demolition ?? entry?.total);
  }, 0);
}

function publicSparkline(values, color) {
  const nums = values.map(valueOf);
  const max = Math.max(...nums, 1);
  const min = Math.min(...nums, 0);
  const span = Math.max(1, max - min);
  const width = 150;
  const height = 48;
  const points = nums.map((value, index) => {
    const x = nums.length <= 1 ? width / 2 : (index / (nums.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `<svg class="dash-sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
    <polyline points="${points.join(' ')}" fill="none" stroke="${esc(color)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
  </svg>`;
}

function buildPublicPlayerRows(attacks) {
  const map = new Map();
  (Array.isArray(attacks) ? attacks : []).forEach((attack) => {
    const players = publicAttackPlayers(attack);
    const seenInAttack = new Set();
    players.forEach((entry) => {
      const name = publicPlayerName(entry, players);
      const key = publicPlayerKey(name);
      const demo = valueOf(entry?.value ?? entry?.val ?? entry?.demolition ?? entry?.total);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          total_demolition: 0,
          participation_count: 0,
          attacks: [],
          structures: new Set(),
          best_hit: 0,
        });
      }
      const row = map.get(key);
      row.total_demolition += demo;
      row.best_hit = Math.max(row.best_hit, demo);
      row.attacks.push({
        attack,
        structure: publicStructureLabel(attack),
        structureKey: publicStructureKey(attack),
        time: publicGameTimeLabel(attack?.game_time || attack?.time),
        demo,
        rank: entry?.rank || '',
      });
      if (demo > 0 && !seenInAttack.has(key)) {
        row.participation_count += 1;
        row.structures.add(publicStructureKey(attack));
        seenInAttack.add(key);
      }
    });
  });
  return [...map.values()]
    .map((row) => ({
      ...row,
      unique_structures_count: row.structures.size,
      average_demolition: row.participation_count
        ? Math.round(row.total_demolition / row.participation_count)
        : 0,
    }))
    .sort(
      (a, b) =>
        valueOf(b.total_demolition) - valueOf(a.total_demolition) ||
        valueOf(b.participation_count) - valueOf(a.participation_count) ||
        a.name.localeCompare(b.name)
    );
}

function buildPublicStructureRows(attacks) {
  const map = new Map();
  (Array.isArray(attacks) ? attacks : []).forEach((attack) => {
    const key = publicStructureKey(attack);
    const label = publicStructureLabel(attack);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        total_demolition: 0,
        attacks: [],
        playerMap: new Map(),
        best_hit: 0,
      });
    }
    const row = map.get(key);
    const attackTotal = valueOf(attack?.total_demolition ?? attack?.total ?? attack?.value);
    row.total_demolition += attackTotal;
    row.best_hit = Math.max(row.best_hit, attackTotal);
    row.attacks.push(attack);
    const players = publicAttackPlayers(attack);
    players.forEach((entry) => {
      const name = publicPlayerName(entry, players);
      const keyForPlayer = publicPlayerKey(name);
      const demo = valueOf(entry?.value ?? entry?.val ?? entry?.demolition ?? entry?.total);
      if (!row.playerMap.has(keyForPlayer)) {
        row.playerMap.set(keyForPlayer, { key: keyForPlayer, name, total: 0, hits: 0 });
      }
      const playerRow = row.playerMap.get(keyForPlayer);
      playerRow.total += demo;
      playerRow.hits += 1;
    });
  });
  return [...map.values()]
    .map((row) => {
      const players = [...row.playerMap.values()].sort(
        (a, b) => valueOf(b.total) - valueOf(a.total) || a.name.localeCompare(b.name)
      );
      return {
        ...row,
        players,
        attack_count: row.attacks.length,
        unique_players: players.length,
        average_demo: row.attacks.length
          ? Math.round(row.total_demolition / row.attacks.length)
          : 0,
        mvp: players[0] || null,
      };
    })
    .sort(
      (a, b) =>
        valueOf(b.total_demolition) - valueOf(a.total_demolition) ||
        valueOf(b.attack_count) - valueOf(a.attack_count) ||
        a.label.localeCompare(b.label)
    );
}

function renderPublicEmpty(label) {
  return `<div class="dash-empty">${esc(label)}</div>`;
}

function renderPublicCard(title, hint, body, className = '', attrs = '') {
  const style = className.includes('eden-x1-public-wide') ? ' style="grid-column:1/-1"' : '';
  const attrText = attrs ? ` ${attrs}` : '';
  return `<section class="dash-card eden-x1-public-card ${className}"${style}${attrText}>
    <div class="dash-card-hdr dash-card-hdr-wrap">
      <h2 class="dash-card-title"><span>${esc(title)}</span></h2>
      ${hint ? `<span class="dash-weighted-contribution-meta">${esc(hint)}</span>` : ''}
    </div>
    ${body}
  </section>`;
}

function publicWeightedRowSearchText(row, rewardContext = {}) {
  return [
    row.playerName,
    row.sourceName,
    row.playerKey,
    row.currentRank ? `#${row.currentRank}` : '',
    row.finalRank ? `#${row.finalRank}` : '',
    contributionRewardLabel(row.currentReward),
    rewardContext.finalRewardLabel ||
      contributionRewardLabel(rewardContext.finalReward || row.finalReward),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function renderPublicWeightedContributionTable() {
  const plannedRewardContexts = createPlannedRewardContextMap();
  const rewardContextForRow = (row) =>
    plannedRewardContexts.get(plannedRewardContextKey(row)) || {};
  const allRows = sortWeightedRowsBy(
    currentRows.slice(),
    currentPublicTableSort || { col: 'finalRank', dir: 'asc' },
    'final',
    { rewardContextForRow }
  );
  const searchQuery = currentPublicTableSearch.trim().toLowerCase();
  const rows = searchQuery
    ? allRows.filter((row) =>
        publicWeightedRowSearchText(row, rewardContextForRow(row)).includes(searchQuery)
      )
    : allRows;
  const clickableCount = allRows.filter((row) =>
    publicPlayerRows.some((player) => player.key === row.playerKey)
  ).length;
  const metaParts = [
    t('edenX1PublicDemoMeta'),
    allRows.length ? t('edenX1PlayersCount', { count: allRows.length }) : '',
    t('edenX1WeightedIncludesMeta'),
    clickableCount ? t('edenX1ClickMatchedRowsMeta') : '',
  ].filter(Boolean);
  const searchControl = allRows.length
    ? `<div class="eden-x1-public-table-toolbar">
      <label class="dash-search-wrap dash-weighted-search eden-x1-public-search" for="edenX1PublicWeightedSearch">
        <svg class="dash-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input id="edenX1PublicWeightedSearch" class="dash-search-input" type="search" value="${esc(currentPublicTableSearch)}" placeholder="${esc(t('adminSearchPh'))}" autocomplete="off" aria-label="${esc(t('adminSearchPh'))}" />
      </label>
    </div>`
    : '';
  const tableBody = rows.length
    ? `<div class="dash-contribution-compare-table-wrap dash-weighted-contribution-table-wrap eden-x1-public-table-wrap" style="${weightedTableWrapStyle(rows.length)}">
      <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table dash-table--stack eden-x1-public-weighted-table">
        <thead><tr>
          ${renderPublicSortableHeader('number', t('edenX1ThNumber'))}
          ${renderPublicSortableHeader('player', t('adminContributionMember'))}
          ${renderPublicSortableHeader('currentRank', t('adminContributionRank'), { className: 'dash-weighted-detail-col' })}
          ${renderPublicSortableHeader('reward', t('adminContributionReward'), { className: 'dash-weighted-detail-col' })}
          ${renderPublicSortableHeader('contribution', t('edenX1ThContribution'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
          ${renderPublicSortableHeader('exGuild', t('edenX1ThExGuild'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
          ${renderPublicSortableHeader('shieldWalls', t('edenX1ThShieldWalls'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
          ${renderPublicSortableHeader('pathers', t('edenX1ThPathers'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
          ${renderPublicSortableHeader('banners', t('edenX1ThBanners'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
          ${renderPublicSortableHeader('conduct', t('edenX1ThConduct'), { className: 'dash-weighted-detail-col dash-weighted-conduct-col', style: 'text-align:right' })}
          ${renderPublicSortableHeader('total', t('edenX1ThTotal'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
          ${renderPublicSortableHeader('weighted', t('edenX1ThWeightedScore'), { style: 'text-align:right' })}
          ${renderPublicSortableHeader('finalRank', t('adminContributionFinalRank'))}
          ${renderPublicSortableHeader('finalReward', t('adminContributionFinalReward'))}
        </tr></thead>
        <tbody>${rows
          .map((row, index) => {
            const playerKey = row.playerKey || publicPlayerKey(row.playerName);
            const canOpenPlayer = publicPlayerRows.some((player) => player.key === playerKey);
            const total = rowBonusTotal(row);
            const tooltipIndex = `public-${index}`;
            const rewardContext = rewardContextForRow(row);
            const rewardClass = rewardThemeClass(rewardContext.finalReward || row.finalReward);
            return `<tr class="${rewardClass}"${canOpenPlayer ? ` data-public-player="${esc(playerKey)}"` : ''}>
              <td class="dash-weighted-mobile-header-cell" data-label="${esc(t('edenX1ThNumber'))}">
                <span class="dash-weighted-desktop-number">${row.finalRank || '--'}</span>
                <span class="dash-weighted-mobile-header" aria-label="${esc(`#${row.finalRank || '--'} ${row.playerName}`)}">
                  <span class="dash-weighted-mobile-rank" data-rank="${esc(`#${row.finalRank || '--'}`)}" aria-hidden="true"></span>
                  <strong class="dash-weighted-mobile-player-name" data-player="${esc(row.playerName)}" aria-hidden="true">${renderTaggedPlayerName(row)}</strong>
                </span>
              </td>
              <td class="dash-weighted-player-cell" data-label="${esc(t('adminContributionMember'))}"><strong>${canOpenPlayer ? publicPlayerButton(row.playerName, playerKey, 'eden-x1-table-name') : renderTaggedPlayerName(row)}</strong></td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionRank'))}">${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionReward'))}">${esc(contributionRewardLabel(row.currentReward))}</td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThContribution'))}" style="text-align:right">${formatScore(row.contributionScore)}</td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThExGuild'))}" style="text-align:right">${formatScore(row.contributionExGuild || 0)}</td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThShieldWalls'))}" style="text-align:right">${row.shieldWalls}</td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThPathers'))}" style="text-align:right">${row.pathers}</td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThBanners'))}" style="text-align:right">${row.banners}</td>
              <td class="dash-weighted-detail-col dash-weighted-conduct-col" data-label="${esc(t('edenX1ThConduct'))}" style="text-align:right">${renderConductScorePopover(row, tooltipIndex)}</td>
              <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThTotal'))}" style="text-align:right">${total.toLocaleString()}</td>
              <td class="dash-weighted-score-cell" data-label="${esc(t('edenX1ThWeightedScore'))}" style="text-align:right">${renderWeightedScorePopover(row, tooltipIndex)}</td>
              <td class="dash-weighted-score-cell dash-weighted-final-rank-cell" data-label="${esc(t('adminContributionFinalRank'))}">${renderFinalRankPopover(row, tooltipIndex)}</td>
              <td class="dash-weighted-score-cell dash-weighted-final-reward-cell" data-label="${esc(t('adminContributionFinalReward'))}">${renderFinalRewardPopover(row, tooltipIndex, rewardContext)}</td>
            </tr>`;
          })
          .join('')}</tbody>
      </table>
    </div>`
    : renderPublicEmpty(
        searchQuery ? t('edenX1NoPublicSearchRows') : t('edenX1NoPublicWeightedRows')
      );
  const body = allRows.length
    ? `${searchControl}${tableBody}`
    : renderPublicEmpty(t('edenX1NoPublicWeightedRows'));
  const hint = allRows.length ? metaParts.join(' - ') : t('edenX1WeightedPublicMeta');
  return renderPublicCard(
    t('edenX1WeightedTitle'),
    hint,
    body,
    'eden-x1-public-wide eden-x1-public-weighted-card',
    'id="edenX1PublicWeightedCard"'
  );
}

function renderPublicKpis(attacks, players, structures) {
  const totalDemo = attacks.reduce(
    (sum, attack) => sum + valueOf(attack?.total_demolition ?? attack?.total),
    0
  );
  const mvp = players[0];
  return `<div class="dash-kpi-grid eden-x1-public-wide eden-x1-public-kpis" style="grid-column:1/-1">
    <div class="dash-card dash-kpi blue"><span class="dash-kpi-icon">#</span><div class="eden-x1-public-kpi-copy"><div class="dash-kpi-value">${formatScore(attacks.length)}</div><div class="dash-kpi-label">${esc(t('edenX1KpiStructureHits'))}</div></div></div>
    <div class="dash-card dash-kpi teal"><span class="dash-kpi-icon">D</span><div class="eden-x1-public-kpi-copy"><div class="dash-kpi-value">${formatScore(totalDemo)}</div><div class="dash-kpi-label">${esc(t('edenX1KpiTotalDemo'))}</div></div></div>
    <div class="dash-card dash-kpi purple"><span class="dash-kpi-icon">P</span><div class="eden-x1-public-kpi-copy"><div class="dash-kpi-value">${formatScore(players.length)}</div><div class="dash-kpi-label">${esc(t('edenX1KpiActivePlayers'))}</div></div></div>
    <div class="dash-card dash-kpi orange"><span class="dash-kpi-icon">*</span><div class="eden-x1-public-kpi-copy"><div class="dash-kpi-value dash-kpi-value-compact">${mvp ? publicPlayerButton(mvp.name, mvp.key, 'eden-x1-kpi-name') : '--'}</div><div class="dash-kpi-label">${esc(t('edenX1KpiTopContributor'))}</div></div></div>
  </div>`;
}

function renderPerformerRows(players, options = {}) {
  const list = (Array.isArray(players) ? players : []).slice(0, options.limit || 10);
  const max = Math.max(1, ...list.map((row) => valueOf(row.total_demolition)));
  if (!list.length) return renderPublicEmpty(t('edenX1NoPlayerHits'));
  return `<div class="dash-chart">${list
    .map((row, index) => {
      const pct = Math.max(4, Math.round((valueOf(row.total_demolition) / max) * 100));
      return `<button type="button" class="dash-top-item dash-top-item--wide ${options.danger ? 'dash-top-item--danger' : ''} eden-x1-clickable" style="appearance:none;border:0;background:transparent;color:inherit;font:inherit;text-align:left;width:100%" data-public-player="${esc(row.key)}" aria-label="${esc(t('edenX1OpenPlayerAria', { player: row.name }))}">
        <span class="dash-top-rank rank-${index + 1}">#${index + 1}</span>
        <span class="dash-top-main">
          <span class="dash-top-bar" style="--dash-top-pct:${pct}%"></span>
          <span class="dash-top-name">${renderTaggedPlayerName(row)}</span>
          <span class="dash-top-val">${formatScore(row.total_demolition)}</span>
        </span>
        <span class="dash-top-meta">${esc(t('edenX1HitsClickMeta', { count: row.participation_count }))}</span>
      </button>`;
    })
    .join('')}</div>`;
}

function renderPublicTopPerformers(players) {
  return renderPublicCard(
    t('adminChartTop'),
    t('edenX1TopPerformersHint'),
    renderPerformerRows(players, { limit: 10 }),
    'eden-x1-public-top-card',
    'id="edenX1TopPerformersCard" tabindex="-1"'
  );
}

function renderPublicStructureRows(structures) {
  const list = (Array.isArray(structures) ? structures : []).slice(0, 12);
  const max = Math.max(1, ...list.map((row) => valueOf(row.total_demolition)));
  if (!list.length) return renderPublicEmpty(t('edenX1NoStructureData'));
  return `<div class="dash-chart">${list
    .map((row, index) => {
      const pct = Math.max(4, Math.round((valueOf(row.total_demolition) / max) * 100));
      return `<button type="button" class="dash-structure-item eden-x1-clickable" style="font:inherit;color:inherit" data-public-structure="${esc(row.key)}" aria-label="${esc(t('edenX1OpenStructureAria', { structure: row.label }))}">
        <span class="dash-structure-bar" style="width:${pct}%"></span>
        <span class="dash-structure-main">
          <span class="eden-x1-structure-title-row"><strong>${esc(row.label)}</strong><em>#${index + 1}</em></span>
          <small>${esc(t('edenX1StructureRowMeta', { hits: row.attack_count, players: row.unique_players }))}</small>
        </span>
        <span class="dash-structure-side">
          <strong>${formatScore(row.total_demolition)}</strong>
        </span>
      </button>`;
    })
    .join('')}</div>`;
}

function renderPublicStructures(structures) {
  return renderPublicCard(
    t('adminLeaderboard'),
    t('edenX1StructuresHint'),
    renderPublicStructureRows(structures),
    'eden-x1-structures-card'
  );
}

function renderPublicAttackHistory(attacks) {
  const rows = (Array.isArray(attacks) ? attacks : []).slice(0, 18);
  if (!rows.length) {
    return renderPublicCard(
      t('adminHistoryTitle'),
      '',
      renderPublicEmpty(t('edenX1NoAttackHistory')),
      'eden-x1-public-history-card'
    );
  }
  const grouped = new Map();
  rows.forEach((attack) => {
    const day = publicAttackDayLabel(attack);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(attack);
  });
  const body = `<div class="dash-attack-list eden-x1-public-attack-list">${[...grouped.entries()]
    .map(([day, dayRows]) => {
      return `<div class="dash-attack-day-header">${esc(day)}</div>${dayRows
        .map((attack) => {
          const structure = publicStructureLabel(attack);
          const total = valueOf(attack?.total_demolition ?? attack?.total ?? attack?.value);
          const playerCount = publicAttackPlayers(attack).length || valueOf(attack?.players_count);
          return `<button type="button" class="dash-attack-item eden-x1-clickable" style="font:inherit;color:inherit;width:100%" data-public-structure="${esc(publicStructureKey(attack))}" aria-label="${esc(t('edenX1OpenStructureAria', { structure }))}">
            <span>
              <span class="dash-attack-name">${esc(structure)}</span>
              <span class="dash-attack-time">${esc(publicGameTimeLabel(attack?.game_time || attack?.time))} - ${esc(t('edenX1PlayersCount', { count: playerCount }))}</span>
            </span>
            <span class="dash-attack-val dash-attack-val--right">${formatScore(total)}</span>
          </button>`;
        })
        .join('')}`;
    })
    .join('')}</div>`;
  return renderPublicCard(
    t('adminHistoryTitle'),
    t('edenX1AttackHistoryHint'),
    body,
    'eden-x1-public-history-card'
  );
}

function renderPublicInsights(attacks, players, structures) {
  const totalDemo = attacks.reduce(
    (sum, attack) => sum + valueOf(attack?.total_demolition ?? attack?.total),
    0
  );
  const largeTarget = structures[0];
  const attendanceRisk = players.filter((row) => row.participation_count <= 1).length;
  const bestHit = players.slice().sort((a, b) => valueOf(b.best_hit) - valueOf(a.best_hit))[0];
  const avgHit = attacks.length ? Math.round(totalDemo / attacks.length) : 0;
  const movementRows = players.slice(0, 5);
  const body = `<div class="dash-ops-grid eden-x1-public-insights-grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">
    <div class="dash-ops-card"><span class="dash-ops-label">${esc(t('edenX1InsightTargetMix'))}</span><strong>${largeTarget ? publicStructureButton(largeTarget.label, largeTarget.key, 'eden-x1-card-link') : '--'}</strong><p>${largeTarget ? esc(t('edenX1TargetMixCopy', { hits: largeTarget.attack_count, demo: formatScore(largeTarget.total_demolition) })) : esc(t('edenX1NoTargetsYet'))}</p></div>
    <div class="dash-ops-card"><span class="dash-ops-label">${esc(t('edenX1InsightAttendanceRisk'))}</span><strong>${esc(t('edenX1PlayersCount', { count: attendanceRisk }))}</strong><p>${esc(t('edenX1AttendanceRiskCopy'))}</p></div>
    <div class="dash-ops-card"><span class="dash-ops-label">${esc(t('edenX1InsightBestPerHit'))}</span><strong>${bestHit ? publicPlayerButton(bestHit.name, bestHit.key, 'eden-x1-card-link') : '--'}</strong><p>${bestHit ? esc(t('edenX1BestHitCopy', { value: formatScore(bestHit.best_hit) })) : esc(t('edenX1NoHitData'))}</p></div>
    <div class="dash-ops-card"><span class="dash-ops-label">${esc(t('edenX1InsightDataHealth'))}</span><strong>${esc(t('edenX1AttacksCount', { count: attacks.length }))}</strong><p>${esc(t('edenX1AverageDemoPerHit', { value: formatScore(avgHit) }))}</p></div>
  </div>
  <div class="dash-insight-list eden-x1-public-mini-list">
    <strong>${esc(t('adminAnalyticsConsistency'))}</strong>
    ${
      movementRows.length
        ? movementRows
            .map(
              (row) =>
                `<span><b>${publicPlayerButton(row.name, row.key)}</b><em>${esc(t('edenX1HitsAverageMeta', { hits: row.participation_count, avg: formatScore(row.average_demolition) }))}</em></span>`
            )
            .join('')
        : `<span>${esc(t('edenX1NoTrendData'))}</span>`
    }
  </div>`;
  return renderPublicCard(
    t('edenX1InsightsTitle'),
    t('edenX1InsightsHint'),
    body,
    'eden-x1-public-insights-card'
  );
}

function renderPublicPlayerTrends(attacks, players) {
  const ordered = sortPublicAttacks(attacks).slice().reverse().slice(-12);
  const top = (Array.isArray(players) ? players : []).slice(0, 6);
  if (!ordered.length || !top.length) return renderPublicEmpty(t('edenX1NoTrendData'));
  return top
    .map((player, index) => {
      const values = ordered.map((attack) => publicPlayerValueForAttack(attack, player.key));
      const first = values.find((value) => value > 0) || 0;
      const last = [...values].reverse().find((value) => value > 0) || 0;
      const delta = last - first;
      const color =
        index % 3 === 0 ? 'var(--blue-400)' : index % 3 === 1 ? 'var(--green)' : 'var(--yellow)';
      return `<div class="dash-trend-row">
        <div class="dash-trend-person">
          <strong>${publicPlayerButton(player.name, player.key)}</strong>
          <span>${esc(t('edenX1HitsCompactMeta', { hits: player.participation_count, value: compactValue(player.total_demolition) }))}</span>
        </div>
        ${publicSparkline(values, color)}
        <span class="dash-trend-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${compactValue(delta)}</span>
      </div>`;
    })
    .join('');
}

function renderPublicHeatmap(attacks) {
  const weekdays = [
    t('edenX1DaySun'),
    t('edenX1DayMon'),
    t('edenX1DayTue'),
    t('edenX1DayWed'),
    t('edenX1DayThu'),
    t('edenX1DayFri'),
    t('edenX1DaySat'),
  ];
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const from = index * 2;
    const to = from + 1;
    const label = String(from).padStart(2, '0');
    return { label, fullLabel: `${label}-${String(to).padStart(2, '0')}`, from, to };
  });
  const cells = new Map();
  (Array.isArray(attacks) ? attacks : []).forEach((attack) => {
    const parsed = parsePublicGameTime(attack?.game_time || attack?.time);
    if (!parsed) return;
    const bucket =
      buckets.find((item) => parsed.hour >= item.from && parsed.hour <= item.to) || buckets[0];
    const key = `${parsed.date.getUTCDay()}|${bucket.label}`;
    const current = cells.get(key) || { attacks: 0, hits: 0, demo: 0, players: new Set() };
    const players = publicAttackPlayers(attack);
    current.attacks += 1;
    current.demo += valueOf(attack?.total_demolition ?? attack?.total);
    players.forEach((player) => {
      const name = publicPlayerName(player, players);
      if (!name || valueOf(player?.value ?? player?.val) <= 0) return;
      current.hits += 1;
      current.players.add(publicPlayerKey(name));
    });
    cells.set(key, current);
  });
  if (!cells.size) return renderPublicEmpty(t('edenX1NoTimestampedAttacks'));
  const max = Math.max(...[...cells.values()].map((cell) => cell.players.size), 1);
  let html = '<div class="dash-heatmap-grid"><span></span>';
  buckets.forEach((bucket) => {
    html += `<span class="dash-heatmap-label">${esc(bucket.label)}</span>`;
  });
  weekdays.forEach((day, dayIndex) => {
    html += `<span class="dash-heatmap-day">${esc(day)}</span>`;
    buckets.forEach((bucket) => {
      const cell = cells.get(`${dayIndex}|${bucket.label}`) || {
        attacks: 0,
        hits: 0,
        demo: 0,
        players: new Set(),
      };
      const participants = cell.players.size;
      const heat = participants ? (0.15 + (participants / max) * 0.85).toFixed(2) : 0;
      html += `<span class="dash-heatmap-cell" style="--heat:${heat}" title="${esc(t('edenX1HeatmapCellTitle', { day, window: bucket.fullLabel, players: participants, hits: cell.hits, attacks: cell.attacks, demo: compactValue(cell.demo) }))}">
        ${participants ? `<strong>${participants}</strong><small>${compactValue(cell.demo)}</small>` : ''}
      </span>`;
    });
  });
  return `${html}</div><div class="dash-analytics-hint">${esc(t('edenX1HeatmapHint'))}</div>`;
}

function renderPublicDistribution(attacks) {
  const buckets = [
    { label: t('edenX1BucketBelow5k'), min: 0, max: 5000 },
    { label: '5K-10K', min: 5000, max: 10000 },
    { label: '10K-25K', min: 10000, max: 25000 },
    { label: '25K-50K', min: 25000, max: 50000 },
    { label: '50K-75K', min: 50000, max: 75000 },
    { label: '75K-100K', min: 75000, max: 100000 },
    { label: '100K+', min: 100000, max: Infinity },
  ].map((bucket) => ({ ...bucket, count: 0, total: 0 }));
  let ignoredRows = 0;
  (Array.isArray(attacks) ? attacks : []).forEach((attack) => {
    publicAttackPlayers(attack).forEach((player) => {
      const value = valueOf(player?.value ?? player?.val ?? player?.demolition ?? player?.total);
      if (value <= 0) {
        ignoredRows += 1;
        return;
      }
      const bucket = buckets.find((item) => value >= item.min && value < item.max);
      if (!bucket) return;
      bucket.count += 1;
      bucket.total += value;
    });
  });
  const totalHits = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (!totalHits) return renderPublicEmpty(t('edenX1NoHitValues'));
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const rows = buckets
    .map((bucket) => {
      const pct = Math.round((bucket.count / maxCount) * 100);
      const fill = bucket.count ? Math.max(3, pct) : 0;
      const share = `${Math.round((bucket.count / totalHits) * 100)}%`;
      return `<div class="dash-dist-row">
        <span class="dash-dist-label">${esc(bucket.label)}</span>
        <span class="dash-dist-track"><span class="dash-dist-fill" style="width:${fill}%"></span></span>
        <span class="dash-dist-value">${bucket.count.toLocaleString()} <small>${share}</small></span>
      </div>`;
    })
    .join('');
  const totalDemo = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  return `${rows}<div class="dash-analytics-hint">${esc(t('edenX1DistributionHint', { hits: totalHits.toLocaleString(), demo: compactValue(totalDemo), avg: compactValue(totalDemo / totalHits), ignored: ignoredRows.toLocaleString() }))}</div>`;
}

function renderPublicConsistency(players) {
  const scored = (Array.isArray(players) ? players : [])
    .map((player) => {
      const values = player.attacks
        .slice()
        .sort((a, b) => publicAttackMs(a.attack) - publicAttackMs(b.attack))
        .map((attack) => valueOf(attack.demo));
      const consistency = scoreConsistencyValues(values);
      if (!consistency) return null;
      const half = Math.floor(values.length / 2);
      const span = Math.min(5, half || 1);
      const first = publicAverage(values.slice(0, span));
      const last = publicAverage(values.slice(-span));
      return {
        ...player,
        values,
        consistency,
        steadyPercent: consistency.percent,
        delta: last - first,
      };
    })
    .filter(Boolean);
  if (!scored.length) return renderPublicEmpty(t('edenX1NeedTwoHits'));
  const consistent = [...scored]
    .sort((a, b) => compareConsistencyScores(a.consistency, b.consistency))
    .slice(0, 5);
  const improvers = [...scored]
    .filter((p) => p.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 4);
  const decliners = [...scored]
    .filter((p) => p.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 4);
  const list = (title, rows, kind) => `<div class="dash-insight-list">
    <strong>${esc(title)}</strong>
    ${rows.length ? rows.map((player) => `<span><em>${publicPlayerButton(player.name, player.key)}</em><b class="${kind}">${kind === 'steady' ? t('edenX1SteadyPercent', { percent: player.steadyPercent }) : `${player.delta >= 0 ? '+' : ''}${compactValue(player.delta)}`}</b></span>`).join('') : `<span class="muted">${esc(t('edenX1NoMovement'))}</span>`}
  </div>`;
  return (
    list(t('edenX1MostConsistent'), consistent, 'steady') +
    list(t('edenX1BiggestImprovers'), improvers, 'up') +
    list(t('edenX1DeclinersToWatch'), decliners, 'down')
  );
}

function renderPublicStreaks(attacks, players) {
  const ordered = sortPublicAttacks(attacks).slice().reverse();
  if (!ordered.length) return renderPublicEmpty(t('edenX1NoAttacksYet'));
  const attackSets = ordered.map((attack) => {
    const entries = publicAttackPlayers(attack);
    return new Set(
      entries.map((player) => publicPlayerKey(publicPlayerName(player, entries))).filter(Boolean)
    );
  });
  const rows = (Array.isArray(players) ? players : []).map((player) => {
    let streak = 0;
    for (let index = attackSets.length - 1; index >= 0; index -= 1) {
      if (!attackSets[index].has(player.key)) break;
      streak += 1;
    }
    const missedLatest =
      attackSets.length > 1 &&
      !attackSets[attackSets.length - 1].has(player.key) &&
      attackSets.slice(0, -1).some((set) => set.has(player.key));
    return { ...player, streak, missedLatest };
  });
  const top = rows
    .filter((row) => row.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 6);
  const atRisk = rows
    .filter((row) => row.missedLatest)
    .sort((a, b) => b.total_demolition - a.total_demolition)
    .slice(0, 8);
  return `<div class="dash-streak-columns">
    <div class="dash-insight-list">
      <strong>${esc(t('edenX1CurrentStreaks'))}</strong>
      ${top.length ? top.map((row) => `<span><em>${publicPlayerButton(row.name, row.key)}</em><b class="up">${esc(t('edenX1StreakCount', { count: row.streak }))}</b></span>`).join('') : `<span class="muted">${esc(t('edenX1NoActiveStreaks'))}</span>`}
    </div>
    <div class="dash-insight-list">
      <strong>${esc(t('edenX1MissedLatest'))}</strong>
      ${atRisk.length ? atRisk.map((row) => `<span><em>${publicPlayerButton(row.name, row.key)}</em><b class="down">${esc(t('edenX1MissedLatestBadge'))}</b></span>`).join('') : `<span class="muted">${esc(t('edenX1NoRecentMisses'))}</span>`}
    </div>
  </div>`;
}

function renderPublicAdvancedAnalytics(attacks, players) {
  return `<div class="dash-analytics-grid eden-x1-public-wide eden-x1-public-analytics" style="grid-column:1/-1">
    ${renderPublicCard(t('adminAnalyticsTrends'), t('edenX1AdvancedPublicHint'), `<div class="dash-analytics-body">${renderPublicPlayerTrends(attacks, players)}</div>`, 'dash-analytics-card')}
    ${renderPublicCard(t('adminAnalyticsHeatmap'), t('edenX1HeatmapCardHint'), `<div class="dash-analytics-body">${renderPublicHeatmap(attacks)}</div>`, 'dash-analytics-card')}
    ${renderPublicCard(t('adminAnalyticsDistribution'), t('edenX1DistributionCardHint'), `<div class="dash-analytics-body">${renderPublicDistribution(attacks)}</div>`, 'dash-analytics-card')}
    ${renderPublicCard(t('adminAnalyticsConsistency'), t('edenX1ConsistencyCardHint'), `<div class="dash-analytics-body">${renderPublicConsistency(players)}</div>`, 'dash-analytics-card')}
    ${renderPublicCard(t('adminAnalyticsStreaks'), t('edenX1StreaksCardHint'), `<div class="dash-analytics-body">${renderPublicStreaks(attacks, players)}</div>`, 'dash-analytics-card dash-analytics-card-wide')}
  </div>`;
}

function renderPublicPlayerDetail(player) {
  if (!player) return renderPublicEmpty(t('edenX1NoPlayerHits'));
  const attacks = player.attacks
    .slice()
    .sort((a, b) => publicAttackMs(b.attack) - publicAttackMs(a.attack));
  return `<div class="dash-modal-grid">
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalTotalDemo'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--blue">${formatScore(player.total_demolition)}</div></div>
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalHits'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--teal">${formatScore(player.participation_count)}</div></div>
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalAverageHit'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--amber">${formatScore(player.average_demolition)}</div></div>
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalBestHit'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--purple">${formatScore(player.best_hit)}</div></div>
    </div>
    <div class="dash-modal-section-label">${esc(t('edenX1PlayerAttackBreakdown'))}</div>
    <div class="dash-table-wrap eden-x1-public-table-wrap">
      <table class="dash-table dash-table--stack">
        <thead><tr><th>${esc(t('edenX1ModalTime'))}</th><th>${esc(t('edenX1ModalStructure'))}</th><th class="dash-th-right">${esc(t('edenX1ModalDemo'))}</th><th>${esc(t('edenX1ModalRank'))}</th></tr></thead>
        <tbody>${attacks
          .map(
            (attack) => `<tr data-public-structure="${esc(attack.structureKey)}">
              <td data-label="${esc(t('edenX1ModalTime'))}">${esc(attack.time)}</td>
              <td data-label="${esc(t('edenX1ModalStructure'))}">${publicStructureButton(attack.structure, attack.structureKey, 'dash-table-link')}</td>
              <td class="dash-table-right" data-label="${esc(t('edenX1ModalDemo'))}">${formatScore(attack.demo)}</td>
              <td data-label="${esc(t('edenX1ModalRank'))}">${attack.rank ? `#${esc(attack.rank)}` : '--'}</td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>`;
}

function renderPublicStructureDetail(structure) {
  if (!structure) return renderPublicEmpty(t('edenX1NoStructureData'));
  const attacks = sortPublicAttacks(structure.attacks);
  const players = (Array.isArray(structure.players) ? structure.players : [])
    .slice()
    .sort(
      (a, b) =>
        valueOf(b.total) - valueOf(a.total) ||
        (valueOf(a.rank) || 9999) - (valueOf(b.rank) || 9999) ||
        String(a.name || '').localeCompare(String(b.name || ''))
    );
  return `<div class="dash-modal-grid">
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalTotalDemo'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--teal">${formatScore(structure.total_demolition)}</div></div>
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalHits'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--blue">${formatScore(structure.attack_count)}</div></div>
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalPlayers'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--amber">${formatScore(structure.unique_players)}</div></div>
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalAverageHit'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--purple">${formatScore(structure.average_demo)}</div></div>
    </div>
    <div class="dash-main-grid eden-x1-public-detail-grid" style="grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);align-items:start">
      <div class="dash-card-align-start">
        <div class="dash-modal-section-label">${esc(t('edenX1ModalTopPlayers'))}</div>
        <div class="dash-chart">${players
          .slice(0, 8)
          .map(
            (
              player,
              index
            ) => `<button type="button" class="dash-top-item dash-top-item--wide eden-x1-clickable" style="appearance:none;border:0;background:transparent;color:inherit;font:inherit;text-align:left;width:100%" data-public-player="${esc(player.key)}">
              <span class="dash-top-rank rank-${index + 1}">#${index + 1}</span>
              <span class="dash-top-name">${renderTaggedPlayerName(player)}</span>
              <span class="dash-top-val">${formatScore(player.total)}</span>
              <span class="dash-top-meta">${esc(t('edenX1HitsCount', { count: player.hits }))}</span>
            </button>`
          )
          .join('')}</div>
      </div>
      <div>
        <div class="dash-modal-section-label">${esc(t('edenX1ModalRecentHits'))}</div>
        <div class="dash-attack-list">${attacks
          .slice(0, 8)
          .map(
            (attack) => `<div class="dash-attack-item">
              <span>
                <span class="dash-attack-name">${esc(publicGameTimeLabel(attack?.game_time || attack?.time))}</span>
                <span class="dash-attack-time">${esc(t('edenX1PlayersCount', { count: publicAttackPlayers(attack).length || valueOf(attack?.players_count) }))}</span>
              </span>
              <span class="dash-attack-val dash-attack-val--right">${formatScore(attack?.total_demolition ?? attack?.total)}</span>
            </div>`
          )
          .join('')}</div>
      </div>
    </div>`;
}

function renderPublicModal() {
  return `<div id="edenX1PublicModal" class="dash-modal eden-x1-public-modal" role="dialog" aria-modal="true" aria-labelledby="edenX1PublicModalTitle">
    <div class="dash-modal-content" style="max-width:min(920px,calc(100vw - 2rem))">
      <button id="edenX1PublicModalClose" class="dash-modal-close" type="button" aria-label="${esc(t('edenX1ModalClose'))}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="dash-modal-title-area">
        <h3 class="dash-modal-title" id="edenX1PublicModalTitle">${esc(t('edenX1ModalDetails'))}</h3>
        <div class="dash-modal-sub" id="edenX1PublicModalSub"></div>
      </div>
      <div class="dash-modal-body" id="edenX1PublicModalBody"></div>
    </div>
  </div>`;
}

function closePublicModal() {
  $('edenX1PublicModal')?.classList.remove('active');
  window._overlayStack = Math.max(0, (window._overlayStack || 1) - 1);
  if (window._overlayStack === 0) {
    document.body.style.overflow = '';
    document.body.style.overflowY = '';
  }
}

function openPublicModal(title, subtitle, body) {
  const modal = $('edenX1PublicModal');
  const titleEl = $('edenX1PublicModalTitle');
  const subEl = $('edenX1PublicModalSub');
  const bodyEl = $('edenX1PublicModalBody');
  if (!modal || !titleEl || !subEl || !bodyEl) return;
  const wasActive = modal.classList.contains('active');
  titleEl.textContent = title;
  subEl.textContent = subtitle || '';
  bodyEl.innerHTML = body;
  if (!wasActive) {
    window._overlayStack = (window._overlayStack || 0) + 1;
    document.body.style.overflow = 'hidden';
  }
  modal.classList.add('active');
}

function showPublicDetail(type, key) {
  const normalizedKey = String(key || '');
  if (type === 'player') {
    const player = publicPlayerRows.find((row) => row.key === normalizedKey);
    if (!player) return;
    openPublicModal(
      t('edenX1PlayerDetailTitle', { player: player.name }),
      t('edenX1PlayerDetailHint'),
      renderPublicPlayerDetail(player)
    );
  } else if (type === 'structure') {
    const structure = publicStructureRows.find((row) => row.key === normalizedKey);
    if (!structure) return;
    openPublicModal(
      t('edenX1StructureDetailTitle', { structure: structure.label }),
      t('edenX1StructureDetailHint'),
      renderPublicStructureDetail(structure)
    );
  }
}

function showEdenVoteHelperPlayerDetail(pick) {
  if (!pick) return;
  const playerKey = String(pick.getAttribute('data-eden-vote-player-key') || '').trim();
  const playerName = String(pick.getAttribute('data-eden-vote-pick') || '').trim();
  if (playerKey && publicPlayerRows.some((row) => row.key === playerKey)) {
    showPublicDetail('player', playerKey);
    return;
  }
  const option =
    findEdenMemberOptionByKey(playerKey) ||
    findEdenMemberOption(playerName) ||
    (playerKey ? { playerKey, playerName: playerName || playerKey } : null);
  if (!option) return;
  openPublicModal(
    t('edenX1PlayerDetailTitle', { player: option.playerName }),
    t('edenX1VoteDetailSubtitle'),
    renderEdenVoteCandidateDetail(option)
  );
}

function bindPublicDashboardControls(host) {
  if (!host) return;
  bindWeightedPopovers(host);
  if (host.dataset.publicControlsBound) return;
  host.dataset.publicControlsBound = '1';
  host.addEventListener('input', (event) => {
    const statsInput = event.target.closest('#edenX1MyStatsSearch');
    if (statsInput) {
      currentPublicStatsSearch = statsInput.value || '';
      const selectionStart = statsInput.selectionStart ?? currentPublicStatsSearch.length;
      rerenderPublicMyStatsCard(host, { focusSearch: true, selectionStart });
      return;
    }
    const input = event.target.closest('#edenX1PublicWeightedSearch');
    if (!input) return;
    currentPublicTableSearch = input.value || '';
    const selectionStart = input.selectionStart ?? currentPublicTableSearch.length;
    rerenderPublicWeightedContributionCard(host, { focusSearch: true, selectionStart });
  });
  host.addEventListener('keydown', (event) => {
    const sortHeader = event.target.closest('th[data-public-weighted-sort]');
    if (!sortHeader || !host.contains(sortHeader)) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setPublicWeightedSort(sortHeader.dataset.publicWeightedSort, host);
  });
  host.addEventListener('click', (event) => {
    if (
      event.target.closest('#edenX1PublicModalClose') ||
      event.target === $('edenX1PublicModal')
    ) {
      closePublicModal();
      return;
    }
    const myStatsPick = event.target.closest('[data-eden-my-stats-pick]');
    if (myStatsPick) {
      event.preventDefault();
      const selectedName = myStatsPick.getAttribute('data-eden-my-stats-pick') || '';
      currentPublicStatsSearch = selectedName;
      rerenderPublicMyStatsCard(host, {
        focusSearch: true,
        selectionStart: selectedName.length,
      });
      return;
    }
    const helperToggle = event.target.closest('[data-eden-vote-helper-toggle]');
    if (helperToggle) {
      event.preventDefault();
      toggleEdenVoteHelperRows(helperToggle);
      return;
    }
    const helperPick = event.target.closest('[data-eden-vote-pick]');
    if (helperPick) {
      event.preventDefault();
      if (
        currentRewardView === 'team' &&
        applyEdenVotePickToForm($('dashWeightedContributionPanel'), helperPick)
      ) {
        return;
      }
      showEdenVoteHelperPlayerDetail(helperPick);
      return;
    }
    const voteOpenPlayer = event.target.closest('[data-eden-vote-open-player]');
    if (voteOpenPlayer) {
      showPublicDetail('player', voteOpenPlayer.getAttribute('data-eden-vote-open-player'));
      return;
    }
    const sortHeader = event.target.closest('th[data-public-weighted-sort]');
    if (sortHeader) {
      setPublicWeightedSort(sortHeader.dataset.publicWeightedSort, host);
      return;
    }
    const playerButton = event.target.closest('[data-public-player]');
    if (playerButton) {
      showPublicDetail('player', playerButton.getAttribute('data-public-player'));
      return;
    }
    const structureButton = event.target.closest('[data-public-structure]');
    if (structureButton) {
      showPublicDetail('structure', structureButton.getAttribute('data-public-structure'));
    }
  });
  $('edenX1PublicModalClose')?.addEventListener('click', closePublicModal);
  $('edenX1PublicModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closePublicModal();
  });
  if (!window._edenX1PublicModalEsc) {
    window._edenX1PublicModalEsc = (event) => {
      if (event.key === 'Escape') closePublicModal();
    };
    document.addEventListener('keydown', window._edenX1PublicModalEsc);
  }
}

function preparePublicDashboardRows(data = publicDashboardData) {
  publicDashboardData = data || {};
  publicAttackRows = sortPublicAttacks(publicDashboardData.attacks);
  publicPlayerRows = buildPublicPlayerRows(publicAttackRows);
  publicStructureRows = buildPublicStructureRows(publicAttackRows);
  return publicDashboardData;
}

function renderPublicDashboard(data = publicDashboardData) {
  const host = $('edenX1PublicDashboard');
  if (!host) return;
  publicDashboardData = preparePublicDashboardRows(data);
  const hasContribution = Array.isArray(publicDashboardData.contributionRecords)
    ? publicDashboardData.contributionRecords.some(
        (record) => Array.isArray(record?.entries) && record.entries.length
      )
    : false;
  if (!publicAttackRows.length && !hasContribution) {
    host.classList.add('hidden');
    host.innerHTML = '';
    return;
  }
  host.classList.remove('hidden');
  host.innerHTML = `<div id="ocrDashboardRoot" class="eden-x1-public-root" style="display:grid;gap:1rem">
    ${renderEdenTopNamesOverview()}
    <div class="eden-x1-reward-heading">
      <span class="eden-x1-reward-eyebrow">${esc(t('edenX1PublicEyebrow'))}</span>
      <h2>${esc(t('edenX1PublicTitle'))}</h2>
      <p>${esc(t('edenX1PublicSubtitle'))}</p>
    </div>
    <div class="eden-x1-public-grid" style="display:grid;gap:.85rem;align-items:start">
      ${renderPublicMyStatsCard()}
      ${renderPublicWeightedContributionTable()}
      ${renderPublicKpis(publicAttackRows, publicPlayerRows, publicStructureRows)}
      <div class="eden-x1-public-columns" style="grid-column:1/-1">
        <div class="eden-x1-public-column eden-x1-public-column-main">
          ${renderPublicTopPerformers(publicPlayerRows)}
        </div>
        <div class="eden-x1-public-column eden-x1-public-column-side">
          ${renderPublicInsights(publicAttackRows, publicPlayerRows, publicStructureRows)}
        </div>
      </div>
      ${renderPublicAdvancedAnalytics(publicAttackRows, publicPlayerRows)}
      <div class="dash-main-grid dash-history-leader-grid eden-x1-public-wide" style="grid-column:1/-1;grid-template-columns:minmax(0,0.78fr) minmax(0,1.22fr);align-items:stretch">
        ${renderPublicAttackHistory(publicAttackRows)}
        ${renderPublicStructures(publicStructureRows)}
      </div>
    </div>
    ${renderPublicModal()}
  </div>`;
  bindPublicDashboardControls(host);
  bindEdenQuickNav();
}

function scheduleLocalizedRerender() {
  const token = ++localizedRenderToken;
  const scheduleIdle =
    'requestIdleCallback' in window
      ? (callback) => window.requestIdleCallback(callback, { timeout: 450 })
      : (callback) => setTimeout(callback, 0);
  scheduleIdle(() => {
    if (token !== localizedRenderToken) return;
    renderCurrentTable({ fromSchedule: true });
    const renderPublic = () => {
      if (token !== localizedRenderToken || !publicDashboardData) return;
      renderPublicDashboard(publicDashboardData);
    };
    scheduleIdle(renderPublic);
  });
}

function updateTextContent(lang) {
  currentLang = lang;
  const dict = translations[lang] || translations.en;
  window.VTS_TRANSLATIONS = translations;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  const languageSelect = $('languageSelect');
  if (languageSelect) languageSelect.value = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    if (dict[key]) el.placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.title = t(key);
  });

  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-label');
    if (dict[key]) el.label = t(key);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (dict[key]) el.setAttribute('aria-label', t(key));
  });

  syncGameClockTitles();
  scheduleLocalizedRerender();
}

function renderTable(rows, recordLabel, options = {}) {
  const compactView = isWeightedContributionCompactView();
  const title = options.title || t('edenX1WeightedTitle');
  const meta = options.meta || `${recordLabel || t('edenX1PageTitle')} - ${t('edenX1ViewOnly')}`;
  const rewardViewClass = rewardViewAccentClass(options.rewardView || currentRewardView);
  const numberMode = options.numberMode || 'final';
  const rewardContextForRow =
    typeof options.rewardContextForRow === 'function' ? options.rewardContextForRow : () => ({});
  const visibleRows = sortedWeightedRows(filterWeightedRows(rows), numberMode);
  const emptyRow = `<tr><td colspan="14" class="dash-empty">${esc(t('edenX1NoRows'))}</td></tr>`;
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card${rewardViewClass} ${compactView ? 'dash-weighted-compact' : ''}">
      <div class="dash-card-hdr dash-card-hdr-wrap">
        <h2 class="dash-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span>${esc(title)}</span>
        </h2>
        <div class="dash-weighted-table-controls">
          <span class="dash-weighted-contribution-meta">${esc(meta)}</span>
          <label class="dash-search-wrap dash-weighted-search" for="edenX1TableSearch">
            <svg class="dash-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input id="edenX1TableSearch" class="dash-search-input" type="search" value="${esc(currentTableSearch)}" placeholder="${esc(t('adminSearchPh'))}" autocomplete="off" />
          </label>
          ${renderWeightedMobileSortSelect(numberMode)}
          ${renderWeightedContributionViewToggle(compactView)}
        </div>
      </div>
      <div class="dash-contribution-compare-table-wrap dash-weighted-contribution-table-wrap" style="${weightedTableWrapStyle(visibleRows.length)}">
        <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table dash-table--stack">
          <thead><tr>
            ${renderSortableHeader('number', t('edenX1ThNumber'))}
            ${renderSortableHeader('player', t('adminContributionMember'))}
            ${renderSortableHeader('currentRank', t('adminContributionRank'), { className: 'dash-weighted-detail-col' })}
            ${renderSortableHeader('reward', t('adminContributionReward'), { className: 'dash-weighted-detail-col' })}
            ${renderSortableHeader('contribution', t('edenX1ThContribution'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
            ${renderSortableHeader('exGuild', t('edenX1ThExGuild'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
            ${renderSortableHeader('shieldWalls', t('edenX1ThShieldWalls'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
            ${renderSortableHeader('pathers', t('edenX1ThPathers'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
            ${renderSortableHeader('banners', t('edenX1ThBanners'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
            ${renderSortableHeader('conduct', t('edenX1ThConduct'), { className: 'dash-weighted-detail-col dash-weighted-conduct-col', style: 'text-align:right' })}
            ${renderSortableHeader('total', t('edenX1ThTotal'), { className: 'dash-weighted-detail-col', style: 'text-align:right' })}
            ${renderSortableHeader('weighted', t('edenX1ThWeightedScore'), { style: 'text-align:right' })}
            ${renderSortableHeader('finalRank', t('adminContributionFinalRank'))}
            ${renderSortableHeader('finalReward', t('adminContributionFinalReward'))}
          </tr></thead>
          <tbody>${
            visibleRows.length
              ? visibleRows
                  .map((row, index) => {
                    const total = rowBonusTotal(row);
                    const numberValue =
                      numberMode === 'current'
                        ? row.currentRank || index + 1
                        : numberMode === 'index'
                          ? index + 1
                          : row.finalRank;
                    const rewardContext = rewardContextForRow(row, index, numberValue);
                    const rowReward =
                      rewardContext.baseReward || rewardContext.currentReward || row.currentReward;
                    const rewardClass = rewardThemeClass(
                      rewardContext.finalReward || row.finalReward
                    );
                    const isSupportHonor =
                      options.rewardView === 'support' && Number(numberValue) === 1;
                    const supportHonorClass = isSupportHonor ? ' eden-x1-support-honor-row' : '';
                    const supportHonorNameClass = isSupportHonor
                      ? ' eden-x1-support-honor-name'
                      : '';
                    const supportHonorNameAttr = isSupportHonor
                      ? ' class="eden-x1-support-honor-name"'
                      : '';
                    return `<tr class="${rewardClass}${supportHonorClass}">
                <td class="dash-weighted-mobile-header-cell" data-label="${esc(t('edenX1ThNumber'))}">
                  <span class="dash-weighted-desktop-number">${numberValue}</span>
                  <span class="dash-weighted-mobile-header" aria-label="${esc(`#${numberValue} ${row.playerName}`)}">
                    <span class="dash-weighted-mobile-rank" data-rank="${esc(`#${numberValue}`)}" aria-hidden="true"></span>
                    <strong class="dash-weighted-mobile-player-name${supportHonorNameClass}" data-player="${esc(row.playerName)}" aria-hidden="true">${renderTaggedPlayerName(row)}</strong>
                  </span>
                </td>
                <td class="dash-weighted-player-cell" data-label="${esc(t('adminContributionMember'))}"><strong${supportHonorNameAttr}>${renderTaggedPlayerName(row)}</strong></td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionRank'))}">${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionReward'))}">${esc(contributionRewardLabel(rowReward))}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThContribution'))}" style="text-align:right">${formatScore(row.contributionScore)}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThExGuild'))}" style="text-align:right">${formatScore(row.contributionExGuild || 0)}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThShieldWalls'))}" style="text-align:right">${row.shieldWalls}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThPathers'))}" style="text-align:right">${row.pathers}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThBanners'))}" style="text-align:right">${row.banners}</td>
                <td class="dash-weighted-detail-col dash-weighted-conduct-col" data-label="${esc(t('edenX1ThConduct'))}" style="text-align:right">${renderConductScorePopover(row, index)}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThTotal'))}" style="text-align:right">${total.toLocaleString()}</td>
                <td class="dash-weighted-score-cell" data-label="${esc(t('edenX1ThWeightedScore'))}" style="text-align:right">${renderWeightedScorePopover(row, index)}</td>
                <td class="dash-weighted-score-cell dash-weighted-final-rank-cell" data-label="${esc(t('adminContributionFinalRank'))}">${renderFinalRankPopover(row, index)}</td>
                <td class="dash-weighted-score-cell dash-weighted-final-reward-cell" data-label="${esc(t('adminContributionFinalReward'))}">${renderFinalRewardPopover(row, index, rewardContext)}</td>
              </tr>`;
                  })
                  .join('')
              : emptyRow
          }</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderRewardSlotTable(view) {
  const title = t(rewardViewTitleKey(view));
  const metaKey = rewardViewMetaKey(view);
  const rows = rewardSlotRows(view);
  const votePanel = view === 'team' ? renderEdenTeamVotePanel() : '';
  const rewardViewClass = rewardViewAccentClass(view);
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card eden-x1-slots-card${rewardViewClass}">
      <div class="dash-card-hdr dash-card-hdr-wrap">
        <h2 class="dash-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span>${esc(title)}</span>
        </h2>
        <div class="dash-weighted-table-controls">
          <span class="dash-weighted-contribution-meta">${esc(metaKey ? t(metaKey) : t('edenX1ViewOnly'))}</span>
        </div>
      </div>
      <div class="dash-contribution-compare-table-wrap dash-weighted-contribution-table-wrap" style="${weightedTableWrapStyle(rows.length)}">
        <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table dash-table--stack eden-x1-slots-table">
          <thead><tr>
            <th>${esc(t('edenX1ThNumber'))}</th>
            <th>${esc(t('adminContributionMember'))}</th>
            <th>${esc(t('edenX1RewardSlotGroup'))}</th>
            <th>${esc(t('edenX1RewardSlotStatus'))}</th>
          </tr></thead>
          <tbody>${rows
            .map(
              (row) => `<tr>
                <td data-label="${esc(t('edenX1ThNumber'))}">${row.slot}</td>
                <td data-label="${esc(t('adminContributionMember'))}"><strong>${renderTaggedPlayerName(row)}</strong></td>
                <td data-label="${esc(t('edenX1RewardSlotGroup'))}">${esc(row.group)}</td>
                <td data-label="${esc(t('edenX1RewardSlotStatus'))}">${renderRewardSlotStatus(row, view)}</td>
              </tr>`
            )
            .join('')}</tbody>
        </table>
      </div>
    </div>
    ${votePanel}
  </div>`;
}

function renderCurrentTable(renderOptions = {}) {
  if (!renderOptions.fromSchedule) rewardTableRenderToken += 1;
  const panel = $('dashWeightedContributionPanel');
  if (!panel) return;
  if (!rewardFlowReady) return;
  if (currentRewardView === 'management' || currentRewardView === 'team') {
    panel.innerHTML = renderRewardSlotTable(currentRewardView);
    bindEdenVoteControls(panel);
    bindWeightedPopovers(panel);
    updateRewardFlowControls();
    if (renderOptions.scrollIntoView) {
      queueRewardTableScroll();
    }
    return;
  }
  if (!currentRows.length) return;

  let rows = currentRows;
  let tableOptions = {};
  if (currentRewardView === 'contribution') {
    rows = getContributionRewardRows();
    tableOptions = {
      title: t('edenX1RewardLeaderboardTitle'),
      meta: t('edenX1RewardContributionMeta'),
      rewardView: 'contribution',
      numberMode: 'index',
      rewardContextForRow: (row, _index, numberValue) =>
        contributionRewardContextForRow(row, numberValue),
    };
  } else if (currentRewardView === 'support') {
    rows = getSupportRewardRows();
    tableOptions = {
      title: t('edenX1RewardSupportTitle'),
      meta: t('edenX1RewardSupportMeta'),
      rewardView: 'support',
      numberMode: 'index',
      rewardContextForRow: (row, _index, numberValue) =>
        supportRewardContextForRow(row, numberValue),
    };
  }
  panel.innerHTML = renderTable(rows, currentRecordLabel, tableOptions);
  bindWeightedTableControls(panel);
  bindEdenVoteControls(panel);
  updateRewardFlowControls();
  if (renderOptions.focusSearch) {
    const search = $('edenX1TableSearch');
    if (search) {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }
  if (renderOptions.scrollIntoView) {
    queueRewardTableScroll();
  }
}

async function loadPublicConductAdjustments(db, firestore, season) {
  try {
    const { collection, getDocs, query, where } = firestore;
    const ref = collection(db, R5_COLLECTION_PATH);
    const seasonKey = String(season || '').trim();
    const snapshot = await getDocs(seasonKey ? query(ref, where('season', '==', seasonKey)) : ref);
    const adjustments = [];
    snapshot.forEach((docSnap) => {
      adjustments.push(docSnap.data());
    });
    return sanitizePublicR5Adjustments(adjustments, seasonKey);
  } catch {
    return [];
  }
}

async function bootShell() {
  currentLang = getLanguage();
  await loadTranslationsForLanguage(currentLang);
  initTheme();
  mountGameClock($('globalGameClock'), { compact: true, showUae: false });
  $('edenX1FooterYear')?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  updateTextContent(currentLang);
  bindRewardFlowControls();
  bindEdenQuickNav();

  $('languageSelect')?.addEventListener('change', async (e) => {
    const nextLang = e.target.value || 'en';
    localStorage.setItem('vts_hero_lang', nextLang);
    await loadTranslationsForLanguage(nextLang);
    applyLanguageDirection(nextLang);
    updateTextContent(nextLang);
  });
}

const EDEN_X1_BOOT_TIMEOUT_MS = 20000;
const EDEN_X1_OPTIONAL_READ_TIMEOUT_MS = 3500;
const EDEN_X1_LOADING_PROGRESS_CAP = 90;
let edenBootGeneration = 0;
let lastEdenBootError = null;
let edenLoadingProgress = 0;
let edenLoadingProgressTimer = null;
let edenLoadingProgressGeneration = 0;

function setEdenLoadingProgress(generation, percent) {
  if (generation !== edenLoadingProgressGeneration) return;
  const requested = Number(percent);
  if (!Number.isFinite(requested)) return;

  edenLoadingProgress = Math.max(edenLoadingProgress, Math.min(100, Math.max(0, requested)));
  const loadingRoot = $('ocrDashboardSection');
  const fill = loadingRoot?.querySelector('.dash-connecting-bar-fill');
  const label = loadingRoot?.querySelector('.dash-connecting-bar-pct');
  if (fill) fill.style.width = `${edenLoadingProgress}%`;
  if (label) label.textContent = `${Math.round(edenLoadingProgress)}%`;
}

function startEdenLoadingProgress(generation) {
  if (edenLoadingProgressTimer) clearInterval(edenLoadingProgressTimer);
  edenLoadingProgressGeneration = generation;
  edenLoadingProgress = 0;
  setEdenLoadingProgress(generation, 4);

  edenLoadingProgressTimer = window.setInterval(() => {
    if (
      generation !== edenLoadingProgressGeneration ||
      edenLoadingProgress >= EDEN_X1_LOADING_PROGRESS_CAP
    ) {
      clearInterval(edenLoadingProgressTimer);
      edenLoadingProgressTimer = null;
      return;
    }
    const step = edenLoadingProgress < 40 ? 3 : edenLoadingProgress < 70 ? 1.4 : 0.5;
    setEdenLoadingProgress(generation, edenLoadingProgress + step);
  }, 200);
}

function stopEdenLoadingProgress(generation, finalPercent = null) {
  if (generation !== edenLoadingProgressGeneration) return;
  if (edenLoadingProgressTimer) {
    clearInterval(edenLoadingProgressTimer);
    edenLoadingProgressTimer = null;
  }
  if (finalPercent !== null) setEdenLoadingProgress(generation, finalPercent);
}

function isEdenDynamicImportLoadFailure(err) {
  const message = String(err?.message || err?.reason?.message || err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload/i.test(
    message
  );
}

function withEdenBootTimeout(promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new Error(t('edenX1LoadTimeout'));
      timeoutError.code = 'eden-x1/boot-timeout';
      reject(timeoutError);
    }, EDEN_X1_BOOT_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function loadEdenOptionalData(promise, label) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`${label} timed out`);
          err.code = 'eden-x1/optional-read-timeout';
          reject(err);
        }, EDEN_X1_OPTIONAL_READ_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.warn(`Eden X1 ${label} unavailable; continuing without it.`, err);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function showEdenBootError(err) {
  const errorEl = $('edenX1Error');
  if (!errorEl) return;
  errorEl.classList.remove('hidden');
  errorEl.replaceChildren();
  const message = document.createElement('p');
  message.className = 'eden-x1-error-message';
  message.textContent = t('edenX1LoadFailed', {
    error: err?.message || err || 'Unknown error',
  });
  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'eden-x1-retry-btn';
  retryBtn.textContent = t('edenX1Retry');
  retryBtn.addEventListener('click', () => {
    // A dynamic-import failure is cached in the module map for the rest of
    // the page's life, so an in-place retry can never succeed — reload to
    // get a fresh module graph. Timeouts/auth failures retry in place.
    if (isEdenDynamicImportLoadFailure(lastEdenBootError)) {
      window.location.reload();
      return;
    }
    loadEdenX1Dashboard();
  });
  errorEl.append(message, retryBtn);
}

async function loadEdenX1Dashboard() {
  const generation = ++edenBootGeneration;
  const panel = $('dashWeightedContributionPanel');
  const errorEl = $('edenX1Error');
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.replaceChildren();
  }
  setEdenPanelLoading(true);
  startEdenLoadingProgress(generation);

  try {
    const result = await withEdenBootTimeout(
      (async () => {
        const [{ initFirebase, ensureAnonymousAuth }, { importFirestore }] = await Promise.all([
          import('./firebase.js'),
          import('./firebase-sdk.js'),
        ]);
        setEdenLoadingProgress(generation, 35);
        const { configured, db } = initFirebase();
        if (!configured || !db) return { kind: 'unconfigured' };

        const voteUser = await ensureAnonymousAuth();
        setEdenLoadingProgress(generation, 55);
        const firestore = await importFirestore();
        setEdenLoadingProgress(generation, 65);
        const { doc, getDoc } = firestore;
        const [snap, rosterSnap, voteSettingsSnap] = await Promise.all([
          getDoc(doc(db, FS_PATH)),
          loadEdenOptionalData(getDoc(doc(db, FS_ROSTER_PATH)), 'roster data'),
          loadEdenOptionalData(getDoc(doc(db, EDEN_X1_VOTE_SETTINGS_DOC_PATH)), 'vote settings'),
        ]);
        setEdenLoadingProgress(generation, 80);

        if (!snap.exists()) {
          return { kind: 'no-data', db, firestore, voteUser, voteSettingsSnap };
        }

        const data = { ...snap.data() };
        if (rosterSnap?.exists?.()) {
          const rosterData = rosterSnap.data() || {};
          if (Array.isArray(rosterData.snapshots)) data.rosterSnapshots = rosterData.snapshots;
        }
        const liveConductAdjustments = await loadEdenOptionalData(
          loadPublicConductAdjustments(db, firestore, data.r5Season || ''),
          'bonus team effort points'
        );
        setEdenLoadingProgress(generation, 92);
        if (liveConductAdjustments?.length) {
          data.publicConductAdjustments = liveConductAdjustments;
        }
        return { kind: 'ok', db, firestore, voteUser, voteSettingsSnap, data };
      })()
    );

    if (generation !== edenBootGeneration) return;

    if (result.kind === 'unconfigured') {
      stopEdenLoadingProgress(generation, 100);
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.textContent = t('edenX1NoFirebase');
      }
      setRewardFlowReady(false);
      if (panel) panel.innerHTML = '';
      setEdenPanelLoading(false);
      return;
    }

    edenVoteWriteContext = { db: result.db, firestore: result.firestore, user: result.voteUser };
    if (result.voteSettingsSnap?.exists?.()) {
      edenVoteSettings = normalizeEdenVoteSettings(result.voteSettingsSnap.data());
    } else {
      edenVoteSettings = normalizeEdenVoteSettings();
    }

    if (result.kind === 'no-data') {
      stopEdenLoadingProgress(generation, 100);
      setRewardFlowReady(false);
      if (panel) panel.innerHTML = `<div class="dash-empty">${esc(t('edenX1NoData'))}</div>`;
      setEdenPanelLoading(false);
      return;
    }

    await applyDashboardData(result.data);
    stopEdenLoadingProgress(generation, 100);
  } catch (err) {
    if (generation !== edenBootGeneration) return;
    stopEdenLoadingProgress(generation);
    lastEdenBootError = err;
    console.error('Eden X1 view failed:', err);
    showEdenBootError(err);
    if (panel) panel.innerHTML = '';
    setRewardFlowReady(false);
    setEdenPanelLoading(false);
  }
}

async function main() {
  await bootShell();
  await loadEdenX1Dashboard();
}

<<<<<<< Updated upstream
// Lets the browser paint and handle input between heavy render stages so one
// giant synchronous DOM build doesn't lock the main thread.
function yieldToBrowser() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

=======
>>>>>>> Stashed changes
async function applyDashboardData(data = {}) {
  setRewardFlowReady(false);
  const contributionRecords = Array.isArray(data.contributionRecords)
    ? data.contributionRecords
    : [];
  const dutyRecords = Array.isArray(data.dutyRecords) ? data.dutyRecords : [];
  const exGuildContributions = Array.isArray(data.exGuildContributions)
    ? data.exGuildContributions
    : [];
  const season = data.r5Season || '';
  const r5Adjustments = Array.isArray(data.publicConductAdjustments)
    ? data.publicConductAdjustments
    : [];
  currentForfeitedRewardIdentities = getForfeitedRewardPriorityIdentities(r5Adjustments, season);

  const model = buildWeightedContributionRows({
    contributionRecords,
    dutyRecords,
    r5Adjustments,
    exGuildContributions,
    season,
  });
  currentSeason = String(season || defaultEdenSeason()).trim();
  currentMemberOptions = collectEdenMemberOptions(data, model.rows || []);
  preparePublicDashboardRows(data);

  const panel = $('dashWeightedContributionPanel');
  if (!model.rows || !model.rows.length) {
    if (panel) panel.innerHTML = `<div class="dash-empty">${esc(t('edenX1NoRows'))}</div>`;
    setEdenPanelLoading(false);
    renderPublicDashboard(data);
    return;
  }

  const dateStr = data.date || data.updatedAt || '';
  currentRows = model.rows;
  currentRecordLabel = dateStr
    ? `Eden X1 - ${String(dateStr).split('T')[0] || dateStr}`
    : t('edenX1PageTitle');
  setRewardFlowReady(true);
<<<<<<< Updated upstream
  // Stage 1: the weighted table users came for. Reveal it, then yield so the
  // browser can paint before the heavy public dashboard renders.
  renderCurrentTable();
  setEdenPanelLoading(false);
  await yieldToBrowser();
  // Stage 2: public dashboard (analytics, charts, history) in its own frame.
=======

  // Stage 1: Render the critical weighted table immediately
  renderCurrentTable();
  setEdenPanelLoading(false);

  // Stage 2: Yield before heavy public dashboard rendering
  await yieldToBrowser();
>>>>>>> Stashed changes
  renderPublicDashboard(data);
  if (!EDEN_X1_TEST_MODE) {
    await yieldToBrowser();
    loadEdenManagementVoteResults();
  }
}

<<<<<<< Updated upstream
window.setEdenX1DataForTest = function setEdenX1DataForTest(data) {
  return applyDashboardData(data);
=======
window.setEdenX1DataForTest = async function setEdenX1DataForTest(data) {
  await applyDashboardData(data);
>>>>>>> Stashed changes
};

window.setEdenX1ManagementVotesForTest = function setEdenX1ManagementVotesForTest(payloadOrRows) {
  applyEdenManagementVoteResults(summarizeEdenManagementVotes(payloadOrRows), 'loaded');
};

if (EDEN_X1_TEST_MODE) {
  bootShell().catch((err) => console.error('Eden X1 test shell failed:', err));
} else {
  main();
}
