import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployDir = path.join(rootDir, 'dist');
const distDir = path.join(deployDir, 'assets');
const indexPath = path.join(rootDir, 'index.html');
const builtIndexPath = path.join(deployDir, 'index.html');
const lockfilePath = path.join(rootDir, 'package-lock.json');

// Every number below is produced by the bundler and the CSS minifier, so a
// working tree whose node_modules has drifted off package-lock.json measures a
// build that will never ship. The failure mode is loud and misleading: running
// this tree's rollup-era vite.config.js under an installed Vite 8 left shared
// modules inside the eden-map chunk, so index.html statically imported it and
// every one of the sixteen route CSS budgets blew at once — indistinguishable
// from a real regression until you check `vite -v` against the lockfile. Fail
// with the fix instead. This compares versions rather than pinning any of them,
// so it stays correct across a deliberate bundler upgrade.
const TOOLCHAIN_PACKAGES = ['vite', 'postcss', 'cssnano'];

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function collectToolchainVersions() {
  const lockfile = readJsonIfPresent(lockfilePath);
  const lockPackages = lockfile?.packages || {};
  return TOOLCHAIN_PACKAGES.map((name) => {
    const installed = readJsonIfPresent(path.join(rootDir, 'node_modules', name, 'package.json'));
    return {
      name,
      expected: lockPackages[`node_modules/${name}`]?.version || null,
      installed: installed?.version || null,
    };
  });
}

const toolchainVersions = collectToolchainVersions();
const toolchainMismatches = toolchainVersions.filter(
  ({ expected, installed }) => expected && installed && expected !== installed
);

