/**
 * Pure data helpers for the Admin VTS Alliance View.
 *
 * This module deliberately has no DOM, storage, or Firebase dependency. Roster
 * documents can therefore be validated and previewed before a revision-checked
 * write, and the same behavior can be exercised in unit tests.
 */

export const ALLIANCE_ROSTER_HEADERS = Object.freeze([
  'Name',
  'Alliance',
  'Rank',
  'Server',
  'Castle Level',
  'Total Power',
  'Last Online',
]);

export const ALLIANCE_VIEW_METRICS = Object.freeze({
  EXTENDED: 'extended',
  BASE: 'base',
  ACTIVE: 'active',
  CONTRIBUTION: 'contribution',
  EX_GUILD: 'exGuild',
  DUTIES: 'duties',
  SHIELD_WALLS: 'shieldWalls',
  PATHERS: 'pathers',
  BANNERS: 'banners',
  BONUS_TEAM_EFFORT: 'bonusTeamEffort',
  TOTAL_POWER: 'totalPower',
});

export const ALLIANCE_MATCH_STATUSES = Object.freeze({
  MATCHED: 'matched',
  UNMATCHED: 'unmatched',
  FUZZY_REVIEW: 'fuzzy_review',
  AMBIGUOUS: 'ambiguous',
  DUPLICATE_CONFLICT: 'duplicate_conflict',
  MISSING_MANUAL_SOURCE: 'missing_manual_source',
});

const EDITABLE_ROSTER_FIELDS = Object.freeze([
  'name',
  'alliance',
  'rank',
  'server',
  'castleLevel',
  'totalPower',
  'lastOnline',
]);
const REQUIRED_HEADER_KEYS = Object.freeze([
  'name',
  'alliance',
  'rank',
  'server',
  'castlelevel',
  'totalpower',
  'lastonline',
]);
const DAY_MS = 24 * 60 * 60 * 1000;
const DUTY_POINT_VALUE = 10000;

function asText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim();
}

function asFiniteNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const text = asText(value).replace(/,/g, '').replace(/\s+/g, '');
  if (!text) return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value) {
  const text = asText(value);
  if (!text) return null;
  const parsed = Number(text.replace(/,/g, '').replace(/\s+/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNowMs(value = Date.now()) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeHeader(value) {
  return asText(value)
    .replace(/^\uFEFF/, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]/g, '');
}

function stableHash(value) {
  // FNV-1a is deterministic in every supported browser and sufficient for a
  // non-secret document/member identifier. Reconciliation preserves existing
  // IDs across confirmed name changes.
  let hash = 0x811c9dc5;
  const input = String(value || '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function slug(value, fallback = 'alliance') {
  return (
    normalizeAllianceName(value)
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || fallback
  );
}

export function normalizeAllianceExactName(value) {
  return asText(value).replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeAllianceName(value) {
  return asText(value)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function createStableRosterMemberId(member, allianceId = '') {
  const imported = member?.imported || member || {};
  const alliance = allianceId || member?.allianceId || imported.alliance || 'alliance';
  const identity = [
    normalizeAllianceExactName(imported.name || member?.name),
    normalizeAllianceExactName(imported.server || member?.server),
    normalizeAllianceExactName(imported.castleLevel ?? member?.castleLevel),
  ].join('|');
  return `av_${slug(alliance)}_${stableHash(`${normalizeAllianceName(alliance)}|${identity}`)}`;
}

/** Parse a RFC-4180-style CSV string, including embedded commas and newlines. */
export function parseCsvRows(csvText) {
  const text = String(csvText ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => asText(value))) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.replace(/\r$/, ''));
  if (row.some((value) => asText(value))) rows.push(row);
  return { rows, unterminatedQuote: quoted };
}

/**
 * Converts an import activity value to an absolute millisecond timestamp.
 * Unknown/never values are valid but intentionally remain null.
 */
export function parseRosterActivity(value, now = Date.now()) {
  const raw = asText(value);
  const nowMs = normalizeNowMs(now);
  if (!raw || /^(?:-|n\/?a|unknown|never)$/i.test(raw)) {
    return { raw, activityAtMs: null, kind: 'unknown', valid: true };
  }
  if (/^(?:online|now|just\s+now|active)$/i.test(raw)) {
    return { raw, activityAtMs: nowMs, kind: 'current', valid: true };
  }

  const unitMs = {
    y: 365 * DAY_MS,
    yr: 365 * DAY_MS,
    yrs: 365 * DAY_MS,
    year: 365 * DAY_MS,
    years: 365 * DAY_MS,
    mo: 30 * DAY_MS,
    month: 30 * DAY_MS,
    months: 30 * DAY_MS,
    w: 7 * DAY_MS,
    week: 7 * DAY_MS,
    weeks: 7 * DAY_MS,
    d: DAY_MS,
    day: DAY_MS,
    days: DAY_MS,
    h: 60 * 60 * 1000,
    hr: 60 * 60 * 1000,
    hrs: 60 * 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    m: 60 * 1000,
    min: 60 * 1000,
    mins: 60 * 1000,
    minute: 60 * 1000,
    minutes: 60 * 1000,
    s: 1000,
    sec: 1000,
    secs: 1000,
    second: 1000,
    seconds: 1000,
  };
  const cleaned = raw
    .toLocaleLowerCase('en')
    .replace(/\bago\b/g, '')
    .trim();
  const tokenPattern =
    /(\d+(?:\.\d+)?)\s*(years?|yrs?|y|months?|mo|weeks?|w|days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g;
  let durationMs = 0;
  let tokenCount = 0;
  let tokenMatch;
  while ((tokenMatch = tokenPattern.exec(cleaned))) {
    const amount = Number(tokenMatch[1]);
    const unit = tokenMatch[2];
    durationMs += amount * (unitMs[unit] || 0);
    tokenCount += 1;
  }
  const residue = cleaned.replace(tokenPattern, '').replace(/[\s,;+/-]+/g, '');
  if (tokenCount > 0 && !residue && durationMs >= 0) {
    return {
      raw,
      activityAtMs: Math.max(0, Math.round(nowMs - durationMs)),
      kind: 'relative',
      valid: true,
    };
  }

  const absoluteMs = Date.parse(raw);
  if (Number.isFinite(absoluteMs)) {
    return { raw, activityAtMs: absoluteMs, kind: 'absolute', valid: true };
  }
  return { raw, activityAtMs: null, kind: 'invalid', valid: false };
}

function rawImportObject(row, headerIndex) {
  const read = (key) => asText(row[headerIndex.get(key)]);
  return {
    name: read('name'),
    alliance: read('alliance'),
    rank: read('rank'),
    server: read('server'),
    castleLevel: read('castlelevel'),
    totalPower: read('totalpower'),
    lastOnline: read('lastonline'),
  };
}

function typedImportObject(raw, allianceId) {
  return {
    name: raw.name,
    alliance: raw.alliance || asText(allianceId),
    rank: raw.rank,
    server: raw.server,
    castleLevel: optionalNumber(raw.castleLevel),
    totalPower: optionalNumber(raw.totalPower),
    lastOnline: raw.lastOnline,
  };
}

/**
 * Parse and validate one alliance roster export. Invalid rows are returned for
 * import preview and are never silently included in `rows`.
 */
export function parseAllianceRosterCsv(csvText, options = {}) {
  const allianceId = asText(options.allianceId);
  const nowMs = normalizeNowMs(options.now);
  const importedAtMs = normalizeNowMs(options.importedAt ?? nowMs);
  const parsed = parseCsvRows(csvText);
  const headers = parsed.rows[0] || [];
  const headerIndex = new Map();
  headers.forEach((header, index) => headerIndex.set(normalizeHeader(header), index));
  const headerErrors = REQUIRED_HEADER_KEYS.filter((key) => !headerIndex.has(key)).map(
    (key) => `missing_header:${key}`
  );
  if (parsed.unterminatedQuote) headerErrors.push('unterminated_quote');

  const rows = [];
  const malformed = [];
  const idOccurrences = new Map();
  if (!headerErrors.length) {
    parsed.rows.slice(1).forEach((csvRow, rowIndex) => {
      const sourceRowNumber = rowIndex + 2;
      const importedRaw = rawImportObject(csvRow, headerIndex);
      const imported = typedImportObject(importedRaw, allianceId);
      const activity = parseRosterActivity(importedRaw.lastOnline, nowMs);
      const errors = [];
      if (!imported.name) errors.push('missing_name');
      if (importedRaw.castleLevel && imported.castleLevel === null) {
        errors.push('invalid_castle_level');
      }
      if (importedRaw.totalPower && imported.totalPower === null) {
        errors.push('invalid_total_power');
      }
      if (!activity.valid) errors.push('invalid_last_online');
      if (csvRow.length > headers.length && csvRow.slice(headers.length).some(asText)) {
        errors.push('unexpected_columns');
      }
      if (errors.length) {
        malformed.push({ sourceRowNumber, raw: importedRaw, errors });
        return;
      }

      const baseId = createStableRosterMemberId({ imported, allianceId }, allianceId);
      const occurrence = (idOccurrences.get(baseId) || 0) + 1;
      idOccurrences.set(baseId, occurrence);
      const id = occurrence === 1 ? baseId : `${baseId}_${occurrence}`;
      rows.push({
        id,
        allianceId: allianceId || slug(imported.alliance),
        imported,
        importedRaw,
        overrides: {},
        knownNames: [imported.name],
        activityAtMs: activity.activityAtMs,
        activityRaw: activity.raw,
        importedActivityAtMs: activity.activityAtMs,
        edenAssignment: null,
        sourceRowNumber,
        importedAtMs,
        createdAtMs: importedAtMs,
        updatedAtMs: importedAtMs,
      });
    });
  }

  return {
    allianceId,
    headers,
    headerErrors,
    rows,
    malformed,
    importedAtMs,
    sourceRowCount: Math.max(0, parsed.rows.length - 1),
  };
}

export function getEffectiveRosterMember(member = {}) {
  const imported = member.imported || {};
  const overrides = member.overrides || {};
  const effective = {};
  EDITABLE_ROSTER_FIELDS.forEach((field) => {
    effective[field] = Object.prototype.hasOwnProperty.call(overrides, field)
      ? overrides[field]
      : imported[field];
  });
  effective.name = asText(effective.name);
  effective.alliance = asText(effective.alliance || member.allianceId);
  effective.rank = asText(effective.rank);
  effective.server = asText(effective.server);
  effective.castleLevel = optionalNumber(effective.castleLevel);
  effective.totalPower = optionalNumber(effective.totalPower);
  effective.lastOnline = asText(effective.lastOnline || member.activityRaw);
  return { ...effective, id: member.id || member.memberId, allianceId: member.allianceId };
}

export function applyRosterOverrides(member, patch = {}, options = {}) {
  const overrides = { ...(member?.overrides || {}) };
  EDITABLE_ROSTER_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) return;
    const value = patch[field];
    if (value === undefined) return;
    overrides[field] =
      field === 'castleLevel' || field === 'totalPower' ? optionalNumber(value) : asText(value);
  });
  const updated = {
    ...member,
    overrides,
    updatedAtMs: normalizeNowMs(options.now),
  };
  if (Object.prototype.hasOwnProperty.call(patch, 'lastOnline')) {
    const activity = parseRosterActivity(patch.lastOnline, options.now);
    updated.activityAtMs = activity.activityAtMs;
    updated.activityRaw = activity.raw;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'activityAtMs')) {
    updated.activityAtMs =
      patch.activityAtMs === null || patch.activityAtMs === ''
        ? null
        : normalizeNowMs(patch.activityAtMs);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    updated.knownNames = uniqueNames([
      ...(member?.knownNames || []),
      member?.imported?.name,
      patch.name,
    ]);
  }
  return updated;
}

export function resetRosterOverrides(member, fields = EDITABLE_ROSTER_FIELDS, options = {}) {
  const resetFields = new Set(Array.isArray(fields) ? fields : [fields]);
  const overrides = { ...(member?.overrides || {}) };
  resetFields.forEach((field) => delete overrides[field]);
  const updated = { ...member, overrides, updatedAtMs: normalizeNowMs(options.now) };
  if (resetFields.has('lastOnline')) {
    const activity = parseRosterActivity(
      member?.imported?.lastOnline,
      member?.importedAtMs ?? options.now
    );
    updated.activityAtMs = member?.importedActivityAtMs ?? activity.activityAtMs;
    updated.activityRaw = member?.imported?.lastOnline || activity.raw;
  }
  return updated;
}

