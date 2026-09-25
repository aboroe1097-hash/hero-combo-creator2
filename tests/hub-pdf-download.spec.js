import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// The Heroes PDFs tab now hands the file over directly: no print dialog, no
// "Save as PDF" step. This walks the real page, narrows the scope so the sheet
// is short, and checks that both downloads arrive as real files.

const PDF_MAGIC = '%PDF-';
const PNG_MAGIC = '\u0089PNG\r\n\u001a\n';

async function openHeroesPdfs(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_hero_lang', 'en');
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.goto('/#heroes', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await page.locator('[data-hub-subtab="pdfs"]').click();
  await expect(page.locator('.hub-pdf-form')).toBeVisible({ timeout: 30000 });
}

/** One season and one troop: enough for a small, quick sheet. */
async function narrowScope(page) {
  const seasons = page.locator('input[name="seasons"]');
  const count = await seasons.count();
  expect(count).toBeGreaterThan(1);
  for (let index = 0; index < count; index += 1) {
    const box = seasons.nth(index);
    const value = await box.getAttribute('value');
    if (value !== 'S1' && (await box.isChecked())) await box.uncheck({ force: true });
  }
  await page.locator('input[name="seasons"][value="S1"]').check({ force: true });
  await page.locator('select[name="troop"]').selectOption('cavalry');
}

test('the Heroes PDFs tab downloads a PDF and an image', async ({ page }) => {
  test.setTimeout(240000);
  await openHeroesPdfs(page);
  await narrowScope(page);

  // The two downloads are the whole point of the panel.
  await expect(page.locator('[data-download]')).toHaveCount(2);

  const pdfEvent = page.waitForEvent('download', { timeout: 180000 });
  await page.locator('[data-download="pdf"]').click();
  const pdf = await pdfEvent;
  expect(pdf.suggestedFilename()).toBe('roc-heroes-s1-cavalry-dark.pdf');
  const pdfBytes = await readFile(await pdf.path());
  expect(pdfBytes.length).toBeGreaterThan(5000);
  expect(pdfBytes.subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC);
  await expect(page.locator('.hub-pdf-status')).toHaveText(/download|heruntergeladen|descargado|téléchargé|scaricato|baixado|скачано|indirildi|unduhan|تنزيل|다운로드|已下载|downloaded/i, { timeout: 60000 });

  // The light theme draws the same sheet and names the file after it.
  await page.locator('select[name="theme"]').selectOption('light');
  const pngEvent = page.waitForEvent('download', { timeout: 180000 });
  await page.locator('[data-download="png"]').click();
  const png = await pngEvent;
  expect(png.suggestedFilename()).toMatch(/^roc-heroes-s1-cavalry-light(-\d+)?\.png$/);
  const pngBytes = await readFile(await png.path());
  expect(pngBytes.length).toBeGreaterThan(10000);
  expect(pngBytes.subarray(0, 8).toString('latin1')).toBe(PNG_MAGIC);
});
