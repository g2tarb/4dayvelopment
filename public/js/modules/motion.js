/* ── La couche motion : ce qui fait la difference au premier scroll ──
   Quatre effets transverses, dans la DA existante :
   - les titres de section se revelent mot a mot, chaque mot monte de sous
     une ligne de masque (les <em> au degrade restent des blocs entiers :
     un degrade decoupe au texte ne peint pas ses descendants transformes) ;
   - les cartes s'inclinent en 3D sous le curseur, un reflet suit la souris ;
   - le bandeau de references est pilote a la main : sa vitesse et son
     inclinaison repondent a la velocite du defilement ;
   - le curseur annonce les liens externes d'une fleche qui grossit.
   Chaque effet est optionnel et se retire seul : tactile, mouvement reduit
   ou absence d'element, et il ne s'installe pas. */
import { $$, on } from './utils.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch   = () => matchMedia('(hover: none), (pointer: coarse)').matches;

/* ── Titres : revelation mot a mot sous masque ───────────────── */
export function initSplitTitles() {
  if (!('IntersectionObserver' in window)) return;

  $$('.section-title').forEach(el => {
    split(el);
    // L'i18n reecrit le innerHTML au changement de langue : on redecoupe.
    const mo = new MutationObserver(() => {
      if (el.dataset.splitting === '1') return;
      split(el);
    });
    mo.observe(el, { childList: true });
  });

  /* Decoupe par LIGNE, aux <br> : chaque ligne monte de sous son masque.
     Pas par mot : des mots en inline-block perdent le crenage aux
     frontieres, ce qui suffit a faire replier les lignes serrees et a
     doubler la hauteur du titre. Une ligne entiere garde exactement la
     largeur et les retours du texte d'origine, meme sur mobile ou elle
     peut se replier a l'interieur de son masque. */
  function split(el) {
    el.dataset.splitting = '1';
    const nodes = [...el.childNodes];
    el.textContent = '';
    let i = 0, tampon = [];

    const flush = () => {
      if (!tampon.length) return;
      const mask = document.createElement('span');
      mask.className = 'st-mask';
      const w = document.createElement('span');
      w.className = 'st-w';
      w.style.setProperty('--std', (i++ * 110) + 'ms');
      tampon.forEach(n => w.appendChild(n));
      mask.appendChild(w);
      el.appendChild(mask);
      tampon = [];
    };

    nodes.forEach(node => {
      if (node.nodeName === 'BR') flush();     // le masque remplace le saut
      else tampon.push(node);
    });
    flush();

    el.classList.add('st-split');
    // le flag tombe apres que l'observateur a digere nos propres mutations
    requestAnimationFrame(() => { el.dataset.splitting = '0'; });
  }
}

/* ── Cartes : inclinaison 3D + reflet sous le curseur ────────── */
export function initTilt() {
  if (touch() || reduced()) return;

  $$('.service-card, .show-card, .testimonial-card').forEach(card => {
    let waited = null, backTimer = null;

    on(card, 'pointermove', e => {
      if (waited) return;
      waited = requestAnimationFrame(() => {
        waited = null;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform =
          `perspective(900px) rotateX(${((0.5 - py) * 5).toFixed(2)}deg)` +
          ` rotateY(${((px - 0.5) * 6).toFixed(2)}deg) translateY(-4px)`;
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
    });

    on(card, 'pointerenter', () => {
      clearTimeout(backTimer);
      card.classList.add('is-tilt');       // transition courte : le tilt colle
      card.classList.remove('is-tilt-back');
    });

    on(card, 'pointerleave', () => {
      cancelAnimationFrame(waited);
      waited = null;
      card.classList.remove('is-tilt');
      card.classList.add('is-tilt-back');  // retour souple a plat
      card.style.transform = '';
      backTimer = setTimeout(() => card.classList.remove('is-tilt-back'), 550);
    });
  });
}

/* ── Bandeau de references : vitesse et skew lies au defilement ── */
export function initVelocityMarquee() {
  const track = document.querySelector('.logos-track');
  if (!track || reduced()) return;

  track.style.animation = 'none';        // le CSS passe la main au JS

  let x = 0, vel = 0, skew = 0, lastY = scrollY, half = 0;
  let pause = 0, pauseCible = 0;         // survol : on ralentit jusqu'a l'arret
  let visible = false, raf = null, last = 0;

  const mesure = () => { half = track.scrollWidth / 2; };
  new ResizeObserver(mesure).observe(track);
  mesure();

  on(track, 'mouseenter', () => { pauseCible = 1; });
  on(track, 'mouseleave', () => { pauseCible = 0; });

  function frame(now) {
    raf = null;
    const dt = Math.min(48, now - last || 16);
    last = now;

    // vitesse du scroll, amortie : c'est elle qui penche et accelere le ruban
    vel += (scrollY - lastY - vel) * 0.12;
    lastY = scrollY;
    pause += (pauseCible - pause) * 0.09;

    const boost = Math.min(3.5, Math.abs(vel) * 0.045);
    const base = half / 26000;           // un demi-tour en ~26 s au repos
    x -= base * dt * (1 + boost) * (1 - pause);
    if (x <= -half) x += half;

    const skewCible = Math.max(-9, Math.min(9, vel * 0.14));
    skew += (skewCible - skew) * 0.10;

    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;

    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const wake = () => {
    if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
  };

  new IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting);
    if (visible) wake(); else { cancelAnimationFrame(raf); raf = null; }
  }, { rootMargin: '60px' }).observe(track);

  on(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else wake();
  });
}

/* ── Curseur : la fleche des liens externes ──────────────────── */
export function initCursorFlair() {
  const ring = document.getElementById('cursor-ring');
  if (!ring) return;

  const label = document.createElement('span');
  label.className = 'cursor-label';
  label.textContent = '↗';
  ring.appendChild(label);

  on(document, 'mouseover', e => {
    if (e.target.closest('[data-cursor-arrow]')) ring.classList.add('flair');
  });
  on(document, 'mouseout', e => {
    if (e.target.closest('[data-cursor-arrow]')) ring.classList.remove('flair');
  });
}
