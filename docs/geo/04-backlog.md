# 04. Backlog GEO et design de la phase 3

## Partie 1 : design de la phase 3 (correctifs techniques)

Périmètre strict fixé par la mission et les arbitrages du 23 septembre 2026. Aucune copy, aucun claim ni aucun prix n'est modifié. Deux exceptions encadrées :
- l'ajout de la date « Mis à jour le » ;
- l'alignement de `llms.txt` sur ce que la production affiche déjà (arbitrage 4).

### 1. robots.txt

- **Quoi** : un seul groupe qui nomme explicitement `*` et les robots de recherche, de lecture à la demande et d'entraînement. Au total : Googlebot, Google-Extended, Bingbot, Applebot, Applebot-Extended, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, MistralAI-User et CCBot. Règles : `Allow: /` et `Disallow: /api/`. Le `Sitemap` sort du groupe et `Disallow: /data/` disparaît (ce chemin n'est pas servi).
- **Pourquoi** : l'état actuel autorise déjà tout, mais implicitement, avec un `Disallow` placé après le `Sitemap`. Nommer les robots rend l'intention vérifiable, et un robot nommé n'applique que son groupe.
- **Fichier** : `public/robots.txt`.

### 2. Sitemap aux lastmod réels et date visible

- **Quoi** :
  - Chaque page clé porte `<p class="maj">Mis à jour le <time datetime="AAAA-MM-JJ">…</time></p>`.
  - Le `lastmod` du sitemap et le `dateModified` de l'Article reprennent exactement cette date.
  - La date retenue est celle du dernier commit qui a modifié le **texte visible** de la page (01-audit, 1.2), pas celle des commits de logo ou de CSS.
- **Où** :
  - sous le H1 des 4 pages services, de `/essentiel`, `/portfolio` et `/exemples` ;
  - dans la ligne de métadonnées de l'article prix ;
  - sous l'en-tête des tarifs sur la home.
  - `/devis` (formulaire) et `/blog` (liste) gardent un `lastmod` sans date visible.
- **Règle** : la date visible est la source de vérité. On la change quand le contenu change, puis on reporte la même date dans le sitemap. `npm run check:seo` échoue si elles divergent.
- **Style** : `p.maj` dans `style.css`, avec une taille fluide bornée en rem et la couleur `--muted`, déjà utilisée par `.hero-desc`. `/essentiel` a sa propre feuille : sa règle locale utilise `#888`, parce que son `--muted` (#666) n'atteint pas le contraste 4.5:1.
- **Fichiers** : `public/sitemap.xml`, 9 pages HTML, `public/style.css`.

### 3. IndexNow

- **Quoi** :
  - Clé `365b3bdbbc63f75d8fc720496d6278ef`, servie à la racine dans `public/365b3bdbbc63f75d8fc720496d6278ef.txt`.
  - GitHub Action `.github/workflows/indexnow.yml` : sur un push vers `main` qui touche `public/**` ou `server.js`, elle attend que la prod serve le commit, vérifie la clé, puis poste toutes les URLs du sitemap à `api.indexnow.org`.
- **Détection du déploiement** : nouvelle route `GET /api/version`, qui renvoie `{ commit: RENDER_GIT_COMMIT }`, une variable fournie par Render. L'Action interroge toutes les 30 s pendant 20 min au maximum. Deux pushes rapprochés : `concurrency` annule l'exécution précédente, car Render ne déploie que le dernier commit.
- **Clé** : écrite en clair dans le workflow depuis le 2 octobre 2026. Le protocole la publie à la racine du site : ce n'est pas un secret, et le secret `INDEXNOW_KEY` n'est plus nécessaire.
- **Fichiers** : `public/<clé>.txt`, `.github/workflows/indexnow.yml`, `server.js` (route `/api/version`).

### 4. JSON-LD

| Page | Changement |
|---|---|
| `/` | `contactPoint` (email, page devis, fr/en). `priceSpecification.minPrice` sur les offres à 890 € et 1 990 € (« à partir de »). Offre Maintenance en `UnitPriceSpecification` 80 €/mois. **FAQPage alignée mot pour mot** sur les réponses visibles Q2 (maintenance), Q3 et Q4 |
| services (4) et `/essentiel` | `provider` relié à `https://4dayvelopment.fr/#organization` ; `url` du Service |
| `/essentiel` | BreadcrumbList ajouté |
| article prix | `dateModified` et `article:modified_time` passés à 2026-08-17, date réelle du dernier changement de contenu |

Ce qui n'est pas ajouté, faute de donnée : `founder`, `employee`, `foundingDate`, `legalName`, `telephone`, `sameAs`. Voir la partie 2.

### 5. Contenu modifié côté client

Constat (01-audit, 1.1) : aucun contenu essentiel n'est injecté par JS, à part la version anglaise (hors périmètre, arbitrage 3). En revanche, deux scripts **dégradaient le texte déjà rendu par le serveur** dans le DOM après exécution, c'est-à-dire ce que lit Googlebot :

- `js/modules/duel.js` : le rouleau de prix remplaçait « 890 » par 30 chiffres `<i>` par position.
  - Correctif : le prix reste dans un `span.sr-only` ; les rouleaux sont `aria-hidden` ; chaque chiffre est dessiné en CSS (`.roll i::before { content: attr(data-n) }`) et n'entre plus dans le texte.
  - Rendu visuel identique.
- `js/modules/motion.js` : le découpage des titres retirait les `<br>` sans laisser d'espace (« Les questionsqu'on nous pose »).
  - Correctif : une espace entre deux masques. Ils sont en `display: block`, donc l'espace est invisible.

