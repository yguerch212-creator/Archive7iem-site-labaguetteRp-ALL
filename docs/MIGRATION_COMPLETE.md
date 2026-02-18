# 📦 Guide de Migration Complet — Archives 7e Armeekorps

> Ce document explique comment migrer le site vers un nouveau serveur, de A à Z.
> Destiné à un administrateur technique (pas besoin d'être développeur).

---

## 📋 Prérequis du nouveau serveur

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS |
| CPU | 2 cœurs | 4 cœurs |
| RAM | 4 GB | 8 GB |
| Disque | 20 GB SSD | 50+ GB SSD |
| Réseau | IPv4 publique | IPv4 + IPv6 |
| Accès | SSH root | SSH root + clé SSH |

**Fournisseurs testés** : Hostinger VPS, OVH, Hetzner, Contabo

---

## 🔧 Étape 1 — Installer les dépendances système

Se connecter en root au nouveau serveur :

```bash
ssh root@IP_DU_NOUVEAU_SERVEUR
```

Installer Docker, Node.js 22, PM2, Nginx et Certbot :

```bash
# Mise à jour système
apt-get update && apt-get upgrade -y

# Docker
apt-get install -y docker.io
systemctl enable --now docker

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# PM2 (gestionnaire de processus Node)
npm install -g pm2

# Nginx (serveur web) + Certbot (SSL/HTTPS)
apt-get install -y nginx certbot python3-certbot-nginx

# Outils utiles
apt-get install -y git htop
```

**Vérification :**
```bash
docker --version    # Docker version 24+
node --version      # v22.x.x
pm2 --version       # 5.x.x
nginx -v            # nginx/1.x.x
```

---

## 🗄️ Étape 2 — Base de données MySQL

### Créer le conteneur MySQL

```bash
docker run -d --name archives-mysql \
  --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD='CHOISIR_MOT_DE_PASSE_ROOT' \
  -e MYSQL_DATABASE='archives7e' \
  -e MYSQL_USER='archives_user' \
  -e MYSQL_PASSWORD='CHOISIR_MOT_DE_PASSE_DB' \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0 --default-authentication-plugin=mysql_native_password \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

⚠️ **Notez bien les mots de passe choisis** — vous en aurez besoin pour le `.env`

### Attendre le démarrage (~30 secondes)

```bash
# Vérifier que MySQL est prêt
docker exec archives-mysql mysqladmin ping -h localhost -u root -p'VOTRE_MOT_DE_PASSE_ROOT'
# Doit répondre : "mysqld is alive"
```

### Importer les données

**Option A — Nouvelle installation (DB vide) :**
```bash
docker exec -i archives-mysql mysql -u archives_user -p'VOTRE_MOT_DE_PASSE_DB' archives7e < /opt/archives7e/database/dump_clean.sql
```

**Option B — Restaurer depuis une sauvegarde existante :**
```bash
# Copier le backup depuis l'ancien serveur
scp root@ANCIEN_SERVEUR:/opt/archives7e/backups/DERNIER_BACKUP.sql.gz /tmp/

# Décompresser et importer
gunzip -c /tmp/DERNIER_BACKUP.sql.gz | docker exec -i archives-mysql mysql -u archives_user -p'VOTRE_MOT_DE_PASSE_DB' archives7e
```

**Vérification :**
```bash
docker exec archives-mysql mysql -u archives_user -p'VOTRE_MOT_DE_PASSE_DB' archives7e -e "SHOW TABLES" | wc -l
# Doit afficher environ 58 tables
```

---

## 📥 Étape 3 — Récupérer le code source

```bash
cd /opt
git clone https://github.com/yguerch212-creator/Archive7iem-site-labaguetteRp-ALL.git archives7e
cd archives7e
```

### Installer les dépendances

```bash
# Backend
cd server && npm install && cd ..

# Frontend
cd client && npm install && npm run build && cd ..
```

### Créer les dossiers nécessaires

```bash
mkdir -p uploads/images uploads/photos uploads/signatures uploads/avis-recherche
mkdir -p server/logs backups
```

Si vous migrez depuis un ancien serveur, copiez aussi les uploads :
```bash
scp -r root@ANCIEN_SERVEUR:/opt/archives7e/uploads/ /opt/archives7e/uploads/
```

---

## ⚙️ Étape 4 — Configurer l'environnement (.env)

Créer le fichier `/opt/archives7e/.env` :

```bash
cat > /opt/archives7e/.env << 'EOF'
# Base de données
DB_HOST=172.17.0.1
DB_PORT=3306
DB_USER=archives_user
DB_PASS=VOTRE_MOT_DE_PASSE_DB
DB_NAME=archives7e

# Application
JWT_SECRET=GENERER_UNE_CLE_ALEATOIRE_LONGUE
PORT=3001
NODE_ENV=production
UPLOAD_DIR=/opt/archives7e/uploads

# CORS — Origines autorisées (séparées par des virgules)
# Remplacer par votre domaine
CORS_ORIGINS=https://votre-domaine.com,http://localhost:3000

# Discord (optionnel — notifications)
# DISCORD_BOT_TOKEN=votre_token_bot
# DISCORD_GUILD_ID=id_du_serveur
EOF
```

### Générer une clé JWT aléatoire

```bash
# Copier le résultat dans JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Variables importantes

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | IP de l'hôte Docker | `172.17.0.1` (standard Docker) |
| `DB_PASS` | Mot de passe DB choisi à l'étape 2 | `MonMotDePasse2026!` |
| `JWT_SECRET` | Clé de chiffrement des tokens | Chaîne aléatoire longue |
| `PORT` | Port API interne | `3001` |
| `CORS_ORIGINS` | Domaines autorisés | `https://archives-7earmekorps.com` |

---

## 🚀 Étape 5 — Lancer l'application

```bash
cd /opt/archives7e

# Démarrer avec PM2
pm2 start server/src/index.js --name archives7e-prod

# Vérifier
pm2 status
# Doit afficher : archives7e-prod │ online

# Tester l'API
curl http://localhost:3001/api/health
# Doit répondre : {"status":"OK",...}

# Configurer le démarrage automatique
pm2 save
pm2 startup
# Copier et exécuter la commande affichée
```

---

## 🌐 Étape 6 — Configurer Nginx

### Sans domaine (accès par IP)

```bash
cat > /etc/nginx/sites-available/archives7e << 'NGINX'
server {
    listen 80 default_server;
    server_name _;

    root /opt/archives7e/client/dist;
    index index.html;
    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /opt/archives7e/uploads/;
        expires 30d;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX
```

### Avec domaine

Remplacer `server_name _;` par `server_name votre-domaine.com www.votre-domaine.com;`

### Activer

```bash
ln -sf /etc/nginx/sites-available/archives7e /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

**Test :** Ouvrir `http://IP_DU_SERVEUR` dans un navigateur — le site doit s'afficher.

---

## 🔒 Étape 7 — HTTPS (si domaine)

### Prérequis : DNS

Pointer votre domaine vers l'IP du serveur :
- **A record** : `votre-domaine.com` → `IP_DU_SERVEUR`
- **A record** : `www.votre-domaine.com` → `IP_DU_SERVEUR`

Attendre la propagation DNS (~5-30 min).

### Obtenir le certificat SSL

```bash
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com \
  --non-interactive --agree-tos --email votre@email.com --redirect
```

Le certificat se renouvelle automatiquement (cron certbot).

**Vérifier :** `https://votre-domaine.com` doit fonctionner avec le cadenas vert.

---

## 🔄 Étape 8 — Sauvegardes automatiques

```bash
chmod +x /opt/archives7e/deploy/backup.sh

# Ajouter au cron (tous les jours à 3h)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/archives7e/deploy/backup.sh >> /opt/archives7e/backups/cron.log 2>&1") | crontab -
```

Les backups sont compressés (~100 KB) et conservés 30 jours.

### Optionnel — Push vers GitHub privé

```bash
cd /opt/archives7e/backups
git init && git branch -M main
git remote add origin https://VOTRE_USER:VOTRE_TOKEN@github.com/VOTRE_USER/archives7e-backups.git
```

---

## 🔐 Étape 9 — Sécurité

### Changer les mots de passe par défaut

Se connecter sur le site avec `admin` / `Admin7e2025!`, puis changer le mot de passe.

### Pare-feu

```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

⚠️ **NE PAS** ouvrir le port 3306 (MySQL) — il est accessible uniquement en interne via Docker.

### Changer le mot de passe root du serveur

```bash
passwd root
```

---

## 🔗 Accès & Partage

### Comptes par défaut

| Utilisateur | Mot de passe | Rôle | Description |
|-------------|-------------|------|-------------|
| `admin` | `Admin7e2025!` | Administrateur | Gestion complète du site |
| `siegfried.zussman` | `Zussman2025!` | Administratif + SO | Compte test |

### Système de rôles

| Groupe | Permissions |
|--------|------------|
| Administration | Accès total, gestion des utilisateurs |
| Etat-Major | Équivalent admin |
| Officier | Validation rapports/docs, gestion effectifs, signatures |
| Sous-officier | Création rapports/docs (validation requise) |
| Administratif | Gestion administrative, signatures, recensement |
| Feldgendarmerie | Sanctions, affaires judiciaires, interdits de front |
| Sanitaets | Visites médicales, hospitalisations, vaccinations |

### Liens de partage (visiteurs)

Le site supporte les **liens de partage en lecture seule** :
- Tout utilisateur connecté peut cliquer sur **🔗 Partager** pour copier un lien
- Le lien contient `?share=1` qui permet l'accès sans compte
- Les visiteurs voient le contenu en **lecture seule** (pas d'édition, pas de création)
- Le mode visiteur persiste dans le navigateur (pas besoin de re-cliquer le lien)

### Créer de nouveaux comptes

1. Se connecter en admin
2. Aller dans **Administration** → **Utilisateurs**
3. Cliquer **Ajouter un utilisateur**
4. Renseigner nom, prénom, username, mot de passe
5. Assigner les groupes appropriés

---

## 📊 Monitoring & Maintenance

```bash
# Status de l'application
pm2 status

# Logs en temps réel
pm2 logs archives7e-prod

# Status MySQL
docker ps | grep archives-mysql

# Espace disque
df -h /

# Mémoire
free -h

# Mise à jour du site
cd /opt/archives7e && git pull && cd client && npm run build && cd .. && pm2 restart archives7e-prod
```

---

## 🆘 Dépannage

| Problème | Solution |
|----------|----------|
| Page blanche | `cd /opt/archives7e/client && npm run build` |
| API 502 | `pm2 restart archives7e-prod` puis `pm2 logs` |
| MySQL down | `docker restart archives-mysql` |
| SSL expiré | `certbot renew` |
| Uploads manquants | Vérifier `/opt/archives7e/uploads/` et les permissions |
| "Table doesn't exist" | Réimporter le schéma : `docker exec -i archives-mysql mysql -u archives_user -p'PASS' archives7e < database/dump_clean.sql` |

---

## 📁 Fichiers à ne JAMAIS perdre

| Fichier | Contenu | Localisation |
|---------|---------|-------------|
| `.env` | Identifiants DB, JWT, Discord | `/opt/archives7e/.env` |
| Backups DB | Toutes les données | `/opt/archives7e/backups/` |
| Uploads | Photos, signatures, tampons | `/opt/archives7e/uploads/` |
| Logs | Historique d'activité | `/opt/archives7e/server/logs/` |

> **Le code source est sur GitHub** — il peut toujours être re-cloné.
> **Les données (DB + uploads + .env) sont uniques** — sauvegardez-les !

---

## 🔄 Migration rapide (aide-mémoire)

```bash
# Sur le nouveau serveur :
apt update && apt install -y docker.io nginx git
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
npm install -g pm2

docker run -d --name archives-mysql --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD='ROOT_PASS' -e MYSQL_DATABASE='archives7e' \
  -e MYSQL_USER='archives_user' -e MYSQL_PASSWORD='DB_PASS' \
  -p 3306:3306 -v mysql_data:/var/lib/mysql mysql:8.0

cd /opt && git clone https://github.com/yguerch212-creator/Archive7iem-site-labaguetteRp-ALL.git archives7e
cd archives7e
cp .env.example .env && nano .env  # Éditer les variables
cd server && npm install && cd ../client && npm install && npm run build && cd ..

# Importer la DB
scp root@ANCIEN:/opt/archives7e/backups/LATEST.sql.gz /tmp/
gunzip -c /tmp/LATEST.sql.gz | docker exec -i archives-mysql mysql -u archives_user -p'DB_PASS' archives7e

# Copier les uploads
scp -r root@ANCIEN:/opt/archives7e/uploads/ /opt/archives7e/uploads/

# Lancer
pm2 start server/src/index.js --name archives7e-prod && pm2 save && pm2 startup
# Configurer nginx (voir étape 6)
```

---

*Document rédigé le 18/02/2026 — Archives 7e Armeekorps v1.0*
