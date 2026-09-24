// The Competition #12 schedule panel in VTS Admin → 2027 Signups: form values
// ↔ schedule, the order messages, the exact rules payload, the season guard,
// the timeline, and the catalogue keys the panel reads.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COMPETITION_SCHEDULE_DOC_PATH,
  COMPETITION_SCHEDULE_KEYS,
  gameTimeToMillis,
} from '../../js/competition-schedule.js';
import {
  COMPETITION_DEFAULT_TITLE,
  COMPETITION_LEGACY_SEASON_ID,
  COMPETITION_PHASE_LABEL_KEYS,
  COMPETITION_SCHEDULE_FIELDS,
  COMPETITION_SCHEDULE_ORDER,
  COMPETITION_SEASON_ID,
  buildCompetitionSchedulePayload,
  buildCompetitionSeasonStart,
  buildCompetitionTimeline,
  competitionScheduleToFormValues,
  describeCompetitionScheduleError,
  renderCompetitionTimeline,
  saveCompetitionSchedule,
  validateCompetitionScheduleForm,
} from '../../js/competition-schedule-admin.js';
import {
  availableLanguages,
  loadTranslationsForLanguage,
  translations,
} from '../../js/translations.js';

await Promise.all(availableLanguages.map((lang) => loadTranslationsForLanguage(lang)));

const GAME_TIMES = {
  opensAt: ['2026-10-01', '20:00'],
  phase1ClosesAt: ['2026-10-08', '20:00'],
  deadlineAt: ['2026-10-10', '20:00'],
  reuploadOpensAt: ['2026-11-01', '00:00'],
  reuploadClosesAt: ['2026-11-03', '00:00'],
  winnersStartAt: ['2026-11-04', '12:00'],
  winnersEndAt: ['2026-11-11', '12:00'],
};

function formValues(overrides = {}) {
  const instants = {};
  for (const [key, [date, time]] of Object.entries(GAME_TIMES)) instants[key] = { date, time };
  return {
    title: 'Competition #12',
    seasonId: COMPETITION_SEASON_ID,
    ...overrides,
    instants: { ...instants, ...(overrides.instants || {}) },
  };
}

const fallbackT = (_key, vars = {}, fallback = '') =>
  String(fallback).replace(/\{(\w+)\}/g, (match, name) => vars[name] ?? match);

test('the form lists the seven instants in schedule order', () => {
  assert.deepEqual(
    COMPETITION_SCHEDULE_FIELDS.map((field) => field.key),
    [...COMPETITION_SCHEDULE_KEYS]
  );
  assert.deepEqual(
    COMPETITION_SCHEDULE_ORDER.map((rule) => rule.key),
    COMPETITION_SCHEDULE_KEYS.slice(1)
  );
  assert.deepEqual(
    COMPETITION_SCHEDULE_ORDER.map((rule) => rule.previous),
    COMPETITION_SCHEDULE_KEYS.slice(0, -1)
  );
});

test('form values become a normalized schedule in game time', () => {
  const result = validateCompetitionScheduleForm(formValues());
  assert.equal(result.ok, true);
  assert.equal(result.schedule.seasonId, COMPETITION_SEASON_ID);
  assert.equal(result.schedule.title, 'Competition #12');
  assert.equal(result.schedule.opensAt, Date.parse('2026-10-01T18:00:00Z'));
  assert.equal(result.schedule.winnersEndAt, gameTimeToMillis('2026-11-11', '12:00'));

  // An empty title falls back to the default rather than being stored blank.
  const untitled = validateCompetitionScheduleForm(formValues({ title: '   ' }));
  assert.equal(untitled.schedule.title, COMPETITION_DEFAULT_TITLE);

  // And back: a stored document (Timestamps) fills the same inputs.
  const stored = {};
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    const ms = result.schedule[key];
    stored[key] = { toMillis: () => ms };
  }
  const back = competitionScheduleToFormValues({ ...stored, title: 'Comp', seasonId: 'x' });
  assert.equal(back.title, 'Comp');
  for (const [key, [date, time]] of Object.entries(GAME_TIMES)) {
    assert.deepEqual(back.instants[key], { date, time }, key);
  }
  const empty = competitionScheduleToFormValues(null);
  assert.equal(empty.title, COMPETITION_DEFAULT_TITLE);
  assert.deepEqual(empty.instants.opensAt, { date: '', time: '' });
});

