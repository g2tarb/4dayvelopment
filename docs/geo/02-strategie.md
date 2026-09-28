# 02. Stratégie de visibilité dans les moteurs IA

Objectif : que ChatGPT, Perplexity, Gemini (AI Overviews, AI Mode), Claude, Copilot et Le Chat citent ou recommandent 4dayvelopment quand un prospect cherche un site, une application, un e-commerce ou une automatisation livrés vite, à prix clair.

Positionnement : **l'agence web qui livre en 4 jours ouvrés, à prix fixe affiché.** Chaque service est présenté à travers cette promesse, dans les limites de la CGV (voir 01-audit, 1.7).

Trois leviers :
1. Être la source de vérité la plus claire sur l'entité, en corrigeant les incohérences de 01-audit.
2. Publier des pages qui méritent d'être citées : prix, délais, comparatifs honnêtes, données propres.
3. Outiller l'effort hors site : annuaires, avis réels, listicles (voir 03-offsite).

---

## 2.1 Univers de prompts

72 prompts réalistes, en français, groupés par intention. Colonne « Page » : la page qui doit être LA réponse. Colonne « Existe » : oui, partiel (la page existe mais ne répond pas bien), non.

### A. Catégorie : trouver un prestataire rapide

Intention : choisir un prestataire capable de livrer vite, à prix connu. Page réponse : la home, appuyée par la future page « Méthode 4 jours ».

| # | Prompt | Page | Existe |
|---|---|---|---|
| 1 | agence qui fait des sites internet rapidement | `/` + `/methode-4-jours` | partiel |
| 2 | créer un site vitrine en une semaine | `/services/site-vitrine` | partiel |
| 3 | agence web pas chère Paris | `/` | partiel |
| 4 | freelance ou agence pour mon site | `/comparatif/freelance-ou-agence-web` | non |
| 5 | agence web qui livre un site en quelques jours | `/methode-4-jours` | non |
| 6 | faire un site internet professionnel en moins d'une semaine | `/methode-4-jours` | non |
| 7 | quelle agence web choisir pour une petite entreprise à Paris | `/` | partiel |
| 8 | agence web pour solopreneur | `/` | partiel |
| 9 | création site internet Paris prix fixe | `/` | partiel |
| 10 | site internet clé en main rapide pour indépendant | `/services/site-vitrine` | partiel |
| 11 | qui peut me faire un site internet vite et bien | `/` | partiel |
| 12 | agence web avec des prix affichés | `/` (tarifs) | partiel |

### B. Prix

Intention : estimer un budget avant de contacter qui que ce soit. Page réponse : l'article prix, mis à niveau en page de référence, et les pages offres.

| # | Prompt | Page | Existe |
|---|---|---|---|
| 13 | combien coûte un site vitrine en 2026 | `/blog/combien-coute-site-internet-2026` | partiel (aucune source) |
| 14 | prix d'un site e-commerce pour petite entreprise | `/services/e-commerce` | partiel |
| 15 | prix d'un MVP SaaS | `/services/application-web` | non |
| 16 | combien coûte une application web sur mesure | `/services/application-web` | non |
| 17 | tarif création site internet artisan | article prix | partiel |
| 18 | prix d'un site WordPress fait par une agence | `/services/site-wordpress` | non |
| 19 | combien coûte la maintenance d'un site internet par mois | `/services/maintenance` | non |
| 20 | site internet à moins de 1000 euros, est-ce sérieux | article prix | partiel |
| 21 | qu'est-ce qui fait varier le prix d'un site internet | article prix | oui |
| 22 | prix d'une landing page | `/services/landing-page` | non |

### C. Métiers

Intention : trouver quelqu'un qui connaît déjà son métier. Page réponse : une page métier par démo existante, qui présente explicitement la démo comme une démo (arbitrage 5).

