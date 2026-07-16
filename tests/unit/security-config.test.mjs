import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const INLINE_EVENT_HANDLER_ATTRIBUTE = /\son[a-z][a-z0-9:_-]*\s*=/i;

test('public admin auth config only keeps destructive action override hashes', () => {
  const source = readFileSync('js/admin-auth-config.js', 'utf8');
  assert.match(source, /adminPin:\s*''/);
  const hasBuildTimeInjection = process.env.VTS_ADMIN_AUTH_INJECTED === '1';

  // clearHash / deleteHashes are empty in the committed source, but the deploy
  // step (scripts/inject-admin-auth-config.mjs) fills them from the
  // VTS_ADMIN_OVERRIDE_CODE / VTS_ADMIN_OVERRIDE_HASH secrets before checks run.
  // verify-deploy removes those secrets before launching the checks and leaves
  // only a non-sensitive marker indicating that injection already occurred.
  const clearHash = source.match(/clearHash:\s*'([^']*)'/)?.[1];
  const deleteHashesBody = source.match(/deleteHashes:\s*\[([^\]]*)\]/)?.[1] ?? undefined;
  assert.notEqual(clearHash, undefined);
  assert.notEqual(deleteHashesBody, undefined);
  const deleteHashes = deleteHashesBody
    .split(',')
    .map((entry) => entry.trim().replace(/^'|'$/g, ''))
    .filter(Boolean);
  if (hasBuildTimeInjection) {
    assert.match(clearHash, /^(?:|[a-f0-9]{64})$/);
    for (const hash of deleteHashes) assert.match(hash, /^[a-f0-9]{64}$/);
  } else {
    assert.equal(clearHash, '');
    assert.equal(deleteHashes.length, 0);
  }

  const edenVotesPinHash = source.match(/edenVotesPinHash:\s*'([^']*)'/)?.[1];
  assert.notEqual(edenVotesPinHash, undefined);
  if (hasBuildTimeInjection) {
    assert.match(edenVotesPinHash, /^(?:|[a-f0-9]{64})$/);
  } else {
    assert.equal(edenVotesPinHash, '');
  }
  assert.doesNotMatch(source, /adminHash/);
  assert.doesNotMatch(source, /12345/);
  assert.doesNotMatch(source, /232323/);
  assert.doesNotMatch(source, /5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5/);
});

