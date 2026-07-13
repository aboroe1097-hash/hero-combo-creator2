import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployDir = path.join(rootDir, 'dist');
const distDir = path.join(deployDir, 'assets');
const indexPath = path.join(rootDir, 'index.html');
const builtIndexPath = path.join(deployDir, 'index.html');

const LIMITS = {
  // v14 adds the command shell, accessible More navigation, richer metadata,
  // and the Arcade entry. Raw lines are formatter-dependent, so guard the
  // source by bytes and transfer-relevant gzip size instead.
  indexBytes: 82 * 1024,
  indexGzipBytes: 16 * 1024,
  entryJsBytes: 300 * 1024,
  // The shared v14 stylesheet measures 390.3 KiB. The previous 300 KiB check
  // matched only index-*.css and never measured the actual shared file.
  // Shared light-theme surfaces and the explicit Generator selection state
  // measure 403.5 KiB after the non-modal Velo drawer fix; retain less than
  // 1.5 KiB of headroom.
  entryCssBytes: 405 * 1024,
  // The translated AI Strategy Assistant adds deferred client/tool modules;
  // keep a narrow guard above the measured 2693.8 KiB v14 release artifact.
  totalJsBytes: 2700 * 1024,
  // The assistant drawer plus the cross-tool light-theme/touch-target pass
  // measure 1076.1 KiB. Per-page initial budgets below still catch route
  // leakage; retain less than 3 KiB of aggregate headroom.
  totalCssBytes: 1079 * 1024,
  // The complete Pages artifact matters, not only Vite's top-level chunks.
  // Source-only Eden PNGs are intentionally excluded by post-build; these
  // caps prevent them (or similarly large duplicates) from returning unseen.
  totalDeployBytes: 20 * 1024 * 1024,
  totalMediaBytes: 16 * 1024 * 1024,
  maxMediaFileBytes: 4 * 1024 * 1024,
  // DM, Research, Arcade, and the deferred AI drawer intentionally expand
  // the v14 artifact while source-only originals remain excluded. Keep a
  // narrow guard above the measured 418-file v14 release artifact.
  deployFileCount: 450,
  routeCssBytes: {
    'index.html': { desktop: 530 * 1024, mobile: 625 * 1024 },
    'admin.html': { desktop: 600 * 1024, mobile: 695 * 1024 },
    'eden-x1.html': { desktop: 715 * 1024, mobile: 810 * 1024 },
    // Mobile Arcade loads the shared v14 interaction sheet and measures
    // 517.7 KiB; retain less than 1.5 KiB of route-specific headroom.
    'arcade.html': { desktop: 426 * 1024, mobile: 519 * 1024 },
  },
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(absolutePath, out);
    else if (entry.isFile()) out.push(absolutePath);
  }
  return out;
}

const indexSource = fs.readFileSync(indexPath, 'utf8');
const builtIndexSource = fs.existsSync(builtIndexPath)
  ? fs.readFileSync(builtIndexPath, 'utf8')
  : '';
