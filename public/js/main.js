/* ================================================================
   4DAYVELOPMENT — main.js
   Orchestrateur ES6 modules · Sans bundler
   ================================================================ */

import { initProgress, initNav, initSmoothScroll, initPageTransition, initBottomSheetSwipe } from './modules/navigation.js';
import { initCursor, initGlow, initMagnetic, initReveal } from './modules/animations.js';
import { initContactForm, initTypeChips, initExit } from './modules/form.js';
import { initLang } from './modules/i18n.js';
import { checkMotion, initFAQ } from './modules/ui.js';
import { initUniverse } from './modules/gl-bg.js';
import { initDemoViewer } from './modules/demos.js';
import { initPreloader } from './modules/preloader.js';
import { initBrowserReel } from './modules/reel.js';
import { initDuel } from './modules/duel.js';
import { initCarouselDots } from './modules/carousel.js';
import { initSplitTitles, initTilt, initVelocityMarquee, initCursorFlair } from './modules/motion.js';
import { initPunchline } from './modules/punchline.js';
import { initInertia } from './modules/inertia.js';
import { initAppBar } from './modules/appbar.js';
import { initNative } from './modules/native.js';

/* Active les etats animes (reveal) uniquement quand le JS tourne.
   Fallback no-JS : sans cette classe, le contenu .reveal reste visible. */
document.documentElement.classList.add('js-enabled');

/* ── Injection auto des elements globaux (pages secondaires) ── */
function injectGlobalElements() {
  // Page transition overlay
  if (!document.getElementById('page-transition')) {
    const pt = document.createElement('div');
    pt.id = 'page-transition';
    document.body.insertBefore(pt, document.body.firstChild);
  }


  // Mobile menu (si hamburger existe mais pas le menu)
  if (document.getElementById('hamburger') && !document.getElementById('mobile-menu')) {
    const nav = document.getElementById('navbar');
    const links = nav ? nav.querySelectorAll('.nav-links a') : [];
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.id = 'mobile-menu';
    let html = '<ul>';
    links.forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent;
      html += `<li><a href="${href}">${text}</a></li>`;
    });
    const ctaLink = nav ? nav.querySelector('.nav-cta') : null;
    if (ctaLink) {
      html += `<li><a href="${ctaLink.getAttribute('href')}" class="mobile-cta">${ctaLink.textContent}</a></li>`;
    }
    html += '</ul>';
    menu.innerHTML = html;
    document.body.appendChild(menu);
  }
}

async function init() {
  initPreloader();   // en premier : il pilote la sortie de l'écran d'entrée
  injectGlobalElements();

  // Priorité haute — bloquant le rendu si absent
  checkMotion();
  await initLang();       // async : applique la langue sauvegardée avant le premier paint
  initProgress();
  initPageTransition();
  initNav();
  initGlow();
  initSplitTitles();   // avant initReveal : les masques sont en place quand .visible tombe
  initReveal();
  initFAQ();
  initSmoothScroll();
  initInertia();
  initAppBar();
  initNative();
  initBottomSheetSwipe();
  initExit();
  initTypeChips();
  initContactForm();
  initDemoViewer();
  initBrowserReel();
  initDuel();
  initCarouselDots();
  initVelocityMarquee();
  initPunchline();

  // Deferred : n'impacte pas le LCP
  setTimeout(() => {
    initCursor();
    initCursorFlair();   // apres initCursor : la fleche vit dans son anneau
    initMagnetic();
    initTilt();
  }, 150);

  // Fond WebGL maison (zéro dépendance) : après le premier paint, hors LCP
  if ('requestIdleCallback' in window) {
    requestIdleCallback(initUniverse, { timeout: 800 });
  } else {
    setTimeout(initUniverse, 300);
  }

  console.log('%c4DAYVELOPMENT', 'color:#f2b13b;font-size:22px;font-weight:900;font-family:Syne,sans-serif;');
  console.log('%cMasterclass 2026 · Maximum Conversion', 'color:#DA5426;font-size:12px;');
}

// Les modules ES6 sont différés par défaut (équivalent defer)
// Le DOM est garanti prêt à l'exécution de ce top-level
init();
