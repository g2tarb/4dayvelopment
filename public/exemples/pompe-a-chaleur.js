/* Berthier Énergies (démo 4dayvelopment) : le simulateur d'aide est en CSS (:has),
   ce script simule l'envoi du formulaire et range la barre d'appel quand le
   formulaire est à l'écran (elle doublait son bouton et masquait ses champs). */
(() => {
  'use strict';
  const form = document.getElementById('demande');
  const pouce = document.querySelector('.pouce');
  const visite = document.getElementById('visite');

  if (pouce && visite && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pouce.classList.toggle('cache', e.isIntersecting); pouce.inert = e.isIntersecting; }).observe(visite);
  }

  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé, on vérifie juste les champs requis avant de confirmer.
    const vide = [...form.querySelectorAll('[required]')].find(f => !f.value.trim());
    if (vide) { vide.focus(); vide.reportValidity?.(); return; }
    form.classList.add('envoye');
  });
})();
