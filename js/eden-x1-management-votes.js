const DEFAULT_SHEET_ID = '14gUmeDyTT-Bb9Yvqhz21HcyVKxrkK_hxvkTwpVLKwcM';
const DEFAULT_RESULTS_SHEET_NAME = 'Vote Results';
const DEFAULT_RAW_SHEET_NAME = 'Form Responses 1';
const DEFAULT_PICK_COLUMN_LABEL = 'Pick 4 Names';
const DEFAULT_NAME_COLUMN_LABEL = 'Name';
const DEFAULT_VOTES_COLUMN_LABEL = 'Votes';
const GOOGLE_VISUALIZATION_BASE = 'https://docs.google.com/spreadsheets/d';
const DEFAULT_MANAGEMENT_VOTES_PROXY_URL =
  'https://vts-ai-strategy-assistant.aboroe1097.workers.dev/v1/public/management-votes';
const JSONP_CALLBACK_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const DEFAULT_JSONP_TIMEOUT_MS = 20_000;
const DEFAULT_JSONP_RETRY_DELAY_MS = 500;
const DEFAULT_LATE_CALLBACK_RETENTION_MS = 60_000;
const DEFAULT_PROXY_TIMEOUT_MS = 8_000;
const KIKA_ALT_DISPLAY_NAME = '\ua9c1\u0f3a Kika \u0f3b\ua9c2';
const GOODNESS_CANONICAL_NAME = 'GoodnesGraycious';
let jsonpRequestSerial = 0;

function compactVoteKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

function assignmentMetric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function compareManagementVoteAssignmentCandidates(a, b) {
  return (
    assignmentMetric(b?.votes) - assignmentMetric(a?.votes) ||
    assignmentMetric(b?.bonusTeamEffort) - assignmentMetric(a?.bonusTeamEffort) ||
    assignmentMetric(b?.weightedScore) - assignmentMetric(a?.weightedScore) ||
    String(a?.playerName || '').localeCompare(String(b?.playerName || ''), 'en', {
      sensitivity: 'base',
    })
  );
}

export function managementVoteTieBreakCriterion(winner, runnerUp) {
  if (!winner || !runnerUp || assignmentMetric(winner.votes) !== assignmentMetric(runnerUp.votes)) {
    return '';
  }
  if (assignmentMetric(winner.bonusTeamEffort) !== assignmentMetric(runnerUp.bonusTeamEffort)) {
    return 'bonus-team-effort';
  }
  if (assignmentMetric(winner.weightedScore) !== assignmentMetric(runnerUp.weightedScore)) {
    return 'weighted-total';
  }
  return 'canonical-name';
}

