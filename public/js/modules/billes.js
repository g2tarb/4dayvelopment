/* ── Billes du hero : flip 3D vers l'accueil réel d'un site d'exemple ──
   Clic sur une bille → la page d'accueil pivote (rotateY) et laisse place
   au vrai accueil du site d'exemple (iframe vivante, photo en fond le
   temps du chargement), reste 2 s, puis pivote en sens inverse. */
import { on } from './utils.js';

const DEMOS = {
  'burger':         { name: 'Gras Double',            cat: 'Restauration',      img: 'burger-hero' },
  'ongles':         { name: "L'Atelier Nacre",        cat: 'Beauté',            img: 'ongles-hero' },
  'borne-recharge': { name: 'Voltéo',                 cat: 'Borne de recharge', img: 'borne-hero' },
  'coach-sportif':  { name: 'Forge Paris 11',         cat: 'Coach sportif',     img: 'coach-hero' },
  'barbier':        { name: 'Le Comptoir du Barbier', cat: 'Barbier',           img: 'barbier-hero' },
  'plombier':       { name: 'Rivière & Fils',         cat: 'Plombier',          img: 'plombier-hero' },
};
const FLIP_MS = 950;   // durée de la rotation (synchro avec le CSS)
const HOLD_MS = 2000;  // temps passé sur le site d'exemple

export function initBilles() {
  const hero = document.getElementById('hero');
  const peek = document.getElementById('hero-peek');
  if (!hero || !peek) return;

  const img     = peek.querySelector('img');
  const frame   = peek.querySelector('iframe');
  const catEl   = peek.querySelector('.hero-peek__cat');
  const nameEl  = peek.querySelector('.hero-peek__name');
  const billes  = [...hero.querySelectorAll('.bille')];
  let timer = null;
  let currentSlug = null;

  frame.addEventListener('load', () => {
    if (frame.src) frame.classList.add('ready');
  });

  function hide() {
    clearTimeout(timer);
    hero.classList.remove('peeking');
    document.documentElement.classList.remove('is-peeking');
    peek.setAttribute('aria-hidden', 'true');
    peek.tabIndex = -1;
  }

  function show(bille) {
    const slug = bille.dataset.demo;
    const d = DEMOS[slug];
    if (!d) return;
    if (slug !== currentSlug) {
      currentSlug = slug;
      img.src = `/exemples/img/${d.img}.webp`;
      frame.classList.remove('ready');
      frame.src = `/exemples/${slug}`;
    }
    img.alt = `Aperçu du site d'exemple ${d.name}`;
    catEl.textContent = d.cat;
    nameEl.textContent = d.name;
    peek.href = `/exemples/${slug}`;
    peek.style.setProperty('--bc', getComputedStyle(bille).getPropertyValue('--bc').trim() || '#f2b13b');
    peek.setAttribute('aria-hidden', 'false');
    peek.tabIndex = 0;
    hero.classList.add('peeking');
    document.documentElement.classList.add('is-peeking');
    clearTimeout(timer);
    timer = setTimeout(hide, FLIP_MS + HOLD_MS);
  }

  billes.forEach(b => on(b, 'click', () => show(b)));

  // Survoler l'aperçu le fige (le temps de cliquer) ; sortir le referme
  on(peek, 'mouseenter', () => clearTimeout(timer));
  on(peek, 'mouseleave', () => { clearTimeout(timer); timer = setTimeout(hide, 500); });
  on(document, 'keydown', e => { if (e.key === 'Escape') hide(); });

  // Précharge des visuels quand le navigateur respire
  const preload = () => Object.values(DEMOS).forEach(d => { const i = new Image(); i.src = `/exemples/img/${d.img}.webp`; });
  if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 4000 });
  else setTimeout(preload, 2500);
}
