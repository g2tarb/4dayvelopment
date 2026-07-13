// W2 — génération des 3 directions créatives. Port fidèle de la chaîne n8n :
// route → verrou (CAS) → recherche (Perplexity×2 + OpenRouter) → dossier (Haiku + preuve)
// → budget → génération (Opus) → gates parse/structure/lint → critique (OpenRouter) → QC.
// Tout échec (exception LLM ou gate) → rollback atomique + alerte. Plus de mort silencieuse.

import { InlineKeyboard } from 'grammy';
import * as db from '../db.js';
import { newRunId, leadShort } from '../config.js';
import { anthropic, perplexity, openrouter, costEur, modelForCall } from '../llm.js';
import { bot, alert } from '../telegram/bot.js';
import { config } from '../config.js';
import { sendDesignPromptsEmail } from '../email.js';
import { cb } from '../telegram/render.js';

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

export function validateDossier(dossier, corpus, sectorNormalized) {
  const EVIDENCE_MATCH_MIN = 0.6, MIN_TERRITORIES = 3;
  const terrs = Array.isArray(dossier.territories) ? dossier.territories : [];
  const reasons = [], seenUrl = new Set(), seenName = new Set(), validated = [];
  terrs.forEach((t, i) => {
    const id = t.territory_id || `T${i + 1}`;
    if (!t.source_url) return reasons.push(`${id}_missing_source_url`);
    if (!t.evidence_excerpt || String(t.evidence_excerpt).trim().length < 12) return reasons.push(`${id}_missing_evidence`);
    if (!t.name) return reasons.push(`${id}_missing_name`);
    if (!t.why_relevant) return reasons.push(`${id}_missing_why_relevant`);
    const url = String(t.source_url).toLowerCase().replace(/\/$/, ''), nm = norm(t.name);
    if (seenUrl.has(url)) return reasons.push(`${id}_dup_url`);
    if (seenName.has(nm)) return reasons.push(`${id}_dup_name`);
    if (overlap(t.evidence_excerpt, corpus) < EVIDENCE_MATCH_MIN) return reasons.push(`${id}_evidence_not_found`);
    seenUrl.add(url); seenName.add(nm); validated.push({ ...t, territory_id: id });
  });
  if (!sectorNormalized) reasons.push('sector_relevance_insufficient');
  const valid = validated.length >= MIN_TERRITORIES && reasons.length === 0;
  return { valid, reasons, territories: valid ? validated.slice(0, 5) : validated };
}

const parseJson = (raw) => { const s = String(raw || ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); try { return JSON.parse(a >= 0 && b > a ? s.slice(a, b + 1) : s); } catch { return {}; } };

