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
          if (id.includes('eden-map') || id.includes('eden-datasets') || id.includes('eden-')) return 'eden';
          if (id.includes('ocr-dashboard') || id.includes('ocr-')) return 'admin';
          if (id.includes('translations')) return 'i18n';
          if (id.includes('tech-db')) return 'tech-data';
        },
      },
    },
  },
});
