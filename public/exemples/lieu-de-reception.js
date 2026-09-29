/* Mas de l'Aiguier (démo 4dayvelopment). La demande de date et la bascule de
   langue marchent en CSS seul (:has) ; ce script ajoute ce que le CSS ne peut
   pas faire : la langue du document et le titre de l'onglet, l'envoi simulé
   du formulaire, et la barre d'appel rangée quand le formulaire est à l'écran. */
(() => {
  'use strict';
  const racine = document.documentElement;
  const en = document.getElementById('l-en');
  const titres = { fr: document.title, en: 'Mas de l’Aiguier, weddings in the Luberon | 4dayvelopment demo' };

  const langue = () => {
    const l = en && en.checked ? 'en' : 'fr';
    racine.lang = l;
    document.title = titres[l];
  };
  document.querySelectorAll('input[name="langue"]').forEach(i => i.addEventListener('change', langue));
  langue(); // le navigateur peut restaurer la case cochée au retour sur la page

  const pouce = document.querySelector('.pouce');
  const demande = document.getElementById('demande');
  if (pouce && demande && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pouce.classList.toggle('cache', e.isIntersecting); pouce.inert = e.isIntersecting; }).observe(demande);
  }

  const form = document.getElementById('demande-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé, on vérifie juste les champs requis avant de confirmer.
    const vide = [...form.querySelectorAll('[required]')].find(f => !f.value.trim() || !f.checkValidity());
    if (vide) { vide.focus(); vide.reportValidity?.(); return; }
    form.classList.add('envoye');
  });
})();
