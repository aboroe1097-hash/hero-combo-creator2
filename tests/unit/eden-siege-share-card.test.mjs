// Share card contract: the shared text line, the procedural drawing, and the
// share/download fallbacks. Canvas, navigator, document and URL are all
// stubbed, so this runs in plain Node.

import assert from 'node:assert/strict';
import test from 'node:test';

import { shareTextFor, renderShareCard, shareRun } from '../../js/eden-siege/ui/share-card.js';

const DATA = {
  title: "Velo's Rampart",
  kicker: 'RUN COMPLETE',
  modeLabel: 'Daily Siege',
  mapLabel: 'The Keep',
  stars: 2,
  score: 1234,
  scoreLabel: 'Score',
  waveLabel: 'Wave',
  wavesCleared: '3 / 10',
  seed: 'keep:2026-09-25',
  footer: 'VTS 1097 · roc-vts.com',
};

/** A 2D context that records every method call and returns safe values. */
function stubContext() {
  const calls = [];
  const target = {};
  const ctx = new Proxy(target, {
    get(state, prop) {
      if (prop in state) return state[prop];
      return (...args) => {
        calls.push({ method: String(prop), args });
        if (prop === 'measureText') return { width: 10 };
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return { addColorStop() {} };
        }
        return undefined;
      };
    },
    set(state, prop, value) {
      state[prop] = value;
      return true;
    },
  });
  return { ctx, calls };
}

function stubCanvas({ withBlob = true } = {}) {
  const { ctx, calls } = stubContext();
  const canvas = {
    width: 0,
    height: 0,
    getContext: (kind) => (kind === '2d' ? ctx : null),
    calls,
  };
  if (withBlob) {
    canvas.toBlob = (callback, type) => callback({ type: type || 'image/png', size: 42 });
  } else {
    canvas.toDataURL = (type) => `data:${type || 'image/png'};base64,stub`;
  }
  return canvas;
}

test('shareTextFor mirrors the run line with formatted score, seed and stars', () => {
  const text = shareTextFor(DATA);
  assert.ok(text.includes(DATA.title), `title missing from: ${text}`);
  assert.ok(text.includes('1,234'), `formatted score missing from: ${text}`);
  assert.ok(text.includes(DATA.seed), `seed missing from: ${text}`);
  assert.ok(text.includes('★★☆'), `star glyphs missing from: ${text}`);
});

test('shareTextFor shows three empty stars at zero and no glyphs without stars', () => {
  assert.ok(shareTextFor({ ...DATA, stars: 0 }).includes('☆☆☆'));
  const bare = shareTextFor({ ...DATA, stars: undefined });
  assert.ok(!/[★☆]/.test(bare), `glyphs leaked into: ${bare}`);
});

test('renderShareCard paints a 1200x630 card with a title and a healthy draw load', () => {
  const canvas = stubCanvas();
  const result = renderShareCard(DATA, canvas);
  assert.equal(result, canvas);
  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 630);
  assert.ok(canvas.calls.length > 20, `only ${canvas.calls.length} draw calls recorded`);
  const title = canvas.calls.find(
    (call) => call.method === 'fillText' && call.args[0] === DATA.title
  );
  assert.ok(title, 'the title must be painted with fillText');
});

test('shareRun shares the card PNG when the Web Share API accepts files', async () => {
  const shared = [];
  const canShareArgs = [];
  const navigatorStub = {
    canShare: (payload) => {
      canShareArgs.push(payload);
      return true;
    },
    share: async (payload) => {
      shared.push(payload);
    },
  };
  const result = await shareRun(DATA, {
    canvasFactory: () => stubCanvas(),
    navigator: navigatorStub,
    document: { createElement: () => assert.fail('no download expected on the shared path') },
  });
  assert.equal(result, 'shared');
  assert.equal(shared.length, 1);
  assert.ok(Array.isArray(shared[0].files) && shared[0].files.length === 1, 'share must get files');
  assert.equal(canShareArgs.length, 1, 'canShare must be consulted first');
});

test('shareRun falls back to saving velo-rampart-run.png when sharing is unavailable', async () => {
  const anchors = [];
  const revoked = [];
  const documentStub = {
    createElement: (tag) => {
      assert.equal(tag, 'a');
      const anchor = {
        href: '',
        download: '',
        clicked: false,
        click() {
          this.clicked = true;
        },
      };
      anchors.push(anchor);
      return anchor;
    },
  };
  const urlStub = {
    createObjectURL: () => 'blob:velo-card',
    revokeObjectURL: (href) => revoked.push(href),
  };
  const result = await shareRun(DATA, {
    canvasFactory: () => stubCanvas(),
    navigator: {},
    document: documentStub,
    URL: urlStub,
  });
  assert.equal(result, 'saved');
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].href, 'blob:velo-card');
  assert.equal(anchors[0].download, 'velo-rampart-run.png');
  assert.ok(anchors[0].clicked, 'the anchor must be clicked');
  assert.deepEqual(revoked, ['blob:velo-card']);
});

test('shareRun saves the card when share() rejects', async () => {
  const anchors = [];
  const result = await shareRun(DATA, {
    canvasFactory: () => stubCanvas(),
    navigator: {
      canShare: () => true,
      share: async () => {
        throw new DOMException('cancelled', 'AbortError');
      },
    },
    document: {
      createElement: () => {
        const anchor = { href: '', download: '', click() {} };
        anchors.push(anchor);
        return anchor;
      },
    },
    URL: { createObjectURL: () => 'blob:velo-card', revokeObjectURL() {} },
  });
  assert.equal(result, 'saved');
  assert.equal(anchors.length, 1);
});

test('shareRun degrades to a data-URL download when toBlob is missing', async () => {
  const anchors = [];
  const result = await shareRun(DATA, {
    canvasFactory: () => stubCanvas({ withBlob: false }),
    navigator: { canShare: () => true, share: async () => assert.fail('no file to share') },
    document: {
      createElement: () => {
        const anchor = { href: '', download: '', click() {} };
        anchors.push(anchor);
        return anchor;
      },
    },
    URL: {
      createObjectURL: () => assert.fail('no blob to wrap'),
      revokeObjectURL: () => assert.fail('no object URL to revoke'),
    },
  });
  assert.equal(result, 'saved');
  assert.equal(anchors[0].href, 'data:image/png;base64,stub');
  assert.equal(anchors[0].download, 'velo-rampart-run.png');
});
