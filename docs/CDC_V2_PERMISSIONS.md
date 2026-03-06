# Cahier des Charges V2 — Système de Permissions & Gestion des Effectifs

**Version**: 2.0  
**Date**: 6 mars 2026  
**Projet**: Archives 7e Armeekorps  
**Auteur**: Yanis Guerch — Efrei B3 Cybersécurité

---

## 1. Contexte

Le système actuel repose sur 7 groupes statiques (`Administration`, `Administratif`, `Feldgendarmerie`, `Sous-officier`, `Officier`, `Homme du rang`, `État-Major`) avec des permissions codées en dur dans le backend (middlewares `admin.js`, `privileged.js`, `recenseur.js`, `feldgendarmerie.js`).

### Limites actuelles
- Permissions globales uniquement (pas de granularité par section/salon)
- Impossible de créer des rôles personnalisés
- Pas de mécanisme de renvoi/transfert d'effectifs
- Hiérarchie de permissions non configurable
- Chaque nouvelle permission = modification du code source

### Objectifs V2
1. **Système de rôles personnalisés** avec hiérarchie et héritage de permissions
2. **Permissions granulaires par salon** (section du site)
3. **Gestion des effectifs** : transfert inter-régiment et renvoi avec motif
4. **Interface d'administration** élégante et immersive (parchment CSS)
5. **Rétrocompatibilité** avec les groupes existants

---

## 2. Architecture des Permissions

### 2.1 Modèle inspiré Discord adapté Wehrmacht

```
Hiérarchie des rôles (du plus haut au plus bas) :
┌─────────────────────────┐
│  Administration          │ ← Super-admin, accès total
│  État-Major              │ ← Quasi-admin, gestion stratégique
│  Officier                │ ← Peut créer des rôles, gérer son régiment
│  Administratif/Recenseur │ ← Gestion des effectifs & Soldbuch
│  Feldgendarmerie         │ ← Justice & sanctions
│  Sous-officier           │ ← Encadrement, accès limité
│  Homme du rang           │ ← Accès minimal, lecture seule
└─────────────────────────┘
```

**Principe fondamental** : Un utilisateur ne peut **jamais** attribuer des permissions supérieures aux siennes.

### 2.2 Salons (Sections du site)

Chaque section du site = un "salon" avec ses propres overrides de permissions.

| Salon (slug)          | Description                                   |
|-----------------------|-----------------------------------------------|
| `effectifs`           | Gestion des effectifs, Soldbuch               |
| `rapports`            | Rédaction et validation de rapports           |
| `documentation`       | Documents officiels, guides                   |
| `journal`             | Feldzeitung "Wacht am Korps"                  |
| `telegrammes`         | Messages chiffrés inter-unités                |
| `medical`             | Visites, soins, hospitalisations              |
| `sanctions`           | Affaires judiciaires, pièces, avis            |
| `front`               | Situation du front, cartes, VP                |
| `pds`                 | Présence de service                           |
| `commandement`        | Récap PDS, ordres, stratégie                  |
| `bibliotheque`        | Tampons, ressources                           |
| `organigramme`        | Structure régimentaire                        |
| `admin`               | Panel d'administration                        |
| `dossiers`            | Dossiers personnels                           |
| `habillement`         | Demandes d'équipement                         |
| `solde`               | Système de paie                               |
| `interdits`           | Interdits de front                            |
| `archives`            | Consultation archives (lecture seule)          |

### 2.3 Permissions disponibles

Chaque permission est un flag binaire applicable par salon.

#### Permissions générales (par salon)
| Permission               | Code                    | Description |
|--------------------------|-------------------------|-------------|
| Voir le salon            | `view`                  | Accéder à la section |
| Créer                    | `create`                | Créer un nouvel élément |
| Modifier                 | `edit`                  | Modifier un élément existant |
| Modifier les autres      | `edit_others`           | Modifier les éléments d'autres utilisateurs |
| Supprimer                | `delete`                | Supprimer un élément |
| Supprimer les autres     | `delete_others`         | Supprimer les éléments des autres |
| Valider                  | `validate`              | Valider/approuver un élément |
| Signer                   | `sign`                  | Apposer une signature |
| Exporter                 | `export`                | Exporter en PDF/CSV/PNG |

