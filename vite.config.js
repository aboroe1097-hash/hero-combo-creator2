import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: process.env.VITE_SOURCEMAP !== 'false',
    target: 'es2022',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          if (id.includes('eden-map') || id.includes('eden-datasets') || id.includes('eden-')) return 'eden';
          if (id.includes('ocr-dashboard') || id.includes('ocr-')) return 'admin';
          if (id.includes('app-hero-atlas') || id.includes('heroes-info') || id.includes('hero-bonuses') || id.includes('skins-db')) return 'hero-atlas';
          if (id.includes('app-research') || id.includes('tech-db') || id.includes('research-node-icons')) return 'research';
          if (id.includes('translations')) return 'i18n-core';
        },
      },
    },
  },
});
