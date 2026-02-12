-- Archives Wehrmacht RP - Données de test (depuis le lore Discord)
-- À exécuter après seed.sql

USE archives7e;

-- ============================================================================
-- EFFECTIFS DE TEST
-- ============================================================================

-- 916. Grenadier Regiment (unite_id=1)
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, specialite, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, arme_secondaire, historique, date_entree_ig, date_entree_irl) VALUES
('Wurst', 'Manfred', NULL, 1, 4, 'Commandement', '1908-03-15', 'München', 'Allemande', 182, 'Walther P38', NULL, 'Kommandeur du 916. Grenadier Regiment. Vétéran du front de l''Est, transféré en Normandie pour la défense côtière.', '12 Août 1943', '2025-01-15'),
('Hermantraut', 'Miller', NULL, 1, 5, 'Commandement adjoint', '1912-07-22', 'Hamburg', 'Allemande', 178, 'MP40', 'Walther P38', 'Kommandeur adjoint du 916. Grenadier Regiment. Spécialiste tactique d''infanterie.', '15 Septembre 1943', '2025-01-20'),
('Von Krieg', 'Friedrich', 'Fritz', 1, 7, 'Fusilier', '1920-11-03', 'Berlin', 'Allemande', 175, 'Kar98k', 'Stielhandgranate', 'Soldat discipliné, a participé aux combats de Carentan. Blessé léger au bras droit.', '1 Mars 1944', '2025-02-01'),
('Braun', 'Heinrich', NULL, 1, 9, 'Fusilier', '1924-05-18', 'Dresden', 'Allemande', 170, 'Kar98k', NULL, 'Jeune recrue. Formation de base terminée à Stuttgart. Déployé sur le mur de l''Atlantique.', '20 Mai 1944', '2025-03-10');

-- 254. Feldgendarmerie (unite_id=2)
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, specialite, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, arme_secondaire, historique, date_entree_ig, date_entree_irl) VALUES
('Muller', 'Jean', NULL, 2, 11, 'Commandement / Police militaire', '1905-09-10', 'Köln', 'Allemande', 185, 'Walther P38', NULL, 'Kommandeur de la 254. Feldgendarmerie. Ancien policier civil reconverti. Responsable du maintien de l''ordre dans le secteur.', '5 Juin 1943', '2025-01-10'),
('Höenstadt', 'Kreger', NULL, 2, 12, 'Enquêtes judiciaires', '1910-01-28', 'Frankfurt', 'Allemande', 180, 'MP40', 'Walther PPK', 'Kommandeur adjoint. Spécialiste des interrogatoires et enquêtes. Patrouilles motorisées en Kfz. 305.', '10 Juillet 1943', '2025-01-15'),
('Richter', 'Hans', NULL, 2, 15, 'Contrôle / Patrouille', '1919-04-12', 'Stuttgart', 'Allemande', 176, 'Kar98k', 'Matraque', 'Wachtmeister chargé des contrôles routiers et de la gestion des prisonniers de guerre.', '1 Janvier 1944', '2025-02-20');

-- 916S. Sanitäts-abteilung (unite_id=3)
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, specialite, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, historique, date_entree_ig, date_entree_irl) VALUES
('Der Erlkönig', 'Ernest', NULL, 3, 18, 'Chirurgie / Commandement médical', '1900-12-01', 'Wien', 'Autrichienne', 177, 'Walther P38', 'Oberstabsarzt et Kommandeur du Sanitäts-abteilung. Médecin militaire chevronné, assistance physique et mentale aux troupes.', '1 Mai 1943', '2025-01-05'),
('Elséeune', 'Bert', NULL, 3, 19, 'Médecine générale', '1907-06-15', 'Zürich', 'Suisse', 173, NULL, 'Oberarzt adjoint. Spécialiste en médecine de terrain. Responsable du triage des blessés.', '15 Juin 1943', '2025-01-12');

-- 001. Marine Pionier Bataillon (unite_id=4)
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, specialite, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, historique, date_entree_ig, date_entree_irl) VALUES
('Vander', 'Alarak', NULL, 4, 23, 'Commandement naval / Génie', '1903-08-20', 'Kiel', 'Allemande', 184, 'Walther P38', 'Kapitänleutnant et Kommandeur du 001. Marine Pionier Bataillon. Expert en fortifications côtières et opérations amphibies.', '20 Avril 1943', '2025-01-08'),
('Wittmann', 'Karl', NULL, 4, 24, 'Génie naval', '1911-02-14', 'Rostock', 'Allemande', 179, 'MP40', 'Oberleutnant zur See. Spécialiste déminage et construction de défenses portuaires.', '1 Août 1943', '2025-01-18');

