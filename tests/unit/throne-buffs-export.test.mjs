import assert from 'node:assert/strict';
import test from 'node:test';
import { THRONE_BUFFS } from '../../js/throne-buffs-data.js';
globalThis.document = { getElementById: () => null, querySelectorAll: () => [] };
const { renderThroneCardCanvas, wrapThroneText } = await import('../../js/throne-buffs-export.js');

test('PNG rows preserve multilingual names and full notes with nine distinct title icons', () => {
  const calls = [],
    images = [];
  const ctx = {
    font: '',
    measureText: (s) => ({ width: Array.from(s).length * 15 }),
    beginPath() {},
    roundRect() {},
    fill() {},
    stroke() {},
    fillRect() {},
    save() {},
    restore() {},
    fillText(s, x, y) {
      calls.push({ s, x, y, align: this.textAlign });
    },
    drawImage(img, x, y, w, h) {
      images.push({ img, x, y, w, h });
    },
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const prior = globalThis.document;
  globalThis.document = { createElement: () => canvas };
  try {
    const assignments = {},
      reasons = {},
      icons = {};
    THRONE_BUFFS.forEach((buff, i) => {
      assignments[buff.id] = i % 2 ? '玩家名字'.repeat(10) : 'محمد عبدالرحمن'.repeat(3);
      reasons[buff.id] = `Rotation ${i} — `.repeat(14);
      icons[buff.id] = { id: buff.id, naturalWidth: 100, naturalHeight: 120 };
    });
    renderThroneCardCanvas({ weekKey: '2026-W41', assignments, reasons }, { icons });
    assert.equal(images.length, 9);
    assert.equal(new Set(images.map(({ img }) => img.id)).size, 9);
    assert.ok(canvas.height > 1400, 'long notes grow rows rather than truncate');
    assert.ok(
      calls.every(({ y }) => y > 0 && y < canvas.height - 32),
      'content/footer stay inside canvas'
    );
    assert.ok(images.every(({ y, h }) => y + h < canvas.height - 122));
    const printed = calls
      .map(({ s }) => s)
      .join('')
      .replace(/\s/g, '');
    for (const value of [...Object.values(assignments), ...Object.values(reasons)])
      assert.ok(printed.includes(value.replace(/\s/g, '')), value);
    assert.ok(
      calls.some(({ align }) => align === 'right'),
      'Arabic is rendered RTL'
    );
    for (const call of calls.filter(({ s }) => /^[\u4e00-\u9fff]/.test(s)))
      assert.ok(ctx.measureText(call.s).width <= 530);
  } finally {
    globalThis.document = prior;
  }
});

test('wrapping preserves unspaced Unicode text without ellipses', () => {
  const ctx = { measureText: (text) => ({ width: Array.from(text).length * 10 }) };
  const original = '王者😀محمد'.repeat(12);
  const lines = wrapThroneText(ctx, original, 50);
  assert.equal(lines.join(''), original);
  assert.ok(lines.every((line) => ctx.measureText(line).width <= 50));
});
