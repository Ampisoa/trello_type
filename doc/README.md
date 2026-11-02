# Guide Utilisateur — outil type trello

L’outil type Trello a pour objectif de recréer Trello mais une version spécialement pour les commerciales pour faire le point client journalière et aussi de contourner les problèmes rencontrer sous Trello.

---


**PROBLEMATIQUE  RENCONTRER AVEC TRELLO:**

-Perte de lisibilité (Surcharge)

-Environ 250 commandes exécutées par mois

-Restrictions strictes qui freinent l’intégrations de plus de 10 collaborateurs

**PLAN DE RESOLUTION** :

-Création d’un outil permettant de suivre les étapes des modèles en cours sans perdre les données.

-Concevoir et développer une interface dédiée à la direction, offrant un environnement intuitif, ergonomique et facile à utiliser pour faciliter le suivi et le pilotage des activité

-Assurer la maintenance de l’application et effectuer les mises à jour nécessaires afin de garantir son bon fonctionnement et d’améliorer ses performances.

## 1. Présentation

L'application permet d'organiser et de suivre le passage des **modèles / cartes ** à travers des **étapes de fabrication configurables** (Modèle à entrer, Prix à faire, Proto, SMS,  SMS Envoyé, , TDS, …).

Points clés :

- **Vue Kanban** (colonnes = étapes) et **Tableau Liste** synchronisés.
- **Fiche identitaire** de chaque carte : spécifications, documents, équipe, commentaires.
- **Checklists d'étape imbriquées** avec traçage « Fait par X le jj/mm/aaaa ».
- **Pôles → Boards → Cartes** : organisation en équipes et tableaux de regroupement.
- **Visiteurs observateurs** : accès par lien, strictement en lecture seule.
- **Historique d'audit** horodaté sur chaque carte.

---

## 2. Connexion et Comptes

### 2.1 Se connecter

1. Au premier accès, l'écran **« Se Connecter / S'inscrire »** s'affiche.
2. Saisissez votre **email** et votre **mot de passe**, puis connectez-vous.
3. La session reste active (localStorage) : les liens directs ouverts dans un nouvel onglet conservent votre connexion.

### 2.2 S'inscrire

1. Choisissez l'onglet **Inscription**, puis renseignez nom, email, mot de passe (6 caractères minimum).
2. Sélectionnez votre **rôle / poste** dans la liste.
3. Les rôles marqués **« Validation Direction requise »** demandent en plus le **code secret Direction (direction2026)**.

### 2.3 Mon compte

- **Cliquez sur votre avatar** (en haut à droite) pour ouvrir votre fiche profil : photo/avatars, nom, intitulé de poste, email, mot de passe.
- **Déconnexion** : bouton rouge en haut à droite → écran de connexion obligatoire.

---

## 3. Droits d'accès (Matrice)

Le modèle actuel distingue **ceux qui pilotent** (édition) et **ceux qui consultent et cochent** :

| Profil                                                                          |              Voir les cartes              | Éditer cartes / boards / pôles / étapes | Modifier les checklists |    Commentaires    | Vue **Direction** |
| :------------------------------------------------------------------------------ | :---------------------------------------: | :----------------------------------------: | :---------------------: | :----------------: | :---------------------: |
| **Direction** (`directeur`, `directeur général`, `admin`)         |                 ✅ Toutes                 |                     ✅                     |           ✅           |         ✅         |           ✅           |
| **Responsable Point Client** (poste exact)                                |                 ✅ Toutes                 |                     ✅                     |           ✅           |         ✅         |           ❌           |
| **Responsable Point Client temporaire** (désignation à durée limitée) |                 ✅ Toutes                 |            ✅ pendant la durée            |           ✅           |         ✅         |           ❌           |
| **Commercial / Merch / Resp. Planning / Magasinier / Fournisseur**        |    ✅ Cartes qui leur sont assignées    |             ❌ (lecture seule)             |           ✅           |         ✅         |           ❌           |
| **Visiteur observateur** (invité par lien)                               | ✅ Uniquement ce pour quoi il est invité |                     ❌                     |           ❌           | ❌ (lecture seule) |           ❌           |

