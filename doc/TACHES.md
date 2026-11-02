
# TÂCHES — Journal de suivi des demandes (session opencode)

Fichier de sauvegarde du fil des tâches demandées au projet **Suivi Flux Merch**
(`D:\Projet IT\2604\typeTrello\merch`). Plusieurs sessions opencode peuvent le
lire et ajouter de nouvelles entrées. Chaque nouvelle demande ajoute une ligne
en haut de la table ; l'ancien travail reste archivé ci-dessous avec son statut.

> Convention : statut `✅ Terminé` / `🔄 En cours` / `⏳ En attente`.
> Après livraison, on coche la ligne, jamais on ne la supprime.

---

## 📋 Suivi rapide

| #  | Priorité | Tâche                                                                                                                                          | Statut      |
| -- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 32 | haute     | Page de login : réactivation de la liste compte « pré-remplir » avec les VRAIS utilisateurs (GET /users public, sans comptes démo)            | ✅ Terminé |
| 31 | haute     | Page de login : suppression du bloc « Pré-remplir la démo » (comptes démo supprimés longtemps) — navigation privée propre                          | ✅ Terminé |
| 30 | haute     | Session persistée sur localStorage → les liens directs (nouvel onglet) gardent l'utilisateur connecté                                          | ✅ Terminé |
| 29 | haute     | Liens directs partageables (carte / board / pôle) pour utilisateurs connectés                                                                 | ✅ Terminé |
| 28 | moyenne   | Kanban : réordonner les colonnes (étapes) par glisser-déposer de l'en-tête                                                                  | ✅ Terminé |
| 27 | moyenne   | Étapes/Steps : remplacement des flèches ↑/↓ par le glisser-déposer seul (kanban & fiche)                                                   | ✅ Terminé |
| 26 | moyenne   | Historique : date jj/mm/aaaa + heure hh:mm:ss (heure locale) + détails complets de l'action                                                    | ✅ Terminé |
| 25 | moyenne   | Fiche identitaire : Historique des modifications dans une zone à hauteur fixe + défilement par boutons haut/bas                               | ✅ Terminé |
| 24 | haute     | Étapes personnalisées par board + vue Kanban globale = « board global » (modèle)                                                           | ✅ Terminé |
| 23 | faible    | Accueil : le bouton « Accueil » (header + logo) s'associe désormais au Tableau Liste (et non plus à la Vue Kanban globale)                  | ✅ Terminé |
| 22 | haute     | Correctif Gras/Italique : rendu visuel en direct (calque WYSIWYG) + astérisques invisibles (largeur conservée)                                | ✅ Terminé |
| 21 | moyenne   | Éditeur riche : mode Gras/Italique persistant sans astérisques visibles + boutons actifs « carré sombre »                                  | ✅ Terminé |
| 20 | moyenne   | Zones de texte modernes : éditeur riche (gras, italique, titres, listes, lien/fichier, image, emoji) sans mentions pour Matière & Description | ✅ Terminé |
| 19 | faible    | Fiche carte : « Matière(s) & Composition » en zone de texte multi-lignes                                                                     | ✅ Terminé |
| 18 | moyenne   | Bug : BoardModal sous la fiche pôle → overlay z-[60]                                                                                          | ✅ Terminé |
| 17 | faible    | Pôle : tuile bord « + Nouveau Board » pleine largeur dans la grille des boards (fiche + vue pôles)                                          | ✅ Terminé |
| 16 | faible    | Pôle : retrait du « + Nouveau Board » de la barre d'onglets (rollback partiel#15)                                                            | ✅ Terminé |
| 15 | faible    | Pôle : « + Nouveau Board » dans la barre d'onglets + suppression « Gérer les attributions »                                               | 🌀 Modifié |
| 14 | faible    | Pôle : suppression du bouton « Paramètres & Attribution » de l'en-tête                                                                     | ✅ Terminé |
| 13 | faible    | Audit Client / Pôle / Direction : nettoyage imports & props morts + cohérence visuelle photo                                                  | ✅ Terminé |
| 12 | moyenne   | Fiche identitaire : Dossier après Commerciaux + permutation onglets Commentaires ↔ Historique                                                 | ✅ Terminé |
| 11 | moyenne   | Fiche identitaire : rotation des 3 zones (Détails / Commentaires / Commerciaux)                                                                | ✅ Terminé |
| 10 | moyenne   | En-tête fiche : photo modèle en vue pleine (pleine grandeur, sans rognage)                                                                    | ✅ Terminé |
| 9  | moyenne   | En-tête fiche : retirer badges (Étape/Client/Commerciales/nom) + Frame/Visuel Modèle centré                                                 | ✅ Terminé |
| 8  | haute     | Environnement « Archives » par board + bouton « Archiver la fiche »                                                                         | ✅ Terminé |
| 7  | haute     | Autoriser doublons de Référence / Nom du modèle + bouton « Dupliquer la fiche »                                                            | ✅ Terminé |
| 6  | haute     | Tri alphabétique des cartes par référence + réordonnancement manuel (drag vertical persistant)                                              | ✅ Terminé |
| 5  | basse     | Réduction header / top bars + hauteur Kanban ajustée                                                                                          | ✅ Terminé |
| 4  | moyenne   | Hauteur fixe des colonnes Kanban + drag-to-scroll horizontal                                                                                    | ✅ Terminé |
| 3  | moyenne   | Colonnes Kanban « vitrées » (transparentes / glassmorphism)                                                                                  | ✅ Terminé |
| 2  | haute     | Script de prévention + doc PostgreSQL Docker & migration de données                                                                           | ✅ Terminé |
| 1  | critique  | Réparation de l'encodage (accents`??`) dans PostgreSQL                                                                                       | ✅ Terminé |

---

## 🗂️ Détail des tâches (du plus récent au plus ancien)

