import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { vitePluginShopifyCatalog } from './vite-plugin-shopify-catalog.mjs';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [vitePluginShopifyCatalog()],
  /** Allow tunnel hosts (ngrok, etc.) — subdomain changes when tunnel restarts */
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
