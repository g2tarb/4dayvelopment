// Point d'entrée du service : DB + bot Telegram (long-polling) + serveur d'intake HTTP + filet d'erreur global.

import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

// Charge pipeline/.env si présent (Node 22). Sans .env, on lit process.env tel quel.
try { process.loadEnvFile(new URL('./.env', import.meta.url)); } catch { /* pas de .env, ok */ }

const { config, require_, newLeadId } = await import('./config.js');
const dbMod = await import('./db.js');
const { bot, alert } = await import('./telegram/bot.js');
const { enqueue } = await import('./queue.js');
const { registerCallbacks } = await import('./telegram/callbacks.js');
const { registerCommands } = await import('./telegram/commands.js');
const { qualifyLead } = await import('./stages/intake.js');

/* ── Filet d'erreur global : plus aucune mort silencieuse ── */
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  alert(`🔥 *unhandledRejection*\n\`${String(reason).slice(0, 400)}\``);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  alert(`🔥 *uncaughtException*\n\`${String(err.message || err).slice(0, 400)}\``);
});

/* ── Auth intake : comparaison à temps constant (vraie crypto, pas l'ersatz n8n) ── */
function tokenOk(received) {
  const expected = config.intakeToken;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ── Serveur d'intake : /api/contact du site POST ici ──────
   Insère le lead puis enfile la qualification LLM + la notif Telegram (bouton GO). */
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/intake') {
    if (!tokenOk(req.headers['x-pipeline-token'])) {
      res.writeHead(401).end(JSON.stringify({ error: 'token invalide' }));
      return;
    }
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(body); } catch { res.writeHead(400).end('{"error":"json invalide"}'); return; }
      try {
        const id = newLeadId();
        dbMod.insertLead({ id, prenom: data.prenom, email: data.email, telephone: data.telephone, secteur: data.secteur, message: data.message });
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id }));
        // Qualification LLM + notif + bouton GO, dans la file (ne bloque pas la réponse HTTP).
        enqueue({ name: 'intake:qualify', leadId: id, run: () => qualifyLead({ leadId: id }) });
      } catch (err) {
        console.error('[intake] insert échoué', err);
        res.writeHead(500).end('{"error":"insert échoué"}');
      }
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ ok: true, active: dbMod.listActiveLeads().length }));
    return;
  }
  res.writeHead(404).end();
});

/* ── Commande de vie ── */
bot.command('ping', (ctx) => ctx.reply('pong ✅ pipeline en ligne'));

/* ── Commandes + boutons inline ── */
registerCommands(bot);   // /leads /status /debloquer /relancer /annuler /modifier /prop /diag /brief
registerCallbacks(bot);  // GO, A/R/T, CONFIRM/CANCEL/SIGNE, diag

/* ── Démarrage ── */
require_('telegramToken'); // fail-fast lisible si le token manque
server.listen(config.intakePort, () => console.log(`[intake] écoute sur :${config.intakePort}`));

const stuck = dbMod.findStuckLeads();
if (stuck.length) {
  alert(`⚠️ Au démarrage, ${stuck.length} lead(s) bloqué(s) en \`briefs_en_cours\` :\n${stuck.map((l) => `• ${l.id} — /relancer ${l.id}`).join('\n')}`);
}

bot.start({ onStart: (me) => console.log(`[telegram] @${me.username} démarré (long-polling)`) });
console.log('[pipeline] socle P1 prêt.');
