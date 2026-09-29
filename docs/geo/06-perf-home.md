# 06. Performance de la home face au budget de la charte

Mesure du 28 septembre 2026 sur la production, avant le lot « maillage, typographie » (plan du 28 septembre, unité U9). Rien n'est corrigé ici : ce rapport tranche seulement où la home se situe face au budget de `.claude/charte-qualite.md` (section 7).

## Verdict

Aucune ligne n'est KO. Deux lignes sont hors cible, sous le seuil éliminatoire :
- le LCP, à 1,88 s pour une cible de 1,8 s ;
- les requêtes du premier écran, 26 pour une cible de 25.

Le verdict se fonde sur la série en throttling simulé (méthode standard de Lighthouse). La série en throttling appliqué est donnée pour comparaison.

| Ligne du budget | Cible | Éliminatoire | Médiane simulée | Médiane appliquée | Verdict |
|---|---|---|---|---|---|
| LCP (mobile, 4G lente) | < 1,8 s | 2,5 s | 1,88 s | 2,34 s | hors cible |
| INP | < 130 ms | 200 ms | non mesuré en labo | non mesuré en labo | sans verdict (TBT indicatif : 66 ms simulé, 545 ms appliqué) |
| CLS | < 0,02 | 0,1 | 0 | 0,001 | OK |
| JS transféré initial | < 90 Ko gz | 150 Ko | 49,9 Ko | 50,4 Ko | OK |
| CSS transféré | < 45 Ko gz | 70 Ko | 36,4 Ko | 36,4 Ko | OK |
| Poids du premier écran | < 500 Ko | 900 Ko | 214 Ko | 214 Ko | OK |
| Requêtes du premier écran | < 25 | 40 | 26 | 26 | hors cible |

Pour information :
- **Score Lighthouse** : 99 en simulé (passages : 99, 96, 99) et 81 en appliqué (passages : 70, 90, 81).
- **Poids total de la page** : 733 Ko en simulé et 1 225 Ko en appliqué. Il comprend le site de démo que le diaporama du téléphone charge après le premier écran.

## Méthode

- **Outil :** Lighthouse 12.8.2 lancé par `npx`, sans dépendance ajoutée, avec le Chrome local (HeadlessChrome 153, macOS). Profil mobile par défaut : 4G lente (150 ms de latence, 1,6 Mbps) et processeur bridé 4x.
- **Cible :** `https://4dayvelopment.fr/`, le 28 septembre 2026 à 15 h 13 UTC. La production servait le commit `d64e7fd` (`/api/version`).
- **Deux séries de trois passages**, médiane de chaque série :

  ```bash
  for mode in simulate devtools; do for i in 1 2 3; do
    npx -y lighthouse@12.8.2 https://4dayvelopment.fr/ --quiet --output=json \
      --output-path=$mode-$i.json --only-categories=performance \
      --throttling-method=$mode --chrome-flags="--headless=new"
  done; done
  ```

- **Premier écran** = requêtes terminées avant l'événement `load` (`networkEndTime` inférieur ou égal à `observedLoad`). JS et CSS = poids transférés (compressés) de ces requêtes, par type.
- **INP** : il faut une interaction réelle, ce que Lighthouse en navigation ne mesure pas. Le TBT est donné à titre indicatif, sans verdict.

## Contributeurs des lignes hors cible

**LCP (1,88 s)**
1. **Le rendu, pas le chargement.** L'élément LCP est un texte : le découpage n'a pas de phase de chargement de ressource. Le serveur répond en 124 ms. Le retard de rendu de l'élément est de 292 ms, et l'écart FCP → LCP d'environ 0,6 s en simulé.
2. **`style.css` bloque le rendu** : 36 Ko compressés ; Lighthouse estime le gain possible à 260 ms. `js/boot.js` (1 Ko) bloque aussi.
3. **Les deux polices variables** du premier écran : Syne (34 Ko), qui sert aux titres, et Inter (47 Ko).

