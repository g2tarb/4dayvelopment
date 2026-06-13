/* ════════════════════════════════════════════════════════════
   lead.js — logique de la page /devis (lead.html)
   Externalisé depuis les <script> inline pour respecter la CSP
   (script-src 'self'). Aucune variable n'est injectée par le
   serveur : tout passe par le DOM, localStorage et sessionStorage.
   ════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   1) FORMULAIRE MULTI-ÉTAPES
   ══════════════════════════════════════════════════════════════ */
(function () {
  /* ══ STATE ══ */
  let currentSection = 0;
  const TOTAL = 4;

  const budgetMap = [
    '< 500 €', '500 – 1 000 €', '1 000 – 2 000 €',
    '2 000 – 3 000 €', '3 000 – 5 000 €', '5 000 – 7 500 €',
    '7 500 – 10 000 €', '10 000 – 15 000 €', '15 000 – 25 000 €',
    '25 000 – 50 000 €', '50 000 € +'
  ];

  /* ══ BUDGET SLIDER ══ */
  const budgetRange   = document.getElementById('budget-range');
  const budgetDisplay = document.getElementById('budget-display');
  const budgetHidden  = document.getElementById('f-budget');

  function updateBudget() {
    const v = parseInt(budgetRange.value);
    const label = budgetMap[v];
    budgetDisplay.textContent = label;
    budgetHidden.value = label;
    const pct = (v / 10) * 100;
    budgetRange.style.setProperty('--pct', pct + '%');
  }
  budgetRange.addEventListener('input', updateBudget);
  updateBudget();

  /* ══ RADIO / CHECKBOX CARDS ══ */
  document.querySelectorAll('.choice-card').forEach(card => {
    card.addEventListener('click', () => {
      const input = card.querySelector('input');
      if (input.type === 'radio') {
        const name = input.name;
        document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
          r.closest('.choice-card').classList.remove('selected');
        });
        input.checked = true;
        card.classList.add('selected');
      } else {
        input.checked = !input.checked;
        card.classList.toggle('selected', input.checked);
      }
    });
  });

  /* ══ TAG BUTTONS (single-select) ══ */
  function initTagGroup(groupId, hiddenId) {
    const group  = document.getElementById(groupId);
    const hidden = document.getElementById(hiddenId);
    if (!group) return;
    group.querySelectorAll('.tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (hidden) hidden.value = btn.dataset.val;
      });
    });
  }
  initTagGroup('delai-tags', 'f-delai');
  initTagGroup('style-tags', 'f-style');

  /* ══ NAVIGATION ══ */
  function updateIndicator() {
    document.querySelectorAll('.si-step').forEach((step, i) => {
      step.classList.toggle('active', i === currentSection);
      step.classList.toggle('done', i < currentSection);
    });
    for (let i = 0; i < 3; i++) {
      const line = document.getElementById(`line-${i}-${i+1}`);
      if (line) line.classList.toggle('done', i < currentSection);
    }
  }

  function showSection(n) {
    document.querySelectorAll('.form-section').forEach((s, i) => {
      s.classList.toggle('active', i === n);
    });
    currentSection = n;
    updateIndicator();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ══ VALIDATION PAR SECTION ══ */
  function validateSection(n) {
    let ok = true;

    // Section 0 — Identité
    if (n === 0) {
      const prenom = document.getElementById('f-prenom');
      const email  = document.getElementById('f-email');
      const errP   = document.getElementById('err-prenom');
      const errE   = document.getElementById('err-email');

      if (!prenom.value.trim() || prenom.value.trim().length < 2) {
        prenom.classList.add('error');
        errP.classList.add('show');
        ok = false;
      } else {
        prenom.classList.remove('error');
        errP.classList.remove('show');
      }

      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!email.value.trim() || !emailRx.test(email.value.trim())) {
        email.classList.add('error');
        errE.classList.add('show');
        ok = false;
      } else {
        email.classList.remove('error');
        errE.classList.remove('show');
      }
    }

    // Section 1 — Projet
    if (n === 1) {
      const typeChecked = document.querySelector('input[name="type-site"]:checked');
      const errType     = document.getElementById('err-type');
      if (!typeChecked) {
        errType.classList.add('show');
        ok = false;
      } else {
        errType.classList.remove('show');
      }

      const delai    = document.getElementById('f-delai');
      const errDelai = document.getElementById('err-delai');
      if (!delai.value) {
        errDelai.classList.add('show');
        ok = false;
      } else {
        errDelai.classList.remove('show');
      }
    }

    // Section 2 — Besoins
    if (n === 2) {
      const desc    = document.getElementById('f-description');
      const errDesc = document.getElementById('err-description');
      if (!desc.value.trim() || desc.value.trim().length < 20) {
        desc.classList.add('error');
        errDesc.classList.add('show');
        ok = false;
      } else {
        desc.classList.remove('error');
        errDesc.classList.remove('show');
      }
    }

    return ok;
  }

  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth; // reflow
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
  }

  function nextSection() {
    if (!validateSection(currentSection)) {
      const sec = document.querySelector(`.form-section[data-section="${currentSection}"]`);
      shake(sec);
      // focus premier champ en erreur
      const firstErr = sec.querySelector('.error, .field-error.show');
      if (firstErr) {
        const input = firstErr.tagName === 'INPUT' || firstErr.tagName === 'TEXTAREA'
          ? firstErr
          : sec.querySelector('input.error, textarea.error, select.error');
        if (input) { input.scrollIntoView({ behavior:'smooth', block:'center' }); input.focus(); }
      }
      return;
    }
    if (currentSection === 2) buildRecap();
    showSection(currentSection + 1);
  }

  function prevSection() {
    if (currentSection > 0) showSection(currentSection - 1);
  }

  /* ══ RECAP ══ */
  function getPages() {
    const checked = [...document.querySelectorAll('input[name="pages"]:checked')];
    return checked.map(c => c.value).join(', ') || '—';
  }
  function getFonctionnalites() {
    const checked = [...document.querySelectorAll('input[name="fonctionnalites"]:checked')];
    const en = localStorage.getItem('lang') === 'en';
    return checked.map(c => c.value).join(', ') || (en ? 'None selected' : 'Aucune sélectionnée');
  }

  function buildRecap() {
    const data = collectData();
    const grid = document.getElementById('recap-grid');
    const en = localStorage.getItem('lang') === 'en';
    const rows = [
      { l: en ? 'First name / Last name' : 'Prénom / Nom', v: [data.prenom, data.nom].filter(Boolean).join(' ') },
      { l: 'Email',        v: data.email },
      { l: en ? 'Phone'    : 'Téléphone',   v: data.tel || '—' },
      { l: en ? 'Company'  : 'Société',     v: data.societe || '—' },
      { l: en ? 'Sector'   : 'Secteur',     v: data.secteur || '—' },
      { l: en ? 'Current site' : 'Site actuel', v: data.siteActuel || '—' },
      { l: en ? 'Site type'    : 'Type de site', v: data.typeSite || '—' },
      { l: 'Budget',      v: data.budget },
      { l: en ? 'Timeline' : 'Délai',       v: data.delai || '—' },
      { l: en ? 'Goal'     : 'Objectif',    v: data.objectif || '—' },
      { l: 'Pages',       v: data.pages, full: true },
      { l: en ? 'Features' : 'Fonctionnalités', v: data.fonctionnalites, full: true },
      { l: en ? 'Visual style' : 'Style visuel', v: data.style || '—' },
      { l: 'Description', v: data.description, full: true },
    ];

    grid.innerHTML = rows.map(r => `
      <div class="recap-item${r.full ? ' full' : ''}">
        <div class="recap-label">${r.l}</div>
        <div class="recap-value${r.v === '—' || !r.v ? ' empty' : ''}">${escHtml(r.v || '—')}</div>
      </div>
    `).join('');
  }

  /* ══ DATA COLLECTION ══ */
  function collectData() {
    return {
      prenom:          document.getElementById('f-prenom').value.trim(),
      nom:             document.getElementById('f-nom').value.trim(),
      email:           document.getElementById('f-email').value.trim(),
      tel:             document.getElementById('f-tel').value.trim(),
      societe:         document.getElementById('f-societe').value.trim(),
      secteur:         document.getElementById('f-secteur').value,
      siteActuel:      document.getElementById('f-site-actuel').value.trim(),
      typeSite:        (document.querySelector('input[name="type-site"]:checked') || {}).value || '',
      budget:          document.getElementById('f-budget').value,
      delai:           document.getElementById('f-delai').value,
      objectif:        document.getElementById('f-objectif').value,
      pages:           getPages(),
      fonctionnalites: getFonctionnalites(),
      style:           document.getElementById('f-style').value,
      description:     document.getElementById('f-description').value.trim(),
    };
  }

  /* ══ SUBMIT ══ */
  async function submitForm() {
    const btn = document.getElementById('btn-submit');
    const fb  = document.getElementById('submit-error');
    const d   = collectData();

    btn.disabled = true;
    btn.classList.add('loading');
    fb.classList.remove('error');
    fb.style.display = 'none';

    const message = `
Prénom / Nom : ${d.prenom} ${d.nom}
Téléphone    : ${d.tel || 'Non renseigné'}
Société      : ${d.societe || 'Non renseignée'}
Secteur      : ${d.secteur || 'Non renseigné'}
Site actuel  : ${d.siteActuel || 'Aucun'}

TYPE DE SITE : ${d.typeSite}
BUDGET       : ${d.budget}
DÉLAI        : ${d.delai}
OBJECTIF     : ${d.objectif || 'Non renseigné'}

PAGES        : ${d.pages}
FONCTIONNALITÉS : ${d.fonctionnalites}
STYLE VISUEL : ${d.style || 'Non renseigné'}

DESCRIPTION  :
${d.description}
    `.trim();

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom:    d.prenom,
          email:     d.email,
          telephone: d.tel,
          secteur:   `${d.typeSite || 'Non renseigné'} — ${d.secteur || ''} — budget: ${d.budget}`,
          message,
        }),

      });

      const json = await res.json();
      if (json.success) {
        document.querySelector('.lead-main').style.display = 'none';
        document.querySelector('.steps-indicator').style.display = 'none';
        document.getElementById('success-screen').classList.add('show');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(json.message || 'Erreur inconnue');
      }
    } catch (err) {
      fb.textContent = err.message || 'Erreur lors de l\'envoi. Réessayez ou contactez-nous directement.';
      fb.style.display = 'block';
      fb.classList.add('error');
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  /* ══ UTILS ══ */
  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  /* ══ BUTTON LISTENERS ══ */
  document.querySelectorAll('.btn-next-sec').forEach(btn => {
    btn.addEventListener('click', nextSection);
  });
  document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', prevSection);
  });
  document.getElementById('btn-submit').addEventListener('click', submitForm);

  /* ══ KEYBOARD ══ */
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      if (currentSection < 3) nextSection();
      else if (currentSection === 3) submitForm();
    }
  });
})();

