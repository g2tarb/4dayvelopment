/* ── Billes du hero : la page tourne comme une pièce et change de face ──
   Clic sur une bille → rotation 3D jusqu'à 90° (on voit la tranche),
   échange de face, poursuite de -90° à 0 : l'accueil est devenu le VRAI
   site d'exemple (iframe vivante). 3 s sur place, puis même mouvement
   en sens inverse pour revenir. Aucun effet miroir : chaque face n'est
   visible que du bon côté. */
import { on } from './utils.js';

const DEMOS = {
  'burger':         { name: 'Gras Double',            cat: 'Restauration',      img: 'burger-hero' },
  'ongles':         { name: "L'Atelier Nacre",        cat: 'Beauté',            img: 'ongles-hero' },
  'borne-recharge': { name: 'Voltéo',                 cat: 'Borne de recharge', img: 'borne-hero' },
  'coach-sportif':  { name: 'Forge Paris 11',         cat: 'Coach sportif',     img: 'coach-hero' },
  'barbier':        { name: 'Le Comptoir du Barbier', cat: 'Barbier',           img: 'barbier-hero' },
  'plombier':       { name: 'Rivière & Fils',         cat: 'Plombier',          img: 'plombier-hero' },
};
const HALF_MS = 750;   // demi-rotation (aller = 2 × 750 ms = 1,5 s)
const HOLD_MS = 3000;  // temps passé sur le site d'exemple

export function initBilles() {
  const hero = document.getElementById('hero');
  const peek = document.getElementById('hero-peek');
  if (!hero || !peek) return;

  const img     = peek.querySelector('img');
  const frame   = peek.querySelector('iframe');
  const catEl   = peek.querySelector('.hero-peek__cat');
  const nameEl  = peek.querySelector('.hero-peek__name');
  const billes  = [...hero.querySelectorAll('.bille')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;
  let busy = false;
  let open = false;
  let currentSlug = null;

  frame.addEventListener('load', () => {
    if (frame.src) frame.classList.add('ready');
  });

  function half(from, to, easing) {
    const a = hero.animate(
      [{ transform: `perspective(1500px) rotateY(${from}deg)` },
       { transform: `perspective(1500px) rotateY(${to}deg)` }],
      { duration: HALF_MS, easing, fill: 'forwards' }
    );
    return a.finished.then(() => a);
  }

  /* Pièce qui tourne : 0 → 90 (tranche), échange de face, -90 → 0 */
  async function turn(swap) {
    if (reduced) { swap(); return; }
    hero.classList.add('turning');
    const a1 = await half(0, 90, 'cubic-bezier(.5, 0, .85, .55)');
    swap();
    const a2 = await half(-90, 0, 'cubic-bezier(.15, .45, .3, 1)');
    a1.cancel();
    a2.cancel();
    hero.classList.remove('turning');
  }

  function setContent(bille) {
    const slug = bille.dataset.demo;
    const d = DEMOS[slug];
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
  }

  async function show(bille) {
    if (busy) return;
    if (open) { setContent(bille); armTimer(); return; }
    busy = true;
    setContent(bille);
    document.documentElement.classList.add('is-peeking');
    await turn(() => {
      hero.classList.add('peeking');
      peek.setAttribute('aria-hidden', 'false');
      peek.tabIndex = 0;
    });
    busy = false;
    open = true;
    armTimer();
  }

  async function hide() {
    if (busy || !open) return;
    clearTimeout(timer);
    busy = true;
    await turn(() => {
      hero.classList.remove('peeking');
      peek.setAttribute('aria-hidden', 'true');
      peek.tabIndex = -1;
    });
    document.documentElement.classList.remove('is-peeking');
    busy = false;
    open = false;
  }

  function armTimer() {
    clearTimeout(timer);
    timer = setTimeout(hide, HOLD_MS);
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
