/**
 * Map Admin REST product JSON → same shape the storefront UI expects (GraphQL-like).
 */
function plainTextFromBody(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);
}

export function mapAdminProductToUiShape(product, currencyCode = 'USD') {
  const variants = product?.variants || [];
  const edges = variants.map((v) => {
    const gid = v.admin_graphql_api_id || `gid://shopify/ProductVariant/${v.id}`;
    const qty = Number(v.inventory_quantity);
    const policyContinue = String(v.inventory_policy || '').toLowerCase() === 'continue';
    const availableForSale = policyContinue || qty > 0 || !v.inventory_management;
    return {
      node: {
        id: gid,
        availableForSale,
        quantityAvailable: Number.isFinite(qty) ? qty : 0,
        price: {
          amount: String(v.price ?? '0'),
          currencyCode,
        },
        compareAtPrice: v.compare_at_price
          ? { amount: String(v.compare_at_price), currencyCode }
          : null,
        legacyNumericId: v.id,
      },
    };
  });

  const first = variants[0];
  const img = product.image || product.images?.[0];
  const productGid =
    product.admin_graphql_api_id || `gid://shopify/Product/${product.id}`;

  return {
    id: productGid,
    handle: product.handle,
    title: product.title,
    vendor: product.vendor || '',
    description: plainTextFromBody(product.body_html || ''),
    tags: String(product.tags || '')
      .split(/\s*,\s*/)
      .map((t) => t.trim())
      .filter(Boolean),
    featuredImage: img
      ? {
          url: img.src,
          altText: img.alt || product.title,
        }
      : null,
    priceRange: {
      minVariantPrice: {
        amount: String(first?.price ?? '0'),
        currencyCode,
      },
    },
    compareAtPriceRange: first?.compare_at_price
      ? {
          minVariantPrice: {
            amount: String(first.compare_at_price),
            currencyCode,
          },
        }
      : { minVariantPrice: null },
    variants: { edges },
  };
}