### #32 — Page de login : liste « pré-remplir » avec les vrais utilisateurs ✅ Terminé
- **Demande :** « restaurer les 11 derniers utilisateurs » → rétablir la liste de comptes sur la page de connexion, mais avec les **vrais comptes actuels** (11 commerciaux + direction) au lieu des comptes démo périmés.
- **Constat :** aucune donnée manquante (12/12 utilisateurs présents dans le conteneur, la base locale `suivi_flux_merch` et le CSV). Le bloc avait été retiré en #31 car il affichait les comptes démo.
- **Correctif :**
  - `server/routes/users.ts` : `GET /api/v1/users` devient **public** (sans jeton) — `rowToUser` n'expose jamais `password`/`password_hash` (vérifié : 12 comptes, 0 champ password). La page de login peut donc lister les vrais comptes même en navigation privée.
  - `AuthModal.tsx` : bloc « Comptes de l'équipe » réactivé ; le pré-remplissage ne saisit que l'**e-mail** (les comptes réels n'ont pas de mot de passe connu côté client) ; la liste est **masquée tant qu'elle contient des comptes démo** hérités (`LEGACY_DEMO_IDS`) le temps que le serveur réponde.
- **Vérifié :** `GET /api/v1/users` → 200 sans jeton (12 vrais comptes, aucun mot de passe), lint OK, build OK, health OK.

### #31 — Page de login : suppression du bloc « Pré-remplir la démo » ✅ Terminé
- **Constat :** en navigation privée (aucun localStorage), la page de login affichait les **utilisateurs démo** (`usr-1…usr-6`, `usr-planning-1`, `usr-dir-2`) pourtant supprimés de la base depuis longtemps.
- **Cause :** `allUsers` retombe sur `DEFAULT_USERS` (démo codés en dur) faute de cache local ; la récupération `GET /api/v1/users` exige un jeton (`authenticateToken`) → en navigation privée 401 → la liste n'est jamais remplacée par les vrais comptes.
- **Correctif (`AuthModal.tsx`)** : suppression du bloc « Pré-remplir la démo équipe interne » et de `handlePrefillAccount`. La page de login = e-mail + mot de passe uniquement (plus d'exposition de comptes obsolètes).
- **Vérifié :** comptes démo absents de la base (`count(*) = 0` après reboot du conteneur, pas de re-seed), lint OK, build OK, health OK.

### #30 — Session persistée sur localStorage (liens directs dans un nouvel onglet) ✅ Terminé
- **Constat :** déjà connectée, l'ouverture d'un lien direct (`?card_id` / `?board_id` / `?pole_id`) depuis un mail/SMS/`.txt` ouvrait la **page de login** : la session était stockée dans **sessionStorage**, propre à chaque onglet — un lien depuis l'extérieur s'ouvre dans un **nouvel onglet** sans session.
- **Correctif (`App.tsx`) :**
  - La session `currentUser` est désormais persistée dans **localStorage** (partagé entre onglets/fenêtres), avec repli sur l'ancien `sessionStorage` pour la transition.
  - `syncSession` écrit dans les deux stocks ; la suppression de session (logout / token invalide) nettoie les deux.
  - Résultat : cliquez sur un lien direct dans un nouvel onglet → l'utilisateur reste connecté et l'app ouvre directement la carte / board / pôle visé (aucune page de login).
  - ⚠️ Transition : après ce rebuild, **recharger une fois l'app (Ctrl+F5) connecté(e)** pour écrire la session dans localStorage ; ensuite les liens fonctionnent.
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #29 — Liens directs partageables (carte / board / pôle) ✅ Terminé

- **Demande :** pouvoir **copier un lien** pour une carte, un board ou un pôle et l'envoyer par **e-mail, SMS, fichier .txt, messagerie…** : tout utilisateur **connecté** qui clique le lien entre **directement** dans l'entité concernée (fiche carte, board, fiche pôle). Si non connecté, login d'abord puis navigation auto.
- **Livré :**
  - `utils/appUrl.ts` : `getEntityDeepLink(type, id)` → `{URL}?card_id=…` / `?board_id=…` / `?pole_id=…` (même syntaxe que les liens visiteurs existants).
  - `App.tsx` : nouvel effet « deep links » pour utilisateurs authentifiés — lit `card_id` / `board_id` / `pole_id` dans l'URL après connexion et données chargées, puis **ouvre la fiche carte** (avec navigation dans le bon board), **active le board**, ou **ouvre la fiche pôle** (vue Pôles + `poleDeepLinkId`). Respecte les visibilités (`isCardVisibleToUser` / `isBoardVisibleToUser` / `isPoleVisibleToUser`). Si l'entité n'est pas encore chargée, le lien est rejoué automatiquement à l'arrivée des données.
  - **Boutons « copier le lien »** (icône 🔗, feedback « Lien copié ! ») :
    - Fiche carte (`CardIdentityModal`) — disponible pour tout utilisateur.
    - Top bar kanban : bouton 🔗 pour le **board actif** (`App.tsx`).
    - Modale board (`BoardModal`) en mode édition.
    - Fiche pôle (`PoleIdentityModal`).
  - `PolesView.tsx` : prop `poleDeepLinkId` → ouvre automatiquement la fiche pôle reçue par lien.
- **Vérifié :** lint OK, rebuild container OK, health OK. Exemples de liens : `…?card_id=card-…`, `…?board_id=board-…`, `…?pole_id=pole-…`.

### #28 — Kanban : réordonner les colonnes (étapes) par glisser-déposer ✅ Terminé

- **Demande :** au-delà de la modale d'étapes, pouvoir **réordonner les étapes directement dans le kanban** via le drag & drop : on glisse l'en-tête d'une colonne vers la gauche/droite pour changer sa place dans le pipeline.
- **Livré :**
  - `KanbanBoard.tsx` : l'**en-tête de chaque colonne** devient draggable (`data-step-header`, curseur griffe, poignée `GripVertical` affichée si l'utilisateur a les droits) ; nouvel état `dragColumnId`/`dragColumnOverId` ; handlers `handleColumnDragStart/Over/Drop/End` ; dépôt = insertion de la colonne glissée au rang de la colonne cible.
  - Retours visuels : colonne cible surlignée (liseré + fond indigo), colonne en cours de drag en opacité réduite.
  - Le drag de colonne ne perturbe ni les cartes (glisser-déposer/glisser une carte garde son comportement), ni le pan horizontal du board (l'en-tête est exclu du `mousedown` de pan, `handleBoardMouseDown`).
  - `App.tsx` : nouveau `handleReorderSteps(orderedStepIds)` — applique le réordonnancement aux **étapes personnalisées du board actif** (persistées via PUT boards) ou au **modèle global** dans la vue globale (Header), avec recalcul des indices `order`. Prop `onReorderSteps` passée au Kanban.
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #27 — Étapes/Steps : flèches ↑/↓ remplacées par le glisser-déposer ✅ Terminé

- **Demande :** pour déplacer une étape dans la personnalisation des steps (accessible depuis le Kanban ou la fiche), remplacer les boutons flèches Monter/Descendre par un **système drag & drop** uniquement.
- **Livré (`src/components/StepConfigModal.tsx` — modale unique utilisée pour le modèle global, le board actif et les étapes personnalisées) :**
  - Suppression des boutons **↑ Monter / ↓ Descendre** (`MoveUp`/`MoveDown`) et de `handleMove` → plus aucun déplacement par flèche.
  - Drag & drop étendu : **toute la ligne de l'étape est désormais draggable** (`draggable` + curseur griffe), pas seulement la poignée `GripVertical` (conservée comme repère visuel à gauche).
  - Retour visuel renforcé : rangée survolée surlignée (liseré indigo), rangée en cours de drag en **opacité réduite + contour pointillé**, dépôt à n'importe quel rang (les indices `order` sont recalculés).
  - Libellé d'aide : « Glissez-déposer une étape pour la placer à n'importe quel rang ».
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #26 — Historique : format date/heure local + détails complets de l'action ✅ Terminé

- **Demande :** conserver date & heure + auteur + action, mais afficher la date en **jj/mois/année**, l'heure en **hh:mm:ss** dans le **fuseau horaire local du pays de la modification**, et donner une **information complète** de l'action effectuée.
- **Livré :**
  - `src/components/HistoryLogTable.tsx` : nouvelle fonction `formatLogTimestamp` → affiche `jj/mm/aaaa hh:mm:ss` en heure locale du poste. Parseur robuste : gère les **nouveaux timestamps ISO (UTC)** (convertis en local) ET les **anciens timestamps** déjà stockés au format `fr-FR` (`jj/mm/aaaa hh:mm:ss`, convertis comme heure locale) ; affichage fallback du texte brut si illisible.
  - `src/App.tsx` : les 3 logs générés côté front (déplacement Kanban, réassignations pipeline/board) stockent désormais `new Date().toISOString()` (instant UTC strict) au lieu d'une chaîne locale figée → formatage homogène à l'affichage. (`CardIdentityModal`/`CreateCardModal` utilisaient déjà ISO.)
  - **Info complète de l'action :** la colonne « Détails » n'est plus tronquée (`max-w-xs truncate` → `whitespace-normal break-words min-w-[220px]`) : le texte intégral de l'action (ancienne → nouvelle étape, raison de réassignation, etc.) s'affiche sur plusieurs lignes.
- **Vérifié :** choix utilisateur (mois en chiffres → `24/09/2026`), lint OK, rebuild container OK, health OK.

### #25 — Historique des modifications : zone à hauteur fixe + flèches haut/bas ✅ Terminé

- **Demande :** dans la fiche identitaire (onglet Historique / zone 2), quelle que soit la quantité de modifications, le conteneur d'origine ne doit **jamais s'allonger** : il faut pouvoir **défiler vers le haut ou le bas via des boutons** pour consulter les anciennes modifications.
- **Livré (`src/components/HistoryLogTable.tsx`) :**
  - Conteneur du tableau à **hauteur fixe** (`h-72`) → il ne grossit plus avec le nombre d'entrées.
  - **2 boutons flèches** (▲/▼) dans l'en-tête « Historique des modifications (N) » : déplacement vertical **fluide** par pas (~une ligne) vers le haut (récentes) ou le bas (anciennes).
  - États désactivés de chaque bouton selon la position (`scrollTop`/`scrollHeight`) → enfoncé en haut, ▼ en bas ; `en-tête de tableau sticky` (reste visible pendant le défilement).
  - Barre de défilement native fine conservée (roulette souris/trackpad toujours fonctionnels).
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #24 — Étapes personnalisées par board + Kanban global « board global » ✅ Terminé

- **Demande :** retirer les cartes des boards de la vue Kanban globale ; la vue globale sert de **modèle** lorsqu'on crée un nouveau board. Dans chaque board, créer / supprimer / réordonner ses propres étapes (à n'importe quel rang, par **glisser-déposer**). Les nouvelles cartes sans board vont automatiquement dans le **board global** (la vue Kanban globale).
- **Livré :**
  - `types.ts` : `CustomBoard.steps?: StepDefinition[]` (liste d'étapes propre au board).
  - **Serveur** (`server/db.ts`, `utils/mappers.ts`, `routes/boards.ts`) : colonne `boards.steps JSONB DEFAULT '[]'` (+ migration `ADD COLUMN IF NOT EXISTS`), **suppression de la FK** `cards_current_step_id_fkey` (les étapes de board vivent hors de la table globale → plus de contrainte bloquante), **backfill** au boot des boards encore vides avec un instantané du pipeline global courant, INSERT/UPDATE/CREATE TABLE + `rowToBoard` incluent `steps`.
  - `App.tsx` :
    - Vue Kanban globale = **board global** : n'affiche que les cartes **non rattachées** à un board personnalisé (`globalKanbanCards`), colonnes = étapes **globales** (modèle de référence). Badge compteur et libellé du sélecteur mis à jour.
    - Kanban d'un board sélectionné : colonnes = `board.steps` (sinon fallback sur le modèle global).
    - Bouton **« Étapes »** dans la top bar kanban (uniquement quand un board est actif) → ouvre `StepConfigModal` sur les étapes **du board** ; le Header « Ajuster Steps » garde la main sur le **modèle global**.
    - `handleSaveBoardSteps` : persiste `board.steps` via PUT boards et réassigne (fallback 1ᵉʳ step) les cartes du board dont l'étape a été supprimée.
    - Création d'un board (`handleCreateBoard`) : instantané (`JSON.parse(JSON.stringify(steps))`) des étapes globales ; mise à jour board (`handleUpdateBoard`) : conserve les étapes existantes si non fournies.
    - Modèle global (`handleSaveSteps`) : la réassignation d'orphelins n'affecte **plus** les cartes rattachées à un board (elles suivent leurs propres étapes) ; `handleMoveCardStep` résout les noms via `boardSteps`.
  - `KanbanBoard.tsx` : rendu entièrement piloté par la prop `steps` reçue (éventuellement les étapes du board).
  - `StepConfigModal.tsx` : **glisser-déposer** (poignée `GripVertical` à gauche de chaque rangée, surlignage cible) + flèches conservées ; titre/footer contextuels via `scopeLabel` (board « X » / modèle global).
- **Vérifié :** lint OK, rebuild container OK, health OK ; DB : 0 FK restante sur `cards`, `steps` backfillé (29 étapes) sur tous les boards (0 board vide). Les 6 cartes sans board (ex : H26…, REF-2026-003) restent visibles dans le board global.

### #23 — Accueil associé au Tableau Liste ✅ Terminé

- **Demande :** sur la page d'accueil, le bouton **Accueil** (onglet header + logo cliquable) était lié à la **Vue Kanban globale**. Le remplacer pour que l'**Accueil** ouvre la vue **Tableau Liste**.
- **Livré :**
  - `App.tsx` (`handleGoHome`) : `setViewMode('list')` au lieu de `('kanban')` (toujours avec reset `activeBoardId` + `searchTerm`).
  - `Header.tsx` : l'onglet **Accueil** est actif (indigo) quand `viewMode === 'list'` sans board ni recherche ; son title devient « Accueil : Tableau Liste… ». Le bouton **Tableau Liste** suit le même pattern que **Vue Kanban** (indigo quand `viewMode === 'list'` avec contexte, sinon blanc) → pas de double surbrillance avec Accueil.
  - Les autres chemins vers kanban (sélection d'un board, liens visiteur, login/signup) restent inchangés.
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #22 — Correctif : Gras/Italique ne donnaient aucun retour visuel ✅ Terminé

- **Constat :** après #21, en mode écriture le texte saisi restait en texte brut et les `**…**` scellés réapparaissaient + le texte tapé n'apparaissait ni gras ni italique → « bold/italique ne marchent pas » (absence totale de retour visuel dans un `<textarea>` brut).
- **Correctif (RichTextEditor.tsx) :** calque de rendu **WYSIWYG** superposé au textarea (technique textarea-overlay) :
  - Un div miroir (`absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words`, mêmes classes typographiques que le textarea) affiche un rendu **en direct** : le segment en attente (anchors) est stylé `<strong>`/`<em>` au fil de la frappe, et les marqueurs `***`/`**`/`*`/`_` sont remplacés par des `<span class="text-transparent">` (invisibles mais **conservant la largeur des 3/2/1 caractères**) → les astérisques ne s'affichent plus du tout et le **curseur reste parfaitement aligné** avec le texte visible.
  - Le `<textarea>` passe en `color: transparent` + `caret-color` visible : il reste la vraie zone de saisie (saisie, sélection, caret, placeholder conservé), le miroir ne fait qu'afficher le texte formaté en dessous.
  - Synchronisation du défilement (`onScroll` + effet sur chaque rendu `syncMirrorScroll`).
  - `caretState` suivi dans le textearea (opérations change/select/click/keyup) pour styler le segment en attente [ancrage → caret].
- **Résultat :** clic **B** → bouton « carré sombre » + tout ce qui est tapé s'affiche immédiatement en **gras** ; clic **I** → **italique** ; B+I → gras-italique ; re-clic (ou Ctrl+B/I, perte de focus, Ctrl+Enter, Aperçu) → texte scellé en `**…**`/`*…*` correctement interprété et affiché sans aucune astérisque visible.
- **Correctif persistance (2e retour) :** « le gras/italique ne persistait pas » → le curseur restait posé **dans** les marqueurs invisibles fermants (`**one` + caret avant le `**` fermant) → le mot suivant tapé après désactivation restait englué dans le précédent (valeurs imbriquées `**one**two**`, gras perdu). Fix : après scellement le curseur est placé **après** les marqueurs fermants (`endPos = anchor + 2·mark + segment.length`), les ancrages de mode concurrent sont avancés au même point (`sealSegment`), et sur l'encadrement d'une sélection le caret/ancrage passe de part et d'autre des nouveaux marqueurs (`start + bolded.length + 2` / `italicized.length + 1`). Désormais **B type B B type B** produit `**one**` puis `**two**` : chaque mot conserve son gras/italique.
- **Correctif gras-italique combiné (3e retour) :** « quand on clic à la fois sur bold et italique, la notion se perd » → le texte tapé pendant que **B et I sont actifs ensemble** était scellé en **gras seul** (le `*…*` se ré-appliquait ensuite bizarrement) ; la notion gras-italique était perdue. Fix dans `sealSegment` : si l'ancrage de l'autre mode est **égal** à celui du mode désactivé (même segment en attente), le scellement produit **`***segment***`** en un seul coup (gras + italique conservés), puis l'autre mode **reste actif** pour la suite de la frappe (ancrage avancé après les marqueurs). Scénario : **B** + **I** → on tape → ça s'affiche **gras-italique** en direct (miroir) ; clic **B** off → le texte déjà tapé est scellé `***...***` (gras + italique conservés), la suite de la frappe est en italique seul ; clic **I** off → retour au normal.
- **Correctif Aperçu / combinaison (4e retour) :** signalé « c'est dans l'onglet Aperçu que les astérisques apparaissent, et les fonctions ne marchent pas quand on les combine / ne persistent pas ». Causes réelles :
  1. **Segment traversant un saut de ligne** (Entrée / liste à puces pendant un mode actif) → valeur scellée `**ligne1\nligne2**` : les regex (miroir **et** FormattedText, sans flag `s`) refusaient `*`/`\n` dans la partie interne → le texte était affiché **brut avec les `**`** (éditeur + Aperçu). Fix : `sealSegment` enveloppe désormais **ligne par ligne** (`**l1**\n**l2**`, combinaison idem `***l1***\n***l2***`) → aucun marqueur ne traverse un `\n` ; les regex miroir/FormattedText passent en contenu `[^*\n]+?`/`[^*_\n]+?` pour un parsing propre même sur marqueurs adjacents (`**a****b**`, `**ab***cd***`).
  2. **Combinaison avec ancrages différents** (ex. B actif puis I cliqué plus tard en milieu de segment) : l'ancien code scellait en mode unique → notion perdue. Fix : si les ancrages diffèrent, scellement **mixte** — `[min, max)` dans le premier style activé, `[max, caret)` en `***…***` — en une seule insertion, puis l'autre mode reste actif (ancrage avancé après les marqueurs).
- **Correctif empilement des marqueurs (5e retour) :** constat utilisateur `raphia` / `**rofia**` / `*******rofia***` / `******` → des scellements répétés **enveloppaient à nouveau un texte déjà marqué** (empilement `**…**` → `****…` → `*******…`). Causes : la restauration du curseur passait par `setTimeout(10 ms)` → après un changement externe de valeur, React pouvait remettre la sélection à 0 et l'ancrage suivant (ou le caret de scellement) retombait **sur des marqueurs existants**, qui étaient re-enveloppés. Fix :
  - **Restauration synchrone du curseur** : `focusCaret`/`sealPendingIfAny`/branches sélection utilisent `pendingCaretRef` appliqué dans un `useEffect` post-render (aucune fenêtre de race) ; **plus de `setTimeout(10)`** sur les chemins gras/italique.
  - **Garde anti-recouvrement** : `sealSegment` refuse de sceller si la zone en attente contient déjà un `*` (ancrage mal positionné) → aucun re-enveloppement possible, plus jamais d'empilement.
  - **Sélections avec `*`** : l'encadrement B/I d'une sélection est ignoré si elle contient déjà des marqueurs (une sélection `**…**` se dé-scelle par contre toujours).
  - **Pas de vol de focus** : scellements déclenchés par blur / Ctrl+Enter / Aperçu ne refocalisent plus le textarea.
- **Vérifié :** lint OK, rebuild container OK, health OK.
- **Vérifié :** lint OK, rebuild container OK, health OK.
- **Décision finale (6e retour) :** l'utilisateur souhaite revenir à un **texte simple** (« c'est lié au bold/italique, revenons au texte sans bold/italique »). Toute la fonctionnalité Gras/Italique est **supprimée** de `RichTextEditor.tsx` : boutons **B**/**I** (et séparateurs dédiés), raccourcis Ctrl+B/Ctrl+I, états `isBoldActive`/`isItalicActive`, refs d'ancrage (`boldAnchorRef`/`italicAnchorRef`), garde `blurGuardRef`, `pendingCaretRef`/`focusCaret`, fonctions de scellement (`wrapMarkers`, `sealSegment`, `sealPendingIfAny`), calque miroir WYSIWYG (`mirrorRef`, `buildMirrorTokens`, `mirrorTokens`, `syncMirrorScroll`), `caretState`, `handleToggleBold`/`handleToggleItalic`/`handleTextareaBlur`. Le textarea redevient un **textarea brut** (texte opaque `text-slate-100`/`text-slate-800`, caret natif, plus de `color: transparent` ni de synchro de défilement).
- La suppression retire aussi la cause de fond du retour utilisateur (chevauchement curseur / empilement des marqueurs). `FormattedText.tsx` est **conservé tel quel** : l'affichage (Aperçu, commentaires) continue d'interpréter `***`/`**`/`*`/`_` si des contenus existants en contiennent encore. `updateActiveStatesFromCursor` ne conserve que la détection listes + style de police.
- **Correctif affichage commentaires (7e retour) :** « dans Commentaires & Échanges, après publication de commentaires testés en gras/italique, l'écran affiche du blanc » → le rendu gras/italique de `FormattedText.tsx` utilisait des couleurs **`text-slate-900 dark:text-white`** : les variantes `dark:` ne s'activent que selon le thème OS, or la section commentaires est **toujours** sombre (via la prop `isDark`). Sur un OS clair, le `<strong>` (gras, `**…**` et combiné `***…***`) s'affichait **noir sur bulle sombre → invisible (« blanc »)**. Fix : la couleur du `<strong>` est désormais pilotée par `isDark` (`text-white` en sombre, `text-slate-900` en clair) au lieu des variantes `dark:`. Vérifié : lint OK, rebuild container OK, health OK.
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #21 — Éditeur riche : mode Gras/Italique persistant sans astérisques + boutons actifs « carré sombre » ✅ Terminé

- **Demande :** à l'écriture en gras/italique, ne plus afficher les `*` qui encadrent le texte saisi ; le bouton cliqué doit être marqué actif (carré sombre) et tout ce qu'on écrit reste en gras/italique jusqu'à désactivation (re-clic sur le bouton).
- **Livré (RichTextEditor.tsx) :**
  - Nouveau mode « segment en attente » : cliquer **B** / **I** sans sélection n'insère plus de marqueurs (`**`/`*` invisibles) — activation = simple bascule `isBoldActive`/`isItalicActive` + ancrage de position (`boldAnchorRef` / `italicAnchorRef`). Tout ce qui est tapé ensuite reste « en attente » sans astérisques visibles.
  - Désactivation : re-clic (ou Ctrl+B/I) → le segment ancré→curseur est scellé dans `**...**`/`*...*` d'un coup.
  - Scellement automatique aussi à la **perte de focus** hors éditeur, à la bascule **Aperçu**, et avant **Ctrl+Enter** (soumission) — jamais de texte orphelin non formaté.
  - Garde-fou `blurGuardRef` (mousedown interne au conteneur) pour que les clics sur les boutons de la barre (B/I/gras/emoji…) ne fassent pas sceller/annuler le mode en cours.
  - La synchro curseur (`updateActiveStatesFromCursor`) ne réécrase plus l'état actif tant qu'un segment est en attente (refs d'ancrage).
  - Boutons **B**/**I** actifs : **carré sombre** (`bg-slate-800` + ring indigo), au lieu du fond indigo précédent ; tooltip « …recliquez pour désactiver ».
  - Sélection existante : le comportement d'encadrement `**…**` est conservé (et l'ancrage poursuit le mode derrière la sélection).
- **Livré (FormattedText.tsx) :** prise en charge de `***texte***` (gras + italique combinés, ex. B puis I actifs) — regex étendue + branche dédiée (indices de groupes décalés) ; `formattedToPlainText` gère aussi `***`.
- **Remarques :** cas limites assumés (curseur déplacé avant l'ancrage avant désactivation, retour à la ligne pendant un segment actif) → le scellement protège contre toute corruption du contenu. La combinaison B+I produit `***…***` rendu correctement.
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #20 — Zones de texte modernes : éditeur riche sans mentions (Matière & Description) ✅ Terminé

- **Demande :** rendre l'utilisation des zones de texte plus moderne (style de police et titre, gras, italique, liste puce/numérique, insérer un lien / téléverser un document, insérer une image, emoji, mentionner un collaborateur — mentions réservées aux commentaires et notifications, pas à « Matière(s) & Composition »).
- **Pré-audit :** `RichTextEditor.tsx` prend déjà en charge gras/italique, titres `#/##/###`, citation, styles `[font:...]`, listes puces/numérotées (avec continuation Entrée), insertion de lien + upload fichier local, image (URL ou upload), emoji et mentions `@`. `FormattedText.tsx` rend ce markdown-lite. Les seules zones « longues » restées simples étaient : le champ « Matière(s) & Composition » des cartes, le champ « Matière / Tissu Principal » de création, et la « Description ou Note d'objectif » des boards. (Rappel : les mentions `@` restent purement visuelles — pas de système de notifications branché dans l'app.)
- **Livré :**
  - `RichTextEditor.tsx` : nouvelle prop `hideMentions` (défaut `false`) → masque le bouton « Mentionner » de la barre d'outils et désactive le déclencheur `@` au clavier ; les appels existants (Commentaires & Échanges) gardent les mentions.
  - `CardIdentityModal.tsx` (« Matière(s) & Composition ») et `CreateCardModal.tsx` (« Matière / Tissu Principal ») : champ converti en `<RichTextEditor hideMentions>` (mêmes états `matiere`/`setMatiere`).
  - `BoardModal.tsx` (« Description ou Note d'objectif ») : converti en `<RichTextEditor hideMentions>`.
  - `FormattedText.tsx` : export d'un helper `formattedToPlainText()` (aplanit `**gras**`, `*italique*`, `[font:...]`, titres, citations, liens) appliqué aux aperçus compacts : matière dans `DirectionView.tsx` et `ClientIdentityModal.tsx`, description de board dans `PoleIdentityModal.tsx` et `PolesView.tsx` (affichages mono-ligne `truncate`/`line-clamp`, incompatibles avec le rendu block de `FormattedText`).
- **Petites zones volontairement non converties ce cycle :** message de `SimpleVisualPicker` (120 car.), « Objectif de la mise à jour » (DueDateSelectorPopover), rappel de création, note « Note / Audit » d'invitation.
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #19 — Fiche carte : « Matière(s) & Composition » en zone de texte multi-lignes ✅ Terminé

- **Demande :** dans la fiche identitaire d'une carte, le champ « Matière(s) & Composition » était un champ à une seule ligne → le passer en zone de texte multi-lignes.
- **Livré :** `CardIdentityModal.tsx` — l'`<input type="text">` devient un `<textarea rows={3}>` (mêmes classes, `resize-y`, même placeholder et la même logique `matiere`/`setMatiere` + `disabled={!canEdit}`). Liaison `matiere` inchangée (sauvegarde `handleSaveSpecs`).
- **Vérifié :** lint OK, rebuild container OK.

### #18 — Bug : BoardModal affiché derrière la fiche identitaire du pôle ✅ Terminé

- **Constats :** « quand on clic sur "+ Nouveau Board" dans la fiche identitaire du pôle, la fiche à remplir pour le nouveau board apparaît mais en fond de la fiche identitaire ».
- **Cause :** `BoardModal` et `PoleIdentityModal` sont tous deux en overlay `fixed inset-0 z-50` ; dans `PolesView`, le `BoardModal` est rendu **avant** le `PoleIdentityModal` dans le DOM → à z-index égal, la fiche du pôle se peint par-dessus.
- **Correctif :** `BoardModal` passe en `z-[60]` (au-dessus de toutes les modales `z-50`). Le `BoardModal` n'ouvre lui-même aucune autre modale (pas de `FileViewerModal`/lightbox interne), le nouveau z-index est donc sans effet de bord.
- **Vérifié :** lint OK, rebuild container OK.

### #17 — Pôle : tuile bord « + Nouveau Board » en pleine largeur dans la grille des boards ✅ Terminé

- **Demande :** ajouter un bouton « + Nouveau Board » stylé **de la taille des cartes board**, placé **après la dernière board** dans (1) la fiche identitaire du pôle et (2) la vue des pôles ; dans la vue des pôles, remplacer le petit bouton « + Nouveau Board » de l'en-tête de carte par ce bouton aux dimensions des boards.
- **Livré :**
  - `PoleIdentityModal.tsx` (onglet « Identité du Pôle ») : dans la grille `lg:grid-cols-3`, tuile « Nouveau Board » (`min-h-[210px]`, bordure pointillée indigo, icône `+ ` dans une pastille) ajoutée après la dernière board, visible si `canEdit && onAddNewBoardForPole`, appelant `onAddNewBoardForPole(pole)`.
  - `PolesView.tsx` : suppression du petit bouton « + Nouveau Board » de l'en-tête de carte pôle ; ajout d'une tuile identique dans la grille d'aperçu `sm:grid-cols-2` (`min-h-[195px]`) après la dernière board, ouvrant `BoardModal` en mode création (`setEditingBoard` + `setIsBoardModalOpen`). Les boutons de l'état vide « Aucun board » sont conservés.
- **Vérifié :** lint OK, rebuild container OK.

### #16 — Pôle : retrait du « + Nouveau Board » de la barre d'onglets ✅ Terminé

- **Demande :** supprimer le bouton « + Nouveau Board » ajouté dans la barre d'onglets (#15).
- **Livré :** le bloc bouton de la barre d'onglets (à côté du compteur) est retiré ; le compteur « X boards • Y modèles » reste seul à droite. L'import `Plus` est conservé (encore utilisé dans l'état vide « Aucun board »). La suppression de « Gérer les attributions » (#15) est maintenue.
- **Remarque :** plus aucun moyen direct de créer un board depuis l'onglet « Identité du Pôle » lorsque des boards existent déjà (seul l'état vide conserve son bouton) — à confirmer si c'est voulu.
- **Vérifié :** lint OK, rebuild container OK.

### #15 — Pôle : « + Nouveau Board » dans la barre d'onglets + suppression « Gérer les attributions » 🌀 Modifié

- **Demande :** (1) déplacer le bouton « + Nouveau Board » dans la barre d'onglets de la fiche pôle ; (2) supprimer le bouton « Gérer les attributions » car il affiche le même contenu que l'onglet « Paramètres & Attribution ».
- **Livré :**
  - Bouton **« + Nouveau Board »** ajouté à droite de la **barre d'onglets** (à côté du compteur « X boards • Y modèles »), visible si `canEdit && onAddNewBoardForPole`, ouvrant `onAddNewBoardForPole(pole)`.
  - Suppression du « + Nouveau Board » de l'en-tête de la section « Boards Attribués à ce Pôle » (déplacé) ainsi que du lien **« Gérer les attributions »** (redondant avec l'onglet Paramètres & Attribution).
  - `ArrowRight` retiré des imports (devenu inutilisé) ; les boutons de l'état vide « Aucun board » sont conservés.
- **Vérifié :** lint OK, rebuild container OK.

### #14 — Pôle : suppression du bouton « Paramètres & Attribution » de l'en-tête ✅ Terminé

- **Demande :** dans la fiche pôle, le bouton « Paramètres & Attribution » affiché dans l'en-tête juste à côté du bouton X devait être retiré de l'en-tête (choix utilisateur : « Le supprimer de l'en-tête »).
- **Livré :** suppression du bloc conditionnel (`canEdit && activeTab !== 'edit'`) dans l'en-tête (`PoleIdentityModal.tsx`) ; l'onglet « Paramètres & Attribution » de la barre d'onglets reste l'unique accès à l'édition (visible si `canEdit`). Import `Edit3` conservé (encore utilisé dans la barre d'onglets et l'édition de board).
- **Vérifié :** lint OK, rebuild container OK.

### #13 — Audit Client / Pôle / Direction : nettoyage + cohérence visuelle ✅ Terminé

- **Audit préalable :** le traitement exact du modèle `CardIdentityModal` (photo centrée en en-tête, Historique en colonne droite, Dossier après Commerciaux, onglet Commentaires ↔ Historique) **ne s'applique pas** aux autres vues — les entités Client et Pôle portent pas ces données (`comments`, `historyLogs`, `dossierTechnique`, `merchandisers`) et `DirectionView` est un dashboard plein écran (pas de fiche à onglets). Ajouter ces éléments = évolution de périmètre (types + API + DB).
- **Choix utilisateur :** périmètre « Nettoyage + cohérence visuelle ».
- **Livré :**
  - `DirectionView.tsx` : retrait de 7 imports d'icônes morts (`Clock`, `User`, `Filter`, `ChevronRight`, `TrendingUp`, `Info`, `SlidersHorizontal`) + props inutilisées `currentUser`/`onMoveCardStep` (interface + destructure) ; alignement `App.tsx` (suppression des props passées). Vignette photo des mini-cartes : `object-cover` → **`object-contain`** (photo non recadrée, fond blanc).
  - `ClientIdentityModal.tsx` : retrait de l'import mort `FormattedText` ; **affichage de la photo `client.avatar`** en `object-contain` (sinon le carré d'initiales), en `rounded-[10%]`.
  - `PoleIdentityModal.tsx` : retrait de 10 icônes mortes (`Building2`, `Calendar`, `UserCheck`, `Clock`, `Sparkles`, `Layers`, `AlertTriangle`, `TrendingUp`, `Award`, `Search`) + `POLE_COLOR_STYLES` + `getDueDateStatus` (vérifiés : 1 seule occurrence = l'import).
- **Vérifié :** lint OK, rebuild container OK, health `{"status":"ok"}`.

### #12 — Dossier après Commerciaux + permutation Commentaires ↔ Historique ✅ Terminé

- **Demande :** (1) déplacer la carte « Dossier rattaché (PDF) » après celle des « Commerciaux Responsables » ; (2) remplacer le bouton d'onglet « Historique des modifications » par « Commentaires & Échanges », les contenus étant permutés.
- **Livré :**
  - **Dossier rattaché** déplacé hors du `<form>` specs et placé pleine largeur, **après la carte Commerciaux** dans la zone inférieure.
  - Onglet 5 renommé **« Commentaires & Échanges »** (icône `MessageSquare`, compteur de commentaires) ; l'état interne `'history'` → `'comments'`, son contenu = `InteractiveCommentsSection`.
  - La **colonne droite de l'onglet Identité** affiche désormais **« Historique des modifications »** (`HistoryLogTable`).
  - La section Commentaires a d'abord été retirée de l'onglet Historique (étape préalable demandée), puis le contenu a été permuté (Historique → Identité, Commentaires → onglet).
- **Vérifié :** lint OK, rebuild container OK.

### #11 — Rotation des 3 zones de l'onglet identité ✅ Terminé

- **Demande :** dans la fiche identitaire d'une carte (modèle), zone 1 = Commerciaux, zone 2 = Détails & Spécifications, zone 3 = Commentaires ; permuter pour que zone 1 contienne Détails, zone 2 contienne Commentaires, zone 3 contienne Commerciaux.
- **Livré :**
  - Zone 1 (colonne gauche) : **Détails & Spécifications** (référence, client, modèle, matière, prix, quantités, dates, notes, bouton « Enregistrer les spécifications ») + carte **Dossier rattaché (PDF)**.
  - Zone 2 (colonne droite) : **Commentaires & Échanges** (`InteractiveCommentsSection`), déplacée *hors* du `<form>` specs pour éviter les `<form>` imbriqués (le composant possède son propre formulaire).
  - Zone 3 (pleine largeur sous la grille) : **Commerciaux Responsables** (cases à cocher / liste, badge « Privilège Resp Point Clients », compteur).
  - Le `<form>` specs (`handleSaveSpecs`) n'enveloppe plus que la colonne gauche ; la sauvegarde des commerciaux sélectionnés continue via le bouton « Enregistrer les spécifications ».
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #10 — Photo modèle en vue pleine dans l'en-tête ✅ Terminé

- **Demande :** modifier l'affichage de la photo du modèle dans l'en-tête pour voir la photo en entier, à la totalité de sa grandeur.
- **Livré :** la carte Frame passe de 240px → `max-w-[320px]` ; le conteneur `aspect-video` + `object-cover` (qui rognait/re-cadrait la photo) est remplacé par `object-contain` avec `max-h-[260px]` : la photo s'affiche donc **entière**, à sa taille maximale possible, sans recadrage, centrée sur fond sombre. Bouton Supprimer + « Agrandir » conservés.
- **Vérifié :** lint OK, rebuild container OK.

### #9 — En-tête de fiche épuré + « Frame / Visuel Modèle » centré ✅ Terminé

- **Demande :** dans l'en-tête de la fiche (`CardIdentityModal.tsx`), retirer le badge « Étape », le badge « Client », la bannière « Commerciale(s) » et le nom de la carte ; **déplacer** le conteneur « Frame / Visuel Modèle » **au milieu de l'en-tête**, **rétréci d'un quart**, contenu inchangé.
- **Livré :**
  - Suppression du badge `Étape: {name}`, du badge `Client`, de la bannière commerciaux et du `<h2>{card.modele}</h2>` (la variable `currentStep` devenue inutilisée a été retirée).
  - En-tête restructuré en grille `1fr / auto / 1fr` (bascule `lg`) : gauche = référence + invités + barre Étiquettes/Due Date ; centre = carte « Frame / Visuel Modèle » (240px ≈ ¾ de l'ancienne colonne du corps) ; droite = step changer + Dupliquer/Archiver/Supprimer/Fermer. Conserve : référence, Étiquettes, Due Date, selecteur de step et boutons d'actions.
  - Conteneur original retiré du corps de l'onglet identité ; l'upload/agrandir/suppression photo fonctionnent toujours (déplacé hors du `<form>`, sans changement de logique).
- **Vérifié :** lint OK, rebuild container OK, health OK.

### #8 — Archives par board + bouton « Archiver la fiche » ✅ Terminé

- **Demande :** créer un environnement « archives » dans chaque board, visible dans la vue Kanban (dans le conteneur affichant le titre du board) ; ajouter un bouton « Archiver la fiche » entre « Dupliquer la fiche » et « Supprimer la fiche ».
- **Livré :**
  - Champ `archived?: boolean` sur `Card` (types.ts) + colonne `cards.archived BOOLEAN DEFAULT FALSE` (création + migration idempotente) + `rowToCard`.
  - POST/PUT gèrent `archived` ; le toggle archive/restaure recalcule `sort_order` de l'étape.
  - `filteredCards` exclut les fiches archivées (Kanban, liste, pôles, Direction) ; `archivedCards` calculées par board actif.
  - Bouton **« Archives »** (avec compteur) dans la barre supérieure Kanban = zone du titre du board → ouvre `ArchivesModal.tsx` (restaurer, supprimer, ouvrir la fiche).
  - Bouton **« Archiver la fiche »** dans l'en-tête de `CardIdentityModal.tsx`, entre Dupliquer et Supprimer (reste « Restaurer la fiche » si déjà archivée).
- **Vérifié :** PUT `archived:true` puis `false` via API + en base (retour `f`). Lint OK, container rebuildé, health OK.

### #7 — Doublons de Référence / Nom du modèle + « Dupliquer la fiche » ✅ Terminé

- **Demande :** la référence et le nom du modèle ne doivent plus être uniques ; pouvoir copier une fiche (créer un double) et la modifier ensuite.
- **Livré :**
  - Contrainte `UNIQUE` sur `reference` supprimée (CREATE + `DROP CONSTRAINT IF EXISTS cards_reference_key`) — `modele` n'a jamais été unique.
  - Serveur : plus de 409 de collision sur POST/PUT ; auto-génération de référence conservée si champ vide.
  - Client : suppression de toutes les vérifications de collision (App.tsx, CreateCardModal, CardIdentityModal) ; helpers `isReferenceTaken`/`getCollidingCard` supprimés.
  - Bouton **« Dupliquer la fiche »** dans `CardIdentityModal` → copie exhaustive (même référence + modèle), nouvel id, log « Duplication de la fiche », sans visiteurs.
- **Vérifié :** création doublon (201), mise à jour vers une référence existante (200), 2 lignes identiques en base puis doublon de test supprimé.

### #6 — Tri alphabétique par référence + réordonnancement manuel persistant ✅ Terminé

- **Demande :** les cartes d'une étape triées par référence (alphabétique) avec possibilité de réordonner manuellement par drag-and-drop vertical, persisté.
- **Livré :**
  - `sortOrder?: number` sur `Card` + colonne `cards.sort_order INT` ; tri d'affichage = `sortOrder` sinon référence (`localeCompare('fr', numeric, base)`).
  - `PATCH /api/cards/reorder` (renumérote et persiste l'ordre d'une étape) ; POST place la nouvelle carte à sa place alphabétique ; PUT (déplacement d'étape / changement de référence) re-trie **seules** les étapes affectées.
  - Drag vertical dans les colonnes avec indicateur « avant/après » (liseré indigo) ; le tri alphabétique écrase l'ordre manuel seulement quand l'étape est modifiée.
- **Vérifié :** création → position 0 ; reorder → persistance 0..11 ; move step-dt↔step-brief → re-tri correct.

### #5 — Réduction du header et des top bars + hauteur Kanban ✅ Terminé

- Header : `py-3→py-2`, `gap-4→gap-3` ; top bar Kanban : `py-2.5→py-2` ; hauteur des colonnes Kanban ajustée à `calc(100vh-174px)`.
- **Vérifié :** lint + rebuild OK à chaque étape.

### #4 — Hauteur fixe des colonnes Kanban + drag-to-scroll horizontal ✅ Terminé

- Colonnes à hauteur fixe (`h-[calc(100vh-190px)]` puis ajustée), cartes scrollables verticalement ; défilement horizontal par glissement souris (listeners `window`), curseur grab/grabbing, exclusion des éléments `[data-card]`.
- **Vérifié :** lint + rebuild OK.

### #3 — Colonnes Kanban « vitrées » (glassmorphism) ✅ Terminé

- Colonnes `bg-black/5 hover:bg-black/10 border-white/20` (sans backdrop-blur lourd), en-têtes `bg-white/20 hover:bg-white/30` + drop-shadow, compteurs `bg-white/30`, zones vide en pointillés, placeholder de drop allégé.

### #2 — Prévention des corruptions d'encodage ✅ Terminé

- **Problème :** des requêtes d'écriture avec des apostrophes françaises produisaient des `??` en base (client SQL brut mal encodé).
- **Livré :** script `scripts/migrate-db.ps1` (dump par fichier, auto-détection du chemin `pg_dump.exe`, flag `-Apply`, contrôle d'intégrité après dump/restore) + section 6 « PostgreSQL Docker & Migration de Données » dans `doc/GUIDE_TECHNIQUE.md`.
- **Vérifié :** dump local 3,1 Mo avec 0 `??`, 0 corruption après contrôle.

### #1 — Réparation de l'encodage PostgreSQL (accents `??`) ✅ Terminé

- **Problème :** accents stockés en `??` (ex. « Robe du Soir Plissée Soleil » → « Robe du Soir Pliss??e Soleil »).
- **Livré :** reconstruction des 5 tables depuis la base locale propre `suivi_flux_merch` (utilisateurs, boards, pôles, étapes, cartes), régénération de `history_logs` ; 0 corruption restante ; redémarrage du conteneur app.
- **Données :** users 12, boards 10, poles 3, steps 29, cartes 151.

---

## 🔧 Contexte projet (utile pour les prochaines sessions)

- **Dépendances :** `npm run lint` = `tsc --noEmit` (à exécuter après chaque modification). Build : `docker compose up --build -d app`. Health : `http://localhost:3000/api/health`.
- **PostgreSQL Docker :** conteneur `suivi_flux_postgres`, base `suivi_flux_db` ; hôte `localhost:5433`, interne `db:5432`. Identifiants dans `.env` (ne pas écrire les mots de passe dans ce fichier).
- **Base locale propre :** `suivi_flux_merch` (port 5432) = source de vérité de la réparation d'encodage ; `scripts/migrate-db.ps1` sert à la répliquer.
- **Règles acquises :**
  - Toujours vérifier « aucune corruption `??` » après création/édition de cartes.
  - L'utilisateur parle français et crée des données en parallèle : ne pas casser les écritures ; migrations DB idempotentes (`ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`).
  - Fiches canevas : référence et nom du modèle NON uniques (doublons autorisés), tri par `sort_order` sinon alphabétique, archivage via `archived`.
