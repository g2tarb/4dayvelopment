/* ── Animations : cursor, glow, magnetic, scramble, reveal, counters ── */
import { $$, on, raf } from './utils.js';

export function initCursor() {
  if (matchMedia('(max-width: 768px)').matches) return;
  const dot  = document.createElement('div'); dot.id  = 'cursor-dot';
  const ring = document.createElement('div'); ring.id = 'cursor-ring';
  document.body.append(dot, ring);

  let mx = -200, my = -200, rx = -200, ry = -200, hover = false;

  on(document, 'mousemove', e => { mx = e.clientX; my = e.clientY; });
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
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    raf(tick);
  }
  raf(tick);
}

export function initGlow() {
  const glow = document.createElement('div');
  glow.style.cssText = `
    position:fixed;width:350px;height:350px;
    background:radial-gradient(circle,rgba(218,84,38,0.06) 0%,transparent 70%);
    border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);
    transition:left .6s cubic-bezier(.23,1,.32,1),top .6s cubic-bezier(.23,1,.32,1);
    z-index:0;
  `;
  document.body.appendChild(glow);
  on(document, 'mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  });
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

export function initScramble() {
  if (matchMedia('(max-width: 768px)').matches) return;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%';
  $$('.section-title').forEach(el => {
    // Les titres a HTML interne (em.gradient-text, <br>) ne sont jamais scrambles :
    // reecrire leur contenu en texte detruirait le degrade et les sauts de ligne.
    if (el.children.length > 0) return;
    const orig = el.innerHTML;            // sauvegarde/restauration par innerHTML, pas textContent
    const text = el.textContent;
    let frame, iv;
    on(el, 'mouseenter', () => {
      clearInterval(iv);
      frame = 0;
      iv = setInterval(() => {
        el.textContent = text.split('').map((c, i) =>
          c === ' ' ? ' ' : i < frame ? text[i] : chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        if (++frame > text.length) { el.innerHTML = orig; clearInterval(iv); }
      }, 32);
    });
    on(el, 'mouseleave', () => { clearInterval(iv); el.innerHTML = orig; });
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

export function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const end = parseFloat(el.dataset.target);
      const suf = el.dataset.suffix || '';
      const dur = 1800;
      const t0  = performance.now();
      function step(now) {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = (Number.isInteger(end) ? Math.round(e * end) : (e * end).toFixed(0)) + suf;
        if (p < 1) raf(step);
      }
      raf(step);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$('[data-target]').forEach(el => io.observe(el));
}
