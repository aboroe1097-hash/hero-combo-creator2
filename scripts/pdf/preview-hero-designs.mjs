// Reproducible comparison: node scripts/pdf/preview-hero-designs.mjs [output-directory]
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import en from '../../js/i18n/hub-pdf/en.js';
import { buildHeroesDocument, defaultHeroChoices } from '../../js/hub-pdf/heroes.js';
import { renderDocumentHtml } from '../../js/hub-pdf/document.js';
import { HERO_DESIGNS } from '../../js/hub-pdf/hero-designs.js';

const output = path.resolve(process.argv[2] || 'output/pdf');
await fs.mkdir(output, { recursive: true });
const { version } = JSON.parse(await fs.readFile(new URL('../../package.json', import.meta.url)));
const branding = {
  siteName: 'RoC VTS Toolkit',
  siteUrl: 'https://roc-vts.com',
  appVersion: version,
  generatedAt: new Date().toISOString().slice(0, 10),
};
const choices = { ...defaultHeroChoices(), seasons: ['S1'], comboCount: '5' };
const browser = await chromium.launch();
try {
  for (const design of HERO_DESIGNS) {
    const settings = { design, paper: 'a4', orientation: 'landscape', detail: 'summary' };
    const html = renderDocumentHtml(buildHeroesDocument(choices, en, settings), settings, {
      copy: en,
      branding,
    });
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.evaluate(async () => {
      await Promise.race([
        Promise.all([
          document.fonts?.ready,
          ...[...document.images].map((image) => image.decode().catch(() => {})),
        ]),
        new Promise((resolve) => setTimeout(resolve, 20000)),
      ]);
    });
    await fs.writeFile(path.join(output, `heroes-${design}.html`), html);
    await page.pdf({
      path: path.join(output, `heroes-${design}.pdf`),
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.close();
    console.log(`Created heroes-${design}.pdf`);
  }
} finally {
  await browser.close();
}
