import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COMPLAINT_CATEGORIES,
  complaintCategoryLabel,
  filterComplaints,
  openComplaintCount,
  renderComplaintsController,
  sortComplaintsNewestFirst,
} from '../../js/admin-complaints.js';
import { ADMIN_RUNTIME_EN } from '../../js/i18n/admin-runtime-copy.js';

const ADMIN_LOCALES = ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];
const template = readFileSync('tabs/admin.html', 'utf8');
const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

// Only the methods the controller actually calls, so a DOM change in the module
// shows up here as a failure rather than as a silently ignored stub.
function createMount() {
  const nodes = new Map();
  const createNode = () => ({
    innerHTML: '',
    textContent: '',
    dataset: {},
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  });
  const mount = createNode();
  mount.querySelector = (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, createNode());
    return nodes.get(selector);
  };
  return {
    mount,
    shell: () => mount.innerHTML,
    list: () => nodes.get('#dashComplaintsList')?.innerHTML || '',
    status: () => nodes.get('#dashComplaintsStatus'),
  };
}

const ITEMS = [
  {
    id: 'older',
    category: 'bug',
    description: 'Line one\nLine two',
    images: [],
    anonymous: false,
    submittedByName: 'Alpha',
    reviewed: false,
    createdAtMs: 1_700_000_000_000,
  },
  {
    id: 'newer',
    category: 'fair-play',
    description: 'A <script>alert(1)</script> tag in the description',
    images: ['complaints/abc12345/one.jpg'],
    anonymous: true,
    submittedByName: '',
    reviewed: false,
    createdAtMs: 1_750_000_000_000,
  },
  {
    id: 'done',
    category: 'other',
    description: 'Already handled last week.',
    images: [],
    anonymous: false,
    submittedByName: 'Bravo',
    reviewed: true,
    createdAtMs: 1_600_000_000_000,
  },
];

test('the Complaints subtab is superadmin-gated in the nav and the panel', () => {
  assert.match(
    template,
    /<button class="dash-subtab-btn" data-subtab="complaints" data-requires-superadmin hidden><span data-i18n="adminComplaintsTab">Complaints<\/span><\/button>/
  );
  assert.match(
    template,
    /<div class="dash-subtab-panel hidden" id="dashSubtabComplaints"><section id="dashComplaintsRoot"><\/section><\/div>/
  );
  // The empty root is the mount point the lazy controller renders into.
  assert.match(dashboard, /const mount = \$id\('dashComplaintsRoot'\);/);

  // Thumbnails are signed Storage URLs, so the admin page has to allow the
  // origin for images or every screenshot in the inbox is blocked by CSP.
  const adminPage = readFileSync('admin.html', 'utf8');
  const csp =
    adminPage.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || '';
  const imgSrc = csp.match(/img-src\s+([^;]+)/)?.[1] || '';
  assert.match(imgSrc, /https:\/\/firebasestorage\.googleapis\.com/);
  assert.match(csp, /default-src 'self'/);
});

test('the dashboard routes the subtab through the superadmin gate and a lazy chunk', () => {
  assert.match(dashboard, /if \(name === 'complaints'\) void ensureComplaintsMounted\(\);/);
  assert.match(
    dashboard,
    /const SUPERADMIN_DASH_SUBTABS = new Set\(\[[\s\S]*?'complaints',\n\]\);/
  );
  assert.match(
    dashboard,
    /complaintsModulePromise = Promise\.all\(\[\n\s+import\('\.\/admin-complaints\.js'\),\n\s+import\('\.\.\/css\/admin-complaints\.css'\),\n\s+\]\)/
  );
  // Same claim check and same stale-asset recovery the other lazy tabs use.
  assert.match(
    dashboard,
    /async function ensureComplaintsMounted\(\) \{\n\s+if \(!\(await refreshSuperAdminSurfaces\(\)\)\) return;/
  );
  assert.match(dashboard, /void recoverFromStaleAssetGraph\(error\);/);
});

test('the dashboard reads the inbox newest first and writes only the review stamp', () => {
  assert.match(
    dashboard,
    /query\(\n\s+collection\(db, COMPLAINTS_COLLECTION, COMPLAINTS_RECORDS\),\n\s+orderBy\('createdAt', 'desc'\),\n\s+limit\(COMPLAINTS_PAGE_LIMIT\)\n\s+\)/
  );
  assert.match(dashboard, /const COMPLAINTS_COLLECTION = 'complaints';/);
  assert.match(dashboard, /const COMPLAINTS_RECORDS = 'records';/);
  const review = dashboard.match(/async function reviewComplaintRecord[\s\S]*?\n\}/)?.[0] || '';
  assert.ok(review, 'the review writer exists');
  // Exactly the three fields validComplaintReview() allows, nothing else.
  assert.match(review, /reviewed: reviewed === true,/);
  assert.match(review, /reviewedAt: serverTimestamp\(\),/);
  assert.match(review, /reviewedBy: currentAuthUid\(\),/);
  assert.doesNotMatch(review, /description|category|images|submittedBy/);
  // Thumbnails are resolved on demand; no URL is ever part of the document.
  assert.match(dashboard, /async function resolveComplaintImageUrl\(storagePath\)/);
  assert.match(dashboard, /getDownloadURL\(ref\(getStorage\(db\.app\), path\)\)/);
});

