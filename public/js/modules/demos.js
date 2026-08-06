/* ── Visionneuse d'exemples métier (section #exemples de la home) ──
   Iframe chargée uniquement quand la section devient visible (perf). */
import { on } from './utils.js';

const DEMOS = {
  'burger':         { label: 'Restauration',      url: '/exemples/burger' },
  'ongles':         { label: 'Beauté',            url: '/exemples/ongles' },
  'borne-recharge': { label: 'Borne de recharge', url: '/exemples/borne-recharge' },
  'coach-sportif':  { label: 'Coach sportif',     url: '/exemples/coach-sportif' },
  'barbier':        { label: 'Barbier',           url: '/exemples/barbier' },
  'plombier':       { label: 'Plombier',          url: '/exemples/plombier' },
};

export function initDemoViewer() {
  const section = document.getElementById('exemples');
  if (!section) return;

  const frame    = section.querySelector('.demo-screen iframe');
  const device   = section.querySelector('.demo-device');
  const chips    = section.querySelectorAll('.demo-chip');
  const openLink = section.querySelector('.demo-open');
  const ctaLink  = section.querySelector('.demo-cta');
  if (!frame || !device) return;

  let current = 'burger';
  let loaded  = false;

  function apply() {
    const d = DEMOS[current];
    if (loaded) frame.src = d.url;
    if (openLink) openLink.href = d.url;
    if (ctaLink)  ctaLink.href  = `/devis?metier=${current}`;
    chips.forEach(c => {
      const active = c.dataset.demo === current;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  const touch = matchMedia('(hover: none), (pointer: coarse)').matches;

  function fit() {
    if (touch) {
      // Tactile : iframe à la taille réelle de l'écran (Safari iOS fige les
      // iframes mises à l'échelle — le viewport natif garde le scroll au doigt)
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.transform = 'none';
      return;
    }
    // Souris : viewport mobile fidèle (390 px) réduit au cadre du téléphone
    const vw = 390;
    const screen = device.querySelector('.demo-screen');
    const scale = screen.clientWidth / vw;
    frame.style.width  = vw + 'px';
    frame.style.height = Math.round(screen.clientHeight / scale) + 'px';
    frame.style.transform = `scale(${scale})`;
  }

  chips.forEach(c => on(c, 'click', () => {
    current = c.dataset.demo;
    apply();
  }));

  on(window, 'resize', fit, { passive: true });

  // Chargement paresseux : l'iframe ne coûte rien tant que la section est hors écran
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      loaded = true;
      apply();
      fit();
      io.disconnect();
    }
  }, { rootMargin: '300px' });
  io.observe(section);

  apply();
  fit();
}
