# Cahier des Charges — Système de Permissions V2

**Projet :** Archives 7e Armeekorps  
**Version :** 2.0  
**Date :** 2026-03-06  
**Auteur :** Claude (assistant dev) + Yanis Guerch  
**Statut :** BROUILLON — En attente de validation

---

## 1. Contexte et problème actuel

### Système actuel (V1)
Le système actuel repose sur **7 groupes fixes** avec des permissions codées en dur dans les middlewares :

| Groupe | Permissions | Problème |
|--------|------------|----------|
| Administration | Tout | OK |
| Administratif | Gestion RP globale | Trop large — accès à tout sans distinction d'unité |
| Officier | Accès étendu | Pas de distinction entre officier 916 et officier Sanitat |
| Sous-officier | Accès standard | Trop restrictif pour certains, trop permissif pour d'autres |
| Feldgendarmerie | Casiers + interdits | OK mais trop limité |
| Sanitaets | Médical | Pas de distinction entre médecin chef et infirmier |
| Etat-Major | Commandement | Trop vague |

### Problèmes identifiés
1. **Pas de séparation par unité** — Un officier du 916 peut modifier les effectifs de la Sanitat
2. **Pas de granularité** — C'est tout ou rien (lecture/écriture), pas de "soumis à validation"
3. **Rôles trop génériques** — "Officier" ne distingue pas le commandant de division du lieutenant
4. **Administratif mal défini** — Mélange entre pouvoir hiérarchique et pouvoir administratif
5. **Permissions codées en dur** — Chaque changement nécessite du code

---

## 2. Vision : Modèle Discord

### Concept
Reproduire le système de permissions Discord adapté au contexte militaire :
- **Rôles** = grades + fonctions (empilables, comme Discord)
- **Sections** = "salons" du site (effectifs, rapports, médical, etc.)
- **Permissions** = actions granulaires par rôle par section
- **Scope d'unité** = chaque rôle est lié à une unité (ou global)

### Principes
1. **Un admin panel visuel** pour gérer les permissions (pas de code)
2. **Permissions héritées** — un rôle supérieur hérite des permissions inférieures
3. **Scope d'unité** — les permissions s'appliquent dans le périmètre de l'unité du rôle
4. **Workflow de validation** — certaines actions nécessitent une approbation

---

## 3. Nouveau modèle de rôles

### 3.1 Hiérarchie des rôles

```
NIVEAU 1 — Commandement suprême
├── Kommandeur der 7. Armee          → Pouvoir total sur toute la division
│
NIVEAU 2 — Commandement de régiment/unité
├── Kommandeur der 916               → Pouvoir total sur le 916
├── Kommandeur der 130               → Pouvoir total sur le 130
├── Kommandeur der 254 (Feldgen)     → Pouvoir total sur la Feldgendarmerie
├── Kommandeur der 916S (Sanitat)    → Pouvoir total sur le service de santé
├── Kommandeur der 001 (Marine)      → Pouvoir total sur le génie
├── Kommandeur der 919 (Logistik)    → Pouvoir total sur la logistique
├── Kommandeur der 009 (Fallschirm)  → Pouvoir total sur les paras
│
NIVEAU 3 — Officiers référents
├── Officier Référent [Unité]        → Valide les demandes dans son unité
│   (un par unité, nommé par le Kommandeur)
│
NIVEAU 4 — Officiers
├── Officier [Unité]                 → Accès étendu dans son unité
│
NIVEAU 5 — Sous-officiers
├── Sous-officier [Unité]            → Accès standard dans son unité
│
NIVEAU 6 — Troupe
├── Soldat [Unité]                   → Accès basique (lecture principalement)
│
TRANSVERSAL — Fonctions spéciales (pas hiérarchiques)
├── Administratif                    → Vérifie, tamponne, officialise (comme un agent de mairie)
├── Feldgendarmerie                  → Accès casiers, interdits, sanctions
├── Médecin                          → Accès dossiers médicaux
├── Administration (technique)       → Gestion du site (comptes, logs, config)
```

### 3.2 Règle d'unité (scope)

Chaque rôle **hiérarchique** (niveaux 1-6) est lié à une unité :
- `Officier [916]` → permissions officier UNIQUEMENT sur les effectifs/rapports du 916
- `Kommandeur der 916S` → pouvoir total UNIQUEMENT sur la Sanitat
- `Kommandeur der 7. Armee` → scope = TOUTES les unités (global)

