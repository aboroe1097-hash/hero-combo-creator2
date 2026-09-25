import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

test('the Combos tab is declared as a Beta subtab with its own panel and host', async () => {
  const fragment = await read('tabs/admin.html');
  assert.match(
    fragment,
    /<button class="dash-subtab-btn" data-subtab="combos"><span data-i18n="adminCombosTab">Combos<\/span><span class="tab-badge tab-badge-beta">BETA<\/span><\/button>/
  );
  assert.match(
    fragment,
    /<div class="dash-subtab-panel hidden" id="dashSubtabCombos"><section id="dashCombosRoot"><\/section><\/div>/
  );
  // The nav label is translated where the other admin tabs are, so the eleven
  // locale packs are free to translate it without a code change.
  const english = await read('js/i18n/en.js');
  assert.match(english, /adminCombosTab: 'Combos',/);
});

test('the dashboard mounts the tab lazily with the planner stylesheet', async () => {
  const dashboard = await read('js/ocr-dashboard.js');
  assert.match(dashboard, /if \(name === 'combos'\) void ensureCombosMounted\(\);/);
  assert.match(dashboard, /async function ensureCombosMounted\(\) \{/);
  assert.match(
    dashboard,
    /Promise\.all\(\[\s*import\('\.\/admin-combos\.js'\),\s*import\('\.\.\/css\/admin-combos\.css'\),\s*import\('\.\.\/css\/combos-planner\.css'\),\s*\]\)/
  );
  assert.match(dashboard, /const mount = \$id\('dashCombosRoot'\);/);
  assert.match(dashboard, /module\.renderCombos\(mount\);/);
});

test('the admin host runs the planner interface the local tool runs', async () => {
  const host = await read('js/admin-combos.js');
  assert.match(host, /import \{ mountCombosPlanner \} from '\.\/combos-planner-ui\.js';/);
  assert.match(host, /import \{ buildComboSource, buildView \} from '\.\/combo-plan\.js';/);
  assert.match(host, /mountCombosPlanner\(mount, \{/);
  // Save rebuilds the file in the browser; the download is what ships it.
  assert.match(host, /saveLabel: 'Rebuild combos-db\.js'/);
  assert.match(host, /buildComboSource\(/);
  assert.match(host, /link\.download = 'combos-db\.js';/);
  // The tool reads the raw source the site serves next to the bundled copy.
  assert.match(host, /const SOURCE_URL = 'js\/combos-db\.js';/);
  const postBuild = await read('scripts/post-build.mjs');
  assert.match(postBuild, /'js\/combos-db\.js',/);
  assert.match(postBuild, /'js\/combos-db\.js': 'js\/combos-db\.js',/);
});

test('the planner interface stays scoped to its mount so the dashboard is untouched', async () => {
  const ui = await read('js/combos-planner-ui.js');
  assert.doesNotMatch(ui, /document\.(body|documentElement)/);
  assert.doesNotMatch(ui, /document\.addEventListener/);
  assert.match(ui, /const \$ = \(id\) => root\.querySelector\('#' \+ ID_PREFIX \+ id\);/);
  const css = await read('css/combos-planner.css');
  // Every rule is scoped, and the planner never redefines a site-wide token.
  assert.doesNotMatch(css, /^:root/m);
  assert.doesNotMatch(css, /^body\s*\{/m);
  for (const line of css.split('\n'))
    if (/^[a-zA-Z.#*:[]/.test(line) && !line.startsWith('.combos-planner'))
      assert.fail(`unscoped rule in css/combos-planner.css: ${line.slice(0, 60)}`);
});
