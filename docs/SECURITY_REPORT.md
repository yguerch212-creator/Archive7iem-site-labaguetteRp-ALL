# Rapport de Sécurité — Archives 7e Armeekorps

**Date :** 2026-02-21
**Branche analysée :** `main`
**Périmètre :** Serveur Node.js/Express, client React, legacy PHP, infrastructure Docker/Nginx

---

## Résumé Exécutif

| Sévérité | Nombre |
|----------|--------|
| 🔴 Critique | 3 |
| 🟠 Haute | 4 |
| 🟡 Moyenne | 4 |
| 🔵 Faible | 4 |

---

## 🔴 Vulnérabilités Critiques

### C1 — Credentials en clair dans le code source
**Fichier :** `legacy/includes/db.php:8`
**Problème :** Le mot de passe de la base de données est hardcodé en clair dans le dépôt git :
```php
$DB_PASS = 'Admin123';
```
Ce fichier est versionné et le mot de passe est donc exposé à toute personne ayant accès au dépôt.
**Risque :** Accès complet à la base de données.
**Correction :** Utiliser des variables d'environnement, comme le fait déjà le backend Node (`process.env.DB_PASS`). Supprimer le fichier legacy du dépôt ou remplacer la valeur par un placeholder.

---

### C2 — Endpoints publics exposant des données sensibles
**Fichier :** `server/src/index.js:120` et `:218`
**Problème :** Les routes `/api/stats` et `/api/stats/archives` ne requièrent aucune authentification. Elles retournent :
- Le nombre d'utilisateurs actifs
- Les 10 derniers rapports avec titres, auteurs, types, dates
- Les noms et prénoms des effectifs par unité
- Les pièces de dossiers (contenu inclus)
- Les entrées de documentation approuvées

**Risque :** Fuite d'informations sur les membres, activités et documents internes sans aucune connexion.
**Correction :** Ajouter le middleware `auth` sur ces deux routes.

---

### C3 — Upload legacy sans vérification d'authentification
**Fichier :** `legacy/includes/upload_media.php`
**Problème :** Ce script PHP accepte des uploads de fichiers sans aucune vérification de session ou d'authentification. N'importe qui peut envoyer un fichier vers ce endpoint.
De plus, la vérification du type de fichier repose sur `$_FILES['type']` (fourni par le client, facilement falsifiable) plutôt que sur une détection MIME côté serveur (`finfo_file`).
**Risque :** Upload de fichiers arbitraires (potentiellement des webshells PHP si le dossier est accessible par le serveur web), élévation de privilèges.
**Correction :** Vérifier la session avant tout traitement. Utiliser `finfo_file()` pour valider le type MIME réel. S'assurer que le répertoire `uploads/` ne peut pas exécuter de PHP.

---

## 🟠 Vulnérabilités Hautes

### H1 — JWT stocké dans localStorage (XSS-vulnerable)
**Fichier :** `client/src/auth/AuthContext.jsx:41`
**Problème :** Le token JWT est sauvegardé dans `localStorage` :
```js
localStorage.setItem('authToken', token)
```
`localStorage` est accessible par tout script JavaScript de la page. Une faille XSS (même mineure) permettrait le vol du token et l'usurpation de session.
**Risque :** Vol de session par XSS.
**Correction :** Utiliser un cookie `httpOnly; Secure; SameSite=Strict` pour stocker le token. Le navigateur le gère automatiquement et le JavaScript ne peut pas y accéder.

---

### H2 — Secret JWT par défaut prévisible
**Fichier :** `server/src/config/env.js:7`
**Problème :**
```js
secret: process.env.JWT_SECRET || 'dev-secret-change-me'
```
Si la variable `JWT_SECRET` n'est pas définie en production, le secret est `'dev-secret-change-me'`, valeur publiquement connue dans le dépôt.
**Risque :** Forge de tokens JWT arbitraires permettant d'usurper n'importe quel compte.
**Correction :** Faire crasher le serveur au démarrage si `JWT_SECRET` est absent (`if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET manquant')`).

---

### H3 — Uploads accessibles publiquement sans authentification
**Fichier :** `server/src/index.js:70`
**Problème :**
```js
app.use('/uploads', express.static('uploads'))
```
Tous les fichiers du dossier `uploads/` sont servis statiquement sans aucun contrôle d'accès. Cela contourne entièrement le système de modération implémenté dans `/api/media/file/:filename` (qui, lui, vérifie le statut d'approbation et l'identité de l'uploader).
**Risque :** Accès à des fichiers en attente de modération, contenu sensible accessible sans connexion.
**Correction :** Supprimer cette ligne ou la conditionner à un middleware d'authentification. Tous les accès aux fichiers devraient passer par `/api/media/file/:filename`.

---

### H4 — Mot de passe par défaut hardcodé
**Fichiers :** `server/src/routes/admin.routes.js:79`, `legacy/admin/users.php:65`
**Problème :** Le mot de passe par défaut `Wehrmacht123` est hardcodé dans le code source :
```js
const hash = await bcrypt.hash(password || 'Wehrmacht123', 10)
```
Bien que `must_change_password = 1` soit activé, ce mot de passe est connu de quiconque lit le dépôt.
**Risque :** Accès initial facilité si un compte est créé et que le changement de mot de passe est contourné ou non effectué.
**Correction :** Générer un mot de passe aléatoire fort côté serveur ou forcer l'administrateur à saisir un mot de passe initial.

