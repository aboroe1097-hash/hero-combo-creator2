// Sheet validation (plan §3, §5).
//
// Everything a published sheet claims is checked here before the catalogue is
// written: the pages are inside their bounds, no block overflows, the header art
// stays inside its 20% budget, the body text is at least 10pt, every required
// artifact exists, and the PDF's page count matches its PNGs. A sheet that fails
// any of these is not published and not advertised.

import { artBudgetMm } from './document.mjs';

export const MIN_BODY_TEXT_PT = 10;
// Chrome (footer, source credits, table footnotes) may print smaller than body
// copy; everything a reader is meant to *read as content* is checked at 10pt.
export const MIN_CHROME_TEXT_PT = 8;

export class SheetValidationError extends Error {
  constructor(sheetId, problems) {
    super(`Sheet ${sheetId} failed validation:\n  - ${problems.join('\n  - ')}`);
    this.name = 'SheetValidationError';
    this.problems = problems;
  }
}

function mm(px) {
  return (px / 96) * 25.4;
}

/**
 * Measure the rendered document. Runs in Chromium, so the numbers are the real
 * layout: page heights, header-art share, and every direct child of the page body
 * compared against the body's own box.
 */
export async function collectMeasurements(browser, html, orientation) {
  const viewport = {
    width: orientation === 'landscape' ? 1123 : 794,
    height: orientation === 'landscape' ? 794 : 1123,
  };
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    return await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll('.sh-page'));
      return pages.map((element, index) => {
        const body = element.querySelector('.sh-page__body');
        const art = element.querySelector('.sh-head__art');
        const pageRect = element.getBoundingClientRect();
        const bodyRect = body?.getBoundingClientRect() ?? null;
        const artRect = art?.getBoundingClientRect() ?? null;

        const overflowing = [];
        if (body && bodyRect) {
          for (const child of body.children) {
            const rect = child.getBoundingClientRect();
            const overBottom = rect.bottom - bodyRect.bottom;
            const overRight = rect.right - bodyRect.right;
            const overLeft = bodyRect.left - rect.left;
            if (overBottom > 1 || overRight > 1 || overLeft > 1) {
              overflowing.push({
                className: String(child.className || child.tagName).slice(0, 60),
                overBottomPx: Math.max(0, Math.round(overBottom)),
                overRightPx: Math.max(0, Math.round(overRight)),
                overLeftPx: Math.max(0, Math.round(overLeft)),
              });
            }
          }
        }

        // Smallest content text on the page: everything except the page chrome
        // (header brand line, footer, and the audit-only micro print).
        let smallestPt = Infinity;
        const chromeSelectors =
          '.sh-foot, .sh-head__brand, .sh-head__tool, .sh-note, .sh-card__note';
        for (const node of element.querySelectorAll('*')) {
          if (node.matches(chromeSelectors) || node.closest('.sh-foot')) continue;
          const hasText = Array.from(node.childNodes).some(
            (child) => child.nodeType === 3 && child.textContent.trim()
          );
          if (!hasText) continue;
          const size = parseFloat(getComputedStyle(node).fontSize || '0');
          if (Number.isFinite(size) && size > 0) smallestPt = Math.min(smallestPt, size);
        }

        return {
          index,
          pageHeightPx: Math.round(pageRect.height),
          pageWidthPx: Math.round(pageRect.width),
          artHeightPx: artRect ? Math.round(artRect.height) : 0,
          bodyScrollOverflowPx: body ? Math.max(0, body.scrollHeight - body.clientHeight) : 0,
          overflowing,
          smallestTextPt: Number.isFinite(smallestPt) ? Math.round(smallestPt * 10) / 10 : null,
        };
      });
    });
  } finally {
    await context.close();
  }
}

export function validateSheet({
  sheet,
  orientation,
  measurements,
  pdfPages,
  artifacts,
  pageCount,
}) {
  const problems = [];
  const artBudget = artBudgetMm(orientation);

  if (measurements.length !== pageCount) {
    problems.push(`measured ${measurements.length} page(s) but rendered ${pageCount}`);
  }
  if (pdfPages !== pageCount) {
    problems.push(`PDF has ${pdfPages} page(s), template produced ${pageCount}`);
  }

  const expectedWidth = orientation === 'landscape' ? 1123 : 794;
  const expectedHeight = orientation === 'landscape' ? 794 : 1123;

  measurements.forEach((page) => {
    const label = `page ${page.index + 1}`;
    if (Math.abs(page.pageWidthPx - expectedWidth) > 2) {
      problems.push(`${label}: width ${page.pageWidthPx}px, expected ${expectedWidth}px`);
    }
    if (Math.abs(page.pageHeightPx - expectedHeight) > 2) {
      problems.push(`${label}: height ${page.pageHeightPx}px, expected ${expectedHeight}px`);
    }
    if (page.overflowing.length) {
      const worst = page.overflowing
        .map((entry) => `${entry.className} (+${entry.overBottomPx}px bottom)`)
        .join(', ');
      problems.push(`${label}: content escapes the page body — ${worst}`);
    }
    if (page.bodyScrollOverflowPx > 1) {
      problems.push(`${label}: body overflows by ${page.bodyScrollOverflowPx}px`);
    }
    if (page.artHeightPx > 0) {
      const share = (mm(page.artHeightPx) / (orientation === 'landscape' ? 210 : 297)) * 100;
      if (mm(page.artHeightPx) > artBudget + 0.5) {
        problems.push(
          `${label}: header art is ${mm(page.artHeightPx).toFixed(1)}mm, budget is ${artBudget}mm`
        );
      }
      if (share > 20.5) {
        problems.push(`${label}: header art occupies ${share.toFixed(1)}% of the page, cap is 20%`);
      }
    }
    if (page.smallestTextPt !== null && page.smallestTextPt < MIN_BODY_TEXT_PT) {
      problems.push(
        `${label}: body text is ${page.smallestTextPt}pt, minimum is ${MIN_BODY_TEXT_PT}pt`
      );
    }
  });

  if (sheet.requirePng !== false) {
    const expectedPngs = pageCount;
    if ((artifacts.pngs || []).length !== expectedPngs) {
      problems.push(`expected ${expectedPngs} PNG(s), wrote ${(artifacts.pngs || []).length}`);
    }
    if ((artifacts.thumbnails || []).length !== expectedPngs) {
      problems.push(
        `expected ${expectedPngs} thumbnail(s), wrote ${(artifacts.thumbnails || []).length}`
      );
    }
  }

  if (!artifacts.pdf) problems.push('no PDF was written');

  if (problems.length) throw new SheetValidationError(sheet.id, problems);
  return true;
}

/**
 * Unknown-versus-zero guard (plan §5): a sheet may print an unknown value as
 * "Unknown"/"Known subtotal", but a *zero* that came from a blank source cell is a
 * lie. Adapters mark unknown values with `unknown: true`; this proves the marker
 * survived into the model.
 */
export function assertNoBlankZeros(model, { sheetId, path: modelPath = 'model' } = {}) {
  const problems = [];
  const visit = (node, trail) => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, `${trail}[${index}]`));
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (node.unknown === true && (node.value === 0 || node.value === '0')) {
      problems.push(`${trail} is marked unknown but carries 0`);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'unknown') continue;
      visit(value, `${trail}.${key}`);
    }
  };
  visit(model, modelPath);
  if (problems.length) {
    throw new SheetValidationError(
      sheetId,
      problems.map((entry) => `blank-as-zero: ${entry}`)
    );
  }
  return true;
}
