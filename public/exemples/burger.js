/* Gras Double — builder de burger + topbar + toast (démo 4dayvelopment) */
(() => {
  const BASE = 6.5;
  // Ordre d'empilement de bas en haut ; le DOM du stack est construit du haut vers le bas
  const ORDER = ['sauce', 'oignons', 'tomate', 'salade', 'cheddar', 'bacon', 'steak'];

  const stack = document.getElementById('stack');
  const prixEl = document.getElementById('prix');
  const ings = [...document.querySelectorAll('.ing')];
  const toast = document.getElementById('toast');

  function fmt(n) {
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  let displayed = BASE;
  function animatePrice(to) {
    const from = displayed;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / 420, 1);
      const e = 1 - Math.pow(1 - p, 3);
      displayed = from + (to - from) * e;
      prixEl.textContent = fmt(displayed);
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  function actifs() {
    return ings.filter(i => i.classList.contains('on')).map(i => i.dataset.ing);
  }

  function render(nouveau) {
    const on = actifs();
    stack.innerHTML = '';
    // vapeur au-dessus
    const steam = document.createElement('div');
    steam.className = 'steam';
    steam.innerHTML = '<i></i><i></i><i></i>';
    stack.appendChild(steam);
    // pain du haut → ingrédients (haut vers bas) → pain du bas
    const haut = document.createElement('div');
    haut.className = 'p-haut';
    stack.appendChild(haut);
    [...ORDER].reverse().forEach(ing => {
      if (!on.includes(ing)) return;
      const d = document.createElement('div');
      d.className = 'i-' + ing + (ing === nouveau ? ' lay' : '');
      stack.appendChild(d);
    });
    const bas = document.createElement('div');
    bas.className = 'p-bas';
    stack.appendChild(bas);

    const total = BASE + ings
      .filter(i => i.classList.contains('on'))
      .reduce((s, i) => s + parseFloat(i.dataset.prix), 0);
    animatePrice(total);
  }

  ings.forEach(el => {
    const toggle = () => {
      if (el.dataset.ing === 'steak') { say('Le steak, on y touche pas. C’est la maison qui décide.'); return; }
      const wasOn = el.classList.contains('on');
      el.classList.toggle('on');
      el.setAttribute('aria-pressed', String(!wasOn));
      render(wasOn ? null : el.dataset.ing);
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 3400);
  }

  document.getElementById('orderBtn').addEventListener('click', () => {
    say('Ceci est une démonstration — mais ton burger à ' + fmt(displayed).replace(' €', ' €') + ' avait de l’allure.');
  });

  const topbar = document.getElementById('topbar');
  addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', scrollY > 40);
  }, { passive: true });

  render(null);
})();
