/* ── Navigation : bar, progress, navbar, smooth scroll, floating CTA ── */
import { $, $$, on } from './utils.js';

export function initPageTransition() {
  const overlay = $('#page-transition');
  if (!overlay) return;

  // Sélectionne tous les liens vers les formes externes
  const formLinks = $$('a[href="/essentiel.html"], a[href="/lead.html"], a[href="/essentiel"], a[href="/devis"]');

  formLinks.forEach(link => {
    on(link, 'click', e => {
      e.preventDefault();
      const target = link.getAttribute('href');
      overlay.style.pointerEvents = 'all';
      overlay.classList.add('active');
      setTimeout(() => { window.location.href = target; }, 460);
    });
  });
}

export function initProgress() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.prepend(bar);
  on(window, 'scroll', () => {
    const pct = window.scrollY / (document.body.scrollHeight - innerHeight) * 100;
    bar.style.width = Math.min(pct, 100) + '%';
  }, { passive: true });
}

export function initNav() {
  const nav = $('#navbar');
  if (!nav) return;
  let lastY = 0;
  on(window, 'scroll', () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 60);
    if (y > 350) {
      nav.style.transform = y > lastY + 5 ? 'translateY(-110%)' : 'translateY(0)';
    } else {
      nav.style.transform = 'translateY(0)';
    }
    nav.style.transition = 'transform .4s cubic-bezier(0.4,0,0.2,1), all .4s cubic-bezier(0.4,0,0.2,1)';
    lastY = y;
  }, { passive: true });

  const ham = $('#hamburger');
  const menu = $('#mobile-menu');
  if (!ham || !menu) return;

  const overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  document.body.appendChild(overlay);

  function openMenu() {
    ham.classList.add('open');
    menu.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    ham.classList.remove('open');
    menu.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  on(ham, 'click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
  $$('.mobile-menu a').forEach(a => on(a, 'click', closeMenu));
  on(overlay, 'click', closeMenu);
  on(document, 'keydown', e => { if (e.key === 'Escape') closeMenu(); });

  const cta = $('.nav-cta');
  if (cta) setInterval(() => {
    cta.classList.add('bounce');
    on(cta, 'animationend', () => cta.classList.remove('bounce'), { once: true });
  }, 6000);
}

export function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    on(a, 'click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── Sticky CTA mobile (apparait apres hero) ──────────── */
const STICKY_BUDGET_REDIRECT = {
  'Moins de 1 000€': '/essentiel',
  '1 000 – 2 000€':  '/devis',
  '2 000 – 5 000€':  '/devis',
  '5 000€ et plus':  '/devis',
};

export function initStickyCTA() {
  const sticky = $('#sticky-cta');
  const hero = $('#hero');
  if (!sticky || !hero || !matchMedia('(max-width: 768px)').matches) return;

  document.body.classList.add('has-sticky-cta');

  const observer = new IntersectionObserver(([entry]) => {
    sticky.classList.toggle('visible', !entry.isIntersecting);
  }, { threshold: 0.1 });

  observer.observe(hero);

  // Budget chips dans le sticky
  $$('.sticky-chip').forEach(chip => {
    on(chip, 'click', () => {
      const budget = chip.dataset.budget;

      // Visual feedback
      $$('.sticky-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');

      // Sauvegarder dans sessionStorage pour pre-remplir le vrai form
      sessionStorage.setItem('prefill_budget', budget);

      // Capturer le nom/email si deja remplis dans le form principal
      const name  = $('#f-name')?.value.trim()  || '';
      const email = $('#f-email')?.value.trim() || '';
      if (name)  sessionStorage.setItem('prefill_name', name);
      if (email) sessionStorage.setItem('prefill_email', email);

      // Redirection vers le bon formulaire
      const dest = STICKY_BUDGET_REDIRECT[budget];
      if (dest) {
        setTimeout(() => { window.location.href = dest; }, 200);
      }
    });
  });
}

/* ── Bottom sheet swipe-to-close ──────────────────────── */
export function initBottomSheetSwipe() {
  const menu = $('#mobile-menu');
  const ham = $('#hamburger');
  if (!menu || !matchMedia('(max-width: 768px)').matches) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  on(menu, 'touchstart', e => {
    // Seulement si on touche la zone du handle (top 40px)
    const rect = menu.getBoundingClientRect();
    const touchY = e.touches[0].clientY - rect.top;
    if (touchY > 50 && menu.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    menu.style.transition = 'none';
  }, { passive: true });

  on(menu, 'touchmove', e => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      menu.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  on(menu, 'touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    menu.style.transition = '';
    const diff = currentY - startY;

    if (diff > 80) {
      // Swipe down assez long → fermer
      menu.classList.remove('open');
      ham && ham.classList.remove('open');
      const overlay = document.querySelector('.mobile-menu-overlay');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
    menu.style.transform = '';
    startY = 0;
    currentY = 0;
  }, { passive: true });
}

export function initFloatingCTA() {
  const main = $('#fcta-main');
  const menu = $('#fcta-menu');
  if (!main || !menu) return;
  let open = false;
  on(main, 'click', () => {
    open = !open;
    menu.classList.toggle('open', open);
    main.style.transform = open ? 'scale(1.1) rotate(135deg)' : '';
  });
  on(document, 'click', e => {
    if (!e.target.closest('#floating-cta')) {
      open = false; menu.classList.remove('open'); main.style.transform = '';
    }
  });
}
