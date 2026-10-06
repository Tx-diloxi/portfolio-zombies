import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// BASE : chemin de publication (ex. "/portfolio/" pour GitHub Pages sur un dépôt "portfolio").
export default defineConfig({
  base: process.env.BASE ?? './',
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        lecture: resolve(import.meta.dirname, 'lecture.html'),
      },
    },
  },
});
