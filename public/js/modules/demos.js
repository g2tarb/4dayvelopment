/* ── Diaporama d'exemples métier (téléphone du hero) ──
   Les sites d'exemple défilent tout seuls dans le mockup. Deux iframes :
   celle qui est masquée charge le site suivant pendant que l'autre est à
   l'écran, la bascule se fait donc en fondu et sans page blanche.
   L'iframe n'est chargée qu'une fois la section visible (perf). */
import { on } from './utils.js';

const DEMOS = {
  'burger':         { label: 'Restauration',      url: '/exemples/burger' },
  'ongles':         { label: 'Beauté',            url: '/exemples/ongles' },
  'coach-sportif':  { label: 'Coach sportif',     url: '/exemples/coach-sportif' },
  'barbier':        { label: 'Barbier',           url: '/exemples/barbier' },
  'plombier':       { label: 'Plombier',          url: '/exemples/plombier' },
  'borne-recharge': { label: 'Borne de recharge', url: '/exemples/borne-recharge' },
};

const ORDER    = Object.keys(DEMOS);
const SLIDE_MS = 5500;   // doit rester aligne sur --demo-slide dans style.css
const RESUME_MS = 9000;  // reprise apres une interaction tactile

/* Interstitiel entre deux exemples : l'ecran d'entree du site rejoue a
   l'echelle du telephone (meme logo, meme phrase qui tourne). Il couvre
   l'ecran le temps de la bascule, on ne voit donc jamais le site changer
   a nu. Doit rester aligne sur les transitions de .demo-splash dans
   style.css. */
const SPLASH_IN   = 300;
const SPLASH_HOLD = 900;   // le temps de reconnaitre l'ecran de chargement

