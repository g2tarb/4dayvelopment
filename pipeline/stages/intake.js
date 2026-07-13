// Intake — qualification du lead (ex Form-site n8n, claude-sonnet-5) puis notif Telegram + bouton GO.
// La qualification ne doit jamais bloquer la notif : si le LLM échoue, on notifie quand même.

import { InlineKeyboard } from 'grammy';
import * as db from '../db.js';
import { anthropic } from '../llm.js';
import { bot } from '../telegram/bot.js';
import { config, leadShort } from '../config.js';

function prompt(lead) {
  return `Tu es l'assistant de 4Dayvelopment, agence web qui livre des sites en 4 jours pour solopreneurs français.

Analyse ce lead entrant et rédige un résumé commercial en 5 lignes max. Sois concis, direct, identifie le niveau de maturité du prospect.

Données :
Nom : ${lead.prenom || ''}
Email : ${lead.email || ''}
Secteur : ${lead.secteur || ''}
Message : ${lead.message || ''}

Format de réponse :
🎯 Profil : [type de prospect en 1 ligne]
💬 Demande : [ce qu'il veut vraiment]
🔥 Urgence : [Haute / Moyenne / Basse]
💶 Potentiel : [estimation fourchette 2000-4000€]
✅ Action recommandée : [prochaine étape concrète]

Règle absolue : texte brut uniquement. Zéro markdown, zéro **, zéro ##, zéro tirets IA.`;
}

export async function qualifyLead({ leadId }) {
  const lead = db.getLead(leadId);
  if (!lead) return;

  let resume = '';
  try {
    const gen = await anthropic({ model: 'claude-sonnet-5', max_tokens: 1024, messages: [{ role: 'user', content: prompt(lead) }] }, { timeoutMs: 60000 });
    resume = gen.text.trim();
    db.setLeadFields(leadId, { resume_ia: resume });
  } catch (err) {
    resume = `(qualification LLM indisponible : ${String(err.message).slice(0, 120)})`;
  }

  const kb = new InlineKeyboard()
    .text('▶️ GO — générer les briefs', `GO|${leadShort(leadId)}`)
    .text('🔍 Diag', `D|${leadShort(leadId)}`);
  await bot.api.sendMessage(config.adminChatId,
    [`📥 *Nouveau lead* ${leadId}`, `👤 ${lead.prenom || '?'} · ${lead.secteur || 'secteur ?'}`, `📧 ${lead.email || '?'} · ${lead.telephone || ''}`, '', `💬 ${(lead.message || '').slice(0, 300)}`, '', resume].join('\n'),
    { parse_mode: 'Markdown', reply_markup: kb });
}
