import {
  applyBattleSimulatorDocumentLocale,
  createBattleSimulatorTranslator,
  loadBattleSimulatorLocale,
  readPreferredBattleSimulatorLocale,
} from './battle-simulator-i18n.js';

const mount = document.getElementById('battleSimulatorMount');
let translator = createBattleSimulatorTranslator('en');

function showBootError() {
  if (!mount) return;
  document.body.classList.remove('is-locked');
  mount.hidden = false;
  mount.innerHTML = `
    <main class="battle-noscript" role="alert">
      <img src="images/logo-120.webp" alt="" width="80" height="80" />
      <h1>${translator.t('boot.title')}</h1>
      <p>${translator.t('boot.copy')}</p>
      <div class="battle-boot-actions">
        <button type="button" data-battle-refresh>${translator.t('boot.refresh')}</button>
        <a href="index.html">${translator.t('nav.back')}</a>
      </div>
    </main>`;
  mount.querySelector('[data-battle-refresh]')?.addEventListener('click', () => location.reload());
}

async function start() {
  const locale = readPreferredBattleSimulatorLocale();
  await loadBattleSimulatorLocale(locale);
  translator = createBattleSimulatorTranslator(locale);
  applyBattleSimulatorDocumentLocale(document, locale);

  // The Battle Simulator was behind the shared admin PIN. That PIN is gone —
  // it protected nothing on the server — and this route is a calculator over
  // public game data with no privileged reads, so it needs no gate at all.
  // Anything genuinely privileged lives in VTS Admin behind the superadmin
  // claim, which Firestore rules enforce.

  try {
    const { mountBattleSimulator } = await import('./battle-simulator-app.js');
    document.body.classList.remove('is-locked');
    if (mount) mount.hidden = false;
    await mountBattleSimulator(mount, { locale });
    window.VTS_ASSET_RECOVERY?.markBootComplete?.();
  } catch (error) {
    console.error('[battle-simulator] startup failed', error);
    showBootError();
    window.VTS_ASSET_RECOVERY?.reportFailure?.(error);
  }
}

start();
