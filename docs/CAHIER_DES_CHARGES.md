# Archives Wehrmacht RP — Cahier des Charges

**Date** : 13 février 2026  
**Version** : 1.0  
**Priorité** : 🔴 Critique → 🟠 Important → 🟡 Souhaité → 🟢 Nice-to-have

---

## SOMMAIRE

1. [Système de permissions (Admin vs Recenseur)](#1-système-de-permissions)
2. [PDS — Présence De Service](#2-pds--présence-de-service)
3. [Rapports SO obligatoires](#3-rapports-so-obligatoires)
4. [Visite médicale](#4-visite-médicale--dossier-médical)
5. [Interdit de front](#5-interdit-de-front)
6. [Création de rapports simplifiée](#6-création-de-rapports-simplifiée)
7. [Documentation / Liens](#7-onglet-documentation--liens)
8. [Accès invité / Recensement workflow](#8-accès-invité--workflow-recensement)
9. [InteractJS Layouts](#9-interactjs--layouts-drag--drop)
10. [Dossiers personnels](#10-dossiers-personnels)
11. [Export PDF/Image](#11-export-pdfimage)
12. [Décorations dans Soldbuch](#12-décorations-dans-soldbuch)
13. [Sécurité & HTTPS](#13-sécurité--https)
14. [Phase 4 — Avancé](#14-phase-4--avancé)

---

## 1. SYSTÈME DE PERMISSIONS
**Priorité : 🔴 Critique**

### Concept
Distinction nette entre :
- **Admin (site)** = root technique. Gère les comptes, les groupes, la config du site. C'est le propriétaire.
- **Recenseur (RP)** = militaire administratif in-game. Gère les effectifs, la saisie PDS, les rapports. N'a PAS accès à la gestion des comptes/users.

### Ce qui existe
- ✅ Groupes en BDD : "Administration" et "Recenseur"
- ✅ Auth middleware détecte `isAdmin` et `isRecenseur`
- ✅ Admin middleware bloque les routes `/api/admin/*`

### À faire
- [ ] **Middleware `recenseur.js`** — autorise admin OR recenseur
- [ ] **Appliquer le middleware** sur les routes effectifs (POST/PUT/DELETE), rapports (POST/PUT/DELETE), presences (toutes)
- [ ] **UI Admin** — ajouter toggle "Recenseur" dans AdminUsers (comme le toggle Admin existant)
- [ ] **Permissions Feldgendarmerie** — certaines actions réservées (interdit de front, casier judiciaire)
- [ ] **Permissions hauts gradés** — officiers peuvent valider certaines actions

### Matrice de permissions
| Action | Admin | Recenseur | Feldgendarmerie | Officier | User normal |
|--------|-------|-----------|-----------------|----------|-------------|
| Gérer comptes/users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Créer effectif | ✅ | ✅ | ❌ | ❌ | ❌ |
| Éditer effectif | ✅ | ✅ | ❌ | ❌ | ❌ |
| Supprimer effectif | ✅ | ❌ | ❌ | ❌ | ❌ |
| Saisir PDS | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer rapport | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mettre interdit de front | ✅ | ❌ | ✅ | ✅ | ❌ |
| Créer casier judiciaire | ✅ | ❌ | ✅ | ❌ | ❌ |
| Visite médicale | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir son soldbuch | ✅ | ✅ | ✅ | ✅ | ✅ |
| Documentation | ✅ | ✅ | ✅ | ✅ | ✅ (lecture) |

---

## 2. PDS — PRÉSENCE DE SERVICE
**Priorité : 🔴 Critique**

### Concept
Suivi des heures de jeu hebdomadaires. Chaque effectif doit faire minimum **6h/semaine**. Le système génère un rapport automatique.

### Ce qui existe
- ✅ Table `presences` en BDD (effectif_id, semaine, heures, valide, rapport_so_fait, notes, saisie_par)
- ✅ Routes `/api/pds/*` créées (pas testées)
- ✅ Page PDS.jsx créée (pas fonctionnelle)

### À faire
- [ ] **Tester et corriger les routes PDS** — CRUD complet
- [ ] **Frontend PDS fonctionnel** :
  - Vue par semaine (sélecteur de semaine)
  - Tableau par unité : effectif | heures | validé (≥6h) | SO rapport fait
  - Saisie rapide des heures (input number par effectif)
  - Code couleur : vert (≥6h), rouge (<6h), gris (pas saisi)
- [ ] **Dashboard PDS** — widget résumé sur le dashboard principal
- [ ] **Rapport PDS auto** — génération fin de semaine envoyé au responsable

### Champs table `presences`
```sql
effectif_id INT NOT NULL,
semaine VARCHAR(8) NOT NULL,     -- format '2026-W07'
heures DECIMAL(4,1) DEFAULT 0,
valide BOOLEAN GENERATED ALWAYS AS (heures >= 6.0),
rapport_so_fait BOOLEAN DEFAULT FALSE,
notes TEXT,
saisie_par INT NOT NULL
```

---

## 3. RAPPORTS SO OBLIGATOIRES
**Priorité : 🟠 Important**

### Concept
Chaque sous-officier doit soumettre **1 rapport minimum par semaine**. Le système vérifie automatiquement via le champ `rapport_so_fait` dans la table presences.

### À faire
- [ ] **Détection auto des SO** — grade niveau 35-59 = sous-officier
- [ ] **Lien rapport ↔ presences** — quand un SO crée un rapport, marquer `rapport_so_fait = true` pour sa semaine
- [ ] **Dashboard alert** — afficher les SO qui n'ont PAS fait leur rapport cette semaine
- [ ] **Vue "Rapports SO"** — page dédiée listant le statut par SO par semaine

---

## 4. VISITE MÉDICALE / DOSSIER MÉDICAL
**Priorité : 🟠 Important**

### Concept
Onglet dans la fiche effectif. Le Sanitäts-abteilung (916S) gère les dossiers médicaux. Chaque effectif peut avoir un historique médical.

### À faire
- [ ] **Table `visites_medicales`** :
  ```sql
  CREATE TABLE visites_medicales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      effectif_id INT NOT NULL,
      date_visite DATE NOT NULL,
      medecin VARCHAR(100),          -- nom du médecin RP
      diagnostic TEXT,
      aptitude ENUM('Apte', 'Inapte temporaire', 'Inapte définitif', 'Apte avec réserves'),
      restrictions TEXT,              -- ex: "Interdit de front 2 semaines"
      notes_confidentielles TEXT,
      created_by INT NOT NULL,
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
  );
  ```
- [ ] **Colonne "Dossier médical" dans effectifs** — icône/lien vers l'historique médical
- [ ] **Onglet "Médical" dans Soldbuch** — historique des visites
- [ ] **Permission** — Sanitäts (916S) + Admin + Recenseur peuvent créer des visites
- [ ] **Statut médical visible** — badge sur l'effectif (Apte/Inapte)

---

## 5. INTERDIT DE FRONT
**Priorité : 🟠 Important**

### Concept
Un effectif peut être mis en "Interdit de front" par la Feldgendarmerie (254) ou un officier. C'est une sanction disciplinaire ou médicale qui empêche de participer aux opérations.

### À faire
- [ ] **Table `interdits_front`** :
  ```sql
  CREATE TABLE interdits_front (
      id INT AUTO_INCREMENT PRIMARY KEY,
      effectif_id INT NOT NULL,
      motif TEXT NOT NULL,
      type ENUM('Disciplinaire', 'Médical', 'Administratif') NOT NULL,
      date_debut DATE NOT NULL,
      date_fin DATE,                 -- NULL = indéterminé
      ordonne_par INT NOT NULL,      -- user qui a ordonné
      leve_par INT,                  -- user qui a levé l'interdit
      date_levee TIMESTAMP NULL,
      actif BOOLEAN DEFAULT TRUE,
      notes TEXT,
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
      FOREIGN KEY (ordonne_par) REFERENCES users(id),
      FOREIGN KEY (leve_par) REFERENCES users(id)
  );
  ```
- [ ] **Permissions** — seuls Feldgendarmerie (254), officiers (grade ≥60), et Admin peuvent mettre/lever un interdit
- [ ] **Badge visible** — 🔴 "INTERDIT DE FRONT" sur la fiche effectif et dans la liste
- [ ] **Onglet "Interdits de front"** — page listant tous les interdits actifs
- [ ] **Historique** — un effectif peut avoir plusieurs interdits dans le temps
- [ ] **Lien avec visite médicale** — un médecin peut recommander un interdit de front (type Médical)

---

## 6. CRÉATION DE RAPPORTS SIMPLIFIÉE
**Priorité : 🟠 Important**

### Concept
Rendre la création de rapports la moins chiante possible. Pré-remplissage intelligent, templates par type.

### Ce qui existe
- ✅ Formulaire unifié 3 types (rapport, recommandation, incident)
- ✅ Sélection unité/effectifs

### À faire
- [ ] **Pré-remplissage auto** :
  - Unité de l'auteur (si lié à une unité)
  - Grade de l'auteur
  - Date du jour
  - Numéro de rapport auto-incrémenté
- [ ] **Templates par type** :
  - Rapport journalier : structure pré-remplie (activités, effectifs présents, incidents notables, conclusion)
  - Recommandation : structure (soldat concerné, motif, détail des faits, recommandation)
  - Incident : structure (lieu, heure, personnes impliquées, déroulement, mesures prises)
- [ ] **Brouillons auto-save** — sauvegarde locale (localStorage) pour ne pas perdre le travail
- [ ] **Sélection rapide d'effectifs** — autocomplete au lieu de dropdown, possibilité d'en mentionner plusieurs

---

## 7. ONGLET DOCUMENTATION / LIENS
**Priorité : 🟡 Souhaité**

### Concept
Page centralisant tous les liens utiles du serveur : Google Docs, Sheets, règlements, procédures, etc.

### À faire
- [ ] **Page "Documentation"** accessible à tous les users
- [ ] **Table `documentation`** :
  ```sql
  CREATE TABLE documentation (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titre VARCHAR(200) NOT NULL,
      description TEXT,
      url VARCHAR(500),
      categorie ENUM('Règlement', 'Procédure', 'Formation', 'Lore', 'Autre') NOT NULL,
      ordre INT DEFAULT 0,
      visible BOOLEAN DEFAULT TRUE,
      created_by INT NOT NULL,
      date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- [ ] **Admin peut gérer les liens** (CRUD)
- [ ] **Catégories avec icônes** — organisé par type de document
- [ ] **Embedding optionnel** — iframe pour les Google Docs si souhaité

---

## 8. ACCÈS INVITÉ / WORKFLOW RECENSEMENT
**Priorité : 🟡 Souhaité**

### Concept
Les nouveaux joueurs n'ont pas encore de compte. Le workflow :
1. Nouveau arrive sur le serveur
2. Passe par le bataillon administratif (interrogatoire RP)
3. Recenseur crée sa fiche effectif
4. Recenseur lui génère un compte (username/mdp)
5. Le joueur peut accéder à son soldbuch

### À faire
- [ ] **Accès invité** — page publique limitée (voir certaines infos sans login)
- [ ] **Création de compte depuis effectif** — bouton "Créer un compte" dans la fiche effectif (déjà partiellement dans AdminUsers)
- [ ] **Génération de credentials** — auto-génération username (basé sur nom RP) + mot de passe temporaire
- [ ] **Lien effectif ↔ user** — un user est lié à exactement un effectif (son personnage)
- [ ] **Vue "Mon Soldbuch"** — l'effectif connecté voit directement son propre soldbuch

---

## 9. INTERACTJS — LAYOUTS DRAG & DROP
**Priorité : 🟡 Souhaité**

### Concept
Éditeur visuel pour personnaliser la mise en page des rapports et soldbuchs. Hérité du code PHP existant.

### Ce qui existe
- ✅ Pages SoldbuchLayout.jsx et RapportLayout.jsx créées
- ✅ InteractJS installé
- ❌ Pas encore branché

### À faire
- [ ] **SoldbuchLayout** — drag & drop des blocs : photo, signature, tampon, champs texte
- [ ] **RapportLayout** — drag & drop des blocs de contenu du rapport
- [ ] **Sauvegarde layout en JSON** — via API existante (PUT `/api/soldbuch/:id/layout`)
- [ ] **Mode aperçu** — toggle entre édition et rendu final
- [ ] **Blocs disponibles** : texte, image, signature manuscrite (canvas), tampon officiel

---

## 10. DOSSIERS
**Priorité : 🟡 Souhaité**

### 10.1 — Dossier personnel (auto-généré)
Chaque effectif a un dossier personnel qui agrège automatiquement tout ce qui le concerne :
- PDS (historique semaines)
- Rapports (où il est mentionné ou auteur)
- Soldbuch
- Visites médicales
- Interdits de front
- Dates auto-remplies

Le dossier peut être **public** (visible par tous) ou **privé** (visible uniquement par l'intéressé + admin).
L'effectif peut y ajouter du contenu perso : photos, vidéos, texte libre.

### 10.2 — Dossiers libres (créés manuellement)
N'importe qui (avec les droits) peut créer un dossier indépendant :
- **Dossier de présentation** — CV RP d'un personnage
- **Dossier d'enquête** — accumulation de preuves contre quelqu'un (Feldgendarmerie)
- **Dossier de formation** — supports, notes
- Visibilité : **Public** / **Privé** / **Lien** (accessible via URL uniquement)
- Titre libre, contenu libre

### 10.3 — Layout livre
Le rendu du dossier est en **format livre avec pages qui se tournent** (type flipbook).
Similaire au soldbuch mais paginé, avec navigation page par page.
Librairie potentielle : turn.js, StPageFlip, ou CSS 3D transforms custom.

### À faire
- [ ] Table `dossiers` (titre, type, visibilité, effectif_id nullable, contenu JSON, created_by)
- [ ] Table `dossier_pages` (dossier_id, ordre, contenu, medias)
- [ ] Auto-agrégation du dossier personnel (requêtes cross-tables)
- [ ] Upload médias (photos, vidéos) via multer
- [ ] Layout flipbook (turn.js ou équivalent)
- [ ] Permissions : privé/public/lien
- [ ] Page création dossier + éditeur de pages

---

## 11. EXPORT PDF/IMAGE
**Priorité : 🟡 Souhaité**

### À faire
- [ ] **html2canvas + jsPDF** — capture des rapports et soldbuchs en PDF
- [ ] **Bouton "Exporter"** sur chaque rapport publié et chaque soldbuch
- [ ] **Format archives** — le PDF doit garder l'esthétique parchemin

---

## 12. DÉCORATIONS DANS SOLDBUCH
**Priorité : 🟢 Nice-to-have**

### Concept
Afficher les médailles et décorations dans le soldbuch. Les données existent dans le lore Discord.

### À faire
- [ ] **Table `decorations`** — médaille, date, motif, attribuée_par
- [ ] **Section décorations dans Soldbuch** — avec images des médailles
- [ ] **Historique promotions** — affiché chronologiquement

---

## 13. SÉCURITÉ & HTTPS
**Priorité : 🟠 Important**

### À faire
- [ ] **Let's Encrypt** — certificat SSL gratuit via certbot
- [ ] **Nom de domaine** — à acheter ou configurer (au lieu de IP directe)
- [ ] **Rate limiting** — express-rate-limit sur login
- [ ] **Helmet** — headers de sécurité
- [ ] **Validation inputs** — express-validator sur toutes les routes

---

## 14. PHASE 4 — AVANCÉ
**Priorité : 🟢 Nice-to-have (futur lointain)**

- [ ] **Télégramme RP** — messagerie in-character entre effectifs
- [ ] **Carte stratégique** — éditeur de carte partageable pour les opérations
- [ ] **Convocations/Tribunaux** — système de convocation RP avec notification

---

## ORDRE DE RÉALISATION RECOMMANDÉ

### Sprint 1 — Permissions & PDS (prioritaire)
1. Middleware recenseur + appliquer sur les routes
2. UI toggle Recenseur dans AdminUsers
3. Routes PDS fonctionnelles + tests
4. Page PDS frontend complète
5. Widget PDS sur dashboard

### Sprint 2 — Contenu militaire
6. Interdit de front (table + API + UI)
7. Visite médicale (table + API + UI)
8. Rapports SO obligatoires (détection + alerte)
9. Templates de rapports + pré-remplissage

### Sprint 3 — UX & Compléments
10. Page Documentation/Liens
11. Création rapports simplifiée (auto-save, autocomplete)
12. Workflow recensement (création compte depuis effectif)
13. Accès invité

### Sprint 4 — Dossiers & Polish
14. Dossiers personnels auto-générés (agrégation cross-tables)
15. Dossiers libres (création, visibilité public/privé/lien)
16. Layout flipbook (pages qui se tournent)
17. Upload médias (photos, vidéos)

### Sprint 5 — Finitions
18. InteractJS layouts (soldbuch + rapports)
19. Export PDF/Image
20. HTTPS + nom de domaine
21. Décorations soldbuch

### Sprint 6 — Futur
22. Télégramme RP
23. Carte stratégique
24. Convocations/Tribunaux

---

## INITIATIVE — MES RECOMMANDATIONS

### Ce qui est bien fait ✅
- Le design est validé et cohérent — ne pas le casser
- L'architecture est propre (React + Express + MySQL) — scalable
- La base effectifs est alimentée (43 + 916 en référence)
- Le système de groupes est en place — juste à l'exploiter

### Ce que je recommande fortement 💡
1. **Permissions d'abord** — sans ça, impossible de donner accès aux recenseurs. C'est le fondement de tout le reste.
2. **PDS ensuite** — c'est ce qui fait vivre le site au quotidien. Si les gens doivent y aller chaque semaine pour les heures, ça crée l'habitude.
3. **Interdit de front** — ça donne du poids au site dans le RP. La Feldgendarmerie a un outil concret.
4. **Simplifier les rapports** — si c'est chiant, personne ne les fera. Templates + auto-save = adoption.
5. **HTTPS** — pas urgent mais important pour la crédibilité. Un certificat Let's Encrypt c'est 5 min.
6. **Pas de bulk import des 267 personnages** — ajouter au fil de l'eau via les recenseurs, c'est plus propre et ça crée du RP.

### Ce que je déconseille pour l'instant ⚠️
- Télégramme RP → trop complexe, peu de valeur immédiate
- Carte stratégique → gros dev, peut attendre
- InteractJS → cosmétique, pas bloquant pour l'utilisation

### Vision globale
Le site doit devenir **l'outil quotidien obligatoire** du serveur. Pour ça il faut :
1. Que les gens DOIVENT y aller (PDS, rapports SO)
2. Que ce soit SIMPLE (templates, pré-remplissage)
3. Que ça ait un IMPACT RP (interdit de front, casier, dossier médical)
