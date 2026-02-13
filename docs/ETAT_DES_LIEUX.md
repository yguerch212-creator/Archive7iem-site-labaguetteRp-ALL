# Archives Wehrmacht RP — État des Lieux

**Date** : 13 février 2026  
**Version** : 1.0  
**Site** : http://76.13.43.180

---

## 1. ÉTAT ACTUEL DU PROJET

### Infrastructure ✅
| Composant | État | Détail |
|-----------|------|--------|
| VPS Hostinger | ✅ Opérationnel | 16 GB RAM, Ubuntu |
| MySQL 8.0 | ✅ Docker | Container `gmod-mysql`, port 3306 |
| Node.js/Express | ✅ pm2 | Process `archives7e`, port 3001 |
| Nginx | ✅ Reverse proxy | Sert React build + proxy `/api/` |
| React (Vite) | ✅ Build prod | Servi depuis `/client/dist` |
| GitHub | ✅ Repo propre | Commits réguliers, pas de fichiers académiques |

### Base de données
| Table | Données | État |
|-------|---------|------|
| `unites` | 7 unités | ✅ Complet |
| `grades` | 101 grades (7 unités) | ✅ Complet |
| `effectifs` | 43 effectifs | ✅ Nettoyé (doublons supprimés) |
| `rapports` | 9 rapports (3 types) | ✅ Fonctionnel |
| `users` | 1 (admin) | ✅ |
| `groups` | 2 (Administration, Recenseur) | ✅ |
| `presences` | Table créée, vide | 🔧 En attente |
| `casiers` | Table dans schema.sql | 🔧 Pas encore en prod |
| `dossiers` | Table dans schema.sql | 🔧 Pas encore en prod |

### Pages Frontend
| Page | Route | État |
|------|-------|------|
| Login | `/` | ✅ Immersif, fond parchemin |
| Dashboard | `/dashboard` | ✅ Stats + bar charts par unité + 5 derniers rapports |
| Changement MDP | `/change-password` | ✅ |
| Liste Unités | `/unites` | ✅ Cards par unité |
| Liste Effectifs | `/unites/:id/effectifs` | ✅ Tableau filtrable + colonnes Fonction/Catégorie |
| Création Effectif | `/effectifs/new` | ✅ Formulaire complet |
| Édition Effectif | `/effectifs/:id/edit` | ✅ Réutilise EffectifNew |
| Soldbuch | `/effectifs/:id/soldbuch` | ✅ Responsive flexbox/grid |
| Layout Soldbuch | `/effectifs/:id/soldbuch/layout` | 🔧 Page existe, InteractJS pas encore branché |
| Liste Rapports | `/rapports` | ✅ Filtrable par type/unité |
| Création Rapport | `/rapports/new` | ✅ Formulaire unifié 3 types |
| Vue Rapport | `/rapports/:id` | ✅ Vue lecture |
| Layout Rapport | `/rapports/:id/layout` | 🔧 Page existe, InteractJS pas encore branché |
| Recherche | `/search` | ✅ Globale effectifs + rapports |
| Admin Users | `/admin/users` | ✅ CRUD users + toggle admin |
| PDS | `/pds` | 🔧 Page créée, pas fonctionnel |

### API Backend
| Route | Méthodes | État |
|-------|----------|------|
| `/api/auth/*` | POST login, PUT change-password | ✅ |
| `/api/effectifs/*` | GET, POST, PUT, DELETE | ✅ |
| `/api/unites/*` | GET unités, GET grades par unité | ✅ |
| `/api/rapports/*` | GET, POST, PUT, DELETE | ✅ |
| `/api/soldbuch/*` | GET, PUT layout | ✅ |
| `/api/search` | GET | ✅ |
| `/api/admin/*` | GET/POST/PUT users, group toggle | ✅ |
| `/api/stats` | GET | ✅ |
| `/api/pds/*` | CRUD presences | 🔧 Routes créées, pas testées |

### Middleware Auth
| Middleware | État |
|------------|------|
| `auth.js` — JWT vérification | ✅ Vérifie isAdmin + isRecenseur |
| `admin.js` — Admin only | ✅ |
| Recenseur middleware | 🔧 Auth mis à jour, middleware dédié à faire |

### Design
- ✅ Design system complet (`global.css`) — palette militaire, IBM Plex Mono, parchemin
- ✅ Badges, alerts, tags, stat cards, unit cards, status dots
- ✅ Couleurs par unité (7 couleurs)
- ✅ Responsive Soldbuch (flexbox/grid)
- ✅ User validé le design : "C'est magnifique GG"

