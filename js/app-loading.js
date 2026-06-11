/**
 * Boot splash and first-visit intro.
 */

const INTRO_STORAGE_KEY = 'vts_intro_v1_seen';
const MIN_BOOT_MS = 1000;

const BOOT_STATUS_LINES = [
    'Warming up hero database…',
    'Syncing combo rankings…',
    'Preparing Eden map layers…',
    'Loading academy tech trees…',
    'Almost ready…',
];

let bootStartedAt = performance.now();
let bootProgressTimer = null;
let statusCycleTimer = null;

function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getSplash() {
    return document.getElementById('appBootSplash');
}

function getIntro() {
    return document.getElementById('firstVisitIntro');
}

function setBootStatus(text) {
    const el = document.querySelector('.boot-status-text');
    if (el) el.textContent = text;
}

function setBootProgress(pct) {
    const fill = document.querySelector('.boot-progress-fill');
    if (fill) fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

function startBootAnimations() {
    let progress = 8;
    let statusIdx = 0;
    setBootProgress(progress);
    setBootStatus(BOOT_STATUS_LINES[0]);

    bootProgressTimer = window.setInterval(() => {
        const cap = 88;
        const step = progress < 40 ? 4.5 : progress < 70 ? 2.2 : 0.8;
        progress = Math.min(cap, progress + step);
        setBootProgress(progress);
    }, 140);

    statusCycleTimer = window.setInterval(() => {
        statusIdx = (statusIdx + 1) % BOOT_STATUS_LINES.length;
        setBootStatus(BOOT_STATUS_LINES[statusIdx]);
    }, 720);
}

function stopBootAnimations(finalPct = 100) {
    if (bootProgressTimer) window.clearInterval(bootProgressTimer);
    if (statusCycleTimer) window.clearInterval(statusCycleTimer);
    bootProgressTimer = null;
    statusCycleTimer = null;
    setBootProgress(finalPct);
    setBootStatus('Ready');
}

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function dismissBootSplash() {
    const splash = getSplash();
    if (!splash) return;

    // Trigger door opening and light expansion animations
    const doorLeft = document.getElementById('doorLeft');
    const doorRight = document.getElementById('doorRight');
    const centerLight = document.getElementById('centerLight');
    const statusContainer = document.getElementById('loadingStatusContainer');

    if (doorLeft) doorLeft.classList.add('door-open-left');
    if (doorRight) doorRight.classList.add('door-open-right');
    if (centerLight) centerLight.classList.add('light-expand');
    if (statusContainer) statusContainer.classList.add('title-fade');

    // Wait for the door swinging and golden light flash animation to complete
    await sleep(2600);

    // Fade out the entire boot-splash overlay
    splash.classList.add('boot-splash--out');
    await sleep(prefersReducedMotion() ? 80 : 900);

    splash.classList.add('hidden');
    splash.setAttribute('aria-hidden', 'true');
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
}

export async function notifyAppReady() {
    const elapsed = performance.now() - bootStartedAt;
    await sleep(Math.max(0, MIN_BOOT_MS - elapsed));
    stopBootAnimations(100);

    await dismissBootSplash();

    const isFirstVisit = !localStorage.getItem(INTRO_STORAGE_KEY);
    if (isFirstVisit) {
        await playFirstVisitIntro();
    }
    if (!localStorage.getItem(INTRO_STORAGE_KEY)) {
        localStorage.setItem(INTRO_STORAGE_KEY, '1');
    }

    revealAppShell();
}
