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
  assert.match(roster, /renderAccountLinksCard\(\{ open: wasOpen \?\? startOpen \}\)/);
  // Exported and dispatched, or the tab would render nothing.
  assert.match(roster, /export function renderAccountLinks\(\)/);
  assert.match(dashboard, /if \(name === 'accounts'\) renderAccountLinks\(\);/);
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
