/* Deûle Électricité (démo 4dayvelopment) : menu mobile, barre d'appel, demande de visite en 4 étapes.
   Le choix de la puissance (rail DIN) est en CSS seul (:has) ; ce script ne fait que reporter la
   puissance choisie dans la demande. Aucun envoi réseau : c'est une démonstration. */
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
  /* le menu est avant le bouton dans le code : à l'ouverture, le focus passe au premier lien */
  burger.addEventListener('click', () => {
    const ouvert = burger.getAttribute('aria-expanded') !== 'true';
    ouvrirMenu(ouvert);
    if (ouvert) menu.querySelector('a').focus();
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) ouvrirMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { ouvrirMenu(false); burger.focus(); }
  });
  matchMedia('(min-width: 75rem)').addEventListener('change', (m) => { if (m.matches) ouvrirMenu(false); });

  /* ---------- Barre d'appel sous le pouce ----------
     Elle se range (et devient inerte) quand la demande de visite occupe l'écran : elle
     doublerait son bouton et masquerait ses champs. On ignore le quart bas de l'écran
     pour qu'elle reste visible tant que la demande ne fait qu'apparaître. */
  const pouce = document.querySelector('.pouce');
  const visite = document.getElementById('visite');
  if (pouce && visite && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      pouce.classList.toggle('range', e.isIntersecting);
      pouce.inert = e.isIntersecting;
    }, { rootMargin: '0px 0px -25% 0px' }).observe(visite);
  }

  /* ---------- Demande de visite en plusieurs étapes ---------- */
  const form = document.getElementById('visite-form');
  const etapes = [...form.querySelectorAll('.etape')];
  const barre = document.getElementById('visite-barre');
  const libelle = document.getElementById('visite-etape');
  const retour = document.getElementById('visite-retour');
  const suivant = document.getElementById('visite-suivant');
  const TOTAL = 4;
  let courante = 1;

  /* Jours de visite : les jours ouvrés des huit prochains jours, à partir de demain. */
  const court = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  const long = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const jours = document.getElementById('jours');
  const auj = new Date();
  for (let d = 1; d <= 8; d++) {
    const j = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + d);
    if (j.getDay() === 0 || j.getDay() === 6) continue;
    const label = document.createElement('label');
    label.className = 'tuile';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'jour'; input.value = long.format(j).replace(/(\d) /, `$1${NBSP}`);
    const petit = document.createElement('small');
    petit.textContent = court.format(j);
    label.append(input, petit, date.format(j).replace(/(\d) /, `$1${NBSP}`));
    jours.append(label);
  }

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
  const telPropre = () => form.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0');

  /* Chaque étape dit exactement ce qui manque. */
  const valider = (n) => {
    let msg = '', manque = '';
    if (n === 1 && !valeur('lieu')) { msg = 'Choisissez où sera la borne pour continuer.'; manque = 'lieu'; }
    if (n === 2) {
      const kw = valeur('puissance'), dist = valeur('distance');
      manque = !kw ? 'puissance' : !dist ? 'distance' : '';
      if (!kw && !dist) msg = 'Choisissez une puissance et la distance au tableau pour continuer.';
      else if (!kw) msg = `Choisissez une puissance, ou «${NBSP}Je ne sais pas encore${NBSP}».`;
      else if (!dist) msg = 'Indiquez la distance entre le tableau et la place, même approximative.';
    }
    if (n === 3) {
      const jour = valeur('jour'), moment = valeur('moment');
      manque = !jour ? 'jour' : !moment ? 'moment' : '';
      if (!jour && !moment) msg = 'Choisissez un jour et un moment de la journée pour continuer.';
      else if (!jour) msg = 'Choisissez le jour de la visite.';
      else if (!moment) msg = 'Choisissez le matin ou l’après-midi.';
    }
    if (msg) {
      erreurEtape(n, msg);
      form.querySelector(`input[name="${manque}"]`)?.focus();
      return false;
    }
    if (n === 4) {
      const ok = [
        erreurChamp('nom', form.nom.value.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
        erreurChamp('tel', /^0[1-9]\d{8}$/.test(telPropre()) ? '' : 'Indiquez un numéro à 10 chiffres, par exemple 06 12 34 56 78.'),
        erreurChamp('commune', form.commune.value.trim().length >= 2 ? '' : 'Indiquez votre commune, par exemple Lambersart.'),
      ];
      const premier = ['nom', 'tel', 'commune'][ok.indexOf(false)];
      if (premier) { document.getElementById(premier).focus(); return false; }
    }
    erreurEtape(n, '');
    return true;
  };

  const telLisible = () => telPropre().replace(/(\d{2})(?=\d)/g, `$1${NBSP}`);
  const creneau = () => `le ${valeur('jour')}, ${valeur('moment')}`;

  const remplirRecap = () => {
    const lignes = [
      ['Lieu de la borne', valeur('lieu'), 1],
      ['Puissance souhaitée', valeur('puissance'), 2],
      ['Distance du tableau', valeur('distance'), 2],
      ['Visite', creneau().replace(/^l/, 'L'), 3],
      ['Coordonnées', `${form.nom.value.trim()}, ${telLisible()}, ${form.commune.value.trim()}`, 4],
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
    barre.style.transform = `scaleX(${Math.min(n, TOTAL) / TOTAL})`;
    libelle.textContent = n <= TOTAL ? `Étape ${n} sur ${TOTAL}` : n === 5 ? 'Récapitulatif' : 'Demande envoyée';
    retour.hidden = n === 1 || n === 6;
    suivant.hidden = n === 6;
    suivant.textContent = n === 4 ? 'Voir le récapitulatif' : n === 5 ? 'Envoyer ma demande' : 'Continuer';
    if (n === 5) remplirRecap();
    if (n === 6) {
      document.getElementById('fini-tel').textContent = telLisible();
      document.getElementById('fini-creneau').textContent = creneau();
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
    if (['nom', 'tel', 'commune'].includes(e.target.id) && e.target.getAttribute('aria-invalid') === 'true') erreurChamp(e.target.id, '');
  });

  /* ---------- Le disjoncteur choisi plus bas préremplit la puissance de la demande ---------- */
  const sansEspace = (s) => s.replace(/\s/g, '');
  const reporterPuissance = () => {
    const kw = document.querySelector('input[name="kw"]:checked');
    const cible = kw && [...form.querySelectorAll('input[name="puissance"]')].find((r) => sansEspace(r.value) === sansEspace(kw.value));
    if (cible) cible.checked = true;
  };
  document.querySelectorAll('input[name="kw"]').forEach((r) => r.addEventListener('change', reporterPuissance));
  document.getElementById('choisir-kw').addEventListener('click', reporterPuissance);

  afficher(1, false);
})();
