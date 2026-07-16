import { requireSensitiveAdminPin } from './admin-pin-gate.js';

const mount = document.getElementById('battleSimulatorMount');

function showBootError() {
  if (!mount) return;
  document.body.classList.remove('is-locked');
  mount.hidden = false;
  mount.innerHTML = `
    <main class="battle-noscript" role="alert">
      <img src="images/logo-120.webp" alt="" width="80" height="80" />
      <h1>Battle Simulator could not start</h1>
      <p>An updated simulator file failed to load. Refresh once, or return to the tool hub.</p>
      <div class="battle-boot-actions">
        <button type="button" data-battle-refresh>Refresh</button>
        <a href="index.html">Back to tools</a>
      </div>
    </main>`;
  mount.querySelector('[data-battle-refresh]')?.addEventListener('click', () => location.reload());
}

async function start() {
  const unlocked = await requireSensitiveAdminPin({
    kicker: 'BATTLE SIMULATOR · BETA',
    title: 'Beta Testers Only',
    prompt:
      'Only Beta Testers are allowed to access the Battle Simulator. Enter the beta tester PIN to continue.',
    label: 'Beta tester PIN',
    error: 'Incorrect PIN. Access is limited to Beta Testers.',
    cancel: 'Back to tools',
    unlock: 'Enter beta',
    unconfiguredTitle: 'Beta Testers Only',
    unconfiguredPrompt:
      'The Beta Tester PIN is not configured for this deployment. Return to the tool hub and contact the site owner.',
  });

  if (!unlocked) {
    location.assign('index.html');
    return;
  }

  try {
    const { mountBattleSimulator } = await import('./battle-simulator-app.js');
    document.body.classList.remove('is-locked');
    if (mount) mount.hidden = false;
    mountBattleSimulator(mount);
    window.VTS_ASSET_RECOVERY?.markBootComplete?.();
  } catch (error) {
    console.error('[battle-simulator] startup failed', error);
    showBootError();
    window.VTS_ASSET_RECOVERY?.reportFailure?.(error);
  }
}

start();
