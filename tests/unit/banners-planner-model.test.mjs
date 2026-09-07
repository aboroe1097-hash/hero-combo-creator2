import assert from 'node:assert/strict';
import test from 'node:test';

import { BANNERS, BANNER_IDS } from '../../js/banners-catalog.js';
import {
  bannerUsageTotals,
  createBannerEvent,
  eventSummary,
  normalizeBannerEvent,
  normalizeEventId,
  pilotWorkload,
  unavailableBanners,
} from '../../js/banners-planner-model.js';

test('the banner catalog has 19 entries with unique IDs', () => {
  assert.equal(BANNERS.length, 19, 'catalog has exactly 19 banners');
  assert.equal(BANNER_IDS.length, 19, 'banner IDs has 19 entries');
  assert.equal(new Set(BANNER_IDS).size, 19, 'every banner ID is unique');
  assert.ok(Object.isFrozen(BANNERS), 'BANNERS array is frozen');
  assert.ok(Object.isFrozen(BANNER_IDS), 'BANNER_IDS array is frozen');
  assert.ok(Object.isFrozen(BANNERS[0]), 'BANNERS items are frozen');
});

test('catalog preserves special names, suffixes, and casing verbatim', () => {
  const teresita = BANNERS.find((banner) => banner.id === 'teresita-02');
  assert.ok(teresita, 'teresita-02 banner exists');
  assert.equal(teresita.name, 'Teresita (02)', 'preserves (02) suffix');
  assert.equal(teresita.group, '1097');
  assert.equal(teresita.pilot, 'Redbull');

  const bigBoiie = BANNERS.find((banner) => banner.id === 'big-boiie');
  assert.ok(bigBoiie, 'big-boiie banner exists');
  assert.equal(bigBoiie.name, 'BiG BOiiE', 'preserves mixed casing BiG BOiiE');
  assert.equal(bigBoiie.status, 'Find info');

  const alexKika = BANNERS.find((banner) => banner.id === 'alex-kika');
  assert.ok(alexKika, 'alex-kika banner exists');
  assert.equal(alexKika.name, 'Alex&Kika');
  assert.equal(alexKika.points, '55 points');
});

test('normalizeEventId converts strings into slugs and handles edge cases', () => {
  assert.equal(normalizeEventId('Week 1 # Sunday'), 'week-1-sunday');
  assert.equal(normalizeEventId('  Event---Name__123  '), 'event-name-123');
  assert.equal(normalizeEventId(''), '');
  assert.equal(normalizeEventId(null), '');
  assert.equal(normalizeEventId(undefined), '');
});

test('createBannerEvent constructs a valid event descriptor or returns null', () => {
  const event = createBannerEvent({
    id: 'Week 1 # Sunday',
    label: 'Week 1 Sunday',
    dateIso: '2026-08-16',
  });
  assert.deepEqual(event, {
    id: 'week-1-sunday',
    label: 'Week 1 Sunday',
    dateIso: '2026-08-16',
    assignments: {},
  });

  assert.equal(createBannerEvent({ id: '   ' }), null);
  assert.equal(createBannerEvent(null), null);
  assert.equal(createBannerEvent(), null);
});

test('normalizeBannerEvent drops unknown banner IDs and populates missing ones', () => {
  const raw = {
    id: 'Week 1 # Sunday',
    label: 'Week 1',
    dateIso: '2026-08-16',
    assignments: {
      sarafina: { assigned: '  Sarafino  Prime  ', used: true },
      'not-a-real-banner': { assigned: 'Intruder', used: true },
    },
  };
  const normalized = normalizeBannerEvent(raw, BANNER_IDS);
  assert.equal(normalized.id, 'week-1-sunday');
  assert.equal(normalized.label, 'Week 1');
  assert.equal(normalized.dateIso, '2026-08-16');
  assert.equal(Object.keys(normalized.assignments).length, 19);
  assert.deepEqual(normalized.assignments.sarafina, {
    assigned: 'Sarafino Prime',
    used: true,
  });
  assert.equal('not-a-real-banner' in normalized.assignments, false);
  assert.deepEqual(normalized.assignments['angel-banner'], {
    assigned: '',
    used: false,
  });
});

test('normalizeBannerEvent coerces boolean flags and spreadsheet TRUE literal', () => {
  const raw = {
    id: 'w1',
    assignments: {
      sarafina: { assigned: 'Alice', used: 'TRUE' },
      'angel-banner': { assigned: 'Bob', used: 'FALSE' },
      undead: { assigned: 'Charlie', used: true },
      'amira-zee': { assigned: 'Dana', used: false },
      'zena-banner': { assigned: 'Eve', used: null },
      viper: { assigned: 'x'.repeat(60), used: false },
    },
  };
  const normalized = normalizeBannerEvent(raw, BANNER_IDS);
  assert.equal(normalized.assignments.sarafina.used, true, "'TRUE' literal becomes true");
  assert.equal(normalized.assignments['angel-banner'].used, false, "'FALSE' literal becomes false");
  assert.equal(normalized.assignments.undead.used, true, 'boolean true stays true');
  assert.equal(normalized.assignments['amira-zee'].used, false, 'boolean false stays false');
  assert.equal(normalized.assignments['zena-banner'].used, false, 'null used becomes false');
  assert.equal(normalized.assignments.viper.assigned.length, 40, 'names are capped at 40 chars');
});

