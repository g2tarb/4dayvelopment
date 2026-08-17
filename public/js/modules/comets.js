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
/* Les trois couleurs qui chargent la punchline : il faut un impact de
   chacune pour declencher la grande fusion. */
const CHARGES = ['#DA5426', '#f2b13b', '#b06aad'];
const MAX_COMETES = 11;
const SPAWN_MS    = [450, 980];    // intervalle entre deux naissances
const SEEKER_MS   = [1800, 4800];  // timing aleatoire entre deux chercheuses
const FUSED_MS    = 3400;          // le temps de lire "ou c'est gratuit"
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
  const touches = new Set();   // couleurs ayant deja percute depuis la derniere fusion

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
    // une chercheuse porte une des couleurs qui manquent encore a la charge
    let couleur = COULEURS[(Math.random() * COULEURS.length) | 0];
    if (seeker) {
      const restantes = CHARGES.filter(c => !touches.has(c));
      couleur = restantes[(Math.random() * restantes.length) | 0] || CHARGES[0];
    }
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

  /* Un impact charge la punchline de sa couleur : petit choc a chaque
     fois, et quand les trois couleurs ont frappe, la grande fusion. */
  function impact(couleur) {
    const c = cible();
    if (!c) return;
    touches.add(couleur);

    if (touches.size >= CHARGES.length) {
      touches.clear();
      eclate(c.x, c.y);
      clearTimeout(fusedTimer);
      // La mise en page change pendant la metamorphose : sans verrou, le
      // titre perdrait une ligne et le centrage du hero deplacerait tout,
      // premiere ligne comprise. On fige la hauteur du H1.
      const h1 = c.em.closest('h1');
      if (h1) {
        h1.style.minHeight = h1.offsetHeight + 'px';
        setTimeout(() => { h1.style.minHeight = ''; }, FUSED_MS + 900);
      }
      c.em.classList.remove('is-hit');
      metamorphose(c.em);
      return;
    }

    // choc intermediaire : mini gerbe et pulsation breve
    anneaux.push({ x: c.x, y: c.y, r: 4, vie: 0, ttl: 340 });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.8 + Math.random() * 2.2;
      sparks.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4,
        vie: 0, ttl: 380 + Math.random() * 420, taille: 1 + Math.random() * 2, couleur });
    }
    if (!c.em.classList.contains('is-fused')) {
      clearTimeout(hitTimer);
      c.em.classList.add('is-hit');
      hitTimer = setTimeout(() => c.em.classList.remove('is-hit'), 380);
    }
  }

  /* La metamorphose, version sobre : le texte d'origine ne change ni de
     police ni de lettres. Il retrecit en douceur pour faire de la place,
     s'illumine, et "ou c'est gratuit" s'ecrit a sa suite lettre par
     lettre, dans les couleurs de la marque, avant de s'effacer. */
  const PALIERS = [[242,177,59],[255,243,217],[218,84,38],[176,106,173]];
  function nuance(t) {
    const p = Math.min(0.9999, Math.max(0, t)) * (PALIERS.length - 1);
    const i = p | 0, f = p - i;
    const a = PALIERS[i], b = PALIERS[i + 1];
    return `rgb(${(a[0]+(b[0]-a[0])*f)|0},${(a[1]+(b[1]-a[1])*f)|0},${(a[2]+(b[2]-a[2])*f)|0})`;
  }

  function metamorphose(em) {
    const suffixe = document.documentElement.lang === 'en' ? " or it's free." : " ou c'est gratuit.";
    // le point final du texte d'origine s'ecarte pour laisser la phrase filer
    const noeudFin = [...em.childNodes].reverse().find(n => n.nodeType === 3 && /\.\s*$/.test(n.textContent));
    const finOriginale = noeudFin ? noeudFin.textContent : null;
    if (noeudFin) noeudFin.textContent = noeudFin.textContent.replace(/\.\s*$/, '');

    const bloc = document.createElement('span');
    bloc.className = 'sfx-bloc';
    const lettres = [];
    [...suffixe].forEach((ch, i) => {
      const sp = document.createElement('span');
      sp.className = 'sfx';
      sp.textContent = ch === ' ' ? '\u00A0' : ch;
      sp.style.color = nuance(i / (suffixe.length - 1));
      lettres.push(sp);
      bloc.appendChild(sp);
    });
    em.appendChild(bloc);
    em.classList.add('is-fused');

    // la phrase s'ecrit lettre a lettre
    const PAS = 55;
    lettres.forEach((sp, i) => sp.__t = setTimeout(() => sp.classList.add('on'), 350 + i * PAS));

    // effacement en vague inverse puis restauration exacte
    fusedTimer = setTimeout(() => {
      lettres.forEach((sp, i) => {
        clearTimeout(sp.__t);
        sp.__t = setTimeout(() => sp.classList.remove('on'), (lettres.length - i) * 18);
      });
      setTimeout(() => {
        em.classList.remove('is-fused');
        bloc.remove();
        if (noeudFin && finOriginale !== null) noeudFin.textContent = finOriginale;
      }, lettres.length * 18 + 380);
    }, FUSED_MS);
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