const LIMITS = {
  // v14 adds the command shell, accessible More navigation, richer metadata,
  // and the Arcade entry. Raw lines are formatter-dependent, so guard the
  // source by bytes and transfer-relevant gzip size instead.
  // The translated public Eden X1 navigation entry adds 0.9 KiB to the
  // checked-in shell. Keep less than 0.5 KiB of raw-source headroom.
  indexBytes: 83 * 1024,
  indexGzipBytes: 16 * 1024,
  entryJsBytes: 300 * 1024,
  // The shared v14 stylesheet measures 390.3 KiB. The previous 300 KiB check
  // matched only index-*.css and never measured the actual shared file.
  // Shared light-theme surfaces and the explicit Generator selection state
  // measure 403.5 KiB after the non-modal Velo drawer fix; retain less than
  // 1.5 KiB of headroom.
  // The audited 14.2.8 shared mobile controls and Specialization palette
  // measure 405.6 KiB; retain less than 1.5 KiB of headroom.
  // The 14.2.18 semantic Specialization controls measure 407.2 KiB.
  // The 14.3.6 thin-tab Specialization planner card measures 408.1 KiB.
  // The 14.3.9 hero-plan bar in the Specialization tab lifts the shared entry
  // stylesheet to 411.3 KiB after minification; retain less than 1 KiB.
  // The 14.3.9 Specialization node glyphs, upgrade pips, and shaped-ring styles
  // re-audit to 416.9 KiB; retain roughly 1 KiB of headroom.
  // The 14.3.9 Heroes & Combos and Research & Towers hubs, the two-path tower
  // planner, and the account chip shipped on every page re-audit to 427.5 KiB;
  // retain roughly 1.5 KiB of headroom.
  entryCssBytes: 429 * 1024,
  // Specialization Towers, Alliance View, Skin Atlas, and All-Star BoH stay
  // route-isolated behind dynamic imports. The combined graph now includes the
  // canonical tower research corpus, Skin Atlas data, secure BoH client,
  // six-team planner, persistence model, and complete player/Admin locale
  // packs. Velo b0.2, the localized Specialization node inspector, optional
  // All-Star troop OCR review, and the complete 718-node public planner corpus
  // measure 8117.7 KiB after the All-Star participation intake and shared
  // applicant locale additions. The audited Eden reward-family allocation and
  // 14.1.17 release digest measured 8145.8 KiB. The localized admin troop
  // estimate labels and the localized shared-admin protection bring the
  // audited 14.2.0 graph to 8161.7 KiB; retain roughly 14 KiB of aggregate
  // headroom while route and entry budgets remain unchanged. The combined
  // 14.2.3 All-Star scoring and admin-operations release measures 8195.1 KiB;
  // retain roughly 17 KiB while the isolated route caps remain unchanged.
  // The audited 14.2.4 correction editor, score diagnostics, roster CSV, and
  // three-mode team builder measure 8248.9 KiB; retain roughly 17 KiB while
  // every entry and isolated route budget remains unchanged.
  // The 14.2.6 Epic planning controls, persisted overrides, keep-together
  // evaluation, and active CSV export measure 8269.7 KiB; keep roughly 18 KiB
  // while route, CSS, media, and entry budgets remain unchanged.
  // The complete audited 14.2.9 artifact with registration closed, responsive
  // team board, and refined admin controls measures 8289.3 KiB; retain less
  // than 1 KiB of headroom while route, CSS, media, and entry budgets stay fixed.
  // Localized closed-registration gate copy measures 8293.4 KiB; retain less
  // than 2 KiB of aggregate headroom while the route-specific caps stay fixed.
  // The 14.2.10 route-isolated All-Star battlefield plan and independent event
  // schedule measure 8333.8 KiB; retain roughly 16 KiB of aggregate headroom.
  // The audited 14.2.12 graph measures 8940.1 KiB after adding Italian and
  // Korean locale chunks, the profile route, and the battle runtime/catalog.
  // Retain roughly 1% aggregate headroom while entry and route caps stay fixed.
  // The audited 14.2.14 graph measures 9199.3 KiB after adding canonical battle
  // inputs, mapper draft import, and localized account onboarding. Retain roughly
  // 1% aggregate headroom while entry and route caps stay fixed.
  // The v14.2.16 mapper-first Admin and five-phase plan plus independent
  // per-side Battle profiles measure 9300.9 KiB. Retain about 9 KiB while
  // entry and route caps remain unchanged.
  // The 14.2.18 guided builder, event progress, and provider-first account
  // flow measure 9356.6 KiB; retain roughly 13 KiB of aggregate headroom.
  // The 14.3.2 Velo b0.4 model-upgrade release adds live Arcade/BoH/VtsScore
  // tool adapters, retry fallback, table-aware rendering, and the fresh ROC
  // combo imports, measuring 9431.6 KiB after production minification; retain
  // roughly 8 KiB while entry and route caps remain unchanged.
  // The 14.3.9 skill-semantics hero auto-path engine, Eden Hub controller, and
  // Royal Bounty guide measure 9490.3 KiB after production minification;
  // retain roughly 5 KiB while entry and route caps remain unchanged.
  // The 14.3.9 Specialization node glyphs, upgrade pips, and shaped-ring styles
  // re-audit to 9506.1 KiB; retain roughly 5 KiB of headroom.
  // The 14.3.9 Heroes & Combos and Research & Towers hubs, the two-path tower
  // planner, and the account chip shipped on every page re-audit to 9617.3 KiB;
  // retain roughly 7 KiB while entry and route caps remain unchanged. The
  // remaining headroom covers the deterministic Eden Hub activation bridge.
  // Dropping the account chip from the two strict-CSP standalone routes
  // re-splits their shared chunks; the CI build (which injects admin auth config
  // before building, so it measures larger than a bare local build) audits to
  // 9630.2 KiB. Retain roughly 7 KiB.
  // The 15.0.0 release adds the Eden X2 route and workspace contract, the
  // Throne Buffs model and PNG canvas export, Banners catalog and planner model,
  // the Skins gallery and its lazy detail styles, Vialfiend monster data, and
  // Loyalty/Materials polish. Measured 9699.7 KiB of built JS; retain
  // roughly 10 KiB.
  // The superadmin roles system (callable bridge, controller, admin wiring) and
  // the DeepSeek provider adapter measure 9738.0 KiB locally. CI measures
  // larger because it injects admin auth config before building, so retain
  // roughly 20 KiB rather than the usual single-digit margin.
  // Artifact One adds a lazy 17.7 KiB controller, 15.3 KiB canonical dataset,
  // and an 8.4 KiB VII-IX evidence chunk. The audited graph is 9796.0 KiB;
  // retain 14 KiB while entry and route caps remain unchanged.
  // Hero-targeted Artifact scoring reuses the lazy Tower skill-semantics module;
  // the combined graph audits to 9828 KiB locally, with CI injection headroom.
  // Full 13-locale DrThunder playbook translation adds ~125 KiB across the
  // twelve lazy language chunks; the audited graph is now 9953.6 KiB.
  // Translating the Royal Bounty guide adds eleven lazy locale chunks
  // (~107 KiB total, none on the initial path); audited at 10076.5 KiB.
  totalJsBytes: 10084 * 1024,
  // Specialization Towers, Skin Atlas, and the player/Admin All-Star surfaces
  // ship as lazy CSS chunks without changing the primary route's initial CSS
  // graph. The touch-safe Specialization inspector, mobile command view, and
  // Hall of Honor and the mobile All-Star intake lift it to 1303.7 KiB after
  // production minification. The All-Star OCR progress UI measures 1312.1 KiB;
  // retain about 16 KiB of aggregate headroom while route-specific caps remain.
  // The audited 14.2.8 mobile shell, Eden archive, and modal layout measure
  // 1340.4 KiB; retain less than 3 KiB of aggregate headroom.
  // The 14.2.10 touch-safe All-Star map and schedule controls measure 1347.1 KiB;
  // retain less than 5 KiB while every initial-route CSS cap stays unchanged.
  // Profile-route styling brings the audited aggregate to 1364.7 KiB after
  // shell-only account-link rules are kept in app.css. The combined 14.2.15
  // All-Star command view and Battle profile checklist measure 1379.7 KiB;
  // retain less than 1.5 KiB of aggregate headroom.
  // The v14.2.16 mapper-first Admin and deferred embedded Battle Tower editor
  // measure about 1397.0 KiB. Retain about 8 KiB while initial-route caps stay
  // fixed.
  // The 14.2.18 guided admin, timeline, account, and semantic control styles
  // measure 1419.6 KiB; retain roughly 10 KiB of aggregate headroom.
  // The v14.3 VtsScore standings, deadline, progress bar, and mobile styles
  // measure 1440.4 KiB; bump by 1 KiB to restore headroom.
  // The route-isolated BoH mapper stylesheet adds 90 KiB, bringing the audited
  // aggregate to 1530.6 KiB. It loads only on the mapper pages, so every
  // initial-route CSS cap below stays unchanged.
  // The 14.3.2 Velo copy-answer and table-aware reply styling brings the
  // audited aggregate to 1532.4 KiB; retain roughly 3 KiB of headroom.
  // The 14.3.9 Royal Bounty codex styles and the hero-plan bar bring the
  // audited aggregate to 1553.5 KiB; retain roughly 4.5 KiB of headroom.
  // The 14.3.9 Specialization node glyphs, upgrade pips, and shaped-ring styles
  // re-audit to 1559.1 KiB; retain roughly 4 KiB of headroom.
  // The 14.3.9 Heroes & Combos and Research & Towers hubs, the two-path tower
  // planner, and the account chip shipped on every page re-audit to 1605.4 KiB;
  // retain roughly 5 KiB of headroom.
  // The route-isolated Redemption Grail board plus the verified tower-source
  // presentation measure 1616.9 KiB total; retain roughly 8 KiB.
  // The two-flow DrThunder guide and its responsive topic/table layouts audit
  // to 1629.9 KiB; retain roughly 5 KiB without changing entry CSS limits.
  totalCssBytes: 1635 * 1024,
  // The 16.0.0 token-authority commit retires 39 per-rule light overrides and
  // consolidates the dashboard/Eden token blocks; total CSS measures 1429.6
  // KiB locally. Admin and Eden routes each shed roughly 0.3-0.5 kB while the
  // route ceilings stay unchanged (D1: no re-baseline).
  // The complete Pages artifact matters, not only Vite's top-level chunks.
  // Source-only Eden PNGs are intentionally excluded by post-build; these caps
  // prevent them (or similarly large duplicates) from returning unseen. The
  // combined 14.1.3 artifact measures 26,012.1 KiB after adding four optimized
  // All-Star reference images; retain less than 138 KiB of headroom.
  // The complete public Specialization corpus and shared 33-emblem sprite leave
  // single-digit KiB headroom. Allow deterministic CI build metadata to vary
  // without weakening the route, JS, CSS, media, or file-count budgets below.
  // The 14.1.11 applicant flow measures 26,172.1 KiB with shared locale chunks;
  // retain less than 8 KiB while keeping route and media caps unchanged.
  // The downloadable Top 20 and 21-110 reward cards add one focused Eden bundle feature.
  // The combined 14.2.3 All-Star scoring and admin-operations release measures
  // 26,264.8 KiB and retains roughly 16 KiB of complete-artifact headroom while
  // the tighter CSS, route, media, and file-count budgets remain unchanged.
  // The complete audited 14.2.4 artifact measures 26,327.7 KiB; retain roughly
  // 17 KiB while the tighter route, CSS, media, and file-count caps stay fixed.
  // The formatted multi-account signup note and Locale CSV column added ~0.2
  // KiB of deployed output. Bump by 1 KiB to restore headroom.
  // The 14.2.6 Epic planning controls measure 26,352.9 KiB; retain roughly
  // 17 KiB while the route, media, CSS, and file-count caps stay fixed.
  // The complete audited 14.2.8 artifact measures 26,388.3 KiB; retain less
  // than 3 KiB while the tighter route, media, and file-count caps stay fixed.
  // The complete audited 14.2.9 artifact with registration closed and responsive
  // team board measures 26,405.5 KiB after production minification; retain less
  // than 1.5 KiB of headroom.
  // Localized closed-registration gate copy measures 26,409.6 KiB after a
  // fresh production build; retain less than 2.5 KiB of artifact headroom.
  // The 14.2.10 artifact measures 26,685.1 KiB with one 240.1 KiB lossless
  // battlefield WebP; retain roughly 19 KiB while media and route caps stay fixed.
  // Italian/Korean locales, the profile route, battle runtime/catalog, and
  // their new emitted files measure 27,327.1 KiB; retain roughly 1% headroom.
  // The combined v14.2.15 Account/Profile, All-Star mapper, and Battle profile
  // checklist artifact measures 27,657.1 KiB after production minification;
  // retain less than 8 KiB while route and media caps remain focused.
  // The complete v14.2.16 mapper-first five-phase plan and independent Battle
  // profile editor artifact measures about 27,739.0 KiB with deferred Tower
  // CSS. Retain about 11 KiB while route, entry, media, and file-count caps stay
  // unchanged.
  // The complete 14.2.18 artifact measures 27,824.1 KiB; retain roughly
  // 16 KiB while route, media, and file-count caps remain unchanged.
  // The 14.3.1 VtsScore error-diagnostics artifact measures 27,904.0 KiB;
  // retain roughly 16 KiB while route, media, and file-count caps stay fixed.
  // The BoH mapper route adds the member-gated planner, two map plates, and six
  // team crests, bringing the artifact to 30,020.7 KiB. The crests were shipped
  // at 512x512 (one at 1254x1254) but render at 22-52 px, so they were resized
  // to 160 px and every plate re-encoded losslessly: 5516 KiB of source media
  // became 1466 KiB. Retain roughly 19 KiB of headroom.
  // The 14.3.2 Velo b0.4 and combo-expansion artifact measures 30,049.9 KiB
  // after production minification; retain roughly 10 KiB of headroom.
  // The 14.3.9 auto-path, Eden Hub, and Royal Bounty artifact measures
  // 30,133.8 KiB after production minification; retain roughly 6 KiB.
  // The 14.3.9 Specialization node glyphs, upgrade pips, and shaped-ring styles
  // re-audit to 30,155.1 KiB; retain roughly 7 KiB of headroom.
  // The four Royal Bounty guide figures cropped from the community PDFs
  // (assets/bounty/*.webp, 196 KiB total) bring the artifact to 30,476.1 KiB;
  // retain roughly 14 KiB of headroom.
  // The 15.0.0 release adds the Eden X2 route and workspace contract, the
  // Throne Buffs model, the Skins gallery and its lazy detail styles, and the
  // Loyalty/Materials polish. The artifact measures 30629.5 KiB;
  // retain roughly 70 KiB.
  // The nine Throne title icons (images/throne/*.webp, 62.8 KiB total) bring
  // the artifact to 30692.3 KiB; retain roughly 68 KiB.
  // The Aiding Skill capture lifts the artifact to 30788.1 KiB.
  // Artifact One and the VII-IX evidence chunks bring the optimized Pages
  // artifact to 30886.7 KiB; retain roughly 23 KiB.
  // The exact Redemption Grail game-board capture is a single 54.5 KiB lazy
  // WebP after removing the duplicate static copy. The artifact now measures
  // 30941.0 KiB; retain roughly 14 KiB.
  // The 15.0.8 Eden X2 Aiding Skills reference adds one optimized 55 KiB WebP;
  // retain about 19 KiB of artifact headroom without changing JS or CSS caps.
  // The expanded DrThunder playbook adds 13 contextual optimized visuals and
  // two lazy route chunks; the complete audited artifact is 31766.7 KiB.
  // Localized playbook catalog entries lift the audited artifact to
  // 31897.5 KiB; keep ~23 KiB of headroom without changing per-route caps.
  // The 15.0.12 playbook Day-1 rework and six in-game specialization captures
  // (69 KiB of optimized WebP media) audit to 31968.3 KiB; retain roughly
  // 8 KiB of headroom without changing per-route caps.
  // The #154-#168 audit fixes add light-theme overrides, tap-target floors and
  // localized load-failure copy (CSS and locale text only, no new media); the
  // artifact audits to 31976.6 KiB. Retain roughly 7 KiB of headroom.
  // Translating the Royal Bounty guide adds eleven lazy locale chunks; the
  // artifact audits to 32093.1 KiB. Retain roughly 7 KiB of headroom.
  totalDeployBytes: 32100 * 1024,
  // Raised from 16 MiB for the two mapper map plates, which keep their pixel
  // dimensions because stage1-labeled.png carries fine label text that
  // quantisation would smudge. Audited at 17,566.1 KiB.
  // The Royal Bounty figures add 196 KiB of media; audited at 17,760.4 KiB.
  // The nine Throne title icons add 62.8 KiB of media; audited at
  // 17823.2 KiB. Retain roughly 17 KiB of headroom.
  // The Royal Bounty guide gains one in-game capture of the Aiding Skill slot
  // (36.9 KiB JPEG). Media had 12 KiB of headroom, so raise it rather than
  // ship the guide without the illustration its steps describe.
  // The optimized Grail board raises audited media to 17932.4 KiB; retain
  // roughly 12 KiB while keeping the 4 MiB single-file guard unchanged.
  // The replacement Day 0 routes and poison-legion capture audit to
  // 18692.3 KiB of deployed media after removing redundant screenshots.
  // The six in-game specialization captures (69 KiB) audit to 18763.8 KiB;
  // retain roughly 6 KiB of headroom.
  // The eleven X10/X12 hero portraits add 124 KiB of AVIF and audit to
  // 18828.2 KiB. Their 1.3 MiB of PNG sources stay source-only, so only the
  // served format counts here. Raised rather than ship the newest roster on
  // placeholder art; retain roughly 22 KiB.
  totalMediaBytes: 18850 * 1024,
  maxMediaFileBytes: 4 * 1024 * 1024,
  // Specialization, All-Star, and the Velo b0.2 changelog digest add route,
  // feature, locale, and reference-image assets. The audited artifact has 581
  // files. Shared player/admin applicant copy brings the audited artifact to
  // 585 files; retain a one-file guard.
  // The audited locale/profile/battle artifact emits 601 files. Keep three
  // files of headroom so unexpected chunk proliferation remains visible.
  // The BoH mapper route adds two entry pages, its stylesheet and core chunk,
  // and ten assets, emitting 625 files. Keep three files of headroom.
  // The 14.3.9 bounty guide fragment and its route chunks emit 631 files;
  // keep two files of headroom so unexpected chunk proliferation stays visible.
  // The four Royal Bounty figures emit 636 files; keep the guard tight so
  // unexpected chunk proliferation still shows up.
  // Dropping the account chip from the two strict-CSP standalone routes
  // re-splits their shared chunks, emitting 639 files; keep two of headroom.
  // The 15.0.0 release adds the Eden X2 route and workspace contract, the
  // Throne Buffs model, the Skins gallery and its lazy detail styles, and the
  // Loyalty/Materials polish. The eden-x2 route and its chunks emit 644
  // files; keep four of headroom.
  // The nine Throne title icons emit nine more files (653 total); keep four
  // of headroom.
  // Artifact and its evidence/localization split emit 663 files; keep two of
  // headroom so unplanned chunk proliferation remains visible.
  // The Royal Bounty guide's eleven locale chunks emit 701 files; keep three of
  // headroom on the same principle.
  deployFileCount: 704,
  routeCssBytes: {
    'index.html': { desktop: 530 * 1024, mobile: 625 * 1024 },
    // The audited v14.2.15 profile route links 24,013 bytes of responsive
    // Account/Profile CSS; keep a focused 25 KiB ceiling.
    'profile.html': { desktop: 25 * 1024, mobile: 25 * 1024 },
    // Alliance View reuses the Admin/Eden design system. The shared Strife
    // Hall of Honor and the phone node inspector expand shared app.css. Admin
    // measures 630.8/723.7 KiB and Eden 747.3/840.1 KiB after minification.
    // The audited 14.2.8 shared controls measure 637.2/730.0 KiB on Admin,
    // while the archive and modal layout measure 760.4/853.2 KiB on Eden.
    // The 14.3.6 thin Specialization tab planner card adds 639.7/732.5 KiB
    // on Admin and 439.8/532.5 KiB on Arcade after minification.
    // The 14.3.9 hero-plan bar and Eden Hub additions measure 643.0/735.7 KiB
    // on Admin, 766.2/858.9 KiB on Eden, and 443.0/535.7 KiB on Arcade.
    // Re-audited for the 14.3.9 Specialization node styling: 648.6/741.3 KiB on
    // Admin, 771.8/864.5 KiB on Eden, and 448.6/541.3 KiB on Arcade.
    // The 14.3.9 hubs and the every-page account chip re-audit to 661.1/782.7
    // KiB on Admin, 784.8/906.5 KiB on Eden, and 460.7/582.3 KiB on Arcade.
    // The season-scope strip and grouped Admin rail measure 663.9/759.7 KiB.
    // The compact inline account slot and corrected desktop action grid measure
    // 666.5 KiB; retain about 1.5 KiB without changing the mobile ceiling.
    // Conduct bulk entry, admin suggestions, BoH match results, and the restored
    // standalone VtsScore leader board add route-local Admin UI. The clean CI
    // build measures 677.7 KiB desktop after the VtsScore panel; retain about
    // 2 KiB of headroom without changing the unaffected mobile ceiling.
    // 16.0.0 token authority: 679.1/775.2 KiB after retiring covered light
    // overrides (was 679.4/775.5); ceilings unchanged per D1.
    'admin.html': { desktop: 680 * 1024, mobile: 785 * 1024 },
    // The 15.0.4 mobile dock row layout adds ~0.4 KiB to the Eden route.
    // Eden imports the same dashboard stylesheet for weighted-contribution
    // detail, so the Admin-only panel styles are present in its CSS graph even
    // though the public route never renders those panels. CI measures roughly
    // 800.2 KiB for X1 and 799.0 KiB for X2 after minification.
    // 16.0.0 token authority: 801.5/897.6 KiB after the frost-token
    // consolidation (was 802.0/898.1); ceilings unchanged per D1.
    'eden-x1.html': { desktop: 803 * 1024, mobile: 909 * 1024 },
    // Eden X2 is the same page shell and the same module graph as Eden X1, so
    // it inherits the audited Eden budget rather than getting its own.
    'eden-x2.html': { desktop: 802 * 1024, mobile: 909 * 1024 },
    // Arcade measures 437.3/530.0 KiB with the audited 14.2.8 shared graph;
    // retain less than 2 KiB of route-specific headroom.
    'arcade.html': { desktop: 463 * 1024, mobile: 585 * 1024 },
    // The Battle saved-profile checklist lifts the audited standalone route to
    // 54.9 KiB on desktop and mobile; retain roughly 1 KiB of headroom.
    // The account chip stylesheet lifts the standalone Battle route to 57.5 KiB.
    'battle-simulator.html': { desktop: 59 * 1024, mobile: 59 * 1024 },
    // Specialization Towers is route-isolated and loads only shared tokens plus
    // its responsive progression workspace. Keep a focused per-route ceiling;
    // aggregate artifact budgets are recalibrated from the production build.
    'specialization-towers.html': { desktop: 80 * 1024, mobile: 80 * 1024 },
  },
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(absolutePath, out);
    else if (entry.isFile()) out.push(absolutePath);
  }
  return out;
}

