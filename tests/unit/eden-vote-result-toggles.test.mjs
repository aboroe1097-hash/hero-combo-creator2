import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const admin = readFileSync('js/ocr-dashboard.js', 'utf8');
const page = readFileSync('js/eden-x1.js', 'utf8');
const template = readFileSync('tabs/admin.html', 'utf8');
const rules = readFileSync('firestore.rules', 'utf8');
const workspaces = readFileSync('js/eden-workspaces.js', 'utf8');

test('the members ballot and the R4/R5 sheet publish on separate switches', () => {
  // Two switches in the admin; the members' one keeps the original element id so
  // existing selectors and tests still point at the same control.
  assert.match(template, /id="dashEdenVotePublicResultsToggle"/);
  assert.match(template, /id="dashEdenVoteManagementResultsToggle"/);
  assert.match(template, /data-i18n="adminEdenVotesMemberResults"/);
  assert.match(template, /data-i18n="adminEdenVotesManagementResults"/);
  // Each toggle writes its own field.
  assert.match(admin, /\['dashEdenVotePublicResultsToggle', 'showMemberResults'\]/);
  assert.match(admin, /\['dashEdenVoteManagementResultsToggle', 'showManagementResults'\]/);

  // The single switch that preceded them stays the fallback for both, and is
  // still written as the conservative aggregate for older readers.
  assert.match(admin, /const legacyPublished = settings\.showPublicResults === true;/);
  assert.match(
    admin,
    /const readToggle = \(key\) => \(key in settings \? settings\[key\] === true : legacyPublished\);/
  );
  assert.match(admin, /showPublicResults: showMemberResults && showManagementResults,/);
  assert.match(
    page,
    /showPublicResults: readToggle\('showMemberResults'\) && readToggle\('showManagementResults'\),/
  );

  // The management sheet answers to the management switch — the whole reason
  // for the split, since that sheet is not season-scoped.
  assert.match(page, /if \(edenVoteSettings\.showManagementResults !== true\) \{/);
  // The members' ballot answers to the members' switch everywhere it is gated,
  // and no gate is left reading the legacy aggregate.
  assert.doesNotMatch(page, /edenVoteSettings\.showPublicResults !== true/);
  assert.doesNotMatch(page, /verifiedVoteSettings\.showPublicResults/);
  assert.match(page, /verifiedVoteSettings\.showMemberResults !== true/);
  assert.doesNotMatch(
    admin,
    /settings\.showPublicResults === true\s*&&\s*typeof buildEdenX1PublicVoteResults/
  );

  // Rolling a stale season onto a new one starts unpublished on every switch.
  assert.match(
    admin,
    /showMemberResults: false,\s*showManagementResults: false,\s*showPublicResults: false,/
  );

  // Rules accept the two new optional keys, so a document written before the
  // split still validates and a new one carries all three.
  assert.match(rules, /'showMemberResults', 'showManagementResults',/);
  assert.match(
    rules,
    /!\('showMemberResults' in request\.resource\.data\) \|\| request\.resource\.data\.showMemberResults is bool\)/
  );
  assert.match(
    rules,
    /!\('showManagementResults' in request\.resource\.data\) \|\| request\.resource\.data\.showManagementResults is bool\)/
  );
  // The published projection carries them to the public page.
  assert.match(workspaces, /'showMemberResults',\s*'showManagementResults',/);

  // Both locales the page ships carry the copy for the new switch.
  for (const locale of ['en', 'de', 'ar']) {
    const pack = readFileSync(`js/i18n/${locale}.js`, 'utf8');
    assert.match(pack, /adminEdenVotesManagementResultsHint:/, `${locale} has the management hint`);
  }
});
