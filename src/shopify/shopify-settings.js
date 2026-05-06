/**
 * Site configuration (client bundle — never put Admin `shpat_` tokens here).
 *
 * Catalog mode `VITE_SHOPIFY_CATALOG_SOURCE`:
 * - `admin-proxy` (default) — Browser calls `/api/shopify/catalog/*`; your **Node** server
 *   (Render `npm start`, or `npm run dev` + Vite) uses Admin API with `SHOPIFY_ADMIN_ACCESS_TOKEN` in env.
 * - `storefront` — Browser calls Shopify Storefront GraphQL; requires `VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
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
  viteEnv('VITE_SHOPIFY_CATALOG_SOURCE') || 'admin-proxy';

export const SHOPIFY_STORE_DOMAIN =
  viteEnv('VITE_SHOPIFY_STORE_DOMAIN') || 'royalanci.myshopify.com';

/** Only for `storefront` catalog mode — Storefront API token, not Admin `shpat_`. */
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
