import { handleCatalogRequest } from './server/catalog-handler.mjs';
import { handleAdminProxyRequest } from './server/admin-proxy-forward.mjs';

/**
 * Dev server: Postman-equivalent Admin REST (`/api/shopify/admin/...`) + catalog UI mapping.
 */
export function vitePluginShopifyCatalog() {
  return {
    name: 'shopify-admin-catalog',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/shopify/admin')) {
          await handleAdminProxyRequest(req, res);
          return;
        }
        if (!url.startsWith('/api/shopify/catalog')) {
          next();
          return;
        }
        await handleCatalogRequest(req, res, url.split('?')[0]);
      });
    },
  };
}