test('sensitive PIN gate has no committed fallback secret', () => {
  const source = readFileSync('js/admin-pin-gate.js', 'utf8');
  assert.match(source, /window\.VTS_ADMIN_AUTH\?\.edenVotesPinHash/);
  assert.match(source, /window\.VTS_ADMIN_AUTH\?\.adminPin \|\| ''/);
  assert.match(source, /if \(!hasConfiguredPinGate\(\)\) return false;/);
  assert.doesNotMatch(source, /if \(!hasConfiguredPinGate\(\)\) return Promise\.resolve\(true\);/);
  assert.match(source, /Owner PIN not configured/);
  assert.match(source, /subtle\.digest\('SHA-256'/);
  assert.doesNotMatch(source, /232323/);
});

test('Battle Simulator remains private-indexed and fail-closed before PIN unlock', () => {
  const page = readFileSync('battle-simulator.html', 'utf8');
  const bootstrap = readFileSync('js/battle-simulator.js', 'utf8');
  const gateCall = bootstrap.indexOf('await requireSensitiveAdminPin');
  const appImport = bootstrap.indexOf("await import('./battle-simulator-app.js')");

  assert.match(page, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(page, /<body class="battle-simulator-page is-locked">/);
  assert.match(page, /<div id="battleSimulatorMount" hidden><\/div>/);
  assert.ok(gateCall >= 0, 'Battle Simulator should request the shared sensitive PIN');
  assert.ok(appImport > gateCall, 'simulator code must load only after the PIN gate resolves');
  assert.match(bootstrap, /if \(!unlocked\) \{\s*location\.assign\('index\.html'\);/);
  assert.match(bootstrap, /title: 'Beta Testers Only'/);
  assert.match(bootstrap, /Only Beta Testers are allowed to access the Battle Simulator/);
});

test('admin boot does not preload gated Eden vote records', () => {
  const source = readFileSync('js/ocr-dashboard.js', 'utf8');
  const bootBlock = source.match(
    /async function openAdminDashboardAfterAuth[\s\S]*?\/\/ --- Persistence ---/
  )?.[0];
  assert.ok(bootBlock, 'openAdminDashboardAfterAuth block should be present');
  assert.doesNotMatch(bootBlock, /loadEdenX1VoteAdminData/);
});

test('deploy can inject sensitive admin PIN hash without committing raw PIN', () => {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const script = readFileSync('scripts/inject-admin-auth-config.mjs', 'utf8');
  const verifyScript = readFileSync('scripts/verify-deploy.mjs', 'utf8');
  assert.match(workflow, /VTS_EDEN_VOTES_PIN:/);
  assert.match(workflow, /VTS_EDEN_VOTES_PIN_HASH:/);
  assert.match(workflow, /npm run verify:deploy/);
  assert.equal(
    packageJson.scripts['admin-auth:inject'],
    'node scripts/inject-admin-auth-config.mjs'
  );
  assert.equal(packageJson.scripts['verify:deploy'], 'node scripts/verify-deploy.mjs');
  assert.match(verifyScript, /runNpmScript\('admin-auth:inject'\)/);
  assert.match(verifyScript, /delete sanitizedEnvironment\[key\]/);
  assert.match(verifyScript, /writeFileSync\(adminConfigPath, originalAdminConfig\)/);
  assert.match(script, /createHash\('sha256'\)/);
  assert.match(script, /edenVotesPinHash:\s*'\$\{nextHash\}'/);
  assert.doesNotMatch(script, /232323/);
});

test('PR CI runs the deploy-equivalent gate without production secrets', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const verifyScript = readFileSync('scripts/verify-deploy.mjs', 'utf8');

  assert.match(ci, /pull_request:/);
  assert.match(ci, /deploy-verification:/);
  assert.match(ci, /name: deploy-verification/);
  assert.match(ci, /VITE_FIREBASE_API_KEY: dummy/);
  assert.match(ci, /VTS_EDEN_VOTES_PIN: ci-only-not-a-secret/);
  assert.match(ci, /VTS_ADMIN_OVERRIDE_CODE: ci-only-not-a-secret/);
  assert.match(ci, /actions\/setup-python@v6/);
  assert.match(ci, /npx playwright install --with-deps chromium/);
  assert.match(ci, /npm run verify:deploy/);
  assert.doesNotMatch(ci, /\$\{\{\s*secrets\./);
  assert.match(deploy, /npm run verify:deploy/);
  assert.equal(packageJson.scripts['verify:deploy'], 'node scripts/verify-deploy.mjs');
  assert.match(verifyScript, /runNpmScript\('build-env:check'\)/);
  assert.match(verifyScript, /runNpmScript\('admin-auth:inject'\)/);
  assert.match(verifyScript, /runNpmScript\('check', sanitizedEnvironment\)/);
});

test('production deploy is gh-pages-only and uses least-privilege secret scope', () => {
  const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');

  assert.match(deploy, /build:\s*\n\s*if: github\.ref == 'refs\/heads\/gh-pages'/);
  assert.match(deploy, /deploy:[\s\S]*permissions:\s*\n\s*pages: write\s*\n\s*id-token: write/);
  assert.doesNotMatch(deploy, /permissions:\s*\n\s*contents: read\s*\n\s*pages: write/);
  assert.match(deploy, /name: Verify deploy artifact[\s\S]*env:[\s\S]*VTS_EDEN_VOTES_PIN:/);
  assert.doesNotMatch(deploy, /VTS_EDEN_VOTES_PIN:\s*\$\{\{[^\n]*vars\.VTS_EDEN_VOTES_PIN/);
  assert.doesNotMatch(
    deploy,
    /VTS_ADMIN_OVERRIDE_CODE:\s*\$\{\{[^\n]*vars\.VTS_ADMIN_OVERRIDE_CODE/
  );
});

test('browser smoke serves the built Pages artifact', () => {
  const developmentConfig = readFileSync('playwright.config.js', 'utf8');
  const productionConfig = readFileSync('playwright.production.config.js', 'utf8');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.match(developmentConfig, /PLAYWRIGHT_DEV_PORT \|\| 5173/);
  assert.match(developmentConfig, /requestedDevPort >= 1024/);
  assert.match(
    developmentConfig,
    /npm run dev -- --host 127\.0\.0\.1 --port \$\{devPort\} --strictPort/
  );
  assert.match(developmentConfig, /reuseExistingServer: false/);
  assert.match(productionConfig, /PLAYWRIGHT_LOCAL_PORT \|\| 4173/);
  assert.match(productionConfig, /requestedLocalPort >= 1024/);
  assert.match(
    productionConfig,
    /npm run preview -- --host 127\.0\.0\.1 --port \$\{localPort\} --strictPort/
  );
  assert.match(packageJson.scripts['smoke:prod'], /playwright\.production\.config\.js/);
  assert.match(packageJson.scripts.check, /npm run size:check && npm run smoke:prod/);
});

test('workflow requires owner-configured Code Owner branch protection', () => {
  const workflow = readFileSync('docs/version-control-workflow.md', 'utf8');
  const codeowners = readFileSync('.github/CODEOWNERS', 'utf8');

  assert.match(workflow, /An owner must configure and periodically verify/);
  assert.match(workflow, /Require review from Code Owners/);
  assert.doesNotMatch(workflow, /has the following protection rules configured/);
  assert.match(codeowners, /^\* @aboroe1097-hash$/m);
});

test('frontend CSP and markup avoid executable inline script bypasses', () => {
  const pages = [
    'index.html',
    'admin.html',
    'eden-x1.html',
    'arcade.html',
    'battle-simulator.html',
  ];
  const inlineExecutableScript =
    /<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|importmap)")/i;

  for (const page of pages) {
    const source = readFileSync(page, 'utf8');
    assert.doesNotMatch(
      source,
      INLINE_EVENT_HANDLER_ATTRIBUTE,
      `${page} should not use inline handlers`
    );
    assert.doesNotMatch(
      source,
      inlineExecutableScript,
      `${page} should not use executable inline scripts`
    );
  }

  for (const attribute of ['onload', 'onerror', 'onpointerdown', 'ontouchstart']) {
    assert.match(`<img ${attribute}="run()">`, INLINE_EVENT_HANDLER_ATTRIBUTE);
  }

  for (const page of pages) {
    const source = readFileSync(page, 'utf8');
    const csp =
      source.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || '';
    const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] || '';
    const connectSrc = csp.match(/connect-src\s+([^;]+)/)?.[1] || '';
    const declaredHashes = [...scriptSrc.matchAll(/'sha256-[A-Za-z0-9+/]+={0,2}'/g)].map(
      ([hash]) => hash
    );
    const inlineScriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    const expectedHashes = [...source.matchAll(inlineScriptPattern)]
      .filter(([, attributes]) => !/(?:^|\s)src\s*=/i.test(attributes))
      .map(([, , body]) => {
        const browserSource = body.replace(/\r\n?/g, '\n');
        return `'sha256-${createHash('sha256').update(browserSource).digest('base64')}'`;
      });
    assert.ok(scriptSrc, `${page} should define script-src`);
    assert.doesNotMatch(scriptSrc, /'unsafe-inline'/);
    if (page === 'battle-simulator.html') {
      assert.equal(connectSrc.trim(), "'self'", `${page} should not open external connections`);
    } else {
      assert.match(
        connectSrc,
        /https:\/\/region1\.google-analytics\.com/,
        `${page} should allow the regional Analytics collection endpoint`
      );
    }
    assert.deepEqual(
      declaredHashes.sort(),
      expectedHashes.sort(),
      `${page} CSP hashes should match its exact inline script contents`
    );
    if (page === 'eden-x1.html') assert.match(scriptSrc, /https:\/\/docs\.google\.com/);
  }

  const index = readFileSync('index.html', 'utf8');
  const indexCsp =
    index.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || '';
  assert.match(indexCsp, /frame-src\s+'self'/, 'Arcade games must be embeddable same-origin');
  assert.match(index, /js\/theme-prepaint\.js/);
  assert.match(index, /js\/index-page-enhancements\.js/);
  assert.match(index, /data-footer-tab="manual"/);
});

test('build metadata refreshes cache-busted modules while Material shares the main graph', () => {
  const script = readFileSync('scripts/update-build-metadata.mjs', 'utf8');
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(script, /createHash\('sha256'\)/);
  assert.match(script, /updateCspHashes\(\)/);
  assert.match(script, /app-research\|eden-map\|app-strife\|app-export\|arcade-spa/);
  assert.doesNotMatch(script, /material-calculator/);
  assert.doesNotMatch(app, /20260708_101500/);
  assert.doesNotMatch(app, /app-whats-new\.js/);
  assert.match(app, /app-export\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /arcade-spa\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /app-research\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /import\('\.\/material-calculator\.js'\)/);
  assert.doesNotMatch(app, /material-calculator\.js\?v=/);
  assert.match(
    app,
    /materialModulePromise = import\('\.\/material-calculator\.js'\)\.catch\(\(err\) => \{\s*materialModulePromise = null;\s*reportDynamicImportFailure\(err\);\s*throw err;/
  );
  assert.match(app, /eden-map\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /app-strife\.js\?v=\d{8}_\d{6}/);
});

test('theme manifests include dark and light install colors', () => {
  const darkManifest = JSON.parse(readFileSync('site.webmanifest', 'utf8'));
  const lightManifest = JSON.parse(readFileSync('site-light.webmanifest', 'utf8'));
  assert.equal(darkManifest.theme_color, '#0f172a');
  assert.equal(darkManifest.background_color, '#0f172a');
  assert.equal(lightManifest.theme_color, '#f8fafc');
  assert.equal(lightManifest.background_color, '#f8fafc');
});

test('admin dashboard uses Firebase auth instead of local password markers', () => {
  const source = readFileSync('js/ocr-dashboard.js', 'utf8');
  const firebase = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /signInWithUsername/);
  assert.match(source, /isAdminAuthUser/);
  assert.match(source, /adminIsAdmin/);
  assert.doesNotMatch(source, /localStorage\.getItem\(AUTH_KEY\)\s*===\s*AUTH_HASH/);
  assert.doesNotMatch(source, /localStorage\.setItem\(AUTH_KEY,\s*AUTH_HASH\)/);
  assert.doesNotMatch(source, /sessionStorage\.setItem\('vts_guest'/);
  assert.match(firebase, /signInWithEmailAndPassword/);
  assert.match(firebase, /usernameToEmail/);
  assert.match(firebase, /isPasswordAuthUser/);
});

test('firebase config reads public web config without committed Google API keys', () => {
  const source = readFileSync('js/firebase-config.js', 'utf8');
  assert.match(source, /VITE_FIREBASE_API_KEY/);
  assert.match(source, /import\.meta\.env/);
  assert.match(source, /VTS_FIREBASE_CONFIG/);
  assert.doesNotMatch(source, /FALLBACK_CONFIG/);
  assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/);
});

test('firebase app check stays lazy until a protected token is requested', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  const initStart = source.indexOf('export function initFirebase()');
  const authStart = source.indexOf('let authInFlight', initStart);
  assert.notEqual(initStart, -1);
  assert.notEqual(authStart, -1);
  const initBody = source.slice(initStart, authStart);
  assert.doesNotMatch(initBody, /initializeAppCheck|ReCaptchaEnterpriseProvider|getToken/);
  assert.match(source, /async function ensureFirebaseAppCheck\(\)/);
  assert.match(source, /export async function getFirebaseAppCheckToken/);
});

test('firebase analytics waits for post-load interaction or the ten-second fallback', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /function scheduleFirebaseAnalytics\(\)/);
  assert.match(source, /\['pointerdown', 'keydown', 'touchstart', 'scroll'\]/);
  assert.doesNotMatch(source, /requestIdleCallback\(startAnalytics/);
  assert.match(source, /setTimeout\?\.\(startAnalytics, 10000\)/);
  assert.match(source, /addEventListener\?\.\('load', armPostLoad, \{ once: true \}\)/);
});

test('firebase init preserves configured status after first initialization', () => {
  const source = readFileSync('js/firebase.js', 'utf8');

  assert.match(source, /if \(app\) return \{ app, db, auth, analytics, configured: true \};/);
});

test('firebase app check token requests retry transient recaptcha failures', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /function shouldRetryAppCheckTokenError/);
  assert.match(source, /attempt < maxAttempts/);
  assert.match(source, /getToken\(currentAppCheck, forceRefresh \|\| attempt > 0\)/);
  assert.match(source, /unhandledrejection/);
  assert.match(source, /reCAPTCHA timed out/);
});

test('anonymous auth waits for persisted admin sessions before sign-in', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  const ensureStart = source.indexOf('export async function ensureAnonymousAuth()');
  const ensureEnd = source.indexOf('async function ensureFirebaseAppCheck()', ensureStart);
  assert.notEqual(ensureStart, -1);
  assert.notEqual(ensureEnd, -1);
  const ensureSource = source.slice(ensureStart, ensureEnd);

  assert.match(source, /export async function waitForAuthReady\(\)/);
  assert.match(source, /auth\.authStateReady/);
  assert.match(ensureSource, /waitForAuthReady\(\)/);
  assert.match(ensureSource, /signInAnonymously\(auth\)/);
  assert.ok(
    ensureSource.indexOf('waitForAuthReady()') < ensureSource.indexOf('signInAnonymously(auth)')
  );
});

test('admin dashboard cloud saves are coalesced before Firestore writes', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const engine = readFileSync('js/ocr-engine.js', 'utf8');
  assert.match(dashboard, /DASHBOARD_CLOUD_SAVE_DEBOUNCE_MS/);
  assert.match(dashboard, /function scheduleDashboardCloudSave/);
  assert.match(dashboard, /dashboardCloudSaveInFlight/);
  assert.match(dashboard, /dashboardCloudSavePendingData/);
  assert.match(dashboard, /if \(options\.cloud === false\) return false;/);
  assert.match(engine, /saveParsedData\(progressiveParsed, \{ cloud: false \}\)/);
  assert.match(engine, /saveParsedData\(parsed, \{ ocrAttacks: changedAttacks \}\)/);
});

test('admin tab navigation paints first and renders only the visible panel', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(dashboard, /function activeDashboardSubtabName\(\)/);
  assert.match(dashboard, /function renderDashboardSubtab\(name = activeDashboardSubtabName\(\)\)/);
  assert.match(
    dashboard,
    /requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => renderDashboardSubtab\(name\)\)\)/
  );
  assert.doesNotMatch(dashboard, /function renderAuxiliaryRecords\(\)/);
});

