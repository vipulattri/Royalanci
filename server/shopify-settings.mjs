/**
 * Admin REST — same as Postman:
 *   GET https://{SHOPIFY_SHOP_DOMAIN}/admin/api/{SHOPIFY_ADMIN_API_VERSION}/products.json
 *   Header: X-Shopify-Access-Token: <shpat_…>
 *
 * Set SHOPIFY_ADMIN_ACCESS_TOKEN in `.env` (local) or Render **Environment** (production). Do not commit tokens.
 */
export const SHOPIFY_SHOP_DOMAIN = 'royalanci.myshopify.com';

export const SHOPIFY_ADMIN_API_VERSION = '2026-04';

/** Optional local override; use SHOPIFY_ADMIN_ACCESS_TOKEN in .env / Render in production. */
export const SHOPIFY_ADMIN_ACCESS_TOKEN = '';
