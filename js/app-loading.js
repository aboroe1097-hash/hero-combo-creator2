/**
 * Keep the app shell available immediately. The former cinematic boot and
 * first-visit entry gates were intentionally retired in v14.
 */

function revealAppShell() {
  document.body.classList.remove('app-booting', 'first-visit-active');
  document.body.classList.add('app-ready');
  document.documentElement.classList.remove('first-visit-active');

  const app = document.getElementById('app');
  if (!app) return;
  app.classList.remove('app-shell--hidden');
  app.classList.add('app-shell--revealed');
}

export function initAppLoading() {
  revealAppShell();
}

export async function notifyAppReady() {
  revealAppShell();
}
