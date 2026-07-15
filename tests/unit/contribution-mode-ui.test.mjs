import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { edenX1ContributionModeCopy } from '../../js/i18n/eden-contribution-mode-copy.js';

test('contribution mode presents Base while preserving the default storage contract', () => {
  const adminTemplate = readFileSync('tabs/admin.html', 'utf8');
  const publicSource = readFileSync('js/eden-x1.js', 'utf8');

  assert.equal(edenX1ContributionModeCopy.adminEdenContributionModeDefault, 'Base');
  assert.equal(edenX1ContributionModeCopy.edenX1ContributionModeDefault, 'Base');
  assert.equal(edenX1ContributionModeCopy.edenX1ContributionModeDefaultScore, 'Base Score');
  assert.equal(
    edenX1ContributionModeCopy.edenX1ContributionModeExcluded,
    'Not counted in Base mode.'
  );
  assert.doesNotMatch(Object.values(edenX1ContributionModeCopy).join('\n'), /\bDefault\b/);

  assert.match(
    adminTemplate,
    /id="dashEdenContributionModeDefault"[\s\S]*?value="default"[\s\S]*?data-i18n="adminEdenContributionModeDefault">Base</
  );
  assert.match(publicSource, /data-eden-contribution-mode="\$\{rankingMode\}"/);
  assert.match(
    publicSource,
    /EDEN_X1_CONTRIBUTION_RANKING_MODES\.DEFAULT[\s\S]*?'edenX1ContributionModeDefault'/
  );
});

test('contribution mode switch owns a stable header grid area', () => {
  const publicSource = readFileSync('js/eden-x1.js', 'utf8');
  const styles = readFileSync('css/eden-x1.css', 'utf8');

  assert.match(
    publicSource,
    /eden-x1-contribution-mode-header[\s\S]*?\$\{options\.modeControls \|\| ''\}[\s\S]*?eden-x1-contribution-mode-tools/
  );
  assert.match(styles, /grid-template-areas:\s*'title modes'\s*'tools tools'/);
  assert.match(
    styles,
    /eden-x1-contribution-mode-header > \.eden-x1-contribution-mode-switch\s*\{[\s\S]*?grid-area: modes;[\s\S]*?justify-self: end;/
  );
  assert.match(
    styles,
    /@media \(max-width: 768px\)[\s\S]*?grid-template-areas:\s*'title'\s*'modes'\s*'tools'/
  );
});
