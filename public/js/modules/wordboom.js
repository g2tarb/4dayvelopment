/* ── Effet "boom" sur le mot cle du titre ──
   Le mot du H1 se charge, explose en particules et laisse paraitre le
   suivant, en boucle : site internet, MVP, SaaS, automatisation. Chaque
   mot prend a son tour une paire de couleurs de la marque.

   Le premier mot est celui servi dans le HTML (c'est lui qui compte pour
   le referencement), les suivants sont lus dans data-boom. Le contenu du
   H1 est reecrit par l'i18n a chaque changement de langue : on remonte
   donc l'effet sur mutation du titre plutot qu'une seule fois. */
import { on } from './utils.js';

const HOLD_MS   = 2600;   // temps de lecture du mot avant la charge
const CHARGE_MS = 280;    // vibration : quelque chose va sauter
const IN_DELAY  = 120;    // le mot suivant arrive dans la fumee
const IN_MS     = 420;

/* Une paire de couleurs par mot, prise a tour de role. Le premier reste
   argente pour se fondre dans la ligne blanche du titre. */
const PALETTE = [
  ['#ffffff', '#c9c9c9'],
  ['#DA5426', '#f2b13b'],
  ['#f2b13b', '#fff3d9'],
  ['#884083', '#DA5426'],
];
const SPARKS = ['#DA5426', '#f2b13b', '#fff3d9', '#884083', '#ffffff'];
const COUNT  = 24;        // particules par explosion

let teardown = null;      // demonte le cycle en cours (changement de langue)

export function initWordBoom() {
  const title = document.querySelector('#hero .hero-title');
  if (!title) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  mount(title);

  // L'i18n remplace le innerHTML du span : le .boom d'avant n'existe plus
  new MutationObserver(() => mount(title))
    .observe(title, { childList: true, subtree: true });
}

function mount(title) {
  const box = title.querySelector('.boom');
  if (!box || box.dataset.ready === '1') return;

  if (teardown) teardown();
  box.dataset.ready = '1';

  // La ponctuation qui suit le mot voyage avec lui : elle reste collee
  // quelle que soit la longueur du mot affiche.
  const served = box.textContent.trim();
  const cut    = served.match(/^(.*?)([,.;:!?…]*)$/);
  const first  = cut[1];
  const tail   = cut[2];

  const words = [first, ...(box.dataset.boom || '').split('|')]
    .map(w => w.trim())
    .filter(Boolean);
  if (words.length < 2) return;

  box.textContent = '';

  /* Le mot pilier reste dans le H1 en permanence, quel que soit l'instant
     ou un robot prend son instantane : le carrousel est pour l'oeil, la
     phrase lue et indexee ne bouge jamais. */
  const sr = el('span', 'sr-only');
  sr.textContent = first;

  const slot = el('span', 'boom-slot');
  const word = el('span', 'boom-word');
  word.textContent = first;
  const fx = el('span', 'boom-fx');
  fx.setAttribute('aria-hidden', 'true');
  slot.setAttribute('aria-hidden', 'true');
  slot.append(word, fx);

  const tailEl = el('span', 'boom-tail');
  tailEl.textContent = tail;

  box.append(sr, slot, tailEl);

  let idx = 0, timer = null, alive = true, visible = true, onScreen = true;
  const sizes = new Map();

  paintColors(box, 0);
  remeasure();
  schedule(HOLD_MS);

  /* Tous les mots sont mesures d'un coup, largeur libre : c'est le seul
     moment ou la colonne est a sa taille naturelle.

     Deux calculs en decoulent :
     - un mot plus long que la colonne ("automatisation") est ramene a
       l'echelle, il vaut mieux un mot un peu plus petit qu'un titre qui
       deborde ;
     - le bloc entier est fige a la largeur du mot le plus large, sinon le
       titre passerait de deux a trois lignes a chaque explosion et tout ce
       qui suit sauterait. Seul le mot glisse a l'interieur. */
  function remeasure() {
    box.style.width = '';
    slot.style.width = '';

    const probe = el('span', 'boom-probe');
    box.appendChild(probe);

    probe.textContent = tail;
    const tailPx = probe.getBoundingClientRect().width;
    const avail  = title.clientWidth - tailPx - 4;

    let widest = 0;
    words.forEach(w => {
      probe.textContent = w;
      const natural = probe.getBoundingClientRect().width;
      const scale = avail > 0 && natural > avail ? avail / natural : 1;
      const px = natural * scale;
      sizes.set(w, { px, scale });
      if (px > widest) widest = px;
    });
    probe.remove();

    box.style.width = (widest + tailPx).toFixed(1) + 'px';
    slotTo(words[idx]);
    styleWord(words[idx]);
  }

  /* La largeur du mot bouge des l'explosion : la ponctuation glisse
     pendant que le mot se disperse. */
  function slotTo(w) {
    slot.style.width = sizes.get(w).px.toFixed(1) + 'px';
  }

  /* Le corps du mot, lui, ne change qu'a l'apparition du suivant : sinon
     le mot sortant changerait de taille en pleine explosion. */
  function styleWord(w) {
    const s = sizes.get(w).scale;
    word.style.fontSize = s === 1 ? '' : (s * 100).toFixed(1) + '%';
  }

  function schedule(ms) {
    clearTimeout(timer);
    if (!alive || !visible || !onScreen) return;
    timer = setTimeout(next, ms);
  }

  function next() {
    if (!alive) return;
    const to = (idx + 1) % words.length;

    word.classList.add('is-charge');

    setTimeout(() => {
      if (!alive) return;
      word.classList.remove('is-charge');
      burst(fx, slot);
      word.classList.add('is-out');
      slotTo(words[to]);

      setTimeout(() => {
        if (!alive) return;
        idx = to;
        word.textContent = words[to];
        styleWord(words[to]);
        paintColors(box, to);
        word.classList.remove('is-out');
        word.classList.add('is-in');
        setTimeout(() => word.classList.remove('is-in'), IN_MS);
        schedule(HOLD_MS);
      }, IN_DELAY);
    }, CHARGE_MS);
  }

  // Onglet en arriere-plan ou hero hors ecran : rien a animer pour personne
  const onVis = () => {
    visible = !document.hidden;
    visible && onScreen ? schedule(HOLD_MS) : clearTimeout(timer);
  };
  on(document, 'visibilitychange', onVis);

  const io = new IntersectionObserver(entries => {
    onScreen = entries.some(e => e.isIntersecting);
    onScreen && visible ? schedule(HOLD_MS) : clearTimeout(timer);
  }, { rootMargin: '80px' });
  io.observe(box);

  // La taille de police du titre suit le viewport : les largeurs memorisees
  // ne valent plus rien apres un redimensionnement.
  let rz = null;
  const onResize = () => {
    clearTimeout(rz);
    rz = setTimeout(remeasure, 150);
  };
  on(window, 'resize', onResize, { passive: true });

  teardown = () => {
    alive = false;
    clearTimeout(timer);
    clearTimeout(rz);
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
    teardown = null;
  };
}

