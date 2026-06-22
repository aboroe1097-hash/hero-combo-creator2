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
  totalJsBytes: 2000 * 1024,
  totalCssBytes: 420 * 1024,
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

const indexSource = fs.readFileSync(indexPath, 'utf8');
const indexBytes = Buffer.byteLength(indexSource);
const indexLines = indexSource.split(/\r?\n/).length;
const assetFiles = fs.existsSync(distDir)
  ? fs.readdirSync(distDir, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(distDir, entry.name))
  : [];
const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
const cssFiles = assetFiles.filter(file => file.endsWith('.css'));
const mediaFiles = assetFiles.filter(file => !file.endsWith('.js') && !file.endsWith('.css') && !file.endsWith('.map'));
const totalJsBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalCssBytes = cssFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalMediaBytes = mediaFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const entryJs = assetFiles
  .filter(file => /[\\/]index-[^\\/]+\.js$/.test(file))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const entryCss = assetFiles
  .filter(file => /[\\/]index-[^\\/]+\.css$/.test(file))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

const checks = [
  ['source index.html bytes', indexBytes, LIMITS.indexBytes],
  ['source index.html lines', indexLines, LIMITS.indexLines],
  ['largest built index JS', entryJs ? fs.statSync(entryJs).size : 0, LIMITS.entryJsBytes],
  ['largest built index CSS', entryCss ? fs.statSync(entryCss).size : 0, LIMITS.entryCssBytes],
  ['total built JS bytes', totalJsBytes, LIMITS.totalJsBytes],
  ['total built CSS bytes', totalCssBytes, LIMITS.totalCssBytes],
];

const failures = checks.filter(([, actual, limit]) => actual > limit);

console.log('Size check:');
console.log(`- index.html: ${formatBytes(indexBytes)}, ${indexLines} lines`);
console.log(`- entry JS: ${entryJs ? `${path.basename(entryJs)} ${formatBytes(fs.statSync(entryJs).size)}` : 'not found'}`);
console.log(`- entry CSS: ${entryCss ? `${path.basename(entryCss)} ${formatBytes(fs.statSync(entryCss).size)}` : 'not found'}`);
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
