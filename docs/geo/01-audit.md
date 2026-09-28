# 01. Audit GEO de 4dayvelopment.fr

- Date des mesures : 23 septembre 2026.
- Version auditée : commit `e6534bd` de `main`, identique octet pour octet à la production (23 routes HTML, `robots.txt`, `sitemap.xml` et `llms.txt` comparés avec `diff`).
- Méthode : `curl` en production avec les user-agents des robots, lecture du HTML servi, Lighthouse 12.8.2 en mobile, historique git.
- Convention : `[À FOURNIR PAR SIRVEN]` signale une donnée absente du dépôt, `[À VÉRIFIER]` un chiffre externe à sourcer.

## Synthèse

1. **Accès des robots : aucun problème.** Les 13 robots testés reçoivent un 200 et le HTML complet. Aucun challenge Cloudflare, aucun blocage dans `robots.txt`.
2. **Rendu : bon.** Le contenu principal (H1, offres, prix, FAQ, avis, portfolio) est dans le HTML initial. Deux scripts dégradaient toutefois le DOM rendu, et donc la lecture par Googlebot après exécution du JS : le rouleau de prix du duel et le découpage des titres. Les deux sont corrigés en phase 3.
3. **Indexation : aucun canal actif.** Il n'y a ni IndexNow, ni trace de vérification Google Search Console ou Bing Webmaster Tools. Bing alimente ChatGPT et Copilot : c'est l'angle mort le plus coûteux.
4. **Entité : incohérente.** On trouve au moins six niveaux de support, deux déroulés de process contradictoires, quatre graphies du nom et un `llms.txt` avec d'anciens prix. Surtout, des garanties (« ou c'est gratuit », « satisfait ou remboursé 14 jours ») sont absentes des CGV.
5. **Mentions légales non remplies en production.** Nom, adresse, SIRET, téléphone et hébergeur sont encore en `{{...}}`. C'est à la fois un point de conformité (LCEN) et un signal d'entité manquant.
6. **Preuves sociales fragiles.** L'avis « Flaynn » vient d'un projet de l'équipe. Les trois avis ont été réattribués et réécrits (historique git). L'associé Sirven figure parmi les « réalisations clients ».
7. **Couverture des services : incomplète.** Application / MVP, landing page, WordPress, reprise Wix ou Lovable, maintenance, Google Business Profile, publicité et automatisation n'ont aucune page dédiée.
8. **Extractibilité moyenne.** Seules la page restaurant et l'article prix dépassent 3/5. Aucune page n'affichait de date de mise à jour (corrigé en phase 3).

---

## 1.1 Stack et rendu

| Élément | Constat | Preuve |
|---|---|---|
| Framework | Aucun. HTML statique écrit à la main dans `public/`, servi par Express 5 (`server.js`), vanilla JS en modules ES | `package.json`, `server.js` |
| Mode de rendu | Pages statiques servies telles quelles (équivalent SSG sans étape de build). Le blog publié via l'API est écrit sur disque par `buildArticleHTML` | `server.js:536` |
| Hébergement | Render (`fourdayvelopment.onrender.com`), déploiement automatique sur `main` | en-tête `x-render-origin-server: Render` |
| CDN | Cloudflare géré par Render (`server: cloudflare`, `cf-cache-status: DYNAMIC`). Pas de compte Cloudflare côté agence, donc pas de réglage WAF ni « AI Crawl Control » possible | en-têtes de réponse |
| DNS | Hostinger (`ns1/ns2.dns-parking.com`), apex vers Render ; `www` redirigé en 301 vers l'apex | `dig` |
| Disque | Éphémère : `data/leads.json` et les articles publiés via l'API sont perdus à chaque redéploiement | mémoire projet, `server.js:720` |

### Contenu présent dans le HTML initial (sans JS)

Vérifié avec `curl -A "GPTBot/1.3"` sur la home en production.

| Contenu | Présent sans JS | Détail |
|---|---|---|
| H1 unique par page | oui, sur les 23 routes | la home : « Votre site internet, livré en 4 jours. » |
| Offres et prix | oui | `duel-digits">890`, `duel-digits">1 990`, `80€/mois` |
| FAQ (7 questions) | oui | accordéon replié en CSS, réponses dans le DOM |
| Avis | oui | 3 cartes dans le HTML ; `carousel.js` ne crée que les points de navigation |
| Bandeau « Ils nous font confiance » | oui | |
| Portfolio | oui | 11 projets avec liens (`/portfolio`) |
| Démos métier | hors page | chargées en `iframe` depuis `/exemples/<slug>`, pages en `noindex` |

### Composants interactifs