export function initDemoViewer() {
  const section = document.getElementById('exemples');
  if (!section) return;

  const device   = section.querySelector('.demo-device');
  const screenEl = section.querySelector('.demo-screen');
  const splash   = section.querySelector('.demo-splash');
  const frames   = [...section.querySelectorAll('.demo-frame')];
  const segs     = [...section.querySelectorAll('.demo-seg')];
  const nowTxt   = section.querySelector('.demo-now-txt');
  const openLink = section.querySelector('.demo-open');
  const ctaLink  = section.querySelector('.demo-cta');
  if (!device || frames.length < 2) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch   = matchMedia('(hover: none), (pointer: coarse)').matches;

  let idx = 0;          // index du slide affiche
  let front = 0;        // index de l'iframe visible dans frames[]
  let started = false;
  let timer = null, resumeTimer = null, splashTimer = null;
  let held = false;     // l'utilisateur explore : on ne bouge plus

  const urlAt   = i => DEMOS[ORDER[i]].url;
  const labelAt = i => {
    // lu depuis le bouton : il porte data-i18n, donc il est deja traduit
    const name = segs[i] && segs[i].querySelector('.demo-seg-name');
    return name ? name.textContent.trim() : DEMOS[ORDER[i]].label;
  };

  function paint(i) {
    const key = ORDER[i];
    if (nowTxt)   nowTxt.textContent = labelAt(i);
    if (openLink) openLink.href = DEMOS[key].url;
    if (ctaLink)  ctaLink.href  = `/devis?metier=${key}`;
    segs.forEach((s, n) => {
      s.classList.toggle('is-current', n === i);
      s.classList.toggle('is-done', n < i);
    });
  }

  /* Relance l'animation de remplissage du segment courant. */
  function restartFill() {
    const cur = segs[idx];
    if (!cur) return;
    const bar = cur.querySelector('i');
    if (!bar) return;
    bar.style.animation = 'none';
    void bar.offsetWidth;              // force le reflow, sinon l'animation ne repart pas
    bar.style.animation = '';
  }

  function preloadNext() {
    const back = frames[1 - front];
    const next = (idx + 1) % ORDER.length;
    const url  = urlAt(next);
    if (!back.src.endsWith(url)) back.src = url;
  }

  function swap(i) {
    const back = frames[1 - front];
    const wanted = urlAt(i);

    // Choix manuel : l'iframe masquee ne contient pas forcement le bon site
    if (!back.src.endsWith(wanted)) back.src = wanted;

    frames[front].classList.remove('is-active');
    frames[front].setAttribute('aria-hidden', 'true');
    frames[front].tabIndex = -1;

    back.classList.add('is-active');
    back.removeAttribute('aria-hidden');
    back.tabIndex = 0;

    front = 1 - front;
    idx = i;
    paint(i);
    fit();
    preloadNext();
  }

  function show(i, { user = false } = {}) {
    if (i === idx && started) return;
    clearTimeout(splashTimer);

    if (reduced || !splash) {           // pas d'interstitiel : bascule directe
      swap(i);
      restartFill();
      if (user) hold(); else schedule();
      return;
    }

    // Le logo couvre l'ecran, on echange dessous, puis il s'efface
    splash.classList.add('is-on');
    splashTimer = setTimeout(() => {
      // Sous l'interstitiel la bascule est instantanee : en fondu croise, on
      // apercevrait les deux sites l'un par-dessus l'autre au moment ou le
      // logo s'efface.
      screenEl.classList.add('is-swapping');
      swap(i);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        screenEl.classList.remove('is-swapping');
        splash.classList.remove('is-on');
      }));
      restartFill();
      if (user) hold(); else schedule();
    }, SPLASH_IN + SPLASH_HOLD);
  }

  function schedule() {
    clearTimeout(timer);
    if (reduced || held) return;
    timer = setTimeout(() => show((idx + 1) % ORDER.length), SLIDE_MS);
  }

  function pause() {
    held = true;
    clearTimeout(timer);
    section.classList.add('is-held');
  }

  function resume() {
    if (reduced) return;
    held = false;
    section.classList.remove('is-held');
    restartFill();
    schedule();
  }

  /* Tactile : l'utilisateur a pris la main, on rend le controle apres un delai. */
  function hold() {
    pause();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(resume, RESUME_MS);
  }

  /* Le site est rendu dans un viewport de 390 px puis replie au cadre, sur
     mobile comme sur ordinateur. Sans ca, le telephone du hero ne fait que
     250 px de large : le site s'y affiche pour 250 px, donc tout parait
     enorme et les barres de boutons mangent la moitie de l'ecran. Avec
     l'ecran au format 390 x 844, l'iframe retrouve exactement le viewport
     d'un iPhone. */
  function fit() {
    const vw = 390;
    const screen = device.querySelector('.demo-screen');
    if (!screen.clientWidth) return;
    const scale = screen.clientWidth / vw;

    // Le site commence sous la barre d'etat, comme sur un telephone
    const status = screen.querySelector('.demo-status');
    const top = status ? status.offsetHeight : 0;

    frames.forEach(frame => {
      frame.style.top    = top + 'px';
      frame.style.width  = vw + 'px';
      frame.style.height = Math.round((screen.clientHeight - top) / scale) + 'px';
      frame.style.transform = `scale(${scale})`;
    });
  }

  segs.forEach((s, i) => on(s, 'click', () => show(i, { user: true })));

  // Le telephone reste explorable : on suspend tant que la souris est dessus
  if (!touch) {
    on(device, 'mouseenter', pause);
    on(device, 'mouseleave', resume);
  } else {
    on(device, 'pointerdown', hold);
  }
  on(section, 'focusin', pause);
  on(section, 'focusout', e => {
    if (!section.contains(e.relatedTarget)) resume();
  });

  // Onglet en arriere-plan : inutile de charger des pages pour personne
  on(document, 'visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); }
    else if (!held && started) { restartFill(); schedule(); }
  });

  on(window, 'resize', fit, { passive: true });

  // Le libelle visible est derive des boutons : au changement de langue,
  // i18n reecrit les boutons, on recopie.
  const names = section.querySelector('.demo-track');
  if (names && nowTxt) {
    new MutationObserver(() => { nowTxt.textContent = labelAt(idx); })
      .observe(names, { childList: true, subtree: true, characterData: true });
  }

  // Chargement paresseux : rien ne part tant que le hero est hors ecran
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    started = true;
    frames[front].src = urlAt(idx);
    preloadNext();
    fit();
    restartFill();
    schedule();
    io.disconnect();
  }, { rootMargin: '300px' });
  io.observe(section);

  paint(idx);
  fit();
}
