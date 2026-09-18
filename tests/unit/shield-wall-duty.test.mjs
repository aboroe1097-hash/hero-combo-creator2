import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { parseDutyEntriesFromText } = await import('../../js/ocr-roster.js');

test('a pasted shield wall list keeps shifts as groups and repeat players per shift', () => {
  const entries = parseDutyEntriesFromText(
    [
      'Morning',
      '- Sarafino',
      '- ANGEL',
      '- Loonly',
      '',
      'Evening:',
      '- Hunter',
      '- Bil',
      '- Sarafino',
      '- WAEL',
      '- Estimator',
      '- uzu',
    ].join('\n')
  );
  assert.deepEqual(
    entries.map(({ name, group }) => [name, group]),
    [
      ['Sarafino', 'Morning'],
      ['ANGEL', 'Morning'],
      ['Loonly', 'Morning'],
      ['Hunter', 'Evening'],
      ['Bil', 'Evening'],
      ['Sarafino', 'Evening'],
      ['WAEL', 'Evening'],
      ['Estimator', 'Evening'],
      ['uzu', 'Evening'],
    ]
  );
});

test('shift headings are recognised with or without a colon', () => {
  for (const heading of ['Night', 'Day shift', 'Shift 2:', 'AFTERNOON']) {
    const entries = parseDutyEntriesFromText(`${heading}\n- Hunter`);
    assert.equal(entries.length, 1, heading);
    assert.equal(entries[0].name, 'Hunter');
  }
});

test('shield wall has the same image upload controls as the other duty lists', () => {
  const markup = readFileSync('tabs/admin.html', 'utf8');
  for (const id of [
    'dashShieldWallUploadBtn',
    'dashShieldWallDropZone',
    'dashShieldWallFileInput',
    'dashShieldWallProgressText',
  ]) {
    assert.match(markup, new RegExp(`id="${id}"`), id);
  }
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(
    dashboard,
    /bindDutyUpload\(\s*'shield_wall',\s*'dashShieldWallPasteBtn',\s*'dashShieldWallUploadBtn',\s*'dashShieldWallDropZone',\s*'dashShieldWallFileInput'\s*\)/
  );
});
