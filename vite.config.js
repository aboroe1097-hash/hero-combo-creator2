import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
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
      },
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('node_modules/firebase') || normalizedId.includes('node_modules/@firebase')) return 'firebase';
          // Large data files: split into dedicated chunks so feature chunks stay lean
          if (normalizedId.includes('/js/tech-db.js')) return 'tech-db';
          if (normalizedId.includes('/js/heroes-info.js')) return 'heroes-info';
          if (normalizedId.includes('/js/eden-map')) return 'eden-map';
          if (normalizedId.includes('/js/ocr-')) return 'ocr-dashboard';
          if (normalizedId.includes('/js/app-research')) return 'research';
          if (normalizedId.includes('/js/app-hero-atlas')) return 'hero-atlas';
          if (normalizedId.includes('/js/app-export') || normalizedId.includes('html2canvas')) return 'export';
        },
      },
    },
  },
});
