#!/usr/bin/env node
/* Export hebdomadaire du suivi IA (voir ia-log.js et docs/geo/04-backlog.md).
 *
 * Source : la feuille Google alimentée par le webhook n8n, colonnes
 * ts,type,agent,path,status. On lit son export CSV :
 *   IA_SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=evenements" node scripts/export-ia.js
 * ou un fichier téléchargé :
 *   node scripts/export-ia.js evenements.csv [--depuis=2026-09-01]
 * Sortie : un récapitulatif markdown sur 7 jours glissants, à coller dans le
 * suivi hebdomadaire de docs/geo/02-strategie.md (section 2.5). */

const fs = require('fs');

// ponytail: parseur CSV minimal (guillemets doublés, virgules citées), suffit
// pour l'export Google Sheets ; les retours à la ligne dans un champ ne sont
// pas gérés, aucun champ du suivi n'en contient.
function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map(line => {
    const cells = [];
    let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted && c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = !quoted;
      else if (c === ',' && !quoted) { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    return cells;
  });
  const head = rows.shift().map(h => h.trim().toLowerCase());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}

function count(list, key) {
  const m = new Map();
  for (const e of list) m.set(key(e), (m.get(key(e)) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

function aggregate(events, since) {
  const recent = events.filter(e => new Date(e.ts) >= since);
  const referrals = recent.filter(e => e.type === 'referral');
  const bots = recent.filter(e => e.type === 'bot');
  return {
    total: recent.length,
    referralsByAgent: count(referrals, e => e.agent),
    referralsByPath: count(referrals, e => e.path).slice(0, 10),
    botsByAgentStatus: count(bots, e => `${e.agent} | ${e.status}`),
    botsByPath: count(bots, e => e.path).slice(0, 10),
  };
}

function toMarkdown(agg, since) {
  const table = (title, cols, rows) => [
    `### ${title}`, '',
    `| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`,
    ...(rows.length ? rows.map(([k, n]) => `| ${k} | ${n} |`) : [`| aucun | 0 |`]), '',
  ].join('\n');
  return [
    `## Suivi IA depuis le ${since.toISOString().slice(0, 10)} (${agg.total} événements)`, '',
    table('Visites envoyées par un assistant IA', ['Source', 'Visites'], agg.referralsByAgent),
    table('Pages d\'arrivée depuis un assistant IA', ['Page', 'Visites'], agg.referralsByPath),
    table('Passages des robots IA', ['Robot | HTTP', 'Requêtes'], agg.botsByAgentStatus),
    table('Pages lues par les robots IA', ['Page', 'Requêtes'], agg.botsByPath),
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const depuis = (args.find(a => a.startsWith('--depuis=')) || '').split('=')[1];
  const file = args.find(a => !a.startsWith('--'));
  const since = depuis ? new Date(depuis) : new Date(Date.now() - 7 * 24 * 3600 * 1000);

  let text;
  if (file) text = fs.readFileSync(file, 'utf8');
  else if (process.env.IA_SHEET_CSV_URL) {
    const res = await fetch(process.env.IA_SHEET_CSV_URL);
    if (!res.ok) throw new Error('Lecture de la feuille impossible : HTTP ' + res.status);
    text = await res.text();
  } else {
    console.error('Usage : node scripts/export-ia.js <fichier.csv> [--depuis=AAAA-MM-JJ], ou IA_SHEET_CSV_URL=<url csv>');
    process.exit(1);
  }
  console.log(toMarkdown(aggregate(parseCsv(text), since), since));
}

if (require.main === module) main().catch(err => { console.error(err.message); process.exit(1); });

module.exports = { parseCsv, aggregate, toMarkdown };
