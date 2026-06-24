/**
 * Boot splash and first-visit intro.
 */

const INTRO_STORAGE_KEY = 'vts_intro_v1_seen';
const MIN_BOOT_MS = 450;

const BOOT_STATUS_LINES = [
    'Sealing the aurora gate...',
    'Unfurling wing sigils...',
    'Syncing hero command deck...',
    'Charging combo matrix...',
    'Priming Eden map layers...',
    'Opening VTS command...',
];

let bootStartedAt = performance.now();
let bootProgressTimer = null;
let statusCycleTimer = null;
let statusSwapTimer = null;
let bootParallaxWired = false;
let bootParallaxHandler = null;
let featherLeftSpans = null;
let featherRightSpans = null;
let bootPerspectiveContainer = null;

function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getSplash() {
    return document.getElementById('appBootSplash');
}

function getIntro() {
    return document.getElementById('firstVisitIntro');
}

function setBootStatus(text, options = {}) {
    const el = document.querySelector('.boot-status-text');
    if (!el || el.textContent === text) return;

    if (statusSwapTimer) {
        window.clearTimeout(statusSwapTimer);
        statusSwapTimer = null;
    }

    if (options.instant || prefersReducedMotion()) {
        el.classList.remove('is-swapping');
        el.textContent = text;
        return;
    }

    el.classList.add('is-swapping');
    statusSwapTimer = window.setTimeout(() => {
        el.textContent = text;
        el.classList.remove('is-swapping');
        statusSwapTimer = null;
    }, 120);
}

function setBootProgress(pct) {
    const clamped = Math.min(100, Math.max(0, pct));
    const fill = document.querySelector('.boot-progress-fill');
    if (fill) fill.style.width = `${clamped}%`;
    igniteFeathers(clamped);
}

// 14 feathers total, 7 per wing. Light them in sequence as progress climbs
// so the wings themselves become a second loading meter instead of decoration.
function igniteFeathers(pct) {
    if (!featherLeftSpans) featherLeftSpans = document.querySelectorAll('#doorLeft .door-wing span');
    if (!featherRightSpans) featherRightSpans = document.querySelectorAll('#doorRight .door-wing span');
    if (!bootPerspectiveContainer) bootPerspectiveContainer = document.getElementById('perspectiveContainer');

    const litCount = Math.floor((pct / 100) * 14);

    featherLeftSpans.forEach((el, i) => {
        el.classList.toggle('is-lit', i < litCount);
    });
    featherRightSpans.forEach((el, i) => {
        el.classList.toggle('is-lit', i < litCount - 7);
    });

    if (bootPerspectiveContainer) {
        const duration = 2.6 - (pct / 100) * 1.3;
        bootPerspectiveContainer.style.setProperty('--wing-flap-duration', `${duration.toFixed(2)}s`);
    }
}

function startBootAnimations() {
    let progress = 8;
    let statusIdx = 0;
    seedBootParticles();
    initBootParallax();
    setBootProgress(progress);
    setBootStatus(BOOT_STATUS_LINES[0], { instant: true });

    bootProgressTimer = window.setInterval(() => {
        const cap = 88;
        const step = progress < 40 ? 6.5 : progress < 70 ? 3.2 : 1.2;
        progress = Math.min(cap, progress + step);
        setBootProgress(progress);
    }, 100);

    statusCycleTimer = window.setInterval(() => {
        statusIdx = (statusIdx + 1) % BOOT_STATUS_LINES.length;
        setBootStatus(BOOT_STATUS_LINES[statusIdx]);
    }, 500);
}

function stopBootAnimations(finalPct = 100) {
    if (bootProgressTimer) window.clearInterval(bootProgressTimer);
    if (statusCycleTimer) window.clearInterval(statusCycleTimer);
    if (statusSwapTimer) window.clearTimeout(statusSwapTimer);
    bootProgressTimer = null;
    statusCycleTimer = null;
    statusSwapTimer = null;
    setBootProgress(finalPct);
    statusSwapTimer = window.setTimeout(() => {
        setBootStatus('Ready', { instant: true });
        statusSwapTimer = null;
    }, prefersReducedMotion() ? 0 : 180);
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function seedBootParticles() {
    const layer = document.getElementById('bootParticles');
    if (!layer || layer.dataset.seeded === '1' || prefersReducedMotion()) return;

    layer.dataset.seeded = '1';
    layer.textContent = '';

    const makeParticle = (side, index) => {
        const el = document.createElement('span');
        const isIce = side === 'ice';
        el.className = `boot-particle boot-particle--${side}`;
        const left = isIce ? 5 + Math.random() * 39 : 56 + Math.random() * 39;
        const drift = (isIce ? 1 : -1) * (14 + Math.random() * 46);
        const size = 2 + Math.random() * 5;
        const duration = 3.8 + Math.random() * 3.4;
        const delay = -Math.random() * duration + index * 0.025;
        el.style.setProperty('--particle-left', `${left.toFixed(2)}%`);
        el.style.setProperty('--particle-drift', `${drift.toFixed(1)}px`);
        el.style.setProperty('--particle-size', `${size.toFixed(1)}px`);
        el.style.setProperty('--particle-duration', `${duration.toFixed(2)}s`);
        el.style.setProperty('--particle-delay', `${delay.toFixed(2)}s`);
        el.style.setProperty('--particle-opacity', `${(0.42 + Math.random() * 0.48).toFixed(2)}`);
        return el;
    };

    const frag = document.createDocumentFragment();
    for (let i = 0; i < 42; i += 1) {
        frag.appendChild(makeParticle(i % 2 === 0 ? 'ice' : 'fire', i));
    }
    layer.appendChild(frag);
}

function initBootParallax() {
    if (bootParallaxWired || prefersReducedMotion()) return;
    const container = document.getElementById('perspectiveContainer');
    const splash = getSplash();
    if (!container || !splash) return;

    bootParallaxWired = true;
    let raf = 0;
    let nextX = 0;
    let nextY = 0;

    bootParallaxHandler = (event) => {
        if (splash.classList.contains('hidden') || splash.classList.contains('boot-splash--out')) return;
        nextX = ((event.clientX / Math.max(1, window.innerWidth)) - 0.5) * 12;
        nextY = ((event.clientY / Math.max(1, window.innerHeight)) - 0.5) * 10;
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
            container.style.setProperty('--boot-tilt-x', `${nextX.toFixed(2)}px`);
            container.style.setProperty('--boot-tilt-y', `${nextY.toFixed(2)}px`);
            raf = 0;
        });
    };
    window.addEventListener('pointermove', bootParallaxHandler, { passive: true });
}

