// W2 — génération des 3 directions créatives. Route → verrou (CAS) → recherche (Perplexity×2 +
// OpenRouter) → dossier (Sonnet + preuve) → budget → Directeur Artistique (univers visuels JSON)
// → critique/diversité → Lead Developer (HTML x3, GLM) → rendu Puppeteer (PNG) → Telegram
// (photos + boutons de choix) → QC + email récap. Tout échec (exception LLM/gate/rendu) →
// rollback atomique + alerte. Plus de mort silencieuse.

import { InlineKeyboard, InputFile } from 'grammy';
import * as db from '../db.js';
import { newRunId, leadShort } from '../config.js';
import { anthropic, perplexity, openrouter, costEur, modelForCall, projectUsd } from '../llm.js';
import { bot, alert } from '../telegram/bot.js';
import { config } from '../config.js';
import { sendDirectionsRecapEmail } from '../email.js';
import { cb } from '../telegram/render.js';
import { renderDirectionsToPng } from '../render.js';

const AVAL = ['apercu_envoye', 'proposition_envoyee', 'signe'];
class GateError extends Error { constructor(stage, reason) { super(reason); this.stage = stage; } }

const send = (text, kb) => bot.api.sendMessage(config.adminChatId, text, { parse_mode: 'Markdown', ...(kb ? { reply_markup: kb } : {}) });

/* ── Route (ex Gate Etat) ── */
export function routeLead(lead, { mode, force }) {
  const statut = lead.status || '';
  const isAval = AVAL.includes(statut);
  const memoPrec = isAval ? statut : (statut === 'briefs_generes' ? 'briefs_generes' : lead.status_prec || null);

  if (mode === 'diag') {
    if (lead.active_run_id) return { route: 'reject', kind: 'diag_busy', text: '🔍 Diagnostic indisponible : un run est en cours pour ce lead.' };
    return { route: 'diag' };
  }
  // Force (regen/retry) : démarre si aucun run en vol.
  if (force && !lead.active_run_id) return { route: 'run', statusPrec: memoPrec };
  if (statut === 'nouveau' || statut === 'briefs_echec') return { route: 'run', statusPrec: memoPrec };

  if (statut === 'briefs_en_cours' || statut === 'briefs_qc') {
    const kb = new InlineKeyboard().text('↻ Relancer', cb('R', lead.id, lead.active_run_id || lead.id));
    return { route: 'reject', kind: 'en_cours', text: '⏳ Un run est en cours pour ce lead. Si bloqué, relance :', kb };
  }
  if (statut === 'briefs_generes' || isAval) {
    const kb = new InlineKeyboard().text('🔄 Régénérer', `R|${leadShort(lead.id)}|LAST`);
    return {
      route: 'reject', kind: isAval ? 'aval' : 'generes', kb,
      text: isAval ? `⚠️ Ce lead est déjà en aval du funnel (${statut}). Régénérer remplacera les briefs visibles :` : '✅ Briefs déjà générés. Régénérer ?',
    };
  }
  return { route: 'reject', kind: 'inconnu', text: `⚠️ État inattendu (${statut}), aucune action.` };
}

/* ── Validation d'evidence du dossier (ex Gate Dossier) ── */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/https?:\/\/\S+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function ngrams(s, n) { const t = norm(s).split(' ').filter(Boolean); const out = []; for (let i = 0; i + n <= t.length; i++) out.push(t.slice(i, i + n).join(' ')); return out; }
function overlap(excerpt, corpus) { const g = ngrams(excerpt, 3); if (!g.length) return 0; const set = new Set(ngrams(corpus, 3)); let hit = 0; for (const x of g) if (set.has(x)) hit++; return hit / g.length; }

