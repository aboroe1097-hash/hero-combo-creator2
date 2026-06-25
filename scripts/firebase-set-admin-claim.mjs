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
  const uid = envValue('FIREBASE_ADMIN_UID');
  const email = envValue('FIREBASE_ADMIN_EMAIL');

  if (!uid && !email) {
    throw new Error(
      'Set FIREBASE_ADMIN_UID for the deployed anonymous admin user, or FIREBASE_ADMIN_EMAIL for an email-auth user.'
    );
  }

  const serviceAccount = readServiceAccount();
  initializeApp({
    credential: cert(serviceAccount),
  });

  const auth = getAuth();
  const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
  const currentClaims = user.customClaims || {};
  await auth.setCustomUserClaims(user.uid, { ...currentClaims, admin: true });

  console.log(`Firebase admin claim enabled for UID ${user.uid}.`);
  console.log('Reload the deployed admin page so Firebase refreshes the ID token.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
