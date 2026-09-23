import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Owner-approved release-transition exceptions (16.5.0 plan §7.2).
 *
 * The 16.5.0 motion release was requested directly from the 16.0.18 train: no
 * 16.1-16.4 releases exist, and fabricating them is forbidden. This map allows
 * exactly the recorded predecessor -> target pair; normal cadence resumes for
 * every release after it. Add an entry only with an owner decision, and remove
 * the old one once its predecessor is part of normal cadence again.
 */
export const APPROVED_RELEASE_TRANSITIONS = Object.freeze({
  '16.5.0': '16.0.18',
});

export function patchExceedsReleaseTrain(version) {
  const match = String(version || '').match(SEMVER_RE);
  return Boolean(match) && Number(match[3]) > 20;
}

export function normalPreviousVersion(version) {
  const match = String(version || '').match(SEMVER_RE);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return patch > 0
    ? `${major}.${minor}.${patch - 1}`
    : minor > 0
      ? `${major}.${minor - 1}.20`
      : null;
}

export function expectedPreviousVersion(version) {
  return APPROVED_RELEASE_TRANSITIONS[version] ?? normalPreviousVersion(version);
}

export function versionMismatch(label, actual, expected) {
  if (!actual) return `${label}: version was not found`;
  if (actual !== expected) return `${label}: ${actual} != ${expected}`;
  return null;
}

export function cadenceFailure(version, previous) {
  const expectedPrevious = expectedPreviousVersion(version);
  if (expectedPrevious && previous && previous !== expectedPrevious) {
    return `CHANGELOG.md release cadence: ${version} must follow ${expectedPrevious}, found ${previous}`;
  }
  return null;
}

function main() {
  const failures = [];

  function readText(relativePath) {
    return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  }

  function recordVersion(label, actual, expected) {
    const failure = versionMismatch(label, actual, expected);
    if (failure) failures.push(failure);
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
  } else if (patchExceedsReleaseTrain(expectedVersion)) {
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
    'js/specialization-towers-v2-app.js',
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

  captureVersion(
    'specialization-towers.html',
    /<meta\s+name="vts-app-version"\s+content="(\d+\.\d+\.\d+)"\s*\/?>/,
    'specialization-towers.html application version',
    expectedVersion
  );

  for (const relativePath of [
    'index.html',
    'admin.html',
    'eden-x1.html',
    'eden-x2.html',
    'arcade.html',
  ]) {
    captureVersion(
      relativePath,
      /VTS 1097[\s\S]{0,100}?&middot;[\s\S]{0,100}?v(\d+\.\d+\.\d+)/,
      `${relativePath} public footer`,
      expectedVersion
    );
  }

  // Public pages that carry a version label but no footer in the shared shape.
  // These drifted to 14.2.20 / 14.3.5 / 14.0.20 while the app shipped 15.x,
  // because nothing checked them.
  captureVersion(
    'profile.html',
    /<meta name="vts-app-version" content="(\d+\.\d+\.\d+)"/,
    'profile.html app version meta',
    expectedVersion
  );

  captureVersion(
    'vtsscore.html',
    /<meta name="vts-app-version" content="(\d+\.\d+\.\d+)"/,
    'vtsscore.html app version meta',
    expectedVersion
  );

  captureVersion(
    'maintenance.html',
    /class="version">v(\d+\.\d+\.\d+)</,
    'maintenance.html version label',
    expectedVersion
  );

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
    const failure = cadenceFailure(expectedVersion, changelogVersions[1]);
    if (failure) failures.push(failure);
  }

  if (failures.length) {
    console.error('Version consistency check failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Version consistency check passed: ${expectedVersion}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
