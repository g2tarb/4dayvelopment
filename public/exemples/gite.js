/* Maison Tixier (démo 4dayvelopment) : le calendrier et le choix du séjour
   sont en CSS (:has). Ce script reporte le séjour choisi dans la demande,
   simule l'envoi et range la barre d'appel quand le calendrier ou la demande
   sont à l'écran. */
(() => {
  'use strict';
  const form = document.getElementById('resa');
  const pouce = document.querySelector('.pouce');
  const zones = ['dispos', 'demande'].map(id => document.getElementById(id)).filter(Boolean);

  if (pouce && zones.length && 'IntersectionObserver' in window) {
    const vues = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? vues.add(e.target) : vues.delete(e.target));
      pouce.classList.toggle('cache', vues.size > 0);
      pouce.inert = vues.size > 0;
    });
    zones.forEach(z => io.observe(z));
  }

  if (!form) return;
  const message = form.elements.message;
  const choisi = document.getElementById('sejour-choisi');
  message.addEventListener('input', () => message.setCustomValidity(''));

  // Les séjours sont rattachés au formulaire par l'attribut form="resa".
  document.querySelectorAll('input[name="sejour"]').forEach(r => r.addEventListener('change', () => {
    if (choisi && r.checked) choisi.textContent = r.value;
  }));

  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé, on vérifie les champs requis avant de confirmer.
    const vide = [...form.querySelectorAll('[required]')].find(f => !f.value.trim());
    if (vide) { vide.focus(); vide.reportValidity?.(); return; }
    const sejour = form.elements.sejour?.value;
    if (!sejour && !message.value.trim()) {
      message.setCustomValidity('Choisissez un séjour dans le calendrier, ou écrivez vos dates ici.');
      message.reportValidity();
      message.focus();
      return;
    }
    const merci = form.querySelector('.merci');
    if (sejour) merci.textContent = `Demande enregistrée pour ${sejour}. Dans la version en ligne, la Maison Tixier vous répond dans la journée avec la confirmation et le montant de l’acompte.`;
    form.classList.add('envoye');
  });
})();
