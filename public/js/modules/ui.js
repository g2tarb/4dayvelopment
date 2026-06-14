/* ── UI : FAQ accordion, reduced motion ── */
import { $$, on } from './utils.js';

export function checkMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;}';
    document.head.appendChild(s);
  }
}

export function initFAQ() {
  $$('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn) return;

    on(btn, 'click', () => {
      const isOpen = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (answer) answer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });

    // Accessibilité clavier — Enter et Space déjà gérés nativement par <button>
    // Fermeture via Escape
    on(btn, 'keydown', e => {
      if (e.key === 'Escape' && item.classList.contains('open')) {
        item.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        if (answer) answer.setAttribute('aria-hidden', 'true');
        btn.focus();
      }
    });
  });
}
