-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: 172.17.0.1    Database: archives7e
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` int DEFAULT NULL,
  `details` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_user` (`user_id`),
  KEY `idx_log_action` (`action`),
  KEY `idx_log_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `affaire_layouts`
--

DROP TABLE IF EXISTS `affaire_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `affaire_layouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `affaire_id` int NOT NULL,
  `layout_json` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `affaire_id` (`affaire_id`),
  CONSTRAINT `affaire_layouts_ibfk_1` FOREIGN KEY (`affaire_id`) REFERENCES `affaires` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affaire_layouts`
--

LOCK TABLES `affaire_layouts` WRITE;
/*!40000 ALTER TABLE `affaire_layouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `affaire_layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `affaires`
--

DROP TABLE IF EXISTS `affaires`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `affaires` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AFF-YYYY-NNN',
  `titre` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('Enquete','Proces','Disciplinaire','Administrative') COLLATE utf8mb4_unicode_ci DEFAULT 'Enquete',
  `statut` enum('Ouverte','En cours','Audience','Jugee','Classee','Appel') COLLATE utf8mb4_unicode_ci DEFAULT 'Ouverte',
  `gravite` int DEFAULT '1' COMMENT '1-5 groupe',
  `resume` text COLLATE utf8mb4_unicode_ci,
  `date_ouverture_rp` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_ouverture_irl` date DEFAULT NULL,
  `date_cloture_rp` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_cloture_irl` date DEFAULT NULL,
  `lieu` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verdict` text COLLATE utf8mb4_unicode_ci,
  `sanction_prononcee` text COLLATE utf8mb4_unicode_ci,
  `notes_internes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_statut` (`statut`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affaires`
--

LOCK TABLES `affaires` WRITE;
/*!40000 ALTER TABLE `affaires` DISABLE KEYS */;
/*!40000 ALTER TABLE `affaires` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `affaires_personnes`
--

DROP TABLE IF EXISTS `affaires_personnes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `affaires_personnes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `affaire_id` int NOT NULL,
  `effectif_id` int DEFAULT NULL,
  `nom_libre` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'si pas en DB',
  `role` enum('Accuse','Temoin','Victime','Enqueteur','Juge','Defenseur') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `effectif_id` (`effectif_id`),
  KEY `idx_affaire` (`affaire_id`),
  CONSTRAINT `affaires_personnes_ibfk_1` FOREIGN KEY (`affaire_id`) REFERENCES `affaires` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affaires_personnes_ibfk_2` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affaires_personnes`
--

LOCK TABLES `affaires_personnes` WRITE;
/*!40000 ALTER TABLE `affaires_personnes` DISABLE KEYS */;
/*!40000 ALTER TABLE `affaires_personnes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `affaires_pieces`
--

DROP TABLE IF EXISTS `affaires_pieces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `affaires_pieces` (
  `id` int NOT NULL AUTO_INCREMENT,
  `affaire_id` int NOT NULL,
  `type` enum('Proces-verbal','Temoignage','Decision','Rapport-infraction','Piece-a-conviction','Requisitoire','Note-interne','Autre') COLLATE utf8mb4_unicode_ci NOT NULL,
  `titre` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenu` longtext COLLATE utf8mb4_unicode_ci,
  `date_rp` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_irl` date DEFAULT NULL,
  `redige_par` int DEFAULT NULL,
  `redige_par_nom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `infraction_id` int DEFAULT NULL COMMENT 'FK infractions if applicable',
  `infraction_custom` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confidentiel` tinyint(1) DEFAULT '0',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `infraction_id` (`infraction_id`),
  KEY `idx_affaire` (`affaire_id`),
  CONSTRAINT `affaires_pieces_ibfk_1` FOREIGN KEY (`affaire_id`) REFERENCES `affaires` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affaires_pieces_ibfk_2` FOREIGN KEY (`infraction_id`) REFERENCES `infractions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affaires_pieces`
--

LOCK TABLES `affaires_pieces` WRITE;
/*!40000 ALTER TABLE `affaires_pieces` DISABLE KEYS */;
/*!40000 ALTER TABLE `affaires_pieces` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `affaires_signatures`
--

DROP TABLE IF EXISTS `affaires_signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `affaires_signatures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `piece_id` int NOT NULL,
  `effectif_id` int DEFAULT NULL,
  `nom_signataire` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_signataire` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ex: Enqueteur, Temoin, Juge',
  `signe` tinyint(1) DEFAULT '0',
  `signature_data` longtext COLLATE utf8mb4_unicode_ci COMMENT 'base64 du canvas signature',
  `date_signature` timestamp NULL DEFAULT NULL,
  `telegramme_envoye` tinyint(1) DEFAULT '0',
  `telegramme_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `effectif_id` (`effectif_id`),
  KEY `idx_piece` (`piece_id`),
  CONSTRAINT `affaires_signatures_ibfk_1` FOREIGN KEY (`piece_id`) REFERENCES `affaires_pieces` (`id`) ON DELETE CASCADE,
  CONSTRAINT `affaires_signatures_ibfk_2` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `affaires_signatures`
--

LOCK TABLES `affaires_signatures` WRITE;
/*!40000 ALTER TABLE `affaires_signatures` DISABLE KEYS */;
/*!40000 ALTER TABLE `affaires_signatures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bibliotheque`
--

DROP TABLE IF EXISTS `bibliotheque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bibliotheque` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('tampon','signature','template') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tampon',
  `nom` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unite_id` int DEFAULT NULL,
  `image_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `unite_id` (`unite_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `bibliotheque_ibfk_1` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bibliotheque_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bibliotheque`
--

LOCK TABLES `bibliotheque` WRITE;
/*!40000 ALTER TABLE `bibliotheque` DISABLE KEYS */;
/*!40000 ALTER TABLE `bibliotheque` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calendrier`
--

DROP TABLE IF EXISTS `calendrier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendrier` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titre` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date_debut` datetime NOT NULL,
  `date_fin` datetime DEFAULT NULL,
  `type` enum('ceremonie','operation','inspection','permission','reunion','autre') COLLATE utf8mb4_unicode_ci DEFAULT 'autre',
  `unite_id` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `unite_id` (`unite_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `calendrier_ibfk_1` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE SET NULL,
  CONSTRAINT `calendrier_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendrier`
--

LOCK TABLES `calendrier` WRITE;
/*!40000 ALTER TABLE `calendrier` DISABLE KEYS */;
/*!40000 ALTER TABLE `calendrier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `decorations`
--

DROP TABLE IF EXISTS `decorations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `decorations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_allemand` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categorie` enum('Croix','Insigne','Agrafe','Medaille','Autre') COLLATE utf8mb4_unicode_ci DEFAULT 'Autre',
  `rang` int DEFAULT '0',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `decorations`
--

LOCK TABLES `decorations` WRITE;
/*!40000 ALTER TABLE `decorations` DISABLE KEYS */;
INSERT INTO `decorations` VALUES (1,'Croix de fer de 2e classe','Eisernes Kreuz 2. Klasse','Croix',10,NULL,NULL),(2,'Croix de fer de 1ere classe','Eisernes Kreuz 1. Klasse','Croix',20,NULL,NULL),(3,'Croix de chevalier','Ritterkreuz','Croix',30,NULL,NULL),(4,'Insigne de combat d\'infanterie en bronze','Infanterie-Sturmabzeichen in Bronze','Insigne',5,NULL,NULL),(5,'Insigne de combat d\'infanterie en argent','Infanterie-Sturmabzeichen in Silber','Insigne',8,NULL,NULL),(6,'Insigne de combat general','Allgemeines Sturmabzeichen','Insigne',6,NULL,NULL),(7,'Agrafe de combat rapproche en bronze','Nahkampfspange in Bronze','Agrafe',12,NULL,NULL),(8,'Agrafe de combat rapproche en argent','Nahkampfspange in Silber','Agrafe',15,NULL,NULL),(9,'Agrafe de combat rapproche en or','Nahkampfspange in Gold','Agrafe',18,NULL,NULL),(10,'Insigne des blesses en noir','Verwundetenabzeichen in Schwarz','Insigne',3,NULL,NULL),(11,'Insigne des blesses en argent','Verwundetenabzeichen in Silber','Insigne',4,NULL,NULL),(12,'Insigne des blesses en or','Verwundetenabzeichen in Gold','Insigne',7,NULL,NULL),(13,'Medaille du front de l\'Est','Medaille Winterschlacht im Osten','Medaille',2,NULL,NULL),(14,'Croix du merite de guerre','Kriegsverdienstkreuz','Croix',9,NULL,NULL),(15,'Insigne de destruction de char','Sonderabzeichen fuer das Niederkampfen','Insigne',11,NULL,NULL),(16,'Croix allemande en or',NULL,'Autre',0,NULL,'Distinction intermediaire entre Croix de fer 1ere classe et Croix de chevalier'),(17,'Croix de chevalier avec feuilles de chene',NULL,'Autre',0,NULL,'Distinction superieure a la Croix de chevalier'),(18,'Insigne de combat de chars en bronze',NULL,'Autre',0,NULL,'Attribuee aux equipages de Panzer pour engagements'),(19,'Insigne de combat de chars en argent',NULL,'Autre',0,NULL,'Distinction superieure pour equipages de Panzer'),(20,'Medaille de service de longue duree',NULL,'Autre',0,NULL,'Pour service prolonge dans la Wehrmacht'),(21,'Insigne de combat rapproche de la Feldgendarmerie',NULL,'Autre',0,NULL,'Distinction de la police militaire'),(22,'Insigne de parachutiste',NULL,'Autre',0,NULL,'Decernee aux Fallschirmjaeger qualifies'),(23,'Insigne de pionnier',NULL,'Autre',0,NULL,'Pour actions de genie et combat de pionniers'),(24,'Brassard de Sanitaeter',NULL,'Autre',0,NULL,'Distinction du personnel medical'),(25,'Citation a l ordre du jour',NULL,'Autre',0,NULL,'Mention honorable pour bravoure au combat'),(26,'Medaille de la campagne de Normandie',NULL,'Autre',0,NULL,'Pour participation aux operations en Normandie');
/*!40000 ALTER TABLE `decorations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentation`
--

DROP TABLE IF EXISTS `documentation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `repertoire_id` int DEFAULT NULL,
  `titre` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categorie` enum('Reglement','Procedure','Formation','Lore','Outil','Autre') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Autre',
  `ordre` int DEFAULT '0',
  `visible` tinyint(1) DEFAULT '1',
  `statut` enum('approuve','en_attente','refuse') COLLATE utf8mb4_unicode_ci DEFAULT 'approuve',
  `is_repertoire` tinyint(1) DEFAULT '0',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_doc_repertoire` (`repertoire_id`),
  KEY `idx_doc_statut` (`statut`),
  CONSTRAINT `documentation_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentation`
--

LOCK TABLES `documentation` WRITE;
/*!40000 ALTER TABLE `documentation` DISABLE KEYS */;
INSERT INTO `documentation` VALUES (1,NULL,'Règlement intérieur du serveur','Règles de conduite RP et HRP','https://reglements.labaguetterp.fr/','Reglement',0,1,'approuve',0,1,'2026-02-13 07:45:47'),(2,NULL,'Procédure de recensement','Comment intégrer un nouveau soldat',NULL,'Procedure',0,1,'approuve',0,1,'2026-02-13 07:45:47'),(3,NULL,'Guide du sous-officier','Responsabilités et devoirs des SO',NULL,'Formation',0,1,'approuve',0,1,'2026-02-13 07:45:47'),(4,NULL,'Règlement intérieur du 916e Grenadier','Document test pour validation','https://docs.google.com/document/d/test-reglement','Autre',0,1,'approuve',0,1,'2026-02-14 14:50:00'),(5,NULL,'Manuel Panzerfaust Mod 60','Formation utilisation Panzerfaust','https://docs.google.com/document/d/test-panzerfaust','Formation',0,1,'approuve',0,2,'2026-02-14 14:52:52');
/*!40000 ALTER TABLE `documentation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dossier_entrees`
--

DROP TABLE IF EXISTS `dossier_entrees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dossier_entrees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dossier_id` int NOT NULL,
  `type` enum('note','document','image','rapport_lien','interdit_lien','medical_lien') COLLATE utf8mb4_unicode_ci DEFAULT 'note',
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contenu` text COLLATE utf8mb4_unicode_ci,
  `fichier_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `date_rp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entree_dossier` (`dossier_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `dossier_entrees_ibfk_1` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dossier_entrees_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dossier_entrees`
--

LOCK TABLES `dossier_entrees` WRITE;
/*!40000 ALTER TABLE `dossier_entrees` DISABLE KEYS */;
/*!40000 ALTER TABLE `dossier_entrees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dossier_layouts`
--

DROP TABLE IF EXISTS `dossier_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dossier_layouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dossier_id` int NOT NULL,
  `layout_json` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dossier_id` (`dossier_id`),
  CONSTRAINT `dossier_layouts_ibfk_1` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dossier_layouts`
--

LOCK TABLES `dossier_layouts` WRITE;
/*!40000 ALTER TABLE `dossier_layouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `dossier_layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dossiers`
--

DROP TABLE IF EXISTS `dossiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dossiers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int DEFAULT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('personnel','thematique','enquete','autre') COLLATE utf8mb4_unicode_ci DEFAULT 'personnel',
  `description` text COLLATE utf8mb4_unicode_ci,
  `visibilite` enum('public','prive','lien') COLLATE utf8mb4_unicode_ci DEFAULT 'public',
  `access_group` enum('tous','officier','sous_officier','militaire') COLLATE utf8mb4_unicode_ci DEFAULT 'tous',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dossier_effectif` (`effectif_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `dossiers_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dossiers_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dossiers`
--

LOCK TABLES `dossiers` WRITE;
/*!40000 ALTER TABLE `dossiers` DISABLE KEYS */;
/*!40000 ALTER TABLE `dossiers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `effectif_decorations`
--

DROP TABLE IF EXISTS `effectif_decorations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `effectif_decorations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `decoration_id` int DEFAULT NULL,
  `nom_custom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_attribution` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attribue_par` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motif` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eff_deco` (`effectif_id`),
  CONSTRAINT `effectif_decorations_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `effectif_decorations`
--

LOCK TABLES `effectif_decorations` WRITE;
/*!40000 ALTER TABLE `effectif_decorations` DISABLE KEYS */;
/*!40000 ALTER TABLE `effectif_decorations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `effectif_historique`
--

DROP TABLE IF EXISTS `effectif_historique`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `effectif_historique` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_evenement` datetime DEFAULT CURRENT_TIMESTAMP,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `effectif_id` (`effectif_id`),
  CONSTRAINT `effectif_historique_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `effectif_historique`
--

LOCK TABLES `effectif_historique` WRITE;
/*!40000 ALTER TABLE `effectif_historique` DISABLE KEYS */;
/*!40000 ALTER TABLE `effectif_historique` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `effectif_layouts`
--

DROP TABLE IF EXISTS `effectif_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `effectif_layouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `layout_json` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `effectif_id` (`effectif_id`),
  CONSTRAINT `effectif_layouts_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `effectif_layouts`
--

LOCK TABLES `effectif_layouts` WRITE;
/*!40000 ALTER TABLE `effectif_layouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `effectif_layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `effectifs`
--

DROP TABLE IF EXISTS `effectifs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `effectifs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `surnom` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unite_id` int DEFAULT NULL,
  `grade_id` int DEFAULT NULL,
  `specialite` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fonction` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categorie` enum('Officier','Sous-officier','Militaire du rang') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_naissance` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_naissance` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationalite` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Allemande',
  `taille_cm` int DEFAULT NULL,
  `photo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `arme_principale` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `arme_secondaire` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipement_special` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `historique` text COLLATE utf8mb4_unicode_ci,
  `decorations` text COLLATE utf8mb4_unicode_ci,
  `sanctions` text COLLATE utf8mb4_unicode_ci,
  `signature_soldat` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_referent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stamp_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_entree_ig` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_entree_irl` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qualification_id` int DEFAULT NULL,
  `actif` enum('Actif','Inactif','Reserviste','MIA','KIA') COLLATE utf8mb4_unicode_ci DEFAULT 'Actif',
  `discord_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `en_reserve` tinyint(1) DEFAULT '0',
  `unite_origine_id` int DEFAULT NULL,
  `grade_origine_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `unite_id` (`unite_id`),
  KEY `grade_id` (`grade_id`),
  CONSTRAINT `effectifs_ibfk_1` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE SET NULL,
  CONSTRAINT `effectifs_ibfk_2` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `effectifs`
--

LOCK TABLES `effectifs` WRITE;
/*!40000 ALTER TABLE `effectifs` DISABLE KEYS */;
INSERT INTO `effectifs` VALUES (53,'Zussman','Siegfried','Le pionnier',1,9,'Pionnier',NULL,'Militaire du rang','1920-02-02','Koenigsberg','Allemande',180,'/uploads/images/media-690a19cb45a24-1770975396987-6367456.jpg','STG44','Luger P08','Couteau de tranchee, pelle, marteau, mines, pieux','Uniforme du 916. Grenadier Regiment, Pionniers','1940-1942: Engagement volontaire a 20 ans dans la Wehrmacht. Affecte a la 916. Infanterie-Regiment.\n1942-1943: Affecte temporairement a l Est. Retour a l Ouest: reconnu pour ses competences en construction de fortifications.\n1944: Promotion Unterfeldwebel. Creation de la Compagnie Z, unite pionniere specialisee. Interventions a Omaha, Coutance, Falaise, Sainte-Marie.\nDecembre 1944: Demission volontaire du grade. Dissolution de la Compagnie Z. Retour dans les rangs reguliers.',NULL,NULL,'/assets/stamps/signzuss.png',NULL,'/assets/stamps/tempon916.png','1940-07-15','2024-07-15',NULL,'Actif','385861981833396225','2026-02-13 09:36:31','2026-02-13 09:36:53',0,NULL,NULL);
/*!40000 ALTER TABLE `effectifs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `galerie`
--

DROP TABLE IF EXISTS `galerie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `galerie` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unite_id` int DEFAULT NULL,
  `titre` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `approuve` tinyint(1) DEFAULT '0',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `unite_id` (`unite_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `galerie_ibfk_1` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE SET NULL,
  CONSTRAINT `galerie_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `galerie`
--

LOCK TABLES `galerie` WRITE;
/*!40000 ALTER TABLE `galerie` DISABLE KEYS */;
/*!40000 ALTER TABLE `galerie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gazettes`
--

DROP TABLE IF EXISTS `gazettes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gazettes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero` int NOT NULL,
  `semaine` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titre` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contenu` longtext COLLATE utf8mb4_unicode_ci,
  `published` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gazettes`
--

LOCK TABLES `gazettes` WRITE;
/*!40000 ALTER TABLE `gazettes` DISABLE KEYS */;
/*!40000 ALTER TABLE `gazettes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grades`
--

DROP TABLE IF EXISTS `grades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unite_id` int NOT NULL,
  `nom_complet` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rang` int DEFAULT '0',
  `categorie` enum('Officier','Sous-officier','Militaire du rang') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `unite_id` (`unite_id`),
  CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grades`
--

LOCK TABLES `grades` WRITE;
/*!40000 ALTER TABLE `grades` DISABLE KEYS */;
INSERT INTO `grades` VALUES (1,1,'Oberst',100,'Officier','2026-02-12 22:19:16'),(2,1,'Major',90,'Officier','2026-02-12 22:19:16'),(3,1,'Hauptmann',80,'Officier','2026-02-12 22:19:16'),(4,1,'Oberleutnant',70,'Officier','2026-02-12 22:19:16'),(5,1,'Leutnant',60,'Officier','2026-02-12 22:19:16'),(6,1,'Oberfeldwebel',55,'Sous-officier','2026-02-12 22:19:16'),(7,1,'Feldwebel',50,'Sous-officier','2026-02-12 22:19:16'),(8,1,'Unterfeldwebel',45,'Sous-officier','2026-02-12 22:19:16'),(9,1,'Stabsgefreiter',30,'Sous-officier','2026-02-12 22:19:16'),(10,1,'Obergefreiter',30,'Militaire du rang','2026-02-12 22:19:16'),(11,1,'Gefreiter',20,'Militaire du rang','2026-02-12 22:19:16'),(13,2,'Oberst',100,'Officier','2026-02-12 22:19:16'),(14,2,'Major',90,'Officier','2026-02-12 22:19:16'),(15,2,'Hauptmann',80,'Officier','2026-02-12 22:19:16'),(16,2,'Oberleutnant',70,'Officier','2026-02-12 22:19:16'),(17,2,'Leutnant',60,'Officier','2026-02-12 22:19:16'),(18,2,'Stabsfeldwebel',50,'Sous-officier','2026-02-12 22:19:16'),(19,2,'Feldwebel',42,'Sous-officier','2026-02-12 22:19:16'),(20,2,'Oberfeldwebel',45,'Sous-officier','2026-02-12 22:19:16'),(21,2,'Gefreiter',20,'Militaire du rang','2026-02-12 22:19:16'),(23,3,'Oberstabsarzt',100,'Officier','2026-02-12 22:19:16'),(24,3,'Stabsarzt',90,'Officier','2026-02-12 22:19:16'),(25,3,'Oberarzt',80,'Officier','2026-02-12 22:19:16'),(26,3,'Assistenzarzt',60,'Officier','2026-02-12 22:19:16'),(27,3,'Sanitaetsfeldwebel',50,'Sous-officier','2026-02-12 22:19:16'),(28,3,'Sanitaetsunteroffizier',40,'Sous-officier','2026-02-12 22:19:16'),(29,3,'Sanitaetsobergefreiter',30,'Militaire du rang','2026-02-12 22:19:16'),(30,3,'Sanitaetsgefreiter',20,'Militaire du rang','2026-02-12 22:19:16'),(31,3,'Sanitaetssoldat',10,'Militaire du rang','2026-02-12 22:19:16'),(32,4,'Korvettenkapitaen',100,'Officier','2026-02-12 22:19:16'),(33,4,'Kapitaenleutnant',80,'Officier','2026-02-12 22:19:16'),(34,4,'Oberleutnant zur See',70,'Officier','2026-02-12 22:19:16'),(35,4,'Leutnant zur See',60,'Officier','2026-02-12 22:19:16'),(36,4,'Oberbootsmann',50,'Sous-officier','2026-02-12 22:19:16'),(37,4,'Bootsmann',40,'Sous-officier','2026-02-12 22:19:16'),(38,4,'Obermatrose',30,'Militaire du rang','2026-02-12 22:19:16'),(39,4,'Matrose',10,'Militaire du rang','2026-02-12 22:19:16'),(40,5,'Oberst',100,'Officier','2026-02-12 22:19:16'),(41,5,'Major',90,'Officier','2026-02-12 22:19:16'),(42,5,'Hauptmann',80,'Officier','2026-02-12 22:19:16'),(43,5,'Oberleutnant',70,'Officier','2026-02-12 22:19:16'),(44,5,'Leutnant',60,'Officier','2026-02-12 22:19:16'),(45,5,'Feldwebel',50,'Sous-officier','2026-02-12 22:19:16'),(46,5,'Unteroffizier',40,'Sous-officier','2026-02-12 22:19:16'),(47,5,'Obergefreiter',30,'Militaire du rang','2026-02-12 22:19:16'),(48,5,'Gefreiter',20,'Militaire du rang','2026-02-12 22:19:16'),(49,5,'Versorgungssoldat',10,'Militaire du rang','2026-02-12 22:19:16'),(50,6,'Oberst',100,'Officier','2026-02-12 22:19:16'),(51,6,'Major',90,'Officier','2026-02-12 22:19:16'),(52,6,'Hauptmann',80,'Officier','2026-02-12 22:19:16'),(53,6,'Oberleutnant',70,'Officier','2026-02-12 22:19:16'),(54,6,'Leutnant',60,'Officier','2026-02-12 22:19:16'),(55,6,'Feldwebel',50,'Sous-officier','2026-02-12 22:19:16'),(56,6,'Unteroffizier',40,'Sous-officier','2026-02-12 22:19:16'),(57,6,'Oberjaeger',35,'Sous-officier','2026-02-12 22:19:16'),(58,6,'Jaeger',30,'Militaire du rang','2026-02-12 22:19:16'),(59,6,'Gefreiter',20,'Militaire du rang','2026-02-12 22:19:16'),(60,6,'Panzerschuetze',10,'Militaire du rang','2026-02-12 22:19:16'),(61,7,'Oberst',100,'Officier','2026-02-12 22:19:16'),(62,7,'Major',90,'Officier','2026-02-12 22:19:16'),(63,7,'Hauptmann',80,'Officier','2026-02-12 22:19:16'),(64,7,'Oberleutnant',70,'Officier','2026-02-12 22:19:16'),(65,7,'Leutnant',60,'Officier','2026-02-12 22:19:16'),(66,7,'Oberfeldwebel',55,'Sous-officier','2026-02-12 22:19:16'),(67,7,'Feldwebel',50,'Sous-officier','2026-02-12 22:19:16'),(68,7,'Unteroffizier',40,'Sous-officier','2026-02-12 22:19:16'),(69,7,'Oberjaeger',35,'Sous-officier','2026-02-12 22:19:16'),(70,7,'Jaeger',30,'Militaire du rang','2026-02-12 22:19:16'),(71,7,'Gefreiter',20,'Militaire du rang','2026-02-12 22:19:16'),(72,7,'Fallschirmsoldat',10,'Militaire du rang','2026-02-12 22:19:16'),(73,1,'Oberschuetze',15,'Militaire du rang','2026-02-12 23:11:53'),(74,1,'Schuetze',5,'Militaire du rang','2026-02-12 23:11:53'),(75,2,'Oberschuetze',15,'Militaire du rang','2026-02-12 23:11:53'),(76,2,'Schuetze',5,'Militaire du rang','2026-02-12 23:11:53'),(77,5,'Oberschuetze',15,'Militaire du rang','2026-02-12 23:11:53'),(78,5,'Schuetze',5,'Militaire du rang','2026-02-12 23:11:53'),(79,6,'Oberschuetze',15,'Militaire du rang','2026-02-12 23:11:53'),(80,6,'Schuetze',5,'Militaire du rang','2026-02-12 23:11:53'),(81,7,'Oberschuetze',15,'Militaire du rang','2026-02-12 23:11:53'),(82,7,'Schuetze',5,'Militaire du rang','2026-02-12 23:11:53'),(83,1,'Unteroffizier',42,'Sous-officier','2026-02-12 23:21:32'),(84,1,'Oberstleutnant',95,'Officier','2026-02-12 23:46:04'),(85,1,'Stabsfeldwebel',52,'Sous-officier','2026-02-12 23:46:04'),(86,2,'Unterfeldwebel',40,'Sous-officier','2026-02-12 23:46:04'),(87,2,'Unteroffizier',35,'Sous-officier','2026-02-12 23:46:04'),(88,2,'Oberfeldwebel',45,'Sous-officier','2026-02-12 23:46:04'),(89,2,'Stabsgefreiter',30,'Militaire du rang','2026-02-12 23:46:04'),(90,2,'Obergefreiter',25,'Militaire du rang','2026-02-12 23:46:04'),(91,2,'Oberschuetze',15,'Militaire du rang','2026-02-12 23:46:04'),(92,2,'Feldgendarme',8,'Militaire du rang','2026-02-12 23:46:04'),(93,2,'Feldobergendarme',12,'Militaire du rang','2026-02-12 23:46:04'),(94,1,'Oberstleutnant',95,'Officier','2026-02-12 23:46:04'),(95,3,'Stabsfeldwebel',52,'Sous-officier','2026-02-12 23:46:04'),(96,4,'Stabsfeldwebel',52,'Sous-officier','2026-02-12 23:46:04'),(97,5,'Stabsfeldwebel',52,'Sous-officier','2026-02-12 23:46:04'),(98,5,'Oberfeldwebel',45,'Sous-officier','2026-02-12 23:46:04'),(99,6,'Stabsfeldwebel',52,'Sous-officier','2026-02-12 23:46:04'),(100,6,'Oberfeldwebel',45,'Sous-officier','2026-02-12 23:46:04'),(101,7,'Stabsfeldwebel',52,'Sous-officier','2026-02-12 23:46:04');
/*!40000 ALTER TABLE `grades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `groups`
--

LOCK TABLES `groups` WRITE;
/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
INSERT INTO `groups` VALUES (1,'Administration','2026-02-12 18:36:36'),(2,'Recenseur','2026-02-13 00:34:29'),(3,'Officier','2026-02-13 00:42:09'),(4,'Sous-officier','2026-02-13 14:02:31'),(5,'Feldgendarmerie','2026-02-13 14:02:31'),(6,'Sanitaets','2026-02-13 14:02:31'),(7,'Etat-Major','2026-02-14 18:03:09');
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `infractions`
--

DROP TABLE IF EXISTS `infractions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infractions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `groupe` int NOT NULL COMMENT '1=mineur, 5=capital',
  `groupe_recidive` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ex: 2 a 3 si recidive',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `infractions`
--

LOCK TABLES `infractions` WRITE;
/*!40000 ALTER TABLE `infractions` DISABLE KEYS */;
/*!40000 ALTER TABLE `infractions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `interdits_front`
--

DROP TABLE IF EXISTS `interdits_front`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interdits_front` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `motif` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('Disciplinaire','Medical','Administratif') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Disciplinaire',
  `date_debut` date NOT NULL,
  `date_fin` date DEFAULT NULL,
  `condition_fin` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ordonne_par` int NOT NULL,
  `leve_par` int DEFAULT NULL,
  `motif_levee` text COLLATE utf8mb4_unicode_ci,
  `date_levee` timestamp NULL DEFAULT NULL,
  `actif` tinyint(1) DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ordonne_par` (`ordonne_par`),
  KEY `leve_par` (`leve_par`),
  KEY `idx_effectif` (`effectif_id`),
  KEY `idx_actif` (`actif`),
  CONSTRAINT `interdits_front_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `interdits_front_ibfk_2` FOREIGN KEY (`ordonne_par`) REFERENCES `users` (`id`),
  CONSTRAINT `interdits_front_ibfk_3` FOREIGN KEY (`leve_par`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interdits_front`
--

LOCK TABLES `interdits_front` WRITE;
/*!40000 ALTER TABLE `interdits_front` DISABLE KEYS */;
/*!40000 ALTER TABLE `interdits_front` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal_articles`
--

DROP TABLE IF EXISTS `journal_articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal_articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titre` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sous_titre` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auteur_id` int DEFAULT NULL,
  `auteur_nom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contenu` longtext COLLATE utf8mb4_unicode_ci,
  `layout` json DEFAULT NULL,
  `statut` enum('brouillon','en_attente','publie','refuse') COLLATE utf8mb4_unicode_ci DEFAULT 'brouillon',
  `valide_par` int DEFAULT NULL,
  `valide_at` datetime DEFAULT NULL,
  `date_publication` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `auteur_id` (`auteur_id`),
  KEY `valide_par` (`valide_par`),
  CONSTRAINT `journal_articles_ibfk_1` FOREIGN KEY (`auteur_id`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `journal_articles_ibfk_2` FOREIGN KEY (`valide_par`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal_articles`
--

LOCK TABLES `journal_articles` WRITE;
/*!40000 ALTER TABLE `journal_articles` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal_articles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `media_uploads`
--

DROP TABLE IF EXISTS `media_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_uploads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int NOT NULL,
  `context_type` enum('document','dossier','rapport','medical','sanction') COLLATE utf8mb4_unicode_ci NOT NULL,
  `context_id` int DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `statut` enum('en_attente','approuve','refuse') COLLATE utf8mb4_unicode_ci DEFAULT 'en_attente',
  `moderated_by` int DEFAULT NULL,
  `moderated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_context` (`context_type`,`context_id`),
  KEY `idx_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media_uploads`
--

LOCK TABLES `media_uploads` WRITE;
/*!40000 ALTER TABLE `media_uploads` DISABLE KEYS */;
/*!40000 ALTER TABLE `media_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mentions`
--

DROP TABLE IF EXISTS `mentions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mentions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source_type` enum('rapport','interdit','medical','pds') COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_id` int NOT NULL,
  `champ` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_saisi` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `effectif_id` int DEFAULT NULL,
  `reconciled` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mentions_nom` (`nom_saisi`),
  KEY `idx_mentions_effectif` (`effectif_id`),
  KEY `idx_mentions_source` (`source_type`,`source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mentions`
--

LOCK TABLES `mentions` WRITE;
/*!40000 ALTER TABLE `mentions` DISABLE KEYS */;
/*!40000 ALTER TABLE `mentions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `moderation_queue`
--

DROP TABLE IF EXISTS `moderation_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `moderation_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('rapport','image','effectif') COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_id` int NOT NULL,
  `statut` enum('en_attente','approuve','refuse') COLLATE utf8mb4_unicode_ci DEFAULT 'en_attente',
  `soumis_par` int NOT NULL,
  `modere_par` int DEFAULT NULL,
  `raison_refus` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modere_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `soumis_par` (`soumis_par`),
  KEY `modere_par` (`modere_par`),
  KEY `idx_statut` (`statut`),
  KEY `idx_type` (`type`),
  CONSTRAINT `moderation_queue_ibfk_1` FOREIGN KEY (`soumis_par`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `moderation_queue_ibfk_2` FOREIGN KEY (`modere_par`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `moderation_queue`
--

LOCK TABLES `moderation_queue` WRITE;
/*!40000 ALTER TABLE `moderation_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `moderation_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notes_commandement`
--

DROP TABLE IF EXISTS `notes_commandement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes_commandement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contenu` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `auteur_id` int NOT NULL,
  `auteur_nom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinataire_id` int DEFAULT NULL,
  `prive` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `auteur_id` (`auteur_id`),
  CONSTRAINT `notes_commandement_ibfk_1` FOREIGN KEY (`auteur_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notes_commandement`
--

LOCK TABLES `notes_commandement` WRITE;
/*!40000 ALTER TABLE `notes_commandement` DISABLE KEYS */;
/*!40000 ALTER TABLE `notes_commandement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ordres`
--

DROP TABLE IF EXISTS `ordres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordres` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('ordre_du_jour','ordre_de_mission','directive','communique') COLLATE utf8mb4_unicode_ci DEFAULT 'ordre_du_jour',
  `titre` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenu` longtext COLLATE utf8mb4_unicode_ci,
  `unite_id` int DEFAULT NULL,
  `emis_par` int NOT NULL,
  `emis_par_nom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emis_par_grade` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_rp` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_irl` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `unite_id` (`unite_id`),
  KEY `emis_par` (`emis_par`),
  CONSTRAINT `ordres_ibfk_1` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ordres_ibfk_2` FOREIGN KEY (`emis_par`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ordres`
--

LOCK TABLES `ordres` WRITE;
/*!40000 ALTER TABLE `ordres` DISABLE KEYS */;
/*!40000 ALTER TABLE `ordres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ordres_accuses`
--

DROP TABLE IF EXISTS `ordres_accuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordres_accuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ordre_id` int NOT NULL,
  `effectif_id` int NOT NULL,
  `lu_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ordre_id` (`ordre_id`,`effectif_id`),
  KEY `effectif_id` (`effectif_id`),
  CONSTRAINT `ordres_accuses_ibfk_1` FOREIGN KEY (`ordre_id`) REFERENCES `ordres` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ordres_accuses_ibfk_2` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ordres_accuses`
--

LOCK TABLES `ordres_accuses` WRITE;
/*!40000 ALTER TABLE `ordres_accuses` DISABLE KEYS */;
/*!40000 ALTER TABLE `ordres_accuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organigramme`
--

DROP TABLE IF EXISTS `organigramme`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organigramme` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int DEFAULT NULL,
  `titre_poste` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `ordre` int DEFAULT '0',
  `unite_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `pos_x` int DEFAULT '0',
  `pos_y` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `effectif_id` (`effectif_id`),
  KEY `unite_id` (`unite_id`),
  CONSTRAINT `organigramme_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `organigramme_ibfk_2` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organigramme`
--

LOCK TABLES `organigramme` WRITE;
/*!40000 ALTER TABLE `organigramme` DISABLE KEYS */;
/*!40000 ALTER TABLE `organigramme` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organigramme_layout`
--

DROP TABLE IF EXISTS `organigramme_layout`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organigramme_layout` (
  `id` int NOT NULL AUTO_INCREMENT,
  `layout` json DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organigramme_layout`
--

LOCK TABLES `organigramme_layout` WRITE;
/*!40000 ALTER TABLE `organigramme_layout` DISABLE KEYS */;
/*!40000 ALTER TABLE `organigramme_layout` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pds_semaines`
--

DROP TABLE IF EXISTS `pds_semaines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pds_semaines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `semaine` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lundi` text COLLATE utf8mb4_unicode_ci,
  `mardi` text COLLATE utf8mb4_unicode_ci,
  `mercredi` text COLLATE utf8mb4_unicode_ci,
  `jeudi` text COLLATE utf8mb4_unicode_ci,
  `vendredi` text COLLATE utf8mb4_unicode_ci,
  `vendredi_fin` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `samedi` text COLLATE utf8mb4_unicode_ci,
  `dimanche` text COLLATE utf8mb4_unicode_ci,
  `total_heures` decimal(5,1) DEFAULT '0.0',
  `valide` tinyint(1) GENERATED ALWAYS AS ((`total_heures` >= 6.0)) STORED,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_effectif_semaine` (`effectif_id`,`semaine`),
  KEY `idx_semaine` (`semaine`),
  CONSTRAINT `pds_semaines_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pds_semaines`
--

LOCK TABLES `pds_semaines` WRITE;
/*!40000 ALTER TABLE `pds_semaines` DISABLE KEYS */;
/*!40000 ALTER TABLE `pds_semaines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions_absence`
--

DROP TABLE IF EXISTS `permissions_absence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions_absence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `raison` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `statut` enum('En attente','Approuvee','Refusee') COLLATE utf8mb4_unicode_ci DEFAULT 'En attente',
  `traite_par` int DEFAULT NULL,
  `notes_traitement` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `traite_par` (`traite_par`),
  KEY `idx_effectif` (`effectif_id`),
  KEY `idx_statut` (`statut`),
  KEY `idx_dates` (`date_debut`,`date_fin`),
  CONSTRAINT `permissions_absence_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `permissions_absence_ibfk_2` FOREIGN KEY (`traite_par`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions_absence`
--

LOCK TABLES `permissions_absence` WRITE;
/*!40000 ALTER TABLE `permissions_absence` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions_absence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `piece_layouts`
--

DROP TABLE IF EXISTS `piece_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `piece_layouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `piece_id` int NOT NULL,
  `layout_json` json DEFAULT NULL,
  `html_published` longtext COLLATE utf8mb4_unicode_ci,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `piece_id` (`piece_id`),
  CONSTRAINT `piece_layouts_ibfk_1` FOREIGN KEY (`piece_id`) REFERENCES `affaires_pieces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `piece_layouts`
--

LOCK TABLES `piece_layouts` WRITE;
/*!40000 ALTER TABLE `piece_layouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `piece_layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rapport_layouts`
--

DROP TABLE IF EXISTS `rapport_layouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rapport_layouts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rapport_id` int NOT NULL,
  `layout_json` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rapport_id` (`rapport_id`),
  CONSTRAINT `rapport_layouts_ibfk_1` FOREIGN KEY (`rapport_id`) REFERENCES `rapports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rapport_layouts`
--

LOCK TABLES `rapport_layouts` WRITE;
/*!40000 ALTER TABLE `rapport_layouts` DISABLE KEYS */;
/*!40000 ALTER TABLE `rapport_layouts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rapport_templates`
--

DROP TABLE IF EXISTS `rapport_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rapport_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('rapport','recommandation','incident') COLLATE utf8mb4_unicode_ci DEFAULT 'rapport',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `champs` json DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rapport_templates`
--

LOCK TABLES `rapport_templates` WRITE;
/*!40000 ALTER TABLE `rapport_templates` DISABLE KEYS */;
INSERT INTO `rapport_templates` VALUES (1,'Rapport de patrouille','rapport','Compte-rendu de patrouille de routine','{\"bilan\": \"[Bilan matériel et humain, recommandations]\", \"resume\": \"[Observations, contacts, incidents éventuels]\", \"contexte\": \"Patrouille effectuée dans le secteur [SECTEUR] de [HEURE] à [HEURE].\"}',NULL,'2026-02-14 16:52:30'),(2,'Rapport d\'inspection','rapport','Inspection des positions ou du matériel','{\"bilan\": \"[Conformités, non-conformités, actions correctives]\", \"resume\": \"[État des positions, matériel, personnel]\", \"contexte\": \"Inspection du/de la [LIEU/UNITÉ] effectuée le [DATE].\"}',NULL,'2026-02-14 16:52:30'),(3,'Rapport d\'opération','rapport','Compte-rendu post-opération','{\"bilan\": \"[Pertes, gains, objectifs atteints ou non]\", \"resume\": \"[Déroulement chronologique de l\'opération]\", \"contexte\": \"Opération [NOM] menée le [DATE] dans le secteur [SECTEUR].\"}',NULL,'2026-02-14 16:52:30'),(4,'Recommandation pour bravoure','recommandation','Recommandation pour acte de bravoure au combat','{\"raison_1\": \"Le [GRADE] [NOM] s\'est distingué lors de [ÉVÉNEMENT] par [ACTION REMARQUABLE].\", \"recompense\": \"[Décoration ou promotion proposée]\"}',NULL,'2026-02-14 16:52:30'),(5,'Rapport d\'incident disciplinaire','incident','Signalement d\'un manquement disciplinaire','{\"compte_rendu\": \"Le [DATE] à [HEURE], le [GRADE] [NOM] a [DESCRIPTION DE L\'INCIDENT].\", \"lieu_incident\": \"[Lieu précis]\"}',NULL,'2026-02-14 16:52:30'),(6,'Demande de permission','rapport','Demande de permission d\'absence','{\"bilan\": \"Avis du supérieur hiérarchique: [FAVORABLE/DÉFAVORABLE]\", \"resume\": \"Motif: [MOTIF DE LA DEMANDE]\", \"contexte\": \"Demande de permission pour le [GRADE] [NOM], du [DATE] au [DATE].\"}',NULL,'2026-02-14 16:52:30');
/*!40000 ALTER TABLE `rapport_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rapports`
--

DROP TABLE IF EXISTS `rapports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rapports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('rapport','recommandation','incident') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rapport',
  `titre` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `auteur_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auteur_grade` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auteur_id` int DEFAULT NULL,
  `personne_renseignee_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `personne_renseignee_id` int DEFAULT NULL,
  `unite_id` int DEFAULT NULL,
  `unite_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grade_id` int DEFAULT NULL,
  `contexte` text COLLATE utf8mb4_unicode_ci,
  `resume` text COLLATE utf8mb4_unicode_ci,
  `bilan` text COLLATE utf8mb4_unicode_ci,
  `remarques` text COLLATE utf8mb4_unicode_ci,
  `recommande_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recommande_grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recommande_unite` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raison_1` text COLLATE utf8mb4_unicode_ci,
  `raison_2` text COLLATE utf8mb4_unicode_ci,
  `raison_3` text COLLATE utf8mb4_unicode_ci,
  `raison_4` text COLLATE utf8mb4_unicode_ci,
  `recompense` text COLLATE utf8mb4_unicode_ci,
  `conclusion` text COLLATE utf8mb4_unicode_ci,
  `intro_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `intro_grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `intro_fonction` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `intro_unite` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lieu_incident` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mise_en_cause_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mise_en_cause_grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mise_en_cause_fonction` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mise_en_cause_unite` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `infos_complementaires` text COLLATE utf8mb4_unicode_ci,
  `compte_rendu` text COLLATE utf8mb4_unicode_ci,
  `signature_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signature_image` longtext COLLATE utf8mb4_unicode_ci,
  `stamp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fichier_media` json DEFAULT NULL,
  `contenu_html` longtext COLLATE utf8mb4_unicode_ci,
  `published` tinyint DEFAULT '0',
  `date_rp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_irl` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `redactions` json DEFAULT NULL COMMENT 'Zones censurÃ©es par officiers',
  `moderation_statut` enum('brouillon','en_attente','approuve','refuse') COLLATE utf8mb4_unicode_ci DEFAULT 'brouillon',
  `a_images` tinyint(1) DEFAULT '0',
  `valide` tinyint(1) DEFAULT '0',
  `valide_par` int DEFAULT NULL,
  `valide_par_nom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valide_signature` longtext COLLATE utf8mb4_unicode_ci,
  `valide_at` timestamp NULL DEFAULT NULL,
  `auteur_rang` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rapports`
--

LOCK TABLES `rapports` WRITE;
/*!40000 ALTER TABLE `rapports` DISABLE KEYS */;
/*!40000 ALTER TABLE `rapports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sanctions`
--

DROP TABLE IF EXISTS `sanctions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sanctions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SAN-YYYY-NNN auto-number',
  `effectif_id` int NOT NULL,
  `infraction_id` int DEFAULT NULL COMMENT 'FK infractions or NULL for custom',
  `infraction_custom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'if not in code',
  `groupe_sanction` int NOT NULL COMMENT '1-5',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'details de l incident',
  `sanction_appliquee` text COLLATE utf8mb4_unicode_ci COMMENT 'peine prononcee',
  `date_rp` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'date RP libre',
  `date_irl` date DEFAULT NULL,
  `lieu` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'lieu de l infraction',
  `agent_id` int DEFAULT NULL COMMENT 'effectif_id du verbalisateur',
  `agent_nom` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'nom libre si pas en DB',
  `statut` enum('En cours','Jugee','Classee','Appel') COLLATE utf8mb4_unicode_ci DEFAULT 'En cours',
  `recidive` tinyint(1) DEFAULT '0',
  `notes_internes` text COLLATE utf8mb4_unicode_ci COMMENT 'notes confidentielles',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `infraction_id` (`infraction_id`),
  KEY `idx_effectif` (`effectif_id`),
  KEY `idx_groupe` (`groupe_sanction`),
  KEY `idx_statut` (`statut`),
  CONSTRAINT `sanctions_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`),
  CONSTRAINT `sanctions_ibfk_2` FOREIGN KEY (`infraction_id`) REFERENCES `infractions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sanctions`
--

LOCK TABLES `sanctions` WRITE;
/*!40000 ALTER TABLE `sanctions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sanctions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `signatures_effectifs`
--

DROP TABLE IF EXISTS `signatures_effectifs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signatures_effectifs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `signature_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'base64 canvas',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `effectif_id` (`effectif_id`),
  CONSTRAINT `signatures_effectifs_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `signatures_effectifs`
--

LOCK TABLES `signatures_effectifs` WRITE;
/*!40000 ALTER TABLE `signatures_effectifs` DISABLE KEYS */;
/*!40000 ALTER TABLE `signatures_effectifs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `telegramme_destinataires`
--

DROP TABLE IF EXISTS `telegramme_destinataires`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telegramme_destinataires` (
  `id` int NOT NULL AUTO_INCREMENT,
  `telegramme_id` int NOT NULL,
  `effectif_id` int DEFAULT NULL,
  `nom_libre` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lu_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `effectif_id` (`effectif_id`),
  KEY `telegramme_id` (`telegramme_id`),
  CONSTRAINT `telegramme_destinataires_ibfk_1` FOREIGN KEY (`telegramme_id`) REFERENCES `telegrammes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `telegramme_destinataires_ibfk_2` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `telegramme_destinataires`
--

LOCK TABLES `telegramme_destinataires` WRITE;
/*!40000 ALTER TABLE `telegramme_destinataires` DISABLE KEYS */;
/*!40000 ALTER TABLE `telegramme_destinataires` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `telegrammes`
--

DROP TABLE IF EXISTS `telegrammes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telegrammes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expediteur_id` int DEFAULT NULL,
  `expediteur_nom` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expediteur_grade` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expediteur_unite` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destinataire_id` int DEFAULT NULL,
  `destinataire_nom` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinataire_unite` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `objet` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenu` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `priorite` enum('Normal','Urgent','Secret','Sehr Geheim') COLLATE utf8mb4_unicode_ci DEFAULT 'Normal',
  `prive` tinyint(1) DEFAULT '0',
  `statut` enum('Envoyé','Reçu','Lu','Archivé') COLLATE utf8mb4_unicode_ci DEFAULT 'Envoyé',
  `lu_at` datetime DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `expediteur_id` (`expediteur_id`),
  KEY `destinataire_id` (`destinataire_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `telegrammes_ibfk_1` FOREIGN KEY (`expediteur_id`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `telegrammes_ibfk_2` FOREIGN KEY (`destinataire_id`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `telegrammes_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `telegrammes`
--

LOCK TABLES `telegrammes` WRITE;
/*!40000 ALTER TABLE `telegrammes` DISABLE KEYS */;
/*!40000 ALTER TABLE `telegrammes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `unites`
--

DROP TABLE IF EXISTS `unites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `couleur` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#dcdcdc',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `unites`
--

LOCK TABLES `unites` WRITE;
/*!40000 ALTER TABLE `unites` DISABLE KEYS */;
INSERT INTO `unites` VALUES (1,'916','Grenadier Regiment','#dcdcdc','2026-02-12 18:36:36'),(2,'254','Feldgendarmerie','#ff9500','2026-02-12 18:36:36'),(3,'916S','Sanitaets-abteilung','#3da9fc','2026-02-12 18:36:36'),(4,'001','Marine Pionier Bataillon','#222222','2026-02-12 18:36:36'),(5,'919','Logistik-Abteilung','#8B4513','2026-02-12 18:36:36'),(6,'130','Panzer Lehr','#8a2be2','2026-02-12 18:36:36'),(7,'009','Fallschirmjaeger Regiment','#e4c21c','2026-02-12 18:36:36'),(8,'716','Reserve','#8a7d6b','2026-02-14 17:12:08'),(9,'084','Armeekorps','#4a3728','2026-02-14 17:12:08');
/*!40000 ALTER TABLE `unites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_groups`
--

DROP TABLE IF EXISTS `user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_groups` (
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`group_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `user_groups_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_groups_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_groups`
--

LOCK TABLES `user_groups` WRITE;
/*!40000 ALTER TABLE `user_groups` DISABLE KEYS */;
INSERT INTO `user_groups` VALUES (1,1),(2,1),(2,2),(2,4);
/*!40000 ALTER TABLE `user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unite_id` int DEFAULT NULL,
  `grade_id` int DEFAULT NULL,
  `effectif_id` int DEFAULT NULL,
  `role_level` tinyint DEFAULT '1',
  `must_change_password` tinyint DEFAULT '1',
  `active` tinyint DEFAULT '1',
  `derniere_connexion` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `unite_id` (`unite_id`),
  KEY `grade_id` (`grade_id`),
  KEY `effectif_id` (`effectif_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`unite_id`) REFERENCES `unites` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`grade_id`) REFERENCES `grades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_3` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin','System','admin','$2b$10$Nsyr6D7soHbKhuuWtXpPo.ac0rAEvYMq4g00XcxqyWViwFPLGGpiu',NULL,NULL,NULL,5,0,1,'2026-02-14 17:53:58','2026-02-12 18:36:36','2026-02-14 17:53:58'),(2,'Zussman','Siegfried','siegfried.zussman','$2b$10$KDN.Deo8jkiN.iwiS2sqfeTUrUUNbZawlNhIH3cN4YSs4xcGmE7e.',1,9,53,1,0,1,'2026-02-14 18:34:59','2026-02-13 09:36:31','2026-02-14 18:34:59');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visites_medicales`
--

DROP TABLE IF EXISTS `visites_medicales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visites_medicales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `effectif_id` int NOT NULL,
  `date_visite` date NOT NULL,
  `medecin` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `diagnostic` text COLLATE utf8mb4_unicode_ci,
  `poids` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `imc` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `groupe_sanguin` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allergenes` text COLLATE utf8mb4_unicode_ci,
  `antecedents_medicaux` text COLLATE utf8mb4_unicode_ci,
  `antecedents_psy` text COLLATE utf8mb4_unicode_ci,
  `conso_drogue` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conso_alcool` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conso_tabac` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_vue` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_ouie` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_cardio` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_reflex` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `test_tir` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `score_aptitude` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commentaire` text COLLATE utf8mb4_unicode_ci,
  `valide` tinyint(1) DEFAULT '0',
  `valide_par` int DEFAULT NULL,
  `valide_at` timestamp NULL DEFAULT NULL,
  `signature_medecin` longtext COLLATE utf8mb4_unicode_ci,
  `facture` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '100 RM',
  `aptitude` enum('Apte','Inapte temporaire','Inapte definitif','Apte avec reserves') COLLATE utf8mb4_unicode_ci DEFAULT 'Apte',
  `restrictions` text COLLATE utf8mb4_unicode_ci,
  `notes_confidentielles` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_effectif` (`effectif_id`),
  KEY `idx_aptitude` (`aptitude`),
  CONSTRAINT `visites_medicales_ibfk_1` FOREIGN KEY (`effectif_id`) REFERENCES `effectifs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `visites_medicales_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visites_medicales`
--

LOCK TABLES `visites_medicales` WRITE;
/*!40000 ALTER TABLE `visites_medicales` DISABLE KEYS */;
/*!40000 ALTER TABLE `visites_medicales` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-14 18:44:31
