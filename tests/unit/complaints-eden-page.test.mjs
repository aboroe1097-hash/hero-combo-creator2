import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  EDEN_COMPLAINT_CATEGORIES,
  EDEN_COMPLAINT_MAX_DESCRIPTION,
  EDEN_COMPLAINT_MAX_IMAGES,
  EDEN_COMPLAINT_MAX_IMAGE_EDGE,
  buildComplaintDocument,
  buildComplaintImagePath,
  complaintImageFileName,
  isAcceptedComplaintImage,
  isComplaintImageName,
  resizeComplaintImage,
  validateComplaintDraft,
} from '../../js/eden-complaints.js';
import { EDEN_X1_SHELL_COPY, EDEN_X1_SHELL_LOCALES } from '../../js/i18n/eden-x1-shell.js';
import en from '../../js/i18n/en.js';
import { ADMIN_RUNTIME_EN } from '../../js/i18n/admin-runtime-copy.js';

const MAIN_LOCALES = ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];
const page = readFileSync('eden-x2.html', 'utf8');
// The pack loaders are dynamic imports inside js/translations.js; importing the
// modules directly keeps this test free of the browser-only module graph.
const packs = Object.fromEntries(
  await Promise.all(
    MAIN_LOCALES.map(async (locale) => [
      locale,
      (await import(`../../js/i18n/${locale}.js`)).default,
    ])
  )
);

test('an anonymous filing is built without any identity field', () => {
  const anonymous = buildComplaintDocument({
    category: 'conduct',
    description: '  A member ignored the duty roster twice this week.  ',
    images: ['complaints/abc12345/image.jpg'],
    anonymous: true,
    name: 'ShouldNotBeUsed',
    uid: 'uid-should-not-be-used',
  });
  assert.deepEqual(Object.keys(anonymous).sort(), [
    'anonymous',
    'category',
    'description',
    'images',
    'reviewed',
  ]);
  assert.equal(anonymous.anonymous, true);
  assert.equal(anonymous.reviewed, false);
  assert.equal(anonymous.description, 'A member ignored the duty roster twice this week.');
  assert.ok(!('submittedBy' in anonymous));
  assert.ok(!('submittedByName' in anonymous));

  const named = buildComplaintDocument({
    category: 'alliance',
    description: 'The same three players were skipped from the reward list.',
    images: [],
    anonymous: false,
    name: '  Alpha  ',
    uid: 'anon-uid-1',
  });
  assert.equal(named.submittedBy, 'anon-uid-1');
  assert.equal(named.submittedByName, 'Alpha');
  assert.equal(named.anonymous, false);
});

test('a client-side draft is rejected before it can reach the rules', () => {
  const base = { description: 'A long enough description.', anonymous: true, name: '', images: [] };
  assert.equal(validateComplaintDraft(base), '');
  assert.equal(
    validateComplaintDraft({ ...base, description: 'too short' }),
    'edenX1ComplaintErrDescription'
  );
  assert.equal(
    validateComplaintDraft({
      ...base,
      description: 'x'.repeat(EDEN_COMPLAINT_MAX_DESCRIPTION + 1),
    }),
    'edenX1ComplaintErrDescription'
  );
  assert.equal(
    validateComplaintDraft({ ...base, images: new Array(EDEN_COMPLAINT_MAX_IMAGES + 1).fill({}) }),
    'edenX1ComplaintErrImages'
  );
  // A named filing has to name the member; an anonymous one never asks.
  assert.equal(
    validateComplaintDraft({ ...base, anonymous: false, name: '   ' }),
    'edenX1ComplaintErrName'
  );
  assert.equal(validateComplaintDraft({ ...base, anonymous: false, name: 'Alpha' }), '');
});

