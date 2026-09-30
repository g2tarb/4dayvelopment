/* Montagnon Chauffage (démo 4dayvelopment), page d’arrivée d’annonce.
   1. La veilleuse : l’état de la ligne à l’heure de Lyon (aujourd’hui avant 14 h, demain matin,
      fermé le dimanche), recalculé toutes les 30 s. Démo : ?t=2026-10-03T15:20 fige l’heure.
   2. La barre d’appel sous le pouce, rangée quand elle ferait doublon ou sur les consignes gaz.
   3. Le tri de la panne : deux questions, trois issues (appeler, être rappelé, consignes gaz).
   4. « Est-ce que vous venez chez moi ? » : commune ou code postal, réponse immédiate, point sur le plan.
   5. La demande de rappel : vérifiée, résumée, rien n’est envoyé. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const H730 = '7 h 30', H14 = '14 h', H19 = '19 h', DP = ' :';

  /* 1. La veilleuse ------------------------------------------------------------- */
  const OUVRE = 7 * 60 + 30, LIMITE = 14 * 60, FERME = 19 * 60;
  function maintenant() {
    const t = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(new URLSearchParams(location.search).get('t') || '');
    if (t) return { jour: new Date(Date.UTC(+t[1], t[2] - 1, +t[3])).getUTCDay(), min: +t[4] * 60 + +t[5], fige: true };
    const p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
    return { jour: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: +p.hour * 60 + +p.minute };
  }
  const duree = m => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`);

  // ponytail: jours fériés ignorés ; le vrai site lirait une liste annuelle de dates fermées.
  function etat({ jour, min }) {
    const lendemain = jour === 6 ? 'lundi' : 'demain'; // fermé le dimanche
    if (jour === 0) return {
      cle: 'ferme', ligne: false, titre: 'Fermé le dimanche',
      detail: `Technicien disponible lundi. Rappel lundi dès ${H730}.`, rappel: `lundi dès ${H730}`,
      quand: `La ligne est fermée le dimanche. Laissez votre numéro${DP} on vous rappelle lundi dès ${H730}.`,
      zone: 'Technicien disponible lundi.' };
    if (min < OUVRE) return {
      cle: 'matin', ligne: false, titre: 'Technicien disponible aujourd’hui',
      detail: `Ligne ouverte à ${H730}. Appelez avant ${H14}.`, rappel: `dès ${H730}`,
      quand: `La ligne ouvre à ${H730}. Appelez avant ${H14}${DP} un technicien passe dans la journée.`,
      zone: `Technicien disponible aujourd’hui si vous appelez avant ${H14}.` };
    if (min < LIMITE) return {
      cle: 'jour', ligne: true, titre: `Technicien disponible aujourd’hui, appelez avant ${H14}`,
      detail: `Il reste ${duree(LIMITE - min)} pour un passage aujourd’hui.`, rappel: 'dans l’heure',
      quand: `Il est encore temps${DP} avant ${H14}, un technicien passe dans la journée.`,
      zone: `Technicien disponible aujourd’hui si vous appelez avant ${H14}.` };
    if (min < FERME) return {
      cle: 'apres', ligne: true, titre: `Technicien disponible ${lendemain} matin`,
      detail: `Appelez avant ${H19}${DP} il vient ${lendemain} à la première heure.`, rappel: 'dans l’heure',
      quand: `Il est plus de ${H14}${DP} le technicien vient ${lendemain} matin, à la première heure.`,
      zone: `Technicien disponible ${lendemain} matin.` };
    return {
      cle: 'soir', ligne: false, titre: `Technicien disponible ${lendemain}`,
      detail: `Ligne fermée. Rappel ${lendemain} dès ${H730}.`, rappel: `${lendemain} dès ${H730}`,
      quand: `La ligne est fermée. Laissez votre numéro${DP} on vous rappelle ${lendemain} dès ${H730}.`,
      zone: `Technicien disponible ${lendemain}.` };
  }

  let E;
  const ecrire = (el, txt) => { if (el && el.textContent !== txt) el.textContent = txt; };
  function majEtat() {
    E = etat(maintenant());
    $('.statut').dataset.etat = E.cle;
    body.dataset.ligne = E.ligne ? 'ouverte' : 'fermee';
    ecrire($('[data-statut="titre"]'), E.titre);
    ecrire($('[data-statut="detail"]'), E.detail);
    ecrire($('[data-appel-lib]'), E.ligne ? 'Appeler maintenant' : `Ligne fermée, rouvre ${E.rappel}`);
    ecrire($('[data-rappel-lib]'), E.ligne ? 'Être rappelé dans l’heure' : `Être rappelé ${E.rappel}`);
    ecrire($('[data-rappel-delai]'), `On vous rappelle ${E.rappel}.`);
    ecrire($('[data-quand]'), E.quand);
    ecrire($('[data-zone-quand]'), E.zone);
  }
  majEtat();
  if (!maintenant().fige) setInterval(majEtat, 30000);

  /* 2. Sous le pouce -------------------------------------------------------------- */
  const pouce = $('.pouce');
  const vues = new Set();
  function majPouce() {
    if (!pouce) return;
    const cache = vues.size > 0 || body.classList.contains('gaz');
    pouce.classList.toggle('cache', cache);
    pouce.inert = cache;
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(x => (x.isIntersecting ? vues.add(x.target) : vues.delete(x.target)));
      majPouce();
    });
    [$('#appel'), $('#rappel'), $('#gaz')].forEach(el => el && io.observe(el));
  } else if (pouce) {
    pouce.classList.remove('cache');
    pouce.inert = false;
  }

  /* 3. Le tri de la panne ------------------------------------------------------ */
  const assistant = $('.assistant');
  const PANNES = {
    gaz: 'une odeur de gaz', froid: 'plus de chauffage ou plus d’eau chaude', code: 'un code erreur s’affiche',
    fuite: 'une fuite d’eau', bruit: 'un bruit anormal' };
  const tri = { panne: '', fragile: '', code: '', motif: '' };
  const codeIn = $('#v-code-in');

  function aller(nom, focus = true) {
    $$('[data-pan]', assistant).forEach(p => { p.hidden = p.dataset.pan !== nom; });
    assistant.dataset.etape = nom;
    const idx = nom === 'q1' ? 0 : nom === 'q2' ? 1 : 2;
    $$('.etapes li', assistant).forEach((li, i) => {
      li.classList.toggle('fait', i < idx);
      if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    body.classList.toggle('gaz', nom === 'gaz');
    majPouce();
    if (focus) $(`[data-pan="${nom}"] [data-focus]`, assistant).focus();
  }
  function conclure() {
    const v = tri.panne === 'code' && tri.fragile !== 'oui' ? 'code' : 'appel';
    const pan = $(`[data-pan="${v}"]`, assistant);
    $$('.si-fragile', pan).forEach(el => { el.hidden = tri.fragile !== 'oui'; });
    $$('.si-fuite', pan).forEach(el => { el.hidden = tri.panne !== 'fuite'; });
    aller(v);
  }
  function majResume() {
    const txt = [tri.motif, PANNES[tri.panne], tri.fragile === 'oui' ? 'une personne fragile vit à la maison' : '',
      tri.code ? `code ${tri.code}` : ''].filter(Boolean).join(', ');
    const resume = $('[data-resume]');
    resume.hidden = !txt;
    $('[data-resume-txt]').textContent = txt ? txt[0].toUpperCase() + txt.slice(1) : '';
    $('[data-demande]').value = txt;
  }

  assistant.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.panne) {
      tri.panne = b.dataset.panne;
      tri.fragile = '';
      aller(tri.panne === 'gaz' ? 'gaz' : 'q2');
    } else if (b.dataset.fragile) {
      tri.fragile = b.dataset.fragile;
      conclure();
    } else if (b.dataset.aller) {
      tri.panne = tri.fragile = tri.code = '';
      codeIn.value = '';
      aller(b.dataset.aller);
    }
    majResume();
  });
  codeIn.addEventListener('input', () => { tri.code = codeIn.value.trim().toUpperCase(); majResume(); });

  // Liens vers le rappel : on garde le motif, on descend au formulaire, le curseur dans le premier champ.
  // Lien « Ça sent le gaz ? » : les consignes s’ouvrent directement dans le tri.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href="#rappel"]');
    if (a) {
      e.preventDefault();
      tri.motif = a.dataset.motif || '';
      majResume();
      $('#rappel').scrollIntoView({ block: 'start' });
      $('#r-tel').focus({ preventScroll: true });
      return;
    }
    const g = e.target.closest('[data-gaz]');
    if (g) {
      e.preventDefault();
      tri.panne = 'gaz';
      tri.fragile = '';
      aller('gaz', false);
      majResume();
      assistant.scrollIntoView({ block: 'start' });
      $('[data-pan="gaz"] [data-focus]', assistant).focus({ preventScroll: true });
    }
  });

  /* 4. Est-ce que vous venez chez moi ? ------------------------------------------- */
  const COMMUNES = [
    { id: 'lyon', nom: 'Lyon', cp: ['69001', '69002', '69003', '69004', '69005', '69006', '69007', '69008', '69009'] },
    { id: 'villeurbanne', nom: 'Villeurbanne', cp: ['69100'] },
    { id: 'caluire', nom: 'Caluire-et-Cuire', cp: ['69300'], alias: ['caluire'] },
    { id: 'vaulx', nom: 'Vaulx-en-Velin', cp: ['69120'], alias: ['vaulx'] },
    { id: 'bron', nom: 'Bron', cp: ['69500'] },
    { id: 'venissieux', nom: 'Vénissieux', cp: ['69200'] },
    { id: 'saint-fons', nom: 'Saint-Fons', cp: ['69190'] },
    { id: 'oullins', nom: 'Oullins-Pierre-Bénite', cp: ['69600', '69310'], alias: ['oullins', 'pierre benite'] },
    { id: 'sainte-foy', nom: 'Sainte-Foy-lès-Lyon', cp: ['69110'], alias: ['sainte foy', 'sainte foy lyon'] },
    { id: 'tassin', nom: 'Tassin-la-Demi-Lune', cp: ['69160'], alias: ['tassin'] },
    { id: 'ecully', nom: 'Écully', cp: ['69130'] },
    { id: 'rillieux', nom: 'Rillieux-la-Pape', cp: ['69140'], alias: ['rillieux'] },
    { id: 'decines', nom: 'Décines-Charpieu', cp: ['69150'], alias: ['decines'] },
    { id: 'champagne', nom: 'Champagne-au-Mont-d’Or', cp: ['69410'], alias: ['champagne', 'champagne mont d or'] }];
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'`\-_.,;/]/g, ' ').replace(/\bste\b/g, 'sainte').replace(/\bst\b/g, 'saint').replace(/\s+/g, ' ').trim();
  COMMUNES.forEach(c => { c.cles = [norm(c.nom), ...(c.alias || [])]; });

  function trouver(saisie) {
    const q = norm(saisie);
    if (!q) return null;
    const cp = (q.replace(/(\d) (\d)/g, '$1$2').match(/\b\d{5}\b/) || [])[0];
    if (cp) return COMMUNES.find(c => c.cp.includes(cp)) || { hors: `le ${cp}` };
    if (/^lyon ?(\d{1,2} ?(e|er|eme|ieme)?( arrondissement)?)?$/.test(q)) return COMMUNES[0];
    const exact = COMMUNES.find(c => c.cles.includes(q));
    if (exact) return exact;
    const debut = q.length >= 4 ? COMMUNES.filter(c => c.cles.some(k => k.startsWith(q))) : [];
    if (debut.length === 1) return debut[0];
    return { hors: `« ${saisie.trim().slice(0, 40)} »`, inconnu: true };
  }

  const rep = $('#zone-rep');
  const zoneIn = $('#zone-in');
  function para(txt, cls) {
    const el = document.createElement('p');
    if (cls) el.className = cls;
    el.textContent = txt;
    rep.append(el);
    return el;
  }
  function repondre(res) {
    const trouve = res && !res.hors ? res.id : '';
    $$('.plan [data-point]').forEach(p => p.classList.toggle('est-choisi', p.dataset.point === trouve));
    $$('.communes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.commune === trouve)));
    rep.replaceChildren();
    rep.hidden = false;
    rep.className = trouve ? 'zone-rep' : 'zone-rep non';
    if (!res) { para('Tapez le nom de votre commune ou son code postal.', 'rep-t'); return; }
    if (res.hors) {
      para(res.inconnu ? `${res.hors} n’est pas dans nos communes.` : `Non, ${res.hors} est hors de notre zone.`, 'rep-t');
      para(`Nous ne pourrions pas venir vite. Appelez plutôt un chauffagiste proche de chez vous${' '}: nous préférons vous le dire avant que vous perdiez du temps.`);
      if (res.inconnu) para(`Un doute sur l’orthographe${' '}? Essayez le code postal.`);
      return;
    }
    const t = para(res.id === 'lyon' ? 'Oui, nous venons dans tous les arrondissements de Lyon.' : `Oui, nous venons à ${res.nom}.`, 'rep-t');
    t.insertAdjacentHTML('afterbegin', '<svg class="ico" aria-hidden="true"><use href="#i-coche"/></svg>');
    para(E.zone).dataset.zoneQuand = '';
    const a = document.createElement('a');
    a.className = 'lien';
    if (E.ligne) { a.href = 'tel:+33465712038'; a.textContent = 'Appeler le 04 65 71 20 38'; }
    else { a.href = '#rappel'; a.textContent = `Être rappelé ${E.rappel}`; }
    rep.append(a);
  }
  $('#zone-form').addEventListener('submit', e => { e.preventDefault(); repondre(trouver(zoneIn.value)); });
  // un nom choisi dans la liste proposée : réponse sans attendre le bouton
  zoneIn.addEventListener('input', () => {
    const c = COMMUNES.find(x => x.nom === zoneIn.value.trim());
    if (c) repondre(c);
  });
  $('.communes').addEventListener('click', e => {
    const b = e.target.closest('button[data-commune]');
    if (!b) return;
    const c = COMMUNES.find(x => x.id === b.dataset.commune);
    zoneIn.value = c.nom;
    repondre(c);
  });

  /* 5. Être rappelé ------------------------------------------------------------- */
  const form = $('#rappel-form');
  const merci = $('.merci');
  const chiffres = v => v.replace(/\D/g, '');
  const telOk = v => /^0[1-9]\d{8}$/.test(chiffres(v)) || /^33[1-9]\d{8}$/.test(chiffres(v));
  const MSG = {
    tel: 'Indiquez votre numéro de téléphone.',
    telCourt: `Ce numéro ne compte pas 10 chiffres${' '}: vérifiez-le, par exemple 06 12 34 56 78.`,
    nom: 'Indiquez votre nom.',
    commune: 'Indiquez votre commune.' };
  function signaler(champ, msg) {
    const err = $(`#${champ.id}-err`);
    champ.setAttribute('aria-invalid', msg ? 'true' : 'false');
    err.textContent = msg;
    err.hidden = !msg;
    return !msg;
  }
  function verifier(champ) {
    const v = champ.value.trim();
    if (champ.name === 'tel') return signaler(champ, !v ? MSG.tel : telOk(v) ? '' : MSG.telCourt);
    return signaler(champ, v ? '' : MSG[champ.name]);
  }
  form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') verifier(e.target); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const [tel, nom, commune] = ['#r-tel', '#r-nom', '#r-commune'].map(s => $(s));
    const faux = [tel, nom, commune].filter(c => !verifier(c));
    if (faux.length) { faux[0].focus(); return; }
    // Démo : rien n’est envoyé.
    const numero = chiffres(tel.value).replace(/^33/, '0').replace(/(\d\d)(?=\d)/g, '$1 ');
    const choix = form.elements.quand.value;
    const delai = !E.ligne ? E.rappel : choix === 'dès que possible' ? 'dans l’heure' : choix;
    const lignes = [];
    if (tri.panne === 'gaz') lignes.push(`Si ça sent le gaz, sortez d’abord et appelez Urgence sécurité gaz au 0 800 47 33 33.`);
    lignes.push(`Dans la version en ligne, Montagnon Chauffage vous rappelle au ${numero}, ${delai}.`);
    const lieu = trouver(commune.value);
    if (lieu && lieu.hors) lignes.push(`Attention${' '}: ${commune.value.trim()} n’est pas dans nos communes, nous ne pourrons peut-être pas venir.`);
    $('[data-merci]').replaceChildren(...lignes.map(t => Object.assign(document.createElement('p'), { textContent: t })));
    form.hidden = true;
    merci.hidden = false;
    merci.focus();
  });
})();