// Prépare le dossier : garde les territoires exploitables, dédoublonne, signale les sources
// faibles. Ne bloque JAMAIS le run — la qualité des sources est un avertissement, pas un échec.
export function prepareDossier(dossier, corpus) {
  const terrs = Array.isArray(dossier.territories) ? dossier.territories : [];
  const warnings = [], seen = new Set(), kept = [];
  terrs.forEach((t, i) => {
    const id = t.territory_id || `T${i + 1}`;
    const name = t.name || `Référence ${i + 1}`;
    const key = norm(name);
    if (key && seen.has(key)) return; // dédoublonne silencieusement
    if (key) seen.add(key);
    const conf = t.evidence_excerpt ? overlap(t.evidence_excerpt, corpus) : 0;
    if (conf < 0.3) warnings.push(`${id}_source_faible`);
    kept.push({ ...t, territory_id: id, name });
  });
  return { territories: kept.slice(0, 5), warnings };
}

const parseJson = (raw) => { const s = String(raw || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); try { return JSON.parse(a >= 0 && b > a ? s.slice(a, b + 1) : s); } catch { return {}; } };

/* ── Orchestrateur ── */
export async function runW2({ leadId, mode = 'normal', force = false, parentRunId = null }) {
  const runId = newRunId();
  const runStart = Date.now(); // durée mesurée sur le RUN, pas sur l'âge du lead
  db.createRun({ run_id: runId, lead_id: leadId, mode, parent_run_id: parentRunId });
  const lead = db.getLead(leadId);
  if (!lead) { db.markRunFailed(runId, 'route', 'lead introuvable'); return send(`⚠️ Lead introuvable : ${leadId}`); }

  const r = routeLead(lead, { mode, force });
  if (r.route === 'reject') {
    db.updateRun(runId, { status: `rejete_${r.kind}`, completed_at: db.now() });
    return send(r.text, r.kb);
  }

  // Verrou atomique. En diag on ne verrouille pas (lecture seule).
  if (r.route === 'run' && !db.acquireLead(leadId, runId, r.statusPrec)) {
    db.updateRun(runId, { status: 'rejete_en_cours', completed_at: db.now() });
    return send('⏳ Un run vient de démarrer pour ce lead, réessaie ensuite.');
  }

  const usageAcc = [];
  const warnings = []; // qualité (sources faibles, mentions IA, diversité) — signalé, jamais bloquant
  const acc = (call, usage) => { usageAcc.push({ call, usage }); };
  const partialEur = () => Math.round(usageAcc.reduce((s, u) => s + costEur(modelForCall(u.call), u.usage).eur, 0) * 100) / 100;

  try {
    const secteur = String(lead.secteur || '').slice(0, 400);
    const message = String(lead.message || '').slice(0, 4000); // plafond anti-coût, assez large pour les briefs riches
    const resume = String(lead.resume_ia || '');
    const note = String(lead.note_operateur || '').slice(0, 1500);

    /* 1. Recherche concurrents (Perplexity sonar-pro) */
    const concPrompt = `Tu es analyste concurrentiel pour une agence web premium francaise. Recherche sur le web, cite des sources reelles avec URLs.\n\nSecteur du prospect: ${secteur}\nZone: France\nCe qu'il vend: ${message}\n\nRapporte, factuel et source: 1) 4 a 6 concurrents ou references reelles et actuelles du secteur en France (noms reels + URL). Pour chacun, ce que fait BIEN leur site. 2) Les sections types des meilleurs sites du secteur. 3) Les elements de reassurance recurrents. 4) Ce qu'il faut EVITER. Cite les URLs. Reponds en francais, dense.`;
    const conc = await perplexity({ model: 'sonar-pro', messages: [{ role: 'user', content: concPrompt }], max_tokens: 1200, temperature: 0.2 });
    acc('perplexity_concurrents', conc.usage);

    /* 2. Tendances (Perplexity sonar-pro) */
    const tendPrompt = `Tu es directeur artistique en veille. Recherche sur le web les TENDANCES VISUELLES 2026 et surtout 3 a 5 TERRITOIRES DE REFERENCE reels, distincts et verifiables pour ce secteur (sites ou marques reels, avec URL et un extrait factuel de ce que la source dit).\n\nSecteur: ${secteur}\nStyle demande: ${message}\n\nRapporte: 1) Tendances de design web 2026 adaptees au secteur (palettes, typo, layouts, animations). 2) 3 a 5 territoires de reference mondiaux inspirants, chacun avec: nom exact, URL, un extrait factuel, pourquoi il est fort. 3) Codes visuels du positionnement premium du secteur. Cite les sources et URLs. Francais, concret.`;
    const tend = await perplexity({ model: 'sonar-pro', messages: [{ role: 'user', content: tendPrompt }], max_tokens: 1200, temperature: 0.2 });
    acc('perplexity_tendances', tend.usage);

    /* 3. Analyse demande (OpenRouter gpt-5.6-terra-pro, JSON) */
    const schemaAnalyse = '{"sector_normalized":"categorie controlee","sector_keywords":["3 a 8 mots-cles"],"sector_rationale":"justification courte","objectif":"objectif du site","cible":"cible precise","pages":["pages necessaires"],"fonctionnalites":["cles"],"gamme":"niveau de gamme","criteres_design":["3 criteres de jugement du client"]}';
    const analysePrompt = `Tu analyses la demande d'un prospect pour une agence web. Sois precis et structure. Reponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte:\n${schemaAnalyse}\n\nDonnees du lead:\nSecteur brut: ${secteur}\nMessage: ${message}\nResume: ${resume}`;
    const analyseRes = await openrouter({ model: 'openai/gpt-5.6-terra-pro', messages: [{ role: 'user', content: analysePrompt }], max_tokens: 1200, temperature: 0.4, response_format: { type: 'json_object' } });
    acc('openrouter_analyse', analyseRes.usage);
    const analyse = parseJson(analyseRes.content);

    const researchRaw = JSON.stringify({ concurrents: conc.content, tendances: tend.content, analyse_demande: analyse });
    const sectorNormalized = String(analyse.sector_normalized || '');
    db.updateRun(runId, { sector_normalized: sectorNormalized });

    /* 4. Dossier (Anthropic Haiku) + validation preuve */
    const schemaDossier = '{"territories":[{"territory_id":"T1","name":"nom precis","source_url":"https://...","source_title":"titre de la source","evidence_excerpt":"extrait factuel COPIE de la recherche brute","source_query":"requete","why_relevant":"pertinence pour CE lead","visual_signal":"transposable visuellement","risk_or_limit":"ce qui limite ou ne doit pas etre copie"}],"secteur_codes":["codes a respecter"],"pieges":["pieges a eviter"]}';
    const dossierPrompt = `Tu structures des donnees de recherche BRUTES en dossier sectoriel exploitable. Regle absolue: tu ne peux utiliser QUE des references, URLs et extraits PRESENTS dans la recherche brute ci-dessous. N'invente jamais une source, une URL ou un extrait. Si une reference n'a pas d'extrait factuel exploitable dans le texte brut, ne l'inclus pas.\n\nProduis AU MOINS 3 territoires de reference distincts (source_url et name distincts), chacun pertinent au secteur. evidence_excerpt doit etre un extrait reellement present dans la recherche brute. Reponds UNIQUEMENT en JSON valide, sans texte autour, structure exacte:\n${schemaDossier}\n\n=== RECHERCHE BRUTE ===\n${researchRaw}\n\n=== SECTEUR NORMALISE ===\n${sectorNormalized} | mots-cles: ${JSON.stringify(analyse.sector_keywords || [])}`;
    const dossierRes = await anthropic({ model: 'claude-sonnet-5', max_tokens: 3000, temperature: 0.2, messages: [{ role: 'user', content: dossierPrompt }] });
    acc('anthropic_sonnet_dossier', dossierRes.usage);
    const dossier = parseJson(dossierRes.text.replace(/^```json\s*|^```\s*|\s*```$/g, ''));
    const dv = prepareDossier(dossier, researchRaw);
    dossier.territories = dv.territories;
    warnings.push(...dv.warnings);
    db.updateRun(runId, { research_dossier_json: JSON.stringify(dossier) });

    /* Mode diagnostic : on s'arrête après le dossier et on rend un rapport. */
    if (mode === 'diag') {
      db.updateRun(runId, { status: 'diagnostic', cost_estimated: partialEur(), completed_at: db.now() });
      const lines = dv.territories.length
        ? dv.territories.map((t, i) => `${i + 1}. *${t.name}* — ${t.why_relevant || ''}\n${t.source_url || ''}`)
        : ['(aucune source structurée exploitable)'];
      return send([`🔍 *Diagnostic ${leadId}*`, `Secteur normalisé: ${sectorNormalized || 'n/a'}`, '', ...lines, '', `💶 ~${partialEur()} EUR`].join('\n'));
    }

    /* 5. Budget (avant DA + critique + Dev) */
    const NEXT_PROJ_USD =
      projectUsd('openai/gpt-5.6-terra-pro', 2500, 3000)   // 7A : Directeur Artistique
      + projectUsd('openai/gpt-5.6-terra-pro', 2000, 1500) // 7A-bis : critique
      + 3 * projectUsd('z-ai/glm-5.2', 2500, 8000);        // 7B : 3x Lead Developer (HTML)
    const projectedEur = usageAcc.reduce((s, u) => s + costEur(modelForCall(u.call), u.usage).eur, 0) + NEXT_PROJ_USD * 0.92;
    const ageMin = (Date.now() - runStart) / 60000; // temps écoulé du run en cours
    if (projectedEur > 2.0) throw new GateError('budget', `budget_projete_${projectedEur.toFixed(2)}eur`);
    if (ageMin > 20) throw new GateError('duree', `duree_${ageMin.toFixed(1)}min`);

    /* 7A. Directeur Artistique (OpenRouter gpt-5.6-terra-pro) : 3 univers visuels, pas de HTML */
    const schemaDA = '{"directions":[{"direction_id":"D1","territory_id":"T1","nom":"nom court et memorable de l\'univers","philosophie":"principe directeur en 1-2 phrases","polices":{"titres":"Police Google Fonts nommee precisement","corps":"Police Google Fonts nommee precisement"},"palette":{"primaire":"#RRGGBB","secondaire":"#RRGGBB","accent":"#RRGGBB","fond":"#RRGGBB","texte":"#RRGGBB"},"style_layout":"principe de mise en page et de grille","framer_inspirations":["site ou studio reel 1","2"],"ambiance":"atmosphere sensorielle en quelques mots","regles_css":["regle non negociable 1","2","3"],"interdits":["a eviter 1","2"]}]}';
    const notePrompt = note ? `\n=== DIRECTIVES DE L'OPERATEUR (prioritaires sur tout le reste) ===\n${note}\n` : '';
    const daPrompt = `Tu es Directeur Artistique senior pour une agence web premium francaise (niveau Awwwards/FWA). Tu definis 3 UNIVERS VISUELS distincts pour un site premium, sans coder ni ecrire de contenu : seulement le systeme de direction artistique (typo, couleurs, ambiance, layout, inspirations).\n\nOBJECTIF: 3 partis-pris forts et desirables, chacun avec une signature propre. Refuse les choix par defaut: pas de police Inter/Roboto "par securite", pas de bleu SaaS generique, pas de layout template. Choisis des typographies a caractere (Google Fonts nommees precisement), des couleurs osees mais justes (hex exacts), un style de mise en page memorable.\n\nINVARIANTS:\n- EXACTEMENT 3 univers. Les 3 "ambiance" sont clairement distinctes.\n- Si le dossier fournit des territoires, ancre chaque univers sur l'un d'eux (idealement un different par univers). Sinon ancre-toi sur le secteur et la recherche.\n- regles_css: 3 a 5 regles non negociables et concretes pour le developpeur.\n- interdits: 2 a 4 choses explicitement a eviter pour CET univers.\n- Zero tiret cadratin (—), zero mention d'IA, zero emoji.\n\n=== BRIEF CLIENT (brut) ===\nSecteur: ${secteur}\nDemande: ${message}\nResume: ${resume}\nSecteur normalise: ${sectorNormalized}\n${notePrompt}\n=== DOSSIER SECTORIEL (territoires prouves) ===\n${JSON.stringify(dossier.territories)}\n\n=== ANALYSE DEMANDE ===\n${JSON.stringify(analyse)}\n\nReponds UNIQUEMENT en JSON valide, sans texte autour, sans fences, structure exacte:\n${schemaDA}`;
    const daRes = await openrouter({ model: 'openai/gpt-5.6-terra-pro', messages: [{ role: 'user', content: daPrompt }], max_tokens: 3000, temperature: 0.9, response_format: { type: 'json_object' } });
    acc('openrouter_da', daRes.usage);
    const daParsed = parseJson(daRes.content);
    const directions = Array.isArray(daParsed.directions) ? daParsed.directions : [];
    if (directions.length !== 3) throw new GateError('da', `le DA a renvoyé ${directions.length} univers au lieu de 3`);
    warnings.push(...structureGate(directions, dossier));
    warnings.push(...lintGate(directions)); // corrige les tirets en place, signale les mentions IA/tells IA

    /* 7A-bis. Critique (OpenRouter) + gate diversité — réutilise diversiteGate telle quelle */
    const critDirs = directions.map((d) => ({ direction_id: d.direction_id, territory_id: d.territory_id, nom: d.nom, philosophie: d.philosophie, palette: d.palette, style_layout: d.style_layout, ambiance: d.ambiance }));
    const critTerrs = dossier.territories.map((t) => ({ territory_id: t.territory_id, name: t.name, source_url: t.source_url, why_relevant: t.why_relevant }));
    const schemaCrit = '{"directions":[{"direction_id":"D1","sector_anchor_score":0,"source_fidelity_score":0,"distinctiveness_score":0,"credibility_score":0,"one_line_verdict":"..."}],"pairwise_similarity":[{"pair":["D1","D2"],"score":0,"reason":"..."}],"overall_verdict":"pass|review|fail"}';
    const critPrompt = `Tu es un directeur de creation critique et exigeant. Evalue 3 univers visuels pour un site web, notes de 0 a 10.\n\nCriteres par univers: sector_anchor_score (ancrage au secteur normalise: ${sectorNormalized}), source_fidelity_score (fidelite aux territoires de reference fournis), distinctiveness_score (reelle distinction vs les autres), credibility_score (credibilite pro).\nAjoute pairwise_similarity (score 0-10 de similarite entre chaque paire, 0=totalement distinct) et overall_verdict.\n\nReponds UNIQUEMENT en JSON valide, structure exacte:\n${schemaCrit}\n\n=== TERRITOIRES ===\n${JSON.stringify(critTerrs)}\n\n=== UNIVERS ===\n${JSON.stringify(critDirs)}`;
    const critRes = await openrouter({ model: 'openai/gpt-5.6-terra-pro', max_tokens: 1500, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: critPrompt }] });
    acc('openrouter_critique', critRes.usage);
    const critic = parseJson(critRes.content);
    const { verdict, warnings: divWarns } = diversiteGate(critic);
    warnings.push(...divWarns);
    db.updateRun(runId, { briefs_json: JSON.stringify(directions), scores_json: JSON.stringify(critic), critic_verdict: verdict });

    /* 7B. Lead Developer (OpenRouter z-ai/glm-5.2) : code chaque univers en HTML complet, en parallèle */
    const devPrompt = (direction) => `Tu es Lead Developer front-end senior. Tu recois un UNIVERS VISUEL defini par un Directeur Artistique. Ta mission: coder une page HTML COMPLETE, autonome, prete a etre ouverte dans un navigateur, qui incarne cet univers pour ce client.\n\nCONTRAINTES TECHNIQUES (obligatoires):\n- Un seul fichier HTML autonome. Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>).\n- Polices via Google Fonts (<link> dans le <head>), celles de l'univers (ou meilleures, voir plus bas).\n- ZERO JavaScript personnalise (aucun <script> hors CDN Tailwind). Rendu statique.\n- Contenu realiste pour ce client, pas de lorem ipsum, pas de placeholder.\n- Zero tiret cadratin, zero emoji, zero mention ou tournure d'IA (seamless, sublimer, elever votre, revolutionner, propulser votre, n'hesitez pas, dans un monde ou, elevate your, exclamations marketing).\n- Images: URLs Unsplash pertinentes au secteur, jamais de <img> cassee.\n\nLIBERTE CREATIVE: si le concept du DA te semble trop generique ou trop proche des deux autres univers, tu as le droit de le faire evoluer. Dans tous les cas, commence ta reponse par UNE ligne:\n<!-- NOTE_DEV: [ta raison de deviation, ou "j'ai suivi le concept du DA"] -->\npuis directement <!DOCTYPE html>.\n\n=== UNIVERS VISUEL A CODER ===\n${JSON.stringify(direction)}\n\n=== CONTEXTE CLIENT ===\nSecteur: ${secteur}\nDemande: ${message}\nResume: ${resume}\n${notePrompt}\nReponds avec la note NOTE_DEV puis le document HTML complet, rien d'autre.`;
    const devResults = await Promise.all(directions.map(async (direction, i) => {
      const res = await openrouter({ model: 'z-ai/glm-5.2', messages: [{ role: 'user', content: devPrompt(direction) }], max_tokens: 8000, temperature: 0.5 });
      acc(`openrouter_glm_dev_${i + 1}`, res.usage);
      const { html, devNote } = extractHtmlAndNote(res.content, direction.direction_id || `D${i + 1}`);
      const lint = lintHtml(html);
      if (lint.warnings.length) warnings.push(...lint.warnings);
      return { html: lint.html, devNote };
    }));

    /* 7C. Rendu Puppeteer (HTML -> PNG), un seul navigateur, séquentiel */
    const renders = await renderDirectionsToPng(
      directions.map((d, i) => ({ id: d.direction_id || `D${i + 1}`, html: devResults[i].html })),
      leadId,
    );

    /* 7D. Envoi Telegram : 3 photos + bouton "Choisir Direction N" par photo */
    for (let i = 0; i < 3; i++) {
      const d = directions[i];
      const caption = [
        `🎨 *Direction ${i + 1}/3* — ${leadId}`,
        `📍 ${d.nom || ''}`,
        `🎯 ${d.ambiance || ''}`,
        '',
        `💬 Avis du Dev : ${devResults[i].devNote || 'pas de note laissée.'}`,
      ].join('\n');
      const kb = new InlineKeyboard().text(`✅ Choisir Direction ${i + 1}`, cb('CH', leadId, runId, i + 1));
      await bot.api.sendPhoto(config.adminChatId, new InputFile(renders[i].pngPath), { caption, parse_mode: 'Markdown', reply_markup: kb });
    }

    /* 7E. Fin W2 : persistance atomique (même UPDATE que le déverrouillage) + email récap */
    const enriched = directions.map((d, i) => ({ ...d, devNote: devResults[i].devNote }));
    const ok = db.completeW2(leadId, runId, {
      mockups_html: JSON.stringify(devResults.map((d) => d.html)),
      mockups_meta: JSON.stringify(enriched),
    });
    if (!ok) throw new GateError('qc_guard', 'lead non possédé en fin de W2');
    const costFinal = partialEur();
    db.updateRun(runId, { status: 'approuve', cost_estimated: costFinal, completed_at: db.now() });
    if (parentRunId) db.updateRun(parentRunId, { status: 'remplace', replaced_by_run_id: runId });

    try {
      if (config.operatorEmail) await sendDirectionsRecapEmail({ to: config.operatorEmail, leadId, secteur: sectorNormalized, directions: enriched });
    } catch (e) { await alert(`⚠️ Envoi email récap échoué (${leadId}) : ${e.message}. Les maquettes restent en base (run ${runId.slice(4)}).`); }

    const warn = warnings.length ? `\n⚠️ À surveiller (${warnings.length}) : ${warnings.slice(0, 6).join(', ')}${warnings.length > 6 ? '…' : ''}` : '';
    const kb = new InlineKeyboard().text('🔄 Régénérer', cb('R', leadId, runId));
    await send([
      `✅ *3 maquettes prêtes* — ${leadId}`,
      `📊 Secteur: ${sectorNormalized || 'n/a'} · 🧭 Verdict: ${verdict} · 💶 ~${costFinal} EUR`,
      `📧 Récap envoyé à ${config.operatorEmail || '(email non configuré)'}${warn}`,
      '',
      `Choisis une direction ci-dessus, ou régénère si rien ne convient. Après le call, *réponds à ce message* avec \`maquette prix\` (ex : \`1 2000\`, ou \`1 2000 M\` pour offrir la maintenance) → je génère la proposition.`,
    ].join('\n'), kb);
  } catch (err) {
    const stage = err instanceof GateError ? err.stage : 'exception';
    db.markRunFailed(runId, stage, err.message);
    const restored = db.rollbackLead(leadId, runId);
    await alert(`❌ W2 échec *${stage}* sur ${leadId}\n\`${String(err.message || 'raison non précisée').slice(0, 300)}\`\n${restored ? '↩️ lead restauré à son état précédent' : '⚠️ lead possédé par un autre run, non touché'}`);
  }
}

