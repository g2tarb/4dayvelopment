/* ── Cometes du hero ──
   Des cometes aux couleurs du site traversent le fond de l'accueil en
   continu. Regulierement, l'une d'elles est attiree par la punchline
   "livre en 4 jours" et vient fusionner avec elle : eclat de particules,
   et le texte s'embrase, gonfle et change de police pendant 2 secondes
   (classe .is-fused, geree ici, habillee dans style.css).

   Tout s'arrete hors ecran, onglet cache ou mouvement reduit ; sans JS le
   hero reste exactement comme avant. */
import { on } from './utils.js';

const COULEURS = ['#DA5426', '#f2b13b', '#b06aad', '#fff3d9'];
const MAX_COMETES = 8;
const SPAWN_MS    = [650, 1400];   // intervalle entre deux naissances
const FUSION_MS   = 7000;          // une fusion environ toutes les 7 s
const FUSED_MS    = 2000;          // le texte reste embrase 2 s
const TRAINE      = 26;            // points de trainee memorises

export function initComets() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'comets-fx';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.firstChild);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  function resize() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(hero);
  resize();

  const cometes = [], sparks = [];
  let visible = false, raf = null, last = 0;
  let prochaineNaissance = 0, prochaineFusion = 2600, fusedTimer = null;

  /* La cible : le centre de la punchline, en coordonnees du hero.
     Relue a chaque fusion : l'i18n peut reecrire le H1 a tout moment. */
  function cible() {
    const em = hero.querySelector('.hero-title .gradient-text');
    if (!em) return null;
    const re = em.getBoundingClientRect();
    const rh = hero.getBoundingClientRect();
    return { em, x: re.left - rh.left + re.width / 2, y: re.top - rh.top + re.height / 2 };
  }

  function nait(seeker) {
    // naissance sur le bord haut ou les flancs, cap en diagonale descendante
    const gauche = Math.random() < 0.5;
    const depuisHaut = Math.random() < 0.65;
    const x = depuisHaut ? Math.random() * W : (gauche ? -30 : W + 30);
    const y = depuisHaut ? -30 : Math.random() * H * 0.5;
    const vx = (gauche ? 1 : -1) * (1.1 + Math.random() * 1.6);
    const vy = 0.7 + Math.random() * 1.1;
    cometes.push({
      x, y, vx, vy,
      taille: 1.4 + Math.random() * 1.8,
      couleur: COULEURS[(Math.random() * COULEURS.length) | 0],
      traine: [],
      seeker: !!seeker,
    });
  }

  function eclate(x, y) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1 + Math.random() * 3.2;
      sparks.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.6,
        vie: 0, ttl: 480 + Math.random() * 620,
        taille: 1 + Math.random() * 2.4,
        couleur: COULEURS[(Math.random() * COULEURS.length) | 0],
      });
    }
  }

  function fusionne() {
    const c = cible();
    if (!c) return;
    eclate(c.x, c.y);
    clearTimeout(fusedTimer);
    c.em.classList.add('is-fused');
    fusedTimer = setTimeout(() => c.em.classList.remove('is-fused'), FUSED_MS);
  }

  function frame(now) {
    raf = null;
    const dt = Math.min(50, now - last || 16) / 16;
    last = now;

    // naissances en continu
    if (now >= prochaineNaissance && cometes.length < MAX_COMETES) {
      nait(false);
      prochaineNaissance = now + SPAWN_MS[0] + Math.random() * (SPAWN_MS[1] - SPAWN_MS[0]);
    }
    // et regulierement, une chercheuse part fusionner avec la punchline
    if (now >= prochaineFusion) {
      nait(true);
      prochaineFusion = now + FUSION_MS + Math.random() * 2000;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    const c = cible();
    for (let i = cometes.length - 1; i >= 0; i--) {
      const k = cometes[i];

      if (k.seeker && c) {
        // pilotage doux vers la punchline, de plus en plus ferme en approche
        const dx = c.x - k.x, dy = c.y - k.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = d < 200 ? 0.10 : 0.035;
        k.vx += (dx / d) * pull * dt * 2.4;
        k.vy += (dy / d) * pull * dt * 2.4;
        const v = Math.hypot(k.vx, k.vy);
        const vmax = 4.2;
        if (v > vmax) { k.vx = k.vx / v * vmax; k.vy = k.vy / v * vmax; }
        if (d < 26) {                      // contact : fusion
          fusionne();
          cometes.splice(i, 1);
          continue;
        }
      }

      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.traine.push(k.x, k.y);
      if (k.traine.length > TRAINE * 2) k.traine.splice(0, 2);

      if (k.x < -80 || k.x > W + 80 || k.y > H + 80) { cometes.splice(i, 1); continue; }

      // trainee : segments qui s'eteignent vers la queue
      const n = k.traine.length / 2;
      for (let s = 1; s < n; s++) {
        ctx.globalAlpha = (s / n) * 0.45;
        ctx.strokeStyle = k.couleur;
        ctx.lineWidth = (s / n) * k.taille;
        ctx.beginPath();
        ctx.moveTo(k.traine[(s - 1) * 2], k.traine[(s - 1) * 2 + 1]);
        ctx.lineTo(k.traine[s * 2], k.traine[s * 2 + 1]);
        ctx.stroke();
      }
      // tete incandescente
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff8ec';
      ctx.beginPath();
      ctx.arc(k.x, k.y, k.taille * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = k.couleur;
      ctx.beginPath();
      ctx.arc(k.x, k.y, k.taille * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // eclats de fusion
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vie += dt * 16;
      if (p.vie >= p.ttl) { sparks.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.02 * dt;
      ctx.globalAlpha = 1 - p.vie / p.ttl;
      ctx.fillStyle = p.couleur;
      ctx.fillRect(p.x, p.y, p.taille, p.taille);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const wake = () => {
    if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
  };

  new IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting);
    if (visible) wake(); else { cancelAnimationFrame(raf); raf = null; }
  }, { rootMargin: '60px' }).observe(hero);

  on(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else wake();
  });
}
