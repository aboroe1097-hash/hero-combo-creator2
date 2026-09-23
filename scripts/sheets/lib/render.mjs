// Chromium renderer for reference sheets: HTML -> vector PDF + 300 DPI PNG +
// thumbnail per page (plan §2).
//
// The PDF and the PNG come from the same DOM, so a page cannot drift between the
// two: the PDF pages the explicit `.sh-page` blocks at the CSS page size, and the
// PNG is a screenshot of one block at 300 DPI with no reflow. Chromium is already
// required by both shipping workflows, so this adds no dependency.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { PNG_DPI, PNG_SCALE, pngSize, thumbnailSize } from './document.mjs';

const THUMBNAIL_DPI = 72;
const THUMBNAIL_SCALE = THUMBNAIL_DPI / 96;

// Chromium is provisioned by the repository's checks (`npx playwright install
// --with-deps chromium`). A missing browser must say what to run rather than
// failing with a stack trace from deep inside Playwright.
export async function launchChromium() {
  try {
    return await chromium.launch();
  } catch (error) {
    const message = String(error?.message || error);
    if (/Executable doesn't exist|browserType\.launch|Looks like Playwright/.test(message)) {
      throw new Error(
        'Chromium is not installed for Playwright. Run `npx playwright install --with-deps chromium` ' +
          'and rebuild. (Reference sheets, like the existing PDF exports, render in Chromium.)'
      );
    }
    throw error;
  }
}

