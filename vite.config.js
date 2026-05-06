import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { vitePluginShopifyCatalog } from './vite-plugin-shopify-catalog.mjs';

export default defineConfig(({ mode }) => ({
  root: '.',
  publicDir: 'public',
  /** Admin catalog proxy only exists when `vite` dev server runs — not on Netlify static deploys. */
  plugins: mode === 'development' ? [vitePluginShopifyCatalog()] : [],
  /** Allow tunnel hosts (ngrok, etc.) — subdomain changes when tunnel restarts */
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}));
