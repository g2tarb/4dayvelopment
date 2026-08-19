/* ── Animations : cursor, glow, magnetic, scramble, reveal, counters ── */
import { $$, on, raf } from './utils.js';

export function initCursor() {
  if (matchMedia('(max-width: 768px)').matches) return;
  const dot  = document.createElement('div'); dot.id  = 'cursor-dot';
  const ring = document.createElement('div'); ring.id = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = -200, my = -200, rx = -200, ry = -200, hover = false;
  let anime = false;   // la boucle s'endort quand l'anneau a rejoint la souris

  on(document, 'mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (!anime) { anime = true; raf(tick); }
  }, { passive: true });
  on(document, 'mouseover', e => {
    if (e.target.closest('a,button,[class*="card"],[class*="btn"]') && !hover) {
      ring.classList.add('hover'); hover = true;
    }
  });
  on(document, 'mouseout', e => {
    if (e.target.closest('a,button,[class*="card"],[class*="btn"]') && hover) {
      ring.classList.remove('hover'); hover = false;
    }
  });
  on(document, 'mousedown', () => ring.classList.add('click'));
  on(document, 'mouseup',   () => ring.classList.remove('click'));

  function tick() {
    anime = true;   // une seule boucle a la fois, meme si un mousemove arrive en plein vol
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    // l'anneau a rattrape la souris : plus rien a animer jusqu'au prochain
    // mouvement, on rend la main au lieu de tourner a vide toute la visite
    if (Math.abs(mx - rx) + Math.abs(my - ry) < 0.2) { anime = false; return; }
    raf(tick);
  }
  raf(tick);
}

export function initGlow() {
  const glow = document.createElement('div');
  // transform et pas left/top : le halo suit la souris sur le compositeur,
  // sans relancer la mise en page a chaque mouvement
  glow.style.cssText = `
    position:fixed;left:0;top:0;width:350px;height:350px;
    background:radial-gradient(circle,rgba(218,84,38,0.06) 0%,transparent 70%);
    border-radius:50%;pointer-events:none;
    transform:translate(-50%,-50%);
    transition:transform .6s cubic-bezier(.23,1,.32,1);
    will-change:transform;
    z-index:0;
  `;
  document.body.appendChild(glow);
  on(document, 'mousemove', e => {
    glow.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`;
  }, { passive: true });
}

export function initMagnetic() {
  if (matchMedia('(max-width: 768px)').matches) return;
  $$('.magnetic').forEach(btn => {
    on(btn, 'mousemove', e => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      btn.style.transform = `translate(${(e.clientX - cx) * 0.22}px, ${(e.clientY - cy) * 0.22}px)`;
      const x = ((e.clientX - r.left) / r.width)  * 100;
      const y = ((e.clientY - r.top)  / r.height) * 100;
      btn.style.setProperty('--mx', x + '%');
      btn.style.setProperty('--my', y + '%');
    });
    on(btn, 'mouseleave', () => { btn.style.transform = ''; });
  });
}


export function initReveal() {
  const els = $$('.reveal');
  // Fallback : si IntersectionObserver est indisponible, on revele tout immediatement.
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const siblings = [...el.parentElement.querySelectorAll('.reveal:not(.visible)')];
      const idx = siblings.indexOf(el);
      const delay = el.dataset.delay || idx * 80;
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('visible');
      io.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  els.forEach(el => io.observe(el));
}
