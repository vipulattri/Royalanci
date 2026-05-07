/** GSAP scroll animations, hero timeline, magnetic CTA, parallax */
export function initAnimations(gsap) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  whySliderDots();

  if (prefersReducedMotion) {
    gsap.set(
      [
        '.reveal-line',
        '.hero-title-line',
        '[data-stagger] > *',
        '.why-card',
        '.about-kicker',
        '.about-title-js',
        '.about-ico',
        '.about-rule',
        '.about-lead',
        '.about-body',
      ],
      {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        clearProps: 'transform',
      }
    );
    gsap.set('.hero-photo-wrap', { clipPath: 'inset(0%)' });
    gsap.set('.hero-photo-scale', { scale: 1 });
    gsap.set('.hero-photo', { yPercent: 0 });
    return;
  }

  heroAnimation(gsap);
  scrollReveal(gsap);
  magneticButtons(gsap);
  parallaxCards(gsap);
}

function splitChars(el) {
  const text = el.textContent.trim();
  el.textContent = '';
  const frag = document.createDocumentFragment();
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? '\u00a0' : ch;
    frag.appendChild(span);
  }
  el.appendChild(frag);
}

/** Split heading into word spans for staggered reveals */
function splitTitleIntoWords(container) {
  const raw = container.textContent.trim();
  const words = raw.split(/\s+/).filter(Boolean);
  container.textContent = '';
  words.forEach((word, i) => {
    const wrap = document.createElement('span');
    wrap.className = 'about-word-wrap';
    const inner = document.createElement('span');
    inner.className = 'about-word';
    inner.textContent = word;
    wrap.appendChild(inner);
    container.appendChild(wrap);
    if (i < words.length - 1) {
      container.appendChild(document.createTextNode(' '));
    }
  });
}

function initHeroPhoto(gsap) {
  const wrap = document.querySelector('.hero-photo-wrap');
  const scaleEl = document.querySelector('.hero-photo-scale');
  const img = document.querySelector('.hero-photo');
  const hero = document.querySelector('.hero');
  if (!wrap || !scaleEl || !img) return;

  gsap.set(wrap, { clipPath: 'inset(100% 0 0 0)' });
  gsap.set(scaleEl, { scale: 1.14 });
  gsap.set(img, { yPercent: 6 });

  gsap
    .timeline({ defaults: { ease: 'power4.inOut' } })
    .to(wrap, {
      clipPath: 'inset(0% 0 0 0)',
      duration: 1.45,
    })
    .to(
      scaleEl,
      {
        scale: 1,
        duration: 2.15,
        ease: 'power3.out',
      },
      '-=1.08'
    )
    .to(
      img,
      {
        yPercent: 0,
        duration: 2,
        ease: 'power3.out',
      },
      '-=1.75'
    );

  gsap.to(scaleEl, {
    scale: 1.07,
    duration: 24,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    delay: 2.4,
  });

  if (hero) {
    gsap.to(wrap, {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }
}

function heroAnimation(gsap) {
  initHeroPhoto(gsap);

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to('.hero-title-line', {
    opacity: 1,
    y: 0,
    duration: 1.15,
    ease: 'power4.out',
  })
    .to(
      '.reveal-line',
      {
        opacity: 1,
        y: 0,
        duration: 0.85,
        stagger: 0.12,
      },
      '-=0.65'
    )
    .from(
      '.magnetic-btn',
      {
        opacity: 0,
        y: 16,
        duration: 0.55,
      },
      '-=0.45'
    );

  gsap.to('.hero-scroll-line', {
    scaleY: 0,
    transformOrigin: 'top',
    repeat: -1,
    yoyo: true,
    duration: 2.2,
    ease: 'power2.inOut',
  });

  gsap.to('.hero-gradient', {
    backgroundPosition: '50% 60%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
}

function scrollReveal(gsap) {
  gsap.utils.toArray('.section-head').forEach((head) => {
    gsap.from(head.children, {
      opacity: 0,
      y: 28,
      duration: 0.85,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: head,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
  });

  gsap.utils.toArray('[data-stagger]').forEach((container) => {
    const kids = container.children;
    gsap.to(kids, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      stagger: 0.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  initAboutSection(gsap);

  gsap.utils.toArray('.why-card').forEach((card, i) => {
    gsap.to(card, {
      opacity: 1,
      x: 0,
      duration: 0.75,
      delay: i * 0.05,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
    });
  });

  gsap.from('.newsletter-form', {
    opacity: 0,
    y: 20,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.newsletter-form',
      start: 'top 90%',
    },
  });

  gsap.from('.footer-grid > *', {
    opacity: 0,
    y: 24,
    duration: 0.65,
    stagger: 0.08,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.site-footer',
      start: 'top 92%',
    },
  });
}

function magneticButtons(gsap) {
  const buttons = document.querySelectorAll('.magnetic-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(btn, {
        x: x * 0.25,
        y: y * 0.25,
        duration: 0.35,
        ease: 'power3.out',
      });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, 0.5)' });
    });
  });
}

function whySliderDots() {
  const track = document.querySelector('[data-why-slider]');
  const dotsWrap = document.querySelector('.why-dots');
  if (!track || !dotsWrap) return;

  const cards = Array.from(track.querySelectorAll('.why-card'));
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'why-dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => {
      const card = cards[i];
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
    dotsWrap.appendChild(dot);
  });

  const dots = dotsWrap.querySelectorAll('.why-dot');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = cards.indexOf(entry.target);
        if (idx >= 0) {
          dots.forEach((d, j) => d.classList.toggle('is-active', j === idx));
        }
      });
    },
    { root: track, threshold: 0.55 }
  );
  cards.forEach((c) => io.observe(c));
}

