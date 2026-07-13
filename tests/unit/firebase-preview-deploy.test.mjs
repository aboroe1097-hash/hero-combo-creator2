import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseFirebaseDeployResult } from '../../scripts/deploy-firebase-preview.mjs';

const site = 'abocombo';
const channel = 'v14-0-0';
const now = Date.parse('2026-07-12T00:00:00.000Z');

function deployOutput(overrides = {}) {
  return JSON.stringify({
    status: 'success',
    result: {
      abocombo: {
        site,
        url: 'https://abocombo--v14-0-0-a1b2c3d4.web.app',
        version: 'sites/abocombo/versions/test-version',
        expireTime: '2026-07-19T00:00:00.000Z',
        ...overrides,
      },
    },
  });
}

test('Firebase prerelease deploy is Hosting-only and gated by the full local check', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const config = JSON.parse(readFileSync('firebase.preview.json', 'utf8'));
  const deployScript = readFileSync('scripts/deploy-firebase-preview.mjs', 'utf8');
  const playwrightConfig = readFileSync('playwright.production.config.js', 'utf8');
  const workflowDoc = readFileSync('docs/firebase-preview-workflow.md', 'utf8');

  assert.equal(
    packageJson.scripts['firebase:preview'],
    'npm run check && node scripts/deploy-firebase-preview.mjs'
  );
  assert.equal(packageJson.devDependencies['firebase-tools'], '15.22.4');
  assert.deepEqual(Object.keys(config), ['hosting']);
  assert.equal(config.hosting.site, site);
  assert.equal(config.hosting.public, 'dist');
  assert.equal('firestore' in config, false);
  assert.deepEqual(
    config.hosting.headers.map(({ source, headers }) => [source, headers[0]]),
    [
      ['/', { key: 'Cache-Control', value: 'no-cache' }],
      ['**/*.html', { key: 'Cache-Control', value: 'no-cache' }],
      ['/sw.js', { key: 'Cache-Control', value: 'no-cache' }],
    ]
  );
  assert.match(deployScript, /hosting:channel:deploy/);
  assert.match(deployScript, /'--project'/);
  assert.match(deployScript, /'--config'/);
  assert.match(deployScript, /'firebase\.preview\.json'/);
  assert.match(deployScript, /'--expires'/);
  assert.match(deployScript, /'--non-interactive'/);
  assert.match(deployScript, /'--json'/);
  assert.match(deployScript, /stdio:\s*\['ignore', 'pipe', 'pipe'\]/);
  assert.match(deployScript, /FIREBASE_DEPLOY_TIMEOUT_MS/);
  assert.match(deployScript, /Firebase preview deploy is still running/);
  assert.match(deployScript, /node_modules[\s\S]*firebase-tools[\s\S]*firebase\.js/);
  assert.match(deployScript, /PLAYWRIGHT_BASE_URL/);
  assert.match(deployScript, /'smoke:prod'/);
  assert.doesNotMatch(deployScript, /FIREBASE_PREVIEW_PROJECT/);
  assert.doesNotMatch(deployScript, /shell:\s*true/);
  assert.doesNotMatch(deployScript, /firebase\s+deploy/);
  assert.match(playwrightConfig, /process\.env\.PLAYWRIGHT_BASE_URL/);
  assert.match(playwrightConfig, /remoteBaseURL\s*\?\s*\{\}/);
  assert.match(workflowDoc, /real `abocombo` Auth, Firestore, Analytics, and App Check/);
  assert.match(workflowDoc, /`gh-pages` remains the production source/);
});

test('Firebase JSON result parser accepts only the expected preview site and channel', () => {
  assert.deepEqual(parseFirebaseDeployResult(deployOutput(), { site, channel, now }), {
    expireTime: '2026-07-19T00:00:00.000Z',
    url: 'https://abocombo--v14-0-0-a1b2c3d4.web.app',
  });

  assert.throws(() => parseFirebaseDeployResult('{not-json', { site, channel, now }), /valid JSON/);
  assert.throws(
    () => parseFirebaseDeployResult(deployOutput({ site: 'another-site' }), { site, channel, now }),
    /exactly one Firebase deploy result/
  );
  assert.throws(
    () =>
      parseFirebaseDeployResult(deployOutput({ url: 'https://abocombo.web.app' }), {
        site,
        channel,
        now,
      }),
    /unexpected preview URL/
  );
  assert.throws(
    () =>
      parseFirebaseDeployResult(deployOutput({ url: 'https://abocombo--v14-a1b2.web.app' }), {
        site,
        channel,
        now,
      }),
    /unexpected preview URL/
  );
  assert.throws(
    () =>
      parseFirebaseDeployResult(deployOutput({ expireTime: '2026-07-11T00:00:00.000Z' }), {
        site,
        channel,
        now,
      }),
    /future channel expiry/
  );
  assert.deepEqual(
    parseFirebaseDeployResult(deployOutput({ version: '' }), { site, channel, now }),
    {
      expireTime: '2026-07-19T00:00:00.000Z',
      url: 'https://abocombo--v14-0-0-a1b2c3d4.web.app',
    }
  );
});