function uniqueNames(names) {
  const seen = new Set();
  return names.map(asText).filter((name) => {
    const key = normalizeAllianceExactName(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createManualRosterMember(fields = {}, options = {}) {
  const nowMs = normalizeNowMs(options.now);
  const allianceId = asText(options.allianceId || fields.allianceId || fields.alliance);
  const activity = parseRosterActivity(fields.lastOnline, nowMs);
  const activityAtMs =
    fields.activityAtMs === null || fields.activityAtMs === ''
      ? null
      : fields.activityAtMs !== undefined
        ? normalizeNowMs(fields.activityAtMs)
        : activity.activityAtMs;
  const imported = {
    name: asText(fields.name),
    alliance: asText(fields.alliance || allianceId),
    rank: asText(fields.rank),
    server: asText(fields.server),
    castleLevel: optionalNumber(fields.castleLevel),
    totalPower: optionalNumber(fields.totalPower),
    lastOnline: asText(fields.lastOnline),
  };
  const id = asText(options.id) || createStableRosterMemberId({ imported, allianceId }, allianceId);
  return {
    id,
    allianceId,
    imported,
    importedRaw: Object.fromEntries(
      Object.entries(imported).map(([key, value]) => [key, value === null ? '' : String(value)])
    ),
    overrides: {},
    knownNames: uniqueNames([imported.name]),
    activityAtMs,
    activityRaw: activity.raw,
    importedActivityAtMs: activityAtMs,
    edenAssignment: null,
    manuallyAdded: true,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
}

export function transferRosterMember(member, allianceId, options = {}) {
  const nextAllianceId = asText(allianceId);
  return applyRosterOverrides(
    { ...member, allianceId: nextAllianceId },
    { alliance: asText(options.allianceName || nextAllianceId) },
    options
  );
}

export function assignRosterEdenAccount(member, source, options = {}) {
  const sourceId = asText(source?.sourceId || source?.accountId || source?.id || source);
  if (!sourceId) throw new Error('alliance_view_eden_source_required');
  const memberId = member?.id || member?.memberId;
  const duplicate = (Array.isArray(options.members) ? options.members : []).find((candidate) => {
    const candidateId = candidate?.id || candidate?.memberId;
    const assignedId = asText(
      candidate?.edenAssignment?.sourceId || candidate?.edenAssignment?.accountId
    );
    return candidateId !== memberId && assignedId === sourceId;
  });
  const duplicateMatch = (Array.isArray(options.matchResults) ? options.matchResults : []).find(
    (result) => {
      const candidateId = result?.member?.id || result?.member?.memberId;
      return candidateId !== memberId && asText(result?.match?.sourceId) === sourceId;
    }
  );
  if (duplicate || duplicateMatch) {
    const error = new Error('alliance_view_eden_source_already_assigned');
    error.code = 'duplicate-eden-assignment';
    error.memberId =
      duplicate?.id ||
      duplicate?.memberId ||
      duplicateMatch?.member?.id ||
      duplicateMatch?.member?.memberId;
    throw error;
  }
  const nowMs = normalizeNowMs(options.now);
  return {
    ...member,
    edenAssignment: {
      sourceId,
      sourceName: asText(source?.sourceName || source?.accountName || source?.playerName),
      playerKey: asText(source?.playerKey),
      method: asText(options.method || 'manual_account_mapping'),
      confirmedAtMs: nowMs,
      confirmedBy: asText(options.confirmedBy),
    },
    updatedAtMs: nowMs,
  };
}

export function clearRosterEdenAssignment(member, options = {}) {
  return {
    ...member,
    edenAssignment: null,
    updatedAtMs: normalizeNowMs(options.now),
  };
}

export function confirmRosterNameChange(existingMember, importedMember, options = {}) {
  const nowMs = normalizeNowMs(options.now);
  const previousEffective = getEffectiveRosterMember(existingMember);
  const nextImported = importedMember?.imported || importedMember || {};
  const keepActivityOverride =
    Object.prototype.hasOwnProperty.call(existingMember?.overrides || {}, 'lastOnline') ||
    Object.prototype.hasOwnProperty.call(existingMember?.overrides || {}, 'activityAtMs');
  return {
    ...existingMember,
    allianceId: importedMember?.allianceId || existingMember?.allianceId,
    imported: { ...nextImported },
    importedRaw: { ...(importedMember?.importedRaw || {}) },
    knownNames: uniqueNames([
      ...(existingMember?.knownNames || []),
      previousEffective.name,
      nextImported.name,
    ]),
    activityAtMs: keepActivityOverride
      ? (existingMember?.activityAtMs ?? null)
      : (importedMember?.activityAtMs ?? existingMember?.activityAtMs ?? null),
    activityRaw: keepActivityOverride
      ? (existingMember?.activityRaw ?? '')
      : (importedMember?.activityRaw ?? existingMember?.activityRaw ?? ''),
    importedActivityAtMs:
      importedMember?.importedActivityAtMs ?? importedMember?.activityAtMs ?? null,
    importedAtMs: importedMember?.importedAtMs ?? nowMs,
    updatedAtMs: nowMs,
  };
}

function memberIdentityKeys(member) {
  const effective = getEffectiveRosterMember(member);
  const names = uniqueNames([
    effective.name,
    member?.imported?.name,
    ...(Array.isArray(member?.knownNames) ? member.knownNames : []),
  ]);
  return names.map(normalizeAllianceExactName);
}

function importedComparable(member) {
  return JSON.stringify({
    imported: member?.imported || {},
    importedRaw: member?.importedRaw || {},
    activityAtMs: member?.activityAtMs ?? null,
    activityRaw: member?.activityRaw || '',
  });
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let rowIndex = 1; rowIndex <= left.length; rowIndex += 1) {
    const current = [rowIndex];
    for (let columnIndex = 1; columnIndex <= right.length; columnIndex += 1) {
      const substitution =
        previous[columnIndex - 1] + (left[rowIndex - 1] === right[columnIndex - 1] ? 0 : 1);
      current[columnIndex] = Math.min(
        previous[columnIndex] + 1,
        current[columnIndex - 1] + 1,
        substitution
      );
    }
    previous = current;
  }
  return previous[right.length];
}

export function getAllianceNameSimilarity(left, right) {
  const a = normalizeAllianceName(left);
  const b = normalizeAllianceName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  return 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
}

function renameCandidateScore(removedMember, addedMember) {
  const oldRow = getEffectiveRosterMember(removedMember);
  const newRow = getEffectiveRosterMember(addedMember);
  const sameServer = Boolean(
    oldRow.server &&
    normalizeAllianceExactName(oldRow.server) === normalizeAllianceExactName(newRow.server)
  );
  const sameCastle = oldRow.castleLevel !== null && oldRow.castleLevel === newRow.castleLevel;
  const sameRank = Boolean(
    oldRow.rank &&
    normalizeAllianceExactName(oldRow.rank) === normalizeAllianceExactName(newRow.rank)
  );
  const powerDelta =
    oldRow.totalPower && newRow.totalPower
      ? Math.abs(oldRow.totalPower - newRow.totalPower) /
        Math.max(oldRow.totalPower, newRow.totalPower)
      : 1;
  const closePower = powerDelta <= 0.1;
  const metadataSignals = [sameServer, sameCastle, sameRank, closePower].filter(Boolean).length;
  const nameSimilarity = getAllianceNameSimilarity(oldRow.name, newRow.name);
  const score =
    nameSimilarity * 0.55 +
    Number(sameServer) * 0.2 +
    Number(sameCastle) * 0.1 +
    Number(closePower) * 0.1 +
    Number(sameRank) * 0.05;
  return { score, nameSimilarity, metadataSignals, sameServer, sameCastle, sameRank, closePower };
}

/** Build the non-destructive import preview used before replacing a roster. */
export function reconcileAllianceRoster(currentRoster, importResult, options = {}) {
  const currentMembers = Array.isArray(currentRoster)
    ? currentRoster
    : Array.isArray(currentRoster?.members)
      ? currentRoster.members
      : [];
  const importedMembers = Array.isArray(importResult)
    ? importResult
    : Array.isArray(importResult?.rows)
      ? importResult.rows
      : [];
  const malformed = Array.isArray(importResult?.malformed) ? importResult.malformed.slice() : [];
  const headerErrors = Array.isArray(importResult?.headerErrors)
    ? importResult.headerErrors.slice()
    : [];
  const currentByIdentity = new Map();
  currentMembers.forEach((member) => {
    memberIdentityKeys(member).forEach((key) => {
      const list = currentByIdentity.get(key) || [];
      list.push(member);
      currentByIdentity.set(key, list);
    });
  });

  const usedCurrentIds = new Set();
  const updated = [];
  const unchanged = [];
  const provisionalAdded = [];
  const nextMembers = [];
  importedMembers.forEach((incoming) => {
    const candidates = memberIdentityKeys(incoming)
      .flatMap((key) => currentByIdentity.get(key) || [])
      .filter((candidate, index, all) => all.findIndex((row) => row.id === candidate.id) === index)
      .filter((candidate) => !usedCurrentIds.has(candidate.id));
    if (candidates.length !== 1) {
      provisionalAdded.push({ member: incoming, ambiguousExisting: candidates });
      return;
    }
    const existing = candidates[0];
    usedCurrentIds.add(existing.id);
    const keepActivityOverride =
      Object.prototype.hasOwnProperty.call(existing?.overrides || {}, 'lastOnline') ||
      Object.prototype.hasOwnProperty.call(existing?.overrides || {}, 'activityAtMs');
    const merged = {
      ...existing,
      allianceId: incoming.allianceId || existing.allianceId,
      imported: { ...incoming.imported },
      importedRaw: { ...incoming.importedRaw },
      activityAtMs: keepActivityOverride ? existing.activityAtMs : incoming.activityAtMs,
      activityRaw: keepActivityOverride ? existing.activityRaw : incoming.activityRaw,
      importedActivityAtMs: incoming.importedActivityAtMs ?? incoming.activityAtMs,
      importedAtMs: incoming.importedAtMs,
      updatedAtMs: incoming.updatedAtMs,
      knownNames: uniqueNames([...(existing.knownNames || []), incoming.imported?.name]),
    };
    nextMembers.push(merged);
    if (importedComparable(existing) === importedComparable(merged)) {
      unchanged.push({ before: existing, after: merged });
    } else {
      updated.push({ before: existing, after: merged });
    }
  });

  const removed = currentMembers.filter((member) => !usedCurrentIds.has(member.id));
  const possibleRenamed = [];
  const unresolved = [];
  const renameThreshold = Number.isFinite(Number(options.renameThreshold))
    ? Number(options.renameThreshold)
    : 0.72;
  const suggestedRemovedIds = new Set();
  const added = provisionalAdded.map((entry) => entry.member);

  provisionalAdded.forEach((entry) => {
    if (entry.ambiguousExisting.length > 1) {
      unresolved.push({
        type: 'ambiguous_existing_identity',
        member: entry.member,
        candidates: entry.ambiguousExisting,
      });
      return;
    }
    const candidates = removed
      .filter((candidate) => !suggestedRemovedIds.has(candidate.id))
      .map((candidate) => ({ member: candidate, ...renameCandidateScore(candidate, entry.member) }))
      .filter((candidate) => candidate.score >= renameThreshold || candidate.metadataSignals >= 3)
      .sort((a, b) => b.score - a.score);
    if (
      candidates.length === 1 ||
      (candidates.length > 1 && candidates[0].score - candidates[1].score >= 0.08)
    ) {
      const suggestion = {
        before: candidates[0].member,
        after: entry.member,
        confidence: candidates[0].score,
        evidence: {
          nameSimilarity: candidates[0].nameSimilarity,
          sameServer: candidates[0].sameServer,
          sameCastle: candidates[0].sameCastle,
          sameRank: candidates[0].sameRank,
          closePower: candidates[0].closePower,
        },
        requiresConfirmation: true,
      };
      possibleRenamed.push(suggestion);
      suggestedRemovedIds.add(candidates[0].member.id);
    } else if (candidates.length > 1) {
      unresolved.push({
        type: 'ambiguous_possible_rename',
        member: entry.member,
        candidates: candidates.map((candidate) => candidate.member),
      });
    }
  });

  nextMembers.push(...added);
  return {
    added,
    removed,
    updated,
    unchanged,
    malformed,
    headerErrors,
    possibleRenamed,
    unresolved,
    nextMembers,
    hasBlockingErrors: headerErrors.length > 0 || malformed.length > 0 || unresolved.length > 0,
    requiresReview: possibleRenamed.length > 0 || unresolved.length > 0 || malformed.length > 0,
  };
}

function sourceNames(edenRow) {
  return uniqueNames([
    edenRow?.sourceName,
    edenRow?.accountName,
    edenRow?.playerName,
    edenRow?.name,
  ]);
}

export function getAllianceEdenSourceId(edenRow) {
  const explicitId = asText(
    edenRow?.sourceId || edenRow?.accountId || edenRow?.id || edenRow?.entryId
  );
  if (explicitId) return explicitId;
  const sourceName = normalizeAllianceExactName(sourceNames(edenRow)[0] || 'account');
  return `eden_${stableHash(`${sourceName}|${asText(edenRow?.playerKey)}`)}`;
}

function registryAliasEntries(registry) {
  const output = [];
  if (!registry) return output;
  if (registry instanceof Map) {
    registry.forEach((canonical, alias) => output.push({ alias, canonical, verified: true }));
    return output;
  }
  if (Array.isArray(registry)) {
    registry.forEach((entry) => {
      if (entry?.verified === false) return;
      const canonical = entry?.canonical || entry?.playerName || entry?.name || entry?.sourceId;
      const aliases = Array.isArray(entry?.aliases) ? entry.aliases : [entry?.alias];
      aliases.filter(Boolean).forEach((alias) => output.push({ alias, canonical, verified: true }));
    });
    return output;
  }
  if (Array.isArray(registry.players)) return registryAliasEntries(registry.players);
  Object.entries(registry).forEach(([alias, canonical]) => {
    if (canonical && typeof canonical === 'object' && canonical.verified === false) return;
    output.push({
      alias,
      canonical:
        typeof canonical === 'object' ? canonical.canonical || canonical.sourceId : canonical,
      verified: true,
    });
  });
  return output;
}

function readManualMapping(manualMappings, member) {
  const id = member?.id || member?.memberId;
  let mapping;
  if (manualMappings instanceof Map) mapping = manualMappings.get(id);
  else if (manualMappings && typeof manualMappings === 'object') mapping = manualMappings[id];
  mapping ||= member?.edenAssignment;
  if (!mapping) return null;
  if (typeof mapping === 'string') return { sourceId: mapping };
  return {
    ...mapping,
    sourceId: mapping.sourceId || mapping.accountId || mapping.id,
    sourceName: mapping.sourceName || mapping.accountName,
  };
}

function resultFor(member, match, edenRow = null) {
  return { member, edenRow, match };
}

/**
 * Resolve roster accounts against distinct Eden source rows. Fuzzy matches are
 * suggestions only: they never include an assigned `edenRow` until confirmed as
 * an account-specific manual mapping.
 */
export function matchRosterAccounts(rosterMembers = [], edenRows = [], options = {}) {
  const sourceIdOccurrences = new Map();
  const sources = edenRows.map((row, index) => {
    const baseSourceId = getAllianceEdenSourceId(row);
    const occurrence = (sourceIdOccurrences.get(baseSourceId) || 0) + 1;
    sourceIdOccurrences.set(baseSourceId, occurrence);
    return {
      row,
      index,
      sourceId: occurrence === 1 ? baseSourceId : `${baseSourceId}_${occurrence}`,
      names: sourceNames(row),
    };
  });
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const exactIndex = new Map();
  const normalizedIndex = new Map();
  sources.forEach((source) => {
    source.names.forEach((name) => {
      const exact = normalizeAllianceExactName(name);
      const normalized = normalizeAllianceName(name);
      if (exact) exactIndex.set(exact, [...(exactIndex.get(exact) || []), source]);
      if (normalized)
        normalizedIndex.set(normalized, [...(normalizedIndex.get(normalized) || []), source]);
    });
  });

  const registryCanonicalByName = new Map();
  registryAliasEntries(options.registryAliases).forEach(({ alias, canonical }) => {
    const aliasKey = normalizeAllianceName(alias);
    const canonicalKey = normalizeAllianceName(canonical);
    if (!aliasKey || !canonicalKey) return;
    registryCanonicalByName.set(aliasKey, canonicalKey);
    registryCanonicalByName.set(canonicalKey, canonicalKey);
  });
  const registrySourceIndex = new Map();
  sources.forEach((source) => {
    source.names.forEach((name) => {
      const canonicalKey = registryCanonicalByName.get(normalizeAllianceName(name));
      if (!canonicalKey) return;
      registrySourceIndex.set(canonicalKey, [
        ...(registrySourceIndex.get(canonicalKey) || []),
        source,
      ]);
    });
  });
  const assignedSourceIds = new Set();
  const fuzzyThreshold = Number.isFinite(Number(options.fuzzyThreshold))
    ? Number(options.fuzzyThreshold)
    : 0.78;

  const findAvailableUnique = (candidates) => {
    const unique = candidates
      .filter(
        (candidate, index, all) =>
          all.findIndex((row) => row.sourceId === candidate.sourceId) === index
      )
      .filter((candidate) => !assignedSourceIds.has(candidate.sourceId));
    return unique.length === 1 ? unique[0] : null;
  };
  const accept = (member, source, method, confidence = 1) => {
    if (assignedSourceIds.has(source.sourceId)) {
      return resultFor(member, {
        status: ALLIANCE_MATCH_STATUSES.DUPLICATE_CONFLICT,
        method,
        sourceId: source.sourceId,
        sourceName: source.names[0] || '',
        confidence,
        requiresConfirmation: true,
        reason: 'eden_source_already_assigned',
      });
    }
    assignedSourceIds.add(source.sourceId);
    return resultFor(
      member,
      {
        status: ALLIANCE_MATCH_STATUSES.MATCHED,
        method,
        sourceId: source.sourceId,
        sourceName: source.names[0] || '',
        confidence,
        requiresConfirmation: false,
      },
      source.row
    );
  };

  const results = Array(rosterMembers.length).fill(null);
  const manualMappings = rosterMembers.map((member) =>
    readManualMapping(options.manualMappings, member)
  );
  const isPending = (index) => results[index] === null;
  const uniqueCandidates = (candidates) =>
    candidates.filter(
      (candidate, index, all) =>
        all.findIndex((row) => row.sourceId === candidate.sourceId) === index
    );
  const markNameStage = (index, candidates, method, ambiguousReason) => {
    const member = rosterMembers[index];
    const unique = uniqueCandidates(candidates);
    const match = findAvailableUnique(unique);
    if (match) {
      results[index] = accept(member, match, method);
      return;
    }
    if (unique.length && unique.every((source) => assignedSourceIds.has(source.sourceId))) {
      results[index] = accept(member, unique[0], method);
      return;
    }
    if (unique.length > 1) {
      results[index] = resultFor(member, {
        status: ALLIANCE_MATCH_STATUSES.AMBIGUOUS,
        method,
        confidence: 1,
        requiresConfirmation: true,
        reason: ambiguousReason,
        candidates: unique.map((source) => source.sourceId),
      });
    }
  };
  const resolveTargetSource = (sourceId, sourceName) => {
    const direct = sourceById.get(asText(sourceId));
    if (direct) return direct;
    const exact = uniqueCandidates(exactIndex.get(normalizeAllianceExactName(sourceName)) || []);
    if (exact.length === 1) return exact[0];
    const normalized = uniqueCandidates(
      normalizedIndex.get(normalizeAllianceName(sourceName)) || []
    );
    return normalized.length === 1 ? normalized[0] : null;
  };

  // Apply each authority across the entire roster before moving to the next
  // authority. This prevents an earlier row's normalized/alias result from
  // consuming a source that a later row can match exactly.
  rosterMembers.forEach((member, index) => {
    // A saved account-specific assignment is an explicit admin override. It is
    // resolved in the manual stage below so reassignment and disambiguation do
    // not get overwritten by automatic name authorities.
    if (manualMappings[index]) return;
    const name = getEffectiveRosterMember(member).name;
    markNameStage(
      index,
      exactIndex.get(normalizeAllianceExactName(name)) || [],
      'exact_source_name',
      'multiple_exact_sources'
    );
  });
  rosterMembers.forEach((member, index) => {
    if (!isPending(index) || manualMappings[index]) return;
    const name = getEffectiveRosterMember(member).name;
    markNameStage(
      index,
      normalizedIndex.get(normalizeAllianceName(name)) || [],
      'unique_normalized_name',
      'normalized_name_not_unique'
    );
  });
  rosterMembers.forEach((member, index) => {
    if (!isPending(index) || manualMappings[index]) return;
    const name = getEffectiveRosterMember(member).name;
    const canonicalKey = registryCanonicalByName.get(normalizeAllianceName(name));
    if (!canonicalKey) return;
    markNameStage(
      index,
      registrySourceIndex.get(canonicalKey) || [],
      'verified_registry_alias',
      'registry_alias_not_unique'
    );
  });
  rosterMembers.forEach((member, index) => {
    if (!isPending(index)) return;
    const manual = manualMappings[index];
    if (!manual) return;
    const manualSource = resolveTargetSource(manual.sourceId, manual.sourceName);
    results[index] = manualSource
      ? accept(member, manualSource, 'manual_account_mapping')
      : resultFor(member, {
          status: ALLIANCE_MATCH_STATUSES.MISSING_MANUAL_SOURCE,
          method: 'manual_account_mapping',
          sourceId: asText(manual.sourceId),
          sourceName: asText(manual.sourceName),
          confidence: 0,
          requiresConfirmation: true,
          reason: 'manual_source_not_found',
        });
  });
  rosterMembers.forEach((member, index) => {
    if (!isPending(index)) return;
    const name = getEffectiveRosterMember(member).name;
    const suggestions = sources
      .filter((source) => !assignedSourceIds.has(source.sourceId))
      .map((source) => ({
        source,
        confidence: Math.max(
          ...source.names.map((sourceName) => getAllianceNameSimilarity(name, sourceName))
        ),
      }))
      .sort((a, b) => b.confidence - a.confidence);
    const suggestion = suggestions[0];
    results[index] =
      suggestion && suggestion.confidence >= fuzzyThreshold
        ? resultFor(member, {
            status: ALLIANCE_MATCH_STATUSES.FUZZY_REVIEW,
            method: 'fuzzy_suggestion',
            sourceId: '',
            sourceName: '',
            confidence: suggestion.confidence,
            requiresConfirmation: true,
            reason:
              suggestions[1] && suggestion.confidence - suggestions[1].confidence < 0.06
                ? 'fuzzy_candidates_close'
                : 'fuzzy_requires_confirmation',
            suggestion: {
              sourceId: suggestion.source.sourceId,
              sourceName: suggestion.source.names[0] || '',
              confidence: suggestion.confidence,
            },
          })
        : resultFor(member, {
            status: ALLIANCE_MATCH_STATUSES.UNMATCHED,
            method: 'none',
            sourceId: '',
            sourceName: '',
            confidence: suggestion?.confidence || 0,
            requiresConfirmation: false,
            reason: 'no_match',
          });
  });
  return results;
}

function edenNumber(row, fields) {
  for (const field of fields) {
    if (row?.[field] === undefined || row?.[field] === null || row?.[field] === '') continue;
    return asFiniteNumber(row[field]);
  }
  return 0;
}

export function getAllianceContributionMetrics(edenRow, activeMode = 'extended') {
  const contribution = edenNumber(edenRow, [
    'contributionScore',
    'rawContribution',
    'contribution',
    'score',
  ]);
  const exGuild = edenNumber(edenRow, ['contributionExGuild', 'exGuild', 'exGuildContribution']);
  const banners = edenNumber(edenRow, ['banners', 'bannerCount']);
  const pathers = edenNumber(edenRow, ['pathers', 'patherCount']);
  const shieldWalls = edenNumber(edenRow, ['shieldWalls', 'shieldWallCount']);
  const bonusTeamEffort = edenNumber(edenRow, [
    'bonusTeamEffort',
    'conductBonus',
    'r5Bonus',
    'bonus',
  ]);
  const duties = banners + pathers + shieldWalls;
  const base = contribution + exGuild;
  const extended =
    contribution + exGuild + DUTY_POINT_VALUE * (banners + pathers + shieldWalls + bonusTeamEffort);
  const normalizedActiveMode =
    activeMode === 'base' || activeMode === 'default' ? 'base' : 'extended';
  return {
    contribution,
    exGuild,
    banners,
    pathers,
    shieldWalls,
    duties,
    dutyPoints: DUTY_POINT_VALUE * duties,
    bonusTeamEffort,
    bonusPoints: DUTY_POINT_VALUE * bonusTeamEffort,
    base,
    extended,
    active: normalizedActiveMode === 'base' ? base : extended,
    activeMode: normalizedActiveMode,
  };
}

export function getActivityBand(activityAtMs, now = Date.now()) {
  const timestamp = Number(activityAtMs);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return {
      key: 'unknown',
      label: 'Unknown',
      icon: '?',
      tone: 'neutral',
      ariaLabel: 'Activity unknown',
    };
  }
  const ageMs = Math.max(0, normalizeNowMs(now) - timestamp);
  if (ageMs <= 2 * DAY_MS) {
    return {
      key: 'recent',
      label: 'Within 48 hours',
      icon: '✓',
      tone: 'normal',
      ariaLabel: 'Active within 48 hours',
    };
  }
  if (ageMs <= 7 * DAY_MS) {
    return {
      key: 'aging',
      label: '2–7 days',
      icon: '!',
      tone: 'amber',
      ariaLabel: 'Last active over 48 hours and within 7 days',
    };
  }
  return {
    key: 'stale',
    label: 'Over 7 days',
    icon: '×',
    tone: 'red',
    ariaLabel: 'Last active over 7 days ago',
  };
}

export function getBonusBand(value) {
  const bonus = asFiniteNumber(value);
  if (bonus < 0)
    return {
      key: 'negative',
      label: 'Negative',
      icon: '−',
      tone: 'red',
      ariaLabel: `Negative bonus ${bonus}`,
    };
  if (bonus === 0)
    return { key: 'zero', label: 'Zero', icon: '0', tone: 'neutral', ariaLabel: 'Zero bonus' };
  if (bonus <= 2)
    return {
      key: 'teal',
      label: '+1–2',
      icon: '+',
      tone: 'teal',
      ariaLabel: `Bonus plus ${bonus}`,
    };
  if (bonus <= 5)
    return {
      key: 'green',
      label: '+3–5',
      icon: '↑',
      tone: 'green',
      ariaLabel: `Bonus plus ${bonus}`,
    };
  return {
    key: 'gold',
    label: '+6 or more',
    icon: '★',
    tone: 'gold',
    ariaLabel: `Bonus plus ${bonus}`,
  };
}

export function getExtendedScoreBand(value) {
  const score = asFiniteNumber(value);
  if (score < 10000)
    return {
      key: 'under_10k',
      label: 'Under 10k',
      icon: '1',
      tone: 'lowest',
      ariaLabel: 'Extended score under 10 thousand',
    };
  if (score < 50000)
    return {
      key: '10k_49k',
      label: '10k–49,999',
      icon: '2',
      tone: 'low',
      ariaLabel: 'Extended score from 10 thousand to 49,999',
    };
  if (score < 100000)
    return {
      key: '50k_99k',
      label: '50k–99,999',
      icon: '3',
      tone: 'medium',
      ariaLabel: 'Extended score from 50 thousand to 99,999',
    };
  if (score < 200000)
    return {
      key: '100k_199k',
      label: '100k–199,999',
      icon: '4',
      tone: 'high',
      ariaLabel: 'Extended score from 100 thousand to 199,999',
    };
  return {
    key: '200k_plus',
    label: '200k+',
    icon: '5',
    tone: 'highest',
    ariaLabel: 'Extended score 200 thousand or more',
  };
}

export function buildAllianceViewRows(matchResults = [], options = {}) {
  const nowMs = normalizeNowMs(options.now);
  return matchResults.map((result) => {
    const member = result?.member || result;
    const effective = getEffectiveRosterMember(member);
    const match = result?.match || {
      status: ALLIANCE_MATCH_STATUSES.UNMATCHED,
      method: 'none',
      confidence: 0,
      requiresConfirmation: false,
    };
    const metrics = getAllianceContributionMetrics(result?.edenRow, options.activeMode);
    return {
      id: member?.id || member?.memberId,
      member,
      accountName: effective.name,
      allianceId: member?.allianceId,
      alliance: effective.alliance || member?.allianceId,
      rank: effective.rank,
      server: effective.server,
      castleLevel: effective.castleLevel,
      totalPower: effective.totalPower || 0,
      activityAtMs: member?.activityAtMs ?? null,
      activityRaw: member?.activityRaw || effective.lastOnline || '',
      importedActivityAtMs: member?.importedActivityAtMs ?? null,
      activityBand: getActivityBand(member?.activityAtMs, nowMs),
      importedName: member?.imported?.name || '',
      importedAlliance: member?.imported?.alliance || '',
      importedRank: member?.imported?.rank || '',
      importedServer: member?.imported?.server || '',
      importedCastleLevel: member?.imported?.castleLevel ?? '',
      importedTotalPower: member?.imported?.totalPower ?? '',
      knownNames: uniqueNames(member?.knownNames || []).join(' | '),
      manualOverrides: Object.keys(member?.overrides || {}).join(' | '),
      edenSourceId: match.sourceId || '',
      edenSourceName: match.sourceName || '',
      matchStatus: match.status,
      matchMethod: match.method,
      matchConfidence: asFiniteNumber(match.confidence),
      matchReason: match.reason || '',
      requiresConfirmation: Boolean(match.requiresConfirmation),
      matchSuggestion: match.suggestion || null,
      matchSuggestionSourceId: match.suggestion?.sourceId || '',
      matchSuggestionSourceName: match.suggestion?.sourceName || '',
      matchSuggestionConfidence: asFiniteNumber(match.suggestion?.confidence),
      ...metrics,
      bonusBand: getBonusBand(metrics.bonusTeamEffort),
      extendedScoreBand: getExtendedScoreBand(metrics.extended),
    };
  });
}

function metricValue(row, metric) {
  const key = Object.values(ALLIANCE_VIEW_METRICS).includes(metric)
    ? metric
    : ALLIANCE_VIEW_METRICS.EXTENDED;
  return asFiniteNumber(row?.[key]);
}

export function sortAllianceRows(rows = [], options = {}) {
  const key = asText(options.key || options.metric || ALLIANCE_VIEW_METRICS.EXTENDED);
  const direction = options.direction === 'asc' ? 1 : -1;
  const numericKeys = new Set([
    ...Object.values(ALLIANCE_VIEW_METRICS),
    'castleLevel',
    'activityAtMs',
    'matchConfidence',
    'metricRank',
  ]);
  return rows.slice().sort((left, right) => {
    let comparison;
    if (numericKeys.has(key)) {
      comparison = asFiniteNumber(left?.[key]) - asFiniteNumber(right?.[key]);
    } else {
      const leftValue = String(left?.[key] ?? '');
      const rightValue = String(right?.[key] ?? '');
      comparison = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }
    if (comparison) return comparison * direction;
    return String(left?.id || '').localeCompare(String(right?.id || ''));
  });
}

export function rankAllianceRows(rows = [], options = {}) {
  const metric = options.metric || ALLIANCE_VIEW_METRICS.EXTENDED;
  const direction = options.direction === 'asc' ? 1 : -1;
  return rows
    .slice()
    .sort((left, right) => {
      const primary = metricValue(left, metric) - metricValue(right, metric);
      if (primary) return primary * direction;
      const extendedTie = metricValue(right, 'extended') - metricValue(left, 'extended');
      if (extendedTie) return extendedTie;
      const baseTie = metricValue(right, 'base') - metricValue(left, 'base');
      if (baseTie) return baseTie;
      const nameTie = String(left?.accountName || '').localeCompare(
        String(right?.accountName || '')
      );
      if (nameTie) return nameTie;
      return String(left?.id || '').localeCompare(String(right?.id || ''));
    })
    .map((row, index) => ({ ...row, metricRank: index + 1, rankingMetric: metric }));
}

function filterSet(value) {
  if (value === undefined || value === null || value === '') return null;
  return new Set((Array.isArray(value) ? value : [value]).map((entry) => asText(entry)));
}

function inNumericRange(value, min, max) {
  const numeric = asFiniteNumber(value);
  if (min !== undefined && min !== null && min !== '' && numeric < Number(min)) return false;
  if (max !== undefined && max !== null && max !== '' && numeric > Number(max)) return false;
  return true;
}

export function filterAllianceRows(rows = [], filters = {}) {
  const query = normalizeAllianceExactName(filters.search);
  const alliances = filterSet(filters.alliance ?? filters.alliances);
  const ranks = filterSet(filters.rank ?? filters.ranks);
  const servers = filterSet(filters.server ?? filters.servers);
  const activities = filterSet(filters.activity ?? filters.activityBands);
  const statuses = filterSet(filters.matchStatus ?? filters.matchStatuses);
  const metric = filters.metric || ALLIANCE_VIEW_METRICS.EXTENDED;
  return rows.filter((row) => {
    if (query) {
      const haystack = [row.accountName, row.alliance, row.rank, row.server, row.edenSourceName]
        .map(normalizeAllianceExactName)
        .join(' ');
      if (!haystack.includes(query)) return false;
    }
    if (alliances && !alliances.has(asText(row.allianceId)) && !alliances.has(asText(row.alliance)))
      return false;
    if (ranks && !ranks.has(asText(row.rank))) return false;
    if (servers && !servers.has(asText(row.server))) return false;
    if (activities && !activities.has(asText(row.activityBand?.key))) return false;
    if (statuses && !statuses.has(asText(row.matchStatus))) return false;
    if (!inNumericRange(row.castleLevel, filters.castleMin, filters.castleMax)) return false;
    if (!inNumericRange(row.totalPower, filters.powerMin, filters.powerMax)) return false;
    if (!inNumericRange(metricValue(row, metric), filters.metricMin, filters.metricMax))
      return false;
    if (
      filters.activityAfter &&
      (!row.activityAtMs || row.activityAtMs < normalizeNowMs(filters.activityAfter))
    )
      return false;
    if (
      filters.activityBefore &&
      (!row.activityAtMs || row.activityAtMs > normalizeNowMs(filters.activityBefore))
    )
      return false;
    return true;
  });
}

export function selectAllianceRows(rows = [], options = {}) {
  const filtered = filterAllianceRows(rows, options.filters || {});
  const ranked = rankAllianceRows(filtered, {
    metric: options.metric || options.filters?.metric,
    direction: options.direction,
  });
  const limit =
    options.top === 'all' || options.limit === null ? null : Number(options.limit ?? options.top);
  return Number.isFinite(limit) && limit > 0 ? ranked.slice(0, limit) : ranked;
}

export function summarizeAllianceRows(rows = [], options = {}) {
  const topLimit = Number.isFinite(Number(options.topLimit)) ? Number(options.topLimit) : 100;
  const topRows = rankAllianceRows(rows, { metric: options.metric }).slice(0, topLimit);
  const topByAlliance = {};
  topRows.forEach((row) => {
    const key = asText(row.allianceId || row.alliance) || 'unknown';
    topByAlliance[key] = (topByAlliance[key] || 0) + 1;
  });
  const matched = rows.filter((row) => row.matchStatus === ALLIANCE_MATCH_STATUSES.MATCHED).length;
  return {
    accounts: rows.length,
    matched,
    unmatched: rows.length - matched,
    topCount: topRows.length,
    topByAlliance,
  };
}

export const ALLIANCE_EXPORT_COLUMNS = Object.freeze([
  ['metricRank', 'Rank'],
  ['id', 'Member ID'],
  ['accountName', 'Account Name'],
  ['alliance', 'Alliance'],
  ['rank', 'Alliance Rank'],
  ['server', 'Server'],
  ['castleLevel', 'Castle Level'],
  ['totalPower', 'Total Power'],
  ['activityRaw', 'Last Online (Imported)'],
  ['activityAtMs', 'Last Online Timestamp'],
  ['importedActivityAtMs', 'Imported Last Online Timestamp'],
  ['importedName', 'Imported Name'],
  ['knownNames', 'Known Names'],
  ['manualOverrides', 'Manual Override Fields'],
  ['matchStatus', 'Match Status'],
  ['matchMethod', 'Match Method'],
  ['matchConfidence', 'Match Confidence'],
  ['matchReason', 'Match Reason'],
  ['edenSourceId', 'Eden Source ID'],
  ['edenSourceName', 'Eden Source Name'],
  ['matchSuggestionSourceId', 'Suggested Eden Source ID'],
  ['matchSuggestionSourceName', 'Suggested Eden Source Name'],
  ['matchSuggestionConfidence', 'Suggestion Confidence'],
  ['contribution', 'Contribution'],
  ['exGuild', 'Ex-guild Contribution'],
  ['base', 'Base Score'],
  ['extended', 'Extended Weighted'],
  ['active', 'Active Admin Score'],
  ['duties', 'Duty Total'],
  ['shieldWalls', 'Shield Walls'],
  ['pathers', 'Pathers'],
  ['banners', 'Banners'],
  ['bonusTeamEffort', 'Bonus Team Effort'],
]);

function safeCsvValue(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportAllianceRowsCsv(rows = [], options = {}) {
  const columns =
    Array.isArray(options.columns) && options.columns.length
      ? options.columns.map((column) => (Array.isArray(column) ? column : [column, column]))
      : ALLIANCE_EXPORT_COLUMNS;
  const lines = [columns.map(([, label]) => safeCsvValue(label)).join(',')];
  rows.forEach((row) => {
    lines.push(columns.map(([key]) => safeCsvValue(row?.[key])).join(','));
  });
  return `${lines.join('\r\n')}\r\n`;
}
