import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const buildVersion = process.env.BUILD_VERSION || makeBuildVersion();
const cacheVersion = `vts-${buildVersion.replace(/_/g, '-')}`;
const entryHtmlFiles = [
  'index.html',
  'maintenance.html',
  'admin.html',
  'eden-x1.html',
  'arcade.html',
];
const baseAppShellFiles = [
  '/',
  '/index.html',
  '/maintenance.html',
  '/404.html',
  '/site.webmanifest',
  '/site-light.webmanifest',
  '/js/admin-auth-config.js',
  '/js/app-loading.js',
  '/js/app.js',
  '/js/maintenance-config.js',
  '/js/pwa-register.js',
  '/images/logo.png',
  '/images/boot/blazing-wing-right.webp',
  '/images/boot/dreamy-wing-left.webp',
  '/css/eden-x1.css',
  '/eden-x1.html',
  '/arcade.html',
];

function makeBuildVersion() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getUTCFullYear(),
    pad(d.getUTCMonth() + 1),
    pad(d.getUTCDate()),
    '_',
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes()),
    pad(d.getUTCSeconds()),
  ].join('');
}

function readText(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function writeText(file, text) {
  fs.writeFileSync(path.join(root, file), text);
}

function updateCacheBusters() {
  for (const file of entryHtmlFiles) {
    if (!fs.existsSync(path.join(root, file))) continue;
    const html = readText(file)
      .replace(/\?v=[0-9A-Za-z_-]+/g, `?v=${buildVersion}`)
      .replace(
        /(src="js\/(?:app|admin-page)\.js)(?:\?v=[0-9A-Za-z_-]+)?"/g,
        `$1?v=${buildVersion}"`
      );
    writeText(file, html);
  }

  const adminPagePath = path.join(root, 'js', 'admin-page.js');
  if (fs.existsSync(adminPagePath)) {
    const adminPage = fs
      .readFileSync(adminPagePath, 'utf8')
      .replace(/ocr-dashboard\.js(?:\?v=[0-9A-Za-z_-]+)?/g, `ocr-dashboard.js?v=${buildVersion}`)
      .replace(/tabs\/admin\.html(?:\?v=[0-9A-Za-z_-]+)?/g, `tabs/admin.html?v=${buildVersion}`);
    fs.writeFileSync(adminPagePath, adminPage);
  }

  const appJsPath = path.join(root, 'js', 'app.js');
  if (fs.existsSync(appJsPath)) {
    const appJs = fs
      .readFileSync(appJsPath, 'utf8')
      .replace(
        /((?:app-whats-new|app-research|material-calculator|eden-map|app-strife)\.js)(?:\?v=[0-9A-Za-z_-]+)?/g,
        `$1?v=${buildVersion}`
      );
    fs.writeFileSync(appJsPath, appJs);
  }
}

function collectInlineScriptHashes(html) {
  const hashes = [];
  const inlineScriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(inlineScriptPattern)) {
    const [, attributes, body] = match;
    if (/(?:^|\s)src\s*=/i.test(attributes)) continue;
    // The HTML tokenizer normalizes CRLF/CR before CSP receives the script's
    // source string. Mirror that behavior so hashes are stable across Git
    // checkouts and match what browsers actually evaluate.
    const source = body.replace(/\r\n?/g, '\n');
    const digest = createHash('sha256').update(source).digest('base64');
    hashes.push(`'sha256-${digest}'`);
  }

  return hashes;
}

function updateCspHashes() {
  const cspMetaPattern =
    /(<meta\b(?=[^>]*\bhttp-equiv="Content-Security-Policy")[^>]*\bcontent=")([^"]*)("[^>]*>)/i;

  for (const file of entryHtmlFiles) {
    if (!fs.existsSync(path.join(root, file))) continue;
    const html = readText(file);
    const hashes = collectInlineScriptHashes(html);
    let scriptSrcFound = false;
    const nextHtml = html.replace(cspMetaPattern, (meta, start, content, end) => {
      const nextContent = content.replace(/(script-src\s+)([^;]*)/i, (directive, prefix, value) => {
        scriptSrcFound = true;
        const sources = value
          .trim()
          .split(/\s+/)
          .filter((source) => !/^'sha256-[A-Za-z0-9+/]+={0,2}'$/.test(source));
        const selfIndex = sources.indexOf("'self'");
        sources.splice(selfIndex >= 0 ? selfIndex + 1 : 0, 0, ...hashes);
        return `${prefix}${sources.join(' ')}`;
      });
      return `${start}${nextContent}${end}`;
    });

    if (hashes.length > 0 && !scriptSrcFound) {
      throw new Error(`${file} has inline scripts but no CSP script-src directive.`);
    }
    writeText(file, nextHtml);
  }
}

function publicUrlExists(url) {
  if (url === '/') return true;
  const rel = url.replace(/^\/+/, '');
  return fs.existsSync(path.join(root, rel)) || fs.existsSync(path.join(root, 'public', rel));
}

function normalizePublicAssetUrl(url) {
  if (!url || url.startsWith('#') || url.startsWith('data:')) return '';
  if (/^https?:\/\//i.test(url)) return '';
  const clean = url.split('#')[0].split('?')[0];
  return clean ? `/${clean.replace(/^\/+/, '')}` : '';
}

function collectLinkedAssets() {
  const assetPattern =
    /\b(?:href|src|content)=["']([^"']+\.(?:css|js|webp|png|webmanifest))(?:\?[^"']*)?["']/gi;
  const assets = new Set();

  for (const file of entryHtmlFiles) {
    if (!fs.existsSync(path.join(root, file))) continue;
    const html = readText(file);
    for (const match of html.matchAll(assetPattern)) {
      const asset = normalizePublicAssetUrl(match[1]);
      if (asset) assets.add(asset);
    }
  }

  return assets;
}

function buildPrecacheUrls() {
  const urls = new Set();
  for (const url of [...baseAppShellFiles, ...collectLinkedAssets()]) {
    if (!publicUrlExists(url)) continue;
    // css/js URLs are referenced with a ?v= stamp in the HTML; precache the
    // exact stamped URL so runtime requests hit the cache without ignoring
    // the query (query-insensitive matching is what used to mix versions).
    urls.add(/\.(?:css|js)$/.test(url) ? `${url}?v=${buildVersion}` : url);
  }
  if (publicUrlExists('/admin.html')) urls.add('/admin.html');
  if (publicUrlExists('/tabs/admin.html')) urls.add(`/tabs/admin.html?v=${buildVersion}`);
  return [...urls].sort((a, b) => a.localeCompare(b));
}

const MAX_CACHE_ENTRIES = 350;
const PRECACHE_BATCH_SIZE = 6;

function writeServiceWorker() {
  const urls = buildPrecacheUrls();
  const manifest = urls.map((url) => `  '${url}'`).join(',\n');
  const sw = `// Generated by scripts/update-build-metadata.mjs.
// APP_SHELL is regenerated from the built output by scripts/post-build.mjs.
const VTS_CACHE_PREFIX = 'vts-';
const CACHE_VERSION = '${cacheVersion}';
const APP_SHELL = [
${manifest}
];
const MAX_CACHE_ENTRIES = ${MAX_CACHE_ENTRIES};
const PRECACHE_BATCH_SIZE = ${PRECACHE_BATCH_SIZE};

async function batchAddUrls(cache, urls, batchSize) {
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.allSettled(batch.map((url) => cache.add(url)));
  }
}

async function batchAddAll(cache, urls, batchSize) {
  for (let i = 0; i < urls.length; i += batchSize) {
    await Promise.all(urls.slice(i, i + batchSize).map((url) => cache.add(url)));
  }
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // Evict oldest entries first (CacheStorage keys are insertion-ordered).
  const toDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(toDelete.map((request) => cache.delete(request)));
}

function isSafePublicRequest(request) {
  const url = new URL(request.url);
  return (
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    !request.headers.has('Authorization') &&
    request.credentials !== 'include'
  );
}

function responseAllowsPublicCaching(response) {
  const cacheControl = response.headers.get('Cache-Control') || '';
  return (
    response.ok &&
    !/(?:private|no-store)/i.test(cacheControl) &&
    !response.headers.has('Set-Cookie')
  );
}

function publicNetworkRequest(request, { revalidate = false } = {}) {
  const init = { credentials: 'omit' };
  if (revalidate) init.cache = 'no-cache';
  // A navigation request has credentials mode 'include'; clone from its URL
  // so the public re-fetch genuinely omits cookies.
  return request.mode === 'navigate'
    ? new Request(request.url, init)
    : new Request(request, init);
}

async function matchCurrentThenAny(request) {
  const keys = await caches.keys();
  const owned = keys.filter((key) => key.startsWith(VTS_CACHE_PREFIX)).sort().reverse();
  const ordered = [CACHE_VERSION, ...owned.filter((key) => key !== CACHE_VERSION)];
  for (const key of ordered) {
    const cached = await (await caches.open(key)).match(request);
    if (cached && responseAllowsPublicCaching(cached)) return cached;
  }
  return null;
}

// Vite content-hashed chunks and ?v=-stamped css/js never change for a given
// URL, so cache-first is safe for same-origin public assets.
function isImmutableAssetUrl(url) {
  if (url.origin !== self.location.origin) return false;
  // Vite emits content-hashed files at the top of /assets. The post-build
  // copy also places mutable game data and images under /assets, so the whole
  // directory must not be treated as immutable.
  if (/^\\/assets\\/[^/]+-[A-Za-z0-9_-]{8}\\.[A-Za-z0-9]+$/.test(url.pathname)) return true;
  return /\\.(?:css|js)$/.test(url.pathname) && url.searchParams.has('v');
}

async function cacheFirst(request) {
  const cached = await matchCurrentThenAny(request);
  if (cached) return cached;
  const response = await fetch(publicNetworkRequest(request));
  if (responseAllowsPublicCaching(response)) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
    await trimCache(cache, MAX_CACHE_ENTRIES);
  }
  return response;
}

async function networkFirst(request, { revalidate = false, cacheKey = null } = {}) {
  const key = cacheKey || request;
  try {
    const response = await fetch(publicNetworkRequest(request, { revalidate }));
    if (responseAllowsPublicCaching(response)) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(key, response.clone());
      await trimCache(cache, MAX_CACHE_ENTRIES);
      return response;
    }
    if (response.ok) return response;
    // During a rollout, a transient 404/5xx is not newer content. Keep serving
    // the last known-good public response when one exists.
    return (await matchCurrentThenAny(key)) || response;
  } catch (err) {
    const cached = await matchCurrentThenAny(key);
    if (cached) return cached;
    throw err;
  }
}

async function navigationFallback(pathname) {
  return (
    (await matchCurrentThenAny(pathname)) ||
    matchCurrentThenAny(pathname === '/' ? '/index.html' : '/404.html')
  );
}

const CRITICAL_PRECACHE_PATTERN = /\\.(?:html|css|js)(?:\\?|$)/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const critical = [];
      const bestEffort = [];
      for (const url of APP_SHELL) {
        (url === '/' || CRITICAL_PRECACHE_PATTERN.test(url) ? critical : bestEffort).push(url);
      }
      // HTML/CSS/JS precaching is all-or-nothing: activating with holes would
      // let a flaky client run an incomplete version. If any of these fails,
      // install rejects and the previous SW + its complete cache stay live.
      await batchAddAll(cache, critical, PRECACHE_BATCH_SIZE);
      await batchAddUrls(cache, bestEffort, PRECACHE_BATCH_SIZE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        // Keep the previous deploy's cache alongside the new one: this SW
        // claims already-open pages, and their old hashed chunks (deleted
        // from the server by the new deploy) can then still be resolved via
        // caches.match, which searches every cache. Anything older goes.
        const owned = keys.filter((key) => key.startsWith(VTS_CACHE_PREFIX));
        const older = owned.filter((key) => key !== CACHE_VERSION).sort();
        const keep = new Set([CACHE_VERSION, older[older.length - 1]].filter(Boolean));
        return Promise.all(
          owned.filter((key) => !keep.has(key)).map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    if (request.headers.has('Authorization')) return;
    // Key navigations by pathname so tracking queries can't fragment the
    // cache, and fall back to the same path (never another page's HTML).
    event.respondWith(
      networkFirst(request, { revalidate: true, cacheKey: url.pathname }).catch(() =>
        navigationFallback(url.pathname)
      )
    );
    return;
  }

  if (!isSafePublicRequest(request)) return;

  if (isImmutableAssetUrl(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/tabs/')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Unversioned images/data may change between releases. Revalidate them so
  // the retained previous cache cannot pin stale content indefinitely.
  event.respondWith(networkFirst(request));
});
`;
  writeText('public/sw.js', sw);
  console.log(
    `Updated build metadata ${buildVersion}; service worker precaches ${urls.length} URLs.`
  );
}

updateCacheBusters();
updateCspHashes();
writeServiceWorker();
