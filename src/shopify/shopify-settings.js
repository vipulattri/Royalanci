/**
 * Site configuration.
 *
 * Netlify / production: set `VITE_*` variables in Netlify → Site configuration → Environment variables,
 * then trigger a new deploy. Values are inlined at build time by Vite.
 *
 * Local: copy `.env.example` to `.env` (never commit `.env`).
 *
 * SHOPIFY_CATALOG_SOURCE (via `VITE_SHOPIFY_CATALOG_SOURCE`):
 * - `storefront` (default) — Storefront GraphQL in the browser. Requires `VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
 * - `admin-proxy` — Local only with `npm run dev`; Vite serves `/api/shopify/catalog/*`. Static hosts have no proxy.
 */
function viteEnv(key, fallback = '') {
  try {
    const v = import.meta.env?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function viteEnvBool(key, fallback = false) {
  const v = viteEnv(key);
  if (v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(v);
}

export const SHOPIFY_CATALOG_SOURCE =
  viteEnv('VITE_SHOPIFY_CATALOG_SOURCE') || 'storefront';

export const SHOPIFY_STORE_DOMAIN =
  viteEnv('VITE_SHOPIFY_STORE_DOMAIN') || 'royalanci.myshopify.com';

/** Used when catalog source is `storefront`. Never paste Admin `shpat_` here. */
export const SHOPIFY_STOREFRONT_ACCESS_TOKEN = viteEnv(
  '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'
);

export const SHOPIFY_STOREFRONT_API_VERSION =
  viteEnv('VITE_SHOPIFY_API_VERSION') || '2026-04';

/** Optional: custom storefront URL for product links / cart add. */
export const SHOPIFY_PUBLIC_STORE_URL = viteEnv('VITE_SHOPIFY_PUBLIC_STORE_URL');

/** Optional collection handles (slug from Shopify Admin → Collections). */
export const SHOPIFY_COLLECTION_MAGHREB = viteEnv(
  'VITE_SHOPIFY_COLLECTION_MAGHREB'
);
export const SHOPIFY_COLLECTION_OPULENCE = viteEnv(
  'VITE_SHOPIFY_COLLECTION_OPULENCE'
);

const pageSizeRaw = viteEnv('VITE_SHOPIFY_PRODUCTS_PAGE_SIZE');
export const SHOPIFY_PRODUCTS_PAGE_SIZE = pageSizeRaw
  ? parseInt(pageSizeRaw, 10) || 8
  : 8;

export const SHOPIFY_DEBUG_LOG = viteEnvBool('VITE_SHOPIFY_DEBUG', false);
