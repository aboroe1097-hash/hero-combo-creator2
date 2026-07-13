import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const npmCliPath = process.env.npm_execpath || '';
const adminConfigPath = path.join(rootDir, 'js', 'admin-auth-config.js');
const originalAdminConfig = readFileSync(adminConfigPath, 'utf8');
const sensitiveEnvironmentKeys = [
  'VTS_EDEN_VOTES_PIN',
  'VTS_EDEN_VOTES_PIN_HASH',
  'VTS_ADMIN_OVERRIDE_CODE',
  'VTS_ADMIN_OVERRIDE_HASH',
];

function runNpmScript(script, env = process.env) {
  const command = npmCliPath ? process.execPath : process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = npmCliPath
    ? [npmCliPath, 'run', script]
    : process.platform === 'win32'
      ? ['/d', '/s', '/c', `npm run ${script}`]
      : ['run', script];
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status || 1;
  return result.status === 0;
}

try {
  if (runNpmScript('build-env:check') && runNpmScript('admin-auth:inject')) {
    const sanitizedEnvironment = { ...process.env };
    for (const key of sensitiveEnvironmentKeys) {
      delete sanitizedEnvironment[key];
      delete process.env[key];
    }
    // Let security checks distinguish this temporary, build-time-injected
    // config from a hash accidentally committed to the public source. This
    // marker contains no secret material.
    sanitizedEnvironment.VTS_ADMIN_AUTH_INJECTED = '1';
    runNpmScript('check', sanitizedEnvironment);
  }
} finally {
  // The production artifact already contains the injected hashes. Restore the
  // source template so a local or CI verification never leaves credentials in
  // the worktree, including when a later check fails.
  writeFileSync(adminConfigPath, originalAdminConfig);
}
