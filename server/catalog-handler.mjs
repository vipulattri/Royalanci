/**
 * Dev-server routes: fetch catalog via Admin REST (same credentials as Postman).
 */
import { adminRest, adminFetchRaw } from './shopify-admin.mjs';
import { mapAdminProductToUiShape } from './map-admin-product.mjs';

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

      const { ok, status, data, linkHeader } = await adminFetchRaw(
        'GET',
        `/products.json?${qs}`
      );
      if (!ok) {
        res.statusCode = status;
        res.end(JSON.stringify({ error: data?.errors || data || 'Admin request failed' }));
        return;
      }

      const rawList = data?.products || [];
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

      const { ok, status, data, linkHeader } = await adminFetchRaw(
        'GET',
        `/products.json?${qs}`
      );

      if (!ok) {
        res.statusCode = status;
        res.end(JSON.stringify({ error: data?.errors || data || 'Admin request failed' }));
        return;
      }

      const rawList = data?.products || [];
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
