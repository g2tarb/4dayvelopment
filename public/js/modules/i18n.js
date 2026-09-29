/* ── i18n : async fetch depuis /locales/{lang}.json ── */
import { $, $$, on } from './utils.js';

const cache = {};

// La promesse est gardée, pas seulement le résultat : survol, focus et doigt
// posé préchauffent en même temps sans lancer trois fois la même requête.
function loadTranslations(lang) {
  cache[lang] ||= fetch(`/locales/${lang}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`i18n: impossible de charger ${lang}.json`);
      return res.json();
    })
    .catch(err => { delete cache[lang]; throw err; });
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
  if (btn) { btn.textContent = lang === 'fr' ? 'EN' : 'FR'; btn.setAttribute('aria-label', lang === 'fr' ? 'EN, English version' : 'FR, version française'); }
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

  // Les locales ne servent qu'au changement de langue : on les charge à
  // l'approche du bouton (survol, focus, doigt posé), pas au démarrage où
  // elles faisaient deux requêtes de plus au premier écran.
  const prechauffe = () => { loadTranslations('fr').catch(() => {}); loadTranslations('en').catch(() => {}); };
  ['pointerenter', 'focus', 'touchstart'].forEach(ev => on(btn, ev, prechauffe, { once: true, passive: true }));

  if (lang === 'en') await applyLang('en');

  on(btn, 'click', async () => {
    lang = lang === 'fr' ? 'en' : 'fr';
    await applyLang(lang);
  });
}
