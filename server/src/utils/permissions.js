const { query, queryOne } = require('../config/db')

// All available salons — granular, matching actual site pages & features
const SALONS = [
  // Effectifs
  'effectifs',           // Liste, vue, recherche
  'effectifs.create',    // Créer un effectif
  'effectifs.edit',      // Modifier un effectif (recenseur)
  'effectifs.photo',     // Upload photo
  'effectifs.delete',    // Supprimer un effectif
  'effectifs.reserve',   // Mettre en réserve
  // Soldbuch
  'soldbuch',            // Voir un Soldbuch
  'soldbuch.edit',       // Modifier layout/cells
  'soldbuch.details',    // Modifier les détails personnels
  'soldbuch.sign',       // Signer un Soldbuch
  'soldbuch.stamp',      // Tamponner un Soldbuch
  // Attestations
  'attestations',        // Voir attestations
  'attestations.create', // Créer une attestation
  'attestations.validate', // Valider une attestation
  'attestations.delete', // Supprimer/barrer une attestation
  // Rapports
  'rapports',            // Lire les rapports
  'rapports.create',     // Créer un rapport
  'rapports.edit',       // Modifier un rapport (brouillon)
  'rapports.publish',    // Publier un rapport
  'rapports.validate',   // Valider un rapport
  'rapports.sign',       // Signer un rapport
  'rapports.delete',     // Supprimer un rapport
  // Documentation
  'documentation',       // Lire la documentation
  'documentation.create', // Ajouter un document
  'documentation.edit',  // Modifier un document
  'documentation.approve', // Approuver un document
  'documentation.delete', // Supprimer un document
  // Journal
  'journal',             // Lire le journal
  'journal.create',      // Créer un article
  'journal.edit',        // Modifier un article
  'journal.validate',    // Valider un article
  'journal.delete',      // Supprimer un article
  // Télégrammes
  'telegrammes',         // Lire les télégrammes
  'telegrammes.create',  // Envoyer un télégramme
  'telegrammes.archive', // Archiver un télégramme
  'telegrammes.delete',  // Supprimer un télégramme
  // Médical - Visites médicales
  'medical.visites',           // Voir les visites médicales
  'medical.visites.create',    // Créer une visite médicale
  'medical.visites.edit',      // Modifier une visite
  'medical.visites.validate',  // Valider une visite
  'medical.visites.sign',      // Signer une visite
  'medical.visites.delete',    // Supprimer une visite
  // Médical - Soins
  'medical.soins',             // Voir les soins au front
  'medical.soins.create',      // Créer un soin
  // Médical - Hospitalisations
  'medical.hospitalisations',         // Voir hospitalisations
  'medical.hospitalisations.create',  // Créer hospitalisation
  'medical.hospitalisations.delete',  // Supprimer hospitalisation
  // Médical - Vaccinations
  'medical.vaccinations',             // Voir vaccinations
  'medical.vaccinations.create',      // Créer vaccination
  'medical.vaccinations.delete',      // Supprimer vaccination
  // Médical - Blessures
  'medical.blessures',                // Voir blessures
  'medical.blessures.create',         // Créer blessure
  'medical.blessures.delete',         // Supprimer blessure
  // Médical - Description & Stats
  'medical.description',       // Modifier description physique
  'medical.stats',             // Voir stats Sanitat
  'medical.reconcile',         // Réconcilier données médicales
  // Sanctions / Justice
  'sanctions',                 // Voir casier / sanctions
  'sanctions.create',          // Créer une sanction
  'sanctions.edit',            // Modifier une sanction
  'sanctions.delete',          // Supprimer une sanction
  // Affaires judiciaires
  'affaires',                  // Voir les affaires
  'affaires.create',           // Créer une affaire
  'affaires.edit',             // Modifier une affaire
  'affaires.pieces',           // Gérer les pièces judiciaires
  'affaires.sign',             // Signer une pièce
  'affaires.delete',           // Supprimer une affaire
  // Avis de recherche
  'avis_recherche',            // Voir les avis
  'avis_recherche.create',     // Créer un avis
  'avis_recherche.delete',     // Supprimer un avis
  // Interdits de front
  'interdits',                 // Voir les interdits
  'interdits.create',          // Créer un interdit
  'interdits.lever',           // Lever un interdit
  'interdits.delete',          // Supprimer un interdit
  // PDS (Présence de service)
  'pds',                       // Voir PDS
  'pds.edit',                  // Saisir ses heures
  'pds.permissions',           // Gérer permissions d'absence
  'pds.delete',                // Supprimer une entrée PDS
  // Commandement
  'commandement',              // Dashboard commandement
  'commandement.notes',        // Notes de commandement
  // Front
  'front',                     // Voir la situation du front
  'front.create',              // Ajouter un événement
  'front.delete',              // Supprimer un événement
  // Dossiers personnels
  'dossiers',                  // Voir les dossiers
  'dossiers.create',           // Créer un dossier/entrée
  'dossiers.edit',             // Modifier un dossier
  'dossiers.delete',           // Supprimer un dossier
  // Décorations
  'decorations',               // Voir les décorations
  'decorations.create',        // Attribuer une décoration
  'decorations.delete',        // Retirer une décoration
  // Habillement
  'habillement',               // Voir les demandes
  'habillement.create',        // Créer une demande
  'habillement.validate',      // Valider une demande
  // Solde
  'solde',                     // Voir les soldes
  'solde.credit',              // Créditer un effectif
  'solde.debit',               // Débiter un effectif
  'solde.payday',              // Lancer la paie automatique
  // Bibliothèque (tampons)
  'bibliotheque',              // Voir les tampons
  'bibliotheque.create',       // Ajouter un tampon
  'bibliotheque.delete',       // Supprimer un tampon
  'bibliotheque.permissions',  // Gérer permissions tampons
  // Organigramme
  'organigramme',              // Voir l'organigramme
  'organigramme.edit',         // Modifier l'organigramme
  // Ordres
  'ordres',                    // Voir les ordres
  'ordres.create',             // Créer un ordre
  'ordres.delete',             // Supprimer un ordre
  // Calendrier
  'calendrier',                // Voir le calendrier
  'calendrier.create',         // Ajouter un événement
  'calendrier.delete',         // Supprimer un événement
  // Galerie
  'galerie',                   // Voir la galerie
  'galerie.create',            // Uploader une photo
  'galerie.approve',           // Approuver une photo
  'galerie.delete',            // Supprimer une photo
  // Admin
  'admin.users',               // Gérer les utilisateurs
  'admin.logs',                // Voir les logs
  'admin.roles',               // Gérer les rôles
  'admin.regiment',            // Gérer le régiment (transferts/renvois)
  'admin.moderation',          // File de modération
  'admin.stats',               // Statistiques admin
  // Archives (lecture seule)
  'archives',                  // Consulter les archives
  // Recherche
  'search',                    // Recherche globale
]

