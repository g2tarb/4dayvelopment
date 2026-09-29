/* Berthier Énergies (démo 4dayvelopment) : menu mobile, barre d'appel, devis en 4 étapes.
   Le simulateur MaPrimeRénov' est en CSS seul (:has). Aucun envoi réseau : c'est une démonstration. */
(() => {
  'use strict';
  const NNBSP = '\u202F', NBSP = '\u00A0'; // espace fine insécable, espace insécable

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
     Elle se range (et devient inerte) quand le devis occupe l'écran : elle
     doublerait son bouton et masquerait ses champs. On ignore le quart bas de
     l'écran pour qu'elle reste visible tant que le devis ne fait qu'apparaître. */
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
  const surface = document.getElementById('surface');
  const surfaceVal = document.getElementById('surface-val');
  const TOTAL = 4;
  let courante = 1;

  const m2 = (v) => (Number(v) >= 300 ? `300${NBSP}m² et plus` : `${v}${NBSP}m²`);
  surface.addEventListener('input', () => { surfaceVal.textContent = m2(surface.value); });

  const valeur = (nom) => form.querySelector(`input[name="${nom}"]:checked`)?.value || '';

  const erreurEtape = (n, msg) => {
    const p = document.getElementById(`err-${n}`);
    if (p) p.textContent = msg;
  };
  const erreurChamp = (id, msg) => {
    const input = document.getElementById(id);
    document.getElementById(`${id}-err`).textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  const valider = (n) => {
    if (n === 1 && !valeur('logement')) { erreurEtape(1, 'Choisissez le type de logement pour continuer.'); return false; }
    if (n === 2 && !valeur('chauffage')) { erreurEtape(2, 'Indiquez votre chauffage actuel pour continuer.'); return false; }
    if (n === 3 && !valeur('delai')) { erreurEtape(3, 'Choisissez quand vous souhaitez démarrer pour continuer.'); return false; }
    if (n === 4) {
      const nom = form.nom.value.trim();
      const tel = form.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0');
      const cp = form.cp.value.trim();
      const ok = [
        erreurChamp('nom', nom.length >= 2 ? '' : 'Indiquez votre nom.'),
        erreurChamp('tel', /^0[1-9]\d{8}$/.test(tel) ? '' : 'Indiquez un numéro à 10 chiffres, par exemple 06 12 34 56 78.'),
        erreurChamp('cp', /^\d{5}$/.test(cp) ? '' : 'Indiquez un code postal à 5 chiffres, par exemple 37300.'),
      ];
      const premier = ['nom', 'tel', 'cp'][ok.indexOf(false)];
      if (premier) { document.getElementById(premier).focus(); return false; }
    }
    erreurEtape(n, '');
    return true;
  };

  const telLisible = () => form.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0').replace(/(\d{2})(?=\d)/g, `$1${NBSP}`);

  const remplirRecap = () => {
    const lignes = [
      ['Logement', valeur('logement'), 1],
      ['Chauffage actuel', valeur('chauffage'), 2],
      ['Surface chauffée', m2(surface.value), 3],
      ['Démarrage', valeur('delai'), 3],
      ['Coordonnées', `${form.nom.value.trim()}, ${telLisible()}, ${form.cp.value.trim()}`, 4],
    ];
    const dl = document.getElementById('recap');
    dl.replaceChildren(...lignes.map(([dt, dd, etape]) => {
      const div = document.createElement('div');
      const t = document.createElement('dt'); t.textContent = dt;
      const d = document.createElement('dd'); d.textContent = dd;
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
    const part = Math.min(n, TOTAL) / TOTAL;
    barre.style.transform = `scaleX(${n > TOTAL ? 1 : part})`;
    libelle.textContent = n <= TOTAL ? `Étape ${n} sur ${TOTAL}` : n === 5 ? 'Récapitulatif' : 'Demande envoyée';
    retour.hidden = n === 1 || n === 6;
    suivant.hidden = n === 6;
    suivant.textContent = n === 4 ? 'Voir le récapitulatif' : n === 5 ? 'Envoyer ma demande' : 'Continuer';
    if (n === 5) remplirRecap();
    if (n === 6) {
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
  form.addEventListener('change', (e) => {
    if (e.target.type === 'radio') erreurEtape(courante, '');
  });
  form.addEventListener('input', (e) => {
    if (['nom', 'tel', 'cp'].includes(e.target.id) && e.target.getAttribute('aria-invalid') === 'true') erreurChamp(e.target.id, '');
  });

  afficher(1, false);
})();
