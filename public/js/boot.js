/* ── Ecran d'entree : decide AVANT le premier paint ──
   Charge en <script src> synchrone dans le <head> : la CSP du site est
   `script-src 'self'`, aucun script inline ne s'execute, et il faut que la
   decision soit prise avant que la page ne soit peinte, sinon l'ecran
   d'entree apparaitrait par-dessus un site deja visible.

   Sans cette classe, #preloader reste `display: none` : pas de JS, pas
   d'ecran bloque. */
(function () {
  var d = document.documentElement;

  // Une seule fois par session : l'intro ne se rejoue pas a chaque page
  try {
    if (sessionStorage.getItem('4dv-intro') === 'done') return;
    sessionStorage.setItem('4dv-intro', 'done');
  } catch (e) {
    // navigation privee ou stockage refuse : on joue l'intro sans la memoriser
  }

  // Mouvement reduit demande : on entre directement sur le site
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) { /* matchMedia absent : on joue l'intro */ }

  // Langue de la phrase du cercle. L'intro est peinte bien avant que le module
  // i18n (async, il va chercher les locales) n'ait applique quoi que ce soit :
  // on lit donc directement le choix memorise, et le CSS bascule entre les deux
  // <text> deja presents dans le SVG.
  try {
    if (localStorage.getItem('lang') === 'en') d.classList.add('intro-en');
  } catch (e) { /* stockage refuse : on reste en francais */ }

  d.classList.add('has-intro', 'is-loading');
})();
