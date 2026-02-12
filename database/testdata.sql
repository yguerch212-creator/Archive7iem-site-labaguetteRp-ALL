-- Archives Wehrmacht RP - Clean data reset
-- Encoding: UTF-8

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Purge tout
DELETE FROM rapports;
DELETE FROM effectifs;
DELETE FROM grades;

-- Reset auto-increment
ALTER TABLE grades AUTO_INCREMENT = 1;
ALTER TABLE effectifs AUTO_INCREMENT = 1;
ALTER TABLE rapports AUTO_INCREMENT = 1;

-- ============================================================================
-- GRADES COMPLETS PAR UNITE
-- ============================================================================

-- 916. Grenadier Regiment (unite_id=1)
INSERT INTO grades (unite_id, nom_complet, rang) VALUES
(1, 'Oberst', 100),
(1, 'Major', 90),
(1, 'Hauptmann', 80),
(1, 'Oberleutnant', 70),
(1, 'Leutnant', 60),
(1, 'Oberfeldwebel', 55),
(1, 'Feldwebel', 50),
(1, 'Unterfeldwebel', 45),
(1, 'Stabsgefreiter', 40),
(1, 'Obergefreiter', 30),
(1, 'Gefreiter', 20),
(1, 'Soldat', 10);

-- 254. Feldgendarmerie (unite_id=2)
INSERT INTO grades (unite_id, nom_complet, rang) VALUES
(2, 'Oberst', 100),
(2, 'Major', 90),
(2, 'Hauptmann', 80),
(2, 'Oberleutnant', 70),
(2, 'Leutnant', 60),
(2, 'Hauptwachtmeister', 50),
(2, 'Wachtmeister', 40),
(2, 'Oberwachtmeister', 35),
(2, 'Gefreiter', 20),
(2, 'Soldat', 10);

-- 916S. Sanitaets-abteilung (unite_id=3)
INSERT INTO grades (unite_id, nom_complet, rang) VALUES
(3, 'Oberstabsarzt', 100),
(3, 'Stabsarzt', 90),
(3, 'Oberarzt', 80),
(3, 'Assistenzarzt', 60),
(3, 'Sanitaetsfeldwebel', 50),
(3, 'Sanitaetsunteroffizier', 40),
(3, 'Sanitaetsobergefreiter', 30),
(3, 'Sanitaetsgefreiter', 20),
(3, 'Sanitaetssoldat', 10);

-- 001. Marine Pionier Bataillon (unite_id=4)
INSERT INTO grades (unite_id, nom_complet, rang) VALUES
(4, 'Korvettenkapitaen', 100),
(4, 'Kapitaenleutnant', 80),
(4, 'Oberleutnant zur See', 70),
(4, 'Leutnant zur See', 60),
(4, 'Oberbootsmann', 50),
(4, 'Bootsmann', 40),
(4, 'Obermatrose', 30),
(4, 'Matrose', 10);

-- 919. Logistik-Abteilung (unite_id=5)
INSERT INTO grades (unite_id, nom_complet, rang) VALUES
(5, 'Oberst', 100),
(5, 'Major', 90),
(5, 'Hauptmann', 80),
(5, 'Oberleutnant', 70),
(5, 'Leutnant', 60),
(5, 'Feldwebel', 50),
(5, 'Unteroffizier', 40),
(5, 'Obergefreiter', 30),
(5, 'Gefreiter', 20),
(5, 'Versorgungssoldat', 10);

-- 130. Panzer Lehr (unite_id=6)
INSERT INTO grades (unite_id, nom_complet, rang) VALUES
(6, 'Oberst', 100),
(6, 'Major', 90),
(6, 'Hauptmann', 80),
(6, 'Oberleutnant', 70),
(6, 'Leutnant', 60),
(6, 'Feldwebel', 50),
(6, 'Unteroffizier', 40),
(6, 'Oberjaeger', 35),
(6, 'Jaeger', 30),
(6, 'Gefreiter', 20),
(6, 'Panzerschuetze', 10);

-- 009. Fallschirmjaeger Regiment (unite_id=7)
INSERT INTO grades (unite_id, nom_complet, rang) VALUES
(7, 'Oberst', 100),
(7, 'Major', 90),
(7, 'Hauptmann', 80),
(7, 'Oberleutnant', 70),
(7, 'Leutnant', 60),
(7, 'Oberfeldwebel', 55),
(7, 'Feldwebel', 50),
(7, 'Unteroffizier', 40),
(7, 'Oberjaeger', 35),
(7, 'Jaeger', 30),
(7, 'Gefreiter', 20),
(7, 'Fallschirmsoldat', 10);

-- ============================================================================
-- EFFECTIFS (depuis le lore Discord - noms et grades verifies)
-- ============================================================================

