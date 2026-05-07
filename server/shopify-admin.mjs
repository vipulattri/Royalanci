/**
 * Shopify Admin REST API (server-side only).
 * Credentials: ./shopify-settings.mjs (preferred). If those fields are empty, falls back to project-root `.env`.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as S from './shopify-settings.mjs';

function loadEnvFromRoot() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFromRoot();

function pickInlineOrEnv(inline, envKey) {
  const i = typeof inline === 'string' ? inline.trim() : '';
  if (i) return i;
  return process.env[envKey]?.trim() || '';
}

function shopDomain() {
  const raw = pickInlineOrEnv(S.SHOPIFY_SHOP_DOMAIN, 'SHOPIFY_SHOP_DOMAIN');
  return raw.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function adminToken() {
  return pickInlineOrEnv(S.SHOPIFY_ADMIN_ACCESS_TOKEN, 'SHOPIFY_ADMIN_ACCESS_TOKEN');
}

export const ADMIN_API_VERSION =
  pickInlineOrEnv(S.SHOPIFY_ADMIN_API_VERSION, 'SHOPIFY_ADMIN_API_VERSION') || '2026-04';

export function assertAdminConfig() {
  if (!shopDomain() || !adminToken()) {
    throw new Error(
      'Missing Admin API credentials. Match Postman: set SHOPIFY_ADMIN_ACCESS_TOKEN (and optionally SHOPIFY_SHOP_DOMAIN) in .env, or on Render: Environment → same variable names. Never commit tokens to git.'
    );
  }
}

/**
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {string} path - e.g. '/products.json' or 'products.json'
 * @param {object} [jsonBody] - body for POST/PUT
 */
function adminHeaders(method, withJsonBody) {
  const m = (method || 'GET').toUpperCase();
  const h = {
    Accept: 'application/json',
    'X-Shopify-Access-Token': adminToken(),
  };
  if (withJsonBody || ['POST', 'PUT', 'PATCH'].includes(m)) {
    h['Content-Type'] = 'application/json';
  }
  return h;
}

export async function adminRest(method, path, jsonBody) {
  assertAdminConfig();
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `https://${shopDomain()}/admin/api/${ADMIN_API_VERSION}${p}`;

  const res = await fetch(url, {
    method,
    headers: adminHeaders(method, jsonBody != null),
    body: jsonBody != null ? JSON.stringify(jsonBody) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }

  if (!res.ok) {
    const err = new Error(`Admin API ${res.status} ${res.statusText}: ${text.slice(0, 800)}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

/**
 * Same as adminRest but returns Link header for cursor pagination (products.json).
 */
export async function adminFetchRaw(method, pathAndQuery) {
  assertAdminConfig();
  const p = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  const url = `https://${shopDomain()}/admin/api/${ADMIN_API_VERSION}${p}`;

  const m = (method || 'GET').toUpperCase();
  const res = await fetch(url, {
    method: m,
    // Postman-style GET: no body, no Content-Type (only Accept + access token)
    headers: adminHeaders(m, false),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }

  const linkHeader = res.headers.get('link') || res.headers.get('Link') || '';

  return {
    ok: res.ok,
    status: res.status,
    data,
    linkHeader,
    text,
  };
}

/**
 * Generic Admin REST call — same URL shape as Postman (path + query after /admin/api/VERSION/).
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} pathAndQuery - e.g. `/products.json?limit=5`
 * @param {object|string|undefined} jsonBody - for POST/PUT/PATCH
 */
export async function adminHttpRequest(method, pathAndQuery, jsonBody) {
  assertAdminConfig();
  const pq = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`;
  const url = `https://${shopDomain()}/admin/api/${ADMIN_API_VERSION}${pq}`;
  const m = (method || 'GET').toUpperCase();

  const hasBody =
    ['POST', 'PUT', 'PATCH'].includes(m) && jsonBody !== undefined;

  const init = {
    method: m,
    headers: adminHeaders(m, hasBody),
  };

  if (hasBody) {
    init.body =
      typeof jsonBody === 'string' ? jsonBody : JSON.stringify(jsonBody);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  const linkHeader = res.headers.get('link') || res.headers.get('Link') || '';

  return {
    status: res.status,
    text,
    linkHeader,
    ok: res.ok,
  };
}
