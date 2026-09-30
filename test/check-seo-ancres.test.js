// Ancres seules sur une page sans route propre (la 404).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const seo = require('../scripts/check-seo');

test('ancre seule sur la 404 : cherchée dans la page elle-même', () => {
  const check = html => seo.linkIssues(html, '/404', () => '', () => false);
  assert.deepEqual(check('<a href="#contenu">x</a><main id="contenu"></main>'), []);
  assert.deepEqual(check('<a href="#contenu">x</a><main></main>'), ['ancre absente : #contenu']);
});