-- Variables pour les grade_id: on utilise des sous-requetes

-- 916. Grenadier Regiment
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, arme_secondaire, historique, date_entree_ig, date_entree_irl) VALUES
('Wurst', 'Manfred', NULL, 1, (SELECT id FROM grades WHERE unite_id=1 AND nom_complet='Oberleutnant'), '1908-03-15', 'Muenchen', 'Allemande', 182, 'Walther P38', NULL, 'Kommandeur du 916. Grenadier Regiment. Veteran du front de l''Est, transfere en Normandie pour la defense cotiere.', '1936-08-01', '2024-09-15'),
('Hermantraut', 'Miller', NULL, 1, (SELECT id FROM grades WHERE unite_id=1 AND nom_complet='Leutnant'), '1912-07-22', 'Hamburg', 'Allemande', 178, 'MP40', 'Walther P38', 'Kommandeur adjoint du 916. Grenadier Regiment. Specialiste tactique d''infanterie.', '1938-03-10', '2024-10-01'),
('Herman', 'Freinz', NULL, 1, (SELECT id FROM grades WHERE unite_id=1 AND nom_complet='Unterfeldwebel'), '1918-11-03', 'Berlin', 'Allemande', 175, 'Kar98k', 'Stielhandgranate', 'Promu Unterfeldwebel le 14 decembre 2024. Soldat discipline.', '1940-06-15', '2024-11-20'),
('Baumane', 'Yuri', NULL, 1, (SELECT id FROM grades WHERE unite_id=1 AND nom_complet='Obergefreiter'), '1920-05-18', 'Dresden', 'Allemande', 170, 'Kar98k', NULL, 'Promu Obergefreiter le 14 decembre 2024.', '1942-01-10', '2025-01-05'),
('Kartofel', 'Billy', NULL, 1, (SELECT id FROM grades WHERE unite_id=1 AND nom_complet='Hauptmann'), '1905-09-10', 'Koeln', 'Allemande', 180, 'Walther P38', NULL, 'Hauptmann du 916eme. A ecrit une lettre importante au regiment le 16 fevrier 2025.', '1935-04-20', '2024-08-10'),
('Arthur', 'Heinrich', NULL, 1, (SELECT id FROM grades WHERE unite_id=1 AND nom_complet='Stabsgefreiter'), '1922-04-12', 'Stuttgart', 'Allemande', 176, 'Kar98k', NULL, 'Recherche pour haute trahison et espionnage. Avis de recherche emis le 22 decembre 2024.', '1943-01-01', '2024-12-01');

-- 254. Feldgendarmerie
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, arme_secondaire, historique, date_entree_ig, date_entree_irl) VALUES
('Muller', 'Jean', NULL, 2, (SELECT id FROM grades WHERE unite_id=2 AND nom_complet='Hauptmann'), '1905-09-10', 'Koeln', 'Allemande', 185, 'Walther P38', NULL, 'Kommandeur de la 254. Feldgendarmerie. Responsable du maintien de l''ordre dans le secteur.', '1937-02-15', '2024-09-01'),
('Hoenstadt', 'Kreger', NULL, 2, (SELECT id FROM grades WHERE unite_id=2 AND nom_complet='Oberleutnant'), '1910-01-28', 'Frankfurt', 'Allemande', 180, 'MP40', 'Walther PPK', 'Kommandeur adjoint de la 254. Feldgendarmerie.', '1939-11-20', '2024-10-15'),
('Heinzenbourg', 'Krug O.', NULL, 2, (SELECT id FROM grades WHERE unite_id=2 AND nom_complet='Leutnant'), '1915-08-05', 'Leipzig', 'Allemande', 177, 'MP40', NULL, 'Commandant du 413e regiment de feldgendarmerie.', '1940-08-05', '2025-02-01'),
('Zicker', 'Hans', NULL, 2, (SELECT id FROM grades WHERE unite_id=2 AND nom_complet='Hauptwachtmeister'), '1910-06-10', 'Breslau', 'Allemande', 179, 'Kar98k', NULL, 'Chauffeur-mecanicien, veteran de Stalingrad.', '1938-06-10', '2024-12-01');

-- 916S. Sanitaets-abteilung
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, historique, date_entree_ig, date_entree_irl) VALUES
('Der Erlkoenig', 'Ernest', NULL, 3, (SELECT id FROM grades WHERE unite_id=3 AND nom_complet='Oberstabsarzt'), '1900-12-01', 'Wien', 'Autrichienne', 177, 'Walther P38', 'Oberstabsarzt et Kommandeur du Sanitaets-abteilung. Medecin militaire chevrone.', '1934-01-15', '2024-09-20'),
('Elseeune', 'Bert', NULL, 3, (SELECT id FROM grades WHERE unite_id=3 AND nom_complet='Oberarzt'), '1907-06-15', 'Zuerich', 'Suisse', 173, NULL, 'Oberarzt et Kommandeur adjoint. Specialiste en medecine de terrain.', '1936-09-01', '2024-10-10');

