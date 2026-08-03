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
  const toggles  = section.querySelectorAll('.demo-mode button');
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

  function fit() {
    // L'iframe rend un vrai viewport (390 ou 1200 px) réduit à la taille du cadre
    const desktop = device.classList.contains('is-desktop');
    const vw = desktop ? 1200 : 390;
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

  toggles.forEach(b => on(b, 'click', () => {
    toggles.forEach(x => x.classList.toggle('active', x === b));
    device.classList.toggle('is-desktop', b.dataset.mode === 'desktop');
    fit();
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
