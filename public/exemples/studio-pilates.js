/* Chariot (démo 4dayvelopment) : « l’appli du studio ».
   Une seule source pour les horaires : le planning écrit dans le HTML. Tout le reste en découle
   (statut en direct, prochain cours épinglé, prochains cours des profs, quiz, réservation).
   Aucun envoi réseau : c’est une démonstration. */
(() => {
  'use strict';
  const NB = '\u00A0', FINE = '\u202F'; // espace insécable, espace fine insécable
  const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const COURS = {
    bases: { nom: 'Reformer, les bases', niv: 1, mot: 'doux' },
    tous: { nom: 'Reformer, tous niveaux', niv: 2, mot: 'moyen' },
    ench: { nom: 'Reformer, enchaînements', niv: 3, mot: 'soutenu' },
    tapis: { nom: 'Tapis au sol', niv: 2, mot: 'moyen' },
  };
  const PROFS = { ines: 'Inès', maud: 'Maud', bastien: 'Bastien' };
  const DUREE = 50;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const maj = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const heure = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    return `${h}${NB}h` + (m ? `${NB}${String(m).padStart(2, '0')}` : '');
  };
  const nbPlaces = (n) => (n === 0 ? 'Complet' : `${n} place${n > 1 ? 's' : ''}`);

  /* ---------- le planning, lu dans la page ---------- */
  const ordreJours = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const cours = $$('.cr').map((li, i) => {
    const [h, m] = li.dataset.debut.split(':').map(Number);
    li.dataset.i = i;
    return {
      i, li,
      jour: ordreJours.indexOf(li.closest('.jour').dataset.jour),
      debut: h * 60 + m,
      type: li.dataset.cours,
      prof: li.dataset.prof,
      get places() { return Number(li.dataset.places); },
      set places(n) { li.dataset.places = n; },
    };
  });

  const now = new Date();
  const auj = (now.getDay() + 6) % 7; // 0 = lundi … 6 = dimanche
  const minute = now.getHours() * 60 + now.getMinutes();

  /* Les cours à venir, dans l’ordre, sur sept jours glissants (dans k jours). */
  const aVenir = () => {
    const liste = [];
    for (let k = 0; k <= 7; k++) {
      const j = (auj + k) % 7;
      cours.filter((c) => c.jour === j && (k === 0 ? c.debut > minute : k < 7 || c.debut <= minute))
        .forEach((c) => liste.push({ c, k }));
    }
    return liste;
  };
  const quand = ({ c, k }) => {
    const jour = k === 0 ? 'aujourd’hui' : k === 1 ? 'demain' : k === 7 ? `${JOURS[c.jour]} prochain` : JOURS[c.jour];
    return `${maj(jour)}, ${heure(c.debut)}`;
  };
  const prochainOuvert = (filtre = () => true) => aVenir().find((x) => x.c.places > 0 && filtre(x.c));

  /* ---------- statut en direct ---------- */
  const statut = () => {
    const el = $('#statut'), txt = $('#statut-txt');
    const du = (j) => cours.filter((c) => c.jour === j).sort((a, b) => a.debut - b.debut);
    const ouvre = (j) => du(j)[0].debut - 15; // le studio ouvre un quart d’heure avant le premier cours
    const jourSuivant = auj >= 5 ? 0 : auj + 1;
    const rouvre = `${auj >= 5 ? 'lundi' : 'demain'} à ${heure(ouvre(jourSuivant))}`;
    const liste = auj < 6 ? du(auj) : [];
    let etat = 'ferme', texte;
    if (!liste.length) texte = `Fermé le dimanche · rouvre ${rouvre}`;
    else {
      const debut = ouvre(auj), fin = liste[liste.length - 1].debut + DUREE;
      const restants = liste.filter((c) => c.debut + DUREE > minute).length;
      if (minute < debut) { etat = 'bientot'; texte = `Ouvre à ${heure(debut)} · ${liste.length} cours aujourd’hui`; }
      else if (minute < fin) {
        etat = 'ouvert';
        texte = restants === liste.length ? `Studio ouvert · ${liste.length} cours aujourd’hui`
          : restants > 1 ? `Studio ouvert · encore ${restants} cours aujourd’hui`
            : `Studio ouvert · dernier cours à ${heure(liste[liste.length - 1].debut)}`;
      } else texte = `Fermé · rouvre ${rouvre}`;
    }
    el.dataset.etat = etat;
    txt.textContent = texte;
  };

  /* ---------- places : l’affichage suit le compteur ---------- */
  const rendrePlaces = (c) => {
    const n = c.places, chip = $('.places', c.li);
    chip.textContent = nbPlaces(n);
    chip.className = `places${n === 0 ? ' complet' : n <= 2 ? ' peu' : ''}`;
  };

  /* ---------- prochain cours épinglé sur la photo, et prochain cours de chaque prof ---------- */
  const niveau = (el, type) => {
    const d = COURS[type];
    el.className = `niv n${d.niv}`;
    $('span', el).textContent = d.mot;
  };
  const epingle = () => {
    // « ouvert » : un cours où une nouvelle venue peut entrer (les enchaînements attendent cinq cours)
    const x = prochainOuvert((c) => c.type !== 'ench');
    if (!x) return;
    const { c } = x;
    $('#ep-cours').textContent = COURS[c.type].nom;
    $('#ep-quand').textContent = quand(x);
    $('#ep-init').textContent = PROFS[c.prof][0];
    $('#ep-init').className = `bois bois-s${c.prof === 'maud' ? ' bois-b' : c.prof === 'bastien' ? ' bois-c' : ''}`;
    $('#ep-prof').textContent = `avec ${PROFS[c.prof]}, ${DUREE}${NB}min`;
    niveau($('#ep-niv'), c.type);
    const p = $('#ep-places');
    p.textContent = nbPlaces(c.places);
    p.className = `places${c.places <= 2 ? ' peu' : ''}`;
    $('#ep-btn').dataset.i = c.i;
    $$('[data-prochain]').forEach((el) => {
      const y = prochainOuvert((d) => d.prof === el.dataset.prochain);
      el.textContent = y ? `Prochain${FINE}: ${quand(y).toLowerCase()}` : '';
    });
  };

  /* ---------- planning : onglets de jours, vue jour ou semaine, filtres ---------- */
  const jours = $('#jours');
  const onglets = $$('[role="tab"]');
  const filtre = { prof: '', cours: '' };
  let vue = 'jour';
  let jourChoisi = auj === 6 ? 0 : auj;

  // dates de la semaine affichée (le dimanche, on montre la semaine qui vient)
  const lundi = new Date(now);
  lundi.setDate(now.getDate() + (auj === 6 ? 1 : -auj));
  onglets.forEach((t, j) => {
    const d = new Date(lundi);
    d.setDate(lundi.getDate() + j);
    $('.j-date', t).textContent = d.getDate();
    if (j === auj) {
      t.classList.add('auj');
      t.insertAdjacentHTML('beforeend', '<span class="vs">, aujourd’hui</span>');
    }
  });

  const appliquer = () => {
    $$('.jour').forEach((sec) => {
      const lignes = $$('.cr', sec);
      lignes.forEach((li) => {
        li.hidden = (filtre.prof && li.dataset.prof !== filtre.prof) || (filtre.cours && li.dataset.cours !== filtre.cours);
      });
      const vide = lignes.every((li) => li.hidden);
      $('.jour-vide', sec).hidden = !vide;
      const j = ordreJours.indexOf(sec.dataset.jour);
      sec.hidden = vue === 'jour' ? j !== jourChoisi : vide;
      sec.toggleAttribute('role', false);
      if (vue === 'jour') sec.setAttribute('role', 'tabpanel');
    });
    jours.dataset.vue = vue;
    $('#onglets-jours').hidden = vue !== 'jour';
    onglets.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === jourChoisi));
      t.tabIndex = j === jourChoisi ? 0 : -1;
    });
    $$('[data-vue]', $('#outils')).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vue === vue)));
    $$('[data-filtre-prof]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtreProf === filtre.prof)));
    $$('.btn-prof').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.prof === filtre.prof)));
    const puce = $('#filtre-cours');
    puce.hidden = !filtre.cours;
    $('#filtre-cours-txt').textContent = filtre.cours ? `Seulement${FINE}: ${COURS[filtre.cours].nom}` : '';
  };

  $('#outils').hidden = false;
  $('#onglets-jours').hidden = false;
  onglets.forEach((t, j) => {
    t.addEventListener('click', () => { jourChoisi = j; appliquer(); });
    t.addEventListener('keydown', (e) => {
      const pas = { ArrowRight: 1, ArrowLeft: -1, Home: -j, End: onglets.length - 1 - j }[e.key];
      if (pas === undefined) return;
      e.preventDefault();
      jourChoisi = (j + pas + onglets.length) % onglets.length;
      appliquer();
      onglets[jourChoisi].focus();
      onglets[jourChoisi].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });
  $$('[data-vue]', $('#outils')).forEach((b) => b.addEventListener('click', () => { vue = b.dataset.vue; appliquer(); }));
  $$('[data-filtre-prof]').forEach((b) => b.addEventListener('click', () => { filtre.prof = b.dataset.filtreProf; appliquer(); }));
  $('#filtre-cours').addEventListener('click', () => { filtre.cours = ''; appliquer(); $('#outils [data-vue="semaine"]').focus(); });

  const versPlanning = () => {
    const t = $('#planning-t');
    t.tabIndex = -1;
    t.focus({ preventScroll: true });
    $('#planning').scrollIntoView({ block: 'start' });
  };
  $$('.btn-prof').forEach((b) => b.addEventListener('click', () => {
    const deja = filtre.prof === b.dataset.prof;
    filtre.prof = deja ? '' : b.dataset.prof;
    if (!deja) { vue = 'semaine'; versPlanning(); }
    appliquer();
  }));
  $$('[data-voir-cours]').forEach((a) => a.addEventListener('click', () => {
    filtre.cours = a.dataset.voirCours;
    vue = 'semaine';
    appliquer();
  }));

  // liste d’attente d’un cours complet
  $$('.btn-cr.attente').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    b.firstChild.textContent = on ? 'Sur la liste' : 'Liste d’attente';
  }));

  /* ---------- réservation : feuille en trois temps (choisir, infos, c’est réservé) ---------- */
  const resa = $('#resa');
  const form = $('#resa-form');
  const selFormule = $('#resa-formule');
  const NOTES = {
    essai: 'Réglé sur place. Déduit de la carte de 10 si tu la prends dans la semaine.',
    unite: 'Réglé en ligne ou sur place, sans engagement.',
    carnet5: 'Ce cours est le premier des cinq, valables deux mois.',
    carte10: 'Ce cours est le premier des dix, valables quatre mois.',
    abo: 'Un cours de reformer par semaine, sans engagement, résiliable chaque mois.',
    deja: 'On décompte ce cours de ta carte ou de ton abonnement.',
  };
  let choisi = null; // le cours en cours de réservation
  let declencheur = null;

  const etape = (nom) => {
    $$('.resa-etape', form).forEach((e) => { e.hidden = e.dataset.etape !== nom; });
    $('#resa-t').textContent = nom === 'choix' ? 'Choisis ton cours' : nom === 'ok' ? 'Ta réservation' : 'Réserver ce cours';
  };
  const noteFormule = () => {
    let note = NOTES[selFormule.value];
    if (choisi && choisi.type === 'ench') note = `Les enchaînements s’ouvrent après cinq cours au studio. ${note}`;
    $('#resa-formule-note').textContent = note;
  };
  const remplirInfos = (c) => {
    choisi = c;
    const x = aVenir().find((y) => y.c === c);
    $('#resa-cours').textContent = COURS[c.type].nom;
    $('#resa-quand').textContent = `${quand(x)}, avec ${PROFS[c.prof]} · ${nbPlaces(c.places)}`;
    const tapis = c.type === 'tapis';
    $('option[value="unite"]', selFormule).textContent = tapis ? `Un cours de tapis à l’unité, 22${NB}€` : `Un cours à l’unité, 38${NB}€`;
    $('option[value="essai"]', selFormule).disabled = c.type === 'ench';
    ['carnet5', 'carte10', 'abo'].forEach((v) => { $(`option[value="${v}"]`, selFormule).disabled = tapis; });
    if (selFormule.selectedOptions[0]?.disabled) selFormule.value = 'unite';
    noteFormule();
    etape('infos');
  };
  const remplirChoix = () => {
    // pour un premier cours, les enchaînements (après cinq cours) ne sont pas proposés
    const essai = selFormule.value === 'essai';
    const liste = aVenir().filter((x) => x.c.places > 0 && !(essai && x.c.type === 'ench')).slice(0, 6);
    $('#resa-liste').replaceChildren(...liste.map((x, n) => {
      const l = document.createElement('label');
      l.className = 'tuile';
      l.innerHTML = `<input type="radio" name="choix-cours" value="${x.c.i}"${n ? '' : ' checked'}>`
        + `<b>${quand(x)}</b><small>${COURS[x.c.type].nom}, avec ${PROFS[x.c.prof]}</small>`
        + `<span class="places${x.c.places <= 2 ? ' peu' : ''}">${nbPlaces(x.c.places)}</span>`;
      return l;
    }));
    $('#err-choix').textContent = '';
    etape('choix');
  };
  const ouvrirResa = (el) => {
    declencheur = el;
    form.reset();
    $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
    $$('.err', form).forEach((e) => { e.textContent = ''; });
    if (el?.dataset.formule) selFormule.value = el.dataset.formule;
    const li = el?.closest('.cr');
    const i = li ? li.dataset.i : el?.dataset.i;
    if (i !== undefined && cours[i].places > 0) remplirInfos(cours[i]); else remplirChoix();
    if ($('#offre').open) $('#offre').close();
    resa.showModal();
    $('#resa-t').focus();
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-resa]');
    if (!el || el.disabled) return;
    e.preventDefault();
    ouvrirResa(el);
  });
  $('#resa-continuer').addEventListener('click', () => {
    const r = $('input[name="choix-cours"]:checked', form);
    if (!r) { $('#err-choix').textContent = 'Choisis un cours pour continuer.'; return; }
    remplirInfos(cours[r.value]);
    $('#resa-prenom').focus();
  });
  $('#resa-changer').addEventListener('click', () => { remplirChoix(); $('#resa-t').focus(); });
  selFormule.addEventListener('change', noteFormule);

  const erreur = (champ, msg) => {
    champ.setAttribute('aria-invalid', String(Boolean(msg)));
    $(`#err-${champ.name}`).textContent = msg;
    return !msg;
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('[data-etape="infos"]', form).hidden) return;
    const prenom = $('#resa-prenom'), tel = $('#resa-tel');
    const numero = tel.value.replace(/[\s.-]/g, '');
    const okP = erreur(prenom, prenom.value.trim().length < 2 ? 'Indique ton prénom, pour que le prof t’accueille.' : '');
    const okT = erreur(tel, /^(?:\+33|0)[67]\d{8}$/.test(numero) ? '' : 'Indique un numéro de mobile, par exemple 06 12 34 56 78.');
    if (!okP || !okT) { (okP ? tel : prenom).focus(); return; }
    const c = choisi, x = aVenir().find((y) => y.c === c);
    c.places -= 1;
    rendrePlaces(c);
    c.li.classList.add('reserve');
    const b = $('.btn-cr', c.li);
    b.disabled = true;
    b.firstChild.textContent = 'Réservé';
    const lisible = numero.replace(/^\+33/, '0').replace(/(\d{2})(?=\d)/g, `$1${NB}`);
    $('#ok-txt').textContent = `${prenom.value.trim()}, ta place est gardée pour ${COURS[c.type].nom}, ${quand(x).toLowerCase()}, avec ${PROFS[c.prof]}. `
      + `Le code de la porte arrive par SMS au ${lisible}. Arrive dix minutes avant le début du cours.`;
    etape('ok');
    $('#ok-t').focus();
    epingle();
  });

  /* ---------- fermeture des fenêtres : bouton, clic sur le voile, Échap (natif) ---------- */
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-fermer]')) d.close();
    });
    d.addEventListener('close', () => {
      if (d === resa && declencheur && document.contains(declencheur)) declencheur.focus({ preventScroll: true });
    });
  });

  /* ---------- fenêtre « premier cours » : une seule fois, au défilement ---------- */
  const offre = $('#offre');
  const DEJA_VUE = 'chariot-offre-vue';
  const dejaVue = () => { try { return localStorage.getItem(DEJA_VUE) === '1'; } catch { return false; } };
  if (!dejaVue() && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (resa.open) return;
      try { localStorage.setItem(DEJA_VUE, '1'); } catch { /* navigation privée : tant pis, elle reviendra */ }
      offre.showModal();
      $('#offre-go').focus();
    }, { threshold: 0.2 });
    io.observe($('#quiz'));
  }
  $('#offre-go').addEventListener('click', () => {
    offre.close();
    const faux = document.createElement('span');
    faux.dataset.formule = 'essai';
    ouvrirResa(faux);
  });

  /* ---------- quiz : trois questions, un cours du planning ---------- */
  const quiz = $('#quiz-form');
  const questions = $$('.q', quiz);
  const rep = {};
  let q = 0;
  const MOMENTS = {
    matin: { txt: 'tôt le matin', ok: (c) => c.jour < 5 && c.debut < 660 },
    midi: { txt: 'à midi', ok: (c) => c.jour < 5 && c.debut >= 660 && c.debut < 840 },
    soir: { txt: 'le soir', ok: (c) => c.jour < 5 && c.debut >= 1020 },
    samedi: { txt: 'le samedi', ok: (c) => c.jour === 5 },
  };
  const montrer = (n) => {
    q = n;
    questions.forEach((f, i) => { f.hidden = i !== n; });
    $('#quiz-res').hidden = n < 3;
    $('#quiz-retour').hidden = n === 0 || n === 3;
    $('#quiz-etape').textContent = n < 3 ? `Question ${n + 1} sur 3` : 'Ton résultat';
    $$('.quiz-barre i', quiz).forEach((b, i) => b.classList.toggle('fait', i <= n));
  };
  const recommander = () => {
    const { a1, a2, a3 } = rep;
    const type = a2 === 'tapis' ? 'tapis' : a1 === 'nouveau' ? 'bases'
      : a1 === 'sol' ? (a2 === 'doux' ? 'bases' : 'tous')
        : a2 === 'doux' ? 'bases' : a2 === 'moyen' ? 'tous' : 'ench';
    const pourquoi = {
      tapis: 'Tu restes au sol\u202F: le cours de tapis travaille les mêmes principes que la machine, avec le poids du corps.',
      bases: a1 === 'nouveau' ? 'Pour un premier cours, on commence par les bases\u202F: le prof t’installe et règle les ressorts avec toi.'
        : 'Un cours doux pour prendre la machine en main, sans te presser.',
      tous: 'Le cours de la semaine\u202F: complet, au rythme du groupe, ouvert dès le premier cours.',
      ench: 'Tu connais la machine\u202F: les enchaînements vont plus vite, avec plus de ressorts.',
    }[type] + (a2 === 'soutenu' && type !== 'ench' ? ' Les enchaînements s’ouvrent après cinq cours au studio.' : '');
    const m = MOMENTS[a3];
    let x = prochainOuvert((c) => c.type === type && m.ok(c));
    let note = '';
    if (!x) {
      x = prochainOuvert((c) => c.type === type);
      note = ` Pas de cours ${COURS[type].nom.toLowerCase()} ${m.txt} avec des places cette semaine\u202F: voici le plus proche.`;
    }
    $('#qr-cours').textContent = COURS[type].nom;
    niveau($('#qr-niv'), type);
    $('#qr-quand').textContent = x ? `${quand(x)}, avec ${PROFS[x.c.prof]} · ${nbPlaces(x.c.places)}` : 'Complet cette semaine';
    $('#qr-pourquoi').textContent = pourquoi + note;
    const b = $('#qr-btn');
    if (x) b.dataset.i = x.c.i; else delete b.dataset.i;
  };
  questions.forEach((f, n) => f.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    rep[`a${n + 1}`] = b.dataset.v;
    $$('button', f).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    if (n < 2) { montrer(n + 1); $('legend', questions[n + 1]).focus(); }
    else { recommander(); montrer(3); $('#quiz-res').focus(); }
  }));
  $$('button[data-v]', quiz).forEach((b) => b.setAttribute('aria-pressed', 'false'));
  $('#quiz-retour').addEventListener('click', () => { montrer(q - 1); $('legend', questions[q]).focus(); });
  $('#quiz-refaire').addEventListener('click', () => {
    $$('button[data-v]', quiz).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    montrer(0);
    $('legend', questions[0]).focus();
  });
  montrer(0);

  /* ---------- onglets de l’appli : l’onglet actif suit la section lue ---------- */
  const liens = $$('.onglets a:not([data-resa])');
  const cible = { accueil: 'accueil', profs: 'profs', planning: 'planning', quiz: 'planning', cours: 'planning', formules: 'formules' };
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = cible[e.target.id];
        liens.forEach((a) => {
          if (id && a.hash === `#${id}`) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section').forEach((s) => spy.observe(s));
  }

  statut();
  epingle();
  appliquer();
})();
