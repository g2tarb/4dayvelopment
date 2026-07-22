// Worker sérialisé : un seul job à la fois. Le bot reste réactif (grammy est async) pendant
// qu'un job tourne. Combiné au CAS de db.js, ça rend les runs concurrents impossibles.
// ponytail: file en mémoire, 1 opérateur / faible volume. Passer à une file persistante
// (better-queue, table SQLite jobs) seulement si le débit l'exige un jour.

import { alert } from './telegram/bot.js';

const jobs = [];
let running = false;

/** @param {{name: string, leadId?: string, run: () => Promise<void>, onError?: (e:Error)=>Promise<void>}} job */
export function enqueue(job) {
  jobs.push(job);
  pump();
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (jobs.length) {
      const job = jobs.shift();
      try {
        await job.run();
      } catch (err) {
        // Filet : le job a le droit de nettoyer son état (rollback CAS) via onError,
        // mais dans tous les cas on alerte — plus jamais de mort silencieuse.
        try { await job.onError?.(err); } catch { /* on n'avale pas l'alerte pour un onError foireux */ }
        await alert(`❌ Échec étape *${job.name}*${job.leadId ? ` (${job.leadId})` : ''}\n\`${String(err.message || err).slice(0, 400)}\``);
      }
    }
  } finally {
    running = false;
  }
}

export const queueDepth = () => jobs.length;
