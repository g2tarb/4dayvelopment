/* Trois Fauteuils (démo 4dayvelopment) : le fauteuil libre.
   Un planning fictif mais stable (graine = date + personne) donne, à l'heure de Paris,
   l'état de chaque fauteuil, la réponse « sans rendez-vous » et les créneaux réservables.
   Rien n'est envoyé : la confirmation reste dans la page. */
(() => {
  'use strict';
  const NB = ' ';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // horaires par jour (0 = dimanche), en minutes depuis minuit
  const HORAIRES = { 2: [600, 1170], 3: [600, 1170], 4: [600, 1260], 5: [600, 1170], 6: [540, 1080] };
  const EQUIPE = {
    ines: { nom: 'Inès', repos: 3, pause: 780 },
    malik: { nom: 'Malik', repos: 2, pause: 810 },
    lou: { nom: 'Lou', repos: 5, pause: 840 },
  };
  const IDS = Object.keys(EQUIPE);
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const JOURS_C = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  /* ── Temps ─────────────────────────────────────────── */
  function maintenant() {
    const p = {};
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    for (const { type, value } of f.formatToParts(new Date())) p[type] = value;
    // ?heure=15:20 fige l'heure pour montrer la démo en boutique un jour de fermeture
    const force = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('heure') || '');
    return { base: Date.UTC(+p.year, +p.month - 1, +p.day), min: force ? +force[1] * 60 + +force[2] : +p.hour * 60 + +p.minute };
  }
  function jour(base, k) {
    const d = new Date(base + k * 864e5);
    return { k, cle: d.toISOString().slice(0, 10), dow: d.getUTCDay(), date: d.getUTCDate(), mois: d.getUTCMonth() };
  }
  const h = (m) => Math.floor(m / 60) + NB + 'h' + (m % 60 ? NB + String(m % 60).padStart(2, '0') : '');
  const duree = (d) => (d < 60 ? d + NB + 'min' : Math.floor(d / 60) + NB + 'h' + (d % 60 ? NB + d % 60 : ''));
  const euros = (n) => n + NB + '€';
  const quand = (j) => (j.k === 0 ? 'aujourd’hui' : j.k === 1 ? 'demain' : j.k < 7 ? JOURS[j.dow] : JOURS[j.dow] + ' ' + j.date);
  const dateLongue = (j) => JOURS[j.dow] + ' ' + (j.date === 1 ? '1er' : j.date) + ' ' + MOIS[j.mois];

  /* ── Planning fictif, stable pour une date donnée ──── */
  function graine(s) { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; }
  function alea(s) {
    return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const cache = new Map();
  function occupations(j, id) {
    const o = HORAIRES[j.dow];
    const p = EQUIPE[id];
    if (!o || p.repos === j.dow) return null;
    const cle = j.cle + id;
    if (cache.has(cle)) return cache.get(cle);
    const r = alea(graine(cle));
    // ponytail: pause déjeuner fixe de 40 min, décalée d'une demi-heure par personne
    const pause = [p.pause, p.pause + 40, 'pause'];
    const occ = [pause];
    let t = o[0] + (r() < 0.5 ? 0 : 20);
    while (t < o[1]) {
      if (t >= pause[0] && t < pause[1]) { t = pause[1]; continue; }
      if (r() < 0.5) {
        const fin = t + [30, 30, 45, 45, 60, 60, 105][Math.floor(r() * 7)];
        if (fin > o[1] || (t < pause[0] && fin > pause[0])) { t += 10; continue; }
        occ.push([t, fin]);
        t = fin;
      } else t += [20, 30, 40, 60, 90][Math.floor(r() * 5)];
    }
    occ.sort((a, b) => a[0] - b[0]);
    cache.set(cle, occ);
    return occ;
  }
  const chevauche = (occ, a, b) => occ.some(([x, y]) => a < y && b > x);
  const depuisMaintenant = (now) => Math.ceil((now.min + 10) / 10) * 10;

  // heures de début possibles pour une durée d, un jour j, une personne
  function creneauxJour(j, id, d, depuis) {
    const occ = occupations(j, id);
    if (!occ) return [];
    const [o, f] = HORAIRES[j.dow];
    const res = [];
    for (let t = Math.max(o, depuis); t + d <= f; t += 10) if (!chevauche(occ, t, t + d)) res.push(t);
    return res;
  }
  function premier(id, now, d) {
    for (let k = 0; k < 14; k++) {
      const j = jour(now.base, k);
      const l = creneauxJour(j, id, d, k ? 0 : depuisMaintenant(now));
      if (l.length) return { j, t: l[0] };
    }
    return null;
  }
  function ouvertMaintenant(now) {
    const o = HORAIRES[jour(now.base, 0).dow];
    return !!o && now.min >= o[0] && now.min < o[1];
  }
  function reouverture(now) {
    for (let k = 0; k < 8; k++) {
      const j = jour(now.base, k);
      const o = HORAIRES[j.dow];
      if (o && (k > 0 || now.min < o[0])) return { j, t: o[0] };
    }
    return null;
  }

  /* ── État de chaque fauteuil, réponse « sans rendez-vous » ── */
  function statut(id, now) {
    const j0 = jour(now.base, 0);
    const occ = occupations(j0, id);
    const ouvert = ouvertMaintenant(now);
    if (ouvert && occ) {
      const en = occ.find(([a, b]) => now.min >= a && now.min < b);
      if (!en) {
        const suiv = occ.find(([a]) => a > now.min);
        const fin = suiv ? suiv[0] : HORAIRES[j0.dow][1];
        if (fin - now.min >= 25) return { ton: 'libre', txt: 'Libre maintenant', detail: 'jusqu’à ' + h(fin) };
      }
      const p = premier(id, now, 30);
      if (p && p.j.k === 0) return { ton: 'prise', txt: 'Libre à ' + h(p.t), detail: en && en[2] ? 'en pause déjeuner' : 'en coupe', t: p.t };
      return { ton: 'eteint', txt: 'Complet aujourd’hui', detail: p ? 'libre ' + quand(p.j) + ' à ' + h(p.t) : '' };
    }
    const p = premier(id, now, 30);
    if (ouvert && !occ) return { ton: 'eteint', txt: 'En repos aujourd’hui', detail: p ? 'de retour ' + quand(p.j) : '' };
    return { ton: 'eteint', txt: p ? 'Libre ' + quand(p.j) : 'Fermé', detail: p ? 'à ' + h(p.t) : '' };
  }
  const liste = (n) => (n.length < 2 ? n[0] : n.slice(0, -1).join(', ') + ' et ' + n[n.length - 1]);
  const el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; };
  const NOMBRES = ['', 'un fauteuil libre', 'deux fauteuils libres', 'les trois fauteuils libres'];

  function rendreEtats() {
    const now = maintenant();
    const etats = {};
    for (const id of IDS) {
      const s = (etats[id] = statut(id, now));
      const poste = $(`.poste[data-pers="${id}"]`);
      if (!poste) continue;
      $('[data-lampe]', poste).dataset.ton = s.ton;
      const et = $('[data-etat]', poste);
      et.dataset.ton = s.ton;
      $('[data-etat-txt]', et).replaceChildren(s.txt, ...(s.detail ? [el('small', s.detail)] : []));
    }
    const ouvert = ouvertMaintenant(now);
    const libres = IDS.filter((id) => etats[id].ton === 'libre');
    const prochains = IDS.filter((id) => etats[id].ton === 'prise').sort((a, b) => etats[a].t - etats[b].t);
    const re = reouverture(now);
    const quandRe = re ? quand(re.j) + ' à ' + h(re.t) : '';
    let ton, txt, rep, barre;
    if (ouvert && libres.length) {
      const noms = libres.map((id) => EQUIPE[id].nom);
      ton = 'libre';
      txt = 'Ouvert, ' + NOMBRES[libres.length] + ' maintenant';
      rep = ['Oui, maintenant.', ' ' + liste(noms) + (noms.length > 1 ? ' sont libres.' : ' est libre ' + etats[libres[0]].detail + '.') + ' Passez, ou appelez pour qu’on vous garde le fauteuil.'];
      barre = noms[0] + ' libre maintenant';
    } else if (ouvert && prochains.length) {
      const id = prochains[0];
      ton = 'prise';
      txt = 'Ouvert, prochain fauteuil libre à ' + h(etats[id].t);
      rep = ['Pas tout de suite.', ' Le prochain fauteuil se libère à ' + h(etats[id].t) + ', avec ' + EQUIPE[id].nom + '. Réservez-le pour ne pas attendre.'];
      barre = 'prochain fauteuil à ' + h(etats[id].t);
    } else if (ouvert) {
      ton = 'prise';
      txt = 'Ouvert, complet jusqu’à la fermeture';
      rep = ['Plus aujourd’hui.', ' Les trois fauteuils sont pris jusqu’à la fermeture. Réservez pour un autre jour.'];
      barre = 'complet aujourd’hui';
    } else {
      ton = 'eteint';
      txt = 'Fermé, réouverture ' + quandRe;
      rep = ['Le salon est fermé.', ' Réouverture ' + quandRe + '. Vous pouvez déjà réserver votre fauteuil.'];
      barre = 'réouverture ' + quandRe;
    }
    $('[data-lampe-salon]').dataset.ton = ton;
    $('[data-etat-salon-txt]').textContent = txt;
    $('[data-sansrdv]').dataset.ton = ton;
    $('[data-sansrdv-r]').replaceChildren(el('strong', rep[0]), rep[1]);
    $('[data-lampe-barre]').dataset.ton = ton;
    $('[data-barre-etat]').textContent = barre;
    const o = HORAIRES[jour(now.base, 0).dow];
    const lampe = el('span', null, 'lampe');
    lampe.dataset.ton = ouvert ? 'libre' : 'eteint';
    $('[data-ouvert]').replaceChildren(lampe, ouvert ? 'Ouvert maintenant, jusqu’à ' + h(o[1]) : 'Fermé maintenant, réouverture ' + quandRe);
    const dow = jour(now.base, 0).dow;
    $$('[data-jour]').forEach((e) => e.classList.toggle('auj', +e.dataset.jour === dow));
  }

  /* ── Réservation en trois temps, puis confirmation ──── */
  const form = $('#resa');
  const PRESTAS = $$('.ligne[data-presta]').map((b) => ({
    id: b.dataset.presta,
    nom: $('[data-nom]', b).textContent,
    detail: $('.l-detail', b).textContent,
    duree: +b.dataset.duree,
    prix: +b.dataset.prix,
    pers: b.dataset.pers.split(' '),
    groupe: b.closest('.rayon').querySelector('h3').textContent,
  }));
  const presta = (id) => PRESTAS.find((p) => p.id === id);
  const etat = { presta: null, pers: null, k: null, t: null, qui: null, prenom: '', etape: 1, max: 1, jours: [] };
  const btnSuiv = $('[data-suivant]');
  const btnPrec = $('[data-precedent]');
  let viaPointeur = false;

  function radio(name, value, checked) {
    const i = el('input');
    Object.assign(i, { type: 'radio', name, value: String(value), checked: !!checked });
    return i;
  }
  function rendreListe() {
    const groupes = [...new Set(PRESTAS.map((p) => p.groupe))];
    $('[data-liste-presta]').replaceChildren(...groupes.map((g) => {
      const div = el('div', null, 'groupe-presta');
      const ul = el('ul');
      for (const p of PRESTAS.filter((x) => x.groupe === g)) {
        const lab = el('label', null, 'opt');
        const prix = el('span', euros(p.prix), 'o-prix');
        prix.append(el('small', duree(p.duree)));
        lab.append(radio('presta', p.id), el('strong', p.nom), el('small', p.detail), prix);
        const li = el('li');
        li.append(lab);
        ul.append(li);
      }
      div.append(el('h4', g), ul);
      return div;
    }));
  }

  function majPers() {
    const p = presta(etat.presta);
    if (!p) return;
    const now = maintenant();
    let mieux = null;
    for (const lab of $$('.opt-pers')) {
      const inp = $('input', lab);
      const id = inp.value;
      if (id === 'premier') continue;
      const info = $('[data-pers-info]', lab);
      const ok = p.pers.includes(id);
      inp.disabled = !ok;
      lab.classList.toggle('indispo', !ok);
      info.dataset.ton = '';
      if (!ok) { info.textContent = 'ne fait pas cette prestation'; continue; }
      const pr = premier(id, now, p.duree);
      info.textContent = pr ? 'libre ' + quand(pr.j) + ' à ' + h(pr.t) : 'complet ces deux semaines';
      if (pr && pr.j.k === 0) info.dataset.ton = 'libre';
      if (pr && (!mieux || pr.j.k < mieux.j.k || (pr.j.k === mieux.j.k && pr.t < mieux.t))) mieux = { ...pr, id };
    }
    $('[data-pers-info="premier"]').textContent = mieux ? EQUIPE[mieux.id].nom + ', ' + quand(mieux.j) + ' à ' + h(mieux.t) : 'le plus tôt possible';
  }

  const candidats = () => (etat.pers && etat.pers !== 'premier' ? [etat.pers] : presta(etat.presta).pers);
  // heures proposées : chaque demi-heure libre, plus le tout début de chaque trou du planning
  function creneaux(j, now) {
    const p = presta(etat.presta);
    const m = new Map();
    for (const id of candidats()) {
      const l = creneauxJour(j, id, p.duree, j.k ? 0 : depuisMaintenant(now));
      const s = new Set(l);
      for (const t of l) if ((t % 30 === 0 || !s.has(t - 10)) && !m.has(t)) m.set(t, id);
    }
    return [...m].sort((a, b) => a[0] - b[0]);
  }
  function rendreJours() {
    const now = maintenant();
    const jours = [];
    for (let k = 0; k < 21 && jours.length < 7; k++) {
      const j = jour(now.base, k);
      const c = creneaux(j, now);
      if (c.length) jours.push({ j, c });
    }
    etat.jours = jours;
    if (!jours.some((x) => x.j.k === etat.k)) { etat.k = jours.length ? jours[0].j.k : null; etat.t = null; }
    $('[data-jours]').replaceChildren(...jours.map(({ j }) => {
      const lab = el('label', null, 'chip');
      const court = el('span', j.k === 0 ? 'auj.' : j.k === 1 ? 'demain' : JOURS_C[j.dow]);
      const num = el('strong', String(j.date));
      court.setAttribute('aria-hidden', 'true');
      num.setAttribute('aria-hidden', 'true');
      lab.append(radio('jour', j.k, j.k === etat.k), el('span', dateLongue(j), 'vs'), court, num);
      return lab;
    }));
    rendreCreneaux();
  }
  function rendreCreneaux() {
    const x = etat.jours.find((y) => y.j.k === etat.k);
    const box = $('[data-creneaux]');
    if (!x) { box.replaceChildren(el('p', 'Plus aucun créneau ces trois semaines pour ce choix. Appelez le salon, on vous trouvera une place.', 'vide')); return; }
    const plages = [['Le matin', 0, 720], ['L’après-midi', 720, 1020], ['En fin de journée', 1020, 1440]];
    box.replaceChildren(...plages.map(([nom, a, b]) => {
      const ts = x.c.filter(([t]) => t >= a && t < b);
      if (!ts.length) return '';
      const div = el('div', null, 'plage');
      const g = el('div', null, 'plage-grille');
      for (const [t, id] of ts) {
        const lab = el('label', null, 'chip');
        const i = radio('creneau', t, t === etat.t);
        i.dataset.qui = id;
        lab.append(i, h(t));
        g.append(lab);
      }
      div.append(el('h4', nom), g);
      return div;
    }));
  }

  function majCarton() {
    const p = presta(etat.presta);
    const x = etat.jours.find((y) => y.j.k === etat.k);
    const choisi = x && etat.t != null;
    let pers = '';
    if (choisi) pers = EQUIPE[etat.qui].nom + (etat.pers === 'premier' ? ', premier fauteuil libre' : '');
    else if (etat.pers) pers = etat.pers === 'premier' ? 'le premier fauteuil libre' : EQUIPE[etat.pers].nom;
    const v = {
      prenom: etat.prenom,
      presta: p ? p.nom : '',
      pers,
      date: choisi ? dateLongue(x.j) + ' à ' + h(etat.t) : '',
      duree: p ? duree(p.duree) : '',
      prix: p ? euros(p.prix) : '',
    };
    for (const [k, val] of Object.entries(v)) {
      const dd = $(`[data-c="${k}"]`);
      dd.textContent = val || NB;
      dd.classList.toggle('rempli', !!val);
    }
    $('[data-resume="1"]').textContent = p ? p.nom : 'à choisir';
    $('[data-resume="2"]').textContent = pers || 'à choisir';
    $('[data-resume="3"]').textContent = choisi ? JOURS_C[x.j.dow] + ' ' + x.j.date + ', ' + h(etat.t) : 'à choisir';
    $$('.ligne').forEach((b) => b.classList.toggle('choisie', b.dataset.presta === etat.presta));
  }

  const valide = (n) => (n === 1 ? !!etat.presta : n === 2 ? !!etat.pers : n === 3 ? etat.t != null : true);
  function aller(n, focus = true) {
    if (n === 2) majPers();
    if (n === 3) rendreJours();
    etat.etape = n;
    etat.max = Math.max(etat.max, n);
    $$('input[name="presta"]').forEach((i) => (i.checked = i.value === etat.presta));
    $$('input[name="pers"]').forEach((i) => (i.checked = i.value === etat.pers));
    $$('[data-etape]', form).forEach((e) => (e.hidden = +e.dataset.etape !== n));
    for (const b of $$('[data-aller]')) {
      const m = +b.dataset.aller;
      b.disabled = n === 5 || m > etat.max || (m > 1 && !valide(m - 1));
      if (m === Math.min(n, 3) && n < 5) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.classList.toggle('fait', valide(m) && m < n);
    }
    btnPrec.hidden = n === 1;
    $('[data-resa-nav]').hidden = n === 5;
    btnSuiv.hidden = n >= 4;
    btnSuiv.disabled = !valide(n);
    majCarton();
    if (!focus) return;
    const pan = $('.resa-pan');
    const r = pan.getBoundingClientRect();
    if (r.top < 0 || r.top > innerHeight * 0.7) pan.scrollIntoView({ block: 'start' });
    const t = $(`[data-etape="${n}"] legend, [data-etape="${n}"] .etape-titre`);
    if (t) t.focus({ preventScroll: true });
  }

  form.addEventListener('pointerdown', () => (viaPointeur = true));
  form.addEventListener('keydown', (e) => {
    viaPointeur = false;
    // Entrée sur un choix : passe à l'étape suivante plutôt que d'envoyer le formulaire
    if (e.key === 'Enter' && etat.etape < 4 && e.target.type === 'radio') {
      e.preventDefault();
      if (valide(etat.etape)) aller(etat.etape + 1);
    }
  });
  form.addEventListener('change', (e) => {
    const i = e.target;
    if (i.name === 'presta') {
      etat.presta = i.value;
      if (etat.pers && etat.pers !== 'premier' && !presta(i.value).pers.includes(etat.pers)) etat.pers = null;
      etat.t = null;
    } else if (i.name === 'pers') { etat.pers = i.value; etat.t = null; }
    else if (i.name === 'jour') { etat.k = +i.value; etat.t = null; rendreCreneaux(); }
    else if (i.name === 'creneau') { etat.t = +i.value; etat.qui = i.dataset.qui; }
    else return;
    btnSuiv.disabled = !valide(etat.etape);
    for (const b of $$('[data-aller]')) { const m = +b.dataset.aller; b.disabled = m > etat.max || (m > 1 && !valide(m - 1)); }
    majCarton();
    const suite = { presta: 2, pers: 3, creneau: 4 }[i.name];
    if (suite && viaPointeur) setTimeout(() => aller(suite), 240);
  });
  $('#prenom').addEventListener('input', (e) => { etat.prenom = e.target.value.trim(); majCarton(); });
  btnSuiv.addEventListener('click', () => valide(etat.etape) && aller(etat.etape + 1));
  btnPrec.addEventListener('click', () => aller(etat.etape - 1));
  $$('[data-aller]').forEach((b) => b.addEventListener('click', () => aller(+b.dataset.aller)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (etat.etape !== 4) return;
    const inp = $('#prenom');
    const err = $('[data-erreur]');
    const v = inp.value.trim();
    if (!v) { err.hidden = false; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
    err.hidden = true;
    inp.removeAttribute('aria-invalid');
    etat.prenom = v;
    const p = presta(etat.presta);
    const x = etat.jours.find((y) => y.j.k === etat.k);
    $('[data-fin-titre]').textContent = 'C’est noté, ' + v + '.';
    $('[data-fin-texte]').textContent = p.nom + ' avec ' + EQUIPE[etat.qui].nom + ', ' + dateLongue(x.j) + ' à ' + h(etat.t) + '. Comptez ' + duree(p.duree) + ', ' + euros(p.prix) + ' réglés au salon.';
    $('[data-tampon]').hidden = false;
    aller(5);
  });
  $('[data-recommencer]').addEventListener('click', () => {
    Object.assign(etat, { presta: null, pers: null, k: null, t: null, qui: null, prenom: '', max: 1, jours: [] });
    form.reset();
    $('[data-tampon]').hidden = true;
    aller(1);
  });

  // entrées depuis le reste de la page : miroirs, carte gravée, galerie
  function ouvrir(n) {
    etat.max = Math.max(etat.max, n);
    aller(n, false);
    $('#reserver').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const t = $(`[data-etape="${n}"] legend`);
    if (t) t.focus({ preventScroll: true });
  }
  $$('[data-choisir-pers]').forEach((b) => b.addEventListener('click', () => {
    etat.pers = b.dataset.choisirPers;
    etat.t = null;
    if (etat.presta && !presta(etat.presta).pers.includes(etat.pers)) etat.presta = null;
    ouvrir(etat.presta ? 3 : 1);
  }));
  $$('.ligne').forEach((b) => b.addEventListener('click', () => {
    etat.presta = b.dataset.presta;
    etat.t = null;
    if (etat.pers && etat.pers !== 'premier' && !presta(etat.presta).pers.includes(etat.pers)) etat.pers = null;
    ouvrir(etat.pers ? 3 : 2);
  }));
  $$('.meme').forEach((b) => b.addEventListener('click', () => {
    Object.assign(etat, { presta: b.dataset.presta, pers: b.dataset.pers, t: null });
    ouvrir(3);
  }));

  /* ── Menu, filtres de la galerie ───────────────────── */
  const menuBtn = $('.menu-btn');
  const nav = $('#nav-principale');
  const menu = (o) => { nav.classList.toggle('ouvert', o); menuBtn.setAttribute('aria-expanded', String(o)); };
  menuBtn.addEventListener('click', () => menu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) menu(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.devanture')) menu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { menu(false); menuBtn.focus(); }
  });
  $$('[data-filtre]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-filtre]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('.coupe').forEach((c) => (c.hidden = b.dataset.filtre !== 'tout' && c.dataset.cat !== b.dataset.filtre));
  }));

  rendreListe();
  rendreEtats();
  aller(1, false);
  requestAnimationFrame(() => $('.postes').classList.add('allume'));
  setInterval(rendreEtats, 60000);
})();
