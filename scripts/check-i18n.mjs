import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations, translationCoverage } from '../js/translations.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = [
  'index.html',
  ...fs.readdirSync(path.join(rootDir, 'tabs'))
    .filter(name => name.endsWith('.html'))
    .map(name => path.join('tabs', name)),
];

const I18N_ATTRS = [
  'data-i18n',
  'data-i18n-ph',
  'data-i18n-title',
  'data-i18n-aria',
  'data-i18n-label',
];

const referencedKeys = new Map();

function addKey(key, location) {
  if (!referencedKeys.has(key)) referencedKeys.set(key, []);
  referencedKeys.get(key).push(location);
}

for (const relPath of htmlFiles) {
  const absolutePath = path.join(rootDir, relPath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  for (const attr of I18N_ATTRS) {
    const re = new RegExp(`${attr}=["']([^"']+)["']`, 'g');
    let match;
    while ((match = re.exec(source))) {
      addKey(match[1], `${relPath}:${attr}`);
    }
  }
}

const englishKeys = Object.keys(translations.en || {});
const errors = [];

for (const [key, locations] of referencedKeys.entries()) {
  if (!(key in translations.en)) {
    errors.push(`Missing English translation key "${key}" used at ${locations.join(', ')}`);
  }
}

for (const [lang, dict] of Object.entries(translations)) {
  const missing = englishKeys.filter(key => !(key in dict));
  if (missing.length) {
    errors.push(`${lang} is missing ${missing.length} runtime keys: ${missing.slice(0, 20).join(', ')}`);
  }
}

for (const [lang, dict] of Object.entries(translations)) {
  for (const [key, value] of Object.entries(dict)) {
    if (typeof value !== 'string') {
      errors.push(`${lang}.${key} must be a string translation value`);
    }
  }
}

if (errors.length) {
  console.error('i18n check failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(`i18n check passed: ${referencedKeys.size} template keys, ${englishKeys.length} runtime keys, ${Object.keys(translations).length} languages.`);
for (const [lang, coverage] of Object.entries(translationCoverage)) {
  const fallbackCount = coverage.missingBeforeFallback.length;
  if (fallbackCount) {
    console.log(`i18n coverage: ${lang} uses English fallback for ${fallbackCount}/${coverage.total} keys.`);
  }
}