-- 130. Panzer Lehr (unite_id=6)
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, specialite, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, historique, date_entree_ig, date_entree_irl) VALUES
('Hönigsberg', 'Ernst', NULL, 6, 36, 'Commandement blindé', '1902-04-05', 'Nürnberg', 'Allemande', 181, 'Walther P38', 'Kommandeur de la 130. Panzer Lehr. Également ancien commandeur du 002. Panzer Regiment "Das Reich". Victoire contre le 2ème Régiment blindé US Army en été 1944.', '1 Mars 1943', '2025-01-01'),
('Von Richtofen', 'Ernst', NULL, 6, 38, 'Pilotage blindé', '1916-10-30', 'Augsburg', 'Allemande', 174, 'MP40', 'Kommandeur adjoint. Ltn. spécialisé en tactiques blindées et manœuvres d''encerclement.', '15 Mai 1943', '2025-01-25');

-- 009. Fallschirmjäger Regiment (unite_id=7)
INSERT INTO effectifs (nom, prenom, surnom, unite_id, grade_id, specialite, date_naissance, lieu_naissance, nationalite, taille_cm, arme_principale, arme_secondaire, historique, date_entree_ig, date_entree_irl) VALUES
('Urkane', 'Markus', NULL, 7, 41, 'Commandement parachutiste', '1909-11-11', 'Leipzig', 'Allemande', 183, 'FG42', 'Walther P38', 'Kommandeur du 009. Fallschirmjäger Regiment. Vétéran de Crète et de Monte Cassino. Parachuté en Normandie.', '10 Février 1943', '2025-01-03');

-- ============================================================================
-- RAPPORTS DE TEST
-- ============================================================================

-- Rapport standard
INSERT INTO rapports (type, titre, auteur_nom, personne_renseignee_nom, unite_id, contexte, resume, bilan, remarques, signature_nom, signature_grade, date_rp, date_irl) VALUES
('rapport', 'Rapport de patrouille - Secteur côtier Omaha', 'Oltn. Manfred Wurst', 'Stabsgefreiter Friedrich Von Krieg', 1, 'Patrouille de routine le long du secteur côtier assigné au 916. Grenadier Regiment. Inspection des fortifications et bunkers du mur de l''Atlantique.', 'La patrouille s''est déroulée sans incident majeur. Les fortifications du secteur B-3 sont en bon état. Deux casemates nécessitent des réparations mineures au niveau de l''étanchéité. Les fils barbelés du secteur B-5 ont été endommagés par la marée.', 'Secteur opérationnel. Demande de matériel pour réparations envoyée à la 919e Logistik. Effectifs suffisants pour maintenir la surveillance.', 'Renforcer les patrouilles nocturnes suite à des signalements d''activité de résistance dans les villages alentours.', 'Manfred Wurst', 'Oberleutnant', '12 Mai 1944', '2025-04-15'),

-- Recommandation
('recommandation', 'Recommandation pour promotion - Gefreiter Braun', 'Ltn. Miller Hermantraut', NULL, 1, NULL, NULL, NULL, NULL, 'Miller Hermantraut', 'Leutnant', '20 Mai 1944', '2025-05-01'),

-- Incident
('incident', 'Incident disciplinaire - Altercation au mess', 'Haupt. Jean Muller', NULL, 2, NULL, NULL, NULL, NULL, 'Jean Muller', 'Hauptmann', '8 Juin 1944', '2025-05-20'),

-- Rapport médical
('rapport', 'Rapport sanitaire hebdomadaire - Semaine 22', 'Ostaz. Ernest Der Erlkönig', NULL, 3, 'Bilan sanitaire hebdomadaire du Sanitäts-abteilung pour l''ensemble des unités du 7ème Corps d''Armée.', '14 consultations cette semaine. 3 blessures légères en entraînement, 2 cas de fièvre, 1 entorse. Aucune évacuation nécessaire. Stocks de morphine et pansements à renouveler.', 'État sanitaire général satisfaisant. Moral des troupes correct malgré les conditions d''hébergement.', 'Demande de réapprovisionnement en sulfamides et bandages envoyée au commandement.', 'Ernest Der Erlkönig', 'Oberstabsarzt', '1 Juin 1944', '2025-06-01'),

