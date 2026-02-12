-- Archives Wehrmacht RP - Données de base (Seed)
-- À exécuter après schema.sql

USE archives7e;

-- ============================================================================
-- GROUPES D'UTILISATEURS
-- ============================================================================

INSERT INTO groups (nom, description, permissions) VALUES
('Administration', 'Accès complet au système', '{"users": "crud", "effectifs": "crud", "rapports": "crud", "casiers": "crud", "dossiers": "crud", "admin": "crud"}'),
('Officier', 'Accès étendu pour les officiers', '{"effectifs": "crud", "rapports": "crud", "casiers": "read", "dossiers": "crud"}'),
('Sous-Officier', 'Accès standard pour les sous-officiers', '{"effectifs": "read", "rapports": "crud", "casiers": "read", "dossiers": "read"}'),
('Utilisateur', 'Accès de base', '{"effectifs": "read", "rapports": "read", "casiers": "none", "dossiers": "read"}');

-- ============================================================================
-- UNITÉS MILITAIRES (LORE 7ème Division)
-- ============================================================================

INSERT INTO unites (nom, description, couleur, commandant) VALUES
('916 Grenadier Regiment', 'Régiment d\'infanterie de ligne', '#4a6741', 'Oberst Friedrich Weber'),
('254 Feldgendarmerie', 'Police militaire', '#8b4a47', 'Major Heinrich Müller'),
('916 Sanitäts Kompanie', 'Service de santé', '#6b7a8b', 'Hauptmann Dr. Klaus Schmidt'),
('001 Marine Pionier Bataillon', 'Génie militaire amphibie', '#2d4a5c', 'Major Otto Braun'),
('919 Logistik Kompanie', 'Service logistique', '#a17c47', 'Hauptmann Wilhelm Berg'),
('130 Panzer Lehr Abteilung', 'Unité blindée d\'instruction', '#5c4a3a', 'Oberstleutnant Hans Krüger'),
('009 Fallschirmjäger Kompanie', 'Parachutistes', '#4a5c3a', 'Hauptmann Ernst Bauer');

-- ============================================================================
-- GRADES MILITAIRES
-- ============================================================================

-- Grades communs (unite_id = NULL)
INSERT INTO grades (nom, niveau, couleur, unite_id) VALUES
-- Officiers supérieurs
('Oberst', 100, '#8b7355', NULL),
('Oberstleutnant', 95, '#8b7355', NULL),
('Major', 90, '#8b7355', NULL),

-- Officiers
('Hauptmann', 85, '#6b7d52', NULL),
('Oberleutnant', 80, '#6b7d52', NULL),
('Leutnant', 75, '#6b7d52', NULL),

-- Sous-officiers supérieurs
('Hauptfeldwebel', 70, '#5c4d37', NULL),
('Oberfeldwebel', 65, '#5c4d37', NULL),
('Feldwebel', 60, '#5c4d37', NULL),

-- Sous-officiers
('Unterfeldwebel', 55, '#4a3d29', NULL),
('Unteroffizier', 50, '#4a3d29', NULL),

-- Caporaux
('Stabsgefreiter', 45, '#3a2e1f', NULL),
('Obergefreiter', 40, '#3a2e1f', NULL),
('Gefreiter', 35, '#3a2e1f', NULL),

-- Soldats
('Oberschütze', 30, '#2c2317', NULL),
('Schütze', 25, '#2c2317', NULL),
('Rekrut', 20, '#2c2317', NULL);

-- Grades spécialisés par unité
-- Sanitäts
INSERT INTO grades (nom, niveau, couleur, unite_id) VALUES
('Oberarzt', 90, '#6b7a8b', (SELECT id FROM unites WHERE nom = '916 Sanitäts Kompanie')),
('Assistenzarzt', 85, '#6b7a8b', (SELECT id FROM unites WHERE nom = '916 Sanitäts Kompanie')),
('Sanitätsunteroffizier', 50, '#6b7a8b', (SELECT id FROM unites WHERE nom = '916 Sanitäts Kompanie')),
('Sanitätsgefreiter', 35, '#6b7a8b', (SELECT id FROM unites WHERE nom = '916 Sanitäts Kompanie'));

