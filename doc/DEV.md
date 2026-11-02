# 🛠️ Guide Technique & Administration — Outil type trello

Architecture, environnement, sécurité, schéma SQLite, API REST, déploiement, sauvegardes et dépannage (environnement pur Node.js sans Docker).

---

## 1. Architecture système

```
   Navigateur (SPA React + Tailwind)
        │  HTTPS / http://localhost:3000
        ▼
   +-------------------------------------------------------------+
   |  Processus Node.js + Express                                |
   |                                                             |
   |  server.ts  ── Express                                      |
   |     ├─ CORS (allow-list) + body JSON 50 Mo                  |
   |     ├─ /api/v1/* et /api/*  → server/routes/*               |
   |     |      ├─ authenticateToken (JWT)                       |
   |     |      ├─ requireStaff / contrôles par rôle             |
   |     |      └─ SQLite (better-sqlite3) ──► dev.db            |
   |     ├─ DEV : Vite en middlewareMode (HMR, un seul port)     |
   |     └─ PROD : express.static(dist) + fallback index.html     |
   +-------------------------------------------------------------+
```

**Caractéristiques**

- Port unique d'écoute : **3000** (`server.ts`).
- Double préfixe d'API : `/api/v1` et `/api` (mêmes routers).
- Mode dev **unifié** : Vite tourne en middleware Express (aucun problème de CORS en local).
- Base de données : **SQLite** locale (`dev.db` via `better-sqlite3`), avec réplication miroir en mémoire (`memoryDb`).
- Déploiement : Exécution directe avec Node.js 20+ (aucun besoin de Docker).

---

## 2. Démarrage & Commandes

### 2.1 En local avec Node.js (`npm`)

```bash
npm install      # Installer les dépendances
npm run dev      # Lancer en développement (http://localhost:3000)
npm run build    # Compiler le frontend React et le backend Node.js
npm run start    # Lancer le serveur de production compilé (dist/server.cjs)
npm run lint     # Vérifier les types TypeScript
```

### 2.2 Scripts Windows

- **`start.bat`** : double-cliquez pour installer les dépendances et démarrer le serveur de développement directement.
- **`start.ps1`** : script PowerShell (`.\start.ps1 dev`, `.\start.ps1 build`, `.\start.ps1 backup`).

### 2.3 Commandes Makefile (`make help`)

```bash
make dev         # Lancer en mode développement
make build       # Compiler pour la production
make start       # Lancer la version compilée
make backup      # Sauvegarder la base dev.db dans backups/
make restore     # Restaurer la dernière sauvegarde
make clean       # Nettoyer dist/
```

---

## 3. Variables d'environnement (`.env`)

| Variable | Usage | Défaut / valeur exemple |
| :--- | :--- | :--- |
| `DATABASE_PATH` | Emplacement du fichier SQLite | `./dev.db` |
| `JWT_SECRET` | Signature des JWT (obligatoire en prod, secret dev aléatoire sinon) | — |
| `JWT_EXPIRES_IN` | Durée de validité du jeton staff (`7d`, `30d`…) | `7d` |
| `DIRECTION_SECRET_CODE` | Code secret exigé à l'inscription Direction | `direction2026` |
| `ALLOWED_ORIGINS` | Allow-list CORS (origines autorisées en virgule) | `http://localhost:3000` |
| `NODE_ENV` | `production` ou `development` | `development` |
| `VITE_PUBLIC_URL` | URL publique pour liens directs | fallback `window.location` |

---

## 4. Sécurité & Authentification

- **JWT** signé (`Authorization: Bearer <token>`), payload : `{ id, email, name, role, posteLabel }`.
- Jeton **visiteur** distinct (`role: 'visiteur'`, portée `cardId`/`boardId`/`poleId`, expiration **30 jours**).
- **Mots de passe : PBKDF2** — SHA-512, 100 000 itérations, sel 16 octets ; format `pbkdf2:100000:<salt>:<hash>`.
- Contrôles d'accès RBAC appliqués sur les routes serveur (`server/middleware/auth.ts`) et dans les vues React.

---

## 5. Base de données SQLite (`server/db.ts`)

- Fichier SQLite géré par `better-sqlite3`.
- Initialisation automatique des tables au démarrage (`initDatabase()`).
- Hydratation d'un miroir mémoire (`memoryDb`) garantissant la continuité même en cas de fichier temporaire.
- Tables principales : `steps`, `users`, `cards`, `poles`, `boards`.

---

## 6. Sauvegardes et Restauration

Puisque toute la base réside dans le fichier **`dev.db`**, la sauvegarde et la restauration consistent en une simple copie de fichier :

```bash
# Sauvegarder
make backup
# ou sous PowerShell :
.\start.ps1 backup

# Restaurer
make restore
```
