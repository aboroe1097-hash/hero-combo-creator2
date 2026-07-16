import { simulateBattleBatch } from './battle-simulator-engine.js';

export function runBattleBatchWorkerRequest({ config, options } = {}) {
  return simulateBattleBatch(config, options);
}

function serializeError(error) {
  return {
    name: String(error?.name || 'Error'),
    message: String(error?.message || 'The batch simulation failed.'),
  };
}

if (typeof self !== 'undefined') {
  self.addEventListener('message', (event) => {
    try {
      self.postMessage({ ok: true, result: runBattleBatchWorkerRequest(event.data) });
    } catch (error) {
      self.postMessage({ ok: false, error: serializeError(error) });
    }
  });
}
