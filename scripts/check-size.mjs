import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist', 'assets');
const indexPath = path.join(rootDir, 'index.html');

const LIMITS = {
  indexBytes: 75 * 1024,
  indexLines: 800,
  entryJsBytes: 300 * 1024,
  entryCssBytes: 300 * 1024,
  // 13.1.0 adds the DM Materials flow plus Eden X1/Strife release fixes.
  // The measured production build is 2021.6 kB JS, so this cap keeps a small
  // guard band while preserving a meaningful alarm for accidental growth.
  totalJsBytes: 2050 * 1024,
  // Keep close to the fresh production build total. CSS edits must run
  // `npm run build` plus `npm run size:check`; raise only with measured output.
  // Total CSS includes route-split chunks such as Eden X1; per-chunk caps below
  // keep individual route surfaces from growing unchecked. The 2026-07-07
  // responsive pass intentionally added mobile/admin route CSS, so these caps
  // stay close to the measured production output instead of masking future jumps.
  totalCssBytes: 660 * 1024,
  cssChunks: {
    atmosphere: 352 * 1024,
    // Eden X1 now includes the rewards flow, My Stats suggestions, and the
    // mobile quicknav in the route CSS. Keep the cap close to the measured
    // minified output so future growth still trips this check.
    'eden-x1': 66 * 1024,
    mobile: 84 * 1024,
    // 13.1.0 dashboard mobile overflow fixes add small route CSS. The measured
    // minified chunk is 150.1 kB, so keep this cap close to the production build.
    'ocr-dashboard': 152 * 1024,
  },
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

const indexSource = fs.readFileSync(indexPath, 'utf8');
const indexBytes = Buffer.byteLength(indexSource);
const indexLines = indexSource.split(/\r?\n/).length;
const assetFiles = fs.existsSync(distDir)
  ? fs
      .readdirSync(distDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(distDir, entry.name))
  : [];
const jsFiles = assetFiles.filter((file) => file.endsWith('.js'));
const cssFiles = assetFiles.filter((file) => file.endsWith('.css'));
const mediaFiles = assetFiles.filter(
  (file) => !file.endsWith('.js') && !file.endsWith('.css') && !file.endsWith('.map')
);
const totalJsBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalCssBytes = cssFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalMediaBytes = mediaFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const entryJs = assetFiles
  .filter((file) => /[\\/]index-[^\\/]+\.js$/.test(file))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const entryCss = assetFiles
  .filter((file) => /[\\/]index-[^\\/]+\.css$/.test(file))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

const checks = [
  ['source index.html bytes', indexBytes, LIMITS.indexBytes],
  ['source index.html lines', indexLines, LIMITS.indexLines],
  ['largest built index JS', entryJs ? fs.statSync(entryJs).size : 0, LIMITS.entryJsBytes],
  ['largest built index CSS', entryCss ? fs.statSync(entryCss).size : 0, LIMITS.entryCssBytes],
  ['total built JS bytes', totalJsBytes, LIMITS.totalJsBytes],
  ['total built CSS bytes', totalCssBytes, LIMITS.totalCssBytes],
];

for (const [chunkName, limit] of Object.entries(LIMITS.cssChunks)) {
  const chunkFile = cssFiles.find((file) => path.basename(file).startsWith(`${chunkName}-`));
  checks.push([`built ${chunkName} CSS`, chunkFile ? fs.statSync(chunkFile).size : 0, limit]);
}

const failures = checks.filter(([, actual, limit]) => actual > limit);

console.log('Size check:');
console.log(`- index.html: ${formatBytes(indexBytes)}, ${indexLines} lines`);
console.log(
  `- entry JS: ${entryJs ? `${path.basename(entryJs)} ${formatBytes(fs.statSync(entryJs).size)}` : 'not found'}`
);
console.log(
  `- entry CSS: ${entryCss ? `${path.basename(entryCss)} ${formatBytes(fs.statSync(entryCss).size)}` : 'not found'}`
);
console.log(`- total JS: ${formatBytes(totalJsBytes)}`);
console.log(`- total CSS: ${formatBytes(totalCssBytes)}`);
console.log(`- top-level media: ${formatBytes(totalMediaBytes)}`);

if (failures.length) {
  console.error('Size check failed:');
  for (const [label, actual, limit] of failures) {
    const value = label.includes('lines') ? actual : formatBytes(actual);
    const max = label.includes('lines') ? limit : formatBytes(limit);
    console.error(`- ${label}: ${value} > ${max}`);
  }
  process.exit(1);
}

console.log('Size check passed.');
