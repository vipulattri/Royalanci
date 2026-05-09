const STORAGE_KEY = 'royalanci-promo-gift-dismissed';
const OPEN_DELAY_MS = 500;

/**
 * Promo dialog on load unless dismissed this session.
 */
export function initPromoPopup() {
  const root = document.getElementById('promo-popup');
  if (!root) return;
  if (sessionStorage.getItem(STORAGE_KEY) === '1') return;

  const backdrop = root.querySelector('.promo-popup-backdrop');
  const closeBtn = root.querySelector('.promo-popup-close');
  const dismissBtn = root.querySelector('.promo-popup-dismiss');

  let open = false;
  let prevOverflow = '';

  function dismiss() {
    if (!open) return;
    open = false;
    root.setAttribute('hidden', '');
    document.body.style.overflow = prevOverflow;
    sessionStorage.setItem(STORAGE_KEY, '1');
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') dismiss();
  }

  function show() {
    if (open) return;
    open = true;
    root.removeAttribute('hidden');
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
    closeBtn?.focus();
  }

  backdrop?.addEventListener('click', dismiss);
  closeBtn?.addEventListener('click', dismiss);
  dismissBtn?.addEventListener('click', dismiss);

  window.setTimeout(show, OPEN_DELAY_MS);
}
