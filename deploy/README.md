# 🏛️ Archives 7e Armeekorps — Guide de Déploiement

## Prérequis

- VPS Ubuntu 22.04+ (min 2 cœurs, 4GB RAM)
- Accès root SSH
- Nom de domaine (optionnel)

---

## 1. Installation des dépendances

```bash
# Docker
apt-get update && apt-get install -y docker.io
systemctl enable --now docker

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# PM2 + Nginx + Certbot
npm install -g pm2
apt-get install -y nginx certbot python3-certbot-nginx
```

## 2. Base de données MySQL (Docker)

```bash
docker run -d --name archives-mysql \
  --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD='VotreMotDePasseRoot' \
  -e MYSQL_DATABASE='archives7e' \
  -e MYSQL_USER='archives_user' \
  -e MYSQL_PASSWORD='VotreMotDePasseDB' \
  -p 3306:3306 \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0 --default-authentication-plugin=mysql_native_password \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

Attendre ~30s que MySQL démarre, puis vérifier :

```bash
docker exec archives-mysql mysqladmin ping -h localhost -u root -p'VotreMotDePasseRoot'
```

## 3. Cloner et installer le projet

```bash
cd /opt
git clone https://github.com/yguerch212-creator/Archive7iem-site-labaguetteRp-ALL.git archives7e
cd archives7e

# Installer les dépendances serveur
cd server && npm install && cd ..

# Build le client
cd client && npm install && npm run build && cd ..
```

## 4. Configuration (.env)

Créer le fichier `/opt/archives7e/.env` :

```env
DB_HOST=172.17.0.1
DB_PORT=3306
DB_USER=archives_user
DB_PASS=VotreMotDePasseDB
DB_NAME=archives7e
JWT_SECRET=VotreSecretJWT_Unique_Et_Long
PORT=3001
NODE_ENV=production
UPLOAD_DIR=/opt/archives7e/uploads
```

## 5. Importer la base de données

**Première installation (DB vide) :**

```bash
docker exec -i archives-mysql mysql -u archives_user -p'VotreMotDePasseDB' archives7e < database/dump_clean.sql
```

**Restaurer depuis une sauvegarde :**

```bash
chmod +x deploy/restore.sh
./deploy/restore.sh backups/db_2026-02-16_2300.sql.gz
```

## 6. Lancer l'application

```bash
# Créer les dossiers nécessaires
mkdir -p uploads/images uploads/photos uploads/signatures

# Démarrer avec PM2
pm2 start server/src/index.js --name archives7e-prod
pm2 save
pm2 startup  # Auto-start au reboot
```

## 7. Configurer Nginx

```bash
cat > /etc/nginx/sites-available/archives7e <<'NGINX'
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

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

ln -sf /etc/nginx/sites-available/archives7e /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 8. HTTPS (Let's Encrypt)

```bash
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com \
  --non-interactive --agree-tos --email votre@email.com --redirect
```

Le certificat se renouvelle automatiquement.

---

## 🔄 Sauvegardes automatiques

### Configurer le cron de backup

```bash
# Rendre le script exécutable
chmod +x /opt/archives7e/deploy/backup.sh

# Ajouter le cron (tous les jours à 3h du matin)
crontab -e
# Ajouter cette ligne :
0 3 * * * /opt/archives7e/deploy/backup.sh >> /opt/archives7e/backups/cron.log 2>&1
```

Les sauvegardes sont stockées dans `/opt/archives7e/backups/` :
- Format : `db_YYYY-MM-DD_HHMM.sql.gz`
- Conservation : 30 jours automatique
- Taille : ~50-200 KB compressé

### Sauvegarde vers GitHub (cloud)

Pour pousser les backups vers un repo GitHub privé :

```bash
cd /opt/archives7e/backups
git init
git remote add origin https://github.com/VOTRE_USER/archives7e-backups.git
git branch -M main

# Configurer le token
git config credential.helper store
echo "https://VOTRE_USER:VOTRE_TOKEN@github.com" > ~/.git-credentials

# Activer dans le script de backup
export GITHUB_BACKUP_REPO=1
```

### Restaurer une sauvegarde

```bash
# Mode interactif (liste les backups disponibles)
./deploy/restore.sh

# Ou directement avec un fichier
./deploy/restore.sh /opt/archives7e/backups/db_2026-02-16_0300.sql.gz
```

---

## 🔧 Mise à jour du site

```bash
cd /opt/archives7e

# Récupérer les changements
git pull

# Rebuild le client (si modifié)
cd client && npm run build && cd ..

# Installer nouvelles deps serveur (si modifié)
cd server && npm install && cd ..

# Redémarrer
pm2 restart archives7e-prod
```

---

## 📁 Structure des fichiers sur le serveur

```
/opt/archives7e/
├── .env                    # Variables d'environnement (NE PAS COMMIT)
├── server/
│   ├── src/                # Code API
│   └── logs/               # Logs dev (rotation auto 30j)
├── client/
│   └── dist/               # Build front (servi par nginx)
├── uploads/                # Fichiers uploadés (photos, signatures)
├── backups/                # Sauvegardes DB
│   ├── db_*.sql.gz         # Dumps compressés
│   └── backup.log          # Historique des backups
└── deploy/
    ├── backup.sh           # Script de sauvegarde
    ├── restore.sh          # Script de restauration
    └── README.md           # Ce fichier
```

---

## 🔐 Comptes par défaut

| Utilisateur | Mot de passe | Rôle |
|-------------|-------------|------|
| admin | Admin7e2025! | Administrateur |
| siegfried.zussman | Zussman2025! | Administratif, Sous-officier |

⚠️ **Changez les mots de passe après la première connexion !**

---

## 📊 Monitoring

```bash
# Status de l'app
pm2 status

# Logs en temps réel
pm2 logs archives7e-prod

# Logs dev (fichiers)
tail -f /opt/archives7e/server/logs/$(date +%Y-%m-%d).log

# Logs de crash
cat /opt/archives7e/server/logs/crash-$(date +%Y-%m-%d).log

# Status MySQL
docker exec archives-mysql mysqladmin status -u root -p'VotreMotDePasseRoot'

# Espace disque
df -h /

# RAM
free -h
```

---

## 🆘 Dépannage

**Le site affiche une page blanche :**
- Vérifier que le build existe : `ls /opt/archives7e/client/dist/index.html`
- Rebuild : `cd client && npm run build`

**L'API retourne 502 :**
- Vérifier PM2 : `pm2 status` → si "errored", voir `pm2 logs`
- Redémarrer : `pm2 restart archives7e-prod`

**Erreur DB :**
- Vérifier MySQL : `docker ps` → container `archives-mysql` doit être "Up"
- Redémarrer MySQL : `docker restart archives-mysql`
- Vérifier le `.env` (DB_HOST, DB_PASS)

**Certificat SSL expiré :**
- `certbot renew` (normalement auto, mais vérifier)
