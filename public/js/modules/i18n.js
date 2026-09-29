/* ── i18n : async fetch depuis /locales/{lang}.json ── */
import { $, $$, on } from './utils.js';

const cache = {};

async function loadTranslations(lang) {
  if (cache[lang]) return cache[lang];
  const res = await fetch(`/locales/${lang}.json`);
  if (!res.ok) throw new Error(`i18n: impossible de charger ${lang}.json`);
  cache[lang] = await res.json();
  return cache[lang];
}

export async function applyLang(lang) {
  const t = await loadTranslations(lang);

  $$('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.innerHTML = t[key];
  });
  $$('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    if (t[key] !== undefined) el.placeholder = t[key];
  });

  const btn = $('#lang-toggle');
  if (btn) btn.innerHTML = lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR';
  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);
}

export async function initLang() {
  const btn = $('#lang-toggle');
  if (!btn) return;

  // Téléphone : dans le coin bas, le bouton passait par-dessus le contenu
  // (boutons de la FAQ, liens des avis) en plus de la barre d'onglets. Il
  // rejoint la barre du haut, à gauche du menu, et se masque avec elle.
  const nav = $('#navbar'), burger = $('#hamburger'), bloc = btn.parentElement;
  if (nav && burger) {
    const mobile = matchMedia('(max-width: 900px)');
    const place = () => (mobile.matches ? nav.insertBefore(btn, burger) : bloc.appendChild(btn));
    place();
    mobile.addEventListener('change', place);
  }

  let lang = localStorage.getItem('lang') || 'fr';

  // Précharger les deux locales en arrière-plan dès le démarrage
  loadTranslations('fr').catch(() => {});
  loadTranslations('en').catch(() => {});

  if (lang === 'en') await applyLang('en');

  on(btn, 'click', async () => {
    lang = lang === 'fr' ? 'en' : 'fr';
    await applyLang(lang);
  });
}
