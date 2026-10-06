import assert from 'node:assert/strict';
import test from 'node:test';

import { fitText, measurePoster, wrapText } from '../../js/eden-top20-poster.js';

// A fixed-width fake: every character measures 10px, so widths are predictable.
const ctx = { font: '', measureText: (text) => ({ width: Array.from(String(text)).length * 10 }) };

const model = (hallOfFame = null) => ({
  rows: Array.from({ length: 20 }, (_, index) => ({ rank: index + 1, name: `P${index}` })),
  hallOfFame,
});

test('fitText keeps text that fits and ellipsises text that does not', () => {
  assert.equal(fitText(ctx, 'Loony', 100), 'Loony');
  assert.equal(fitText(ctx, 'Guild Master Reward', 100), 'Guild Mas…');
  // Emoji and other astral characters are never split in half.
  assert.equal(fitText(ctx, '🐍Anne🐍🐍🐍', 50), '🐍Ann…');
});

test('wrapText caps the line count and marks the cut', () => {
  const lines = wrapText(ctx, 'one two three four five six', 90, 2);
  assert.equal(lines.length, 2);
  assert.equal(lines[0], 'one two');
  assert.match(lines[1], /…$/);
});

test('the poster grows to fit a Hall of Fame and stays shorter without one', () => {
  const plain = measurePoster(ctx, model());
  const withHall = measurePoster(
    ctx,
    model({
      title: 'Hall of Fame',
      copy: 'Thank you.',
      entries: [{ name: 'REDBULLS', tag: 'R4', detail: 'Skipped premium tier' }],
    })
  );
  assert.ok(withHall > plain + 150, `${withHall} vs ${plain}`);
  assert.equal(measurePoster(ctx, model({ entries: [] })), plain);
});
