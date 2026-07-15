import { expect, test } from '@playwright/test';

function modeHeaderMarkup(mode) {
  const isBase = mode === 'default';
  const meta = isBase
    ? 'Contribution + ex-guild only; duty and Bonus Team Effort do not affect ranking.'
    : 'Top 10 by weighted total contribution: contribution + ex-guild + duty points + Bonus Team Effort weighted value.';
  const button = (value, label) => `<button
    class="eden-x1-contribution-mode-btn${value === mode ? ' is-selected' : ''}"
    data-eden-contribution-mode="${value}"
    aria-pressed="${value === mode}"
  ><span>${label}</span><span class="eden-x1-contribution-mode-badge${value === mode ? '' : ' is-comparison'}">${value === mode ? 'Active' : 'Comparison'}</span></button>`;

  return `<div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card">
    <div class="dash-card-hdr dash-card-hdr-wrap eden-x1-contribution-mode-header">
      <h2 class="dash-card-title"><span>Total Contribution</span></h2>
      <div class="eden-x1-contribution-mode-switch" role="group" aria-label="Compare Total Contribution formulas">
        ${button('extended', 'Extended')}${button('default', 'Base')}
      </div>
      <div class="dash-weighted-table-controls eden-x1-contribution-mode-tools">
        <span class="dash-weighted-contribution-meta">${meta}</span>
        <label class="dash-search-wrap dash-weighted-search"><input class="dash-search-input" type="search" /></label>
        <button class="dash-btn dash-weighted-view-toggle" type="button">Compact View</button>
      </div>
    </div>
  </div>`;
}

async function switchBox(page, mode) {
  await page.locator('#fixture').evaluate((fixture, markup) => {
    fixture.innerHTML = markup;
  }, modeHeaderMarkup(mode));
  return page.locator('.eden-x1-contribution-mode-switch').boundingBox();
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 800 },
  { name: 'tablet', width: 900, height: 800 },
]) {
  test(`contribution mode switch stays anchored on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.setContent(
      '<body class="eden-x1-page"><main id="ocrDashboardRoot"><div id="fixture"></div></main></body>'
    );
    await page.addStyleTag({ path: 'css/ocr-dashboard.css' });
    await page.addStyleTag({ path: 'css/eden-x1.css' });

    const extendedBox = await switchBox(page, 'extended');
    const baseBox = await switchBox(page, 'default');

    expect(extendedBox).not.toBeNull();
    expect(baseBox).not.toBeNull();
    expect(baseBox.x).toBeCloseTo(extendedBox.x, 1);
    expect(baseBox.y).toBeCloseTo(extendedBox.y, 1);
    expect(baseBox.width).toBeCloseTo(extendedBox.width, 1);
    await expect(page.locator('.eden-x1-contribution-mode-switch')).toContainText('Base');
    await expect(page.locator('.eden-x1-contribution-mode-switch')).not.toContainText('Default');
  });
}
