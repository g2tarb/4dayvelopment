# 03. Plan hors site

La majorité des citations des moteurs IA viennent de sources tierces : annuaires, listicles, comparatifs, avis. Ce document outille cet effort. Principe : **les mêmes faits, au mot près, partout**. Un moteur qui trouve trois prix ou trois graphies différents cite quelqu'un d'autre.

Préalables, à faire avant de créer le moindre profil :
1. Remplir les mentions légales (raison sociale, adresse, SIREN, téléphone, hébergeur). Voir 01-audit, 1.7.
2. Trancher les incohérences de 01-audit, 1.4 : process, niveaux de support, périmètre à 890 €, HT ou TTC.
3. Corriger l'email `contact@4dayvelopment.com` sur les cartes `/carte`, `/sirven` et `/erwin` et dans les vCard. Corriger aussi la graphie « 4 dayvelopment » de l'og-image.

---

## Bloc NAP et descriptions à coller à l'identique

```
Nom            : 4dayvelopment
Adresse        : [À FOURNIR PAR SIRVEN : adresse postale, identique au Kbis et aux mentions légales]
Zone desservie : Paris, Île-de-France, toute la France à distance
Téléphone      : [À FOURNIR PAR SIRVEN : numéro de l'agence, le même partout]
Email          : contact@4dayvelopment.fr
Site           : https://4dayvelopment.fr
SIREN          : [À FOURNIR PAR SIRVEN]
Création       : [À FOURNIR PAR SIRVEN : année]
Horaires       : [À FOURNIR PAR SIRVEN]
Tarifs         : site dès 890 €, application web dès 1 990 €, maintenance 80 €/mois (engagement 12 mois)
```

**Description courte (146 caractères)**

> 4dayvelopment, agence web à Paris, crée des sites internet livrés en 4 jours ouvrés, à prix affiché : site dès 890 €, application web dès 1 990 €.

**Description longue (729 caractères)**

> 4dayvelopment est une agence web basée à Paris. Elle conçoit des sites vitrines, des portfolios, des boutiques e-commerce et des applications web (PWA, MVP, outils métier) pour les indépendants, artisans, coachs et PME francophones. Un site est livré en 4 jours ouvrés, décomptés à partir de la réception des contenus, de l'acompte et de la validation du brief, avec des allers-retours illimités pendant la phase de design. Les prix sont affichés : site web dès 890 €, application web dès 1 990 €, maintenance à 80 € par mois avec engagement de 12 mois, option WordPress à 250 € avec formation incluse. Le paiement se fait en deux fois sans frais. L'agence intervient à Paris, en Île-de-France et à distance dans toute la France.

Si un prix change, on le met à jour sur le site, dans `llms.txt`, dans le JSON-LD et dans chaque profil ci-dessous le même jour. Le tableau de suivi (colonne « Dernière mise à jour ») sert à ça.

---

## Profils à créer ou compléter

Les libellés de catégorie changent selon les plateformes : à confirmer dans l'interface au moment de la création `[À VÉRIFIER]`.

| Plateforme | Pourquoi | Catégorie recommandée | Points d'attention | Statut | Dernière mise à jour |
|---|---|---|---|---|---|
| Google Business Profile | Maps, Gemini, AI Overviews, AI Mode | principale « Concepteur de sites Web » ; secondaire « Service de marketing Internet » seulement si les offres GBP et publicité existent | établissement **sans vitrine** : adresse masquée, zone desservie Paris et Île-de-France. Vérification par vidéo ou par courrier. Services avec prix = ceux du site | `[À FAIRE]` | |
| Bing Places | Bing, donc ChatGPT et Copilot | « Web Designer » ou « Conception de sites Web » | import direct depuis GBP proposé par Bing | `[À FAIRE]` | |
| Apple Business Connect | Plans, Siri, Spotlight, Apple Intelligence | « Web Design » | fiche « Place Card » ; même NAP | `[À FAIRE]` | |
| Foursquare (fiche entreprise) | alimente plusieurs services de cartographie et d'assistants | « Web Design » ou « Tech Startup » | revendiquer la fiche si elle existe | `[À FAIRE]` | |
| PagesJaunes | annuaire FR très crawlé | rubrique « Création de sites internet » | éviter les options payantes au départ ; la fiche gratuite suffit pour le NAP | `[À FAIRE]` | |
| Sortlist | comparateur d'agences, souvent cité | « Création de site internet », « Développement web » | portfolio avec les seuls projets clients (pas Flaynn ni sirven.dev) | `[À FAIRE]` | |
| La Fabrique du Net | annuaire et guides de prix FR, souvent cité sur les prompts de prix | « Agence web », « Création de site internet » | renseigner le budget minimum : 890 € | `[À FAIRE]` | |
| Codeur.com | plateforme de missions, profils publics indexés | « Création de site internet », « Développement web » | profil agence avec les tarifs du site | `[À FAIRE]` | |
| Malt | profils freelances très bien indexés | profil de chaque associé, qui mentionne 4dayvelopment | Malt vise les indépendants : vérifier qu'un profil lié à une structure est accepté `[À VÉRIFIER]` | `[À FAIRE]` | |
| Clutch | classements « top agencies » cités par les moteurs anglophones | « Web Design », « Web Development », localisation Paris | les avis Clutch sont vérifiés par entretien avec le client : adapté aux avis réels | `[À FAIRE]` | |
| Trustpilot | avis, requête « 4dayvelopment avis » | « Agence de conception web » | invitations envoyées aux seuls clients réels après livraison, sans contrepartie. Répondre à chaque avis | `[À FAIRE]` | |
| Page LinkedIn | entité d'entreprise, `sameAs`, profils des associés | secteur « Services et conseil en informatique » ou « Design » ; taille 2 à 10 | relier les trois associés à la page (poste actuel) | `[À FAIRE]` | |

