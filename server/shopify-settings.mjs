/**
 * Admin REST — same as Postman:
 *   GET https://{SHOPIFY_SHOP_DOMAIN}/admin/api/{SHOPIFY_ADMIN_API_VERSION}/products.json
 *   Header: X-Shopify-Access-Token: <shpat_…>
 *
 * Production (Render): set **SHOPIFY_ADMIN_ACCESS_TOKEN** in the dashboard (same value as Postman).
 * Leave inline empty — env vars take priority when RENDER=true or NODE_ENV=production.
 */
export const SHOPIFY_SHOP_DOMAIN = 'royalanci.myshopify.com';

export const SHOPIFY_ADMIN_API_VERSION = '2026-04';

/** Optional local-only override. Prefer `SHOPIFY_ADMIN_ACCESS_TOKEN` in `.env` / Render (never commit tokens). */
export const SHOPIFY_ADMIN_ACCESS_TOKEN = '';
