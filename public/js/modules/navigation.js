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
  /* L'element existe deja statiquement sur certaines pages, et main.js en
     injecte un autre : on en creait un troisieme, donc trois elements pour
     un meme identifiant. On reprend celui qui est la, sinon on le cree. */
  let bar = document.getElementById('scroll-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.prepend(bar);
  }
  /* La barre est pilotee en CSS par animation-timeline: scroll(), sur le
     compositeur. Ce qui suit n'est que le repli des navigateurs qui ne la
     connaissent pas encore. */
  if (CSS.supports('animation-timeline: scroll()')) return;

  /* Une image au maximum : ces deux ecouteurs ecrivaient des styles a chaque
     evenement de defilement, plusieurs dizaines de fois entre deux rendus. */
  let attenduP = false;
  on(window, 'scroll', () => {
    if (attenduP) return;
    attenduP = true;
    requestAnimationFrame(() => {
      attenduP = false;
      const pct = window.scrollY / (document.body.scrollHeight - innerHeight) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    });
  }, { passive: true });
}

export function initNav() {
  const nav = $('#navbar');
  if (!nav) return;
  // la transition est posee une fois, pas a chaque image
  nav.style.transition = 'transform .4s cubic-bezier(0.4,0,0.2,1)';
  let lastY = 0, attenduN = false;
  on(window, 'scroll', () => {
    if (attenduN) return;
    attenduN = true;
    requestAnimationFrame(() => {
      attenduN = false;
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 60);
      if (y > 350) {
        nav.style.transform = y > lastY + 5 ? 'translateY(-110%)' : 'translateY(0)';
      } else {
        nav.style.transform = 'translateY(0)';
      }
      lastY = y;
    });
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

  /* Le bouton rebondit toutes les six secondes. L'ecouteur etait pose a
     chaque battement : sous 480 px le bouton est en display none, son
     animation ne joue donc jamais, animationend ne se declenche pas, et
     chaque ecouteur {once} restait attache a vie — dix par minute, sans
     plafond. Un seul ecouteur pose une fois, et un minuteur qui ne demarre
     pas si le bouton n'est pas affiche. */
  const cta = $('.nav-cta');
  if (cta) {
    on(cta, 'animationend', () => cta.classList.remove('bounce'));
    const battement = setInterval(() => {
      if (!cta.isConnected) return clearInterval(battement);
      if (!cta.offsetParent) return;          // masque : rien a animer
      cta.classList.add('bounce');
    }, 6000);
  }
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

