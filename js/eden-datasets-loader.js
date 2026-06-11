let cachedStore = null;
let loadPromise = null;

async function decodePayload(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const json = await new Response(stream).text();
  return JSON.parse(json);
}

export async function loadEdenDatasetStore() {
  if (cachedStore) return cachedStore;
  if (!loadPromise) {
    loadPromise = (async () => {
      const mod = await import('./eden-datasets.payload.js');
      const data = await decodePayload(mod.EDEN_DATASETS_PAYLOAD);
      cachedStore = {
        builtAt: data.builtAt,
        catalog: data.catalog || [],
        sectors: data.sectors || {},
        overlays: data.overlays || {},
      };
      return cachedStore;
    })();
  }
  return loadPromise;
}