- **Édition** (boutons *Nouvelle Carte*, *Étapes*, *Fond d'écran*, *Créer un Nouveau Board*, crayon *Modifier ce board*, suppression/duplication d'une fiche) : Direction et Responsable Point Client uniquement.
- **Invitations et retraits de visiteurs**, **affectation des merchandisers**, **désignation d'un responsable temporaire** : Responsable Point Client principal uniquement.
- **Checklists** : éditables par la Direction, les Commerciaux, le Planning et le Responsable Point Client (lecture seule pour les visiteurs).
- **Tout le monde** peut consulter l'historique et le fil **Commentaires & Échanges**.

> Si un bouton manque, c'est que votre profil n'a pas les droits correspondants.

---

## 4. La barre supérieure (Header)

| Élément                                                                | Rôle                                               |
| :----------------------------------------------------------------------- | :-------------------------------------------------- |
| Logo **Suivi de Flux & Fiches Cartes**                             | Retour à l'accueil                                 |
| Badge « En direct »                                                    | Synchronisation automatique avec le serveur         |
| **Accueil**                                                        | Tableau Liste de tous les modèles                  |
| **Tableau Liste**                                                  | Vue tableau détaillée                             |
| **Vue Kanban**                                                     | Vue colonnes                                        |
| **Pôles**                                                         | Tableau de bord des pôles et boards                |
| **Clients**                                                        | Annuaire des clients / marques                      |
| **Direction** *(Direction uniquement, badge « Pilote »)*       | Cockpit de pilotage stratégique                    |
| **Recherche** « Rechercher par référence, modèle, client... » | Filtre instantané dans les vues                    |
| **Ajuster Steps** *(édition)*                                   | Configuration des étapes et checklists par défaut |
| **Nouvelle Carte** *(édition)*                                  | Création d'une carte                               |
| Avatar / **Déconnexion**                                          | Profil et session                                   |

Sur écran étroit, la barre de navigation passe sur **deux lignes** — tous les onglets restent visibles.

---

## 5. Tableau Liste (Accueil)

Vue tabulaire de toutes les fiches non archivées. Colonnes : *Référence, Modèle, Commercial(e)s, Client, Étape Actuelle, Due Date, Dossier rattaché (PDF), Frame, Livraison, Checklists* (barre de progression), *Action* (« Ouvrir la fiche »).

Un filtre permanent (recherche du header) et la sélection d'un board restreignent l'affichage.

---

## 6. Vue Kanban

### 6.1 Barre du Kanban

- **Sélecteur de board** : « Vue Globale (Tous les modèles) » ou un board précis.
- **Archives** (badge ambre) : fiches archivées du board actif (restauration / suppression définitive).
- **Tous les modèles** : revenir à la vue globale.
- **Nouvelle carte** *(édition)* : création dans le board courant.
- **Étapes** *(édition)* : personnaliser les étapes de **ce board** (ajout, renommage, suppression, réordonnancement).
- **Fond d'écran** *(édition)* : presets, upload ou URL.
- **Copier le lien direct de ce board** : partage par email / SMS.

### 6.2 Colonnes et cartes

