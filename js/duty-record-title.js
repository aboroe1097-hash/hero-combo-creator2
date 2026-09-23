// Optional operator labels on a duty upload (Banners / Pathing / Shield Walls)
// and on a contribution snapshot. A title names one upload ("Raceday 1"); a
// group gathers several uploads under one name ("Race week"). Both are
// optional and can be set or cleared at any time; an upload without a title
// is shown by the day it was uploaded for.

export const DUTY_RECORD_TITLE_MAX = 60;
export const DUTY_RECORD_GROUP_MAX = 40;

function cleanLabel(value, max) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

export function normalizeDutyRecordTitle(value) {
  return cleanLabel(value, DUTY_RECORD_TITLE_MAX);
}

export function normalizeDutyRecordGroup(value) {
  return cleanLabel(value, DUTY_RECORD_GROUP_MAX);
}

// Record dates are stored as YYYY-MM-DD; read them as a calendar day (UTC) so
// the label never shifts a day with the viewer's time zone.
export function formatDutyRecordDay(date, locale) {
  const raw = String(date || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(day.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(day);
  } catch {
    return raw;
  }
}

export function dutyRecordDisplayTitle(record, locale) {
  return normalizeDutyRecordTitle(record?.title) || formatDutyRecordDay(record?.date, locale);
}

export function dutyRecordGroup(record) {
  return normalizeDutyRecordGroup(record?.group);
}

// Distinct group names in first-seen order, compared case-insensitively.
export function collectDutyRecordGroups(records = []) {
  const seen = new Map();
  (Array.isArray(records) ? records : []).forEach((record) => {
    const group = dutyRecordGroup(record);
    if (!group) return;
    const key = group.toLocaleLowerCase();
    if (!seen.has(key)) seen.set(key, group);
  });
  return Array.from(seen.values());
}

export function dutyRecordInGroup(record, group) {
  const target = normalizeDutyRecordGroup(group);
  if (!target) return true;
  return dutyRecordGroup(record).toLocaleLowerCase() === target.toLocaleLowerCase();
}
