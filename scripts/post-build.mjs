import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');

// Directories copied as-is (not processed by Vite).
const copyDirs = ['images', 'assets', 'tabs', 'games'];

// Keep regeneration/source fallbacks in Git without shipping duplicate,
// multi-megabyte originals to every Pages release. Runtime consumers use the
// optimized alternatives listed beside these files.
const sourceOnlyDeployPaths = new Set([
  'assets/faction-division.jpg',
  'assets/faction-division2.png',
  'assets/eden-reference/base-floor-v1.json',
  'assets/eden-reference/base-floor-v1.webp',
  'assets/eden-reference/eden-map-reference.png',
  'assets/eden-reference/icons/c5.png',
  'assets/eden-reference/icons/c6.png',
  'assets/eden-reference/icons/cp1.png',
  'assets/eden-reference/icons/cp3.png',
  'assets/eden-reference/icons/cp7.png',
  'assets/eden-reference/icons/lt2.png',
  'assets/eden-reference/icons/lt4.png',
  'assets/eden-reference/icons/st1.png',
  'assets/eden-reference/icons/st2.png',
  'assets/eden-reference/icons/st3.png',
  'assets/eden-reference/sector-parchments',
  'assets/eden-reference/screenshots/WhatsApp Image 2026-06-10 at 18.59.30 (2).jpeg',
  'assets/eden-reference/screenshots/WhatsApp Image 2026-06-10 at 18.59.32.jpeg',
  'assets/artifact/redemption-grail-board.webp',
  'images/strife/roc-strife-reference.png',
  'assets/admin-D1Gvfu0q.js',
  'images/heroes/catchup/ashen-verdict.png',
  'images/heroes/catchup/bjorn.png',
  'images/heroes/catchup/cyrus.png',
  'images/heroes/catchup/eidolon.png',
  'images/heroes/catchup/fortuneteller.png',
  'images/heroes/catchup/liberator.png',
  'images/heroes/catchup/ragnar-demon-lord.png',
  'images/heroes/catchup/rainforest-ranger.png',
  'images/heroes/catchup/reinforced-ragnar-placeholder.svg',
  'images/heroes/catchup/scarlet-reaver.png',
  'images/heroes/catchup/skanda.png',
  'images/heroes/catchup/warden.png',
  'images/heroes/catchup/warhammer.png',
  'images/heroes/x12/achilles.png',
  'images/heroes/x12/al-hawra.png',
  'images/heroes/x12/arslan.png',
  'images/heroes/x12/belisarius.png',
  'images/heroes/x12/el-cid.png',
  'images/heroes/x12/farah.png',
  'images/heroes/x12/healer.png',
  'images/heroes/x12/hellfire.png',
  'images/heroes/x12/lilith.png',
  'images/heroes/x12/pepin.png',
  'images/heroes/x12/poison-master.png',
  'images/logo.webp',
]);

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
  'public/ai-launcher-critical.css',
  'public/sw.js',
  'js/eden-datasets.payload.json',
  'js/codex-payload.json',
  'js/theme-prepaint.js',
  'js/admin-auth-config.js',
  'js/maintenance-config.js',
  'js/i18n/standalone-copy.js',
  'js/index-page-enhancements.js',
  'js/loader-v14.js',
  'js/shell-v14.js',
  'js/standalone-language-v14.js',
];
const copyDest = {
  'public/404.html': '404.html',
  'public/ai-launcher-critical.css': 'ai-launcher-critical.css',
  'public/sw.js': 'sw.js',
  'js/eden-datasets.payload.json': 'js/eden-datasets.payload.json',
  'js/codex-payload.json': 'js/codex-payload.json',
  'js/theme-prepaint.js': 'js/theme-prepaint.js',
  'js/admin-auth-config.js': 'js/admin-auth-config.js',
  'js/maintenance-config.js': 'js/maintenance-config.js',
  'js/i18n/standalone-copy.js': 'js/i18n/standalone-copy.js',
  'js/index-page-enhancements.js': 'js/index-page-enhancements.js',
  'js/loader-v14.js': 'js/loader-v14.js',
  'js/shell-v14.js': 'js/shell-v14.js',
  'js/standalone-language-v14.js': 'js/standalone-language-v14.js',
};

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    const deployPath = path.relative(root, from).replace(/\\/g, '/');
    if (sourceOnlyDeployPaths.has(deployPath)) continue;
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

