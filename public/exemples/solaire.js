/* Cabanel Solaire (démo 4dayvelopment) : les démarches s'ouvrent en <details>
   natif, sans script. Ce script simule l'envoi du formulaire et range la barre
   d'appel quand le formulaire est à l'écran (elle doublait son bouton). */
(() => {
  'use strict';
  const form = document.getElementById('demande');
  const pouce = document.querySelector('.pouce');
  const etude = document.getElementById('etude');

  if (pouce && etude && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pouce.classList.toggle('cache', e.isIntersecting); pouce.inert = e.isIntersecting; }).observe(etude);
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
