// Appels LLM/PDF en fetch brut contre les mêmes endpoints que n8n.
// Différence clé vs n8n : ici on JETTE sur erreur HTTP au lieu de l'avaler
// (onError:continueRegularOutput) — c'est le correctif des échecs silencieux.

import { config, require_ } from './config.js';

async function post(url, { headers, body, timeoutMs, key }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch((e) => { throw new Error(`${key}: réseau/timeout — ${e.message}`); });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`${key}: HTTP ${res.status} — ${detail.slice(0, 300)}`);
  }
  return res.json();
}

// Modèles Claude routés via OpenRouter (une seule clé pour tout). Map ID direct → slug OpenRouter.
const OR_CLAUDE = {
  'claude-sonnet-5': 'anthropic/claude-sonnet-5',
  'claude-opus-4-8': 'anthropic/claude-opus-4.8',
};

/** Claude via OpenRouter (OpenAI-compat) → { text, usage } */
export async function anthropic(payload, { timeoutMs = 300000 } = {}) {
  const { model, thinking, output_config, ...rest } = payload; // champs propres à Anthropic retirés
  const slug = OR_CLAUDE[model] || `anthropic/${model}`;
  const json = await post('https://openrouter.ai/api/v1/chat/completions', {
    key: 'openrouter-claude',
    timeoutMs,
    headers: { authorization: `Bearer ${require_('openrouterKey')}` },
    body: { model: slug, ...rest },
  });
  const content = json?.choices?.[0]?.message?.content ?? '';
  return { text: content, usage: json.usage || null };
}

/** OpenAI-compat (Perplexity / OpenRouter) → { content, usage } */
async function openaiCompat(url, key, payload, timeoutMs) {
  const json = await post(url, {
    key,
    timeoutMs,
    headers: { authorization: `Bearer ${key === 'perplexity' ? require_('perplexityKey') : require_('openrouterKey')}` },
    body: payload,
  });
  const content = json?.choices?.[0]?.message?.content ?? '';
  return { content, usage: json.usage || null };
}

export const perplexity = (payload, o = {}) =>
  openaiCompat('https://api.perplexity.ai/chat/completions', 'perplexity', payload, o.timeoutMs ?? 60000);

export const openrouter = (payload, o = {}) =>
  openaiCompat('https://openrouter.ai/api/v1/chat/completions', 'openrouter', payload, o.timeoutMs ?? 120000);

/* ── Estimation de coût (repris du Budget Check n8n) ── */
const USD_EUR = 0.92;
const PRICE = { // $/Mtoken [input, output]
  'sonar-pro': [3, 15],
  'openai/gpt-5.6-terra-pro': [2, 8],
  'claude-sonnet-5': [3, 15],
  'claude-opus-4-8': [5, 25],
};

// Modèle facturé pour un appel donné (clé de journalisation → modèle réel), pour l'estimation de coût.
export function modelForCall(call) {
  if (call.includes('perplexity')) return 'sonar-pro';
  if (call.includes('openrouter')) return 'openai/gpt-5.6-terra-pro';
  if (call.includes('opus')) return 'claude-opus-4-8';
  return 'claude-sonnet-5'; // dossier + autres appels anthropic
}

export function costEur(model, usage) {
  if (!usage) return { eur: 0, known: false };
  const p = PRICE[model] || [0, 0];
  const inTok = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const outTok = usage.completion_tokens ?? usage.output_tokens ?? 0;
  if (!inTok && !outTok) return { eur: 0, known: false };
  const usd = (inTok / 1e6) * p[0] + (outTok / 1e6) * p[1];
  return { eur: usd * USD_EUR, known: true };
}

/* ── PDFShift (header X-API-Key) → Buffer PDF. Params repris de W3 n8n (A4, print CSS). ── */
export async function pdfshift(html) {
  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-API-Key': require_('pdfshiftKey') },
    body: JSON.stringify({ source: html, landscape: false, use_print: true, format: 'A4', margin: '20px 24px' }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`pdfshift: HTTP ${res.status} — ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}
