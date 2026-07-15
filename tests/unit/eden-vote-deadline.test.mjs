import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  fromEdenVoteDatetimeLocal,
  getEdenVoteCountdownParts,
  isEdenVoteDeadlineExpired,
  normalizeEdenVoteClosesAt,
  toEdenVoteDatetimeLocal,
} from '../../js/eden-vote-deadline.js';

test('vote deadlines accept only canonical ISO timestamps', () => {
  const deadline = '2026-07-11T18:30:00.000Z';
  assert.equal(normalizeEdenVoteClosesAt(deadline), deadline);
  assert.equal(normalizeEdenVoteClosesAt(''), '');
  assert.equal(normalizeEdenVoteClosesAt('2026-07-11T18:30:00Z'), '');
  assert.equal(normalizeEdenVoteClosesAt('2026-02-30T18:30:00.000Z'), '');
  assert.equal(normalizeEdenVoteClosesAt({ seconds: 1 }), '');
});

test('datetime-local admin values round-trip through the browser timezone', () => {
  const localValue = '2026-07-11T18:30';
  const closesAt = fromEdenVoteDatetimeLocal(localValue);
  assert.equal(closesAt, new Date(localValue).toISOString());
  assert.equal(toEdenVoteDatetimeLocal(closesAt), localValue);
  assert.equal(fromEdenVoteDatetimeLocal(''), '');
  assert.equal(fromEdenVoteDatetimeLocal('2026-02-30T18:30'), '');
});

test('countdown parts and expiry use the exact deadline boundary', () => {
  const deadline = '2026-07-13T03:04:05.000Z';
  const now = Date.parse('2026-07-11T00:00:00.000Z');
  assert.deepEqual(getEdenVoteCountdownParts(deadline, now), {
    deadlineMs: Date.parse(deadline),
    remainingSeconds: 183_845,
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
  });
  assert.equal(isEdenVoteDeadlineExpired(deadline, Date.parse(deadline) - 1), false);
  assert.equal(isEdenVoteDeadlineExpired(deadline, Date.parse(deadline)), true);
  assert.equal(isEdenVoteDeadlineExpired('', Date.parse(deadline)), false);
});

test('admin, public UI, and Firestore rules share vote settings contracts', () => {
  const admin = readFileSync('js/ocr-dashboard.js', 'utf8');
  const publicPage = readFileSync('js/eden-x1.js', 'utf8');
  const template = readFileSync('tabs/admin.html', 'utf8');
  const rules = readFileSync('firestore.rules', 'utf8');

  assert.match(admin, /closesAt: normalizeEdenVoteClosesAt\(settings\.closesAt\)/);
  assert.match(admin, /dashEdenVoteClosesAtInput/);
  assert.match(admin, /deadlineInput\?\.addEventListener\('change', persistDeadline\)/);
  assert.match(admin, /edenX1VoteSettingsSaveQueue = edenX1VoteSettingsSaveQueue\.then/);
  assert.match(template, /id="dashEdenVoteClosesAtInput"[\s\S]*?type="datetime-local"/);
  assert.match(template, /id="dashEdenVoteSaveDeadlineBtn"/);
  assert.match(template, /id="dashEdenVoteClearDeadlineBtn"/);
  assert.match(publicPage, /role="timer"/);
  assert.match(publicPage, /window\.setInterval\([\s\S]*?1000\)/);
  assert.match(publicPage, /if \(isEdenVoteSubmissionClosed\(\)\)/);
  assert.match(
    rules,
    /'showVoterNames', 'contributionRankingMode', 'closesAt', 'updatedAt', 'updatedBy'/
  );
  assert.match(rules, /request\.resource\.data\.closesAt\.matches/);
  assert.match(admin, /contributionRankingMode: normalizeEdenX1ContributionRankingMode/);
  assert.match(admin, /input\[name="edenContributionRankingMode"\]/);
  assert.match(template, /id="dashEdenContributionModeExtended"/);
  assert.match(template, /id="dashEdenContributionModeDefault"/);
  assert.match(
    publicPage,
    /getContributionRewardRows\(mode = authoritativeContributionRankingMode\(\)\)/
  );
  assert.match(publicPage, /data-eden-contribution-mode/);
  assert.match(
    rules,
    /request\.resource\.data\.contributionRankingMode in \['extended', 'default'\]/
  );
});

test('all supported locales include deadline controls and countdown copy', async () => {
  const localeCodes = ['ar', 'de', 'en', 'es', 'fr', 'id', 'kr', 'pt', 'ru', 'tr', 'zh'];
  const requiredKeys = [
    'adminEdenVotesDeadline',
    'adminEdenVotesDeadlineHint',
    'adminEdenVotesSaveDeadline',
    'adminEdenVotesClearDeadline',
    'adminEdenVotesDeadlineNone',
    'adminEdenVotesDeadlineScheduled',
    'adminEdenVotesDeadlineExpired',
    'adminEdenVotesDeadlineInvalid',
    'edenX1VoteCountdown',
    'edenX1VoteCountdownClock',
    'edenX1VoteCountdownDays',
    'edenX1VoteDeadlineTitle',
    'edenX1VoteExpired',
    'edenX1VoteClosedShort',
  ];
  requiredKeys.push(
    'adminEdenContributionModeTitle',
    'adminEdenContributionModeHint',
    'adminEdenContributionModeExtended',
    'adminEdenContributionModeDefault',
    'adminEdenContributionModeActive',
    'edenX1ContributionModeExtended',
    'edenX1ContributionModeDefault',
    'edenX1ContributionModeActive',
    'edenX1ContributionModeComparison',
    'edenX1ContributionModeExtendedMeta',
    'edenX1ContributionModeDefaultMeta',
    'edenX1ContributionModeDefaultScore',
    'edenX1ContributionModeExcluded',
    'edenX1ContributionModeAria'
  );

  for (const localeCode of localeCodes) {
    const dictionary = (await import(`../../js/i18n/${localeCode}.js`)).default;
    for (const key of requiredKeys) {
      assert.equal(typeof dictionary[key], 'string', `${localeCode}.${key} must be translated`);
      assert.ok(dictionary[key].trim(), `${localeCode}.${key} must not be empty`);
    }
  }
});