/* ── Orchestrateur ── */
export async function runW2({ leadId, mode = 'normal', force = false, parentRunId = null }) {
  const runId = newRunId();
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
  const acc = (call, usage) => { usageAcc.push({ call, usage }); };
  const partialEur = () => Math.round(usageAcc.reduce((s, u) => s + costEur(modelForCall(u.call), u.usage).eur, 0) * 100) / 100;

  try {
    const secteur = String(lead.secteur || '').slice(0, 400);
    const message = String(lead.message || '').slice(0, 800);
    const resume = String(lead.resume_ia || '');

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
    const dv = validateDossier(dossier, researchRaw, sectorNormalized);
    if (!dv.valid) throw new GateError('dossier', dv.reasons.join(','));
    dossier.territories = dv.territories;
    db.updateRun(runId, { research_dossier_json: JSON.stringify(dossier) });

    /* Mode diagnostic : on s'arrête après le dossier et on rend un rapport. */
    if (mode === 'diag') {
      db.updateRun(runId, { status: 'diagnostic', cost_estimated: partialEur(), completed_at: db.now() });
      const lines = dv.territories.map((t, i) => `${i + 1}. *${t.name}* — ${t.why_relevant}\n${t.source_url}`);
      return send([`🔍 *Diagnostic ${leadId}*`, `Secteur normalisé: ${sectorNormalized || 'n/a'}`, '', ...lines, '', `💶 ~${partialEur()} EUR`].join('\n'));
    }

    /* 5. Budget (avant Opus) */
    const OPUS_PROJ = (12000 / 1e6) * 5 + (16000 / 1e6) * 25; // $ projetés Opus
    const projectedEur = usageAcc.reduce((s, u) => s + costEur(modelForCall(u.call), u.usage).eur, 0) + OPUS_PROJ * 0.92;
    const ageMin = (Date.now() - new Date(lead.created_at).getTime()) / 60000;
    if (projectedEur > 2.0) throw new GateError('budget', `budget_projete_${projectedEur.toFixed(2)}eur`);
    if (ageMin > 20) throw new GateError('duree', `duree_${ageMin.toFixed(1)}min`);

    /* 6. Génération (Anthropic Opus) */
    const schemaOpus = '{"briefs":[{"direction_id":"D1","territory_id":"T1","creative_axis":"axe dominant unique","core_tension":"tension creative ou strategique","concept_name":"nom","concept":"description 2-3 phrases","target_perception":"perception visee","reponse_demande":"comment cette direction repond a CE client","visual_system":{"palette":["couleurs precises"],"typography":["polices"],"layout_principles":["principes"],"motion_principles":["animations"],"imagery_principles":["style images"]},"references":["source reelle 1","2","3"],"structure_page":["section 1","2","3"],"ton_editorial":"ton","prompt_claude_design":"prompt complet autosuffisant pret a coller"}]}';
    const opusPrompt = `Tu es directeur de creation senior dans une agence web premium. Produis 3 directions creatives DISTINCTES et excellentes pour ce prospect.\n\nOBJECTIF ABSOLU: repondre a la demande reelle du client, ancrer chaque direction sur un territoire de reference REEL et distinct du dossier, et donner envie. Chaque direction doit etre credible et desirable.\n\nINVARIANTS (obligatoires):\n- EXACTEMENT 3 directions.\n- Chaque direction utilise un territory_id DIFFERENT present dans le dossier.\n- Les 3 creative_axis sont differents. Les 3 core_tension sont differents.\n- Aucune direction n'est une variante cosmetique d'une autre.\n- N'impose AUCUNE esthetique fixe. La diversite vient du secteur, du lead, des sources et des axes.\n- prompt_claude_design est autosuffisant: objectif business, contexte de marque, audience, architecture de page, hierarchie, direction visuelle, palette et usage, typographies et hierarchie, layout/spacing/interactions, ton editorial, directives d'images et video, sujets de recherche d'assets stock type Unsplash, style visuel des assets, contraintes d'accessibilite, elements interdits, criteres de reussite.\n- INTERDIT dans tout texte produit: le tiret cadratin, et toute mention d'IA dans le site genere.\n\n=== BRIEF CLIENT (brut) ===\nSecteur: ${secteur}\nDemande: ${message}\nResume: ${resume}\nSecteur normalise: ${sectorNormalized}\n\n=== DOSSIER SECTORIEL (territoires prouves) ===\n${JSON.stringify(dossier.territories)}\n\n=== ANALYSE DEMANDE ===\n${JSON.stringify(analyse)}\n\nReponds UNIQUEMENT en JSON valide, sans texte autour, sans fences, structure exacte:\n${schemaOpus}`;
    const gen = await anthropic({ model: 'claude-opus-4-8', max_tokens: 16000, thinking: { type: 'adaptive' }, output_config: { effort: 'high' }, messages: [{ role: 'user', content: opusPrompt }] });
    acc('anthropic_opus_generation', gen.usage);

    /* 7. Parse + gates structure/lint */
    const parsed = parseJson(gen.text);
    const briefs = Array.isArray(parsed.briefs) ? parsed.briefs : [];
    if (briefs.length !== 3) throw new GateError('generation', `briefs_count_${briefs.length}`);
    structureGate(briefs, dossier);
    lintGate(briefs);
    db.updateRun(runId, { briefs_json: JSON.stringify(briefs) });

    /* 8. Critique (OpenRouter) + gate diversité */
    const critBriefs = briefs.map((b) => ({ direction_id: b.direction_id, territory_id: b.territory_id, creative_axis: b.creative_axis, core_tension: b.core_tension, concept_name: b.concept_name, concept: b.concept, visual_system: b.visual_system, references: b.references }));
    const critTerrs = dossier.territories.map((t) => ({ territory_id: t.territory_id, name: t.name, source_url: t.source_url, why_relevant: t.why_relevant }));
    const schemaCrit = '{"directions":[{"direction_id":"D1","sector_anchor_score":0,"source_fidelity_score":0,"distinctiveness_score":0,"credibility_score":0,"one_line_verdict":"..."}],"pairwise_similarity":[{"pair":["D1","D2"],"score":0,"reason":"..."}],"overall_verdict":"pass|review|fail"}';
    const critPrompt = `Tu es un directeur de creation critique et exigeant. Evalue 3 directions creatives pour un site web, notees de 0 a 10.\n\nCriteres par direction: sector_anchor_score (ancrage au secteur normalise: ${sectorNormalized}), source_fidelity_score (fidelite aux territoires de reference fournis), distinctiveness_score (reelle distinction vs les autres), credibility_score (credibilite pro).\nAjoute pairwise_similarity (score 0-10 de similarite entre chaque paire, 0=totalement distinct) et overall_verdict.\n\nReponds UNIQUEMENT en JSON valide, structure exacte:\n${schemaCrit}\n\n=== TERRITOIRES ===\n${JSON.stringify(critTerrs)}\n\n=== DIRECTIONS ===\n${JSON.stringify(critBriefs)}`;
    const critRes = await openrouter({ model: 'openai/gpt-5.6-terra-pro', max_tokens: 1500, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: critPrompt }] });
    acc('openrouter_critique', critRes.usage);
    const critic = parseJson(critRes.content);
    const verdict = diversiteGate(critic); // jette si bloquant, sinon retourne le verdict
    db.updateRun(runId, { scores_json: JSON.stringify(critic), critic_verdict: verdict });

    /* 9. Fin W2 : email des 3 prompts design + déverrouillage (briefs_generes) + notif Telegram */
    if (!db.completeW2(leadId, runId)) throw new GateError('qc_guard', 'lead non possédé en fin de W2');
    const costFinal = partialEur();
    db.updateRun(runId, { status: 'approuve', cost_estimated: costFinal, completed_at: db.now() });
    if (parentRunId) db.updateRun(parentRunId, { status: 'remplace', replaced_by_run_id: runId });

    try {
      if (config.operatorEmail) await sendDesignPromptsEmail({ to: config.operatorEmail, leadId, secteur: sectorNormalized, briefs });
    } catch (e) { await alert(`⚠️ Envoi email des prompts échoué (${leadId}) : ${e.message}. Ils restent en base (run ${runId.slice(4)}).`); }

    const warn = verdict === 'review' ? '\n⚠️ Verdict critique: REVIEW, prompts à relire.' : '';
    const kb = new InlineKeyboard().text('🔄 Régénérer', cb('R', leadId, runId));
    await send([
      `✅ *3 prompts design prêts* — ${leadId}`,
      `📊 Secteur: ${sectorNormalized || 'n/a'} · 🧭 Verdict: ${verdict} · 💶 ~${costFinal} EUR`,
      `📧 Envoyés à ${config.operatorEmail || '(email non configuré)'}${warn}`,
      '',
      `Colle-les dans Claude Design, puis \`/prop ${leadId} <1-3> <prix> [M]\` après le call.`,
    ].join('\n'), kb);
  } catch (err) {
    const stage = err instanceof GateError ? err.stage : 'exception';
    db.markRunFailed(runId, stage, err.message);
    const restored = db.rollbackLead(leadId, runId);
    await alert(`❌ W2 échec *${stage}* sur ${leadId}\n\`${String(err.message).slice(0, 300)}\`\n${restored ? '↩️ lead restauré à son état précédent' : '⚠️ lead possédé par un autre run, non touché'}`);
  }
}