**Requêtes du premier écran (26)**
1. **19 scripts** : `boot.js`, `main.js` et 17 modules ES servis sans bundler (voir le commit `43171c2`, qui le qualifiait de choix structurel).
2. **2 polices** (Syne, Inter).
3. **2 images** (logo SVG, `portfolio/da/clara-martinez.webp`), plus le document, la feuille de style et le manifeste.

**TBT en throttling appliqué** (indicatif, 253 à 1 238 ms selon le passage)
- Tâches longues de `js/modules/gl-bg.js` (le fond WebGL) : 256, 252, 236 et 172 ms au passage le plus lent.
- `exemples/soul.js`, script du site de démo chargé dans l'iframe du téléphone : environ 1,1 s d'exécution dans la fenêtre mesurée.

## Écart avec les mesures précédentes

- **Commit `43171c2`** : LCP de 1 308 ms, CLS nul, fenêtre critique de 272 Ko et 33 requêtes critiques. Le message du commit décrit une 4G lente émulée (1,6 Mbps, 150 ms) avec un processeur bridé 4x, sans préciser l'outil ni la définition de la fenêtre critique. Les 1,3 s ne sont donc pas directement comparables aux 1,88 s de la série simulée de Lighthouse. Le poids du premier écran (214 Ko aujourd'hui) confirme en revanche le gain annoncé par ce commit sur le diaporama.
- **Audit du 23 septembre** : score 68, LCP 2,8 s et TBT 1 360 ms. Ces valeurs sont proches de la série appliquée du 28 septembre (score 70 à 90, LCP 2,34 s, TBT 253 à 1 238 ms). L'écart vient surtout du TBT, qui varie avec `gl-bg.js` et l'iframe de démo. Les deux mesures se réconcilient donc par la méthode : le throttling appliqué pénalise davantage l'exécution JS que le throttling simulé.

## Suite

Le plan de corrections (backlog 35) reste à ouvrir d'après ce rapport. Il n'est pas dans ce lot. Premières pistes, par gain estimé :
- CSS critique et chargement différé du reste de `style.css` ;
- un bundle pour les modules du premier écran ;
- `gl-bg.js` découpé ou démarré après le LCP.

## Mesure du 29 septembre 2026, après les corrections

Même protocole (Lighthouse 12.8.2, throttling simulé, profil mobile), sur la production au commit `648a87a`, médiane de six passages. Corrections : #8 (revue design), #9, #10 et #11 (modules de bas de page, d'effet et de la démo du téléphone importés après `load`, `utils.js` préchargé, image de `#process` en lazy, locales chargées à la demande).

| Ligne du budget | Cible | Éliminatoire | 28 sept. | 29 sept. | Verdict |
|---|---|---|---|---|---|
| LCP (mobile, 4G lente) | < 1,8 s | 2,5 s | 1,88 s | 1,78 s (passages de 1,70 à 1,86 s) | OK |
| CLS | < 0,02 | 0,1 | 0 | 0 | OK |
| JS transféré initial | < 90 Ko gz | 150 Ko | 49,9 Ko | 18 Ko | OK |
| CSS transféré | < 45 Ko gz | 70 Ko | 36,4 Ko | 38 Ko | OK |
| Poids du premier écran | < 500 Ko | 900 Ko | 214 Ko | 165 Ko | OK |
| Requêtes du premier écran | < 25 | 40 | 26 | 15 | OK |

Score Lighthouse : 100 (passages : 99 à 100). TBT : 0 ms.

Le LCP simulé est bimodal (1,70 s ou 1,85 s), indépendamment du temps de réponse du serveur : il se joue sur les requêtes que la simulation range avant le premier affichage. Le reste du chemin critique tient au CSS (38 Ko) et aux deux polices préchargées (Syne 35 Ko, Inter 48 Ko). Prochain levier, si la cible doit être tenue à chaque passage : CSS critique en ligne et chargement différé du reste de `style.css`.