/* Les deux couleurs du mot courant, lues par le degrade dans le CSS. */
function paintColors(box, i) {
  const [c1, c2] = PALETTE[i % PALETTE.length];
  box.style.setProperty('--boom-c1', c1);
  box.style.setProperty('--boom-c2', c2);
}

/* Le mot part en morceaux : les eclats naissent sur toute sa largeur,
   filent en etoile et derivent vers le haut, comme des cendres. */
function burst(fx, slot) {
  const { width, height } = slot.getBoundingClientRect();
  if (!width) return;

  const shock = el('u', 'boom-shock');
  fx.appendChild(shock);
  anim(shock, [
    { transform: 'scale(.35)', opacity: .55 },
    { transform: 'scale(1.5)', opacity: 0 },
  ], 460, 'cubic-bezier(.16,.7,.3,1)');

  for (let i = 0; i < COUNT; i++) {
    const a    = (Math.PI * 2 * i) / COUNT + Math.random() * 0.7;
    const dist = 22 + Math.random() * 68;
    const size = 2 + Math.random() * 3.4;
    const dx   = Math.cos(a) * dist;
    // biais vers le haut : des particules legeres ne retombent pas
    const dy   = Math.sin(a) * dist * 0.55 - 10 - Math.random() * 26;

    const p = el('i', 'boom-spark');
    const c = SPARKS[i % SPARKS.length];
    p.style.width  = size.toFixed(1) + 'px';
    p.style.height = size.toFixed(1) + 'px';
    p.style.left   = (Math.random() * width).toFixed(1) + 'px';
    p.style.top    = (height * (0.22 + Math.random() * 0.56)).toFixed(1) + 'px';
    p.style.background = c;
    p.style.color = c;          // repris par le halo, en currentColor
    fx.appendChild(p);

    const a2 = anim(p, [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(.15)`, opacity: 0 },
    ], 620 + Math.random() * 540, 'cubic-bezier(.12,.72,.28,1)');
    if (a2) a2.onfinish = () => p.remove();
    else setTimeout(() => p.remove(), 1200);
  }

  setTimeout(() => shock.remove(), 520);
}

function anim(node, frames, duration, easing) {
  if (!node.animate) return null;
  return node.animate(frames, { duration, easing, fill: 'forwards' });
}

function el(tag, cls) {
  const n = document.createElement(tag);
  n.className = cls;
  return n;
}