const indexSource = fs.readFileSync(indexPath, 'utf8');
// Git stores text with LF, while Windows checkouts may use CRLF. Measure the
// checked-in/deployed representation so the same commit has the same budget
// result on developer machines and in CI.
const normalizedIndexSource = indexSource.replace(/\r\n/gu, '\n');
const builtIndexSource = fs.existsSync(builtIndexPath)
  ? fs.readFileSync(builtIndexPath, 'utf8')
  : '';
const forbiddenInitialFeaturePattern =
  /(?:app-builder|ocr-dashboard|eden-map|hero-atlas|arcade|ai-drawer|ai-assistant|app-export|(?:^|[-/])export(?:[-.]|$)|research|materials)/iu;
const initialLinkedFeatureAssets = [...builtIndexSource.matchAll(/<link\b[^>]*>/giu)]
  .map((match) => readTagAttributes(match[0]))
  .filter((attributes) => {
    const rel = (attributes.get('rel') || '').toLowerCase();
    return /(?:modulepreload|preload|stylesheet)/u.test(rel);
  })
  .map((attributes) => attributes.get('href') || '')
  .filter((href) => forbiddenInitialFeaturePattern.test(href));
const indexBytes = Buffer.byteLength(normalizedIndexSource);
const indexGzipBytes = gzipSync(normalizedIndexSource).length;
const indexLines = normalizedIndexSource.split('\n').length;
const assetFiles = fs.existsSync(distDir)
  ? fs
      .readdirSync(distDir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(distDir, entry.name))
  : [];