| Composant | Contenu dans le DOM initial ? | Effet du JS sur le texte rendu | Statut |
|---|---|---|---|
| FAQ (accordéon) | oui | aucun | OK |
| Carrousel d'avis | oui | ajoute des boutons | OK |
| Duel de tarifs (deux panneaux) | oui, les deux | **remplaçait « 890 » par 30 chiffres `<i>` par position** : le DOM rendu lisait « 012345678901... », pour Googlebot comme pour les lecteurs d'écran | corrigé en phase 3 |
| Titres de section découpés (`motion.js`) | oui | **supprimait les `<br>` sans espace** : « Les questionsqu'on nous pose souvent » | corrigé en phase 3 |
| Punchline du H1 (`punchline.js`) | oui | remplace « livré en 4 jours. » par « ou c'est gratuit. » pendant 3 s, toutes les 20 à 28 s | claim, voir 1.7 |
| Menu mobile | oui (nav) | duplique les liens de la nav | OK |
| Version anglaise | non | 190 nœuds `data-i18n` réécrits côté client, aucune URL `/en` | hors périmètre, voir 02-strategie |

---

## 1.2 Accès des robots

### robots.txt en production (avant correctif)

```
User-agent: *
Allow: /
Sitemap: https://4dayvelopment.fr/sitemap.xml
Disallow: /api/
Disallow: /data/
```

Un seul groupe `*`. Aucun robot n'y est nommé, et Cloudflare n'injecte pas de robots.txt géré. Le `Disallow` placé après `Sitemap` reste rattaché au groupe `*` (RFC 9309), mais c'est une lecture fragile. `/data/` n'est pas servi.

| Robot | Rôle | Statut effectif |
|---|---|---|
| OAI-SearchBot | index de recherche ChatGPT | autorisé (via `*`) |
| ChatGPT-User | lecture à la demande d'un utilisateur | autorisé |
| GPTBot | entraînement OpenAI | autorisé |
| PerplexityBot | index Perplexity | autorisé |
| Perplexity-User | lecture à la demande | autorisé |
| ClaudeBot | entraînement des modèles Claude | autorisé |
| Claude-SearchBot | index de recherche Claude | autorisé |
| Claude-User | lecture à la demande | autorisé |
| Google-Extended | jeton d'usage Gemini (pas un crawler) | autorisé |
| Googlebot | Google Search, AI Overviews, AI Mode | autorisé |
| Bingbot | Bing, donc ChatGPT et Copilot | autorisé |
| Applebot | Siri, Spotlight, Apple Intelligence | autorisé |
| MistralAI-User | Le Chat, lecture à la demande | autorisé |

**Recommandation (appliquée en phase 3)** : autoriser tous les robots de recherche, de lecture à la demande et d'entraînement. Il faut les nommer dans le groupe `*` pour rendre l'intention explicite, sortir le `Sitemap` du groupe et retirer `/data/`.

### Accès réel

`curl -sI` puis `GET` avec les UA officiels, sur `/`, `/services/site-vitrine` et `/blog/combien-coute-site-internet-2026`.

| UA | 3 pages | Taille reçue = fichier du dépôt | `cf-mitigated` / challenge |
|---|---|---|---|
| les 13 ci-dessus + Chrome témoin | 200 / 200 / 200 | oui (72 741, 19 017, 36 349 octets) | non |

Réserves :
- Les tests partent d'une IP qui n'appartient pas aux robots, la vérification par IP de Cloudflare ne peut donc pas être reproduite ici. Le journal serveur ajouté en phase 3 (`ia-log.js`) donnera les codes HTTP réellement servis aux robots.
- Les UA de Claude-SearchBot et MistralAI-User ont été reconstitués au mieux.

### Redirections

| URL | Réponse |
|---|---|
| `http://` apex | 301 vers https, 1 saut |
| `http://www...` | 2 sauts (https puis apex) ; 3 avec un `.html` |
| `/index.html`, `*.html`, slash final | 301 vers l'URL propre, 1 saut |
| `/lead.html` | 301 vers `/devis` |
| `/audit` | 302 vers `/devis`, utm conservés (QR imprimés) |
| `/portfolio` | 200 (les consignes du dépôt parlent d'une 301 vers `/exemples` : c'est faux, `/portfolio` est une vraie page indexée) |

### sitemap.xml

Présent, en `application/xml`, déclaré dans robots.txt, 11 URLs.

| Constat | Détail |
|---|---|
| Complet | les 11 routes en `index` sont exactement les 11 URLs du sitemap |
| Propre | aucune URL en noindex ou redirigée |
| lastmod faux | 9 URLs à `2026-06-27`, alors que le texte des pages a changé jusqu'au 28 août (voir le tableau ci-dessous) |
| Ajouts de l'API blog perdus | `addToSitemap` écrit sur le disque éphémère de Render |

Date réelle de dernière modification du **texte visible** : dernier commit dont le diff change le texte hors balises. Les commits de logo ou de CSS sont ignorés.

