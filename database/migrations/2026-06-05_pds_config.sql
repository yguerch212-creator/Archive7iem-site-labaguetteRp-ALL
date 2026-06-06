-- Seuils PDS par regiment/categorie (regles confirmees Yanis 2026-06-05).
-- 916 : HDR/Officier exempts (0), Sous-officier 6h. Sous-factions : HDR 4h, SO 6h, Officier exempt.
-- 716 Reserve + 084 Etat-Major : exempts. (0 = non requis, l'effectif peut quand meme remplir.)
DELETE FROM pds_config;
INSERT INTO pds_config (unite_id, rang_type, duree_heures, rapports_requis) VALUES
 (1,'hdr',0,0),(1,'so',6,1),(1,'off',0,0),
 (2,'hdr',4,1),(2,'so',6,1),(2,'off',0,0),
 (3,'hdr',4,1),(3,'so',6,1),(3,'off',0,0),
 (4,'hdr',4,1),(4,'so',6,1),(4,'off',0,0),
 (5,'hdr',4,1),(5,'so',6,1),(5,'off',0,0),
 (6,'hdr',4,1),(6,'so',6,1),(6,'off',0,0),
 (7,'hdr',4,1),(7,'so',6,1),(7,'off',0,0),
 (8,'hdr',0,0),(8,'so',0,0),(8,'off',0,0),
 (9,'hdr',0,0),(9,'so',0,0),(9,'off',0,0);
