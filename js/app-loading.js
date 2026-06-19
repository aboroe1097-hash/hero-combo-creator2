/**
 * Boot splash and first-visit intro.
 */

const INTRO_STORAGE_KEY = 'vts_intro_v1_seen';
const MIN_BOOT_MS = 850;

// Web Audio API cinematic synthesis for loading screen doors
let audioCtx = null;

function initAudio() {
    if (audioCtx) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    } catch (e) {
        console.warn('AudioContext initialization failed:', e);
    }
}

// Unmute/unlock audio context on any user click or tap
if (typeof window !== 'undefined') {
    const unlock = () => {
        initAudio();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('click', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('click', unlock);
}

function playTransitionSound() {
    // Disabled as per user request
    return;

    try {
        const now = audioCtx.currentTime;

        // 1. Deep stone door rumble (two detuned low sawtooth oscillators)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gainNode = audioCtx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(52, now); // G#1
        osc1.frequency.exponentialRampToValueAtTime(28, now + 2.6);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(52.5, now); // slightly detuned
        osc2.frequency.exponentialRampToValueAtTime(28.4, now + 2.6);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(130, now);
        filter.frequency.exponentialRampToValueAtTime(32, now + 2.6);
        filter.Q.setValueAtTime(10, now);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.35, now + 0.8);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.6);
        osc2.stop(now + 2.6);

        // 2. Shimmering golden light flare (bandpassed triangle wave sweeping up)
        const oscShimmer = audioCtx.createOscillator();
        const oscShimmer2 = audioCtx.createOscillator();
        const shimmerFilter = audioCtx.createBiquadFilter();
        const shimmerGain = audioCtx.createGain();

        oscShimmer.type = 'triangle';
        oscShimmer.frequency.setValueAtTime(160, now);
        oscShimmer.frequency.exponentialRampToValueAtTime(680, now + 2.0);

        oscShimmer2.type = 'sine';
        oscShimmer2.frequency.setValueAtTime(162, now);
        oscShimmer2.frequency.exponentialRampToValueAtTime(685, now + 2.0);

        shimmerFilter.type = 'bandpass';
        shimmerFilter.frequency.setValueAtTime(300, now);
        shimmerFilter.frequency.exponentialRampToValueAtTime(1600, now + 2.0);
        shimmerFilter.Q.setValueAtTime(3, now);

        shimmerGain.gain.setValueAtTime(0.001, now);
        shimmerGain.gain.linearRampToValueAtTime(0.09, now + 0.9);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

        oscShimmer.connect(shimmerFilter);
        oscShimmer2.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerGain.connect(audioCtx.destination);

        oscShimmer.start(now);
        oscShimmer2.start(now);
        oscShimmer.stop(now + 2.3);
        oscShimmer2.stop(now + 2.3);

    } catch (e) {
        console.warn('Cinematic audio synthesis failed:', e);
    }
}

const BOOT_STATUS_LINES = [
    'Sealing the war gate...',
    'Unfurling wing sigils...',
    'Syncing hero command deck...',
    'Charging combo matrix...',
    'Priming Eden map layers...',
    'Opening VTS command...',
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

    playTransitionSound();

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
    await sleep(1400);

    // Fade out the entire boot-splash overlay
    splash.classList.add('boot-splash--out');
    await sleep(prefersReducedMotion() ? 80 : 500);

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

    setTimeout(() => {
        const splash = getSplash();
        if (splash && !splash.classList.contains('hidden')) {
            console.warn('[Boot] Force-dismissing loading screen after timeout');
            dismissBootSplash().then(() => revealAppShell()).catch(() => {});
        }
    }, 5000);
}

export async function notifyAppReady() {
    const elapsed = performance.now() - bootStartedAt;
    await sleep(Math.max(0, MIN_BOOT_MS - elapsed));
    stopBootAnimations(100);

    const isFirstVisit = !localStorage.getItem(INTRO_STORAGE_KEY);
    await dismissBootSplash();

    if (isFirstVisit) {
        await playFirstVisitIntro();
    }
    if (!localStorage.getItem(INTRO_STORAGE_KEY)) {
        localStorage.setItem(INTRO_STORAGE_KEY, '1');
    }

    revealAppShell();
}