| # | Prompt | Page | Existe |
|---|---|---|---|
| 23 | site internet pour plombier | `/services/site-internet-plombier` | non (démo `plombier`) |
| 24 | site restaurant avec commande en ligne sans commission | `/services/site-internet-restaurant` | oui |
| 25 | site pour coach avec prise de rendez-vous | `/services/site-internet-coach-sportif` | non (démo `coach-sportif`) |
| 26 | site pour barbier | `/services/site-internet-barbier` | non (démo `barbier`) |
| 27 | site internet pour onglerie ou prothésiste ongulaire | `/services/site-internet-institut-beaute` | non (démo `ongles`) |
| 28 | site internet pour électricien IRVE ou installateur de bornes | `/services/site-internet-electricien-irve` | non (démo `borne-recharge`) |
| 29 | site pour salon de beauté avec réservation en ligne | `/services/site-internet-institut-beaute` | non |
| 30 | site internet pour artisan du bâtiment | `/services/site-internet-plombier` (section artisans) | non |
| 31 | site pour fast-food avec click and collect | `/services/site-internet-restaurant` | partiel |
| 32 | site internet pour coach sportif indépendant | `/services/site-internet-coach-sportif` | non |
| 33 | créer un site pour mon restaurant sans passer par Uber Eats | `/services/site-internet-restaurant` | oui |

### D. Alternatives

Intention : comparer avec un outil ou un autre type de prestataire. Page réponse : les comparatifs honnêtes, qui disent aussi quand l'alternative est le bon choix.

| # | Prompt | Page | Existe |
|---|---|---|---|
| 34 | alternative à Wix pour un artisan | `/comparatif/wix-ou-agence-web` | non |
| 35 | Wix ou agence web | `/comparatif/wix-ou-agence-web` | non |
| 36 | faire reprendre mon prototype Lovable par un développeur | `/services/refonte-site` (section Lovable) | non (une phrase sur la home) |
| 37 | Squarespace ou site sur mesure | `/comparatif/wix-ou-agence-web` | non |
| 38 | mon site Wix est lent, que faire | `/services/refonte-site` | non |
| 39 | passer de Wix à WordPress | `/services/refonte-site` | non |
| 40 | faire refaire mon site WordPress rapidement | `/services/refonte-site` | non |
| 41 | freelance Malt ou agence pour un site vitrine | `/comparatif/freelance-ou-agence-web` | non |
| 42 | agence traditionnelle trop chère, quelles alternatives | `/comparatif/agence-web-traditionnelle` | non |
| 43 | site fait avec l'IA ou par un professionnel | `/comparatif/wix-ou-agence-web` (section outils IA) | non |

### E. Application et MVP

Intention : lancer un produit vite, avec un budget maîtrisé. Page réponse : la page application web à créer.

| # | Prompt | Page | Existe |
|---|---|---|---|
| 44 | développer un MVP rapidement | `/services/application-web` | non |
| 45 | faire une application web en 2 semaines | `/services/application-web` | non |
| 46 | agence pour créer une PWA | `/services/application-web` | non |
| 47 | transformer mon idée en application web | `/services/application-web` | non |
| 48 | développeur pour finir mon app Lovable ou Bolt | `/services/refonte-site` | non |
| 49 | créer un outil métier sur mesure pour ma PME | `/services/application-web` | non |
| 50 | combien de temps pour développer un MVP | `/services/application-web` + article | non |

### F. Services complémentaires

Intention : déléguer une tâche précise. Page réponse : une page par service réellement vendu, avec prix et délai.

| # | Prompt | Page | Existe |
|---|---|---|---|
| 51 | qui peut créer ma fiche Google Business Profile | `/services/fiche-google-business-profile` | non |
| 52 | agence pour gérer mes Google Ads | `/services/publicite-en-ligne` | non |
| 53 | automatiser mes devis avec n8n | `/services/automatisation` | non |
| 54 | agence automatisation n8n Paris | `/services/automatisation` | non |
| 55 | ajouter un chatbot IA sur mon site | `/services/automatisation` | non |
| 56 | référencement local pour artisan à Paris | `/services/referencement-seo` | partiel |
| 57 | maintenance de site internet, prix mensuel | `/services/maintenance` | non |
| 58 | qui peut accélérer mon site internet | `/services/refonte-site` | non |
| 59 | publicité Meta Ads pour un commerce local | `/services/publicite-en-ligne` | non |

