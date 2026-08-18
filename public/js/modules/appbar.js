/* ── Barre d'action mobile ──
   Une barre d'onglets facon application, ancree en bas de l'ecran. Elle
   n'existe que sur mobile, apparait une fois le hero passe et se replie
   quand on remonte vers le haut : le premier ecran reste une affiche
   pleine page, sans rien qui la recouvre.

   L'element est `hidden` dans le HTML et n'est revele qu'ici : sans JS,
   ou sur ordinateur, il n'y a pas de barre du tout. */
import { on } from './utils.js';

export function initAppBar() {
  const bar = document.getElementById('appbar');
  const hero = document.getElementById('hero');
  if (!bar || !hero) return;
  if (!matchMedia('(max-width: 900px)').matches) return;

  bar.hidden = false;
  document.body.classList.add('has-appbar');

  // Visible des que le hero est derriere nous
  new IntersectionObserver(([e]) => {
    bar.classList.toggle('is-on', !e.isIntersecting);
  }, { threshold: 0, rootMargin: '-70% 0px 0px 0px' }).observe(hero);

  /* Elle s'efface quand on remonte : le geste de retour vers le haut est
     une lecture, pas une navigation. */
  let dernier = scrollY, attendu = false;
  on(window, 'scroll', () => {
    if (attendu) return;
    attendu = true;
    requestAnimationFrame(() => {
      attendu = false;
      const y = scrollY;
      if (Math.abs(y - dernier) > 6) {
        bar.classList.toggle('is-up', y < dernier && y > 200);
        dernier = y;
      }
    });
  }, { passive: true });

  // Retour haptique la ou le materiel le permet
  on(bar, 'click', e => {
    if (!e.target.closest('a')) return;
    if (navigator.vibrate) navigator.vibrate(8);
  });
}
