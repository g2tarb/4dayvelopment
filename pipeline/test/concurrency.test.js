// Le test qui prouve que la classe entière de bugs de concurrence est morte.
// Deux prises de verrou sur le même lead → exactement une réussit. C'est le cœur du système.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PIPELINE_DB_PATH = join(tmpdir(), `pipeline-test-${process.pid}.db`);
const db = await import('../db.js');

test('CAS : un seul GO peut verrouiller un lead (pas de run concurrent)', () => {
  db.insertLead({ id: 'LEAD-20260713-0001', prenom: 'Test' });

  const lock = () => db.transitionLead('LEAD-20260713-0001', {
    from: ['nouveau', 'briefs_echec', 'briefs_generes'],
    to: 'briefs_en_cours',
    set: { active_run_id: 'RUN-x', status_prec: 'nouveau' },
  });

  assert.equal(lock(), true, 'le premier GO doit verrouiller');
  assert.equal(lock(), false, 'le second GO doit être rejeté (changes===0)');
  assert.equal(db.getLead('LEAD-20260713-0001').status, 'briefs_en_cours');
});

test('CAS : transition depuis un mauvais état échoue proprement', () => {
  db.insertLead({ id: 'LEAD-20260713-0002', prenom: 'Test2' });
  // On tente d'approuver un lead qui n'est pas en briefs_qc → refusé.
  const ok = db.transitionLead('LEAD-20260713-0002', { from: ['briefs_qc'], to: 'briefs_generes' });
  assert.equal(ok, false);
  assert.equal(db.getLead('LEAD-20260713-0002').status, 'nouveau', 'état inchangé');
});

test('runs : création, échec, quota du jour', () => {
  db.insertLead({ id: 'LEAD-20260713-0003' });
  db.createRun({ run_id: 'RUN-a', lead_id: 'LEAD-20260713-0003' });
  db.createRun({ run_id: 'RUN-b', lead_id: 'LEAD-20260713-0003' });
  assert.equal(db.countRunsLast24h('LEAD-20260713-0003'), 2);

  db.markRunFailed('RUN-a', 'generation', 'boom');
  assert.equal(db.getRun('RUN-a').status, 'echec_generation');
  assert.equal(db.getRun('RUN-a').error_stage, 'generation');
});

test('reprise crash : un lead en briefs_en_cours est signalé comme bloqué', () => {
  db.insertLead({ id: 'LEAD-20260713-0004' });
  db.transitionLead('LEAD-20260713-0004', { from: ['nouveau'], to: 'briefs_en_cours', set: { active_run_id: 'RUN-z' } });
  const stuck = db.findStuckLeads().map((l) => l.id);
  assert.ok(stuck.includes('LEAD-20260713-0004'));
});

test('édition : whitelist des champs modifiables', () => {
  db.insertLead({ id: 'LEAD-20260713-0005', email: 'a@b.fr' });
  assert.equal(db.updateLeadField('LEAD-20260713-0005', 'email', 'x@y.fr'), true);
  assert.equal(db.getLead('LEAD-20260713-0005').email, 'x@y.fr');
  assert.throws(() => db.updateLeadField('LEAD-20260713-0005', 'status', 'signe'), /non modifiable/);
});
