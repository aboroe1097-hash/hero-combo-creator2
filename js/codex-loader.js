// js/codex-loader.js
// Lazy fetch-and-cache loader for js/codex-payload.json (gzip + base64 envelope),
// mirroring js/eden-datasets-loader.js. Import this ONLY from lazy feature
// modules - the codex payload must contribute zero eager bytes to any route.

let cachedStore = null;
let loadPromise = null;

async function decodePayload(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const json = await new Response(stream).text();
  return JSON.parse(json);
}

export async function loadCodexStore() {
  if (cachedStore) return cachedStore;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const res = await fetch('js/codex-payload.json');
        if (!res.ok) throw new Error(`Codex payload failed: HTTP ${res.status}`);
        const payload = await res.json();
        const data = payload?.encoding === 'gzip-base64'
          ? await decodePayload(payload.payload)
          : payload;
        cachedStore = {
          builtAt: data.builtAt,
          catalog: data.catalog || [],
          datasets: data.datasets || {},
          aliases: data.aliases || {},
          currentVersions: data.currentVersions || {},
          quarantine: data.quarantine || [],
        };
        return cachedStore;
      } catch (error) {
        loadPromise = null;
        throw error;
      }
    })();
  }
  return loadPromise;
}
