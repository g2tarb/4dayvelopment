// Sauvegarde quotidienne de la base (cron VPS : `node backup.js`). Conserve les 14 dernières.
// Utilise l'API backup de better-sqlite3 : cohérente même en WAL, contrairement à un simple cp.

import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.env.PIPELINE_BACKUP_DIR || '/root/backups/pipeline';
mkdirSync(dir, { recursive: true });

const { db } = await import('./db.js');
const stamp = new Date().toISOString().slice(0, 10);
await db.backup(join(dir, `pipeline-${stamp}.db`));

const old = readdirSync(dir).filter((f) => f.startsWith('pipeline-') && f.endsWith('.db')).sort().slice(0, -14);
old.forEach((f) => unlinkSync(join(dir, f)));

console.log(`[backup] pipeline-${stamp}.db ok (${old.length} ancienne(s) purgée(s))`);
process.exit(0);
