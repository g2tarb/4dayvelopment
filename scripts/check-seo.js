#!/usr/bin/env node
/* Contrôle SEO / GEO du HTML servi (npm run check:seo). Échoue si :
 *  - un bloc JSON-LD ne se parse pas ;
 *  - un Review ou AggregateRating apparaît (interdit : avis auto-attribués) ;
 *  - une question ou réponse de FAQPage n'est pas dans le texte visible ;
 *  - un prix d'Offer n'est pas affiché sur la page ;
 *  - une page du sitemap n'a pas sa date « Mis à jour le » visible, ou son
 *    lastmod (et le dateModified d'un Article) diffère de cette date ;
 *  - une page du sitemap n'a aucun lien entrant depuis les autres ;
 *  - le texte visible contient un tiret long ou un emoji ;
 *  - un lien interne ou une ancre est cassé ;
 *  - un placeholder ([À …], {{…}}) est présent ;
 *  - fr.json diffère du HTML de la home ou de la 404, ou les liens d'une
 *    valeur de en.json diffèrent de ceux de fr.json ;
 *  - une nav ou un pied de page diverge de partials/ (npm run sync:partials).
 * La date visible est la source de vérité : on la change quand le contenu
 * change, puis on reporte la même date dans sitemap.xml. */

const fs = require('fs');
const path = require('path');
const { parseDocument } = require('htmlparser2');
const { resolve: resolveRoute, HTML_RENAMES, PUB } = require('../lib/routes');
const partialsLib = require('./sync-partials');

const SITE = 'https://4dayvelopment.fr';
const SANS_DATE = ['/devis', '/blog']; // formulaire et liste d'articles : pas de contenu éditorial daté

const decode = s => s
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;|&rsquo;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const norm = s => decode(s)
  .replace(/[  ]/g, ' ').replace(/[’]/g, "'")
  .replace(/[\u{1F300}-\u{1FAFF}☀-➿️]/gu, '')
  .replace(/\s+([,.:;!?)])/g, '$1').replace(/\s+/g, ' ').trim();
// une liste <li> visible s'écrit en phrase dans le JSON-LD : on compare sans
// la ponctuation de liste ni la casse
const key = s => norm(s).toLowerCase().replace(/[,;·•.]/g, ' ').replace(/\s+/g, ' ').trim();
const visibleText = html => norm(html
  .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<\/?(strong|em|b|i|a|span|sup|sub|code|small|time)\b[^>]*>/g, '')
  .replace(/<[^>]+>/g, ' '));

function walk(node, fn) {
  if (Array.isArray(node)) return node.forEach(n => walk(n, fn));
  if (node && typeof node === 'object') { fn(node); Object.values(node).forEach(v => walk(v, fn)); }
}
const types = n => [].concat(n['@type'] || []);
// "1990" doit se retrouver affiché "1990", "1 990" ou "1 990" (espace fine)
const priceShown = (text, price) => {
  const p = String(price).replace('.00', '');
  const spaced = p.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return new RegExp(`(^|[^\\d])(${p}|${spaced})([^\\d]|$)`).test(text);
};

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
}

/* ── Garde-fous (fonctions exportées pour test/check-seo.test.js) ──
   Extraction par htmlparser2 : norm() et visibleText() ci-dessus effacent
   les emoji et ignorent aria-hidden, ils ne servent qu'aux FAQ et aux prix. */

const parse = html => parseDocument(html, { withStartIndices: true, withEndIndices: true });
function eachTag(nodes, fn) {
  for (const n of nodes) {
    if (n.type !== 'tag' && n.type !== 'script' && n.type !== 'style') continue;
    fn(n);
    if (n.type === 'tag') eachTag(n.children, fn);
  }
}

/* Texte visible : nœuds texte hors commentaires, script et style, plus alt,
   title, aria-label et placeholder ; tout ce qui est sous aria-hidden="true"
   est exempté (icônes décoratives). */