#### Permissions spéciales (globales)
| Permission                      | Code                         | Description |
|---------------------------------|------------------------------|-------------|
| Gérer les rôles                 | `manage_roles`               | Créer/modifier/supprimer des rôles (≤ son propre niveau) |
| Gérer les effectifs du régiment | `manage_regiment_effectifs`   | Transférer/renvoyer les effectifs de son régiment |
| Gérer tous les effectifs        | `manage_all_effectifs`        | Transférer/renvoyer n'importe quel effectif |
| Voir les logs                   | `view_logs`                  | Consulter les logs d'activité |
| Gérer les utilisateurs          | `manage_users`               | Gérer comptes & groupes |
| Modérer                         | `moderate`                   | File de validation globale |
| Gérer les notifications         | `manage_notifications`       | Envoyer des notifications |
| Contourner les validations      | `bypass_validation`          | Publier sans validation |
| Administrer                     | `administrator`              | Accès total (bypass tout) |

### 2.4 Résolution des permissions (algorithme)

Inspiré Discord, en 4 étapes :

```
1. Vérifier `administrator` → si OUI : tout autorisé
2. Calculer permissions globales du rôle
   → Union de toutes les permissions des rôles de l'utilisateur
3. Appliquer les overrides par salon
   → Pour chaque rôle de l'utilisateur, vérifier les overrides salon :
     - ALLOW explicite → autorise
     - DENY explicite → refuse (prioritaire sur ALLOW d'un autre rôle)
     - NON DÉFINI → hérite du global
4. Permission finale = (permissions globales + overrides salon)
   → DENY > ALLOW > INHERIT
```

**Tri-state par salon** : Chaque permission par salon peut être :
- ✅ **ALLOW** — Autorisé (override positif)
- ❌ **DENY** — Refusé (override négatif, prioritaire)
- ➖ **INHERIT** — Hérite de la permission globale du rôle

---

## 3. Rôles personnalisés

### 3.1 Qui peut créer des rôles ?

| Groupe minimum | Capacité |
|----------------|----------|
| Officier       | Créer des rôles avec permissions ≤ les siennes |
| Administratif  | Créer des rôles avec permissions ≤ les siennes |
| État-Major     | Créer des rôles avec permissions ≤ les siennes |
| Administration | Tout (y compris `administrator`) |

**Règle clé** : Le créateur ne peut **jamais** cocher une permission qu'il ne possède pas lui-même.

### 3.2 Propriétés d'un rôle

```
{
  id: number,
  name: string,              // Ex: "Officier Médical", "Rédacteur Journal"
  color: string,             // Couleur hex pour affichage (#8B4513)
  icon: string|null,         // Emoji ou icône optionnelle
  level: number,             // Position dans la hiérarchie (0 = plus haut)
  is_system: boolean,        // Rôles de base non-supprimables
  created_by: number,        // user_id du créateur
  regiment_id: number|null,  // null = global, sinon limité à un régiment
  permissions_global: JSON,  // Permissions globales du rôle
  permissions_salons: JSON,  // Overrides par salon
  created_at: datetime,
  updated_at: datetime
}
```

### 3.3 Rôles système (prédéfinis, non-supprimables)

Les 7 groupes actuels deviennent des rôles système avec `is_system = true`. Ils ne peuvent pas être supprimés, mais leurs permissions peuvent être ajustées par un Admin.

### 3.4 Exemples de rôles personnalisés utiles

