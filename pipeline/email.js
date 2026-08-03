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

function visualBlock(vs = {}) {
  const rows = [
    ['Palette', (vs.palette || []).join('  ·  ')],
    ['Typographies', (vs.typography || []).join('  ·  ')],
    ['Layout', (vs.layout_principles || []).join('  ·  ')],
    ['Animations', (vs.motion_principles || []).join('  ·  ')],
    ['Images', (vs.imagery_principles || []).join('  ·  ')],
  ].filter(([, v]) => v);
  return rows.map(([k, v]) => `<p style="margin:4px 0;color:#2a2a2a"><b style="color:#111">${k} :</b> ${esc(v)}</p>`).join('');
}

const H = (t) => `<div style="color:#DA5426;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin:18px 0 6px">${t}</div>`;

// Email HTML riche : une carte par direction, avec le prompt prêt à coller. À paster dans Claude Design.
export function sendDesignPromptsEmail({ to, leadId, secteur, briefs }) {
  const cards = briefs.map((b, i) => `
    <div style="border:1px solid #ececec;border-radius:14px;padding:22px 24px;margin:18px 0;background:#fff">
      <div style="font-size:20px;font-weight:800;color:#111">Direction ${i + 1} : ${esc(b.concept_name || '')}</div>
      <div style="font-size:13px;color:#888;margin:2px 0 10px">Axe : ${esc(b.creative_axis || '')}${b.core_tension ? `  ·  Tension : ${esc(b.core_tension)}` : ''}</div>
      ${b.concept ? `<p style="font-style:italic;color:#444;margin:0 0 6px">${esc(b.concept)}</p>` : ''}
      ${b.reponse_demande ? H('Réponse à la demande') + `<p style="margin:0;color:#2a2a2a">${esc(b.reponse_demande)}</p>` : ''}
      ${b.visual_system ? H('Univers visuel') + visualBlock(b.visual_system) : ''}
      ${Array.isArray(b.references) && b.references.length ? H('Références') + list(b.references, 'ul') : ''}
      ${Array.isArray(b.structure_page) && b.structure_page.length ? H('Structure de page') + list(b.structure_page, 'ol') : ''}
      ${b.ton_editorial ? H('Ton éditorial') + `<p style="margin:0;color:#2a2a2a">${esc(b.ton_editorial)}</p>` : ''}
      ${H('Prompt Claude Design (prêt à coller)')}
      <pre style="background:#f6f6f4;border:1px solid #ececec;border-radius:10px;padding:16px;white-space:pre-wrap;word-break:break-word;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#1a1a1a;margin:0">${esc(b.prompt_claude_design || '(prompt manquant)')}</pre>
    </div>`).join('');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:760px;margin:0 auto;padding:8px 4px">
      <div style="font-size:24px;font-weight:800;color:#DA5426">3 directions créatives${secteur ? ` : ${esc(secteur)}` : ''}</div>
      <div style="color:#777;font-size:14px;margin:4px 0 6px">Lead ${esc(leadId)}. Copie le prompt de la direction retenue et colle-le dans Claude Design pour générer la maquette.</div>
      ${cards}
    </div>`;

  const clean = (s) => String(s ?? '').replace(/\s*[—–]\s*/g, ', ');
  const text = briefs.map((b, i) => `DIRECTION ${i + 1} : ${clean(b.concept_name || '')}\nAxe : ${clean(b.creative_axis || '')}\n\n${clean(b.prompt_claude_design || '')}`).join('\n\n===========\n\n');

  return tx().sendMail({
    from: `"4Dayvelopment Pipeline" <${config.mailFrom}>`,
    to,
    subject: `3 directions créatives ${leadId}${secteur ? ` (${secteur})` : ''}`,
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