test('the list is newest first, hides reviewed filings by default, and counts the open ones', () => {
  const sorted = sortComplaintsNewestFirst(ITEMS);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['newer', 'older', 'done']
  );
  assert.deepEqual(
    filterComplaints(ITEMS, false).map((item) => item.id),
    ['newer', 'older']
  );
  assert.deepEqual(
    filterComplaints(ITEMS, true).map((item) => item.id),
    ['newer', 'older', 'done']
  );
  assert.equal(openComplaintCount(ITEMS), 2);
  assert.equal(openComplaintCount(undefined), 0);
  assert.ok(COMPLAINT_CATEGORIES.includes('fair-play'));
});

test('an anonymous filing is labelled anonymous and shows no author', async () => {
  const { mount, shell, list } = createMount();
  const seen = [];
  const t = (key, vars) => {
    seen.push(key);
    return vars ? `${key}(${Object.values(vars).join(',')})` : key;
  };
  const controller = renderComplaintsController(mount, {
    t,
    listComplaints: async () => ITEMS,
    reviewComplaint: async () => {},
    formatDate: () => '2026-09-23 10:00',
  });
  assert.ok(controller, 'the controller renders');
  assert.match(shell(), /dash-subtab|adminComplaintsTitle/);
  assert.match(shell(), /id="dashComplaintsList"/);
  await controller.reload();
  assert.match(list(), /adminComplaintsAnonymous/);
  assert.match(list(), /adminComplaintsFiledBy\(Alpha\)/);
  // The anonymous row must not leak a stored name even if one was present.
  assert.doesNotMatch(list(), /ShouldNotBeUsed/);
  // Newest first in the rendered order too.
  assert.ok(
    list().indexOf('data-complaint-id="newer"') < list().indexOf('data-complaint-id="older"')
  );
  // A filing is member-authored text: it is escaped, never interpreted.
  assert.doesNotMatch(list(), /<script>alert\(1\)<\/script>/);
  assert.match(list(), /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(list(), /Line one<br \/>Line two/);
  // Reviewed filings stay out of the default view.
  assert.doesNotMatch(list(), /data-complaint-id="done"/);
  assert.equal(openComplaintCount(ITEMS), 2);
  assert.ok(seen.includes('adminComplaintsMarkReviewed'));
  assert.doesNotMatch(list(), /id="dashComplaintsThumb"/);
});

test('showing reviewed filings reveals them with a reviewed stamp', async () => {
  const { mount, list } = createMount();
  const controller = renderComplaintsController(mount, {
    t: (key, vars) => (vars ? `${key}(${Object.values(vars).join(',')})` : key),
    listComplaints: async () => ITEMS,
    reviewComplaint: async () => {},
    formatDate: () => '2026-09-23 10:00',
  });
  await controller.reload();
  controller.setShowReviewed(true);
  assert.match(list(), /data-complaint-id="done"/);
  assert.match(list(), /data-reviewed="true"/);
  assert.match(list(), /adminComplaintsReviewed/);
});

test('a failed read reports itself instead of leaving a blank panel', async () => {
  const { mount, list } = createMount();
  const controller = renderComplaintsController(mount, {
    t: (key) => key,
    listComplaints: async () => {
      throw new Error('permission-denied');
    },
    reviewComplaint: async () => {},
    formatDate: () => '',
  });
  await controller.reload();
  assert.match(list(), /adminComplaintsLoadFailed/);
  assert.match(list(), /role="alert"/);
});

test('every admin complaint string ships in English and all eleven admin packs', async () => {
  const keys = Object.keys(ADMIN_RUNTIME_EN).filter((key) => key.startsWith('adminComplaints'));
  assert.equal(keys.length, 15);
  const placeholders = (value) =>
    [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
  for (const locale of ADMIN_LOCALES) {
    const pack = (await import(`../../js/i18n/admin-runtime/${locale}.js`))[
      `ADMIN_RUNTIME_${locale.toUpperCase()}`
    ];
    for (const key of keys) {
      assert.ok(String(pack[key] ?? '').trim(), `${locale}.${key} must be translated`);
      assert.notEqual(pack[key], ADMIN_RUNTIME_EN[key], `${locale}.${key} must not be English`);
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(ADMIN_RUNTIME_EN[key]),
        `${locale}.${key} placeholders`
      );
    }
  }
  assert.equal(
    complaintCategoryLabel('fair-play', (key) => key),
    'edenX1ComplaintCategoryFairPlay'
  );
  assert.equal(
    complaintCategoryLabel('anything-else', (key) => key),
    'edenX1ComplaintCategoryOther'
  );
  // The category labels are shared with the Eden form rather than duplicated.
  const eden = readFileSync('js/i18n/en.js', 'utf8');
  for (const key of [
    'edenX1ComplaintCategoryBug',
    'edenX1ComplaintCategoryConduct',
    'edenX1ComplaintCategoryFairPlay',
    'edenX1ComplaintCategoryAlliance',
    'edenX1ComplaintCategoryOther',
  ]) {
    assert.match(eden, new RegExp(`${key}:`));
  }
});
