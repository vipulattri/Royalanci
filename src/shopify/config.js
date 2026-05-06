/**
 * Shopify headless config (Storefront API).
 * Values come from ./shopify-settings.js (`VITE_*` env at build time + defaults).
 *
 * Admin API tokens (shpat_*) must never be imported in browser code.
 */
import * as W from './shopify-settings.js';

export const SHOPIFY_API_VERSION =
  (W.SHOPIFY_STOREFRONT_API_VERSION || '').trim() || '2024-10';

export function getStoreDomain() {
  const raw = (W.SHOPIFY_STORE_DOMAIN || '').trim();
  return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/** Strip whitespace and optional wrapping quotes. */
function normalizeEnvToken(raw) {
  let t = typeof raw === 'string' ? raw.trim() : '';
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

export function getStorefrontToken() {
  return normalizeEnvToken(W.SHOPIFY_STOREFRONT_ACCESS_TOKEN);
}

/** Admin tokens do not work on the Storefront GraphQL endpoint (401). */
export function tokenLooksLikeAdminApiKey(token) {
  return /^shpat_/i.test(token || '');
}

export function getGraphQLEndpoint() {
  const domain = getStoreDomain();
  if (!domain) return '';
  return `https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

export function getStorefrontBaseUrl() {
  const custom = (W.SHOPIFY_PUBLIC_STORE_URL || '').trim();
  if (custom) return custom.replace(/\/$/, '');
  const domain = getStoreDomain();
  return domain ? `https://${domain}` : '';
}

export function getCollectionHandlePrimary() {
  return (W.SHOPIFY_COLLECTION_MAGHREB || '').trim();
}

export function getCollectionHandleSecondary() {
  return (W.SHOPIFY_COLLECTION_OPULENCE || '').trim();
}

export function getProductsPageSize() {
  const n = parseInt(String(W.SHOPIFY_PRODUCTS_PAGE_SIZE), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 8;
}

/** `admin-proxy` = catalog loaded via dev-server Admin REST (same as Postman); no Storefront token needed for grids. */
export function getCatalogSource() {
  const s = (W.SHOPIFY_CATALOG_SOURCE || 'storefront').trim().toLowerCase();
  return s === 'admin-proxy' ? 'admin-proxy' : 'storefront';
}

/** Use hosted storefront cart URL instead of Storefront GraphQL cart (Admin-proxy mode). */
export function useLegacyCartCheckout() {
  return getCatalogSource() === 'admin-proxy';
}

export function isShopifyConfigured() {
  if (!getStoreDomain()) return false;
  if (getCatalogSource() === 'admin-proxy') return true;
  return Boolean(getStorefrontToken());
}
