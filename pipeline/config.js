// Config centralisée. Chaque partie exige ses secrets au moment de s'en servir (fail-fast lisible),
// pas un big-bang au démarrage — le socle P1 tourne sans les clés LLM.

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  adminChatId: Number(process.env.TELEGRAM_ADMIN_CHAT_ID || 1436812162),
  intakePort: Number(process.env.PIPELINE_PORT || 4100),
  intakeToken: process.env.PIPELINE_INTAKE_TOKEN,

  anthropicKey: process.env.ANTHROPIC_API_KEY,
  perplexityKey: process.env.PERPLEXITY_API_KEY,
  openrouterKey: process.env.OPENROUTER_API_KEY,
  pdfshiftKey: process.env.PDFSHIFT_API_KEY,

  mailHost: process.env.MAIL_HOST || 'smtp.gmail.com',
  mailPort: Number(process.env.MAIL_PORT || 587),
  mailUser: process.env.MAIL_USER,
  mailPass: process.env.MAIL_PASS,
  mailFrom: process.env.MAIL_FROM || 'contact@4dayvelopment.fr',
  operatorEmail: process.env.OPERATOR_EMAIL || process.env.MAIL_TO || process.env.MAIL_USER, // reçoit les 3 prompts design
};

export function require_(key) {
  const v = config[key];
  if (!v) throw new Error(`Config manquante: ${key} (variable d'env non définie)`);
  return v;
}

// IDs au format hérité de n8n, pour rester compatible avec la grammaire callback [ARTD]|leadShort|runShort.
const stamp = (d = new Date()) => ({
  ymd: `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`,
  hm: `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`,
  hms: `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`,
});
const rand4 = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X');

export function newLeadId() {
  const s = stamp();
  return `LEAD-${s.ymd}-${s.hm}`; // leadShort = ymd-hm (8+4 chiffres)
}

export function newRunId() {
  const s = stamp();
  return `RUN-${s.ymd}-${s.hms}-${rand4()}`; // runShort = ymd-hms-XXXX
}

// Extraction des "short" pour les callback_data (borne à 64 octets Telegram).
export const leadShort = (id) => id.replace(/^LEAD-/, '');
export const runShort = (id) => id.replace(/^RUN-/, '');
