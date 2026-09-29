/* Deûle Électricité (démo 4dayvelopment) : le choix de la puissance est en CSS
   (:has). Ce script reporte la puissance choisie dans le formulaire, simule
   l'envoi et range la barre d'appel quand le formulaire est à l'écran. */
(() => {
  'use strict';
  const form = document.getElementById('demande');
  const pouce = document.querySelector('.pouce');
  const visite = document.getElementById('visite');
  const choixKw = document.getElementById('kw');

  if (pouce && visite && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pouce.classList.toggle('cache', e.isIntersecting); pouce.inert = e.isIntersecting; }).observe(visite);
  }

  // Le disjoncteur choisi plus haut préremplit « Puissance souhaitée ».
  document.querySelectorAll('input[name="kw"]').forEach(r =>
    r.addEventListener('change', () => { if (choixKw) choixKw.value = r.value; }));

  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé, on vérifie juste les champs requis avant de confirmer.
    const vide = [...form.querySelectorAll('[required]')].find(f => !f.value.trim());
    if (vide) { vide.focus(); vide.reportValidity?.(); return; }
    form.classList.add('envoye');
  });
})();
