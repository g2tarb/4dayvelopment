// W4 — brief technique (déclenché par SIGNE ou /brief). Le fichier n8n W4 n'était pas fourni ;
// ponytail: reconstruction fidèle à l'intention (générateur de brief technique via Opus 4.8),
// à ajuster si l'export W4 réel refait surface.

import * as db from '../db.js';
import { anthropic } from '../llm.js';
import { bot } from '../telegram/bot.js';
import { InputFile } from 'grammy';
import { config } from '../config.js';

const send = (text) => bot.api.sendMessage(config.adminChatId, text, { parse_mode: 'Markdown' });

export async function runW4({ leadId }) {
  const lead = db.getLead(leadId);
  if (!lead) return send(`⚠️ Lead introuvable : ${leadId}`);

  // Direction retenue = celle choisie à l'aperçu (da_choisie), sinon la première approuvée.
  const runs = db.getRunsByLead(leadId);
  const approved = runs.find((r) => r.status === 'approuve') || runs.find((r) => r.briefs_json);
  let brief = null;
  try {
    const briefs = approved?.briefs_json ? JSON.parse(approved.briefs_json) : [];
    brief = briefs[(lead.da_choisie || 1) - 1] || briefs[0] || null;
  } catch { /* pas de briefs exploitables */ }

  const prompt = `Tu es lead developer chez 4Dayvelopment (agence web, sites livrés en 4 jours).
Rédige un BRIEF TECHNIQUE de mise en oeuvre, prêt à être exécuté par un développeur, pour ce projet client signé.

=== CLIENT ===
Secteur: ${lead.secteur || ''}
Demande: ${lead.message || ''}
Résumé: ${lead.resume_ia || ''}

=== DIRECTION CRÉATIVE RETENUE ===
${brief ? JSON.stringify(brief, null, 2) : '(aucune direction structurée disponible — déduis un parti pris cohérent avec le secteur)'}

=== HTML DE LA MAQUETTE RETENUE (structure/palette/typo réellement utilisées) ===
${lead.chosen_mockup_html || '(aucune maquette HTML disponible, déduis-toi du contexte ci-dessus)'}

Produis un brief technique structuré: objectif, stack recommandée, arborescence des pages, sections par page,
système visuel (palette/typo/spacing), composants à construire, intégrations (formulaire, analytics, SEO de base),
contenu à collecter auprès du client, checklist de livraison sur 4 jours (J1 à J4), critères de recette.
Français, dense, actionnable. Zéro tiret cadratin, zéro mention d'IA dans les livrables destinés au client.`;

  const gen = await anthropic({ model: 'claude-opus-4-8', max_tokens: 8000, messages: [{ role: 'user', content: prompt }] });
  const text = gen.text.trim();
  db.setLeadFields(leadId, { status: 'signe' });

  // Long → envoyé en fichier .md pour rester lisible dans Telegram (limite 4096 car/message).
  await bot.api.sendDocument(config.adminChatId, new InputFile(Buffer.from(text, 'utf-8'), `brief-technique-${leadId}.md`), {
    caption: `📐 *Brief technique prêt* — ${leadId} (${lead.secteur || ''})`,
    parse_mode: 'Markdown',
  });
}