-- 001. Marine Pionier Bataillon
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, historique, date_entree_ig, date_entree_irl) VALUES
('Vander', 'Alarak', NULL, 4, (SELECT id FROM grades WHERE unite_id=4 AND nom_complet='Kapitaenleutnant'), '1903-08-20', 'Kiel', 'Allemande', 184, 'Walther P38', 'Kapitaenleutnant et Kommandeur du 001. Marine Pionier Bataillon. Expert en fortifications cotieres.', '1936-05-10', '2024-11-01'),
('Wittmann', 'Karl', NULL, 4, (SELECT id FROM grades WHERE unite_id=4 AND nom_complet='Oberleutnant zur See'), '1911-02-14', 'Rostock', 'Allemande', 179, 'MP40', 'Oberleutnant zur See et Kommandeur adjoint. Specialiste deminage.', '1939-07-20', '2025-01-15');

-- 919. Logistik-Abteilung
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, historique, date_entree_ig, date_entree_irl) VALUES
('Von Strauss', 'Krauss', NULL, 5, (SELECT id FROM grades WHERE unite_id=5 AND nom_complet='Oberleutnant'), '1909-03-25', 'Nuernberg', 'Allemande', 181, 'Walther P38', 'Kommandeur de la 919e Logistik-Abteilung.', '1937-10-01', '2024-11-15');

-- 130. Panzer Lehr
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, historique, date_entree_ig, date_entree_irl) VALUES
('Hoenigsberg', 'Ernst', NULL, 6, (SELECT id FROM grades WHERE unite_id=6 AND nom_complet='Major'), '1902-04-05', 'Nuernberg', 'Allemande', 181, 'Walther P38', 'Kommandeur de la 130. Panzer Lehr. Egalement Obersturmfuehrer du 002. Panzer Regiment "Das Reich". Victoire contre le 2eme Regiment blinde US Army.', '1935-10-01', '2024-08-20'),
('von Richtofen', 'Ernst', NULL, 6, (SELECT id FROM grades WHERE unite_id=6 AND nom_complet='Leutnant'), '1916-10-30', 'Augsburg', 'Allemande', 174, 'MP40', 'Kommandeur adjoint de la 130. Panzer Lehr. Specialise en tactiques blindees.', '1938-12-15', '2025-01-20');

-- 009. Fallschirmjaeger Regiment
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, arme_secondaire, historique, date_entree_ig, date_entree_irl) VALUES
('Urkane', 'Markus', NULL, 7, (SELECT id FROM grades WHERE unite_id=7 AND nom_complet='Hauptmann'), '1909-11-11', 'Leipzig', 'Allemande', 183, 'FG42', 'Walther P38', 'Kommandeur du 009. Fallschirmjaeger Regiment. Veteran de Crete et de Monte Cassino.', '1936-02-10', '2025-01-03');

-- ============================================================================
-- RAPPORTS (sans caracteres speciaux problematiques)
-- ============================================================================

INSERT INTO rapports (type, titre, auteur_nom, personne_renseignee_nom, unite_id, contexte, resume, bilan, remarques, signature_nom, signature_grade, date_rp, date_irl) VALUES
('rapport', 'Rapport de patrouille - Secteur cotier Omaha', 'Oltn. Manfred Wurst', 'Stgfr. Friedrich Von Krieg', 1,
  'Patrouille de routine le long du secteur cotier assigne au 916. Grenadier Regiment.',
  'La patrouille s''est deroulee sans incident majeur. Les fortifications du secteur B-3 sont en bon etat. Deux casemates necessitent des reparations mineures.',
  'Secteur operationnel. Demande de materiel pour reparations envoyee a la 919e Logistik.',
  'Renforcer les patrouilles nocturnes suite a des signalements d''activite de resistance.',
  'Manfred Wurst', 'Oberleutnant', '12 Mai 1944', '2025-04-15'),

('rapport', 'Rapport sanitaire hebdomadaire - Semaine 22', 'Ostaz. Ernest Der Erlkoenig', NULL, 3,
  'Bilan sanitaire hebdomadaire du Sanitaets-abteilung.',
  '14 consultations cette semaine. 3 blessures legeres en entrainement, 2 cas de fievre, 1 entorse. Aucune evacuation necessaire.',
  'Etat sanitaire general satisfaisant. Moral des troupes correct.',
  'Demande de reapprovisionnement en sulfamides et bandages.',
  'Ernest Der Erlkoenig', 'Oberstabsarzt', '1 Juin 1944', '2025-06-01'),

