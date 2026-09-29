/* Chariot (démo 4dayvelopment) : menu mobile, barre d'action, planning ouvert sur le
   jour courant, réservation du cours d'essai en 4 étapes. Le changement de jour du
   planning est en CSS seul (:has). Aucun envoi réseau : c'est une démonstration. */
(() => {
  'use strict';
  const NNBSP = ' ', NBSP = ' '; // espace fine insécable, espace insécable
  const doux = !matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---------- Barre d'action sous le pouce ----------
     Elle se range (et devient inerte) quand la carte de réservation occupe l'écran :
     elle doublerait son bouton et masquerait ses champs. */
  const pouce = document.querySelector('.pouce');
  const essai = document.getElementById('essai');
  if (pouce && essai && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      pouce.classList.toggle('range', e.isIntersecting);
      pouce.inert = e.isIntersecting;
    }, { rootMargin: '0px 0px -25% 0px' }).observe(essai);
  }

  /* ---------- Planning : ouvert sur le jour courant (le dimanche, sur le lundi) ---------- */
  const auj = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][(new Date().getDay() + 6) % 7];
  if (auj) document.getElementById(`j-${auj}`).checked = true;

  /* ---------- Réservation du cours d'essai ---------- */
  const form = document.getElementById('essai-form');
  const etapes = [...form.querySelectorAll('.etape')];
  const barre = document.getElementById('essai-barre');
  const libelle = document.getElementById('essai-etape');
  const retour = document.getElementById('essai-retour');
  const suivant = document.getElementById('essai-suivant');
  const creneaux = document.getElementById('creneaux');
  const legendeCreneau = document.getElementById('legende-creneau');
  const TOTAL = 4;
  let courante = 1;

  const coche = (nom) => form.querySelector(`input[name="${nom}"]:checked`);
  const nomJour = () => coche('jour')?.dataset.nom || '';

  /* Les créneaux proposés sont lus dans le planning : une seule source pour les horaires.
     Seuls les cours ouverts à l'essai (ni complets, ni réservés aux habitués) y figurent. */
  const remplirCreneaux = (jour) => {
    legendeCreneau.textContent = `À quelle heure, ${nomJour().toLowerCase()}${NNBSP}?`;
    creneaux.replaceChildren(...[...document.querySelectorAll(`.j-${jour} .creneau.ouvert`)].map((li) => {
      const heure = li.querySelector('time');
      const quoi = li.querySelector('.quoi');
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'cours'; input.value = heure.dateTime;
      input.dataset.heure = heure.textContent;
      input.dataset.cours = quoi.querySelector('b').textContent;
      input.dataset.prof = quoi.querySelector('small').textContent.split(',')[0];
      const h = document.createElement('span'); h.className = 'heure'; h.textContent = heure.textContent;
      const label = document.createElement('label');
      label.className = 'tuile tuile-cours';
      label.append(input, h, ...[...quoi.children].map((n) => n.cloneNode(true)));
      return label;
    }));
  };

  const erreurEtape = (n, msg) => {
    const p = document.getElementById(`err-${n}`);
    if (p) p.textContent = msg;
  };
  const erreurChamp = (id, msg) => {
    document.getElementById(`${id}-err`).textContent = msg;
    document.getElementById(id).setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const telNu = () => form.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0');
  const telLisible = () => telNu().replace(/(\d{2})(?=\d)/g, `$1${NBSP}`);

  const valider = (n) => {
    if (n === 1 && !coche('jour')) { erreurEtape(1, 'Choisissez un jour pour continuer.'); return false; }
    if (n === 2 && !coche('cours')) { erreurEtape(2, 'Choisissez un cours pour continuer.'); return false; }
    if (n === 3 && !coche('niveau')) { erreurEtape(3, 'Dites-nous où vous en êtes avec le Pilates pour continuer.'); return false; }
    if (n === 4) {
      const ok = [
        erreurChamp('prenom', form.prenom.value.trim().length >= 2 ? '' : 'Indiquez votre prénom.'),
        erreurChamp('tel', /^0[67]\d{8}$/.test(telNu()) ? '' : 'Indiquez un numéro de mobile à 10 chiffres, par exemple 06 12 34 56 78.'),
      ];
      const premier = ['prenom', 'tel'][ok.indexOf(false)];
      if (premier) { document.getElementById(premier).focus(); return false; }
    }
    erreurEtape(n, '');
    return true;
  };

  const remplirRecap = () => {
    const c = coche('cours');
    const lignes = [
      ['Jour et heure', `${nomJour()} à ${c.dataset.heure}`, 1],
      ['Cours', `${c.dataset.cours}, avec ${c.dataset.prof}`, 2],
      ['Le Pilates, pour vous', coche('niveau').value, 3],
    ];
    const note = form.signaler.value.trim();
    if (note) lignes.push(['À signaler au professeur', note, 3]);
    lignes.push(['Confirmation par SMS', `${form.prenom.value.trim()}, ${telLisible()}`, 4]);
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
    barre.style.transform = `scaleX(${Math.min(n, TOTAL) / TOTAL})`;
    libelle.textContent = n <= TOTAL ? `Étape ${n} sur ${TOTAL}` : n === 5 ? 'Récapitulatif' : 'Cours réservé';
    retour.hidden = n === 1;
    suivant.textContent = n === 4 ? 'Voir le récapitulatif' : n === 5 ? 'Réserver ce cours' : 'Continuer';
    form.querySelector('.essai-nav').hidden = n === 6;
    if (n === 3) { // rappel du cours choisi, utile quand il vient du planning
      const c = coche('cours');
      document.getElementById('rappel').textContent = `${nomJour()} à ${c.dataset.heure}${NNBSP}: ${c.dataset.cours}, avec ${c.dataset.prof}`;
    }
    if (n === 5) remplirRecap();
    if (n === 6) {
      const c = coche('cours');
      document.getElementById('fini-cours').textContent = `${nomJour()} à ${c.dataset.heure}${NNBSP}: ${c.dataset.cours}, avec ${c.dataset.prof}`;
      document.getElementById('fini-tel').textContent = telLisible();
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
  form.addEventListener('change', (e) => {
    if (e.target.name === 'jour') remplirCreneaux(e.target.value); // nouveau jour : le cours est à choisir de nouveau
    if (e.target.type === 'radio') erreurEtape(courante, '');
  });
  form.addEventListener('input', (e) => {
    if (['prenom', 'tel'].includes(e.target.id) && e.target.getAttribute('aria-invalid') === 'true') erreurChamp(e.target.id, '');
  });

  /* ---------- « Réserver » dans le planning : jour et cours remplis, on passe au niveau ---------- */
  document.getElementById('planning').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-jour]');
    if (!b) return;
    const jour = form.querySelector(`input[name="jour"][value="${b.dataset.jour}"]`);
    jour.checked = true;
    remplirCreneaux(jour.value);
    creneaux.querySelector(`input[value="${b.dataset.heure}"]`).checked = true;
    erreurEtape(1, ''); erreurEtape(2, '');
    afficher(3, false);
    essai.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' });
    etapes[2].querySelector('legend').focus({ preventScroll: true });
  });

  afficher(1, false);
})();
