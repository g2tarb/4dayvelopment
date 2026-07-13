// Commandes Telegram : consultation, admin (déblocage/relance/annulation), édition, et
// déclencheurs pipeline (/prop /diag /brief). Fini les corrections à la main dans le Sheet.

import * as db from '../db.js';
import { enqueue } from '../queue.js';
import { config, newLeadId } from '../config.js';
import { runW2 } from '../stages/w2.js';
import { runW4 } from '../stages/w4.js';
import { previewProposition } from '../stages/w3.js';
import { qualifyLead } from '../stages/intake.js';

// Accepte 'LEAD-20260713-1200' ou le short '20260713-1200'.
const normId = (s) => { const v = String(s || '').trim().toUpperCase(); return v.startsWith('LEAD-') ? v : (/^\d{8}-\d{4}$/.test(v) ? `LEAD-${v}` : null); };
const STATUS_EMOJI = { nouveau: '🆕', briefs_en_cours: '⏳', briefs_qc: '📋', briefs_generes: '✅', apercu_envoye: '📄', proposition_envoyee: '📧', signe: '✍️', briefs_echec: '❌' };

export function registerCommands(bot) {
  const md = (ctx, text, extra) => ctx.reply(text, { parse_mode: 'Markdown', ...extra });

  /* ── Consultation ── */
  bot.command('leads', (ctx) => {
    const leads = db.listActiveLeads();
    if (!leads.length) return md(ctx, '📭 Aucun lead actif.');
    const lines = leads.slice(0, 30).map((l) => `${STATUS_EMOJI[l.status] || '•'} \`${l.id}\` — ${l.status} — ${l.secteur || '?'}`);
    return md(ctx, ['*Leads actifs*', ...lines].join('\n'));
  });

  bot.command('status', (ctx) => {
    const id = normId(ctx.match);
    if (!id) return md(ctx, 'Usage : `/status LEAD-xxxxxxxx-xxxx`');
    const lead = db.getLead(id);
    if (!lead) return md(ctx, `⚠️ Lead introuvable : ${id}`);
    const runs = db.getRunsByLead(id);
    const cost = runs.reduce((s, r) => s + (r.cost_estimated || 0), 0);
    const runLines = runs.slice(0, 6).map((r) => `  • \`${r.run_id.slice(4)}\` ${r.status}${r.error_stage ? ` (${r.error_stage})` : ''} — ${(r.cost_estimated || 0)}€`);
    return md(ctx, [
      `${STATUS_EMOJI[lead.status] || '•'} *${lead.id}*`,
      `Statut: ${lead.status}${lead.active_run_id ? ` (run actif ${lead.active_run_id.slice(4)})` : ''}`,
      `Secteur: ${lead.secteur || '?'} · Prix: ${lead.prix_prop || '—'}€ · Maquette: ${lead.da_choisie || '—'}`,
      `Email: ${lead.email || '?'} · Tél: ${lead.telephone || '?'}`,
      `Coût LLM cumulé: ~${Math.round(cost * 100) / 100}€`,
      runs.length ? '*Runs:*' : '', ...runLines,
    ].filter(Boolean).join('\n'));
  });

  /* ── Admin ── */
  bot.command('debloquer', (ctx) => {
    const id = normId(ctx.match);
    if (!id) return md(ctx, 'Usage : `/debloquer LEAD-xxxxxxxx-xxxx`');
    if (!db.getLead(id)) return md(ctx, `⚠️ Lead introuvable : ${id}`);
    db.forceUnlock(id, 'briefs_echec');
    return md(ctx, `🔓 ${id} déverrouillé (statut → briefs_echec). Relance avec /relancer ${id}.`);
  });

  bot.command('relancer', (ctx) => {
    const id = normId(ctx.match);
    if (!id) return md(ctx, 'Usage : `/relancer LEAD-xxxxxxxx-xxxx`');
    if (!db.getLead(id)) return md(ctx, `⚠️ Lead introuvable : ${id}`);
    md(ctx, `↻ Relance des briefs pour ${id}…`);
    enqueue({ name: 'w2:relancer', leadId: id, run: () => runW2({ leadId: id, force: true }) });
  });

  bot.command('annuler', (ctx) => {
    const id = normId(ctx.match);
    if (!id) return md(ctx, 'Usage : `/annuler LEAD-xxxxxxxx-xxxx`');
    const lead = db.getLead(id);
    if (!lead) return md(ctx, `⚠️ Lead introuvable : ${id}`);
    if (lead.active_run_id) db.markRunFailed(lead.active_run_id, 'annule', 'annulé par admin');
    db.forceUnlock(id, lead.status_prec || 'briefs_echec');
    return md(ctx, `🛑 Run annulé pour ${id}.`);
  });

  bot.command('modifier', (ctx) => {
    const [idRaw, field, ...rest] = String(ctx.match || '').trim().split(/\s+/);
    const id = normId(idRaw);
    const value = rest.join(' ');
    if (!id || !field || !value) return md(ctx, 'Usage : `/modifier LEAD-xxx <email|telephone|secteur|prix_prop> <valeur>`');
    if (!db.getLead(id)) return md(ctx, `⚠️ Lead introuvable : ${id}`);
    try {
      const v = field === 'prix_prop' || field === 'da_choisie' ? Number(value) : value;
      const ok = db.updateLeadField(id, field, v);
      return md(ctx, ok ? `✏️ ${id} : ${field} → ${value}` : `⚠️ Échec mise à jour.`);
    } catch (e) { return md(ctx, `⚠️ ${e.message}`); }
  });

  /* ── Déclencheurs pipeline ── */
  bot.command('diag', (ctx) => {
    const id = normId(ctx.match);
    if (!id) return md(ctx, 'Usage : `/diag LEAD-xxxxxxxx-xxxx`');
    md(ctx, `🔍 Diagnostic pour ${id}…`);
    enqueue({ name: 'w2:diag', leadId: id, run: () => runW2({ leadId: id, mode: 'diag' }) });
  });

  bot.command('brief', (ctx) => {
    const id = normId(ctx.match);
    if (!id) return md(ctx, 'Usage : `/brief LEAD-xxxxxxxx-xxxx`');
    md(ctx, `📐 Brief technique pour ${id}…`);
    enqueue({ name: 'w4:brief', leadId: id, run: () => runW4({ leadId: id }) });
  });

  // /testlead <secteur> — crée un lead de test (comme l'arrivée d'un formulaire), pour tester le flux.
  bot.command('testlead', (ctx) => {
    const secteur = String(ctx.match || '').trim() || 'coach sportif';
    const id = newLeadId();
    db.insertLead({ id, prenom: 'Test', email: config.operatorEmail || 'test@example.com', secteur, message: 'Lead de test injecté via /testlead. Je veux un site premium pour présenter et vendre mes offres.' });
    md(ctx, `🧪 Lead de test créé : \`${id}\` (${secteur}). Qualification en cours…`);
    enqueue({ name: 'intake:qualify', leadId: id, run: () => qualifyLead({ leadId: id }) });
  });

  // /prop LEAD-xxx <1-3> <prix> [M]
  bot.command('prop', (ctx) => runProp(ctx, String(ctx.match || '').trim().split(/\s+/), md));

  // Forme repliée : répondre "<1-3> <prix> [M]" à un message contenant LEAD-xxx.
  bot.on('message:text', (ctx, next) => {
    const t = ctx.message.text.trim();
    const m = t.match(/^([1-3])\s+(\d+)\s*(M)?$/i);
    const parent = ctx.message.reply_to_message?.text || '';
    const leadMatch = parent.match(/LEAD-\d{8}-\d{4}/);
    if (m && leadMatch) return runProp(ctx, [leadMatch[0], m[1], m[2], m[3]], md);
    return next();
  });
}

function runProp(ctx, parts, md) {
  const id = normId(parts[0]);
  const da = Number(parts[1]);
  const prix = Number(parts[2]);
  const maintenance = /^m$/i.test(parts[3] || '');
  if (!id || !(da >= 1 && da <= 3) || !(prix > 0)) return md(ctx, 'Usage : `/prop LEAD-xxx <1-3> <prix> [M]`');
  if (!db.getLead(id)) return md(ctx, `⚠️ Lead introuvable : ${id}`);
  md(ctx, `📋 Génération de la proposition pour ${id} (maquette ${da}, ${prix}€${maintenance ? ', maintenance offerte' : ''})…`);
  enqueue({ name: 'w3:preview', leadId: id, run: () => previewProposition({ leadId: id, da, prix, maintenance }) });
}
