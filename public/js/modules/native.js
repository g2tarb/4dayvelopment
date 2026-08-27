/* ── Ce qui fait qu'un site se comporte comme une application ──
   Quatre choses, toutes optionnelles, toutes coupees sur ordinateur ou en
   mouvement reduit :

   1. les changements de page se fondent au lieu de clignoter (transitions
      de vue natives du navigateur, sans reecrire la navigation) ;
   2. la barre d'onglets sait ou l'on se trouve et allume l'onglet courant ;
   3. les cartes arrivent avec de la profondeur (en CSS, sur le mouvement
      de revelation qui existe deja) ;
   4. les details qui trahissent le site web : rebond de fin de page,
      surbrillance bleue au toucher, selection accidentelle du texte. */
import { $ } from './utils.js';

export function initNative() {
  if (!matchMedia('(max-width: 900px)').matches) return;
  ongletActif();
  carrouselsEntiers();
}

/* ── Les carrousels se revelent d'un bloc ────────────────────
   Dans une rangee qui defile horizontalement, seules les cartes visibles a
   l'ecran entrent dans le champ : les suivantes restent invisibles jusqu'a
   ce qu'on balaie, et l'on decouvre alors une carte vide qui s'anime sous
   le doigt. Des que la rangee est a l'ecran, on revele tout son contenu. */
function carrouselsEntiers() {
  if (!('IntersectionObserver' in window)) return;
  const rangees = [...document.querySelectorAll('.testimonials-grid, .pricing-grid, .show-grid')];
  if (!rangees.length) return;

  const io = new IntersectionObserver(entrees => {
    entrees.forEach(e => {
      if (!e.isIntersecting) return;
      [...e.target.querySelectorAll('.reveal:not(.visible)')].forEach((c, i) => {
        c.style.transitionDelay = (i * 70) + 'ms';
        c.classList.add('visible');
      });
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

  rangees.forEach(r => io.observe(r));
}

/* ── 1. Changement de page en fondu ──────────────────────────
   Rien a faire ici : les transitions entre documents se declarent
   uniquement en CSS, par @view-transition. L'API startViewTransition ne
   sert qu'aux changements a l'interieur d'une meme page, et l'appeler
   avant location.href n'aurait fait que retarder la navigation. */

/* ── 2. L'onglet courant s'allume ────────────────────────────
   Une barre d'onglets qui ne dit pas ou l'on est n'est qu'une rangee de
   boutons. On observe les sections cibles et on allume l'onglet
   correspondant a celle qui occupe le milieu de l'ecran. */
function ongletActif() {
  const barre = $('#appbar');
  if (!barre) return;

  /* La pilule : un seul indicateur qui glisse d'un onglet a l'autre,
     au lieu d'un fond qui apparait et disparait. Elle est mesuree sur
     l'onglet gagnant et deplacee en transform : tout vit sur le
     compositeur. Le premier placement se fait sans transition, sinon
     elle traverserait la barre au chargement. */
  const pilule = document.createElement('span');
  pilule.className = 'appbar-pill';
  pilule.setAttribute('aria-hidden', 'true');
  barre.prepend(pilule);

  function placer(a) {
    if (!a || !a.classList.contains('appbar-item')) {
      pilule.classList.remove('is-visible');
      return;
    }
    pilule.style.transform = `translateX(${a.offsetLeft}px)`;
    pilule.style.width = a.offsetWidth + 'px';
    if (!pilule.classList.contains('is-visible')) {
      // position posee AVANT d'activer la transition : pas de traversee
      requestAnimationFrame(() => pilule.classList.add('is-visible'));
    }
  }

  const liens = [...barre.querySelectorAll('a[href^="#"]')];
  const cibles = liens
    .map(a => ({ a, section: document.querySelector(a.getAttribute('href')) }))
    .filter(x => x.section);
  if (!cibles.length) return;

  let courant = null;
  const io = new IntersectionObserver(entrees => {
    // celle qui occupe le plus de place au milieu de l'ecran gagne
    const visible = entrees
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const gagnant = cibles.find(c => c.section === visible.target);
    if (!gagnant || gagnant.a === courant) return;
    cibles.forEach(c => c.a.classList.toggle('is-here', c === gagnant));
    courant = gagnant.a;
    placer(courant);
  }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5] });

  cibles.forEach(c => io.observe(c.section));

  // rotation d'ecran ou barre redimensionnee : la pilule se recale
  new ResizeObserver(() => placer(courant)).observe(barre);
}

/* ── 3. La profondeur des cartes ─────────────────────────────
   Rien en JS non plus : les cartes portent deja .reveal, gere par
   animations.js, avec son propre decalage en cascade. Superposer un second
   observateur qui pilote aussi l'opacite les aurait mises en concurrence,
   avec le risque qu'une carte reste invisible si l'un se declenche sans
   l'autre. La profondeur est donc ajoutee au mouvement existant, en CSS. */
