/* ── Téléphone des pages métier : une seule démo, sans diaporama ──
   Même principe que fit() dans demos.js : l'iframe prend le viewport d'un
   iPhone (390 px de large) puis est mise à l'échelle de l'écran dessiné.
   Sans JS, l'iframe remplit simplement l'écran : la démo reste lisible. */
export function initPhoneFrames() {
  const phones = document.querySelectorAll('.lp-phone');
  if (!phones.length) return;

  const VW = 390;
  const fit = phone => {
    const screen = phone.querySelector('.demo-screen');
    const frame  = phone.querySelector('.demo-frame');
    if (!screen || !frame || !screen.clientWidth) return;
    const scale  = screen.clientWidth / VW;
    const status = screen.querySelector('.demo-status');
    const top    = status ? status.offsetHeight : 0;
    frame.style.top       = top + 'px';
    frame.style.width     = VW + 'px';
    frame.style.height    = Math.round((screen.clientHeight - top) / scale) + 'px';
    frame.style.transform = `scale(${scale})`;
  };

  const ro = new ResizeObserver(entries => entries.forEach(e => fit(e.target.closest('.lp-phone'))));
  phones.forEach(phone => {
    const screen = phone.querySelector('.demo-screen');
    if (screen) ro.observe(screen);
    fit(phone);
  });
}
