import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  deriveBohMemberScheduleView,
  deriveBohScheduleProgress,
  projectBohPublicationBanner,
  sanitizeBohTeamAccent,
  selectBohScheduleCountdownTarget,
} from '../../js/all-star-boh.js';

const controllerSource = readFileSync('js/all-star-boh.js', 'utf8');
const tabSource = readFileSync('tabs/all-star-boh.html', 'utf8');
const cssSource = readFileSync('css/all-star-boh.css', 'utf8');

const PUBLISHED_SCHEDULE = Object.freeze({
  status: 'published',
  revision: 4,
  eventStartsAt: '2026-08-01T18:00:00.000Z',
  eventEndsAt: '2026-08-01T22:00:00.000Z',
  milestones: Object.freeze([
    Object.freeze({ id: 'opening', label: 'Opening round', startsAt: '2026-08-01T18:00:00.000Z' }),
    Object.freeze({ id: 'final', label: 'Final round', startsAt: '2026-08-01T20:00:00.000Z' }),
  ]),
  teamGameTimes: Object.freeze([]),
});

test('member schedule distinguishes missing fallback, explicit hidden, and published data', () => {
  const fallback = deriveBohMemberScheduleView(null, Date.parse('2026-07-27T00:00:00.000Z'));
  assert.equal(fallback.visible, true);
  assert.equal(fallback.source, 'fallback');
  assert.ok(fallback.ordered.length > 0);

  const hidden = deriveBohMemberScheduleView(
    { status: 'hidden', revision: 9 },
    Date.parse('2026-08-01T19:00:00.000Z')
  );
  assert.deepEqual(hidden, { visible: false, source: 'hidden', phase: 'hidden' });

  const published = deriveBohMemberScheduleView(
    PUBLISHED_SCHEDULE,
    Date.parse('2026-08-01T19:00:00.000Z')
  );
  assert.equal(published.visible, true);
  assert.equal(published.source, 'published');
  assert.equal(published.phase, 'live');
  assert.equal(published.current.id, 'opening');
  assert.equal(published.next.id, 'final');
});

test('schedule progress derives percentage and stage position from existing timestamps', () => {
  const live = deriveBohMemberScheduleView(
    PUBLISHED_SCHEDULE,
    Date.parse('2026-08-01T19:00:00.000Z')
  );
  assert.deepEqual(deriveBohScheduleProgress(live, Date.parse('2026-08-01T19:00:00.000Z')), {
    ratio: 0.25,
    percent: 25,
    current: 1,
    total: 2,
  });

  const ended = deriveBohMemberScheduleView(
    PUBLISHED_SCHEDULE,
    Date.parse('2026-08-01T23:00:00.000Z')
  );
  assert.deepEqual(deriveBohScheduleProgress(ended, Date.parse('2026-08-01T23:00:00.000Z')), {
    ratio: 1,
    percent: 100,
    current: 2,
    total: 2,
  });

  const fallback = deriveBohMemberScheduleView(null, Date.parse('2026-07-27T00:00:00.000Z'));
  assert.equal(deriveBohScheduleProgress(fallback).percent, 0);
  assert.equal(deriveBohScheduleProgress(fallback).current, 1);
});

test('injected schedule time targets the next milestone unless a future milestone is selected', () => {
  const now = Date.parse('2026-08-01T19:00:00.000Z');
  const view = deriveBohMemberScheduleView(PUBLISHED_SCHEDULE, now);
  assert.equal(selectBohScheduleCountdownTarget(view, view.current, false, now).id, 'final');
  assert.equal(selectBohScheduleCountdownTarget(view, view.current, true, now).id, 'final');
  assert.equal(selectBohScheduleCountdownTarget(view, view.next, true, now).id, 'final');

  const afterFinal = deriveBohMemberScheduleView(
    PUBLISHED_SCHEDULE,
    Date.parse('2026-08-01T21:00:00.000Z')
  );
  assert.equal(
    selectBohScheduleCountdownTarget(
      afterFinal,
      afterFinal.current,
      false,
      Date.parse('2026-08-01T21:00:00.000Z')
    ),
    null
  );
});

test('publication banner projection preserves separate safe text fields and revision', () => {
  assert.deepEqual(
    projectBohPublicationBanner({
      eventName: 'VTS Summer Cup',
      title: 'Teams are locked',
      subtitle: 'Six balanced rosters',
      message: '<img src=x onerror=alert(1)>',
      revision: 7,
    }),
    {
      eventName: 'VTS Summer Cup',
      title: 'Teams are locked',
      subtitle: 'Six balanced rosters',
      message: '<img src=x onerror=alert(1)>',
      revision: 7,
    }
  );
  assert.match(controllerSource, /announcement-publication-title[^\n]+title/u);
  assert.match(controllerSource, /announcement-publication-message[^\n]*\);/u);
  const bannerStart = controllerSource.indexOf('function renderPublicationBanner');
  const bannerEnd = controllerSource.indexOf('function revealAnnouncement', bannerStart);
  assert.ok(bannerStart >= 0 && bannerEnd > bannerStart);
  assert.doesNotMatch(controllerSource.slice(bannerStart, bannerEnd), /innerHTML/u);
});

test('team accent accepts only six-digit hex colors', () => {
  assert.equal(sanitizeBohTeamAccent('#12aBcF'), '#12aBcF');
  for (const value of ['red', '#fff', '#12345678', 'url(javascript:alert(1))', ' #123456 ']) {
    assert.equal(sanitizeBohTeamAccent(value), '', value);
  }
});

test('timeline DOM is cached across clock ticks and nested controls resolve through closest', () => {
  assert.match(controllerSource, /signature !== state\.scheduleStructureSignature/u);
  assert.match(
    controllerSource,
    /renderEventScheduleStructure\(state, view, selected, statuses, signature\)/u
  );
  assert.match(controllerSource, /event\.target\?\.closest\?\.\('.boh-team-summary'\)/u);
  assert.match(
    controllerSource,
    /event\.target\?\.closest\?\.\('\[data-role="schedule-milestone"\]'\)/u
  );
  assert.match(controllerSource, /button\.tabIndex = milestone\.id === selected\?\.id \? 0 : -1/u);
  assert.match(
    controllerSource,
    /button\.setAttribute\('aria-controls', 'bohScheduleMilestoneDetail'\)/u
  );
  assert.match(controllerSource, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/u);
});

test('member markup and styles expose a connected reduced-motion-aware timeline and release banner', () => {
  for (const role of [
    'announcement-publication-banner',
    'announcement-publication-event-name',
    'announcement-publication-title',
    'announcement-publication-subtitle',
    'announcement-publication-message',
    'announcement-publication-revision',
    'schedule-selected-status',
    'schedule-progress',
    'schedule-progress-copy',
    'schedule-milestone-detail',
    'schedule-selected-label',
    'schedule-selected-stage',
  ]) {
    assert.match(tabSource, new RegExp(`data-role="${role}"`));
  }
  assert.doesNotMatch(tabSource, /boh-schedule-countdown" aria-live="polite"/u);
  assert.match(cssSource, /--boh-schedule-progress/u);
  assert.match(cssSource, /boh-schedule-progress__fill/u);
  assert.match(cssSource, /boh-schedule-progress__marker/u);
  assert.match(cssSource, /boh-schedule-detail-in/u);
  assert.match(cssSource, /boh-schedule-current-pulse/u);
  assert.match(cssSource, /boh-announcement-reveal/u);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/u);
  assert.match(
    cssSource,
    /@media \(max-width: 620px\)[\s\S]*?boh-schedule-rail[\s\S]*?scroll-snap-type: x mandatory/u
  );
});
