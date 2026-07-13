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

// Envoie les 3 prompts design (prompt_claude_design) à l'opérateur, à coller dans Claude Design.
export function sendDesignPromptsEmail({ to, leadId, secteur, briefs }) {
  const blocks = briefs.map((b, i) => [
    `═══════════════════════════════════════`,
    `DIRECTION ${i + 1} — ${b.concept_name || ''}`,
    `Axe : ${b.creative_axis || ''}`,
    `Territoire : ${b.territory_id || ''}`,
    `═══════════════════════════════════════`,
    '',
    b.prompt_claude_design || '(prompt manquant)',
    '',
  ].join('\n')).join('\n\n');
  return tx().sendMail({
    from: `"4Dayvelopment Pipeline" <${config.mailFrom}>`,
    to,
    subject: `3 prompts design — ${leadId}${secteur ? ` (${secteur})` : ''}`,
    text: `Lead ${leadId} — secteur : ${secteur || 'n/a'}\n\nColle chaque prompt dans Claude Design pour générer la maquette.\n\n\n${blocks}`,
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
