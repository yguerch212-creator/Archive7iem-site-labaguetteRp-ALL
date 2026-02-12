<?php
// C:\laragon\www\Archives7e\rapport_new_incident.php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

$unites = $pdo->query("SELECT id, code, nom FROM unites ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$effectifs = $pdo->query("SELECT e.id, e.nom, e.prenom, e.unite_id FROM effectifs e ORDER BY e.nom, e.prenom")->fetchAll(PDO::FETCH_ASSOC);
?>
<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nouveau Rapport d’Incident</title>
<style>
:root{--paper:url('/Archives7e/assets/img/paper.jpg');--ink:#1b1b1b}
body{margin:0;background:var(--paper) repeat center/512px;font-family:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;color:var(--ink)}
.wrap{max-width:980px;margin:32px auto;padding:0 18px}
h1{text-align:center;margin:0 0 4px;font-weight:900}
h2{text-align:center;margin:0 0 22px;font-weight:600;opacity:.9}
label{font-weight:700;display:block;margin-top:14px}
input,select,textarea{width:100%;padding:10px;margin-top:4px;background:rgba(255,255,255,.85);border:1px solid #333;border-radius:8px;font-family:inherit}
small.help{opacity:.8}
.btn{background:#222;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer}
a.back{display:inline-block;background:#222;color:#fff;border-radius:8px;padding:8px 12px;text-decoration:none;font-weight:700}
fieldset{border:1px solid #222;border-radius:10px;padding:14px;margin-top:16px;background:rgba(255,255,255,.55)}
legend{font-weight:800;padding:0 8px}
</style></head><body>
<div class="wrap">
  <a href="/Archives7e/rapports_list.php" class="back">← Retour</a>
  <h1>Nouveau Rapport d’Incident</h1><h2>Brouillon</h2>

  <form id="form" method="post" enctype="multipart/form-data" action="/Archives7e/save_rapport.php">
    <input type="hidden" name="type" value="incident">

    <label>Date RP :</label><input type="text" name="date_rp" placeholder="xx/xx/1944" required>
    <label>Date IRL :</label><input type="text" name="date_irl" placeholder="xx/xx/202x" required>
    <label>Référence incident:</label><input type="text" name="titre" placeholder="ex: incident HF-678" required>

    <!-- Auteur -->
    <fieldset>
      <legend>Auteur</legend>
      <select name="auteur_id">
        <option value="">— Sélectionner un effectif —</option>
        <?php foreach($effectifs as $e): ?>
          <option value="<?= (int)$e['id'] ?>"><?= htmlspecialchars($e['prenom'].' '.$e['nom']) ?></option>
        <?php endforeach; ?>
      </select>
      <input type="text" name="auteur_nom" placeholder="Nom Prénom (manuel)">
    </fieldset>

    <!-- Personne renseignée (victime ou témoin principal) -->
    <fieldset>
      <legend>Personne renseignée (si applicable)</legend>
      <select name="personne_renseignee_id">
        <option value="">— Sélectionner un effectif —</option>
        <?php foreach($effectifs as $e): ?>
          <option value="<?= (int)$e['id'] ?>"><?= htmlspecialchars($e['prenom'].' '.$e['nom']) ?></option>
        <?php endforeach; ?>
      </select>
      <input type="text" name="personne_renseignee_nom" placeholder="Nom Prénom (manuel)">
    </fieldset>

    <fieldset>
      <legend>Introduction</legend>
      <input type="text" name="intro_nom" placeholder="Nom du rédacteur" required>
      <input type="text" name="intro_grade" placeholder="Grade" required>
      <input type="text" name="intro_fonction" placeholder="Fonction au moment des fait (Kommander heer / Geifher / N/A ou vide si rien)">
      <input type="text" name="intro_unite" placeholder="Unité">
    </fieldset>

    <fieldset>
      <legend>Mise en cause</legend>
      <input type="text" name="mise_en_cause_nom" placeholder="Nom de la personne mise en cause" required>
      <input type="text" name="mise_en_cause_grade" placeholder="Grade">
      <input type="text" name="mise_en_cause_fonction" placeholder="Fonction">
      <input type="text" name="mise_en_cause_unite" placeholder="Unité">
    </fieldset>

    <fieldset>
      <legend>Détails de l’incident</legend>
      <label>Lieu :</label><input type="text" name="lieu_incident" placeholder="Ex : VP3 / Quartier Est" required>
      <label>Informations complémentaires :</label><textarea name="infos_complementaires" rows="3" placeholder="Contexte et conditions de l’incident"></textarea>
      <label>Compte-rendu :</label><textarea name="compte_rendu" rows="4" placeholder="Description détaillée des faits" required></textarea>
    </fieldset>

    <fieldset>
      <legend>Signature</legend>
      <input type="text" name="signature_nom" placeholder="Nom Prénom" required>
      <input type="text" name="signature_grade" placeholder="Grade" required>
      <label>Image de signature (.png)</label>
      <input type="file" name="signature_image" accept="image/png">
    </fieldset>

    <div style="text-align:center;margin-top:20px">
      <button class="btn" type="submit">Générer la mise en page</button>
    </div>
  </form>
</div>
<script>
// Mise à jour dynamique des grades selon l'unité choisie
function bindUniteGrade(uniteSelectId, gradeSelectId) {
  const uniteSel = document.getElementById(uniteSelectId);
  const gradeSel = document.getElementById(gradeSelectId);

  if (!uniteSel || !gradeSel) return;

  uniteSel.addEventListener('change', () => {
    const uid = uniteSel.value;
    gradeSel.innerHTML = '<option value="">Chargement...</option>';

    if (!uid) {
      gradeSel.innerHTML = '<option value="">— Sélectionner une unité d’abord —</option>';
      return;
    }

    fetch(`/Archives7e/includes/get_grades.php?unite_id=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then(data => {
        gradeSel.innerHTML = '<option value="">— Sélectionner un grade —</option>';
        data.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g.id;
          opt.textContent = g.nom_complet;
          gradeSel.appendChild(opt);
        });
      })
      .catch(() => {
        gradeSel.innerHTML = '<option value="">⚠️ Erreur de chargement</option>';
      });
  });
}

// Appel automatique pour les paires
document.addEventListener('DOMContentLoaded', () => {
  bindUniteGrade('intro_unite', 'intro_grade');
  bindUniteGrade('mise_en_cause_unite', 'mise_en_cause_grade');
  bindUniteGrade('recommande_unite', 'recommande_grade');
});
</script>

</body></html>
