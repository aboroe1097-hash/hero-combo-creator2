import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

const copyDirs = ['css', 'js', 'images', 'assets', 'tabs', 'workers'];
const copyFiles = ['index.html', 'CNAME', 'robots.txt', 'sitemap.xml', 'site.webmanifest', '.nojekyll', '.htaccess', 'public/404.html', 'public/sw.js'];
const copyDest = { 'public/404.html': '404.html', 'public/sw.js': 'sw.js' };

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
  fs.copyFileSync(src, path.join(dist, destName));
}

console.log('Copied static assets into dist/. GitHub Pages serves the gh-pages branch root.');