async function waitForAssets(page) {
  await page.waitForLoadState('domcontentloaded');
  // Fonts first: a sheet laid out before the display face is ready measures short
  // and can overflow once the real metrics arrive.
  await page.evaluate(async () => {
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      await document.fonts.ready;
    }
  });
  // Then images: every <img> must be decoded before the screenshot, so no sheet
  // ever ships with a half-painted illustration.
  await page.evaluate(async () => {
    const images = Array.from(document.images || []);
    await Promise.all(
      images.map((image) =>
        image.complete && image.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((resolve) => {
              const done = () => resolve();
              image.addEventListener('load', done, { once: true });
              image.addEventListener('error', done, { once: true });
            })
      )
    );
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))
      )
  );
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString('latin1', 1, 4) !== 'PNG') {
    throw new Error(`Not a PNG: ${filePath}`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * Count the pages of a Chromium PDF without a PDF library. Chromium writes a
 * classic page tree (`/Type /Page` objects plus a root `/Count n`), so both the
 * object count and the declared count are readable; disagreement is a real error
 * rather than a parsing quirk worth guessing past.
 */
export function countPdfPages(filePath) {
  const raw = fs.readFileSync(filePath).toString('latin1');
  const pageObjects = (raw.match(/\/Type\s*\/Page(?![s])/g) || []).length;
  const declared = [...raw.matchAll(/\/Count\s+(\d+)/g)].map((match) => Number(match[1]));
  const maxDeclared = declared.length ? Math.max(...declared) : 0;
  return { pageObjects, declared: maxDeclared };
}

/**
 * Render one sheet: a PDF, one PNG per page at 300 DPI, and one thumbnail per page.
 *
 * `pageCount` is the number of `.sh-page` blocks the template produced. The PDF is
 * required to agree with it; a mismatch fails the build instead of publishing a
 * document whose page list disagrees with its own PNGs.
 */
export async function renderSheet({
  browser,
  html,
  pageCount,
  orientation,
  outputDir,
  id,
  writePng = true,
}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const pngTarget = pngSize(orientation);
  const thumbTarget = thumbnailSize(orientation);
  const viewport = {
    width: orientation === 'landscape' ? 1123 : 794,
    height: orientation === 'landscape' ? 794 : 1123,
  };

  const context = await browser.newContext({
    deviceScaleFactor: PNG_SCALE,
    viewport,
  });
  const page = await context.newPage();
  const written = { pdf: null, pngs: [], thumbnails: [] };

  try {
    await page.setContent(html, { waitUntil: 'load' });
    await waitForAssets(page);

    const domPages = await page.locator('.sh-page').count();
    if (domPages !== pageCount) {
      throw new Error(
        `Sheet ${id}: template produced ${pageCount} page block(s) but the document has ${domPages}`
      );
    }

    const pdfPath = path.join(outputDir, `${id}.pdf`);
    const pdfWidth = orientation === 'landscape' ? '297mm' : '210mm';
    const pdfHeight = orientation === 'landscape' ? '210mm' : '297mm';
    await page.pdf({
      path: pdfPath,
      width: pdfWidth,
      height: pdfHeight,
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    const counted = countPdfPages(pdfPath);
    const pdfPages = counted.pageObjects || counted.declared;
    if (pdfPages !== pageCount) {
      throw new Error(
        `Sheet ${id}: PDF has ${pdfPages} page(s) (objects ${counted.pageObjects}, declared ${counted.declared}) ` +
          `but the template produced ${pageCount}. Page bounds and breaks must be explicit.`
      );
    }
    written.pdf = {
      filename: path.basename(pdfPath),
      bytes: fs.statSync(pdfPath).size,
      pages: pdfPages,
    };

    if (writePng) {
      // A4 in millimetres is not a whole number of CSS pixels (210mm = 793.70px) and
      // Chromium floors a screenshot clip to whole CSS pixels, so neither an element
      // shot nor a clip lands exactly on 2480x3508. Rasterise at the real device size
      // instead: keep the layout at its true A4 size, then scale the page block to the
      // exact target pixel count with a CSS transform and shoot a 1:1 viewport. The
      // layout is untouched (a transform is post-layout), so the PNG matches the PDF.
      const firstBox = await page.locator('.sh-page').first().boundingBox();
      if (!firstBox) throw new Error(`Sheet ${id}: the document has no page block`);
      const scale = pngTarget.width / firstBox.width;
      const heightError = Math.abs(firstBox.height * scale - pngTarget.height);
      if (heightError > 1.5) {
        throw new Error(
          `Sheet ${id}: page block is ${firstBox.width.toFixed(2)}x${firstBox.height.toFixed(
            2
          )} CSS px, which cannot rasterise to ${pngTarget.width}x${pngTarget.height}`
        );
      }

      // Device scale 1: the page is scaled to the target pixel count in CSS, so the
      // context must not scale it again.
      const rasterContext = await browser.newContext({ deviceScaleFactor: 1 });
      const rasterPage = await rasterContext.newPage();
      try {
        await rasterPage.setViewportSize({ width: pngTarget.width, height: pngTarget.height });
        await rasterPage.setContent(html, { waitUntil: 'load' });
        await waitForAssets(rasterPage);
        await rasterPage.addStyleTag({
          content: `
            html, body { width: ${pngTarget.width}px; height: ${pngTarget.height}px; overflow: hidden; }
            .sh-page { display: none; }
            .sh-page.is-raster-target {
              display: flex;
              transform: scale(${scale});
              transform-origin: top left;
              break-after: auto;
            }`,
        });

        for (let index = 0; index < pageCount; index += 1) {
          await rasterPage.evaluate((target) => {
            document.querySelectorAll('.sh-page').forEach((element, position) => {
              element.classList.toggle('is-raster-target', position === target);
            });
          }, index);
          await rasterPage.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))
              )
          );

          const pngName = `${id}-p${index + 1}.png`;
          const pngPath = path.join(outputDir, pngName);
          await rasterPage.screenshot({
            path: pngPath,
            type: 'png',
            clip: { x: 0, y: 0, width: pngTarget.width, height: pngTarget.height },
          });
          const size = readPngSize(pngPath);
          if (size.width !== pngTarget.width || size.height !== pngTarget.height) {
            throw new Error(
              `Sheet ${id} page ${index + 1}: PNG is ${size.width}x${size.height}, expected ` +
                `${pngTarget.width}x${pngTarget.height} (${PNG_DPI} DPI ${orientation})`
            );
          }
          written.pngs.push({ filename: pngName, bytes: fs.statSync(pngPath).size, ...size });
        }
      } finally {
        await rasterPage.close();
      }

      // Thumbnails are their own smaller raster of the same document, not a downscale
      // of the 300 DPI file, so the catalogue never ships a multi-megabyte preview.
      const thumbScale = thumbTarget.width / firstBox.width;
      const thumbPage = await rasterContext.newPage();
      try {
        await thumbPage.setViewportSize({ width: thumbTarget.width, height: thumbTarget.height });
        await thumbPage.setContent(html, { waitUntil: 'load' });
        await waitForAssets(thumbPage);
        await thumbPage.addStyleTag({
          content: `
            html, body { width: ${thumbTarget.width}px; height: ${thumbTarget.height}px; overflow: hidden; }
            .sh-page { display: none; }
            .sh-page.is-raster-target {
              display: flex;
              transform: scale(${thumbScale});
              transform-origin: top left;
              break-after: auto;
            }`,
        });
        for (let index = 0; index < pageCount; index += 1) {
          await thumbPage.evaluate((target) => {
            document.querySelectorAll('.sh-page').forEach((element, position) => {
              element.classList.toggle('is-raster-target', position === target);
            });
          }, index);
          await thumbPage.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))
              )
          );
          const thumbName = `${id}-p${index + 1}-thumb.png`;
          const thumbPath = path.join(outputDir, thumbName);
          await thumbPage.screenshot({
            path: thumbPath,
            type: 'png',
            clip: { x: 0, y: 0, width: thumbTarget.width, height: thumbTarget.height },
          });
          const thumbSize = readPngSize(thumbPath);
          if (thumbSize.width !== thumbTarget.width || thumbSize.height !== thumbTarget.height) {
            throw new Error(
              `Sheet ${id} thumbnail ${index + 1}: ${thumbSize.width}x${thumbSize.height}, expected ` +
                `${thumbTarget.width}x${thumbTarget.height}`
            );
          }
          written.thumbnails.push({
            filename: thumbName,
            bytes: fs.statSync(thumbPath).size,
            width: thumbSize.width,
            height: thumbSize.height,
          });
        }
      } finally {
        await thumbPage.close();
        await rasterContext.close();
      }
    }
  } finally {
    await context.close();
  }

  return written;
}

