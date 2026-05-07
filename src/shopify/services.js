import { storefrontRequest } from './client.js';
import { getCatalogSource } from './config.js';
import {
  COLLECTION_PRODUCTS,
  PRODUCTS_PAGINATED,
  PREDICTIVE_SEARCH,
  PRODUCTS_SEARCH,
  CART_CREATE,
  CART_LINES_ADD,
  CART_GET,
  CUSTOMER_ACCESS_TOKEN_CREATE,
  CUSTOMER_ACCOUNT,
} from './queries.js';

const CART_STORAGE_KEY = 'royalanci_shopify_cart_id';
const CUSTOMER_TOKEN_KEY = 'royalanci_shopify_customer_token';

function catalogFetchErrorMessage(status, text) {
  try {
    const j = JSON.parse(text);
    if (typeof j?.error === 'string') return j.error;
  } catch {
    /* ignore */
  }
  return (text && text.slice(0, 500)) || `Request failed (HTTP ${status})`;
}

export function getCartId() {
  try {
    return localStorage.getItem(CART_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setCartId(id) {
  try {
    if (id) localStorage.setItem(CART_STORAGE_KEY, id);
    else localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getCustomerAccessToken() {
  try {
    return sessionStorage.getItem(CUSTOMER_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setCustomerAccessToken(token) {
  try {
    if (token) sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    else sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** First purchasable variant (prefers available). */
export function pickVariantForProduct(product) {
  const edges = product?.variants?.edges || [];
  for (const { node } of edges) {
    if (node?.availableForSale && node?.id) return node;
  }
  const first = edges[0]?.node;
  return first?.id ? first : null;
}

export async function fetchCollectionProducts(handle, first, after = null) {
  if (getCatalogSource() === 'admin-proxy') {
    const params = new URLSearchParams({
      handle,
      limit: String(first),
    });
    if (after) params.set('page_info', after);
    const res = await fetch(`/api/shopify/catalog/collection?${params}`);
    const text = await res.text();
    if (!res.ok) throw new Error(catalogFetchErrorMessage(res.status, text));
    return JSON.parse(text);
  }

  const data = await storefrontRequest(COLLECTION_PRODUCTS, {
    handle,
    first,
    after,
  });
  const col = data?.collection;
  if (!col) {
    return {
      products: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      collectionTitle: null,
    };
  }
  const edges = col.products?.edges || [];
  const products = edges.map((e) => e.node).filter(Boolean);
  return {
    products,
    pageInfo: col.products?.pageInfo || {
      hasNextPage: false,
      endCursor: null,
    },
    collectionTitle: col.title,
  };
}

export async function fetchProductsPaginated(first, after = null) {
  if (getCatalogSource() === 'admin-proxy') {
    const params = new URLSearchParams({ limit: String(first) });
    if (after) params.set('page_info', after);
    const res = await fetch(`/api/shopify/catalog/products?${params}`);
    const text = await res.text();
    if (!res.ok) throw new Error(catalogFetchErrorMessage(res.status, text));
    return JSON.parse(text);
  }

  const data = await storefrontRequest(PRODUCTS_PAGINATED, { first, after });
  const conn = data?.products;
  const edges = conn?.edges || [];
  const products = edges.map((e) => e.node).filter(Boolean);
  return {
    products,
    pageInfo: conn?.pageInfo || { hasNextPage: false, endCursor: null },
  };
}

/**
 * Quick suggestions (products + query strings). Uses Predictive Search API.
 */
export async function predictiveSearch(query, limit = 10) {
  const q = query.trim();
  if (q.length < 2) {
    return { products: [], queries: [] };
  }

  if (getCatalogSource() === 'admin-proxy') {
    const res = await fetch('/api/shopify/catalog/products?limit=50');
    if (!res.ok) return { products: [], queries: [] };
    const data = await res.json();
    const ql = q.toLowerCase();
    const products = (data.products || [])
      .filter((p) => (p.title || '').toLowerCase().includes(ql))
      .slice(0, limit);
    return { products, queries: [] };
  }

  const types = ['PRODUCT', 'QUERY'];
  const data = await storefrontRequest(PREDICTIVE_SEARCH, {
    query: q,
    limit,
    types,
  });

  const ps = data?.predictiveSearch;
  return {
    products: ps?.products || [],
    queries: (ps?.queries || []).map((x) => x.text).filter(Boolean),
  };
}

/** Full catalog search with pagination (fallback / deeper results). */
export async function searchProductsPaginated(searchQuery, first, after = null) {
  const sq = searchQuery.trim();
  if (getCatalogSource() === 'admin-proxy') {
    const res = await fetch('/api/shopify/catalog/products?limit=50');
    if (!res.ok) {
      return { products: [], pageInfo: { hasNextPage: false, endCursor: null } };
    }
    const data = await res.json();
    const ql = sq.toLowerCase();
    const all = (data.products || []).filter((p) =>
      (p.title || '').toLowerCase().includes(ql)
    );
    const products = all.slice(0, first);
    return {
      products,
      pageInfo: { hasNextPage: false, endCursor: null },
    };
  }

  const data = await storefrontRequest(PRODUCTS_SEARCH, {
    first,
    query: sq,
    after,
  });
  const conn = data?.products;
  const edges = conn?.edges || [];
  const products = edges.map((e) => e.node).filter(Boolean);
  return {
    products,
    pageInfo: conn?.pageInfo || { hasNextPage: false, endCursor: null },
  };
}

export async function ensureCart() {
  let id = getCartId();
  if (id) {
    const data = await storefrontRequest(CART_GET, { cartId: id });
    if (data?.cart?.id) return data.cart;
    setCartId('');
  }

  const created = await storefrontRequest(CART_CREATE, {
    input: {},
  });
  const cart = created?.cartCreate?.cart;
  const errs = created?.cartCreate?.userErrors;
  if (errs?.length) {
    throw new Error(errs.map((e) => e.message).join('; '));
  }
  if (!cart?.id) throw new Error('Could not create cart');
  setCartId(cart.id);
  return cart;
}

export async function refreshCart() {
  const id = getCartId();
  if (!id) return null;
  const data = await storefrontRequest(CART_GET, { cartId: id });
  return data?.cart || null;
}

export async function addVariantToCart(variantId, quantity = 1) {
  const cart = await ensureCart();
  const lines = [{ merchandiseId: variantId, quantity }];
  const result = await storefrontRequest(CART_LINES_ADD, {
    cartId: cart.id,
    lines,
  });
  const updated = result?.cartLinesAdd?.cart;
  const errs = result?.cartLinesAdd?.userErrors;
  if (errs?.length) {
    throw new Error(errs.map((e) => e.message).join('; '));
  }
  return updated;
}

export async function customerLogin(email, password) {
  const result = await storefrontRequest(CUSTOMER_ACCESS_TOKEN_CREATE, {
    input: { email, password },
  });
  const payload = result?.customerAccessTokenCreate;
  const errs = payload?.customerUserErrors;
  if (errs?.length) {
    throw new Error(errs.map((e) => e.message).join('; '));
  }
  const token = payload?.customerAccessToken?.accessToken;
  if (!token) throw new Error('Login failed');
  setCustomerAccessToken(token);
  return token;
}

export function customerLogout() {
  setCustomerAccessToken('');
}

export async function fetchCustomerAccount(ordersFirst = 15, ordersAfter = null) {
  const token = getCustomerAccessToken();
  if (!token) return null;

  const data = await storefrontRequest(CUSTOMER_ACCOUNT, {
    customerAccessToken: token,
    ordersFirst,
    ordersAfter,
  });
  return data?.customer || null;
}
