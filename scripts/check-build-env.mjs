const REQUIRED_BUILD_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_RECAPTCHA_SITE_KEY',
];

const missing = REQUIRED_BUILD_ENV.filter((key) => !String(process.env[key] || '').trim());

if (missing.length) {
  console.error(`Missing required GitHub Pages build env: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Build environment check passed (${REQUIRED_BUILD_ENV.length} required values).`);
