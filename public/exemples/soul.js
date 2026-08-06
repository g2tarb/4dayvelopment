/* ================================================================
   SOUL.JS — ambiance partagée des démos 4dayvelopment
   Constellations dessinées au scroll + champ d'étoiles en parallaxe
   (adapté de scory.dev), curseur point + anneau, reveals décalés,
   parallaxe d'images, grain. Zéro dépendance, ~7 Ko.

   Usage :
   <script src="/exemples/soul.js" defer
           data-c1="242,177,59"    couleur étoiles/traits (rgb)
           data-c2="158,200,255"   couleur alternée des traits
           data-fade="0"           0 = visible dès le hero, 1 = après
           data-density="90"       nb d'étoiles du champ
           data-cursor="1"></script>
   Marquage HTML : [data-rv] reveal, [data-para] parallaxe image.
   ================================================================ */
(() => {
  const cfg = document.currentScript ? document.currentScript.dataset : {};
  const C1 = cfg.c1 || '242,177,59';
  const C2 = cfg.c2 || '158,200,255';
  const FADE_AFTER_HERO = cfg.fade !== '0';
  const DENSITY = parseInt(cfg.density || '90', 10);
  const WANT_CURSOR = cfg.cursor !== '0';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 768px)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── Styles injectés ── */
  const style = document.createElement('style');
  style.textContent = `
    #soul-sky{position:fixed;inset:0;z-index:0;pointer-events:none}
    #soul-grain{position:fixed;inset:-8%;z-index:9998;pointer-events:none;opacity:.42;mix-blend-mode:overlay;
      background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>")}
    .soul-dot{position:fixed;z-index:9999;width:6px;height:6px;border-radius:50%;background:rgb(${C1});
      transform:translate(-50%,-50%);pointer-events:none;left:-40px;top:-40px}
    .soul-ring{position:fixed;z-index:9999;width:34px;height:34px;border-radius:50%;border:1px solid rgba(${C1},.55);
      transform:translate(-50%,-50%);pointer-events:none;left:-40px;top:-40px;
      transition:width .3s,height .3s,border-color .3s}
    .soul-ring.is-hover{width:56px;height:56px;border-color:rgba(${C2},.8)}
    @media (hover:none),(pointer:coarse){.soul-dot,.soul-ring{display:none}}
    [data-rv]{opacity:0;transform:translateY(28px);
      transition:opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1)}
    [data-rv].in{opacity:1;transform:none}
    @media (prefers-reduced-motion:reduce){[data-rv]{opacity:1;transform:none;transition:none}}
  `;
  document.head.appendChild(style);

  /* ── Grain ── */
  const grain = document.createElement('div');
  grain.id = 'soul-grain';
  document.body.appendChild(grain);

  /* ── Reveals décalés ── */
  const rvEls = document.querySelectorAll('[data-rv]');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.style.transitionDelay = (parseInt(el.dataset.rv || '0', 10) * 80) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
      // Bas de page atteint : plus rien ne doit rester invisible. Sans ce filet, un
      // scroll rapide au doigt (ou dans le mockup de la home) amenait sur du vide
      // en attendant que les derniers blocs veuillent bien se reveler.
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 8) revelerTout();
    // marge basse positive : le bloc est revele avant d'entrer dans l'ecran, pas apres
    }, { threshold: 0, rootMargin: '0px 0px 20% 0px' });

    function revelerTout() {
      rvEls.forEach(el => {
        if (el.classList.contains('in')) return;
        el.style.transitionDelay = '0ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }

    rvEls.forEach(el => io.observe(el));
    addEventListener('scroll', () => {
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 8) revelerTout();
    }, { passive: true });
  } else {
    rvEls.forEach(el => el.classList.add('in'));
  }

  /* ── Parallaxe d'images [data-para] ── */
  const paras = [...document.querySelectorAll('[data-para]')];
  let sy = scrollY;
  addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
  if (paras.length && !reduced) {
    (function paraTick() {
      requestAnimationFrame(paraTick);
      const vh = innerHeight;
      for (const el of paras) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) continue;
        const p = (r.top + r.height / 2 - vh / 2) / vh;   // -0.5 → 0.5 env.
        el.style.transform = `translateY(${(-p * (parseFloat(el.dataset.para) || 26)).toFixed(1)}px) scale(1.12)`;
      }
    })();
  }

  /* ── Curseur point + anneau ── */
  if (WANT_CURSOR && !matchMedia('(hover:none),(pointer:coarse)').matches) {
    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'soul-dot'; ring.className = 'soul-ring';
    document.body.append(dot, ring);
    let mx = -40, my = -40, rx = mx, ry = my;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    (function tick() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(tick);
    })();
    const INTER = 'a,button,[role="button"],input,select,textarea,label';
    document.addEventListener('pointerover', e => { if (e.target.closest(INTER)) ring.classList.add('is-hover'); });
    document.addEventListener('pointerout', e => { if (e.target.closest(INTER)) ring.classList.remove('is-hover'); });
  }

  /* ── Ciel : champ d'étoiles + constellations dessinées au scroll ── */
  const canvas = document.createElement('canvas');
  canvas.id = 'soul-sky';
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  const FIELD_VH = 9;
  const FIELD = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const N = mobile ? Math.round(DENSITY * 0.55) : DENSITY;
  for (let i = 0; i < N; i++) {
    FIELD.push({ x: rnd(), y: rnd() * FIELD_VH, r: 0.5 + rnd() * 1.1, ph: rnd() * 6.28, par: 0.5 + rnd() * 0.3 });
  }
  const SHAPES = [
    { x: 0.15, vh: 1.6, s: 0.05, seq: true, stars: [[0,0],[1,-0.6],[2,0],[3,-0.6],[4,0.05]] },
    { x: 0.85, vh: 2.5, s: 0.07, seq: true, close: true, stars: [[0,0],[1.4,0.25],[0.7,1.2]] },
    { x: 0.12, vh: 3.5, s: 0.05, seq: true, stars: [[0,0],[1,0.1],[2,0],[3,-0.3],[3.1,0.7],[2.1,0.9],[1.1,0.85]] },
    { x: 0.84, vh: 4.4, s: 0.07, edges: [[0,1],[1,2],[3,4]], stars: [[0,0],[0,1],[0,2],[-0.7,1],[0.7,1]] },
    { x: 0.18, vh: 5.4, s: 0.07, edges: [[0,1],[1,2],[3,4]], stars: [[0,0],[1,0.7],[2,0],[1,0.4],[1,1.4]] },
    { x: 0.82, vh: 6.4, s: 0.06, seq: true, stars: [[0,0],[0.9,0.5],[1.9,0.3],[2.6,1.0],[3.6,0.7]] },
  ];

  function dot2(x, y, r, a) {
    if (a <= 0.01 || y < -4 || y > H + 4) return;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.shadowColor = `rgba(${C1},0.8)`;
    ctx.shadowBlur = 6 + r * 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    ctx.restore();
  }
  function seg(ax, ay, bx, by, p, a, alt) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = alt ? `rgba(${C2},0.5)` : `rgba(${C1},0.5)`;
    ctx.lineWidth = 1;
    ctx.shadowColor = `rgba(${C2},0.4)`;
    ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.moveTo(ax, ay);
    ctx.lineTo(ax + (bx - ax) * p, ay + (by - ay) * p);
    ctx.stroke();
    ctx.restore();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = now / 1000;
    const fade = FADE_AFTER_HERO ? clamp((sy - H * 0.55) / (H * 0.55), 0, 1) : 1;
    ctx.clearRect(0, 0, W, H);
    if (fade <= 0.01) return;

    const band = FIELD_VH * H;
    for (const s of FIELD) {
      const y = (((s.y * H - sy * s.par) % band) + band) % band;
      const tw = reduced ? 0.4 : 0.3 + 0.3 * Math.sin(t * 1.6 + s.ph);
      dot2(s.x * W, y, s.r, tw * fade * 0.6);
    }
    for (const sh of SHAPES) {
      const cy = sh.vh * H - sy;
      if (cy < -H || cy > 2 * H) continue;
      const cx = sh.x * W, sc = sh.s * H;
      const pts = sh.stars.map(([ox, oy]) => [cx + ox * sc, cy + oy * sc]);
      const n = pts.length;
      const p = reduced ? 1 : clamp((H - cy) / (H * 0.55), 0, 1);
      const lit = i => clamp((p - i / n) * n, 0, 1);
      const edges = sh.edges || sh.stars.map((_, i) => [i, (i + 1) % n]).slice(0, sh.close ? n : n - 1);
      edges.forEach(([a, b], k) => seg(pts[a][0], pts[a][1], pts[b][0], pts[b][1], lit(Math.max(a, b)), 0.7 * fade, k % 2 === 1));
      pts.forEach((pt, i) => dot2(pt[0], pt[1], 1.4, lit(i) * fade));
    }
  }
  requestAnimationFrame(frame);
})();
