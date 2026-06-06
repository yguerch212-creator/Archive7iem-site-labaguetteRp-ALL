# Audit complet — Archives 7e Armeekorps (env dev local, 2026-06-05)

> Audit reproduit sur l'environnement de dev `archives7e-dev` (copie fidele de la prod, BDD identique).
> Aucune ecriture sur la prod. Findings verifies (repro + schema reel + code), sauf mention "A CONFIRMER".
> Severite : CRITIQUE (securite / corruption / blocage) > MAJEUR (fonction cassee) > MINEUR (robustesse / cosmetique).

## Statut des correctifs (dev, 2026-06-05) — testes, NON encore pousses/deployes
- ✅ **BUG-001** (suppression effectif) — `DELETE /effectifs/:id` reecrit en transaction (gere les 3 FK NO ACTION).
  Teste : effectif + signature/sanction -> suppression 200. Rappel : le **renvoi** (`POST /regiment/dismiss`) fonctionne
  deja et reste la voie normale (conserve l'historique).
- ✅ **SYS-01 / SYS-02** (escalade) — `reset-password` passe sous `admin` ; `group` n'autorise plus que les tags
  d'unite (851i/852i) aux non-admins. Teste : officier -> 403 sur reset admin et sur ajout du groupe Administratif.
- ✅ **SYS-03 / MED-01** (fuites) — `optionalAuth` -> `auth` sur medical (GET) + front (`/rapports,/correlation,/events,
  /rapport,/cartes/:id/stats`). Teste : anonyme -> 401, carte publique `/cartes` -> 200, admin -> 200.
- ✅ **PDS-01 / PDS-02** (seuils par regiment) — logique centralisee `server/src/utils/pds.js` (seuil reel via
  `pds_config` + defauts hdr2/so3/off3, categorie via `e.categorie` sinon rang avec SO a partir de 30). Corrige GET /pds,
  /recap et le dashboard. Teste : semaine W09 -> 8 valides (par seuil) vs 6 (ancien 6h fige) ; 919 garde son override 3/4/4.
- ✅ **EFF-01** (mise en reserve) — si pas de grade equivalent au 716, `grade_id` passe a NULL (grade reel conserve dans
  grade_origine_id, restaure a la reintegration). Teste : aller/retour reserve sans corruption. Enregistrement corrompu existant (Gout) nettoye.
- ⏳ **DOC-01** — roter la cle Groq cote Groq + la sortir des `.env` (action a faire au deploiement). Pas dans le git.
- Tous les bugs CRITIQUE sont desormais corriges (sauf DOC-01 = action manuelle). Le reste (MAJEUR/MINEUR) n'est pas encore corrige.

## Resume executif

L'application est avancee et fonctionnelle, mais l'audit revele **3 familles de problemes** :

1. **Securite / RBAC (le plus grave)** — escalade de privilege, prises de controle de compte, et fuites
   de donnees internes (medical, rapports de front) accessibles sans authentification. Deux systemes de
   droits coexistent et le plus fin est ignore sur la majorite des routes.
2. **Logique "par regiment" (ton point)** — confirmee comme source de bugs : seuils PDS, mise en reserve,
   accreditation de sanction. NB important : la **Feldgendarmerie est un GROUPE de droits**, pas le regiment 254.
3. **Fiabilite des donnees** — suppression d'effectif bloquee (ton bug), numerotation non fiable partout
   (collisions), confusions id user / id effectif, et plusieurs fonctions non abouties.

---

## CRITIQUE

### BUG-001 — Suppression d'effectif impossible (ton erreur serveur) — `effectifs.routes.js:287`
`DELETE FROM effectifs` brut. Sur 32 FK vers `effectifs`, 3 sont en **NO ACTION** (`signatures_effectifs`,
`sanctions`, `affaires_signatures`) et bloquent. Comme tout membre etabli a une signature, **13/67 effectifs
sont non-supprimables** -> 500 "Erreur serveur". Repro : DELETE de Friedrich Vans (254) ou de tout membre signataire.
**Fix** : supprimer les lignes enfantes des 3 tables NO ACTION dans une transaction avant le DELETE, OU passer ces
FK en CASCADE/SET NULL, OU — recommande RP — remplacer le hard-delete par un **renvoi/radiation** (statut, garde l'historique).

### SYS-01 — Escalade de privilege via attribution de groupe — `admin.routes.js:127-149`
`PUT /api/admin/users/:id/group` est sous `privileged` (officier/administratif inclus) et la liste `restrictedGroups`
ne couvre que `Administration`/`Etat-Major`. Un officier peut s'attribuer `Officier`/`Administratif`/`Feldgendarmerie`/etc.
**Fix** : passer la route sous `admin`, ou etendre `restrictedGroups` a TOUS les groupes a privilege, ou brancher `permissions.js`.

### SYS-02 — Prise de controle de compte via reset password — `admin.routes.js:222-240`
`PUT /api/admin/users/:id/reset-password` sous `privileged`, sans controle du niveau de la cible. Un officier peut
reset le mot de passe du compte `admin` (valeur choisie par l'attaquant). **Fix** : route sous `admin` + interdire de
cibler une cible de niveau >= a l'appelant.

### SYS-03 — Fuite de donnees : rapports de front exposes sans auth — `front.routes.js` (`/rapports`, `/correlation`, `/events`, `/rapport`, `/cartes/:id/stats`)
`optionalAuth` laisse un anonyme lire le corps des rapports de front, la correlation presence/combat (noms/grades/heures),
et 500 events. Repro live confirme. **Fix** : `auth` (+ `checkPermission('front')`) ; a minima masquer corps + nominatif pour `isGuest`.

### MED-01 — Donnees medicales confidentielles exposees aux invites — `medical.routes.js:10,47` ; `medical-soldbuch.routes.js:13,52,88,143`
`optionalAuth` -> un anonyme recupere `notes_confidentielles`, `antecedents_psy`, conso drogue/alcool, diagnostics,
blessures, soins, et signatures base64 des medecins. **Fix** : `auth` + restreindre les champs sensibles a Sanitats/officier/admin.

### EFF-01 — Mise en reserve casse le couple grade/unite — `effectifs.routes.js:347-381`
Le passage en reserve bascule vers l'unite 716, mais **716 n'a aucun grade en base** -> l'effectif garde un `grade_id`
d'une autre unite. Repro : effectif #59 en reserve a `unite_id=716` + grade du 916. **Fix** : mapper par `rang` vers 716,
ou ne pas toucher grade/unite (statut "Reserve" seul, via `unite_origine_id`/`grade_origine_id`).

### PDS-01 — Seuil de validation PDS fige a 6h, ignore les seuils par unite/categorie — colonne generee `pds_semaines.valide`
`valide = (total_heures >= 6.0)` en dur, alors que les seuils reels sont 2h (HDR) / 3h (SO,Off) et 3/4/4h pour le 919e
(presents dans `pds_config` mais court-circuites). Quasi tous les PDS sont marques non-valides a tort (stats, recap, dashboard, export).
**Fix** : supprimer la colonne generee et calculer `valide` a la volee via JOIN `pds_config` (comme `required_hours` l'est deja).

### PDS-02 — Categorie mal deduite : rang 30-34 classe HDR au lieu de Sous-officier — `pds.routes.js:75-77` (+ `PDS.jsx:108`)
Bornes en dur `>=60 off / >=35 so` alors que Sous-officier commence a **rang 30**. 3 effectifs actifs touches ->
seuil PDS et solde sous-evalues. **Fix** : utiliser `effectifs.categorie` (qui existe) ou corriger la borne 35 -> 30.

### DOC-01 — Cle GROQ en clair dans les `.env` du serveur (hygiene de secret) — `.env`, `server/.env`(x2), `server/.env.backup`
La cle `gsk_…` (active) est en clair dans les fichiers `.env` de la prod/dev. **NON commitee** (verifie : absente du git
et de l'historique — les `.env` sont gitignores). Ce n'est donc pas une fuite versionnee, mais une cle a roter + injecter
par variable d'environnement du conteneur plutot que via fichier. **Fix** : roter la cle Groq, la sortir des `.env` vers
l'env du conteneur, supprimer la ligne dupliquee de `server/.env` et le `server/.env.backup`.

---

## MAJEUR

**RBAC / droits**
- **SYS-04** — Deux systemes RBAC paralleles ; le fin (`permissions.js` / salons, ~150 permissions, `deny`,
  `user_permission_overrides`) n'est branche que sur 3 routes (medical, roles, regiment). Sur front/calendrier/
  organigramme/admin/rapports, seuls les booleens de groupe comptent -> tout `deny` est ignore. **Decision d'archi a prendre.**
- **JUS-02** — `isFeldgendarmerie` absent de la reponse de login (`auth.controller.js:94-108`) : un Feldgendarme
  n'a pas ses boutons d'ecriture Justice **tant qu'il n'a pas rafraichi la page** (`/auth/me` corrige). Fix : ajouter le flag au login.
- **PERM-01** — `Charge-Permission` jamais autorise a traiter les absences (`pds.routes.js:369`) alors que c'est lui
  qu'on notifie. Fix : ajouter `|| isChargePermission`.
- **EFF-02** — Un officier peut apposer la signature **personnelle "soldat"** d'un autre (`soldbuch.routes.js:138`). Fix : `isOwner` seul.
- **EFF-03** — Auto-attribution de decoration par soi-meme (`decorations.routes.js:36-40`). Fix : retirer `isSelf`.
- **JUS-05** — Une case signature "nom libre" (`effectif_id NULL`) est signable par n'importe quel compte connecte
  (`affaires.routes.js:256-276`). Fix : exiger `canWrite`/`isAdmin` pour les cases sans effectif.

**Bug "user.id vs effectif_id" (recurrent)**
- **DOC-03** — L'auteur ne peut pas signer son propre rapport : compare `auteur_id` (id effectif) a `req.user.id`
  (id user) (`rapports.routes.js:738`). Fix : `req.user.effectif_id`.
- **JUS-01** — Un Feldgendarme ne peut pas creer/clore un avis de recherche : `AvisRecherche.jsx:22` teste `user.groups`
  qui **n'existe pas**. Fix : `user.isFeldgendarmerie`.

**Numerotation non fiable (collisions)**
- **JUS-03** — SAN-/AFF-/TEL- : `ORDER BY id` + pas de transaction + pas d'UNIQUE -> doublons possibles + reutilisation
  apres suppression (`sanctions.routes.js:29`, `affaires.routes.js:18`).
- **DOC-02** — Telegrammes generes depuis les rapports : `MAX(numero)` sur du texte / `TEL-AUTO-${Date.now()}` ->
  collisions confirmees (`numero='1'` x4, `TEL-2026-009/010/011/012/015` en double) (`rapports.routes.js:651,471`).
- **DOC-04** — Numero de rapport **jamais persiste** : la table `rapports` n'a pas de colonne `numero` ; le `RJ-/RC-/IN-`
  est cosmetique (`/next-number` via COUNT) et toujours vide a l'affichage/export. Fix : ajouter colonne `numero UNIQUE` + INSERT.

**Solde**
- **SOLDE-03** — Double-paie possible : ni le cron (vendredi 19h) ni `POST /auto-payday` ne verifient si la paie du jour
  existe (`solde.routes.js:75-136`). Fix : garde d'idempotence + factoriser cron/route.
- **SOLDE-02** — Grille de solde par paliers de rang "ronds" -> fausse pour rangs intermediaires (32, 48, 52)
  (`solde.routes.js:7-27`). Fix : solde par `grade_id`.

**Donnees / FK / fonctions cassees**
- **MED-02** — `soins_front.medecin_id` en **CASCADE** (vs SET NULL ailleurs) : supprimer un medecin efface tout son
  historique de soins. Fix : SET NULL.
- **PDS-04** — La colonne `vendredi` est ecrasee a NULL a chaque saisie (`pds.routes.js:167`) ; migration `vendredi`->`vendredi_fin` inachevee.
- **ORDRE-02** — `emis_par_grade` toujours NULL : `req.user.grade` n'existe pas (`ordres.routes.js:66`). Fix : `grade_nom`.
- **EFF-04** — Layout Soldbuch par defaut lit des colonnes inexistantes (`photo_url`, `date_incorporation`,
  `groupe_sanguin`, `decorations_text`) -> champs toujours vides (`SoldbuchLayout.jsx:54-76`). Fix : `photo`, `date_entree_ig`, `blutgruppe`.
- **MED-03** — Le front appelle `/medical/visites` (404, route inexistante) -> section visites vide en silence (`MedicalStats.jsx:174`).
- **DOC-05** — Indicateur "Approuve" (etoile) jamais affiche : `approuve_par` absent du SELECT de liste (`rapports.routes.js:50-62`).
- **SYS-05** — `POST /front/cartes/:id/events` sans validation de `carte_id`/`vp_id` -> 500 FK silencieux + stats faussees.
- **JUS-04** — `maxGroupe()` en dur : tout Feldgendarme = groupe 3, contredit la grille affichee (HDR 1-2) (`sanctions.routes.js:20`).
  NB : le module `sanctions` (table) est actuellement orphelin cote UI (cf JUS-07).

---

## MINEUR (robustesse / cosmetique / dette)

- **EFF-05** — Test de categorie en minuscules ne matche jamais l'enum (`effectifs.routes.js:154`) ; ne marche que par fallback rang.
- **EFF-06 / SOLDE (actif)** — `WHERE actif = 1` sur un enum (`solde.routes.js:79,118`) : marche par coincidence ('Actif'=ordinal 1). Fix : `actif='Actif'`.
- **EFF-07** — Statuts `actif`(KIA/MIA)/`member_status` jamais positionnes par aucune route -> gestion de statut non aboutie.
- **MED-04** — Auto-reconciliation medicale dupliquee et non `await` (best-effort silencieux) ; pattern `LIKE %nom%` peut sur-rattacher des homonymes.
- **JUS-06** — Suppression d'effectif aussi bloquee par `sanctions` (NO ACTION) — coherent avec BUG-001 (latent, table vide en dev).
- **JUS-07** — Module `sanctions` (table) orphelin : aucune page n'appelle `/api/sanctions` (la Justice passe par `/affaires`). Decider : cabler ou deprecier.
- **JUS-08** — `convertDateFR` non applique a `date_ouverture_irl`/`date_cloture_irl` (latent, l'UI envoie de l'ISO).
- **JUS-09** — Colonne `avis_recherche.consignes` jamais persistee (consignes codees en dur a l'affichage).
- **JUS-10 / DOC (numeros cosmetiques)** — Avis de recherche numerote `AR-{id}` au rendu (glisse apres suppression).
- **ORDRE-01 / ORDRE-03** — Numerotation d'ordre race-condition ; accuse d'ordre accepte sans verifier l'existence/l'unite.
- **PDS-03** — `logActivity` sans `await` (fire-and-forget non gere).
- **PDS-05 / SYS-07 / SYS-08** — Calcul de "semaine RP" : decalage vendredi 20h ignore (granularite jour) + dependance au fuseau
  du conteneur (TZ vide = UTC ; prod en Africa/Casablanca differera sur la frontiere du vendredi soir).
- **PDS-06** — Exclusion des "generaux sans PDS" via `rang > 100` inclut le General (rang 100).
- **DOC-06** — Erreurs Groq renvoyees en HTTP 200 (incoherence de statut, fonctionne cote client).
- **DOC-07** — Table `documentation` sans `updated_at` (editions non horodatees).
- **DOC-08** — `dossiers` : INNER JOIN sur `created_by` -> un dossier disparait si son createur (user) est supprime. Fix : LEFT JOIN.
- **DOC-09** — `exportPdf.js` : decoupe multi-pages approximative (html2canvas mono-image).
- **SYS-06 / SYS-11** — Incoherences create vs delete : un sous-officier (front) / recenseur (calendrier) peut creer mais pas supprimer.
- **SYS-09** — Organigramme structurel (table `organigramme`) vide : seul le blob `organigramme_layout` est alimente (double modele).
- **SYS-10** — Mojibake (double-encodage UTF-8) dans les donnees `calendrier` (et probablement d'autres tables) : present
  cote donnees stockees, pas un bug de connexion. A corriger lors de la reprise des donnees (Discord JSON).
- **SOLDE-01 / SOLDE-04** — Semantique du type `autre` (credit ?) a clarifier ; pas de borne max sur `montant` (500 sur overflow decimal).

---

## Themes transverses (a traiter en priorite, car ils generent plusieurs bugs)

1. **Verrouiller les droits** : passer les routes admin sensibles sous `admin`, et `auth` sur les GET medical/front.
   Trancher l'architecture RBAC (un seul systeme). -> resout SYS-01/02/03/04, MED-01, EFF-02/03, JUS-05, PERM-01.
2. **Numerotation centralisee** : une seule fonction `nextNumero(prefixe)` atomique (MAX du suffixe + colonne UNIQUE +
   retry). -> resout JUS-03, DOC-02/04, ORDRE-01.
3. **id user vs id effectif** : auditer toutes les comparaisons (DOC-03 confirme, JUS-01/02 lies).
4. **Logique par regiment** : seuils PDS via `pds_config` (PDS-01/02), reserve 716 (EFF-01), accreditation sanction
   par grade (JUS-04). C'est exactement la "fonction a adapter par regiment" que tu signalais.
5. **Suppression d'effectif** : adopter le "renvoi/radiation" (soft) plutot que le hard-delete -> resout BUG-001 et evite MED-02.

## Methode / repro
Env : `cd /data/projects/archives7e-dev/docker && docker compose up -d` ; nginx http://localhost ; admin/Admin7e2026!.
Logs : `docker logs archives7e_server_dev`. BDD : `docker exec archives7e_db_dev mysql -uroot -proot_password_change_me archives7e`.