test('admin auxiliary records are included in dashboard cloud sync', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const roster = readFileSync('js/ocr-roster.js', 'utf8');
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(dashboard, /function attachAuxiliaryRecords/);
  assert.match(dashboard, /function getAuxiliaryRecordPayload/);
  assert.match(dashboard, /function pruneDashboardCloudData/);
  assert.match(dashboard, /const DASHBOARD_CLOUD_FIELD_KEYS = new Set/);
  assert.match(dashboard, /function writeAuxiliaryPayloadToCloud/);
  assert.match(dashboard, /const payload = withDashboardTimestamp\(auxiliaryPayload\);/);
  assert.match(dashboard, /runTransaction\(db, async \(transaction\)/);
  assert.match(dashboard, /transaction\.set\(ref, nextPayload, \{ merge: true \}\)/);
  assert.match(dashboard, /writeDashboardSnapshotToCloud\(/);
  assert.match(dashboard, /bannerRecords/);
  assert.match(dashboard, /dutyRecords/);
  assert.match(dashboard, /contributionRecords/);
  assert.match(dashboard, /playerRegistry/);
  assert.match(dashboard, /PLAYER_REGISTRY_KEY/);
  assert.match(roster, /syncDashboardAuxiliaryRecordsToCloud/);
  assert.match(roster, /export async function savePlayerRegistry/);
  assert.match(roster, /await saveDutyRecords\(\{ immediate: true, awaitCloud: true \}\)/);
  assert.match(roster, /notifySpecialListCloudResult/);
  assert.match(rules, /'bannerRecords', 'dutyRecords', 'contributionRecords'/);
  assert.match(rules, /'playerRegistry'/);
  assert.match(rules, /request\.resource\.data\.playerRegistry is map/);
});

test('admin activity history uses an isolated immutable admin-only collection', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const sync = readFileSync('js/admin-log-sync.js', 'utf8');
  const rules = readFileSync('firestore.rules', 'utf8');
  const dashboardValidator = rules.match(
    /function validDashboardData\(\)[\s\S]*?function validAdminLogEvent/
  )?.[0];
  const logMatch = rules.match(
    /match \/vts_admin\/log_store\/admin_log_events\/\{logId\}[\s\S]*?\n\s*}/
  )?.[0];

  assert.ok(dashboardValidator, 'dashboard and log validators should remain separate');
  assert.doesNotMatch(dashboardValidator, /'logs'/);
  assert.doesNotMatch(dashboard, /DASHBOARD_CLOUD_FIELD_KEYS[\s\S]{0,400}'logs'/);
  assert.match(sync, /vts_admin\/log_store\/admin_log_events/);
  assert.match(sync, /orderBy\('createdAt', 'desc'\)/);
  assert.match(sync, /limit\(ADMIN_LOG_REMOTE_LIMIT\)/);
  assert.ok(logMatch, 'admin log collection match should exist');
  assert.match(logMatch, /allow read: if isAdmin\(\)/);
  assert.match(logMatch, /allow create: if isAdmin\(\) && validAdminLogEvent\(logId\)/);
  assert.match(logMatch, /allow update, delete: if false/);
  assert.match(rules, /request\.resource\.data\.createdAt == request\.time/);
  assert.match(rules, /request\.resource\.data\.createdBy == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.params is string/);
  assert.match(rules, /request\.resource\.data\.file == ''/);
  assert.match(rules, /\(system\|dashboard\|ocr\|roster\|cloud\|sync\|import\|export\)/);
  assert.match(
    rules,
    /request\.resource\.data\.severity in \['info', 'warn', 'error', 'success'\]/
  );
  assert.match(rules, /request\.resource\.data\.source in \[/);
  assert.match(rules, /duration\.value\(31, 'd'\)/);
});