// Global permissions (not tied to a salon)
const GLOBAL_PERMISSIONS = [
  'administrator',              // Bypass tout
  'manage_roles',               // Créer/modifier des rôles
  'manage_regiment_effectifs',  // Transférer/renvoyer (son régiment)
  'manage_all_effectifs',       // Transférer/renvoyer (tout)
  'bypass_validation',          // Publier sans validation
]

/**
 * Resolve all permissions for a user (global + per-salon)
 * Returns: { global: {}, salons: {}, highestLevel, roles: [] }
 * 
 * Salon permissions are simple: true = allowed, false/absent = denied
 * Combined requirements (e.g. sanitats AND sous-officier) are handled
 * by checking if the user has ALL required roles.
 */
async function resolvePermissions(userId) {
  const roles = await query(`
    SELECT r.id, r.name, r.level, r.permissions_global, r.is_system
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.level ASC
  `, [userId])

  const global = {}
  const salons = {}
  const roleNames = new Set()

  // Merge global permissions (union of all roles)
  for (const role of roles) {
    roleNames.add(role.name)
    let perms = {}
    try { perms = typeof role.permissions_global === 'string' ? JSON.parse(role.permissions_global) : (role.permissions_global || {}) } catch {}
    for (const [k, v] of Object.entries(perms)) {
      if (v === true) global[k] = true
    }
  }

  // Get salon permissions
  if (roles.length > 0) {
    const roleIds = roles.map(r => r.id)
    const salonPerms = await query(`
      SELECT role_id, salon, permissions FROM role_salon_permissions
      WHERE role_id IN (${roleIds.map(() => '?').join(',')})
    `, roleIds)

    for (const sp of salonPerms) {
      let perms = {}
      try { perms = typeof sp.permissions === 'string' ? JSON.parse(sp.permissions) : (sp.permissions || {}) } catch {}
      for (const [k, v] of Object.entries(perms)) {
        const key = `${sp.salon}`
        // For salon permissions, we just need the salon name as the key
        // but permissions are stored per salon already
        if (!salons[sp.salon]) salons[sp.salon] = {}
        if (v === 'deny') salons[sp.salon][k] = 'deny'
        else if (v === 'allow' && salons[sp.salon][k] !== 'deny') salons[sp.salon][k] = 'allow'
      }
    }
  }

  // Also check user-specific permission overrides
  const userOverrides = await query(
    'SELECT salon, permissions FROM user_permission_overrides WHERE user_id = ?', [userId]
  ).catch(() => [])
  
  for (const uo of userOverrides) {
    let perms = {}
    try { perms = typeof uo.permissions === 'string' ? JSON.parse(uo.permissions) : (uo.permissions || {}) } catch {}
    if (!salons[uo.salon]) salons[uo.salon] = {}
    for (const [k, v] of Object.entries(perms)) {
      // User overrides take priority
      salons[uo.salon][k] = v
    }
  }

  const highestLevel = roles.length > 0 ? Math.min(...roles.map(r => r.level)) : 99

  return {
    global, salons, highestLevel,
    roles: roles.map(r => ({ id: r.id, name: r.name, level: r.level })),
    roleNames: [...roleNames]
  }
}