| Rôle | Créé par | Permissions typiques |
|------|----------|---------------------|
| **Officier Médical** | Officier / Sanitat | `medical.*`, `effectifs.view`, `effectifs.edit_others` (sur salon medical uniquement) |
| **Rédacteur du Journal** | Officier | `journal.create`, `journal.edit`, `journal.view` |
| **Instructeur** | Officier | `documentation.create`, `documentation.edit`, `effectifs.view` |
| **Censeur** | État-Major | `journal.validate`, `rapports.validate`, `documentation.validate` |
| **Adjudant de régiment** | Officier | `pds.view`, `pds.edit_others`, `commandement.view`, `effectifs.view` |
| **Greffier** | Feldgendarmerie | `sanctions.create`, `sanctions.edit`, `sanctions.view` |
| **Télégraphiste** | Officier | `telegrammes.create`, `telegrammes.view` |
| **Cartographe** | État-Major | `front.create`, `front.edit`, `front.view` |
| **Intendant** | Administratif | `habillement.validate`, `solde.view`, `solde.edit` |
| **Archiviste** | Administratif | `archives.view`, `documentation.create`, `bibliotheque.edit` |

---

## 4. Gestion des Effectifs — Transfert & Renvoi

### 4.1 Transfert inter-régiment

**Qui peut transférer** : Officier (son régiment uniquement) ou Admin/EM (tout régiment).

**Processus** :
1. L'officier sélectionne un effectif de **son** régiment
2. Choix : `Transférer vers un autre régiment`
3. Sélection du régiment de destination
4. Saisie d'un motif (obligatoire) : *"Transfert pour renfort de la 352P"*
5. L'effectif :
   - Change d'unité
   - Ses groupes/rôles sont mis à jour automatiquement
   - Une entrée est ajoutée à son dossier personnel (chronologie)
   - Notification envoyée au concerné
   - Log d'activité créé

**Validation** :
- Officier → transfert soumis à validation État-Major/Admin
- État-Major/Admin → transfert direct

### 4.2 Renvoi d'un effectif

**Qui peut renvoyer** : Officier (son régiment), Admin/EM (tout régiment).

**Processus** :
1. L'officier sélectionne un effectif de **son** régiment
2. Choix : `Renvoyer du régiment`
3. Saisie d'un motif obligatoire : *"Insubordination répétée"*
4. Sélection de la sévérité :
   - **Renvoi simple** : Perd l'accès au régiment, peut être recruté ailleurs
   - **Renvoi définitif** (Admin/EM uniquement) : Compte désactivé
5. L'effectif :
   - Son compte utilisateur est **désactivé** (`is_active = 0`)
   - Ses rôles et groupes sont retirés
   - Le motif est enregistré en base
   - Son dossier personnel est conservé (historique)
   - Log d'activité créé

### 4.3 Écran de connexion — Effectif renvoyé

Quand un effectif renvoyé tente de se connecter :

```
┌─────────────────────────────────────────────┐
│                                             │
│         ╋ ARCHIVES 7e ARMEEKORPS ╋          │
│                                             │
│    ┌─────────────────────────────────┐      │
│    │                                 │      │
│    │   ACCÈS REFUSÉ                  │      │
│    │                                 │      │
│    │   Vous avez été relevé de vos   │      │
│    │   fonctions au sein du          │      │
│    │   7e Armeekorps.                │      │
│    │                                 │      │
│    │   Motif :                       │      │
│    │   « Insubordination répétée »   │      │
│    │                                 │      │
│    │   Date : 06/03/2026             │      │
│    │   Décision de : Hptm. Weber     │      │
│    │                                 │      │
│    │   ─────────────────────────     │      │
│    │   Si vous contestez cette       │      │
│    │   décision, adressez-vous       │      │
│    │   à l'État-Major.               │      │
│    │                                 │      │
│    └─────────────────────────────────┘      │
│                                             │
└─────────────────────────────────────────────┘
```

**CSS** : Même style parchment que le reste du site, mais avec :
- Bordure rouge sombre (`#8B0000`) au lieu du doré habituel
- Tampon "RÉVOQUÉ" en overlay semi-transparent (45° rotation, rouge, opacity 0.15)
- Sceau brisé en haut (Balkenkreuz barré)
- Police Courier New, ton solennel

---

## 5. Interface d'Administration des Rôles

### 5.1 Page `/admin/roles` — Liste des rôles

