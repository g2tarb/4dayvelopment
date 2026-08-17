/* ── Defilement inertiel ──
   La molette ne saute plus : chaque cran alimente une cible, et la page
   glisse vers elle avec un amorti exponentiel, comme les sites primes.

   Uniquement a la molette sur pointeur precis : le tactile garde son
   inertie native (meilleure que tout ce qu'on ferait), le clavier et la
   barre de defilement restent natifs et resynchronisent la cible. Les
   zones interieures qui defilent (iframe du telephone, carrousels,
   textarea) gardent leur molette. Mouvement reduit : rien ne s'installe. */
import { on } from './utils.js';

const AMORTI = 0.105;   // part du chemin parcourue a chaque image

export function initInertia() {
  if (matchMedia('(hover: none), (pointer: coarse)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let cible = scrollY, position = scrollY;
  let raf = null, actif = false;

  const borne = v => Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, v));

  on(window, 'wheel', e => {
    if (e.ctrlKey) return;                                   // zoom navigateur
    if (e.defaultPrevented) return;
    // les zones qui defilent elles-memes gardent leur molette
    if (e.target.closest('iframe, textarea, select, .demo-screen')) return;
    const interne = e.target.closest('.testimonials-grid, .type-chips');
    if (interne && interne.scrollWidth > interne.clientWidth + 2) return;

    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    cible = borne(cible + delta);
    if (!actif) { actif = true; position = scrollY; raf = requestAnimationFrame(glisse); }
  }, { passive: false });

  function glisse() {
    raf = null;
    position += (cible - position) * AMORTI;
    if (Math.abs(cible - position) < 0.4) { position = cible; actif = false; }
    // instant : le scroll-behavior smooth du CSS ne doit pas re-amortir chaque pas
    window.scrollTo({ top: position, behavior: 'instant' });
    if (actif) raf = requestAnimationFrame(glisse);
  }

  // Defilement venu d'ailleurs (clavier, barre, ancres) : on suit sans lutter
  on(window, 'scroll', () => {
    if (!actif) { cible = scrollY; position = scrollY; }
  }, { passive: true });

  // Clic sur une ancre : on rend la main au defilement natif immediatement
  on(document, 'click', e => {
    if (!e.target.closest('a[href^="#"]')) return;
    cancelAnimationFrame(raf);
    raf = null;
    actif = false;
  }, { capture: true });
}
