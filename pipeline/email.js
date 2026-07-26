// Envoi email (nodemailer), mêmes creds SMTP que le site. Utilisé pour la proposition au prospect.

import nodemailer from 'nodemailer';
import { config, require_ } from './config.js';

let transporter;
function tx() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mailHost,
      port: config.mailPort,
      secure: config.mailPort === 465,
      auth: { user: require_('mailUser'), pass: require_('mailPass') },
    });
  }
  return transporter;
}

// esc : retire les tirets cadratins/demi-cadratins (tells IA, proscrits) puis échappe le HTML.
const esc = (s) => String(s ?? '').replace(/\s*[—–]\s*/g, ', ').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const list = (arr, tag) => Array.isArray(arr) && arr.length ? `<${tag} style="margin:6px 0 14px;padding-left:20px;color:#2a2a2a">${arr.map((x) => `<li style="margin:3px 0">${esc(x)}</li>`).join('')}</${tag}>` : '';

function paletteBlock(p = {}) {
  const swatches = ['primaire', 'secondaire', 'accent', 'fond', 'texte']
    .filter((k) => p[k])
    .map((k) => `<span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${esc(p[k])};border:1px solid #ddd;vertical-align:middle;margin-right:4px"></span><code style="font-size:12px;color:#555;margin-right:14px">${esc(p[k])}</code>`)
    .join('');
  return swatches ? `<p style="margin:4px 0">${swatches}</p>` : '';
}

const H = (t) => `<div style="color:#DA5426;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin:18px 0 6px">${t}</div>`;

// Email HTML récap (texte seulement, sans le HTML complet des maquettes déjà envoyées en photo
// sur Telegram) : une carte par direction avec le système DA + la note du Lead Developer.
export function sendDirectionsRecapEmail({ to, leadId, secteur, directions }) {
  const cards = directions.map((d, i) => `
    <div style="border:1px solid #ececec;border-radius:14px;padding:22px 24px;margin:18px 0;background:#fff">
      <div style="font-size:20px;font-weight:800;color:#111">Direction ${i + 1} : ${esc(d.nom || '')}</div>
      <div style="font-size:13px;color:#888;margin:2px 0 10px">Ambiance : ${esc(d.ambiance || '')}</div>
      ${d.philosophie ? `<p style="font-style:italic;color:#444;margin:0 0 6px">${esc(d.philosophie)}</p>` : ''}
      ${d.palette ? H('Palette') + paletteBlock(d.palette) : ''}
      ${d.polices ? H('Typographies') + `<p style="margin:0;color:#2a2a2a">${esc(d.polices.titres || '')} (titres) · ${esc(d.polices.corps || '')} (corps)</p>` : ''}
      ${d.style_layout ? H('Mise en page') + `<p style="margin:0;color:#2a2a2a">${esc(d.style_layout)}</p>` : ''}
      ${Array.isArray(d.framer_inspirations) && d.framer_inspirations.length ? H('Inspirations') + list(d.framer_inspirations, 'ul') : ''}
      ${Array.isArray(d.regles_css) && d.regles_css.length ? H('Règles imposées au Dev') + list(d.regles_css, 'ul') : ''}
      ${Array.isArray(d.interdits) && d.interdits.length ? H('Interdits') + list(d.interdits, 'ul') : ''}
      ${H('Avis du Lead Developer')}
      <p style="margin:0;color:#2a2a2a;font-style:italic">${esc(d.devNote || 'Pas de note laissée.')}</p>
    </div>`).join('');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:760px;margin:0 auto;padding:8px 4px">
      <div style="font-size:24px;font-weight:800;color:#DA5426">3 maquettes générées${secteur ? ` : ${esc(secteur)}` : ''}</div>
      <div style="color:#777;font-size:14px;margin:4px 0 6px">Lead ${esc(leadId)}. Les 3 maquettes ont été envoyées en photo sur Telegram avec un bouton de choix ; cet email est un récap texte pour relire hors app.</div>
      ${cards}
    </div>`;

  const clean = (s) => String(s ?? '').replace(/\s*[—–]\s*/g, ', ');
  const text = directions.map((d, i) => `DIRECTION ${i + 1} : ${clean(d.nom || '')}\nAmbiance : ${clean(d.ambiance || '')}\n\n${clean(d.philosophie || '')}\n\nAvis du Dev : ${clean(d.devNote || '')}`).join('\n\n===========\n\n');

  return tx().sendMail({
    from: `"4Dayvelopment Pipeline" <${config.mailFrom}>`,
    to,
    subject: `3 maquettes générées ${leadId}${secteur ? ` (${secteur})` : ''}`,
    text: `Lead ${leadId}, secteur : ${secteur || 'n/a'}\n\n${text}`,
    html,
  });
}

export function sendPropositionEmail({ to, prenom, pdf, bcc = '4dayvelopment.pro@gmail.com' }) {
  return tx().sendMail({
    from: `"4Dayvelopment" <${config.mailFrom}>`,
    to,
    bcc,
    subject: `${prenom}, votre proposition 4Dayvelopment`,
    text: `Bonjour ${prenom},\n\nVous trouverez ci-joint votre proposition commerciale 4Dayvelopment.\n\nÀ très vite,\nL'équipe 4Dayvelopment\ncontact@4dayvelopment.fr`,
    attachments: [{ filename: 'proposition-4dayvelopment.pdf', content: pdf }],
  });
}
