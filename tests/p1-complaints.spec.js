import { expect, test } from '@playwright/test';

// The Issue/Complaint form on the live Eden X2 page.
//
// The unit contract covers what is not observable from a browser — the rules,
// the document shape, and the anonymity guarantee. This spec covers the half a
// browser owns: that js/eden-complaints.js actually wires the markup the page
// ships, that the form starts inert (no request until a member submits), and
// that the anonymous/named switch drives the one field it should.
//
// The panel starts inside the Eden boot gate, which this spec steps around with
// the same class removal the boot code performs. Nothing here depends on season
// data, and no request is allowed to leave the page until an actual submit.

async function openEdenComplaints(page, options = {}) {
  const outbound = [];
  page.on('request', (request) => {
    const url = request.url();
    if (
      url.startsWith('https://firestore.googleapis.com/') ||
      url.startsWith('https://firebasestorage.googleapis.com/')
    ) {
      outbound.push(`${request.method()} ${url}`);
    }
  });
  await page.setViewportSize({ width: options.width || 1280, height: options.height || 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Third-party hosts are blocked rather than awaited: the form is entirely
  // same-origin, and a stalled font or tag request would otherwise hold the
  // page's load event open for the whole test timeout.
  await page.route(
    /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|www\.google-analytics\.com|region1\.google-analytics\.com)\//,
    (route) => route.abort()
  );
  await page.addInitScript(() => {
    window.VTS_EDEN_X1_TEST_MODE = true;
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
    localStorage.setItem('vts_theme', 'dark');
  });

  await page.goto(`/eden-x2.html${options.hash || ''}`, { waitUntil: 'domcontentloaded' });
  // The module reveals the section only once its handlers are bound, so this
  // doubles as the "the module loaded" assertion.
  await expect
    .poll(() => page.evaluate(() => document.getElementById('edenX1Complaints')?.hidden === false))
    .toBe(true);
  await page.evaluate(() => {
    document.getElementById('ocrDashboardSection')?.classList.remove('eden-x1-panel--loading');
    document.body.classList.remove('eden-x1-loading');
    document.getElementById('edenX1NavLoader')?.setAttribute('hidden', '');
  });
  return outbound;
}

test('the Eden page offers an Issue or Complaint form that opens on demand', async ({ page }) => {
  const outbound = await openEdenComplaints(page);

  const section = page.locator('#edenX1Complaints');
  await expect(section).toBeVisible();
  await expect(section.getByRole('heading', { name: 'Issue or Complaint' })).toBeVisible();

  const form = page.locator('#edenX1ComplaintForm');
  await expect(form).toBeHidden();

  const open = page.locator('#edenX1ComplaintOpen');
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  await expect(form).toBeVisible();

  // The fields the rules require: a category from the enum (six, with "missing"), a bounded
  // description, an optional image picker, and the anonymous switch.
  await expect(page.locator('#edenX1ComplaintCategory')).toBeVisible();
  await expect(page.locator('#edenX1ComplaintCategory option')).toHaveCount(6);
  await expect(page.locator('#edenX1ComplaintDescription')).toHaveAttribute('maxlength', '4000');
  await expect(page.locator('#edenX1ComplaintImages')).toHaveAttribute('type', 'file');
  await expect(page.locator('#edenX1ComplaintAnonymous')).toBeChecked();
  await expect(page.locator('#edenX1ComplaintStatus')).toHaveAttribute('role', 'status');

  // Opening the form is inert: a member who never submits sends nothing.
  expect(outbound).toEqual([]);

  await page.locator('#edenX1ComplaintCancel').click();
  await expect(form).toBeHidden();
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  expect(outbound).toEqual([]);
});

test('the anonymous switch is the only control that adds identity to a filing', async ({
  page,
}) => {
  await openEdenComplaints(page, { width: 390, height: 844 });
  await page.locator('#edenX1ComplaintOpen').click();

  const identity = page.locator('#edenX1ComplaintIdentity');
  const anonymous = page.locator('#edenX1ComplaintAnonymous');

  // Anonymous is the default, and the name field is not merely hidden: the
  // module never reads it while the box stays checked.
  await expect(anonymous).toBeChecked();
  await expect(identity).toBeHidden();

  await anonymous.uncheck();
  await expect(identity).toBeVisible();
  await expect(page.locator('#edenX1ComplaintName')).toBeVisible();

  await anonymous.check();
  await expect(identity).toBeHidden();
});

test('the filing copy follows the page language', async ({ page }) => {
  await openEdenComplaints(page);
  const title = page.locator('#edenX1ComplaintTitle');
  await expect(title).toHaveText('Issue or Complaint');

  await page.selectOption('#languageSelect', 'ru');
  await expect(title).toHaveText('Проблема или жалоба', { timeout: 20000 });
  await expect(page.locator('#edenX1ComplaintOpen span')).toHaveText(
    'Отправить проблему или жалобу'
  );
  // The form's section label is localized through the standalone shell rather
  // than through data-i18n, so it is the one attribute worth pinning here.
  await expect(page.locator('#edenX1Complaints')).toHaveAttribute(
    'aria-label',
    'Форма проблем и жалоб для руководства альянса'
  );
});

test('the Contact Devs link lands on the complaint form already open', async ({ page }) => {
  const outbound = await openEdenComplaints(page, { hash: '#edenX1Complaints' });
  await expect(page.locator('#edenX1ComplaintForm')).toBeVisible();
  await expect(page.locator('#edenX1ComplaintOpen')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#edenX1ComplaintCategory')).toBeFocused();
  const contact = page.locator('footer a', { hasText: 'Contact Devs' }).first();
  await expect(contact).toHaveAttribute('href', 'eden-x2.html#edenX1Complaints');
  expect(outbound).toEqual([]);
});
