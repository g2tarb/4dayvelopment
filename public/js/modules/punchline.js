/* ── La punchline qui se retourne ──
   A intervalle regulier, "livre en 4 jours." se change en "ou c'est
   gratuit." : une roulette de lettres se pose de gauche a droite, la
   phrase s'embrase le temps d'etre lue, puis la roulette la ramene a
   l'original. Un eclat de particules marque la bascule.

   Les cometes qui traversaient le hero pour venir la percuter ont ete
   retirees. L'effet ne dependait d'elles que pour son declenchement : une
   minuterie fait le meme travail, sans onze objets a animer en continu.
   Le canvas ne sert donc plus qu'a l'eclat, et la boucle d'animation ne
   tourne que le temps qu'il dure — le reste du temps, rien ne consomme.

   Tout s'arrete hors ecran, onglet cache ou mouvement reduit ; sans JS le
   hero reste exactement comme avant. */
import { on } from './utils.js';

const COULEURS  = ['#DA5426', '#f2b13b', '#b06aad', '#fff3d9'];
const PREMIERE  = 9000;            // le temps de lire la promesse d'origine
const INTERVALLE = [20000, 28000]; // puis a intervalle irregulier
const POSE_MS   = 3000;            // le temps de lire "ou c'est gratuit"

export function initPunchline() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'punchline-fx';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.firstChild);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  function resize() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(hero);
  resize();

  const sparks = [], anneaux = [];
  let visible = false, raf = null, last = 0;
  let minuteur = null, enRoulette = false;

  /* La cible : le centre de la punchline, en coordonnees du hero.
     Relue a chaque bascule : l'i18n peut reecrire le H1 a tout moment. */
  function cible() {
    const em = hero.querySelector('.hero-title .gradient-text');
    if (!em) return null;
    const re = em.getBoundingClientRect();
    const rh = hero.getBoundingClientRect();
    return { em, x: re.left - rh.left + re.width / 2, y: re.top - rh.top + re.height / 2 };
  }

  function eclate(x, y) {
    anneaux.push({ x, y, r: 6, vie: 0, ttl: 520 });
    for (let i = 0; i < 48; i++) {
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
    reveille();
  }

  /* La roulette de lettres : chaque position tourne sur des caracteres au
     hasard puis se pose, de gauche a droite, sur "ou c'est gratuit."
     — exactement 17 caracteres, comme "livré en 4 jours.". Aucun enfant,
     aucune transformation : on ne reecrit que du texte, le degrade
     decoupe du H1 reste hors de danger. */
  const ALPHABET = "abcdefghijklmnopqrstuvwxyzé'4.";

  function deroule(em, cibleTxt, duree) {
    return new Promise(fin => {
      const n = Math.max(em.textContent.length, cibleTxt.length);
      const depart = performance.now();
      (function tour(now) {
        const t = (now - depart) / duree;
        let txt = '';
        for (let i = 0; i < n; i++) {
          const posee = t * n > i + 1;             // la vague se pose de gauche a droite
          const vise = cibleTxt[i] || '';
          if (posee || vise === ' ') txt += vise;
          else txt += ALPHABET[(Math.random() * ALPHABET.length) | 0];
        }
        em.textContent = txt;
        if (t < 1) requestAnimationFrame(tour);
        else { em.textContent = cibleTxt; fin(); }
      })(depart);
    });
  }

  async function roulette() {
    const c = cible();
    if (!c || enRoulette) return;
    enRoulette = true;

    const em = c.em;
    const original = em.textContent;
    const alternative = document.documentElement.lang === 'en' ? "or it's free." : "ou c'est gratuit.";

    // le titre garde sa hauteur meme si un tirage intermediaire replie
    // differemment la ligne
    const h1 = em.closest('h1');
    if (h1) h1.style.minHeight = h1.offsetHeight + 'px';

    eclate(c.x, c.y);
    em.classList.add('is-fused');
    await deroule(em, alternative, 1100);
    await new Promise(ok => setTimeout(ok, POSE_MS));
    await deroule(em, original, 900);
    em.classList.remove('is-fused');
    if (h1) h1.style.minHeight = '';
    enRoulette = false;
  }

  /* Une bascule sans temoin est une bascule perdue : hors ecran ou onglet
     cache, on repousse au lieu de jouer dans le vide. */
  function programme(delai) {
    clearTimeout(minuteur);
    minuteur = setTimeout(async () => {
      if (visible && !document.hidden) await roulette();
      programme(INTERVALLE[0] + Math.random() * (INTERVALLE[1] - INTERVALLE[0]));
    }, delai);
  }

  function frame(now) {
    raf = null;
    const dt = Math.min(50, now - last || 16) / 16;
    last = now;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // eclats de la bascule
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

    // anneaux de choc
    for (let i = anneaux.length - 1; i >= 0; i--) {
      const a = anneaux[i];
      a.vie += dt * 16;
      if (a.vie >= a.ttl) { anneaux.splice(i, 1); continue; }
      const p = a.vie / a.ttl;
      a.r = 6 + p * 150;
      ctx.globalAlpha = (1 - p) * 0.55;
      ctx.lineWidth = 2.5 * (1 - p) + 0.5;
      ctx.strokeStyle = p < 0.4 ? '#fff3d9' : '#f2b13b';
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // plus rien a dessiner : la boucle s'arrete jusqu'au prochain eclat
    if ((sparks.length || anneaux.length) && visible && !document.hidden) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
      ctx.clearRect(0, 0, W, H);
    }
  }

  function reveille() {
    if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); }
  }

  new IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting);
    if (visible) reveille();
    else { cancelAnimationFrame(raf); raf = null; }
  }, { rootMargin: '60px' }).observe(hero);

  on(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else reveille();
  });

  programme(PREMIERE);
}
