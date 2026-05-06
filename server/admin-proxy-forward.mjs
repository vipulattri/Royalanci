/**
 * Postman-equivalent Admin REST proxy (server-side token).
 *
 * Postman:
 *   GET https://{shop}/admin/api/{version}/products.json?limit=10
 *   Header: X-Shopify-Access-Token: shpat_***
 *
 * Same call through this app (after npm start or npm run dev):
 *   GET /api/shopify/admin/products.json?limit=10
 *
 * Writes (POST/PUT/DELETE/PATCH) are off unless SHOPIFY_ADMIN_PROXY_ALLOW_WRITE=true on the server.
 */
import { adminFetchRaw, adminHttpRequest } from './shopify-admin.mjs';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handleAdminProxyRequest(req, res) {
  const host = req.headers.host || 'localhost';
  const fullUrl = new URL(req.url || '/', `http://${host}`);
  let pathAfterAdmin = fullUrl.pathname.replace(/^\/api\/shopify\/admin\/?/i, '');
  if (!pathAfterAdmin.startsWith('/')) pathAfterAdmin = `/${pathAfterAdmin}`;
  const pathAndQuery = `${pathAfterAdmin}${fullUrl.search}`;
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET') {
      const { ok, status, data, linkHeader, text } = await adminFetchRaw(
        'GET',
        pathAndQuery
      );
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (linkHeader) res.setHeader('Link', linkHeader);
      if (ok) {
        res.end(JSON.stringify(data));
      } else {
        res.end(typeof text === 'string' ? text : JSON.stringify(data));
      }
      return;
    }

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: `Method ${method} not supported` }));
      return;
    }

    if (process.env.SHOPIFY_ADMIN_PROXY_ALLOW_WRITE !== 'true') {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error:
            'Write proxy disabled. For POST/PUT/DELETE like Postman, set SHOPIFY_ADMIN_PROXY_ALLOW_WRITE=true on the server (use only in trusted environments).',
        })
      );
      return;
    }

    let jsonBody;
    if (method !== 'DELETE') {
      const raw = await readBody(req);
      if (raw.trim()) {
        try {
          jsonBody = JSON.parse(raw);
        } catch {
          jsonBody = raw;
        }
      }
    }

    const { status, text, linkHeader } = await adminHttpRequest(
      method,
      pathAndQuery,
      jsonBody
    );
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (linkHeader) res.setHeader('Link', linkHeader);
    res.end(text);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: e?.message || String(e) }));
  }
}