test('the category list on the page is the enum the rules validate', () => {
  const select = page.match(/<select id="edenX1ComplaintCategory"[\s\S]*?<\/select>/)?.[0];
  assert.ok(select, 'the category select exists');
  const values = [...select.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(values, [...EDEN_COMPLAINT_CATEGORIES]);
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.ok(
    rules.includes(`d.category in [${EDEN_COMPLAINT_CATEGORIES.map((v) => `'${v}'`).join(', ')}]`),
    'the rules accept exactly the categories the form offers'
  );
});

test('a generated upload path satisfies both the client rules and the storage rules', () => {
  const complaintId = 'kR3nQ1xT9pLmZ4vB7wYc'; // 20 characters, a Firestore auto id
  const { owner, name } = complaintImageFileName(complaintId, 2, 1_750_000_000_000, 'abc123def456');
  assert.equal(owner, complaintId);
  assert.ok(isComplaintImageName(name), `${name} is a storable name`);
  const path = buildComplaintImagePath(owner, name);
  // Copied from the two rules files: the pattern is the contract, not a copy of
  // the client's own idea of it.
  assert.match(path, /^complaints\/[A-Za-z0-9]{20}\/[A-Za-z0-9_-]{1,150}\.(jpg|jpeg|png|webp)$/);
  // The first segment is the filing's own id, so no uid ever reaches Storage.
  assert.ok(path.startsWith(`complaints/${complaintId}/`), 'screenshots live under the filing');
  assert.ok(!isComplaintImageName(`${name}.exe`));
  assert.ok(!isComplaintImageName(`../../${name}`));
  // A device filename with spaces or unicode never survives into the path.
  assert.ok(!isComplaintImageName('my screenshot (1).jpg'));
});

test('only image files are accepted as attachments', () => {
  assert.equal(isAcceptedComplaintImage({ type: 'image/png', name: 'a.png' }), true);
  assert.equal(isAcceptedComplaintImage({ type: 'image/jpeg', name: 'a.jpg' }), true);
  assert.equal(isAcceptedComplaintImage({ type: 'application/pdf', name: 'a.pdf' }), false);
  assert.equal(isAcceptedComplaintImage({ type: '', name: 'capture.webp' }), true);
  assert.equal(isAcceptedComplaintImage({ type: '', name: 'notes.txt' }), false);
  assert.equal(isAcceptedComplaintImage(null), false);
});

test('resizing keeps the aspect ratio and never upscales a small screenshot', async () => {
  const drawn = [];
  const encode = async () => ({ size: 1024, type: 'image/jpeg' });
  const createCanvas = (width, height) => ({
    width,
    height,
    getContext: () => ({
      drawImage: (source, x, y, w, h) => drawn.push({ source, w, h, x, y }),
    }),
  });
  const decodeImage = async () => ({ width: 3000, height: 1500, close() {} });

  const large = await resizeComplaintImage({}, { decodeImage, createCanvas, encode });
  assert.deepEqual({ ...large, blob: undefined }, { blob: undefined, width: 1280, height: 640 });
  assert.equal(drawn[0].w, 1280);
  assert.equal(drawn[0].h, 640);

  const small = await resizeComplaintImage(
    {},
    {
      decodeImage: async () => ({ width: 400, height: 800 }),
      createCanvas,
      encode,
    }
  );
  assert.equal(small.width, 400);
  assert.equal(small.height, 800);
  assert.ok(EDEN_COMPLAINT_MAX_IMAGE_EDGE >= small.width);
});

test('the Eden page carries the button, the form fields, and the module', () => {
  assert.match(
    page,
    /<section\n\s+id="edenX1Complaints"[\s\S]*?data-eden-x1-shell-aria="complaintsLabel"/
  );
  assert.match(page, /id="edenX1Complaints"[\s\S]*?\shidden\n\s*>/);
  assert.match(page, /id="edenX1ComplaintOpen"[\s\S]*?aria-controls="edenX1ComplaintForm"/);
  assert.match(page, /id="edenX1ComplaintOpen"[\s\S]*?aria-expanded="false"/);
  assert.match(page, /id="edenX1ComplaintForm" class="eden-x1-complaint-form" hidden/);
  for (const id of [
    'edenX1ComplaintCategory',
    'edenX1ComplaintDescription',
    'edenX1ComplaintImages',
    'edenX1ComplaintImageList',
    'edenX1ComplaintAnonymous',
    'edenX1ComplaintIdentity',
    'edenX1ComplaintName',
    'edenX1ComplaintSubmit',
    'edenX1ComplaintCancel',
  ]) {
    assert.match(page, new RegExp(`id="${id}"`), `${id} is wired into the page`);
  }
  assert.match(page, /id="edenX1ComplaintDescription"[\s\S]*?maxlength="4000"/);
  assert.match(
    page,
    /id="edenX1ComplaintImages"[\s\S]*?accept="image\/png,image\/jpeg,image\/webp"/
  );
  assert.match(page, /id="edenX1ComplaintAnonymous" type="checkbox" checked/);
  assert.match(page, /id="edenX1ComplaintStatus"[\s\S]*?role="status"[\s\S]*?aria-live="polite"/);
  assert.match(
    page,
    /<script type="module" src="js\/eden-complaints\.js\?v=[0-9A-Za-z_-]+"><\/script>/
  );
  // The hidden-until-wired markup must not depend on inline script, which the
  // page's CSP forbids.
  assert.doesNotMatch(page, /\son[a-z][a-z0-9:_-]*\s*=\s*"/i);
});

test('the Eden page CSP allows Firebase Storage for uploads and thumbnails', () => {
  const csp = page.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || '';
  const imgSrc = csp.match(/img-src\s+([^;]+)/)?.[1] || '';
  const connectSrc = csp.match(/connect-src\s+([^;]+)/)?.[1] || '';
  // Uploads and getDownloadURL go to connect-src; the resulting <img> goes to
  // img-src. Both are required, and neither existed before this feature.
  assert.match(connectSrc, /https:\/\/firebasestorage\.googleapis\.com/);
  assert.match(imgSrc, /https:\/\/firebasestorage\.googleapis\.com/);
  assert.match(csp, /default-src 'self'/);
});

test('every complaint string ships in English, all eleven packs, and twelve shell locales', async () => {
  const keys = Object.keys(en).filter((key) => key.startsWith('edenX1Complaint'));
  assert.equal(keys.length, 28, 'the complaint surface is fully covered');
  for (const key of keys) {
    assert.ok(String(en[key]).trim(), `en.${key} is not empty`);
  }
  for (const locale of MAIN_LOCALES) {
    const pack = packs[locale];
    for (const key of keys) {
      assert.ok(String(pack[key] ?? '').trim(), `${locale}.${key} must be translated`);
      assert.notEqual(pack[key], en[key], `${locale}.${key} must not fall back to English`);
    }
  }
  // The admin tab label is read by the dashboard runtime catalog, not the Eden
  // one, so it is asserted here alongside the surface it opens.
  assert.equal(ADMIN_RUNTIME_EN.adminComplaintsTab, 'Complaints');
  assert.deepEqual(EDEN_X1_SHELL_LOCALES.length, 12);
  for (const locale of EDEN_X1_SHELL_LOCALES) {
    const copy = EDEN_X1_SHELL_COPY[locale];
    assert.ok(String(copy.complaintsLabel ?? '').trim(), `${locale} names the complaint form`);
    if (locale !== 'en') {
      assert.notEqual(copy.complaintsLabel, EDEN_X1_SHELL_COPY.en.complaintsLabel);
    }
    // The Eden X2 page rewrites every X1 in shell copy to X2, so the new label
    // must not mention a season.
    assert.ok(!copy.complaintsLabel.includes('X1'));
  }
});