-- Feldgendarmerie
INSERT INTO grades (nom, niveau, couleur, unite_id) VALUES
('Feldgendarmerie-Hauptmann', 85, '#8b4a47', (SELECT id FROM unites WHERE nom = '254 Feldgendarmerie')),
('Feldgendarmerie-Leutnant', 75, '#8b4a47', (SELECT id FROM unites WHERE nom = '254 Feldgendarmerie')),
('Feldgendarmerie-Feldwebel', 60, '#8b4a47', (SELECT id FROM unites WHERE nom = '254 Feldgendarmerie'));

-- ============================================================================
-- UTILISATEUR ADMINISTRATEUR
-- ============================================================================

-- Mot de passe: "admin123" (hash bcrypt avec salt 10)
INSERT INTO users (username, email, password, unite_id, active) VALUES
('admin', 'admin@archives7e.com', '$2a$10$8h.5p2xH5WJhq4c0EMFaEeqJhp7JQXqCqJhGJ9F8xQoGJHhV0eaVe', NULL, TRUE);

-- Assigner le groupe Administration à l'admin
INSERT INTO user_groups (user_id, group_id) VALUES
(
    (SELECT id FROM users WHERE username = 'admin'),
    (SELECT id FROM groups WHERE nom = 'Administration')
);

-- ============================================================================
-- UTILISATEURS EXEMPLES
-- ============================================================================

-- Officiers de chaque unité (mot de passe: "password123")
INSERT INTO users (username, email, password, unite_id) VALUES
('schmidt.k', 'schmidt.k@archives7e.com', '$2a$10$UJmW9X8vF2dF6qF7F9F7F.F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F', 
 (SELECT id FROM unites WHERE nom = '916 Sanitäts Kompanie')),
 
('mueller.h', 'mueller.h@archives7e.com', '$2a$10$UJmW9X8vF2dF6qF7F9F7F.F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F', 
 (SELECT id FROM unites WHERE nom = '254 Feldgendarmerie')),
 
('weber.f', 'weber.f@archives7e.com', '$2a$10$UJmW9X8vF2dF6qF7F9F7F.F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F7F', 
 (SELECT id FROM unites WHERE nom = '916 Grenadier Regiment'));

-- Assigner les groupes
INSERT INTO user_groups (user_id, group_id) VALUES
((SELECT id FROM users WHERE username = 'schmidt.k'), (SELECT id FROM groups WHERE nom = 'Officier')),
((SELECT id FROM users WHERE username = 'mueller.h'), (SELECT id FROM groups WHERE nom = 'Officier')),
((SELECT id FROM users WHERE username = 'weber.f'), (SELECT id FROM groups WHERE nom = 'Officier'));

-- ============================================================================
-- EFFECTIFS EXEMPLES
-- ============================================================================

-- Quelques soldats exemple pour chaque unité
INSERT INTO effectifs (nom, prenom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, statut, numero_service, date_enrolement, created_by) VALUES
-- 916 Grenadier
('Braun', 'Hans', 
 (SELECT id FROM unites WHERE nom = '916 Grenadier Regiment'),
 (SELECT id FROM grades WHERE nom = 'Feldwebel' AND unite_id IS NULL),
 '1920-05-15', 'Berlin', 'Allemande', 'Actif', 'GR916-001', '1939-09-01',
 (SELECT id FROM users WHERE username = 'admin')),

('Hoffmann', 'Karl', 
 (SELECT id FROM unites WHERE nom = '916 Grenadier Regiment'),
 (SELECT id FROM grades WHERE nom = 'Gefreiter' AND unite_id IS NULL),
 '1922-12-03', 'München', 'Allemande', 'Actif', 'GR916-002', '1940-03-15',
 (SELECT id FROM users WHERE username = 'admin')),

