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
  '.nojekyll',
  '.htaccess',
  'public/404.html',
  'public/sw.js',
  'js/maintenance-config.js',
  'js/admin-auth-config.js'
];
const copyDest = {
  'public/404.html': '404.html',
  'public/sw.js': 'sw.js',
  'js/maintenance-config.js': 'js/maintenance-config.js',
  'js/admin-auth-config.js': 'js/admin-auth-config.js'
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

console.log('Copied static assets into dist/. GitHub Pages serves the gh-pages branch root.');
