/* Clé de 15 (démo 4dayvelopment) : le devis est en CSS (:has). Ce script
   reporte les trois choix du devis dans le formulaire de dépôt, simule l'envoi
   et range la barre du pouce quand le formulaire est à l'écran. */
(() => {
  'use strict';
  const form = document.getElementById('resa');
  const pouce = document.querySelector('.pouce');
  const rdv = document.getElementById('rdv');
  const devis = document.getElementById('devis');

  if (pouce && rdv && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pouce.classList.toggle('cache', e.isIntersecting); pouce.inert = e.isIntersecting; }).observe(rdv);
  }

  if (!form) return;

  // Le devis dit « vélo, panne, délai » : le formulaire reprend les mêmes réponses.
  const choix = n => devis.querySelector(`input[name="${n}"]:checked`)?.value;
  devis?.addEventListener('change', () => {
    const panne = choix('panne');
    let quand = choix('quand');
    if (panne === 'rev' && quand === 'jour') quand = '48'; // comme l'étiquette : pas de révision dans la journée
    document.getElementById('f-velo').value = choix('velo');
    document.getElementById('f-panne').value = panne;
    document.getElementById('f-quand').value = quand;
  });

  // Pas de dépôt dans le passé.
  const jour = document.getElementById('f-jour');
  if (jour) {
    const d = new Date();
    jour.min = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    jour.addEventListener('input', () => jour.setCustomValidity(''));
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé, on vérifie juste les champs requis avant de confirmer.
    const vide = [...form.querySelectorAll('[required]')].find(f => !f.value.trim());
    if (vide) { vide.focus(); vide.reportValidity?.(); return; }
    // Fermé le dimanche (0) et le lundi (1). Date lue en heure locale, pas en UTC.
    if ([0, 1].includes(new Date(jour.value + 'T00:00').getDay())) {
      jour.setCustomValidity('L’atelier est fermé le dimanche et le lundi.');
      jour.reportValidity();
      return;
    }
    form.classList.add('envoye');
  });
})();
