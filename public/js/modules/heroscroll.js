/* ── Le passage du pre-accueil au telephone (mobile) ──
   Le premier ecran ne montre que la promesse : titre, phrase, bouton. Au
   defilement, une seule valeur --hp (0 a 1) est posee sur le hero : le CSS
   s'en sert pour elever et estomper le pre-accueil pendant que le telephone
   monte a sa rencontre. Un seul calcul par image, rien hors ecran.

   L'indice de defilement s'efface des le premier geste : il a fait son
   travail. Rien ne s'installe sur ordinateur ni en mouvement reduit. */
import { on } from './utils.js';

export function initHeroScroll() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  if (!matchMedia('(max-width: 900px)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const copy = hero.querySelector('.hero-copy');
  const indice = hero.querySelector('.hero-scroll');
  if (!copy) return;

  let visible = true, attendu = false;

  function place() {
    attendu = false;
    // 0 tant qu'on n'a pas bouge, 1 quand le pre-accueil est entierement
    // sorti : la course est la hauteur du pre-accueil lui-meme.
    const course = copy.offsetHeight || innerHeight;
    const p = Math.max(0, Math.min(1, (scrollY - hero.offsetTop) / course));
    hero.style.setProperty('--hp', p.toFixed(3));
    if (indice) indice.style.opacity = p > 0.04 ? '0' : '';
  }

  function demander() {
    if (attendu || !visible) return;
    attendu = true;
    requestAnimationFrame(place);
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) demander();
  }, { rootMargin: '100px' }).observe(hero);

  on(window, 'scroll', demander, { passive: true });
  on(window, 'resize', demander, { passive: true });
  place();
}
