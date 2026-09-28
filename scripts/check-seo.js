#!/usr/bin/env node
/* Contrôle SEO / GEO du HTML servi (npm run check:seo). Échoue si :
 *  - un bloc JSON-LD ne se parse pas ;
 *  - un Review ou AggregateRating apparaît (interdit : avis auto-attribués) ;
 *  - une question ou réponse de FAQPage n'est pas dans le texte visible ;
 *  - un prix d'Offer n'est pas affiché sur la page ;
 *  - une page du sitemap n'a pas sa date « Mis à jour le » visible, ou son
 *    lastmod (et le dateModified d'un Article) diffère de cette date.
 * La date visible est la source de vérité : on la change quand le contenu
 * change, puis on reporte la même date dans sitemap.xml. */

const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const SANS_DATE = ['/devis', '/blog']; // formulaire et liste d'articles : pas de contenu éditorial daté

const errors = [];
const fail = (f, msg) => errors.push(`${f} : ${msg}`);

const decode = s => s
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;|&rsquo;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const norm = s => decode(s)
  .replace(/[  ]/g, ' ').replace(/[’]/g, "'")
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
}

const sitemap = fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8');
for (const [, loc, lastmod] of sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
  const route = new URL(loc).pathname;
  const rel = route === '/' ? 'index.html'
    : route === '/devis' ? 'lead.html'
    : fs.existsSync(path.join(PUB, route, 'index.html')) ? path.join(route.slice(1), 'index.html')
    : route.slice(1) + '.html';
  if (!fs.existsSync(path.join(PUB, rel))) { fail('sitemap.xml', `${route} ne correspond à aucun fichier`); continue; }
  const maj = (fs.readFileSync(path.join(PUB, rel), 'utf8').match(/class="maj[^"]*"[^>]*>[^<]*<time datetime="([^"]+)"/) || [])[1];
  if (!maj) { if (!SANS_DATE.includes(route)) fail(rel, 'date « Mis à jour le » visible absente'); continue; }
  if (maj !== lastmod) fail('sitemap.xml', `${route} lastmod ${lastmod} ≠ date visible ${maj}`);
  if (articleDates[rel] && articleDates[rel] !== maj) fail(rel, `dateModified ${articleDates[rel]} ≠ date visible ${maj}`);
}

if (errors.length) {
  console.error(errors.map(e => '✗ ' + e).join('\n'));
  process.exit(1);
}
console.log('check:seo OK');