test('validation names the field that is missing or breaks the order', () => {
  const missing = validateCompetitionScheduleForm(
    formValues({ instants: { deadlineAt: { date: '2026-10-10', time: '' } } })
  );
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'missing');
  assert.equal(missing.error.field, 'deadlineAt');
  assert.equal(
    describeCompetitionScheduleError(missing.error, fallbackT),
    'Deadline (last edits): enter both a game date and a game time.'
  );

  // Strict pair: phase 1 cannot close the instant registration opens.
  const same = validateCompetitionScheduleForm(
    formValues({ instants: { phase1ClosesAt: { date: '2026-10-01', time: '20:00' } } })
  );
  assert.equal(same.error.code, 'order');
  assert.equal(same.error.field, 'phase1ClosesAt');
  assert.equal(same.error.previous, 'opensAt');
  assert.equal(
    describeCompetitionScheduleError(same.error, fallbackT),
    'Phase 1 closes (no new sign-ups) must be after Registration opens.'
  );

  // Non-strict pair: the deadline may equal phase 1's close but not precede it.
  const equalDeadline = validateCompetitionScheduleForm(
    formValues({ instants: { deadlineAt: { date: '2026-10-08', time: '20:00' } } })
  );
  assert.equal(equalDeadline.ok, true);
  const early = validateCompetitionScheduleForm(
    formValues({ instants: { deadlineAt: { date: '2026-10-08', time: '19:59' } } })
  );
  assert.equal(early.error.code, 'orderSame');
  assert.equal(early.error.field, 'deadlineAt');
  assert.equal(
    describeCompetitionScheduleError(early.error, fallbackT),
    'Deadline (last edits) cannot be before Phase 1 closes (no new sign-ups).'
  );

  const endBeforeStart = validateCompetitionScheduleForm(
    formValues({ instants: { winnersEndAt: { date: '2026-11-04', time: '12:00' } } })
  );
  assert.equal(endBeforeStart.error.field, 'winnersEndAt');

  const longTitle = validateCompetitionScheduleForm(formValues({ title: 'x'.repeat(81) }));
  assert.equal(longTitle.error.code, 'title');
});

test('the schedule always belongs to a real, non-legacy season', () => {
  assert.equal(validateCompetitionScheduleForm(formValues({ seasonId: '' })).error.code, 'season');
  assert.equal(
    validateCompetitionScheduleForm(formValues({ seasonId: 'bad season' })).error.code,
    'season'
  );
  const legacy = validateCompetitionScheduleForm(
    formValues({ seasonId: COMPETITION_LEGACY_SEASON_ID })
  );
  assert.equal(legacy.error.code, 'legacySeason');
  assert.match(describeCompetitionScheduleError(legacy.error, fallbackT), /Competition #12/);
});

test('"Start Competition #12 season" changes only the season id', () => {
  const stored = {
    activeSeason: COMPETITION_LEGACY_SEASON_ID,
    open: false,
    grantDurationMinutes: 240,
    scoringProfileId: 'all-star-boh-2027-v1',
    acceptNewSignups: false,
  };
  const form = {
    activeSeason: 'typed',
    open: true,
    grantDurationMinutes: 720,
    scoringProfileId: 'x',
  };
  assert.deepEqual(buildCompetitionSeasonStart(stored, form), {
    activeSeason: COMPETITION_SEASON_ID,
    open: false,
    grantDurationMinutes: 240,
    scoringProfileId: 'all-star-boh-2027-v1',
    acceptNewSignups: false,
  });
  // A config without a stored profile or grant takes what the form shows, and
  // an absent acceptNewSignups stays absent.
  const partial = buildCompetitionSeasonStart({ activeSeason: COMPETITION_LEGACY_SEASON_ID }, form);
  assert.deepEqual(partial, {
    activeSeason: COMPETITION_SEASON_ID,
    open: true,
    grantDurationMinutes: 720,
    scoringProfileId: 'x',
  });
  assert.notEqual(COMPETITION_SEASON_ID, COMPETITION_LEGACY_SEASON_ID);
  assert.match(COMPETITION_SEASON_ID, /^[A-Za-z0-9_-]{1,80}$/);
});

test('the payload has exactly the keys validAllStarBohCompetitionSchedule() pins', async () => {
  const { schedule } = validateCompetitionScheduleForm(formValues());
  const SERVER = Symbol('serverTimestamp');
  const Timestamp = { fromMillis: (ms) => ({ kind: 'ts', ms }) };
  const payload = buildCompetitionSchedulePayload(schedule, {
    Timestamp,
    serverTimestamp: () => SERVER,
    uid: 'super-1',
  });
  const rules = readFileSync('firestore.rules', 'utf8');
  const validator = rules.match(
    /function validAllStarBohCompetitionSchedule\(\) \{[\s\S]*?\n {4}\}/
  )[0];
  const pinned = validator
    .match(/hasOnly\(\[([\s\S]*?)\]\)/)[1]
    .match(/'([A-Za-z0-9]+)'/g)
    .map((key) => key.slice(1, -1))
    .sort();
  assert.deepEqual(Object.keys(payload).sort(), pinned);
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    assert.deepEqual(payload[key], { kind: 'ts', ms: schedule[key] }, key);
  }
  assert.equal(payload.updatedAt, SERVER);
  assert.equal(payload.updatedBy, 'super-1');
  assert.throws(
    () => buildCompetitionSchedulePayload(schedule, { Timestamp, serverTimestamp: () => SERVER }),
    (error) => error.code === 'session'
  );

  const writes = [];
  const context = {
    db: { kind: 'test' },
    user: { uid: 'super-1' },
    firestore: {
      doc: (_db, path) => ({ path }),
      setDoc: async (ref, value) => writes.push({ path: ref.path, value }),
      Timestamp,
      serverTimestamp: () => SERVER,
    },
  };
  await saveCompetitionSchedule(formValues(), context);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, COMPETITION_SCHEDULE_DOC_PATH);
  await assert.rejects(
    saveCompetitionSchedule(formValues({ seasonId: COMPETITION_LEGACY_SEASON_ID }), context),
    (error) => error.code === 'legacySeason'
  );
  assert.equal(writes.length, 1, 'an invalid schedule never reaches Firestore');
});

