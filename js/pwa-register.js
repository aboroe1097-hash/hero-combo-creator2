// js/pwa-register.js - Service worker registration & install prompt
const SW_PATH = '/sw.js';

function notifyServiceWorkerUpdate() {
  if (typeof window.showToast === 'function') {
    window.showToast('New version available - refresh to update.', 'info', 8000);
  }
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env?.DEV) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistration('/').then((reg) => reg?.unregister()).catch(() => {});
    });
    return;
  }
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/', updateViaCache: 'none' });
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
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('installAppBtn');
    if (btn) {
      btn.classList.remove('hidden');
      btn.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') btn.classList.add('hidden');
        deferredPrompt = null;
      };
    }
  });
}