-- Rapport Marine Pionier
('rapport', 'Rapport d''inspection - Défenses portuaires', 'Kplt. Alarak Vander', 'Olzs. Karl Wittmann', 4, 'Inspection des défenses portuaires et obstacles anti-débarquement installés par le 001. Marine Pionier Bataillon.', 'Les obstacles de plage (hérissons tchèques et tétraèdres) sont en place sur 85% du secteur assigné. Les mines aquatiques ont été posées selon le plan. Deux lance-torpilles fixes nécessitent une révision.', 'Le dispositif défensif est opérationnel à 90%. Délai estimé pour complétion totale: 2 semaines.', NULL, 'Alarak Vander', 'Kapitänleutnant', '25 Mai 1944', '2025-05-25'),

-- Recommandation Panzer
('recommandation', 'Recommandation au mérite - Engagement blindé de Falaise', 'Maj. Ernst Hönigsberg', NULL, 6, NULL, NULL, NULL, NULL, 'Ernst Hönigsberg', 'Major', '15 Juillet 1944', '2025-07-15'),

-- Incident Fallschirmjäger
('incident', 'Incident opérationnel - Largage raté secteur Nord', 'Haupt. Markus Urkane', NULL, 7, NULL, NULL, NULL, NULL, 'Markus Urkane', 'Hauptmann', '6 Juin 1944', '2025-06-06');

-- Remplir les champs spécifiques pour la recommandation
UPDATE rapports SET 
  recommande_nom = 'Heinrich Braun',
  recommande_grade = 'Gefreiter',
  recommande_unite = '916. Grenadier Regiment',
  raison_1 = 'Comportement exemplaire lors des exercices de défense côtière. A fait preuve d''initiative et de courage.',
  recompense = 'Promotion au grade d''Obergefreiter'
WHERE titre = 'Recommandation pour promotion - Gefreiter Braun';

-- Remplir les champs spécifiques pour les incidents
UPDATE rapports SET
  intro_nom = 'Jean Muller',
  intro_grade = 'Hauptmann',
  intro_fonction = 'Kommandeur',
  intro_unite = '254. Feldgendarmerie',
  lieu_incident = 'Mess des officiers - Quartier général',
  mise_en_cause_nom = 'Soldat inconnu (916. Gren.)',
  mise_en_cause_grade = 'Gefreiter',
  compte_rendu = 'À 21h30, une altercation a éclaté au mess entre deux soldats du 916. Grenadier Regiment. L''un des protagonistes a été identifié, l''autre a pris la fuite. Intervention de la Feldgendarmerie pour rétablir l''ordre. Aucun blessé grave. Enquête en cours.'
WHERE titre = 'Incident disciplinaire - Altercation au mess';

UPDATE rapports SET
  intro_nom = 'Markus Urkane',
  intro_grade = 'Hauptmann',
  intro_fonction = 'Kommandeur',
  intro_unite = '009. Fallschirmjäger Regiment',
  lieu_incident = 'Zone de largage Nord - Secteur Sainte-Mère-Église',
  mise_en_cause_nom = 'Équipage Ju 52 n°347',
  compte_rendu = 'Lors de l''opération de largage nocturne, le Ju 52 transportant le 2ème groupe a dévié de sa trajectoire suite à un tir de DCA allié. Les parachutistes ont été largués 3km au sud de la zone prévue, en territoire hostile. Regroupement effectué sous le feu. 2 blessés légers, aucune perte.'
WHERE titre = 'Incident opérationnel - Largage raté secteur Nord';

-- Mettre à jour la recommandation Panzer
UPDATE rapports SET
  recommande_nom = 'Ernst Von Richtofen',
  recommande_grade = 'Leutnant',
  recommande_unite = '130. Panzer Lehr',
  raison_1 = 'Engagement héroïque lors de la bataille de Falaise. A détruit 3 chars Sherman ennemis avec son Panzer IV malgré une infériorité numérique de 1 contre 5.',
  recompense = 'Croix de fer 2ème classe et recommandation pour le grade d''Oberleutnant'
WHERE titre = 'Recommandation au mérite - Engagement blindé de Falaise';