// The All-Star BoH member hub and its admin command center are gone; what is
// left of that domain is the access client, the stats OCR helpers and the
// season schedule, which VtsScore loads behind its own server-verified gate.
// Those must still never be precached ahead of that gate.
const PROTECTED_ALL_STAR_PRECACHE_PATTERN = /^\/assets\/all-star-boh-[^/]*\.js$/iu;

function isProtectedAllStarPrecacheUrl(url) {
  return PROTECTED_ALL_STAR_PRECACHE_PATTERN.test(String(url || '').split(/[?#]/u, 1)[0]);
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
  return [...urls]
    .filter(distUrlExists)
    .filter((url) => !isProtectedAllStarPrecacheUrl(url))
    .sort((a, b) => a.localeCompare(b));
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
  fs.writeFileSync(swPath, sw.replace(shellMatch[0], `const APP_SHELL = [\n${manifest}\n];`));
  console.log(`Service worker precache manifest rebuilt from dist (${urls.length} URLs).`);
}

const URL_ATTRIBUTES = new Set(['href', 'src']);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);
// The owner intentionally keeps these admin-only local prototype links unchanged.
// They are not public Arcade routes and are the only unresolved hrefs exempted.
const ADMIN_LOCAL_BOOT_PROTOTYPE_HREF_ALLOWLIST = new Set([
  '/previews/boot-games/b-merge-rush.html',
  '/previews/boot-games/c-sort-hoard.html',
  '/previews/boot-games/e-crystal-relay.html',
  '/previews/boot-games/f-set-assembly.html',
  '/previews/boot-games/h-hero-rumble.html',
]);
const HTML_ENTITY_VALUES = {
  amp: '&',
  apos: "'",
  colon: ':',
  gt: '>',
  lt: '<',
  num: '#',
  quest: '?',
  quot: '"',
  sol: '/',
};

function decodeHtmlAttributeValue(value) {
  return value.replace(/&(?:#(x[\da-f]+|\d+)|([a-z]+));/gi, (entity, numericValue, namedValue) => {
    if (numericValue) {
      const radix = numericValue[0].toLowerCase() === 'x' ? 16 : 10;
      const digits = radix === 16 ? numericValue.slice(1) : numericValue;
      const codePoint = Number.parseInt(digits, radix);
      if (Number.isInteger(codePoint) && codePoint <= 0x10ffff) {
        return String.fromCodePoint(codePoint);
      }
      return entity;
    }
    return HTML_ENTITY_VALUES[namedValue.toLowerCase()] ?? entity;
  });
}

function findTagEnd(html, startIndex) {
  let quote = '';
  for (let index = startIndex; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function parseOpeningTag(tagMarkup) {
  const references = [];
  let cursor = 1;
  while (/\s/.test(tagMarkup[cursor] || '')) cursor += 1;
  if (!/[a-z]/i.test(tagMarkup[cursor] || '')) return { references, tagName: '' };

  const tagNameStart = cursor;
  while (!/[\s/>]/.test(tagMarkup[cursor] || '>')) cursor += 1;
  const tagName = tagMarkup.slice(tagNameStart, cursor).toLowerCase();

  while (cursor < tagMarkup.length) {
    while (/\s/.test(tagMarkup[cursor] || '')) cursor += 1;
    if (tagMarkup[cursor] === '>' || tagMarkup[cursor] === '/') break;

    const nameStart = cursor;
    while (!/[\s=/>]/.test(tagMarkup[cursor] || '>')) cursor += 1;
    const attribute = tagMarkup.slice(nameStart, cursor).toLowerCase();
    while (/\s/.test(tagMarkup[cursor] || '')) cursor += 1;

    let value = null;
    if (tagMarkup[cursor] === '=') {
      cursor += 1;
      while (/\s/.test(tagMarkup[cursor] || '')) cursor += 1;
      const quote = tagMarkup[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;
        const valueStart = cursor;
        while (cursor < tagMarkup.length && tagMarkup[cursor] !== quote) cursor += 1;
        value = tagMarkup.slice(valueStart, cursor);
        if (tagMarkup[cursor] === quote) cursor += 1;
      } else {
        const valueStart = cursor;
        while (!/[\s>]/.test(tagMarkup[cursor] || '>')) cursor += 1;
        value = tagMarkup.slice(valueStart, cursor);
      }
    }

    if (URL_ATTRIBUTES.has(attribute) && value !== null) {
      references.push({ attribute, value: decodeHtmlAttributeValue(value).trim() });
    }
  }

  return { references, tagName };
}

function collectHtmlUrlReferences(html) {
  const references = [];
  const lowerHtml = html.toLowerCase();
  let cursor = 0;

  while (cursor < html.length) {
    const tagStart = html.indexOf('<', cursor);
    if (tagStart === -1) break;
    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart + 4);
      cursor = commentEnd === -1 ? html.length : commentEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(html, tagStart + 1);
    if (tagEnd === -1) break;
    const { references: tagReferences, tagName } = parseOpeningTag(
      html.slice(tagStart, tagEnd + 1)
    );
    references.push(...tagReferences);
    cursor = tagEnd + 1;

    if (RAW_TEXT_ELEMENTS.has(tagName)) {
      const closePattern = new RegExp(`</${tagName}\\s*>`, 'gi');
      closePattern.lastIndex = cursor;
      const closeMatch = closePattern.exec(lowerHtml);
      cursor = closeMatch ? closeMatch.index + closeMatch[0].length : html.length;
    }
  }

  return references;
}

function listHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(entryPath);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function isAllowlistedAdminLocalPrototypeHref(sourcePath, attribute, rawReference) {
  if (sourcePath !== 'tabs/admin.html' || attribute !== 'href') return false;
  const artifactPath = rawReference.split(/[?#]/, 1)[0];
  return ADMIN_LOCAL_BOOT_PROTOTYPE_HREF_ALLOWLIST.has(artifactPath);
}

function resolveDistReference(htmlPath, rawReference) {
  if (rawReference.startsWith('#')) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(rawReference)) return null;

  const htmlRelativePath = path.relative(dist, htmlPath).replace(/\\/g, '/');
  // Files under tabs/ are fetched as fragments and inserted into a root-level
  // document, so their relative URLs use the host document's base URL.
  const documentRelativePath = htmlRelativePath.startsWith('tabs/')
    ? 'index.html'
    : htmlRelativePath;
  const baseUrl = new URL(`https://artifact.invalid/${documentRelativePath}`);
  let resolvedUrl;
  try {
    resolvedUrl = new URL(rawReference, baseUrl);
  } catch {
    return { artifactPath: '(invalid URL)', exists: false };
  }
  if (resolvedUrl.origin !== baseUrl.origin) return null;

  let pathname;
  try {
    pathname = decodeURIComponent(resolvedUrl.pathname);
  } catch {
    return { artifactPath: '(invalid URL encoding)', exists: false };
  }

  let artifactPath = pathname.replace(/^\/+/, '');
  if (pathname === '/') artifactPath = 'index.html';
  else if (pathname.endsWith('/')) artifactPath = `${artifactPath}index.html`;

  let absolutePath = path.resolve(dist, ...artifactPath.split('/'));
  const relativePath = path.relative(dist, absolutePath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return { artifactPath: '(outside dist)', exists: false };
  }

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
    artifactPath = `${artifactPath.replace(/\/+$/, '')}/index.html`;
    absolutePath = path.join(absolutePath, 'index.html');
  }

  return {
    artifactPath: artifactPath.replace(/\\/g, '/'),
    exists: fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile(),
  };
}

function verifyDistHtmlReferences() {
  const unresolved = [];
  const htmlFiles = listHtmlFiles(dist);
  let checkedReferences = 0;

  for (const htmlPath of htmlFiles) {
    const sourcePath = path.relative(dist, htmlPath).replace(/\\/g, '/');
    const html = fs.readFileSync(htmlPath, 'utf8');
    for (const { attribute, value } of collectHtmlUrlReferences(html)) {
      if (isAllowlistedAdminLocalPrototypeHref(sourcePath, attribute, value)) continue;
      const resolution = resolveDistReference(htmlPath, value);
      if (!resolution) continue;
      checkedReferences += 1;
      if (!resolution.exists) {
        unresolved.push(`${sourcePath}: ${attribute}="${value}" -> ${resolution.artifactPath}`);
      }
    }
  }

  if (unresolved.length > 0) {
    throw new Error(
      `Unresolved same-origin href/src references in dist:\n${unresolved
        .map((reference) => `- ${reference}`)
        .join('\n')}`
    );
  }

  console.log(
    `Verified ${checkedReferences} same-origin href/src references across ${htmlFiles.length} emitted HTML files.`
  );
}

verifyDistHtmlReferences();
updateServiceWorkerManifest();

console.log('Copied static assets into dist/. The verified Pages artifact is ready in dist/.');
