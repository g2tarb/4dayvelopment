/* Cabanel Solaire (démo 4dayvelopment) : simulateur de toiture, bon de visite prérempli,
   frise des démarches, filtre des chantiers, menu. Aucun envoi réseau : c'est une démonstration. */
(() => {
  'use strict';
  const NNBSP = ' ', NBSP = ' ';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduit = matchMedia('(prefers-reduced-motion: reduce)');
  const glisse = () => (reduit.matches ? 'auto' : 'smooth');

  /* ---------- Menu (sous 64rem) ---------- */
  const burger = $('.burger');
  const menu = $('#menu');
  const ouvrirMenu = (ouvert) => {
    burger.setAttribute('aria-expanded', String(ouvert));
    burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    $('use', burger).setAttribute('href', ouvert ? '#i-fermer' : '#i-menu');
    menu.classList.toggle('ouvert', ouvert);
  };
  burger.addEventListener('click', () => ouvrirMenu(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) ouvrirMenu(false); });
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('ouvert') && !e.target.closest('.nav, .burger')) ouvrirMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { ouvrirMenu(false); burger.focus(); }
  });
  matchMedia('(min-width: 64rem)').addEventListener('change', (m) => { if (m.matches) ouvrirMenu(false); });

  /* ---------- Statut de l'atelier, à l'heure de Paris ---------- */
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const heure = paris.getHours() + paris.getMinutes() / 60;
  const ouvert = paris.getDay() % 6 !== 0 && heure >= 8 && heure < 18;
  const visite = new Date(paris); // deuxième jour ouvré qui suit : le temps de rappeler et de caler l'équipe
  for (let ouvres = 0; ouvres < 2;) { visite.setDate(visite.getDate() + 1); if (visite.getDay() % 6 !== 0) ouvres++; }
  const jour = visite.getDate() === 1 ? '1er' : String(visite.getDate());
  $('#statut').textContent = `${ouvert ? `Atelier ouvert jusqu’à 18${NBSP}h` : 'Atelier fermé'} · `
    + `prochaine visite libre le ${JOURS[visite.getDay()]} ${jour}${NBSP}${MOIS[visite.getMonth()]}`;
  $('.statut').classList.toggle('ferme', !ouvert);

  /* ---------- Simulateur de toiture ---------- */
  const WC = 425;                    // puissance d'un panneau, en Wc
  const M2 = 1.722 * 1.134;          // surface d'un panneau, en m²
  const JAUGE_MAX = 12;              // kWc au bout de la jauge ; le seuil de 9 kWc tombe aux trois quarts
  const NS = 'http://www.w3.org/2000/svg';
  const simu = $('#simulateur');
  const fr = (v, dec) => v.toLocaleString('fr-FR', { maximumFractionDigits: dec });
  const el = (nom, attrs, parent) => {
    const e = document.createElementNS(NS, nom);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };
  // ex, ey : taille d'une unité du repère en pixels, pour garder le « + » et les arrondis lisibles
  const creerSlot = (parent, x, y, l, h, motif, ex, ey) => {
    const g = el('g', { class: 'slot', transform: `translate(${x} ${y})`, role: 'checkbox', 'aria-checked': 'false', tabindex: '-1' }, parent);
    el('rect', { class: 'slot-fond', width: l, height: h, rx: 2 / ex, ry: 2 / ey, 'vector-effect': 'non-scaling-stroke' }, g);
    el('path', { class: 'slot-plus', 'vector-effect': 'non-scaling-stroke',
      d: `M${l / 2 - 5 / ex} ${h / 2}h${10 / ex}M${l / 2} ${h / 2 - 5 / ey}v${10 / ey}` }, g);
    const pv = el('g', { class: 'slot-pv' }, g);
    el('rect', { width: l, height: h, fill: `url(#${motif})` }, pv);
    el('rect', { width: l, height: h, fill: 'url(#g-reflet)' }, pv);
    el('rect', { class: 'voile', width: l, height: h }, pv);
    el('rect', { class: 'cadre', width: l, height: h, rx: 1.5 / ex, ry: 1.5 / ey, 'vector-effect': 'non-scaling-stroke' }, pv);
    return g;
  };

  /* Pan face au sud (repère en pixels du dessin) : trois rangées dans le trapèze du toit à quatre pentes.
     La souche prend une place de la rangée du haut ; ses deux voisines sont à son ombre. */
  const RANGS_FACE = [{ y: 250, x: 156.5, n: 10 }, { y: 190, x: 205.5, n: 8 }, { y: 130, x: 254.5, n: 6 }];
  const SOUCHE = '2-5', OMBRE = ['2-4', '1-6'];
  const NOM_RANG = ['du bas', 'du milieu', 'du haut'];
  const slots = { face: [], pignon: [] };
  RANGS_FACE.forEach((r, ri) => {
    for (let c = 0; c < r.n; c++) {
      const cle = `${ri}-${c}`;
      if (cle === SOUCHE) continue;
      const g = creerSlot($('.slots[data-vue="face"]'), r.x + c * 49, r.y, 46, 56, 'p-cellules', 1, 1);
      slots.face.push({ g, rang: ri, col: c, n: r.n, ombre: OMBRE.includes(cle), pan: '' });
    }
  });
  /* Deux pans est et ouest (repère en mètres de chaque pan : x le long de la pente, y le long du faîtage).
     Panneaux couchés, 3 rangées de 4 par pan. */
  ['ouest', 'est'].forEach((pan) => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const g = creerSlot($(`.slots[data-vue="${pan}"]`), 1.239 + r * 1.194, 0.966 + c * 1.782, 1.134, 1.722, 'p-cellules-m', 46.667, 20);
        slots.pignon.push({ g, rang: 2 - r, col: c, n: 4, ombre: false, pan });
      }
    }
  });
  Object.values(slots).flat().forEach((s) => {
    s.g.setAttribute('aria-label', `Emplacement ${s.col + 1} sur ${s.n}, rangée ${NOM_RANG[s.rang]}`
      + `${s.pan ? `, pan ${s.pan}` : ''}${s.ombre ? ', à l’ombre de la souche' : ''}`);
    s.g._s = s;
    s.g.classList.toggle('slot-ombre', s.ombre);
  });
  // ordre de remplissage : rangée du bas d'abord, du centre vers les bords, l'ombre en dernier ; est et ouest en alternance
  const centre = (s) => Math.abs(s.col - (s.n - 1) / 2);
  const ordre = {
    face: [...slots.face].sort((a, b) => (a.ombre - b.ombre) || (a.rang - b.rang) || (centre(a) - centre(b)) || (a.col - b.col)),
    pignon: (() => {
      const tri = (pan) => slots.pignon.filter((s) => s.pan === pan).sort((a, b) => (a.rang - b.rang) || (centre(a) - centre(b)) || (a.col - b.col));
      const e = tri('est'), o = tri('ouest');
      return e.flatMap((s, i) => [s, o[i]]);
    })(),
  };
  // ordre de lecture au clavier : de haut en bas, de gauche à droite (pan ouest puis pan est)
  const lecture = {
    face: [...slots.face].sort((a, b) => (b.rang - a.rang) || (a.col - b.col)),
    pignon: [...slots.pignon].sort((a, b) => ((a.pan === 'est') - (b.pan === 'est')) || (b.rang - a.rang) || (a.col - b.col)),
  };

  const curseur = $('#curseur'), moins = $('#moins'), plus = $('#plus');
  const PAN = { sud: 'pan sud', 'sud-est': 'pan sud-est', 'sud-ouest': 'pan sud-ouest', 'est-ouest': 'pans est et ouest' };
  const NOTE = {
    sud: 'Un seul pan couvert, tourné vers le sud.',
    'sud-est': 'Un pan tourné vers le sud-est, au soleil dès le matin.',
    'sud-ouest': 'Un pan tourné vers le sud-ouest, au soleil l’après-midi.',
    'est-ouest': `Plein sud n’est pas une obligation${NNBSP}: un toit est-ouest produit plus tôt le matin et plus tard le soir.`,
  };
  let orientation = 'sud', vue = 'face', actif = null, calme = true, minuterie = 0;
  const poses = () => slots[vue].filter((s) => s.pose);
  const poser = (s, on) => {
    s.pose = on;
    s.g.classList.toggle('pose', on);
    s.g.setAttribute('aria-checked', String(on));
  };
  const config = () => {
    const n = poses().length;
    return { n, kwc: fr((n * WC) / 1000, 3), m2: n ? (n * M2).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0', dans: n * WC <= 9000, pan: PAN[orientation] };
  };
  const libelle = (c) => (c.n
    ? `${c.n}${NBSP}panneau${c.n > 1 ? 'x' : ''} de 425${NBSP}Wc, ${c.kwc}${NBSP}kWc, ${c.m2}${NBSP}m², ${c.pan}`
    : `Aucun panneau posé, ${c.pan}${NNBSP}: nous dimensionnerons avec vous`);

  const maj = () => {
    const c = config(), max = slots[vue].length;
    $('#m-n').textContent = c.n;
    $('#m-kwc').textContent = c.kwc;
    $('#m-m2').textContent = c.m2;
    curseur.max = max;
    curseur.value = c.n;
    curseur.setAttribute('aria-valuetext', `${c.n} panneau${c.n > 1 ? 'x' : ''}, ${c.kwc} kWc`);
    curseur.style.setProperty('--p', `${(c.n / max) * 100}%`);
    moins.disabled = c.n === 0;
    plus.disabled = c.n === max;
    const etat = $('.etat');
    etat.classList.toggle('au-dela', !c.dans);
    $('#jauge-rempli').style.setProperty('--k', Math.min((c.n * WC) / 1000 / JAUGE_MAX, 1));
    $('#jauge-txt').textContent = c.dans
      ? `Dans le seuil de 9${NBSP}kWc${NNBSP}: le surplus que vous revendez est acheté 1,1${NBSP}c€${NBSP}HT le kWh par EDF${NBSP}OA.`
      : `Au-dessus de 9${NBSP}kWc${NNBSP}: le tarif de 1,1${NBSP}c€${NBSP}HT le kWh ne concerne que les installations de 9${NBSP}kWc ou moins. Nous vous indiquons le vôtre au devis.`;
    $('#alerte-ombre').hidden = !poses().some((s) => s.ombre);
    // le bon de visite et la barre de suivi reprennent la configuration
    const txt = libelle(c);
    $('#bon-config').textContent = txt;
    $('#bon-config-champ').value = txt;
    $('#suivi-n').textContent = c.n;
    $('#suivi-kwc').textContent = c.kwc;
    $('#suivi-o').textContent = `, ${c.pan}`;
    if (!calme) {
      clearTimeout(minuterie);
      minuterie = setTimeout(() => { $('#annonce').textContent = `${c.n} panneau${c.n > 1 ? 'x' : ''}, ${c.kwc} kWc, ${c.m2} m²`; }, 450);
    }
  };
  const ajouter = () => { const s = ordre[vue].find((x) => !x.pose); if (s) poser(s, true); };
  const retirer = () => { const s = [...ordre[vue]].reverse().find((x) => x.pose); if (s) poser(s, false); };
  const regler = (n) => {
    n = Math.max(0, Math.min(n, slots[vue].length));
    while (poses().length < n) ajouter();
    while (poses().length > n) retirer();
    maj();
  };
  // un seul emplacement est dans l'ordre de tabulation ; les flèches passent aux autres
  const rendreActif = (s, focus) => {
    if (actif) actif.g.setAttribute('tabindex', '-1');
    actif = s;
    s.g.setAttribute('tabindex', '0');
    if (focus) s.g.focus();
  };
  const orienter = (o) => {
    const n = poses().length, v = o === 'est-ouest' ? 'pignon' : 'face';
    orientation = o;
    simu.dataset.o = o;
    $('#orient-note').textContent = NOTE[o];
    if (v !== vue) {
      slots[vue].forEach((s) => poser(s, false));
      vue = v;
      rendreActif(lecture[vue][0], false);
      regler(n);
    } else maj();
  };

  plus.addEventListener('click', () => { calme = false; ajouter(); maj(); });
  moins.addEventListener('click', () => { calme = false; retirer(); maj(); });
  curseur.addEventListener('input', () => { calme = false; regler(Number(curseur.value)); });
  $$('input[name="orientation"]').forEach((r) => r.addEventListener('change', () => { calme = false; orienter(r.value); }));
  $('.toit').addEventListener('click', (e) => {
    const g = e.target.closest('.slot');
    if (!g) return;
    calme = false;
    poser(g._s, !g._s.pose);
    rendreActif(g._s, false);
    maj();
  });
  $('.toit').addEventListener('keydown', (e) => {
    const g = e.target.closest('.slot');
    if (!g) return;
    const liste = lecture[vue], i = liste.indexOf(g._s);
    const cible = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: liste.length - 1 }[e.key];
    if (cible !== undefined) {
      e.preventDefault();
      rendreActif(liste[Math.max(0, Math.min(cible, liste.length - 1))], true);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      calme = false;
      poser(g._s, !g._s.pose);
      maj();
    }
  });

  // mise en route : douze panneaux se posent un à un (d'un coup si le mouvement est réduit)
  rendreActif(lecture.face[0], false);
  const DEPART = 12;
  if (reduit.matches) regler(DEPART);
  else {
    maj();
    let k = 0;
    const suivant = () => { if (k++ < DEPART && calme) { ajouter(); maj(); setTimeout(suivant, 55); } };
    setTimeout(suivant, 250);
  }

  /* ---------- Bon de visite : « Faire vérifier mon toit » ---------- */
  const bon = $('#bon');
  bon.noValidate = true; // sans script, la validation native du navigateur reste en place
  const telNu = () => bon.tel.value.replace(/[\s.\-]/g, '').replace(/^\+33/, '0');
  const erreur = (id, msg) => {
    $(`#${id}-err`).textContent = msg;
    bon[id].setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const regles = {
    commune: () => (bon.commune.value.trim().length >= 2 ? '' : 'Indiquez votre commune, par exemple Sérignan.'),
    nom: () => (bon.nom.value.trim().length >= 2 ? '' : 'Indiquez votre nom.'),
    tel: () => (/^0[1-9]\d{8}$/.test(telNu()) ? '' : `Indiquez un numéro à 10 chiffres, par exemple 06${NBSP}12${NBSP}34${NBSP}56${NBSP}78.`),
  };
  Object.keys(regles).forEach((id) => bon[id].addEventListener('input', () => {
    if (bon[id].getAttribute('aria-invalid') === 'true') erreur(id, regles[id]());
  }));
  const basculerBon = (envoye) => {
    $$('.bon-champs, .bon-pied', bon).forEach((b) => { b.hidden = envoye; });
    $('#bon-ok').hidden = !envoye;
  };
  bon.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = Object.keys(regles).map((id) => erreur(id, regles[id]()));
    const premier = Object.keys(regles)[ok.indexOf(false)];
    if (premier) { bon[premier].focus(); return; }
    const tel = telNu().replace(/(\d{2})(?=\d)/g, `$1${NBSP}`);
    $('#bon-ok-txt').textContent = `Dans la version en ligne, Cabanel Solaire vous rappelle sous 24${NBSP}h ouvrées au ${tel} `
      + `pour fixer la visite de votre toit à ${bon.commune.value.trim()}. Couverture${NNBSP}: ${bon.couverture.value.toLowerCase()}. `
      + `Configuration${NNBSP}: ${libelle(config())}.`;
    basculerBon(true);
    $('#bon-ok').focus();
  });
  $('#bon-refaire').addEventListener('click', () => { basculerBon(false); bon.nom.focus(); });

  /* ---------- Frise des démarches : onglets, flèches du clavier, précédent et suivant ---------- */
  const piste = $('.frise-piste');
  const onglets = $$('.etape-btn'), panneaux = $$('.etape-panneau');
  const prec = $('#frise-prec'), suiv = $('#frise-suiv');
  let etape = 0;
  const choisir = (i, focus) => {
    etape = i;
    onglets.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
      t.classList.toggle('fait', k < i);
      panneaux[k].hidden = k !== i;
    });
    prec.disabled = i === 0;
    suiv.disabled = i === onglets.length - 1;
    const t = onglets[i];
    piste.scrollTo({ left: t.offsetLeft - (piste.clientWidth - t.offsetWidth) / 2, behavior: glisse() });
    if (focus) t.focus();
  };
  onglets.forEach((t, k) => t.addEventListener('click', () => choisir(k, false)));
  piste.addEventListener('keydown', (e) => {
    const cible = { ArrowRight: etape + 1, ArrowLeft: etape - 1, Home: 0, End: onglets.length - 1 }[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    choisir((cible + onglets.length) % onglets.length, true);
  });
  prec.addEventListener('click', () => choisir(etape - 1, false));
  suiv.addEventListener('click', () => choisir(etape + 1, false));
  choisir(0, false);

  /* ---------- Chantiers : filtre par couverture, configuration chargée sur le toit ---------- */
  const filtres = $$('.filtre'), cartes = $$('.chantier');
  const filtrer = (f) => {
    let n = 0;
    filtres.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    cartes.forEach((c) => { const ok = f === 'tous' || c.dataset.toit === f; c.hidden = !ok; n += ok; });
    return n;
  };
  filtres.forEach((b) => b.addEventListener('click', () => {
    const n = filtrer(b.dataset.f);
    $('#ch-annonce').textContent = `${n} chantier${n > 1 ? 's' : ''} affiché${n > 1 ? 's' : ''}`;
  }));
  // un repère de la carte mène toujours à sa fiche, même si un filtre la cachait
  $$('.reperes a').forEach((a) => a.addEventListener('click', () => filtrer('tous')));
  $$('.chantier-charger').forEach((b) => b.addEventListener('click', () => {
    calme = false;
    const o = b.dataset.o;
    $(`input[name="orientation"][value="${o}"]`).checked = true;
    orienter(o);
    regler(Number(b.dataset.n));
    simu.scrollIntoView({ behavior: glisse(), block: 'start' });
    curseur.focus({ preventScroll: true });
    clearTimeout(minuterie);
    const c = config();
    $('#annonce').textContent = `Configuration de ${b.dataset.lieu} chargée${NNBSP}: ${c.n} panneaux, ${c.kwc} kWc, ${c.pan}.`;
  }));

  /* ---------- Barre de suivi : la configuration suit le visiteur hors du simulateur ---------- */
  const suivi = $('#suivi');
  if ('IntersectionObserver' in window) {
    const vus = new Map();
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((en) => vus.set(en.target, en.isIntersecting));
      const montrer = ![...vus.values()].some(Boolean);
      suivi.classList.toggle('visible', montrer);
      suivi.inert = !montrer;
    }, { rootMargin: '0px 0px -15% 0px' });
    [simu, $('#verifier')].forEach((s) => { vus.set(s, true); io.observe(s); });
  }
})();
