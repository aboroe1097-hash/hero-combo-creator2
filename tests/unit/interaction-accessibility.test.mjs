import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path) => readFileSync(path, 'utf8');

test('lazy-tab recovery is CSP-safe, announced, localized, and touch-sized', () => {
  const app = readSource('js/app.js');
  const components = readSource('css/components.css');

  assert.doesNotMatch(app, /onclick=["']location\.reload\(\)/i);
  assert.match(app, /function renderTabLoadError\(/);
  assert.match(app, /error\.setAttribute\('role', 'alert'\)/);
  assert.match(app, /retry\.textContent = t\.edenX1Retry/);
  assert.match(app, /retry\.addEventListener\('click', \(\) => window\.location\.reload\(\)\)/);
  assert.match(components, /\.tab-load-error-link\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(components, /\.tab-load-error-link\s*\{[\s\S]*?touch-action:\s*manipulation/);
});

test('Hero Atlas image fallbacks do not depend on blocked inline handlers', () => {
  const source = readSource('js/app-hero-atlas.js');

  assert.doesNotMatch(source, /\sonerror\s*=/i);
  assert.match(source, /img\[data-fallback-src\]/);
  assert.match(source, /container\.addEventListener\([\s\S]*?'error'[\s\S]*?true\s*\)/);
  assert.match(source, /class="rank-img"[\s\S]*?width="36" height="36"/);
  assert.match(source, /class="detail-img"[\s\S]*?width="72" height="72"/);
});

test('admin sign-in and high-value forms expose field and status semantics', () => {
  const template = readSource('tabs/admin.html');
  const dashboard = readSource('js/ocr-dashboard.js');

  assert.match(template, /<form id="dashLoginForm">/);
  assert.match(template, /for="dashLoginUser"[^>]*data-i18n="adminLoginUser"/);
  assert.match(
    template,
    /id="dashLoginUser"[\s\S]*?name="username"[\s\S]*?autocomplete="username"[\s\S]*?required/
  );
  assert.match(template, /for="dashLoginPass"[^>]*data-i18n="adminLoginPass"/);
  assert.match(
    template,
    /id="dashLoginPass"[\s\S]*?name="password"[\s\S]*?autocomplete="current-password"[\s\S]*?required/
  );
  assert.match(template, /id="dashLoginErr"[^>]*role="alert"[^>]*aria-live="assertive"/);
  assert.match(template, /id="dashConductStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(template, /id="dashContributionStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(dashboard, /usernameInput\?\.reportValidity\?\.\(\)/);
  assert.match(dashboard, /passwordInput\?\.reportValidity\?\.\(\)/);
  assert.match(dashboard, /manualPlayerInput\?\.setAttribute\('aria-invalid', 'true'\)/);
});

test('clickable upload zones have keyboard activation and localized accessible names', () => {
  const template = readSource('tabs/admin.html');
  const dashboard = readSource('js/ocr-dashboard.js');

  for (const [id, key] of [
    ['dashDropZone', 'adminUploadDrop'],
    ['dashContributionDropZone', 'adminContributionDropZone'],
    ['dashBannerListDropZone', 'adminBannerDropZone'],
    ['dashPatherListDropZone', 'adminPatherDropZone'],
  ]) {
    assert.match(
      template,
      new RegExp(`id="${id}"[^>]*role="button"[^>]*tabindex="0"[^>]*data-i18n-aria="${key}"`)
    );
  }

  assert.match(dashboard, /drop\.onkeydown = \(event\) =>/);
  assert.match(dashboard, /contributionDrop\.onkeydown = \(event\) =>/);
  assert.match(dashboard, /event\.key !== 'Enter' && event\.key !== ' '/);
});

test('destructive terminal clearing asks before deleting its local history', () => {
  const dashboard = readSource('js/ocr-dashboard.js');
  const clearStart = dashboard.indexOf("const clearLogBtn = $id('dashClearLogBtn')");
  const clearEnd = dashboard.indexOf("$id('dashExportMenuBtn')", clearStart);
  assert.notEqual(clearStart, -1);
  assert.notEqual(clearEnd, -1);
  assert.match(dashboard.slice(clearStart, clearEnd), /window\.confirm/);
  assert.match(dashboard.slice(clearStart, clearEnd), /adminTerminalClear/);
});

test('primary app searches and comment fields have names and accessible labels', () => {
  const index = readSource('index.html');

  for (const id of ['manualHeroSearch', 'generatorHeroSearch', 'techSearchInput']) {
    assert.match(index, new RegExp(`id="${id}"[^>]*name="[^"]+"[^>]*data-i18n-aria=`));
  }
  for (const id of ['commentName', 'commentState', 'commentText']) {
    assert.match(index, new RegExp(`for="${id}"`));
    assert.match(index, new RegExp(`id="${id}"[^>]*name="[^"]+"`));
  }
  assert.match(index, /id="commentState"[^>]*inputmode="numeric"/);
});
