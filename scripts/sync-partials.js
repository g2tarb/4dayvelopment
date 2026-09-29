#!/usr/bin/env node
/* Nav et pied de page : une seule source, partials/nav.html et
 * partials/footer.html (hors de public/, ni servis ni scannés comme pages).
 * npm run sync:partials les recopie entre les marqueurs
 *   <!-- partial:nav --> … <!-- /partial:nav -->
 *   <!-- partial:footer --> … <!-- /partial:footer -->
 * de chaque page cible, et pose aria-current="page" sur l'entrée de nav de
 * la page (table ACTIVE). check:seo échoue si une page diverge. server.js lit
 * les mêmes partiels pour les articles générés.
 * Pages cibles : toutes celles de public/ qui ont une nav ou un pied de page,
 * sauf les démos (exemples/*.html hors index) et les cartes de visite. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const SITE = 'https://4dayvelopment.fr';
const NAMES = ['nav', 'footer'];
const EXCLUS = /^(exemples\/(?!index\.html)[^/]+\.html|carte\/|sirven\/|erwin\/)/;

/* Page -> entrée de nav active. Les autres pages n'en ont aucune. Les
   articles générés par server.js marquent Blog eux-mêmes. */
const ACTIVE = {
  '/services/site-vitrine': '/services/site-vitrine',
  '/services/e-commerce': '/services/e-commerce',
  '/services/referencement-seo': '/services/referencement-seo',
  '/portfolio': '/portfolio',
  '/blog': '/blog',
};
const activeFor = route => ACTIVE[route] || (route.startsWith('/blog/') ? '/blog' : null);

/* Lit les partiels ; lève une erreur qui nomme le fichier manquant. */
function loadPartials(dir = path.join(ROOT, 'partials')) {
  const out = {};
  for (const n of NAMES) {
    const file = path.join(dir, `${n}.html`);
    if (!fs.existsSync(file)) throw new Error(`partiel introuvable : ${file}`);
    out[n] = fs.readFileSync(file, 'utf8');
  }
  return out;
}

/* Contenu attendu entre les marqueurs pour une page donnée. */
function render(partials, name, route) {
  const html = partials[name];
  const active = name === 'nav' && activeFor(route);
  if (!active) return html;
  const a = `<a href="${SITE}${active}">`;
  if (!html.includes(a)) throw new Error(`entrée de nav absente du partiel : ${active}`);
  return html.replace(a, `<a href="${SITE}${active}" aria-current="page">`);
}

const START = n => `<!-- partial:${n} -->`;
const END = n => `<!-- /partial:${n} -->`;
const BLOCK = n => new RegExp(`(${START(n)}\\n)([\\s\\S]*?)([ \\t]*${END(n).replace('/', '\\/')})`);

/* Une page est cible si elle a la balise concernée. */
const isTarget = (name, html) => name === 'nav' ? html.includes('id="navbar"') : /<footer[\s>]/.test(html);

/* Remplace les blocs d'une page ; erreur si un marqueur manque ou est doublé. */
function syncHtml(html, rel, route, partials) {
  let out = html;
  for (const n of NAMES) {
    if (!isTarget(n, html)) continue;
    const starts = html.split(START(n)).length - 1;
    const ends = html.split(END(n)).length - 1;
    if (starts !== 1 || ends !== 1 || !BLOCK(n).test(html)) {
      throw new Error(`${rel} : marqueur ${n} absent ou en double (${starts} début, ${ends} fin)`);
    }
    out = out.replace(BLOCK(n), (m, a, _old, c) => a + render(partials, n, route) + c);
  }
  return out;
}

/* Bloc actuel d'une page, ou null si la page n'est pas cible. */
function currentBlock(html, name) {
  if (!isTarget(name, html)) return null;
  const m = html.match(BLOCK(name));
  return m ? m[2] : undefined;
}

const routeOf = rel => {
  const r = '/' + rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '');
  return r.length > 1 ? r.replace(/\/$/, '') : '/';
};

function targetFiles(pub = PUB) {
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
  return walk(pub).map(f => path.relative(pub, f)).filter(rel => !EXCLUS.test(rel)).sort();
}

module.exports = { loadPartials, render, syncHtml, currentBlock, routeOf, targetFiles, activeFor, NAMES, EXCLUS };

if (require.main === module) {
  try {
    const partials = loadPartials();
    let changed = 0;
    for (const rel of targetFiles()) {
      const file = path.join(PUB, rel);
      const html = fs.readFileSync(file, 'utf8');
      const out = syncHtml(html, rel, routeOf(rel), partials);
      if (out !== html) { fs.writeFileSync(file, out); changed++; console.log('mis à jour : ' + rel); }
    }
    console.log(`sync:partials : ${changed} page(s) mise(s) à jour`);
  } catch (e) {
    console.error('✗ ' + e.message);
    process.exit(1);
  }
}