('rapport', 'Rapport d''inspection - Defenses portuaires', 'Kplt. Alarak Vander', 'Olzs. Karl Wittmann', 4,
  'Inspection des defenses portuaires et obstacles anti-debarquement.',
  'Les obstacles de plage sont en place sur 85% du secteur assigne. Les mines aquatiques ont ete posees selon le plan.',
  'Le dispositif defensif est operationnel a 90%. Delai estime pour completion totale: 2 semaines.',
  NULL,
  'Alarak Vander', 'Kapitaenleutnant', '25 Mai 1944', '2025-05-25'),

('rapport', 'Rapport de combat - Attaques de bases US', 'Maj. Ernst Hoenigsberg', NULL, 6,
  'Engagement blinde dans le secteur de Falaise.',
  'La 130. Panzer Lehr a engage les forces blindees americaines dans le secteur de Falaise. Destruction de 3 chars Sherman.',
  'Victoire tactique. Pertes minimales cote allemand.',
  NULL,
  'Ernst Hoenigsberg', 'Major', '15 Juillet 1944', '2025-07-15');

INSERT INTO rapports (type, titre, auteur_nom, recommande_nom, recommande_grade, recommande_unite, raison_1, recompense, signature_nom, signature_grade, unite_id, date_rp, date_irl) VALUES
('recommandation', 'Recommandation pour promotion - Yuri Baumane', 'Ltn. Miller Hermantraut', 'Yuri Baumane', 'Gefreiter', '916. Grenadier Regiment',
  'Comportement exemplaire lors des exercices de defense cotiere. A fait preuve d''initiative et de courage.',
  'Promotion au grade d''Obergefreiter',
  'Miller Hermantraut', 'Leutnant', 1, '14 Decembre 1944', '2024-12-14'),

('recommandation', 'Recommandation au merite - Engagement blinde de Falaise', 'Maj. Ernst Hoenigsberg', 'Ernst von Richtofen', 'Leutnant', '130. Panzer Lehr',
  'Engagement heroique lors de la bataille de Falaise. A detruit 3 chars Sherman malgre une inferiorite numerique.',
  'Croix de fer 2eme classe et recommandation pour le grade d''Oberleutnant',
  'Ernst Hoenigsberg', 'Major', 6, '15 Juillet 1944', '2025-07-15');

INSERT INTO rapports (type, titre, auteur_nom, intro_nom, intro_grade, intro_fonction, intro_unite, lieu_incident, mise_en_cause_nom, mise_en_cause_grade, compte_rendu, signature_nom, signature_grade, unite_id, date_rp, date_irl) VALUES
('incident', 'Incident disciplinaire - Altercation au mess', 'Haupt. Jean Muller',
  'Jean Muller', 'Hauptmann', 'Kommandeur', '254. Feldgendarmerie',
  'Mess des officiers - Quartier general',
  'Soldat inconnu (916. Gren.)', 'Gefreiter',
  'A 21h30, une altercation a eclate au mess entre deux soldats du 916. Grenadier Regiment. Intervention de la Feldgendarmerie pour retablir l''ordre. Aucun blesse grave. Enquete en cours.',
  'Jean Muller', 'Hauptmann', 2, '8 Juin 1944', '2025-05-20'),

('incident', 'Avis de recherche - Heinrich Arthur', 'Haupt. Jean Muller',
  'Jean Muller', 'Hauptmann', 'Kommandeur', '254. Feldgendarmerie',
  'Ensemble du secteur operationnel',
  'Heinrich Arthur', 'Stabsgefreiter',
  'Le Stabsgefreiter Heinrich Arthur du 916. Grenadier Regiment est recherche pour haute trahison et espionnage. Avis de recherche emis le 22 decembre 1944. Toute information doit etre communiquee a la Feldgendarmerie.',
  'Jean Muller', 'Hauptmann', 2, '22 Decembre 1944', '2024-12-22'),

('incident', 'Incident operationnel - Largage rate secteur Nord', 'Haupt. Markus Urkane',
  'Markus Urkane', 'Hauptmann', 'Kommandeur', '009. Fallschirmjaeger Regiment',
  'Zone de largage Nord - Secteur Sainte-Mere-Eglise',
  'Equipage Ju 52 n.347', NULL,
  'Lors de l''operation de largage nocturne, le Ju 52 a devie de sa trajectoire suite a un tir de DCA allie. Les parachutistes ont ete largues 3km au sud de la zone prevue. Regroupement effectue sous le feu. 2 blesses legers, aucune perte.',
  'Markus Urkane', 'Hauptmann', 7, '6 Juin 1944', '2025-06-06');