---

## 🟡 Vulnérabilités Moyennes

### M1 — Content-Security-Policy trop permissive
**Fichier :** `docker/nginx.conf:60`
**Problème :**
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```
Les directives `unsafe-inline` et `unsafe-eval` annulent une grande partie de la protection offerte par la CSP contre les attaques XSS.
**Correction :** Utiliser des nonces ou hashes pour les scripts inline. Supprimer `unsafe-eval` si pas nécessaire.

---

### M2 — Longueur minimale du mot de passe insuffisante
**Fichiers :** `server/src/controllers/auth.controller.js:111`, `legacy/change_password.php:26`
**Problème :** Le mot de passe minimum accepté est de seulement 6 caractères, sans vérification de complexité.
**Correction :** Imposer un minimum de 12 caractères avec des critères de complexité (majuscule, chiffre, symbole).

---

### M3 — Messages d'erreur internes exposés au client
**Fichier :** De nombreuses routes (`err.message` retourné directement)
**Problème :** Plusieurs routes retournent `err.message` directement dans la réponse JSON, ce qui peut exposer des détails internes sur la structure de la base de données, des requêtes SQL, des chemins de fichiers, etc.
**Correction :** Distinguer les erreurs utilisateur (message lisible) des erreurs serveur (loggées en interne, message générique renvoyé au client).

---

### M4 — Recherche accessible sans authentification
**Fichier :** `server/src/routes/search.routes.js:7`
**Problème :** La route `/api/search` utilise `optionalAuth`, ce qui signifie qu'un utilisateur non authentifié peut rechercher dans les effectifs, rapports, télégrammes et pièces de dossiers.
**Correction :** Selon les besoins, remplacer `optionalAuth` par `auth` pour restreindre la recherche aux utilisateurs connectés.

---

## 🔵 Vulnérabilités Faibles

### F1 — Fichier de test de base de données en production
**Fichier :** `legacy/test_db.php`
**Problème :** Ce fichier exécute `SELECT * FROM test_connexion` et affiche les résultats en clair. S'il est accessible via le web en production, il confirme la connectivité à la DB et peut leaker des données.
**Correction :** Supprimer ce fichier du dépôt et du serveur de production.

---

### F2 — Fichier de hachage de mot de passe exposé
**Fichier :** `legacy/hash.php`
**Problème :**
```php
echo password_hash('AdminInit123!', PASSWORD_DEFAULT) . PHP_EOL;
```
Ce fichier expose un mot de passe en clair (`AdminInit123!`) qui pourrait être (ou avoir été) un vrai mot de passe.
**Correction :** Supprimer ce fichier immédiatement.

---

### F3 — Fichier de sauvegarde versionné
**Fichier :** `client/src/pages/effectifs/SoldbuchBook.jsx.bak_20260219`
**Problème :** Un fichier de sauvegarde est commité dans le dépôt git. Il peut contenir du code sensible ou des informations sur des vulnérabilités corrigées.
**Correction :** Supprimer ce fichier et l'ajouter à `.gitignore`.

---

### F4 — Adresse IP hardcodée dans la whitelist CORS
**Fichier :** `server/src/index.js:57`
**Problème :**
```js
'http://76.13.43.180'
```
Une adresse IP publique est hardcodée dans la configuration CORS. Si cette IP change ou est réaffectée, cela peut créer une faille d'accès croisé involontaire.
**Correction :** Gérer les origines CORS via une variable d'environnement (`CORS_ORIGINS`), ce qui est déjà prévu dans le code mais la valeur par défaut inclut cette IP.

---

## Points Positifs

Les éléments suivants sont correctement implémentés :

- ✅ **Paramètres SQL préparés** utilisés systématiquement dans toute la couche Node.js (pas d'injection SQL)
- ✅ **Helmet.js** activé pour les headers de sécurité HTTP
- ✅ **Rate limiting** sur le login (30 req/15min) et global (300 req/min)
- ✅ **Validation MIME** côté serveur pour les uploads dans le backend Node
- ✅ **DOMPurify** utilisé pour tous les `dangerouslySetInnerHTML` côté client
- ✅ **bcrypt** avec coût approprié (10 rounds) pour le hachage des mots de passe
- ✅ **Middleware d'authentification** cohérent sur les routes sensibles
- ✅ **`.env` exclu de git** via `.gitignore`
- ✅ **Système de modération** des uploads médias côté API

---

## Plan de Correction Prioritaire

| Priorité | Action | Effort |
|----------|--------|--------|
| 1 | Ajouter `auth` sur `/api/stats` et `/api/stats/archives` | Faible |
| 2 | Supprimer la route static `/uploads` ou la protéger | Faible |
| 3 | Forcer la vérification de `JWT_SECRET` au démarrage | Faible |
| 4 | Supprimer `legacy/test_db.php` et `legacy/hash.php` | Faible |
| 5 | Migrer le JWT vers un cookie `httpOnly` | Moyen |
| 6 | Corriger l'upload legacy (auth + MIME réel) | Moyen |
| 7 | Retirer `unsafe-inline`/`unsafe-eval` de la CSP | Moyen |
| 8 | Supprimer les credentials hardcodés dans `legacy/includes/db.php` | Faible |
| 9 | Supprimer `SoldbuchBook.jsx.bak_20260219` | Faible |
| 10 | Renforcer la politique de mot de passe (12 chars min) | Faible |
