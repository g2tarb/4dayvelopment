/* Le Comptoir du Barbier — carnet de rendez-vous, topbar, toast (démo 4dayvelopment) */
(() => {
  const joursEl = document.getElementById('jours');
  const grilleEl = document.getElementById('grille');
  const recapEl = document.getElementById('recap');
  const toast = document.getElementById('toast');
  const pills = [...document.querySelectorAll('.pill')];

  /* ── Toast ── */
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 4000);
  }

  /* ── Topbar ── */
  const topbar = document.getElementById('topbar');
  addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', scrollY > 40);
  }, { passive: true });

  /* ── Les jours : Mar → Sam, prochaine occurrence de chacun ── */
  const NOMS = { 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' };
  const ABR = { 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam' };
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const now = new Date();
  const jours = [2, 3, 4, 5, 6].map(wd => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7));
    return { wd, date: d };
  });
  const memeJour = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  /* ── Les créneaux : 10 h → 19 h 30, pas de 30 min ── */
  const CRENEAUX = [];
  for (let h = 10; h < 20; h++) for (const m of [0, 30]) CRENEAUX.push({ h, m });
  const fmtH = c => c.h + 'h' + (c.m ? '30' : '00');

  /* Occupation crédible et déterministe : samedi presque plein, mardi calme */
  const DENSITE = { 2: 0.18, 3: 0.32, 4: 0.45, 5: 0.6, 6: 0.88 };
  function hash(n) {
    n = Math.imul(n ^ (n >>> 15), 2246822519);
    n = Math.imul(n ^ (n >>> 13), 3266489917);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function estPris(jour, i) {
    const graine = (jour.date.getMonth() * 31 + jour.date.getDate()) * 64 + i * 7 + jour.wd;
    return hash(graine) < DENSITE[jour.wd];
  }

  /* ── État ── */
  let jourActif = jours.reduce((a, b) => (a.date <= b.date ? a : b));
  let creneau = null;   // { label } ou null
  let presta = pills.find(p => p.getAttribute('aria-pressed') === 'true');

  /* ── Récap en Fraunces italique ── */
  function majRecap() {
    if (!creneau) {
      recapEl.innerHTML = 'Le carnet est ouvert — choisissez votre jour et votre heure.';
      return;
    }
    const d = jourActif.date;
    const quand = NOMS[jourActif.wd] + ' ' + d.getDate() + ' ' + MOIS_LONG[d.getMonth()] + ', ' + creneau.label;
    const quoi = presta.dataset.nom + ', <b>' + presta.dataset.prix + ' €</b>';
    recapEl.innerHTML = '« ' + quand + ' — ' + quoi + '. On vous attend. »';
  }

  /* ── Sélecteur de jour ── */
  function rendreJours() {
    joursEl.innerHTML = '';
    jours.forEach(j => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jour' + (memeJour(j.date, now) ? ' auj' : '');
      b.setAttribute('aria-pressed', String(j === jourActif));
      if (memeJour(j.date, now)) b.title = 'Aujourd’hui';
      b.setAttribute('aria-label', NOMS[j.wd] + ' ' + j.date.getDate() + ' ' + MOIS_LONG[j.date.getMonth()]);
      b.innerHTML = '<span class="d">' + ABR[j.wd] + '</span><span class="n">' + j.date.getDate() + '</span><span class="m">' + MOIS[j.date.getMonth()] + '</span>';
      b.addEventListener('click', () => {
        if (j === jourActif) return;
        jourActif = j;
        creneau = null;
        rendreJours();
        rendreGrille();
        majRecap();
      });
      joursEl.appendChild(b);
    });
  }

  /* ── Grille de créneaux ── */
  const COCHE = '<svg class="coche" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5.2 5.2L20 5.8"/></svg>';

  function rendreGrille() {
    grilleEl.innerHTML = '';
    const aujourdhui = memeJour(jourActif.date, now);
    let libres = 0;
    const boutons = CRENEAUX.map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      const midi = c.h === 12 || c.h === 13;
      const passe = aujourdhui && (c.h + c.m / 60) <= (now.getHours() + now.getMinutes() / 60);
      const pris = !midi && (passe || estPris(jourActif, i));
      b.innerHTML = '<span class="t">' + fmtH(c) + '</span>';
      if (midi) {
        b.className = 'slot midi';
        b.disabled = true;
        b.title = 'Sans rendez-vous le midi — passez nous voir';
      } else if (pris) {
        b.className = 'slot pris';
        b.disabled = true;
        b.setAttribute('aria-label', fmtH(c) + ' — déjà pris');
      } else {
        b.className = 'slot libre';
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', fmtH(c) + ' — libre');
        libres++;
        b.addEventListener('click', () => choisir(b, c));
      }
      return b;
    });
    /* Le carnet n'est jamais tout à fait plein : on garde au moins deux pages blanches */
    if (libres === 0) {
      boutons.filter(b => b.classList.contains('pris')).slice(-2).forEach(b => {
        const c = CRENEAUX[boutons.indexOf(b)];
        b.className = 'slot libre';
        b.disabled = false;
        b.removeAttribute('aria-label');
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => choisir(b, c));
      });
    }
    boutons.forEach(b => grilleEl.appendChild(b));
  }

  function choisir(btn, c) {
    const deja = btn.classList.contains('mine');
    const prev = grilleEl.querySelector('.mine');
    if (prev) {
      prev.classList.remove('mine');
      prev.setAttribute('aria-pressed', 'false');
      const svg = prev.querySelector('.coche');
      if (svg) svg.remove();
    }
    if (deja) { creneau = null; majRecap(); return; }
    btn.classList.add('mine');
    btn.setAttribute('aria-pressed', 'true');
    btn.insertAdjacentHTML('afterbegin', COCHE);
    creneau = { label: fmtH(c) };
    majRecap();
  }

  /* ── Pastilles de prestation ── */
  pills.forEach(p => {
    p.addEventListener('click', () => {
      pills.forEach(q => q.setAttribute('aria-pressed', 'false'));
      p.setAttribute('aria-pressed', 'true');
      presta = p;
      majRecap();
    });
  });

  /* ── Confirmation ── */
  document.getElementById('confirmer').addEventListener('click', () => {
    if (!creneau) {
      say('Choisissez d’abord un jour et une heure — le carnet a horreur du vide.');
      return;
    }
    say('Ceci est une démonstration — mais le fauteuil vous irait bien.');
  });

  rendreJours();
  rendreGrille();
  majRecap();
})();