/** A 72 DPI render of one page block, used for catalogue thumbnails. */
export async function renderThumbnail({ browser, html, pageIndex, orientation, outputPath, id }) {
  const viewport = {
    width: orientation === 'landscape' ? 1123 : 794,
    height: orientation === 'landscape' ? 794 : 1123,
  };
  const context = await browser.newContext({
    deviceScaleFactor: THUMBNAIL_SCALE,
    viewport,
  });
  const page = await context.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await waitForAssets(page);
    const block = page.locator('.sh-page').nth(pageIndex);
    const box = await block.boundingBox();
    if (!box) throw new Error(`Sheet ${id}: page ${pageIndex + 1} has no layout box`);
    await block.screenshot({ path: outputPath, type: 'png' });
    const size = readPngSize(outputPath);
    const target = thumbnailSize(orientation);
    if (size.width !== target.width || size.height !== target.height) {
      throw new Error(
        `Sheet ${id} thumbnail ${pageIndex + 1}: ${size.width}x${size.height}, expected ` +
          `${target.width}x${target.height}`
      );
    }
    return { filename: path.basename(outputPath), bytes: fs.statSync(outputPath).size, ...size };
  } finally {
    await context.close();
  }
}

/**
 * Measure the rendered pages: per-page content height, and whether the header art
 * stays inside its budget. Runs in the page context so the numbers are the real
 * layout, not an estimate.
 */
export async function measureSheetPages(browser, html, orientation) {
  const viewport = {
    width: orientation === 'landscape' ? 1123 : 794,
    height: orientation === 'landscape' ? 794 : 1123,
  };
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await waitForAssets(page);
    return await page.evaluate(() => {
      const pages = Array.from(document.querySelectorAll('.sh-page'));
      return pages.map((element, index) => {
        const body = element.querySelector('.sh-page__body');
        const art = element.querySelector('.sh-head__art');
        const pageRect = element.getBoundingClientRect();
        const bodyRect = body ? body.getBoundingClientRect() : null;
        const artRect = art ? art.getBoundingClientRect() : null;
        const overflowNodes = [];
        if (body) {
          for (const child of body.children) {
            const childRect = child.getBoundingClientRect();
            const style = getComputedStyle(child);
            const clipped =
              childRect.bottom > bodyRect.bottom + 1 ||
              childRect.right > bodyRect.right + 1 ||
              childRect.left < bodyRect.left - 1;
            if (clipped) {
              overflowNodes.push({
                className: child.className || child.tagName.toLowerCase(),
                bottom: Math.round(childRect.bottom - bodyRect.bottom),
                right: Math.round(childRect.right - bodyRect.right),
                display: style.display,
              });
            }
          }
        }
        return {
          index,
          pageHeightMm: Math.round((pageRect.height / 96) * 25.4 * 10) / 10,
          artHeightMm: artRect ? Math.round((artRect.height / 96) * 25.4 * 10) / 10 : 0,
          artShare: artRect ? artRect.height / pageRect.height : 0,
          bodyScroll: body ? body.scrollHeight - body.clientHeight : 0,
          overflowNodes,
        };
      });
    });
  } finally {
    await context.close();
  }
}

export { THUMBNAIL_DPI };
