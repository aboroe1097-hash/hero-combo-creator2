// Chromium print pipeline: HTML string -> vector PDF file.
//
// Chromium is already required by both shipping workflows
// (`npx playwright install --with-deps chromium` precedes `verify:deploy`), so
// this adds no dependency. One browser instance is reused across every export.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const BRAND_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif";

function footerTemplate(branding) {
  const brand = `${branding.displayName} v${branding.appVersion}`;
  return `<div style="width:100%;font-family:${BRAND_FONT};font-size:6.8pt;color:#64748b;
    padding:0 12mm;display:flex;justify-content:space-between;align-items:center;">
    <span>${brand} &middot; ${branding.siteUrl}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;
}

export async function renderPdfBatch(jobs, { concurrency = 4, outputDir }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const index = cursor;
      cursor += 1;
      const job = jobs[index];
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent(job.html, { waitUntil: 'load' });
        const outputPath = path.join(outputDir, job.filename);
        await page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: footerTemplate(job.branding),
          margin: { top: '13mm', right: '12mm', bottom: '15mm', left: '12mm' },
          preferCSSPageSize: false,
        });
        results.push({
          id: job.id,
          filename: job.filename,
          bytes: fs.statSync(outputPath).size,
          title: job.title,
        });
      } finally {
        await context.close();
      }
    }
  }

  try {
    const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker());
    await Promise.all(workers);
  } finally {
    await browser.close();
  }

  results.sort((a, b) => a.filename.localeCompare(b.filename));
  return results;
}
