// js/pwa-register.js - Service worker registration & install prompt
const SW_PATH = '/sw.js';

function notifyServiceWorkerUpdate() {
  if (typeof window.showToast === 'function') {
    window.showToast('New version available - refresh to update.', 'info', 8000);
  }
}

// startApp can call this after the window 'load' event has already fired
// (slow networks delay module init past load), so a bare load listener would
// never run. Run immediately when the document is already complete.
function runWhenLoaded(fn) {
  if (document.readyState === 'complete') fn();
  else window.addEventListener('load', fn, { once: true });
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env?.DEV) {
    runWhenLoaded(() => {
      navigator.serviceWorker
        .getRegistration('/')
        .then((reg) => reg?.unregister())
        .catch(() => {});
    });
    return;
  }
  runWhenLoaded(async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/',
        updateViaCache: 'none',
      });
      let updateNotified = false;
      const maybeNotifyUpdate = () => {
        if (updateNotified || !navigator.serviceWorker.controller) return;
        updateNotified = true;
        notifyServiceWorkerUpdate();
      };
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'activated') maybeNotifyUpdate();
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', maybeNotifyUpdate);
      await reg.update();
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  });
}

export function setupInstallPrompt() {
  let deferredPrompt = null;
  const A2HS_LS = 'a2hs-dismiss';
  const A2HS_COOLDOWN = 30 * 24 * 60 * 60 * 1000;

  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function a2hsDismissed() {
    try {
      const t = localStorage.getItem(A2HS_LS);
      return !!t && Date.now() - Number(t) < A2HS_COOLDOWN;
    } catch {
      return false;
    }
  }

  function dismissA2hs() {
    try {
      localStorage.setItem(A2HS_LS, String(Date.now()));
    } catch {}
    document.querySelectorAll('.a2hs-banner').forEach((el) => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 260);
    });
  }

  function createBanner(installFn) {
    if (a2hsDismissed()) return;
    const wrap = document.querySelector('.a2hs-banner');
    if (wrap) return;

    const banner = document.createElement('div');
    banner.className = 'a2hs-banner';
    banner.setAttribute('role', 'alert');

    const hasInstall = typeof installFn === 'function';
    const svgIcon =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

    banner.innerHTML = hasInstall
      ? `<button class="a2hs-banner-close" aria-label="Dismiss">&times;</button>
         <div class="a2hs-banner-msg">
           <span class="a2hs-banner-icon">${svgIcon}</span>
           <div class="a2hs-banner-text">
             <div class="a2hs-banner-title">Install VTS Combos</div>
             <div class="a2hs-banner-sub">One-tap access &middot; Works offline</div>
           </div>
         </div>
         <button class="a2hs-banner-install" type="button">Install</button>`
      : `<button class="a2hs-banner-close" aria-label="Dismiss">&times;</button>
         <div class="a2hs-banner-msg">
           <span class="a2hs-banner-icon">${svgIcon}</span>
           <div class="a2hs-banner-text">
             <div class="a2hs-banner-title">Add to Home Screen</div>
             <div class="a2hs-banner-sub">Tap <strong>Share</strong> &rarr; <strong>Add to Home Screen</strong></div>
           </div>
         </div>`;

    banner.querySelector('.a2hs-banner-close')?.addEventListener('click', dismissA2hs);

    const installBtn = banner.querySelector('.a2hs-banner-install');
    if (installBtn && installFn) {
      installBtn.addEventListener('click', () => {
        installBtn.disabled = true;
        installBtn.textContent = 'Installing\u2026';
        installFn();
      });
    }

    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('visible')));
  }

  /* ── Desktop: existing small button in command bar ── */
  const btn = document.getElementById('installAppBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btn) btn.classList.remove('hidden');

    if (isMobile) {
      createBanner(async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if (btn) btn.classList.add('hidden');
          dismissA2hs();
        }
        deferredPrompt = null;
      });
    } else if (btn) {
      /* desktop: wire button directly */
      btn.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') btn.classList.add('hidden');
        deferredPrompt = null;
      };
    }
  });

  /* ── Post-install cleanup ── */
  window.addEventListener('appinstalled', () => {
    dismissA2hs();
    if (btn) btn.classList.add('hidden');
    deferredPrompt = null;
  });

  /* ── iOS informational banner (no beforeinstallprompt fires) ── */
  if (isMobile && isIOS && !window.navigator.standalone) {
    createBanner();
  }
}
