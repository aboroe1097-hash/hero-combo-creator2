import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const hub = readFileSync(new URL('../../js/eden-hub.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../js/eden-playbook.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../tabs/eden-playbook.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../css/eden-playbook.css', import.meta.url), 'utf8');
const en = readFileSync(new URL('../../js/i18n/en.js', import.meta.url), 'utf8');

test('DrThunder playbook is a lazy Eden Hub subtab with targeted section links', () => {
  assert.match(hub, /'playbook'/);
  assert.match(hub, /loadPlaybook/);
  assert.match(app, /day-0/);
  assert.match(app, /week-1/);
  assert.match(app, /subtab=playbook&section=/);
  assert.match(html, /Massive thanks to DrThunder/);
  assert.match(html, /data-i18n="edenPlaybookCredit"/);
});

test('playbook content is fully localized through the main catalog', () => {
  assert.match(app, /edenPlaybookDay0Task2/);
  assert.match(app, /edenPlaybookWeek1ToolLabel/);
  assert.match(en, /Green Left for Honor buildings/);
  assert.match(en, /Balancing Income & Production/);
  assert.match(en, /edenPlaybookPoisonIntro/);
  assert.match(en, /edenPlaybookRoleDemolitionLi4/);
  assert.match(app, /vts:language-change/);
});

test('playbook days share the two DrThunder route references and Role carries none', () => {
  const sharedVisuals = app.match(/visuals: \[10, 12\]/g) || [];
  assert.equal(sharedVisuals.length, 3);
  assert.match(app, /visuals: \[\],/);
  assert.match(app, /phaseVisuals = images\.length/);
});

test('hub subtab intent prefers the fresh hash over a stale body dataset intent', () => {
  const intentSource = hub.split('function readSubtabIntent')[1]?.split('export function')[0] || '';
  const hashRead = intentSource.indexOf("params.get('subtab')");
  const datasetRead = intentSource.indexOf('dataset?.edenHubSubtab');
  assert.equal(hashRead > -1, true);
  assert.equal(datasetRead === -1 || hashRead < datasetRead, true);
  assert.match(hub, /delete document\.body\.dataset\.edenHubSubtab/);
});

test('playbook ships all optimized visuals and responsive theme contracts', () => {
  for (let index = 3; index <= 12; index += 1) {
    const name = `visual-${String(index).padStart(2, '0')}.webp`;
    assert.equal(
      existsSync(new URL(`../../assets/eden/thunder-playbook/${name}`, import.meta.url)),
      true
    );
  }
  for (const name of [
    'day-0-green-route.webp',
    'day-0-blue-fortresses.webp',
    'poison-legion-example.webp',
    'demolition-specialization.webp',
    'speed-tiling-main.webp',
    'speed-tiling-optional.webp',
    'green-honor.webp',
    'honor-gain-tiling.webp',
    'fortress-unlock.webp',
  ]) {
    assert.equal(
      existsSync(new URL(`../../assets/eden/thunder-playbook/${name}`, import.meta.url)),
      true
    );
  }
  assert.match(html, /demolition-specialization\.webp/);
  assert.match(html, /speed-tiling-main\.webp/);
  assert.match(html, /speed-tiling-optional\.webp/);
  assert.match(html, /green-honor\.webp/);
  assert.match(html, /honor-gain-tiling\.webp/);
  assert.match(html, /fortress-unlock\.webp/);
  assert.match(html, /edenPlaybookAltSpeedOptional/);
  assert.match(en, /Optional 14–20 Blue points/);
  assert.match(en, /Blue Down far enough to unlock and place all four fortresses/);
  assert.match(html, /Tile income and poison-damage targets/);
  assert.match(html, /3,701 · Day 1 target \+22/);
  assert.doesNotMatch(html, /visual-01\.webp/);
  assert.match(html, /poison-legion-example\.webp/);
  assert.match(html, /97% poison damage/);
  assert.match(html, /10K \/ 5K \/ 5K/);
  assert.match(html, /20K \/ 10K \/ 10K/);
  assert.match(html, /Replace the middle hero with Rozen Blade/);
  assert.match(app, /#edenHub\?subtab=loyalty/);
  assert.match(en, /Balancing Income & Production/);
  assert.match(html, /data-playbook-view="timeline"/);
  assert.match(html, /data-playbook-view="tips"/);
  assert.match(html, /💥 31 Blue/);
  assert.match(html, /🏳️ 47 Red/);
  assert.match(html, /🏰 24 Blue/);
  assert.match(html, /Blue demolition specialization route/);
  assert.match(html, /Red banner specialization route/);
  assert.match(html, /Green speed tiling specialization route/);
  assert.match(html, /Green structure Honor specialization route/);
  assert.match(html, /Green tiling Honor specialization route/);
  assert.match(html, /Blue Down fortress unlock specialization route/);
  assert.match(css, /\[data-theme='light'\]/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
