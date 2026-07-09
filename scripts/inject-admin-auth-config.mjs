import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA_256_HEX_RE = /^[a-f0-9]{64}$/;
const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(rootDir, 'js', 'admin-auth-config.js');

function sha256Hex(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

const configuredHash = String(process.env.VTS_EDEN_VOTES_PIN_HASH || '')
  .trim()
  .toLowerCase();
const configuredPin = String(process.env.VTS_EDEN_VOTES_PIN || '');
const nextHash = configuredHash || (configuredPin ? sha256Hex(configuredPin) : '');

if (nextHash && !SHA_256_HEX_RE.test(nextHash)) {
  console.error('VTS_EDEN_VOTES_PIN_HASH must be a 64-character SHA-256 hex digest.');
  process.exit(1);
}

const source = readFileSync(configPath, 'utf8');
if (!/edenVotesPinHash:\s*'[^']*'/.test(source)) {
  console.error('Missing edenVotesPinHash field in js/admin-auth-config.js.');
  process.exit(1);
}

const updated = source.replace(/edenVotesPinHash:\s*'[^']*'/, `edenVotesPinHash: '${nextHash}'`);
writeFileSync(configPath, updated);

console.log(
  nextHash
    ? 'Injected Eden votes and Bonus Team Effort PIN hash.'
    : 'No Eden votes PIN configured; sensitive admin PIN gate remains disabled.'
);
