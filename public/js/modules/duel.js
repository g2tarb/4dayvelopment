/* ── Le duel : ecran de selection de personnage (section Tarifs) ──
   Deux camps face a face, Site web contre Application. Ce module tient :
   - la main : survol / focus / tap donnent la main a un camp (.is-lead),
     l'autre se comprime ; basculer d'un camp a l'autre declenche le clash ;
   - le rouleau de prix : les chiffres tournent quand un camp prend la main ;
   - les etincelles : un canvas dessine la ligne de front qui crepite, et
     eclate au clash ou quand on coche une idee ;
   - la pre-selection : les idees cochees partent avec le CTA, qui pre-remplit
     le formulaire de contact (service + message).
   Tout est optionnel : sans JS le CSS montre les deux panneaux ouverts. */
import { on } from './utils.js';

const CLASH_MS = 500;      // duree de l'eclair, alignee sur duelFlash/vsClash
const AMBIENT  = 60;       // particules maximum en regime de croisiere

export function initDuel() {
  const root = document.getElementById('duel');
  if (!root) return;

  const arena   = root.querySelector('.duel-arena');
  const divider = root.querySelector('.duel-divider');
  const canvas  = root.querySelector('.duel-fx');
  const sides   = [...root.querySelectorAll('.duel-side')];
  if (!arena || sides.length !== 2) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch   = matchMedia('(hover: none), (pointer: coarse)').matches;

  const WARM = ['#DA5426', '#f2b13b', '#fff3d9'];
  const COOL = ['#884083', '#b06aad', '#f2b13b'];
  const ALL  = [...WARM, '#b06aad'];

  // Remplacees par les vraies implementations si le canvas est actif :
  // sans lui (mouvement reduit, vieux navigateur), le duel vit sans etincelles.
  let burstAtDivider = () => {};
  let burstAt = () => {};

  /* ── La main ─────────────────────────────────────────────── */
  let lead = null, clashTimer = null;

  function setLead(side) {
    if (side === lead) return;
    const previous = lead;
    lead = side;

    sides.forEach(s => s.classList.toggle('is-lead', s === side));
    arena.classList.toggle('has-lead', !!side);

    if (side) rollPrice(side);

    // Passer directement d'un camp a l'autre : le clash
    if (previous && side) {
      clearTimeout(clashTimer);
      arena.classList.add('is-clash');
      clashTimer = setTimeout(() => arena.classList.remove('is-clash'), CLASH_MS);
      burstAtDivider(26);
    }
  }

  if (touch) {
    // Un tap donne la main ; on ne la retire jamais sur tap, seule l'autre
    // moitie peut la prendre (pas de double-tap qui referme par accident).
    sides.forEach(s => on(s, 'click', e => {
      if (e.target.closest('.duel-chip, .duel-cta')) return;
      setLead(s);
    }));
  } else {
    sides.forEach(s => on(s, 'pointerenter', () => setLead(s)));
    on(arena, 'pointerleave', () => setLead(null));
  }
  // Clavier : la main suit le focus
  sides.forEach(s => on(s, 'focusin', () => setLead(s)));
  on(arena, 'focusout', e => {
    if (!arena.contains(e.relatedTarget)) setLead(null);
  });

  /* ── Rouleau de prix ─────────────────────────────────────── */
  // Trois tours de cadran 0-9 : le repos est au milieu, la ou qu'on aille
  // il y a toujours dix chiffres a traverser sans jamais sortir du rouleau.
  sides.forEach(side => {
    const el = side.querySelector('.duel-digits');
    if (!el) return;
    const digits = [...el.textContent.trim()].filter(c => /\d/.test(c));
    if (!digits.length) return;
    el.textContent = '';
    el.dataset.digits = digits.join('');
    digits.forEach(() => {
      const roll = document.createElement('span');
      roll.className = 'roll';
      const strip = document.createElement('span');
      for (let t = 0; t < 3; t++) for (let n = 0; n <= 9; n++) {
        const d = document.createElement('i');
        d.textContent = n;
        strip.appendChild(d);
      }
      roll.appendChild(strip);
      el.appendChild(roll);
    });
    restPrice(side);
  });

  function restPrice(side) {
    eachRoll(side, (strip, d) => {
      strip.style.transition = 'none';
      strip.style.transform = `translateY(${-(10 + d)}em)`;
    });
  }

  function rollPrice(side) {
    if (reduced) return;
    eachRoll(side, (strip, d, i) => {
      strip.style.transition = 'none';
      strip.style.transform = `translateY(${-d}em)`;   // un tour en arriere
      void strip.offsetHeight;
      strip.style.transition = '';
      strip.style.transitionDelay = (i * 70) + 'ms';
      strip.style.transform = `translateY(${-(10 + d)}em)`;
    });
  }

  function eachRoll(side, fn) {
    const el = side.querySelector('.duel-digits');
    if (!el || !el.dataset.digits) return;
    [...el.querySelectorAll('.roll > span')].forEach((strip, i) => {
      fn(strip, +el.dataset.digits[i], i);
    });
  }

  /* ── Filigrane qui derive sous le curseur ────────────────── */
  if (!touch && !reduced) {
    const ghosts = sides.map(s => s.querySelector('.duel-ghost'));
    let mx = 0, my = 0, waited = false;
    on(arena, 'pointermove', e => {
      const r = arena.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - .5;
      my = (e.clientY - r.top) / r.height - .5;
      if (waited) return;
      waited = true;
      requestAnimationFrame(() => {
        waited = false;
        ghosts.forEach((g, i) => {
          if (!g) return;
          const dir = i === 0 ? 1 : -1;   // les deux filigranes s'ecartent
          g.style.transform = `translate3d(${(mx * 22 * dir).toFixed(1)}px, ${(my * 14).toFixed(1)}px, 0)`;
        });
      });
    }, { passive: true });
  }

  /* ── Pre-selection : les idees cochees ───────────────────── */
  sides.forEach(side => {
    const count = side.querySelector('.duel-count');
    side.querySelectorAll('.duel-chip').forEach(chip => {
      on(chip, 'click', () => {
        const onNow = chip.getAttribute('aria-pressed') !== 'true';
        chip.setAttribute('aria-pressed', onNow);
        if (onNow) burstAt(chip, side.dataset.side === 'site' ? WARM : COOL, 9);
        const n = side.querySelectorAll('.duel-chip[aria-pressed="true"]').length;
        if (count) {
          count.hidden = n === 0;
          count.querySelector('b').textContent = n;
        }
      });
    });

    // Le CTA emporte la selection dans le formulaire de contact
    const cta = side.querySelector('.duel-cta');
    on(cta, 'click', () => {
      const picked = [...side.querySelectorAll('.duel-chip[aria-pressed="true"]')]
        .map(c => c.textContent.replace(/^✓\s*/, '').trim());
      const isApp = side.dataset.side === 'app';

      const service = document.getElementById('f-service');
      if (service) {
        // memes valeurs que les deux boutons du formulaire, qui ecoutent
        // le change pour s'allumer
        service.value = isApp ? 'Application' : 'Site web';
        service.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const message = document.getElementById('f-message');
      if (message && !message.value.trim() && picked.length) {
        const nom = side.querySelector('.duel-name');
        message.value = `${nom ? nom.textContent.trim() : ''} — ${picked.join(', ')}.\n`;
      }
    });
  });

  /* ── Etincelles sur la ligne de front ────────────────────── */
  if (!canvas || reduced || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const parts = [];
  let visible = false, raf = null, w = 0, h = 0;

  function resize() {
    const r = root.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(root);
  resize();

  /* Un point au hasard sur la ligne de front. La barre est inclinee : sa
     boite englobante est un rectangle dont la ligne est la diagonale. */
  function pointOnFront() {
    const rr = root.getBoundingClientRect();
    const dr = divider.getBoundingClientRect();
    const t = Math.random();
    if (dr.width > dr.height) {          // mobile : ligne horizontale
      return { x: dr.left - rr.left + dr.width * t,
               y: dr.bottom - rr.top - dr.height * t };
    }
    return { x: dr.right - rr.left - dr.width * t,   // haut-droite -> bas-gauche
             y: dr.top - rr.top + dr.height * t };
  }

  function spawn(x, y, colors, speed) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random());
    parts.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - speed * 0.35,   // legere derive vers le haut
      life: 0,
      ttl: 500 + Math.random() * 700,
      size: 1 + Math.random() * 2.2,
      color: colors[(Math.random() * colors.length) | 0],
    });
  }

  burstAtDivider = n => {
    if (!visible) return;
    const rr = root.getBoundingClientRect();
    const dr = divider.getBoundingClientRect();
    const cx = dr.left - rr.left + dr.width / 2;
    const cy = dr.top - rr.top + dr.height / 2;
    for (let i = 0; i < n; i++) spawn(cx, cy, ALL, 2.6);
  };

  burstAt = (el, colors, n) => {
    if (!visible) return;
    const rr = root.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      spawn(er.left - rr.left + er.width / 2, er.top - rr.top + er.height / 2, colors, 1.8);
    }
  };

  let last = 0;
  function frame(now) {
    raf = null;
    // 30 images par seconde suffisent a des etincelles : on rend une image
    // sur deux et on laisse le reste de la page respirer
    if (now - last < 30) {
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(67, now - last || 16);
    last = now;

    // crepitement ambiant le long de la ligne
    if (parts.length < AMBIENT && Math.random() < 0.4) {
      const p = pointOnFront();
      spawn(p.x, p.y, ALL, 0.9);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.ttl) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      p.vy += 0.004 * dt / 16;            // les cendres retombent a peine
      const fade = 1 - p.life / p.ttl;
      ctx.globalAlpha = fade;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  // Hors ecran ou onglet cache : plus une seule image calculee
  new IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting);
    if (visible) wake(); else { cancelAnimationFrame(raf); raf = null; }
  }, { rootMargin: '80px' }).observe(root);

  on(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else wake();
  });
}