Les rôles **transversaux** (Administratif, Feldgen, Médecin) traversent les unités mais avec des permissions limitées à leur domaine.

### 3.3 Administratif — Le rôle "agent de mairie"

L'Administratif est un rôle **non-hiérarchique** :
- Il ne commande personne
- Il **vérifie la conformité** des documents (comme un greffier)
- Il **tamponne/officialise** les documents validés
- Il ne **valide pas** les demandes (c'est l'officier référent qui le fait)
- Il a accès en **lecture** à beaucoup de choses pour faire son travail de vérification

**Workflow type :**
1. Soldat rédige un rapport → soumis
2. Officier référent de l'unité → valide le contenu
3. Administratif → vérifie la conformité, tamponne, archive

---

## 4. Sections du site (les "salons")

Chaque section = un "salon Discord" avec ses propres permissions.

### 4.1 Liste des sections

| ID | Section | Description | Icône |
|----|---------|-------------|-------|
| `effectifs` | Effectifs & Soldbuch | Fiches personnelles, soldbuch, photos | 👤 |
| `rapports` | Rapports | Rapports de mission, incidents, recommandations | 📝 |
| `medical` | Service médical | Visites, hospitalisations, vaccinations, blessures | 🏥 |
| `dossiers` | Dossiers | Dossiers d'investigation, disciplinaire, personnel | 📁 |
| `sanctions` | Sanctions & Affaires | Casier judiciaire, affaires, pièces | ⚖️ |
| `interdits` | Interdits de front | Liste des interdits, avis de recherche | 🚫 |
| `pds` | Postes de service | Planification des gardes et postes | 🏛️ |
| `ordres` | Ordres | Ordres du jour, directives | 📜 |
| `telegrammes` | Télégrammes | Communications urgentes | 📨 |
| `commandement` | Commandement | Décisions stratégiques, situation | 🎖️ |
| `front` | Situation du front | Carte stratégique, mouvements | 🗺️ |
| `journal` | Journal de guerre | Chronique quotidienne | 📔 |
| `gazette` | Gazette | Journal interne, actualités | 📰 |
| `documentation` | Documentation | Manuels, guides, procédures | 📚 |
| `bibliotheque` | Bibliothèque | Documents de référence | 📖 |
| `galerie` | Galerie | Photos, médias | 🖼️ |
| `organigramme` | Organigramme | Structure hiérarchique | 🔗 |
| `habillement` | Habillement | Demandes d'équipement | 👔 |
| `calendrier` | Calendrier | Événements | 📅 |
| `statistiques` | Statistiques | Tableaux de bord | 📊 |
| `admin` | Administration | Gestion comptes, logs, config | ⚙️ |

### 4.2 Permissions par section

Pour chaque section, les permissions possibles sont :

| Permission | Code | Description |
|-----------|------|-------------|
| **Voir** | `view` | Peut voir la section et son contenu |
| **Créer** | `create` | Peut créer de nouveaux éléments |
| **Modifier** | `edit` | Peut modifier les éléments existants |
| **Modifier (soumis)** | `edit_submit` | Peut modifier mais soumis à validation |
| **Supprimer** | `delete` | Peut supprimer des éléments |
| **Valider** | `validate` | Peut valider les soumissions en attente |
| **Signer** | `sign` | Peut apposer sa signature |
| **Tamponner** | `stamp` | Peut apposer un tampon officiel |
| **Exporter** | `export` | Peut exporter en PDF/CSV |
| **Gérer** | `manage` | Administration complète de la section |

---

## 5. Matrice de permissions par défaut

### 5.1 Permissions par rôle par section

Légende : ✅ = oui | 📝 = soumis à validation | ❌ = non | 🔒 = unité uniquement

#### Effectifs & Soldbuch

| Permission | Kommandeur 7A | Kommandeur Unité | Off. Référent | Officier | Sous-off | Soldat | Administratif | Médecin |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Voir | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 own | ✅ | 🔒 |
| Créer | ✅ | 🔒 | 🔒 | ❌ | ❌ | ❌ | ✅ | ❌ |
| Modifier | ✅ | 🔒 | 🔒 | ❌ | ❌ | ❌ | ✅ | ❌ |
| Supprimer | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Signer | ✅ | 🔒 | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ |
| Tamponner | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

