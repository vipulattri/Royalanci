/**
 * List products (Admin REST) — verify token + shop.
 *
 *   node server/list-products.mjs
 */
import { adminRest } from './shopify-admin.mjs';

async function main() {
  try {
    const q = new URLSearchParams({ limit: '10' });
    const data = await adminRest('GET', `/products.json?${q}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e.message);
    if (e.body) console.error(JSON.stringify(e.body, null, 2));
    process.exit(1);
  }
}

main();