function initAboutSection(gsap) {
  const section = document.querySelector('.about-section');
  if (!section) return;

  const titleEl = section.querySelector('.about-title-js');
  const lead = section.querySelector('.about-lead.split-text');
  const rule = section.querySelector('.about-rule');
  const kicker = section.querySelector('.about-kicker');
  const icons = section.querySelectorAll('.about-ico');
  const bodies = section.querySelectorAll('.about-body');

  if (titleEl) splitTitleIntoWords(titleEl);
  if (lead) splitChars(lead);

  const words = section.querySelectorAll('.about-word');
  const chars = lead ? lead.querySelectorAll('.char') : [];

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 78%',
      toggleActions: 'play none none none',
    },
  });

  if (kicker) {
    tl.from(kicker, { opacity: 0, y: 16, duration: 0.55, ease: 'power3.out' }, 0);
  }
  if (rule) {
    tl.from(
      rule,
      {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.9,
        ease: 'power2.inOut',
      },
      0.1
    );
  }
  if (words.length) {
    tl.from(
      words,
      {
        opacity: 0,
        y: 42,
        duration: 0.58,
        stagger: 0.068,
        ease: 'power4.out',
      },
      0.28
    );
  }
  if (icons.length) {
    tl.from(
      icons,
      {
        opacity: 0,
        scale: 0.2,
        y: 16,
        duration: 0.52,
        stagger: 0.15,
        ease: 'back.out(1.65)',
      },
      0.52
    );
  }
  if (chars.length) {
    tl.from(
      chars,
      {
        opacity: 0,
        y: 12,
        duration: 0.32,
        stagger: 0.013,
        ease: 'power2.out',
      },
      0.68
    );
  }
  if (bodies.length) {
    tl.from(
      bodies,
      {
        opacity: 0,
        y: 28,
        duration: 0.85,
        stagger: 0.2,
        ease: 'power3.out',
      },
      chars.length ? '-=0.28' : 0.88
    );
  }

  const bg = section.querySelector('.about-bg');
  if (bg) {
    gsap.to(bg, {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  }
}

function parallaxCards(gsap) {
  gsap.utils.toArray('.product-image-wrap').forEach((wrap) => {
    const img = wrap.querySelector('.product-image');
    if (!img) return;
    gsap.to(img, {
      yPercent: 6,
      ease: 'none',
      scrollTrigger: {
        trigger: wrap,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}
