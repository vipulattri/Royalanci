/**
 * Create a product via Admin REST API (same as your Postman request).
 *
 * Usage (from project root):
 *   node server/create-product.mjs
 *
 * Requires server/shopify-settings.mjs:
 *   SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN (Admin — never import in browser code)
 */
import { adminRest } from './shopify-admin.mjs';

/** Example payload matching your working Postman body */
const payload = {
  product: {
    title: 'skm test at 4/05/2026',
    handle: 'sauce',
    vendor: 'Ayesha',
    product_type: 'Necklace',
    tags: 'non consignment',
    options: [
      {
        name: 'Size',
        values: ['L'],
      },
    ],
    variants: [
      {
        option1: 'L',
        sku: 'Stssswrt0405',
        price: '20',
        inventory_management: 'shopify',
        inventory_policy: 'deny',
        inventory_quantity: 10,
      },
    ],
  },
};

async function main() {
  try {
    const result = await adminRest('POST', '/products.json', payload);
    console.log('Created product:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e.message);
    if (e.body) console.error(JSON.stringify(e.body, null, 2));
    process.exit(1);
  }
}

main();
