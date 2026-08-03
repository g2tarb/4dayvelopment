/* FORGE · Paris 11 — parcours « Choisis ton combat », compteurs, topbar, toast
   (démo 4dayvelopment — le décor ambiant est géré par soul.js) */
(() => {
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Topbar ── */
  const topbar = $('#topbar');
  addEventListener('scroll', () => {
    topbar.classList.toggle('scrolled', scrollY > 40);
  }, { passive: true });

  /* ── Compteurs du hero (180+ · 8 · 4h58) ── */
  const fmtTime = m => Math.floor(m / 60) + 'h' + String(Math.round(m) % 60).padStart(2, '0');
  const runCount = el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const n = +el.dataset.count;
    const suf = el.dataset.suf || '';
    const time = el.dataset.fmt === 'time';
    const out = v => time ? fmtTime(v) : Math.round(v) + suf;
    if (reduced) { el.textContent = out(n); return; }
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / 1400, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = out(n * e);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  };
  const counters = [...document.querySelectorAll('[data-count]')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        runCount(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(c => io.observe(c));
  } else {
    counters.forEach(runCount);
  }

  /* ── Parcours « Choisis ton combat » ── */
  const PROGS = {
    perdre: {
      name: 'REFONTE',
      desc: 'Perdre ce qui pèse, garder ce qui pousse. Déficit maîtrisé, renfo lourd pour protéger le muscle, cardio qui sert à quelque chose. On ne t’affame pas : on te restructure.'
    },
    prendre: {
      name: 'CHARPENTE',
      desc: 'Construire du muscle qui reste. Surcharge progressive, technique irréprochable, assiette calibrée. Pas de volume pour le volume : des fondations.'
    },
    durer: {
      name: 'MOTEUR',
      desc: 'Tenir la distance sans te broyer. Seuils, VMA, renfo utile, récupération planifiée. Ton cardio devient une arme de long terme, pas une punition.'
    }
  };
  const FREQ = {
    s2: '2 séances encadrées par semaine',
    s34: '3 à 4 séances par semaine, dont 1 à 2 encadrées',
    s5: '4 à 5 séances structurées, plus un rappel technique'
  };
  const Q3TXT = { s2: 'Deux séances', s34: 'Trois séances', s5: 'Cinq séances ou plus' };
  const Q2TXT = { jamais: 'un vrai départ', moins1an: 'des bases à affûter', annees: 'du lourd, zéro blabla' };
  const reco = (q2, q3) =>
    q2 === 'jamais' ? 'indiv' : (q2 === 'annees' && q3 === 's5' ? 'online' : 'pack');

  const screens = [...document.querySelectorAll('.qz__scr')];
  const fill = $('#qzFill');
  const stepLbl = $('#qzStep');
  const restart = $('#qzRestart');
  const answers = {};
  let idx = 0;
  let cleanupTimer;

  function show(i) {
    const prev = screens[idx];
    idx = i;
    screens.forEach((s, k) => {
      if (k === i) {
        s.removeAttribute('inert');
        s.classList.remove('out');
        s.classList.add('on');
      } else {
        s.setAttribute('inert', '');
        s.classList.remove('on');
        if (s === prev && !reduced) s.classList.add('out');
      }
    });
    clearTimeout(cleanupTimer);
    cleanupTimer = setTimeout(() => screens.forEach(s => s.classList.remove('out')), 550);

    const p = [0, 34, 67, 100][i];
    fill.style.width = p + '%';
    fill.setAttribute('aria-valuenow', String(p));
    stepLbl.textContent = i < 3 ? 'Question ' + (i + 1) + ' / 3' : 'Verdict';
    restart.hidden = i !== 3;
  }

  function buildResult() {
    const prog = PROGS[answers.q1] || PROGS.prendre;
    $('#resName').textContent = prog.name;
    $('#resDesc').textContent = prog.desc;
    $('#resFreq').textContent = FREQ[answers.q3] || FREQ.s34;
    $('#resLine').textContent =
      (Q3TXT[answers.q3] || 'Tes séances') + ', ' +
      (Q2TXT[answers.q2] || 'ton niveau') +
      ' : c’est ' + prog.name + ' qu’il te faut.';
    const best = reco(answers.q2, answers.q3);
    document.querySelectorAll('.price').forEach(p => {
      p.classList.toggle('reco', p.dataset.offer === best);
    });
  }

  document.querySelectorAll('.qz__opt').forEach(btn => {
    btn.addEventListener('click', () => {
      answers[btn.closest('.qz__scr').dataset.q] = btn.dataset.v;
      if (idx < 2) { show(idx + 1); return; }
      buildResult();
      show(3);
    });
  });

  restart.addEventListener('click', () => {
    delete answers.q1; delete answers.q2; delete answers.q3;
    show(0);
  });

  /* ── Formulaire démo → toast ── */
  const toast = $('#toast');
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('on'), 4200);
  }

  const f = $('#f');
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    if (!f.prenom.value.trim() || !f.tel.value.trim() || !f.obj.value) {
      say('Remplis les 3 champs pour tester le formulaire (démo).');
      return;
    }
    const prenom = f.prenom.value.trim();
    f.reset();
    say('Ceci est une démonstration — mais ' + prenom + ', ta séance d’essai aurait été bien réelle.');
  });
})();