const indexBytes = Buffer.byteLength(indexSource);
const indexGzipBytes = gzipSync(indexSource).length;
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
const deployFiles = walkFiles(deployDir);
const deployMediaFiles = deployFiles.filter(
  (file) => !/\.(?:css|html?|js|json|map|md|txt|xml)$/i.test(file)
);
const totalDeployBytes = deployFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const deployedMediaBytes = deployMediaFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largestMediaFile = deployMediaFiles
  .slice()
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const totalJsBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalCssBytes = cssFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalMediaBytes = mediaFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
function readTagAttributes(tagSource) {
  return new Map(
    [...tagSource.matchAll(/\b([^\s=/>]+)\s*=\s*(["'])(.*?)\2/gis)].map((match) => [
      match[1].toLowerCase(),
      match[3],
    ])
  );
}

function resolveBuiltIndexAssets({ tagName, attribute, extension, rel = null }) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return [...builtIndexSource.matchAll(tagPattern)]
    .map((match) => readTagAttributes(match[0]))
    .filter((attributes) => {
      if (!rel) return true;
      return (attributes.get('rel') || '')
        .split(/\s+/)
        .some((value) => value.toLowerCase() === rel);
    })
    .map((attributes) => attributes.get(attribute) || '')
    .filter((assetPath) => new RegExp(`\\.${extension}(?:[?#]|$)`, 'i').test(assetPath))
    .map((assetPath) => assetPath.split(/[?#]/, 1)[0].replace(/^\/+/, ''))
    .filter((assetPath) => assetPath.startsWith('assets/'))
    .map((assetPath) => path.join(deployDir, assetPath))
    .filter((assetPath) => fs.existsSync(assetPath))
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
}

function mediaMatchesWidth(media, viewportWidth) {
  const normalized = String(media || '')
    .trim()
    .toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'screen') return true;
  const maxWidth = normalized.match(/max-width\s*:\s*([\d.]+)px/u);
  if (maxWidth && viewportWidth > Number(maxWidth[1])) return false;
  const minWidth = normalized.match(/min-width\s*:\s*([\d.]+)px/u);
  if (minWidth && viewportWidth < Number(minWidth[1])) return false;
  return !/\bprint\b/u.test(normalized);
}

function resolveBuiltRouteCssAssets(htmlFile, viewportWidth) {
  const htmlPath = path.join(deployDir, htmlFile);
  if (!fs.existsSync(htmlPath)) return [];
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/<noscript\b[\s\S]*?<\/noscript>/giu, '');
  const assets = new Set();
  for (const match of html.matchAll(/<link\b[^>]*>/giu)) {
    const attributes = readTagAttributes(match[0]);
    const relValues = (attributes.get('rel') || '')
      .split(/\s+/u)
      .map((value) => value.toLowerCase());
    if (!relValues.includes('stylesheet')) continue;
    if (!mediaMatchesWidth(attributes.get('media'), viewportWidth)) continue;
    const assetPath = (attributes.get('href') || '').split(/[?#]/u, 1)[0].replace(/^\/+/, '');
    if (!assetPath.startsWith('assets/') || !assetPath.endsWith('.css')) continue;
    const absolutePath = path.join(deployDir, assetPath);
    if (fs.existsSync(absolutePath)) assets.add(absolutePath);
  }
  return [...assets];
}

const entryJs = resolveBuiltIndexAssets({
  tagName: 'script',
  attribute: 'src',
  extension: 'js',
})[0];
const entryCss = resolveBuiltIndexAssets({
  tagName: 'link',
  attribute: 'href',
  extension: 'css',
  rel: 'stylesheet',
})[0];
const missingBuildOutputs = [];
if (!builtIndexSource) missingBuildOutputs.push('dist/index.html');
if (!entryJs) missingBuildOutputs.push('entry JavaScript linked by dist/index.html');
if (!entryCss) missingBuildOutputs.push('entry CSS linked by dist/index.html');

const routeCssMetrics = new Map();
for (const htmlFile of Object.keys(LIMITS.routeCssBytes)) {
  const htmlPath = path.join(deployDir, htmlFile);
  if (!fs.existsSync(htmlPath)) {
    missingBuildOutputs.push(`dist/${htmlFile}`);
    continue;
  }
  const desktopFiles = resolveBuiltRouteCssAssets(htmlFile, 1280);
  const mobileFiles = resolveBuiltRouteCssAssets(htmlFile, 390);
  if (!desktopFiles.length) missingBuildOutputs.push(`desktop CSS linked by dist/${htmlFile}`);
  if (!mobileFiles.length) missingBuildOutputs.push(`mobile CSS linked by dist/${htmlFile}`);
  routeCssMetrics.set(htmlFile, {
    desktop: desktopFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0),
    mobile: mobileFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0),
  });
}

const checks = [
  ['source index.html bytes', indexBytes, LIMITS.indexBytes],
  ['source index.html gzip bytes', indexGzipBytes, LIMITS.indexGzipBytes],
  ['largest built index JS', entryJs ? fs.statSync(entryJs).size : 0, LIMITS.entryJsBytes],
  ['largest built index CSS', entryCss ? fs.statSync(entryCss).size : 0, LIMITS.entryCssBytes],
  ['total built JS bytes', totalJsBytes, LIMITS.totalJsBytes],
  ['total built CSS bytes', totalCssBytes, LIMITS.totalCssBytes],
  ['total deployed bytes', totalDeployBytes, LIMITS.totalDeployBytes],
  ['total deployed media bytes', deployedMediaBytes, LIMITS.totalMediaBytes],
  [
    'largest deployed media file',
    largestMediaFile ? fs.statSync(largestMediaFile).size : 0,
    LIMITS.maxMediaFileBytes,
  ],
  ['deployed file count', deployFiles.length, LIMITS.deployFileCount],
];

for (const [htmlFile, limits] of Object.entries(LIMITS.routeCssBytes)) {
  const metrics = routeCssMetrics.get(htmlFile);
  if (!metrics) continue;
  checks.push([`${htmlFile} desktop initial CSS`, metrics.desktop, limits.desktop]);
  checks.push([`${htmlFile} mobile initial CSS`, metrics.mobile, limits.mobile]);
}

const failures = checks.filter(([, actual, limit]) => actual > limit);

console.log('Size check:');
console.log(
  `- index.html: ${formatBytes(indexBytes)} raw, ${formatBytes(indexGzipBytes)} gzip, ${indexLines} lines (informational)`
);
console.log(
  `- entry JS: ${entryJs ? `${path.basename(entryJs)} ${formatBytes(fs.statSync(entryJs).size)}` : 'not found'}`
);
console.log(
  `- entry CSS: ${entryCss ? `${path.basename(entryCss)} ${formatBytes(fs.statSync(entryCss).size)}` : 'not found'}`
);
console.log(`- total JS: ${formatBytes(totalJsBytes)}`);
console.log(`- total CSS: ${formatBytes(totalCssBytes)}`);
console.log(`- top-level media: ${formatBytes(totalMediaBytes)}`);
console.log(
  `- complete Pages artifact: ${formatBytes(totalDeployBytes)}, ${deployFiles.length} files`
);
console.log(`- deployed media: ${formatBytes(deployedMediaBytes)}`);
console.log(
  `- largest deployed media: ${largestMediaFile ? `${path.relative(deployDir, largestMediaFile)} ${formatBytes(fs.statSync(largestMediaFile).size)}` : 'not found'}`
);
for (const [htmlFile, metrics] of routeCssMetrics) {
  console.log(
    `- ${htmlFile} initial CSS: ${formatBytes(metrics.desktop)} desktop, ${formatBytes(metrics.mobile)} mobile`
  );
}

if (missingBuildOutputs.length || failures.length) {
  console.error('Size check failed:');
  for (const output of missingBuildOutputs) {
    console.error(`- missing required build output: ${output}`);
  }
  for (const [label, actual, limit] of failures) {
    const isCount = label.includes('file count');
    const value = isCount ? actual : formatBytes(actual);
    const max = isCount ? limit : formatBytes(limit);
    console.error(`- ${label}: ${value} > ${max}`);
  }
  process.exit(1);
}

console.log('Size check passed.');
