/* essentiel.js — extrait de essentiel.html : la CSP (script-src 'self') bloque
   tout script inline, la page de commande tournait donc sans aucun JS.
   Charge en defer : le DOM est pret quand ces blocs s'executent. */

// Délai toggle
    document.querySelectorAll('.urg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.urg-btn').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
        document.getElementById('e-delai').value = btn.dataset.val;
      });
    });

    // Pages : limit à 3
    document.querySelectorAll('input[name="pages"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = document.querySelectorAll('input[name="pages"]:checked');
        if (checked.length > 3) cb.checked = false;
      });
    });

    // Validation
    function getVal(id) { return document.getElementById(id).value.trim(); }
    function setErr(id, show) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('show', show);
    }
    function setErrInput(id, show) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('err', show);
    }
    function shake(el) {
      if (!el) return;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
    }

    function validate() {
      let ok = true;
      const prenom = getVal('e-prenom');
      if (prenom.length < 2) { setErr('err-prenom', true); setErrInput('e-prenom', true); ok = false; }
      else { setErr('err-prenom', false); setErrInput('e-prenom', false); }

      const email = getVal('e-email');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setErr('err-email', true); setErrInput('e-email', true); ok = false; }
      else { setErr('err-email', false); setErrInput('e-email', false); }

      const activite = getVal('e-activite');
      if (activite.length < 2) { setErr('err-activite', true); setErrInput('e-activite', true); ok = false; }
      else { setErr('err-activite', false); setErrInput('e-activite', false); }

      const desc = getVal('e-description');
      if (desc.length < 10) { setErr('err-description', true); setErrInput('e-description', true); ok = false; }
      else { setErr('err-description', false); setErrInput('e-description', false); }

      return ok;
    }

    document.getElementById('form-essentiel').addEventListener('submit', async e => {
      e.preventDefault();
      if (!validate()) {
        shake(document.getElementById('form-essentiel'));
        const firstErr = document.querySelector('.field input.err, .field textarea.err');
        if (firstErr) { firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstErr.focus(); }
        return;
      }

      const btn = document.getElementById('btn-submit');
      const fb  = document.getElementById('form-feedback');
      btn.disabled = true;
      btn.classList.add('loading');
      fb.style.display = 'none';

      const pages = [...document.querySelectorAll('input[name="pages"]:checked')].map(c => c.value).join(', ') || 'Non précisé';

      const avecMaintenance = document.getElementById('add-maintenance').checked;
      const avecWordPress = document.getElementById('add-wordpress').checked;
      const totalUnique = 890 + (avecWordPress ? 250 : 0);
      const message = `
FORMULE ESSENTIEL · ${totalUnique}€ · Livraison 4 jours${avecWordPress ? '\n+ LIVRAISON WORDPRESS (+250€)' : ''}${avecMaintenance ? '\n+ MAINTENANCE 80€/mois (engagement 12 mois)' : ''}

Prénom      : ${getVal('e-prenom')}
Téléphone   : ${getVal('e-tel') || 'Non renseigné'}
Activité    : ${getVal('e-activite')}
Site actuel : ${document.getElementById('e-site-actuel').value || 'Non précisé'}
Style       : ${document.getElementById('e-style').value || 'Non précisé'}
Délai       : ${document.getElementById('e-delai').value || 'Non précisé'}
Pages       : ${pages}
Contenu     : ${document.getElementById('e-contenu').value || 'Non précisé'}

Description :
${getVal('e-description')}
      `.trim();

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:    getVal('e-prenom'),
            email:   getVal('e-email'),
            phone:   getVal('e-tel'),
            subject: `[COMMANDE ESSENTIEL${avecWordPress ? ' + WORDPRESS' : ''}${avecMaintenance ? ' + MAINTENANCE' : ''} ${totalUnique}€] ${getVal('e-activite')}`,
            service: 'Formule Essentiel',
            budget:  `${totalUnique}€`,
            message,
          }),
        });
        const data = await res.json();
        if (data.success) {
          document.getElementById('form-wrap').style.display = 'none';
          document.getElementById('success').classList.add('show');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          throw new Error(data.message || 'Erreur');
        }
      } catch (err) {
        fb.textContent = err.message || 'Erreur lors de l\'envoi. Réessayez.';
        fb.style.display = 'block';
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    });

