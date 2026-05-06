import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  isShopifyConfigured,
  getCollectionHandlePrimary,
  getCollectionHandleSecondary,
  getProductsPageSize,
  getStorefrontBaseUrl,
  useLegacyCartCheckout,
} from '@/shopify/config.js';
import { formatMoney } from '@/shopify/money.js';
import {
  fetchCollectionProducts,
  fetchProductsPaginated,
  predictiveSearch,
  searchProductsPaginated,
  pickVariantForProduct,
  addVariantToCart,
  refreshCart,
  getCartId,
  customerLogin,
  customerLogout,
  fetchCustomerAccount,
  getCustomerAccessToken,
} from '@/shopify/services.js';
import {
  logShopifyConnectionDiagnostics,
  shouldLogShopifyDiagnostics,
} from '@/shopify/diagnostics.js';

/** After loading “Featured” (first 4 products), catalog sections continue from this cursor (no duplicates). */
let catalogResumeCursor = null;

const PRODUCT_GRID_IDS = ['grid-featured', 'grid-maghreb', 'grid-opulence'];

/** Empty-state copy — products always come from Shopify (no local demo catalog). */
function setAllProductGridsHtml(html) {
  for (const id of PRODUCT_GRID_IDS) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function productUrl(handle) {
  const base = getStorefrontBaseUrl();
  return base ? `${base}/products/${encodeURIComponent(handle)}` : `#`;
}

function tagBadge(tags) {
  const list = (tags || []).map((t) => t.toLowerCase());
  if (list.some((t) => /him|men|male/.test(t))) return 'For Him';
  if (list.some((t) => /her|women|female|lady/.test(t))) return 'For Her';
  return '';
}

/** Plain excerpt from Storefront `description` (matches Admin `body_html` story, server-truncated). */
function productDescriptionExcerpt(product) {
  const d = product?.description;
  if (typeof d !== 'string') return '';
  const t = d.replace(/\s+/g, ' ').trim();
  return t;
}

function renderProductCard(product) {
  const variant = pickVariantForProduct(product);
  const article = document.createElement('article');
  article.className = 'product-card';
  article.dataset.productId = product.id;

  const price = variant?.price || product.priceRange?.minVariantPrice;
  const compare = variant?.compareAtPrice || product.compareAtPriceRange?.minVariantPrice;
  const currency = price?.currencyCode || 'USD';
  const imgUrl = product.featuredImage?.url || '';
  const badge = tagBadge(product.tags);

  const priceSale = formatMoney(price?.amount, currency);
  const priceWas =
    compare?.amount && Number(compare.amount) > Number(price?.amount || 0)
      ? formatMoney(compare.amount, currency)
      : '';

  const href = productUrl(product.handle);
  const canBuy = Boolean(variant?.id);
  const vendor = String(product.vendor || '').trim();
  const vendorLabel = vendor || 'Royalanci';
  const excerpt = productDescriptionExcerpt(product);
  const excerptBlock = excerpt
    ? `<div class="product-card-detail"><p class="product-excerpt">${escapeHtml(excerpt)}</p></div>`
    : '';

  article.innerHTML = `
    <a href="${href}" class="product-card-link">
      <div class="product-image-wrap">
        ${
          imgUrl
            ? `<img class="product-image product-image--photo" src="${imgUrl}" alt="${escapeAttr(
                product.featuredImage?.altText || product.title
              )}" loading="lazy" width="600" height="800" />`
            : `<div class="product-image ph-1" role="img" aria-label="${escapeAttr(product.title)}"></div>`
        }
        ${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ''}
      </div>
      <h3 class="product-name">${escapeHtml(product.title)}</h3>
      <div class="product-rating product-rating--shopify" aria-hidden="true">
        <span class="stars">★★★★★</span>
        <span class="product-rating-note">${escapeHtml(vendorLabel)}</span>
      </div>
      <div class="product-price">
        <span class="price-sale">${escapeHtml(priceSale)}</span>
        ${priceWas ? `<span class="price-was">${escapeHtml(priceWas)}</span>` : ''}
      </div>
      ${excerptBlock}
    </a>
    <button type="button" class="btn-outline js-add-to-cart" data-variant-id="${variant?.id || ''}" ${
      canBuy ? '' : 'disabled'
    }>
      ${canBuy ? 'Add to bag' : 'Sold out'}
    </button>
  `;

  const addBtn = article.querySelector('.js-add-to-cart');
  const base = getStorefrontBaseUrl();
  const legacyId = variant?.legacyNumericId;

  if (useLegacyCartCheckout() && legacyId && base) {
    addBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = `${base}/cart/add?id=${legacyId}&quantity=1`;
    });
  } else {
    addBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!variant?.id) return;
      addBtn.disabled = true;
      const label = addBtn.textContent;
      try {
        const cart = await addVariantToCart(variant.id, 1);
        addBtn.textContent = 'Added';
        updateCartCount(cart?.totalQuantity);
        setTimeout(() => {
          addBtn.textContent = label;
          addBtn.disabled = false;
        }, 1400);
      } catch (err) {
        addBtn.textContent = 'Error';
        alert(err?.message || 'Could not add to cart');
        addBtn.disabled = false;
        addBtn.textContent = label;
      }
    });
  }

  return article;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}

function setGridLoading(gridEl, loading) {
  gridEl.classList.toggle('is-loading', loading);
}

function showError(el, msg) {
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
}

/** Primary / secondary product grids with pagination */
async function initProductGrids() {
  const gridA = document.getElementById('grid-maghreb');
  const gridB = document.getElementById('grid-opulence');
  const errA = document.getElementById('shopify-error-maghreb');
  const errB = document.getElementById('shopify-error-opulence');
  const btnA = document.getElementById('load-more-maghreb');
  const btnB = document.getElementById('load-more-opulence');

  if (!gridA || !gridB) return;

  const pageSize = getProductsPageSize();
  const handleA = getCollectionHandlePrimary();
  const handleB = getCollectionHandleSecondary();

  const stateA = {
    cursor: null,
    hasNext: false,
    collectionHandle: handleA || null,
  };
  const stateB = {
    cursor: null,
    hasNext: false,
    collectionHandle: handleB || null,
  };

  function setLoadMore(btn, state) {
    if (!btn) return;
    const show = Boolean(state.hasNext && state.cursor);
    btn.hidden = !show;
    btn.disabled = !show;
  }

  async function renderCatalogPage(grid, afterCursor, state, errEl) {
    showError(errEl, '');
    setGridLoading(grid, true);
    try {
      const r = await fetchProductsPaginated(pageSize, afterCursor);
      grid.innerHTML = '';
      if (!r.products.length && !afterCursor) {
        grid.innerHTML =
          '<p class="shopify-placeholder">No products found. Add products in Shopify Admin.</p>';
      } else {
        r.products.forEach((p) => grid.appendChild(renderProductCard(p)));
      }
      state.cursor = r.pageInfo.endCursor;
      state.hasNext = r.pageInfo.hasNextPage;
      ScrollTrigger.refresh();
    } catch (e) {
      showError(errEl, e?.message || 'Failed to load products');
      grid.innerHTML = '';
    } finally {
      setGridLoading(grid, false);
    }
  }

  async function renderCollectionPage(grid, handle, afterCursor, state, errEl, isInitial) {
    showError(errEl, '');
    setGridLoading(grid, true);
    try {
      const r = await fetchCollectionProducts(handle, pageSize, afterCursor);
      if (isInitial) grid.innerHTML = '';
      if (!r.products.length && isInitial) {
        grid.innerHTML = `<p class="shopify-placeholder">No products in collection <code>${escapeHtml(
          handle
        )}</code>. Check the handle in Shopify Admin → Collections.</p>`;
      } else {
        r.products.forEach((p) => grid.appendChild(renderProductCard(p)));
      }
      state.cursor = r.pageInfo.endCursor;
      state.hasNext = r.pageInfo.hasNextPage;
      ScrollTrigger.refresh();
    } catch (e) {
      showError(errEl, e?.message || 'Failed to load collection');
      if (isInitial) grid.innerHTML = '';
    } finally {
      setGridLoading(grid, false);
    }
  }

  async function loadMore(grid, state, errEl, btn) {
    if (!state.hasNext || !state.cursor) return;
    if (state.collectionHandle) {
      await renderCollectionPage(grid, state.collectionHandle, state.cursor, state, errEl, false);
    } else {
      await appendCatalog(grid, state, errEl);
    }
    setLoadMore(btn, state);
  }

  async function appendCatalog(grid, state, errEl) {
    showError(errEl, '');
    setGridLoading(grid, true);
    try {
      const r = await fetchProductsPaginated(pageSize, state.cursor);
      state.cursor = r.pageInfo.endCursor;
      state.hasNext = r.pageInfo.hasNextPage;
      r.products.forEach((p) => grid.appendChild(renderProductCard(p)));
      ScrollTrigger.refresh();
    } catch (e) {
      showError(errEl, e?.message || 'Load more failed');
    } finally {
      setGridLoading(grid, false);
    }
  }

  /* Continue catalog after “Featured” row so products are not duplicated. */
  const catalogAfterFeatured = catalogResumeCursor;

  /* ——— Grid A ——— */
  if (handleA) {
    await renderCollectionPage(gridA, handleA, null, stateA, errA, true);
  } else {
    await renderCatalogPage(gridA, catalogAfterFeatured, stateA, errA);
  }
  setLoadMore(btnA, stateA);

  /* ——— Grid B ——— */
  if (handleB) {
    await renderCollectionPage(gridB, handleB, null, stateB, errB, true);
  } else if (!handleA && !handleB) {
    await renderCatalogPage(gridB, stateA.cursor, stateB, errB);
    setLoadMore(btnB, stateB);
  } else {
    gridB.innerHTML =
      '<p class="shopify-placeholder">Set <code>SHOPIFY_COLLECTION_OPULENCE</code> in <code>src/shopify/shopify-settings.js</code> for this section, or clear both collection fields to use catalog pagination for both rows.</p>';
    setLoadMore(btnB, { hasNext: false, cursor: null });
  }

  btnA?.addEventListener('click', () => loadMore(gridA, stateA, errA, btnA));
  btnB?.addEventListener('click', () => loadMore(gridB, stateB, errB, btnB));
}

function updateCartCount(totalQty) {
  const el = document.querySelector('[data-cart-count]');
  if (!el) return;
  const n = typeof totalQty === 'number' ? totalQty : 0;
  el.textContent = n > 99 ? '99+' : String(n);
  el.hidden = n === 0;
}

async function syncCartBadge() {
  try {
    if (!getCartId()) {
      updateCartCount(0);
      return;
    }
    const cart = await refreshCart();
    updateCartCount(cart?.totalQuantity ?? 0);
  } catch {
    updateCartCount(0);
  }
}

function initSearchPanel() {
  const toggle = document.querySelector('.js-search-toggle');
  const panel = document.getElementById('search-panel');
  const input = document.getElementById('shopify-search-input');
  const suggest = document.getElementById('search-suggestions');
  const fullBtn = document.getElementById('search-see-all');
  const backdrop = panel?.querySelector('.search-panel-backdrop');

  if (!toggle || !panel || !input || !suggest) return;

  const close = () => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    input.value = '';
    suggest.innerHTML = '';
    if (fullBtn) fullBtn.hidden = true;
  };

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) setTimeout(() => input.focus(), 50);
  });

  backdrop?.addEventListener('click', close);

  const runPredictive = debounce(async () => {
    const q = input.value.trim();
    suggest.innerHTML = '';
    if (fullBtn) fullBtn.hidden = q.length < 2;
    if (q.length < 2) return;

    try {
      const { products, queries } = await predictiveSearch(q, 8);
      const frag = document.createDocumentFragment();

      queries.slice(0, 5).forEach((text) => {
        const li = document.createElement('li');
        li.className = 'search-suggestion search-suggestion--query';
        li.textContent = text;
        li.addEventListener('click', () => {
          input.value = text;
          runPredictive();
        });
        frag.appendChild(li);
      });

      products.forEach((p) => {
        const li = document.createElement('li');
        li.className = 'search-suggestion search-suggestion--product';
        const price = p.priceRange?.minVariantPrice;
        const money = formatMoney(price?.amount, price?.currencyCode);
        li.innerHTML = `<span class="search-suggestion-title">${escapeHtml(p.title)}</span><span class="search-suggestion-meta">${escapeHtml(money)}</span>`;
        li.addEventListener('click', () => {
          window.location.href = productUrl(p.handle);
        });
        frag.appendChild(li);
      });

      suggest.appendChild(frag);
      if (fullBtn) fullBtn.hidden = q.length < 2;
    } catch {
      suggest.innerHTML = '<li class="search-suggestion search-suggestion--empty">No suggestions</li>';
    }
  }, 280);

  input.addEventListener('input', runPredictive);

  fullBtn?.addEventListener('click', async () => {
    const q = input.value.trim();
    if (q.length < 2) return;
    suggest.innerHTML = '<li class="search-suggestion">Loading…</li>';
    try {
      const r = await searchProductsPaginated(q, getProductsPageSize(), null);
      suggest.innerHTML = '';
      r.products.forEach((p) => {
        const li = document.createElement('li');
        li.className = 'search-suggestion search-suggestion--product';
        const v = pickVariantForProduct(p);
        const price = v?.price || p.priceRange?.minVariantPrice;
        const money = formatMoney(price?.amount, price?.currencyCode);
        li.innerHTML = `<span class="search-suggestion-title">${escapeHtml(p.title)}</span><span class="search-suggestion-meta">${escapeHtml(money)}</span>`;
        li.addEventListener('click', () => {
          window.location.href = productUrl(p.handle);
        });
        suggest.appendChild(li);
      });
      if (!r.products.length) {
        suggest.innerHTML = '<li class="search-suggestion search-suggestion--empty">No products match</li>';
      }
    } catch (e) {
      suggest.innerHTML = `<li class="search-suggestion search-suggestion--empty">${escapeHtml(e?.message || 'Search failed')}</li>`;
    }
  });
}

function renderCartLines(cart, container) {
  if (!container) return;
  container.innerHTML = '';
  const edges = cart?.lines?.edges || [];
  if (!edges.length) {
    container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    return;
  }

  edges.forEach(({ node: line }) => {
    const m = line.merchandise;
    if (!m) return;
    const row = document.createElement('div');
    row.className = 'cart-line';
    const img = m.image?.url
      ? `<img src="${escapeAttr(m.image.url)}" alt="" width="64" height="64" loading="lazy" />`
      : '';
    const price = formatMoney(m.price?.amount, m.price?.currencyCode);
    row.innerHTML = `
      <div class="cart-line-media">${img}</div>
      <div class="cart-line-body">
        <div class="cart-line-title">${escapeHtml(m.product?.title || '')}</div>
        <div class="cart-line-meta">${escapeHtml(price)} × ${line.quantity}</div>
      </div>
    `;
    container.appendChild(row);
  });
}

function initCartDrawer() {
  const cartBtn = document.querySelector('.js-cart-toggle');
  const drawer = document.getElementById('cart-drawer');
  const backdrop = drawer?.querySelector('.cart-drawer-backdrop');
  const linesEl = document.getElementById('cart-lines');
  const checkoutBtn = document.getElementById('cart-checkout');
  const subtotalEl = document.getElementById('cart-subtotal');

  if (!cartBtn || !drawer) return;

  const openDrawer = async () => {
    drawer.hidden = false;
    cartBtn.setAttribute('aria-expanded', 'true');
    try {
      const cart = getCartId() ? await refreshCart() : null;
      if (!cart) {
        linesEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        subtotalEl.textContent = '';
        checkoutBtn.disabled = true;
        return;
      }
      renderCartLines(cart, linesEl);
      const amt = cart.cost?.totalAmount;
      subtotalEl.textContent = amt ? `Subtotal ${formatMoney(amt.amount, amt.currencyCode)}` : '';
      checkoutBtn.disabled = !cart.lines?.edges?.length;
      checkoutBtn.onclick = () => {
        if (cart.checkoutUrl) window.location.href = cart.checkoutUrl;
      };
      updateCartCount(cart.totalQuantity);
    } catch (e) {
      linesEl.innerHTML = `<p class="cart-error">${escapeHtml(e?.message || '')}</p>`;
    }
  };

  const closeDrawer = () => {
    drawer.hidden = true;
    cartBtn.setAttribute('aria-expanded', 'false');
  };

  cartBtn.addEventListener('click', () => {
    if (drawer.hidden) openDrawer();
    else closeDrawer();
  });

  backdrop?.addEventListener('click', closeDrawer);
  drawer.querySelector('.js-cart-close')?.addEventListener('click', closeDrawer);
}

function initAccountModal() {
  const btn = document.querySelector('.js-account-toggle');
  const modal = document.getElementById('account-modal');
  const backdrop = modal?.querySelector('.account-modal-backdrop');
  const closeBtn = modal?.querySelector('.js-account-close');
  const form = document.getElementById('customer-login-form');
  const emailEl = document.getElementById('customer-email');
  const passEl = document.getElementById('customer-password');
  const errEl = document.getElementById('account-form-error');
  const welcome = document.getElementById('account-welcome');
  const loginFieldset = document.getElementById('account-login-fieldset');
  const ordersEl = document.getElementById('account-orders');

  if (!btn || !modal) return;

  const close = () => {
    modal.hidden = true;
  };

  btn.addEventListener('click', async () => {
    modal.hidden = false;
    errEl.textContent = '';
    if (getCustomerAccessToken()) {
      await showOrders();
    } else {
      welcome.hidden = true;
      loginFieldset.hidden = false;
      ordersEl.innerHTML = '';
    }
  });

  backdrop?.addEventListener('click', close);
  closeBtn?.addEventListener('click', close);

  document.getElementById('account-logout')?.addEventListener('click', () => {
    customerLogout();
    welcome.hidden = true;
    loginFieldset.hidden = false;
    ordersEl.innerHTML = '';
    errEl.textContent = '';
  });

  async function showOrders() {
    try {
      const customer = await fetchCustomerAccount(15, null);
      if (!customer) {
        loginFieldset.hidden = false;
        welcome.hidden = true;
        return;
      }
      loginFieldset.hidden = true;
      welcome.hidden = false;
      const nameEl = welcome.querySelector('[data-account-name]');
      if (nameEl) {
        nameEl.textContent =
          [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Customer';
      }

      const edges = customer.orders?.edges || [];
      ordersEl.innerHTML = '';

      const appendOrderRow = (o) => {
        const div = document.createElement('div');
        div.className = 'account-order';
        const total = formatMoney(o.totalPrice?.amount, o.totalPrice?.currencyCode);
        const lines = (o.lineItems?.edges || [])
          .map(({ node: li }) => `${li.title}${li.variantTitle ? ` (${li.variantTitle})` : ''} × ${li.quantity}`)
          .join('; ');
        div.innerHTML = `
          <div class="account-order-head">
            <strong>${escapeHtml(o.name)}</strong>
            <span>${escapeHtml(total)}</span>
          </div>
          <div class="account-order-meta">${escapeHtml(o.processedAt?.slice(0, 10) || '')} · ${escapeHtml(o.financialStatus || '')} · ${escapeHtml(o.fulfillmentStatus || '')}</div>
          ${lines ? `<div class="account-order-lines">${escapeHtml(lines)}</div>` : ''}
        `;
        ordersEl.appendChild(div);
      };

      if (!edges.length) {
        ordersEl.innerHTML = '<p class="account-empty">No orders yet.</p>';
        return;
      }

      edges.forEach(({ node: o }) => appendOrderRow(o));

      const loadMoreBtn = document.getElementById('account-orders-more');
      let ordersCursor = customer.orders?.pageInfo?.endCursor;
      let ordersHasNext = customer.orders?.pageInfo?.hasNextPage;

      if (loadMoreBtn) {
        loadMoreBtn.hidden = !ordersHasNext;
        loadMoreBtn.onclick = async () => {
          if (!ordersCursor) return;
          loadMoreBtn.disabled = true;
          try {
            const data = await fetchCustomerAccount(15, ordersCursor);
            const nextEdges = data?.orders?.edges || [];
            ordersCursor = data?.orders?.pageInfo?.endCursor;
            ordersHasNext = data?.orders?.pageInfo?.hasNextPage;
            loadMoreBtn.hidden = !ordersHasNext;
            nextEdges.forEach(({ node: o }) => appendOrderRow(o));
          } finally {
            loadMoreBtn.disabled = false;
          }
        };
      }
    } catch (e) {
      errEl.textContent = e?.message || 'Could not load account';
      customerLogout();
      loginFieldset.hidden = false;
      welcome.hidden = true;
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    try {
      await customerLogin(emailEl.value.trim(), passEl.value);
      passEl.value = '';
      await showOrders();
    } catch (err) {
      errEl.textContent = err?.message || 'Login failed';
    }
  });
}

async function initFeaturedProducts() {
  const grid = document.getElementById('grid-featured');
  const errEl = document.getElementById('shopify-error-featured');
  catalogResumeCursor = null;
  if (!grid) return;

  try {
    const r = await fetchProductsPaginated(4, null);
    catalogResumeCursor = r.pageInfo?.endCursor ?? null;
    grid.innerHTML = '';
    if (!r.products.length) {
      showError(errEl, '');
      grid.innerHTML =
        '<p class="shopify-placeholder">No products found. Add or publish products in Shopify Admin.</p>';
      return;
    }
    showError(errEl, '');
    r.products.forEach((p) => grid.appendChild(renderProductCard(p)));
    ScrollTrigger.refresh();
  } catch (e) {
    console.error(e);
    showError(errEl, e?.message || 'Could not load featured products');
    grid.innerHTML = `<p class="shopify-placeholder">${escapeHtml(
      e?.message || 'Could not load featured products'
    )}</p>`;
    catalogResumeCursor = null;
  }
}

export async function initShopifyStorefront() {
  const banner = document.getElementById('shopify-config-banner');

  if (!isShopifyConfigured()) {
    if (banner) {
      banner.hidden = false;
      banner.innerHTML =
        '<strong>Shopify:</strong> Open <code>src/shopify/shopify-settings.js</code> and set <code>SHOPIFY_STOREFRONT_ACCESS_TOKEN</code> to your <strong>Storefront API</strong> token (Shopify Admin → Apps → your app → Storefront API). Admin tokens (<code>shpat_</code>) cannot be used here.';
    }
    setAllProductGridsHtml(
      '<p class="shopify-placeholder">Set your shop domain and Admin token (<code>server/shopify-settings.mjs</code> or <code>.env</code>), then run <code>npm run dev</code> so <code>/api/shopify/catalog</code> can load products.</p>'
    );
    initSearchPanel();
    initCartDrawer();
    initAccountModal();
    await syncCartBadge();
    ScrollTrigger.refresh();
    return;
  }

  if (banner) banner.hidden = true;

  try {
    if (shouldLogShopifyDiagnostics()) {
      await logShopifyConnectionDiagnostics();
    }

    catalogResumeCursor = null;
    await initFeaturedProducts();
    await initProductGrids();
  } catch (e) {
    console.error(e);
    if (banner) {
      banner.hidden = false;
      banner.innerHTML = `<strong>Shopify error:</strong> ${escapeHtml(e?.message || 'Could not load products')}.`;
    }
  }

  initSearchPanel();
  initCartDrawer();
  initAccountModal();
  await syncCartBadge();

  ScrollTrigger.refresh();
}
