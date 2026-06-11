import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2022',
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        manualChunks(id) {
          if (
            id.includes('eden-map')
            || id.includes('eden-datasets')
            || id.includes('eden-tooltips')
            || id.includes('eden-map-terrain')
            || id.includes('eden-map-assets')
            || id.includes('eden-map-features')
            || id.includes('eden-map-scout')
            || id.includes('eden-map-teams')
            || id.includes('eden-map-guide')
            || id.includes('eden-map-ui')
          ) {
            return 'eden';
          }
        },
      },
    },
  },
});