test('the timeline marks the current phase and skips empty ones', () => {
  const { schedule } = validateCompetitionScheduleForm(
    formValues({ instants: { deadlineAt: { date: '2026-10-08', time: '20:00' } } })
  );
  const during = gameTimeToMillis('2026-10-02', '09:00');
  const rows = buildCompetitionTimeline(schedule, during);
  assert.deepEqual(
    rows.map((row) => row.phase),
    ['upcoming', 'registration', 'waiting', 'reupload', 'resultsPending', 'winners', 'closed'],
    'the zero-length final check is left out'
  );
  assert.deepEqual(
    rows.filter((row) => row.current).map((row) => row.phase),
    ['registration']
  );
  const html = renderCompetitionTimeline(schedule, fallbackT, during);
  assert.match(html, /is-current" aria-current="step" data-comp-phase="registration"/);
  assert.match(html, /Current phase: Registration/);
  assert.match(html, /2026-10-01 20:00 → 2026-10-08 20:00/);
  assert.match(renderCompetitionTimeline(null, fallbackT), /No schedule saved yet/);
});

test('the panel markup is superadmin-only and sits above the season form', () => {
  const admin = readFileSync('tabs/admin.html', 'utf8');
  const panel = admin.indexOf('id="dashCompScheduleForm"');
  assert.ok(panel > admin.indexOf('id="dashSubtabBohSignups"'));
  assert.ok(panel < admin.indexOf('id="dashBohSignupsSeasonForm"'));
  assert.match(admin, /id="dashCompScheduleForm"[^>]*data-requires-superadmin[^>]*hidden/);
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    assert.match(admin, new RegExp(`type="date" data-comp-schedule-date="${key}"`));
    assert.match(admin, new RegExp(`type="time" step="60" data-comp-schedule-time="${key}"`));
    assert.match(admin, new RegExp(`data-comp-schedule-local="${key}"`));
  }
  assert.match(admin, /id="dashCompScheduleStartSeason"/);
  assert.match(admin, /data-i18n="adminCompScheduleAutoNote"/);

  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(dashboard, /COMPETITION_SCHEDULE_DOC_PATH/);
  assert.match(dashboard, /saveCompetitionSchedule\(/);
  assert.match(dashboard, /showCloudSyncFailure\(err, 'Competition schedule save failed'\)/);
  assert.match(dashboard, /buildCompetitionSeasonStart\(/);
});

test('every panel string is translated in the eleven full admin packs', () => {
  const panelKeys = [
    ...COMPETITION_SCHEDULE_FIELDS.map((field) => field.labelKey),
    ...Object.values(COMPETITION_PHASE_LABEL_KEYS).map(([key]) => key),
    'adminCompScheduleTitle',
    'adminCompScheduleHelp',
    'adminCompScheduleAutoNote',
    'adminCompScheduleLegacyWarning',
    'adminCompScheduleStartSeason',
    'adminCompScheduleStartingSeason',
    'adminCompScheduleSeasonStarted',
    'adminCompScheduleTitleLabel',
    'adminCompScheduleSeasonLabel',
    'adminCompScheduleDateLabel',
    'adminCompScheduleTimeLabel',
    'adminCompScheduleLocalLabel',
    'adminCompScheduleLocal',
    'adminCompScheduleSave',
    'adminCompScheduleSaving',
    'adminCompScheduleSaved',
    'adminCompScheduleTimelineTitle',
    'adminCompScheduleCurrent',
    'adminCompScheduleNone',
    'adminCompScheduleErrorSeason',
    'adminCompScheduleErrorLegacySeason',
    'adminCompScheduleErrorTitle',
    'adminCompScheduleErrorMissing',
    'adminCompScheduleErrorOrder',
    'adminCompScheduleErrorOrderSame',
    'adminCompScheduleErrorInvalid',
  ];
  const tokens = (value) =>
    [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
  for (const key of panelKeys) {
    const english = translations.en[key];
    assert.ok(typeof english === 'string' && english.trim(), `en.${key}`);
    for (const locale of ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
      const value = translations[locale]?.[key];
      assert.ok(typeof value === 'string' && value.trim(), `${locale}.${key}`);
      assert.notEqual(value, english, `${locale}.${key} is a real translation`);
      assert.deepEqual(tokens(value), tokens(english), `${locale}.${key} keeps its tokens`);
    }
  }
  // The legacy warning names the season id verbatim so it can be recognised.
  for (const locale of ['en', 'ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
    assert.match(translations[locale].adminCompScheduleLegacyWarning, /season-2026/);
  }
});
