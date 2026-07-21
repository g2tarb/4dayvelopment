// Anti-régression : deux leads dans la même minute doivent avoir des ID distincts
// (l'ID est PRIMARY KEY — une collision = insert en échec = lead perdu pour le pipeline).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PIPELINE_DB_PATH = join(tmpdir(), `pipeline-idtest-${process.pid}.db`);
process.env.TELEGRAM_BOT_TOKEN = '123:dummy'; // bot.js exige un token à l'import (ne se connecte jamais ici)
const { newLeadId } = await import('../config.js');
const { normId } = await import('../telegram/commands.js');

test('newLeadId : format avec suffixe aléatoire, IDs distincts dans la même minute', () => {
  assert.match(newLeadId(), /^LEAD-\d{8}-\d{4}-[A-Z0-9]{4}$/); // le suffixe est la protection anti-collision
  const ids = new Set(Array.from({ length: 20 }, () => newLeadId()));
  assert.equal(ids.size, 20);
});

test('normId : accepte ancien format (leads existants) et nouveau format (suffixe aléatoire)', () => {
  assert.equal(normId('LEAD-20260713-1200'), 'LEAD-20260713-1200');
  assert.equal(normId('20260713-1200'), 'LEAD-20260713-1200');
  assert.equal(normId('20260722-1435-AB3D'), 'LEAD-20260722-1435-AB3D');
  assert.equal(normId('lead-20260722-1435-ab3d'), 'LEAD-20260722-1435-AB3D');
  assert.equal(normId('nimportequoi'), null);
});
