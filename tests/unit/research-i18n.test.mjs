import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  auditResearchPack,
  deriveResearchEffectLabel,
  installResearchPackForTests,
  researchEffectText,
  researchNodeText,
  researchSearchText,
  researchTreeText,
} from '../../js/i18n/research/index.js';

const treeA = {
  id: 'tree-a',
  name: 'Rapid Production',
  unlockCondition: 'None',
  primaryResource: 'Only Resources',
  treePages: ['Production'],
  nodes: [{ id: 'node_1', name: 'Rapid Growth', buff: 'Unlock Farm Rapid Production' }],
};

const treeB = {
  id: 'tree-b',
  name: 'Basic Combat',
  unlockCondition: 'Castle 10',
  primaryResource: 'Courage Medals',
  nodes: [{ id: 'node_1', name: 'Hero Training', buff: 'Hero EXP From Marauders' }],
};

const arabicPack = {
  trees: {
    'tree-a': {
      name: 'الإنتاج السريع',
      unlockCondition: 'لا شروط',
      primaryResource: 'الموارد فقط',
      pages: ['الإنتاج'],
    },
    'tree-b': {
      name: 'القتال الأساسي',
      unlockCondition: 'القلعة 10',
      primaryResource: 'ميداليات الشجاعة',
    },
  },
  nodes: {
    'tree-a:node_1': {
      name: 'نمو سريع',
      buff: 'يفتح الإنتاج السريع للمزرعة',
      effects: ['سرعة الإنتاج'],
    },
    'tree-b:node_1': { name: 'تدريب الأبطال', buff: 'خبرة الأبطال من المغيرين' },
  },
};

test('Research display text uses composite tree and node identities without mutating canonical data', () => {
  installResearchPackForTests('ar', arabicPack);

  assert.equal(researchTreeText(treeA, 'name'), 'الإنتاج السريع');
  assert.deepEqual(researchTreeText(treeA, 'pages'), ['الإنتاج']);
  assert.equal(researchNodeText(treeA, treeA.nodes[0], 'name'), 'نمو سريع');
  assert.equal(researchEffectText(treeA, treeA.nodes[0], 'Production speed', 0), 'سرعة الإنتاج');
  assert.equal(researchNodeText(treeB, treeB.nodes[0], 'name'), 'تدريب الأبطال');

  assert.equal(treeA.name, 'Rapid Production');
  assert.equal(treeA.nodes[0].name, 'Rapid Growth');
  assert.equal(treeB.nodes[0].name, 'Hero Training');
});

test('Research search keeps both localized community terms and canonical English terms', () => {
  installResearchPackForTests('ar', arabicPack);
  const searchText = researchSearchText(treeA);

  assert.match(searchText, /الإنتاج السريع/);
  assert.match(searchText, /rapid production/);
  assert.match(searchText, /نمو سريع/);
  assert.match(searchText, /rapid growth/);
});

test('Research derives translated effect labels from localized per-level buff copy', () => {
  assert.equal(
    deriveResearchEffectLabel(
      '+5% \u062f\u062e\u0644 \u0627\u0644\u0625\u0646\u062a\u0627\u062c \u0627\u0644\u0633\u0631\u064a\u0639 \u0641\u064a \u0627\u0644\u0645\u0632\u0631\u0639\u0629 \u0644\u0643\u0644 \u0645\u0633\u062a\u0648\u0649',
      'ar'
    ),
    '\u062f\u062e\u0644 \u0627\u0644\u0625\u0646\u062a\u0627\u062c \u0627\u0644\u0633\u0631\u064a\u0639 \u0641\u064a \u0627\u0644\u0645\u0632\u0631\u0639\u0629'
  );
  assert.equal(
    deriveResearchEffectLabel(
      '\ub808\ubca8\ub2f9 \ub18d\uc7a5 \uc2e0\uc18d \uc0dd\uc0b0 \uc0dd\uc0b0\ub7c9 +5%',
      'kr'
    ),
    '\ub18d\uc7a5 \uc2e0\uc18d \uc0dd\uc0b0 \uc0dd\uc0b0\ub7c9'
  );
});

test('Research pack coverage requires every stable tree and compound node record', () => {
  const complete = auditResearchPack(arabicPack, [treeA, treeB]);
  assert.equal(complete.complete, true);
  assert.deepEqual(complete.missingTrees, []);
  assert.deepEqual(complete.missingNodes, []);

  const incomplete = auditResearchPack(
    { trees: arabicPack.trees, nodes: { 'tree-a:node_1': arabicPack.nodes['tree-a:node_1'] } },
    [treeA, treeB]
  );
  assert.equal(incomplete.complete, false);
  assert.deepEqual(incomplete.missingNodes, ['tree-b:node_1']);
});

test('Research locale load failures remain retryable within the current session', () => {
  const source = readFileSync('js/i18n/research/index.js', 'utf8');
  const failureHandler = source.match(/\.catch\(\(error\) => \{([\s\S]*?)\n\s*\}\)/)?.[1] || '';
  assert.ok(failureHandler, 'locale loader should keep an explicit failure handler');
  assert.doesNotMatch(failureHandler, /packs\.set\(/, 'failed chunks must not be cached');
  assert.match(source, /\.finally\(\(\) => inFlight\.delete\(normalized\)\)/);
});
