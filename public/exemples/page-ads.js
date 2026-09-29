/* Montagnon Chauffage (démo 4dayvelopment) : le tri de la panne est en CSS (:has).
   Ce script range la barre d'appel quand le gros numéro ou le formulaire sont
   à l'écran (elle les doublait), et simule l'envoi de la demande de rappel. */
(() => {
  'use strict';
  const form = document.getElementById('rappel-form');
  const pouce = document.querySelector('.pouce');
  const cibles = [document.querySelector('.ouv .appel'), document.getElementById('rappel')].filter(Boolean);

  if (pouce && cibles.length && 'IntersectionObserver' in window) {
    const vues = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => (e.isIntersecting ? vues.add(e.target) : vues.delete(e.target)));
      pouce.classList.toggle('cache', vues.size > 0);
      pouce.inert = vues.size > 0;
    });
    cibles.forEach(c => io.observe(c));
  }

  if (!form) return;
  const merci = form.querySelector('.merci');
  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé, on vérifie juste les champs requis avant de confirmer.
    const vide = [...form.querySelectorAll('[required]')].find(f => !f.value.trim());
    if (vide) { vide.focus(); vide.reportValidity?.(); return; }
    // Les réponses du tri sont rattachées au formulaire par l'attribut form.
    const panne = form.elements.panne ? form.elements.panne.value : '';
    if (merci) {
      merci.textContent = panne === 'Une odeur de gaz'
        ? 'Demande enregistrée. Si ça sent le gaz, sortez d’abord et appelez Urgence sécurité gaz au 0 800 47 33 33.'
        : 'Demande enregistrée' + (panne ? ' (' + panne.toLowerCase() + ')' : '') +
          '. Dans la version en ligne, Montagnon Chauffage vous rappelle dans l’heure, aux horaires d’ouverture.';
    }
    form.classList.add('envoye');
  });
})();