| URL | lastmod déclaré | Dernière modification réelle du contenu |
|---|---|---|
| `/` | 2026-06-27 | 2026-08-28 |
| `/essentiel` | 2026-06-27 | 2026-08-17 |
| `/devis` | 2026-06-27 | 2026-07-23 |
| `/services/site-vitrine` | 2026-06-27 | 2026-08-17 |
| `/services/e-commerce` | 2026-06-27 | 2026-08-17 |
| `/services/referencement-seo` | 2026-06-27 | 2026-08-15 |
| `/services/site-internet-restaurant` | 2026-06-27 | 2026-08-17 |
| `/blog` | 2026-06-27 | 2026-08-06 |
| `/portfolio` | 2026-06-27 | 2026-08-06 |
| `/blog/combien-coute-site-internet-2026` | 2026-07-02 | 2026-08-17 (passage de l'application à 1 990 €) |
| `/exemples` | 2026-08-20 | 2026-08-06 |

---

## 1.3 Indexation

| Élément | Constat |
|---|---|
| IndexNow | absent : ni clé, ni fichier de clé, ni ping, rien dans l'historique git |
| Google Search Console | aucune trace : ni meta `google-site-verification`, ni fichier `google*.html`, ni TXT DNS |
| Bing Webmaster Tools | aucune trace : ni `msvalidate.01`, ni `BingSiteAuth.xml`, ni TXT DNS |
| DNS TXT apex | seulement le SPF (`include:_spf.mail.hostinger.com ...`), DMARC `p=none` |

Il est possible qu'une vérification existe par un autre moyen (propriété de domaine déjà validée puis TXT supprimé, compte Google Analytics…). `[À FOURNIR PAR SIRVEN : accès GSC et BWT existants ?]`

Recommandations :
- Vérifier le domaine dans GSC et BWT par enregistrement TXT chez Hostinger. Soumettre le sitemap dans les deux outils.
- Dans BWT, importer la propriété depuis GSC (option native) et activer IndexNow côté Bing.
- IndexNow est ajouté en phase 3 : GitHub Action après chaque déploiement.

---

## 1.4 Cohérence de l'entité

Les éléments complets, avec `fichier:ligne`, sont dans l'extraction de travail. Ce tableau garde les faits qui comptent pour un moteur qui compare les sources.

| Fait | Valeur | Page | Incohérence |
|---|---|---|---|
| Nom | « 4dayvelopment » (427 occurrences) | toutes, JSON-LD, manifest | cartes QR : « 4Dayvelopment » ; og-image de toutes les pages : « 4 dayvelopment » ; logo : lockup « 4DAYvelopment » |
| Slogan | « Votre site internet, livré en 4 jours. » | home (JSON-LD, H1) | footer : « Un site qui vend, livré en 4 jours. » ; `fr.json` : « Agence web nouvelle génération » |
| Ville | Paris | home (badge, JSON-LD), cartes | aucune adresse postale ; mentions légales : `{{ADRESSE}}` |
| Équipe | non déclarée sur les pages indexables | | Sirven Ouamba et Erwin Yana n'apparaissent que sur `/sirven` et `/erwin` (noindex). Le brief parle de trois associés : `[À FOURNIR PAR SIRVEN : nom et rôle du troisième associé]` |
| Délai | « 4 jours ouvrés » | home, services, CGV art. 5, llms.txt | ailleurs « 4 jours » ; bandeau home : « 17+ projets livrés **en moins de** 4 jours » ; application : « Livrée **à partir de** 4 jours » |
| Point de départ du délai | CGV : contenus + acompte 50 % + validation devis et brief | cgv art. 5 | FAQ home : « contenus et premier acompte » seulement |
| Process | section Processus : J1 échange (30 min), **J2 maquette sous 48 h**, J3-4 développement, J4 mise en ligne | home | FAQ home, `/essentiel`, `/services/site-vitrine` : **J1 brief et maquette**, J2 validation et développement ; `fr.json` promet un « espace client » inexistant |
| Durée de l'appel | 30 min | home, site-vitrine | cartes QR : 20 min |
| Prix site | dès 890 € (2 × 445 €) | home, essentiel, services, restaurant, blog, JSON-LD | `llms.txt` : 990 / 1 290 / 1 990 / 2 990 € (corrigé en phase 3) |
| Prix application | dès 1 990 € (2 × 995 €) | home, restaurant, blog | absent de l'ancien `llms.txt`, où 1 990 € = « Site Pro » |
| Périmètre à 890 € | Essentiel : jusqu'à 3 pages ; Site vitrine : 3 à 5 pages | essentiel, site-vitrine | même prix, deux périmètres |
| Formule « Pro » | colonnes Vitrine / Pro / E-commerce | referencement-seo | n'existe plus sur la home |
| Paiement | CGV : 50 % / 50 %, 2 fois sans frais | cgv art. 4 | `/essentiel` : « Paiement unique » ; ancien llms.txt : « 2 ou 3 fois » |
| HT / TTC | CGV : prix HT sauf mention ; cartes : « prix fixes HT » | cgv, cartes | le site n'indique jamais HT ni TTC |
| Maintenance | 80 €/mois, engagement 12 mois | home, essentiel, CGV art. 9 | contenu divergent, voir ligne suivante |
| Niveaux de support | « Support 24/7 », « email sous 4 h », « réponse sous 48 h, 2 demandes/mois », « support prioritaire », « 3 mois de support prioritaire » (e-commerce), « support technique par email » (CGV) | home, essentiel, e-commerce, CGV, og-image | **six versions** ; la maintenance promet aussi des « mises à jour des plugins et du CMS » pour des sites « codés à la main » |
| Délai de réponse commercial | 24 h (« garantie ») | home, devis, services | `/essentiel` : 2 h « par email ou WhatsApp », sans numéro WhatsApp publié |
| Hébergement | 1 an inclus | home, essentiel, blog | domaine inclus selon les pages ; rien dans les CGV |
| Technologies | « codé à la main, sans thème », « jamais de template » | home | option WordPress : « On installe un thème léger », Elementor Pro (`/essentiel`) |
| SEO avancé | « en option » | home FAQ | referencement-seo : « inclus dans Pro et E-commerce » ; e-commerce : inclus à 890 € |
| Nombre de projets | « 17+ projets » | home, og-image | portfolio : 11 projets, dont 2 liés à l'équipe |
| Email | contact@4dayvelopment.fr | site, JSON-LD | cartes QR et vCard : contact@4dayvelopment**.com** |
| Téléphone | absent | | mentions légales : `{{TELEPHONE}}` ; numéros personnels sur les cartes noindex |
| SIREN / forme juridique | absents | | mentions légales : `{{SIRET}}`, `{{NOM_COMPLET}}` |
| Profils sociaux | absents (« bloc retiré tant qu'il n'y a pas de comptes actifs ») | home | LinkedIn personnels sur les cartes noindex |
| Date de création | absente | | `[À FOURNIR PAR SIRVEN]` |

### Priorités demandées

- **Maquette « sous 48 h, Jour 2 » contre « Jour 1 : brief et maquette »** : les deux versions coexistent sur la home (section Processus contre FAQ), et `/essentiel` et `/services/site-vitrine` suivent la FAQ. Proposition : un seul déroulé, repris partout et aligné sur la CGV, qui fait démarrer le délai à la réception des contenus et de l'acompte et à la validation du brief. Il sera détaillé sur la future page « Méthode 4 jours » (voir 02-strategie). Le choix revient à Sirven.
- **Niveaux de support** : six versions. Proposition : une seule définition de la maintenance, recopiée à l'identique (home, essentiel, CGV art. 9, JSON-LD). Par exemple, en ne gardant que ce qui est tenable à trois : « mises à jour de sécurité, sauvegardes quotidiennes, correction de bugs, 2 demandes de modification par mois, réponse par email sous 48 h ouvrées » `[À VALIDER PAR SIRVEN]`. Retirer « 24/7 » (home, og-image) et « sous 4 h » tant qu'une astreinte n'existe pas.
- **Graphie** : voir ci-dessous.

### Graphie canonique proposée

**« 4dayvelopment »**, tout en minuscules et en un seul mot, dans tout texte : site, JSON-LD, annuaires, factures, signatures. Arguments :
- C'est la forme du domaine.
- C'est la forme dominante sur le site (427 occurrences).
- C'est celle du JSON-LD et du manifest.

Le lockup visuel « 4DAYvelopment » reste un logo, jamais une graphie de texte. À corriger : « 4Dayvelopment » sur `/carte`, `/sirven`, `/erwin` et les trois vCard, et « 4 dayvelopment » sur `og-image.jpg`/`.svg`, qui apparaît en aperçu de lien pour toutes les pages.

### Description canonique de l'entité (proposition)

À coller à l'identique partout : annuaires, profils, JSON-LD `description`, bio LinkedIn. Chaque chiffre est celui de la production au 23 septembre 2026.

**160 caractères (146)**

> 4dayvelopment, agence web à Paris, crée des sites internet livrés en 4 jours ouvrés, à prix affiché : site dès 890 €, application web dès 1 990 €.

**750 caractères (729)**

> 4dayvelopment est une agence web basée à Paris. Elle conçoit des sites vitrines, des portfolios, des boutiques e-commerce et des applications web (PWA, MVP, outils métier) pour les indépendants, artisans, coachs et PME francophones. Un site est livré en 4 jours ouvrés, décomptés à partir de la réception des contenus, de l'acompte et de la validation du brief, avec des allers-retours illimités pendant la phase de design. Les prix sont affichés : site web dès 890 €, application web dès 1 990 €, maintenance à 80 € par mois avec engagement de 12 mois, option WordPress à 250 € avec formation incluse. Le paiement se fait en deux fois sans frais. L'agence intervient à Paris, en Île-de-France et à distance dans toute la France.

Une fois l'équipe publiée sur le site, on peut ajouter : « Fondée en `[À FOURNIR PAR SIRVEN : année]` par `[À FOURNIR PAR SIRVEN : trois associés]` ».

---

## 1.5 Données structurées

Tous les blocs JSON-LD se parsent. Aucun `Review` ni `AggregateRating`. Les étoiles des avis sont en HTML seulement, ce qui est correct.

| Page | Existant (avant phase 3) | Écarts |
|---|---|---|
| `/` | `@graph` : WebSite, Organization + ProfessionalService, WebPage, BreadcrumbList, FAQPage | Organization sans `contactPoint`, `founder`, `employee`, `foundingDate`, `sameAs`, `legalName`. Catalogue sans la maintenance à 80 €/mois. **FAQPage non alignée** : Q2 paraphrasée, Q3 et Q4 tronquées |
| `/essentiel` | Service + Offer 890 € | pas de BreadcrumbList ; `provider` non relié à `#organization` |
| `/services/site-vitrine`, `/services/e-commerce` | Service + Offer 890 €, BreadcrumbList | `provider` non relié à `#organization` ; pas d'`url` |
| `/services/referencement-seo` | Service, BreadcrumbList | pas d'Offer, ce qui est cohérent : aucun prix affiché |
| `/services/site-internet-restaurant` | Service + Offer 890 €, FAQPage alignée, BreadcrumbList | la FAQPage pousse « Si nous dépassons ce délai, votre site est gratuit », que la CGV contredit (voir 1.7) |
| `/portfolio` | CollectionPage + ItemList (11 projets), BreadcrumbList | pas de `CreativeWork` par projet ; l'ItemList contient Sirven et Flaynn, liés à l'équipe |
| `/exemples` | BreadcrumbList | les démos ne sont pas typées (normal : noindex) |
| `/blog` | CollectionPage, BreadcrumbList | |
| `/blog/combien-coute...` | Article, FAQPage alignée, BreadcrumbList | `author` = Organization (pas de Person) ; `dateModified` 2026-07-02 alors que le contenu a changé le 2026-08-17 |
| `/devis` | ContactPage, BreadcrumbList | |
| Template `buildArticleHTML` | Article (author Organization), FAQPage, BreadcrumbList en microdonnées | même absence d'auteur Person |

### Écarts avec la cible

| Cible | État après phase 3 | Reste à faire |
|---|---|---|
| Organization / ProfessionalService : `founder`, `employee` (Person) | non ajouté | `[À FOURNIR PAR SIRVEN : noms, rôles, profils LinkedIn des trois associés]` |
| `areaServed` | présent | |
| `contactPoint` | **ajouté** (email, page devis, fr/en) | téléphone `[À FOURNIR PAR SIRVEN]` |
| `logo` | présent (`logo4day.png`) | |
| `foundingDate`, `legalName`, SIREN | non ajoutés | `[À FOURNIR PAR SIRVEN]` (et à remplir aussi dans les mentions légales) |
| `sameAs` | non ajouté : aucun profil officiel n'existe | à ajouter à mesure que les profils de 03-offsite sont créés |
| WebSite | présent | |
| Service + Offer aux prix affichés | **complété** : `minPrice` (« à partir de »), maintenance 80 €/mois, `provider` relié par `@id`, `url` | page Application sans Service dédié (la page n'existe pas) |
| FAQPage mot pour mot | **aligné** sur la home ; déjà aligné sur la page restaurant et l'article | `npm run check:seo` bloque toute dérive future |
| BreadcrumbList | **ajouté** sur `/essentiel` ; présent ailleurs | |
| CreativeWork par réalisation | non (hors phase 3) | backlog, après tri des projets liés à l'équipe |
| Article + author Person | non (hors phase 3) | backlog, dépend des noms |

La validation se fait avec le script `scripts/check-seo.js` (parse, types interdits, FAQ contre texte visible, prix d'Offer affichés, lastmod contre date visible) et avec le validateur schema.org (voir 04-backlog).

---

## 1.6 Extractibilité

Critères : les 150 premiers mots du `<main>` répondent-ils à « qui, quoi, pour qui, combien, en combien de temps » ? Les paragraphes sont-ils autoportants ? Y a-t-il des faits chiffrés, des tableaux, une date visible ?

| Page | Qui | Quoi | Pour qui | Combien | Délai | Tableau | Date | Note | Justification |
|---|---|---|---|---|---|---|---|---|---|
| `/` | oui (Paris dans le badge) | oui | oui | non (prix à ~900 mots) | oui | non | non | **2/5** | Les 150 premiers mots sont pollués par le ruban répété six fois (« VOTRE SITE EN 4 JOURS · YOUR WEBSITE IN 4 DAYS ») et par les libellés des démos et des logos. Le prix n'arrive qu'au duel. Chiffres non sourcés (17+, 100 %, 72 %) |
| `/essentiel` | non (le nom n'est que dans le logo) | oui | implicite | oui (890 € dans le H1) | oui | non | non | **3/5** | La meilleure page pour « combien, en combien de temps ». Mais pas de `<main>`, des listes à puces avec emoji plutôt que des phrases, et « délai garanti » sans condition |
| `/services/site-vitrine` | non | oui | implicite | non (890 € à la fin) | oui | non | non | **3/5** | Bon chapeau, statistique sourcée (StatCounter). Le prix et le process viennent tard |
| `/services/e-commerce` | non | oui | implicite | non | oui | non | non | **3/5** | Chiffre sourcé (Fevad 2024). Le prix de 890 € pour un e-commerce mériterait son périmètre exact |
| `/services/referencement-seo` | non | oui | non | absent | absent | oui (1) | non | **2/5** | « Apparaissez en première page de Google » ; quatre statistiques sans source (93 %, 75 %, 5,3x, 8x) ; aucun prix |
| `/services/site-internet-restaurant` | oui | oui | oui | oui (« prix fixe », puis 890 €) | oui | non | non | **4/5** | Les 50 premiers mots répondent à tout. FAQ + schema, cas réel (Thiep's). Manquent un tableau et une date |
| `/exemples` | non | oui | oui (métiers) | non | oui | non | non | **2/5** | « Chaque exemple ci-dessous est un vrai site complet » laisse croire à des clients, alors que les pieds de page des démos disent « fictif » |
| `/portfolio` | non | oui | non | non | « tous livrés en 4 jours » | non | non | **2/5** | Aucun délai réel ni date par projet ; deux projets liés à l'équipe présentés comme clients |
| `/blog/combien-coute-site-internet-2026` | oui (en fin) | oui | oui | oui (fourchettes) | oui | oui (1) | oui (publication) | **4/5** | Tableau, FAQ + schema, date. Aucune source externe pour les fourchettes de prix ; auteur = Organization |
| `/blog` | | | | | | | | **1/5** | 76 mots, une seule carte |
| `/devis` | | | | | | | | sans objet | formulaire |

---

## 1.7 Claims à vérifier (aucune modification faite)

Pour chaque claim : texte exact, où, pourquoi c'est fragile, reformulation proposée (vouvoiement). La validation juridique revient à Sirven.

| Claim | Où | Fragilité | Reformulation proposée |
|---|---|---|---|
| « 100 % de clients satisfaits à la livraison » | home, bandeau de chiffres | Aucune mesure publiée : pratique commerciale trompeuse possible (C. conso. L121-2) | Retirer. Ou, seulement si c'est mesuré : « `[N]` projets livrés, `[N]` avis publiés sur `[plateforme]` » |
| « 17+ projets livrés en moins de 4 jours » ; « 17+ sites livres » (og-image) | home, og-image | Le portfolio en montre 11, dont 2 de l'équipe. « Moins de 4 jours » contredit « 4 jours ouvrés » | « `[N À FOURNIR PAR SIRVEN]` projets livrés depuis `[année]` », avec renvoi vers la future page « Nos projets en chiffres » |
| « garanti contractuellement » | home (FAQ, bandeau), essentiel, services, restaurant, blog, devis | **Présent dans la CGV** (art. 5 : « Le délai de livraison est garanti contractuellement ») mais sans sanction (art. 6 : nouvelle date communiquée en cas de retard) et avec des conditions de départ | « Délai de 4 jours ouvrés inscrit au devis et engagé dans nos CGV, à compter de la réception de vos contenus, de l'acompte et de la validation du brief. » |
| « ou c'est gratuit. » (animation du H1) ; « Livré en 4 jours ouvrés, ou c'est gratuit. » (cartes QR) | `punchline.js`, `/carte`, `/sirven`, `/erwin` | **Absent de la CGV.** Retiré au commit `b813ca0` puis réintroduit dans le hero (`3d3f0db`) sans modifier la CGV | Soit retirer, soit ajouter la clause dans la CGV (montant ou remise, conditions) **avant** de l'afficher. Décision de Sirven |
| « Si on dépasse le délai, vous ne payez pas » ; « Si nous dépassons ce délai, votre site est gratuit » | site-vitrine, restaurant (texte et **FAQPage**) | Contredit la CGV art. 6 | Aligner sur la CGV, comme ci-dessus |
| « Satisfait ou remboursé sous 14 jours » ; « on vous rembourse intégralement… Zéro risque pour vous » | essentiel, home FAQ (et FAQPage), blog, `fr.json`/`en.json` (« Money-back guarantee 14 days ») | **Absent de la CGV**, qui ne prévoit que la rétractation légale (art. 11) | Retirer, ou l'inscrire dans la CGV avec ses conditions. En attendant : « Pendant la phase de design, les allers-retours sont illimités jusqu'à validation de la maquette. » (déjà en CGV art. 7) |
| « Réponse sous 24h garantie » / « sous 2h » | home / essentiel | Deux promesses différentes, aucune contractualisée | « Nous vous répondons sous 24 h ouvrées. » partout |
| « Support 24/7 », « Surveillance des performances 24/7 », « 24/7 support inclus » (og-image) | home, og-image | Intenable pour une équipe de trois, absent de la CGV | Voir la définition unique de la maintenance en 1.4 |
| « 100% sur-mesure, jamais de template » | home | Contredit par l'option WordPress (thème léger, Elementor Pro) | « Design pensé pour votre activité, sans modèle générique. En WordPress, nous partons d'un thème léger que nous personnalisons. » |
| « Apparaissez en première page de Google » ; « Votre site sera indexé et positionné dès le lancement » | referencement-seo, home FAQ | Promesse de résultat proche du « garanti 1ère page » interdit par les règles SEO du projet | « Nous mettons en place les bases techniques et éditoriales pour que Google indexe et comprenne votre site dès le lancement. Le positionnement se construit ensuite, page par page. » |
| Statistiques SEO sans source (93 %, 75 %, 5,3x, 8x) ; « 72% du trafic vient du mobile » | referencement-seo, home | Aucune source ; le « 72 % » contredit le « plus de 60 % » sourcé de site-vitrine | Sourcer (`[À VÉRIFIER]` + source primaire) ou retirer |
| Avis « Flaynn », « Plateforme SaaS » | home, `fr.json`/`en.json` | Flaynn est un projet de l'équipe : `flaynn` est le pseudo de Sirven, commits signés `sirven@flaynn.fr`. Le texte reprend un avis attribué avant à « Sophie M. » (`3bdf62d`), réécrit en `a4a32ff` | Retirer des avis. Flaynn peut rester dans le portfolio avec la mention « projet interne de l'équipe » |
| Avis « Haykel, fondateur de Nakama » | home | Historique : « Thomas L. » puis « Nakama », texte réécrit par l'équipe (`a4a32ff`). Lien avec l'équipe non établi | Ne garder que si Haykel a écrit ou validé ce texte par écrit. Conserver la preuve `[À FOURNIR PAR SIRVEN]` |
| Avis « EMON » (en anglais) | home | Le commit `a4a32ff` indique qu'il a été rédigé par l'équipe « comme un vrai témoignage ». Il parle d'un « checkout flawless » alors qu'EMON est présenté comme un site vitrine | Même règle : texte écrit ou validé par le client, sinon retrait |
| Réalisation « Sirven » dans « Nos réalisations clients » | portfolio | Site de l'associé | Déplacer vers une page équipe, ou mentionner « site d'un associé » |
| « Chacun de ces sites tourne aujourd'hui pour un client » | home | Inclut Flaynn (équipe) ; Clara Martinez et SecurEats sont sur des sous-domaines `*.vercel.app` alors que le mockup affiche `clara-martinez.fr` et `secureats.fr` | « Des sites en ligne, réalisés pour nos clients et pour nos propres projets. » et un domaine affiché identique au lien |
| « Chaque exemple ci-dessous est un vrai site complet » | exemples | Ce sont des démos (les pieds de page disent « fictif ») | « Chaque exemple ci-dessous est une démo complète, conçue pour un métier précis. » (arbitrage 5 : toute démo est dite « démo ») |
| « Paiement 100% sécurisé », « Données 100% confidentielles » | home | « Transmises à aucun tiers » (confidentialité) alors que les leads partent vers n8n, le pipeline et SMTP | Décrire les sous-traitants réels dans la politique de confidentialité `[À VÉRIFIER PAR SIRVEN]` |
| Mentions légales en placeholders | mentions-legales | `{{NOM_COMPLET}}`, `{{ADRESSE}}`, `{{SIRET}}`, `{{TELEPHONE}}`, hébergeur : obligation LCEN art. 6 | Remplir `[À FOURNIR PAR SIRVEN]`. Hébergeur : Render Services, Inc. `[À VÉRIFIER : adresse légale sur render.com]` |

---

## 1.8 Couverture des services

| Service | Statut | Où |
|---|---|---|
| Site vitrine | **page dédiée** | `/services/site-vitrine`, plus la page de commande `/essentiel` |
| E-commerce | **page dédiée** | `/services/e-commerce` |
| Landing page | mention | puce du duel ; type de projet dans `/devis` |
| Application web / SaaS / MVP | mention (bloc tarifaire à 1 990 €) | home, JSON-LD, `/devis` |
| PWA | mention | home, portfolio (SecurEats) |
| Livraison WordPress | mention (bloc home) | home, essentiel, services, llms.txt |
| Reprise Wix ou Lovable, refonte | mention | home (« reprise d'un site Wix ou d'un prototype Lovable »), `/devis` (« Refonte »), CGV |
| SEO | **page dédiée** | `/services/referencement-seo` |
| Google Business Profile | mention indirecte, pas comme service | page restaurant (« alimenter votre fiche Google ») |
| Publicité (Google Ads, Meta Ads) | **absent** | |
| Automatisations (n8n, IA) | mention très faible | puce « IA intégrée », `/devis` (« Automatiser des processus internes ») ; n8n invisible |
| Maintenance | mention, sans page | home (carte + FAQ), essentiel, CGV art. 9 ; le lien « Maintenance » du footer pointe vers `#services` |
| Site restaurant (métier) | **page dédiée** | `/services/site-internet-restaurant` |

---

## 1.9 Technique

### Lighthouse 12.8.2 (mobile, throttling simulé, un seul passage par page)

| Page | Perf | A11y | BP | SEO | LCP | CLS | TBT | Poids |
|---|---|---|---|---|---|---|---|---|
| `/` | **68** | 97 | 100 | 100 | 2,8 s | 0 | **1 360 ms** | **732 KiB** (50 requêtes) |
| `/services/site-vitrine` | 100 | 96 | 100 | 100 | 1,8 s | 0 | 0 ms | 183 KiB |
| `/services/e-commerce` | 100 | 96 | 100 | 100 | 1,6 s | 0 | 0 ms | 183 KiB |
| `/blog/combien-coute-site-internet-2026` | 100 | 89 | 100 | 100 | 1,7 s | 0 | 0 ms | 187 KiB |
| `/essentiel` | 100 | 93 | 100 | 100 | 1,4 s | 0 | 0 ms | 110 KiB |

Détails sur la home :
- TBT : `gl-bg.js` (tâche longue de 1 201 ms, 763 ms d'exécution), `preloader.js` (425 ms) et `exemples/soul.js` (413 ms).
- Poids : les images des démos sont chargées sur la home (`burger-fries.webp` 98 KiB, `burger-hero.webp` 81 KiB), plus `fraunces-italic-var.woff2` (81 KiB).
- Le budget de la charte (LCP < 1,8 s, poids du premier écran < 500 ko) n'est pas tenu sur la home.

Accessibilité en échec :
- `color-contrast` sur les 5 pages (liens et texte du footer) ;
- `label-content-name-mismatch` sur la home ;
- `heading-order` et `link-in-text-block` sur l'article.

### Autres points

| Point | Constat |
|---|---|
| hreflang | seulement `hreflang="fr"` auto-référent sur `/` et `/essentiel`, sans `x-default` ni `en`. Il n'existe aucune URL anglaise : pas de hreflang possible en l'état |
| Canonicals | auto-référents et égaux à l'URL finale sur les 11 URLs du sitemap et les pages légales ; absents sur les démos (noindex) |
| Pages orphelines | `/essentiel`, `/services/site-internet-restaurant` et `/exemples` n'ont **aucun lien HTML entrant**. L'article prix n'en a que 2 |
| 404 | code 404 réel et `noindex` sur les URLs inconnues, `/blog/inexistant` et `/exemples/inexistant` |
| Images | 10 fichiers de plus de 80 Ko (webp des démos, PNG des cartes) ; 20 `<img>` sans dimensions, toutes dans les démos |
| Largeur 320 px (prod) | débordement horizontal sur `/services/site-vitrine` (4 px), `/services/e-commerce` (4), `/services/referencement-seo` (12), `/services/site-internet-restaurant` (4) et `/exemples` (10). Le H1 est coupé : son bord droit est à 391 px sur site-vitrine et à 460 px sur referencement-seo, pour un viewport de 320. La charte qualité en fait un test de non-régression |
| Title / description | conformes sur toutes les pages indexables (la home a un title de 60 caractères pile) ; dépassements seulement sur des pages noindex |
| Tirets longs et emoji (règle projet) | tirets : 2 sur la home, 2 dans chaque locale, et dans les pieds de page des démos ; emoji : 32 sur la home, 23 sur essentiel, 28 sur devis, plus les textes JS |
