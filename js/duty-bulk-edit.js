// Pure batch edits for saved duty records (Banners, Pathing, Shield Walls).
// The admin UI selects records and hands them here; saving stays with the
// existing duty save path.
import { compactRegistryName } from './player-registry.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(value) {
  return String(value ?? '').trim();
}

function entryKey(entry) {
  const confirmed = text(entry?.confirmed);
  if (confirmed) return `c:${compactRegistryName(confirmed) || confirmed.toLowerCase()}`;
  const raw = text(entry?.name || entry?.original);
  return raw ? `r:${compactRegistryName(raw) || raw.toLowerCase()}` : '';
}

function recordOrder(a, b) {
  return (
    text(a.date).localeCompare(text(b.date)) ||
    text(a.createdAt).localeCompare(text(b.createdAt)) ||
    text(a.id).localeCompare(text(b.id))
  );
}

export function isDutyDate(value) {
  return DATE_RE.test(text(value));
}

/**
 * Merge several saved duty records of one duty type into one.
 * Entries are concatenated oldest record first and deduplicated by confirmed
 * name (unconfirmed rows by their uploaded name); the first occurrence wins.
 * The merged record keeps the earliest record's id, date and createdAt.
 * Returns null when fewer than two records are given or their types differ.
 * @returns {{record: object, removedIds: string[]} | null}
 */
export function mergeDutyRecords(records, now = new Date().toISOString()) {
  const list = (Array.isArray(records) ? records : []).filter(
    (record) => record && typeof record === 'object'
  );
  if (list.length < 2) return null;
  const type = text(list[0].type);
  if (!type || list.some((record) => text(record.type) !== type)) return null;
  const ordered = list.slice().sort(recordOrder);
  const base = ordered[0];
  const seen = new Set();
  const entries = [];
  ordered.forEach((record) => {
    (Array.isArray(record.entries) ? record.entries : []).forEach((entry) => {
      const key = entryKey(entry);
      if (!key || seen.has(key)) return;
      seen.add(key);
      entries.push({ ...entry });
    });
  });
  const notes = [];
  ordered.forEach((record) => {
    const note = text(record.note);
    if (note && !notes.includes(note)) notes.push(note);
  });
  const gameTime = text(base.gameTime) || text(ordered.find((r) => text(r.gameTime))?.gameTime);
  const record = {
    ...base,
    type,
    date: text(base.date),
    gameTime,
    note: notes.join(' + ').slice(0, 500),
    entries,
    updatedAt: now,
  };
  return { record, removedIds: ordered.slice(1).map((item) => item.id) };
}

// Set the date of the selected records. Returns a new array.
export function setDutyRecordsDate(records, ids, date, now = new Date().toISOString()) {
  const wanted = new Set(ids);
  const value = text(date);
  if (!isDutyDate(value)) return records.slice();
  return records.map((record) =>
    wanted.has(record.id) ? { ...record, date: value, updatedAt: now } : record
  );
}

// Set Main or Banner on every row of the selected records, as an operator
// choice so scoring obeys it. Returns a new array.
export function setDutyRecordsAccountType(
  records,
  ids,
  accountType,
  now = new Date().toISOString()
) {
  if (accountType !== 'main' && accountType !== 'banner') return records.slice();
  const wanted = new Set(ids);
  return records.map((record) =>
    wanted.has(record.id)
      ? {
          ...record,
          entries: (Array.isArray(record.entries) ? record.entries : []).map((entry) => ({
            ...entry,
            accountType,
            accountTypeSource: 'operator',
          })),
          updatedAt: now,
        }
      : record
  );
}