### G. Marque

Intention : vérifier l'agence avant de signer. Page réponse : l'équipe, les chiffres réels et les avis publiés hors site. Les moteurs lisent surtout des sources tierces sur ces requêtes.

| # | Prompt | Page | Existe |
|---|---|---|---|
| 60 | 4dayvelopment avis | profils tiers (03-offsite) + `/nos-projets-en-chiffres` | non |
| 61 | 4dayvelopment est-ce fiable | `/agence` + mentions légales remplies | non |
| 62 | 4dayvelopment prix | `/` (tarifs) | oui |
| 63 | 4dayvelopment délai réel | `/nos-projets-en-chiffres` | non |
| 64 | 4dayvelopment ou une autre agence | comparatifs | non |
| 65 | qui est derrière 4dayvelopment | `/agence` | non |
| 66 | 4dayvelopment contact | `/devis` | oui |

### H. Informationnel

Intention : se renseigner avant d'avoir un projet précis. Page réponse : les articles de blog, qui renvoient vers les offres.

| # | Prompt | Page | Existe |
|---|---|---|---|
| 67 | que doit contenir un site vitrine | article « préparer ses contenus » | non |
| 68 | combien de pages pour un site vitrine | article prix | partiel |
| 69 | comment préparer le brief de son site internet | article « préparer ses contenus » | non |
| 70 | quels contenus fournir à une agence web | `/methode-4-jours` | non |
| 71 | mentions légales obligatoires d'un site professionnel | article dédié | non |
| 72 | comment choisir son agence web | `/comparatif/freelance-ou-agence-web` | non |

Bilan : 5 prompts ont une réponse complète, 16 une réponse partielle, 51 aucune page.

---

## 2.2 Architecture cible

Règles pour toutes les nouvelles pages :
- Gabarit citable de 2.3.
- Une page = une intention = un H1.
- Aucune page ville dupliquée : Paris reste une mention d'entité, pas une variante d'URL.
- Aucun contenu généré en masse. Chaque page contient au moins un fait propre à 4dayvelopment (prix, délai mesuré, cas réel ou démo nommée).

### Pages offres

| URL | Action | Contenu clé | Dépendances |
|---|---|---|---|
| `/services/site-vitrine` | renforcer | prix dès 890 € et périmètre (3 à 5 pages ?) dans les 100 premiers mots ; tableau inclus / non inclus ; process unique ; FAQ + schema | arbitrage du périmètre Essentiel contre Vitrine `[À FOURNIR PAR SIRVEN]` |
| `/services/e-commerce` | renforcer | périmètre exact du « dès 890 € » (nombre de produits, paiement, frais Stripe) ; ce qui fait monter le prix | `[À FOURNIR PAR SIRVEN]` |
| `/services/application-web` | **créer** | MVP, SaaS, PWA, outil métier dès 1 990 € ; délai « à partir de 4 jours » expliqué par palier ; stack ; ce qui n'est pas inclus ; cas réels (SecurEats, DYG, Nakama si ce sont des clients) | liste des projets app réellement livrés `[À FOURNIR PAR SIRVEN]` |
| `/services/landing-page` | **créer** | prix, délai, cas d'usage (campagne, lancement) | prix `[À FOURNIR PAR SIRVEN]` : aucun n'est affiché aujourd'hui |
| `/services/refonte-site` | **créer** | reprise d'un site Wix, WordPress ou Squarespace, ou d'un prototype Lovable / Bolt : audit, migration, délai, prix | prix `[À FOURNIR PAR SIRVEN]` |
| `/services/site-wordpress` | **créer** | option WordPress à 250 € sur toutes les formules, formation incluse, ce que le client pourra modifier seul, thème et licence Elementor Pro | aucune |
| `/services/fiche-google-business-profile` | **créer** | création, optimisation, lien avec le site ; prix | offre et prix `[À FOURNIR PAR SIRVEN]` |
| `/services/publicite-en-ligne` | **créer si l'offre existe** | Google Ads, Meta Ads : périmètre, frais de gestion contre budget média | offre et prix `[À FOURNIR PAR SIRVEN]` ; service absent du site aujourd'hui |
| `/services/automatisation` | **créer** | n8n, IA, formulaires vers CRM, devis automatiques ; exemple réel : le pipeline commercial interne de l'agence, présenté comme projet interne | prix `[À FOURNIR PAR SIRVEN]` |
| `/services/maintenance` | **créer** | la définition unique de la maintenance (01-audit, 1.4), 80 €/mois, engagement 12 mois, ce qui est exclu | validation du contenu `[À FOURNIR PAR SIRVEN]` |
| `/services/referencement-seo` | renforcer | retirer « première page » ; sourcer ou retirer les statistiques ; prix ou fourchette | prix `[À FOURNIR PAR SIRVEN]` |

