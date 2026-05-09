const STORAGE_KEY = 'royalanci-promo-gift-dismissed';
const CODE = 'royalgift';
const OPEN_DELAY_MS = 500;

/**
 * Surprise-gift promo: shows shortly after load unless dismissed this session.
 */
export function initPromoPopup() {
  const root = document.getElementById('promo-popup');
  if (!root) return;
  if (sessionStorage.getItem(STORAGE_KEY) === '1') return;

  const backdrop = root.querySelector('.promo-popup-backdrop');
  const closeBtn = root.querySelector('.promo-popup-close');
  const copyBtn = root.querySelector('.promo-popup-copy');
  const dismissBtn = root.querySelector('.promo-popup-dismiss');
  const feedback = root.querySelector('.promo-popup-copy-feedback');

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

  function setFeedback(text) {
    if (!feedback) return;
    if (text) {
      feedback.textContent = text;
      feedback.removeAttribute('hidden');
    } else {
      feedback.textContent = '';
      feedback.setAttribute('hidden', '');
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(CODE);
      setFeedback('Code copied to clipboard');
      copyBtn?.setAttribute('data-copied', '');
      window.setTimeout(() => {
        setFeedback('');
        copyBtn?.removeAttribute('data-copied');
      }, 2500);
    } catch {
      setFeedback('Select and copy: ' + CODE);
    }
  }

  backdrop?.addEventListener('click', dismiss);
  closeBtn?.addEventListener('click', dismiss);
  dismissBtn?.addEventListener('click', dismiss);
  copyBtn?.addEventListener('click', copyCode);

  window.setTimeout(show, OPEN_DELAY_MS);
}
