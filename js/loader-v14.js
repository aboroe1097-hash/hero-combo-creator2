(function initVtsLoader(global) {
  'use strict';

  const SELECTOR =
    '[data-vts-loader], .tab-loading, .youtube-player-loading, .dash-connecting';
  const BRIEF_MIN_VISIBLE_MS = 160;
  const DM_MIN_VISIBLE_MS = 820;
  const DEFAULT_CONTEXT = 'vts';
  const VELO_BODY_SRC = 'assets/velo/velo-body.webp';
  const VELO_HELMET_SRC = 'assets/velo/velo-helmet.webp';

  const imageVisual = (src, fit = 'cover') => Object.freeze({ kind: 'image', src, fit });
  const veloVisual = () => Object.freeze({ kind: 'velo' });
  const cloneVisual = (selector, fallbackSrc = '') =>
    Object.freeze({ kind: 'clone', selector, fallbackSrc });
  const presentation = ({
    identity,
    milestones = [],
    runner,
    minimumVisibleMs = BRIEF_MIN_VISIBLE_MS,
  }) =>
    Object.freeze({
      identity,
      milestones: Object.freeze(milestones),
      runner,
      minimumVisibleMs,
    });

  const PRESENTATIONS = Object.freeze({
    vts: presentation({
      identity: imageVisual('images/logo-120.webp', 'contain'),
      runner: imageVisual('images/logo-40.webp', 'contain'),
    }),
    manual: presentation({
      identity: imageVisual('images/heroes/catchup/liberator.avif'),
      milestones: [
        imageVisual('images/heroes/catchup/liberator.avif'),
        imageVisual('images/heroes/catchup/bjorn.avif'),
        imageVisual('images/heroes/catchup/ashen-verdict.avif'),
      ],
      runner: imageVisual('images/heroes/catchup/ragnar-demon-lord.avif'),
    }),
    generator: presentation({
      identity: imageVisual('images/heroes/catchup/ashen-verdict.avif'),
      milestones: [
        imageVisual('images/heroes/catchup/bjorn.avif'),
        imageVisual('images/heroes/catchup/liberator.avif'),
        imageVisual('images/heroes/catchup/ragnar-demon-lord.avif'),
      ],
      runner: imageVisual('images/heroes/catchup/ashen-verdict.avif'),
    }),
    'hero-atlas': presentation({
      identity: imageVisual('assets/skins/king-arthur-arthur-pendragon-icon.webp'),
      milestones: [
        imageVisual('assets/skins/jeanne-darc-idling-icon.webp'),
        imageVisual('assets/skins/theodora-royal-icon.webp'),
        imageVisual('assets/skins/beowulf-tass-legion-icon.webp'),
      ],
      runner: imageVisual('assets/skins/sky-breaker-skin-icon.webp'),
    }),
    research: presentation({
      identity: cloneVisual('#tabResearch svg', 'images/WB.png'),
      milestones: [
        imageVisual('images/WB.png', 'contain'),
        cloneVisual('#tabResearch svg'),
        imageVisual('images/CM.png', 'contain'),
      ],
      runner: cloneVisual('#tabResearch svg', 'images/CM.png'),
    }),
    dm: presentation({
      identity: imageVisual('assets/dm/equipment/dragon-master/armor.png', 'contain'),
      milestones: [
        imageVisual('assets/dm/materials/gold/feather.png', 'contain'),
        imageVisual('assets/dm/materials/gold/claw.png', 'contain'),
        imageVisual('assets/dm/materials/gold/ingot.png', 'contain'),
      ],
      runner: imageVisual('assets/dm/materials/gold/coil.png', 'contain'),
      minimumVisibleMs: DM_MIN_VISIBLE_MS,
    }),
    'eden-map': presentation({
      identity: cloneVisual(
        '#tabEdenMap svg',
        'assets/eden-reference/icons/user-capital-marker.webp'
      ),
      milestones: [
        imageVisual('assets/eden-reference/icons/user-gate-marker.webp', 'contain'),
        imageVisual('assets/eden-reference/icons/user-town-marker.webp', 'contain'),
        imageVisual('assets/eden-reference/icons/user-stronghold-marker.webp', 'contain'),
      ],
      runner: imageVisual('assets/eden-reference/icons/user-capital-marker.webp', 'contain'),
    }),
    strife: presentation({
      identity: imageVisual('images/strife/monsters/rabbit.jpg'),
      milestones: [
        imageVisual('images/strife/monsters/rabbit.jpg'),
        imageVisual('images/strife/monsters/titanus.jpg'),
        imageVisual('images/strife/monsters/black-annis.jpg'),
      ],
      runner: imageVisual('images/strife/monsters/trident-north-sea.jpg'),
    }),
    loyalty: presentation({
      identity: cloneVisual('#tabLoyalty svg', 'images/saved_units.png'),
      milestones: [
        cloneVisual('#tabLoyalty svg'),
        imageVisual('images/saved_units.png', 'contain'),
        cloneVisual('#tabLoyalty svg'),
      ],
      runner: imageVisual('images/saved_units.png', 'contain'),
    }),
    youtube: presentation({
      identity: cloneVisual('#youtubeSection .youtube-library-mark svg', 'images/logo-120.webp'),
      milestones: [
        cloneVisual('#youtubeSection .youtube-playlist-card--journey .youtube-playlist-icon svg'),
        cloneVisual(
          '#youtubeSection .youtube-playlist-card--recruitment .youtube-playlist-icon svg'
        ),
        cloneVisual('#youtubeSection .youtube-playlist-card--guides .youtube-playlist-icon svg'),
      ],
      runner: cloneVisual(
        '#youtubeSection .youtube-load-button svg, #youtubeSection .youtube-player-icon svg'
      ),
    }),
    admin: presentation({
      identity: veloVisual(),
      runner: veloVisual(),
    }),
    'eden-x1': presentation({
      identity: veloVisual(),
      runner: veloVisual(),
      minimumVisibleMs: 900,
    }),
    arcade: presentation({
      identity: cloneVisual('.dash-sigil-emblem svg', 'images/logo-120.webp'),
      runner: cloneVisual('.dash-sigil-emblem svg', 'images/logo-40.webp'),
    }),
  });

  const CONTEXT_ALIASES = Object.freeze({
    atlas: 'hero-atlas',
    builder: 'manual',
    combos: 'generator',
    eden: 'eden-map',
    edenmap: 'eden-map',
    edenx1: 'eden-x1',
    heroes: 'hero-atlas',
    loyalty: 'loyalty',
    materials: 'dm',
    material: 'dm',
    ocr: 'admin',
    strife: 'strife',
    youtube: 'youtube',
  });

  const CONTEXT_ROOTS = Object.freeze([
    Object.freeze({ context: 'youtube', selector: '#youtubeSection, .youtube-player-shell' }),
    Object.freeze({ context: 'dm', selector: '#materialsSection, #materialCalculatorRoot' }),
    Object.freeze({ context: 'eden-map', selector: '#edenMapSection, #edenMapRoot' }),
    Object.freeze({ context: 'strife', selector: '#strifeSection, #strifeToolRoot' }),
    Object.freeze({ context: 'loyalty', selector: '#loyaltySection, #loyaltyCalculatorRoot' }),
    Object.freeze({ context: 'research', selector: '#researchSection' }),
    Object.freeze({ context: 'hero-atlas', selector: '#heroesSection, #heroesTabContent' }),
    Object.freeze({ context: 'generator', selector: '#generatorSection' }),
    Object.freeze({ context: 'manual', selector: '#manualSection' }),
  ]);

  const mountedStates = new WeakMap();

  function isElement(value) {
    return Boolean(value && value.nodeType === 1 && typeof value.matches === 'function');
  }

  function isDocument(value) {
    return Boolean(value && value.nodeType === 9 && typeof value.querySelectorAll === 'function');
  }

  function now() {
    return global.performance?.now?.() ?? Date.now();
  }

  function normalizeContext(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
    const alias = CONTEXT_ALIASES[normalized] || normalized;
    return Object.prototype.hasOwnProperty.call(PRESENTATIONS, alias) ? alias : '';
  }

  function closestMatches(root, selector) {
    if (!isElement(root)) return false;
    try {
      return root.matches(selector) || root.closest(selector) !== null;
    } catch {
      return false;
    }
  }

  function detectContext(root) {
    if (!isElement(root)) return DEFAULT_CONTEXT;

    const explicitRoot = root.closest('[data-vts-loader-context]');
    const explicit = normalizeContext(explicitRoot?.dataset?.vtsLoaderContext);
    if (explicit) return explicit;

    const body = global.document?.body;
    const path = String(global.location?.pathname || '').toLowerCase();
    if (body?.classList?.contains('eden-x1-page') || path.includes('eden-x1')) return 'eden-x1';
    if (body?.classList?.contains('arcade-page') || path.includes('arcade')) return 'arcade';
    if (body?.classList?.contains('admin-standalone-page') || /(?:^|\/)admin\.html$/.test(path)) {
      return 'admin';
    }

    for (const entry of CONTEXT_ROOTS) {
      if (closestMatches(root, entry.selector)) return entry.context;
    }

    const activeTab = normalizeContext(body?.dataset?.activeTab);
    return activeTab || DEFAULT_CONTEXT;
  }

  function presentationFor(context) {
    return PRESENTATIONS[normalizeContext(context) || DEFAULT_CONTEXT];
  }

  function collectAssetPaths(context) {
    const selected = presentationFor(context);
    const visuals = [selected.identity, ...selected.milestones, selected.runner];
    return Object.freeze([
      ...new Set([
        ...visuals.flatMap((visual) => [visual?.src, visual?.fallbackSrc]).filter(Boolean),
        VELO_BODY_SRC,
        VELO_HELMET_SRC,
      ]),
    ]);
  }

  function clampProgress(value) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return null;
    return Math.max(0, Math.min(100, number));
  }

  function copyAttribute(source, target, name) {
    const value = source?.getAttribute?.(name);
    if (value !== null && value !== undefined) target.setAttribute(name, value);
  }

  function cloneExistingVisual(root, selector) {
    if (!selector) return null;
    let source = null;
    try {
      source = root.querySelector(selector) || root.closest('[id]')?.querySelector(selector);
      if (!source) source = global.document?.querySelector(selector) || null;
    } catch {
      return null;
    }
    if (!source) return null;

    const clone = source.cloneNode(true);
    clone.removeAttribute?.('id');
    clone.querySelectorAll?.('[id]').forEach((node) => node.removeAttribute('id'));
    clone.removeAttribute?.('width');
    clone.removeAttribute?.('height');
    return clone;
  }

  function makeVisual(root, className, visual) {
    if (!visual) return null;

    let node = visual.kind === 'velo' ? makeVeloFigure() : null;
    if (!node && visual.kind === 'clone') node = cloneExistingVisual(root, visual.selector);
    let source = visual.src;
    if (!node && visual.fallbackSrc) source = visual.fallbackSrc;

    if (!node && source) {
      node = global.document.createElement('img');
      node.src = source;
      node.alt = '';
      node.decoding = 'async';
      node.loading = 'eager';
      node.classList.add('vts-loader__visual--image');
      if (visual.fit === 'contain') node.classList.add('vts-loader__visual--contain');
    }
    if (!node) return null;

    node.classList.add(...className.split(/\s+/).filter(Boolean), 'vts-loader__visual');
    if (String(node.tagName || '').toLowerCase() === 'svg') {
      node.classList.add('vts-loader__visual--icon');
      node.setAttribute('focusable', 'false');
    }
    if (visual.kind === 'velo') node.classList.add('vts-loader__visual--velo');
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function makeVeloFigure() {
    const figure = global.document.createElement('span');
    figure.className = 'vts-loader__velo-figure';
    figure.setAttribute('aria-hidden', 'true');
    const body = global.document.createElement('img');
    body.src = VELO_BODY_SRC;
    body.alt = '';
    body.decoding = 'async';
    body.loading = 'eager';
    body.className = 'vts-loader__velo-body';

    const helmet = global.document.createElement('img');
    helmet.src = VELO_HELMET_SRC;
    helmet.alt = '';
    helmet.decoding = 'async';
    helmet.loading = 'eager';
    helmet.className = 'vts-loader__velo-helmet';

    figure.append(body, helmet);
    return figure;
  }

  function makeVeloRunner() {
    const runner = makeVeloFigure();
    runner.classList.add('vts-loader__runner', 'vts-loader__runner--velo', 'vts-loader__visual');
    return runner;
  }

  function describe(root) {
    const titleSource =
      root.querySelector(
        '.dash-connecting-title, .loading-title, .youtube-player-loading [data-i18n], [data-i18n]'
      ) || (root.matches('[data-i18n]') ? root : null);
    const statusSource = root.querySelector('.dash-connecting-status');
    const kickerSource = root.querySelector('.dash-connecting-kicker');
    const fillSource = root.querySelector('.dash-connecting-bar-fill, .boot-progress-fill');
    const percentSource = root.querySelector('.dash-connecting-bar-pct');
    const compact =
      root.dataset.vtsLoaderVariant === 'compact' ||
      root.classList.contains('tab-loading') ||
      root.classList.contains('youtube-player-loading') ||
      root.classList.contains('eden-x1-table-loading-card');
    const explicitProgress = clampProgress(root.dataset.vtsLoaderProgress);
    const inlineProgress = clampProgress(fillSource?.style?.width);
    const labelProgress = clampProgress(percentSource?.textContent);
    const indeterminate =
      root.dataset.vtsLoaderProgress === 'indeterminate' ||
      root.querySelector('.dash-connecting-bar--indeterminate') !== null ||
      (explicitProgress === null && inlineProgress === null && labelProgress === null);

    let title = titleSource?.textContent?.trim() || root.dataset.vtsLoaderTitle || '';
    if (!title) title = root.textContent?.replace(/\s+/g, ' ').trim() || '';

    return {
      compact,
      title,
      status: statusSource?.textContent?.trim() || root.dataset.vtsLoaderStatus || '',
      kicker: kickerSource?.textContent?.trim() || root.dataset.vtsLoaderKicker || '',
      progress: explicitProgress ?? inlineProgress ?? labelProgress ?? 0,
      indeterminate,
      titleSource,
      statusSource,
      kickerSource,
      fillSource,
      percentSource,
    };
  }

  function ensureStatus(root) {
    let status = root.querySelector('.dash-connecting-status');
    if (status) return status;
    const stage = root.querySelector('.vts-loader__stage');
    if (!stage) return null;
    status = global.document.createElement('p');
    status.className = 'vts-loader__status dash-connecting-status';
    stage.appendChild(status);
    return status;
  }

  function applyProgress(root, value) {
    const progress = clampProgress(value);
    if (progress === null) return;

    root.classList.remove('is-indeterminate');
    root.style.setProperty('--vts-loader-progress', String(progress));
    root.style.setProperty('--vts-loader-scale', String(progress / 100));
    root.dataset.vtsLoaderProgress = String(progress);
    root.classList.toggle('is-complete', progress >= 100);
    root.setAttribute('aria-busy', progress >= 100 ? 'false' : 'true');

    const fill = root.querySelector('.dash-connecting-bar-fill');
    const width = `${progress}%`;
    if (fill && fill.style.width !== width) fill.style.width = width;

    const percent = root.querySelector('.dash-connecting-bar-pct');
    if (percent) percent.textContent = `${Math.round(progress)}%`;
  }

  function observeLegacyProgress(root, fill, state) {
    if (
      !fill ||
      fill.dataset.vtsLoaderObserved === '1' ||
      typeof global.MutationObserver !== 'function'
    ) {
      return;
    }
    fill.dataset.vtsLoaderObserved = '1';

    const sync = () => {
      const progress = clampProgress(fill.style.width);
      if (progress !== null) applyProgress(root, progress);
    };
    state.progressObserver = new global.MutationObserver(sync);
    state.progressObserver.observe(fill, { attributes: true, attributeFilter: ['style'] });
    sync();
  }

  function isPresented(root) {
    if (!root?.isConnected || root.hidden || root.closest('[hidden], .hidden')) return false;
    const style = global.getComputedStyle?.(root);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    if (typeof root.getClientRects === 'function' && root.getClientRects().length === 0)
      return false;
    return true;
  }

  function dispatchLoaderEvent(root, type, detail) {
    if (typeof global.CustomEvent !== 'function') return;
    root.dispatchEvent(new global.CustomEvent(type, { bubbles: true, detail }));
  }

  function markPresented(root, state) {
    if (state.appearedAt !== null || !isPresented(root)) return;
    state.appearedAt = now();
    root.dataset.vtsLoaderPainted = '1';
    state.visibilityObserver?.disconnect();
    state.visibilityObserver = null;
    dispatchLoaderEvent(root, 'vts:loader-visible', {
      target: root,
      context: state.context,
      minimumVisibleMs: state.minimumVisibleMs,
    });
  }

  function watchForPresentation(root, state) {
    const check = () => markPresented(root, state);
    const requestFrame =
      global.requestAnimationFrame || ((callback) => global.setTimeout(callback, 16));
    requestFrame(check);

    if (typeof global.MutationObserver !== 'function') return;
    const targets = [
      root,
      root.parentElement,
      root.closest('.tab-panel'),
      root.closest('[data-player-state]'),
    ].filter((target, index, all) => target && all.indexOf(target) === index);
    state.visibilityObserver = new global.MutationObserver(() => requestFrame(check));
    targets.forEach((target) =>
      state.visibilityObserver.observe(target, {
        attributes: true,
        attributeFilter: ['class', 'hidden', 'data-player-state'],
      })
    );
  }

  function cancelPendingWaits(root) {
    const state = mountedStates.get(root);
    if (!state) return false;
    [...state.pendingWaits].forEach((finish) => finish(false));
    return true;
  }

  function cleanup(root) {
    const state = mountedStates.get(root);
    if (!state) return;
    cancelPendingWaits(root);
    state.progressObserver?.disconnect();
    state.visibilityObserver?.disconnect();
    mountedStates.delete(root);
  }

  function mount(root, options = {}) {
    if (!isElement(root)) return null;
    if (root.dataset.vtsLoaderMounted === '1') return root;

    const context = normalizeContext(options.context) || detectContext(root);
    const selectedPresentation = presentationFor(context);
    const descriptor = { ...describe(root), ...options, context };
    const stage = global.document.createElement('div');
    stage.className = 'vts-loader__stage';
    stage.dataset.vtsLoaderStage = context;

    const identity =
      makeVisual(root, 'vts-loader__identity', selectedPresentation.identity) ||
      makeVisual(root, 'vts-loader__identity', PRESENTATIONS.vts.identity);
    if (identity) stage.appendChild(identity);

    if (descriptor.kicker) {
      const kicker = global.document.createElement('p');
      kicker.className = 'vts-loader__kicker dash-connecting-kicker';
      kicker.textContent = descriptor.kicker;
      copyAttribute(descriptor.kickerSource, kicker, 'data-i18n');
      stage.appendChild(kicker);
    }

    const title = global.document.createElement(descriptor.compact ? 'p' : 'h2');
    title.className = 'vts-loader__title dash-connecting-title';
    title.textContent = descriptor.title;
    copyAttribute(descriptor.titleSource, title, 'id');
    copyAttribute(descriptor.titleSource, title, 'data-i18n');
    stage.appendChild(title);

    const trailWrap = global.document.createElement('div');
    trailWrap.className = 'vts-loader__trail-wrap dash-connecting-bar-wrap';

    const trail = global.document.createElement('span');
    trail.className = 'vts-loader__trail dash-connecting-bar';
    trail.setAttribute('aria-hidden', 'true');

    const rail = global.document.createElement('span');
    rail.className = 'vts-loader__trail-rail';
    const fill = global.document.createElement('span');
    fill.className = 'vts-loader__trail-fill dash-connecting-bar-fill';
    copyAttribute(descriptor.fillSource, fill, 'id');
    rail.appendChild(fill);
    trail.appendChild(rail);

    const runner = makeVeloRunner();
    if (runner) trail.appendChild(runner);
    trailWrap.appendChild(trail);

    const percent = global.document.createElement('span');
    percent.className = 'vts-loader__percent dash-connecting-bar-pct';
    copyAttribute(descriptor.percentSource, percent, 'id');
    percent.textContent = `${Math.round(descriptor.progress)}%`;
    trailWrap.appendChild(percent);
    stage.appendChild(trailWrap);

    if (descriptor.status || descriptor.statusSource?.id) {
      const status = global.document.createElement('p');
      status.className = 'vts-loader__status dash-connecting-status';
      status.textContent = descriptor.status;
      copyAttribute(descriptor.statusSource, status, 'id');
      copyAttribute(descriptor.statusSource, status, 'data-i18n');
      stage.appendChild(status);
    }

    root.replaceChildren(stage);
    root.classList.add(
      'vts-loader',
      descriptor.compact ? 'vts-loader--compact' : 'vts-loader--page'
    );
    root.classList.remove('dash-empty');
    root.dataset.vtsLoaderMounted = '1';
    root.dataset.vtsLoaderContext = context;
    root.dataset.vtsLoaderMinVisible = String(selectedPresentation.minimumVisibleMs);
    root.setAttribute('role', root.getAttribute('role') || 'status');
    root.setAttribute('aria-live', root.getAttribute('aria-live') || 'polite');
    root.setAttribute('aria-atomic', 'true');

    const state = {
      context,
      minimumVisibleMs: selectedPresentation.minimumVisibleMs,
      mountedAt: now(),
      appearedAt: null,
      pendingWaits: new Set(),
      progressObserver: null,
      visibilityObserver: null,
    };
    mountedStates.set(root, state);

    if (descriptor.indeterminate) {
      root.classList.add('is-indeterminate');
      root.setAttribute('aria-busy', 'true');
    } else {
      applyProgress(root, descriptor.progress);
    }
    observeLegacyProgress(root, fill, state);
    watchForPresentation(root, state);
    dispatchLoaderEvent(root, 'vts:loader-mounted', {
      target: root,
      context,
      minimumVisibleMs: selectedPresentation.minimumVisibleMs,
    });
    return root;
  }

  function findRoot(target) {
    if (isElement(target)) return target;
    if (typeof target !== 'string' || !global.document) return null;
    try {
      return global.document.getElementById(target) || global.document.querySelector(target);
    } catch {
      return null;
    }
  }

  function setProgress(target, percent, statusText) {
    const root = findRoot(target);
    if (!root) return false;
    const mounted = mount(root);
    if (!mounted) return false;
    applyProgress(mounted, percent);
    if (statusText !== undefined) {
      const status = ensureStatus(mounted);
      if (status) status.textContent = String(statusText || '');
    }
    return true;
  }

  function waitForMinimum(target, options = {}) {
    const root = findRoot(target);
    const state = root ? mountedStates.get(root) : null;
    if (!root || !state || state.appearedAt === null || !isPresented(root)) {
      return Promise.resolve(false);
    }

    const remaining = Math.max(0, state.minimumVisibleMs - (now() - state.appearedAt));
    if (remaining <= 0) return Promise.resolve(true);
    const signal = options?.signal;
    if (signal?.aborted) return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      let panelObserver = null;
      const finish = (completed) => {
        if (settled) return;
        settled = true;
        global.clearTimeout(timer);
        panelObserver?.disconnect();
        signal?.removeEventListener?.('abort', onAbort);
        state.pendingWaits.delete(finish);
        resolve(completed);
      };
      const onAbort = () => finish(false);
      const timer = global.setTimeout(() => finish(true), remaining);
      state.pendingWaits.add(finish);
      signal?.addEventListener?.('abort', onAbort, { once: true });

      const panel = root.closest('.tab-panel');
      if (panel && typeof global.MutationObserver === 'function') {
        panelObserver = new global.MutationObserver(() => {
          if (!isPresented(root)) finish(false);
        });
        panelObserver.observe(panel, { attributes: true, attributeFilter: ['class', 'hidden'] });
      }
    });
  }

  function getContext(target) {
    const named = typeof target === 'string' ? normalizeContext(target) : '';
    if (named) return named;
    const root = findRoot(target);
    return root ? detectContext(root) : DEFAULT_CONTEXT;
  }

  function getContextInfo(target) {
    const context = getContext(target);
    const selected = presentationFor(context);
    return Object.freeze({
      context,
      assets: collectAssetPaths(context),
      minimumVisibleMs: selected.minimumVisibleMs,
    });
  }

  function enhance(scope) {
    const root = isElement(scope) || isDocument(scope) ? scope : global.document;
    if (!root) return;
    const isDeferredByHiddenTab = (node) =>
      Boolean(node.closest?.('.tab-panel.hidden, .tab-panel[hidden], [data-tab-panel][hidden]'));
    if (isElement(root) && root.matches(SELECTOR) && !isDeferredByHiddenTab(root)) mount(root);
    root
      .querySelectorAll?.(SELECTOR)
      .forEach((node) => !isDeferredByHiddenTab(node) && mount(node));
  }

  function cleanupTree(node) {
    if (!isElement(node)) return;
    if (mountedStates.has(node)) cleanup(node);
    node
      .querySelectorAll?.('.vts-loader[data-vts-loader-mounted="1"]')
      .forEach((loader) => cleanup(loader));
  }

  function observe() {
    if (!global.document?.body) return;
    enhance(global.document);
    if (typeof global.MutationObserver !== 'function') return;
    new global.MutationObserver((records) => {
      records.forEach((record) => {
        record.removedNodes.forEach(cleanupTree);
        record.addedNodes.forEach((node) => {
          if (isElement(node)) enhance(node);
        });
      });
    }).observe(global.document.body, { childList: true, subtree: true });
  }

  global.VTSLoaderV14 = Object.freeze({
    mount,
    enhance,
    setProgress,
    getContext,
    getContextInfo,
    waitForMinimum,
    cancelMinimum(target) {
      const root = findRoot(target);
      return root ? cancelPendingWaits(root) : false;
    },
    complete(target, statusText) {
      return setProgress(target, 100, statusText);
    },
  });

  global.addEventListener('vts:loader-progress', (event) => {
    const detail = event.detail || {};
    if (!detail.target || detail.percent === undefined) return;
    setProgress(detail.target, detail.percent, detail.status);
  });

  if (!global.document) return;
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', observe, { once: true });
  } else {
    observe();
  }
})(typeof window !== 'undefined' ? window : globalThis);