function addManagementVoteCompetitionRanks(rows) {
  let rank = 0;
  let previousVotes = null;
  return rows.map((row, index) => {
    const votes = assignmentMetric(row?.votes);
    if (previousVotes === null || votes !== previousVotes) rank = index + 1;
    previousVotes = votes;
    return { ...row, voteRank: rank };
  });
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readCellText(cell) {
  if (!cell || typeof cell !== 'object') return '';
  if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
  if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
  return '';
}

function replaceStylizedLetters(value) {
  return String(value || '')
    .replace(/[\u039b\u03bb]/g, 'A')
    .replace(/[\u039e\u03be]/g, 'E')
    .replace(/[\u0394\u03b4]/g, 'A');
}

function uniqueValues(values) {
  const seen = new Set();
  return values
    .map((value) =>
      String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildManagementVotesUrl(options = {}) {
  const sheetId = String(options.sheetId || DEFAULT_SHEET_ID).trim();
  const sheetName = String(options.sheetName || DEFAULT_RESULTS_SHEET_NAME).trim();
  const callbackName = String(options.callbackName || '').trim();
  if (!sheetId) throw new Error('Missing Google Sheet id');
  if (callbackName && !JSONP_CALLBACK_RE.test(callbackName)) {
    throw new Error('Invalid Google Visualization callback name');
  }

  const url = new URL(`${GOOGLE_VISUALIZATION_BASE}/${encodeURIComponent(sheetId)}/gviz/tq`);
  url.searchParams.set('sheet', sheetName);
  url.searchParams.set('tqx', callbackName ? `responseHandler:${callbackName}` : 'out:json');
  return url.toString();
}

export function parseGoogleVisualizationResponse(source) {
  const text = String(source || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Google Visualization response did not contain JSON payload');
  }
  return JSON.parse(text.slice(start, end + 1));
}

export function splitManagementVotePicks(value) {
  return uniqueValues(String(value || '').split(/[,;\n]+/));
}

export function normalizeManagementVoteCandidateName(value) {
  return replaceStylizedLetters(value)
    .normalize('NFKC')
    .replace(/\([^)]*\b(?:vts|r4|r5|management)\b[^)]*\)/gi, ' ')
    .replace(/\[[^\]]*\b(?:vts|r4|r5|management)\b[^\]]*\]/gi, ' ')
    .replace(/\b(?:state\s*)?1097\b/gi, ' ')
    .replace(/\bs1097\b/gi, ' ')
    .replace(/\b\d{2,4}\b/g, ' ')
    .replace(/\b(?:vts|r4|r5)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function managementVoteCandidateVariants(value) {
  const raw = String(value || '').trim();
  const normalized = normalizeManagementVoteCandidateName(raw);
  const undecorated = normalized
    .replace(/[~*_`'"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const compactRaw = compactVoteKey(raw);
  const compactNormalized = compactVoteKey(normalized);
  const preferred = [
    ...(compactRaw.includes('victoria') && compactRaw.endsWith('kika')
      ? [KIKA_ALT_DISPLAY_NAME]
      : []),
    ...(compactRaw === 'goodness' || compactNormalized === 'goodness'
      ? [GOODNESS_CANONICAL_NAME]
      : []),
  ];
  return uniqueValues([...preferred, raw, normalized, undecorated]);
}

function getTable(payloadOrTable) {
  if (payloadOrTable?.table) return payloadOrTable.table;
  return payloadOrTable || {};
}

function findColumnIndex(table, preferredLabel, fallbackPredicate) {
  const labels = (Array.isArray(table.cols) ? table.cols : []).map((col) =>
    normalizeHeader(col?.label || col?.id)
  );
  const preferred = normalizeHeader(preferredLabel);
  const exactIndex = labels.findIndex((label) => label === preferred);
  if (exactIndex >= 0) return exactIndex;
  return labels.findIndex(fallbackPredicate);
}

export function readManagementVoteRows(payloadOrTable, options = {}) {
  const table = getTable(payloadOrTable);
  const pickIndex = findColumnIndex(
    table,
    options.pickColumnLabel || DEFAULT_PICK_COLUMN_LABEL,
    (label) => label.includes('pick') && label.includes('name')
  );
  if (pickIndex < 0) return [];

  const voterIndex = findColumnIndex(table, 'Your Game Name', (label) =>
    label.includes('game name')
  );
  const timestampIndex = findColumnIndex(table, 'Timestamp', (label) =>
    label.includes('timestamp')
  );

  return (Array.isArray(table.rows) ? table.rows : [])
    .map((row, rowIndex) => {
      const cells = Array.isArray(row?.c) ? row.c : [];
      return {
        rowIndex,
        timestamp: readCellText(cells[timestampIndex]),
        voterName: readCellText(cells[voterIndex]),
        picks: splitManagementVotePicks(readCellText(cells[pickIndex])),
      };
    })
    .filter((row) => row.picks.length > 0);
}

export function readManagementVoteResultRows(payloadOrTable, options = {}) {
  const table = getTable(payloadOrTable);
  const nameIndex = findColumnIndex(
    table,
    options.nameColumnLabel || DEFAULT_NAME_COLUMN_LABEL,
    (label) => label.includes('name') || label.includes('player')
  );
  const votesIndex = findColumnIndex(
    table,
    options.votesColumnLabel || DEFAULT_VOTES_COLUMN_LABEL,
    (label) => label.includes('vote')
  );
  if (nameIndex < 0 || votesIndex < 0) return [];

  return (Array.isArray(table.rows) ? table.rows : [])
    .map((row, rowIndex) => {
      const cells = Array.isArray(row?.c) ? row.c : [];
      const rawName = readCellText(cells[nameIndex]);
      const votes = Number(readCellText(cells[votesIndex]).replace(/[^\d.-]/g, ''));
      return {
        rowIndex,
        rawName,
        votes: Number.isFinite(votes) && votes > 0 ? votes : 0,
      };
    })
    .filter((row) => row.rawName && row.votes > 0);
}

function defaultResolveCandidate(rawName) {
  const playerName = normalizeManagementVoteCandidateName(rawName) || String(rawName || '').trim();
  const playerKey = compactVoteKey(playerName);
  return playerKey ? { playerKey, familyKey: playerKey, playerName, rawName } : null;
}

function normalizeResolvedVoteCandidate(resolved, rawName) {
  if (!resolved) return null;
  const playerName = String(resolved.playerName || resolved.name || rawName || '').trim();
  const playerKey = compactVoteKey(resolved.playerKey || resolved.key || playerName);
  const familyKey = compactVoteKey(resolved.familyKey || playerKey);
  return playerKey && familyKey
    ? { playerKey, familyKey, playerName, matched: resolved.matched === true }
    : null;
}

function preferResolvedVoteIdentity(current, candidate) {
  if (current.matched !== candidate.matched) return candidate.matched;
  const currentIsCanonical = current.playerKey === current.familyKey;
  const candidateIsCanonical = candidate.playerKey === candidate.familyKey;
  if (currentIsCanonical !== candidateIsCanonical) return candidateIsCanonical;
  return Boolean(
    candidate.playerName &&
    (!current.playerName || candidate.playerName.length < current.playerName.length)
  );
}

export function aggregateManagementVotes(payloadOrRows, options = {}) {
  const rows = Array.isArray(payloadOrRows)
    ? payloadOrRows
    : readManagementVoteRows(payloadOrRows, options);
  const resolveCandidate =
    typeof options.resolveCandidate === 'function'
      ? options.resolveCandidate
      : defaultResolveCandidate;
  const excluded = new Set(
    (Array.isArray(options.excludeKeys) ? options.excludeKeys : []).map(compactVoteKey)
  );
  const totals = new Map();
  let totalVotes = 0;

  rows.forEach((row) => {
    const seenInBallot = new Set();
    row.picks.forEach((rawName, pickIndex) => {
      const candidate = normalizeResolvedVoteCandidate(resolveCandidate(rawName, row), rawName);
      if (!candidate || excluded.has(candidate.playerKey) || excluded.has(candidate.familyKey)) {
        return;
      }
      const rowOrder = Number.isFinite(row.rowIndex) ? row.rowIndex * 1000 : totals.size * 1000;
      const voteOrder = rowOrder + pickIndex;

      const current = totals.get(candidate.familyKey) || {
        playerKey: candidate.playerKey,
        familyKey: candidate.familyKey,
        playerName: candidate.playerName,
        votes: 0,
        voters: [],
        rawNameCounts: new Map(),
        firstSeen: voteOrder,
        lastSeen: voteOrder,
        matched: candidate.matched,
      };
      if (preferResolvedVoteIdentity(current, candidate)) {
        current.playerKey = candidate.playerKey;
        current.playerName = candidate.playerName;
      }
      current.matched = current.matched || candidate.matched;
      totals.set(candidate.familyKey, current);
      if (seenInBallot.has(candidate.familyKey)) return;
      seenInBallot.add(candidate.familyKey);
      totalVotes += 1;
      current.votes += 1;
      current.lastSeen = voteOrder;
      const raw = String(rawName || '').trim();
      if (raw) current.rawNameCounts.set(raw, (current.rawNameCounts.get(raw) || 0) + 1);
      if (row.voterName) current.voters.push(row.voterName);
    });
  });

  const rankings = addManagementVoteCompetitionRanks(
    [...totals.values()]
      .map((row) => ({
        ...row,
        rawNames: [...row.rawNameCounts.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([name]) => name),
        rawNameCounts: undefined,
      }))
      .sort(
        (a, b) =>
          b.votes - a.votes || a.firstSeen - b.firstSeen || a.playerName.localeCompare(b.playerName)
      )
  );
  const limit = Math.max(0, Number(options.limit || 0));

  return {
    totalBallots: rows.length,
    totalVotes,
    rankings,
    winners: limit ? rankings.slice(0, limit) : rankings,
  };
}

export function summarizeManagementVoteResults(payloadOrRows, options = {}) {
  const rows = Array.isArray(payloadOrRows)
    ? payloadOrRows
    : readManagementVoteResultRows(payloadOrRows, options);
  const resolveCandidate =
    typeof options.resolveCandidate === 'function'
      ? options.resolveCandidate
      : defaultResolveCandidate;
  const excluded = new Set(
    (Array.isArray(options.excludeKeys) ? options.excludeKeys : []).map(compactVoteKey)
  );
  const totals = new Map();

  rows.forEach((row) => {
    const candidate = normalizeResolvedVoteCandidate(
      resolveCandidate(row.rawName, row),
      row.rawName
    );
    if (!candidate || excluded.has(candidate.playerKey) || excluded.has(candidate.familyKey)) {
      return;
    }

    const current = totals.get(candidate.familyKey) || {
      playerKey: candidate.playerKey,
      familyKey: candidate.familyKey,
      playerName: candidate.playerName,
      votes: 0,
      voters: [],
      rawNameCounts: new Map(),
      firstSeen: Number.isFinite(row.rowIndex) ? row.rowIndex : totals.size,
      lastSeen: Number.isFinite(row.rowIndex) ? row.rowIndex : totals.size,
      matched: candidate.matched,
    };
    if (preferResolvedVoteIdentity(current, candidate)) {
      current.playerKey = candidate.playerKey;
      current.playerName = candidate.playerName;
    }
    current.votes += row.votes;
    current.lastSeen = Number.isFinite(row.rowIndex) ? row.rowIndex : current.lastSeen;
    current.matched = current.matched || candidate.matched;
    const raw = String(row.rawName || '').trim();
    if (raw) current.rawNameCounts.set(raw, (current.rawNameCounts.get(raw) || 0) + row.votes);
    totals.set(candidate.familyKey, current);
  });

  const rankings = addManagementVoteCompetitionRanks(
    [...totals.values()]
      .map((row) => ({
        ...row,
        rawNames: [...row.rawNameCounts.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([name]) => name),
        rawNameCounts: undefined,
      }))
      .sort(
        (a, b) =>
          b.votes - a.votes || a.firstSeen - b.firstSeen || a.playerName.localeCompare(b.playerName)
      )
  );
  const limit = Math.max(0, Number(options.limit || 0));

  return {
    totalBallots: 0,
    totalVotes: rankings.reduce((sum, row) => sum + row.votes, 0),
    rankings,
    winners: limit ? rankings.slice(0, limit) : rankings,
  };
}

export function summarizeManagementVotePayload(payloadOrRows, options = {}) {
  if (Array.isArray(payloadOrRows)) {
    const hasRawBallotRows = payloadOrRows.some((row) => Array.isArray(row?.picks));
    return hasRawBallotRows
      ? aggregateManagementVotes(payloadOrRows, options)
      : summarizeManagementVoteResults(payloadOrRows, options);
  }

  const resultRows = Array.isArray(payloadOrRows)
    ? []
    : readManagementVoteResultRows(payloadOrRows, options);
  if (resultRows.length) return summarizeManagementVoteResults(resultRows, options);
  return aggregateManagementVotes(payloadOrRows, options);
}

export function loadManagementVotesViaJsonp(options = {}) {
  const documentRef = options.document || globalThis.document;
  if (!documentRef) {
    return Promise.reject(new Error('Google Sheet vote loading requires a browser document'));
  }

  return new Promise((resolve, reject) => {
    const globalTarget = options.globalTarget || globalThis;
    const setTimer = options.setTimeoutFn || globalThis.setTimeout.bind(globalThis);
    const clearTimer = options.clearTimeoutFn || globalThis.clearTimeout.bind(globalThis);
    const callbackName = `__edenX1ManagementVotes${Date.now()}${++jsonpRequestSerial}`;
    const script = documentRef.createElement('script');
    const timeoutMs = Math.max(1, Number(options.timeoutMs || DEFAULT_JSONP_TIMEOUT_MS));
    const retentionMs = Math.max(
      0,
      Number(options.lateCallbackRetentionMs ?? DEFAULT_LATE_CALLBACK_RETENTION_MS)
    );
    let settled = false;
    let timeoutId = 0;
    let retentionId = 0;

    function removeScript() {
      script.onerror = null;
      script.remove();
    }

    function cleanupSuccess() {
      settled = true;
      clearTimer(timeoutId);
      clearTimer(retentionId);
      delete globalTarget[callbackName];
      removeScript();
    }

    function retainLateCallback() {
      globalTarget[callbackName] = () => {};
      retentionId = setTimer(() => {
        delete globalTarget[callbackName];
      }, retentionMs);
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      clearTimer(timeoutId);
      removeScript();
      retainLateCallback();
      reject(error);
    }

    globalTarget[callbackName] = (payload) => {
      if (settled) return;
      cleanupSuccess();
      resolve(payload);
    };

    script.async = true;
    script.src = buildManagementVotesUrl({ ...options, callbackName });
    script.onerror = () => {
      fail(new Error('Management vote Sheet could not be loaded'));
    };
    timeoutId = setTimer(() => {
      fail(new Error('Management vote Sheet timed out'));
    }, timeoutMs);

    documentRef.head.appendChild(script);
  });
}

function sleep(ms, setTimeoutFn = globalThis.setTimeout.bind(globalThis)) {
  return new Promise((resolve) => setTimeoutFn(resolve, ms));
}

async function loadManagementVoteSheetWithRetry(options) {
  const attempts = Math.max(1, Number(options.attempts ?? 2));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs ?? DEFAULT_JSONP_RETRY_DELAY_MS));
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await loadManagementVotesViaJsonp(options);
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await sleep(retryDelayMs, options.setTimeoutFn);
      }
    }
  }
  throw lastError;
}

export async function loadManagementVotesViaProxy(options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch?.bind(globalThis);
  const proxyUrl = String(
    options.proxyUrl === undefined ? DEFAULT_MANAGEMENT_VOTES_PROXY_URL : options.proxyUrl
  ).trim();
  if (!fetchFn || !proxyUrl) {
    throw new Error('Management vote proxy is unavailable');
  }

  const url = new URL(proxyUrl);
  url.searchParams.set('sheet', String(options.sheetName || DEFAULT_RESULTS_SHEET_NAME).trim());
  const setTimer = options.setTimeoutFn || globalThis.setTimeout.bind(globalThis);
  const clearTimer = options.clearTimeoutFn || globalThis.clearTimeout.bind(globalThis);
  const controller = new AbortController();
  const timeoutMs = Math.max(1, Number(options.proxyTimeoutMs || DEFAULT_PROXY_TIMEOUT_MS));
  const timer = setTimer(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response?.ok) {
      throw new Error(`Management vote proxy returned ${response?.status || 'an error'}`);
    }
    const payload = await response.json();
    if (!payload || payload.status === 'error' || !payload.table) {
      throw new Error('Management vote proxy returned an invalid payload');
    }
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Management vote proxy timed out');
    }
    throw error;
  } finally {
    clearTimer(timer);
  }
}

async function loadManagementVoteSheet(options) {
  if (options.proxyUrl === '') return loadManagementVoteSheetWithRetry(options);
  const requests = [
    loadManagementVotesViaProxy(options),
    loadManagementVoteSheetWithRetry(options),
  ];
  return new Promise((resolve, reject) => {
    const failures = [];
    requests.forEach((request, index) => {
      request.then(resolve, (error) => {
        failures[index] = error;
        if (failures.filter(Boolean).length !== requests.length) return;
        const combinedError = new Error('Management vote Sheet could not be reached');
        combinedError.cause = { proxyError: failures[0], jsonpError: failures[1] };
        reject(combinedError);
      });
    });
  });
}

export async function loadManagementVotesPayloadWithFallback(options = {}) {
  const payload = await loadManagementVoteSheet({
    ...options,
    sheetName: options.sheetName || DEFAULT_RESULTS_SHEET_NAME,
  });
  if (readManagementVoteResultRows(payload, options).length) return payload;
  return loadManagementVoteSheet({
    ...options,
    sheetName: options.rawSheetName || DEFAULT_RAW_SHEET_NAME,
  });
}
