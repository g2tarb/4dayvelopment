#!/usr/bin/env node
/**
 * Rejoue les leads stockés localement vers le webhook N8n.
 *
 * À lancer sur le serveur où se trouve data/leads.json :
 *   node scripts/replay-leads.js          → envoie les leads pas encore transmis
 *   node scripts/replay-leads.js --all    → renvoie TOUS les leads (même déjà transmis)
 *   node scripts/replay-leads.js --dry     → simule sans rien envoyer
 *
 * Chaque lead envoyé avec succès est marqué `n8nSentAt` dans leads.json,
 * pour qu'un nouvel appel ne crée pas de doublons.
 */

require('dotenv').config();

const fs   = require('fs');
const path = require('path');

const LEADS_FILE = path.join(__dirname, '..', 'data', 'leads.json');
const WEBHOOK    = process.env.N8N_WEBHOOK_URL;

const ALL = process.argv.includes('--all');
const DRY = process.argv.includes('--dry');

async function main() {
  if (!WEBHOOK) {
    console.error('✖ N8N_WEBHOOK_URL non défini dans .env — rien à faire.');
    process.exit(1);
  }
  if (!fs.existsSync(LEADS_FILE)) {
    console.error(`✖ Fichier introuvable : ${LEADS_FILE}`);
    process.exit(1);
  }

  const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));
  const pending = ALL ? leads : leads.filter(l => !l.n8nSentAt);

  console.log(`→ ${leads.length} lead(s) au total, ${pending.length} à envoyer vers N8n.`);
  if (DRY) console.log('  (mode --dry : aucune requête réelle)\n');

  let ok = 0, fail = 0;

  for (const lead of pending) {
    const label = `${lead.prenom || '?'} <${lead.email || '?'}> (${lead.receivedAt || 'date inconnue'})`;

    if (DRY) {
      console.log(`  ◦ [dry] ${label}`);
      continue;
    }

    try {
      const res = await fetch(WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(lead),
      });
      if (res.ok) {
        lead.n8nSentAt = new Date().toISOString();
        ok++;
        console.log(`  ✓ ${label} → HTTP ${res.status}`);
      } else {
        fail++;
        console.log(`  ✖ ${label} → HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      fail++;
      console.log(`  ✖ ${label} → erreur réseau : ${err.message}`);
    }
  }

  if (!DRY) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  }

  console.log(`\nTerminé : ${ok} envoyé(s), ${fail} en échec.`);
  if (fail > 0) process.exit(1);
}

main();
