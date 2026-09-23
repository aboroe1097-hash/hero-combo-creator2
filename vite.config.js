import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Vite 8 no longer injects __dirname into an ESM config; entry-contract tests
// match on resolve(__dirname, ...), so keep the name.
const __dirname = import.meta.dirname;
const aiLauncherCriticalCss = resolve(__dirname, 'public/ai-launcher-critical.css');

// Which named chunk a module belongs to, or null to let the bundler place it.
// Ported from the Rollup manualChunks function this replaced.
function chunkNameFor(id) {
  const normalizedId = id.replace(/\\/g, '/');
  const normalizedPath = normalizedId.split(/[?#]/u, 1)[0];
  if (
    normalizedId.includes('node_modules/firebase/analytics') ||
    normalizedId.includes('node_modules/@firebase/analytics') ||
    normalizedId.includes('node_modules/@firebase/installations')
  )
    return 'firebase-analytics';
  if (
    normalizedId.includes('node_modules/firebase/app-check') ||
    normalizedId.includes('node_modules/@firebase/app-check')
  )
    return 'firebase-app-check';
  if (
    normalizedId.includes('node_modules/firebase') ||
    normalizedId.includes('node_modules/@firebase')
  )
    return 'firebase';
  // VtsScore loads the access client behind its own server-verified
  // gate, so it stays a chunk of its own rather than being inlined.
  if (normalizedPath.endsWith('/js/all-star-boh-access.js')) {
    return 'all-star-boh-access';
  }
  // Large data files: split into dedicated chunks so feature chunks stay lean
  if (normalizedId.includes('/js/tech-db.js')) return 'tech-db';
  if (normalizedId.includes('/js/artifact-db.js')) return 'artifact-db';
  // ~10k lines of tower data, statically imported by the specialization
  // tab, the standalone planner and nine battle-simulator modules. With
  // no entry here it is inlined into every one of those chunks.
  if (normalizedId.includes('/js/specialization-towers-v2-data.js')) {
    return 'specialization-towers-data';
  }
  if (normalizedId.includes('/js/heroes-info.js')) return 'heroes-info';
  if (normalizedPath.endsWith('/js/ocr-dashboard.js')) return 'ocr-dashboard';
  // Admin-only dashboard rules. As part of admin.html's own bundle they
  // would load before the shared ocr-dashboard stylesheet they were split
  // from and lose every tie to it; a chunk of their own loads after it.
  if (normalizedPath.endsWith('/css/ocr-dashboard-admin.css')) {
    return 'ocr-dashboard-admin-styles';
  }
  // The English DM catalog is imported statically by en.js, so every page
  // needs it. Named after its folder it would read as the lazy Materials
  // feature, which the size check forbids index.html from preloading.
  if (normalizedPath.endsWith('/js/i18n/dm-materials/index.js')) return 'i18n-dm-catalog';
  // app-research, app-artifact, app-hero-atlas and app-export are dynamic
  // imports, so they already get chunks of their own. Naming them in a group
  // as Rollup's manualChunks did makes Rolldown leave a separate entry chunk
  // holding their private dependencies, and the two import each other: the
  // Hero Atlas then evaluated before its help-text tables existed.
  if (normalizedId.includes('html2canvas')) return 'export';
  return null;
}

function serveAiLauncherCriticalCss() {
  return {
    name: 'serve-ai-launcher-critical-css',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname;
        if (pathname !== '/ai-launcher-critical.css') return next();
        response.statusCode = 200;
        response.setHeader('Cache-Control', 'no-cache');
        response.setHeader('Content-Type', 'text/css; charset=utf-8');
        response.end(readFileSync(aiLauncherCriticalCss, 'utf8'));
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: false,
  plugins: [serveAiLauncherCriticalCss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    target: 'es2022',
    rolldownOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        profile: resolve(__dirname, 'profile.html'),
        maintenance: resolve(__dirname, 'maintenance.html'),
        admin: resolve(__dirname, 'admin.html'),
        vtsscore: resolve(__dirname, 'vtsscore.html'),
        'vtsscore/index': resolve(__dirname, 'vtsscore/index.html'),
        // Short share links: roc-vts.com/vote opens the Eden X2 ballot directly,
        // roc-vts.com/eden opens the current season view.
        'vote/index': resolve(__dirname, 'vote/index.html'),
        'eden/index': resolve(__dirname, 'eden/index.html'),
        'eden-x1': resolve(__dirname, 'eden-x1.html'),
        'eden-x2': resolve(__dirname, 'eden-x2.html'),
        arcade: resolve(__dirname, 'arcade.html'),
        'battle-simulator': resolve(__dirname, 'battle-simulator.html'),
        'specialization-towers': resolve(__dirname, 'specialization-towers.html'),
        downloads: resolve(__dirname, 'downloads.html'),
      },
      output: {
        codeSplitting: {
          // Rollup's onlyExplicitManualChunks. Rolldown otherwise pulls each
          // captured module's whole dependency subtree into the named chunk, which
          // leaves entry-shared modules inside lazy chunks like eden-map and makes
          // every page eagerly preload them and their CSS.
          includeDependenciesRecursively: false,
          groups: [{ name: chunkNameFor }],
        },
      },
    },
  },
});
