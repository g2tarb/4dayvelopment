/* Mas de l'Aiguier (démo 4dayvelopment). Le vérificateur de date, la bascule de langue,
   les fiches d'espace (:target) et le sommaire (popover) marchent sans JS. Ce script ajoute :
   la langue du document, du titre et des textes alternatifs ; le plan qui change de fiche sans
   sauter ; la visionneuse de photos ; le chapitre en cours dans le sommaire ; la barre du bas
   rangée quand elle ferait doublon ; l'envoi simulé de la demande de visite. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const racine = document.documentElement;

  /* Langue */
  const en = $('#l-en');
  const titres = { fr: document.title, en: 'Mas de l’Aiguier, Luberon weddings | 4dayvelopment demo' };
  const traduits = $$('[data-en]');
  traduits.forEach(el => { el.dataset.fr = el.getAttribute('alt') || ''; });
  const langue = () => {
    const l = en && en.checked ? 'en' : 'fr';
    racine.lang = l;
    document.title = titres[l];
    traduits.forEach(el => el.setAttribute('alt', el.dataset[l]));
  };
  $$('input[name="langue"]').forEach(i => i.addEventListener('change', langue));
  langue(); // le navigateur peut restaurer la case cochée au retour sur la page

  /* Plan du mas : une fiche à la fois, sans saut de page */
  const espaces = $('#espaces');
  const noms = ['aire', 'cour', 'platanes', 'magnanerie', 'chambres'];
  const choisir = nom => {
    espaces.dataset.esp = nom;
    $$('.zone, .onglets a', espaces).forEach(a => {
      if (a.getAttribute('href') === '#esp-' + nom) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };
  if (espaces) {
    const depart = location.hash.slice(5);
    choisir(noms.includes(depart) ? depart : 'aire');
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#esp-"]');
      if (!a) return;
      const nom = a.getAttribute('href').slice(5);
      if (!noms.includes(nom)) return;
      e.preventDefault();
      choisir(nom);
      const fiche = $('#esp-' + nom);
      if (espaces.contains(a)) fiche.scrollIntoView({ block: 'nearest' });
      else $('.espaces-grille', espaces).scrollIntoView({ block: 'start' });
    });
  }

  /* Visionneuse de la mosaïque */
  const vis = $('#visionneuse');
  const vignettes = $$('.mosaique .vignette');
  let ici = 0, ouvreur = null;
  const montrer = i => {
    ici = (i + vignettes.length) % vignettes.length;
    const a = vignettes[ici], mini = $('img', a), grande = $('#vis-img');
    grande.src = a.getAttribute('href');
    grande.alt = mini.alt;
    grande.setAttribute('width', mini.getAttribute('width'));
    grande.setAttribute('height', mini.getAttribute('height'));
    $('#vis-legende').innerHTML = $('figcaption', a.parentNode).innerHTML;
    $('#vis-compte').textContent = (ici + 1) + '/' + vignettes.length;
  };
  if (vis && vis.showModal) {
    vignettes.forEach((a, i) => a.addEventListener('click', e => {
      e.preventDefault();
      ouvreur = a;
      montrer(i);
      vis.showModal();
      $('#vis-fermer').focus();
    }));
    $('#vis-prec').addEventListener('click', () => montrer(ici - 1));
    $('#vis-suiv').addEventListener('click', () => montrer(ici + 1));
    $('#vis-fermer').addEventListener('click', () => vis.close());
    vis.addEventListener('click', e => { if (e.target === vis) vis.close(); });
    vis.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') montrer(ici - 1);
      if (e.key === 'ArrowRight') montrer(ici + 1);
    });
    vis.addEventListener('close', () => { if (ouvreur) ouvreur.focus(); });
  }

  /* Sommaire : se referme après un choix ; le chapitre en cours est marqué */
  const sommaire = $('#sommaire');
  if (sommaire) {
    const ouvrir = $('.barre-sommaire');
    if (ouvrir) {
      ouvrir.setAttribute('aria-expanded', 'false');
      sommaire.addEventListener('toggle', e => ouvrir.setAttribute('aria-expanded', String(e.newState === 'open')));
    }
    sommaire.addEventListener('click', e => {
      if (e.target.closest('a') && sommaire.matches(':popover-open')) sommaire.hidePopover();
    });
  }
  const liens = $$('#sommaire a');
  const chapitres = liens.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const barre = $('.barre');
  if ('IntersectionObserver' in window) {
    const espion = new IntersectionObserver(entrees => {
      entrees.forEach(e => {
        if (!e.isIntersecting) return;
        liens.forEach(a => {
          if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    chapitres.forEach(c => espion.observe(c));

    /* Barre du bas : rangée quand le vérificateur ou le formulaire sont déjà à l'écran */
    if (barre) {
      const vus = new Set();
      const garde = new IntersectionObserver(entrees => {
        entrees.forEach(e => e.isIntersecting ? vus.add(e.target) : vus.delete(e.target));
        const cacher = vus.size > 0;
        barre.classList.toggle('rangee', cacher);
        barre.inert = cacher;
      }, { rootMargin: '-35% 0px -35% 0px' });
      ['.verif', '#visite-form'].forEach(s => { const el = $(s); if (el) garde.observe(el); });
    }
  }

  /* Demande de visite : démo, rien n'est envoyé ; on vérifie les champs requis avant de confirmer */
  const form = $('#visite-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const vide = $$('[required]', form).find(f => !f.value.trim() || !f.checkValidity());
      if (vide) { vide.focus(); if (vide.reportValidity) vide.reportValidity(); return; }
      form.classList.add('envoye');
    });
  }
})();
