import { defineConfig } from 'vite';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3001,
    open: true
  },
  plugins: [],

  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
});