function visibleTexts(html) {
  const out = [];
  const visit = (nodes, hidden) => {
    for (const n of nodes) {
      if (n.type === 'text') { if (!hidden) out.push(n.data); continue; }
      if (n.type !== 'tag') continue;
      const h = hidden || n.attribs['aria-hidden'] === 'true';
      if (!h) for (const a of ['alt', 'title', 'aria-label', 'placeholder']) if (n.attribs[a]) out.push(n.attribs[a]);
      visit(n.children, h);
    }
  };
  visit(parse(html).children, false);
  return out;
}

// Emoji = Extended_Pictographic, sauf ces symboles typographiques (KTD2).
// Les drapeaux (indicateurs régionaux) et ✓ ✗ ★ ✦ → n'en sont pas.
const EMOJI_OK = new Set(['©', '®', '™', '↗', '✳']);
const around = (t, i) => t.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, ' ').trim();
function typoIssues(html) {
  const issues = [];
  for (const t of visibleTexts(html)) {
    for (const m of t.matchAll(/—/g)) issues.push(`tiret long : « ${around(t, m.index)} »`);
    for (const m of t.matchAll(/\p{Extended_Pictographic}/gu)) {
      if (!EMOJI_OK.has(m[0])) issues.push(`emoji ${m[0]} : « ${around(t, m.index)} »`);
    }
  }
  return issues;
}

const PLACEHOLDER = /\[À [^\]\n]*\]|\{\{[A-Z0-9_]+\}\}/g;
const placeholderIssues = src => [...src.matchAll(PLACEHOLDER)].map(m => `placeholder ${m[0]}`);

const hrefs = html => { const out = []; eachTag(parse(html).children, el => { if (el.name === 'a' && el.attribs.href) out.push(el.attribs.href); }); return out; };
const ids = html => { const out = new Set(); eachTag(parse(html).children, el => { if (el.attribs.id) out.add(el.attribs.id); if (el.name === 'a' && el.attribs.name) out.add(el.attribs.name); }); return out; };

/* Lien interne ramené à la forme servie : même domaine, sans .html, sans
   slash final, renommages appliqués. null pour un lien externe ou non web. */
function internal(href, pageUrl = SITE + '/') {
  if (/^(mailto:|tel:|javascript:|data:|sms:)/i.test(href)) return null;
  let u;
  try { u = new URL(href, pageUrl); } catch { return null; }
  if (!['4dayvelopment.fr', 'www.4dayvelopment.fr'].includes(u.hostname)) return null;
  let p = decodeURI(u.pathname);
  if (HTML_RENAMES[p]) p = HTML_RENAMES[p];
  if (p.endsWith('.html')) { p = p.slice(0, -5); if (p.endsWith('/index')) p = p.slice(0, -6) || '/'; }
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return { path: p, hash: decodeURIComponent(u.hash.slice(1)) };
}

/* Pages (route -> html) sans aucun lien entrant depuis une autre page. */
function orphans(pages) {
  const inbound = new Map([...pages.keys()].map(r => [r, 0]));
  for (const [route, html] of pages) {
    for (const href of hrefs(html)) {
      const t = internal(href, SITE + route);
      if (t && t.path !== route && inbound.has(t.path)) inbound.set(t.path, inbound.get(t.path) + 1);
    }
  }
  return [...inbound].filter(([, n]) => n === 0).map(([r]) => r);
}

/* Liens cassés d'une page. read(rel) renvoie le HTML d'un fichier de public/,
   exists(rel) dit si un fichier statique existe (images, PDF, llms.txt). */