/* ══════════════════════════════════════════════════════════════
   2) i18n FR / EN
   ══════════════════════════════════════════════════════════════ */
(function () {
  function set(sel, html, idx) {
    const els = document.querySelectorAll(sel);
    const el  = els[idx === undefined ? 0 : idx];
    if (el) el.innerHTML = html;
  }
  function setPH(sel, text) {
    const el = document.querySelector(sel);
    if (el) el.placeholder = text;
  }

  const T = {
    fr: [
      /* header */
      ['#secure-text',   'Données sécurisées · Sans engagement'],
      /* hero */
      ['.lead-badge',    '🚀 Devis personnalisé sous 24h'],
      ['.lead-hero h1',  'Démarrons votre<br><span class="g">projet ensemble</span>'],
      ['.lead-hero p',   'Remplissez ce formulaire en 3 minutes et recevez une proposition sur-mesure.'],
      /* steps */
      ['.si-step span',  'Identité', 0],
      ['.si-step span',  'Projet', 1],
      ['.si-step span',  'Besoins', 2],
      ['.si-step span',  'Récapitulatif', 3],
      /* section titles */
      ['.section-title-wrap h2', 'Qui êtes-vous ?', 0],
      ['.section-title-wrap p',  'Quelques informations pour personnaliser votre devis.', 0],
      ['.section-title-wrap h2', 'Votre projet', 1],
      ['.section-title-wrap p',  'Dites-nous ce que vous recherchez.', 1],
      ['.section-title-wrap h2', 'Vos besoins détaillés', 2],
      ['.section-title-wrap p',  'Plus vous êtes précis, meilleur sera notre devis.', 2],
      ['.section-title-wrap h2', 'Votre récapitulatif', 3],
      ['.section-title-wrap p',  'Vérifiez vos informations avant d\'envoyer.', 3],
      /* section 0 — labels */
      ['[data-section="0"] .form-group label', 'Prénom <span class="req">*</span>', 0],
      ['[data-section="0"] .form-group label', 'Nom', 1],
      ['[data-section="0"] .form-group label', 'Email professionnel <span class="req">*</span>', 2],
      ['[data-section="0"] .form-group label', 'Téléphone', 3],
      ['[data-section="0"] .form-group label', 'Nom de la société / marque', 4],
      ['[data-section="0"] .form-group label', 'Secteur d\'activité', 5],
      ['[data-section="0"] .form-group label', 'Site web actuel (si vous en avez un)', 6],
      /* section 0 — errors */
      ['#err-prenom', 'Prénom requis (min. 2 caractères).'],
      ['#err-email',  'Adresse email invalide.'],
      /* section 0 — select secteur */
      ['#f-secteur', '<option value="">— Choisir —</option><option>Commerce / E-commerce</option><option>Restauration / Food</option><option>Santé / Bien-être</option><option>Immobilier</option><option>Services B2B</option><option>Artisanat / Bâtiment</option><option>Consulting / Formation</option><option>Création / Art</option><option>Tech / Startup</option><option>Association / ONG</option><option>Autre</option>'],
      /* section 1 — labels */
      ['[data-section="1"] .form-group > label', 'Type de site souhaité <span class="req">*</span>', 0],
      ['[data-section="1"] .form-group > label', 'Budget estimé', 1],
      ['[data-section="1"] .form-group > label', 'Délai souhaité <span class="req">*</span>', 2],
      ['[data-section="1"] .form-group > label', 'Objectif principal de ce projet', 3],
      /* section 1 — type cards */
      ['#type-grid .card-label', 'Site vitrine', 0],
      ['#type-grid .card-sub',   'Présenter votre activité', 0],
      ['#type-grid .card-label', 'E-commerce', 1],
      ['#type-grid .card-sub',   'Vendre en ligne', 1],
      ['#type-grid .card-label', 'App web', 2],
      ['#type-grid .card-sub',   'Outil sur-mesure', 2],
      ['#type-grid .card-label', 'Refonte', 3],
      ['#type-grid .card-sub',   'Moderniser l\'existant', 3],
      ['#type-grid .card-label', 'Blog / Média', 4],
      ['#type-grid .card-sub',   'Contenu & publication', 4],
      ['#type-grid .card-label', 'Landing page', 5],
      ['#type-grid .card-sub',   'Page de conversion', 5],
      /* section 1 — délai tags */
      ['#delai-tags .tag-btn', '⚡ Urgent', 0],
      ['#delai-tags .tag-btn', '📅 Ce mois-ci', 1],
      ['#delai-tags .tag-btn', '🗓️ 1 à 3 mois', 2],
      ['#delai-tags .tag-btn', '🔭 + de 3 mois', 3],
      ['#delai-tags .tag-btn', '🤷 Pas encore défini', 4],
      /* section 1 — errors */
      ['#err-type',  'Veuillez choisir un type de site.'],
      ['#err-delai', 'Veuillez sélectionner un délai.'],
      /* section 1 — objectif select */
      ['#f-objectif', '<option value="">— Choisir —</option><option>Attirer plus de clients</option><option>Vendre mes produits en ligne</option><option>Améliorer mon image de marque</option><option>Automatiser des processus internes</option><option>Me démarquer de la concurrence</option><option>Générer des leads qualifiés</option><option>Fidéliser ma clientèle existante</option>'],
      /* section 2 — labels */
      ['[data-section="2"] .form-group > label', 'Pages souhaitées (cochez tout ce qui s\'applique)', 0],
      ['[data-section="2"] .form-group > label', 'Fonctionnalités souhaitées', 1],
      ['[data-section="2"] .form-group > label', 'Style visuel préféré', 2],
      ['[data-section="2"] .form-group > label', 'Décrivez votre projet en quelques mots <span class="req">*</span>', 3],
      /* section 2 — pages check items */
      ['[data-section="2"] .check-label', 'Accueil', 0],
      ['[data-section="2"] .check-sub',   'Page principale de votre site', 0],
      ['[data-section="2"] .check-label', 'À propos / Notre histoire', 1],
      ['[data-section="2"] .check-sub',   'Votre équipe et vos valeurs', 1],
      ['[data-section="2"] .check-label', 'Services / Offres', 2],
      ['[data-section="2"] .check-sub',   'Ce que vous proposez', 2],
      ['[data-section="2"] .check-label', 'Portfolio / Réalisations', 3],
      ['[data-section="2"] .check-sub',   'Vos projets et cas clients', 3],
      ['[data-section="2"] .check-label', 'Blog / Actualités', 4],
      ['[data-section="2"] .check-sub',   'Articles et publications', 4],
      ['[data-section="2"] .check-label', 'Boutique / Catalogue', 5],
      ['[data-section="2"] .check-sub',   'Produits et e-commerce', 5],
      ['[data-section="2"] .check-label', 'Contact / Formulaire', 6],
      ['[data-section="2"] .check-sub',   'Prise de contact', 6],
      ['[data-section="2"] .check-label', 'FAQ', 7],
      ['[data-section="2"] .check-sub',   'Questions fréquentes', 7],
      /* section 2 — fonctionnalités card labels */
      ['[data-section="2"] .card-grid .card-label', '💬 Formulaire de contact', 0],
      ['[data-section="2"] .card-grid .card-label', '📅 Prise de rendez-vous', 1],
      ['[data-section="2"] .card-grid .card-label', '💳 Paiement en ligne', 2],
      ['[data-section="2"] .card-grid .card-label', '🔐 Espace membre', 3],
      ['[data-section="2"] .card-grid .card-label', '🌍 Multilingue', 4],
      ['[data-section="2"] .card-grid .card-label', '📈 SEO avancé', 5],
      ['[data-section="2"] .card-grid .card-label', '💬 Chat / Support', 6],
      ['[data-section="2"] .card-grid .card-label', '📊 Dashboard admin', 7],
      /* section 2 — style tags */
      ['#style-tags .tag-btn', '✨ Moderne & épuré', 0],
      ['#style-tags .tag-btn', '💎 Luxe & premium', 1],
      ['#style-tags .tag-btn', '🎨 Coloré & dynamique', 2],
      ['#style-tags .tag-btn', '🏛️ Corporatif', 3],
      ['#style-tags .tag-btn', '◯ Minimaliste', 4],
      ['#style-tags .tag-btn', '⚡ Bold & audacieux', 5],
      /* section 2 — hint & error */
      ['.section-hint', '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Plus vous donnez de détails, plus notre devis sera précis.'],
      ['#err-description', 'Veuillez décrire votre projet (min. 20 caractères).'],
      /* nav buttons */
      ['.btn-prev', '← Retour', 0],
      ['.btn-prev', '← Retour', 1],
      ['.btn-prev', '← Retour', 2],
      ['.btn-prev', '← Modifier', 3],
      ['.btn-next-sec', 'Continuer <span>→</span>', 0],
      ['.btn-next-sec', 'Continuer <span>→</span>', 1],
      ['.btn-next-sec', 'Voir le récapitulatif <span>→</span>', 2],
      /* section 3 */
      ['.btn-label',       '✉️ Envoyer ma demande'],
      ['.recap-header h3', 'Résumé de votre demande'],
      ['#lead-legal',      'En soumettant ce formulaire, vous acceptez que vos données soient utilisées pour vous recontacter. Aucun spam.'],
      /* success */
      ['#success-screen h2', 'Demande envoyée <span class="g">avec succès !</span>'],
      ['#success-screen p',  'Notre équipe analyse votre projet et vous contactera <strong style="color:var(--c-text)">sous 24h</strong> avec une proposition personnalisée.'],
      ['.success-actions .btn-outline', '← Retour au site', 0],
      ['.success-actions .btn-outline', '💬 Discuter sur WhatsApp', 1],
    ],
    en: [
      /* header */
      ['#secure-text',   'Secured data · No commitment'],
      /* hero */
      ['.lead-badge',    '🚀 Personalised quote within 24h'],
      ['.lead-hero h1',  'Let\'s build your<br><span class="g">project together</span>'],
      ['.lead-hero p',   'Fill in this form in 3 minutes and receive a tailor-made proposal.'],
      /* steps */
      ['.si-step span',  'Identity', 0],
      ['.si-step span',  'Project', 1],
      ['.si-step span',  'Needs', 2],
      ['.si-step span',  'Summary', 3],
      /* section titles */
      ['.section-title-wrap h2', 'Who are you?', 0],
      ['.section-title-wrap p',  'A few details to personalise your quote.', 0],
      ['.section-title-wrap h2', 'Your project', 1],
      ['.section-title-wrap p',  'Tell us what you\'re looking for.', 1],
      ['.section-title-wrap h2', 'Your detailed needs', 2],
      ['.section-title-wrap p',  'The more precise you are, the better our quote.', 2],
      ['.section-title-wrap h2', 'Your summary', 3],
      ['.section-title-wrap p',  'Review your information before sending.', 3],
      /* section 0 — labels */
      ['[data-section="0"] .form-group label', 'First name <span class="req">*</span>', 0],
      ['[data-section="0"] .form-group label', 'Last name', 1],
      ['[data-section="0"] .form-group label', 'Professional email <span class="req">*</span>', 2],
      ['[data-section="0"] .form-group label', 'Phone', 3],
      ['[data-section="0"] .form-group label', 'Company / brand name', 4],
      ['[data-section="0"] .form-group label', 'Industry', 5],
      ['[data-section="0"] .form-group label', 'Current website (if any)', 6],
      /* section 0 — errors */
      ['#err-prenom', 'First name required (min. 2 characters).'],
      ['#err-email',  'Invalid email address.'],
      /* section 0 — select secteur */
      ['#f-secteur', '<option value="">— Select —</option><option>Retail / E-commerce</option><option>Restaurant / Food</option><option>Health / Wellness</option><option>Real estate</option><option>B2B Services</option><option>Trades / Construction</option><option>Consulting / Training</option><option>Arts / Creative</option><option>Tech / Startup</option><option>Non-profit / NGO</option><option>Other</option>'],
      /* section 1 — labels */
      ['[data-section="1"] .form-group > label', 'Desired site type <span class="req">*</span>', 0],
      ['[data-section="1"] .form-group > label', 'Estimated budget', 1],
      ['[data-section="1"] .form-group > label', 'Preferred timeline <span class="req">*</span>', 2],
      ['[data-section="1"] .form-group > label', 'Main goal of this project', 3],
      /* section 1 — type cards */
      ['#type-grid .card-label', 'Showcase site', 0],
      ['#type-grid .card-sub',   'Present your business', 0],
      ['#type-grid .card-label', 'E-commerce', 1],
      ['#type-grid .card-sub',   'Sell online', 1],
      ['#type-grid .card-label', 'Web app', 2],
      ['#type-grid .card-sub',   'Custom tool', 2],
      ['#type-grid .card-label', 'Redesign', 3],
      ['#type-grid .card-sub',   'Modernise existing', 3],
      ['#type-grid .card-label', 'Blog / Media', 4],
      ['#type-grid .card-sub',   'Content & publishing', 4],
      ['#type-grid .card-label', 'Landing page', 5],
      ['#type-grid .card-sub',   'Conversion page', 5],
      /* section 1 — délai tags */
      ['#delai-tags .tag-btn', '⚡ Urgent', 0],
      ['#delai-tags .tag-btn', '📅 This month', 1],
      ['#delai-tags .tag-btn', '🗓️ 1 to 3 months', 2],
      ['#delai-tags .tag-btn', '🔭 3+ months', 3],
      ['#delai-tags .tag-btn', '🤷 Not yet decided', 4],
      /* section 1 — errors */
      ['#err-type',  'Please choose a site type.'],
      ['#err-delai', 'Please select a timeline.'],
      /* section 1 — objectif select */
      ['#f-objectif', '<option value="">— Select —</option><option>Attract more clients</option><option>Sell my products online</option><option>Improve my brand image</option><option>Automate internal processes</option><option>Stand out from the competition</option><option>Generate qualified leads</option><option>Retain existing customers</option>'],
      /* section 2 — labels */
      ['[data-section="2"] .form-group > label', 'Desired pages (check all that apply)', 0],
      ['[data-section="2"] .form-group > label', 'Desired features', 1],
      ['[data-section="2"] .form-group > label', 'Preferred visual style', 2],
      ['[data-section="2"] .form-group > label', 'Describe your project in a few words <span class="req">*</span>', 3],
      /* section 2 — pages check items */
      ['[data-section="2"] .check-label', 'Home', 0],
      ['[data-section="2"] .check-sub',   'Main page of your site', 0],
      ['[data-section="2"] .check-label', 'About / Our story', 1],
      ['[data-section="2"] .check-sub',   'Your team and values', 1],
      ['[data-section="2"] .check-label', 'Services / Offers', 2],
      ['[data-section="2"] .check-sub',   'What you provide', 2],
      ['[data-section="2"] .check-label', 'Portfolio / Work', 3],
      ['[data-section="2"] .check-sub',   'Your projects and case studies', 3],
      ['[data-section="2"] .check-label', 'Blog / News', 4],
      ['[data-section="2"] .check-sub',   'Articles and posts', 4],
      ['[data-section="2"] .check-label', 'Shop / Catalogue', 5],
      ['[data-section="2"] .check-sub',   'Products and e-commerce', 5],
      ['[data-section="2"] .check-label', 'Contact / Form', 6],
      ['[data-section="2"] .check-sub',   'Get in touch', 6],
      ['[data-section="2"] .check-label', 'FAQ', 7],
      ['[data-section="2"] .check-sub',   'Frequently asked questions', 7],
      /* section 2 — fonctionnalités card labels */
      ['[data-section="2"] .card-grid .card-label', '💬 Contact form', 0],
      ['[data-section="2"] .card-grid .card-label', '📅 Online booking', 1],
      ['[data-section="2"] .card-grid .card-label', '💳 Online payment', 2],
      ['[data-section="2"] .card-grid .card-label', '🔐 Member area', 3],
      ['[data-section="2"] .card-grid .card-label', '🌍 Multilingual', 4],
      ['[data-section="2"] .card-grid .card-label', '📈 Advanced SEO', 5],
      ['[data-section="2"] .card-grid .card-label', '💬 Chat / Support', 6],
      ['[data-section="2"] .card-grid .card-label', '📊 Admin dashboard', 7],
      /* section 2 — style tags */
      ['#style-tags .tag-btn', '✨ Modern & clean', 0],
      ['#style-tags .tag-btn', '💎 Luxury & premium', 1],
      ['#style-tags .tag-btn', '🎨 Colourful & dynamic', 2],
      ['#style-tags .tag-btn', '🏛️ Corporate', 3],
      ['#style-tags .tag-btn', '◯ Minimalist', 4],
      ['#style-tags .tag-btn', '⚡ Bold & daring', 5],
      /* section 2 — hint & error */
      ['.section-hint', '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>The more details you provide, the more accurate our quote.'],
      ['#err-description', 'Please describe your project (min. 20 characters).'],
      /* nav buttons */
      ['.btn-prev', '← Back', 0],
      ['.btn-prev', '← Back', 1],
      ['.btn-prev', '← Back', 2],
      ['.btn-prev', '← Edit', 3],
      ['.btn-next-sec', 'Continue <span>→</span>', 0],
      ['.btn-next-sec', 'Continue <span>→</span>', 1],
      ['.btn-next-sec', 'View summary <span>→</span>', 2],
      /* section 3 */
      ['.btn-label',       '✉️ Send my request'],
      ['.recap-header h3', 'Summary of your request'],
      ['#lead-legal',      'By submitting this form, you agree that your data will be used to contact you back. No spam.'],
      /* success */
      ['#success-screen h2', 'Request sent <span class="g">successfully!</span>'],
      ['#success-screen p',  'Our team will analyse your project and contact you <strong style="color:var(--c-text)">within 24h</strong> with a personalised proposal.'],
      ['.success-actions .btn-outline', '← Back to website', 0],
      ['.success-actions .btn-outline', '💬 Chat on WhatsApp', 1],
    ],
  };

  const PH = {
    fr: [
      ['#f-prenom',      'Marie'],
      ['#f-nom',         'Dupont'],
      ['#f-email',       'marie@entreprise.fr'],
      ['#f-tel',         '+33 6 12 34 56 78'],
      ['#f-societe',     'Dupont Consulting'],
      ['#f-site-actuel', 'https://monsite.fr'],
      ['#f-description', 'Ex: Je suis coach sportif, je veux un site pour présenter mes programmes, prendre des RDV en ligne et vendre mes guides PDF...'],
    ],
    en: [
      ['#f-prenom',      'Sophie'],
      ['#f-nom',         'Smith'],
      ['#f-email',       'sophie@company.com'],
      ['#f-tel',         '+44 7700 900 000'],
      ['#f-societe',     'Smith Consulting'],
      ['#f-site-actuel', 'https://mysite.com'],
      ['#f-description', 'E.g.: I\'m a fitness coach, I want a site to present my programmes, take online bookings and sell my PDF guides...'],
    ],
  };

  function applyLang(lang) {
    (T[lang] || []).forEach(([sel, html, idx]) => set(sel, html, idx));
    (PH[lang] || []).forEach(([sel, text]) => setPH(sel, text));
    document.documentElement.lang = lang;
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR';
    localStorage.setItem('lang', lang);
  }

  function toggleLang() {
    applyLang(localStorage.getItem('lang') === 'en' ? 'fr' : 'en');
  }
  // Conservé pour compatibilité éventuelle, mais le bouton est désormais
  // câblé via addEventListener (l'attribut onclick inline violait la CSP).
  window.toggleLang = toggleLang;

  const saved = localStorage.getItem('lang') || 'fr';
  const btn = document.getElementById('lang-btn');
  if (btn) {
    btn.textContent = saved === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR';
    btn.addEventListener('click', toggleLang);
  }
  if (saved === 'en') applyLang('en');
})();

/* ══════════════════════════════════════════════════════════════
   3) PRÉ-REMPLISSAGE depuis sessionStorage
   ══════════════════════════════════════════════════════════════ */
(function () {
  const name   = sessionStorage.getItem('prefill_name');
  const email  = sessionStorage.getItem('prefill_email');
  if (name) {
    const parts = name.split(' ');
    const prenom = document.getElementById('f-prenom');
    const nom    = document.getElementById('f-nom');
    if (prenom) prenom.value = parts[0] || '';
    if (nom)    nom.value    = parts.slice(1).join(' ') || '';
  }
  if (email) {
    const el = document.getElementById('f-email');
    if (el) el.value = email;
  }
})();
