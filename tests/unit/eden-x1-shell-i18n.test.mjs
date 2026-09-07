import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  EDEN_X1_SHELL_COPY,
  EDEN_X1_SHELL_LOCALES,
  getEdenX1ShellCopy,
  localizeEdenX1Shell,
} from '../../js/i18n/eden-x1-shell.js';

const EXPECTED_LOCALES = ['en', 'es', 'pt', 'de', 'fr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr', 'it'];

test('Eden X1 standalone shell copy covers all supported locales', () => {
  assert.deepEqual(EDEN_X1_SHELL_LOCALES, EXPECTED_LOCALES);
  const englishKeys = Object.keys(EDEN_X1_SHELL_COPY.en).sort();

  for (const locale of EXPECTED_LOCALES) {
    const copy = getEdenX1ShellCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), englishKeys, `${locale}: shell copy shape`);
    for (const [key, value] of Object.entries(copy)) {
      assert.equal(typeof value, 'string', `${locale}.${key} must be text`);
      assert.ok(value.trim(), `${locale}.${key} must not be empty`);
    }
    if (locale !== 'en') {
      assert.notEqual(copy.seasonSummaryLabel, EDEN_X1_SHELL_COPY.en.seasonSummaryLabel);
      assert.notEqual(copy.voteGuidanceLabel, EDEN_X1_SHELL_COPY.en.voteGuidanceLabel);
    }
  }

  assert.equal(getEdenX1ShellCopy('ko-KR'), EDEN_X1_SHELL_COPY.kr);
  assert.equal(getEdenX1ShellCopy('unsupported'), EDEN_X1_SHELL_COPY.en);
});

test('Eden X1 shell localizer updates title, description, and accessibility attributes', () => {
  const ariaElement = {
    attributes: new Map([['data-eden-x1-shell-aria', 'voteGuidanceLabel']]),
    getAttribute(name) {
      return this.attributes.get(name) || null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
  };
  const titleElement = {
    attributes: new Map([['data-eden-x1-shell-title', 'themeToggleLabel']]),
    getAttribute(name) {
      return this.attributes.get(name) || null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
  };
  const description = {
    content: '',
    setAttribute(name, value) {
      if (name === 'content') this.content = value;
    },
  };
  const documentRef = {
    title: '',
    querySelector(selector) {
      return selector === 'meta[name="description"]' ? description : null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-eden-x1-shell-aria]') return [ariaElement];
      if (selector === '[data-eden-x1-shell-title]') return [titleElement];
      return [];
    },
  };

  assert.equal(localizeEdenX1Shell(documentRef, 'ar'), 'ar');
  assert.equal(documentRef.title, EDEN_X1_SHELL_COPY.ar.documentTitle);
  assert.equal(description.content, EDEN_X1_SHELL_COPY.ar.metaDescription);
  assert.equal(ariaElement.attributes.get('aria-label'), EDEN_X1_SHELL_COPY.ar.voteGuidanceLabel);
  assert.equal(titleElement.attributes.get('title'), EDEN_X1_SHELL_COPY.ar.themeToggleLabel);
});

test('Eden X1 document and live language flow use the isolated shell localization boundary', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../../eden-x1.html', import.meta.url), 'utf8'),
    readFile(new URL('../../js/eden-x1.js', import.meta.url), 'utf8'),
  ]);

  for (const key of [
    'headerLabel',
    'mainLabel',
    'seasonPanelLabel',
    'seasonSummaryLabel',
    'topContributorsLabel',
    'seasonProgressionLabel',
    'sectionNavigationLabel',
    'rewardFlowLabel',
    'teamVotingLabel',
    'voteGuidanceLabel',
    'publicDashboardLabel',
  ]) {
    assert.match(html, new RegExp(`data-eden-x1-shell-aria="${key}"`), `${key} is wired`);
  }
  assert.match(html, /data-eden-x1-shell-title="themeToggleLabel"/);
  assert.match(source, /import \{ localizeEdenX1Shell \} from '.\/i18n\/eden-x1-shell\.js';/);
  assert.match(
    source,
    /function updateTextContent\(lang\)[\s\S]*?localizeEdenX1Shell\(document, lang\)/
  );
  assert.match(
    source,
    /languageSelect[^]*?addEventListener\('change',[^]*?requestEdenX1Language\(nextLang\)/
  );
});