test('admin cloud boot and saves have bounded local-cache fallback', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  assert.match(dashboard, /DASHBOARD_CLOUD_BOOT_TIMEOUT_MS/);
  assert.match(dashboard, /DASHBOARD_CLOUD_WRITE_TIMEOUT_MS/);
  assert.match(dashboard, /DASHBOARD_CLOUD_RETRY_FLUSH_DELAY_MS/);
  assert.match(
    dashboard,
    /return Number\.isFinite\(override\) && override > 0 \? override : 20000;/
  );
  assert.match(dashboard, /function isRecoverableDashboardCloudError/);
  assert.match(dashboard, /function isFirestoreInternalWatchAssertion/);
  assert.match(dashboard, /installDashboardFirestoreErrorGuard\(\)/);
  assert.match(dashboard, /window\.addEventListener\('unhandledrejection'/);
  assert.match(dashboard, /state\._fsRosterUnsub = null/);
  assert.match(dashboard, /function runDashboardCloudTaskWithTimeout/);
  assert.match(dashboard, /function scheduleDashboardCloudRetryFlush/);
  assert.match(
    dashboard,
    /if \(shouldAutoFlushDashboardCloudRetry\(reason\)\) scheduleDashboardCloudRetryFlush\(\);/
  );
  assert.match(
    dashboard,
    /runDashboardCloudTaskWithTimeout\('Roster cloud load', loadRosterSnapshotsFromFirestore\)/
  );
  assert.match(
    dashboard,
    /runDashboardCloudTaskWithTimeout\(\s*'Bonus team effort points cloud load',\s*loadConductAdjustmentsForSeason/
  );
  assert.match(dashboard, /withDashboardCloudTimeout\(\s*cloudSave/);
  assert.match(dashboard, /withDashboardCloudTimeout\(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS/);
});

test('admin edit sessions begin on open and queued writes keep their own committed revision', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const roster = readFileSync('js/ocr-roster.js', 'utf8');

  assert.match(dashboard, /vts:admin-edit-surface-opened/);
  assert.match(dashboard, /adminEditGuard\.begin\('conduct-form', dashboardCloudBaseRevision\)/);
  assert.match(roster, /beginAdminEditSurface\(edit \? 'banner-edit' : 'banner-create'\)/);
  assert.match(roster, /beginAdminEditSurface\(existingRecord \? 'duty-edit' : 'duty-create'\)/);
  assert.match(roster, /'contribution-edit'\s*:\s*'contribution-create'/);
  assert.match(dashboard, /committedRevision = dashboardSyncRevision\(writtenPayload\)/);
  assert.match(
    dashboard,
    /dashboardCloudSavePendingBaseRevision = result \? committedRevision : null/
  );
});

test('attack edits and deletes carry record fingerprints into the cloud transaction', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const mutations = readFileSync('js/dashboard-attack-mutations.js', 'utf8');

  assert.match(mutations, /export function dashboardAttackFingerprint/);
  assert.match(mutations, /dashboardAttackFingerprint\(nextAttacks\[index\]\)/);
  assert.match(dashboard, /expectedFingerprint: dashboardAttackFingerprint\(removed\)/);
  assert.match(dashboard, /const expectedFingerprint = dashboardAttackFingerprint\(att\)/);
});

test('attack mutations use the compact dashboard serializer before Firestore writes', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(
    dashboard,
    /writeDashboardAttackMutationToCloud[\s\S]*?const preparedPayload = sanitizeDashboardDataForPersistence\(\{[\s\S]*?\.\.\.mutationResult\.data/
  );
});

test('shared admin dashboard reads stay available while writes require the admin custom claim', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  // Writes are gated on the `admin` custom claim, not the sign-in provider,
  // because the public web API key lets anyone self-register a password account.
  assert.match(rules, /function isAdmin\(\)/);
  assert.doesNotMatch(rules, /sign_in_provider == 'password'/);
  assert.match(dashboard, /isAdminAuthUser/);
  assert.match(
    rules,
    /match \/vts_admin\/dashboard_data\s*\{[\s\S]*allow read: if signedIn\(\);[\s\S]*allow create: if isAdmin\(\)[\s\S]*request\.resource\.data\.syncRevision == 1;[\s\S]*allow update: if isAdmin\(\)[\s\S]*validDashboardData\(\)[\s\S]*request\.resource\.data\.syncRevision == resource\.data\.syncRevision \+ 1[\s\S]*request\.resource\.data\.updatedAtMs >= resource\.data\.updatedAtMs/
  );
  assert.match(
    rules,
    /match \/vts_admin\/roster_data\s*\{[\s\S]*allow read: if signedIn\(\);[\s\S]*allow create, update: if isAdmin\(\) && validRosterData\(\);/
  );
  assert.doesNotMatch(rules, /allow create, update: if signedIn\(\) && validDashboardData\(\);/);
  assert.doesNotMatch(rules, /allow create, update: if signedIn\(\) && validRosterData\(\);/);
});

test('dashboard cloud revisions prevent stale local snapshots from overwriting cloud data', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const dashboardValidator =
    rules.match(/function validDashboardData\(\) \{([\s\S]*?)\n[ ]{4}\}/)?.[1] || '';

  assert.match(dashboard, /DASHBOARD_CLOUD_FIELD_KEYS = new Set\(\[\s*'updatedAtMs'/);
  assert.match(dashboard, /'syncRevision'/);
  assert.match(dashboard, /persistedData\.updatedAtMs = Date\.now\(\);/);
  assert.match(dashboard, /const seedPayload = withDashboardTimestamp\(/);
  assert.match(dashboard, /const clearedPayload = \{\s*updatedAtMs: Date\.now\(\),/);
  assert.match(dashboard, /function writeDashboardSnapshotToCloud/);
  assert.match(dashboard, /transaction\.get\(ref\)/);
  assert.match(dashboard, /syncRevision: cloudRevision \+ 1/);
  assert.match(dashboard, /dashboardCloudSavePendingBaseRevision/);
  assert.match(
    dashboard,
    /dashboardCloudSavePendingBaseRevision = result \? committedRevision : null/
  );
  assert.doesNotMatch(
    dashboard,
    /dashboardCloudSavePendingBaseRevision = result \? dashboardCloudBaseRevision : null/
  );
  assert.match(dashboard, /dashboardCloudSavePendingBaseRevision = dashboardCloudSaveInFlight/);
  assert.doesNotMatch(dashboard, /dashboardCloudSaveInFlightTargetRevision/);
  assert.match(dashboard, /function preserveLocalDashboardConflict/);
  assert.doesNotMatch(dashboard, /adminLocalNewerRestorePrompt/);
  assert.doesNotMatch(dashboard, /Ignored an older dashboard snapshot returned by cloud sync/);
  assert.match(dashboardValidator, /'updatedAtMs'/);
  assert.match(dashboardValidator, /'syncRevision'/);
  assert.match(dashboardValidator, /request\.resource\.data\.updatedAtMs is number/);
  assert.match(dashboardValidator, /request\.resource\.data\.syncRevision is int/);
  assert.doesNotMatch(dashboardValidator, /!\('updatedAtMs' in request\.resource\.data\)/);
  assert.match(rules, /request\.resource\.data\.updatedAtMs >= resource\.data\.updatedAtMs/);
  assert.match(dashboard, /const loadGeneration = \+\+dashboardLoadGeneration;/);
  assert.match(dashboard, /if \(!isCurrentLoad\(\)\) return;/);
  assert.match(
    dashboard,
    /if \(preferCloudFirst && localData\) \{\s*restoreDashboardLocalFallback\(localData\);/
  );
  assert.match(
    dashboard,
    /if \(state\.dashData\) logDashboardEvent\('adminCloudLocalCache', 'warn', \{\}, \{ source: 'cloud' \}\);/
  );
  assert.match(dashboard, /function writeDashboardOcrUploadToCloud/);
  assert.match(dashboard, /mergeDashboardOcrAttacks\(cloudData\.attacks, incomingAttacks\)/);
  assert.match(dashboard, /export async function saveDashboardOcrUpload/);
});

test('Eden X1 requires authoritative vote settings while tolerating optional sidecars', () => {
  const eden = readFileSync('js/eden-x1.js', 'utf8');

  assert.match(eden, /const EDEN_X1_OPTIONAL_READ_TIMEOUT_MS = 3500;/);
  assert.match(eden, /async function loadEdenOptionalData/);
  assert.match(eden, /'roster data'/);
  assert.match(eden, /getDoc\(doc\(db, EDEN_X1_VOTE_SETTINGS_DOC_PATH\)\)/);
  assert.match(eden, /requireAuthoritativeEdenVoteSettings/);
  assert.doesNotMatch(eden, /loadEdenOptionalData\([^)]*vote settings/);
  assert.match(eden, /'public vote results'/);
  assert.match(eden, /'bonus team effort points'/);
  assert.match(eden, /Array\.isArray\(liveConductAdjustments\)/);
});

test('admin gate uses the Firebase admin claim and sign-out cannot auto re-login', () => {
  const firebase = readFileSync('js/firebase.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const adjustments = readFileSync('js/ocr-adjustments.js', 'utf8');

  // The password-sign-in helper exists and inspects the password provider.
  assert.match(firebase, /export async function isPasswordAuthUser/);
  assert.match(firebase, /providerId === 'password'|signInProvider === 'password'/);
  assert.match(firebase, /catch\s*\{[\s\S]*return false;[\s\S]*\}/);
  assert.doesNotMatch(firebase, /token read failed[\s\S]*return true;/i);
  // The dashboard gate mirrors the Firestore admin-claim requirement. The
  // adjustment fallback still recognizes password-auth users when it is used
  // outside the dashboard context.
  assert.match(dashboard, /isAdminAuthUser/);
  assert.match(adjustments, /isPasswordAuthUser/);
  // Auth-state changes must validate a candidate before replacing the stored
  // admin session; anonymous/public auth events can arrive while the admin UI
  // is still open and should not poison later conduct writes.
  assert.match(dashboard, /const candidateIsAdmin = await isAdminAuthUser\(user\)/);
  assert.doesNotMatch(
    dashboard,
    /state\.adminUser = user;\s*state\.adminIsAdmin = await isAdminAuthUser\(user\);/
  );
  assert.match(
    dashboard,
    /if \(await isAdminAuthUser\(state\.adminUser, options\)\) return state\.adminUser;/
  );
  // Explicit sign-out sets a guard so the auth-state listener cannot restore
  // the session or reopen the dashboard (the auto re-login bug).
  assert.match(dashboard, /state\._signingOut = true/);
  assert.match(dashboard, /if \(state\._signingOut\)/);
});

test('admin stale chunk failures trigger one guarded asset recovery reload', () => {
  const adminPage = readFileSync('js/admin-page.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  for (const source of [adminPage, dashboard]) {
    assert.match(source, /vts_admin_stale_asset_recovery_v1/);
    assert.match(source, /Failed to fetch dynamically imported module/);
    assert.match(source, /caches\.delete/);
    assert.match(source, /registration\.unregister\(\)/);
    assert.match(source, /window\.location\.reload\(\)/);
  }
  assert.match(adminPage, /vite:preloadError/);
  assert.match(dashboard, /recoverFromStaleAssetGraph\(e\)/);
});

test('R5 conduct adjustments are stored separately and use the admin claim', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  assert.match(rules, /function validConductAdjustment\(\)/);
  assert.match(rules, /match \/vts_admin\/conduct_adjustments\/records\/\{adjustmentId\}/);
  assert.match(rules, /allow read: if signedIn\(\);/);
  assert.match(rules, /allow create: if isAdmin\(\)[\s\S]*validConductAdjustment\(\)/);
  assert.match(rules, /allow update: if isAdmin\(\)[\s\S]*validConductAdjustment\(\)/);
  assert.match(rules, /request\.resource\.data\.createdBy == request\.auth\.uid/);
  assert.match(rules, /function repairsHistoricalConductMetadata\(\)/);
  assert.match(rules, /keepsConductMetadata\(\) \|\| repairsHistoricalConductMetadata\(\)/);
});

test('Eden X1 votes are member-keyed with admin list and owner get', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const eden = readFileSync('js/eden-x1.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  assert.match(rules, /function validEdenX1Vote\(\)/);
  assert.match(rules, /function validEdenX1VotePath\(voteId\)/);
  assert.match(rules, /function canGetOwnEdenX1Vote\(voteId\)/);
  assert.match(rules, /match \/vts_admin\/eden_x1_votes\/records\/\{voteId\}/);
  assert.match(rules, /allow get: if isAdmin\(\) \|\| canGetOwnEdenX1Vote\(voteId\);/);
  assert.match(rules, /allow list, delete: if isAdmin\(\);/);
  assert.match(rules, /resource\.data\.id == voteId/);
  assert.match(rules, /allow create: if signedIn\(\)[\s\S]*validEdenX1Vote\(\)/);
  assert.match(rules, /allow create: if signedIn\(\)[\s\S]*validEdenX1VotePath\(voteId\)/);
  assert.match(
    rules,
    /allow update: if signedIn\(\)[\s\S]*validEdenX1VotePath\(voteId\)[\s\S]*\(isAdmin\(\) \|\| resource\.data\.voterAuthUid == request\.auth\.uid\)/
  );
  assert.match(
    rules,
    /voteId == request\.resource\.data\.season \+ '__team_players__' \+ request\.resource\.data\.voterKey/
  );
  assert.match(rules, /request\.resource\.data\.category == 'team_players'/);
  assert.match(rules, /request\.resource\.data\.candidateKeys is list/);
  assert.match(rules, /request\.resource\.data\.candidateKeys\.size\(\) >= 1/);
  assert.match(rules, /request\.resource\.data\.candidateKeys\.size\(\) <= 4/);
  assert.match(rules, /request\.resource\.data\.candidateNames is list/);
  assert.match(
    rules,
    /request\.resource\.data\.candidateNames\.size\(\) == request\.resource\.data\.candidateKeys\.size\(\)/
  );
  assert.match(rules, /request\.resource\.data\.candidateNames\.size\(\) >= 1/);
  assert.match(rules, /request\.resource\.data\.candidateNames\.size\(\) <= 4/);
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[0\] != request\.resource\.data\.candidateKeys\[1\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[0\] != request\.resource\.data\.candidateKeys\[2\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[0\] != request\.resource\.data\.candidateKeys\[3\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[1\] != request\.resource\.data\.candidateKeys\[2\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[1\] != request\.resource\.data\.candidateKeys\[3\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[2\] != request\.resource\.data\.candidateKeys\[3\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKey == request\.resource\.data\.candidateKeys\[0\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateName == request\.resource\.data\.candidateNames\[0\]/
  );
  assert.match(rules, /request\.resource\.data\.voterAuthUid == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.updatedAt == request\.time/);
  assert.match(rules, /function validEdenX1VoteHistory\(\)/);
  assert.match(rules, /match \/vts_admin\/eden_x1_vote_history\/records\/\{historyId\}/);
  assert.match(rules, /allow read: if isAdmin\(\);/);
  assert.match(
    rules,
    /allow create: if signedIn\(\)[\s\S]*validEdenX1VoteHistory\(\)[\s\S]*validEdenX1VoteHistoryPath\(historyId\)/
  );
  assert.match(rules, /allow update, delete: if false;/);
  assert.match(rules, /match \/vts_admin\/eden_x1_vote_settings/);
  assert.match(rules, /allow read: if signedIn\(\);/);
  assert.match(rules, /allow create, update: if isAdmin\(\) && validEdenX1VoteSettings\(\);/);
  assert.match(eden, /EDEN_X1_VOTES_COLLECTION_PATH = 'vts_admin\/eden_x1_votes\/records'/);
  assert.match(
    eden,
    /EDEN_X1_VOTE_HISTORY_COLLECTION_PATH = 'vts_admin\/eden_x1_vote_history\/records'/
  );
  assert.match(eden, /EDEN_X1_VOTE_SETTINGS_DOC_PATH = 'vts_admin\/eden_x1_vote_settings'/);
  assert.match(
    eden,
    /const voterAuthUid = edenVoteWriteContext\?\.user\?\.uid \|\| 'local-test';[\s\S]*const id = edenVoteDocId\(season, voter\.playerKey\);/
  );
  assert.doesNotMatch(eden, /edenVoteDocId\(season, voterAuthUid\)/);
  assert.match(eden, /voterAuthUid/);
  assert.match(dashboard, /function dedupeEdenX1Votes/);
  assert.match(eden, /previousVoteKnown/);
  assert.match(eden, /saving vote with create-only history fallback/);
  assert.match(eden, /serverTimestamp\(\)/);
  assert.match(dashboard, /loadEdenX1VoteAdminData/);
  assert.match(dashboard, /setEdenX1VotesForTest/);
});

test('service worker precaches a complete, version-stamped app shell', () => {
  const source = readFileSync('public/sw.js', 'utf8');
  const urls = [...source.matchAll(/ {2}'([^']+)'/g)].map((match) => match[1]);
  const stamp = /\?v=\d{8}_\d{6}$/;

  // v14 adds the standalone Arcade and Battle Simulator entries, the global
  // command palette, and the two small Velo layers needed by Eden's first-paint
  // loader. Keep a measured one-entry margin without allowing the shell to grow
  // unbounded.
  assert.ok(urls.length <= 51, `expected bounded app shell, found ${urls.length} URLs`);
  assert.ok(urls.includes('/index.html'));
  assert.ok(urls.includes('/admin.html'));
  assert.ok(urls.includes('/eden-x1.html'));
  assert.ok(urls.includes('/arcade.html'));
  assert.ok(urls.includes('/battle-simulator.html'));
  assert.ok(urls.includes('/maintenance.html'));
  assert.ok(urls.some((url) => url.startsWith('/css/battle-simulator.css?v=')));
  assert.ok(urls.some((url) => url.startsWith('/js/battle-simulator.js?v=')));
  assert.ok(urls.some((url) => url.startsWith('/css/command-palette.css?v=')));
  assert.ok(urls.some((url) => url.startsWith('/js/command-palette.js?v=')));
  assert.ok(urls.includes('/images/logo.png'));
  assert.ok(urls.includes('/images/logo-120.webp'));
  assert.ok(urls.includes('/images/logo-40.webp'));
  // css/js entries must carry the ?v= stamp so cache keys can never mix
  // assets from different deploys.
  for (const url of urls) {
    if (/\.(?:css|js)(?:\?|$)/.test(url)) {
      assert.match(url, stamp, `unstamped css/js precache entry: ${url}`);
    }
  }
  assert.ok(urls.some((url) => url.startsWith('/js/app.js?v=')));
  assert.ok(urls.some((url) => url.startsWith('/js/theme-prepaint.js?v=')));
  assert.ok(urls.some((url) => url.startsWith('/tabs/admin.html?v=')));
  // Dynamically imported modules are added from the built output by
  // scripts/post-build.mjs, not the source manifest.
  assert.ok(!urls.some((url) => url.startsWith('/js/ocr-dashboard.js')));
  assert.ok(!urls.some((url) => url.startsWith('/js/tech-db.js')));
  assert.ok(!urls.includes('/images/strife/roc-strife-reference.png'));

  // Caching mechanics: atomic critical precache, no forced full re-downloads,
  // and the previous deploy's cache retained for already-open pages.
  assert.match(source, /batchAddAll\(cache, critical/);
  assert.doesNotMatch(source, /cache:\s*'reload'/);
  assert.match(source, /CRITICAL_PRECACHE_PATTERN/);
  assert.match(source, /const VTS_CACHE_PREFIX = 'vts-'/);
  assert.match(source, /older\[older\.length - 1\]/);
  assert.match(source, /async function matchCurrentThenAny/);
  assert.match(source, /key\.startsWith\(VTS_CACHE_PREFIX\)/);
  assert.match(
    source,
    /const owned = keys\.filter\(\(key\) => key\.startsWith\(VTS_CACHE_PREFIX\)\)/
  );
  assert.match(source, /request\.headers\.has\('Authorization'\)/);
  assert.match(source, /request\.credentials !== 'include'/);
  assert.match(source, /private\|no-store/);
  assert.match(source, /response\.headers\.has\('Set-Cookie'\)/);
  assert.match(source, /credentials: 'omit'/);
  assert.doesNotMatch(source, /FIREBASE_CDN_PREFIX/);
  assert.match(source, /return \(await matchCurrentThenAny\(key\)\) \|\| response/);
  assert.match(source, /event\.respondWith\(networkFirst\(request\)\)/);
  assert.match(source, /navigationFallback\(url\.pathname\)/);
  assert.match(source, /isImmutableAssetUrl/);
  assert.doesNotMatch(source, /url\.pathname\.startsWith\('\/assets\/'\)\) return true/);
});

test('service worker cache policy rejects private traffic and preserves foreign caches', async () => {
  const source = readFileSync('public/sw.js', 'utf8');
  const currentVersion = source.match(/const CACHE_VERSION = '([^']+)'/)?.[1];
  assert.ok(currentVersion, 'service worker cache version should be discoverable');

  const listeners = {};
  const deleted = [];
  let activationPromise;
  const context = vm.createContext({
    Request,
    Response,
    URL,
    fetch: async () => new Response('ok'),
    caches: {
      async open() {
        return {
          async match() {
            return null;
          },
          async put() {},
          async keys() {
            return [];
          },
          async delete() {
            return true;
          },
        };
      },
      async keys() {
        return [currentVersion, 'vts-20260101-000000', 'vts-20250101-000000', 'foreign-cache'];
      },
      async delete(key) {
        deleted.push(key);
        return true;
      },
    },
    self: {
      location: { origin: 'https://vts.test' },
      clients: { async claim() {} },
      skipWaiting() {},
      addEventListener(type, handler) {
        listeners[type] = handler;
      },
    },
  });
  vm.runInContext(source, context);

  const isSafePublicRequest = vm.runInContext('isSafePublicRequest', context);
  const responseAllowsPublicCaching = vm.runInContext('responseAllowsPublicCaching', context);
  assert.equal(
    isSafePublicRequest(
      new Request('https://vts.test/assets/index-12345678.js', { credentials: 'omit' })
    ),
    true
  );
  assert.equal(
    isSafePublicRequest(
      new Request('https://vts.test/private', {
        credentials: 'omit',
        headers: { Authorization: 'Bearer test-only' },
      })
    ),
    false
  );
  assert.equal(
    isSafePublicRequest(new Request('https://vts.test/private', { credentials: 'include' })),
    false
  );
  assert.equal(
    isSafePublicRequest(new Request('https://cdn.example.test/public.js', { credentials: 'omit' })),
    false
  );
  assert.equal(
    responseAllowsPublicCaching(
      new Response('private', { headers: { 'Cache-Control': 'private, max-age=60' } })
    ),
    false
  );
  assert.equal(
    responseAllowsPublicCaching(
      new Response('private', { headers: { 'Cache-Control': 'no-store' } })
    ),
    false
  );
  assert.equal(
    responseAllowsPublicCaching(new Response('private', { headers: { 'Set-Cookie': 'sid=test' } })),
    false
  );

  listeners.activate({
    waitUntil(promise) {
      activationPromise = promise;
    },
  });
  await activationPromise;
  assert.deepEqual(deleted, ['vts-20250101-000000']);
  assert.ok(!deleted.includes('foreign-cache'));
});

test('deployment size checks cover the full artifact and source-only map files stay out', () => {
  const sizeCheck = readFileSync('scripts/check-size.mjs', 'utf8');
  const postBuild = readFileSync('scripts/post-build.mjs', 'utf8');
  const edenAssets = readFileSync('js/eden-map-assets.js', 'utf8');
  const heroesData = readFileSync('js/heroes-data.js', 'utf8');

  assert.match(sizeCheck, /const deployFiles = walkFiles\(deployDir\)/);
  assert.match(sizeCheck, /totalDeployBytes/);
  assert.match(sizeCheck, /totalMediaBytes/);
  assert.match(sizeCheck, /maxMediaFileBytes/);
  assert.match(sizeCheck, /deployFileCount/);
  assert.match(sizeCheck, /indexGzipBytes: 16 \* 1024/);
  assert.match(sizeCheck, /routeCssBytes/);
  assert.match(sizeCheck, /function resolveBuiltRouteCssAssets\(/);
  assert.match(sizeCheck, /function mediaMatchesWidth\(/);
  assert.doesNotMatch(sizeCheck, /\['source index\.html lines'/);
  assert.doesNotMatch(sizeCheck, /cssChunks/);
  assert.match(sizeCheck, /builtIndexPath/);
  assert.match(sizeCheck, /const entryJs = resolveBuiltIndexAssets\(\{/);
  assert.match(sizeCheck, /tagName: 'script'/);
  assert.match(sizeCheck, /const entryCss = resolveBuiltIndexAssets\(\{/);
  assert.match(sizeCheck, /tagName: 'link'/);
  assert.match(sizeCheck, /rel: 'stylesheet'/);
  assert.doesNotMatch(sizeCheck, /index-\[\^\\\/\]\+\\\.js/);
  assert.match(sizeCheck, /missingBuildOutputs/);
  assert.match(postBuild, /sourceOnlyDeployPaths/);
  assert.match(postBuild, /assets\/faction-division2\.png/);
  assert.match(postBuild, /assets\/eden-reference\/eden-map-reference\.png/);
  assert.match(postBuild, /images\/strife\/roc-strife-reference\.png/);
  assert.match(postBuild, /assets\/eden-reference\/sector-parchments/);
  for (const sourceOnlyPath of [
    'assets/admin-D1Gvfu0q.js',
    'assets/eden-reference/icons/cp1.png',
    'assets/eden-reference/icons/st3.png',
    'images/heroes/catchup/cyrus.png',
    'images/heroes/catchup/reinforced-ragnar-placeholder.svg',
    'images/heroes/catchup/warhammer.png',
    'images/logo.webp',
  ]) {
    assert.ok(postBuild.includes(`'${sourceOnlyPath}'`), `${sourceOnlyPath} must stay source-only`);
  }
  assert.doesNotMatch(postBuild, /const copyDirs = \[[^\]]*'css'/);
  assert.doesNotMatch(postBuild, /const copyDirs = \[[^\]]*'workers'/);
  assert.doesNotMatch(edenAssets, /rawFallbackUrl: 'assets\/faction-division2\.png'/);
  assert.doesNotMatch(edenAssets, /legacyFallbackUrl: `\$\{ASSET_ROOT\}eden-map-reference\.png`/);
  assert.match(edenAssets, /user-gate-marker\.webp/);
  assert.match(edenAssets, /user-town-marker\.webp/);
  assert.match(edenAssets, /user-capital-marker\.webp/);
  for (const hero of ['cyrus', 'warhammer', 'warden']) {
    assert.match(heroesData, new RegExp(`images/heroes/catchup/${hero}\\.avif`));
  }
});

test('qwen worker rejects requests without an Origin header', () => {
  const source = readFileSync('workers/qwen-cors-proxy.js', 'utf8');
  assert.match(source, /if\s*\(!origin\)\s*return false;/);
  assert.doesNotMatch(source, /if\s*\(!origin\)\s*return true;/);
});

test('eden dataset payload is copied into the production build', () => {
  const source = readFileSync('scripts/post-build.mjs', 'utf8');
  assert.match(source, /js\/eden-datasets\.payload\.json/);
});

test('retired Comments data remains protected and is not publicly readable', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.doesNotMatch(rules, /'email'/);
  assert.match(rules, /function canReadComment\(\)/);
  assert.match(rules, /resource\.data\.approved == true/);
  assert.match(rules, /resource\.data\.public == true/);
  assert.match(rules, /resource\.data\.authorId == request\.auth\.uid/);
  assert.match(rules, /allow read: if canReadComment\(\);/);
  assert.match(rules, /approved == false/);
  assert.match(rules, /request\.resource\.data\.parentId == null/);
  assert.match(rules, /request\.resource\.data\.parentId is string/);
  assert.match(
    rules,
    /request\.resource\.data\.parentId\.matches\('\^\[A-Za-z0-9_-\]\{1,150\}\$'\)/
  );
  assert.equal(existsSync('js/comments.js'), false);
});

test('client error reports are bounded and not publicly readable', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const reporting = readFileSync('js/app-error-reporting.js', 'utf8');

  assert.match(rules, /function validClientError\(\)/);
  assert.match(rules, /match \/errors\/\{errorId\}/);
  assert.match(rules, /allow create: if signedIn\(\) && validClientError\(\);/);
  assert.match(rules, /match \/errors\/\{errorId\}\s*\{\s*allow read, delete: if isAdmin\(\);/);
  assert.match(rules, /request\.resource\.data\.authorId == request\.auth\.uid/);
  assert.match(reporting, /authorId:\s*user\.uid/);
  assert.match(reporting, /remoteReportingDisabled = true/);
});
