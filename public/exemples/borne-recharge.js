/* Voltéo — simulateur de recharge + topbar + timeline + toast (démo 4dayvelopment) */
(() => {
  'use strict';

  /* ── Bases de calcul (affichées sous le simulateur) ── */
  const CONS = 15;          // kWh / 100 km
  const BATT = 52;          // kWh utiles, batterie de référence
  const ELEC = 0.2068;      // € / kWh heures creuses
  const ESSENCE = 7.5 * 1.85; // € / 100 km (7,5 L à 1,85 €/L)

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  const slider = $('km');
  const kmVal = $('kmVal');
  const wbKw = $('wbKw');
  const gauge = $('gauge');
  const led = $('led');
  const rTime = $('rTime'), rTimeSub = $('rTimeSub');
  const rCost = $('rCost'), rCostSub = $('rCostSub');
  const rSave = $('rSave'), rSaveSub = $('rSaveSub');
  const humLine = $('humLine');

  let km = 50;
  let kw = 7.4;

  /* ── Formats français (espace fine insécable, virgule) ── */
  const NBSP = ' ';
  const sep = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const fmtEuro = n => sep(n) + NBSP + '€';
  const fmtEuro2 = n => n.toFixed(2).replace('.', ',') + NBSP + '€';
  const fmtTime = h => {
    let H = Math.floor(h), M = Math.round((h - H) * 60);
    if (M === 60) { H++; M = 0; }
    return H + ' h ' + String(M).padStart(2, '0');
  };

  /* ── Compteurs animés ── */
  const current = new Map();
  function tween(el, to, fmt) {
    const from = current.has(el) ? current.get(el) : to;
    current.set(el, to);
    if (reduced || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    if (el._raf) cancelAnimationFrame(el._raf);
    (function step(now) {
      const p = Math.min((now - t0) / 480, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    })(t0);
  }

  /* ── Textes humains ── */
  function timeWord() {
    if (kw === 22) return 'le temps d’un déjeuner';
    if (kw === 11) return 'une soirée branchée';
    return 'une nuit en heures creuses';
  }
  function phrase() {
    if (kw === 22) return 'Le temps d’un déjeuner, et vous repartez à 100 %.';
    if (kw === 11) return km > 120
      ? 'Même à ' + km + ' km par jour, une soirée branchée suffit.'
      : 'Branchée en rentrant, pleine bien avant minuit.';
    return km > 120
      ? 'Même à ' + km + ' km par jour, vos nuits suffisent. Largement.'
      : 'Vous partez chaque matin le réservoir plein.';
  }

  /* ── Recalcul ── */
  function update() {
    const cost100 = CONS * ELEC;                       // € / 100 km
    const monthly = km * 30.4 * cost100 / 100;         // € / mois
    const annualKm = km * 365;
    const save = (ESSENCE - cost100) * annualKm / 100; // € / an

    tween(rTime, BATT / kw, fmtTime);
    tween(rCost, cost100, fmtEuro2);
    tween(rSave, Math.round(save / 10) * 10, fmtEuro);

    rTimeSub.textContent = timeWord();
    rCostSub.textContent = 'soit ≈ ' + fmtEuro(monthly) + ' d’électricité par mois';
    rSaveSub.textContent = 'sur ' + sep(annualKm) + ' km par an';
    humLine.textContent = phrase();
  }

  /* ── Slider ── */
  function paintSlider() {
    const pct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--pct', pct + '%');
  }
  slider.addEventListener('input', () => {
    km = parseInt(slider.value, 10);
    kmVal.textContent = km;
    paintSlider();
    update();
  });

  /* ── Radio-cartes puissance ── */
  const SPEED = { '7.4': ['6.5s', '2.2s'], '11': ['4.2s', '1.5s'], '22': ['2.6s', '1s'] };
  const cards = [...document.querySelectorAll('.pw')];
  cards.forEach(card => {
    card.querySelector('input').addEventListener('change', e => {
      cards.forEach(c => c.classList.toggle('on', c === card));
      kw = parseFloat(e.target.value);
      wbKw.textContent = e.target.value.replace('.', ',');
      const [chg, blink] = SPEED[e.target.value];
      gauge.querySelector('i').style.animationDuration = chg;
      led.style.animationDuration = blink;
      update();
    });
  });

  /* ── Timeline qui se dessine ── */
  const tl = $('timeline');
  if (tl) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { tl.classList.add('in'); io.disconnect(); } });
    }, { threshold: 0.25 });
    io.observe(tl);
  }

  /* ── Topbar ── */
  const topbar = $('topbar');
  addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', scrollY > 40);
  }, { passive: true });

  /* ── Formulaire → toast démo ── */
  const toast = $('toast');
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 4200);
  }
  $('lead').addEventListener('submit', e => {
    e.preventDefault();
    say('Ceci est une démonstration — aucun message n’a été envoyé.');
  });

  paintSlider();
  update();
})();