test('eventSummary calculates total, assigned, used, and unused arithmetic', () => {
  const event = {
    id: 'w1',
    assignments: {
      sarafina: { assigned: 'Alice', used: true },
      'angel-banner': { assigned: 'Bob', used: false },
      undead: { assigned: 'Charlie', used: true },
      'amira-zee': { assigned: 'Dana', used: false },
      'zena-banner': { assigned: '', used: false },
    },
  };
  const summary = eventSummary(event, BANNER_IDS);
  assert.equal(summary.total, 19);
  assert.equal(summary.assigned, 4);
  assert.equal(summary.used, 2);
  assert.equal(summary.unused, 2);

  const emptySummary = eventSummary(null, BANNER_IDS);
  assert.deepEqual(emptySummary, { total: 19, assigned: 0, used: 0, unused: 0 });
});

test('bannerUsageTotals computes lifetime counts and sorts by timesUsed ascending', () => {
  const events = [
    {
      id: 'event-1',
      assignments: {
        sarafina: { assigned: 'Alice', used: true },
        'angel-banner': { assigned: 'Bob', used: true },
        undead: { assigned: 'Charlie', used: false },
      },
    },
    {
      id: 'event-2',
      assignments: {
        sarafina: { assigned: 'Alice', used: true },
        undead: { assigned: 'Charlie', used: true },
      },
    },
  ];
  const totals = bannerUsageTotals(events, BANNER_IDS);
  assert.equal(totals.length, 19);

  //arafina has timesUsed: 2, lastEventId: 'event-2'
  const sarafinaTotal = totals.find((entry) => entry.bannerId === 'sarafina');
  assert.deepEqual(sarafinaTotal, {
    bannerId: 'sarafina',
    timesAssigned: 2,
    timesUsed: 2,
    lastEventId: 'event-2',
  });

  // angel-banner has timesUsed: 1, lastEventId: 'event-1'
  const angelTotal = totals.find((entry) => entry.bannerId === 'angel-banner');
  assert.deepEqual(angelTotal, {
    bannerId: 'angel-banner',
    timesAssigned: 1,
    timesUsed: 1,
    lastEventId: 'event-1',
  });

  // undead has timesAssigned: 2, timesUsed: 1, lastEventId: 'event-2'
  const undeadTotal = totals.find((entry) => entry.bannerId === 'undead');
  assert.deepEqual(undeadTotal, {
    bannerId: 'undead',
    timesAssigned: 2,
    timesUsed: 1,
    lastEventId: 'event-2',
  });

  // Check sort order: timesUsed ascending, then bannerId ascending
  for (let i = 0; i < totals.length - 1; i++) {
    const current = totals[i];
    const next = totals[i + 1];
    if (current.timesUsed === next.timesUsed) {
      assert.ok(current.bannerId.localeCompare(next.bannerId) <= 0, 'alphabetical order on tie');
    } else {
      assert.ok(current.timesUsed < next.timesUsed, 'ascending timesUsed order');
    }
  }
});

test('pilotWorkload groups by pilot, includes Unassigned, and sorts by timesUsed descending', () => {
  const events = [
    {
      id: 'e1',
      assignments: {
        sarafina: { assigned: 'A', used: true },
        redbull: { assigned: 'B', used: true },
        viper: { assigned: 'C', used: true },
        'ak-banner': { assigned: 'D', used: true },
      },
    },
    {
      id: 'e2',
      assignments: {
        viper: { assigned: 'C', used: true },
        'teresita-02': { assigned: 'E', used: true },
      },
    },
  ];
  const workload = pilotWorkload(events, BANNERS);
  assert.ok(Array.isArray(workload));

  // Redbull has 4 banners in catalog: redbull-banner, viper, teresita-02, oso
  const redbullGroup = workload.find((group) => group.pilot === 'Redbull');
  assert.ok(redbullGroup);
  assert.equal(redbullGroup.banners, 4);
  assert.equal(redbullGroup.timesUsed, 3); // viper (2) + teresita-02 (1)

  // Unassigned pilot bucket for banners with empty pilot
  const unassignedGroup = workload.find((group) => group.pilot === 'Unassigned');
  assert.ok(unassignedGroup);
  assert.ok(unassignedGroup.banners > 0);
  assert.equal(unassignedGroup.timesUsed, 1); // ak-banner used once

  // Workload is sorted by timesUsed descending
  for (let i = 0; i < workload.length - 1; i++) {
    assert.ok(
      workload[i].timesUsed >= workload[i + 1].timesUsed,
      'workload sorted descending by usage'
    );
  }
});

test('unavailableBanners detects banners missing from all events', () => {
  const allExceptMolly = {};
  for (const id of BANNER_IDS) {
    if (id !== 'molly-banner') {
      allExceptMolly[id] = { assigned: 'Someone', used: false };
    }
  }
  const events = [
    { id: 'w1', assignments: allExceptMolly },
    { id: 'w2', assignments: allExceptMolly },
  ];
  const missing = unavailableBanners(events, BANNER_IDS);
  assert.deepEqual(missing, ['molly-banner']);

  const allPresentEvents = [
    {
      id: 'w1',
      assignments: Object.fromEntries(BANNER_IDS.map((id) => [id, { assigned: '', used: false }])),
    },
  ];
  assert.deepEqual(unavailableBanners(allPresentEvents, BANNER_IDS), []);
});

test('every exported function tolerates null and undefined inputs gracefully', () => {
  assert.equal(normalizeEventId(null), '');
  assert.equal(createBannerEvent(null), null);
  assert.deepEqual(normalizeBannerEvent(null, null), {
    id: '',
    label: '',
    dateIso: '',
    assignments: {},
  });
  assert.deepEqual(eventSummary(null, null), {
    total: 0,
    assigned: 0,
    used: 0,
    unused: 0,
  });
  assert.deepEqual(bannerUsageTotals(null, null), []);
  assert.deepEqual(pilotWorkload(null, null), []);
  assert.deepEqual(unavailableBanners(null, null), []);
});