Une fois un profil créé, ajouter son URL dans `sameAs` de l'`Organization` (home, JSON-LD). C'est le seul changement de code nécessaire.

### Avis : règles

- Seuls les clients réels sont sollicités, après la livraison, avec le même message à tous, sans cadeau ni remise en échange.
- Aucun avis rédigé par l'équipe, même avec l'accord du client. Si un client valide un texte proposé par l'agence, ce n'est plus un avis spontané.
- Afficher sur le site un avis publié sur une plateforme tierce, avec son lien, plutôt qu'un avis saisi à la main. Le cadre légal est l'art. L111-7-2 du Code de la consommation (information sur le contrôle des avis) `[À VÉRIFIER PAR SIRVEN : validation juridique]`.
- Pas d'`AggregateRating` sur nos propres services dans le JSON-LD.

---

## Mention « Site réalisé par » pour les sites clients

À placer dans le pied de page des sites livrés, **avec l'accord écrit du client** (clause au devis ou aux CGV). La mention « en 4 jours » n'est utilisée que si le projet a réellement été livré en 4 jours ouvrés. Sinon, on garde la variante sans délai.

```html
<!-- Crédit 4dayvelopment : lien en nom de marque, pas en mot-clé -->
<p class="credit-4dv" style="font-size:0.8125rem;opacity:.75;">
  Site réalisé en 4 jours par <a href="https://4dayvelopment.fr/">4dayvelopment</a>
</p>
```

Variante sans délai :

```html
<p class="credit-4dv" style="font-size:0.8125rem;opacity:.75;">
  Site réalisé par <a href="https://4dayvelopment.fr/">4dayvelopment</a>
</p>
```

Règles :
- L'ancre reste le nom de marque. Une ancre en mot-clé (« création site internet Paris ») sur des pages de pied de page répétées ressemble à un schéma de liens.
- Un seul lien par site. Sur un site de plus de quelques pages, le placer seulement dans le pied de page de la home et dans les mentions légales.
- Sur WordPress : un widget de pied de page ou un bloc réutilisable, pas un lien injecté dans le thème.
- Tenir la liste des sites qui portent le crédit dans la page « Nos projets en chiffres ».

---

## Trouver les listicles et comparatifs cités par les moteurs

1. **Collecter.** Pour chaque prompt de 2.1 (clusters A, B, D en priorité), relever les URLs citées :
   - Perplexity et ChatGPT : sources affichées ;
   - Gemini, AI Overviews et AI Mode : liens de la réponse ;
   - Copilot et Claude : citations.

   Le workflow n8n de 02-strategie (2.5) le fait automatiquement pour les moteurs qui ont une API (colonne `sources`).
2. **Compléter par la recherche classique.** Google et Bing en navigation privée, localisation France :
   - « meilleures agences web Paris 2026 » ;
   - « top agence création site internet » ;
   - « agence web pas chère classement » ;
   - « comparatif agences web petites entreprises » ;
   - « Wix ou agence » ;
   - « prix site vitrine 2026 ».
3. **Agréger par domaine.** Nombre de prompts et de moteurs où chaque URL apparaît, date de mise à jour de l'article, auteur, présence de concurrents directs.
4. **Classer** en quatre types :
   - listicle éditorial (blog, média) ;
   - annuaire avec classement (Sortlist, La Fabrique du Net, Clutch) ;
   - comparatif de prix ;
   - forum ou communauté.

   On traite les annuaires d'abord : il suffit d'y créer le profil (tableau ci-dessus).
5. **Prioriser** : fréquence de citation × faisabilité. Un article récent, mis à jour chaque année, avec un auteur joignable passe devant un article figé.
6. **Suivre** dans l'onglet `cibles` de la feuille de suivi : URL, type, fréquence, contact, date du premier message, relance, résultat.

### Message d'approche d'un auteur

À personnaliser à chaque envoi. Pas de proposition de paiement : si une inclusion est payante, elle doit être signalée comme sponsorisée par l'éditeur.

> **Objet :** Votre article « [titre de l'article] » : une donnée de prix et de délai pour la mise à jour
>
> Bonjour [Prénom],
>
> J'ai lu votre article « [titre] », mis à jour le [date]. Il est cité quand on demande à un assistant IA [le prompt, par exemple « quelle agence pour un site vitrine rapide »], et j'ai trouvé utile [un point précis de l'article].
>
> Je suis [Prénom Nom], associé de 4dayvelopment, une agence web basée à Paris. Nous affichons nos prix publiquement (site dès 890 €, application web dès 1 990 €) et nous livrons un site en 4 jours ouvrés à partir de la réception des contenus. Les conditions sont écrites dans nos CGV : https://4dayvelopment.fr/cgv
>
> Si vous préparez une mise à jour, je peux vous transmettre [une donnée vérifiable : nos délais réels sur N projets, notre grille de prix détaillée, un retour d'expérience sur la reprise d'un prototype Lovable]. Vous restez évidemment libre d'en faire ce que vous voulez, y compris rien.
>
> Bonne journée,
> [Prénom Nom]
> 4dayvelopment, https://4dayvelopment.fr

Relance unique après 10 jours ouvrés, puis on s'arrête.