function stopBootParallax() {
    if (bootParallaxHandler) {
        window.removeEventListener('pointermove', bootParallaxHandler);
        bootParallaxHandler = null;
    }
}

async function dismissBootSplash() {
    const splash = getSplash();
    if (!splash) return;

    splash.classList.add('boot-splash--opening');

    // Trigger the wing reveal and light expansion animations.
    const doorLeft = document.getElementById('doorLeft');
    const doorRight = document.getElementById('doorRight');
    const centerLight = document.getElementById('centerLight');
    const statusContainer = document.getElementById('loadingStatusContainer');

    if (doorLeft) doorLeft.classList.add('door-open-left');
    if (doorRight) doorRight.classList.add('door-open-right');
    if (centerLight) centerLight.classList.add('light-expand');
    if (statusContainer) statusContainer.classList.add('title-fade');

    // Wait for the wing unfurl and light flash animation to complete.
    await sleep(prefersReducedMotion() ? 80 : 1600);

    // Fade out the entire boot-splash overlay
    splash.classList.add('boot-splash--out');
    await sleep(prefersReducedMotion() ? 80 : 500);

    splash.classList.add('hidden');
    splash.setAttribute('aria-hidden', 'true');

    // Clean up the parallax listener now that the splash is gone
    stopBootParallax();
}

async function playFirstVisitIntro() {
    const intro = getIntro();
    if (!intro || prefersReducedMotion()) return;

    intro.classList.remove('hidden');
    intro.setAttribute('aria-hidden', 'false');
    document.body.classList.add('first-visit-active');

    const dismiss = () => finishIntro(intro);
    const enterBtn = intro.querySelector('.intro-enter-btn');
    const onSkip = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        dismiss();
    };

    enterBtn?.addEventListener('click', onSkip, { once: true });
    window.addEventListener('keydown', onSkip, { once: true });

    await sleep(4200);
    if (!intro.classList.contains('intro--done')) dismiss();
}

async function finishIntro(intro) {
    if (!intro || intro.classList.contains('intro--done')) return;
    intro.classList.add('intro--done', 'intro--out');
    document.body.classList.remove('first-visit-active');
    await sleep(560);
    intro.classList.add('hidden');
    intro.setAttribute('aria-hidden', 'true');
    localStorage.setItem(INTRO_STORAGE_KEY, '1');
}

function revealAppShell() {
    document.body.classList.remove('app-booting');
    document.body.classList.add('app-ready');
    const app = document.getElementById('app');
    if (app) {
        app.classList.remove('app-shell--hidden');
        app.classList.add('app-shell--revealed');
    }
}

export function initAppLoading() {
    bootStartedAt = performance.now();
    document.body.classList.add('app-booting');
    startBootAnimations();

    setTimeout(() => {
        const splash = getSplash();
        if (splash && !splash.classList.contains('hidden')) {
            console.warn('[Boot] Force-dismissing loading screen after timeout');
            stopBootAnimations(100);
            dismissBootSplash().then(() => revealAppShell()).catch(() => {});
        }
    }, 5000);
}

export async function notifyAppReady(options = {}) {
    const { skipIntro = false } = options;
    const elapsed = performance.now() - bootStartedAt;
    await sleep(Math.max(0, MIN_BOOT_MS - elapsed));
    stopBootAnimations(100);

    const isFirstVisit = !skipIntro && !localStorage.getItem(INTRO_STORAGE_KEY);
    await dismissBootSplash();

    if (isFirstVisit) {
        await playFirstVisitIntro();
    }
    if (!skipIntro && !localStorage.getItem(INTRO_STORAGE_KEY)) {
        localStorage.setItem(INTRO_STORAGE_KEY, '1');
    }

    revealAppShell();
}
