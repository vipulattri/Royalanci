/**
 * Admin REST API — server-side only. Never import from browser / Vite client code.
 *
 * Prefer environment variables on the host (Render, etc.):
 *   SHOPIFY_SHOP_DOMAIN
 *   SHOPIFY_ADMIN_ACCESS_TOKEN
 *   SHOPIFY_ADMIN_API_VERSION (optional)
 *
 * Optional inline fallbacks below (leave empty and use env / project-root `.env`).
 */
export const SHOPIFY_SHOP_DOMAIN = '';
export const SHOPIFY_ADMIN_API_VERSION = '2026-04';

/** Admin API access token (shpat_…) — set via env or `.env`, do not commit real tokens. */
export const SHOPIFY_ADMIN_ACCESS_TOKEN = '';
