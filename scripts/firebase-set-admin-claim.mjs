import fs from 'node:fs';
import process from 'node:process';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function envValue(key) {
  return String(process.env[key] || '').trim();
}

function readServiceAccount() {
  const inline = envValue('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (inline) return JSON.parse(inline);

  const accountPath = envValue('FIREBASE_SERVICE_ACCOUNT_PATH');
  if (accountPath) return JSON.parse(fs.readFileSync(accountPath, 'utf8'));

  throw new Error(
    'Missing service account. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.'
  );
}

async function main() {
  const args = process.argv.slice(2);
  // Break-glass path for the superadmin level. The setUserRole callable cannot
  // mint the FIRST superadmin — it requires a superadmin caller — and it
  // refuses self-demotion by design. So this script stays both the bootstrap
  // and the only way back in if the controller is ever broken.
  const superadmin = args.includes('--superadmin');
  const arg = args.find((value) => !value.startsWith('--')) || '';
  const uid = envValue('FIREBASE_ADMIN_UID') || (arg && !arg.includes('@') ? arg : '');
  const email = envValue('FIREBASE_ADMIN_EMAIL') || (arg && arg.includes('@') ? arg : '');

  if (!uid && !email) {
    throw new Error(
      'Usage: node scripts/firebase-set-admin-claim.mjs <uid-or-email> [--superadmin]\n' +
        'Or set FIREBASE_ADMIN_UID or FIREBASE_ADMIN_EMAIL environment variables.'
    );
  }

  const serviceAccount = readServiceAccount();
  initializeApp({
    credential: cert(serviceAccount),
  });

  const auth = getAuth();
  const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
  const currentClaims = user.customClaims || {};
  // superadmin implies admin, matching nextClaimsFor() in the callable.
  const claims = superadmin
    ? { ...currentClaims, admin: true, superadmin: true }
    : { ...currentClaims, admin: true };
  await auth.setCustomUserClaims(user.uid, claims);

  console.log(
    superadmin
      ? `Firebase admin + superadmin claims enabled for UID ${user.uid}.`
      : `Firebase admin claim enabled for UID ${user.uid}.`
  );
  console.log('Reload the deployed admin page so Firebase refreshes the ID token.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
