/* ── RGPD Consent Manager ─────────────────────────────────── */

const STORAGE_KEY  = 'rgpd_consent';
const ANALYTICS_ID = typeof GTAG_ID !== 'undefined' ? GTAG_ID : null; // fourni via window.GTAG_ID si besoin

function getConsent() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function saveConsent(analytics, functional) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    analytics,
    functional,
    date: new Date().toISOString(),
  }));
}

function injectAnalytics() {
  if (!ANALYTICS_ID) return;
  if (document.getElementById('gtag-script')) return;
  const s = document.createElement('script');
  s.id  = 'gtag-script';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ANALYTICS_ID, { anonymize_ip: true });
}

function applyConsent(consent) {
  if (consent?.analytics) injectAnalytics();
}

function hideBanner() {
  const banner = document.getElementById('rgpd-banner');
  if (banner) {
    banner.classList.add('rgpd-hiding');
    setTimeout(() => banner.remove(), 400);
  }
}

function buildBanner() {
  const el = document.createElement('div');
  el.id = 'rgpd-banner';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'false');
  el.setAttribute('aria-label', 'Gestion des cookies');
  el.innerHTML = `
    <div class="rgpd-inner">
      <div class="rgpd-text">
        <p class="rgpd-title">🍪 Nous utilisons des cookies</p>
        <p class="rgpd-desc">Des cookies analytiques nous aident à améliorer notre site. Aucun cookie sans votre accord explicite.</p>
      </div>
      <div class="rgpd-actions">
        <button class="rgpd-btn rgpd-refuse"  id="rgpd-refuse">Tout refuser</button>
        <button class="rgpd-btn rgpd-custom"  id="rgpd-custom">Personnaliser</button>
        <button class="rgpd-btn rgpd-accept"  id="rgpd-accept">Tout accepter</button>
      </div>
    </div>
    <div class="rgpd-panel" id="rgpd-panel" hidden>
      <p class="rgpd-panel-title">Paramètres des cookies</p>
      <label class="rgpd-toggle">
        <input type="checkbox" id="toggle-functional" checked disabled>
        <span class="rgpd-slider"></span>
        <span class="rgpd-toggle-label">Fonctionnels <span class="rgpd-required">(requis)</span></span>
      </label>
      <label class="rgpd-toggle">
        <input type="checkbox" id="toggle-analytics">
        <span class="rgpd-slider"></span>
        <span class="rgpd-toggle-label">Analytiques <span class="rgpd-hint">(mesure d'audience anonyme)</span></span>
      </label>
      <button class="rgpd-btn rgpd-accept" id="rgpd-save">Enregistrer mes préférences</button>
    </div>
  `;
  document.body.appendChild(el);

  // Accept all
  el.querySelector('#rgpd-accept').addEventListener('click', () => {
    saveConsent(true, true);
    applyConsent({ analytics: true });
    hideBanner();
  });

  // Refuse all
  el.querySelector('#rgpd-refuse').addEventListener('click', () => {
    saveConsent(false, true);
    hideBanner();
  });

  // Toggle panel
  el.querySelector('#rgpd-custom').addEventListener('click', () => {
    const panel = el.querySelector('#rgpd-panel');
    const isHidden = panel.hasAttribute('hidden');
    if (isHidden) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  });

  // Save custom
  el.querySelector('#rgpd-save').addEventListener('click', () => {
    const analytics = el.querySelector('#toggle-analytics').checked;
    saveConsent(analytics, true);
    applyConsent({ analytics });
    hideBanner();
  });

  // Slide in
  requestAnimationFrame(() => el.classList.add('rgpd-visible'));
}

export function initConsent() {
  const consent = getConsent();

  if (consent !== null) {
    // Consentement déjà enregistré → applique directement
    applyConsent(consent);
    return;
  }

  // Premier passage → affiche la bannière après 1s, ou après l'écran d'entrée
  // s'il est joué (sinon elle surgit au moment même où l'intro s'efface).
  const intro = document.documentElement.classList.contains('has-intro');
  setTimeout(buildBanner, intro ? 2600 : 1000);
}
