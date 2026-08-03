// Base SQLite = source de vérité unique du pipeline.
// C'est ici que meurt la classe entière de bugs de concurrence : les transitions
// d'état passent par un seul UPDATE ... WHERE status IN (...) atomique (compare-and-swap),
// ce que Google Sheets ne savait pas offrir.

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.PIPELINE_DB_PATH || new URL('./data/pipeline.db', import.meta.url).pathname;
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id            TEXT PRIMARY KEY,           -- LEAD-xxxxxxxx-xxxx
    created_at    TEXT NOT NULL,
    prenom        TEXT,
    email         TEXT,
    telephone     TEXT,
    secteur       TEXT,
    message       TEXT,
    resume_ia     TEXT,
    status        TEXT NOT NULL DEFAULT 'nouveau',
    status_prec   TEXT,                       -- statut avant verrou (pour rollback)
    active_run_id TEXT,
    da_choisie    INTEGER,
    prix_prop     REAL,
    html_prop     TEXT
  );

  CREATE TABLE IF NOT EXISTS runs (
    run_id                TEXT PRIMARY KEY,    -- RUN-xxxxxxxx-xxxxxx-XXXX
    lead_id               TEXT NOT NULL REFERENCES leads(id),
    parent_run_id         TEXT,
    replaced_by_run_id    TEXT,
    status                TEXT NOT NULL DEFAULT 'demarrage',
    mode                  TEXT NOT NULL DEFAULT 'run',   -- run | diag
    created_at            TEXT NOT NULL,
    completed_at          TEXT,
    approved_at           TEXT,
    sector_normalized     TEXT,
    research_dossier_json TEXT,
    briefs_json           TEXT,
    scores_json           TEXT,
    critic_verdict        TEXT,
    cost_estimated        REAL DEFAULT 0,
    error_stage           TEXT,
    error_message         TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_runs_lead ON runs(lead_id);
`);

// Migration additive : directives libres de l'opérateur, injectées dans les générations (W2/W3).
try { db.exec('ALTER TABLE leads ADD COLUMN note_operateur TEXT'); } catch { /* colonne déjà présente */ }

const now = () => new Date().toISOString();

/* ── Leads ────────────────────────────────────────────── */

export function insertLead(lead) {
  db.prepare(`
    INSERT INTO leads (id, created_at, prenom, email, telephone, secteur, message, resume_ia, status)
    VALUES (@id, @created_at, @prenom, @email, @telephone, @secteur, @message, @resume_ia, 'nouveau')
  `).run({
    id: lead.id,
    created_at: now(),
    prenom: lead.prenom ?? null,
    email: lead.email ?? null,
    telephone: lead.telephone ?? null,
    secteur: lead.secteur ?? null,
    message: lead.message ?? null,
    resume_ia: lead.resume_ia ?? null,
  });
  return getLead(lead.id);
}

export const getLead = (id) => db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

export const listActiveLeads = () => db.prepare(`
  SELECT * FROM leads WHERE status NOT IN ('signe') ORDER BY created_at DESC
`).all();

// Édition libre d'un champ autorisé (/modifier). Whitelist stricte = pas d'injection de colonne.
const EDITABLE = new Set(['prenom', 'email', 'telephone', 'secteur', 'message', 'prix_prop', 'da_choisie']);
export function updateLeadField(id, field, value) {
  if (!EDITABLE.has(field)) throw new Error(`champ non modifiable: ${field}`);
  const r = db.prepare(`UPDATE leads SET ${field} = ? WHERE id = ?`).run(value, id);
  return r.changes === 1;
}

export function setLeadFields(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const assign = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE leads SET ${assign} WHERE id = @id`).run({ ...fields, id });
}

/**
 * Compare-and-swap atomique sur le statut du lead. LE primitif qui remplace tout le
 * protocole de verrous n8n (Lock/Verify/Gate/RB). Retourne true si la transition a eu lieu.
 * @param {string} id
 * @param {{from: string[], to: string, set?: object}} t
 */
export function transitionLead(id, { from, to, set = {} }) {
  const extra = Object.keys(set);
  const assign = ['status = @to', ...extra.map((k) => `${k} = @${k}`)].join(', ');
  const placeholders = from.map((_, i) => `@from${i}`).join(', ');
  const params = { id, to, ...set };
  from.forEach((s, i) => { params[`from${i}`] = s; });
  const r = db.prepare(
    `UPDATE leads SET ${assign} WHERE id = @id AND status IN (${placeholders})`,
  ).run(params);
  return r.changes === 1; // false = un autre run possède le lead OU mauvais état → aucune race
}

