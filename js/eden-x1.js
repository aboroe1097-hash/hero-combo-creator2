import {
  buildWeightedContributionRows,
  sanitizePublicR5Adjustments,
} from './contribution-weighting.js';
import { translations, loadTranslationsForLanguage } from './translations.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import {
  formatDatasetStructureLabel,
  getDatasetStructureTarget,
  normalizeStructureTarget,
} from './ocr-shared.js';
import { parseGameTimeDateMs } from './ocr-time-filter.js';
import {
  compactPlayerIdentity,
  resolveCanonicalPlayerName,
  stripGuildTagsFromPlayerName,
} from './ocr-name-normalizer.js';
import { renderSpecialPlayerTag } from './player-tags.js';

const APP_VERSION = '12.4.1';
const FS_PATH = 'vts_admin/dashboard_data';
const FS_ROSTER_PATH = 'vts_admin/roster_data';
const R5_COLLECTION_PATH = 'vts_admin/conduct_adjustments/records';
const EDEN_X1_VOTES_COLLECTION_PATH = 'vts_admin/eden_x1_votes/records';
const EDEN_X1_TEAM_VOTE_CATEGORY = 'team_players';
const EDEN_X1_VOTE_LOCAL_PREFIX = 'vts_eden_x1_vote';
const THEME_STORAGE_KEY = 'vts_theme';
const WEIGHTED_CONTRIBUTION_COMPACT_KEY = 'vts_weighted_contribution_compact';
const EDEN_X1_TEST_MODE = Boolean(globalThis.VTS_EDEN_X1_TEST_MODE);

let currentLang = 'en';
let currentRows = [];
let currentRecordLabel = '';
let currentSeason = '';
let currentMemberOptions = [];
let currentRewardView = 'support';
let currentTableSearch = '';
let currentTableSort = null;
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
let edenVoteWriteContext = null;

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
    .replace(/[^a-z0-9_-]+/gi, '_')
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

