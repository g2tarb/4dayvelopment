// Routage des boutons inline. answerCallbackQuery est appelé IMMÉDIATEMENT (plus d'ack 8 s
// façon n8n) → fin des « boutons capricieux ». Le travail lourd part dans la file sérialisée.

import { enqueue } from '../queue.js';
import { runW2 } from '../stages/w2.js';
import * as w2c from '../stages/w2c.js';
import * as w3 from '../stages/w3.js';
import { runW4 } from '../stages/w4.js';

// Grammaire conservée : [ARTD]|leadShort|runShort  (+ GO|leadShort pour le démarrage).
export function registerCallbacks(bot) {
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data || '';
    await ctx.answerCallbackQuery().catch(() => {}); // accusé instantané, ne bloque rien
    const reply = (text) => ctx.reply(text, { parse_mode: 'Markdown' });
    const [action, leadShort, runShort] = data.split('|');
    const leadId = leadShort ? `LEAD-${leadShort}` : null;

    switch (action) {
      case 'GO':
        reply(`▶️ Génération des briefs lancée pour ${leadId}…`);
        return enqueue({ name: 'w2:go', leadId, run: () => runW2({ leadId }) });
      case 'D':
        reply(`🔍 Diagnostic lancé pour ${leadId}…`);
        return enqueue({ name: 'w2:diag', leadId, run: () => runW2({ leadId, mode: 'diag' }) });
      case 'R': return w2c.regen(leadId, runShort, reply);
      case 'T': return w2c.retry(leadId, runShort, reply);
      case 'CONFIRM':
        reply(`📧 Envoi de la proposition pour ${leadId}…`);
        return enqueue({ name: 'w3:confirm', leadId, run: () => w3.confirmProposition({ leadId }) });
      case 'CANCEL':
        return enqueue({ name: 'w3:cancel', leadId, run: () => w3.cancelProposition({ leadId }) });
      case 'SIGNE':
        reply(`📐 Génération du brief technique pour ${leadId}…`);
        return enqueue({ name: 'w4:signe', leadId, run: () => runW4({ leadId }) });
      default:
        return; // callback inconnu → ignoré silencieusement
    }
  });
}
