import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const aiLauncherCriticalCss = resolve(__dirname, 'public/ai-launcher-critical.css');

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
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        profile: resolve(__dirname, 'profile.html'),
        maintenance: resolve(__dirname, 'maintenance.html'),
        admin: resolve(__dirname, 'admin.html'),
        vtsscore: resolve(__dirname, 'vtsscore.html'),
        'vtsscore/index': resolve(__dirname, 'vtsscore/index.html'),
        'eden-x1': resolve(__dirname, 'eden-x1.html'),
        'eden-x2': resolve(__dirname, 'eden-x2.html'),
        arcade: resolve(__dirname, 'arcade.html'),
        'battle-simulator': resolve(__dirname, 'battle-simulator.html'),
        'specialization-towers': resolve(__dirname, 'specialization-towers.html'),
      },
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
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
          if (normalizedPath.endsWith('/js/eden-map.js')) return 'eden-map';
          if (normalizedPath.endsWith('/js/ocr-dashboard.js')) return 'ocr-dashboard';
          if (normalizedPath.endsWith('/js/app-research.js')) return 'research';
          if (normalizedPath.endsWith('/js/app-artifact.js')) return 'artifact';
          if (normalizedPath.endsWith('/js/app-hero-atlas.js')) return 'hero-atlas';
          if (normalizedPath.endsWith('/js/app-export.js') || normalizedId.includes('html2canvas'))
            return 'export';
        },
      },
    },
  },
});
