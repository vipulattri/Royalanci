/** Site chrome: sticky header, scroll state, mobile drawer */
export function initHeader() {
  const header = document.getElementById('site-header');
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.getElementById('mobile-drawer');

  if (!header) return;

  const onScroll = () => {
    const y = window.scrollY || window.pageYOffset;
    header.classList.toggle('is-scrolled', y > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        drawer.hidden = true;
        document.body.style.overflow = '';
      });
    });
  }
}
