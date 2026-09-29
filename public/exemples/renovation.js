/* Kerleau Rénovation (démo 4dayvelopment) : le tri de la demande (plan, visite,
   délai) est en CSS (:has). Ce script simule l'envoi du formulaire et range la
   barre d'appel quand le formulaire est à l'écran (elle masquait ses champs). */
(() => {
  'use strict';
  const form = document.getElementById('demande');
  const pouce = document.querySelector('.pouce');
  const devis = document.getElementById('devis');

  if (pouce && devis && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pouce.classList.toggle('cache', e.isIntersecting); pouce.inert = e.isIntersecting; }).observe(devis);
  }

  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé. form.elements inclut les choix du tri, rattachés
    // au formulaire par l'attribut form ; on renvoie au premier champ invalide.
    const invalide = [...form.elements].find(f => f.willValidate && !f.checkValidity());
    if (invalide) { invalide.focus(); invalide.reportValidity(); return; }
    form.classList.add('envoye');
  });
})();
