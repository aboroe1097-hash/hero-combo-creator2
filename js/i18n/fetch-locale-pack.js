const DEFAULT_LOCALE_PACK_TIMEOUT_MS = 8000;

export async function fetchLocalePack(
  url,
  fetcher = globalThis.fetch,
  timeoutMs = DEFAULT_LOCALE_PACK_TIMEOUT_MS
) {
  if (typeof fetcher !== 'function') throw new Error('Locale pack fetch is unavailable.');

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const boundedTimeout = Number.isFinite(timeoutMs)
    ? Math.max(1, timeoutMs)
    : DEFAULT_LOCALE_PACK_TIMEOUT_MS;
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      reject(new Error('Locale pack request timed out.'));
    }, boundedTimeout);
  });

  try {
    const request = Promise.resolve().then(() =>
      fetcher(url, {
        cache: 'force-cache',
        ...(controller ? { signal: controller.signal } : {}),
      })
    );
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}
