/**
 * Admin REST — same credentials you use in Postman:
 *   URL host: {SHOPIFY_SHOP_DOMAIN}
 *   Header:   X-Shopify-Access-Token: {SHOPIFY_ADMIN_ACCESS_TOKEN}
 *
 * Prefer env / `.env` for secrets. Optional inline fields below for local dev only — never commit real tokens.
 */
export const SHOPIFY_SHOP_DOMAIN = '';

export const SHOPIFY_ADMIN_API_VERSION = '2026-04';

/** Paste the same `shpat_` token as Postman's X-Shopify-Access-Token, or leave empty and use `.env`. */
export const SHOPIFY_ADMIN_ACCESS_TOKEN = '';
