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
      const res = await fetch('js/eden-datasets.payload.json');
      if (!res.ok) throw new Error(`Eden dataset payload failed: HTTP ${res.status}`);
      const payload = await res.json();
      const data = payload?.encoding === 'gzip-base64'
        ? await decodePayload(payload.payload)
        : payload;
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