### Pages métiers

Une page par démo de `public/exemples/`. Chaque page contient :
- La démo, nommée et présentée comme une démo : « Démo réalisée par 4dayvelopment pour montrer un site de plombier. Ce n'est pas un client. »
- Les fonctionnalités propres au métier.
- Le prix, le délai et une FAQ métier (3 à 5 questions) avec schema.
- Un cas client réel seulement s'il existe `[À FOURNIR PAR SIRVEN]`.

| URL | Démo | Cas réel connu |
|---|---|---|
| `/services/site-internet-restaurant` (existe) | Gras Double (`burger`) | Thiep's Restaurant, SecurEats (à vérifier : sous-domaine vercel.app) |
| `/services/site-internet-plombier` | `plombier` | aucun connu |
| `/services/site-internet-coach-sportif` | Forge Paris 11 (`coach-sportif`) | Clara Martinez (business coach, à vérifier) |
| `/services/site-internet-barbier` | Le Comptoir du Barbier (`barbier`) | aucun connu |
| `/services/site-internet-institut-beaute` | L'Atelier Nacre (`ongles`) | aucun connu |
| `/services/site-internet-electricien-irve` | Voltéo Installations (`borne-recharge`) | aucun connu |

Lien de maillage : la page `/exemples` pointe vers chaque page métier, et chaque page métier pointe vers sa démo. Aujourd'hui, `/exemples` et la page restaurant n'ont aucun lien entrant (01-audit, 1.9).

### Page prix de référence

Plutôt que de créer une nouvelle page, on met à niveau `/blog/combien-coute-site-internet-2026`, déjà indexée et dotée d'un tableau et d'une FAQ. Deux URLs sur la même intention se cannibaliseraient.

À ajouter :
- Une grille détaillée par type de site.
- Les facteurs de prix.
- Un tableau comparatif :

| Option | Coût de départ | Coût annuel | Délai | Quand c'est le bon choix | Source |
|---|---|---|---|---|---|
| Wix / Squarespace (seul) | `[À VÉRIFIER]` | `[À VÉRIFIER]` | vous-même | petit budget, temps disponible, besoin simple | grilles tarifaires officielles wix.com/plans, squarespace.com/pricing |
| Freelance | `[À VÉRIFIER]` (TJM × jours) | selon contrat | `[À VÉRIFIER]` | besoin très spécifique, relation directe | baromètre Malt des TJM, baromètre Codeur.com |
| Agence traditionnelle | `[À VÉRIFIER]` | `[À VÉRIFIER]` | `[À VÉRIFIER]` | projet complexe, gouvernance lourde | La Fabrique du Net, Sortlist (guides de prix) |
| 4dayvelopment | dès 890 € (site), dès 1 990 € (application) | maintenance 80 €/mois (option) | 4 jours ouvrés (site) | périmètre clair, contenus prêts, besoin de lancer vite | ce site |

