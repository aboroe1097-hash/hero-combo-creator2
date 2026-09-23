import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const roster = readFileSync('js/ocr-roster.js', 'utf8');
const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
const markup = readFileSync('tabs/admin.html', 'utf8');

test('account links have a dedicated tab, reachable from anywhere', () => {
  // The card used to be mounted only inside the three duty tabs.
  assert.match(markup, /data-subtab="accounts"/);
  assert.match(markup, /data-i18n="adminAccountsTab"/);
  assert.match(
    markup,
    /id="dashSubtabAccounts"[\s\S]*?data-account-links-host[\s\S]*?data-account-links-open/
  );
  // The dedicated tab opens the card; the embedded duty-tab cards keep the
  // operator's own open/closed choice.
  assert.match(roster, /const startOpen = host\.hasAttribute\('data-account-links-open'\);/);
  assert.match(
    roster,
    /renderAccountLinksCard\(\{ open: wasOpen \?\? startOpen, showAliases: startOpen \}\)/
  );
  // Exported and dispatched, or the tab would render nothing.
  assert.match(roster, /export function renderAccountLinks\(\)/);
  assert.match(dashboard, /if \(name === 'accounts'\) renderAccountLinks\(\);/);
});

test('the Accounts tab teaches aliases that win over the built-in lists', () => {
  // The owner asked to teach abbreviations: "we call Lady Zubbs just zubs".
  assert.match(roster, /function renderPlayerAliasesSection\(\)/);
  assert.match(roster, /data-player-aliases-form/);
  assert.match(roster, /data-player-alias-input/);
  assert.match(roster, /data-player-alias-canonical/);
  assert.match(roster, /data-player-alias-remove/);
  assert.match(roster, /adminAliasesAdd/);
  assert.match(roster, /adminAliasesRemoveFor/);
  // Teaching aliases is a naming decision, not a linking one: the section stays
  // on the tab that exists for it instead of following the card onto duty tabs.
  assert.match(roster, /options\.showAliases \? renderPlayerAliasesSection\(\) : ''/);
  assert.match(roster, /showAliases: startOpen/);

  // Stored in the player registry, beside the account links, so no rules change
  // is needed and the aliases save and publish with the dashboard data.
  assert.match(roster, /registry\.playerAliases = normalizeTaughtPlayerAliases\(nextAliases\);/);
  assert.match(
    roster,
    /const registry = normalizePlayerRegistry\(state\.playerRegistry \|\| readStoredPlayerRegistry\(\)\);/
  );

  // Re-teaching a spelling replaces what it means, the way relinking an account
  // replaces its owner.
  assert.match(
    roster,
    /const aliasKeyText = compactPlayerIdentity\(alias\) \|\| alias\.toLowerCase\(\);/
  );
  assert.match(
    roster,
    /void savePlayerAliases\(\s*\[\.\.\.others, \{ alias, canonical, createdAt: new Date\(\)\.toISOString\(\) \}\],\s*host\s*\);/
  );
});

test('a link can be a banner, an alt or a real second account', () => {
  // The third class is offered in the card and named in the list.
  assert.match(
    roster,
    /<option value="secondary">\$\{esc\(adminT\('adminAccountLinksSecondary'\)\)\}<\/option>/
  );
  assert.match(roster, /banner: 'adminDutyAccountBanner'/);
  assert.match(roster, /alt: 'adminAccountLinksAlt'/);
  assert.match(roster, /secondary: 'adminAccountLinksSecondary'/);
  // The accounts card is reachable from the duty tabs too, so the type list is
  // built from one map rather than a two-way ternary that would silently call a
  // secondary account a banner.
  assert.doesNotMatch(
    roster,
    /adminT\(type === 'alt' \? 'adminAccountLinksAlt' : 'adminDutyAccountBanner'\)/
  );
});

test('the alias and third-class copy ships in every gated locale', () => {
  for (const locale of ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
    const pack = readFileSync(`js/i18n/${locale}.js`, 'utf8');
    for (const key of [
      'adminAliasesTitle',
      'adminAliasesHint',
      'adminAliasesAlias',
      'adminAliasesAliasPh',
      'adminAliasesCanonical',
      'adminAliasesCanonicalPh',
      'adminAliasesAdd',
      'adminAliasesActive',
      'adminAliasesNone',
      'adminAliasesRemove',
      'adminAliasesRemoveFor',
      'adminAliasesSaved',
      'adminAliasesLocal',
      'adminAliasesSavedLog',
      'adminAccountLinksSecondary',
      'adminDutyWeightsSecondary',
      'scoreBreakdownSecondaryCount',
      'scoreBreakdownSecondarySummary',
    ]) {
      assert.match(pack, new RegExp(`${key}:`), `${locale} has ${key}`);
    }
  }
  // The English pack is the catalog every locale is measured against.
  const pack = readFileSync('js/i18n/en.js', 'utf8');
  for (const key of [
    'adminAliasesTitle',
    'adminAccountLinksSecondary',
    'adminDutyWeightsSecondary',
  ]) {
    assert.match(pack, new RegExp(`${key}:`), `en has ${key}`);
  }
  // hr is a reviewed-partial pack that falls back to English on purpose.
  const hr = readFileSync('js/i18n/hr.js', 'utf8');
  assert.doesNotMatch(hr, /adminAliasesTitle:/);
});

test('every resolvable suggestion can be linked in one action', () => {
  // The rendered list stays short, but the bulk action holds the whole set.
  assert.match(roster, /const ACCOUNT_LINK_SUGGESTION_LIMIT = 16;/);
  assert.match(
    roster,
    /const suggestions = allSuggestions\.slice\(0, ACCOUNT_LINK_SUGGESTION_LIMIT\);/
  );
  assert.match(
    roster,
    /pendingAccountLinkSuggestions = allSuggestions\.filter\(\(item\) => item\.owner\);/
  );
  assert.match(roster, /let pendingAccountLinkSuggestions = \[\];/);

  // One button, with a count, and a confirmation that names the count.
  assert.match(
    roster,
    /data-account-link-accept-all data-count="\$\{pendingAccountLinkSuggestions\.length\}"/
  );
  assert.match(roster, /adminAccountLinksShowingSome/);
  assert.match(roster, /adminAccountLinksLinkAll/);

  // The handler never overwrites a hand-made link and skips duplicates.
  assert.match(
    roster,
    /const acceptAll = event\.target\.closest\('\[data-account-link-accept-all\]'\);/
  );
  assert.match(
    roster,
    /const existingKeys = new Set\(existing\.map\(\(link\) => compactPlayerIdentity\(link\.account\)\)\);/
  );
  assert.match(
    roster,
    /filter\(\(item\) => item\.owner && !existingKeys\.has\(compactPlayerIdentity\(item\.account\)\)\)/
  );
  assert.match(roster, /adminAccountLinksLinkAllConfirm/);
  assert.match(roster, /void saveAccountLinks\(\[\.\.\.existing, \.\.\.additions\], host\);/);
});

test('the Accounts tab copy ships in every gated locale', () => {
  for (const locale of ['en', 'ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
    const pack = readFileSync(`js/i18n/${locale}.js`, 'utf8');
    for (const key of [
      'adminAccountsTab',
      'adminAccountLinksLinkAll',
      'adminAccountLinksLinkAllConfirm',
      'adminAccountLinksShowingSome',
    ]) {
      assert.match(pack, new RegExp(`${key}:`), `${locale} has ${key}`);
    }
  }
});
