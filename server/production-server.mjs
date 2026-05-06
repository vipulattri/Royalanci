/**
 * Production Node server: static `dist/` + `/api/shopify/catalog/*` (Admin REST via catalog-handler).
 * Set SHOPIFY_ADMIN_ACCESS_TOKEN + SHOPIFY_SHOP_DOMAIN in environment (never in client JS).
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCatalogRequest } from './catalog-handler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function resolveStaticPath(pathname) {
  const raw = pathname.split('?')[0] || '/';
  let rel = decodeURIComponent(raw);
  if (rel !== '/' && rel.includes('..')) return null;
  if (rel === '/' || rel === '') return path.join(dist, 'index.html');
  rel = rel.replace(/^\/+/, '');
  return path.join(dist, rel);
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/shopify/catalog')) {
      await handleCatalogRequest(req, res, pathname);
      return;
    }

    let filePath = resolveStaticPath(pathname);
    if (!filePath) {
      res.statusCode = 400;
      res.end('Bad path');
      return;
    }

    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      const body = await fs.readFile(filePath);
      res.setHeader('Content-Type', contentType(filePath));
      res.statusCode = 200;
      res.end(body);
    } catch {
      const htmlPath = path.join(dist, 'index.html');
      try {
        const html = await fs.readFile(htmlPath);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.statusCode = 200;
        res.end(html);
      } catch {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not found (run npm run build first)');
      }
    }
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(e?.message || 'Server error');
  }
});

const port = Number(process.env.PORT) || 4173;
server.listen(port, '0.0.0.0', () => {
  console.log(`Royalanci production server — http://0.0.0.0:${port} (static + /api/shopify/catalog)`);
});