/* ── Gates : contrôles de qualité NON bloquants. Ils retournent des avertissements
   (jamais d'exception) — le run produit toujours ses 3 prompts, on signale les faiblesses. ── */
export { GateError };

// Vérifie que chaque univers DA a ses champs clés et que les 3 ambiances sont distinctes.
export function structureGate(directions, dossier) {
  const warnings = [], ambiances = new Set();
  directions.forEach((d, i) => {
    const id = d.direction_id || `D${i + 1}`;
    if (!d.nom) warnings.push(`${id}_nom_manquant`);
    if (!d.philosophie) warnings.push(`${id}_philosophie_manquante`);
    if (!d.palette || !d.palette.primaire) warnings.push(`${id}_palette_manquante`);
    ambiances.add(String(d.ambiance || '').toLowerCase().trim());
  });
  if (ambiances.size < 3) warnings.push('ambiances_peu_distinctes');
  return warnings;
}

const EMDASH = /[—–]/g;
const AI_PATTERNS = [/\bIA\b/i, /intelligence artificielle/i, /chatgpt/i, /\bgpt-?\d/i, /\bclaude\b/i, /anthropic/i, /openai/i, /\bLLM\b/i];
// Tournures d'IA reconnaissables (FR + EN) : signalées en avertissement, jamais bloquantes.
const AI_TELLS = [/\bseamless\b/i, /sans couture/i, /sublimer/i, /élever votre/i, /elever votre/i, /révolutionn/i, /revolutionn/i, /propulser votre/i, /n'hésitez pas/i, /n'hesitez pas/i, /dans un monde où/i, /dans un monde ou/i, /elevate your/i];
// Corrige les tirets cadratins EN PLACE (remplace par ", ") et signale les mentions/tells d'IA, sur les
// univers visuels DA (texte JSON, pas le HTML — voir lintHtml plus bas pour le HTML du Dev).
export function lintGate(directions) {
  const FIELDS = ['nom', 'philosophie', 'style_layout', 'ambiance'];
  const LIST_FIELDS = ['framer_inspirations', 'regles_css', 'interdits'];
  const warnings = [];
  directions.forEach((d, i) => {
    const id = d.direction_id || `D${i + 1}`;
    FIELDS.forEach((f) => {
      if (d[f] == null) return;
      let v = String(d[f]);
      if (EMDASH.test(v)) { v = v.replace(EMDASH, ', '); d[f] = v; }
      if (AI_PATTERNS.some((p) => p.test(v))) warnings.push(`${id}_${f}_mention_ia`);
      if (AI_TELLS.some((p) => p.test(v))) warnings.push(`${id}_${f}_tell_ia`);
    });
    LIST_FIELDS.forEach((f) => {
      if (Array.isArray(d[f])) d[f] = d[f].map((item) => String(item).replace(EMDASH, ', '));
    });
    if (d.polices) ['titres', 'corps'].forEach((k) => { if (d.polices[k]) d.polices[k] = String(d.polices[k]).replace(EMDASH, ', '); });
  });
  return warnings;
}

