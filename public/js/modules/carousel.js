/* ── La navigation des carrousels ──
   Sur telephone, les avis et les realisations defilent horizontalement
   avec accroche (scroll-snap, CSS). Rien n'indiquait combien il y a de
   cartes ni ou l'on se trouve : on en voyait une, et il fallait deviner
   que le doigt en revelait d'autres. Une rangee de pastilles le dit, et
   deux boutons de 44 px (precedent, suivant) servent de raccourci, au
   doigt comme au clavier. Les pastilles ne sont plus des boutons : huit
   cibles de 44 px ne tiennent pas sur un telephone de 320 px.

   Construit en JS parce qu'il n'a de sens que la ou la piste defile
   reellement. Sur ordinateur, les cartes tiennent en grille et la rangee
   ne s'installe pas. Ce n'est pas du contenu indexable : rien de ce qui
   compte pour le referencement ne depend de ce module. */
import { on } from './utils.js';

const PISTES = [
  { piste: '.testimonials-grid', carte: '.testimonial-card', groupe: 'Avis clients', unite: 'Avis',        prec: 'Avis précédent',         suiv: 'Avis suivant' },
  { piste: '.show-grid',         carte: '.show-card',        groupe: 'Réalisations', unite: 'Réalisation', prec: 'Réalisation précédente', suiv: 'Réalisation suivante' },
];

export function initCarouselDots() {
  PISTES.forEach(equipe);
}

function equipe({ piste: selPiste, carte: selCarte, groupe, unite, prec: libPrec, suiv: libSuiv }) {
  const piste = document.querySelector(selPiste);
  if (!piste) return;

  const cartes = [...piste.querySelectorAll(selCarte)];
  if (cartes.length < 2) return;

  let rangee = null, pastilles = [], observateur = null, courant = -1, prec = null, suiv = null, statut = null;

  const position = i => `${unite} ${i + 1} sur ${cartes.length}`;

  function va(i) {
    if (i < 0 || i >= cartes.length) return;
    // scrollIntoView sur une piste horizontale emporte aussi la page
    // en vertical : on ne deplace que la piste.
    piste.scrollTo({ left: cartes[i].offsetLeft - piste.offsetLeft, behavior: 'smooth' });
  }

  function bouton(sens, libelle, trace) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'car-step';
    b.setAttribute('aria-label', libelle);
    b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${trace}"/></svg>`;
    on(b, 'click', () => va(courant + sens));
    return b;
  }

  const defile = () => piste.scrollWidth > piste.clientWidth + 4;

  function monte() {
    if (rangee) return;
    rangee = document.createElement('div');
    rangee.className = 'car-nav';
    rangee.setAttribute('role', 'group');
    rangee.setAttribute('aria-label', groupe);

    prec = bouton(-1, libPrec, 'M15 18l-6-6 6-6');
    suiv = bouton(1, libSuiv, 'M9 18l6-6-6-6');
    const points = document.createElement('div');
    points.className = 'car-dots';
    points.setAttribute('aria-hidden', 'true');
    pastilles = cartes.map(() => {
      const p = document.createElement('span');
      p.className = 'car-dot';
      return points.appendChild(p);
    });
    // position lue par les lecteurs d'ecran quand elle change ; posee avant
    // l'insertion pour ne pas etre annoncee au chargement
    statut = document.createElement('span');
    statut.className = 'sr-only';
    statut.setAttribute('aria-live', 'polite');
    statut.textContent = position(0);
    rangee.append(prec, points, suiv, statut);
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
    pastilles.forEach((p, j) => p.classList.toggle('is-here', j === i));
    // aria-disabled plutot que disabled : le focus clavier reste sur le bouton
    prec.setAttribute('aria-disabled', i === 0 ? 'true' : 'false');
    suiv.setAttribute('aria-disabled', i === cartes.length - 1 ? 'true' : 'false');
    statut.textContent = position(i);
  }

  function demonte() {
    if (!rangee) return;
    observateur.disconnect();
    observateur = null;
    rangee.remove();
    rangee = null;
    pastilles = [];
    prec = suiv = statut = null;
    courant = -1;
  }

  /* Le passage portrait / paysage peut faire tenir toutes les cartes d'un
     coup : la rangee suit l'etat reel de la piste plutot qu'une largeur
     d'ecran devinee. */
  const ajuste = () => { if (defile()) monte(); else demonte(); };

  new ResizeObserver(ajuste).observe(piste);
  ajuste();
}
