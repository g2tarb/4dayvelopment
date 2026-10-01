/* Lunule (démo 4dayvelopment) : nuancier, carte des soins, carnet de rendez-vous.
   Aucune donnée n’est envoyée : la confirmation reste dans la page. */
(function () {
  'use strict';
  var racine = document.documentElement;
  racine.classList.add('js');
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  function aller(el, focus) {
    el.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
    if (focus) focus.focus({ preventScroll: true });
  }

  /* ── Formats français ── */
  var NB = ' ';
  function heure(m) {
    var h = Math.floor(m / 60), mn = m % 60;
    return h + NB + 'h' + (mn ? NB + String(mn).padStart(2, '0') : '');
  }
  function duree(m) {
    if (m < 60) return m + NB + 'min';
    return Math.floor(m / 60) + NB + 'h' + (m % 60 ? NB + (m % 60) : '');
  }
  var fmtJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  var fmtCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
  function cle(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  /* ── Menu (téléphone) ── */
  var nav = $('.nav'), navBouton = $('.nav-bouton');
  function menu(ouvrir) {
    if (ouvrir) nav.setAttribute('data-ouvert', ''); else nav.removeAttribute('data-ouvert');
    navBouton.setAttribute('aria-expanded', String(ouvrir));
  }
  navBouton.addEventListener('click', function () { menu(!nav.hasAttribute('data-ouvert')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.hasAttribute('data-ouvert')) { menu(false); navBouton.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.hasAttribute('data-ouvert') && (!nav.contains(e.target) || e.target.closest('.nav-liste a'))) menu(false);
  });

  /* ── Le nuancier ── */
  var etat = { teinte: 't05', forme: 'amande', peau: 'médium', touche: false };
  var NOMS_FORME = { amande: 'amande', carre: 'carrée', ovale: 'ovale' };

  // Le contour d’un ongle, posé au bout d’un doigt de largeur fw dont le sommet est en (cx, top).
  function cheminOngle(cx, top, fw, forme) {
    var w = fw * 0.7, l = cx - w / 2, r = cx + w / 2;
    var yt = top + fw * 0.12, yc = top + fw * 0.92, d = w * 0.42, yf, p;
    var base = 'M' + l + ' ' + yt + 'L' + l + ' ' + yc + 'C' + l + ' ' + (yc + d) + ' ' + r + ' ' + (yc + d) + ' ' + r + ' ' + yc;
    if (forme === 'carre') {
      yf = top - fw * 0.12; var rad = w * 0.14;
      p = base + 'L' + r + ' ' + (yf + rad) + 'Q' + r + ' ' + yf + ' ' + (r - rad) + ' ' + yf + 'L' + (l + rad) + ' ' + yf + 'Q' + l + ' ' + yf + ' ' + l + ' ' + (yf + rad) + 'Z';
    } else if (forme === 'ovale') {
      yf = top - fw * 0.16;
      p = base + 'L' + r + ' ' + yt + 'A' + (w / 2) + ' ' + (yt - yf) + ' 0 0 0 ' + l + ' ' + yt + 'Z';
    } else {
      yf = top - fw * 0.42; var k = (yt - yf) * 0.55;
      p = base + 'L' + r + ' ' + yt + 'C' + r + ' ' + (yt - k) + ' ' + (cx + w * 0.17) + ' ' + yf + ' ' + cx + ' ' + yf +
        'C' + (cx - w * 0.17) + ' ' + yf + ' ' + l + ' ' + (yt - k) + ' ' + l + ' ' + yt + 'Z';
    }
    var x = l + w * 0.24;
    var reflet = 'M' + x + ' ' + (yc - fw * 0.1) + 'L' + x + ' ' + (yt + (forme === 'amande' ? -fw * 0.12 : fw * 0.04));
    var arrondi = function (s) { return s.replace(/\d+\.\d+/g, function (n) { return (+n).toFixed(1); }); };
    return { ongle: arrondi(p), reflet: arrondi(reflet) };
  }

  function dessinerMain() {
    $$('.doigt').forEach(function (g) {
      var c = cheminOngle(+g.dataset.cx, +g.dataset.top, +g.dataset.l, etat.forme);
      $('.ongle', g).setAttribute('d', c.ongle);
      $('.reflet', g).setAttribute('d', c.reflet);
    });
  }

  function nomTeinte(id) {
    var el = $('.tip.' + id + ' [data-nom]');
    return el ? el.textContent : '';
  }
  function texteTeinte() { return nomTeinte(etat.teinte) + ', forme ' + NOMS_FORME[etat.forme]; }

  function appliquer() {
    var tip = $('.tip.' + etat.teinte), peau = $('.peau input[value="' + etat.peau + '"]').parentNode;
    var cs = getComputedStyle(tip), cp = getComputedStyle(peau);
    racine.style.setProperty('--vernis', cs.getPropertyValue('--c').trim());
    racine.style.setProperty('--peau', cp.getPropertyValue('--s').trim());
    racine.style.setProperty('--peau-ombre', cp.getPropertyValue('--so').trim());
    racine.dataset.forme = etat.forme;
    dessinerMain();
    var nom = nomTeinte(etat.teinte), i = nom.indexOf(' ');
    $('#plaque-num').textContent = nom.slice(0, i);
    $('#plaque-nom').textContent = nom.slice(i + 1);
    $('#plaque-detail').textContent = 'Forme ' + NOMS_FORME[etat.forme] + ', peau ' + etat.peau;
    $('#teinte-txt').textContent = texteTeinte();
  }

  function choisirTeinte(teinte, forme) {
    if (teinte) { etat.teinte = teinte; $('.tip input[value="' + teinte + '"]').checked = true; }
    if (forme) { etat.forme = forme; $('.forme input[value="' + forme + '"]').checked = true; }
    etat.touche = true;
    appliquer();
  }

  $('#atelier').addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'teinte') etat.teinte = t.value;
    else if (t.name === 'forme') etat.forme = t.value;
    else if (t.name === 'peau') etat.peau = t.value;
    etat.touche = true;
    appliquer();
  });

  // « Essayer » depuis les réalisations et l’équipe : la teinte remonte sur la main.
  $$('.essayer').forEach(function (b) {
    b.addEventListener('click', function () {
      choisirTeinte(b.dataset.teinte, b.dataset.forme);
      aller($('#atelier'), $('.tip input:checked'));
    });
  });

  appliquer();

  /* ── Horaires et carnet de l’institut (fictif, mais stable d’un chargement à l’autre) ── */
  var OUVERTURE = { 0: [600, 840], 1: null, 2: [600, 1170], 3: [600, 1170], 4: [600, 1260], 5: [600, 1170], 6: [570, 1140] };
  var PROS = {
    ines: { nom: 'Inès', jours: [2, 3, 4, 5, 6] },
    sofia: { nom: 'Sofia', jours: [0, 2, 3, 5, 6] },
    margaux: { nom: 'Margaux', jours: [2, 4, 5, 6] }
  };
  var ORDRE = ['ines', 'sofia', 'margaux'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function graine(s) { // mulberry32 sur un hachage de la chaîne
    var h = 1779033703 ^ s.length;
    for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () {
      h = (h + 0x6D2B79F5) | 0; var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var cacheOccupe = {};
  function occupe(date, pro) { // rendez-vous déjà pris ce jour-là
    var k = cle(date) + pro;
    if (cacheOccupe[k]) return cacheOccupe[k];
    var h = OUVERTURE[date.getDay()], alea = graine(k), blocs = [], t = h[0];
    if (h[1] - h[0] > 300) blocs.push([780, 825]); // pause déjeuner
    while (t < h[1]) {
      if (alea() < 0.35) { var d = [30, 45, 45, 60, 75, 90][Math.floor(alea() * 6)]; blocs.push([t, t + d]); t += d; }
      else t += 15 * (1 + Math.floor(alea() * 3));
    }
    return (cacheOccupe[k] = blocs);
  }
  function libresPro(date, pro, d, minimum) {
    var h = OUVERTURE[date.getDay()];
    if (!h || PROS[pro].jours.indexOf(date.getDay()) < 0) return [];
    var blocs = occupe(date, pro), res = [];
    for (var t = h[0]; t + d <= h[1]; t += 30) {
      if (t < minimum) continue;
      if (!blocs.some(function (b) { return b[0] < t + d && b[1] > t; })) res.push(t);
    }
    return res;
  }
  // Créneaux libres pour une durée, avec une praticienne précise ou la première disponible.
  function libres(date, pros, d) {
    var now = new Date(), minimum = 0;
    if (cle(date) === cle(now)) minimum = now.getHours() * 60 + now.getMinutes() + 30;
    var parHeure = {};
    pros.forEach(function (p) {
      libresPro(date, p, d, minimum).forEach(function (t) { if (!(t in parHeure)) parHeure[t] = p; });
    });
    return Object.keys(parHeure).map(Number).sort(function (a, b) { return a - b; })
      .map(function (t) { return { t: t, pro: parHeure[t] }; });
  }
  function joursOuverts(n) {
    var res = [], d = new Date(); d.setHours(12, 0, 0, 0);
    while (res.length < n) { if (OUVERTURE[d.getDay()]) res.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return res;
  }
  function nomJour(date) {
    var auj = new Date(), dem = new Date(); dem.setDate(auj.getDate() + 1);
    if (cle(date) === cle(auj)) return 'Aujourd’hui';
    if (cle(date) === cle(dem)) return 'Demain';
    var s = fmtCourt.format(date).replace('.', '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function quand(date, t) {
    var auj = new Date(), dem = new Date(); dem.setDate(auj.getDate() + 1);
    var j = cle(date) === cle(auj) ? 'aujourd’hui' : cle(date) === cle(dem) ? 'demain' : fmtJour.format(date);
    return j + ' à ' + heure(t);
  }
  function maj1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ── Ouvert maintenant ? ── */
  (function statut() {
    var now = new Date(), j = now.getDay(), m = now.getHours() * 60 + now.getMinutes(), h = OUVERTURE[j];
    var txt, ouvert = false;
    if (h && m >= h[0] && m < h[1]) { txt = 'Ouvert jusqu’à ' + heure(h[1]); ouvert = true; }
    else if (h && m < h[0]) txt = 'Fermé, ouverture à ' + heure(h[0]);
    else {
      var k = 1; while (!OUVERTURE[(j + k) % 7]) k++;
      var jn = (j + k) % 7;
      txt = 'Fermé, réouverture ' + (k === 1 ? 'demain' : JOURS[jn]) + ' à ' + heure(OUVERTURE[jn][0]);
    }
    var dd = $('#etat-jour');
    dd.textContent = txt; dd.classList.toggle('ouvert', ouvert);
    var pill = $('#etat-venir');
    pill.textContent = ouvert ? 'Ouvert en ce moment' : 'Fermé en ce moment';
    pill.classList.add(ouvert ? 'ouvert' : 'ferme');
    var ligne = $('.horaires tr[data-j="' + j + '"]');
    if (ligne) {
      ligne.classList.add('aujourdhui');
      var marque = document.createElement('span');
      marque.className = 'marque-jour'; marque.textContent = 'aujourd’hui';
      $('th', ligne).appendChild(marque);
    }
  })();

  /* ── Onglets de la carte ── */
  var onglets = $$('[role="tab"]');
  function ouvrirOnglet(o, focus) {
    onglets.forEach(function (x) {
      var actif = x === o;
      x.setAttribute('aria-selected', String(actif));
      x.tabIndex = actif ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !actif;
    });
    if (focus) o.focus();
  }
  onglets.forEach(function (o, i) {
    o.addEventListener('click', function () { ouvrirOnglet(o); });
    o.addEventListener('keydown', function (e) {
      var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: onglets.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      ouvrirOnglet(onglets[(n + onglets.length) % onglets.length], true);
    });
  });
  ouvrirOnglet(onglets[0]);

  /* ── Carnet : prestation, praticienne, créneau ── */
  var form = $('#resa'), select = $('#presta'), zoneJours = $('#jours'), zoneHeures = $('#heures');
  var SOINS = {};
  $$('.panneau').forEach(function (p) {
    var groupe = document.createElement('optgroup');
    groupe.label = p.dataset.famille;
    $$('.soin', p).forEach(function (li) {
      var s = {
        id: li.dataset.id, nom: $('h3', li).textContent, duree: +li.dataset.duree, prix: +li.dataset.prix,
        qui: li.dataset.qui.split(' '), teinte: li.hasAttribute('data-teinte'), li: li
      };
      SOINS[s.id] = s;
      var o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.nom + ', ' + duree(s.duree) + ', ' + s.prix + NB + '€';
      groupe.appendChild(o);
    });
    select.appendChild(groupe);
  });
  var rolesPro = {};
  $$('.pro[data-pro]').forEach(function (l) { rolesPro[l.dataset.pro] = $('small', l).textContent; });

  var choix = { jour: null, t: null, pro: null };
  function soin() { return SOINS[select.value] || null; }
  function proChoisie() { var r = $('input[name="pro"]:checked', form); return r ? r.value : ''; }

  function majPros() {
    var s = soin();
    $$('.pro[data-pro]').forEach(function (l) {
      var input = $('input', l), ok = !s || s.qui.indexOf(l.dataset.pro) >= 0;
      input.disabled = !ok;
      $('small', l).textContent = ok ? rolesPro[l.dataset.pro] : 'Ne fait pas ce soin';
      if (!ok && input.checked) $('input[name="pro"][value=""]', form).checked = true;
    });
  }
  function prosPossibles() {
    var s = soin(), p = proChoisie();
    if (!s) return [];
    return p ? [p] : ORDRE.filter(function (x) { return s.qui.indexOf(x) >= 0; });
  }

  function majJours() {
    var s = soin(), pros = prosPossibles();
    zoneJours.textContent = '';
    choix.t = null;
    if (!s) { zoneHeures.innerHTML = '<p class="vide">Choisissez d’abord une prestation.</p>'; majRecap(); return; }
    var premier, dispo = [], garde = choix.jour && cle(choix.jour);
    joursOuverts(7).forEach(function (date, i) {
      var n = libres(date, pros, s.duree).length;
      var absente = pros.every(function (p) { return PROS[p].jours.indexOf(date.getDay()) < 0; });
      var label = document.createElement('label');
      label.className = 'jour';
      label.innerHTML = '<input type="radio" name="jour" value="' + i + '"><strong></strong><span></span>';
      $('strong', label).textContent = nomJour(date);
      $('span', label).textContent = absente ? (pros.length === 1 ? PROS[pros[0]].nom + ' absente' : 'Fermé') :
        n === 0 ? 'Complet' : n + (n > 1 ? ' créneaux' : ' créneau');
      var input = $('input', label);
      input.disabled = n === 0;
      input._date = date;
      if (n) dispo.push(input);
      zoneJours.appendChild(label);
    });
    premier = dispo.filter(function (x) { return cle(x._date) === garde; })[0] || dispo[0] || null;
    if (premier) { premier.checked = true; choix.jour = premier._date; } else choix.jour = null;
    majHeures();
  }

  function majHeures() {
    var s = soin();
    zoneHeures.textContent = '';
    choix.t = null;
    if (!s || !choix.jour) {
      zoneHeures.innerHTML = '<p class="vide">' + (s ? 'Aucun créneau libre cette semaine avec ce choix. Appelez-nous, on trouve souvent une place.' : 'Choisissez d’abord une prestation.') + '</p>';
      majRecap(); return;
    }
    var liste = libres(choix.jour, prosPossibles(), s.duree);
    [['Matin', 0, 720], ['Après-midi', 720, 1080], ['Soir', 1080, 1440]].forEach(function (g) {
      var dans = liste.filter(function (c) { return c.t >= g[1] && c.t < g[2]; });
      if (!dans.length) return;
      var bloc = document.createElement('div');
      bloc.className = 'heures-groupe';
      bloc.setAttribute('role', 'group');
      bloc.setAttribute('aria-label', g[0]);
      bloc.innerHTML = '<p aria-hidden="true">' + g[0] + '</p><div class="creneaux"></div>';
      dans.forEach(function (c) {
        var l = document.createElement('label');
        l.className = 'creneau';
        l.innerHTML = '<input type="radio" name="heure" value="' + c.t + '"><span></span>';
        $('span', l).textContent = heure(c.t);
        $('input', l)._pro = c.pro;
        $('.creneaux', bloc).appendChild(l);
      });
      zoneHeures.appendChild(bloc);
    });
    majRecap();
  }

  function majRecap() {
    var s = soin(), p = proChoisie();
    $('#r-presta').textContent = s ? s.nom : 'À choisir';
    $('#r-prix').textContent = s ? duree(s.duree) + ', ' + s.prix + NB + '€' : ' ';
    $('#r-pro').textContent = choix.t !== null ? PROS[choix.pro].nom : p ? PROS[p].nom : 'La première disponible';
    $('#r-quand').textContent = choix.t !== null ? maj1(quand(choix.jour, choix.t)) : 'À choisir';
    $('#teinte-choisie').hidden = !(s && s.teinte);
    $$('.soin.est-choisi').forEach(function (li) { li.classList.remove('est-choisi'); $('.choisir', li).textContent = 'Choisir'; });
    if (s) { s.li.classList.add('est-choisi'); $('.choisir', s.li).textContent = 'Choisi'; }
  }

  function choisirSoin(id) {
    select.value = id;
    majPros(); majJours();
  }
  select.addEventListener('change', function () { majPros(); majJours(); });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'pro') majJours();
    else if (t.name === 'jour') { choix.jour = t._date; majHeures(); }
    else if (t.name === 'heure') { choix.t = +t.value; choix.pro = t._pro; majRecap(); erreur(''); }
  });

  // « Choisir » dans la carte : la prestation passe dans le carnet.
  $$('.choisir').forEach(function (b) {
    b.addEventListener('click', function () {
      choisirSoin(b.closest('.soin').dataset.id);
      aller($('#carnet'), select);
    });
  });
  // Réserver depuis le nuancier : une pose avec la teinte choisie.
  $$('[data-resa-teinte]').forEach(function (a) {
    a.addEventListener('click', function () {
      var s = soin();
      var avecTeinte = a.closest('.essai') || etat.touche;
      if (avecTeinte && (!s || !s.teinte)) choisirSoin('semi-mains');
    });
  });
  // Réserver avec une praticienne précise.
  var DEFAUT = { ines: 'semi-mains', sofia: 'semi-mains', margaux: 'eclat' };
  $$('.lien-resa[data-pro]').forEach(function (a) {
    a.addEventListener('click', function () {
      var p = a.dataset.pro, s = soin();
      if (!s || s.qui.indexOf(p) < 0) { select.value = DEFAUT[p]; majPros(); }
      $('input[name="pro"][value="' + p + '"]', form).checked = true;
      majJours();
    });
  });

  /* ── Confirmation (rien n’est envoyé) ── */
  var zoneErreur = $('#resa-erreur');
  function erreur(msg, champ) {
    zoneErreur.textContent = msg;
    $$('[aria-invalid]', form).forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (champ) { champ.setAttribute('aria-invalid', 'true'); champ.focus(); }
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = soin(), prenom = $('#prenom'), tel = $('#tel');
    var chiffres = tel.value.replace(/\D/g, '').replace(/^33/, '0');
    if (!s) return erreur('Choisissez une prestation dans la liste.', select);
    if (choix.t === null) return erreur('Choisissez un créneau à l’étape 3.', $('input[name="heure"]', form) || $('input[name="jour"]:not(:disabled)', form));
    if (!prenom.value.trim()) return erreur('Indiquez votre prénom.', prenom);
    if (!/^0[1-9]\d{8}$/.test(chiffres)) return erreur('Le numéro doit compter 10 chiffres, par exemple 06 12 34 56 78.', tel);
    erreur('');
    var detail = maj1(quand(choix.jour, choix.t)) + ' avec ' + PROS[choix.pro].nom + '. ' + s.nom + ', ' + duree(s.duree) + ', ' + s.prix + NB + '€' +
      (s.teinte ? ', teinte ' + texteTeinte() : '') + '. Rappel par SMS au ' + tel.value.trim() + '.';
    $('#ok-t').textContent = 'C’est noté, ' + prenom.value.trim();
    $('#ok-txt').textContent = detail;
    form.hidden = true;
    $('#resa-ok').hidden = false;
    $('#ok-t').focus();
  });
  $('#ok-encore').addEventListener('click', function () {
    var precedent = select.value;
    form.reset();
    select.value = precedent;
    form.hidden = false;
    $('#resa-ok').hidden = true;
    choix = { jour: null, t: null, pro: null };
    majPros(); majJours();
    select.focus();
  });

  /* ── Prochain créneau pour une pose, affiché sous le nuancier ── */
  (function prochain() {
    var s = SOINS['semi-mains'], jours = joursOuverts(7);
    for (var i = 0; i < jours.length; i++) {
      var l = libres(jours[i], s.qui, s.duree);
      if (l.length) { $('#prochain').textContent = maj1(quand(jours[i], l[0].t)) + ' avec ' + PROS[l[0].pro].nom; return; }
    }
  })();

  choisirSoin('semi-mains'); // le carnet s’ouvre sur la prestation la plus demandée
})();
