// Helpers de rendu Telegram. Grammaire callback conservée : [ARTD]|leadShort|runShort[|extra].

import { leadShort, runShort } from '../config.js';

// `extra` optionnel (ex: numéro de direction pour CH) ajouté en 4e segment, sans casser les appels existants.
export const cb = (action, leadId, runId, extra) =>
  `${action}|${leadShort(leadId)}|${runShort(runId)}${extra != null ? `|${extra}` : ''}`;

// Escape Markdown (legacy) pour les valeurs libres insérées dans un message parse_mode:Markdown.
export const esc = (s) => String(s ?? '').replace(/([*_`[])/g, '\\$1');
