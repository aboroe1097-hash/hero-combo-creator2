import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const eden = read('js/eden-x1.js');
const edenCss = read('css/eden-x1.css');
const page = read('eden-x1.html');

test('Eden X1 blocking layers trap focus and restore the opener', () => {
  assert.match(eden, /function activateEdenX1BlockingLayer\(/);
  assert.match(eden, /function releaseEdenX1BlockingLayer\(/);
  assert.match(eden, /function trapEdenX1BlockingFocus\(/);
  assert.match(eden, /event\.key === 'Escape'[\s\S]*state\.close\?\.\(\)/);
  assert.match(eden, /event\.key !== 'Tab'/);
  assert.match(eden, /last\.focus\(\{ preventScroll: true \}\)/);
  assert.match(eden, /first\.focus\(\{ preventScroll: true \}\)/);
  assert.match(eden, /state\.restoreTarget\.focus\(\{ preventScroll: true \}\)/);
});

test('Eden X1 blocking layers synchronize inert, aria, and body scroll state', () => {
  assert.match(eden, /sibling\.inert = true/);
  assert.match(eden, /sibling\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(eden, /layer\.setAttribute\('aria-hidden', 'false'\)/);
  assert.match(eden, /layer\.setAttribute\('aria-modal', 'true'\)/);
  assert.match(eden, /document\.body\.classList\.add\('eden-x1-overlay-open'\)/);
  assert.match(eden, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(eden, /element\.inert = inert/);
  assert.match(eden, /document\.body\.style\.overflow = state\.bodyOverflow/);
});

test('public modal and phone popovers use the blocking-layer contract', () => {
  assert.match(eden, /id="edenX1PublicModal"[\s\S]*aria-hidden="true" inert[\s\S]*tabindex="-1"/);
  assert.match(eden, /activateEdenX1BlockingLayer\(modal,[\s\S]*close: closePublicModal/);
  assert.match(eden, /releaseEdenX1BlockingLayer\(modal\)/);
  assert.match(
    eden,
    /shouldOpen && isWeightedContributionMobileViewport\(\)[\s\S]*activateEdenX1BlockingLayer\(popover/
  );
  assert.match(
    eden,
    /shouldOpen && isEdenVoteInfoSheetViewport\(\)[\s\S]*activateEdenX1BlockingLayer\(popover/
  );
});

test('Eden X1 light theme preserves primary and inset surface hierarchy', () => {
  const parityStart = edenCss.indexOf('v14 Eden X1 parity completion');
  assert.notEqual(parityStart, -1);
  const parity = edenCss.slice(parityStart);
  assert.match(parity, /\[data-theme='light'\] \.eden-x1-page \{/);
  assert.match(parity, /--frost-void:\s*#f4f7fb/);
  assert.match(parity, /linear-gradient\(160deg, #ffffff 0%, #f8fafc 100%\)/);
  assert.match(parity, /background:\s*#f7f9fc/);
  assert.match(parity, /\.dash-table thead th[\s\S]*background:\s*#eaf0f6/);
  assert.match(parity, /\.dash-weighted-score-popover,[\s\S]*\.dash-modal-content/);
});

test('Eden X1 Arabic layout mirrors controls while isolating numerical data', () => {
  const parity = edenCss.slice(edenCss.indexOf('v14 Eden X1 parity completion'));
  assert.match(parity, /\[dir='rtl'\] \.eden-x1-page,[\s\S]*direction:\s*rtl/);
  assert.match(
    parity,
    /\.dash-search-icon, \.lang-select-icon[\s\S]*right:\s*0\.82rem[\s\S]*left:\s*auto/
  );
  assert.match(parity, /\.dash-modal-close, \.eden-x1-popover-close[\s\S]*inset-inline-end/);
  assert.match(parity, /\.dash-weighted-score-cell,[\s\S]*direction:\s*ltr/);
  assert.match(parity, /unicode-bidi:\s*isolate/);
  assert.match(parity, /\.dash-table :is\(th, td\)[\s\S]*text-align:\s*start !important/);
});

test('the final narrow-phone rule wins the 768px cascade', () => {
  const mobileRepair = edenCss.indexOf('v14 mobile shell repair');
  const narrowPhone = edenCss.lastIndexOf('@media (max-width: 560px)');
  assert.ok(narrowPhone > mobileRepair);
  const finalPhoneCss = edenCss.slice(narrowPhone);
  assert.match(
    finalPhoneCss,
    /padding-bottom:\s*calc\(6\.85rem \+ env\(safe-area-inset-bottom, 0px\)\) !important/
  );
  assert.match(finalPhoneCss, /\.eden-x1-quicknav \{[\s\S]*display:\s*grid !important/);
  assert.match(finalPhoneCss, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(finalPhoneCss, /overflow:\s*hidden !important/);
  assert.match(finalPhoneCss, /\.eden-x1-quicknav-chip \{[\s\S]*width:\s*100% !important/);
});

test('mobile Eden navigation paints Velo before heavy section work and preserves a scroll lane', () => {
  assert.match(page, /id="edenX1NavLoader"[\s\S]*data-vts-loader-context="eden-x1"/);
  assert.match(eden, /function runEdenNavigationTransition\(action\)/);
  assert.match(eden, /requestAnimationFrame\(\(\) => \{[\s\S]*requestAnimationFrame/);
  assert.match(eden, /const minimumMs = 900/);
  assert.match(eden, /data-eden-vote-start/);
  assert.match(edenCss, /\.eden-x1-nav-loader \{/);
  assert.match(edenCss, /touch-action:\s*pan-y/);
});
