import { initializeAccountSync } from './account-sync.js';
let started = false;
export async function bootAccountSync() {
  if (started) return;
  started = true;
  const { registerWaveOneAccountSyncAdapters } = await import('./account-sync-adapters.js');
  registerWaveOneAccountSyncAdapters();
  initializeAccountSync();
}