/* ── Transitions du protocole W2 (verrou possédé) ──────────
   Le vrai invariant anti-runs-concurrents : un lead a au plus UN run en vol (active_run_id).
   Chaque transition est un CAS atomique — remplace tout Lock/Verify/Gate/RB de n8n. */

// GO : acquiert le lead si AUCUN run n'est en vol (équiv. n8n !active, mais atomique).
export function acquireLead(leadId, runId, statusPrec = null) {
  const r = db.prepare(`
    UPDATE leads SET status = 'briefs_en_cours', active_run_id = @run, status_prec = @prec
    WHERE id = @id AND active_run_id IS NULL
  `).run({ id: leadId, run: runId, prec: statusPrec });
  return r.changes === 1;
}

// Fin de W2 : briefs_en_cours → briefs_generes, libère le lock. Les 3 prompts partent par mail ;
// pas d'étape d'approbation manuelle (l'opérateur construit les maquettes puis fait /prop).
export function completeW2(leadId, runId) {
  const r = db.prepare(`
    UPDATE leads SET status = 'briefs_generes', active_run_id = NULL, status_prec = NULL
    WHERE id = @id AND active_run_id = @run AND status = 'briefs_en_cours'
  `).run({ id: leadId, run: runId });
  return r.changes === 1;
}

// Libération avant régénération : restaure statut_prec (ou briefs_echec), libère le lock.
export function releaseForRegen(leadId, runId) {
  const lead = getLead(leadId);
  if (!lead || lead.active_run_id !== runId) return false;
  const r = db.prepare(`
    UPDATE leads SET status = @to, active_run_id = NULL, status_prec = NULL
    WHERE id = @id AND active_run_id = @run
  `).run({ id: leadId, run: runId, to: lead.status_prec || 'briefs_echec' });
  return r.changes === 1;
}

// Rollback sur échec : restaure statut_prec (ou briefs_echec), libère le lock. Idempotent.
export function rollbackLead(leadId, runId) {
  const lead = getLead(leadId);
  if (!lead || lead.active_run_id !== runId) return false; // un autre run possède déjà → on ne touche pas
  const to = lead.status_prec || 'briefs_echec';
  db.prepare(`
    UPDATE leads SET status = @to, active_run_id = NULL, status_prec = NULL
    WHERE id = @id AND active_run_id = @run
  `).run({ id: leadId, run: runId, to });
  return true;
}

// Admin : force le déverrouillage d'un lead coincé (/debloquer), sans exiger de run.
export function forceUnlock(leadId, to = 'briefs_echec') {
  db.prepare('UPDATE leads SET status = ?, active_run_id = NULL, status_prec = NULL WHERE id = ?').run(to, leadId);
}

/* ── Runs ─────────────────────────────────────────────── */

export function createRun(run) {
  db.prepare(`
    INSERT INTO runs (run_id, lead_id, parent_run_id, status, mode, created_at)
    VALUES (@run_id, @lead_id, @parent_run_id, 'demarrage', @mode, @created_at)
  `).run({
    run_id: run.run_id,
    lead_id: run.lead_id,
    parent_run_id: run.parent_run_id ?? null,
    mode: run.mode ?? 'run',
    created_at: now(),
  });
  return getRun(run.run_id);
}

export const getRun = (id) => db.prepare('SELECT * FROM runs WHERE run_id = ?').get(id);

export const getRunsByLead = (leadId) => db.prepare(
  'SELECT * FROM runs WHERE lead_id = ? ORDER BY created_at DESC',
).all(leadId);

export function updateRun(runId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const assign = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE runs SET ${assign} WHERE run_id = @run_id`).run({ ...fields, run_id: runId });
}

export function markRunFailed(runId, stage, message) {
  updateRun(runId, { status: `echec_${stage}`, error_stage: stage, error_message: String(message).slice(0, 500), completed_at: now() });
}

// Regen : compte les runs des dernières 24 h pour ce lead (quota, ex-n8n MAX_REGEN_PER_DAY).
// Fenêtre glissante : indépendante du fuseau du serveur, pas de burst à cheval sur minuit.
export function countRunsLast24h(leadId) {
  const since = new Date(Date.now() - 86400000).toISOString();
  return db.prepare('SELECT COUNT(*) n FROM runs WHERE lead_id = ? AND created_at >= ?')
    .get(leadId, since).n;
}

// Reprise après crash : leads coincés dans une étape en cours sans run terminé.
export const findStuckLeads = () => db.prepare(`
  SELECT * FROM leads WHERE status IN ('briefs_en_cours')
`).all();

export { now };
