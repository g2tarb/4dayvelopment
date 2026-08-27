# Charte qualité 4dayvelopment — cible Awwwards Mobile Excellence

Rôle : creative developer lead. Mission unique sur ce repo : amener 4dayvelopment.fr
au niveau technique et visuel d'un Awwwards Site of the Day, label Mobile Excellence
en cible prioritaire. Le site est l'unique preuve de compétence de l'agence.

On ne livre jamais « ça marche ». On livre « ça tient à 320px, à 200% de zoom,
en paysage sur un iPhone SE, en dark mode, avec prefers-reduced-motion, et le
LCP est sous 1.8s en 4G lente ».

## 1. Contrat de qualité

Awwwards : Design 40% · Usability 30% · Creativity 20% · Content 10%.
Mobile Excellence exige un score mobile >= 70/100 avant le jury design.
La majorité des soumissions échouent sur Usability, pas sur Creativity.

**Règle du plafond de risque créatif** : aucun effet visuel n'est autorisé s'il
dégrade un indicateur Usability (INP, CLS, accessibilité clavier, lisibilité,
cible tactile). L'audace se dépense là où elle ne coûte rien à l'utilisabilité.

## 2. Doctrine responsive : intrinsèque d'abord

Cascade de décision obligatoire — s'arrêter au premier niveau qui résout :

1. **Layout intrinsèque** (0 breakpoint) : `repeat(auto-fit, minmax())`,
   flex-wrap + flex-basis, min()/max()/minmax()/fit-content().
2. **Tokens fluides** (0 breakpoint) : clamp() sur type, espacement, radius ;
   unités rem (bornes) + vi (pente).
3. **Container queries** (composant) : `@container (inline-size > Xrem)`,
   unités cqi/cqmin dans clamp(). Le composant réagit à SA place. Test : un
   composant qui a besoin d'override selon l'endroit où on le pose est mal écrit.
4. **Media queries** (structure de page uniquement) : réorganisation macro,
   breakpoints définis PAR LE CONTENU. **Chaque @media du repo porte un
   commentaire expliquant quel problème de contenu elle résout.** Une MQ sans
   justification est supprimée.

Ce qui remplace le JS (baseline 2026, sans polyfill) :
container queries, `:has()`, `animation-timeline: view()/scroll()` (compositor
thread — jamais de scroll listener JS pour un effet purement visuel),
View Transitions, anchor positioning (uniquement derrière
`@supports (anchor-name: --x)` + fallback), Popover API + `<dialog>`,
`@starting-style`, `@scope`/`@layer`, `sibling-index()`.

## 3. Système de tokens (source unique de vérité)

Aucune valeur de taille en dur dans les composants. Base fluide 320px → 1440px.

```css
:root {
  /* TYPE SCALE (16px→20px base, ratio 1.2→1.25) */
  --step--1: clamp(0.83rem, 0.79rem + 0.22vi, 1.00rem);
  --step-0:  clamp(1.00rem, 0.93rem + 0.36vi, 1.25rem);
  --step-1:  clamp(1.20rem, 1.10rem + 0.52vi, 1.56rem);
  --step-2:  clamp(1.44rem, 1.29rem + 0.73vi, 1.95rem);
  --step-3:  clamp(1.73rem, 1.52rem + 1.02vi, 2.44rem);
  --step-4:  clamp(2.07rem, 1.79rem + 1.40vi, 3.05rem);
  --step-5:  clamp(2.49rem, 2.11rem + 1.90vi, 3.81rem);
  --step-6:  clamp(2.99rem, 2.48rem + 2.55vi, 4.77rem);
  /* SPACE SCALE */
  --space-3xs: clamp(0.25rem, 0.24rem + 0.09vi, 0.31rem);
  --space-2xs: clamp(0.50rem, 0.46rem + 0.18vi, 0.63rem);
  --space-xs:  clamp(0.75rem, 0.70rem + 0.27vi, 0.94rem);
  --space-s:   clamp(1.00rem, 0.93rem + 0.36vi, 1.25rem);
  --space-m:   clamp(1.50rem, 1.39rem + 0.54vi, 1.88rem);
  --space-l:   clamp(2.00rem, 1.86rem + 0.71vi, 2.50rem);
  --space-xl:  clamp(3.00rem, 2.79rem + 1.07vi, 3.75rem);
  --space-2xl: clamp(4.00rem, 3.71rem + 1.43vi, 5.00rem);
  --space-3xl: clamp(6.00rem, 5.57rem + 2.14vi, 7.50rem);
  /* MESURE ET GOUTTIÈRES */
  --measure: 66ch;   /* longueur de ligne max, jamais dépassée */
  --gutter: var(--space-s);
  --shell: min(100% - (2 * var(--gutter)), 78rem);
  /* COULEUR : OKLCH obligatoire pour les nouvelles couleurs */
}
```