/**
 * Check if user has permission for a specific salon
 */
function hasPermission(resolved, salon) {
  if (resolved.global.administrator) return true
  // Check exact salon match
  if (resolved.salons[salon]?.allow === 'allow' || resolved.salons[salon]?.view === 'allow') return true
  // For granular salons like 'medical.visites.create', also check if salon itself is in allowed list
  // Simple approach: salon is allowed if it exists as a key with any 'allow' value
  const salonPerms = resolved.salons[salon]
  if (salonPerms) {
    if (Object.values(salonPerms).some(v => v === 'allow')) return true
  }
  return false
}

/**
 * Check if user has specific roles (for combined requirements)
 * e.g., requiresRoles(['Sanitat', 'Sous-officier']) = must have BOTH
 */
function hasAllRoles(resolved, requiredRoleNames) {
  if (resolved.global.administrator) return true
  return requiredRoleNames.every(name => resolved.roleNames.includes(name))
}

/**
 * Middleware factory
 */
function checkPermission(salon) {
  return async (req, res, next) => {
    try {
      if (!req.userPermissions) {
        req.userPermissions = await resolvePermissions(req.user.id)
      }
      if (req.userPermissions.global.administrator) return next()
      
      // Check if salon permission exists
      const perms = req.userPermissions.salons[salon]
      if (perms && Object.values(perms).some(v => v === 'allow')) return next()
      
      return res.status(403).json({ success: false, message: 'Permission insuffisante' })
    } catch (err) {
      console.error('Permission check error:', err)
      return res.status(500).json({ success: false, message: 'Erreur serveur' })
    }
  }
}

/**
 * Check if assigner can grant a permission
 */
function canAssignPermission(assignerPerms, permission) {
  if (assignerPerms.global.administrator) return true
  if (assignerPerms.global[permission]) return true
  // Check if any salon has this permission allowed
  for (const salonPerms of Object.values(assignerPerms.salons)) {
    if (salonPerms[permission] === 'allow') return true
  }
  return false
}

module.exports = {
  SALONS, GLOBAL_PERMISSIONS,
  resolvePermissions, hasPermission, hasAllRoles, checkPermission, canAssignPermission
}
