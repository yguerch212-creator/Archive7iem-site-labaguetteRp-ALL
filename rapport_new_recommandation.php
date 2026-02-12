<?php
// C:\laragon\www\Archives7e\rapport_new_recommandation.php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

$unites = $pdo->query("SELECT id, code, nom FROM unites ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$effectifs = $pdo->query("SELECT e.id, e.nom, e.prenom, e.unite_id FROM effectifs e ORDER BY e.nom, e.prenom")->fetchAll(PDO::FETCH_ASSOC);
?>
<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nouvelle Recommandation</title>
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
.media-item{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.media-item input[type="text"]{flex:1}
.media-remove{background:#a00;color:#fff;border:0;border-radius:6px;font-weight:bold;cursor:pointer;padding:4px 8px}
</style></head><body>
<div class="wrap">
  <a href="/Archives7e/rapports_list.php" class="back">← Retour</a>
  <h1>Nouvelle Recommandation</h1><h2>Brouillon</h2>

  <form id="form" method="post" enctype="multipart/form-data" action="/Archives7e/save_rapport.php">
    <input type="hidden" name="type" value="recommandation">

    <label>Date RP :</label><input type="text" name="date_rp" placeholder="xx/xx/1944" required>
    <label>Date IRL :</label><input type="text" name="date_irl" placeholder="xx/xx/202x" required>
    <label>Titre :</label><input type="text" name="titre" placeholder="Recommandation — Nom de l’effectif" required>

    <!-- Auteur -->
    <fieldset>
      <legend>Auteur</legend>
      <select name="auteur_id">
        <option value="">— Sélectionner un effectif —</option>
        <?php foreach($effectifs as $e): ?>
          <option value="<?= (int)$e['id'] ?>"><?= htmlspecialchars($e['prenom'].' '.$e['nom']) ?></option>
        <?php endforeach; ?>
      </select>
      <small class="help">Si l’auteur n’existe pas encore dans les effectifs, renseigne le nom manuellement.</small>
      <input type="text" name="auteur_nom" placeholder="Nom Prénom (manuel)">
    </fieldset>

    <!-- Personne recommandée -->
    <fieldset>
      <legend>Personne recommandée</legend>
      <select name="personne_renseignee_id">
        <option value="">— Sélectionner un effectif —</option>
        <?php foreach($effectifs as $e): ?>
          <option value="<?= (int)$e['id'] ?>"><?= htmlspecialchars($e['prenom'].' '.$e['nom']) ?></option>
        <?php endforeach; ?>
      </select>
      <input type="text" name="personne_renseignee_nom" placeholder="Nom Prénom (manuel)">
    </fieldset>

    <fieldset>
      <legend>Informations de la recommandation</legend>
      <label>Nom & Grade de la personne recommandée :</label>
      <input type="text" name="recommande_nom" placeholder="Nom Prénom" required>
      <input type="text" name="recommande_grade" placeholder="Grade actuel" required>
      <label>Raisons :</label>
      <textarea name="raison_1" rows="2" placeholder="1. Première raison" required></textarea>
      <textarea name="raison_2" rows="2" placeholder="2. Deuxième raison"></textarea>
      <textarea name="raison_3" rows="2" placeholder="3. Troisième raison"></textarea>
      <textarea name="raison_4" rows="2" placeholder="4. Quatrième raison"></textarea>
      <label>Récompense proposée :</label>
      <input type="text" name="recompense" placeholder="Ex : Promotion au grade supérieur / Médaille / Citation">
      <label>Conclusion :</label>
      <textarea name="conclusion" rows="3" placeholder="Avis final de l’auteur ou de l’unité"></textarea>
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
</body></html>
