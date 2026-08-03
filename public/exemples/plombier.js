/* Rivière & Fils — diagnostic d'urgence en deux gestes + topbar + toast
   (démo 4dayvelopment — reveals, parallaxe et fond assurés par soul.js) */
(() => {
  'use strict';
  const $ = s => document.getElementById(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Topbar ── */
  const topbar = $('topbar');
  addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', scrollY > 30);
  }, { passive: true });

  /* ── Données du diagnostic ── */
  const SOUCIS = {
    fuite:     { nom: "Fuite d'eau",
                 prix: "déplacement + diagnostic 49 €, offert si nous faisons les travaux" },
    chauffe:   { nom: "Chauffe-eau en panne",
                 prix: "diagnostic 49 € · remplacement dès 690 €, pose comprise" },
    wc:        { nom: "WC ou canalisation bouchés",
                 prix: "débouchage dès 90 €, évacuation testée avant notre départ" },
    chaudiere: { nom: "Chaudière (panne ou entretien)",
                 prix: "entretien 129 €/an, attestation incluse · panne : diagnostic 49 €" },
    radiateur: { nom: "Radiateur froid",
                 prix: "déplacement + diagnostic 49 €, offert si nous faisons les travaux" },
    autre:     { nom: "Autre chantier",
                 prix: "visite technique et devis gratuits, chiffrés sous 48 h" }
  };
  const URGENCES = {
    now:  { delai: "aujourd'hui, sous 2 h" },
    jour: { delai: "aujourd'hui avant 18 h" },
    plan: { delai: "cette semaine, au créneau qui vous arrange" }
  };

  const ecrans = { 1: $('ecran1'), 2: $('ecran2'), 3: $('ecran3') };
  const etapeEl = $('diagEtape');
  const ETAPES = { 1: 'Étape 1 sur 2', 2: 'Étape 2 sur 2', 3: 'Diagnostic terminé' };
  let souci = null;

  function goto(n) {
    Object.values(ecrans).forEach(e => { e.hidden = true; e.classList.remove('in'); });
    const e = ecrans[n];
    e.hidden = false;
    etapeEl.textContent = ETAPES[n];
    requestAnimationFrame(() => requestAnimationFrame(() => e.classList.add('in')));
    const q = e.querySelector('.dscreen__q');
    if (q) q.focus({ preventScroll: true });
  }

  /* ── Machine à écrire ── */
  let run = 0;
  function type(el, txt) {
    return new Promise(res => {
      const my = run;
      el.textContent = '';
      if (reduced) { el.textContent = txt; return res(); }
      el.classList.add('typing');
      let i = 0;
      (function step() {
        if (my !== run) { el.classList.remove('typing'); return res(); }
        el.textContent = txt.slice(0, ++i);
        if (i < txt.length) setTimeout(step, 16);
        else { el.classList.remove('typing'); res(); }
      })();
    });
  }

  async function remplirBon(urg) {
    run++;
    const s = SOUCIS[souci];
    const delai = (souci === 'autre' && urg === 'plan')
      ? 'visite technique sous 48 h'
      : URGENCES[urg].delai;
    const num = 'N° ' + String(new Date().getFullYear()).slice(2) + '-' +
                (1000 + Math.floor(Math.random() * 9000));
    $('conseil').hidden = urg !== 'now';
    ['bonNum', 'bonSouci', 'bonDelai', 'bonPrix'].forEach(id => { $(id).textContent = ''; });
    goto(3);
    await type($('bonNum'), num);
    await type($('bonSouci'), s.nom);
    await type($('bonDelai'), delai);
    await type($('bonPrix'), s.prix);
  }

  /* ── Écran 1 : le souci ── */
  document.querySelectorAll('[data-souci]').forEach(t => {
    t.addEventListener('click', () => {
      souci = t.dataset.souci;
      $('backSouci').textContent = '‹ ' + SOUCIS[souci].nom + ' · modifier';
      goto(2);
    });
  });

  /* ── Écran 2 : l'urgence ── */
  document.querySelectorAll('[data-urg]').forEach(t => {
    t.addEventListener('click', () => { remplirBon(t.dataset.urg); });
  });

  $('backSouci').addEventListener('click', () => goto(1));
  $('restart').addEventListener('click', () => {
    run++;
    souci = null;
    $('rappelForm').hidden = true;
    goto(1);
    $('ecran1').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  });

  /* ── Toast ── */
  const toast = $('toast');
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 4200);
  }

  /* ── Être rappelé ── */
  const form = $('rappelForm');
  $('btnRappel').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) $('r-nom').focus();
  });
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const nom = $('r-nom').value.trim();
    const tel = $('r-tel').value.replace(/\D/g, '');
    if (!nom || tel.length < 6) {
      say('Un nom et un numéro, et on vous rappelle. Promis, rien d’autre.');
      return;
    }
    form.reset();
    form.hidden = true;
    say('Démo : sur le vrai site, ' + nom + ', on vous rappellerait dans les 10 minutes.');
  });
})();
