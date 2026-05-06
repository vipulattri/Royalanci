import {
  getGraphQLEndpoint,
  getStoreDomain,
  getStorefrontToken,
  getCatalogSource,
  tokenLooksLikeAdminApiKey,
} from './config.js';
import { SHOPIFY_DEBUG_LOG } from './shopify-settings.js';
import { storefrontRequest } from './client.js';

/** Minimal query to verify Storefront token + domain. */
export const SHOP_PING = `
  query ShopPing {
    shop {
      name
      primaryDomain {
        host
      }
    }
  }
`;

/**
 * Safe preview — never log full tokens (browser console is not secret).
 */
export function getMaskedTokenDebug() {
  const t = getStorefrontToken();
  if (!t) return { present: false, length: 0, preview: '(empty)', looksLikeAdmin: false };
  const preview =
    t.length <= 10 ? `${t.slice(0, 2)}…` : `${t.slice(0, 4)}…${t.slice(-4)} (${t.length} chars)`;
  return {
    present: true,
    length: t.length,
    preview,
    looksLikeAdmin: tokenLooksLikeAdminApiKey(t),
  };
}

export function shouldLogShopifyDiagnostics() {
  return SHOPIFY_DEBUG_LOG === true || import.meta.env.DEV === true;
}

/**
 * Logs masked token info + pings Shopify when SHOPIFY_DEBUG_LOG is true (shopify-settings.js).
 */
export async function logShopifyConnectionDiagnostics() {
  const domain = getStoreDomain();

  if (getCatalogSource() === 'admin-proxy') {
    console.info(
      '[Royalanci / Shopify] Catalog mode: admin-proxy — products load via /api/shopify/catalog/* (Admin REST on the server). No Storefront token needed for product grids. Cart uses your hosted Shopify storefront.'
    );
    return;
  }

  const endpoint = getGraphQLEndpoint();
  const tok = getMaskedTokenDebug();

  console.info('[Royalanci / Shopify]', {
    domain,
    graphqlEndpoint: endpoint,
    storefrontToken: tok,
    hint:
      'Full token is never logged. If 401: use Storefront API token from Admin → Apps → your app → Storefront API (not Admin shpat_). Update shopify-settings.js and restart dev.',
  });

  if (!tok.present || tok.looksLikeAdmin) {
    console.warn('[Royalanci / Shopify] Fix token before expecting products to load.');
    return;
  }

  try {
    const data = await storefrontRequest(SHOP_PING, {});
    const name = data?.shop?.name;
    const host = data?.shop?.primaryDomain?.host;
    console.info('[Royalanci / Shopify] Connection OK — shop:', name, host ? `@ ${host}` : '');
  } catch (e) {
    console.error('[Royalanci / Shopify] Connection failed:', e?.message || e);
  }
}
