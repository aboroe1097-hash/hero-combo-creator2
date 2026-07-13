import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'abocombo';
const SITE_ID = 'abocombo';
const MAX_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const FIREBASE_DEPLOY_TIMEOUT_MS = 15 * 60 * 1000;
const rootDir = path.resolve(import.meta.dirname, '..');

function durationToMilliseconds(duration) {
  const match = String(duration || '').match(/^(\d+)(h|d|w)$/);
  if (!match) return 0;
  const unitMilliseconds = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return Number(match[1]) * unitMilliseconds[match[2]];
}

export function parseFirebaseDeployResult(rawOutput, { site, channel, now = Date.now() }) {
  let payload;
  try {
    payload = JSON.parse(String(rawOutput || ''));
  } catch {
    throw new Error('Firebase CLI did not return valid JSON.');
  }

  if (payload?.status !== 'success' || !payload.result || typeof payload.result !== 'object') {
    throw new Error('Firebase CLI did not report a successful Hosting preview deploy.');
  }

  const deploys = Object.values(payload.result).filter(
    (deploy) => deploy && typeof deploy === 'object' && deploy.site === site
  );
  if (deploys.length !== 1) {
    throw new Error(`Expected exactly one Firebase deploy result for site ${site}.`);
  }

  const deploy = deploys[0];
  let previewUrl;
  try {
    previewUrl = new URL(deploy.url);
  } catch {
    throw new Error('Firebase deploy result did not include a valid preview URL.');
  }

  const expectedPrefix = `${site}--${channel}-`;
  if (
    previewUrl.protocol !== 'https:' ||
    previewUrl.username ||
    previewUrl.password ||
    previewUrl.port ||
    previewUrl.search ||
    previewUrl.hash ||
    (previewUrl.pathname !== '/' && previewUrl.pathname !== '') ||
    !previewUrl.hostname.startsWith(expectedPrefix) ||
    !previewUrl.hostname.endsWith('.web.app')
  ) {
    throw new Error(`Firebase returned an unexpected preview URL: ${deploy.url || '(missing)'}`);
  }

  const expireTime = Date.parse(String(deploy.expireTime || ''));
  if (!Number.isFinite(expireTime) || expireTime <= now) {
    throw new Error('Firebase deploy result did not include a future channel expiry.');
  }
  return {
    expireTime: new Date(expireTime).toISOString(),
    url: previewUrl.origin,
  };
}

function runNpmScript(script, env) {
  const npmCliPath = process.env.npm_execpath || '';
  const command = npmCliPath ? process.execPath : process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = npmCliPath
    ? [npmCliPath, 'run', script]
    : process.platform === 'win32'
      ? ['/d', '/s', '/c', `npm run ${script}`]
      : ['run', script];
  return spawnSync(command, args, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
}

function runFirebaseDeploy(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });

    const heartbeat = setInterval(() => {
      console.log('Firebase preview deploy is still running...');
    }, 30_000);
    heartbeat.unref();

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, FIREBASE_DEPLOY_TIMEOUT_MS);
    timeout.unref();

    child.once('error', (error) => {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      reject(new Error(`Firebase preview deploy failed to start: ${error.message}`));
    });
    child.once('close', (status, signal) => {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      if (timedOut) {
        reject(
          new Error(
            `Firebase preview deploy exceeded ${FIREBASE_DEPLOY_TIMEOUT_MS / 60_000} minutes and was stopped.`
          )
        );
        return;
      }
      resolve({ signal, status, stderr, stdout });
    });
  });
}

async function main() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = String(packageJson.version || '').trim();
  const defaultChannel = `v${version.replace(/\./g, '-')}`;
  const channel = String(process.argv[2] || defaultChannel)
    .trim()
    .toLowerCase();
  const expires = String(process.env.FIREBASE_PREVIEW_EXPIRES || '7d')
    .trim()
    .toLowerCase();
  const expiryMilliseconds = durationToMilliseconds(expires);
  const skipAuthorizedDomains = process.env.FIREBASE_PREVIEW_SKIP_AUTH_DOMAINS === 'true';

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Cannot derive a Firebase preview channel from invalid version: ${version}`);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(channel)) {
    throw new Error(`Invalid Firebase preview channel: ${channel}`);
  }
  if (!expiryMilliseconds || expiryMilliseconds > MAX_EXPIRY_MS) {
    throw new Error(`Invalid Firebase preview expiration: ${expires} (maximum 30d)`);
  }

  for (const relativePath of ['dist/index.html', 'dist/sw.js']) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) {
      throw new Error(`Missing verified Firebase preview artifact: ${relativePath}`);
    }
  }

  const builtIndex = fs.readFileSync(path.join(rootDir, 'dist', 'index.html'), 'utf8');
  if (!builtIndex.includes(`v${version}`)) {
    throw new Error(
      `dist/index.html does not advertise release v${version}; run npm run check first.`
    );
  }

  const firebaseCliPath = path.join(
    rootDir,
    'node_modules',
    'firebase-tools',
    'lib',
    'bin',
    'firebase.js'
  );
  if (!fs.existsSync(firebaseCliPath)) {
    throw new Error('Pinned Firebase CLI is missing. Run npm ci before deploying a preview.');
  }

  const args = [
    firebaseCliPath,
    'hosting:channel:deploy',
    channel,
    '--project',
    PROJECT_ID,
    '--config',
    'firebase.preview.json',
    '--expires',
    expires,
    '--non-interactive',
    '--json',
  ];
  if (skipAuthorizedDomains) args.push('--no-authorized-domains');

  console.log(
    `Deploying verified v${version} artifact to Firebase Hosting preview channel ${channel} (${expires}).`
  );
  console.log(
    skipAuthorizedDomains
      ? 'Firebase Auth authorized-domain synchronization is disabled for this preview.'
      : 'Firebase will synchronize the temporary preview hostname with Auth authorized domains.'
  );

  const result = await runFirebaseDeploy(args);
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (
    !skipAuthorizedDomains &&
    /Unable to add channel domain to Firebase Auth/iu.test(result.stderr || '')
  ) {
    throw new Error(
      'Firebase Hosting deployed, but Auth authorized-domain synchronization failed.'
    );
  }

  const deploy = parseFirebaseDeployResult(result.stdout, { site: SITE_ID, channel });
  console.log(`Firebase preview deployed: ${deploy.url} (expires ${deploy.expireTime})`);
  console.log(`Running production smoke tests against ${deploy.url}`);

  const smokeResult = runNpmScript('smoke:prod', {
    ...process.env,
    FIREBASE_PREVIEW_EXPIRES_AT: deploy.expireTime,
    PLAYWRIGHT_BASE_URL: deploy.url,
  });
  if (smokeResult.error) {
    throw new Error(`Firebase preview smoke test failed to start: ${smokeResult.error.message}`);
  }
  if (smokeResult.status !== 0) process.exit(smokeResult.status ?? 1);

  console.log(`Firebase preview verified: ${deploy.url}`);
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
