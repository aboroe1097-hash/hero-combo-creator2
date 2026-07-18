// Regenerates js/ai/changelog-digest.js from CHANGELOG.md so Velo's
// get_whats_new tool always reflects the released history. Run via
// `npm run velo:changelog`; the build also runs it so dist stays fresh.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_RELEASES = 10;
const MAX_HIGHLIGHTS = 6;
const MAX_HIGHLIGHT_CHARS = 280;

const changelog = fs.readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
const releases = [];
let current = null;

for (const line of changelog.split('\n')) {
  const heading = line.match(/^## (\d+\.\d+\.\d+)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/);
  if (heading) {
    if (releases.length >= MAX_RELEASES) break;
    current = { version: heading[1], date: heading[2], highlights: [] };
    releases.push(current);
    continue;
  }
  const bullet = line.match(/^- (.+)$/);
  if (bullet && current && current.highlights.length < MAX_HIGHLIGHTS) {
    const text = bullet[1].trim();
    current.highlights.push(
      text.length > MAX_HIGHLIGHT_CHARS ? `${text.slice(0, MAX_HIGHLIGHT_CHARS - 1)}…` : text
    );
  }
}

if (!releases.length) {
  console.error('build-changelog-digest: no releases found in CHANGELOG.md');
  process.exit(1);
}

const banner = [
  '// GENERATED FILE — do not edit by hand.',
  '// Regenerate with `npm run velo:changelog` (scripts/build-changelog-digest.mjs)',
  '// after every CHANGELOG.md release entry so Velo can answer "what changed?".',
].join('\n');

const output = `${banner}
export const VELO_CHANGELOG_DIGEST_VERSION = ${JSON.stringify(releases[0].version)};

export const VELO_CHANGELOG_DIGEST = Object.freeze(
  ${JSON.stringify(releases, null, 2)}.map((release) =>
    Object.freeze({ ...release, highlights: Object.freeze([...release.highlights]) })
  )
);
`;

fs.writeFileSync(path.join(rootDir, 'js/ai/changelog-digest.js'), output);
console.log(
  `build-changelog-digest: wrote ${releases.length} releases (latest ${releases[0].version}).`
);
