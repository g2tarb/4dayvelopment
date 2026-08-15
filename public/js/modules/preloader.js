/* ── Ecran d'entree : logo + phrase qui tourne autour ──
   Affiche seulement si js/boot.js a pose la classe has-intro (une fois par
   session, hors prefers-reduced-motion). Il se retire quand la page a fini
   de charger, avec un temps d'affichage minimum pour que l'animation ait le
   temps d'exister, et un plafond pour ne jamais retenir le visiteur. */

const MIN_MS = 1500;   // temps d'affichage minimum
const MAX_MS = 3200;   // filet de securite si `load` n'arrive jamais
const OUT_MS = 650;    // duree du fondu de sortie, alignee sur style.css

export function initPreloader() {
  const el = document.getElementById('preloader');
  const root = document.documentElement;
  if (!el) return;

  if (!root.classList.contains('has-intro')) {
    el.remove();
    root.classList.remove('is-loading');
    return;
  }

  let done = false;

  function close() {
    if (done) return;
    done = true;
    el.classList.add('is-out');
    root.classList.remove('is-loading');
    setTimeout(() => el.remove(), OUT_MS);
  }

  // On n'attend PAS `window.load` : il inclut l'iframe du diaporama et les
  // images en lazy, ce qui retenait le visiteur 3 s devant l'intro. Le contenu
  // critique est deja peint a ce stade ; il suffit d'attendre les polices,
  // sinon le titre s'affiche en fallback et saute une fois l'intro partie.
  const fonts = document.fonts
    ? Promise.race([document.fonts.ready, wait(700)])
    : Promise.resolve();

  fonts.then(() => {
    // performance.now() part du debut de la navigation : c'est bien le temps
    // total vu par le visiteur, pas le temps depuis l'execution de ce module.
    setTimeout(close, Math.max(0, MIN_MS - performance.now()));
  });

  setTimeout(close, MAX_MS);   // filet : une promesse qui ne resout jamais
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