### 6. llms.txt

Réécrit strictement sur la production :
- site dès 890 € (2 × 445 €), Essentiel 890 € ;
- application dès 1 990 € (2 × 995 €), « livrée à partir de 4 jours » ;
- maintenance 80 €/mois, engagement 12 mois ; WordPress +250 € ;
- paiement 50/50 ou en 2 fois (CGV art. 4).

« Garanti contractuellement » est **conservé** : la CGV contient bien cette phrase (art. 5, « Le délai de livraison est garanti contractuellement »). Il est accompagné de ses conditions de départ, pour ne rien promettre de plus que la CGV. Les démos sont présentées comme des démos.

### 7. Suivi des assistants IA (analytics absent)

- **Quoi** : `ia-log.js`, un middleware Express monté avant les redirections. Il journalise :
  - les visites dont le Referer ou l'`utm_source` vient de chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai ou chat.mistral.ai ;
  - les requêtes des robots OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended, Bingbot et MistralAI-User, avec la route et le code HTTP. Les assets (CSS, JS, images, polices) sont ignorés.
  - Jamais d'IP, de cookie, de query string ni d'UA de visiteur humain. Événement : `{ ts, type, agent, path, status }`.
- **Stockage choisi** : webhook n8n vers Google Sheets. Pourquoi c'est le plus simple compatible avec Render :
  - le disque de Render est éphémère et ses logs sont trop courts ;
  - un disque persistant impose une offre payante ;
  - n8n tourne déjà (`n8n.flaynn.tech`), et la feuille sert aussi au suivi des prompts (02-strategie, 2.5).