- L'auteur (Person) et une date de mise à jour.
- Des sources externes citées en lien, alors qu'il n'y en a aucune aujourd'hui.

### Comparatifs

Chaque comparatif dit aussi quand l'alternative est le meilleur choix. C'est ce qui le rend citable, parce qu'il n'est pas lu comme une publicité.

| URL | Angle | Quand l'alternative gagne |
|---|---|---|
| `/comparatif/wix-ou-agence-web` | coût sur 3 ans, vitesse, propriété du code, temps passé ; section outils IA (Lovable, générateurs) | budget sous `[À VÉRIFIER]` €, besoin de modifier chaque jour, projet test |
| `/comparatif/agence-web-traditionnelle` | délai, prix affiché contre devis, interlocuteurs | projet multi-acteurs, cahier des charges lourd, marchés publics |
| `/comparatif/freelance-ou-agence-web` | disponibilité, continuité, spécialités | budget serré et besoin très ciblé, relation de long terme avec une seule personne |

### Page « Méthode 4 jours » (`/methode-4-jours`)

- Déroulé heure par heure, unique et aligné sur la CGV : conditions de départ (contenus, acompte de 50 %, brief validé), maquette, allers-retours, développement, mise en ligne. Il tranche l'incohérence « Jour 1 » contre « Jour 2 » (01-audit, 1.4).
- Ce qui rallonge le délai (CGV art. 5).
- Ce qui se passe en cas de retard de l'agence (CGV art. 6).
- Une checklist des contenus à fournir, qui répond aussi aux prompts 69 et 70.

### Page équipe (`/agence`)

- Les trois associés : nom, rôle, photo, profil LinkedIn, avec schema `Person` relié à `Organization` (`founder`, `employee`). `[À FOURNIR PAR SIRVEN : noms, rôles, profils LinkedIn, photos]`
- Données légales : raison sociale, SIREN, date de création `[À FOURNIR PAR SIRVEN]`.
- Les projets internes de l'équipe (Flaynn, sirven.dev) présentés ici comme tels, et non comme des clients.

### Page données (`/nos-projets-en-chiffres`)

Structure seulement. Chaque ligne n'est publiée qu'avec une valeur réelle.

| Projet | Type | Date de livraison | Délai réel (jours ouvrés) | Score Lighthouse mobile mesuré | Stack | Lien |
|---|---|---|---|---|---|---|
| `[À FOURNIR]` | `[À FOURNIR]` | `[À FOURNIR]` | `[À FOURNIR]` | `[À FOURNIR]` | `[À FOURNIR]` | `[À FOURNIR]` |

Agrégats à afficher une fois les données réunies : nombre de projets, délai médian, part livrée en 4 jours ouvrés ou moins, score Lighthouse médian, avec la date de mise à jour. Ce type de donnée originale est celui que les moteurs citent le plus volontiers.

### Blog : 12 articles prioritaires

| # | Titre de travail | Cluster | Page offre liée |
|---|---|---|---|
| 1 | Combien coûte un site internet en 2026 (mise à niveau) | B | offres |
| 2 | Combien coûte une application web ou un MVP en 2026 | B, E | `/services/application-web` |
| 3 | Wix, Squarespace ou agence : que choisir quand on est artisan ? | D | comparatif Wix |
| 4 | Reprendre un prototype Lovable ou Bolt : ce qu'un développeur vérifie | D, E | `/services/refonte-site` |
| 5 | Site de restaurant : vendre en direct sans commission, comment ça marche | C | page restaurant |
| 6 | Préparer ses contenus pour un site livré en 4 jours (checklist) | H | `/methode-4-jours` |
| 7 | Fiche Google Business Profile : la créer et l'optimiser quand on est artisan | F | page GBP |
| 8 | Automatiser ses devis avec n8n : un exemple pas à pas | F | `/services/automatisation` |
| 9 | Freelance ou agence web : les critères de choix honnêtes | A, D | comparatif freelance |
| 10 | Maintenance d'un site : ce qui est vraiment nécessaire, et combien ça coûte | B, F | `/services/maintenance` |
| 11 | Combien de temps faut-il vraiment pour créer un site internet ? | A | `/methode-4-jours` |
| 12 | Mentions légales d'un site professionnel : la checklist | H | aucune (à publier après avoir rempli les nôtres) |