function renderEdenMemberSuggestionList(value, targetId) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const exact = findEdenMemberOption(raw);
  const matches = getEdenMemberMatches(raw, 5);
  const shown = exact
    ? [exact, ...matches.filter((row) => row.playerKey !== exact.playerKey)].slice(0, 5)
    : matches;
  if (!shown.length)
    return '<span class="eden-x1-vote-suggestion-empty">No similar member found.</span>';
  return shown
    .map((row, index) => {
      const isResolved = exact?.playerKey === row.playerKey;
      const label = isResolved && index === 0 ? 'Best match' : 'Similar';
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

function resolveEdenVoteInput(host, inputId) {
  const input = host?.querySelector(`#${inputId}`);
  if (!input) return null;
  const option = findEdenMemberOption(input.value);
  if (option) input.value = option.playerName;
  updateEdenVoteInputSuggestions(host, inputId);
  return option;
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

function getEdenPublicPlayerForKey(playerKey) {
  const key = String(playerKey || '').trim();
  if (!key) return null;
  return publicPlayerRows.find((row) => row.key === key) || null;
}

function rankedEdenDutyRows(field, limit = 5) {
  return currentRows
    .filter((row) => valueOf(row[field]) > 0)
    .slice()
    .sort(
      (a, b) =>
        valueOf(b[field]) - valueOf(a[field]) ||
        valueOf(b.weightedScore) - valueOf(a.weightedScore) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    )
    .slice(0, limit)
    .map((row) => ({
      key: row.playerKey || compactPlayerIdentity(row.playerName),
      name: row.playerName,
      value: valueOf(row[field]).toLocaleString(),
    }));
}

function rankedEdenStructureHelpRows(limit = 5) {
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

function rankedEdenConsistentRows(limit = 5) {
  return publicPlayerRows
    .filter((player) => (player.attacks || []).length >= 2)
    .map((player) => {
      const values = player.attacks
        .slice()
        .sort((a, b) => publicAttackMs(a.attack) - publicAttackMs(b.attack))
        .map((attack) => valueOf(attack.demo));
      const avg = publicAverage(values);
      const variance = publicAverage(values.map((value) => Math.pow(value - avg, 2)));
      const coeff = avg ? Math.sqrt(variance) / avg : 99;
      return {
        key: player.key,
        name: player.name,
        coeff,
        value: `${Math.max(0, Math.round((1 - Math.min(coeff, 1)) * 100))}% steady`,
      };
    })
    .sort((a, b) => a.coeff - b.coeff || String(a.name || '').localeCompare(String(b.name || '')))
    .slice(0, limit);
}

function renderEdenVotePickList(title, rows) {
  const body = rows.length
    ? rows
        .map(
          (
            row,
            index
          ) => `<button class="eden-x1-vote-helper-row" type="button" data-eden-vote-pick="${esc(row.name)}">
            <span><b>#${index + 1}</b>${renderTaggedPlayerName(row)}</span>
            <em>${esc(row.value)}</em>
          </button>`
        )
        .join('')
    : `<span class="eden-x1-vote-helper-empty">No data yet</span>`;
  return `<div class="eden-x1-vote-helper-card">
    <strong>${esc(title)}</strong>
    <div>${body}</div>
  </div>`;
}

function renderEdenVoteGuidance() {
  const groups = [
    ['Top 5 Banner Help', rankedEdenDutyRows('banners')],
    ['Top 5 Shield Wall Help', rankedEdenDutyRows('shieldWalls')],
    ['Top 5 Pathing Help', rankedEdenDutyRows('pathers')],
    ['Top 5 Structure Help', rankedEdenStructureHelpRows()],
    ['Top 5 Consistent Names', rankedEdenConsistentRows()],
  ];
  return `<div class="eden-x1-vote-guidance">
    <div class="eden-x1-vote-guidance-head">
      <strong>Need help choosing?</strong>
      <span>These lists are only signals. Vote for the teammate you believe stood out most.</span>
    </div>
    <div class="eden-x1-vote-helper-grid">
      ${groups.map(([title, rows]) => renderEdenVotePickList(title, rows)).join('')}
    </div>
  </div>`;
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

function renderEdenVoteCandidateDetail(option) {
  if (!option) return '';
  const weighted = getEdenWeightedRowForPlayer(option.playerKey);
  const player = getEdenPublicPlayerForKey(option.playerKey);
  const dutyTotal = weighted ? rowBonusTotal(weighted) : 0;
  const attacks = player?.attacks
    ? player.attacks.slice().sort((a, b) => publicAttackMs(a.attack) - publicAttackMs(b.attack))
    : [];
  const values = attacks.map((attack) => valueOf(attack.demo));
  const sparkline = values.length
    ? publicSparkline(values, 'var(--green)')
    : `<div class="dash-empty">No structure-hit trend yet.</div>`;
  const fullDetailButton = player
    ? `<button class="dash-btn dash-btn-xs" type="button" data-eden-vote-open-player="${esc(player.key)}">Open attack detail</button>`
    : '';
  return `<div class="eden-x1-vote-player-detail-card">
    <div class="eden-x1-vote-player-detail-head">
      <div>
        <strong>${esc(option.playerName)}</strong>
        <span>Contribution, support, and structure activity</span>
      </div>
      ${fullDetailButton}
    </div>
    <div class="dash-modal-grid eden-x1-vote-stat-grid">
      <div class="dash-modal-stat"><div>Weighted Score</div><div class="dash-modal-stat-value dash-modal-stat-value--blue">${weighted ? formatWeightedScore(weighted.weightedScore) : '--'}</div></div>
      <div class="dash-modal-stat"><div>Final Rank</div><div class="dash-modal-stat-value dash-modal-stat-value--teal">${weighted?.finalRank ? `#${esc(weighted.finalRank)}` : '--'}</div></div>
      <div class="dash-modal-stat"><div>Contribution</div><div class="dash-modal-stat-value dash-modal-stat-value--amber">${weighted ? formatScore(weighted.contributionScore) : '--'}</div></div>
      <div class="dash-modal-stat"><div>Ex-Guild</div><div class="dash-modal-stat-value dash-modal-stat-value--purple">${weighted ? formatScore(weighted.contributionExGuild || 0) : '--'}</div></div>
      <div class="dash-modal-stat"><div>Support Total</div><div class="dash-modal-stat-value dash-modal-stat-value--teal">${weighted ? dutyTotal.toLocaleString() : '--'}</div></div>
      <div class="dash-modal-stat"><div>Banner / Path / Shield</div><div class="dash-modal-stat-value dash-modal-stat-value--blue">${weighted ? `${weighted.banners} / ${weighted.pathers} / ${weighted.shieldWalls}` : '--'}</div></div>
      <div class="dash-modal-stat"><div>Structure Hits</div><div class="dash-modal-stat-value dash-modal-stat-value--amber">${player ? formatScore(player.participation_count) : '--'}</div></div>
      <div class="dash-modal-stat"><div>Total Demo</div><div class="dash-modal-stat-value dash-modal-stat-value--purple">${player ? formatScore(player.total_demolition) : '--'}</div></div>
    </div>
    <div class="eden-x1-vote-trend">
      <span>Structure-hit progress</span>
      ${sparkline}
    </div>
  </div>`;
}

function updateEdenVoteCandidateDetail(host) {
  const input = host?.querySelector('#edenX1CandidateName');
  const toggle = host?.querySelector('#edenX1VoteCandidateInspectBtn');
  const detail = host?.querySelector('#edenX1VoteCandidateDetail');
  if (!input || !toggle || !detail) return;
  const option = findEdenMemberOption(input.value);
  if (!option) {
    toggle.disabled = true;
    toggle.textContent = 'Select a member to view stats';
    toggle.setAttribute('aria-expanded', 'false');
    detail.hidden = true;
    detail.dataset.open = '0';
    detail.innerHTML = '';
    return;
  }
  toggle.disabled = false;
  toggle.textContent = `View ${option.playerName} stats`;
  if (detail.dataset.open === '1') {
    detail.hidden = false;
    detail.innerHTML = renderEdenVoteCandidateDetail(option);
    toggle.setAttribute('aria-expanded', 'true');
  } else {
    detail.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }
}

async function submitEdenTeamVote(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const voterInput = form.querySelector('#edenX1VoterName');
  const candidateInput = form.querySelector('#edenX1CandidateName');
  const voter = resolveEdenVoteInput(form, 'edenX1VoterName');
  const candidate = resolveEdenVoteInput(form, 'edenX1CandidateName');
  if (!voter || !candidate) {
    setEdenVoteStatus('Please choose both names from the member list.', 'error');
    return;
  }

  const season = edenVoteSeason();
  const id = edenVoteDocId(season, voter.playerKey);
  const localVote = {
    id,
    season,
    category: EDEN_X1_TEAM_VOTE_CATEGORY,
    voterKey: voter.playerKey,
    voterName: voter.playerName,
    candidateKey: candidate.playerKey,
    candidateName: candidate.playerName,
    voterAuthUid: edenVoteWriteContext?.user?.uid || 'local-test',
    updatedAt: new Date().toISOString(),
  };

  if (!edenVoteWriteContext && !EDEN_X1_TEST_MODE) {
    setEdenVoteStatus('Cloud voting is not ready. Please refresh and try again.', 'error');
    return;
  }

  try {
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Saving...';
    }
    setEdenVoteStatus('Saving vote...', 'info');
    if (edenVoteWriteContext) {
      const { db, firestore, user } = edenVoteWriteContext;
      const { doc, serverTimestamp, setDoc } = firestore;
      await setDoc(doc(db, EDEN_X1_VOTES_COLLECTION_PATH, id), {
        ...localVote,
        voterAuthUid: user.uid,
        updatedAt: serverTimestamp(),
      });
      localVote.voterAuthUid = user.uid;
    }
    writeLocalEdenVote(localVote);
    setEdenVoteStatus(
      'Vote saved. You can change it by submitting again from this device.',
      'success'
    );
  } catch (err) {
    console.error('Eden X1 vote save failed:', err);
    setEdenVoteStatus(`Vote did not sync: ${err?.message || err || 'unknown error'}`, 'error');
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Cast Vote';
    }
  }
}

function bindEdenVoteControls(host) {
  if (!host) return;
  if (!host.dataset.edenVoteControlsBound) {
    host.dataset.edenVoteControlsBound = '1';
    host.addEventListener('submit', (event) => {
      if (event.target.closest('#edenX1TeamVoteForm')) submitEdenTeamVote(event);
    });
    host.addEventListener('input', (event) => {
      const input = event.target.closest('#edenX1VoterName, #edenX1CandidateName');
      if (!input) return;
      updateEdenVoteInputSuggestions(host, input.id);
      if (input.id === 'edenX1CandidateName') {
        const detail = host.querySelector('#edenX1VoteCandidateDetail');
        if (detail) detail.dataset.open = '0';
        updateEdenVoteCandidateDetail(host);
      }
    });
    host.addEventListener('change', (event) => {
      const input = event.target.closest('#edenX1VoterName, #edenX1CandidateName');
      if (!input) return;
      resolveEdenVoteInput(host, input.id);
      if (input.id === 'edenX1CandidateName') updateEdenVoteCandidateDetail(host);
    });
    host.addEventListener('click', (event) => {
      const suggestion = event.target.closest('[data-eden-vote-suggest]');
      if (suggestion) {
        const targetId = suggestion.getAttribute('data-eden-vote-target') || '';
        const input = targetId ? host.querySelector(`#${targetId}`) : null;
        if (input) {
          input.value = suggestion.getAttribute('data-eden-vote-suggest') || '';
          updateEdenVoteInputSuggestions(host, targetId);
          if (targetId === 'edenX1CandidateName') {
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
        const input = host.querySelector('#edenX1CandidateName');
        if (input) {
          input.value = pick.getAttribute('data-eden-vote-pick') || '';
          const detail = host.querySelector('#edenX1VoteCandidateDetail');
          if (detail) detail.dataset.open = '1';
          updateEdenVoteCandidateDetail(host);
        }
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
      const openPlayer = event.target.closest('[data-eden-vote-open-player]');
      if (openPlayer) {
        showPublicDetail('player', openPlayer.getAttribute('data-eden-vote-open-player'));
      }
    });
  }
  updateEdenVoteInputSuggestions(host, 'edenX1VoterName');
  updateEdenVoteInputSuggestions(host, 'edenX1CandidateName');
  updateEdenVoteCandidateDetail(host);
}

function renderEdenTeamVotePanel() {
  const saved = readLocalEdenVote();
  const savedStatus = saved?.candidateName
    ? `<div class="eden-x1-vote-saved">Saved on this device: ${esc(saved.voterName)} voted for ${esc(saved.candidateName)}.</div>`
    : '';
  return `<section class="dash-card eden-x1-vote-panel">
    <div class="dash-card-hdr dash-card-hdr-wrap">
      <div>
        <h2 class="dash-card-title"><span>Team Players Vote</span></h2>
        <p class="dash-card-subtitle">Honor-system voting for Eden X1. Identify yourself, choose one teammate, and submit again if you need to change your vote.</p>
      </div>
    </div>
    <form id="edenX1TeamVoteForm" class="eden-x1-vote-form">
      ${renderEdenVoteMemberOptions()}
      <label class="eden-x1-vote-field" for="edenX1VoterName">
        <span>Your game name</span>
        <input id="edenX1VoterName" class="dash-input" type="text" list="edenX1VoteMemberOptions" value="${esc(saved?.voterName || '')}" placeholder="Start typing your member name" autocomplete="off" required />
        <div class="eden-x1-vote-suggestions" data-eden-vote-suggestions-for="edenX1VoterName"></div>
      </label>
      <label class="eden-x1-vote-field" for="edenX1CandidateName">
        <span>Your vote</span>
        <input id="edenX1CandidateName" class="dash-input" type="text" list="edenX1VoteMemberOptions" value="${esc(saved?.candidateName || '')}" placeholder="Choose a teammate" autocomplete="off" required />
        <div class="eden-x1-vote-suggestions" data-eden-vote-suggestions-for="edenX1CandidateName"></div>
      </label>
      <div class="eden-x1-vote-actions">
        <button class="dash-btn dash-btn-primary" type="submit">Cast Vote</button>
        <button id="edenX1VoteCandidateInspectBtn" class="dash-btn" type="button" aria-expanded="false">Select a member to view stats</button>
      </div>
      <div id="edenX1VoteStatus" class="eden-x1-vote-status" role="status">${savedStatus}</div>
      <div id="edenX1VoteCandidateDetail" class="eden-x1-vote-candidate-detail" hidden></div>
    </form>
    ${renderEdenVoteGuidance()}
  </section>`;
}

function isWeightedContributionMobileViewport() {
  return Boolean(globalThis.matchMedia?.('(max-width: 768px)').matches);
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
  $('ocrDashboardSection')?.classList.toggle('eden-x1-panel--loading', Boolean(loading));
}

function shouldScrollRewardTableOnClick() {
  return window.matchMedia?.('(max-width: 768px)').matches === true;
}

function scrollRewardTableIntoView() {
  const target = $('dashWeightedContributionPanel')?.querySelector('.eden-x1-weighted-card');
  if (!target) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  target.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
    inline: 'nearest',
  });
}

function bindRewardFlowControls() {
  document.querySelectorAll('[data-reward-view]').forEach((button) => {
    if (button.dataset.rewardBound) return;
    button.dataset.rewardBound = '1';
    button.addEventListener('click', () => {
      if (!rewardFlowReady) return;
      const view = button.dataset.rewardView || 'all';
      if (view !== currentRewardView) currentTableSort = null;
      currentRewardView = view;
      renderCurrentTable({ scrollIntoView: shouldScrollRewardTableOnClick() });
    });
  });
  updateRewardFlowControls();
}

function getContributionRewardRows() {
  const supportPlayerKeys = new Set(getSupportRewardRows().map((row) => row.playerKey));
  return currentRows
    .filter((row) => Number(row.currentRank) > 0 && !supportPlayerKeys.has(row.playerKey))
    .slice()
    .sort(
      (a, b) =>
        rowContributionRewardScore(b) - rowContributionRewardScore(a) ||
        Number(a.currentRank) - Number(b.currentRank) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    )
    .slice(0, 10)
    .map((row, index) => ({
      ...row,
      edenX1RewardSlot: index + 1,
    }));
}

function getSupportRewardRows() {
  return currentRows
    .filter((row) => rowBonusTotal(row) > 0)
    .slice()
    .sort(
      (a, b) =>
        valueOf(a.finalRank || 999999) - valueOf(b.finalRank || 999999) ||
        valueOf(b.weightedScore) - valueOf(a.weightedScore) ||
        rowBonusTotal(b) - rowBonusTotal(a) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    )
    .slice(0, 4)
    .map((row, index) => ({
      ...row,
      edenX1RewardSlot: index + 1,
      edenX1SupportReward: 'core',
    }));
}

function rowContributionRewardScore(row) {
  return valueOf(row.contributionScore) + valueOf(row.contributionExGuild);
}

function rowBonusTotal(row) {
  return (
    valueOf(row.shieldWalls) + valueOf(row.pathers) + valueOf(row.banners) + conductBonusValue(row)
  );
}

function rowNumberValue(row, numberMode) {
  if (numberMode === 'current') return row.currentRank || 999999;
  if (numberMode === 'index') return row.edenX1RewardSlot || row.finalRank || 999999;
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

function sortedWeightedRows(rows, numberMode) {
  const sort = currentTableSort;
  if (!sort || !sort.col) return rows;
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
    finalReward: (row) => contributionRewardLabel(row.finalReward),
  };
  const get = accessors[sort.col];
  if (!get) return rows;
  const sorted = rows.slice().sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (typeof av === 'string' || typeof bv === 'string') {
      return String(av).localeCompare(String(bv));
    }
    return av - bv;
  });
  return sort.dir === 'asc' ? sorted : sorted.reverse();
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
    () => {
      if (Date.now() - weightedPopoverOpenedAt < 180) return;
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

function rewardSlotRows(view) {
  if (view === 'management') {
    return Array.from({ length: 4 }, (_, index) => ({
      slot: index + 1,
      player: index === 0 ? 'Wicked Russian' : t('edenX1Tba'),
      group: t('edenX1RewardManagementTitle'),
      status: index === 0 ? t('edenX1RewardAssigned') : t('edenX1RewardManagementVotePending'),
    }));
  }
  if (view === 'team') {
    return Array.from({ length: 2 }, (_, index) => ({
      slot: index + 1,
      player: t('edenX1Tba'),
      group: t('edenX1RewardTeamTitle'),
      status: t('edenX1RewardVotePending'),
    }));
  }
  return [];
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
      <span><span>${esc(t('edenX1RankedBy'))}</span><b>${esc(t('edenX1ThWeightedScore'))}</b></span>
      <span><span>${esc(t('edenX1ThWeightedScore'))}</span><b>${formatWeightedScore(row.weightedScore)}</b></span>
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
  const finalReward = contributionRewardLabel(context.finalReward || row.finalReward);
  const rankLabel = context.rankLabel || t('adminContributionFinalRank');
  const rankValue = context.rank || row.finalRank;
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
      <span><span>${esc(t('edenX1RankedBy'))}</span><b>${esc(t('edenX1ThWeightedScore'))}</b></span>
      <span><span>${esc(t('edenX1ThWeightedScore'))}</span><b>${formatWeightedScore(row.weightedScore)}</b></span>
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
      if (!seenInAttack.has(key)) {
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

function renderPublicCard(title, hint, body, className = '') {
  const style = className.includes('eden-x1-public-wide') ? ' style="grid-column:1/-1"' : '';
  return `<section class="dash-card eden-x1-public-card ${className}"${style}>
    <div class="dash-card-hdr dash-card-hdr-wrap">
      <h2 class="dash-card-title"><span>${esc(title)}</span></h2>
      ${hint ? `<span class="dash-weighted-contribution-meta">${esc(hint)}</span>` : ''}
    </div>
    ${body}
  </section>`;
}

function publicWeightedRowSearchText(row) {
  return [
    row.playerName,
    row.sourceName,
    row.playerKey,
    row.currentRank ? `#${row.currentRank}` : '',
    row.finalRank ? `#${row.finalRank}` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function renderPublicWeightedContributionTable() {
  const allRows = currentRows
    .slice()
    .sort(
      (a, b) =>
        valueOf(a.finalRank) - valueOf(b.finalRank) ||
        valueOf(b.weightedScore) - valueOf(a.weightedScore) ||
        String(a.playerName || '').localeCompare(String(b.playerName || ''))
    );
  const searchQuery = currentPublicTableSearch.trim().toLowerCase();
  const rows = searchQuery
    ? allRows.filter((row) => publicWeightedRowSearchText(row).includes(searchQuery))
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
          <th>${esc(t('edenX1ThNumber'))}</th>
          <th>${esc(t('adminContributionMember'))}</th>
          <th class="dash-weighted-detail-col">${esc(t('adminContributionRank'))}</th>
          <th class="dash-weighted-detail-col">${esc(t('adminContributionReward'))}</th>
          <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThContribution'))}</th>
          <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThExGuild'))}</th>
          <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThShieldWalls'))}</th>
          <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThPathers'))}</th>
          <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThBanners'))}</th>
          <th class="dash-weighted-detail-col dash-weighted-conduct-col" style="text-align:right">${esc(t('edenX1ThConduct'))}</th>
          <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThTotal'))}</th>
          <th style="text-align:right">${esc(t('edenX1ThWeightedScore'))}</th>
          <th>${esc(t('adminContributionFinalRank'))}</th>
          <th>${esc(t('adminContributionFinalReward'))}</th>
        </tr></thead>
        <tbody>${rows
          .map((row, index) => {
            const playerKey = row.playerKey || publicPlayerKey(row.playerName);
            const canOpenPlayer = publicPlayerRows.some((player) => player.key === playerKey);
            const total = rowBonusTotal(row);
            const tooltipIndex = `public-${index}`;
            const rewardClass = rewardThemeClass(row.finalReward);
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
              <td class="dash-weighted-score-cell dash-weighted-final-reward-cell" data-label="${esc(t('adminContributionFinalReward'))}">${renderFinalRewardPopover(row, tooltipIndex)}</td>
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
    'eden-x1-public-wide eden-x1-public-weighted-card'
  );
}

function renderPublicKpis(attacks, players, structures) {
  const totalDemo = attacks.reduce(
    (sum, attack) => sum + valueOf(attack?.total_demolition ?? attack?.total),
    0
  );
  const mvp = players[0];
  return `<div class="dash-kpi-grid eden-x1-public-wide" style="grid-column:1/-1">
    <div class="dash-card dash-kpi blue"><span class="dash-kpi-icon">#</span><div><div class="dash-kpi-value">${formatScore(attacks.length)}</div><div class="dash-kpi-label">${esc(t('edenX1KpiStructureHits'))}</div></div></div>
    <div class="dash-card dash-kpi teal"><span class="dash-kpi-icon">D</span><div><div class="dash-kpi-value">${formatScore(totalDemo)}</div><div class="dash-kpi-label">${esc(t('edenX1KpiTotalDemo'))}</div></div></div>
    <div class="dash-card dash-kpi purple"><span class="dash-kpi-icon">P</span><div><div class="dash-kpi-value">${formatScore(players.length)}</div><div class="dash-kpi-label">${esc(t('edenX1KpiActivePlayers'))}</div></div></div>
    <div class="dash-card dash-kpi orange"><span class="dash-kpi-icon">*</span><div><div class="dash-kpi-value dash-kpi-value-compact">${mvp ? publicPlayerButton(mvp.name, mvp.key, 'eden-x1-kpi-name') : '--'}</div><div class="dash-kpi-label">${esc(t('edenX1KpiTopContributor'))}</div></div></div>
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
    renderPerformerRows(players, { limit: 10 })
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
      renderPublicEmpty(t('edenX1NoAttackHistory'))
    );
  }
  const grouped = new Map();
  rows.forEach((attack) => {
    const day = publicAttackDayLabel(attack);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day).push(attack);
  });
  const body = `<div class="dash-attack-list">${[...grouped.entries()]
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
  return renderPublicCard(t('adminHistoryTitle'), t('edenX1AttackHistoryHint'), body);
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
  return renderPublicCard(t('edenX1InsightsTitle'), t('edenX1InsightsHint'), body);
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
    .filter((player) => (player.attacks || []).length >= 2)
    .map((player) => {
      const values = player.attacks
        .slice()
        .sort((a, b) => publicAttackMs(a.attack) - publicAttackMs(b.attack))
        .map((attack) => valueOf(attack.demo));
      const avg = publicAverage(values);
      const variance = publicAverage(values.map((value) => Math.pow(value - avg, 2)));
      const coeff = avg ? Math.sqrt(variance) / avg : 99;
      const half = Math.floor(values.length / 2);
      const span = Math.min(5, half || 1);
      const first = publicAverage(values.slice(0, span));
      const last = publicAverage(values.slice(-span));
      return { ...player, values, coeff, delta: last - first };
    });
  if (!scored.length) return renderPublicEmpty(t('edenX1NeedTwoHits'));
  const consistent = [...scored].sort((a, b) => a.coeff - b.coeff).slice(0, 5);
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
    ${rows.length ? rows.map((player) => `<span><em>${publicPlayerButton(player.name, player.key)}</em><b class="${kind}">${kind === 'steady' ? t('edenX1SteadyPercent', { percent: Math.round((1 - Math.min(player.coeff, 1)) * 100) }) : `${player.delta >= 0 ? '+' : ''}${compactValue(player.delta)}`}</b></span>`).join('') : `<span class="muted">${esc(t('edenX1NoMovement'))}</span>`}
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
      <div class="dash-modal-stat"><div>${esc(t('edenX1ModalTargets'))}</div><div class="dash-modal-stat-value dash-modal-stat-value--amber">${formatScore(player.unique_structures_count)}</div></div>
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

function bindPublicDashboardControls(host) {
  if (!host) return;
  bindWeightedPopovers(host);
  if (host.dataset.publicControlsBound) return;
  host.dataset.publicControlsBound = '1';
  host.addEventListener('input', (event) => {
    const input = event.target.closest('#edenX1PublicWeightedSearch');
    if (!input) return;
    currentPublicTableSearch = input.value || '';
    const selectionStart = input.selectionStart ?? currentPublicTableSearch.length;
    const card = host.querySelector('.eden-x1-public-weighted-card');
    if (!card) return;
    card.outerHTML = renderPublicWeightedContributionTable();
    bindWeightedPopovers(host);
    const nextInput = host.querySelector('#edenX1PublicWeightedSearch');
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(selectionStart, selectionStart);
    }
  });
  host.addEventListener('click', (event) => {
    if (
      event.target.closest('#edenX1PublicModalClose') ||
      event.target === $('edenX1PublicModal')
    ) {
      closePublicModal();
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

function renderPublicDashboard(data = publicDashboardData) {
  const host = $('edenX1PublicDashboard');
  if (!host) return;
  publicDashboardData = data || {};
  publicAttackRows = sortPublicAttacks(publicDashboardData.attacks);
  publicPlayerRows = buildPublicPlayerRows(publicAttackRows);
  publicStructureRows = buildPublicStructureRows(publicAttackRows);
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
    <div class="eden-x1-reward-heading">
      <span class="eden-x1-reward-eyebrow">${esc(t('edenX1PublicEyebrow'))}</span>
      <h2>${esc(t('edenX1PublicTitle'))}</h2>
      <p>${esc(t('edenX1PublicSubtitle'))}</p>
    </div>
    <div class="eden-x1-public-grid" style="display:grid;gap:.85rem;align-items:start">
      ${renderPublicWeightedContributionTable()}
      ${renderPublicKpis(publicAttackRows, publicPlayerRows, publicStructureRows)}
      <div class="eden-x1-public-columns" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:.85rem;align-items:start;grid-column:1/-1">
        <div style="display:grid;gap:.85rem;min-width:0">
          ${renderPublicTopPerformers(publicPlayerRows)}
        </div>
        <div style="display:grid;gap:.85rem;min-width:0">
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
}

function scheduleLocalizedRerender() {
  const token = ++localizedRenderToken;
  requestAnimationFrame(() => {
    if (token !== localizedRenderToken) return;
    renderCurrentTable();
    const renderPublic = () => {
      if (token !== localizedRenderToken || !publicDashboardData) return;
      renderPublicDashboard(publicDashboardData);
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(renderPublic, { timeout: 300 });
    } else {
      setTimeout(renderPublic, 0);
    }
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
  const numberMode = options.numberMode || 'final';
  const rewardContextForRow =
    typeof options.rewardContextForRow === 'function' ? options.rewardContextForRow : () => ({});
  const visibleRows = sortedWeightedRows(filterWeightedRows(rows), numberMode);
  const emptyRow = `<tr><td colspan="14" class="dash-empty">${esc(t('edenX1NoRows'))}</td></tr>`;
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card ${compactView ? 'dash-weighted-compact' : ''}">
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
                          ? row.edenX1RewardSlot || index + 1
                          : row.finalRank;
                    const rewardContext = rewardContextForRow(row, index, numberValue);
                    const rowReward =
                      rewardContext.baseReward || rewardContext.currentReward || row.currentReward;
                    const rewardClass = rewardThemeClass(
                      rewardContext.finalReward || row.finalReward
                    );
                    return `<tr class="${rewardClass}">
                <td class="dash-weighted-mobile-header-cell" data-label="${esc(t('edenX1ThNumber'))}">
                  <span class="dash-weighted-desktop-number">${numberValue}</span>
                  <span class="dash-weighted-mobile-header" aria-label="${esc(`#${numberValue} ${row.playerName}`)}">
                    <span class="dash-weighted-mobile-rank" data-rank="${esc(`#${numberValue}`)}" aria-hidden="true"></span>
                    <strong class="dash-weighted-mobile-player-name" data-player="${esc(row.playerName)}" aria-hidden="true">${renderTaggedPlayerName(row)}</strong>
                  </span>
                </td>
                <td class="dash-weighted-player-cell" data-label="${esc(t('adminContributionMember'))}"><strong>${renderTaggedPlayerName(row)}</strong></td>
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
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card eden-x1-slots-card">
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
                <td data-label="${esc(t('edenX1RewardSlotStatus'))}">${esc(row.status)}</td>
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
  const panel = $('dashWeightedContributionPanel');
  if (!panel) return;
  if (currentRewardView === 'management' || currentRewardView === 'team') {
    panel.innerHTML = renderRewardSlotTable(currentRewardView);
    if (currentRewardView === 'team') bindEdenVoteControls(panel);
    updateRewardFlowControls();
    if (renderOptions.scrollIntoView) {
      requestAnimationFrame(scrollRewardTableIntoView);
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
      numberMode: 'index',
      rewardContextForRow: (row, _index, numberValue) => {
        const reward = row.currentReward || 'core';
        const label = contributionRewardLabel(reward);
        return {
          rank: numberValue,
          rankLabel: t('edenX1RewardLeaderboardTitle'),
          baseReward: reward,
          finalReward: reward,
          reason: `${t('edenX1RewardLeaderboardTitle')} #${numberValue}. ${t('adminContributionFinalReward')}: ${label}.`,
        };
      },
    };
  } else if (currentRewardView === 'support') {
    rows = getSupportRewardRows();
    tableOptions = {
      title: t('edenX1RewardSupportTitle'),
      meta: t('edenX1RewardSupportMeta'),
      numberMode: 'index',
      rewardContextForRow: (row, _index, numberValue) => {
        const reward = row.edenX1SupportReward || 'core';
        const label = contributionRewardLabel(reward);
        return {
          rank: numberValue,
          rankLabel: t('edenX1RewardSupportTitle'),
          baseReward: reward,
          finalReward: reward,
          reason: `${t('edenX1RewardSupportTitle')} #${numberValue}. ${t('adminContributionFinalReward')}: ${label}.`,
        };
      },
    };
  }
  panel.innerHTML = renderTable(rows, currentRecordLabel, tableOptions);
  bindWeightedTableControls(panel);
  updateRewardFlowControls();
  if (renderOptions.focusSearch) {
    const search = $('edenX1TableSearch');
    if (search) {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }
  if (renderOptions.scrollIntoView) {
    requestAnimationFrame(scrollRewardTableIntoView);
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

  $('languageSelect')?.addEventListener('change', async (e) => {
    const nextLang = e.target.value || 'en';
    localStorage.setItem('vts_hero_lang', nextLang);
    await loadTranslationsForLanguage(nextLang);
    updateTextContent(nextLang);
  });
}

async function main() {
  await bootShell();
  const panel = $('dashWeightedContributionPanel');
  const errorEl = $('edenX1Error');

  try {
    const [{ initFirebase, ensureAnonymousAuth }, { importFirestore }] = await Promise.all([
      import('./firebase.js'),
      import('./firebase-sdk.js'),
    ]);
    const { configured, db } = initFirebase();
    if (!configured || !db) {
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.textContent = t('edenX1NoFirebase');
      }
      setRewardFlowReady(false);
      if (panel) panel.innerHTML = '';
      setEdenPanelLoading(false);
      return;
    }

    const voteUser = await ensureAnonymousAuth();

    const firestore = await importFirestore();
    const { doc, getDoc } = firestore;
    edenVoteWriteContext = { db, firestore, user: voteUser };
    const [snap, rosterSnap] = await Promise.all([
      getDoc(doc(db, FS_PATH)),
      getDoc(doc(db, FS_ROSTER_PATH)).catch(() => null),
    ]);

    if (!snap.exists()) {
      setRewardFlowReady(false);
      if (panel) panel.innerHTML = `<div class="dash-empty">${esc(t('edenX1NoData'))}</div>`;
      setEdenPanelLoading(false);
      return;
    }

    const data = { ...snap.data() };
    if (rosterSnap?.exists?.()) {
      const rosterData = rosterSnap.data() || {};
      if (Array.isArray(rosterData.snapshots)) data.rosterSnapshots = rosterData.snapshots;
    }
    const liveConductAdjustments = await loadPublicConductAdjustments(
      db,
      firestore,
      data.r5Season || ''
    );
    if (liveConductAdjustments.length) {
      data.publicConductAdjustments = liveConductAdjustments;
    }
    applyDashboardData(data);
  } catch (err) {
    console.error('Eden X1 view failed:', err);
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = t('edenX1LoadFailed', {
        error: err?.message || err || 'Unknown error',
      });
    }
    if (panel) panel.innerHTML = '';
    setRewardFlowReady(false);
    setEdenPanelLoading(false);
  }
}

function applyDashboardData(data = {}) {
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

  const model = buildWeightedContributionRows({
    contributionRecords,
    dutyRecords,
    r5Adjustments,
    exGuildContributions,
    season,
  });
  currentSeason = String(season || defaultEdenSeason()).trim();
  currentMemberOptions = collectEdenMemberOptions(data, model.rows || []);

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
  renderCurrentTable();
  renderPublicDashboard(data);
  setEdenPanelLoading(false);
}

window.setEdenX1DataForTest = function setEdenX1DataForTest(data) {
  applyDashboardData(data);
};

if (EDEN_X1_TEST_MODE) {
  bootShell().catch((err) => console.error('Eden X1 test shell failed:', err));
} else {
  main();
}
