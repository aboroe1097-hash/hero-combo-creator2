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
  // The translated public Eden X1 navigation entry adds 0.9 KiB to the
  // checked-in shell. Keep less than 0.5 KiB of raw-source headroom.
  indexBytes: 83 * 1024,
  indexGzipBytes: 16 * 1024,
  entryJsBytes: 300 * 1024,
  // The shared v14 stylesheet measures 390.3 KiB. The previous 300 KiB check
  // matched only index-*.css and never measured the actual shared file.
  // Shared light-theme surfaces and the explicit Generator selection state
  // measure 403.5 KiB after the non-modal Velo drawer fix; retain less than
  // 1.5 KiB of headroom.
  // The audited 14.2.8 shared mobile controls and Specialization palette
  // measure 405.6 KiB; retain less than 1.5 KiB of headroom.
  // The 14.2.18 semantic Specialization controls measure 407.2 KiB.
  entryCssBytes: 408 * 1024,
  // Specialization Towers, Alliance View, Skin Atlas, and All-Star BoH stay
  // route-isolated behind dynamic imports. The combined graph now includes the
  // canonical tower research corpus, Skin Atlas data, secure BoH client,
  // six-team planner, persistence model, and complete player/Admin locale
  // packs. Velo b0.2, the localized Specialization node inspector, optional
  // All-Star troop OCR review, and the complete 718-node public planner corpus
  // measure 8117.7 KiB after the All-Star participation intake and shared
  // applicant locale additions. The audited Eden reward-family allocation and
  // 14.1.17 release digest measured 8145.8 KiB. The localized admin troop
  // estimate labels and the localized shared-admin protection bring the
  // audited 14.2.0 graph to 8161.7 KiB; retain roughly 14 KiB of aggregate
  // headroom while route and entry budgets remain unchanged. The combined
  // 14.2.3 All-Star scoring and admin-operations release measures 8195.1 KiB;
  // retain roughly 17 KiB while the isolated route caps remain unchanged.
  // The audited 14.2.4 correction editor, score diagnostics, roster CSV, and
  // three-mode team builder measure 8248.9 KiB; retain roughly 17 KiB while
  // every entry and isolated route budget remains unchanged.
  // The 14.2.6 Epic planning controls, persisted overrides, keep-together
  // evaluation, and active CSV export measure 8269.7 KiB; keep roughly 18 KiB
  // while route, CSS, media, and entry budgets remain unchanged.
  // The complete audited 14.2.9 artifact with registration closed, responsive
  // team board, and refined admin controls measures 8289.3 KiB; retain less
  // than 1 KiB of headroom while route, CSS, media, and entry budgets stay fixed.
  // Localized closed-registration gate copy measures 8293.4 KiB; retain less
  // than 2 KiB of aggregate headroom while the route-specific caps stay fixed.
  // The 14.2.10 route-isolated All-Star battlefield plan and independent event
  // schedule measure 8333.8 KiB; retain roughly 16 KiB of aggregate headroom.
  // The audited 14.2.12 graph measures 8940.1 KiB after adding Italian and
  // Korean locale chunks, the profile route, and the battle runtime/catalog.
  // Retain roughly 1% aggregate headroom while entry and route caps stay fixed.
  // The audited 14.2.14 graph measures 9199.3 KiB after adding canonical battle
  // inputs, mapper draft import, and localized account onboarding. Retain roughly
  // 1% aggregate headroom while entry and route caps stay fixed.
  // The v14.2.16 mapper-first Admin and five-phase plan plus independent
  // per-side Battle profiles measure 9300.9 KiB. Retain about 9 KiB while
  // entry and route caps remain unchanged.
  // The 14.2.18 guided builder, event progress, and provider-first account
  // flow measure 9356.6 KiB; retain roughly 13 KiB of aggregate headroom.
  totalJsBytes: 9420 * 1024,
  // Specialization Towers, Skin Atlas, and the player/Admin All-Star surfaces
  // ship as lazy CSS chunks without changing the primary route's initial CSS
  // graph. The touch-safe Specialization inspector, mobile command view, and
  // Hall of Honor and the mobile All-Star intake lift it to 1303.7 KiB after
  // production minification. The All-Star OCR progress UI measures 1312.1 KiB;
  // retain about 16 KiB of aggregate headroom while route-specific caps remain.
  // The audited 14.2.8 mobile shell, Eden archive, and modal layout measure
  // 1340.4 KiB; retain less than 3 KiB of aggregate headroom.
  // The 14.2.10 touch-safe All-Star map and schedule controls measure 1347.1 KiB;
  // retain less than 5 KiB while every initial-route CSS cap stays unchanged.
  // Profile-route styling brings the audited aggregate to 1364.7 KiB after
  // shell-only account-link rules are kept in app.css. The combined 14.2.15
  // All-Star command view and Battle profile checklist measure 1379.7 KiB;
  // retain less than 1.5 KiB of aggregate headroom.
  // The v14.2.16 mapper-first Admin and deferred embedded Battle Tower editor
  // measure about 1397.0 KiB. Retain about 8 KiB while initial-route caps stay
  // fixed.
  // The 14.2.18 guided admin, timeline, account, and semantic control styles
  // measure 1419.6 KiB; retain roughly 10 KiB of aggregate headroom.
  // The v14.3 VtsScore standings, deadline, progress bar, and mobile styles
  // measure 1440.4 KiB; bump by 1 KiB to restore headroom.
  totalCssBytes: 1441 * 1024,
  // The complete Pages artifact matters, not only Vite's top-level chunks.
  // Source-only Eden PNGs are intentionally excluded by post-build; these caps
  // prevent them (or similarly large duplicates) from returning unseen. The
  // combined 14.1.3 artifact measures 26,012.1 KiB after adding four optimized
  // All-Star reference images; retain less than 138 KiB of headroom.
  // The complete public Specialization corpus and shared 33-emblem sprite leave
  // single-digit KiB headroom. Allow deterministic CI build metadata to vary
  // without weakening the route, JS, CSS, media, or file-count budgets below.
  // The 14.1.11 applicant flow measures 26,172.1 KiB with shared locale chunks;
  // retain less than 8 KiB while keeping route and media caps unchanged.
  // The downloadable Top 20 and 21-110 reward cards add one focused Eden bundle feature.
  // The combined 14.2.3 All-Star scoring and admin-operations release measures
  // 26,264.8 KiB and retains roughly 16 KiB of complete-artifact headroom while
  // the tighter CSS, route, media, and file-count budgets remain unchanged.
  // The complete audited 14.2.4 artifact measures 26,327.7 KiB; retain roughly
  // 17 KiB while the tighter route, CSS, media, and file-count caps stay fixed.
  // The formatted multi-account signup note and Locale CSV column added ~0.2
  // KiB of deployed output. Bump by 1 KiB to restore headroom.
  // The 14.2.6 Epic planning controls measure 26,352.9 KiB; retain roughly
  // 17 KiB while the route, media, CSS, and file-count caps stay fixed.
  // The complete audited 14.2.8 artifact measures 26,388.3 KiB; retain less
  // than 3 KiB while the tighter route, media, and file-count caps stay fixed.
  // The complete audited 14.2.9 artifact with registration closed and responsive
  // team board measures 26,405.5 KiB after production minification; retain less
  // than 1.5 KiB of headroom.
  // Localized closed-registration gate copy measures 26,409.6 KiB after a
  // fresh production build; retain less than 2.5 KiB of artifact headroom.
  // The 14.2.10 artifact measures 26,685.1 KiB with one 240.1 KiB lossless
  // battlefield WebP; retain roughly 19 KiB while media and route caps stay fixed.
  // Italian/Korean locales, the profile route, battle runtime/catalog, and
  // their new emitted files measure 27,327.1 KiB; retain roughly 1% headroom.
  // The combined v14.2.15 Account/Profile, All-Star mapper, and Battle profile
  // checklist artifact measures 27,657.1 KiB after production minification;
  // retain less than 8 KiB while route and media caps remain focused.
  // The complete v14.2.16 mapper-first five-phase plan and independent Battle
  // profile editor artifact measures about 27,739.0 KiB with deferred Tower
  // CSS. Retain about 11 KiB while route, entry, media, and file-count caps stay
  // unchanged.
  // The complete 14.2.18 artifact measures 27,824.1 KiB; retain roughly
  // 16 KiB while route, media, and file-count caps remain unchanged.
  // The BoH mapper integration adds 6.2 MB for the team planner pages,
  // battlefield map images, and supporting assets. Bump to 34,100 KiB.
  totalDeployBytes: 34100 * 1024,
  // The BoH mapper adds 10 image files (6 team icons, 2 plan icons, 2 map PNGs)
  // totaling 5.2 MB. Bump media budget from 16 MB to 22 MB.
  totalMediaBytes: 22 * 1024 * 1024,
  maxMediaFileBytes: 4 * 1024 * 1024,
  // Specialization, All-Star, and the Velo b0.2 changelog digest add route,
  // feature, locale, and reference-image assets. The audited artifact has 581
  // files. Shared player/admin applicant copy brings the audited artifact to
  // 585 files; retain a one-file guard.
  // The audited locale/profile/battle artifact emits 601 files. Keep three
  // files of headroom so unexpected chunk proliferation remains visible.
  // The BoH mapper adds 15 files (2 HTML, 2 JS, 1 CSS, 10 images). Bump to 630.
  deployFileCount: 630,
  routeCssBytes: {
    'index.html': { desktop: 530 * 1024, mobile: 625 * 1024 },
    // The audited v14.2.15 profile route links 24,013 bytes of responsive
    // Account/Profile CSS; keep a focused 25 KiB ceiling.
    'profile.html': { desktop: 25 * 1024, mobile: 25 * 1024 },
    // Alliance View reuses the Admin/Eden design system. The shared Strife
    // Hall of Honor and the phone node inspector expand shared app.css. Admin
    // measures 630.8/723.7 KiB and Eden 747.3/840.1 KiB after minification.
    // The audited 14.2.8 shared controls measure 637.2/730.0 KiB on Admin,
    // while the archive and modal layout measure 760.4/853.2 KiB on Eden.
    'admin.html': { desktop: 639 * 1024, mobile: 732 * 1024 },
    'eden-x1.html': { desktop: 763 * 1024, mobile: 856 * 1024 },
    // Arcade measures 437.3/530.0 KiB with the audited 14.2.8 shared graph;
    // retain less than 2 KiB of route-specific headroom.
    'arcade.html': { desktop: 439 * 1024, mobile: 532 * 1024 },
    // The Battle saved-profile checklist lifts the audited standalone route to
    // 54.9 KiB on desktop and mobile; retain roughly 1 KiB of headroom.
    'battle-simulator.html': { desktop: 56 * 1024, mobile: 56 * 1024 },
    // Specialization Towers is route-isolated and loads only shared tokens plus
    // its responsive progression workspace. Keep a focused per-route ceiling;
    // aggregate artifact budgets are recalibrated from the production build.
    'specialization-towers.html': { desktop: 80 * 1024, mobile: 80 * 1024 },
    // BoH mapper admin and plan pages load boh-mapper.css (89.9 KiB) plus
    // shared tokens. Keep a focused per-route ceiling.
    'boh-mapper-admin.html': { desktop: 100 * 1024, mobile: 100 * 1024 },
    'boh-plan.html': { desktop: 100 * 1024, mobile: 100 * 1024 },
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
// Git stores text with LF, while Windows checkouts may use CRLF. Measure the
// checked-in/deployed representation so the same commit has the same budget
// result on developer machines and in CI.
const normalizedIndexSource = indexSource.replace(/\r\n/gu, '\n');
const builtIndexSource = fs.existsSync(builtIndexPath)
  ? fs.readFileSync(builtIndexPath, 'utf8')
  : '';
const forbiddenInitialFeaturePattern =
  /(?:app-builder|ocr-dashboard|eden-map|hero-atlas|arcade|ai-drawer|ai-assistant|app-export|(?:^|[-/])export(?:[-.]|$)|research|materials)/iu;
const initialLinkedFeatureAssets = [...builtIndexSource.matchAll(/<link\b[^>]*>/giu)]
  .map((match) => readTagAttributes(match[0]))
  .filter((attributes) => {
    const rel = (attributes.get('rel') || '').toLowerCase();
    return /(?:modulepreload|preload|stylesheet)/u.test(rel);
  })
  .map((attributes) => attributes.get('href') || '')
  .filter((href) => forbiddenInitialFeaturePattern.test(href));
const indexBytes = Buffer.byteLength(normalizedIndexSource);
const indexGzipBytes = gzipSync(normalizedIndexSource).length;
const indexLines = normalizedIndexSource.split('\n').length;
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
if (initialLinkedFeatureAssets.length) {
  missingBuildOutputs.push(
    `dist/index.html unexpectedly preloads optional feature assets: ${initialLinkedFeatureAssets.join(', ')}`
  );
}

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
