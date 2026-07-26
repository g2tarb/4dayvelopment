// W2C — actions sur les briefs générés : Régénérer (R) / Retry (T).
// (Plus d'étape « Approuver » : W2 déverrouille directement le lead et envoie les 3 prompts par mail.)
// Port des semantics n8n, mais les verrous sont des CAS atomiques (db.releaseForRegen).

import * as db from '../db.js';
import { enqueue } from '../queue.js';
import { runW2 } from './w2.js';

const REGEN_COOLDOWN_MS = 120000, MAX_REGEN_PER_DAY = 5;

// Résout le run visé par un callback. 'LAST' = dernier run approuvé (ou le plus récent) du lead.
function resolveRun(leadId, runShort) {
  if (runShort === 'LAST' || runShort === 'NEW') {
    const runs = db.getRunsByLead(leadId);
    return (runs.find((r) => r.status === 'approuve') || runs[0])?.run_id || null;
  }
  return `RUN-${runShort}`;
}

export function regen(leadId, runShort, reply) {
  const runId = resolveRun(leadId, runShort);
  // Quota / cooldown (idempotence best-effort → devient transactionnel : COUNT en base).
  if (db.countRunsToday(leadId) >= MAX_REGEN_PER_DAY) return reply(`⛔ Limite de ${MAX_REGEN_PER_DAY} régénérations/jour atteinte pour ce lead.`);
  const runs = db.getRunsByLead(leadId);
  if (runs[0] && Date.now() - new Date(runs[0].created_at).getTime() < REGEN_COOLDOWN_MS) {
    return reply('⏳ Régénération trop rapprochée, attends ~2 min.');
  }
  // Libère le lock détenu par le run en QC (s'il y en a un), puis relance en force.
  if (runId) db.releaseForRegen(leadId, runId);
  reply('🔄 Régénération lancée…');
  enqueue({ name: 'w2:regen', leadId, run: () => runW2({ leadId, force: true, parentRunId: runId }) });
}

export function retry(leadId, runShort, reply) {
  const runId = resolveRun(leadId, runShort);
  if (runId) db.releaseForRegen(leadId, runId); // libère si un run bloqué détient le lock
  reply('↻ Relance lancée…');
  enqueue({ name: 'w2:retry', leadId, run: () => runW2({ leadId, force: true, parentRunId: runId }) });
}

// Choix éditorial simple (bouton "Choisir Direction N"), pas une transition de run : le lead est
// déjà au repos (briefs_generes) quand ce bouton est cliqué, donc UPDATE direct sans CAS (comme /modifier).
export function chooseDirection(leadId, dirNum, reply) {
  const lead = db.getLead(leadId);
  if (!lead) return reply(`⚠️ Lead introuvable : ${leadId}`);
  const n = parseInt(dirNum, 10);
  if (!(n >= 1 && n <= 3)) return reply('⚠️ Direction invalide (1-3).');
  let htmlArr = [];
  try { htmlArr = JSON.parse(lead.mockups_html || '[]'); } catch { /* rien à choisir */ }
  const html = htmlArr[n - 1];
  if (!html) return reply(`⚠️ Aucune maquette trouvée pour la direction ${n} (${leadId}).`);
  db.setLeadFields(leadId, { da_choisie: n, chosen_mockup_html: html });
  return reply(`✅ Direction ${n} sélectionnée pour ${leadId}.\n\nProchaine étape : appelle le client, puis \`/prop ${leadId} ${n} <prix>\`.`);
}
