<?php
declare(strict_types=1);
require_once __DIR__.'/includes/db.php';
session_start();

if (!isset($_GET['unite_id'])) {
  header('Location: /Archives7e/effectifs.php');
  exit;
}
$unite_id = (int)$_GET['unite_id'];

// Récupération de l’unité
$reqU = $pdo->prepare("SELECT code, nom FROM unites WHERE id=?");
$reqU->execute([$unite_id]);
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

// On récupère les grades correspondant à l’unité sélectionnée
$unite_id = (int)($_GET['unite_id'] ?? 0);

$gradesStmt = $pdo->prepare("
    SELECT g.id, g.nom_complet 
    FROM grades g
    WHERE g.unite_id = :unite_id
    ORDER BY g.nom_complet ASC
");
$gradesStmt->execute(['unite_id' => $unite_id]);
$grades = $gradesStmt->fetchAll(PDO::FETCH_ASSOC);

// Récupération des effectifs (ordre hiérarchique décroissant)
$req = $pdo->prepare("
  SELECT e.*, g.nom_complet AS grade_nom 
  FROM effectifs e
  LEFT JOIN grades g ON g.id = e.grade_id
  WHERE e.unite_id = ?
  ORDER BY g.id DESC, e.nom ASC
");
$req->execute([$unite_id]);
$rows = $req->fetchAll(PDO::FETCH_ASSOC);
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title><?= htmlspecialchars($unitTitle) ?> — Effectifs</title>
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
  .wrap{
    max-width:1200px;
    margin:50px auto;
    padding:0 20px;
  }
  h1{
    text-align:center;
    font-weight:900;
    font-size:2em;
    margin:0 0 25px;
  }
  a.back{
    display:inline-block;
    background:#222;
    color:#fff;
    border-radius:8px;
    padding:8px 12px;
    text-decoration:none;
    font-size:14px;
  }
  a.add{
    float:right;
    background:#222;
    color:#fff;
    padding:10px 16px;
    border-radius:8px;
    text-decoration:none;
    font-weight:700;
  }

  /* Zone de filtres */
  .filters{
    display:flex;
    flex-wrap:wrap;
    justify-content:center;
    gap:12px;
    margin:20px 0 25px;
  }
  .filters input, .filters select{
    background:rgba(255,255,255,0.7);
    border:1px solid #333;
    border-radius:8px;
    padding:8px 12px;
    font-family:inherit;
    font-size:15px;
  }

  table{
    border-collapse:collapse;
    width:100%;
    font-size:15px;
  }
  th,td{
    border:1px solid #333;
    padding:10px 8px;
    text-align:center;
  }
  th{
    background:rgba(0,0,0,0.08);
    font-weight:800;
  }
  tr:nth-child(even){background:rgba(255,255,255,0.2);}
  tr:hover{background:rgba(0,0,0,0.05);}
</style>
<script>
// Filtrage instantané JS
function filtrer(){
  const nom = document.getElementById('filtreNom').value.toLowerCase();
  const grade = document.getElementById('filtreGrade').value;
  const dateType = document.getElementById('dateType').value;
  const dateVal = document.getElementById('filtreDate').value;
  const rows = document.querySelectorAll('tbody tr');

  rows.forEach(tr=>{
    const nomCell = tr.querySelector('td[data-nom]').dataset.nom.toLowerCase();
    const gradeCell = tr.querySelector('td[data-grade]').dataset.grade;
    const dateIG = tr.querySelector('td[data-date-ig]').dataset.dateIg;
    const dateIRL = tr.querySelector('td[data-date-irl]').dataset.dateIrl;

    let visible = true;
    if(nom && !nomCell.includes(nom)) visible = false;
    if(grade && gradeCell !== grade) visible = false;
    if(dateVal){
      const checkDate = (dateType==='IG') ? dateIG : dateIRL;
      if(!checkDate.includes(dateVal)) visible = false;
    }
    tr.style.display = visible ? '' : 'none';
  });
}
</script>
</head>
<body>
<div class="wrap">
  <a href="/Archives7e/effectifs.php" class="back">← Retour aux unités</a>
  <a href="/Archives7e/effectif_new.php?unite_id=<?= $unite_id ?>" class="add">Ajouter</a>

  <h1><?= htmlspecialchars($unitTitle) ?></h1>

  <!-- Filtres -->
  <div class="filters">
    <input type="text" id="filtreNom" placeholder="Nom / prénom..." onkeyup="filtrer()">
    <select id="filtreGrade" onchange="filtrer()">
      <option value="">— Grade —</option>
      <?php foreach ($grades as $g): ?>
        <option value="<?= htmlspecialchars($g['nom_complet']) ?>">
          <?= htmlspecialchars($g['nom_complet']) ?>
        </option>
      <?php endforeach; ?>
    </select>
    <select id="dateType" onchange="filtrer()">
      <option value="IG">Date RP</option>
      <option value="IRL">Date IRL</option>
    </select>
    <input type="date" id="filtreDate" onchange="filtrer()">
  </div>

  <table>
    <thead>
      <tr>
        <th>Prénom / Nom</th>
        <th>Grade</th>
        <th>Fonctions</th>
        <th>Ausbilder</th>
        <th>Soldbuch</th>
        <th>Date RP</th>
        <th>Date IRL</th>
        <th>Rapport</th>
        <th>Casier judiciaire</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach($rows as $r): ?>
      <tr>
        <td data-nom="<?= htmlspecialchars($r['prenom'].' '.$r['nom']) ?>"><?= htmlspecialchars($r['prenom'].' '.$r['nom']) ?></td>
        <td data-grade="<?= htmlspecialchars($r['grade_nom'] ?? '') ?>"><?= htmlspecialchars($r['grade_nom'] ?? '') ?></td>
        <td><?= htmlspecialchars($r['specialite'] ?? '') ?></td>
        <td><?= htmlspecialchars($r['qualification_id'] ? 'Militaire du rang' : '—') ?></td>
        <td><a href="/Archives7e/soldbuch.php?id=<?= $r['id'] ?>">📘</a></td>
        <td data-date-ig="<?= htmlspecialchars($r['date_entree_ig'] ?? '') ?>"><?= htmlspecialchars($r['date_entree_ig'] ?? '') ?></td>
        <td data-date-irl="<?= htmlspecialchars($r['date_entree_irl'] ?? '') ?>"><?= htmlspecialchars($r['date_entree_irl'] ?? '') ?></td>
        <td><a href="/Archives7e/rapports_list.php?auteur=<?= urlencode($r['prenom'].' '.$r['nom']) ?>">✏️</a></td>
        <td><a href="#">⚖️</a></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <?php if(!$rows): ?>
    <p style="text-align:center;opacity:.8">Aucun effectif enregistré.</p>
  <?php endif; ?>
</div>
</body>
</html>
