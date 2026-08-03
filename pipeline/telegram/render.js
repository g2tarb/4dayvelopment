// Helpers de rendu Telegram. Grammaire callback conservée : [ARTD]|leadShort|runShort.

import { leadShort, runShort } from '../config.js';

export const cb = (action, leadId, runId) => `${action}|${leadShort(leadId)}|${runShort(runId)}`;

// Escape Markdown (legacy) pour les valeurs libres insérées dans un message parse_mode:Markdown.
export const esc = (s) => String(s ?? '').replace(/([*_`[])/g, '\\$1');
