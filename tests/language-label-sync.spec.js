import { expect, test } from '@playwright/test';

// Pages apply a stored or URL language with `select.value = lang`, which fires
// no change event. The custom language buttons must still show that language.
test.describe('language button follows a programmatic language change', () => {
  test('main shell', async ({ page }) => {
    await page.goto('/index.html');
    const shell = page.locator('.lang-select-shell');
    await expect(shell).toHaveAttribute('data-shell-lang', /[A-Z]{2}/);
    await page.evaluate(() => {
      document.getElementById('languageSelect').value = 'de';
    });
    await expect(shell).toHaveAttribute('data-shell-lang', 'DE');
  });

  test('standalone pages', async ({ page }) => {
    await page.goto('/arcade.html');
    const label = page.locator('.standalone-language-label');
    await expect(label).toBeVisible();
    await page.evaluate(() => {
      document.getElementById('languageSelect').value = 'fr';
    });
    await expect(label).toHaveText('Français');
    await expect(label).toHaveAttribute('data-short', 'FR');
  });
});
