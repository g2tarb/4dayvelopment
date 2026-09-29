/* Kerleau Rénovation (démo 4dayvelopment) : menu mobile, barre d'appel, devis en 5 étapes.
   Le tri de la visite (plan, durée, délai du devis) est en CSS seul (:has) ; ce script recopie
   ses deux choix dans la carte de devis. Aucun envoi réseau : c'est une démonstration. */
(() => {
  'use strict';
  const NNBSP = ' ', NBSP = ' '; // espace fine insécable, espace insécable

  /* ---------- Menu mobile ---------- */
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  const ouvrirMenu = (ouvert) => {
    burger.setAttribute('aria-expanded', String(ouvert));
    burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.classList.toggle('ouvert', ouvert);
  };
  burger.addEventListener('click', () => ouvrirMenu(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) ouvrirMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { ouvrirMenu(false); burger.focus(); }
  });
  matchMedia('(min-width: 75rem)').addEventListener('change', (m) => { if (m.matches) ouvrirMenu(false); });

  /* ---------- Barre d'appel sous le pouce ----------
     Rangée (et inerte) quand le devis occupe l'écran : elle doublerait son bouton et
     masquerait ses champs. Le quart bas de l'écran est ignoré pour qu'elle reste
     visible tant que le devis ne fait qu'apparaître. */
  const pouce = document.querySelector('.pouce');
  const devis = document.getElementById('devis');
  if (pouce && devis && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      pouce.classList.toggle('range', e.isIntersecting);
      pouce.inert = e.isIntersecting;
    }, { rootMargin: '0px 0px -25% 0px' }).observe(devis);
  }

  /* ---------- Devis en plusieurs étapes ---------- */
  const form = document.getElementById('devis-form');
  const etapes = [...form.querySelectorAll('.etape')];
  const barre = document.getElementById('devis-barre');
  const libelle = document.getElementById('devis-etape');
  const retour = document.getElementById('devis-retour');
  const suivant = document.getElementById('devis-suivant');
  const TOTAL = 5, RECAP = 6, FINI = 7;
  const CHOIX = { 1: ['travaux', 'Choisissez les travaux à faire pour continuer.'],
    2: ['surface', 'Choisissez la surface de l’appartement pour continuer.'],
    3: ['delai', 'Indiquez quand vous aimeriez commencer pour continuer.'],
    4: ['budget', `Choisissez un budget, ou «${NNBSP}Je ne sais pas encore${NNBSP}», pour continuer.`] };
  let courante = 1;

  const valeur = (nom) => form.querySelector(`input[name="${nom}"]:checked`)?.value || '';
  const telNet = () => form.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0');
  const telLisible = () => telNet().replace(/(\d{2})(?=\d)/g, `$1${NBSP}`);

  const erreurEtape = (n, msg) => {
    const p = document.getElementById(`err-${n}`);
    if (p) p.textContent = msg;
  };
  const erreurChamp = (id, msg) => {
    document.getElementById(`${id}-err`).textContent = msg;
    document.getElementById(id).setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  const valider = (n) => {
    if (CHOIX[n] && !valeur(CHOIX[n][0])) { erreurEtape(n, CHOIX[n][1]); return false; }
    if (n === 5) {
      const ok = [
        erreurChamp('nom', form.nom.value.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
        erreurChamp('tel', /^0[1-9]\d{8}$/.test(telNet()) ? '' : 'Indiquez un numéro à 10 chiffres, par exemple 06 12 34 56 78.'),
        erreurChamp('lieu', form.lieu.value.trim().length >= 2 ? '' : 'Indiquez l’arrondissement ou la commune, par exemple Paris 11e.'),
      ];
      const premier = ['nom', 'tel', 'lieu'][ok.indexOf(false)];
      if (premier) { document.getElementById(premier).focus(); return false; }
    }
    erreurEtape(n, '');
    return true;
  };

  const remplirRecap = () => {
    const lignes = [
      ['Travaux', valeur('travaux'), 1],
      ['Surface', valeur('surface'), 2],
      ['Début souhaité', valeur('delai'), 3],
      ['Budget', valeur('budget'), 4],
      ['Coordonnées', `${form.nom.value.trim()}, ${telLisible()}, ${form.lieu.value.trim()}`, 5],
    ];
    document.getElementById('recap').replaceChildren(...lignes.map(([dt, dd, etape]) => {
      const div = document.createElement('div');
      const t = document.createElement('dt'); t.textContent = dt;
      const d = document.createElement('dd'); d.textContent = dd.replace(/ (€|m²)/g, `${NBSP}$1`);
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = 'Modifier'; b.dataset.aller = etape;
      b.setAttribute('aria-label', `Modifier${NNBSP}: ${dt}`);
      div.append(t, d, b);
      return div;
    }));
  };

  const afficher = (n, focus = true) => {
    courante = n;
    etapes.forEach((e) => { e.hidden = Number(e.dataset.etape) !== n; });
    barre.style.transform = `scaleX(${Math.min(n, TOTAL) / TOTAL})`;
    libelle.textContent = n <= TOTAL ? `Étape ${n} sur ${TOTAL}` : n === RECAP ? 'Récapitulatif' : 'Demande envoyée';
    retour.hidden = n === 1 || n === FINI;
    suivant.textContent = n === TOTAL ? 'Voir le récapitulatif' : n === RECAP ? 'Envoyer ma demande' : 'Continuer';
    if (n === RECAP) remplirRecap();
    if (n === FINI) {
      document.getElementById('fini-tel').textContent = telLisible();
      form.querySelector('.devis-nav').hidden = true;
    }
    if (focus) etapes[n - 1].querySelector('legend, .titre-etape').focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (courante <= TOTAL && !valider(courante)) return;
    afficher(courante + 1);
  });
  retour.addEventListener('click', () => afficher(courante - 1));
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-aller]');
    if (b) afficher(Number(b.dataset.aller));
  });
  /* une réponse choisie efface le message d'erreur de l'étape */
  form.addEventListener('change', (e) => { if (e.target.type === 'radio') erreurEtape(courante, ''); });
  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true') erreurChamp(e.target.id, '');
  });

  /* ---------- Du tri de la visite vers le devis ----------
     Les deux choix du plan sont recopiés dans la carte ; on ouvre la première
     question encore sans réponse (l'étape en cours si la demande est déjà envoyée). */
  document.getElementById('tri-suite').addEventListener('click', () => {
    if (courante === FINI) return;
    [['tri-travaux', 'travaux'], ['tri-surface', 'surface']].forEach(([de, vers]) => {
      const v = document.querySelector(`input[name="${de}"]:checked`)?.value;
      const cible = v && [...form.querySelectorAll(`input[name="${vers}"]`)].find((i) => i.value === v);
      if (cible) cible.checked = true;
    });
    const manque = [1, 2, 3, 4].find((n) => !valeur(CHOIX[n][0]));
    afficher(manque || TOTAL, false);
    // le focus suit l'ancre une fois le défilement lancé
    requestAnimationFrame(() => etapes[courante - 1].querySelector('legend, .titre-etape').focus({ preventScroll: true }));
  });

  afficher(1, false);
})();
