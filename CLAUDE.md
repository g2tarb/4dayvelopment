# CLAUDE.md — 4dayvelopment

Site vitrine d'agence web. HTML statique servi par Express (`server.js`) depuis `public/`.
Stack : vanilla JS + fond WebGL maison (`public/js/modules/gl-bg.js`, zéro dépendance — ne pas réintroduire Three.js). Fonts variables auto-hébergées dans `public/fonts/` (Syne + Inter, pas de Google Fonts). Contact via Nodemailer + webhook n8n.
Blog publié dynamiquement via `POST /api/blog/publish` (template `buildArticleHTML`).
`/portfolio` présente les réalisations clients réelles ; `/exemples` présente les démos métier
d'entreprises fictives, autonomes dans `public/exemples/` (JS externe obligatoire — la CSP
interdit le script inline), montrées sur la home dans un mockup iPhone (section `#exemples`,
module `js/modules/demos.js`). Les deux pages coexistent : la nav pointe vers /portfolio.

## Nav et pied de page : une seule source
- La nav et le pied de page viennent de `partials/nav.html` et `partials/footer.html`.
  Ne jamais les modifier dans une page : modifier le partiel, puis lancer
  `npm run sync:partials`, qui les recopie entre les marqueurs `<!-- partial:nav -->` et
  `<!-- partial:footer -->` de chaque page, et pose `aria-current="page"` selon la table
  `ACTIVE` de `scripts/sync-partials.js`.
- `server.js` lit les partiels au démarrage pour les articles générés (Blog actif) et refuse
  de démarrer s'ils manquent.
- `npm run check:seo` échoue si une page diverge des partiels.
- Une nouvelle page avec nav ou pied de page : poser les deux marqueurs, puis lancer la synchronisation.

## SEO 4DV

### Positionnement
- Agence web Paris, sites livrés en 4 jours.
- Cibles : solopreneurs, artisans, coachs, PME francophones.
- Mot-clé pilier : « création site internet Paris ».

### Règles SEO
- Le HTML critique (title, meta, H1, contenu texte, liens) est TOUJOURS dans le HTML servi
  par le serveur, jamais injecté en JS après chargement.
- 1 page = 1 intention de recherche = 1 H1 unique.
- title <= 60 caractères. meta description 140-160 caractères.
- `robots.txt` ne doit JAMAIS bloquer : GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot,
  Google-Extended.

### Interdits
- Aucun faux avis, aucun témoignage / note inventés (droit FR : pratiques commerciales
  trompeuses, art. L121-2 à L121-4 du Code de la consommation).
- Pas d'`aggregateRating` self-serving sur `Organization` / `LocalBusiness` (ignoré par Google
  depuis 2019, sous surveillance renforcée depuis mars 2026).
- Pas de promesse type « garanti 1ère page ».
- Pas d'em-dash, pas d'emoji dans le contenu rédactionnel du site.

## Charte qualité (obligatoire)
Toute intervention sur ce repo suit `.claude/charte-qualite.md` : cible Awwwards
Mobile Excellence, cascade intrinsèque avant media queries, budget de perf
opposable, protocole de vérification par matrice avant de dire « terminé »,
format de réponse plan / code / rapport / auto-critique / dette.
