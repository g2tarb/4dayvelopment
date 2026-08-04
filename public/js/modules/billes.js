/* ── Billes du hero : aperçu plein écran d'un exemple métier ──
   Clic sur une bille → le hero se transforme 2 s en aperçu du site
   d'exemple (photo + nom + lien). Re-clic ou survol prolonge. */
import { on } from './utils.js';

const DEMOS = {
  'burger':         { name: 'Gras Double',            cat: 'Restauration',      img: 'burger-hero' },
  'ongles':         { name: "L'Atelier Nacre",        cat: 'Beauté',            img: 'ongles-hero' },
  'borne-recharge': { name: 'Voltéo',                 cat: 'Borne de recharge', img: 'borne-hero' },
  'coach-sportif':  { name: 'Forge Paris 11',         cat: 'Coach sportif',     img: 'coach-hero' },
  'barbier':        { name: 'Le Comptoir du Barbier', cat: 'Barbier',           img: 'barbier-hero' },
  'plombier':       { name: 'Rivière & Fils',         cat: 'Plombier',          img: 'plombier-hero' },
};
const PEEK_MS = 2000;

export function initBilles() {
  const hero = document.getElementById('hero');
  const peek = document.getElementById('hero-peek');
  if (!hero || !peek) return;

  const img    = peek.querySelector('img');
  const catEl  = peek.querySelector('.hero-peek__cat');
  const nameEl = peek.querySelector('.hero-peek__name');
  const timerEl = peek.querySelector('.hero-peek__timer');
  const billes = [...hero.querySelectorAll('.bille')];
  let timer = null;

  function hide() {
    hero.classList.remove('peeking');
    peek.setAttribute('aria-hidden', 'true');
    peek.tabIndex = -1;
  }

  function show(bille) {
    const slug = bille.dataset.demo;
    const d = DEMOS[slug];
    if (!d) return;
    img.src = `/exemples/img/${d.img}.webp`;
    img.alt = `Aperçu du site d'exemple ${d.name}`;
    catEl.textContent = d.cat;
    nameEl.textContent = d.name;
    peek.href = `/exemples/${slug}`;
    peek.style.setProperty('--bc', getComputedStyle(bille).getPropertyValue('--bc').trim() || '#f2b13b');
    hero.classList.add('peeking');
    peek.setAttribute('aria-hidden', 'false');
    peek.tabIndex = 0;
    // Relance la barre de temps
    timerEl.style.animation = 'none';
    void timerEl.offsetWidth;
    timerEl.style.animation = '';
    clearTimeout(timer);
    timer = setTimeout(hide, PEEK_MS);
  }

  billes.forEach(b => on(b, 'click', () => show(b)));

  // Survoler l'aperçu le fige (le temps de cliquer) ; sortir le referme
  on(peek, 'mouseenter', () => clearTimeout(timer));
  on(peek, 'mouseleave', () => { clearTimeout(timer); timer = setTimeout(hide, 500); });
  on(document, 'keydown', e => { if (e.key === 'Escape') { clearTimeout(timer); hide(); } });

  // Précharge des visuels quand le navigateur respire
  const preload = () => Object.values(DEMOS).forEach(d => { const i = new Image(); i.src = `/exemples/img/${d.img}.webp`; });
  if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 4000 });
  else setTimeout(preload, 2500);
}