const jsFiles = assetFiles.filter((file) => file.endsWith('.js'));
const cssFiles = assetFiles.filter((file) => file.endsWith('.css'));
const mediaFiles = assetFiles.filter(
  (file) => !file.endsWith('.js') && !file.endsWith('.css') && !file.endsWith('.map')
);
const deployFiles = walkFiles(deployDir);
const deployMediaFiles = deployFiles.filter(
  (file) => !/\.(?:css|html?|js|json|map|md|txt|xml)$/i.test(file)
);
const totalDeployBytes = deployFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const deployedMediaBytes = deployMediaFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largestMediaFile = deployMediaFiles
  .slice()
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const totalJsBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalCssBytes = cssFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const totalMediaBytes = mediaFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
function readTagAttributes(tagSource) {
  return new Map(
    [...tagSource.matchAll(/\b([^\s=/>]+)\s*=\s*(["'])(.*?)\2/gis)].map((match) => [
      match[1].toLowerCase(),
      match[3],
    ])
  );
}

function resolveBuiltIndexAssets({ tagName, attribute, extension, rel = null }) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return [...builtIndexSource.matchAll(tagPattern)]
    .map((match) => readTagAttributes(match[0]))
    .filter((attributes) => {
      if (!rel) return true;
      return (attributes.get('rel') || '')
        .split(/\s+/)
        .some((value) => value.toLowerCase() === rel);
    })
    .map((attributes) => attributes.get(attribute) || '')
    .filter((assetPath) => new RegExp(`\\.${extension}(?:[?#]|$)`, 'i').test(assetPath))
    .map((assetPath) => assetPath.split(/[?#]/, 1)[0].replace(/^\/+/, ''))
    .filter((assetPath) => assetPath.startsWith('assets/'))
    .map((assetPath) => path.join(deployDir, assetPath))
    .filter((assetPath) => fs.existsSync(assetPath))
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
}

function mediaMatchesWidth(media, viewportWidth) {
  const normalized = String(media || '')
    .trim()
    .toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'screen') return true;
  const maxWidth = normalized.match(/max-width\s*:\s*([\d.]+)px/u);
  if (maxWidth && viewportWidth > Number(maxWidth[1])) return false;
  const minWidth = normalized.match(/min-width\s*:\s*([\d.]+)px/u);
  if (minWidth && viewportWidth < Number(minWidth[1])) return false;
  return !/\bprint\b/u.test(normalized);
}

function resolveBuiltRouteCssAssets(htmlFile, viewportWidth) {
  const htmlPath = path.join(deployDir, htmlFile);
  if (!fs.existsSync(htmlPath)) return [];
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/<noscript\b[\s\S]*?<\/noscript>/giu, '');
  const assets = new Set();
  for (const match of html.matchAll(/<link\b[^>]*>/giu)) {
    const attributes = readTagAttributes(match[0]);
    const relValues = (attributes.get('rel') || '')
      .split(/\s+/u)
      .map((value) => value.toLowerCase());
    if (!relValues.includes('stylesheet')) continue;
    if (!mediaMatchesWidth(attributes.get('media'), viewportWidth)) continue;
    const assetPath = (attributes.get('href') || '').split(/[?#]/u, 1)[0].replace(/^\/+/, '');
    if (!assetPath.startsWith('assets/') || !assetPath.endsWith('.css')) continue;
    const absolutePath = path.join(deployDir, assetPath);
    if (fs.existsSync(absolutePath)) assets.add(absolutePath);
  }
  return [...assets];
}

const entryJs = resolveBuiltIndexAssets({
  tagName: 'script',
  attribute: 'src',
  extension: 'js',
})[0];
const entryCss = resolveBuiltIndexAssets({
  tagName: 'link',
  attribute: 'href',
  extension: 'css',
  rel: 'stylesheet',
})[0];
const missingBuildOutputs = [];
if (!builtIndexSource) missingBuildOutputs.push('dist/index.html');
if (!entryJs) missingBuildOutputs.push('entry JavaScript linked by dist/index.html');
if (!entryCss) missingBuildOutputs.push('entry CSS linked by dist/index.html');
if (initialLinkedFeatureAssets.length) {
  missingBuildOutputs.push(
    `dist/index.html unexpectedly preloads optional feature assets: ${initialLinkedFeatureAssets.join(', ')}`
  );
}

const routeCssMetrics = new Map();
for (const htmlFile of Object.keys(LIMITS.routeCssBytes)) {
  const htmlPath = path.join(deployDir, htmlFile);
  if (!fs.existsSync(htmlPath)) {
    missingBuildOutputs.push(`dist/${htmlFile}`);
    continue;
  }
  const desktopFiles = resolveBuiltRouteCssAssets(htmlFile, 1280);
  const mobileFiles = resolveBuiltRouteCssAssets(htmlFile, 390);
  if (!desktopFiles.length) missingBuildOutputs.push(`desktop CSS linked by dist/${htmlFile}`);
  if (!mobileFiles.length) missingBuildOutputs.push(`mobile CSS linked by dist/${htmlFile}`);
  routeCssMetrics.set(htmlFile, {
    desktop: desktopFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0),
    mobile: mobileFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0),
  });
}

const checks = [
  ['source index.html bytes', indexBytes, LIMITS.indexBytes],
  ['source index.html gzip bytes', indexGzipBytes, LIMITS.indexGzipBytes],
  ['largest built index JS', entryJs ? fs.statSync(entryJs).size : 0, LIMITS.entryJsBytes],
  ['largest built index CSS', entryCss ? fs.statSync(entryCss).size : 0, LIMITS.entryCssBytes],
  ['total built JS bytes', totalJsBytes, LIMITS.totalJsBytes],
  ['total built CSS bytes', totalCssBytes, LIMITS.totalCssBytes],
  ['total deployed bytes', totalDeployBytes, LIMITS.totalDeployBytes],
  ['total deployed media bytes', deployedMediaBytes, LIMITS.totalMediaBytes],
  [
    'largest deployed media file',
    largestMediaFile ? fs.statSync(largestMediaFile).size : 0,
    LIMITS.maxMediaFileBytes,
  ],
  ['deployed file count', deployFiles.length, LIMITS.deployFileCount],
];

for (const [htmlFile, limits] of Object.entries(LIMITS.routeCssBytes)) {
  const metrics = routeCssMetrics.get(htmlFile);
  if (!metrics) continue;
  checks.push([`${htmlFile} desktop initial CSS`, metrics.desktop, limits.desktop]);
  checks.push([`${htmlFile} mobile initial CSS`, metrics.mobile, limits.mobile]);
}

const failures = checks.filter(([, actual, limit]) => actual > limit);

console.log('Size check:');
console.log(
  `- toolchain: ${toolchainVersions
    .filter(({ installed }) => installed)
    .map(({ name, installed }) => `${name} ${installed}`)
    .join(', ')}`
);
console.log(
  `- index.html: ${formatBytes(indexBytes)} raw, ${formatBytes(indexGzipBytes)} gzip, ${indexLines} lines (informational)`
);
console.log(
  `- entry JS: ${entryJs ? `${path.basename(entryJs)} ${formatBytes(fs.statSync(entryJs).size)}` : 'not found'}`
);
console.log(
  `- entry CSS: ${entryCss ? `${path.basename(entryCss)} ${formatBytes(fs.statSync(entryCss).size)}` : 'not found'}`
);
console.log(`- total JS: ${formatBytes(totalJsBytes)}`);
console.log(`- total CSS: ${formatBytes(totalCssBytes)}`);
console.log(`- top-level media: ${formatBytes(totalMediaBytes)}`);
console.log(
  `- complete Pages artifact: ${formatBytes(totalDeployBytes)}, ${deployFiles.length} files`
);
console.log(`- deployed media: ${formatBytes(deployedMediaBytes)}`);
console.log(
  `- largest deployed media: ${largestMediaFile ? `${path.relative(deployDir, largestMediaFile)} ${formatBytes(fs.statSync(largestMediaFile).size)}` : 'not found'}`
);
for (const [htmlFile, metrics] of routeCssMetrics) {
  console.log(
    `- ${htmlFile} initial CSS: ${formatBytes(metrics.desktop)} desktop, ${formatBytes(metrics.mobile)} mobile`
  );
}

if (toolchainMismatches.length || missingBuildOutputs.length || failures.length) {
  console.error('Size check failed:');
  for (const { name, expected, installed } of toolchainMismatches) {
    console.error(
      `- installed ${name} ${installed} does not match package-lock.json's ${expected}; ` +
        'these budgets are calibrated on the locked toolchain, so run `npm ci` and rebuild'
    );
  }
  for (const output of missingBuildOutputs) {
    console.error(`- missing required build output: ${output}`);
  }
  for (const [label, actual, limit] of failures) {
    const isCount = label.includes('file count');
    const value = isCount ? actual : formatBytes(actual);
    const max = isCount ? limit : formatBytes(limit);
    console.error(`- ${label}: ${value} > ${max}`);
  }
  process.exit(1);
}

console.log('Size check passed.');
