// W3 — proposition commerciale PDF. Port fidèle : Claude sonnet-5 génère le HTML premium,
// PDFShift le convertit, aperçu Telegram (CONFIRM/CANCEL), puis envoi email au prospect (SIGNE).
// En code, l'ack 8 s de n8n disparaît : on await le PDF aussi longtemps qu'il faut.

import { InlineKeyboard, InputFile } from 'grammy';
import * as db from '../db.js';
import { anthropic, pdfshift } from '../llm.js';
import { sendPropositionEmail } from '../email.js';
import { bot } from '../telegram/bot.js';
import { config, leadShort } from '../config.js';

const send = (text, kb) => bot.api.sendMessage(config.adminChatId, text, { parse_mode: 'Markdown', ...(kb ? { reply_markup: kb } : {}) });

function htmlPrompt(lead, prix, maintenanceOfferte) {
  const acompte = Math.round(prix * 0.5);
  const maintenance = maintenanceOfferte ? '79€ TTC/mois (1er mois offert)' : '79€ TTC/mois';
  return `Tu es directeur artistique et commercial de 4Dayvelopment.

Ta mission : générer une proposition commerciale HTML premium, autonome, prête à convertir en PDF.

IDENTITÉ 4DAYVELOPMENT :
- Nom : 4Dayvelopment
- Slogan : Votre site livré en 4 jours ouvrés. Ou c'est gratuit.
- Couleurs : fond #0A0C10 / texte #F2EDE4 / accent orange #DA5426 / gold #F2B13B / muted #7A7570
- Polices : Syne (titres) + Onest (corps) via Google Fonts
- Site : 4dayvelopment.fr
- Email : contact@4dayvelopment.fr
- Logo : https://4dayvelopment.fr/logo/logo4day.png (max-width 160px en header)

DONNÉES DU PROSPECT :
- Prénom : ${lead.prenom || ''}
- Secteur : ${lead.secteur || ''}
- Message initial : ${lead.message || ''}
- Résumé IA : ${lead.resume_ia || ''}

DONNÉES DE LA PROPOSITION :
- Prix sprint : ${prix}€ TTC
- Acompte (50%) : ${acompte}€
- Solde (50%) : ${acompte}€
- Maintenance : ${maintenance}
- Validité : 30 jours

STRUCTURE OBLIGATOIRE :
1. HEADER - Logo, mois/année, n° proposition, titre "Proposition commerciale." (orange sur "commerciale."), grid CLIENT/PROJET/VALIDITÉ
2. CONTEXTE - "Ce qu'on construit." 2 paragraphes personnalisés
3. PÉRIMÈTRE - 5 livrables (01 Site premium, 02-03 spécifiques secteur, 04 Mise en ligne, 05 Accompagnement), badges "Inclus", bloc "Hors périmètre"
4. INVESTISSEMENT - Sprint prix€, Hébergement offert, SSL inclus, Total TTC, modalités 50/50, maintenance
5. PLANNING - "4 jours. Pas un de plus." J1-J4
6. CONDITIONS - "Ce qu'on s'engage à faire." 5 conditions
7. FOOTER - 4Dayvelopment + liens

RÈGLES : CSS inline ou <style> (sauf Google Fonts). Zéro animation/fixed/backdrop-filter. Zéro lorem ipsum. HTML statique imprimable. Retourne UNIQUEMENT le HTML brut sans markdown ni backticks.`;
}

const stripFences = (s) => String(s || '').replace(/^```html\s*|^```\s*|\s*```$/g, '').trim();

export async function previewProposition({ leadId, da, prix, maintenance = false }) {
  const lead = db.getLead(leadId);
  if (!lead) return send(`⚠️ Lead introuvable : ${leadId}`);
  if (!(da >= 1 && da <= 3)) return send('⚠️ Maquette invalide (1-3).');
  if (!(prix > 0)) return send('⚠️ Prix invalide.');

  const gen = await anthropic({ model: 'claude-sonnet-5', max_tokens: 8000, messages: [{ role: 'user', content: htmlPrompt(lead, prix, maintenance) }] });
  const html = stripFences(gen.text);
  if (!html.includes('<')) throw new Error('HTML de proposition vide');
  db.setLeadFields(leadId, { html_prop: html, da_choisie: da, prix_prop: prix, status: 'apercu_envoye' });

  const pdf = await pdfshift(html);
  const kb = new InlineKeyboard()
    .text('✅ Envoyer au prospect', `CONFIRM|${leadShort(leadId)}`)
    .text('✖️ Annuler', `CANCEL|${leadShort(leadId)}`);
  await bot.api.sendDocument(config.adminChatId, new InputFile(pdf, `apercu-${leadId}.pdf`), {
    caption: `📋 *Proposition prête*\n\n🆔 ${leadId}\n💶 ${prix}€ TTC\n🎨 Maquette ${da}\n\nConfirmer l'envoi au prospect ?`,
    parse_mode: 'Markdown',
    reply_markup: kb,
  });
}

export async function confirmProposition({ leadId }) {
  const lead = db.getLead(leadId);
  if (!lead) return send(`⚠️ Lead introuvable : ${leadId}`);
  if (!lead.html_prop) return send(`⚠️ Aucune proposition générée pour ${leadId} (fais d'abord /prop).`);
  if (!lead.email) return send(`⚠️ Pas d'email pour ${leadId}.`);

  const pdf = await pdfshift(lead.html_prop);
  await sendPropositionEmail({ to: lead.email, prenom: lead.prenom || '', pdf });
  db.setLeadFields(leadId, { status: 'proposition_envoyee' });

  const kb = new InlineKeyboard().text('✍️ Signé — générer le brief technique', `SIGNE|${leadShort(leadId)}`);
  await send(`✅ *Proposition envoyée au prospect*\n\n👤 ${lead.prenom || ''} — ${lead.secteur || ''}\n💶 ${lead.prix_prop || ''}€ TTC\n📧 ${lead.email}\n🆔 ${leadId}`, kb);
}

export async function cancelProposition({ leadId }) {
  db.setLeadFields(leadId, { status: 'briefs_generes' }); // retour à l'état approuvé
  return send(`✖️ Aperçu annulé pour ${leadId}. Le lead reste en briefs_generes.`);
}
