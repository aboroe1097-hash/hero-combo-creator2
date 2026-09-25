// The ?v= stamps that scripts/update-build-metadata.mjs writes must be whole:
// a page that requests "?v=<build>.3.5" misses the service worker's precache
// entry "?v=<build>" and falls through to the network.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { restampAll, STAMP_SOURCE } from '../../scripts/lib/build-stamps.mjs';

test('a dotted legacy stamp is replaced whole, not just its first group', () => {
  assert.equal(
    restampAll('<link href="css/vts-score.css?v=20260924_211945.3.5" />', '20260925_120000'),
    '<link href="css/vts-score.css?v=20260925_120000" />'
  );
  assert.equal(restampAll("import('./a.js?v=14.3.5')", 'B'), "import('./a.js?v=B')");
  assert.equal(restampAll('src="js/a.js?v=old"', 'B'), 'src="js/a.js?v=B"');
  // A trailing sentence period is not part of the stamp.
  assert.equal(restampAll('see x.js?v=old. Then', 'B'), 'see x.js?v=B. Then');
  assert.match('20260924_211945', new RegExp(`^${STAMP_SOURCE}$`));
});

test('the metadata script uses the shared stamp pattern everywhere', () => {
  const script = readFileSync('scripts/update-build-metadata.mjs', 'utf8');
  assert.match(script, /from '\.\/lib\/build-stamps\.mjs'/);
  assert.doesNotMatch(script, /\\\?v=\[0-9A-Za-z_-\]\+/, 'no private copy of the dot-less pattern');
});

test('entry pages request exactly the stamps the service worker precaches', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  const precached = new Map();
  for (const [, url, stamp] of sw.matchAll(/'(\/[^'?]+\.(?:css|js))\?v=([^']+)'/g)) {
    precached.set(url, stamp);
  }
  assert.ok(precached.size > 0, 'the service worker precaches stamped assets');
  const buildStamps = new Set(precached.values());
  assert.equal(buildStamps.size, 1, 'one build stamp across the precache');
  const [buildStamp] = buildStamps;

  for (const page of ['index.html', 'vtsscore.html', 'admin.html', 'profile.html']) {
    const html = readFileSync(page, 'utf8');
    for (const [, url, stamp] of html.matchAll(
      /(?:href|src)="((?:css|js)\/[^"?#]+\.(?:css|js))\?v=([^"]+)"/g
    )) {
      assert.equal(stamp, buildStamp, `${page}: ${url} is stamped with the build`);
      if (precached.has(`/${url}`)) {
        assert.equal(stamp, precached.get(`/${url}`), `${page}: ${url} matches the precache`);
      }
    }
  }
});