/* ────────────────────────────────────────────── */

/* ── i18n essentiel.html ── */
  (function () {
    function set(sel, html, idx) {
      const els = document.querySelectorAll(sel);
      const el  = els[idx === undefined ? 0 : idx];
      if (el) el.innerHTML = html;
    }
    function setPH(sel, text, idx) {
      const els = document.querySelectorAll(sel);
      const el  = els[idx === undefined ? 0 : idx];
      if (el) el.placeholder = text;
    }

    const T = {
      fr: [
        /* navigation */
        ['.back-link',               '← Retour au site'],
        /* badge */
        ['.badge-4j-main',           'Livré en 4 jours'],
        ['.badge-4j-sub',            'Délai garanti contractuellement'],
        /* pitch */
        ['.pitch h1',                'Formule <span class="g">Essentiel</span><br>à 890€'],
        ['.pitch .desc',             'Votre site vitrine professionnel, livré en 4 jours chrono. Idéal pour démarrer avec une présence en ligne qui rassure vos clients et génère des contacts.'],
        /* inclus */
        ['.inclus-title',            'Ce qui est inclus', 0],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Site vitrine jusqu\'à 3 pages', 0],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Design personnalisé à votre image', 1],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>100% responsive (mobile, tablette, desktop)', 2],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Formulaire de contact intégré', 3],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>SEO de base (balises, vitesse, indexation)', 4],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Hébergement & nom de domaine 1 an offerts', 5],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Fichiers sources remis à la livraison', 6],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>⚡ Livraison garantie en <strong>4 jours</strong>', 7],
        /* prix */
        ['.prix-detail',             'Paiement unique · Sans abonnement caché'],
        ['.prix-paiement',           'ou 2× 445€'],
        ['#prix-secure',             'Paiement sécurisé'],
        /* maintenance */
        ['.mb-title',                'Ajoutez la maintenance'],
        ['.mb-sub',                  'Protégez votre investissement après la livraison'],
        ['.mb-per',                  '/mois'],
        ['.mb-item',                 '🔒 Mises à jour de sécurité', 0],
        ['.mb-item',                 '🐛 Correction de bugs sous 24h', 1],
        ['.mb-item',                 '💾 Sauvegardes quotidiennes', 2],
        ['.mb-item',                 '📧 Support email sous 4h', 3],
        ['.mb-footer',               'Engagement 12 mois · <strong style="color:var(--text)">960€/an</strong> · Résiliable à l\'issue de l\'engagement'],
        ['.mb-toggle span:last-child','Ajouter la maintenance à ma commande'],
        ['.wp-add-title',            'Livraison sur WordPress'],
        ['.wp-add-sub',              'Gardez la main sur votre site après la livraison'],
        ['.wp-add-item',             '📝 Modification en glisser-déposer', 0],
        ['.wp-add-item',             '🎓 Formation à la prise en main incluse', 1],
        ['.wp-add-item',             '⚡ Thème léger, performances surveillées', 2],
        ['.wp-add-item',             '🎨 Toujours conçu sur-mesure', 3],
        ['.wp-add-footer',           'Supplément fixe sur la formule Essentiel · Licence Elementor Pro prise en charge par l\'agence'],
        ['.mb-toggle span:last-child','Livrer mon site sur WordPress (+250€)', 1],
        /* timeline */
        ['.inclus-title',            'Les 4 jours en détail', 1],
        ['.tl-day',                  'Jour 1 : Brief & Maquette', 0],
        ['.tl-desc',                 'On analyse votre brief, on crée la maquette visuelle et on vous la soumet pour validation.', 0],
        ['.tl-day',                  'Jour 2 : Validation & Développement', 1],
        ['.tl-desc',                 'Après votre accord, on développe le site complet avec votre contenu.', 1],
        ['.tl-day',                  'Jour 3 : Finalisation & Tests', 2],
        ['.tl-desc',                 'Tests sur tous les appareils, optimisation vitesse, ajustements finaux.', 2],
        ['.tl-day',                  'Jour 4 : Mise en ligne ✅', 3],
        ['.tl-desc',                 'Votre site est en ligne, fichiers sources remis. On reste disponibles pour la suite. C\'est parti !', 3],
        /* form header */
        ['.form-title',              'Démarrez votre projet'],
        ['.form-subtitle',           'Remplissez ce formulaire · On vous répond sous 2h'],
        /* form labels (10) */
        ['#form-essentiel .field > label', 'Prénom <span class="req">*</span>', 0],
        ['#form-essentiel .field > label', 'Email <span class="req">*</span>', 1],
        ['#form-essentiel .field > label', 'Téléphone', 2],
        ['#form-essentiel .field > label', 'Nom de votre activité / marque <span class="req">*</span>', 3],
        ['#form-essentiel .field > label', 'Pages souhaitées (3 max)', 4],
        ['#form-essentiel .field > label', 'Avez-vous déjà un site web ?', 5],
        ['#form-essentiel .field > label', 'Couleurs / style visuel préféré', 6],
        ['#form-essentiel .field > label', 'Délai souhaité', 7],
        ['#form-essentiel .field > label', 'Décrivez votre activité en 2 lignes <span class="req">*</span>', 8],
        ['#form-essentiel .field > label', 'Avez-vous vos textes et photos prêts ?', 9],
        /* page labels (6) */
        ['.page-label', 'Accueil',    0],
        ['.page-label', 'À propos',   1],
        ['.page-label', 'Services',   2],
        ['.page-label', 'Contact',    3],
        ['.page-label', 'Portfolio',  4],
        ['.page-label', 'FAQ',        5],
        /* select options */
        ['#e-site-actuel', '<option value="">Choisir…</option><option value="Non, c\'est mon premier site">Non, c\'est mon premier site</option><option value="Oui, je veux le remplacer">Oui, je veux le remplacer</option><option value="Oui, je veux le moderniser">Oui, je veux le moderniser</option>'],
        ['#e-style',       '<option value="">Choisir…</option><option>Moderne &amp; épuré</option><option>Luxe &amp; premium</option><option>Coloré &amp; dynamique</option><option>Corporatif &amp; sérieux</option><option>Minimaliste</option>'],
        ['#e-contenu',     '<option value="">Choisir…</option><option value="Oui, j\'ai tout prêt">Oui, j\'ai tout prêt</option><option value="Partiellement prêt">Partiellement prêt</option><option value="Non, j\'ai besoin d\'aide">Non, j\'ai besoin d\'aide pour le contenu</option>'],
        /* error messages */
        ['#err-prenom',      'Prénom requis.'],
        ['#err-email',       'Email invalide.'],
        ['#err-activite',    'Requis.'],
        ['#err-description', 'Description requise (min. 10 caractères).'],
        /* urgency buttons */
        ['.urg-btn', '⚡ Urgent',    0],
        ['.urg-btn', '📅 Ce mois',   1],
        ['.urg-btn', '🔭 Flexible',  2],
        /* submit & garanties */
        ['.btn-label',               '⚡ Commander ma formule Essentiel →'],
        ['.garanties .garantie',     '<span class="garantie-icon">🔒</span>Paiement 100% sécurisé', 0],
        ['.garanties .garantie',     '<span class="garantie-icon">↩️</span>Satisfait ou remboursé sous 14 jours', 1],
        ['.garanties .garantie',     '<span class="garantie-icon">⚡</span>Livraison en 4 jours garantie contractuellement', 2],
        ['.garanties .garantie',     '<span class="garantie-icon">💬</span>Réponse sous 2h par email ou WhatsApp', 3],
        ['.form-legal',              'En soumettant ce formulaire, vous acceptez que vos données soient utilisées pour traiter votre commande. Aucun spam.'],
        /* success */
        ['#success h2',              'Commande reçue ! <span class="g">⚡</span>'],
        ['#success p',               'On a bien reçu votre demande pour la formule Essentiel. Notre équipe vous contacte <strong style="color:var(--text)">sous 2h</strong> pour confirmer votre commande et démarrer les 4 jours.'],
        ['.btn-retour',              '← Retour au site'],
      ],
      en: [
        /* navigation */
        ['.back-link',               '← Back to website'],
        /* badge */
        ['.badge-4j-main',           'Delivered in 4 days'],
        ['.badge-4j-sub',            'Contractually guaranteed delivery date'],
        /* pitch */
        ['.pitch h1',                '<span class="g">Essential</span> Plan<br>at €890'],
        ['.pitch .desc',             'Your professional showcase website, delivered in 4 days flat. Perfect for launching with an online presence that reassures your clients and generates leads.'],
        /* inclus */
        ['.inclus-title',            "What's included", 0],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Showcase website up to 3 pages', 0],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Custom design tailored to your brand', 1],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>100% responsive (mobile, tablet, desktop)', 2],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Integrated contact form', 3],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Basic SEO (tags, speed, indexing)', 4],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Hosting & domain name for 1 year included', 5],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>Source files handed over at delivery', 6],
        ['.inclus-list .inclus-item','<div class="inclus-check">✓</div>⚡ Delivery guaranteed in <strong>4 days</strong>', 7],
        /* prix */
        ['.prix-detail',             'One-time payment · No hidden subscription'],
        ['.prix-paiement',           'or 2× €445'],
        ['#prix-secure',             'Secure payment'],
        /* maintenance */
        ['.mb-title',                'Add maintenance'],
        ['.mb-sub',                  'Protect your investment after delivery'],
        ['.mb-per',                  '/mo'],
        ['.mb-item',                 '🔒 Security updates', 0],
        ['.mb-item',                 '🐛 Bug fixes within 24h', 1],
        ['.mb-item',                 '💾 Daily backups', 2],
        ['.mb-item',                 '📧 Email support within 4h', 3],
        ['.mb-footer',               '12-month commitment · <strong style="color:var(--text)">€960/yr</strong> · Cancellable after commitment'],
        ['.mb-toggle span:last-child','Add maintenance to my order'],
        ['.wp-add-title',            'WordPress delivery'],
        ['.wp-add-sub',              'Keep control of your website after delivery'],
        ['.wp-add-item',             '📝 Drag-and-drop editing', 0],
        ['.wp-add-item',             '🎓 Hands-on training included', 1],
        ['.wp-add-item',             '⚡ Lightweight theme, performance monitored', 2],
        ['.wp-add-item',             '🎨 Still designed tailor-made for you', 3],
        ['.wp-add-footer',           'Fixed surcharge on the Essential plan · Elementor Pro license covered by the agency'],
        ['.mb-toggle span:last-child','Deliver my site on WordPress (+250€)', 1],
        /* timeline */
        ['.inclus-title',            'The 4 days in detail', 1],
        ['.tl-day',                  'Day 1 : Brief & Mockup', 0],
        ['.tl-desc',                 'We analyse your brief, create the visual mockup and submit it for your approval.', 0],
        ['.tl-day',                  'Day 2 : Validation & Development', 1],
        ['.tl-desc',                 'Once approved, we build the complete site with your content.', 1],
        ['.tl-day',                  'Day 3 : Finalisation & Testing', 2],
        ['.tl-desc',                 'Testing on all devices, speed optimisation, final adjustments.', 2],
        ['.tl-day',                  'Day 4 : Go Live ✅', 3],
        ['.tl-desc',                 'Your site is live, source files handed over. We stay available for what\'s next. Off we go!', 3],
        /* form header */
        ['.form-title',              'Start your project'],
        ['.form-subtitle',           'Fill in this form · We reply within 2h'],
        /* form labels (10) */
        ['#form-essentiel .field > label', 'First name <span class="req">*</span>', 0],
        ['#form-essentiel .field > label', 'Email <span class="req">*</span>', 1],
        ['#form-essentiel .field > label', 'Phone', 2],
        ['#form-essentiel .field > label', 'Business / brand name <span class="req">*</span>', 3],
        ['#form-essentiel .field > label', 'Desired pages (max 3)', 4],
        ['#form-essentiel .field > label', 'Do you already have a website?', 5],
        ['#form-essentiel .field > label', 'Preferred colours / visual style', 6],
        ['#form-essentiel .field > label', 'Preferred timeline', 7],
        ['#form-essentiel .field > label', 'Describe your business in 2 lines <span class="req">*</span>', 8],
        ['#form-essentiel .field > label', 'Do you have your text & photos ready?', 9],
        /* page labels (6) */
        ['.page-label', 'Home',      0],
        ['.page-label', 'About',     1],
        ['.page-label', 'Services',  2],
        ['.page-label', 'Contact',   3],
        ['.page-label', 'Portfolio', 4],
        ['.page-label', 'FAQ',       5],
        /* select options */
        ['#e-site-actuel', '<option value="">Select…</option><option value="Non, c\'est mon premier site">No, this is my first site</option><option value="Oui, je veux le remplacer">Yes, I want to replace it</option><option value="Oui, je veux le moderniser">Yes, I want to modernise it</option>'],
        ['#e-style',       '<option value="">Select…</option><option>Modern &amp; clean</option><option>Luxury &amp; premium</option><option>Colourful &amp; dynamic</option><option>Corporate &amp; serious</option><option>Minimalist</option>'],
        ['#e-contenu',     '<option value="">Select…</option><option value="Oui, j\'ai tout prêt">Yes, everything is ready</option><option value="Partiellement prêt">Partially ready</option><option value="Non, j\'ai besoin d\'aide">No, I need help with content</option>'],
        /* error messages */
        ['#err-prenom',      'First name required.'],
        ['#err-email',       'Invalid email.'],
        ['#err-activite',    'Required.'],
        ['#err-description', 'Description required (min. 10 characters).'],
        /* urgency buttons */
        ['.urg-btn', '⚡ Urgent',      0],
        ['.urg-btn', '📅 This month',  1],
        ['.urg-btn', '🔭 Flexible',    2],
        /* submit & garanties */
        ['.btn-label',               '⚡ Order my Essential plan →'],
        ['.garanties .garantie',     '<span class="garantie-icon">🔒</span>100% secure payment', 0],
        ['.garanties .garantie',     '<span class="garantie-icon">↩️</span>Satisfied or refunded within 14 days', 1],
        ['.garanties .garantie',     '<span class="garantie-icon">⚡</span>4-day delivery contractually guaranteed', 2],
        ['.garanties .garantie',     '<span class="garantie-icon">💬</span>Reply within 2h by email or WhatsApp', 3],
        ['.form-legal',              'By submitting this form, you agree that your data will be used to process your order. No spam.'],
        /* success */
        ['#success h2',              'Order received! <span class="g">⚡</span>'],
        ['#success p',               'We have received your Essential plan request. Our team will contact you <strong style="color:var(--text)">within 2h</strong> to confirm your order and start the 4 days.'],
        ['.btn-retour',              '← Back to website'],
      ],
    };

    const PH = {
      fr: [
        ['#e-prenom',      'Marie'],
        ['#e-email',       'marie@entreprise.fr'],
        ['#e-tel',         '+33 6 12 34 56 78'],
        ['#e-activite',    'Marie Dupont Coaching'],
        ['#e-description', 'Ex: Je suis photographe freelance, je cherche un site pour présenter mon portfolio et recevoir des demandes de devis...'],
      ],
      en: [
        ['#e-prenom',      'Sophie'],
        ['#e-email',       'sophie@company.com'],
        ['#e-tel',         '+44 7700 900 000'],
        ['#e-activite',    'Sophie Smith Coaching'],
        ['#e-description', 'E.g.: I\'m a freelance photographer looking for a site to showcase my portfolio and receive quote requests...'],
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
    /* L'attribut onclick inline du bouton violait la CSP (script-src-attr
       'none' pose par Helmet) : le bouton ne faisait rien. Meme correction
       que dans lead.js, qui l'avait recue mais jamais reportee ici. */
    document.getElementById('lang-btn')?.addEventListener('click', toggleLang);

    const saved = localStorage.getItem('lang') || 'fr';
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = saved === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR';
    if (saved === 'en') applyLang('en');
  })();

/* ────────────────────────────────────────────── */

(function () {
    const name   = sessionStorage.getItem('prefill_name');
    const email  = sessionStorage.getItem('prefill_email');
    if (name) {
      const el = document.getElementById('e-prenom');
      if (el) el.value = name.split(' ')[0];
    }
    if (email) {
      const el = document.getElementById('e-email');
      if (el) el.value = email;
    }
  })();
