// Tests des gates W2 (logique risquée, sans réseau) : routage d'état, preuve du dossier,
// structure, lint anti-tiret/anti-IA, seuils de diversité.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PIPELINE_DB_PATH = join(tmpdir(), `pipeline-w2test-${process.pid}.db`);
process.env.TELEGRAM_BOT_TOKEN = '123:dummy'; // bot.js exige un token à l'import (ne se connecte jamais ici)
const w2 = await import('../stages/w2.js');

test('routeLead : états de repos → run, états occupés → reject', () => {
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'nouveau' }, {}).route, 'run');
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'briefs_echec' }, {}).route, 'run');
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'briefs_en_cours', active_run_id: 'RUN-x' }, {}).kind, 'en_cours');
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'briefs_qc', active_run_id: 'RUN-x' }, {}).kind, 'en_cours');
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'briefs_generes' }, {}).kind, 'generes');
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'signe' }, {}).kind, 'aval');
});

test('routeLead : diag bloqué si run actif, force démarre si aucun run', () => {
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'nouveau', active_run_id: 'RUN-x' }, { mode: 'diag' }).kind, 'diag_busy');
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'nouveau' }, { mode: 'diag' }).route, 'diag');
  assert.equal(w2.routeLead({ id: 'LEAD-1', status: 'briefs_generes' }, { force: true }).route, 'run');
});

test('prepareDossier : garde les territoires, signale les sources faibles, ne bloque jamais', () => {
  const corpus = 'Le studio X utilise une palette sombre et une typographie serif elegante. La marque Y mise sur un layout aere et des animations discretes.';
  const d = { territories: [
    { territory_id: 'T1', name: 'Studio X', source_url: 'https://x.fr', evidence_excerpt: 'une palette sombre et une typographie serif elegante', why_relevant: 'premium' },
    { territory_id: 'T2', name: 'Inventé', source_url: 'https://a.fr', evidence_excerpt: 'totalement absent du corpus de recherche', why_relevant: 'x' },
  ] };
  const r = w2.prepareDossier(d, corpus);
  assert.equal(r.territories.length, 2, 'garde les 2 territoires');
  assert.ok(r.warnings.some((w) => w.includes('T2')), 'signale la source faible T2');
  // dossier vide → aucun territoire, aucun crash
  assert.deepEqual(w2.prepareDossier({}, corpus).territories, []);
});

test('structureGate : renvoie des avertissements, ne jette jamais', () => {
  const mk = (id, ambiance) => ({ direction_id: id, nom: 'n', philosophie: 'p', palette: { primaire: '#000' }, ambiance });
  assert.deepEqual(w2.structureGate([mk('D1', 'sombre'), mk('D2', 'lumineux'), mk('D3', 'brut')], {}), []);
  const w = w2.structureGate([{ direction_id: 'D1' }], {}); // nom/philosophie/palette manquants
  assert.ok(w.includes('D1_nom_manquant') && w.includes('D1_philosophie_manquante') && w.includes('D1_palette_manquante'));
});

test('lintGate : corrige les tirets en place, signale les mentions IA (ne jette pas)', () => {
  const d = { direction_id: 'D1', nom: 'un design — élégant', ambiance: 'généré par IA' };
  const w = w2.lintGate([d]);
  assert.equal(d.nom, 'un design ,  élégant', 'tiret remplacé en place');
  assert.ok(w.some((x) => x.includes('mention_ia')));
});

test('extractHtmlAndNote : extrait la note et le HTML, lève GateError si invalide', () => {
  const raw = '<!-- NOTE_DEV: j\'ai suivi le concept du DA -->\n<!DOCTYPE html><html><body>x</body></html>\nbruit final';
  const { html, devNote } = w2.extractHtmlAndNote(raw, 'D1');
  assert.equal(devNote, "j'ai suivi le concept du DA");
  assert.ok(html.startsWith('<!DOCTYPE') && html.endsWith('</html>'));
  assert.throws(() => w2.extractHtmlAndNote('texte sans balises html', 'D1'), w2.GateError);
});

test('lintHtml : scrub les tirets cadratins, signale les mentions/tells d\'IA (ne jette pas)', () => {
  const r = w2.lintHtml('<p>un site — sur mesure</p>');
  assert.equal(r.html, '<p>un site ,  sur mesure</p>');
  assert.deepEqual(r.warnings, []);
  const r2 = w2.lintHtml('<p>genere par ChatGPT</p>');
  assert.ok(r2.warnings.includes('html_mention_ia'));
  const r3 = w2.lintHtml('<p>nous allons sublimer votre image</p>');
  assert.ok(r3.warnings.includes('html_tell_ia'));
});

test('lintGate : signale les tournures IA françaises (tell_ia)', () => {
  const b = { direction_id: 'D1', philosophie: 'Nous allons sublimer votre image et propulser votre marque' };
  const w = w2.lintGate([b]);
  assert.ok(w.some((x) => x.includes('tell_ia')), 'tell français détecté');
  assert.deepEqual(w2.lintGate([{ direction_id: 'D2', philosophie: 'Un studio sobre, précis, incarné.' }]), [], 'texte sain non signalé');
});

test('diversiteGate : renvoie {verdict, warnings}, ne jette jamais', () => {
  const good = { directions: [
    { direction_id: 'D1', sector_anchor_score: 8, source_fidelity_score: 8, credibility_score: 7 },
    { direction_id: 'D2', sector_anchor_score: 9, source_fidelity_score: 7, credibility_score: 8 },
    { direction_id: 'D3', sector_anchor_score: 7, source_fidelity_score: 9, credibility_score: 9 },
  ], pairwise_similarity: [{ pair: ['D1', 'D2'], score: 2 }], overall_verdict: 'pass' };
  const r = w2.diversiteGate(good);
  assert.equal(r.verdict, 'pass');
  assert.equal(r.warnings.length, 0);
  const weak = w2.diversiteGate({ ...good, directions: [{ direction_id: 'D1', sector_anchor_score: 3, source_fidelity_score: 8, credibility_score: 7 }, good.directions[1], good.directions[2]] });
  assert.ok(weak.warnings.some((x) => x.includes('ancrage_faible')));
});