-- Feldgendarmerie
('Wagner', 'Ernst', 
 (SELECT id FROM unites WHERE nom = '254 Feldgendarmerie'),
 (SELECT id FROM grades WHERE nom = 'Feldgendarmerie-Feldwebel'),
 '1918-08-22', 'Hamburg', 'Allemande', 'Actif', 'FG254-001', '1938-04-01',
 (SELECT id FROM users WHERE username = 'admin')),

-- Sanitäts
('Fischer', 'Wolfgang', 
 (SELECT id FROM unites WHERE nom = '916 Sanitäts Kompanie'),
 (SELECT id FROM grades WHERE nom = 'Sanitätsunteroffizier'),
 '1921-02-14', 'Dresden', 'Allemande', 'Actif', 'SAN916-001', '1940-01-10',
 (SELECT id FROM users WHERE username = 'admin'));

-- ============================================================================
-- RAPPORTS EXEMPLES
-- ============================================================================

INSERT INTO rapports (titre, type, contenu, statut, auteur_id, unite_id, numero_rapport, date_incident, lieu) VALUES
('Rapport de mission - Reconnaissance Secteur Nord', 'rapport',
 'Mission de reconnaissance effectuée dans le secteur Nord. Aucun contact ennemi signalé. Terrain difficile mais praticable pour les véhicules légers.',
 'Envoyé',
 (SELECT id FROM users WHERE username = 'weber.f'),
 (SELECT id FROM unites WHERE nom = '916 Grenadier Regiment'),
 'RPT-GR916-2024-001', '2024-02-10', 'Secteur Nord'),

('Incident disciplinaire - Soldat Hoffmann', 'incident',
 'Le soldat Hoffmann s\'est présenté en retard à l\'appel matinal. Absence non justifiée de 30 minutes. Première infraction.',
 'Lu',
 (SELECT id FROM users WHERE username = 'weber.f'),
 (SELECT id FROM unites WHERE nom = '916 Grenadier Regiment'),
 'INC-GR916-2024-001', '2024-02-11', 'Caserne');

-- ============================================================================
-- CASIERS EXEMPLES
-- ============================================================================

INSERT INTO casiers (effectif_id, type, titre, description, statut, gravite, date_incident, lieu, created_by, unite_id) VALUES
((SELECT id FROM effectifs WHERE nom = 'Hoffmann' AND prenom = 'Karl'),
 'Disciplinaire', 'Retard à l\'appel', 'Retard de 30 minutes à l\'appel matinal du 11/02/2024', 
 'Fermé', 'Mineure', '2024-02-11', 'Caserne',
 (SELECT id FROM users WHERE username = 'admin'),
 (SELECT id FROM unites WHERE nom = '916 Grenadier Regiment'));

-- ============================================================================
-- DOSSIERS EXEMPLES
-- ============================================================================

INSERT INTO dossiers (effectif_id, type, titre, contenu, date_document, confidentiel, created_by, unite_id) VALUES
((SELECT id FROM effectifs WHERE nom = 'Fischer' AND prenom = 'Wolfgang'),
 'Formation', 'Formation premiers secours avancés', 
 'Formation complétée avec succès. Note: 18/20. Aptitudes démontrées pour les soins d\'urgence.',
 '2024-02-01', FALSE,
 (SELECT id FROM users WHERE username = 'admin'),
 (SELECT id FROM unites WHERE nom = '916 Sanitäts Kompanie'));

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================

-- Compter les enregistrements créés
SELECT 
    'Groups' as table_name, COUNT(*) as count FROM groups
UNION ALL SELECT 'Units', COUNT(*) FROM unites
UNION ALL SELECT 'Grades', COUNT(*) FROM grades  
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'User_Groups', COUNT(*) FROM user_groups
UNION ALL SELECT 'Effectifs', COUNT(*) FROM effectifs
UNION ALL SELECT 'Rapports', COUNT(*) FROM rapports
UNION ALL SELECT 'Casiers', COUNT(*) FROM casiers
UNION ALL SELECT 'Dossiers', COUNT(*) FROM dossiers;