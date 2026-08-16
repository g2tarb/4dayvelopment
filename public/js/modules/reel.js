/* ── Ruban d'apercus dans la fenetre de navigateur ──
   Pendant qu'on parcourt les etapes du processus, les sites livres defilent
   dans la fenetre, et l'adresse de la barre suit celui qui est affiche.

   La position est calculee a partir de la traversee de la section dans
   l'ecran, pas d'un compteur : le ruban suit le doigt ou la molette, dans
   les deux sens, et se retrouve toujours au bon endroit apres un saut de
   defilement ou un retour en arriere. */
import { on } from './utils.js';

/* Quand la fenetre traverse simplement l'ecran, le ruban ne bouge que sur
   la partie centrale : aux extremites elle est a moitie sortie et le
   changement ne se verrait pas. */
const DEBUT = 0.15;
const FIN   = 0.85;

export function initBrowserReel() {
  const reel = document.querySelector('[data-browser-reel]');
  if (!reel) return;

  const section = reel.closest('section');
  const view    = reel.parentElement;
  const visual  = reel.closest('.process-visual') || view;
  const urlEl   = document.querySelector('[data-browser-url]');
  const imgs    = [...reel.querySelectorAll('img')];
  if (!section || imgs.length < 2) return;

  // Mouvement reduit demande : le premier apercu reste en place
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let visible = false, attendu = false, dernier = -1;

  function place() {
    attendu = false;
    const p = avancement();

    /* Le pourcentage d'un translate se rapporte a la hauteur de l'element
       deplace, donc au ruban entier et non a une vignette : pour avancer
       d'une image sur N, il faut donc 100/N pour cent. */
    const pas = imgs.length - 1;
    const course = (pas / imgs.length) * 100;
    reel.style.transform = `translate3d(0, ${(-p * course).toFixed(3)}%, 0)`;

    // L'adresse suit l'apercu le plus present dans le cadre
    const i = Math.min(pas, Math.round(p * pas));
    if (i !== dernier && urlEl) {
      dernier = i;
      const url = imgs[i].dataset.url;
      if (url) urlEl.textContent = url;
    }
  }

  /* Deux situations, deux reperes :
     - sur grand ecran la fenetre est collee pendant qu'on parcourt les
       etapes. La course est donc celle du collage, du moment ou la fenetre
       s'accroche jusqu'a celui ou la section la relache. Se caler sur la
       traversee de l'ecran la ferait terminer bien avant la derniere etape ;
     - sinon la fenetre defile avec la page, et c'est sa propre traversee de
       l'ecran qui commande. */
  function avancement() {
    const r = section.getBoundingClientRect();

    if (colle) {
      const utile = r.height - visualH - hautColle;
      if (utile > 0) return borne((hautColle - r.top) / utile);
    }

    const rv = view.getBoundingClientRect();
    const traversee = innerHeight + rv.height;
    if (traversee <= 0) return 0;
    const brut = (innerHeight - rv.top) / traversee;
    return borne((brut - DEBUT) / (FIN - DEBUT));
  }

  /* Le collage depend d'une media query : on relit ces reperes au
     redimensionnement plutot qu'a chaque image. */
  let colle = false, visualH = 0, hautColle = 0;
  function mesurer() {
    const cs = getComputedStyle(visual);
    colle = cs.position === 'sticky';
    visualH = visual.getBoundingClientRect().height;
    hautColle = parseFloat(cs.top) || 0;
  }

  /* Un seul calcul par image ecran : le defilement reste fluide meme si
     l'evenement part des dizaines de fois entre deux rendus. */
  function demander() {
    if (attendu || !visible) return;
    attendu = true;
    requestAnimationFrame(place);
  }

  /* Les apercus suivants attendent sous le cadre : le chargement paresseux
     du navigateur ne les verrait jamais venir, ils resteraient noirs au
     moment de passer. On les charge donc quand la section approche. */
  function charger() {
    imgs.forEach(img => {
      const src = img.dataset.src;
      if (!src) return;
      img.src = src;
      delete img.dataset.src;
    });
  }

  // Hors ecran, rien a calculer
  new IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting);
    if (visible) { charger(); demander(); }
  }, { rootMargin: '400px' }).observe(view);

  on(window, 'scroll', demander, { passive: true });
  on(window, 'resize', () => { mesurer(); demander(); }, { passive: true });

  mesurer();
  place();
}

function borne(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
