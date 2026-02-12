<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

if (!isset($_GET['unite_id'])) {
  header('Location: /Archives7e/effectifs.php');
  exit;
}
$unites_id = (int)$_GET['unite_id'];

// récupération de l’unité
$reqU = $pdo->prepare("SELECT code, nom FROM unites WHERE id=?");
$reqU->execute([$unites_id]);
$unite = $reqU->fetch();
if (!$unite) {
  echo "Unité inconnue.";
  exit;
}

// Libellé d'unité sans doublon "916. 916"
$unitTitle = $unite['nom'];
if (stripos($unitTitle, (string)$unite['code']) !== 0) {
  $unitTitle = $unite['code'].' '.$unitTitle;
}

// récupération des grades de cette unité seulement
$reqG = $pdo->prepare("SELECT id, nom_complet FROM grades WHERE unite_id=? ORDER BY id DESC");
$reqG->execute([$unites_id]);
$grades = $reqG->fetchAll(PDO::FETCH_ASSOC);

// récupération des qualifications (pour spécialité)
$quals = $pdo->query("SELECT id, nom FROM qualifications ORDER BY nom ASC")->fetchAll(PDO::FETCH_ASSOC);

// insertion
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $photoPath = null;
  if (!empty($_FILES['photo']['tmp_name'])) {
    $dir = __DIR__.'/assets/uploads/photos';
    @mkdir($dir,0775,true);
    $ext = strtolower(pathinfo($_FILES['photo']['name'],PATHINFO_EXTENSION));
    if (!in_array($ext,['jpg','jpeg','png','webp'])) $ext = 'jpg';
    $fname = 'photo_'.time().'_'.$unites_id.'.'.$ext;
    move_uploaded_file($_FILES['photo']['tmp_name'],$dir.'/'.$fname);
    $photoPath = 'assets/uploads/photos/'.$fname;
  }

  $sql = "INSERT INTO effectifs 
    (unites_id, grade_id, nom, prenom, surnom, date_naissance, lieu_naissance, nationalite,
     taille, yeux, groupe_sanguin, qualification_id, specialite, date_entree_ig, date_entree_irl, 
     arme_principale, arme_secondaire, equipement_special, tenue, historique, decorations, sanctions, photo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  $st = $pdo->prepare($sql);
  $st->execute([
    $unites_id,
    $_POST['grade_id'] ?? null,
    trim($_POST['nom']),
    trim($_POST['prenom']),
    trim($_POST['surnom']),
    $_POST['date_naissance'] ?: null,
    trim($_POST['lieu_naissance']),
    trim($_POST['nationalite']),
    (int)($_POST['taille'] ?? 0),
    trim($_POST['yeux']),
    trim($_POST['groupe_sanguin']),
    $_POST['qualification_id'] ?: null,
    trim($_POST['specialite']),
    $_POST['date_entree_ig'] ?: null,
    $_POST['date_entree_irl'] ?: null,
    trim($_POST['arme_principale']),
    trim($_POST['arme_secondaire']),
    trim($_POST['equipement_special']),
    trim($_POST['tenue']),
    trim($_POST['historique']),
    trim($_POST['decorations']),
    trim($_POST['sanctions']),
    $photoPath
  ]);

  header("Location: /Archives7e/effectifs_list.php?unite_id=".$unites_id);
  exit;
}
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title><?= htmlspecialchars($unitTitle) ?> — Nouvel effectif</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{
    --paper:url('/Archives7e/assets/img/paper.jpg');
    --ink:#1b1b1b;
  }
  html,body{margin:0;padding:0;height:100%}
  body{
    background:var(--paper) repeat center/512px;
    font-family:"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color:var(--ink);
  }

  .wrap{max-width:950px;margin:40px auto;padding:20px;}
  h1{text-align:center;font-weight:900;font-size:1.9em;margin-bottom:20px;}
  h2{font-size:1.2em;margin-top:30px;text-decoration:underline;font-weight:800;}
  form{display:flex;flex-direction:column;gap:16px;}
  label{font-weight:700;display:block;margin-bottom:4px;}
  input,select,textarea{
    width:100%;padding:8px 10px;font-family:inherit;font-size:15px;
    border:1px solid #333;border-radius:6px;background:rgba(255,255,255,0.8);
  }
  textarea{resize:vertical;min-height:80px;}
  .row{display:flex;gap:10px;}
  .row>div{flex:1;}
  .actions{display:flex;justify-content:space-between;margin-top:20px;}
  .btn{background:#222;color:#fff;padding:10px 18px;border:none;border-radius:8px;cursor:pointer;font-weight:700;}
  .btn.back{background:#6c6c6c;text-decoration:none;}
</style>
</head>
<body>
<div class="wrap">
  <a href="/Archives7e/effectifs_list.php?unite_id=<?= $unites_id ?>" class="btn back">← Retour</a>
  <h1>Ajouter un effectif – <?= htmlspecialchars($unitTitle) ?></h1>

  <form method="post" enctype="multipart/form-data">

    <!-- 1. IDENTITÉ -->
    <h2>1. IDENTITÉ</h2>
    <div class="row">
      <div><label>Nom</label><input type="text" name="nom" required></div>
      <div><label>Prénom</label><input type="text" name="prenom" required></div>
    </div>
    <div class="row">
      <div><label>Surnom</label><input type="text" name="surnom"></div>
      <div><label>Date de naissance</label><input type="date" name="date_naissance"></div>
    </div>
    <div class="row">
      <div><label>Lieu de naissance</label><input type="text" name="lieu_naissance"></div>
      <div><label>Nationalité</label><input type="text" name="nationalite"></div>
    </div>
    <div class="row">
      <div><label>Taille (cm)</label><input type="number" name="taille" min="100" max="250"></div>
      <div><label>Yeux</label><input type="text" name="yeux"></div>
      <div><label>Groupe sanguin</label><input type="text" name="groupe_sanguin"></div>
    </div>
    <div>
      <label>Photo d’identité</label>
      <input type="file" name="photo" accept="image/*">
    </div>

    <!-- 2. AFFECTATION -->
    <h2>2. AFFECTATION</h2>
    <div class="row">
      <div>
        <label>Grade</label>
        <select name="grade_id" required>
          <option value="">— Sélectionner —</option>
          <?php foreach($grades as $g): ?>
            <option value="<?= $g['id'] ?>"><?= htmlspecialchars($g['nom_complet']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label>Spécialité (qualification)</label>
        <select name="qualification_id">
          <option value="">— Aucune —</option>
          <?php foreach($quals as $q): ?>
            <option value="<?= $q['id'] ?>"><?= htmlspecialchars($q['nom']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <div class="row">
      <div><label>Date RP (entrée IG)</label><input type="date" name="date_entree_ig"></div>
      <div><label>Date IRL (entrée réelle)</label><input type="date" name="date_entree_irl"></div>
    </div>

    <!-- 3. ÉQUIPEMENT ATTRIBUÉ -->
    <h2>3. ÉQUIPEMENT ATTRIBUÉ</h2>
    <div class="row">
      <div><label>Arme principale</label><input type="text" name="arme_principale" placeholder="MP40, Kar98k..."></div>
      <div><label>Arme secondaire</label><input type="text" name="arme_secondaire" placeholder="P38, Poignard..."></div>
    </div>
    <div class="row">
      <div><label>Équipement spécial</label><input type="text" name="equipement_special"></div>
      <div><label>Tenue / uniforme</label><input type="text" name="tenue"></div>
    </div>

    <!-- 4. HISTORIQUE -->
    <h2>4. HISTORIQUE DU SOLDAT</h2>
    <label>Historique / Parcours</label>
    <textarea name="historique" placeholder="Rédige un bref résumé du parcours du soldat..."></textarea>

    <label>Décorations reçues</label>
    <textarea name="decorations" placeholder="Croix du mérite, distinctions..."></textarea>

    <label>Sanctions ou remarques</label>
    <textarea name="sanctions" placeholder="Infractions, avertissements, etc."></textarea>

    <!-- 5. SIGNATURES & TAMPONS -->
    <h2>🖋️ 5. SIGNATURES & TAMPONS</h2>
    <p>Ces éléments sont générés automatiquement dans le layout Soldbuch.</p>

    <div class="actions">
      <button type="submit" class="btn">💾 Enregistrer</button>
    </div>
  </form>
</div>
</body>
</html>
