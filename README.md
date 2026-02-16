# 🏛️ Archives 7e Armeekorps

Plateforme de gestion documentaire et administrative immersive pour le serveur RP **Axe | LaBaguetteRP** (Garry's Mod WW2).

🔗 **Site officiel** : [archives-7earmekorps.com](https://archives-7earmekorps.com)

---

## 📋 Fonctionnalités

### Documents & Rapports
- **Soldbuch** — Livret militaire individuel avec mise en page personnalisable
- **Rapports** — Journaliers, incidents, recommandations avec chaîne de validation hiérarchique
- **Dossiers personnels** — Carnets avec layout drag & drop (InteractJS)
- **Documentation** — Dossiers avec Google Docs/Sheets/PDF intégrés, validation officier
- **Journal** — Gazette style "Wacht am Korps" multi-articles

### Gestion des effectifs
- **Effectifs** — Fiches complètes avec grades, unités, spécialités, photo
- **Organigramme** — Arbre hiérarchique interactif sur fond parchemin
- **PDS (Plan de Service)** — Self-service par semaine RP (vendredi → vendredi)
- **Interdits de front** — Suivi des soldats interdits d'opérations
- **Visites médicales** — Certificats avec signature médecin

### Communication & Justice
- **Télégrammes** — Système de messagerie RP avec multi-destinataires et confidentialité
- **Justice militaire** — Affaires, pièces à conviction, signatures, code pénal complet
- **Notifications** — Alertes in-app (Feldgendarmerie notifiée sur incidents)

### Administration
- **Signatures** — Canvas Paint-style, réutilisables, demande par télégramme
- **Bibliothèque** — Tampons officiels
- **Calendrier & Ordres** — Événements et ordres avec accusés de réception
- **Archives** — Consultation et export PDF de tous les documents
- **Galerie** — Photos du régiment
- **Logs d'activité** — Audit trail complet

### Permissions hiérarchiques
| Groupe | Rôle |
|--------|------|
| Administration | Gestion technique du système |
| Administratif | Gestion des effectifs, PDS, comptes |
| Officier | Validation, documentation, commandement |
| Sous-officier | Rapports, documentation (avec validation) |
| Feldgendarmerie | Justice militaire, prise en charge incidents |
| Sanitäts | Visites médicales |
| État-Major | Équivalent admin |

---

## 🛠 Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js 22, Express |
| Base de données | MySQL 8.0 (Docker) |
| Auth | JWT + bcrypt |
| Serveur web | Nginx (reverse proxy) |
| Process manager | PM2 |
| SSL | Let's Encrypt (certbot) |
| Design | CSS Variables, IBM Plex Mono, style parchemin militaire |
| Drag & Drop | InteractJS |

---

## 📁 Structure du Projet

```
├── client/                 # Frontend React (Vite)
│   ├── src/
│   │   ├── components/     # Composants réutilisables (Topbar, LayoutEditor, SignatureCanvas...)
│   │   ├── pages/          # Pages par module (effectifs, rapports, sanctions...)
│   │   ├── auth/           # AuthContext, ProtectedRoute
│   │   ├── api/            # Client Axios
│   │   └── styles/         # CSS global + unités
│   └── dist/               # Build production (généré)
├── server/                 # Backend Node.js
│   ├── src/
│   │   ├── controllers/    # Auth controller
│   │   ├── routes/         # 25+ fichiers de routes API
│   │   ├── middleware/      # auth, admin, recenseur, autoLog, feldgendarmerie
│   │   ├── config/         # DB pool, env
│   │   └── utils/          # Logger, devLogger, historique, discordNotify
│   ├── uploads/            # Fichiers uploadés (photos, signatures)
│   └── logs/               # Logs dev (rotation 30j, pas dans git)
├── database/
│   ├── schema.sql          # Schéma complet (47 tables)
│   ├── seed.sql            # Données initiales (grades, unités, infractions)
│   └── dump_clean.sql      # Dump propre pour migration
├── deploy/
│   ├── README.md           # Guide de déploiement complet
│   ├── backup.sh           # Script de sauvegarde DB automatique
│   ├── restore.sh          # Script de restauration
│   └── nginx-https.conf    # Config Nginx avec SSL
├── docs/                   # Documentation projet
├── legacy/                 # Ancien code PHP (référence uniquement)
└── .env.example            # Template des variables d'environnement
```

---

## 🚀 Démarrage rapide

### 1. Cloner

```bash
git clone https://github.com/yguerch212-creator/Archive7iem-site-labaguetteRp-ALL.git
cd Archive7iem-site-labaguetteRp-ALL
```

### 2. Base de données

```bash
docker run -d --name archives-mysql --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD='MotDePasseRoot' \
  -e MYSQL_DATABASE='archives7e' \
  -e MYSQL_USER='archives_user' \
  -e MYSQL_PASSWORD='MotDePasseDB' \
  -p 3306:3306 -v mysql_data:/var/lib/mysql \
  mysql:8.0 --default-authentication-plugin=mysql_native_password \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

# Importer le schéma
docker exec -i archives-mysql mysql -u archives_user -p'MotDePasseDB' archives7e < database/dump_clean.sql
```

### 3. Configuration

```bash
cp .env.example .env
# Éditer .env avec vos identifiants
```

### 4. Backend

```bash
cd server && npm install && cd ..
```

### 5. Frontend

```bash
cd client && npm install && npm run build && cd ..
```

### 6. Lancer

```bash
# Dev
cd server && node src/index.js

# Production (avec PM2)
pm2 start server/src/index.js --name archives7e
```

> 📖 **Guide complet de déploiement production** : voir [`deploy/README.md`](deploy/README.md)

---

## 🔐 Sécurité

- Mots de passe hashés avec **bcrypt** (salt 10)
- Authentification **JWT** avec expiration 24h
- **Rate limiting** : 300 req/min (general), 30/15min (login)
- **Helmet** : headers de sécurité
- **DOMPurify** : protection XSS sur le rendu HTML
- Validation des uploads (type, taille)
- Logs d'audit (activité + erreurs + crashes)

---

## 🔄 Sauvegardes

Sauvegarde automatique quotidienne de la DB. Voir [`deploy/README.md`](deploy/README.md#-sauvegardes-automatiques) pour la configuration.

```bash
# Backup manuel
./deploy/backup.sh

# Restauration
./deploy/restore.sh
```

---

## 📄 Licence

Projet open source pour communauté de jeu de rôle. Utilisation libre.

---

**Archives 7e Armeekorps** — *Dieses Archiv ist ein offizielles Dokument der Wehrmacht.*