### Problèmes connus
- ❌ Safari iOS ne charge pas le site (IPv4 ni IPv6) — Chrome mobile OK
- 🔧 InteractJS pas encore intégré (drag & drop layouts)
- 🔧 Pas de HTTPS (HTTP uniquement)

---

## 2. DONNÉES DE LORE ACCUMULÉES

Tout stocké localement dans `/tmp/discord_lore/` (jamais push GitHub).

### Sources collectées
| Source | Contenu | Format |
|--------|---------|--------|
| Discord — annonce_rp | 26 channels exportés, 298 Mo | JSON |
| Discord — channel_2 | Promotions, mutations | JSON |
| Discord — channel_3 | Annonces régimentaires | JSON |
| Google Docs (11 docs) | Lore détaillé, procédures | Markdown |
| Google Sheets (2) | Roster 916 effectifs | CSV |
| Google Site (1) | Site existant LaBaguetteRP | HTML |
| Pages web existantes (4) | Ancien site PHP | HTML |

### Fichiers d'analyse produits
| Fichier | Contenu |
|---------|---------|
| `CHRONOLOGIE_COMPLETE.md` | Timeline complète Dec 2024 → Feb 2026 |
| `PROMOTIONS_CHRONOLOGIE.md` | 1131 événements (promos, mutations, etc.) |
| `ANNONCES_RP_CHRONOLOGIE.md` | Annonces RP ordonnées |
| `ANNONCES_REGIMENT_CHRONOLOGIE.md` | Annonces régimentaires |
| `TOUS_PERSONNAGES.md` | 267 personnages uniques identifiés |
| `ANALYSE_COMPLETE.md` | Analyse globale du lore |
| `ROADMAP_SITE.md` | Roadmap Phase 1-4 |
| `LORE_COMPLET.md` | Synthèse complète |

### Données clés extraites
- **7 unités** actives (002 SS "Das Reich" retirée pour raisons éthiques)
- **267 personnages** identifiés dans les channels Discord
- **43 effectifs** actuellement en base (nettoyés)
- **Organigramme officiel** (4 fév 2026) : commandants + adjts par unité
- **Exécutions documentées** : Heinzenbourg & Kartofel
- **Tableau d'honneur** : décorations par unité
- **916 noms du roster** Google Sheet importés (référence)

---

## 3. LIENS & RESSOURCES

### Accès
| Ressource | URL/Info |
|-----------|----------|
| Site live | http://76.13.43.180 |
| Repo GitHub | https://github.com/yguerch212-creator/Archive7iem-site-labaguetteRp-ALL |
| Admin login | `admin` / `Admin7e2025!` |
| VPS SSH | 76.13.43.180 |
| DB Docker | `172.17.0.1:3306`, user `archives_user`, db `archives7e` |

### Serveur RP
| Info | Détail |
|------|--------|
| Serveur | Axe \| LaBaguetteRP |
| Jeu | Garry's Mod |
| Mode | DarkRP WW2 |
| Époque | Normandie 1944 |
| Unités | 7 régiments Wehrmacht |

### Google Docs/Sheets du serveur (liens récupérés)
- Roster Sheet (916 effectifs)
- Docs de lore par régiment
- Organigramme Google Doc
- *(Liens exacts dans les fichiers de lore locaux)*

---

## 4. ARCHITECTURE TECHNIQUE

```
Client (React/Vite) → Nginx (:80) → API (Express :3001) → MySQL (Docker :3306)
                                   ↘ Static files (/client/dist)
```

### Stack
- **Frontend** : React 18, Vite, React Router, CSS custom (IBM Plex Mono, parchemin)
- **Backend** : Node.js, Express, JWT (bcrypt), mysql2
- **DB** : MySQL 8.0 (Docker container `gmod-mysql`)
- **Process** : pm2 (`archives7e`)
- **Reverse Proxy** : Nginx
- **Pas de framework UI** — tout custom

### Fichiers clés
```
client/src/styles/global.css     — Design system complet
client/src/auth/useAuth.jsx      — Hook auth + context
client/src/api/client.js         — Axios + JWT interceptors
client/src/router.jsx            — Toutes les routes
server/src/middleware/auth.js     — JWT + isAdmin + isRecenseur
server/src/middleware/admin.js    — Admin-only guard
server/src/routes/*.routes.js    — API routes
server/src/controllers/*.js      — Logique métier
database/schema.sql              — Schéma complet
database/seed.sql                — Données initiales
```
