/* L'Atelier Nacre — atelier des teintes + topbar + toasts (démo 4dayvelopment) */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Toast ── */
  const toast = document.getElementById('toast');
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 3800);
  }

  /* ── Topbar ── */
  const topbar = document.getElementById('topbar');
  addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', scrollY > 40);
  }, { passive: true });

  /* ── Atelier des teintes ─────────────────────────────
     Chaque ongle : un path de base (.nb), un clipPath (.nc)
     et un rect de vernis (.nail-varnish) qui remonte du bas
     de l'ongle vers la pointe à chaque nouvelle teinte. */
  const SHAPES = {
    amande:    'M0 0 C8 4 13 15 13 28 C13 39 8 45 0 45 C-8 45 -13 39 -13 28 C-13 15 -8 4 0 0 Z',
    carre:     'M-10.5 1.5 C-4 0 4 0 10.5 1.5 C12 2 13 4 13 7 L13 30 C13 40 8 45 0 45 C-8 45 -13 40 -13 30 L-13 7 C-13 4 -12 2 -10.5 1.5 Z',
    ballerine: 'M-7 0 L7 0 C10.5 9 13 19 13 29 C13 40 8 45 0 45 C-8 45 -13 40 -13 29 C-13 19 -10.5 9 -7 0 Z'
  };

  const morphEls = [...document.querySelectorAll('.nb, .nc')];
  const varnish = [...document.querySelectorAll('.nail-varnish')];
  const nameEl = document.getElementById('tintName');
  const swatches = [...document.querySelectorAll('.pastille')];
  const shapeBtns = [...document.querySelectorAll('.forme')];
  let tintName = nameEl ? nameEl.textContent : 'Nude voilé';

  /* Remplissage animé du bas (cuticule, y=45) vers le haut (pointe),
     léger décalage d'un ongle à l'autre, comme un pinceau qui passe. */
  function paint(fill) {
    varnish.forEach((r, i) => {
      if (reduced) { r.setAttribute('fill', fill); return; }
      r.style.transition = 'none';
      r.style.transform = 'translateY(50px)';
      r.setAttribute('fill', fill);
      void r.getBoundingClientRect(); // force le reflow avant la transition
      requestAnimationFrame(() => requestAnimationFrame(() => {
        r.style.transition = 'transform .4s cubic-bezier(.22,1,.36,1) ' + (i * 55) + 'ms';
        r.style.transform = 'translateY(0)';
      }));
    });
  }

  swatches.forEach(btn => {
    btn.addEventListener('click', () => {
      swatches.forEach(b => {
        const on = b === btn;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      tintName = btn.dataset.nom;
      nameEl.textContent = tintName;
      paint(btn.dataset.fill);
    });
  });

  /* Forme des ongles : morph du path (transition CSS sur `d`
     quand le navigateur la supporte, bascule nette sinon). */
  shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeBtns.forEach(b => {
        const on = b === btn;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      const d = SHAPES[btn.dataset.forme];
      morphEls.forEach(el => {
        el.setAttribute('d', d);
        el.style.d = "path('" + d + "')";
      });
    });
  });

  const tintCta = document.getElementById('tintCta');
  if (tintCta) {
    tintCta.addEventListener('click', () => {
      say('Ceci est une démonstration. Au studio, « ' + tintName + ' » vous attendrait déjà sur l’étagère.');
    });
  }

  /* ── Mini-formulaire de réservation ── */
  const form = document.getElementById('rdvForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const prenom = form.prenom.value.trim();
      say(prenom
        ? 'Merci ' + prenom + '. Ceci est une démonstration : sur le vrai site, Léna aurait déjà votre message.'
        : 'Ceci est une démonstration : sur le vrai site, Léna aurait déjà votre message.');
      form.reset();
    });
  }
})();
