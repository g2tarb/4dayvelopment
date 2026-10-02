/* ── Ecran d'entree : logo + phrase qui tourne autour ──
   Affiche seulement si js/boot.js a pose la classe has-intro (une fois par
   session, hors prefers-reduced-motion). Il se retire a 800 ms apres le
   debut de la navigation : c'est le plafond de la charte (section 12) pour
   une entree bloquante. */

const SHOW_MS = 800;   // plafond charte : jamais plus de 800 ms bloquees
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

  // On n'attend ni `window.load` (iframe du diaporama, images en lazy) ni les
  // polices : elles sont en preload dans le <head> et presque toujours pretes
  // avant 800 ms ; au pire le titre passe en fallback un instant (swap).
  // performance.now() part du debut de la navigation : c'est bien le temps
  // total vu par le visiteur, pas le temps depuis l'execution de ce module.
  setTimeout(close, Math.max(0, SHOW_MS - performance.now()));
}
