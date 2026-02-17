-- Archives Wehrmacht RP - Database Schema
-- MySQL 8.0+

DROP DATABASE IF EXISTS archives7e;
CREATE DATABASE archives7e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE archives7e;

-- ============================================================================
-- TABLES DE BASE
-- ============================================================================

-- Groupes d'utilisateurs
CREATE TABLE groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Unités militaires
CREATE TABLE unites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    couleur VARCHAR(7) DEFAULT '#2d4a34',
    commandant VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_active (active)
);

-- Grades militaires
CREATE TABLE grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    niveau INT NOT NULL DEFAULT 0,
    couleur VARCHAR(7) DEFAULT '#2d4a34',
    unite_id INT NULL, -- NULL = grade commun à toutes les unités
    active BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE SET NULL,
    INDEX idx_niveau (niveau),
    INDEX idx_unite (unite_id),
    INDEX idx_active (active)
);

-- Utilisateurs
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    unite_id INT NULL,
    active BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP NULL,
    
    FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE SET NULL,
    INDEX idx_active (active),
    INDEX idx_unite (unite_id)
);

-- Association users <-> groups (many-to-many)
CREATE TABLE user_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_group (user_id, group_id)
);

-- ============================================================================
-- EFFECTIFS
-- ============================================================================

-- Effectifs (soldats)
CREATE TABLE effectifs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    unite_id INT NOT NULL,
    grade_id INT NULL,
    date_naissance DATE NULL,
    lieu_naissance VARCHAR(100) NULL,
    nationalite VARCHAR(50) NULL,
    statut ENUM('Actif', 'Inactif', 'MIA', 'KIA') DEFAULT 'Actif',
    notes TEXT,
    photo VARCHAR(255) NULL, -- Chemin vers photo
    date_enrolement DATE NULL,
    date_liberation DATE NULL,
    numero_service VARCHAR(20) NULL,
    created_by INT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE RESTRICT,
    FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_unite (unite_id),
    INDEX idx_grade (grade_id),
    INDEX idx_statut (statut),
    INDEX idx_nom (nom, prenom),
    FULLTEXT idx_search (nom, prenom, lieu_naissance)
);

-- Layouts personnalisés pour les effectifs (Soldbuch)
CREATE TABLE effectif_layouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    effectif_id INT NOT NULL,
    layout_data JSON NOT NULL, -- Position des éléments, styles, etc.
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_effectif (effectif_id),
    INDEX idx_active (is_active)
);

-- ============================================================================
-- RAPPORTS
-- ============================================================================

-- Rapports militaires
CREATE TABLE rapports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    type ENUM('rapport', 'incident', 'recommandation', 'mission') NOT NULL,
    contenu LONGTEXT NOT NULL,
    statut ENUM('Brouillon', 'Envoyé', 'Lu', 'Archivé') DEFAULT 'Brouillon',
    auteur_id INT NOT NULL,
    unite_id INT NOT NULL,
    destinataire VARCHAR(100) NULL,
    date_incident DATE NULL, -- Pour les incidents
    lieu VARCHAR(100) NULL,
    personnes_impliquees JSON NULL, -- IDs des effectifs impliqués
    priorite ENUM('Basse', 'Normale', 'Haute', 'Urgente') DEFAULT 'Normale',
    tags JSON NULL, -- Tags libres pour la recherche
    fichiers_joints JSON NULL, -- Chemins vers fichiers
    numero_rapport VARCHAR(50) NULL, -- Numérotation automatique
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    date_envoi TIMESTAMP NULL,
    date_lecture TIMESTAMP NULL,
    
    FOREIGN KEY (auteur_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE RESTRICT,
    INDEX idx_type (type),
    INDEX idx_statut (statut),
    INDEX idx_auteur (auteur_id),
    INDEX idx_unite (unite_id),
    INDEX idx_date_creation (date_creation),
    FULLTEXT idx_search (titre, contenu)
);

-- ============================================================================
-- CASIERS JUDICIAIRES/DISCIPLINAIRES
-- ============================================================================

