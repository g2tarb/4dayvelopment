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
  assert.equal(resolve('/exemples/burger'), 'exemples/burger.html');
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
    for (const route of ['/', ...Object.keys(cleanPages), '/exemples/burger']) {
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
