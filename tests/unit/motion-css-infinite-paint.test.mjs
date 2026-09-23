import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectInfinitePaintAnimations,
  newInfinitePaintAnimations,
} from '../../scripts/check-motion-css.mjs';

test('no new infinite paint animations beyond the recorded baseline', () => {
  const violations = collectInfinitePaintAnimations();
  const fresh = newInfinitePaintAnimations(violations);
  assert.deepEqual(
    fresh.map((violation) => `${violation.file}:${violation.keyframes}`),
    [],
    'an infinite animation that repaints needs to be finite, compositor-only, or baselined in scripts/check-motion-css.mjs'
  );
});
