# Royalanci — Luxury storefront

Headless Shopify storefront for **Royalanci**: Vite, GSAP, and the **Shopify Storefront API**. Product grids, search, cart drawer, customer login, and marketing sections (hero, collections, about).

## Requirements

- **Node.js** 18+ and npm

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite prints).

### Shopify configuration

1. Copy `.env.example` to `.env` **or** edit `src/shopify/shopify-settings.js`.
2. Set **`SHOPIFY_STORE_DOMAIN`** (e.g. `your-store.myshopify.com`).
3. Set **`SHOPIFY_STOREFRONT_ACCESS_TOKEN`** to your **Storefront API** access token from Shopify Admin → **Apps** → your custom app → **Configuration** → **Storefront API** (not the Admin `shpat_` token).

Restart the dev server after changing env/settings.

### Optional: Admin API (local scripts only)

For `npm run admin:list-products` / `npm run admin:create-product`, set **`SHOPIFY_ADMIN_ACCESS_TOKEN`** in `server/shopify-settings.mjs` or in `.env` as documented in `.env.example`. Never expose Admin tokens in frontend code.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run admin:list-products` | List products (Admin API, Node) |
| `npm run admin:create-product` | Create sample product (Admin API, Node) |

## Deploy (recommended: Netlify or Vercel)

This project is a **static site** after `npm run build`. Output folder: **`dist/`**.

### Netlify

1. Connect the GitHub repo **vipulattri/Royalanci**.
2. Build command: `npm run build`
3. Publish directory: `dist`

A `netlify.toml` is included for build settings.

### Vercel

1. Import the GitHub repo.
2. Framework preset: **Vite** (or Other).
3. Build command: `npm run build`, output: `dist`.

Set **environment variables** in the dashboard if you inject `VITE_*` at build time, or keep using `shopify-settings.js` for public Storefront credentials.

### GitHub Codespaces

Open the repo in Codespaces, run `npm install` and `npm run dev`. Use the **Ports** panel to open the forwarded URL.

## Repository

Remote (maintainer): `https://github.com/vipulattri/Royalanci.git`

```bash
git remote add origin https://github.com/vipulattri/Royalanci.git
git branch -M main
git push -u origin main
```

Use a [personal access token](https://github.com/settings/tokens) or SSH if HTTPS push asks for credentials.

## Security

- Do **not** commit `.env` or Admin API tokens.
- Storefront tokens are intended for client-side use with limited scopes; rotate if leaked.

## License

Proprietary — Royalanci. All rights reserved unless otherwise stated by the owners.