#### Rapports

| Permission | Kommandeur 7A | Kommandeur Unité | Off. Référent | Officier | Sous-off | Soldat | Administratif |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Voir | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 own | ✅ |
| Créer | ✅ | 🔒 | 🔒 | 🔒 | 🔒 | 📝 | ✅ |
| Modifier | ✅ | 🔒 | 🔒 | 🔒 own | 🔒 own | ❌ | ✅ |
| Valider | ✅ | 🔒 | 🔒 | ❌ | ❌ | ❌ | ❌ |
| Signer | ✅ | 🔒 | 🔒 | 🔒 | ❌ | ❌ | ❌ |
| Tamponner | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

#### Service médical

| Permission | Kommandeur 7A | Kommandeur Sanitat | Médecin | Off. Référent | Autres |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Voir | ✅ | ✅ | 🔒 patients | ❌ | ❌ own |
| Créer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Modifier | ✅ | ✅ | ✅ own | ❌ | ❌ |
| Valider | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Sanctions & Casiers (Feldgendarmerie)

| Permission | Kommandeur 7A | Feldgendarmerie | Off. Référent | Autres |
|-----------|:---:|:---:|:---:|:---:|
| Voir | ✅ | ✅ | 🔒 | ❌ |
| Créer | ✅ | ✅ | ❌ | ❌ |
| Modifier | ✅ | ✅ | ❌ | ❌ |
| Valider | ✅ | ✅ seniors | ❌ | ❌ |

---

## 6. Interface d'administration des permissions

### 6.1 Page `/admin/permissions` — Le panel Discord-like

**Layout :**
```
┌─────────────────────────────────────────────────────────┐
│  ⚙️ Gestion des Permissions                             │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SECTIONS    │  PERMISSIONS POUR : [Section sélectionnée] │
│  (sidebar)   │                                          │
│              │  ┌─ Rôle: Kommandeur der 7. Armee ──────┐ │
│  👤 Effectifs │  │ ✅ Voir  ✅ Créer  ✅ Modifier       │ │
│  📝 Rapports  │  │ ✅ Supprimer  ✅ Valider  ✅ Signer  │ │
│  🏥 Médical   │  │ ✅ Tamponner  ✅ Exporter  ✅ Gérer  │ │
│  📁 Dossiers  │  │ Scope: 🌐 Toutes unités             │ │
│  ⚖️ Sanctions │  └────────────────────────────────────────┘ │
│  🚫 Interdits │                                          │
│  🏛️ PDS      │  ┌─ Rôle: Officier Référent ────────────┐ │
│  📜 Ordres   │  │ ✅ Voir  ✅ Créer  ✅ Modifier       │ │
│  📨 Télégram │  │ ❌ Supprimer  ✅ Valider  ✅ Signer  │ │
│  🎖️ Command. │  │ ❌ Tamponner  ✅ Exporter  ❌ Gérer  │ │
│  📔 Journal  │  │ Scope: 🔒 Son unité uniquement       │ │
│  📰 Gazette  │  └────────────────────────────────────────┘ │
│  📚 Docs     │                                          │
│  ⚙️ Admin    │  ┌─ Rôle: Soldat ───────────────────────┐ │
│              │  │ ✅ Voir (own) ❌ Créer ❌ Modifier    │ │
│              │  │ ...                                    │ │
│              │  └────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────┘
```

### 6.2 Gestion des rôles