function linkIssues(html, route, read, exists) {
  const issues = [];
  for (const href of hrefs(html)) {
    const t = internal(href, SITE + route);
    if (!t) continue;
    const rel = resolveRoute(t.path);
    if (!rel && href.startsWith('#')) {
      // Page sans route propre (la 404, servie pour toute adresse inconnue) :
      // une ancre seule vise le document courant.
      if (!ids(html).has(t.hash)) issues.push(`ancre absente : ${href}`);
      continue;
    }
    if (!rel) {
      if (!exists(t.path.slice(1))) issues.push(`lien cassé : ${href}`);
      continue;
    }
    if (t.hash && !ids(read(rel)).has(t.hash)) issues.push(`ancre absente : ${href}`);
  }
  return issues;
}

/* Contenu HTML d'un élément, tel qu'écrit dans la source. */
const inner = (src, el) => el.children.length ? src.slice(el.children[0].startIndex, el.children.at(-1).endIndex + 1) : '';
const squash = s => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

/* Dérive entre le HTML servi et fr.json : ce que voit un visiteur qui repasse
   en français (applyLang réécrit en innerHTML depuis fr.json). */
function i18nDrift(html, fr) {
  const issues = [];
  eachTag(parse(html).children, el => {
    const k = el.attribs['data-i18n'];
    if (k !== undefined) {
      if (!(k in fr)) issues.push(`clé ${k} absente de fr.json`);
      else if (squash(inner(html, el)) !== squash(fr[k])) issues.push(`clé ${k} : le HTML diffère de fr.json`);
    }
    const kp = el.attribs['data-i18n-ph'];
    if (kp !== undefined && squash(el.attribs.placeholder || '') !== squash(fr[kp] || '')) issues.push(`clé ${kp} : placeholder différent de fr.json`);
  });
  return issues;
}

/* Les liens d'une valeur traduite doivent garder href, class et hreflang :
   un attribut absent d'en.json disparaît au passage en anglais. */
const linkAttrs = s => { const out = []; eachTag(parse(s).children, el => { if (el.name === 'a') out.push(['href', 'class', 'hreflang'].map(a => el.attribs[a] || '').join(' | ')); }); return out; };
function i18nLinkDrift(fr, en) {
  const issues = [];
  for (const k of Object.keys(fr)) {
    if (!(k in en)) continue;
    const a = linkAttrs(fr[k]), b = linkAttrs(en[k]);
    if (a.join('\n') !== b.join('\n')) issues.push(`clé ${k} : liens différents entre fr.json [${a.join(' ; ')}] et en.json [${b.join(' ; ')}]`);
  }
  return issues;
}

module.exports = { visibleTexts, typoIssues, placeholderIssues, internal, orphans, linkIssues, i18nDrift, i18nLinkDrift };

