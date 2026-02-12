# Archives Wehrmacht RP

Application de gestion documentaire et administrative pour la 7ème Division d'Infanterie Wehrmacht RP.

## 📋 Description

Archives Wehrmacht RP est une plateforme complète de gestion des effectifs, rapports militaires, dossiers personnels et casiers disciplinaires pour les communautés de jeu de rôle militaire historique.

### Fonctionnalités principales

- **Gestion des effectifs** : Création et suivi des soldats avec système de grades et d'unités
- **Rapports militaires** : Rédaction de rapports, incidents, recommandations et missions
- **Casiers disciplinaires** : Suivi des infractions et sanctions
- **Dossiers personnels** : Documents confidentiels et évaluations
- **Système d'authentification** : Gestion des utilisateurs et permissions par groupes
- **Interface moderne** : Design inspiré du papier parchemin avec typographie militaire

## 🛠 Stack Technique

- **Frontend** : React 18 + Vite + React Router
- **Backend** : Node.js + Express + MySQL
- **Authentification** : JWT + bcrypt
- **Base de données** : MySQL 8.0
- **Déploiement** : Docker + Nginx
- **Design** : CSS Variables + IBM Plex Mono

## 📁 Structure du Projet

```
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/         # Pages de l'application
│   │   ├── auth/          # Système d'authentification
│   │   ├── api/           # Client API (Axios)
│   │   └── styles/        # Feuilles de style
│   └── public/            # Assets statiques
├── server/                 # Backend Node.js
│   ├── src/
│   │   ├── controllers/   # Logique métier
│   │   ├── routes/        # Routes API
│   │   ├── middleware/    # Middleware Express
│   │   └── config/        # Configuration
│   └── uploads/           # Fichiers uploadés
├── database/              # Schémas et seeds SQL
├── docker/                # Configuration Docker
└── legacy/                # Code PHP original (référence)
```

## 🚀 Installation & Développement

### Prérequis

- Docker & Docker Compose
- Node.js 20+ (pour développement local)
- MySQL 8.0+ (pour développement local)

### Démarrage rapide avec Docker

1. **Cloner le repository**
```bash
git clone <url-du-repo>
cd Archive7iem-site-labaguetteRp-ALL
```

2. **Lancer l'environnement complet**
```bash
cd docker
docker-compose up -d
```

3. **Accéder à l'application**
- Frontend : http://localhost (via Nginx)
- Backend API : http://localhost/api
- Base de données : localhost:3306

### Développement local

1. **Base de données**
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

2. **Backend**
```bash
cd server
cp .env.example .env
# Configurer les variables d'environnement
npm install
npm run dev
```

3. **Frontend**
```bash
cd client
npm install
npm run dev
```

## 🔐 Authentification

### Utilisateur administrateur par défaut

- **Username** : `admin`
- **Password** : `admin123`
- **Email** : `admin@archives7e.com`

⚠️ **Important** : Changer le mot de passe administrateur lors du premier déploiement.

### Groupes d'utilisateurs

- **Administration** : Accès complet au système
- **Officier** : Gestion des effectifs et rapports
- **Sous-Officier** : Consultation et rapports basiques
- **Utilisateur** : Consultation uniquement

## 📚 API Documentation

### Endpoints principaux

- `POST /api/auth/login` - Connexion utilisateur
- `GET /api/auth/me` - Profil utilisateur actuel
- `GET /api/effectifs` - Liste des effectifs
- `POST /api/effectifs` - Créer un effectif
- `GET /api/rapports` - Liste des rapports
- `POST /api/rapports` - Créer un rapport
- `GET /api/unites` - Liste des unités
- `GET /api/admin/*` - Endpoints d'administration

### Authentification API

Toutes les routes (sauf `/auth/login`) nécessitent un token JWT dans l'en-tête :
```
Authorization: Bearer <token>
```

## 🎨 Design System

### Palette de couleurs

- **Militaire Principal** : `#2d4a34`
- **Accent** : `#8b7355`
- **Papier** : `#f5f2e8`
- **Texte** : `#2c2317`

### Typographie

- **Police principale** : IBM Plex Mono
- **Tailles** : 14px base, échelle modulaire

### Composants

- `PaperCard` : Carte avec effet parchemin
- `Button` : Boutons stylisés (primary, secondary, danger)
- `TypeTag` : Tags colorés pour les types de rapports
- `Topbar` : Navigation principale

## 🏛 Unités & Grades

### 7 Unités de la Division

1. **916 Grenadier Regiment** - Infanterie de ligne
2. **254 Feldgendarmerie** - Police militaire  
3. **916 Sanitäts Kompanie** - Service de santé
4. **001 Marine Pionier Bataillon** - Génie amphibie
5. **919 Logistik Kompanie** - Logistique
6. **130 Panzer Lehr Abteilung** - Blindés d'instruction
7. **009 Fallschirmjäger Kompanie** - Parachutistes

### Hiérarchie des grades

Du plus élevé au plus bas : Oberst → Oberstleutnant → Major → Hauptmann → Oberleutnant → Leutnant → Hauptfeldwebel → Oberfeldwebel → Feldwebel → Unterfeldwebel → Unteroffizier → Stabsgefreiter → Obergefreiter → Gefreiter → Oberschütze → Schütze → Rekrut

## 🛡 Sécurité

- Authentification JWT avec expiration
- Hachage bcrypt pour les mots de passe
- Validation des données avec express-validator
- Rate limiting sur les API
- Headers de sécurité avec Helmet
- Upload de fichiers sécurisé avec Multer

## 📊 Base de Données

### Tables principales

- `users` - Utilisateurs du système
- `groups` - Groupes de permissions  
- `unites` - Unités militaires
- `grades` - Grades et hiérarchie
- `effectifs` - Soldats et personnel
- `rapports` - Rapports militaires
- `casiers` - Dossiers disciplinaires
- `dossiers` - Documents personnels

## 🚀 Déploiement

### Production avec Docker

1. Modifier les mots de passe dans `docker-compose.yml`
2. Configurer les variables d'environnement
3. Lancer : `docker-compose -f docker/docker-compose.yml up -d`

### Variables d'environnement critiques

```env
DB_PASS=mot_de_passe_securise
JWT_SECRET=cle_jwt_ultra_secrete_256_bits
MYSQL_ROOT_PASSWORD=mot_de_passe_root_mysql
```

## 🤝 Contribution

Ce projet utilise une architecture moderne et maintenable. Pour contribuer :

1. Fork du repository
2. Créer une branche feature
3. Développer en suivant les conventions du projet
4. Tester localement avec Docker
5. Soumettre une Pull Request

## 📄 Licence

Projet personnel pour communauté de jeu de rôle. Usage privé uniquement.

---

**Archives Wehrmacht RP** - Gestion documentaire pour communautés RP militaires historiques