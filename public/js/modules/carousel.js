/* ── Les pastilles des carrousels ──
   Sur telephone, les avis et les realisations defilent horizontalement
   avec accroche (scroll-snap, CSS). Rien n'indiquait combien il y a de
   cartes ni ou l'on se trouve : on en voyait une, et il fallait deviner
   que le doigt en revelait d'autres. Une rangee de pastilles le dit, et
   sert aussi de raccourci : on tape, la carte vient.

   Construit en JS parce qu'il n'a de sens que la ou la piste defile
   reellement. Sur ordinateur, les cartes tiennent en grille et la rangee
   ne s'installe pas. Ce n'est pas du contenu indexable : rien de ce qui
   compte pour le referencement ne depend de ce module. */
import { on } from './utils.js';

const PISTES = [
  { piste: '.testimonials-grid', carte: '.testimonial-card', groupe: 'Avis clients',   unite: 'Avis' },
  { piste: '.show-grid',         carte: '.show-card',        groupe: 'Réalisations',   unite: 'Réalisation' },
];

export function initCarouselDots() {
  PISTES.forEach(equipe);
}

function equipe({ piste: selPiste, carte: selCarte, groupe, unite }) {
  const piste = document.querySelector(selPiste);
  if (!piste) return;

  const cartes = [...piste.querySelectorAll(selCarte)];
  if (cartes.length < 2) return;

  let rangee = null, pastilles = [], observateur = null, courant = -1;

  const defile = () => piste.scrollWidth > piste.clientWidth + 4;

  function monte() {
    if (rangee) return;
    rangee = document.createElement('div');
    rangee.className = 'car-dots';
    rangee.setAttribute('role', 'tablist');
    rangee.setAttribute('aria-label', groupe);

    pastilles = cartes.map((carte, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'car-dot';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `${unite} ${i + 1} sur ${cartes.length}`);
      on(b, 'click', () => {
        // scrollIntoView sur une piste horizontale emporte aussi la page
        // en vertical : on ne deplace que la piste.
        piste.scrollTo({ left: carte.offsetLeft - piste.offsetLeft, behavior: 'smooth' });
      });
      rangee.appendChild(b);
      return b;
    });

    piste.after(rangee);

    /* La carte la plus presente dans la piste gagne. Un observateur plutot
       qu'un calcul a chaque pixel de defilement : le doigt reste fluide. */
    observateur = new IntersectionObserver(entrees => {
      const gagnante = entrees
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!gagnante) return;
      allume(cartes.indexOf(gagnante.target));
    }, { root: piste, threshold: [0.25, 0.55, 0.85] });
    cartes.forEach(c => observateur.observe(c));

    allume(0);
  }

  function allume(i) {
    if (i < 0 || i === courant) return;
    courant = i;
    pastilles.forEach((p, j) => {
      const ici = j === i;
      p.classList.toggle('is-here', ici);
      p.setAttribute('aria-selected', ici ? 'true' : 'false');
    });
  }

  function demonte() {
    if (!rangee) return;
    observateur.disconnect();
    observateur = null;
    rangee.remove();
    rangee = null;
    pastilles = [];
    courant = -1;
  }

  /* Le passage portrait / paysage peut faire tenir toutes les cartes d'un
     coup : la rangee suit l'etat reel de la piste plutot qu'une largeur
     d'ecran devinee. */
  const ajuste = () => { if (defile()) monte(); else demonte(); };

  new ResizeObserver(ajuste).observe(piste);
  ajuste();
}
