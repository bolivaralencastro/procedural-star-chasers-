import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base so the app works when hosted under a sub-path (GitHub Pages)
  base: './',
  plugins: [solid(), tailwindcss()],
  server: {
    port: 3000,
  },
});
