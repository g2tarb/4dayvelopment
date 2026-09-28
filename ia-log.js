/* ── Suivi GEO : visites envoyées par un assistant IA, passages de ses robots ──
   On note la source (domaine du Referer ou utm_source) ou le nom du robot, la
   route et le code HTTP. Jamais d'IP, de cookie, de query string ni d'UA de
   visiteur humain.

   Stockage : le disque de Render est éphémère et ses journaux ne gardent que
   quelques jours. Les événements partent donc par lots vers un webhook
   (IA_LOG_WEBHOOK_URL, n8n qui ajoute une ligne par événement dans Google
   Sheets). Sans webhook, le journal pino reste la seule trace. */

const SOURCES = {
  'chatgpt.com': 'chatgpt',
  'perplexity.ai': 'perplexity',
  'gemini.google.com': 'gemini',
  'copilot.microsoft.com': 'copilot',
  'claude.ai': 'claude',
  'chat.mistral.ai': 'mistral',
};

// Google-Extended n'est qu'un jeton robots.txt : Google crawle sous l'UA
// Googlebot, cette entrée ne correspondra donc jamais. Gardée pour que la
// liste reste celle suivie dans docs/geo.
const BOTS = [
  'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Bingbot',
  'MistralAI-User',
];
const BOT_RE = new RegExp(BOTS.join('|'), 'i');

// Les robots chargent aussi CSS, JS, images et polices : du bruit pour la
// question « quelles pages lisent-ils ».
const ASSET_RE = /\.(css|js|mjs|map|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|mp4|webm)$/i;

function sourceOf(host) {
  host = String(host || '').toLowerCase();
  for (const domain of Object.keys(SOURCES)) {
    if (host === domain || host.endsWith('.' + domain)) return domain;
  }
  return null;
}

/* Renvoie { type, agent, path } ou null. Le robot passe avant la source :
   ChatGPT-User suit un lien pour l'utilisateur, c'est une lecture robot. */
function classify({ method, path, userAgent, referer, utmSource }) {
  if (method !== 'GET' && method !== 'HEAD') return null;

  const bot = String(userAgent || '').match(BOT_RE);
  if (bot) {
    if (ASSET_RE.test(path)) return null;
    const agent = BOTS.find(b => b.toLowerCase() === bot[0].toLowerCase());
    return { type: 'bot', agent, path };
  }

  let refHost = '';
  try { refHost = new URL(referer).hostname; } catch { /* pas de Referer ou Referer invalide */ }
  const fromRef = sourceOf(refHost);
  if (fromRef) return { type: 'referral', agent: fromRef, path };

  const utm = String(utmSource || '').toLowerCase();
  if (utm) {
    const hit = Object.entries(SOURCES).find(([domain, brand]) => utm === domain || utm.includes(brand));
    if (hit) return { type: 'referral', agent: hit[0], path };
  }
  return null;
}

function createIaLog({ logger, webhookUrl, token, flushMs = 5 * 60 * 1000, batchSize = 50, maxBuffer = 2000 }) {
  let buffer = [];

  async function flush() {
    if (!webhookUrl || !buffer.length) return;
    const batch = buffer;
    buffer = [];
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-ia-log-token': token } : {}) },
        body: JSON.stringify({ events: batch }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
    } catch (err) {
      // on remet le lot en tête, borné : un webhook durablement en panne ne
      // doit pas faire grossir la mémoire du serveur
      buffer = batch.concat(buffer).slice(-maxBuffer);
      logger.warn({ err: err.message, enAttente: buffer.length }, 'Suivi IA : envoi du lot échoué');
    }
  }

  function record(event) {
    logger.info({ ia: event }, 'Suivi IA');
    if (!webhookUrl) return;
    buffer.push(event);
    if (buffer.length >= batchSize) flush();
  }

  function middleware(req, res, next) {
    const hit = classify({
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      utmSource: typeof req.query.utm_source === 'string' ? req.query.utm_source : '',
    });
    if (hit) res.on('finish', () => record({ ts: new Date().toISOString(), ...hit, status: res.statusCode }));
    next();
  }

  if (webhookUrl) setInterval(flush, flushMs).unref();
  return { middleware, flush };
}

module.exports = { classify, createIaLog, SOURCES, BOTS };