/* ── Gates (jettent GateError) ── */
export { GateError };
export function structureGate(briefs, dossier) {
  const ids = new Set((dossier.territories || []).map((t) => t.territory_id));
  const reasons = [], axes = new Set(), tens = new Set(), terr = new Set();
  briefs.forEach((b, i) => {
    const d = b.direction_id || `D${i + 1}`;
    ['creative_axis', 'core_tension', 'concept', 'prompt_claude_design'].forEach((f) => { if (!b[f]) reasons.push(`${d}_missing_${f}`); });
    if (b.territory_id && !ids.has(b.territory_id)) reasons.push(`${d}_territory_not_in_dossier`);
    axes.add(String(b.creative_axis || '').toLowerCase().trim());
    tens.add(String(b.core_tension || '').toLowerCase().trim());
    terr.add(String(b.territory_id || '').trim());
  });
  if (axes.size < 3) reasons.push('axes_not_distinct');
  if (tens.size < 3) reasons.push('tensions_not_distinct');
  if (terr.size < 3) reasons.push('territories_not_distinct');
  if (reasons.length) throw new GateError('structure', reasons.join(','));
}

const EMDASH = /[—–]/;
const AI_PATTERNS = [/\bIA\b/i, /\bAI\b/i, /intelligence artificielle/i, /artificial intelligence/i, /chatgpt/i, /\bgpt-?\d/i, /\bclaude\b/i, /anthropic/i, /openai/i, /\bLLM\b/i];
export function lintGate(briefs) {
  const FIELDS = ['concept_name', 'concept', 'target_perception', 'reponse_demande', 'ton_editorial', 'prompt_claude_design', 'creative_axis', 'core_tension'];
  const reasons = [];
  briefs.forEach((b, i) => {
    const d = b.direction_id || `D${i + 1}`;
    FIELDS.forEach((f) => {
      const v = String(b[f] || '');
      if (EMDASH.test(v)) reasons.push(`${d}_${f}_tiret`);
      if (AI_PATTERNS.some((p) => p.test(v))) reasons.push(`${d}_${f}_mention_ia`);
    });
    const vs = b.visual_system || {};
    ['palette', 'typography', 'layout_principles', 'motion_principles', 'imagery_principles'].forEach((k) => {
      (vs[k] || []).forEach((item) => { if (EMDASH.test(String(item))) reasons.push(`${d}_visual_${k}_tiret`); });
    });
  });
  if (reasons.length) throw new GateError('lint', reasons.join(','));
}

export function diversiteGate(critic) {
  const MIN_ANCHOR = 7, MIN_FIDELITY = 7, MIN_CREDIBILITY = 6, MAX_PAIR = 4;
  const dirs = critic.directions || [], pairs = critic.pairwise_similarity || [], reasons = [];
  dirs.forEach((d) => {
    if ((d.sector_anchor_score || 0) < MIN_ANCHOR) reasons.push(`${d.direction_id}_anchor`);
    if ((d.source_fidelity_score || 0) < MIN_FIDELITY) reasons.push(`${d.direction_id}_fidelity`);
    if ((d.credibility_score || 0) < MIN_CREDIBILITY) reasons.push(`${d.direction_id}_credibility`);
  });
  pairs.forEach((p) => { if ((p.score || 0) > MAX_PAIR) reasons.push(`similar_${(p.pair || []).join('_')}`); });
  const verdict = critic.overall_verdict || (dirs.length ? 'review' : 'fail');
  if (verdict === 'fail' || dirs.length !== 3 || reasons.length) throw new GateError('critique', reasons.join(',') || 'verdict_fail');
  return verdict;
}
