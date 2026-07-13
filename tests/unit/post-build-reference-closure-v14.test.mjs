import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function createPostBuildFixture() {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'post-build-reference-closure-'));
  mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
  mkdirSync(path.join(fixtureRoot, 'dist'), { recursive: true });
  cpSync('scripts/post-build.mjs', path.join(fixtureRoot, 'scripts', 'post-build.mjs'));
  return fixtureRoot;
}

function writeFixtureFile(fixtureRoot, relativePath, contents = '') {
  const filePath = path.join(fixtureRoot, 'dist', relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

function runPostBuild(fixtureRoot) {
  return spawnSync(process.execPath, [path.join(fixtureRoot, 'scripts', 'post-build.mjs')], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
}

test('boot games return to the deployed Arcade lobby', () => {
  const sharedGameShell = readFileSync('games/boot/shared.js', 'utf8');
  assert.match(sharedGameShell, /class="btn ghost nav-back"[^>]*href="\/arcade\.html"/);
  assert.doesNotMatch(sharedGameShell, /class="btn ghost nav-back"[^>]*href="\.\/index\.html"/);
});

test('post-build accepts resolved HTML references and ignores non-file URL attributes', (t) => {
  const fixtureRoot = createPostBuildFixture();
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  writeFixtureFile(fixtureRoot, 'styles/site.css');
  writeFixtureFile(fixtureRoot, 'scripts/app.js');
  writeFixtureFile(fixtureRoot, 'images/logo.png');
  writeFixtureFile(fixtureRoot, 'section/index.html', '<a href="/">Home</a>');
  writeFixtureFile(fixtureRoot, 'tabs/fragment.html', '<img src="images/logo.png" alt="">');
  writeFixtureFile(
    fixtureRoot,
    'tabs/admin.html',
    '<a href="/arcade.html?v=local#prototype">Arcade</a>'
  );
  writeFixtureFile(fixtureRoot, 'arcade.html', '<a href="/">Home</a>');
  writeFixtureFile(
    fixtureRoot,
    'nested/page.html',
    `<!doctype html>
      <link href="../styles/site.css?v=14#theme" rel="stylesheet">
      <script src=../scripts/app.js></script>
      <script>const fake = '<img src="/missing-script-template.png">';</script>
      <style>.fake { background: url('<img src="/missing-style-template.png">'); }</style>`
  );
  writeFixtureFile(
    fixtureRoot,
    'index.html',
    `<!doctype html>
      <!-- <img src="/missing-comment.png"> -->
      <meta content='<img src="/missing-meta-content.png">'>
      <link href="/styles/site.css?v=14#theme" rel="stylesheet">
      <img src="/images/logo.png&#63;v=14&#35;brand" alt="">
      <a href="#anchor">Anchor</a>
      <a href="mailto:test@example.com">Email</a>
      <a href="https://example.com/missing.html">External</a>
      <a href="//cdn.example.com/missing.js">CDN</a>
      <a href="?mode=preview#top">Current page</a>
      <a href="/">Root</a>
      <a href="/section/">Section</a>
      <a href="/section">Section without slash</a>
      <div data-href="/missing-data-attribute.html"></div>
      <template><img src="/images/logo.png"></template>`
  );

  const result = runPostBuild(fixtureRoot);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    result.stdout,
    /Verified \d+ same-origin href\/src references across 6 emitted HTML files/
  );
});

test('post-build rejects missing files and directories without an explicit index', (t) => {
  const fixtureRoot = createPostBuildFixture();
  t.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  mkdirSync(path.join(fixtureRoot, 'dist', 'empty'), { recursive: true });
  writeFixtureFile(fixtureRoot, 'empty.html', 'not a directory index');
  writeFixtureFile(
    fixtureRoot,
    'index.html',
    `<!doctype html>
      <link href="/styles/missing.css?v=14#theme" rel="stylesheet">
      <a href="/empty/">Empty directory</a>
      <a href="/empty">Empty directory without slash</a>`
  );
  writeFixtureFile(
    fixtureRoot,
    'tabs/admin.html',
    `<!doctype html>
      <a href="/missing-link.html">Must validate href</a>
      <img src="/missing-image.png" alt="Must validate src">
      <a href="/arcade.html">Must still validate public Arcade href</a>`
  );

  const result = runPostBuild(fixtureRoot);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unresolved same-origin href\/src references in dist/);
  assert.match(result.stderr, /styles\/missing\.css/);
  assert.match(result.stderr, /empty\/index\.html/);
  assert.match(result.stderr, /tabs\/admin\.html: src="\/missing-image\.png"/);
  assert.match(result.stderr, /tabs\/admin\.html: href="\/arcade\.html"/);
  assert.match(result.stderr, /tabs\/admin\.html: href="\/missing-link\.html"/);
  assert.doesNotMatch(result.stderr, /empty\.html.*exists/i);
});
