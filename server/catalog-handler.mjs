/**
 * Dev-server routes: fetch catalog via Admin REST (same credentials as Postman).
 */
import { adminRest, adminFetchRaw } from './shopify-admin.mjs';
import { mapAdminProductToUiShape } from './map-admin-product.mjs';

/** Human-readable message when Shopify returns 401 / invalid token (especially on Render). */
function describeAdminAuthFailure(status, data, rawText) {
  const parts = [];
  if (typeof data?.errors === 'string') parts.push(data.errors);
  if (typeof data?.error === 'string') parts.push(data.error);
  if (Array.isArray(data?.errors)) parts.push(data.errors.map(String).join('; '));
  const blob = [...parts, rawText || ''].join(' ');
  if (/invalid api key|access token|wrong password|unrecognized login/i.test(blob)) {
    return (
      'Shopify rejected the Admin API token. On Render: Web Service → Environment → set SHOPIFY_ADMIN_ACCESS_TOKEN to your current Admin token (Shopify Admin → Apps → your app → API credentials — same as Postman X-Shopify-Access-Token). Save and redeploy. Must not use VITE_ prefix.'
    );
  }
  return parts.filter(Boolean)[0] || rawText?.slice(0, 500) || `Admin API error (${status})`;
}

let cachedCurrency = '';

async function getShopCurrency() {
  if (cachedCurrency) return cachedCurrency;
  try {
    const body = await adminRest('GET', '/shop.json');
    const c = body?.shop?.currency;
    cachedCurrency = typeof c === 'string' && c.length === 3 ? c : 'USD';
  } catch {
    cachedCurrency = 'USD';
  }
  return cachedCurrency;
}

function parseNextPageInfo(linkHeader) {
  if (!linkHeader || typeof linkHeader !== 'string') return null;
  const m = linkHeader.match(/[?&]page_info=([^&>]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function productUsesGiftCardFulfillment(p) {
  const variants = p?.variants;
  if (!Array.isArray(variants)) return false;
  return variants.some(
    (v) => String(v?.fulfillment_service || '').toLowerCase() === 'gift_card'
  );
}

/** Admin REST can return `draft`, `archived`, `active`, `unlisted`, etc. Hide unlisted + gift-card SKUs from the headless storefront. */
function isPublicCatalogProduct(p) {
  if (String(p?.status || '').toLowerCase() === 'unlisted') return false;
  if (productUsesGiftCardFulfillment(p)) return false;
  return true;
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} pathname
 */
export async function handleCatalogRequest(req, res, pathname) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const url = new URL(req.url || '/', 'http://local');
    const currency = await getShopCurrency();

    const isProducts =
      pathname === '/api/shopify/catalog/products' ||
      pathname.endsWith('/catalog/products');
    const isCollection =
      pathname === '/api/shopify/catalog/collection' ||
      pathname.endsWith('/catalog/collection');

    if (isProducts) {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '8', 10) || 8, 50);
      const pageInfo = url.searchParams.get('page_info') || '';
      const qs = new URLSearchParams({ limit: String(limit) });
      if (pageInfo) qs.set('page_info', pageInfo);

      const { ok, status, data, linkHeader, text } = await adminFetchRaw(
        'GET',
        `/products.json?${qs}`
      );
      if (!ok) {
        res.statusCode = status;
        res.end(
          JSON.stringify({
            error: describeAdminAuthFailure(status, data, text),
          })
        );
        return;
      }

      const rawList = (data?.products || []).filter(isPublicCatalogProduct);
      const products = rawList.map((p) => mapAdminProductToUiShape(p, currency));
      const nextCursor = parseNextPageInfo(linkHeader);

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          products,
          pageInfo: {
            hasNextPage: Boolean(nextCursor),
            endCursor: nextCursor,
          },
        })
      );
      return;
    }

    if (isCollection) {
      const handle = url.searchParams.get('handle')?.trim();
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '8', 10) || 8, 50);
      const pageInfo = url.searchParams.get('page_info') || '';
      if (!handle) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing handle query parameter' }));
        return;
      }

      let collectionId = null;
      for (const endpoint of ['/custom_collections.json', '/smart_collections.json']) {
        const colData = await adminRest(
          'GET',
          `${endpoint}?handle=${encodeURIComponent(handle)}`
        );
        const list = colData?.custom_collections || colData?.smart_collections || [];
        if (list[0]?.id) {
          collectionId = list[0].id;
          break;
        }
      }

      if (!collectionId) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            products: [],
            pageInfo: { hasNextPage: false, endCursor: null },
            collectionTitle: null,
          })
        );
        return;
      }

      const qs = new URLSearchParams({
        limit: String(limit),
        collection_id: String(collectionId),
      });
      if (pageInfo) qs.set('page_info', pageInfo);

      const { ok, status, data, linkHeader, text } = await adminFetchRaw(
        'GET',
        `/products.json?${qs}`
      );

      if (!ok) {
        res.statusCode = status;
        res.end(
          JSON.stringify({
            error: describeAdminAuthFailure(status, data, text),
          })
        );
        return;
      }

      const rawList = (data?.products || []).filter(isPublicCatalogProduct);
      const products = rawList.map((p) => mapAdminProductToUiShape(p, currency));
      const nextCursor = parseNextPageInfo(linkHeader);

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          products,
          pageInfo: {
            hasNextPage: Boolean(nextCursor),
            endCursor: nextCursor,
          },
          collectionTitle: handle,
        })
      );
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e?.message || String(e) }));
  }
}