- **Envoi** : par lots toutes les 5 min, ou dès 50 événements, et au `SIGTERM` que Render envoie à chaque déploiement. En cas d'échec, le lot est remis en file, dans la limite de 2 000 événements. Sans `IA_LOG_WEBHOOK_URL`, le journal pino reste la seule trace.
- **Export hebdo** : `node scripts/export-ia.js` lit le CSV de la feuille (URL `gviz` ou fichier téléchargé). Il produit un récapitulatif markdown sur 7 jours glissants : visites par source, pages d'arrivée, passages de robots par code HTTP, pages lues.
- **Mise en place côté Sirven** :
  1. Créer une feuille Google avec un onglet `evenements` et les colonnes `ts`, `type`, `agent`, `path`, `status`.
  2. Dans n8n, créer un workflow en trois nœuds :
     - Webhook POST, avec « Header Auth » sur `x-ia-log-token` ;
     - Split Out sur le champ `events` ;
     - Google Sheets « Append row ».

     Puis l'activer.
  3. Sur Render, définir `IA_LOG_WEBHOOK_URL` (l'URL de **production** du webhook) et `IA_LOG_TOKEN`.
  4. Pour l'export par URL : partager la feuille en lecture « toute personne disposant du lien ». Elle ne contient ni IP ni donnée personnelle. `IA_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=evenements`.
- **Fichiers** : `ia-log.js`, `server.js`, `scripts/export-ia.js`, `test/ia-log.test.js`, `.env.example`.

### 8. Contrôles

- `npm test` : classification du suivi IA (robots, sources, faux positifs, assets) et agrégat de l'export.
- `npm run check:seo` (`scripts/check-seo.js`) :
  - JSON-LD valide ;
  - pas de `Review` ni d'`AggregateRating` ;
  - FAQPage présente dans le texte visible ;
  - prix des `Offer` affichés ;
  - date visible = `lastmod` = `dateModified`.
- Vérification `curl` avec les UA de robots sur un serveur local : codes HTTP, `robots.txt`, fichier de clé, `/api/version`, journal `Suivi IA`.
- JSON-LD passé au validateur schema.org.
- Rendu du duel et des dates vérifié à 320, 390 et 1440 px.

Résultats au 23 septembre 2026 :

| Contrôle | Résultat |
|---|---|
| `npm test` | 4 tests, 4 réussis |
| `npm run check:seo` | OK |
| Validateur schema.org | 0 erreur, 0 avertissement sur les 9 pages modifiées (home, essentiel, 4 services, article, portfolio, exemples) |
| `curl` local, 6 UA de robots IA × 5 routes | 200 sur les pages et `robots.txt`, 301 sur `/index.html` ; 30 passages journalisés, le CSS ignoré |
| Visites envoyées par un assistant | `Referer: chatgpt.com` et `?utm_source=perplexity.ai` journalisées ; `Referer: google.com` ignorée |
| Envoi au webhook | lot de 32 événements reçu au SIGTERM, avec l'en-tête `x-ia-log-token` |
| `/api/version`, fichier de clé IndexNow, `llms.txt` | `{"commit":"abc123"}`, clé servie telle quelle, `text/plain; charset=utf-8` |
| DOM rendu après JS | `.duel-digits` lit « 890 » et « 1 990 » (au lieu de 30 chiffres par position) ; titre FAQ : « Les questions qu'on nous pose souvent » ; aucune erreur console |
| Visuel | prix du duel identique au pixel près à la prod à 320, 390 et 1440 px ; date lisible sous les H1 et sous l'en-tête des tarifs ; aucun nouveau débordement (les débordements à 320 px des pages services existent déjà en prod, voir #42) |

Non vérifiés dans ce lot : l'exécution réelle de la GitHub Action (elle nécessite le merge et le secret) et le rendu du workflow n8n (il nécessite sa création côté Sirven).

### Hors périmètre (volontairement)

- Copy, claims, prix, avis, process : proposés dans 01-audit (1.4, 1.7), pas appliqués.
- Version anglaise : option chiffrée dans 02-strategie.
- IndexNow à la publication d'un article via l'API blog : l'article et son entrée de sitemap sont perdus au redéploiement suivant (disque éphémère). Il faut régler le stockage avant.

---

## Partie 2 : backlog

- **Impact** : effet attendu sur la probabilité d'être cité ou recommandé.
- **Effort** : en jours-personne.
- **Owner** : Sirven (décision, données, comptes), Dev (code), Associés (contenu signé), Propriétaire du dépôt (secrets GitHub).

### P0 : conformité, cohérence, activation de la phase 3

| # | Action | Impact estimé | Effort | Owner | Dépendance |
|---|---|---|---|---|---|
| 1 | Remplir les mentions légales (raison sociale, adresse, SIREN, téléphone, hébergeur) | Fort : confiance, entité, obligation LCEN | 0,5 | Sirven | données légales `[À FOURNIR PAR SIRVEN]` |
| 2 | Trancher les garanties absentes de la CGV : « ou c'est gratuit » (H1 animé, cartes, site-vitrine, restaurant et sa FAQPage), « satisfait ou remboursé 14 jours » (home, essentiel, blog, locales). Retirer ou contractualiser | Fort : risque juridique, cohérence | 0,5 | Sirven | validation juridique |
| 3 | Avis : retirer « Flaynn » (projet de l'équipe) ; ne garder Haykel et EMON qu'avec un texte écrit ou validé par écrit par le client, sinon les retirer | Fort : risque L121-2, crédibilité | 0,5 | Sirven | réponses des clients |
| 4 | Retirer ou prouver « 100 % de clients satisfaits », « 17+ projets », « 24/7 », « première page de Google », les statistiques non sourcées | Moyen | 0,5 | Sirven, puis Dev | aucune |
| 5 | Unifier le process 4 jours, la définition de la maintenance, le délai de réponse (24 h contre 2 h), le périmètre à 890 € (Essentiel contre Vitrine), la mention HT ou TTC, « jamais de template » contre WordPress | Fort : c'est ce que les moteurs comparent | 1 | Sirven décide, Dev applique | aucune |
| 6 | Graphie et coordonnées : cartes QR et vCard (`4Dayvelopment`, `contact@4dayvelopment.com`), og-image (« 4 dayvelopment », « livre ») | Moyen | 0,5 | Dev | aucune |
| 7 | Locales : retirer « Satisfait ou remboursé 14j » / « Money-back guarantee » (réaffichés après un changement de langue) et « espace client » | Moyen | 0,1 | Dev | #2 |
| 8 | Vérifier le domaine dans Google Search Console et Bing Webmaster Tools (TXT chez Hostinger), soumettre le sitemap, importer GSC dans BWT | Fort : Bing alimente ChatGPT et Copilot | 0,5 | Sirven | accès DNS |
| 9 | ~~Créer le secret `INDEXNOW_KEY`~~ : plus nécessaire, la clé publique est dans le workflow (2 octobre 2026) | Fort | 0 | aucun | aucune |
| 10 | Brancher le suivi IA : feuille, workflow n8n en 3 nœuds, variables Render | Moyen : mesure | 0,5 | Sirven | n8n, Render |
| 11 | Maillage : lier `/essentiel`, `/services/site-internet-restaurant` et `/exemples` (aucun lien entrant), et l'article prix depuis la home et les services | Moyen | 0,5 | Dev | aucune |

### P1 : pages qui méritent d'être citées

| # | Action | Impact estimé | Effort | Owner | Dépendance |
|---|---|---|---|---|---|
| 12 | Page `/agence` : trois associés, rôles, LinkedIn, `Person` relié à `Organization` (`founder`, `employee`), données légales ; Flaynn et sirven.dev présentés comme projets internes | Fort : requêtes de marque, fiabilité | 1 | Associés + Dev | noms, rôles, profils `[À FOURNIR PAR SIRVEN]` |
| 13 | Page `/methode-4-jours` : déroulé unique aligné sur la CGV, conditions, checklist des contenus | Fort : cœur du positionnement | 1 | Dev + Sirven | #5 |
| 14 | Page `/services/application-web` (MVP, SaaS, PWA, dès 1 990 €) | Fort : 7 prompts sans réponse | 1 | Dev + Associés | liste des projets livrés |
| 15 | Mise à niveau de l'article prix : comparatif Wix / Squarespace / freelance / agence / 4dayvelopment, sources externes, auteur `Person` | Fort : prompts de prix | 1 | Associés | chiffres `[À VÉRIFIER]` |
| 16 | Page `/nos-projets-en-chiffres` : délai réel, Lighthouse mesuré, stack par projet | Fort : donnée originale | 1 + collecte | Associés + Dev | données par projet `[À FOURNIR]` |
| 17 | Page `/services/maintenance` : définition unique, 80 €/mois | Moyen | 0,5 | Dev | #5 |
| 18 | Page `/services/refonte-site` : Wix, WordPress, Squarespace, Lovable, Bolt | Moyen à fort | 1 | Dev + Associés | prix `[À FOURNIR]` |
| 19 | Comparatifs : Wix ou agence, agence traditionnelle, freelance ou agence (en disant quand l'alternative gagne) | Moyen à fort | 1,5 | Associés | #15 |
| 20 | Page `/services/site-wordpress` : option à 250 € | Moyen | 0,5 | Dev | aucune |
| 21 | Pages métiers (plombier, coach sportif, barbier, institut de beauté, électricien IRVE), chacune avec sa démo **présentée comme démo** | Moyen | 2,5 | Dev + Associés | cas réels éventuels |
| 22 | `/exemples` : remplacer « un vrai site complet » par « une démo complète » ; lier chaque démo à sa page métier | Moyen | 0,2 | Dev | #21 |
| 23 | `/services/referencement-seo` : retirer « première page », sourcer ou retirer les chiffres, afficher un prix | Moyen | 0,5 | Dev + Sirven | prix `[À FOURNIR]` |
| 24 | Pages `/services/fiche-google-business-profile`, `/services/automatisation`, `/services/landing-page` | Moyen | 1,5 | Dev + Associés | offres et prix `[À FOURNIR]` |
| 25 | Page `/services/publicite-en-ligne`, seulement si l'offre existe réellement | Faible | 0,5 | Sirven | décision |
| 26 | JSON-LD : auteur `Person` sur l'article et dans `buildArticleHTML` ; `CreativeWork` par réalisation client ; `sameAs` au fil des profils | Moyen | 1 | Dev | #12, profils |
| 27 | Blog : les 11 nouveaux articles de 02-strategie, un par cluster, signés, avec 2 sources minimum | Moyen, cumulatif | 0,5 par article | Associés | #12 |

### P1 : hors site

| # | Action | Impact estimé | Effort | Owner | Dépendance |
|---|---|---|---|---|---|
| 28 | Créer les 12 profils de 03-offsite avec le bloc NAP et la description canonique à l'identique | Fort | 2 | Sirven | #1, #5 |
| 29 | Collecter des avis réels (GBP, Trustpilot, Clutch) après chaque livraison, sans contrepartie | Fort, cumulatif | continu | Sirven | #28 |
| 30 | Crédit « Site réalisé par 4dayvelopment » sur les sites clients, avec leur accord | Moyen | 0,1 par site | Dev | accord client, clause au devis |
| 31 | Listicles et comparatifs cités : collecte, priorisation, message d'approche | Moyen à fort | 2, puis continu | Sirven | #28 |

### P1 : mesure

| # | Action | Impact estimé | Effort | Owner | Dépendance |
|---|---|---|---|---|---|
| 32 | Suivi hebdomadaire manuel des 20 prompts cœur sur les 7 moteurs (02-strategie, 2.5) | Mesure | 1 h par semaine | Sirven | aucune |
| 33 | Workflow n8n de suivi des prompts par API (spécifié en 2.5) | Mesure | 1,5 | Dev | clés API |
| 34 | Export hebdomadaire du suivi IA (`scripts/export-ia.js`) collé dans le suivi | Mesure | 10 min par semaine | Sirven | #10 |

### P2 : technique

| # | Action | Impact estimé | Effort | Owner | Dépendance |
|---|---|---|---|---|---|
| 35 | Perf de la home : TBT 1 360 ms (`gl-bg.js`, `preloader.js`, `soul.js`), images des démos chargées d'office (732 KiB). Budget de la charte non tenu | Moyen | 1 à 2 | Dev | charte qualité |
| 36 | Blog API : articles et sitemap perdus au redéploiement (disque éphémère). Stocker hors disque ou committer, puis pinguer IndexNow à la publication | Moyen | 1 | Dev | choix du stockage |
| 37 | `/essentiel` : ajouter `<main>` et remplacer les puces emoji par du texte | Faible | 0,2 | Dev | aucune |
| 38 | Contrastes du footer (Lighthouse `color-contrast` sur 5 pages), `heading-order` de l'article | Faible | 0,3 | Dev | aucune |
| 39 | Version anglaise en routes `/en` rendues côté serveur, avec hreflang | Faible à moyen | 3 à 5 | Dev | locales corrigées (#7) |
| 40 | `http://www` en un seul saut de redirection | Faible | 0,1 | Sirven | réglage côté Render `[À VÉRIFIER]` |
| 41 | Supprimer les tirets longs et emoji restants du contenu (home, essentiel, devis, locales, pieds de page des démos) | Faible | 0,3 | Dev | aucune |
| 42 | Débordement à 320 px, déjà présent en prod : H1 coupé sur les 4 pages services, et `/exemples` qui dépasse de 4 à 12 px (01-audit, 1.9) | Moyen : lisibilité mobile, charte | 0,5 | Dev | charte qualité |