- Chaque colonne = une étape ; l'en-tête indique le nom et le compteur.
- **Glisser-déposer** une carte d'une colonne à l'autre pour changer d'étape ; **vertical** pour réordonner dans la colonne.
- **Glisser les en-têtes de colonnes** pour réordonner les étapes du pipeline.
- **Déposer un fichier** de votre ordinateur directement sur une carte (PDF → dossier technique, image → frame).
- Menu **…** d'une colonne : tri (*Référence A→Z*, *Création récent*, *Création ancien*), *Créer une carte ici*, *Archiver toute la colonne*.
- Les badges de **Due Date** passent en **rouge** (retard), **ambre** (aujourd'hui/demain) ou **vert** (à venir).

### 6.3 Les deux types de cartes

|              | **Carte Modèle (production)**                                             | **Carte Simple (note / mémo)**     |
| :----------- | :------------------------------------------------------------------------------- | :---------------------------------------- |
| But          | Suivi d'un modèle pour un client                                                | Idée, mémo, visuel libre                |
| Champs       | Référence `REF-AAAA-NNN`, client, modèle, matière, prix, quantités, dates | Nom + visuel (emoji, GIF, photo, message) |
| Rattachement | Client, dossier technique, frame                                                 | Aucun client ni référence de production |

---

## 7. Créer une carte

1. **Nouvelle Carte** (header) ou **… → Créer une carte ici** dans une colonne.
2. Choisissez le type : *Carte pour Modèle — Production & Collection* ou *Carte Simple — Note, mémo & visuel libre*.
3. Remplissez les champs (la **référence** est proposée automatiquement, ex. `REF-2026-004`) : client (avec suggestions), modèle, matière, prix, quantités, dates de livraison et **Due Date** (prochaine relance) avec sa note.
4. Joignez éventuellement le **Dossier Technique (PDF)** et la **Photo Frame**.
5. Validez : la carte apparaît dans la première colonne du board.

---

## 8. La fiche identitaire (5 onglets)

En cliquant sur une carte, la fiche s'ouvre avec l'onglet **Checklists par Étape** par défaut :

| Onglet                                                                                                             | Contenu                                                                         |
| :----------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Checklists par Étape**                                                                                    | Ruban d'étapes glissant + arborescence des tâches                             |
| **Fiche Identitaire & Spécifications** *(cartes modèle)* / **Notes & Visuel** *(cartes simples)* | Spécifications, vagues de commande, due date, étiquettes, membres, historique |
| **Dossier rattaché & Médias (n)**                                                                          | PDF, Frame et pièces jointes complémentaires                                  |
| **Membres & Visiteurs (n)**                                                                                  | Équipe autorisée + invitations observateurs                                   |
| **Commentaires & Échanges (n)**                                                                             | Fil de discussion enrichi                                                       |

### 8.1 Checklists par Étape

- **Ruban d'étapes glissant** : faites défiler les étapes du doigt / au trackpad (flèches ‹ › sur desktop) ; l'étape sélectionnée est ramenée au centre.
- **Arborescence** : cocher une tâche crée automatiquement l'auteur et la date (« Fait par Sophie Bertrand le 12/10/2026 ») ; décocher pour annuler.
- **Sous-tâches imbriquées** : ajout, renommage (clic sur l'intitulé), suppression, réordonnancement par glisser-déposer.
- **Masquer / Afficher les cochés (n)** : ne garde que le travail restant.
- Barre d'**avancement** : nombre de tâches réalisées + pourcentage.
- Les modifications sont enregistrées immédiatement dans l'historique d'audit.

### 8.2 Fiche Identitaire & Spécifications

- **Référence / Client / Modèle**, matière(s) & composition (zone de texte enrichie).
- **Prix Unitaire** et **Quantité** : la quantité totale correspond à la **somme des vagues de commande** lorsque celles-ci existent.
- **Vagues de commande** : bouton **+ Vague**, nom (ex. « Vague 1 – Avril ») et quantité ; le total est recalculé et journalisé dans l'historique.
- **Due Date** + note de rappel (ex. « Relance validation tissu… »).
- **Étiquettes** : étiquette de couleurs depuis le popover (création, recherche, édition).
- **Zone Responsable Point Client** : membres de l'équipe, merchandisers affectés, designation d'un responsable temporaire *(Responsable Point Client uniquement)*.
- **Notes & Historique Descriptif** : texte enrichi (titres, listes, liens, images, emojis).
- **Historique des modifications** : journal complet, masquable par bouton.

### 8.3 Dossier rattaché & Médias

Aperçu et remplacement du **Dossier Technique PDF** et de la **Photo Frame**, ajout de pièces jointes complémentaires (nom, catégorie, auteur), ouverture dans la **visionneuse** plein écran.

### 8.4 Membres & Visiteurs

- Liste des membres autorisés avec badge *Commercial Responsable*, *COMMERCIAL (Édition)* ou *CLIENT (Lecture)*.
- Invitation d'un **visiteur observateur** par email (voir §11).

### 8.5 Commentaires & Échanges

Éditeur riche : mentions `@`, liens, images, emojis, raccourci **Ctrl + Enter**. Chaque auteur peut modifier ou supprimer ses propres messages ; les horodatages se mettent à jour (« Il y a 12 minutes »).

---

## 9. Étapes du pipeline (« Ajuster Steps »)

Bouton **Ajuster Steps** *(édition)* :

- Ajouter / renommer / supprimer une étape (la dernière ne peut pas être supprimée côté serveur).
- Réordonner par **glisser-déposer**, choisir la **couleur**, le **code** et la **description**.
- Définir les **checklists par défaut** : elles sont pré-remplies à la création de chaque nouvelle carte.
- Portée : **Pipeline global** (modèle Kanban) ou **Board courant** (étapes personnalisées du board).

---

## 10. Pôles, Boards et Clients

### 10.1 Vue Pôles (page d'accueil après connexion)

- Cartes de pôles : leaders, spécialité, compteurs de modèles et de boards, boutons **Nouveau Board** et **Attribuer des Boards**.
- **Fiche Pôle** (3 onglets) : *Identité du Pôle* (contacts, Teams, notes, boards rattachés), *Observateurs / Visiteurs*, *Paramètres & Attribution*.

### 10.2 Board

- **Créer / Modifier un board** : titre, description, pôle parent, **fond d'écran** (presets, upload, URL), sélection multi-cartes (les cartes déjà sur un autre board sont exclues), invités, **copie du lien direct**, suppression.
- Un board possède son propre pipeline d'étapes (instantané à la création, personnalisation possible).

### 10.3 Vue Clients

- Annuaire agrégé depuis les cartes + clients personnalisés : initiales, palette de couleurs, statistiques (modèles actifs/terminés, prochaine livraison).
- Formulaire **Nouveau Client / Marque**, filtre par nom, initiales ou email.
- **Fiche Client** : *Identité & Coordonnées*, *Modèles en Fabrication*, *Spécifications & Notes*.

### 10.4 Direction *(réservée)*

Cockpit avec KPI (*Valeur Totale Gérée*, *Volume Global Pièces*, *Enjeu Critique*, *Total Modèles Suivis*), filtres client/étape, tri par urgence ou valorisation, et trois sections : **Urgence**, **En Alerte**, **En Cours**.

---

## 11. Visiteurs observateurs (accès externe)

1. **Invitation** (fiche carte, fiche pôle ou board) : saisissez l'email — un **jeton d'accès** est généré.
2. Un **lien direct** est produit (contenant `?visitor_token=...`) : envoyez-le au consultant.
3. À l'ouverture du lien, l'application bascule en **mode observation** (bandeau ambre, lecture seule) et n'affiche que les éléments auxquels l'invité est rattaché.
4. **Révocation** : retirez l'invité depuis la fiche — le lien devient immédiatement invalide.

**Portée héritée** : invité au **pôle** → il voit les boards et les cartes de ce pôle ; invité à un **board** → il voit ses cartes ; invité sur une **carte** → il ne voit que celle-ci.

---

## 12. Archives

Chaque board dispose de sa zone **Archives** (bouton ambre de la barre Kanban). Les fiches archivées disparaissent des colonnes et des vues, mais restent consultables : **restauration** ou **suppression définitive** depuis cette zone.

---

## 13. Conseils & Responsive

- **Smartphone / fenêtre réduite** : modals redimensionnables, grides en une colonne, barres d'onglets sur plusieurs lignes, ruban d'étapes défilant horizontalement.
- Les **onglets** et les **étapes** sont toujours accessibles : rien n'est tronqué.
- Utilisez la **recherche** pour retrouver une fiche rapidement (référence, modèle, client).
- Les **liens directs** (bouton « Copier le lien ») partagent exactement la carte / le board / le pôle concerné.

---

## 14. Lancement
Ouvrez ensuite votre navigateur sur **http://localhost:3000**. 

---

## 15. FAQ

**Q : Le bouton « Nouvelle Carte » n'apparaît pas.**
*R : Vous n'êtes pas profil éditeur. Seuls la Direction et le Responsable Point Client (ou son délégué temporaire) peuvent créer et modifier les cartes, boards et pôles.*

**Q : Je suis Commercial, je ne peux pas modifier une fiche.**
*R : C'est le modèle actuel : les Commerciaux consultent leurs cartes et modifient leurs **checklists** et **commentaires**, mais l'édition des champs est réservée au Responsable Point Client et à la Direction.*

**Q : Pourquoi un visiteur ne peut-il pas commenter ?**
*R : Les observateurs externes sont strictement en lecture seule (le serveur refuse l'écriture). Ils peuvent tout lire, y compris les commentaires et l'historique.*

**Q : Où sont stockés mes PDF et photos ?**
*R : En base de données, sous forme de data URLs dans les colonnes JSONB de la carte (limites : 15 Mo par fichier).*

**Q : Comment relancer un point client ?**
*R : Définissez une **Due Date** et sa note sur la fiche : elle apparaît en badge coloré sur les vues Liste et Kanban.*

**Q : Mon lien de visiteur ne fonctionne plus.**
*R : L'invitation a été révoquée ou le jeton a expiré (validité 30 jours). Demandez une nouvelle invitation au Responsable Point Client.*

---

## Pour les développeurs
Toute la documentation technique (architecture, code, mapping des cellules, compilation, installeur) se trouve dans DEV.md.