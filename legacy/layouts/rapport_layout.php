<?php
// C:\laragon\www\Archives7e\layouts\rapport_layout.php
declare(strict_types=1);
require_once __DIR__.'/../includes/db.php';
session_start();

$id = isset($_GET['id'])?(int)$_GET['id']:0;
if($id<=0){ echo "ID invalide"; exit; }
$st=$pdo->prepare("SELECT * FROM rapports WHERE id=?"); 
$st->execute([$id]); 
$R=$st->fetch(PDO::FETCH_ASSOC);
if(!$R){ echo "Rapport introuvable"; exit; }

if(!empty($R['published'])){
  header("Location: /Archives7e/rapport.php?id=".$id);
  exit;
}

$type = $R['type'] ?? 'rapport';
function esc($v){ return htmlspecialchars((string)$v, ENT_QUOTES,'UTF-8'); }
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mise en page — <?= esc($R['titre']) ?></title>
<link rel="stylesheet" href="/Archives7e/assets/css/layout_common.css">
<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>
</head>
<body>

<div class="topbar">
  <a class="btn" href="/Archives7e/rapport.php?id=<?= (int)$id ?>">← Retour au rapport</a>
  <div>
    <button class="btn" onclick="addTitle()">+ Titre</button>
    <button class="btn" onclick="addText()">+ Texte</button>
    <button class="btn" onclick="addMedia()">+ Image/Vidéo</button>
    <button class="btn" onclick="addStamp()">+ Tampon 916</button>
    <button class="btn" onclick="addSignature()">+ Signature</button>
    <button class="btn" onclick="savePublish()">💾 Sauvegarder & Publier</button>
  </div>
</div>

<div class="wrap">
  <div class="paper">
    <div id="editor">
      <?php 
        // Inclusion dynamique du layout correspondant
        $path = __DIR__."/types/layout_{$type}.php";
        if(file_exists($path)) include $path;
        else echo "<p>⚠️ Type de rapport inconnu.</p>";
      ?>
    </div>
  </div>
</div>

<script src="/Archives7e/assets/js/layout_common.js"></script>
</body>
</html>
