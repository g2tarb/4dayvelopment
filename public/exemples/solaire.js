/* Cabanel Solaire (démo 4dayvelopment) : menu mobile, barre d'appel, étude de toiture en 4 étapes.
   Les démarches s'ouvrent en <details> natif, sans script. Aucun envoi réseau : c'est une démonstration. */
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
     Elle se range (et devient inerte) quand l'étude occupe l'écran : elle doublerait
     son bouton et masquerait ses champs. Le quart bas de l'écran est ignoré pour
     qu'elle reste visible tant que l'étude ne fait qu'apparaître. */
  const pouce = document.querySelector('.pouce');
  const etude = document.getElementById('etude');
  if (pouce && etude && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      pouce.classList.toggle('range', e.isIntersecting);
      pouce.inert = e.isIntersecting;
    }, { rootMargin: '0px 0px -25% 0px' }).observe(etude);
  }

  /* ---------- Étude de toiture en plusieurs étapes ---------- */
  const form = document.getElementById('etude-form');
  const etapes = [...form.querySelectorAll('.etape')];
  const segments = [...form.querySelectorAll('.progression-barre span')];
  const libelle = document.getElementById('etude-etape');
  const retour = document.getElementById('etude-retour');
  const suivant = document.getElementById('etude-suivant');
  const conso = document.getElementById('conso');
  const consoVal = document.getElementById('conso-val');
  const consoInconnue = document.getElementById('conso-inconnue');
  const TOTAL = 4;
  let courante = 1;

  const milliers = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  const kwhAn = () => {
    const v = Number(conso.value);
    return v >= 15000 ? `15${NNBSP}000${NBSP}kWh et plus` : `${milliers(v)}${NBSP}kWh`;
  };
  const majConso = () => {
    conso.disabled = consoInconnue.checked;
    consoVal.textContent = consoInconnue.checked ? 'À relever' : kwhAn();
  };
  conso.addEventListener('input', majConso);
  consoInconnue.addEventListener('change', majConso);

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

  const telNu = () => form.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0');

  const valider = (n) => {
    if (n === 1 && !valeur('couverture')) { erreurEtape(1, 'Choisissez la couverture de votre toit pour continuer.'); return false; }
    if (n === 2 && !valeur('orientation')) { erreurEtape(2, `Choisissez une orientation pour continuer, ou «${NNBSP}Je ne sais pas${NNBSP}».`); return false; }
    if (n === 3 && !valeur('journee')) { erreurEtape(3, 'Dites-nous si vous êtes chez vous en journée pour continuer.'); return false; }
    if (n === 4) {
      const ok = [
        erreurChamp('nom', form.nom.value.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
        erreurChamp('tel', /^0[1-9]\d{8}$/.test(telNu()) ? '' : 'Indiquez un numéro à 10 chiffres, par exemple 06 12 34 56 78.'),
        erreurChamp('commune', form.commune.value.trim().length >= 2 ? '' : 'Indiquez votre commune, par exemple Sérignan.'),
      ];
      const premier = ['nom', 'tel', 'commune'][ok.indexOf(false)];
      if (premier) { document.getElementById(premier).focus(); return false; }
    }
    erreurEtape(n, '');
    return true;
  };

  const telLisible = () => telNu().replace(/(\d{2})(?=\d)/g, `$1${NBSP}`);

  const remplirRecap = () => {
    const lignes = [
      ['Couverture', valeur('couverture'), 1],
      ['Orientation', valeur('orientation'), 2],
      ['Consommation', consoInconnue.checked ? 'À relever ensemble pendant la visite' : `${kwhAn()} par an`, 3],
      ['En journée', valeur('journee'), 3],
      ['Coordonnées', `${form.nom.value.trim()}, ${telLisible()}, ${form.commune.value.trim()}`, 4],
    ];
    document.getElementById('recap').replaceChildren(...lignes.map(([dt, dd, etape]) => {
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
    segments.forEach((s, i) => s.classList.toggle('fait', i < n));
    libelle.textContent = n <= TOTAL ? `Étape ${n} sur ${TOTAL}` : n === 5 ? 'Récapitulatif' : 'Demande envoyée';
    retour.hidden = n === 1 || n === 6;
    suivant.hidden = n === 6;
    suivant.textContent = n === 4 ? 'Voir le récapitulatif' : n === 5 ? 'Envoyer ma demande' : 'Continuer';
    if (n === 5) remplirRecap();
    if (n === 6) {
      document.getElementById('fini-tel').textContent = telLisible();
      form.querySelector('.etude-nav').hidden = true;
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
    if (['nom', 'tel', 'commune'].includes(e.target.id) && e.target.getAttribute('aria-invalid') === 'true') erreurChamp(e.target.id, '');
  });

  majConso();
  afficher(1, false);
})();
