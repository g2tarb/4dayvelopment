// Nav et pied de page uniques : partials/ recopiés par scripts/sync-partials.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const sp = require('../scripts/sync-partials');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const partials = sp.loadPartials();
const read = rel => fs.readFileSync(path.join(PUB, rel), 'utf8');

test('synchronisation : les pages portent déjà les partiels, une seconde passe ne change rien', () => {
  const targets = sp.targetFiles();
  assert.equal(targets.filter(rel => read(rel).includes('id="navbar"')).length, 16);
  assert.equal(targets.filter(rel => /<footer[\s>]/.test(read(rel))).length, 15);
  for (const rel of targets) {
    const html = read(rel);
    const once = sp.syncHtml(html, rel, sp.routeOf(rel), partials);
    assert.equal(once, html, `${rel} diverge des partiels`);
    assert.equal(sp.syncHtml(once, rel, sp.routeOf(rel), partials), once);
  }
});

test('synchronisation : un marqueur absent ou en double échoue en nommant la page', () => {
  const nav = '<!-- partial:nav -->\n  <nav id="navbar"></nav>\n  <!-- /partial:nav -->';
  assert.throws(() => sp.syncHtml('<nav id="navbar"></nav>', 'x.html', '/x', partials), /x\.html : marqueur nav absent/);
  assert.throws(() => sp.syncHtml(nav + nav, 'y.html', '/y', partials), /y\.html : marqueur nav absent ou en double/);
  assert.throws(() => sp.syncHtml(nav + '<footer></footer>', 'z.html', '/z', partials), /z\.html : marqueur footer/);
  assert.equal(sp.syncHtml('<p>sans nav</p>', 'd.html', '/d', partials), '<p>sans nav</p>');
});

test('entrée active : celle de la table, et aucune autre', () => {
  for (const rel of sp.targetFiles()) {
    const block = sp.currentBlock(read(rel), 'nav');
    if (block === null) continue;
    const current = [...block.matchAll(/<a href="https:\/\/4dayvelopment\.fr([^"]*)" aria-current="page">/g)].map(m => m[1]);
    const expected = sp.activeFor(sp.routeOf(rel));
    assert.deepEqual(current, expected ? [expected] : [], rel);
  }
  assert.equal(sp.activeFor('/services/application-web'), null);
  assert.equal(sp.activeFor('/blog/un-article'), '/blog');
});

/* Union relevée sur main avant la PR2 : les 16 navs, les 15 pieds de page
   et le gabarit des articles (server.js). Aucun lien ne doit se perdre. */
const NAV_AVANT = ['/', '/#contact', '/#tarifs', '/blog', '/devis', '/exemples', '/portfolio', '/services/e-commerce', '/services/referencement-seo', '/services/site-vitrine'];
const FOOTER_AVANT = ['/', '/#avis', '/#contact', '/#process', '/#services', '/#tarifs', '/agence', '/blog', '/cgv', '/confidentialite', '/devis', '/mentions-legales', '/methode-4-jours', '/portfolio', '/services/application-web', '/services/e-commerce', '/services/referencement-seo', '/services/site-vitrine', 'mailto:contact@4dayvelopment.fr'];
// Retraits volontaires, tous deux propres à la nav du blog : /exemples (la nav
// pointe vers /portfolio partout, D6) et /#contact comme cible du bouton de
// devis (/devis partout, 9A).
const RETRAITS_NAV = ['/exemples', '/#contact'];
const hrefs = html => new Set([...html.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/^https:\/\/4dayvelopment\.fr/, '') || '/'));

test('union : aucun lien des anciennes navs ni des anciens pieds de page ne manque', () => {
  const nav = hrefs(partials.nav), footer = hrefs(partials.footer);
  for (const h of NAV_AVANT.filter(h => !RETRAITS_NAV.includes(h))) assert.ok(nav.has(h), `nav : ${h} manque`);
  for (const h of FOOTER_AVANT) assert.ok(footer.has(h), `pied de page : ${h} manque`);
  for (const h of ['/essentiel', '/services/site-internet-restaurant', '/exemples']) assert.ok(footer.has(h), `pied de page : ${h} (nouvelle entrée) manque`);
});

const freePort = () => new Promise((ok, ko) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => ok(port)); });
  s.on('error', ko);
});

test('serveur : refuse de démarrer si un partiel manque', async () => {
  const port = await freePort();
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, env: { ...process.env, PORT: String(port), NODE_ENV: 'production', PARTIALS_DIR: path.join(ROOT, 'pas-de-partiels') }, stdio: 'ignore',
  });
  const code = await new Promise(ok => { const t = setTimeout(() => { srv.kill(); ok('toujours vivant'); }, 8000); srv.on('exit', c => { clearTimeout(t); ok(c); }); });
  assert.equal(code, 1);
});

test('article généré : nav et pied de page canoniques, Blog actif', () => {
  const html = execFileSync(process.execPath, ['-e', `
    const { buildArticleHTML } = require('./server');
    process.stdout.write(buildArticleHTML({ title: 'Titre', slug: 'titre', description: 'Desc', category: 'Guide', readTime: '5 min', content: '<p>Texte</p>', faq: [] }));
    process.exit(0);
  `], { cwd: ROOT, env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' });
  assert.equal(sp.syncHtml(html, 'blog/titre.html', '/blog/titre', partials), html);
  assert.match(html, /<a href="https:\/\/4dayvelopment\.fr\/blog" aria-current="page">Blog<\/a>/);
  assert.ok(html.includes(partials.footer));
});