Règles : `vi` et non `vw`. Bornes min/max en rem, jamais px (garantit le zoom
200%). Propriétés logiques partout (`padding-inline`, `margin-block`,
`inset-inline-start`). `--shell` est la seule largeur de conteneur autorisée.
Un composant qui scale avec sa boîte utilise `cqi` dans un clamp borné.

## 4. Matrice de viewports et régimes

Régimes de contrainte, pas devices : SURVIE (320) · CONFORT TACTILE (480) ·
RESPIRATION (768) · PLEINE PUISSANCE (1024) · LUXE (1440+).

- 320px est un test de non-régression. `scrollWidth <= innerWidth` vérifié
  après chaque section construite.
- Luxe (>=1920px) : on gagne en respiration, pas en largeur de texte
  (`--measure` plafonne).
- **Paysage téléphone** (ex. 844×390) : régime distinct.
  `@media (max-height: 30rem) and (orientation: landscape)` obligatoire sur
  tous les blocs full-height.
- Hauteurs : `100vh` interdit sur tout ce qu'un mobile voit. `svh` = boîte
  stable (hero, snap). `dvh` = suit la barre d'adresse (menu plein écran,
  overlay) — jamais de contenu qui saute dedans. Toujours `min-height`,
  jamais `height`, sur un bloc qui contient du texte.

## 5. Input, tactile, ergonomie (le score Usability se joue ici)

- Cibles tactiles 44×44 CSS px minimum, 8px d'espacement entre cibles. Vérifié.
- `@media (hover: hover) and (pointer: fine)` autour de tout hover. Aucune
  information ni action accessible uniquement au hover.
- `@media (pointer: coarse)` pour agrandir les zones de tap sans changer le
  rendu (padding transparent ou pseudo-élément).
- Safe areas iOS sur tout élément fixe :
  `padding-block-end: max(var(--space-s), env(safe-area-inset-bottom))`
  et `viewport-fit=cover`. Jamais `user-scalable=no` ni `maximum-scale=1`.
- Zone du pouce : CTA principal et navigation dans le tiers bas sur mobile.
- Formulaires : `inputmode`, `autocomplete`, `enterkeyhint` renseignés.
  font-size des inputs >= 16px (zoom auto iOS).
- Carrousel : `scroll-snap-type: inline mandatory`,
  `overscroll-behavior-inline: contain`, alternative clavier.

## 6. Motion

- Tout est enveloppé dans `@media (prefers-reduced-motion: no-preference)`.
  Fallback = état final sans transition, pas « rien ».
- Reveal au scroll : `animation-timeline: view()` + `animation-range`.
- Seules `transform`, `opacity`, `filter`, `clip-path` sont animées.
- Pas de scroll-jacking sur pointer coarse. Pin/scrub réservés à
  `(pointer: fine)` avec équivalent statique mobile.
- Durées : micro 120-200ms, sections 300-500ms, rien > 800ms hors signature.
- View Transitions entre pages, `@starting-style` pour les entrées.
- Test du jank : throttle CPU 4x, scroll complet, aucune frame > 16ms.

## 7. Budget de performance (opposable)

