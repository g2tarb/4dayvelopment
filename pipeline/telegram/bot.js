// Instance grammy + whitelist du chat admin + helper d'alerte.
// Long-polling : aucune URL publique nécessaire (tourne sur le VPS à côté de n8n).

import { Bot } from 'grammy';
import { config, require_ } from '../config.js';

export const bot = new Bot(require_('telegramToken'));

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
