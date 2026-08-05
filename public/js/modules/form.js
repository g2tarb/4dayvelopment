/* ── Forms : contact form, budget chips, toasts, exit intent ── */
import { $, $$, on, raf } from './utils.js';

const BUDGET_REDIRECT = {
  'Moins de 1 000€': '/essentiel',
  '1 000 à 2 000€':  '/devis',
  '2 000 à 5 000€':  '/devis',
  '5 000€ et plus':  '/devis',
};

function savePrefill(budget) {
  const name  = $('#f-name')?.value.trim()  || '';
  const email = $('#f-email')?.value.trim() || '';
  if (name)   sessionStorage.setItem('prefill_name',   name);
  if (email)  sessionStorage.setItem('prefill_email',  email);
  if (budget) sessionStorage.setItem('prefill_budget', budget);
}

export function initBudgetChips() {
  $$('.budget-chip').forEach(chip => {
    on(chip, 'click', () => {
      $$('.budget-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const budget = chip.dataset.value;
      const budgetInput = $('#f-budget');
      if (budgetInput) budgetInput.value = budget;

      savePrefill(budget);

      const dest = BUDGET_REDIRECT[budget];
      if (dest) {
        setTimeout(() => { window.location.href = dest; }, 150);
      }
    });
  });
}

export function initContactForm() {
  const form = $('#contact-form');
  if (!form) return;

  const btnText   = $('#btn-text');
  const btnLoader = $('#btn-loader');
  const btnSubmit = $('#btn-submit');
  const feedback  = $('#form-feedback');

  function validateField(input) {
    const err = document.getElementById('err-' + input.name);
    if (!err) return true;
    if (input.required && !input.value.trim()) {
      input.classList.add('error');
      err.textContent = 'Ce champ est requis.';
      return false;
    }
    if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      input.classList.add('error');
      err.textContent = 'Email invalide.';
      return false;
    }
    input.classList.remove('error');
    err.textContent = '';
    return true;
  }

  ['f-name', 'f-email', 'f-message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) on(el, 'blur',  () => validateField(el));
    if (el) on(el, 'input', () => { if (el.classList.contains('error')) validateField(el); });
  });

  on(form, 'submit', async e => {
    e.preventDefault();
    const fields = ['f-name', 'f-email', 'f-message'].map(id => document.getElementById(id));
    const valid  = fields.every(f => validateField(f));
    if (!valid) return;

    btnSubmit.disabled = true;
    btnText.hidden     = true;
    btnLoader.hidden   = false;
    feedback.className = 'form-feedback';
    feedback.textContent = '';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
         prenom:    $('#f-name').value.trim(),
         email:     $('#f-email').value.trim(),
         telephone: $('#f-phone').value.trim(),
         secteur:   $('#f-service').value + ($('#f-budget').value ? ' · budget: ' + $('#f-budget').value : ''),
         message:   $('#f-message').value.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        feedback.className   = 'form-feedback success visible';
        feedback.textContent = '✅ ' + data.message;
        form.reset();
        $$('.budget-chip').forEach(c => c.classList.remove('active'));
      } else {
        const msg = data.errors ? data.errors.join(' ') : data.message;
        feedback.className   = 'form-feedback error visible';
        feedback.textContent = '❌ ' + msg;
      }
    } catch {
      feedback.className   = 'form-feedback error visible';
      feedback.textContent = '❌ Erreur réseau. Vérifiez votre connexion et réessayez.';
    } finally {
      btnSubmit.disabled = false;
      btnText.hidden     = false;
      btnLoader.hidden   = true;
    }
  });
}

export function initToasts() {
  // Desactive — les faux toasts social proof degradent la confiance
}

export function initExit() {
  if (sessionStorage.getItem('exit-shown')) return;
  const overlay = $('#exit-overlay');
  if (!overlay) return;
  let triggered = false;
  on(document, 'mouseleave', e => {
    if (!triggered && e.clientY <= 0) {
      triggered = true;
      overlay.classList.add('show');
      sessionStorage.setItem('exit-shown', '1');
    }
  });
  const close = () => overlay.classList.remove('show');
  on($('#exit-backdrop'),    'click',   close);
  on($('#exit-close-btn'),   'click',   close);
  on($('#exit-close-icon'),  'click',   close);
  on($('#exit-cta-btn'),     'click',   close);
  on(document, 'keydown', e => { if (e.key === 'Escape') close(); });
}
