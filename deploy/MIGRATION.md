# Migration — Archives 7e Armeekorps → Hostinger

## Prérequis serveur
- Node.js 18+ (`curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs`)
- MySQL 8.0 (`sudo apt install mysql-server`)
- Nginx (`sudo apt install nginx`)
- pm2 (`sudo npm install -g pm2`)
- Certbot pour SSL (`sudo apt install certbot python3-certbot-nginx`)

## 1. Extraire le zip

```bash
cd /var/www
unzip archives7e-migration.zip -d archives7e
cd archives7e
```

## 2. Configurer MySQL

```bash
sudo mysql -u root << 'SQL'
CREATE DATABASE archives7e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'archives_user'@'localhost' IDENTIFIED BY 'VOTRE_MOT_DE_PASSE_ICI';
GRANT ALL PRIVILEGES ON archives7e.* TO 'archives_user'@'localhost';
FLUSH PRIVILEGES;
SQL

# Importer la base
mysql -u archives_user -p archives7e < database/dump_clean.sql
```

## 3. Configurer l'application

```bash
cd server
cp ../.env.example .env
nano .env
```

Modifier le `.env` :
```
DB_HOST=localhost
DB_USER=archives_user
DB_PASS=VOTRE_MOT_DE_PASSE_ICI
DB_NAME=archives7e
JWT_SECRET=GENEREZ_UN_SECRET_UNIQUE_ICI
PORT=3001
```

Générer un secret JWT sécurisé :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 4. Installer les dépendances

```bash
cd /var/www/archives7e/server
npm install

cd /var/www/archives7e/client
npm install
```

## 5. Build le frontend (si rebuild nécessaire)

```bash
cd /var/www/archives7e/client
npx vite build
```

Le build est déjà inclus dans `client/dist/`, cette étape n'est nécessaire que si vous modifiez le code.

## 6. Configurer Nginx + HTTPS

```bash
# Copier la config
sudo cp deploy/nginx-https.conf /etc/nginx/sites-available/archives7e
sudo ln -s /etc/nginx/sites-available/archives7e /etc/nginx/sites-enabled/

# Remplacer VOTRE_DOMAINE.com par votre vrai domaine
sudo sed -i 's/VOTRE_DOMAINE.com/votre-domaine.com/g' /etc/nginx/sites-available/archives7e

# Supprimer la config par défaut
sudo rm /etc/nginx/sites-enabled/default

# Obtenir le certificat SSL (AVANT de tester nginx)
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Tester et recharger
sudo nginx -t
sudo systemctl reload nginx
```

Si Hostinger fournit directement le SSL, adaptez les chemins des certificats dans la config nginx.

## 7. Lancer l'application

```bash
cd /var/www/archives7e/server
pm2 start src/index.js --name archives7e
pm2 save
pm2 startup  # Pour démarrage auto au reboot
```

## 8. Vérifier

- Accéder à `https://votre-domaine.com`
- Se connecter avec `admin` / `Admin7e2025!`
- Se connecter avec `siegfried.zussman` / `Zussman2025!`

## Comptes préservés

| Username | Mot de passe | Rôle |
|----------|-------------|------|
| admin | Admin7e2025! | Administration |
| siegfried.zussman | Zussman2025! | Administration, Recenseur, Sous-officier |

## Dépannage

```bash
# Logs serveur
pm2 logs archives7e

# Status
pm2 status

# Restart
pm2 restart archives7e

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Structure des fichiers

```
archives7e/
├── client/          # Frontend React
│   ├── dist/        # Build prêt à servir
│   └── src/         # Sources
├── server/          # Backend Express
│   └── src/
├── database/        # SQL
│   ├── dump_clean.sql   # Dump complet (propre)
│   ├── schema.sql       # Structure seule
│   └── seed.sql         # Données de base (grades, unités, etc.)
├── deploy/          # Configs déploiement
│   ├── nginx-https.conf
│   └── MIGRATION.md
└── .env.example
```
