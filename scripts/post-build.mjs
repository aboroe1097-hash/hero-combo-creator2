import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

// Directories copied as-is (not processed by Vite).
const copyDirs = ['css', 'images', 'assets', 'tabs', 'workers'];

// Files copied as-is. index.html is intentionally excluded so Vite's
// bundled HTML (with hashed asset references) is preserved. ES modules
// in js/ are bundled by Vite; only plain non-module scripts are copied.
const copyFiles = [
  'CNAME',
  'CHANGELOG.md',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest',
  'site-light.webmanifest',
  '.nojekyll',
  '.htaccess',
  'public/404.html',
  'public/sw.js',
  'js/eden-datasets.payload.json',
  'js/theme-prepaint.js',
  'js/admin-auth-config.js',
  'js/maintenance-config.js',
  'js/index-page-enhancements.js',
];
const copyDest = {
  'public/404.html': '404.html',
  'public/sw.js': 'sw.js',
  'js/eden-datasets.payload.json': 'js/eden-datasets.payload.json',
  'js/theme-prepaint.js': 'js/theme-prepaint.js',
  'js/admin-auth-config.js': 'js/admin-auth-config.js',
  'js/maintenance-config.js': 'js/maintenance-config.js',
  'js/index-page-enhancements.js': 'js/index-page-enhancements.js',
};

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
}

for (const dir of copyDirs) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) copyRecursive(src, path.join(dist, dir));
}

for (const file of copyFiles) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) continue;
  const destName = copyDest[file] || path.basename(file);
  const destDir = path.dirname(destName);
  if (destDir !== '.') fs.mkdirSync(path.join(dist, destDir), { recursive: true });
  fs.copyFileSync(src, path.join(dist, destName));
}

// Regenerate the service worker's APP_SHELL from what actually shipped, so a
// deploy's precache is the complete, internally consistent asset set (built
// HTML, its exact ?v=-stamped links, and every hashed Vite chunk). Old chunks
// are deleted from the server on each deploy, so clients must be able to run
// entirely from their own version's cache.
function distUrlExists(url) {
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '').split('?')[0];
  return fs.existsSync(path.join(dist, rel));
}

function collectDistPrecacheUrls(existingUrls) {
  const urls = new Set(existingUrls);
  urls.add('/');
  const assetPattern =
    /\b(?:href|src)=["']([^"']+\.(?:css|js|webp|png|webmanifest)(?:\?[^"']*)?)["']/gi;
  for (const entry of fs.readdirSync(dist)) {
    if (!entry.endsWith('.html')) continue;
    urls.add(`/${entry}`);
    const html = fs.readFileSync(path.join(dist, entry), 'utf8');
    for (const match of html.matchAll(assetPattern)) {
      const raw = match[1];
      if (/^(?:https?:|data:|#)/i.test(raw)) continue;
      urls.add(`/${raw.replace(/^\.?\/+/, '')}`);
    }
  }
  const assetsDir = path.join(dist, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const entry of fs.readdirSync(assetsDir)) {
      if (/\.(?:js|css)$/.test(entry)) urls.add(`/assets/${entry}`);
    }
  }
  return [...urls].filter(distUrlExists).sort((a, b) => a.localeCompare(b));
}

function updateServiceWorkerManifest() {
  const swPath = path.join(dist, 'sw.js');
  if (!fs.existsSync(swPath)) {
    console.warn('dist/sw.js not found; skipped precache manifest update.');
    return;
  }
  const sw = fs.readFileSync(swPath, 'utf8');
  const shellMatch = sw.match(/const APP_SHELL = \[([\s\S]*?)\];/);
  if (!shellMatch) {
    console.warn('APP_SHELL array not found in dist/sw.js; skipped manifest update.');
    return;
  }
  const existingUrls = [...shellMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const urls = collectDistPrecacheUrls(existingUrls);
  const manifest = urls.map((url) => `  '${url}'`).join(',\n');
  fs.writeFileSync(
    swPath,
    sw.replace(shellMatch[0], `const APP_SHELL = [\n${manifest}\n];`)
  );
  console.log(`Service worker precache manifest rebuilt from dist (${urls.length} URLs).`);
}

updateServiceWorkerManifest();

console.log('Copied static assets into dist/. GitHub Pages serves the gh-pages branch root.');
