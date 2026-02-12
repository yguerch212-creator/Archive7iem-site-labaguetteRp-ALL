# Archives Wehrmacht RP

Plateforme d'archives militaires immersive pour le serveur RolePlay **Axe | LaBaguetteRP** (Seconde Guerre mondiale, 84e Armeekorps).

## 🎯 Fonctionnalités

- **Gestion des effectifs** — Soldats, grades, unités avec hiérarchie dynamique
- **Soldbuch** — Livret personnel du soldat avec layout personnalisable (drag & drop)
- **Rapports officiels** — 3 types (journalier, recommandation, incident) avec mise en page et publication
- **Casiers judiciaires** — Suivi disciplinaire par effectif
- **Dossiers** — Gestion documentaire structurée
- **Recherche globale** — Recherche unifiée sur tout le contenu
- **Administration** — Gestion des utilisateurs et permissions par groupes

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|------------|
| Frontend | React 18 (Vite) |
| Backend | Node.js + Express |
| Base de données | MySQL 8.0 |
| Layout editor | InteractJS |
| Export | html2canvas + jsPDF |
| Infrastructure | Docker + Nginx |

## 📁 Structure

```
├── client/          # Frontend React (Vite)
├── server/          # Backend API REST (Express)
├── database/        # Schéma SQL + seed data
├── docker/          # Docker Compose + Nginx
└── legacy/          # Code PHP original (référence)
```

## 🚀 Installation

### Développement

```bash
# 1. Cloner le repo
git clone https://github.com/yguerch212-creator/Archive7iem-site-labaguetteRp-ALL.git
cd Archive7iem-site-labaguetteRp-ALL

# 2. Copier la config
cp .env.example server/.env

# 3. Installer les dépendances
cd client && npm install && cd ..
cd server && npm install && cd ..

# 4. Lancer la base de données
cd docker && docker compose up mysql -d && cd ..

# 5. Initialiser la BDD
mysql -h 127.0.0.1 -P 3307 -u archives_user -p archives7e < database/schema.sql
mysql -h 127.0.0.1 -P 3307 -u archives_user -p archives7e < database/seed.sql

# 6. Lancer le backend
cd server && npm run dev

# 7. Lancer le frontend (autre terminal)
cd client && npm run dev
```

### Production (Docker)

```bash
cd client && npm run build && cd ..
cd docker && docker compose up -d
```

Le site sera accessible sur le port 80.

## 🎨 Design

Interface immersive inspirée des archives militaires d'état-major :
- Fond parchemin texturé
- Police monospace (IBM Plex Mono)
- Palette militaire sobre
- Layout drag & drop pour la mise en page des documents

## 📋 API

L'API REST est disponible sur `/api/` :
- `/api/auth` — Authentification (JWT)
- `/api/unites` — Unités et grades
- `/api/effectifs` — Gestion des effectifs
- `/api/rapports` — Rapports officiels
- `/api/casiers` — Casiers judiciaires
- `/api/dossiers` — Dossiers
- `/api/search` — Recherche globale
- `/api/admin` — Administration

## 📜 Licence

Projet privé — Usage réservé au serveur LaBaguetteRP.
