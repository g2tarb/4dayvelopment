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
const IMPACTS_REQUIS = 15;         // d'explosions avant la roulette
const MAX_COMETES = 11;
const SPAWN_MS    = [450, 980];    // intervalle entre deux naissances
const SEEKER_MS   = [650, 1500];   // les chercheuses s'enchainent
const FUSED_MS    = 3000;          // le temps de lire "ou c'est gratuit"
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

  const cometes = [], sparks = [], anneaux = [];
  let visible = false, raf = null, last = 0;
  let prochaineNaissance = 0, prochaineChercheuse = 2200;
  let fusedTimer = null, hitTimer = null;
  let impacts = 0;             // explosions encaissees depuis la derniere roulette
  let enRoulette = false;

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
    const couleur = COULEURS[(Math.random() * COULEURS.length) | 0];
    cometes.push({
      x, y, vx, vy,
      taille: seeker ? 2.2 + Math.random() : 1.4 + Math.random() * 1.8,
      couleur,
      traine: [],
      seeker: !!seeker,
    });
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
  }

  /* Chaque comete avalee explose sur la punchline : petite gerbe et
     pulsation. A la quinzieme, la roulette de lettres se declenche. */
  function impact(couleur) {
    const c = cible();
    if (!c || enRoulette) return;
    impacts++;

    anneaux.push({ x: c.x, y: c.y, r: 4, vie: 0, ttl: 340 });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.8 + Math.random() * 2.2;
      sparks.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4,
        vie: 0, ttl: 380 + Math.random() * 420, taille: 1 + Math.random() * 2, couleur });
    }

    if (impacts >= IMPACTS_REQUIS) {
      impacts = 0;
      eclate(c.x, c.y);
      roulette(c.em);
      return;
    }

    clearTimeout(hitTimer);
    c.em.classList.add('is-hit');
    hitTimer = setTimeout(() => c.em.classList.remove('is-hit'), 380);
  }

  /* La roulette de lettres : chaque position tourne sur des caracteres au
     hasard puis se pose, de gauche a droite, sur "ou c'est gratuit."
     — exactement 17 caracteres, comme "livré en 4 jours.". Le texte tient
     la pose le temps d'etre lu, puis la roulette le ramene a l'original.
     Aucun enfant, aucune transformation : on ne reecrit que du texte, le
     degrade decoupe du H1 reste hors de danger. */
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

  async function roulette(em) {
    if (enRoulette) return;
    enRoulette = true;
    const original = em.textContent;
    const alternative = document.documentElement.lang === 'en' ? "or it's free." : "ou c'est gratuit.";

    // le titre garde sa hauteur meme si un tirage intermediaire replie
    // differemment la ligne
    const h1 = em.closest('h1');
    if (h1) h1.style.minHeight = h1.offsetHeight + 'px';

    em.classList.add('is-fused');
    await deroule(em, alternative, 1100);
    await new Promise(ok => { fusedTimer = setTimeout(ok, FUSED_MS); });
    await deroule(em, original, 900);
    em.classList.remove('is-fused');
    if (h1) h1.style.minHeight = '';
    enRoulette = false;
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
    // et a intervalle aleatoire, une chercheuse part frapper la punchline
    if (now >= prochaineChercheuse) {
      nait(true);
      prochaineChercheuse = now + SEEKER_MS[0] + Math.random() * (SEEKER_MS[1] - SEEKER_MS[0]);
    }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    const c = cible();
    for (let i = cometes.length - 1; i >= 0; i--) {
      const k = cometes[i];

      if (k.seeker && c) {
        const dx = c.x - k.x, dy = c.y - k.y;
        const d = Math.hypot(dx, dy) || 1;

        if (d < 110) {
          // zone d'absorption : plus de balistique, la comete est aspiree
          // en ligne droite, retrecit et s'eteint DANS la phrase, sans
          // jamais pouvoir la traverser ni ressortir.
          k.absorbee = true;
          k.x += dx * 0.16 * dt;
          k.y += dy * 0.16 * dt;
          k.taille *= Math.pow(0.94, dt);
          if (k.traine.length > 6) k.traine.splice(0, 4);   // la trainee se resorbe
          if (d < 12 || k.taille < 0.5) {   // avalee : impact
            impact(k.couleur);
            cometes.splice(i, 1);
            continue;
          }
        } else {
          // pilotage doux vers la punchline
          const pull = d < 200 ? 0.10 : 0.035;
          k.vx += (dx / d) * pull * dt * 2.4;
          k.vy += (dy / d) * pull * dt * 2.4;
          const v = Math.hypot(k.vx, k.vy);
          const vmax = 4.2;
          if (v > vmax) { k.vx = k.vx / v * vmax; k.vy = k.vy / v * vmax; }
        }
      }

      if (k.absorbee) {
        // la position est deja pilotee par l'aspiration
        k.traine.push(k.x, k.y);
        if (k.traine.length > TRAINE * 2) k.traine.splice(0, 2);
      } else {

      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.traine.push(k.x, k.y);
      if (k.traine.length > TRAINE * 2) k.traine.splice(0, 2);
      }

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

    // anneaux de choc de la fusion
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
