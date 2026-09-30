/* Clé de 15 (démo 4dayvelopment). Statut en direct à l'heure de Dijon, tableau
   des prix relié à l'étiquette de réparation, calendrier de dépôt et ticket.
   Rien n'est envoyé : la démo simule la confirmation par SMS. */
(() => {
  'use strict';
  const NB = ' ';   // espace insécable avant € et h
  const FINE = ' '; // espace fine avant : ; ? !

  /* ── Données de l'atelier ── */
  // Plages d'ouverture en minutes depuis minuit, par jour (0 = dimanche).
  const HORAIRES = {
    2: [[510, 750], [840, 1140]], 3: [[510, 750], [840, 1140]],
    4: [[510, 750], [840, 1140]], 5: [[510, 750], [840, 1140]],
    6: [[540, 1020]],
  };
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const PRIX = {
    ville: { crev: [15, 20], frein: [15, 30], vit: [15, 30], roue: [15, 25], rev: [59, 59] },
    route: { crev: [15, 22], frein: [20, 40], vit: [20, 35], roue: [20, 30], rev: [69, 69] },
    vtt:   { crev: [18, 25], frein: [25, 50], vit: [20, 35], roue: [20, 30], rev: [69, 69] },
    elec:  { crev: [20, 35], frein: [25, 50], vit: [20, 40], roue: [25, 40], rev: [79, 79] },
  };
  const ACC = [10, 10]; // pose d'un accessoire : prix de base, quel que soit le vélo
  const NOMS = { crev: 'Crevaison', frein: 'Freins', vit: 'Vitesses', roue: 'Roue voilée', rev: 'Révision complète', acc: 'Pose d’un accessoire' };
  const VELOS = { ville: 'Vélo de ville', route: 'Vélo de route ou gravel', vtt: 'VTT', elec: 'Vélo électrique' };
  const POUR = { ville: 'un vélo de ville', route: 'un vélo de route ou gravel', vtt: 'un VTT', elec: 'un vélo électrique' };
  const DANS_REV = ['frein', 'vit', 'roue']; // la révision règle déjà freins, vitesses et roues
  const DELAIS = {
    sem: { pret: 'sous 3 jours ouvrés', sup: 0 },
    48: { pret: 'sous 48' + NB + 'h', sup: 10 },
    jour: { pret: 'le jour même en fin de journée, si déposé avant 10' + NB + 'h', sup: 15 },
    revJour: { pret: 'sous 48' + NB + 'h, une révision ne se fait pas dans la journée', sup: 10 },
  };

  /* ── Fonctions pures (vérifiées par un script hors page) ── */
  const heure = m => `${Math.floor(m / 60)}${NB}h${m % 60 ? NB + String(m % 60).padStart(2, '0') : ''}`;
  const euros = ([a, b]) => (a === b ? `${a}${NB}€` : `${a} à ${b}${NB}€`);
  const prixDe = (velo, p) => (p === 'acc' ? ACC : PRIX[velo][p]);

  // Heure de Dijon, quel que soit le fuseau du visiteur.
  function maintenantParis(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map(x => [x.type, x.value]));
    return {
      jour: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday),
      min: Number(p.hour) * 60 + Number(p.minute),
      ymd: [Number(p.year), Number(p.month), Number(p.day)],
    };
  }

  // Ce qu'affichent la pancarte (mot + phrase) et la barre mobile (court).
  function statut({ jour, min }) {
    const plages = HORAIRES[jour] || [];
    const en = plages.find(([a, b]) => min >= a && min < b);
    if (en) {
      const fin = heure(en[1]);
      if (en[1] - min <= 30) return { etat: 'ouvert', mot: 'Ouvert', phrase: `Encore ${en[1] - min}${NB}min, fermeture à ${fin}`, court: `Ouvert, ferme à ${fin}` };
      const apres = plages.find(([a]) => a >= en[1]);
      const phrase = apres ? `Jusqu’à ${fin}, puis de ${heure(apres[0])} à ${heure(apres[1])}` : `Jusqu’à ${fin}`;
      return { etat: 'ouvert', mot: 'Ouvert', phrase, court: `Ouvert jusqu’à ${fin}` };
    }
    const suite = plages.find(([a]) => a > min);
    if (suite && plages.some(([, b]) => b <= min)) {
      return { etat: 'pause', mot: 'Pause', phrase: `Pause déjeuner, on rouvre à ${heure(suite[0])}`, court: `Pause déjeuner, on rouvre à ${heure(suite[0])}` };
    }
    if (suite) return { etat: 'ferme', mot: 'Fermé', phrase: `On ouvre aujourd’hui à ${heure(suite[0])}`, court: `Fermé, on ouvre à ${heure(suite[0])}` };
    for (let i = 1; i <= 7; i++) {
      const j = (jour + i) % 7;
      if (!HORAIRES[j]) continue;
      const quand = `${i === 1 ? 'demain' : JOURS[j]} à ${heure(HORAIRES[j][0][0])}`;
      return { etat: 'ferme', mot: 'Fermé', phrase: `On rouvre ${quand}`, court: `Fermé, on rouvre ${quand}` };
    }
    return null;
  }

  // L'étiquette : fourchette totale, délai et supplément.
  function devis(velo, prestas, quand) {
    if (!prestas.length) return null;
    const d = DELAIS[prestas.includes('rev') && quand === 'jour' ? 'revJour' : quand];
    const somme = prestas.reduce(([a, b], p) => { const [x, y] = prixDe(velo, p); return [a + x, b + y]; }, [0, 0]);
    return { total: [somme[0] + d.sup, somme[1] + d.sup], pret: d.pret, sup: d.sup ? `${d.sup}${NB}€` : 'aucun' };
  }

  if (typeof document === 'undefined') { module.exports = { statut, devis, heure, euros }; return; }

  /* ── Page ── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const doux = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const pose = (el, txt) => { if (el && el.textContent !== txt) el.textContent = txt; };

  let bulle;
  const toast = msg => {
    const t = $('[data-toast]');
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(bulle);
    bulle = setTimeout(() => t.classList.remove('visible'), 2800);
  };

  /* Statut en direct : pancarte de la porte, barre mobile, ligne du jour dans les horaires */
  const pancarte = $('.pancarte');
  const barre = $('.barre');
  function majStatut() {
    const now = maintenantParis();
    const s = statut(now);
    pancarte.dataset.etat = barre.dataset.etat = s.etat;
    pose($('[data-statut-mot]'), s.mot);
    pose($('[data-statut]'), s.phrase);
    pose($('[data-statut-court]'), s.court);
    $$('.horaires [data-jours]').forEach(l => {
      const oui = l.dataset.jours.split(' ').includes(String(now.jour));
      l.classList.toggle('aujourdhui', oui);
      const tag = $('.auj-tag', l);
      if (oui && !tag) $('dt', l).insertAdjacentHTML('beforeend', '<span class="auj-tag">aujourd’hui</span>');
      if (!oui && tag) tag.remove();
    });
  }
  majStatut();
  pancarte.classList.add('bouge');
  setInterval(majStatut, 30000);

  /* Tableau des prix et étiquette de réparation */
  const etat = { prestas: ['crev'] };
  const velo = () => $('input[name="velo"]:checked').value;
  const quand = () => $('input[name="quand"]:checked').value;
  const cartes = $$('.carte');
  const lignes = $('[data-et-lignes]');

  function rendu() {
    const v = velo(), q = quand(), rev = etat.prestas.includes('rev');
    $$('[data-prix]').forEach(el => pose(el, el.dataset.prix === 'acc' ? `dès 10${NB}€` : euros(PRIX[v][el.dataset.prix])));
    pose($('[data-panneau-note]'), `Prix pour ${POUR[v]}, main‑d’œuvre comprise.`);
    cartes.forEach(c => {
      const p = c.dataset.presta, bloque = rev && DANS_REV.includes(p);
      c.setAttribute('aria-pressed', String(etat.prestas.includes(p)));
      if (bloque) c.setAttribute('aria-disabled', 'true'); else c.removeAttribute('aria-disabled');
    });

    pose($('[data-et-velo]'), VELOS[v]);
    lignes.replaceChildren(...etat.prestas.map(p => {
      const li = document.createElement('li');
      li.innerHTML = `<span></span><span class="et-p"></span><button class="retirer" type="button"><svg class="ico" aria-hidden="true"><use href="#i-croix"/></svg></button>`;
      li.children[0].textContent = NOMS[p];
      li.children[1].textContent = p === 'acc' ? `10${NB}€` : euros(PRIX[v][p]);
      li.children[2].dataset.retirer = p;
      li.children[2].setAttribute('aria-label', `Retirer ${NOMS[p].toLowerCase()} de l’étiquette`);
      return li;
    }));
    const d = devis(v, etat.prestas, q);
    $('[data-et-vide]').hidden = !!d;
    lignes.hidden = !d;
    pose($('[data-et-total]'), d ? euros(d.total) : 'Diagnostic gratuit');
    pose($('[data-et-pret]'), d ? d.pret : DELAIS[q].pret);
    pose($('[data-et-sup]'), d ? d.sup : (DELAIS[q].sup ? `${DELAIS[q].sup}${NB}€` : 'aucun'));
    const note = $('[data-et-note]');
    note.hidden = !etat.prestas.includes('acc') && !rev;
    pose(note, [
      rev ? 'La révision règle déjà freins, vitesses et roues.' : '',
      etat.prestas.includes('acc') ? `Pose d’accessoire comptée au prix de base, 10${NB}€.` : '',
    ].filter(Boolean).join(' '));

    const quoi = etat.prestas.length ? etat.prestas.map(p => NOMS[p].toLowerCase()).join(', ') : 'diagnostic au comptoir';
    $('[data-recap]').innerHTML = '';
    $('[data-recap]').append(
      `Sur l’étiquette${FINE}: ${VELOS[v].toLowerCase()}, ${quoi}. ${d ? euros(d.total) + ', prêt ' + d.pret : 'Diagnostic gratuit'}. `,
      Object.assign(document.createElement('a'), { href: '#prix', textContent: 'Modifier' }),
    );
    majCreneaux();
  }

  cartes.forEach(c => c.addEventListener('click', () => {
    const p = c.dataset.presta;
    if (c.getAttribute('aria-disabled') === 'true') return toast(`Déjà compris dans la révision${FINE}: rien à ajouter.`);
    if (etat.prestas.includes(p)) {
      etat.prestas = etat.prestas.filter(x => x !== p);
      rendu();
      return toast(`Retiré de l’étiquette${FINE}: ${NOMS[p].toLowerCase()}.`);
    }
    if (p === 'rev') etat.prestas = etat.prestas.filter(x => !DANS_REV.includes(x));
    etat.prestas.push(p);
    rendu();
    const d = devis(velo(), etat.prestas, quand());
    toast(`Sur l’étiquette${FINE}: ${NOMS[p].toLowerCase()}. Total ${euros(d.total)}.`);
  }));

  lignes.addEventListener('click', e => {
    const b = e.target.closest('[data-retirer]');
    if (!b) return;
    const i = etat.prestas.indexOf(b.dataset.retirer);
    etat.prestas.splice(i, 1);
    rendu();
    const suivant = $$('[data-retirer]', lignes)[Math.min(i, etat.prestas.length - 1)];
    if (suivant) suivant.focus();
    else { const h = $('#etiquette-t'); h.tabIndex = -1; h.focus(); }
  });
  $$('input[name="velo"], input[name="quand"]').forEach(r => r.addEventListener('change', rendu));

  // Tuiles « Ce qu'on répare » : choisir le vélo et remonter au tableau.
  $$('[data-voir-velo]').forEach(b => b.addEventListener('click', () => {
    const r = $(`input[name="velo"][value="${b.dataset.voirVelo}"]`);
    r.checked = true;
    rendu();
    $('#prix').scrollIntoView({ behavior: doux });
    r.focus({ preventScroll: true });
  }));

  /* Calendrier de dépôt : quatre semaines à partir du lundi, dimanche et lundi barrés */
  const JOUR_MS = 86400000;
  const cal = $('[data-cal]');
  const ici = maintenantParis();
  const t0 = Date.UTC(ici.ymd[0], ici.ymd[1] - 1, ici.ymd[2]);
  const nomJour = t => { const d = new Date(t); return `${JOURS[d.getUTCDay()]} ${d.getUTCDate() === 1 ? '1er' : d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`; };
  // Encore possible de déposer aujourd'hui ? (avant 10 h pour le matin, avant la fermeture pour le soir)
  const matinOk = t => t !== t0 || ici.min < 600;
  const soirOk = t => { const p = HORAIRES[new Date(t).getUTCDay()]; return t !== t0 || ici.min < p[p.length - 1][1]; };

  const debut = t0 - ((ici.jour + 6) % 7) * JOUR_MS;
  const mois = new Set();
  let premier = null;
  for (let i = 0; i < 28; i++) {
    const t = debut + i * JOUR_MS, d = new Date(t), wd = d.getUTCDay();
    const cell = document.createElement(t < t0 ? 'span' : 'label');
    cell.className = 'jour';
    const num = `<span class="j-num" aria-hidden="true">${d.getUTCDate()}</span>`;
    if (t < t0) { cell.classList.add('passe'); cell.setAttribute('aria-hidden', 'true'); cell.innerHTML = num; cal.append(cell); continue; }
    mois.add(MOIS[d.getUTCMonth()]);
    const ferme = !HORAIRES[wd], plein = !ferme && !matinOk(t) && !soirOk(t);
    const iso = d.toISOString().slice(0, 10);
    cell.innerHTML = `<input type="radio" name="jour" value="${iso}">${num}` +
      (ferme ? '<span class="j-info" aria-hidden="true">fermé</span>' : t === t0 ? '<span class="j-info" aria-hidden="true">auj.</span>' : '');
    const input = cell.firstChild;
    input.dataset.t = t;
    input.setAttribute('aria-label', nomJour(t) + (ferme ? ', atelier fermé' : plein ? ', trop tard pour aujourd’hui' : t === t0 ? ', aujourd’hui' : ''));
    if (ferme || plein) { input.disabled = true; cell.classList.add('ferme'); }
    if (t === t0) cell.classList.add('auj');
    if (!input.disabled && !premier) { premier = input; input.checked = true; }
    cal.append(cell);
  }
  const an = new Date(t0).getUTCFullYear();
  const lm = [...mois];
  pose($('[data-cal-mois]'), `${lm.map((m, i) => (i ? m : m[0].toUpperCase() + m.slice(1))).join(' et ')} ${an}`);
  cal.insertAdjacentHTML('afterend', '<p class="cal-choix" data-cal-choix aria-live="polite"></p>');

  const jourChoisi = () => $('input[name="jour"]:checked');
  function majCreneaux() {
    const j = jourChoisi();
    if (!j) return;
    const t = Number(j.dataset.t), wd = new Date(t).getUTCDay();
    const matin = $('input[name="creneau"][value="matin"]'), soir = $('input[name="creneau"][value="soir"]');
    pose($('[data-cr-matin]'), wd === 6 ? `de 9${NB}h à 10${NB}h` : `de 8${NB}h${NB}30 à 10${NB}h`);
    pose($('[data-cr-soir]'), wd === 6 ? `de 15${NB}h à 17${NB}h` : `de 17${NB}h à 19${NB}h`);
    const urgent = quand() === 'jour' && !etat.prestas.includes('rev');
    matin.disabled = !matinOk(t);
    soir.disabled = !soirOk(t) || urgent;
    const info = $('[data-cr-info]');
    const msg = urgent ? `Pour un vélo prêt le soir même, déposez-le à l’ouverture, avant 10${NB}h.`
      : matin.disabled ? `Trop tard pour ce matin${FINE}: passez en fin de journée, ou choisissez un autre jour.` : '';
    info.hidden = !msg;
    pose(info, msg);
    if ($('input[name="creneau"]:checked')?.disabled) (matin.disabled ? soir : matin).checked = !(matin.disabled && soir.disabled);
    const nj = nomJour(t);
    pose($('[data-cal-choix]'), `Dépôt ${t === t0 ? 'aujourd’hui, ' : 'le '}${nj}`);
  }
  cal.addEventListener('change', majCreneaux);

  /* Réservation : vérification des champs, puis ticket de dépôt */
  const form = $('#resa');
  const erreur = $('[data-erreur]');
  const telOk = v => /^(?:0|\+33|0033)[67]\d{8}$/.test(v.replace(/[\s.-]/g, ''));
  const telJoli = v => { const n = v.replace(/[\s.-]/g, '').replace(/^(\+33|0033)/, '0'); return n.replace(/(\d{2})(?=\d)/g, '$1' + NB); };
  function refuse(champ, msg) {
    erreur.hidden = false;
    erreur.textContent = msg;
    if (champ) { champ.setAttribute('aria-invalid', 'true'); champ.focus(); }
  }
  $$('#f-nom, #f-tel').forEach(c => c.addEventListener('input', () => c.removeAttribute('aria-invalid')));

  form.addEventListener('submit', e => {
    e.preventDefault();
    erreur.hidden = true;
    const j = jourChoisi(), cr = $('input[name="creneau"]:checked:not(:disabled)');
    const nom = $('#f-nom'), tel = $('#f-tel');
    if (!j) return refuse(cal.querySelector('input:not(:disabled)'), 'Choisissez un jour de dépôt dans le calendrier.');
    if (!cr) return refuse(null, `Aucun créneau possible ce jour-là${FINE}: choisissez un autre jour.`);
    if (!nom.value.trim()) return refuse(nom, 'Indiquez votre prénom et votre nom.');
    if (!telOk(tel.value)) return refuse(tel, `Il nous faut un numéro de mobile pour le SMS, par exemple 06${NB}12${NB}34${NB}56${NB}78.`);

    const t = Number(j.dataset.t), v = velo(), d = devis(v, etat.prestas, quand());
    const matin = cr.value === 'matin';
    const plage = $(matin ? '[data-cr-matin]' : '[data-cr-soir]').textContent;
    const jourTxt = nomJour(t);
    pose($('[data-t-num]'), String(400 + Math.floor(Math.random() * 600)).padStart(4, '0'));
    pose($('[data-t-quand]'), `${jourTxt[0].toUpperCase() + jourTxt.slice(1)}, ${matin ? 'à l’ouverture' : 'en fin de journée'}, ${plage}.`);
    pose($('[data-t-quoi]'), d
      ? `${VELOS[v]}${FINE}: ${etat.prestas.map(p => NOMS[p].toLowerCase()).join(', ')}. Fourchette ${euros(d.total)}, prêt ${d.pret}.`
      : `${VELOS[v]}${FINE}: diagnostic gratuit au comptoir, le prix avant la réparation.`);
    pose($('[data-t-tel]'), telJoli(tel.value));
    pose($('[data-t-sms]'), `Clé de 15${FINE}: c’est noté, dépôt ${jourTxt} ${plage}, 181 rue d’Auxonne. Un empêchement${FINE}? Répondez à ce SMS.`);
    pose($('[data-t-rappel]'), form.rappel.checked ? `Rappel par SMS la veille, ${nomJour(t - JOUR_MS)}.` : 'Pas de rappel la veille, comme demandé.');
    const dlg = $('#ticket');
    dlg.showModal();
    $('#ticket-t').focus();
  });

  rendu();
})();
