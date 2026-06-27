import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import cssnano from 'cssnano';

// PurgeCSS was evaluated and rejected here because runtime JS injects many CSS classes.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDirs = [path.join(rootDir, 'dist', 'assets'), path.join(rootDir, 'dist', 'css')];

function collectCssFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectCssFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.css') ? [fullPath] : [];
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

const processor = postcss([
  cssnano({
    preset: [
      'default',
      {
        normalizeUrl: false,
      },
    ],
  }),
]);

let filesChanged = 0;
let bytesSaved = 0;

for (const file of targetDirs.flatMap(collectCssFiles)) {
  const original = fs.readFileSync(file, 'utf8');
  const result = await processor.process(original, { from: file, map: false });
  if (Buffer.byteLength(result.css) >= Buffer.byteLength(original)) continue;
  fs.writeFileSync(file, result.css);
  filesChanged += 1;
  bytesSaved += Buffer.byteLength(original) - Buffer.byteLength(result.css);
}

if (filesChanged) {
  console.log(`Minified ${filesChanged} built CSS file(s), saved ${formatBytes(bytesSaved)}.`);
} else {
  console.log('Built CSS already minified.');
}
