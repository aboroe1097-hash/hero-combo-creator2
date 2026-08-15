// js/throne-buffs-model.js
// Pure model for the Throne Buffs weekly assignment tab.
//
// One week is one record: a map of buff id → member name, plus who saved it and
// when. Past weeks are kept so the tool can answer the only question that
// actually causes arguments — who has had which buff, how often, and how long
// ago. Nothing here touches the DOM or Firestore; the admin page owns both.
//
// Throne Buffs are a standing program: their records are global and are NOT
// scoped to the Eden season workspace, so a season rollover never clears or
// re-partitions this history.

// ISO-8601 week, because the in-game buff week is Monday-based and a plain
// date string would sort two different weeks together across a year boundary.
export function isoWeekKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  // Work in UTC on a copy: shifting to the week's Thursday is what makes the
  // year correct for the last/first days of a year.
  const utc = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const dayNumber = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function isValidWeekKey(value) {
  return /^\d{4}-W\d{2}$/.test(String(value || ''));
}

// Sorts newest first. Week keys are zero-padded and year-first, so a plain
// string comparison is already chronological.
export function compareWeekKeysDesc(a, b) {
  return String(b || '').localeCompare(String(a || ''));
}

const MAX_MEMBER_NAME_LENGTH = 40;
// Reasoning is a one-line "why them" note, not a comment thread. Keeping it
// short is what stops the export turning into a wall of text.
const MAX_REASON_LENGTH = 120;

// Member names arrive from a text field and end up in a shared record, so they
// are trimmed and length-capped here rather than at each call site. An empty
// name means the slot is deliberately unassigned, which is a real state.
export function normalizeMemberName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MEMBER_NAME_LENGTH);
}

/**
 * Builds a stored week record from raw form input.
 *
 * `buffIds` is the authoritative slot list: unknown keys in `assignments` are
 * dropped and missing ones become empty, so a record can never drift from the
 * catalog even if an older record is re-saved after the catalog changes.
 */
export function normalizeWeekAssignment(record, buffIds) {
  const weekKey = isValidWeekKey(record?.weekKey) ? record.weekKey : '';
  const source =
    record?.assignments && typeof record.assignments === 'object' ? record.assignments : {};
  const reasonSource =
    record?.reasons && typeof record.reasons === 'object' ? record.reasons : {};
  const assignments = {};
  const reasons = {};
  for (const buffId of buffIds) {
    assignments[buffId] = normalizeMemberName(source[buffId]);
    // A reason without a name is orphaned bookkeeping — drop it with the slot.
    reasons[buffId] = assignments[buffId] ? normalizeReason(reasonSource[buffId]) : '';
  }
  return {
    weekKey,
    assignments,
    reasons,
    updatedAtMs: Number(record?.updatedAtMs) || 0,
    updatedBy: String(record?.updatedBy || ''),
  };
}

export function normalizeReason(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REASON_LENGTH);
}

export function assignedCount(weekRecord) {
  return Object.values(weekRecord?.assignments || {}).filter(Boolean).length;
}

/**
 * Flags members holding more than one buff in the same week. Doubling up is
 * allowed — sometimes there is nobody else online — but it should be visible
 * rather than discovered later.
 */
