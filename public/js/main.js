/* ================================================================
   4DAYVELOPMENT — main.js
   Orchestrateur ES6 modules · Sans bundler
   ================================================================ */

import { initProgress, initNav, initPageTransition, initBottomSheetSwipe } from './modules/navigation.js';
import { initCursor, initMagnetic, initReveal } from './modules/animations.js';
import { initLang } from './modules/i18n.js';
import { checkMotion, initFAQ } from './modules/ui.js';
import { initPreloader } from './modules/preloader.js';
import { initSplitTitles, initTilt, initVelocityMarquee, initCursorFlair } from './modules/motion.js';

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
      const current = a.getAttribute('aria-current') ? ' aria-current="page"' : '';
      html += `<li><a href="${href}"${current}>${text}</a></li>`;
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
  // Pages métier : pas de curseur remplacé (décor hérité)
  const sobre = document.body.classList.contains('lp');
  initSplitTitles();   // avant initReveal : les masques sont en place quand .visible tombe
  initReveal();
  initFAQ();
  initBottomSheetSwipe();
  initVelocityMarquee();

  // Deferred : n'impacte pas le LCP
  setTimeout(() => {
    if (!sobre) {
      initCursor();
      initCursorFlair();   // apres initCursor : la fleche vit dans son anneau
    }
    initMagnetic();
    initTilt();
  }, 150);

  /* Effets, démos et bas de page : chargés après l'événement load, au premier
     temps mort. Ils ne font plus partie du premier écran (la charte en vise
     moins de 25 requêtes) et ne rivalisent plus avec le CSS et les polices
     sur le chemin du LCP. Sans eux, rien ne manque au premier affichage :
     les prix restent lisibles en texte simple (repli sans JS) jusqu'aux
     rouleaux, la démo du téléphone montre son écran d'attente. */
  const apresChargement = fn => {
    const go = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  };
  apresChargement(() => {
    // premier écran : démo du téléphone (son écran d'attente est déjà là),
    // effet de la punchline, défilement amorti, barre d'onglets mobile
    import('./modules/demos.js').then(m => m.initDemoViewer());
    import('./modules/phone.js').then(m => m.initPhoneFrames());
    import('./modules/punchline.js').then(m => m.initPunchline());
    import('./modules/inertia.js').then(m => m.initInertia());
    import('./modules/appbar.js').then(m => m.initAppBar()).then(() => import('./modules/native.js')).then(m => m.initNative());
    import('./modules/form.js').then(m => { m.initExit(); m.initTypeChips(); m.initContactForm(); });
    import('./modules/reel.js').then(m => m.initBrowserReel());
    import('./modules/duel.js').then(m => m.initDuel());
    import('./modules/carousel.js').then(m => m.initCarouselDots());
    import('./modules/gl-bg.js').then(m => m.initUniverse());   // fond WebGL maison, hors LCP
  });

  console.log('%c4DAYVELOPMENT', 'color:#f2b13b;font-size:22px;font-weight:900;font-family:Syne,sans-serif;');
  console.log('%cMasterclass 2026 · Maximum Conversion', 'color:#DA5426;font-size:12px;');
}

// Les modules ES6 sont différés par défaut (équivalent defer)
// Le DOM est garanti prêt à l'exécution de ce top-level
init();
