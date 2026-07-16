import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const failures = [];

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function recordVersion(label, actual, expected) {
  if (!actual) failures.push(`${label}: version was not found`);
  else if (actual !== expected) failures.push(`${label}: ${actual} != ${expected}`);
}

function captureVersion(relativePath, pattern, label, expected) {
  const match = readText(relativePath).match(pattern);
  recordVersion(label, match?.[1], expected);
}

const packageJson = JSON.parse(readText('package.json'));
const expectedVersion = String(packageJson.version || '');
const semverMatch = expectedVersion.match(SEMVER_RE);

if (!semverMatch) {
  failures.push(
    `package.json: ${expectedVersion || '(missing)'} is not a major.minor.patch version`
  );
} else if (Number(semverMatch[3]) > 20) {
  failures.push(`package.json: patch ${semverMatch[3]} exceeds the release-train maximum of 20`);
}

const packageLock = JSON.parse(readText('package-lock.json'));
recordVersion('package-lock.json top-level', packageLock.version, expectedVersion);
recordVersion(
  'package-lock.json root package',
  packageLock.packages?.['']?.version,
  expectedVersion
);

for (const relativePath of [
  'js/state.js',
  'js/admin-page.js',
  'js/eden-x1.js',
  'js/arcade.js',
  'js/battle-simulator-app.js',
]) {
  captureVersion(
    relativePath,
    /\bAPP_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/,
    `${relativePath} APP_VERSION`,
    expectedVersion
  );
}

captureVersion(
  'js/ai/tool-envelope.js',
  /\bDEFAULT_APP_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/,
  'js/ai/tool-envelope.js DEFAULT_APP_VERSION',
  expectedVersion
);

captureVersion(
  'battle-simulator.html',
  /<meta\s+name="vts-app-version"\s+content="(\d+\.\d+\.\d+)"\s*\/?>/,
  'battle-simulator.html application version',
  expectedVersion
);

for (const relativePath of ['index.html', 'admin.html', 'eden-x1.html', 'arcade.html']) {
  captureVersion(
    relativePath,
    /VTS 1097[\s\S]{0,100}?&middot;[\s\S]{0,100}?v(\d+\.\d+\.\d+)/,
    `${relativePath} public footer`,
    expectedVersion
  );
}

captureVersion(
  'README.md',
  /^# Hero Combo Creator - VTS 1097 \(v(\d+\.\d+\.\d+)\)$/m,
  'README.md heading',
  expectedVersion
);

const changelogVersions = [
  ...readText('CHANGELOG.md').matchAll(/^## (\d+\.\d+\.\d+)\s+-\s+/gm),
].map((match) => match[1]);
recordVersion('CHANGELOG.md latest release', changelogVersions[0], expectedVersion);

if (semverMatch && changelogVersions.length > 1) {
  const major = Number(semverMatch[1]);
  const minor = Number(semverMatch[2]);
  const patch = Number(semverMatch[3]);
  const expectedPrevious =
    patch > 0 ? `${major}.${minor}.${patch - 1}` : minor > 0 ? `${major}.${minor - 1}.20` : null;

  if (expectedPrevious && changelogVersions[1] !== expectedPrevious) {
    failures.push(
      `CHANGELOG.md release cadence: ${expectedVersion} must follow ${expectedPrevious}, found ${changelogVersions[1]}`
    );
  }
}

if (failures.length) {
  console.error('Version consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Version consistency check passed: ${expectedVersion}.`);
