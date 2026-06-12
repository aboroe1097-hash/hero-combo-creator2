import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

const copyDirs = ['css', 'images', 'assets'];
const copyFiles = ['robots.txt', 'sitemap.xml', 'site.webmanifest', '.htaccess', 'public/404.html'];

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
  const destName = file === 'public/404.html' ? '404.html' : path.basename(file);
  fs.copyFileSync(src, path.join(dist, destName));
}

// Also copy to docs/ for GitHub Pages deployment on same branch
const docs = path.join(root, 'docs');
if (fs.existsSync(docs)) fs.rmSync(docs, { recursive: true });
fs.cpSync(dist, docs, { recursive: true });
console.log('Copied static assets into dist/ and docs/');