// Extrait le HTML et la note NOTE_DEV depuis la réponse brute du Lead Developer (GLM). Lève
// GateError si <!DOCTYPE>/</html> sont introuvables, au lieu de renvoyer du HTML tronqué/invalide
// à Puppeteer (contrairement au brouillon initial qui ignorait ce cas silencieusement).
export function extractHtmlAndNote(raw, directionId = '?') {
  let html = String(raw || '').trim().replace(/^```html?\s*/i, '').replace(/```\s*$/i, '');
  let devNote = 'Pas de note laissée.';
  const noteMatch = html.match(/<!--\s*NOTE_DEV:\s*(.*?)\s*-->/i);
  if (noteMatch) devNote = noteMatch[1];
  const docStart = html.search(/<!DOCTYPE/i);
  const htmlEnd = html.search(/<\/html>/i);
  if (docStart < 0 || htmlEnd < 0) throw new GateError('dev_html', `${directionId}: HTML invalide (DOCTYPE/</html> introuvable)`);
  html = html.slice(docStart, htmlEnd + '</html>'.length);
  return { html, devNote };
}

// Scrub tirets cadratins + détecte mentions IA dans le HTML généré par le Dev (jamais bloquant).
// ponytail: regex globale sur tout le HTML — accepté car "zéro JS custom" imposé au Dev, donc pas
// de faux positif probable dans un <script>/attribut ; à affiner seulement si un cas réel apparaît.
export function lintHtml(html) {
  const out = String(html || '').replace(EMDASH, ', ');
  const warnings = [];
  if (AI_PATTERNS.some((p) => p.test(out))) warnings.push('html_mention_ia');
  if (AI_TELLS.some((p) => p.test(out))) warnings.push('html_tell_ia');
  return { html: out, warnings };
}

export function diversiteGate(critic) {
  const MIN_ANCHOR = 7, MIN_FIDELITY = 7, MIN_CREDIBILITY = 6, MAX_PAIR = 4;
  const dirs = critic.directions || [], pairs = critic.pairwise_similarity || [], warnings = [];
  dirs.forEach((d) => {
    if ((d.sector_anchor_score || 0) < MIN_ANCHOR) warnings.push(`${d.direction_id}_ancrage_faible`);
    if ((d.source_fidelity_score || 0) < MIN_FIDELITY) warnings.push(`${d.direction_id}_fidelite_faible`);
    if ((d.credibility_score || 0) < MIN_CREDIBILITY) warnings.push(`${d.direction_id}_credibilite_faible`);
  });
  pairs.forEach((p) => { if ((p.score || 0) > MAX_PAIR) warnings.push(`${(p.pair || []).join('/')}_proches`); });
  const verdict = critic.overall_verdict || (dirs.length ? 'review' : 'fail');
  return { verdict, warnings };
}
