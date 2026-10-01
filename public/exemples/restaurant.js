/* La Craie (démo 4dayvelopment), bistrot du 20e.
   L’ardoise du jour et la pancarte de la porte suivent l’heure de Paris ; le carnet de
   réservations ne transmet rien ; filtre allergènes de la carte ; estimateur de groupe.
   Paramètre de démonstration : ?moment=2026-10-06T13:10 simule une heure de Paris
   (pratique pour montrer la pancarte « fermé » en boutique à midi). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NB = ' ';

  /* ── Horaires : du mardi (2) au samedi (6), en minutes depuis minuit ── */
  const MIDI = [12 * 60, 14 * 60 + 30];
  const SOIR = [19 * 60, 22 * 60 + 30];
  const CRENEAUX = { midi: [12 * 60, 13 * 60 + 30], soir: [19 * 60, 21 * 60 + 30] };
  const ouvertLe = (j) => j >= 2 && j <= 6;
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const heure = (min) => `${Math.floor(min / 60)}${NB}h${min % 60 ? NB + String(min % 60).padStart(2, '0') : ''}`;
  const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ── L’ardoise de chaque jour de la semaine ── */
  const ARDOISES = {
    2: { entree: 'Velouté de potimarron, noisettes', plat: 'Joue de porc confite, purée de céleri', dessert: 'Riz au lait, caramel au beurre salé',
      soir: ['Tartare de bœuf au couteau, frites maison', 21], verre: `Côtes-du-rhône, 6${NB}€` },
    3: { entree: 'Poireaux vinaigrette, œuf mimosa', plat: 'Merlu rôti, beurre blanc, fenouil', dessert: 'Tarte fine aux pommes',
      soir: ['Ris de veau, carottes au cumin', 29], verre: `Muscadet sur lie, 6${NB}€` },
    4: { entree: 'Terrine de campagne, pickles d’oignon', plat: 'Bœuf bourguignon, pommes vapeur', dessert: 'Mousse au chocolat noir',
      soir: ['Côte de cochon fermier pour deux, jus corsé', 48], verre: `Morgon, 8${NB}€` },
    5: { entree: 'Œuf parfait, crème de champignons', plat: 'Lieu jaune, poireaux fondants, sauce vierge', dessert: 'Poire pochée au vin, sablé breton',
      soir: ['Moules de bouchot, frites maison', 19], verre: `Chardonnay du Jura, 8${NB}€` },
    6: { entree: 'Céleri rémoulade, pomme verte', plat: 'Blanquette de veau, riz pilaf', dessert: 'Île flottante, pralines roses',
      soir: ['Pigeon rôti, chou farci', 32], verre: `Saint-joseph, 9${NB}€` },
  };

  /* ── L’heure de Paris, quel que soit le fuseau du téléphone ── */
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function maintenant() {
    const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(new URLSearchParams(location.search).get('moment') || '');
    let y, mo, d, h, mi;
    if (m) [y, mo, d, h, mi] = m.slice(1).map(Number);
    else {
      const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
      [y, mo, d, h, mi] = [p.year, p.month, p.day, p.hour, p.minute].map(Number);
    }
    const date = new Date(Date.UTC(y, mo - 1, d)); // date civile de Paris, manipulée en UTC
    return { date, jour: date.getUTCDay(), min: h * 60 + mi };
  }
  const plusJours = (date, n) => new Date(date.getTime() + n * 864e5);
  const iso = (date) => date.toISOString().slice(0, 10);
  const dateLongue = (date) => `${JOURS[date.getUTCDay()]} ${date.getUTCDate() === 1 ? '1er' : date.getUTCDate()} ${MOIS[date.getUTCMonth()]}`;

  /* Ouvert ou fermé, et ce que dit la pancarte. decalage = nombre de jours jusqu’à l’ardoise à montrer. */
  function statut(jour, min) {
    if (ouvertLe(jour)) {
      if (min < MIDI[0]) return { ouvert: false, detail: `ouverture à ${heure(MIDI[0])}`, decalage: 0, service: 'midi' };
      if (min < MIDI[1]) return { ouvert: true, detail: `service jusqu’à ${heure(MIDI[1])}`, decalage: 0, service: 'midi' };
      if (min < SOIR[0]) return { ouvert: false, detail: `réouverture à ${heure(SOIR[0])}`, decalage: 0, service: 'soir' };
      if (min < SOIR[1]) return { ouvert: true, detail: `service jusqu’à ${heure(SOIR[1])}`, decalage: 0, service: 'soir' };
    }
    let k = 1;
    while (!ouvertLe((jour + k) % 7)) k++;
    const quand = k === 1 ? 'demain' : JOURS[(jour + k) % 7];
    return { ouvert: false, detail: `réouverture ${quand} à ${heure(MIDI[0])}`, decalage: k, service: 'midi' };
  }

  /* ── La pancarte et l’ardoise ── */
  const pancarte = $('#pancarte');
  const elDate = $('#ardoise-date');
  const onglets = $$('.ardoise-onglet');
  const boutonsJour = $$('.semaine-liste button');
  let ref = maintenant();
  let etat = statut(ref.jour, ref.min);

  function majPancarte() {
    ref = maintenant();
    etat = statut(ref.jour, ref.min);
    pancarte.dataset.etat = etat.ouvert ? 'ouvert' : 'ferme';
    $('#pancarte-mot').textContent = etat.ouvert ? 'Ouvert' : 'Fermé';
    $('#pancarte-detail').textContent = etat.detail;
  }

  function ecrireDate(date) {
    const n = date.getUTCDate();
    elDate.textContent = `${maj(JOURS[date.getUTCDay()])} ${n}`;
    if (n === 1) elDate.append(Object.assign(document.createElement('sup'), { textContent: 'er' }));
    elDate.append(` ${MOIS[date.getUTCMonth()]}`);
  }

  function montrerArdoise(jour) {
    const a = ARDOISES[jour];
    let k = (jour - ref.jour + 7) % 7;
    if (k === 0 && etat.decalage > 0) k = 7; // ce jour est passé : l’ardoise de la semaine prochaine
    ecrireDate(plusJours(ref.date, k));
    $('#a-entree').textContent = a.entree;
    $('#a-plat').textContent = a.plat;
    $('#a-dessert').textContent = a.dessert;
    $('#a-soir').textContent = a.soir[0];
    $('#a-soir-prix').textContent = `${a.soir[1]}${NB}€`;
    $('#a-verre').textContent = a.verre;
    boutonsJour.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.jour === jour)));
  }

  function montrerService(service) {
    onglets.forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.service === service)));
    $('#ardoise-midi').hidden = service !== 'midi';
    $('#ardoise-soir').hidden = service !== 'soir';
  }

  majPancarte();
  const jourArdoise = (ref.jour + etat.decalage) % 7;
  montrerArdoise(jourArdoise);
  montrerService(etat.service);
  boutonsJour.forEach((b) => {
    if (+b.dataset.jour === jourArdoise && etat.decalage === 0) b.parentElement.classList.add('auj');
    b.addEventListener('click', () => montrerArdoise(+b.dataset.jour));
  });
  onglets.forEach((o) => o.addEventListener('click', () => montrerService(o.dataset.service)));
  setInterval(majPancarte, 30e3);

  /* Horaires : la ligne du jour */
  const ligne = $(`#horaires tr[data-jour="${ref.jour}"]`);
  if (ligne) ligne.classList.add('auj');

  /* ── Le carnet de réservations ── */
  const form = $('#carnet-form');
  const elJours = $('#jours');
  const elCreneaux = $('#creneaux');
  const resume = $('#carnet-resume');
  const btnOk = $('#carnet-ok');
  const PRESSE = 30; // on ne réserve pas un créneau qui commence dans moins d’une demi-heure

  // Créneaux déjà pris : pseudo-hasard stable par jour et par heure, plus serré pour les grandes tables et le samedi soir.
  const hache = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 100; };
  const complet = (jourIso, service, t, n) =>
    hache(`${jourIso}${t}`) < 12 + n * 5 + (service === 'soir' && new Date(jourIso).getUTCDay() === 6 ? 18 : 0);

  const val = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value;
  const nb = () => +val('couverts');

  function radio(name, value, html, { disabled = false, label = '', cls = '' } = {}) {
    const l = document.createElement('label');
    l.className = cls;
    const i = Object.assign(document.createElement('input'), { type: 'radio', name, value, disabled });
    if (label) i.setAttribute('aria-label', label);
    const s = document.createElement('span');
    s.innerHTML = html; // contenu construit ici, jamais saisi par l’utilisateur
    l.append(i, s);
    return l;
  }

  function dessinerJours() {
    elJours.replaceChildren();
    let premier = null;
    for (let k = 0; k < 14; k++) {
      const d = plusJours(ref.date, k);
      const j = d.getUTCDay();
      const finie = k === 0 && ref.min > CRENEAUX.soir[1] - PRESSE;
      const ferme = !ouvertLe(j) || finie;
      const court = `${JOURS[j].slice(0, 3)}.`;
      const libelle = `${k === 0 ? 'aujourd’hui, ' : ''}${dateLongue(d)}${ferme ? (finie ? ', plus de créneau' : ', fermé') : ''}`;
      const el = radio('jour', iso(d), `<small>${k === 0 ? 'auj.' : court}</small><b>${d.getUTCDate()}</b><small>${ferme ? 'fermé' : MOIS_C[d.getUTCMonth()]}</small>`,
        { disabled: ferme, label: libelle, cls: 'jour' });
      if (!ferme && !premier) premier = el.querySelector('input');
      elJours.append(el);
    }
    if (premier) premier.checked = true;
  }

  function dessinerCreneaux() {
    const jourIso = val('jour');
    const service = val('service');
    const avant = val('creneau');
    elCreneaux.replaceChildren();
    if (!jourIso) return;
    const aujourdhui = jourIso === iso(ref.date);
    const [de, a] = CRENEAUX[service];
    let libres = 0;
    let passes = 0;
    for (let t = de; t <= a; t += 15) {
      if (aujourdhui && t < ref.min + PRESSE) { passes++; continue; }
      const plein = complet(jourIso, service, t, nb());
      if (!plein) libres++;
      const el = radio('creneau', String(t), heure(t), { disabled: plein, label: `${heure(t)}${plein ? ', complet' : ''}`, cls: 'creneau' });
      if (String(t) === avant && !plein) el.querySelector('input').checked = true;
      elCreneaux.append(el);
    }
    if (!libres) {
      const p = document.createElement('p');
      p.className = 'creneaux-vide';
      p.textContent = passes && !elCreneaux.childElementCount
        ? `Le service ${service === 'midi' ? 'de midi' : 'du soir'} est déjà lancé. Essayez ${service === 'midi' ? 'le soir' : 'un autre jour'}, ou appelez-nous.`
        : `Plus de table ${service === 'midi' ? 'ce midi' : 'ce soir'} pour ${nb()}. Essayez ${service === 'midi' ? 'le soir' : 'le midi'}, un autre jour, ou appelez-nous.`;
      elCreneaux.append(p);
    }
  }

  function majResume() {
    const n = nb();
    const jourIso = val('jour');
    const t = val('creneau');
    const d = jourIso ? new Date(jourIso) : null;
    resume.textContent = `${n} couvert${n > 1 ? 's' : ''}, ${d ? dateLongue(d) : 'choisissez un jour'}${t ? `, ${heure(+t)}` : (val('service') === 'soir' ? ', le soir' : ', le midi')}`;
    btnOk.textContent = `Réserver la table pour ${n}`;
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'creneau') $('#err-creneau').textContent = '';
    if (['jour', 'service', 'couverts'].includes(e.target.name)) dessinerCreneaux();
    majResume();
  });

  function erreur(champ, msg) {
    const el = $(`#err-${champ}`);
    el.textContent = msg;
    const input = $(`#r-${champ}`);
    if (input) input.setAttribute('aria-invalid', String(!!msg));
    return !msg;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tel = $('#r-tel').value.replace(/[\s.-]/g, '');
    const ok = [
      erreur('creneau', val('creneau') ? '' : 'Choisissez une heure parmi les créneaux libres.'),
      erreur('nom', $('#r-nom').value.trim().length >= 2 ? '' : 'Le nom sous lequel on note la table.'),
      erreur('tel', /^(0|\+33)[1-9]\d{8}$/.test(tel) ? '' : 'Un numéro à dix chiffres, par exemple 06 12 34 56 78.'),
    ];
    if (ok.includes(false)) {
      const premier = [$('#creneaux input:not(:disabled)') || $('input[name="service"]:checked'), $('#r-nom'), $('#r-tel')][ok.indexOf(false)];
      if (premier) premier.focus();
      return;
    }
    const t = +val('creneau');
    const d = new Date(val('jour'));
    const n = nb();
    const place = $('#r-place').value;
    const ligneCarnet = $('#carnet-ligne');
    ligneCarnet.textContent = `${maj(dateLongue(d))}, ${heure(t)}. ${$('#r-nom').value.trim()}, ${n} couvert${n > 1 ? 's' : ''}${place ? `, ${place}` : ''}.`;
    ligneCarnet.classList.remove('ecrit');
    void ligneCarnet.offsetWidth; // relance l’écriture
    ligneCarnet.classList.add('ecrit');
    const aujourdhui = val('jour') === iso(ref.date);
    $('#fait-txt').textContent = `${aujourdhui ? 'À tout à l’heure. ' : `Un SMS de rappel arrivera la veille au ${$('#r-tel').value.trim()}. `}Nous gardons la table jusqu’à ${heure(t + 15)}.`;
    form.hidden = true;
    $('#carnet-fait').hidden = false;
    resume.textContent = 'Réservation notée';
    $('#fait-t').focus();
  });

  $('#carnet-refaire').addEventListener('click', () => {
    $('#carnet-fait').hidden = true;
    form.hidden = false;
    majResume();
    form.querySelector('input[name="couverts"]:checked').focus();
  });

  dessinerJours();
  if (etat.decalage === 0 && ref.min > CRENEAUX.midi[1] - PRESSE) form.querySelector('input[name="service"][value="soir"]').checked = true;
  dessinerCreneaux();
  majResume();

  /* ── La carte : « je ne mange pas… » ── */
  const QUOI = { gluten: 'du gluten', lait: 'du lait', oeufs: 'des œufs', 'fruits-a-coque': 'des fruits à coque', poisson: 'du poisson', viande: 'de la viande' };
  const sans = new Set();
  const plats = $$('.plat');
  plats.forEach((p) => { p.dataset.texte = $('.plat-all', p).textContent; });
  $$('.filtre-puces button').forEach((b) => b.addEventListener('click', () => {
    const cle = b.dataset.sans;
    if (sans.has(cle)) sans.delete(cle); else sans.add(cle);
    b.setAttribute('aria-pressed', String(sans.has(cle)));
    let ok = 0;
    plats.forEach((p) => {
      const gene = p.dataset.contient.split(' ').filter((x) => sans.has(x));
      p.classList.toggle('plat-non', gene.length > 0);
      const liste = gene.map((x) => QUOI[x]);
      $('.plat-all', p).textContent = gene.length
        ? `Contient ${liste.length > 1 ? `${liste.slice(0, -1).join(', ')} et ${liste.at(-1)}` : liste[0]}`
        : p.dataset.texte;
      if (!gene.length) ok++;
    });
    $('#filtre-compte').textContent = sans.size
      ? `${ok} plat${ok > 1 ? 's' : ''} sur ${plats.length} vous ${ok > 1 ? 'conviennent' : 'convient'}. Les autres restent visibles, barrés.`
      : 'Tous les plats sont affichés.';
  }));

  /* ── Groupes : l’estimation ── */
  const gNb = $('#g-nb');
  const euros = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  function estimer() {
    const n = +gNb.value;
    const prix = +$('input[name="g-formule"]:checked').value;
    const prive = n > 20;
    const total = prive ? Math.max(n * prix, 1600) : n * prix;
    $('#g-nb-val').textContent = n;
    $('#g-total').textContent = `${euros.format(total)}${NB}€`;
    $('#g-ou').textContent = n <= 14
      ? 'On vous installe à la grande table du fond.'
      : prive
        ? `Au-delà de vingt, c’est la salle entière, le dimanche ou le lundi. Minimum ${euros.format(1600)}${NB}€.`
        : 'On réunit les tables du fond\u202f: la moitié de la salle est à vous.';
  }
  gNb.addEventListener('input', estimer);
  $$('input[name="g-formule"]').forEach((r) => r.addEventListener('change', estimer));
  estimer();

  /* ── La barre sous le pouce se range quand le carnet est à l’écran ── */
  const barre = $('#barre-action');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { barre.toggleAttribute('data-cache', e.isIntersecting); })
      .observe($('.carnet'));

    /* La section lue est signalée dans la navigation du store */
    const liens = new Map($$('.nav a').map((a) => [a.hash.slice(1), a]));
    const lu = new IntersectionObserver((entrees) => entrees.forEach((e) => {
      if (!e.isIntersecting) return;
      liens.forEach((a, id) => (id === e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    }), { rootMargin: '-45% 0px -50% 0px' });
    liens.forEach((a, id) => { const sec = document.getElementById(id); if (sec) lu.observe(sec); });
  }
})();
