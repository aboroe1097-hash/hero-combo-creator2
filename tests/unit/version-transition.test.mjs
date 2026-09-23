import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPROVED_RELEASE_TRANSITIONS,
  cadenceFailure,
  expectedPreviousVersion,
  normalPreviousVersion,
  patchExceedsReleaseTrain,
  versionMismatch,
} from '../../scripts/check-version-consistency.mjs';

test('the approved 16.0.18 -> 16.5.0 transition is the only cadence exception', () => {
  assert.deepEqual(APPROVED_RELEASE_TRANSITIONS, { '16.5.0': '16.0.18' });
  assert.equal(expectedPreviousVersion('16.5.0'), '16.0.18');
  assert.equal(cadenceFailure('16.5.0', '16.0.18'), null);
});

test('a wrong predecessor or an arbitrary skip still fails', () => {
  assert.match(cadenceFailure('16.5.0', '16.0.17'), /must follow 16\.0\.18/);
  assert.match(cadenceFailure('16.5.0', '16.4.20'), /must follow 16\.0\.18/);
  assert.match(cadenceFailure('16.5.0', '15.0.20'), /must follow 16\.0\.18/);
});

test('normal cadence resumes right after the approved transition', () => {
  assert.equal(expectedPreviousVersion('16.5.1'), '16.5.0');
  assert.equal(expectedPreviousVersion('16.6.0'), '16.5.20');
  assert.equal(cadenceFailure('16.5.1', '16.5.0'), null);
  assert.match(cadenceFailure('16.5.2', '16.5.0'), /must follow 16\.5\.1/);
  assert.equal(normalPreviousVersion('16.5.0'), '16.4.20');
});

test('patch releases beyond 20 and malformed versions stay rejected', () => {
  assert.equal(patchExceedsReleaseTrain('16.5.21'), true);
  assert.equal(patchExceedsReleaseTrain('16.5.20'), false);
  assert.equal(patchExceedsReleaseTrain('16.5.0'), false);
  assert.equal(normalPreviousVersion('v16.5.0'), null);
  assert.equal(normalPreviousVersion('16.5'), null);
  assert.equal(normalPreviousVersion('16.0.0'), null);
  assert.equal(expectedPreviousVersion('16.0.18'), '16.0.17');
});

test('every captured public surface must equal the package version', () => {
  assert.equal(versionMismatch('index.html public footer', '16.5.0', '16.5.0'), null);
  assert.match(
    versionMismatch('index.html public footer', '16.0.18', '16.5.0'),
    /16\.0\.18 != 16\.5\.0/
  );
  assert.match(versionMismatch('README.md heading', undefined, '16.5.0'), /was not found/);
});