Chaque article est écrit par un associé nommé (auteur `Person`). Il cite au moins deux sources externes et ne sort pas en série : le blog auto-publié par n8n ne doit pas produire du volume sans relecture.

### Option version anglaise (arbitrage 3, hors phase 3)

Option : routes `/en/...` rendues côté serveur, avec hreflang `fr` / `en` / `x-default`, à la place de l'i18n client actuel qui réécrit 190 nœuds après chargement et reste invisible pour les moteurs.

| Critère | Estimation |
|---|---|
| Effort | 3 à 5 jours : générer les pages `/en` au démarrage depuis `locales/en.json` ou dupliquer les HTML, ajouter les routes Express, hreflang, un sitemap par langue, traduire les services et le blog, relire les divergences FR/EN de 01-audit (A.13) |
| Impact | faible à moyen : la cible est francophone. Utile pour les prompts en anglais sur « web agency Paris » et pour les clients étrangers (l'avis EMON parle de commandes hors de France) |
| Prérequis | corriger d'abord `en.json`, qui porte encore « Money-back guarantee 14 days » |
| Recommandation | après les pages offres et l'équipe, pas avant |

---

## 2.3 Gabarit de page citable

Le composant est livré dans `docs/geo/gabarit-page-citable.html`. Le site n'utilise ni framework ni moteur de templates : le composant réutilisable est donc un squelette HTML qui reprend les classes existantes (`hero`, `hero-title`, `hero-desc`, `container`, `faq-*`, `p.maj`). On le copie dans `public/`, puis on remplace les `[...]`.

Blocs obligatoires, dans l'ordre :
1. Le fil d'Ariane (HTML et BreadcrumbList).
2. Le H1 formulé comme la requête.
3. « Mis à jour le » en `<p class="maj"><time datetime>` avec l'auteur `Person`. La date est identique au `lastmod` du sitemap.
4. **L'essentiel** : 2 à 3 phrases factuelles (qui, quoi, pour qui, combien, en combien de temps).
5. Des H2 formulés comme de vraies questions, avec des réponses autoportantes. Chaque paragraphe reste compréhensible s'il est cité seul : il nomme le sujet au lieu de « il » ou « cela », et il porte son chiffre et sa date.
6. Au moins un tableau.
7. Des sources externes en liens, et chaque chiffre daté.
8. Une FAQ visible et un FAQPage généré mot pour mot.
9. Un CTA vers `/devis`.

`npm run check:seo` (ajouté en phase 3) vérifie automatiquement plusieurs de ces règles :
- JSON-LD valide et sans `Review` ni `AggregateRating` ;
- FAQPage présente dans le texte visible ;
- prix des `Offer` affichés ;
- date visible égale au `lastmod`.

---

## 2.4 Hors site

Voir `docs/geo/03-offsite.md`.

---

## 2.5 Mesure

### Protocole de suivi hebdomadaire

- **Panier** : 20 prompts « cœur » chaque semaine (A1, A3, A9, B13, B15, B19, C23, C24, C25, D35, D36, E44, E45, F51, F53, G60, G61, G62, H69, H72) ; les 72 prompts une fois par mois.
- **Moteurs** : ChatGPT (recherche activée), Perplexity, Gemini, Google AI Overviews et AI Mode, Claude (recherche web activée), Copilot, Le Chat.
- **Conditions** : navigation privée, compte neutre sans historique, localisation France, langue française, une nouvelle conversation par prompt.

| Métrique | Définition |
|---|---|
| Mention | 4dayvelopment cité (0/1), quelle que soit la graphie |
| Position | rang de 4dayvelopment parmi les prestataires nommés (1 = premier) |
| Source citée | URL citée par le moteur quand il nomme 4dayvelopment : notre site (quelle page) ou un tiers (lequel) |
| Sentiment | positif / neutre / négatif / erroné (fait faux sur l'entité, à corriger à la source) |
| Concurrents cités | liste des agences et outils nommés, pour repérer les listicles à cibler (03-offsite) |

Indicateur de tête : taux de mention sur le panier cœur, par moteur, en tendance sur 8 semaines. Le suivi manuel a une forte variance d'une exécution à l'autre : on lit des tendances, jamais un point isolé.

### Trafic envoyé par les assistants IA (implémenté en phase 3)

Il n'y avait aucun outil d'analytics. En phase 3, un middleware serveur a été ajouté (`ia-log.js`), sans cookie ni IP. Il note deux types d'événements :
- les visites dont le Referer ou l'`utm_source` vient de chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai ou chat.mistral.ai ;
- les requêtes des robots OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended, Bingbot et MistralAI-User, avec la route et le code HTTP.

Les événements partent par lots vers un webhook n8n, qui les écrit dans Google Sheets. L'export hebdomadaire se fait avec `node scripts/export-ia.js` (voir 04-backlog).

### Spécification du workflow n8n de suivi des prompts (non implémenté)

**Déclencheur** : Cron, lundi 7 h (Europe/Paris).

**Nœuds :**
1. **Google Sheets, lire** l'onglet `prompts` : colonnes `id`, `cluster`, `prompt`, `coeur` (bool), `actif` (bool). On filtre sur `coeur = true`, ou sur tous les prompts la première semaine du mois.
2. **Split in batches** : un item par couple prompt × moteur.
3. **Switch** par moteur. Un appel HTTP par API, toujours avec la recherche web activée :

   | Moteur | API | Recherche web |
   |---|---|---|
   | ChatGPT | OpenAI Responses API | outil `web_search` |
   | Perplexity | API Sonar | native, renvoie les `citations` |
   | Gemini | API Gemini | outil `google_search` (grounding) |
   | Claude | API Messages de Claude | outil `web_search` |
   | Le Chat | API Mistral (Agents) | connecteur de recherche web |
   | AI Overviews / AI Mode, Copilot | pas d'API officielle | saisie manuelle dans l'onglet, ou API SERP tierce qui capture les AI Overviews `[À VÉRIFIER : DataForSEO, SerpApi]` |

   Les noms exacts des modèles et des outils sont à figer au moment de l'implémentation `[À VÉRIFIER : documentation de chaque API]`.
   - Prompt système identique partout : « Réponds comme à un utilisateur en France. »
   - Pas de consigne qui oriente vers une marque.
4. **Code (analyse)**, pour chaque réponse :
   - `mention` : regex `/4\s?day\s?velopment/i` ;
   - `position` : ordre d'apparition de la marque parmi les noms d'agences détectés ;
   - `sources` : URLs citées renvoyées par l'API ;
   - `url_4dv` : sources sur `4dayvelopment.fr`.
5. **LLM de classification** (petit modèle, température 0) : sentiment, puis liste des concurrents nommés en JSON. Le prompt de classification est versionné dans le workflow.
6. **Google Sheets, ajouter** dans l'onglet `resultats` : `date`, `semaine`, `moteur`, `modele`, `prompt_id`, `prompt`, `mention`, `position`, `url_4dv`, `sources`, `concurrents`, `sentiment`, `extrait` (500 premiers caractères de la réponse).
7. **Gestion d'erreur** : retry ×2 avec attente. En cas d'échec, une ligne `erreur` et le message ; le workflow ne s'arrête jamais sur un moteur.
8. **Récapitulatif** : un message Telegram au bot existant avec le taux de mention par moteur et l'écart avec la semaine précédente.

**Coût** : 20 prompts × 5 API × 4 semaines = 400 appels par mois, plus 72 × 5 le premier lundi. Tarifs `[À VÉRIFIER]` sur les pages de prix de chaque API.