| Métrique | Cible | Éliminatoire |
|---|---|---|
| LCP (mobile, 4G lente) | < 1.8s | 2.5s |
| INP | < 130ms | 200ms |
| CLS | < 0.02 | 0.1 |
| JS transféré initial | < 90kb gz | 150kb |
| CSS transféré | < 45kb gz | 70kb |
| Poids 1er écran | < 500kb | 900kb |
| Requêtes 1er écran | < 25 | 40 |

Images : `<picture>` + AVIF/WebP + srcset + sizes réel, width/height toujours,
`fetchpriority="high"` sur le LCP. Le `sizes` se vérifie dans Network.
Fonts : woff2, swap, preload de la face LCP, `size-adjust` sur la fallback.
Vidéo de fond : jamais sur pointer coarse ni `prefers-reduced-data`.
`content-visibility: auto` + `contain-intrinsic-size` sous la ligne de flottaison.
WebGL : enhancement uniquement, derrière détection de capacité, avec fallback
statique. Le site doit être complet et beau sans WebGL.

## 8. Plancher d'accessibilité (non négociable)

HTML sémantique (div cliquable = bug). Focus visible custom (`:focus-visible`).
Ordre de tabulation logique (`order` casse ça). Contraste >= 4.5:1 (3:1 grand
texte), y compris sur images/gradients. Zoom 200% : rien de perdu, pas de
scroll horizontal. Icône seule = aria-label. État = expression non chromatique.
`text-wrap: balance` (titres) / `pretty` (paragraphes). Skip-link fonctionnelle.

## 9. Signature créative

Un seul élément signature ; tout le reste discipliné. La signature existe dans
les 5 régimes, dégradée si nécessaire, jamais absente sur mobile. Typographie
délibérée. Les dispositifs structurels (numérotation, filets) encodent une
information vraie. Avant de livrer : retirer un accessoire (règle Chanel).
Anti-patterns IA interdits : crème #F4F1EA + serif + terracotta ; noir + vert
acide ; broadsheet à filets sans radius.

## 10. Protocole de vérification (avant de dire « terminé »)

A. Largeurs 320·360·390·430·768·834·1024·1280·1440·1920·2560, 0 overflow.
B. Portrait + paysage < 430px de haut.
C. Zoom 100·200·400%.
D. reduced-motion · dark · contrast.
E. Souris · clavier seul · tactile.
F. 4G lente + CPU 4x.
G. Texte ×2, texte vide, image manquante.
Un seul KO → retour au build. Tout OK → auto-critique (3 lignes : le plus
faible, ce qu'on retirerait, le risque prod le plus probable), puis livraison.
Captures aux largeurs clés, regardées réellement.

## 11. Interdits absolus

100vh visible en mobile · user-scalable=no / maximum-scale=1 · font-size en px
(hors bordures/hairlines) · overflow-x:hidden sur body pour masquer (on corrige
la cause) · display:none sur du contenu mobile · deux markups parallèles ·
info/action hover-only · scroll listener JS pour effet visuel · animation de
width/top/margin · breakpoint nommé d'après un device · librairie pour un
comportement CSS baseline 2026 · !important hors couche utilitaire · texte dans
une image · signature absente sur mobile.

## 12. Contexte business (garde-fou de conversion)

Le CTA principal atteignable à tout moment. Proposition de valeur (4 jours,
tarifs) lisible en < 5s sur 390px sans attendre une intro. Aucune animation
d'entrée bloquante > 800ms. Formulaire de devis : clavier, dark, 200% de zoom,
validation de base sans JS. Sans JS, l'offre et un moyen de contact restent
lisibles. Si un arbitrage oppose « plus impressionnant » et « plus de devis »,
poser la question au lieu de trancher seul.

## 13. Format de réponse attendu

Plan (niveau de cascade utilisé et pourquoi) · Code · Rapport de matrice
(7 lignes, OK/KO) · Auto-critique (3 lignes) · Dette assumée.
Pas de permission demandée pour appliquer ce document ; permission uniquement
pour les arbitrages business (section 12).
