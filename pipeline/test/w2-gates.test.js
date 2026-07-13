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

test('validateDossier : 3 territoires prouvés → valide ; extrait absent → rejeté', () => {
  const corpus = 'Le studio X utilise une palette sombre et une typographie serif elegante. La marque Y mise sur un layout aere et des animations discretes. Le site Z propose une navigation immersive plein ecran.';
  const good = { territories: [
    { territory_id: 'T1', name: 'Studio X', source_url: 'https://x.fr', evidence_excerpt: 'une palette sombre et une typographie serif elegante', why_relevant: 'ancrage premium' },
    { territory_id: 'T2', name: 'Marque Y', source_url: 'https://y.fr', evidence_excerpt: 'un layout aere et des animations discretes', why_relevant: 'sobriete' },
    { territory_id: 'T3', name: 'Site Z', source_url: 'https://z.fr', evidence_excerpt: 'une navigation immersive plein ecran', why_relevant: 'immersion' },
  ] };
  assert.equal(w2.validateDossier(good, corpus, 'agence').valid, true);

  const bad = { territories: [{ territory_id: 'T1', name: 'Inventé', source_url: 'https://a.fr', evidence_excerpt: 'ceci est totalement absent du corpus de recherche brute', why_relevant: 'x' }] };
  assert.equal(w2.validateDossier(bad, corpus, 'agence').valid, false);
});

test('structureGate : 3 distinctes passent ; territoire dupliqué jette', () => {
  const dossier = { territories: [{ territory_id: 'T1' }, { territory_id: 'T2' }, { territory_id: 'T3' }] };
  const mk = (id, axis, tension, terr) => ({ direction_id: id, creative_axis: axis, core_tension: tension, concept: 'c', prompt_claude_design: 'p', territory_id: terr });
  const ok = [mk('D1', 'a', 't1', 'T1'), mk('D2', 'b', 't2', 'T2'), mk('D3', 'c', 't3', 'T3')];
  assert.doesNotThrow(() => w2.structureGate(ok, dossier));
  const dup = [mk('D1', 'a', 't1', 'T1'), mk('D2', 'b', 't2', 'T1'), mk('D3', 'c', 't3', 'T1')];
  assert.throws(() => w2.structureGate(dup, dossier), /territories_not_distinct/);
});

test('lintGate : tiret cadratin et mention IA jettent', () => {
  const base = { direction_id: 'D1', concept: 'propre', creative_axis: 'a', core_tension: 't', prompt_claude_design: 'ok' };
  assert.doesNotThrow(() => w2.lintGate([base]));
  assert.throws(() => w2.lintGate([{ ...base, concept: 'un design — élégant' }]), /tiret/);
  assert.throws(() => w2.lintGate([{ ...base, concept: 'généré par IA' }]), /mention_ia/);
});

test('diversiteGate : bons scores → verdict ; ancrage faible → jette', () => {
  const good = { directions: [
    { direction_id: 'D1', sector_anchor_score: 8, source_fidelity_score: 8, credibility_score: 7 },
    { direction_id: 'D2', sector_anchor_score: 9, source_fidelity_score: 7, credibility_score: 8 },
    { direction_id: 'D3', sector_anchor_score: 7, source_fidelity_score: 9, credibility_score: 9 },
  ], pairwise_similarity: [{ pair: ['D1', 'D2'], score: 2 }], overall_verdict: 'pass' };
  assert.equal(w2.diversiteGate(good), 'pass');
  const weak = { ...good, directions: [{ direction_id: 'D1', sector_anchor_score: 3, source_fidelity_score: 8, credibility_score: 7 }, good.directions[1], good.directions[2]] };
  assert.throws(() => w2.diversiteGate(weak), /anchor/);
});