```
┌───────────────────────────────────────────────────────┐
│  GESTION DES RÔLES                          [+ Créer] │
│                                                       │
│  ┌─ Rôles système ──────────────────────────────────┐ │
│  │ 🔒 Administration     │ Niveau 0 │ 3 membres    │ │
│  │ 🔒 État-Major         │ Niveau 1 │ 5 membres    │ │
│  │ 🔒 Officier           │ Niveau 2 │ 12 membres   │ │
│  │ 🔒 Administratif      │ Niveau 3 │ 4 membres    │ │
│  │ 🔒 Feldgendarmerie    │ Niveau 4 │ 6 membres    │ │
│  │ 🔒 Sous-officier      │ Niveau 5 │ 18 membres   │ │
│  │ 🔒 Homme du rang      │ Niveau 6 │ 42 membres   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ Rôles personnalisés ────────────────────────────┐ │
│  │ 🏥 Officier Médical   │ Niveau 3 │ 2 membres    │ │
│  │ 📰 Rédacteur Journal  │ Niveau 4 │ 3 membres    │ │
│  │ ⚖️ Censeur            │ Niveau 2 │ 1 membre     │ │
│  └───────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

### 5.2 Éditeur de rôle — Permissions par salon

Interface à toggles tri-state (✅ ALLOW / ❌ DENY / ➖ INHERIT) :

```
┌───────────────────────────────────────────────────────┐
│  RÔLE : Officier Médical                              │
│  Couleur: [#8B4513]  Niveau: [3]                      │
│                                                       │
│  ── Permissions globales ──────────────────────────── │
│  [✅] Voir les effectifs                               │
│  [✅] Exporter                                         │
│  [❌] Gérer les rôles                                  │
│  [❌] Administrer                                      │
│                                                       │
│  ── Permissions par salon ─────────────────────────── │
│                                                       │
│  📋 Effectifs          │ 🏥 Médical                   │
│  ┌──────────────────┐  │ ┌──────────────────┐         │
│  │ Voir      [✅]   │  │ │ Voir      [✅]   │         │
│  │ Créer     [➖]   │  │ │ Créer     [✅]   │         │
│  │ Modifier  [➖]   │  │ │ Modifier  [✅]   │         │
│  │ Mod. autres[✅]  │  │ │ Mod. autr.[✅]   │         │
│  │ Supprimer [❌]   │  │ │ Supprimer [➖]   │         │
│  │ Valider   [❌]   │  │ │ Valider   [✅]   │         │
│  │ Signer    [➖]   │  │ │ Signer    [✅]   │         │
│  └──────────────────┘  │ └──────────────────┘         │
│                                                       │
│  [Enregistrer]                          [Supprimer]   │
└───────────────────────────────────────────────────────┘
```

**CSS spécifique** :
- Toggles tri-state avec animation slide (vert/rouge/gris)
- Sections de salon collapsibles (accordéon)
- Permissions verrouillées (supérieures au rôle du créateur) = grisées + icône cadenas
- Drag & drop pour réordonner les niveaux de rôle (uniquement rôles sous le sien)

### 5.3 Page de gestion des effectifs du régiment

Accessible aux Officiers sur leur propre régiment :

```
┌───────────────────────────────────────────────────────┐
│  EFFECTIFS — 916. Infanterie-Regiment                 │
│                                                       │
│  ┌─────────┬──────────┬────────┬──────────┬─────────┐ │
│  │ Nom     │ Grade    │ Rôles  │ Statut   │ Actions │ │
│  ├─────────┼──────────┼────────┼──────────┼─────────┤ │
│  │ Schmidt │ Gefr.    │ HDR    │ ✅ Actif  │ [⚙️]    │ │
│  │ Mueller │ Uffz.    │ SO,Réd.│ ✅ Actif  │ [⚙️]    │ │
│  │ Weber   │ Schtz.   │ HDR    │ ❌ Renvoyé│ [👁️]   │ │
│  └─────────┴──────────┴────────┴──────────┴─────────┘ │
│                                                       │
│  ── Actions sur [Schmidt] ──                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🔄 Transférer vers un autre régiment             │ │
│  │    Régiment: [352. Artillerie ▼]                 │ │
│  │    Motif: [________________________]             │ │
│  │                            [Confirmer le transfert]│ │
│  │                                                   │ │
│  │ 🚪 Renvoyer du régiment                          │ │
│  │    Motif: [________________________]             │ │
│  │    Sévérité: ○ Simple  ○ Définitif               │ │
│  │                            [Confirmer le renvoi]  │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**CSS** :
- Popup/modal en style parchemin avec bords brûlés
- Bouton "Renvoyer" rouge sombre avec hover en dégradé
- Bouton "Transférer" doré neutre
- Motif = textarea style machine à écrire (Courier New, fond jauni)
- Confirmation = double-click ou popup "Êtes-vous sûr ?" avec le nom complet

---

## 6. Schéma Base de Données

### 6.1 Nouvelles tables

```sql
-- Rôles personnalisables
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#8B4513',
  icon VARCHAR(10) DEFAULT NULL,
  level INT NOT NULL DEFAULT 99,          -- 0 = plus haut
  is_system BOOLEAN DEFAULT FALSE,
  created_by INT DEFAULT NULL,
  regiment_id INT DEFAULT NULL,           -- NULL = global
  permissions_global JSON NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (regiment_id) REFERENCES unites(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Overrides de permissions par salon
CREATE TABLE role_salon_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  salon VARCHAR(50) NOT NULL,             -- slug du salon
  permissions JSON NOT NULL DEFAULT '{}', -- {"view": "allow", "create": "deny", "edit": "inherit"}
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY (role_id, salon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Association utilisateurs ↔ rôles (many-to-many)
CREATE TABLE user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  assigned_by INT DEFAULT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transferts d'effectifs (historique)
CREATE TABLE effectif_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effectif_id INT NOT NULL,
  from_unite_id INT NOT NULL,
  to_unite_id INT NOT NULL,
  motif TEXT NOT NULL,
  decided_by INT NOT NULL,               -- user_id de l'officier
  validated_by INT DEFAULT NULL,         -- user_id EM/Admin (si validation requise)
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME DEFAULT NULL,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
  FOREIGN KEY (from_unite_id) REFERENCES unites(id),
  FOREIGN KEY (to_unite_id) REFERENCES unites(id),
  FOREIGN KEY (decided_by) REFERENCES users(id),
  FOREIGN KEY (validated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Renvois d'effectifs
CREATE TABLE effectif_dismissals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effectif_id INT NOT NULL,
  user_id INT NOT NULL,                  -- compte associé (pour bloquer connexion)
  motif TEXT NOT NULL,
  severity ENUM('simple', 'definitive') DEFAULT 'simple',
  decided_by INT NOT NULL,
  unite_id INT NOT NULL,                 -- régiment d'origine
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (decided_by) REFERENCES users(id),
  FOREIGN KEY (unite_id) REFERENCES unites(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.2 Modifications sur tables existantes

```sql
-- users : ajouter statut et renvoi
ALTER TABLE users 
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN dismissed_at DATETIME DEFAULT NULL,
  ADD COLUMN dismissal_id INT DEFAULT NULL;

-- effectifs : statut transfert
ALTER TABLE effectifs
  ADD COLUMN status ENUM('active', 'transferred', 'dismissed') DEFAULT 'active';
```

### 6.3 Migration des groupes existants → rôles

```sql
-- Insérer les 7 groupes actuels comme rôles système
INSERT INTO roles (name, level, is_system, permissions_global) VALUES
('Administration', 0, TRUE, '{"administrator": true}'),
('Etat-Major', 1, TRUE, '{"manage_roles": true, "manage_all_effectifs": true, "manage_users": true, "moderate": true, "bypass_validation": true, "view_logs": true}'),
('Officier', 2, TRUE, '{"manage_roles": true, "manage_regiment_effectifs": true, "moderate": false, "view_logs": false}'),
('Administratif', 3, TRUE, '{"manage_roles": true, "manage_users": false, "view_logs": true}'),
('Feldgendarmerie', 4, TRUE, '{"manage_roles": false}'),
('Sous-officier', 5, TRUE, '{}'),
('Homme du rang', 6, TRUE, '{}');

-- Migrer user_groups → user_roles
INSERT INTO user_roles (user_id, role_id)
SELECT ug.user_id, r.id
FROM user_groups ug
JOIN groups g ON ug.group_id = g.id
JOIN roles r ON r.name = g.name AND r.is_system = TRUE;
```

---

## 7. API Backend

### 7.1 Nouveaux endpoints

```
── Rôles ──
GET    /api/roles                    → Liste des rôles (filtrée selon droits)
GET    /api/roles/:id                → Détail d'un rôle + permissions
POST   /api/roles                    → Créer un rôle (≥ Officier)
PUT    /api/roles/:id                → Modifier un rôle
DELETE /api/roles/:id                → Supprimer un rôle (pas system)
POST   /api/roles/:id/assign/:userId → Assigner un rôle à un utilisateur
DELETE /api/roles/:id/assign/:userId → Retirer un rôle

── Permissions ──
GET    /api/permissions/me           → Mes permissions résolues (global + par salon)
GET    /api/permissions/user/:id     → Permissions résolues d'un utilisateur (admin)
GET    /api/permissions/salons       → Liste des salons disponibles

── Gestion effectifs ──
POST   /api/effectifs/:id/transfer   → Transférer (body: {to_unite_id, motif})
POST   /api/effectifs/:id/dismiss    → Renvoyer (body: {motif, severity})
PUT    /api/effectifs/transfers/:id  → Valider/rejeter un transfert (EM/Admin)
GET    /api/effectifs/transfers      → Liste des transferts en attente
GET    /api/effectifs/dismissals     → Historique des renvois
POST   /api/effectifs/:id/reinstate  → Réintégrer un effectif renvoyé (Admin/EM)
```

### 7.2 Middleware de permissions

Remplacer les middlewares codés en dur par un système dynamique :

```javascript
// Nouveau middleware : checkPermission(salon, action)
const checkPermission = (salon, action) => {
  return async (req, res, next) => {
    const userPermissions = await resolvePermissions(req.user.id);
    
    // 1. Administrator bypass
    if (userPermissions.global.administrator) return next();
    
    // 2. Check salon-specific override
    const salonPerms = userPermissions.salons[salon];
    if (salonPerms) {
      if (salonPerms[action] === 'deny') 
        return res.status(403).json({ error: 'Accès refusé' });
      if (salonPerms[action] === 'allow') 
        return next();
    }
    
    // 3. Fall back to global permission
    if (userPermissions.global[action]) return next();
    
    return res.status(403).json({ error: 'Permission insuffisante' });
  };
};

// Usage :
router.post('/rapports', 
  auth, 
  checkPermission('rapports', 'create'), 
  createRapport
);
```

### 7.3 Contrôle de hiérarchie

```javascript
// Vérifier qu'un utilisateur ne dépasse pas ses propres permissions
const canAssignPermission = (assignerPerms, permission) => {
  // L'utilisateur doit posséder la permission pour la donner
  return assignerPerms.global[permission] === true 
    || Object.values(assignerPerms.salons).some(s => s[permission] === 'allow');
};

const canManageRole = (userLevel, targetRoleLevel) => {
  // Ne peut modifier que des rôles de niveau inférieur (nombre plus élevé)
  return userLevel < targetRoleLevel;
};
```

---

## 8. Frontend

### 8.1 Nouvelles pages/composants

| Composant | Route | Description |
|-----------|-------|-------------|
| `RolesList` | `/admin/roles` | Liste des rôles avec actions |
| `RoleEditor` | `/admin/roles/:id` | Éditeur de permissions (global + par salon) |
| `RoleCreate` | `/admin/roles/new` | Formulaire de création |
| `RegimentManagement` | `/effectifs/regiment` | Gestion transferts/renvois par régiment |
| `TransferQueue` | `/admin/transfers` | File de transferts en attente (EM/Admin) |
| `DismissedLogin` | (composant Login) | Écran de renvoi lors de la connexion |
| `TriStateToggle` | (composant réutilisable) | Toggle ✅/❌/➖ |

### 8.2 Modification AuthContext

```javascript
// Ajouter les permissions résolues au contexte auth
const AuthContext = {
  user: { ... },
  permissions: {
    global: { administrator: false, manage_roles: true, ... },
    salons: {
      effectifs: { view: 'allow', create: 'allow', delete: 'deny' },
      medical: { view: 'allow', create: 'allow', ... },
      ...
    }
  },
  // Helper functions
  can: (salon, action) => boolean,
  canAny: (salon, actions[]) => boolean,
  hasGlobal: (permission) => boolean,
};
```

### 8.3 Hook `usePermission`

```javascript
const usePermission = () => {
  const { permissions } = useAuth();
  
  const can = (salon, action) => {
    if (permissions.global.administrator) return true;
    const salonPerms = permissions.salons[salon];
    if (salonPerms?.[action] === 'deny') return false;
    if (salonPerms?.[action] === 'allow') return true;
    return !!permissions.global[action];
  };
  
  return { can, permissions };
};
```

---

## 9. CSS — Charte graphique

### 9.1 Écran de renvoi

```css
.dismissed-screen {
  background: var(--parchment-bg);
  border: 3px solid #8B0000;
  position: relative;
  max-width: 500px;
  margin: 100px auto;
  padding: 40px;
  font-family: 'Courier New', monospace;
}

.dismissed-screen::before {
  content: 'RÉVOQUÉ';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-size: 5rem;
  color: rgba(139, 0, 0, 0.12);
  font-weight: bold;
  letter-spacing: 1.2rem;
  pointer-events: none;
  white-space: nowrap;
}

.dismissed-motif {
  border-left: 3px solid #8B0000;
  padding-left: 15px;
  margin: 20px 0;
  font-style: italic;
  color: #5a0000;
}

.dismissed-header {
  text-align: center;
  color: #8B0000;
  font-size: 1.4rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  border-bottom: 2px solid #8B0000;
  padding-bottom: 10px;
}
```

### 9.2 Toggles tri-state

```css
.tri-toggle {
  display: inline-flex;
  width: 72px;
  height: 28px;
  border-radius: 14px;
  background: #d4c5a9;
  position: relative;
  cursor: pointer;
  border: 1px solid #8B7355;
  transition: background 0.2s;
}

.tri-toggle[data-state="allow"] { background: #4a7c3f; }
.tri-toggle[data-state="deny"]  { background: #8B0000; }
.tri-toggle[data-state="inherit"] { background: #d4c5a9; }

.tri-toggle::after {
  content: '';
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f5ecd7;
  position: absolute;
  top: 2px;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.tri-toggle[data-state="deny"]::after    { left: 2px; }
.tri-toggle[data-state="inherit"]::after { left: 24px; }
.tri-toggle[data-state="allow"]::after   { left: 46px; }

/* Permission locked (supérieure au rôle de l'utilisateur) */
.tri-toggle.locked {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.tri-toggle.locked::before {
  content: '🔒';
  position: absolute;
  right: -24px;
  top: 2px;
  font-size: 14px;
}
```

### 9.3 Cards de rôle

```css
.role-card {
  background: var(--parchment-bg);
  border: 1px solid #8B7355;
  border-left: 4px solid var(--role-color, #8B4513);
  padding: 12px 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.15s;
}

.role-card:hover {
  background: #f0e6ce;
  transform: translateX(4px);
}

.role-card.system {
  border-left-style: double;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  background: var(--role-color, #8B4513);
  color: #f5ecd7;
}
```

### 9.4 Modal transfert/renvoi

```css
.effectif-action-modal {
  background: var(--parchment-bg);
  border: 2px solid #8B7355;
  border-radius: 4px;
  padding: 30px;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.effectif-action-modal textarea {
  width: 100%;
  min-height: 80px;
  font-family: 'Courier New', monospace;
  background: #faf3e0;
  border: 1px solid #8B7355;
  padding: 10px;
  resize: vertical;
}

.btn-transfer {
  background: linear-gradient(180deg, #c9a84c, #a88734);
  color: #1a1a1a;
  border: 1px solid #8B7355;
  padding: 8px 20px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
}

.btn-dismiss {
  background: linear-gradient(180deg, #a83232, #6b1010);
  color: #f5ecd7;
  border: 1px solid #5a0000;
  padding: 8px 20px;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
}

.btn-dismiss:hover {
  background: linear-gradient(180deg, #c43c3c, #8B0000);
}
```

---

## 10. Sécurité

### 10.1 Règles de validation backend

1. **Vérification de hiérarchie** : Toute opération sur un rôle vérifie que `userLevel < targetRoleLevel`
2. **Permissions plafonnées** : `canAssignPermission()` vérifie chaque permission individuellement
3. **Scope régiment** : Un officier ne peut agir que sur les effectifs de **son** régiment (vérifié côté serveur)
4. **Double vérification renvoi** : Le motif est obligatoire et doit faire ≥ 10 caractères
5. **Audit trail** : Chaque action (création rôle, transfert, renvoi, modification permission) est loguée dans `activity_logs`
6. **Rate limiting** : Limiter les actions de transfert/renvoi (max 5/heure par utilisateur)
7. **JWT refresh** : Après modification de rôle/permission, forcer le refresh du token au prochain appel

### 10.2 Vérifications frontend (UX only, pas sécurité)

- Boutons/actions cachés si pas la permission
- Permissions verrouillées grisées dans l'éditeur
- Confirmation double pour renvoi définitif
- Tooltip expliquant pourquoi une action est verrouillée

---

## 11. Plan d'implémentation

### Phase 1 — Fondations (3-4 jours)
- [ ] Créer les tables SQL (roles, role_salon_permissions, user_roles, effectif_transfers, effectif_dismissals)
- [ ] Migration des groupes actuels → rôles système
- [ ] Middleware `checkPermission()` + `resolvePermissions()`
- [ ] Endpoint `GET /api/permissions/me`
- [ ] Hook `usePermission` frontend

### Phase 2 — Gestion des rôles (2-3 jours)
- [ ] CRUD API rôles (avec contrôle hiérarchie)
- [ ] Page `/admin/roles` — Liste
- [ ] Page `/admin/roles/:id` — Éditeur avec tri-state toggles
- [ ] Assignation/retrait de rôles sur utilisateurs

### Phase 3 — Transfert & Renvoi (2-3 jours)
- [ ] API transfert + renvoi
- [ ] Page `/effectifs/regiment` — Gestion effectifs du régiment
- [ ] File de transferts en attente (`/admin/transfers`)
- [ ] Écran de renvoi au login
- [ ] Réintégration d'effectif

### Phase 4 — Migration & Tests (1-2 jours)
- [ ] Remplacer les anciens middlewares par `checkPermission()`
- [ ] Tester toutes les routes existantes avec le nouveau système
- [ ] Vérifier la rétrocompatibilité
- [ ] Tests de sécurité (escalade de privilèges, bypass hiérarchie)

### Phase 5 — Polish (1 jour)
- [ ] CSS final (toggles, modals, écran renvoi)
- [ ] Animations et transitions
- [ ] Messages d'erreur appropriés
- [ ] Documentation utilisateur

**Estimation totale** : 9-13 jours de développement

---

## 12. Rétrocompatibilité

Le nouveau système remplace `user_groups` + `groups` mais garde :
- Les mêmes noms de groupes (comme rôles système)
- Les mêmes middlewares (adaptés en interne)
- L'auto-assignation à la création d'effectif (maintenant assigne le rôle système correspondant)

**L'ancien système continue de fonctionner** pendant la migration. Le switch se fait en une fois quand Phase 4 est validée.