export function duplicateMembersInWeek(weekRecord) {
  const seen = new Map();
  for (const name of Object.values(weekRecord?.assignments || {})) {
    if (!name) continue;
    const key = name.toLowerCase();
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

/**
 * Fairness view over the whole history.
 *
 * Per member: how many buffs in total, how many of each specific buff, and the
 * most recent week they held one. `weeksSinceLast` is measured against the
 * newest week present in the history, not against today, so the table reads the
 * same whether it is opened on Monday or Friday.
 */
export function buildFairnessTable(history, buffIds) {
  const weeks = (Array.isArray(history) ? history : [])
    .filter((record) => isValidWeekKey(record?.weekKey))
    .sort((a, b) => compareWeekKeysDesc(a.weekKey, b.weekKey));
  const latestWeekKey = weeks[0]?.weekKey || '';
  const weekOrder = new Map(weeks.map((record, index) => [record.weekKey, index]));
  const members = new Map();

  for (const record of weeks) {
    for (const buffId of buffIds) {
      const name = normalizeMemberName(record.assignments?.[buffId]);
      if (!name) continue;
      const key = name.toLowerCase();
      let entry = members.get(key);
      if (!entry) {
        entry = { member: name, total: 0, perBuff: {}, lastWeekKey: '', weeksSinceLast: 0 };
        buffIds.forEach((id) => {
          entry.perBuff[id] = 0;
        });
        members.set(key, entry);
      }
      entry.total += 1;
      entry.perBuff[buffId] += 1;
      // Weeks are newest-first, so the first sighting is the most recent one.
      if (!entry.lastWeekKey) {
        entry.lastWeekKey = record.weekKey;
        entry.weeksSinceLast = weekOrder.get(record.weekKey) ?? 0;
      }
    }
  }

  // Fewest buffs first, then longest wait, then name — the order you would read
  // to decide who is next.
  return {
    latestWeekKey,
    weekCount: weeks.length,
    rows: [...members.values()].sort(
      (a, b) =>
        a.total - b.total ||
        b.weeksSinceLast - a.weeksSinceLast ||
        a.member.localeCompare(b.member)
    ),
  };
}

/**
 * Members who have never held a given buff, in fairness order. This is the
 * "who should get this one next" answer, and it deliberately returns everyone
 * rather than picking one — the admin makes the call.
 */
export function candidatesForBuff(fairness, buffId) {
  return fairness.rows.filter((row) => !row.perBuff?.[buffId]).map((row) => row.member);
}

/**
 * The name picker's source list.
 *
 * Alliance View rosters supply the known members, but a throne buff can go to
 * someone outside them — another alliance, a new arrival — so every name that
 * has already appeared in the history is offered too, and free text is always
 * allowed at the call site. `origin` lets the picker show where a name came
 * from without inventing an alliance for a hand-typed one.
 */
export function buildNameSuggestions({ rosterMembers = [], history = [], buffIds = [] } = {}) {
  const byKey = new Map();
  const add = (rawName, origin, alliance = '') => {
    const name = normalizeMemberName(rawName);
    if (!name) return;
    const key = name.toLowerCase();
    // First writer wins: a roster entry keeps its alliance even if the same
    // name also appears in history.
    if (!byKey.has(key)) byKey.set(key, { name, origin, alliance });
  };

  for (const member of rosterMembers) {
    add(member?.name, 'roster', String(member?.alliance || member?.allianceId || ''));
  }
  for (const record of history) {
    for (const buffId of buffIds) {
      add(record?.assignments?.[buffId], 'history');
    }
  }

  // Roster members lead the list; names only ever seen in the history follow.
  const originRank = (origin) => (origin === 'roster' ? 0 : 1);
  return [...byKey.values()].sort(
    (a, b) => originRank(a.origin) - originRank(b.origin) || a.name.localeCompare(b.name)
  );
}

/**
 * Free-text search across the history. Matches member names and reasoning, and
 * returns one row per assignment so the result reads as "who, which buff, when"
 * rather than as a list of weeks to open.
 */
export function searchAssignmentHistory(history, buffIds, query) {
  const needle = String(query || '')
    .trim()
    .toLowerCase();
  if (!needle) return [];
  const hits = [];
  for (const record of Array.isArray(history) ? history : []) {
    if (!isValidWeekKey(record?.weekKey)) continue;
    for (const buffId of buffIds) {
      const member = normalizeMemberName(record.assignments?.[buffId]);
      if (!member) continue;
      const reason = normalizeReason(record.reasons?.[buffId]);
      if (
        member.toLowerCase().includes(needle) ||
        reason.toLowerCase().includes(needle) ||
        buffId.includes(needle)
      ) {
        hits.push({ weekKey: record.weekKey, buffId, member, reason });
      }
    }
  }
  return hits.sort(
    (a, b) => compareWeekKeysDesc(a.weekKey, b.weekKey) || a.buffId.localeCompare(b.buffId)
  );
}

/**
 * Headline numbers for the tab: how much history exists, how full the current
 * week is, and how many distinct people have ever held a buff.
 */
export function summarizeThroneBuffs(history, buffIds, currentWeek) {
  const weeks = (Array.isArray(history) ? history : []).filter((record) =>
    isValidWeekKey(record?.weekKey)
  );
  const members = new Set();
  for (const record of weeks) {
    for (const buffId of buffIds) {
      const name = normalizeMemberName(record.assignments?.[buffId]);
      if (name) members.add(name.toLowerCase());
    }
  }
  const filled = currentWeek ? assignedCount(currentWeek) : 0;
  return {
    weekCount: weeks.length,
    distinctMembers: members.size,
    slotCount: buffIds.length,
    filledSlots: filled,
    openSlots: buffIds.length - filled,
    duplicateMembers: currentWeek ? duplicateMembersInWeek(currentWeek) : [],
  };
}
