/**
 * Site configuration (no .env required).
 *
 * SHOPIFY_CATALOG_SOURCE:
 * - `admin-proxy` — Product grids use the Admin API via the Vite dev server (`npm run dev`).
 *   Same token as Postman: set `SHOPIFY_ADMIN_ACCESS_TOKEN` in `server/shopify-settings.mjs` or `.env`.
 * - `storefront` — Grids use Storefront GraphQL; set SHOPIFY_STOREFRONT_ACCESS_TOKEN (not shpat).
 */
export const SHOPIFY_CATALOG_SOURCE = 'admin-proxy';

export const SHOPIFY_STORE_DOMAIN = 'royalanci.myshopify.com';

/** Used only when SHOPIFY_CATALOG_SOURCE is `storefront`. Never paste Admin shpat here. */
export const SHOPIFY_STOREFRONT_ACCESS_TOKEN = '';

export const SHOPIFY_STOREFRONT_API_VERSION = '2026-04';

/** Optional: custom storefront URL for product links / cart add (defaults to https://{SHOPIFY_STORE_DOMAIN}). */
export const SHOPIFY_PUBLIC_STORE_URL = '';

/** Optional collection handles (slug from Shopify Admin → Collections). Leave empty to use catalog pagination. */
export const SHOPIFY_COLLECTION_MAGHREB = '';
export const SHOPIFY_COLLECTION_OPULENCE = '';

export const SHOPIFY_PRODUCTS_PAGE_SIZE = 8;

/** Log masked token + shop ping in dev tools when true (storefront mode). */
export const SHOPIFY_DEBUG_LOG = true;
