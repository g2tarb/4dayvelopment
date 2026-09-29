/* Table des routes du site, partagée par server.js (qui les sert) et par
   scripts/check-seo.js (qui vérifie les liens et le sitemap sans lancer le
   serveur). Ajouter une page : une ligne dans cleanPages. */

const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');

/* Anciennes URL en .html renommées (301). */
const HTML_RENAMES = {
  '/lead.html': '/devis',
  // ancienne démo Voltéo (crédit d'impôt supprimé en 2026), remplacée le 29/09/2026
  '/exemples/borne-recharge': '/exemples/borne-irve',
  '/exemples/borne-recharge.html': '/exemples/borne-irve',
};

/* ── URLs propres (sans .html) ────────────────────────── */
const cleanPages = {
  '/essentiel':      'essentiel.html',
  '/devis':          'lead.html',
  '/services/site-vitrine':  'services/site-vitrine.html',
  '/services/e-commerce':    'services/e-commerce.html',
  '/services/referencement-seo': 'services/referencement-seo.html',
  '/services/site-internet-restaurant': 'services/site-internet-restaurant.html',
  '/services/site-internet-pompe-a-chaleur': 'services/site-internet-pompe-a-chaleur.html',
  '/services/site-internet-studio-pilates': 'services/site-internet-studio-pilates.html',
  '/services/site-internet-lieu-de-reception': 'services/site-internet-lieu-de-reception.html',
  '/services/site-internet-artisan-renovation': 'services/site-internet-artisan-renovation.html',
  '/services/site-internet-gite-chambre-hotes': 'services/site-internet-gite-chambre-hotes.html',
  '/services/site-internet-installateur-solaire': 'services/site-internet-installateur-solaire.html',
  '/services/site-internet-borne-recharge': 'services/site-internet-borne-recharge.html',
  '/services/site-internet-creation-entreprise': 'services/site-internet-creation-entreprise.html',
  '/services/gestion-google-ads': 'services/gestion-google-ads.html',
  '/services/application-web': 'services/application-web.html',
  '/methode-4-jours': 'methode-4-jours.html',
  '/agence':         'agence.html',
  '/portfolio':       'portfolio.html',
  '/exemples':        'exemples/index.html',
  '/mentions-legales': 'mentions-legales.html',
  '/confidentialite': 'confidentialite.html',
  '/cgv':            'cgv.html',
  '/blog':           'blog/index.html',
  '/blog/combien-coute-site-internet-2026': 'blog/combien-coute-site-internet-2026.html',
  // Cartes de visite digitales (QR scanne en face a face) : hors index (noindex) : leur trafic vient du QR imprime, pas de la recherche
  '/sirven':         'sirven/index.html',
  '/erwin':          'erwin/index.html',
  '/carte':          'carte/index.html',
};

/* Fichier de public/ servi pour un chemin propre, ou null. Reprend l'ordre
   de server.js : home, pages propres, puis /exemples/:slug et /blog/:slug par
   convention de fichier. */
function resolve(pathname) {
  if (pathname === '/') return 'index.html';
  if (cleanPages[pathname]) return cleanPages[pathname];
  const m = pathname.match(/^\/(exemples|blog)\/([a-z0-9-]+)$/);
  if (m && m[2] !== 'index') {
    const rel = `${m[1]}/${m[2]}.html`;
    return fs.existsSync(path.join(PUB, rel)) ? rel : null;
  }
  return null;
}

module.exports = { HTML_RENAMES, cleanPages, resolve, PUB };
