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

// The sensitive-admin PIN is gone. The tabs it hid — Eden Workspace and Bonus
// Team Effort Points — are gated on the superadmin custom claim, which
// firestore.rules enforces server-side rather than in the browser. Only the
// destructive-action override hashes are injected now.

// Destructive-action override (Clear All + per-record delete). Accept either a
// raw code (hashed here) or a pre-computed SHA-256 hash. Never commit either.
const overrideHashEnv = String(process.env.VTS_ADMIN_OVERRIDE_HASH || '')
  .trim()
  .toLowerCase();
const overrideCode = String(process.env.VTS_ADMIN_OVERRIDE_CODE || '');
const overrideHash = overrideHashEnv || (overrideCode ? sha256Hex(overrideCode) : '');

if (overrideHash && !SHA_256_HEX_RE.test(overrideHash)) {
  console.error('VTS_ADMIN_OVERRIDE_HASH must be a 64-character SHA-256 hex digest.');
  process.exit(1);
}

const source = readFileSync(configPath, 'utf8');
if (!/clearHash:\s*'[^']*'/.test(source) || !/deleteHashes:\s*\[[^\]]*\]/.test(source)) {
  console.error('Missing clearHash/deleteHashes fields in js/admin-auth-config.js.');
  process.exit(1);
}

const updated = source
  .replace(/clearHash:\s*'[^']*'/, `clearHash: '${overrideHash}'`)
  .replace(
    /deleteHashes:\s*\[[^\]]*\]/,
    `deleteHashes: [${overrideHash ? `'${overrideHash}'` : ''}]`
  );
writeFileSync(configPath, updated);

console.log(
  overrideHash
    ? 'Injected destructive-action override hash (Clear All + delete).'
    : 'No admin override configured; Clear All / delete overrides stay disabled.'
);
