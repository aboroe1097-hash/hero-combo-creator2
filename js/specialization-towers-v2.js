const mount = document.getElementById('specializationTowersMount');

function showBootError() {
  if (!mount) return;
  mount.innerHTML = `
    <main class="specialization-boot-message" role="alert">
      <img src="images/logo-120.webp" alt="" width="80" height="80" />
      <h1>Specialization Towers could not start</h1>
      <p>An updated tool file failed to load. Refresh once, or return to Research.</p>
      <div class="specialization-boot-actions">
        <button type="button" data-specialization-refresh>Refresh</button>
        <a href="index.html#research">Back to Research</a>
      </div>
    </main>`;
  mount
    .querySelector('[data-specialization-refresh]')
    ?.addEventListener('click', () => window.location.replace(window.location.href));
}

async function start() {
  try {
    const { mountSpecializationTowers } = await import('./specialization-towers-v2-app.js');
    mountSpecializationTowers(mount);
    window.VTS_ASSET_RECOVERY?.markBootComplete?.();
  } catch (error) {
    console.error('[specialization-towers-v2] startup failed', error);
    showBootError();
    window.VTS_ASSET_RECOVERY?.reportFailure?.(error);
  }
}

start();
