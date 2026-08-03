# Pipeline commercial 4Dayvelopment

Remplace les workflows n8n internes (lead → briefs → proposition PDF → brief technique),
piloté depuis Telegram. Process Node unique, SQLite source de vérité, worker sérialisé.
**La classe entière de bugs de concurrence (leads bloqués, doublons, races) est éliminée par
construction** : chaque transition d'état est un compare-and-swap atomique SQLite.

## Pourquoi c'est fiable

| Bug n8n | Correction |
|---|---|
| Leads bloqués / état incohérent | CAS atomique (`db.acquireLead`) + `/debloquer` + scan au démarrage |
| Échecs silencieux | `try/catch` par étape + handlers globaux → alerte Telegram |
| Doublons / runs concurrents | verrou `active_run_id` atomique, un seul run en vol par lead |
| Boutons capricieux | process persistant + `answerCallbackQuery` instantané (fini l'ack 8 s) |

## Installation (VPS Hostinger, à côté de n8n)

```bash
cd pipeline
npm install
cp .env.example .env      # puis remplir les secrets
node index.js             # ou pm2 (ci-dessous)
```

### Secrets (`.env`)
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` (1436812162), `PIPELINE_INTAKE_TOKEN`,
`ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, `PDFSHIFT_API_KEY`,
`MAIL_USER`/`MAIL_PASS`. Voir `.env.example`.

### Lancement permanent (pm2)
```bash
pm2 start index.js --name 4dv-pipeline
pm2 save && pm2 startup
```

### Brancher le site
Le site (`server.js`) émet le lead vers ce service. Définir côté site :
```
PIPELINE_INTAKE_URL=https://<host-vps>/intake     # exposer le port 4100 via le reverse-proxy du VPS
PIPELINE_INTAKE_TOKEN=<le même que côté pipeline>
```
Tant que `PIPELINE_INTAKE_URL` n'est pas défini, le site continue d'appeler n8n (`N8N_WEBHOOK_URL`).
Le buffer `data/leads.json` + `scripts/replay-leads.js` garantit zéro lead perdu pendant la bascule.

## Utilisation Telegram

**Flux** : nouveau lead → notif + bouton **GO** → W2 génère 3 directions et **envoie les 3 prompts
design par email** (à coller dans Claude Design pour construire les maquettes) → bouton **Régénérer**
si les prompts sont mauvais → après le call : `/prop LEAD-xxx <1-3> <prix> [M]` → aperçu de la
proposition commerciale en PDF (**CONFIRM**/**CANCEL**) → PDF envoyé au prospect → **SIGNE** → brief
technique.

Aucune maquette de site n'est générée automatiquement : W2 produit des prompts, pas du HTML. Seule la
proposition commerciale (document business) est générée en PDF, à la validation.

**Commandes** : `/leads` `/status LEAD-xxx` `/debloquer LEAD-xxx` `/relancer LEAD-xxx`
`/annuler LEAD-xxx` `/modifier LEAD-xxx <champ> <valeur>` `/diag LEAD-xxx` `/brief LEAD-xxx`
`/prop LEAD-xxx <1-3> <prix> [M]`.

## Tests
```bash
npm test    # concurrence (CAS) + gates W2 (structure/lint/diversité/evidence)
```