-- Casiers (nouveau)
CREATE TABLE casiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    effectif_id INT NOT NULL,
    type ENUM('Disciplinaire', 'Judiciaire', 'Médical', 'Administratif') NOT NULL,
    titre VARCHAR(200) NOT NULL,
    description LONGTEXT,
    statut ENUM('Ouvert', 'En cours', 'Fermé', 'Archivé') DEFAULT 'Ouvert',
    gravite ENUM('Mineure', 'Modérée', 'Grave', 'Très grave') DEFAULT 'Mineure',
    date_incident DATE NOT NULL,
    lieu VARCHAR(100) NULL,
    sanctions TEXT NULL,
    date_fermeture DATE NULL,
    created_by INT NOT NULL,
    unite_id INT NOT NULL,
    fichiers_joints JSON NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE RESTRICT,
    INDEX idx_effectif (effectif_id),
    INDEX idx_type (type),
    INDEX idx_statut (statut),
    INDEX idx_gravite (gravite),
    INDEX idx_date_incident (date_incident),
    FULLTEXT idx_search (titre, description)
);

-- ============================================================================
-- DOSSIERS PERSONNELS
-- ============================================================================

-- Dossiers personnels (nouveau)
CREATE TABLE dossiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    effectif_id INT NOT NULL,
    type ENUM('Personnel', 'Médical', 'Formation', 'Mission', 'Évaluation') NOT NULL,
    titre VARCHAR(200) NOT NULL,
    contenu LONGTEXT,
    date_document DATE NOT NULL,
    confidentiel BOOLEAN DEFAULT FALSE,
    expire_le DATE NULL,
    created_by INT NOT NULL,
    unite_id INT NOT NULL,
    fichiers_joints JSON NULL,
    metadata JSON NULL, -- Données spécifiques selon le type
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (unite_id) REFERENCES unites(id) ON DELETE RESTRICT,
    INDEX idx_effectif (effectif_id),
    INDEX idx_type (type),
    INDEX idx_confidentiel (confidentiel),
    INDEX idx_date_document (date_document),
    INDEX idx_expire (expire_le),
    FULLTEXT idx_search (titre, contenu)
);

-- ============================================================================
-- LOGS ET HISTORIQUE
-- ============================================================================

-- Log des actions (audit trail)
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view'
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_date (date_creation)
);

-- ============================================================================
-- VUES UTILES
-- ============================================================================

-- Vue des effectifs complets avec unité et grade
CREATE VIEW v_effectifs_complets AS
SELECT 
    e.*,
    u.nom as unite_nom,
    u.couleur as unite_couleur,
    g.nom as grade_nom,
    g.niveau as grade_niveau,
    g.couleur as grade_couleur,
    creator.username as created_by_username
FROM effectifs e
LEFT JOIN unites u ON e.unite_id = u.id
LEFT JOIN grades g ON e.grade_id = g.id
LEFT JOIN users creator ON e.created_by = creator.id;

-- Vue des rapports avec informations complètes
CREATE VIEW v_rapports_complets AS
SELECT 
    r.*,
    u.nom as unite_nom,
    u.couleur as unite_couleur,
    auteur.username as auteur_username,
    CASE 
        WHEN r.statut = 'Brouillon' THEN 0
        WHEN r.statut = 'Envoyé' THEN 1
        WHEN r.statut = 'Lu' THEN 2
        WHEN r.statut = 'Archivé' THEN 3
    END as statut_ordre
FROM rapports r
LEFT JOIN unites u ON r.unite_id = u.id
LEFT JOIN users auteur ON r.auteur_id = auteur.id;

-- Vue des casiers avec informations complètes
CREATE VIEW v_casiers_complets AS
SELECT 
    c.*,
    e.nom as effectif_nom,
    e.prenom as effectif_prenom,
    e.numero_service as effectif_numero,
    u.nom as unite_nom,
    creator.username as created_by_username
FROM casiers c
LEFT JOIN effectifs e ON c.effectif_id = e.id
LEFT JOIN unites u ON c.unite_id = u.id
LEFT JOIN users creator ON c.created_by = creator.id;
-- ============================================================================
-- INTERDITS DE FRONT
-- ============================================================================

