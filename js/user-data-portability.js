import { loadPlayerProfile, savePlayerProfileLocal, syncPlayerProfileToCloud } from './player-profile.js';

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readLocalStorageSnapshot() {
  const items = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) items[key] = localStorage.getItem(key);
  }
  return items;
}

function createModal() {
  const modal = document.createElement('div');
  modal.className = 'data-portability-modal hidden';
  modal.innerHTML = `
    <div class="data-portability-card" role="dialog" aria-modal="true" aria-labelledby="dataPortabilityTitle">
      <button type="button" class="data-portability-close" aria-label="Close">X</button>
      <h3 id="dataPortabilityTitle">User Data</h3>
      <p>Export or import your local app data, including saved settings and roster profile.</p>
      <div class="data-portability-actions">
        <button type="button" data-export-user-data>Export JSON</button>
        <button type="button" data-import-user-data>Import JSON</button>
      </div>
      <input type="file" accept="application/json,.json" hidden>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

export function initUserDataPortability() {
  if (document.documentElement.dataset.dataPortabilityWired === '1') return;
  document.documentElement.dataset.dataPortabilityWired = '1';

  const button = document.createElement('button');
  button.id = 'userDataBtn';
  button.type = 'button';
  button.className = 'floating-tool-btn floating-tool-btn--data';
  button.title = 'Export or import user data';
  button.setAttribute('aria-label', 'Export or import user data');
  button.innerHTML = '<span>Data</span>';
  document.body.appendChild(button);

  const modal = createModal();
  const fileInput = modal.querySelector('input[type="file"]');
  const close = () => modal.classList.add('hidden');
  button.addEventListener('click', () => modal.classList.remove('hidden'));
  modal.querySelector('.data-portability-close')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });

  modal.querySelector('[data-export-user-data]')?.addEventListener('click', () => {
    downloadJson(`vts-user-data-${new Date().toISOString().slice(0, 10)}.json`, {
      version: 1,
      exportedAt: new Date().toISOString(),
      origin: location.origin,
      localStorage: readLocalStorageSnapshot(),
      cloudProfile: loadPlayerProfile(),
    });
    if (typeof window.showToast === 'function') window.showToast('User data exported.', 'success');
  });

  modal.querySelector('[data-import-user-data]')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'));
        const items = data.localStorage || {};
        Object.entries(items).forEach(([key, value]) => {
          if (typeof key === 'string' && typeof value === 'string') localStorage.setItem(key, value);
        });
        if (data.cloudProfile) {
          savePlayerProfileLocal(data.cloudProfile);
          await syncPlayerProfileToCloud(data.cloudProfile);
        }
        if (typeof window.showToast === 'function') window.showToast('User data imported. Reloading...', 'success', 1200);
        window.setTimeout(() => location.reload(), 900);
      } catch (err) {
        console.warn('Import failed:', err);
        if (typeof window.showToast === 'function') window.showToast('Invalid import file.', 'error');
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
}
