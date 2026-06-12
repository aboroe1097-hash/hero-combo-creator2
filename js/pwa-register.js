// js/pwa-register.js - Service worker registration & install prompt
const SW_PATH = '/sw.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      console.log('SW registered:', reg.scope);
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
