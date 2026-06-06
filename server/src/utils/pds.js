// Logique PDS (Presence De Service) centralisee — seuils par regiment et categorie.
// Defaut = regle des sous-factions : HDR 4h, Sous-officier 6h, Officier exempt (0 = non requis).
// Surcharge par unite via pds_config : 916 (HDR/Off exempts, SO 6h) ; 716 Reserve + 084 Etat-Major exempts.
const PDS_DEFAULTS = { hdr: 4, so: 6, off: 0 }

// Type de rang d'un effectif : priorite a sa categorie explicite, sinon deduction par le rang du grade.
// NB: les Sous-officiers commencent au rang 30 (Stabsgefreiter), les Officiers au rang 60.
function rangType(row) {
  const cat = row.categorie
  if (cat === 'Officier') return 'off'
  if (cat === 'Sous-officier') return 'so'
  if (cat === 'Militaire du rang') return 'hdr'
  const rang = Number(row.grade_rang) || 0
  if (rang >= 60) return 'off'
  if (rang >= 30) return 'so'
  return 'hdr'
}

// Charge la config PDS par unite -> { [unite_id]: { hdr, so, off } }
async function loadPdsConfig(query) {
  const rows = await query('SELECT unite_id, rang_type, duree_heures FROM pds_config')
  const map = {}
  for (const r of rows) {
    if (!map[r.unite_id]) map[r.unite_id] = {}
    map[r.unite_id][r.rang_type] = Number(r.duree_heures)
  }
  return map
}

// Seuil d'heures requis pour un effectif (surcharge unite si presente, sinon defaut).
function requiredHours(row, configMap) {
  const rt = rangType(row)
  const byUnit = configMap[row.unite_id]
  return (byUnit && byUnit[rt] != null) ? byUnit[rt] : PDS_DEFAULTS[rt]
}

// Renseigne required_hours / rang_type / valide sur chaque ligne (mutation en place).
function annotate(rows, configMap) {
  for (const r of rows) {
    r.rang_type = rangType(r)
    r.required_hours = requiredHours(r, configMap)
    r.valide = (Number(r.total_heures) || 0) >= r.required_hours ? 1 : 0
  }
  return rows
}

module.exports = { PDS_DEFAULTS, rangType, loadPdsConfig, requiredHours, annotate }
