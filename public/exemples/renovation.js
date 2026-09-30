/* Kerleau Rénovation (démo 4dayvelopment) : curseur avant / après, fiches des chantiers,
   assistant de devis en 5 étapes, barre du pouce. Le filtre des chantiers et le plan du devis
   sont en CSS seul (:has). Aucun envoi réseau : c'est une démonstration. */
(() => {
  'use strict';
  const NNBSP = ' ', NBSP = ' '; // espace fine insécable, espace insécable
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Curseur avant / après ----------
     Souris : clic ou glisser n'importe où sur la photo. Doigt : un glisser horizontal
     déplace le curseur, un glisser vertical fait défiler la page (touch-action: pan-y).
     Clavier : flèches (Maj pour aller plus vite), Origine, Fin, Page préc. / suiv. */
  const compare = document.getElementById('compare');
  const poignee = document.getElementById('poignee');
  let p = 50, balayage = 0;

  const texte = (v) => v <= 2 ? 'Photo après en entier' : v >= 98 ? 'Photo avant en entier'
    : `${v}${NNBSP}% avant, ${100 - v}${NNBSP}% après`;
  const regler = (v) => {
    p = Math.min(100, Math.max(0, v));
    compare.style.setProperty('--p', p.toFixed(2));
    const r = Math.round(p);
    poignee.setAttribute('aria-valuenow', String(r));
    poignee.setAttribute('aria-valuetext', texte(r));
  };
  const versP = (x) => { const r = compare.getBoundingClientRect(); return (x - r.left) / r.width * 100; };
  const arreter = () => { cancelAnimationFrame(balayage); balayage = 0; };

  let depart = null, glisse = false;
  const lacher = () => { depart = null; glisse = false; compare.classList.remove('glisse'); };
  compare.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    arreter();
    depart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    // souris ou poignée : on suit tout de suite ; doigt ailleurs : on attend de voir la direction
    if (e.pointerType === 'mouse' || e.target.closest('.poignee')) {
      glisse = true;
      compare.classList.add('glisse');
      compare.setPointerCapture(e.pointerId);
      if (!e.target.closest('.poignee')) regler(versP(e.clientX));
      e.preventDefault();
    }
  });
  compare.addEventListener('pointermove', (e) => {
    if (!depart || e.pointerId !== depart.id) return;
    if (!glisse) {
      const dx = Math.abs(e.clientX - depart.x), dy = Math.abs(e.clientY - depart.y);
      if (dy > 8 && dy > dx) { depart = null; return; } // c'est un défilement
      if (dx < 6) return;
      glisse = true;
      compare.classList.add('glisse');
      compare.setPointerCapture(e.pointerId);
    }
    regler(versP(e.clientX));
  });
  compare.addEventListener('pointerup', (e) => {
    if (depart && !glisse) regler(versP(e.clientX)); // un simple toucher place le curseur
    lacher();
  });
  compare.addEventListener('pointercancel', lacher);

  poignee.addEventListener('keydown', (e) => {
    const pas = e.shiftKey ? 10 : 2;
    const cible = { ArrowLeft: p - pas, ArrowDown: p - pas, ArrowRight: p + pas, ArrowUp: p + pas,
      PageDown: p - 10, PageUp: p + 10, Home: 0, End: 100 }[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    arreter();
    regler(Math.round(cible));
  });
  poignee.addEventListener('focus', arreter);

  /* Un seul mouvement à l'arrivée : le curseur montre qu'il se déplace, puis revient au milieu. */
  if (!calme) {
    const lancer = () => {
      const t0 = performance.now() + 600, duree = 2200;
      const pas = (t) => {
        const k = Math.min(1, Math.max(0, (t - t0) / duree));
        regler(50 - 16 * Math.sin(k * Math.PI * 2) * (1 - k * .35));
        if (k < 1) balayage = requestAnimationFrame(pas); else { regler(50); balayage = 0; }
      };
      balayage = requestAnimationFrame(pas);
    };
    if (document.readyState === 'complete') lancer(); else addEventListener('load', lancer, { once: true });
  }

  /* ---------- Fiches des chantiers (<dialog> natif : Échap, piège du focus, retour du focus) ---------- */
  document.addEventListener('click', (e) => {
    const ouvrir = e.target.closest('[data-fiche]');
    if (ouvrir) {
      const fiche = document.getElementById(ouvrir.dataset.fiche);
      if (fiche && !fiche.open) { fiche.showModal(); fiche.scrollTop = 0; }
      return;
    }
    const fermer = e.target.closest('[data-fermer]');
    if (fermer) { fermer.closest('dialog').close(); return; }  // le lien « devis » poursuit ensuite vers #devis
    if (e.target.matches('dialog.fiche')) e.target.close();   // clic sur le voile
  });

  /* ---------- Barre du pouce : rangée (et inerte) quand l'assistant occupe l'écran ---------- */
  const barre = document.querySelector('.barre');
  const form = document.getElementById('devis-form');
  if (barre && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      barre.classList.toggle('range', e.isIntersecting);
      barre.inert = e.isIntersecting;
    }, { rootMargin: '0px 0px -30% 0px' }).observe(form);
  }

  /* ---------- Assistant de devis en plusieurs étapes (aucun choix coché d'avance) ---------- */
  const etapes = [...form.querySelectorAll('.etape')];
  const barreProg = document.getElementById('devis-barre');
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
    const el = document.getElementById(`err-${n}`);
    if (el) el.textContent = msg;
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
    etapes.forEach((el) => { el.hidden = Number(el.dataset.etape) !== n; });
    barreProg.style.transform = `scaleX(${Math.min(n, TOTAL) / TOTAL})`;
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
  // une réponse choisie efface le message d'erreur de l'étape
  form.addEventListener('change', (e) => { if (e.target.type === 'radio') erreurEtape(courante, ''); });
  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true') erreurChamp(e.target.id, '');
  });

  afficher(1, false);
})();