/* ── Contrôle complet ──────────────────────────────────── */
function main() {
  const errors = [];
  const fail = (f, msg) => errors.push(`${f} : ${msg}`);
  const read = rel => fs.readFileSync(path.join(PUB, rel), 'utf8');
  const exists = rel => { try { return fs.statSync(path.join(PUB, rel)).isFile(); } catch { return false; } };

  const articleDates = {};
  for (const file of htmlFiles(PUB)) {
    const rel = path.relative(PUB, file);
    const html = fs.readFileSync(file, 'utf8');
    const text = visibleText(html);
    for (const [, raw] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      let data;
      try { data = JSON.parse(raw); } catch (e) { fail(rel, 'JSON-LD invalide : ' + e.message); continue; }
      walk(data, n => {
        const t = types(n);
        if (t.includes('Review') || t.includes('AggregateRating') || n.aggregateRating || n.review) fail(rel, 'Review/AggregateRating interdit');
        if (t.includes('FAQPage')) for (const q of n.mainEntity || []) {
          // ponytail: vérifie la présence, pas l'égalité stricte ; une réponse
          // JSON-LD tronquée passerait. Relire les FAQ quand on les modifie.
          if (!key(text).includes(key(q.name))) fail(rel, 'question FAQPage absente du texte visible : ' + q.name);
          if (!key(text).includes(key(q.acceptedAnswer.text))) fail(rel, 'réponse FAQPage différente du texte visible : ' + q.name);
        }
        if (t.includes('Offer') || t.includes('PriceSpecification') || t.includes('UnitPriceSpecification')) {
          for (const p of [n.price, n.minPrice].filter(v => v !== undefined)) {
            if (!priceShown(text, p)) fail(rel, `prix ${p} déclaré en JSON-LD mais pas affiché`);
          }
        }
        if (t.includes('Article') && n.dateModified) articleDates[rel] = n.dateModified;
      });
    }
    // Garde-fous sur tout le HTML servi : typographie, placeholders, liens.
    const route = '/' + rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '');
    for (const issue of typoIssues(html)) fail(rel, issue);
    for (const issue of placeholderIssues(html)) fail(rel, issue);
    for (const issue of linkIssues(html, route.replace(/\/$/, '') || '/', read, exists)) fail(rel, issue);
  }

  const sitemap = read('sitemap.xml');
  const pages = new Map();
  for (const [, loc, lastmod] of sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
    const route = new URL(loc).pathname;
    const rel = resolveRoute(route);
    if (!rel || !exists(rel)) { fail('sitemap.xml', `${route} ne correspond à aucun fichier`); continue; }
    const html = read(rel);
    pages.set(route, html);
    const maj = (html.match(/class="maj[^"]*"[^>]*>[^<]*<time datetime="([^"]+)"/) || [])[1];
    if (!maj) { if (!SANS_DATE.includes(route)) fail(rel, 'date « Mis à jour le » visible absente'); continue; }
    if (maj !== lastmod) fail('sitemap.xml', `${route} lastmod ${lastmod} ≠ date visible ${maj}`);
    if (articleDates[rel] && articleDates[rel] !== maj) fail(rel, `dateModified ${articleDates[rel]} ≠ date visible ${maj}`);
  }
  for (const route of orphans(pages)) fail('sitemap.xml', `${route} n'a aucun lien entrant depuis les autres pages`);

  // llms.txt suit le sitemap : chaque page du sitemap y figure, et chaque URL
  // qu'il cite existe. Sinon les moteurs IA lisent une liste périmée.
  const llms = read('llms.txt');
  for (const route of pages.keys()) if (!llms.includes(`(${SITE}${route})`)) fail('llms.txt', `${route} (sitemap) absente`);
  for (const [, url] of llms.matchAll(/\((https:\/\/4dayvelopment\.fr[^)#\s]*)[^)]*\)/g)) {
    const rel = resolveRoute(new URL(url).pathname);
    if (!rel || !exists(rel)) fail('llms.txt', `${url} ne correspond à aucun fichier`);
  }

  const fr = JSON.parse(read('locales/fr.json'));
  const en = JSON.parse(read('locales/en.json'));
  for (const [name, dict] of [['fr.json', fr], ['en.json', en]]) {
    for (const [k, v] of Object.entries(dict)) {
      for (const issue of [...typoIssues(v), ...placeholderIssues(v)]) fail(`locales/${name}`, `${k} : ${issue}`);
    }
  }
  for (const rel of ['index.html', '404.html']) for (const issue of i18nDrift(read(rel), fr)) fail(rel, issue);
  for (const issue of i18nLinkDrift(fr, en)) fail('locales/en.json', issue);

  // Nav et pied de page : chaque page cible doit porter les partiels.
  const partials = partialsLib.loadPartials();
  for (const rel of partialsLib.targetFiles()) {
    const html = read(rel);
    try {
      if (partialsLib.syncHtml(html, rel, partialsLib.routeOf(rel), partials) !== html) {
        fail(rel, 'nav ou pied de page différent de partials/ : lancer npm run sync:partials');
      }
    } catch (e) { fail(rel, e.message); }
  }

  if (errors.length) {
    console.error(errors.map(e => '✗ ' + e).join('\n'));
    console.error(`\n${errors.length} erreur(s)`);
    process.exit(1);
  }
  console.log('check:seo OK');
}

if (require.main === module) main();
