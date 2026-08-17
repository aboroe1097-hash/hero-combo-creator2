// js/banners-planner-model.js
// Pure model for the Banners Planner weekly / event scheduling tab.
//
// Models the retired alliance planning sheet. The sheet had a static catalog of
// 19 banners and repeated event blocks ("Week 1 # Sunday", "Week 2 # Tuesday", …),
// each tracking banner assignments and whether a banner was deployed (used).
//
// Banner event assignments are season-scoped (Eden side) and belong to an Eden
// season workspace, while the banner catalog itself is a global alliance fixture.
// Nothing here touches the DOM or Firestore; the admin page owns both.

import { BANNER_IDS } from './banners-catalog.js';

/**
 * Normalizes an event identifier into a slug.
 * Trims input, converts to lowercase, and collapses runs of non-alphanumeric
 * characters into single hyphens. Returns an empty string for blank/nullish inputs.
 */
export function normalizeEventId(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates a blank banner event descriptor.
 * Rejects blank or invalid event IDs by returning null so callers cannot
 * instantiate unaddressable events.
 */
export function createBannerEvent(params = {}) {
  const normalizedId = normalizeEventId(params?.id);
  if (!normalizedId) return null;
  return {
    id: normalizedId,
    label: String(params?.label ?? '').trim(),
    dateIso: String(params?.dateIso ?? '').trim(),
    assignments: {},
  };
}

/**
 * Normalizes an event record against an authoritative banner catalog ID list.
 *
 * Drops unknown banner IDs, fills missing banner IDs with blank entries,
 * normalizes and caps assigned member names at 40 characters, and coerces
 * boolean or legacy spreadsheet `'TRUE'` literals into boolean flags.
 */
export function normalizeBannerEvent(record, bannerIds = BANNER_IDS) {
  const id = normalizeEventId(record?.id);
  const label = String(record?.label ?? '').trim();
  const dateIso = String(record?.dateIso ?? '').trim();
  const source =
    record?.assignments && typeof record.assignments === 'object' ? record.assignments : {};
  const ids = Array.isArray(bannerIds) ? bannerIds : [];
  const assignments = {};

  for (const bannerId of ids) {
    const raw = source[bannerId];
    let rawAssigned = '';
    let rawUsed = false;
    if (raw && typeof raw === 'object') {
      rawAssigned = raw.assigned;
      rawUsed = raw.used;
    } else if (typeof raw === 'string' || typeof raw === 'boolean') {
      rawAssigned = typeof raw === 'string' ? raw : '';
      rawUsed = raw;
    }
    const assigned = String(rawAssigned ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    const used = rawUsed === true || rawUsed === 'TRUE';
    assignments[bannerId] = { assigned, used };
  }

  return {
    id,
    label,
    dateIso,
    assignments,
  };
}

/**
 * Summarizes assignment and usage counts for a single event.
 *
 * Returns total available slots, count of assigned banners, count of used
 * banners, and count of unused assignments (assigned but not deployed).
 */
export function eventSummary(event, bannerIds = BANNER_IDS) {
  const ids = Array.isArray(bannerIds) ? bannerIds : [];
  const total = ids.length;
  if (!event || typeof event !== 'object') {
    return { total, assigned: 0, used: 0, unused: 0 };
  }
  const assignments =
    event.assignments && typeof event.assignments === 'object' ? event.assignments : {};
  let assignedCount = 0;
  let usedCount = 0;

  for (const bannerId of ids) {
    const entry = assignments[bannerId];
    const assignedName = typeof entry === 'object' ? entry?.assigned : entry;
    if (String(assignedName ?? '').trim()) {
      assignedCount++;
    }
    const isUsed =
      typeof entry === 'object'
        ? entry?.used === true || entry?.used === 'TRUE'
        : entry === true || entry === 'TRUE';
    if (isUsed) {
      usedCount++;
    }
  }

  return {
    total,
    assigned: assignedCount,
    used: usedCount,
    unused: Math.max(0, assignedCount - usedCount),
  };
}

/**
 * Aggregates lifetime usage totals per banner across all events.
 *
 * Answers which banners are under-utilized vs heavily deployed, sorted by
 * `timesUsed` ascending, then `bannerId` alphabetically.
 */
export function bannerUsageTotals(events = [], bannerIds = BANNER_IDS) {
  const ids = Array.isArray(bannerIds) ? bannerIds : [];
  const eventList = Array.isArray(events) ? events : [];
  const result = [];

  for (const bannerId of ids) {
    let timesAssigned = 0;
    let timesUsed = 0;
    let lastEventId = '';

    for (const ev of eventList) {
      const entry = ev?.assignments?.[bannerId];
      if (!entry) continue;
      const assignedName = typeof entry === 'object' ? entry.assigned : entry;
      if (String(assignedName ?? '').trim()) {
        timesAssigned++;
      }
      const isUsed =
        typeof entry === 'object'
          ? entry.used === true || entry.used === 'TRUE'
          : entry === true || entry === 'TRUE';
      if (isUsed) {
        timesUsed++;
        lastEventId = normalizeEventId(ev.id) || String(ev.id || '');
      }
    }

    result.push({ bannerId, timesAssigned, timesUsed, lastEventId });
  }

  return result.sort((a, b) => a.timesUsed - b.timesUsed || a.bannerId.localeCompare(b.bannerId));
}

/**
 * Groups banner deployments by assigned pilot to balance pilot workload.
 *
 * Banners with no catalog pilot are grouped under `'Unassigned'`.
 * Sorted by `timesUsed` descending, then `pilot` alphabetically.
 */
export function pilotWorkload(events = [], banners = []) {
  const bannerList = Array.isArray(banners) ? banners : [];
  const eventList = Array.isArray(events) ? events : [];
  const groups = new Map();

  for (const b of bannerList) {
    const rawPilot = String(b?.pilot ?? '').trim();
    const pilot = rawPilot || 'Unassigned';
    if (!groups.has(pilot)) {
      groups.set(pilot, { pilot, banners: 0, bannerIds: [], timesUsed: 0 });
    }
    const group = groups.get(pilot);
    group.banners++;
    if (b?.id) {
      group.bannerIds.push(b.id);
    }
  }

  for (const group of groups.values()) {
    for (const bannerId of group.bannerIds) {
      for (const ev of eventList) {
        const entry = ev?.assignments?.[bannerId];
        if (!entry) continue;
        const isUsed =
          typeof entry === 'object'
            ? entry.used === true || entry.used === 'TRUE'
            : entry === true || entry === 'TRUE';
        if (isUsed) {
          group.timesUsed++;
        }
      }
    }
  }

  return [...groups.values()]
    .map(({ pilot, banners: bannerCount, timesUsed }) => ({
      pilot,
      banners: bannerCount,
      timesUsed,
    }))
    .sort((a, b) => b.timesUsed - a.timesUsed || a.pilot.localeCompare(b.pilot));
}

/**
 * Detects banners that appear in no event's assignments.
 *
 * Ensures banners that are silently missing or dropped from the roster
 * are prominently flagged rather than overlooked.
 */
export function unavailableBanners(events = [], bannerIds = BANNER_IDS) {
  const ids = Array.isArray(bannerIds) ? bannerIds : [];
  if (ids.length === 0) return [];
  const eventList = Array.isArray(events) ? events : [];
  if (eventList.length === 0) return [...ids];

  return ids.filter((bannerId) => {
    return eventList.every((ev) => {
      if (!ev || typeof ev !== 'object' || !ev.assignments) return true;
      return !(bannerId in ev.assignments);
    });
  });
}
