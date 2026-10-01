// Routes partagées (lib/routes.js) et garde-fous de scripts/check-seo.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { cleanPages, resolve, PUB } = require('../lib/routes');

const ROOT = path.join(__dirname, '..');

test('routes : chaque URL du sitemap résout vers un fichier de public/', () => {
  const sitemap = fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
  assert.ok(locs.length > 10);
  for (const route of locs) {
    const rel = resolve(route);
    assert.ok(rel, `${route} ne résout vers aucun fichier`);
    assert.ok(fs.existsSync(path.join(PUB, rel)), `${route} -> ${rel} absent`);
  }
});

test('routes : conventions /exemples/:slug et /blog/:slug', () => {
  assert.equal(resolve('/exemples/restaurant'), 'exemples/restaurant.html');
  assert.equal(resolve('/exemples/pas-une-demo'), null);
  assert.equal(resolve('/blog/index'), null);
  assert.equal(resolve('/pas-une-page'), null);
});

const freePort = () => new Promise((ok, ko) => {
  const s = net.createServer().listen(0, () => { const { port } = s.address(); s.close(() => ok(port)); });
  s.on('error', ko);
});

test('serveur : routes propres, 301 et 404 (intégration)', async () => {
  const port = await freePort();
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: ROOT, env: { ...process.env, PORT: String(port), NODE_ENV: 'test' }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  const get = p => fetch(base + p, { redirect: 'manual' });
  try {
    for (let i = 0; ; i++) {
      try { await get('/api/version'); break; } catch (e) {
        if (i > 100) throw e;
        await new Promise(r => setTimeout(r, 100));
      }
    }
    for (const route of ['/', ...Object.keys(cleanPages), '/exemples/restaurant']) {
      assert.equal((await get(route)).status, 200, route);
    }
    const redirects = { '/lead.html': '/devis', '/cgv.html': '/cgv', '/agence/': '/agence', '/index.html': '/' };
    for (const [from, to] of Object.entries(redirects)) {
      const r = await get(from);
      assert.equal(r.status, 301, from);
      assert.equal(r.headers.get('location'), to, from);
    }
    const r404 = await get('/pas-une-page');
    assert.equal(r404.status, 404);
    assert.match(await r404.text(), /<title>404 : Page introuvable/);
  } finally {
    srv.kill();
  }
});

/* ── Garde-fous de scripts/check-seo.js (exemples écrits ici) ── */
const seo = require('../scripts/check-seo');

test('orphelines : une page sans lien entrant est signalée', () => {
  const pages = new Map([
    ['/', '<a href="/a">a</a> <a href="https://4dayvelopment.fr/b/">b</a>'],
    ['/a', '<a href="/a">moi</a> <a href="/c.html#x">c</a>'],
    ['/b', '<a href="/">home</a>'],
    ['/c', '<a href="/c">moi</a>'],
    ['/d', '<a href="/d">moi seulement</a>'],
  ]);
  assert.deepEqual(seo.orphans(pages), ['/d']);
});

test('typographie : emoji et tirets longs du texte visible', () => {
  assert.equal(seo.typoIssues('<p>⚡ Rapide</p>').length, 1);
  assert.equal(seo.typoIssues('<p>⏱ Jour 1</p>').length, 1);
  assert.deepEqual(seo.typoIssues('<p>🇬🇧 EN ✓ ✗ ★ ✦ → ↗ © ® ™ ✳</p>'), []);
  assert.deepEqual(seo.typoIssues('<span aria-hidden="true">⚡</span><!-- ⚡ — --><script>"⚡ —"</script><style>a{content:"—"}</style>'), []);
  assert.equal(seo.typoIssues('<p>un — deux</p>').length, 1);
  assert.equal(seo.typoIssues('<a aria-label="un — deux" href="/">x</a>').length, 1);
  assert.equal(seo.typoIssues('<img alt="⚡">').length, 1);
});

test('placeholders : [À …] et {{MAJUSCULES}} échouent', () => {
  assert.equal(seo.placeholderIssues('<p>[À FOURNIR : x] [À VALIDER] {{SIRET}}</p>').length, 3);
  assert.deepEqual(seo.placeholderIssues('<p>[a] {{minuscule}} À propos</p>'), []);
});

test('liens : route inconnue et ancre absente', () => {
  const files = { 'index.html': '<section id="tarifs"></section>', 'cgv.html': '<h2 id="article-6"></h2>' };
  const read = rel => files[rel] || '';
  const exists = rel => rel === 'llms.txt';
  const check = html => seo.linkIssues(html, '/', read, exists);
  assert.equal(check('<a href="/pas-une-page">x</a>').length, 1);
  assert.deepEqual(check('<a href="/#tarifs">x</a><a href="#tarifs">x</a><a href="/cgv#article-6">x</a><a href="/llms.txt">x</a>'), []);
  assert.equal(check('<a href="/#avis">x</a>').length, 1);
  assert.deepEqual(check('<a href="mailto:a@b.fr">x</a><a href="https://example.com/x">x</a><a href="/lead.html">x</a>'), []);
});

test('dérive i18n : le HTML doit égaler fr.json, aux espaces entre balises près', () => {
  const fr = { t: 'Bonjour <b>vous</b>', ph: 'Votre nom' };
  assert.deepEqual(seo.i18nDrift('<p data-i18n="t">Bonjour\n  <b>vous</b></p><input data-i18n-ph="ph" placeholder="Votre nom">', fr), []);
  assert.equal(seo.i18nDrift('<p data-i18n="t">Bonjour, <b>vous</b></p>', fr).length, 1);
  assert.equal(seo.i18nDrift('<p data-i18n="absente">x</p>', fr).length, 1);
  assert.equal(seo.i18nDrift('<input data-i18n-ph="ph" placeholder="Nom">', fr).length, 1);
});

test('liens traduits : en.json garde href, class et hreflang de fr.json', () => {
  const fr = { k: 'Voir <a href="/blog/x" class="text-link" hreflang="fr">le guide</a>' };
  assert.deepEqual(seo.i18nLinkDrift(fr, { k: 'See <a href="/blog/x" class="text-link" hreflang="fr">the guide</a>' }), []);
  assert.equal(seo.i18nLinkDrift(fr, { k: 'See <a href="/blog/x">the guide</a>' }).length, 1);
  assert.equal(seo.i18nLinkDrift(fr, { k: 'See the guide' }).length, 1);
  assert.equal(seo.i18nLinkDrift(fr, { k: fr.k + ' <a href="/y">y</a>' }).length, 1);
});
