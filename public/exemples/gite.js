/* Maison Tixier (démo 4dayvelopment) : galerie, barre de réservation en direct,
   calendrier des nuits libres relié à la barre, plan des environs, demande.
   Tout le texte critique est dans le HTML ; ce script ne fait que l’interaction. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduit = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Données de la maison (celles de l’ancienne démo) ── */
  const AN = 2026;
  const plage = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const PRIS = { 10: [2, 3, 16, 17, ...plage(19, 30)], 11: [13, 14, 24, 25, 27, 28], 12: [4, 5, 18, 19, ...plage(21, 31)] };
  const NUIT = 95, SUPPL = 30, TABLE = 28, MAX_NUITS = 4;
  const OUVERT = ['2026-10-01', '2026-12-31']; // première nuit, dernier départ possible

  /* ── Dates en texte ISO (AAAA-MM-JJ), calculées en UTC pour éviter les décalages ── */
  const utc = j => Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10));
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const ajoute = (j, n) => iso(utc(j) + n * 864e5);
  const ecart = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
  const estPris = j => +j.slice(0, 4) === AN && (PRIS[+j.slice(5, 7)] || []).includes(+j.slice(8, 10));
  const fLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const premier = s => s.replace(/(^|\s)1 /, '$11er ');
  const long = j => premier(fLong.format(utc(j)));
  const court = j => premier(fCourt.format(utc(j)));
  const euros = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR',
    minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
  const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  /* ── État partagé par la barre, le calendrier et la demande ── */
  const etat = { a: null, d: null, v: 2, table: false };

  // Vérifie le séjour et calcule le prix. Renvoie { vide } | { partiel } | { err } | { n, ...prix }.
  function verifier() {
    const { a, d, v } = etat;
    if (!a) return { vide: true };
    if (a < OUVERT[0] || a >= OUVERT[1]) return { err: 'Le calendrier est ouvert pour les nuits d’octobre à décembre 2026.' };
    if (estPris(a)) return { err: `La nuit du ${long(a)} est déjà prise : choisissez une autre arrivée.` };
    if (!d) return { partiel: true };
    const n = ecart(a, d);
    if (n < 1) return { err: 'Le départ doit suivre l’arrivée d’au moins une nuit.' };
    if (d > OUVERT[1]) return { err: 'Le calendrier est ouvert pour les nuits d’octobre à décembre 2026.' };
    for (let i = 1; i < n; i++) {
      const j = ajoute(a, i);
      if (estPris(j)) return { err: `La nuit du ${long(j)} est déjà prise : partez le ${long(j)} au plus tard.` };
    }
    if (n > MAX_NUITS) return { err: 'Nous accueillons des séjours d’une à quatre nuits. Pour plus long, appelez-nous : nous verrons ensemble.' };
    if (new Date(utc(a)).getUTCDay() === 5 && n < 2) return { err: 'Le vendredi, on arrive pour le week-end entier : deux nuits, départ le dimanche.' };
    const base = n * NUIT, plus = n * Math.max(0, v - 2) * SUPPL, table = etat.table ? v * TABLE : 0;
    const total = base + plus + table;
    return { n, base, plus, table, total, acompte: Math.round(total * 30) / 100 };
  }

  /* ── Barre de réservation ── */
  const barre = $('#barre');
  const fA = $('#arrivee'), fD = $('#depart'), fV = $('#voyageurs');
  const ouvrir = $('#barre-ouvrir'), fermer = $('#barre-fermer');
  const resume = $('#barre-resume'), total = $('#barre-total'), note = $('#barre-note');
  const NOTE = note.textContent, RESUME = resume.innerHTML;

  function feuille(ouverte, rendreFocus = true) {
    barre.classList.toggle('ouverte', ouverte);
    ouvrir.setAttribute('aria-expanded', ouverte);
    if (ouverte) fA.focus();
    else if (rendreFocus && barre.contains(document.activeElement)) ouvrir.focus();
  }
  ouvrir.addEventListener('click', () => feuille(true));
  fermer.addEventListener('click', () => feuille(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && barre.classList.contains('ouverte')) feuille(false); });
  document.addEventListener('pointerdown', e => { if (barre.classList.contains('ouverte') && !barre.contains(e.target)) feuille(false, false); });
  $('.barre-cal', barre).addEventListener('click', () => feuille(false, false));

  fA.addEventListener('change', () => {
    etat.a = fA.value || null;
    if (etat.a && etat.d && etat.d <= etat.a) etat.d = null;
    rendre(true);
  });
  fD.addEventListener('change', () => { etat.d = fD.value || null; rendre(true); });
  fV.addEventListener('change', () => { etat.v = +fV.value; rendre(); });

  barre.addEventListener('submit', e => {
    e.preventDefault();
    const r = verifier();
    if (r.n) {
      feuille(false, false);
      $('#demande').scrollIntoView({ behavior: reduit.matches ? 'auto' : 'smooth' });
      $('#nom').focus({ preventScroll: true });
      return;
    }
    if (!r.err) note.textContent = r.vide ? 'Choisissez d’abord une date d’arrivée.' : 'Choisissez maintenant le jour du départ.';
    note.classList.add('alerte-regle');
    (r.partiel ? fD : fA).focus();
  });

  /* ── Calendrier des nuits libres, construit sur les mois du HTML ── */
  const cal = $('.cal');
  const mois = $$('.mois', cal);
  mois.forEach(el => {
    const m = +el.dataset.mois;
    const noms = document.createElement('div');
    noms.className = 'sem-noms';
    noms.setAttribute('aria-hidden', 'true');
    noms.innerHTML = [...'LMMJVSD'].map(l => `<span>${l}</span>`).join('');
    const grille = document.createElement('div');
    grille.className = 'jours';
    grille.setAttribute('role', 'group');
    grille.setAttribute('aria-label', $('h3', el).textContent);
    const decale = (new Date(Date.UTC(AN, m - 1, 1)).getUTCDay() + 6) % 7; // lundi en premier
    for (let i = 0; i < decale; i++) grille.append(document.createElement('span'));
    const fin = new Date(Date.UTC(AN, m, 0)).getUTCDate();
    for (let d = 1; d <= fin; d++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jour';
      b.dataset.jour = `${AN}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      b.textContent = d;
      b.tabIndex = d === 1 ? 0 : -1;
      if (estPris(b.dataset.jour)) b.classList.add('pris');
      grille.append(b);
    }
    $('h3', el).after(noms, grille);
  });
  const jours = $$('.jour', cal);
  cal.classList.add('js');

  const choixMois = $$('.cal-choix button');
  const voirMois = m => {
    mois.forEach(el => el.classList.toggle('vu', +el.dataset.mois === m));
    choixMois.forEach(b => b.setAttribute('aria-pressed', +b.dataset.mois === m));
  };
  choixMois.forEach(b => b.addEventListener('click', () => voirMois(+b.dataset.mois)));
  voirMois(10);

  // Premier clic : l’arrivée. Second clic plus tard : le départ. Un clic avant l’arrivée recommence.
  cal.addEventListener('click', e => {
    const b = e.target.closest('.jour');
    if (!b) return;
    const j = b.dataset.jour;
    if (!etat.a || etat.d || j <= etat.a) { etat.a = j; etat.d = null; }
    else etat.d = j;
    rendre();
  });

  // Flèches : un jour à gauche ou à droite, une semaine en haut ou en bas (dans le mois).
  cal.addEventListener('keydown', e => {
    const b = e.target.closest('.jour');
    const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!b || (!pas && e.key !== 'Home' && e.key !== 'End')) return;
    const liste = $$('.jour', b.parentElement);
    const i = liste.indexOf(b);
    const cible = liste[e.key === 'Home' ? 0 : e.key === 'End' ? liste.length - 1 : Math.min(liste.length - 1, Math.max(0, i + pas))];
    e.preventDefault();
    b.tabIndex = -1;
    cible.tabIndex = 0;
    cible.focus();
  });

  /* ── Tout se met à jour d’un coup : barre, calendrier, récapitulatif, billet ── */
  const recap = $('#recap-contenu');
  const VIDE = recap.innerHTML;
  const ligne = (dt, dd, cl = '') => `<div${cl ? ` class="${cl}"` : ''}><dt>${dt}</dt><dd>${dd}</dd></div>`;

  function rendre(depuisBarre = false) {
    const r = verifier();
    const { a, d, v } = etat;

    fA.value = a || '';
    fD.value = d || '';
    fD.min = a ? ajoute(a, 1) : '2026-10-02';
    fV.value = String(v);

    // Barre : total, note, résumé du téléphone
    total.classList.toggle('ok', !!r.n);
    const [haut, bas] = r.n ? [`${pl(r.n, 'nuit')}, ${pl(v, 'voyageur')}`, euros(r.total)]
      : r.partiel ? [`Arrivée le ${court(a)}`, 'Et le départ ?']
      : r.err ? ['Dates à revoir', 'Voir la note']
      : ['Aucune date choisie', `${NUIT} € la nuit`];
    total.innerHTML = `<span class="barre-total-nuits">${haut}</span><b>${bas}</b>`;
    note.textContent = r.err || NOTE;
    note.classList.toggle('alerte-regle', !!r.err);
    resume.innerHTML = r.n ? `<span class="r-dates">Du ${court(a)} au ${court(d)}</span><span class="r-prix">${pl(r.n, 'nuit')}, ${euros(r.total)}</span>`
      : r.partiel ? `<span class="r-dates">Arrivée le ${court(a)}</span>Choisissez le départ`
      : r.err ? '<span class="r-dates">Dates à revoir</span>Touchez Modifier pour corriger'
      : RESUME;
    ouvrir.textContent = a ? 'Modifier' : 'Choisir mes dates';

    // Calendrier
    const finNuits = d || (a && ajoute(a, 1));
    jours.forEach(b => {
      const j = b.dataset.jour;
      const dans = a && j >= a && j < finNuits && !r.err;
      b.classList.toggle('nuit', !!dans);
      b.classList.toggle('debut', j === a);
      b.classList.toggle('fin', j === d);
      b.setAttribute('aria-pressed', j === a || j === d);
      const statut = j === a ? 'votre arrivée' : j === d ? 'votre départ' : dans ? 'dans votre séjour' : estPris(j) ? 'nuit prise' : 'nuit libre';
      b.setAttribute('aria-label', `${long(j)}, ${statut}`);
    });
    if (a && depuisBarre) voirMois(+a.slice(5, 7));

    // Récapitulatif ligne par ligne
    if (r.vide) recap.innerHTML = VIDE;
    else if (r.err) recap.innerHTML = `<p class="recap-err">${r.err}</p>`;
    else if (r.partiel) recap.innerHTML = `<dl class="lignes">${ligne('Arrivée', long(a), 'l-dates')}</dl><p class="recap-vide">Choisissez maintenant le jour du départ.</p>`;
    else recap.innerHTML = `<dl class="lignes">`
      + ligne('Arrivée', long(a), 'l-dates') + ligne('Départ', long(d), 'l-dates')
      + ligne(`${pl(r.n, 'nuit')}, ${NUIT} € la nuit`, euros(r.base))
      + (r.plus ? ligne(`${pl(v - 2, 'personne')} en plus, ${SUPPL} € la nuit${v > 3 ? ' chacune' : ''}`, euros(r.plus)) : '')
      + (r.table ? ligne(`Table d’hôtes, ${pl(v, 'couvert')}`, euros(r.table)) : '')
      + ligne('Total', euros(r.total), 'l-total')
      + ligne('Acompte de 30 %, à la confirmation', euros(r.acompte))
      + ligne('Solde, sur place', euros(r.total - r.acompte))
      + `</dl><p class="recap-taxe">Taxe de séjour en plus, au tarif de la communauté de communes.</p>`;

    // Billet de la demande
    $('#billet-arrivee').textContent = a ? long(a) : 'à choisir';
    $('#billet-depart').textContent = d && !r.err ? long(d) : 'à choisir';
    $('#billet-total').innerHTML = r.n ? `${pl(r.n, 'nuit')}, ${pl(v, 'voyageur')} : <span class="prix">${euros(r.total)}</span>`
      : r.err || 'Choisissez vos dates dans la barre ou dans le calendrier.';
  }

  /* ── Galerie : le défilement est natif (glisser), les boutons et vignettes s’y branchent ── */
  const piste = $('#piste');
  const vues = $$('.vue', piste);
  const vignettes = $$('.vignettes button');
  const compte = $('#compte b');
  let ici = 0;
  const aller = i => {
    const v = vues[(i + vues.length) % vues.length];
    piste.scrollTo({ left: v.offsetLeft, behavior: reduit.matches ? 'auto' : 'smooth' });
  };
  $('#prec').addEventListener('click', () => aller(ici - 1));
  $('#suiv').addEventListener('click', () => aller(ici + 1));
  vignettes.forEach(b => b.addEventListener('click', () => aller(+b.dataset.vue)));
  piste.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); aller(ici + (e.key === 'ArrowRight' ? 1 : -1)); }
  });
  const vu = new IntersectionObserver(entrees => entrees.forEach(e => {
    if (!e.isIntersecting) return;
    ici = vues.indexOf(e.target);
    compte.textContent = ici + 1;
    vignettes.forEach((b, i) => b.setAttribute('aria-current', i === ici));
  }), { root: piste, threshold: .6 });
  vues.forEach(v => vu.observe(v));
  // Les photos suivantes se chargent une fois la page prête, pour glisser sans attendre.
  addEventListener('load', () => $$('img[loading="lazy"]', piste).forEach(i => { i.loading = 'eager'; }), { once: true });

  /* ── Fiches des chambres : la chambre, ou la salle d’eau / le linge ── */
  $$('.bascule').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', g).forEach(x => {
      x.setAttribute('aria-pressed', x === b);
      document.getElementById(x.dataset.montre).hidden = x !== b;
    });
  }));

  /* ── Autour de la maison : un lieu à la fois sur le plan ── */
  const carte = $('#carte');
  const lieux = $$('.lieu', carte), choixLieu = $$('.lieux-choix button', carte);
  const voirLieu = l => {
    carte.dataset.lieu = l;
    choixLieu.forEach(b => b.setAttribute('aria-pressed', b.dataset.lieu === l));
    lieux.forEach(p => { p.hidden = p.dataset.lieu !== l; });
  };
  choixLieu.forEach(b => b.addEventListener('click', () => voirLieu(b.dataset.lieu)));
  voirLieu('allier');

  /* ── Demande : reprend les dates choisies, vérifie, puis confirme ── */
  const resa = $('#resa'), merci = $('#merci');
  const errSejour = $('#err-sejour');
  $('#table-hotes').addEventListener('change', e => { etat.table = e.target.checked; rendre(); });
  $$('input[required]', resa).forEach(f => f.addEventListener('input', () => {
    f.removeAttribute('aria-invalid');
    $('#err-' + f.id).textContent = '';
  }));
  $('#billet-modifier').addEventListener('click', e => {
    if (!matchMedia('(max-width: 63.99rem)').matches) return;
    e.preventDefault();
    feuille(true);
  });

  resa.addEventListener('submit', e => {
    e.preventDefault();
    const fautes = [];
    const nom = $('#nom'), email = $('#email');
    [[nom, !nom.value.trim(), 'Indiquez votre nom pour que nous sachions qui accueillir.'],
     [email, !email.value.trim() || !email.validity.valid, 'Indiquez un email valide, par exemple prenom@exemple.fr.']]
      .forEach(([f, faux, msg]) => {
        if (faux) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
        $('#err-' + f.id).textContent = faux ? msg : '';
        if (faux) fautes.push(f);
      });
    const r = verifier();
    errSejour.textContent = r.n ? '' : r.err || 'Choisissez vos dates d’arrivée et de départ dans la barre ou dans le calendrier.';
    if (!r.n) fautes.push($('#billet-modifier'));
    if (fautes.length) { fautes[0].focus(); return; }

    const { a, d, v } = etat;
    $('#merci-sejour').textContent = `Du ${long(a)} au ${long(d)}, ${pl(r.n, 'nuit')} pour ${pl(v, 'voyageur')}`
      + `${etat.table ? ', avec la table d’hôtes le premier soir' : ''}. Total : ${euros(r.total)}, taxe de séjour en plus.`;
    $('#merci-acompte').textContent = euros(r.acompte);
    resa.hidden = true;
    merci.hidden = false;
    $('#merci-t').focus();
  });
  $('#merci-retour').addEventListener('click', () => {
    merci.hidden = true;
    resa.hidden = false;
    $('#nom').focus();
  });

  rendre();
})();
