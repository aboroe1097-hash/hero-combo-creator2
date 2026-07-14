import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('maintenance mode remains enabled and redirects through the shared entry script', () => {
  const config = read('js/maintenance-config.js');

  assert.match(config, /window\.VTS_MAINTENANCE_MODE\s*=\s*true/);
  assert.match(config, /new URL\('\.\.\/maintenance\.html', scriptUrl\)/);
  assert.match(config, /window\.location\.replace\(maintenanceUrl\.href\)/);
  assert.match(config, /vts_maintenance_bypass/);
});

test('every deployed public HTML entry is covered by the maintenance gate', () => {
  const rootEntries = ['index.html', 'admin.html', 'eden-x1.html', 'arcade.html'];
  const gameEntries = [
    'games/boot/b-merge-rush.html',
    'games/boot/c-sort-hoard.html',
    'games/boot/e-crystal-relay.html',
    'games/boot/f-set-assembly.html',
    'games/boot/h-hero-rumble.html',
  ];

  for (const path of rootEntries) {
    assert.match(read(path), /<script src="js\/maintenance-config\.js\?v=[^"]+"><\/script>/);
  }
  for (const path of gameEntries) {
    assert.match(read(path), /<script src="\.\.\/\.\.\/js\/maintenance-config\.js"><\/script>/);
  }
  assert.match(read('public/404.html'), /<script src="\/js\/maintenance-config\.js"><\/script>/);
  assert.match(read('vite.config.js'), /maintenance:\s*resolve\(__dirname, 'maintenance\.html'\)/);
});

test('maintenance destination is standalone, accessible, and optimized', () => {
  const page = read('maintenance.html');

  assert.match(page, /aria-labelledby="maintenanceTitle"/);
  assert.match(page, /aria-describedby="maintenanceMessage"/);
  assert.match(page, /role="status"/);
  assert.match(page, /images\/logo-120\.webp/);
  assert.match(page, /assets\/velo\/velo-body\.webp/);
  assert.match(page, /assets\/velo\/velo-helmet\.webp/);
  assert.match(page, /@keyframes maintenance-velo-patrol/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(page, /maintenance-config\.js/);
});