CREATE TABLE interdits_front (
    id INT AUTO_INCREMENT PRIMARY KEY,
    effectif_id INT NOT NULL,
    motif TEXT NOT NULL,
    type ENUM('Disciplinaire', 'Medical', 'Administratif') NOT NULL DEFAULT 'Disciplinaire',
    date_debut DATE NOT NULL,
    date_fin DATE NULL,
    ordonne_par INT NOT NULL,
    leve_par INT NULL,
    date_levee TIMESTAMP NULL,
    actif BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
    FOREIGN KEY (ordonne_par) REFERENCES users(id),
    FOREIGN KEY (leve_par) REFERENCES users(id),
    INDEX idx_effectif (effectif_id),
    INDEX idx_actif (actif)
);

-- ============================================================================
-- VISITES MÉDICALES
-- ============================================================================

CREATE TABLE visites_medicales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    effectif_id INT NOT NULL,
    date_visite DATE NOT NULL,
    medecin VARCHAR(100),
    diagnostic TEXT,
    aptitude ENUM('Apte', 'Inapte temporaire', 'Inapte definitif', 'Apte avec reserves') DEFAULT 'Apte',
    restrictions TEXT,
    notes_confidentielles TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_effectif (effectif_id),
    INDEX idx_aptitude (aptitude)
);

-- Permissions tampons bibliothèque
CREATE TABLE IF NOT EXISTS bibliotheque_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bibliotheque_id INT NOT NULL,
  group_id INT NULL,
  effectif_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bibliotheque_id) REFERENCES bibliotheque(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_bib_group (bibliotheque_id, group_id),
  UNIQUE KEY uq_bib_eff (bibliotheque_id, effectif_id)
);

-- Hospitalisations (Soldbuch page 12)
CREATE TABLE IF NOT EXISTS hospitalisations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effectif_id INT NOT NULL,
  date_entree DATE NOT NULL,
  date_sortie DATE NULL,
  etablissement VARCHAR(200) NOT NULL,
  motif VARCHAR(500) NOT NULL,
  diagnostic VARCHAR(500) NULL,
  traitement TEXT NULL,
  medecin_id INT NULL,
  medecin_nom VARCHAR(200) NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
  FOREIGN KEY (medecin_id) REFERENCES effectifs(id) ON DELETE SET NULL
);

-- Vaccinations (Soldbuch page 9)
CREATE TABLE IF NOT EXISTS vaccinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effectif_id INT NOT NULL,
  type_vaccin VARCHAR(200) NOT NULL,
  date_vaccination DATE NOT NULL,
  date_rappel DATE NULL,
  medecin_id INT NULL,
  medecin_nom VARCHAR(200) NULL,
  lot VARCHAR(100) NULL,
  notes VARCHAR(500) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE
);

-- Blessures (Soldbuch pages 13-14)
CREATE TABLE IF NOT EXISTS blessures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effectif_id INT NOT NULL,
  date_blessure DATE NOT NULL,
  type_blessure VARCHAR(200) NOT NULL,
  localisation VARCHAR(200) NOT NULL,
  circonstances TEXT NULL,
  gravite ENUM('legere','moyenne','grave','critique') DEFAULT 'legere',
  sequelles VARCHAR(500) NULL,
  medecin_id INT NULL,
  medecin_nom VARCHAR(200) NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE
);

-- Soldbuch attestations (auto-generated on medals, promotions, validated edits)
CREATE TABLE IF NOT EXISTS soldbuch_attestations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effectif_id INT NOT NULL,
  numero INT NOT NULL,
  modification VARCHAR(500) NOT NULL,
  page VARCHAR(10) NULL,
  date_attestation DATE NOT NULL,
  source ENUM('manual','medal','promotion','detail_validation','medical','permission') DEFAULT 'manual',
  source_id INT NULL,
  signe_par INT NULL,
  signature_data LONGTEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE,
  INDEX idx_att_eff (effectif_id)
);

-- Pending soldbuch edits (soldier self-service needs validation)
CREATE TABLE IF NOT EXISTS soldbuch_pending_edits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  effectif_id INT NOT NULL,
  cell_id VARCHAR(100) NOT NULL,
  old_value VARCHAR(500) NULL,
  new_value VARCHAR(500) NOT NULL,
  statut ENUM('pending','approved','rejected') DEFAULT 'pending',
  submitted_by INT NOT NULL,
  validated_by INT NULL,
  validated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (effectif_id) REFERENCES effectifs(id) ON DELETE CASCADE
);
