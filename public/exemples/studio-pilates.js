/* Chariot (démo 4dayvelopment) : le planning et le choix du cours sont en CSS
   (:has). Ce script ouvre le planning sur le jour courant, simule la réservation
   et range la barre d'action quand le planning est à l'écran. */
(() => {
  'use strict';
  const form = document.getElementById('reserver');
  const pouce = document.querySelector('.pouce');
  const plan = document.getElementById('planning');

  if (pouce && plan && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { pouce.classList.toggle('cache', e.isIntersecting); pouce.inert = e.isIntersecting; }).observe(plan);
  }

  if (!form) return;
  // lundi = 0 ... dimanche = 6 ; le studio est fermé le dimanche : on reste sur lundi
  const jours = form.querySelectorAll('input[name="jour"]');
  const auj = jours[(new Date().getDay() + 6) % 7];
  if (auj) auj.checked = true;

  form.addEventListener('submit', e => {
    e.preventDefault();
    // Démo : rien n'est envoyé. Le cours doit appartenir au jour affiché.
    const jour = form.querySelector('input[name="jour"]:checked').id.slice(2);
    const cours = form.querySelector(`.c-${jour} input:checked`);
    if (!cours) { form.querySelector(`.c-${jour} input`)?.focus(); return; }
    const vide = [...form.querySelectorAll('.coords [required]')].find(f => !f.value.trim());
    if (vide) { vide.focus(); vide.reportValidity?.(); return; }
    form.querySelector('.merci span').textContent = cours.value;
    form.classList.add('envoye');
  });
})();