Page séparée `/admin/roles` :
- Créer/modifier/supprimer des rôles
- Assigner un rôle à un utilisateur (avec scope d'unité)
- Un utilisateur peut avoir **plusieurs rôles** (comme Discord)
- Drag & drop pour l'ordre hiérarchique

### 6.3 Workflow de validation

Quand une action est `edit_submit` (soumis à validation) :
1. L'élément est créé/modifié avec statut `pending`
2. Une notification est envoyée aux rôles avec permission `validate` sur cette section
3. Le valideur voit un badge 🔔 avec le nombre de soumissions en attente
4. Il peut **approuver** ✅ ou **rejeter** ❌ (avec motif)
5. L'auteur est notifié du résultat

---

## 7. Base de données — Nouvelles tables

### 7.1 Schéma

```sql
-- ============================================
-- RÔLES (remplace la table `groups`)
-- ============================================
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,       -- 'kommandeur_7a', 'officier', 'administratif'
  display_name VARCHAR(200) NOT NULL,       -- 'Kommandeur der 7. Armee'
  description TEXT,
  level INT NOT NULL DEFAULT 0,             -- Hiérarchie (100=top, 0=base)
  color VARCHAR(7) DEFAULT '#666666',       -- Couleur Discord-like
  icon VARCHAR(10) DEFAULT '👤',            -- Emoji
  is_unit_scoped BOOLEAN DEFAULT TRUE,      -- TRUE = permissions liées à une unité
  is_global BOOLEAN DEFAULT FALSE,          -- TRUE = pouvoir sur toutes les unités
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RÔLES ASSIGNÉS AUX UTILISATEURS
-- ============================================
CREATE TABLE user_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  unite_id INT DEFAULT NULL,               -- NULL = global (pour Administratif, Admin)
  assigned_by INT,                          -- Qui a assigné ce rôle
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_role_unit (user_id, role_id, unite_id)
);

-- ============================================
-- SECTIONS DU SITE
-- ============================================
CREATE TABLE sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,         -- 'effectifs', 'rapports', 'medical'
  display_name VARCHAR(200) NOT NULL,       -- 'Effectifs & Soldbuch'
  description TEXT,
  icon VARCHAR(10) DEFAULT '📄',
  sort_order INT DEFAULT 0
);

-- ============================================
-- PERMISSIONS DISPONIBLES
-- ============================================
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,         -- 'view', 'create', 'edit', 'edit_submit'
  display_name VARCHAR(100) NOT NULL,       -- 'Voir', 'Créer', 'Modifier (soumis)'
  description TEXT,
  sort_order INT DEFAULT 0
);

-- ============================================
-- MATRICE RÔLE × SECTION × PERMISSION
-- ============================================
CREATE TABLE role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  section_id INT NOT NULL,
  permission_id INT NOT NULL,
  scope ENUM('all', 'unit', 'own') DEFAULT 'unit',  
  -- 'all' = tout, 'unit' = son unité, 'own' = ses propres documents
  enabled BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_section_perm (role_id, section_id, permission_id)
);

-- ============================================
-- FILE D'ATTENTE DE VALIDATION
-- ============================================
CREATE TABLE pending_validations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entity_type VARCHAR(50) NOT NULL,         -- 'rapport', 'effectif', 'dossier'
  entity_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,              -- 'create', 'edit', 'delete'
  submitted_by INT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at TIMESTAMP DEFAULT NULL,
  review_comment TEXT,
  data_snapshot JSON,                       -- Snapshot des données soumises
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);
```

### 7.2 Données de seed — Rôles par défaut

```sql
INSERT INTO roles (name, display_name, level, color, icon, is_unit_scoped, is_global) VALUES
-- Niveau 1
('kommandeur_7a', 'Kommandeur der 7. Armee', 100, '#FFD700', '🎖️', FALSE, TRUE),
-- Niveau 2
('kommandeur_unit', 'Kommandeur d''unité', 80, '#C0392B', '⭐', TRUE, FALSE),
-- Niveau 3
('officier_referent', 'Officier Référent', 60, '#E67E22', '📋', TRUE, FALSE),
-- Niveau 4
('officier', 'Officier', 50, '#2980B9', '🔵', TRUE, FALSE),
-- Niveau 5
('sous_officier', 'Sous-officier', 30, '#27AE60', '🟢', TRUE, FALSE),
-- Niveau 6
('soldat', 'Soldat', 10, '#95A5A6', '⚪', TRUE, FALSE),
-- Transversaux
('administratif', 'Administratif', 40, '#8E44AD', '📎', FALSE, TRUE),
('feldgendarmerie', 'Feldgendarmerie', 45, '#8B4A47', '🛡️', FALSE, TRUE),
('medecin', 'Médecin', 45, '#6B7A8B', '🏥', TRUE, FALSE),
('administration', 'Administration (technique)', 99, '#E74C3C', '⚙️', FALSE, TRUE);
```

---

## 8. API Backend

### 8.1 Nouvelles routes

```
GET    /api/admin/roles                    → Liste des rôles
POST   /api/admin/roles                    → Créer un rôle
PUT    /api/admin/roles/:id                → Modifier un rôle
DELETE /api/admin/roles/:id                → Supprimer un rôle

GET    /api/admin/sections                 → Liste des sections
GET    /api/admin/permissions              → Matrice complète rôle×section×permission
PUT    /api/admin/permissions              → Mettre à jour la matrice (bulk)

GET    /api/admin/users/:id/roles          → Rôles d'un utilisateur
POST   /api/admin/users/:id/roles          → Assigner un rôle
DELETE /api/admin/users/:id/roles/:roleId  → Retirer un rôle

GET    /api/validations/pending            → Soumissions en attente
PUT    /api/validations/:id/approve        → Approuver
PUT    /api/validations/:id/reject         → Rejeter
```

### 8.2 Middleware de vérification

Remplacement de tous les middlewares actuels par un seul flexible :

```javascript
// Nouveau middleware: checkPermission(section, permission)
// Exemple d'utilisation:
router.get('/rapports', auth, checkPermission('rapports', 'view'), ...)
router.post('/rapports', auth, checkPermission('rapports', 'create'), ...)
router.put('/rapports/:id', auth, checkPermission('rapports', 'edit'), ...)
```

Le middleware :
1. Récupère les rôles de l'utilisateur (avec unités)
2. Pour chaque rôle, vérifie si la permission existe dans `role_permissions`
3. Vérifie le scope (all/unit/own) par rapport à l'entité ciblée
4. Si `edit_submit` au lieu de `edit` → crée une entrée dans `pending_validations`

---

## 9. Migration depuis V1

### 9.1 Mapping des anciens groupes vers les nouveaux rôles

| Ancien groupe | Nouveau rôle | Notes |
|--------------|-------------|-------|
| Administration | `administration` | Identique |
| Administratif | `administratif` | Scope global, pas hiérarchique |
| Officier | `officier` + unité | Ajout du scope d'unité |
| Sous-officier | `sous_officier` + unité | Ajout du scope d'unité |
| Feldgendarmerie | `feldgendarmerie` | Transversal |
| Sanitaets | `medecin` + unité Sanitat | Plus précis |
| Etat-Major | `kommandeur_unit` ou `officier_referent` | À déterminer par user |

### 9.2 Plan de migration
1. Créer les nouvelles tables sans toucher aux anciennes
2. Script de migration automatique basé sur le mapping ci-dessus
3. Adapter le middleware `auth.js` pour charger les rôles V2
4. Période de transition : les deux systèmes coexistent
5. Quand tout est validé : suppression des anciennes tables

---

## 10. Phases de développement

### Phase 1 — Backend (3-4 jours)
- [ ] Nouvelles tables SQL
- [ ] Seed des rôles et sections par défaut
- [ ] Middleware `checkPermission()`
- [ ] Routes API admin pour les rôles et permissions
- [ ] Script de migration V1 → V2
- [ ] Système de validation (pending_validations)

### Phase 2 — Frontend Admin (3-4 jours)
- [ ] Page `/admin/permissions` — Panel Discord-like
- [ ] Page `/admin/roles` — Gestion des rôles
- [ ] Assignation de rôles aux utilisateurs (dans AdminUsers)
- [ ] Badge notification pour les validations en attente

### Phase 3 — Intégration (2-3 jours)
- [ ] Remplacer tous les anciens middlewares par `checkPermission()`
- [ ] Adapter chaque page frontend pour vérifier les permissions
- [ ] Menu latéral dynamique selon les permissions
- [ ] Workflow de validation dans chaque section

### Phase 4 — Tests & Migration (1-2 jours)
- [ ] Tests avec les utilisateurs existants
- [ ] Migration des anciens groupes
- [ ] Documentation utilisateur
- [ ] Déploiement prod

**Estimation totale : 10-13 jours de développement**

---

## 11. Questions ouvertes (à valider avec l'État-Major)

1. **Qui peut créer des rôles ?** — Seulement Administration, ou aussi Kommandeur 7A ?
2. **Peut-on avoir des permissions "négatives" ?** — Ex: un rôle qui retire une permission (comme Discord)
3. **Notifications de validation** — Discord webhook ? Notification in-app ? Les deux ?
4. **Historique des changements de permissions** — Logger qui a changé quoi ?
5. **Rôle "Invité"** — Garder le mode lecture seule actuel pour les non-connectés ?
6. **Héritage de rôles** — Un Kommandeur hérite automatiquement de toutes les permissions Officier ?

---

*Ce document est un brouillon vivant. À valider et itérer avec l'équipe.*
