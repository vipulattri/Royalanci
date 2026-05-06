import {
  getGraphQLEndpoint,
  getStorefrontToken,
  isShopifyConfigured,
  tokenLooksLikeAdminApiKey,
} from './config.js';

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Low-level Storefront GraphQL client.
 * @see https://shopify.dev/docs/api/storefront
 */
export async function storefrontRequest(query, variables = {}) {
  if (!isShopifyConfigured()) {
    throw new Error(
      'Shopify Storefront is not configured. Either use admin-proxy catalog mode (no Storefront token for grids) or set VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN for storefront mode.'
    );
  }

  const token = getStorefrontToken();
  if (tokenLooksLikeAdminApiKey(token)) {
    throw new Error(
      'You pasted the Admin API token (shpat_…). Postman /admin/api/… uses that token; this site uses the Storefront API and needs a different credential. In Shopify Admin → your app → Configuration → Storefront API → copy the “Storefront API access token” (not the Admin API access token).'
    );
  }

  const endpoint = getGraphQLEndpoint();

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  const json = parseJsonSafe(text) || {};

  if (res.status === 401) {
    throw new Error(
      'Shopify returned 401 Unauthorized — your Storefront access token is missing, invalid, or revoked. Fix: Shopify Admin → Apps → [your app] → Configuration → Storefront API → copy the Storefront API access token into src/shopify/shopify-settings.js (SHOPIFY_STOREFRONT_ACCESS_TOKEN). Not the Admin shpat token. Restart npm run dev.'
    );
  }

  if (!res.ok) {
    const gqlErr = json?.errors?.[0]?.message;
    throw new Error(gqlErr || text?.slice(0, 200) || `HTTP ${res.status}`);
  }

  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new Error(msg);
  }

  return json.data;
}
