import { handleCatalogRequest } from './server/catalog-handler.mjs';

/**
 * Proxies Admin REST catalog during `npm run dev` so the browser never sees shpat_.
 */
export function vitePluginShopifyCatalog() {
  return {
    name: 'shopify-admin-catalog',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/shopify/catalog')) {
          next();
          return;
        }
        await handleCatalogRequest(req, res, url.split('?')[0]);
      });
    },
  };
}
