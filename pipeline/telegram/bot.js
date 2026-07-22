// Instance grammy + whitelist du chat admin + helper d'alerte.
// Long-polling : aucune URL publique nécessaire (tourne sur le VPS à côté de n8n).

import { Bot } from 'grammy';
import { config, require_ } from '../config.js';

export const bot = new Bot(require_('telegramToken'));

// Filet central : une valeur dynamique (statut 'briefs_en_cours', warning 'T2_source_faible', secteur…)
// peut contenir des _ * ` [ que le Markdown Telegram n'arrive pas à fermer → erreur 400.
// Plutôt que de planter, on réessaie le même envoi sans parse_mode (texte brut). Couvre TOUS les messages.
bot.api.config.use(async (prev, method, payload, signal) => {
  // Zéro tiret cadratin/demi-cadratin dans un message sortant (exigence : aucun "tell" IA).
  if (payload?.text || payload?.caption) {
    payload = { ...payload };
    if (payload.text) payload.text = String(payload.text).replace(/\s*[—–]\s*/g, ' - ');
    if (payload.caption) payload.caption = String(payload.caption).replace(/\s*[—–]\s*/g, ' - ');
  }
  try {
    return await prev(method, payload, signal);
  } catch (err) {
    const desc = err?.description || err?.message || '';
    if (payload?.parse_mode && /parse entities|end of the entity/i.test(desc)) {
      const { parse_mode, ...rest } = payload;
      return prev(method, rest, signal);
    }
    throw err;
  }
});

// Whitelist : seul le chat admin est servi, tout le reste est ignoré silencieusement (comme le Router n8n).
bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id ?? ctx.from?.id;
  if (chatId !== config.adminChatId) return; // rejet silencieux
  await next();
});

/** Envoie un message au chat admin. Best-effort : ne jette jamais (sinon on casse la boucle du worker). */
export async function alert(text, extra = {}) {
  try {
    await bot.api.sendMessage(config.adminChatId, text, { parse_mode: 'Markdown', ...extra });
  } catch (err) {
    console.error('[telegram] alert échouée:', err.message);
  }
}
