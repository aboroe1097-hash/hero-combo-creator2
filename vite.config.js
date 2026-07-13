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
        admin: resolve(__dirname, 'admin.html'),
        'eden-x1': resolve(__dirname, 'eden-x1.html'),
        arcade: resolve(__dirname, 'arcade.html'),
      },
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (
            normalizedId.includes('node_modules/firebase') ||
            normalizedId.includes('node_modules/@firebase')
          )
            return 'firebase';
          // Large data files: split into dedicated chunks so feature chunks stay lean
          if (normalizedId.includes('/js/tech-db.js')) return 'tech-db';
          if (normalizedId.includes('/js/heroes-info.js')) return 'heroes-info';
          if (normalizedId.includes('/js/eden-map')) return 'eden-map';
          if (normalizedId.includes('/js/ocr-')) return 'ocr-dashboard';
          if (normalizedId.includes('/js/app-research')) return 'research';
          if (normalizedId.includes('/js/app-hero-atlas')) return 'hero-atlas';
          if (normalizedId.includes('/js/app-export') || normalizedId.includes('html2canvas'))
            return 'export';
        },
      },
    },
  },
});
